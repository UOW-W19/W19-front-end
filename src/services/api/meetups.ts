// Meetups API Service - Mock implementation
import type { Meetup, MeetupParticipant, CreateMeetupRequest } from '@/types/meetup';
import { simulateDelay } from './config';
import { getStoredUser } from './auth';

// Mock meetups data
const mockMeetups: Meetup[] = [
  {
    id: '1',
    title: 'Spanish Conversation Hour',
    description: 'Join us for a relaxed hour of Spanish conversation practice! All levels welcome. We\'ll have guided conversation topics and native speakers to help you practice.',
    language: 'Spanish',
    languageFlag: '🇪🇸',
    location: 'Central Park Café',
    coordinates: { lat: 40.7829, lng: -73.9654 },
    date: '2025-12-26',
    time: '15:00',
    hostId: 'user-1',
    host: {
      id: 'user-1',
      displayName: 'Maria Garcia',
      avatarUrl: undefined,
    },
    participants: [
      { id: 'user-2', displayName: 'John Smith', joinedAt: '2025-12-20T10:00:00Z' },
      { id: 'user-3', displayName: 'Emma Wilson', joinedAt: '2025-12-21T14:30:00Z' },
      { id: 'user-4', displayName: 'Lucas Brown', joinedAt: '2025-12-22T09:15:00Z' },
    ],
    maxParticipants: 12,
    createdAt: '2025-12-15T08:00:00Z',
  },
  {
    id: '2',
    title: 'Japanese Language Exchange',
    description: 'Practice your Japanese with native speakers and fellow learners. We focus on casual conversation and cultural exchange. Bring your questions!',
    language: 'Japanese',
    languageFlag: '🇯🇵',
    location: 'Downtown Library',
    coordinates: { lat: 40.7549, lng: -73.9840 },
    date: '2025-12-28',
    time: '14:00',
    hostId: 'user-5',
    host: {
      id: 'user-5',
      displayName: 'Yuki Tanaka',
      avatarUrl: undefined,
    },
    participants: [
      { id: 'user-6', displayName: 'Alex Chen', joinedAt: '2025-12-23T11:00:00Z' },
      { id: 'user-7', displayName: 'Sarah Lee', joinedAt: '2025-12-24T16:45:00Z' },
    ],
    maxParticipants: 10,
    createdAt: '2025-12-18T12:00:00Z',
  },
  {
    id: '3',
    title: 'French Beginners Meetup',
    description: 'New to French? This is the perfect meetup for you! We\'ll go slow and focus on basic phrases and pronunciation. No experience needed.',
    language: 'French',
    languageFlag: '🇫🇷',
    location: 'Le Petit Café',
    coordinates: { lat: 40.7614, lng: -73.9776 },
    date: '2025-12-30',
    time: '11:00',
    hostId: 'user-8',
    host: {
      id: 'user-8',
      displayName: 'Pierre Dubois',
      avatarUrl: undefined,
    },
    participants: [],
    maxParticipants: 8,
    createdAt: '2025-12-20T15:00:00Z',
  },
];

export const meetupsApi = {
  async getMeetups(): Promise<Meetup[]> {
    await simulateDelay(400);
    return [...mockMeetups].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  },

  async getMeetup(id: string): Promise<Meetup> {
    await simulateDelay(300);
    const meetup = mockMeetups.find((m) => m.id === id);
    if (!meetup) {
      throw new Error('Meetup not found');
    }
    return meetup;
  },

  async joinMeetup(id: string): Promise<Meetup> {
    await simulateDelay(500);

    const user = getStoredUser();
    if (!user) {
      throw new Error('Not authenticated');
    }

    const meetup = mockMeetups.find((m) => m.id === id);
    if (!meetup) {
      throw new Error('Meetup not found');
    }

    // Check if already joined
    if (meetup.participants.some((p) => p.id === user.id)) {
      throw new Error('Already joined this meetup');
    }

    // Check if full
    if (meetup.participants.length >= meetup.maxParticipants) {
      throw new Error('Meetup is full');
    }

    const newParticipant: MeetupParticipant = {
      id: user.id,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      joinedAt: new Date().toISOString(),
    };

    meetup.participants.push(newParticipant);
    return meetup;
  },

  async leaveMeetup(id: string): Promise<Meetup> {
    await simulateDelay(500);

    const user = getStoredUser();
    if (!user) {
      throw new Error('Not authenticated');
    }

    const meetup = mockMeetups.find((m) => m.id === id);
    if (!meetup) {
      throw new Error('Meetup not found');
    }

    // Check if user is the host
    if (meetup.hostId === user.id) {
      throw new Error('Host cannot leave their own meetup');
    }

    const participantIndex = meetup.participants.findIndex((p) => p.id === user.id);
    if (participantIndex === -1) {
      throw new Error('Not a participant of this meetup');
    }

    meetup.participants.splice(participantIndex, 1);
    return meetup;
  },

  async createMeetup(data: CreateMeetupRequest): Promise<Meetup> {
    await simulateDelay(600);

    const user = getStoredUser();
    if (!user) {
      throw new Error('Not authenticated');
    }

    // ✅ Issue 3 Fix: Generate random coordinates near NYC for new meetups
    const newMeetup: Meetup = {
      id: `meetup-${Date.now()}`,
      title: data.title,
      description: data.description,
      language: data.language,
      languageFlag: '🌐',
      location: data.location,
      coordinates: {
        lat: 40.7128 + (Math.random() - 0.5) * 0.1, // Random NYC Lat
        lng: -74.0060 + (Math.random() - 0.5) * 0.1, // Random NYC Lng
      },
      date: data.date,
      time: data.time,
      hostId: user.id,
      host: {
        id: user.id,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
      },
      participants: [],
      maxParticipants: data.maxParticipants,
      createdAt: new Date().toISOString(),
    };

    mockMeetups.push(newMeetup);
    return newMeetup;
  },
};
