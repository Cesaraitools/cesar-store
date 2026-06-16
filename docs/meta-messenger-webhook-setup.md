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

Comment automation safety:

- `META_COMMENTS_AUTO_REPLY` is disabled by default. Keep it `false` until the
  comment flow is tested with controlled posts.
- If AI is enabled and successfully writes a reply, the endpoint trusts the AI
  action instead of blocking on `meta.bestScore`. If AI is disabled or fails,
  deterministic replies still require at least one product and `meta.bestScore`
  greater than or equal to `META_COMMENTS_MIN_SCORE`.
- To limit auto replies to controlled test posts, set
  `META_COMMENTS_ALLOWED_POST_IDS` to one or more comma-separated Facebook post
  ids. Leave it empty to allow all posts once the automation is ready.
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
