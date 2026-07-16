# Jannat Booking SSR

Next.js SSR public website for Jannat Booking.

## Local Development

```bash
npm install
npm run dev
```

The dev server runs on port `3104`.

## Public API Endpoints

The public site reads only public Jannat backend endpoints:

- `/api/janat-website-document`
- `/api/active-hotels`
- `/api/active-hotel-list`
- `/api/distinct-rooms`
- `/api/single-hotel/:slug`
- `/api/room-query-list/:query`
- `/api/hotels/active-with-deals`
- `/api/support-cases/new`
- `/api/support-cases/client/:id`

Checkout, payment, reservation, and dashboard routes are treated as private or noindex surfaces.

## SEO And Trust

- Dynamic `robots.txt`, `sitemap.xml`, and `llms.txt` are implemented.
- Public crawler access is allowed for marketing, hotel, terms, privacy, and property-listing pages.
- Private checkout, payment, reservation, dashboard, auth, and verification routes are noindex.
- Global JSON-LD includes Organization, WebSite, TravelAgency, and FAQ trust signals.
- Trust copy covers operating since 2019, PayPal and major card payment support, hashed account-password handling, sanitized public receipts, and direct hotel-reception coordination.

## Analytics And Chat

- Google Analytics and Facebook Pixel load from `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID` / `NEXT_PUBLIC_FACEBOOK_PIXEL_ID`.
- Standard conversion events are emitted for search, hotel views, add-to-cart, checkout start, leads, contact, chat, and reservation requests while preserving legacy custom event names.
- Payment amount selection and payment button/order creation are tracked as `add_payment_info` / Meta `AddPaymentInfo`; successful browser payment completion remains `purchase` / Meta `Purchase`.
- Backend Conversion API / Measurement Protocol dispatch remains owned by the backend analytics services.
- The support widget supports query-param state such as `chat=open`, `chatName`, `chatContact`, `chatHotelId`, `chatHotelName`, `chatInquiry`, `chatDetails`, and `chatLanguage`.
- Stored chat state is only auto-restored when it still belongs to the current single-hotel page. Visiting the home page clears stale stored chat cases so a deleted/old case cannot reopen as a blank mobile chat shell.
- Chat message sends use optimistic rendering with a unique `clientTag`. If a mobile send times out, the widget re-fetches the case and verifies that tag before showing an error, preventing false "message failed" notices when the backend saved the message slightly after the request timeout.

## Verification

- `npm run build`
- `npm audit --omit=dev`
- Temporary Playwright screenshots may be saved under `test-artifacts/` during UI checks, but that folder should be deleted after review.

## Full Reference

- [`JANNATBOOKING_SSR_REFERENCE.txt`](JANNATBOOKING_SSR_REFERENCE.txt)
- Backend companion: [`JANNATBOOKING_SSR_BACKEND_REFERENCE.txt`](../hotels_backend/JANNATBOOKING_SSR_BACKEND_REFERENCE.txt)
