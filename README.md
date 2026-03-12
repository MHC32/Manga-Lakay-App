<div align="center">

<img src="MangaLakayApp/assets/bootsplash/logo@2x.png" width="120" height="120" alt="MangaLakay Logo" />

# MangaLakay 🌺

### *Manga lakay ou — Le manga chez toi*

**La première application manga faite par des otakus haïtiens, pour les otakus haïtiens. Partout dans le monde.**

[![React Native](https://img.shields.io/badge/React%20Native-0.84-61DAFB?logo=react&logoColor=white)](https://reactnative.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore%20%2B%20Auth-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com)
[![MangaDex](https://img.shields.io/badge/MangaDex-API%20v5-FF6740)](https://api.mangadex.org)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen)](CONTRIBUTING.md)

[Fonctionnalités](#-fonctionnalités) · [Stack technique](#-stack-technique) · [Démarrage rapide](#-démarrage-rapide) · [Contribuer](#-contribuer) · [Roadmap](#-roadmap)

---

</div>

## 🎯 Vision

MangaLakay n'est pas juste une autre app de lecture manga. C'est une **plateforme communautaire** construite pour la diaspora haïtienne et les francophones qui aiment le manga, le manhwa, le manhua, et les webtoons.

Notre mission : donner aux otakus haïtiens un espace qui leur ressemble — avec du contenu en français, un classement communautaire, et une expérience mobile pensée pour les connexions lentes.

---

## ✨ Fonctionnalités

### Catalogue enrichi
- 📚 **40 000+ mangas** japonais via MangaDex API v5
- 🇰🇷 **7 290+ manhwas** coréens (Solo Leveling, Tower of God, Omniscient Reader...)
- 🇨🇳 **5 871+ manhua** chinois
- 🇫🇷 **BD françaises** (Radiant, Leviathan, Dreamland...)
- 📜 **Webtoons** en scroll vertical natif
- 🔗 Chapitres **Manga Plus** (Shueisha) avec lien externe

### Lecture immersive
- 🔄 Mode **RTL** (manga japonais) et **LTR** automatiques
- 📜 Mode **Webtoon scroll vertical** détecté automatiquement selon l'origine
- 💾 Cache intelligent **MMKV** (lecture hors-ligne partielle)
- 🌐 Priorité chapitres **FR → EN** avec badge langue visible

### Communauté haïtienne
- 🏆 **Tablo Dònen** — classement communautaire des meilleurs mangas
- ⭐ Notes de 1 à 10 par les membres MangaLakay
- 👤 Profils publics avec bibliothèque partageables
- 🌺 Badges et niveaux de lecture

### Découverte intelligente
- 🔍 Recherche avec filtres avancés (genre, statut, démographie, langue)
- 🗂️ Explorer par type : Manga / Manhwa / Manhua / BD FR / Webtoon
- 📖 Historique des 10 dernières recherches (local)
- 🎲 Manga aléatoire pour découvrir de nouvelles pépites

---

## 🛠 Stack technique

```
┌─────────────────────────────────────────────────────────┐
│                    APPLICATION                          │
│  React Native 0.84 (sans Expo) · TypeScript · Zustand   │
├─────────────────────────────────────────────────────────┤
│                    SERVICES                             │
│  MangaDex API v5 (contenu)  │  Firebase (utilisateurs)  │
├─────────────────────────────────────────────────────────┤
│                    CACHE & PERF                         │
│  react-native-mmkv  │  react-native-fast-image          │
│  react-native-bootsplash  │  Reanimated 3               │
└─────────────────────────────────────────────────────────┘
```

| Couche | Technologie |
|--------|-------------|
| **Framework** | React Native 0.84 (pure, sans Expo) |
| **Langage** | TypeScript strict |
| **State** | Zustand (remplace Redux) |
| **Cache local** | react-native-mmkv (synchrone, performant) |
| **Backend contenu** | MangaDex API v5 (gratuit, public) |
| **Backend utilisateurs** | Firebase Firestore + Auth |
| **Navigation** | React Navigation v6 |
| **Images** | react-native-fast-image |
| **Animations** | Reanimated 3 (UI thread) |
| **Splash screen** | react-native-bootsplash |

### Architecture

```
MangaDex API → Source de vérité pour tout le contenu manga
Firebase     → Données utilisateur uniquement (profil, bibliothèque, notes)
MMKV         → Cache device-side avec TTL (TTL manga: 6h, chapitres: 1h)
```

> **Règle d'or :** Les métadonnées manga ne sont JAMAIS stockées en Firebase. On stocke uniquement les `mangaId` UUID MangaDex.

---

## 🚀 Démarrage rapide

### Prérequis

- Node.js 18+
- React Native CLI
- Android Studio (pour Android) ou Xcode (pour iOS)
- JDK 17

### Installation

```bash
# 1. Cloner le repo
git clone https://github.com/MHC32/Manga-Lakay-App.git
cd Manga-Lakay-App/MangaLakayApp

# 2. Installer les dépendances
npm install

# 3. Configurer Firebase
# Copier le fichier d'exemple et remplir avec vos clés Firebase
cp .env.example .env.development

# 4. Android
npx react-native run-android

# 5. iOS
cd ios && pod install && cd ..
npx react-native run-ios
```

### Configuration Firebase

1. Créer un projet Firebase sur [console.firebase.google.com](https://console.firebase.google.com)
2. Activer **Firestore** et **Authentication** (Email + Google)
3. Télécharger `google-services.json` → `android/app/`
4. Télécharger `GoogleService-Info.plist` → `ios/MangaLakayApp/`
5. Déployer les règles Firestore : `firebase deploy --only firestore:rules`

### Variables d'environnement

```bash
# .env.development
MANGADEX_BASE_URL=https://api.mangadex.org
FIREBASE_PROJECT_ID=votre-projet-dev
```

---

## 📁 Structure du projet

```
MangaLakayApp/
├── src/
│   ├── app/navigation/     # Navigateurs (Root, App, Auth)
│   ├── screens/            # Écrans (Home, Explore, Reader, Library...)
│   ├── components/         # Composants réutilisables (ui/, manga/, layout/)
│   ├── services/           # Services API (mangadex/, firebase/, cache/)
│   ├── stores/             # Zustand stores (auth, library, reader, search)
│   ├── types/              # Types TypeScript globaux
│   ├── constants/          # Thème, config, API
│   └── utils/              # Helpers (locale, date, image, sanitize)
├── docs/
│   ├── 01-PRD.md           # Product Requirements Document
│   ├── 02-user-stories.md  # User stories avec acceptance criteria
│   ├── 03-business-rules.md# Règles métier
│   ├── 07-tech-spec.md     # Spécification technique complète
│   └── plans/              # Plans d'implémentation par feature
├── android/                # Config Android native
└── ios/                    # Config iOS native
```

---

## 🤝 Contribuer

MangaLakay est un projet open source et communautaire. **Toute contribution est la bienvenue** — que tu sois développeur React Native expérimenté ou débutant, designer UI/UX, ou simplement un otaku avec des idées.

### Comment contribuer

1. **Fork** le repo
2. **Clone** ton fork : `git clone https://github.com/TON-USERNAME/Manga-Lakay-App.git`
3. **Crée une branche** : `git checkout -b feat/ma-super-feature`
4. **Code** ta feature ou ton fix
5. **Commit** : `git commit -m "feat: description claire"`
6. **Push** : `git push origin feat/ma-super-feature`
7. **Ouvre une PR** avec une description détaillée

### Conventions

- Commits en [Conventional Commits](https://www.conventionalcommits.org/) : `feat:`, `fix:`, `chore:`, `docs:`
- TypeScript strict — pas de `any` sauf exceptions justifiées
- Composants en PascalCase, services en camelCase
- Lire `docs/07-tech-spec.md` avant de toucher aux services

### Domaines où on a besoin d'aide

| Domaine | Description |
|---------|-------------|
| 🎨 **UI/UX** | Améliorer le design, animations, accessibilité |
| 🇭🇹 **Contenu créole** | Traductions, textes en haïtien |
| ⚡ **Performance** | Optimisations pour Android bas de gamme |
| 🧪 **Tests** | Ajouter des tests unitaires et d'intégration |
| 🔧 **Cloud Functions** | Implémenter les Cloud Functions Firebase |
| 🌐 **i18n** | Support multilingue (EN, ES, PT) |
| 📱 **iOS** | Tests et fixes iOS (le focus actuel est Android) |

### Code of Conduct

Soyez respectueux, inclusifs, et constructifs. Ce projet est pour la communauté haïtienne — gardons cet esprit **lakay** dans nos échanges.

---

## 🗺 Roadmap

### ✅ Beta (en cours)
- [x] Lecture manga, manhwa, manhua, webtoon
- [x] Mode scroll vertical automatique (manhwa/manhua)
- [x] Bibliothèque personnelle avec 4 statuts
- [x] Classement communautaire (Tablo Dònen)
- [x] Profils publics partageables
- [x] Filtres langue FR dans la recherche
- [x] Chapitres Manga Plus avec badge externe
- [x] Cache MMKV offline-first
- [x] BootSplash + icône app

### 🔄 V1.1 (post-beta)
- [ ] Cloud Functions Firebase (classement temps réel)
- [ ] Notifications push (nouveaux chapitres)
- [ ] Filtres période dans le classement (semaine/mois)
- [ ] Mode sombre/clair
- [ ] Profil public enrichi (badges, streaks)

### 🔮 V2 (futur)
- [ ] Light Novels
- [ ] Mangas indie haïtiens (créateurs locaux)
- [ ] Système de badges créole (Lektè Agogo, Otaku Potoprens...)
- [ ] Leaderboard haïtien (Tablo Otaku Lakay)
- [ ] Migration Supabase si > 500 users actifs/jour

---

## 📄 Documentation

| Document | Description |
|----------|-------------|
| [PRD](docs/01-PRD.md) | Product Requirements Document |
| [User Stories](docs/02-user-stories.md) | Stories avec acceptance criteria |
| [Business Rules](docs/03-business-rules.md) | Règles métier BR-001 → BR-020 |
| [Tech Spec](docs/07-tech-spec.md) | Architecture, modèles de données, endpoints |
| [MangaDex Audit](docs/mangadex-api-audit.md) | Comportements observés de l'API |

---

## 👥 Équipe

Construit avec ❤️ par **MHC32** et la communauté otaku haïtienne.

Tu veux rejoindre l'aventure ? Ouvre une issue, soumets une PR, ou contacte-nous.

---

## 📜 Licence

MIT © 2026 MHC32

---

<div align="center">

**Fait avec 🌺 pour Haïti et la diaspora haïtienne partout dans le monde**

*"Manga lakay ou"*

</div>
