declare const emailBrand: unique symbol;

export type Email = string & {
  readonly [emailBrand]: true;
};

// RFC-derived length limits, shared across create() and createInDomain()
const MAX_EMAIL_LENGTH = 254;
const MAX_LOCAL_PART_LENGTH = 64;
const MAX_DOMAIN_LENGTH = 253;

// Validates standard structure and prevents consecutive/trailing dots
const EMAIL_REGEX =
  /^[A-Za-z0-9_%+-]+(?:\.[A-Za-z0-9_%+-]+)*@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63}$/;

export const Email = {
  // Creates and validates a standard email address
  create(address: string): Email {
    const normalized = normalize(address);

    // Check total length
    if (normalized.length > MAX_EMAIL_LENGTH) {
      throw new Error("Email length exceeds the maximum of 254 characters.");
    }

    // Check structural format
    if (!EMAIL_REGEX.test(normalized)) {
      throw new Error("Invalid email format.");
    }

    const [localPart, domainPart] = normalized.split("@");

    // Check local part length
    if (localPart.length > MAX_LOCAL_PART_LENGTH) {
      throw new Error("Local part exceeds the maximum of 64 characters.");
    }

    // Check domain part length
    if (domainPart.length > MAX_DOMAIN_LENGTH) {
      throw new Error("Domain length exceeds 253 characters.");
    }

    return normalized as Email;
  },

  // Creates an email and ensures it belongs to a specific domain
  createInDomain(address: string, domain: string): Email {
    const normalizedDomain = normalize(domain);
    let normalizedAddress = normalize(address);


    // Append domain if only local part is provided
    if (!normalizedAddress.includes("@") || normalizedAddress.endsWith("@")) {
      const cleanAddress = normalizedAddress.replace(/@$/, "");
      normalizedAddress = `${cleanAddress}@${normalizedDomain}`;
    }

    // Extract and compare domains
    const emailDomain = normalizedAddress.substring(normalizedAddress.lastIndexOf("@") + 1);
    if (emailDomain !== normalizedDomain) {
      throw new Error(`Email must belong to '${normalizedDomain}'.`);
    }

    // Delegate remaining validations
    return Email.create(normalizedAddress);
  },
};

function normalize(address: string): string {
  return address.trim().toLowerCase();
}