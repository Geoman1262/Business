/*
 * Worker integration checklist/template — DO NOT paste this over worker.js.
 *
 * Required routes:
 *
 * GET /api/push/public-key
 *   Return { ok: true, publicKey: env.VAPID_PUBLIC_KEY }.
 *
 * POST /api/portal/push-subscription
 *   - Parse { token, subscription }.
 *   - Resolve token using the same secure lookup as GET /api/portal.
 *   - Store the subscription against the resolved client ID in D1.
 *   - Never trust a client ID supplied by the browser.
 *
 * On successful debt creation:
 *   await notifyClient(env, clientId, {
 *     title: 'دفتر الحساب',
 *     body: `تم تسجيل دين جديد بقيمة ${amount}.`,
 *     url: '/portal.html',
 *     tag: `debt-${entryId}`
 *   });
 *
 * On successful payment creation:
 *   await notifyClient(env, clientId, {
 *     title: 'دفتر الحساب',
 *     body: `تم تسجيل دفعة بقيمة ${amount}.`,
 *     url: '/portal.html',
 *     tag: `payment-${entryId}`
 *   });
 *
 * IMPORTANT:
 * - Call notifyClient only after the D1 transaction succeeds.
 * - Catch push failures so they do not undo a valid debt/payment.
 * - Implement Web Push encryption + VAPID signing with a Worker-compatible
 *   implementation/library; fetch alone is not sufficient to send Push.
 * - Remove subscriptions when the push service returns 404/410.
 * - Keep each subscription bound to the account token's resolved client ID.
 *
 * This file intentionally does not invent the schema or mutate your existing
 * worker logic. Integrate only after checking the current worker.js.
 */
