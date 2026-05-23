export interface Post {
  id: string;
  author: {
    id: string;
    name: string;
    avatar: string;
    avatarUrl?: string;
    language: string;
    flag: string;
    location?: string;
    learningLanguages?: { code: string; name: string; flagEmoji: string }[];
  };
  content: string;
  originalLanguage: string;
  translation: string;
  location: string;
  distance: string;
  image?: string;
  reactions: { likes: number; comments: number };
  time: string;
  isLiked?: boolean;
  isSaved?: boolean;
}

export interface Comment {
  id: string;
  author: string;
  avatar: string;
  text: string;
  time: string;
}
