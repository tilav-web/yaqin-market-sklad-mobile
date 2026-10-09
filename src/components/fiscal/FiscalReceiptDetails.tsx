import { CheckCircle2, ExternalLink, QrCode as QrIcon } from 'lucide-react-native';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { useTranslation } from '@/i18n';
import { FiscalReceipt } from '@/lib/types';

interface FiscalReceiptDetailsProps {
  readonly receipt: FiscalReceipt;
  readonly onOpenSoliq: () => void;
}

export function FiscalReceiptDetails({ receipt, onOpenSoliq }: FiscalReceiptDetailsProps) {
  const { tr } = useTranslation();

  return (
    <View className="bg-surface rounded-2xl p-4 border border-border-subtle shadow-sm gap-4">
      {/* Type Badge & Date */}
      <View className="flex-row items-center justify-between pb-3 border-b border-border-subtle">
        <View
          className={`flex-row items-center gap-1.5 px-2.5 py-1 rounded-full ${
            receipt.type === 'refund' ? 'bg-red-100' : 'bg-emerald-100'
          }`}>
          <CheckCircle2
            size={12}
            color={receipt.type === 'refund' ? '#DC2626' : '#16A34A'}
            strokeWidth={2.8}
          />
          <Text
            className={`text-xs font-bold ${
              receipt.type === 'refund' ? 'text-red-700' : 'text-emerald-700'
            }`}>
            {receipt.type === 'refund' ? tr('fiscal.refundReceipt') : tr('fiscal.saleReceipt')}
          </Text>
        </View>
        <Text className="text-xs text-text-secondary">
          {new Date(receipt.createdAt).toLocaleString('uz-UZ', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>

      {/* Seller & Platform Information */}
      <View className="gap-1.5">
        <View className="flex-row justify-between">
          <Text className="text-xs text-text-secondary">{tr('fiscal.seller')}:</Text>
          <Text className="text-xs font-bold text-text-primary" numberOfLines={1}>
            {receipt.sellerName || "Do'kon"}
          </Text>
        </View>
        <View className="flex-row justify-between">
          <Text className="text-xs text-text-secondary">{tr('fiscal.stir')}:</Text>
          <Text className="text-xs font-mono font-semibold text-text-primary">{receipt.sellerStir || '—'}</Text>
        </View>

        <View className="border-t border-dashed border-border-subtle my-1" />

        <View className="flex-row justify-between">
          <Text className="text-xs text-text-secondary">{tr('fiscal.operator')}:</Text>
          <Text className="text-xs font-bold text-text-primary" numberOfLines={1}>
            {receipt.platformLegalName || 'Yaqin Market'}
          </Text>
        </View>
        <View className="flex-row justify-between">
          <Text className="text-xs text-text-secondary">{tr('fiscal.stir')}:</Text>
          <Text className="text-xs font-mono font-semibold text-text-primary">{receipt.platformStir || '—'}</Text>
        </View>
      </View>

      {/* Items Table */}
      <View className="gap-2 pt-2 border-t border-border-subtle">
        <Text className="text-xs font-bold text-text-secondary uppercase tracking-wider">Tovarlar ro'yxati</Text>
        {receipt.lines.map((l, idx) => (
          <View key={idx} className="flex-row justify-between items-start gap-2 py-1.5 border-b border-border-subtle">
            <View className="flex-1 gap-0.5">
              <Text className="text-sm font-semibold text-text-primary">{l.productName}</Text>
              {l.mxikCode && (
                <Text className="text-xs text-text-tertiary">
                  {tr('fiscal.mxik')}: {l.mxikCode}
                </Text>
              )}
              <Text className="text-xs text-text-secondary">
                {l.quantity} × {l.unitPrice.toLocaleString()} so'm
                {l.vatRate > 0 ? ` (QQS ${l.vatRate}%: ${l.vatAmount.toLocaleString()} so'm)` : ''}
              </Text>
            </View>
            <Text className="text-sm font-bold text-text-primary">{l.lineTotal.toLocaleString()} so'm</Text>
          </View>
        ))}
      </View>

      {/* Summary Box */}
      <View className="gap-1.5 pt-2 border-t border-border-subtle">
        {receipt.totalVatAmount > 0 && (
          <View className="flex-row justify-between">
            <Text className="text-xs text-text-secondary">Jami QQS (12%):</Text>
            <Text className="text-xs font-semibold text-text-primary">{receipt.totalVatAmount.toLocaleString()} so'm</Text>
          </View>
        )}
        <View className="flex-row justify-between">
          <Text className="text-xs text-text-secondary">{tr('fiscal.paymentType')}:</Text>
          <Text className="text-xs font-semibold text-text-primary">
            {receipt.cardAmount > 0 ? tr('fiscal.card') : tr('fiscal.cash')}
          </Text>
        </View>
        <View className="border-t border-border my-1" />
        <View className="flex-row justify-between items-center">
          <Text className="text-sm font-bold text-text-primary">JAMI TO'LOV:</Text>
          <Text className="text-lg font-extrabold text-brand-primary">{receipt.totalAmount.toLocaleString()} so'm</Text>
        </View>
      </View>

      {/* QR Code & Soliq Cashback Section */}
      {receipt.qrUrl && (
        <View className="items-center gap-3 pt-3 border-t border-border-subtle">
          <View className="p-3 bg-white rounded-xl shadow-xs border border-border-subtle">
            <QRCode value={receipt.qrUrl} size={150} />
          </View>

          <Pressable
            className="flex-row items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-emerald-600 shadow-sm"
            onPress={onOpenSoliq}>
            <QrIcon size={18} color="#FFFFFF" strokeWidth={2.4} />
            <Text className="text-sm font-bold text-white">{tr('fiscal.cashbackBanner')}</Text>
            <ExternalLink size={16} color="#FFFFFF" strokeWidth={2.4} />
          </Pressable>

          <Text className="text-xs text-text-tertiary text-center px-4">{tr('fiscal.cashbackHint')}</Text>
        </View>
      )}

      {/* Fiscal Metadata Footer */}
      <View className="gap-1 pt-3 border-t border-border-subtle">
        <View className="flex-row justify-between">
          <Text className="text-xs text-text-tertiary">{tr('fiscal.fiscalSign')}:</Text>
          <Text className="text-xs font-mono text-text-secondary">{receipt.fiscalSign || '—'}</Text>
        </View>
        <View className="flex-row justify-between">
          <Text className="text-xs text-text-tertiary">{tr('fiscal.receiptNumber')}:</Text>
          <Text className="text-xs font-mono text-text-secondary">{receipt.fiscalReceiptNumber || '—'}</Text>
        </View>
        <View className="flex-row justify-between">
          <Text className="text-xs text-text-tertiary">{tr('fiscal.terminalId')}:</Text>
          <Text className="text-xs font-mono text-text-secondary">{receipt.terminalId || '—'}</Text>
        </View>
        <Text className="text-[11px] text-text-hint text-center mt-2">
          O'zbekiston Respublikasi Soliq Qo'mitasi talablariga muvofiq shakllantirilgan elektron fiskal chek.
        </Text>
      </View>
    </View>
  );
}
