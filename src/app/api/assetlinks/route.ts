import { NextResponse } from "next/server";

/**
 * Digital Asset Links, served at /.well-known/assetlinks.json via a rewrite.
 *
 * This is what lets the Play Store app open salon.arnayem.top without a
 * browser address bar across the top. It needs the SHA-256 fingerprint of the
 * certificate the app is signed with, which Play only issues after the first
 * upload — so the values come from the environment and an unconfigured server
 * returns an empty list rather than a wrong fingerprint.
 *
 * ANDROID_PACKAGE_NAME=top.arnayem.salon
 * ANDROID_CERT_FINGERPRINTS=AA:BB:...,CC:DD:...   (upload cert and Play signing cert)
 */
export async function GET() {
  const packageName = process.env.ANDROID_PACKAGE_NAME;
  const fingerprints = (process.env.ANDROID_CERT_FINGERPRINTS ?? "")
    .split(",")
    .map((f) => f.trim().toUpperCase())
    .filter((f) => /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(f));

  const body =
    packageName && fingerprints.length > 0
      ? [
          {
            relation: ["delegate_permission/common.handle_all_urls"],
            target: {
              namespace: "android_app",
              package_name: packageName,
              sha256_cert_fingerprints: fingerprints,
            },
          },
        ]
      : [];

  return NextResponse.json(body, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=300",
    },
  });
}
