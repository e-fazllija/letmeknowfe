// src/lib/api.auth.header.ts
// Cookie-first: questo modulo non aggiunge alcun header Authorization.
// Lasciamo la gestione degli interceptor all'istanza in src/lib/api.ts.
import api from "@/lib/api";

try { (api.defaults as any).withCredentials = true; } catch {}

// Intenzionalmente nessun interceptor qui.

