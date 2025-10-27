# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

## Segnalazioni

- Flusso dati
  - Lista: `GET /v1/tenant/reports` (unificata: interne + pubbliche)
  - Dettaglio messaggi: `GET /v1/tenant/reports/{reportId}/messages`
  - Cambio stato: `PATCH /v1/tenant/reports/{reportId}/status`

- Client API (`src/lib/api.ts`)
  - `listReports(params?) => Promise<Report[]>` con firma già pronta per filtri/paging server-side.
  - `getReportMessages(reportId) => Promise<ReportMessage[]>`
  - `updateReportStatus(reportId, nextStatus) => Promise<void>`
  - Al momento i filtri/paginazione sono gestiti client-side nel componente UI; la firma rimarrà stabile per passaggio a server-side.

- UI
  - Lista in `src/pages/Reports.tsx`: toolbar filtri (periodo, stato, priorità, categoria, assegnatario, canale, ricerca), paginazione client-side (10/20/50), ordinamento default per `createdAt` desc, badge canale/privacy.
  - Dettaglio in `src/pages/ReportDetail.tsx`: timeline messaggi (PUBLIC/INTERNAL), cambio stato con conferma, allegati come link/placeholder (download disabilitato se non disponibile).
  - Deep-linking: i filtri sono riflessi nella querystring.

- Config
  - `.env.local` supporta `VITE_API_BASE_URL`, `VITE_API_PREFIX`, `VITE_DEV_TENANT_ID`.
  - In dev viene inviato automaticamente l'header `x-tenant-id` se `VITE_DEV_TENANT_ID` è valorizzato.
  - In prod l'header non viene inviato dal FE (iniettato dal proxy a monte).
```
