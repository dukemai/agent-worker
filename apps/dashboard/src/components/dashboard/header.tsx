import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUserHousehold } from "@/lib/household";
import { DashboardNav } from "@/components/dashboard/header-nav";

export async function DashboardHeader({ showNav = true }: { showNav?: boolean } = {}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const household = user ? await getUserHousehold(supabase, user.id) : null;
  const role = household?.member?.role ?? null;
  const displayName =
    typeof user?.user_metadata?.full_name === "string" ? user.user_metadata.full_name : user?.email ?? "";
  const initials = displayName
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "DO";

  return (
    <header className="border-b bg-card">
      <div className="mx-auto flex h-[68px] w-full max-w-[1440px] items-center justify-between gap-6 px-5 sm:px-8 lg:px-10">
        <div className="flex min-w-0 flex-1 items-center gap-8 lg:gap-9">
          <Link href="/" className="shrink-0 font-serif text-xl font-medium tracking-tight" aria-label="Dad Ops home">
            Dad<span className="text-primary">·Ops</span>
          </Link>
          {showNav ? <DashboardNav signedIn={!!user} role={role} initials={initials} /> : null}
        </div>
      </div>
    </header>
  );
}
