import { AppError } from "../../middlewares/error.middleware";
import { materialsRepository, type MaterialInput } from "./materials.repository";

export class MaterialsService {
  /** Busca materiales visibles para empleados. */
  listPublic(search?: string) {
    return materialsRepository.listPublic(search);
  }

  /** Busca materiales desde administracion. */
  listAdmin(search?: string) {
    return materialsRepository.listAdmin(search);
  }

  /** Crea un material nuevo en el catalogo. */
  create(input: MaterialInput) {
    return materialsRepository.create(input);
  }

  /** Actualiza un material y falla con 404 si no existe. */
  async update(id: number, input: MaterialInput) {
    const material = await materialsRepository.update(id, input);
    if (!material) throw new AppError("Material no encontrado o no editable", 404, "MATERIAL_NOT_FOUND");
    return material;
  }

  /** Cambia el estado activo/inactivo del material. */
  setActive(id: number, isActive: boolean) {
    return materialsRepository.setActive(id, isActive);
  }
}

export const materialsService = new MaterialsService();
