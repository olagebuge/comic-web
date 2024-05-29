const mongoose = require("mongoose");

//故事計數器
const counterSchema = new mongoose.Schema({
  id:{
    type:String
  },
  seq:{
    type:Number
  }
});

module.exports = mongoose.model("Counter", counterSchema);
