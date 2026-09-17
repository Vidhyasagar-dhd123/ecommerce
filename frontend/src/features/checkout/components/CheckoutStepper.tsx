import { CheckCircle } from 'lucide-react';
import type { Step } from '../model/schemas';

interface CheckoutStepperProps {
  step: Step;
}

const STEPS: Step[] = ['address', 'payment', 'confirm'];

export function CheckoutStepper({ step }: CheckoutStepperProps) {
  const stepIndex = STEPS.indexOf(step);

  return (
    <div className="mb-10 flex items-center gap-2">
      {STEPS.map((s, idx) => (
        <div key={s} className="flex items-center gap-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-colors duration-200"
            style={{
              background: idx <= stepIndex ? 'var(--color-primary)' : 'var(--color-surface-raised)',
              color:      idx <= stepIndex ? '#fff' : 'var(--color-text-muted)',
            }}
          >
            {idx < stepIndex ? <CheckCircle className="h-4 w-4" /> : idx + 1}
          </div>
          <span
            className="text-xs font-medium capitalize"
            style={{ color: idx <= stepIndex ? 'var(--color-primary)' : 'var(--color-text-muted)' }}
          >
            {s}
          </span>
          {idx < STEPS.length - 1 && (
            <div className="h-px w-8" style={{ background: 'var(--color-border)' }} />
          )}
        </div>
      ))}
    </div>
  );
}
