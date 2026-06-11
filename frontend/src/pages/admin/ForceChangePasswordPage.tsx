import { KeyRound, Save } from "lucide-react";
import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { authService } from "../../services/auth.service";

export function ForceChangePasswordPage() {
  const navigate = useNavigate();
  const { token, logout } = useAuth();
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!token) return;
    setMessage("");

    try {
      await authService.forceChangePassword(token, newPassword);
      logout();
      navigate("/admin/login", {
        replace: true,
        state: { message: "Contrasena actualizada. Inicie sesion con su nueva contrasena." }
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo cambiar la contraseña");
    }
  }

  return (
    <main className="identify-screen admin-login-screen">
      <section className="identify-panel compact">
        <div className="identify-intro">
          <KeyRound size={34} />
          <span className="eyebrow">Cambio requerido</span>
          <h1>Nueva contraseña</h1>
        </div>
        <form className="form-grid" onSubmit={onSubmit}>
          <label>
            Contraseña nueva
            <input required minLength={8} type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
          </label>
          {message ? <p className="form-error">{message}</p> : null}
          <button className="primary-button" type="submit">
            <Save size={18} /> Guardar
          </button>
        </form>
      </section>
    </main>
  );
}
