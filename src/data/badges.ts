export type BadgeCategory = "getting_started" | "learning" | "community" | "meetups";

export type BadgeIcon = "sparkles" | "message" | "book" | "users" | "map";

export type BadgeDefinition = {
  id: string;
  name: string;
  description: string;
  category: BadgeCategory;
  unlockCondition: string;
  icon: BadgeIcon;
  unlocked: boolean;
  awardedAt?: string;
};

type BadgeTemplate = Omit<BadgeDefinition, "unlocked" | "awardedAt">;

export const BADGE_CATEGORIES: BadgeCategory[] = [
  "getting_started",
  "learning",
  "community",
  "meetups",
];

export const BADGE_CATEGORY_LABELS: Record<BadgeCategory, string> = {
  getting_started: "Getting Started",
  learning: "Learning",
  community: "Community",
  meetups: "Meetups",
};

const BADGE_TEMPLATES: BadgeTemplate[] = [
  {
    id: "first-hello",
    name: "First Hello",
    description: "Joined Locale and started your language journey.",
    category: "getting_started",
    unlockCondition: "Create your Locale account.",
    icon: "message",
  },
  {
    id: "profile-starter",
    name: "Profile Starter",
    description: "Made your profile feel like your own.",
    category: "getting_started",
    unlockCondition: "Add a bio and profile photo.",
    icon: "sparkles",
  },
  {
    id: "language-picker",
    name: "Language Picker",
    description: "Chose the language you want to learn next.",
    category: "getting_started",
    unlockCondition: "Add your first learning language.",
    icon: "map",
  },
  {
    id: "first-word-saved",
    name: "First Word Saved",
    description: "Saved a word worth remembering.",
    category: "learning",
    unlockCondition: "Save your first word.",
    icon: "book",
  },
  {
    id: "practice-starter",
    name: "Practice Starter",
    description: "Started building a learning rhythm.",
    category: "learning",
    unlockCondition: "Complete your first practice session.",
    icon: "sparkles",
  },
  {
    id: "first-post",
    name: "First Post",
    description: "Shared something with the Locale community.",
    category: "community",
    unlockCondition: "Create your first feed post.",
    icon: "message",
  },
  {
    id: "first-friend",
    name: "First Friend",
    description: "Made your first connection on Locale.",
    category: "community",
    unlockCondition: "Add your first friend.",
    icon: "users",
  },
  {
    id: "conversation-starter",
    name: "Conversation Starter",
    description: "Opened the door to a new chat.",
    category: "community",
    unlockCondition: "Send your first message.",
    icon: "message",
  },
  {
    id: "first-meetup-joined",
    name: "First Meetup Joined",
    description: "Took language learning into the real world.",
    category: "meetups",
    unlockCondition: "Join your first meetup.",
    icon: "map",
  },
  {
    id: "local-explorer",
    name: "Local Explorer",
    description: "Found nearby ways to practise and connect.",
    category: "meetups",
    unlockCondition: "View meetups near your saved location.",
    icon: "map",
  },
];

export const buildProfileBadges = (joinedAt?: string): BadgeDefinition[] =>
  BADGE_TEMPLATES.map((badge) => ({
    ...badge,
    unlocked: badge.id === "first-hello",
    awardedAt: badge.id === "first-hello" ? joinedAt : undefined,
  }));
