# VNPay checkout

The implementation follows the [VNPay 2.1.0 payment integration guide](https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html). Create a VNPay sandbox merchant account before testing with the hosted gateway.

## API configuration

Set these variables in `FITZY-API/.env`, then restart the API:

```dotenv
VNPAY_TMN_CODE=<sandbox merchant code>
VNPAY_HASH_SECRET=<sandbox hash secret>
VNPAY_PAYMENT_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_RETURN_URL=https://<public-api-host>/api/payments/return/vnpay
VNPAY_IPN_URL=https://<public-api-host>/api/payments/ipn/vnpay
FITZY_PAYMENT_RETURN_URL=fitzy://payment-result
```

Register the exact public HTTPS IPN URL with VNPay. This environment variable gates availability in FITZY; it does not register the URL with VNPay or add it to the checkout request. For local testing, expose API port 4000 through an HTTPS tunnel and use that host for both callback URLs. Set `EXPO_PUBLIC_API_URL` to an address reachable by the phone, ending with `/api`.

Use an installed development/release app that registers the `fitzy` URL scheme. Expo Go does not register this app-specific scheme, so use a development build for the complete browser-to-app return flow. Changing the scheme requires rebuilding the app.

## Flow

1. Checkout fetches `/api/payments/methods`; VNPay appears once all four required merchant/callback settings are present.
2. `POST /api/orders` calculates the amount on the server and reserves stock. It returns the saved order and `paymentUrl`.
3. The server signs sorted, form-encoded parameters with HMAC-SHA512. The amount is VND multiplied by 100; the expiry matches the order's 15-minute reservation in Vietnam time.
4. Mobile opens the gateway in the browser and keeps the order detail screen available underneath.
5. VNPay calls the IPN endpoint. FITZY checks the signature, merchant, transaction reference, amount, expiry and payable state before updating payment status. Success saves `gatewayTransactionId` and `paidAt`, and removes the payment link. Duplicate notifications cannot overwrite a paid order.
6. The return endpoint verifies the browser callback without changing the order and redirects to `fitzy://payment-result?gateway=vnpay&orderId=...&order=...&status=pending&responseCode=...`. Invalid results have `status=invalid` and no order identifier. Existing query parameters on the configured return URL are preserved.
7. The result screen fetches the authenticated order and polls every 3 seconds, up to 10 requests, while waiting for IPN. It provides manual refresh and order detail navigation. Authentication and order ownership are checked by the API; deep-link status values never mark an order paid.
8. Failed/cancelled gateway attempts remain unpaid. The expiry sweep cancels overdue unpaid online orders and releases reserved stock and promotion usage. A late success cannot revive a cancelled or expired order; reconcile such a charge through the merchant portal.

IPN acknowledgements: `00` updated, `02` already paid or no longer payable, `01` missing order, `04` incorrect amount, `97` invalid signature/merchant, `99` malformed data or processing error. The endpoint returns HTTP 200 with `RspCode` and `Message`.

## Verification

Run `npm test --workspace fitzy-api` and `npm run lint` from the repository root. Integration tests use an ephemeral MongoDB replica set and test signed URL encoding, successful and failed payments, repeated callbacks, tampered signatures, wrong amounts/merchants, malformed values, read-only returns, ownership, cancellation and expiry.

With sandbox credentials and a development app installed, also verify:

- A successful sandbox checkout returns to the result screen and eventually displays the order as paid in both mobile and Admin.
- Cancelling at the gateway never marks the order paid.
- Returning before IPN initially displays a waiting state, then updates after IPN arrives.
- Closing the browser still allows checking or continuing the pending payment from order detail.
- An unpaid order expires and returns inventory after 15 minutes.

Automated tests do not contact VNPay or perform a bank transaction. Merchant credentials, callback registration and device return behavior require the sandbox walkthrough above.
