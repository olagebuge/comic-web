const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    minLength: 1,
    maxLength: 255,
  },
  googleID: {
    type: String,
  },
  paramID:{
    type: String,    
    minLength: 4,
    maxLength: 50,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  thumbnail: {
    //這是大頭貼圖片位置
    type: String,
    default:'/images/no-thumbnail.jpg'
  },
  email: {
    type: String,
  },
  role:{
    type: String,
    enum:["站長", "管理員", "使用者"],
    default:"使用者"
  },
  password: {
    type: String,
    minLength: 8,
    maxLength: 1024,
  },  
  //作品總數
  storiesCount: {
    type: Number,
    default: 0
  },
  //作品積分
  score: {
    type: Number,
    default: 0
  },
  //訂閱的作品
  subscribedStories: {
    type:[String],
    default:[],
  },
  //喜歡的章節
  loveChapters: {
    type:[String],
    default:[],
  },
});

userSchema.pre('save', async function (next) {
  if (!this.paramID) {
    // 如果 paramID 不存在，就使用 _id(primary key) 的值作為 paramID 的預設值
    this.paramID = this._id ? this._id.toString() : undefined;
  } else {
    // 如果 paramID 存在，確保它是唯一的
    const existingUser = await this.constructor.findOneAndUpdate(
      { paramID: this.paramID },
      { $setOnInsert: { paramID: this._id.toString() } },
      { upsert: true, new: true }
    );
    // 如果存在相同的 paramID，就更新它為 _id
    if (existingUser && existingUser._id.toString() !== this._id.toString()) {
      this.paramID = this._id.toString();
    }
  }
  next();
});


module.exports = mongoose.model("User", userSchema);

