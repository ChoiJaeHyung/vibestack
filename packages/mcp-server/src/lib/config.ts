const DEFAULT_API_URL = "https://vibeuniv.com/api/v1";

export interface Config {
  apiKey: string;
  apiUrl: string;
}

export function loadConfig(): Config {
  const apiKey =
    process.env.VIBEUNIV_API_KEY || process.env.VIBESTACK_API_KEY;

  if (!apiKey) {
    throw new Error(
      "VIBEUNIV_API_KEY environment variable is required. " +
        "Get your API key at https://vibeuniv.com/settings/api"
    );
  }

  const apiUrl =
    process.env.VIBEUNIV_API_URL ||
    process.env.VIBESTACK_API_URL ||
    DEFAULT_API_URL;

  return { apiKey, apiUrl };
}
