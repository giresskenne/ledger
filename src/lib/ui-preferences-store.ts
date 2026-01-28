import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface UIPreferencesState {
  hidePerformanceMetrics: boolean;
  setHidePerformanceMetrics: (value: boolean) => void;
}

export const useUIPreferencesStore = create<UIPreferencesState>()(
  persist(
    (set) => ({
      hidePerformanceMetrics: false,
      setHidePerformanceMetrics: (value) => set({ hidePerformanceMetrics: value }),
    }),
    {
      name: 'ledger-ui-preferences',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

