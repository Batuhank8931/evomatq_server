const express = require("express");
const loginHandler = require("../../models/login.js");

const router = express.Router();

router.get("/", function (req, res, next) {
    res.status(404).send("Not Found!");
});

router.post('/login', loginHandler);

module.exports = router;
