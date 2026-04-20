import { describe, expect, it } from "vitest";

import { getLookValue, resolveStateMachineName } from "./login-rive";

describe("login rive helpers", () => {
  it("prefers State Machine 1 when it exists", () => {
    expect(
      resolveStateMachineName({
        stateMachineNames: ["Idle", "State Machine 1", "Login"],
      }),
    ).toBe("State Machine 1");
  });

  it("falls back to the first discovered state machine", () => {
    expect(
      resolveStateMachineName({
        stateMachineNames: [],
        contents: {
          artboards: [
            {
              stateMachines: [{ name: "Auth Machine" }, { name: "Backup" }],
            },
          ],
        },
      }),
    ).toBe("Auth Machine");
  });

  it("returns the prompt-driven look value with a safe cap", () => {
    expect(getLookValue("a")).toBe(2);
    expect(getLookValue("abcdefghij")).toBe(20);
    expect(getLookValue("a".repeat(80))).toBe(100);
  });
});
