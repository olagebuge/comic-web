const router = require("express").Router();
const User = require("../models/user-model");
const Chapter = require("../models/chapter-model");

const authCheck = (req, res, next) => {
  if (req.isAuthenticated()) {    
    next();
  } else {
    return res.redirect("/auth/login");
  }
};


router.get("/", authCheck, async (req, res) => {
  try {
    const allChapters = await Chapter.find({}).exec();
    if (req.user.role == "站長") {
      const members = await User.find({ role: { $ne: req.user.role } }).exec();
      return res.render("membermanage", { user: req.user, members, allChapters });
    } else if (req.user.role == "管理員") {
      const members = await User.find({ role: { $nin: ["站長", "管理員"] }}).exec();
      return res.render("membermanage", { user: req.user, members, allChapters});
    } else {    
      return res.redirect("/profile");
    }    
  } catch (e) {
    console.log(e)
  }
 
});

module.exports = router;
