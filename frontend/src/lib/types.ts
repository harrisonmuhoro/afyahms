export interface ApiError {
  type: string;
  status: number;
  message: string;
  details: Record<string, string[]> | null;
}

export interface ApiErrorEnvelope {
  error: ApiError;
}

export interface Paginated<T> {
  data: T[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}