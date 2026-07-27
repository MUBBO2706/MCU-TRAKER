import React from 'react';
import { User, Eye, Search, Pencil, Check, X, Download, Upload, Database, RotateCcw, Palette, Sun, Moon } from 'lucide-react';
import { CustomDropdown } from '../CustomDropdown';
import { UserWatchData } from '../../types';
import { ShieldUpdatesLedger, renderLogValue } from './ShieldUpdatesLedger';
import { SessionRegistryCodex } from './SessionRegistryCodex';

export interface CacheProgress {
  isSyncing: boolean;
  isComplete: boolean;
  completed: number;
  total: number;
  failed: number;
}

interface ProfileTabProps {
  showAllSessions: boolean;
  setShowAllSessions: (val: boolean) => void;
  sessionSearchQuery: string;
  setSessionSearchQuery: (val: string) => void;
  sessionFilterStatus: 'all' | 'Active' | 'Logged Out' | 'Expired';
  setSessionFilterStatus: (val: 'all' | 'Active' | 'Logged Out' | 'Expired') => void;
  sessionPage: number;
  setSessionPage: (val: number | ((prev: number) => number)) => void;
  showAllUpdates: boolean;
  setShowAllUpdates: (val: boolean) => void;
  updatesSearchQuery: string;
  setUpdatesSearchQuery: (val: string) => void;
  updatesFilterCategory: string;
  setUpdatesFilterCategory: (val: string) => void;
  updatesSortOrder: 'newest' | 'oldest' | 'action-asc' | 'action-desc';
  setUpdatesSortOrder: (val: 'newest' | 'oldest' | 'action-asc' | 'action-desc') => void;
  updatesFilterStartDate: string;
  setUpdatesFilterStartDate: (val: string) => void;
  updatesFilterEndDate: string;
  setUpdatesFilterEndDate: (val: string) => void;
  updatesPage: number;
  setUpdatesPage: (val: number | ((prev: number) => number)) => void;
  sandboxUpdates: any[];
  user: any;
  activeTheme: string;
  themeMode?: 'dark' | 'light';
  updatePreference: (key: string, value: any) => void;
  orderingMode: 'theatrical' | 'chronological';
  authToken: string | null;
  isOfflineSandbox: boolean;
  avatarUrl: string;
  handleAvatarChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isUploadingAvatar: boolean;
  isEditingProfileInPlace: boolean;
  setIsEditingProfileInPlace: (val: boolean) => void;
  newFullName: string;
  setNewFullName: (val: string) => void;
  newUsername: string;
  setNewUsername: (val: string) => void;
  handleProfileUpdate: (e: React.FormEvent) => void;
  isUpdatingProfile: boolean;
  formatToIndianDateTime: (timestamp: number | string | Date | undefined) => string;
  setShowResetPasswordModal: (val: boolean) => void;
  showFeedback: (message: string, type?: 'success' | 'error' | 'info') => void;
  handleExportData: () => void;
  isRestoring: boolean;
  restoreProgress: string;
  handleImportData: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  cacheProgress: CacheProgress;
  startPreCaching: (force?: boolean) => Promise<void>;
  clearCache: () => Promise<void>;
  developerMode: boolean;
  currentSessionId?: string | null;
  onTerminateSession?: (sessionId: string) => Promise<void>;
  onTerminateOtherSessions?: () => Promise<void>;
  onDeleteSession?: (sessionId: string) => Promise<void>;
  onDeleteInactiveSessions?: () => Promise<void>;
  onRefreshProfile?: () => Promise<void>;
  onLogSandboxUpdate?: (action: string, previousValue: string, newValue: string, source: string, metadata?: any) => void;
}

export function ProfileTab({
  showAllSessions,
  setShowAllSessions,
  sessionSearchQuery,
  setSessionSearchQuery,
  sessionFilterStatus,
  setSessionFilterStatus,
  sessionPage,
  setSessionPage,
  showAllUpdates,
  setShowAllUpdates,
  updatesSearchQuery,
  setUpdatesSearchQuery,
  updatesFilterCategory,
  setUpdatesFilterCategory,
  updatesSortOrder,
  setUpdatesSortOrder,
  updatesFilterStartDate,
  setUpdatesFilterStartDate,
  updatesFilterEndDate,
  setUpdatesFilterEndDate,
  updatesPage,
  setUpdatesPage,
  sandboxUpdates,
  user,
  activeTheme,
  themeMode = 'dark',
  updatePreference,
  orderingMode,
  authToken,
  isOfflineSandbox,
  avatarUrl,
  handleAvatarChange,
  isUploadingAvatar,
  isEditingProfileInPlace,
  setIsEditingProfileInPlace,
  newFullName,
  setNewFullName,
  newUsername,
  setNewUsername,
  handleProfileUpdate,
  isUpdatingProfile,
  formatToIndianDateTime,
  setShowResetPasswordModal,
  showFeedback,
  handleExportData,
  isRestoring,
  restoreProgress,
  handleImportData,
  cacheProgress,
  startPreCaching,
  clearCache,
  developerMode,
  currentSessionId,
  onTerminateSession,
  onTerminateOtherSessions,
  onDeleteSession,
  onDeleteInactiveSessions,
  onRefreshProfile,
  onLogSandboxUpdate,
}: ProfileTabProps) {
  const [isDurationHHMMSS, setIsDurationHHMMSS] = React.useState(false);

  const isProfileChanged = React.useMemo(() => {
    const trimmedNewName = newFullName.trim();
    const trimmedNewUsername = newUsername.trim();
    const currentName = (user?.fullName || '').trim();
    const currentUsername = (user?.username || '').trim();
    if (!trimmedNewName || !trimmedNewUsername) return false;
    return trimmedNewName !== currentName || trimmedNewUsername !== currentUsername;
  }, [newFullName, newUsername, user?.fullName, user?.username]);

  const formatDuration = (seconds: number | null | undefined) => {
    if (seconds == null) return 'Ongoing';
    if (isDurationHHMMSS) {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = seconds % 60;
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return `${m}m ${s}s`;
    }
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  return (
    <>
      {showAllUpdates ? (
        <ShieldUpdatesLedger
          onBack={() => setShowAllUpdates(false)}
          sandboxUpdates={sandboxUpdates}
          user={user}
          activeTheme={activeTheme}
          isOfflineSandbox={isOfflineSandbox}
          formatToIndianDateTime={formatToIndianDateTime}
          authToken={authToken}
          onRefreshProfile={onRefreshProfile}
          onLogSandboxUpdate={onLogSandboxUpdate}
        />
      ) : showAllSessions ? (
        <SessionRegistryCodex
          onBack={() => setShowAllSessions(false)}
          user={user}
          activeTheme={activeTheme}
          formatToIndianDateTime={formatToIndianDateTime}
          currentSessionId={currentSessionId}
          onTerminateSession={onTerminateSession}
          onTerminateOtherSessions={onTerminateOtherSessions}
          onDeleteSession={onDeleteSession}
          onDeleteInactiveSessions={onDeleteInactiveSessions}
          isOfflineSandbox={isOfflineSandbox}
          authToken={authToken}
          onRefreshProfile={onRefreshProfile}
          onLogSandboxUpdate={onLogSandboxUpdate}
        />
      ) : (
        <div className="flex flex-col gap-4 font-sans w-full py-1 px-1 text-left animate-fadeIn" id="profile-main-container">
          <div className="flex flex-col gap-1.5" id="profile-station-view">
            <h2 className="font-display font-bold text-2xl tracking-tight text-white flex items-center gap-2">
              <User className="text-marvel w-6 h-6" />
              Profile
            </h2>
            <p className="font-sans text-xs text-neutral-400">
              Configure visual presets, sound preferences, backup metrics, or hard reset database records.
            </p>
          </div>

          {/* Identity & Custom Profile Photo */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-neutral-800/60 pb-3">
              <span className="text-xs uppercase font-bold text-neutral-400 tracking-wider font-display">
                Identity & Profile Photo
              </span>
              {authToken && !isEditingProfileInPlace && (
                <button
                  onClick={() => {
                    setNewFullName(user?.fullName || '');
                    setNewUsername(user?.username || '');
                    setIsEditingProfileInPlace(true);
                  }}
                  className="text-neutral-400 hover:text-white transition-all focus:outline-none cursor-pointer flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider p-0 bg-transparent border-0"
                  title="Edit Agent Profile"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
              )}
              {authToken && isEditingProfileInPlace && (
                <div className="flex items-center gap-3">
                  {!isUpdatingProfile && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingProfileInPlace(false);
                        setNewFullName('');
                        setNewUsername('');
                      }}
                      className="text-neutral-400 hover:text-neutral-200 md:hover:text-white transition-colors focus:outline-none cursor-pointer bg-transparent border-0 p-0 min-h-0 rounded-none flex items-center justify-center gap-2 text-xs font-mono uppercase tracking-wider touch-manipulation"
                      title="Cancel"
                    >
                      <X className="w-4 h-4 shrink-0" />
                      <span className="hidden md:inline">Cancel</span>
                    </button>
                  )}
                  <button
                    type="submit"
                    form="profile-form"
                    disabled={isUpdatingProfile || !isProfileChanged}
                    className="text-emerald-400 hover:text-emerald-300 md:hover:text-emerald-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus:outline-none cursor-pointer bg-transparent border-0 p-0 min-h-0 rounded-none flex items-center justify-center gap-2 text-xs font-mono uppercase tracking-wider touch-manipulation font-bold"
                    title={isProfileChanged ? "Save Changes" : "No changes to save"}
                  >
                    {isUpdatingProfile ? (
                      <div className="w-4 h-4 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin flex-shrink-0" />
                    ) : (
                      <Check className="w-4 h-4 shrink-0" />
                    )}
                    <span className="hidden md:inline">
                      {isUpdatingProfile ? "Saving..." : "Save"}
                    </span>
                  </button>
                </div>
              )}
            </div>
            
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 pb-2">
              {/* Avatar Display & Input */}
              <div className="relative group flex-shrink-0">
                <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-neutral-800 bg-neutral-900 flex items-center justify-center relative">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <User className="w-10 h-10 text-neutral-500" />
                  )}
                  {isUploadingAvatar && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <div className="w-5 h-5 border border-neutral-500 border-t-marvel rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                {/* Upload Trigger button overlay */}
                <label className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                  <span className="text-[10px] text-white font-mono font-bold uppercase tracking-wider">Change</span>
                  <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                </label>
              </div>

              {isEditingProfileInPlace ? (
                <form id="profile-form" onSubmit={handleProfileUpdate} className="flex-1 flex flex-col gap-3 text-left min-w-0 w-full">
                  <div className="grid grid-cols-2 gap-4 items-start w-full">
                    <div className="min-w-0 flex flex-col gap-1 w-full">
                      <span className="text-[9px] uppercase font-mono tracking-widest text-neutral-500 block mb-0.5">Full Name</span>
                      <input
                        type="text"
                        required
                        value={newFullName}
                        onChange={(e) => setNewFullName(e.target.value)}
                        placeholder="Avenger Name"
                        className="bg-neutral-950 border border-neutral-800 focus:border-marvel rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none w-full"
                      />
                    </div>
                    <div className="min-w-0 flex flex-col gap-1 w-full">
                      <span className="text-[9px] uppercase font-mono tracking-widest text-neutral-500 block mb-0.5">Agent Username</span>
                      <div className="relative flex items-center w-full">
                        <span className="absolute left-2.5 text-neutral-500 text-xs font-mono">@</span>
                        <input
                          type="text"
                          required
                          value={newUsername}
                          onChange={(e) => setNewUsername(e.target.value)}
                          placeholder="username"
                          className="bg-neutral-950 border border-neutral-800 focus:border-marvel rounded-lg pl-6 pr-2.5 py-1.5 text-xs text-white focus:outline-none w-full font-mono"
                        />
                      </div>
                    </div>
                  </div>
                  <p className="font-sans text-[11px] text-neutral-500 mt-1 leading-relaxed">
                    {authToken 
                      ? 'Your profile photo and data are synchronized directly with Private Cloud Storage.'
                      : 'Running in local sandbox. Register/Login to upload customized profile photos.'}
                  </p>
                </form>
              ) : (
                <div className="flex-1 flex flex-col gap-3 text-left min-w-0 w-full">
                  <div className="grid grid-cols-2 gap-4 items-start w-full">
                    <div className="min-w-0">
                      <span className="text-[9px] uppercase font-mono tracking-widest text-neutral-500 block mb-0.5">Full Name</span>
                      <h3 className="font-display font-bold text-sm sm:text-base text-white truncate" title={user?.fullName || 'Sandbox Agent'}>
                        {user?.fullName || 'Sandbox Agent'}
                      </h3>
                    </div>
                    <div className="min-w-0">
                      <span className="text-[9px] uppercase font-mono tracking-widest text-neutral-500 block mb-0.5">Agent Username</span>
                      <p className="font-mono text-xs text-neutral-300 truncate" title={user?.username || 'sandbox_mode'}>
                        @{user?.username || 'sandbox_mode'}
                      </p>
                    </div>
                  </div>
                  <p className="font-sans text-[11px] text-neutral-500 mt-1 leading-relaxed">
                    {authToken 
                      ? 'Your profile photo and data are synchronized directly with Private Cloud Storage.'
                      : 'Running in local sandbox. Register/Login to upload customized profile photos.'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Theme & Appearance Section */}
          <div className="flex flex-col gap-4 pt-6 border-t border-neutral-900/60" id="profile-theme-section">
            <div className="flex items-center justify-between border-b border-neutral-800/60 pb-3">
              <span className="text-xs uppercase font-bold text-neutral-400 tracking-wider font-display flex items-center gap-2">
                <Palette className="w-4 h-4 text-marvel" />
                Theme & Appearance
              </span>
            </div>

            <div className="flex flex-col gap-3.5">
              <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">
                Interface Mode
              </span>

              {/* Primary Dark / Light Mode Switch */}
              <div className="flex items-center gap-3 w-full sm:w-max">
                <button
                  type="button"
                  onClick={() => {
                    updatePreference('themeMode', 'dark');
                  }}
                  className={`flex-1 sm:w-44 py-2.5 px-4 rounded-xl border flex items-center justify-center gap-2 text-xs font-semibold transition-all cursor-pointer ${
                    (themeMode === 'dark' && !activeTheme.startsWith('light-'))
                      ? 'border-marvel bg-marvel/10 text-white font-bold'
                      : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700'
                  }`}
                >
                  <Moon className="w-4 h-4 text-marvel" />
                  <span>Dark Theme</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    updatePreference('themeMode', 'light');
                  }}
                  className={`flex-1 sm:w-44 py-2.5 px-4 rounded-xl border flex items-center justify-center gap-2 text-xs font-semibold transition-all cursor-pointer ${
                    (themeMode === 'light' || activeTheme.startsWith('light-'))
                      ? 'border-marvel bg-marvel/10 text-white font-bold'
                      : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700'
                  }`}
                >
                  <Sun className="w-4 h-4 text-amber-500" />
                  <span>Light Theme</span>
                </button>
              </div>

              {/* Theme Skins Grid */}
              <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider mt-2">
                {(themeMode === 'light' || activeTheme.startsWith('light-')) ? 'Light Theme Presets' : 'Dark Theme Presets'}
              </span>
              <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-6 sm:w-max sm:gap-3" id="profile-theme-grid">
                {((themeMode === 'light' || activeTheme.startsWith('light-'))
                  ? [
                      { id: 'light-marvel', name: 'Marvel Light', color: 'bg-slate-100 border-red-500' },
                      { id: 'light-stark', name: 'Stark Silver', color: 'bg-sky-50 border-sky-500' },
                      { id: 'light-asgard', name: 'Asgard Light', color: 'bg-amber-50 border-amber-500' },
                      { id: 'light-quantum', name: 'Quantum Crimson', color: 'bg-rose-50 border-red-600' },
                      { id: 'light-shield', name: 'Shield White', color: 'bg-slate-200 border-slate-600' },
                      { id: 'light-wakanda', name: 'Wakanda Snow', color: 'bg-purple-50 border-purple-500' },
                    ]
                  : [
                      { id: 'oled', name: 'OLED Black', color: 'bg-black border-red-500' },
                      { id: 'cosmic', name: 'Cosmic Purple', color: 'bg-indigo-950 border-purple-500' },
                      { id: 'asgardian', name: 'Asgard Gold', color: 'bg-slate-900 border-amber-500' },
                      { id: 'wakanda', name: 'Wakanda Vibranium', color: 'bg-slate-950 border-purple-600' },
                      { id: 'stark', name: 'Stark Arc', color: 'bg-neutral-900 border-sky-400' },
                      { id: 'hydra', name: 'Hydra Crimson', color: 'bg-stone-900 border-red-600' },
                    ]
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      updatePreference('theme', t.id as any);
                    }}
                    className={`p-2.5 rounded-xl border text-center flex flex-col items-center justify-center gap-2 transition-all focus:outline-none min-w-0 w-full sm:w-36 h-[76px] cursor-pointer ${
                      activeTheme === t.id
                        ? 'border-marvel bg-neutral-900 font-bold shadow-sm'
                        : 'border-neutral-800 bg-neutral-950 hover:border-neutral-700'
                    }`}
                  >
                    <div className={`w-4.5 h-4.5 rounded-full border flex-shrink-0 ${t.color}`} />
                    <span className="text-[10px] text-white font-sans truncate max-w-full block whitespace-nowrap select-none">{t.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Agent Information & Session Audit Trail */}
          <div className="flex flex-col gap-4 pt-6 border-t border-neutral-900/60">
            <div className="flex items-center justify-between border-b border-neutral-800/60 pb-3">
              <span className="text-xs uppercase font-bold text-neutral-400 tracking-wider font-display flex items-center gap-2 flex-nowrap shrink-0">
                Agent Session History
              </span>
              {user?.sessions && user.sessions.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setSessionSearchQuery('');
                    setSessionFilterStatus('all');
                    setSessionPage(1);
                    setShowAllSessions(true);
                  }}
                  className="hover:text-white transition-all focus:outline-none flex items-center gap-1 text-[11px] font-sans font-semibold text-neutral-400 shrink-0 whitespace-nowrap cursor-pointer ml-2 p-0 bg-transparent border-0"
                  title="View Complete Session History"
                >
                  <Eye className="w-3.5 h-3.5 text-marvel shrink-0" />
                  <span>View All</span>
                </button>
              )}
            </div>
            <div className="flex flex-col gap-3 font-sans text-xs">
              <div className="grid grid-cols-2 gap-4 pb-1 text-[11px] text-left">
                <div>
                  <span className="text-neutral-500 block uppercase font-mono tracking-wider text-[9px]">Agent Code:</span>
                  <span className="font-mono text-white font-semibold">@{user?.username || 'sandbox_mode'}</span>
                </div>
                <div>
                  <span className="text-neutral-500 block uppercase font-mono tracking-wider text-[9px]">Registered Since:</span>
                  <span className="text-white font-semibold">{user?.createdAt ? formatToIndianDateTime(user.createdAt) : 'N/A'}</span>
                </div>
              </div>

              <div className="space-y-2.5 border-t border-neutral-900/60 pt-3 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400 font-bold block text-[10px] uppercase font-mono tracking-wider">Recent Session Logs</span>
                  <span className="text-neutral-500 font-mono text-[9px]">
                    Showing {Math.min(10, user?.sessions?.length || 0)} of {user?.sessions?.length || 0}
                  </span>
                </div>
                {user?.sessions && user.sessions.length > 0 ? (
                  <div className="overflow-x-auto no-scrollbar -mx-5 w-[calc(100%+2.5rem)] border-t border-b border-neutral-900/40 text-left">
                    <table className="w-full text-left font-mono text-[10px] leading-normal border-collapse min-w-[650px]">
                      <thead>
                        <tr className="bg-neutral-950/20 text-neutral-400 uppercase tracking-wider border-b border-neutral-900 text-[8px]">
                          <th className="py-2.5 px-3 font-semibold text-left whitespace-nowrap">Session Start</th>
                          <th className="py-2.5 px-3 font-semibold text-left whitespace-nowrap">Session End</th>
                          <th className="py-2.5 px-3 font-semibold text-left whitespace-nowrap">Browser</th>
                          <th className="py-2.5 px-3 font-semibold text-left whitespace-nowrap">Device</th>
                          <th className="py-2.5 px-3 font-semibold text-left whitespace-nowrap">Operating System</th>
                          <th 
                            className="py-2.5 px-3 font-bold text-left whitespace-nowrap cursor-pointer text-neutral-300 hover:text-white transition-colors select-none"
                            onClick={() => setIsDurationHHMMSS(!isDurationHHMMSS)}
                            title="Click to toggle duration format"
                          >
                            Duration
                          </th>
                          <th className="py-2.5 px-3 font-semibold text-left whitespace-nowrap">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-900/40 text-neutral-300">
                        {[...user.sessions].reverse().slice(0, 10).map((session: any) => (
                          <tr key={session.sessionId} className="hover:bg-neutral-900/10 transition-colors">
                            <td className="py-2.5 px-3 text-left whitespace-nowrap">
                              {formatToIndianDateTime(session.startedAt)}
                            </td>
                            <td className="py-2.5 px-3 text-left whitespace-nowrap text-neutral-500">
                              {session.endedAt ? formatToIndianDateTime(session.endedAt) : 'Ongoing'}
                            </td>
                            <td className="py-2.5 px-3 text-left whitespace-nowrap">
                              {session.browser}
                            </td>
                            <td className="py-2.5 px-3 text-left whitespace-nowrap">
                              <span className="font-semibold">{session.resolvedDeviceName || session.device || 'Unknown Device'}</span>
                            </td>
                            <td className="py-2.5 px-3 text-left whitespace-nowrap">
                              {session.os}
                            </td>
                            <td className="py-2.5 px-3 text-left whitespace-nowrap font-semibold">
                              {session.endedAt 
                                ? formatDuration(session.durationSeconds)
                                : 'Active now'
                              }
                            </td>
                            <td className="py-2.5 px-3 text-left whitespace-nowrap">
                              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border ${
                                session.status === 'Active'
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                  : session.status === 'Logged Out'
                                  ? 'bg-neutral-900 text-neutral-400 border-neutral-800'
                                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                              }`}>
                                {session.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-[10px] text-neutral-500 italic text-left">No session trails recorded yet or sandbox mode active.</p>
                )}
              </div>
            </div>
          </div>

          {/* Agent Updates Ledger (Dashboard View: Recent 10 updates) */}
          <div className="flex flex-col gap-4 pt-6 border-t border-neutral-900/60">
            <div className="flex items-center justify-between border-b border-neutral-800/60 pb-3">
              <span className="text-xs uppercase font-bold text-neutral-400 tracking-wider font-display flex items-center gap-2 flex-nowrap shrink-0">
                Agent Updates Logs
              </span>
              {(isOfflineSandbox ? sandboxUpdates.length > 0 : (user?.updates && user.updates.length > 0)) && (
                <button
                  type="button"
                  onClick={() => {
                    setUpdatesSearchQuery('');
                    setUpdatesFilterCategory('all');
                    setUpdatesSortOrder('newest');
                    setUpdatesFilterStartDate('');
                    setUpdatesFilterEndDate('');
                    setUpdatesPage(1);
                    setShowAllUpdates(true);
                  }}
                  className="hover:text-white transition-all focus:outline-none flex items-center gap-1 text-[11px] font-sans font-semibold text-neutral-400 shrink-0 whitespace-nowrap cursor-pointer ml-2 p-0 bg-transparent border-0"
                  title="View Complete Updates Logs"
                >
                  <Eye className="w-3.5 h-3.5 text-marvel shrink-0" />
                  <span>View All</span>
                </button>
              )}
            </div>

            <div className="flex flex-col gap-3 font-sans text-xs">
              <div className="space-y-2.5 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400 font-bold block text-[10px] uppercase font-mono tracking-wider">Recent Update Logs</span>
                  <span className="text-neutral-500 font-mono text-[9px]">
                    Showing {Math.min(10, isOfflineSandbox ? sandboxUpdates.length : (user?.totalLogCount || user?.updates?.length || 0))} of {isOfflineSandbox ? sandboxUpdates.length : (user?.totalLogCount || user?.updates?.length || 0)}
                  </span>
                </div>
                {(() => {
                  const items = isOfflineSandbox ? sandboxUpdates : (user?.updates || []);
                  const recent = items.slice(0, 10);
                  if (recent.length > 0) {
                    return (
                      <div className="overflow-x-auto no-scrollbar -mx-5 w-[calc(100%+2.5rem)] border-t border-b border-neutral-900/40 text-left">
                        <table className="w-full text-left font-mono text-[10px] leading-normal border-collapse min-w-[650px]">
                          <thead>
                            <tr className="bg-neutral-950/20 text-neutral-400 uppercase tracking-wider border-b border-neutral-900 text-[8px]">
                              <th className="py-2.5 px-3 font-semibold text-left whitespace-nowrap">Timestamp</th>
                              <th className="py-2.5 px-3 font-semibold text-left whitespace-nowrap">Source</th>
                              <th className="py-2.5 px-3 font-semibold text-left whitespace-nowrap">Action</th>
                              <th className="py-2.5 px-3 font-semibold text-left whitespace-nowrap">Old Value</th>
                              <th className="py-2.5 px-3 font-semibold text-left whitespace-nowrap">New Value</th>
                              <th className="py-2.5 px-3 font-semibold text-left whitespace-nowrap">Agent</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-900/40 text-neutral-300">
                            {recent.map((log: any, idx: number) => (
                              <tr key={log.id || idx} className="hover:bg-neutral-900/10 transition-colors">
                                <td className="py-2.5 px-3 text-left whitespace-nowrap">
                                  {formatToIndianDateTime(log.timestamp)}
                                </td>
                                <td className="py-2.5 px-3 text-left whitespace-nowrap">
                                  <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${
                                    log.source === 'Profile'
                                      ? 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                                      : log.source === 'Settings'
                                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                      : log.source === 'Watch Status'
                                      ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                                      : log.source === 'Theme'
                                      ? 'bg-teal-500/10 text-teal-400 border-teal-500/20'
                                      : 'bg-neutral-800 text-neutral-300 border-neutral-700'
                                  }`}>
                                    {log.source || 'General'}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-left font-semibold whitespace-nowrap">
                                  {log.action}
                                </td>
                                <td className="py-2.5 px-3 text-left max-w-xs truncate" title={log.previousValue}>
                                  {renderLogValue(log, false, user?.userId)}
                                </td>
                                <td className="py-2.5 px-3 text-left max-w-xs font-semibold text-emerald-400 truncate" title={log.newValue}>
                                  {renderLogValue(log, true, user?.userId)}
                                </td>
                                <td className="py-2.5 px-3 text-left whitespace-nowrap text-neutral-400">
                                  @{log.userPerformed || 'sandbox_agent'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  } else {
                    return (
                      <p className="text-[10px] text-neutral-500 italic text-left">No updates recorded yet.</p>
                    );
                  }
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
