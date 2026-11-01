import { httpClient } from '@/lib/http';

export interface ForgotPasswordRequestPayload {
  email: string;
}

export interface ForgotPasswordRequestResponse {
  message: string;
}

export interface ForgotPasswordResetPayload {
  email: string;
  reset_token: string;
  password: string;
  password_confirmation: string;
}

export interface ForgotPasswordResetResponse {
  message: string;
}

export async function requestPasswordReset(payload: ForgotPasswordRequestPayload): Promise<ForgotPasswordRequestResponse> {
  return httpClient.post<ForgotPasswordRequestResponse>('/auth/forgot-password/request', payload);
}

export async function resetPassword(payload: ForgotPasswordResetPayload): Promise<ForgotPasswordResetResponse> {
  return httpClient.post<ForgotPasswordResetResponse>('/auth/forgot-password/reset', payload);
}
