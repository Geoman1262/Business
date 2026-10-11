v28 — Request Link + Admin Approval

Workflow:
1. Customer fills amount and details, then presses “تقديم طلب / Submit request”.
2. Worker stores the request and creates a secure review token.
3. The portal displays a WhatsApp link; customer must tap it to open WhatsApp with the message and admin review URL.
4. Owner taps the review URL inside WhatsApp to open order-review.html, then edits amount/details and approves or rejects.
5. Only approval records the debt. Repeated approvals are rejected by the Worker.

This patch adds CREATE TABLE IF NOT EXISTS for client_orders on order creation, which is safe for existing data and avoids requiring a manual migration for this table. It does not drop or reset any table. Keep the existing DB binding and ADMIN_KEY. Deploy Worker and assets together, then test with a small request before real use.
