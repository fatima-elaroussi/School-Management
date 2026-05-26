export interface LookupState<T> {
  data: T[];
  loading: boolean;
  loaded: boolean;
  error: string | null;
  lastFetchedAt: number | null;
}

export function createInitialLookupState<T>(): LookupState<T> {
  return {
    data: [],
    loading: false,
    loaded: false,
    error: null,
    lastFetchedAt: null,
  };
}
