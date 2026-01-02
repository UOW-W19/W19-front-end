// Meetup Types

export interface Meetup {
  id: string;
  title: string;
  description: string;
  language: string;
  languageFlag: string;
  location: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  date: string;
  time: string;
  hostId: string;
  host: {
    id: string;
    displayName: string;
    avatarUrl?: string;
  };
  participants: MeetupParticipant[];
  maxParticipants: number;
  createdAt: string;
}

export interface MeetupParticipant {
  id: string;
  displayName: string;
  avatarUrl?: string;
  joinedAt: string;
}

export interface CreateMeetupRequest {
  title: string;
  description: string;
  language: string;
  location: string;
  date: string;
  time: string;
  maxParticipants: number;
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
    learning: string[];
    native: string[];
  };
  distanceKm?: number;
}
