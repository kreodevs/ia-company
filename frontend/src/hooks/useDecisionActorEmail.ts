import { useAuth } from "../context/AuthContext";

/** Email sent as `actorEmail` when approving or rejecting decision proposals. */
export function useDecisionActorEmail(): string | undefined {
  const { tenantUser, superAdmin } = useAuth();
  return tenantUser?.email ?? superAdmin?.email ?? undefined;
}
