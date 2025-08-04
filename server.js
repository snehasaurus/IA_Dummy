
const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const bcrypt = require('bcrypt');
const session = require('express-session');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const path = require('path');
const { jsPDF } = require('jspdf');
const { createCanvas } = require('canvas');


const app = express();
const saltRounds = 10;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true
}));
app.use((req, res, next) => {
    console.log('Session data:', req.session);
    next();
});

// MySQL Connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'dog#1008',
    database: 'LoginDB'
});

db.connect((err) => {
    if (err) {
        console.error('Database connection failed:', err);
        return;
    }
    console.log('Connected to MySQL database');
});

// Nodemailer
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'blissfulbarfi@gmail.com',
        pass: 'txsl fpmv qtjy ziym'
    }
});

// Login + Role Redirection
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    const query = 'SELECT * FROM users WHERE username = ?';
    db.query(query, [username], async (err, results) => {
        if (err) return res.send('Database error.');
        if (results.length === 0) return res.send('Error: User not found.');

        const user = results[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.send('Error: Incorrect password.');

        req.session.user = {
            id: user.id,
            username: user.username,
            role: user.role
        };

        if (user.role === 'admin') return res.redirect('/admin');
        else if (user.role === 'employee') return res.redirect('/employee-dashboard');
        else if (user.role === 'manager') return res.redirect('/manager-dashboard');
        else return res.send('Login successful. But no dashboard defined for your role.');
    });
});

// Admin Routes
app.get('/admin', (req, res) => {
    if (req.session.user && req.session.user.role === 'admin') {
        res.sendFile(path.join(__dirname, 'public', 'admin.html'));
    } else {
        res.send('Access denied. Admins only.');
    }
});

app.get('/admin-dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin-dashboard.html'));
});

// ✅ Admin dashboard data route
app.get('/admin-dashboard-data', (req, res) => {
    if (req.session.user && req.session.user.role === 'admin') {
        const departmentsQuery = `
            SELECT department_id, department_name, department_head, requested_budget, admin_comments, budget_status 
            FROM departments
        `;
        const expendituresQuery = `
            SELECT department_id, SUM(expenditure_amount) AS actual_spent 
            FROM expenditures 
            GROUP BY department_id
        `;

        db.query(departmentsQuery, (err, departmentsResults) => {
            if (err) return res.status(500).send('Error fetching departments data.');

            db.query(expendituresQuery, (err, expendituresResults) => {
                if (err) return res.status(500).send('Error fetching expenditures data.');

                res.json({
                    departments: departmentsResults,
                    expenditures: expendituresResults
                });
            });
        });
    } else {
        res.send('Access denied. Admins only.');
    }
});

// === Update Comment === //
app.post('/update-comment', (req, res) => {
    const { department_id, comment } = req.body;
    const query = 'UPDATE departments SET admin_comments = ? WHERE department_id = ?';
    db.query(query, [comment, department_id], (err) => {
        if (err) return res.status(500).send('Error updating comment.');
        res.sendStatus(200);
    });
});

// === Update Status === //
app.post('/update-status', (req, res) => {
    const { department_id, status } = req.body;
    const query = 'UPDATE departments SET budget_status = ? WHERE department_id = ?';
    db.query(query, [status, department_id], (err) => {
        if (err) return res.status(500).send('Error updating status.');
        res.sendStatus(200);
    });
});
// //testing testing delete after 

// app.get('/test-mail', (req, res) => {
//     transporter.sendMail({
//         from: 'blissfulbarfi@gmail.com',
//         to: 'sneha.u.gautam@gmail.com',
//         subject: 'Test Email',
//         text: 'If you got this, email is working.',
//     }, (error, info) => {
//         if (error) {
//             console.error('Mail error:', error);
//             return res.send('Failed to send test email');
//         }
//         res.send('Test email sent successfully');
//     });
// });

// User Management Routes
app.get('/user-management', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'user-management.html'));
});

app.get('/get-users', (req, res) => {
    if (req.session.user && req.session.user.role === 'admin') {
        const query = 'SELECT id, name, department, role FROM users';
        db.query(query, (err, results) => {
            if (err) return res.status(500).send('Error fetching users.');
            res.json(results);
        });
    } else {
        res.status(403).send('Access denied.');
    }
});

app.post('/delete-user', (req, res) => {
    const { id } = req.body;
    const query = 'DELETE FROM users WHERE id = ?';
    db.query(query, [id], (err) => {
        if (err) return res.status(500).send('Error deleting user.');
        res.sendStatus(200);
    });
});

app.post('/edit-user', (req, res) => {
    const { id, name, department, role } = req.body;
    const query = 'UPDATE users SET name = ?, department = ?, role = ? WHERE id = ?';
    db.query(query, [name, department, role, id], (err) => {
        if (err) return res.status(500).send('Error updating user.');
        res.sendStatus(200);
    });
});

// Other Routes
app.get('/budget-requests', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'budget-requests.html'));
});

app.get('/budget-reports', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'budget-reports.html'));
});

app.get('/employee-dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'employee-dashboard.html'));
});

app.get('/manager-dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'manager-dashboard.html'));
});

// ✅ New 3-Step Password Reset (Email Verification Code)

// Step 1: Request verification code
app.post('/request-reset', (req, res) => {
    const { username } = req.body;
    db.query('SELECT email FROM users WHERE username = ?', [username], (err, results) => {
        if (err || results.length === 0) return res.send('User not found');

        const email = results[0].email;
        const code = Math.floor(10000 + Math.random() * 90000); // 5-digit code

        req.session.resetUsername = username;
        req.session.verificationCode = code;

        const mailOptions = {
            from: 'blissfulbarfi@gmail.com',
            to: email,
            subject: 'Your Password Reset Code',
            text: `Your password reset verification code is: ${code}`
        };

        transporter.sendMail(mailOptions, (error) => {
            if (error) return res.send('Error sending email');
            res.redirect('/verify-code.html');
        });
    });
});

// Step 2: Verify the code
app.post('/verify-code', (req, res) => {
    const { code } = req.body;
    if (parseInt(code) === req.session.verificationCode) {
        req.session.codeVerified = true;
        res.redirect('/reset-password.html');
    } else {
        res.send('Invalid verification code.');
    }
});

// Step 3: Reset password
app.post('/reset-password', async (req, res) => {
    const { newPassword, confirmPassword } = req.body;

    if (!req.session.codeVerified || !req.session.resetUsername) {
        return res.send('Session expired or invalid access.');
    }

    if (newPassword !== confirmPassword) {
        return res.send('Passwords do not match.');
    }

    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    db.query(
        'UPDATE users SET password = ? WHERE username = ?',
        [hashedPassword, req.session.resetUsername],
        (err) => {
            if (err) return res.send('Error updating password.');
            req.session.destroy();
            res.send('Password successfully updated.');
        }
    );
});

// API for Budget Reports
app.get('/api/budget-reports-data', (req, res) => {
    const query = `
        SELECT department_id, department_name, department_head, requested_budget, admin_comments, budget_status 
        FROM departments
    `;
    db.query(query, (err, results) => {
        if (err) return res.status(500).send('Database error fetching reports');
        res.json(results);
    });
});

// API for User Management
app.get('/api/users', (req, res) => {
    const sql = `
        SELECT u.id AS id, u.username, u.role, d.department_name
        FROM users u
        LEFT JOIN departments d ON u.department_id = d.department_id
    `;
    db.query(sql, (err, results) => {
        if (err) {
            console.error('SQL Error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(results);
    });
});

// Update user details
app.post('/api/users/update', (req, res) => {
    const { id, username, role, department_name } = req.body;
    const getDeptIdSql = 'SELECT department_id FROM departments WHERE department_name = ?';

    db.query(getDeptIdSql, [department_name], (err, deptResult) => {
        if (err || deptResult.length === 0) return res.status(500).json({ error: 'Invalid department name' });

        const department_id = deptResult[0].department_id;
        const updateSql = 'UPDATE users SET username = ?, role = ?, department_id = ? WHERE id = ?';

        db.query(updateSql, [username, role, department_id, id], (err2) => {
            if (err2) return res.status(500).json({ error: 'Failed to update user' });
            res.json({ success: true });
        });
    });
});

// Delete user
app.post('/api/users/delete', (req, res) => {
    const { id } = req.body;
    const deleteSql = 'DELETE FROM users WHERE id = ?';
    db.query(deleteSql, [id], (err) => {
        if (err) return res.status(500).json({ error: 'Failed to delete user' });
        res.json({ success: true });
    });
});




app.post('/email-budget-report', async (req, res) => {
  const { department_name, department_head, requested_budget, admin_comments, budget_status } = req.body;

  const username = req.session.user?.username;
  if (!username) {
    console.log('No user in session');
    return res.status(401).send('Not logged in.');
  }

  // Query for user's email
  db.query('SELECT email FROM users WHERE username = ?', [username], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).send('Database error.');
    }

    if (results.length === 0) {
      console.log('No user found');
      return res.status(404).send('User not found.');
    }

    const email = results[0].email;

    // Generate PDF
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Budget Report - ${department_name}`, 20, 20);
    doc.setFontSize(12);
    doc.text(`Department Head: ${department_head}`, 20, 40);
    doc.text(`Requested Budget: ₹${requested_budget}`, 20, 60);
    doc.text(`Budget Status: ${budget_status || '—'}`, 20, 80);
    doc.text(`Admin Comments: ${admin_comments || '—'}`, 20, 100);

    const pdfBuffer = doc.output('arraybuffer');

    // Send email
    transporter.sendMail({
      from: 'blissfulbarfi@gmail.com',
      to: email,
      subject: `Budget Report for ${department_name}`,
      text: 'Attached is your requested budget report.',
      attachments: [{
        filename: `${department_name}_report.pdf`,
        content: Buffer.from(pdfBuffer),
        contentType: 'application/pdf'
      }]
    }, (emailErr, info) => {
      if (emailErr) {
        console.error('Error sending email:', emailErr);
        return res.status(500).send('Error sending email.');
      }

      console.log('Email sent:', info.response);
      res.send('Email sent successfully!');
    });
  });
});

app.post('/register-admin', async (req, res) => {
  const { username, password, email } = req.body;
  const hashedPassword = await bcrypt.hash(password, saltRounds);
  const sql = 'INSERT INTO users (username, password, role, email) VALUES (?, ?, ?, ?)';
  
  db.query(sql, [username, hashedPassword, 'admin', email], (err) => {
    if (err) return res.status(500).send('Error registering admin.');
    res.send('Admin registered successfully');
  });
});



// Start Server
app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});

