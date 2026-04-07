import { describe, expect, it } from "vitest";

import {
  findExistingLineItemForEmployee,
  filterEligibleEmployeesForTeam,
} from "./member-assignment";

describe("member assignment", () => {
  it("excludes members already in the current invoice team from add-member options", () => {
    const eligible = filterEligibleEmployeesForTeam({
      employees: [
        { id: "emp_1", fullName: "Pawan" },
        { id: "emp_2", fullName: "Riya" },
      ],
      currentTeamMemberIds: ["emp_1"],
    });

    expect(eligible.map((employee) => employee.id)).toEqual(["emp_2"]);
  });

  it("finds an existing invoice line item for an employee across teams", () => {
    expect(
      findExistingLineItemForEmployee({
        employeeId: "emp_2",
        teams: [
          {
            id: "team_1",
            lineItems: [{ id: "line_1", employeeId: "emp_1" }],
          },
          {
            id: "team_2",
            lineItems: [{ id: "line_2", employeeId: "emp_2" }],
          },
        ],
      }),
    ).toEqual({
      teamId: "team_2",
      lineItemId: "line_2",
    });
  });
});
