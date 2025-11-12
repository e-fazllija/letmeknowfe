export default function AnacInfo() {
  const ANAC_LINK = "https://www.anticorruzione.it/";
  return (
    <div className="container-narrow">
      <h3 className="mb-3">Canale esterno ANAC</h3>
      <ol>
        <li>Usare il canale ANAC quando i canali interni non sono appropriati.</li>
        <li>Preparare la documentazione utile.</li>
        <li>Accedere al portale ANAC con il link seguente.</li>
      </ol>
      <div className="alert alert-secondary">
        <a href={ANAC_LINK} target="_blank" rel="noreferrer">Apri il sito ANAC</a>
      </div>
    </div>
  );
}

