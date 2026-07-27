import React from 'react';
import { Search, Filter, ChevronRight, Heart, Check, X, Clock } from 'lucide-react';
import { MCU_TITLES, THEATRICAL_ORDER_IDS, CHRONOLOGICAL_ORDER_IDS } from '../../data/mcuData';
import { McuTitle, UserWatchData } from '../../types';
import { CustomDropdown } from '../CustomDropdown';
import { LazyImage } from '../LazyImage';

interface MoviesTabProps {
  watchData: Record<string, UserWatchData>;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  showFilters: boolean;
  setShowFilters: (val: boolean) => void;
  filterSaga: 'all' | 'Infinity Saga' | 'Multiverse Saga' | 'Future Saga';
  setFilterSaga: (val: 'all' | 'Infinity Saga' | 'Multiverse Saga' | 'Future Saga') => void;
  filterPhase: 'all' | number;
  setFilterPhase: (val: 'all' | number) => void;
  filterStatus: 'all' | 'watched' | 'unwatched' | 'later';
  setFilterStatus: (val: 'all' | 'watched' | 'unwatched' | 'later') => void;
  filterLanguage: 'all' | 'Hindi';
  setFilterLanguage: (val: 'all' | 'Hindi') => void;
  sortBy: 'release' | 'timeline' | 'rating';
  setSortBy: (val: 'release' | 'timeline' | 'rating') => void;
  handleSelectMovieId: (id: string) => void;
  activeTheme: 'oled' | 'cosmic' | 'asgardian' | 'wakanda' | 'stark' | 'hydra';
  orderingMode: 'theatrical' | 'chronological';
}

export function MoviesTab({
  watchData,
  searchQuery,
  setSearchQuery,
  showFilters,
  setShowFilters,
  filterSaga,
  setFilterSaga,
  filterPhase,
  setFilterPhase,
  filterStatus,
  setFilterStatus,
  filterLanguage,
  setFilterLanguage,
  sortBy,
  setSortBy,
  handleSelectMovieId,
  activeTheme,
  orderingMode,
}: MoviesTabProps) {

  const getFilteredMovies = () => {
    let list = MCU_TITLES.filter((m) => m.type === 'movie');

    // Apply Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          m.director.toLowerCase().includes(q) ||
          (m.creator && m.creator.toLowerCase().includes(q)) ||
          m.genres.some((g) => g.toLowerCase().includes(q)) ||
          m.villains.some((v) => v.toLowerCase().includes(q)) ||
          m.mainCharacters.some((c) => c.toLowerCase().includes(q))
      );
    }

    // Apply Saga Filter
    if (filterSaga !== 'all') {
      list = list.filter((m) => m.saga === filterSaga);
    }

    // Apply Phase Filter
    if (filterPhase !== 'all') {
      list = list.filter((m) => m.phase === Number(filterPhase));
    }

    // Apply Language Filter (e.g. Hindi dub)
    if (filterLanguage !== 'all') {
      list = list.filter((m) => m.languages.includes(filterLanguage));
    }

    // Apply Watch Status Filter
    if (filterStatus !== 'all') {
      list = list.filter((m) => {
        const watch = watchData[m.id];
        if (filterStatus === 'watched') return watch?.status === 'completed';
        if (filterStatus === 'unwatched') return !watch || watch?.status === 'unwatched';
        if (filterStatus === 'later') return watch?.status === 'later';
        return true;
      });
    }

    // Sorting Engine
    const sorted = [...list];
    if (sortBy === 'release') {
      const orderList = THEATRICAL_ORDER_IDS;
      sorted.sort((a, b) => {
        const idxA = orderList.indexOf(a.id);
        const idxB = orderList.indexOf(b.id);
        return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
      });
    } else if (sortBy === 'timeline') {
      const orderList = CHRONOLOGICAL_ORDER_IDS;
      sorted.sort((a, b) => {
        const idxA = orderList.indexOf(a.id);
        const idxB = orderList.indexOf(b.id);
        return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
      });
    } else if (sortBy === 'rating') {
      sorted.sort((a, b) => b.ratings.imdb - a.ratings.imdb);
    }

    return sorted;
  };

  const filteredMovies = getFilteredMovies();

  return (
    <>
      {/* Search Input Bar */}
      <div className="relative flex items-center mb-4" id="movies-search-bar">
        <Search className="absolute left-3 w-4 h-4 text-neutral-400" />
        <input
          type="text"
          placeholder="Search MCU movies by cast, villains, title..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-neutral-950 text-white text-xs border border-neutral-800 rounded-2xl pl-10 pr-10 py-3 focus:border-marvel focus:outline-none"
        />
        <button
          onClick={() => {
            setShowFilters(!showFilters);
          }}
          className={`absolute right-3 p-1 rounded cursor-pointer transition-colors ${showFilters ? 'text-marvel' : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200'}`}
        >
          <Filter className="w-4 h-4" />
        </button>
      </div>

      {/* Expanded Advanced Filters Drawer */}
      {showFilters && (
        <div className="p-4 bg-neutral-950 rounded-2xl border border-neutral-800 grid grid-cols-2 gap-3.5 animate-fadeIn relative z-30 mb-4" id="movies-filter-drawer">
          <div className="flex flex-col gap-1">
            <CustomDropdown
              label="Saga"
              value={filterSaga}
              onChange={(val) => setFilterSaga(val as any)}
              options={[
                { value: 'all', label: 'All Sagas' },
                { value: 'Infinity Saga', label: 'Infinity Saga' },
                { value: 'Multiverse Saga', label: 'Multiverse Saga' },
              ]}
              activeTheme={activeTheme}
              placeholder="All Sagas"
            />
          </div>

          <div className="flex flex-col gap-1">
            <CustomDropdown
              label="Phase"
              value={filterPhase.toString()}
              onChange={(val) => setFilterPhase(val === 'all' ? 'all' : Number(val))}
              options={[
                { value: 'all', label: 'All Phases' },
                { value: '1', label: 'Phase 1' },
                { value: '2', label: 'Phase 2' },
                { value: '3', label: 'Phase 3' },
                { value: '4', label: 'Phase 4' },
                { value: '5', label: 'Phase 5' },
                { value: '6', label: 'Phase 6' },
              ]}
              activeTheme={activeTheme}
              placeholder="All Phases"
              align="right"
            />
          </div>

          <div className="flex flex-col gap-1">
            <CustomDropdown
              label="Status"
              value={filterStatus}
              onChange={(val) => setFilterStatus(val as any)}
              options={[
                { value: 'all', label: 'All Statuses' },
                { value: 'watched', label: 'Watched' },
                { value: 'unwatched', label: 'Unwatched' },
                { value: 'later', label: 'Watch Later' },
              ]}
              activeTheme={activeTheme}
              placeholder="All Statuses"
            />
          </div>

          <div className="flex flex-col gap-1">
            <CustomDropdown
              label="Dubbing"
              value={filterLanguage}
              onChange={(val) => setFilterLanguage(val as any)}
              options={[
                { value: 'all', label: 'All Languages' },
                { value: 'Hindi', label: '🇮🇳 Hindi Dubbed' },
              ]}
              activeTheme={activeTheme}
              placeholder="All Languages"
              align="right"
            />
          </div>

          <div className="flex flex-col gap-1 col-span-2">
            <label className="text-[9px] uppercase font-bold text-neutral-500">Sort By</label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {[
                { key: 'release', name: 'Release Year' },
                { key: 'timeline', name: 'Timeline Order' },
                { key: 'rating', name: 'IMDb Rating' },
              ].map((s) => (
                <button
                  key={s.key}
                  onClick={() => {
                    setSortBy(s.key as any);
                  }}
                  className={`text-[10px] font-medium py-1 px-1.5 rounded-lg border text-center transition-all focus:outline-none cursor-pointer ${
                    sortBy === s.key ? 'bg-marvel/10 border-marvel text-white' : 'bg-neutral-900 border-neutral-800 text-neutral-400'
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Movies List View Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-6 gap-y-4" id="movies-grid">
        {filteredMovies.length > 0 ? (
          filteredMovies.map((m) => {
            const watch = watchData[m.id];
            const isCompleted = watch?.status === 'completed';
            const orderList = orderingMode === 'theatrical' ? THEATRICAL_ORDER_IDS : CHRONOLOGICAL_ORDER_IDS;
            const orderIndex = orderList.indexOf(m.id) + 1;
            return (
              <div
                key={m.id}
                onClick={() => handleSelectMovieId(m.id)}
                className="py-3 border-b border-neutral-900 flex gap-4 cursor-pointer transition-all duration-300 relative group px-2 hover:bg-neutral-900/10 rounded-xl items-center"
              >
                {/* Left poster */}
                <LazyImage
                  src={m.posterUrl}
                  alt={m.title}
                  className="w-14 aspect-[2/3] rounded-lg border border-neutral-900 flex-shrink-0"
                />

                {/* Middle description */}
                <div className="flex-grow flex flex-col justify-between py-0.5 min-w-0">
                  <div className="space-y-1">
                    <h4 className="font-display font-bold text-xs text-white leading-tight pr-2 group-hover:text-marvel transition-colors truncate">
                      {m.title}
                    </h4>
                    <p className="text-[10px] text-neutral-400">
                      {m.releaseYear} • {m.runtimeMinutes} min • Phase {m.phase}
                    </p>
                    <div className="text-[10px] text-neutral-500 font-mono flex items-center gap-2">
                      <span>Order: #{orderIndex}</span>
                      <span>•</span>
                      <span className="truncate">{m.genres.slice(0, 2).join(', ')}</span>
                    </div>
                  </div>

                  {/* Badges rows */}
                  <div className="flex items-center gap-1.5 flex-wrap mt-1">
                    <span className="text-[8px] font-mono font-bold bg-neutral-900 text-neutral-400 border border-neutral-800 px-2 py-0.5 rounded whitespace-nowrap">
                      IMDb {m.ratings.imdb}
                    </span>
                    {m.languages.includes('Hindi') && (
                      <span className="text-[8px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded whitespace-nowrap">
                        🇮🇳 HIN
                      </span>
                    )}
                    {(() => {
                      const status = watch?.status || 'unwatched';
                      if (status === 'completed') {
                        return (
                          <span className="text-[8px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded flex items-center gap-1 whitespace-nowrap">
                            <Check className="w-2.5 h-2.5" /> Completed
                          </span>
                        );
                      }
                      if (status === 'dropped') {
                        return (
                          <span className="text-[8px] font-mono font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded flex items-center gap-1 whitespace-nowrap">
                            <X className="w-2.5 h-2.5" /> Dropped
                          </span>
                        );
                      }
                      return (
                        <span className="text-[8px] font-mono font-bold bg-neutral-900/60 text-neutral-400 border border-neutral-800 px-2 py-0.5 rounded flex items-center gap-1 whitespace-nowrap">
                          <Clock className="w-2.5 h-2.5" /> Unwatched
                        </span>
                      );
                    })()}
                  </div>
                </div>

                {/* Right section - rating status & navigation indicator */}
                <div className="flex flex-col items-end justify-between py-1 flex-shrink-0 self-stretch">
                  <div className="flex items-center gap-1 min-h-[14px]">
                    {isCompleted && watch?.favorite && (
                      <Heart className="w-3.5 h-3.5 text-rose-500 fill-current" />
                    )}
                    {isCompleted && watch?.rating > 0 && (
                      <span className="text-[10px] text-amber-400 font-bold font-mono">
                        {watch.rating}★
                      </span>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-neutral-600 group-hover:text-neutral-400 transition-colors mt-auto shrink-0" />
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-8 text-center text-xs text-neutral-500 col-span-full">
            No movies found matching criteria.
          </div>
        )}
      </div>
    </>
  );
}
