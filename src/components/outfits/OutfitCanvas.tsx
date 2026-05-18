import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '@/theme/colors';
import { fontSizes, fontWeights } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import { ClothingItem } from '@/store/wardrobeStore';
import { useTranslation } from '@/hooks/useTranslation';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CANVAS_HEIGHT = 380;
const ITEM_SIZE = 100;

interface CanvasItem {
  item: ClothingItem;
  x: number;
  y: number;
}

interface DraggableItemProps {
  canvasItem: CanvasItem;
  onRemove: (id: string) => void;
  onPositionChange: (id: string, x: number, y: number) => void;
}

function DraggableItem({ canvasItem, onRemove, onPositionChange }: DraggableItemProps) {
  const translateX = useSharedValue(canvasItem.x);
  const translateY = useSharedValue(canvasItem.y);
  const scale = useSharedValue(1);
  const startX = useSharedValue(canvasItem.x);
  const startY = useSharedValue(canvasItem.y);

  const panGesture = Gesture.Pan()
    .onBegin(() => {
      startX.value = translateX.value;
      startY.value = translateY.value;
      scale.value = withSpring(1.1, { damping: 15 });
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
    })
    .onUpdate((e) => {
      translateX.value = startX.value + e.translationX;
      translateY.value = startY.value + e.translationY;
    })
    .onEnd(() => {
      scale.value = withSpring(1, { damping: 15 });
      runOnJS(onPositionChange)(canvasItem.item.id, translateX.value, translateY.value);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.draggableItem, animatedStyle]}>
        <Image
          source={{ uri: canvasItem.item.thumbnailUrl ?? canvasItem.item.imageUrl }}
          style={styles.draggableImage}
          resizeMode="cover"
        />
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => onRemove(canvasItem.item.id)}
          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
        >
          <Ionicons name="close-circle" size={20} color={colors.status.error} />
        </TouchableOpacity>
      </Animated.View>
    </GestureDetector>
  );
}

interface OutfitCanvasProps {
  availableItems: ClothingItem[];
  onItemsChange: (items: Array<{ itemId: string; position: { x: number; y: number } }>) => void;
}

export function OutfitCanvas({ availableItems, onItemsChange }: OutfitCanvasProps) {
  const { t } = useTranslation();
  const [canvasItems, setCanvasItems] = useState<CanvasItem[]>([]);

  const addItem = useCallback(
    (item: ClothingItem) => {
      const alreadyAdded = canvasItems.some((ci) => ci.item.id === item.id);
      if (alreadyAdded) return;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const newItem: CanvasItem = {
        item,
        x: Math.random() * (SCREEN_WIDTH - ITEM_SIZE - spacing.screen * 2),
        y: Math.random() * (CANVAS_HEIGHT - ITEM_SIZE - spacing.base),
      };
      const updated = [...canvasItems, newItem];
      setCanvasItems(updated);
      onItemsChange(updated.map((ci) => ({ itemId: ci.item.id, position: { x: ci.x, y: ci.y } })));
    },
    [canvasItems, onItemsChange],
  );

  const removeItem = useCallback(
    (id: string) => {
      const updated = canvasItems.filter((ci) => ci.item.id !== id);
      setCanvasItems(updated);
      onItemsChange(updated.map((ci) => ({ itemId: ci.item.id, position: { x: ci.x, y: ci.y } })));
    },
    [canvasItems, onItemsChange],
  );

  const updatePosition = useCallback(
    (id: string, x: number, y: number) => {
      setCanvasItems((prev) =>
        prev.map((ci) => (ci.item.id === id ? { ...ci, x, y } : ci)),
      );
    },
    [],
  );

  return (
    <View style={styles.container}>
      <View style={styles.canvas}>
        {canvasItems.length === 0 && (
          <View style={styles.placeholder}>
            <Ionicons name="shirt-outline" size={40} color={colors.textMuted} />
            <Text style={styles.placeholderText}>{t('outfits.create.addItem')}</Text>
          </View>
        )}
        {canvasItems.map((ci) => (
          <DraggableItem
            key={ci.item.id}
            canvasItem={ci}
            onRemove={removeItem}
            onPositionChange={updatePosition}
          />
        ))}
      </View>
      <Text style={styles.sectionTitle}>{t('outfits.detail.items')}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.itemList}
      >
        {availableItems.map((item) => {
          const isAdded = canvasItems.some((ci) => ci.item.id === item.id);
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.availableItem, isAdded && styles.availableItemAdded]}
              onPress={() => addItem(item)}
              disabled={isAdded}
            >
              <Image
                source={{ uri: item.thumbnailUrl ?? item.imageUrl }}
                style={styles.availableItemImage}
                resizeMode="cover"
              />
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  canvas: {
    height: CANVAS_HEIGHT,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 16,
    marginHorizontal: spacing.screen,
    marginBottom: spacing.base,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  placeholderText: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
  },
  draggableItem: {
    position: 'absolute',
    width: ITEM_SIZE,
    height: ITEM_SIZE,
  },
  draggableImage: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  removeButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: colors.white,
    borderRadius: 10,
  },
  sectionTitle: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
    paddingHorizontal: spacing.screen,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  itemList: {
    paddingHorizontal: spacing.screen,
    gap: spacing.sm,
  },
  availableItem: {
    width: 72,
    height: 72,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  availableItemAdded: {
    opacity: 0.4,
  },
  availableItemImage: {
    width: '100%',
    height: '100%',
  },
});
