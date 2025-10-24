import PROVIDERS from "../backend/providers.json";

export default function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  res.json(PROVIDERS);
}
