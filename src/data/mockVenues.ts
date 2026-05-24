export type MockVenue = {
  id: string;
  name: string;
  address: string;
  category: string;
  emoji: string;
  lat?: number;
  lng?: number;
};

export const MOCK_VENUES: MockVenue[] = [
  { id: '1', name: 'The Daily Grind', address: '6 Frances street', category: 'Coffee Shop', emoji: '☕' },
  { id: '2', name: 'Harbour Wine Bar', address: '8 Stanleigh Cres', category: 'Wine Bar', emoji: '🍷' },
  { id: '3', name: 'Corner Bistro', address: '7 Chapel St', category: 'Restaurant', emoji: '🍽️' },
  { id: '4', name: 'Bloom Café', address: '88 Park Ave', category: 'Café', emoji: '🌸' },
];

export function getVenueForLearner(learnerId: string): MockVenue {
  const sum = learnerId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return MOCK_VENUES[sum % MOCK_VENUES.length];
}
