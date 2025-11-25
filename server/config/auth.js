const { expressjwt: jwt } = require("express-jwt");
const { JWT_SECRET } = require("./credentials");
const jsonwebtoken = require("jsonwebtoken");

const getTokenFromHeaders = (req) => {
  const {
    headers: { authorization },
  } = req;

  let [adminToken, customerToken, bearerToken] = [null, null, null];

  if (authorization) {
    const tokens = authorization.split(",");

    tokens.forEach((t) => {
      const [bearer, token] = t.split(" ");
      switch (bearer) {
        case "Admin":
          adminToken = token;
          break;
        case "Customer":
          customerToken = token;
          break;
        default:
          bearerToken = token;
          break;
      }
    });
  }
  return {
    admin: adminToken,
    customer: customerToken,
    bearer: bearerToken,
  };
};

const getToken = {
  admin: (req) => getTokenFromCookies(req).admin,
  customer: (req) => getTokenFromCookies(req).customer,
  bearer: (req) => getTokenFromCookies(req).bearer,
};

const getTokenFromCookies = (req) => {
  const token = req.cookies.token;
  return token;
};

const auth = {
  toAuthJSON: ({ pubkey, id, role }) => {
    const generateJWT = () => {
      const expireAfter = 2 * 60 * 60; // **IN SECONDS**
      return jsonwebtoken.sign(
        {
          id,
          pubkey,
          role,
          exp: parseInt(new Date().getTime() / 1000 + expireAfter, 10),
        },
        JWT_SECRET
      );
    };

    return {
      id,
      pubkey,
      role,
      token: generateJWT(),
    };
  },
  bearer: jwt({
    secret: JWT_SECRET,
    requestProperty: "payload",
    getToken: getTokenFromCookies,
    algorithms: ["HS256"],
  }),
  optionalBearer: jwt({
    secret: JWT_SECRET,
    requestProperty: "payload",
    getToken: getTokenFromCookies,
    credentialsRequired: false,
    algorithms: ["HS256"],
  }),
  required: jwt({
    secret: JWT_SECRET,
    requestProperty: "payload",
    getToken: getToken.admin,
    algorithms: ["HS256"],
  }),
  optional: jwt({
    secret: JWT_SECRET,
    requestProperty: "payload",
    getToken: getToken.bearer,
    credentialsRequired: false,
    algorithms: ["HS256"],
  }),
  customer: jwt({
    secret: JWT_SECRET,
    requestProperty: "payload",
    getToken: getToken.customer,
    algorithms: ["HS256"],
  }),
  getToken: getTokenFromCookies,
};

module.exports = auth;
