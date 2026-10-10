Daftar AlHesab v22 — actual app corrections

Implemented in source files:
- index.html: owner dashboard on startup with total customer count and total outstanding debt across customers.
- Customer selection is on the owner home page; the owner must choose a customer and press Confirm to open that customer's existing account.
- Account navigation and quick actions stay hidden until a customer is confirmed.
- Customer pages read normalized existing localStorage client records to avoid blank screens from older/incomplete records, without clearing transaction entries.
- The owner dashboard can create a new customer directly.
- A header button returns to the owner dashboard and requires reselecting a customer.
- portal.html: transaction history and reports remain separate; transaction history shows latest 3 by default with toggle to all/back; reports include customer name, phone, and report generated timestamp down to seconds.
- sw.js cache version bumped to force updated shell.

Preserves current storage keys and Cloudflare Worker/D1 files.
Validation performed: Node syntax checks for all inline app scripts, worker.js, and sw.js. Not live-tested on Cloudflare.
