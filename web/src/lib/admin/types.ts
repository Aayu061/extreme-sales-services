/**
 * Shapes of the PYS ESS admin API (/api/v1/ess/admin), mirrored from PYS
 * (server/src/middleware/essActor.ts, server/src/services/essAdmin.service.ts).
 */

export type EssRole = 'ESS_ADMIN' | 'ESS_STAFF';

/** The signed-in person (GET /me). A PYS Admin always has ESS_ADMIN in `roles`. */
export interface AdminMe {
  roles: EssRole[];
  isPysAdmin: boolean;
  name: string | null;
  email: string | null;
}
