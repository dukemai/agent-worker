import { createClient } from "@/lib/supabase/server";
import { InviteAcceptPage } from "@/components/dashboard/invite-accept-page";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <InviteAcceptPage token={token} signedIn={!!user} />;
}
