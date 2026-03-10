// In-memory rate limit store: { ip: { count, windowStart } }
const rateLimit = {};
const MAX_REQUESTS = 5;      // max requests per window
const WINDOW_MS = 60 * 1000; // 1 minute window

function isRateLimited(ip) {
  const now = Date.now();
  if (!rateLimit[ip] || now - rateLimit[ip].windowStart > WINDOW_MS) {
    rateLimit[ip] = { count: 1, windowStart: now };
    return false;
  }
  rateLimit[ip].count++;
  return rateLimit[ip].count > MAX_REQUESTS;
}

// Clean up old entries every 5 minutes to prevent memory leak
setInterval(() => {
  const now = Date.now();
  for (const ip in rateLimit) {
    if (now - rateLimit[ip].windowStart > WINDOW_MS * 5) delete rateLimit[ip];
  }
}, 5 * 60 * 1000);

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: { message: "Method not allowed" } });
  }

  // Rate limit by IP
  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket?.remoteAddress || "unknown";
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: { message: "Too many requests — please wait a minute before generating another schedule." } });
  }

  // Block empty or oversized bodies
  const body = req.body;
  if (!body || !body.messages) {
    return res.status(400).json({ error: { message: "Invalid request body" } });
  }
  const bodySize = JSON.stringify(body).length;
  if (bodySize > 20000) {
    return res.status(413).json({ error: { message: "Request too large" } });
  }

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: { message: "Server error — please try again." } });
  }
}