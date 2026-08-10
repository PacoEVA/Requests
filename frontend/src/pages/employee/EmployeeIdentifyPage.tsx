import { ClipboardList, LogIn, UserPlus } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useEmployee } from "../../contexts/EmployeeContext";
import { employeeService } from "../../services/employee.service";
import type { Department } from "../../types/employee.types";
import { recordId, recordName } from "../../utils/record";

/** Permite iniciar sesion o crear una cuenta completa de empleado. */
export function EmployeeIdentifyPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register } = useEmployee();
  const isRegister = location.pathname.endsWith("/register");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [registerForm, setRegisterForm] = useState({
    name: "",
    departmentId: "",
    employeeCode: "",
    phoneOrExtension: "",
    email: "",
    username: "",
    password: "",
    confirmPassword: ""
  });

  useEffect(() => {
    if (!isRegister) return;
    employeeService.departments().then((response) => setDepartments(response.departments)).catch(() => setDepartments([]));
  }, [isRegister]);

  async function onLogin(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    setIsSubmitting(true);

    try {
      await login({
        username: loginForm.username.trim(),
        password: loginForm.password
      });
      navigate("/employee", { replace: true });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo iniciar sesión");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onRegister(event: FormEvent) {
    event.preventDefault();
    setMessage("");

    if (registerForm.password !== registerForm.confirmPassword) {
      setMessage("Las contraseñas no coinciden");
      return;
    }

    setIsSubmitting(true);
    try {
      await register({
        name: registerForm.name.trim(),
        departmentId: Number(registerForm.departmentId),
        employeeCode: registerForm.employeeCode.trim(),
        phoneOrExtension: registerForm.phoneOrExtension.trim(),
        email: registerForm.email.trim(),
        username: registerForm.username.trim(),
        password: registerForm.password
      });
      navigate("/employee", { replace: true });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo registrar el empleado");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="identify-screen">
      <section className={`identify-panel${isRegister ? "" : " compact"}`}>
        <div className="identify-intro">
          <ClipboardList size={34} />
          <span className="eyebrow">Portal del empleado</span>
          <h1>Requests</h1>
          <p>
            {isRegister
              ? "Crea tu cuenta con tus datos de empleado para gestionar requisiciones."
              : "Ingresa con tu usuario y contraseña para acceder a tus requisiciones."}
          </p>
        </div>

        {isRegister ? (
          <form className="form-grid" onSubmit={onRegister}>
            <label>
              Nombre completo
              <input
                required
                maxLength={150}
                autoComplete="name"
                value={registerForm.name}
                onChange={(event) => setRegisterForm({ ...registerForm, name: event.target.value })}
              />
            </label>
            <label>
              Departamento
              <select
                required
                value={registerForm.departmentId}
                onChange={(event) => setRegisterForm({ ...registerForm, departmentId: event.target.value })}
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
                required
                maxLength={50}
                value={registerForm.employeeCode}
                onChange={(event) => setRegisterForm({ ...registerForm, employeeCode: event.target.value })}
              />
            </label>
            <label>
              Teléfono o extensión
              <input
                required
                maxLength={50}
                autoComplete="tel"
                value={registerForm.phoneOrExtension}
                onChange={(event) => setRegisterForm({ ...registerForm, phoneOrExtension: event.target.value })}
              />
            </label>
            <label>
              Correo electrónico
              <input
                required
                type="email"
                maxLength={255}
                autoComplete="email"
                value={registerForm.email}
                onChange={(event) => setRegisterForm({ ...registerForm, email: event.target.value })}
              />
            </label>
            <label>
              Usuario
              <input
                required
                minLength={3}
                maxLength={80}
                pattern="[a-zA-Z0-9._-]+"
                autoComplete="username"
                value={registerForm.username}
                onChange={(event) => setRegisterForm({ ...registerForm, username: event.target.value })}
              />
            </label>
            <label>
              Contraseña
              <input
                required
                type="password"
                minLength={8}
                maxLength={72}
                autoComplete="new-password"
                value={registerForm.password}
                onChange={(event) => setRegisterForm({ ...registerForm, password: event.target.value })}
              />
            </label>
            <label>
              Confirmar contraseña
              <input
                required
                type="password"
                minLength={8}
                maxLength={72}
                autoComplete="new-password"
                value={registerForm.confirmPassword}
                onChange={(event) => setRegisterForm({ ...registerForm, confirmPassword: event.target.value })}
              />
            </label>
            {message ? <p className="form-error span-2">{message}</p> : null}
            <div className="button-row span-2">
              <button className="primary-button" type="submit" disabled={isSubmitting}>
                <UserPlus size={18} /> {isSubmitting ? "Registrando..." : "Crear cuenta"}
              </button>
              <button className="secondary-button" type="button" onClick={() => navigate("/employee/login")}>
                Ya tengo una cuenta
              </button>
            </div>
          </form>
        ) : (
          <form className="form-grid" onSubmit={onLogin}>
            <label className="span-2">
              Usuario
              <input
                required
                maxLength={80}
                autoComplete="username"
                value={loginForm.username}
                onChange={(event) => setLoginForm({ ...loginForm, username: event.target.value })}
              />
            </label>
            <label className="span-2">
              Contraseña
              <input
                required
                type="password"
                maxLength={72}
                autoComplete="current-password"
                value={loginForm.password}
                onChange={(event) => setLoginForm({ ...loginForm, password: event.target.value })}
              />
            </label>
            {message ? <p className="form-error span-2">{message}</p> : null}
            <div className="button-row span-2">
              <button className="primary-button" type="submit" disabled={isSubmitting}>
                <LogIn size={18} /> {isSubmitting ? "Ingresando..." : "Iniciar sesión"}
              </button>
              <button className="secondary-button" type="button" onClick={() => navigate("/employee/register")}>
                Crear cuenta
              </button>
            </div>
          </form>
        )}
      </section>
    </main>
  );
}
