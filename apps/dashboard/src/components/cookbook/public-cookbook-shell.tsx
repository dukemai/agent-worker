import Link from "next/link";
import { ChefHat } from "lucide-react";

type PublicCookbookShellProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
};

export function PublicCookbookShell({ title, subtitle, children }: PublicCookbookShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-muted/30">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/cookbook" className="flex items-center gap-2 text-foreground hover:opacity-90">
            <ChefHat className="size-8 text-emerald-700 dark:text-emerald-400" aria-hidden />
            <div>
              <p className="text-lg font-semibold leading-tight">{title}</p>
              {subtitle ? (
                <p className="text-sm text-muted-foreground">{subtitle}</p>
              ) : null}
            </div>
          </Link>
          <p className="text-xs text-muted-foreground">
            Read-only · Search and open a recipe to cook
          </p>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-4 py-8">{children}</div>
      <footer className="border-t py-8 text-center text-xs text-muted-foreground">
        <CookbookFeedback />
      </footer>
    </div>
  );
}

function CookbookFeedback() {
  const email = process.env.NEXT_PUBLIC_COOKBOOK_FEEDBACK_EMAIL?.trim();
  if (email) {
    return (
      <p>
        Feedback?{" "}
        <a className="text-primary underline underline-offset-2" href={`mailto:${email}`}>
          Email the host
        </a>
      </p>
    );
  }
  return <p>Enjoy — recipe feedback goes through your host.</p>;
}
