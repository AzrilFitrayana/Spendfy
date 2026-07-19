### Spesifikasi API Transaksi

Seluruh endpoint membutuhkan Bearer Token (JWT) dan dibatasi pada pengguna yang terautentikasi.

Model Data Transaksi:

| Field | Tipe | Deskripsi |
|-------|------|-----------|
| id | integer | Primary key yang dibuat otomatis. |
| user_id | integer | Pemilik transaksi. |
| category_id | integer \| null | Kategori yang dirujuk; null jika tidak berkategori. |
| amount | number | Jumlah positif (> 0). |
| type | string | "income" atau "expense". |
| description | string \| null | Opsional (maks 255 karakter). |
| notes | string \| null | Teks bebas opsional. |
| transaction_date | string | Tanggal dalam format YYYY-MM-DD. |
| created_at | string | Timestamp pembuatan (ISO 8601). |
| category_name | string | Nama kategori yang digabung. |
| category_icon | string | Ikon kategori yang digabung. |
| category_color | string | Warna kategori yang digabung. |

## Daftar Transaksi

Endpoint: GET /api/transactions

Autentikasi: Bearer Token (JWT)

Header Request:

- Authorization: Bearer <token>

Query Parameter:

- startDate: string, batas bawah transaction_date (YYYY-MM-DD), opsional
- endDate: string, batas atas transaction_date (YYYY-MM-DD), opsional
- categoryId: integer, filter berdasarkan id kategori, opsional
- type: string, "income" atau "expense", opsional
- search: string, pencarian tidak peka huruf besar/kecil pada description dan notes, opsional
- limit: integer, default 50
- offset: integer, default 0

Request Body:

Tidak ada

Request Body (Sukses):

```json
[
  {
    "id": 101,
    "user_id": 1,
    "category_id": 12,
    "amount": 45000,
    "type": "expense",
    "description": "Makan siang",
    "notes": null,
    "transaction_date": "2026-07-15",
    "created_at": "2026-07-15T10:00:00.000Z",
    "category_name": "Makan & Minum",
    "category_icon": "utensils",
    "category_color": "#F59E0B"
  }
]
```

Request Body (Gagal):

```json
{ "error": "Gagal mengambil transaksi" }
```

## Buat Transaksi

Endpoint: POST /api/transactions

Autentikasi: Bearer Token (JWT)

Header Request:

- Authorization: Bearer <token>
- Content-Type: application/json

Request Body:

```json
{
  "categoryId": 12,
  "amount": 45000,
  "type": "expense",
  "description": "Makan siang",
  "notes": "Bersama tim",
  "transactionDate": "2026-07-15"
}
```

- categoryId: integer, opsional, null untuk tidak berkategori
- amount: number, positif (> 0), wajib
- type: string, "income" atau "expense", wajib
- description: string, maks 255, opsional
- notes: string, opsional
- transactionDate: string, YYYY-MM-DD, wajib

Request Body (Sukses):

```json
{
  "id": 101,
  "user_id": 1,
  "category_id": 12,
  "amount": 45000,
  "type": "expense",
  "description": "Makan siang",
  "notes": "Bersama tim",
  "transaction_date": "2026-07-15",
  "created_at": "2026-07-15T10:00:00.000Z"
}
```

Request Body (Gagal):

```json
{ "message": "Jumlah harus angka positif" }
```

```json
{ "message": "Tanggal transaksi harus dalam format YYYY-MM-DD" }
```

```json
{ "error": "Gagal membuat transaksi" }
```

## Ambil Transaksi berdasarkan ID

Endpoint: GET /api/transactions/:id

Autentikasi: Bearer Token (JWT)

Path Parameter:

- id: integer, id transaksi, wajib

Header Request:

- Authorization: Bearer <token>

Request Body:

Tidak ada

Request Body (Sukses):

```json
{
  "id": 101,
  "user_id": 1,
  "category_id": 12,
  "amount": 45000,
  "type": "expense",
  "description": "Makan siang",
  "notes": "Bersama tim",
  "transaction_date": "2026-07-15",
  "created_at": "2026-07-15T10:00:00.000Z",
  "category_name": "Makan & Minum",
  "category_icon": "utensils",
  "category_color": "#F59E0B"
}
```

Request Body (Gagal):

```json
{ "error": "Transaksi tidak ditemukan" }
```

```json
{ "error": "Gagal mengambil transaksi" }
```

## Perbarui Transaksi

Endpoint: PUT /api/transactions/:id

Autentikasi: Bearer Token (JWT)

Path Parameter:

- id: integer, id transaksi, wajib

Header Request:

- Authorization: Bearer <token>
- Content-Type: application/json

Request Body:

```json
{
  "amount": 50000,
  "description": "Makan malam"
}
```

- categoryId: integer, opsional
- amount: number, positif (> 0), opsional
- type: string, "income" atau "expense", opsional
- description: string, maks 255, opsional
- notes: string, opsional
- transactionDate: string, YYYY-MM-DD, opsional

Request Body (Sukses):

```json
{
  "id": 101,
  "user_id": 1,
  "category_id": 12,
  "amount": 50000,
  "type": "expense",
  "description": "Makan malam",
  "notes": "Bersama tim",
  "transaction_date": "2026-07-15",
  "created_at": "2026-07-15T10:00:00.000Z"
}
```

Request Body (Gagal):

```json
{ "error": "Tidak ada field yang diberikan untuk diperbarui" }
```

```json
{ "error": "Transaksi tidak ditemukan" }
```

```json
{ "error": "Gagal memperbarui transaksi" }
```

## Hapus Transaksi

Endpoint: DELETE /api/transactions/:id

Autentikasi: Bearer Token (JWT)

Path Parameter:

- id: integer, id transaksi, wajib

Header Request:

- Authorization: Bearer <token>

Request Body:

Tidak ada

Request Body (Sukses):

```json
{ "message": "Transaksi berhasil dihapus" }
```

Request Body (Gagal):

```json
{ "message": "Transaksi tidak ditemukan" }
```

```json
{ "message": "Terjadi kesalahan pada server" }
```

## Analisis Transaksi (AI)

Endpoint: POST /api/transactions/analyze

Autentikasi: Bearer Token (JWT)

Header Request:

- Authorization: Bearer <token>
- Content-Type: application/json

Request Body:

```json
{
  "transactionIds": [101, 102, 103]
}
```

- transactionIds: array of integer, tidak kosong, wajib, maksimal 50

Request Body (Sukses):

```json
{
  "insight": "Transaksi terbaru Anda menunjukkan pengeluaran harian yang konsisten untuk makanan dan transportasi. Total arus keluar adalah 145.000 IDR dengan 0 pemasukan dalam pilihan ini.",
  "highlight": "Pengeluaran harian stabil"
}
```

Request Body (Gagal):

```json
{ "message": "Array transactionIds wajib diisi" }
```

```json
{ "message": "Tidak ada transaksi yang ditemukan untuk dianalisis" }
```

```json
{ "error": "Gagal menganalisis transaksi" }
```

### Catatan

- Hasil diurutkan berdasarkan transaction_date DESC, id DESC.
- Pembaruan sebagian didukung; body kosong mengembalikan "Tidak ada field yang diberikan untuk diperbarui".
- Konten AI bersifat non-deterministik; hanya 5 transaksi pertama yang dikirim ke model.
- Kategori transaksi tidak divalidasi terhadap tipe transaksi.
