import { describe, expect, it } from "vitest";
import { formaterPoidsNet } from "../lib/format-poids";

describe("formaterPoidsNet — la colonne « POIDS G OU KG »", () => {
  it("vrac en kilos (TB4041 Ché Chun)", () => {
    expect(formaterPoidsNet("1.5")).toBe("1,5 kg");
    expect(formaterPoidsNet("1,5")).toBe("1,5 kg");
    expect(formaterPoidsNet("1")).toBe("1 kg");
  });
  it("détail en grammes", () => {
    expect(formaterPoidsNet("100")).toBe("100 g");
    expect(formaterPoidsNet("7")).toBe("7 g");
    expect(formaterPoidsNet("500")).toBe("500 g");
  });
  it("ce qui n'est pas un poids reste tel quel", () => {
    expect(formaterPoidsNet("80 -> 30")).toBe("80 -> 30");
    expect(formaterPoidsNet("3 pièces")).toBe("3 pièces");
    expect(formaterPoidsNet("?")).toBe("?");
  });
  it("vide → rien", () => {
    expect(formaterPoidsNet("")).toBeNull();
    expect(formaterPoidsNet(null)).toBeNull();
  });
});
