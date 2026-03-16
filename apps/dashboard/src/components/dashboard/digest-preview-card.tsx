"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchDigestPreview } from "@/lib/digest-api";

export function DigestPreviewCard() {
  const previewQuery = useQuery({
    queryKey: ["digest", "preview"],
    queryFn: fetchDigestPreview,
  });

  if (previewQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading digest preview…</p>;
  }

  if (previewQuery.error instanceof Error) {
    return <p className="text-sm text-red-600">Failed to load digest preview: {previewQuery.error.message}</p>;
  }

  const data = previewQuery.data;
  if (!data) {
    return <p className="text-sm text-muted-foreground">No digest preview available.</p>;
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>
            Preview: Tomorrow&apos;s Daily Digest
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              For {data.date} · generated at {new Date(data.generated_at).toLocaleString()}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <section>
            <h2 className="text-base font-semibold">Tasks (preview)</h2>
            <div className="mt-2 grid gap-3 md:grid-cols-3">
              <div className="space-y-1">
                <h3 className="text-sm font-medium">Today</h3>
                {data.tasks.today.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No pending tasks.</p>
                ) : (
                  <ul className="space-y-1 text-xs">
                    {data.tasks.today.map((task) => (
                      <li key={task.id} className="flex items-start gap-2">
                        <input type="checkbox" className="mt-0.5 h-3 w-3 rounded border" />
                        <span>
                          {task.title}
                          {task.due_date ? (
                            <span className="text-muted-foreground">
                              {" "}
                              — due {new Date(task.due_date).toLocaleDateString()}
                            </span>
                          ) : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-medium">This Week</h3>
                {data.tasks.this_week.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No pending tasks.</p>
                ) : (
                  <ul className="space-y-1 text-xs">
                    {data.tasks.this_week.map((task) => (
                      <li key={task.id} className="flex items-start gap-2">
                        <input type="checkbox" className="mt-0.5 h-3 w-3 rounded border" />
                        <span>
                          {task.title}
                          {task.due_date ? (
                            <span className="text-muted-foreground">
                              {" "}
                              — due {new Date(task.due_date).toLocaleDateString()}
                            </span>
                          ) : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-medium">Later</h3>
                {data.tasks.later.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No pending tasks.</p>
                ) : (
                  <ul className="space-y-1 text-xs">
                    {data.tasks.later.map((task) => (
                      <li key={task.id} className="flex items-start gap-2">
                        <input type="checkbox" className="mt-0.5 h-3 w-3 rounded border" />
                        <span>
                          {task.title}
                          {task.due_date ? (
                            <span className="text-muted-foreground">
                              {" "}
                              — due {new Date(task.due_date).toLocaleDateString()}
                            </span>
                          ) : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </section>
          <div className="overflow-hidden rounded-md border bg-white">
            <iframe
              title="Daily Digest Preview"
              srcDoc={data.html}
              className="h-[800px] w-full border-0"
              sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
            />
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

