import dotenv from "dotenv";
import { fileURLToPath } from "node:url";

const envFilePath = fileURLToPath(new URL("../../.env", import.meta.url));

dotenv.config({ path: envFilePath });
