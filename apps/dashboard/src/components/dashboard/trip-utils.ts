import type {
  AccommodationLogistics,
  ItineraryPresetDraft,
  ItineraryPresetKind,
  ItineraryStoryMatch,
  KnowledgeActivityRow,
  KnowledgeOverview,
  KnowledgeOverviewItem,
  KnowledgePlaceRow,
  KnowledgeResearchLeadItem,
  KnowledgeResearchLeadRow,
  KnowledgeSourceLink,
  KnowledgeStoryItem,
  KnowledgeStoryRow,
  SelectedPreferenceGroup,
} from "@/components/dashboard/trip-types";
import type {
  Trip,
  TripItineraryItem,
  TripKnowledgeFavorite,
  TripKnowledgeItem,
  TripOption,
  TripPreferenceSuggestion,
} from "@/types/database";

const UNKNOWN_AREA_LABEL = "Unknown area";

const GOTLAND_AREA_BUCKETS = [
  {
    label: "Visby",
    aliases: ["visby", "visby old town", "old town", "innerstaden"],
  },
  {
    label: "Fårö",
    aliases: ["faro", "faroe", "farö", "faaroe"],
  },
  {
    label: "North Gotland",
    aliases: ["north gotland", "northern gotland", "north coast", "northern coast", "norra gotland", "north"],
  },
  {
    label: "East coast",
    aliases: ["east coast", "eastern coast", "east gotland", "eastern gotland", "ostkusten", "ostra gotland", "east"],
  },
  {
    label: "South Gotland",
    aliases: ["south gotland", "southern gotland", "south coast", "southern coast", "sodra gotland", "sudret", "south"],
  },
  {
    label: "West coast",
    aliases: ["west coast", "western coast", "west gotland", "western gotland", "vastkusten", "vastra gotland", "west"],
  },
  {
    label: "Inland",
    aliases: ["inland", "central gotland", "middle gotland", "central", "interior"],
  },
] as const;

export function isEmptyRecord(value: unknown) {
  return !value || typeof value !== "object" || Object.keys(value).length === 0;
}

export function joinParts(...parts: unknown[]) {
  const text = parts.filter((part): part is string => typeof part === "string" && part.trim().length > 0).join(" · ");
  return text || null;
}

export function truncateText(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength).trim()}...` : value;
}

export function formatKnowledgeFocus(value: TripKnowledgeItem["extraction_focus"] | undefined) {
  if (value === "planning") return "Planning";
  if (value === "stories") return "Story materials";
  return "Planning + story materials";
}

export function groupSelectedPreferences(selected: string[], catalog: TripPreferenceSuggestion[]): SelectedPreferenceGroup[] {
  const categoryByPreference = new Map(
    catalog.flatMap((suggestion) => [
      [suggestion.preference_text, suggestion.category],
      [suggestion.label, suggestion.category],
    ])
  );
  const groups = new Map<string, string[]>();

  for (const preference of selected) {
    const category = categoryByPreference.get(preference) ?? "other";
    const current = groups.get(category) ?? [];
    current.push(preference);
    groups.set(category, current);
  }

  return Array.from(groups.entries()).map(([category, preferences]) => ({ category, preferences }));
}

export function getPlanningExtraction(extraction: Record<string, unknown> | null | undefined): Record<string, unknown> {
  const value = extraction ?? {};
  return value.planning && typeof value.planning === "object" && !Array.isArray(value.planning)
    ? value.planning as Record<string, unknown>
    : value;
}

export function getStoryExtraction(extraction: Record<string, unknown> | null | undefined): Record<string, unknown> {
  const value = extraction ?? {};
  return value.stories && typeof value.stories === "object" && !Array.isArray(value.stories)
    ? value.stories as Record<string, unknown>
    : value;
}

export function buildKnowledgeOverview(knowledge: TripKnowledgeItem[], favorites: TripKnowledgeFavorite[]): KnowledgeOverview {
  const places = new Map<string, KnowledgeOverviewItem>();
  const activities = new Map<string, KnowledgeOverviewItem>();
  const favoriteByKey = new Map(favorites.map((favorite) => [getFavoriteKey(favorite.item_type, favorite.name, favorite.area), favorite.id]));

  for (const item of knowledge) {
    if (item.status !== "processed") continue;
    const planning = getPlanningExtraction(item.extraction);
    for (const place of getKnowledgePlaceRows(planning.places)) {
      const area = getCanonicalAreaLabel(place.area);
      mergeOverviewItem(places, {
        itemType: "place",
        name: place.name,
        area,
        meta: joinParts(place.approx_location, place.time_needed),
        detail: place.why,
        sourceTitles: [item.title],
        sourceLinks: getKnowledgeSourceLinks(item),
        favoriteId: favoriteByKey.get(getFavoriteKey("place", place.name, area)) ?? null,
      });
    }
    for (const activity of getKnowledgeActivityRows(planning.activities)) {
      const area = getCanonicalAreaLabel(activity.area);
      mergeOverviewItem(activities, {
        itemType: "activity",
        name: activity.name,
        area,
        meta: joinParts(activity.happens_at, activity.approx_location, activity.time_needed),
        detail: activity.why,
        sourceTitles: [item.title],
        sourceLinks: getKnowledgeSourceLinks(item),
        favoriteId: favoriteByKey.get(getFavoriteKey("activity", activity.name, area)) ?? null,
      });
    }
  }

  return {
    places: sortOverviewItems(Array.from(places.values())),
    activities: sortOverviewItems(Array.from(activities.values())),
  };
}

export function buildKnowledgeStories(knowledge: TripKnowledgeItem[]): KnowledgeStoryItem[] {
  const stories = new Map<string, KnowledgeStoryItem>();

  for (const item of knowledge) {
    if (item.status !== "processed") continue;
    const storyExtraction = getStoryExtraction(item.extraction);
    for (const story of getKnowledgeStoryRows(storyExtraction.stories)) {
      const area = getCanonicalAreaLabel(story.area);
      const key = `${normalizeKnowledgeName(story.title)}::${normalizeKnowledgeName(story.related_place ?? "")}`;
      const existing = stories.get(key);
      if (existing) {
        stories.set(key, {
          ...existing,
          summary: existing.summary ?? story.summary,
          story: existing.story ?? story.story,
          why_it_matters: existing.why_it_matters ?? story.why_it_matters,
          what_to_notice: mergeUniqueStrings(existing.what_to_notice, story.what_to_notice),
          good_for: mergeUniqueStrings(existing.good_for, story.good_for),
          sourceTitles: mergeUniqueStrings(existing.sourceTitles, [item.title]),
          sourceLinks: mergeSourceLinks(existing.sourceLinks, getKnowledgeSourceLinks(item)),
          sourceResearchLeads: mergeResearchLeadReferences(existing.sourceResearchLeads, item.source_research_leads ?? []),
        });
      } else {
        stories.set(key, {
          ...story,
          area,
          sourceTitles: [item.title],
          sourceLinks: getKnowledgeSourceLinks(item),
          sourceResearchLeads: item.source_research_leads ?? [],
        });
      }
    }
  }

  return Array.from(stories.values()).sort((a, b) => a.area.localeCompare(b.area) || a.title.localeCompare(b.title));
}

function mergeResearchLeadReferences<T extends { key: string; title: string }>(current: T[], next: T[]) {
  const leads = new Map<string, T>();
  for (const lead of current) {
    leads.set(lead.key || lead.title, lead);
  }
  for (const lead of next) {
    leads.set(lead.key || lead.title, lead);
  }
  return Array.from(leads.values());
}

export function buildKnowledgeResearchLeads(knowledge: TripKnowledgeItem[]): KnowledgeResearchLeadItem[] {
  const leads = new Map<string, KnowledgeResearchLeadItem>();
  const linkedQueueCounts = new Map<string, number>();
  const linkedStoryCounts = new Map<string, number>();

  for (const item of knowledge) {
    const sourceResearchLeads = item.source_research_leads ?? [];
    if (sourceResearchLeads.length === 0) continue;
    for (const reference of sourceResearchLeads) {
      const key = getResearchReferenceLooseKey(reference.title, reference.lead_type);
      if (!key) continue;
      if (item.status === "queued") {
        linkedQueueCounts.set(key, (linkedQueueCounts.get(key) ?? 0) + 1);
      }
      if (item.status === "processed") {
        const storyCount = getKnowledgeStoryRows(getStoryExtraction(item.extraction).stories).length;
        if (storyCount > 0) {
          linkedStoryCounts.set(key, (linkedStoryCounts.get(key) ?? 0) + storyCount);
        }
      }
    }
  }

  for (const item of knowledge) {
    if (item.status !== "processed") continue;
    const storyExtraction = getStoryExtraction(item.extraction);
    for (const lead of getKnowledgeResearchLeadRows(storyExtraction.research_leads)) {
      const area = getCanonicalAreaLabel(lead.area);
      const key = `${normalizeKnowledgeName(lead.title)}::${lead.lead_type}`;
      const linkedKey = getResearchReferenceLooseKey(lead.title, lead.lead_type);
      const existing = leads.get(key);
      if (existing) {
        leads.set(key, {
          ...existing,
          area: existing.area === UNKNOWN_AREA_LABEL ? area : existing.area,
          related_place: existing.related_place ?? lead.related_place,
          source_reason: existing.source_reason ?? lead.source_reason,
          why_interesting: existing.why_interesting ?? lead.why_interesting,
          research_questions: mergeUniqueStrings(existing.research_questions, lead.research_questions),
          suggested_search_terms: mergeUniqueStrings(existing.suggested_search_terms, lead.suggested_search_terms),
          potential_content_types: mergeUniqueStrings(existing.potential_content_types, lead.potential_content_types),
          priority: getHigherPriority(existing.priority, lead.priority),
          sourceTitles: mergeUniqueStrings(existing.sourceTitles, [item.title]),
          sourceItemIds: mergeUniqueStrings(existing.sourceItemIds, [item.id]),
          deletableSourceIds: isManualResearchLeadItem(item) ? mergeUniqueStrings(existing.deletableSourceIds, [item.id]) : existing.deletableSourceIds,
          sourceLinks: mergeSourceLinks(existing.sourceLinks, getKnowledgeSourceLinks(item)),
          queuedSourceCount: linkedQueueCounts.get(linkedKey) ?? 0,
          storyMaterialCount: linkedStoryCounts.get(linkedKey) ?? 0,
        });
      } else {
        leads.set(key, {
          ...lead,
          area,
          sourceTitles: [item.title],
          sourceItemIds: [item.id],
          deletableSourceIds: isManualResearchLeadItem(item) ? [item.id] : [],
          sourceLinks: getKnowledgeSourceLinks(item),
          queuedSourceCount: linkedQueueCounts.get(linkedKey) ?? 0,
          storyMaterialCount: linkedStoryCounts.get(linkedKey) ?? 0,
        });
      }
    }
  }

  return Array.from(leads.values()).sort(
    (a, b) => getPrioritySortIndex(a.priority) - getPrioritySortIndex(b.priority) || a.area.localeCompare(b.area) || a.title.localeCompare(b.title)
  );
}

function getResearchReferenceLooseKey(title: string | null | undefined, leadType: string | null | undefined) {
  const cleanTitle = typeof title === "string" ? normalizeKnowledgeName(title) : "";
  if (!cleanTitle) return "";
  return `${cleanTitle}::${leadType || "other"}`;
}

export function getCanonicalAreaLabel(value: string | null | undefined) {
  const normalized = normalizeAreaText(value);
  if (!normalized) return UNKNOWN_AREA_LABEL;

  for (const bucket of GOTLAND_AREA_BUCKETS) {
    if (bucket.aliases.some((alias) => normalized === alias || normalized.includes(alias))) {
      return bucket.label;
    }
  }

  return toTitleCaseArea(value?.trim() ?? UNKNOWN_AREA_LABEL);
}

export function normalizeKnowledgeName(value: string) {
  return value.trim().toLocaleLowerCase("sv-SE");
}

export function normalizeAreaText(value: string | null | undefined) {
  return (value ?? "")
    .trim()
    .toLocaleLowerCase("sv-SE")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function getKnowledgePlaceRows(value: unknown): KnowledgePlaceRow[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item): KnowledgePlaceRow | null => {
      if (typeof item === "string") {
        const name = item.trim();
        return name ? { name, area: null, approx_location: null, why: null, time_needed: null } : null;
      }
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const name = getKnowledgeString(record.name);
      if (!name) return null;
      return {
        name,
        area: getKnowledgeString(record.area),
        approx_location: getKnowledgeString(record.approx_location),
        why: getKnowledgeString(record.why),
        time_needed: getKnowledgeString(record.time_needed),
      };
    })
    .filter((item): item is KnowledgePlaceRow => item !== null);
}

export function getKnowledgeActivityRows(value: unknown): KnowledgeActivityRow[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item): KnowledgeActivityRow | null => {
      if (typeof item === "string") {
        const name = item.trim();
        return name ? { name, happens_at: null, area: null, approx_location: null, why: null, time_needed: null } : null;
      }
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const name = getKnowledgeString(record.name);
      if (!name) return null;
      return {
        name,
        happens_at: getKnowledgeString(record.happens_at),
        area: getKnowledgeString(record.area),
        approx_location: getKnowledgeString(record.approx_location),
        why: getKnowledgeString(record.why),
        time_needed: getKnowledgeString(record.time_needed),
      };
    })
    .filter((item): item is KnowledgeActivityRow => item !== null);
}

export function getKnowledgeStoryRows(value: unknown): KnowledgeStoryRow[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item): KnowledgeStoryRow | null => {
      if (typeof item === "string") {
        const title = item.trim();
        return title
          ? {
              title,
              story_type: null,
              area: null,
              related_place: null,
              summary: null,
              story: null,
              why_it_matters: null,
              what_to_notice: [],
              good_for: [],
            }
          : null;
      }
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const title = getKnowledgeString(record.title);
      if (!title) return null;
      return {
        title,
        story_type: getKnowledgeString(record.story_type),
        area: getKnowledgeString(record.area),
        related_place: getKnowledgeString(record.related_place),
        summary: getKnowledgeString(record.summary),
        story: getKnowledgeString(record.story),
        why_it_matters: getKnowledgeString(record.why_it_matters),
        what_to_notice: getStringArray(record.what_to_notice),
        good_for: getStringArray(record.good_for),
      };
    })
    .filter((item): item is KnowledgeStoryRow => item !== null);
}

export function getKnowledgeResearchLeadRows(value: unknown): KnowledgeResearchLeadRow[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item): KnowledgeResearchLeadRow | null => {
      if (typeof item === "string") {
        const title = item.trim();
        return title
          ? {
              title,
              lead_type: "other",
              area: null,
              related_place: null,
              source_reason: null,
              why_interesting: null,
              research_questions: [],
              suggested_search_terms: [title],
              potential_content_types: [],
              priority: "medium",
            }
          : null;
      }
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const title = getKnowledgeString(record.title);
      if (!title) return null;
      return {
        title,
        lead_type: getKnowledgeString(record.lead_type) ?? "other",
        area: getKnowledgeString(record.area),
        related_place: getKnowledgeString(record.related_place),
        source_reason: getKnowledgeString(record.source_reason),
        why_interesting: getKnowledgeString(record.why_interesting),
        research_questions: getStringArray(record.research_questions),
        suggested_search_terms: getStringArray(record.suggested_search_terms),
        potential_content_types: getStringArray(record.potential_content_types),
        priority: getPriorityValue(record.priority),
      };
    })
    .filter((item): item is KnowledgeResearchLeadRow => item !== null);
}

export function buildResearchQueueMarkdown(lead: KnowledgeResearchLeadItem) {
  const questions = lead.research_questions.length > 0
    ? lead.research_questions.map((question) => `- ${question}`).join("\n")
    : `- What is important or interesting about ${lead.title}?\n- What should we notice when visiting or explaining ${lead.title}?`;
  const terms = (lead.suggested_search_terms.length > 0 ? lead.suggested_search_terms : [lead.title])
    .map((term) => `- ${term}`)
    .join("\n");
  const sources = lead.sourceLinks.length > 0
    ? lead.sourceLinks.map((source) => `- [${source.title}](${source.url})`).join("\n")
    : lead.sourceTitles.map((title) => `- ${title}`).join("\n");

  return [
    `# ${lead.title}`,
    "",
    "## Why investigate",
    lead.why_interesting ?? lead.source_reason ?? "This looks like a promising destination content lead.",
    "",
    "## Research questions",
    questions,
    "",
    "## Search terms",
    terms,
    "",
    "## Source trail",
    sources || "- Add source links or notes here",
    "",
    "## Notes",
    "Paste source notes here...",
  ].join("\n");
}

export function getOptionCardClassName(status: TripOption["status"]) {
  const base = "space-y-3 rounded-md border p-3";
  if (status === "planned") return `${base} border-primary bg-primary/5 shadow-sm`;
  if (status === "shortlisted") return `${base} border-primary/60 bg-muted/40 shadow-sm`;
  return base;
}

export function getDefaultItineraryBlock(option: TripOption) {
  if (option.option_type === "food") return "lunch";
  if (option.option_type === "rainy_day") return "backup";
  if (option.option_type === "logistics") return "morning";
  return option.effort === "high" ? "morning" : "afternoon";
}

export function buildDefaultPlanNotes(option: TripOption) {
  return [
    option.location ? `Location: ${option.location}` : null,
    option.best_for ? `Best for: ${option.best_for}` : null,
    option.why ? `Why: ${option.why}` : null,
    option.notes,
  ].filter((line): line is string => Boolean(line)).join("\n\n");
}

export function buildManualItineraryNotes(location: string, notes: string) {
  const trimmedLocation = location.trim();
  const trimmedNotes = notes.trim();
  return [
    trimmedLocation ? `Location: ${trimmedLocation}` : null,
    trimmedNotes || null,
  ].filter((line): line is string => Boolean(line)).join("\n\n") || null;
}

export function buildOptionItineraryNotes(option: TripOption, notes: string) {
  const baseNotes = buildDefaultPlanNotes(option);
  const trimmedNotes = notes.trim();
  return [baseNotes || null, trimmedNotes || null].filter((line): line is string => Boolean(line)).join("\n\n") || null;
}

export function buildLogisticsPresetNotes(payload: ItineraryPresetDraft) {
  return [
    payload.time.trim() ? `Time: ${payload.time.trim()}` : null,
    payload.location.trim() ? `Location: ${payload.location.trim()}` : null,
    payload.notes.trim() || null,
  ].filter((line): line is string => Boolean(line)).join("\n\n") || null;
}

export function buildLogisticsPresetDraft(
  kind: ItineraryPresetKind,
  dayCount: number,
  startDate: string | null,
  details: Record<string, unknown> | null,
  accommodation?: AccommodationLogistics
): ItineraryPresetDraft {
  const arrival = kind === "arrival";
  const departure = kind === "departure";
  const checkIn = kind === "check_in";
  const notes = arrival
    ? [
        getLogisticsLine("Transport", details?.transport_mode),
        getLogisticsLine("Depart from", joinParts(details?.outbound_departure_location, details?.outbound_departure_time)),
        getLogisticsLine("Arrive at", joinParts(details?.outbound_arrival_location, details?.outbound_arrival_time)),
        getLogisticsListLine("Booking refs", details?.booking_references),
        getLogisticsListLine("Links", details?.important_links),
        getLogisticsListLine("Constraints", details?.constraints),
      ]
    : departure
      ? [
        getLogisticsLine("Transport", details?.transport_mode),
        getLogisticsLine("Depart from", joinParts(details?.return_departure_location, details?.return_departure_time)),
        getLogisticsLine("Arrive at", joinParts(details?.return_arrival_location, details?.return_arrival_time)),
        getLogisticsLine("Parking", details?.parking_notes),
        getLogisticsListLine("Booking refs", details?.booking_references),
        getLogisticsListLine("Links", details?.important_links),
        getLogisticsListLine("Constraints", details?.constraints),
      ]
      : [
        getLogisticsLine("Accommodation", joinParts(accommodation?.name, accommodation?.address)),
        getLogisticsLine("Area", accommodation?.area),
        getLogisticsLine(checkIn ? "Check-in" : "Check-out", joinParts(checkIn ? accommodation?.check_in_date : accommodation?.check_out_date, checkIn ? accommodation?.check_in_time : accommodation?.check_out_time)),
        getLogisticsLine("Booking ref", accommodation?.booking_reference),
        getLogisticsLine("Notes", accommodation?.notes),
      ];
  const accommodationDate = checkIn ? accommodation?.check_in_date : accommodation?.check_out_date;
  const accommodationDay = getTripDayFromDate(startDate, accommodationDate);

  return {
    kind,
    title: getPresetTitle(kind, accommodation),
    day_number: arrival ? 1 : departure ? dayCount : Math.min(dayCount, Math.max(1, accommodationDay ?? (checkIn ? 1 : dayCount))),
    block: arrival ? "morning" : departure ? "drop_first" : checkIn ? "afternoon" : "morning",
    time: getLogisticsString(arrival ? details?.outbound_arrival_time : departure ? details?.return_departure_time : checkIn ? accommodation?.check_in_time : accommodation?.check_out_time) ?? "",
    location: getLogisticsString(arrival ? details?.outbound_arrival_location : departure ? details?.return_departure_location : accommodation?.address) ?? getLogisticsString(accommodation?.area) ?? getLogisticsString(details?.base_area) ?? "",
    notes: notes.filter((line): line is string => Boolean(line)).join("\n"),
  };
}

export function getPresetTitle(kind: ItineraryPresetKind, accommodation?: AccommodationLogistics) {
  if (kind === "arrival") return "Arrival";
  if (kind === "departure") return "Departure";
  const stay = accommodation?.name?.trim();
  return `${kind === "check_in" ? "Check-in" : "Check-out"}${stay ? `: ${stay}` : ""}`;
}

export function getLogisticsLine(label: string, value: unknown) {
  const text = getLogisticsString(value);
  return text ? `${label}: ${text}` : null;
}

export function getLogisticsListLine(label: string, value: unknown) {
  if (!Array.isArray(value)) return null;
  const values = value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  return values.length > 0 ? `${label}: ${values.join(", ")}` : null;
}

export function getLogisticsString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export function getAccommodationLogistics(details: Record<string, unknown> | null | undefined): AccommodationLogistics[] {
  if (!details) return [];
  const rows = Array.isArray(details.accommodations)
    ? details.accommodations
        .map((item) => normalizeAccommodationLogistics(item))
        .filter((item): item is AccommodationLogistics => item !== null)
    : [];
  if (rows.length > 0) return rows;
  const fallback = normalizeAccommodationLogistics({
    name: details.accommodation_name,
    address: details.accommodation_address,
    area: details.base_area,
    check_in_time: details.check_in_time,
    check_out_time: details.check_out_time,
    booking_reference: Array.isArray(details.booking_references) ? details.booking_references[0] : null,
  });
  return fallback ? [fallback] : [];
}

export function normalizeAccommodationLogistics(value: unknown): AccommodationLogistics | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const accommodation = {
    name: getLogisticsString(row.name),
    address: getLogisticsString(row.address),
    area: getLogisticsString(row.area),
    check_in_date: getLogisticsString(row.check_in_date),
    check_in_time: getLogisticsString(row.check_in_time),
    check_out_date: getLogisticsString(row.check_out_date),
    check_out_time: getLogisticsString(row.check_out_time),
    booking_reference: getLogisticsString(row.booking_reference),
    notes: getLogisticsString(row.notes),
  };
  return Object.values(accommodation).some(Boolean) ? accommodation : null;
}

export function getItineraryNoteField(notes: string | null, field: string) {
  return notes?.match(new RegExp(`^${field}:\\s*(.+)$`, "im"))?.[1]?.trim() ?? null;
}

export function getItineraryAnchorLocation(item: TripItineraryItem, option: TripOption | null) {
  const noteLocation = getItineraryNoteField(item.notes, "Location");
  if (noteLocation) return noteLocation;
  if (option?.location) return option.location;
  return noteLocation || null;
}

export function setLocationInNotes(notes: string | null, location: string) {
  const trimmedLocation = location.trim();
  const remainingNotes = (notes ?? "")
    .split("\n")
    .filter((line) => !/^Location:\s*/i.test(line.trim()))
    .join("\n")
    .trim();

  return [
    trimmedLocation ? `Location: ${trimmedLocation}` : null,
    remainingNotes || null,
  ].filter((line): line is string => Boolean(line)).join("\n\n") || null;
}

export function getFollowupOptions({
  anchor,
  area,
  options,
  plannedOptionIds,
}: {
  anchor: TripOption | null;
  area: string | null;
  options: TripOption[];
  plannedOptionIds: Set<string>;
}) {
  if (!area) return [];
  const areaKey = normalizeAreaText(area);
  return options
    .filter((option) => option.id !== anchor?.id)
    .filter((option) => !plannedOptionIds.has(option.id))
    .filter((option) => isAreaMatch(option.location, areaKey))
    .sort(compareFollowupOptions);
}

export function isAreaMatch(location: string | null, areaKey: string) {
  const locationKey = normalizeAreaText(location);
  return locationKey === areaKey || locationKey.includes(areaKey) || areaKey.includes(locationKey);
}

export function compareFollowupOptions(a: TripOption, b: TripOption) {
  return getFollowupOptionRank(a) - getFollowupOptionRank(b) || a.title.localeCompare(b.title);
}

export function getFollowupOptionRank(option: TripOption) {
  if (option.status === "shortlisted") return 0;
  if (option.option_type === "food") return 1;
  if (option.option_type === "rainy_day") return 2;
  if (option.status === "maybe") return 3;
  return 4;
}

export function getDefaultWeatherLocationForDay(dayItems: TripItineraryItem[], optionById: Map<string, TripOption>, destination: string) {
  const locations = dayItems
    .map((item) => getItineraryAnchorLocation(item, optionById.get(item.option_id ?? "") ?? null))
    .filter((location): location is string => Boolean(location));
  return locations[0] ?? destination ?? "";
}

export function getItineraryStoryMatches(item: TripItineraryItem, option: TripOption | null, stories: KnowledgeStoryItem[]): ItineraryStoryMatch[] {
  const itemTitle = normalizeAreaText(item.title);
  const optionTitle = normalizeAreaText(option?.title);
  const location = getItineraryAnchorLocation(item, option);
  const locationKey = normalizeAreaText(location);
  const strongMatches: ItineraryStoryMatch[] = [];
  const areaMatches: ItineraryStoryMatch[] = [];

  for (const story of stories) {
    const relatedPlace = normalizeAreaText(story.related_place);
    const storyTitle = normalizeAreaText(story.title);
    const strong =
      Boolean(relatedPlace && (relatedPlace === itemTitle || relatedPlace === optionTitle || itemTitle.includes(relatedPlace) || optionTitle.includes(relatedPlace))) ||
      Boolean(storyTitle && (itemTitle.includes(storyTitle) || optionTitle.includes(storyTitle)));

    if (strong) {
      strongMatches.push({ story, matchType: "related" });
      continue;
    }

    if (locationKey && isAreaMatch(story.area, locationKey)) {
      areaMatches.push({ story, matchType: "area" });
    }
  }

  return [...strongMatches, ...areaMatches.slice(0, Math.max(0, 3 - strongMatches.length))].slice(0, 4);
}

export function sortItineraryItems(items: TripItineraryItem[]) {
  return [...items].sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at));
}

export function getSortOrderForPosition(position: string, dayItems: TripItineraryItem[]) {
  if (dayItems.length === 0) return 10;
  if (position === "start") return dayItems[0].sort_order - 10;
  if (position.startsWith("after:")) {
    const id = position.slice("after:".length);
    const index = dayItems.findIndex((item) => item.id === id);
    if (index >= 0) {
      const current = dayItems[index];
      const next = dayItems[index + 1];
      return next ? Math.round((current.sort_order + next.sort_order) / 2) : current.sort_order + 10;
    }
  }
  return dayItems[dayItems.length - 1].sort_order + 10;
}

export function extractLinksFromText(value: string | null | undefined) {
  const matches = value?.match(/https?:\/\/[^\s)]+/g) ?? [];
  return Array.from(new Set(matches.map((match) => match.replace(/[.,;:]+$/, ""))));
}

export function buildOptionFromKnowledgeItem(item: KnowledgeOverviewItem): Partial<TripOption> & { title: string } {
  const sourceLines = item.sourceLinks.length > 0
    ? item.sourceLinks.map((source) => `- ${source.title}: ${source.url}`)
    : item.sourceTitles.map((title) => `- ${title}`);

  return {
    title: item.name,
    option_type: item.itemType === "activity" ? "activity" : "scenic_stop",
    status: "maybe",
    location: item.area,
    best_for: item.favoriteId ? "Favorite from knowledge" : `From ${item.area} knowledge`,
    why: item.detail ?? `Candidate from ${item.area} trip knowledge.`,
    notes: [
      "Created from trip knowledge.",
      item.meta ? `Context: ${item.meta}` : null,
      sourceLines.length > 0 ? ["Sources:", ...sourceLines].join("\n") : null,
    ].filter((line): line is string => Boolean(line)).join("\n\n"),
  };
}

export function formatDates(trip: Trip) {
  if (trip.start_date && trip.end_date) return `${trip.start_date} to ${trip.end_date}`;
  if (trip.start_date) return `from ${trip.start_date}`;
  return "dates not set";
}

export function getDayCount(trip?: Trip) {
  if (!trip?.start_date || !trip.end_date) return 4;
  const start = new Date(`${trip.start_date}T00:00:00Z`).getTime();
  const end = new Date(`${trip.end_date}T00:00:00Z`).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return 4;
  return Math.min(30, Math.max(1, Math.round((end - start) / 86400000) + 1));
}

export function formatItineraryDayDate(startDate: string | null, dayNumber: number) {
  if (!startDate) return null;
  const start = new Date(`${startDate}T00:00:00Z`);
  if (Number.isNaN(start.getTime())) return null;
  const date = new Date(start);
  date.setUTCDate(start.getUTCDate() + dayNumber - 1);
  return new Intl.DateTimeFormat("en", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }).format(date);
}

export function getItineraryDayIsoDate(startDate: string | null, dayNumber: number) {
  if (!startDate) return null;
  const start = new Date(`${startDate}T00:00:00Z`);
  if (Number.isNaN(start.getTime())) return null;
  const date = new Date(start);
  date.setUTCDate(start.getUTCDate() + dayNumber - 1);
  return date.toISOString().slice(0, 10);
}

export function getForecastAvailability(dateValue: string) {
  const today = new Date();
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const target = new Date(`${dateValue}T00:00:00Z`).getTime();
  if (Number.isNaN(target)) return null;
  const daysUntil = Math.round((target - todayUtc) / 86400000);
  if (daysUntil < 0) {
    return { available: false, message: "Forecast is for a past day, so live forecast is no longer available." };
  }
  if (daysUntil <= 7) {
    return { available: true, message: "Forecast should be available now from Open-Meteo." };
  }
  return {
    available: false,
    message: `Forecast is usually available about 7 days ahead. Try again in ${daysUntil - 7} day${daysUntil - 7 === 1 ? "" : "s"}.`,
  };
}

export function getTripDayFromDate(startDate: string | null, value: string | null | undefined) {
  if (!startDate || !value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const start = new Date(`${startDate}T00:00:00Z`).getTime();
  const target = new Date(`${value}T00:00:00Z`).getTime();
  if (Number.isNaN(start) || Number.isNaN(target) || target < start) return null;
  return Math.round((target - start) / 86400000) + 1;
}

export function formatTripDuration(startDate: string, endDate: string) {
  if (!startDate || !endDate) return "Set dates to calculate trip length.";
  const start = new Date(`${startDate}T00:00:00Z`).getTime();
  const end = new Date(`${endDate}T00:00:00Z`).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return "Set dates to calculate trip length.";
  if (end < start) return "End date is before start date.";
  const days = Math.round((end - start) / 86400000) + 1;
  const nights = Math.max(0, days - 1);
  return `${days} ${days === 1 ? "day" : "days"} / ${nights} ${nights === 1 ? "night" : "nights"}`;
}

function isManualResearchLeadItem(item: TripKnowledgeItem) {
  return item.extraction_focus === "stories" && item.title.startsWith("Research:") && item.raw_markdown.startsWith("Manual research lead");
}

function mergeOverviewItem(target: Map<string, KnowledgeOverviewItem>, item: KnowledgeOverviewItem) {
  const key = normalizeKnowledgeName(item.name);
  const existing = target.get(key);
  if (!existing) {
    target.set(key, item);
    return;
  }

  existing.area = existing.area === UNKNOWN_AREA_LABEL ? item.area : existing.area;
  existing.meta = existing.meta ?? item.meta;
  existing.detail = existing.detail ?? item.detail;
  existing.favoriteId = existing.favoriteId ?? item.favoriteId;
  existing.sourceTitles = Array.from(new Set([...existing.sourceTitles, ...item.sourceTitles]));
  existing.sourceLinks = mergeSourceLinks(existing.sourceLinks, item.sourceLinks);
}

function sortOverviewItems(items: KnowledgeOverviewItem[]) {
  return items.sort((a, b) => getAreaSortIndex(a.area) - getAreaSortIndex(b.area) || a.area.localeCompare(b.area) || a.name.localeCompare(b.name));
}

function getAreaSortIndex(area: string) {
  if (area === UNKNOWN_AREA_LABEL) return Number.MAX_SAFE_INTEGER;
  const index = GOTLAND_AREA_BUCKETS.findIndex((bucket) => bucket.label === area);
  return index === -1 ? GOTLAND_AREA_BUCKETS.length : index;
}

function toTitleCaseArea(value: string) {
  return value
    .split(/\s+/)
    .map((part) => part.charAt(0).toLocaleUpperCase("sv-SE") + part.slice(1).toLocaleLowerCase("sv-SE"))
    .join(" ");
}

function getFavoriteKey(itemType: "place" | "activity", name: string, area: string) {
  return `${itemType}:${normalizeKnowledgeName(getCanonicalAreaLabel(area))}:${normalizeKnowledgeName(name)}`;
}

function getHigherPriority(current: KnowledgeResearchLeadRow["priority"], next: KnowledgeResearchLeadRow["priority"]) {
  return getPrioritySortIndex(next) < getPrioritySortIndex(current) ? next : current;
}

function getPrioritySortIndex(priority: KnowledgeResearchLeadRow["priority"]) {
  if (priority === "high") return 0;
  if (priority === "medium") return 1;
  return 2;
}

function getKnowledgeSourceLinks(item: TripKnowledgeItem): KnowledgeSourceLink[] {
  const url = normalizeSourceUrl(item.source_url);
  return url ? [{ title: item.title, url }] : [];
}

function normalizeSourceUrl(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^www\./i.test(trimmed)) return `https://${trimmed}`;
  return null;
}

function mergeSourceLinks(current: KnowledgeSourceLink[], next: KnowledgeSourceLink[]) {
  const links = new Map(current.map((link) => [link.url, link]));
  for (const link of next) {
    links.set(link.url, link);
  }
  return Array.from(links.values());
}

function mergeUniqueStrings(current: string[], next: string[]) {
  return Array.from(new Set([...current, ...next].map((value) => value.trim()).filter(Boolean)));
}

function getPriorityValue(value: unknown): KnowledgeResearchLeadRow["priority"] {
  return value === "low" || value === "medium" || value === "high" ? value : "medium";
}

function getKnowledgeString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export function getStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
}
