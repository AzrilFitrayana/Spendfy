### Spesifikasi API Dashboard

Seluruh endpoint membutuhkan Bearer Token (JWT) dan dibatasi pada pengguna yang terautentikasi. Agregasi hanya-baca dari transaksi.

## Ambil Ringkasan

Endpoint: GET /api/dashboard/summary

Autentikasi: Bearer Token (JWT)

Header Request:

- Authorization: Bearer <token>

Request Body:

Tidak ada

Request Body (Sukses):

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

Request Body (Gagal):

```json
{ "message": "Terjadi kesalahan pada server" }
```

## Ambil Rincian Kategori

Endpoint: GET /api/dashboard/category-breakdown

Autentikasi: Bearer Token (JWT)

Header Request:

- Authorization: Bearer <token>

Request Body:

Tidak ada

Request Body (Sukses):

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

Request Body (Gagal):

```json
{ "message": "Terjadi kesalahan pada server" }
```

## Ambil Tren Bulanan

Endpoint: GET /api/dashboard/monthly-trend

Autentikasi: Bearer Token (JWT)

Header Request:

- Authorization: Bearer <token>

Request Body:

Tidak ada

Request Body (Sukses):

```json
[
  {
    "month": "2026-07",
    "income": 12000000,
    "expense": 4500000
  }
]
```

Request Body (Gagal):

```json
{ "message": "Terjadi kesalahan pada server" }
```

### Catatan
- netRemaining = incomeThisMonth - expenseThisMonth.

- savingsRate = (netRemaining / incomeThisMonth) * 100, atau 0 saat pemasukan 0.
- Rincian kategori hanya mengagregasi transaksi pengeluaran sejak awal bulan berjalan, diurutkan berdasarkan total DESC.
- Tren bulanan mencakup bulan berjalan plus 5 bulan sebelumnya; bulan tanpa data mungkin tidak ditampilkan.

## Laporan

> Catatan: Backend tidak memiliki modul /api/reports khusus. Pelaporan disediakan oleh endpoint Dashboard di atas (ringkasan, rincian kategori, tren bulanan). Berikut ringkasan laporan yang tersedia:

### Laporan Ringkasan Bulanan

Endpoint: GET /api/dashboard/summary

Autentikasi: Bearer Token (JWT)

Header Request:

- Authorization: Bearer <token>

Request Body:

Tidak ada

Request Body (Sukses):

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

Request Body (Gagal):

```json
{ "message": "Terjadi kesalahan pada server" }
```

### Laporan Rincian Kategori

Endpoint: GET /api/dashboard/category-breakdown

Autentikasi: Bearer Token (JWT)

Header Request:

- Authorization: Bearer <token>

Request Body:

Tidak ada

Request Body (Sukses):

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

Request Body (Gagal):

```json
{ "message": "Terjadi kesalahan pada server" }
```

### Laporan Tren Bulanan

Endpoint: GET /api/dashboard/monthly-trend

Autentikasi: Bearer Token (JWT)

Header Request:

- Authorization: Bearer <token>

Request Body:

Tidak ada

Request Body (Sukses):

```json
[
  {
    "month": "2026-07",
    "income": 12000000,
    "expense": 4500000
  }
]
```

Request Body (Gagal):

```json
{ "message": "Terjadi kesalahan pada server" }
```
