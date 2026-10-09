import { MessageCircle, Package, Search as SearchIcon, Store } from 'lucide-react-native';
import React from 'react';
import { FlatList, Image, Pressable, Text, View } from 'react-native';

import { Conversation, FeedProduct, PublicShop } from '@/lib/types';
import { useTheme } from '@/stores/theme';
import { formatMoney } from '@/utils/formatMoney';

export type FilterTab = 'all' | 'products' | 'shops' | 'chats';

interface TelegramSearchResultsListProps {
  activeTab: FilterTab;
  query: string;
  products: FeedProduct[];
  shops: PublicShop[];
  matchingConversations: Conversation[];
  themeColors: ReturnType<typeof useTheme>['colors'];
  onSelectProduct: (p: FeedProduct) => void;
  onSelectShop: (s: PublicShop) => void;
  onSelectConversation: (c: Conversation) => void;
}

export function TelegramSearchResultsList({
  activeTab,
  query,
  products,
  shops,
  matchingConversations,
  themeColors,
  onSelectProduct,
  onSelectShop,
  onSelectConversation,
}: TelegramSearchResultsListProps) {
  const hasNoResults =
    products.length === 0 && shops.length === 0 && matchingConversations.length === 0;

  return (
    <FlatList
      data={[]}
      renderItem={null}
      ListHeaderComponent={
        <View className="pb-30">
          {/* Products matches */}
          {(activeTab === 'all' || activeTab === 'products') && products.length > 0 && (
            <View className="mt-3">
              <Text className="text-xs font-bold text-gray-400 tracking-wider mb-1.5 uppercase">
                MAHSULOTLAR ({products.length})
              </Text>
              {products.map((p) => {
                const price = p.discountPrice ?? p.price;
                return (
                  <Pressable
                    key={p.id}
                    onPress={() => onSelectProduct(p)}
                    className="flex-row items-center py-2.5 border-b"
                    style={{ borderBottomColor: themeColors.border.subtle }}
                  >
                    <View className="w-12 h-12 rounded-full mr-3.5 overflow-hidden">
                      {p.photos?.[0] ? (
                        <Image source={{ uri: p.photos[0] }} className="w-full h-full" />
                      ) : (
                        <View className="w-full h-full items-center justify-center bg-[#E8392E]">
                          <Package size={22} color="#FFF" />
                        </View>
                      )}
                    </View>
                    <View className="flex-1 gap-0.5">
                      <Text
                        className="text-base font-bold"
                        style={{ color: themeColors.text.primary }}
                        numberOfLines={1}
                      >
                        {p.name}
                      </Text>
                      <Text
                        className="text-[13.5px]"
                        style={{ color: themeColors.text.secondary }}
                        numberOfLines={1}
                      >
                        {p.shop?.name} · {formatMoney(price)} so&apos;m
                      </Text>
                    </View>
                    <View className="px-2 py-0.5 rounded bg-white/10">
                      <Text className="text-[11px] font-bold text-gray-300">Tovar</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* Shops matches */}
          {(activeTab === 'all' || activeTab === 'shops') && shops.length > 0 && (
            <View className="mt-3">
              <Text className="text-xs font-bold text-gray-400 tracking-wider mb-1.5 uppercase">
                DO&apos;KONLAR ({shops.length})
              </Text>
              {shops.map((s) => (
                <Pressable
                  key={s.id}
                  onPress={() => onSelectShop(s)}
                  className="flex-row items-center py-2.5 border-b"
                  style={{ borderBottomColor: themeColors.border.subtle }}
                >
                  <View className="w-12 h-12 rounded-full mr-3.5 overflow-hidden">
                    {s.photos?.[0] ? (
                      <Image source={{ uri: s.photos[0] }} className="w-full h-full" />
                    ) : (
                      <View className="w-full h-full items-center justify-center bg-[#10B981]">
                        <Store size={22} color="#FFF" />
                      </View>
                    )}
                  </View>
                  <View className="flex-1 gap-0.5">
                    <Text
                      className="text-base font-bold"
                      style={{ color: themeColors.text.primary }}
                      numberOfLines={1}
                    >
                      {s.name}
                    </Text>
                    <Text
                      className="text-[13.5px]"
                      style={{ color: themeColors.text.secondary }}
                      numberOfLines={1}
                    >
                      {s.address || "Yaqin do'kon"}{' '}
                      {s.distanceKm ? `· ${s.distanceKm.toFixed(1)} km` : ''}
                    </Text>
                  </View>
                  <View className="px-2 py-0.5 rounded bg-[#2481CC]/15">
                    <Text className="text-[11px] font-bold text-[#2481CC]">DO&apos;KON</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          )}

          {/* Conversations matches */}
          {(activeTab === 'all' || activeTab === 'chats') && matchingConversations.length > 0 && (
            <View className="mt-3">
              <Text className="text-xs font-bold text-gray-400 tracking-wider mb-1.5 uppercase">
                CHATLAR ({matchingConversations.length})
              </Text>
              {matchingConversations.map((c) => (
                <Pressable
                  key={c.id}
                  onPress={() => onSelectConversation(c)}
                  className="flex-row items-center py-2.5 border-b"
                  style={{ borderBottomColor: themeColors.border.subtle }}
                >
                  <View className="w-12 h-12 rounded-full mr-3.5 overflow-hidden">
                    <View className="w-full h-full items-center justify-center bg-[#F59E0B]">
                      <MessageCircle size={22} color="#FFF" />
                    </View>
                  </View>
                  <View className="flex-1 gap-0.5">
                    <Text
                      className="text-base font-bold"
                      style={{ color: themeColors.text.primary }}
                      numberOfLines={1}
                    >
                      {c.shopName}
                    </Text>
                    <Text
                      className="text-[13.5px]"
                      style={{ color: themeColors.text.secondary }}
                      numberOfLines={1}
                    >
                      {c.lastMessageText || 'Suhbat tarixi'}
                    </Text>
                  </View>
                  <View className="px-2 py-0.5 rounded bg-white/10">
                    <Text className="text-[11px] font-bold text-gray-300">Chat</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          )}

          {hasNoResults && (
            <View className="items-center justify-center py-15 gap-2.5">
              <SearchIcon size={44} color="#8E8E93" />
              <Text className="text-[17px] font-bold" style={{ color: themeColors.text.primary }}>
                Natija topilmadi
              </Text>
              <Text
                className="text-sm text-center px-8"
                style={{ color: themeColors.text.tertiary }}
              >
                &quot;{query}&quot; bo&apos;yicha hech qanday tovar yoki do&apos;kon topilmadi
              </Text>
            </View>
          )}
        </View>
      }
    />
  );
}
