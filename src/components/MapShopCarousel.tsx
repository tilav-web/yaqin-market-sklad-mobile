import React, { useEffect, useRef } from 'react';
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  View,
} from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MAP_CARD_GAP, MAP_CARD_WIDTH, MapShopCard } from '@/components/MapShopCard';
import { PublicShop } from '@/lib/types';
import { layout, spacing } from '@/theme';

interface Props {
  readonly shops: PublicShop[];
  readonly selectedId: string | null;
  readonly onSelectShop: (shopId: string) => void;
  readonly onOpenPreview: (shop: PublicShop) => void;
}

const ITEM_SIZE = MAP_CARD_WIDTH + MAP_CARD_GAP;

export const MapShopCarousel = React.memo(function MapShopCarousel({
  shops,
  selectedId,
  onSelectShop,
  onOpenPreview,
}: Props) {
  const insets = useSafeAreaInsets();
  const bottomOffset = Math.max(insets.bottom, 12) + 72;
  const flatListRef = useRef<FlatList<PublicShop>>(null);
  const isScrollingByCode = useRef(false);

  // When selectedId changes externally (e.g. user tapped a map pin), scroll carousel to that card
  useEffect(() => {
    if (!selectedId || shops.length === 0) return;
    const index = shops.findIndex((s) => s.id === selectedId);
    if (index >= 0) {
      isScrollingByCode.current = true;
      try {
        flatListRef.current?.scrollToIndex({
          index,
          animated: true,
          viewPosition: 0.5,
        });
      } catch {
        flatListRef.current?.scrollToOffset({
          offset: index * ITEM_SIZE,
          animated: true,
        });
      }
      setTimeout(() => {
        isScrollingByCode.current = false;
      }, 500);
    }
  }, [selectedId, shops]);

  const handleMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (isScrollingByCode.current) return;
    const offsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / ITEM_SIZE);
    if (index >= 0 && index < shops.length) {
      const activeShop = shops[index];
      if (activeShop && activeShop.id !== selectedId) {
        onSelectShop(activeShop.id);
      }
    }
  };

  if (shops.length === 0) return null;

  return (
    <View style={[styles.container, { bottom: bottomOffset }]} pointerEvents="box-none">
      <FlatList
        ref={flatListRef}
        data={shops}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={ITEM_SIZE}
        snapToAlignment="center"
        decelerationRate="fast"
        contentContainerStyle={styles.contentContainer}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        getItemLayout={(_data, index) => ({
          length: ITEM_SIZE,
          offset: ITEM_SIZE * index,
          index,
        })}
        onScrollToIndexFailed={(info) => {
          setTimeout(() => {
            flatListRef.current?.scrollToOffset({
              offset: info.index * ITEM_SIZE,
              animated: true,
            });
          }, 100);
        }}
        renderItem={({ item }) => (
          <View style={{ marginRight: MAP_CARD_GAP }}>
            <MapShopCard
              shop={item}
              selected={item.id === selectedId}
              onSelect={onSelectShop}
              onOpenPreview={onOpenPreview}
            />
          </View>
        )}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 24,
  },
  contentContainer: {
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing.xs,
  },
});
