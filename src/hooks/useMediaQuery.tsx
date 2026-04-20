import { useEffect, useState } from "react";

const readTouchHandsetFallback = (query: string) => {
  if (typeof window === "undefined") {
    return false;
  }

  const maxWidthMatch = query.match(/\(\s*max-width\s*:\s*(\d+)px\s*\)/i);
  if (!maxWidthMatch) {
    return false;
  }

  const maxWidth = Number(maxWidthMatch[1]);
  const screenShortSide = Math.min(
    window.screen?.width ?? window.innerWidth,
    window.screen?.height ?? window.innerHeight,
  );
  const coarsePointer =
    typeof window.matchMedia === "function"
      ? window.matchMedia("(pointer: coarse)").matches
      : false;
  const touchPoints = window.navigator.maxTouchPoints ?? 0;

  return (coarsePointer || touchPoints > 0) && screenShortSide <= maxWidth;
};

const readMediaQueryMatch = (query: string) => {
  if (typeof window === "undefined") {
    return false;
  }

  const mediaMatches = window.matchMedia(query).matches;
  return mediaMatches || readTouchHandsetFallback(query);
};

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => readMediaQueryMatch(query));

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const media = window.matchMedia(query);
    const handleChange = () => setMatches(readMediaQueryMatch(query));

    handleChange();

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", handleChange);
      window.addEventListener("resize", handleChange);

      return () => {
        media.removeEventListener("change", handleChange);
        window.removeEventListener("resize", handleChange);
      };
    }

    media.addListener(handleChange);
    window.addEventListener("resize", handleChange);

    return () => {
      media.removeListener(handleChange);
      window.removeEventListener("resize", handleChange);
    };
  }, [query]);

  return matches;
}

export default useMediaQuery;
