import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StepperStep {
  id: string;
  label: string;
  description?: string;
}

export interface StepperProps {
  steps: StepperStep[];
  /** 0-based index of the current step. Steps before this are marked complete. */
  current: number;
  /** Optional override: mark a step as errored (renders red node). */
  errorIndex?: number;
  className?: string;
}

/**
 * Horizontal stepper with circular nodes connected by a track that smoothly
 * fills with the accent color as the user progresses.
 *
 * Pattern matches the system spec: dark-track behind, blue gradient fill on top
 * with `transition-all duration-300`.
 */
export function Stepper({ steps, current, errorIndex, className }: StepperProps) {
  if (steps.length === 0) return null;

  // Fill percent: how much of the track between first and last node is "done".
  const denom = Math.max(steps.length - 1, 1);
  const fillPercent = Math.max(0, Math.min(100, (current / denom) * 100));

  return (
    <div className={cn('relative w-full', className)}>
      {/* Track + fill */}
      <div className="absolute left-4 right-4 top-4 h-0.5 -translate-y-1/2">
        <div className="absolute inset-0 stepper-track rounded-full" />
        <div
          className="stepper-fill absolute inset-y-0 left-0 rounded-full"
          style={{ width: `${fillPercent}%` }}
        />
      </div>

      {/* Nodes */}
      <ol className="relative flex items-start justify-between">
        {steps.map((step, idx) => {
          const isComplete = idx < current;
          const isActive = idx === current;
          const isError = errorIndex === idx;
          return (
            <li key={step.id} className="flex flex-1 flex-col items-center text-center">
              <div
                className={cn(
                  'relative z-10 flex h-8 w-8 items-center justify-center rounded-full border transition-all duration-300',
                  isError
                    ? 'border-rose-500 bg-rose-500/20 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.4)]'
                    : isComplete
                      ? 'border-blue-400/60 bg-blue-500 text-slate-900 shadow-[0_0_12px_rgba(59,130,246,0.45)]'
                      : isActive
                        ? 'border-blue-400/70 bg-blue-500/20 text-blue-200 shadow-[0_0_14px_rgba(59,130,246,0.45)]'
                        : 'border-white/10 bg-zinc-950/60 text-slate-500'
                )}
              >
                {isComplete && !isError ? (
                  <Check className="h-4 w-4" strokeWidth={3} />
                ) : (
                  <span className="text-xs font-bold tabular-nums">{idx + 1}</span>
                )}
              </div>
              <div className="mt-2 max-w-[120px]">
                <div
                  className={cn(
                    'text-[11px] font-semibold uppercase tracking-wider transition-colors',
                    isError
                      ? 'text-rose-300'
                      : isActive
                        ? 'text-blue-300'
                        : isComplete
                          ? 'text-slate-300'
                          : 'text-slate-500'
                  )}
                >
                  {step.label}
                </div>
                {step.description && (
                  <div className="mt-0.5 text-[10px] leading-tight text-slate-500">
                    {step.description}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
