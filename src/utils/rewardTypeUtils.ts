export const formatRewardType = (type: string) => {
  switch (type) {
    case "SPL_TOKEN":
      return "SPL TOKEN";

    case "SPL_TOKEN_2022":
      return "SPL TOKEN 22";

    default:
      return type.replace(/_/g, " ");
  }
};
