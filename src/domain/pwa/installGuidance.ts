interface InstallGuidanceContext {
  userAgent: string;
  platform: string;
  maxTouchPoints: number;
  standalone: boolean;
}

export function getInstallGuidance({
  userAgent,
  platform,
  maxTouchPoints,
  standalone,
}: InstallGuidanceContext): string | null {
  if (standalone) return null;

  const isAppleMobile =
    /iPhone|iPad|iPod/i.test(userAgent) ||
    (platform === "MacIntel" && maxTouchPoints > 1);

  return isAppleMobile
    ? "No iPhone ou iPad, toca em Partilhar e escolhe “Adicionar ao ecrã principal”."
    : null;
}
