import fs from "fs";
import path from "path";
import { decode } from "@msgpack/msgpack";

/**
 * Quick local utility script to inspect and decode any stored MessagePack binary file.
 * Run in terminal via:
 * node inspect_msgpack.js <path_to_file.msgpack>
 */

const filePath = process.argv[2];

if (!filePath) {
  console.error("\x1b[31mError: Please provide a path to a .msgpack file.\x1b[0m");
  console.log("Usage: node inspect_msgpack.js <path_to_file.msgpack>");
  process.exit(1);
}

try {
  const absolutePath = path.resolve(filePath);
  if (!fs.existsSync(absolutePath)) {
    console.error(`\x1b[31mError: File not found at "${absolutePath}"\x1b[0m`);
    process.exit(1);
  }

  const binaryBuffer = fs.readFileSync(absolutePath);
  console.log(`\x1b[36mDecoding binary payload (${binaryBuffer.length} bytes)... \x1b[0m`);
  
  // Decode MessagePack binary stream back to JavaScript Object
  const decodedData = decode(binaryBuffer);

  console.log("\n\x1b[32mSuccessfully Decoded Data:\x1b[0m");
  console.log(JSON.stringify(decodedData, null, 2));

} catch (err) {
  console.error("\x1b[31mFailed to decode MessagePack file:\x1b[0m", err);
}
