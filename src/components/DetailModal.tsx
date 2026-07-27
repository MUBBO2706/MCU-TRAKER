import React, { useState, useEffect } from 'react';
import { McuTitle, UserWatchData } from '../types';
import { MCU_TITLES } from '../data/mcuData';
import { LazyImage } from './LazyImage';
import {
  X,
  Play,
  Star,
  Clock,
  Calendar,
  Layers,
  Sparkles,
  Heart,
  Bookmark,
  ChevronRight,
  EyeOff,
  Eye,
  ExternalLink,
  Plus,
  Trash2,
  Tv,
  Film,
  Check
} from 'lucide-react';

interface DetailModalProps {
  movie: McuTitle;
  watchData: Record<string, UserWatchData>;
  onClose: () => void;
  onUpdateWatchData: (id: string, data: Partial<UserWatchData>) => void;
  onSelectMovie: (id: string) => void;
  activeTheme?: string;
}

export const DetailModal: React.FC<DetailModalProps> = ({
  movie,
  watchData,
  onClose,
  onUpdateWatchData,
  onSelectMovie,
  activeTheme,
}) => {
  const isLight = activeTheme ? activeTheme.startsWith('light-') : false;
  const currentWatch = watchData[movie.id] || {
    status: 'unwatched',
    rating: 0,
    emojiRating: '🤩',
    favorite: false,
    notes: '',
    customTags: [],
  };

  const [status, setStatus] = useState(currentWatch.status);
  const [rating, setRating] = useState(currentWatch.rating);
  const [emojiRating, setEmojiRating] = useState(currentWatch.emojiRating || '🤩');
  const [favorite, setFavorite] = useState(currentWatch.favorite);
  const [notes, setNotes] = useState(currentWatch.notes);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(currentWatch.customTags || []);

  // Spoiler configuration
  const [isSpoilerRevealed, setIsSpoilerRevealed] = useState(false);
  const [isSpoilerTriggered, setIsSpoilerTriggered] = useState(false);

  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'success' | 'failed'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    // Reset inputs when movie changes
    setStatus(currentWatch.status);
    setRating(currentWatch.rating);
    setEmojiRating(currentWatch.emojiRating || '🤩');
    setFavorite(currentWatch.favorite);
    setNotes(currentWatch.notes);
    setTags(currentWatch.customTags || []);
    setIsSpoilerRevealed(false);
    setSaveState('idle');
    setErrorMessage('');

    // Calculate spoiler state: if preceding movie exists and is NOT marked completed, blur spoilers.
    const prevId = movie.connections.previousTitleId;
    if (prevId) {
      const prevWatch = watchData[prevId];
      if (!prevWatch || prevWatch.status !== 'completed') {
        setIsSpoilerTriggered(true);
        return;
      }
    }
    setIsSpoilerTriggered(false);
  }, [movie, watchData]);

  const handleSave = () => {
    if (saveState === 'saving') return;

    setSaveState('saving');
    setErrorMessage('');

    setTimeout(() => {
      // 15% chance to fail on first attempt to showcase high fidelity failure state and retry flow
      const shouldFail = Math.random() < 0.15 && retryCount === 0;

      if (shouldFail) {
        setSaveState('failed');
        setErrorMessage('S.H.I.E.L.D. Secure Uplink interrupted due to cosmic radiation. Please retry.');
        setRetryCount(prev => prev + 1);
        return;
      }

      try {
        onUpdateWatchData(movie.id, {
          status,
          rating,
          emojiRating,
          favorite,
          notes,
          customTags: tags,
          completedDate: status === 'completed' && !currentWatch.completedDate ? new Date().toISOString().split('T')[0] : currentWatch.completedDate,
        });

        setSaveState('success');
        setRetryCount(0);

        // Reset to idle state after 3 seconds
        setTimeout(() => {
          setSaveState('idle');
        }, 3000);
      } catch (err: any) {
        setSaveState('failed');
        setErrorMessage(err?.message || 'Database transaction error.');
      }
    }, 1200);
  };

  // Add Custom tag
  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = tagInput.trim().toLowerCase();
    if (clean && !tags.includes(clean)) {
      const nextTags = [...tags, clean];
      setTags(nextTags);
      setTagInput('');
    }
  };

  const handleRemoveTag = (index: number) => {
    const nextTags = [...tags];
    nextTags.splice(index, 1);
    setTags(nextTags);
  };

  const emojiList = ['🤩', '🔥', '💖', '🍿', '🥱', '💩', '😢', '🤯'];

  return (
    <div className="w-full relative flex flex-col animate-fadeIn space-y-6">
      {/* Dynamic Gradient Header backdrop */}
      <div
        className="absolute -top-20 md:-top-24 left-1/2 -translate-x-1/2 w-screen h-64 md:h-72 opacity-25 pointer-events-none transition-all duration-500 overflow-hidden"
        style={{
          background: movie.backdropUrl,
          maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 100%)',
        }}
      />

      {/* Page Toolbar Header */}
      <div className="flex items-center z-10 -mt-3.5 pb-1">
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-sm font-semibold text-neutral-300 hover:text-white transition-all focus:outline-none cursor-pointer p-0 bg-transparent border-0"
        >
          {/* Left Arrow Svg */}
          <svg className="w-4 h-4 text-marvel" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          <span className="whitespace-nowrap">Back to Database</span>
        </button>
      </div>
          {/* Header Info Grid */}
          <div className="flex flex-col sm:flex-row gap-5">
            {/* Poster aspect */}
            <div className="w-32 sm:w-40 aspect-[2/3] rounded-xl overflow-hidden border border-neutral-800 shadow-xl bg-neutral-900 flex-shrink-0 mx-auto sm:mx-0 relative">
              <LazyImage
                src={movie.posterUrl}
                alt={movie.title}
                className="w-full h-full"
              />
            </div>

            {/* Quick Metadata fields */}
            <div className="flex-grow flex flex-col justify-between gap-3 text-center sm:text-left">
              <div className="space-y-1">
                <h1 className="font-display font-bold text-2xl text-white tracking-tight leading-tight">
                  {movie.title}
                </h1>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs text-neutral-400">
                  <span className="flex items-center gap-1 font-mono">
                    <Clock className="w-3.5 h-3.5" />
                    {movie.runtimeMinutes} min
                  </span>
                  <span className="flex items-center gap-1 font-mono">
                    <Calendar className="w-3.5 h-3.5" />
                    {movie.releaseYear}
                  </span>
                  <span className="flex items-center gap-1 font-mono">
                    <Layers className="w-3.5 h-3.5" />
                    Phase {movie.phase}
                  </span>
                </div>
              </div>

              {/* Streaming list */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[9px] uppercase font-bold text-neutral-500 tracking-wider">Available On</span>
                <div className="flex flex-wrap justify-center sm:justify-start gap-1.5">
                  {movie.streamingPlatforms.map((plat) => (
                    <span
                      key={plat}
                      className="text-[9px] font-sans bg-marvel/10 text-marvel border border-marvel/20 font-bold px-2.5 py-1 rounded-full uppercase"
                    >
                      {plat}
                    </span>
                  ))}
                  {movie.languages.includes('Hindi') && (
                    <span className="text-[9px] font-sans bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold px-2.5 py-1 rounded-full uppercase">
                      🇮🇳 Hindi Dub
                    </span>
                  )}
                </div>
              </div>

              {/* Ratings Box */}
              <div className="grid grid-cols-3 gap-2 p-2.5 bg-neutral-900/60 rounded-xl border border-neutral-800">
                <div className="flex flex-col items-center">
                  <span className="text-[8px] uppercase text-neutral-500 font-bold font-mono">IMDb</span>
                  <span className="text-sm font-bold text-white">{movie.ratings.imdb}★</span>
                </div>
                <div className="flex flex-col items-center border-x border-neutral-800">
                  <span className="text-[8px] uppercase text-neutral-500 font-bold font-mono">Rotten Tomatoes</span>
                  <span className="text-sm font-bold text-red-500">{movie.ratings.rt}%</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[8px] uppercase text-neutral-500 font-bold font-mono">Metacritic</span>
                  <span className="text-sm font-bold text-sky-400">{movie.ratings.metacritic}</span>
                </div>
              </div>

              {/* Watch Trailer Button */}
              <a
                href={`https://www.youtube.com/watch?v=${movie.trailerYoutubeId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 w-full sm:w-auto bg-marvel text-white font-semibold text-xs py-2.5 px-4 rounded-xl hover:bg-red-600 transition-colors"
              >
                <Play className="w-4 h-4 fill-current" />
                Play Official YouTube Trailer
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* SPOILER MASK CONTAINER OVER SUMMARY & SENSITIVE DETAILS */}
          {isSpoilerTriggered && !isSpoilerRevealed ? (
            <div className="flex flex-col items-center text-center gap-3 py-6 animate-fadeIn">
              <EyeOff className="w-8 h-8 text-marvel animate-pulse" />
              <div className="space-y-1">
                <h3 className="font-display font-bold text-sm text-white">Spoiler Alert Shield Active</h3>
                <p className="font-sans text-xs text-neutral-400 max-w-sm">
                  You haven't watched the preceding movie in chronological timeline order (
                  <span className="text-marvel font-semibold">
                    {MCU_TITLES.find((m) => m.id === movie.connections.previousTitleId)?.title || 'Iron Man'}
                  </span>
                  ). Cast list, plot summary, and post-credits are blurred.
                </p>
              </div>
              <button
                onClick={() => {
                  setIsSpoilerRevealed(true);
                }}
                className="bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-xs px-4 py-2 rounded-xl border border-neutral-800 transition-colors focus:outline-none"
              >
                Reveal Sensitive Content Anyway
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Plot Summary */}
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">Summary</span>
                <p className="font-sans text-xs text-neutral-300 leading-relaxed">
                  {movie.summary}
                </p>
              </div>

              {/* Characters and Villains */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">Cast Featured</span>
                  <div className="flex flex-wrap gap-1.5 text-xs text-neutral-400">
                    {movie.mainCharacters.map((charId) => (
                      <span key={charId} className="bg-neutral-900 px-2.5 py-1 rounded-lg border border-neutral-800 text-[11px] text-neutral-300 font-medium">
                        {charId.replace('_', ' ')}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">Antagonists</span>
                  <div className="flex flex-wrap gap-1.5 text-xs text-neutral-400">
                    {movie.villains.map((villain) => (
                      <span key={villain} className="bg-neutral-900 px-2.5 py-1 rounded-lg border border-neutral-800 text-[11px] text-neutral-300 font-medium">
                        {villain}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Post Credits scene */}
              <div className="space-y-2 pt-3 border-t border-neutral-800/50">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">Post-Credits Intel</span>
                  <span className={`text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                    movie.credits.importance === 'Crucial'
                      ? 'text-red-400 bg-red-500/10 border-red-500/20'
                      : movie.credits.importance === 'Recommended'
                      ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                      : 'text-neutral-400 bg-neutral-500/10 border-neutral-500/20'
                  }`}>
                    {movie.credits.importance} Scene
                  </span>
                </div>
                <div className="space-y-2 text-xs text-neutral-300">
                  <div className="flex items-center gap-4 text-neutral-400 text-[11px]">
                    <span className="flex items-center gap-1.5">
                      <input type="checkbox" checked={movie.credits.midCredit} disabled className="rounded border-neutral-850 accent-marvel" />
                      Mid-Credits Scene: {movie.credits.midCredit ? 'Yes' : 'No'}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <input type="checkbox" checked={movie.credits.postCredit} disabled className="rounded border-neutral-850 accent-marvel" />
                      Post-Credits Scene: {movie.credits.postCredit ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <p className="font-sans italic leading-relaxed text-neutral-300">
                    {movie.credits.description}
                  </p>
                </div>
              </div>

              {/* Story Connections / Timeline Links */}
              <div className="space-y-2.5">
                <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">Storyline Connections</span>
                <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center sm:gap-4 sm:w-max">
                  {movie.connections.previousTitleId && (
                    <div className="flex flex-col gap-1 sm:w-56">
                      <span className="text-[8px] uppercase text-neutral-500 font-bold font-mono">Required Before</span>
                      <button
                        onClick={() => movie.connections.previousTitleId && onSelectMovie(movie.connections.previousTitleId)}
                        className={`flex items-center justify-between p-2.5 rounded-xl text-left focus:outline-none transition-all w-full cursor-pointer border ${
                          isLight
                            ? 'bg-slate-100 hover:bg-slate-200 border-slate-300/80 text-slate-900'
                            : 'bg-neutral-900/40 hover:bg-neutral-800 border-neutral-800/60 text-white'
                        }`}
                      >
                        <span className={`font-sans text-xs font-semibold truncate max-w-[150px] ${isLight ? 'text-slate-900' : 'text-white'}`}>
                          {MCU_TITLES.find((m) => m.id === movie.connections.previousTitleId)?.title || 'Previous'}
                        </span>
                        <ChevronRight className={`w-4 h-4 flex-shrink-0 ${isLight ? 'text-slate-600' : 'text-neutral-500'}`} />
                      </button>
                    </div>
                  )}

                  {movie.connections.nextTitleId && (
                    <div className="flex flex-col gap-1 sm:w-56">
                      <span className="text-[8px] uppercase text-neutral-500 font-bold font-mono">What to Watch Next</span>
                      <button
                        onClick={() => movie.connections.nextTitleId && onSelectMovie(movie.connections.nextTitleId)}
                        className={`flex items-center justify-between p-2.5 rounded-xl text-left focus:outline-none transition-all w-full cursor-pointer border ${
                          isLight
                            ? 'bg-slate-100 hover:bg-slate-200 border-slate-300/80 text-slate-900'
                            : 'bg-neutral-900/40 hover:bg-neutral-800 border-neutral-800/60 text-white'
                        }`}
                      >
                        <span className={`font-sans text-xs font-semibold truncate max-w-[150px] ${isLight ? 'text-slate-900' : 'text-white'}`}>
                          {MCU_TITLES.find((m) => m.id === movie.connections.nextTitleId)?.title || 'Next'}
                        </span>
                        <ChevronRight className={`w-4 h-4 flex-shrink-0 ${isLight ? 'text-slate-600' : 'text-neutral-500'}`} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* WATCH TRACKER INTERACTIVE SETTINGS SECTION */}
          <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-bold text-neutral-400 tracking-wider font-display">Watch Status controls</span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setFavorite(!favorite);
                  }}
                  className={`p-2 rounded-xl border transition-colors ${
                    favorite ? 'bg-rose-500/10 border-rose-500/30 text-rose-500' : 'bg-neutral-900 border-neutral-800 text-neutral-400'
                  }`}
                >
                  <Heart className="w-4 h-4 fill-current" />
                </button>
              </div>
            </div>

            {/* Status Segment Buttons */}
            <div className="grid grid-cols-3 gap-2 sm:flex sm:items-center sm:gap-2.5 sm:w-max">
              {[
                { key: 'unwatched', name: 'Unwatched', icon: Clock },
                { key: 'dropped', name: 'Dropped', icon: X },
                { key: 'completed', name: 'Completed', icon: Check },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.key}
                    onClick={() => {
                      setStatus(item.key as any);
                    }}
                    className={`text-[11px] font-semibold py-2.5 px-1.5 rounded-xl border transition-all text-center focus:outline-none flex items-center justify-center gap-1.5 sm:px-4 sm:py-2 sm:w-max ${
                      status === item.key
                        ? 'bg-marvel/10 border-marvel text-white font-bold'
                        : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span>{item.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Star ratings and emoji reactions */}
            {status === 'completed' && (
              <div className="space-y-4 pt-1 animate-fadeIn">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase text-neutral-500 font-bold font-mono">Personal Star Rating</span>
                    <div className="flex items-center gap-1.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => {
                            setRating(star);
                          }}
                          className="focus:outline-none"
                        >
                          <Star
                            className={`w-5 h-5 ${
                              star <= rating ? 'text-amber-400 fill-current' : 'text-neutral-700'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase text-neutral-500 font-bold font-mono">Review Emoji reaction</span>
                    <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-850 p-1 rounded-xl">
                      {emojiList.map((emo) => (
                        <button
                          key={emo}
                          onClick={() => {
                            setEmojiRating(emo);
                          }}
                          className={`text-base p-1.5 rounded-lg transition-transform focus:outline-none ${
                            emojiRating === emo ? 'bg-neutral-800 scale-125 border border-neutral-700' : 'opacity-60 hover:opacity-100'
                          }`}
                        >
                          {emo}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Tags management */}
                <div className="space-y-2">
                  <span className="text-[10px] uppercase text-neutral-500 font-bold font-mono">Personal Tags</span>
                  <form onSubmit={handleAddTag} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add tag (e.g. epic, CGI, tearjerker)"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      className="bg-neutral-950 text-white text-xs border border-neutral-800 rounded-xl px-3 py-2 flex-grow focus:border-marvel focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 p-2 rounded-xl text-white focus:outline-none"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </form>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="bg-neutral-900 text-neutral-300 text-[10px] font-mono px-2.5 py-1 rounded-lg border border-neutral-800 flex items-center gap-1.5"
                        >
                          #{tag}
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(idx)}
                            className="text-neutral-500 hover:text-marvel text-xs font-bold focus:outline-none"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

        {/* User review text area */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] uppercase text-neutral-500 font-bold font-mono">Personal Review Notes</span>
          <textarea
            rows={3}
            disabled={saveState === 'saving'}
            placeholder="Enter personal notes, Easter eggs noticed, or a review description here..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="bg-neutral-950 text-white text-xs border border-neutral-800 rounded-xl p-3 focus:border-marvel focus:outline-none w-full"
          />
        </div>

        {/* Save Status / Notifications area */}
        {saveState === 'success' && (
          <div className="bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-xs p-3 rounded-xl flex items-center gap-2 animate-fadeIn">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Secure connection synchronized. MCU Intel database saved successfully!</span>
          </div>
        )}

        {saveState === 'failed' && (
          <div className="bg-rose-950/60 border border-rose-500/30 text-rose-400 text-xs p-3.5 rounded-xl flex flex-col gap-2 animate-fadeIn">
            <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-[10px]">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <span>Uplink Synchronization Error</span>
            </div>
            <p className="text-neutral-300 leading-normal">{errorMessage}</p>
            <button
              type="button"
              onClick={handleSave}
              className="self-start text-[10px] bg-rose-500 text-white font-bold px-3 py-1.5 rounded-lg hover:bg-rose-600 transition-colors focus:outline-none flex items-center gap-1.5"
            >
              <span>Force Retry Uplink</span>
            </button>
          </div>
        )}

        {/* Apply Save controls */}
        <button
          onClick={handleSave}
          disabled={saveState === 'saving'}
          className={`w-full sm:w-max sm:px-8 sm:self-end text-white font-bold text-xs py-3 rounded-xl transition-all focus:outline-none flex items-center justify-center gap-2 ${
            saveState === 'saving'
              ? 'bg-neutral-800 cursor-not-allowed opacity-80'
              : saveState === 'success'
              ? 'bg-emerald-600 hover:bg-emerald-700'
              : saveState === 'failed'
              ? 'bg-rose-600 hover:bg-rose-700 font-bold'
              : 'bg-marvel hover:bg-red-600'
          }`}
        >
          {saveState === 'saving' && (
            <>
              <svg className="w-4 h-4 animate-spin text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" />
                <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" />
              </svg>
              <span>Synchronizing S.H.I.E.L.D. Databases...</span>
            </>
          )}
          {saveState === 'success' && <span>Uplink Complete & Saved!</span>}
          {saveState === 'failed' && <span>Retry Connection</span>}
          {saveState === 'idle' && <span>Save Tracker Configuration</span>}
        </button>
    </div>
  );
};
