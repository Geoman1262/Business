# Daftar AlHesab v20 — Customer transactions + reports

Updated `portal.html` to separate account transactions from reports. The customer portal opens on Account Transactions, shows the latest 3 transactions by default, supports All/Purchases/Payments filters, expands to all transactions, and provides expandable transaction details including amount, balance after transaction, debt paid/remaining, and payment allocations. Reports are in a separate tab and retain date/type filters, CSV export, and print/save PDF.

Install: replace only `portal.html` in the existing project, commit/push to GitHub, then deploy Cloudflare Worker as usual. JavaScript syntax was checked with Node; live deployment and browser behavior have not been tested.
