import { expect, test } from "vitest";

import { toStudentSummaryDto } from "@/application/dto/studentDto";
import { socialLinksSchema } from "@/schemas/companyContentSchema";
import { patchStudentSchema } from "@/schemas/patchStudentSchema";

import { parseSocialLinks } from "./company/companyProfileContent";

test("accepts GitHub and LinkedIn profiles on their expected HTTPS hosts", () => {
  const links = {
    github: "https://github.com/fixture",
    linkedin: "https://pt.linkedin.com/in/fixture",
  };
  expect(patchStudentSchema.parse(links)).toEqual(links);
});

test("rejects unrelated platforms on writes and omits invalid stored links", () => {
  const links = {
    github: "https://profile.example.invalid/fixture",
    linkedin: "http://linkedin.com/in/fixture",
  };
  expect(patchStudentSchema.safeParse(links).success).toBe(false);
  expect(
    toStudentSummaryDto({
      ...links,
      id: "1",
      code: "AB12",
      name: "Student",
      bio: null,
      year: "LICENCIATURA_1",
      course: null,
      cv: null,
      cvPurgedAt: null,
      avatar: null,
    })
  ).toMatchObject({ github: null, linkedin: null });

  const social = {
    twitter: "https://x.com/fixture",
    youtube: "https://video.example.invalid/fixture",
  };
  expect(socialLinksSchema.safeParse(social).success).toBe(false);
  expect(parseSocialLinks(social)).toEqual({ twitter: social.twitter });
});
