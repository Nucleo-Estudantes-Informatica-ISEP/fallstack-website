import { actions } from "./actions";
import { branding } from "./branding";
import { ScheduleDays } from "./ScheduleDays";

export { default as findEditionContentByName } from "./CompanyByName";

export const edition = {
  branding,
  actions,
  schedule: ScheduleDays,
};
