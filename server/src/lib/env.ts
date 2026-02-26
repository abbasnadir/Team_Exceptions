// Check for the environment variables to ensure variables are set as intended.
function requireEnv(name: string): string {
  console.log(`verifying ${name}`);
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

// Write the required environment variables here
export const ENV = {
  NODE_ENV: process.env.NODE_ENV ?? "development",

  PROD_URL:
    process.env.NODE_ENV === "production" ? requireEnv("PROD_URL") : undefined,

  SUPABASE_URL: requireEnv("SUPABASE_URL"),

  SUPABASE_SERVICE_KEY: requireEnv("SUPABASE_SERVICE_KEY"),

  SARVAM_API_KEY: requireEnv("SARVAM_API_KEY"),

  GEMINI_API_KEY: requireEnv("GEMINI_API_KEY"),

  SARVAM_STT_URL:
    process.env.SARVAM_STT_URL ??
    "https://api.sarvam.ai/speech-to-text-translate",

  GEMINI_MODEL: process.env.GEMINI_MODEL ?? "gemini-2.0-flash",

  TICKETING_SERVICE_URL: process.env.TICKETING_SERVICE_URL,

  RESERVATION_SERVICE_URL: process.env.RESERVATION_SERVICE_URL,

  KNOWLEDGE_SERVICE_URL: process.env.KNOWLEDGE_SERVICE_URL,

  PAYMENT_SERVICE_URL: process.env.PAYMENT_SERVICE_URL,

  SUPPORT_SERVICE_URL: process.env.SUPPORT_SERVICE_URL,
};
