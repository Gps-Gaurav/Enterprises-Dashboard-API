process.removeAllListeners('warning');
const express = require('express');
var cors = require('cors');
const connection = require('./connection');
const userRoute = require('./routes/user');
const categoryRoute = require('./routes/category');
const productRoute = require('./routes/product');
const billRoute = require('./routes/bill');
const dashboardRoute = require('./routes/dashboard');
const app = express();

// Request timeout middleware
app.use((req, res, next) => {
    req.setTimeout(30000); // 30 second timeout
    res.setTimeout(30000);
    next();
});
app.use(cors());
app.use(express.urlencoded({ extended:true}));
app.use(express.json());
app.use('/user',userRoute);
app.use('/category',categoryRoute);
app.use('/product',productRoute);
app.use('/bill',billRoute);
app.use('/dashboard',dashboardRoute);

app.use((err, req, res, next) => {
    console.error('Error:', err);
    
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
        res.status(503).json({
            error: 'Database connection was lost. Please try again.'
        });
    } else if (err.code === 'ECONNREFUSED') {
        res.status(503).json({
            error: 'Database connection refused. Please try again later.'
        });
    } else {
        res.status(500).json({
            error: 'An internal server error occurred.'
        });
    }
});

module.exports = app;






