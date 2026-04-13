import axios from "axios";

// Prefer environment-configured base URL (NEXT_PUBLIC_API_BASE_URL) for runtime override
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

// Create axios instance
const apiInstance = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

apiInstance.interceptors.request.use(
  (config) => {
    const userAuth = localStorage.getItem("persist:auth");
    if (userAuth) {
      const user = JSON.parse(userAuth);
      const userData = JSON.parse(user.user);
      const token = userData?.token;
      const userId = userData?.userId || null;

      if (token) {
        config.headers["Authorization"] = `Bearer ${token}`;
      }
      if (userId) {
        config.headers["X-User-Id"] = userId;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      // window.location.href = "/error/network";
      return Promise.reject(error);
    }

    const { status } = error.response;

    switch (status) {
      case 402:
      case 408:
        localStorage.removeItem("persist:auth");
        // window.location.href = "/error/session-expired";
        break;

      case 500:
        // window.location.href = "/error/server-error";
        break;

      default:
        break;
    }

    return Promise.reject(error);
  }
);

export default apiInstance;
