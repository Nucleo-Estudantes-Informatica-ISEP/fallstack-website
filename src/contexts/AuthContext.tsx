"use client";

import { createContext, useState } from "react";

import type { SessionDto } from "@/application/dto/sessionDto";
import getSession from "@/client/api/session";

export interface AuthContextData {
  user: SessionDto | null;
  clear: () => void;
  fetchSession: () => void;
}

interface AuthContextProviderProps {
  children: React.ReactNode;
  initialUser: SessionDto | null;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export function AuthContextProvider({
  children,
  initialUser,
  ...props
}: AuthContextProviderProps) {
  const [user, setUser] = useState<SessionDto | null>(initialUser);

  const fetchSession = async () => {
    const user = await getSession();
    setUser(user);
  };

  const clear = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, clear, fetchSession }} {...props}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthContext;
