"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "./ui";

export function LogoutButton({ label }: { label: string }) {
  const router = useRouter();
  return (
    <Button
      variant="outline"
      className="w-full text-red-600"
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/");
        router.refresh();
      }}
    >
      <LogOut size={16} /> {label}
    </Button>
  );
}
