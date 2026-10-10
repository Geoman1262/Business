v17 — Home customer selector and protected pages

Changes:
- Customer selection is now on the main/home page.
- Removed the separate Customers tab/page to avoid duplicate flow.
- Account, History, Reports, and Settings remain locked until a customer is selected on Home and the user presses Confirm.
- The selected customer data is normalized before rendering to prevent blank screens when older customer records are incomplete.
- Navigating back to Home no longer silently revokes access to the selected account.
- Added a new service-worker cache version so browsers fetch the updated app shell.

Data keys remain unchanged: debt_book_v1, debt_book_clients_v1, debt_book_active_client_v1.
