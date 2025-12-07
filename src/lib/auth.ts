export function validateApiKey(providedKey: string | undefined): boolean {
  const expectedKey = process.env.API_KEY;

  if (!expectedKey) {
    console.error('API_KEY environment variable is not set');
    return false;
  }

  if (!providedKey) {
    return false;
  }

  return providedKey === expectedKey;
}
