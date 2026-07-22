import type { ImageSourcePropType } from 'react-native';

/**
 * Preset illustrated avatars. The user picks one; we persist only its `id`
 * (in the user's `avatarUrl` field) and render the bundled image on the
 * client — so avatars load instantly with no image upload/hosting.
 */
export interface AvatarOption {
  readonly id: string;
  readonly source: ImageSourcePropType;
  readonly gender: 'male' | 'female';
}

export const AVATAR_OPTIONS: AvatarOption[] = [
  { id: 'p01', source: require('@/assets/images/avatars/avatar-01.png'), gender: 'male' },
  { id: 'p02', source: require('@/assets/images/avatars/avatar-02.png'), gender: 'male' },
  { id: 'p03', source: require('@/assets/images/avatars/avatar-03.png'), gender: 'male' },
  { id: 'p04', source: require('@/assets/images/avatars/avatar-04.png'), gender: 'male' },
  { id: 'p05', source: require('@/assets/images/avatars/avatar-05.png'), gender: 'male' },
  { id: 'p06', source: require('@/assets/images/avatars/avatar-06.png'), gender: 'male' },
  { id: 'p07', source: require('@/assets/images/avatars/avatar-07.png'), gender: 'female' },
  { id: 'p08', source: require('@/assets/images/avatars/avatar-08.png'), gender: 'female' },
  { id: 'p09', source: require('@/assets/images/avatars/avatar-09.png'), gender: 'female' },
  { id: 'p10', source: require('@/assets/images/avatars/avatar-10.png'), gender: 'female' },
  { id: 'p11', source: require('@/assets/images/avatars/avatar-11.png'), gender: 'male' },
  { id: 'p12', source: require('@/assets/images/avatars/avatar-12.png'), gender: 'female' },
  { id: 'p13', source: require('@/assets/images/avatars/avatar-13.png'), gender: 'male' },
  { id: 'p14', source: require('@/assets/images/avatars/avatar-14.png'), gender: 'male' },
  { id: 'p15', source: require('@/assets/images/avatars/avatar-15.png'), gender: 'female' },
  { id: 'p16', source: require('@/assets/images/avatars/avatar-16.png'), gender: 'female' },
  { id: 'p17', source: require('@/assets/images/avatars/avatar-17.png'), gender: 'male' },
  { id: 'p18', source: require('@/assets/images/avatars/avatar-18.png'), gender: 'female' },
  { id: 'p19', source: require('@/assets/images/avatars/avatar-19.png'), gender: 'male' },
  { id: 'p20', source: require('@/assets/images/avatars/avatar-20.png'), gender: 'male' },
  { id: 'p21', source: require('@/assets/images/avatars/avatar-21.png'), gender: 'female' },
  { id: 'p22', source: require('@/assets/images/avatars/avatar-22.png'), gender: 'male' },
];

/** Resolve a stored avatar id to its bundled image source, or null if unknown/unset. */
export function avatarSource(id: string | null | undefined): ImageSourcePropType | null {
  if (!id) return null;
  return AVATAR_OPTIONS.find((a) => a.id === id)?.source ?? null;
}
