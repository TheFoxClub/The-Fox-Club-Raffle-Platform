import { toast } from "react-toastify";
import server from "./server";
import type { ResponseDataType } from "./type";
import { LOGIN_TOKEN } from "./constants";

type RequestOptions = {
  method: "get" | "post" | "put" | "delete";
  url: string;
  params?: Record<string, any>;
  data?: Record<string, any>;
};

export const handleLogout = async () => {
  await server
    .post(
      "/auth/logout",
      {},
      {
        withCredentials: true,
      }
    )
    .then(() => {
      sessionStorage.removeItem(LOGIN_TOKEN);
      window.location.href = "/";
    })
    .catch((error) => {
      console.error("Logout failed:", error);
      toast.error("Error occurred while logging out.");
    });
};

export const apiRequest = async ({
  method,
  url,
  params,
  data,
}: RequestOptions): Promise<ResponseDataType> => {
  try {
    const response = await server.request({
      method,
      url,
      params,
      data,
    });
    const json: ResponseDataType = response.data;
    return json.success
      ? { success: true, message: json.message, data: json.data }
      : { success: false, message: json.message, data: null };
  } catch (error: any) {
    if (error?.response?.data) {
      return error.response.data;
    } else {
      return {
        success: false,
        message: "Oops something went wrong",
        data: null,
      };
    }
  }
};
