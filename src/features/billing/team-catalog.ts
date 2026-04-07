import { normalizeForDuplicateCheck } from "./duplicate-guards";

export function employeeMatchesTeamName(
  employeeDefaultTeam: string,
  teamName: string,
) {
  return normalizeForDuplicateCheck(employeeDefaultTeam) === normalizeForDuplicateCheck(teamName);
}

export function buildAvailableTeamNames(input: {
  masterTeamNames: string[];
  employeeDefaultTeams: string[];
}) {
  const teamNames = [...input.masterTeamNames, ...input.employeeDefaultTeams];
  const uniqueNames = new Map<string, string>();

  for (const teamName of teamNames) {
    const normalized = normalizeForDuplicateCheck(teamName);
    if (!normalized || uniqueNames.has(normalized)) {
      continue;
    }

    uniqueNames.set(normalized, teamName.trim().replace(/\s+/g, " "));
  }

  return [...uniqueNames.values()].sort((left, right) => left.localeCompare(right));
}

export function getMatchingEmployeesForTeam<T extends { defaultTeam: string }>(input: {
  teamName: string;
  employees: T[];
}) {
  return input.employees.filter((employee) =>
    employeeMatchesTeamName(employee.defaultTeam, input.teamName),
  );
}
