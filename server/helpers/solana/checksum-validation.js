// backend/hmac.js
const crypto = require("crypto");
const { Buffer } = require("buffer"); // fixes ESLint warning
const { CHECKSUM_SECRET_KEY } = require("../../config/credentials");

const getRelevantInstructions = (transactionMessageUmi) => {
  const sortFunction = (a, b) => {
    if (a < b) return -1;
    if (a > b) return 1;

    return 0;
  };
  // Skip compute budget and lighthouse accounts from checksum calculation
  const skipAccounts = ["ComputeBudget111111111111111111111111111111", "L2TExMFKdjpN9kozasaurPirfHy9P8sbXoAN1qA3S95"];

  const relevantInstructionSet = {
    // Skipping compute budget instructions and lighthouse instructions from checksum calculation and sorting the rest
    accounts: transactionMessageUmi.accounts
      .filter((account) => (skipAccounts.includes(account.toString()) ? false : true))
      .sort((a, b) => sortFunction(a.toString(), b.toString())),
    instructions: transactionMessageUmi.instructions
      .filter((instruction) => {
        if (!transactionMessageUmi.accounts[instruction.programIndex]) return false;

        const programId = transactionMessageUmi.accounts[instruction.programIndex].toString();
        return skipAccounts.includes(programId) ? false : true;
      })
      .sort((a, b) =>
        sortFunction(
          transactionMessageUmi.accounts[a.programIndex].toString(),
          transactionMessageUmi.accounts[b.programIndex].toString(),
        ),
      )
      .map((i) => ({
        //accountIndexes: i.accountIndexes,
        data: i.data,
      })),
  };

  return relevantInstructionSet;
};

// 1. Generate checksum
function generateChecksum(transactionMessageUmi) {
  return crypto
    .createHmac("sha256", CHECKSUM_SECRET_KEY)
    .update(JSON.stringify(getRelevantInstructions(transactionMessageUmi)))
    .digest("hex");
}

// 2. Validate checksum
function validateChecksum(transactionMessageUmi, checksum) {
  const expected = generateChecksum(transactionMessageUmi);

  return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(checksum, "hex"));
}

module.exports = {
  generateChecksum,
  validateChecksum,
};
