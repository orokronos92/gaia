import { describe, it, expect } from "vitest";
import { runTextRobot, type BatTextCheck, type BatTextInput } from "../lib/audit/visual/text-robot";

/**
 * Golden MT265 — real text extracted by pdf2json from the actual BATs in MinIO
 * (facing ETMT2652V5 + contre ETCMT2652V5), concatenated as the orchestrator
 * will feed it. Keeps the robot honest against the genuine artwork, not a mock.
 */
const BAT_MT265 = `Maté
sportif
CERTIFIÉ PAR FR-BIO-01 AGRICULTURE UE/non UE
CONDITIONNÉ À LA MAIN EN ALSACE
LES BIENFAITRICES
STIMULANT & TONIQUE
INFUSION AROMATISÉE
HUILE ESSENTIELLE D'ORANGE SANGUINE
GINGEMBRE - HIBISCUS
LES JARDINS DE GAÏA
Membre certifié World Fair Trade Organization, Les Jardins de Gaïa
s'engagent pour un commerce plus juste. Pour en savoir plus : www.wfto.com.
ETCMT2652V5
poids net
100g
50
TASSES
2g /
TASSE
3min
95°C
Maté sportif
Naturellement stimulante, cette recette à base de maté.
INGRÉDIENTS
maté vert* 62%, gingembre* 15,5%, guarana* 6%,
hibiscus* 6%, menthe poivrée*, huile essentielle
d'orange sanguine* 4%, ginseng* 2%, stevia*.
*Issu de l'agriculture biologique.
Consommation journalière conseillée : 3 tasses de 25 cl.`;

const FICHE_MT265: BatTextInput = {
  denomination: "Maté sportif",
  ingredients:
    "maté vert* 62%, gingembre* 15,5%, guarana* 6%, hibiscus* 6%, menthe poivrée*, huile essentielle d'orange sanguine* 4%, ginseng* 2%, stevia*. *Issu de l'agriculture biologique.",
  allegation: "Consommation journalière conseillée : 3 tasses de 25 cl.",
  allergenes: "non",
  poidsNet: "100 g",
  codeEtiquette: "ETCMT2652V5",
  mentionConservation: "À conserver à l'abri de l'humidité, de la lumière et de la chaleur",
  mentionFabricant: "LES JARDINS DE GAÏA – Z.A. – 6 rue de l'Écluse – FR-67820 Wittisheim",
};

const byId = (r: BatTextCheck[], id: string): BatTextCheck => {
  const c = r.find((x) => x.id === id);
  if (!c) throw new Error(`check ${id} absent`);
  return c;
};

describe("Robot Texte — golden MT265", () => {
  it("confirme ce qui figure sur le BAT, signale ce qui manque", () => {
    const r = runTextRobot(BAT_MT265, FICHE_MT265);

    // La liste d'ingrédients n'est plus comparée ici : point 2.5 (coherence-liste).
    expect(r.find((x) => x.id === "TXT_INGREDIENTS")).toBeUndefined();
    expect(byId(r, "TXT_DENOMINATION").statut).toBe("PASS");
    expect(byId(r, "TXT_POIDS_NET").statut).toBe("PASS"); // "100 g" fiche ↔ "100g" BAT
    expect(byId(r, "TXT_CODE_ETIQUETTE").statut).toBe("PASS");

    // L'allégation n'est PAS un contrôle déterministe (formulation libre) → LLM/vision.
    expect(r.find((x) => x.id === "TXT_ALLEGATION")).toBeUndefined();

    // Mentions obligatoires absentes des faces analysées → WARNING (pas FAIL).
    expect(byId(r, "TXT_CONSERVATION").statut).toBe("WARNING");
    // PRO-QHS-313 §7 : l'adresse est sur le sachet non encollé, pas sur l'étiquette.
    expect(byId(r, "TXT_FABRICANT").statut).toBe("PASS");
    expect(byId(r, "TXT_FABRICANT").justification).toContain("sachet non encollé");

    // Allergènes "non" → non déclaré → pas de contrôle généré.
    expect(r.find((x) => x.id === "TXT_ALLERGENES")).toBeUndefined();
  });

  it("WARNING honnête quand la fiche n'a pas la donnée", () => {
    const r = runTextRobot(BAT_MT265, { ingredients: null });
    expect(byId(r, "TXT_DENOMINATION").statut).toBe("WARNING");
  });
});

describe("mentions conditionnelles — cherchées seulement quand elles sont dues", () => {
  it("ne cherche rien de conditionnel sur un produit qui n'est pas concerné", () => {
    const r = runTextRobot(BAT_MT265, { ...FICHE_MT265, allegation: null });
    expect(r.find((c) => c.id === "TXT_REGLISSE")).toBeUndefined();
    expect(r.find((c) => c.id === "TXT_ALLEG_MODE_VIE")).toBeUndefined();
    expect(r.find((c) => c.id === "TXT_WFTO")).toBeUndefined();
  });

  it("réclame l'avertissement hypertension dès qu'il y a de la réglisse", () => {
    const avec = { ...FICHE_MT265, ingredients: "réglisse* 20%, menthe poivrée*." };
    const absent = runTextRobot(BAT_MT265, avec);
    expect(byId(absent, "TXT_REGLISSE").statut).toBe("WARNING");
    expect(byId(absent, "TXT_REGLISSE").checklistId).toBe("5.3");

    const present = runTextRobot(
      `${BAT_MT265}\nContient de la réglisse – les personnes souffrant d'hypertension doivent éviter toute consommation excessive.`,
      avec
    );
    expect(byId(present, "TXT_REGLISSE").statut).toBe("PASS");
  });

  it("réclame les trois mentions d'une allégation, et dit laquelle manque", () => {
    // Le BAT réel de MT265 imprime la consommation journalière, mais ni la
    // phrase « mode de vie sain » ni les valeurs nutritionnelles.
    const r = runTextRobot(BAT_MT265, FICHE_MT265);
    expect(byId(r, "TXT_ALLEG_TASSES").statut).toBe("PASS");
    expect(byId(r, "TXT_ALLEG_MODE_VIE").statut).toBe("WARNING");
    expect(byId(r, "TXT_ALLEG_NUTRI").statut).toBe("WARNING");
    for (const id of ["TXT_ALLEG_TASSES", "TXT_ALLEG_MODE_VIE", "TXT_ALLEG_NUTRI"]) {
      expect(byId(r, id).checklistId).toBe("5.2");
    }
  });
});

describe("mention WFTO — deux marqueurs, pas un verdict", () => {
  const wfto = { ...FICHE_MT265, phraseWfto: "Membre certifié World Fair Trade Organization…" };

  it("valide quand la mention et l'adresse sont imprimées", () => {
    expect(byId(runTextRobot(BAT_MT265, wfto), "TXT_WFTO").statut).toBe("PASS");
  });

  it("signale l'adresse seule — le cas mesuré sur deux étiquettes du catalogue", () => {
    const sansMention = BAT_MT265.replace("World Fair Trade Organization", "commerce équitable");
    const c = byId(runTextRobot(sansMention, wfto), "TXT_WFTO");
    expect(c.statut).toBe("WARNING");
    expect(c.justification).toContain("wfto.com est imprimée");
  });

  it("traite « / » comme la convention JDG pour « non concerné »", () => {
    // 51 fiches du catalogue portent « / » : les compter comme WFTO ferait
    // apparaître une non-conformité sur des produits qui n'en revendiquent pas.
    expect(runTextRobot(BAT_MT265, { ...FICHE_MT265, phraseWfto: "/" }).find((c) => c.id === "TXT_WFTO")).toBeUndefined();
  });
});

/**
 * Golden Anemos — texte réel de ETCVA6262V5 « Le souffle des mers », la contre
 * étiquette du seul thé transporté à la voile qui soit aussi WFTO.
 */
const BAT_TA6262 = `THÉ TRANSPORTÉ À LA VOILE
depuis le Vietnam - Coopérative Bân Liên
Le vent comme énergie de transport permet de
réduire largement les émissions de gaz à effet de
serre et d'atténuer les impacts sur la biodiversité.
Ensemble, changeons de cap !
Le souffle des mers
INGRÉDIENTS
Thé vert*, écorces de grenade* 20%, cardamome* 5%.
*Issu de l'agriculture biologique.
ETCVA6262V5
poids net
80g`;

/**
 * Golden Les Engagés — ETCBA5086V5 « L'Esprit de la forêt », sous-gamme AGIR
 * POUR LA NATURE, bénéficiaire SFEPM.
 */
const BAT_TA5086 = `AGIR POUR LA NATURE
0,50 € REVERSÉS À SFEPM
La Société Française pour l'Etude et la Protection des
Mammifères œuvre à la conservation des mammifères
sauvages. sfepm.org
L'Esprit de la forêt
ETCBA5086V5`;

/**
 * Golden Demeter — ETCVA6212V7 « Jardin sous la lune ». La note ** y est
 * imprimée dans les termes du cahier des charges Demeter France 2025 §4.3.1 :
 * « demeter est LE LABEL … biodynamique. » (PRO-QHS-313 v2 §2.1).
 */
const BAT_TA6212 = `Thé vert**, écorces de mandarine**, tulsi* 10%,
cardamome* 9%, amarante*. *Issu de l'agriculture
biologique. **Issu de l'agriculture biologique et
biodynamique. demeter est le label des produits issus
de l'agriculture biodynamique.
ETCVA6212V7`;

describe("mentions de gamme — la gamme déclare ce qu'elle exige", () => {
  const voile: BatTextInput = { gamme: "THÉS À LA VOILE", exigeMentionAnemos: true };
  const engages: BatTextInput = { gamme: "LES ENGAGÉS", exigeMentionEngages: true };

  it("ne s'exécute pas hors de la gamme concernée", () => {
    const r = runTextRobot(BAT_MT265, FICHE_MT265);
    expect(r.find((c) => c.id === "TXT_ANEMOS")).toBeUndefined();
    expect(r.find((c) => c.id === "TXT_ENGAGES")).toBeUndefined();
    expect(r.find((c) => c.id === "TXT_DEMETER")).toBeUndefined();
  });

  it("s'exécute sur la seule obligation de la gamme, champ de fiche vide", () => {
    // C'est tout l'enjeu du branchement : les quatre champs de mention sont
    // vides sur 178 fiches. Les attendre reviendrait à ne jamais contrôler.
    const c = byId(runTextRobot(BAT_TA6262, voile), "TXT_ANEMOS");
    expect(c.checklistId).toBe("13.5");
    expect(c.statut).toBe("WARNING");
    expect(c.manqueSurLaFiche).toBe("la mention Anemos");
    expect(c.justification).toContain("présents sur le BAT");
  });

  it("valide quand le BAT porte tout et que la fiche est renseignée", () => {
    const c = byId(
      runTextRobot(BAT_TA6262, { ...voile, phraseAnemos: "Le vent comme énergie de transport…" }),
      "TXT_ANEMOS"
    );
    expect(c.statut).toBe("PASS");
    expect(c.manqueSurLaFiche).toBeUndefined();
  });

  it("signale le bandeau sans sa phrase — le cas que le §11.2 vise", () => {
    const sansPhrase = BAT_TA6262.replace("Ensemble, changeons de cap !", "");
    const c = byId(runTextRobot(sansPhrase, voile), "TXT_ANEMOS");
    expect(c.statut).toBe("WARNING");
    expect(c.justification).toContain("impose les deux ensemble");
  });

  it("mesure Les Engagés sur le bandeau et la ligne de don, pas sur le descriptif", () => {
    // Le texte de l'association change à chaque produit — 8 associations pour
    // 11 références. Seuls le bandeau et le don sont invariants.
    const c = byId(runTextRobot(BAT_TA5086, engages), "TXT_ENGAGES");
    expect(c.checklistId).toBe("13.6");
    expect(c.manqueSurLaFiche).toBe("la mention Les Engagés");
    expect(c.justification).toContain("présents sur le BAT");
  });

  it("signale la sous-gamme sans ligne de don", () => {
    const sansDon = BAT_TA5086.replace("0,50 € REVERSÉS À SFEPM", "");
    expect(byId(runTextRobot(sansDon, engages), "TXT_ENGAGES").justification).toContain(
      "impose les deux ensemble"
    );
  });

  it("le champ de fiche saisi déclenche à lui seul, hors gamme", () => {
    const c = byId(runTextRobot(BAT_TA6262, { phraseAnemos: "Le vent comme énergie…" }), "TXT_ANEMOS");
    expect(c.statut).toBe("PASS");
  });

  it("traite « / » comme « non concerné », comme pour WFTO", () => {
    expect(
      runTextRobot(BAT_TA6262, { phraseAnemos: "/" }).find((c) => c.id === "TXT_ANEMOS")
    ).toBeUndefined();
  });
});

describe("note ** Demeter — déclenchée par la recette, jugée sur les termes", () => {
  it("valide la formulation de TA6212, celle du cahier des charges Demeter", () => {
    const c = byId(
      runTextRobot(BAT_TA6212, { estDemeter: true, phraseDemeter: "**Issu de l'agriculture…" }),
      "TXT_DEMETER"
    );
    expect(c.checklistId).toBe("2.4");
    expect(c.statut).toBe("PASS");
  });

  it("prend l'ancienne formulation du §11.1 en défaut, sans la déclarer absente", () => {
    const ancienne = BAT_TA6212.replace(
      "demeter est le label des produits issus\nde l'agriculture biodynamique.",
      "demeter est la marque des produits issus de l'agriculture biodynamique certifiée"
    );
    const c = byId(runTextRobot(ancienne, { estDemeter: true }), "TXT_DEMETER");
    expect(c.statut).toBe("WARNING");
    expect(c.justification).toContain("pas dans les termes du cahier des charges Demeter");
    expect(c.justification).toContain("demeter est le label");
  });

  it("signale la note absente quand la recette porte un ingrédient Demeter", () => {
    const c = byId(runTextRobot(BAT_MT265, { ...FICHE_MT265, estDemeter: true }), "TXT_DEMETER");
    expect(c.statut).toBe("WARNING");
    expect(c.justification).toContain("n'a pas été retrouvée");
  });
});

describe("statut de mention — la Qualité décide, la donnée déduit", () => {
  const voile: BatTextInput = { gamme: "THÉS À LA VOILE", exigeMentionAnemos: true };

  it("« AUTO » retombe sur ce que la gamme exige — le défaut de toute fiche", () => {
    expect(runTextRobot(BAT_TA6262, { ...voile, statutAnemos: "AUTO" }).find((c) => c.id === "TXT_ANEMOS")).toBeDefined();
  });

  it("« NON » éteint le contrôle malgré la gamme", () => {
    // Le geste que Marie n'avait pas : la dérogation referme la ligne et la
    // rouvre au contrôle suivant, le statut la referme pour de bon.
    expect(runTextRobot(BAT_TA6262, { ...voile, statutAnemos: "NON" }).find((c) => c.id === "TXT_ANEMOS")).toBeUndefined();
  });

  it("« OUI » allume le contrôle malgré la gamme", () => {
    const c = byId(runTextRobot(BAT_TA6262, { gamme: "LES GRANDS CLASSIQUES", statutAnemos: "OUI" }), "TXT_ANEMOS");
    expect(c.statut).toBe("WARNING");
  });

  it("« NON » éteint aussi Demeter, que la recette le déclare ou non", () => {
    expect(
      runTextRobot(BAT_TA6212, { estDemeter: true, statutDemeter: "NON" }).find((c) => c.id === "TXT_DEMETER")
    ).toBeUndefined();
  });

  it("« NON » sur WFTO remplace la convention « / »", () => {
    const wfto = { ...FICHE_MT265, phraseWfto: "Membre certifié World Fair Trade Organization…" };
    expect(runTextRobot(BAT_MT265, { ...wfto, statutWfto: "NON" }).find((c) => c.id === "TXT_WFTO")).toBeUndefined();
  });

  it("« OUI » sur Les Engagés déclenche hors gamme", () => {
    const c = byId(runTextRobot(BAT_TA5086, { gamme: "LES GRANDS CRUS", statutEngages: "OUI" }), "TXT_ENGAGES");
    expect(c.checklistId).toBe("13.6");
  });
});

/**
 * La mention Demeter proposée à la fiche.
 *
 * L'application savait que la mention était due, connaissait son texte au mot
 * près — il servait déjà à contrôler le BAT — et demandait quand même à la
 * Qualité de le retaper. Conséquence : un BAT parfaitement imprimé restait en
 * alerte à cause d'un champ vide, sur les quatre produits Demeter du catalogue.
 */
describe("mention Demeter — proposition à la fiche", () => {
  const BAT_AVEC_NOTE =
    "INGRÉDIENTS thé noir**, honeybush**. **Issu de l'agriculture biologique et biodynamique. " +
    "demeter est le label des produits issus de l'agriculture biodynamique.";

  const demeter = (bat: string, phrase: string | null) =>
    runTextRobot(bat, {
      ...FICHE_MT265,
      estDemeter: true,
      statutDemeter: "AUTO",
      phraseDemeter: phrase,
    }).find((c) => c.id === "TXT_DEMETER");

  it("propose le texte du cahier des charges Demeter quand la fiche ne le porte pas", () => {
    const c = demeter(BAT_AVEC_NOTE, null);
    expect(c?.proposition?.champ).toBe("phraseDemeterFr");
    expect(c?.proposition?.table).toBe("fiche");
    expect(c?.proposition?.source).toContain("Demeter");
    expect(c?.proposition?.valeur).toContain("biologique et biodynamique");
    expect(c?.proposition?.valeur).toContain("demeter est le label");
  });

  it("propose aussi quand le BAT n'imprime pas la note — la fiche dit au graphisme quoi imprimer", () => {
    expect(demeter("INGRÉDIENTS thé noir*.", null)?.proposition?.champ).toBe("phraseDemeterFr");
  });

  it("ne propose plus rien une fois la mention saisie, et le point passe", () => {
    const c = demeter(
      BAT_AVEC_NOTE,
      "**Issu de l'agriculture biologique et biodynamique. demeter est le label des produits issus de l'agriculture biodynamique."
    );
    expect(c?.proposition).toBeUndefined();
    expect(c?.statut).toBe("PASS");
  });

  it("la valeur proposée est celle que le contrôle attend : la saisir fait passer le point", () => {
    const proposee = demeter(BAT_AVEC_NOTE, null)?.proposition?.valeur;
    expect(proposee).toBeDefined();
    expect(demeter(BAT_AVEC_NOTE, proposee as string)?.statut).toBe("PASS");
  });
});
