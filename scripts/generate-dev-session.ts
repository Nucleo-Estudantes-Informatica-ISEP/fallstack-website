import jwt from "jsonwebtoken";

// Uses local development secrets from .env / .env.example
const secret =
  process.env.AUTH_SECRET ||
  "local-auth-secret-for-fallstack-development-32chars";
const cookieName = "@Fallstack26:auth";

function createSessionToken(identity: {
  sub: string;
  email: string;
  name?: string;
  employee: boolean;
  admin: boolean;
}) {
  return jwt.sign(
    {
      sub: identity.sub,
      email: identity.email,
      name: identity.name,
      employee: identity.employee,
      admin: identity.admin,
    },
    secret,
    {
      algorithm: "HS256",
      issuer: "fallstack",
      audience: "fallstack-web",
      expiresIn: "7d",
    }
  );
}

const studentToken = createSessionToken({
  sub: "local-student",
  email: "student@test.pt",
  name: "Student",
  employee: false,
  admin: false,
});

const employeeToken = createSessionToken({
  sub: "local-armis",
  email: "armis@test.pt",
  name: "Armis",
  employee: true,
  admin: false,
});

const adminToken = createSessionToken({
  sub: "local-admin",
  email: "admin@example.com",
  name: "Admin",
  employee: false,
  admin: true,
});

console.log("=== Fallstack Local Dev Authentication Tokens ===\n");

console.log("🎓 Student (code A123):");
console.log(`URL: http://localhost:3000/student/A123`);
console.log(`Cookie: ${cookieName}=${studentToken}\n`);

console.log("🏢 Company Employee (Armis):");
console.log(`URL: http://localhost:3000/dashboard`);
console.log(`Cookie: ${cookieName}=${employeeToken}\n`);

console.log("🛡️ Admin:");
console.log(`URL: http://localhost:3000/students`);
console.log(`Cookie: ${cookieName}=${adminToken}\n`);

console.log("Tip: Open your browser Console (F12) on localhost:3000 and run:");
console.log(
  `document.cookie = "${cookieName}=${studentToken}; path=/; max-age=604800";`
);
