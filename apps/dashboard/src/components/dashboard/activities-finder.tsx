"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ActivityType, LocalActivity, SeasonalActivityInstance } from "@/types/database";
import { ActivityCard, isSeasonalActivity } from "./activities-cards";

type FinderItem = SeasonalActivityInstance | LocalActivity;
type WeatherIntent = "any" | "sunny" | "rainy";
type WhenIntent = "any" | "today" | "week";
type DistanceIntent = "any" | "nearby";
type TypeIntent = "any" | ActivityType;

const NEARBY_AREAS = ["järfälla", "jarfalla", "sundbyberg", "sollentuna", "solna", "upplands-bro", "upplands bro", "upplands väsby"];
const STOP_WORDS = new Set([
  "a", "an", "and", "day", "do", "find", "for", "go", "it", "its", "let", "lets", "something", "the", "to", "visit", "want", "we",
  "sunny", "sun", "solig", "garden", "gardens", "tradgard", "park", "nature", "natur", "today", "idag", "week", "nearby", "nara", "free", "gratis",
]);

function normalize(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9åäö]+/g, " ").trim();
}

function includesOne(text: string, values: string[]) {
  return values.some((value) => text.includes(normalize(value)));
}

function activityType(item: FinderItem): ActivityType {
  if (!isSeasonalActivity(item)) return item.activity_type;
  return item.activity?.activity_type ?? (item.tags.includes("nature") ? "nature" : "event");
}

function relevantOn(item: FinderItem, start: string, end: string) {
  if (!isSeasonalActivity(item)) return true;
  if (item.occurrence_dates.some((date) => date >= start && date <= end)) return true;
  const from = item.valid_from ?? start;
  const until = item.valid_until ?? end;
  return from <= end && until >= start;
}

function addDays(value: string, days: number) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function inferQuery(query: string) {
  const text = normalize(query);
  const weather: WeatherIntent = includesOne(text, ["sunny", "sun", "solig", "soligt"])
    ? "sunny"
    : includesOne(text, ["rain", "rainy", "regn", "regnig"])
      ? "rainy"
      : "any";
  const type: TypeIntent = includesOne(text, ["garden", "gardens", "trädgård", "park", "nature", "natur"])
    ? "nature"
    : includesOne(text, ["museum"])
      ? "museum"
      : includesOne(text, ["library", "bibliotek"])
        ? "library"
        : includesOne(text, ["swim", "swimming", "bad", "simma"])
          ? "swimming"
          : "any";
  return {
    weather,
    type,
    when: includesOne(text, ["today", "idag"]) ? "today" as const : "any" as const,
    nearby: includesOne(text, ["nearby", "nära", "nara"]),
    free: includesOne(text, ["free", "gratis"]),
    noBooking: includesOne(text, ["no booking", "drop in", "drop-in"]),
    tokens: text.split(" ").filter((token) => token.length > 1 && !STOP_WORDS.has(token)),
  };
}

export function ActivitiesFinder({
  items,
  today,
  onFavoriteChange,
  favoriteBusy,
}: {
  items: FinderItem[];
  today: string;
  onFavoriteChange: (item: FinderItem, favorite: boolean) => void;
  favoriteBusy: boolean;
}) {
  const [query, setQuery] = useState("");
  const [weather, setWeather] = useState<WeatherIntent>("any");
  const [type, setType] = useState<TypeIntent>("any");
  const [when, setWhen] = useState<WhenIntent>("any");
  const [distance, setDistance] = useState<DistanceIntent>("any");
  const [freeOnly, setFreeOnly] = useState(false);
  const [noBooking, setNoBooking] = useState(false);
  const [highEnergy, setHighEnergy] = useState(false);

  const inferred = inferQuery(query);
  const activeWeather = weather !== "any" ? weather : inferred.weather;
  const activeType = type !== "any" ? type : inferred.type;
  const activeWhen = when !== "any" ? when : inferred.when;
  const activeNearby = distance === "nearby" || inferred.nearby;
  const activeFree = freeOnly || inferred.free;
  const activeNoBooking = noBooking || inferred.noBooking;
  const hasIntent = Boolean(query.trim()) || weather !== "any" || type !== "any" || when !== "any" || distance !== "any" || freeOnly || noBooking || highEnergy;

  const results = useMemo(() => {
    if (!hasIntent) return [];
    const weekEnd = addDays(today, 6);
    return items
      .map((item) => {
        const itemType = activityType(item);
        const text = normalize([item.title, item.description, item.area, item.address, itemType, ...item.tags].filter(Boolean).join(" "));
        const reasons: string[] = [];
        let score = item.favorite ? 1 : 0;

        if (activeWeather === "sunny") {
          if (item.weather_fit === "indoor") return null;
          score += item.weather_fit === "outdoor" ? 4 : 2;
          reasons.push(item.weather_fit === "outdoor" ? "outdoor" : "mixed weather");
        }
        if (activeWeather === "rainy") {
          if (item.weather_fit === "outdoor") return null;
          score += item.weather_fit === "indoor" ? 4 : 2;
          reasons.push(item.weather_fit === "indoor" ? "indoors" : "rain-friendly");
        }
        if (activeType !== "any") {
          const typeMatch = itemType === activeType || (activeType === "nature" && includesOne(text, ["garden", "trädgård", "park", "nature", "natur", "botanical", "botanisk"]));
          if (!typeMatch) return null;
          score += itemType === activeType ? 5 : 3;
          reasons.push(activeType === "nature" ? "garden/nature" : activeType);
        }
        if (activeWhen === "today" && !relevantOn(item, today, today)) return null;
        if (activeWhen === "week" && !relevantOn(item, today, weekEnd)) return null;
        if (activeWhen !== "any") {
          score += 3;
          reasons.push(activeWhen === "today" ? "date matches today" : "date matches this week");
        }
        if (activeFree && item.cost_level !== "free" && normalize(item.price_text ?? "") !== "free") return null;
        if (activeFree) {
          score += 3;
          reasons.push("free");
        }
        if (activeNoBooking && item.booking_required) return null;
        if (activeNoBooking) {
          score += 2;
          reasons.push("no booking");
        }
        if (highEnergy && item.energy_level !== "high") return null;
        if (highEnergy) {
          score += 2;
          reasons.push("high energy");
        }
        if (activeNearby && includesOne(text, NEARBY_AREAS)) {
          score += 3;
          reasons.push("nearby area");
        }
        if (inferred.tokens.length > 0) {
          const matched = inferred.tokens.filter((token) => text.includes(token));
          if (matched.length === 0) return null;
          score += matched.length * 3;
          reasons.push(`matches “${matched.join(" ")}”`);
        }
        return { item, score, reasons };
      })
      .filter((result): result is { item: FinderItem; score: number; reasons: string[] } => result !== null)
      .sort((a, b) => b.score - a.score || Number(b.item.favorite) - Number(a.item.favorite))
      .slice(0, 8);
  }, [activeFree, activeNearby, activeNoBooking, activeType, activeWeather, activeWhen, hasIntent, highEnergy, inferred.tokens, items, today]);

  function clear() {
    setQuery(""); setWeather("any"); setType("any"); setWhen("any"); setDistance("any");
    setFreeOnly(false); setNoBooking(false); setHighEnergy(false);
  }

  return (
    <section className="space-y-3 rounded-xl border bg-muted/10 p-4">
      <div>
        <h2 className="text-lg font-semibold">Find an activity</h2>
        <p className="text-sm text-muted-foreground">Describe the moment or choose what matters.</p>
      </div>
      <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="It’s sunny; let’s visit a garden" />
      <div className="flex flex-wrap gap-2">
        <Button size="xs" variant="outline" onClick={() => { setWeather("sunny"); setType("any"); setQuery(""); }}>Sunny day</Button>
        <Button size="xs" variant="outline" onClick={() => { setType("nature"); setQuery(""); }}>Garden or nature</Button>
        <Button size="xs" variant="outline" onClick={() => { setWeather("rainy"); setQuery(""); }}>Rainy day</Button>
        <Button size="xs" variant={freeOnly ? "secondary" : "outline"} onClick={() => setFreeOnly((value) => !value)}>Free</Button>
        <Button size="xs" variant={noBooking ? "secondary" : "outline"} onClick={() => setNoBooking((value) => !value)}>No booking</Button>
        <Button size="xs" variant={highEnergy ? "secondary" : "outline"} onClick={() => setHighEnergy((value) => !value)}>Burn energy</Button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Select value={weather} onValueChange={(value) => setWeather(value as WeatherIntent)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="any">Any weather</SelectItem><SelectItem value="sunny">Sunny / outdoors</SelectItem><SelectItem value="rainy">Rainy / indoors</SelectItem></SelectContent></Select>
        <Select value={type} onValueChange={(value) => setType(value as TypeIntent)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="any">Any activity</SelectItem><SelectItem value="nature">Garden / nature</SelectItem><SelectItem value="playground">Playground</SelectItem><SelectItem value="swimming">Swimming</SelectItem><SelectItem value="museum">Museum</SelectItem><SelectItem value="library">Library</SelectItem><SelectItem value="sport">Sport</SelectItem><SelectItem value="workshop">Workshop</SelectItem><SelectItem value="event">Event</SelectItem></SelectContent></Select>
        <Select value={when} onValueChange={(value) => setWhen(value as WhenIntent)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="any">Any time</SelectItem><SelectItem value="today">Today</SelectItem><SelectItem value="week">This week</SelectItem></SelectContent></Select>
        <Select value={distance} onValueChange={(value) => setDistance(value as DistanceIntent)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="any">Any distance</SelectItem><SelectItem value="nearby">Prefer nearby</SelectItem></SelectContent></Select>
      </div>
      {hasIntent ? (
        <div className="space-y-3 border-t pt-3">
          <div className="flex items-center justify-between gap-2"><p className="text-sm font-medium">{results.length} matches</p><Button size="xs" variant="ghost" onClick={clear}>Clear</Button></div>
          {results.length === 0 ? <p className="text-sm italic text-muted-foreground">No activities match yet. Try removing one criterion.</p> : (
            <div className="grid gap-3 lg:grid-cols-2">
              {results.map(({ item, reasons }) => (
                <div key={`${isSeasonalActivity(item) ? "s" : "l"}-${item.id}`} className="space-y-1.5">
                  <div className="flex flex-wrap gap-1">{reasons.map((reason) => <Badge key={reason} variant="outline">{reason}</Badge>)}</div>
                  <ActivityCard item={item} compact showDetailButton onFavoriteChange={(favorite) => onFavoriteChange(item, favorite)} favoriteBusy={favoriteBusy} />
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
