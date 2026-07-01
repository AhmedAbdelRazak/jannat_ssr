# Jannat Booking SSR Implementation Summary - 2026-06-19

This document captures the implementation work completed while preparing the SSR public site, payment flows, backend support, and PMS payment-link generation for GitHub publication.

## Public SSR Experience

- Added the shared hero sky treatment with a crescent and subtle static star glow/fade animation across hero components.
- Tuned star density and sizing so image-backed heroes stay readable and the stars feel layered rather than noisy.
- Follow-up on 2026-06-20: optimized the hero sky treatment for cell phones only. Desktop keeps the full animated star glow, crescent glints, and hero image zoom, while phone/tablet breakpoints use fewer smaller stars, static lightweight glow, no animated filters, no star flash loops, and no mobile hero image zoom.
- Follow-up on 2026-06-20: tightened mobile home hero text and CTA sizing in English and Arabic so the title, copy, and two buttons remain balanced in the first viewport.
- Improved room search defaults so Makkah is selected by default for general searches.
- Enhanced the global currency selector styling and behavior, with SAR as the default display currency.
- Added more supported display currencies for key guest markets: SAR, USD, EUR, GBP, JOD, DZD, EGP, PKR, INR, MYR, and IDR.
- Kept hotel ledger pricing as SAR while allowing guests to view converted display amounts throughout the UI.
- Improved room listing cards, single-hotel room cards, image sizing, spacing, hotel name display, and no-wrap action buttons.
- Added a responsive room image modal/gallery with thumbnails for single-hotel room images.
- Fixed the single-hotel map display.
- Added a single-hotel date selector for standard room searches.
- Added offers/packages display when active offers exist, including single-hotel tabs and navigation visibility.
- Corrected offer handling so fixed-package totals stay totals, not nightly rates.
- Added Hijri and Gregorian offer date handling so offer nights, cart totals, and checkout context are calculated from the intended fixed offer period.
- Ensured offer cart items do not allow date edits because offer dates are predetermined.
- Reordered single-hotel section navigation to match page order, removed the redundant hotel-about link, and added active-section highlighting.
- Fixed cart count hover alignment.

## Chat And Support Widget

- Added a styled conversation-language selector inside the chat window.
- Kept chat language independent from the web app language after initialization.
- Defaulted chat language from the site language when the chat first opens.
- Added additional chat conversation languages, including Indonesian and Malay/Malaysian.
- Fixed the dropdown arrow styling and responsive layout.
- Updated the default chat message/template to follow the selected chat conversation language unless the user has already edited the message manually.
- Preserved support case payload language fields for backend/admin customer-service visibility.
- Follow-up on 2026-06-23: after a guest ends a support case, the rating state
  now takes over the whole chat body like the legacy frontend behavior, while
  keeping the newer SSR visual style, localized copy, and mobile-safe sizing.
- Follow-up on 2026-06-23: support-case creation always sends the initial chat
  textarea message, including the generated friendly intro. This prevents a
  live case from starting with only the backend "reviewing your message" hold
  entry and no AI-answerable guest turn.
- Follow-up on 2026-06-23: AI typing events are treated separately from guest
  typing events, so "Nadia is typing..." remains visible even if the guest is
  actively composing a reply.
- Follow-up on 2026-06-30: the first public chat message now schedules the same
  local AI typing fallback used by normal guest replies. This protects the first
  "agent is typing..." window when a new support case is created and the socket
  room joins a moment after the backend has already started processing.

## Checkout

- Replaced nationality free text with a dropdown list.
- Removed temporary passport-number and passport-expiry fields from the public checkout page.
- Added query-parameter sync for checkout guest details after field blur, so refresh/share flows can preserve entered data without updating the URL on every keystroke.
- Made the cart review panel sticky on desktop.
- Changed desktop checkout fields to a two-column layout while keeping notes/comments on their own row.
- Added single-message validation with field/checkbox highlighting, and removed highlights after correction.
- Applied the same validation behavior to PayPal buttons and direct card/pay button flows.
- Kept required guest fields, nationality, payment method, terms acceptance, and cart state as blockers before reservation/payment submission.
- Preserved SAR as the reservation ledger currency.
- Converted PayPal charge amounts dynamically to USD before sending payment amounts to PayPal.
- Continued showing the guest-selected display currency in the UI without changing the SAR ledger amount or the USD PayPal charge amount.

## Private Client Payment Links

- Built the public SSR client-payment page for links generated by the hotel PMS.
- Kept the page noindex/private and outside sitemap/llms discovery.
- Added a professional reservation/payment summary with guest, hotel, confirmation, balance, payment option, reserved rooms, room display names, room count, nights, Gregorian dates, and Hijri dates.
- Displayed date ranges with explicit From/To labels instead of a bare dash.
- Made the payment panel sticky on desktop.
- Preserved PayPal buttons and card funding through PayPal where available.
- Added successful-payment handling that can create or reuse a guest account/session so the guest can reach a dashboard/confirmation/invoice experience after paying.

## PMS Payment Link Generation

- Updated hotels_frontend reservation detail modals so hotel staff choose payment-link language and display currency before generating/copying/opening a guest payment link.
- Defaults remain English and SAR.
- Generated links now target the SSR route:
  - `/client-payment/{reservationId}/{confirmation}?lang={language}&currency={currency}`
- The generated link can be copied, opened, used in email templates, and used in WhatsApp messages with the selected query parameters.

## Backend Support

- Added/updated public support-case endpoints for SSR chat/contact flows.
- Added backend language handling for public support cases so admin customer service can see the guest's preferred conversation language.
- Added public-safe client payment support for SSR payment-link captures.
- Ensured successful paid client-payment links can create/reuse guest accounts and attach a dashboard session response.
- Preserved payment safety:
  - PayPal capture status is the paid source of truth.
  - SAR remains the reservation/hotel ledger currency.
  - PayPal captures are created/verified in USD using dynamic conversion.
  - Public endpoints must not expose payment credentials, card data, or private admin fields.

## Analytics And Conversion Tracking

- Google Analytics and Meta/Facebook Pixel are loaded by the shared Analytics component.
- Added a Meta noscript fallback pixel image.
- Added route-change page view handling while avoiding duplicate initial page views.
- Added a safer conversion taxonomy:
  - `search` / Meta `Search`
  - `view_item` / Meta `ViewContent`
  - `select_item`
  - `add_to_cart` / Meta `AddToCart`
  - `begin_checkout` / Meta `InitiateCheckout`
  - unpaid reservation requests as `generate_lead` / Meta `Lead`
  - contact/support as `contact` / Meta `Contact`
  - paid PayPal captures as `purchase` / Meta `Purchase`
  - payment-link views and payment-option selections as supporting intent events
- Added event IDs for stronger event deduplication readiness.
- Normalized ecommerce payloads with item IDs, names, categories, quantity, value, and currency.
- Filtered accidental PII-like keys from analytics payloads, including email, phone, fullName, guestName, customerName, customerEmail, and customerPhone.
- Kept legacy custom event names available through GA and Meta custom events for continuity.

## Environment Notes

- SSR public analytics IDs remain public env values and should be verified before production launch.
- PayPal environment/client IDs must be sandbox values in test and production values in production.
- Exchange-rate behavior should remain dynamic through the backend/API path; do not hard-code exchange rates in SSR.
- `NEXT_PUBLIC_SITE_URL`/canonical domain values should be confirmed before final production deployment.

## Validation Performed

- `npm run build` passed in `jannatbooking_ssr`.
- 2026-06-20 mobile hero follow-up validation:
  - `npm run build` passed in `jannatbooking_ssr`.
  - Playwright mobile screenshots for `/?lang=en` and `/?lang=ar` confirmed smaller glowy stars and clean hero text/buttons.
  - Playwright computed styles confirmed mobile star animations and filters are disabled, visible mobile stars are reduced, and desktop star/hero animations remain active.
- `npm run build` passed in `hotels_frontend`.
- `node --check controllers/paypal_reservation.js` passed in `hotels_backend`.
- Browser smoke test confirmed:
  - SSR home loads on port 3104.
  - `window.gtag` is present.
  - `window.fbq` is present.
  - Client payment page loads with payment summary content.

## Repositories Involved

- SSR public app: `D:\JannatBooking\jannatbooking_ssr`
- Backend API: `D:\JannatBooking\hotels_backend`
- Hotel PMS/admin app: `D:\JannatBooking\hotels_frontend`
