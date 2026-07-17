### Budgets API SPEC

All endpoints require Bearer Token (JWT) and are scoped to the authenticated user.

Budget Data Model :

| Field | Type | Description |
|-------|------|-------------|
| id | integer | Auto-generated primary key. |
| user_id | integer | Owner of the budget. |
| category_id | integer | Category the budget applies to. |
| amount | number | Budget limit (> 0). |
| period | string | "monthly" (default) or "weekly". |
| start_date | string | Period start date (YYYY-MM-DD). |
| created_at | string | Creation timestamp (ISO 8601). |
| category_name | string | Joined category name. |
| category_icon | string | Joined category icon. |
| category_color | string | Joined category color. |
| spent | number | Aggregated expense for current period window. |

## List Budgets

Endpoint : GET /api/budgets

Authentication : Bearer Token (JWT)

Request Header :

- Authorization : Bearer <token>

Request Body :

None

Request Body (Success) :

```json
[
  {
    "id": 5,
    "category_id": 12,
    "amount": 2000000,
    "period": "monthly",
    "start_date": "2026-07-01",
    "category_name": "Makan & Minum",
    "category_icon": "utensils",
    "category_color": "#F59E0B",
    "spent": 850000
  }
]
```

Request Body (Failed) :

```json
{ "message": "Server error" }
```

## Create Budget

Endpoint : POST /api/budgets

Authentication : Bearer Token (JWT)

Request Header :

- Authorization : Bearer <token>
- Content-Type : application/json

Request Body :

```json
{
  "categoryId": 12,
  "amount": 2000000,
  "period": "monthly"
}
```

- categoryId : integer, required
- amount : number, positive (> 0), required
- period : string, "monthly" (default) or "weekly", optional
- startDate : string, YYYY-MM-DD, optional (defaults to 1st of current month)

Request Body (Success) :

```json
{
  "id": 5,
  "category_id": 12,
  "amount": 2000000,
  "period": "monthly",
  "start_date": "2026-07-01"
}
```

Request Body (Failed) :

```json
{ "message": "Budget already exists" }
```

```json
{ "message": "Amount must be a positive number" }
```

```json
{ "message": "Server error" }
```

## Update Budget

Endpoint : PUT /api/budgets/:id

Authentication : Bearer Token (JWT)

Path Parameter :

- id : integer, budget id, required

Request Header :

- Authorization : Bearer <token>
- Content-Type : application/json

Request Body :

```json
{
  "amount": 2500000
}
```

- amount : number, positive (> 0), optional
- period : string, "monthly" or "weekly", optional

Request Body (Success) :

```json
{
  "id": 5,
  "user_id": 1,
  "category_id": 12,
  "amount": 2500000,
  "period": "monthly",
  "start_date": "2026-07-01",
  "created_at": "2026-07-16T03:56:01.000Z"
}
```

Request Body (Failed) :

```json
{ "message": "Amount must be a positive number" }
```

```json
{ "message": "Budget not found" }
```

```json
{ "message": "Server error" }
```

## Delete Budget

Endpoint : DELETE /api/budgets/:id

Authentication : Bearer Token (JWT)

Path Parameter :

- id : integer, budget id, required

Request Header :

- Authorization : Bearer <token>

Request Body :

None

Request Body (Success) :

```json
{ "message": "Budget deleted successfully" }
```

Request Body (Failed) :

```json
{ "message": "Budget not found" }
```

```json
{ "message": "Server error" }
```

## Analyze Budgets (AI)

Endpoint : GET /api/budgets/analyze

Authentication : Bearer Token (JWT)

Request Header :

- Authorization : Bearer <token>

Request Body :

None

Request Body (Success) :

```json
{
  "analyses": [
    {
      "budgetId": 5,
      "status": "caution",
      "message": "You've used about 42% of your Makan & Minum budget with half the month left."
    }
  ]
}
```

Request Body (Failed) :

```json
{ "message": "Server error" }
```

### Notes

- One budget per (user_id, category_id, period).
- spent aggregates only expense transactions in the current period window.
- budget_alert status: "good" (under target), "caution" (>=70%), "concerning" (over 100%).
- Returns empty analyses array (no error) when user has no budgets.
