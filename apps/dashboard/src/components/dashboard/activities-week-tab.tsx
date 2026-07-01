"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getISOWeekNumber } from "@agent/shared";
import { ActivityCard, formatDate, isSeasonalActivity } from "./activities-cards";
import { ActivitiesFinder } from "./activities-finder";
import {
  fetchActivitiesSummary,
  updateLocalActivityFavorite,
  updateLocalActivityStatus,
  updateSeasonalActivityFavorite,
  updateSeasonalActivityStatus,
} from "./activities-api";

function EmptyState({ label }: { label: string }) {
  return <p className="text-sm italic text-muted-foreground">{label}</p>;
}

export function ActivitiesWeekTab() {
  const queryClient = useQueryClient();
  const summaryQuery = useQuery({
    queryKey: ["activities", "summary"],
    queryFn: fetchActivitiesSummary,
  });

  const dismissSeasonalMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "dismissed" }) => updateSeasonalActivityStatus(id, status),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["activities", "summary"] }),
        queryClient.invalidateQueries({ queryKey: ["activities", "seasonal"] }),
      ]);
    },
  });

  const dismissLocalMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "dismissed" }) => updateLocalActivityStatus(id, status),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["activities", "summary"] }),
        queryClient.invalidateQueries({ queryKey: ["activities", "local"] }),
      ]);
    },
  });

  const favoriteSeasonalMutation = useMutation({
    mutationFn: ({ id, favorite }: { id: string; favorite: boolean }) => updateSeasonalActivityFavorite(id, favorite),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["activities", "summary"] }),
        queryClient.invalidateQueries({ queryKey: ["activities", "seasonal"] }),
      ]);
    },
  });

  const favoriteLocalMutation = useMutation({
    mutationFn: ({ id, favorite }: { id: string; favorite: boolean }) => updateLocalActivityFavorite(id, favorite),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["activities", "summary"] }),
        queryClient.invalidateQueries({ queryKey: ["activities", "local"] }),
      ]);
    },
  });

  if (summaryQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading activity ideas...</p>;
  }

  const data = summaryQuery.data;
  if (!data) {
    return <EmptyState label="No activity suggestions available." />;
  }

  const error =
    summaryQuery.error instanceof Error
      ? summaryQuery.error.message
      : dismissSeasonalMutation.error instanceof Error
        ? dismissSeasonalMutation.error.message
        : dismissLocalMutation.error instanceof Error
          ? dismissLocalMutation.error.message
          : favoriteSeasonalMutation.error instanceof Error
            ? favoriteSeasonalMutation.error.message
            : favoriteLocalMutation.error instanceof Error
              ? favoriteLocalMutation.error.message
              : null;

  return (
    <section className="space-y-4">
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <ActivitiesFinder
        items={data.finder_items}
        today={data.today}
        onFavoriteChange={(item, favorite) =>
          isSeasonalActivity(item)
            ? favoriteSeasonalMutation.mutate({ id: item.id, favorite })
            : favoriteLocalMutation.mutate({ id: item.id, favorite })
        }
        favoriteBusy={favoriteSeasonalMutation.isPending || favoriteLocalMutation.isPending}
      />

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">This Week</h2>
            <span className="text-xs font-medium text-muted-foreground">
              Week {getISOWeekNumber()} · {formatDate(data.today)} to {formatDate(data.week_end)}
            </span>
          </div>
          <div className="space-y-3">
            {data.this_week.length === 0 ? (
              <EmptyState label="No current seasonal activities extracted yet." />
            ) : (
              data.this_week.map((item) => (
                <ActivityCard
                  key={item.id}
                  item={item}
                  onDismiss={() => dismissSeasonalMutation.mutate({ id: item.id, status: "dismissed" })}
                  busy={dismissSeasonalMutation.isPending}
                  showDetailButton
                  onFavoriteChange={(favorite) => favoriteSeasonalMutation.mutate({ id: item.id, favorite })}
                  favoriteBusy={favoriteSeasonalMutation.isPending}
                />
              ))
            )}
          </div>
        </section>

        <div className="space-y-4">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Needs Booking</h2>
            <div className="space-y-3">
              {data.needs_booking.length === 0 ? (
                <EmptyState label="No booking deadlines found." />
              ) : (
                data.needs_booking.map((item) => (
                  <ActivityCard
                    key={item.id}
                    item={item}
                    compact
                    hideDescription
                    showDetailButton
                    onFavoriteChange={(favorite) => favoriteSeasonalMutation.mutate({ id: item.id, favorite })}
                    favoriteBusy={favoriteSeasonalMutation.isPending}
                  />
                ))
              )}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Today</h2>
            <div className="space-y-3">
              {data.today_items.length === 0 ? (
                <EmptyState label="No fixed activity for today." />
              ) : (
                data.today_items.map((item) => (
                  <ActivityCard
                    key={item.id}
                    item={item}
                    compact
                    showDetailButton
                    onFavoriteChange={(favorite) => favoriteSeasonalMutation.mutate({ id: item.id, favorite })}
                    favoriteBusy={favoriteSeasonalMutation.isPending}
                  />
                ))
              )}
            </div>
          </section>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Rainy Day</h2>
          <div className="space-y-3">
            {data.rainy_day.length === 0 ? (
              <EmptyState label="No indoor or mixed-weather backups yet." />
            ) : (
              data.rainy_day.map((item) => (
                <ActivityCard
                  key={`${isSeasonalActivity(item) ? "s" : "l"}-${item.id}`}
                  item={item}
                  compact
                  showDetailButton
                  onFavoriteChange={(favorite) =>
                    isSeasonalActivity(item)
                      ? favoriteSeasonalMutation.mutate({ id: item.id, favorite })
                      : favoriteLocalMutation.mutate({ id: item.id, favorite })
                  }
                  favoriteBusy={
                    isSeasonalActivity(item) ? favoriteSeasonalMutation.isPending : favoriteLocalMutation.isPending
                  }
                />
              ))
            )}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Evergreen Fallbacks</h2>
          <div className="space-y-3">
            {data.evergreen.length === 0 ? (
              <EmptyState label="Reusable local activities will appear here." />
            ) : (
              data.evergreen.map((item) => (
                <ActivityCard
                  key={item.id}
                  item={item}
                  compact
                  onDismiss={() => dismissLocalMutation.mutate({ id: item.id, status: "dismissed" })}
                  busy={dismissLocalMutation.isPending}
                  showDetailButton
                  onFavoriteChange={(favorite) => favoriteLocalMutation.mutate({ id: item.id, favorite })}
                  favoriteBusy={favoriteLocalMutation.isPending}
                />
              ))
            )}
          </div>
        </section>
      </div>
    </section>
  );
}
