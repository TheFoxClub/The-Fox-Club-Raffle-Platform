const { DEFAULT_COMMISSION } = require("../config/constants");

const shouldWaivePlatformFees = (payload) => payload?.role === "admin";

const getTransactionFeeAmount = (
  feeData,
  { waivePlatformFees = false } = {},
) => {
  if (waivePlatformFees) {
    return 0;
  }

  return Number(feeData?.transaction_fee) || DEFAULT_COMMISSION;
};

const getFeaturedRaffleFeeAmount = (
  feeData,
  { waivePlatformFees = false } = {},
) => {
  if (waivePlatformFees) {
    return 0;
  }

  return Number(feeData?.featured_raffle_fee) || DEFAULT_COMMISSION;
};

const getParticipantCommissionRate = (
  feeData,
  isNFTHolder,
  defaultRates,
  { waivePlatformFees = false } = {},
) => {
  if (waivePlatformFees) {
    return 0;
  }

  return isNFTHolder
    ? feeData?.holder_participant_fee / 100 || defaultRates.HOLDER
    : feeData?.non_holder_participant_fee / 100 || defaultRates.NON_HOLDER;
};

module.exports = {
  shouldWaivePlatformFees,
  getTransactionFeeAmount,
  getFeaturedRaffleFeeAmount,
  getParticipantCommissionRate,
};