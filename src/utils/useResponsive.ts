import { useWindowDimensions } from 'react-native';

/**
 * Responsive-layout hook.
 * Returns boolean flags and computed values so every screen
 * can adapt to iPad / wider displays without duplication.
 */
export function useResponsive() {
  const { width, height } = useWindowDimensions();

  /** true when the shorter side is ≥ 600 (iPad mini and up) */
  const isTablet = Math.min(width, height) >= 600;

  /** true when landscape on a tablet — lots of horizontal room */
  const isLandscape = width > height;

  /** Number of columns for card grids (games, news, search results) */
  const gridCols = isTablet ? (isLandscape ? 3 : 2) : 1;

  /** Number of columns for the team picker */
  const teamPickerCols = isTablet ? (isLandscape ? 6 : 5) : 3;

  /** Number of columns for sabermetric cells */
  const saberCols = isTablet ? 3 : 2;

  /** Max content width so things don't stretch edge-to-edge on 12.9" */
  const maxContentWidth = isTablet ? 960 : undefined;

  /** Horizontal padding for the outer scroll container */
  const outerPadding = isTablet ? 32 : 16;

  /** Scale multiplier for key font sizes */
  const fontScale = isTablet ? 1.15 : 1;

  return {
    width,
    height,
    isTablet,
    isLandscape,
    gridCols,
    teamPickerCols,
    saberCols,
    maxContentWidth,
    outerPadding,
    fontScale,
  } as const;
}
