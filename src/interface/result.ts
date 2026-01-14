export interface Result<T = any> {
  success: boolean;
  code: string;
  message?: string;
  data?: T;
  error?: {
    message: string;
    detail?: any;
  };
}

export function ok<T>(data?: T, message = "OK", code = "SUCCESS"): Result<T> {
  return {
    success: true,
    code,
    message,
    data,
  };
}

export function fail(
  message: string,
  code = "ERROR",
  detail?: any
): Result<null> {
  return {
    success: false,
    code,
    message,
    error: {
      message,
      detail,
    },
  };
}
