// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useRequestSubmit } from '@/components/forms/use-request-submit';
import type { SiteRequestInput } from '@/lib/request-schema';

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

const contactRequest = (ref: string): SiteRequestInput => ({
  kind: 'CONTACT',
  ref,
  message: 'Please call me about my AC',
  contact: { name: 'Asha Rao', phone: '9876543210' },
  consent: { privacy: true, marketing: false },
  hp: '',
  elapsedMs: 5000,
});
const sentRef = (call: number) => JSON.parse(fetchMock.mock.calls[call][1].body).ref;
const ok = () => new Response(JSON.stringify({ trackingCode: 'ESS-AAAA-BBBB', intakeNumber: 'WEB-1' }), { status: 200 });

describe('useRequestSubmit', () => {
  it('sends once even when tapped twice quickly', async () => {
    let release: (r: Response) => void = () => {};
    fetchMock.mockImplementation(() => new Promise<Response>((r) => (release = r)));
    const { result } = renderHook(() => useRequestSubmit());
    await act(async () => {
      void result.current.send(contactRequest);
      void result.current.send(contactRequest);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await act(async () => release(ok()));
  });

  it('retries with the same reference after a failure, and a new one after success', async () => {
    const { result } = renderHook(() => useRequestSubmit());
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ error: 'down' }), { status: 502 }));
    await act(() => result.current.send(contactRequest));
    expect(result.current.state).toBe('error');
    expect(result.current.error).toBe('down');
    fetchMock.mockResolvedValueOnce(ok());
    await act(() => result.current.send(contactRequest));
    expect(sentRef(1)).toBe(sentRef(0));
    expect(result.current.state).toBe('done');
    expect(result.current.result?.trackingCode).toBe('ESS-AAAA-BBBB');
    fetchMock.mockResolvedValueOnce(ok());
    await act(() => result.current.send(contactRequest));
    expect(sentRef(2)).not.toBe(sentRef(0));
  });

  it('shows field errors without sending when the details are wrong', async () => {
    const { result } = renderHook(() => useRequestSubmit());
    await act(() => result.current.send((ref) => ({ ...contactRequest(ref), contact: { name: 'A', phone: '123' } })));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.fields['contact.phone']).toBe('Enter a valid 10-digit mobile number.');
    expect(result.current.fields['contact.name']).toBeTruthy();
  });
});
