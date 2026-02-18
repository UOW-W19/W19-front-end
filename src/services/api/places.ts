import { API_BASE_URL } from './config';
import { getStoredToken } from './auth';

export interface PlacePrediction {
    placeId: string;
    text: { text: string };
    structuredFormat?: {
        mainText: { text: string };
        secondaryText?: { text: string };
    };
}

export interface PlacesAutocompleteResponse {
    suggestions: {
        placePrediction: PlacePrediction;
    }[];
}

export interface PlaceDetailsResponse {
    location: {
        latitude: number;
        longitude: number;
    };
    displayName: {
        text: string;
    };
    formattedAddress: string;
}

const apiRequest = async <T>(endpoint: string): Promise<T> => {
    const token = getStoredToken();
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
    };

    if (token) {
        (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, { headers });

    if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.status}`);
    }

    return response.json();
};

export const placesApi = {
    search: async (query: string): Promise<PlacesAutocompleteResponse> => {
        return apiRequest<PlacesAutocompleteResponse>(`/places/autocomplete?input=${encodeURIComponent(query)}`);
    },

    getDetails: async (placeId: string): Promise<PlaceDetailsResponse> => {
        return apiRequest<PlaceDetailsResponse>(`/places/${placeId}`);
    },
};
