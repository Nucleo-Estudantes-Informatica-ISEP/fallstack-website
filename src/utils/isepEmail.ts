export const ISEP_EMAIL_DOMAIN = "isep.ipp.pt";

const ISEP_EMAIL_REGEX = new RegExp(
  `^(?:[0-9]{7}|[a-z]{3})@${ISEP_EMAIL_DOMAIN.replaceAll(".", "\\.")}$`,
  "i"
);

export const isIsepEmail = (email: string): boolean =>
  ISEP_EMAIL_REGEX.test(email.trim());


