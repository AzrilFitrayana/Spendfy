### Dashboard API SPEC

All endpoints require Bearer Token (JWT) and are scoped to the authenticated user. Read-only aggregations over transactions.

## Get Summary

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
  "netRemaining": 7500000,
  "savingsRate": 62.5,
  "incomeDelta": 9.09,
  "expenseDelta": -12.5
}
```

Request Body (Failed) :

```json
{ "message": "Internal server error" }
```

## Get Category Breakdown

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

## Get Monthly Trend

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

### Notes
- netRemaining = incomeThisMonth - expenseThisMonth.

- savingsRate = (netRemaining / incomeThisMonth) * 100, or 0 when income is 0.
- Category breakdown aggregates only expense transactions since start of current month, ordered by total DESC.
- Monthly trend covers current month plus previous 5 months; months with no data may be omitted.
