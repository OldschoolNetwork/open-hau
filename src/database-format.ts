/** The portable database uses the existing versioned JSON document unchanged. */
export const databaseExtension = 'odb';
export const databaseFileFilters = [
  {name: 'OpenHaU Database', extensions: ['odb', 'json']},
];
export const databaseSaveFilters = [
  {name: 'OpenHaU Database', extensions: ['odb']},
  {name: 'OpenHaU JSON', extensions: ['json']},
];
export function databaseFilename(name:string) {
  const base=name.trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g,'-').replace(/[. ]+$/g,'') || 'OpenHaU';
  return base.replace(/(?:\.openhau\.json|\.json|\.odb)$/i,'')+'.odb';
}
