import { AppError } from "../../middlewares/error.middleware";
import { departmentsRepository, type DepartmentInput } from "./departments.repository";

export class DepartmentsService {
  list(publicOnly = false) {
    return departmentsRepository.list(publicOnly);
  }

  create(input: DepartmentInput) {
    return departmentsRepository.create(input);
  }

  async update(id: number, input: DepartmentInput) {
    const department = await departmentsRepository.update(id, input);
    if (!department) throw new AppError("Departamento no encontrado", 404, "DEPARTMENT_NOT_FOUND");
    return department;
  }

  setActive(id: number, isActive: boolean) {
    return departmentsRepository.setActive(id, isActive);
  }
}

export const departmentsService = new DepartmentsService();
