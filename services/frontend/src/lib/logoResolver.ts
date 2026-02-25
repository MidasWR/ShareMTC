function normalize(value: string): string {
  return value.trim().toLowerCase();
}

export function resolveTemplateLogoURL(code: string, name: string): string {
  const key = `${normalize(code)} ${normalize(name)}`;
  if (key.includes("fastpanel")) return "/logos/fastpanel.svg";
  if (key.includes("aapanel")) return "/logos/aapanel.svg";
  return "/logos/sharemtc-mark.svg";
}

export function resolvePodLogoURL(code: string, gpuModel: string): string {
  const key = `${normalize(code)} ${normalize(gpuModel)}`;
  if (key.includes("nvidia") || key.includes("rtx") || key.includes("a6000") || key.includes("a5000")) {
    return "/logos/sharemtc-mark.svg";
  }
  return "/logos/sharemtc-mark.svg";
}
