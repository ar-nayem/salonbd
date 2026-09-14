# SalonBD

Barber and salon marketplace for Bangladesh. Customers find a shop by area, see real prices,
pick a barber and a time, and pay cash at the chair or online. Shop owners get a dashboard for
services, barbers, hours, bookings, a walk-in queue, reviews, promos and earnings. A platform
admin verifies shops, sets commission and settles payouts.

Bangla and English throughout (toggle in the header), mobile-first, installable as a PWA.

## What is in it

**Buyers** — search by area, service, rating or distance; shop pages with services,
option groups, add-ons, team, gallery and reviews; a four-step booking flow; walk-in queue
tokens; guest checkout with an account offered afterwards; live order tracking with a status
timeline; per-booking messaging with the shop; reviews with photos, tags, per-service ratings and
helpful votes.

**Shops** — an operations board with one-step status advances, a wall display for the floor,
a QR scanner for verifying bookings, printable QR codes for the shop, price list, chairs, services
and promotions, chair management, a team roster with roles, catalog with option groups, add-ons,
offer prices and real image uploads, hours and leave, walk-in queue, review replies, promo codes
and earnings.

**Platform admin** — shop approval queue and lifecycle, per-shop commission, user roles and
blocking, sales analytics over 7/30/90 days, per-shop settlement and 12-month payout history,
customer list with CSV export and masked phones, and age demographics from self-reported dates of
birth.

## Stack

- Next.js 16 (App Router, React 19, server actions) + TypeScript
- Tailwind CSS v4
- Prisma 6 + SQLite (swap the datasource for Postgres when the load asks for it)
- Custom session auth: phone + password, email + password, Google OAuth — JWT in an httpOnly cookie
- Payments: SSLCommerz or bKash tokenized checkout, with a built-in sandbox gateway for local work

## Run it

```bash
npm install
npm run db:push
npm run db:seed
npm run dev
```

Then open http://localhost:4420.

Seeded logins (password `password123` for all):

| Role     | Login                  |
| -------- | ---------------------- |
| Admin    | admin@salonbd.app      |
| Owner    | owner1@salonbd.app     |
| Customer | customer@salonbd.app   |

## Environment

Copy `.env.example` to `.env`.

| Variable | Meaning |
| --- | --- |
| `DATABASE_URL` | SQLite file path, e.g. `file:./dev.db` |
| `AUTH_SECRET` | Session signing key. At least 16 characters, random in production |
| `APP_URL` | Public origin. Payment callbacks and OAuth redirects are built from it |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Optional. When empty, the Google button is hidden |
| `PAYMENT_PROVIDER` | `MOCK`, `SSLCOMMERZ` or `BKASH` |
| `SSLCZ_*` | SSLCommerz store id, password, and `SSLCZ_SANDBOX=false` for live |
| `BKASH_*` | bKash app key, app secret, username, password, `BKASH_SANDBOX=false` for live |

Google OAuth redirect URI: `<APP_URL>/api/auth/google/callback`.

### Payments

`PAYMENT_PROVIDER=MOCK` (the default) sends the customer to a local sandbox page with "Pay now"
and "Simulate failure" buttons, so the whole flow works with no merchant account.

`SSLCOMMERZ` is the practical choice for Bangladesh — one integration covers bKash, Nagad, Rocket
and cards. `BKASH` talks to bKash tokenized checkout directly. Both settle through
`settlePayment()`, which is idempotent, checks the amount against the payment row, and confirms
the booking. SSLCommerz also settles from its IPN, because the browser redirect can be lost.

Per shop, the owner chooses cash, online, or both, and an advance deposit percent (0 = pay the
full amount online). The remainder shows as "due at shop" and is settled when the shop marks the
booking completed.

## Calendar and reminders

A website cannot write into a phone's calendar on its own — both iOS and Android require one tap.
So a booking reaches the phone three ways:

- **Add to calendar** on the booking page: a signed `.ics` link (Apple Calendar honours its two
  alarms, 1 day and 1 hour before) and a Google Calendar link (Google applies its own default alert
  and ignores alarms in imported events). The button order follows the device.
- **Calendar subscription**: a personal `webcal://` feed behind a rotatable secret token. Subscribe
  once and every later booking appears on its own; a cancellation arrives as `STATUS:CANCELLED` on
  the same UID with a higher SEQUENCE, so the event updates instead of duplicating. Google polls
  subscriptions every few hours; Apple honours the one-hour refresh hint.
- **Server reminders**, because calendar alarms depend on the calendar app: `/api/cron/reminders`
  runs every 5 minutes and sends a day-before and an hour-before reminder to the in-app inbox and by
  Web Push. Each (booking, kind) is claimed with a unique row before sending, so overlapping runs
  never remind twice. A booking made inside a window skips that window. Email and SMS go out
  through the same run once a real provider is wired in.

Web Push on iPhone works only after the site is added to the Home Screen (iOS 16.4+); the reminder
card says so on iOS Safari. On Android, Chrome delivers through Google's push service.

Production cron (root crontab):

```
*/5 * * * * curl -fsS -m 60 -H "Authorization: Bearer $CRON_SECRET" http://127.0.0.1:7700/api/cron/reminders > /dev/null
```

## Decisions worth knowing

**QR codes carry a token, nothing else.** A printed code encodes only `/q/<token>` with an
opaque random token — never a database id, never PII, never the destination. One server-side
resolver turns a token into a destination: it looks the code up, checks it is still active, logs
the scan, bumps the counter, then redirects or renders. Chair codes pass the token onward
(`?qr=<token>`), and both the page and the booking endpoint re-resolve the chair from it. Staff of
that shop who scan a booking code get a verification panel; everyone else gets the buyer's own
read-only view. Redirect URLs are built from `APP_URL`, never from the incoming request — behind a
reverse proxy the request URL resolves to the internal bind address and every printed sticker would
point at localhost.

**One status map.** `src/lib/status.ts` owns the flow per fulfilment type and the "what comes
next, and what should the button say" answer. The board, the QR verification panel and the API all
read from it, and `advanceBooking()` refuses anything that is not exactly one step — a scan cannot
jump a booking from "just accepted" to "finished". Every change is written as its own event row, so
the buyer's timeline shows what happened rather than what the current status implies.

**Tenancy is resolved from the session.** A shop id in a form or body is only ever used to pick
between shops the caller already belongs to. A valid session on the wrong shop gets 404, not 403 —
a 403 confirms the record exists. Messaging derives "who may open this thread" from the same
function as "who may open this booking", so a second check cannot drift from the first.

**Idempotent checkout.** The client mints one key when it reaches the payment step and reuses it
across retries; the column is unique, and a duplicate submission returns the existing booking
instead of creating a second one or erroring.

**Money.** Analytics count only bookings that were actually paid. Commission is rounded per shop
per period and only then summed, so the summary always equals the sum of its own rows. Date buckets
are built from the local `yyyy-mm-dd` strings bookings are stored with, never from a UTC timestamp,
and empty days are filled with zeroes. CSV exports are RFC 4180 quoted, so a comma in a name cannot
shift every following column.

**Placeholders say they are placeholders.** Email and SMS sit behind a one-method interface with
a logging implementation that reports failure rather than silent success, so a one-time code is
never followed by "check your inbox" when nothing was sent. The sandbox payment gateway is
explicit about being one.

## How availability works

`src/lib/availability.ts` builds each barber's open windows for a date from their own hours, or
the shop's hours when they have no override, subtracts holidays and leave, subtracts existing
bookings, then walks the remaining windows in `slotStepMin` steps looking for a gap that fits the
selected services. A shop with no barbers on file is treated as one bookable resource.

Bookings re-check the slot at write time, and a second check inside the write transaction rolls
back the loser when two customers submit the same slot at once.

## Project layout

```
src/app                       public routes, /bookings, /dashboard (shop), /admin
src/app/q/[token]             the one QR resolver
src/app/dashboard/actions.ts  shop mutations (server actions)
src/app/admin/actions.ts      admin mutations
src/middleware.ts             first-pass route protection for /dashboard and /admin
src/lib/status.ts             the shared booking status map
src/lib/booking-flow.ts       advance / cancel, one step at a time
src/lib/availability.ts       slot engine
src/lib/pricing.ts            server-side cart pricing (options and add-ons)
src/lib/booking.ts            booking creation, idempotency, rating recompute
src/lib/tenancy.ts            who may act on which shop
src/lib/booking-access.ts     the single "who may see this booking" rule
src/lib/qr.ts                 token creation, resolution, scan logging
src/lib/payments.ts           gateway abstraction + settlement
src/lib/notifications.ts      notification / email / SMS interfaces
src/lib/otp.ts                one-time codes (hashed, rate limited)
src/lib/uploads.ts            file storage outside the static tree
src/lib/analytics.ts          paid-only aggregates, local date buckets
src/lib/csv.ts                RFC 4180 export
src/lib/dictionaries.ts       Bangla and English strings
prisma/schema.prisma          data model
storage/uploads               uploaded files (gitignored)
```

## Deploying

Build on the server, then serve with pm2 behind nginx:

```bash
npm ci
npx prisma db push
npm run build
pm2 start npm --name salonbd -- start
```

Stop the running process before building — a build while pm2 is serving can corrupt live requests.
Set `APP_URL` to the public https origin before building, and point the gateway's callback URLs at
it.

## Known limits

- Sessions are stateless JWTs; a logout on one device does not revoke other devices.
- Rate limiting is in-process, so it counts per Node process. Move it to Redis if you run more
  than one instance.
- No realtime transport. The tracking page, the board and the inbox poll on a short interval; the
  code says so where it happens.
- One-time codes are generated and verified, but no email or SMS provider is wired up, so the
  request endpoint returns a delivery failure and the code is only visible in the server log.
- Home service is modelled end to end and kept behind `FEATURE_HOME_SERVICE`, which is off. There
  is no address book, no travel time and no delivery flow.
- No reverse geocoding provider, so "use my location" sorts by distance but does not name the
  place.
- Refunds are modelled on the payment row but have no UI.

## Production

Live at https://salon.arnayem.top (Vultr box, nginx → pm2 `salonbd` on port 7700,
`/var/www/salonbd`).

```bash
cd /var/www/salonbd
git pull
pm2 stop salonbd
npm ci
node node_modules/.bin/prisma db push
npm run build > /tmp/salonbd-build.log 2>&1; echo "EXIT=$?"
test -f .next/BUILD_ID && pm2 restart salonbd
```

Stop before building: a build while pm2 is serving can corrupt live requests, and a failed build
destroys the previous `.next` with nothing to roll back to — check `BUILD_ID` exists before
restarting. The build script pins `--max-old-space-size=1400` because `next build` outgrows the
950MB box otherwise and V8 aborts mid-build.
