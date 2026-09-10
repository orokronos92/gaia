# La recette étiquette — décision du 10 septembre 2026

> Décidé avec Ouro le 10/09/2026. **À réaliser après la démo du 11/09.**
> Ce document est la spécification ; rien n'est encore construit à part le
> correctif d'affichage du §6.

---

## 1. Ce qui cloche aujourd'hui

Trois cartes s'affichent sur la fiche produit sous le titre « composition » :

| Carte | Contenu | Rôle annoncé |
|---|---|---|
| Recette de production | kg et % bruts | ce qui est pesé |
| QUID arrondi | % arrondis, Σ = 100 | ce qui est calculé |
| Liste déclarée | le texte de la fiche dégustation | **comparée au BAT** |

Deux défauts, et le second est le vrai sujet.

**Le QUID arrondi n'est pas une recette.** C'est une colonne de la recette de
production. Lui donner une carte entière laisse croire à trois étapes là où il
n'y en a que deux, et fait douter des deux autres.

**La carte auditée est le mauvais document.** La liste déclarée est recopiée
mot pour mot de la fiche dégustation — le texte qu'Aurélie écrit à la main
après le comité. C'est un **point de départ**, pas une référence : sur le
chimpanzé, la recette a gagné un ingrédient après le comité, et ce texte ne le
connaît pas. Il compte six ingrédients quand la recette en a sept.

Il en résulte l'impasse observée le 10/09. La recette dit `SORWATHE OP1`,
l'étiquette dit `thé noir`. Quand Marie valide, l'application refuse d'écraser
la liste déclarée — à raison, `SORWATHE OP1` n'est pas une dénomination légale.
Elle n'a donc que deux portes, mauvaises toutes les deux :

- **remplacer par la recette** → elle gagne les marqueurs Demeter, mais
  l'étiquette imprimerait un nom fournisseur ;
- **garder la liste déclarée** → les bons noms, mais la certification Demeter
  disparaît de l'étiquette.

Il manque une troisième porte.

---

## 2. La décision

Une **recette étiquette** s'intercale entre la production et le BAT. Elle
reprend ligne à ligne la recette de production — mêmes ingrédients, mêmes
pourcentages arrondis, mêmes marqueurs — et **Marie n'y modifie que le nom**.

Les trois cartes deviennent :

| Carte | Source | Éditable | Rôle |
|---|---|---|---|
| **Recette de production** | fiche recette (Aurélie) | non | ce qui est pesé — kg, % brut, **et la colonne d'arrondi** |
| **Recette étiquette** | dérivée de la production | **oui, le nom seul** | ce qui sera imprimé — **la seule référence de l'audit** |
| **Rappel dégustation** | fiche dégustation | non | le point de départ du comité, pour mémoire |

La chaîne se lit alors d'un regard : **Aurélie pèse → Marie habille → on compare
au BAT.**

### Pourquoi le nom seul

Parce que c'est la seule chose que Marie doit décider. Les pourcentages viennent
du moteur, les marqueurs viennent des cases du classeur, l'ordre vient des
masses. Laisser un champ de texte libre reperdrait tout ce que la lecture
déterministe du classeur vient de gagner : plus de structure, plus de contrôle
ligne par ligne, retour au texte qu'on ne sait pas vérifier.

### Pourquoi la dégustation sort du circuit d'audit

Elle est antérieure à la recette de production et ne la suit pas. La garder
comme référence revient à auditer un brouillon. Elle reste affichée — elle dit
ce que le comité avait en tête, et c'est une information utile — mais **plus
aucun contrôle ne la lit**.

---

## 3. Le parcours attendu, pas à pas

C'est le scénario qu'Ouro rejouera pour valider le lot.

1. **Import de la fiche dégustation seule.**
   La carte « rappel dégustation » se remplit. L'onglet Recette / QUID se
   **pré-remplit** à partir de ce texte — c'est le comportement actuel, il ne
   change pas.

2. **Import de la fiche recette (le classeur).**
   L'onglet Recette / QUID **se met à jour** avec la composition réelle : elle
   écrase le pré-remplissage du comité, et c'est voulu — c'est elle qui fait
   foi. La recette **n'est pas validée** : Marie peut encore corriger si elle a
   des informations que le classeur n'a pas.

3. **Marie valide.**
   La validation met à jour la carte **recette de production** (avec sa colonne
   d'arrondi) et **crée la recette étiquette**, initialisée avec les noms de
   production.

4. **Marie relit la recette étiquette** et remplace `SORWATHE OP1` par
   `thé noir`.

5. **Si elle ne l'a pas fait**, le contrôle le lui dit : le BAT imprime
   `thé noir`, la recette étiquette annonce `SORWATHE OP1`, et le point sort en
   écart — avec le repère posé sur le BAT.

---

## 4. Ce que devient le contrôle 2.5

Le contrôle livré le 10/09 compare la recette à la liste de la dégustation.
Il **change de cible** et, ce faisant, de nature.

**Aujourd'hui** — `deterministic`, sur la fiche : recette ↔ liste déclarée.
Utile tant que la recette étiquette n'existe pas ; c'est lui qui a fait sortir
le SENCHA Demeter de TA6992.

**Demain** — `bat`, contre le BAT : recette étiquette ↔ étiquette imprimée.

Ce déplacement n'est pas cosmétique, il résout un problème que je n'avais pas su
trancher. Détecter sur la fiche seule qu'un nom est « un nom fournisseur » est
impossible proprement : rien ne distingue `SORWATHE OP1` de `THYM`, qui est un
nom d'ingrédient parfaitement valable. **Le BAT arbitre** : si le nom est bon, il
s'y retrouve et le contrôle se tait ; s'il est resté fournisseur, il n'y est pas
et le contrôle sort. Plus rien à deviner — la même logique que la lecture du
classeur par adresse de cellule.

Le contrôle attrapera alors, en une fois : un nom qui ne correspond pas, un
ingrédient absent du BAT, un pourcentage qui diffère, un ordre qui ne suit pas.

**C'est un trou réel.** Vérifié le 10/09 : aujourd'hui *rien* ne compare la liste
d'ingrédients au BAT nom par nom. Deux contrôles se servent de cette liste — la
hauteur de caractères et la police du mot « demeter » — mais aucun ne vérifie
que ce qui est sur la fiche est bien ce qui est imprimé.

---

## 5. Les lots

**Lot A — la colonne d'arrondi rejoint la production.**
Fusionner la carte « QUID arrondi » dans « Recette de production » comme une
colonne supplémentaire. Libère la deuxième carte. Aucune donnée nouvelle.

**Lot B — la recette étiquette existe.**
Une dénomination d'étiquette par ligne de recette, nullable, qui vaut la
dénomination de production tant que personne n'y touche. Migration Drizzle.

**Lot C — Marie l'édite.**
La deuxième carte devient la recette étiquette, éditable au nom près, ligne par
ligne. Les pourcentages, marqueurs et ordre restent en lecture seule.

**Lot D — l'audit bascule.**
Tous les contrôles qui lisent aujourd'hui la liste déclarée lisent la recette
étiquette. La carte dégustation devient purement informative. À faire d'un bloc :
une bascule partielle ferait juger deux sources différentes selon le point.

**Lot E — le contrôle 2.5 passe en mode BAT.**
Comparaison nom par nom contre le texte du BAT, avec repère sur le PDF. Le
contrôle actuel disparaît en même temps que sa cible.

Ordre imposé : B avant C, C avant D, D avant E. A est indépendant.

---

## 6. Fait le 10/09 — l'étoile Demeter

Corrigé immédiatement, hors lots.

Dans l'onglet Recette / QUID, les deux bascules — Demeter et commerce équitable
— affichaient **la même pastille à une seule étoile**. L'écran enseignait donc
l'inverse de la règle : sur l'étiquette, une étoile veut dire *bio* et deux
veulent dire *Demeter* (PRO-QHS-013 §11.1). Un ingrédient Demeter portait à
l'écran le marqueur du bio.

Demeter affiche maintenant **`✱✱`**. Le commerce équitable affiche une coche et
non une étoile : le §11.1 ne définit aucun marqueur par ingrédient pour
l'équitable et l'étiquette n'en imprime aucun — lui donner une étoile
promettrait un symbole qui n'atteint jamais le BAT.

---

## 7. Restes à traiter, hors de ce chantier

- **Le réimport des cinq références** n'est pas appliqué :
  `npx tsx scripts/reimporter-recettes.ts --appliquer`, puis validation dans
  l'interface. Sans lui, TA6022 « Le sens de la fête » garde ses trois Demeter
  fautifs — et ils sont désormais cohérents de bout en bout, donc rien ne les
  signale.
- **Le chimpanzé trafiqué** (cinq Demeter fabriqués) est à retirer.
- **`recettes.source_extraction` et `ecarts_pourcentage`** sont persistés mais
  n'apparaissent sur aucun écran.
- **Le statut AUTO des quatre mentions de gamme** n'affiche jamais à quoi il se
  résout : Marie lit « AUTO » sans savoir si cela donne oui ou non.
- **TA6992** déclare le SENCHA en Demeter quand son étiquette n'en revendique
  aucun. Question de fond à poser à JDG, sortie par le contrôle 2.5.
