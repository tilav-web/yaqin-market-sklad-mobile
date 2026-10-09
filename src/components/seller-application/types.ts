export interface StirData {
  stir: string;
  companyName: string;
  legalName: string;
  entityType: string;
  legalAddress: string;
  region?: string;
  status: 'active' | 'inactive';
  vatPayer: boolean;
}

export interface SoliqVerifyResult {
  isAttached: boolean;
  message: string;
  attachedAt?: string;
}

export interface PlatformConfig {
  platformStir: string;
  platformName: string;
  commissionRate: number;
  ofertaTitle: string;
  ofertaUrl: string;
  ofertaPdfUrl?: string;
  supportPhone: string;
}
