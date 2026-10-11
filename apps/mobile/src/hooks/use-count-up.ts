import { useEffect, useRef, useState } from 'react';

/**
 * Rolls a number up to `target` (ease-out, ~700ms) the first time it's known,
 * then follows it without animating again, so a reload never replays the roll.
 */
export function useCountUp(target: number, duration = 700): number {
  const [shown, setShown] = useState(0);
  const done = useRef(false);

  useEffect(() => {
    if (done.current || target <= 0) {
      setShown(target);
      return;
    }
    done.current = true;
    const start = Date.now();
    let frame = 0;
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / duration);
      setShown(Math.round(target * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      setShown(target);
    };
  }, [target, duration]);

  return shown;
}
