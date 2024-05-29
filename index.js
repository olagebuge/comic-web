const dotenv = require("dotenv");
dotenv.config();
const express = require("express");
const app = express();
const cors = require('cors')
const mongoose = require("mongoose");
const authRoutes = require("./routes/auth-routes");
const profileRoutes = require("./routes/profile-routes");
const storyRoutes = require("./routes/story-routes");
const memberRoutes = require("./routes/member-routes");
const passport = require("passport");
require("./config/passport");
const session = require("express-session");
const Story = require("./models/story-model");
const flash = require("connect-flash");
const methodOverride = require("method-override");
const MongoStore = require('connect-mongo');

//佈署設置
mongoose.set('strictQuery', true);
//連結mongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("正在連結到mongoDB...");
  })
  .catch((e) => {
    console.log(e);
  });

//設定Middlewares以及排版引擎
app.set("view engine", "ejs");
app.use(cors())
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public")); //public目錄為靜態網址
app.use(express.static("node_modules"));
app.use(methodOverride("_method"));


app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false },
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
      collectionName: 'sessions'
    })
  })
);
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
app.use((req, res, next) => {
  //res.locals是res的預設屬性
  res.locals.success_msg = req.flash("success_msg"); 
  res.locals.error_msg = req.flash("error_msg"); 
  res.locals.error = req.flash("error"); 
  next();
});

//設定routes

app.use("/auth", authRoutes);
app.use("/profile", profileRoutes);
app.use("/story", storyRoutes);
app.use("/member", memberRoutes);

app.get("/", async (req, res) => {
  let user = null;
  // 檢查使用者是否已登入
  if (req.user) {
    // 只保留必要的使用者資訊
    user = {
      id: req.user._id.toString(),
      name: req.user.name,
      role: req.user.role,
      thumbnail: req.user.thumbnail,
    };
  }
  
  let stories = await Story.find({ public: true }).populate({
    path: 'author',
    select: 'name',
  });  
  return res.render("index", { user: req.user, stories });
});



app.listen("8080", () => {
  console.log("伺服器正在port8080運行...");
});
