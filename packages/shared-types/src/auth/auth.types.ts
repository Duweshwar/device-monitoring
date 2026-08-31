export enum AccountType {
  PARENT = 'PARENT',
  BUSINESS = 'BUSINESS',
  ADMIN = 'ADMIN',
}

export enum UserRole {
  FAMILY_PARENT = 'FAMILY_PARENT',
  ORGANIZATION_ADMIN = 'ORGANIZATION_ADMIN',
  ORGANIZATION_MANAGER = 'ORGANIZATION_MANAGER',
  SUPER_ADMIN = 'SUPER_ADMIN',
  SUPPORT_AGENT = 'SUPPORT_AGENT',
  BILLING_MANAGER = 'BILLING_MANAGER',
}

export interface JwtPayload {
  sub: string; // userId
  email: string;
  accountType: AccountType;
  roles: UserRole[];
  familyId?: string;
  organizationId?: string;
  iat?: number;
  exp?: number;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    accountType: AccountType;
    roles: UserRole[];
  };
}

export interface PairingCodeRequest {
  deviceName: string;
  accountType: AccountType;
}

export interface PairingCodeResponse {
  pairingCode: string; // 6-digit numeric code
  expiresAt: string;
}
