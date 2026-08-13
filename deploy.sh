#!/usr/bin/env bash
#
# deploy.sh — builds, loads, and deploys the full Cake Delight stack to a local
# Kind cluster. Safe to re-run; each step is a no-op or a clean overwrite if
# it's already been done.
#
# Usage: ./deploy.sh

set -e

CLUSTER_NAME="cake-delight"
NAMESPACE="cake-delight"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}==>${NC} $1"; }
warn()  { echo -e "${YELLOW}==>${NC} $1"; }
error() { echo -e "${RED}==>${NC} $1"; }

# ---------------------------------------------------------------------------
# 1. Check prerequisites — stop early with clear instructions if anything's missing
# ---------------------------------------------------------------------------

info "Checking required tools..."

MISSING_TOOL=false

if ! command -v docker &> /dev/null; then
  error "Docker is not installed or not on your PATH."
  MISSING_TOOL=true
fi

if ! command -v kind &> /dev/null; then
  error "Kind is not installed."
  echo "    See setup.md for installation steps, or run:"
  echo "    go install sigs.k8s.io/kind@latest"
  echo "    (or on Linux: curl -Lo ./kind https://kind.sigs.k8s.io/dl/latest/kind-linux-amd64 && chmod +x ./kind && sudo mv ./kind /usr/local/bin/kind)"
  MISSING_TOOL=true
fi

if ! command -v kubectl &> /dev/null; then
  error "kubectl is not installed."
  echo "    See setup.md for installation steps."
  MISSING_TOOL=true
fi

if [ "$MISSING_TOOL" = true ]; then
  error "One or more required tools are missing. Install them (see setup.md) and re-run this script."
  exit 1
fi

info "All required tools are present."

# ---------------------------------------------------------------------------
# 2. Check Docker is actually running
# ---------------------------------------------------------------------------

if ! docker info &> /dev/null; then
  error "Docker is installed but doesn't appear to be running. Start Docker and re-run this script."
  exit 1
fi

# ---------------------------------------------------------------------------
# 3. Create the Kind cluster, if it doesn't already exist
# ---------------------------------------------------------------------------

if kind get clusters 2>/dev/null | grep -q "^${CLUSTER_NAME}$"; then
  info "Kind cluster '${CLUSTER_NAME}' already exists — skipping creation."
else
  info "Creating Kind cluster '${CLUSTER_NAME}'..."
  kind create cluster --name "${CLUSTER_NAME}"
fi

kubectl cluster-info --context "kind-${CLUSTER_NAME}" > /dev/null
info "Cluster is reachable."

# ---------------------------------------------------------------------------
# 4. Build every service image
# ---------------------------------------------------------------------------

SERVICES=("api-gateway" "catalog-service" "order-service" "rating-service" "notification-service")

info "Building images..."
for service in "${SERVICES[@]}"; do
  echo "    building cake-delight-${service}:latest"
  docker build -t "cake-delight-${service}:latest" "./${service}" --quiet
done
info "All images built."

# ---------------------------------------------------------------------------
# 5. Load every image into the Kind cluster
# ---------------------------------------------------------------------------

info "Loading images into Kind (this can take a minute)..."
for service in "${SERVICES[@]}"; do
  echo "    loading cake-delight-${service}:latest"
  kind load docker-image "cake-delight-${service}:latest" --name "${CLUSTER_NAME}"
done
info "All images loaded into the cluster."

# ---------------------------------------------------------------------------
# 6. Apply manifests in dependency order
# ---------------------------------------------------------------------------

info "Applying namespace, secrets, and config..."
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/configmaps.yaml

info "Deploying Redis and RabbitMQ..."
kubectl apply -f k8s/redis/
kubectl apply -f k8s/rabbitmq/

info "Waiting for RabbitMQ to be ready before starting dependent services..."
kubectl wait --for=condition=Available deployment/rabbitmq -n "${NAMESPACE}" --timeout=120s || \
  warn "RabbitMQ isn't reporting Available yet — continuing anyway, services will retry their own connection."

info "Deploying Catalog and Rating..."
kubectl apply -f k8s/catalog/
kubectl apply -f k8s/rating/

info "Deploying Order and Notification..."
kubectl apply -f k8s/order/
kubectl apply -f k8s/notification/

info "Deploying the API Gateway..."
kubectl apply -f k8s/gateway/

# ---------------------------------------------------------------------------
# 7. Wait and report status
# ---------------------------------------------------------------------------

info "Waiting for all pods to become ready (up to 3 minutes)..."
kubectl wait --for=condition=Ready pods --all -n "${NAMESPACE}" --timeout=180s || \
  warn "Not all pods reported Ready in time — check status below and inspect with 'kubectl logs' if needed."

echo ""
info "Current pod status:"
kubectl get pods -n "${NAMESPACE}"

echo ""
info "Deployment complete."
echo "    To reach the API Gateway, run:"
echo "    kubectl port-forward -n ${NAMESPACE} svc/api-gateway 5000:5000"
echo ""
echo "    To view logs for any service, run:"
echo "    kubectl logs -n ${NAMESPACE} deployment/<service-name> -f"