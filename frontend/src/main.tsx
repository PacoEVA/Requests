import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { AuthProvider } from "./contexts/AuthContext";
import { EmployeeProvider } from "./contexts/EmployeeContext";
import { SocketProvider } from "./contexts/SocketContext";
import "bootstrap/dist/css/bootstrap.min.css";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <EmployeeProvider>
          <SocketProvider>
            <App />
          </SocketProvider>
        </EmployeeProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
