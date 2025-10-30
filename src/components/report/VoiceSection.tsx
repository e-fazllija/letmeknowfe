import { useEffect, useRef, useState } from "react";
import { Button, Form, Spinner } from "react-bootstrap";
import { presignVoiceAttachment, transcribeVoice } from "../../lib/voice.service";

type Props = {
  onChange: (file: File | Blob | null) => void;
  onText?: (text: string) => void;
  disabled?: boolean;
};

export default function VoiceSection({ onChange, onText, disabled }: Props) {
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
    };
    mediaRecorder.start();
    mediaRecorderRef.current = mediaRecorder;
    // Stop automatico a 30s
    setTimeout(() => mediaRecorder.stop(), 30000);
  };

  const handleTranscribe = async () => {
    if (!audioBlob) return;
    setTranscribing(true);
    try {
      const fileName = (audioBlob as File).name || "voice_message.webm";
      const mimeType = (audioBlob as File).type || (audioBlob as any).type || "audio/webm";
      const sizeBytes = (audioBlob as File).size || (audioBlob as any).size || 0;

      // Presign upload
      const items = await presignVoiceAttachment([
        { fileName, mimeType, sizeBytes },
      ]);
      if (!items.length) throw new Error("Presign non ha restituito elementi");
      const { uploadUrl, headers, storageKey } = items[0];

      await fetch(uploadUrl, { method: "PUT", body: audioBlob, headers });
      const res = await transcribeVoice(storageKey);
      const text = (res as any)?.data?.text || "";
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
        <strong>Segnalazione vocale</strong>
      </div>
      <div className="card-body">
        <Form.Group>
          <Form.Label>Registra o carica un messaggio vocale (opzionale)</Form.Label>
          <div className="d-flex gap-2 align-items-center flex-wrap">
            <Button variant="dark" onClick={handleRecord} disabled={recording || !!mediaRecorderRef.current || !!disabled}>
              {recording ? "Registrazione..." : "Registra"}
            </Button>
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
            onChange={(e) => setIncludeAsAttachment(e.currentTarget.checked)}
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
