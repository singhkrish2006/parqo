const KEY = "parqo:device-id";

/** A per-browser pseudonymous id — not tied to any account. Used only to
 * tell "the same device reported twice" apart from "two different people
 * agree", for lightweight report corroboration. */
export function getDeviceId(): string {
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return "unknown-device";
  }
}
