import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface AppState {
  showHeaderAndFooter: boolean;
}

const initialState: AppState = {
  showHeaderAndFooter: true,
};

const appSlice = createSlice({
  name: "app",
  initialState,
  reducers: {
    setShowHeaderAndFooter(state, action: PayloadAction<boolean>) {
      state.showHeaderAndFooter = action.payload;
    },
  },
});

export const { setShowHeaderAndFooter } = appSlice.actions;

export default appSlice.reducer;
