/**
 * Minimal RFC 4180 reader for the semicolon CSV files exchanged with the file
 * sort (selection.csv): quoted fields, doubled quotes, line breaks inside
 * quotes, BOM. Splitting on ";" breaks on the first quoted product name.
 */

export function lireCsv(texte: string, separateur = ";"): Record<string, string>[] {
  const lignes: string[][] = [];
  let ligne: string[] = [];
  let champ = "";
  let entreGuillemets = false;
  const contenu = texte.replace(/^﻿/, "");

  for (let i = 0; i < contenu.length; i += 1) {
    const c = contenu[i];
    if (entreGuillemets) {
      if (c === '"' && contenu[i + 1] === '"') {
        champ += '"';
        i += 1;
      } else if (c === '"') entreGuillemets = false;
      else champ += c;
    } else if (c === '"') entreGuillemets = true;
    else if (c === separateur) {
      ligne.push(champ);
      champ = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && contenu[i + 1] === "\n") i += 1;
      ligne.push(champ);
      lignes.push(ligne);
      ligne = [];
      champ = "";
    } else champ += c;
  }
  if (champ !== "" || ligne.length > 0) {
    ligne.push(champ);
    lignes.push(ligne);
  }

  const [entetes, ...donnees] = lignes.filter((l) => l.some((v) => v !== ""));
  if (!entetes) return [];
  return donnees.map((l) => Object.fromEntries(entetes.map((e, i) => [e, l[i] ?? ""])));
}
