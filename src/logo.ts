// SVG is always rendered as an image, never injected as HTML.
export function sanitizeSvg(text: string) {
  if (/<!DOCTYPE|<!ENTITY/i.test(text))
    throw Error("SVG с DTD или сущностями не поддерживается");
  const doc = new DOMParser().parseFromString(text, "image/svg+xml");
  if (
    doc.querySelector("parsererror") ||
    doc.documentElement.localName !== "svg"
  )
    throw Error("Некорректный SVG");
  const tags = new Set([
    "svg",
    "g",
    "path",
    "rect",
    "circle",
    "ellipse",
    "line",
    "polyline",
    "polygon",
    "text",
    "tspan",
    "defs",
    "linearGradient",
    "radialGradient",
    "stop",
    "clipPath",
    "mask",
    "title",
    "desc",
    "symbol",
    "use",
  ]);
  for (const el of Array.from(doc.querySelectorAll("*"))) {
    if (!tags.has(el.localName)) {
      el.remove();
      continue;
    }
    for (const attr of Array.from(el.attributes)) {
      const v = attr.value.trim();
      if (
        /^on/i.test(attr.name) ||
        attr.name === "style" ||
        (attr.localName === "href" && !v.startsWith("#")) ||
        /url\s*\(\s*['"]?(?!#)/i.test(v)
      )
        el.removeAttribute(attr.name);
    }
  }
  return new XMLSerializer().serializeToString(doc.documentElement);
}
export async function loadLogo(file: File) {
  if (file.size > 2 * 1024 * 1024)
    throw Error("Максимальный размер логотипа — 2 МБ");
  if (file.name.toLowerCase().endsWith(".svg")) {
    const clean = sanitizeSvg(await file.text());
    const bytes = new TextEncoder().encode(clean);
    let binary = "";
    for (const b of bytes) binary += String.fromCharCode(b);
    return "data:image/svg+xml;base64," + btoa(binary);
  }
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type))
    throw Error("Выберите SVG, PNG, JPEG или WebP");
  return await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(Error("Не удалось прочитать изображение"));
    r.readAsDataURL(file);
  });
}

export function tintLogo(data:string,color:string|null){if(!color||!/^#[0-9a-f]{6}$/i.test(color)||!data.startsWith('data:image/svg+xml;base64,'))return data;try{const raw=new TextDecoder().decode(Uint8Array.from(atob(data.slice(data.indexOf(',')+1)),c=>c.charCodeAt(0)));const changed=raw.replace(/\b(fill|stroke|stop-color)\s*=\s*(["'])(?!none\2)([^"']*)\2/gi,(_m,key,quote)=>key+'='+quote+color+quote).replace(/<svg\b([^>]*)>/,(_m,attrs)=>'<svg'+attrs.replace(/\scolor\s*=\s*(["'])[^"']*\1/gi,'')+' color="'+color+'"'+(/\bfill\s*=/.test(attrs)?'':' fill="'+color+'"')+'>');return 'data:image/svg+xml;base64,'+btoa(Array.from(new TextEncoder().encode(changed),byte=>String.fromCharCode(byte)).join(''));}catch{return data;}}
