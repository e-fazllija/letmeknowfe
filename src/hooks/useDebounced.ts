import { useEffect, useState } from "react";

export function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = useState<T>(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

