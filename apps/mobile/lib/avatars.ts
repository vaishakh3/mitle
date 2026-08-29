import type { ImageSourcePropType } from 'react-native';
import type { AvatarId } from './types';

export interface AvatarOption {
  id: AvatarId;
  label: string;
  source: ImageSourcePropType;
  wash: string;
}

// Static requires keep every token bundled and available on a cold first run.
export const AVATARS: readonly AvatarOption[] = [
  { id: '01', label: 'Avatar 1', source: require('../assets/avatar-01.png'), wash: '#E8EEFF' },
  { id: '02', label: 'Avatar 2', source: require('../assets/avatar-02.png'), wash: '#FFE9E4' },
  { id: '03', label: 'Avatar 3', source: require('../assets/avatar-03.png'), wash: '#FFF1C8' },
  { id: '04', label: 'Avatar 4', source: require('../assets/avatar-04.png'), wash: '#E5F5EC' },
  { id: '05', label: 'Avatar 5', source: require('../assets/avatar-05.png'), wash: '#EEF0F2' },
  { id: '06', label: 'Avatar 6', source: require('../assets/avatar-06.png'), wash: '#FFF3D9' },
  { id: '07', label: 'Avatar 7', source: require('../assets/avatar-07.png'), wash: '#E9EBEF' },
  { id: '08', label: 'Avatar 8', source: require('../assets/avatar-08.png'), wash: '#E8EEFF' },
] as const;

export const DEFAULT_AVATAR_ID: AvatarId = '01';

export function avatarById(id: AvatarId | null | undefined): AvatarOption {
  return AVATARS.find((avatar) => avatar.id === id) ?? AVATARS[0];
}
