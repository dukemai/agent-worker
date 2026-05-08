import { Suspense, type ReactNode } from "react";
import { DashboardHeader } from "@/components/dashboard/header";
import { RecipeLocaleProvider } from "@/components/dashboard/recipe-locale-provider";

type RecipeHubPageLayoutProps = {
  children: ReactNode;
  fallback?: ReactNode;
  withLocale?: boolean;
};

export function RecipeHubPageLayout({
  children,
  fallback = <p className="px-4 py-6 text-sm text-muted-foreground">Loading...</p>,
  withLocale = false,
}: RecipeHubPageLayoutProps) {
  const content = withLocale ? <RecipeLocaleProvider>{children}</RecipeLocaleProvider> : children;

  return (
    <>
      <DashboardHeader />
      <Suspense fallback={fallback}>{content}</Suspense>
    </>
  );
}
