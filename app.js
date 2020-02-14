const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const bodyParser = require("body-parser");
const elipsis = require("text-ellipsis");
const multer = require("multer");
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

const app = express();

const PORT = process.env.PORT;

const upload = multer({
  dest: "public/images"
});

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
    saveUninitialized: true
  })
);

// Static dosyalar
app.use(express.static(path.join(__dirname, "public")));

const parseDate = dateStr => {
  const d = new Date(dateStr);
  let month = "" + (d.getMonth() + 1);
  let day = "" + d.getDate();
  const year = d.getFullYear();

  if (month.length < 2) month = "0" + month;
  if (day.length < 2) day = "0" + day;

  return [day, month, year].join("-");
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
      callbackURL: process.env.GOOGLE_CALLBACK_URL
    },
    (accessToken, refreshToken, profile, done) => {
      console.log(profile);
      User.find((data, err) => {
      });
      User.findOne({ googleId: profile.id }).exec((err, data) => {
        if (err) throw err;
        if (data === null) {
          done(null, {});
        } else {
          data.update(
            {
              googleData: profile
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
  console.log(req.user);
  res.locals.user = (req.user && !isEmpty(req.user)) ? req.user : null;
  next();
});

// requsete blog u geçir
const passBlog = function(req, res, next) {
  Blog.findById(req.params.id, function(err, blog) {
    req.blog = blog;
    next();
  });
};

app.get("/api/isauth", (req, res) => {
  let payload = {
    status: false
  };
  if (req.user) {
    payload.status = true;
  }

  res.send(payload);
});

// İndex route
app.get("/", function(req, res) {
  res.render("index", { blogs: [] });
});

// Blog ekleme
app.get("/blog/add", isUserAuthenticated, function(req, res) {
  res.render("blog/add", {
    title: "Blog ekle"
  });
});
// Blog kayıt(POST)
app.post("/blog/add", upload.single("blog_image"), function(req, res) {
  let image = req.file;
  let image_path = image.filename;

  User.findOne({ googleId: req.user.googleId })
    .populate("posts")
    .exec((err, user) => {
      if (err) throw err;
      let blog = new Blog({
        title: req.body.title,
        author: user._id,
        body: req.body.content,
        image: image_path
      });
      blog.save(
        (err,
        _ => {
          if (err) throw err;
          user.posts.push(blog);
          user.save((err, _) => {
            if (err) throw err;
            res.redirect("/");
          });
        })
      );
    });
});

// Detay sayfası
app.get("/blog/:id", passBlog, function(req, res) {
  res.render("blog/detail", {
    blog: req.blog,
    convertedContent: md.render(req.blog.body)
  });
});

// Hakkımda sayfası
app.get("/about", function(req, res) {
  res.render("about");
});

// Yazarlar tanıtım
app.get("/writers", function(req, res) {
  res.render("writers");
});

// Yazar Girişi
app.get(
  "/login",
  passport.authenticate("google", {
    scope: ["profile"]
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
          login: true
        }
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
        logout: true
      }
    })
  );
});

// Düzenleme sayfası
app.get("/blog/:id/edit", isUserAuthenticated, passBlog, function(req, res) {
  res.render("blog/edit", {
    blog: req.blog
  });
});

app.post("/blog/:id/edit", upload.single("blog_image"), passBlog, function(
  req,
  res
) {
  var payload = {
    title: req.body.title,
    body: req.body.content,
    author: req.body.author
  };
  if (req.file) {
    fs.unlinkSync(path.join(__dirname, "public", "images", req.blog.image));
    payload.image = req.file.filename;
  }

  Blog.update({ _id: req.params.id }, payload, function(err) {
    if (err) return err;
    res.redirect("/");
  });
});

app.delete("/blog/:id", function(req, res) {
  Blog.remove({ _id: req.params.id }, function(err) {
    if (err) return err;
    res.sendStatus(200);
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
        blogs = blogs.map(b => {
          b["spoiler"] = elipsis(b.body, 300);
          return b;
        });

        res.render("texts", { blogs });
      });
  });
});

app.listen(PORT, function() {
  console.log("Server su portdan calışıyor: 8000");
});
