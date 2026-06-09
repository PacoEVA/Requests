import { inventoryRepository } from "./inventory.repository";
import { safeEmit } from "../../sockets/socket-hub";

export class InventoryService {
  list() {
    return inventoryRepository.list();
  }

  lowStock() {
    return inventoryRepository.lowStock();
  }

  async updateMinimumStock(materialId: number, minimumStock: number) {
    await inventoryRepository.updateMinimumStock(materialId, minimumStock);
    await this.emitLowStockAlerts();
  }

  async adjust(materialId: number, quantity: number, userId: number, notes?: string) {
    await inventoryRepository.adjust(materialId, quantity, userId, notes);
    await this.emitLowStockAlerts();
  }

  movements() {
    return inventoryRepository.movements();
  }

  private async emitLowStockAlerts() {
    try {
      const items = await inventoryRepository.lowStock();
      await safeEmit((io) => {
        for (const item of items) {
          io.to("role:Admin").to("role:Compras").emit("inventory:lowStock", {
            materialId: Number(item.MaterialId ?? item.materialId ?? 0),
            materialName: String(item.MaterialName ?? item.materialName ?? ""),
            currentStock: Number(item.CurrentStock ?? item.currentStock ?? 0),
            minimumStock: Number(item.MinimumStock ?? item.minimumStock ?? 0)
          });
        }
      });
    } catch (error) {
      console.error("Inventory low-stock emit failed", error);
    }
  }
}

export const inventoryService = new InventoryService();
