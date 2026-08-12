import { AppError } from "../../middlewares/error.middleware";
import { generateTemporaryPassword, hashPassword } from "../../utils/password";
import { usersRepository, type InternalUserInput } from "./users.repository";

function normalizeIdentity<T extends Pick<InternalUserInput, "username" | "email">>(input: T) {
  return {
    ...input,
    username: input.username.trim(),
    email: input.email.trim().toLowerCase()
  };
}

function isUniqueConstraintError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { number?: number; originalError?: { number?: number } };
  const number = candidate.number ?? candidate.originalError?.number;
  return number === 2601 || number === 2627;
}

async function assertUniqueIdentity(
  input: Pick<InternalUserInput, "username" | "email">,
  excludeUserId?: number
) {
  const conflicts = await usersRepository.findIdentityConflicts(input, excludeUserId);
  if (conflicts.username) {
    throw new AppError("El nombre de usuario ya esta registrado", 409, "USERNAME_ALREADY_EXISTS");
  }
  if (conflicts.email) {
    throw new AppError("El correo ya esta registrado", 409, "EMAIL_ALREADY_EXISTS");
  }
}

export class UsersService {
  /** Lista usuarios internos para administracion. */
  list() {
    return usersRepository.list();
  }

  /** Hashea la contrasena inicial y crea el usuario. */
  async create(input: Required<Pick<InternalUserInput, "password">> & InternalUserInput) {
    const normalized = normalizeIdentity(input);
    await assertUniqueIdentity(normalized);

    try {
      return await usersRepository.create(normalized, await hashPassword(input.password));
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        await assertUniqueIdentity(normalized);
        throw new AppError("El correo o usuario ya esta registrado", 409, "IDENTITY_ALREADY_EXISTS");
      }
      throw error;
    }
  }

  /** Actualiza datos basicos y asignaciones del usuario. */
  async update(id: number, input: Omit<InternalUserInput, "password">) {
    const normalized = normalizeIdentity(input);
    await assertUniqueIdentity(normalized, id);

    try {
      const user = await usersRepository.update(id, normalized);
      if (!user) throw new AppError("Usuario no encontrado", 404, "USER_NOT_FOUND");
      return user;
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        await assertUniqueIdentity(normalized, id);
        throw new AppError("El correo o usuario ya esta registrado", 409, "IDENTITY_ALREADY_EXISTS");
      }
      throw error;
    }
  }

  /** Cambia el estado activo/inactivo del usuario. */
  setActive(id: number, isActive: boolean) {
    return usersRepository.setActive(id, isActive);
  }

  /** Restablece contrasena y devuelve la temporal para mostrarla una sola vez. */
  async resetPassword(id: number, options: { newPassword?: string; autoGenerate?: boolean }) {
    const temporaryPassword = options.autoGenerate ? generateTemporaryPassword() : options.newPassword;

    if (!temporaryPassword) {
      throw new Error("Debe indicar una contraseña temporal o autoGenerate=true");
    }

    await usersRepository.resetPassword(id, await hashPassword(temporaryPassword));

    return {
      temporaryPassword,
      requirePasswordChange: true
    };
  }

  /** Devuelve datos de usuario interno por id. */
  async getById(id: number) {
    return usersRepository.getById(id);
  }

  /** Lista correos configurados para administradores y personal de compras. */
  listActivePurchasingEmailRecipients() {
    return usersRepository.listActivePurchasingEmailRecipients();
  }
}

export const usersService = new UsersService();
