// Languages API Service - Fetch supported languages
import type { Language } from '@/types/api';
import { API_BASE_URL } from './config';
import { getStoredToken } from './auth';

// Backend response types (matching snake_case API)
interface BackendLanguage {
    code: string;
    name: string;
    flag: string;
}

// Helper for API requests
const apiRequest = async <T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> => {
    const token = getStoredToken();

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
        ...options.headers,
    };

    if (token) {
        (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        let errorMessage = 'Request failed';
        try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
            errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
    }

    return response.json();
};

// Transform backend language to frontend
const transformLanguage = (lang: BackendLanguage): Language => ({
    code: lang.code,
    name: lang.name,
    flag: lang.flag,
});

export const languagesApi = {
    /**
     * Get all supported languages
     * @returns Array of supported languages with codes, names, and flag emojis
     */
    async getLanguages(): Promise<Language[]> {
        // Backend returns { languages: [...] } envelope
        const response = await apiRequest<{ languages?: BackendLanguage[] } | BackendLanguage[]>('/languages');
        const list = Array.isArray(response)
            ? response
            : (response as { languages?: BackendLanguage[] }).languages ?? [];
        return list.map(transformLanguage);
    },
};
