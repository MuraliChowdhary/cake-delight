# Cake Delight - Setup Guide

This guide explains how to run Cake Delight locally using Docker, Kind, and Kubernetes.

## Prerequisites

Ensure you have the following installed on your machine:

- [Docker Desktop](https://www.docker.com/products/docker-desktop)
- [kubectl](https://kubernetes.io/docs/tasks/tools/)
- [Kind](https://kind.sigs.k8s.io/docs/user/quick-start/)
- [Git](https://git-scm.com/)

# Installing Kind (Kubernetes IN Docker)

Before installing `kind`, ensure that a container runtime such as **Docker**, **Podman**, or **nerdctl** is installed and running.

## macOS

### Homebrew

```bash
brew install kind
```

### MacPorts

```bash
sudo port selfupdate
sudo port install kind
```

## Linux

### AMD64 / x86_64

```bash
[ "$(uname -m)" = "x86_64" ] && curl -Lo ./kind https://kind.sigs.k8s.io/dl/v0.32.0/kind-linux-amd64
chmod +x ./kind
sudo mv ./kind /usr/local/bin/kind
```

### ARM64

```bash
[ "$(uname -m)" = "aarch64" ] && curl -Lo ./kind https://kind.sigs.k8s.io/dl/v0.32.0/kind-linux-arm64
chmod +x ./kind
sudo mv ./kind /usr/local/bin/kind
```

## Windows

### PowerShell

```powershell
curl.exe -Lo kind-windows-amd64.exe https://kind.sigs.k8s.io/dl/v0.32.0/kind-windows-amd64
Move-Item .\kind-windows-amd64.exe C:\some-dir-in-your-PATH\kind.exe
```

Replace `C:\some-dir-in-your-PATH\` with a directory that is included in your system `PATH`.

### Chocolatey

```powershell
choco install kind
```

Verify your installations by running:

```bash
docker --version
kubectl version --client
kind version
```

---

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd cake-delight
```

### 2. Build Docker Images

From the project root, build the necessary Docker images:

```bash
docker compose build
```

Verify the images were created successfully:

```bash
docker images
```

The application images should include:
- `cake-delight-api-gateway`
- `cake-delight-catalog-service`
- `cake-delight-order-service`
- `cake-delight-rating-service`
- `cake-delight-notification-service`

### 3. Create the Kind Cluster

Create a local Kubernetes cluster using Kind:

```bash
kind create cluster --name cake-delight
```

Verify the cluster is running:

```bash
kubectl cluster-info --context kind-cake-delight
```

### 4. Load Images into Kind

Load the locally built application images into the Kind cluster:

```bash
kind load docker-image cake-delight-api-gateway --name cake-delight
kind load docker-image cake-delight-catalog-service --name cake-delight
kind load docker-image cake-delight-order-service --name cake-delight
kind load docker-image cake-delight-rating-service --name cake-delight
kind load docker-image cake-delight-notification-service --name cake-delight
```

### 5. Deploy to Kubernetes

Apply all Kubernetes manifests to deploy the application:

```bash
kubectl apply -f k8s/
```

Verify the deployment:

```bash
kubectl get pods -n cake-delight
```
> **Note:** All application pods should eventually show `1/1` under the READY column and a `Running` status.

Check the active services:

```bash
kubectl get services -n cake-delight
```

### 6. Access the API Gateway

The API Gateway runs on port `5000`. Forward the Kubernetes service to your local machine:

```bash
kubectl port-forward -n cake-delight service/api-gateway 5000:5000
```

The API Gateway is now available at: [http://localhost:5000](http://localhost:5000)

### 7. Run the Frontend

From the `frontend` directory, start the user interface using a local HTTP server. For example:

```bash
cd frontend
To serve the HTML file, you can either use the command 
`python -m http.server 5500` or 
use the Live Server extension in Visual Studio Code.
```

The frontend will be available at: [http://localhost:5500](http://localhost:5500)

#### Architecture Flow
The frontend communicates with the API Gateway on port `5000`.

```text
Frontend (localhost:5500)
          |
          v
API Gateway (localhost:5000)
          |
          v
   Kubernetes Services
          |
    +-----+-----+-----+
    |     |     |     |
 Catalog Order Rating Notification
```

### 8. Verify the Application

Check all active Kubernetes resources in the namespace:

```bash
kubectl get all -n cake-delight
```

If a pod is not running properly, check its logs for troubleshooting:

```bash
kubectl logs -n cake-delight <pod-name>
```

### 9. Stop and Remove the Environment

To delete the Kubernetes resources but keep the cluster:

```bash
kubectl delete -f k8s/
```

To completely remove the Kind cluster and free up resources:

```bash
kind delete cluster --name cake-delight
```

### 10. Start Again

If you need to recreate the environment from scratch, run the following sequence:

```bash
docker compose build

kind create cluster --name cake-delight

kind load docker-image cake-delight-api-gateway --name cake-delight
kind load docker-image cake-delight-catalog-service --name cake-delight
kind load docker-image cake-delight-order-service --name cake-delight
kind load docker-image cake-delight-rating-service --name cake-delight
kind load docker-image cake-delight-notification-service --name cake-delight

kubectl apply -f k8s/

kubectl get pods -n cake-delight
```
