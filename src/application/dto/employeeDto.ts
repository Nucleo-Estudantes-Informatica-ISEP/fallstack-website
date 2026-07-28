export interface AdminEmployeeDto {
  id: string;
  name: string;
  linkedin: string | null;
  active: boolean;
  email: string;
  companyId: string;
  companyName: string;
}

export const toAdminEmployeeDto = (employee: {
  id: string;
  name: string;
  linkedin: string | null;
  user: { email: string; active: boolean };
  company: { id: string; name: string };
}): AdminEmployeeDto => ({
  id: employee.id,
  name: employee.name,
  linkedin: employee.linkedin,
  active: employee.user.active,
  email: employee.user.email,
  companyId: employee.company.id,
  companyName: employee.company.name,
});
