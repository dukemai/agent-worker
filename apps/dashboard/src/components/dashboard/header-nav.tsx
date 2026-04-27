"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SignOutButton } from "@/components/dashboard/sign-out-button";

const cookingLinks = [
  { href: "/promo-grocery-watchlist", label: "Promo grocery watchlist" },
  { href: "/family/recipes", label: "Family recipes" },
  { href: "/recipe-generator", label: "Recipe library" },
  { href: "/cookbook", label: "Shared cookbook (preview)" },
  { href: "/plan-to-cook", label: "Plan to cook" },
  { href: "/plan-to-cook/cook", label: "Cooking" },
] as const;

const moreLinks = [
  { href: "/learning", label: "Learning" },
  { href: "/context", label: "Context" },
] as const;

const collaboratorLinks = [
  { href: "/family/recipes", label: "Family recipes" },
  { href: "/plan-to-cook", label: "Plan to cook" },
  { href: "/birthdays", label: "Birthdays" },
] as const;

export function DashboardNav({
  signedIn,
  role,
}: {
  signedIn: boolean;
  role?: "owner" | "collaborator" | null;
}) {
  if (role === "collaborator") {
    return (
      <>
        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {collaboratorLinks.map((item) => (
            <Button key={item.href} asChild variant="ghost" className="shrink-0">
              <Link href={item.href}>{item.label}</Link>
            </Button>
          ))}
          <SignOutButton />
        </nav>

        <details className="relative md:hidden">
          <summary className="flex h-11 min-w-11 cursor-pointer list-none items-center justify-center rounded-md border px-3 text-sm">
            Menu
          </summary>
          <div className="absolute right-0 top-12 z-50 w-64 rounded-md border bg-background p-2 shadow-md">
            <div className="flex flex-col gap-1">
              {collaboratorLinks.map((item) => (
                <Button key={item.href} asChild variant="ghost" className="justify-start">
                  <Link href={item.href}>{item.label}</Link>
                </Button>
              ))}
              <SignOutButton />
            </div>
          </div>
        </details>
      </>
    );
  }

  return (
    <>
      <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
        <Button asChild variant="ghost" className="shrink-0">
          <Link href="/">Tasks</Link>
        </Button>
        <Button asChild variant="ghost" className="shrink-0">
          <Link href="/growing">Growing</Link>
        </Button>
        <Button asChild variant="ghost" className="shrink-0">
          <Link href="/digest">Preview email</Link>
        </Button>

        <details className="relative">
          <summary className="flex cursor-pointer list-none items-center gap-0.5 rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground [&::-webkit-details-marker]:hidden">
            Cooking
            <ChevronDown className="size-4 opacity-70" aria-hidden />
          </summary>
          <div
            className="absolute right-0 z-50 mt-1 min-w-[14rem] rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
            role="menu"
            aria-label="Cooking"
          >
            {cookingLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-sm px-3 py-2.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                role="menuitem"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </details>

        <details className="relative">
          <summary className="flex cursor-pointer list-none items-center gap-0.5 rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground [&::-webkit-details-marker]:hidden">
            More
            <ChevronDown className="size-4 opacity-70" aria-hidden />
          </summary>
          <div
            className="absolute right-0 z-50 mt-1 min-w-[14rem] rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
            role="menu"
          >
            {moreLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-sm px-3 py-2.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                role="menuitem"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </details>

        {signedIn ? (
          <SignOutButton />
        ) : (
          <Button asChild variant="outline" className="shrink-0">
            <Link href="/login">Sign in</Link>
          </Button>
        )}
      </nav>

      <details className="relative md:hidden">
        <summary className="flex h-11 min-w-11 cursor-pointer list-none items-center justify-center rounded-md border px-3 text-sm">
          Menu
        </summary>
        <div className="absolute right-0 top-12 z-50 max-h-[min(70vh,28rem)] w-64 overflow-y-auto rounded-md border bg-background p-2 shadow-md">
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
            <div className="my-1 border-t pt-2">
              <p className="px-3 pb-1 text-xs font-medium text-muted-foreground">Cooking</p>
              {cookingLinks.map((item) => (
                <Button key={item.href} asChild variant="ghost" className="justify-start">
                  <Link href={item.href}>{item.label}</Link>
                </Button>
              ))}
            </div>
            <div className="my-1 border-t pt-2">
              <p className="px-3 pb-1 text-xs font-medium text-muted-foreground">More</p>
              {moreLinks.map((item) => (
                <Button key={item.href} asChild variant="ghost" className="justify-start">
                  <Link href={item.href}>{item.label}</Link>
                </Button>
              ))}
            </div>
            {signedIn ? (
              <SignOutButton />
            ) : (
              <Button asChild variant="outline" className="justify-start">
                <Link href="/login">Sign in</Link>
              </Button>
            )}
          </div>
        </div>
      </details>
    </>
  );
}
