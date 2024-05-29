const router = require("express").Router();
const Story = require("../models/story-model");
const Chapter = require("../models/chapter-model");
const Counter = require("../models/counter-model");
const User = require("../models/user-model");
const multer = require("multer");
const path = require("path");

//檢驗是否有登入
//req.isAuthenticated()跟req.logout()是passport內建的method
const authCheck = (req, res, next) => {
  if (req.isAuthenticated()) {
    next();
  } else {
    return res.redirect("/auth/login");
  }
};

const authCheckPrams = async (req, res, next) => {
  if (req.isAuthenticated()) {
    const { type, number } = req.params;
    let foundStory = await Story.findOne({ type, number }).exec();
    const authorID = foundStory.author.toString();
    const userID = req.user._id.toString();
    if (authorID === userID) {
      next();
    } else {
      req.flash("error_msg", "沒有閱覽權限");
      return res.redirect("/profile");
    }
  } else {
    return res.redirect("/auth/login");
  }
};

//上傳圖片的middleware
const storage = multer.diskStorage({
  destination: (req, res, cb) => {
    const userId = req.user._id.toString();
    const avatarPath = path.join("public", userId);

    // 檢查目錄是否存在，如果不存在則創建
    const fs = require("fs");
    if (!fs.existsSync(avatarPath)) {
      fs.mkdirSync(avatarPath, { recursive: true });
    }
    cb(null, avatarPath);
  },
  filename: (req, file, cb) => {
    file.originalname = Buffer.from(file.originalname, "latin1").toString(
      "utf8"
    );
    cb(
      null,
      file.fieldname + "_" + Date.now() + path.extname(file.originalname)
    );
  },
});
const upload = multer({ storage: storage });

router.get("/", authCheck, async (req, res) => {
  let stories = await Story.find({ author: req.user._id }).exec();
  return res.render("story-manage", { user: req.user, stories });
});

router.get("/new", authCheck, (req, res) => {
  return res.render("newstory", { user: req.user });
});

router.post("/new", authCheck, upload.single("story"), async (req, res) => {
  try {
    Counter.findOneAndUpdate(
      { id: "autoval" },
      { $inc: { seq: 1 } },
      { new: true },
      async (err, cd) => {
        if (cd == null) {
          const newval = new Counter({ id: "autoval", seq: 1 });
          await newval.save();
          const seqID = 1; //如果資料庫沒有這id，就是第一筆資料
          await saveStory(seqID);
        } else {
          const seqID = cd.seq;
          await saveStory(seqID);
        }
      }
    );
    async function saveStory(seqID) {
      let { title, content, type } = req.body;
      const coverFileName = req.file ? req.file.filename : "no-cover.jpg";
      const authorId = req.user._id.toString();
      let newStory = new Story({
        title,
        content,
        type,
        author: authorId, // 從請求對象獲取使用者ID,
        cover: coverFileName,
        public: false, // 預設為非公開
        subscribers: [], // 預設沒有訂閱者
        number: seqID,
      });
      await newStory.save();
      req.flash("success_msg", "故事創建成功，可以新增章節了!");
      return res.redirect("/profile");
    }
  } catch (e) {
    console.log(e);
    req.flash("error_msg", "標題與內容都需要填寫");
    return res.redirect("/story/new");
  }
});

router.get("/:type-:number", async (req, res) => {
  try {
    let { type, number } = req.params;
    let foundStory = await Story.findOne({ type, number }).exec();  

    // 先檢查是否找到故事
    if (!foundStory) {
      req.flash("error_msg", "此故事不存在");
      return res.send("故事不存在");
    }
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
    // 如果故事未公開，且使用者非本人或未登入 
    if(!foundStory.public && foundStory.author.toString() !== user?.id){      
      return res.send("此故事尚未公開");
    }

    // 如果上面的條件都通過，就可以正常回傳 JSON 資料
    const foundChapters = await Chapter.find({ story: foundStory._id }).exec();  
    return res.render("story",{ user, foundStory, foundChapters });
  } catch (e) {
    console.log(e.message);
  }
});

router.get("/:type-:number/edit", authCheckPrams, async (req, res) => {
  try {
    let { type, number } = req.params;
    let foundStory = await Story.findOne({ type, number }).exec();
    const foundChapters = await Chapter.find({ story: foundStory._id }).exec();

    if (!foundStory) {
      req.flash("error_msg", "此故事不存在");
      return res.redirect("/profile");
    }

    return res.render("story-edit", {
      user: req.user,
      foundStory,
      foundChapters,
    });
  } catch (e) {
    console.log(e.message);
  }
});

router.patch(
  "/:type-:number/edit",
  authCheckPrams,
  upload.single("cover"),
  async (req, res) => {
    try {
      let { type, number } = req.params;
      let { title, content } = req.body;
      let foundStory = await Story.findOne({ type, number }).exec();
      const imageFileName = req.file ? req.file.filename : foundStory.cover;

      await Story.findOneAndUpdate(
        { type, number },
        { title, content, cover: imageFileName },
        { new: true, runValidators: true }
      );
      req.flash("success_msg", "故事已更新！");
      return res.redirect("/story");
    } catch (e) {
      console.log(e);
    }
  }
);

//刪除章節
router.delete("/:type-:number/", authCheckPrams, async (req, res) => {
  try {
    let { type, number } = req.params;
    let foundStory = await Story.findOne({ type, number }).exec();
   
    // 驗證是否有該筆資料
    if (!foundStory) {
      return res.status(404).json({ message: "沒有找到這個故事，無法刪除" });
    }

    await foundStory.deleteOne({ story: foundStory._id});

    //刪除上傳的圖片
    const fs = require("fs");
    fs.unlinkSync(`public/${foundStory.author._id}/${foundStory.cover}`);
    //應該還要連帶所有章節的圖片...待補
    
    return res.redirect(
      `/profile`
    );
  } catch (e) {
    console.log(e);
  }
});

router.patch("/:type-:number/changeshelf", authCheckPrams, async (req, res) => {
  try {
    let { type, number } = req.params;
    let currentStory = await Story.findOne({ type, number }).exec();
    let currentBool = currentStory.public;

    if (currentBool == true) {
      await Story.findOneAndUpdate(
        { type, number },
        { public: false },
        {
          new: true,
          runValidators: true,
          // 不能寫overwrite: true
        }
      );
      req.flash("success_msg", `故事『${currentStory.title}』已下架`);
    } else {
      await Story.findOneAndUpdate(
        { type, number },
        { public: true },
        {
          new: true,
          runValidators: true,
          // 不能寫overwrite: true
        }
      );
      req.flash("success_msg", `故事『${currentStory.title}』已公開`);
    }
    return res.redirect("/profile");
  } catch (e) {
    console.log(e);
    req.flash("error_msg", "無法上下架，請聯繫客服人員");
    return res.redirect("/profile");
  }
});

router.get("/:type-:number/newchapter", authCheckPrams, async (req, res) => {
  let { type, number } = req.params;
  let foundStory = await Story.findOne({ type, number }).exec();
  return res.render("newchapter", { user: req.user, foundStory });
});

router.get("/:type-:number/:episode", async (req, res) => {
  try {
    let { type, number, episode } = req.params;
    let foundStory = await Story.findOne({ type, number }).exec();
    let theChapter = await Chapter.findOne({
      story: foundStory._id,
      episode,
    }).exec();
    let foundChapters = await Chapter.find({ story: foundStory._id }).exec();
    // 驗證是否有該筆資料
    if (!theChapter) {
      return res.status(404).json({ message: "沒有找到這個章節" });
    }
    foundStory.views += 1;
    await foundStory.save();
    return res.render("chapter", {
      user: req.user,
      foundStory,
      theChapter,
      foundChapters,
    });
  } catch (e) {
    console.log(e);
  }
});

router.get("/:type-:number/:episode/edit", authCheckPrams, async (req, res) => {
  try {
    let { type, number, episode } = req.params;
    let foundStory = await Story.findOne({ type, number }).exec();
    let theChapter = await Chapter.findOne({
      story: foundStory._id,
      episode,
    }).exec();
    // 驗證是否有該筆資料
    if (!theChapter) {
      return res.status(404).json({ message: "沒有找到這個章節" });
    }
    return res.render("chapter-edit", {
      user: req.user,
      foundStory,
      theChapter,
    });
  } catch (e) {
    console.log(e);
  }
});

router.post(
  "/:type-:number/newchapter",
  authCheckPrams,
  upload.fields([{ name: "cover", maxCount: 1 }, { name: "content" }]),
  async (req, res) => {
    try {
      let { type, number } = req.params;
      let foundStory = await Story.findOne({ type, number }).exec();
      let foundChapters = await Chapter.find({ story: foundStory._id }).exec();
      let { title } = req.body;
      const imageFileName = req.files["cover"][0]
        ? req.files["cover"][0].filename
        : "no-cover.jpg";
      const contentArray = req.files["content"]
        ? req.files["content"].map((file) => ({
            imageUrl: file.filename,
            alt: file.originalname,
          }))
        : [];
      let newChapter = new Chapter({
        title,
        cover: imageFileName,
        content: contentArray,
        showphotos: contentArray,
        public: false,
        story: foundStory._id,
        lovers: [],
        episode: foundChapters.length + 1,
      });
      await newChapter.save();
      req.flash("success_msg", "成功新增章節!");
      return res.json({ newChapter });
    } catch (e) {
      console.log(e);
    }
  }
);

//更改章節所有內容
router.patch(
  "/:type-:number/:episode/edit",
  authCheckPrams,
  upload.single("cover"),
  async (req, res) => {
    try {
      let { type, number, episode } = req.params;
      let foundStory = await Story.findOne({ type, number }).exec();
      let theChapter = await Chapter.findOne({
        story: foundStory._id,
        episode,
      }).exec();
      // 驗證是否有該筆資料
      if (!theChapter) {
        return res.status(404).json({ message: "沒有找到這個章節" });
      }
      let cover = req.file ? req.file.filename : theChapter.cover;
      let { title, content } = req.body;
      let parseContent = JSON.parse(content);

      let updatedChapter = await Chapter.findOneAndUpdate(
        { story: foundStory._id, episode },
        { title, cover, content: parseContent, showphotos: parseContent }
      );
      return res.json({ updatedChapter });
    } catch (e) {
      console.log(e);
    }
  }
);

//更改章節的內容圖片列表
router.patch(
  "/:type-:number/:episode/photos",
  authCheckPrams,
  upload.array("content"),
  async (req, res) => {
    try {
      let { type, number, episode } = req.params;
      let foundStory = await Story.findOne({ type, number }).exec();
      let theChapter = await Chapter.findOne({
        story: foundStory._id,
        episode,
      }).exec();
      // 驗證是否有該筆資料
      if (!theChapter) {
        return res.status(404).json({ message: "沒有找到這個章節" });
      }
      const addArray = req.files
        ? req.files.map((file) => ({
            imageUrl: file.filename,
            alt: file.originalname,
          }))
        : [];

      // 將新上傳的圖片和原本的圖片合併
      const updatedPhotos = [...theChapter.content, ...addArray];
      await Chapter.findOneAndUpdate(
        { story: foundStory._id, episode },
        { content: updatedPhotos }
      );

      const updatedChapter = await Chapter.findOne({
        story: foundStory._id,
        episode,
      }).exec();
      res.json({ updatedChapter }); //把新增的圖片資訊回傳給前端
    } catch (e) {
      console.log(e);
    }
  }
);

//刪除章節
router.delete("/:type-:number/:episode/", authCheckPrams, async (req, res) => {
  try {
    let { type, number, episode } = req.params;
    let foundStory = await Story.findOne({ type, number }).exec();
    let theChapter = await Chapter.findOne({
      story: foundStory._id,
      episode,
    }).exec();
    // 驗證是否有該筆資料
    if (!theChapter) {
      return res.status(404).json({ message: "沒有找到這個章節，無法刪除" });
    }

    await theChapter.deleteOne({ story: foundStory._id, episode });

    //刪除上傳的圖片
    const fs = require("fs");
    fs.unlinkSync(`public/${foundStory.author._id}/${theChapter.cover}`);
    theChapter.content.forEach((photo) => {
      fs.unlinkSync(`public/${foundStory.author._id}/${photo.imageUrl}`);
    });

    // 尋找所有大於被刪除章節 episode 的章節
    const chaptersToUpdate = await Chapter.find({
      story: foundStory._id,
      episode: { $gt: episode },
    }).exec();

    // 更新章節的 episode 屬性
    for (let i = 0; i < chaptersToUpdate.length; i++) {
      chaptersToUpdate[i].episode -= 1;
      await chaptersToUpdate[i].save();
    }
    return res.redirect(
      `/story/${foundStory.type}-${foundStory.number}/edit`
    );
  } catch (e) {
    console.log(e);
  }
});

router.patch("/:_id/bookmark", authCheck, async (req, res) => {
  try {
    let { _id } = req.params;
    let theStory = await Story.findById({ _id }).exec();
    let author = await User.findById(theStory.author).exec();
    //沒有找到故事
    if (!theStory) {
      return res.status(404).send("沒有找到故事");
    }
    const isBookmarked = req.user.subscribedStories.includes(theStory._id);

    if (isBookmarked) {
      // 如果已經加入書籤，則移出書籤
      req.user.subscribedStories.pull(theStory._id);
      theStory.subscribers.pull(req.user._id);
    } else {
      // 如果未加入書籤，則加入書籤
      req.user.subscribedStories.push(theStory._id);
      theStory.subscribers.push(req.user._id);
    }
    // 保存更改
    await Promise.all([req.user.save(), theStory.save()]);
    return res.redirect(`/profile/${author.paramID}`);
  } catch (e) {
    console.log(e);
  }
});

// 章節按讚
router.patch("/:_id/:episode/love", authCheck, async (req, res) => {
  try {
    let { _id, episode } = req.params;
    let foundStory = await Story.findById({ _id }).exec();
    let theChapter = await Chapter.findOne({
      story: foundStory,
      episode,
    }).exec();
    //沒有找到故事
    if (!foundStory) {
      return res.status(404).send("沒有找到故事");
    }
    //沒有找到章節
    if (!theChapter) {
      return res.status(404).send("沒有找到章節");
    }
    //已按讚
    const isLoved = req.user.loveChapters.includes(theChapter._id);

    if (isLoved) {
      // 如果已經按讚則移出陣列
      req.user.loveChapters.pull(theChapter._id);
      theChapter.lovers.pull(req.user._id);
    } else {
      // 如果未按讚則加入陣列
      req.user.loveChapters.push(theChapter._id);
      theChapter.lovers.push(req.user._id);
    }
    // 保存更改
    await Promise.all([req.user.save(), theChapter.save()]);
    return res.redirect(`/story/${foundStory.type}-${foundStory.number}`);
  } catch (e) {
    console.log(e);
  }
});

module.exports = router;
