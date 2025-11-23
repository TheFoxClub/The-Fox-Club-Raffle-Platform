module.exports.parseSequelizeErrors = (err) => {
  let message = err?.parent?.sqlMessage;

  return message || "Oops! Something went wrong.";
};
