const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20");
const User = require("../models/user-model");
const LocalStrategy = require("passport-local");
const bcrypt = require("bcrypt");

passport.serializeUser((user, done) => {
  console.log("Serialize序列化使用者...");
  done(null, user._id); //將mongoDB的ID，存在session內部
  //並將id簽名後，以cookie的形式給使用者...
});
passport.deserializeUser(async (_id, done) => {
  console.log(
    "deserialize使用者...,使用serializeUser儲存的id，去找到資料庫內的資料"
  );
  let foundUser = await User.findOne({ _id });
  done(null, foundUser); //將預設的req.user屬性設定為foundUser
});

//google登入功能
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/api/auth/google/redirect",
    },
    async (accessToken, refreshToken, profile, done) => {
      console.log("進入google Strategy的區域");      
      let foundUser = await User.findOne({ googleID: profile.id }).exec();
      if (foundUser) {
        console.log("使用者已經註冊過了，無須存入資料庫內。");
        done(null, foundUser);
      } else {
        console.log("偵測到新用戶，須將資料存入資料庫內。");
        let newUser = new User({
          name: profile.displayName,
          googleID: profile.id,
          thumbnail: profile.photos[0].value,
          email: profile.emails[0].value,
        });
        let savedUser = await newUser.save();
        console.log("成功創建新用戶。");
        //這是passport規定的用法
        done(null, savedUser);
      }
    }
  )
);

//本地登入功能，用來驗證登入資料跟註冊無關
passport.use(
  new LocalStrategy(
    //email的name屬性必須被叫做username
    async (username, password, done) => {
      let foundUser = await User.findOne({ email: username }).exec();
      if (foundUser) {
        let result = await bcrypt.compare(password,foundUser.password);
        if(result){
          done(null,foundUser);
        }else{
          done(null,false);
        }
      } else {
        done(null,false);//false代表沒有驗證成功 帳號或密碼錯誤
      }
    }
  )
);
