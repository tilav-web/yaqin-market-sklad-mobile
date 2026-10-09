import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import {
  Bookmark,
  ChevronRight,
  MessageCircle,
  Package,
  Search as SearchIcon,
  Store,
  X,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTranslation } from '@/i18n';
import { api } from '@/lib/api';
import { Category, Conversation, FeedProduct, FeedResponse, PublicShop } from '@/lib/types';
import { useEffectiveCoords } from '@/stores/location';
import { useSearchModalStore } from '@/stores/searchModal';
import { useTheme } from '@/stores/theme';
import { colors } from '@/theme';
import { formatMoney } from '@/utils/formatMoney';
import { haptics } from '@/utils/haptics';

type FilterTab = 'all' | 'products' | 'shops' | 'chats';

export function TelegramSearchModal() {
  const insets = useSafeAreaInsets();
  const coords = useEffectiveCoords();
  const { isOpen, initialQuery, close } = useSearchModalStore();
  const { isDark, colors: themeColors } = useTheme();
  const { tr, catName } = useTranslation();

  const [query, setQuery] = useState('');
  const [prevOpen, setPrevOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const inputRef = useRef<TextInput>(null);

  if (isOpen !== prevOpen) {
    setPrevOpen(isOpen);
    setQuery(isOpen ? initialQuery || '' : '');
  }

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Query products
  const productsQuery = useQuery<FeedProduct[]>({
    queryKey: ['search-products', query, coords?.latitude, coords?.longitude],
    queryFn: async () => {
      if (!query.trim()) return [];
      const res = await api.get<FeedResponse>('/catalog/products', {
        params: {
          q: query.trim(),
          lat: coords?.latitude,
          lng: coords?.longitude,
          limit: 20,
        },
      });
      return res.data?.items ?? [];
    },
    enabled: isOpen && query.trim().length > 0,
    staleTime: 10_000,
  });

  // Query shops
  const shopsQuery = useQuery<PublicShop[]>({
    queryKey: ['search-shops', query, coords?.latitude, coords?.longitude],
    queryFn: async () => {
      if (!query.trim()) return [];
      const res = await api.get<PublicShop[]>('/catalog/shops', {
        params: {
          q: query.trim(),
          lat: coords?.latitude,
          lng: coords?.longitude,
        },
      });
      return res.data ?? [];
    },
    enabled: isOpen && query.trim().length > 0,
    staleTime: 10_000,
  });

  // Query categories
  const categoriesQuery = useQuery<Category[]>({
    queryKey: ['catalog-categories'],
    queryFn: async () => {
      const res = await api.get<Category[]>('/catalog/categories');
      return res.data ?? [];
    },
    enabled: isOpen,
    staleTime: 60_000,
  });

  // Query user conversations
  const conversationsQuery = useQuery<Conversation[]>({
    queryKey: ['conversations'],
    queryFn: async () => {
      const res = await api.get<Conversation[]>('/conversations');
      return res.data ?? [];
    },
    enabled: isOpen,
    staleTime: 30_000,
  });

  const matchingConversations = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return (conversationsQuery.data ?? []).filter((c) =>
      c.shopName.toLowerCase().includes(q) ||
      (c.lastMessageText && c.lastMessageText.toLowerCase().includes(q)),
    );
  }, [conversationsQuery.data, query]);

  const products = productsQuery.data ?? [];
  const shops = shopsQuery.data ?? [];
  const categories = categoriesQuery.data ?? [];

  const handleSelectProduct = useCallback((product: FeedProduct) => {
    haptics.selection();
    close();
    router.push(`/product/${product.id}`);
  }, [close]);

  const handleSelectShop = useCallback((shop: PublicShop) => {
    haptics.selection();
    close();
    router.push(`/shop/${shop.id}`);
  }, [close]);

  const handleSelectConversation = useCallback((conv: Conversation) => {
    haptics.selection();
    close();
    router.push({
      pathname: '/chat/[orderId]',
      params: {
        orderId: conv.id,
        conversationId: conv.id,
        shopId: conv.shopId,
        title: conv.shopName,
      },
    });
  }, [close]);

  const handleSelectSaved = useCallback(() => {
    haptics.selection();
    close();
    router.push('/favorites');
  }, [close]);

  const isSearching = query.trim().length > 0;
  const isLoading = productsQuery.isLoading || shopsQuery.isLoading;

  if (!isOpen) return null;

  return (
    <Modal
      visible={isOpen}
      animationType="fade"
      transparent={false}
      onRequestClose={close}>
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: themeColors.bg.canvas }]}>
        {/* Top Search Header */}
        <View
          style={[
            styles.topHeader,
            {
              backgroundColor: themeColors.bg.surface,
              borderBottomColor: themeColors.border.subtle,
            },
          ]}>
          {/* Input Row */}
          <View style={styles.inputRow}>
            <View
              style={[
                styles.searchBarBox,
                {
                  backgroundColor: themeColors.bg.surfaceMuted,
                  borderColor: themeColors.border.subtle,
                },
              ]}>
              <SearchIcon
                size={18}
                color={themeColors.text.secondary}
                style={styles.searchIcon}
              />
              <TextInput
                ref={inputRef}
                value={query}
                onChangeText={setQuery}
                placeholder="Qidirish..."
                placeholderTextColor={themeColors.text.tertiary}
                style={[styles.searchInput, { color: themeColors.text.primary }]}
                returnKeyType="search"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {query.length > 0 && (
                <Pressable
                  onPress={() => {
                    haptics.selection();
                    setQuery('');
                  }}
                  style={styles.clearBtn}
                  hitSlop={8}>
                  <View style={[styles.clearCircle, { backgroundColor: themeColors.border.default }]}>
                    <X size={12} color={themeColors.text.secondary} />
                  </View>
                </Pressable>
              )}
            </View>

            <Pressable
              onPress={() => {
                haptics.selection();
                close();
              }}
              style={styles.cancelTextBtn}
              hitSlop={8}>
              <Text style={[styles.cancelBtnText, { color: themeColors.brand.primary }]}>
                {tr('common.cancel')}
              </Text>
            </Pressable>
          </View>

          {/* Filter Tabs */}
          <View style={styles.pillRow}>
            <Pressable
              onPress={() => {
                haptics.selection();
                setActiveTab('all');
              }}
              style={[
                styles.tabPill,
                { backgroundColor: themeColors.bg.surfaceMuted },
                activeTab === 'all' && { backgroundColor: themeColors.brand.primary },
              ]}>
              <Text
                style={[
                  styles.tabPillText,
                  { color: themeColors.text.secondary },
                  activeTab === 'all' && styles.tabPillTextActive,
                ]}>
                {tr('filter.all')}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                haptics.selection();
                setActiveTab('products');
              }}
              style={[
                styles.tabPill,
                { backgroundColor: themeColors.bg.surfaceMuted },
                activeTab === 'products' && { backgroundColor: themeColors.brand.primary },
              ]}>
              <Text
                style={[
                  styles.tabPillText,
                  { color: themeColors.text.secondary },
                  activeTab === 'products' && styles.tabPillTextActive,
                ]}>
                Mahsulotlar
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                haptics.selection();
                setActiveTab('shops');
              }}
              style={[
                styles.tabPill,
                { backgroundColor: themeColors.bg.surfaceMuted },
                activeTab === 'shops' && { backgroundColor: themeColors.brand.primary },
              ]}>
              <Text
                style={[
                  styles.tabPillText,
                  { color: themeColors.text.secondary },
                  activeTab === 'shops' && styles.tabPillTextActive,
                ]}>
                Do'konlar
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                haptics.selection();
                setActiveTab('chats');
              }}
              style={[
                styles.tabPill,
                { backgroundColor: themeColors.bg.surfaceMuted },
                activeTab === 'chats' && { backgroundColor: themeColors.brand.primary },
              ]}>
              <Text
                style={[
                  styles.tabPillText,
                  { color: themeColors.text.secondary },
                  activeTab === 'chats' && styles.tabPillTextActive,
                ]}>
                Chatlar
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Main Results / Content Area */}
        <View style={styles.resultsArea}>

            {isLoading ? (
              <View style={styles.centerLoading}>
                <ActivityIndicator size="large" color={colors.brand.primary} />
              </View>
            ) : isSearching ? (
              <FlatList
                data={[]}
                renderItem={null}
                ListHeaderComponent={
                  <View style={{ paddingBottom: 120 }}>
                    {/* Products matches */}
                    {(activeTab === 'all' || activeTab === 'products') && products.length > 0 && (
                      <View style={styles.groupWrap}>
                        <Text style={styles.groupTitle}>MAHSULOTLAR ({products.length})</Text>
                        {products.map((p) => {
                          const price = p.discountPrice ?? p.price;
                          return (
                            <Pressable
                              key={p.id}
                              onPress={() => handleSelectProduct(p)}
                              style={({ pressed }) => [
                                styles.resultRow,
                                pressed && styles.resultRowPressed,
                              ]}>
                              <View style={styles.avatarWrap}>
                                {p.photos?.[0] ? (
                                  <Image source={{ uri: p.photos[0] }} style={styles.avatarImg} />
                                ) : (
                                  <View style={[styles.avatarPlaceholder, { backgroundColor: colors.brand.primary }]}>
                                    <Package size={22} color="#FFF" />
                                  </View>
                                )}
                              </View>
                              <View style={styles.rowBody}>
                                <Text style={styles.rowTitle} numberOfLines={1}>
                                  {p.name}
                                </Text>
                                <Text style={styles.rowSubtitle} numberOfLines={1}>
                                  {p.shop?.name} · {formatMoney(price)} so'm
                                </Text>
                              </View>
                              <View style={styles.tagBadge}>
                                <Text style={styles.tagText}>Tovar</Text>
                              </View>
                            </Pressable>
                          );
                        })}
                      </View>
                    )}

                    {/* Shops matches */}
                    {(activeTab === 'all' || activeTab === 'shops') && shops.length > 0 && (
                      <View style={styles.groupWrap}>
                        <Text style={styles.groupTitle}>DO'KONLAR ({shops.length})</Text>
                        {shops.map((s) => (
                          <Pressable
                            key={s.id}
                            onPress={() => handleSelectShop(s)}
                            style={({ pressed }) => [
                              styles.resultRow,
                              pressed && styles.resultRowPressed,
                            ]}>
                            <View style={styles.avatarWrap}>
                              {s.photos?.[0] ? (
                                <Image source={{ uri: s.photos[0] }} style={styles.avatarImg} />
                              ) : (
                                <View style={[styles.avatarPlaceholder, { backgroundColor: '#10B981' }]}>
                                  <Store size={22} color="#FFF" />
                                </View>
                              )}
                            </View>
                            <View style={styles.rowBody}>
                              <Text style={styles.rowTitle} numberOfLines={1}>
                                {s.name}
                              </Text>
                              <Text style={styles.rowSubtitle} numberOfLines={1}>
                                {s.address || 'Yaqin do\'kon'} {s.distanceKm ? `· ${s.distanceKm.toFixed(1)} km` : ''}
                              </Text>
                            </View>
                            <View style={[styles.tagBadge, { backgroundColor: 'rgba(36, 129, 204, 0.15)' }]}>
                              <Text style={[styles.tagText, { color: '#2481CC' }]}>DO'KON</Text>
                            </View>
                          </Pressable>
                        ))}
                      </View>
                    )}

                    {/* Conversations matches */}
                    {(activeTab === 'all' || activeTab === 'chats') && matchingConversations.length > 0 && (
                      <View style={styles.groupWrap}>
                        <Text style={styles.groupTitle}>CHATLAR ({matchingConversations.length})</Text>
                        {matchingConversations.map((c) => (
                          <Pressable
                            key={c.id}
                            onPress={() => handleSelectConversation(c)}
                            style={({ pressed }) => [
                              styles.resultRow,
                              pressed && styles.resultRowPressed,
                            ]}>
                            <View style={styles.avatarWrap}>
                              <View style={[styles.avatarPlaceholder, { backgroundColor: '#F59E0B' }]}>
                                <MessageCircle size={22} color="#FFF" />
                              </View>
                            </View>
                            <View style={styles.rowBody}>
                              <Text style={styles.rowTitle} numberOfLines={1}>
                                {c.shopName}
                              </Text>
                              <Text style={styles.rowSubtitle} numberOfLines={1}>
                                {c.lastMessageText || 'Suhbat tarixi'}
                              </Text>
                            </View>
                            <View style={styles.tagBadge}>
                              <Text style={styles.tagText}>Chat</Text>
                            </View>
                          </Pressable>
                        ))}
                      </View>
                    )}

                    {products.length === 0 && shops.length === 0 && matchingConversations.length === 0 && (
                      <View style={styles.emptyContainer}>
                        <SearchIcon size={44} color="#8E8E93" />
                        <Text style={styles.emptyTitle}>Natija topilmadi</Text>
                        <Text style={styles.emptySubtitle}>
                          "{query}" bo'yicha hech qanday tovar yoki do'kon topilmadi
                        </Text>
                      </View>
                    )}
                  </View>
                }
              />
            ) : (
              /* Idle / Initial State */
              <FlatList
                data={[]}
                renderItem={null}
                ListHeaderComponent={
                  <View style={{ paddingBottom: 120 }}>
                    {/* Saved Messages (Telegram Style) */}
                    <Pressable
                      onPress={handleSelectSaved}
                      style={({ pressed }) => [
                        styles.resultRow,
                        { borderBottomColor: themeColors.border.subtle },
                        pressed && { backgroundColor: themeColors.bg.surfaceMuted },
                      ]}>
                      <View style={styles.avatarWrap}>
                        <View style={[styles.avatarPlaceholder, { backgroundColor: colors.brand.primary }]}>
                          <Bookmark size={22} color="#FFF" />
                        </View>
                      </View>
                      <View style={styles.rowBody}>
                        <Text style={[styles.rowTitle, { color: themeColors.text.primary }]}>{tr('chat.savedMessages')}</Text>
                        <Text style={[styles.rowSubtitle, { color: themeColors.text.secondary }]}>{tr('chat.savedMessagesDesc')}</Text>
                      </View>
                      <ChevronRight size={18} color={themeColors.text.tertiary} />
                    </Pressable>

                    {/* Popular categories */}
                    {categories.length > 0 && (
                      <View style={[styles.groupWrap, { marginTop: 16 }]}>
                        <Text style={[styles.groupTitle, { color: themeColors.text.secondary }]}>{tr('search.categories').toUpperCase()}</Text>
                        {categories.slice(0, 8).map((cat) => (
                          <Pressable
                            key={cat.id}
                            onPress={() => {
                              setQuery(cat.nameUzLatn);
                            }}
                            style={({ pressed }) => [
                              styles.resultRow,
                              { borderBottomColor: themeColors.border.subtle },
                              pressed && { backgroundColor: themeColors.bg.surfaceMuted },
                            ]}>
                            <View style={styles.avatarWrap}>
                              <View style={[styles.avatarPlaceholder, { backgroundColor: isDark ? '#374151' : '#E2E8F0' }]}>
                                {cat.iconUrl ? (
                                  <Image source={{ uri: cat.iconUrl }} style={styles.avatarImg} />
                                ) : (
                                  <Text style={{ fontSize: 18 }}>🛍️</Text>
                                )}
                              </View>
                            </View>
                            <View style={styles.rowBody}>
                              <Text style={[styles.rowTitle, { color: themeColors.text.primary }]}>
                                {catName(cat)}
                              </Text>
                              <Text style={[styles.rowSubtitle, { color: themeColors.text.secondary }]}>{tr('search.empty.desc')}</Text>
                            </View>
                            <ChevronRight size={16} color={themeColors.text.tertiary} />
                          </Pressable>
                        ))}
                      </View>
                    )}
                  </View>
                }
              />
            )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  keyboardContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  resultsArea: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1F2937',
  },
  sectionHeaderText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#8E8E93',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  groupWrap: {
    marginTop: 12,
  },
  groupTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: 0.6,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1F2937',
  },
  resultRowPressed: {
    backgroundColor: '#111827',
  },
  avatarWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 14,
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: {
    flex: 1,
    gap: 3,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  rowSubtitle: {
    fontSize: 13.5,
    color: '#9CA3AF',
  },
  tagBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  tagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D1D5DB',
  },
  centerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFF',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 30,
  },
  topHeader: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  pillRow: {
    flexDirection: 'row',
    gap: 6,
  },
  tabPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: '#1A232E',
  },
  tabPillActive: {
    backgroundColor: colors.brand.primary,
  },
  tabPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
  },
  tabPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchBarBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E2C3A',
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 42,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  clearBtn: {
    padding: 4,
  },
  clearCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelTextBtn: {
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
