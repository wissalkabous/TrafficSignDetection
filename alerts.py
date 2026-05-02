"""
alerts.py — Moteur d'alertes et d'avertissements conducteur
Évalue la sévérité d'une détection basée sur la vitesse et le type de panneau.
"""

from .constants import SPEED_LIMITS


class AlertEngine:
    """Évalue et génère les alertes conducteur en fonction de la vitesse et du panneau."""
    
    def __init__(self):
        self._limit = 50  # limite par défaut (km/h)

    @property
    def current_limit(self):
        """Retourne la limite de vitesse actuelle."""
        return self._limit

    def update_limit(self, raw: str):
        """Met à jour la limite de vitesse à partir d'un panneau de vitesse."""
        if raw in SPEED_LIMITS:
            self._limit = SPEED_LIMITS[raw]

    def evaluate(self, speed: float, sign: str = None) -> dict:
        """
        Évalue le danger basé sur la vitesse et le type de panneau.
        
        Args:
            speed: vitesse en km/h (ou None si non calibrée)
            sign: ID brut du panneau (ex: "9" pour STOP, "red_light" pour feu rouge)
        
        Returns:
            dict avec clés "state" (danger/overspeed/warning/ok/info) et "msg"
        """
        if sign in ("red_light", "9", "10", "11"):
            return {"state": "danger",    "msg": "⛔ ARRÊT OBLIGATOIRE !"}
        
        if speed is None:
            return {"state": "info",      "msg": "ℹ️ Vitesse non calibrée"}
        
        if speed == 0:
            return {"state": "ok",        "msg": "✅ Vitesse correcte"}
        
        ex = speed - self._limit
        if ex > 25:
            return {"state": "overspeed", "msg": f"🚨 EXCÈS +{ex:.0f} km/h !"}
        if ex >  5:
            return {"state": "warning",   "msg": f"⚠️ Ralentir +{ex:.0f} km/h"}
        
        return {"state": "ok",            "msg": "✅ Vitesse correcte"}
