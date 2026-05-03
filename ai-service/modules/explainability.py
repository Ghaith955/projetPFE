"""
Module 7 — Explainability Layer
Ensures all IDSS recommendations and predictions are transparent and understandable.
Provides structured reasoning for every decision the AI Brain makes.

This module wraps around other modules to add:
  - Factor-by-factor breakdown of every score
  - Natural-language justification in French
  - Confidence indicators with data quality assessment
  - Visual-ready explanation structures for the Angular frontend
"""
from utils.features import compute_features, get_swimmer_info, get_all_swimmer_ids


def explain_fatigue_decision(fatigue_result: dict) -> dict:
    """
    Take a fatigue detection result and produce a structured,
    human-readable explanation of WHY this level was assigned.
    
    Returns an explainability block that can be displayed in the UI
    to build trust with coaches and decision-makers.
    """
    score = fatigue_result.get("fatigue_score", 0)
    level = fatigue_result.get("fatigue_level", "LOW")
    rules = fatigue_result.get("triggered_rules", [])
    name = fatigue_result.get("name", "Inconnu")
    
    # Build factor contributions (which rules contributed how much)
    factor_contributions = []
    for rule in rules:
        rule_name = rule.get("rule", "")
        severity = rule.get("severity", "INFO")
        message = rule.get("message", "")
        
        # Map rule to its point contribution
        point_map = {
            "ACWR_CRITICAL": 35,
            "ACWR_HIGH": 20,
            "CONSECUTIVE_DAYS_CRITICAL": 30,
            "CONSECUTIVE_DAYS_HIGH": 15,
            "HIGH_FATIGUE_REPORTED": 25,
            "MODERATE_FATIGUE": 10,
            "WEEKLY_OVERLOAD": 15,
            "PERFORMANCE_DECLINING": 10,
            "HIGH_INTENSITY_FREQUENCY": 15,
        }
        points = point_map.get(rule_name, 0)
        pct_of_score = round((points / max(score, 1)) * 100, 1)
        
        factor_contributions.append({
            "factor": rule_name,
            "severity": severity,
            "points_added": points,
            "percentage_of_total": pct_of_score,
            "detail": message
        })
    
    # Sort by contribution (highest first)
    factor_contributions.sort(key=lambda x: x["points_added"], reverse=True)
    
    # Build natural language summary
    if not rules:
        summary = (
            f"{name} présente un niveau de fatigue {level} (score {score}/100). "
            f"Aucun facteur de risque n'a été détecté. Le nageur peut poursuivre "
            f"son programme d'entraînement normalement."
        )
    else:
        top_factor = factor_contributions[0]["detail"] if factor_contributions else ""
        summary = (
            f"{name} présente un niveau de fatigue {level} (score {score}/100). "
            f"Le facteur principal est : {top_factor}. "
        )
        if len(factor_contributions) > 1:
            other_factors = [f["detail"] for f in factor_contributions[1:]]
            summary += f"Autres facteurs : {'; '.join(other_factors)}. "
        
        rec = fatigue_result.get("recommendation", "")
        if rec:
            summary += f"Recommandation : {rec}"
    
    # Data quality assessment
    acwr = fatigue_result.get("acwr", 0)
    sessions = fatigue_result.get("sessions_last7d", 0)
    
    if sessions >= 3 and acwr > 0:
        data_quality = "BONNE"
        data_quality_detail = f"Basé sur {sessions} séances récentes avec ACWR calculé."
    elif sessions >= 1:
        data_quality = "MOYENNE"
        data_quality_detail = f"Seulement {sessions} séance(s) récente(s). Plus de données amélioreraient la précision."
    else:
        data_quality = "FAIBLE"
        data_quality_detail = "Peu ou pas de données d'entraînement récentes. Résultat indicatif uniquement."
    
    # Decision reasoning chain
    reasoning_chain = [
        f"1. Collecte des données d'entraînement et de performance de {name}",
        f"2. Calcul des métriques : ACWR={acwr}, séances/7j={sessions}",
        f"3. Application de {len(rules)} règle(s) de détection sur {len(point_map)} règles totales",
        f"4. Score de fatigue calculé : {score}/100",
        f"5. Classification : {level} (seuils : LOW<20, MEDIUM<45, HIGH<70, CRITICAL≥70)",
        f"6. Génération de la recommandation adaptée au niveau {level}"
    ]
    
    return {
        "swimmer_id": fatigue_result.get("swimmer_id"),
        "name": name,
        "decision_type": "FATIGUE_DETECTION",
        "decision_level": level,
        "decision_score": score,
        "summary": summary,
        "factor_contributions": factor_contributions,
        "reasoning_chain": reasoning_chain,
        "data_quality": data_quality,
        "data_quality_detail": data_quality_detail,
        "confidence": fatigue_result.get("confidence", "RULE_BASED"),
        "recommendation": fatigue_result.get("recommendation", ""),
        "method": "Système expert à base de règles avec scoring pondéré (ACWR, RPE, charge, tendance)"
    }


def explain_prediction(prediction_result: dict) -> dict:
    """
    Explain a performance prediction: why this time was predicted,
    which factors matter most, and how confident the model is.
    """
    name = prediction_result.get("name", "Inconnu")
    predicted = prediction_result.get("predicted_time_sec")
    current_best = prediction_result.get("current_best_sec")
    delta = prediction_result.get("delta_sec", 0)
    confidence = prediction_result.get("confidence", "LOW")
    r2 = prediction_result.get("r_squared", 0)
    feature_importance = prediction_result.get("feature_importance", {})
    
    if predicted is None:
        return {
            "swimmer_id": prediction_result.get("swimmer_id"),
            "name": name,
            "decision_type": "PERFORMANCE_PREDICTION",
            "summary": f"Prédiction impossible pour {name} : données insuffisantes.",
            "data_quality": "INSUFFISANTE",
            "method": "Régression Linéaire (scikit-learn)"
        }
    
    # Sort features by absolute importance
    sorted_features = sorted(feature_importance.items(), key=lambda x: abs(x[1]), reverse=True)
    
    # Build factor analysis
    factor_analysis = []
    feature_labels = {
        "progression": "Progression temporelle",
        "intensity": "Intensité d'entraînement",
        "session_load": "Charge de la séance",
        "fatigue_level": "Niveau de fatigue",
        "duration": "Durée de la séance"
    }
    
    for feat_name, coef in sorted_features:
        label = feature_labels.get(feat_name, feat_name)
        if coef < 0:
            impact = "réduit le temps (améliore la performance)"
        elif coef > 0:
            impact = "augmente le temps (dégrade la performance)"
        else:
            impact = "impact neutre"
        
        factor_analysis.append({
            "factor": label,
            "coefficient": coef,
            "impact": impact,
            "importance_rank": len(factor_analysis) + 1
        })
    
    # Natural language explanation
    if delta < 0:
        direction = f"une amélioration de {abs(delta):.2f}s par rapport au meilleur temps actuel"
    elif delta > 0:
        direction = f"un temps légèrement supérieur de {delta:.2f}s au meilleur temps actuel"
    else:
        direction = "un temps similaire au meilleur temps actuel"
    
    summary = (
        f"Le modèle prédit un temps de {predicted:.2f}s pour {name}, soit {direction}. "
        f"La confiance du modèle est {confidence} (R²={r2:.2f}). "
    )
    
    if sorted_features:
        top_feat = feature_labels.get(sorted_features[0][0], sorted_features[0][0])
        summary += f"Le facteur le plus influent est '{top_feat}'."
    
    # Confidence explanation
    if confidence == "HIGH":
        conf_detail = "Le modèle est bien calibré avec suffisamment de données (R²>0.7, 10+ séances)."
    elif confidence == "MEDIUM":
        conf_detail = "Le modèle a une précision modérée. Plus de données amélioreraient la prédiction."
    else:
        conf_detail = "Le modèle a une faible précision. Les résultats sont à interpréter avec prudence."
    
    reasoning_chain = [
        f"1. Récupération de l'historique de performance de {name} (180 derniers jours)",
        f"2. Construction du vecteur de caractéristiques (progression, intensité, charge, fatigue, durée)",
        f"3. Entraînement du modèle de Régression Linéaire sur les données historiques",
        f"4. Évaluation du modèle : R²={r2:.2f}",
        f"5. Prédiction du prochain temps : {predicted:.2f}s",
        f"6. Comparaison avec le meilleur temps actuel ({current_best:.2f}s) : delta={delta:.2f}s"
    ]
    
    return {
        "swimmer_id": prediction_result.get("swimmer_id"),
        "name": name,
        "decision_type": "PERFORMANCE_PREDICTION",
        "predicted_time_sec": predicted,
        "current_best_sec": current_best,
        "delta_sec": delta,
        "summary": summary,
        "factor_analysis": factor_analysis,
        "reasoning_chain": reasoning_chain,
        "confidence": confidence,
        "confidence_detail": conf_detail,
        "data_quality": "BONNE" if confidence == "HIGH" else ("MOYENNE" if confidence == "MEDIUM" else "FAIBLE"),
        "method": "Régression Linéaire Multivariée (scikit-learn LinearRegression)"
    }


def explain_recommendation(recommendation_result: dict) -> dict:
    """
    Explain why certain swimmers were recommended for competition.
    Shows the scoring breakdown per swimmer for full transparency.
    """
    ranked = recommendation_result.get("ranked_swimmers", [])
    weights = recommendation_result.get("scoring_weights", {})
    total = recommendation_result.get("total_evaluated", 0)
    
    explained_swimmers = []
    for swimmer in ranked:
        reasons = swimmer.get("reasons", [])
        score = swimmer.get("score", 0)
        trend = swimmer.get("trend", "stable")
        fatigue = swimmer.get("fatigue_level", "OPTIMAL")
        
        # Trend label
        trend_labels = {
            "improving": "en progression",
            "stable": "stable",
            "declining": "en baisse"
        }
        
        detail = (
            f"{swimmer.get('name', 'Inconnu')} est classé(e) #{swimmer.get('rank', '?')} "
            f"avec un score de {score:.3f}/1.000. "
            f"Performance {trend_labels.get(trend, trend)}, "
            f"fatigue {fatigue}. "
            f"Points forts : {'; '.join(reasons)}."
        )
        
        explained_swimmers.append({
            "swimmer_id": swimmer.get("swimmer_id"),
            "name": swimmer.get("name"),
            "rank": swimmer.get("rank"),
            "score": score,
            "detail": detail,
            "key_strengths": reasons
        })
    
    summary = (
        f"Classement de {total} nageurs évalués. "
        f"Critères de sélection : performance récente ({weights.get('performance', '35%')}), "
        f"progression ({weights.get('progression', '25%')}), "
        f"risque de fatigue ({weights.get('fatigue_inverse', '15%')}), "
        f"régularité ({weights.get('consistency', '10%')}), "
        f"assiduité ({weights.get('attendance', '10%')}), "
        f"expérience ({weights.get('experience', '5%')})."
    )
    
    reasoning_chain = [
        f"1. Récupération de tous les nageurs avec données de performance",
        f"2. Calcul des caractéristiques pour chaque nageur (temps, tendance, ACWR, assiduité)",
        f"3. Normalisation Min-Max de chaque facteur sur l'échelle 0-1",
        f"4. Application de la pondération multi-critères",
        f"5. Tri par score décroissant et attribution des rangs",
        f"6. {total} nageurs évalués, top {len(ranked)} sélectionnés"
    ]
    
    return {
        "decision_type": "COMPETITION_RECOMMENDATION",
        "competition_id": recommendation_result.get("competition_id"),
        "summary": summary,
        "explained_swimmers": explained_swimmers,
        "scoring_weights": weights,
        "reasoning_chain": reasoning_chain,
        "method": "Score multi-critères pondéré avec normalisation Min-Max",
        "total_evaluated": total
    }


def explain_simulation(simulation_result: dict) -> dict:
    """
    Explain a simulation result: what was changed, what the projected
    impact is, and why warnings were triggered.
    """
    name = simulation_result.get("name", "Inconnu")
    weeks = simulation_result.get("simulation_weeks", 4)
    changes = simulation_result.get("changes_applied", {})
    current = simulation_result.get("current", {})
    projected = simulation_result.get("projected", {})
    warnings = simulation_result.get("warnings", [])
    
    # Build change descriptions
    change_descriptions = []
    if changes.get("sessions_per_week") != current.get("load_7d_km"):
        change_descriptions.append(
            f"Séances/semaine : {current.get('load_7d_km', '?')} → {changes.get('sessions_per_week', '?')}"
        )
    change_descriptions.append(
        f"Intensité moyenne : {changes.get('avg_intensity', '?')}"
    )
    change_descriptions.append(
        f"Charge hebdomadaire : {current.get('load_7d_km', 0)} km → {changes.get('total_load_weekly_km', 0)} km"
    )
    
    # Impact assessment
    delta = projected.get("delta_sec", 0)
    if delta < 0:
        impact = f"Amélioration estimée de {abs(delta):.2f}s"
        impact_type = "POSITIVE"
    elif delta > 0:
        impact = f"Dégradation estimée de {delta:.2f}s (risque de surcharge)"
        impact_type = "NEGATIVE"
    else:
        impact = "Aucun changement significatif attendu"
        impact_type = "NEUTRAL"
    
    summary = (
        f"Simulation pour {name} sur {weeks} semaines. "
        f"{impact}. "
        f"ACWR projeté : {current.get('acwr', '?')} → {projected.get('acwr', '?')}. "
        f"Fatigue : {projected.get('fatigue_change', '?')}."
    )
    
    if warnings:
        summary += f" ⚠️ {len(warnings)} alerte(s) détectée(s)."
    
    reasoning_chain = [
        f"1. Lecture de l'état actuel de {name} (charge, ACWR, fatigue)",
        f"2. Application des modifications hypothétiques",
        f"3. Projection de la charge chronique sur {weeks} semaines (adaptation progressive)",
        f"4. Calcul de l'ACWR projeté : {projected.get('acwr', '?')}",
        f"5. Estimation du delta de performance : {delta:+.2f}s",
        f"6. Évaluation du risque de fatigue projeté : {projected.get('fatigue_level', '?')}",
        f"7. Génération de {len(warnings)} alerte(s) si seuils dépassés"
    ]
    
    return {
        "swimmer_id": simulation_result.get("swimmer_id"),
        "name": name,
        "decision_type": "SCENARIO_SIMULATION",
        "simulation_weeks": weeks,
        "summary": summary,
        "impact_type": impact_type,
        "impact_detail": impact,
        "changes_described": change_descriptions,
        "warnings": warnings,
        "reasoning_chain": reasoning_chain,
        "data_quality": "BONNE" if current.get("acwr", 0) > 0 else "FAIBLE",
        "method": "Projection déterministe avec modèle d'adaptation chronique de la charge"
    }
