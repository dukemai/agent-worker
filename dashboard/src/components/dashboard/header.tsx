import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/dashboard/sign-out-button";
import { Button } from "@/components/ui/button";

export async function DashboardHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="border-b">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold">Dad-Ops Agent</h1>
          <span className="text-sm text-muted-foreground">Dashboard</span>
        </div>
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost">
            <Link href="/">Tasks</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/learning">Learning</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/context">Context</Link>
          </Button>
          {user ? (
            <SignOutButton />
          ) : (
            <Button asChild variant="outline">
              <Link href="/login">Sign in</Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
