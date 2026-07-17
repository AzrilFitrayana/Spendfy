### Reports API SPEC

> Note: The backend has no dedicated /api/reports module. Reporting is provided by the Dashboard endpoints under /api/dashboard (summary, category breakdown, monthly trend). See dashboard.md.

## Monthly Summary Report

Endpoint : GET /api/dashboard/summary

Authentication : Bearer Token (JWT)

Request Header :

- Authorization : Bearer <token>

Request Body :

None

Request Body (Success) :

```json
{
  "incomeThisMonth": 12000000,
  "expenseThisMonth": 4500000,
  "balance": 7500000,
  "savingsRate": 62.5,
  "incomeDelta": 9.09,
  "expenseDelta": -12.5
}
```

Request Body (Failed) :

```json
{ "message": "Internal server error" }
```

## Category Breakdown Report

Endpoint : GET /api/dashboard/category-breakdown

Authentication : Bearer Token (JWT)

Request Header :

- Authorization : Bearer <token>

Request Body :

None

Request Body (Success) :

```json
[
  {
    "category_id": 12,
    "category_name": "Makan & Minum",
    "category_icon": "utensils",
    "category_color": "#F59E0B",
    "total": 1850000,
    "transaction_count": 23
  }
]
```

Request Body (Failed) :

```json
{ "message": "Internal server error" }
```

## Monthly Trend Report

Endpoint : GET /api/dashboard/monthly-trend

Authentication : Bearer Token (JWT)

Request Header :

- Authorization : Bearer <token>

Request Body :

None

Request Body (Success) :

```json
[
  {
    "month": "2026-07",
    "income": 12000000,
    "expense": 4500000
  }
]
```

Request Body (Failed) :

```json
{ "message": "Internal server error" }
```
