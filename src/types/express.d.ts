import type { User } from '../domain/types.js';

declare module 'express-serve-static-core' {
  interface Request {
    user?: User | null;
  }
}

export {};
