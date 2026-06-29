// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Page from "../src/app/page";

beforeEach(() => {
  vi.restoreAllMocks();
});

it("renames a conversation via inline edit", async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce({
      json: async () => [{ id: "c1", title: "old title", createdAt: "" }],
    }) // initial list
    .mockResolvedValueOnce({ status: 200 }) // PATCH
    .mockResolvedValueOnce({
      json: async () => [{ id: "c1", title: "new title", createdAt: "" }],
    }); // refresh
  vi.stubGlobal("fetch", fetchMock);

  render(<Page />);
  await screen.findByText("old title");

  fireEvent.click(screen.getByLabelText("이름 변경 old title"));
  const field = screen.getByDisplayValue("old title");
  fireEvent.change(field, { target: { value: "new title" } });
  fireEvent.submit(field);

  await waitFor(() => {
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/conversations/c1",
      expect.objectContaining({ method: "PATCH" })
    );
  });
  await screen.findByText("new title");
});
