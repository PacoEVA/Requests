import { Boxes } from "lucide-react";
import { useEffect, useState } from "react";
import { PageHeader } from "../../components/common/PageHeader";
import { useAuth } from "../../contexts/AuthContext";
import { adminService } from "../../services/admin.service";
import { recordValue } from "../../utils/record";

export function InventoryPage() {
  const { token } = useAuth();
  const [inventory, setInventory] = useState<unknown[]>([]);

  useEffect(() => {
    if (!token) return;
    adminService.inventory(token).then((response) => setInventory(response.inventory)).catch(() => setInventory([]));
  }, [token]);

  return (
    <>
      <PageHeader title="Inventario" eyebrow="Stock local" />
      <section className="surface">
          <h2>
            <Boxes size={18} /> Stock
          </h2>
          <div className="data-table compact-table">
            <table>
              <thead>
                <tr>
                  <th>Material</th>
                  <th>Actual</th>
                  <th>Mínimo</th>
                </tr>
              </thead>
              <tbody>
                {inventory.map((item, index) => {
                  const record = item as Record<string, unknown>;
                  return (
                    <tr key={index}>
                      <td>{recordValue<string>(record, "materialName", "MaterialName", "")}</td>
                      <td>{recordValue<number>(record, "currentStock", "CurrentStock", 0)}</td>
                      <td>{recordValue<number>(record, "minimumStock", "MinimumStock", 0)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
      </section>
    </>
  );
}
