import { describe, it, expect } from "vitest";
import { resolveClientId } from "../src/server/identity";

it("keeps existing clientId", () => {
  expect(resolveClientId("xyz")).toEqual({ clientId: "xyz", isNew: false });
});
it("mints new clientId when absent", () => {
  const r = resolveClientId(undefined);
  expect(r.isNew).toBe(true);
  expect(r.clientId.length).toBeGreaterThan(0);
});
