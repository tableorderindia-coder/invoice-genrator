import { describe, expect, it } from "vitest";

import {
  buildAvailableTeamNames,
  employeeMatchesTeamName,
  getMatchingEmployeesForTeam,
} from "./team-catalog";

describe("team catalog", () => {
  it("merges master teams and employee default teams without duplicates", () => {
    expect(
      buildAvailableTeamNames({
        masterTeamNames: ["Data Engineering", "Finance"],
        employeeDefaultTeams: ["finance", "Data Engineering", "Operations"],
      }),
    ).toEqual(["Data Engineering", "Finance", "Operations"]);
  });

  it("matches employee default teams case-insensitively", () => {
    expect(employeeMatchesTeamName(" data engineering ", "Data Engineering")).toBe(true);
    expect(employeeMatchesTeamName("Finance", "Data Engineering")).toBe(false);
  });

  it("returns all employees whose default team matches the selected team", () => {
    expect(
      getMatchingEmployeesForTeam({
        teamName: "Finance",
        employees: [
          { id: "emp_1", defaultTeam: "finance" },
          { id: "emp_2", defaultTeam: "Data Engineering" },
          { id: "emp_3", defaultTeam: "Finance " },
        ],
      }).map((employee) => employee.id),
    ).toEqual(["emp_1", "emp_3"]);
  });
});
