"use client";

import { useState } from "react";
import { ExternalLink, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { LocalActivity, SeasonalActivityInstance } from "@/types/database";
import { cn } from "@/lib/utils";

export function isSeasonalActivity(item: SeasonalActivityInstance | LocalActivity): item is SeasonalActivityInstance {
  return "instance_key" in item;
}

function parseYmd(value: string | null | undefined): Date | null {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(Date.UTC(year, month - 1, day));
}

export function formatDate(value: string): string {
  const date = parseYmd(value);
  if (!date) return value;
  const nowYear = new Date().getFullYear();
  return date.toLocaleDateString("sv-SE", {
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(date.getUTCFullYear() === nowYear ? {} : { year: "numeric" }),
  });
}

function daysUntil(value: string): number | null {
  const date = parseYmd(value);
  if (!date) return null;
  const now = new Date();
  const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((date.getTime() - todayUtc) / 86_400_000);
}

function formatCountdown(value: string): string | null {
  const days = daysUntil(value);
  if (days === null || days < 0 || days > 13) return null;
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}

export function getPrimaryActivityDate(item: SeasonalActivityInstance): string | null {
  if (item.occurrence_dates.length > 0) return item.occurrence_dates[0];
  return item.valid_from ?? item.valid_until;
}

export function formatActivityDate(item: SeasonalActivityInstance): string | null {
  if (item.occurrence_dates.length > 0) return item.occurrence_dates.slice(0, 3).map(formatDate).join(", ");
  if (item.valid_from && item.valid_until) return `${formatDate(item.valid_from)} - ${formatDate(item.valid_until)}`;
  if (item.valid_from) return `From ${formatDate(item.valid_from)}`;
  if (item.valid_until) return `Until ${formatDate(item.valid_until)}`;
  return null;
}

export function ActivityCard({
  item,
  onDismiss,
  busy,
  compact = false,
  hideDescription = false,
  showDetailButton = false,
  onFavoriteChange,
  favoriteBusy,
}: {
  item: SeasonalActivityInstance | LocalActivity;
  onDismiss?: () => void;
  busy?: boolean;
  compact?: boolean;
  hideDescription?: boolean;
  showDetailButton?: boolean;
  onFavoriteChange?: (favorite: boolean) => void;
  favoriteBusy?: boolean;
}) {
  const [detailOpen, setDetailOpen] = useState(false);
  const seasonal = isSeasonalActivity(item);
  const dateLabel = seasonal ? formatActivityDate(item) : null;
  const countdown = seasonal ? formatCountdown(getPrimaryActivityDate(item) ?? "") : null;
  const bookingUrl = seasonal ? item.booking_url : item.location_url;
  const priceLabel = item.price_text ?? item.cost_notes;

  return (
    <article className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold leading-snug">{item.title}</h3>
            <Badge variant="outline" className="capitalize">
              {seasonal ? "seasonal" : item.activity_type}
            </Badge>
            <Badge variant="outline" className="capitalize">
              {item.weather_fit}
            </Badge>
          </div>
          {dateLabel ? (
            <p className="text-xs font-medium text-blue-700 dark:text-blue-300">
              {dateLabel}
              {countdown ? <span className="ml-2 text-muted-foreground">({countdown})</span> : null}
            </p>
          ) : null}
          {seasonal && item.time_text ? <p className="text-xs text-muted-foreground">{item.time_text}</p> : null}
          {item.address || item.area ? (
            <p className="text-xs text-muted-foreground">{[item.address, item.area].filter(Boolean).join(" · ")}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {onFavoriteChange ? (
            <Button
              type="button"
              size="icon-xs"
              variant={item.favorite ? "secondary" : "ghost"}
              aria-label={item.favorite ? `Remove ${item.title} from favorites` : `Mark ${item.title} as favorite`}
              title={item.favorite ? "Remove favorite" : "Favorite"}
              onClick={() => onFavoriteChange(!item.favorite)}
              disabled={favoriteBusy}
            >
              <Star className={cn("size-3.5", item.favorite ? "fill-current" : "")} aria-hidden />
            </Button>
          ) : null}
          {bookingUrl ? (
            <Button asChild size="icon-xs" variant="ghost" aria-label="Open activity link">
              <a href={bookingUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="size-3.5" aria-hidden />
              </a>
            </Button>
          ) : null}
        </div>
      </div>

      {item.description && !hideDescription ? (
        <p className={cn("mt-3 text-sm text-muted-foreground", compact ? "line-clamp-2" : "leading-relaxed")}>
          {item.description}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
        {item.area ? <Badge variant="outline">{item.area}</Badge> : null}
        {item.address ? <Badge variant="outline">{item.address}</Badge> : null}
        <Badge variant="outline" className="capitalize">
          {item.cost_level}
        </Badge>
        {priceLabel ? <Badge variant="outline">{priceLabel}</Badge> : null}
        <Badge variant="outline" className="capitalize">
          {item.energy_level} energy
        </Badge>
        {item.booking_required ? <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Booking</Badge> : null}
        {item.favorite ? <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Favorite</Badge> : null}
        {seasonal && item.booking_deadline ? <Badge variant="outline">Book by {formatDate(item.booking_deadline)}</Badge> : null}
      </div>

      {item.tags.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {item.tags.slice(0, 6).map((tag) => (
            <span key={`${item.id}-${tag}`} className="text-[11px] text-muted-foreground">
              #{tag}
            </span>
          ))}
        </div>
      ) : null}

      {onDismiss || showDetailButton ? (
        <div className="mt-3 flex justify-end gap-2">
          {showDetailButton ? (
            <Button type="button" size="xs" variant="outline" onClick={() => setDetailOpen(true)}>
              View detail
            </Button>
          ) : null}
          {onDismiss ? (
            <Button type="button" size="xs" variant="ghost" onClick={onDismiss} disabled={busy}>
              Not now
            </Button>
          ) : null}
        </div>
      ) : null}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl" showCloseButton>
          <DialogHeader>
            <DialogTitle>{item.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {dateLabel ? (
              <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                {dateLabel}
                {countdown ? <span className="ml-2 text-muted-foreground">({countdown})</span> : null}
              </p>
            ) : null}
            {seasonal && item.time_text ? <p className="text-sm text-muted-foreground">{item.time_text}</p> : null}
            {item.description ? <p className="text-sm leading-relaxed text-muted-foreground">{item.description}</p> : null}
            <div className="flex flex-wrap gap-1.5 text-xs">
              {item.area ? <Badge variant="outline">{item.area}</Badge> : null}
              {item.address ? <Badge variant="outline">{item.address}</Badge> : null}
              <Badge variant="outline" className="capitalize">{item.weather_fit}</Badge>
              <Badge variant="outline" className="capitalize">{item.cost_level}</Badge>
              {priceLabel ? <Badge variant="outline">{priceLabel}</Badge> : null}
              {item.booking_required ? <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Booking</Badge> : null}
              {item.favorite ? <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Favorite</Badge> : null}
              {seasonal && item.booking_deadline ? <Badge variant="outline">Book by {formatDate(item.booking_deadline)}</Badge> : null}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" onClick={() => setDetailOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </article>
  );
}
