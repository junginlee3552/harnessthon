// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Page from "../src/app/page";

beforeEach(() => {
  vi.restoreAllMocks();
});

it("sends the selected model in the chat request body", async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce({ json: async () => [] })
    .mockResolvedValueOnce({
      body: { getReader: () => ({ read: async () => ({ done: true, value: undefined }) }) },
    })
    .mockResolvedValueOnce({ json: async () => [] });
  vi.stubGlobal("fetch", fetchMock);

  render(<Page />);
  fireEvent.change(screen.getByLabelText("모델"), { target: { value: "gpt-4o" } });
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "hello" } });
  fireEvent.click(screen.getByText("전송"));

  await waitFor(() => {
    const chatCall = fetchMock.mock.calls.find((c) => c[0] === "/api/chat");
    expect(JSON.parse(chatCall![1].body).model).toBe("gpt-4o");
  });
});
