import { useEffect, useRef, useState } from "react";
import { Button, Form, Spinner } from "react-bootstrap";
import { transcribeVoiceFromFile } from "../../lib/voice.service";

type Props = {
  title?: string;
  onChange: (file: File | Blob | null) => void;
  onText?: (text: string) => void;
  onIncludeAttachmentChange?: (include: boolean) => void;
  disabled?: boolean;
};

export default function VoiceSection({ title, onChange, onText, onIncludeAttachmentChange, disabled }: Props) {
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<File | Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [transcribing, setTranscribing] = useState(false);
  const [textResult, setTextResult] = useState("");
  const [includeAsAttachment, setIncludeAsAttachment] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0] || null;
    if (file) {
      setAudioBlob(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      onChange(file);
    }
  };

  const handleRecord = async () => {
    if (!navigator.mediaDevices?.getUserMedia) return;
    setRecording(true);
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    const chunks: Blob[] = [];
    mediaRecorder.ondataavailable = (e: BlobEvent) => chunks.push(e.data);
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: "audio/webm" });
      setAudioBlob(blob);
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      onChange(blob);
      setRecording(false);
      try { stream.getTracks().forEach(t => t.stop()); } catch {}
      mediaRecorderRef.current = null;
    };
    mediaRecorder.start();
    mediaRecorderRef.current = mediaRecorder;
  };

  const handleStop = () => {
    const mr = mediaRecorderRef.current;
    if (!mr) return;
    try {
      if (mr.state !== 'inactive') mr.stop();
    } catch {}
  };

  const handleTranscribe = async () => {
    if (!audioBlob) return;
    setTranscribing(true);
    try {
      const res = await transcribeVoiceFromFile(audioBlob as Blob);
      const text = ((res as any)?.data?.text ?? (res as any)?.text ?? "");
      setTextResult(text);
      if (text && onText) onText(text);
    } catch (err) {
      // Silenzioso: la feature è opzionale
      try { console.error("[voice] transcription failed", err); } catch {}
    } finally {
      setTranscribing(false);
    }
  };

  return (
    <div className="card mt-2" id="voice-section">
      <div className="card-header">
        <strong>{title || 'Segnalazione vocale'}</strong>
      </div>
      <div className="card-body">
        <Form.Group>
          <Form.Label>Registra o carica un messaggio vocale (opzionale)</Form.Label>
          <div className="d-flex gap-2 align-items-center flex-wrap">
            {!recording ? (
              <Button variant="dark" onClick={handleRecord} disabled={!!mediaRecorderRef.current || !!disabled}>Registra</Button>
            ) : (
              <Button variant="outline-danger" onClick={handleStop} disabled={!recording}>Stop</Button>
            )}
            <Form.Control
              type="file"
              accept="audio/*"
              onChange={handleFileSelect}
              disabled={recording || !!disabled}
              style={{ maxWidth: "320px" }}
            />
          </div>

          <Form.Check
            type="switch"
            id="voice-include-switch"
            label="Includi il messaggio vocale anche come allegato nel report (facoltativo)"
            checked={includeAsAttachment}
            onChange={(e) => { const v = e.currentTarget.checked; setIncludeAsAttachment(v); onIncludeAttachmentChange?.(v); }}
            className="mt-3"
          />

          {previewUrl && (
            <div className="mt-3">
              <audio controls src={previewUrl} style={{ width: "100%" }} />
            </div>
          )}

          <div className="mt-3 d-flex align-items-center gap-2">
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={handleTranscribe}
              disabled={!audioBlob || transcribing}
            >
              {transcribing ? (
                <>
                  <Spinner size="sm" animation="border" /> Trascrizione...
                </>
              ) : (
                "Trascrivi testo"
              )}
            </Button>
            {textResult && (
              <span className="text-muted small ms-2">Testo generato: {textResult.slice(0, 60)}...</span>
            )}
          </div>
        </Form.Group>
      </div>
    </div>
  );
}

