const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const bodyParser = require("body-parser");
const elipsis = require("text-ellipsis");
const fs = require("fs");
const md = require("markdown-it")();
const removeMd = require("remove-markdown");
const cookieParser = require("cookie-parser");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth2");
const session = require("express-session");
const flash = require("connect-flash");
const url = require("url");
const dotenv = require("dotenv").config();
const moment = require("moment");
const axios = require("axios");
moment.locale("tr");
const app = express();

const PORT = process.env.PORT;

mongoose.connect(process.env.DATABASE_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
let db = mongoose.connection;

// db açık mı
db.once("open", function () {
  console.log("Databaseye bağlanıldı");
});

db.on("error", function (err) {
  console.log(err);
});

// Model çağırma
let Blog = require("./models/blog");
let User = require("./models/user");

// View engine
app.set("views", path.join(__dirname, "templates"));
app.set("view engine", "pug");

// Body parser
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Cookie parser
app.use(cookieParser());

// Session
app.use(
  session({
    secret: "this secret",
    resave: true,
    saveUninitialized: true,
  })
);

// Static dosyalar
app.use(express.static(path.join(__dirname, "public")));

const parseDate = (dateStr) => {
  return moment(dateStr).fromNow();
};

// flash mesajları
app.use(flash());
app.use((req, res, next) => {
  res.locals.messages = require("express-messages")(req, res);
  res.locals.parseDate = parseDate;
  next();
});

// Passport configure
app.use(passport.initialize());
app.use(passport.session());

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    (accessToken, refreshToken, profile, done) => {
      User.find((data, err) => {});
      User.findOne({ googleId: profile.id }).exec((err, data) => {
        if (err) throw err;
        if (data === null) {
          done(null, {});
        } else {
          data.update(
            {
              googleData: profile,
            },
            (err, _) => {
              if (err) throw err;
              done(null, data);
            }
          );
        }
      });
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

function isEmpty(obj) {
  return Object.entries(obj).length === 0 && obj.constructor === Object;
}

// Middleware to check if the user is authenticated
function isUserAuthenticated(req, res, next) {
  if (req.user && !isEmpty(req.user)) {
    next();
  } else {
    res.redirect("/");
  }
}

app.use("*", (req, res, next) => {
  res.locals.user = req.user && !isEmpty(req.user) ? req.user : null;
  next();
});

// requsete blog u geçir
const passBlog = function (req, res, next) {
  Blog.findById(req.params.id, function (err, blog) {
    req.blog = blog;
    next();
  });
};

app.get("/api/isauth", (req, res) => {
  let payload = {
    status: false,
  };
  if (req.user) {
    payload.status = true;
  }

  res.send(payload);
});

app.get("/api/get_last_yt", (req, res) => {
  axios
    .get(
      "https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&maxResults=25&playlistId=UUSWKuakUfWuDKphpYVakTQA&key=AIzaSyBVqkrYpS3bdem_bxDOwGfXXxoaPbnZjm4"
    )
    .then(({data}) => {
      const lastID = data.items[0].contentDetails.videoId
      res.status(200).json(`https://www.youtube.com/embed/${lastID}`)
    }).catch(err => {
      res.status(500).json("Error when getting video url")
    })
});

// İndex route
app.get("/", function (req, res) {
  Blog.find({})
    .sort("-pub_date")
    .populate("author")
    .select("title author pub_date image")
    .limit(4)
    .exec((err, blogs) => {
      if (err) throw err;
      res.render("index", { blogs });
    });
});

// Blog ekleme
app.get("/blog/add", isUserAuthenticated, function (req, res) {
  res.render("blog/add", {
    title: "Blog ekle",
  });
});
// Blog kayıt(POST)
app.post("/blog/add", isUserAuthenticated, function (req, res) {
  User.findOne({ googleId: req.user.googleId })
    .populate("posts")
    .exec((err, user) => {
      if (err) throw err;
      new Blog({
        title: req.body.title,
        body: req.body.detail,
        author: user._id,
        image: req.body.bannerUrl,
      }).save((err, blog) => {
        if (err) throw err;
        user.posts.push(blog),
          user.save((err, _) => {
            if (err) throw err;
            res.status(200);
          });
      });
    });
  res.sendStatus(200);
});

// Detay sayfası
app.get("/blog/:id", passBlog, function (req, res) {
  res.render("blog/detail", {
    blog: req.blog,
    convertedContent: md.render(req.blog.body),
  });
});

// Hakkımda sayfası
app.get("/about", function (req, res) {
  res.render("about");
});

//Privacy
app.get("/privacy", function (req, res) {
  res.render("privacy");
});

// Yazarlar tanıtım
app.get("/writers", function (req, res) {
  res.render("writers");
});

// Yazar Girişi
app.get(
  "/login",
  passport.authenticate("google", {
    scope: ["profile"],
  })
);

app.get(
  "/auth/google/callback",
  passport.authenticate("google"),
  isUserAuthenticated,
  (req, res) => {
    req.flash("success", "Hoş geldiniz " + req.user.displayName);
    res.redirect(
      url.format({
        pathname: "/",
        query: {
          login: true,
        },
      })
    );
  }
);

app.get("/logout", (req, res) => {
  req.logout();
  req.flash("warning", "Çıkış yaptınız");
  res.redirect(
    url.format({
      pathname: "/",
      query: {
        logout: true,
      },
    })
  );
});

// Düzenleme sayfası
app.get("/blog/:id/edit", isUserAuthenticated, passBlog, function (req, res) {
  res.render("blog/edit", {
    blog: req.blog,
  });
});

app.post("/blog/:id/edit", passBlog, function (req, res) {
  var payload = {
    title: req.body.title,
    body: req.body.content,
    image: req.body.bannerUrl,
  };

  Blog.update({ _id: req.params.id }, payload, function (err) {
    if (err) return err;
    res.redirect("/");
  });
});

app.delete("/blog/:id", isUserAuthenticated, function (req, res) {
  Blog.findOne({ _id: req.params.id })
    .populate("author")
    .exec((err, blog) => {
      if (err) throw err;
      const user = blog.author;

      user.posts = user.posts.filter((x) => !x.equals(blog._id));
      user.save((err, _) => {
        res.sendStatus(200);
      });
      blog.remove();
    });
});

app.get("/users/:username/blogs", (req, res) => {
  const { username } = req.params;
  User.findOne({ username }).exec((err, user) => {
    if (err) throw err;
    Blog.find({ author: user })
      .populate("author")
      .sort("-pub_date")
      .exec((err, blogs) => {
        if (err) throw err;
        blogs = blogs.map((b) => {
          b.spoiler = elipsis(b.body, 300);
          return b;
        });

        res.render("texts", { blogs, author: user });
      });
  });
});

app.listen(PORT, function () {
  console.log("Server su portdan calışıyor: 8000");
});
