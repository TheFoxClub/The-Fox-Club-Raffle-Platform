const { PublicKey } = require("@solana/web3.js");
const { getConnectionDas } = require("../../config/solana");
const { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } = require("@solana/spl-token");

const getTokenDetail = async (tokenAddress) => {
  const mintData = await getConnectionDas().getParsedAccountInfo(new PublicKey(tokenAddress));

  const tokenDetail = mintData.value?.data?.parsed?.info;
  if (!tokenDetail) {
    return null;
  }
  switch (mintData.value?.data?.program) {
    case "spl-token-2022":
      tokenDetail.tokenProgramId = TOKEN_2022_PROGRAM_ID;
      break;
    case "spl-token":
    default:
      tokenDetail.tokenProgramId = TOKEN_PROGRAM_ID;
      break;
  }

  if (tokenDetail?.extensions?.length > 0) {
    tokenDetail.extensions.forEach((element) => {
      if (element.extension === "transferFeeConfig") {
        tokenDetail.transferFeeConfig = element.state;
      }
    });
  }

  return tokenDetail;
};

module.exports.getTokenDetail = getTokenDetail;
