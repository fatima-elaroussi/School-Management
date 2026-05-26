/** Base URL for the json-server REST API (development). */
export const API_BASE_URL = 'http://localhost:3000' as const;

export const API_ENDPOINTS = {
  levels: `${API_BASE_URL}/levels`,
  subjects: `${API_BASE_URL}/subjects`,
} as const;
