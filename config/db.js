import mongoose from "mongoose";

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 20000,
            connectTimeoutMS: 10000
        });

        console.log("DB connected successfully");
        console.log("Database:", mongoose.connection.name);

    } catch (err) {
        console.error("Database connection failed:", err.message);
        throw err;
    }
};

export default connectDB;
