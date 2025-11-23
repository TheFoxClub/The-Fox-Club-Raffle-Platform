import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { THEME_MODE } from "../config/constants";
import type { ThemeModeType } from "../helpers/hashlips-generator/type";
// import { ThemeModeType } from "../helpers/hashlips-generator/type";

// Store theme mode in local storage
const storedThemeMode = localStorage.getItem(THEME_MODE) as ThemeModeType;
//initial state for theme
const initialState: ThemeModeType = storedThemeMode || "light";

//create a slice for the theme
export const themeSlice = createSlice({
  name: "theme",
  initialState,
  reducers: {
    // Action to set the theme
    setTheme: (state, action: PayloadAction<ThemeModeType>) => {
      // localStorage.setItem(THEME_MODE, JSON.stringify(action.payload));
      return action.payload;
    },
  },
});

//export the actions and theme
export const { setTheme } = themeSlice.actions;
export default themeSlice.reducer;
