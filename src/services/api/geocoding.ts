import { getInitialMapboxToken } from '@/lib/mapbox';

interface CurrentLocationLabelRequest {
  latitude: number;
  longitude: number;
  signal?: AbortSignal;
}

interface MapboxContextItem {
  name?: string;
}

interface MapboxGeocodingFeature {
  properties?: {
    feature_type?: string;
    name?: string;
    full_address?: string;
    place_formatted?: string;
    context?: {
      neighborhood?: MapboxContextItem;
      locality?: MapboxContextItem;
      place?: MapboxContextItem;
      region?: MapboxContextItem;
      country?: MapboxContextItem;
    };
  };
}

interface MapboxReverseGeocodingResponse {
  features?: MapboxGeocodingFeature[];
}

const MAPBOX_REVERSE_GEOCODING_URL = 'https://api.mapbox.com/search/geocode/v6/reverse';

const isValidCoordinate = (latitude: number, longitude: number): boolean =>
  Number.isFinite(latitude) &&
  Number.isFinite(longitude) &&
  latitude >= -90 &&
  latitude <= 90 &&
  longitude >= -180 &&
  longitude <= 180;

const firstNonEmpty = (...values: Array<string | undefined>): string | undefined =>
  values.map((value) => value?.trim()).find((value): value is string => !!value);

const getPreferredLocationLabel = (features: MapboxGeocodingFeature[]): string | undefined => {
  for (const feature of features) {
    const context = feature.properties?.context;
    const label = firstNonEmpty(
      context?.neighborhood?.name,
      context?.locality?.name,
      context?.place?.name,
      feature.properties?.feature_type === 'place' ? feature.properties.name : undefined,
      feature.properties?.feature_type === 'locality' ? feature.properties.name : undefined,
      feature.properties?.feature_type === 'neighborhood' ? feature.properties.name : undefined,
    );

    if (label) return label;
  }

  const fallbackFeature = features[0];
  return firstNonEmpty(
    fallbackFeature?.properties?.name,
    fallbackFeature?.properties?.full_address,
    fallbackFeature?.properties?.place_formatted,
  );
};

export const geocodingApi = {
  getCurrentLocationLabel: async ({
    latitude,
    longitude,
    signal,
  }: CurrentLocationLabelRequest): Promise<string> => {
    if (!isValidCoordinate(latitude, longitude)) {
      throw new Error('Invalid coordinates for reverse geocoding');
    }

    const mapboxToken = getInitialMapboxToken();
    if (!mapboxToken) {
      throw new Error('Mapbox token missing for reverse geocoding');
    }

    const params = new URLSearchParams({
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      types: 'place,locality,neighborhood,address',
      access_token: mapboxToken,
    });

    const response = await fetch(`${MAPBOX_REVERSE_GEOCODING_URL}?${params.toString()}`, { signal });

    if (!response.ok) {
      throw new Error(`Reverse geocoding request failed: ${response.status}`);
    }

    const data = await response.json() as MapboxReverseGeocodingResponse;
    const label = getPreferredLocationLabel(data.features ?? []);

    if (!label) {
      throw new Error('Reverse geocoding response did not include a location label');
    }

    return label;
  },
};
