# Manual Retail Order Item Adjustments

This note records the safe procedure used when an admin needs to add a retail
product to an existing order on behalf of the customer, so analytics, reports,
invoice data, and stock remain consistent as if the customer had included the
item at checkout.

## Confirmed Use Case

- Date executed: 2026-07-12
- Order: `6b3880fc-cabd-462c-9e1b-f25c9fb75216`
- Order number: `34`
- Customer: `احمد اسماعيل احمد`
- Original total: `160 EGP`
- Added product: `f48f07c5-0794-4cb8-a925-5d0e8fe6d95e`
- Product name: `حامل موبايل سياره توب 360`
- Quantity: `1`
- Unit price: `300 EGP`
- Final total: `460 EGP`
- Product stock changed from `200` to `199`

## Why This Needs Care

Retail order details, admin reports, invoices, and analytics do not all rely on
one table only. A correct manual addition must keep these records aligned:

- `orders.items_snapshot`
- `order_items`
- `orders.subtotal`
- `orders.total`
- `products.stock`

Updating only `order_items` is not enough because the admin order details page,
PDF report, invoice routes, and cancellation stock restore logic read from
`orders.items_snapshot`.

## Safety Rules

- Do not change schema or migrations for one manual correction.
- Do not run this on canceled or delivered orders.
- Prefer this only while the order is still `preparing` or earlier.
- Verify the product is active, has enough stock, and matches the customer
  request.
- Abort if the product already exists in `orders.items_snapshot` for the same
  order and variant.
- For products with variants, do not use the no-variant script. Variant stock
  and `variant_snapshot` must be handled explicitly.
- After any update, verify `orders`, `order_items`, and `products.stock`.

## Manual Data Procedure

1. Read the order by exact UUID and confirm:
   - `id`
   - `order_number`
   - `status`
   - `subtotal`
   - `total`
   - `currency`
   - `items_snapshot`

2. Read the target product by exact UUID and confirm:
   - `id`
   - `name_ar`
   - `name_en`
   - `price`
   - `stock`
   - `is_active`
   - `image_url`
   - `variants_json`

3. Reject the operation if:
   - order does not exist
   - order status is `canceled` or `delivered`
   - product does not exist
   - product is inactive
   - stock is lower than requested quantity
   - product already exists in `items_snapshot`
   - product has variants and no variant-safe flow is being used

4. Add the item to `orders.items_snapshot` using this shape:

```json
{
  "product_id": "PRODUCT_UUID",
  "name_ar": "Arabic name",
  "name_en": "English name",
  "name": "Display name",
  "price": 300,
  "quantity": 1,
  "image": "image url or null",
  "variant_key": "",
  "variant": {}
}
```

5. Insert the same line into `order_items`:
   - `order_id`
   - `product_id`
   - `name`
   - `price`
   - `quantity`
   - `image`
   - `variant_snapshot`

6. Increase both `orders.subtotal` and `orders.total` by `price * quantity`.

7. Decrease `products.stock` by the added quantity and update `is_active` if
   the next stock becomes zero.

8. Verify:
   - `orders.items_snapshot` contains the original items plus the added item
   - `order_items` contains the same product line
   - `orders.total` equals the new expected total
   - product stock was reduced exactly once

## Future Admin Button Plan

Add an admin-only button on the retail order details page for adding a product
to an existing order.

Required behavior:

- Show the button only for admins with `full` or `orders` permission.
- Enable it only while the resolved order status is `preparing`.
- Let admin search active retail products by name/SKU/category.
- Support quantity input with stock validation.
- For variant products, require selecting a valid variant before adding.
- Preview the line total and new order total before confirmation.
- On confirm, call a server route such as:
  - `POST /api/admin/orders/[orderId]/items`
- The server route must update in one guarded operation:
  - `orders.items_snapshot`
  - `order_items`
  - `orders.subtotal`
  - `orders.total`
  - `products.stock`
  - `products.variants_json` when variant-specific stock is used
- Prevent duplicate additions unless the admin explicitly chooses to increase
  quantity.
- Add an `admin_audit_logs` entry with:
  - admin email
  - order id
  - product id
  - quantity
  - old total
  - new total
  - old stock
  - new stock
- Reload the order details after success.

Verification for the future feature:

- Add no-variant product to a `preparing` order.
- Add variant product to a `preparing` order.
- Confirm totals in admin details, PDF report, invoice JSON/PDF, and analytics.
- Cancel the adjusted order and confirm all item stock is restored once.
- Confirm the button is hidden or disabled for `shipped`, `delivered`, and
  `canceled` orders.
