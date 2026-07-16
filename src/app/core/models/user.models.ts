import { Gender } from './enums';

export interface BaseUserInfo {
  name: string;
  surname: string;
  gender: Gender;
  birthDate: string; // YYYY-MM-DD
  address: string;
  email: string;
  phoneNumber: string;
  username: string;
}

export interface NotificationSettingsEvent {
  userId?: number | string;
  email?: string;
  emailEnabled: boolean;
  smsEnabled: boolean;
  inAppEnabled: boolean;
}

export interface UpdateUserRequest {
  name: string;
  surname: string;
  birthDate?: string;
  address?: string;
  phoneNumber?: string; // ^\+?[0-9]{10,15}$
  notificationSettingsEvent?: NotificationSettingsEvent;
}

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string; // 8..64
}

// ---- Passport ----
export interface PassportInfo {
  id?: number;
  passportNumber: string;
  issueDate: string;
  expiryDate: string;
  issuedBy: string;
}

export interface PassportRequest {
  passportNumber: string; // ^[A-Z0-9]{6,15}$
  issueDate: string; // today or past
  expiryDate: string; // future
  issuedBy: string; // <=255
}

// ---- Organizations ----
export interface OrganizationDetails {
  organizationId?: number;
  id?: number;
  name: string;
  licenseNumber: string;
  address: string;
  contactNumber: string;
  email: string;
}

export interface CreateOrganizationRequest {
  name: string; // 2..100
  licenseNumber: string; // ^[A-Z0-9-]{5,20}$
  address: string; // <=255
  contactNumber: string; // ^\+?[0-9]{10,15}$
  email: string;
}

export interface UpdateOrganizationRequest extends CreateOrganizationRequest {
  organizationId: number;
}

// ---- Response wrappers ----
export interface BaseUserInfoResponse {
  baseUserInfoDto: BaseUserInfo;
}
export interface PassportInfoResponse {
  passportInfoDto: PassportInfo[];
}
export interface OrganizationDetailsResponse {
  organizationDetailsDto: OrganizationDetails[];
}
