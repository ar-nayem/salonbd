# Google Play submission notes

URLs the Console asks for:

| Field | Value |
| --- | --- |
| Privacy policy | https://salon.arnayem.top/privacy |
| Account deletion | https://salon.arnayem.top/delete-account |
| Support email | nayem3622@gmail.com |
| App website | https://salon.arnayem.top |

## Data safety form

Answer these exactly; every row was checked against `prisma/schema.prisma` and the code that
writes it. "Shared" in Play's sense means sent to another company, not shown to the shop you
booked with — the shop is a user of the same app, which Play counts as *collected*, not *shared*.

| Data type | Collected | Shared | Required | Purpose |
| --- | --- | --- | --- | --- |
| Name | Yes | No | Yes | App functionality (the shop needs to know who is coming) |
| Email address | Yes | No | Optional | App functionality, account management |
| Phone number | Yes | No | Optional | App functionality, account management |
| User IDs | Yes | No | Yes | App functionality, account management |
| Approximate location | Yes | No | Optional | App functionality (sorting shops by distance) |
| Photos | Yes | No | Optional | App functionality (review photos, message images) |
| In-app messages | Yes | No | Optional | App functionality (customer ↔ shop about one booking) |
| Purchase history | Yes | No | Yes | App functionality (bookings and what was paid) |
| Payment info | No | — | — | Card and wallet details go straight to the payment provider |
| Date of birth | Yes | No | Optional | Analytics (age brackets only, self-reported) |
| Crash logs / diagnostics | No | — | — | No crash reporting or analytics SDK is installed |
| Advertising ID | No | — | — | No ads, no ad SDK |

Other answers:

- **Is data encrypted in transit?** Yes — HTTPS everywhere.
- **Can users request deletion?** Yes — in-app and at the URL above, effective immediately.
- **Data collection is optional for some items** — location, photos, email, date of birth.
- **Does the app share data with third parties?** Payment provider (when paying online) and
  Google/Apple push services (when reminders are on) act as processors for the transaction, not as
  recipients of shared data. Declare no sharing, and explain this in the policy, which it does.

## Play billing

Not required. Bookings pay for a haircut — a real-world service consumed outside the app — which
Play's payments policy exempts. bKash, Nagad and cards through SSLCommerz stay as they are.

## Digital Asset Links

`/.well-known/assetlinks.json` is served by `src/app/api/assetlinks/route.ts` and returns `[]`
until two environment variables are set on the server:

```
ANDROID_PACKAGE_NAME=top.arnayem.salon
ANDROID_CERT_FINGERPRINTS=<upload cert SHA-256>,<Play app signing cert SHA-256>
```

Get the Play signing fingerprint from Play Console → Setup → App signing, after the first upload.
Set both, restart pm2, and confirm the file lists them before releasing — a wrong or missing
fingerprint makes the app open with a browser address bar across the top.

## Content rating

Answer the IARC questionnaire as: no violence, no sexual content, no profanity, no gambling,
no user-generated content visible to strangers *except* reviews and shop photos (declare these),
and yes to "users can interact" (customer ↔ shop messaging).

## Still to do

1. Play Console account, $25, identity verification.
2. Closed test with 12 testers for 14 days (personal accounts only).
3. Build the AAB with Bubblewrap, upload, then fill in the fingerprints above.
4. Store listing: 512×512 icon, 1024×500 feature graphic, phone screenshots, descriptions.
