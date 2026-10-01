# Étiquettes au texte vectorisé : liste de travail

**Établie le** : 2026-10-01 — **Par** : SPC
**Périmètre** : tous les fichiers d'étiquettes stockés sur MinIO (préprod `label-assets-preprod`
et prod `label-assets`), analysés un par un.
**Complète** : `docs/pdf-vectorises.md` (même constat du 2026-09-24, en tableaux).

## Le problème

Une étiquette PDF dont le texte a été « vectorisé » à l'export d'Illustrator ne contient plus
de lettres, seulement des dessins de lettres. Elle s'imprime parfaitement, mais GaïaLabel ne
peut pas en lire le texte : les contrôles de liste d'ingrédients, de mentions et de tailles de
caractères répondent « à vérifier » sans avoir rien comparé.

Tous ces fichiers sont des étiquettes réelles de JDG, déjà passées chez l'imprimeur. Les BAT
de 2025-2026, qui gardent leur texte, ont été imprimés eux aussi : **l'imprimeur n'exige pas la
vectorisation**. Un PDF ré-exporté sans vectoriser reste imprimable.

Pour vérifier un fichier : l'ouvrir et essayer de surligner un mot. Si c'est impossible, il est
vectorisé. En ligne de commande : `pdffonts fichier.pdf` n'affiche aucune police.

## Bilan (2026-10-01)

| Stockage | Type | Avec texte | Vectorisés |
|---|---|---:|---:|
| Préprod (archive de septembre) | PDF | 799 | **267** |
| Prod (versement de mars) | PDF | 231 | 53 |
| Prod (versement de mars) | .ai | 277 | 0 |

Les 267 PDF vectorisés de préprod se répartissent ainsi :

| Section | Contenu | Produits | Fichiers |
|---|---|---:|---:|
| 1 | Produits dont aucun BAT n'est lisible | 62 | 123 |
| 2 | Produits dont une face seulement est vectorisée | 23 | 23 |
| 3 | PDF rattachés mais désactivés | | 5 |
| 4 | PDF rattachés à aucun produit | | 122 |

La section 5 liste en plus les 53 PDF vectorisés du versement de mars.

## Comment lire chaque ligne

```
- nom du fichier PDF vectorisé
    dossier : son emplacement dans l'archive des étiquettes
    source  : ce qu'on a pour le récupérer
    .ai     : le fichier Illustrator correspondant, s'il existe (stockage prod)
```

La ligne `source` prend trois valeurs :

- **`.ai même version`** : un `.ai` de mars porte le même code étiquette et le même numéro de
  version (V5, V6…). Il contient le texte. À vérifier quand même que son contenu est celui du
  BAT imprimé (un `.ai` peut avoir été retouché après l'export). 40 fichiers en section 1, qui
  couvrent entièrement **20 produits sur 62**.
- **`.ai autre version`** : le `.ai` existe mais dans une autre version que le BAT. Ne pas
  l'utiliser tel quel.
- **`aucun .ai`** : rien dans GaïaLabel. Le `.ai` est à chercher dans l'archive du Graphisme
  (livraison de 16 Go) ou à demander à JDG.

## Ce qu'il faut faire

Pour chaque fichier, obtenir un PDF **avec le texte conservé**, de la même version que le BAT :
ré-export depuis le `.ai` en décochant la vectorisation, ou nouveau PDF fourni par JDG. Le
remplacer ensuite dans le stockage, au même emplacement. Traiter les sections dans l'ordre :
la section 1 débloque des produits entiers.

---

## 1. Préprod : produits dont AUCUN BAT n'est lisible (62 produits)

Priorité : sur ces produits, aucun contrôle de texte ne s'exécute.

### TA6102 Fraises au basilic [JDG]
- ETCVA6102V5-Fraises au basilic.pdf
    dossier : ÉTIQUETTES 2026-09/02.THÉS VERTS/TA610 - FRAISES AU BASILIC
    source  : aucun .ai
- ETVA610V5-Fraises au basilic.pdf
    dossier : ÉTIQUETTES 2026-09/02.THÉS VERTS/TA610 - FRAISES AU BASILIC
    source  : aucun .ai

### TA6132 Surprise ! [JDG]
- ETCVA6132V5N-Surprise de Noël V1.pdf
    dossier : ÉTIQUETTES 2026-09/02.THÉS VERTS/TA613 SURPRISE !
    source  : aucun .ai
- ETVA613V5N-Surprise de Noël.pdf
    dossier : ÉTIQUETTES 2026-09/02.THÉS VERTS/TA613 SURPRISE !
    source  : aucun .ai

### TA6142 Un amour de Maman [JDG]
- ETCVA6142V5-Un amour de Maman.pdf
    dossier : ÉTIQUETTES 2026-09/02.THÉS VERTS/TA614 UN AMOUR DE MAMAN
    source  : aucun .ai
- ETVA614V5-Un amour de Maman.pdf
    dossier : ÉTIQUETTES 2026-09/02.THÉS VERTS/TA614 UN AMOUR DE MAMAN
    source  : aucun .ai

### TA6742 Caprice gourmand [JDG]
- ETCVA6742V5-Caprice Gourmand vecto.pdf
    dossier : ÉTIQUETTES 2026-09/02.THÉS VERTS/TA674 CAPRICE GOURMAND/Fichiers vectorisés
    source  : aucun .ai
- ETVA674V5-Caprice gourmand vecto.pdf
    dossier : ÉTIQUETTES 2026-09/02.THÉS VERTS/TA674 CAPRICE GOURMAND/Fichiers vectorisés
    source  : aucun .ai

### TA6792 Ambiance littorale [JDG]
- ETCVA6792V5-Ambiance littorale.pdf
    dossier : ÉTIQUETTES 2026-09/02.THÉS VERTS/TA679 AMBIANCE LITTORALE
    source  : aucun .ai
- ETVA679V5-Ambiance littorale.pdf
    dossier : ÉTIQUETTES 2026-09/02.THÉS VERTS/TA679 AMBIANCE LITTORALE
    source  : aucun .ai

### TA6812 Earl Grey vert [JDG]
- ETCVA6812V5-Earl Grey vert.pdf
    dossier : ÉTIQUETTES 2026-09/02.THÉS VERTS/TA681 EARL GREY VERT
    source  : aucun .ai
- ETVA681V5-Earl Grey vert.pdf
    dossier : ÉTIQUETTES 2026-09/02.THÉS VERTS/TA681 EARL GREY VERT
    source  : aucun .ai

### TA6832 Tendres moments [JDG]
- ETCVA6832V5-Tendres moments.pdf
    dossier : ÉTIQUETTES 2026-09/02.THÉS VERTS/TA683 TENDRES MOMENTS
    source  : aucun .ai
- ETVA683V5-Tendres moments.pdf
    dossier : ÉTIQUETTES 2026-09/02.THÉS VERTS/TA683 TENDRES MOMENTS
    source  : aucun .ai

### TA6852 Citron [JDG]
- ETCVA6852V5-Citron.pdf
    dossier : ÉTIQUETTES 2026-09/02.THÉS VERTS/TA685 CITRON
    source  : aucun .ai
- ETVA685V5-Citron.pdf
    dossier : ÉTIQUETTES 2026-09/02.THÉS VERTS/TA685 CITRON
    source  : aucun .ai

### TA6992 Green Pep's [JDG]
- ETCVA6992V5-Green Pep's.pdf
    dossier : ÉTIQUETTES 2026-09/02.THÉS VERTS/TA699 GREEN PEP'S
    source  : .ai même version (V5)
    .ai     : RÉFÉRENCES ÉTIQUETTES/TA699 GREEN PEP'S/ETCVA6992V5-Green Pep's.ai
- ETVA699V5-Green Pep's.pdf
    dossier : ÉTIQUETTES 2026-09/02.THÉS VERTS/TA699 GREEN PEP'S
    source  : .ai même version (V5)
    .ai     : RÉFÉRENCES ÉTIQUETTES/TA699 GREEN PEP'S/ETVA699V5-Green Pep's.ai

### TA7062 Péché gourmand [JDG]
- ETCNA7062V5-Péché gourmand.pdf
    dossier : ÉTIQUETTES 2026-09/04.THÉS NOIRS/TA706 PÉCHÉ GOURMAND
    source  : .ai même version (V5)
    .ai     : RÉFÉRENCES ÉTIQUETTES/TA706 PÉCHÉ GOURMAND/ETCNA7062V5-Péché gourmand V1.ai
- ETNA706V5-Péché gourmand.pdf
    dossier : ÉTIQUETTES 2026-09/04.THÉS NOIRS/TA706 PÉCHÉ GOURMAND
    source  : .ai même version (V5)
    .ai     : RÉFÉRENCES ÉTIQUETTES/TA706 PÉCHÉ GOURMAND/ETNA706V5-Péché gourmand V1.ai

### TA7092 À l’ombre des amandiers [JDG]
- ETCNA7092V5-À l’ombre des amandiers.pdf
    dossier : ÉTIQUETTES 2026-09/04.THÉS NOIRS/TA709 À L'OMBRE DES AMANDIERS
    source  : aucun .ai
- ETNA709V5-À l’ombre des amandiers.pdf
    dossier : ÉTIQUETTES 2026-09/04.THÉS NOIRS/TA709 À L'OMBRE DES AMANDIERS
    source  : aucun .ai

### TA7112 L’Or du Temps [JDG]
- ETCNA7112V5-L’Or du Temps.pdf
    dossier : ÉTIQUETTES 2026-09/04.THÉS NOIRS/TA711 L OR DU TEMPS
    source  : .ai même version (V5)
    .ai     : RÉFÉRENCES ÉTIQUETTES/TA711 L OR DU TEMPS/ETCNA7112V5-L’Or du Temps.ai
- ETNA711V5-L’Or du Temps.pdf
    dossier : ÉTIQUETTES 2026-09/04.THÉS NOIRS/TA711 L OR DU TEMPS
    source  : .ai même version (V5)
    .ai     : RÉFÉRENCES ÉTIQUETTES/TA711 L OR DU TEMPS/ETNA711V5-L’Or du Temps.ai

### TA7152 Tonic tonight [JDG]
- ETCNA7152V5-Tonic tonight.pdf
    dossier : ÉTIQUETTES 2026-09/04.THÉS NOIRS/TA715 TONIC TONIGHT
    source  : aucun .ai
- ETNA715V5-Tonic tonight.pdf
    dossier : ÉTIQUETTES 2026-09/04.THÉS NOIRS/TA715 TONIC TONIGHT
    source  : aucun .ai

### TA7192 Finest Earl Grey [JDG]
- ETCNA7192V5-Finest Earl Grey.pdf
    dossier : ÉTIQUETTES 2026-09/04.THÉS NOIRS/TA719 FINEST EARL GREY
    source  : aucun .ai
- ETNA719V5-Finest Earl Grey.pdf
    dossier : ÉTIQUETTES 2026-09/04.THÉS NOIRS/TA719 FINEST EARL GREY
    source  : aucun .ai

### TA7202 Gorgée de Soleil [JDG]
- ETCNA7202V5-Gorgée de Soleil.pdf
    dossier : ÉTIQUETTES 2026-09/04.THÉS NOIRS/TA720 GORGÉE DE SOLEIL
    source  : aucun .ai
- ETNA720V5-Gorgée de Soleil.pdf
    dossier : ÉTIQUETTES 2026-09/04.THÉS NOIRS/TA720 GORGÉE DE SOLEIL
    source  : aucun .ai

### TA7282 Taj Mahal [JDG]
- ETCNA7282V5-Taj Mahal.pdf
    dossier : ÉTIQUETTES 2026-09/04.THÉS NOIRS/TA728 TAJ MAHAL
    source  : aucun .ai
- ETNA728V5-Taj Mahal V1.pdf
    dossier : ÉTIQUETTES 2026-09/04.THÉS NOIRS/TA728 TAJ MAHAL
    source  : aucun .ai

### TA7322 Persian love [JDG]
- ETCNA7322V5-Persian love.pdf
    dossier : ÉTIQUETTES 2026-09/04.THÉS NOIRS/TA732 PERSIAN LOVE
    source  : .ai même version (V5)
    .ai     : RÉFÉRENCES ÉTIQUETTES/TA732 PERSIAN LOVE/ETCNA7322V5-Persian love.ai
- ETNA732V5-Persian love.pdf
    dossier : ÉTIQUETTES 2026-09/04.THÉS NOIRS/TA732 PERSIAN LOVE
    source  : .ai même version (V5)
    .ai     : RÉFÉRENCES ÉTIQUETTES/TA732 PERSIAN LOVE/ETNA732V5-Persian love.ai

### TA7362 Sur les traces de Bouddha [JDG]
- ETCNA7362V5-Sur les traces de Bouddha.pdf
    dossier : ÉTIQUETTES 2026-09/04.THÉS NOIRS/TA736 SUR LES TRACES DE BOUDDHA
    source  : aucun .ai
- ETNA736V5-Sur les traces de Bouddha.pdf
    dossier : ÉTIQUETTES 2026-09/04.THÉS NOIRS/TA736 SUR LES TRACES DE BOUDDHA
    source  : aucun .ai

### TH2602 Lemongrass [JDG]
- ETHN2600V5-Lemongrass.pdf
    dossier : ÉTIQUETTES 2026-09/08.INFUSIONS DE PLANTES/ARCHIVES/TH260-LEMONGRASS
    source  : .ai même version (V5)
    .ai     : RÉFÉRENCES ÉTIQUETTES/TH260-LEMONGRASS/ETHN2600V5-Lemongrass.ai

### TJ2142 Sencha Fukamushi [JDG]
- ETCVJ2142V5-Sencha Fukamushi.pdf
    dossier : ÉTIQUETTES 2026-09/02.THÉS VERTS/TJ214 SENCHA FUKAMUSHI
    source  : aucun .ai
- ETVJ214V5-Sencha Fukamushi.pdf
    dossier : ÉTIQUETTES 2026-09/02.THÉS VERTS/TJ214 SENCHA FUKAMUSHI
    source  : aucun .ai

### TM0102 Love supreme [JDG]
- ETCNM0102V5-Love supreme.pdf
    dossier : ÉTIQUETTES 2026-09/04.THÉS NOIRS/TM010 LOVE SUPREME
    source  : .ai même version (V5)
    .ai     : RÉFÉRENCES ÉTIQUETTES/TM010 LOVE SUPREME/ETCNM0102V5-Love supreme.ai
- ETNM010V5-Love supreme.pdf
    dossier : ÉTIQUETTES 2026-09/04.THÉS NOIRS/TM010 LOVE SUPREME
    source  : .ai même version (V5)
    .ai     : RÉFÉRENCES ÉTIQUETTES/TM010 LOVE SUPREME/ETNM010V5-Love supreme.ai

### TM6862 Casablanca Dream [JDG]
- ETCVM6862V5-Casablanca Dream.pdf
    dossier : ÉTIQUETTES 2026-09/02.THÉS VERTS/TM686 CASABLANCA DREAM
    source  : aucun .ai
- ETVM686V5-Casablanca Dream.pdf
    dossier : ÉTIQUETTES 2026-09/02.THÉS VERTS/TM686 CASABLANCA DREAM
    source  : aucun .ai

### TM6892 Douce Digestion [JDG]
- ETCVM6892V5-Douce Digestion.pdf
    dossier : ÉTIQUETTES 2026-09/02.THÉS VERTS/TM689 DOUCE DIGESTION
    source  : aucun .ai
- ETVM689V5-Douce Digestion.pdf
    dossier : ÉTIQUETTES 2026-09/02.THÉS VERTS/TM689 DOUCE DIGESTION
    source  : aucun .ai

### TM7882 … Mon Amour [JDG]
- ETCNM7882V6-Mon Amour.pdf
    dossier : ÉTIQUETTES 2026-09/04.THÉS NOIRS/TM788 MON AMOUR
    source  : aucun .ai
- ETNM788V6-Mon Amour.pdf
    dossier : ÉTIQUETTES 2026-09/04.THÉS NOIRS/TM788 MON AMOUR
    source  : aucun .ai

### TM7902 Tea Time [JDG]
- ETCNM7902V5-Tea Time.pdf
    dossier : ÉTIQUETTES 2026-09/04.THÉS NOIRS/TM790 TEA TIME
    source  : aucun .ai
- ETNM790V5-Tea Time.pdf
    dossier : ÉTIQUETTES 2026-09/04.THÉS NOIRS/TM790 TEA TIME
    source  : aucun .ai

### TN4002 Pu'er [JDG]
- ETCNN4002V5-Pu'er.pdf
    dossier : ÉTIQUETTES 2026-09/04.THÉS NOIRS/TN400 PU'ER
    source  : aucun .ai
- ETNN400V5-Pu'er.pdf
    dossier : ÉTIQUETTES 2026-09/04.THÉS NOIRS/TN400 PU'ER
    source  : aucun .ai

### TN4022 Yunnan [JDG]
- ETCNN4022V5-Yunnan.pdf
    dossier : ÉTIQUETTES 2026-09/04.THÉS NOIRS/TN402 YUNNAN FOP
    source  : aucun .ai
- ETNN402V5-Yunnan.pdf
    dossier : ÉTIQUETTES 2026-09/04.THÉS NOIRS/TN402 YUNNAN FOP
    source  : aucun .ai

### TN4032 Keemun [JDG]
- ETCNN4032V5-Keemun.pdf
    dossier : ÉTIQUETTES 2026-09/04.THÉS NOIRS/TN403 KEEMUN OP
    source  : .ai même version (V5)
    .ai     : RÉFÉRENCES ÉTIQUETTES/TN403 KEEMUN OP/ETCNN4032V5-Keemun.ai
- ETNN403V5-Keemun.pdf
    dossier : ÉTIQUETTES 2026-09/04.THÉS NOIRS/TN403 KEEMUN OP
    source  : .ai même version (V5)
    .ai     : RÉFÉRENCES ÉTIQUETTES/TN403 KEEMUN OP/ETNN403V5-Keemun.ai

### TN4062 Roi du Yunnan d’Or [JDG]
- ETCNN4062V5-Roi du Yunnan d’Or.pdf
    dossier : ÉTIQUETTES 2026-09/04.THÉS NOIRS/TN406 ROI DU YUNNAN D'OR
    source  : aucun .ai
- ETNN406V5-Roi du Yunnan d’Or.pdf
    dossier : ÉTIQUETTES 2026-09/04.THÉS NOIRS/TN406 ROI DU YUNNAN D'OR
    source  : aucun .ai

### TN4066 Roi du Yunnan d’Or [JDG]
- ETNN406V5-Roi du Yunnan d’Or.pdf
    dossier : ÉTIQUETTES 2026-09/04.THÉS NOIRS/TN406 ROI DU YUNNAN D'OR
    source  : aucun .ai

### TN4676 Grand Keemun FOP [JDG]
- ETCNN4676V5-Grand Keemun FOP.pdf
    dossier : ÉTIQUETTES 2026-09/04.THÉS NOIRS/TN467 GRAND KEEMUN FOP
    source  : .ai même version (V5)
    .ai     : RÉFÉRENCES ÉTIQUETTES/TN467 GRAND KEEMUN FOP/ETCNN4676V5-Grand Keemun FOP V1.ai
- ETNN467V5-Grand Keemun FOP.pdf
    dossier : ÉTIQUETTES 2026-09/04.THÉS NOIRS/TN467 GRAND KEEMUN FOP
    source  : .ai même version (V5)
    .ai     : RÉFÉRENCES ÉTIQUETTES/TN467 GRAND KEEMUN FOP/ETNN467V5-Grand Keemun FOP.ai

### TN5472 Noir du Laos [JDG]
- ETCNN5472V5-Noir du Laos.pdf
    dossier : ÉTIQUETTES 2026-09/04.THÉS NOIRS/TN5472 NOIR DU LAOS
    source  : aucun .ai
- ETNN547V5-Noir du Laos.pdf
    dossier : ÉTIQUETTES 2026-09/04.THÉS NOIRS/TN5472 NOIR DU LAOS
    source  : aucun .ai

### TR2002 Rooibos [JDG]
- ETCRN2002V5-Rooibos.pdf
    dossier : ÉTIQUETTES 2026-09/05.ROOIBOS/TR200 ROOIBOS NATURE
    source  : aucun .ai
- ETRN200V5-Rooibos.pdf
    dossier : ÉTIQUETTES 2026-09/05.ROOIBOS/TR200 ROOIBOS NATURE
    source  : aucun .ai

### TR2042 Magie des bois [JDG]
- ETCRA2042V5-Magie des bois vecto.pdf
    dossier : ÉTIQUETTES 2026-09/05.ROOIBOS/TR204 MAGIE DES BOIS
    source  : .ai même version (V5)
    .ai     : RÉFÉRENCES ÉTIQUETTES/TR204 MAGIE DES BOIS/ETCRA2042V5-Magie des bois.ai
- ETCRA2042V5-Magie des bois.pdf
    dossier : ÉTIQUETTES 2026-09/05.ROOIBOS/TR204 MAGIE DES BOIS
    source  : .ai même version (V5)
    .ai     : RÉFÉRENCES ÉTIQUETTES/TR204 MAGIE DES BOIS/ETCRA2042V5-Magie des bois.ai
- ETRA204V5-Magie des bois.pdf
    dossier : ÉTIQUETTES 2026-09/05.ROOIBOS/TR204 MAGIE DES BOIS
    source  : .ai même version (V5)
    .ai     : RÉFÉRENCES ÉTIQUETTES/TR204 MAGIE DES BOIS/ETRA204V5-Magie des bois.ai

### TR2102 Parfum de Soleil [JDG]
- ETCRA2102V5-Parfum de Soleil.pdf
    dossier : ÉTIQUETTES 2026-09/05.ROOIBOS/TR210 PARFUM DE SOLEIL
    source  : .ai même version (V5)
    .ai     : RÉFÉRENCES ÉTIQUETTES/TR210 PARFUM DE SOLEIL/ETCRA2102V5-Parfum de Soleil.ai
- ETRA210V5-Parfum de Soleil.pdf
    dossier : ÉTIQUETTES 2026-09/05.ROOIBOS/TR210 PARFUM DE SOLEIL
    source  : .ai même version (V5)
    .ai     : RÉFÉRENCES ÉTIQUETTES/TR210 PARFUM DE SOLEIL/ETRA210V5-Parfum de Soleil.ai

### TR2162 Halloween [JDG]
- ETCRA2162V5-Halloween.pdf
    dossier : ÉTIQUETTES 2026-09/05.ROOIBOS/TR216 HALLOWEEN
    source  : .ai même version (V5)
    .ai     : RÉFÉRENCES ÉTIQUETTES/TR216 HALLOWEEN/ETCRA2162V5-Halloween.ai
- ETRA216V5-Halloween.pdf
    dossier : ÉTIQUETTES 2026-09/05.ROOIBOS/TR216 HALLOWEEN
    source  : .ai même version (V5)
    .ai     : RÉFÉRENCES ÉTIQUETTES/TR216 HALLOWEEN/ETRA216V5-Halloween.ai

### TR2232 Ginger Lemon [JDG]
- ETCRM2232V5-Ginger Lemon.pdf
    dossier : ÉTIQUETTES 2026-09/05.ROOIBOS/TR223 GINGER LEMON
    source  : aucun .ai
- ETRM223V5-Ginger Lemon.pdf
    dossier : ÉTIQUETTES 2026-09/05.ROOIBOS/TR223 GINGER LEMON
    source  : aucun .ai

### TR2262 Tout feu tout flamme [JDG]
- ETCRA2262V5-Tout feu tout flamme.pdf
    dossier : ÉTIQUETTES 2026-09/05.ROOIBOS/TR226 TOUT FEU TOUT FLAMME
    source  : aucun .ai
- ETRA226V5-Tout feu tout flamme.pdf
    dossier : ÉTIQUETTES 2026-09/05.ROOIBOS/TR226 TOUT FEU TOUT FLAMME
    source  : aucun .ai

### TR2402 Rooibos sauvage [JDG]
- ETCRN2402V5-Rooibos sauvage V2.pdf
    dossier : ÉTIQUETTES 2026-09/05.ROOIBOS/TR240 ROOIBOS SAUVAGE
    source  : aucun .ai
- ETRN240V5-Rooibos sauvage V1.pdf
    dossier : ÉTIQUETTES 2026-09/05.ROOIBOS/TR240 ROOIBOS SAUVAGE
    source  : aucun .ai

### TR2502 Rooibos vert [JDG]
- ETCRN2502V5-Rooibos vert.pdf
    dossier : ÉTIQUETTES 2026-09/05.ROOIBOS/TR250 ROOIBOS VERT
    source  : aucun .ai
- ETRN250V5-Rooibos vert.pdf
    dossier : ÉTIQUETTES 2026-09/05.ROOIBOS/TR250 ROOIBOS VERT
    source  : aucun .ai

### TV1232 Yunnan Green [JDG]
- ETCVN1232V5-Yunnan Green.pdf
    dossier : ÉTIQUETTES 2026-09/02.THÉS VERTS/TV123 YUNNAN GREEN
    source  : aucun .ai
- ETVN123V5-Yunnan Green.pdf
    dossier : ÉTIQUETTES 2026-09/02.THÉS VERTS/TV123 YUNNAN GREEN
    source  : aucun .ai

### TV1262 Genmaicha matcha [JDG]
- ETCVM1262V5-Genmaicha matcha.pdf
    dossier : ÉTIQUETTES 2026-09/02.THÉS VERTS/TV126 GENMAICHA MATCHA
    source  : aucun .ai
- ETVM126V5-Genmaicha matcha.pdf
    dossier : ÉTIQUETTES 2026-09/02.THÉS VERTS/TV126 GENMAICHA MATCHA
    source  : aucun .ai

### TV4212 Sencha Chine [JDG]
- ETCVN4212V5-Sencha Chine.pdf
    dossier : ÉTIQUETTES 2026-09/02.THÉS VERTS/TV421 SENCHA CHINE
    source  : aucun .ai
- ETVN421V5-Sencha Chine.pdf
    dossier : ÉTIQUETTES 2026-09/02.THÉS VERTS/TV421 SENCHA CHINE
    source  : aucun .ai

### TV4312 Pin Ho Jade [JDG]
- ETCVN4312V5-Pin Ho Jade.pdf
    dossier : ÉTIQUETTES 2026-09/02.THÉS VERTS/TV431 PIN HO JADE
    source  : .ai même version (V5)
    .ai     : RÉFÉRENCES ÉTIQUETTES/TV431 PIN HO JADE/ETCVN4312V5-Pin Ho Jade.ai
- ETVN431V5-Pin Ho Jade.pdf
    dossier : ÉTIQUETTES 2026-09/02.THÉS VERTS/TV431 PIN HO JADE
    source  : .ai même version (V5)
    .ai     : RÉFÉRENCES ÉTIQUETTES/TV431 PIN HO JADE/ETVN431V5-Pin Ho Jade.ai

### TV4342 Seogwang Summer Green [JDG]
- ETCVN4342V5-Seogwang Summer Green.pdf
    dossier : ÉTIQUETTES 2026-09/02.THÉS VERTS/TV434 SEOGWANG SUMMER GREEN
    source  : aucun .ai
- ETVN434V5-Seogwang Summer Green.pdf
    dossier : ÉTIQUETTES 2026-09/02.THÉS VERTS/TV434 SEOGWANG SUMMER GREEN
    source  : aucun .ai

### TV4542 Wu Lü Spécial [JDG]
- ETCVN4542V5-Wu Lü Spécial.pdf
    dossier : ÉTIQUETTES 2026-09/02.THÉS VERTS/TV454 WU LÜ SPÉCIAL
    source  : aucun .ai
- ETVN454V5-Wu Lü Spécial.pdf
    dossier : ÉTIQUETTES 2026-09/02.THÉS VERTS/TV454 WU LÜ SPÉCIAL
    source  : aucun .ai

### TV4546 Wu Lü Spécial [JDG]
- ETCVN4546V5-Wu Lü Spécial.pdf
    dossier : ÉTIQUETTES 2026-09/02.THÉS VERTS/TV454 WU LÜ SPÉCIAL
    source  : aucun .ai
- ETVN454V5-Wu Lü Spécial.pdf
    dossier : ÉTIQUETTES 2026-09/02.THÉS VERTS/TV454 WU LÜ SPÉCIAL
    source  : aucun .ai

### TV5012 Vert du Laos [JDG]
- ETCVN5012V5-Vert du Laos.pdf
    dossier : ÉTIQUETTES 2026-09/02.THÉS VERTS/TV501 VERT DU LAOS
    source  : aucun .ai
- ETVN501V5-Vert du Laos.pdf
    dossier : ÉTIQUETTES 2026-09/02.THÉS VERTS/TV501 VERT DU LAOS
    source  : aucun .ai

### TV6472 Sencha Top Quality [JDG]
- ETCVN6472V5-Sencha Top Quality.pdf
    dossier : ÉTIQUETTES 2026-09/02.THÉS VERTS/TV647 SENCHA TOP QUALITY
    source  : aucun .ai
- ETVN647V5-Sencha Top Quality.pdf
    dossier : ÉTIQUETTES 2026-09/02.THÉS VERTS/TV647 SENCHA TOP QUALITY
    source  : aucun .ai

### TV6482 Chun Mee Moon Palace [JDG]
- ETCVN6482V5-Chun Mee Moon Palace.pdf
    dossier : ÉTIQUETTES 2026-09/02.THÉS VERTS/TV648 CHUN MEE MOON PALACE
    source  : aucun .ai
- ETVN648V5-Chun Mee Moon Palace.pdf
    dossier : ÉTIQUETTES 2026-09/02.THÉS VERTS/TV648 CHUN MEE MOON PALACE
    source  : aucun .ai

### TV6492 Gunpowder [JDG]
- ETCVN6492V5-Gunpowder.pdf
    dossier : ÉTIQUETTES 2026-09/02.THÉS VERTS/TV649 GUNPOWDER
    source  : .ai même version (V5)
    .ai     : RÉFÉRENCES ÉTIQUETTES/TV649 GUNPOWDER/ETCVN6492V5-Gunpowder.ai
- ETVN649V5-Gunpowder.pdf
    dossier : ÉTIQUETTES 2026-09/02.THÉS VERTS/TV649 GUNPOWDER
    source  : .ai même version (V5)
    .ai     : RÉFÉRENCES ÉTIQUETTES/TV649 GUNPOWDER/ETVN649V5-Gunpowder.ai

### TV6552 Gyokuro [JDG]
- ETCVN6552V5-Gyokuro.pdf
    dossier : ÉTIQUETTES 2026-09/02.THÉS VERTS/TV655 GYOKURO
    source  : .ai même version (V5)
    .ai     : RÉFÉRENCES ÉTIQUETTES/TV655 GYOKURO/ETCVN6552V5-Gyokuro.ai
- ETVN655V5-Gyokuro.pdf
    dossier : ÉTIQUETTES 2026-09/02.THÉS VERTS/TV655 GYOKURO
    source  : .ai même version (V5)
    .ai     : RÉFÉRENCES ÉTIQUETTES/TV655 GYOKURO/ETVN655V5-Gyokuro.ai

### TV6556 Gyokuro [JDG]
- ETCVN6556V5-Gyokuro.pdf
    dossier : ÉTIQUETTES 2026-09/02.THÉS VERTS/TV655 GYOKURO
    source  : .ai même version (V5)
    .ai     : RÉFÉRENCES ÉTIQUETTES/TV655 GYOKURO/ETCVN6556V5-Gyokuro.ai
- ETVN655V5-Gyokuro.pdf
    dossier : ÉTIQUETTES 2026-09/02.THÉS VERTS/TV655 GYOKURO
    source  : .ai même version (V5)
    .ai     : RÉFÉRENCES ÉTIQUETTES/TV655 GYOKURO/ETVN655V5-Gyokuro.ai

### TV6562 Long Jing [JDG]
- ETCVN6562V5-Long Jing.pdf
    dossier : ÉTIQUETTES 2026-09/02.THÉS VERTS/TV656 LONG JING
    source  : .ai même version (V5)
    .ai     : RÉFÉRENCES ÉTIQUETTES/TV656 LONG JING/ETCVN6562V5-Long Jing.ai
- ETVN656V5-Long Jing.pdf
    dossier : ÉTIQUETTES 2026-09/02.THÉS VERTS/TV656 LONG JING
    source  : .ai même version (V5)
    .ai     : RÉFÉRENCES ÉTIQUETTES/TV656 LONG JING/ETVN656V5-Long Jing.ai

### TV6572 Gyokuro Premium [JDG]
- ETCVN6572V5-Gyokuro Premium.pdf
    dossier : ÉTIQUETTES 2026-09/02.THÉS VERTS/TV657 GYOKURO PREMIUM
    source  : .ai même version (V5)
    .ai     : RÉFÉRENCES ÉTIQUETTES/TV657 GYOKURO PREMIUM/ETCVN6572V5-Gyokuro Premium.ai
- ETVN657V5-Gyokuro Premium.pdf
    dossier : ÉTIQUETTES 2026-09/02.THÉS VERTS/TV657 GYOKURO PREMIUM
    source  : .ai même version (V5)
    .ai     : RÉFÉRENCES ÉTIQUETTES/TV657 GYOKURO PREMIUM/ETVN657V5-Gyokuro Premium.ai

### TV6576 Gyokuro Premium [JDG]
- ETCVN6576V5-Gyokuro Premium.pdf
    dossier : ÉTIQUETTES 2026-09/02.THÉS VERTS/TV657 GYOKURO PREMIUM
    source  : .ai même version (V5)
    .ai     : RÉFÉRENCES ÉTIQUETTES/TV657 GYOKURO PREMIUM/ETCVN6576V5-Gyokuro Premium.ai
- ETVN657V5-Gyokuro Premium.pdf
    dossier : ÉTIQUETTES 2026-09/02.THÉS VERTS/TV657 GYOKURO PREMIUM
    source  : .ai même version (V5)
    .ai     : RÉFÉRENCES ÉTIQUETTES/TV657 GYOKURO PREMIUM/ETVN657V5-Gyokuro Premium.ai

### TV6582 Sencha Premium [JDG]
- ETCVN6582V5-Sencha Premium.pdf
    dossier : ÉTIQUETTES 2026-09/02.THÉS VERTS/TV658 SENCHA PREMIUM
    source  : aucun .ai
- ETVN658V5-Sencha Premium.pdf
    dossier : ÉTIQUETTES 2026-09/02.THÉS VERTS/TV658 SENCHA PREMIUM
    source  : aucun .ai

### TV6586 Sencha Premium [JDG]
-  ETCVN6586V5-Sencha Premium.pdf
    dossier : ÉTIQUETTES 2026-09/02.THÉS VERTS/TV658 SENCHA PREMIUM
    source  : aucun .ai
- ETVN658V5-Sencha Premium.pdf
    dossier : ÉTIQUETTES 2026-09/02.THÉS VERTS/TV658 SENCHA PREMIUM
    source  : aucun .ai

### TV6602 Vert de Chine [JDG]
- ETCVN6602V5-Vert de Chine.pdf
    dossier : ÉTIQUETTES 2026-09/02.THÉS VERTS/TV660 VERT DE CHINE
    source  : aucun .ai
- ETVN660V5-Vert de Chine.pdf
    dossier : ÉTIQUETTES 2026-09/02.THÉS VERTS/TV660 VERT DE CHINE
    source  : aucun .ai

### TV6612 Vert de printemps [JDG]
- ETCVN6612V5-Vert de printemps.pdf
    dossier : ÉTIQUETTES 2026-09/02.THÉS VERTS/TV661 VERT DE PRINTEMPS
    source  : aucun .ai
- ETVN661V5-Vert de printemps.pdf
    dossier : ÉTIQUETTES 2026-09/02.THÉS VERTS/TV661 VERT DE PRINTEMPS
    source  : aucun .ai

### TV7362 Jasmine Flowers [JDG]
- ETCVM7362V5-Jasmine Flowers.pdf
    dossier : ÉTIQUETTES 2026-09/02.THÉS VERTS/TV736 JASMINE FLOWERS
    source  : .ai même version (V5)
    .ai     : RÉFÉRENCES ÉTIQUETTES/TV736 JASMINE FLOWERS/ETCVM7362V5-Jasmine Flowers.ai
- ETVM736V5-Jasmine Flowers.pdf
    dossier : ÉTIQUETTES 2026-09/02.THÉS VERTS/TV736 JASMINE FLOWERS
    source  : .ai même version (V5)
    .ai     : RÉFÉRENCES ÉTIQUETTES/TV736 JASMINE FLOWERS/ETVM736V5-Jasmine Flowers.ai

### TV7492 Gunpowder Pinhead [JDG]
- ETCVN7492V5-Gunpowder Pinhead.pdf
    dossier : ÉTIQUETTES 2026-09/02.THÉS VERTS/TV749 GUNPOWDER PINHEAD
    source  : .ai même version (V5)
    .ai     : RÉFÉRENCES ÉTIQUETTES/TV749 GUNPOWDER PINHEAD/ETCVN7492V5-Gunpowder Pinhead.ai
- ETVN749V5-Gunpowder Pinhead.pdf
    dossier : ÉTIQUETTES 2026-09/02.THÉS VERTS/TV749 GUNPOWDER PINHEAD
    source  : .ai même version (V5)
    .ai     : RÉFÉRENCES ÉTIQUETTES/TV749 GUNPOWDER PINHEAD/ETVN749V5-Gunpowder Pinhead.ai

## 2. Préprod : produits dont UNE face seulement est vectorisée (23 produits)

Les autres faces se lisent ; les contrôles sont partiels.

### TA6782 Une nuit à Goa [JDG] : 1 face(s) vectorisée(s) sur 2
- ETVA678V5-Une nuit à Goa.pdf
    dossier : ÉTIQUETTES 2026-09/02.THÉS VERTS/TA678 UNE NUIT À GOA
    source  : aucun .ai

### TA6882 Parfum d’Eden [JDG] : 1 face(s) vectorisée(s) sur 2
- ETVA688V6-Parfum d’Eden.pdf
    dossier : ÉTIQUETTES 2026-09/02.THÉS VERTS/TA688 PARFUM D’EDEN
    source  : .ai autre version (V5 ; BAT en V6)
    .ai     : RÉFÉRENCES ÉTIQUETTES/TA688 PARFUM D’EDEN/ETVA688V5-Parfum d’Eden.ai

### TA6952 Printemps à Kyoto [JDG] : 1 face(s) vectorisée(s) sur 2
- ETVA695V6-Printemps à Kyoto.pdf
    dossier : ÉTIQUETTES 2026-09/02.THÉS VERTS/TA695 PRINTEMPS A KYOTO
    source  : aucun .ai

### TA7022 Earl Grey [JDG] : 1 face(s) vectorisée(s) sur 2
- ETNA702V5-Earl Grey.pdf
    dossier : ÉTIQUETTES 2026-09/04.THÉS NOIRS/TA702 EARL GREY
    source  : aucun .ai

### TA7082 Ramayana [JDG] : 1 face(s) vectorisée(s) sur 2
- ETNA708V5-Ramayana.pdf
    dossier : ÉTIQUETTES 2026-09/04.THÉS NOIRS/TA708 RAMAYANA
    source  : aucun .ai

### TA7222 Thé d'hiver [JDG] : 1 face(s) vectorisée(s) sur 2
- ETNA722V5-Thé d'hiver.pdf
    dossier : ÉTIQUETTES 2026-09/04.THÉS NOIRS/TA722 THÉ D'HIVER
    source  : aucun .ai

### TA7252 Baiser gourmand [JDG] : 1 face(s) vectorisée(s) sur 2
- ETNA725V6-Baiser gourmand.pdf
    dossier : ÉTIQUETTES 2026-09/04.THÉS NOIRS/TA725 BAISER GOURMAND
    source  : aucun .ai

### TA7332 Babouchka [JDG] : 1 face(s) vectorisée(s) sur 2
- ETNA733V7-Babouchka.pdf
    dossier : ÉTIQUETTES 2026-09/04.THÉS NOIRS/TA733 BABOUCHKA
    source  : aucun .ai

### TA9026 Le pouvoir des fleurs [JDG] : 1 face(s) vectorisée(s) sur 2
- ETOA902V6-Le pouvoir des fleurs.pdf
    dossier : ÉTIQUETTES 2026-09/03.THÉS WULONG/TA902 LE POUVOIR DES FLEURS
    source  : .ai autre version (V5 ; BAT en V6)
    .ai     : RÉFÉRENCES ÉTIQUETTES/TA902 LE POUVOIR DES FLEURS/ETOA902V5-Le pouvoir des fleurs.ai

### TB4036 Bai Mu Dan Premium [JDG] : 1 face(s) vectorisée(s) sur 2
- ETCBN4036V5-Bai Mu Dan Premium.pdf
    dossier : ÉTIQUETTES 2026-09/01.THÉS BLANCS/TB403 BAI MU DAN PREMIUM
    source  : aucun .ai

### TB7916 Bai Mu Dan [JDG] : 1 face(s) vectorisée(s) sur 2
- ETBN791V5-Bai Mu Dan.pdf
    dossier : ÉTIQUETTES 2026-09/01.THÉS BLANCS/TB791 BAI MU DAN
    source  : aucun .ai

### TJ2022 Thé vert au yuzu [JDG] : 1 face(s) vectorisée(s) sur 2
- ETVA202V5-Thé vert au yuzu.pdf
    dossier : ÉTIQUETTES 2026-09/02.THÉS VERTS/TJ202 THÉ VERT AU YUZU
    source  : aucun .ai

### TJ2152 Aki Bancha [JDG] : 1 face(s) vectorisée(s) sur 2
- ETVJ215V5-Aki Bancha.pdf
    dossier : ÉTIQUETTES 2026-09/02.THÉS VERTS/TJ215 AKI BANCHA
    source  : aucun .ai

### TL1002 Lapacho nature [JDG] : 1 face(s) vectorisée(s) sur 2
- ETLN100V7-Lapacho nature.pdf
    dossier : ÉTIQUETTES 2026-09/06.LES BIENFAITRICES/TL100-LAPACHO NATURE
    source  : .ai autre version (V6 ; BAT en V7)
    .ai     : RÉFÉRENCES ÉTIQUETTES/TL100-LAPACHO NATURE/ETLN100V6-Lapacho nature.ai

### TL4032 Lapacho Agrumes [JDG] : 1 face(s) vectorisée(s) sur 2
- ETLA403V6-Lapacho Agrumes.pdf
    dossier : ÉTIQUETTES 2026-09/06.LES BIENFAITRICES/TL403-LAPACHO AGRUMES
    source  : .ai autre version (V5 ; BAT en V6)
    .ai     : RÉFÉRENCES ÉTIQUETTES/TL403-LAPACHO AGRUMES/ETLA403V5-Lapacho Agrumes.ai

### TN3112 Selimbong Autumnal [JDG] : 1 face(s) vectorisée(s) sur 2
- ETNN311V6-Selimbong Autumnal.pdf
    dossier : ÉTIQUETTES 2026-09/04.THÉS NOIRS/TN311 SELIMBONG AUTUMNAL
    source  : aucun .ai

### TN4672 Grand Keemun FOP [JDG] : 1 face(s) vectorisée(s) sur 2
- ETNN467V5-Grand Keemun FOP.pdf
    dossier : ÉTIQUETTES 2026-09/04.THÉS NOIRS/TN467 GRAND KEEMUN FOP
    source  : .ai même version (V5)
    .ai     : RÉFÉRENCES ÉTIQUETTES/TN467 GRAND KEEMUN FOP/ETNN467V5-Grand Keemun FOP.ai

### TR2142 Zoulou Digest [JDG] : 1 face(s) vectorisée(s) sur 2
- ETRM214V5-Zoulou Digest.pdf
    dossier : ÉTIQUETTES 2026-09/05.ROOIBOS/TR214 ZOULOU DIGEST
    source  : aucun .ai

### TR2212 Au coin du feu [JDG] : 1 face(s) vectorisée(s) sur 2
- ETRM221V5-Au coin du feu.pdf
    dossier : ÉTIQUETTES 2026-09/05.ROOIBOS/TR221 AU COIN DU FEU
    source  : aucun .ai

### TR2322 Asimbonanga [JDG] : 1 face(s) vectorisée(s) sur 2
- ETRA232V6-Asimbonanga.pdf
    dossier : ÉTIQUETTES 2026-09/05.ROOIBOS/TR232 ASIMBONANGA
    source  : aucun .ai

### TR2462 Respire la vie [JDG] : 1 face(s) vectorisée(s) sur 2
- ETCRA2462V5-Respire la vie.pdf
    dossier : ÉTIQUETTES 2026-09/05.ROOIBOS/TR246 RESPIRE LA VIE
    source  : aucun .ai

### TR2602 Rooibos [JDG] : 1 face(s) vectorisée(s) sur 2
- ETRN260V6-Rooibos.pdf
    dossier : ÉTIQUETTES 2026-09/05.ROOIBOS/TR260 ROOIBOS
    source  : aucun .ai

### TV4322 Seogwang Sencha Spring [JDG] : 1 face(s) vectorisée(s) sur 2
- ETVN432V5-Seogwang Sencha Spring.pdf
    dossier : ÉTIQUETTES 2026-09/02.THÉS VERTS/TV432 SEOGWANG SENCHA SPRING
    source  : aucun .ai

## 3. Préprod : PDF vectorisés rattachés à un produit mais désactivés (5)

Ancienne version ou autre format : l'audit ne les lit pas. Basse priorité.

[TM0202]
- ETBA020V6-Avec les Anges.pdf
    dossier : ÉTIQUETTES 2026-09/01.THÉS BLANCS/TM020 AVEC LES ANGES
    source  : aucun .ai
[TA6132]
- ETVA613V5-Surprise !.pdf
    dossier : ÉTIQUETTES 2026-09/02.THÉS VERTS/TA613 SURPRISE !
    source  : aucun .ai
[TA6742]
- ETCVA6742V5-Caprice Gourmand.pdf
    dossier : ÉTIQUETTES 2026-09/02.THÉS VERTS/TA674 CAPRICE GOURMAND
    source  : aucun .ai
[TA6742]
- ETVA674V5-Caprice gourmand.pdf
    dossier : ÉTIQUETTES 2026-09/02.THÉS VERTS/TA674 CAPRICE GOURMAND
    source  : aucun .ai
[TM0182]
- ETCHM0182V5-Parenthèse gourmande vecto.pdf
    dossier : ÉTIQUETTES 2026-09/08.INFUSIONS DE PLANTES/TM018-PARENTHÈSE CHOCOLATÉE
    source  : .ai même version (V5)
    .ai     : RÉFÉRENCES ÉTIQUETTES/TM018-PARENTHÈSE GOURMANDE/ETCHM0182V5-Parenthèse gourmande.ai

## 4. Préprod : PDF vectorisés rattachés à AUCUN produit (122)

Surtout Terra Madre et infusettes, pas encore importés en fiches. À traiter quand leur catalogue sera construit.

### 10.INFUSETTES (122)
- IF401 Thé noir Finest Earl Grey x15 v5.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/IF401 THE NOIR FINEST EARL GREY X15
    source  : aucun .ai
- IF401 Thé noir Finest Earl Grey x15 v5_EN.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/IF401 THE NOIR FINEST EARL GREY X15
    source  : aucun .ai
- IF404 Thé Noir Darjeeling V5.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/IF404 THE NOIR DARJEELING X15
    source  : aucun .ai
- IF404 Thé Noir Darjeeling V5_EN.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/IF404 THE NOIR DARJEELING X15
    source  : aucun .ai
- IF405 Thé Noir English Breakfast V5.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/IF405 THE NOIR ENGLISH BREAKFAST X15
    source  : aucun .ai
- IF405 Thé Noir English Breakfast V5_EN.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/IF405 THE NOIR ENGLISH BREAKFAST X15
    source  : aucun .ai
- IF408 Thé Noir de Noel V5_EN.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/IF408 THE DE NOEL X15
    source  : aucun .ai
- IF412 Thé Vert Menthe V5.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/IF412 THE VERT MENTHE X15
    source  : aucun .ai
- IF412 Thé Vert Menthe V5_EN.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/IF412 THE VERT MENTHE X15
    source  : aucun .ai
- IF413 Thé Vert Exotique V5.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/IF413 THE VERT EXOTIQUE X15
    source  : aucun .ai
- IF413 Thé Vert Exotique V5_EN.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/IF413 THE VERT EXOTIQUE X15
    source  : aucun .ai
- IF414 Thé Vert Peche Melba V5.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/IF414 THE VERT PECHE MELBA X15
    source  : aucun .ai
- IF414 Thé Vert Peche Melba V5_EN.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/IF414 THE VERT PECHE MELBA X15
    source  : aucun .ai
- IF417 Thé Vert Nature V5.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/IF417 THE VERT NATURE X15
    source  : aucun .ai
- IF417 Thé Vert Nature V5_EN.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/IF417 THE VERT NATURE X15
    source  : aucun .ai
- IF423 Rooisbos Nature IF423 V5_EN.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/IF423 ROOIBOS NATURE X15
    source  : aucun .ai
- IF427 Rooibos Orange Epices V5.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/IF427 ROOIBOS ORANGE EPICES X15
    source  : aucun .ai
- IF427 Rooibos Orange Epices V5_EN.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/IF427 ROOIBOS ORANGE EPICES X15
    source  : aucun .ai
- IF431 Infusion Plante - Camomille V5.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/IF431 CAMOMILLE X15
    source  : aucun .ai
- IF431 Infusion Plante - Camomille V5_EN.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/IF431 CAMOMILLE X15
    source  : aucun .ai
- IF432 Repas Relax V5.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/IF432 REPAS RELAX X15
    source  : aucun .ai
- IF432 Repas Relax V5_EN.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/IF432 REPAS RELAX X15
    source  : aucun .ai
- IF435 Infusion Plante - Verveine V5.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/IF435 VERVEINE X15
    source  : aucun .ai
- IF435 Infusion Plante - Verveine V5_EN.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/IF435 VERVEINE X15
    source  : aucun .ai
- IF437 Infusion Plantes - Curcuma Gingembre V5.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/IF437 CURCUMA GINGEMBRE X15
    source  : aucun .ai
- IF437 Infusion Plantes - Curcuma Gingembre V5_EN.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/IF437 CURCUMA GINGEMBRE X15
    source  : aucun .ai
- IF438 Infusion Plantes - Calmetoux V5.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/IF438 CALMETOUX X15
    source  : aucun .ai
- IF438 Infusion Plantes - Calmetoux V5_EN.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/IF438 CALMETOUX X15
    source  : aucun .ai
- IF442 Infusion Fruits - Fruit Qui Rougit V5.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/IF442 LE FRUIT QUI ROUGIT X15
    source  : aucun .ai
- IF442 Infusion Fruits - Fruit Qui Rougit V5_EN.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/IF442 LE FRUIT QUI ROUGIT X15
    source  : aucun .ai
- IF450 Thé Blanc Mangue Peche V5.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/IF450 THE BLANC MANGUE PECHE X15
    source  : aucun .ai
- IF450 Thé Blanc Mangue Peche V5_EN.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/IF450 THE BLANC MANGUE PECHE X15
    source  : aucun .ai
- IF501 THE NOIR FINEST EARL GREY vecto.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/IF501 THE NOIR FINEST EARL GREY X50
    source  : aucun .ai
- IF502 THE NOIR FRUITS ROUGES vecto.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/IF502 THE NOIR FRUITS ROUGES X50
    source  : aucun .ai
- IF504 THE NOIR DARJEELING vecto.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/IF504 THE NOIR DARJEELING X50
    source  : aucun .ai
- IF505 THE NOIR ENGLISH BREAKFAST vecto.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/IF505 THE NOIR ENGLISH BREAKFAST X50
    source  : aucun .ai
- IF507 THE NOIR GOÛT RUSSE vecto.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/IF507 THE NOIR GOUT RUSSE X50
    source  : aucun .ai
- IF508 THE DE NOËL vecto.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/IF508 THE DE NOEL X50
    source  : aucun .ai
- IF512 THE VERT MENTHE vecto.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/IF512 THE VERT MENTHE X50
    source  : aucun .ai
- IF513 THE VERT EXOTIQUE vecto.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/IF513 THE VERT EXOTIQUE X50
    source  : aucun .ai
- IF514 THE VERT PECHE MELBA vecto.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/IF514 THE VERT PECHE MELBA X50
    source  : aucun .ai
- IF515 THE VERT AGRUMES vecto.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/IF515 THE VERT AGRUMES X50
    source  : aucun .ai
- IF517 THE VERT NATURE vecto.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/IF517 THE VERT NATURE X50
    source  : aucun .ai
- IF523 ROOIBOS NATURE vecto.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/IF523 ROOIBOS NATURE X50
    source  : aucun .ai
- IF527 ROOIBOS ORANGE EPICES vecto.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/IF527 ROOIBOS ORANGE EPICES X50
    source  : aucun .ai
- IF531 CAMOMILLE.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/IF531 CAMOMILLE X 50
    source  : aucun .ai
- IF535 VERVEINE.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/IF535 VERVEINE X50
    source  : aucun .ai
- IF537 CURCUMA GINGEMBRE vecto.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/IF537 CURCUMA GINGEMBRE X50
    source  : aucun .ai
- IF538 CALMETOUX vecto.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/IF538 CALMETOUX X50
    source  : aucun .ai
- IF542 LE FRUIT QUI ROUGIT vecto.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/IF542 LE FRUIT QUI ROUGIT X50
    source  : aucun .ai
- IF550 THE BLANC MANGUE PECHE.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/IF550 THE BLANC MANGUE PECHE X50
    source  : aucun .ai
- IF560 THE WULONG CITRON GINGEMBRE vecto.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/IF560 THE WULONG CITRON GINGEMBRE X50
    source  : aucun .ai
- IF103-PU'ER_OK.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/z_Archives/Envoyé à Pages le 30 aout/Etuis
    source  : aucun .ai
- IF108-JOYEUX-NOËL_OK.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/z_Archives/Envoyé à Pages le 30 aout/Etuis
    source  : aucun .ai
- IF111-THÉ-VERT-AU-JASMIN_OK.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/z_Archives/Envoyé à Pages le 30 aout/Etuis
    source  : aucun .ai
- IF113-THÉ VERT À LA MANGUE_OK.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/z_Archives/Envoyé à Pages le 30 aout/Etuis
    source  : aucun .ai
- IF115-EARL-GREY-VERT_OK.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/z_Archives/Envoyé à Pages le 30 aout/Etuis
    source  : aucun .ai
- IF117-THÉ-VERT-SENCHA CHINE_OK.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/z_Archives/Envoyé à Pages le 30 aout/Etuis
    source  : aucun .ai
- IF119-THÉ-VERT-HIVER_GOURMAND_OK.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/z_Archives/Envoyé à Pages le 30 aout/Etuis
    source  : aucun .ai
- IF126-DOUCEUR ÉTOILÉE_OK.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/z_Archives/Envoyé à Pages le 30 aout/Etuis
    source  : aucun .ai
- IF127-ROOIBOS_AGRUMES_OK.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/z_Archives/Envoyé à Pages le 30 aout/Etuis
    source  : aucun .ai
- IF151 - POÉSIE D'HIVER_OK.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/z_Archives/Envoyé à Pages le 30 aout/Etuis
    source  : aucun .ai
- IF103 PU'ER SOMBRE.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/z_Archives/Envoyé à Pages le 30 aout/TAG
    source  : aucun .ai
- IF108 JOYEUX NOËL.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/z_Archives/Envoyé à Pages le 30 aout/TAG
    source  : aucun .ai
- IF111 THÉ VERT AU JASMIN.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/z_Archives/Envoyé à Pages le 30 aout/TAG
    source  : aucun .ai
- IF113 THÉ VERT À LA MANGUE.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/z_Archives/Envoyé à Pages le 30 aout/TAG
    source  : aucun .ai
- IF115 THE VERT EARL GREY.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/z_Archives/Envoyé à Pages le 30 aout/TAG
    source  : aucun .ai
- IF117 THÉ VERT SENCHA CHINE.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/z_Archives/Envoyé à Pages le 30 aout/TAG
    source  : aucun .ai
- IF119 HIVER GOURMAND.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/z_Archives/Envoyé à Pages le 30 aout/TAG
    source  : aucun .ai
- IF126 DOUCEUR ÉTOILÉE.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/z_Archives/Envoyé à Pages le 30 aout/TAG
    source  : aucun .ai
- IF127 ROOIBOS AGRUMES.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/z_Archives/Envoyé à Pages le 30 aout/TAG
    source  : aucun .ai
- IF151 POÉSIE D'HIVER.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/z_Archives/Envoyé à Pages le 30 aout/TAG
    source  : aucun .ai
- IF101-EARL-GREY.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/z_Archives
    source  : aucun .ai
- IF101-EARL-GREY_2.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/z_Archives
    source  : aucun .ai
- IF103-PU'ER_OK.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/z_Archives
    source  : aucun .ai
- IF108-JOYEUX-NOËL_OK.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/z_Archives
    source  : aucun .ai
- IF111-THÉ-VERT-AU-JASMIN.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/z_Archives
    source  : aucun .ai
- IF111-THÉ-VERT-AU-JASMIN_OK.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/z_Archives
    source  : aucun .ai
- IF113-THÉ VERT À LA MANGUE-2.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/z_Archives
    source  : aucun .ai
- IF115-EARL-GREY-VERT-.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/z_Archives
    source  : aucun .ai
- IF117-THÉ-VERT-SENCHA CHINE_OK.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/z_Archives
    source  : aucun .ai
- IF119-THÉ-VERT-HIVER_GOURMAND_OK.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/z_Archives
    source  : aucun .ai
- IF123-ROOIBOS.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/z_Archives
    source  : aucun .ai
- IF126-DOUCEUR ÉTOILÉE_OK.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/z_Archives
    source  : aucun .ai
- IF127-ROOIBOS_AGRUMES.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/z_Archives
    source  : aucun .ai
- IF130-MATÉ-VERT.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/z_Archives
    source  : aucun .ai
- IF150-THÉ-BLANC-LITCHI-ROSE OK.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/z_Archives
    source  : aucun .ai
- IF151 - POÉSIE D'HIVER_OK.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/z_Archives
    source  : aucun .ai
- IF101-EARL-GREY OK.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/z_Archives/PAGES FICHIER PDF VECTORISÉ/ARCHIVES
    source  : aucun .ai
- IF111-THÉ-VERT-AU-JASMIN OK.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/z_Archives/PAGES FICHIER PDF VECTORISÉ/ARCHIVES
    source  : aucun .ai
- IF123-ROOIBOS OK.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/z_Archives/PAGES FICHIER PDF VECTORISÉ/ARCHIVES
    source  : aucun .ai
- IF130-MATÉ-VERT OK.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/z_Archives/PAGES FICHIER PDF VECTORISÉ/ARCHIVES
    source  : aucun .ai
- IF150-THÉ-BLANC-LITCHI-ROSE OK.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/z_Archives/PAGES FICHIER PDF VECTORISÉ/ARCHIVES
    source  : aucun .ai
- IF101-EARL-GREY VECTORISÉ.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/z_Archives/PAGES FICHIER PDF VECTORISÉ/INFUSETTES/FICHIER PDF VECTORISÉ
    source  : aucun .ai
- IF103-PU'ER_OK VECTORISÉ.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/z_Archives/PAGES FICHIER PDF VECTORISÉ/INFUSETTES/FICHIER PDF VECTORISÉ
    source  : aucun .ai
- IF108-JOYEUX-NOËL_OK VECTORISÉ.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/z_Archives/PAGES FICHIER PDF VECTORISÉ/INFUSETTES/FICHIER PDF VECTORISÉ
    source  : aucun .ai
- IF111-THÉ-VERT-AU-JASMIN_OK VECTORISÉ.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/z_Archives/PAGES FICHIER PDF VECTORISÉ/INFUSETTES/FICHIER PDF VECTORISÉ
    source  : aucun .ai
- IF113-THÉ VERT À LA MANGUE VECTORISÉ.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/z_Archives/PAGES FICHIER PDF VECTORISÉ/INFUSETTES/FICHIER PDF VECTORISÉ
    source  : aucun .ai
- IF115-EARL-GREY-VERT- VECTORISÉ.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/z_Archives/PAGES FICHIER PDF VECTORISÉ/INFUSETTES/FICHIER PDF VECTORISÉ
    source  : aucun .ai
- IF116-THÉ-VERT-HIMALAYA_OK VECTORISÉ.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/z_Archives/PAGES FICHIER PDF VECTORISÉ/INFUSETTES/FICHIER PDF VECTORISÉ
    source  : aucun .ai
- IF117-THÉ-VERT-SENCHA CHINE_OK VECTORISÉ.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/z_Archives/PAGES FICHIER PDF VECTORISÉ/INFUSETTES/FICHIER PDF VECTORISÉ
    source  : aucun .ai
- IF119-THÉ-VERT-HIVER_GOURMAND_OK VECTORISÉ.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/z_Archives/PAGES FICHIER PDF VECTORISÉ/INFUSETTES/FICHIER PDF VECTORISÉ
    source  : aucun .ai
- IF123-ROOIBOS VECTORISÉ.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/z_Archives/PAGES FICHIER PDF VECTORISÉ/INFUSETTES/FICHIER PDF VECTORISÉ
    source  : aucun .ai
- IF126-DOUCEUR ÉTOILÉE_OK VECTORISÉ.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/z_Archives/PAGES FICHIER PDF VECTORISÉ/INFUSETTES/FICHIER PDF VECTORISÉ
    source  : aucun .ai
- IF127-ROOIBOS_AGRUMES VECTORISÉ.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/z_Archives/PAGES FICHIER PDF VECTORISÉ/INFUSETTES/FICHIER PDF VECTORISÉ
    source  : aucun .ai
- IF130-MATÉ-VERT VECTORISÉ.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/z_Archives/PAGES FICHIER PDF VECTORISÉ/INFUSETTES/FICHIER PDF VECTORISÉ
    source  : aucun .ai
- IF150-THÉ-BLANC-LITCHI-ROSE VECTORISÉ.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/z_Archives/PAGES FICHIER PDF VECTORISÉ/INFUSETTES/FICHIER PDF VECTORISÉ
    source  : aucun .ai
- IF151 - POÉSIE D'HIVER_OK VECTORISÉ.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/z_Archives/PAGES FICHIER PDF VECTORISÉ/INFUSETTES/FICHIER PDF VECTORISÉ
    source  : aucun .ai
- IF126 DOUCEUR ÉTOILÉE.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/z_Archives/PAGES FICHIER PDF VECTORISÉ/TAGS/ROOIBOS
    source  : aucun .ai
- IF127 ROOIBOS AGRUMES.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/z_Archives/PAGES FICHIER PDF VECTORISÉ/TAGS/ROOIBOS
    source  : aucun .ai
- IF151 POÉSIE D'HIVER.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/z_Archives/PAGES FICHIER PDF VECTORISÉ/TAGS/THÉS BLANCS
    source  : aucun .ai
- IF103 PU'ER SOMBRE.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/z_Archives/PAGES FICHIER PDF VECTORISÉ/TAGS/THÉS NOIRS
    source  : aucun .ai
- IF108 JOYEUX NOËL.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/z_Archives/PAGES FICHIER PDF VECTORISÉ/TAGS/THÉS NOIRS
    source  : aucun .ai
- IF111 THÉ VERT AU JASMIN.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/z_Archives/PAGES FICHIER PDF VECTORISÉ/TAGS/THÉS VERTS
    source  : aucun .ai
- IF112 THÉ VERT MENTHE.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/z_Archives/PAGES FICHIER PDF VECTORISÉ/TAGS/THÉS VERTS
    source  : aucun .ai
- IF113 THÉ VERT À LA MANGUE.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/z_Archives/PAGES FICHIER PDF VECTORISÉ/TAGS/THÉS VERTS
    source  : aucun .ai
- IF115 THE VERT EARL GREY.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/z_Archives/PAGES FICHIER PDF VECTORISÉ/TAGS/THÉS VERTS
    source  : aucun .ai
- IF116 THE VERT HIMALAYA.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/z_Archives/PAGES FICHIER PDF VECTORISÉ/TAGS/THÉS VERTS
    source  : aucun .ai
- IF117 THÉ VERT SENCHA CHINE.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/z_Archives/PAGES FICHIER PDF VECTORISÉ/TAGS/THÉS VERTS
    source  : aucun .ai
- IF119 HIVER GOURMAND.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/z_Archives/PAGES FICHIER PDF VECTORISÉ/TAGS/THÉS VERTS
    source  : aucun .ai
- IF116-THÉ-VERT-HIMALAYA_OK.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/z_Archives/PAGES MODIF FICHIER V2
    source  : aucun .ai
- IF130-MATÉ-VERT.pdf
    dossier : ÉTIQUETTES 2026-09/10.INFUSETTES/z_Archives/PAGES MODIF FICHIER V2
    source  : aucun .ai

## 5. Prod (versement de mars, dossier RÉFÉRENCES ÉTIQUETTES) : PDF vectorisés (53)

Ancien versement, distinct de l'archive de septembre (2 fichiers seulement en commun). Pour mémoire.

- ETCVA6752V5-Lady Yang Guifei - à passer en V6.pdf
    dossier : RÉFÉRENCES ÉTIQUETTES/TA675 LADY YANG GUIFEI
    source  : .ai même version (V5)
    .ai     : RÉFÉRENCES ÉTIQUETTES/TA675 LADY YANG GUIFEI/ETCVA6752V5-Lady Yang Guifei - à passer en V6.ai
- ETCVA6882V5-Parfum d’Eden.pdf
    dossier : RÉFÉRENCES ÉTIQUETTES/TA688 PARFUM D’EDEN
    source  : .ai même version (V5)
    .ai     : RÉFÉRENCES ÉTIQUETTES/TA688 PARFUM D’EDEN/ETCVA6882V5-Parfum d’Eden.ai
- ETVA688V5-Parfum d’Eden.pdf
    dossier : RÉFÉRENCES ÉTIQUETTES/TA688 PARFUM D’EDEN
    source  : .ai même version (V5)
    .ai     : RÉFÉRENCES ÉTIQUETTES/TA688 PARFUM D’EDEN/ETVA688V5-Parfum d’Eden.ai
- ETCVA6992V5-Green Pep's.pdf
    dossier : RÉFÉRENCES ÉTIQUETTES/TA699 GREEN PEP'S
    source  : .ai même version (V5)
    .ai     : RÉFÉRENCES ÉTIQUETTES/TA699 GREEN PEP'S/ETCVA6992V5-Green Pep's.ai
- ETVA699V5-Green Pep's.pdf
    dossier : RÉFÉRENCES ÉTIQUETTES/TA699 GREEN PEP'S
    source  : .ai même version (V5)
    .ai     : RÉFÉRENCES ÉTIQUETTES/TA699 GREEN PEP'S/ETVA699V5-Green Pep's.ai
- ETCNA7062V5-Péché gourmand.pdf
    dossier : RÉFÉRENCES ÉTIQUETTES/TA706 PÉCHÉ GOURMAND
    source  : .ai même version (V5)
    .ai     : RÉFÉRENCES ÉTIQUETTES/TA706 PÉCHÉ GOURMAND/ETCNA7062V5-Péché gourmand V1.ai
- ETNA706V5-Péché gourmand.pdf
    dossier : RÉFÉRENCES ÉTIQUETTES/TA706 PÉCHÉ GOURMAND
    source  : .ai même version (V5)
    .ai     : RÉFÉRENCES ÉTIQUETTES/TA706 PÉCHÉ GOURMAND/ETNA706V5-Péché gourmand V1.ai
- ETCNA7112V5-L’Or du Temps.pdf
    dossier : RÉFÉRENCES ÉTIQUETTES/TA711 L OR DU TEMPS
    source  : .ai même version (V5)
    .ai     : RÉFÉRENCES ÉTIQUETTES/TA711 L OR DU TEMPS/ETCNA7112V5-L’Or du Temps.ai
- ETNA711V5-L’Or du Temps.pdf
    dossier : RÉFÉRENCES ÉTIQUETTES/TA711 L OR DU TEMPS
    source  : .ai même version (V5)
    .ai     : RÉFÉRENCES ÉTIQUETTES/TA711 L OR DU TEMPS/ETNA711V5-L’Or du Temps.ai
- ETCNA7322V5-Persian love.pdf
    dossier : RÉFÉRENCES ÉTIQUETTES/TA732 PERSIAN LOVE
    source  : .ai même version (V5)
    .ai     : RÉFÉRENCES ÉTIQUETTES/TA732 PERSIAN LOVE/ETCNA7322V5-Persian love.ai
- ETNA732V5-Persian love.pdf
    dossier : RÉFÉRENCES ÉTIQUETTES/TA732 PERSIAN LOVE
    source  : .ai même version (V5)
    .ai     : RÉFÉRENCES ÉTIQUETTES/TA732 PERSIAN LOVE/ETNA732V5-Persian love.ai
- ETOA902V5-Le pouvoir des fleurs.pdf
    dossier : RÉFÉRENCES ÉTIQUETTES/TA902 LE POUVOIR DES FLEURS
    source  : .ai même version (V5)
    .ai     : RÉFÉRENCES ÉTIQUETTES/TA902 LE POUVOIR DES FLEURS/ETOA902V5-Le pouvoir des fleurs.ai
- ETHN1870V5-Ortie piquante.pdf
    dossier : RÉFÉRENCES ÉTIQUETTES/TH187-ORTIE PIQUANTE
    source  : .ai même version (V5)
    .ai     : RÉFÉRENCES ÉTIQUETTES/TH187-ORTIE PIQUANTE/ETHN1870V5-Ortie piquante.ai
- ETHN2000V5-Menthe.pdf
    dossier : RÉFÉRENCES ÉTIQUETTES/TH200-MENTHE DOUCE
    source  : .ai même version (V5)
    .ai     : RÉFÉRENCES ÉTIQUETTES/TH200-MENTHE DOUCE/ETHN2000V5-Menthe.ai
- ETHN2600V5-Lemongrass.pdf
    dossier : RÉFÉRENCES ÉTIQUETTES/TH260-LEMONGRASS
    source  : .ai même version (V5)
    .ai     : RÉFÉRENCES ÉTIQUETTES/TH260-LEMONGRASS/ETHN2600V5-Lemongrass.ai
- ETHN5200V5-La tisane de l'Amour.pdf
    dossier : RÉFÉRENCES ÉTIQUETTES/TH520-LA TISANE DE L'AMOUR
    source  : .ai même version (V5)
    .ai     : RÉFÉRENCES ÉTIQUETTES/TH520-LA TISANE DE L'AMOUR/ETHN5200V5-La tisane de l'Amour.ai
- ETHN5210V5-La tisane de Mamy.pdf
    dossier : RÉFÉRENCES ÉTIQUETTES/TH521-LA TISANE DE MAMY
    source  : .ai même version (V5)
    .ai     : RÉFÉRENCES ÉTIQUETTES/TH521-LA TISANE DE MAMY/ETHN5210V5-La tisane de Mamy.ai
- ETHN5300V5-Maman Baby.pdf
    dossier : RÉFÉRENCES ÉTIQUETTES/TH530-MAMAN BABY
    source  : .ai même version (V5)
    .ai     : RÉFÉRENCES ÉTIQUETTES/TH530-MAMAN BABY/ETHN5300V5-Maman Baby.ai
- ETHN7010V5-Happy Bedon.pdf
    dossier : RÉFÉRENCES ÉTIQUETTES/TH701-HAPPY BEDON
    source  : .ai même version (V5)
    .ai     : RÉFÉRENCES ÉTIQUETTES/TH701-HAPPY BEDON/ETHN7010V5-Happy Bedon V1.ai
- ETHN9740V5-La salsa du printemps.pdf
    dossier : RÉFÉRENCES ÉTIQUETTES/TH974-LA SALSA DU PRINTEMPS
    source  : .ai même version (V5)
    .ai     : RÉFÉRENCES ÉTIQUETTES/TH974-LA SALSA DU PRINTEMPS/ETHN9740V5-La salsa du printemps.ai
- ETLN100V6-Lapacho nature.pdf
    dossier : RÉFÉRENCES ÉTIQUETTES/TL100-LAPACHO NATURE
    source  : .ai même version (V6)
    .ai     : RÉFÉRENCES ÉTIQUETTES/TL100-LAPACHO NATURE/ETLN100V6-Lapacho nature.ai
- ETCLA4032V5-Lapacho Agrumes.pdf
    dossier : RÉFÉRENCES ÉTIQUETTES/TL403-LAPACHO AGRUMES
    source  : .ai même version (V5)
    .ai     : RÉFÉRENCES ÉTIQUETTES/TL403-LAPACHO AGRUMES/ETCLA4032V5-Lapacho Agrumes.ai
- ETLA403V5-Lapacho Agrumes.pdf
    dossier : RÉFÉRENCES ÉTIQUETTES/TL403-LAPACHO AGRUMES
    source  : .ai même version (V5)
    .ai     : RÉFÉRENCES ÉTIQUETTES/TL403-LAPACHO AGRUMES/ETLA403V5-Lapacho Agrumes.ai
- ETCNM0102V5-Love supreme.pdf
    dossier : RÉFÉRENCES ÉTIQUETTES/TM010 LOVE SUPREME
    source  : .ai même version (V5)
    .ai     : RÉFÉRENCES ÉTIQUETTES/TM010 LOVE SUPREME/ETCNM0102V5-Love supreme.ai
- ETNM010V5-Love supreme.pdf
    dossier : RÉFÉRENCES ÉTIQUETTES/TM010 LOVE SUPREME
    source  : .ai même version (V5)
    .ai     : RÉFÉRENCES ÉTIQUETTES/TM010 LOVE SUPREME/ETNM010V5-Love supreme.ai
- ETCNN4032V5-Keemun.pdf
    dossier : RÉFÉRENCES ÉTIQUETTES/TN403 KEEMUN OP
    source  : .ai même version (V5)
    .ai     : RÉFÉRENCES ÉTIQUETTES/TN403 KEEMUN OP/ETCNN4032V5-Keemun.ai
- ETNN403V5-Keemun.pdf
    dossier : RÉFÉRENCES ÉTIQUETTES/TN403 KEEMUN OP
    source  : .ai même version (V5)
    .ai     : RÉFÉRENCES ÉTIQUETTES/TN403 KEEMUN OP/ETNN403V5-Keemun.ai
- ETCNN4676V5-Grand Keemun FOP.pdf
    dossier : RÉFÉRENCES ÉTIQUETTES/TN467 GRAND KEEMUN FOP
    source  : .ai même version (V5)
    .ai     : RÉFÉRENCES ÉTIQUETTES/TN467 GRAND KEEMUN FOP/ETCNN4676V5-Grand Keemun FOP V1.ai
- ETNN467V5-Grand Keemun FOP.pdf
    dossier : RÉFÉRENCES ÉTIQUETTES/TN467 GRAND KEEMUN FOP
    source  : .ai même version (V5)
    .ai     : RÉFÉRENCES ÉTIQUETTES/TN467 GRAND KEEMUN FOP/ETNN467V5-Grand Keemun FOP.ai
- ETCRA2042V5-Magie des bois.pdf
    dossier : RÉFÉRENCES ÉTIQUETTES/TR204 MAGIE DES BOIS
    source  : .ai même version (V5)
    .ai     : RÉFÉRENCES ÉTIQUETTES/TR204 MAGIE DES BOIS/ETCRA2042V5-Magie des bois.ai
- ETRA204V5-Magie des bois.pdf
    dossier : RÉFÉRENCES ÉTIQUETTES/TR204 MAGIE DES BOIS
    source  : .ai même version (V5)
    .ai     : RÉFÉRENCES ÉTIQUETTES/TR204 MAGIE DES BOIS/ETRA204V5-Magie des bois.ai
- ETCRA2102V5-Parfum de Soleil.pdf
    dossier : RÉFÉRENCES ÉTIQUETTES/TR210 PARFUM DE SOLEIL
    source  : .ai même version (V5)
    .ai     : RÉFÉRENCES ÉTIQUETTES/TR210 PARFUM DE SOLEIL/ETCRA2102V5-Parfum de Soleil.ai
- ETRA210V5-Parfum de Soleil.pdf
    dossier : RÉFÉRENCES ÉTIQUETTES/TR210 PARFUM DE SOLEIL
    source  : .ai même version (V5)
    .ai     : RÉFÉRENCES ÉTIQUETTES/TR210 PARFUM DE SOLEIL/ETRA210V5-Parfum de Soleil.ai
- ETCRA2162V5-Halloween.pdf
    dossier : RÉFÉRENCES ÉTIQUETTES/TR216 HALLOWEEN
    source  : .ai même version (V5)
    .ai     : RÉFÉRENCES ÉTIQUETTES/TR216 HALLOWEEN/ETCRA2162V5-Halloween.ai
- ETRA216V5-Halloween.pdf
    dossier : RÉFÉRENCES ÉTIQUETTES/TR216 HALLOWEEN
    source  : .ai même version (V5)
    .ai     : RÉFÉRENCES ÉTIQUETTES/TR216 HALLOWEEN/ETRA216V5-Halloween.ai
- ETCVN0025 Peace, love and tea.pdf
    dossier : RÉFÉRENCES ÉTIQUETTES/TU0025 - Peace, love and tea
    source  : aucun .ai
- TU0025 Peace, love and tea.pdf
    dossier : RÉFÉRENCES ÉTIQUETTES/TU0025 - Peace, love and tea
    source  : aucun .ai
- ETCVN4312V5-Pin Ho Jade.pdf
    dossier : RÉFÉRENCES ÉTIQUETTES/TV431 PIN HO JADE
    source  : .ai même version (V5)
    .ai     : RÉFÉRENCES ÉTIQUETTES/TV431 PIN HO JADE/ETCVN4312V5-Pin Ho Jade.ai
- ETVN431V5-Pin Ho Jade.pdf
    dossier : RÉFÉRENCES ÉTIQUETTES/TV431 PIN HO JADE
    source  : .ai même version (V5)
    .ai     : RÉFÉRENCES ÉTIQUETTES/TV431 PIN HO JADE/ETVN431V5-Pin Ho Jade.ai
- ETCVN6492V5-Gunpowder.pdf
    dossier : RÉFÉRENCES ÉTIQUETTES/TV649 GUNPOWDER
    source  : .ai même version (V5)
    .ai     : RÉFÉRENCES ÉTIQUETTES/TV649 GUNPOWDER/ETCVN6492V5-Gunpowder.ai
- ETVN649V5-Gunpowder.pdf
    dossier : RÉFÉRENCES ÉTIQUETTES/TV649 GUNPOWDER
    source  : .ai même version (V5)
    .ai     : RÉFÉRENCES ÉTIQUETTES/TV649 GUNPOWDER/ETVN649V5-Gunpowder.ai
- ETCVN6552V5-Gyokuro.pdf
    dossier : RÉFÉRENCES ÉTIQUETTES/TV655 GYOKURO
    source  : .ai même version (V5)
    .ai     : RÉFÉRENCES ÉTIQUETTES/TV655 GYOKURO/ETCVN6552V5-Gyokuro.ai
- ETCVN6556V5-Gyokuro.pdf
    dossier : RÉFÉRENCES ÉTIQUETTES/TV655 GYOKURO
    source  : .ai même version (V5)
    .ai     : RÉFÉRENCES ÉTIQUETTES/TV655 GYOKURO/ETCVN6556V5-Gyokuro.ai
- ETVN655V5-Gyokuro.pdf
    dossier : RÉFÉRENCES ÉTIQUETTES/TV655 GYOKURO
    source  : .ai même version (V5)
    .ai     : RÉFÉRENCES ÉTIQUETTES/TV655 GYOKURO/ETVN655V5-Gyokuro.ai
- ETCVN6562V5-Long Jing.pdf
    dossier : RÉFÉRENCES ÉTIQUETTES/TV656 LONG JING
    source  : .ai même version (V5)
    .ai     : RÉFÉRENCES ÉTIQUETTES/TV656 LONG JING/ETCVN6562V5-Long Jing.ai
- ETVN656V5-Long Jing.pdf
    dossier : RÉFÉRENCES ÉTIQUETTES/TV656 LONG JING
    source  : .ai même version (V5)
    .ai     : RÉFÉRENCES ÉTIQUETTES/TV656 LONG JING/ETVN656V5-Long Jing.ai
- ETCVN6572V5-Gyokuro Premium.pdf
    dossier : RÉFÉRENCES ÉTIQUETTES/TV657 GYOKURO PREMIUM
    source  : .ai même version (V5)
    .ai     : RÉFÉRENCES ÉTIQUETTES/TV657 GYOKURO PREMIUM/ETCVN6572V5-Gyokuro Premium.ai
- ETCVN6576V5-Gyokuro Premium.pdf
    dossier : RÉFÉRENCES ÉTIQUETTES/TV657 GYOKURO PREMIUM
    source  : .ai même version (V5)
    .ai     : RÉFÉRENCES ÉTIQUETTES/TV657 GYOKURO PREMIUM/ETCVN6576V5-Gyokuro Premium.ai
- ETVN657V5-Gyokuro Premium.pdf
    dossier : RÉFÉRENCES ÉTIQUETTES/TV657 GYOKURO PREMIUM
    source  : .ai même version (V5)
    .ai     : RÉFÉRENCES ÉTIQUETTES/TV657 GYOKURO PREMIUM/ETVN657V5-Gyokuro Premium.ai
- ETCVM7362V5-Jasmine Flowers.pdf
    dossier : RÉFÉRENCES ÉTIQUETTES/TV736 JASMINE FLOWERS
    source  : .ai même version (V5)
    .ai     : RÉFÉRENCES ÉTIQUETTES/TV736 JASMINE FLOWERS/ETCVM7362V5-Jasmine Flowers.ai
- ETVM736V5-Jasmine Flowers.pdf
    dossier : RÉFÉRENCES ÉTIQUETTES/TV736 JASMINE FLOWERS
    source  : .ai même version (V5)
    .ai     : RÉFÉRENCES ÉTIQUETTES/TV736 JASMINE FLOWERS/ETVM736V5-Jasmine Flowers.ai
- ETCVN7492V5-Gunpowder Pinhead.pdf
    dossier : RÉFÉRENCES ÉTIQUETTES/TV749 GUNPOWDER PINHEAD
    source  : .ai même version (V5)
    .ai     : RÉFÉRENCES ÉTIQUETTES/TV749 GUNPOWDER PINHEAD/ETCVN7492V5-Gunpowder Pinhead.ai
- ETVN749V5-Gunpowder Pinhead.pdf
    dossier : RÉFÉRENCES ÉTIQUETTES/TV749 GUNPOWDER PINHEAD
    source  : .ai même version (V5)
    .ai     : RÉFÉRENCES ÉTIQUETTES/TV749 GUNPOWDER PINHEAD/ETVN749V5-Gunpowder Pinhead.ai
