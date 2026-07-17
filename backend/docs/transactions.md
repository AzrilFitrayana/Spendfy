### Transactions API SPEC

All endpoints require Bearer Token (JWT) and are scoped to the authenticated user.

Transaction Data Model :

| Field | Type | Description |
|-------|------|-------------|
| id | integer | Auto-generated primary key. |
| user_id | integer | Owner of the transaction. |
| category_id | integer \| null | Referenced category; null if uncategorized. |
| amount | number | Positive amount (> 0). |
| type | string | "income" or "expense". |
| description | string \| null | Optional (max 255 characters). |
| notes | string \| null | Optional free text. |
| transaction_date | string | Date in YYYY-MM-DD format. |
| created_at | string | Creation timestamp (ISO 8601). |
| category_name | string | Joined category name. |
| category_icon | string | Joined category icon. |
| category_color | string | Joined category color. |

## List Transactions

Endpoint : GET /api/transactions

Authentication : Bearer Token (JWT)

Request Header :

- Authorization : Bearer <token>

Query Parameter :

- startDate : string, lower bound transaction_date (YYYY-MM-DD), optional
- endDate : string, upper bound transaction_date (YYYY-MM-DD), optional
- categoryId : integer, filter by category id, optional
- type : string, "income" or "expense", optional
- search : string, case-insensitive search on description and notes, optional
- limit : integer, default 50
- offset : integer, default 0

Request Body :

None

Request Body (Success) :

```json
[
  {
    "id": 101,
    "user_id": 1,
    "category_id": 12,
    "amount": 45000,
    "type": "expense",
    "description": "Lunch",
    "notes": null,
    "transaction_date": "2026-07-15",
    "created_at": "2026-07-15T10:00:00.000Z",
    "category_name": "Makan & Minum",
    "category_icon": "utensils",
    "category_color": "#F59E0B"
  }
]
```

Request Body (Failed) :

```json
{ "error": "Failed to fetch transactions" }
```

## Create Transaction

Endpoint : POST /api/transactions

Authentication : Bearer Token (JWT)

Request Header :

- Authorization : Bearer <token>
- Content-Type : application/json

Request Body :

```json
{
  "categoryId": 12,
  "amount": 45000,
  "type": "expense",
  "description": "Lunch",
  "notes": "With team",
  "transactionDate": "2026-07-15"
}
```

- categoryId : integer, optional, null for uncategorized
- amount : number, positive (> 0), required
- type : string, "income" or "expense", required
- description : string, max 255, optional
- notes : string, optional
- transactionDate : string, YYYY-MM-DD, required

Request Body (Success) :

```json
{
  "id": 101,
  "user_id": 1,
  "category_id": 12,
  "amount": 45000,
  "type": "expense",
  "description": "Lunch",
  "notes": "With team",
  "transaction_date": "2026-07-15",
  "created_at": "2026-07-15T10:00:00.000Z"
}
```

Request Body (Failed) :

```json
{ "message": "Amount must be a positive number" }
```

```json
{ "message": "Transaction date must be in YYYY-MM-DD format" }
```

```json
{ "error": "Failed to create transaction" }
```

## Get Transaction by ID

Endpoint : GET /api/transactions/:id

Authentication : Bearer Token (JWT)

Path Parameter :

- id : integer, transaction id, required

Request Header :

- Authorization : Bearer <token>

Request Body :

None

Request Body (Success) :

```json
{
  "id": 101,
  "user_id": 1,
  "category_id": 12,
  "amount": 45000,
  "type": "expense",
  "description": "Lunch",
  "notes": "With team",
  "transaction_date": "2026-07-15",
  "created_at": "2026-07-15T10:00:00.000Z",
  "category_name": "Makan & Minum",
  "category_icon": "utensils",
  "category_color": "#F59E0B"
}
```

Request Body (Failed) :

```json
{ "error": "Transaction not found" }
```

```json
{ "error": "Failed to fetch transaction" }
```

## Update Transaction

Endpoint : PUT /api/transactions/:id

Authentication : Bearer Token (JWT)

Path Parameter :

- id : integer, transaction id, required

Request Header :

- Authorization : Bearer <token>
- Content-Type : application/json

Request Body :

```json
{
  "amount": 50000,
  "description": "Dinner"
}
```

- categoryId : integer, optional
- amount : number, positive (> 0), optional
- type : string, "income" or "expense", optional
- description : string, max 255, optional
- notes : string, optional
- transactionDate : string, YYYY-MM-DD, optional

Request Body (Success) :

```json
{
  "id": 101,
  "user_id": 1,
  "category_id": 12,
  "amount": 50000,
  "type": "expense",
  "description": "Dinner",
  "notes": "With team",
  "transaction_date": "2026-07-15",
  "created_at": "2026-07-15T10:00:00.000Z"
}
```

Request Body (Failed) :

```json
{ "error": "No fields provided to update" }
```

```json
{ "error": "Transaction not found" }
```

```json
{ "error": "Failed to update transaction" }
```

## Delete Transaction

Endpoint : DELETE /api/transactions/:id

Authentication : Bearer Token (JWT)

Path Parameter :

- id : integer, transaction id, required

Request Header :

- Authorization : Bearer <token>

Request Body :

None

Request Body (Success) :

```json
{ "message": "Transaction deleted" }
```

Request Body (Failed) :

```json
{ "message": "Transaction not found" }
```

```json
{ "message": "Server error" }
```

## Analyze Transactions (AI)

Endpoint : POST /api/transactions/analyze

Authentication : Bearer Token (JWT)

Request Header :

- Authorization : Bearer <token>
- Content-Type : application/json

Request Body :

```json
{
  "transactionIds": [101, 102, 103]
}
```

- transactionIds : array of integer, non-empty, required, capped at 50

Request Body (Success) :

```json
{
  "insight": "Your recent transactions show consistent daily spending on food and transport. Total outflow is 145,000 IDR against 0 income in this selection.",
  "highlight": "Stable daily spending"
}
```

Request Body (Failed) :

```json
{ "message": "transactionIds array is required" }
```

```json
{ "message": "No transactions found for analysis" }
```

```json
{ "error": "Failed to analyze transactions" }
```

### Notes

- Results ordered by transaction_date DESC, id DESC.
- Partial updates supported; empty body returns "No fields provided to update".
- AI content is non-deterministic; only first 5 transactions sent to the model.
- The transaction category is not validated against the transaction type.
