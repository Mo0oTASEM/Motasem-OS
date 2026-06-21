import type { Request, Response, NextFunction } from 'express';
import { config } from '../config.js';
import { getSupabaseClient } from '../services/supabaseClient.js';

export interface AuthedRequest extends Request {
  userId?: string;
  requestId?: string;
}

export const requireSupabaseUser = async (req: AuthedRequest, res: Response, next: NextFunction) => {
  const token = req.header('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) {
    if (config.allowLocalDevAuth) {
      req.userId = req.header('x-nova-user-id') || config.localDevUserId;
      next();
      return;
    }

    res.status(401).json({ error: 'Missing Supabase bearer token.' });
    return;
  }

  try {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase is not configured.');
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) throw error || new Error('Supabase user not found.');
    req.userId = data.user.id;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid Supabase bearer token.' });
  }
};

export const assertOwner = (req: AuthedRequest) => {
  if (!req.userId) throw new Error('Unauthenticated request');
  return req.userId;
};
