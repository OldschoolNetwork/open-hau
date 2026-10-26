export function canonicalUnit(unit: string) {
  const value = unit.trim().toLowerCase().replaceAll(" ", "");
  return ["m3", "m³", "m^3", "м3", "м³"].includes(value) ? "m3" : value;
}
