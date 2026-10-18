import { beforeEach, expect, test, vi } from "vitest";

import {
  deleteCompanyProfile,
  findCompanyById,
  findCompanyProfileById,
  upsertCompanyProfile,
} from "../repositories/companyRepository";
import { updateCompanyProfileForAdmin } from "./companyService";

vi.mock("server-only", () => ({}));
vi.mock("../repositories/companyRepository", () => ({
  findCompanyById: vi.fn(),
  findCompanyProfileById: vi.fn(),
  upsertCompanyProfile: vi.fn(),
  deleteCompanyProfile: vi.fn(),
  findCompanies: vi.fn(),
  findActiveCompanies: vi.fn(),
  findAllCompaniesForAdmin: vi.fn(),
  findAllCompaniesForRankBoard: vi.fn(),
  countCompaniesForAdmin: vi.fn(),
  findCompanyByName: vi.fn(),
  findCompanyDisplayByName: vi.fn(),
  findCompanyWithContent: vi.fn(),
  findCompanyInterests: vi.fn(),
  createCompany: vi.fn(),
  createCompanyDisplay: vi.fn(),
  updateCompanyAvatar: vi.fn(),
  updateCompanyDisplay: vi.fn(),
  upsertCompanyDisplayStyle: vi.fn(),
  bulkUpdateCompanyRankBoard: vi.fn(),
  setCompanyInterests: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(findCompanyById).mockResolvedValue({ id: "company-1" } as never);
  vi.mocked(findCompanyProfileById).mockResolvedValue(null);
  vi.mocked(upsertCompanyProfile).mockResolvedValue({} as never);
  vi.mocked(deleteCompanyProfile).mockResolvedValue({ count: 1 } as never);
});

test("update a profile whose stored videoHref is non-YouTube accepts unchanged value", async () => {
  const legacyHref = "https://vimeo.com/12345678";
  vi.mocked(findCompanyProfileById).mockResolvedValue({
    companyId: "company-1",
    bodyText: "Old body text",
    videoHref: legacyHref,
  } as never);

  await updateCompanyProfileForAdmin("company-1", {
    bodyText: "Updated body text without touching video",
    videoHref: legacyHref,
  });

  expect(upsertCompanyProfile).toHaveBeenCalledWith(
    "company-1",
    expect.objectContaining({
      bodyText: "Updated body text without touching video",
      videoHref: legacyHref,
    })
  );
});

test("update a profile rejects a new or changed non-YouTube videoHref", async () => {
  vi.mocked(findCompanyProfileById).mockResolvedValue({
    companyId: "company-1",
    bodyText: "Existing body text",
    videoHref: "https://vimeo.com/12345678",
  } as never);

  await expect(
    updateCompanyProfileForAdmin("company-1", {
      bodyText: "Updated body text",
      videoHref: "https://vimeo.com/different-video-id",
    })
  ).rejects.toMatchObject({
    message: "O URL do vídeo deve ser um link válido do YouTube",
    status: 400,
  });

  expect(upsertCompanyProfile).not.toHaveBeenCalled();
});

test("update a profile without existing profile rejects a non-YouTube videoHref", async () => {
  vi.mocked(findCompanyProfileById).mockResolvedValue(null);

  await expect(
    updateCompanyProfileForAdmin("company-1", {
      bodyText: "New body text",
      videoHref: "https://example.com/video.mp4",
    })
  ).rejects.toMatchObject({
    message: "O URL do vídeo deve ser um link válido do YouTube",
    status: 400,
  });

  expect(upsertCompanyProfile).not.toHaveBeenCalled();
});

test("update a profile normalizes a valid YouTube videoHref", async () => {
  vi.mocked(findCompanyProfileById).mockResolvedValue(null);

  await updateCompanyProfileForAdmin("company-1", {
    bodyText: "Company with YouTube video",
    videoHref: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  });

  expect(upsertCompanyProfile).toHaveBeenCalledWith(
    "company-1",
    expect.objectContaining({
      bodyText: "Company with YouTube video",
      videoHref: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    })
  );
});

test("update a profile allows clearing videoHref to null", async () => {
  vi.mocked(findCompanyProfileById).mockResolvedValue({
    companyId: "company-1",
    bodyText: "Existing profile",
    videoHref: "https://vimeo.com/12345678",
  } as never);

  await updateCompanyProfileForAdmin("company-1", {
    bodyText: "Existing profile with video cleared",
    videoHref: null,
  });

  expect(upsertCompanyProfile).toHaveBeenCalledWith(
    "company-1",
    expect.objectContaining({
      bodyText: "Existing profile with video cleared",
      videoHref: null,
    })
  );
});

test("updating a missing company throws 404 Not found", async () => {
  vi.mocked(findCompanyById).mockResolvedValue(null);

  await expect(
    updateCompanyProfileForAdmin("missing-company", {
      bodyText: "Some text",
    })
  ).rejects.toMatchObject({
    message: "Not found",
    status: 404,
  });

  expect(upsertCompanyProfile).not.toHaveBeenCalled();
});

test("empty bodyText deletes the company profile", async () => {
  await updateCompanyProfileForAdmin("company-1", {
    bodyText: "",
  });

  expect(deleteCompanyProfile).toHaveBeenCalledWith("company-1");
  expect(upsertCompanyProfile).not.toHaveBeenCalled();
});
