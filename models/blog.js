const mongoose = require("mongoose");




// Blog şeması
let blogSchema = mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  body: {
    type: String,
    required: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  
  image: {
    type: String,
    required: true
  },
  pub_date: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Blog", blogSchema);
