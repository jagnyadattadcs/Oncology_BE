import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";

dotenv.config();

const app = express();

const PORT = process.env.PORT || 5000;

app.use(cors());

app.get("/", (req, res)=>{
    res.send("OSOO Backend is Running!");
});

app.listen(PORT, ()=>{
    connectDB();
    console.log(`App is running on port : ${PORT}`);
});
