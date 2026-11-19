/** The hero's "What's wrong?" dock: six common problems, short labels, the service that answers each. */
export const DOCK_PROBLEM_IDS = ['not-cooling', 'leaking', 'noisy', 'smell', 'service-due', 'gas'] as const;
export type DockProblemId = (typeof DOCK_PROBLEM_IDS)[number];

export const DOCK_PROBLEMS: ReadonlyArray<{ id: DockProblemId; label: string; serviceCode: string }> = [
  { id: 'not-cooling', label: 'Not cooling', serviceCode: 'SVC-DIAG' },
  { id: 'leaking', label: 'Leaking', serviceCode: 'SVC-DIAG' },
  { id: 'noisy', label: 'Noisy', serviceCode: 'SVC-DIAG' },
  { id: 'smell', label: 'Bad smell', serviceCode: 'SVC-FOAM' },
  { id: 'service-due', label: 'Service due', serviceCode: 'SVC-JET-WASH' },
  { id: 'gas', label: 'Needs gas', serviceCode: 'SVC-GAS' },
];
