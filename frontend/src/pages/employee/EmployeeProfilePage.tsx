import { Save, UserRound, UserX } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/common/PageHeader";
import { useEmployee } from "../../contexts/EmployeeContext";
import { employeeService } from "../../services/employee.service";
import type { Department } from "../../types/employee.types";
import { recordId, recordName } from "../../utils/record";

export function EmployeeProfilePage() {
  const navigate = useNavigate();
  const { employee, updateProfile, resetIdentity } = useEmployee();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [form, setForm] = useState({
    name: employee?.name ?? "",
    departmentId: String(employee?.departmentId ?? ""),
    phoneOrExtension: employee?.phoneOrExtension ?? ""
  });

  useEffect(() => {
    employeeService.departments().then((response) => setDepartments(response.departments)).catch(() => setDepartments([]));
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    await updateProfile({
      name: form.name,
      departmentId: Number(form.departmentId),
      phoneOrExtension: form.phoneOrExtension
    });
  }

  return (
    <>
      <PageHeader title="Perfil" eyebrow="Identidad del navegador" />
      <form className="surface form-grid" onSubmit={onSubmit}>
        <label>
          Nombre
          <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        </label>
        <label>
          Departamento
          <select value={form.departmentId} onChange={(event) => setForm({ ...form, departmentId: event.target.value })}>
            <option value="">Seleccionar</option>
            {departments.map((department) => (
              <option key={recordId(department)} value={recordId(department)}>
                {recordName(department)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Teléfono o extensión
          <input value={form.phoneOrExtension} onChange={(event) => setForm({ ...form, phoneOrExtension: event.target.value })} />
        </label>
        <div className="button-row span-2">
          <button className="primary-button" type="submit">
            <Save size={18} /> Guardar
          </button>
          <button
            className="danger-button"
            type="button"
            onClick={() => {
              resetIdentity();
              navigate("/employee/identify");
            }}
          >
            <UserX size={18} /> Cambiar empleado
          </button>
        </div>
        <p className="helper-text span-2">
          <UserRound size={16} /> Esta identidad se conserva localmente en este navegador.
        </p>
      </form>
    </>
  );
}
