const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const bodyParser = require('body-parser');
const elipsis = require('text-ellipsis');

const app = express();

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

// İndex route
app.get('/', function(req, res) {
    Blog.find({}, function(err, blogs) {
        if (err) {
            return err;
        }
        blogs.forEach(function(blog) {
            blog.spoiler = elipsis(blog.body, 200);
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
app.post('/blog/add', function(req, res) {
    let blog = new Blog({
        title: req.body.title,
        author: req.body.author,
        body: req.body.content,
    })
    blog.save(function(err) {
        if (err) return err;
        res.redirect('/')
    })
})

app.get('/blog/:id', function(req, res) {
    Blog.findById(req.params.id, function(err, blog) {
        if (err) return err;
        res.render('blog/detail', {
            blog: blog
        })
    })
})



app.listen(8000, function() {
    console.log('Server su portdan calışıyor: 8000');
    console.log('Çıkmak için ctrl+c')
})