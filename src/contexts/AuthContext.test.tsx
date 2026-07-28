import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

import useSession from "@/hooks/useSession";

import { AuthContextProvider } from "./AuthContext";

const { getSessionMock } = vi.hoisted(() => ({ getSessionMock: vi.fn() }));

vi.mock("@/client/api/session", () => ({
  default: () => getSessionMock(),
}));

const Probe: React.FC<{
  onReady: (session: ReturnType<typeof useSession>) => void;
}> = ({ onReady }) => {
  const session = useSession();
  onReady(session);
  return <span>{session.user?.role ?? "none"}</span>;
};

beforeEach(() => {
  vi.clearAllMocks();
});

test("fetchSession() with no argument fetches the session from the network", async () => {
  getSessionMock.mockResolvedValue({
    role: "EMPLOYEE",
    adminRole: null,
    student: null,
  });

  // No initialUser -> the provider's own mount-time effect calls
  // fetchSession() with no argument, exercising the same "go fetch it
  // yourself" path a caller hits by calling it that way explicitly.
  render(
    <AuthContextProvider>
      <Probe onReady={() => {}} />
    </AuthContextProvider>
  );

  await waitFor(() => expect(getSessionMock).toHaveBeenCalledTimes(1));
  await screen.findByText("EMPLOYEE");
});

test("fetchSession(user) sets the context from the given value without a network request", async () => {
  let latestSession: ReturnType<typeof useSession> | undefined;

  render(
    <AuthContextProvider initialUser={null}>
      <Probe
        onReady={(session) => {
          latestSession = session;
        }}
      />
    </AuthContextProvider>
  );

  latestSession?.fetchSession({
    role: "STUDENT",
    adminRole: null,
    student: null,
  });

  await screen.findByText("STUDENT");
  expect(getSessionMock).not.toHaveBeenCalled();
});
