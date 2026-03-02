import { describe, expect, it } from "vitest";
import { translations } from "./index";

function flattenKeys(input: unknown, prefix = ""): string[] {
  if (input === null || typeof input !== "object") {
    return [prefix];
  }
  return Object.entries(input as Record<string, unknown>).flatMap(([key, value]) => {
    const nextPrefix = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === "object") {
      return flattenKeys(value, nextPrefix);
    }
    return [nextPrefix];
  });
}

describe("i18n dictionaries", () => {
  it("keeps en and ru key sets aligned", () => {
    const enKeys = flattenKeys(translations.en).sort();
    const ruKeys = flattenKeys(translations.ru).sort();
    expect(ruKeys).toEqual(enKeys);
  });
});
