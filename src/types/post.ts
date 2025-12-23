export interface Post {
  id: string;
  author: {
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
}

export interface Comment {
  id: string;
  author: string;
  avatar: string;
  text: string;
  time: string;
}
