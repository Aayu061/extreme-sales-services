'use client';

import { useEffect } from 'react';
import { forgetEndedSession } from '@/app/(site)/account/actions';

/** After PYS says the session has ended, remove the old sign-in cookie (a page cannot change cookies while it renders). */
export function ForgetEndedSession() {
  useEffect(() => {
    void forgetEndedSession().catch(() => undefined);
  }, []);
  return null;
}
