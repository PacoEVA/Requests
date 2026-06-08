import { inventoryRepository } from "./inventory.repository";

export class InventoryService {
  list() {
    return inventoryRepository.list();
  }

  lowStock() {
    return inventoryRepository.lowStock();
  }

  updateMinimumStock(materialId: number, minimumStock: number) {
    return inventoryRepository.updateMinimumStock(materialId, minimumStock);
  }

  adjust(materialId: number, quantity: number, userId: number, notes?: string) {
    return inventoryRepository.adjust(materialId, quantity, userId, notes);
  }

  movements() {
    return inventoryRepository.movements();
  }
}

export const inventoryService = new InventoryService();
