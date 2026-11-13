const supported = new Set(["application/pdf", "image/png", "image/jpeg"]);
const maxFileBytes = 1024 * 1024;

export function validateFiles(files) {
  if (files.length > 3) throw new Error("Choose up to 3 files.");
  for (const file of files) {
    if (!supported.has(file.type)) throw new Error("Choose PDF, PNG or JPEG files.");
    if (file.size > maxFileBytes) throw new Error("Each file must be 1 MB or smaller for this local workspace.");
  }
}

export async function readFiles(files) {
  validateFiles(files);
  return Promise.all(files.map((file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ name: file.name, type: file.type, data: reader.result });
    reader.onerror = () => reject(new Error("Unable to read " + file.name));
    reader.readAsDataURL(file);
  })));
}

export function fileUrl(file) {
  if (!supported.has(file.type)) return "";
  const prefix = "data:" + file.type + ";base64,";
  if (typeof file.data !== "string" || !file.data.startsWith(prefix)) return "";
  try {
    const bytes = Uint8Array.from(atob(file.data.slice(prefix.length)), (char) => char.charCodeAt(0));
    return URL.createObjectURL(new Blob([bytes], { type: file.type }));
  } catch {
    return "";
  }
}
