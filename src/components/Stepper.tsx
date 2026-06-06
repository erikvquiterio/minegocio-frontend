import type { LucideIcon } from "lucide-react";

export type StepItem = {
  id: number;
  label: string;
  icon: LucideIcon;
};

type StepperProps = {
  steps: StepItem[];
  currentStep: number;
  completion: number;
  onStep: (step: number) => void;
};

export function Stepper({ steps, currentStep, completion, onStep }: StepperProps) {
  return (
    <aside className="stepper">
      <div className="progressBlock">
        <span>Progreso</span>
        <strong>{completion}%</strong>
        <div className="progressTrack">
          <div style={{ width: `${completion}%` }} />
        </div>
      </div>
      <nav aria-label="Pasos del registro">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <button
              className={`stepButton ${currentStep === step.id ? "active" : ""}`}
              key={step.id}
              onClick={() => onStep(step.id)}
              type="button"
              title={step.label}
            >
              <Icon size={18} />
              <span>{step.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

