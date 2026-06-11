import { LogIn } from "lucide-react";
import { FormEvent, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const routeMessage = (location.state as { message?: string } | null)?.message ?? "";
  const [message, setMessage] = useState(routeMessage);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setMessage("");

    try {
      const user = await login(username, password);
      if (user.requirePasswordChange) {
        navigate("/admin/change-password-required");
        return;
      }
      const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/admin/dashboard";
      navigate(from);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo iniciar sesión");
    }
  }

  return (
    <main className="identify-screen admin-login-screen">
      <section className="identify-panel compact">
        <div className="identify-intro">
          <LogIn size={34} />
          <span className="eyebrow">Dashboard privado</span>
          <h1>Compras</h1>
        </div>
        <form className="form-grid" onSubmit={onSubmit}>
          <label>
            Usuario
            <input required value={username} onChange={(event) => setUsername(event.target.value)} />
          </label>
          <label>
            Contraseña
            <input required type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          {message ? <p className={routeMessage === message ? "form-success" : "form-error"}>{message}</p> : null}
          <button className="primary-button" type="submit">
            <LogIn size={18} /> Entrar
          </button>
        </form>
      </section>
    </main>
  );
}
