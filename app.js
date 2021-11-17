const express = require("express");
const bodyParser = require('body-parser')
const { Client } = require('pg')
const app = express();

//ejs Setup
app.set("view engine", "ejs");

//PG Setup
const {clientConfig} = require('./config.js');

const client = new Client(clientConfig)

//use stylesheet
app.use(express.static(__dirname + "/public"))

//Enable bodyParser
app.use(bodyParser.urlencoded({extended: true}));

//connect to postgres
client.connect();

//Enable and Configure Passport
// var passport = require('passport')
//   , LocalStrategy = require('passport-local').Strategy;
//
// passport.use(new LocalStrategy(
//   function(username, password, done) {
//     User.findOne({ username: username }, function(err, user) {
//       if (err) { return done(err); }
//       if (!user) {
//         return done(null, false, { message: 'Incorrect username.' });
//       }
//       if (!user.validPassword(password)) {
//         return done(null, false, { message: 'Incorrect password.' });
//       }
//       return done(null, user);
//     });
//   }
// ));

//Get and Post Routes
app.get("/", (req, res)=>{
  res.render("index");
})

app.get("/checkout", (req, res)=>{
  res.render("checkout");
})

app.post("/checkout", (req, res)=>{
  const text = "SELECT * FROM users WHERE user_fname ILIKE $1 OR user_lname ILIKE $1"
  const values = ["%" + req.body.search_name + "%"]
  client.query(text, values, (err, result) => {
    if (err) {
      console.log(err.stack)
    } else {
      items = (result.rows);
      res.render("search", {items:items})
    }
  })
})

app.get("/return", (req, res)=>{
  res.render("return");
})

app.post("/return", (req, res) => {
  const text = "SELECT * FROM items WHERE barcode = $1"
  const values = [req.body.barcode]
  client.query(text, values, (err, result) => {
    if (err) {
      console.log(err.stack)
    } else {
      item = (result.rows[0]);
      res.render("item", {item:item})
    }
  })
})

app.get("/add_item", (req, res) => {
  client.query("SELECT DISTINCT item_location_event FROM items ORDER BY item_location_event ASC;", (err, result) => {
    if (err) {
      console.log(err.stack)
    } else {
      var events = (result.rows);
      client.query("SELECT * FROM subjects ORDER BY subject;", (err, result) => {
        if(err){
          console.log(err.stack)
        } else {
          var subjects = (result.rows)
          client.query("SELECT * FROM media_type;", (err, result) => {
            if(err){
              console.log(err.stack)
            } else {
              var mediaTypes = (result.rows)
              res.render("add_item", {events:events, subjects:subjects, mediaTypes:mediaTypes})
            }
          })
        }
      })
    }
  })
})


app.post("/add_item", (req, res) => {
  var title = req.body.title
  var fname = req.body.fname
  var lname = req.body.lname
  var suffix = req.body.suffix
  var eventLocation = req.body.event
  var barcode = req.body.barcode
  var mediaType = req.body.mediaType
  var date = req.body.date
  var subject = req.body.subject
  const text = "INSERT INTO items (item_title, item_speaker_fname, item_speaker_lname, item_speaker_suffix, item_location_event, item_barcode, item_media_type, item_date, item_subject) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);"
  const values = [title, fname, lname, suffix, eventLocation, barcode, mediaType, date, subject]
  client.query(text, values, (err, result) => {
    if (err) {
      console.log(err.stack)
    } else {
      item = (result.rows[0]);
      res.send("<h1>success</h1>")
    }
  })
})

app.get("/add_user", (req, res) => {
  const text = "SELECT * FROM states;"
  client.query(text, (err, result) => {
    if (err) {
      console.log(err.stack)
    } else {
      states = (result.rows);
      res.render("add_user", {states:states});
    }
  })

})

app.post("/add_user", (req,res) => {
  var fname = req.body.fname
  var lname = req.body.lname
  var street = req.body.street
  var city = req.body.city
  var state = req.body.state
  var zip = req.body.zip
  var email = req.body.email
  var mailbox = req.body.mailbox
  const text = "INSERT INTO users(user_fname, user_lname, user_student_id, user_street, user_city, user_state, user_zip, user_email, user_mailbox, access_level) VALUES($1, $2, (SELECT MAX(user_student_id) + 1 From users), $3, $4, $5, $6, $7, $8, 'user');"
  const values = [fname, lname, street, city, state, zip, email, mailbox]
  client.query(text, values, (err, result) => {
    if (err) {
      console.log(err.stack)
    } else {
      item = (result.rows[0]);
      res.send("<h1>success</h1>")
    }
  })
})

app.get("/login", (req,res) => {
  res.render("login");
})

app.post("/login", (req, res)=>{
  var username = req.body.username;
  var password = req.body.password;
  res.send(username + password);
})

app.get("/users/:user_student_id", (req,res)=>{
  const user_id = req.params.user_student_id;
  const values = [user_id];
  const text = "SELECT user_fname, user_lname, item_title, item_media_type, item_due_date FROM items JOIN users on item_checkedout_to = user_student_id WHERE item_checkedout_to = $1;";
  client.query(text, values, (err, result) => {
    if (err) {
      console.log(err.stack)
    } else {
      user = (result.rows);
      res.render("user", {user:user, values:values})
    }
  })
})

app.post("/users/:user_student_id", (req, res) => {
  const duedate = new Date(Date.now() + 12096e5);
  const today = new Date(Date.now());
  const user_id = req.params.user_student_id;
  const values = [parseInt(user_id), duedate, today, req.body.barcode];
  const text = "UPDATE items SET item_checkedout_to = $1, item_due_date = $2, item_checkout_date = $3, item_checkout_status = 'true' WHERE item_barcode = $4;"
  client.query(text, values, (err, result) => {
    if (err) {
      console.log(err.stack)
    } else {
      const values = [user_id];
      const text = "SELECT user_fname, user_lname, item_title, item_media_type, item_due_date FROM items JOIN users on item_checkedout_to = user_student_id WHERE item_checkedout_to = $1;";
      client.query(text, values, (err, result) => {
        if (err) {
          console.log(err.stack)
        } else {
          user = (result.rows);
          res.render("user", {user:user, values:values})
        }
      })
    }
  })
})


//Server Location
app.listen(3000, function(){
  console.log("Server Started on Port 3000")
});
