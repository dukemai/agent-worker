import { PublicTripSharePage } from "@/components/trips/public-trip-share-page";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function SharedTripPage({ params }: Props) {
  const { slug } = await params;
  return <PublicTripSharePage slug={slug} />;
}
