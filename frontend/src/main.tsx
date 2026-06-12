import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { AppErrorBoundary } from "./components/common/AppErrorBoundary";
import { AuthProvider } from "./contexts/AuthContext";
import { EmployeeProvider } from "./contexts/EmployeeContext";
import { GlobalFeedbackProvider } from "./contexts/GlobalFeedbackContext";
import { RealtimeNotificationsProvider } from "./contexts/RealtimeNotificationsContext";
import { SocketProvider } from "./contexts/SocketContext";
import "bootstrap/dist/css/bootstrap.min.css";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppErrorBoundary>
        <GlobalFeedbackProvider>
          <AuthProvider>
            <EmployeeProvider>
              <SocketProvider>
                <RealtimeNotificationsProvider>
                  <App />
                </RealtimeNotificationsProvider>
              </SocketProvider>
            </EmployeeProvider>
          </AuthProvider>
        </GlobalFeedbackProvider>
      </AppErrorBoundary>
    </BrowserRouter>
  </React.StrictMode>
);
