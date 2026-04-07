import type { InvoiceDetail } from "./types";

export function resolveSelectedTeam(
  teams: InvoiceDetail["teams"],
  requestedTeamId?: string,
) {
  if (teams.length === 0) {
    return undefined;
  }

  if (requestedTeamId) {
    const requestedTeam = teams.find((team) => team.id === requestedTeamId);
    if (requestedTeam) {
      return requestedTeam;
    }
  }

  return teams[0];
}
