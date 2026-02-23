// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { clearSession, getRole, isTokenValid, setSession } from "./auth";

function encode(data: object) {
  return btoa(JSON.stringify(data)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function makeToken(payload: object) {
  return `x.${encode(payload)}.y`;
}

describe("auth session helpers", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("reads role from stored user profile", () => {
    setSession(makeToken({ exp: Math.floor(Date.now() / 1000) + 120, role: "user" }), { id: "u1", role: "super-admin" });
    expect(getRole()).toBe("super-admin");
  });

  it("validates token expiration and clears session", () => {
    setSession(makeToken({ exp: Math.floor(Date.now() / 1000) - 10, role: "user" }), { id: "u1", role: "user" });
    expect(isTokenValid()).toBe(false);
    clearSession();
    expect(getRole()).toBe("guest");
  });
});
