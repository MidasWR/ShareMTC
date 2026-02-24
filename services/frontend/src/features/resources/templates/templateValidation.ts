type TemplateInput = {
  code: string;
  name: string;
  osName: string;
  envJSON: string;
  sshPublicKey: string;
  bootstrapScript: string;
};

export function validateTemplateInput(input: TemplateInput): string | null {
  if (!input.code.trim()) return "Template code is required";
  if (!/^[a-z0-9-]+$/.test(input.code.trim())) return "Template code must contain lowercase letters, numbers, or hyphen";
  if (!input.name.trim()) return "Template name is required";
  if (!input.osName.trim()) return "OS name is required";
  if (!input.bootstrapScript.trim()) return "Bootstrap script is required";
  try {
    JSON.parse(input.envJSON);
  } catch {
    return "ENV JSON must be valid JSON";
  }
  if (input.sshPublicKey.trim() && !input.sshPublicKey.trim().startsWith("ssh-")) {
    return "SSH public key must start with ssh-";
  }
  return null;
}
