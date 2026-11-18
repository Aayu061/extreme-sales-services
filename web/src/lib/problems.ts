/**
 * "What does your AC need?" — the customer names the symptom; we point at the catalog service
 * that answers it. Codes are PYS catalog codes (service_catalog_items.code). Plans and new ACs
 * link to their own pages instead of a single service.
 */
export type ProblemChip =
  | { id: string; label: string; tone: 'problem' | 'default'; serviceCode: string; note: string }
  | { id: string; label: string; tone: 'default'; href: string; note: string };

export const PROBLEM_CHIPS: ProblemChip[] = [
  { id: 'not-cooling', label: 'Not cooling', tone: 'problem', serviceCode: 'SVC-DIAG', note: 'A technician finds the cause first, then quotes any repair before starting.' },
  { id: 'leaking', label: 'Water leaking', tone: 'problem', serviceCode: 'SVC-DIAG', note: 'Usually a blocked drain or ice on the coil. We check and tell you the fix.' },
  { id: 'noisy', label: 'Noisy or vibrating', tone: 'problem', serviceCode: 'SVC-DIAG', note: 'Loose parts, fan or compressor. Diagnosed on the visit.' },
  { id: 'smell', label: 'Bad smell', tone: 'problem', serviceCode: 'SVC-FOAM', note: 'Foam wash and sanitisation clears mould and odour from the coil.' },
  { id: 'service-due', label: 'Service due', tone: 'default', serviceCode: 'SVC-JET-WASH', note: 'Full jet wash of indoor and outdoor units.' },
  { id: 'gas', label: 'Needs gas', tone: 'problem', serviceCode: 'SVC-GAS', note: 'Leak test first, then gas charging.' },
  { id: 'install', label: 'Install or shift', tone: 'default', serviceCode: 'SVC-INSTALL', note: 'Installation of a new or moved AC.' },
  { id: 'amc', label: 'Yearly maintenance plan', tone: 'default', href: '/amc', note: 'Compare AMC plans for your AC type and size.' },
  { id: 'buy', label: 'Buy a new AC', tone: 'default', href: '/shop', note: 'New split and window ACs with full price incl. GST.' },
];
