// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Page from "../src/app/page";

let release: () => void;
function blockingStream() {
  let sent = false;
  return {
    getReader() {
      return {
        read: () =>
          new Promise((resolve) => {
            if (sent) return resolve({ value: undefined, done: true });
            sent = true;
            release = () =>
              resolve({ value: new TextEncoder().encode("data: hi\n\n"), done: false });
          }),
      };
    },
  };
}

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (url === "/api/conversations") return { json: async () => [] };
      return { body: blockingStream() };
    })
  );
});

it("sends via button and shows a loading indicator while streaming", async () => {
  render(<Page />);
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "hey" } });
  fireEvent.click(screen.getByRole("button", { name: "전송" }));
  expect(await screen.findByText("응답 받는 중...")).toBeTruthy();
  release();
  await waitFor(() => expect(screen.queryByText("응답 받는 중...")).toBeNull());
});
