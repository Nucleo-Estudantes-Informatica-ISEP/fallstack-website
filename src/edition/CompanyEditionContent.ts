import { ModalInformation } from "@/types/ModalProps";

/**
 * Per-company content that stays code-authored even though the roster
 * (which companies exist, their tier, logo, website, and display order)
 * now lives in the DB - rich modal content (JSX bodyText, social links,
 * facts with icon components) isn't safely DB-editable content. Looked
 * up by company name against the DB roster; see findEditionContentByName.
 */
export interface CompanyEditionContent {
  name: string;
  modalInformation?: ModalInformation;
  interests?: string[];
  className?: string;
  logoWidth?: number;
  logoHeight?: number;
}
