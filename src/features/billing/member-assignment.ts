export function filterEligibleEmployeesForTeam<T extends { id: string }>(input: {
  employees: T[];
  currentTeamMemberIds: string[];
}) {
  const memberIds = new Set(input.currentTeamMemberIds);
  return input.employees.filter((employee) => !memberIds.has(employee.id));
}

export function findExistingLineItemForEmployee(input: {
  employeeId: string;
  teams: Array<{
    id: string;
    lineItems: Array<{ id: string; employeeId: string }>;
  }>;
}) {
  for (const team of input.teams) {
    const lineItem = team.lineItems.find((item) => item.employeeId === input.employeeId);
    if (lineItem) {
      return {
        teamId: team.id,
        lineItemId: lineItem.id,
      };
    }
  }

  return undefined;
}
