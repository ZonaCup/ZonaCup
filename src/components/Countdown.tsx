'use client';

import { useEffect, useState } from 'react';

interface CountdownProps {
  targetDate: string;
}

export default function Countdown({ targetDate }: CountdownProps) {
  const [time, setTime] = useState({ d: 0, h: 0, m: 0, s: 0 });

  useEffect(() => {
    const target = new Date(targetDate).getTime();
    const update = () => {
      const diff = Math.max(0, target - Date.now());
      setTime({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      });
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  const boxes = [
    { val: time.d, label: 'Días' },
    { val: time.h, label: 'Horas' },
    { val: time.m, label: 'Min' },
    { val: time.s, label: 'Seg' },
  ];

  return (
    <div className="grid grid-cols-4 gap-1.5">
      {boxes.map((b) => (
        <div key={b.label} className="bg-bg-deep border border-white/5 rounded text-center py-2.5 px-1">
          <div className="font-display text-xl font-bold text-ivory">
            {String(b.val).padStart(2, '0')}
          </div>
          <div className="text-[9px] text-ash tracking-[1.5px] uppercase">{b.label}</div>
        </div>
      ))}
    </div>
  );
}
