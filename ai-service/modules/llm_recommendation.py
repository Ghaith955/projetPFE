"""
Module — LLM-Enhanced Recommendations (Groq)
Generates personalized, natural-language training recommendations
for swimmers using Groq's chat completion API instead of static rule-based messages.

Falls back gracefully to rule-based advice when the API key is missing
or the API call fails.
"""
import traceback
from config import GROQ_API_KEY, GROQ_MODEL

# Lazy-load the client only when needed
_client = None


def _get_client():
    """Lazy-initialize the Groq client."""
    global _client
    if _client is None:
        if not GROQ_API_KEY:
            return None
        from groq import Groq
        _client = Groq(api_key=GROQ_API_KEY)
    return _client


def generate_smart_recommendation(swimmer_data: dict) -> dict:
    """
    Generate an AI-powered recommendation for a swimmer.

    Args:
        swimmer_data: dict with keys like name, fatigue_level, fatigue_score,
                      acwr, sessions_last7d, trend_slope, attendance_rate,
                      personal_best_sec, etc.

    Returns:
        dict with 'recommendation', 'athlete_advice', 'source' keys.
    """
    client = _get_client()
    if client is None:
        return _fallback_recommendation(swimmer_data)

    try:
        prompt = _build_prompt(swimmer_data)
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Tu es un expert en science du sport et en natation de compétition. "
                        "Tu travailles comme assistant AI pour le club de natation Stade Tunisien. "
                        "Tu dois donner des recommandations précises, personnalisées et actionables "
                        "en français. Sois concis mais complet. "
                        "Utilise un ton professionnel mais encourageant. "
                        "Réponds en 3-5 phrases maximum pour la recommandation coach, "
                        "et 2-3 phrases pour le conseil nageur."
                    )
                },
                {"role": "user", "content": prompt}
            ],
            max_tokens=400,
            temperature=0.7,
        )

        content = response.choices[0].message.content.strip()

        # Parse the response (expecting coach rec + athlete advice)
        parts = content.split("---")
        if len(parts) >= 2:
            coach_rec = parts[0].strip()
            athlete_advice = parts[1].strip()
        else:
            coach_rec = content
            athlete_advice = _extract_athlete_advice(content, swimmer_data)

        return {
            "recommendation": coach_rec,
            "athlete_advice": athlete_advice,
            "source": "GROQ",
            "model": GROQ_MODEL,
        }

    except Exception as e:
        traceback.print_exc()
        print(f"[LLM] Groq call failed: {e}")
        return _fallback_recommendation(swimmer_data)


def _build_prompt(data: dict) -> str:
    """Build the ChatGPT prompt from swimmer data."""
    name = data.get("name", "Inconnu")
    fatigue_level = data.get("fatigue_level", "UNKNOWN")
    fatigue_score = data.get("fatigue_score", 0)
    acwr = data.get("acwr", 0)
    sessions = data.get("sessions_last7d", 0)
    trend = data.get("trend_slope", 0)
    attendance = data.get("attendance_rate", 0)
    best_time = data.get("personal_best_sec")
    avg_time = data.get("avg_time_last5")
    load_7d = data.get("total_load_7d", data.get("total_load_7d_km", 0))
    load_28d = data.get("total_load_28d", data.get("total_load_28d_km", 0))
    consecutive_days = data.get("consecutive_days", 0)
    age = data.get("age", 18)

    trend_text = "en amélioration" if trend < -0.1 else ("en régression" if trend > 0.1 else "stable")
    best_time_text = f"{best_time:.2f}s" if best_time else "non disponible"
    avg_time_text = f"{avg_time:.2f}s" if avg_time else "non disponible"

    return f"""Analyse le profil de natation suivant et donne :
1. Une recommandation pour le coach (comment ajuster l'entraînement)
2. Un conseil direct pour le nageur (motivation + action concrète)

Sépare les deux parties par "---" sur une nouvelle ligne.

=== PROFIL DU NAGEUR ===
Nom: {name}
Âge: {age} ans
Meilleur temps récent: {best_time_text}
Temps moyen (5 dernières séances): {avg_time_text}
Tendance de performance: {trend_text} ({trend:.3f}s/séance)
Taux d'assiduité: {attendance*100:.0f}%
Séances cette semaine: {sessions}
Jours consécutifs d'entraînement: {consecutive_days}

=== CHARGE D'ENTRAÎNEMENT ===
Charge aiguë (7j): {load_7d:.1f} km
Charge chronique (28j): {load_28d:.1f} km
Ratio ACWR: {acwr:.2f} (optimal: 0.8–1.3)

=== ÉTAT DE FATIGUE ===
Score de fatigue: {fatigue_score}/100
Niveau: {fatigue_level}
"""


def _fallback_recommendation(data: dict) -> dict:
    """Rule-based fallback when OpenAI is unavailable."""
    level = data.get("fatigue_level", "LOW")
    acwr = data.get("acwr", 1.0)
    name = data.get("name", "Ce nageur")

    recs = {
        "CRITICAL": (
            f"Alerte critique pour {name}. Repos complet recommandé pendant 48-72h. "
            f"Suspendre tout entraînement intensif. ACWR à {acwr} indique un risque de blessure élevé.",
            "Repose-toi complètement pendant 2-3 jours. Priorise le sommeil et l'hydratation."
        ),
        "HIGH": (
            f"{name} présente un risque de surmenage. Réduire l'intensité de 40% cette semaine. "
            f"Privilégier la récupération active et la technique.",
            "Ralentis le rythme cette semaine. Fais des étirements et dors 8h minimum."
        ),
        "MEDIUM": (
            f"{name} est dans une zone de vigilance. Maintenir la charge actuelle sans augmentation. "
            f"Surveiller l'évolution sur les 3 prochaines séances.",
            "Continue à ce rythme mais écoute ton corps. Hydrate-toi bien et mange équilibré."
        ),
        "LOW": (
            f"{name} est en bonne condition. Le profil permet une légère augmentation progressive "
            f"de la charge (5-10% max par semaine).",
            "Tu es en pleine forme ! Continue comme ça et pousse un peu plus cette semaine."
        ),
    }

    coach_rec, athlete_advice = recs.get(level, recs["LOW"])

    return {
        "recommendation": coach_rec,
        "athlete_advice": athlete_advice,
        "source": "RULE_BASED",
    }


def _extract_athlete_advice(full_text: str, data: dict) -> str:
    """Extract or generate athlete advice from the full response."""
    level = data.get("fatigue_level", "LOW")
    defaults = {
        "CRITICAL": "Repos total. Concentre-toi sur la récupération et le sommeil.",
        "HIGH": "Réduis l'intensité et priorise la récupération active.",
        "MEDIUM": "Maintiens le rythme et reste attentif à ton corps.",
        "LOW": "Excellente forme ! Continue à progresser.",
    }
    return defaults.get(level, defaults["LOW"])
