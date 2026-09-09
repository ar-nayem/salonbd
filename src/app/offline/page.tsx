import { WifiOff } from "lucide-react";
import { EmptyState } from "@/components/ui";

export const metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <div className="py-16">
      <EmptyState
        icon={<WifiOff size={30} />}
        title="You are offline"
        body="Pages you already opened still work. Reconnect to book a new appointment."
      />
    </div>
  );
}
