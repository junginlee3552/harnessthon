// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import Page from "../src/app/page";

beforeEach(() => {
  vi.restoreAllMocks();
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ json: async () => [] }));
});

it("disables send button when input is empty", () => {
  render(<Page />);
  expect((screen.getByText("전송") as HTMLButtonElement).disabled).toBe(true);
});
