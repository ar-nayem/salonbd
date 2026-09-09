"use client";

import { Printer } from "lucide-react";
import { Button } from "./ui";

export function PrintSheetButton({ label }: { label: string }) {
  return (
    <Button variant="outline" onClick={() => window.print()}>
      <Printer size={16} /> {label}
    </Button>
  );
}
