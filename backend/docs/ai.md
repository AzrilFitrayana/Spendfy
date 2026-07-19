### Spesifikasi API Insight AI

Seluruh endpoint membutuhkan Bearer Token (JWT) dan dibatasi pada pengguna yang terautentikasi. Insight dihasilkan oleh model Gemini dan disimpan di ai_insights.

Tipe insight: monthly_summary, weekly_summary, savings_tips, budget_alert.

Model Data Insight AI:

| Field | Tipe | Deskripsi |
|-------|------|-----------|
| id | integer | Primary key yang dibuat otomatis. |
| user_id | integer | Pemilik insight. |
| insight_type | string | monthly_summary, weekly_summary, savings_tips, atau budget_alert. |
| period_start | string \| null | Awal periode (YYYY-MM-DD); null untuk savings_tips/budget_alert. |
| period_end | string \| null | Akhir periode (YYYY-MM-DD); null untuk savings_tips/budget_alert. |
| content_json | object | Konten insight yang dihasilkan (struktur bergantung pada insight_type). |
| created_at | string | Timestamp pembuatan (ISO 8601). |

## Daftar Insight

Endpoint: GET /api/insights

Autentikasi: Bearer Token (JWT)

Header Request:

- Authorization: Bearer <token>

Request Body:

Tidak ada

Request Body (Sukses):

```json
[
  {
    "id": 7,
    "user_id": 1,
    "insight_type": "monthly_summary",
    "period_start": "2026-07-01",
    "period_end": "2026-07-31",
    "content_json": {
      "summary": "Anda memiliki bulan menabung yang kuat dengan pemasukan yang nyaman di atas pengeluaran.",
      "highlights": ["Tingkat tabungan sehat", "Pemasukan stabil"],
      "concerns": ["Pengeluaran makanan meningkat"],
      "recommendations": [
        { "title": "Batasi makan di luar", "detail": "Tetapkan batas makan mingguan untuk menjaga tabungan." }
      ],
      "topSpendingCategory": "Makan & Minum",
      "estimatedMonthlySavings": 7500000,
      "healthScore": 82
    },
    "created_at": "2026-07-16T03:56:01.000Z"
  }
]
```

Request Body (Gagal):

```json
{ "message": "Gagal mengambil insight" }
```

## Hasilkan Insight

Endpoint: POST /api/insights/generate

Autentikasi: Bearer Token (JWT)

Header Request:

- Authorization: Bearer <token>
- Content-Type: application/json

Request Body:

```json
{
  "type": "monthly_summary"
}
```

- type: string, wajib, salah satu dari monthly_summary, weekly_summary, savings_tips, budget_alert
- categoryId: integer, wajib saat type adalah budget_alert

Request Body (Sukses):

```json
{
  "id": 8,
  "user_id": 1,
  "insight_type": "monthly_summary",
  "period_start": "2026-07-01",
  "period_end": "2026-07-31",
  "content_json": {
    "summary": "Anda memiliki bulan menabung yang kuat dengan pemasukan yang nyaman di atas pengeluaran.",
    "highlights": ["Tingkat tabungan sehat", "Pemasukan stabil"],
    "concerns": ["Pengeluaran makanan meningkat"],
    "recommendations": [
      { "title": "Batasi makan di luar", "detail": "Tetapkan batas makan mingguan untuk menjaga tabungan." },
      { "title": "Otomatiskan tabungan", "detail": "Pindahkan tabungan ke rekening terpisah saat gajian." },
      { "title": "Tinjau langganan", "detail": "Batalkan pembayaran berulang yang tidak digunakan." }
    ],
    "topSpendingCategory": "Makan & Minum",
    "estimatedMonthlySavings": 7500000,
    "healthScore": 82
  },
  "created_at": "2026-07-16T03:56:01.000Z"
}
```

Request Body (Gagal):

```json
{ "message": "Tipe insight wajib diisi" }
```

```json
{ "message": "Tipe insight tidak dikenal" }
```

```json
{ "message": "Gagal menghasilkan insight" }
```

### Catatan

- type harus salah satu dari empat tipe insight yang didukung.
- budget_alert membutuhkan categoryId; jika dihilangkan akan melempar error dan mengembalikan 500.
- bentuk content_json berdasarkan tipe:
  - monthly_summary / weekly_summary: summary, highlights[], concerns[], recommendations[{title, detail}], topSpendingCategory, estimatedMonthlySavings|estimatedWeeklySavings, healthScore (integer 0-100).
  - savings_tips: overallTip, tips[{category, title, detail, estimatedSavings}] (tepat 4 tips).
  - budget_alert: severity ("info"|"warning"|"critical"), title, message, suggestions[].
- Konten AI bersifat non-deterministik.
