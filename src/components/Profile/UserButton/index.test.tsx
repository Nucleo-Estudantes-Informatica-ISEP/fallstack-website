import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import type { SessionDto } from "@/application/dto/sessionDto";

import UserButton from ".";

const linkHref = () => screen.getByRole("link").getAttribute("href");

test("links an EMPLOYEE to the dashboard", () => {
  const user: SessionDto = { role: "EMPLOYEE", adminRole: null, student: null };
  render(<UserButton user={user} />);
  expect(linkHref()).toBe("/dashboard");
});

test("links a STUDENT with a profile to their student page", () => {
  const user: SessionDto = {
    role: "STUDENT",
    adminRole: null,
    student: { code: "s1", name: "Jane" },
  };
  render(<UserButton user={user} />);
  expect(linkHref()).toBe("/student/s1");
});

test("links a STUDENT with no profile yet back into signup", () => {
  const user: SessionDto = { role: "STUDENT", adminRole: null, student: null };
  render(<UserButton user={user} />);
  expect(linkHref()).toBe("/signup");
});

test("links an admin to the backoffice instead of signup, even though role is null", () => {
  const user: SessionDto = { role: null, adminRole: "ADMIN", student: null };
  render(<UserButton user={user} />);
  expect(linkHref()).toBe("/overview");
});

test("links a super admin to the backoffice too", () => {
  const user: SessionDto = {
    role: null,
    adminRole: "SUPER_ADMIN",
    student: null,
  };
  render(<UserButton user={user} />);
  expect(linkHref()).toBe("/overview");
});

test("defaults to a white icon, for TopBar's usual dark background", () => {
  const user: SessionDto = { role: "EMPLOYEE", adminRole: null, student: null };
  render(<UserButton user={user} />);
  expect(screen.getByRole("link").className).toContain("fill-white");
});

test("uses a dark icon in light mode, for the admin backoffice's light background", () => {
  const user: SessionDto = { role: null, adminRole: "ADMIN", student: null };
  render(<UserButton user={user} light />);
  const className = screen.getByRole("link").className;
  expect(className).toContain("fill-gray-700");
  expect(className).not.toContain("fill-white");
});
