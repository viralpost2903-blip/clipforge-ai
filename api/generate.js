export default async function handler(req, res) {
  // Allow requests from your ClipForge.ai website
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Only POST requests are allowed."
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "Gemini API key is not configured on the server."
    });
  }

  try {
    const { prompt, type } = req.body || {};

    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({
        error: "Please provide a prompt."
      });
    }

    if (prompt.length > 10000) {
      return res.status(400).json({
        error: "Your prompt is too long."
      });
    }

    const instruction =
      type === "video"
        ? "You are ClipForge AI, a professional AI video prompt writer. Turn the user's idea into a detailed, cinematic video-generation prompt. Include subject, action, setting, camera movement, lighting, style, and aspect ratio. Do not claim that you rendered a video."
        : "You are ClipForge AI, a professional marketing copywriter. Create engaging, original content based on the user's request. Make the result clear, useful, and ready to use.";

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" +
        encodeURIComponent(apiKey),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: instruction }]
          },
          contents: [
            {
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 1500
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API error:", data);
      return res.status(502).json({
        error: "AI generation failed. Please try again."
      });
    }

    const text = data.candidates?.[0]?.content?.parts
      ?.map(part => part.text || "")
      .join("");

    if (!text) {
      return res.status(502).json({
        error: "The AI returned no text. Please try again."
      });
    }

    return res.status(200).json({ text });
  } catch (error) {
    console.error("Generation error:", error);
    return res.status(500).json({
      error: "Something went wrong while generating content."
    });
  }
}
