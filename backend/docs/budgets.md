### Spesifikasi API Anggaran

Seluruh endpoint membutuhkan Bearer Token (JWT) dan dibatasi pada pengguna yang terautentikasi.

Model Data Anggaran:

| Field | Tipe | Deskripsi |
|-------|------|-----------|
| id | integer | Primary key yang dibuat otomatis. |
| user_id | integer | Pemilik anggaran. |
| category_id | integer | Kategori yang diterapkan anggaran. |
| amount | number | Batas anggaran (> 0). |
| period | string | "monthly" (default) atau "weekly". |
| start_date | string | Tanggal awal periode (YYYY-MM-DD). |
| created_at | string | Timestamp pembuatan (ISO 8601). |
| category_name | string | Nama kategori yang digabung. |
| category_icon | string | Ikon kategori yang digabung. |
| category_color | string | Warna kategori yang digabung. |
| spent | number | Agregat pengeluaran untuk jendela periode saat ini. |

## Daftar Anggaran

Endpoint: GET /api/budgets

Autentikasi: Bearer Token (JWT)

Header Request:

- Authorization: Bearer <token>

Request Body:

Tidak ada

Request Body (Sukses):

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

Request Body (Gagal):

```json
{ "message": "Terjadi kesalahan pada server" }
```

## Buat Anggaran

Endpoint: POST /api/budgets

Autentikasi: Bearer Token (JWT)

Header Request:

- Authorization: Bearer <token>
- Content-Type: application/json

Request Body:

```json
{
  "categoryId": 12,
  "amount": 2000000,
  "period": "monthly"
}
```

- categoryId: integer, wajib
- amount: number, positif (> 0), wajib
- period: string, "monthly" (default) atau "weekly", opsional
- startDate: string, YYYY-MM-DD, opsional (default tanggal 1 bulan berjalan)

Request Body (Sukses):

```json
{
  "id": 5,
  "category_id": 12,
  "amount": 2000000,
  "period": "monthly",
  "start_date": "2026-07-01"
}
```

Request Body (Gagal):

```json
{ "message": "Anggaran sudah ada" }
```

```json
{ "message": "Jumlah harus angka positif" }
```

```json
{ "message": "Terjadi kesalahan pada server" }
```

## Perbarui Anggaran

Endpoint: PUT /api/budgets/:id

Autentikasi: Bearer Token (JWT)

Path Parameter:

- id: integer, id anggaran, wajib

Header Request:

- Authorization: Bearer <token>
- Content-Type: application/json

Request Body:

```json
{
  "amount": 2500000
}
```

- amount: number, positif (> 0), opsional
- period: string, "monthly" atau "weekly", opsional

Request Body (Sukses):

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

Request Body (Gagal):

```json
{ "message": "Jumlah harus angka positif" }
```

```json
{ "message": "Anggaran tidak ditemukan" }
```

```json
{ "message": "Terjadi kesalahan pada server" }
```

## Hapus Anggaran

Endpoint: DELETE /api/budgets/:id

Autentikasi: Bearer Token (JWT)

Path Parameter:

- id: integer, id anggaran, wajib

Header Request:

- Authorization: Bearer <token>

Request Body:

Tidak ada

Request Body (Sukses):

```json
{ "message": "Anggaran berhasil dihapus" }
```

Request Body (Gagal):

```json
{ "message": "Anggaran tidak ditemukan" }
```

```json
{ "message": "Terjadi kesalahan pada server" }
```

## Analisis Anggaran (AI)

Endpoint: GET /api/budgets/analyze

Autentikasi: Bearer Token (JWT)

Header Request:

- Authorization: Bearer <token>

Request Body:

Tidak ada

Request Body (Sukses):

```json
{
  "analyses": [
    {
      "budgetId": 5,
      "status": "caution",
      "message": "Anda telah menggunakan sekitar 42% anggaran Makan & Minum Anda dengan sisa separuh bulan."
    }
  ]
}
```

Request Body (Gagal):

```json
{ "message": "Terjadi kesalahan pada server" }
```

### Catatan

- Satu anggaran per (user_id, category_id, period).
- spent hanya mengagregasi transaksi pengeluaran dalam jendela periode saat ini.
- status budget_alert: "good" (di bawah target), "caution" (>=70%), "concerning" (lebih dari 100%).
- Mengembalikan array analyses kosong (bukan error) saat pengguna tidak memiliki anggaran.
