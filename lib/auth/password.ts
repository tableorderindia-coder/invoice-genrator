import "server-only";

import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

/**
 * Hashes with bcryptjs, the same algorithm Supabase Auth used
 * (auth.users.encrypted_password). This keeps hash format identical so any
 * hash written by either code path stays verifiable by the other.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
