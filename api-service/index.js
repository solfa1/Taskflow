const express = require("express");
const pool = require("./db");
require("dotenv").config();

const client = require("prom-client");
const redis = require("redis");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const app = express();
app.use(express.json());

// =========================
// CONFIG
// =========================

const JWT_SECRET = process.env.JWT_SECRET || "taskflow-dev-secret";

// =========================
// REDIS SETUP
// =========================

const redisClient = redis.createClient({
  socket: {
    host: process.env.REDIS_HOST || "localhost",
    port: process.env.REDIS_PORT || 6379,
  },
});

redisClient.on("error", (err) => {
  console.error("Redis error:", err.message);
});

redisClient.connect().then(() => {
  console.log("Connected to Redis");
});

// =========================
// PROMETHEUS SETUP
// =========================

const register = new client.Registry();

client.collectDefaultMetrics({ register });

// =========================
// CUSTOM METRICS
// =========================

const httpRequestsTotal = new client.Counter({
  name: "http_requests_total",
  help: "Total HTTP requests",
  labelNames: ["method", "route", "status"],
});

const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "route", "status"],
  buckets: [0.01, 0.05, 0.1, 0.2, 0.5, 1, 2],
});

const tasksCreatedTotal = new client.Counter({
  name: "tasks_created_total",
  help: "Total tasks created",
});

const taskFailuresTotal = new client.Counter({
  name: "task_failures_total",
  help: "Total task failures",
});

register.registerMetric(httpRequestsTotal);
register.registerMetric(httpRequestDuration);
register.registerMetric(tasksCreatedTotal);
register.registerMetric(taskFailuresTotal);

// =========================
// LOGGER
// =========================

function log(event, data = {}) {
  console.log(
    JSON.stringify({
      service: "api-service",
      event,
      timestamp: new Date().toISOString(),
      ...data,
    })
  );
}

// =========================
// AUTH MIDDLEWARE
// =========================

function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Missing auth token" });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Invalid or expired token" });
    }

    req.user = user;
    next();
  });
}

// =========================
// METRICS MIDDLEWARE
// =========================

app.use((req, res, next) => {
  const start = process.hrtime();

  res.on("finish", () => {
    const diff = process.hrtime(start);
    const duration = diff[0] + diff[1] / 1e9;

    const route = req.route ? req.route.path : req.path;

    httpRequestsTotal.inc({
      method: req.method,
      route,
      status: res.statusCode,
    });

    httpRequestDuration.observe(
      {
        method: req.method,
        route,
        status: res.statusCode,
      },
      duration
    );
  });

  next();
});

// =========================
// HEALTH CHECK
// =========================

app.get("/", (req, res) => {
  log("health_check");
  res.status(200).send("TaskFlow API is running");
});

// =========================
// AUTH ROUTES
// =========================

app.post("/auth/register", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      error: "Username and password are required",
    });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      "INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username, created_at",
      [username, passwordHash]
    );

    log("user_registered", { userId: result.rows[0].id });

    return res.status(201).json({
      message: "User registered successfully",
      user: result.rows[0],
    });
  } catch (err) {
    log("register_error", { error: err.message });

    if (err.code === "23505") {
      return res.status(409).json({
        error: "Username already exists",
      });
    }

    return res.status(500).json({
      error: "Server error",
    });
  }
});

app.post("/auth/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      error: "Username and password are required",
    });
  }

  try {
    const result = await pool.query(
      "SELECT id, username, password_hash FROM users WHERE username = $1",
      [username]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({
        error: "Invalid username or password",
      });
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatches) {
      return res.status(401).json({
        error: "Invalid username or password",
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
      },
      JWT_SECRET,
      {
        expiresIn: "1h",
      }
    );

    log("user_logged_in", { userId: user.id });

    return res.json({
      message: "Login successful",
      token,
    });
  } catch (err) {
    log("login_error", { error: err.message });

    return res.status(500).json({
      error: "Server error",
    });
  }
});

// =========================
// CREATE TASK (PROTECTED)
// =========================

app.post("/tasks", authenticateToken, async (req, res) => {
  const { type, payload } = req.body;

  log("create_task_request", {
    type,
    userId: req.user.id,
  });

  if (!type || !payload) {
    taskFailuresTotal.inc();
    log("validation_failed");

    return res.status(400).json({ error: "Missing type or payload" });
  }

  try {
    const result = await pool.query(
      "INSERT INTO tasks (type, payload, status) VALUES ($1, $2, $3) RETURNING *",
      [type, payload, "pending"]
    );

    tasksCreatedTotal.inc();

    await redisClient.del("tasks:all");

    log("task_created", {
      taskId: result.rows[0].id,
      userId: req.user.id,
    });

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    taskFailuresTotal.inc();

    log("task_create_error", { error: err.message });

    return res.status(500).json({ error: "Server error" });
  }
});

// =========================
// GET TASKS (PROTECTED + REDIS CACHE)
// =========================

app.get("/tasks", authenticateToken, async (req, res) => {
  const cacheKey = "tasks:all";

  try {
    const cachedTasks = await redisClient.get(cacheKey);

    if (cachedTasks) {
      log("cache_hit", {
        key: cacheKey,
        userId: req.user.id,
      });

      return res.json(JSON.parse(cachedTasks));
    }

    log("cache_miss", {
      key: cacheKey,
      userId: req.user.id,
    });

    const result = await pool.query(
      "SELECT * FROM tasks ORDER BY id DESC"
    );

    await redisClient.setEx(
      cacheKey,
      30,
      JSON.stringify(result.rows)
    );

    return res.json(result.rows);
  } catch (err) {
    taskFailuresTotal.inc();

    log("get_tasks_error", { error: err.message });

    return res.status(500).json({ error: "Server error" });
  }
});

// =========================
// PROMETHEUS METRICS ENDPOINT
// =========================

app.get("/metrics", async (req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

// =========================
// START SERVER
// =========================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`TaskFlow API running on port ${PORT}`);
});