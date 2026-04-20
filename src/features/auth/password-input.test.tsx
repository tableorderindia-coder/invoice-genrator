// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("@supabase/ssr", () => ({
  createBrowserClient: () => ({
    auth: {
      signInWithPassword: vi.fn(),
    },
    from: vi.fn(),
  }),
}));

vi.mock("../../../components/RiveCharacter", () => ({
  RiveCharacter: () => <div data-testid="rive-character" />,
}));

import PasswordInput from "../../../components/PasswordInput";
import { LoginForm } from "../../../components/LoginForm";

describe("password input", () => {
  it("toggles the password visibility without losing the entered value", () => {
    render(
      <PasswordInput
        value="super-secret"
        onChange={() => {}}
        placeholder="Password"
      />,
    );

    const input = screen.getByPlaceholderText("Password");
    expect(input).toHaveAttribute("type", "password");

    fireEvent.click(screen.getByRole("button", { name: /show password/i }));
    expect(input).toHaveAttribute("type", "text");
    expect(input).toHaveValue("super-secret");

    fireEvent.click(screen.getByRole("button", { name: /hide password/i }));
    expect(input).toHaveAttribute("type", "password");
  });
});

describe("login form", () => {
  it("renders the console login title and action copy", () => {
    render(
      <LoginForm
        supabaseUrl="https://example.supabase.co"
        supabaseKey="anon-key"
      />,
    );

    expect(screen.getByText("EassyOnboard Console")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Login" })).toBeInTheDocument();
    expect(screen.getByText("EasyOnboard Console Login")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Login" })).toBeInTheDocument();
  });
});
