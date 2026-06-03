/**
 * Preset emoji avatars. The user picks one; we persist only its `id` (in the
 * user's `avatarUrl` field) and render the bundled emoji on the client — so
 * avatars load instantly with no image upload/hosting.
 */
import type { TranslationKey } from '@/i18n/translations';

export interface AvatarOption {
  readonly id: string;
  readonly emoji: string;
}

export const AVATAR_GROUPS: { readonly titleKey: TranslationKey; readonly options: AvatarOption[] }[] = [
  {
    titleKey: 'editProfile.boy',
    options: [
      { id: 'boy-1', emoji: '👦' },
      { id: 'boy-2', emoji: '🧒' },
      { id: 'boy-3', emoji: '😎' },
      { id: 'boy-4', emoji: '🤓' },
      { id: 'boy-5', emoji: '🦊' },
      { id: 'boy-6', emoji: '🐯' },
      { id: 'boy-7', emoji: '🦁' },
      { id: 'boy-8', emoji: '🚀' },
    ],
  },
  {
    titleKey: 'editProfile.girl',
    options: [
      { id: 'girl-1', emoji: '👧' },
      { id: 'girl-2', emoji: '🥰' },
      { id: 'girl-3', emoji: '😊' },
      { id: 'girl-4', emoji: '🌸' },
      { id: 'girl-5', emoji: '🐰' },
      { id: 'girl-6', emoji: '🦄' },
      { id: 'girl-7', emoji: '🐱' },
      { id: 'girl-8', emoji: '🦋' },
    ],
  },
];

export const ALL_AVATARS: AvatarOption[] = AVATAR_GROUPS.flatMap((g) => g.options);

/** Resolve a stored avatar id to its emoji, or null if unknown/unset. */
export function avatarEmoji(id: string | null | undefined): string | null {
  if (!id) return null;
  return ALL_AVATARS.find((a) => a.id === id)?.emoji ?? null;
}
