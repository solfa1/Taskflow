#!/bin/bash
set -e

echo "Starting TaskFlow local deployment..."

eval $(minikube docker-env)

echo "Building API image..."
docker build -t taskflow-api:v3 ./api-service

echo "Building Worker image..."
docker build -t taskflow-worker:v2 ./worker-service

echo "Applying Kubernetes manifests..."
kubectl apply -f db/k8s-postgres.yaml
kubectl apply -f redis/redis-deployment.yaml
kubectl apply -f api-service/k8s/service.yaml
kubectl apply -f api-service/k8s/deployment.yaml
kubectl apply -f worker-service/k8s/worker-deployment.yaml
kubectl apply -f worker-service/k8s/worker-hpa.yaml
kubectl apply -f security/network-policies/

echo "Waiting for rollouts..."
kubectl rollout status deployment/taskflow-api
kubectl rollout status deployment/taskflow-worker
kubectl rollout status deployment/postgres
kubectl rollout status deployment/redis

echo "Deployment complete."

kubectl get pods
kubectl get svc
kubectl get hpa
