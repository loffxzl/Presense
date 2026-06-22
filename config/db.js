import mongoose from "mongoose";

const coonectDB = async () => {
    try{
        mongoose.connect(process.env.MONGO_URI);
        console.log('DB connected');
    }catch(err){
        console.error('db connection error: ' , err.message);
        process.exit(1)
    }
}

export default coonectDB;