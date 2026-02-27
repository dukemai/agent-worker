// Stockholm coordinates
const STOCKHOLM_LAT = 59.3293;
const STOCKHOLM_LON = 18.0686;

export interface WeatherInfo {
  description: string;
  tempCelsius: number;
  rainForecast: boolean;
  summary: string;
}

interface OpenWeatherResponse {
  weather: { description: string }[];
  main: { temp: number };
  rain?: { "1h"?: number; "3h"?: number };
}

export async function getStockholmWeather(apiKey: string): Promise<WeatherInfo> {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${STOCKHOLM_LAT}&lon=${STOCKHOLM_LON}&appid=${apiKey}&units=metric&lang=en`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`OpenWeather API error ${response.status}`);
  }

  const data = (await response.json()) as OpenWeatherResponse;

  const description = data.weather[0]?.description ?? "unknown";
  const tempCelsius = Math.round(data.main.temp);
  const rainForecast = description.includes("rain") || !!data.rain;

  const summary = `${tempCelsius}°C, ${description}${rainForecast ? " 🌧️" : ""}`;

  return { description, tempCelsius, rainForecast, summary };
}
