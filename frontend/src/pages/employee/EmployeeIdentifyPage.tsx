import { BadgeCheck, ClipboardList } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useEmployee } from "../../contexts/EmployeeContext";
import { employeeService } from "../../services/employee.service";
import type { Department } from "../../types/employee.types";
import { recordId, recordName } from "../../utils/record";

export function EmployeeIdentifyPage() {
  const navigate = useNavigate();
  const { identify } = useEmployee();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    name: "",
    departmentId: "",
    employeeCode: "",
    phoneOrExtension: ""
  });

  useEffect(() => {
    employeeService.departments().then((response) => setDepartments(response.departments)).catch(() => setDepartments([]));
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setMessage("");

    try {
      await identify({
        name: form.name,
        departmentId: Number(form.departmentId),
        employeeCode: form.employeeCode || undefined,
        phoneOrExtension: form.phoneOrExtension || undefined
      });
      navigate("/employee");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo identificar el empleado");
    }
  }

  return (
    <main className="identify-screen">
      <section className="identify-panel">
        <div className="identify-intro">
          <ClipboardList size={34} />
          <span className="eyebrow">Portal del empleado</span>
          <h1>Requests</h1>
          <p>Identifica tu perfil una vez y podrás crear requisiciones desde este navegador.</p>
        </div>
        <form className="form-grid" onSubmit={onSubmit}>
          <label>
            Nombre
            <input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          </label>
          <label>
            Departamento
            <select
              required
              value={form.departmentId}
              onChange={(event) => setForm({ ...form, departmentId: event.target.value })}
            >
              <option value="">Seleccionar</option>
              {departments.map((department) => (
                <option key={recordId(department)} value={recordId(department)}>
                  {recordName(department)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Código de empleado
            <input
              value={form.employeeCode}
              onChange={(event) => setForm({ ...form, employeeCode: event.target.value })}
            />
          </label>
          <label>
            Teléfono o extensión
            <input
              value={form.phoneOrExtension}
              onChange={(event) => setForm({ ...form, phoneOrExtension: event.target.value })}
            />
          </label>
          {message ? <p className="form-error">{message}</p> : null}
          <button className="primary-button" type="submit">
            <BadgeCheck size={18} /> Continuar
          </button>
        </form>
      </section>
    </main>
  );
}
