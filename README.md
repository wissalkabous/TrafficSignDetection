# 🚗 ADAS v6 — Advanced Driver Assistance System

![Version](https://img.shields.io/badge/version-6.0-blue)
![Team](https://img.shields.io/badge/team-3%20students-green)
![Status](https://img.shields.io/badge/status-production--ready-brightgreen)
![Python](https://img.shields.io/badge/python-3.9%2B-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## 🎯 Approche: **Notebook-Centric**

```
📔 notebooks/ADAS_v6_kaggle.ipynb
      ↓ Étudiant 1 (cells 1-9) — Dataset & Preprocessing
      ├─ Télécharge datasets (LISA, GTSDB, DS1/DS2/DS3)
      ├─ Convertit annotations → format YOLO
      ├─ Crée data/processed/dataset/ (7381 train + 1000 val)
      └─ Génère data.yaml (15 classes)

      ↓ Étudiant 2 (cells 10-13) — Training & Évaluation
      ├─ Entraîne YOLOv8s sur GPU T4 x2 (Kaggle)
      ├─ Monitore mAP50, précision, rappel
      └─ Génère models/best.pt (mAP50 ~ 0.867)
```

> **Note:** `data/raw/` et `data/processed/` ne sont **pas committés** sur Git — trop lourds.  
> Seul le notebook est la source. `best.pt` se partage via Kaggle Output.

---

```
Collecte & Preprocessing     Training YOLO v8s           Déploiement Web
(LISA, GTSDB, DS1/2/3)      (30 epochs, mAP50~0.867)    (Flask + SSE + Dashboard)
        ↓                            ↓                            ↓
   Étudiant 1          →       Étudiant 2          →       Étudiant 3
```

---

## 🎯 Fonctionnalités Principales

### ✅ Détection Temps Réel
- **15 classes** panneaux routiers + feux tricolores
- Modèle **YOLOv8s** optimisé (mAP50 ~ 0.867)
- **SSE streaming** vidéo frame-par-frame

### 🚗 Tableau de Bord HUD
- Interface type **dashcam automobile**
- Affichage vitesse calibrée (estimation géométrique)
- Alertes dynamiques (danger / warning / ok)
- Légende 15 classes interactive

### 📍 Calibration Vitesse
- **Modèle pinhole** + **filtre de Kalman** (modules/speed.py)
- Focale caméra + largeur panneau → vitesse km/h
- Filtrage outliers + lissage EMA
- Retourne `None` si calibration insuffisante

### ⚠️ Système Alertes ADAS
- **Danger:** Feu rouge, STOP, Entrée interdite
- **Warning:** Dépassement interdit, excès de vitesse
- **Safe:** Feu vert, vitesse correcte
- **Info:** Vitesse non calibrée

---

## 📊 Architecture

```
Frontend (frontend/html + css + js)
    ↓↑ SSE streaming

Backend (Flask — app.py)
    ├─ POST /upload      (traite fichier vidéo/image)
    ├─ GET  /stream      (SSE frame-by-frame)
    └─ GET  /            (dashboard HUD)
    ↓
Modules
    ├─ modules/detection.py     (YOLO v8s + best.pt — inférence)
    ├─ modules/speed.py         (estimation vitesse + Kalman)
    ├─ modules/alerts.py        (système expert — logique alertes)
    └─ modules/constants.py     (classes, seuils, dimensions panneaux)
```

---

## 🚀 Démarrage Rapide

### **1. Cloner le repo**
```bash
git clone https://github.com/wissalkabous/TrafficSignDetection.git
cd TrafficSignDetection
```

### **2. Créer l'environnement virtuel**
```bash
python -m venv .venv

# Windows
.venv\Scripts\activate

# Mac/Linux
source .venv/bin/activate
```

### **3. Installer les dépendances**
```bash
pip install -r requirements.txt
```

### **4. Placer le modèle**
```bash
# Télécharger best.pt depuis Kaggle Output (fourni par Étudiant 2)
cp /chemin/best.pt models/
```

### **5. Lancer l'application**
```bash
python run.py
# → http://localhost:5000
```

### **6. Utiliser le dashboard**
- Glisser une vidéo ou image sur la zone de dépôt
- Cliquer **"Analyser"**
- Observer les détections + vitesse + alertes en live

---

## 📁 Structure du Projet

```
TrafficSignDetection/
│
├── 📄 README.md                  ← Vous êtes ici (Étudiant 1)
├── 📄 COORDINATION.md            (Étudiant 2 — coordination équipe)
├── 📄 requirements.txt           (Étudiant 1 — dépendances ML)
├── 📄 .gitignore                 (Étudiant 2)
│
├── 📁 notebooks/
│   └── ADAS_v6_kaggle.ipynb     (Étudiant 1 cells 1-9 + Étudiant 2 cells 10-13)
│
├── 📁 models/
│   └── best.pt                  ★ Modèle final — généré par Étudiant 2 (non versionné)
│
├── 📁 modules/
│   ├── detection.py             (Étudiant 1 — inférence YOLO)
│   ├── speed.py                 (Étudiant 2 — estimation vitesse + Kalman)
│   ├── alerts.py                (Étudiant 3 — système expert alertes)
│   └── constants.py             (Étudiant 2 — classes, seuils, dimensions)
│
├── 📁 frontend/
│   ├── html/                    (Étudiant 3 — pages dashboard)
│   ├── css/                     (Étudiant 3 — styles HUD)
│   ├── js/                      (Étudiant 3 — canvas + graphe live)
│   └── uploads/                 (fichiers uploadés — non versionnés)
│
├── 🐍 app.py                     (Étudiant 3 — API Flask + SSE)
└── 🐍 run.py                     (Étudiant 3 — launcher)
```

> **Fichiers exclus du repo:** `.venv/`, `__pycache__/`, `data/processed/`, `models/best.pt`, `frontend/uploads/`

---

## 👥 Équipe & Responsabilités

### **Étudiant 1 — Ingénieur Deep Learning**
**Fichiers:** `notebooks/` (cells 1-9) · `modules/detection.py` · `requirements.txt` · `README.md`

- ✅ Collecte 5 datasets (LISA, GTSDB, DS1/DS2/DS3)
- ✅ Conversion annotations → format YOLO (15 classes)
- ✅ Création dataset fusionné (7 381 train + 1 000 val + 400 backgrounds)
- ✅ Audit qualité (classes équilibrées, aucune erreur)
- ✅ Implémentation pipeline d'inférence (`detection.py`)

---

### **Étudiant 2 — Ingénieur Vision & Estimation**
**Fichiers:** `notebooks/` (cells 10-13) · `modules/speed.py` · `modules/constants.py` · `COORDINATION.md` · `.gitignore`

- ✅ Entraînement YOLOv8s — 30 epochs sur GPU T4 x2 (Kaggle)
- ✅ Monitoring mAP50, précision, rappel par epoch
- ✅ Sélection best.pt (mAP50 ~ 0.867)
- ✅ Génération rapports (matrice de confusion, courbes F1/P/R)
- ✅ Implémentation estimation vitesse (modèle pinhole + filtre de Kalman)
- ✅ Définition des constantes partagées (`constants.py`)

---

### **Étudiant 3 — Data Architect & Système Expert**
**Fichiers:** `modules/alerts.py` · `app.py` · `run.py` · `frontend/`

- ✅ API Flask avec SSE streaming (4 routes)
- ✅ Pipeline fusion : vidéo → détection → vitesse → alertes → dashboard
- ✅ Système expert AlertEngine (danger / warning / safe / info)
- ✅ Dashboard HUD (canvas overlay, graphe vitesse live, liste détections)
- ✅ Gestion uploads et cleanup automatique (fichiers > 1h supprimés)

---

## 📊 Performances

| Métrique | Valeur |
|---|---|
| **Modèle** | YOLOv8s (~23 MB) |
| **mAP50** | ~0.867 ✅ |
| **mAP50-95** | ~0.567 ✅ |
| **Précision** | ~0.88 |
| **Rappel** | ~0.85 |
| **FPS Détection** | ~28.5 FPS (GPU T4) |
| **Latence SSE** | < 100ms |
| **Classes** | 15 (panneaux routiers français) |
| **Dataset Train** | 7 381 images · 20 271 bboxes |
| **Dataset Val** | 1 000 images · 2 500 bboxes |

---

## 🏷️ Classes Détectées

```python
CLASS_NAMES = [
    'vitesse_20', 'vitesse_30', 'vitesse_50', 'vitesse_60',
    'vitesse_70', 'vitesse_80', 'vitesse_100', 'vitesse_120',
    'depassement_interdit', 'stop', 'sens_interdit', 'entree_interdite',
    'feu_vert', 'feu_rouge', 'feu_orange'
]
```

---

## 🛠️ Technologies

```
Backend:
  - Flask 2.3+          (API REST + SSE)
  - Ultralytics YOLOv8  (détection)
  - OpenCV 4.8+         (traitement vidéo/image)
  - NumPy + Pandas      (data processing)

Frontend:
  - HTML5 + CSS3        (dashboard HUD responsive)
  - JavaScript ES6+     (client SSE + canvas)
  - Chart.js            (graphique vitesse live)

ML / Training:
  - YOLOv8s             (modèle de détection)
  - Kaggle GPU T4 x2    (environnement d'entraînement)
  - PyTorch + CUDA      (deep learning)

Infrastructure:
  - Python 3.9+
  - Git + GitHub        (versioning)
```

---

## ⚠️ Notes Importantes

1. **`best.pt` obligatoire** — À placer dans `models/` avant de lancer l'app
2. **Vitesse calibrée** — Optionnelle, retourne `None` si non calibrée
3. **SSE Throttling** — Limité à ~2× la vitesse réelle de la vidéo
4. **GPU Memory** — ~4.7 GB pour détection + streaming
5. **Cleanup automatique** — Fichiers uploads > 1h supprimés automatiquement
6. **`.venv/` non versionné** — Chaque développeur recrée son environnement via `requirements.txt`

---

## 🔗 Ressources

- [YOLOv8 Documentation](https://docs.ultralytics.com/models/yolov8/)
- [Flask Documentation](https://flask.palletsprojects.com/)
- [OpenCV Python](https://opencv-python-tutroals.readthedocs.io/)
- [Kaggle — Notebook ADAS v6](https://www.kaggle.com/)

---

## 🤝 Contribution & Git

```bash
# Chaque étudiant travaille sur sa branche
git checkout -b etudiant1-data       # Étudiant 1
git checkout -b etudiant2-training   # Étudiant 2
git checkout -b etudiant3-deploy     # Étudiant 3

# Push + Pull Request vers main
git push origin <branche>
```

**Voir [COORDINATION.md](COORDINATION.md) pour le détail complet.**

---

## 🎓 Informations Académiques

**Formation:** Master Analyse de Données & IA  
**Équipe:** 3 Étudiants  
**Date:** Avril 2026  
**Encadrant:** [Nom Professeur]

---

## ✅ Statut du Projet

- ✅ Dataset pipeline complet (7 381 images · 15 classes)
- ✅ Modèle entraîné (mAP50 ~ 0.867)
- ✅ Backend API déployé (Flask + SSE)
- ✅ Dashboard HUD opérationnel
- 🟢 **Production Ready**

---

**Dernière mise à jour:** 2026-04-30 | **Version:** 6.0 | **Statut:** 🟢 Actif
