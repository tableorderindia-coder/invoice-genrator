import type {
  ForwardRefExoticComponent,
  InputHTMLAttributes,
  RefAttributes,
} from "react";

export type PasswordInputProps = InputHTMLAttributes<HTMLInputElement>;

declare const PasswordInput: ForwardRefExoticComponent<
  PasswordInputProps & RefAttributes<HTMLInputElement>
>;

export default PasswordInput;
