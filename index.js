import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";
import adminRoute from "./routes/adminRoute.js";
import carouselRoute from "./routes/carouselRoute.js"; 
import memberRoute from "./routes/memberRoute.js";
import eventRoute from './routes/eventRoute.js';
import galleryRoute from './routes/galleryRoute.js';
import contactRoute from './routes/contactRoute.js';
import councilMemberRoute from "./routes/councilMemberRoute.js";
import videoRoute from './routes/videoRoute.js';

dotenv.config();

const app = express();

const PORT = process.env.PORT || 5000;

app.use(cors({
    origin: ["http://localhost:5173","https://www.osoodisha.in"]
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/admin", adminRoute);
app.use("/api/carousel", carouselRoute); 
app.use("/api/member", memberRoute);
app.use("/api/councilmember", councilMemberRoute);
app.use("/api/events", eventRoute);
app.use("/api/gallery", galleryRoute);
app.use("/api/contact", contactRoute);
app.use("/api/videos", videoRoute);

app.get("/", (req, res)=>{
    res.send("OSOO Backend is Running!");
});

app.listen(PORT, ()=>{
    connectDB();
    console.log(`App is running on port : ${PORT}`);
});
