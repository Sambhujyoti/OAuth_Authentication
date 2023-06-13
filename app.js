require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

const GoogleStrategy = require("passport-google-oauth20").Strategy;
const LinkedInStrategy = require('passport-linkedin-oauth2').Strategy;

const findOrCreate = require("mongoose-findorcreate");

const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
    secret: "This is my secret.",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB", {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    const userSchema = new mongoose.Schema({
        email: String,
        password: String,
        socialId: String,
        secret: String
    });

    userSchema.plugin(passportLocalMongoose);
    userSchema.plugin(findOrCreate);

    const User = mongoose.model("User", userSchema);

    passport.use(User.createStrategy());

    passport.serializeUser(function(user, cb) {
        process.nextTick(function() {
          cb(null, { id: user.id, username: user.username });
        });
      });
      
      passport.deserializeUser(function(user, cb) {
        process.nextTick(function() {
          return cb(null, user);
        });
      });
    
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "http://localhost:3000/auth/google/secrets"
    },
        function (accessToken, refreshToken, profile, cb) {
            User.findOrCreate({ socialId: profile.id }, function (err, user) {
                return cb(err, user);
            });
        }
    ));

    app.get("/", (req, res) => {
        res.render("home");
    });

    app.get('/auth/google',
        passport.authenticate('google', { scope: ['profile'] })
    );

    app.get('/auth/google/secrets',
        passport.authenticate('google', { failureRedirect: '/login' }),
        (req, res) => {
            res.redirect('/secrets');
        }
    );

    passport.use(new LinkedInStrategy({
        clientID: process.env.LINKEDIN_KEY,
        clientSecret: process.env.LINKEDIN_SECRET,
        callbackURL: "http://localhost:3000/auth/linkedin/secrets",
        scope: ['r_emailaddress', 'r_liteprofile'],
      }, 
        function(accessToken, refreshToken, profile, cb) {
            User.findOrCreate({ socialId: profile.id }, function (err, user) {
                return cb(err, user);
            });
        }
    ));

    app.get('/auth/linkedin',
        passport.authenticate('linkedin', { state: 'SOME STATE'  }),
        function(req, res){
    });

    app.get('/auth/linkedin/secrets', passport.authenticate('linkedin', {
        successRedirect: '/secrets',
        failureRedirect: '/login'
    }));

    app.get("/register", (req, res) => {
        res.render("register");
    });

    app.get("/login", (req, res) => {
        res.render("login");
    });

    app.get("/secrets", (req, res) => {
        User.find({"secret": {$ne: null}}).then((foundUsers) => {
            if (foundUsers) {
                res.render("secrets", {usersWithSecrets: foundUsers});
            } else {
                console.log("No user found.");
            }
        }).catch((err) => {
            console.error(err);
        });
    });

    app.post("/register", (req, res) => {
        User.register({ username: req.body.username }, req.body.password, (err, user) => {
            if (err) {
                console.log(err);
                res.redirect("/register");
            } else {
                passport.authenticate("local")(req, res, () => {
                    res.redirect("/secrets");
                });
            }
        });
    });

    app.post('/login', (req, res) => {
        const user = new User({
            username: req.body.username,
            password: req.body.password
        });

        req.login(user, (err) => {
            if (err) {
                console.log(err);
            } else {
                passport.authenticate("local")(req, res, () => {
                    res.redirect("/secrets");
                });
            }
        });
    });

    app.get('/submit', (req, res) => {
        if (req.isAuthenticated()) {
            res.render("submit");
        } else {
            res.redirect("/login");
        }
    });

    app.post('/submit', (req, res) => {
        const submittedSecret = req.body.secret;
        User.findById(req.user.id).then((foundUser) => {
            if (foundUser) {
                foundUser.secret = submittedSecret;
                foundUser.save();
                res.redirect("/secrets");
            } else {
                console.log("User not found.");
            }
        }).catch((err) =>{
            console.error(err);
        });
    });

    app.get("/logout", (req, res) => {
        req.logout((err) => {
            if(!err) {
                res.redirect("/");
            }
        });
    });

    const port = process.env.PORT || 3000;
    app.listen(port, () => {
        console.log("The server is running on port " + port);
    });
}).catch((err) => {
    console.error(err);
});
