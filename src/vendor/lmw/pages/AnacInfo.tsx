export default function AnacInfo() {
  const ANAC_LINK = "https://www.anticorruzione.it/";
  return (
    <div className="widget-shell">
      <div className="container-fluid">
        <div className="widget-hero mb-3">
          <div className="d-flex align-items-start justify-content-between flex-wrap gap-3">
            <div>
              <div className="eyebrow">Segnalazioni</div>
              <h4 className="mb-1">Canale esterno ANAC</h4>
              <div className="text-secondary small">
                Informazioni e accesso al portale ANAC per segnalazioni esterne.
              </div>
            </div>
          </div>
        </div>

        <div className="info-card p-4">
          <ol className="mb-3">
            <li>Usare il canale ANAC quando i canali interni non sono appropriati.</li>
            <li>Preparare la documentazione utile.</li>
            <li>Accedere al portale ANAC con il link seguente.</li>
          </ol>
          <div className="alert alert-secondary mb-0">
            <a href={ANAC_LINK} target="_blank" rel="noreferrer">Apri il sito ANAC</a>
          </div>
        </div>
      </div>
    </div>
  );
}
