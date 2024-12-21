const express = require('express');
const connection = require('../connection');
const router = express.Router();
let ejs = require('ejs');
let pdf = require('html-pdf');
let path = require('path');
var fs = require('fs');
var uuid = require('uuid');
var auth = require('../services/authentication');

router.post('/generateReport', auth.authenticateToken, (req, res) => {
    try {
        const generatedUuid = uuid.v1();
        const orderDetails = req.body;
        
        // Handle product details - check if it's already an object or needs parsing
        let productdetailsReport;
        if (typeof orderDetails.productDetails === 'string') {
            try {
                productdetailsReport = JSON.parse(orderDetails.productDetails);
            } catch (error) {
                return res.status(400).json({ message: "Invalid product details format" });
            }
        } else {
            productdetailsReport = orderDetails.productDetails;
        }

        // Convert back to string for database storage
        const productDetailsString = JSON.stringify(productdetailsReport);

        const query = "insert into bill (name,uuid,email,contactNumber,paymentMethod,total,productDetails,createdBy) values (?,?,?,?,?,?,?,?)";
        connection.query(query, [
            orderDetails.name,
            generatedUuid,
            orderDetails.email,
            orderDetails.contactNumber,
            orderDetails.paymentMethod,
            orderDetails.totalAmount,
            productDetailsString,
            res.locals.email
        ], (err, results) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json(err);
            }

            return res.status(200).json({ uuid: generatedUuid });
        });
    } catch (error) {
        console.error('Unexpected error:', error);
        res.status(500).json({ message: "Internal server error" });
    }
});

router.post('/getPdf', auth.authenticateToken, function (req, res) {
    try {
        const orderDetails = req.body;
        
        // Validate request
        if (!orderDetails || !orderDetails.uuid) {
            return res.status(400).json({ message: "UUID is required" });
        }

        const pdfPath = path.join(__dirname, '../generated_pdf', `${orderDetails.uuid}.pdf`);
        
        // Ensure directory exists
        const pdfDir = path.join(__dirname, '../generated_pdf');
        if (!fs.existsSync(pdfDir)) {
            fs.mkdirSync(pdfDir, { recursive: true });
        }

        if (fs.existsSync(pdfPath)) {
            res.contentType('application/pdf');
            fs.createReadStream(pdfPath).pipe(res);
        } else {
            // Get bill details from database
            const query = "SELECT * FROM bill WHERE uuid = ?";
            connection.query(query, [orderDetails.uuid], (err, results) => {
                if (err) {
                    console.error('Database error:', err);
                    return res.status(500).json({ message: "Database error" });
                }

                if (results.length === 0) {
                    return res.status(404).json({ message: "Bill not found" });
                }

                const billData = results[0];
                let productDetails;

                try {
                    // Parse the product details from the database
                    productDetails = JSON.parse(billData.productDetails);
            
                    // Calculate total if not provided
                    const totalAmount = billData.total || productDetails.reduce((sum, product) => 
                        sum + (parseFloat(product.total) || 0), 0
                    );
                    console.log('Product Details:', productDetails);

                    // Ensure productDetails is an array
                    if (!Array.isArray(productDetails)) {
                        productDetails = [productDetails];
                    }

                    const templateData = {
                        productDetails: Array.isArray(productDetails) ? productDetails : [productDetails],
                        name: billData.name,
                        email: billData.email,
                        contactNumber: billData.contactNumber,
                        paymentMethod: billData.paymentMethod,
                        totalAmount: parseFloat(totalAmount).toFixed(2),
                        date: new Date().toLocaleString()
                    };

                    // Debug log
                    console.log('Template Data:', templateData);

                    ejs.renderFile(
                        path.join(__dirname, 'report.ejs'),
                        templateData,
                        (err, html) => {
                            if (err) {
                                console.error('Template error:', err);
                                return res.status(500).json({ message: "Error generating PDF" });
                            }

                            const options = {
                                format: 'A4',
                                border: {
                                    top: "20px",
                                    right: "20px",
                                    bottom: "20px",
                                    left: "20px"
                                }
                            };

                            pdf.create(html, options).toFile(pdfPath, function (err) {
                                if (err) {
                                    console.error('PDF creation error:', err);
                                    return res.status(500).json({ message: "Error creating PDF" });
                                }
                                res.contentType('application/pdf');
                                fs.createReadStream(pdfPath).pipe(res);
                            });
                        }
                    );
                } catch (error) {
                    console.error('Error parsing product details:', error);
                    return res.status(500).json({ message: "Error parsing bill data" });
                }
            });
        }
    } catch (error) {
        console.error('Unexpected error:', error);
        res.status(500).json({ message: "Internal server error" });
    }
});
router.get('/getBills', auth.authenticateToken, (req, res) => {
    var query = "select * from bill order by id DESC";
    connection.query(query, (err, results) => {
        if (!err) {
            return res.status(200).json(results);
        }
        else {
            return res.status(500).json(err);
        }
    })
})


router.delete('/delete/:id', auth.authenticateToken, (req, res) => {
    const id = req.params.id;
    var query = "delete from bill where id =?";
    connection.query(query, [id], (err, results) => {
        if (!err) {
            if (results.affectedRows == 0) {
                return res.status(404).json({
                    message: "Bill not found"
                })
            }
            return res.status(200).json({ message: "Bill deleted successfully" })
        }
        else {
            return res.status(500).json(err);
        }
    })
})
module.exports = router;