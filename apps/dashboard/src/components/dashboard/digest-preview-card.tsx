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
            <h2 className="text-base font-semibold">Weather &amp; Briefing</h2>
            <p className="text-sm text-muted-foreground">{data.weather.summary}</p>
            <div className="mt-2 rounded-md border bg-muted/40 p-3 text-sm whitespace-pre-wrap">
              {data.narrative}
            </div>
          </section>

          <section>
            <h2 className="text-base font-semibold">Tasks</h2>
            <div className="mt-2 grid gap-3 md:grid-cols-3">
              <div className="space-y-1">
                <h3 className="text-sm font-medium">Today</h3>
                {data.tasks.today.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No pending tasks.</p>
                ) : (
                  <ul className="space-y-1 text-xs">
                    {data.tasks.today.map((task) => (
                      <li key={task.id}>
                        {task.title}
                        {task.due_date ? (
                          <span className="text-muted-foreground">
                            {" "}
                            — due {new Date(task.due_date).toLocaleDateString()}
                          </span>
                        ) : null}
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
                      <li key={task.id}>
                        {task.title}
                        {task.due_date ? (
                          <span className="text-muted-foreground">
                            {" "}
                            — due {new Date(task.due_date).toLocaleDateString()}
                          </span>
                        ) : null}
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
                      <li key={task.id}>
                        {task.title}
                        {task.due_date ? (
                          <span className="text-muted-foreground">
                            {" "}
                            — due {new Date(task.due_date).toLocaleDateString()}
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-base font-semibold">Upcoming Renewals</h2>
            {data.renewals.length === 0 ? (
              <p className="text-sm text-muted-foreground">No renewals in the next 30 days.</p>
            ) : (
              <ul className="mt-1 space-y-1 text-sm">
                {data.renewals.map((item, index) => (
                  <li key={`${item.title}-${index}`}>
                    {item.title} — in {item.daysLeft} days ({new Date(item.dueDate).toLocaleDateString()})
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="text-base font-semibold">Garden This Week</h2>
            {data.growing.tasks.length === 0 && data.growing.suggestions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No garden items in this preview.</p>
            ) : (
              <div className="mt-1 space-y-3 text-sm">
                {data.growing.tasks.length > 0 ? (
                  <div>
                    <h3 className="text-sm font-medium">Converted tasks</h3>
                    <ul className="mt-1 space-y-1 text-xs">
                      {data.growing.tasks.map((item, index) => (
                        <li key={`${item.title}-${index}`}>
                          {item.title}
                          {item.dueDate ? (
                            <span className="text-muted-foreground">
                              {" "}
                              — due {new Date(item.dueDate).toLocaleDateString()}
                            </span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {data.growing.suggestions.length > 0 ? (
                  <div>
                    <h3 className="text-sm font-medium">Ideas</h3>
                    <ul className="mt-1 space-y-1 text-xs">
                      {data.growing.suggestions.map((item, index) => (
                        <li key={`${item.title}-${index}`}>
                          <strong>{item.title}</strong>: {item.details}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            )}
          </section>

          <section>
            <h2 className="text-base font-semibold">Deals for You</h2>
            {data.promotions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No promotions in this preview.</p>
            ) : (
              <ul className="mt-1 space-y-1 text-sm">
                {data.promotions.map((item, index) => (
                  <li key={`${item.store}-${index}`}>
                    <strong>{item.store}</strong>: {item.summary}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </CardContent>
      </Card>
    </main>
  );
}

