import { describe, it, expect } from "vitest";

import { appliquerPreuves, fusionner, preuvesParPoint } from "../lib/audit/fusion-bat";
import type { BatTextCheck } from "../lib/audit/visual/text-robot";
import type { ControlResult } from "../lib/audit/types";

const point = (id: string, mode: ControlResult["mode"], statut: ControlResult["statut"], action: ControlResult["action"]): ControlResult =>
  ({ id, typeControle: "EUROFEUILLE", mode, statut, action, justification: "initial" });

const bat = (checklistId: string, statut: BatTextCheck["statut"], origine: BatTextCheck["origine"]): BatTextCheck =>
  ({ id: "X", checklistId, origine, rubrique: "R", libelle: "L", statut, justification: "constat du BAT" });

describe("fusion des résultats BAT dans la checklist", () => {
  it("range les preuves par point de checklist", () => {
    const p = preuvesParPoint([bat("13.1", "PASS", "visuel"), bat("12.1", "FAIL", "visuel")]);
    expect(Object.keys(p).sort()).toEqual(["12.1", "13.1"]);
  });

  it("n'ajoute pas « à confirmer sur le BAT » à une réserve mesurée par le code", () => {
    const r = appliquerPreuves(point("14.1", "manual", "WARNING", "VERIFIER"), [
      { libelle: "L", statut: "WARNING", justification: "mesure partielle", origine: "texte" },
    ]);
    expect(r.action).toBe("VERIFIER");
    expect(r.justification).not.toContain("à confirmer sur le BAT");
  });

  it("ignore un contrôle BAT non rattaché", () => {
    const orphelin: BatTextCheck = { id: "X", rubrique: "R", libelle: "L", statut: "PASS", justification: "j" };
    expect(preuvesParPoint([orphelin])).toEqual({});
  });

  it("du CODE qui lit le BAT peut trancher un point visuel", () => {
    const r = appliquerPreuves(point("7.2", "manual", "WARNING", "VERIFIER"), [
      { libelle: "L", statut: "PASS", justification: "mention présente", origine: "texte" },
    ]);
    expect(r.statut).toBe("PASS");
    expect(r.action).toBe("RIEN");
  });

  it("un champ manquant sur la fiche se compte « à compléter », pas « à vérifier »", () => {
    // Le point 6.2 mesure la hauteur des chiffres du grammage : sans quantité
    // nette au dossier, il n'y a rien à regarder sur le BAT — il y a une fiche
    // à remplir. La distinction pilote le décompte de tête d'écran.
    const r = appliquerPreuves(point("6.2", "bat", "WARNING", "VERIFIER"), [
      {
        libelle: "L",
        statut: "WARNING",
        justification: "Hauteur non mesurable",
        origine: "texte",
        manqueSurLaFiche: "la quantité nette",
      },
    ]);
    expect(r.action).toBe("COMPLETER");
  });

  it("un MODÈLE oriente le regard, il ne remplace pas la confirmation", () => {
    const r = appliquerPreuves(point("13.1", "manual", "WARNING", "VERIFIER"), [
      { libelle: "L", statut: "PASS", justification: "Eurofeuille détectée", origine: "visuel" },
    ]);
    expect(r.action).toBe("VERIFIER");
    expect(r.justification).toContain("à confirmer");
    expect(r.justification).toContain("Eurofeuille détectée");
  });

  it("une non-conformité prouvée remonte en CORRIGER, quelle que soit son origine", () => {
    for (const origine of ["texte", "visuel", "semantique"] as const) {
      const r = appliquerPreuves(point("13.4", "manual", "WARNING", "VERIFIER"), [
        { libelle: "L", statut: "FAIL", justification: "Point Vert détecté", origine },
      ]);
      expect(r.action).toBe("CORRIGER");
      expect(r.statut).toBe("FAIL");
    }
  });

  it("n'écrase jamais un verdict déterministe rendu sur la fiche", () => {
    const r = appliquerPreuves(point("6.1", "deterministic", "PASS", "RIEN"), [
      { libelle: "L", statut: "WARNING", justification: "poids non retrouvé", origine: "texte" },
    ]);
    // Les deux répondent à deux questions : la donnée, et son impression.
    expect(r.statut).toBe("PASS");
    expect(r.justification).toContain("initial");
    expect(r.justification).toContain("poids non retrouvé");
  });

  it("laisse intacts les points sans preuve", () => {
    const liste = [point("1.0", "llm", "WARNING", "VERIFIER")];
    expect(fusionner(liste, [])).toEqual(liste);
  });
});

/**
 * Deux fusions successives — le cas réel de l'écran d'audit.
 *
 * Marie lance d'abord le contrôle, qui verse les constats mesurés ; puis
 * l'analyse IA, qui verse ceux du modèle. La seconde passe réévaluait le point
 * sur les seules preuves du modèle : sur TA737, l'Eurofeuille mesurée à
 * 12,78 × 8,52 mm — sous la taille minimale — redevenait « à vérifier » parce
 * que le modèle avait répondu « logo détecté ». Une mesure effacée par un avis.
 */
describe("fusions successives — les preuves s'ajoutent, jamais ne se remplacent", () => {
  const mesure = (statut: BatTextCheck["statut"], justification: string): BatTextCheck =>
    ({ id: "M", checklistId: "13.1", origine: "texte", rubrique: "Labels", libelle: "Eurofeuille", statut, justification });
  const modele = (statut: BatTextCheck["statut"], justification: string): BatTextCheck =>
    ({ id: "V", checklistId: "13.1", origine: "visuel", rubrique: "Labels", libelle: "Eurofeuille", statut, justification });

  const enDeuxTemps = (dabord: BatTextCheck[], ensuite: BatTextCheck[]) =>
    fusionner(fusionner([point("13.1", "bat", "WARNING", "VERIFIER")], dabord), ensuite)[0];

  it("un « logo détecté » n'efface pas une Eurofeuille mesurée hors norme", () => {
    const r = enDeuxTemps(
      [mesure("FAIL", "champ vert 12,78 × 8,52 mm — sous la taille minimale")],
      [modele("PASS", "Logo obligatoire détecté sur le BAT.")]
    );
    expect(r.statut).toBe("FAIL");
    expect(r.action).toBe("CORRIGER");
  });

  it("sur un écart, la carte ne dit que l'écart — les deux preuves restent gardées", () => {
    // Décision 2026-09-24 : seules les divergences s'affichent. « Logo détecté »
    // ne s'efface pas du dossier (il reste dans `preuves`, et compte pour le
    // verdict), il cesse seulement de noyer « trop petit » sur la carte.
    const r = enDeuxTemps(
      [mesure("FAIL", "champ vert 12,78 × 8,52 mm — sous la taille minimale")],
      [modele("PASS", "Logo obligatoire détecté sur le BAT.")]
    );
    expect(r.justification).toContain("12,78");
    expect(r.justification).not.toContain("détecté");
    expect(r.preuves).toHaveLength(2);
  });

  it("sur un écart prouvé, une réserve « à vérifier » ne s'ajoute pas à la carte", () => {
    const r = enDeuxTemps(
      [mesure("FAIL", "chiffres 1,43 mm, seuil 2 mm")],
      [mesure("WARNING", "même champ visuel — à confirmer")]
    );
    expect(r.justification).toContain("1,43 mm");
    expect(r.justification).not.toContain("champ visuel");
    expect(r.preuves).toHaveLength(2);
  });

  it("tout conforme : chaque preuve reste dite", () => {
    const r = enDeuxTemps([mesure("PASS", "aux dimensions")], [modele("PASS", "détecté")]);
    expect(r.justification).toContain("aux dimensions");
    expect(r.justification).toContain("détecté");
  });

  it("l'ordre des clics ne change pas le verdict", () => {
    const m = mesure("FAIL", "hors norme");
    const v = modele("PASS", "détecté");
    expect(enDeuxTemps([m], [v]).statut).toBe(enDeuxTemps([v], [m]).statut);
  });

  it("rejouer la même preuve ne la compte pas deux fois", () => {
    const m = mesure("FAIL", "hors norme");
    expect(enDeuxTemps([m], [m]).preuves).toHaveLength(1);
  });

  it("un modèle qui confirme une mesure conforme laisse le point conforme", () => {
    const r = enDeuxTemps([mesure("PASS", "aux dimensions")], [modele("PASS", "détecté")]);
    expect(r.statut).toBe("PASS");
  });

  it("le modèle seul ne clôt pas un point : il reste à confirmer", () => {
    const r = fusionner([point("12.1", "manual", "WARNING", "VERIFIER")], [
      { id: "V", checklistId: "12.1", origine: "visuel", rubrique: "P", libelle: "Triman", statut: "PASS", justification: "détecté" },
    ])[0];
    expect(r.action).toBe("VERIFIER");
    expect(r.justification).toContain("à confirmer sur le BAT");
  });

  it("une décision de la Qualité tient malgré une preuve qui arrive après", () => {
    const tranche: ControlResult = {
      ...point("13.1", "bat", "FAIL", "CORRIGER"),
      validation: { decision: "DEROGATION", parNom: "Marie", le: new Date(), justification: "écart assumé", perimee: false },
    };
    const r = fusionner([tranche], [modele("FAIL", "toujours hors norme")])[0];
    expect(r.action).toBe("RIEN");
  });
});
