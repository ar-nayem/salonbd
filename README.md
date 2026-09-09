# SalonBD

Barber and salon marketplace for Bangladesh. Customers find a shop by area, see real prices,
pick a barber and a time, and pay cash at the chair or online. Shop owners get a dashboard for
services, barbers, hours, bookings, a walk-in queue, reviews, promos and earnings. A platform
admin verifies shops, sets commission and settles payouts.

Bangla and English throughout (toggle in the header), mobile-first, installable as a PWA.

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

## How availability works

`src/lib/availability.ts` builds each barber's open windows for a date from their own hours, or
the shop's hours when they have no override, subtracts holidays and leave, subtracts existing
bookings, then walks the remaining windows in `slotStepMin` steps looking for a gap that fits the
selected services. A shop with no barbers on file is treated as one bookable resource.

Bookings re-check the slot at write time, and a second check inside the write transaction rolls
back the loser when two customers submit the same slot at once.

## Project layout

```
src/app                 routes: public, /bookings, /dashboard (owner), /admin
src/app/dashboard/actions.ts  owner mutations (server actions)
src/app/admin/actions.ts      admin mutations
src/lib/availability.ts slot engine
src/lib/booking.ts      booking creation, rating recompute
src/lib/payments.ts     gateway abstraction + settlement
src/lib/auth.ts         sessions, password hashing, guards
src/lib/dictionaries.ts Bangla and English strings
prisma/schema.prisma    data model
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
- Images are referenced by URL. There is no upload pipeline yet.
- No SMS yet: phone numbers are stored and validated but not verified with an OTP.
