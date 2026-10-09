import { Inbox, LucideIcon } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { Button } from './Button';
import { colors, typography } from '@/theme';

interface Props {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: Props) {
  return (
    <View className={`items-center px-8 py-12 gap-3 ${className ?? ''}`}>
      {Icon ? (
        <View
          className="w-24 h-24 rounded-full items-center justify-center mb-3"
          style={{ backgroundColor: colors.brand.primarySurface }}>
          <Icon size={48} color={colors.brand.primary} strokeWidth={1.4} />
        </View>
      ) : null}
      <Text style={[typography.h3, { textAlign: 'center' }]}>{title}</Text>
      {description && (
        <Text style={[typography.body, { color: colors.text.secondary, textAlign: 'center' }]}>
          {description}
        </Text>
      )}
      {actionLabel && onAction && (
        <View className="mt-4">
          <Button label={actionLabel} onPress={onAction} variant="primary" />
        </View>
      )}
    </View>
  );
}
