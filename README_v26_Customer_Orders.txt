Customer order requests feature (based on v25)

Added only the agreed customer-order workflow:
- Customer portal requires amount and details.
- Amount must be positive and within the current available credit; server checks again.
- Request is stored as pending and does not affect the account balance.
- WhatsApp opens a prefilled message to +96181024686; the customer sends it manually.
- The message contains a private review link.
- Owner can edit amount/details, approve and register as a debt, or reject.
- Review link is a bearer secret; do not share it. Requests can only be processed once.
- Approval rechecks current available credit.

Before deployment, apply the new D1 migration:
  npx wrangler d1 migrations apply business-clients --remote
Then deploy from this directory:
  npx wrangler deploy

The D1 migration adds only the client_orders table and indexes; it does not alter existing account rows.
No live deployment or end-to-end Cloudflare/WhatsApp test has been performed here. JavaScript syntax checks are not a substitute for a staged integration test. Test first in a separate preview/staging environment.
