import { User as UserEntity } from "src/users/user.entity";

export interface State {
  id: string;
  user: UserEntity | null;
  created_at: Date;
  updated_at: Date;
  token: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password: string | null;
  tfa_secret: string | null;
  tfa_setup: boolean;
}

export interface FtUser {
  login: string;
  email: string;
}

export interface AccessTokenResponse {
  access_token: string;
}

export interface TfaNeededResponse {
  message: string;
  route: string;
}

export interface JwtPayload {
  sub: string;
  name: string;
  jti: string;
}

export type SessionRequest = Request & { state?: State, user?: UserEntity }
