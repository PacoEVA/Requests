import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { friendlyErrorMessage } from "../utils/friendlyError";

type FeedbackTone = "error" | "success" | "info";

interface FeedbackItem {
  id: number;
  title: string;
  message: string;
  tone: FeedbackTone;
}

interface GlobalFeedbackValue {
  notify: (title: string, message: string, tone?: FeedbackTone) => void;
}

const GlobalFeedbackContext = createContext<GlobalFeedbackValue | null>(null);

/** Escoge el icono visual segun el tono del aviso global. */
function iconForTone(tone: FeedbackTone) {
  if (tone === "success") return CheckCircle2;
  if (tone === "info") return Info;
  return AlertCircle;
}

/** Muestra avisos globales y captura errores no controlados del navegador. */
export function GlobalFeedbackProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<FeedbackItem[]>([]);

  /** Quita un aviso de la pila. */
  const dismiss = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  /** Agrega un aviso temporal a la pila visible. */
  const notify = useCallback(
    (title: string, message: string, tone: FeedbackTone = "info") => {
      const id = Date.now() + Math.floor(Math.random() * 1000);
      setItems((current) => [...current.slice(-3), { id, title, message, tone }]);
      window.setTimeout(() => dismiss(id), 8000);
    },
    [dismiss]
  );

  useEffect(() => {
    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      notify("No se pudo completar la accion", friendlyErrorMessage(event.reason), "error");
    };

    const onError = (event: ErrorEvent) => {
      if (event.message.includes("ResizeObserver")) return;
      notify("Ocurrio un problema", friendlyErrorMessage(event.error ?? event.message), "error");
    };

    window.addEventListener("unhandledrejection", onUnhandledRejection);
    window.addEventListener("error", onError);

    return () => {
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
      window.removeEventListener("error", onError);
    };
  }, [notify]);

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <GlobalFeedbackContext.Provider value={value}>
      {children}
      <div className="feedback-stack" aria-live="polite" aria-atomic="false">
        {items.map((item) => {
          const Icon = iconForTone(item.tone);
          return (
            <article key={item.id} className={`feedback-toast feedback-${item.tone}`}>
              <Icon size={18} />
              <div>
                <strong>{item.title}</strong>
                <p>{item.message}</p>
              </div>
              <button type="button" className="toast-close" aria-label="Cerrar aviso" onClick={() => dismiss(item.id)}>
                <X size={16} />
              </button>
            </article>
          );
        })}
      </div>
    </GlobalFeedbackContext.Provider>
  );
}

/** Accede al emisor de avisos globales. */
export function useGlobalFeedback() {
  const context = useContext(GlobalFeedbackContext);
  if (!context) {
    throw new Error("useGlobalFeedback debe usarse dentro de GlobalFeedbackProvider");
  }
  return context;
}
