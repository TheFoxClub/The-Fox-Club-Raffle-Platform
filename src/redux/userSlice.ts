import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { loginUser, authenticateUser } from "./actions/userAction";
import { LOGIN_TOKEN } from "../config/constants";
import { toast } from "react-toastify";

export type User = {
  id?: number;
  pubkey?: string;
  blockchainNetwork?: string;
  token?: string;
  isAuthenticated: boolean;
  isLoading: boolean;
  messages?: any[];
  isAdmin?: boolean;
};

const initialState: User = {
  isAuthenticated: false,
  isLoading: true,
  isAdmin: false,
};

const user = createSlice({
  name: "user",
  initialState,
  reducers: {
    setUser: (_, action: PayloadAction<User>) => action.payload,

    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },

    // hydrate Redux on refresh
    hydrateUserState: (state) => {
      const token = sessionStorage.getItem(LOGIN_TOKEN);

      if (token) {
        state.token = token;
        state.isAuthenticated = true;
        state.isLoading = false; // avoid default "loading" state
      } else {
        state.isAuthenticated = false;
        state.isLoading = false;
      }
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(loginUser.fulfilled, (state, { payload }) => {
        const user: User = payload.data.user;

        sessionStorage.setItem(LOGIN_TOKEN, user.token);
        toast.success(payload.message);

        state.id = user.id;
        state.pubkey = user.pubkey;
        state.isAuthenticated = true;
        state.isLoading = false;
        state.token = user.token;
        state.blockchainNetwork = user.blockchainNetwork;
        state.isAdmin = user.isAdmin || false;
        state.messages = user.messages || [];
      })
      .addCase(loginUser.rejected, (state, { payload }) => {
        state.isAuthenticated = false;
        state.isLoading = false;
        sessionStorage.removeItem(LOGIN_TOKEN);

        if (payload?.message) toast.warning(payload.message);
      });

    builder
      .addCase(authenticateUser.fulfilled, (state, { payload }) => {
        const user: User = payload.data.user;

        state.id = user.id;
        state.isAuthenticated = user.isAuthenticated;
        state.isAdmin = user.isAdmin;
        state.blockchainNetwork = user.blockchainNetwork;
        state.isLoading = false;
        state.messages = user.messages;
        state.pubkey = user.pubkey;
      })
      .addCase(authenticateUser.rejected, (state) => {
        state.isAuthenticated = false;
        state.isLoading = false;
      });
  },
});

export const { setUser, setLoading, hydrateUserState } = user.actions;
export default user.reducer;
