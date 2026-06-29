// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import Page from "../src/app/page";

vi.mock("../src/server/identity", () => ({ currentUser: () => "u1" }));

function mkFetch() {
  return vi.fn(async (url: string) => {
    if (typeof url === "string" && url.startsWith("/api/conversations")) {
      return { ok: true, json: async () => [] };
    }
    return { ok: true, body: { getReader: () => ({ read: () => new Promise(() => {}) }) } };
  });
}

describe("enter to send", () => {
  beforeEach(() => {
    (globalThis as any).fetch = mkFetch();
  });

  it("Enter sends, Shift+Enter does not", async () => {
    render(<Page />);
    const ta = document.querySelector("textarea")!;
    fireEvent.change(ta, { target: { value: "hello" } });
    fireEvent.keyDown(ta, { key: "Enter", shiftKey: true });
    expect((globalThis as any).fetch).not.toHaveBeenCalledWith("/api/chat", expect.anything());
    fireEvent.keyDown(ta, { key: "Enter" });
    await waitFor(() =>
      expect((globalThis as any).fetch).toHaveBeenCalledWith("/api/chat", expect.anything())
    );
  });
});
