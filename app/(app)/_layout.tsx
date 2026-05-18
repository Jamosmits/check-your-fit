import { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack, router, usePathname } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { Sidebar } from '@/components/navigation/Sidebar';
import { colors } from '@/theme/colors';

export default function AppLayout() {
  const { user, isLoading } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/(auth)/welcome');
    }
  }, [user, isLoading]);

  const handleCloseSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  if (!user) return null;

  return (
    <View style={styles.container}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="home" />
        <Stack.Screen name="wardrobe" />
        <Stack.Screen name="outfits" />
        <Stack.Screen name="trips" />
        <Stack.Screen name="shopping" />
        <Stack.Screen name="scan" />
        <Stack.Screen name="profile" />
      </Stack>
      <Sidebar
        isOpen={sidebarOpen}
        onClose={handleCloseSidebar}
        activeRoute={pathname}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
