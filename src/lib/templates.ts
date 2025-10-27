// src/lib/templates.ts
export type TemplateQuestion = { id: string; label: string };
export type TemplateModel = { id: string; name: string; questions: TemplateQuestion[] };

const KEY = "lmw_templates";

function read(): TemplateModel[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
function write(list: TemplateModel[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

export const TemplatesStore = {
  list(): TemplateModel[] {
    return read();
  },
  upsert(model: TemplateModel) {
    const list = read();
    const idx = list.findIndex((m) => m.id === model.id);
    if (idx >= 0) list[idx] = model;
    else list.push(model);
    write(list);
  },
  remove(id: string) {
    write(read().filter((m) => m.id !== id));
  },
};

export function newId(prefix = "tpl"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}
