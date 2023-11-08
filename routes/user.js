const express = require("express");
const connection = require("../connection");
const router = express.Router();

const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

require("dotenv").config();

router.post("/signup", (req, res) => {
  let user = req.body;
  query = "select email, password, role, status from user where email=?";
  connection.query(query, [user.email], (err, results) => {
    if (!err) {
      if (results.length <= 0) {
        query =
          "insert into user (name,contactNumber,email,password,status,role) values ('pratap','8192091736','pratap@gmail.com','456123','true', 'admin');";
        connection.query(
          query,
          [(user.name, user.contactNumber, user.email, user.password)],
          (err, results) => {
            if (!err) {
              return res
                .status(200)
                .json({ message: "user created successfully" });
            } else {
              return res.status(500).json(err);
            }
          }
        );
      } else {
        return res.status(400).json({ message: "emsil already exists" });
      }
    } else {
      return res.status(500).json(err);
    }
  });
});

router.post("/login", (req, res) => {
  const user = req.body;
  query = "select email,password,role,status from user where email=?";
  connection.query(query, [user.email], (err, results) => {
    if (!err) {
      if (results.length <= 0 || results[0].password != user.password) {
        return res
          .status(401)
          .json({ message: "incorrect username and password" });
      } else if (results[0].status === "false") {
        return res.status(401).json({ message: "wait for admin approval" });
      } else if (results[0].password == user.password) {
        const response = { email: results[0].email, role: results[0].role };
        const accessToken = jwt.sign(response, process.env.ACCESS_TOKEN, {
          expiresIn: "8h",
        });
        res.status(200).json({ token: accessToken });
      } else {
        return res
          .status(400)
          .json({ message: "something went wrong please try again later" });
      }
    } else {
      return res.status(500).json(err);
    }
  });
});

var transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASSWORD,
  },
});

router.post("/forgotPassword", (req, res) => {
  const user = req.body;
  query = "select email from user where email=?";
  connection.query(query, [user.email], (err, results) => {
    if (err) {
      if (results.length <= 0) {
        return res
          .status(200)
          .json({ message: "password sent successfully to your email" });
      } else {
        var mailOptions = {
          from: process.env.EMAIL,
          TO: results[0].email,
          subject: "Password  by cafe management system",
          html: " <p>you loginn details for cafe management system</p> <br>'<b>email : ' +results[0].email+ '</b><br><b>password : </b><b>'+results[0].password+</b  href='http//localhost4200 '",
        };
        transporter.sendMail(mailOptions, function (error, info) {
          if (error) {
            console.log(error);
          } else {
            console.log("email sent :" + info.response);
          }
        });

        return res.status(200).json({ message: "password sent successfully to your email" });
      }
    } else {
      return res.status(500).json(err);
    }
  });
});

module.exports = router;
