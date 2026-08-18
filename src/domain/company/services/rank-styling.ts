export interface RankGradientColors {
  gradientFromColor: string;
  gradientFromStop: string;
  gradientToColor: string;
  gradientToStop: string;
}

// Gradient colors are now arbitrary per-rank data from CompanyRankStyle,
// not one of 4 hardcoded Tailwind arbitrary-value classes baked into the
// source text Tailwind's JIT scanner picks up at build time - so this
// returns an inline style instead of a `from-[...] to-[...]` class string.
// Pair with the static "bg-clip-text text-transparent" utility classes.
export function rankGradientStyle(colors: RankGradientColors): {
  backgroundImage: string;
} {
  return {
    backgroundImage: `linear-gradient(to right, ${colors.gradientFromColor} ${colors.gradientFromStop}, ${colors.gradientToColor} ${colors.gradientToStop})`,
  };
}
