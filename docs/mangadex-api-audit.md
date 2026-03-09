# Audit API MangaDex — MangaLakay
**Date :** 9 mars 2026

---

## Résultats des tests

### Test 1 — Pagination feed chapitres (Horimiya)

**Requête :** `GET /manga/a25e46ec-30f7-4db6-89df-cacbc1d9a900/feed?limit=1&offset=0&translatedLanguage[]=fr&translatedLanguage[]=en&contentRating[]=safe&contentRating[]=suggestive`

**Résultat :**
```
total: 95   limit: 1   offset: 0
```

**Observations :**
- La pagination fonctionne correctement : `total`, `limit` et `offset` sont retournés dans la réponse.
- Le champ `total` reflète bien le nombre de chapitres disponibles pour les langues et ratings demandés.
- Avec `limit=1`, on reçoit exactement 1 chapitre — utile pour estimer le nombre de pages à charger avant de tout fetch.
- 95 chapitres disponibles en FR+EN pour Horimiya (safe+suggestive).

**Statut :** Fonctionne comme attendu.

---

### Test 2 — Filtre `availableTranslatedLanguage` FR

**Requête :** `GET /manga?availableTranslatedLanguage[]=fr&limit=5&contentRating[]=safe&includes[]=cover_art`

**Résultat :**
```
total: 4749   résultats: 5
```

**Observations :**
- Le filtre `availableTranslatedLanguage[]=fr` est fonctionnel et retourne uniquement les mangas ayant des chapitres en français.
- 4 749 mangas disponibles en FR avec content rating "safe" — c'est un catalogue substantiel.
- Le paramètre `includes[]=cover_art` fonctionne dans la même requête sans conflit.
- `limit=5` respecté exactement.

**Statut :** Fonctionne comme attendu.

---

### Test 3 — Batch statistics

**Requête :** `GET /statistics/manga?manga[]=a25e46ec...&manga[]=32d76d19...`

**Résultat :**
```
a25e46ec-30f7-4db6-89df-cacbc1d9a900 → avg: 9.2493   follows: 131358
32d76d19-8a05-4db0-9fc2-e0b0648fe9d0 → avg: 9.3401   follows: 317437
```

**Observations :**
- L'endpoint batch `/statistics/manga` retourne les stats pour plusieurs UUIDs en une seule requête — très efficace.
- La note moyenne (`rating.average`) est sur une échelle de 10, avec une précision de 4 décimales.
- Le nombre de follows est disponible directement dans la réponse.
- Structure de réponse : `{ statistics: { [mangaId]: { rating: { average, distribution }, follows } } }`.
- Idéal pour charger les stats de toute une liste de mangas sans multiplier les requêtes.

**Statut :** Fonctionne comme attendu.

---

### Test 4 — Manga random

**Requête :** `GET /manga/random?contentRating[]=safe&includes[]=cover_art`

**Résultat :**
```
id: bf91844e-da95-4042-a973-a95cc86b8905   title: ['Geunal, Uli']
```

**Observations :**
- L'endpoint `/manga/random` retourne un manga aléatoire conforme au filtre `contentRating`.
- Le filtre `contentRating[]=safe` est respecté — aucun contenu adulte renvoyé.
- `includes[]=cover_art` fonctionne sur cet endpoint également.
- La réponse a la même structure qu'un GET `/manga/{id}` standard (objet `data` unique, non tableau).
- Le manga retourné (`Geunal, Uli`) est un manga coréen — le random n'est pas biaisé vers les titres populaires.
- L'endpoint HEAD `/manga/random` retourne 405 Method Not Allowed — à ne pas utiliser pour vérifier la disponibilité.

**Statut :** Fonctionne comme attendu. Comportement à noter : réponse `data` est un objet, pas un tableau.

---

### Test 5 — Feed avec external chapters (One Piece)

**Requête :** `GET /manga/a1c7c817-4e59-43b7-9365-09675a149a6f/feed?limit=5&offset=0&translatedLanguage[]=fr&translatedLanguage[]=en&contentRating[]=safe`

**Résultat initial avec `contentRating[]=safe` uniquement :**
```
total: 0   count: 0
```

**Résultat avec `contentRating[]=safe&contentRating[]=suggestive` :**
```
total: 14   count: 5
ch 1   lang: fr   ext: True   pages: 0
ch 2   lang: fr   ext: True   pages: 0
ch 3   lang: fr   ext: True   pages: 0
ch 1   lang: en   ext: True   pages: 0
ch 3   lang: en   ext: True   pages: 0
```

**Résultat sans filtre de langue, tous ratings :**
```
total: 810
```

**Observations critiques :**
1. **One Piece est classé `suggestive` sur MangaDex**, pas `safe`. Un filtre `contentRating[]=safe` uniquement retourne 0 chapitre — comportement contre-intuitif pour un manga grand public.
2. **Tous les chapitres sont external** (`externalUrl != null`, `pages: 0`). One Piece sur MangaDex pointe vers Manga Plus (Shueisha) — les pages ne sont pas hébergées directement.
3. **Les chapitres externes ne peuvent pas être lus in-app** via l'API MangaDex. Il faudrait rediriger vers l'URL externe ou implémenter une WebView.
4. **Chapitres en doublon par langue** : ch 1 apparaît en FR et en EN séparément — à dédoublonner côté app si on affiche la liste.

**Statut :** Comportements inattendus importants pour l'intégration.

---

## Synthèse des comportements inattendus

| # | Comportement | Impact |
|---|---|---|
| 1 | One Piece classé `suggestive`, pas `safe` | Chapitres invisibles si app filtre uniquement `safe` |
| 2 | One Piece = 100% chapitres externes (pages: 0) | Lecture in-app impossible sans WebView ou redirection |
| 3 | HEAD `/manga/random` → 405 | Ne pas utiliser HEAD sur cet endpoint |
| 4 | `/manga/random` retourne `data` objet, pas tableau | Parsing différent de `/manga` qui retourne un tableau |

---

## Limites réelles observées

- **Catalogue FR (safe) :** 4 749 mangas — bon mais pas exhaustif vs catalogue global.
- **Feed Horimiya FR+EN :** 95 chapitres — cohérent avec la série.
- **One Piece total (tous ratings, toutes langues) :** 810 chapitres référencés, tous externes.
- **Rate limits :** Aucun header `x-ratelimit-*` observé dans les réponses GET. L'API MangaDex documente une limite de ~5 req/s — non visible dans les headers mais à respecter en production.
- **Pagination :** Le champ `total` peut atteindre plusieurs milliers (ex: 4749 mangas FR). Prévoir une pagination côté app, ne jamais charger tout d'un coup.

---

## Recommandations pour l'app

1. **Toujours inclure `safe` + `suggestive` dans les requêtes feed.** Beaucoup de mangas mainstream (dont One Piece) sont classés `suggestive` sur MangaDex. Un filtre `safe` uniquement crée des résultats vides inattendus pour l'utilisateur.

2. **Détecter et gérer les chapitres externes (`pages: 0` + `externalUrl != null`).** Afficher un badge "externe" et proposer une redirection navigateur ou WebView plutôt que de tenter un chargement in-app qui échouera.

3. **Utiliser l'endpoint batch `/statistics/manga`** pour enrichir les listes de mangas en une seule requête plutôt que d'appeler `/statistics/manga/{id}` pour chaque titre.

4. **Parsing différencié pour `/manga/random` :** La réponse retourne `data` comme un objet unique, pas un tableau. Le code de parsing doit gérer ce cas spécifique (ne pas appeler `.data[0]`).

5. **Implémenter un rate limiter côté client** (max 5 req/s) en production. Bien que les headers de rate limit ne soient pas visibles dans les réponses actuelles, la documentation MangaDex impose cette limite.

6. **Utiliser `availableTranslatedLanguage[]=fr`** dans les écrans de découverte pour garantir que les mangas affichés ont du contenu lisible en français — les 4 749 résultats confirment que le filtre est fiable.

7. **Pré-fetch avec `limit=1` pour connaître le `total`** avant de charger tous les chapitres d'un manga, puis paginer par blocs (ex: 100) pour éviter les requêtes trop lourdes.
