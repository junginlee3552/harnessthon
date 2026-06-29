// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import Page from "../src/app/page";

vi.mock("../src/server/identity", () => ({ currentUser: () => "u1" }));

describe("stop generation", () => {
  beforeEach(() => {
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (typeof url === "string" && url.startsWith("/api/conversations")) {
        return { ok: true, json: async () => [] };
      }
      // /api/chat: a stream that never ends until aborted
      return {
        ok: true,
        body: {
          getReader: () => ({ read: () => new Promise(() => {}) }),
        },
      };
    });
  });

  it("shows 중지 while sending and returns to 전송 after stop", async () => {
    render(<Page />);
    const inp = document.querySelector("textarea")!;
    fireEvent.change(inp, { target: { value: "hi" } });
    fireEvent.click(screen.getByText("전송"));
    const stop = await screen.findByText("중지");
    fireEvent.click(stop);
    await waitFor(() => expect(screen.getByText("전송")).toBeTruthy());
  });
});
