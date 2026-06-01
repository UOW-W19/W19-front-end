export const MAPBOX_TOKEN_STORAGE_KEY = 'locale_mapbox_token';

export const getInitialMapboxToken = (): string => {
  const envToken = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;
  if (envToken && envToken.startsWith('pk.')) {
    return envToken;
  }

  const storedToken = typeof window !== 'undefined'
    ? localStorage.getItem(MAPBOX_TOKEN_STORAGE_KEY)
    : null;
  if (storedToken && storedToken.startsWith('pk.')) {
    return storedToken;
  }

  return '';
};
