# Catalogue Enrichissement — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enrichir le catalogue MangaLakay avec manhwa, manhua, BD françaises, webtoons — tout depuis MangaDex existant — et adapter le Reader pour le scroll vertical.

**Architecture:** 3 blocs indépendants. (1) Badges origine dans MangaCardVertical (flag overlay + chip texte). (2) Sélecteur de type dans ExploreScreen avec filtrage `originalLanguage` via MangaDex. (3) Mode webtoon dans Reader avec détection auto depuis `originalLanguage` passé en params de navigation.

**Tech Stack:** React Native · TypeScript · MangaDex API v5 (`originalLanguage[]`, `includedTags[]`) · Zustand · MMKV

---

## Fichiers de référence

- `src/constants/theme.ts` → `colors`, `spacing`, `fonts`, `radius`
- `src/types/mangadex.types.ts` → `Manga`, `ReadingDirection`, `ReaderSettings`
- `src/types/navigation.types.ts` → `SharedDetailParams` (Reader params)
- `src/components/manga/MangaCardVertical.tsx` → composant carte vertical
- `src/screens/explore/ExploreScreen.tsx` → écran explorer
- `src/screens/manga/ReaderScreen.tsx` → lecteur de chapitres
- `src/stores/reader.store.ts` → settings reader persistés MMKV

**Répertoire :** `/home/hantz/MHC32/MyProject/MangaLakay/MangaLakayApp`

**Tag MangaDex Long Strip :** `3e2b8dae-350e-4ab8-a8ce-016e844b9f0d`

---

# BLOC 1 — Badges origine sur les cartes manga

---

## Task 1 : Badge flag + chip dans MangaCardVertical

**Files:**
- Modify: `src/components/manga/MangaCardVertical.tsx`

**Contexte :**
Le composant reçoit `manga: Manga`. `manga.originalLanguage` est déjà disponible (`string`).
Il y a déjà un `statusBadge` en position `absolute` dans `coverContainer` — on suit le même pattern pour le flag.

**Étape 1 — Lire le fichier**
```bash
cat src/components/manga/MangaCardVertical.tsx
```

**Étape 2 — Ajouter les helpers de mapping en haut du fichier**

Après les imports, avant le composant, ajouter :
```typescript
const ORIGIN_FLAG: Record<string, string> = {
  ja: '🇯🇵', ko: '🇰🇷', zh: '🇨🇳', 'zh-hk': '🇨🇳', fr: '🇫🇷',
};

const ORIGIN_CHIP: Record<string, {label: string; color: string}> = {
  ko: {label: 'MANHWA', color: colors.teal},
  zh: {label: 'MANHUA', color: colors.mango},
  'zh-hk': {label: 'MANHUA', color: colors.mango},
  fr: {label: 'BD FR', color: colors.orange},
};
```

**Étape 3 — Ajouter le flag overlay dans coverContainer**

Dans le JSX, après le `statusBadge` existant, ajouter :
```tsx
{/* Flag origine */}
{ORIGIN_FLAG[manga.originalLanguage] && (
  <View style={styles.originFlag}>
    <Text style={styles.originFlagText}>
      {ORIGIN_FLAG[manga.originalLanguage] ?? '🌐'}
    </Text>
  </View>
)}
```

**Étape 4 — Ajouter le chip texte sous le titre**

Après `<Text style={styles.title}>`, ajouter :
```tsx
{ORIGIN_CHIP[manga.originalLanguage] && (
  <View style={[
    styles.originChip,
    {backgroundColor: `${ORIGIN_CHIP[manga.originalLanguage]!.color}22`},
  ]}>
    <Text style={[
      styles.originChipText,
      {color: ORIGIN_CHIP[manga.originalLanguage]!.color},
    ]}>
      {ORIGIN_CHIP[manga.originalLanguage]!.label}
    </Text>
  </View>
)}
```

**Étape 5 — Ajouter les styles**

Dans `StyleSheet.create({...})`, ajouter :
```typescript
originFlag: {
  position: 'absolute',
  top: 6,
  right: 6,
  backgroundColor: 'rgba(0,0,0,0.55)',
  borderRadius: 4,
  paddingHorizontal: 3,
  paddingVertical: 1,
},
originFlagText: {
  fontSize: 12,
},
originChip: {
  alignSelf: 'flex-start',
  borderRadius: 3,
  paddingHorizontal: 5,
  paddingVertical: 2,
  marginTop: 3,
},
originChipText: {
  fontSize: 9,
  fontWeight: '700',
  letterSpacing: 0.3,
},
```

**Étape 6 — Vérifier TypeScript**
```bash
npx tsc --noEmit 2>&1 | head -10
```

**Étape 7 — Commit**
```bash
git add src/components/manga/MangaCardVertical.tsx
git commit -m "feat: badge flag origine + chip type sur MangaCardVertical"
```

---

## Task 2 : Badge flag + chip dans MangaRowItem (ExploreScreen)

**Contexte :**
ExploreScreen utilise un composant local `MangaRowItem` (défini inline dans le fichier, pas dans `components/`). Il faut lui ajouter les mêmes badges.

**Files:**
- Modify: `src/screens/explore/ExploreScreen.tsx`

**Étape 1 — Trouver MangaRowItem dans ExploreScreen**
```bash
grep -n "MangaRowItem\|originalLanguage\|coverUrl" src/screens/explore/ExploreScreen.tsx | head -20
```

**Étape 2 — Ajouter ORIGIN_FLAG et ORIGIN_CHIP**

En haut d'ExploreScreen (après les imports), ajouter les mêmes constantes que Task 1 :
```typescript
const ORIGIN_FLAG: Record<string, string> = {
  ja: '🇯🇵', ko: '🇰🇷', zh: '🇨🇳', 'zh-hk': '🇨🇳', fr: '🇫🇷',
};
const ORIGIN_CHIP: Record<string, {label: string; color: string}> = {
  ko: {label: 'MANHWA', color: colors.teal},
  zh: {label: 'MANHUA', color: colors.mango},
  'zh-hk': {label: 'MANHUA', color: colors.mango},
  fr: {label: 'BD FR', color: colors.orange},
};
```

**Étape 3 — Modifier MangaRowItem pour afficher les badges**

Dans le rendu de MangaRowItem, trouver la couverture et le titre, ajouter le flag overlay sur la cover et le chip sous le titre — même logique que Task 1.

**Étape 4 — Vérifier TypeScript + Commit**
```bash
npx tsc --noEmit 2>&1 | head -10
git add src/screens/explore/ExploreScreen.tsx
git commit -m "feat: badge flag origine + chip type sur MangaRowItem ExploreScreen"
```

---

# BLOC 2 — Sélecteur de type dans ExploreScreen

---

## Task 3 : Sélecteur de type + filtrage MangaDex

**Files:**
- Modify: `src/screens/explore/ExploreScreen.tsx`

**Étape 1 — Lire le fichier pour comprendre la logique de chargement**
```bash
grep -n "useState\|useEffect\|loadNew\|mangaService\|originalLanguage\|params\|fetch" src/screens/explore/ExploreScreen.tsx | head -30
```

**Étape 2 — Ajouter le type de contenu au state**

Dans le composant, trouver les `useState` existants et ajouter :
```typescript
type ContentType = 'all' | 'manga' | 'manhwa' | 'manhua' | 'bdfr' | 'webtoon';
const [contentType, setContentType] = useState<ContentType>('all');
```

**Étape 3 — Définir le mapping paramètres MangaDex**

Après le `useState`, ajouter :
```typescript
const LONG_STRIP_TAG = '3e2b8dae-350e-4ab8-a8ce-016e844b9f0d';

const TYPE_PARAMS: Record<ContentType, Record<string, unknown>> = {
  all:     {},
  manga:   {originalLanguage: ['ja']},
  manhwa:  {originalLanguage: ['ko']},
  manhua:  {originalLanguage: ['zh']},
  bdfr:    {originalLanguage: ['fr']},
  webtoon: {includedTags: [LONG_STRIP_TAG]},
};

const TYPE_LABELS: Record<ContentType, string> = {
  all:     'Tout',
  manga:   'Manga 🇯🇵',
  manhwa:  'Manhwa 🇰🇷',
  manhua:  'Manhua 🇨🇳',
  bdfr:    'BD FR 🇫🇷',
  webtoon: 'Webtoon 📜',
};
```

**Étape 4 — Modifier la fonction de chargement pour utiliser TYPE_PARAMS**

Trouver la fonction qui charge les nouveaux mangas (probablement `loadNew` ou similaire). Elle appelle `mangaService.searchManga(...)` ou similaire. Modifier pour passer les paramètres du type sélectionné :

```typescript
const extraParams = TYPE_PARAMS[contentType];
const result = await mangaService.searchManga({
  ...extraParams,          // ← injecter les filtres de type
  limit: 20,
  offset: 0,
  contentRating: ['safe', 'suggestive'],
  order: {followedCount: 'desc'},
  includes: ['cover_art'],
});
```

**Étape 5 — Recharger quand contentType change**

Dans le `useEffect` qui charge les données, ajouter `contentType` comme dépendance :
```typescript
useEffect(() => {
  setNewMangas([]);
  setLoadingNew(true);
  loadNew(); // reset et recharge
}, [contentType]);
```

**Étape 6 — Ajouter le sélecteur dans le JSX**

En haut du contenu de l'écran (avant les sections), ajouter un ScrollView horizontal avec les chips :
```tsx
{/* Sélecteur de type */}
<ScrollView
  horizontal
  showsHorizontalScrollIndicator={false}
  contentContainerStyle={styles.typeSelector}
  style={styles.typeSelectorWrap}>
  {(Object.keys(TYPE_LABELS) as ContentType[]).map(type => (
    <TouchableOpacity
      key={type}
      style={[
        styles.typeChip,
        contentType === type && styles.typeChipActive,
      ]}
      onPress={() => setContentType(type)}
      activeOpacity={0.7}>
      <Text style={[
        styles.typeChipText,
        contentType === type && styles.typeChipTextActive,
      ]}>
        {TYPE_LABELS[type]}
      </Text>
    </TouchableOpacity>
  ))}
</ScrollView>
```

**Étape 7 — Ajouter les styles**
```typescript
typeSelectorWrap: {
  marginBottom: spacing.s3,
},
typeSelector: {
  paddingHorizontal: spacing.s4,
  gap: spacing.s2,
  flexDirection: 'row',
},
typeChip: {
  paddingHorizontal: spacing.s3,
  paddingVertical: spacing.s2,
  borderRadius: radius.full,
  backgroundColor: colors.bgCard,
  borderWidth: 1,
  borderColor: colors.border,
},
typeChipActive: {
  backgroundColor: colors.orange,
  borderColor: colors.orange,
},
typeChipText: {
  fontSize: 13,
  fontFamily: fonts.bodySemiBold,
  color: colors.text60,
},
typeChipTextActive: {
  color: '#fff',
  fontWeight: '700',
},
```

**Étape 8 — Vérifier TypeScript + Commit**
```bash
npx tsc --noEmit 2>&1 | head -10
git add src/screens/explore/ExploreScreen.tsx
git commit -m "feat: sélecteur type contenu dans ExploreScreen (manhwa/manhua/BD FR/webtoon)"
```

---

# BLOC 3 — Mode Webtoon dans le Reader

---

## Task 4 : Étendre ReadingDirection avec 'webtoon'

**Files:**
- Modify: `src/types/mangadex.types.ts`
- Modify: `src/types/navigation.types.ts`

**Étape 1 — Modifier ReadingDirection dans mangadex.types.ts**

Trouver :
```typescript
export type ReadingDirection = 'ltr' | 'rtl';
```
Remplacer par :
```typescript
export type ReadingDirection = 'ltr' | 'rtl' | 'webtoon';
```

**Étape 2 — Ajouter originalLanguage dans les params Reader**

Dans `navigation.types.ts`, trouver `SharedDetailParams` :
```typescript
export type SharedDetailParams = {
  MangaDetail: { mangaId: string };
  Reader: { chapterId: string; mangaId: string; chapterNum: string };
};
```
Modifier `Reader` pour ajouter `originalLanguage` optionnel :
```typescript
Reader: {
  chapterId: string;
  mangaId: string;
  chapterNum: string;
  originalLanguage?: string;  // ← ADD : pour détecter auto webtoon
};
```

**Étape 3 — Vérifier TypeScript**
```bash
npx tsc --noEmit 2>&1 | head -20
```

**Étape 4 — Commit**
```bash
git add src/types/mangadex.types.ts src/types/navigation.types.ts
git commit -m "feat: étendre ReadingDirection avec webtoon + originalLanguage dans Reader params"
```

---

## Task 5 : Passer originalLanguage depuis MangaDetailScreen

**Files:**
- Modify: `src/screens/manga/MangaDetailScreen.tsx`

**Étape 1 — Trouver les 2 navigations vers Reader**
```bash
grep -n "navigate.*Reader\|navigation.navigate" src/screens/manga/MangaDetailScreen.tsx
```

Il y a 2 endroits :
1. Bouton "Lire" (handleReadFirst ou similaire)
2. Tap sur une ligne de chapitre

**Étape 2 — Ajouter originalLanguage dans les deux navigations**

Exemple pour le bouton "Lire" :
```typescript
navigation.navigate('Reader', {
  chapterId: firstInternal.id,
  mangaId,
  chapterNum: firstInternal.chapter ?? '1',
  originalLanguage: manga.originalLanguage,  // ← ADD
});
```

Même chose pour le tap sur une ligne de chapitre.

**Note :** `manga` est déjà dans le state de MangaDetailScreen — `manga.originalLanguage` est disponible directement.

**Étape 3 — Vérifier TypeScript + Commit**
```bash
npx tsc --noEmit 2>&1 | head -10
git add src/screens/manga/MangaDetailScreen.tsx
git commit -m "feat: passer originalLanguage aux params Reader depuis MangaDetailScreen"
```

---

## Task 6 : Mode webtoon dans ReaderScreen

**Files:**
- Modify: `src/screens/manga/ReaderScreen.tsx`
- Modify: `src/stores/reader.store.ts`

**Étape 1 — Lire ReaderScreen pour comprendre la FlatList principale**
```bash
grep -n "FlatList\|horizontal\|pagingEnabled\|scrollEnabled\|direction\|settings\|route.params" src/screens/manga/ReaderScreen.tsx | head -30
```

**Étape 2 — Ajouter logique de détection webtoon dans ReaderScreen**

Récupérer `originalLanguage` depuis `route.params` :
```typescript
const {chapterId, mangaId, chapterNum, originalLanguage} = route.params;
```

Calculer si le mode webtoon doit être activé :
```typescript
const WEBTOON_LANGUAGES = ['ko', 'zh', 'zh-hk'];

const isWebtoon =
  WEBTOON_LANGUAGES.includes(originalLanguage ?? '') ||
  settings.direction === 'webtoon';
```

**Étape 3 — Adapter la FlatList selon le mode**

Trouver la `FlatList` principale du Reader et modifier ses props :
```tsx
<FlatList
  ref={flatListRef}
  data={imageUrls}
  keyExtractor={(_, index) => String(index)}
  // Mode webtoon : scroll vertical continu
  horizontal={!isWebtoon && settings.direction === 'rtl'}
  inverted={!isWebtoon && settings.direction === 'rtl'}
  pagingEnabled={!isWebtoon && settings.direction === 'rtl'}
  // Mode webtoon : images pleine largeur
  renderItem={({item, index}) => (
    isWebtoon ? (
      <Image
        source={{uri: item}}
        style={styles.webtoonPage}
        resizeMode="contain"
      />
    ) : (
      // rendu existant pour manga normal
      <YourExistingPageComponent ... />
    )
  )}
  // Garder les callbacks existants
  onViewableItemsChanged={...}
  {...}
/>
```

**Styles webtoon à ajouter :**
```typescript
webtoonPage: {
  width: Dimensions.get('window').width,
  // height auto selon ratio image
  minHeight: 100,
},
```

**Étape 4 — Toast "Mode Webtoon activé" (une seule fois)**

Ajouter state toast :
```typescript
const [webtoonToast, setWebtoonToast] = useState(false);
```

Dans `useEffect` au montage, si `isWebtoon` :
```typescript
useEffect(() => {
  if (!isWebtoon) return;
  const alreadyShown = mmkv.getString('user:webtoonToastShown');
  if (!alreadyShown) {
    setWebtoonToast(true);
    mmkv.set('user:webtoonToastShown', '1');
    setTimeout(() => setWebtoonToast(false), 3000);
  }
}, [isWebtoon]);
```

Toast JSX (avant la fermeture du composant) :
```tsx
{webtoonToast && (
  <View style={styles.webtoonToast} pointerEvents="none">
    <Text style={styles.webtoonToastText}>📜 Mode Webtoon activé — scroll vers le bas</Text>
  </View>
)}
```

Styles toast :
```typescript
webtoonToast: {
  position: 'absolute',
  bottom: 80,
  alignSelf: 'center',
  backgroundColor: 'rgba(0,0,0,0.75)',
  paddingHorizontal: spacing.s4,
  paddingVertical: spacing.s3,
  borderRadius: radius.full,
},
webtoonToastText: {
  color: '#fff',
  fontSize: 13,
  fontFamily: fonts.bodySemiBold,
},
```

**Étape 5 — Ajouter le toggle Webtoon dans les contrôles Reader**

Trouver le bouton toggle direction existant (ligne ~317 dans le fichier, le bouton `🔃 D→G` / `🔃 G→D`). Ajouter un bouton Webtoon :
```tsx
<TouchableOpacity
  onPress={() => updateSettings({direction: isWebtoon ? 'rtl' : 'webtoon'})}
  style={styles.controlBtn}>
  <Text style={styles.controlBtnText}>
    {isWebtoon ? '📖 Manga' : '📜 Webtoon'}
  </Text>
</TouchableOpacity>
```

**Étape 6 — Vérifier TypeScript**
```bash
npx tsc --noEmit 2>&1 | head -20
```

**Étape 7 — Commit**
```bash
git add src/screens/manga/ReaderScreen.tsx src/stores/reader.store.ts
git commit -m "feat: mode webtoon scroll vertical + toast + toggle manuel dans Reader"
```

---

## Vérification finale

```bash
npx tsc --noEmit 2>&1 | grep -v "SplashScreen\|PublicProfile\|chapter.service" | head -10
```

**Test manuel recommandé :**
1. ExploreScreen → chip "Manhwa 🇰🇷" → voir Solo Leveling / Tower of God
2. ExploreScreen → chip "BD FR 🇫🇷" → voir Radiant
3. ExploreScreen → chip "Webtoon 📜" → voir des Long Strips
4. Ouvrir Solo Leveling → badge 🇰🇷 sur la cover + chip "MANHWA" sous le titre
5. Lire un chapitre de Solo Leveling → scroll vertical + toast "Mode Webtoon"
6. Ouvrir Dragon Ball (ja) → badge 🇯🇵 sur cover, pas de chip
7. Toggle manuel Webtoon↔Manga dans les contrôles du Reader

---

## Ordre d'exécution

```
Task 1 → Badge MangaCardVertical
Task 2 → Badge MangaRowItem ExploreScreen
Task 3 → Sélecteur de type ExploreScreen
Task 4 → ReadingDirection + navigation types
Task 5 → originalLanguage dans navigation MangaDetailScreen
Task 6 → Mode webtoon ReaderScreen
```
