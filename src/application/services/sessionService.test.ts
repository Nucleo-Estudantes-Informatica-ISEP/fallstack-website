import { beforeEach, expect, test, vi } from "vitest";

import { createClient as createSupabaseServerClient } from "@/utils/supabase/server";

import {
  findUserSessionByEmail,
  findUserSessionById,
} from "../repositories/userRepository";
import getServerSession from "./sessionService";

vi.mock("server-only", () => ({}));
vi.mock("@/utils/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("../repositories/userRepository", () => ({
  findUserSessionById: vi.fn(),
  findUserSessionByEmail: vi.fn(),
}));

const getUser = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(createSupabaseServerClient).mockResolvedValue({
    auth: { getUser },
  } as never);
});

test("returns null when there is no Supabase session", async () => {
  getUser.mockResolvedValue({ data: { user: null }, error: null });

  expect(await getServerSession()).toBeNull();
  expect(findUserSessionById).not.toHaveBeenCalled();
});

test("returns the app user for an active session", async () => {
  getUser.mockResolvedValue({
    data: { user: { id: "u1", email: "a@isep.ipp.pt" } },
    error: null,
  });
  vi.mocked(findUserSessionById).mockResolvedValue({
    id: "u1",
    role: "STUDENT",
    active: true,
  } as never);

  expect(await getServerSession()).toEqual({
    id: "u1",
    role: "STUDENT",
    active: true,
  });
});

test("rejects a deactivated user's session even though Supabase itself still considers them logged in", async () => {
  getUser.mockResolvedValue({
    data: { user: { id: "u1", email: "a@isep.ipp.pt" } },
    error: null,
  });
  vi.mocked(findUserSessionById).mockResolvedValue({
    id: "u1",
    role: "STUDENT",
    active: false,
  } as never);

  expect(await getServerSession()).toBeNull();
});

test("falls back to an email lookup and still enforces active there too", async () => {
  getUser.mockResolvedValue({
    data: { user: { id: "u1", email: "a@isep.ipp.pt" } },
    error: null,
  });
  vi.mocked(findUserSessionById).mockResolvedValue(null);
  vi.mocked(findUserSessionByEmail).mockResolvedValue({
    id: "u1",
    role: "STUDENT",
    active: false,
  } as never);

  expect(await getServerSession()).toBeNull();
  expect(findUserSessionByEmail).toHaveBeenCalled();
});

test("returns null and reports the error if the Supabase call throws", async () => {
  getUser.mockRejectedValue(new Error("network error"));

  expect(await getServerSession()).toBeNull();
});
