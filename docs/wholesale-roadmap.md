# Cesar Store Wholesale Roadmap

Last updated: 2026-07-18

## Current Status

- Wholesale work has been committed, pushed, and deployed in stages. Continue treating each new change as a separate reviewed increment before pushing to Vercel.
- Retail shop logic, retail cart, retail checkout, and current product pages remain separate from wholesale logic.
- Wholesale uses the existing `products` table as the catalog source.
- Wholesale-specific product data is stored separately in `wholesale_product_settings`.
- All products are available for wholesale by default. Admins can disable wholesale availability per product when needed.
- The wholesale database foundation has been applied manually through Supabase SQL Editor.
- The three wholesale tables and the private `wholesale-documents` bucket were verified from the local app environment.
- A temporary wholesale application was submitted successfully, document upload was verified, and the temporary test data was removed.
- Wholesale onboarding now requires five document uploads: national ID front/back, tax card front/back, and commercial register.
- Customer-uploaded images are compressed in the browser before submission; PDFs are uploaded unchanged.
- The server and storage bucket enforce a 5MB maximum per document and allow only PDF, JPG/JPEG, PNG, and WEBP.
- A five-document application submission was tested successfully through the local API, then the temporary application and uploaded files were removed.
- Tax number and commercial register number are required on both the client form and server validation.
- Wholesale application email is required on both the client form and server validation because it is the account-linking key for wholesale login access.
- Admin document opening now creates the browser tab immediately on click before loading the signed URL, to avoid popup blocking.
- Public wholesale status lookup now stores the phone locally for the application and refreshes the displayed status automatically every 5 seconds after a successful lookup.
- Public wholesale status lookup now prevents overlapping refresh requests if the network or Supabase response is slow.
- Admin wholesale status controls now show the current status clearly and visually highlight the active status button after each successful update.
- Admin wholesale applications now show a new-application counter and visually highlight pending applications that have not started review yet.
- Re-approving an application is now idempotent: if a wholesale customer record already exists, the approval flow reuses it instead of failing.
- Admins can now link an approved wholesale customer to an existing Supabase Auth user by email, activating the wholesale account through `auth_user_id`.
- Public wholesale account page `/wholesale/account` now shows whether the signed-in user has an active, pending, suspended, or missing wholesale account link.
- Public wholesale catalog page `/wholesale/catalog` now lists wholesale-available products while hiding wholesale piece prices unless the signed-in user has an active wholesale account.
- Wholesale cart/order UI is implemented locally with a separate Supabase-backed wholesale cart and a separate order review page; it does not use or modify the retail cart.
- Wholesale product settings have been simplified to piece-based selling only: wholesale price per piece plus minimum purchase quantity in pieces.
- Admin wholesale orders can now open WhatsApp follow-up with a prepared message containing the order number, current status, and order total.
- Wholesale customer order submission now opens WhatsApp automatically with a prepared order message after the database order is created, while keeping a manual fallback button if the browser blocks the popup.
- Wholesale order statuses follow the same stages used by retail orders: `requested`, `confirmed`, `preparing`, `shipped`, `delivered`, and `canceled`.
- Wholesale stock policy decision: submitting a wholesale order does not deduct stock immediately. Stock deduction should happen later when Cesar confirms the order from admin workflow, because payment and delivery are handled manually/cash on delivery.
- Wholesale cancellation and future wholesale sales returns must restore previously deducted quantities back to product stock.
- A wholesale sales-returns system is planned first for wholesale orders. After it stabilizes, the same concept can be adapted carefully to retail orders.

## Completed Locally

- Public wholesale landing page: `/wholesale`.
- Public wholesale application page: `/wholesale/apply`.
- Public application status page: `/wholesale/status`.
- Admin wholesale applications page: `/admin/wholesale`.
- Admin wholesale product settings page: `/admin/wholesale/products`.
- Public API for creating wholesale applications.
- Public API for checking application status using application id plus phone/WhatsApp.
- Admin APIs for listing applications, updating review status, opening document signed URLs, and saving product settings.
- Admin API for linking an approved wholesale customer to an existing user account and activating or suspending that wholesale account.
- Public API for checking the current signed-in user's wholesale account status.
- Public API for the wholesale catalog that returns prices only for active wholesale accounts.
- Public wholesale catalog page with search, category filtering, locked-price state, and active-account price display.
- Public wholesale product details page `/wholesale/product/[id]` for active wholesale accounts, including product description, price, minimum quantity, and variant selection.
- Public wholesale catalog quantity input now supports manual typing, disables add-to-cart below the configured minimum, and shows a dismiss-only warning when the selected quantity is too low.
- Separate DB-backed wholesale cart helper using `wholesale_carts` and `wholesale_cart_items`.
- Wholesale cart state now uses an isolated `WholesaleCartProvider` that reads and writes through Supabase-backed APIs, separate from the retail `CartProvider`.
- Wholesale cart ownership now waits for auth loading before assigning or clearing cart state, so a saved wholesale cart is not wiped during session hydration.
- Wholesale cart mutations now ignore stale cart items from a different signed-in user before adding, updating, replacing, or removing items.
- Legacy browser localStorage wholesale-cart migration code has been removed; wholesale cart state now reads and writes through the Supabase-backed cart APIs only.
- The global cart button now routes to the wholesale order review page and shows the wholesale cart item count only while browsing `/wholesale`; outside wholesale it keeps the existing retail cart behavior.
- The global navbar now switches to wholesale navigation while browsing `/wholesale`, so it shows wholesale shop/orders links instead of sending wholesale users back to the retail shop.
- The main landing page now includes a visible wholesale entry point linking to `/wholesale` and `/wholesale/apply`.
- The wholesale catalog is gated to active wholesale customers only; non-active users see an access message instead of product listings.
- Adding a wholesale product now shows a success toast and immediately updates the wholesale cart count.
- Wholesale catalog and order review now block quantities above current stock before adding or submitting, with a clear customer-facing warning.
- Wholesale cart cleanup now removes products that become unavailable because wholesale pricing is missing, wholesale access is disabled, or stock reaches zero.
- Wholesale cart cleanup now removes stale products that are no longer available or priced for wholesale when an active wholesale customer opens the catalog or order review page.
- Public wholesale order review now includes a clear-order button that empties the wholesale cart through the isolated `WholesaleCartProvider`.
- Public wholesale order review page `/wholesale/order`.
- Public wholesale order review quantity input now supports manual typing, disables submission below the configured minimum, and shows the same delayed dismiss-only warning pattern.
- Public wholesale order review no longer shows quantity warnings just because a loaded cart item became invalid; warnings now appear only after customer edits, blur, or submit.
- Public wholesale order review now treats variant products correctly while editing the cart: each variant line is limited by its own stock, while the product minimum is enforced against the total selected variants for that product.
- Wholesale order submission now relies on the atomic database function to mark the active cart as submitted, then clears only the local UI state after success.
- The unused legacy wholesale order creation path that accepted client-submitted cart payloads has been removed; wholesale order creation now stays on the atomic database-cart path only.
- Wholesale order idempotency by order token is now scoped to the same signed-in wholesale user/customer, so a reused token cannot return another customer's order.
- Wholesale cart and order APIs now have rate limiting aligned with the retail cart/order API protection pattern.
- A follow-up hardening SQL migration now scopes wholesale order token uniqueness per wholesale customer, adds advisory locking/search-path hardening, and updates product `updated_at` when wholesale stock is deducted or restored.
- Wholesale DB cart/order support for product variants has been added locally and its SQL migration was applied manually: cart item identity now includes `variant_key`, order items keep `variant_snapshot`, and the minimum wholesale quantity for variant products is checked against the total selected variants for the same product.
- A follow-up variants SQL migration now adds variant columns to wholesale cart/order items and updates atomic order creation, stock deduction, cancellation restore, and returns to adjust both product stock and variant stock. It was applied manually through Supabase SQL Editor; the user reported the main wholesale cart/order browser flow was tested previously and should not be repeated now unless specifically requested.
- Wholesale catalog cards now stay compact for products with variants: variant quantities are selected on a dedicated wholesale product details page instead of inside the catalog card.
- Wholesale product details now include the retail product description under the image, while keeping wholesale pricing and variant selection separate.
- Public wholesale order API route for active wholesale accounts only.
- Public wholesale orders page `/wholesale/orders` now lets signed-in wholesale customers track their submitted wholesale orders and line items.
- Public wholesale orders page refreshes automatically every 5 seconds while the tab is visible and refreshes again when the customer returns to the tab, without overlapping requests.
- Public wholesale application status page also pauses background polling while hidden and refreshes when the customer returns to the tab.
- Wholesale orders are now linked from the wholesale landing page, wholesale catalog, wholesale order success state, and wholesale account page.
- Admin wholesale orders page: `/admin/wholesale/orders`.
- Admin API for listing wholesale orders and updating wholesale order status.
- Admin WhatsApp follow-up link for wholesale orders with a prefilled manual message.
- Customer-facing wholesale order review opens WhatsApp automatically after successful order creation, matching the retail checkout behavior.
- Wholesale fallback error messages are now localized to Arabic across wholesale public/admin APIs and admin pages, including auth and rate-limit responses.
- Automatic client-side image compression for wholesale application documents.
- Required wholesale login email in the application form with a note that this is the email the admin will use to link wholesale access.
- Clear admin status controls for marking applications under review, approved, or rejected, with the current status highlighted.
- Admin wholesale applications page highlights new pending applications and includes quick status summary cards.
- Supabase migration file for:
  - `wholesale_applications`
  - `wholesale_customers`
  - `wholesale_product_settings`
  - private `wholesale-documents` storage bucket

## Wholesale Admin Parity Plan

Retail admin screens may be read only as a reference for mature admin patterns.
Do not modify retail admin screens, retail cart logic, retail checkout logic, or
stable retail order behavior while implementing wholesale admin improvements.

The current wholesale admin area has only three main screens:

- `/admin/wholesale` for applications and account linking.
- `/admin/wholesale/orders` for wholesale order review, status updates, print reports, WhatsApp follow-up, and embedded returns.
- `/admin/wholesale/products` for wholesale product availability, piece price, minimum quantity, and notes.

Retail admin currently has several management features that should be adapted
carefully to wholesale where the wholesale business model needs them:

- Orders: date filters, pagination, CSV export, row selection, bulk actions,
  archive/restore workflow, and a dedicated order details page.
- Analytics: wholesale revenue, order count, average order value, delivered and
  canceled counts, return totals, top wholesale customer, top wholesale product,
  and top wholesale category.
- Charts: compact visual summaries for wholesale sales by date, status,
  customer, product, and category.
- Products and pricing: keep wholesale products derived from the existing retail
  product catalog, and manage only wholesale-specific overlay fields such as
  enabled/disabled status, wholesale piece price, minimum order quantity, notes,
  missing-price indicators, low-stock visibility, and variant-aware wholesale
  setup review.
- Customers: a dedicated wholesale customer screen separate from applications,
  with active/suspended/pending filters, account-linking status, review notes,
  WhatsApp action, and export.
- Returns: a dedicated wholesale returns screen with filters, returned quantity
  tracking, order/customer/product context, and export, instead of relying only
  on the embedded order-card form.
- Reports: review and harden wholesale Arabic print/PDF layout, then consider batch
  report/export actions.
- Navigation: expand the wholesale admin section into clear tabs/pages instead
  of keeping all wholesale operations under only applications, orders, and
  products.

Recommended wholesale admin tabs/pages:

- Overview
- Applications
- Customers
- Orders
- Returns
- Products & Pricing
- Analytics
- Charts
- Reports & Exports
- Settings

Recommended implementation order:

1. Add navigation structure and placeholder-safe routes for missing wholesale
   admin pages without changing retail screens. Done on 2026-07-18.
2. Improve wholesale orders with date filters, pagination, CSV export, and a
   dedicated order details page. Done on 2026-07-18.
   Archive/restore and adding an item to a `preparing` wholesale order were
   enabled after the required SQL was applied manually on 2026-07-18.
3. Add wholesale customers and returns as separate admin pages. Done on 2026-07-18.
4. Add wholesale analytics and charts using read-only aggregate queries first. Done on 2026-07-18.
5. Refine the wholesale product settings screen only as an overlay on retail
   products, without adding a separate wholesale catalog import/export path. Done on 2026-07-18.
6. Review wholesale PDF Arabic output after the order detail and report flow are
   stable. QR tracking already exists in the protected wholesale order report.
   The order report route is currently a print-friendly HTML report, not a
   generated PDF binary. The admin button was renamed to "print report" on
   2026-07-18 to avoid misleading operators.

Implemented wholesale admin pages on 2026-07-18:

- `/admin/wholesale/overview`
- `/admin/wholesale/customers`
- `/admin/wholesale/orders/[id]`
- `/admin/wholesale/returns`
- `/admin/wholesale/analytics`
- `/admin/wholesale/charts`
- `/admin/wholesale/reports`
- `/admin/wholesale/settings`

Implemented wholesale admin APIs on 2026-07-18:

- `/api/admin/wholesale/customers`
- `/api/admin/wholesale/returns`
- `/api/admin/wholesale/summary`
- `/api/admin/wholesale/orders/[id]/archive`
- `/api/admin/wholesale/orders/[id]/items`

Archive/restore for wholesale orders is now available from the wholesale order
list and details pages. Adding a product to an existing wholesale order is
available only while the order is in `preparing`, and it uses the reviewed
atomic SQL function from
`supabase/migrations/202607180001_wholesale_order_archive_and_add_item.sql` to
update order totals and stock together.

## Roadmap Order

1. Stabilize the database foundation.
   - Review the wholesale migration. Done.
   - Apply only the wholesale migration safely. Done.
   - Test application submission and document upload. Done.
   - Test admin application review.

2. Complete the approval cycle.
   - Approving an application creates a wholesale customer record.
   - Customer starts as `pending_account`.
   - Status page shows pending, under review, approved, or rejected.

3. Build wholesale account access.
   - Decide and implement the login/access model after approval. Done.
   - Link approved wholesale customers to existing Supabase Auth users by email. Done.
   - Add a public account status page for signed-in wholesale customers. Done.
   - Prevent non-approved users from seeing wholesale prices. Done for the catalog API/page.
   - Keep public wholesale information visible without prices. Done for the catalog API/page.

4. Build the wholesale catalog.
   - Read from existing `products`. Done.
   - Read wholesale settings from `wholesale_product_settings`. Done.
   - Hide prices unless the wholesale customer is approved and active. Done.
   - Respect per-product wholesale disable checkbox. Done.
   - Use piece-based wholesale pricing and minimum quantity only, without carton/liter/meter unit controls. Done.
   - Test locked catalog as a guest and active catalog as a linked wholesale account. User-reported as previously tested; do not repeat unless requested.

5. Build the wholesale cart and order flow.
   - Keep it separate from the retail cart. Done for the local cart UI.
   - Move the wholesale cart to Supabase as the single source of truth. Done locally and applied manually through Supabase SQL Editor; user-reported browser testing was done previously.
   - Remove the temporary legacy localStorage migration/cleanup code from `WholesaleDbCartContext` so wholesale cart state remains fully Supabase-only. Done locally.
   - Use piece quantity only for wholesale orders. Done in catalog/order UI and server validation.
   - Enforce minimum order quantity by piece. Done in the UI and server validation.
   - Create wholesale orders separately from retail orders. Done locally.
   - Create wholesale orders from the database cart, not from client-submitted cart payload. Done locally; the unused legacy client-payload order path has been removed.
   - Create wholesale orders and mark the cart as submitted inside one atomic database function. Done locally and applied manually through Supabase SQL Editor; user-reported browser testing was done previously.
   - Let customers review their own submitted wholesale orders and order item details. Done locally.
   - Apply the new wholesale orders SQL migration before testing order submission against Supabase. Done manually through Supabase SQL Editor.
   - Add atomic database logic for wholesale order creation. Done locally and applied manually through Supabase SQL Editor; user-reported browser testing was done previously.
   - Add atomic status update logic for wholesale order stages. Applied manually through Supabase SQL Editor.
   - Add atomic stock deduction when a wholesale order is confirmed by admin, not when it is first submitted. Applied manually through Supabase SQL Editor.
   - Restore deducted stock when a confirmed wholesale order is canceled. Applied manually through Supabase SQL Editor.
   - Support wholesale product variants using the same product variant data as retail, with minimum quantity enforced by total selected variants for the product. Done locally and applied manually through Supabase SQL Editor; user-reported browser testing was done previously.

6. Add WhatsApp follow-up.
   - Show the wholesale order/application number on screen. Done locally.
   - Prepare WhatsApp follow-up messages. Done locally for admin order follow-up.
   - Add automatic WhatsApp delivery later only through an approved provider. Deferred.

7. Build wholesale order management.
   - Admin page for wholesale orders. Done locally.
   - Statuses now match retail order stages: requested, confirmed, preparing, shipped, delivered, and canceled. Done locally.
   - Stock deduction is tied to the `confirmed` transition. Applied manually through Supabase SQL Editor.
   - Keep this separate from retail order screens. Done locally.
   - Admin wholesale orders can now generate a protected print report for each wholesale order. Done locally and deployed.

8. Build wholesale sales returns.
   - Create a separate wholesale returns flow after the base wholesale order flow is stable. Done locally.
   - Return approved quantities back to product stock. Done locally through a new atomic SQL function.
   - Track returned quantities per wholesale order item so the same units cannot be returned twice. Done locally.
   - Keep the first implementation isolated from retail returns. Done locally.
   - Allow wholesale returns only after the order reaches `delivered`; earlier order cancellation remains a separate status flow. Done locally.

9. Test locally before deployment.
   - Run lint and TypeScript.
   - Test public pages.
   - Test protected admin routes.
   - Test Supabase writes and storage.

10. Deploy only after approval.
   - Commit intentionally.
   - Push to GitHub.
   - Let Vercel deploy.
   - Verify production step by step.

11. Add a protected wholesale test-data reset after deployment testing.
   - Add an admin-only reset button for wholesale test data after production verification. Done and pushed.
   - Scope the reset to wholesale application/customer/order test data only, not retail orders, carts, users, products, or stock. Done and pushed.
   - Require the same strict admin protection pattern used for sensitive actions: full admin session and the same `SUPER_ADMIN_EMAIL` check used by the retail reset action. Done and pushed.
   - Keep the button disabled unless the authorized full admin email is signed in. Done and pushed.
   - Use the reset only after upload/deployment testing is complete, to return the wholesale test database area to a clean launch state.

## Important Supabase Note

`supabase migration list` shows the local migration history and remote migration history are not perfectly aligned. Because of that, `supabase db push` must not be used blindly for this work. Wholesale database changes should continue to be applied only through reviewed SQL, one migration at a time, followed by a verification query or browser flow test.

The wholesale migrations below were applied manually through Supabase SQL Editor:

- `supabase/migrations/2026061901_create_wholesale_applications.sql`
- `supabase/migrations/20260620004646_create_wholesale_orders.sql`
- `supabase/migrations/20260621141948_wholesale_order_status_atomic_stock.sql`
- `supabase/migrations/20260621155254_wholesale_order_returns.sql`
- `supabase/migrations/20260621183042_wholesale_db_cart.sql`
- `supabase/migrations/20260621191204_wholesale_order_from_db_cart_atomic.sql`
- `supabase/migrations/20260622091500_harden_wholesale_cart_order_sql.sql`
- `supabase/migrations/20260622094500_wholesale_variants_cart_order.sql`

Existing unit columns remain in the database for compatibility, but the application now writes and reads them as fixed piece values: `piece`, `قطعة`, and `1`.

Browser flow testing for active wholesale account access, DB cart persistence, variant cart lines, atomic order creation from the DB cart, stock deduction on admin confirmation, cancellation restore, and returns restore was reported by the user as already performed previously. Do not repeat it unless the user asks for another test pass.

Pending SQL review/application:

- `supabase/migrations/202607180001_wholesale_order_archive_and_add_item.sql`
  adds `wholesale_orders.archived_at`, `wholesale_orders.archived_by`,
  `archive_wholesale_order_atomic`, and `add_wholesale_order_item_atomic`.
- Do not run `supabase db push` blindly. Apply this SQL manually through
  Supabase SQL Editor only after review and approval, then enable the matching
  admin UI/API in a separate code step.

## Architecture Principle

All real business operations in Cesar Store must use the database as the single source of truth. This applies to both retail and wholesale:

- Product stock, order status, order items, returns, customer/account approval, and any operation that affects business state must be stored and validated in Supabase.
- Client-side state can be used only as a temporary UI convenience. It must not be treated as final business truth.
- Any cart/order/status flow is not considered production-complete until its critical state is persisted in Supabase and protected by server-side validation.
- Retail logic that is already stable must be read and understood before adapting ideas to wholesale, but not modified unless a specific approved task requires it.
- Wholesale features should continue moving toward the same reliability standard as the retail atomic order/cart system.
