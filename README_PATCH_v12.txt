Daftar AlHesab v12 - Purchase Credit Preview

Changes:
- Main merchant app: when opening Add Purchase / Debt, a live credit summary is shown.
- The summary updates while typing the purchase amount: credit limit, current debt, allowed amount before purchase, entered purchase amount, projected debt, and remaining allowed amount.
- If the customer is already over limit, or the proposed purchase would exceed the limit, a visible warning appears. Purchases are not blocked automatically; existing behavior is preserved.
- Opening any existing debt/purchase record in Recent Operations or History shows the credit limit and allowed amount before/after that historical purchase.
- No database schema or localStorage keys changed.

Deploy as usual after backing up existing repository files. JavaScript syntax checked with Node; not deployed or live-tested.
