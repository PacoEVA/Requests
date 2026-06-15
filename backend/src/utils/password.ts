import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

/** Genera un hash seguro para guardar contrasenas en base de datos. */
export function hashPassword(password: string) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/** Compara una contrasena plana contra el hash almacenado. */
export function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

/** Crea una contrasena temporal para restablecimientos administrativos. */
export function generateTemporaryPassword() {
  const suffix = Math.random().toString(36).slice(2, 8);
  return `Temporal-${suffix}-2026`;
}
