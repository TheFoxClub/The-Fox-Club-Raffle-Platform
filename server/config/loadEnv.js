const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

const projectRoot = path.resolve(__dirname, "..", "..");

const candidateEnvFiles = [
  process.env.ENV_FILE,
  ".env",
  "env",
].filter(Boolean);

for (const candidateFile of candidateEnvFiles) {
  const resolvedPath = path.isAbsolute(candidateFile)
    ? candidateFile
    : path.join(projectRoot, candidateFile);

  if (fs.existsSync(resolvedPath)) {
    dotenv.config({ path: resolvedPath });
    break;
  }
}
