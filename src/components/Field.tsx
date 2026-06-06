import type { ReactNode } from "react";

type FieldProps = {
  label: string;
  path: string;
  missingFields: string[];
  children: ReactNode;
};

export function Field({ label, path, missingFields, children }: FieldProps) {
  const missing = missingFields.includes(path);
  return (
    <label className={`field ${missing ? "fieldMissing" : ""}`}>
      <span>
        {label}
        {missing ? <b>Falta</b> : null}
      </span>
      {children}
    </label>
  );
}

