import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface BiometricsState {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
}

export const useBiometricsStore = create<BiometricsState>()(
  persist(
    (set) => ({
      enabled: false,
      setEnabled: (enabled) => set({ enabled }),
    }),
    {
      name: 'ledger-biometrics',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ enabled: state.enabled }),
    }
  )
);

