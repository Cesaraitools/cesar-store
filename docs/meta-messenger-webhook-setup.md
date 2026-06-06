# Meta Messenger Webhook Setup

This replaces the n8n Cloud workflow for Cesar Store Messenger automation.

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
```

The endpoint:

1. Responds to Meta webhook verification.
2. Ignores non-page events, empty messages, echoes, duplicates, and rate-limited
   senders.
3. Reuses the existing Cesar Store product automation search.
4. Sends a text reply through the Facebook Graph API.

Important:

- Keep `META_PAGE_ACCESS_TOKEN` only in Vercel environment variables.
- Do not commit tokens into the repository.
- After changing Meta callback URL or verify token, use Meta Developer Console to
  verify and subscribe the page webhook again.
