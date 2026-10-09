export function formatChatGroupDate(dateString: string, tr: (key: any) => string): string {
  const date = new Date(dateString);
  const now = new Date();

  if (
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  ) {
    return tr('day.today') || 'Bugun';
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()
  ) {
    return tr('day.yesterday') || 'Kecha';
  }

  return date.toLocaleDateString([], { day: 'numeric', month: 'long' });
}
