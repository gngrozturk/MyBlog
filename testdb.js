const mongoose = require("mongoose");
const dotenv = require("dotenv").config();

const User = require("./models/user");
const Blog = require("./models/blog");

mongoose.connect(process.env.DATABASE_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
let db = mongoose.connection;

// db açık mı
db.once("open", function() {
  console.log("Databaseye bağlanıldı");
});

db.on("error", function(err) {
  console.log(err);
});

const u = new User({
  googleData: {},
  id: "12312easdasdad1231231"
});

/* User.findOne({ googleId: "106156116951180733915" })
  .populate("posts")
  .exec((err, data) => {
      data.posts.push(new Blog({
          title: "asdasdadasd",
          body: "asdasdasd",
          author: data,
          image: "asdasdas"
      }))
      data.save()
  }); */

const b =  new Blog({
    title: "asdasdadasd",
    body: "asdasdasd",
    author: mongoose.Types.ObjectId("5e3722dd24e82527b0a889a8"),
    image: "asdasdas"
})

b.save();