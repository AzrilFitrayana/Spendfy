### Spesifikasi API Pengguna

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

### Model Data Pengguna

| Field | Tipe | Deskripsi |
|-------|------|-----------|
| id | integer | Primary key yang dibuat otomatis. |
| name | string | Nama tampilan pengguna (maks 100 karakter). |
| email | string | Email unik (maks 255 karakter). |
| password | string | Hash bcrypt. Tidak pernah dikembalikan. |
| currency | string | Kode mata uang ISO, 3 karakter. Default "IDR". |
| created_at | string | Timestamp pembuatan akun (ISO 8601). |

### Catatan

- Pembuatan akun melalui POST /api/auth/register (lihat auth.md).
- Pengguna diidentifikasi dari klaim userId pada JWT.
- Email bersifat unik; mengubah email atau password tidak didukung oleh API.
