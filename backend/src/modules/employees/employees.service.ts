import { AppError } from "../../middlewares/error.middleware";
import { employeesRepository } from "./employees.repository";
import type { IdentifyEmployeeInput, UpdateEmployeeInput } from "./employees.types";

export class EmployeesService {
  async identify(input: IdentifyEmployeeInput) {
    return employeesRepository.identify(input);
  }

  async getSessionByToken(publicToken: string) {
    const employee = await employeesRepository.findByToken(publicToken);

    if (!employee) {
      throw new AppError("Empleado no encontrado", 401, "INVALID_EMPLOYEE_TOKEN");
    }

    return employee;
  }

  async update(publicToken: string, input: UpdateEmployeeInput) {
    const employee = await employeesRepository.updateByToken(publicToken, input);

    if (!employee) {
      throw new AppError("Empleado no encontrado", 404, "EMPLOYEE_NOT_FOUND");
    }

    return employee;
  }
}

export const employeesService = new EmployeesService();
