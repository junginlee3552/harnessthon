// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import Page from "../src/app/page";

afterEach(() => vi.restoreAllMocks());

it("lists conversations in the sidebar and loads one on click", async () => {
  const fetchMock = vi.fn(async (url: string) => {
    if (url === "/api/conversations") {
      return new Response(
        JSON.stringify([{ id: "c1", title: "첫 대화", createdAt: "" }]),
        { headers: { "content-type": "application/json" } }
      );
    }
    if (url === "/api/conversations/c1") {
      return new Response(
        JSON.stringify([
          { role: "user", content: "안녕" },
          { role: "assistant", content: "반가워" },
        ]),
        { headers: { "content-type": "application/json" } }
      );
    }
    throw new Error("unexpected url " + url);
  });
  vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

  render(<Page />);

  const item = await screen.findByText("첫 대화");
  fireEvent.click(item);

  await waitFor(() => expect(screen.getByText(/반가워/)).toBeTruthy());
});
