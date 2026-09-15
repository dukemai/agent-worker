import { DashboardHeader } from "@/components/dashboard/header";
import { TripEditDashboard } from "@/components/dashboard/trip-detail/trip-edit-dashboard";

export default async function TripEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <><DashboardHeader /><TripEditDashboard tripId={id} /></>;
}
