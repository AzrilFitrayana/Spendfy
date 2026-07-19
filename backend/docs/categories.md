### Spesifikasi API Kategori

Seluruh endpoint membutuhkan Bearer Token (JWT). Kategori hanya dimiliki oleh pengguna yang terautentikasi.

Model Data Kategori:

| Field | Tipe | Deskripsi |
|-------|------|-----------|
| id | integer | Primary key yang dibuat otomatis. |
| user_id | integer | Pemilik kategori. |
| name | string | Nama kategori (1-50 karakter). |
| type | string | "income" atau "expense". |
| icon | string \| null | Identifier ikon (maks 50 karakter). |
| color | string \| null | Kode warna hex, mis. #FF5733 (maks 7 karakter). |
| is_default | boolean | true jika ditanam saat registrasi. |
| created_at | string | Timestamp pembuatan (ISO 8601). |

## Daftar Kategori

Endpoint: GET /api/categories

Autentikasi: Bearer Token (JWT)

Header Request:

- Authorization: Bearer <token>

Request Body:

Tidak ada

Request Body (Sukses):

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

Request Body (Gagal):

```json
{ "message": "Tidak diizinkan, token tidak ada" }
```

```json
{ "message": "Terjadi kesalahan pada server" }
```

## Buat Kategori

Endpoint: POST /api/categories

Autentikasi: Bearer Token (JWT)

Header Request:

- Authorization: Bearer <token>
- Content-Type: application/json

Request Body:

```json
{
  "name": "Hobi",
  "type": "expense",
  "icon": "gamepad",
  "color": "#3B82F6"
}
```

- name: string, 1-50 karakter, wajib
- type: string, "income" atau "expense", wajib
- icon: string, maks 50 karakter, opsional
- color: string, hex #RRGGBB (maks 7 karakter), opsional

Request Body (Sukses):

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

Request Body (Gagal):

```json
{ "message": "Kategori dengan nama ini sudah ada" }
```

```json
{ "message": "Nama kategori wajib diisi" }
```

```json
{ "message": "Terjadi kesalahan pada server" }
```

## Perbarui Kategori

Endpoint: PUT /api/categories/:id

Autentikasi: Bearer Token (JWT)

Path Parameter:

- id: integer, id kategori, wajib

Header Request:

- Authorization: Bearer <token>
- Content-Type: application/json

Request Body:

```json
{
  "name": "Hobi & Game",
  "color": "#A855F7"
}
```

- name: string, 1-50 karakter, opsional
- icon: string, maks 50 karakter, opsional
- color: string, hex #RRGGBB, opsional

Request Body (Sukses):

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

Request Body (Gagal):

```json
{ "message": "Nama kategori maksimal 50 karakter" }
```

```json
{ "message": "Kategori tidak ditemukan" }
```

```json
{ "message": "Terjadi kesalahan pada server" }
```

## Hapus Kategori

Endpoint: DELETE /api/categories/:id

Autentikasi: Bearer Token (JWT)

Path Parameter:

- id: integer, id kategori, wajib

Header Request:

- Authorization: Bearer <token>

Request Body:

Tidak ada

Request Body (Sukses):

```json
{ "message": "Kategori berhasil dihapus" }
```

Request Body (Gagal):

```json
{ "message": "Kategori tidak ditemukan" }
```

```json
{ "message": "Terjadi kesalahan pada server" }
```

### Catatan

- Kategori dibatasi pada pengguna yang terautentikasi.
- Constraint unik (user_id, name, type) mencegah nama duplikat dengan tipe yang sama.
- type tidak dapat diperbarui; is_default selalu false untuk kategori kustom.
- Kategori yang dihapus tidak dapat dipulihkan; transaksi terkait menjadi tidak berkategori (category_id diatur ke null).
