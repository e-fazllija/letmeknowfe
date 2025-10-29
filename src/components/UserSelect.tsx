import Form from "react-bootstrap/Form";
import Spinner from "react-bootstrap/Spinner";

export type UserOption = { id: string; email?: string; name?: string };

export default function UserSelect({
  users,
  value,
  onChange,
  loading = false,
  disabled = false,
  placeholder = "Seleziona utente",
}: {
  users: UserOption[];
  value?: string;
  onChange: (v: string) => void;
  loading?: boolean;
  disabled?: boolean;
  placeholder?: string;
}) {
  if (loading) {
    return (
      <div className="form-control d-flex align-items-center" style={{ height: 38 }}>
        <Spinner size="sm" className="me-2" /> Caricamento…
      </div>
    );
  }
  return (
    <Form.Select value={value ?? ""} onChange={(e) => onChange(e.currentTarget.value)} disabled={disabled}>
      <option value="">{placeholder}</option>
      {users.map((u) => (
        <option key={u.id} value={u.id}>
          {u.name || u.email || u.id}
        </option>
      ))}
    </Form.Select>
  );
}

