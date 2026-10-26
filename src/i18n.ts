export type Language = "ru" | "ro";
const russian = (ru: string, _ro: string) => ru;
const romanian = (_ru: string, ro: string) => ro;
export const translator = (language: Language) =>
  language === "ru" ? russian : romanian;
