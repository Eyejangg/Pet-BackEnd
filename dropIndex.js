const mongoose = require('mongoose');
require('dotenv').config();

const fixDb = async () => {
    try {
        console.log('Connecting to MongoDB...');
        // Use the URI from env or default to local
        const conn = await mongoose.connect("mongodb://localhost:27017/test"); // Based on error saying "test.users"

        console.log(`MongoDB Connected: ${conn.connection.host}`);

        const collection = conn.connection.collection('users');

        // Check indexes
        const indexes = await collection.indexes();
        console.log('Current Indexes:', indexes);

        const emailIndex = indexes.find(idx => idx.name === 'email_1');

        if (emailIndex) {
            console.log('Found obsolete email index. Dropping it...');
            await collection.dropIndex('email_1');
            console.log('SUCCESS: email_1 index dropped.');
        } else {
            console.log('No email_1 index found. You are good to go.');
        }

        process.exit();
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
};

fixDb();
