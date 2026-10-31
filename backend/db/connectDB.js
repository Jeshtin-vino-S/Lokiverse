import mongoose from "mongoose";

const connecDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("mongodb connected successfully")
    } catch (error) {
        console.log(`error in connectDB : ${error}`)
        process.exit(1)
    }
}

export default connecDB;