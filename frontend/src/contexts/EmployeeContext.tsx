import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { employeeService, type IdentifyEmployeePayload } from "../services/employee.service";
import type { Employee } from "../types/employee.types";

interface EmployeeContextValue {
  employeeToken: string | null;
  employee: Employee | null;
  identify: (payload: IdentifyEmployeePayload) => Promise<Employee>;
  updateProfile: (payload: Omit<IdentifyEmployeePayload, "employeeCode">) => Promise<Employee>;
  resetIdentity: () => void;
}

const EmployeeContext = createContext<EmployeeContextValue | null>(null);
const TOKEN_KEY = "requests.employeeToken";

export function EmployeeProvider({ children }: { children: ReactNode }) {
  const [employeeToken, setEmployeeToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [employee, setEmployee] = useState<Employee | null>(null);

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
    () => ({
      employeeToken,
      employee,
      async identify(payload) {
        const response = await employeeService.identify(payload);
        localStorage.setItem(TOKEN_KEY, response.publicToken);
        setEmployeeToken(response.publicToken);
        setEmployee(response.employee);
        return response.employee;
      },
      async updateProfile(payload) {
        if (!employeeToken) throw new Error("Empleado no identificado");
        const response = await employeeService.update(employeeToken, payload);
        setEmployee(response.employee);
        return response.employee;
      },
      resetIdentity() {
        localStorage.removeItem(TOKEN_KEY);
        setEmployeeToken(null);
        setEmployee(null);
      }
    }),
    [employee, employeeToken]
  );

  return <EmployeeContext.Provider value={value}>{children}</EmployeeContext.Provider>;
}

export function useEmployee() {
  const value = useContext(EmployeeContext);
  if (!value) throw new Error("useEmployee debe usarse dentro de EmployeeProvider");
  return value;
}
