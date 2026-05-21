import { createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import server from "../../config/server";
import type { ResponseDataType } from "../../config/type";
import { LOGIN_TOKEN } from "../../config/constants"; // if needed

export type LoginFromDataType = {
  nonce: string;
  signature: string;
  pubkey: string;
};

export const fetchAuthChallenge = async (pubkey: string) => {
  return server.post("auth/challenge", { pubkey }).then((res) => res.data);
};

const getErrorResponse = (error: unknown) => {
  if (axios.isAxiosError<ResponseDataType>(error)) {
    return error.response?.data ?? null;
  }

  return null;
};

export const loginUser = createAsyncThunk<
  ResponseDataType,
  LoginFromDataType,
  { rejectValue: ResponseDataType }
>("auth/login", async (formData: LoginFromDataType, { rejectWithValue }) => {
  try {
    return await server.post("auth/login", formData).then((res) => res.data);
  } catch (error: unknown) {
    const errorResponse = getErrorResponse(error);

    if (errorResponse?.message) {
      return rejectWithValue(errorResponse);
    }

    return rejectWithValue({
      data: null,
      message: "Oops something went wrong",
      success: false,
    });
  }
});

export const authenticateUser = createAsyncThunk<
  ResponseDataType,
  void,
  { rejectValue: ResponseDataType }
>("auth/authenticate", async (_, { rejectWithValue }) => {
  try {
    return await server.get("/auth/authenticate").then((res) => res.data);
  } catch (error: unknown) {
    return rejectWithValue(
      getErrorResponse(error) || {
        data: null,
        message: "Oops something went wrong",
        success: false,
      }
    );
  }
});

export const handleLogout = createAsyncThunk<
  ResponseDataType,
  void,
  { rejectValue: ResponseDataType }
>("auth/logout", async (_, { rejectWithValue }) => {
  try {
    await server.post("/auth/logout").then((res) => res.data);
    sessionStorage.removeItem(LOGIN_TOKEN);
    window.location.href = "/";
  } catch (error: unknown) {
    const errorResponse = getErrorResponse(error);

    if (errorResponse?.message) {
      return rejectWithValue(errorResponse);
    }

    return rejectWithValue({
      data: null,
      message: "Oops something went wrong",
      success: false,
    });
  }
});
