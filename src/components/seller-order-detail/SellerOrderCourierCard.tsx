import { Bike, Check, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';

import { StaffMember } from '@/constants/staffPermissions';
import { useTranslation } from '@/i18n';
import { Order } from '@/lib/types';
import { colors } from '@/theme';

interface SellerOrderCourierCardProps {
  order: Order;
  staffList: StaffMember[];
  onAssign: (staffId: string | null) => void;
}

export function SellerOrderCourierCard({ order, staffList, onAssign }: SellerOrderCourierCardProps) {
  const { tr } = useTranslation();
  const [modalOpen, setModalOpen] = useState(false);

  if (order.channel === 'in_store') return null;

  const assignedStaff = staffList.find((s) => s.id === order.assignedStaffId);
  const staffDisplayName = assignedStaff
    ? `${assignedStaff.name ?? assignedStaff.phone} (${assignedStaff.customRoleName})`
    : tr('sellerOrder.unassigned');

  return (
    <>
      <View className="bg-bg-surface rounded-2xl p-4 border border-border-subtle gap-2">
        <Text className="text-xs uppercase tracking-wider font-bold text-text-secondary">{tr('sellerOrder.courier')}</Text>
        <View className="flex-row items-center gap-2">
          <Bike size={16} color={colors.brand.primary} strokeWidth={2.2} />
          <Text className="text-sm text-text-primary flex-1">{staffDisplayName}</Text>
          <Pressable
            className="px-4 py-1 rounded-xl border border-brand-primary/20 bg-brand-primary/10 active:opacity-75"
            onPress={() => setModalOpen(true)}
          >
            <Text className="text-xs font-bold text-brand-primary">
              {order.assignedStaffId ? tr('common.edit') : tr('sellerOrder.assign')}
            </Text>
          </Pressable>
        </View>
      </View>

      <Modal visible={modalOpen} transparent animationType="fade" onRequestClose={() => setModalOpen(false)}>
        <Pressable className="flex-1 bg-black/40 justify-end" onPress={() => setModalOpen(false)}>
          <Pressable className="bg-bg-surface rounded-t-3xl p-5 gap-1 pb-8" onPress={(e) => e.stopPropagation()}>
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-lg font-bold text-text-primary">{tr('sellerOrder.pickCourier')}</Text>
              <Pressable onPress={() => setModalOpen(false)} hitSlop={8}>
                <X size={20} color={colors.text.secondary} />
              </Pressable>
            </View>
            {order.assignedStaffId ? (
              <Pressable
                className="flex-row items-center py-3 border-b border-border-subtle active:opacity-75"
                onPress={() => {
                  onAssign(null);
                  setModalOpen(false);
                }}
              >
                <Text className="text-base font-bold text-feedback-danger">
                  {tr('sellerOrder.unassign')}
                </Text>
              </Pressable>
            ) : null}
            {staffList
              .filter((s) => s.isActive)
              .map((s) => (
                <Pressable
                  key={s.id}
                  className="flex-row items-center py-3 border-b border-border-subtle active:opacity-75"
                  onPress={() => {
                    onAssign(s.id);
                    setModalOpen(false);
                  }}
                >
                  <View className="flex-1">
                    <Text className="text-base font-bold text-text-primary">{s.name ?? s.phone}</Text>
                    <Text className="text-xs text-text-secondary mt-0.5">{s.customRoleName}</Text>
                  </View>
                  {s.id === order.assignedStaffId ? (
                    <Check size={18} color={colors.feedback.success} strokeWidth={2.6} />
                  ) : null}
                </Pressable>
              ))}
            {staffList.length === 0 ? (
              <Text className="text-sm text-text-tertiary py-3 text-center">{tr('sellerOrder.noStaff')}</Text>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
