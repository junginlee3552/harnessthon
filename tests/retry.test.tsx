// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import Page from "../src/app/page";

vi.mock("../src/server/identity", () => ({ currentUser: () => "u1" }));

describe("error retry", () => {
  beforeEach(() => {
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (typeof url === "string" && url.startsWith("/api/conversations")) {
        return { ok: true, json: async () => [] };
      }
      const body = "event: error\n\n";
      let sent = false;
      return {
        ok: true,
        body: {
          getReader: () => ({
            read: async () =>
              sent
                ? { done: true, value: undefined }
                : ((sent = true), { done: false, value: new TextEncoder().encode(body) }),
          }),
        },
      };
    });
  });

  it("shows 재시도 after a stream error and resends", async () => {
    render(<Page />);
    const ta = document.querySelector("textarea")!;
    fireEvent.change(ta, { target: { value: "hello" } });
    fireEvent.click(screen.getByText("전송"));
    const retry = await screen.findByText("재시도");
    fireEvent.click(retry);
    await waitFor(() =>
      expect((globalThis as any).fetch).toHaveBeenCalledWith("/api/chat", expect.anything())
    );
  });
});
