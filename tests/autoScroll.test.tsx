// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Page from "../src/app/page";

beforeEach(() => {
  vi.restoreAllMocks();
});

it("scrolls to the newest message after sending", async () => {
  const scrollSpy = vi.fn();
  Element.prototype.scrollIntoView = scrollSpy;

  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce({ json: async () => [] }) // initial list
      .mockResolvedValueOnce({
        body: {
          getReader: () => {
            let done = false;
            return {
              read: async () => {
                if (done) return { done: true, value: undefined };
                done = true;
                return { done: false, value: new TextEncoder().encode("data: hi\n\n") };
              },
            };
          },
        },
      })
      .mockResolvedValueOnce({ json: async () => [] }) // refresh
  );

  render(<Page />);
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "hello" } });
  fireEvent.click(screen.getByText("전송"));

  await waitFor(() => expect(scrollSpy).toHaveBeenCalled());
});
