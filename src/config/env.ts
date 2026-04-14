const readEnv = (
  key: "VITE_API_URL" | "VITE_APP_NAME",
  fallback?: string,
) => {
  const value = import.meta.env[key];

  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }

  if (fallback !== undefined) {
    return fallback;
  }

  throw new Error(`Missing required environment variable: ${key}`);
};

export const appName = readEnv("VITE_APP_NAME", "");
export const apiUrl = readEnv(
  "VITE_API_URL",
  import.meta.env.DEV ? "http://localhost:1337" : undefined,
);
