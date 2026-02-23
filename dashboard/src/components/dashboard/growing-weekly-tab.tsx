"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Bucket } from "@/types/database";
import type { WeeklyGrowingResponse } from "./growing-dashboard.types";

export type GrowingWeeklyTabProps = {
  data: WeeklyGrowingResponse;
  onAddToBucket: (suggestionId: string, bucket: Bucket) => void;
  onDismiss: (suggestionId: string) => void;
  isBusy: boolean;
};

export function GrowingWeeklyTab({ data, onAddToBucket, onDismiss, isBusy }: GrowingWeeklyTabProps) {
  return (
    <section className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>This Week in Stockholm</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.actions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No actions this week.</p>
          ) : (
            data.actions.map((item) => (
              <article key={item.id} className="rounded-md border p-3">
                <h3 className="font-medium">{item.title}</h3>
                <p className="mb-3 mt-1 text-sm text-muted-foreground">{item.details}</p>
                <div className="flex flex-wrap gap-1">
                  <Button
                    size="sm"
                    className="min-h-11"
                    onClick={() => onAddToBucket(item.id, "today")}
                    disabled={isBusy}
                  >
                    Add to Today
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="min-h-11"
                    onClick={() => onAddToBucket(item.id, "this_week")}
                    disabled={isBusy}
                  >
                    Add to This Week
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="min-h-11"
                    onClick={() => onDismiss(item.id)}
                    disabled={isBusy}
                  >
                    Dismiss
                  </Button>
                </div>
              </article>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Inspiration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.inspirations.length === 0 ? (
            <p className="text-sm text-muted-foreground">No inspirations this week.</p>
          ) : (
            data.inspirations.map((item) => (
              <article key={item.id} className="rounded-md border p-3">
                <h3 className="font-medium">{item.title}</h3>
                <p className="mb-3 mt-1 text-sm text-muted-foreground">{item.details}</p>
                <div className="flex flex-wrap gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="min-h-11"
                    onClick={() => onAddToBucket(item.id, "this_week")}
                    disabled={isBusy}
                  >
                    Turn into task
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="min-h-11"
                    onClick={() => onDismiss(item.id)}
                    disabled={isBusy}
                  >
                    Dismiss
                  </Button>
                </div>
              </article>
            ))
          )}
        </CardContent>
      </Card>
    </section>
  );
}
