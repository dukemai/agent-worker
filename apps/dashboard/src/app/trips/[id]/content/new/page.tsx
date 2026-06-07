import { TripContentBuilder } from "@/components/dashboard/trip-detail/trip-content-builder";

export default async function TripContentBuilderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <TripContentBuilder tripId={id} />;
}
