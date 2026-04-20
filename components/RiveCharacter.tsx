"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
  type ForwardedRef,
} from "react";
import { useRive, useStateMachineInput } from "@rive-app/react-canvas";

import {
  fireRiveTrigger,
  getLookValue,
  resolveStateMachineName,
  setRiveBoolean,
  setRiveNumber,
} from "@/src/features/auth/login-rive";

export type RiveCharacterHandle = {
  updateLook: (value: string) => void;
  setChecking: (value: boolean) => void;
  setHandUp: (value: boolean) => void;
  fireSuccess: () => void;
  fireFail: () => void;
};

function RiveCharacterComponent(
  _: object,
  ref: ForwardedRef<RiveCharacterHandle>,
) {
  const [stateMachineName, setStateMachineName] = useState("State Machine 1");

  const { rive, RiveComponent } = useRive({
    src: "/login_character.riv",
    autoplay: true,
    stateMachines: "State Machine 1",
    onRiveReady: (instance) => {
      setStateMachineName(resolveStateMachineName(instance));
    },
  });

  useEffect(() => {
    if (!rive) {
      return;
    }

    if (!rive.playingStateMachineNames.includes(stateMachineName)) {
      rive.reset({ stateMachines: stateMachineName, autoplay: true });
    }
  }, [rive, stateMachineName]);

  const numLook = useStateMachineInput(rive, stateMachineName, "numLook");
  const isHandUp = useStateMachineInput(rive, stateMachineName, "isHandUp");
  const isCheking = useStateMachineInput(rive, stateMachineName, "isCheking");
  const trigSuccess = useStateMachineInput(rive, stateMachineName, "trigSuccess");
  const trigFail = useStateMachineInput(rive, stateMachineName, "trigFail");

  useImperativeHandle(
    ref,
    () => ({
      updateLook(value: string) {
        setRiveNumber(numLook, getLookValue(value));
      },
      setChecking(value: boolean) {
        setRiveBoolean(isCheking, value);
      },
      setHandUp(value: boolean) {
        setRiveBoolean(isHandUp, value);
      },
      fireSuccess() {
        fireRiveTrigger(trigSuccess);
      },
      fireFail() {
        fireRiveTrigger(trigFail);
      },
    }),
    [isCheking, isHandUp, numLook, trigFail, trigSuccess],
  );

  return (
    <div className="flex h-[220px] items-center justify-center overflow-hidden">
      <RiveComponent className="h-full w-full" aria-label="Login character" />
    </div>
  );
}

export const RiveCharacter = forwardRef(RiveCharacterComponent);
