import type { Request } from 'express';

/** Bentuk Pengguna yang ditempelkan AuthGuard ke request. */
export interface RequestUser {
  id: string;
  email: string;
  name: string | null;
}

/** Request yang sudah melewati AuthGuard — `user` dijamin ada. */
export interface AuthenticatedRequest extends Request {
  user: RequestUser;
}
