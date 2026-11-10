/**
 * Token Storage Abstraction
 * Default strategy uses localStorage for development.
 * Can be switched to sessionStorage or secure memory/cookie adapter as needed.
 */

export interface ITokenStorage {
  getToken(): string | null;
  setToken(token: string, rememberMe?: boolean): void;
  removeToken(): void;
}

const TOKEN_KEY = 'garage_access_token';

class HybridTokenStorage implements ITokenStorage {
  getToken(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  }

  setToken(token: string, rememberMe: boolean = true): void {
    try {
      if (rememberMe) {
        localStorage.setItem(TOKEN_KEY, token);
        sessionStorage.removeItem(TOKEN_KEY);
      } else {
        sessionStorage.setItem(TOKEN_KEY, token);
        localStorage.removeItem(TOKEN_KEY);
      }
    } catch (error) {
      console.error('Failed to save token to storage:', error);
    }
  }

  removeToken(): void {
    try {
      localStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
    } catch (error) {
      console.error('Failed to remove token from storage:', error);
    }
  }
}

export const tokenStorage: ITokenStorage = new HybridTokenStorage();

/**
 * Parses JWT payload safely without external dependencies
 */
export function parseJwtClaims(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}
