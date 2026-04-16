import { cn } from "@/lib/utils";

/** Card shell for public /shop pages — warm background + border. */
export function ShopPanel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "w-full max-w-md rounded-lg border border-stone-200/90 bg-amber-50/90 px-5 py-6 shadow-sm sm:px-6 sm:py-8",
        className,
      )}
    >
      {children}
    </div>
  );
}
