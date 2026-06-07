"use client";

import { Fragment, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, CalendarPlus, Eye, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { itineraryBlocks } from "@/components/dashboard/trip-constants";
import { createTripItineraryItem, deleteTripItineraryItem, refreshTripWeatherForecast, updateTripItineraryItem, updateTripOption } from "@/components/dashboard/trip-ops-api";
import { buildDefaultPlanNotes, buildKnowledgeStories, buildLogisticsPresetDraft, buildLogisticsPresetNotes, buildManualItineraryNotes, buildOptionItineraryNotes, formatItineraryDayDate, getAccommodationLogistics, getDefaultItineraryBlock, getDefaultWeatherLocationForDay, getFollowupOptions, getForecastAvailability, getItineraryAnchorLocation, getItineraryDayIsoDate, getItineraryNoteField, getItineraryStoryMatches, getSortOrderForPosition, setLocationInNotes, sortItineraryItems, truncateText } from "@/components/dashboard/trip-utils";
import { LabeledField, SummaryValue, TripSection } from "@/components/dashboard/trip-detail/trip-detail-shared";
import type { AccommodationLogistics, ItineraryPresetDraft, ItineraryPresetKind, ItineraryStoryMatch } from "@/components/dashboard/trip-types";
import type { PanelProps } from "@/components/dashboard/trip-detail/trip-detail-shared";
import type { TripItineraryBlock, TripItineraryItem, TripKnowledgeItem, TripOption, TripWeatherForecast } from "@/types/database";

export function TripItineraryPanel({
  tripId,
  dayCount,
  startDate,
  destination,
  logisticsDetails,
  itinerary,
  options,
  knowledge,
  weatherForecasts,
  onError,
  onDone,
}: PanelProps & { dayCount: number; startDate: string | null; destination: string; logisticsDetails: Record<string, unknown> | null; itinerary: TripItineraryItem[]; options: TripOption[]; knowledge: TripKnowledgeItem[]; weatherForecasts: TripWeatherForecast[] }) {
  const [draft, setDraft] = useState({ title: "", day_number: 1, block: "morning" as TripItineraryBlock, option_id: "custom", notes: "", position: "end" });
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [weatherDay, setWeatherDay] = useState<number | null>(null);
  const [weatherLocationByDay, setWeatherLocationByDay] = useState<Record<number, string>>({});
  const [fetchingWeatherDay, setFetchingWeatherDay] = useState<number | null>(null);
  const [movingItem, setMovingItem] = useState<TripItineraryItem | null>(null);
  const [followupItem, setFollowupItem] = useState<TripItineraryItem | null>(null);
  const [detailItem, setDetailItem] = useState<TripItineraryItem | null>(null);
  const [followupAreaOverride, setFollowupAreaOverride] = useState("");
  const [presetDraft, setPresetDraft] = useState<ItineraryPresetDraft | null>(null);
  const [moveDraft, setMoveDraft] = useState({ day_number: 1, block: "morning" as TripItineraryBlock, location: "" });
  const optionById = useMemo(() => new Map(options.map((option) => [option.id, option])), [options]);
  const stories = useMemo(() => buildKnowledgeStories(knowledge), [knowledge]);
  const weatherByDate = useMemo(() => new Map(weatherForecasts.map((forecast) => [forecast.forecast_date, forecast])), [weatherForecasts]);
  const accommodations = useMemo(() => getAccommodationLogistics(logisticsDetails), [logisticsDetails]);
  const plannedOptionIds = useMemo(
    () => new Set(itinerary.map((item) => item.option_id).filter((id): id is string => typeof id === "string" && id.length > 0)),
    [itinerary]
  );
  const selectedDayItems = useMemo(() => sortItineraryItems(itinerary.filter((item) => item.day_number === draft.day_number)), [draft.day_number, itinerary]);
  const selectedOption = draft.option_id === "custom" ? null : optionById.get(draft.option_id) ?? null;
  const createMutation = useMutation({
    mutationFn: async () => {
      await createTripItineraryItem(tripId, {
        title: draft.title || selectedOption?.title || "",
        day_number: draft.day_number,
        block: draft.block,
        option_id: selectedOption?.id ?? null,
        notes: selectedOption ? buildOptionItineraryNotes(selectedOption, draft.notes) : buildManualItineraryNotes("", draft.notes),
        sort_order: getSortOrderForPosition(draft.position, selectedDayItems),
      });
      if (selectedOption && selectedOption.status !== "planned") {
        await updateTripOption(selectedOption.id, { status: "planned" });
      }
    },
    onSuccess: () => {
      setDraft({ ...draft, title: "", option_id: "custom", notes: "", position: "end" });
      setIsAddDialogOpen(false);
      onError(null);
      onDone();
    },
    onError: (err) => onError(err instanceof Error ? err.message : "Failed to add itinerary item"),
  });
  const deleteMutation = useMutation({
    mutationFn: deleteTripItineraryItem,
    onSuccess: () => {
      onError(null);
      onDone();
    },
    onError: (err) => onError(err instanceof Error ? err.message : "Failed to delete itinerary item"),
  });
  const moveMutation = useMutation({
    mutationFn: ({ item, payload }: { item: TripItineraryItem; payload: typeof moveDraft }) =>
      updateTripItineraryItem(item.id, {
        day_number: payload.day_number,
        block: payload.block,
        notes: setLocationInNotes(item.notes, payload.location),
      }),
    onSuccess: () => {
      setMovingItem(null);
      onError(null);
      onDone();
    },
    onError: (err) => onError(err instanceof Error ? err.message : "Failed to move itinerary item"),
  });
  const reorderMutation = useMutation({
    mutationFn: async ({ item, direction }: { item: TripItineraryItem; direction: "up" | "down" }) => {
      const dayItems = sortItineraryItems(itinerary.filter((candidate) => candidate.day_number === item.day_number));
      const currentIndex = dayItems.findIndex((candidate) => candidate.id === item.id);
      const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
      if (currentIndex < 0 || targetIndex < 0 || targetIndex >= dayItems.length) return;
      const nextItems = [...dayItems];
      [nextItems[currentIndex], nextItems[targetIndex]] = [nextItems[targetIndex], nextItems[currentIndex]];
      await Promise.all(nextItems.map((candidate, index) => updateTripItineraryItem(candidate.id, { sort_order: (index + 1) * 10 })));
    },
    onSuccess: () => {
      onError(null);
      onDone();
    },
    onError: (err) => onError(err instanceof Error ? err.message : "Failed to reorder itinerary item"),
  });
  const followupMutation = useMutation({
    mutationFn: async ({ option, anchor }: { option: TripOption; anchor: TripItineraryItem }) => {
      await createTripItineraryItem(tripId, {
        title: option.title,
        day_number: anchor.day_number,
        block: getDefaultItineraryBlock(option),
        option_id: option.id,
        notes: buildDefaultPlanNotes(option),
      });
      if (option.status !== "planned") {
        await updateTripOption(option.id, { status: "planned" });
      }
    },
    onSuccess: () => {
      setFollowupItem(null);
      onError(null);
      onDone();
    },
    onError: (err) => onError(err instanceof Error ? err.message : "Failed to add follow-up option"),
  });
  const presetMutation = useMutation({
    mutationFn: (payload: ItineraryPresetDraft) => createTripItineraryItem(tripId, {
      title: payload.title,
      day_number: payload.day_number,
      block: payload.block,
      notes: buildLogisticsPresetNotes(payload),
      sort_order: payload.kind === "arrival" ? -100 : payload.kind === "departure" ? 1000 : payload.kind === "check_in" ? 5 : 900,
    }),
    onSuccess: () => {
      setPresetDraft(null);
      onError(null);
      onDone();
    },
    onError: (err) => onError(err instanceof Error ? err.message : "Failed to add logistics block"),
  });
  const weatherMutation = useMutation({
    mutationFn: ({ day, location, forecastDate }: { day: number; location: string; forecastDate: string }) => {
      setFetchingWeatherDay(day);
      return refreshTripWeatherForecast(tripId, location, forecastDate);
    },
    onSuccess: () => {
      onError(null);
      onDone();
    },
    onError: (err) => onError(err instanceof Error ? err.message : "Failed to refresh weather forecast"),
    onSettled: () => setFetchingWeatherDay(null),
  });

  function openMoveDialog(item: TripItineraryItem) {
    setMoveDraft({
      day_number: item.day_number,
      block: item.block,
      location: getItineraryAnchorLocation(item, optionById.get(item.option_id ?? "") ?? null) ?? "",
    });
    setMovingItem(item);
  }

  function openPresetDialog(kind: ItineraryPresetKind, accommodation?: AccommodationLogistics) {
    setPresetDraft(buildLogisticsPresetDraft(kind, dayCount, startDate, logisticsDetails, accommodation));
  }

  function getDayWeatherLocation(day: number, dayItems: TripItineraryItem[], existingForecast: TripWeatherForecast | null) {
    return weatherLocationByDay[day] ?? existingForecast?.location_label ?? getDefaultWeatherLocationForDay(dayItems, optionById, destination);
  }

  function setDayWeatherLocation(day: number, location: string) {
    setWeatherLocationByDay((current) => ({ ...current, [day]: location }));
  }

  function openWeatherDialog(day: number, location: string) {
    setDayWeatherLocation(day, location);
    setWeatherDay(day);
  }

  const followupAnchor = followupItem ? optionById.get(followupItem.option_id ?? "") ?? null : null;
  const inferredFollowupArea = followupItem ? getItineraryAnchorLocation(followupItem, followupAnchor) : null;
  const followupArea = followupAreaOverride.trim() || inferredFollowupArea;
  const followupOptions = followupItem
    ? getFollowupOptions({
        anchor: followupAnchor,
        area: followupArea,
        options,
        plannedOptionIds,
      })
    : [];
  const detailOption = detailItem ? optionById.get(detailItem.option_id ?? "") ?? null : null;
  const detailDate = detailItem ? formatItineraryDayDate(startDate, detailItem.day_number) : null;
  const detailLocation = detailItem ? getItineraryAnchorLocation(detailItem, detailOption) : null;
  const detailTime = detailItem ? getItineraryNoteField(detailItem.notes, "Time") : null;
  const detailStoryMatches = detailItem ? getItineraryStoryMatches(detailItem, detailOption, stories) : [];
  const weatherDateKey = weatherDay ? getItineraryDayIsoDate(startDate, weatherDay) : null;
  const weatherDateLabel = weatherDay ? formatItineraryDayDate(startDate, weatherDay) : null;
  const weatherDayItems = weatherDay ? sortItineraryItems(itinerary.filter((item) => item.day_number === weatherDay)) : [];
  const weatherExistingForecast = weatherDateKey ? weatherByDate.get(weatherDateKey) ?? null : null;
  const weatherDialogLocation = weatherDay ? getDayWeatherLocation(weatherDay, weatherDayItems, weatherExistingForecast) : "";
  const weatherAvailability = weatherDateKey ? getForecastAvailability(weatherDateKey) : null;

  return (
    <TripSection
      title="Itinerary blocks"
      icon={<CalendarPlus className="size-4" aria-hidden />}
      className="border-0 pt-0"
      actions={(
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="size-4" aria-hidden />
            Add block
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => openPresetDialog("arrival")}>
            <CalendarPlus className="size-4" aria-hidden />
            Add arrival
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => openPresetDialog("departure")}>
            <CalendarPlus className="size-4" aria-hidden />
            Add departure
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" size="sm" variant="outline" disabled={accommodations.length === 0}>
                <CalendarPlus className="size-4" aria-hidden />
                Add stay timing
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>Accommodation blocks</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {accommodations.map((accommodation, index) => (
                <Fragment key={`${accommodation.name ?? "stay"}-${index}`}>
                  <DropdownMenuItem onClick={() => openPresetDialog("check_in", accommodation)}>
                    Check-in: {truncateText(accommodation.name ?? `Accommodation ${index + 1}`, 34)}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openPresetDialog("check_out", accommodation)}>
                    Check-out: {truncateText(accommodation.name ?? `Accommodation ${index + 1}`, 34)}
                  </DropdownMenuItem>
                  {index < accommodations.length - 1 ? <DropdownMenuSeparator /> : null}
                </Fragment>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
      contentClassName="space-y-4"
    >
        <div className="space-y-6">
          {Array.from({ length: dayCount }, (_, index) => index + 1).map((day) => {
            const dateLabel = formatItineraryDayDate(startDate, day);
            const dateKey = getItineraryDayIsoDate(startDate, day);
            const dayWeather = dateKey ? weatherByDate.get(dateKey) ?? null : null;
            const dayItems = sortItineraryItems(itinerary.filter((item) => item.day_number === day));
            const weatherLocation = getDayWeatherLocation(day, dayItems, dayWeather);
            return (
              <section key={day} className="space-y-3 border-b pb-6 last:border-b-0 last:pb-0">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h3 className="text-sm font-semibold">
                    Day {day}
                    {dateLabel ? <span className="ml-1 text-muted-foreground">· {dateLabel}</span> : null}
                  </h3>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {dayWeather ? <WeatherForecastBadge forecast={dayWeather} /> : null}
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => openWeatherDialog(day, weatherLocation)}
                      disabled={fetchingWeatherDay === day}
                    >
                      <Sparkles className="size-4" aria-hidden />
                      {fetchingWeatherDay === day ? "Fetching..." : dayWeather ? "Update weather" : "Fetch weather"}
                    </Button>
                  </div>
                </div>
                {dayItems.length === 0 ? <p className="text-sm text-muted-foreground">No blocks</p> : null}
                <div className="grid gap-3 lg:grid-cols-2">
                  {dayItems.map((item) => {
                    const timeLabel = getItineraryNoteField(item.notes, "Time");
                    const itemOption = optionById.get(item.option_id ?? "") ?? null;
                    const locationLabel = getItineraryAnchorLocation(item, itemOption);
                    const itemIndex = dayItems.findIndex((candidate) => candidate.id === item.id);
                    const storyMatches = getItineraryStoryMatches(item, itemOption, stories);
                    return (
                      <div key={item.id} className="rounded-md border p-3">
                        <div className="flex flex-wrap justify-end gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => reorderMutation.mutate({ item, direction: "up" })}
                            disabled={reorderMutation.isPending || itemIndex === 0}
                            aria-label={`Move ${item.title} earlier`}
                          >
                            <ArrowUp className="size-4" aria-hidden />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => reorderMutation.mutate({ item, direction: "down" })}
                            disabled={reorderMutation.isPending || itemIndex === dayItems.length - 1}
                            aria-label={`Move ${item.title} later`}
                          >
                            <ArrowDown className="size-4" aria-hidden />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setDetailItem(item)}
                            aria-label={`View ${item.title}`}
                          >
                            <Eye className="size-4" aria-hidden />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              const anchor = optionById.get(item.option_id ?? "") ?? null;
                              setFollowupAreaOverride(getItineraryAnchorLocation(item, anchor) ?? "");
                              setFollowupItem(item);
                            }}
                            aria-label={`Find follow-ups for ${item.title}`}
                          >
                            <Sparkles className="size-4" aria-hidden />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => openMoveDialog(item)}
                            disabled={moveMutation.isPending}
                            aria-label={`Move ${item.title}`}
                          >
                            <Pencil className="size-4" aria-hidden />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => deleteMutation.mutate(item.id)}
                            disabled={deleteMutation.isPending}
                            aria-label={`Delete ${item.title}`}
                          >
                            <Trash2 className="size-4" aria-hidden />
                          </Button>
                        </div>
                        <div className="mt-2">
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="outline">{item.block}</Badge>
                            {timeLabel ? <Badge variant="secondary">{timeLabel}</Badge> : null}
                            {locationLabel ? <Badge variant="secondary">{locationLabel}</Badge> : null}
                            {storyMatches.length > 0 ? <Badge variant="outline">{storyMatches.length} material{storyMatches.length === 1 ? "" : "s"}</Badge> : null}
                          </div>
                          {!itemOption ? <div className="mt-2 font-medium">{item.title}</div> : null}
                        </div>
                        <ItineraryBlockDescription item={item} option={itemOption} compact />
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add itinerary block</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              createMutation.mutate();
            }}
          >
            <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
              <LabeledField label="Day" htmlFor="add-itinerary-day">
                <Input
                  id="add-itinerary-day"
                  type="number"
                  min={1}
                  max={30}
                  value={draft.day_number}
                  onChange={(event) => setDraft({ ...draft, day_number: Number(event.target.value), position: "end" })}
                />
              </LabeledField>
              <LabeledField label="Block" htmlFor="add-itinerary-block">
                <Select value={draft.block} onValueChange={(value) => setDraft({ ...draft, block: value as TripItineraryBlock })}>
                  <SelectTrigger id="add-itinerary-block"><SelectValue /></SelectTrigger>
                  <SelectContent>{itineraryBlocks.map((block) => <SelectItem key={block} value={block}>{block}</SelectItem>)}</SelectContent>
                </Select>
              </LabeledField>
            </div>
            <LabeledField label="Position" htmlFor="add-itinerary-position">
              <Select value={draft.position} onValueChange={(value) => setDraft({ ...draft, position: value })}>
                <SelectTrigger id="add-itinerary-position"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="end">End of day</SelectItem>
                  <SelectItem value="start">Start of day</SelectItem>
                  {selectedDayItems.map((item) => (
                    <SelectItem key={item.id} value={`after:${item.id}`}>After {truncateText(item.title, 40)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </LabeledField>
            <LabeledField label="Source option" htmlFor="add-itinerary-option">
              <Select
                value={draft.option_id}
                onValueChange={(value) => {
                  const option = value === "custom" ? null : optionById.get(value) ?? null;
                  setDraft({
                    ...draft,
                    option_id: value,
                    title: option ? option.title : draft.title,
                    block: option ? getDefaultItineraryBlock(option) : draft.block,
                  });
                }}
              >
                <SelectTrigger id="add-itinerary-option"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Custom block</SelectItem>
                  {options.map((option) => (
                    <SelectItem key={option.id} value={option.id}>{truncateText(option.title, 52)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </LabeledField>
            <LabeledField label="Title" htmlFor="add-itinerary-title">
              <Input
                id="add-itinerary-title"
                value={draft.title}
                onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                placeholder="Plan block..."
              />
            </LabeledField>
            <LabeledField label="Notes" htmlFor="add-itinerary-notes">
              <Textarea
                id="add-itinerary-notes"
                value={draft.notes}
                onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
                placeholder="Optional details, timing, reminders..."
              />
            </LabeledField>
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Adding..." : "Add block"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={weatherDay !== null} onOpenChange={(open) => {
        if (!open) setWeatherDay(null);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{weatherDay ? `Fetch weather for day ${weatherDay}` : "Fetch weather"}</DialogTitle>
          </DialogHeader>
          {weatherDay ? (
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                if (weatherDateKey) {
                  weatherMutation.mutate({ day: weatherDay, location: weatherDialogLocation, forecastDate: weatherDateKey });
                  setWeatherDay(null);
                }
              }}
            >
              <div className="space-y-1">
                <div className="text-sm font-medium">Day {weatherDay}{weatherDateLabel ? ` · ${weatherDateLabel}` : ""}</div>
                {weatherExistingForecast ? <WeatherForecastBadge forecast={weatherExistingForecast} /> : null}
              </div>
              <LabeledField label="Weather location" htmlFor="weather-day-location">
                <Input
                  id="weather-day-location"
                  value={weatherDialogLocation}
                  onChange={(event) => setDayWeatherLocation(weatherDay, event.target.value)}
                  placeholder="Visby, Sweden"
                />
              </LabeledField>
              {weatherAvailability ? (
                <p className="text-sm text-muted-foreground">{weatherAvailability.message}</p>
              ) : null}
              <div className="flex flex-wrap justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setWeatherDay(null)}>Cancel</Button>
                <Button type="submit" disabled={fetchingWeatherDay === weatherDay || !weatherDateKey || weatherDialogLocation.trim().length === 0 || weatherAvailability?.available === false}>
                  <Sparkles className="size-4" aria-hidden />
                  {fetchingWeatherDay === weatherDay ? "Fetching..." : "Fetch weather"}
                </Button>
              </div>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
      <Dialog open={movingItem !== null} onOpenChange={(open) => {
        if (!open) setMovingItem(null);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Move itinerary block</DialogTitle>
          </DialogHeader>
          {movingItem ? (
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                moveMutation.mutate({ item: movingItem, payload: moveDraft });
              }}
            >
              <div>
                <div className="font-medium">{movingItem.title}</div>
                <div className="text-sm text-muted-foreground">Current: Day {movingItem.day_number} · {movingItem.block}</div>
              </div>
              <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
                <LabeledField label="Day" htmlFor="move-itinerary-day">
                  <Input
                    id="move-itinerary-day"
                    type="number"
                    min={1}
                    max={Math.max(1, dayCount)}
                    value={moveDraft.day_number}
                    onChange={(event) => setMoveDraft((current) => ({ ...current, day_number: Number(event.target.value) }))}
                  />
                </LabeledField>
                <LabeledField label="Block" htmlFor="move-itinerary-block">
                  <Select value={moveDraft.block} onValueChange={(value) => setMoveDraft((current) => ({ ...current, block: value as TripItineraryBlock }))}>
                    <SelectTrigger id="move-itinerary-block"><SelectValue /></SelectTrigger>
                    <SelectContent>{itineraryBlocks.map((block) => <SelectItem key={block} value={block}>{block}</SelectItem>)}</SelectContent>
                  </Select>
                </LabeledField>
              </div>
              <LabeledField label="Location / area" htmlFor="move-itinerary-location">
                <Input
                  id="move-itinerary-location"
                  value={moveDraft.location}
                  onChange={(event) => setMoveDraft((current) => ({ ...current, location: event.target.value }))}
                  placeholder="Visby, Fårö, East coast..."
                />
              </LabeledField>
              <div className="flex flex-wrap justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setMovingItem(null)}>Cancel</Button>
                <Button type="submit" disabled={moveMutation.isPending}>
                  {moveMutation.isPending ? "Saving..." : "Save block"}
                </Button>
              </div>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
      <Dialog open={detailItem !== null} onOpenChange={(open) => {
        if (!open) setDetailItem(null);
      }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{detailItem?.title ?? "Itinerary block"}</DialogTitle>
          </DialogHeader>
          {detailItem ? (
            <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">Day {detailItem.day_number}</Badge>
                {detailDate ? <Badge variant="outline">{detailDate}</Badge> : null}
                <Badge variant="outline">{detailItem.block}</Badge>
                {detailTime ? <Badge variant="secondary">{detailTime}</Badge> : null}
                {detailLocation ? <Badge variant="secondary">{detailLocation}</Badge> : null}
              </div>
              <ItineraryBlockDescription item={detailItem} option={detailOption} />
              {detailStoryMatches.length > 0 ? (
                <RelatedItineraryStories matches={detailStoryMatches} />
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
      <Dialog open={presetDraft !== null} onOpenChange={(open) => {
        if (!open) setPresetDraft(null);
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{presetDraft ? `Add ${presetDraft.title.toLowerCase()} block` : "Add logistics block"}</DialogTitle>
          </DialogHeader>
          {presetDraft ? (
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                presetMutation.mutate(presetDraft);
              }}
            >
              <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
                <LabeledField label="Day" htmlFor="preset-itinerary-day">
                  <Input
                    id="preset-itinerary-day"
                    type="number"
                    min={1}
                    max={Math.max(1, dayCount)}
                    value={presetDraft.day_number}
                    onChange={(event) => setPresetDraft((current) => current ? { ...current, day_number: Number(event.target.value) } : current)}
                  />
                </LabeledField>
                <LabeledField label="Block" htmlFor="preset-itinerary-block">
                  <Select value={presetDraft.block} onValueChange={(value) => setPresetDraft((current) => current ? { ...current, block: value as TripItineraryBlock } : current)}>
                    <SelectTrigger id="preset-itinerary-block"><SelectValue /></SelectTrigger>
                    <SelectContent>{itineraryBlocks.map((block) => <SelectItem key={block} value={block}>{block}</SelectItem>)}</SelectContent>
                  </Select>
                </LabeledField>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <LabeledField label="Time" htmlFor="preset-itinerary-time">
                  <Input
                    id="preset-itinerary-time"
                    value={presetDraft.time}
                    onChange={(event) => setPresetDraft((current) => current ? { ...current, time: event.target.value } : current)}
                    placeholder="14:35"
                  />
                </LabeledField>
                <LabeledField label="Location / area" htmlFor="preset-itinerary-location">
                  <Input
                    id="preset-itinerary-location"
                    value={presetDraft.location}
                    onChange={(event) => setPresetDraft((current) => current ? { ...current, location: event.target.value } : current)}
                    placeholder="Visby ferry terminal"
                  />
                </LabeledField>
              </div>
              <LabeledField label="Notes" htmlFor="preset-itinerary-notes">
                <Textarea
                  id="preset-itinerary-notes"
                  value={presetDraft.notes}
                  onChange={(event) => setPresetDraft((current) => current ? { ...current, notes: event.target.value } : current)}
                  placeholder="Ferry booking, check-in, car pickup..."
                />
              </LabeledField>
              <div className="flex flex-wrap justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setPresetDraft(null)}>Cancel</Button>
                <Button type="submit" disabled={presetMutation.isPending}>
                  {presetMutation.isPending ? "Adding..." : "Add block"}
                </Button>
              </div>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
      <Dialog open={followupItem !== null} onOpenChange={(open) => {
        if (!open) {
          setFollowupItem(null);
          setFollowupAreaOverride("");
        }
      }}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Find follow-ups</DialogTitle>
          </DialogHeader>
          {followupItem ? (
            <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
              <section className="space-y-2 rounded-md bg-muted/30 p-3">
                <div className="text-sm font-medium">{followupItem.title}</div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">Day {followupItem.day_number}</Badge>
                  <Badge variant="outline">{followupItem.block}</Badge>
                  {followupArea ? <Badge variant="secondary">{followupArea}</Badge> : null}
                </div>
              </section>
              <LabeledField label="Search area" htmlFor="followup-search-area">
                <Input
                  id="followup-search-area"
                  value={followupAreaOverride}
                  onChange={(event) => setFollowupAreaOverride(event.target.value)}
                  placeholder="Visby, Fårö, East coast..."
                />
              </LabeledField>
              {!followupArea ? (
                <p className="text-sm text-muted-foreground">No location is known for this block yet. Link it to an option or add a Location line in notes.</p>
              ) : null}
              {followupArea && followupOptions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No unplanned options found in {followupArea} yet.</p>
              ) : null}
              {followupOptions.length > 0 ? (
                <div className="space-y-3">
                  {followupOptions.map((option) => (
                    <div key={option.id} className="space-y-2 rounded-md border p-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          <div className="font-medium">{option.title}</div>
                          <div className="flex flex-wrap gap-2">
                            {option.location ? <Badge variant="secondary">{option.location}</Badge> : null}
                            <Badge variant="outline">{option.option_type}</Badge>
                            <Badge variant={option.status === "shortlisted" ? "default" : "outline"}>{option.status}</Badge>
                            <Badge variant="outline">{getDefaultItineraryBlock(option)}</Badge>
                          </div>
                          {option.best_for ? <div className="text-sm text-muted-foreground">{option.best_for}</div> : null}
                          {option.why ? <p className="text-sm text-muted-foreground">{truncateText(option.why, 180)}</p> : null}
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => followupMutation.mutate({ option, anchor: followupItem })}
                          disabled={followupMutation.isPending}
                        >
                          <CalendarPlus className="size-4" aria-hidden />
                          Add to day
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </TripSection>
  );
}

function ItineraryBlockDescription({ item, option, compact = false }: { item: TripItineraryItem; option: TripOption | null; compact?: boolean }) {
  const notesSectionClassName = compact ? "space-y-2 rounded-md bg-muted/30 p-2.5" : "space-y-3 rounded-md bg-muted/30 p-3";
  const wrapperClassName = compact ? "mt-3 space-y-2" : "space-y-4";

  return (
    <div className={wrapperClassName}>
      {option ? (
        <section className="space-y-2">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <div className="font-medium">{option.title}</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{option.option_type}</Badge>
              <Badge variant={option.status === "planned" ? "default" : "outline"}>{option.status}</Badge>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {option.location ? <SummaryValue label="Option location" value={option.location} /> : null}
            {option.best_for ? <SummaryValue label="Best for" value={option.best_for} /> : null}
          </div>
          {option.why ? <SummaryValue label="Why" value={option.why} /> : null}
        </section>
      ) : null}
      <section className={notesSectionClassName}>
        <h3 className="text-sm font-semibold text-muted-foreground">Block notes</h3>
        {item.notes ? <div className="whitespace-pre-wrap text-sm">{item.notes}</div> : <p className="text-sm text-muted-foreground">No notes yet.</p>}
      </section>
    </div>
  );
}

function RelatedItineraryStories({ matches }: { matches: ItineraryStoryMatch[] }) {
  return (
    <section className="space-y-2">
      <div className="text-xs font-medium uppercase text-muted-foreground">Related story materials</div>
      <div className="space-y-3">
        {matches.map(({ story, matchType }) => (
          <article key={`${story.area}-${story.related_place ?? ""}-${story.title}`} className="space-y-2 rounded-md border bg-background p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="font-medium">{story.title}</div>
              <div className="flex flex-wrap gap-2">
                <Badge variant={matchType === "related" ? "default" : "outline"}>{matchType === "related" ? "related" : "nearby"}</Badge>
                {story.story_type ? <Badge variant="outline">{story.story_type.replace(/_/g, " ")}</Badge> : null}
              </div>
            </div>
            {story.summary ? <p className="text-sm text-muted-foreground">{story.summary}</p> : null}
            {story.why_it_matters ? <SummaryValue label="Why it matters" value={story.why_it_matters} /> : null}
            {story.what_to_notice.length > 0 ? (
              <div>
                <div className="text-xs font-medium text-muted-foreground">What to notice</div>
                <ul className="mt-1 list-inside list-disc text-sm">
                  {story.what_to_notice.slice(0, 5).map((value) => <li key={value}>{value}</li>)}
                </ul>
              </div>
            ) : null}
            {story.story ? <SummaryValue label="Material" value={story.story} /> : null}
            <div className="text-xs text-muted-foreground">
              Sources: {story.sourceLinks.length > 0 ? (
                story.sourceLinks.map((source, index) => (
                  <span key={source.url}>
                    <a className="underline underline-offset-2 hover:text-foreground" href={source.url} target="_blank" rel="noreferrer">
                      {source.title}
                    </a>
                    {index < story.sourceLinks.length - 1 ? ", " : null}
                  </span>
                ))
              ) : story.sourceTitles.join(", ")}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function WeatherForecastBadge({ forecast }: { forecast: TripWeatherForecast }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <Badge variant="secondary">{forecast.summary ?? "Weather"}</Badge>
      {forecast.temperature_min_c !== null && forecast.temperature_max_c !== null ? (
        <Badge variant="outline">{Math.round(forecast.temperature_min_c)}-{Math.round(forecast.temperature_max_c)} C</Badge>
      ) : null}
      {forecast.precipitation_probability !== null ? <Badge variant="outline">Rain {forecast.precipitation_probability}%</Badge> : null}
      {forecast.wind_speed_mps !== null ? <Badge variant="outline">Wind {Math.round(forecast.wind_speed_mps)} m/s</Badge> : null}
      <span className="text-muted-foreground">{forecast.location_label}</span>
    </div>
  );
}
