### Spesifikasi API Auth

## Daftar

Endpoint: POST /api/auth/register

Autentikasi: Publik

Header Request:

- Content-Type: application/json

Request Body:

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "currency": "USD"
}
```

- name: string, 1-100 karakter, wajib
- email: string, email valid, maks 255, harus unik, wajib
- password: string, minimal 6 karakter, maks 255, wajib
- currency: string, tepat 3 karakter (mis. IDR, USD), opsional, default "IDR"

Request Body (Sukses):

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

Request Body (Gagal):

```json
{ "message": "Email sudah digunakan" }
```

```json
{ "message": "Terjadi kesalahan pada server" }
```

## Login

Endpoint: POST /api/auth/login

Autentikasi: Publik

Header Request:

- Content-Type: application/json

Request Body:

```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

- email: string, email valid, wajib
- password: string, wajib

Request Body (Sukses):

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

Request Body (Gagal):

```json
{ "message": "Kredensial tidak valid" }
```

```json
{ "message": "Terjadi kesalahan pada server" }
```

## Ambil Pengguna Saat Ini

Endpoint: GET /api/auth/user

Autentikasi: Bearer Token (JWT)

Header Request:

- Authorization: Bearer <token>

Request Body:

Tidak ada

Request Body (Sukses):

```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com",
  "currency": "IDR",
  "created_at": "2026-07-16T03:56:01.000Z"
}
```

Request Body (Gagal):

```json
{ "message": "Tidak diizinkan, token tidak ada" }
```

```json
{ "message": "Tidak diizinkan, token gagal" }
```

```json
{ "message": "Pengguna tidak ditemukan" }
```

```json
{ "message": "Terjadi kesalahan pada server" }
```

### Catatan

- Email harus unik.
- Password di-hash dengan bcrypt; hash tidak pernah dikembalikan.
- JWT kedaluwarsa dalam 7 hari.
- Registrasi menanam kategori default untuk pengguna.
- Email tidak valid dan password salah keduanya mengembalikan pesan "Kredensial tidak valid" yang sama.
