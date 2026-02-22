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
  notificationsCount?: number;
  user_info?: {
    id?: number;
    username?: string;
    email?: string;
    description?: string;
    photoUrl?: string;
    rafflesWon?: number;
  };
};

const initialState: User = {
  isAuthenticated: false,
  isLoading: true,
  isAdmin: false,
  notificationsCount: 0,
};

const user = createSlice({
  name: "user",
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<Partial<User>>) => {
      return {
        ...state,
        ...action.payload,
      };
    },

    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },

    // hydrate Redux on refresh
    hydrateUserState: (state) => {
      const token = sessionStorage.getItem(LOGIN_TOKEN);

      if (token) {
        state.token = token;
        state.isAuthenticated = true;
        state.isLoading = true;
      } else {
        state.isAuthenticated = false;
        state.isLoading = false;
      }
    },

    // logout user
    logout: (state) => {
      sessionStorage.removeItem(LOGIN_TOKEN);
      localStorage.removeItem(LOGIN_TOKEN); // Also clear localStorage if used
      // Clear any other wallet-related storage
      try {
        localStorage.removeItem("walletName");
        sessionStorage.removeItem("walletName");
      } catch (e) {
        // Ignore storage errors
      }
      return {
        ...initialState,
        isLoading: false,
        notificationsCount: 0,
      };
    },
    setNotificationsCount: (state, action: PayloadAction<number>) => {
      state.notificationsCount = action.payload;
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

export const {
  setUser,
  setLoading,
  hydrateUserState,
  logout,
  setNotificationsCount,
} = user.actions;
export default user.reducer;
