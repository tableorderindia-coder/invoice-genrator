export function employeeStatusLabel(employee: { fullName: string; isActive?: boolean }) {
  return employee.isActive === false ? `${employee.fullName} (Inactive)` : employee.fullName;
}
