export interface Post {
  id: string;
  author: {
    id: string;
    name: string;
    avatar: string;
    language: string;
    flag: string;
  };
  content: string;
  translation: string;
  location: string;
  distance: string;
  image?: string;
  reactions: { likes: number; comments: number };
  time: string;
  isLiked?: boolean;
}

export interface Comment {
  id: string;
  author: string;
  avatar: string;
  text: string;
  time: string;
}
