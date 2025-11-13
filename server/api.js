const router = require("express").Router();
const path = require("path");
const fs = require("fs");
const routesDir = __dirname + "/routes";

// Loop through every file in /routes
fs.readdirSync(routesDir).forEach((fileName) => {
  router.use(require(path.resolve(routesDir, fileName)));
});

module.exports = router;
