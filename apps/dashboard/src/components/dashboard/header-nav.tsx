"use client";

import Link from "next/link";
import { ChevronDown, Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SignOutButton } from "@/components/dashboard/sign-out-button";
import { cn } from "@/lib/utils";

const cookingLinks = [
  { href: "/promo-grocery-watchlist", label: "Promo grocery watchlist" },
  { href: "/recipes", label: "Recipes" },
  { href: "/cookbook", label: "Shared cookbook (preview)" },
] as const;

const recipeChildLinks = [
  { href: "/recipes?tab=manage", label: "Manage recipes" },
  { href: "/recipes?tab=collect", label: "Collect ideas" },
  { href: "/recipes?tab=share", label: "Share recipes" },
] as const;

const moreLinks = [
  { href: "/digest", label: "Preview email" },
  { href: "/inspirations", label: "Inspirations" },
  { href: "/trips/preferences", label: "Trip preferences" },
  { href: "/context", label: "Context" },
  { href: "/birthdays", label: "Birthdays" },
] as const;

const primaryLinks = [
  { href: "/", label: "Tasks" },
  { href: "/activities", label: "Summer Activities" },
  { href: "/trips", label: "Trip Ops" },
  { href: "/learning", label: "Learning" },
  { href: "/growing", label: "Growing" },
] as const;

const collaboratorLinks = [
  { href: "/recipes", label: "Recipes" },
  { href: "/recipes?tab=collect", label: "Collect ideas" },
  { href: "/recipes?tab=cook", label: "Cook" },
  { href: "/birthdays", label: "Birthdays" },
] as const;

export function DashboardNav({
  signedIn,
  role,
  initials = "DO",
}: {
  signedIn: boolean;
  role?: "owner" | "collaborator" | null;
  initials?: string;
}) {
  const pathname = usePathname();
  const isActive = (href: string) => href === "/" ? pathname === "/" : pathname.startsWith(href);

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
      <nav className="hidden min-w-0 flex-1 items-center gap-1 lg:flex" aria-label="Main">
        {primaryLinks.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex h-10 items-center rounded-[10px] px-3.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              isActive(item.href) && "bg-muted font-semibold text-foreground"
            )}
          >
            {item.label}
          </Link>
        ))}

        <details className="relative">
          <summary className="flex h-10 cursor-pointer list-none items-center gap-0.5 rounded-[10px] px-3.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground [&::-webkit-details-marker]:hidden">
            More
            <ChevronDown className="size-4 opacity-70" aria-hidden />
          </summary>
          <div
            className="absolute right-0 z-50 mt-1 min-w-[14rem] rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
            role="menu"
          >
            {[...cookingLinks, ...moreLinks].map((item) => (
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

        {signedIn ? <details className="relative ml-auto pl-4">
          <summary className="flex size-9 cursor-pointer list-none items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden" aria-label="Account menu">
            {initials}
          </summary>
          <div className="absolute right-0 z-50 mt-2 min-w-36 rounded-xl border bg-popover p-1 shadow-lg"><SignOutButton /></div>
        </details> : (
          <Button asChild variant="outline" className="shrink-0">
            <Link href="/login">Sign in</Link>
          </Button>
        )}
      </nav>

      <details className="relative ml-auto lg:hidden">
        <summary className="flex size-10 cursor-pointer list-none items-center justify-center rounded-[10px] border bg-card text-sm [&::-webkit-details-marker]:hidden" aria-label="Open navigation">
          <Menu className="size-5" />
        </summary>
        <div className="absolute right-0 top-12 z-50 max-h-[min(70vh,28rem)] w-64 overflow-y-auto rounded-md border bg-background p-2 shadow-md">
          <div className="flex flex-col gap-1">
            {primaryLinks.map((item) => <Button key={item.href} asChild variant="ghost" className="justify-start"><Link href={item.href}>{item.label}</Link></Button>)}
            <div className="my-1 border-t pt-2">
              <p className="px-3 pb-1 text-xs font-medium text-muted-foreground">Cooking</p>
              {cookingLinks.map((item) => (
                <div key={item.href}>
                  <Button asChild variant="ghost" className="w-full justify-start">
                    <Link href={item.href}>{item.label}</Link>
                  </Button>
                  {item.href === "/recipes" ? (
                    <div className="ml-3 border-l pl-2">
                      {recipeChildLinks.map((child) => (
                        <Button
                          key={child.href}
                          asChild
                          variant="ghost"
                          className="w-full justify-start text-muted-foreground"
                        >
                          <Link href={child.href}>{child.label}</Link>
                        </Button>
                      ))}
                    </div>
                  ) : null}
                </div>
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
