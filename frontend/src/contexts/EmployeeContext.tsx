import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  employeeService,
  type LoginEmployeePayload,
  type RegisterEmployeePayload,
  type UpdateEmployeePayload
} from "../services/employee.service";
import type { Employee } from "../types/employee.types";

interface EmployeeContextValue {
  employeeToken: string | null;
  employee: Employee | null;
  login: (payload: LoginEmployeePayload) => Promise<Employee>;
  register: (payload: RegisterEmployeePayload) => Promise<Employee>;
  updateProfile: (payload: UpdateEmployeePayload) => Promise<Employee>;
  logout: () => void;
}

const EmployeeContext = createContext<EmployeeContextValue | null>(null);
const TOKEN_KEY = "requests.employeeAuthToken";
const LEGACY_TOKEN_KEY = "requests.employeeToken";

/** Mantiene la sesion JWT del empleado y refresca su perfil desde la API. */
export function EmployeeProvider({ children }: { children: ReactNode }) {
  const [employeeToken, setEmployeeToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [employee, setEmployee] = useState<Employee | null>(null);

  useEffect(() => {
    localStorage.removeItem(LEGACY_TOKEN_KEY);
  }, []);

  useEffect(() => {
    if (!employeeToken) return;
    employeeService
      .me(employeeToken)
      .then((response) => setEmployee(response.employee))
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        setEmployeeToken(null);
        setEmployee(null);
      });
  }, [employeeToken]);

  const value = useMemo<EmployeeContextValue>(
    () => {
      const saveSession = (token: string, currentEmployee: Employee) => {
        localStorage.setItem(TOKEN_KEY, token);
        setEmployeeToken(token);
        setEmployee(currentEmployee);
        return currentEmployee;
      };

      return {
        employeeToken,
        employee,
        async login(payload) {
          const response = await employeeService.login(payload);
          return saveSession(response.token, response.employee);
        },
        async register(payload) {
          const response = await employeeService.register(payload);
          return saveSession(response.token, response.employee);
        },
        async updateProfile(payload) {
          if (!employeeToken) throw new Error("Empleado no autenticado");
          const response = await employeeService.update(employeeToken, payload);
          setEmployee(response.employee);
          return response.employee;
        },
        logout() {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(LEGACY_TOKEN_KEY);
          setEmployeeToken(null);
          setEmployee(null);
        }
      };
    },
    [employee, employeeToken]
  );

  return <EmployeeContext.Provider value={value}>{children}</EmployeeContext.Provider>;
}

/** Accede al contexto de autenticacion del empleado. */
export function useEmployee() {
  const value = useContext(EmployeeContext);
  if (!value) throw new Error("useEmployee debe usarse dentro de EmployeeProvider");
  return value;
}
