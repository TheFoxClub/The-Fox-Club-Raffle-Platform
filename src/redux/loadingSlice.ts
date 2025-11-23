import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

const initialState: boolean = false;

export const loadingSlice = createSlice({
  name: "isLoading",
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      return action.payload;
    },
  },
});

// Action creators are generated for each case reducer function
export const { setLoading } = loadingSlice.actions;

export default loadingSlice.reducer;
