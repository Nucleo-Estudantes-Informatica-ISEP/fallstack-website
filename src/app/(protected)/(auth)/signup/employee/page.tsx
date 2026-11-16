import { redirect } from "next/navigation";

// Employee registration moved into a modal on the login page (issue #293)
// - this route stays only so old bookmarks/links land somewhere useful,
// auto-opening that modal via the "modal" query param LoginPage checks for.
const EmployeeSignupRedirect = () => {
  redirect("/login?modal=employee");
};

export default EmployeeSignupRedirect;
