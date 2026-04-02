exports.sendMessage = async (req, res) => {
  try {
    const { messages } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Invalid request. 'messages' array is required." });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
       console.error("OPENROUTER_API_KEY is not configured in .env");
       return res.status(500).json({ error: "Configuration error on server." });
    }

    // Add a system prompt so the LLM behaves as the Swimming club assistant
    const fullMessages = [
      {
        role: "system",
        content: "Vous êtes l'assistant IA officiel de la section Natation du Stade Tunisien (IDSS Natation). Vous aidez les adhérents, les nageurs, les entraîneurs et les membres de l'administration. Soyez concis, toujours poli, et offrez des réponses claires en français. Votre rôle est de répondre aux questions concernant la natation, les horaires, les conseils techniques, le planning, les compétitions et l'application."
      },
      ...messages
    ];

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "model": "openai/gpt-3.5-turbo", // You can use a specific model available on openrouter, usually generic endpoint falls back to free models if available or default. Let's use google/gemini-2.5-flash or an alternative if intended, but let's stick to a robust standard standard text model
        "messages": fullMessages
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenRouter API Error:", errorText);
      return res.status(response.status).json({ error: "Erreur lors de la communication avec l'assistant." });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Erreur serveur lors de chat:", error);
    res.status(500).json({ error: "Erreur serveur interne lors du traitement de votre message." });
  }
};
