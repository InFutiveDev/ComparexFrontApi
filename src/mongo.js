import { MongoClient } from "mongodb";
import "dotenv/config";

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error("MONGODB_URI is not set in environment variables");
}

const client = new MongoClient(uri);

let db;

export async function connectToMongo() {
  await client.connect();
  db = client.db();
  console.log("Connected to MongoDB");
  return db;
}

export function getDb() {
  if (!db) {
    throw new Error("MongoDB is not connected. Call connectToMongo() first.");
  }
  return db;
}

export async function closeMongo() {
  await client.close();
  db = undefined;
  console.log("MongoDB connection closed");
}
