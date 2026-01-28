import React from 'react';
import { AppState, Modal, Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Haptics from 'expo-haptics';
import { Lock, Fingerprint, ShieldCheck } from 'lucide-react-native';
import * as Burnt from 'burnt';
import { useBiometricsStore } from '@/lib/biometrics-store';
import { cn } from '@/lib/cn';

const LOCK_AFTER_MS = 30_000;

function getBiometricLabel(types: LocalAuthentication.AuthenticationType[] | null): string {
  if (!types || types.length === 0) return 'Biometrics';
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) return 'Face ID';
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) return 'Touch ID';
  return 'Biometrics';
}

export function BiometricGate({ children }: { children: React.ReactNode }) {
  const enabled = useBiometricsStore((s) => s.enabled);
  const setEnabled = useBiometricsStore((s) => s.setEnabled);

  const lastBackgroundAtRef = React.useRef<number | null>(null);
  const authInFlightRef = React.useRef(false);

  const [locked, setLocked] = React.useState(false);
  const [isAuthenticating, setIsAuthenticating] = React.useState(false);
  const [biometricLabel, setBiometricLabel] = React.useState('Biometrics');

  const updateBiometricLabel = React.useCallback(async () => {
    try {
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      setBiometricLabel(getBiometricLabel(types));
    } catch {
      setBiometricLabel('Biometrics');
    }
  }, []);

  const ensureAvailableOrDisable = React.useCallback(async (): Promise<boolean> => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !isEnrolled) {
        setEnabled(false);
        Burnt.toast({
          title: 'Biometrics unavailable',
          message: 'Set up Face ID / Touch ID in iOS Settings to enable biometric login.',
          preset: 'none',
          haptic: 'none',
          from: 'top',
        });
        setLocked(false);
        return false;
      }
      return true;
    } catch {
      // If we can’t determine, don’t lock the user out.
      setEnabled(false);
      setLocked(false);
      return false;
    }
  }, [setEnabled]);

  const attemptAuth = React.useCallback(async () => {
    if (!enabled) {
      setLocked(false);
      return;
    }
    if (authInFlightRef.current) return;
    authInFlightRef.current = true;
    setIsAuthenticating(true);

    try {
      const ok = await ensureAvailableOrDisable();
      if (!ok) return;

      await updateBiometricLabel();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: `Unlock Ledger with ${biometricLabel}`,
        cancelLabel: 'Cancel',
        disableDeviceFallback: false, // allow passcode fallback
      });

      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setLocked(false);
      } else {
        // Keep locked; user can retry.
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setLocked(true);
      }
    } finally {
      setIsAuthenticating(false);
      authInFlightRef.current = false;
    }
  }, [biometricLabel, enabled, ensureAvailableOrDisable, updateBiometricLabel]);

  React.useEffect(() => {
    if (!enabled) {
      setLocked(false);
      return;
    }
    void updateBiometricLabel();
  }, [enabled, updateBiometricLabel]);

  React.useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (!enabled) return;

      if (nextState === 'active') {
        const last = lastBackgroundAtRef.current;
        lastBackgroundAtRef.current = null;
        if (last === null) return;

        const elapsed = Date.now() - last;
        if (elapsed >= LOCK_AFTER_MS) {
          setLocked(true);
        }
        return;
      }

      // background or inactive
      lastBackgroundAtRef.current = Date.now();
    });

    return () => sub.remove();
  }, [enabled]);

  React.useEffect(() => {
    if (!locked) return;
    void attemptAuth();
  }, [attemptAuth, locked]);

  return (
    <>
      {children}
      <Modal visible={locked} transparent animationType="fade" onRequestClose={() => {}}>
        <View className="flex-1 bg-black/80">
          <LinearGradient
            colors={['#1a1a2e', '#0A0A0F']}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />
          <View className="flex-1 px-6 items-center justify-center">
            <View className="w-20 h-20 rounded-3xl overflow-hidden mb-6">
              <LinearGradient
                colors={['#6366F1', '#8B5CF6']}
                style={{ width: 80, height: 80, alignItems: 'center', justifyContent: 'center' }}
              >
                <ShieldCheck size={36} color="white" />
              </LinearGradient>
            </View>

            <Text className="text-white text-2xl font-bold text-center">Locked</Text>
            <Text className="text-gray-400 text-center mt-2 px-6 leading-6">
              Unlock Ledger with {biometricLabel} to continue.
            </Text>

            <View className="mt-8 w-full">
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  void attemptAuth();
                }}
                disabled={isAuthenticating}
                className={cn(
                  'bg-indigo-600 rounded-2xl py-4 items-center justify-center flex-row',
                  isAuthenticating && 'opacity-70'
                )}
              >
                <Fingerprint size={18} color="white" />
                <Text className="text-white font-bold ml-2">
                  {isAuthenticating ? 'Checking…' : `Unlock with ${biometricLabel}`}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setEnabled(false);
                  setLocked(false);
                }}
                className="mt-3 py-3 items-center justify-center flex-row"
              >
                <Lock size={16} color="#9CA3AF" />
                <Text className="text-gray-400 ml-2">Disable biometric lock</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

