import { Gender, Role } from './enums';

export interface RegisterRequest {
  name: string; // 2..50
  surname: string; // 2..50
  gender: Gender;
  birthDate: string; // 'YYYY-MM-DD'
  address: string; // <=255
  email: string;
  phoneNumber: string; // 10..20
  username: string; // 3..30
  password: string; // >=6
  emailEnabled: boolean;
  smsEnabled: boolean;
  inAppEnabled: boolean;
}

export interface VerifyRequest {
  email: string;
  code: string; // 6 chars
}

export interface ResendCodeRequest {
  email: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
}

// Response wrappers (unwrapped in services via map()).
export interface RegisterResponse {
  registerDto: { success: boolean; message: string };
}
export interface VerifyResponse {
  verifyDto: { success: boolean; message: string };
}
export interface ResendCodeResponse {
  resendCodeDto: { message: string; username: string };
}
export interface LoginResponse {
  loginDto: TokenPair;
}
export interface RefreshResponse {
  refreshTokenDto: TokenPair;
}

/** Decoded JWT claims (subject/role vary; we read what's present). */
export interface JwtClaims {
  sub?: string;
  role?: Role;
  roles?: Role[];
  authorities?: string[];
  userId?: number | string;
  exp?: number;
  iat?: number;
  [key: string]: unknown;
}
