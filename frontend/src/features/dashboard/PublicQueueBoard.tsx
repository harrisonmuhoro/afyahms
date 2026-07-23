import { useState, useEffect, useRef } from 'react';
import { usePublicBoard } from '@/features/queue/api';
import type { PublicBoard } from '@/features/queue/types';

/** Stations shown on the lobby board, in display order. */
const BOARD_STATIONS = ['DOC', 'LAB', 'PHA'] as const;

const STATION_FALLBACK_NAME: Record<(typeof BOARD_STATIONS)[number], string> = {
  DOC: 'Consultation',
  LAB: 'Laboratory',
  PHA: 'Pharmacy',
};

const TICKER_MESSAGES = [
  'Drink at least 8 glasses of water daily to maintain optimal kidney health.',
  'Annual check-ups help in early detection of potential health risks.',
  'Remember to keep your physical ticket until your number is called.',
  'Please approach the station area when your number appears on screen.',
];

/**
 * Public lobby queue board (kiosk, full-screen). Polls the same public board
 * endpoint as the station pages; the hero card is the most recently updated
 * "now serving" ticket and flashes when it changes.
 */
export function PublicQueueBoard(): JSX.Element {
  const [timeStr, setTimeStr] = useState('');
  const [heroTicketAlert, setHeroTicketAlert] = useState(false);

  const doc = usePublicBoard('DOC');
  const lab = usePublicBoard('LAB');
  const pha = usePublicBoard('PHA');

  const boards: Array<{ code: (typeof BOARD_STATIONS)[number]; snapshot: PublicBoard | null }> = [
    { code: 'DOC', snapshot: doc.snapshot },
    { code: 'LAB', snapshot: lab.snapshot },
    { code: 'PHA', snapshot: pha.snapshot },
  ];

  // Hero = first station with someone in service; fall back to the first board.
  const hero = boards.find((b) => b.snapshot?.now_serving != null) ?? boards[0];
  const secondary = boards.filter((b) => b !== hero);
  const totalWaiting = boards.reduce((sum, b) => sum + (b.snapshot?.waiting.length ?? 0), 0);

  // Flash the hero card whenever the now-serving ticket changes.
  const prevHeroTicket = useRef<string | null>(null);
  useEffect(() => {
    const current = hero.snapshot?.now_serving ?? null;
    if (current !== null && prevHeroTicket.current !== null && current !== prevHeroTicket.current) {
      setHeroTicketAlert(true);
      const t = setTimeout(() => setHeroTicketAlert(false), 3000);
      return () => clearTimeout(t);
    }
    prevHeroTicket.current = current;
    return undefined;
  }, [hero.snapshot?.now_serving]);

  useEffect(() => {
    const updateClock = (): void => {
      const now = new Date();
      setTimeStr(
        now.getHours().toString().padStart(2, '0') +
          ':' +
          now.getMinutes().toString().padStart(2, '0') +
          ':' +
          now.getSeconds().toString().padStart(2, '0'),
      );
    };
    const timer = setInterval(updateClock, 1000);
    updateClock();
    return () => clearInterval(timer);
  }, []);

  const stationName = (b: { code: (typeof BOARD_STATIONS)[number]; snapshot: PublicBoard | null }): string =>
    b.snapshot?.station.name ?? STATION_FALLBACK_NAME[b.code];

  // Next-up list across all stations: first two waiting tickets per station.
  const nextUp = boards.flatMap((b) =>
    (b.snapshot?.waiting ?? []).slice(0, 2).map((w) => ({
      ticket: w.ticket_number,
      hint: `${stationName(b)} waiting area`,
    })),
  );

  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="font-body-md text-on-surface bg-surface overflow-hidden h-screen w-screen flex flex-col">
      {/* Top AppBar */}
      <header className="h-[80px] bg-surface flex items-center justify-between px-xl border-b border-outline-variant shadow-sm sticky top-0 z-50 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-on-primary">
            <span className="material-symbols-outlined text-[32px]">local_hospital</span>
          </div>
          <div>
            <h1 className="font-headline-lg text-headline-lg text-primary uppercase tracking-tighter">Afya HMS</h1>
            <p className="font-label-caps text-label-caps text-on-surface-variant">Main Lobby</p>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <div className="font-data-mono text-[28px] text-primary">{timeStr}</div>
          <div className="font-label-caps text-label-caps text-on-surface-variant uppercase">{today}</div>
        </div>
      </header>

      <main className="flex flex-1 w-full overflow-hidden">
        {/* Currently Serving */}
        <section className="w-[65%] p-lg flex flex-col gap-lg bg-surface-container-low">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
              campaign
            </span>
            <h2 className="font-label-caps text-label-caps text-primary uppercase">Currently Serving</h2>
          </div>
          <div className="grid grid-cols-1 gap-lg flex-1">
            {/* Hero Ticket */}
            <div
              className={`bg-white border-2 border-primary rounded-[24px] p-xl flex items-center justify-between shadow-xl relative overflow-hidden transition-all duration-300 ${
                heroTicketAlert ? 'bg-primary-container/20 animate-pulse' : ''
              }`}
            >
              <div className="absolute top-0 left-0 w-3 h-full bg-primary" aria-hidden />
              <div className="flex flex-col">
                <span className="font-label-caps text-headline-md text-on-surface-variant uppercase mb-4">
                  Ticket Number
                </span>
                <span className="font-headline-lg text-[120px] leading-none font-extrabold text-primary tracking-tighter transition-all font-data-mono">
                  {hero.snapshot?.now_serving ?? '——'}
                </span>
              </div>
              <div className="flex flex-col items-end text-right">
                <span className="font-label-caps text-headline-md text-on-surface-variant uppercase mb-4">
                  Station
                </span>
                <div className="flex items-center gap-4">
                  <span className="font-headline-lg text-[64px] leading-none font-bold text-inverse-surface">
                    {stationName(hero)}
                  </span>
                  <div className="w-20 h-20 bg-secondary-container rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-on-secondary-container text-[40px]">
                      arrow_forward
                    </span>
                  </div>
                </div>
              </div>
            </div>
            {/* Secondary station tickets */}
            <div className="grid grid-cols-2 gap-lg h-1/2">
              {secondary.map((b) => (
                <div
                  key={b.code}
                  className="bg-white border border-outline-variant rounded-[24px] p-lg flex items-center justify-between shadow-sm"
                >
                  <div className="flex flex-col">
                    <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Ticket</span>
                    <span className="font-headline-lg text-[64px] font-bold text-on-surface font-data-mono">
                      {b.snapshot?.now_serving ?? '——'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Station</span>
                    <span className="block font-headline-lg text-[40px] font-semibold text-tertiary">
                      {stationName(b)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Next Up */}
        <aside className="w-[35%] bg-white border-l border-outline-variant p-lg flex flex-col gap-lg">
          <div className="flex items-center justify-between border-b border-outline-variant pb-md">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-tertiary">hourglass_top</span>
              <h2 className="font-label-caps text-label-caps text-on-surface-variant uppercase">Next Up</h2>
            </div>
            <span className="bg-surface-container-high px-3 py-1 rounded-full font-label-caps text-[11px] text-on-surface">
              Total Waiting: {totalWaiting}
            </span>
          </div>
          <div className="flex-1 flex flex-col gap-4 overflow-hidden">
            {nextUp.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <span className="material-symbols-outlined text-[48px] text-outline-variant">event_seat</span>
                <p className="mt-2 font-body-md text-on-surface-variant">No patients waiting.</p>
              </div>
            ) : (
              nextUp.slice(0, 6).map((item, idx) => (
                <div
                  key={`${item.ticket}-${idx}`}
                  className="flex items-center justify-between p-md bg-surface-container-lowest border border-outline-variant rounded-xl"
                  style={{ opacity: Math.max(0.4, 1 - idx * 0.12) }}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold ${
                        idx === 0
                          ? 'bg-tertiary-fixed text-on-tertiary-fixed'
                          : 'bg-surface-container-highest text-on-surface-variant'
                      }`}
                    >
                      {idx + 1}
                    </div>
                    <span className="font-headline-md text-headline-md text-on-surface font-data-mono">
                      {item.ticket}
                    </span>
                  </div>
                  <span className="font-label-caps text-label-caps text-on-surface-variant italic">{item.hint}</span>
                </div>
              ))
            )}
          </div>
        </aside>
      </main>

      {/* News Ticker */}
      <footer className="h-[64px] bg-inverse-surface flex items-center relative overflow-hidden z-50 shrink-0">
        <div className="bg-primary px-lg h-full flex items-center justify-center z-10 shrink-0 border-r border-on-primary/20">
          <span className="font-label-caps text-label-caps text-on-primary whitespace-nowrap uppercase tracking-widest">
            Health Tips &amp; News
          </span>
        </div>
        <div
          className="ticker-animate whitespace-nowrap flex items-center gap-xl text-white font-body-md text-headline-md"
          style={{ animation: 'scroll 30s linear infinite' }}
        >
          <style
            dangerouslySetInnerHTML={{
              __html: `@keyframes scroll { 0% { transform: translateX(100%); } 100% { transform: translateX(-100%); } }`,
            }}
          />
          {TICKER_MESSAGES.map((msg) => (
            <span key={msg} className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary-fixed">info</span> {msg}
            </span>
          ))}
        </div>
      </footer>
    </div>
  );
}
