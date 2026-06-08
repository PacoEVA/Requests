import { AppError } from "../../middlewares/error.middleware";
import { materialsRepository, type MaterialCategoryInput, type MaterialInput } from "./materials.repository";

export class MaterialsService {
  listPublic(search?: string) {
    return materialsRepository.listPublic(search);
  }

  listAdmin(search?: string) {
    return materialsRepository.listAdmin(search);
  }

  create(input: MaterialInput) {
    return materialsRepository.create(input);
  }

  async update(id: number, input: MaterialInput) {
    const material = await materialsRepository.update(id, input);
    if (!material) throw new AppError("Material no encontrado o no editable", 404, "MATERIAL_NOT_FOUND");
    return material;
  }

  setActive(id: number, isActive: boolean) {
    return materialsRepository.setActive(id, isActive);
  }

  listCategories(publicOnly = false) {
    return materialsRepository.listCategories(publicOnly);
  }

  createCategory(input: MaterialCategoryInput) {
    return materialsRepository.createCategory(input);
  }

  async updateCategory(id: number, input: MaterialCategoryInput) {
    const category = await materialsRepository.updateCategory(id, input);
    if (!category) throw new AppError("Categoría no encontrada", 404, "CATEGORY_NOT_FOUND");
    return category;
  }

  setCategoryActive(id: number, isActive: boolean) {
    return materialsRepository.setCategoryActive(id, isActive);
  }
}

export const materialsService = new MaterialsService();
