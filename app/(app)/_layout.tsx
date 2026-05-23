import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack, router, usePathname } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { useUsageStore } from '@/store/usageStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useSyncWardrobe } from '@/hooks/useWardrobe';
import { SidebarProvider, useSidebar } from '@/context/SidebarContext';
import { Sidebar } from '@/components/navigation/Sidebar';
import { colors } from '@/theme/colors';

function AppLayoutInner() {
  const { user, isDemo, isLoading } = useAuthStore();
  const { isOpen, close } = useSidebar();
  const pathname = usePathname();
  const loadUsage        = useUsageStore((s) => s.loadUsage);
  const resetIfNewMonth  = useUsageStore((s) => s.resetIfNewMonth);
  const loadKeys = useSettingsStore((s) => s.loadKeys);

  // Always reload keys from SecureStore/AsyncStorage on app start
  useEffect(() => {
    loadKeys();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally run once — loadKeys is stable

  useEffect(() => {
    loadUsage().then(() => resetIfNewMonth());
  }, [loadUsage, resetIfNewMonth]);

  // Sync wardrobe from Supabase once settings are loaded
  useSyncWardrobe();

  useEffect(() => {
    if (!isLoading && !user && !isDemo) {
      router.replace('/(auth)/welcome');
    }
  }, [user, isDemo, isLoading]);

  if (!user && !isDemo) return null;

  return (
    <View style={styles.container}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'slide_from_right',
        }}
      />
      <Sidebar
        isOpen={isOpen}
        onClose={close}
        activeRoute={pathname}
      />
    </View>
  );
}

export default function AppLayout() {
  return (
    <SidebarProvider>
      <AppLayoutInner />
    </SidebarProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
