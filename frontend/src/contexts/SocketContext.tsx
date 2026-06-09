import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import { io, type Socket } from "socket.io-client";
import { useAuth } from "./AuthContext";
import { useEmployee } from "./EmployeeContext";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? "http://localhost:4100";

const SocketContext = createContext<Socket | null>(null);

export function SocketProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const { employeeToken } = useEmployee();
  const socket = useMemo(
    () =>
      io(SOCKET_URL, {
        autoConnect: false,
        reconnectionAttempts: 5,
        timeout: 8000,
        withCredentials: true
      }),
    []
  );

  useEffect(() => {
    if (!employeeToken && !token) {
      if (socket.connected) socket.disconnect();
      return;
    }

    if (!socket.connected) socket.connect();
  }, [employeeToken, socket, token]);

  useEffect(() => {
    if (!employeeToken) return;

    const join = () => socket.emit("employee:join", { employeeToken });
    if (socket.connected) join();
    socket.on("connect", join);

    return () => {
      socket.off("connect", join);
    };
  }, [employeeToken, socket]);

  useEffect(() => {
    if (!token) return;

    const join = () => socket.emit("admin:join", { token });
    if (socket.connected) join();
    socket.on("connect", join);

    return () => {
      socket.off("connect", join);
    };
  }, [socket, token]);

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
