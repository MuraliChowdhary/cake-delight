# Cake Delight

Cake Delight is a small online bakery. A customer can look through a list of cakes, filter them by name, category, or price, put a few in a basket, adjust quantities, check out, and get an email once the order goes through. Afterward, they can rate what they bought.

That's the whole product on the surface. What this project is really about, underneath, is how it's built: instead of one big application doing everything, the system is split into four independent services, each owning one part of the business — the catalog, the orders, the ratings, and the notifications — talking to each other over HTTP and through a message queue, running in their own containers, and deployable one at a time without touching the others.

This document walks through everything: what's inside, how to run it, what each piece does, and the decisions we made along the way — including a few things that went wrong during the build and how we fixed them, because that's usually more useful to know than pretending everything worked on the first try.

---

## 1. What's Actually Inside

Four backend services, one API Gateway sitting in front of all of them, a small plain HTML/CSS/JavaScript frontend, and the supporting infrastructure (databases, a message broker, a cache) that ties it together.

- **Cake Catalog Service** — the product list. Cakes, their prices, categories, and whether they're in stock.
- **Order Service** — the basket and the checkout. This is where money and quantities live.
- **Rating Service** — reviews. Star ratings and comments per cake.
- **Notification Service** — sends the order confirmation email once a checkout finishes, and keeps a record of what was sent.
- **API Gateway** — the single door into the system. The frontend never talks to any of the four services directly; everything goes through here.

Each service has its own PostgreSQL database that nothing else is allowed to touch directly. Order Service and Notification Service also talk to each other indirectly through RabbitMQ, a message broker, rather than calling one another's APIs — more on why further down.

---

## 2. Technology Stack

- **Language & runtime:** Plain JavaScript running on Node.js. We considered TypeScript early on but were asked to build in JavaScript, so the whole backend is written that way — no build step, no compiler, just Node reading `.js` files directly.
- **Web framework:** Express, for all five backend pieces.
- **Databases:** PostgreSQL. Every service gets its own separate database and its own login — no service can see another service's tables, even by accident.
- **Caching:** Redis, used by Catalog and Rating Service to avoid hitting Postgres on every single read.
- **Messaging:** RabbitMQ, used only for the one event that genuinely needs to be asynchronous — telling Notification Service that an order was just completed.
- **Validation:** Zod, used at the edge of every service to check incoming request bodies before any business logic runs.
- **Containers:** Docker for every service, Docker Compose for running everything together locally, and Kubernetes (via Kind) for the deployed version.
- **API Gateway:** Express Gateway, a configuration-driven gateway framework. Worth being upfront about this one: Express Gateway hasn't been actively maintained in a few years. We used it because it's what we were taught to use, and it does the job well for this project's size, but if this were going into real production long-term, a maintained alternative would be the better call. We've noted that explicitly in the Assumptions section rather than pretending otherwise.
- **Frontend:** Plain HTML, CSS, and JavaScript — no framework. It talks only to the API Gateway.
- **Email:** Nodemailer, pointed at Ethereal, a free fake-SMTP service made for exactly this kind of testing. It doesn't deliver to a real inbox — it gives you a preview link instead, which is perfect for a demo where you want to show an email was actually generated without needing real mailboxes.

One thing we didn't do: there's no separate authentication or user account service anywhere in this system. That's a deliberate choice explained properly in the Assumptions section, not an oversight.

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

A couple of things we deliberately removed along the way, worth mentioning so nobody goes looking for them: there's no `JWT_SECRET` anywhere — we never built authentication, so it was never needed. And `ALLOWED_ORIGIN` used to exist inside each individual service for CORS, but partway through the build we moved CORS handling entirely into the API Gateway, so it no longer belongs on the backend services at all. If you see it referenced anywhere in an older file, that's leftover and safe to delete.

---

## 6. Running the Project

### The fast way — Docker Compose

```bash
docker compose up --build
```

This starts everything: all four databases, RabbitMQ, Redis, the four backend services, and the gateway. Give it a minute — the databases and RabbitMQ need to finish starting before the app services can connect to them, and each service is written to wait and retry rather than crash if it comes up first.

Once it's running, the API Gateway is reachable at `http://localhost:5000`. Open `frontend/index.html` through a simple local web server (we used the VS Code Live Server extension, running on `http://localhost:5500`) — opening the file directly from disk won't work correctly because of how browsers handle cross-origin requests.

### The real deployment — Kubernetes with Kind

We chose Kind over Minikube because it runs cluster nodes as plain Docker containers using the Docker installation you already have, rather than spinning up a separate virtual machine layer. It starts faster and feels closer to how a real cluster behaves.

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

Holds the list of cakes — name, description, category, price, and whether it's currently available. Anyone can browse and filter without needing to be identified. Reads are cached in Redis for a short time so repeated browsing doesn't hammer the database; any change to a cake clears the relevant cache entries so nobody ever sees stale data for long.

### Order Service
**Port:** 5002 · **Database:** `order_db` (PostgreSQL) · **Depends on:** Catalog Service (to look up prices), RabbitMQ (to announce a completed order)

Handles the basket and checkout. When a cake is added to the basket, Order Service asks Catalog Service what it currently costs and stores that price with the basket line — so if the price changes later in the catalog, an order that's already been placed doesn't silently change with it. Checking out turns the basket into a finished order and tells the rest of the system it happened by publishing a message, rather than calling Notification Service directly.

### Rating Service
**Port:** 5003 · **Database:** `rating_db` (PostgreSQL) · **Depends on:** Redis for caching

Lets a customer leave a star rating and an optional comment on a cake, and calculates the average rating per cake. Each customer can only rate a given cake once — trying again updates the same rating rather than creating a second one.

### Notification Service
**Port:** 5004 · **Database:** `notification_db` (PostgreSQL) · **Depends on:** RabbitMQ, the email provider

Doesn't expose much of an API by itself. Its real job is listening — it sits and waits for the "an order just completed" message from Order Service, sends a confirmation email, and keeps a record of whether that email actually went out. Customers can also look up their own notification history.

### API Gateway
**Port:** 5000

The only part of the backend the browser is allowed to talk to. It looks at the incoming request's path and forwards it to whichever service owns that piece of the system. It's also the only place that handles cross-origin requests (CORS) — none of the four backend services do this themselves, since a browser only ever talks to the gateway, never to them directly.

---

## 8. API Reference

Every request that needs to know who's making it — adding to a basket, submitting a rating, checking out — expects a header called `X-User-Id`, containing a UUID. There's no login step; the frontend generates one UUID the first time someone visits and reuses it for the rest of their session.

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

Every endpoint above was tested manually with real requests during development — a full walkthrough with exact commands and expected responses lives in the separate testing document included alongside this README. Beyond the basic "does it return the right thing" checks, we specifically tested the situations that are easy to get wrong in a system like this:

- Two checkout requests fired at the same basket at nearly the same moment — only one should succeed, the other should be turned away cleanly rather than creating two orders or crashing.
- The same order-completed message delivered to Notification Service twice — it should recognize the duplicate and not send a second email.
- Stopping RabbitMQ, then checking out — the order should still go through; the confirmation email just won't send until the broker comes back, and that gets logged clearly rather than silently swallowed.
- A message that fails to process three times in a row — it should stop retrying and land in a separate holding queue instead of retrying forever.
- Killing a service mid-request and confirming it finishes the request it was already handling before shutting down, instead of dropping it.

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

The step-by-step commands are already in Section 6. This section is about the decisions behind them, and a couple of real problems we ran into while building this, because those are worth knowing if you're picking this project back up later.

**Secrets versus ConfigMaps.** Anything that's a password or a credential — database logins, the RabbitMQ password, the email account — lives in a Kubernetes Secret, base64-encoded. Everything else — ports, hostnames, feature flags — lives in a ConfigMap. This isn't just tidiness: Secrets and ConfigMaps are treated differently by Kubernetes' own access controls, so keeping credentials only where they belong actually matters.

**Two different health checks per service.** Every service exposes `/health/live` and `/health/ready` separately. Liveness just answers "is the process still running." Readiness actually checks that the service can reach its database (and Redis, where relevant) — so Kubernetes won't send traffic to a pod that's technically alive but can't actually do its job yet, like right after a restart before its database connection has finished reconnecting.

**Two real bugs we hit, and how we found them:**

The first was RabbitMQ refusing to start once we gave it persistent storage — it kept crashing in a loop. The cause turned out to be file permissions: RabbitMQ's container runs as a non-root user, but Kind's default storage setup created the volume owned by root, so RabbitMQ couldn't write to its own data folder. The fix was adding `fsGroup: 999` to the pod's security settings, which tells Kubernetes to hand the volume over to the right user before the container starts.

The second was more subtle. Notification Service wasn't saving anything to its database when the email provider had a problem — no record at all, not even a failed one. The cause was that the code only wrote to the database *after* the email had either succeeded or failed, and the email call itself had no timeout. If it hung, the code never reached either outcome, so nothing ever got saved. The fix was to write a "pending" record to the database the moment the message arrives, before even attempting to send the email, and update that same record to "sent" or "failed" afterward — plus adding a hard timeout to the email call so it can never hang indefinitely. That's a good example of why testing failure scenarios on purpose, not just the happy path, matters — this bug never would have shown up if we'd only ever tested with working email credentials.

---

## 14. Public Deployment

This project is running locally on a Kind Kubernetes cluster on the developer's machine. It has not been deployed to a public cloud environment, so there is currently no public URL available. The complete source code, configuration files, Docker setup, and Kubernetes manifests have been uploaded to GitHub. You can find them at the following link: 

**GitHub:** [Cake Delight Repository](https://github.com/MuraliChowdhary/cake-delight).

---

## 15. Assumptions and Decisions Worth Knowing About

A few choices were made along the way that aren't obvious just from reading the code, so they're written out plainly here.

**There's no login system.** The project brief doesn't ask for one, and building one wasn't part of the assessed scope. Instead, each customer is identified by a UUID that the frontend generates the first time someone visits and stores in the browser, sent along as the `X-User-Id` header on every request that needs it. Nobody's identity is verified — it's trust-based, which is a reasonable simplification for this project but wouldn't be acceptable in a real system handling real payments.

**Every service uses PostgreSQL, not a mix of databases.** We considered using MongoDB for the catalog specifically, since that's a common choice for product catalogs with flexible attributes. We decided against it because every cake in this system has exactly the same fields — there's no genuine flexibility to take advantage of, so a document database wouldn't actually buy us anything, while keeping everything on Postgres keeps the whole deployment simpler.

**The code uses plain functions and `module.exports` throughout, not classes.** This was a deliberate style choice, matching how the team was trained, and it's consistent across every service.

**Order Service snapshots the price of a cake at the moment it's added to the basket**, rather than looking it up again at checkout. If the price in the catalog changes afterward, an order that's already in someone's basket keeps the price it started with — which is how real online shops generally behave, and avoids a customer being surprised at checkout.

**A checkout is never rolled back just because RabbitMQ is unavailable.** The order still completes successfully; only the confirmation email is affected, and that failure is logged clearly. In a larger production system, this gap would usually be closed with something called the Outbox Pattern, which guarantees the notification message eventually gets sent even if the broker was down at the exact moment of checkout — that's more infrastructure than this project needed, but it's the right next step if this were going further.

**Notification Service and Order Service each keep their own copy of the message format** they agree on for a completed order. Since this project doesn't use any shared package tooling between services, there's no single file both services import — instead, both copies are kept identical by hand, and any change to one has to be made in the other at the same time. This is a real limitation of the plain-JavaScript, no-shared-package setup, and worth knowing about if the message format ever needs to change.

**Email doesn't go to a real inbox.** It goes through Ethereal, a testing SMTP service that generates a preview link instead of delivering anywhere real. That's the right choice for a project without a real domain or mail provider set up, but it's the first thing that would need to change before this went anywhere near production.

**CORS is handled only at the API Gateway.** Earlier in the build, each backend service had its own CORS setup as well, left over from before the gateway existed. That turned out to cause real problems — two different services disagreeing about what was allowed produced confusing browser errors that took some real debugging to trace back to the actual cause. Once we understood that CORS is something a browser enforces, and that the backend services are never talked to directly by a browser once the gateway is in place, we removed it from all four services and left it only in the gateway, where it actually belongs.

**Rate limiting was ultimately left out of the final build.** Express Gateway supports it, and it was considered, but it isn't enabled in the version this project ships with. This would be a straightforward addition if the project continued past this point.

**The gateway's allowed origin is currently set to the local development address the frontend runs on during testing.** That's a value specific to this developer's machine and setup, not something that would work as-is anywhere else — it would need to change to match wherever the frontend actually gets hosted.
