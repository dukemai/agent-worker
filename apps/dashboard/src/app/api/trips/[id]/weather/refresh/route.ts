import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
import { cleanText } from "@/lib/trip-ops";

type Params = { params: Promise<{ id: string }> };

type GeocodingResult = {
  name?: string;
  latitude?: number;
  longitude?: number;
  country?: string;
  admin1?: string;
};

type ForecastResponse = {
  daily?: {
    time?: string[];
    weather_code?: number[];
    temperature_2m_min?: number[];
    temperature_2m_max?: number[];
    precipitation_probability_max?: number[];
    precipitation_sum?: number[];
    wind_speed_10m_max?: number[];
  };
};

export async function POST(request: Request, { params }: Params) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase || !auth.user) return auth.error;

  const { id } = await params;
  const payload = await request.json();
  const location = cleanText(payload.location, 160);
  const requestedDate = parseForecastDate(payload.forecast_date);
  if (!location) return errorResponse("location is required");
  if (requestedDate === undefined) return errorResponse("forecast_date must use YYYY-MM-DD");

  const { data: trip, error: tripError } = await auth.supabase
    .from("trips")
    .select("id, start_date, end_date")
    .eq("id", id)
    .maybeSingle();
  if (tripError) return errorResponse(tripError.message, 500);
  if (!trip) return errorResponse("Trip not found", 404);
  if (!trip.start_date || !trip.end_date) return errorResponse("Trip start and end dates are required before fetching weather.");

  const dayCount = getDateRangeDayCount(trip.start_date, trip.end_date);
  if (dayCount === null) return errorResponse("Trip dates are invalid");
  if (dayCount > 30) return errorResponse("Weather forecast supports trips up to 30 days for now");
  if (requestedDate && (requestedDate < trip.start_date || requestedDate > trip.end_date)) {
    return errorResponse("forecast_date must be inside the trip date range");
  }
  const startDate = requestedDate ?? trip.start_date;
  const endDate = requestedDate ?? trip.end_date;

  let geocoded: GeocodingResult;
  let forecast: ForecastResponse;
  try {
    geocoded = await geocodeLocation(location);
    forecast = await fetchForecast(geocoded, startDate, endDate);
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Failed to fetch weather forecast", 502);
  }

  const rows = buildForecastRows({
    tripId: id,
    locationLabel: formatLocationLabel(geocoded, location),
    latitude: geocoded.latitude ?? 0,
    longitude: geocoded.longitude ?? 0,
    forecast,
  });
  if (rows.length === 0) return errorResponse("No forecast days were returned for this trip date range", 502);

  const { error: deleteError } = await auth.supabase
    .from("trip_weather_forecasts")
    .delete()
    .eq("trip_id", id)
    .in("forecast_date", rows.map((row) => row.forecast_date));
  if (deleteError) return errorResponse(deleteError.message, 500);

  const { data: forecasts, error: insertError } = await auth.supabase
    .from("trip_weather_forecasts")
    .insert(rows)
    .select("*")
    .order("forecast_date");
  if (insertError) return errorResponse(insertError.message, 500);

  return NextResponse.json({ forecasts: forecasts ?? [] });
}

async function geocodeLocation(location: string): Promise<GeocodingResult> {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", location);
  url.searchParams.set("count", "1");
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");

  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error("Could not geocode weather location");
  const json = await response.json() as { results?: GeocodingResult[] };
  const result = json.results?.[0];
  if (!result || typeof result.latitude !== "number" || typeof result.longitude !== "number") {
    throw new Error("No weather location found. Try a more specific location, such as 'Visby, Sweden'.");
  }
  return result;
}

async function fetchForecast(location: GeocodingResult, startDate: string, endDate: string): Promise<ForecastResponse> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(location.latitude));
  url.searchParams.set("longitude", String(location.longitude));
  url.searchParams.set("daily", [
    "weather_code",
    "temperature_2m_max",
    "temperature_2m_min",
    "precipitation_probability_max",
    "precipitation_sum",
    "wind_speed_10m_max",
  ].join(","));
  url.searchParams.set("temperature_unit", "celsius");
  url.searchParams.set("wind_speed_unit", "ms");
  url.searchParams.set("precipitation_unit", "mm");
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("start_date", startDate);
  url.searchParams.set("end_date", endDate);

  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error("Weather forecast is not available for this date range yet");
  return await response.json() as ForecastResponse;
}

function buildForecastRows({
  tripId,
  locationLabel,
  latitude,
  longitude,
  forecast,
}: {
  tripId: string;
  locationLabel: string;
  latitude: number;
  longitude: number;
  forecast: ForecastResponse;
}) {
  const daily = forecast.daily;
  const dates = daily?.time ?? [];
  const fetchedAt = new Date().toISOString();

  return dates.map((date, index) => {
    const weatherCode = daily?.weather_code?.[index] ?? null;
    return {
      trip_id: tripId,
      forecast_date: date,
      provider: "open-meteo",
      location_label: locationLabel,
      latitude,
      longitude,
      summary: getWeatherSummary(weatherCode),
      weather_code: weatherCode,
      temperature_min_c: daily?.temperature_2m_min?.[index] ?? null,
      temperature_max_c: daily?.temperature_2m_max?.[index] ?? null,
      precipitation_probability: daily?.precipitation_probability_max?.[index] ?? null,
      precipitation_mm: daily?.precipitation_sum?.[index] ?? null,
      wind_speed_mps: daily?.wind_speed_10m_max?.[index] ?? null,
      raw_forecast: {
        date,
        weather_code: weatherCode,
        temperature_2m_min: daily?.temperature_2m_min?.[index] ?? null,
        temperature_2m_max: daily?.temperature_2m_max?.[index] ?? null,
        precipitation_probability_max: daily?.precipitation_probability_max?.[index] ?? null,
        precipitation_sum: daily?.precipitation_sum?.[index] ?? null,
        wind_speed_10m_max: daily?.wind_speed_10m_max?.[index] ?? null,
      },
      fetched_at: fetchedAt,
    };
  });
}

function formatLocationLabel(result: GeocodingResult, fallback: string) {
  return [result.name, result.admin1, result.country].filter(Boolean).join(", ") || fallback;
}

function getDateRangeDayCount(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return null;
  return Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
}

function parseForecastDate(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}

function getWeatherSummary(code: number | null) {
  if (code === null) return null;
  if (code === 0) return "Clear";
  if ([1, 2, 3].includes(code)) return "Partly cloudy";
  if ([45, 48].includes(code)) return "Fog";
  if ([51, 53, 55, 56, 57].includes(code)) return "Drizzle";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "Rain";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Snow";
  if ([95, 96, 99].includes(code)) return "Thunderstorm";
  return "Mixed weather";
}
