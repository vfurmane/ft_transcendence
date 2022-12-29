export interface User {
  id: string;
  name: string;
  email: string;
  password: string | null;
}

export interface FtUser {
  login: string;
}

export interface AccessTokenResponse {
  access_token: string;
}

export interface JwtPayload {
  sub: string;
  username: string;
}

export type SessionRequest = Request & { user: User }
