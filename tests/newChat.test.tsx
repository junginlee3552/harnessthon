// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Page from "../src/app/page";

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (url === "/api/conversations") {
        return { json: async () => [{ id: "c1", title: "old chat", createdAt: "" }] };
      }
      if (url === "/api/conversations/c1") {
        return { json: async () => [{ role: "user", content: "hello there" }] };
      }
      return { json: async () => [] };
    })
  );
});

it("clears messages when starting a new chat", async () => {
  render(<Page />);
  const open = await screen.findByRole("button", { name: "old chat" });
  fireEvent.click(open);
  await screen.findByText(/hello there/);

  fireEvent.click(screen.getByRole("button", { name: "새 대화" }));
  expect(screen.queryByText(/hello there/)).toBeNull();
  expect(screen.getByText("무엇이든 물어보세요")).toBeTruthy();
});
