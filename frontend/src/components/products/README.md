# Product components

| Component | Purpose |
|-----------|---------|
| `ProductWorkLauncher` | Launch presets (SEO review, marketing sprint), custom workflows, or single agents on a product with workspace + memory context |
| `AddProductDialog` | Register existing products (`projects/{slug}/`) or bootstrap a new empty workspace |

Used in `ProductsPage` (active products tab) and `WarRoomContent`.

API: `GET /products/importable`, `POST /products/register`, `POST /products/bootstrap`, `GET /products/:id/launch-options`, `POST /products/:id/launch`.
