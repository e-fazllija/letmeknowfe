import { useEffect, useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { Toast, ToastContainer } from "react-bootstrap";
import { REPORT_SOURCES, REPORT_PRIVACY, PRESIGN_ENABLED, REPORTS_API_ENABLED } from "@/lib/api";
import { createReport, presignAttachment, uploadToPresigned, finalizeAttachment } from "@/lib/reports.service";
import Modal from "react-bootstrap/Modal";
import { useNavigate } from "react-router-dom";
import Spinner from "react-bootstrap/Spinner";
import { useDepartments } from "@/hooks/useDepartments";
import { useCategories } from "@/hooks/useCategories";

// Etichette (valori allineati al BE)
const SOURCE_LABELS: Record<(typeof REPORT_SOURCES)[number], string> = {
  WEB: "WEB",
  PHONE: "PHONE",
  EMAIL: "EMAIL",
  OTHER: "OTHER",
};

// Schema form (legacy UI -> payload BE nel submit)
// - Normalizza stringhe vuote a undefined per name/email
// - Rende name/email obbligatori solo se privacyMode === "CONFIDENZIALE"
const BaseSchema = z
  .object({
    date: z.string().min(1, "Data obbligatoria"),
    source: z
      .string()
      .refine((v) => (REPORT_SOURCES as readonly string[]).includes(v), { message: "Fonte non valida" }),
    privacyMode: z
      .string()
      .refine((v) => (REPORT_PRIVACY as readonly string[]).includes(v), { message: "Privacy non valida" }),
    name: z
      .preprocess(
        (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
        z.string().trim()
      )
      .optional(),
    email: z
      .preprocess(
        (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
        z.string().trim().email("Email non valida")
      )
      .optional(),
    title: z.string().trim().min(3, "Titolo minimo 3 caratteri"),
    // Gli ID arrivano come string (coercion per sicurezza)
    department: z.coerce.string().min(1, "Seleziona un reparto"),
    category: z.coerce.string().min(1, "Seleziona una categoria"),
    description: z.string().trim().min(10, "Descrizione minima 10 caratteri"),
    attachments: z.any().optional(),
    consent: z.boolean().refine((v) => v === true, { message: "Devi accettare l'informativa" }),
    revealSecret: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (data.privacyMode === "CONFIDENZIALE") {
      if (!data.name || data.name.trim().length < 3) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["name"], message: "Nome minimo 3 caratteri" });
      }
      if (!data.email) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["email"], message: "Email obbligatoria" });
      }
    }
  });

type FormData = z.input<typeof BaseSchema>;

const Schema = BaseSchema;

const DEBUG_FORM = import.meta.env.VITE_DEBUG_REPORT_FORM === "true";

export default function NewReport() {
  const navigate = useNavigate();
  const { departments, loading: loadingDeps, error: errorDeps } = useDepartments();
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; message: string; variant: "primary" | "success" | "danger" }>(
    { show: false, message: "", variant: "primary" }
  );
  const [modal, setModal] = useState<{ show: boolean; publicCode?: string; secret?: string }>({ show: false });
  const [lastCreatedId, setLastCreatedId] = useState<string | undefined>(undefined);

  useEffect(() => {
    const css = `
      .lmw-content { background:#fff; padding:1rem; border-radius:.5rem; }
      .lmw-form label{ font-weight:600; color:#111827; }
      .lmw-form .form-control, .lmw-form .form-select{
        font-weight:600; color:#111827;
        border-color:#273447; border-width:2px; box-shadow:none; background:#fff;
      }
      .lmw-form .form-control::placeholder{ color:#6b7280; font-weight:400; opacity:1; }
      .lmw-form .form-control:focus, .lmw-form .form-select:focus{
        border-color:#0d6efd; box-shadow:0 0 0 .2rem rgba(13,110,253,.15);
      }
    `;
    const tag = document.createElement("style");
    tag.setAttribute("data-lmw", "new-report-css");
    tag.innerHTML = css;
    document.head.appendChild(tag);
    return () => tag.remove();
  }, []);

  const { register, handleSubmit, watch, reset, getValues, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(Schema),
    shouldUnregister: true,
    defaultValues: {
      date: new Date().toISOString().slice(0, 10),
      source: "WEB",
      privacyMode: "ANONIMO",
      name: "",
      email: "",
      title: "",
      department: "",
      category: "",
      description: "",
      attachments: undefined,
      consent: false,
      revealSecret: true,
    },
  });

  const privacyMode = watch("privacyMode");
  const selectedDept = watch("department");
  const { categories, loading: loadingCats, error: errorCats } = useCategories(String(selectedDept || "") || undefined);

  // Lookups
  useEffect(() => {
    // alla variazione reparto, resetta la categoria scelta
    try {
      const current = getValues();
      reset({ ...current, category: "" }, { keepErrors: true, keepDirty: true });
    } catch {}
  }, [selectedDept]);

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    setSubmitting(true);
    setToast({ show: true, message: "Invio segnalazione in corso...", variant: "primary" });
    try {
      const src = (REPORT_SOURCES as readonly string[]).includes(String(data.source)) ? data.source : "OTHER";
      const prv = String(data.privacyMode) === "CONFIDENZIALE" ? "CONFIDENZIALE" : "ANONIMO";

      const body = {
        date: new Date(data.date).toISOString(),
        source: src,
        privacy: prv,
        subject: data.title,
        departmentId: data.department,
        categoryId: data.category,
        description: data.description,
      } as const;

      // Allegati via presign -> PUT -> finalize -> raccolta metadati
      let attachments: Array<{ fileName:string; mimeType:string; sizeBytes:number; storageKey:string; proof?:string }> = [];
      try {
        const filesList: FileList | undefined = (data as any)?.attachments as FileList | undefined;
        const files = filesList ? Array.from(filesList).slice(0, 3) : [];
        for (const file of files) {
          const p = await presignAttachment({ fileName: file.name, mimeType: file.type || "application/octet-stream", sizeBytes: file.size });
          await uploadToPresigned(p.uploadUrl, file, p.headers);
          await finalizeAttachment(p.storageKey, p.proof);
          attachments.push({ fileName: file.name, mimeType: file.type || "application/octet-stream", sizeBytes: file.size, storageKey: p.storageKey, ...(p.proof ? { proof: p.proof } : {}) });
        }
      } catch (e) {
        // Se fallisce la catena allegati, mostra errore specifico
        throw e;
      }

      if (REPORTS_API_ENABLED) {
        const res = await createReport({ ...(body as any), attachments });
        setToast({ show: true, message: "Segnalazione creata", variant: "success" });
        setLastCreatedId(res?.reportId);
        if (data.revealSecret && res?.publicCode && res?.secret) {
          setModal({ show: true, publicCode: res.publicCode, secret: res.secret });
        }
      } else {
        setToast({ show: true, message: "Segnalazione creata (offline)", variant: "success" });
      }

      // Reset: mantieni data/source/privacy, azzera il resto
      reset({
        date: data.date,
        source: data.source,
        privacyMode: data.privacyMode,
        name: "",
        email: "",
        title: "",
        department: "",
        category: "",
        description: "",
        attachments: undefined,
        consent: false,
        revealSecret: data.revealSecret,
      });
      // opzionale: redirect alla lista dopo pochi secondi se non si mostra la modale
      if (!(data.revealSecret)) {
        const createdParam = lastCreatedId ? `?created=${encodeURIComponent(lastCreatedId)}` : "";
        navigate(`/reports${createdParam}` as any, { replace: true } as any);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Errore sconosciuto";
      setToast({ show: true, message: `Errore creazione: ${msg}`, variant: "danger" });
      if (DEBUG_FORM) console.error("[NewReport] create error", err?.response?.status, err?.response?.data);
    } finally {
      setSubmitting(false);
    }
  };

  const onInvalid = () => {
    setToast({ show: true, message: "Compila tutti i campi obbligatori", variant: "danger" });
  };

  return (
    <div className="lmw-content">
      <h2 className="mb-3">Nuova segnalazione</h2>

      <Card className="shadow-sm">
        <Card.Body className="lmw-form">
          <Form onSubmit={handleSubmit(onSubmit, onInvalid)} noValidate>
            <Row className="mb-3">
              <Col md={6}>
                <Form.Group controlId="date">
                  <Form.Label>Data</Form.Label>
                  <Form.Control type="date" isInvalid={!!errors.date} {...register("date")} />
                  <Form.Control.Feedback type="invalid">{errors.date?.message as string}</Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group controlId="source">
                  <Form.Label>Fonte</Form.Label>
                  <Form.Select isInvalid={!!errors.source} {...register("source")}>
                    {(REPORT_SOURCES as readonly string[]).map((opt) => (
                      <option key={opt} value={opt}>{SOURCE_LABELS[opt as keyof typeof SOURCE_LABELS] || opt}</option>
                    ))}
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">{errors.source?.message as string}</Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3" controlId="privacyMode">
              <Form.Label>Privacy del segnalante</Form.Label>
              <Form.Select {...register("privacyMode")}>
                {(REPORT_PRIVACY as readonly string[]).map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </Form.Select>
            </Form.Group>

            {privacyMode === "CONFIDENZIALE" && (
              <div className="p-3 border rounded mb-3 bg-light">
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3" controlId="name">
                      <Form.Label>Nome e cognome</Form.Label>
                      <Form.Control type="text" placeholder="Es. Mario Rossi" isInvalid={!!errors.name} {...register("name")} />
                      <Form.Control.Feedback type="invalid">{errors.name?.message as string}</Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3" controlId="email">
                      <Form.Label>Email</Form.Label>
                      <Form.Control type="email" placeholder="nome@azienda.it" isInvalid={!!errors.email} {...register("email")} />
                      <Form.Control.Feedback type="invalid">{errors.email?.message as string}</Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                </Row>
              </div>
            )}

            <Form.Group className="mb-3" controlId="title">
              <Form.Label>Oggetto</Form.Label>
              <Form.Control type="text" placeholder="Oggetto della segnalazione" isInvalid={!!errors.title} {...register("title")} />
              <Form.Control.Feedback type="invalid">{errors.title?.message as string}</Form.Control.Feedback>
            </Form.Group>

            <Row className="mb-3">
              <Col md={6}>
                <Form.Group controlId="department">
                  <Form.Label>Reparto</Form.Label>
                  {loadingDeps ? (
                    <div className="form-control d-flex align-items-center" style={{ height: 38 }}>
                      <Spinner size="sm" className="me-2" /> Caricamentoâ€¦
                    </div>
                  ) : (
                    <Form.Select
                      isInvalid={!!errors.department}
                      {...register("department", {
                        required: true,
                        onChange: (_e) => {
                          try {
                            setValue("category", "", { shouldValidate: true });
                          } catch {
                            const current = getValues();
                            reset({ ...current, category: "" }, { keepErrors: true, keepDirty: true });
                          }
                        },
                      })}
                      defaultValue=""
                    >
                      <option value="">Seleziona...</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </Form.Select>
                  )}
                  {!loadingDeps && !departments.length && (
                    <small className="text-danger">Nessun reparto disponibile</small>
                  )}
                  {errorDeps ? <small className="text-danger">{String(errorDeps)}</small> : null}
                  <Form.Control.Feedback type="invalid">{errors.department?.message as string}</Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group controlId="category">
                  <Form.Label>Categoria</Form.Label>
                  {loadingCats ? (
                    <div className="form-control d-flex align-items-center" style={{ height: 38 }}>
                      <Spinner size="sm" className="me-2" /> Caricamentoâ€¦
                    </div>
                  ) : (
                    <Form.Select isInvalid={!!errors.category} disabled={!categories.length} {...register("category", { required: true })} defaultValue="">
                      <option value="">{selectedDept ? "Seleziona..." : "Seleziona prima un reparto"}</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </Form.Select>
                  )}
                  {!loadingCats && !!selectedDept && !categories.length && (
                    <small className="text-danger">Nessuna categoria per il reparto selezionato</small>
                  )}
                  {errorCats ? <small className="text-danger">{String(errorCats)}</small> : null}
                  <Form.Control.Feedback type="invalid">{errors.category?.message as string}</Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3" controlId="description">
              <Form.Label>Descrizione</Form.Label>
              <Form.Control as="textarea" rows={6} placeholder="Descrivi i fatti, contesto, luoghi, persone coinvolte, date..." isInvalid={!!errors.description} {...register("description")} />
              <Form.Control.Feedback type="invalid">{errors.description?.message as string}</Form.Control.Feedback>
            </Form.Group>

            <Form.Group className="mb-3" controlId="attachments">
              <Form.Label>Allegati</Form.Label>
              <Form.Control type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.heic" disabled={!PRESIGN_ENABLED} title={PRESIGN_ENABLED ? undefined : "Funzione non disponibile"} {...register("attachments")} />
              <div className="form-text">{PRESIGN_ENABLED ? "File fino a ~100MB." : "Funzione non disponibile."}</div>
            </Form.Group>

            <Form.Group className="mb-3" controlId="revealSecret">
              <Form.Check type="switch" label="Rivela la passphrase univoca al termine della creazione" {...register("revealSecret")} />
            </Form.Group>

            <Form.Group className="mb-4" controlId="consent">
              <Form.Check type="checkbox" label="Dichiaro di aver letto e compreso l'informativa" isInvalid={!!errors.consent} {...register("consent")} />
              {errors.consent && (<div className="invalid-feedback d-block">{errors.consent.message as string}</div>)}
            </Form.Group>

            <div className="d-flex gap-2">
              <Button type="submit" variant="dark" disabled={isSubmitting || submitting} aria-busy={isSubmitting || submitting}>
                {isSubmitting || submitting ? "Invio..." : "Crea segnalazione"}
              </Button>
              <Button type="button" variant="outline-secondary" onClick={() => reset()} disabled={isSubmitting || submitting}>
                Annulla
              </Button>
            </div>
          </Form>
          <ToastContainer position="bottom-end" className="p-3">
            <Toast bg={toast.variant} onClose={() => setToast((t) => ({ ...t, show: false }))} show={toast.show} delay={2200} autohide>
              <Toast.Body style={{ color: toast.variant === "danger" ? "#fff" : undefined }}>{toast.message}</Toast.Body>
            </Toast>
          </ToastContainer>
        </Card.Body>
      </Card>
      {/* Success modal with publicCode + secret */}
      <Modal show={modal.show} onHide={() => { setModal({ show: false }); const createdParam = lastCreatedId ? `?created=${encodeURIComponent(lastCreatedId)}` : ""; navigate(`/reports${createdParam}`, { replace: true }); }} centered>
        <Modal.Header closeButton>
          <Modal.Title>Segnalazione creata</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-2">Annota i seguenti dati; verranno mostrati una sola volta.</p>
          <div className="p-2 border rounded">
            <div><strong>Codice pubblico:</strong> {modal.publicCode || '-'}</div>
            <div className="mt-1"><strong>Passphrase segreta:</strong> {modal.secret || '-'}</div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="dark" onClick={() => { setModal({ show: false }); const createdParam = lastCreatedId ? `?created=${encodeURIComponent(lastCreatedId)}` : ""; navigate(`/reports${createdParam}`, { replace: true }); }}>Vai a Segnalazioni</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
