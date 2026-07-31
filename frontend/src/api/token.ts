const ACCESS_KEY = 'dayledger:accessToken';
const REFRESH_KEY = 'dayledger:refreshToken';

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string | null) {
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch {
    // storage unavailable (private mode) — ignore
  }
}

let accessToken: string | null = readStorage(ACCESS_KEY);

export const getAccessToken = () => accessToken;
export const setAccessToken = (token: string | null) => {
  accessToken = token;
  writeStorage(ACCESS_KEY, token);
};

export const getRefreshToken = () => readStorage(REFRESH_KEY);
export const setRefreshToken = (token: string | null) => {
  writeStorage(REFRESH_KEY, token);
};
