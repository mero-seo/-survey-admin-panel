import { useMemo } from "react";
import { AxiosError } from "axios";

export interface ApiError {
  type: "network" | "server" | "auth" | "validation" | "unknown";
  message: string;
  status?: number;
  retryable: boolean;
}

export function useApiError(error: unknown): ApiError {
  return useMemo(() => {
    if (!error) {
      return {
        type: "unknown",
        message: "An unknown error occurred",
        retryable: false,
      };
    }

    // Handle Axios errors
    if (error instanceof AxiosError) {
      const status = error.response?.status;
      const message = error.response?.data?.message || error.message;

      // Network errors (no response)
      if (!error.response) {
        return {
          type: "network",
          message:
            "Unable to connect to the server. Please check your internet connection.",
          retryable: true,
        };
      }

      // Server errors (5xx)
      if (status && status >= 500) {
        return {
          type: "server",
          message: "Server is temporarily unavailable. Please try again later.",
          status,
          retryable: true,
        };
      }

      // Authentication errors (401)
      if (status === 401) {
        return {
          type: "auth",
          message: "Your session has expired. Please log in again.",
          status,
          retryable: false,
        };
      }

      // Authorization errors (403)
      if (status === 403) {
        return {
          type: "auth",
          message: "You don't have permission to access this resource.",
          status,
          retryable: false,
        };
      }

      // Not found errors (404)
      if (status === 404) {
        return {
          type: "server",
          message: "The requested resource was not found.",
          status,
          retryable: false,
        };
      }

      // Validation errors (4xx)
      if (status && status >= 400 && status < 500) {
        return {
          type: "validation",
          message: message || "Invalid request. Please check your input.",
          status,
          retryable: false,
        };
      }

      // Other HTTP errors
      return {
        type: "server",
        message: message || "An error occurred while processing your request.",
        status,
        retryable:
          status !== 400 && status !== 401 && status !== 403 && status !== 404,
      };
    }

    // Handle generic errors
    if (error instanceof Error) {
      return {
        type: "unknown",
        message: error.message || "An unexpected error occurred",
        retryable: false,
      };
    }

    // Handle string errors
    if (typeof error === "string") {
      return {
        type: "unknown",
        message: error,
        retryable: false,
      };
    }

    // Default fallback
    return {
      type: "unknown",
      message: "An unknown error occurred",
      retryable: false,
    };
  }, [error]);
}

export function getErrorMessage(error: ApiError): string {
  switch (error.type) {
    case "network":
      return "Connection Error";
    case "server":
      return "Server Error";
    case "auth":
      return "Authentication Error";
    case "validation":
      return "Validation Error";
    default:
      return "Error";
  }
}

export function shouldShowRetry(error: ApiError): boolean {
  return (
    error.retryable && (error.type === "network" || error.type === "server")
  );
}
