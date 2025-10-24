import handler from "../index.js";

export default function vercelHandler(req, res) {
  return handler(req, res);
}
