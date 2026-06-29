import { randomUUID } from "crypto";

export function resolveClientId(cookieValue: string | undefined) {
  return cookieValue
    ? { clientId: cookieValue, isNew: false }
    : { clientId: randomUUID(), isNew: true };
}
