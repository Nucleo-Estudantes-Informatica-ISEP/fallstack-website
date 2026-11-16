"use client";

import { createContext, useEffect, useState } from "react";

import type { SessionDto } from "@/application/dto/sessionDto";
import getSession from "@/client/api/session";

export interface AuthContextData {
  user: SessionDto | null;
  // False while the first client-side session lookup is still pending, so a
  // null user can be told apart from "not known yet". Statically generated
  // pages cannot resolve the session on the server and start out not ready.
  ready: boolean;
  clear: () => void;
  // Refreshes the context's user. With no argument, fetches it from the
  // session endpoint. Pass an already-fetched user (e.g. right after
  // login, where the caller needs that same value for its own redirect
  // decision) to update the context from it directly instead of firing a
  // second, redundant request for data the caller already has.
  fetchSession: (preFetchedUser?: SessionDto | null) => void;
}

interface AuthContextProviderProps {
  children: React.ReactNode;
  initialUser?: SessionDto | null;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export function AuthContextProvider({
  children,
  initialUser,
  ...props
}: AuthContextProviderProps) {
  const [user, setUser] = useState<SessionDto | null>(initialUser ?? null);
  const [ready, setReady] = useState(initialUser !== undefined);

  const fetchSession = async (preFetchedUser?: SessionDto | null) => {
    try {
      const user =
        preFetchedUser !== undefined ? preFetchedUser : await getSession();
      setUser(user);
    } finally {
      // A failed lookup still settles the state: callers fall back to the
      // signed-out experience instead of waiting forever.
      setReady(true);
    }
  };

  const clear = () => setUser(null);

  useEffect(() => {
    if (initialUser === undefined) fetchSession();
  }, [initialUser]);

  return (
    <AuthContext.Provider
      value={{ user, ready, clear, fetchSession }}
      {...props}
    >
      {children}
    </AuthContext.Provider>
  );
}

export default AuthContext;
