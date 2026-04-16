import { Suspense } from "react";
import { DashboardHeader } from "@/components/dashboard/header";
import { SharedShoppingListEditor } from "@/components/dashboard/shared-shopping-list-editor";

export default async function SharedShoppingListPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <>
      <DashboardHeader />
      <Suspense fallback={<p className="px-4 py-6 text-sm text-muted-foreground">Loading…</p>}>
        <SharedShoppingListEditor key={id} listId={id} />
      </Suspense>
    </>
  );
}
