v28 — Direct WhatsApp request flow

Change: the customer request button no longer calls /api/order (the route that returned HTML and caused Unexpected token '<'). It validates the amount/details locally and opens WhatsApp to +96181024686 with a prefilled message containing customer name, amount, details, available credit, and the customer portal URL.

Important limitation: this direct flow does not create a stored pending order or an admin approval link. It only sends the request details via WhatsApp. The account debt must be added manually after the owner approves it. This change does not modify the database or Worker.
