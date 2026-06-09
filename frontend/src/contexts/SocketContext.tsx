import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import { io, type Socket } from "socket.io-client";
import { useAuth } from "./AuthContext";
import { useEmployee } from "./EmployeeContext";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? "http://localhost:4100";

const SocketContext = createContext<Socket | null>(null);

export function SocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { employee } = useEmployee();
  const socket = useMemo(() => io(SOCKET_URL, { autoConnect: true }), []);

  useEffect(() => {
    if (employee?.id) socket.emit("employee:join", { employeeId: employee.id });
  }, [employee?.id, socket]);

  useEffect(() => {
    if (user?.role) socket.emit("admin:join", { role: user.role });
  }, [socket, user?.role]);

  useEffect(() => {
    return () => {
      socket.disconnect();
    };
  }, [socket]);

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  return useContext(SocketContext);
}
