# FITZY API reference

Base URL: `http://localhost:4000/api`. JSON responses use `{ "success": true, "data": ... }`; errors use `{ "success": false, "error": { "code", "message" } }`. Lists include `data.items` and `data.pagination` where applicable.

## Authentication and access

Public registration always creates `customer`. The API never exposes a public admin registration route. Obtain a token from login/register and send `Authorization: Bearer <token>`. Blocked accounts cannot authenticate or use protected routes. Admin paths also require `role=admin`; the owner of a customer resource is checked on orders, reviews, and favorites.

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/health` | Public | API health |
| GET | `/payments/methods` | Public | List active payment methods and configured bank transfer details |
| POST | `/auth/register` | Public, rate-limited by input | Create customer |
| POST | `/auth/login` | Public, rate-limited | Login |
| POST | `/auth/firebase/exchange` | Public, rate-limited | Verify Firebase ID token, create/link MongoDB profile, return FITZY API JWT |
| GET/PATCH | `/users/me` | Customer/admin | Read/update name, phone, addresses |
| GET | `/categories` | Public | Active categories |
| GET | `/products` | Public | Search/filter/sort/paginate active products |
| GET | `/products/:idOrSlug` | Public | Product variants and visible reviews |
| GET | `/posts` | Public | Published posts only |
| GET | `/posts/:slug` | Public | Published post detail |
| GET/POST/DELETE | `/favorites`, `/favorites/:productId` | Customer | List/add/remove own favorites |
| POST/GET | `/orders` | Customer | Place order / list own orders |
| GET | `/orders/:id` | Owner/admin | Read order detail |
| POST | `/orders/:id/cancel` | Owner | Cancel eligible order and restore stock |
| POST | `/products/:productId/reviews` | Owner, completed buyer | Add one review per product |
| PATCH/DELETE | `/reviews/:id` | Review owner | Edit/delete own review |
| POST | `/promotions/check` | Customer | Validate promotion against live catalog and stock |
| POST | `/ai/stylist` | Customer, rate-limited | Gemini advice and database-matched products |
| GET/PATCH | `/users`, `/users/:id`, `/users/:id/block` | Admin | Customer list, detail, block/unblock |
| GET/PATCH | `/orders/admin/list`, `/orders/:id/status` | Admin | Filter orders / update valid status; status updates accept an optional `note` (up to 500 characters) and are recorded in the order status history |
| PATCH | `/orders/:id/payment/confirm` | Admin | Confirm a received bank transfer |
| PATCH | `/orders/:id/payment/refund` | Admin | Record a completed refund for an offline or online payment |
| POST | `/payments/ipn/momo`, `/payments/ipn/zalopay` | Provider callback | Verify signed payment notifications |
| GET | `/payments/ipn/vnpay`, `/payments/return/vnpay` | Provider callback / browser | Verify VNPay result and return to the FITZY app |
| GET/PATCH | `/reviews/admin/list`, `/reviews/:id/moderate` | Admin | Review moderation |
| GET | `/stats?range=day\|month\|year` | Admin | Revenue and store summary |
| GET/POST/PATCH/DELETE | `/admin/categories` | Admin | Category CRUD (deletion blocked while referenced) |
| GET/POST/PATCH/DELETE | `/admin/products` | Admin | Product and variant inventory CRUD |
| GET/POST/PATCH/DELETE | `/admin/posts` | Admin | Post CRUD/publication |
| GET/POST/PATCH/DELETE | `/admin/promotions` | Admin | Promotion CRUD |
| POST | `/admin/uploads` | Admin | JPG/PNG/WebP upload, maximum 4 MB |

Product list query parameters: `q`, `category` (id or slug), `minPrice`, `maxPrice`, `size`, `color`, `sort` (`newest`, `price_asc`, `price_desc`, `popular`), `page`, `limit`.

## Place an order

The client sends product and variant IDs plus quantity. It does not send prices, discount amount, shipping fee, or total. The server loads active product and variant records, validates stock and the promotion, calculates totals, reserves inventory, and writes the order in one transaction.

```json
{
  "items": [{ "productId": "<mongo-id>", "variantId": "<variant-id>", "quantity": 1 }],
  "promotionCode": "FITZY10",
  "paymentMethod": "cod",
  "shipping": {
    "recipient": "Nguyen An",
    "phone": "0912345678",
    "line1": "12 Nguyen Hue",
    "ward": "Ben Nghe",
    "district": "District 1",
    "city": "Ho Chi Minh City"
  }
}
```

Valid status flow: `pending → confirmed → preparing → shipping → completed`; `pending`, `confirmed`, and `preparing` can transition to `cancelled`; `shipping` can transition to `delivery_failed`, and a failed delivery can return to `shipping` for another attempt. Every new order and status transition records a timestamp and note in `statusHistory`; legacy orders created before this field was added have no historical timestamps. A cancellation restores inventory and frees one promotion use in the same transaction. An order paid by bank transfer or an online gateway must be refunded by an admin before cancellation. Provider refunds are performed outside FITZY and only recorded by the admin endpoint. COD is marked paid at completion. Revenue reports include only completed orders.

The checkout lists MoMo, ZaloPay, and VNPay only when that provider's credentials and callback URLs are configured in `FITZY-API/.env`. MoMo and ZaloPay create the payment session on the server and use signed IPN callbacks. VNPay uses a signed redirect URL, signed return verification, and a separate IPN endpoint; register `VNPAY_IPN_URL` in the VNPay merchant portal. Use publicly reachable HTTPS callback URLs and sandbox credentials for testing. `FITZY_PAYMENT_RETURN_URL` defaults to `fitzy://payment-result`; the Expo app registers the `fitzy` URL scheme and refreshes orders when the customer returns. Never put gateway secrets in mobile `.env` or the app bundle.

## Validation and error cases

- `400 VALIDATION_ERROR`, `400 INVALID_QUANTITY`, `400 SHIPPING_REQUIRED`, `400 PROMOTION_INVALID`
- `401 AUTH_REQUIRED`, `401 AUTH_EXPIRED`, `401 INVALID_CREDENTIALS`
- `403 ADMIN_REQUIRED`, `403 ACCOUNT_BLOCKED`, `403 REVIEW_NOT_ALLOWED`
- `404 NOT_FOUND`, `404 ORDER_NOT_FOUND`
- `409 EMAIL_IN_USE`, `409 INSUFFICIENT_STOCK`, `409 CANCEL_NOT_ALLOWED`, `409 INVALID_ORDER_TRANSITION`, `409 CATEGORY_IN_USE`
- Firebase exchange also returns `503 FIREBASE_NOT_CONFIGURED` when API Admin credentials are not configured, and `409 EMAIL_VERIFICATION_REQUIRED` before linking a Firebase account to an existing FITZY profile.
- Lists cap `limit` by resource. The server only returns published posts and active products/categories on public routes.

## Postman smoke sequence

1. `POST /auth/register` with a new customer and store `data.token`.
2. `GET /products?limit=12&sort=popular`, select a product and an available variant.
3. `POST /promotions/check` with `code` and `items` to preview the server-calculated discount.
4. `POST /orders` with the shipping payload above, then `GET /orders`.
5. Sign in at `/auth/login` with the seeded admin, replace the Bearer token, then call `/stats` and `/orders/admin/list`.
6. Attempt `/admin/products` with the customer token; it should return 403.
