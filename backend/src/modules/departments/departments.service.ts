import { AppError } from "../../middlewares/error.middleware";
import { departmentsRepository, type DepartmentInput } from "./departments.repository";

export class DepartmentsService {
  /** Lista departamentos, opcionalmente solo activos para uso publico. */
  list(publicOnly = false) {
    return departmentsRepository.list(publicOnly);
  }

  /** Crea un departamento nuevo. */
  create(input: DepartmentInput) {
    return departmentsRepository.create(input);
  }

  /** Actualiza un departamento y falla con 404 si no existe. */
  async update(id: number, input: DepartmentInput) {
    const department = await departmentsRepository.update(id, input);
    if (!department) throw new AppError("Departamento no encontrado", 404, "DEPARTMENT_NOT_FOUND");
    return department;
  }

  /** Cambia el estado activo/inactivo del departamento. */
  setActive(id: number, isActive: boolean) {
    return departmentsRepository.setActive(id, isActive);
  }
}

export const departmentsService = new DepartmentsService();
