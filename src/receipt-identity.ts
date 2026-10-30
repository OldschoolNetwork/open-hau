export function distinctOrganizationCode(name: string, code: string): string {
  const normalize = (value: string) => value.normalize('NFKC').replace(/\s+/gu, ' ').trim().toLocaleLowerCase();
  return normalize(name) === normalize(code) ? '' : code.trim();
}
