import { useState, useEffect } from 'react';

export default function LiveClock() {
    const [liveTime, setLiveTime] = useState(new Date().toLocaleTimeString('pt-BR'));

    useEffect(() => {
        const timer = setInterval(() => {
            setLiveTime(new Date().toLocaleTimeString('pt-BR'));
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <span className="px-2 py-0.5 bg-[var(--color-conta)]/10 text-[var(--color-conta)] rounded-md text-xs font-bold border border-[var(--color-conta)]/20 animate-pulse">
            {liveTime}
        </span>
    );
}
