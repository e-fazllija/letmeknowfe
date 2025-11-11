import { useEffect, useMemo, useRef, useState } from 'react';
import Modal from 'react-bootstrap/Modal';

type Props = {
  open: boolean;
  blob?: Blob;
  mime?: string;
  viewerEmail: string;
  onClose: () => void;
};

export default function AttachmentPreviewModal({ open, blob, mime, viewerEmail, onClose }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const ts = useMemo(() => new Date().toISOString(), [open]);

  useEffect(() => {
    if (blob) {
      const u = URL.createObjectURL(blob);
      objectUrlRef.current = u;
      setUrl(u);
    } else {
      setUrl(null);
    }
    return () => {
      if (objectUrlRef.current) {
        try { URL.revokeObjectURL(objectUrlRef.current); } catch {}
        objectUrlRef.current = null;
      }
    };
  }, [blob]);

  return (
    <Modal show={open} onHide={onClose} size="lg" centered aria-labelledby="attachment-preview-title">
      <Modal.Header closeButton>
        <Modal.Title id="attachment-preview-title">Anteprima allegato</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div style={{ position: 'relative' }}>
          {url ? (
            String(mime || '').startsWith('image/') ? (
              <img
                src={url}
                alt="Anteprima"
                draggable={false}
                onContextMenu={(e) => e.preventDefault()}
                style={{ maxWidth: '100%', display: 'block', margin: '0 auto' }}
              />
            ) : (
              <object data={url} type={mime || 'application/pdf'} style={{ width: '100%', height: '70vh' }}>
                <div className="text-muted">Anteprima non disponibile per questo tipo di file.</div>
              </object>
            )
          ) : (
            <div className="text-muted">Anteprima non disponibile</div>
          )}
          <div
            aria-hidden
            style={{
              position: 'absolute', inset: 0, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >
            <div
              style={{ transform: 'rotate(-18deg)', opacity: 0.25, color: '#111827', fontWeight: 800, fontSize: 28, textAlign: 'center', userSelect: 'none' }}
            >
              {`AUDIT – ${viewerEmail || ''} – ${ts}`}
            </div>
          </div>
        </div>
      </Modal.Body>
    </Modal>
  );
}

