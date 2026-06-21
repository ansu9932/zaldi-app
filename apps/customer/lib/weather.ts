/**
 * Weather check for the automatic rain fee (OpenWeatherMap).
 * Needs EXPO_PUBLIC_OPENWEATHER_API_KEY in the app .env.
 */
const KEY = process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY ?? '';

export async function fetchIsRaining(lat: number, lng: number): Promise<boolean> {
  if (!KEY) return false;
  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${KEY}`,
    );
    const data = await res.json();
    const main = String(data?.weather?.[0]?.main ?? '').toLowerCase();
    return main.includes('rain') || main.includes('drizzle') || main.includes('thunder');
  } catch {
    return false;
  }
}
