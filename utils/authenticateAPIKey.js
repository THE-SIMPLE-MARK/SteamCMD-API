/**
 * Authenticates an API key
 * @param key the API key
 * @returns {Promise<boolean>} whether the API key is valid or not
 */
export default async function authenticateAPIKey(key) {
  if (!key) return false;
  if (!key.startsWith("Bearer")) return false;

  const apiKey = key.split("Bearer ")[1]
  return process.env.API_KEYS.includes(apiKey);
}