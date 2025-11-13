const express = require("express");
require("dotenv").config();
const path = require("path");
const app = express();
const port = process.env.SERVER_PORT;
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: false }));
// Set up a route to serve the uploaded files
app.use(express.static(path.join(__dirname, "/public")));

app.use((req, res, next) => {
  let accessControlAllowOrigin = [
    "http://localhost:3000",
  ].includes(req.headers.origin)
    ? req.headers.origin
    : "https://bots.solanaskypilots.com";
  res.setHeader("Access-Control-Allow-Origin", accessControlAllowOrigin);
  res.setHeader("Access-Control-Allow-Credentials", `true`);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, x-client-key, x-client-token, x-client-secret, Authorization",
  );
  next();
});

app.use((req, res, next) => {
  if (process.env.HTTP_SECURE === "true") {
    req.serverUrl = req.protocol + "s://" + req.headers.host;
    req.clientUrl = req.protocol + "s://" + req.headers.origin;
  } else {
    req.serverUrl = req.protocol + "://" + req.headers.host;
    req.clientUrl = req.protocol + "://" + req.headers.origin;
  }
  next();
});

app.use(express.json());

app.use("/api", require("./api"));
app.use("/", express.static("build"));
app.use("/uploads", express.static("uploads"));
// if (process.env.NODE_ENV === "production") {
// app.use(express.static(path.join(__dirname, "../build")));

app.get("*", (req, res) => {
  if (req.path.startsWith("/api") || req.path.startsWith("/server")) {
    return res.status(404).json({ error: "API route not found" });
  }

  res.sendFile(path.join(__dirname, "../build", "index.html"));
});
// }

let server;

if (port) {
  server = app.listen(port, () => {
    console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
  });
} else {
  server = app.listen();
}

