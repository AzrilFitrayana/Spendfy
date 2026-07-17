### Categories API SPEC

All endpoints require Bearer Token (JWT). Categories belong only to the authenticated user.

Category Data Model :

| Field | Type | Description |
|-------|------|-------------|
| id | integer | Auto-generated primary key. |
| user_id | integer | Owner of the category. |
| name | string | Category name (1-50 characters). |
| type | string | "income" or "expense". |
| icon | string \| null | Icon identifier (max 50 characters). |
| color | string \| null | Hex color code, e.g. #FF5733 (max 7 characters). |
| is_default | boolean | true if seeded at registration. |
| created_at | string | Creation timestamp (ISO 8601). |

## List Categories

Endpoint : GET /api/categories

Authentication : Bearer Token (JWT)

Request Header :

- Authorization : Bearer <token>

Request Body :

None

Request Body (Success) :

```json
[
  {
    "id": 1,
    "user_id": 1,
    "name": "Gaji",
    "type": "income",
    "icon": "briefcase",
    "color": "#10B981",
    "is_default": true,
    "created_at": "2026-07-16T03:56:01.000Z"
  }
]
```

Request Body (Failed) :

```json
{ "message": "Not authorized, no token" }
```

```json
{ "message": "Server error" }
```

## Create Category

Endpoint : POST /api/categories

Authentication : Bearer Token (JWT)

Request Header :

- Authorization : Bearer <token>
- Content-Type : application/json

Request Body :

```json
{
  "name": "Hobi",
  "type": "expense",
  "icon": "gamepad",
  "color": "#3B82F6"
}
```

- name : string, 1-50 characters, required
- type : string, "income" or "expense", required
- icon : string, max 50 characters, optional
- color : string, hex #RRGGBB (max 7 characters), optional

Request Body (Success) :

```json
{
  "id": 25,
  "user_id": 1,
  "name": "Hobi",
  "type": "expense",
  "icon": "gamepad",
  "color": "#3B82F6",
  "is_default": false,
  "created_at": "2026-07-16T03:56:01.000Z"
}
```

Request Body (Failed) :

```json
{ "message": "Category with this name already exists" }
```

```json
{ "message": "Category name is required" }
```

```json
{ "message": "Server error" }
```

## Update Category

Endpoint : PUT /api/categories/:id

Authentication : Bearer Token (JWT)

Path Parameter :

- id : integer, category id, required

Request Header :

- Authorization : Bearer <token>
- Content-Type : application/json

Request Body :

```json
{
  "name": "Hobi & Game",
  "color": "#A855F7"
}
```

- name : string, 1-50 characters, optional
- icon : string, max 50 characters, optional
- color : string, hex #RRGGBB, optional

Request Body (Success) :

```json
{
  "id": 25,
  "user_id": 1,
  "name": "Hobi & Game",
  "type": "expense",
  "icon": "gamepad",
  "color": "#A855F7",
  "is_default": false,
  "created_at": "2026-07-16T03:56:01.000Z"
}
```

Request Body (Failed) :

```json
{ "message": "Category name must be at most 50 characters" }
```

```json
{ "message": "Category not found" }
```

```json
{ "message": "Server error" }
```

## Delete Category

Endpoint : DELETE /api/categories/:id

Authentication : Bearer Token (JWT)

Path Parameter :

- id : integer, category id, required

Request Header :

- Authorization : Bearer <token>

Request Body :

None

Request Body (Success) :

```json
{ "message": "Category deleted" }
```

Request Body (Failed) :

```json
{ "message": "Category not found" }
```

```json
{ "message": "Server error" }
```

### Notes

- Categories are scoped to the authenticated user.
- A (user_id, name, type) unique constraint prevents duplicate names of the same type.
- type cannot be updated; is_default is always false for custom categories.
- Deleted categories cannot be restored; referenced transactions become uncategorized (category_id set to null).
