export function formatTelegramTime(dateString: string | null): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();

  // If today: return HH:MM
  if (
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  ) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // If this year: return DD/MM
  if (date.getFullYear() === now.getFullYear()) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}.${month}`;
  }

  // Else: return DD/MM/YY
  return date.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: '2-digit' });
}

export interface UnifiedChat {
  id: string;
  shopId?: string;
  title: string;
  avatarUrl: string | null;
  subtitle: string;
  time: string;
  rawDate: string | null;
  unreadCount: number;
  isOrder: boolean;
  isSellerSide?: boolean;
}
