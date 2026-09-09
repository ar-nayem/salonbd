import type { Metadata, Viewport } from "next";
import { Inter, Hind_Siliguri } from "next/font/google";
import "./globals.css";
import { getLocale } from "@/lib/i18n";
import { getDict } from "@/lib/i18n";
import { LocaleProvider } from "@/components/locale-provider";
import { SiteHeader } from "@/components/site-header";
import { BottomNav } from "@/components/bottom-nav";
import { getCurrentUser } from "@/lib/auth";
import { RegisterSW } from "@/components/register-sw";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const bangla = Hind_Siliguri({
  subsets: ["bengali", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-bangla",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "SalonBD — সেলুন ও বারবার বুকিং", template: "%s · SalonBD" },
  description: "Find barbers and salons across Bangladesh, see prices, and book a slot online.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "SalonBD" },
  icons: { icon: "/icon.svg", apple: "/icons/icon-192.png" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#12835f" },
    { media: "(prefers-color-scheme: dark)", color: "#0c1219" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const dict = getDict(locale);
  const user = await getCurrentUser();

  return (
    <html lang={locale} className={`${inter.variable} ${bangla.variable}`}>
      <body className={locale === "bn" ? "font-bn antialiased" : "font-sans antialiased"}>
        <LocaleProvider locale={locale} dict={dict}>
          <SiteHeader user={user} locale={locale} />
          <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-4 md:pb-16">{children}</main>
          <BottomNav role={user?.role ?? null} />
          <RegisterSW />
        </LocaleProvider>
      </body>
    </html>
  );
}
