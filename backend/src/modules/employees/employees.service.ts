import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";
import { env } from "../../config/env";
import { AppError } from "../../middlewares/error.middleware";
import { hashPassword, verifyPassword } from "../../utils/password";
import { safeEmit } from "../../sockets/socket-hub";
import { employeesRepository } from "./employees.repository";
import type {
  EmployeeAuthResponse,
  EmployeeIdentityConflicts,
  EmployeeSession,
  LoginEmployeeInput,
  RegisterEmployeeInput,
  UpdateEmployeeInput
} from "./employees.types";

interface EmployeeTokenPayload extends JwtPayload {
  kind: "employee";
  id: number;
  username: string;
}

/** Convierte los valores de identidad a su forma canonica antes de consultar SQL. */
function normalizeRegistration(input: RegisterEmployeeInput): RegisterEmployeeInput {
  return {
    ...input,
    name: input.name.trim(),
    employeeCode: input.employeeCode.trim(),
    phoneOrExtension: input.phoneOrExtension.trim(),
    email: input.email.trim().toLowerCase(),
    username: input.username.trim().toLowerCase()
  };
}

/** Traduce una coincidencia de identidad a un conflicto entendible por el formulario. */
function throwIdentityConflict(conflicts: EmployeeIdentityConflicts) {
  if (conflicts.employeeCode) {
    throw new AppError("El código de empleado ya está registrado", 409, "EMPLOYEE_CODE_EXISTS");
  }
  if (conflicts.email) {
    throw new AppError("El correo ya está registrado", 409, "EMPLOYEE_EMAIL_EXISTS");
  }
  if (conflicts.username) {
    throw new AppError("El usuario ya está registrado", 409, "EMPLOYEE_USERNAME_EXISTS");
  }
}

/** Reconoce las violaciones de indices unicos devueltas por SQL Server. */
function isUniqueConstraintError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const sqlError = error as { number?: number; originalError?: { number?: number } };
  return [2601, 2627].includes(sqlError.number ?? sqlError.originalError?.number ?? 0);
}

export class EmployeesService {
  /** Lista cuentas de empleados para administradores. */
  listForAdmin() {
    return employeesRepository.listForAdmin();
  }

  /** Registra un empleado nuevo, guarda un hash y abre su sesion autenticada. */
  async register(rawInput: RegisterEmployeeInput): Promise<EmployeeAuthResponse> {
    const input = normalizeRegistration(rawInput);
    const unprovisionedEmployee = await employeesRepository.findUnprovisionedByEmployeeCode(input.employeeCode);
    const conflicts = await employeesRepository.findIdentityConflicts(input, unprovisionedEmployee?.id);
    throwIdentityConflict(conflicts);

    let employee: EmployeeSession | null;
    try {
      const passwordHash = await hashPassword(input.password);
      employee = unprovisionedEmployee
        ? await employeesRepository.provisionCredentials(unprovisionedEmployee.id, input, passwordHash)
        : await employeesRepository.create(input, passwordHash);

      if (!employee) {
        throw new AppError("El empleado ya fue registrado", 409, "EMPLOYEE_ALREADY_PROVISIONED");
      }
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error;

      // El indice unico cubre carreras entre dos registros simultaneos.
      const currentConflicts = await employeesRepository.findIdentityConflicts(input);
      throwIdentityConflict(currentConflicts);
      throw new AppError("Los datos de acceso ya están registrados", 409, "EMPLOYEE_IDENTITY_EXISTS");
    }

    return { employee, token: this.signToken(employee) };
  }

  /** Valida usuario y contrasena antes de emitir un JWT de empleado. */
  async login(rawInput: LoginEmployeeInput): Promise<EmployeeAuthResponse> {
    const username = rawInput.username.trim().toLowerCase();
    const employee = await employeesRepository.findByUsername(username);

    if (!employee || !employee.isActive || !employee.passwordHash) {
      throw new AppError("Credenciales inválidas", 401, "INVALID_EMPLOYEE_CREDENTIALS");
    }

    const validPassword = await verifyPassword(rawInput.password, employee.passwordHash);
    if (!validPassword) {
      throw new AppError("Credenciales inválidas", 401, "INVALID_EMPLOYEE_CREDENTIALS");
    }

    await employeesRepository.updateLastLogin(employee.id);
    const { passwordHash: _passwordHash, isActive: _isActive, ...session } = employee;
    return { employee: session, token: this.signToken(session) };
  }

  /** Valida el JWT y refresca la identidad desde DB para respetar bajas o cambios. */
  async getSessionByToken(token: string) {
    let payload: string | JwtPayload;
    try {
      payload = jwt.verify(token, env.JWT_SECRET);
    } catch {
      throw new AppError("Sesión de empleado inválida o vencida", 401, "INVALID_EMPLOYEE_TOKEN");
    }

    if (
      typeof payload === "string" ||
      payload.kind !== "employee" ||
      !Number.isInteger(payload.id) ||
      Number(payload.id) <= 0
    ) {
      throw new AppError("Sesión de empleado inválida", 401, "INVALID_EMPLOYEE_TOKEN");
    }

    const employee = await employeesRepository.getById(Number(payload.id));
    if (!employee) {
      throw new AppError("Empleado no encontrado o inactivo", 401, "INVALID_EMPLOYEE_TOKEN");
    }

    return employee;
  }

  /** Actualiza el perfil y evita que el correo pase a pertenecer a otro empleado. */
  async update(employeeId: number, rawInput: UpdateEmployeeInput) {
    const input: UpdateEmployeeInput = {
      ...rawInput,
      name: rawInput.name.trim(),
      phoneOrExtension: rawInput.phoneOrExtension.trim(),
      email: rawInput.email.trim().toLowerCase()
    };
    const conflicts = await employeesRepository.findIdentityConflicts({ email: input.email }, employeeId);
    throwIdentityConflict(conflicts);

    try {
      const employee = await employeesRepository.updateById(employeeId, input);
      if (!employee) throw new AppError("Empleado no encontrado", 404, "EMPLOYEE_NOT_FOUND");
      return employee;
    } catch (error) {
      if (error instanceof AppError || !isUniqueConstraintError(error)) throw error;
      throw new AppError("El correo ya está registrado", 409, "EMPLOYEE_EMAIL_EXISTS");
    }
  }

  /** Obtiene la informacion de un empleado activo por su id. */
  async getById(id: number) {
    const employee = await employeesRepository.getById(id);
    if (!employee) throw new AppError("Empleado no encontrado", 404, "EMPLOYEE_NOT_FOUND");
    return employee;
  }

  /** Habilita o inhabilita una cuenta y cierra sus sockets al desactivarla. */
  async setActive(id: number, isActive: boolean) {
    const updated = await employeesRepository.setActive(id, isActive);
    if (!updated) throw new AppError("Empleado no encontrado", 404, "EMPLOYEE_NOT_FOUND");

    if (!isActive) {
      await safeEmit((io) => io.in(`employee:${id}`).disconnectSockets(true));
    }
  }

  /** Firma una sesion diferenciada de los JWT usados por usuarios internos. */
  private signToken(employee: EmployeeSession) {
    const payload: EmployeeTokenPayload = {
      sub: String(employee.id),
      kind: "employee",
      id: employee.id,
      username: employee.username
    };

    return jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"]
    });
  }
}

export const employeesService = new EmployeesService();
