# MangaLakay — Enrichissement Catalogue Beta Design
**Date :** 9 mars 2026
**Statut :** Approuvé
**Auteur :** MHC32 + Chef de Projet

---

## Objectif

Enrichir le catalogue MangaLakay avant distribution beta en exploitant pleinement l'API MangaDex :
manhwa coréens, manhua chinois, BD françaises, webtoons. Tout depuis MangaDex — pas de nouvelle dépendance.

---

## Données MangaDex disponibles (validées par audit)

| Type | Paramètre API | Total |
|------|--------------|-------|
| Manga japonais | `originalLanguage[]=ja` | ~40 000+ |
| Manhwa coréens | `originalLanguage[]=ko` | 7 290 |
| Manhua chinois | `originalLanguage[]=zh` | 5 871 |
| BD françaises | `originalLanguage[]=fr` | 142 |
| Webtoon (Long Strip) | `includedTags[]=3e2b8dae` | variable |

---

## Section 1 — Sélecteur de type dans ExploreScreen

### Design
Un sélecteur horizontal de 6 chips en haut d'ExploreScreen :
`Tout | Manga 🇯🇵 | Manhwa 🇰🇷 | Manhua 🇨🇳 | BD FR 🇫🇷 | Webtoon 📜`

### Comportement
- Chip sélectionné → recharge la liste avec les bons paramètres MangaDex
- Type persiste pendant la session
- "Tout" = comportement actuel (pas de filtre originalLanguage)

### Mapping paramètres
```typescript
const TYPE_PARAMS = {
  all:     {},
  manga:   { originalLanguage: ['ja'] },
  manhwa:  { originalLanguage: ['ko'] },
  manhua:  { originalLanguage: ['zh'] },
  bdfr:    { originalLanguage: ['fr'] },
  webtoon: { includedTags: ['3e2b8dae-350e-4ab8-a8ce-016e844b9f0d'] },
} as const;
```

### Fichiers
- Modify: `src/screens/explore/ExploreScreen.tsx`

---

## Section 2 — Badge origine sur les cartes manga

### Design
Deux éléments visuels sur chaque carte :

**A — Flag emoji overlay** dans le coin supérieur droit de la couverture
- Petit carré semi-transparent `20×20` avec fond `rgba(0,0,0,0.5)`
- Mapping : `ja→🇯🇵 | ko→🇰🇷 | zh→🇨🇳 | fr→🇫🇷 | autres→🌐`

**B — Chip texte** sous le titre (sauf pour le manga japonais = défaut)
- `MANHWA` (couleur teal) | `MANHUA` (couleur mango) | `BD FR` (couleur orange) | `WEBTOON` (couleur tealBlue)
- Manga japonais = aucun chip (c'est le type par défaut)

### Fichiers
- Modify: `src/components/manga/MangaCardVertical.tsx`
- Modify: `src/components/manga/MangaCardHorizontal.tsx`

### Type Manga
`originalLanguage: string` est déjà présent dans le type `Manga` — aucun changement de type nécessaire.

---

## Section 3 — Mode Webtoon dans le Reader

### Design
**Détection automatique :**
- `originalLanguage === 'ko' || originalLanguage === 'zh'` → mode webtoon
- Ou manga avec tag Long Strip `3e2b8dae` → mode webtoon
- Override manuel possible dans les contrôles du Reader

**Mode webtoon :**
- `horizontal={false}` sur FlatList (scroll vertical)
- `pagingEnabled={false}` (défilement libre, pas page par page)
- Images en pleine largeur enchaînées sans espace

**Toast d'information :**
- Première ouverture d'un manhwa : toast `"📜 Mode Webtoon activé — scroll vers le bas"` 3 secondes
- Clé MMKV `user:webtoonToastShown` pour ne montrer qu'une seule fois

**Type ReadingDirection étendu :**
```typescript
type ReadingDirection = 'ltr' | 'rtl' | 'webtoon'; // ← ajouter 'webtoon'
```

**Passage de originalLanguage dans la navigation :**
`MangaDetailScreen` passe `originalLanguage` en params quand il navigue vers `Reader`.

### Fichiers
- Modify: `src/types/mangadex.types.ts` (ReadingDirection)
- Modify: `src/stores/reader.store.ts` (init + logique webtoon)
- Modify: `src/screens/manga/ReaderScreen.tsx` (FlatList vertical + toast)
- Modify: `src/screens/manga/MangaDetailScreen.tsx` (passer originalLanguage aux params Reader)
- Modify: `src/types/navigation.types.ts` (ajouter originalLanguage dans Reader params)

---

## Ordre d'implémentation recommandé

1. Badge origine (MangaCardVertical + Horizontal) — impact visuel immédiat, indépendant
2. Sélecteur de type ExploreScreen — core feature catalogue
3. Mode Webtoon Reader — le plus complexe, nécessite les autres

---

## Critères de succès

- [ ] ExploreScreen affiche Solo Leveling dans l'onglet Manhwa
- [ ] ExploreScreen affiche Radiant dans l'onglet BD FR
- [ ] Badge 🇰🇷 visible sur les cartes manhwa partout dans l'app
- [ ] Ouvrir un chapitre de Solo Leveling → scroll vertical automatique
- [ ] Toast "Mode Webtoon" apparaît la première fois
- [ ] Toggle manuel dans le Reader permet de changer de mode

---

*Design approuvé par MHC32 — 9 mars 2026*
