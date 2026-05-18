import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  interpolateColor,
} from 'react-native-reanimated';
import { colors } from '@/theme/colors';
import { fontSizes, fontWeights } from '@/theme/typography';
import { spacing } from '@/theme/spacing';

interface InputProps extends Omit<TextInputProps, 'style'> {
  label: string;
  error?: string;
  containerStyle?: ViewStyle;
  rightElement?: React.ReactNode;
}

export function Input({
  label,
  error,
  containerStyle,
  rightElement,
  value,
  onChangeText,
  onFocus,
  onBlur,
  ...rest
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const focusAnim = useSharedValue(0);
  const labelAnim = useSharedValue(value ? 1 : 0);

  const handleFocus = useCallback(
    (e: Parameters<NonNullable<TextInputProps['onFocus']>>[0]) => {
      setIsFocused(true);
      focusAnim.value = withTiming(1, { duration: 200 });
      labelAnim.value = withTiming(1, { duration: 200 });
      onFocus?.(e);
    },
    [focusAnim, labelAnim, onFocus],
  );

  const handleBlur = useCallback(
    (e: Parameters<NonNullable<TextInputProps['onBlur']>>[0]) => {
      setIsFocused(false);
      focusAnim.value = withTiming(0, { duration: 200 });
      if (!value) {
        labelAnim.value = withTiming(0, { duration: 200 });
      }
      onBlur?.(e);
    },
    [focusAnim, labelAnim, onBlur, value],
  );

  const borderStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      focusAnim.value,
      [0, 1],
      [error ? colors.status.error : colors.border, error ? colors.status.error : colors.accent],
    ),
    borderWidth: interpolate(focusAnim.value, [0, 1], [1, 1.5]),
  }));

  const labelStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(labelAnim.value, [0, 1], [0, -22]),
      },
      {
        scale: interpolate(labelAnim.value, [0, 1], [1, 0.82]),
      },
    ],
    color: interpolateColor(
      focusAnim.value,
      [0, 1],
      [colors.textMuted, error ? colors.status.error : colors.accent],
    ),
  }));

  return (
    <View style={[styles.container, containerStyle]}>
      <Animated.View style={[styles.inputWrapper, borderStyle]}>
        <Animated.Text style={[styles.label, labelStyle]} pointerEvents="none">
          {label}
        </Animated.Text>
        <View style={styles.row}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={value}
            onChangeText={onChangeText}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholderTextColor={colors.textMuted}
            selectionColor={colors.accent}
            {...rest}
          />
          {rightElement && (
            <TouchableOpacity style={styles.rightElement}>{rightElement}</TouchableOpacity>
          )}
        </View>
      </Animated.View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.base,
  },
  inputWrapper: {
    borderRadius: 12,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    position: 'relative',
  },
  label: {
    position: 'absolute',
    left: spacing.base,
    top: spacing.base,
    fontSize: fontSizes.base,
    transformOrigin: 'left center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontSize: fontSizes.base,
    color: colors.textPrimary,
    fontWeight: fontWeights.regular,
    padding: 0,
    margin: 0,
  },
  rightElement: {
    marginLeft: spacing.sm,
  },
  error: {
    marginTop: spacing.xs,
    marginLeft: spacing.xs,
    fontSize: fontSizes.xs,
    color: colors.status.error,
  },
});
