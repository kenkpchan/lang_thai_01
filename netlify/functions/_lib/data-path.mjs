import path from "path";

/** Writable data directory (local `data/`, or `/tmp` on Netlify/Lambda). */
export function dataDir() {
  if (process.env.LANG_THAI_DATA_DIR) {
    return process.env.LANG_THAI_DATA_DIR;
  }
  if (process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return "/tmp/lang-thai-data";
  }
  return path.join(process.cwd(), "data");
}
