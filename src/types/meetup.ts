// Meetup Types - Aligned with backend API contract

export type MeetupStatus = 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';

export interface MeetupLanguage {
  code: string;
  name: string;
  flagEmoji: string;
}

export interface MeetupOrganizer {
  id: string;
  displayName: string;
  avatarUrl?: string;
}

export interface Meetup {
  id: string;
  title: string;
  description: string | null;
  language: MeetupLanguage;
  location: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  meetupDate: string; // ISO 8601 format
  organizer: MeetupOrganizer;
  maxAttendees: number | null;
  attendeeCount: number;
  isAttending: boolean;
  isOrganizer: boolean;
  status: MeetupStatus;
  createdAt: string;
}

export interface MeetupAttendee {
  id: string;
  displayName: string;
  avatarUrl?: string;
  joinedAt: string;
}

export interface CreateMeetupRequest {
  title: string;
  description?: string;
  languageCode: string;
  meetupDate: string; // ISO 8601 format
  location: string;
  latitude?: number;
  longitude?: number;
  maxAttendees?: number;
}

export interface UpdateMeetupRequest {
  title?: string;
  description?: string;
  languageCode?: string;
  meetupDate?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  maxAttendees?: number;
}

export interface MeetupsListResponse {
  meetups: Meetup[];
  totalPages: number;
  totalElements: number;
  currentPage: number;
}

// Legacy types kept for backward compatibility during migration
export interface MeetupParticipant {
  id: string;
  displayName: string;
  avatarUrl?: string;
  joinedAt: string;
}

export interface NearbyLearner {
  id: string;
  displayName: string;
  avatarUrl?: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  languages: {
    code: string;
    name: string;
    flagEmoji: string;
    proficiency: string; // Required as per backend guide
    isLearning: boolean; // Required as per backend guide
  }[];
  distanceKm?: number;
}
