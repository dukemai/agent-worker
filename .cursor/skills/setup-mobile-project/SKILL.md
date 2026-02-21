---
name: setup-mobile-project
description: Scaffolds a new mobile app project with React Native (Expo), Supabase, and TypeScript. Use when creating a new mobile app or adding a mobile companion to an existing web project.
---

# Mobile Project Setup

Standard setup for mobile projects using React Native with Expo. Follow this skill when scaffolding a new mobile app from scratch.

## Stack

| Layer | Tool | Notes |
|-------|------|-------|
| Framework | React Native (Expo) | Managed workflow, latest SDK |
| Language | TypeScript | Strict mode enabled |
| Navigation | Expo Router | File-based routing (like Next.js App Router) |
| Styling | NativeWind (Tailwind for RN) | Reuse Tailwind knowledge from web projects |
| Data fetching | TanStack Query | Same patterns as web projects |
| Database | Supabase | Shared backend with web projects when applicable |
| Auth | Supabase Auth | Uses `@supabase/supabase-js` with secure storage |
| Deployment | Expo EAS | Build and submit to App Store / Google Play |

## Scaffold Steps

### 1. Create the Expo app

```bash
npx create-expo-app@latest <app-name> --template tabs
cd <app-name>
```

### 2. Install core dependencies

```bash
npx expo install expo-router expo-secure-store
npm install @supabase/supabase-js @tanstack/react-query
npm install nativewind tailwindcss
npm install react-native-url-polyfill
```

### 3. Project structure

```
<app-name>/
├── app/                         # Expo Router file-based routes
│   ├── _layout.tsx              # Root layout (providers, auth gate)
│   ├── (tabs)/                  # Tab navigator group
│   │   ├── _layout.tsx          # Tab bar configuration
│   │   ├── index.tsx            # Home / main screen
│   │   └── settings.tsx         # Settings screen
│   ├── login.tsx                # Auth screen
│   └── +not-found.tsx           # 404 fallback
├── components/
│   ├── providers/
│   │   ├── query-provider.tsx   # TanStack QueryClientProvider
│   │   └── auth-provider.tsx    # Supabase auth context
│   └── <feature>/              # Feature-specific components
├── lib/
│   ├── supabase.ts              # Supabase client (with SecureStore adapter)
│   ├── api.ts                   # Shared API/fetch helpers
│   └── utils.ts                 # General utilities
├── types/
│   └── database.ts              # Shared types (can symlink from web project)
├── constants/
│   └── config.ts                # App-wide constants (API URLs, feature flags)
├── assets/                      # Images, fonts, icons
├── .env                         # EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY
└── .env.example                 # Template for required env vars
```

### 4. Configure TypeScript strict mode

Ensure `tsconfig.json` includes:

```json
{
  "compilerOptions": {
    "strict": true
  }
}
```

### 5. Set up Supabase with secure storage

Create `lib/supabase.ts`:

```typescript
import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";

const secureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: secureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
```

### 6. Set up TanStack Query provider

Same pattern as web projects:
- Client-side `QueryClientProvider` wrapping the app in `_layout.tsx`
- Default `staleTime: 30s`, `refetchOnWindowFocus: false`

### 7. Set up auth provider

Create `components/providers/auth-provider.tsx`:
- Listen to `supabase.auth.onAuthStateChange`
- Expose `session` and `user` via React context
- Gate protected routes in root `_layout.tsx` (redirect to `/login` when unauthenticated)

### 8. Create .env.example

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 9. Set up docs structure

Follow the [organize-documents](../.cursor/skills/organize-documents/SKILL.md) skill:
- Create `docs/SPEC.md`, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`, `docs/DECISIONS.md`
- Replace boilerplate README with project-specific content
- Create `docs/phases/01-<first-phase>/SCOPE.md`

## Conventions

### Navigation

- Use Expo Router file-based routing for all screens
- Group related screens in route groups: `(tabs)/`, `(auth)/`, `(settings)/`
- Use `_layout.tsx` files for navigation structure (tabs, stacks, drawers)

### Data fetching

- Same TanStack Query patterns as web projects (`useQuery`, `useMutation`, `invalidateQueries`)
- Define `queryFn` as standalone async functions outside components
- Share types with web project when using the same Supabase backend

### Styling

- Use NativeWind classes that mirror Tailwind CSS (reuse muscle memory from web)
- Design for smallest supported device first (iPhone SE: 375px)
- Touch targets: minimum 44x44 points (follow Apple/Google HIG)
- Test on both iOS and Android simulators

### Sharing code with web projects

When a mobile app is a companion to an existing web project:

| What to share | How |
|---------------|-----|
| TypeScript types (`types/database.ts`) | Copy or symlink from web project |
| API response shapes | Keep identical between web API routes and mobile fetch calls |
| TanStack Query keys | Use same key conventions so patterns transfer |
| Business logic (pure functions) | Extract to a shared `packages/` directory if both apps are in a monorepo |

Do NOT share:
- UI components (React DOM vs React Native are different)
- Auth setup (cookie-based web vs SecureStore mobile)
- Navigation (Next.js App Router vs Expo Router)

### Auth

- Store tokens in `expo-secure-store` (never AsyncStorage for auth tokens)
- Use Supabase `onAuthStateChange` listener, not manual token checks
- Handle deep links for magic links / OAuth redirects via Expo Linking

## Pre-flight Checklist

Before first build, verify:

- [ ] `npx expo start` launches without errors
- [ ] `npx tsc --noEmit` passes
- [ ] App loads on iOS simulator and Android emulator
- [ ] Login flow works (sign up, sign in, sign out)
- [ ] `.env.example` documents all required variables
- [ ] README has project-specific quick start (not boilerplate)
- [ ] Supabase RLS policies cover mobile client access patterns
