# CAKE DELIGHT — MICROSERVICES API DOCUMENTATION

---

## Base URLs

| Service              | Base URL                        | Notes                                              |
|-----------------------|----------------------------------|-----------------------------------------------------|
| Catalog Service        | `http://localhost:5001/api/v1`  | Also used directly by the storefront for category search |
| Order Service (Basket) | `http://localhost:5002/api/v1`  |                                                     |
| Rating Service          | `http://localhost:5003/api/v1`  |                                                     |
| Notification Service    | `http://localhost:5004/api/v1`  | Read-only HTTP route; writes happen via RabbitMQ    |
| API Gateway              | `http://localhost:5000/api/v1`  | Used by the storefront UI for everything except category search |

## Common Request Headers

| Header         | Required on                                   | Example                                  |
|-----------------|-------------------------------------------------|--------------------------------------------|
| `Content-Type`   | All POST / PUT / PATCH requests                 | `application/json`                        |
| `X-User-Id`      | Basket, Order, and Rating write/read endpoints  | `11111111-1111-1111-1111-111111111111`    |

---

## 1. CATALOG SERVICE (Port 5001) — Cakes

### 1.1 [GET] /api/v1/cakes
**Description:** Retrieves all available cakes. Supports optional query parameters for search, category, and price filtering.

**Headers:** None required.

**Query Parameters (optional):**
| Param       | Type   | Description                                  |
|-------------|--------|-----------------------------------------------|
| `name` / `search` | string | Search by partial name (e.g. `?search=velvet`) |
| `category`   | string | Filter by category (e.g. `?category=Chocolate`) |
| `minPrice`   | number | Minimum price threshold                       |
| `maxPrice`   | number | Maximum price threshold                       |

**Request Body:** _None_

**Example Response (200 OK):**
```json
{
  "count": 9,
  "data": [
    {
      "id": "aaaaaaaa-1111-1111-1111-111111111111",
      "name": "Black Forest Gateau",
      "description": "Cherries and dark chocolate shavings",
      "price": 29.99,
      "category": "Chocolate",
      "imageUrl": "https://example.com/black-forest.jpg",
      "isAvailable": true
    }
  ]
}
```

---

### 1.2 [GET] /api/v1/cakes/:id
**Description:** Retrieves a single cake by its ID.

**Headers:** None required.

**Request Body:** _None_

**Example Response (200 OK):**
```json
{
  "id": "aaaaaaaa-1111-1111-1111-111111111111",
  "name": "Black Forest Gateau",
  "description": "Cherries and dark chocolate shavings",
  "price": 29.99,
  "category": "Chocolate",
  "imageUrl": "https://example.com/black-forest.jpg",
  "isAvailable": true
}
```

**Error Responses:**
| Status | Reason                        |
|--------|--------------------------------|
| 400    | ID is not a valid UUID          |
| 404    | Cake not found                 |

---

### 1.3 [POST] /api/v1/cakes
**Description:** Creates a new cake.

**Headers:** `Content-Type: application/json`

**Request Body (required):**
```json
{
  "name": "Test Cake",
  "description": "A cake for testing",
  "price": 15.99,
  "category": "Test",
  "imageUrl": "https://example.com/test.jpg"
}
```
| Field         | Type    | Rules                              |
|----------------|---------|--------------------------------------|
| `name`          | string  | Required, minimum length             |
| `description`    | string  | Optional                             |
| `price`           | number  | Required, must be positive            |
| `category`         | string  | Required, minimum length             |
| `imageUrl`          | string  | Optional                             |

**Example Response (201 Created):**
```json
{
  "id": "bbbbbbbb-2222-2222-2222-222222222222",
  "name": "Test Cake",
  "description": "A cake for testing",
  "price": 15.99,
  "category": "Test",
  "imageUrl": "https://example.com/test.jpg",
  "isAvailable": true
}
```

**Error Responses:** `400` on missing/invalid fields (returns all field errors at once).

---

### 1.4 [PUT] /api/v1/cakes/:id
**Description:** Updates an existing cake. Accepts a partial or full payload — only fields in the allow-list are applied; unrecognized fields (e.g. `stock`) are silently ignored.

**Headers:** `Content-Type: application/json`

**Request Body (required, partial or full):**
```json
{
  "price": 12.99,
  "isAvailable": false
}
```

**Example Response (200 OK):**
```json
{
  "id": "bbbbbbbb-2222-2222-2222-222222222222",
  "name": "Test Cake",
  "description": "A cake for testing",
  "price": 12.99,
  "category": "Test",
  "imageUrl": "https://example.com/test.jpg",
  "isAvailable": false
}
```

**Error Responses:**
| Status | Reason                        |
|--------|--------------------------------|
| 400    | Invalid UUID in URL             |
| 404    | Cake not found                 |

---

### 1.5 [DELETE] /api/v1/cakes/:id
**Description:** Deletes a cake by ID.

**Headers:** None required.

**Request Body:** _None_

**Example Response:** `204 No Content` (empty body)

---

## 2. RATING SERVICE (Port 5003) — Cake Reviews

### 2.1 [GET] /api/v1/cakes/:cakeId/ratings
**Description:** Lists all ratings/reviews submitted for a cake.

**Headers:** None required.

**Request Body:** _None_

**Example Response (200 OK):**
```json
{
  "count": 2,
  "data": [
    {
      "id": "cccccccc-3333-3333-3333-333333333333",
      "cakeId": "aaaaaaaa-1111-1111-1111-111111111111",
      "userId": "11111111-1111-1111-1111-111111111111",
      "score": 5,
      "comment": "Amazing cake"
    }
  ]
}
```

---

### 2.2 [GET] /api/v1/cakes/:cakeId/ratings/average
**Description:** Returns the average score and total review count for a cake.

**Headers:** None required.

**Request Body:** _None_

**Example Response (200 OK):**
```json
{
  "averageScore": 3.50,
  "totalReviews": 2
}
```

---

### 2.3 [POST] /api/v1/cakes/:cakeId/ratings
**Description:** Submits a new rating for a cake as the current user. One rating per user per cake.

**Headers:** `Content-Type: application/json`, `X-User-Id` **(required)**

**Request Body (required):**
```json
{
  "score": 5,
  "comment": "Amazing cake"
}
```
| Field     | Type   | Rules                                   |
|-----------|--------|-------------------------------------------|
| `score`    | number | Required, integer 1–5                     |
| `comment`   | string | Optional                                  |

> `userId` must **not** be included in the body — it is derived from the `X-User-Id` header and rejected if sent (`400`).

**Example Response (201 Created):**
```json
{
  "id": "cccccccc-3333-3333-3333-333333333333",
  "cakeId": "aaaaaaaa-1111-1111-1111-111111111111",
  "userId": "11111111-1111-1111-1111-111111111111",
  "score": 5,
  "comment": "Amazing cake"
}
```

**Error Responses:**
| Status | Reason                                    |
|--------|---------------------------------------------|
| 400    | Missing `X-User-Id`, invalid score, or extra `userId` field in body |
| 409    | This user has already rated this cake        |

---

### 2.4 [PUT] /api/v1/cakes/:cakeId/ratings/:ratingId
**Description:** Updates the current user's own rating.

**Headers:** `Content-Type: application/json`, `X-User-Id` **(required)**

**Request Body (required):**
```json
{
  "score": 4,
  "comment": "Updated my mind — still great"
}
```
> The body must not include `cakeId` — the URL is the source of truth (`400` if present).

**Example Response (200 OK):**
```json
{
  "id": "cccccccc-3333-3333-3333-333333333333",
  "cakeId": "aaaaaaaa-1111-1111-1111-111111111111",
  "userId": "11111111-1111-1111-1111-111111111111",
  "score": 4,
  "comment": "Updated my mind — still great"
}
```

**Error Responses:**
| Status | Reason                                       |
|--------|-------------------------------------------------|
| 400    | Extra field in body (e.g. `cakeId`)              |
| 403    | Trying to update another user's rating           |
| 404    | Rating not found for this cake                  |


---

### 2.5 [DELETE] /api/v1/cakes/:cakeId/ratings/:ratingId
**Description:** Deletes the current user's own rating.

**Headers:** `X-User-Id` **(required)**

**Request Body:** _None_

**Example Response:** `204 No Content`

**Error Responses:** `403` if the rating belongs to a different user.

---

## 3. ORDER SERVICE (Port 5002) — Basket & Checkout

### 3.1 [GET] /api/v1/basket
**Description:** Returns the current user's active (uncompleted) basket.

**Headers:** `X-User-Id` **(required)**

**Request Body:** _None_

**Example Response (200 OK):**
```json
{
  "orderId": null,
  "items": [
    {
      "cakeId": "aaaaaaaa-1111-1111-1111-111111111111",
      "cakeName": "Black Forest Gateau",
      "unitPrice": 29.99,
      "quantity": 2
    }
  ],
  "totalAmount": 59.98
}
```

---

### 3.2 [POST] /api/v1/basket/items
**Description:** Adds a cake to the basket. If the cake is already in the basket, quantities merge into a single line item rather than duplicating.

**Headers:** `Content-Type: application/json`, `X-User-Id` **(required)**

**Request Body (required):**
```json
{
  "cakeId": "aaaaaaaa-1111-1111-1111-111111111111",
  "quantity": 2
}
```
| Field     | Type   | Rules                          |
|-----------|--------|-----------------------------------|
| `cakeId`   | string | Required, valid cake UUID         |
| `quantity`  | number | Required, positive integer        |

**Example Response (201 Created):**
```json
{
  "orderId": "dddddddd-4444-4444-4444-444444444444",
  "items": [
    {
      "cakeId": "aaaaaaaa-1111-1111-1111-111111111111",
      "cakeName": "Black Forest Gateau",
      "unitPrice": 29.99,
      "quantity": 2
    }
  ],
  "totalAmount": 59.98
}
```

**Error Responses:**
| Status | Reason                              |
|--------|----------------------------------------|
| 400    | Invalid/zero/negative quantity           |
| 404    | Cake does not exist                     |
| 400    | Cake exists but `isAvailable: false`     |
| 503    | Catalog Service unreachable (after retries) |


---

### 3.3 [PATCH] /api/v1/basket/items/:cakeId
**Description:** Updates the quantity of an existing basket line item.

**Headers:** `Content-Type: application/json`, `X-User-Id` **(required)**

**Request Body (required):**
```json
{
  "quantity": 5
}
```
| Field     | Type   | Rules                          |
|-----------|--------|-----------------------------------|
| `quantity`  | number | Required, positive integer (`z.number().int().positive()`) |

**Example Response (200 OK):**
```json
{
  "orderId": "dddddddd-4444-4444-4444-444444444444",
  "items": [
    {
      "cakeId": "aaaaaaaa-1111-1111-1111-111111111111",
      "cakeName": "Black Forest Gateau",
      "unitPrice": 29.99,
      "quantity": 5
    }
  ],
  "totalAmount": 149.95
}
```

**Error Responses:**
| Status | Reason                              |
|--------|----------------------------------------|
| 400    | Quantity is zero, negative, or not an integer |
| 404    | Item not in the user's basket           |

---

### 3.4 [DELETE] /api/v1/basket/items/:cakeId
**Description:** Removes a line item from the basket entirely.

**Headers:** `X-User-Id` **(required)**

**Request Body:** _None_

**Example Response (200 OK):** Returns the updated basket with the item removed and `totalAmount` recalculated.


---

### 3.5 [POST] /api/v1/orders/checkout
**Description:** Converts the current basket into a completed order. Fails if the basket is empty.

**Headers:** `Content-Type: application/json`, `X-User-Id` **(required)**

**Request Body (required):**
```json
{
  "customerEmail": "usera@test.com"
}
```
| Field           | Type   | Rules              |
|------------------|--------|----------------------|
| `customerEmail`   | string | Required, valid email |

**Example Response (201 Created):**
```json
{
  "id": "dddddddd-4444-4444-4444-444444444444",
  "status": "completed",
  "totalAmount": 149.95
}
```

**Error Responses:**
| Status | Reason                                  |
|--------|--------------------------------------------|
| 400    | Basket is empty, or missing `customerEmail` |
| 409    | Concurrent duplicate checkout (race condition guard) |

---

### 3.6 [GET] /api/v1/orders/:orderId
**Description:** Retrieves a completed order by ID, scoped to the requesting user.

**Headers:** `X-User-Id` **(required)**

**Request Body:** _None_

**Example Response (200 OK):** Full order object with its line items.

**Error Responses:** `404` if the order doesn't exist, or belongs to a different `X-User-Id`.

---

### 3.7 [GET] /api/v1/basket/completed
**Description:** Lists completed order line items across all of the current user's past orders (used to build the storefront's order history).

**Headers:** `X-User-Id` **(required)**

**Request Body:** _None_

**Example Response (200 OK):**
```json
{
  "data": [
    {
      "orderId": "dddddddd-4444-4444-4444-444444444444",
      "cakeId": "aaaaaaaa-1111-1111-1111-111111111111",
      "cakeName": "Black Forest Gateau",
      "unitPrice": 29.99,
      "quantity": 5
    }
  ]
}
```

---

## 4. NOTIFICATION SERVICE (Port 5004) — Read-Only

This service has no write endpoints of its own by design — notifications are created by consuming events from RabbitMQ, not via HTTP.

### 4.1 [GET] /api/v1/notifications/:orderId
**Description:** Retrieves notifications generated for a given order.

**Headers:** None required.

**Request Body:** _None_

**Example Response (200 OK):**
```json
[
  {
    "id": "eeeeeeee-5555-5555-5555-555555555555",
    "orderId": "dddddddd-4444-4444-4444-444444444444",
    "status": "sent",
    "channel": "email"
  }
]
```
> Returns an empty array (not a `404`) for an order with no notifications yet.

---

## Notes

- All timestamps and IDs above are illustrative examples, not live data.
- `X-User-Id` is the mechanism used for per-user scoping across Basket, Order, and Rating — there is no separate authentication/login endpoint in this system.
- The storefront's category search bar hits the Catalog Service directly on port `5001` rather than going through the API Gateway on port `5000`; every other UI action goes through the Gateway.