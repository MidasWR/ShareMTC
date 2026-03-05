// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchJSON } from "./http";
import { setSession } from "./auth";

function encode(data: object) {
  return btoa(JSON.stringify(data)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function makeToken(payload: object) {
  return `x.${encode(payload)}.y`;
}

function mockJsonResponse(status: number, payload: object): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

describe("fetchJSON auth session behavior", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("keeps session on 401 for admin direct login", async () => {
    setSession(makeToken({ exp: Math.floor(Date.now() / 1000) + 120, role: "user" }), { id: "u1", role: "user" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockJsonResponse(401, { error: "invalid admin credentials" })));

    await expect(fetchJSON("/v1/auth/admin/direct", { method: "POST" })).rejects.toThrow("invalid admin credentials");
    expect(localStorage.getItem("host_token")).toBeTruthy();
    expect(localStorage.getItem("host_user")).toBeTruthy();
  });

  it("clears session on 401 for protected api", async () => {
    setSession(makeToken({ exp: Math.floor(Date.now() / 1000) + 120, role: "user" }), { id: "u1", role: "user" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockJsonResponse(401, { error: "unauthorized" })));

    await expect(fetchJSON("/v1/admin/providers/")).rejects.toThrow("unauthorized");
    expect(localStorage.getItem("host_token")).toBeNull();
    expect(localStorage.getItem("host_user")).toBeNull();
  });

  it("keeps session on 403 for protected api", async () => {
    setSession(makeToken({ exp: Math.floor(Date.now() / 1000) + 120, role: "user" }), { id: "u1", role: "user" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockJsonResponse(403, { error: "forbidden" })));

    await expect(fetchJSON("/v1/admin/providers/")).rejects.toThrow("forbidden");
    expect(localStorage.getItem("host_token")).toBeTruthy();
    expect(localStorage.getItem("host_user")).toBeTruthy();
  });
});
