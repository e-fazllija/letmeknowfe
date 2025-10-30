// src/components/ReportForm.tsx
import { useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import Alert from "react-bootstrap/Alert";
import Card from "react-bootstrap/Card";

/* ============================
   Helper: Handoff all'admin LMK
   ============================ */

// URL dell'app admin (fallback su localhost:5173)
const ADMIN_URL =
  (import.meta as any).env?.VITE_LMK_ADMIN_URL || "http://localhost:5173/";

// Tipo del payload che l'admin sa importare
type AdminImportPayload = {
  id?: string;
  createdAt?: string;
  reporterType?: "Anonimo" | "Confidenziale";
  // (rimosso) source?: string;
  department?: string;
  category?: string;
  description: string;          // ***obbligatorio***
  authorEmail?: string;
  attachments?: string[];       // nomi file (no binari via URL)
  title?: string;
  summary?: string;
};

// Codifica sicura UTF-8 → base64 (accenti/emoji ok)
function toBase64Utf8(obj: unknown): string {
  const json = JSON.stringify(obj);
  const bytes = new TextEncoder().encode(json);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

// Apre l'admin su /reports con ?import=<base64>
function openInAdmin(payload: AdminImportPayload, newTab = true) {
  const b64 = toBase64Utf8(payload);
  const url = `${ADMIN_URL}#/reports?import=${encodeURIComponent(b64)}`;
  if (newTab) window.open(url, "_blank", "noopener,noreferrer");
  else window.location.href = url;
}

/* ============================
   Schema Zod del form widget
   ============================ */

const ReportSchema = z
  .object({
    anonymous: z.boolean(),
    name: z.string().trim().optional(),
    email: z.string().trim().email("Email non valida").optional(),
    title: z.string().trim().min(3, "Titolo minimo 3 caratteri"),
    department: z.string().trim().optional(),
    category: z.string().trim().min(1, "Seleziona una categoria"),
    description: z.string().trim().min(10, "Descrizione minima 10 caratteri"),
    consent: z.boolean(),
    attachments: z.any().optional(),
  })
  .superRefine((val, ctx) => {
    if (!val.anonymous) {
      if (!val.name || val.name.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["name"],
          message: "Nome obbligatorio se la segnalazione è nominativa",
        });
      }
      if (!val.email) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["email"],
          message: "Email obbligatoria se la segnalazione è nominativa",
        });
      }
    }
  });

type ReportFormData = z.infer<typeof ReportSchema>;

export default function ReportForm() {
  const [submitted, setSubmitted] = useState<null | { ok: boolean; msg: string }>(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ReportFormData>({
    resolver: zodResolver(ReportSchema),
    defaultValues: {
      anonymous: true,
      name: "",
      email: "",
      title: "",
      department: "",
      category: "",
      description: "",
      consent: false,
      attachments: undefined,
    },
  });

  const anonymous = watch("anonymous");

  const onSubmit: SubmitHandler<ReportFormData> = async (data) => {
    // Prepara elenco file (solo metadati locali)
    const files: File[] = [];
    const list = (data as any).attachments as FileList | undefined;
    if (list?.length) for (let i = 0; i < list.length; i++) files.push(list.item(i)!);

    // Payload "completo" del widget (per eventuale log/preview locale)
    const widgetPayload = {
      ...data,
      attachments: files.map((f) => ({ name: f.name, size: f.size, type: f.type })),
    };
    console.log("PAYLOAD (widget):", widgetPayload);

    // >>> Handoff all'admin (SUBITO, per evitare popup blocker)
    const adminPayload: AdminImportPayload = {
      // se non passi id, l'admin lo genera (R-YYYY-XXXX)
      createdAt: new Date().toISOString(),
      reporterType: data.anonymous ? "Anonimo" : "Confidenziale",
      // (rimosso) source: "Widget Web",
      department: data.department || undefined,
      category: data.category,
      description: data.description,
      authorEmail: data.anonymous ? undefined : data.email,
      attachments: files.map((f) => f.name), // SOLO nomi (niente binario via URL)
      title: data.title,
      // summary: puoi aggiungere un campo "shortDescription" se lo vuoi distinto
    };
    openInAdmin(adminPayload, true); // nuova scheda; usa false per stessa scheda

    // Mock: simula invio locale (puoi tenere o rimuovere)
    await new Promise((r) => setTimeout(r, 300));
    setSubmitted({ ok: true, msg: "Segnalazione inviata (mock) ✅" });

    // Reset mantenendo lo stato anonimo selezionato
    reset({
      anonymous: data.anonymous,
      name: "",
      email: "",
      title: "",
      department: "",
      category: "",
      description: "",
      consent: false,
      attachments: undefined,
    });
  };

  return (
    <Card className="shadow-sm">
      <Card.Body>
        <h4 className="mb-3">Crea segnalazione</h4>

        {submitted?.ok && <Alert variant="success">{submitted.msg}</Alert>}

        <Form onSubmit={handleSubmit(onSubmit)} noValidate>
          {/* Anonimo */}
          <Form.Check
            type="switch"
            id="anonymous"
            label="Invia come segnalazione anonima"
            className="mb-3"
            {...register("anonymous")}
          />
          <div className="text-muted small mb-3">
            Se disattivi l’anonimato, ti verranno richiesti nome ed email per eventuali contatti.
          </div>

          {/* Dati personali se NON anonimo */}
          {!anonymous && (
            <div className="p-3 border rounded mb-3 bg-light">
              <Form.Group className="mb-3" controlId="name">
                <Form.Label>Nome e cognome</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Es. Mario Rossi"
                  isInvalid={!!errors.name}
                  {...register("name")}
                />
                <Form.Control.Feedback type="invalid">
                  {errors.name?.message}
                </Form.Control.Feedback>
              </Form.Group>

              <Form.Group controlId="email">
                <Form.Label>Email</Form.Label>
                <Form.Control
                  type="email"
                  placeholder="nome@azienda.it"
                  isInvalid={!!errors.email}
                  {...register("email")}
                />
                <Form.Control.Feedback type="invalid">
                  {errors.email?.message}
                </Form.Control.Feedback>
              </Form.Group>
            </div>
          )}

          {/* Titolo */}
          <Form.Group className="mb-3" controlId="title">
            <Form.Label>Titolo</Form.Label>
            <Form.Control
              type="text"
              placeholder="Es. Segnalazione di condotta impropria"
              isInvalid={!!errors.title}
              {...register("title")}
            />
            <Form.Control.Feedback type="invalid">
              {errors.title?.message}
            </Form.Control.Feedback>
          </Form.Group>

          {/* Reparto (opzionale, testo libero) */}
          <Form.Group className="mb-3" controlId="department">
            <Form.Label>Reparto (opzionale)</Form.Label>
            <Form.Control
              type="text"
              placeholder="Es. IT, Acquisti, HR…"
              {...register("department")}
            />
          </Form.Group>

          {/* Categoria */}
          <Form.Group className="mb-3" controlId="category">
            <Form.Label>Categoria</Form.Label>
            <Form.Select
              aria-label="Seleziona categoria"
              isInvalid={!!errors.category}
              {...register("category")}
            >
              <option value="">— Seleziona —</option>
              <option value="etica">Etica / Condotta</option>
              <option value="sicurezza">Sicurezza sul lavoro</option>
              <option value="frodi">Frodi / Irregolarità</option>
              <option value="privacy">Privacy / Dati personali</option>
              <option value="altro">Altro</option>
            </Form.Select>
            <Form.Control.Feedback type="invalid">
              {errors.category?.message}
            </Form.Control.Feedback>
          </Form.Group>

          {/* Descrizione */}
          <Form.Group className="mb-3" controlId="description">
            <Form.Label>Descrizione</Form.Label>
            <Form.Control
              as="textarea"
              rows={6}
              placeholder="Descrivi i fatti, contesto, luoghi, persone coinvolte, date…"
              isInvalid={!!errors.description}
              {...register("description")}
            />
            <Form.Control.Feedback type="invalid">
              {errors.description?.message}
            </Form.Control.Feedback>
          </Form.Group>

          {/* Allegati */}
          <Form.Group className="mb-3" controlId="attachments">
            <Form.Label>Allegati (opzionali)</Form.Label>
            <Form.Control
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.heic"
              {...register("attachments")}
            />
            <div className="form-text">
              Formati: PDF, JPG, PNG, HEIC. I limiti reali li valideremo lato backend.
            </div>
          </Form.Group>

          {/* Consenso */}
          <Form.Group className="mb-4" controlId="consent">
            <Form.Check
              type="checkbox"
              label="Dichiaro di aver letto e compreso l'informativa"
              isInvalid={!!errors.consent}
              {...register("consent")}
            />
            {errors.consent && (
              <div className="invalid-feedback d-block">
                {errors.consent.message as string}
              </div>
            )}
          </Form.Group>

          <div className="d-flex gap-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Invio…" : "Invia segnalazione"}
            </Button>
            <Button
              type="button"
              variant="outline-secondary"
              onClick={() => reset()}
              disabled={isSubmitting}
            >
              Svuota
            </Button>
          </div>
        </Form>
      </Card.Body>
    </Card>
  );
}
