### Users API SPEC

## Get Current User

Endpoint : GET /api/auth/user

Authentication : Bearer Token (JWT)

Request Header :

- Authorization : Bearer <token>

Request Body :

None

Request Body (Success) :

```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com",
  "currency": "IDR",
  "created_at": "2026-07-16T03:56:01.000Z"
}
```

Request Body (Failed) :

```json
{ "message": "Not authorized, no token" }
```

```json
{ "message": "Not authorized, token failed" }
```

```json
{ "message": "User not found" }
```

```json
{ "message": "Internal server error" }
```

### User Data Model

| Field | Type | Description |
|-------|------|-------------|
| id | integer | Auto-generated primary key. |
| name | string | User display name (max 100 characters). |
| email | string | Unique email (max 255 characters). |
| password | string | bcrypt hash. Never returned. |
| currency | string | ISO currency code, 3 characters. Default "IDR". |
| created_at | string | Account creation timestamp (ISO 8601). |

### Notes

- Account creation is via POST /api/auth/register (see auth.md).
- The user is identified from the JWT userId claim.
- Email is unique; changing email or password is not supported by the API.
