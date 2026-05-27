const pool = require("./db");

// LOGGER
function log(event, data = {}) {
  console.log(
    JSON.stringify({
      service: "worker-service",
      event,
      timestamp: new Date().toISOString(),
      ...data,
    })
  );
}

// CPU-heavy simulation for HPA testing
function simulateCpuWork(durationMs = 500) {
  const start = Date.now();

  while (Date.now() - start < durationMs) {
    Math.sqrt(Math.random() * 1000000);
  }
}

async function safeProcess(task) {
  try {
    log("processing_task", { taskId: task.id });

    await pool.query(
      "UPDATE tasks SET status = $1 WHERE id = $2",
      ["processing", task.id]
    );

    // Simulate CPU-heavy worker processing
    simulateCpuWork(500);

    await pool.query(
      "UPDATE tasks SET status = $1 WHERE id = $2",
      ["done", task.id]
    );

    log("task_completed", { taskId: task.id });
  } catch (err) {
    log("task_failed", { taskId: task.id, error: err.message });

    await pool.query(
      "UPDATE tasks SET status = $1 WHERE id = $2",
      ["pending", task.id]
    );
  }
}

async function processTasks() {
  try {
    log("worker_tick");

    const result = await pool.query(
      "SELECT * FROM tasks WHERE status = $1 ORDER BY id ASC LIMIT 1",
      ["pending"]
    );

    const task = result.rows[0];

    if (!task) {
      log("no_pending_tasks");
      return;
    }

    await safeProcess(task);
  } catch (err) {
    log("worker_error", { error: err.message });
  }
}

setInterval(processTasks, 1000);