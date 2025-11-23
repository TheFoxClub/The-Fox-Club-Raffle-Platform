import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
// import { BlockchainNetwork } from "../helpers/hashlips-generator/type";
import { BLOCKCHAIN_NETWORK } from "../config/constants";
import type { BlockchainNetwork } from "../helpers/hashlips-generator/type";

export const blockchainNetworkSlice = createSlice({
  name: "blockchainNetworkSlice",
  initialState: localStorage.getItem(BLOCKCHAIN_NETWORK),
  reducers: {
    setBlockchainNetwork: (_, action: PayloadAction<BlockchainNetwork>) => {
      localStorage.setItem(BLOCKCHAIN_NETWORK, action.payload);
      return action.payload;
    },
  },
});

export const { setBlockchainNetwork } = blockchainNetworkSlice.actions;

export default blockchainNetworkSlice.reducer;
