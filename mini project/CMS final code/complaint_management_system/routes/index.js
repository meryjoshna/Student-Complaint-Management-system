const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const MongoClient = require('mongodb').MongoClient;


const app = express();

// Add session middleware
app.use(session({
  secret: 'vijju',
  resave: true,
  saveUninitialized: true
}));

// Add flash messages middleware
app.use(flash());





const router = express.Router();
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;

const User = require('../models/user');
let Complaint = require('../models/complaint');
let ComplaintMapping = require('../models/complaint-mapping');

// Home Page - Dashboard
router.get('/', ensureAuthenticated, (req, res, next) => {
    res.render('index');
});

// Login Form
router.get('/login', (req, res, next) => {
    res.render('login');
});

// Register Form
router.get('/register', (req, res, next) => {
    res.render('register');
});


// Logout
router.get('/logout', ensureAuthenticated,(req, res, next) => {
    req.logout();
    req.flash('success_msg', 'You are logged out');
    res.redirect('/login');
});

//forgot password
router.get('/forgot-password',(req,res,next)=>{
    res.render('forgot-password');
})
router.get('/success',(req,res,next)=>{
    res.render('success');
});
//reset password
router.get('/reset-password',(req,res,next)=>{
    res.render('reset-password');
})
//reset success
router.get('/reset-success',(req,res,next)=>{
    res.render('reset-success');
})
//invalide-token
router.get('/inavalid-token',(req,res,next)=>{
    res.render('invalid-token');
})
//webteam
router.get('/webteam',(req,res,next)=>{
    res.render('webteam');
});
// Admin
router.get('/admin', ensureAuthenticated, (req,res,next) => {
  Complaint.getAllComplaints((err, complaints) => {
      if (err) throw err;
  
      User.getMesscoordinator((err, messcoordinator) => {
          if (err) throw err;

          res.render('admin/admin', {
              complaints : complaints,
              messcoordinator : messcoordinator,
          });
      });
  });        
});




// assign the complaint to mess coordinator
const { check, validationResult } = require('express-validator');
router.post('/assign', [
  check('complaintID', 'Complaint ID field is required').notEmpty(),
  check('messcoordinatorName', 'Messcoordinator name field is required').notEmpty()
], (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    res.render('admin/admin', { errors: errors.array() });
  } else {
    const { complaintID, messcoordinatorName } = req.body;

    const newComplaintMapping = new ComplaintMapping({
      complaintID: complaintID,
      messcoordinatorName: messcoordinatorName
    });

    newComplaintMapping.save((err, complaint) => {
      if (err) throw err;

      // Retrieve all assigned complaints after the assignment
      ComplaintMapping.find({}, (err, complaints) => {
        if (err) throw err;
        req.flash('success_msg', 'You are successfully assign the complaint');
       
        // Pass the assigned complaints to the 'junior' view for rendering
        res.render('junior/junior', { complaints: complaints });
      });
    });
  }
});




// Junior Eng
router.get('/jeng', ensureAuthenticated, (req,res,next) => {
    res.render('junior/junior');
});

//Complaint
router.get('/complaint', ensureAuthenticated, (req, res, next) => {
    //console.log(req.session.passport.username);
    //console.log(user.name);
    res.render('complaint', {
        username: req.session.user,
    });
});

//Register a Complaint



router.post('/registerComplaint', [
  check('contact').notEmpty().withMessage('Contact field is required'),
  check('desc').notEmpty().withMessage('Description field is required')
], (req, res) => {
  const { name, email, contact, desc } = req.body;

  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.render('complaint', { errors: errors.array() });
  }

  const newComplaint = new Complaint({
    name: name,
    email: email,
    contact: contact,
    desc: desc
  });

  newComplaint.save((err) => {
    if (err) {
      console.error('Error saving complaint:', err);
      req.flash('error_msg', 'Failed to register complaint');
      res.redirect('/complaint');
    } else {
      req.flash('success_msg', 'You have successfully launched a complaint');
      res.redirect('/');
    }
  });
});







// Process Register

const { body } = require('express-validator');

const bcrypt = require('bcrypt');



// Registration endpoint
router.post('/register', [
  body('name').notEmpty().withMessage('Name field is required'),
  body('email').notEmpty().withMessage('Email field is required').isEmail().withMessage('Email must be a valid email address'),
  body('username').notEmpty().withMessage('Username field is required'),
  body('password').notEmpty().withMessage('Password field is required'),
  body('password2').notEmpty().withMessage('Confirm Password field is required')
    .custom((value, { req }) => value === req.body.password).withMessage('Passwords must match'),
  body('role').notEmpty().withMessage('Role field is required'),
  check('username')
    .custom((value, { req }) => {
      // Check if the role is "user"
      if (req.body.role === 'user') {
        // Apply the username pattern validation for the "user" role
        if (!/^s[12][012389]\d{4}$/.test(value)) {
          throw new Error('Username should start with \'s\' followed by a specific pattern of digits');
        }
      }
      return true;
    }),
  check('email')
    .custom((value, { req }) => {
      const username = req.body.username;
      const domain = 'rguktsklm.ac.in';
      const isStudent = req.body.role === 'user';
      const expectedEmail = isStudent ? `${username}@${domain}` : value;

      if (value !== expectedEmail) {
        throw new Error(`Email should start with '${username}' followed by '${domain}'`);
      }

      return true;
    }),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // If there are validation errors, render the registration form again with error messages
    return res.render('register', { errors: errors.array() });
  }

  const { name, email, username, password, password2, role } = req.body;

  // Connect to MongoDB
  const url = 'mongodb://localhost/complaintapp';
  const dbName = 'complaintapp';

  MongoClient.connect(url, function (err, client) {
    if (err) {
      console.error('Error connecting to MongoDB:', err);
      req.flash('error_msg', 'Failed to register user');
      return res.redirect('/register');
    }

    console.log('Connected to MongoDB successfully');

    const db = client.db(dbName);
    const collection = db.collection('users');
    collection.findOne({ role: 'admin' }, (err, adminUser) => {
      if (err) {
        console.error('Error checking existing admin user:', err);
        client.close();
        req.flash('error_msg', 'Failed to register user');
        return res.redirect('/register');
      }

      if (adminUser && role === 'admin') {
        // Admin user already exists, prevent registration as admin
        req.flash('error_msg', 'Registration as admin is not allowed ');
        client.close();
        return res.redirect('/register');
      }
      collection.findOne({ role: 'messcoordinator' }, (err, messcoordinatorUser) => {
        if (err) {
          console.error('Error checking existing admin user:', err);
          client.close();
          req.flash('error_msg', 'Failed to register user');
          return res.redirect('/register');
        }
  
        if (messcoordinatorUser && role === 'messcoordinator') {
          // Admin user already exists, prevent registration as admin
          req.flash('error_msg', 'Registration as Messcoordinator is not allowed ');
          client.close();
          return res.redirect('/register');
        }
    
    // Check if the username or email already exists
    collection.findOne({ $or: [{ username: username }, { email: email },] }, (err, user) => {
      if (err) {
        console.error('Error checking existing user:', err);
        client.close();
        req.flash('error_msg', 'Failed to register user');
        return res.redirect('/register');
      }

      if (user) {
        // Username or email already exists
        req.flash('error_msg', 'User already exists');
        client.close();
        return res.redirect('/register');
      }
      

      // Generate a salt and hash the password
      bcrypt.genSalt(10, (err, salt) => {
        if (err) {
          console.error('Error generating salt:', err);
          client.close();
          req.flash('error_msg', 'Failed to register user');
          return res.redirect('/register');
        }

        bcrypt.hash(password, salt, (err, hash) => {
          if (err) {
            console.error('Error hashing password:', err);
            client.close();
            req.flash('error_msg', 'Failed to register user');
            return res.redirect('/register');
          }

          // Create a new user object with hashed password
          const newUser = {
            name: name,
            email: email,
            username: username,
            password: hash,
            role: role,
          };

          // Insert the new user into the database
          collection.insertOne(newUser, (err, result) => {
            if (err) {
              console.error('Error inserting document:', err);
              client.close();
              req.flash('error_msg', 'Failed to register user');
              return res.redirect('/register');
            }

            console.log('User registration details stored successfully');
            client.close();
            req.flash('success_msg', 'You are successfully registered and can log in');
            res.redirect('/login');
          });
        });
      });
    });
  });
});
});
});


// Local Strategy
const url = 'mongodb://localhost/complaintapp';
const dbName = 'complaintapp';
passport.use(new LocalStrategy((username, password, done) => {
    MongoClient.connect(url, function (err, client) {
      if (err) {
        console.error('Error connecting to MongoDB:', err);
        return done(err);
      }
  
      console.log('Connected to MongoDB successfully');
  
      const db = client.db(dbName);
      const collection = db.collection('users');
  
      collection.findOne({ username: username }, (err, user) => {
        if (err) {
          console.error('Error finding user:', err);
          client.close();
          return done(err);
        }
  
        if (!user) {
          return done(null, false, { message: 'No user found' });
        }
  
        bcrypt.compare(password, user.password, (err, isMatch) => {
          if (err) {
            console.error('Error comparing passwords:', err);
            client.close();
            return done(err);
          }
  
          if (isMatch) {
            client.close();
            return done(null, user);
          } else {
            client.close();
            return done(null, false, { message: 'Wrong password' });
          }
        });
      });
    });
  }));
  

passport.serializeUser((user, done) => {
    var sessionUser = {
        _id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
    }
    done(null, sessionUser);
});

passport.deserializeUser((id, done) => {
    User.getUserById(id, (err, sessionUser) => {
        done(err, sessionUser);
    });
});

// Login Processing
router.post('/login', passport.authenticate('local', 
    { 
        failureRedirect: '/login', 
        failureFlash: true 
    
    }), (req, res, next) => {
    
        req.session.save((err) => {
        if (err) {
            return next(err);
        }
        if(req.user.role==='admin'){
            res.redirect('/admin');
        }
        else if(req.user.role==='messcoordinator'){
            res.redirect('/jeng');
        }
    
    //     else if(req.user.role==='dsw'){
    //       res.redirect('/admin');
    //   }
    //   else if(req.user.role==='doc'){
    //     res.redirect('/admin');
    // }
        else{
            res.redirect('/');
        }
    });
});

// Access Control
function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    } else {
        req.flash('error_msg', 'You are not Authorized to view this page');
        res.redirect('/login');
    }
}




module.exports = router;




     
  