import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "../../middlewares/error.middleware";
import { hashPassword } from "../../utils/password";
import { usersRepository } from "./users.repository";
import { usersService } from "./users.service";

vi.mock("../../utils/password", () => ({
  generateTemporaryPassword: vi.fn(),
  hashPassword: vi.fn().mockResolvedValue("password-hash")
}));

vi.mock("./users.repository", () => ({
  usersRepository: {
    findIdentityConflicts: vi.fn(),
    create: vi.fn(),
    update: vi.fn()
  }
}));

const input = {
  username: "compras",
  fullName: "Usuario Compras",
  email: "compras@ssv.com.do",
  password: "temporal-123",
  role: "Compras" as const
};

describe("UsersService unique identity validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rechaza un nombre de usuario repetido antes del insert", async () => {
    vi.mocked(usersRepository.findIdentityConflicts).mockResolvedValue({ username: true, email: false });

    await expect(usersService.create(input)).rejects.toMatchObject({
      statusCode: 409,
      code: "USERNAME_ALREADY_EXISTS"
    });
    expect(usersRepository.create).not.toHaveBeenCalled();
    expect(hashPassword).not.toHaveBeenCalled();
  });

  it("rechaza un correo repetido antes del insert", async () => {
    vi.mocked(usersRepository.findIdentityConflicts).mockResolvedValue({ username: false, email: true });

    await expect(usersService.create(input)).rejects.toMatchObject({
      statusCode: 409,
      code: "EMAIL_ALREADY_EXISTS"
    });
    expect(usersRepository.create).not.toHaveBeenCalled();
  });

  it("excluye la cuenta actual al editar usuario y correo", async () => {
    vi.mocked(usersRepository.findIdentityConflicts).mockResolvedValue({ username: false, email: false });
    vi.mocked(usersRepository.update).mockResolvedValue({ Id: 7 } as never);

    await usersService.update(7, {
      username: input.username,
      fullName: input.fullName,
      email: input.email,
      role: input.role
    });

    expect(usersRepository.findIdentityConflicts).toHaveBeenCalledWith(
      expect.objectContaining({ username: "compras", email: "compras@ssv.com.do" }),
      7
    );
  });

  it("traduce una duplicidad concurrente de SQL Server a conflicto de correo", async () => {
    vi.mocked(usersRepository.findIdentityConflicts)
      .mockResolvedValueOnce({ username: false, email: false })
      .mockResolvedValueOnce({ username: false, email: true });
    vi.mocked(usersRepository.create).mockRejectedValue({ number: 2601 });

    const error = await usersService.create(input).catch((caught) => caught);

    expect(error).toBeInstanceOf(AppError);
    expect(error).toMatchObject({ statusCode: 409, code: "EMAIL_ALREADY_EXISTS" });
  });
});
