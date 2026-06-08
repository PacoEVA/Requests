import { generateTemporaryPassword, hashPassword } from "../../utils/password";
import { usersRepository, type InternalUserInput } from "./users.repository";

export class UsersService {
  list() {
    return usersRepository.list();
  }

  async create(input: Required<Pick<InternalUserInput, "password">> & InternalUserInput) {
    return usersRepository.create(input, await hashPassword(input.password));
  }

  update(id: number, input: Omit<InternalUserInput, "password">) {
    return usersRepository.update(id, input);
  }

  setActive(id: number, isActive: boolean) {
    return usersRepository.setActive(id, isActive);
  }

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
