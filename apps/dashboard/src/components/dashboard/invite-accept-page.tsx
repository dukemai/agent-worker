"use client";

import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

async function acceptInvite(token: string) {
  const response = await fetch("/api/household/invites/accept", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  const json = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) {
    throw new Error(json.error ?? "Failed to accept invite");
  }
  return json;
}

export function InviteAcceptPage({ token, signedIn }: { token: string; signedIn: boolean }) {
  const router = useRouter();
  const mutation = useMutation({
    mutationFn: () => acceptInvite(token),
    onSuccess: () => {
      router.replace("/family/recipes");
      router.refresh();
    },
  });

  const next = `/invite/${encodeURIComponent(token)}`;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Join family space</CardTitle>
          <CardDescription>
            Accept this invite to collaborate on family recipes and shared planning.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!signedIn ? (
            <>
              <p className="text-sm text-muted-foreground">
                Sign in or create an account first, then you will return here to accept the invite.
              </p>
              <Button asChild>
                <Link href={`/login?next=${encodeURIComponent(next)}`}>Sign in or create account</Link>
              </Button>
            </>
          ) : (
            <>
              {mutation.error instanceof Error ? (
                <p className="text-sm text-red-600">{mutation.error.message}</p>
              ) : null}
              <Button
                type="button"
                disabled={mutation.isPending}
                onClick={() => mutation.mutate()}
              >
                {mutation.isPending ? "Joining..." : "Accept invite"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
