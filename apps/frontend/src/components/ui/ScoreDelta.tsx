'use client';

import { useEffect, useState } from 'react';
import { clsx } from 'clsx';

interface ScoreDeltaProps {
  delta: number;
  onComplete?: () => void;
}

export function ScoreDelta({ delta, onComplete }: ScoreDeltaProps) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(false);
      onComplete?.();
    }, 2000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!show || delta === 0) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-50">
      <div
        className={clsx(
          'text-6xl md:text-8xl font-black animate-float-up',
          delta > 0
            ? 'text-success-500 dark:text-success-400'
            : 'text-error-500 dark:text-error-400'
        )}
        style={{
          textShadow: '0 4px 12px rgba(0,0,0,0.3)',
        }}
      >
        {delta > 0 ? '+' : ''}
        {delta}
      </div>
    </div>
  );
}
