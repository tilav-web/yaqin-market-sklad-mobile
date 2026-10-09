import { Bike, Check, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { StaffMember } from '@/constants/staffPermissions';
import { useTranslation } from '@/i18n';
import { Order } from '@/lib/types';
import { colors, radius, spacing, typography } from '@/theme';

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
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{tr('sellerOrder.courier')}</Text>
        <View style={styles.assignRow}>
          <Bike size={16} color={colors.brand.primary} strokeWidth={2.2} />
          <Text style={styles.assignName}>{staffDisplayName}</Text>
          <Pressable style={styles.assignBtn} onPress={() => setModalOpen(true)}>
            <Text style={styles.assignBtnText}>
              {order.assignedStaffId ? tr('common.edit') : tr('sellerOrder.assign')}
            </Text>
          </Pressable>
        </View>
      </View>

      <Modal visible={modalOpen} transparent animationType="fade" onRequestClose={() => setModalOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setModalOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle}>{tr('sellerOrder.pickCourier')}</Text>
              <Pressable onPress={() => setModalOpen(false)} hitSlop={8}>
                <X size={20} color={colors.text.secondary} />
              </Pressable>
            </View>
            {order.assignedStaffId ? (
              <Pressable
                style={styles.staffRow}
                onPress={() => {
                  onAssign(null);
                  setModalOpen(false);
                }}
              >
                <Text style={[styles.staffName, { color: colors.text.danger }]}>
                  {tr('sellerOrder.unassign')}
                </Text>
              </Pressable>
            ) : null}
            {staffList
              .filter((s) => s.isActive)
              .map((s) => (
                <Pressable
                  key={s.id}
                  style={styles.staffRow}
                  onPress={() => {
                    onAssign(s.id);
                    setModalOpen(false);
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.staffName}>{s.name ?? s.phone}</Text>
                    <Text style={styles.staffRole}>{s.customRoleName}</Text>
                  </View>
                  {s.id === order.assignedStaffId ? (
                    <Check size={18} color={colors.feedback.success} strokeWidth={2.6} />
                  ) : null}
                </Pressable>
              ))}
            {staffList.length === 0 ? (
              <Text style={styles.staffEmpty}>{tr('sellerOrder.noStaff')}</Text>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    gap: spacing.sm,
  },
  cardTitle: { ...typography.overline, color: colors.text.secondary },
  assignRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  assignName: { ...typography.bodySmall, color: colors.text.primary, flex: 1 },
  assignBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.brand.primaryBorder,
  },
  assignBtnText: { ...typography.caption, fontWeight: '700', color: colors.brand.primary },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.bg.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.xs,
    paddingBottom: spacing['2xl'],
  },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  sheetTitle: { ...typography.h4, color: colors.text.primary },
  staffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  staffName: { ...typography.bodyStrong, color: colors.text.primary },
  staffRole: { ...typography.caption, color: colors.text.secondary, marginTop: 1 },
  staffEmpty: { ...typography.bodySmall, color: colors.text.tertiary, paddingVertical: spacing.md, textAlign: 'center' },
});
