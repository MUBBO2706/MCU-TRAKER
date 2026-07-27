import React, { useState } from 'react';
import { MCU_CHARACTERS, MCU_TITLES } from '../data/mcuData';
import { CharacterArc } from '../types';
import { LazyImage } from './LazyImage';
import { CustomDropdown } from './CustomDropdown';
import { Users, Heart, Award, ShieldAlert, ChevronDown, ChevronUp, Search } from 'lucide-react';

interface CharacterHubProps {
  onSelectMovie: (movieId: string) => void;
}

export const CharacterHub: React.FC<CharacterHubProps> = ({ onSelectMovie }) => {
  const [selectedCharId, setSelectedCharId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'hero' | 'antihero' | 'villain'>('all');

  const toggleSelectChar = (id: string) => {
    setSelectedCharId(selectedCharId === id ? null : id);
  };

  const getRoleBadgeStyle = (role: CharacterArc['role']) => {
    switch (role) {
      case 'hero':
        return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      case 'antihero':
        return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
      case 'villain':
        return 'text-red-400 bg-red-500/10 border-red-500/20';
      default:
        return 'text-neutral-400 bg-neutral-500/10 border-neutral-500/20';
    }
  };

  const getStatusBadgeStyle = (status: CharacterArc['status']) => {
    switch (status) {
      case 'Active':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'Deceased':
        return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
      case 'Retired':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'Legacy':
        return 'text-sky-400 bg-sky-500/10 border-sky-500/20';
      default:
        return 'text-neutral-400 bg-neutral-500/10 border-neutral-500/20';
    }
  };

  // Search & Filter computation
  const filteredCharacters = MCU_CHARACTERS.filter((char) => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = !query ||
      char.name.toLowerCase().includes(query) ||
      char.actor.toLowerCase().includes(query) ||
      char.journeySummary.toLowerCase().includes(query);
    const matchesRole = roleFilter === 'all' || char.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="flex flex-col gap-5" id="character-hub-section">
      <div className="flex flex-col gap-1.5">
        <h2 className="font-display font-bold text-2xl tracking-tight text-white flex items-center gap-2">
          <Users className="text-marvel w-6 h-6" />
          Character Journey Tracker
        </h2>
        <p className="font-sans text-xs text-neutral-400">
          Unveil character stories, status sheets, deep-seated relationships, and jumping links to their MCU titles.
        </p>
      </div>

      {/* Search and Filters Controls - Custom selectors side by side including on mobile */}
      <div className="flex flex-row gap-2 relative z-30 py-1 w-full items-center">
        <div className="flex-1 flex items-center relative min-w-0">
          <Search className="absolute left-3 w-3.5 h-3.5 text-neutral-500" />
          <input
            type="text"
            placeholder="Search characters, bio..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-neutral-900 border border-neutral-800 text-white text-xs rounded-xl pl-9 pr-3 py-2 h-9 focus:border-marvel focus:outline-none"
          />
        </div>
        <div className="w-32 sm:w-44 flex-shrink-0">
          <CustomDropdown
            value={roleFilter}
            onChange={(val) => setRoleFilter(val as any)}
            options={[
              { value: 'all', label: 'All Roles' },
              { value: 'hero', label: 'Heroes' },
              { value: 'antihero', label: 'Antiheroes' },
              { value: 'villain', label: 'Villains' }
            ]}
            placeholder="All Roles"
            align="right"
          />
        </div>
      </div>

      {filteredCharacters.length === 0 ? (
        <div className="text-center py-10 border border-dashed border-neutral-900 rounded-2xl">
          <Users className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
          <span className="text-xs text-neutral-500 font-mono">No matching characters found in the Codex records</span>
        </div>
      ) : (
        <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 2xl:columns-5 gap-x-6">
          {filteredCharacters.map((char) => {
            const isExpanded = selectedCharId === char.id;
            return (
              <div
                key={char.id}
                className="break-inside-avoid inline-block w-full overflow-hidden transition-all duration-300 border-b border-neutral-900/60 pb-2 mb-4"
              >
                {/* Header block click */}
                <button
                  onClick={() => toggleSelectChar(char.id)}
                  className="w-full flex items-center justify-between py-3 px-0.5 focus:outline-none bg-transparent"
                >
                  <div className="flex items-center gap-3.5">
                    <LazyImage
                      src={char.avatarUrl}
                      alt={char.name}
                      characterId={char.id}
                      className="w-12 h-12 rounded-xl border border-neutral-800 object-cover"
                    />
                    <div className="flex flex-col items-start gap-1">
                      <h3 className="font-display font-bold text-sm text-white text-left">
                        {char.name}
                      </h3>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border ${getRoleBadgeStyle(char.role)}`}>
                          {char.role}
                        </span>
                        <span className={`text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border ${getStatusBadgeStyle(char.status)}`}>
                          {char.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-neutral-500" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-neutral-500" />
                  )}
                </button>

                {/* Collapsible journey area */}
                {isExpanded && (
                  <div className="px-0.5 pb-4 pt-3 flex flex-col gap-4 animate-fadeIn">
                    {/* Journey Summary */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider flex items-center gap-1">
                        <Award className="w-3.5 h-3.5 text-marvel" />
                        Character Arc & Legacy
                      </span>
                      <p className="font-sans text-xs text-neutral-300 leading-relaxed">
                        {char.journeySummary}
                      </p>
                    </div>

                    {/* Actor detail */}
                    <div className="flex justify-between items-center py-2.5 border-t border-neutral-800/60 text-xs text-neutral-400">
                      <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">Actor Portrayal</span>
                      <span className="font-semibold text-white font-display">{char.actor}</span>
                    </div>

                    {/* Key Relationships */}
                    {char.relationships && char.relationships.length > 0 && (
                      <div className="flex flex-col gap-2 pt-3 border-t border-neutral-800/60">
                        <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider flex items-center gap-1.5">
                          <Heart className="w-3.5 h-3.5 text-rose-500" />
                          Key Relationships
                        </span>
                        <div className="grid grid-cols-2 gap-4">
                          {char.relationships.map((rel, idx) => (
                            <div key={idx} className="flex flex-col">
                              <span className="font-display text-xs text-white font-medium">{rel.name}</span>
                              <span className="text-[10px] text-neutral-400 mt-0.5">{rel.relation}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Appearances jumping links */}
                    <div className="flex flex-col gap-2">
                      <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider flex items-center gap-1">
                        <ShieldAlert className="w-3.5 h-3.5 text-blue-400" />
                        Featured Appearances
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {char.featuredTitleIds.map((id) => {
                          const movie = MCU_TITLES.find((m) => m.id === id);
                          if (!movie) return null;
                          return (
                            <button
                              key={id}
                              onClick={() => onSelectMovie(id)}
                              className="text-[10px] font-sans bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white px-2.5 py-1.5 rounded-lg transition-colors focus:outline-none cursor-pointer"
                            >
                              {movie.title}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
