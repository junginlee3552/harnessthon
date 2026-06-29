// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import Page from "../src/app/page";

afterEach(() => vi.restoreAllMocks());

function sseResponse(tokens: string[]) {
  const enc = new TextEncoder();
  let i = 0;
  return {
    body: {
      getReader: () => ({
        read: async () =>
          i < tokens.length
            ? { value: enc.encode(`data: ${tokens[i++]}\n\n`), done: false }
            : { value: undefined, done: true },
      }),
    },
  };
}

it("refreshes the sidebar after sending a message", async () => {
  let conversations: { id: string; title: string; createdAt: string }[] = [];
  const fetchMock = vi.fn(async (url: string) => {
    if (url === "/api/conversations") {
      return new Response(JSON.stringify(conversations), {
        headers: { "content-type": "application/json" },
      });
    }
    if (url === "/api/chat") {
      conversations = [{ id: "c1", title: "안녕", createdAt: "" }];
      return sseResponse(["반", "가워"]) as unknown as Response;
    }
    throw new Error("unexpected url " + url);
  });
  vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

  render(<Page />);
  const input = screen.getByRole("textbox") as HTMLInputElement;
  fireEvent.change(input, { target: { value: "안녕" } });
  fireEvent.keyDown(input, { key: "Enter" });

  await waitFor(() =>
    expect(screen.getByRole("button", { name: "안녕" })).toBeTruthy()
  );
});
