import axios from "axios";

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 10000, // 10 second timeout
  timeoutErrorMessage: "Request timed out. Please try again.",
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    // Add any common headers or auth tokens here if needed
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for better error handling
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Log errors for debugging (remove in production if not needed)
    if (process.env.NODE_ENV === "development") {
      console.error("API Error:", {
        url: error.config?.url,
        method: error.config?.method,
        status: error.response?.status,
        message: error.message,
      });
    }

    // Handle specific error cases
    if (error.code === "ECONNABORTED") {
      error.message = "Request timed out. Please try again.";
    }

    if (error.code === "ERR_NETWORK") {
      error.message = "Network error. Please check your internet connection.";
    }

    return Promise.reject(error);
  }
);
