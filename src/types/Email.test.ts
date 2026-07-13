import assert from "node:assert/strict";
import test from "node:test";
import { Email } from "./Email";

test("Email.create - valid emails", () => {
  const valid = [
    "test@example.com",
    "user.name+tag@domain.co.uk",
    "a@b.co",
    "  spaces@around.com  "
  ];

  for (const addr of valid) {
    const email = Email.create(addr);
    assert.equal(email, addr.trim().toLowerCase());
  }
});

test("Email.create - invalid formats", () => {
  const invalid = [
    "plainaddress",
    "#@%^%#$@#$@#.com",
    "@example.com",
    "Joe Smith <email@example.com>",
    "email.example.com",
    "email@example@example.com",
    "email@example..com"
  ];

  for (const addr of invalid) {
    assert.throws(() => Email.create(addr), /Invalid email format/);
  }
});

test("Email.create - length constraints", () => {
  // Local part exceeds 64 chars
  const longLocal = "a".repeat(65) + "@example.com";
  assert.throws(() => Email.create(longLocal), /Local part exceeds the maximum/);

  // Total length exceeds 254
  const longEmail = "a".repeat(245) + "@example.com";
  assert.throws(() => Email.create(longEmail), /Email length exceeds the maximum/);
});

test("Email.createInDomain - domain matching", () => {
  // Appends domain if missing
  const email1 = Email.createInDomain("username", "example.com");
  assert.equal(email1, "username@example.com");

  // Validates matching domain
  const email2 = Email.createInDomain("username@example.com", "example.com");
  assert.equal(email2, "username@example.com");

  // Rejects different domain
  assert.throws(
    () => Email.createInDomain("username@wrong.com", "example.com"),
    /Email must belong to 'example.com'/
  );
});
