// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

vi.mock("../src/server/identity", () => ({ currentUser: () => "u1" }));

describe("markdown rendering", () => {
  beforeEach(() => {
    (globalThis as any).fetch = vi.fn(async () => ({
      ok: true,
      json: async () => [],
    }));
  });

  it("renders assistant **bold** as a strong element", async () => {
    const { renderMarkdown } = await import("../src/app/markdown");
    render(React.createElement("div", null, renderMarkdown("hello **world**")));
    const strong = document.querySelector("strong");
    expect(strong).not.toBeNull();
    expect(strong!.textContent).toBe("world");
  });

  it("renders inline `code` as a code element", async () => {
    const { renderMarkdown } = await import("../src/app/markdown");
    render(React.createElement("div", null, renderMarkdown("run `npm test` now")));
    const code = document.querySelector("code");
    expect(code).not.toBeNull();
    expect(code!.textContent).toBe("npm test");
  });
});
