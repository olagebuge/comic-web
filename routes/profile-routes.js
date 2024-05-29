const router = require("express").Router();
const Story = require("../models/story-model");
const User = require("../models/user-model");
const multer = require("multer");
const path = require("path");


//做一個middleware檢驗是否有登入
const authCheck = (req, res, next) => {
  if (req.isAuthenticated()) {
    //req.isAuthenticated()跟req.logout()是passport內建的method
    next();
  } else {
    return res.redirect("/auth/login");
  }
};

//上傳圖片的middleware
const storage = multer.diskStorage({
  destination: (req, res, cb) => {
    const userId = req.user._id.toString();
    const avatarPath = path.join("public", userId);
    // 檢查目錄是否存在 如果不存在則創建
    const fs = require("fs");
    if (!fs.existsSync(avatarPath)) {
      fs.mkdirSync(avatarPath, { recursive: true });
    }
    cb(null, avatarPath);
  },
  filename: (req, file, cb) => {
    //文件名固定為 'avatar.jpg'
    cb(null, "avatar.jpg");
  },
});
const upload = multer({ storage: storage });

router.get("/", authCheck, async (req, res) => {
  let stories = await Story.find({ author: req.user._id });
  return res.render("profile", { user: req.user, stories }); //要把user的定義給樣板
});

router.get("/edit", authCheck, async (req, res) => {
  return res.render("profile-edit", { user: req.user }); //要把user的定義給樣板
});

router.patch("/edit", authCheck, upload.single("file"), async (req, res) => {
  try {
    let { name, paramID } = req.body;
    const id = req.user._id.toString();
    let foundUser = await User.findById({ _id: id }).exec();
    //如果有檔案就存到路徑,如果沒有就沿用原本的foundUser.thumbnail
    const imagePath = req.file
      ? path.join("/", id, "avatar.jpg")
      : foundUser.thumbnail;

    await User.findByIdAndUpdate(
      id,
      { name, paramID, thumbnail: imagePath },
      { new: true, runValidators: true }
    );

    return res.redirect("/profile");
  } catch (e) {    
    console.log(e.message);
    req.flash("error_msg", "自訂帳號至少須為4個英文字母或數字");
    return res.redirect("/profile/edit");
  }
});

router.get("/:paramID", async (req, res) => {
  try {
    let { paramID } = req.params;
    let foundUser = await User.findOne({ paramID });
    let stories = await Story.find({ author:foundUser._id, public: true });
    return res.render("profile-public", { user: req.user, foundUser, stories });
  } catch (e) {
    console.log(e);
  }
});

module.exports = router;
