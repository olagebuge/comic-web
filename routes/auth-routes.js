const router = require("express").Router();
const passport = require("passport");
const User = require("../models/user-model");
const bcrypt = require("bcrypt");

router.get("/login", (req, res) => {
  return res.render("login",{ user: req.user });
});

router.get("/logout", (req, res) => {
  req.logOut((err) => {
    if (err) return res.send(err);
    //若沒任何問題就回到首頁
    return res.redirect("/");
  });
});

//本地登入頁面
router.get("/signup", (req, res) => {
  return res.render("signup",{ user: req.user });
});

router.post("/signup", async (req, res) => {
  let { name, email, password } = req.body;
  if (password.length < 8) {
    req.flash("error_msg", "密碼長度過短，至少需要8個英數組合文字");
    return res.redirect("/auth/signup");
  }

  //確認信箱是否被註冊過
  const fonudEmail = await User.findOne({ email }).exec();
  if (fonudEmail) {
    req.flash("error_msg", "此信箱已被註冊，請使用此信箱登入系統");
    return res.redirect("/auth/signup");
  }
  let hashedPassword = await bcrypt.hash(password, 12);
  let newUser = new User({ name, email, password: hashedPassword });
  await newUser.save();
  req.flash("success_msg", "註冊成功! 現在可以登入系統了!");
  return res.redirect("/auth/login");
});

router.post(
  "/login",
  passport.authenticate("local", {
    failureRedirect: "/auth/login",
    failureFlash: "登入失敗，帳號或密碼不正確", //它會自動被套入flash_error裡面
  }),
  (req, res) => {
    let {} = req.body;
    return res.redirect("/profile");
  }
);

//passport.authenticate是一個middleware可直接執行
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    prompt: "select_account",
  })
);

router.get("/google/redirect", passport.authenticate("google"), (req, res) => {
  console.log("正在重新導向...");
  return res.redirect("/profile");
});

module.exports = router;
