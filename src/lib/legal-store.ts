import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface LegalState {
  hasAcceptedDisclaimer: boolean;
  acceptedDisclaimerAt: string | null;

  acceptDisclaimer: () => void;
  resetDisclaimer: () => void;
}

export const useLegalStore = create<LegalState>()(
  persist(
    (set) => ({
      hasAcceptedDisclaimer: false,
      acceptedDisclaimerAt: null,

      acceptDisclaimer: () =>
        set({
          hasAcceptedDisclaimer: true,
          acceptedDisclaimerAt: new Date().toISOString(),
        }),

      resetDisclaimer: () =>
        set({
          hasAcceptedDisclaimer: false,
          acceptedDisclaimerAt: null,
        }),
    }),
    {
      name: 'ledger-legal',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

