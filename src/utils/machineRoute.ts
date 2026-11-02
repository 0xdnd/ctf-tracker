/** Finds the machine a /target/:id route points at: by id (with or without a platform prefix) or by name. */
export function findMachineByRouteId<T extends { id: string; name: string }>(
  machines: readonly T[],
  routeId: string | undefined,
): T | undefined {
  const normalizedId = routeId?.toLowerCase().trim();
  if (!normalizedId) return undefined;
  const squashed = normalizedId.replace(/[^a-z0-9]/g, '');
  return machines.find((m) => {
    const mid = m.id.toLowerCase();
    const mname = m.name.toLowerCase();
    return (
      mid === normalizedId ||
      mid === `htb-${normalizedId}` ||
      mid === `thm-${normalizedId}` ||
      mname === normalizedId ||
      mname.replace(/[^a-z0-9]/g, '') === squashed
    );
  });
}
