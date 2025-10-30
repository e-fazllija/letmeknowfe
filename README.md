# lmw-segnalazione-widget — Config & Sicurezza (FE)

Questa app React/Vite espone flussi pubblici per creare, consultare e rispondere alle segnalazioni usando esclusivamente endpoint pubblici.

Configurazione (.env.local):

- `VITE_API_BASE_URL` — Base URL API (es. https://api.example.com)
- `VITE_API_PREFIX` — Prefisso API (es. /v1)
- `VITE_DEV_TENANT_ID` — Header `x-tenant-id` inviato SOLO in sviluppo

Note importanti:

- Nessun uso di Authorization: tutti i percorsi utilizzati sono pubblici.
- In produzione NON inviare `x-tenant-id` dal browser. Verrà iniettato dal proxy; il client lo invia solo in dev se configurato.
- Privacy: evita di memorizzare PII nel browser se non strettamente necessario. Il widget salva localmente solo se l’utente acconsente e limitatamente a `{ publicCode, secret, createdAt }` con chiave `lmw_public_access:{publicCode}`.

Flussi implementati:

- Creazione segnalazione (web/voice) → mostra una pagina di conferma con `publicCode` + `secret`, con avviso “Il secret verrà mostrato una sola volta”.
- Pulsanti: “Copia secret” e “Scarica promemoria.txt”.
- Accesso pratica: input `secret` → stato e thread messaggi PUBLIC.
- Reply pubblico: textarea + upload allegati. Se il presign non è disponibile (HTTP 501), gli allegati vengono disabilitati e viene mostrato un messaggio chiaro.

Gestione errori:

- 429 (rate-limit): mostrato un messaggio chiaro e suggerito di riprovare più tardi (nessun auto-retry).
- 501 (presign): allegati non disponibili; la UI viene disabilitata.

Sviluppo:

- Esegui `npm run dev` e configura `.env.local` come sopra. Il client aggiunge `x-tenant-id` solo in dev.
