const DEFAULT_ALLOWED_HOSTS = ["localhost", "127.0.0.1"];

export function getViteAllowedHosts(rawHosts = process.env.VITE_ALLOWED_HOSTS) {
  const configuredHosts = rawHosts
    ?.split(",")
    .map((host) => host.trim())
    .filter(Boolean);

  return Array.from(
    new Set([...DEFAULT_ALLOWED_HOSTS, ...(configuredHosts ?? [])]),
  );
}
