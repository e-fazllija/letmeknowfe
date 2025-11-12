# LMW Vendor (frontend widget)

Questa cartella contiene una copia autocontenuta del widget pubblico (form segnalazione, conferma, accesso pratica) pronta da copiare/incollare in altri progetti.

## Contenuto
- components
  - ReportForm.tsx — form segnalazione (testo + voce opzionale)
  - report/VoiceSection.tsx — registrazione/caricamento audio e trascrizione
- pages
  - PublicConfirm.tsx — pagina di conferma con publicCode + secret
  - CaseAccessPublic.tsx — accesso pratica via segreto e reply pubblico
  - CaseAccessPublic.css — stile thread “chat”
- lib
  - api.ts — client HTTP con gestione `x-tenant-id` per rotte `/public/*`
  - publicReports.service.ts — lookups, presign/finalize, creazione report
  - publicCases.service.ts — stato pratica, reply con allegati
  - publicApi.ts — helper public/tenant API
  - voice.service.ts — trascrizione e upload audio
  - adminHandoff.ts — (opz.) apertura admin con payload import
- utils
  - pii.ts — avvisi su possibili PII
- index.ts — re-export pratici

## Dipendenze
- `react`, `react-dom`, `react-router-dom`
- `react-bootstrap`, `bootstrap`

Nel tuo entry importa una sola volta il CSS di Bootstrap:

```ts
import 'bootstrap/dist/css/bootstrap.min.css';
```

## Router
Aggiungi al tuo router (BrowserRouter/HashRouter):
- `/new/text` → `LmwReportForm`
- `/confirm` → `LmwPublicConfirm`
- `/case/access` → `LmwCaseAccessPublic`

Esempio:
```tsx
import { LmwReportForm, LmwPublicConfirm, LmwCaseAccessPublic } from './vendor/lmw';
// ...
<Route path="/new/text" element={<LmwReportForm />} />
<Route path="/confirm" element={<LmwPublicConfirm />} />
<Route path="/case/access" element={<LmwCaseAccessPublic />} />
```

## Variabili d’ambiente (Vite)
- `VITE_API_BASE_URL=/` (dev con proxy) oppure URL pieno in prod
- `VITE_API_PREFIX=/v1`
- `VITE_PUBLIC_TENANT_ID=<tenant_pubblico>`
- `VITE_PRESIGN_ENABLED=true` (per presign+upload allegati)
- `VITE_ATTACH_MAX_FILES=3`
- `VITE_ATTACH_MAX_FILE_MB=10`
- (opz.) `VITE_LMK_ADMIN_URL=<url_admin>`

## Note
- Gli import sono relativi e restano interni a `vendor/lmw`.
- `CaseAccessPublic.css` va incluso automaticamente dal componente pagina.
- Nessun backend “Authorization” richiesto: si usano solo endpoint pubblici.

Buon lavoro!
