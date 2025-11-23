// import { createAsyncThunk } from "@reduxjs/toolkit";
// import server from "../../config/server";
// import { ResponseDataType } from "../../config/type";
// import { LoginFromDataType } from "../../views/User/LoginUser/type";

// export const loginUser = createAsyncThunk<ResponseDataType, LoginFromDataType, { rejectValue: ResponseDataType }>(
//   "auth/login",
//   async (formData: LoginFromDataType, { rejectWithValue }) => {
//     try {
//       return await server.post("auth/login", formData).then((res) => res.data);
//     } catch (error) {
//       if (error.response && error.response.data.message) {
//         return rejectWithValue(error.response.data);
//       } else {
//         return rejectWithValue({
//           data: null,
//           message: "Oops something went wrong",
//           success: false,
//         });
//       }
//     }
//   },
// );

// export const authenticateUser = createAsyncThunk<ResponseDataType, String, { rejectValue: ResponseDataType }>(
//   "auth/authenticate",
//   async (pubkey, { rejectWithValue }) => {
//     try {
//       return await server.get("/auth/authenticate", { params: { pubkey } }).then((res) => res.data);
//     } catch (error) {
//       if (error.response && error.response.data.message) {
//         return rejectWithValue(error.response.data);
//       } else {
//         return rejectWithValue({
//           data: null,
//           message: "Oops something went wrong",
//           success: false,
//         });
//       }
//     }
//   },
// );

// export const handleLogout = createAsyncThunk<ResponseDataType, { rejectValue: ResponseDataType }>(
//   "auth/logout",
//   async (_, { rejectWithValue }) => {
//     try {
//       const result = await server.post("/auth/logout").then((res) => res.data);
//       sessionStorage.removeItem(LOGIN_TOKEN);
//       window.location.href = "/";
//     } catch (error: any) {
//       if (error.response && error.response.data.message) {
//         return rejectWithValue(error.response.data);
//       } else {
//         return rejectWithValue({
//           data: null,
//           message: "Oops something went wrong",
//           success: false,
//         });
//       }
//     }
//   },
// );

// ---------------------------------

import { createAsyncThunk } from "@reduxjs/toolkit";
import server from "../../config/server";
import type { ResponseDataType } from "../../config/type";
import { LOGIN_TOKEN } from "../../config/constants"; // if needed

export type LoginFromDataType = {
  nonce: number;
  signature: string;
  pubkey: string;
};

export const loginUser = createAsyncThunk<
  ResponseDataType,
  LoginFromDataType,
  { rejectValue: ResponseDataType }
>("auth/login", async (formData: LoginFromDataType, { rejectWithValue }) => {
  try {
    return await server.post("auth/login", formData).then((res) => res.data);
  } catch (error: any) {
    if (error.response?.data?.message) {
      return rejectWithValue(error.response.data);
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
  string,
  { rejectValue: ResponseDataType }
>("auth/authenticate", async (pubkey, { rejectWithValue }) => {
  try {
    return await server
      .get("/auth/authenticate", { params: { pubkey } })
      .then((res) => res.data);
  } catch (error: any) {
    if (error.response?.data?.message) {
      return rejectWithValue(error.response.data);
    }
    return rejectWithValue({
      data: null,
      message: "Oops something went wrong",
      success: false,
    });
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
  } catch (error: any) {
    if (error.response?.data?.message) {
      return rejectWithValue(error.response.data);
    }
    return rejectWithValue({
      data: null,
      message: "Oops something went wrong",
      success: false,
    });
  }
});
