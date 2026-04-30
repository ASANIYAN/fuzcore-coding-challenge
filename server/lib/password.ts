import bcrypt from "bcryptjs";

const PASSWORD_COST_FACTOR = 12;

export function hashPassword(password: string) {
  return bcrypt.hash(password, PASSWORD_COST_FACTOR);
}

export function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}
