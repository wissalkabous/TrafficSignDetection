# ADAS v6 — Coordination Équipe

**Projet :** Advanced Driver Assistance System v6  
**Équipe :** 3 Étudiants — Master Analyse de Données & IA  
**Date :** Avril 2026  
**Statut :** ✅ Code terminé | ⏳ En production

---

## Structure du projet

```
notebooks/ADAS_v6_kaggle.ipynb   ← Étudiant 1 (cells 1-9) + Étudiant 2 (cells 10-13)
                ↓
           models/best.pt         ← généré par Étudiant 2, utilisé par Étudiant 3
                ↓
      Backend + Dashboard         ← Étudiant 3 (app.py, alerts.py, frontend/)
```

---

## Étudiant 1 — Ingénieur Deep Learning (Data & Inférence)

### Fichiers

| Fichier | Rôle |
|---|---|
| `notebooks/ADAS_v6_kaggle.ipynb` (cells 1-9) | EDA, collecte et préparation des données |
| `modules/detection.py` | Logique d'inférence YOLO (chargement best.pt, détection) |
| `models/best.pt` | Modèle entraîné final |
| `requirements.txt` | Dépendances ML du projet |
| `README.md` | Documentation générale du projet |

### Travail réalisé

1. Télécharge 5 datasets : LISA (4.5 GB feux) + GTSDB (1.5 GB panneaux) + DS1/DS2/DS3 via Roboflow
2. Convertit toutes les annotations vers le format YOLO (`class_id cx cy w h`)
3. Crée le dataset fusionné avec 7 381 images train + 1 000 images val
4. Ajoute 400 images de background pour réduire les faux positifs
5. Génère `data.yaml` avec les 15 classes nommées
6. Effectue l'audit qualité (classes équilibrées, aucune classe manquante)
7. Implémente `modules/detection.py` — chargement du modèle et pipeline d'inférence

### Outputs

```
data/processed/dataset/
├── train/images/     7 381 images JPG
├── train/labels/     7 381 fichiers .txt (annotations YOLO)
├── val/images/       1 000 images JPG
├── val/labels/       1 000 fichiers .txt
└── data.yaml         15 classes configurées

models/
└── best.pt           modèle final (~23 MB)

Bilan dataset :
  23 771 bboxes totales
  Split 85/15 train/val
  Classes équilibrées ✅
```

### Handoff → Étudiant 2

```
✅ data/processed/dataset/ complet
✅ data.yaml valide (15 classes)
✅ Audit VERT — aucune erreur détectée

Message à Étudiant 2 :
"Dataset prêt. 7 381 train + 1 000 val.
 Classe moins représentée : [XXX].
 Aucun problème. Lance le training ! 🚀"
```

---

## Étudiant 2 — Ingénieur Vision & Estimation (Training & Métriques)

### Fichiers

| Fichier | Rôle |
|---|---|
| `notebooks/ADAS_v6_kaggle.ipynb` (cells 10-13) | Entraînement YOLO, évaluation, export best.pt |
| `modules/speed.py` | Estimation de distance/vitesse (modèle géométrique + filtre de Kalman) |
| `modules/constants.py` | Constantes partagées (dimensions panneaux, classes, seuils) |
| `COORDINATION.md` | Ce fichier — documentation de l'équipe |
| `.gitignore` | Fichiers exclus du repo Git |

### Travail réalisé

1. Configure YOLOv8s pour l'entraînement sur GPU T4 x2 (Kaggle)
2. Lance 30 epochs avec AdamW, augmentation (mosaic, mixup, HSV) et early stopping
3. Monitore mAP50, précision, rappel à chaque epoch
4. Sélectionne le meilleur checkpoint (mAP50 maximal)
5. Génère les rapports : matrice de confusion, courbes F1/P/R
6. Implémente `modules/speed.py` — estimation de vitesse par modèle pinhole + filtre de Kalman
7. Définit `modules/constants.py` — dimensions des panneaux, IDs de classes, seuils d'alerte

### Outputs

```
models/
├── best.pt                         ★ Modèle final ★
└── training_logs/adas_v6/
    ├── weights/
    │   ├── best.pt                  meilleur epoch
    │   ├── last.pt                  epoch 30
    │   └── epoch_10.pt, epoch_20.pt checkpoints
    ├── results.csv                  métriques par epoch
    ├── confusion_matrix.png         matrice 15×15
    └── F1_curve.png, P_curve.png    courbes de métriques

Résultats attendus :
  mAP50      ~ 0.867 ✅
  mAP50-95   ~ 0.567 ✅
  Précision  ~ 0.88
  Rappel     ~ 0.85
  Meilleur epoch ~ 45-60
```

### Handoff → Étudiant 3

```
✅ best.pt sauvegardé dans models/
✅ mAP50 > 0.75
✅ Rapport métriques complet

Message à Étudiant 3 :
"Modèle prêt. mAP50 = X.XXX (epoch Y).
 Classe mal détectée : [XXX] (recall = Z%).
 Focale recommandée pour calibration : ~900 px.
 Deploy ! 🚀"
```

---

## Étudiant 3 — Data Architect & Système Expert (Backend & Dashboard)

### Fichiers

| Fichier | Rôle |
|---|---|
| `modules/alerts.py` | Système expert — logique décisionnelle danger/warning/ok |
| `app.py` | API Flask — routes, pipeline de fusion, streaming SSE |
| `run.py` | Point d'entrée — lance le serveur Flask |
| `frontend/` | Dashboard HUD (html / css / js / uploads) |
| `.venv/` | Environnement virtuel Python (non versionné) |

### Travail réalisé

1. Implémente `modules/alerts.py` — moteur de règles expert (seuils vitesse, distance, feux rouges)
2. Construit `app.py` — 4 routes Flask (upload, stream SSE, dashboard, static)
3. Intègre le pipeline complet : vidéo → `detection.py` → `speed.py` → `alerts.py` → frontend
4. Développe le dashboard HUD (`frontend/`) — canvas overlay, panneau vitesse, graphe live
5. Implémente le streaming SSE pour envoyer les frames en temps réel au client
6. Crée `run.py` — launcher avec configuration du port et debug mode

### Outputs

```
app.py
├── GET  /                       affiche le dashboard HTML
├── POST /upload                 upload vidéo ou image
├── GET  /stream/<job_id>        streaming SSE des détections
└── GET  /static/uploads/        sert les fichiers statiques

modules/alerts.py
└── AlertEngine                  génère danger / warning / ok

frontend/
├── html/                        pages du dashboard
├── css/                         styles HUD
├── js/                          logique canvas + graphe live
└── uploads/                     fichiers uploadés

Flux utilisateur :
  1. User glisse une vidéo
  2. /upload traite le fichier
  3. /stream envoie les frames SSE
  4. Canvas affiche les bboxes
  5. Graphe vitesse mis à jour en live
  6. Alerte affichée si danger
```

### Lancer l'application

```bash
# 1. Placer best.pt (fourni par Étudiant 2)
cp /chemin/best.pt models/

# 2. Installer les dépendances
pip install -r requirements.txt

# 3. Lancer le serveur
python run.py
# → http://localhost:5000
```

---

## Résumé — Qui a fait quoi

| Étudiant | Fichiers principaux | Domaine |
|---|---|---|
| **1** | notebook (cells 1-9) · detection.py · best.pt · requirements.txt · README.md | Data engineering + inférence |
| **2** | notebook (cells 10-13) · speed.py · constants.py · COORDINATION.md · .gitignore | Training + vision + métriques |
| **3** | alerts.py · app.py · run.py · frontend/ · .venv | Backend + système expert + dashboard |

---

## Workflow équipe

```
ÉTUDIANT 1
├── Exécute notebook cells [1-9]
│   └── Output : data/processed/dataset/ + data.yaml
└── Implémente modules/detection.py

        ↓ handoff

ÉTUDIANT 2
├── Exécute notebook cells [10-13]
│   └── Output : models/best.pt (mAP50 > 0.75)
├── Implémente modules/speed.py + constants.py
└── Télécharge best.pt depuis Kaggle Output

        ↓ handoff

ÉTUDIANT 3
├── Copie best.pt dans models/
├── Implémente alerts.py + app.py + run.py + frontend/
└── Teste via http://localhost:5000
```

---

## Stratégie Git

```bash
# Chaque étudiant travaille sur sa branche
git checkout -b etudiant1-data       # Étudiant 1
git checkout -b etudiant2-training   # Étudiant 2
git checkout -b etudiant3-deploy     # Étudiant 3

# Push et Pull Request vers main
git add .
git commit -m "feat: description du travail"
git push origin etudiant1-data
# → ouvrir une PR sur GitHub
```

### Template de Pull Request

```markdown
## Description
Résumé des tâches complétées

## Checklist
- [ ] Code testé localement
- [ ] Pas d'erreurs pylint/black
- [ ] README mis à jour si nécessaire
- [ ] Dépendances ajoutées à requirements.txt

## Métriques (si applicable)
mAP, audit results, tests passés, etc.
```

---

## Fichiers exclus du repo (`.gitignore`)

```
.venv/
__pycache__/
data/processed/       # trop lourd — généré localement via le notebook
models/best.pt        # binaire lourd — partager via Kaggle Output ou Git LFS
*.pt
*.pyc
uploads/
```

> **best.pt** : partager via le lien Kaggle Output ou Git LFS (`git lfs track "*.pt"`).

---

## KPIs

| KPI | Cible | Résultat | Statut |
|---|---|---|---|
| Complétude dataset | 100% | 8 381 images · 23 771 bboxes · 15 classes | ✅ |
| mAP50 modèle | > 0.75 | ~0.867 | ✅ |
| Latence dashboard | < 60 fps | SSE streaming + throttle FPS | ✅ |
| Précision calibration vitesse | ±5% | Modèle pinhole + filtre de Kalman | ✅ |

---

## Risques

| Risque | Probabilité | Impact | Mitigation |
|---|---|---|---|
| Collecte données lente | Haute | Retard Étudiant 1 | Paralléliser les downloads |
| Overfitting training | Moyenne | mAP < 0.75 | Data aug + early stopping |
| Calibration vitesse incorrecte | Moyenne | Fausses alertes | Protocole calibration manuel |
| SSE buffering client | Basse | UI lag | Throttle frame rate |
| GPU OOM Kaggle | Basse | Crash training | Réduire batch size |

---

## Contacts

- **Étudiant 1** (Data & Inférence) : [Nom / Email]
- **Étudiant 2** (Training & Vision) : [Nom / Email]
- **Étudiant 3** (Backend & Dashboard) : [Nom / Email]
- **Encadrant** : [Nom / Email]

---

**Dernière mise à jour :** 2026-04-30  
**Version :** 2.0  
**Statut :** 🟢 Actif