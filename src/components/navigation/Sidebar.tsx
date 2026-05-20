import React, { useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  SafeAreaView,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { colors } from '@/theme/colors';
import { fontSizes, fontWeights, fonts } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import { useAuthStore } from '@/store/authStore';
import { useHouseholdStore } from '@/store/householdStore';
import { Avatar } from '@/components/ui/Avatar';
import { MemberCard } from '@/components/household/MemberCard';
import { useTranslation } from '@/hooks/useTranslation';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SIDEBAR_WIDTH = Math.min(SCREEN_WIDTH * 0.78, 320);
const DRAG_THRESHOLD = 50;

type NavRoute = '/(app)/home' | '/(app)/wardrobe' | '/(app)/outfits' | '/(app)/trips' | '/(app)/shopping';

interface NavItem {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconActive: keyof typeof Ionicons.glyphMap;
  route: NavRoute;
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeRoute?: string;
}

export function Sidebar({ isOpen, onClose, activeRoute }: SidebarProps) {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { members, activeMemberId, setActiveMember } = useHouseholdStore();

  const translateX = useSharedValue(-SIDEBAR_WIDTH);
  const overlayOpacity = useSharedValue(0);

  const open = useCallback(() => {
    translateX.value = withSpring(0, { damping: 20, stiffness: 180 });
    overlayOpacity.value = withTiming(1, { duration: 250 });
  }, [translateX, overlayOpacity]);

  const close = useCallback(() => {
    translateX.value = withSpring(-SIDEBAR_WIDTH, { damping: 20, stiffness: 180 });
    overlayOpacity.value = withTiming(0, { duration: 200 }, () => {
      runOnJS(onClose)();
    });
  }, [translateX, overlayOpacity, onClose]);

  useEffect(() => {
    if (isOpen) {
      open();
    } else {
      translateX.value = withSpring(-SIDEBAR_WIDTH, { damping: 20, stiffness: 180 });
      overlayOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [isOpen, open, translateX, overlayOpacity]);

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationX < 0) {
        translateX.value = Math.max(e.translationX, -SIDEBAR_WIDTH);
        overlayOpacity.value = 1 + e.translationX / SIDEBAR_WIDTH;
      }
    })
    .onEnd((e) => {
      if (e.translationX < -DRAG_THRESHOLD || e.velocityX < -500) {
        runOnJS(close)();
      } else {
        translateX.value = withSpring(0, { damping: 20, stiffness: 180 });
        overlayOpacity.value = withTiming(1, { duration: 200 });
      }
    });

  const sidebarStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
    pointerEvents: overlayOpacity.value > 0 ? 'auto' : 'none',
  }));

  const navItems: NavItem[] = [
    {
      label: t('home.quickActions.scan').replace('Scan', 'Home'),
      icon: 'home-outline',
      iconActive: 'home',
      route: '/(app)/home',
    },
    {
      label: t('wardrobe.title'),
      icon: 'shirt-outline',
      iconActive: 'shirt',
      route: '/(app)/wardrobe',
    },
    {
      label: t('outfits.title'),
      icon: 'albums-outline',
      iconActive: 'albums',
      route: '/(app)/outfits',
    },
    {
      label: t('trip.title'),
      icon: 'airplane-outline',
      iconActive: 'airplane',
      route: '/(app)/trips',
    },
    {
      label: t('shopping.title'),
      icon: 'bag-outline',
      iconActive: 'bag',
      route: '/(app)/shopping',
    },
  ];

  const handleNavPress = useCallback(
    (route: NavRoute) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      close();
      setTimeout(() => router.push(route), 300);
    },
    [close],
  );

  const handleLogout = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    close();
    await logout();
    setTimeout(() => router.replace('/(auth)/welcome'), 400);
  }, [close, logout]);

  if (!isOpen) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[styles.overlay, overlayStyle]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={close} />
      </Animated.View>
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.sidebar, sidebarStyle]}>
          <SafeAreaView style={styles.safeArea}>
            {/* User section */}
            <View style={styles.userSection}>
              <Avatar
                name={user?.name}
                imageUrl={user?.avatarUrl}
                size={52}
              />
              <View style={styles.userInfo}>
                <Text style={styles.userName} numberOfLines={1}>
                  {user?.name ?? ''}
                </Text>
                <Text style={styles.userEmail} numberOfLines={1}>
                  {user?.email ?? ''}
                </Text>
              </View>
            </View>

            {/* Navigation */}
            <View style={styles.nav}>
              {navItems.map((item) => {
                const isActive = activeRoute?.includes(item.route.replace('/(app)/', ''));
                return (
                  <TouchableOpacity
                    key={item.route}
                    style={[styles.navItem, isActive && styles.navItemActive]}
                    onPress={() => handleNavPress(item.route)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={isActive ? item.iconActive : item.icon}
                      size={22}
                      color={isActive ? colors.accent : colors.textSecondary}
                    />
                    <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Household members */}
            {members.length > 1 && (
              <View style={styles.householdSection}>
                <Text style={styles.sectionTitle}>{t('household.members')}</Text>
                {members.map((member) => (
                  <TouchableOpacity
                    key={member.userId}
                    style={[
                      styles.memberRow,
                      activeMemberId === member.userId && styles.memberRowActive,
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setActiveMember(
                        activeMemberId === member.userId ? null : member.userId,
                      );
                    }}
                    activeOpacity={0.7}
                  >
                    <Avatar name={member.name} imageUrl={member.avatarUrl} size={32} />
                    <Text style={styles.memberName} numberOfLines={1}>
                      {member.name}
                    </Text>
                    {activeMemberId === member.userId && (
                      <Ionicons name="checkmark" size={16} color={colors.accent} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Bottom actions */}
            <View style={styles.bottomActions}>
              <TouchableOpacity
                style={styles.settingsRow}
                onPress={() => {
                  close();
                  setTimeout(() => router.push('/(app)/profile/settings'), 300);
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="settings-outline" size={20} color={colors.textSecondary} />
                <Text style={styles.settingsLabel}>{t('profile.settings')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.logoutRow}
                onPress={handleLogout}
                activeOpacity={0.7}
              >
                <Ionicons name="log-out-outline" size={20} color={colors.status.error} />
                <Text style={styles.logoutLabel}>{t('profile.logout')}</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
  },
  sidebar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
    backgroundColor: colors.surface,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 4, height: 0 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  safeArea: {
    flex: 1,
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.xl,
    paddingBottom: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontFamily: fonts.serif.bold,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
  },
  userEmail: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  nav: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: 13,
    gap: spacing.md,
    borderRadius: 12,
    marginHorizontal: spacing.sm,
  },
  navItemActive: {
    backgroundColor: colors.surfaceAlt,
  },
  navLabel: {
    fontSize: fontSizes.base,
    color: colors.textSecondary,
    fontWeight: fontWeights.regular,
  },
  navLabelActive: {
    color: colors.textPrimary,
    fontWeight: fontWeights.semibold,
  },
  householdSection: {
    paddingTop: spacing.base,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionTitle: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: spacing.base,
    marginBottom: spacing.sm,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    borderRadius: 10,
    marginHorizontal: spacing.sm,
  },
  memberRowActive: {
    backgroundColor: colors.surfaceAlt,
  },
  memberName: {
    flex: 1,
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
    fontWeight: fontWeights.medium,
  },
  bottomActions: {
    marginTop: 'auto',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    paddingBottom: spacing.base,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  settingsLabel: {
    fontSize: fontSizes.base,
    color: colors.textSecondary,
  },
  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  logoutLabel: {
    fontSize: fontSizes.base,
    color: colors.status.error,
  },
});
