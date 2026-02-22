const DEFAULT_API_URL = "https://vibestack.io/api/v1";

export interface Config {
  apiKey: string;
  apiUrl: string;
}

export function loadConfig(): Config {
  const apiKey = process.env.VIBESTACK_API_KEY;

  if (!apiKey) {
    throw new Error(
      "VIBESTACK_API_KEY environment variable is required. " +
        "Get your API key at https://vibestack.io/settings/api"
    );
  }

  const apiUrl = process.env.VIBESTACK_API_URL || DEFAULT_API_URL;

  return { apiKey, apiUrl };
}
