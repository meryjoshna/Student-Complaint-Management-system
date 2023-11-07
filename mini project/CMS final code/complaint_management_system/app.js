const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const exphbs = require('express-handlebars');
const expressValidator = require('express-validator');
const flash = require('connect-flash');
const session = require('express-session');
const passport = require('passport');
const mongoose = require('mongoose');
const { MongoClient } = require('mongodb');
const crypto = require('crypto');
const bcrypt = require('bcrypt');


//username limitation
const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
// app.get('/register', (req, res) => {
//   res.render('register');
// });
// app.post('/register', (req, res) => {
//   const  username = req.body.username;
//   const isValid = /^s\d{6}$/.test(username); // Regex for 's' followed by 6 digits

//   if (isValid) {
    // Proceed with registration logic
    // ...

    // Render success page or redirect
//     res.render('login');
//   } else {
//     res.render('register', { error: 'Invalid username,please give correct name' });
//   }
// });



//email limitation


  

//forgot password




const nodemailer = require('nodemailer');
const randomstring = require('randomstring');



// Set up Handlebars as the view engine
app.engine('handlebars', exphbs());
app.set('view engine', 'handlebars');

// Middleware to parse request bodies
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.post('/forgot-password', async (req, res) => {
  const { email } = req.body;


  
  const token = randomstring.generate(10);
 

  try {
    // Send the password reset email
   
    await sendPasswordResetEmail(req,email, token);
    console.log('Password reset email sent successfully');
    res.render('success', { message: 'Password reset instructions sent to your email.' });
  } catch (error) {
    console.log('Error sending password reset email:', error);
    res.send({ message: 'Error sending password reset email.' });
  }
});

// Function to send the password reset email
async function sendPasswordResetEmail(req,email, token) {
  
  try {
    // Create a Nodemailer transporter with your email service credentials
    const transporter = nodemailer.createTransport({
      service: 'gmail', // e.g., Gmail, Yahoo, etc.
      auth: {
        user:'vijayas180150@gmail.com',
        pass:'ogxg mzgr fqwf wvtl', // Replace with your email account password
      },
    });

    // Define the email content
    const mailOptions = {
      from:'vijayas180150@gmail.com',
      to: email,
      subject: 'Password Reset',
      text: `Click the following link to reset your password: http://localhost:3000/reset-password/${token}`,
    };

    // Send the email
    resetTokens.set(token, email);
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.response);
  } catch (error) {
    throw error;
  }
}


//reset password

app.get('/reset-password/:token', (req, res) => {
  const token = req.params.token;

  // Check if the token is valid
  if (resetTokens.has(token)) {
    const email = resetTokens.get(token);

    // Render the reset-password.handlebars template with the token value
    res.render('reset-password', { token, email });
  } else {
    res.render('invalid-token'); // Render a template for handling invalid or expired tokens
  }
});

const url = 'mongodb://localhost/complaintapp';
const dbName = 'complaintapp';

// Example using a Map to store reset tokens
const resetTokens = new Map();


// POST route for resetting the password
app.post('/reset-password', (req, res) => {
  const { token, newPassword } = req.body;

  // Check if the token is valid
  if (resetTokens.has(token)) {
    const email = resetTokens.get(token);

    // Connect to MongoDB
    MongoClient.connect(url, function (err, client) {
      if (err) {
        console.error('Error connecting to MongoDB:', err);
        res.status(500).send('Internal Server Error');
        return;
      }

      console.log('Connected to MongoDB successfully');

      // Get the database and collection
      const db = client.db(dbName);
      const collection = db.collection('users');

      // Hash the new password
      bcrypt.hash(newPassword, 10, function (err, hashedPassword) {
        if (err) {
          console.error('Error hashing password:', err);
          client.close();
          res.status(500).send('Internal Server Error');
          return;
        }

        // Update the user's password with the hashed password
        collection.updateOne(
          { email: email },
          { $set: { password: hashedPassword } }, // Assuming the field name is 'password'
          function (err, result) {
            if (err) {
              console.error('Error updating document:', err);
              client.close();
              res.status(500).send('Internal Server Error');
              return;
            }

            console.log('Password reset successfully');
            client.close();

            // Remove the token from the resetTokens Map
            resetTokens.delete(token);

            // Render the reset success view with the new password
            res.render('reset-success', { newPassword });
          }
        );
      });
    });
  } else {
    res.status(400).json({ message: 'Invalid or expired token' });
  }
});

// Generate a unique token for password reset
function generateToken() {
  const token = crypto.randomBytes(20).toString('hex');
  return token;
}



//register detailes storing
// Assuming you have the required dependencies and configurations

// POST route for user registration


//webteam profiles


app.use('/images', express.static(path.join(__dirname, 'routes', 'images')));


app.get('/webteam', (req, res) => {
  // Prepare data for rendering the template
  const imageList = [{ src: '/images/vijju1.jpeg' }];

  const imageList1 = [{ src: '/images/joshna.jpeg' }];
  const imageList2 = [{ src: '/images/aswini.jpeg' }];

  // Render the template and pass the data
  res.render('webteam', { imageList, imageList1, imageList2 });
});










const port = process.env.PORT || 3000;

const index = require('./routes/index');

// View Engine
app.engine('handlebars', exphbs({defaultLayout:'main'}));
app.set('view engine', 'handlebars');

// Static Folder
app.use(express.static(path.join(__dirname, 'public')));



// Body Parser Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// Express Session
app.use(session({
    secret: 'secret',
    saveUninitialized: true,
    resave: true,
    maxAge: null,
    cookie : { httpOnly: true, maxAge: 2419200000 } // configure when sessions expires
}));


// Init passport
app.use(passport.initialize());
app.use(passport.session());

// Express messages
app.use(flash());
app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  res.locals.user = req.user || null;
  next();
});

// Express Validator
// app.use(expressValidator({
//   errorFormatter: (param, msg, value) => {
//       let namespace = param.split('.')
//       , root    = namespace.shift()
//       , formParam = root;

//     while(namespace.length) {
//       formParam += '[' + namespace.shift() + ']';
//     }
//     return {
//       param : formParam,
//       msg   : msg,
//       value : value
//     };
//   }
// }));

app.use('/', index);


// Start Server
app.listen(port, () => {
  console.log('Server started on port '+port);
});
