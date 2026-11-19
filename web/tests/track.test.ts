import { describe, expect, it } from 'vitest';
import track from '../dev/fixtures/track.json';
import { ITEM_STATUS_LABEL, timelineSteps, visitText } from '@/lib/track';
import type { TrackResult } from '@/lib/pys/types';

const sample = track as unknown as TrackResult;

describe('timelineSteps', () => {
  it('marks steps before the current one as done', () => {
    expect(timelineSteps(sample).map((s) => s.state)).toEqual(['done', 'done', 'current', 'todo', 'todo', 'todo']);
    expect(timelineSteps(sample)[2].label).toBe('Visit scheduled');
  });
});

describe('visitText', () => {
  it('reads the visit date, time and technician', () => {
    expect(visitText(sample)).toBe('Wed, 25 Nov 2026, 10:00–12:00 · Technician: Ravi');
  });
  it('leaves out what is not known yet', () => {
    expect(visitText({ ...sample, visit: { ...sample.visit!, technicianFirstName: null } })).toBe('Wed, 25 Nov 2026, 10:00–12:00');
    expect(visitText({ ...sample, visit: { ...sample.visit!, startTime: null, endTime: null, technicianFirstName: null } })).toBe('Wed, 25 Nov 2026');
    expect(visitText({ ...sample, visit: null })).toBeNull();
  });
});

describe('ITEM_STATUS_LABEL', () => {
  it('has a plain label for every line status', () => {
    expect(ITEM_STATUS_LABEL.SELLER_WILL_QUOTE).toBe('Seller will send a price');
    expect(ITEM_STATUS_LABEL.PENDING).toBe('Waiting for confirmation');
  });
});
