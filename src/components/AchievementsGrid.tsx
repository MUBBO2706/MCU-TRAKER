import React, { useEffect } from 'react';
import { MCU_TITLES } from '../data/mcuData';
import { UserWatchData } from '../types';
import { Award, Shield, Zap, Sparkles, CheckCircle2 } from 'lucide-react';

interface AchievementsGridProps {
  watchData: Record<string, UserWatchData>;
  onTriggerConfetti: () => void;
  unlockedAchievements: string[];
  setUnlockedAchievements: React.Dispatch<React.SetStateAction<string[]>>;
}

export const AchievementsGrid: React.FC<AchievementsGridProps> = ({
  watchData,
  onTriggerConfetti,
  unlockedAchievements,
  setUnlockedAchievements,
}) => {
  // Define Achievements
  const achievements = [
    {
      id: 'first_blood',
      title: 'First Blood Avenger',
      description: 'Complete your very first MCU title.',
      tier: 'bronze' as const,
      icon: 'Shield',
      check: () => {
        return (Object.values(watchData) as UserWatchData[]).some((d) => d.status === 'completed');
      },
    },
    {
      id: 'quarter_way',
      title: 'Multiverse Initiate (25%)',
      description: 'Track and complete 25% of all listed titles.',
      tier: 'silver' as const,
      icon: 'Zap',
      check: () => {
        const completedCount = MCU_TITLES.filter((m) => watchData[m.id]?.status === 'completed').length;
        return completedCount >= Math.ceil(MCU_TITLES.length * 0.25);
      },
    },
    {
      id: 'half_way',
      title: 'Sovereign Hero (50%)',
      description: 'Track and complete 50% of the entire MCU roster.',
      tier: 'gold' as const,
      icon: 'Award',
      check: () => {
        const completedCount = MCU_TITLES.filter((m) => watchData[m.id]?.status === 'completed').length;
        return completedCount >= Math.ceil(MCU_TITLES.length * 0.5);
      },
    },
    {
      id: 'three_quarter',
      title: 'Cosmic Overlord (75%)',
      description: 'Track and complete 75% of the Marvel Cinematic Universe.',
      tier: 'vibranium' as const,
      icon: 'Sparkles',
      check: () => {
        const completedCount = MCU_TITLES.filter((m) => watchData[m.id]?.status === 'completed').length;
        return completedCount >= Math.ceil(MCU_TITLES.length * 0.75);
      },
    },
    {
      id: 'full_completion',
      title: 'The Living Tribunal (100%)',
      description: 'Reach ultimate completion of all MCU movies and shows.',
      tier: 'vibranium' as const,
      icon: 'Sparkles',
      check: () => {
        const completedCount = MCU_TITLES.filter((m) => watchData[m.id]?.status === 'completed').length;
        return completedCount === MCU_TITLES.length;
      },
    },
    {
      id: 'infinity_complete',
      title: 'Infinity Gauntlet Complete',
      description: 'Complete every movie inside the Infinity Saga (Phases 1-3).',
      tier: 'gold' as const,
      icon: 'Award',
      check: () => {
        const infinityTitles = MCU_TITLES.filter((m) => m.saga === 'Infinity Saga');
        return infinityTitles.every((m) => watchData[m.id]?.status === 'completed');
      },
    },
    {
      id: 'multiverse_complete',
      title: 'Nexus Being Mastery',
      description: 'Complete every movie and show inside the Multiverse Saga (Phases 4-6).',
      tier: 'vibranium' as const,
      icon: 'Sparkles',
      check: () => {
        const multiverseTitles = MCU_TITLES.filter((m) => m.saga === 'Multiverse Saga');
        return multiverseTitles.every((m) => watchData[m.id]?.status === 'completed');
      },
    },
    {
      id: 'critic_badge',
      title: 'Collector Master Critic',
      description: 'Leave personal notes or rating for at least 3 titles.',
      tier: 'silver' as const,
      icon: 'Zap',
      check: () => {
        const criticalTracked = (Object.values(watchData) as UserWatchData[]).filter(
          (d) => (d.notes && d.notes.trim().length > 3) || d.rating > 0
        ).length;
        return criticalTracked >= 3;
      },
    },
  ];

  // Evaluate achievements on state changes
  useEffect(() => {
    let changed = false;
    const nextUnlocked = [...unlockedAchievements];

    achievements.forEach((ach) => {
      const isMet = ach.check();
      const alreadyUnlocked = unlockedAchievements.includes(ach.id);

      if (isMet && !alreadyUnlocked) {
        nextUnlocked.push(ach.id);
        changed = true;
        // Trigger visual reward
        onTriggerConfetti();
      }
    });

    if (changed) {
      setUnlockedAchievements(nextUnlocked);
      localStorage.setItem('mcu_unlocked_achievements', JSON.stringify(nextUnlocked));
    }
  }, [watchData]);

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'vibranium':
        return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20 shadow-cyan-500/10';
      case 'gold':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/20 shadow-amber-500/10';
      case 'silver':
        return 'text-neutral-300 bg-neutral-100/10 border-neutral-100/20';
      default: // bronze
        return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
    }
  };

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Shield':
        return <Shield className="w-5 h-5" />;
      case 'Zap':
        return <Zap className="w-5 h-5" />;
      case 'Sparkles':
        return <Sparkles className="w-5 h-5" />;
      default:
        return <Award className="w-5 h-5" />;
    }
  };

  return (
    <div className="flex flex-col gap-5" id="achievements-section">
      <div className="flex flex-col gap-1">
        <h2 className="font-display font-bold text-2xl tracking-tight text-white flex items-center gap-2">
          <Award className="text-marvel w-6 h-6" />
          Avenger Medals & Trophies
        </h2>
        <p className="font-sans text-xs text-neutral-400">
          Earn legendary titles as you make headway through the timeline. Achievements unlock automatically!
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
        {achievements.map((ach) => {
          const isUnlocked = unlockedAchievements.includes(ach.id);
          return (
            <div
              key={ach.id}
              className={`py-3.5 flex items-start gap-3.5 relative overflow-hidden transition-all duration-300 border-b border-neutral-900/60 ${
                isUnlocked
                  ? 'opacity-100'
                  : 'opacity-40'
              }`}
            >
              {/* Unlock glow overlay */}
              {isUnlocked && (
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-marvel/5 to-transparent blur-xl pointer-events-none" />
              )}

              {/* Icon Container */}
              <div className={`p-2.5 rounded-lg border flex-shrink-0 flex items-center justify-center ${getTierColor(ach.tier)}`}>
                {getIcon(ach.icon)}
              </div>

              <div className="flex flex-col gap-0.5 flex-grow">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display font-semibold text-sm text-white">
                    {ach.title}
                  </h3>
                  {isUnlocked ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  ) : (
                    <span className="text-[8px] uppercase tracking-wider text-neutral-500 font-bold font-mono whitespace-nowrap">
                      Locked
                    </span>
                  )}
                </div>
                <p className="font-sans text-xs text-neutral-400 leading-normal">
                  {ach.description}
                </p>
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="text-[8px] uppercase tracking-wider text-neutral-500 font-bold font-mono whitespace-nowrap">
                    Tier:
                  </span>
                  <span className={`text-[8px] font-mono font-bold uppercase tracking-wider whitespace-nowrap ${ach.tier === 'vibranium' ? 'text-cyan-400' : ach.tier === 'gold' ? 'text-amber-400' : ach.tier === 'silver' ? 'text-neutral-400' : 'text-orange-400'}`}>
                    {ach.tier}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
