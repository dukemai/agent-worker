import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSharedShopBySlug } from "@/lib/shop-public";
import { ShopListContent } from "./shop-list-content";
import { ShopUnavailable } from "./shop-unavailable";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const result = await getSharedShopBySlug(slug);
  if (!result.ok) {
    return { title: "Shopping list" };
  }
  return { title: `${result.payload.title} · Shopping list` };
}

export default async function PublicShopPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = await getSharedShopBySlug(slug);

  if (result.ok === false && result.kind === "not_found") {
    notFound();
  }

  if (result.ok === false && result.kind === "error") {
    return <ShopUnavailable message={result.message} />;
  }

  return <ShopListContent payload={result.payload} />;
}
