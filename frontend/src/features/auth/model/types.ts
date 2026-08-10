export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface JwtPayload {
  exp?: number;
  user_id?: number;
  username?: string;
  email?: string;
}

export interface AuthUser {
  userId: number | null;
  username?: string;
  email?: string;
}
