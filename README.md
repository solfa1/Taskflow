# TaskFlow

TaskFlow is a hands-on DevOps project built to simulate a production-style microservice system.

The goal of the project is simple: take a backend application from local development to a scalable, observable, and secure environment using the kinds of tools and workflows used in real engineering teams.

The system includes an API service, a worker service, PostgreSQL, Redis caching, Kubernetes orchestration, monitoring, autoscaling, security policies, and CI/CD automation.

This project has been built incrementally as part of a structured DevOps roadmap, with each day focused on a specific engineering concept.

## What TaskFlow Does

TaskFlow is a task-processing system made up of two backend services.

The API service accepts requests, stores task data, handles authentication, and exposes metrics.

The Worker service runs in the background and processes pending tasks.

Redis is used to improve read performance through caching, while PostgreSQL acts as the primary database.

The application runs locally with Docker and Docker Compose, and in Kubernetes using Minikube.

## Architecture

```text
                    Client
                       |
                       v
              TaskFlow API Service
                   /         \
                  /           \
                 v             v
          PostgreSQL         Redis
                 ^
                 |
                 v
          TaskFlow Worker
```

## Features

### Application

* REST API for task creation and retrieval
* Background worker for task processing
* PostgreSQL persistence
* Redis caching
* Task processing pipeline

### Authentication & Security

* JWT authentication
* Password hashing with bcrypt
* Protected routes
* Zero Trust-style Kubernetes networking
* Default deny-all network policy

### Kubernetes

* Deployments
* Services
* Health checks
* Readiness probes
* Liveness probes
* Horizontal Pod Autoscaler (HPA)

### Monitoring

* Prometheus metrics
* Request latency tracking
* Request counters
* Task-related business metrics
* System-level resource monitoring

### Automation

* Docker containerization
* Docker Compose setup
* Terraform infrastructure configuration
* GitHub Actions CI pipeline
* Local deployment automation script

## Tech Stack

| Area           | Tools                      |
| -------------- | -------------------------- |
| Backend        | Node.js, Express           |
| Database       | PostgreSQL                 |
| Cache          | Redis                      |
| Authentication | JWT, bcrypt                |
| Containers     | Docker, Docker Compose     |
| Orchestration  | Kubernetes, Minikube       |
| Monitoring     | Prometheus, Grafana        |
| Infrastructure | Terraform                  |
| Security       | Kubernetes NetworkPolicies |
| CI/CD          | GitHub Actions             |
| Automation     | Bash                       |

## Project Structure

```text
taskflow/
│
├── api-service/
├── worker-service/
├── db/
├── redis/
├── security/
├── monitoring/
├── alerts/
├── eks/
├── Taskflow-Terra/
├── RDS/
├── scripts/
│   └── deploy-local.sh
│
├── docker-compose.yml
└── README.md
```

## Running the Project Locally

Clone the repository:

```bash
git clone https://github.com/solfa1/Taskflow.git
cd Taskflow
```

Start the local environment:

```bash
docker compose up -d --build
```

Verify the API:

```bash
curl http://localhost:3000/
```

Expected response:

```text
TaskFlow API is running
```

## Running with Kubernetes

Start Minikube:

```bash
minikube start --driver=docker --cni=calico
minikube addons enable metrics-server
```

Deploy everything:

```bash
./scripts/deploy-local.sh
```

Check cluster status:

```bash
kubectl get pods
kubectl get svc
kubectl get hpa
kubectl get networkpolicy
```

## Authentication

Register a user:

```bash
curl -X POST http://localhost:8081/auth/register \
-H "Content-Type: application/json" \
-d '{"username":"watchman","password":"password123"}'
```

Login:

```bash
TOKEN=$(curl -s -X POST http://localhost:8081/auth/login \
-H "Content-Type: application/json" \
-d '{"username":"watchman","password":"password123"}' | jq -r '.token')
```

Access protected routes:

```bash
curl http://localhost:8081/tasks \
-H "Authorization: Bearer $TOKEN"
```

Create a task:

```bash
curl -X POST http://localhost:8081/tasks \
-H "Authorization: Bearer $TOKEN" \
-H "Content-Type: application/json" \
-d '{"type":"email","payload":{"message":"hello"}}'
```

## Monitoring and Observability

Prometheus collects metrics from the `/metrics` endpoint.

Metrics currently tracked include:

* HTTP request count
* Request latency
* Task creation metrics
* Task failures
* CPU and memory usage

Grafana is used to visualize application and infrastructure metrics.

## Autoscaling

The worker service uses Kubernetes Horizontal Pod Autoscaling.

Current configuration:

```text
Minimum replicas: 1
Maximum replicas: 5
Target CPU utilization: 50%
```

## Security

TaskFlow uses a Zero Trust-style networking model in Kubernetes.

The cluster follows a default deny approach, meaning pods cannot communicate unless explicitly allowed.

Allowed communication paths include:

* API → PostgreSQL
* Worker → PostgreSQL
* API → Redis
* DNS access for service discovery

JWT authentication protects application routes, and passwords are hashed using bcrypt before storage.

## CI/CD

GitHub Actions runs automatically on pushes and pull requests to the `main` branch.

The pipeline currently:

1. Checks out the repository
2. Sets up Node.js
3. Installs dependencies
4. Verifies package installation
5. Builds Docker images

Workflow location:

```text
.github/workflows/ci.yml
```

## Deployment Automation

A deployment script is included for local Kubernetes automation.

Run:

```bash
./scripts/deploy-local.sh
```

The script handles:

* Docker image builds
* Kubernetes deployment updates
* Network policy application
* Rollout verification
* Cluster health checks

## Project Progress

TaskFlow is currently completed through Day 29 of the roadmap.

Work completed so far includes:

* Backend services
* PostgreSQL integration
* Worker processing
* Dockerization
* Kubernetes deployments
* Monitoring
* Redis caching
* JWT authentication
* Network policies
* GitHub Actions CI
* Local deployment automation

Next steps include final testing, polishing, and frontend integration.

## About

Built by Watchman Okoro

GitHub: https://github.com/solfa1

This project is primarily for learning, experimentation, and portfolio development.
