/**
 * Written from an audit of what the code actually stores and sends. Every
 * claim here is checkable against the schema and the network calls; if a
 * feature starts collecting something new, this file changes in the same
 * commit.
 */
export const PRIVACY_UPDATED = "2026-09-27";
export const PRIVACY_CONTACT = "nayem3622@gmail.com";

export type Section = { heading: string; body: string[]; bullets?: string[] };

export const PRIVACY: Record<"en" | "bn", { intro: string; sections: Section[] }> = {
  en: {
    intro:
      "SalonBD is a booking service for barbers and salons in Bangladesh, run from salon.arnayem.top. This policy says exactly what we store, why, who sees it, and how to get rid of it.",
    sections: [
      {
        heading: "What we store about you",
        body: ["Only what a booking actually needs:"],
        bullets: [
          "Account: your name, and a mobile number or an email address. A password if you set one, or a link to your Google account if you sign in that way. A profile photo and date of birth only if you add them.",
          "Bookings: the shop, services, barber, date and time, the price, your name and mobile number, any note you write, and — if you book for someone else — the name, mobile number and note you give for them.",
          "Payments: the provider used, the amount, the transaction reference and the gateway's reply. Card numbers and bKash or Nagad PINs never reach our servers; the payment provider handles those.",
          "Reviews and messages: your rating, comment, tags, any photos you attach, and messages between you and the shop.",
          "Reminders: if you turn on phone reminders, the notification address your browser issues for this device.",
          "QR scans: when a code is scanned we record the time, the browser's user-agent string, and your account if you are signed in.",
          "Technical: our web server logs IP addresses for security and rate limiting.",
        ],
      },
      {
        heading: "Location",
        body: [
          "Only when you tap \"Use my location\". Your browser asks first, and you can say no — the app works fine without it, you just pick an area by hand instead.",
          "We round the position to about 100 metres and use it to sort shops by distance. It stays in the page address and your browser's own storage for ten minutes. We never save your coordinates in our database.",
        ],
      },
      {
        heading: "What we never do",
        body: [
          "No advertising, no ad networks, and nothing is sold or rented to anyone.",
          "No analytics or tracking scripts, and no third-party cookies. Fonts are served from our own server, so no font provider sees your visit.",
          "We do not use your bookings or messages to build a profile of you.",
        ],
      },
      {
        heading: "Who else sees it",
        body: ["Four groups, and no one else:"],
        bullets: [
          "The shop you book: your name, mobile number, what you booked, your note, your messages, and the recipient's details when the booking is for someone else. Its staff see this in their dashboard.",
          "The payment provider, when you pay online: your name, mobile number, the amount and a reference.",
          "Google or Apple, when you turn on phone reminders: their push services carry the notification to your device.",
          "Google, if you choose to sign in with Google: they confirm your email address to us.",
        ],
      },
      {
        heading: "Your calendar link",
        body: [
          "If you set up calendar sync, we create a secret link that lists your upcoming bookings so your calendar app can read them. Anyone holding that link can read those bookings, so do not share it. Reset it from your profile at any time and the old link stops working immediately.",
        ],
      },
      {
        heading: "Cookies and browser storage",
        body: ["Four small items, none of them for tracking:"],
        bullets: [
          "sb_session — keeps you signed in.",
          "sb_locale — remembers Bangla or English.",
          "sb_oauth — a ten-minute safety value used only during Google sign-in.",
          "sb_fix — your rounded location, kept in the browser for ten minutes; it never leaves your device except as the coarse position described above.",
        ],
      },
      {
        heading: "How long we keep it",
        body: [
          "Your account and its data stay until you delete the account. Booking records stay with the shop as its own business record, with your personal details removed once you delete your account. One-time login codes are deleted within minutes. Web server logs rotate within weeks.",
        ],
      },
      {
        heading: "Deleting your account",
        body: [
          "Go to Account, then Delete account, or open salon.arnayem.top/delete-account. It happens immediately, with no waiting period.",
          "Removed for good: your name, mobile number, email, password, Google link, photo, date of birth, saved shops, notifications, reminder subscriptions, calendar link, your reviews with their photos, and the messages you sent.",
          "Kept by the shop: the booking rows, with every personal field wiped, because a shop needs its own record of what was served and paid.",
          "Shop owners and shop staff cannot delete their account from the app, because a shop's listings, team and takings hang off it. Write to us and we will handle it.",
        ],
      },
      {
        heading: "Security and where your data sits",
        body: [
          "The site is served over HTTPS. Passwords are stored as bcrypt hashes, never as text. Uploaded photos sit outside the public web folder and are served through a controlled route.",
          "Our server is in the United States. Using SalonBD means your data is processed there.",
          "No system is perfect. If something goes wrong that affects you, we will say so plainly.",
        ],
      },
      {
        heading: "Children",
        body: [
          "SalonBD is not meant for children under 13, and we do not knowingly keep their data. A parent booking for a child should book under their own account and add the child as the person the booking is for.",
        ],
      },
      {
        heading: "Changes",
        body: [
          "If this policy changes in a way that affects you, the date at the top changes and we will say what changed.",
        ],
      },
    ],
  },
  bn: {
    intro:
      "সেলুনবিডি বাংলাদেশের সেলুন ও বারবার শপ বুকিংয়ের সেবা, চলে salon.arnayem.top থেকে। আমরা ঠিক কী তথ্য রাখি, কেন রাখি, কে দেখে এবং কীভাবে মুছে ফেলবেন — সব এখানে লেখা আছে।",
    sections: [
      {
        heading: "আমরা কী তথ্য রাখি",
        body: ["বুকিংয়ের জন্য যতটুকু দরকার, ঠিক ততটুকুই:"],
        bullets: [
          "অ্যাকাউন্ট: আপনার নাম, আর মোবাইল নম্বর বা ইমেইল। পাসওয়ার্ড দিলে তা, অথবা গুগল দিয়ে ঢুকলে গুগল অ্যাকাউন্টের সংযোগ। ছবি ও জন্মতারিখ কেবল আপনি দিলে।",
          "বুকিং: শপ, সার্ভিস, বারবার, তারিখ ও সময়, মূল্য, আপনার নাম ও মোবাইল নম্বর, আপনার নোট এবং অন্য কারো জন্য বুক করলে তার নাম, নম্বর ও নোট।",
          "পেমেন্ট: কোন প্রোভাইডার, কত টাকা, ট্রানজেকশন রেফারেন্স ও গেটওয়ের উত্তর। কার্ড নম্বর বা বিকাশ/নগদের পিন আমাদের সার্ভারে আসে না — সেগুলো পেমেন্ট প্রোভাইডার সামলায়।",
          "রিভিউ ও মেসেজ: রেটিং, মন্তব্য, ট্যাগ, আপনার দেওয়া ছবি এবং আপনার ও শপের মধ্যে মেসেজ।",
          "রিমাইন্ডার: ফোনে রিমাইন্ডার চালু করলে, এই ডিভাইসের জন্য ব্রাউজারের দেওয়া নোটিফিকেশন ঠিকানা।",
          "কিউআর স্ক্যান: কোড স্ক্যান হলে সময়, ব্রাউজারের পরিচয় (user-agent) এবং আপনি লগ ইন থাকলে আপনার অ্যাকাউন্ট রাখা হয়।",
          "কারিগরি: নিরাপত্তা ও অপব্যবহার ঠেকাতে ওয়েব সার্ভারের লগে আইপি ঠিকানা থাকে।",
        ],
      },
      {
        heading: "লোকেশন",
        body: [
          "কেবল আপনি ‘আমার লোকেশন’ চাপলে। ব্রাউজার আগে অনুমতি চায়, না বললেও অ্যাপ পুরোপুরি চলে — তখন এলাকা নিজে বেছে নেবেন।",
          "অবস্থানটি প্রায় ১০০ মিটারে গোল করে নেওয়া হয়, শুধু দূরত্ব অনুযায়ী শপ সাজাতে। এটি পেজের ঠিকানায় ও আপনার ব্রাউজারে দশ মিনিট থাকে। আপনার স্থানাঙ্ক আমাদের ডেটাবেসে কখনো রাখা হয় না।",
        ],
      },
      {
        heading: "আমরা যা করি না",
        body: [
          "কোনো বিজ্ঞাপন নেই, অ্যাড নেটওয়ার্ক নেই, কারও কাছে তথ্য বিক্রি বা ভাড়া দেওয়া হয় না।",
          "কোনো অ্যানালিটিক্স বা ট্র্যাকিং স্ক্রিপ্ট নেই, তৃতীয় পক্ষের কুকি নেই। ফন্টও আমাদের নিজের সার্ভার থেকে আসে, তাই কোনো ফন্ট সরবরাহকারী আপনার ভিজিট দেখে না।",
          "আপনার বুকিং বা মেসেজ দিয়ে আপনার কোনো প্রোফাইল বানানো হয় না।",
        ],
      },
      {
        heading: "আর কে দেখে",
        body: ["চারটি পক্ষ, এর বাইরে কেউ নয়:"],
        bullets: [
          "যে শপে বুক করেছেন: আপনার নাম, মোবাইল নম্বর, কী বুক করেছেন, আপনার নোট, মেসেজ এবং অন্য কারো জন্য হলে তার তথ্য। শপের কর্মীরা ড্যাশবোর্ডে এগুলো দেখেন।",
          "পেমেন্ট প্রোভাইডার, অনলাইনে টাকা দিলে: আপনার নাম, মোবাইল নম্বর, টাকার অঙ্ক ও একটি রেফারেন্স।",
          "গুগল বা অ্যাপল, ফোনে রিমাইন্ডার চালু করলে: তাদের পুশ সেবা নোটিফিকেশনটি আপনার ডিভাইসে পৌঁছে দেয়।",
          "গুগল, আপনি গুগল দিয়ে সাইন ইন করলে: তারা আমাদের কাছে আপনার ইমেইল নিশ্চিত করে।",
        ],
      },
      {
        heading: "আপনার ক্যালেন্ডার লিংক",
        body: [
          "ক্যালেন্ডার সিঙ্ক চালু করলে আমরা একটি গোপন লিংক তৈরি করি, যাতে আপনার আসন্ন বুকিংগুলো ক্যালেন্ডার অ্যাপ পড়তে পারে। এই লিংক যার কাছে থাকবে সে ওই বুকিংগুলো দেখতে পাবে, তাই কাউকে দেবেন না। প্রোফাইল থেকে যেকোনো সময় রিসেট করলে পুরনো লিংক সঙ্গে সঙ্গে অকেজো হয়ে যায়।",
        ],
      },
      {
        heading: "কুকি ও ব্রাউজার স্টোরেজ",
        body: ["চারটি ছোট জিনিস, কোনোটিই ট্র্যাকিংয়ের জন্য নয়:"],
        bullets: [
          "sb_session — আপনাকে লগ ইন রাখে।",
          "sb_locale — বাংলা না ইংরেজি, তা মনে রাখে।",
          "sb_oauth — গুগল সাইন ইনের সময় দশ মিনিটের নিরাপত্তা মান।",
          "sb_fix — আপনার গোল করা লোকেশন, ব্রাউজারে দশ মিনিট থাকে; উপরে বলা আনুমানিক অবস্থান ছাড়া এটি ডিভাইস থেকে বের হয় না।",
        ],
      },
      {
        heading: "কতদিন রাখা হয়",
        body: [
          "আপনি অ্যাকাউন্ট ডিলিট না করা পর্যন্ত আপনার তথ্য থাকে। বুকিংয়ের হিসাব শপের নিজস্ব রেকর্ড হিসেবে থাকে, তবে অ্যাকাউন্ট ডিলিট করলে সেখান থেকে আপনার ব্যক্তিগত তথ্য মুছে যায়। ওয়ান-টাইম কোড কয়েক মিনিটেই মুছে যায়। সার্ভার লগ কয়েক সপ্তাহে ঘুরে যায়।",
        ],
      },
      {
        heading: "অ্যাকাউন্ট ডিলিট",
        body: [
          "অ্যাকাউন্ট > অ্যাকাউন্ট ডিলিট-এ যান, অথবা salon.arnayem.top/delete-account খুলুন। সঙ্গে সঙ্গেই কার্যকর হয়, কোনো অপেক্ষা নেই।",
          "একেবারে মুছে যায়: নাম, মোবাইল নম্বর, ইমেইল, পাসওয়ার্ড, গুগল সংযোগ, ছবি, জন্মতারিখ, সেভ করা শপ, নোটিফিকেশন, রিমাইন্ডার সাবস্ক্রিপশন, ক্যালেন্ডার লিংক, আপনার রিভিউ ও ছবি এবং আপনার পাঠানো মেসেজ।",
          "শপের কাছে থাকে: বুকিংয়ের সারি, তবে ব্যক্তিগত সব ঘর মুছে দেওয়া অবস্থায় — কারণ কী সেবা দেওয়া হয়েছে ও কত টাকা নেওয়া হয়েছে তার রেকর্ড শপের দরকার।",
          "শপ মালিক ও শপ কর্মীরা অ্যাপ থেকে নিজের অ্যাকাউন্ট ডিলিট করতে পারেন না, কারণ শপের লিস্টিং, টিম ও হিসাব এর সঙ্গে যুক্ত। আমাদের জানালে আমরা ব্যবস্থা নেব।",
        ],
      },
      {
        heading: "নিরাপত্তা ও তথ্য কোথায় থাকে",
        body: [
          "সাইটটি HTTPS-এ চলে। পাসওয়ার্ড bcrypt হ্যাশ হিসেবে রাখা হয়, সাধারণ লেখা হিসেবে নয়। আপলোড করা ছবি পাবলিক ফোল্ডারের বাইরে থাকে এবং নিয়ন্ত্রিত পথে দেখানো হয়।",
          "আমাদের সার্ভার যুক্তরাষ্ট্রে। সেলুনবিডি ব্যবহার করলে আপনার তথ্য সেখানেই প্রক্রিয়া হয়।",
          "কোনো ব্যবস্থাই নিখুঁত নয়। আপনাকে প্রভাবিত করে এমন কিছু ঘটলে আমরা স্পষ্ট করে জানাব।",
        ],
      },
      {
        heading: "শিশু",
        body: [
          "সেলুনবিডি ১৩ বছরের কম বয়সীদের জন্য নয়, এবং জেনেশুনে তাদের তথ্য রাখা হয় না। সন্তানের জন্য বুক করতে চাইলে নিজের অ্যাকাউন্ট থেকে বুক করে ‘অন্য কারো জন্য’ অংশে তার নাম দিন।",
        ],
      },
      {
        heading: "পরিবর্তন",
        body: [
          "এই নীতিতে আপনাকে প্রভাবিত করে এমন পরিবর্তন হলে উপরের তারিখ বদলাবে এবং কী বদলেছে তা আমরা জানাব।",
        ],
      },
    ],
  },
};
