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
        <nav className="hidden items-center gap-2 md:flex">
          <Button asChild variant="ghost">
            <Link href="/">Tasks</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/growing">Growing</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/digest">Preview email</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/learning">Learning</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/promo-grocery-watchlist">Promo watchlist</Link>
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
        <details className="relative md:hidden">
          <summary className="flex h-11 min-w-11 cursor-pointer list-none items-center justify-center rounded-md border px-3 text-sm">
            Menu
          </summary>
          <div className="absolute right-0 top-12 z-20 w-52 rounded-md border bg-background p-2 shadow-md">
            <div className="flex flex-col gap-1">
              <Button asChild variant="ghost" className="justify-start">
                <Link href="/">Tasks</Link>
              </Button>
              <Button asChild variant="ghost" className="justify-start">
                <Link href="/growing">Growing</Link>
              </Button>
              <Button asChild variant="ghost" className="justify-start">
                <Link href="/digest">Preview email</Link>
              </Button>
              <Button asChild variant="ghost" className="justify-start">
                <Link href="/learning">Learning</Link>
              </Button>
              <Button asChild variant="ghost" className="justify-start">
                <Link href="/promo-grocery-watchlist">Promo watchlist</Link>
              </Button>
              <Button asChild variant="ghost" className="justify-start">
                <Link href="/context">Context</Link>
              </Button>
              {user ? (
                <SignOutButton />
              ) : (
                <Button asChild variant="outline" className="justify-start">
                  <Link href="/login">Sign in</Link>
                </Button>
              )}
            </div>
          </div>
        </details>
      </div>
    </header>
  );
}
