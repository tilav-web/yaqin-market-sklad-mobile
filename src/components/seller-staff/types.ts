import { StaffPreset, StaffRole } from '@/constants/staffPermissions';

export interface InviteResp {
  token: string;
  expiresAt: string;
  shopName: string;
}

export interface StaffPresetDto {
  id: string;
  name: string;
  permissions: string[];
}

export interface GrantBody {
  roles?: StaffRole[];
  preset?: StaffPreset;
  customPresetId?: string;
  permissions?: string[];
  customRoleName?: string;
}
