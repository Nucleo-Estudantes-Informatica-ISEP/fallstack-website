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

test("is ready immediately when the server already resolved the session", () => {
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

  expect(latestSession?.ready).toBe(true);
  expect(getSessionMock).not.toHaveBeenCalled();
});

test("is not ready until the client-side session lookup settles", async () => {
  let resolveSession: (value: null) => void = () => {};
  getSessionMock.mockReturnValue(
    new Promise((resolve) => {
      resolveSession = resolve;
    })
  );
  let latestSession: ReturnType<typeof useSession> | undefined;

  render(
    <AuthContextProvider>
      <Probe
        onReady={(session) => {
          latestSession = session;
        }}
      />
    </AuthContextProvider>
  );

  // A pending lookup must not look like a confirmed guest, or signed-in
  // students would briefly be offered the guest registration action.
  expect(latestSession?.ready).toBe(false);
  resolveSession(null);
  await waitFor(() => expect(latestSession?.ready).toBe(true));
  expect(latestSession?.user).toBeNull();
});

test("becomes ready even when the session lookup fails", async () => {
  getSessionMock.mockReturnValueOnce(new Promise(() => {}));
  let latestSession: ReturnType<typeof useSession> | undefined;

  render(
    <AuthContextProvider>
      <Probe
        onReady={(session) => {
          latestSession = session;
        }}
      />
    </AuthContextProvider>
  );
  expect(latestSession?.ready).toBe(false);

  getSessionMock.mockRejectedValueOnce(new Error("Session unavailable"));
  await expect(latestSession?.fetchSession()).rejects.toThrow(
    "Session unavailable"
  );

  await waitFor(() => expect(latestSession?.ready).toBe(true));
  expect(latestSession?.user).toBeNull();
});
