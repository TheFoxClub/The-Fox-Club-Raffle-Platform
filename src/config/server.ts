// import axios, { AxiosRequestConfig } from "axios";
import axios, { type AxiosRequestConfig } from "axios";
import { LOGIN_TOKEN } from "./constants";
import type { ResponseDataType } from "./type";
// import { ResponseDataType } from "./type";

const server = axios.create({
  baseURL: import.meta.env.REACT_APP_BASE_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// server.interceptors.request.use((config) => {
//   const token = localStorage.getItem("accessToken");
//   if (token) {
//     config.headers.Authorization = `Bearer ${token}`;
//   }
//   return config;
// });

server.interceptors.response.use(
  function (response) {
    return response;
  },
  function (error) {
    if (error.response && error.response.status === 401) {
      const redirectUrl = `${window.location.origin}/#/`;
      const publicUrl = `${window.location.origin}/#/browse/search`;
      const currentUrl = new URL(window.location.href);
      const urls = [
        `${window.location.origin}/#/`,
        `${window.location.origin}/`,
        redirectUrl,
        publicUrl,
      ];

      // Normalize URLs to compare correctly
      const isCurrentUrlInList = urls.some(
        (url) => new URL(url).href === currentUrl.href
      );

      if (!isCurrentUrlInList) {
        window.location.href = redirectUrl;
      }
    }
    return Promise.reject(error);
  }
);

server.interceptors.request.use((config) => {
  const blockchainNetwork = "solana";
  config.params = {
    ...config.params,
    blockchainNetwork,
  };

  const token = sessionStorage.getItem(LOGIN_TOKEN);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const getRequest = async <T extends ResponseDataType>(
  url: string,
  config?: AxiosRequestConfig
): Promise<ResponseDataType> => {
  try {
    const response = await server.get<T>(url, config);
    const json: ResponseDataType = response.data;
    return { success: true, message: json.message, data: json.data };
  } catch (error) {
    return handleError(error);
  }
};

export const postRequest = async <T extends ResponseDataType>(
  url: string,
  data?: any,
  config?: AxiosRequestConfig
): Promise<ResponseDataType> => {
  try {
    const response = await server.post<T>(url, data, config);
    const json: ResponseDataType = response.data;
    return { success: true, message: json.message, data: json.data };
  } catch (error) {
    return handleError(error);
  }
};

export const patchRequest = async <T extends ResponseDataType>(
  url: string,
  data?: any,
  config?: AxiosRequestConfig
): Promise<ResponseDataType> => {
  try {
    const response = await server.patch<T>(url, data, config);
    const json: ResponseDataType = response.data;
    return { success: true, message: json.message, data: json.data };
  } catch (error) {
    return handleError(error);
  }
};

export const deleteRequest = async <T extends ResponseDataType>(
  url: string,
  config?: AxiosRequestConfig
): Promise<ResponseDataType> => {
  try {
    const response = await server.delete<T>(url, config);
    const json: ResponseDataType = response.data;
    return { success: true, message: json.message, data: json.data };
  } catch (error) {
    return handleError(error);
  }
};

export const putRequest = async <T extends ResponseDataType>(
  url: string,
  data?: any,
  config?: AxiosRequestConfig
): Promise<ResponseDataType> => {
  try {
    const response = await server.put<T>(url, data, config);
    const json: ResponseDataType = response.data;
    return { success: true, message: json.message, data: json.data };
  } catch (error) {
    return handleError(error);
  }
};

const handleError = (error: any): ResponseDataType => {
  let errorMessage = "An unknown error occurred";
  if (axios.isAxiosError(error)) {
    if (error.response) {
      errorMessage = error.response.data?.message || error.response.statusText;
    } else if (error.request) {
      errorMessage = "The request was made but no response was received";
    } else {
      errorMessage = error.message;
    }
  } else {
    errorMessage = error.message;
  }
  return { success: false, message: errorMessage, data: null };
};

export default server;
