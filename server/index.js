const express = require("express");
const path = require("path");
const fs = require("fs");
const { createServer } = require("http");
const { Server } = require("socket.io");
require("./config/loadEnv");
const {
  ALLOWED_ORIGINS,
  SERVER_PORT,
  SESSION_SECRET,
} = require("./config/credentials");
const app = express();
const httpServer = createServer(app);
const port = SERVER_PORT;
const cookieParser = require("cookie-parser");
const session = require("express-session");

if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    },
  })
);

app.use(cookieParser());

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: false }));

app.use((req, res, next) => {
  const accessControlAllowOrigin =
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

const escapeHtml = (value) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

app.get("/raffle/:slug", async (req, res, next) => {
  const match = /^raffle-(\d+)$/.exec(req.params.slug);
  if (!match) {
    return next();
  }

  try {
    const { Raffle } = require("./models");
    const raffle = await Raffle.findByPk(match[1], {
      attributes: ["id", "title", "description", "imageUrl"],
      raw: true,
    });

    if (!raffle) {
      return next();
    }

    const appUrl = (process.env.PUBLIC_APP_URL || `${req.protocol}://${req.get("host")}`).replace(/\/$/, "");
    const raffleUrl = `${appUrl}/raffle/raffle-${raffle.id}`;
    const imageUrl = raffle.imageUrl
      ? (/^https?:\/\//i.test(raffle.imageUrl) ? raffle.imageUrl : `${appUrl}${raffle.imageUrl.startsWith("/") ? "" : "/"}${raffle.imageUrl}`)
      : `${appUrl}/uploads/nft-placeholder.svg`;
    const title = `${raffle.title} | The Fox Club`;
    const description = (raffle.description || "Join this raffle on The Fox Club.").replace(/\s+/g, " ").trim().slice(0, 200);
    const metadata = [
      `<title>${escapeHtml(title)}</title>`,
      `<link rel="canonical" href="${escapeHtml(raffleUrl)}" />`,
      `<meta property="og:type" content="website" />`,
      `<meta property="og:title" content="${escapeHtml(title)}" />`,
      `<meta property="og:description" content="${escapeHtml(description)}" />`,
      `<meta property="og:url" content="${escapeHtml(raffleUrl)}" />`,
      `<meta property="og:image" content="${escapeHtml(imageUrl)}" />`,
      `<meta name="twitter:card" content="summary_large_image" />`,
      `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
      `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
      `<meta name="twitter:image" content="${escapeHtml(imageUrl)}" />`,
    ].join("\n    ");
    const indexPath = path.join(__dirname, "../build", "index.html");
    const indexHtml = await fs.promises.readFile(indexPath, "utf8");

    return res.type("html").send(indexHtml.replace("</head>", `    ${metadata}\n  </head>`));
  } catch (error) {
    return next(error);
  }
});

app.use("/", express.static("build"));

app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));
app.use("/api/assets", require("./routes/asset.route"));
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
