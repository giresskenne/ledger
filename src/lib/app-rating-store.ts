/**
 * App Rating Store - Tracks app usage to prompt users for ratings at appropriate times
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AppRatingState {
  // Usage metrics
  assetsAdded: number;
  appOpens: number;
  daysUsed: number;
  lastUsedDate: string | null;
  
  // Rating prompt state
  hasRated: boolean;
  ratingPromptShown: number; // How many times we've shown the prompt
  lastPromptDate: string | null;
  neverAskAgain: boolean;
  
  // Actions
  incrementAssetsAdded: () => void;
  incrementAppOpens: () => void;
  markDayUsed: () => void;
  shouldShowRatingPrompt: () => boolean;
  markPromptShown: () => void;
  markAsRated: () => void;
  markNeverAskAgain: () => void;
  resetRatingState: () => void;
}

export const useAppRatingStore = create<AppRatingState>()(
  persist(
    (set, get) => ({
      // Initial state
      assetsAdded: 0,
      appOpens: 0,
      daysUsed: 0,
      lastUsedDate: null,
      hasRated: false,
      ratingPromptShown: 0,
      lastPromptDate: null,
      neverAskAgain: false,

      incrementAssetsAdded: () => {
        set((state) => ({ assetsAdded: state.assetsAdded + 1 }));
      },

      incrementAppOpens: () => {
        set((state) => ({ appOpens: state.appOpens + 1 }));
      },

      markDayUsed: () => {
        const today = new Date().toISOString().split('T')[0];
        const state = get();
        
        if (state.lastUsedDate !== today) {
          set({
            daysUsed: state.daysUsed + 1,
            lastUsedDate: today,
          });
        }
      },

      shouldShowRatingPrompt: () => {
        const state = get();
        
        // Never show if user has rated or said never ask again
        if (state.hasRated || state.neverAskAgain) {
          return false;
        }

        // Don't show more than 3 times total
        if (state.ratingPromptShown >= 3) {
          return false;
        }

        // Wait at least 7 days between prompts
        if (state.lastPromptDate) {
          const daysSinceLastPrompt = Math.floor(
            (Date.now() - new Date(state.lastPromptDate).getTime()) / (1000 * 60 * 60 * 24)
          );
          if (daysSinceLastPrompt < 7) {
            return false;
          }
        }

        // Trigger conditions (any of these):
        // 1. Added 5+ assets
        // 2. Used app for 7+ days
        // 3. Opened app 15+ times
        const hasEnoughUsage = 
          state.assetsAdded >= 5 ||
          state.daysUsed >= 7 ||
          state.appOpens >= 15;

        return hasEnoughUsage;
      },

      markPromptShown: () => {
        set((state) => ({
          ratingPromptShown: state.ratingPromptShown + 1,
          lastPromptDate: new Date().toISOString(),
        }));
      },

      markAsRated: () => {
        set({ hasRated: true });
      },

      markNeverAskAgain: () => {
        set({ neverAskAgain: true });
      },

      resetRatingState: () => {
        set({
          assetsAdded: 0,
          appOpens: 0,
          daysUsed: 0,
          lastUsedDate: null,
          hasRated: false,
          ratingPromptShown: 0,
          lastPromptDate: null,
          neverAskAgain: false,
        });
      },
    }),
    {
      name: 'ledger-app-rating-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
