### Auth API SPEC

## Register

Endpoint : POST /api/auth/register

Authentication : Public

Request Header :

- Content-Type : application/json

Request Body :

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "currency": "USD"
}
```

- name : string, 1-100 characters, required
- email : string, valid email, max 255, must be unique, required
- password : string, min 6 characters, max 255, required
- currency : string, exactly 3 characters (e.g. IDR, USD), optional, default "IDR"

Request Body (Success) :

```json
{
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "currency": "USD",
    "created_at": "2026-07-16T03:56:01.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

Request Body (Failed) :

```json
{ "message": "Email already registered" }
```

```json
{ "message": "Internal server error" }
```

## Login

Endpoint : POST /api/auth/login

Authentication : Public

Request Header :

- Content-Type : application/json

Request Body :

```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

- email : string, valid email, required
- password : string, required

Request Body (Success) :

```json
{
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "currency": "IDR"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

Request Body (Failed) :

```json
{ "message": "Invalid credentials" }
```

```json
{ "message": "Internal server error" }
```

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

### Notes

- Email must be unique.
- Passwords are hashed with bcrypt; the hash is never returned.
- JWT expires in 7 days.
- Registration seeds default categories for the user.
- Invalid email and wrong password both return the same "Invalid credentials" message.
