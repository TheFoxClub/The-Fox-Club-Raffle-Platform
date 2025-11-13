const express = require("express");
const router = express.Router();
const AdminController = require("../controller/user-controller");
const auth = require("../config/auth");

router.get("/users/:id", Usercontroller.getOne);

module.exports = router;
