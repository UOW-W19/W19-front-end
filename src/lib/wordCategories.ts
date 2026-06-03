export interface ConceptCategory {
  id: string;
  label: string;
  emoji: string;
  keywords: string[];
}

export const CONCEPT_CATEGORIES: ConceptCategory[] = [
  {
    id: 'electronics',
    label: 'Electronics & Tech',
    emoji: '💻',
    keywords: ['keyboard', 'computer', 'phone', 'screen', 'battery', 'charger', 'laptop', 'tablet', 'mouse', 'cable', 'internet', 'wifi', 'app', 'device', 'camera', 'printer', 'monitor', 'software', 'hardware', 'network', 'bluetooth', 'headphone', 'speaker', 'remote', 'digital'],
  },
  {
    id: 'shopping',
    label: 'Shopping & Money',
    emoji: '🛍️',
    keywords: ['how much', 'price', 'cost', 'buy', 'shop', 'store', 'market', 'pay', 'discount', 'cheap', 'expensive', 'sale', 'receipt', 'money', 'cash', 'card', 'purchase', 'refund', 'wallet', 'coin', 'bank', 'currency', 'change', 'bill', 'budget'],
  },
  {
    id: 'food',
    label: 'Food & Drink',
    emoji: '🍽️',
    keywords: ['eat', 'food', 'drink', 'coffee', 'restaurant', 'menu', 'hungry', 'cook', 'meal', 'breakfast', 'lunch', 'dinner', 'bread', 'meat', 'vegetable', 'fruit', 'juice', 'beer', 'wine', 'tea', 'rice', 'soup', 'dessert', 'snack', 'delicious', 'taste', 'kitchen', 'recipe', 'milk', 'cheese', 'egg'],
  },
  {
    id: 'travel',
    label: 'Travel & Transport',
    emoji: '✈️',
    keywords: ['train', 'bus', 'airport', 'hotel', 'map', 'ticket', 'passport', 'direction', 'car', 'taxi', 'flight', 'trip', 'journey', 'station', 'city', 'country', 'border', 'luggage', 'reservation', 'tourist', 'road', 'bridge', 'ferry', 'subway', 'platform'],
  },
  {
    id: 'greetings',
    label: 'Greetings & Phrases',
    emoji: '👋',
    keywords: ['hello', 'good morning', 'good night', 'goodbye', 'thank', 'please', 'sorry', 'excuse', 'welcome', 'understand', 'speak', 'repeat', 'help', 'know', 'what is', 'how are', 'nice to meet', 'see you', 'good luck', 'congratulations'],
  },
  {
    id: 'people',
    label: 'People & Family',
    emoji: '👨‍👩‍👦',
    keywords: ['mother', 'father', 'brother', 'sister', 'friend', 'family', 'child', 'baby', 'husband', 'wife', 'parent', 'son', 'daughter', 'uncle', 'aunt', 'grandmother', 'grandfather', 'person', 'man', 'woman', 'boy', 'girl', 'neighbour', 'colleague', 'boss'],
  },
  {
    id: 'body',
    label: 'Body & Health',
    emoji: '🏥',
    keywords: ['head', 'hand', 'foot', 'eye', 'ear', 'nose', 'mouth', 'body', 'sick', 'doctor', 'hospital', 'medicine', 'pain', 'heart', 'back', 'arm', 'leg', 'tooth', 'health', 'exercise', 'sleep', 'tired', 'fever', 'allergy', 'pharmacy'],
  },
  {
    id: 'home',
    label: 'Home & Living',
    emoji: '🏠',
    keywords: ['house', 'home', 'room', 'door', 'window', 'bed', 'chair', 'table', 'bathroom', 'garden', 'floor', 'wall', 'furniture', 'key', 'clean', 'wash', 'sofa', 'lamp', 'shelf', 'cupboard', 'neighbour', 'apartment', 'flat'],
  },
  {
    id: 'nature',
    label: 'Nature & Weather',
    emoji: '🌿',
    keywords: ['sun', 'rain', 'tree', 'flower', 'weather', 'hot', 'cold', 'wind', 'snow', 'cloud', 'river', 'sea', 'mountain', 'forest', 'animal', 'dog', 'cat', 'bird', 'fish', 'sky', 'earth', 'storm', 'beach', 'lake', 'plant', 'season'],
  },
];

export const OTHER_CATEGORY: ConceptCategory = { id: 'other', label: 'Other', emoji: '📝', keywords: [] };

export const ALL_WORD_CATEGORIES: ConceptCategory[] = [...CONCEPT_CATEGORIES, OTHER_CATEGORY];

export function categoriseWord(word: string, translation: string): string {
  const text = `${word} ${translation}`.toLowerCase();
  for (const cat of CONCEPT_CATEGORIES) {
    if (cat.keywords.some(kw => text.includes(kw))) return cat.id;
  }
  return 'other';
}

export function categoryLabel(id: string): string {
  return ALL_WORD_CATEGORIES.find(c => c.id === id)?.label ?? 'Other';
}

export function categoryEmoji(id: string): string {
  return ALL_WORD_CATEGORIES.find(c => c.id === id)?.emoji ?? '📝';
}
