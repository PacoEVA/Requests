import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

export function hashPassword(password: string) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function generateTemporaryPassword() {
  const suffix = Math.random().toString(36).slice(2, 8);
  return `Temporal-${suffix}-2026`;
}
