import dotenv from "dotenv";
import { Pool, types } from "pg";

dotenv.config();

// Return DATE colums {OID 1082} as plain 'YYYY-MM-DD' strings instead of js date
// so JSON serialization doest't UTC-shift the date for clients in non-UTC timezone
types.setTypeParser(1082, (val) => val);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

pool.on("connect", () => {
  console.log("Connect to Neon Postgresql");
});

pool.on("error", (err) => {
  console.error("Unexpected Postgresql error: ", err);
  process.exit(-1);
});

export default pool;