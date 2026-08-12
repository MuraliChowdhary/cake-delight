# Cake Delight - Architecture

## Overview

Cake Delight is a containerized microservices-based application designed for local development and deployment using Docker Compose and Kubernetes.

The application features a static frontend, an API Gateway, independent backend services, dedicated PostgreSQL databases, Redis for caching, and RabbitMQ for asynchronous communication.

---

## Architecture Diagram

```text
                         ┌─────────────────────────┐
                         │        Frontend         │
                         │   HTML / CSS / JavaScript│
                         │     localhost:5500      │
                         └────────────┬────────────┘
                                      │
                                      │ HTTP
                                      ▼
                         ┌─────────────────────────┐
                         │       API Gateway       │
                         │   Express Gateway       │
                         │        Port 5000        │
                         └────────────┬────────────┘
                                      │
                ┌─────────────────────┼─────────────────────┐
                │                     │                     │
                ▼                     ▼                     ▼
      ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
      │ Catalog Service │   │  Order Service  │   │ Rating Service  │
      │     :5001       │   │     :5002       │   │     :5003       │
      └────────┬────────┘   └────────┬────────┘   └────────┬────────┘
               │                     │                     │
               ▼                     ▼                     ▼
      ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
      │   Catalog DB    │   │    Order DB     │   │    Rating DB    │
      │   PostgreSQL    │   │   PostgreSQL    │   │   PostgreSQL    │
      └─────────────────┘   └─────────────────┘   └─────────────────┘

                                      │
                                      │ Events
                                      ▼
                              ┌─────────────────┐
                              │    RabbitMQ     │
                              │ Async Messaging │
                              └────────┬────────┘
                                       │
                                       ▼
                              ┌─────────────────┐
                              │  Notification   │
                              │    Service      │
                              │      :5004      │
                              └────────┬────────┘
                                       │
                                       ▼
                              ┌─────────────────┐
                              │ Notification DB │
                              │   PostgreSQL    │
                              └─────────────────┘

                    ┌─────────────────────────────┐
                    │            Redis            │
                    │       Caching Layer         │
                    └─────────────────────────────┘
```

---

## Components

### 1. Frontend
The frontend is a static HTML, CSS, and JavaScript application.

**Responsibilities:**
* Display the Cake Delight user interface.
* Browse and search cakes.
* Filter cakes by category.
* Manage the basket and place orders.
* View order history.
* Submit and update reviews.
* Display notifications.

**Communication Flow:**
The frontend communicates with the backend exclusively through the API Gateway. It does not directly communicate with individual backend services.
```text
Frontend (localhost:5500) → API Gateway (localhost:5000)
```

### 2. API Gateway

The API Gateway serves as the single entry point for all frontend API requests. It is the only component that needs to be exposed to external users.

**Responsibilities:**
- Routing requests to the appropriate service.
- Managing Cross-Origin Resource Sharing (CORS).
- Implementing request policies and rate limiting as configured.
- Forwarding requests to internal services. 

**Example Routing (Port 5000):**
| Route | Target Service |
| :--- | :--- |
| `/api/v1/cakes/*` | Catalog Service |
| `/api/v1/cakes/*/ratings` | Rating Service |
| `/api/v1/basket/*` | Order Service |
| `/api/v1/orders/*` | Order Service |
| `/api/v1/notifications/*` | Notification Service |

### 3. Backend Services
Backend services communicate with each other through Kubernetes internal services.

| Service | Port | Database | Technologies |
| :--- | :--- | :--- | :--- |
| **Catalog Service** | 5001 | `catalog-db` | PostgreSQL, Redis (Caching) |
| **Order Service** | 5002 | `order-db` | PostgreSQL, RabbitMQ (Messaging) |
| **Rating Service** | 5003 | `rating-db` | PostgreSQL, Redis (Caching) |
| **Notification Service**| 5004 | `notification-db`| PostgreSQL, RabbitMQ (Messaging) |

**Service Responsibilities:**

* **Catalog Service:** Manage cake information, including retrieving, searching, and filtering cakes. Provide details about individual cakes and their availability.
* **Order Service:** Handle customer baskets by allowing additions, removals, and updates. Create orders and retrieve customer order histories. Communicate with the Catalog Service and publish order-related events.
* **Rating Service:** Submit and update cake ratings and reviews, retrieve existing reviews, and calculate overall rating information.
* **Notification Service:** Consume events related to orders, store notifications, provide notifications to customers, and send email alerts.
---

## Data Storage & Infrastructure

### PostgreSQL (Database-per-Service)

Each service has its own PostgreSQL database to maintain isolation of service data. Services **do not** directly access each other's databases. The databases for each service are as follows:

- Catalog Service → `catalog-db`
- Order Service → `order-db`
- Rating Service → `rating-db`
- Notification Service → `notification-db`

### Redis

Redis is utilized as a caching layer for frequently accessed data, primarily serving as a read cache for the Catalog and Rating services. The flow of data is illustrated below:

```text
Application Service → Redis (Cache) → [Cache Miss] → PostgreSQL
```

### RabbitMQ
RabbitMQ provides asynchronous communication between services, decoupling processes.
*   *Example Flow:* Order Service publishes an order event → RabbitMQ → Notification Service consumes the event (stores notification & sends email). 
*   *Benefit:* The Order Service does not need to wait for email processing to complete before finalizing the order workflow.

---

## API Communication

*   **Synchronous Communication (HTTP):** Used when an immediate response is required.
    *   *Example:* Frontend → API Gateway → Order Service → Catalog Service (`http://catalog-service:5001`).
*   **Asynchronous Communication (Events):** RabbitMQ is used for event-driven communication.
    *   *Example:* Order Service → RabbitMQ → Notification Service.

---

## Kubernetes Architecture

The application is deployed locally using a Kind Kubernetes cluster. All application resources are deployed in the `cake-delight` namespace.

### Internal Services (Service Discovery)
Kubernetes Services provide internal DNS-based communication between components. These are not exposed directly to the host machine:
*   `catalog-service:5001`
*   `order-service:5002`
*   `rating-service:5003`
*   `notification-service:5004`
*   `redis:6379`
*   `rabbitmq:5672`

### External Access & CORS
*   **Frontend:** `http://localhost:5500`
*   **API Gateway:** `http://localhost:5000`

CORS is handled entirely at the API Gateway. The browser sends cross-origin requests from `localhost:5500` to `localhost:5000`. Backend services do not need to allow the frontend origin since the browser does not communicate with them directly.

### Configuration and Secrets
Configuration is separated from application images:
*   **ConfigMaps:** Used for non-sensitive configuration (Service ports, environment variables, internal service URLs, Redis URLs).
*   **Secrets:** Used for sensitive configuration (Database credentials, RabbitMQ credentials, email credentials).

---

## Deployment Model

The application supports two local execution environments:
1.  **Docker Compose:** Used for local development and service-level testing.
2.  **Kubernetes:** `Kind` is used to run the Kubernetes deployment locally. Docker images are built locally and loaded into the Kind cluster before Kubernetes manifests are applied.

---

## High-Level Request Flow

A typical customer order follows this workflow:

1. The customer opens the **Frontend**.
2. The Frontend sends a request to the **API Gateway**.
3. The API Gateway routes the request to the **Order Service**.
4. The Order Service validates the order.
5. The order is stored in a PostgreSQL database (`order-db`).
6. An order event is published to **RabbitMQ**.
7. The **Notification Service** consumes the event, stores the notification, and sends an email.
8. The Frontend retrieves the notification.

---

## Design Principles

The architecture is built upon the following core principles:

* **Microservice Separation:** Each business capability is developed as an independent service.
* **API Gateway Pattern:** All frontend requests are routed through a single gateway.
* **Database per Service:** Each service maintains its own PostgreSQL database.
* **Asynchronous Messaging:** RabbitMQ is utilized to decouple notification processing from order processing.
* **Caching:** Redis is employed to minimize repeated database reads.
* **Containerization:** All services are packaged as Docker images for consistency.
* **Service Discovery:** Kubernetes Services enable internal communication using DNS.
* **Configuration Separation:** ConfigMaps and Secrets are used to manage runtime configuration separately.
* **Local Kubernetes Deployment:** Kind is used to create an accurate local Kubernetes environment for deployment and testing.