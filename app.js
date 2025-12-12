const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const indexRouter = require("./routes/index.js");
const usersRouter = require("./routes/api/api.js");
const authRouter = require("./routes/auth/auth.js");
const bodyParser = require("body-parser");
const cors = require("cors");

var app = express();

app.use(cors({
  origin: "*",
  credentials: true
}));

app.use(logger("dev"));
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: false, limit: '100mb', parameterLimit: 50000 }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url} - ${new Date().toISOString()}`);
  next();
});

app.use("/", indexRouter);
app.use("/api", usersRouter);
app.use("/auth", authRouter);

module.exports = app;
