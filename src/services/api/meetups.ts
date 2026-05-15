// Meetups API Service - Real backend integration (aligned with API contract)
import type { 
  Meetup, 
  MeetupAttendee, 
  CreateMeetupRequest, 
  UpdateMeetupRequest,
  MeetupsListResponse 
} from '@/types/meetup';
import { API_BASE_URL } from './config';
import { getStoredToken } from './auth';

// Backend response types (snake_case from API)
interface BackendLanguage {
  code: string;
  name: string;
  flag_emoji: string;
}

interface BackendOrganizer {
  id: string;
  display_name: string;
  avatar_url: string | null;
}

interface BackendMeetup {
  id: string;
  organizer: BackendOrganizer;
  title: string;
  description: string | null;
  language: BackendLanguage;
  meetup_date: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  max_attendees: number | null;
  attendee_count: number;
  is_attending: boolean;
  is_organizer: boolean;
  status: 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';
  created_at: string;
}

interface BackendMeetupsResponse {
  meetups: BackendMeetup[];
  total_pages: number;
  total_elements: number;
  current_page: number;
}

interface BackendAttendee {
  id: string;
  display_name: string;
  avatar_url: string | null;
  joined_at: string;
}

interface BackendAttendeesResponse {
  attendees: BackendAttendee[];
}

// Transform backend meetup to frontend
const transformMeetup = (m: BackendMeetup): Meetup => ({
  id: m.id,
  title: m.title,
  description: m.description,
  language: {
    code: m.language.code,
    name: m.language.name,
    flagEmoji: m.language.flag_emoji,
  },
  location: m.location,
  coordinates: m.latitude !== null && m.longitude !== null 
    ? { lat: m.latitude, lng: m.longitude } 
    : undefined,
  meetupDate: m.meetup_date,
  organizer: {
    id: m.organizer.id,
    displayName: m.organizer.display_name,
    avatarUrl: m.organizer.avatar_url ?? undefined,
  },
  maxAttendees: m.max_attendees,
  attendeeCount: m.attendee_count,
  isAttending: m.is_attending,
  isOrganizer: m.is_organizer,
  status: m.status,
  createdAt: m.created_at,
});

// Transform backend attendee to frontend
const transformAttendee = (a: BackendAttendee): MeetupAttendee => ({
  id: a.id,
  displayName: a.display_name,
  avatarUrl: a.avatar_url ?? undefined,
  joinedAt: a.joined_at,
});

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
  
  if (response.status === 204) {
    return {} as T;
  }
  
  return response.json();
};

export interface GetMeetupsParams {
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  language?: string;
  page?: number;
  size?: number;
}

export const meetupsApi = {
  async getMeetups(params?: GetMeetupsParams): Promise<MeetupsListResponse> {
    const queryParams = new URLSearchParams();
    
    if (params?.latitude !== undefined) {
      queryParams.set('latitude', String(params.latitude));
    }
    if (params?.longitude !== undefined) {
      queryParams.set('longitude', String(params.longitude));
    }
    if (params?.radiusKm !== undefined) {
      queryParams.set('radius_km', String(params.radiusKm));
    }
    if (params?.language) {
      queryParams.set('language', params.language);
    }
    if (params?.page !== undefined) {
      queryParams.set('page', String(params.page));
    }
    if (params?.size !== undefined) {
      queryParams.set('size', String(params.size));
    }
    
    const queryString = queryParams.toString();
    const url = `/meetups${queryString ? `?${queryString}` : ''}`;
    console.log('[meetupsApi] Fetching meetups:', url);
    
    const response = await apiRequest<BackendMeetupsResponse>(url);
    console.log('[meetupsApi] Raw response:', response);
    
    return {
      meetups: response.meetups.map(transformMeetup),
      totalPages: response.total_pages,
      totalElements: response.total_elements,
      currentPage: response.current_page,
    };
  },

  async getMeetup(id: string): Promise<Meetup> {
    const meetup = await apiRequest<BackendMeetup>(`/meetups/${id}`);
    return transformMeetup(meetup);
  },

  async joinMeetup(id: string): Promise<Meetup> {
    const meetup = await apiRequest<BackendMeetup>(`/meetups/${id}/join`, {
      method: 'POST',
    });
    return transformMeetup(meetup);
  },

  async leaveMeetup(id: string): Promise<Meetup> {
    const meetup = await apiRequest<BackendMeetup>(`/meetups/${id}/leave`, {
      method: 'POST',
    });
    return transformMeetup(meetup);
  },

  async createMeetup(data: CreateMeetupRequest): Promise<Meetup> {
    // Send snake_case to backend
    const body: Record<string, unknown> = {
      title: data.title,
      language_code: data.languageCode,
      meetup_date: data.meetupDate,
      location: data.location,
    };
    
    if (data.description) body.description = data.description;
    if (data.latitude !== undefined) body.latitude = data.latitude;
    if (data.longitude !== undefined) body.longitude = data.longitude;
    if (data.maxAttendees !== undefined) body.max_attendees = data.maxAttendees;
    
    console.log('[meetupsApi] Creating meetup:', body);
    
    const meetup = await apiRequest<BackendMeetup>('/meetups', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    
    return transformMeetup(meetup);
  },

  async updateMeetup(id: string, data: UpdateMeetupRequest): Promise<Meetup> {
    // Send snake_case to backend
    const body: Record<string, unknown> = {};
    if (data.title !== undefined) body.title = data.title;
    if (data.description !== undefined) body.description = data.description;
    if (data.languageCode !== undefined) body.language_code = data.languageCode;
    if (data.meetupDate !== undefined) body.meetup_date = data.meetupDate;
    if (data.location !== undefined) body.location = data.location;
    if (data.latitude !== undefined) body.latitude = data.latitude;
    if (data.longitude !== undefined) body.longitude = data.longitude;
    if (data.maxAttendees !== undefined) body.max_attendees = data.maxAttendees;
    
    const meetup = await apiRequest<BackendMeetup>(`/meetups/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
    
    return transformMeetup(meetup);
  },

  async deleteMeetup(id: string): Promise<void> {
    await apiRequest<void>(`/meetups/${id}`, {
      method: 'DELETE',
    });
  },

  async getAttendees(id: string): Promise<MeetupAttendee[]> {
    const response = await apiRequest<BackendAttendeesResponse>(`/meetups/${id}/attendees`);
    return response.attendees.map(transformAttendee);
  },
};
