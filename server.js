const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const app = express();

// Middleware to parse form data
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files (CSS)
app.use(express.static('public'));

// MySQL connection setup
const db = mysql.createConnection({
    host: 'localhost',       // Your MySQL host (usually 'localhost')
    user: 'root',            // Your MySQL username
    password: '',            // Your MySQL password (empty if no password)
    database: 'login_system' // The database you created
});

// Connect to MySQL database
db.connect((err) => {
    if (err) {
        console.log('Error connecting to database:', err);
        return;
    }
    console.log('Connected to MySQL database');
});

// Simple login route
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    // Query to check if the username and password match
    const query = 'SELECT * FROM users WHERE username = ? AND password = ?';
    db.query(query, [username, password], (err, result) => {
        if (err) {
            console.log('Error executing query:', err);
            res.send('<script>alert("Something went wrong!"); window.location.href="/";</script>');
            return;
        }

        if (result.length > 0) {
            // If user is found and password matches
            res.send('<script>alert("Login successful!"); window.location.href="/";</script>');
        } else {
            // If username or password is incorrect
            res.send('<script>alert("Invalid username or password!"); window.location.href="/";</script>');
        }
    });
});

// Start the server
app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});

