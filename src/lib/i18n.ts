import { cookies } from "next/headers";
import { dictionaries, DEFAULT_LOCALE, type Dict, type Locale } from "./dictionaries";

export const LOCALE_COOKIE = "sb_locale";

export async function getLocale(): Promise<Locale> {
  const jar = await cookies();
  const value = jar.get(LOCALE_COOKIE)?.value;
  return value === "en" || value === "bn" ? value : DEFAULT_LOCALE;
}

export function getDict(locale: Locale): Dict {
  return dictionaries[locale] as unknown as Dict;
}

export function makeT(locale: Locale) {
  const dict = getDict(locale);
  const fallback = getDict(DEFAULT_LOCALE);
  return (key: string) => dict[key] ?? fallback[key] ?? key;
}

export async function getT() {
  const locale = await getLocale();
  return { locale, t: makeT(locale) };
}
