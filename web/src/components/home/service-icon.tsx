import {
  ArrowDownToLine,
  CircuitBoard,
  Droplets,
  Fan,
  Gauge,
  PackageOpen,
  Sparkles,
  Stethoscope,
  Wind,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/cn';

type Tone = 'sky' | 'violet' | 'mint' | 'amber' | 'coral';

/** Colour by kind of work: cleaning sky, gas violet, fitting mint, checks amber, repairs coral. */
const BY_CODE: Record<string, { icon: LucideIcon; tone: Tone }> = {
  'SVC-DRY': { icon: Wind, tone: 'sky' },
  'SVC-JET-WASH': { icon: Droplets, tone: 'sky' },
  'SVC-FOAM': { icon: Sparkles, tone: 'sky' },
  'SVC-PUMPDOWN': { icon: ArrowDownToLine, tone: 'violet' },
  'SVC-GAS': { icon: Gauge, tone: 'violet' },
  'SVC-INSTALL': { icon: Wrench, tone: 'mint' },
  'SVC-UNINSTALL': { icon: PackageOpen, tone: 'mint' },
  'SVC-DIAG': { icon: Stethoscope, tone: 'amber' },
  'SVC-PCB': { icon: CircuitBoard, tone: 'coral' },
  'SVC-FAN': { icon: Fan, tone: 'coral' },
  'SVC-ELEC': { icon: Zap, tone: 'coral' },
};

const BY_CATEGORY: Record<string, { icon: LucideIcon; tone: Tone }> = {
  CLEANING: { icon: Droplets, tone: 'sky' },
  GAS: { icon: Gauge, tone: 'violet' },
  INSTALLATION: { icon: Wrench, tone: 'mint' },
  DIAGNOSIS: { icon: Stethoscope, tone: 'amber' },
  REPAIR: { icon: CircuitBoard, tone: 'coral' },
};

const TONE_CLASS: Record<Tone, string> = {
  sky: 'bg-tint-sky text-ink-sky',
  violet: 'bg-tint-violet text-ink-violet',
  mint: 'bg-tint-mint text-ink-mint',
  amber: 'bg-tint-amber text-ink-amber',
  coral: 'bg-tint-coral text-ink-coral',
};

export function serviceLook(code: string, category: string) {
  return BY_CODE[code] ?? BY_CATEGORY[category] ?? { icon: Wrench, tone: 'sky' as Tone };
}

export function ServiceIcon({ code, category, className }: { code: string; category: string; className?: string }) {
  const { icon: Icon, tone } = serviceLook(code, category);
  return (
    <span className={cn('inline-flex size-12 shrink-0 items-center justify-center rounded-[12px]', TONE_CLASS[tone], className)}>
      <Icon aria-hidden="true" size={24} strokeWidth={2} />
    </span>
  );
}
