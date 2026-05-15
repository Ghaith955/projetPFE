/**
 * Chat Controller — IDSS Natation AI Assistant
 * Uses Groq chat completions with the same model as recommendations.
 */

const SYSTEM_PROMPT = "Vous êtes l'assistant IA officiel de la section Natation du Stade Tunisien (IDSS Natation). Vous aidez les adhérents, les nageurs, les entraîneurs et les membres de l'administration. Soyez concis, toujours poli, et offrez des réponses claires en français. Votre rôle est de répondre aux questions concernant la natation, les horaires, les conseils techniques, le planning, les compétitions et l'application.";

// ── Groq API ────────────────────────────────────────────────────────
async function callGroq(messages, apiKey, model) {
  const fullMessages = [{ role: 'system', content: SYSTEM_PROMPT }, ...messages];

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      messages: fullMessages,
      temperature: 0.7,
      max_tokens: 500
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Groq API Error]', response.status, errorText);
    return null;
  }

  return await response.json();
}

// ── Controller ──────────────────────────────────────────────────────
exports.sendMessage = async (req, res) => {
  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Invalid request. 'messages' array is required." });
    }

    const groqKey = process.env.GROQ_API_KEY;
    const groqModel = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
    if (!groqKey) {
      return res.status(502).json({
        error: "L'assistant est indisponible. GROQ_API_KEY est manquant."
      });
    }

    const result = await callGroq(messages, groqKey, groqModel);
    if (!result) {
      return res.status(502).json({
        error: "L'assistant est indisponible. Erreur de l'API Groq."
      });
    }

    res.json(result);
  } catch (error) {
    console.error('Erreur serveur lors de chat:', error);
    res.status(500).json({ error: "Erreur serveur interne lors du traitement de votre message." });
  }
};
