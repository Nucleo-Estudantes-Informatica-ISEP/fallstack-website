import { beforeEach, expect, test, vi } from "vitest";

import {
  findSponsorById,
  updateSponsor,
} from "../repositories/sponsorRepository";
import { updateSponsorForAdmin } from "./sponsorService";

vi.mock("server-only", () => ({}));
vi.mock("../repositories/sponsorRepository", () => ({
  findSponsorById: vi.fn(),
  updateSponsor: vi.fn(),
}));

const findSponsor = vi.mocked(findSponsorById);
const update = vi.mocked(updateSponsor);

beforeEach(() => {
  vi.clearAllMocks();
  findSponsor.mockResolvedValue({
    id: "sponsor-1",
    name: "Sponsor",
    logo: "/assets/images/sponsors/old.png",
    active: false,
  } as Awaited<ReturnType<typeof findSponsorById>>);
});

test("inactive legacy sponsor stays editable without a new logo", async () => {
  await updateSponsorForAdmin("sponsor-1", { name: "New name", active: false });
  expect(update).toHaveBeenCalledWith("sponsor-1", {
    name: "New name",
    active: false,
  });
});

test("legacy sponsor needs a replacement logo before activation", async () => {
  await expect(
    updateSponsorForAdmin("sponsor-1", { active: true })
  ).rejects.toMatchObject({ status: 400 });
  expect(update).not.toHaveBeenCalled();

  await updateSponsorForAdmin("sponsor-1", {
    active: true,
    logo: "/api/media/logo/00000000-0000-0000-0000-000000000000",
  });
  expect(update).toHaveBeenCalledOnce();
});
