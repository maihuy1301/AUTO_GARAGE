import { AxiosError } from 'axios';
import { ApiError, ApiResponse } from '@/types/api.types';

type UnauthorizedHandler = () => void;
let onUnauthorizedCallback: UnauthorizedHandler | null = null;

export function registerUnauthorizedHandler(handler: UnauthorizedHandler): void {
  onUnauthorizedCallback = handler;
}

export function triggerUnauthorized(): void {
  if (onUnauthorizedCallback) {
    onUnauthorizedCallback();
  }
}

export function normalizeApiError(error: unknown): ApiError {
  if (!error) {
    return { message: 'Đã xảy ra lỗi không xác định.' };
  }

  if (typeof error === 'object' && 'isAxiosError' in error) {
    const axiosError = error as AxiosError<ApiResponse<unknown> | string>;

    if (!axiosError.response) {
      return {
        status: 0,
        message: 'Không kết nối được với máy chủ. Kiểm tra mạng và thử lại.',
      };
    }

    const status = axiosError.response.status;
    const data = axiosError.response.data;

    let serverMessage = '';
    if (typeof data === 'object' && data !== null && 'message' in data && typeof data.message === 'string') {
      serverMessage = data.message;
    } else if (typeof data === 'string') {
      serverMessage = data;
    }

    switch (status) {
      case 400:
        return {
          status,
          message: serverMessage || 'Dữ liệu yêu cầu không hợp lệ.',
          data,
        };
      case 401:
        return {
          status,
          message: serverMessage || 'Tài khoản hoặc mật khẩu không chính xác.',
          data,
        };
      case 403:
        return {
          status,
          message: axiosError.config?.url?.startsWith('/auth/web/') && serverMessage
            ? serverMessage
            : 'Bạn không có quyền xem dữ liệu hoặc thực hiện thao tác này.',
          data,
        };
      case 404:
        return {
          status,
          message: serverMessage || 'Không tìm thấy dữ liệu yêu cầu.',
          data,
        };
      case 409:
        return {
          status,
          message: serverMessage || 'Dữ liệu bị xung đột hoặc đã tồn tại.',
          data,
        };
      case 500:
      default:
        return {
          status,
          message: 'Máy chủ đang gặp lỗi. Vui lòng thử lại sau.',
          data,
        };
    }
  }

  if (error instanceof Error) {
    return { message: error.message };
  }

  return { message: 'Đã xảy ra lỗi không xác định.' };
}
