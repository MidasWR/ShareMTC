const DEFAULT_INSTALLER_URL = "https://github.com/MidasWR/ShareMTC/releases/latest/download/hostagent-node-installer.sh";
const DEFAULT_KAFKA_PORT = 9092;

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

export function withProviderInstallerURL(installerURL: string, providerID?: string): string {
  const base = installerURL.trim() || DEFAULT_INSTALLER_URL;
  if (!providerID?.trim()) return base;
  try {
    const next = new URL(base);
    next.searchParams.set("provider_id", providerID.trim());
    return next.toString();
  } catch {
    const separator = base.includes("?") ? "&" : "?";
    return `${base}${separator}provider_id=${encodeURIComponent(providerID.trim())}`;
  }
}

export function buildInstallCommand(rawCommand: string, rawInstallerURL: string, providerID?: string): { command: string; installerURL: string } {
  const installerURL = withProviderInstallerURL(rawInstallerURL, providerID);
  const safeProviderID = providerID?.trim() || "";
  let command = rawCommand.trim();
  if (!command) {
    const host = typeof window !== "undefined" ? window.location.hostname : "127.0.0.1";
    const kafkaBrokers = `${host}:${DEFAULT_KAFKA_PORT}`;
    command = `curl -fsSL ${shellQuote(installerURL)} | sudo KAFKA_BROKERS=${shellQuote(kafkaBrokers)} PROVIDER_ID='${safeProviderID || "provider-id"}' bash`;
    return { command, installerURL };
  }

  if (rawInstallerURL && rawInstallerURL.trim()) {
    command = command.replace(rawInstallerURL.trim(), installerURL);
  }
  if (!command.includes(installerURL)) {
    command = command.replace(/curl\s+-fsSL\s+('[^']*'|"[^"]*"|\S+)/, `curl -fsSL ${shellQuote(installerURL)}`);
  }

  if (safeProviderID) {
    if (/\bPROVIDER_ID=/.test(command)) {
      command = command.replace(/\bPROVIDER_ID=('([^']*)'|"([^"]*)"|[^\s|]+)/, `PROVIDER_ID=${shellQuote(safeProviderID)}`);
    } else if (/\bbash\b/.test(command)) {
      command = command.replace(/\bbash\b/, `PROVIDER_ID=${shellQuote(safeProviderID)} bash`);
    } else {
      command = `${command} PROVIDER_ID=${shellQuote(safeProviderID)}`;
    }
  }
  return { command, installerURL };
}
