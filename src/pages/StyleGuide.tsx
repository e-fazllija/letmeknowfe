import { useEffect, useState } from "react";

type Theme = {
  primary: string;
  secondary: string;
  radius: number; // in rem *100 (slider)
  font: string;
};

const FONTS = [
  { label: "System", value: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"' },
  { label: "Arial", value: 'Arial, "Helvetica Neue", Helvetica, sans-serif' },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Monospace", value: '"SFMono-Regular", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace' },
];

export default function StyleGuide() {
  const [theme, setTheme] = useState<Theme>({
    primary: "#0d6efd",
    secondary: "#6c757d",
    radius: 50, // 0..100 -> 0..1rem
    font: FONTS[0].value,
  });

  // carica valori correnti da CSS
  useEffect(() => {
    const cs = getComputedStyle(document.documentElement);
    const p = cs.getPropertyValue("--bs-primary").trim() || "#0d6efd";
    const s = cs.getPropertyValue("--bs-secondary").trim() || "#6c757d";
    const r = cs.getPropertyValue("--bs-border-radius").trim() || "0.375rem";
    const f = cs.getPropertyValue("--bs-body-font-family").trim() || FONTS[0].value;
    const rNum = Math.min(100, Math.max(0, Math.round(parseFloat(r) * 100)));
    setTheme({ primary: p, secondary: s, radius: isFinite(rNum) ? rNum : 50, font: f });
  }, []);

  // applica tema
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--bs-primary", theme.primary);
    root.style.setProperty("--bs-secondary", theme.secondary);
    const rad = `${(theme.radius / 100).toFixed(2)}rem`;
    root.style.setProperty("--bs-border-radius", rad);
    root.style.setProperty("--bs-border-radius-sm", rad);
    root.style.setProperty("--bs-border-radius-lg", rad);
    root.style.setProperty("--bs-body-font-family", theme.font);
  }, [theme]);

  const reset = () =>
    setTheme({ primary: "#0d6efd", secondary: "#6c757d", radius: 50, font: FONTS[0].value });

  return (
    <div className="container-narrow">
      <h3 className="mb-3">Guida stile (Bootstrap 5)</h3>

      {/* Controls */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-6 col-md-3">
              <label className="form-label">Primary</label>
              <input type="color" className="form-control form-control-color"
                     value={theme.primary}
                     onChange={(e) => setTheme({ ...theme, primary: e.target.value })}/>
            </div>
            <div className="col-6 col-md-3">
              <label className="form-label">Secondary</label>
              <input type="color" className="form-control form-control-color"
                     value={theme.secondary}
                     onChange={(e) => setTheme({ ...theme, secondary: e.target.value })}/>
            </div>
            <div className="col-12 col-md-3">
              <label className="form-label">Raggio bordi</label>
              <input type="range" className="form-range" min={0} max={100}
                     value={theme.radius}
                     onChange={(e) => setTheme({ ...theme, radius: Number(e.target.value) })}/>
              <div className="form-text">{(theme.radius / 100).toFixed(2)}rem</div>
            </div>
            <div className="col-12 col-md-3">
              <label className="form-label">Font</label>
              <select className="form-select"
                      value={theme.font}
                      onChange={(e) => setTheme({ ...theme, font: e.target.value })}>
                {FONTS.map(f => <option key={f.label} value={f.value}>{f.label}</option>)}
              </select>
            </div>
          </div>
          <div className="mt-3 d-flex gap-2">
            <button className="btn btn-outline-secondary" onClick={reset}>Reset</button>
          </div>
        </div>
      </div>

      {/* Typography */}
      <div className="card mb-4">
        <div className="card-body">
          <h4 className="mb-3">Tipografia</h4>
          <h1>H1 Heading</h1>
          <h2>H2 Heading</h2>
          <h3>H3 Heading</h3>
          <p className="lead">Lead text – testo evidenziato per introduzioni.</p>
          <p>Paragrafo di esempio. Corpo del testo standard.</p>
          <small className="text-muted">Testo piccolo e attenuato.</small>
        </div>
      </div>

      {/* Buttons */}
      <div className="card mb-4">
        <div className="card-body">
          <h4 className="mb-3">Bottoni</h4>
          <div className="d-flex flex-wrap gap-2">
            <button className="btn btn-primary">Primary</button>
            <button className="btn btn-secondary">Secondary</button>
            <button className="btn btn-success">Success</button>
            <button className="btn btn-danger">Danger</button>
            <button className="btn btn-warning">Warning</button>
            <button className="btn btn-info">Info</button>
            <button className="btn btn-light">Light</button>
            <button className="btn btn-dark">Dark</button>
            <button className="btn btn-link">Link</button>
          </div>
          <div className="d-flex flex-wrap gap-2 mt-3">
            <button className="btn btn-outline-primary">Outline primary</button>
            <button className="btn btn-outline-secondary">Outline secondary</button>
          </div>
          <div className="d-flex flex-wrap gap-2 mt-3 align-items-center">
            <button className="btn btn-primary btn-sm">Small</button>
            <button className="btn btn-primary">Default</button>
            <button className="btn btn-primary btn-lg">Large</button>
          </div>
        </div>
      </div>

      {/* Form controls */}
      <div className="card mb-4">
        <div className="card-body">
          <h4 className="mb-3">Form</h4>
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label">Input</label>
              <input className="form-control" placeholder="Testo" />
            </div>
            <div className="col-md-6">
              <label className="form-label">Select</label>
              <select className="form-select">
                <option>Opzione 1</option>
                <option>Opzione 2</option>
              </select>
            </div>
            <div className="col-12">
              <label className="form-label">Textarea</label>
              <textarea className="form-control" rows={4} />
            </div>
            <div className="col-12 d-flex gap-3">
              <div className="form-check">
                <input className="form-check-input" type="checkbox" id="chk1" />
                <label className="form-check-label" htmlFor="chk1">Checkbox</label>
              </div>
              <div className="form-check form-switch">
                <input className="form-check-input" type="checkbox" id="sw1" />
                <label className="form-check-label" htmlFor="sw1">Switch</label>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts & Badges */}
      <div className="card mb-4">
        <div className="card-body">
          <h4 className="mb-3">Alert e Badge</h4>
          <div className="row g-3">
            {["primary","secondary","success","danger","warning","info","light","dark"].map(v =>
              <div className="col-md-6" key={v}>
                <div className={`alert alert-${v} mb-2`}>Alert {v}</div>
                <span className={`badge bg-${v}`}>Badge {v}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Anteprima modulo “Nuova segnalazione” */}
      <div className="card">
        <div className="card-body">
          <h4 className="mb-3">Anteprima modulo</h4>
          <div className="vstack gap-3">
            <input className="form-control" placeholder="Oggetto" />
            <div className="row g-3">
              <div className="col-md-6">
                <select className="form-select"><option>Reparto</option></select>
              </div>
              <div className="col-md-6">
                <select className="form-select"><option>Categoria</option></select>
              </div>
            </div>
            <textarea className="form-control" rows={5} placeholder="Descrizione" />
            <div className="d-flex justify-content-end gap-2">
              <button className="btn btn-outline-secondary">Annulla</button>
              <button className="btn btn-primary">Invia</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
