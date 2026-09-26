# SalonBD — Google Play upload pack

Everything in this folder is ready to upload. Work top to bottom; the order matches the Console.

```
app-release-bundle.aab            <- upload this to Play
app-release-signed.apk            <- install on your own phone to try it first
icon-512.png                      <- app icon
feature-graphic-1024x500.png      <- feature graphic
screenshots/en-*.png              <- 10 phone screenshots, English listing
screenshots/bn-*.png              <- 10 phone screenshots, Bangla listing
```

Signing key and its passwords: `~/Desktop/salonbd-android/`. Keep that folder. Never put it in git.

---

## 0. Try it on your own phone first (5 minutes, no Play account needed)

Copy `app-release-signed.apk` to your Android phone, tap it, allow "install unknown apps".
The app should open salon.arnayem.top full screen with **no browser address bar**. That proves
the Digital Asset Links are right.

If you see an address bar, tell me — it means the fingerprint needs fixing.

---

## 1. Create the account

- https://play.google.com/console — $25 once.
- Choose **Personal** or **Organisation**:
  - Personal: your name and address appear publicly on the listing, and you must run a
    **closed test with 12 testers for 14 straight days** before production opens.
  - Organisation: needs a D-U-N-S number, no 12-tester rule.
- Identity verification takes a day or two. Start it first.

## 2. Create the app

| Field | Value |
| --- | --- |
| App name | SalonBD – Salon & Barber |
| Default language | English (United States) |
| App or game | App |
| Free or paid | Free |

## 3. Store listing

**App name (30 max)**

```
SalonBD – Salon & Barber
```

**Short description (80 max)**

```
Find barbers and salons near you, see real prices, and book a slot in seconds.
```

**Full description**

```
SalonBD is the easy way to book a barber or a salon anywhere in Bangladesh.

No more calling the shop, no more waiting on a bench. Find a shop near you, see exactly what
each service costs, pick your barber and a time that suits you, and get on with your day.

FOR CUSTOMERS

• Search by area, service, rating or distance
• See real prices before you book, not after
• Choose your barber, or let the shop assign one
• Add options and extras — a fade, a hair wash, a blow dry — and watch the price update
• Book for yourself or for someone else
• Pay cash at the shop, or online with bKash, Nagad or a card
• Skip the queue, or take a walk-in token from your phone and watch the line move
• Your booking goes into your phone calendar, and we remind you a day before and an hour before
• Message the shop about your booking
• Rate the shop and your barber afterwards, with photos
• Works in Bangla and English

FOR SHOP OWNERS

Listing your shop is free.

• Take bookings around the clock, even when the shop is closed
• A live board of today's bookings, one tap to move each one along
• A floor display for a screen on the wall
• Scan a customer's code to check them in
• Your own services, prices, options and offers
• Each barber gets their own hours, services and days off
• Printable QR codes for the window, the price list and each chair
• Walk-in queue with token numbers
• Reply to reviews
• Promo codes
• Earnings, with your commission shown clearly

Install it, and the shop you like is two taps away.
```

**Bangla listing (add language bn-BD, use screenshots/bn-*.png)**

Short description:

```
আপনার কাছের সেলুন ও বারবার খুঁজুন, দাম দেখুন, আর কয়েক সেকেন্ডে স্লট বুক করুন।
```

Full description:

```
সেলুনবিডি দিয়ে বাংলাদেশের যেকোনো জায়গায় সেলুন বা বারবার শপ বুক করা সহজ।

ফোন করার দরকার নেই, বেঞ্চে বসে অপেক্ষারও দরকার নেই। কাছের শপ খুঁজুন, কোন সার্ভিসের কত দাম
দেখে নিন, নিজের পছন্দের বারবার ও সময় বেছে নিন।

কাস্টমারদের জন্য

• এলাকা, সার্ভিস, রেটিং বা দূরত্ব দিয়ে খুঁজুন
• বুক করার আগেই আসল দাম দেখুন
• নিজের বারবার বেছে নিন, বা শপকে ঠিক করতে দিন
• ফেড, হেয়ার ওয়াশ, ব্লো ড্রাই — অপশন যোগ করুন, দাম সঙ্গে সঙ্গে আপডেট হবে
• নিজের জন্য বা অন্য কারো জন্য বুক করুন
• দোকানে ক্যাশ, অথবা বিকাশ, নগদ বা কার্ডে অনলাইনে
• সিরিয়াল এড়িয়ে যান, বা ফোন থেকেই টোকেন নিয়ে লাইন কত দূর দেখুন
• বুকিং চলে যাবে ফোনের ক্যালেন্ডারে, আর এক দিন ও এক ঘণ্টা আগে মনে করিয়ে দেওয়া হবে
• বুকিং নিয়ে শপের সঙ্গে মেসেজ করুন
• সার্ভিসের পর শপ ও বারবারকে রেটিং দিন, ছবি সহ
• বাংলা ও ইংরেজি — দুটোতেই চলে

শপ মালিকদের জন্য

শপ যুক্ত করা সম্পূর্ণ ফ্রি।

• শপ বন্ধ থাকলেও ২৪ ঘণ্টা বুকিং নিন
• আজকের বুকিংয়ের লাইভ বোর্ড, এক ট্যাপে পরের ধাপে
• দেয়ালের স্ক্রিনের জন্য ফ্লোর ডিসপ্লে
• কাস্টমারের কোড স্ক্যান করে চেক-ইন
• নিজের সার্ভিস, দাম, অপশন ও অফার
• প্রতিটি বারবারের নিজের সময়, সার্ভিস ও ছুটি
• জানালা, প্রাইস লিস্ট ও প্রতিটি চেয়ারের জন্য প্রিন্টযোগ্য কিউআর কোড
• টোকেন নম্বর সহ সিরিয়াল ব্যবস্থাপনা
• রিভিউয়ের উত্তর দিন
• প্রোমো কোড
• আয়ের হিসাব, কমিশন স্পষ্ট করে দেখানো
```

**Graphics**

| Asset | File |
| --- | --- |
| App icon | `icon-512.png` |
| Feature graphic | `feature-graphic-1024x500.png` |
| Phone screenshots | `screenshots/en-*.png` (all 10, or pick 4–8) |

**Category and contact**

| Field | Value |
| --- | --- |
| App category | Beauty |
| Tags | Beauty, Lifestyle |
| Email | nayem3622@gmail.com |
| Website | https://salon.arnayem.top |
| Privacy policy | https://salon.arnayem.top/privacy |

## 4. App content (the questionnaire section)

**Privacy policy**: https://salon.arnayem.top/privacy

**App access** — Play needs a login to review the shop side. Give them:

```
All features are browsable without an account. To review the booking and shop features:

Customer account
  salon.arnayem.top/login
  customer@salonbd.app  /  <customer password from ~/Desktop/salonbd-credentials.txt>

Shop owner account (dashboard, board, QR codes, earnings)
  owner1@salonbd.app  /  <owner1 password from same file>

Payments run in sandbox mode; no real money moves.
```

**Ads**: No, this app has no ads.

**Content rating**: start the IARC questionnaire, category *Reference, News or Educational*
→ answer No to violence, sexual content, profanity, drugs, gambling. Answer **Yes** to "users
can interact" (customers message shops) and to user-generated content (reviews with photos).
Expect Everyone / PEGI 3.

**Target audience**: 18 and over. Not designed for children.

**Data safety**: see the table below and in `docs/play-store.md` in the repo.

| Data type | Collected | Shared | Required | Purpose |
| --- | --- | --- | --- | --- |
| Name | Yes | No | Yes | App functionality |
| Email address | Yes | No | Optional | App functionality, account management |
| Phone number | Yes | No | Optional | App functionality, account management |
| User IDs | Yes | No | Yes | App functionality, account management |
| Approximate location | Yes | No | Optional | App functionality |
| Photos | Yes | No | Optional | App functionality |
| In-app messages | Yes | No | Optional | App functionality |
| Purchase history | Yes | No | Yes | App functionality |
| Date of birth | Yes | No | Optional | Analytics |
| Payment info | No | — | — | Handled by the payment provider |
| Crash logs, diagnostics | No | — | — | No analytics SDK |
| Advertising ID | No | — | — | No ads |

Also answer:
- Encrypted in transit: **Yes**
- Users can request deletion: **Yes** — https://salon.arnayem.top/delete-account
- Data deletion URL: **https://salon.arnayem.top/delete-account**

**Government app**: No. **Financial features**: No. **Health**: No.

**Play Billing**: not required. A haircut is a real-world service, which Play's payments policy
exempts, so bKash, Nagad and cards stay outside Play with no commission.

## 5. Upload the bundle

Release → Testing → **Closed testing** → Create release → upload `app-release-bundle.aab`.

Release name: `1.0.0 (1)`

Release notes:

```
First release.

Book a barber or salon anywhere in Bangladesh: real prices, your choice of barber, cash or
online payment, calendar sync and reminders, in Bangla and English.
```

Keep **Play App Signing** on. It is on by default and it is what lets Google re-issue your key
if the one on your Desktop is ever lost.

## 6. The one step after the first upload — do not skip

Google re-signs the app with its own key, so the app's real fingerprint changes.

1. Play Console → **Setup → App signing**
2. Copy the **SHA-256 certificate fingerprint** under "App signing key certificate"
3. On the server:

```bash
cd /var/www/salonbd
# append Google's fingerprint after the existing one, comma separated
nano .env          # ANDROID_CERT_FINGERPRINTS="9C:A2:...,<paste Google's here>"
pm2 restart salonbd --update-env
curl -s https://salon.arnayem.top/.well-known/assetlinks.json
```

Both fingerprints should appear. Until this is done, the version installed **from Play** will
show a browser address bar across the top. The APK in this folder is already covered.

Send me the fingerprint and I will do it.

## 7. Testers (personal accounts only)

Closed testing needs 12 testers opted in for 14 continuous days. Collect 12 Gmail addresses,
add them under Testing → Closed testing → Testers, and send them the opt-in link. They must
install and leave it installed for the full 14 days. Start this the same day you upload —
it is the long pole, not the app.

## 8. Releasing an update later

```bash
cd "/Users/apple/Desktop/All files/salonbd/android"
# raise appVersionCode (2, 3, ...) and appVersionName in twa-manifest.json
export BUBBLEWRAP_KEYSTORE_PASSWORD='<store password>'
export BUBBLEWRAP_KEY_PASSWORD="$BUBBLEWRAP_KEYSTORE_PASSWORD"
npx @bubblewrap/cli update --skipVersionUpgrade && npx @bubblewrap/cli build --skipPwaValidation
```

Website changes do **not** need a new app version. The app is a window onto salon.arnayem.top,
so a normal deploy updates what users see immediately. You only rebuild the bundle when the
app shell itself changes — name, icon, colours, permissions.
