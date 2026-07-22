import type { ImageSourcePropType } from 'react-native';

/**
 * Preset illustrated avatars. The user picks one; we persist only its `id`
 * (in the user's `avatarUrl` field) and render the bundled image on the
 * client — so avatars load instantly with no image upload/hosting.
 */
export interface AvatarOption {
  readonly id: string;
  readonly source: ImageSourcePropType;
}

export const AVATAR_OPTIONS: AvatarOption[] = [
  { id: 'p01', source: require('@/assets/images/avatars/avatar-01.png') },
  { id: 'p02', source: require('@/assets/images/avatars/avatar-02.png') },
  { id: 'p03', source: require('@/assets/images/avatars/avatar-03.png') },
  { id: 'p04', source: require('@/assets/images/avatars/avatar-04.png') },
  { id: 'p05', source: require('@/assets/images/avatars/avatar-05.png') },
  { id: 'p06', source: require('@/assets/images/avatars/avatar-06.png') },
  { id: 'p07', source: require('@/assets/images/avatars/avatar-07.png') },
  { id: 'p08', source: require('@/assets/images/avatars/avatar-08.png') },
  { id: 'p09', source: require('@/assets/images/avatars/avatar-09.png') },
  { id: 'p10', source: require('@/assets/images/avatars/avatar-10.png') },
  { id: 'p11', source: require('@/assets/images/avatars/avatar-11.png') },
  { id: 'p12', source: require('@/assets/images/avatars/avatar-12.png') },
  { id: 'p13', source: require('@/assets/images/avatars/avatar-13.png') },
  { id: 'p14', source: require('@/assets/images/avatars/avatar-14.png') },
  { id: 'p15', source: require('@/assets/images/avatars/avatar-15.png') },
  { id: 'p16', source: require('@/assets/images/avatars/avatar-16.png') },
  { id: 'p17', source: require('@/assets/images/avatars/avatar-17.png') },
  { id: 'p18', source: require('@/assets/images/avatars/avatar-18.png') },
  { id: 'p19', source: require('@/assets/images/avatars/avatar-19.png') },
  { id: 'p20', source: require('@/assets/images/avatars/avatar-20.png') },
  { id: 'p21', source: require('@/assets/images/avatars/avatar-21.png') },
  { id: 'p22', source: require('@/assets/images/avatars/avatar-22.png') },
];

/** Resolve a stored avatar id to its bundled image source, or null if unknown/unset. */
export function avatarSource(id: string | null | undefined): ImageSourcePropType | null {
  if (!id) return null;
  return AVATAR_OPTIONS.find((a) => a.id === id)?.source ?? null;
}
