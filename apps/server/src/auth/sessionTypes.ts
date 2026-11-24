import 'express-session';

declare module 'express-session' {
  interface SessionData {
    /** Authenticated account id; absent for anonymous sessions. */
    userId?: string;
    /** Absolute session creation time in epoch ms. */
    createdAt?: number;
  }
}

declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
    }
  }
}
