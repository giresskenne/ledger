# Ledger — Agent Instructions (OpenAI)

This repo is an Expo + React Native app named **Ledger**. Use these notes as the “house rules” when making changes.

## How We Build (User-Driven)

- Default to **building what the user decides**. If requirements are unclear, ask 1–3 targeted questions, then implement the smallest useful slice end-to-end.
- Prefer root-cause fixes over cosmetic patches.
- Keep changes scoped to the request; don’t refactor unrelated code.

## Stack

- Expo SDK 53 + Expo Router (file-based routing)
- React Native (see `package.json` for exact version)
- React Query for server/async state
- NativeWind + Tailwind v3 for styling
- `react-native-reanimated` + `react-native-gesture-handler` for animations/gestures
- Icons via `lucide-react-native`

## Tooling

- Preferred package manager: **bun** (see `bun.lock`)
- Useful scripts (see `package.json`):
  - `bun start`
  - `bun run lint`
  - `bun run typecheck`

## Project Structure

- `src/app/` — Expo Router routes
  - `src/app/_layout.tsx` is the root layout (don’t delete/refactor the `RootLayoutNav` component)
- `src/components/` — reusable UI components
- `src/lib/` — utilities and state (stores, formatters, API clients)

## Routing Rules (Expo Router)

- One route maps to `/` (don’t create competing index routes).
- Customize headers via `<Stack.Screen options={{ title, ... }} />` inside pages.
- Modals/overlays should be routes in `src/app/` and registered in `src/app/_layout.tsx` with `presentation: "modal"` when appropriate.

## State Rules

- Use React Query with the object API: `useQuery({ queryKey, queryFn })`.
- Use `useMutation` for async operations (avoid manual `setIsLoading` patterns).
- Use Zustand for local state; prefer selectors (`useStore(s => s.slice)`) to avoid re-renders.
- Persist only what’s necessary; keep ephemeral and persisted state separate.

## TypeScript Rules

- Codebase assumes strict TypeScript; don’t “any” around errors.
- Use explicit generic annotations where inference would become `any` (e.g., `useState<Type[]>([])`).
- Handle null/undefined with `?.` and `??`.

## UI / Styling Rules

- Use NativeWind classNames where supported.
- `CameraView`, `LinearGradient`, and animated components may not support `className`; use `style`.
- Prefer `Pressable` over `TouchableOpacity`.
- Avoid `Alert.alert()`; use custom modals/sheets.

## Safe Area Rules

- Use `react-native-safe-area-context` (`useSafeAreaInsets`, `SafeAreaView`) when you’re not using native navigation headers.

## Repo-Specific Notes

- Some files may be treated as “managed” in certain hosting environments. If you hit a restriction (e.g., config files being locked), prefer adding non-destructive overrides (like `app.config.js`) rather than forcing edits.

