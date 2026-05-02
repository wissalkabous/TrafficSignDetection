"""
constants.py — Constantes et mappages ADAS
Contient tous les mappages de classes, couleurs, messages d'alerte et limites de vitesse.
"""

# ── Mapping nom_modèle → id brut ADAS (ADAS v6 — 15 classes) ────────────────────
MODEL_NAME_TO_RAW = {
    # Vitesses (indices 0-7)
    "vitesse_20": "0",  "0": "0",
    "vitesse_30": "1",  "1": "1",
    "vitesse_50": "2",  "2": "2",
    "vitesse_60": "3",  "3": "3",
    "vitesse_70": "4",  "4": "4",
    "vitesse_80": "5",  "5": "5",
    "vitesse_100": "6",  "6": "6",
    "vitesse_120": "7",  "7": "7",
    # Interdictions (indices 8-11)
    "depassement_interdit": "8",  "8": "8",
    "stop": "9",  "9": "9",
    "sens_interdit": "10",  "10": "10",
    "entree_interdite": "11",  "11": "11",
    # Feux (indices 12-14)
    "feu_vert": "go",  "12": "go",
    "feu_rouge": "red_light",  "13": "red_light",
    "feu_orange": "warning",  "14": "warning",
    # Alias anglais (fallback)
    "go": "go", "green_light": "go", "green": "go",
    "red_light": "red_light", "stop_light": "red_light", "red": "red_light",
    "warning": "warning", "yellow_light": "warning", "yellow": "warning",
}

# Classes autorisées (tous les identifiants internes)
ALLOWED_RAW_CLASSES = {
    "0", "1", "2", "3", "4", "5", "6", "7",   # vitesses
    "8", "9", "10", "11",                     # interdictions + stop
    "go", "red_light", "warning",              # feux
}

CLASS_FR = {
    # Vitesses
    "0": "Limite 20 km/h",   "1": "Limite 30 km/h",   "2": "Limite 50 km/h",
    "3": "Limite 60 km/h",   "4": "Limite 70 km/h",   "5": "Limite 80 km/h",
    "6": "Limite 100 km/h",  "7": "Limite 120 km/h",
    # Interdictions
    "8": "Dépassement interdit",
    "9": "STOP",
    "10": "Sens interdit",
    "11": "Entrée interdite",
    # Feux
    "go": "Feu Vert",  "red_light": "Feu Rouge",  "warning": "Feu Orange",
}

CLASS_ICON = {
    # Vitesses
    "0": "🔵", "1": "🔵", "2": "🔵", "3": "🔵", "4": "🔵",
    "5": "🔵", "6": "🔵", "7": "🔵",
    # Interdictions
    "8": "🚫", "9": "🛑", "10": "⛔", "11": "⛔",
    # Feux
    "go": "🟢", "red_light": "🔴", "warning": "🟠",
}

ALERT_LEVEL = {
    # Feux rouges et panneaux d'interdiction = critique
    "red_light": "critical",  "9": "critical",  "10": "critical",  "11": "critical",
    # Dépassement interdit = attention
    "8": "warning",  "warning": "warning",
    # Feu vert = sûr
    "go": "safe",
}

ALERT_MSG = {
    "critical": "⛔ DANGER — Arrêt/Accès interdit",
    "warning": "⚠️ Attention — Ralentir/Pas de dépassement",
    "safe": "✅ Voie libre — Avancez",
    "info": "ℹ️ Panneau détecté",
}

SPEED_LIMITS = {
    "0": 20, "1": 30, "2": 50, "3": 60,
    "4": 70, "5": 80, "6": 100, "7": 120,
}

CLASS_COLOR = {
    "go": "#00e87a", "red_light": "#ff1e3c", "warning": "#ff8800",
    "9": "#ff1e3c", "10": "#ff3355", "11": "#ff3355",
    "8": "#ff6600",
}

SPEED_COLOR = "#00d4ff"
