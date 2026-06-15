import { generateTemporaryPassword, hashPassword } from "../../utils/password";
import { usersRepository, type InternalUserInput } from "./users.repository";

export class UsersService {
  /** Lista usuarios internos para administracion. */
  list() {
    return usersRepository.list();
  }

  /** Hashea la contrasena inicial y crea el usuario. */
  async create(input: Required<Pick<InternalUserInput, "password">> & InternalUserInput) {
    return usersRepository.create(input, await hashPassword(input.password));
  }

  /** Actualiza datos basicos y asignaciones del usuario. */
  update(id: number, input: Omit<InternalUserInput, "password">) {
    return usersRepository.update(id, input);
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
}

export const usersService = new UsersService();
