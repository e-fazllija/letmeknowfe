export function detectPII(texts: string[]): string[] {
  const warnings: string[] = [];
  const joined = (texts || []).filter(Boolean).join("\n");

  const emailRe = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
  if (emailRe.test(joined)) warnings.push("Sembra esserci un indirizzo email.");

  const phoneRe = /(\+?\d{1,3}[\s\-]?)?(\(?\d{2,4}\)?[\s\-]?)?(\d[\s\-]?){6,}/;
  if (phoneRe.test(joined)) warnings.push("Sembra esserci un numero di telefono.");

  const cfRe = /[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]/i;
  if (cfRe.test(joined)) warnings.push("Sembra esserci un codice fiscale.");

  const ibanRe = /[A-Z]{2}\d{2}[A-Z0-9]{11,30}/i;
  if (ibanRe.test(joined)) warnings.push("Sembra esserci un IBAN.");

  return warnings;
}
