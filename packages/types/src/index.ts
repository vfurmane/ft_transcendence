export interface State {
  id: string;
  created_at: Date;
  updated_at: Date;
  token: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password: string | null;
}

export interface unreadMessagesResponse
{
  totalNumberOfUnreadMessages: number;
  UnreadMessage: unreadMessages[];
}

export interface unreadMessages {
  conversationId: string;
  name: string;
  numberOfUnreadMessages: number;
}

export interface FtUser {
  login: string;
  email: string;
}

export interface AccessTokenResponse {
  access_token: string;
}

export interface JwtPayload {
  sub: string;
  username: string;
}

export interface AccessTokenResponse {
  access_token: string;
}

export type SessionRequest = Request & { state?: State, user?: User }