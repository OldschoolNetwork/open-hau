export function reportEditorDirty(id:string,dirty:boolean){if(id)window.dispatchEvent(new CustomEvent('openhau:editor-dirty',{detail:{id,dirty}}));}
