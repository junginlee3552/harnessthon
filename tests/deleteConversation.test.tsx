// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Page from "../src/app/page";

let calls: { url: string; method?: string }[] = [];
let list = [
  { id: "c1", title: "first", createdAt: "" },
  { id: "c2", title: "second", createdAt: "" },
];

beforeEach(() => {
  calls = [];
  list = [
    { id: "c1", title: "first", createdAt: "" },
    { id: "c2", title: "second", createdAt: "" },
  ];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, opts?: { method?: string }) => {
      calls.push({ url, method: opts?.method });
      if (url === "/api/conversations") return { json: async () => list };
      if (opts?.method === "DELETE") {
        list = list.filter((c) => c.id !== "c1");
        return { ok: true };
      }
      return { json: async () => [] };
    })
  );
});

it("deletes a conversation and removes it from the sidebar", async () => {
  render(<Page />);
  await screen.findByRole("button", { name: "first" });
  fireEvent.click(screen.getByRole("button", { name: "삭제 first" }));
  await waitFor(() => expect(screen.queryByRole("button", { name: "first" })).toBeNull());
  expect(calls.some((c) => c.url === "/api/conversations/c1" && c.method === "DELETE")).toBe(true);
});
