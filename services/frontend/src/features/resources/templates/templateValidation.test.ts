import { describe, expect, it } from "vitest";
import { validateTemplateInput } from "./templateValidation";

describe("template validation", () => {
  it("fails on invalid env JSON", () => {
    const error = validateTemplateInput({
      code: "fastpanel",
      name: "FastPanel",
      osName: "Ubuntu",
      envJSON: "{invalid}",
      sshPublicKey: "",
      bootstrapScript: "#!/usr/bin/env bash"
    });
    expect(error).toBe("ENV JSON must be valid JSON");
  });

  it("fails on invalid ssh key prefix", () => {
    const error = validateTemplateInput({
      code: "fastpanel",
      name: "FastPanel",
      osName: "Ubuntu",
      envJSON: "{\"APP_ENV\":\"prod\"}",
      sshPublicKey: "abc-rsa ...",
      bootstrapScript: "#!/usr/bin/env bash"
    });
    expect(error).toBe("SSH public key must start with ssh-");
  });

  it("accepts valid template input", () => {
    const error = validateTemplateInput({
      code: "fastpanel-1",
      name: "FastPanel",
      osName: "Ubuntu",
      envJSON: "{\"APP_ENV\":\"prod\"}",
      sshPublicKey: "ssh-rsa AAAAB3Nza",
      bootstrapScript: "#!/usr/bin/env bash"
    });
    expect(error).toBeNull();
  });
});
