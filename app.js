require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const encrypt = require("mongoose-encryption");

const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));

mongoose.connect("mongodb://127.0.0.1:27017/userDB").then(() => {

    const userSchema = new mongoose.Schema({
        email: String,
        password: String
    });

    const secret = process.env.SECRET_KEY;
    userSchema.plugin(encrypt, {secret: secret, encryptedFields: ['password']});

    const User = new mongoose.model("User", userSchema);

    app.get("/", (req, res) => {
        res.render("home");
    });

    app.get("/register", (req, res) => {
        res.render("register");
    });

    app.get("/login", (req, res) => {
        res.render("login");
    });

    app.post("/register", (req, res) => {
        const newUser = new User ({
            email: req.body.username,
            password: req.body.password
        });
        newUser.save().then(() =>{
            res.render("secrets");
        }).catch((err) => {
            console.error(err);
        });
    });

    app.post('/login', (req, res) => {
        const username = req.body.username;
        const password = req.body.password;

        User.findOne({email: username}).then((foundUser) => {
            if (foundUser) {
                if (foundUser.password === password) {
                    res.render("secrets");
                } else {
                    console.log("Sorry! Incorrect Password.");
                }
            } else {
                console.log("The userid does not exit!");
            }
        }).catch((err) => {
            console.error(err);
        });
    });






    const port = process.env.PORT || 3000;
    app.listen(port, () => {
        console.log("The server is running on port " + port);
    });
}).catch((err) => {
    console.error(err);
});
