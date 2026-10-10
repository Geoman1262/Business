Daftar AlHesab v21 - force-refresh customer portal

Actual files included from v20 plus a service-worker cache version bump (v4 -> v5) so deployed browsers install the updated portal files instead of keeping an old cached shell.

For the customer transaction/report change, upload the whole project folder to GitHub and deploy it to Cloudflare. Do not upload portal.html alone if you also need the cache refresh: sw.js must be deployed too.

portal.html includes the customer transaction section with 3 recent transactions by default, a View all / Show last 3 toggle, filters, expandable transaction details, and a separate Reports section with no duplicated transaction list below it.

No customer data/localStorage keys were changed. Test the actual customer portal URL after deployment.
