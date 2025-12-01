const BLOCKCHAIN_NETWORK = {
  SOLANA: 1,
  POLYGON: 2,
};

const SPL_TOKEN_SEND_TRANSACTION_TYPE = {
  SOLANA: 0,
  SPL_TOKEN: 1,
  SPL_TOKEN_2022: 2,
};

const TOKEN_TYPE = {
  SOLANA: 0,
  SPL_TOKEN: 1,
  SPL_TOKEN_2022: 2,
  USDC: 3,
};

const RAFFLE_STATUS = {
  UPCOMING: 0,
  LIVE: 1,
  ENDED: 2,
  CANCELLED: 3,
  SUSPENDED: 4,
};

const RAFFLE_FEATURED_STATUS = {
  FEATURED: 1,
  NOT_FEATURED: 0,
};

const RAFFLE_REWARD_TYPES = {
  NFT: 0,
  SPL_TOKEN: 1,
  SPL_TOKEN_2022: 2,
};

const RAFFLE_FEATURED_POSITION = {
  FIRST: 1,
  SECOND: 2,
  THIRD: 3,
  FOURTH: 4,
  FIFTH: 5,
};

function mapEnumValue(enumObj, value) {
  return Object.keys(enumObj).find((key) => enumObj[key] === value) || value;
}

module.exports = {
  BLOCKCHAIN_NETWORK,
  SPL_TOKEN_SEND_TRANSACTION_TYPE,
  TOKEN_TYPE,
  RAFFLE_STATUS,
  RAFFLE_FEATURED_STATUS,
  RAFFLE_FEATURED_POSITION,
  RAFFLE_REWARD_TYPES,
  mapEnumValue,
};
