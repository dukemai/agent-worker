import { createClient } from "@/lib/supabase/server";
import { DashboardNav } from "@/components/dashboard/header-nav";

export async function DashboardHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="border-b">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <h1 className="text-lg font-semibold">Dad-Ops Agent</h1>
          <span className="hidden text-sm text-muted-foreground sm:inline">Dashboard</span>
        </div>
        <DashboardNav signedIn={!!user} />
      </div>
    </header>
  );
}
