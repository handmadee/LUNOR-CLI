export interface LoginLeantimeDto {
  email: string;
  password: string;
  leantimeUrl: string;
}

export interface LeantimeTokens {
  accessToken: string;
  refreshToken: string;
  sessionCookie: string;
}

export interface LeantimeCredentialsInfo {
  userId: string;
  leantimeUrl: string;
  hasToken: boolean;
  createdAt?: string;
  updatedAt?: string;
}
