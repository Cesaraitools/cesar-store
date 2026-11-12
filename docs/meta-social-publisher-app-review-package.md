# Cesar Social Publisher — Meta App Review Package

Last prepared: 2026-11-12

This document contains no tokens, passwords, App Secret values, or reviewer
credentials. Those values must only be entered in the relevant secure Meta or
Vercel field.

## 1. Application identity

- App name: `Cesar Social Publisher`
- App ID: `1402578105245392`
- Website: `https://www.cesareshop.com`
- Support URL: `https://www.cesareshop.com/contact`
- Privacy policy: `https://www.cesareshop.com/privacy-policy`
- Terms of service: `https://www.cesareshop.com/terms-of-service`
- Data deletion instructions: `https://www.cesareshop.com/data-deletion`
- Suggested icon: `public/icon-512.png` (512 × 512, PNG)
- Suggested category: `Shopping` or the closest Commerce/Business category
  offered by the Meta dashboard.
- Primary contact: use the verified business contact address controlled by the
  store owner. Do not place a private password or token in any contact field.

### Short description

Internal publishing tool for preparing, approving, scheduling, and publishing
Cesar Store product posts to the store's own Facebook Page and professional
Instagram account.

### Long description / app purpose

Cesar Social Publisher is a server-side internal tool used only by authorized
Cesar Store administrators. It selects products from the store catalog, uses
the first public image for each selected product, prepares a concise caption,
and queues approved publications for the store's own Facebook Page and
professional Instagram account. Administrators can choose the platforms,
schedule and repeat times, review or edit the caption, cancel queued work, and
stop the publisher. The worker verifies price and stock before publication,
uses idempotency controls to prevent duplicate posts, and records operational
results for administrators.

The app is not a consumer login service, does not publish to customers'
personal accounts, and does not sell Meta Platform Data.

## 2. Permissions to request

Request only these permissions. Do not add `business_management`, advertising,
messaging, comments, or insights permissions unless a later feature genuinely
requires them.

| Permission | Why it is required | Runtime use |
| --- | --- | --- |
| `pages_show_list` | Identify the Facebook Page assigned to the authorized business system user. | Calls `/me/accounts` and selects the configured Cesar Store Page. |
| `pages_read_engagement` | Read the Page identity and linked Instagram professional account required to validate the publishing destination. | Reads Page `id`, `name`, and `instagram_business_account`. |
| `pages_manage_posts` | Publish approved product photo posts and multi-photo posts to the store's Facebook Page. | Creates Page photos and feed posts. |
| `instagram_basic` | Read the professional Instagram account identity and username and validate that it is the configured account. | Reads the configured Instagram professional account. |
| `instagram_content_publish` | Create media containers and publish approved single-image or carousel posts to the store's professional Instagram account. | Calls `/media`, checks container status, and calls `/media_publish`. |

## 3. Permission explanations for App Review

### pages_show_list

The application needs `pages_show_list` to find the single Facebook Page that
the authorized Cesar Store business system user can manage. The server calls
`/me/accounts`, verifies the configured Page ID, and rejects the operation if
the Page is not present or the `CREATE_CONTENT` task is missing. The result is
not exposed to storefront visitors.

### pages_read_engagement

The application needs `pages_read_engagement` to read the configured Page's
basic identity and its linked Instagram professional account. This is a safety
check that prevents content from being sent to a different Page or Instagram
account. The application does not use this permission to profile Page visitors.

### pages_manage_posts

Authorized store administrators approve product content in the internal Social
Publisher screen. The server then uses `pages_manage_posts` to create a photo
post on the Cesar Store Facebook Page. Multi-product publications first create
unpublished photo objects and then attach them to one Page feed post. The app
stores the returned post ID and URL for operational history and duplicate
prevention.

### instagram_basic

The application needs `instagram_basic` to validate the ID and username of the
store's professional Instagram account and confirm that it matches the account
linked to the configured Facebook Page. This prevents accidental publication
to another account.

### instagram_content_publish

Authorized store administrators approve product content before it enters the
queue. The server uses `instagram_content_publish` to create an Instagram media
container, wait until processing is complete, and publish it to the store's
professional Instagram account. For multiple products, it creates carousel
children and one carousel container. The returned media ID and permalink are
stored for operational history and duplicate prevention.

## 4. Reviewer access and test path

Provide a temporary reviewer account in Meta's secure reviewer-credentials
field. Never put reviewer credentials in this repository or in a support email.
The account must have the application's full admin role but must not expose
other store administration areas unnecessarily.

1. Open `https://www.cesareshop.com/admin/social-publisher`.
2. Sign in with the temporary reviewer credentials supplied in App Review.
3. Confirm the header identifies `Cesar Social Publisher` and the configured
   Facebook and Instagram destinations.
4. Select one active product from the list.
5. Generate or enter a short caption.
6. Select `Facebook` and `Instagram`.
7. Choose the Draft/Review status first and add the item to the queue.
8. Show the queued rows and the cancellation control.
9. For the live review demonstration, use a clearly labeled test product and
   schedule it for immediate publication.
10. Run one worker cycle and show the resulting Facebook and Instagram post
    links.
11. Remove the temporary test posts after the reviewer has enough evidence,
    without deleting the audit evidence needed during review.

If Meta cannot access the admin screen because of authentication, provide the
exact login steps and temporary credentials in the secure App Review fields.
Do not disable authentication or expose the publisher publicly.

## 5. Screencast plan

Record one continuous video for each permission group, with the browser address
bar and the Meta destination visible. Avoid showing tokens, App Secret values,
Vercel environment variables, database credentials, customer orders, or
customer messages.

### Video A — Facebook permissions

1. Show the Cesar Social Publisher admin page and selected Cesar Store Page.
2. Select one test product and approve a caption.
3. Queue Facebook only and run the worker.
4. Open the returned Facebook post URL and show the new Page post.
5. Explain that `/me/accounts` validates the Page and that
   `pages_manage_posts` performs the publication.

Permissions demonstrated: `pages_show_list`, `pages_read_engagement`,
`pages_manage_posts`.

### Video B — Instagram permissions

1. Show the same admin page and selected professional Instagram account.
2. Select one or more test products and approve the caption.
3. Queue Instagram only and run the worker.
4. Open the returned Instagram permalink and show the new post/carousel.
5. Explain that the app reads only the professional account identity and uses
   the content publishing endpoints for the approved post.

Permissions demonstrated: `instagram_basic`, `instagram_content_publish`.

## 6. Data handling answers

- Meta data processed: Page ID/name, Instagram professional account
  ID/username, granted scopes and token validity, returned post/media IDs,
  status, and permalink.
- Store data sent to Meta: approved caption, public product image URLs, and the
  publication request.
- AI caption generation: OpenAI receives public store catalog facts and public
  product images only. Meta tokens, customer messages, and customer order data
  are not sent to OpenAI for this feature. Responses are requested with
  `store: false` and are reviewed/editable before publication.
- Token storage: server-only sensitive Vercel environment variables. They are
  not prefixed with `NEXT_PUBLIC_` and are not returned to the browser.
- Database access: Social Publisher tables have RLS enabled, deny anonymous and
  authenticated client roles, and are accessed server-side with the service
  role. Admin API access requires the full admin role.
- Retention: operational queue and publication records are retained only for
  scheduling, audit, troubleshooting, and duplicate prevention. Cancelled
  records are removed by the application's cancellation flow. Deletion
  requests are handled through the published data-deletion instructions.
- Sale of data: no Meta Platform Data is sold.
- User-facing policies: the live Privacy Policy and Data Deletion pages explain
  Meta publishing, server-side token protection, AI caption input, unlinking,
  and deletion requests.

## 7. Safety controls to mention

- Separate Meta app and environment variables from Cesar Response.
- Global enable/disable switch and Draft/Live mode.
- Per-platform switches.
- Admin approval before a manual campaign is queued.
- Price, active status, and stock checks immediately before publication.
- Daily limits, cooldowns, and evenly spaced repetitions.
- Unique idempotency keys and campaign occurrence constraints.
- Unknown Meta transport outcomes are not automatically retried as confirmed
  failures, preventing accidental duplicate posts.
- App Secret Proof is included with Graph API calls.
- Tokens and secrets never appear in the client UI.

## 8. Human-only Meta checklist

Complete these in order and stop if Meta shows a warning not covered here:

1. Verify the primary contact email.
2. Save the Website, Support, Privacy, Terms, and Data Deletion URLs.
3. Upload the 512 × 512 icon and choose the closest Shopping/Commerce category.
4. Save the app purpose/description.
5. Complete Business Verification for the linked Business Portfolio.
6. Add exactly the five permissions listed above to App Review.
7. Complete Meta's counted API tests for every permission that requires them.
8. Upload the two screencasts and permission explanations.
9. Enter temporary reviewer credentials only in Meta's secure field.
10. Complete data-handling questions and required declarations truthfully.
11. Submit the review. Do not switch to Live while permissions are pending.
12. After approval, switch to Live, revalidate both tokens, and verify one
    approved post from a non-role Facebook/Instagram account.

## 9. Current known pre-submission state (2026-11-12)

- App is in Development mode (`is_live: false`).
- No App Review submission exists yet.
- The five permissions have Standard/BASIC access only, not Advanced access.
- Required API tests have not been counted as completed.
- Meta reports the Privacy Policy and Business Verification prerequisites as
  incomplete in App Review.
- The application is linked to the intended Business Portfolio.
- Meta compliance currently reports no violations or required actions.

Re-check every status in Meta immediately before submission because these
values can change.
