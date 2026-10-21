import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/campusNotes";

const connectDatabase = async () => {
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 3000 });
  console.log("MongoDB Connected");
};

export { connectDatabase };
