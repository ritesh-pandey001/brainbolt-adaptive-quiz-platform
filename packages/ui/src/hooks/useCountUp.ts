import { useState, useEffect, useRef } from 'react';

export interface UseCountUpOptions {
  start?: number;
  end: number;
  duration?: number;
  decimals?: number;
}

export function useCountUp({
  start = 0,
  end,
  duration = 2000,
  decimals = 0,
}: UseCountUpOptions): number {
  const [count, setCount] = useState(start);
  const frameRate = 1000 / 60; // 60fps
  const totalFrames = Math.round(duration / frameRate);
  const countPerFrame = (end - start) / totalFrames;

  useEffect(() => {
    let frame = 0;
    const counter = setInterval(() => {
      frame++;
      const progress = frame / totalFrames;
      const current = start + countPerFrame * frame;

      if (frame === totalFrames) {
        clearInterval(counter);
        setCount(end);
      } else {
        setCount(Number(current.toFixed(decimals)));
      }
    }, frameRate);

    return () => clearInterval(counter);
  }, [end, start, countPerFrame, decimals, frameRate, totalFrames]);

  return count;
}
