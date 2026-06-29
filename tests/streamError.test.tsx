// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Page from "../src/app/page";

function streamFrom(chunks: string[]) {
  let i = 0;
  return {
    getReader() {
      return {
        read: async () =>
          i < chunks.length
            ? { value: new TextEncoder().encode(chunks[i++]), done: false }
            : { value: undefined, done: true },
      };
    },
  };
}

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (url === "/api/conversations") return { json: async () => [] };
      return { body: streamFrom(["data: Par\n\n", "data: tial\n\n", "event: error\n\n"]) };
    })
  );
});

it("shows an error notice when the stream ends with an error", async () => {
  render(<Page />);
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "hi" } });
  fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter" });
  await screen.findByText(/Partial/);
  expect(await screen.findByText(/응답이 중단되었습니다/)).toBeTruthy();
});
