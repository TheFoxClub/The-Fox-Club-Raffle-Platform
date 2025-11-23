const { status: httpStatus } = require("http-status");

/**
 *
 * @param {Response} res
 * @param {Number} code
 * @param {String} message
 * @param {Object} data
 */
const respond = (res, code, message, data) => {
  if (!res || !code || !message)
    throw new Error("Parameters for the respond function are not fulfilled");

  const response = {
    message,
    success: code === httpStatus.OK,
    data: data || null,
  };

  res.status(code).json(response);
};

module.exports = respond;
