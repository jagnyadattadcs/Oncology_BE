import mongoose from "mongoose";

const connectDB = async () => {
    try {
        await mongoose.connect("mongodb+srv://jagnyadattadcs:Dcs%402025@cluster0.lew6qms.mongodb.net/OSOO-Oncology");
        console.log("DB Connected Successfully!");
    } catch (error) {
        console.log(error);
    }
}

export default connectDB;