import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import { Component, type ErrorInfo, type ReactNode } from "react";

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unexpected application error", error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="app-fallback-screen">
        <section className="app-fallback-card">
          <AlertTriangle size={38} />
          <span className="eyebrow">Algo no salio bien</span>
          <h1>No pudimos mostrar esta pantalla</h1>
          <p>
            La aplicacion encontro un problema inesperado. Puede intentar recargar la pagina o volver al inicio para continuar.
          </p>
          <div className="button-row">
            <button className="primary-button" type="button" onClick={() => window.location.reload()}>
              <RefreshCw size={18} /> Recargar
            </button>
            <button className="secondary-button" type="button" onClick={() => window.location.assign("/")}>
              <Home size={18} /> Ir al inicio
            </button>
          </div>
        </section>
      </main>
    );
  }
}
