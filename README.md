# Cake Delight

Cake Delight is a small online bakery where customers can browse and filter cakes by name, category, or price, add items to their basket, and proceed to checkout. After placing an order, customers receive an email confirmation and can rate their purchased cakes.

The system consists of four independent services: catalog management, order processing, ratings, and notifications. These services communicate via HTTP and a message queue, operate in separate containers, and can be deployed individually.

This document provides an overview of the project, detailing the components, system operation, service functions, development decisions, and challenges faced along the way.

---

## Quick Start — Just Want to Run It?

If you want to see it working before diving into details, follow these quick steps.

**1. Install Docker and Kind.**  
Docker runs the containers, and Kind sets up the local Kubernetes cluster. Refer to [`docs/setup.md`](docs/setup.md) for installation instructions if you don’t have them yet.

**2. Ensure Docker is Running.**  
Make sure Docker is active, and you have the necessary permissions to run Docker commands. On Linux, this usually requires your user to be in the `docker` group.

**3. Deploy with One Script:**  
Run the following commands to deploy the project:
```bash
chmod +x deploy.sh
./deploy.sh
```
This script checks your tool installations, builds images, creates the Kind cluster, and deploys the system. The first run may take a few minutes.

After it completes, use this command to forward the API Gateway:
```bash
kubectl port-forward -n cake-delight svc/api-gateway 5000:5000
```
Now, open the frontend as outlined in [Section 6](#6-running-the-project).

---

## 1. What's Inside

The system includes four backend services, an API Gateway, a simple HTML/CSS/JavaScript frontend, and supporting infrastructure like databases, a message broker, and a cache.

- **Cake Catalog Service**: Manages the product list including cakes, prices, categories, and stock.
  
- **Order Service**: Handles customer shopping baskets, purchases, payment info, and item quantities.
  
- **Rating Service**: Collects cake reviews, star ratings, and comments.
  
- **Notification Service**: Sends order confirmation emails and stores records of those emails.

- **API Gateway**: Serves as the single entry point for all interactions, with the frontend only communicating through it.

Each service has a separate PostgreSQL database. The Order Service and Notification Service communicate indirectly via RabbitMQ, a message broker.

---

## 2. Technology Stack

- **Language & Runtime:** The project uses plain JavaScript on Node.js.
- **Web Framework:** I use Express for all backend components.
- **Databases:** PostgreSQL is employed with separate databases for each service, ensuring no cross-access.
- **Caching:** Redis is implemented by the Catalog and Rating Services to optimize read requests to PostgreSQL.
- **Messaging:** RabbitMQ handles the asynchronous event of notifying the Notification Service upon order completion.
- **Validation:** Zod validates incoming request bodies at the edge of each service.
- **Containers:** Docker is utilized for each service, with Docker Compose for development and Kubernetes for deployment via Kind.
- **API Gateway:** Express Gateway is our configuration-driven gateway framework, although it hasn’t been actively maintained. An alternative would be better for long-term use, as noted in the Assumptions.
- **Frontend:** The frontend is built with plain HTML, CSS, and JavaScript, communicating only with the API Gateway.
- **Email:** Nodemailer is configured with Ethereal for testing email generation without real inbox delivery.

    Note: There is no separate authentication or user account service, which is a deliberate design choice explained in the Assumptions section.
---

## 3. Project Structure

```
cake-delight/
│
├── catalog-service/
├── order-service/
├── rating-service/
├── notification-service/
├── api-gateway/
├── frontend/
│
├── docker-compose.yml
│
└── k8s/
    ├── namespace.yaml
    ├── secrets.yaml
    ├── configmaps.yaml
    │
    ├── catalog/
    │   ├── db.yaml            # the catalog database — its own Postgres instance and storage
    │   ├── deployment.yaml    # the catalog service itself
    │   └── service.yaml
    │
    ├── order/        (same three files)
    ├── rating/        (same three files)
    ├── notification/  (same three files)
    │
    ├── rabbitmq/
    │   ├── deployment.yaml
    │   ├── service.yaml
    │   └── pvc.yaml
    │
    ├── redis/
    │   ├── deployment.yaml
    │   ├── service.yaml
    │   └── pvc.yaml
    │
    └── gateway/
        ├── deployment.yaml
        └── service.yaml
```

Inside each backend service, the code is laid out the same way every time, so once you understand one, you understand all four:

```
service-name/
├── src/
│   ├── config/          # environment variables, database connection, RabbitMQ/Redis connections
│   ├── routes/          # which URL maps to which function
│   ├── controllers/     # reads the request, calls the service layer, sends the response
│   ├── services/        # the actual business rules live here
│   ├── repositories/    # the only place that talks to the database directly
│   ├── validators/      # Zod schemas that check incoming data
│   ├── middlewares/     # error handling, request logging, identity extraction
│   ├── health/          # the two health-check endpoints Kubernetes uses
│   ├── app.js            # wires everything above together
│   └── bin/www           # the actual entry point that starts the server
├── db/migrations/        # SQL files that build the database schema
├── tests/
└── Dockerfile
```

---

## 4. Installation

You'll need Docker, Docker Compose, Node.js (only if you want to run something outside a container), and — for the Kubernetes version — `kubectl` and `kind` installed.

Clone the repository, then from the root folder:

```bash
docker compose build
```

This builds all five images (the four services plus the gateway). It takes a few minutes the first time.

---

## 5. Environment Variables

Every service reads its configuration from environment variables rather than hardcoded values, so the same code can run locally, in Docker Compose, or in Kubernetes without changes.

| Variable | Used by | What it's for |
|---|---|---|
| `PORT` | all backend services | which port the service listens on |
| `NODE_ENV` | all backend services | `development` or `production` — affects how much detail shows up in error responses |
| `DATABASE_URL` | all backend services | full Postgres connection string, including the password |
| `REDIS_URL` | Catalog, Rating | where to find the shared Redis cache |
| `RABBITMQ_URL` | Order, Notification | where to find the message broker, including credentials |
| `CATALOG_SERVICE_URL` | Order | how Order Service reaches Catalog Service to look up a cake's price |
| `EMAIL_HOST` / `EMAIL_PORT` / `EMAIL_USER` / `EMAIL_PASS` / `EMAIL_FROM` | Notification | the Ethereal test SMTP account details |

---

## 6. Running the Project

### The fast way — Docker Compose

```bash
docker compose up --build
```

This starts everything: all four databases, RabbitMQ, Redis, the four backend services, and the gateway. Give it a minute — the databases and RabbitMQ need to finish starting before the app services can connect to them, and each service is written to wait and retry rather than crash if it comes up first.

Once it's running, the API Gateway is reachable at `http://localhost:5000`. Open `frontend/index.html` through a simple local web server (I used the VS Code Live Server extension, running on `http://localhost:5500`) — opening the file directly from disk won't work correctly because of how browsers handle cross-origin requests.

### The real deployment — Kubernetes with Kind

I chose Kind over Minikube because it runs cluster nodes as plain Docker containers using the Docker installation you already have, rather than spinning up a separate virtual machine layer. It starts faster and feels closer to how a real cluster behaves.

```bash
kind create cluster --name cake-delight
```

Kind can't see Docker images sitting on your machine automatically — they have to be handed to it explicitly:

```bash
kind load docker-image cake-delight-api-gateway:latest --name cake-delight
kind load docker-image cake-delight-catalog-service:latest --name cake-delight
kind load docker-image cake-delight-order-service:latest --name cake-delight
kind load docker-image cake-delight-rating-service:latest --name cake-delight
kind load docker-image cake-delight-notification-service:latest --name cake-delight
```

Every deployment for these five images sets `imagePullPolicy: Never`, telling Kubernetes not to try downloading them from the internet — they only exist locally, and Kubernetes needs to be told that explicitly or it will fail trying to pull something that isn't there.

Then apply everything, roughly in the order things depend on each other:

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/configmaps.yaml

kubectl apply -f k8s/redis/
kubectl apply -f k8s/rabbitmq/

kubectl apply -f k8s/catalog/
kubectl apply -f k8s/rating/
kubectl apply -f k8s/order/
kubectl apply -f k8s/notification/

kubectl apply -f k8s/gateway/
```

Check everything came up cleanly:

```bash
kubectl get pods -n cake-delight
```

Every pod should eventually show `1/1 Running`. Reach the gateway with:

```bash
kubectl port-forward -n cake-delight svc/api-gateway 5000:5000
```

---

## 7. What Each Service Actually Does

### Cake Catalog Service
**Port:** 5001 · **Database:** `catalog_db` (PostgreSQL) · **Depends on:** Redis for caching

### Cake Catalog Service
This service lists cakes with their name, description, category, price, and availability. Users can browse and filter this list without signing in. To optimize performance, reads are cached in Redis. When a cake is modified, the related cache is cleared to ensure up-to-date information.

### Order Service
**Port:** 5002  
**Database:** `order_db` (PostgreSQL)  
**Dependencies:** Catalog Service, RabbitMQ

The Order Service manages the shopping basket and checkout. When a cake is added, it retrieves the current price from the Catalog Service. If the price changes later, the order retains the original price. Upon checkout, the basket converts to a completed order, notifying the system via RabbitMQ.

### Rating Service
**Port:** 5003  
**Database:** `rating_db` (PostgreSQL)  
**Dependency:** Redis

This service allows customers to rate cakes with stars and comments, calculating an average rating. Each customer can rate a cake only once; updates to existing ratings replace previous ones.

### Notification Service
**Port:** 5004  
**Database:** `notification_db` (PostgreSQL)  
**Dependencies:** RabbitMQ, email provider

The Notification Service listens for completed order messages from the Order Service. It sends confirmation emails and records their status. Customers can also view their notification history.

### API Gateway
**Port:** 5000

    The API Gateway is the primary entry point for the browser to access backend services, forwarding requests based on the path and managing CORS.
---

## 8. API Reference

Every request that needs to know who's making it — adding to a basket, submitting a rating, checking out — expects a header called `X-User-Id`, containing a UUID. There's no login step; the frontend generates one UUID the first time someone visits and reuses it for the rest of their session.  Please  Refer to [`docs/api_documentation.md`](docs/api_documentation.md)

### Cake Catalog

**List cakes**
```
GET /api/v1/cakes
GET /api/v1/cakes?category=Chocolate&search=fudge&minPrice=10&maxPrice=30
```
Returns every cake matching the filters. All filters are optional.

**Get one cake**
```
GET /api/v1/cakes/:id
```

**Create a cake**
```
POST /api/v1/cakes
Body: { "name": "Chocolate Fudge Cake", "description": "...", "price": 24.99, "category": "Chocolate", "imageUrl": "..." }
```

**Update a cake**
```
PUT /api/v1/cakes/:id
Body: any subset of the same fields, plus "isAvailable": true/false
```

**Delete a cake**
```
DELETE /api/v1/cakes/:id
```

### Ratings

**List ratings for a cake**
```
GET /api/v1/cakes/:cakeId/ratings
```

**Submit a rating** *(requires X-User-Id)*
```
POST /api/v1/cakes/:cakeId/ratings
Body: { "score": 5, "comment": "Loved it" }
```

**Get the average**
```
GET /api/v1/cakes/:cakeId/ratings/average
```

**Update your own rating** *(requires X-User-Id, must match the original author)*
```
PUT /api/v1/cakes/:cakeId/ratings/:ratingId
```

**Delete your own rating** *(same rule)*
```
DELETE /api/v1/cakes/:cakeId/ratings/:ratingId
```

### Basket & Orders

All of these require `X-User-Id`.

```
GET    /api/v1/basket
POST   /api/v1/basket/items          Body: { "cakeId": "...", "quantity": 2 }
PATCH  /api/v1/basket/items/:cakeId  Body: { "quantity": 5 }
DELETE /api/v1/basket/items/:cakeId

POST   /api/v1/orders/checkout       Body: { "customerEmail": "you@example.com" }
GET    /api/v1/orders/:id
```

### Notifications

```
GET /api/v1/notifications              (requires X-User-Id — everything this customer has ever received)
GET /api/v1/notifications/:orderId     (everything tied to one specific order)
```

---

## 9. Service Ports

| Service | Port |
|---|---|
| API Gateway | 5000 |
| Cake Catalog Service | 5001 |
| Order Service | 5002 |
| Rating Service | 5003 |
| Notification Service | 5004 |
| RabbitMQ (AMQP) | 5672 |
| RabbitMQ (management UI) | 15672 |
| Redis | 6379 |

---

## 10. Testing

Every endpoint listed above was tested manually with real requests during development. A comprehensive walkthrough, including exact commands and expected responses, can be found in a separate testing document included with this README. In addition to verifying that the endpoints return the correct responses, I specifically focused on situations that are prone to errors in a system like this:

Please refer to the documentation located at [`docs/api_documentation.md`](docs/api_documentation.md).

1. Two checkout requests sent to the same basket nearly simultaneously—only one should succeed, while the other should be rejected gracefully, avoiding the creation of duplicate orders or system crashes.
2. The same order-complete message delivered to the Notification Service twice—it should recognize the duplicate and refrain from sending a second email.
3. Stopping RabbitMQ and then attempting to check out—the order should still be processed; however, the confirmation email will not be sent until the broker is back online. This will be logged clearly rather than being silently ignored.
4. A message that fails to process three times consecutively should stop retrying and instead be moved to a separate holding queue, rather than attempting to process it indefinitely.
5. If a service is terminated in the middle of a request, it should finish processing the current request before shutting down rather than dropping it.

---

## 11. RabbitMQ — How the Messaging Actually Works

This is the one place in the system where two services talk to each other without calling each other's API directly, and it's worth explaining properly rather than just listing configuration.

When someone checks out, Order Service doesn't call Notification Service. Instead, it publishes a message onto an exchange called `order.events`, using the routing key `order.completed`. Notification Service is listening on a queue called `notification.queue`, which is bound to that exchange. The moment a message lands there, Notification Service picks it up — usually within milliseconds — sends the confirmation email, and records what happened.

The reason for doing it this way rather than a direct call: if Notification Service is down, or slow, or the email provider is having a bad day, Order Service is completely unaffected. The checkout still succeeds. That's the whole point of decoupling them like this.

A few extra pieces make this reliable rather than just functional:

- **Every message carries a unique ID.** If the same message somehow gets delivered twice — which message brokers are allowed to do occasionally, by design — Notification Service checks that ID against what it's already processed and skips it, so a customer never gets two confirmation emails for one order.
- **If processing a message fails, it's retried up to three times**, with a counter carried in the message itself so it doesn't retry forever.
- **After three failed attempts, the message is moved to a separate dead-letter queue** instead of being dropped or retried endlessly. That way a genuinely broken message doesn't clog the system, but it also isn't lost — it's sitting somewhere you can go look at it.

---

## 12. Docker

Build and run any single service on its own:

```bash
docker build -t cake-delight-catalog-service:latest ./catalog-service
docker run -p 5001:5001 --env-file catalog-service/.env cake-delight-catalog-service:latest
```

Or bring up the whole system together, which is the more useful path for actually testing anything end to end:

```bash
docker compose up --build
```

---

## 13. Kubernetes — The Full Story

The step-by-step commands are already in Section 6. This section is about the decisions behind them, and a couple of real problems I ran into while building this, because those are worth knowing if you're picking this project back up later.

**Secrets versus ConfigMaps.** Anything that's a password or a credential — database logins, the RabbitMQ password, the email account — lives in a Kubernetes Secret, base64-encoded. Everything else — ports, hostnames, feature flags — lives in a ConfigMap. This isn't just tidiness: Secrets and ConfigMaps are treated differently by Kubernetes' own access controls, so keeping credentials only where they belong actually matters.

**Two different health checks per service.** Every service exposes `/health/live` and `/health/ready` separately. Liveness just answers "is the process still running." Readiness actually checks that the service can reach its database (and Redis, where relevant) — so Kubernetes won't send traffic to a pod that's technically alive but can't actually do its job yet, like right after a restart before its database connection has finished reconnecting.

**Two real bugs I hit, and how I found them:**

The first was RabbitMQ refusing to start once I gave it persistent storage — it kept crashing in a loop. The cause turned out to be file permissions: RabbitMQ's container runs as a non-root user, but Kind's default storage setup created the volume owned by root, so RabbitMQ couldn't write to its own data folder. The fix was adding `fsGroup: 999` to the pod's security settings, which tells Kubernetes to hand the volume over to the right user before the container starts.

 The Notification Service didn't log actions when email sending failed, due to hanging calls. I resolved this by writing a "pending" record upon message receipt and updating it post-email attempt. Implementing a timeout for email calls also ensured that the service wouldn’t hang indefinitely, highlighting the need for testing failure scenarios.

---

## 14. Public Deployment

This project is running locally on a Kind Kubernetes cluster on the developer's machine. It has not been deployed to a public cloud environment, so there is currently no public URL available. The complete source code, configuration files, Docker setup, and Kubernetes manifests have been uploaded to GitHub. You can find them at the following link: 

**GitHub:** [Cake Delight Repository](https://github.com/MuraliChowdhary/cake-delight).

---

## 15. Assumptions and Decisions Worth Knowing About

A few choices were made along the way that aren't obvious just from reading the code, so they're written out plainly here.

**There's no login system.** The project brief doesn't ask for one, and building one wasn't part of the assessed scope. Instead, each customer is identified by a UUID that the frontend generates the first time someone visits and stores in the browser, sent along as the `X-User-Id` header on every request that needs it. Nobody's identity is verified — it's trust-based, which is a reasonable simplification for this project but wouldn't be acceptable in a real system handling real payments.

**Every service uses PostgreSQL, not a mix of databases.** I considered using MongoDB for the catalog specifically, since that's a common choice for product catalogs with flexible attributes. I decided against it because every cake in this system has exactly the same fields — there's no genuine flexibility to take advantage of, so a document database wouldn't actually buy us anything, while keeping everything on Postgres keeps the whole deployment simpler.

**The code uses plain functions and `module.exports` throughout, not classes.** This was a deliberate style choice, matching how the team was trained, and it's consistent across every service.

**Order Service snapshots the price of a cake at the moment it's added to the basket**, rather than looking it up again at checkout. If the price in the catalog changes afterward, an order that's already in someone's basket keeps the price it started with — which is how real online shops generally behave, and avoids a customer being surprised at checkout.

**A checkout is never rolled back just because RabbitMQ is unavailable.** The order still completes successfully; only the confirmation email is affected, and that failure is logged clearly. In a larger production system, this gap would usually be closed with something called the Outbox Pattern, which guarantees the notification message eventually gets sent even if the broker was down at the exact moment of checkout — that's more infrastructure than this project needed, but it's the right next step if this were going further.

**Notification Service and Order Service each keep their own copy of the message format** they agree on for a completed order. Since this project doesn't use any shared package tooling between services, there's no single file both services import — instead, both copies are kept identical by hand, and any change to one has to be made in the other at the same time. This is a real limitation of the plain-JavaScript, no-shared-package setup, and worth knowing about if the message format ever needs to change.

**Email doesn't go to a real inbox.** It goes through Ethereal, a testing SMTP service that generates a preview link instead of delivering anywhere real. That's the right choice for a project without a real domain or mail provider set up, but it's the first thing that would need to change before this went anywhere near production.

**CORS is handled only at the API Gateway.** Earlier in the build, each backend service had its own CORS setup as well, left over from before the gateway existed. That turned out to cause real problems — two different services disagreeing about what was allowed produced confusing browser errors that took some real debugging to trace back to the actual cause. Once I understood that CORS is something a browser enforces, and that the backend services are never talked to directly by a browser once the gateway is in place, I removed it from all four services and left it only in the gateway, where it actually belongs.

**The gateway's allowed origin is currently set to the local development address the frontend runs on during testing.** That's a value specific to this developer's machine and setup, not something that would work as-is anywhere else — it would need to change to match wherever the frontend actually gets hosted.
