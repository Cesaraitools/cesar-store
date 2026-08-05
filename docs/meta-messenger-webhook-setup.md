# Meta Messenger and Comments Webhook Setup

This replaces the n8n Cloud workflow for Cesar Store Messenger automation and
adds a guarded foundation for Facebook post comment automation.

Webhook URL:

```text
https://www.cesareshop.com/api/meta/webhook
```

Meta verification token:

```text
cesar_verify_2026
```

Recommended Vercel environment variables:

```text
META_WEBHOOK_VERIFY_TOKEN=cesar_verify_2026
META_PAGE_ACCESS_TOKEN=<Facebook page access token>
META_PAGE_ID=<Facebook page id>
META_APP_SECRET=<Meta app secret, required for signed webhook delivery>
META_GRAPH_API_VERSION=v20.0
META_MESSENGER_AUTO_REPLY=false
META_COMMENTS_AUTO_REPLY=false
META_COMMENTS_MIN_SCORE=10
META_COMMENTS_ALLOWED_POST_IDS=
OPENAI_API_KEY=<OpenAI API key, optional for AI replies>
OPENAI_MODEL=gpt-4o-mini
OPENAI_MAX_OUTPUT_TOKENS=450
AUTOMATION_AI_ENABLED=true
```

The endpoint:

1. Responds to Meta webhook verification.
2. Ignores non-page events, empty messages, echoes, duplicates, and rate-limited
   senders.
3. Searches the Cesar Store catalog for grounded product candidates.
4. Uses the optional AI automation agent to write a natural reply from those
   candidates. If `OPENAI_API_KEY` is missing or the AI request fails, it falls
   back to the deterministic catalog reply.
5. Sends a text reply through the Facebook Graph API.
6. Receives Page feed comment events when the page is subscribed to the `feed`
   webhook field.
7. Stores unclear or disabled comment replies as handoff records in Redis under
   `meta:comment:handoffs` and logs them in Vercel.

AI automation:

- `OPENAI_API_KEY` enables AI-written replies for Messenger, comments, and the
  secured product automation search endpoint.
- `META_MESSENGER_AUTO_REPLY` and `META_COMMENTS_AUTO_REPLY` are independent
  outbound kill switches. Keep both `false` until the internal AI preflight and
  controlled Meta tests are complete.
- `OPENAI_MODEL` is optional. Keep it configurable so the model can be changed
  in Vercel without code changes.
- `OPENAI_MAX_OUTPUT_TOKENS` is optional. Keep it around `450` for concise,
  low-cost store replies.
- Set `AUTOMATION_AI_ENABLED=false` to temporarily disable AI and keep using the
  deterministic catalog search.
- The AI agent only sees products returned from the store catalog search. It is
  instructed not to invent products, prices, stock, variants, links, or policies.
- AI treats deterministic scores and handoff hints as context, not as a final
  blocker. It can answer, clarify, or safely ask the customer to message the
  page, while still being restricted to catalog products and links.
- The secured endpoint `/api/automation/products/search` keeps the old response
  fields and adds `meta.ai` so n8n or other callers can tell whether AI was used.
- Messenger and public-comment events call the same OpenAI-backed server agent
  directly from `/api/meta/webhook`; n8n is not required in the live Meta reply
  path.
- The webhook binds Messenger recipients and feed-entry ids to `META_PAGE_ID`,
  so events delivered for another subscribed page are ignored.

Comment automation safety:

- `META_COMMENTS_AUTO_REPLY` is disabled by default. Keep it `false` until the
  comment flow is tested with controlled posts.
- If AI is enabled and successfully writes a reply, its action can override the
  deterministic score. Before publishing, code still rejects explicit prices,
  currency, and URLs outside the selected Cesar Store product/category/shop
  links. Rejected replies are stored as human handoffs. If AI is disabled or
  fails, deterministic replies still require at least one product and
  `meta.bestScore` greater than or equal to `META_COMMENTS_MIN_SCORE`.
- To limit auto replies to controlled test posts, set
  `META_COMMENTS_ALLOWED_POST_IDS` to one or more comma-separated Facebook post
  ids. Leave it empty to allow all posts once the automation is ready.
- Ambiguous comments, rate-limited posts, and comments with no confident product
  match are sent to human handoff instead of receiving an automatic public
  reply.

Comment automation repair plan:

Current confirmed gap:

- A normal comment on the main Facebook post reaches the webhook and can receive
  an automatic reply.
- A comment added to an individual photo inside a multi-photo post can reach the
  same `feed` webhook in a different payload shape.
- Production logs confirmed that at least one received Page `feed` change was
  rejected by the current normalizer with `reason: "not_a_comment"`.
- The current normalizer only accepts `value.item === "comment"`. A child-photo
  comment can therefore be rejected before intent classification, catalog
  grounding, handoff, or reply delivery.
- `META_COMMENTS_ALLOWED_POST_IDS` was not configured when this issue was
  diagnosed, so the post allowlist was not the cause of the missed reply.

Required repair:

1. Capture the non-sensitive structure of controlled main-post and child-photo
   comment webhook events, including `item`, `verb`, `comment_id`, `post_id`,
   `parent_id`, and whether the event belongs to a photo attachment. Do not log
   access tokens or full customer data.
2. Extend comment normalization to recognize supported child-photo comment
   events without broadly accepting unrelated Page feed changes.
3. Resolve both identities for a child-photo comment:
   - the exact photo or attachment that received the comment;
   - the parent multi-photo post used for campaign context and optional
     allowlist checks.
4. Fetch photo-specific context first, then parent-post text and attachment
   context. The reply must be grounded in the selected photo instead of assuming
   that the customer means the whole post.
5. Continue replying to the original `comment_id`; do not create a new
   top-level post comment.
6. Preserve all existing safeguards: page-authored comment filtering,
   signature verification, deduplication, rate limits, AI/catalog grounding,
   minimum-confidence handling, and Redis human handoff.
7. Record a clear handoff reason when Meta does not provide enough attachment or
   parent-post context. The system must not guess which product appears in the
   selected photo.

Phase 1 instrumentation:

- Production now logs `META WEBHOOK FEED CHANGE SHAPE` before normalization.
- The log includes only the event field names, `item`, `verb`, object ids,
  message presence/length, and structural flags. It does not include the
  comment text, actor id/name, access token, or application secrets.
- Keep `META_COMMENTS_AUTO_REPLY=false` while capturing one controlled normal
  post comment and one controlled child-photo comment. Use those two shapes to
  implement the normalization and parent/attachment resolution without
  guessing Meta's payload format.

Controlled validation matrix:

- Text comment on a normal single-photo post.
- Text comment on the main body of a multi-photo post.
- Text comment on the first, middle, and last child photo in a multi-photo post.
- Short contextual comments such as "بكام؟", "متوفر؟", and "عايز ده".
- Social comments that should receive a safe social reply.
- Comments made by the Page itself, duplicate deliveries, edited/deleted
  comments, empty comments, and non-comment `feed` events; all must remain
  ignored as appropriate.
- A child photo whose product cannot be identified confidently; it must create a
  human handoff and must not send an invented product reply.
- If `META_COMMENTS_ALLOWED_POST_IDS` is used during testing, verify that a child
  photo is authorized through its parent post id rather than rejected because
  its photo id differs.

Acceptance criteria:

- Every supported child-photo comment is either replied to once or stored once
  as a clearly explained human handoff.
- The reply is attached to the exact customer comment and uses the selected
  photo's context.
- No unrelated Page feed event is treated as a customer comment.
- Existing normal-post and Messenger replies continue to work without behavior
  changes.
- The repair is deployed only after type checking, linting, diff checking, and
  controlled Meta tests succeed.

Meta subscriptions:

- Messenger replies require the page webhook fields `messages` and
  `messaging_postbacks`.
- Comment automation requires the page webhook field `feed`.
- Public comment replies may require Meta App Review permissions such as
  `pages_manage_engagement` and `pages_read_engagement`, depending on app mode
  and the audience being served.

If the Meta app is deleted and recreated:

- Copy the current webhook URL and verify token first.
- Create the new app, add Messenger/Facebook Login use cases as needed, and add
  the same webhook callback URL.
- Replace `META_APP_SECRET`, `META_PAGE_ACCESS_TOKEN`, and any changed page/app
  values in Vercel.
- Subscribe the page to `messages`, `messaging_postbacks`, and `feed`.
- Redeploy or trigger a fresh Vercel deployment after changing environment
  variables.
- Test Messenger first, then test a controlled post comment while
  `META_COMMENTS_ALLOWED_POST_IDS` is set to that post id.

Important:

- Keep `META_PAGE_ACCESS_TOKEN` only in Vercel environment variables.
- Do not commit tokens into the repository.
- After changing Meta callback URL or verify token, use Meta Developer Console to
  verify and subscribe the page webhook again.
