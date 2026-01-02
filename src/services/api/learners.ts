// Nearby Learners API Service - Mock implementation
import type { NearbyLearner } from '@/types/meetup';
import { simulateDelay } from './config';

// Mock nearby learners data with coordinates around NYC
const mockNearbyLearners: NearbyLearner[] = [
  {
    id: 'learner-1',
    displayName: 'Alex',
    coordinates: { lat: 40.7580, lng: -73.9855 },
    languages: {
      learning: ['Spanish', 'French'],
      native: ['English'],
    },
  },
  {
    id: 'learner-2',
    displayName: 'Sofia',
    coordinates: { lat: 40.7614, lng: -73.9776 },
    languages: {
      learning: ['Japanese', 'Korean'],
      native: ['Spanish'],
    },
  },
  {
    id: 'learner-3',
    displayName: 'Marco',
    coordinates: { lat: 40.7549, lng: -73.9840 },
    languages: {
      learning: ['German', 'Italian'],
      native: ['Portuguese'],
    },
  },
  {
    id: 'learner-4',
    displayName: 'Yuki',
    coordinates: { lat: 40.7829, lng: -73.9654 },
    languages: {
      learning: ['English', 'Spanish'],
      native: ['Japanese'],
    },
  },
  {
    id: 'learner-5',
    displayName: 'Emma',
    coordinates: { lat: 40.7700, lng: -73.9800 },
    languages: {
      learning: ['French', 'German'],
      native: ['English'],
    },
  },
];

export const learnersApi = {
  async getNearbyLearners(): Promise<NearbyLearner[]> {
    await simulateDelay(300);
    return [...mockNearbyLearners];
  },
};
