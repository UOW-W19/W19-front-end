export interface CurrentWeather {
  temperatureC: number;
  isDay: boolean;
  observedAt?: string;
  timezone?: string;
}

interface OpenMeteoCurrentResponse {
  current?: {
    time?: string;
    temperature_2m?: number;
    is_day?: number;
  };
  timezone?: string;
}

interface CurrentWeatherRequest {
  latitude: number;
  longitude: number;
  signal?: AbortSignal;
}

const OPEN_METEO_FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';

const isValidCoordinate = (latitude: number, longitude: number): boolean =>
  Number.isFinite(latitude) &&
  Number.isFinite(longitude) &&
  latitude >= -90 &&
  latitude <= 90 &&
  longitude >= -180 &&
  longitude <= 180;

export const weatherApi = {
  getCurrentWeather: async ({
    latitude,
    longitude,
    signal,
  }: CurrentWeatherRequest): Promise<CurrentWeather> => {
    if (!isValidCoordinate(latitude, longitude)) {
      throw new Error('Invalid coordinates for weather lookup');
    }

    const params = new URLSearchParams({
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      current: 'temperature_2m,is_day',
      temperature_unit: 'celsius',
      timezone: 'auto',
    });

    const response = await fetch(`${OPEN_METEO_FORECAST_URL}?${params.toString()}`, { signal });

    if (!response.ok) {
      throw new Error(`Weather request failed: ${response.status}`);
    }

    const data = await response.json() as OpenMeteoCurrentResponse;
    const temperature = data.current?.temperature_2m;
    const isDay = data.current?.is_day;

    if (typeof temperature !== 'number' || !Number.isFinite(temperature) || (isDay !== 0 && isDay !== 1)) {
      throw new Error('Weather response did not include current temperature and day/night data');
    }

    return {
      temperatureC: temperature,
      isDay: isDay === 1,
      observedAt: data.current?.time,
      timezone: data.timezone,
    };
  },
};
