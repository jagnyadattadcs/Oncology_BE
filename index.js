import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";
import adminRoute from "./routes/adminRoute.js";
import carouselRoute from "./routes/carouselRoute.js"; 

dotenv.config();

const app = express();

const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/admin", adminRoute);
app.use("/api/carousel", carouselRoute); 
app.get("/", (req, res)=>{
    res.send("OSOO Backend is Running!");
});

app.listen(PORT, ()=>{
    connectDB();
    console.log(`App is running on port : ${PORT}`);
});
