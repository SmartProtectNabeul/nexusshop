import React, { useEffect, useRef } from 'react';

export function InteractiveGradientBackground({
  className = '',
  children,
  intensity = 1,
  interactive = true,
  initialOffset = { x: 0, y: 0 },
  dark = false,
}) {
  const ref = useRef(null);
  const rafRef = useRef(null);
  const currentRef = useRef({ x: initialOffset?.x ?? 0, y: initialOffset?.y ?? 0 });
  const targetRef = useRef({ x: initialOffset?.x ?? 0, y: initialOffset?.y ?? 0 });
  const delayRef = useRef(null);

  useEffect(() => {
    const host = ref.current;
    if (!host) return;

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const setPosition = (x, y) => {
      host.style.setProperty('--posX', String(x));
      host.style.setProperty('--posY', String(y));
    };

    setPosition(currentRef.current.x, currentRef.current.y);

    if (!interactive) return;

    const animate = () => {
      const current = currentRef.current;
      const target = targetRef.current;
      const easing = prefersReduced ? 0.04 : 0.075;
      const nextX = current.x + (target.x - current.x) * easing;
      const nextY = current.y + (target.y - current.y) * easing;
      currentRef.current = { x: nextX, y: nextY };
      setPosition(nextX, nextY);

      if (Math.abs(target.x - nextX) > 0.5 || Math.abs(target.y - nextY) > 0.5) {
        rafRef.current = requestAnimationFrame(animate);
        return;
      }

      currentRef.current = target;
      setPosition(target.x, target.y);
      rafRef.current = null;
    };

    const schedule = () => {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(animate);
    };

    const updateTarget = (point) => {
      const rect = host.getBoundingClientRect();
      const px = point.clientX - rect.left - rect.width / 2;
      const py = point.clientY - rect.top - rect.height / 2;
      const k = prefersReduced ? 0.08 : intensity * 0.42;
      window.clearTimeout(delayRef.current);
      delayRef.current = window.setTimeout(() => {
        targetRef.current = { x: px * k, y: py * k };
        schedule();
      }, prefersReduced ? 120 : 45);
    };

    const onPointer = (e) => {
      updateTarget(e);
    };
    const onTouch = (e) => {
      if (!e.touches.length) return;
      updateTarget(e.touches[0]);
    };

    host.addEventListener('pointermove', onPointer, { passive: true });
    host.addEventListener('touchmove', onTouch, { passive: true });

    return () => {
      host.removeEventListener('pointermove', onPointer);
      host.removeEventListener('touchmove', onTouch);
      window.clearTimeout(delayRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [interactive, intensity, initialOffset?.x, initialOffset?.y]);

  return (
    <div
      ref={ref}
      aria-label="Interactive gradient background"
      role="img"
      className={className}
      style={{
        position: 'relative',
        width: '100%',
        minHeight: '100vh',
        overflow: 'clip', // use clip instead of hidden to be safe
        '--posX': '0',
        '--posY': '0',
      }}
    >
      {/* Light layer */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          opacity: dark ? 0 : 1,
          transition: 'opacity 0.5s ease',
          background: `
            linear-gradient(115deg, rgb(211 255 215), rgb(0 0 0)),
            radial-gradient(90% 100% at calc(50% + var(--posX)*1px) calc(0% + var(--posY)*1px), rgb(200 200 200), rgb(22 0 45)),
            radial-gradient(100% 100% at calc(80% - var(--posX)*1px) calc(0% - var(--posY)*1px), rgb(250 255 0), rgb(36 0 0)),
            radial-gradient(150% 210% at calc(100% + var(--posX)*1px) calc(0% + var(--posY)*1px), rgb(20 175 125), rgb(0 10 255)),
            radial-gradient(100% 100% at calc(100% - var(--posX)*1px) calc(30% - var(--posY)*1px), rgb(255 77 0), rgb(0 200 255)),
            linear-gradient(60deg, rgb(255 0 0), rgb(120 86 255))
          `,
          backgroundBlendMode:
            'overlay, overlay, difference, difference, difference, normal',
          zIndex: 0,
        }}
      />
      {/* Dark layer */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          opacity: dark ? 1 : 0,
          transition: 'opacity 0.5s ease',
          background: `
            linear-gradient(115deg, rgb(15 30 20), rgb(0 0 0)),
            radial-gradient(90% 100% at calc(50% + var(--posX)*1px) calc(0% + var(--posY)*1px), rgb(80 80 100), rgb(10 0 25)),
            radial-gradient(100% 100% at calc(80% - var(--posX)*1px) calc(0% - var(--posY)*1px), rgb(100 120 0), rgb(15 0 0)),
            radial-gradient(150% 210% at calc(100% + var(--posX)*1px) calc(0% + var(--posY)*1px), rgb(10 80 60), rgb(0 5 120)),
            radial-gradient(100% 100% at calc(100% - var(--posX)*1px) calc(30% - var(--posY)*1px), rgb(120 35 0), rgb(0 100 140)),
            linear-gradient(60deg, rgb(100 0 0), rgb(60 40 150))
          `,
          backgroundBlendMode:
            'overlay, overlay, difference, difference, difference, normal',
          zIndex: 0,
        }}
      />

      {/* Content */}
      {children ? (
        <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>{children}</div>
      ) : null}
    </div>
  );
}

export default InteractiveGradientBackground;
