const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const bodyParser = require('body-parser');
const elipsis = require('text-ellipsis');
const multer = require('multer');
const fs = require('fs');

const app = express();

const upload = multer({
    dest: "public/images"
})

mongoose.connect('mongodb://localhost:27017/MyBlog', {useNewUrlParser: true, useUnifiedTopology: true});
let db = mongoose.connection


// db açık mı
db.once('open', function() {
    console.log('Databaseye bağlanıldı');
})


db.on('error', function(err) {
    console.log(err);
})

// Model çağırma
let Blog = require('./models/blog');

// View engine
app.set('views', path.join(__dirname, 'templates'));
app.set('view engine', 'pug');

// Body parser
app.use(bodyParser.urlencoded({extended: true}))
app.use(bodyParser.json())

// Static dosyalar
app.use(express.static(path.join(__dirname, 'public')));

// requsete blog u geçir
const passBlog = function(req, res, next) {
    Blog.findById(req.params.id, function(err, blog) {
        req.blog = blog
        next();
    })
}

// İndex route
app.get('/', function(req, res) {
    Blog.find({}, function(err, blogs) {
        if (err) {
            return err;
        }
        blogs.forEach(function(blog) {
            blog.spoiler = elipsis(blog.body, 600);
        })
        res.render('index.pug', {
            title: "İndex sayfası",
            blogs: blogs
        });
    })
});

// Blog ekleme
app.get('/blog/add', function(req, res) {
    res.render('blog/add', {
        title: 'Blog ekle'
    })
})
// Blog kayıt(POST)
app.post('/blog/add', upload.single('blog_image'), function(req, res) {
    let image = req.file;
    let image_path = image.filename;

    let blog = new Blog({
        title: req.body.title,
        author: req.body.author,
        body: req.body.content,
        image: image_path
    })
    blog.save(function(err) {
        if (err) return err;
        res.redirect('/')
    })
})

// Detay sayfası
app.get('/blog/:id', passBlog, function(req, res) {
    res.render('blog/detail', {
        blog: req.blog
    })
})

// Hakkımda sayfası
app.get('/about', function(req, res) {
    res.render('about')
})

// Düzenleme sayfası
app.get('/blog/:id/edit', passBlog, function(req, res) {
    res.render('blog/edit', {
        blog: req.blog
    })
})

app.post('/blog/:id/edit', upload.single('blog_image'), passBlog, function(req, res) {
    var payload = {
        title: req.body.title,
        body: req.body.content
    }
    if (req.file) {
        fs.unlinkSync(path.join(__dirname, 'public', 'images', req.blog.image));
        payload.image = req.file.filename;
    }

    Blog.update({_id: req.params.id}, payload ,function(err) {
         if(err) return err;
         res.redirect('/');
    })
})

app.delete('/blog/:id', function(req, res) {
    Blog.remove({_id: req.params.id}, function(err) {
        if (err) return err;
        res.sendStatus(200);
    })
})

app.listen(8000, function() {
    console.log('Server su portdan calışıyor: 8000');
})