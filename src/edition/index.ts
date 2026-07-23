import { actions } from "./actions";
import { branding } from "./branding";
import { FAQ } from "./FAQ";

export { default as findEditionContentByName } from "./CompanyByName";

export const edition = {
  branding,
  actions,
  faq: FAQ,
};
