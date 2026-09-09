"use client";

import { useState } from "react";

/** Phone numbers stay masked until someone explicitly asks to see one. */
export function MaskedPhone({ phone, label }: { phone: string | null; label: string }) {
  const [shown, setShown] = useState(false);
  if (!phone) return <span className="muted">—</span>;

  return shown ? (
    <span className="tabular-nums">{phone}</span>
  ) : (
    <button onClick={() => setShown(true)} className="muted underline-offset-2 hover:underline">
      {phone.slice(0, 3)}••••{phone.slice(-2)} · {label}
    </button>
  );
}
