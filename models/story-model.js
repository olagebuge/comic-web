const mongoose = require("mongoose");

const storySchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  cover: { type: String },
  date: { type: Date, default: Date.now },
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  public: { type: Boolean, default: false },
  type: {
    type: String,
    enum: ["book", "mobile", "painting"],
    default: "mobile",
  },
  number:{ //出版編號
    type: String,
    default:'mobile-1',
    required: true 
  },
  //作品的訂閱者
  subscribers: {
    type:[String],
    default:[],
  },
  views:{
    type:Number,
    default:0,
  }
});

module.exports = mongoose.model("Story", storySchema);
