require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const bodyParser = require('body-parser');
const cors = require('cors');
const AWS = require('aws-sdk');
const multer = require('multer');
const multerS3 = require('multer-s3');
const s3 = new AWS.S3();
const path = require('path');

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(cors());

// PostgreSQL connection to primary database
const primaryPool = new Pool({
    host: process.env.PRIMARY_DB_HOST || 'primary-db-endpoint',
    user: process.env.DB_USER || 'admin',
    port: process.env.DB_PORT || 5432,
    password: process.env.DB_PASSWORD || 'admin1234',
    database: process.env.DB_NAME || 'survey',
});

// PostgreSQL connection to read replica
const replicaPool = new Pool({
    host: process.env.REPLICA_DB_HOST || 'replica-db-endpoint',
    user: process.env.DB_USER || 'admin',
    port: process.env.DB_PORT || 5432,
    password: process.env.DB_PASSWORD || 'admin1234',
    database: process.env.DB_NAME || 'survey', // Connect to your target database
});

// Create the users table on startup
(async () => {
    try {
        await primaryPool.connect();
        console.log('Connected to primary database');

        const dbName = process.env.DB_NAME || 'survey';
        await primaryPool.query(`CREATE DATABASE ${dbName};`);
        console.log(`Database "${dbName}" created successfully.`);
    } catch (error) {
        if (error.code !== '42P04') {
            console.error('Error creating database:', error);
            process.exit(1);
        }
    } finally {
        await primaryPool.end();
    }

    // Create a new pool for the new database
    const newPool = new Pool({
        host: process.env.PRIMARY_DB_HOST || 'primary-db-endpoint',
        user: process.env.DB_USER || 'admin',
        port: process.env.DB_PORT || 5432,
        password: process.env.DB_PASSWORD || 'admin1234',
        database: process.env.DB_NAME || 'survey',,
    });

    // Create the users table
    const createTableQuery = `
    CREATE TABLE IF NOT EXISTS "users" (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        age INT NOT NULL,
        mobile VARCHAR(15) NOT NULL UNIQUE,
        nationality VARCHAR(50),
        language VARCHAR(50),
        pin VARCHAR(10),
        image_url VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`;

    try {
        await newPool.query(createTableQuery);
        console.log('Table "users" created or already exists');
    } catch (error) {
        console.error('Error creating table:', error);
        process.exit(1);
    } finally {
        await newPool.end();
    }
})();

// Configure AWS SDK
AWS.config.update({
    region: 'us-west-2', // Replace with your region
    credentials: new AWS.EC2MetadataCredentials({
        httpOptions: { timeout: 5000 },
        maxRetries: 10,
    }),
});

const s3 = new AWS.S3();

// Set up multer and multer-s3
const upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: 'YOUR_BUCKET_NAME', // Replace with your bucket name
        acl: 'public-read',
        key: (req, file, cb) => {
            cb(null, Date.now().toString() + path.extname(file.originalname));
        }
    })
});

// Route to handle form submissions
app.post('/submit', upload.single('image'), async (req, res) => {
    const { name, age, mobile, nationality, language, pin } = req.body;
    const imageUrl = req.file.location;

    // Basic validation
    if (!name || !age || !mobile || !nationality || !language || !pin) {
        return res.status(400).json({ message: 'All fields are required.' });
    }

    // SQL query to insert data into the user table
    const insertQuery = `
    INSERT INTO "users" (name, age, mobile, nationality, language, pin, image_url)
    VALUES ($1, $2, $3, $4, $5, $6, $7)`;

    try {
        await primaryPool.query(insertQuery, [name, age, mobile, nationality, language, pin, imageUrl]);
        res.status(201).json({ message: 'User created successfully.' });
    } catch (error) {
        console.error('Error inserting user:', error);
        res.status(500).json({ message: 'Error inserting user.' });
    }
});

// Route to handle user search
app.get('/search', async (req, res) => {
    const { name, mobile } = req.query;

    const searchQuery = `
    SELECT name, mobile, image_url FROM "users" 
    WHERE ($1 IS NULL OR name ILIKE $1) AND ($2 IS NULL OR mobile = $2)
    `;
    
    try {
        const result = await replicaPool.query(searchQuery, [name ? `%${name}%` : null, mobile]);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error searching users:', error);
        res.status(500).json({ message: 'Error searching users.' });
    }
});

// Start the server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
