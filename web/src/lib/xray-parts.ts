import { serviceAnswer, type PickerService, type ServiceAnswer } from '@/lib/answer';

type Pt = readonly [number, number];

/** One tappable part of the X-ray AC (web/public/hero/xray.png, 1672 × 941). */
export interface XrayPart {
  id: 'filter' | 'coil' | 'fan' | 'pcb' | 'gas' | 'drain';
  label: string;
  /** What goes wrong with this part, in the customer's words. */
  symptom: string;
  /** PYS catalog service that fixes it. */
  serviceCode: string;
  /** Hotspot position as fractions of the image (x, y). */
  spot: Pt;
  /** Part outline traced on the image, in image pixels (for the pop-out cut). */
  outline: readonly Pt[];
  /** How far the part lifts toward the viewer when selected, in image pixels. */
  lift: Pt;
}

export const XRAY_IMAGE = { src: '/hero/xray.png', w: 1672, h: 941 } as const;

export const XRAY_PARTS: readonly XrayPart[] = [
  { id: 'filter', label: 'Air filter', symptom: 'Bad smell or dusty air', serviceCode: 'SVC-FOAM', spot: [0.15, 0.5], outline: [[103, 350], [300, 300], [395, 288], [400, 585], [112, 602]], lift: [-10, -26] },
  { id: 'coil', label: 'Cooling coil', symptom: 'Not cooling well', serviceCode: 'SVC-JET-WASH', spot: [0.34, 0.44], outline: [[378, 300], [770, 270], [848, 282], [850, 585], [385, 605]], lift: [0, -30] },
  { id: 'fan', label: 'Blower fan', symptom: 'Noisy or vibrating', serviceCode: 'SVC-DIAG', spot: [0.58, 0.47], outline: [[795, 330], [1180, 305], [1240, 300], [1240, 555], [800, 580]], lift: [0, -28] },
  { id: 'pcb', label: 'Circuit board', symptom: "Won't start or keeps beeping", serviceCode: 'SVC-PCB', spot: [0.79, 0.4], outline: [[1236, 212], [1388, 200], [1390, 525], [1240, 530]], lift: [6, -24] },
  { id: 'gas', label: 'Gas pipes', symptom: 'Warm air or ice on the pipes', serviceCode: 'SVC-GAS', spot: [0.9, 0.36], outline: [[1390, 182], [1525, 178], [1528, 560], [1392, 560]], lift: [14, -20] },
  { id: 'drain', label: 'Drain tray', symptom: 'Water dripping inside', serviceCode: 'SVC-DIAG', spot: [0.6, 0.64], outline: [[868, 568], [1245, 560], [1240, 628], [875, 632]], lift: [0, 22] },
];

/** The live answer for a part: its service and price, or "Call us" if PYS did not return it. */
export function partAnswer(part: XrayPart, services: PickerService[]): ServiceAnswer {
  return serviceAnswer(part.serviceCode, services);
}

/** CSS clip-path polygon (percentages) for a part's outline. */
export function clipPolygon(outline: readonly Pt[]): string {
  return `polygon(${outline.map(([x, y]) => `${((x / XRAY_IMAGE.w) * 100).toFixed(2)}% ${((y / XRAY_IMAGE.h) * 100).toFixed(2)}%`).join(', ')})`;
}
