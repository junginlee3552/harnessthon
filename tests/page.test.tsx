// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Page from "../src/app/page";

it("shows empty-state hint and an input", () => {
  render(<Page />);
  expect(screen.getByText(/무엇이든 물어보세요/)).toBeTruthy();
  expect(screen.getByRole("textbox")).toBeTruthy();
});
