import React from 'react';
import { Calendar, ChevronRight, Check, X, Clock } from 'lucide-react';
import { getSortedMcuTitles } from '../../data/mcuData';
import { UserWatchData } from '../../types';

interface TimelineTabProps {
  watchData: Record<string, UserWatchData>;
  timelineMode: 'timeline' | 'release';
  setTimelineMode: (val: 'timeline' | 'release') => void;
  handleSelectMovieId: (id: string) => void;
}

export function TimelineTab({
  watchData,
  timelineMode,
  setTimelineMode,
  handleSelectMovieId,
}: TimelineTabProps) {
  return (
    <>
      {/* Timeline Segment Toggler */}
      <div className="flex flex-col gap-1.5" id="timeline-segment-toggler">
        <h2 className="font-display font-bold text-2xl tracking-tight text-white flex items-center gap-2">
          <Calendar className="text-marvel w-6 h-6" />
          Cosmic Timeline Nexus
        </h2>
        <div className="grid grid-cols-2 md:inline-flex md:w-auto md:self-start gap-2 bg-neutral-950 p-1.5 rounded-2xl border border-neutral-800">
          <button
            onClick={() => {
              setTimelineMode('timeline');
            }}
            className={`text-[10px] sm:text-xs font-semibold py-2 px-1.5 sm:px-3 rounded-xl transition-all focus:outline-none whitespace-nowrap truncate cursor-pointer ${
              timelineMode === 'timeline'
                ? 'bg-marvel text-white'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            In-Universe Chronological
          </button>
          <button
            onClick={() => {
              setTimelineMode('release');
            }}
            className={`text-[10px] sm:text-xs font-semibold py-2 px-1.5 sm:px-3 rounded-xl transition-all focus:outline-none whitespace-nowrap truncate cursor-pointer ${
              timelineMode === 'release'
                ? 'bg-marvel text-white'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Theatrical Release Order
          </button>
        </div>
      </div>

      {/* Vertical timeline card blocks */}
      <div className="w-full max-w-none relative border-l-2 border-neutral-850 pl-8 space-y-3 ml-4 sm:ml-auto md:border-l-0 md:pl-0 md:space-y-0 md:ml-0 md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 md:gap-4" id="timeline-vertical-path">
        {getSortedMcuTitles(timelineMode === 'timeline' ? 'chronological' : 'theatrical')
          .map((m, idx) => {
            const watch = watchData[m.id];
            return (
              <div
                key={m.id}
                onClick={() => handleSelectMovieId(m.id)}
                className="group cursor-pointer relative"
              >
                {/* Timeline dot node */}
                <span className={`absolute -left-[39px] top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 transition-all z-10 md:hidden ${
                  watch?.status === 'completed'
                    ? 'bg-emerald-500 border-emerald-400'
                    : watch?.status === 'dropped'
                    ? 'bg-rose-500 border-rose-400'
                    : 'bg-neutral-950 border-neutral-700'
                }`} />

                <div className="py-3 border-b border-neutral-900/80 group-hover:bg-neutral-900/10 transition-all flex justify-between items-center px-2 rounded-xl md:border md:border-neutral-850 md:bg-neutral-950/40 md:hover:bg-neutral-900/30 md:p-4 md:rounded-2xl md:h-full">
                  <div className="flex flex-col gap-0.5 pr-4 min-w-0 text-left">
                    <span className="font-mono text-[8px] uppercase tracking-wider text-marvel font-bold">
                      #{idx + 1} • {m.type === 'movie' ? 'Movie' : 'Series'}
                    </span>
                    <h4 className="font-display font-bold text-xs text-white leading-tight truncate">
                      {m.title}
                    </h4>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                      <span className="text-[10px] text-neutral-500 font-mono">
                        Release: {m.releaseYear} • Phase {m.phase}
                      </span>
                      {(() => {
                        const status = watch?.status || 'unwatched';
                        if (status === 'completed') {
                          return (
                            <span className="text-[8px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded flex items-center gap-1 whitespace-nowrap">
                              <Check className="w-2 h-2" /> Completed
                            </span>
                          );
                        }
                        if (status === 'dropped') {
                          return (
                            <span className="text-[8px] font-mono font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 px-1.5 py-0.5 rounded flex items-center gap-1 whitespace-nowrap">
                              <X className="w-2 h-2" /> Dropped
                            </span>
                          );
                        }
                        return (
                          <span className="text-[8px] font-mono font-bold bg-neutral-900/60 text-neutral-400 border border-neutral-800 px-1.5 py-0.5 rounded flex items-center gap-1 whitespace-nowrap">
                            <Clock className="w-2 h-2" /> Unwatched
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-neutral-500 flex-shrink-0 group-hover:text-marvel group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            );
          })}
      </div>
    </>
  );
}
