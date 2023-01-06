require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const findOrCreate = require("mongoose-findorcreate");

///////////////////////////////////////////////////////////
// ENVIRONMENT VARIALBLE
// GOOGLE .ENV
const googleCallBackUrl = process.env.GOOGLE_CALLBACK_URL;
const googleclientID = process.env.CLIENT_ID;
const googleclientSecret = process.env.CLIENT_SECRET;
// FACEBOOK .ENV
const facebookAppId = process.env.FACEBOOK_APP_ID;
const facebbokAppSecret = process.env.FACEBOOK_APP_SECRET;
const facebookCallBackUrl = process.env.FACEBOOK_CALLBACK_URL;
// MONGO DB .ENV
const usernameDB = process.env.DATABASE_USERNAME;
const passwordDB = process.env.DATABASE_PASSWORD;
/////////////////////////////////////////////////////////////////

// Google Strategy
const GoogleStrategy = require("passport-google-oauth20").Strategy;

// Google Strategy
const FacebookStrategy = require("passport-facebook").Strategy;

const app = express();

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// setup session
app.use(
  session({
    secret: "thisisit.",
    resave: false,
    saveUninitialized: false,
  })
);
// initialize passport
app.use(passport.initialize());
app.use(passport.session());

// GOOGLE Configure Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: googleclientID,
      clientSecret: googleclientSecret,
      callbackURL: googleCallBackUrl,
    },
    function (accessToken, refreshToken, profile, cb) {
      User.findOrCreate({ googleId: profile.id }, function (err, user) {
        return cb(err, user);
      });
    }
  )
);
// FACEBOOK Configure Strategy
passport.use(
  new FacebookStrategy(
    {
      clientID: facebookAppId,
      clientSecret: facebbokAppSecret,
      callbackURL: facebookCallBackUrl,
    },
    function (accessToken, refreshToken, profile, cb) {
      User.findOrCreate({ facebookId: profile.id }, function (err, user) {
        return cb(err, user);
      });
    }
  )
);
// MONGOOSE SECTION //
mongoose.set("strictQuery", true);

mongoose.set("strictQuery", true);
const url =
  "mongodb+srv://" +
  usernameDB +
  ":" +
  passwordDB +
  "@cluster0.fzfjyqq.mongodb.net/userDB?authSource=admin";

mongoose
  .connect(url)
  .then(() => {
    console.log("Connected to database !!");
  })
  .catch((err) => {
    console.log("Connection failed !! " + err.message);
  });
const postsSchema = new mongoose.Schema({
  title: String,
  content: String,
});
// USER SCHEMA
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  facebookId: String,
  secret: String,
});

// add passport local mongoose
userSchema.plugin(passportLocalMongoose);
// add passport findOrcreate
userSchema.plugin(findOrCreate);

// MODEL //
const User = new mongoose.model("User", userSchema);

// create strategy and serialize and deserialize cookie
passport.use(User.createStrategy());

passport.serializeUser(function (user, cb) {
  process.nextTick(function () {
    return cb(null, {
      id: {
        _id: user.id,
        username: user.username,
      },
    });
  });
});

passport.deserializeUser(function (user, cb) {
  process.nextTick(function () {
    return cb(null, user);
  });
});
// ROUTES SECTION //
// ***************** //
// HOME //
// ***************** //
app.get("/", function (req, res) {
  res.render("home");
});

//// ***************** //
// ***************** //
// GOOGLE //
// ***************** //
app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile"] })
);
app.get(
  "/auth/google/secrets",
  passport.authenticate("google", { failureRedirect: "/login" }),
  function (req, res) {
    // Successful authentication, redirect secrets.
    res.redirect("/secrets");
  }
);
//// ***************** //
// ***************** //
// FACEBOOK //
// ***************** //

app.get("/auth/facebook", passport.authenticate("facebook"));

app.get(
  "/auth/facebook/secrets",
  passport.authenticate("facebook", { failureRedirect: "/login" }),
  function (req, res) {
    // Successful authentication, redirect secrets.
    res.redirect("/secrets");
  }
);

//// ***************** //
// SECRET //
// ***************** ///
// GET //
app.get("/secrets", function (req, res) {
  User.find({ secret: { $ne: null } }, function (err, foundUser) {
    if (err) {
      console.log(err);
    } else {
      if (foundUser) {
        res.render("secrets", { userWithSecret: foundUser });
      }
    }
  });
});
// REGISTER //
// ***************** //
// GET //
app.get("/register", function (req, res) {
  res.render("register");
});

// POST //
app.post("/register", function (req, res) {
  User.register(
    { username: req.body.username },
    req.body.password,
    function (err, user) {
      if (err) {
        console.log(err);
        res.redirect("/register");
      } else {
        passport.authenticate("local")(req, res, function () {
          res.redirect("/secrets");
        });
      }
    }
  );
});

//// ***************** //
// LOGIN //
// ***************** ///
// GET //
app.get("/login", function (req, res) {
  res.render("login");
});
// GET //
app.post("/login", function (req, res) {
  const userLogin = new User({
    username: req.body.username,
    password: req.body.password,
  });
  // check if username and password is macthed
  req.login(userLogin, function (err) {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function () {
        res.redirect("/secrets");
      });
    }
  });
});
//// ***************** //
// LOGOUT //
// ***************** ///
// GET //
app.get("/logout", function (req, res) {
  req.logout(function (err) {
    if (err) {
      console.log(err);
    } else {
      res.redirect("/");
    }
  });
});
//// ***************** //
// SUBMIT //
// ***************** ///
// GET //
app.get("/submit", function (req, res) {
  if (req.isAuthenticated()) {
    res.render("submit");
  }
});

// POST //
app.post("/submit", function (req, res) {
  const submittedSercet = req.body.secret;
  User.findById(req.user.id, function (err, foundUser) {
    if (err) {
      console.log(err);
    } else {
      if (foundUser) {
        if ((foundUser.secret = submittedSercet));
        foundUser.save(function () {
          res.redirect("/secrets");
        });
      }
    }
  });
});
// CONNECTION SECTION //
let port = process.env.PORT;
if (port == "" || port == null) {
  port = 3000;
}
app.listen(port, function () {
  console.log("sever started on port " + port);
});
