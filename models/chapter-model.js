const mongoose = require("mongoose");

const chapterSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  cover: {
    type: String,
  }, 
  content: [{ //這是編輯時展示的
    imageUrl:String,
    alt:String
  },],
  showphotos: [{ //這是確定存檔的外部展示   
      imageUrl: String,
      alt:String    
  },],
  date: { type: Date, default: Date.now },
  public: { type: Boolean, default: false }, 
  story: {
    //所屬故事
    type: mongoose.Schema.Types.ObjectId,
    ref: "Story",
  }, 
  lovers: {
    //喜歡這個章節的人
    type:[String],
    default:[],
  },
  episode:{
    type: Number,
    default:1,
    required: true
  }
});

module.exports = mongoose.model("Chapter", chapterSchema);
