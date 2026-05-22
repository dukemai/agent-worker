import { DashboardHeader } from "@/components/dashboard/header";
import { TripDetailDashboard } from "@/components/dashboard/trip-detail-dashboard";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function TripDetailPage({ params }: PageProps) {
  const { id } = await params;
  return (
    <>
      <DashboardHeader />
      <TripDetailDashboard tripId={id} />
    </>
  );
}

