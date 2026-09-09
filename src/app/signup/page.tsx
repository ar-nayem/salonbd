import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { getCurrentUser } from "@/lib/auth";
import { googleConfigured } from "@/lib/google";

export const dynamic = "force-dynamic";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect(user.role === "OWNER" ? "/dashboard" : "/");

  return (
    <div className="py-6">
      <AuthForm mode="signup" next={next || "/"} googleEnabled={googleConfigured()} />
    </div>
  );
}
