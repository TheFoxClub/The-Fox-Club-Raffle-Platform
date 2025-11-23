import { configureStore } from "@reduxjs/toolkit";
import { useDispatch } from "react-redux";
import blockchainNetworkSlice from "./blockchainNetworkSlice";
import loadingSlice from "./loadingSlice";
import userSlice from "./userSlice";
import themeSlice from "./themeSlice";
import appSlice from "./appSlice";  

export const store = configureStore({
  reducer: {
    isLoading: loadingSlice,
    theme: themeSlice,
    blockchainNetwork: blockchainNetworkSlice,
    user: userSlice,
    app: appSlice,  
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export const useAppDispatch: () => AppDispatch = useDispatch;
