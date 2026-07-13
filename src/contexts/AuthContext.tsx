"use client";

import { createContext, useEffect, useState } from "react";

import type { SessionDto } from "@/application/dto/sessionDto";
import getSession from "@/client/api/session";

export interface AuthContextData {
  user: SessionDto | null;
  clear: () => void;
  fetchSession: () => void;
}

interface AuthContextProviderProps {
  children: React.ReactNode;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export function AuthContextProvider({
  children,
  ...props
}: AuthContextProviderProps) {
  const [user, setUser] = useState<SessionDto | null>(null);

  const fetchSession = async () => {
    const user = await getSession();
    setUser(user);
  };

  const clear = () => setUser(null);

  useEffect(() => {
    fetchSession();
  }, []);

  return (
    <AuthContext.Provider value={{ user, clear, fetchSession }} {...props}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthContext;
