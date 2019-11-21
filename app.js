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

// flash mesajları
app.use(flash());
app.use((req, res, next) => {
  res.locals.messages = require("express-messages")(req, res);
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
      console.log(JSON.stringify(profile));
      done(null, profile);
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

// Middleware to check if the user is authenticated
function isUserAuthenticated(req, res, next) {
  console.log(req.user);
  if (req.user) {
    if (req.user.id === process.env.GOOGLE_PERSONAL_ID) {
      next();
    } else {
      req.logout();
      res.redirect("/");
    }
  } else {
    res.redirect("/login");
  }
}

app.use("*", (req, res, next) => {
  res.locals.user = req.user || null;
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
  Blog.find({}, function(err, blogs) {
    if (err) {
      return err;
    }
    blogs.forEach(function(blog) {
      blog.spoiler = removeMd(elipsis(blog.body, 750));
    });
    res.render("index.pug", {
      title: "İndex sayfası",
      blogs: blogs.reverse()
    });
  });
});

// Blog ekleme
app.get("/blog/add", isUserAuthenticated, function(req, res) {
  res.render("blog/add", {
    title: "Blog ekle"
  });
});
// Blog kayıt(POST)
app.post("/blog/add", upload.single("blog_image"), function(req, res) {
  console.log(req.body);
  let image = req.file;
  console.log(image);
  let image_path = image.filename;

  let blog = new Blog({
    title: req.body.title,
    author: req.body.author,
    body: req.body.content,
    image: image_path
  });
  blog.save(function(err) {
    if (err) return err;
    res.redirect("/");
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
app.get("/blog/:id/edit", passBlog, function(req, res) {
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
    body: req.body.content
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

app.listen(8000, function() {
  console.log("Server su portdan calışıyor: 8000");
});
