// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Page from "../src/app/page";

beforeEach(() => {
  vi.restoreAllMocks();
});

it("copies the assistant reply to the clipboard", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.assign(navigator, { clipboard: { writeText } });

  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce({ json: async () => [] })
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
      .mockResolvedValueOnce({ json: async () => [] })
  );

  render(<Page />);
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "hello" } });
  fireEvent.click(screen.getByText("전송"));

  const btn = await screen.findByLabelText("복사");
  fireEvent.click(btn);
  expect(writeText).toHaveBeenCalledWith("hi");
});
