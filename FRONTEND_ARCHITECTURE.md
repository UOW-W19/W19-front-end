## Frontend Architecture Overview

This document explains the structure of the Locale frontend, focusing on the **interfaces**, **methods/functions**, and how the different pieces connect.

---

## Project folder structure and files

Complete directory tree (excluding `node_modules` and `.git`):

```
W19-front-end/
├── .env
├── .env.example
├── .idea/
│   ├── aws.xml
│   ├── inspectionProfiles/
│   │   └── Project_Default.xml
│   ├── misc.xml
│   ├── modules.xml
│   ├── vcs.xml
│   ├── W19-front-end.iml
│   └── workspace.xml
├── components.json
├── Dockerfile
├── eslint.config.js
├── FRONTEND_ARCHITECTURE.md
├── index.html
├── nginx.conf
├── package.json
├── package-lock.json
├── postcss.config.js
├── README.md
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── index.css
│   ├── components/
│   │   ├── explore/
│   │   │   ├── CreateMeetupModal.tsx
│   │   │   ├── ExploreMap.tsx
│   │   │   ├── LocationPicker.tsx
│   │   │   ├── MeetupCard.tsx
│   │   │   └── MeetupDetailSheet.tsx
│   │   ├── feed/
│   │   │   ├── ComposeModal.tsx
│   │   │   └── PostCard.tsx
│   │   ├── layout/
│   │   │   ├── AppLayout.tsx
│   │   │   ├── BottomNav.tsx
│   │   │   ├── Header.tsx
│   │   │   └── Sidebar.tsx
│   │   ├── messages/
│   │   │   ├── ChatWindow.tsx
│   │   │   └── ConversationList.tsx
│   │   └── ui/
│   │       ├── avatar.tsx
│   │       ├── button.tsx
│   │       ├── dropdown-menu.tsx
│   │       ├── input.tsx
│   │       ├── PullToRefresh.tsx
│   │       └── sheet.tsx
│   ├── contexts/
│   │   ├── AuthContext.tsx
│   │   └── index.ts
│   ├── hooks/
│   │   └── useLearnApi.ts
│   ├── lib/
│   │   └── utils.ts
│   ├── pages/
│   │   ├── AuthPage.tsx
│   │   ├── ExplorePage.tsx
│   │   ├── FeedPage.tsx
│   │   ├── FriendsPage.tsx
│   │   ├── InstallPage.tsx
│   │   ├── LearnPage.tsx
│   │   ├── MessagesPage.tsx
│   │   ├── ProfilePage.tsx
│   │   ├── ScannerPage.tsx
│   │   ├── SettingsPage.tsx
│   │   └── UserProfilePage.tsx
│   ├── services/
│   │   └── api/
│   │       ├── auth.ts
│   │       ├── comments.ts
│   │       ├── config.ts
│   │       ├── friends.ts
│   │       ├── index.ts
│   │       ├── languages.ts
│   │       ├── learn.ts
│   │       ├── learners.ts
│   │       ├── meetups.ts
│   │       ├── messages.ts
│   │       ├── places.ts
│   │       ├── posts.ts
│   │       └── users.ts
│   └── types/
│       ├── api.ts
│       ├── index.ts
│       ├── language.ts
│       ├── meetup.ts
│       ├── message.ts
│       ├── navigation.ts
│       └── post.ts
├── tailwind.config.js
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.node.json
└── vite.config.ts
```

### Quick reference by folder

| Path | Purpose |
|------|--------|
| **Root** | Config (Vite, TS, ESLint, Tailwind, PostCSS), Docker/nginx, `index.html`, `package.json` |
| **src/** | Application source |
| **src/components/explore/** | Map, meetup cards, create meetup, location picker |
| **src/components/feed/** | Post card, compose post modal |
| **src/components/layout/** | App shell: sidebar, header, bottom nav, layout wrapper |
| **src/components/messages/** | Conversation list, chat window |
| **src/components/ui/** | Reusable UI primitives (button, input, sheet, avatar, etc.) |
| **src/contexts/** | React context (e.g. Auth) and re-exports |
| **src/hooks/** | Custom hooks (e.g. learning API) |
| **src/lib/** | Shared utilities (e.g. `cn`) |
| **src/pages/** | Route-level page components |
| **src/services/api/** | Backend API client modules and config |
| **src/types/** | TypeScript interfaces and type definitions |

---

## 1. Runtime Composition

- **Entry point (`main.tsx`)**
  - Mounts the React app into `#root` and applies `StrictMode`.
  - Renders `App`, which wires together routing, global data fetching, and authentication.

- **Root app (`App.tsx`)**
  - Creates a `QueryClient` and wraps the app in:
    - `QueryClientProvider` (from `@tanstack/react-query`) for data fetching and caching.
    - `BrowserRouter` (from `react-router-dom`) for client-side routing.
    - `AuthProvider` (custom context) for authentication state and user profile.
  - Declares routes via `AppRoutes`, including:
    - `/auth` → `AuthPage` (unprotected).
    - All other main routes (`/`, `/explore`, `/messages`, `/learn`, `/profile`, `/user/:userId`, `/settings`, `/install`, `/scanner`, `/friends`) wrapped in `ProtectedRoute` and `AppLayout`.

- **Protected routes (`ProtectedRoute` in `App.tsx`)**
  - **Props**: `{ children: React.ReactNode }`.
  - Uses `useAuth()` to read `isAuthenticated` and `isLoading`.
  - While `isLoading` → shows a spinner screen.
  - If not authenticated → redirects to `/auth`.
  - If authenticated → renders `children` (which includes `AppLayout` and nested pages).

- **Layout (`AppLayout.tsx`)**
  - Uses `useLocation()` to determine the current route and map it to a title.
  - Renders:
    - `Sidebar` on large screens.
    - `Header` with the derived title.
    - `<Outlet />` where the active page is shown.
    - `BottomNav` on small screens.

---

## 2. Global Auth Context

### 2.1 `AuthContextType` (in `contexts/AuthContext.tsx`)

```ts
interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: UpdateProfileRequest) => Promise<void>;
}
```

- **`user`**: The currently authenticated `UserProfile` (from `types/api.ts`) or `null`.
- **`isAuthenticated`**: `true` when a user is logged in (based on `user`).
- **`isLoading`**: `true` while the app checks for an existing session on mount.
- **`login`, `register`, `logout`, `updateProfile`**: Methods that delegate to `authApi` (see below) and update both local storage and React state.

### 2.2 `AuthProvider`

- On mount:
  - Reads token from local storage (`getStoredToken()`).
  - If a token exists, calls `authApi.getProfile()` and populates `user`, otherwise clears auth state.
- Provides `AuthContextType` to the tree.

### 2.3 `useAuth` hook

- Wraps `useContext(AuthContext)` to provide a strongly-typed auth API to components.
- Throws if used outside `AuthProvider`.
- **Used by**:
  - `ProtectedRoute` to gate routes.
  - Any page/component that needs `user` or auth methods.

---

## 3. Core Domain Interfaces (Types)

All domain types live under `src/types/*` and are re-exported from `types/index.ts` for convenience.

### 3.1 Posts & Comments (`types/post.ts`, `types/api.ts`)

- **UI-level post (`Post`)**
  - Used by feed UI components such as `PostCard` and `FeedPage`.
  - Fields:
    - `id: string`
    - `author: { id, name, avatar, language, flag }`
    - `content: string`
    - `translation: string`
    - `location: string`
    - `distance: string`
    - `image?: string`
    - `reactions: { likes: number; comments: number }`
    - `time: string`
    - `isLiked?: boolean`

- **Backend-mapped post (`ApiPost` in `types/api.ts`)**
  - Matches the backend contract (camelCase) and is produced by `postsApi`.
  - Key fields:
    - `id`, `content`, `originalLanguage`, optional `translation`, `imageUrl`.
    - `latitude`, `longitude`, `distance`, `location`.
    - `author: AuthorDto` (see “Author” section).
    - `reactions: PostReactionSummary`.
    - `userReaction?: ReactionType | null`.
    - `status?: PostStatus`, `createdAt`.

- **Comments (`Comment` in `types/post.ts`, `ApiComment` in `types/api.ts`)**
  - `Comment` (UI-level) is a simple shape (`id`, `author`, `avatar`, `text`, `time`).
  - `ApiComment` matches backend comment DTO (`id`, `content`, `createdAt`, `author: AuthorDto`).

### 3.2 Meetups (`types/meetup.ts`)

- **Status and languages**
  - `MeetupStatus = 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'CANCELLED'`
  - `MeetupLanguage` holds `code`, `name`, `flagEmoji`.

- **Organizers & attendees**
  - `MeetupOrganizer`: `{ id, displayName, avatarUrl? }`
  - `MeetupAttendee`: `{ id, displayName, avatarUrl?, joinedAt }`

- **Meetup main entity (`Meetup`)**
  - Fields:
    - `id`, `title`, `description | null`
    - `language: MeetupLanguage`
    - `location: string`
    - Optional `coordinates: { lat, lng }`
    - `meetupDate: string` (ISO 8601)
    - `organizer: MeetupOrganizer`
    - `maxAttendees: number | null`, `attendeeCount: number`
    - `isAttending: boolean`, `isOrganizer: boolean`
    - `status: MeetupStatus`, `createdAt: string`

- **Create / update requests**
  - `CreateMeetupRequest`:
    - `title`, optional `description`
    - `languageCode`, `meetupDate`, `location`
    - optional `latitude`, `longitude`, `maxAttendees`
  - `UpdateMeetupRequest`: all fields are optional, used to partially update.

- **List response**
  - `MeetupsListResponse`:
    - `meetups: Meetup[]`
    - `totalPages`, `totalElements`, `currentPage`

- **Legacy types**
  - `MeetupParticipant`, `NearbyLearner` kept for backward compatibility with older components.

### 3.3 Messages & Conversations (`types/message.ts`)

- **Message**
  - `id`, `conversationId`, `senderId`, `content`, `createdAt`, `isRead`.
  - Optional `attachments` array with `{ type: 'image' | 'file'; url: string }`.

- **Conversation**
  - `id`
  - `participants: UserProfile[]`
  - Optional `lastMessage?: Message`
  - `unreadCount`, `updatedAt`
  - `isGroup`, optional `groupName`, `groupAvatar`

- **CreateMessageRequest**
  - `{ conversationId: string; content: string }`.

- **Backend DTO helpers**
  - `BackendMessage` and `BackendConversation`: exact backend DTO shapes, used to transform into the frontend `Message` / `Conversation`.
  - `BackendPaginatedResponse<T>`: generic pagination wrapper (`content`, `totalElements`, `totalPages`, `size`, `number`).

### 3.4 Auth & User Profiles (`types/api.ts`)

- **Requests and responses**
  - `RegisterRequest`: `email`, optional `username`, `password`, `displayName`.
  - `LoginRequest`: `email`, `password`.
  - `AuthResponse`: `userId`, `accessToken`, `refreshToken`, `expiresIn`, optional `user`.
  - `RefreshRequest`: `refreshToken`.

- **User profile (`UserProfile`)**
  - `id`, `email`, `username`, `displayName`.
  - Optional `avatarUrl`, `bio`, `latitude`, `longitude`, `location`.
  - `createdAt`, `languages: UserLanguage[]`, `roles: string[]`.
  - Counters: `followersCount`, `followingCount`, `postsCount`.

- **Languages and learning**
  - `UserLanguage`: `code`, `name`, `flagEmoji`, `proficiency`, `isLearning`.
  - `SavedWord`, `CreateWordRequest`, `UpdateWordRequest`:
    - Model words saved from posts or manually, including language info and spaced-repetition fields (`masteryLevel`, `nextReview`, etc.).
  - `StartSessionRequest`, `StartSessionResponse`, `SessionWord`, `SubmitResultRequest`, `SubmitResultResponse`, `SessionResult`, `CompleteSessionResponse`:
    - Power the learning session flows in `LearnPage` and related hooks.
  - `LanguageStats`, `MasteryDistribution`, `LearningStatsResponse`: aggregated stats for learning dashboards.

- **Posts & reactions (API level)**
  - `PostStatus`, `ReactionType`, `PostReactionSummary`, `PostReactionRequest`, `PostReactionResponse`.
  - `FeedResponse`: `posts: ApiPost[]`, `nextCursor?: string`, `hasMore`.
  - `PostTranslationResponse`: translation results for posts.
  - `ReactionResponse`: legacy reaction type used when bridging older endpoints.

- **Reports**
  - `ReportReason` union and `ReportRequest` for reporting posts/comments.

- **Friends & settings**
  - `FriendStatus`, `LocationVisibility`.
  - `FriendRequestResponse`: includes `id`, `status`, `isSentByMe`, and `otherUser` summary.
  - `NotificationPrefs`, `PrivacySettings`, `UserSettingsDTO`: user settings for notifications, privacy, and theme.

- **Generic and misc**
  - `Language` (simple code, name, flag triple).
  - `ApiError` standard error shape.
  - `PaginationParams` (`cursor`, `limit`).
  - `PostAuthor` alias of `AuthorDto`.

### 3.5 Navigation Types (`types/navigation.ts`)

- Encapsulates route names and navigation-related enums/constants so pages and navigation components can share a single source of truth for route identifiers and labels.

---

## 4. API Service Modules & Methods

All API modules live in `src/services/api/*` and consume the domain interfaces in `types/*`. They **transform** snake_case backend DTOs into camelCase frontend types and encapsulate auth headers and error handling.

### 4.1 Auth API (`services/api/auth.ts`)

- **Token management helpers**
  - `getStoredToken(): string | null`
  - `getStoredRefreshToken(): string | null`
  - `getStoredUser(): UserProfile | null`
  - `storeAuth(response: AuthResponse, user?: UserProfile): void`
  - `clearAuth(): void`

- **Internal refresh flow**
  - `performTokenRefresh(): Promise<string>`
    - Sends `POST /auth/refresh` with `refresh_token`.
    - Updates stored tokens.
  - `apiRequest<T>(endpoint, options, isRetry?): Promise<T>`
    - Adds `Authorization` header if a token is present.
    - On `401` once, triggers token refresh flow, then retries the request.
    - Clears auth and throws on refresh failure or unauthorized status.

- **Backend DTOs & transformation**
  - `BackendAuthResponse` and `BackendProfile` match backend responses.
  - `transformProfile(profile: BackendProfile): UserProfile`
    - Maps backend `languages` array and normalizes optional properties.

- **Exported `authApi` methods**
  - `register(data: RegisterRequest): Promise<AuthResponse>`
    - Calls `POST /auth/register` with snake_case body.
    - Stores tokens, then calls `/users/me` to fetch profile.
    - Returns a fully-populated `AuthResponse` including `user`.
  - `login(data: LoginRequest): Promise<AuthResponse>`
    - Similar to `register`, but hits `/auth/login`.
  - `refreshToken(): Promise<AuthResponse>`
    - Uses `performTokenRefresh`, re-hydrates user from `localStorage` and returns an `AuthResponse` with updated tokens.
  - `logout(): Promise<void>`
    - Clears all stored auth data.
  - `getProfile(): Promise<UserProfile>`
    - Calls `/users/me` and falls back to `/profiles/me` for legacy support.
    - Transforms through `transformProfile`.
  - `updateProfile(data: UpdateProfileRequest): Promise<UserProfile>`
    - Tries `PATCH /users/me` with the update body.
    - On failure (missing endpoint), falls back to local-only update of stored user.

### 4.2 Posts API (`services/api/posts.ts`)

- **Internal DTOs**
  - `BackendAuthor`, `BackendPost`, `BackendFeedResponse`, `BackendReactionResponse`.

- **Transform helpers**
  - `transformAuthor(author: BackendAuthor): AuthorDto`
  - `transformPost(post: BackendPost): ApiPost`
    - Normalizes reactions and validates `user_reaction` into a `ReactionType | null`.

- **Internal `apiRequest<T>`**
  - Similar pattern to auth: attaches auth token via `getStoredToken`, sets JSON headers, throws with a helpful error message on non-OK responses, and handles `204` with an empty object.

- **Exported `postsApi` methods**
  - `getFeed(params?: PaginationParams & { language?: string; latitude?: number; longitude?: number }): Promise<FeedResponse>`
    - Calls `GET /posts?page=&size=&language=&latitude=&longitude=`.
    - Logs request and response.
    - Transforms backend `BackendFeedResponse` into `FeedResponse` with `nextCursor` and `hasMore`.
  - `getPost(postId: string): Promise<ApiPost>`
    - `GET /posts/:id`, transforming into `ApiPost`.
  - `createPost(data: CreatePostRequest): Promise<ApiPost>`
    - `POST /posts` with snake_case body.
  - `updatePost(postId: string, data: Partial<CreatePostRequest>): Promise<ApiPost>`
    - `PATCH /posts/:id` with partial fields translated to snake_case.
  - `deletePost(postId: string): Promise<void>`
    - `DELETE /posts/:id`.
  - `likePost(postId: string): Promise<ReactionResponse>`
    - `POST /posts/:id/reactions` with `{ reaction: 'LIKE' }`.
  - `unlikePost(postId: string): Promise<ReactionResponse>`
    - `DELETE /posts/:id/reactions`.
  - `getTranslation(postId: string, targetLanguage: string): Promise<PostTranslationResponse>`
    - `GET /posts/:id/translations?target_language=...` and maps `language_code` / `translated_content`.
  - `reportPost(postId: string, reason: ReportReason, details?: string): Promise<void>`
    - `POST /posts/:id/reports`.

### 4.3 Meetups API (`services/api/meetups.ts`)

- **Backend types**
  - `BackendLanguage`, `BackendOrganizer`, `BackendMeetup`, `BackendMeetupsResponse`, `BackendAttendee`, `BackendAttendeesResponse`.

- **Transform helpers**
  - `transformMeetup(m: BackendMeetup): Meetup`
  - `transformAttendee(a: BackendAttendee): MeetupAttendee`

- **Internal `apiRequest<T>`**
  - Same pattern: attaches auth header (`getStoredToken`), adds JSON headers, throws on errors.

- **Params interface**
  - `GetMeetupsParams` with optional `latitude`, `longitude`, `radiusKm`, `language`, `page`, `size`.

- **Exported `meetupsApi` methods**
  - `getMeetups(params?: GetMeetupsParams): Promise<MeetupsListResponse>`
    - Builds query string from params and requests `/meetups`.
    - Logs request and transforms list into `MeetupsListResponse`.
  - `getMeetup(id: string): Promise<Meetup>`
    - `GET /meetups/:id`.
  - `joinMeetup(id: string): Promise<Meetup>`
    - `POST /meetups/:id/join`.
  - `leaveMeetup(id: string): Promise<Meetup>`
    - `POST /meetups/:id/leave`.
  - `createMeetup(data: CreateMeetupRequest): Promise<Meetup>`
    - `POST /meetups` with snake_case fields.
  - `updateMeetup(id: string, data: UpdateMeetupRequest): Promise<Meetup>`
    - `PUT /meetups/:id` with snake_case fields.
  - `deleteMeetup(id: string): Promise<void>`
    - `DELETE /meetups/:id`.
  - `getAttendees(id: string): Promise<MeetupAttendee[]>`
    - `GET /meetups/:id/attendees`.

> There are additional API modules for comments, messages, friends, users, languages, learners, learn, and places that follow the same pattern: they define backend DTOs, transform them into frontend `types/*` interfaces, and expose typed methods to the rest of the app.

---

## 5. Pages, Components, and Data Flow

### 5.1 Routing & layout connections

- `App.tsx` defines route → page component mapping.
- `AppLayout` wraps all **protected** pages and provides shared UI (header, sidebar, bottom nav) via React Router's `<Outlet />`.
- Each page component (e.g. `FeedPage`, `ExplorePage`, `MessagesPage`, `LearnPage`, `ProfilePage`, `FriendsPage`, etc.) composes:
  - Domain-specific UI components from `components/*`.
  - Hooks and API services from `hooks/*` and `services/api/*`.
  - Route information from `react-router-dom` (e.g. route params, navigation).

### 5.2 Example: Feed Flow

1. **`FeedPage`**
   - Uses React Query to call `postsApi.getFeed(...)`.
   - Receives a `FeedResponse` with `ApiPost[]`.
2. **Transformation (if needed)**
   - `ApiPost` can be adapted into the simpler UI `Post` type (e.g. mapping `author` and `createdAt` into `author` and `time` fields used by `PostCard`).
3. **`PostCard`**
   - Renders a single post, powered by the `Post` or `ApiPost`-derived shape.
   - Invokes `postsApi.likePost` / `unlikePost` to toggle likes.
   - Might expose callbacks for opening comments or saving words.

### 5.3 Example: Meetups / Explore Flow

1. **`ExplorePage`**
   - Uses React Query or custom hooks to call `meetupsApi.getMeetups(...)` with parameters from the map (location, radius, language).
   - Receives `MeetupsListResponse`.
2. **Map & details**
   - `ExploreMap` shows markers based on `Meetup.coordinates`.
   - `MeetupCard` & `MeetupDetailSheet` display details using `Meetup` fields (title, language, attendees, status).
   - `CreateMeetupModal` calls `meetupsApi.createMeetup(...)` with a `CreateMeetupRequest` built from the form.

### 5.4 Example: Auth Flow

1. **Auth pages (`AuthPage`, `ProfilePage`, etc.)**
   - Use the `useAuth()` hook to access:
     - `user`
     - `login`, `register`, `logout`, `updateProfile`
2. **Behind the scenes**
   - `login` / `register` call `authApi.login` / `authApi.register`.
   - Tokens and user profile are persisted to local storage via `storeAuth`.
   - `AuthContext` updates its `user` state, which turns `isAuthenticated` to `true`.
3. **Route protection**
   - `ProtectedRoute` detects `isAuthenticated` and either:
     - Lets the user into the main app (`AppLayout` and nested pages).
     - Or redirects to `/auth`.

### 5.5 Example: Messages Flow

1. **`MessagesPage`**
   - Uses services in `services/api/messages.ts` (not fully detailed here) to fetch a list of `Conversation`s and their `lastMessage`s.
2. **`ConversationList`**
   - Renders each `Conversation` using `participants`, `unreadCount`, `updatedAt`.
3. **`ChatWindow`**
   - Given a selected `Conversation`, fetches `Message[]`.
   - Uses `CreateMessageRequest` and the messages API to send new messages.

---

## 6. Utility & UI Layer

- **UI primitives (`components/ui/*`)**
  - `button.tsx`, `input.tsx`, `dropdown-menu.tsx`, `sheet.tsx`, `avatar.tsx`, `PullToRefresh.tsx`:
    - Typed, Tailwind-based components wrapping Radix UI primitives where appropriate.
    - Provide a consistent design system for the rest of the app.

- **Utilities (`lib/utils.ts`)**
  - Contains helpers such as:
    - Class name merging (e.g. `cn`).
    - Any formatting utilities shared across components.

---

## 7. How It All Connects (Summary)

- **Types (`src/types/*`)** define the **shape of data** used across the app, both for UI components and for backend integration.
- **API services (`src/services/api/*`)**:
  - Consume backend JSON over HTTP.
  - Translate snake_case DTOs into typed camelCase interfaces.
  - Encapsulate auth headers, error handling, and data transformation.
- **Context (`AuthContext`)** exposes high-level auth methods and session state to all components, backed by `authApi`.
- **Pages and components** (`src/pages/*`, `src/components/*`) use **React Query** and **API services** to fetch and mutate data, while relying on **types** to ensure type safety and predictable props.
- **Routing and layout** (in `App.tsx` and `AppLayout.tsx`) glue together navigation, shared chrome, and protected routes so the rest of the app can focus on domain logic and UI.



