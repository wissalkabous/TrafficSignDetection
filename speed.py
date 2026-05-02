"""
speed.py — Estimateurs de vitesse (simple et calibré avec filtre de Kalman)
Calcule la vitesse d'approche/éloignement d'un panneau basé sur la variation de sa largeur en pixels, stabilisée par un filtre de Kalman.
"""

import collections
import numpy as np

class KalmanFilter1D:
    """Filtre de Kalman simple à 1 dimension pour lisser les mesures (ex: la distance)."""
    def __init__(self, process_variance=1e-2, estimated_measurement_variance=1e-1):
        self.process_variance = process_variance
        self.estimated_measurement_variance = estimated_measurement_variance
        self.posteri_estimate = 0.0
        self.posteri_error_estimate = 1.0

    def input_latest_noisy_measurement(self, measurement):
        # Prédiction
        priori_estimate = self.posteri_estimate
        priori_error_estimate = self.posteri_error_estimate + self.process_variance

        # Mise à jour
        blending_factor = priori_error_estimate / (priori_error_estimate + self.estimated_measurement_variance)
        self.posteri_estimate = priori_estimate + blending_factor * (measurement - priori_estimate)
        self.posteri_error_estimate = (1 - blending_factor) * priori_error_estimate

    def get_latest_estimated_measurement(self):
        return self.posteri_estimate

    def reset(self, initial_value=0.0):
         self.posteri_estimate = initial_value
         self.posteri_error_estimate = 1.0


class SpeedEstimator:
    """Estimateur simple de vitesse frame-par-frame (sténopé)."""
    
    FOCAL  = 700.0   # px  — focale approximative (calibrer si possible)
    REAL_W = 0.60    # m   — largeur réelle d'un panneau standard européen
    SMOOTH = 7       # fenêtre de lissage

    def __init__(self):
        self._buf    = collections.deque(maxlen=self.SMOOTH)
        self._prev_z = None
        self._prev_t = None

    def update(self, bbox_w_px: float, timestamp: float) -> dict:
        """
        Retourne distance (m) et vitesse lissée (km/h).
        bbox_w_px : largeur en pixels de la bbox du panneau dans l'image originale.
        timestamp : temps en secondes depuis le début de la vidéo.
        """
        if bbox_w_px <= 1:
            return {"distance_m": None, "speed_smooth": 0.0}

        Z = self.FOCAL * self.REAL_W / bbox_w_px   # distance en mètres
        out = {
            "distance_m":   round(Z, 2) if Z < 9999 else None,
            "speed_smooth": 0.0,
        }

        if self._prev_z is not None and self._prev_t is not None:
            dt = timestamp - self._prev_t
            if 0 < dt < 5.0 and Z < 9999 and self._prev_z < 9999:
                v_ms  = abs(self._prev_z - Z) / dt          # m/s
                v_kmh = min(v_ms * 3.6, 300.0)              # km/h plafonné
                self._buf.append(v_kmh)
                out["speed_smooth"] = round(sum(self._buf) / len(self._buf), 1)

        self._prev_z = Z
        self._prev_t = timestamp
        return out

    def reset(self):
        self._prev_z = None
        self._prev_t = None
        self._buf.clear()


class CalibratedSpeedEstimator:
    """
    Estimateur de vitesse calibré avec validation robuste et Filtre de Kalman.
    Retourne None tant que les mesures ne sont pas assez stables.
    """

    def __init__(
        self,
        enabled: bool = True,
        focal_px: float = 900.0,
        sign_width_m: float = 0.60,
        min_bbox_px: float = 16.0,
        min_conf: float = 35.0,
    ):
        self.enabled = bool(enabled)
        self.focal_px = float(focal_px)
        self.sign_width_m = float(sign_width_m)
        self.min_bbox_px = float(min_bbox_px)
        self.min_conf = float(min_conf)

        self._prev_t = None
        self._prev_kalman_z = None
        self._prev_speed = None
        self._window = collections.deque(maxlen=9)
        self._last_raw_distance = None
        
        # Initialisation du filtre de Kalman pour la distance (Z)
        # process_variance : à quel point la vraie distance change (lié à la vitesse réelle)
        # measurement_variance : à quel point la bbox de YOLO "tremble" (le bruit)
        self.kalman_z = KalmanFilter1D(process_variance=0.05, estimated_measurement_variance=0.5)
        self.is_kalman_initialized = False

    def set_calibration(self, focal_px: float, sign_width_m: float):
        """Réajuste les paramètres de calibration."""
        self.focal_px = max(1.0, float(focal_px))
        self.sign_width_m = max(0.05, float(sign_width_m))

    def _distance_from_bbox(self, bbox_w_px: float):
        """Calcule la distance brute en mètres à partir de la largeur du bbox en pixels."""
        if bbox_w_px <= 0:
            return None
        return (self.focal_px * self.sign_width_m) / bbox_w_px

    def update(self, bbox_w_px: float, timestamp: float, confidence: float = 100.0) -> dict:
        """
        Met à jour l'estimateur avec les données de détection actuelles.
        Retourne dict avec clés: distance_m, speed_kmh, valid, reason.
        """
        if not self.enabled:
            return {"distance_m": None, "speed_kmh": None, "valid": False, "reason": "disabled"}

        if self.focal_px <= 1 or self.sign_width_m <= 0.05:
            return {"distance_m": None, "speed_kmh": None, "valid": False, "reason": "bad_calibration"}

        if bbox_w_px < self.min_bbox_px or confidence < self.min_conf:
            return {
                "distance_m": self._prev_kalman_z if self._prev_kalman_z else self._last_raw_distance,
                "speed_kmh": None,
                "valid": False,
                "reason": "weak_detection",
            }

        raw_z = self._distance_from_bbox(float(bbox_w_px))
        if raw_z is None or raw_z <= 0 or raw_z > 3000:
            return {"distance_m": None, "speed_kmh": None, "valid": False, "reason": "bad_distance"}

        self._last_raw_distance = raw_z
        
        # --- Application du Filtre de Kalman sur la distance ---
        if not self.is_kalman_initialized:
             self.kalman_z.reset(initial_value=raw_z)
             self.is_kalman_initialized = True
        
        self.kalman_z.input_latest_noisy_measurement(raw_z)
        smoothed_z = self.kalman_z.get_latest_estimated_measurement()
        # -------------------------------------------------------

        out = {"distance_m": round(smoothed_z, 2), "speed_kmh": None, "valid": False, "reason": "warmup"}

        if self._prev_kalman_z is None or self._prev_t is None:
            self._prev_kalman_z = smoothed_z
            self._prev_t = timestamp
            return out

        dt = float(timestamp - self._prev_t)
        if dt <= 0.01 or dt > 0.5:
            self._prev_kalman_z = smoothed_z
            self._prev_t = timestamp
            return {"distance_m": round(smoothed_z, 2), "speed_kmh": None, "valid": False, "reason": "bad_dt"}

        # Calcul de la vitesse à partir de la distance *lissée par Kalman*
        inst_kmh = abs(self._prev_kalman_z - smoothed_z) / dt * 3.6
        
        if inst_kmh > 180:
            self._prev_kalman_z = smoothed_z
            self._prev_t = timestamp
            return {"distance_m": round(smoothed_z, 2), "speed_kmh": None, "valid": False, "reason": "outlier"}

        self._window.append(inst_kmh)

        if len(self._window) < 4:
            self._prev_kalman_z = smoothed_z
            self._prev_t = timestamp
            return out

        arr = np.array(self._window, dtype=float)
        med = float(np.median(arr))
        mad = float(np.median(np.abs(arr - med)))
        
        if mad <= 1e-3:
            robust = med
        else:
            keep = arr[np.abs(arr - med) <= 2.5 * mad]
            robust = float(np.mean(keep)) if len(keep) else med

        alpha = 0.35
        final_smoothed_speed = robust if self._prev_speed is None else (alpha * robust + (1 - alpha) * self._prev_speed)
        
        if self._prev_speed is not None:
            max_delta = 8.0 * 3.6 * dt  # 8 m/s²
            if final_smoothed_speed > self._prev_speed + max_delta:
                final_smoothed_speed = self._prev_speed + max_delta
            elif final_smoothed_speed < self._prev_speed - max_delta:
                final_smoothed_speed = self._prev_speed - max_delta

        self._prev_speed = final_smoothed_speed
        self._prev_kalman_z = smoothed_z
        self._prev_t = timestamp

        return {
            "distance_m": round(smoothed_z, 2),
            "speed_kmh": round(max(0.0, min(final_smoothed_speed, 180.0)), 1),
            "valid": True,
            "reason": "ok",
        }

    def reset(self):
        """Réinitialise l'estimateur."""
        self._prev_t = None
        self._prev_kalman_z = None
        self._prev_speed = None
        self._window.clear()
        self._last_raw_distance = None
        self.is_kalman_initialized = False