export function normalizeForDuplicateCheck(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export function assertNoCaseInsensitiveDuplicate(input: {
  existingValues: string[];
  candidateValue: string;
  entityLabel: string;
}) {
  const candidate = normalizeForDuplicateCheck(input.candidateValue);
  const hasDuplicate = input.existingValues.some(
    (value) => normalizeForDuplicateCheck(value) === candidate,
  );

  if (hasDuplicate) {
    throw new Error(`${input.entityLabel} already exists`);
  }
}

export function assertNoDuplicateEmployeeInTeam(input: {
  existingEmployeeIds: string[];
  employeeId: string;
}) {
  if (input.existingEmployeeIds.includes(input.employeeId)) {
    throw new Error("Candidate already exists in this team");
  }
}
