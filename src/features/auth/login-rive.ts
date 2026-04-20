type RiveContentsShape = {
  stateMachineNames?: string[];
  contents?: {
    artboards?: Array<{
      stateMachines?: Array<{
        name?: string;
      }>;
    }>;
  };
};

export function resolveStateMachineName(rive: RiveContentsShape | null | undefined) {
  if (!rive) {
    return "State Machine 1";
  }

  const directNames = rive.stateMachineNames ?? [];
  if (directNames.includes("State Machine 1")) {
    return "State Machine 1";
  }

  if (directNames[0]) {
    return directNames[0];
  }

  const discoveredName = rive.contents?.artboards
    ?.flatMap((artboard) => artboard.stateMachines ?? [])
    .find((stateMachine) => stateMachine.name)?.name;

  return discoveredName ?? "State Machine 1";
}

export function getLookValue(value: string) {
  return Math.min(value.length * 2, 100);
}

export function setRiveBoolean(
  input: { value: boolean | number } | null | undefined,
  value: boolean,
) {
  if (!input) {
    return;
  }

  input.value = value;
}

export function setRiveNumber(
  input: { value: boolean | number } | null | undefined,
  value: number,
) {
  if (!input) {
    return;
  }

  input.value = value;
}

export function fireRiveTrigger(input: { fire: () => void } | null | undefined) {
  input?.fire();
}
