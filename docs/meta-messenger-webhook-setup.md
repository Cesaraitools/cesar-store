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
META_APP_SECRET=<Meta app secret, optional but recommended>
META_GRAPH_API_VERSION=v20.0
META_COMMENTS_AUTO_REPLY=false
META_COMMENTS_MIN_SCORE=10
```

The endpoint:

1. Responds to Meta webhook verification.
2. Ignores non-page events, empty messages, echoes, duplicates, and rate-limited
   senders.
3. Reuses the existing Cesar Store product automation search.
4. Sends a text reply through the Facebook Graph API.
5. Receives Page feed comment events when the page is subscribed to the `feed`
   webhook field.
6. Stores unclear or disabled comment replies as handoff records in Redis under
   `meta:comment:handoffs` and logs them in Vercel.

Comment automation safety:

- `META_COMMENTS_AUTO_REPLY` is disabled by default. Keep it `false` until the
  comment flow is tested with controlled posts.
- If enabled, the endpoint only replies to comments when the catalog search has
  at least one product and `meta.bestScore` is greater than or equal to
  `META_COMMENTS_MIN_SCORE`.
- Ambiguous comments, rate-limited posts, and comments with no confident product
  match are sent to human handoff instead of receiving an automatic public
  reply.

Meta subscriptions:

- Messenger replies require the page webhook fields `messages` and
  `messaging_postbacks`.
- Comment automation requires the page webhook field `feed`.
- Public comment replies may require Meta App Review permissions such as
  `pages_manage_engagement` and `pages_read_engagement`, depending on app mode
  and the audience being served.

Important:

- Keep `META_PAGE_ACCESS_TOKEN` only in Vercel environment variables.
- Do not commit tokens into the repository.
- After changing Meta callback URL or verify token, use Meta Developer Console to
  verify and subscribe the page webhook again.
