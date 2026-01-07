const express = require("express");
const path = require("path");
const { createServer } = require("http");
const { Server } = require("socket.io");
const { ALLOWED_ORIGINS, SERVER_PORT } = require("./config/credentials");
const app = express();
const httpServer = createServer(app);
const port = SERVER_PORT;
const cookieParser = require("cookie-parser");
const session = require("express-session");

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false },
  })
);

app.use(cookieParser());

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: false }));

app.use((req, res, next) => {
  let accessControlAllowOrigin =
    ALLOWED_ORIGINS.includes(req.headers.origin) && req.headers.origin;

  res.setHeader("Access-Control-Allow-Origin", accessControlAllowOrigin);
  res.setHeader("Access-Control-Allow-Credentials", `true`);
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, PATCH"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, x-client-key, x-client-token, x-client-secret, Authorization"
  );

  if (req.method === "OPTIONS") {
    return res.sendStatus(200); // ✅ Handle preflight here
  }

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

app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));
app.use("/api/upload", require("./routes/upload"));

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../build")));

  app.get(/(.*)/, (req, res) => {
    if (req.path.startsWith("/api") || req.path.startsWith("/server")) {
      return res.status(404).json({ error: "API route not found" });
    }

    res.sendFile(path.join(__dirname, "../build", "index.html"));
  });
}

require("./config/scheduler");

// Initialize Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: ALLOWED_ORIGINS,
    credentials: true,
  },
});

// Socket.IO connection handling
require("./config/socket")(io);

let server;

if (port) {
  server = httpServer.listen(port, () => {
    console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
    console.log(`🔌[socket]: Socket.IO server is ready`);
  });
} else {
  server = httpServer.listen();
}
