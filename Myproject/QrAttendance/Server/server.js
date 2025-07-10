const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// MySQL Database Connection (Port 3306)
const db = mysql.createConnection({
  host: 'localhost',
 //host: '127.0.0.1', 
 user: 'root',
  password: 'test123',
  database: 'attendance_system',
  port: 3306 // MySQL default port
});

db.connect(err => {
  if (err) {
    console.error('Database connection error:', err);
    process.exit(1);
  }
  console.log('Connected to MySQL database on port 3306');
});

// Create tables if they don't exist
const createTables = () => {
  const studentsTable = `
    CREATE TABLE IF NOT EXISTS students (
      id VARCHAR(20) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100) NOT NULL,
      course VARCHAR(100) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`;
  
  const attendanceTable = `
    CREATE TABLE IF NOT EXISTS attendance (
      id INT AUTO_INCREMENT PRIMARY KEY,
      student_id VARCHAR(20) NOT NULL,
      student_name VARCHAR(100) NOT NULL,
      date DATE NOT NULL,
      time TIME NOT NULL,
      status VARCHAR(20) DEFAULT 'Present',
      FOREIGN KEY (student_id) REFERENCES students(id)
    )`;
  
  db.query(studentsTable, (err) => {
    if (err) console.error('Error creating students table:', err);
  });
  
  db.query(attendanceTable, (err) => {
    if (err) console.error('Error creating attendance table:', err);
  });
};

createTables();

// API Endpoints

// Register a new student
app.post('/api/students', (req, res) => {
  const { id, name, email, course } = req.body;
  const sql = 'INSERT INTO students (id, name, email, course) VALUES (?, ?, ?, ?)';
  
  db.query(sql, [id, name, email, course], (err, result) => {
    if (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ error: 'Student ID already exists' });
      }
      return res.status(500).json({ error: err.message });
    }
    res.json({ 
      message: 'Student registered successfully', 
      qrData: `STUDENT:${id}:${name}` 
    });
  });
});

// Record attendance
app.post('/api/attendance', (req, res) => {
  const { studentId, studentName } = req.body;
  const now = new Date();
  const date = now.toISOString().split('T')[0];
  const time = now.toTimeString().split(' ')[0];
  
  const sql = 'INSERT INTO attendance (student_id, student_name, date, time) VALUES (?, ?, ?, ?)';
  
  db.query(sql, [studentId, studentName, date, time], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ 
      message: 'Attendance recorded',
      record: { studentId, studentName, date, time, status: 'Present' }
    });
  });
});


// Update the attendance history endpoint in server.js
app.get('/api/attendance', (req, res) => {
    const { studentId } = req.query;
    let sql = `
      SELECT 
        a.id, 
        s.id AS student_id, 
        s.name AS student_name, 
        a.date, 
        a.time, 
        a.status
      FROM attendance a
      JOIN students s ON a.student_id = s.id
    `;


    
    
    let params = [];
    
    if (studentId) {
      sql += ' WHERE s.id LIKE ?';
      params.push(`%${studentId}%`);
    }
    
    sql += ' ORDER BY a.date DESC, a.time DESC';
    
    db.query(sql, params, (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results);
    });
  });

// Start Express server on port 3001
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Node.js server running on port ${PORT}`);
});