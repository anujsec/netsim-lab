import { useCallback, useEffect, useRef, useState } from "react";
import type { SimStep } from "../types";

const HOLD_MS = 550;
const DEFAULT_DURATION = 1100;

export function useStepPlayer(steps: SimStep[], resetKey: string) {
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [log, setLogState] = useState<string[]>([]);

  const rafRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);
  const playingRef = useRef(playing);
  const indexRef = useRef(index);
  const speedRef = useRef(speed);
  const loggedRef = useRef<Set<number>>(new Set());

  playingRef.current = playing;
  indexRef.current = index;
  speedRef.current = speed;

  const clearTimers = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    rafRef.current = null;
    timeoutRef.current = null;
  };

  // reset when scenario changes
  useEffect(() => {
    clearTimers();
    setIndex(0);
    setProgress(0);
    setPlaying(false);
    setLogState([]);
    loggedRef.current = new Set();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  const appendLogOnce = useCallback(
    (i: number) => {
      if (loggedRef.current.has(i)) return;
      loggedRef.current.add(i);
      const step = steps[i];
      if (step) setLogState((prev) => [...prev, step.log]);
    },
    [steps]
  );

  const runAnimation = useCallback(
    (i: number) => {
      clearTimers();
      setProgress(0);
      appendLogOnce(i);
      const step = steps[i];
      const duration = (step?.duration ?? DEFAULT_DURATION) / speedRef.current;
      startRef.current = performance.now();

      const tick = (now: number) => {
        const elapsed = now - startRef.current;
        const p = Math.min(1, elapsed / duration);
        setProgress(p);
        if (p < 1) {
          rafRef.current = requestAnimationFrame(tick);
        } else {
          rafRef.current = null;
          if (playingRef.current) {
            timeoutRef.current = window.setTimeout(() => {
              const next = indexRef.current + 1;
              if (next < steps.length) {
                setIndex(next);
              } else {
                setPlaying(false);
              }
            }, HOLD_MS / speedRef.current);
          }
        }
      };
      rafRef.current = requestAnimationFrame(tick);
    },
    [steps, appendLogOnce]
  );

  useEffect(() => {
    runAnimation(index);
    return clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, resetKey]);

  const play = useCallback(() => {
    if (index >= steps.length - 1 && progress >= 1) {
      setIndex(0);
      setPlaying(true);
      return;
    }
    setPlaying(true);
    if (progress >= 1 && index < steps.length - 1) {
      setIndex((i) => i + 1);
    }
  }, [index, progress, steps.length]);

  const pause = useCallback(() => setPlaying(false), []);

  const next = useCallback(() => {
    setPlaying(false);
    setIndex((i) => Math.min(steps.length - 1, i + 1));
  }, [steps.length]);

  const prev = useCallback(() => {
    setPlaying(false);
    setIndex((i) => Math.max(0, i - 1));
  }, []);

  const reset = useCallback(() => {
    clearTimers();
    setPlaying(false);
    setIndex(0);
    setLogState([]);
    loggedRef.current = new Set();
  }, []);

  const goTo = useCallback((i: number) => {
    setPlaying(false);
    setIndex(Math.max(0, Math.min(steps.length - 1, i)));
  }, [steps.length]);

  const step = steps[index];

  return {
    index,
    step,
    progress,
    playing,
    speed,
    setSpeed,
    play,
    pause,
    next,
    prev,
    reset,
    goTo,
    log,
    total: steps.length,
    isLast: index === steps.length - 1,
    isFirst: index === 0,
  };
}
