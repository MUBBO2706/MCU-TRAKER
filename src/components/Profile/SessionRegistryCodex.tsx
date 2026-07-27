import React, { useState } from 'react';
import { Eye, Search, ChevronLeft, Download, ChevronDown, FileText, Table, MoreVertical, XCircle, Trash2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CustomDropdown } from '../CustomDropdown';
import { CustomDatePicker } from '../Common/CustomDatePicker';
import { ConfirmationModal } from '../Common/ConfirmationModal';

interface SessionRegistryCodexProps {
  onBack: () => void;
  user: any;
  activeTheme: 'oled' | 'cosmic' | 'asgardian' | 'wakanda' | 'stark' | 'hydra';
  formatToIndianDateTime: (timestamp: number | string) => string;
  currentSessionId?: string | null;
  onTerminateSession?: (sessionId: string) => Promise<void>;
  onTerminateOtherSessions?: () => Promise<void>;
  onDeleteSession?: (sessionId: string) => Promise<void>;
  onDeleteInactiveSessions?: () => Promise<void>;
  isOfflineSandbox: boolean;
  authToken?: string | null;
  onRefreshProfile?: () => Promise<void>;
  onLogSandboxUpdate?: (action: string, previousValue: string, newValue: string, source: string, metadata?: any) => void;
}

export const SessionRegistryCodex: React.FC<SessionRegistryCodexProps> = ({
  onBack,
  user,
  activeTheme,
  formatToIndianDateTime,
  currentSessionId,
  onTerminateSession,
  onTerminateOtherSessions,
  onDeleteSession,
  onDeleteInactiveSessions,
  isOfflineSandbox,
  authToken,
  onRefreshProfile,
  onLogSandboxUpdate,
}) => {
  // Local States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'browser-asc' | 'os-asc'>('newest');
  const [timeRange, setTimeRange] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [isDurationHHMMSS, setIsDurationHHMMSS] = useState(false);
  const [showMoreDropdown, setShowMoreDropdown] = useState(false);

  // Row-level action states
  const [confirmingTerminateId, setConfirmingTerminateId] = useState<string | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [isRowActionRunning, setIsRowActionRunning] = useState<string | null>(null);

  // Bulk action custom confirmation modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'terminate_others' | 'delete_all_inactive' | null>(null);
  const [isBulkRunning, setIsBulkRunning] = useState(false);

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

  // Theme helper for consistency
  const getThemeStyles = () => {
    switch (activeTheme) {
      case 'cosmic':
        return {
          button: 'border-indigo-500/30 bg-neutral-950/80 text-white focus:border-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.05)] hover:border-indigo-500/50',
          marvelIcon: 'text-indigo-400',
        };
      case 'asgardian':
        return {
          button: 'border-amber-500/30 bg-neutral-950/80 text-white focus:border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.05)] hover:border-amber-500/50',
          marvelIcon: 'text-amber-400',
        };
      case 'wakanda':
        return {
          button: 'border-purple-500/30 bg-neutral-950/80 text-white focus:border-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.05)] hover:border-purple-500/50',
          marvelIcon: 'text-purple-400',
        };
      case 'stark':
        return {
          button: 'border-sky-500/30 bg-neutral-950/80 text-white focus:border-sky-500 shadow-[0_0_10px_rgba(56,189,248,0.05)] hover:border-sky-500/50',
          marvelIcon: 'text-sky-400',
        };
      case 'hydra':
        return {
          button: 'border-red-500/30 bg-neutral-950/80 text-white focus:border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.05)] hover:border-red-500/50',
          marvelIcon: 'text-red-500',
        };
      default: // oled
        return {
          button: 'border-neutral-800 bg-neutral-950/90 text-white focus-within:border-marvel shadow-[0_0_10px_rgba(230,36,41,0.05)] hover:border-neutral-700',
          marvelIcon: 'text-marvel',
        };
    }
  };

  const themeStyles = getThemeStyles();

  // Export Theme Styles (Compact, no filled hover backgrounds, theme-aware borders)
  const getExportButtonStyles = () => {
    const isLight = activeTheme.startsWith('light-');
    const baseBorder = isLight 
      ? 'border-slate-300' 
      : 'border-neutral-800';
    
    let hoverBorder = '';
    let accentText = '';
    let hoverText = '';

    switch (activeTheme) {
      case 'cosmic':
        hoverBorder = 'hover:border-indigo-500/50';
        accentText = 'text-indigo-400';
        hoverText = 'hover:text-indigo-300';
        break;
      case 'asgardian':
        hoverBorder = 'hover:border-amber-500/50';
        accentText = 'text-amber-400';
        hoverText = 'hover:text-amber-300';
        break;
      case 'wakanda':
        hoverBorder = 'hover:border-purple-500/50';
        accentText = 'text-purple-400';
        hoverText = 'hover:text-purple-300';
        break;
      case 'stark':
        hoverBorder = 'hover:border-sky-500/50';
        accentText = 'text-sky-400';
        hoverText = 'hover:text-sky-300';
        break;
      case 'hydra':
        hoverBorder = 'hover:border-red-500/50';
        accentText = 'text-red-500';
        hoverText = 'hover:text-red-400';
        break;
      default: // oled
        hoverBorder = 'hover:border-red-500/50';
        accentText = 'text-red-500';
        hoverText = 'hover:text-red-400';
        break;
    }

    let itemHoverBg = '';
    switch (activeTheme) {
      case 'cosmic':
        itemHoverBg = 'hover:bg-indigo-500/10 active:bg-indigo-500/20';
        break;
      case 'asgardian':
        itemHoverBg = 'hover:bg-amber-500/10 active:bg-amber-500/20';
        break;
      case 'wakanda':
        itemHoverBg = 'hover:bg-purple-500/10 active:bg-purple-500/20';
        break;
      case 'stark':
        itemHoverBg = 'hover:bg-sky-500/10 active:bg-sky-500/20';
        break;
      case 'hydra':
      default:
        itemHoverBg = 'hover:bg-red-500/10 active:bg-red-500/20';
        break;
    }

    const bgClass = isLight ? 'bg-white' : 'bg-neutral-950';
    return {
      buttonClass: `bg-transparent ${accentText} ${hoverText} transition-all duration-200 cursor-pointer font-mono rounded-xl px-1.5 py-1.5 text-[10px] sm:text-xs font-bold flex items-center gap-1.5 focus:outline-none focus:ring-0`,
      dropdownClass: `absolute right-0 mt-1.5 w-48 rounded-xl ${bgClass} border ${baseBorder} z-50 py-0 overflow-hidden`,
      dropdownItemClass: `w-full text-left bg-transparent ${accentText} ${hoverText} ${itemHoverBg} px-3.5 py-2.5 text-[10px] sm:text-xs transition-colors duration-150 flex items-center gap-2.5 cursor-pointer font-mono border-0`
    };
  };

  const exportStyles = getExportButtonStyles();

  const getModalConfirmBtnStyle = () => {
    switch (activeTheme) {
      case 'cosmic':
        return 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-950/20';
      case 'asgardian':
        return 'bg-amber-600 hover:bg-amber-500 shadow-amber-950/20';
      case 'wakanda':
        return 'bg-purple-600 hover:bg-purple-500 shadow-purple-950/20';
      case 'stark':
        return 'bg-sky-600 hover:bg-sky-500 shadow-sky-950/20';
      case 'hydra':
        return 'bg-red-600 hover:bg-red-500 shadow-red-950/20';
      default: // oled
        return 'bg-red-600 hover:bg-red-500 shadow-red-950/20';
    }
  };

  // Status options
  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'Active', label: 'Active' },
    { value: 'Logged Out', label: 'Logged Out' },
    { value: 'Expired', label: 'Expired' },
  ];

  // Sorting options
  const sortOptions = [
    { value: 'newest', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'browser-asc', label: 'Browser A-Z' },
    { value: 'os-asc', label: 'OS A-Z' },
  ];

  // Time range options
  const timeRangeOptions = [
    { value: 'all', label: 'All Time' },
    { value: '24h', label: 'Past 24 Hours' },
    { value: '7d', label: 'Past 7 Days' },
    { value: '1m', label: 'Past 1 Month' },
    { value: 'custom', label: 'Custom Range' },
  ];

  const sessions = user?.sessions ? [...user.sessions] : [];

  // Filtering
  const filtered = sessions.filter((s: any) => {
    // 1. Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const bM = s.browser?.toLowerCase().includes(q);
      const oM = s.os?.toLowerCase().includes(q);
      const sM = s.status?.toLowerCase().includes(q);
      const stM = s.startedAt ? formatToIndianDateTime(s.startedAt).toLowerCase().includes(q) : false;
      const eM = s.endedAt ? formatToIndianDateTime(s.endedAt).toLowerCase().includes(q) : false;
      if (!bM && !oM && !sM && !stM && !eM) return false;
    }

    // 2. Status filter
    if (filterStatus !== 'all' && s.status !== filterStatus) {
      return false;
    }

    // 3. Time range filter
    const timestamp = typeof s.startedAt === 'number' ? s.startedAt : new Date(s.startedAt).getTime();
    const now = Date.now();
    if (timeRange === '24h') {
      if (timestamp < now - 24 * 60 * 60 * 1000) return false;
    } else if (timeRange === '7d') {
      if (timestamp < now - 7 * 24 * 60 * 60 * 1000) return false;
    } else if (timeRange === '1m') {
      if (timestamp < now - 30 * 24 * 60 * 60 * 1000) return false;
    } else if (timeRange === 'custom') {
      if (startDate) {
        const startMs = new Date(startDate).getTime();
        if (timestamp < startMs) return false;
      }
      if (endDate) {
        const endMs = new Date(endDate).getTime() + 24 * 60 * 60 * 1000 - 1;
        if (timestamp > endMs) return false;
      }
    }

    return true;
  });

  // Sorting
  const sorted = [...filtered].sort((a: any, b: any) => {
    if (sortOrder === 'newest') return b.startedAt - a.startedAt;
    if (sortOrder === 'oldest') return a.startedAt - b.startedAt;
    if (sortOrder === 'browser-asc') return (a.browser || '').localeCompare(b.browser || '');
    if (sortOrder === 'os-asc') return (a.os || '').localeCompare(b.os || '');
    return 0;
  });

  const limit = 10;
  const maxPage = Math.ceil(sorted.length / limit) || 1;
  const currentPage = Math.min(page, maxPage);
  const startIndex = (currentPage - 1) * limit;
  const pageSessions = sorted.slice(startIndex, startIndex + limit);

  // Logging Helper for exports
  const logExportAction = async (exportType: string, recordCount: number) => {
    const timestamp = Date.now();
    if (isOfflineSandbox) {
      if (onLogSandboxUpdate) {
        onLogSandboxUpdate(
          `Export: ${exportType}`,
          'N/A',
          `${recordCount} records exported`,
          'Sessions',
          { exportType, sourcePage: 'Sessions', timestamp, recordCount }
        );
      }
    } else {
      try {
        const response = await fetch('/api/user/log-action', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({
            action: `Export: ${exportType}`,
            previousValue: 'N/A',
            newValue: `${recordCount} records exported`,
            source: 'Sessions',
            metadata: { exportType, sourcePage: 'Sessions', timestamp, recordCount }
          })
        });
        if (response.ok) {
          if (onRefreshProfile) {
            await onRefreshProfile();
          }
        }
      } catch (err) {
        console.error('Failed to log action:', err);
      }
    }
  };

  // PDF Export
  const handleExportPDF = async () => {
    const headers = ["Started At", "End Time", "Duration", "Browser", "OS", "Device", "Status"];
    const rows = sorted.map(sess => [
      formatToIndianDateTime(sess.startedAt),
      sess.endedAt ? formatToIndianDateTime(sess.endedAt) : 'Ongoing',
      formatDuration(sess.durationSeconds),
      sess.browser,
      sess.os,
      sess.resolvedDeviceName || sess.device || 'Unknown',
      sess.status.toUpperCase()
    ]);

    // Calculate dynamic parameters based on content lengths
    const colMaxLengths = headers.map((h, i) => {
      const cellLengths = rows.map(r => String(r[i] || '').length);
      return Math.max(h.length, ...cellLengths);
    });

    const totalTableLength = colMaxLengths.reduce((sum, len) => sum + len, 0);

    // Smart Page Orientation
    const manyColumns = headers.length > 6;
    const hasLongField = rows.some(row => 
      row.some(cell => String(cell || '').length > 28)
    );
    const useLandscape = manyColumns || hasLongField || totalTableLength > 120;

    const orientation = useLandscape ? 'landscape' : 'portrait';
    const pageWidth = useLandscape ? 297 : 210;
    const pageHeight = useLandscape ? 210 : 297;

    // Table scaling adjustments (decrease slightly for dense data)
    let tableFontSize = 8.5;
    if (totalTableLength > 140) tableFontSize = 7.0;
    else if (totalTableLength > 100) tableFontSize = 7.5;
    else if (totalTableLength > 70) tableFontSize = 8.0;

    let cellPadding = 2.5;
    if (totalTableLength > 110) cellPadding = 1.6;
    else if (totalTableLength > 80) cellPadding = 2.0;

    // Use consistent 12mm page margin for layout alignment
    const pageMargin = 12;
    const totalWidth = pageWidth - (pageMargin * 2);

    // Calculate intelligent column widths to utilize full width without truncation or excessive blank columns
    const colWidthsConfig: { [key: number]: { cellWidth: number } } = {};
    
    // 1. Raw weights based on contents
    const rawWeights = headers.map((h, i) => {
      const maxLen = colMaxLengths[i];
      return Math.max(maxLen, h.length);
    });

    // 2. Define secure minimum widths to protect key info
    const minWidths = headers.map((h) => {
      const name = h.toUpperCase();
      if (name.includes("STARTED") || name.includes("TIMESTAMP") || name.includes("TIME")) return 35;
      if (name === "ACTION BY") return 22;
      if (name.includes("DURATION")) return 20;
      if (name.includes("STATUS")) return 18;
      if (name.includes("OS")) return 18;
      if (name.includes("BROWSER")) return 20;
      if (name.includes("DEVICE")) return 22;
      if (name.includes("CATEGORY")) return 24;
      if (name.includes("ACTION")) return 25;
      if (name.includes("VALUE")) return 30;
      return 15;
    });

    const totalMinWidth = minWidths.reduce((sum, w) => sum + w, 0);
    
    if (totalMinWidth >= totalWidth) {
      headers.forEach((_, idx) => {
        colWidthsConfig[idx] = { cellWidth: (minWidths[idx] / totalMinWidth) * totalWidth };
      });
    } else {
      const totalWeight = rawWeights.reduce((sum, w) => sum + w, 0);
      headers.forEach((_, idx) => {
        const leftoverShare = (rawWeights[idx] / totalWeight) * (totalWidth - totalMinWidth);
        colWidthsConfig[idx] = { cellWidth: minWidths[idx] + leftoverShare };
      });
    }

    const doc = new jsPDF({
      orientation: orientation,
      unit: 'mm',
      format: 'a4'
    });

    // Theme RGB matching
    let primaryColor: [number, number, number] = [185, 28, 28]; // Default red-700
    if (activeTheme === 'cosmic') primaryColor = [67, 56, 202]; // Indigo-700
    else if (activeTheme === 'asgardian') primaryColor = [180, 83, 9]; // Amber-700
    else if (activeTheme === 'wakanda') primaryColor = [109, 40, 217]; // Purple-700
    else if (activeTheme === 'stark') primaryColor = [3, 105, 161]; // Sky-700
    else if (activeTheme === 'hydra') primaryColor = [185, 28, 28]; // Red-700

    // Header title (Simplified, cleaner headings matching requested design)
    doc.setFont('courier', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("SECURE SESSION HISTORY EXPORT", pageMargin, 20);
    
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text("Session Activity Report", pageMargin, 26);

    // Decorative line
    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setLineWidth(0.5);
    doc.line(pageMargin, 29, pageWidth - pageMargin, 29);

    // Metadata details
    doc.setFont('courier', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(50, 50, 50);

    const agentName = user?.fullName || 'Sandbox Agent';
    const agentAccount = `@${user?.username || 'sandbox_mode'}`;
    const dateStr = formatToIndianDateTime(Date.now());
    
    // Filters description
    const searchFilter = searchQuery.trim() ? `"${searchQuery}"` : "None";
    const statusFilter = filterStatus.toUpperCase();
    const rangeFilter = timeRange.toUpperCase();
    const activeFilters = `Search: ${searchFilter} | Status: ${statusFilter} | Timeframe: ${rangeFilter}`;

    // Expanded Agent information with matching alignment under monospaced font
    doc.text(`Agent Name:     ${agentName}`, pageMargin, 36);
    doc.text(`Agent Account:  ${agentAccount}`, pageMargin, 41);
    doc.text(`Export Date:    ${dateStr}`, pageMargin, 46);
    doc.text(`Active Filters: ${activeFilters}`, pageMargin, 51);
    doc.text(`Total Records:  ${sorted.length}`, pageMargin, 56);

    // Decorative subtle line
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.line(pageMargin, 60, pageWidth - pageMargin, 60);

    autoTable(doc, {
      startY: 65,
      head: [headers],
      body: rows,
      theme: 'striped',
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        font: 'courier',
        fontStyle: 'bold',
        fontSize: tableFontSize
      },
      bodyStyles: {
        font: 'courier',
        fontSize: tableFontSize,
        textColor: [0, 0, 0]
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      margin: { top: 20, left: pageMargin, right: pageMargin, bottom: 25 },
      styles: {
        cellPadding: cellPadding,
        overflow: 'ellipsize'
      },
      columnStyles: colWidthsConfig
    });

    // Add page numbers and confidentiality footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    const footerY = pageHeight - 10;
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFont('courier', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      
      const footerText = "Generated by Nexus MCU Companion • Internal Report";
      doc.text(footerText, pageMargin, footerY);
      
      const pageText = `Page ${i} of ${pageCount}`;
      const pageTextWidth = doc.getTextWidth(pageText);
      doc.text(pageText, pageWidth - pageMargin - pageTextWidth, footerY);
    }

    doc.save(`shield_sessions_export_${Date.now()}.pdf`);

    await logExportAction('PDF', sorted.length);
  };

  // CSV Export
  const handleExportCSV = async () => {
    const headers = ["Started At", "End Time", "Duration", "Browser", "OS", "Device", "Status"];
    const rows = sorted.map(sess => [
      formatToIndianDateTime(sess.startedAt),
      sess.endedAt ? formatToIndianDateTime(sess.endedAt) : 'Ongoing',
      formatDuration(sess.durationSeconds),
      sess.browser,
      sess.os,
      sess.resolvedDeviceName || sess.device || 'Unknown',
      sess.status
    ]);

    const csvContent = [
      headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','),
      ...rows.map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `shield_sessions_export_${Date.now()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    await logExportAction('CSV / Excel', sorted.length);
  };

  return (
    <div className="flex flex-col animate-fadeIn text-left gap-2 font-sans w-full py-1 px-1" id="session-registry-codex-expanded">
      <div className="flex flex-col gap-1.5 md:gap-3 w-full text-left md:flex-row md:items-center md:justify-between z-40">
        <div className="flex flex-col gap-1 text-left w-full md:w-auto">
          <div className="flex items-center justify-between w-full md:w-auto md:justify-start md:gap-2">
            <h2 className="font-display font-bold text-xl sm:text-2xl tracking-tight text-white flex items-center gap-2">
              <Eye className={`${themeStyles.marvelIcon} w-5 h-5 sm:w-6 sm:h-6`} />
              Sessions
            </h2>

            {/* Consolidates actions into 'More' dropdown on mobile & desktop */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowMoreDropdown(!showMoreDropdown)}
                className={`bg-transparent border-0 outline-none shadow-none focus:outline-none focus:ring-0 ${
                  activeTheme.startsWith('light-') ? 'text-slate-700 hover:text-red-600' : 'text-neutral-300 hover:text-marvel'
                } px-2 py-1 text-xs font-mono font-medium flex items-center gap-1.5 cursor-pointer transition-colors`}
              >
                <span>More</span>
                <MoreVertical className="w-3.5 h-3.5 shrink-0" />
              </button>

              {showMoreDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowMoreDropdown(false)} />
                  <div className={`absolute right-0 mt-2 w-52 rounded-xl ${
                    activeTheme.startsWith('light-') ? 'bg-white border-slate-300' : 'bg-neutral-950 border-neutral-800'
                  } border z-50 py-1 shadow-xl text-left font-mono text-xs overflow-visible`}>
                    {/* Tail / Callout triangle pointing up directly at the vertical three-dots icon */}
                    <div className={`absolute -top-1.5 right-[9px] w-3 h-3 rotate-45 border-t border-l ${
                      activeTheme.startsWith('light-') ? 'bg-white border-slate-300' : 'bg-neutral-950 border-neutral-800'
                    }`} />

                    <div className="relative z-10 py-1">
                      {/* Action Group 1: Exports */}
                      <button
                        type="button"
                        onClick={() => {
                          handleExportPDF();
                          setShowMoreDropdown(false);
                        }}
                        className={exportStyles.dropdownItemClass}
                      >
                        <FileText className="w-3.5 h-3.5 shrink-0 text-red-500" />
                        <span>Export as PDF</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleExportCSV();
                          setShowMoreDropdown(false);
                        }}
                        className={exportStyles.dropdownItemClass}
                      >
                        <Table className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                        <span>Export as CSV / Excel</span>
                      </button>

                      {/* Separator between action groups */}
                      <div className={`my-1 border-t ${
                        activeTheme.startsWith('light-') ? 'border-slate-200' : 'border-neutral-850'
                      }`} />

                      {/* Action Group 2: Session Management */}
                      {onTerminateOtherSessions && (
                        <button
                          type="button"
                          disabled={isRowActionRunning !== null || isBulkRunning || sessions.filter((s: any) => s.status === 'Active' && s.sessionId !== currentSessionId).length === 0}
                          onClick={() => {
                            setShowMoreDropdown(false);
                            setModalType('terminate_others');
                            setModalOpen(true);
                          }}
                          className={`${exportStyles.dropdownItemClass} text-rose-500 hover:text-rose-400 disabled:opacity-40 disabled:cursor-not-allowed`}
                        >
                          <XCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                          <span>Terminate All Sessions</span>
                        </button>
                      )}

                      {onDeleteInactiveSessions && (
                        <button
                          type="button"
                          disabled={isRowActionRunning !== null || isBulkRunning || sessions.filter((s: any) => s.status !== 'Active' && s.sessionId !== currentSessionId).length === 0}
                          onClick={() => {
                            setShowMoreDropdown(false);
                            setModalType('delete_all_inactive');
                            setModalOpen(true);
                          }}
                          className={`${exportStyles.dropdownItemClass} text-amber-500 hover:text-amber-400 disabled:opacity-40 disabled:cursor-not-allowed`}
                        >
                          <Trash2 className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                          <span>Delete All Sessions</span>
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <p className="font-sans text-xs text-neutral-400 w-full">
            Audit all security sessions, client devices, and authentication states for Agent @{user?.username || 'sandbox_mode'}.
          </p>
        </div>
      </div>

      {/* Search and Filters Group */}
      <div className="flex flex-col md:flex-row gap-2.5 z-30 w-full md:items-center">
        {/* Row 1 / Left on desktop: Search Bar */}
        <div className="w-full md:flex-1 relative py-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <input
            type="text"
            placeholder="Search browser, OS..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="w-full bg-neutral-900 border border-neutral-850 text-white text-xs rounded-xl pl-10 pr-4 py-2.5 h-10 focus:border-marvel focus:outline-none font-sans"
          />
        </div>

        {/* Row 2 / Right on desktop: Custom Selectors */}
        <div className="grid grid-cols-3 md:flex gap-2.5 w-full md:w-auto items-center flex-shrink-0">
          <div className="md:w-44">
            <CustomDropdown
              value={filterStatus}
              onChange={(val) => {
                setFilterStatus(val);
                setPage(1);
              }}
              options={statusOptions}
              activeTheme={activeTheme}
              placeholder="All Statuses"
              align="left"
              compact={true}
            />
          </div>

          <div className="md:w-36">
            <CustomDropdown
              value={sortOrder}
              onChange={(val) => {
                setSortOrder(val as any);
                setPage(1);
              }}
              options={sortOptions}
              activeTheme={activeTheme}
              placeholder="Sort By"
              align="center"
              compact={true}
            />
          </div>

          <div className="md:w-36">
            <CustomDropdown
              value={timeRange}
              onChange={(val) => {
                setTimeRange(val);
                setPage(1);
              }}
              options={timeRangeOptions}
              activeTheme={activeTheme}
              placeholder="Time Range"
              align="right"
              compact={true}
            />
          </div>
        </div>
      </div>

      {/* Custom Range: Additional Custom Selectors */}
      {timeRange === 'custom' && (
        <div className="flex flex-row items-center gap-3 mt-1.5 animate-fadeIn z-10 w-full md:w-auto">
          <div className="w-1/2 md:w-44">
            <CustomDatePicker
              value={startDate}
              onChange={(val) => {
                setStartDate(val);
                setPage(1);
              }}
              label="From"
              activeTheme={activeTheme}
            />
          </div>

          <div className="w-1/2 md:w-44">
            <CustomDatePicker
              value={endDate}
              onChange={(val) => {
                setEndDate(val);
                setPage(1);
              }}
              label="To"
              activeTheme={activeTheme}
            />
          </div>
        </div>
      )}

      {/* Detailed Session Table */}
      <div className="flex flex-col gap-3 text-left pt-3 pb-4">
        {/* Row Header with Single-Line Labels prevented from wrapping */}
        <div className={`flex items-center justify-between gap-2 border-b pb-2.5 ${
          activeTheme.startsWith('light-') ? 'border-slate-300' : 'border-neutral-850'
        }`}>
          <span className={`text-xs sm:text-sm uppercase font-bold tracking-wider font-display whitespace-nowrap ${
            activeTheme.startsWith('light-') ? 'text-slate-900' : 'text-neutral-200'
          }`}>
            Session Logs
          </span>
          <span className={`font-mono text-[9px] uppercase tracking-widest whitespace-nowrap ${
            activeTheme.startsWith('light-') ? 'text-slate-500' : 'text-neutral-500'
          }`}>
            {searchQuery.trim() !== '' || filterStatus !== 'all' || timeRange !== 'all' ? (
              `Found ${sorted.length} of ${sessions.length} results`
            ) : (
              `${sessions.length} Total Sessions`
            )}
          </span>
        </div>

        {pageSessions.length > 0 ? (
          <div className="flex flex-col gap-4 text-left">
            <div className={`overflow-x-auto no-scrollbar -mx-5 w-[calc(100%+2.5rem)] border-t border-b text-left ${
              activeTheme.startsWith('light-') ? 'border-slate-300/80' : 'border-neutral-900/40'
            }`}>
              <table className="w-full text-left font-mono text-[10px] leading-normal border-collapse min-w-[650px]">
                <thead>
                  <tr className={`uppercase tracking-wider border-b text-[8px] ${
                    activeTheme.startsWith('light-') 
                      ? 'bg-slate-200/60 text-slate-700 border-slate-300' 
                      : 'bg-neutral-950/20 text-neutral-400 border-neutral-900'
                  }`}>
                    <th className="py-2.5 px-3 font-semibold text-left whitespace-nowrap">Session Start</th>
                    <th className="py-2.5 px-3 font-semibold text-left whitespace-nowrap">Session End</th>
                    <th className="py-2.5 px-3 font-semibold text-left whitespace-nowrap">Browser</th>
                    <th className="py-2.5 px-3 font-semibold text-left whitespace-nowrap">Device</th>
                    <th className="py-2.5 px-3 font-semibold text-left whitespace-nowrap">Operating System</th>
                    <th 
                      className={`py-2.5 px-3 font-bold text-left whitespace-nowrap cursor-pointer transition-colors select-none ${
                        activeTheme.startsWith('light-')
                          ? 'text-slate-800 hover:text-slate-950'
                          : 'text-neutral-300 hover:text-white'
                      }`}
                      onClick={() => setIsDurationHHMMSS(!isDurationHHMMSS)}
                      title="Click to toggle duration format"
                    >
                      Duration
                    </th>
                    <th className="py-2.5 px-3 font-semibold text-left whitespace-nowrap">Status</th>
                    {onTerminateSession && <th className="py-2.5 px-3 font-semibold text-left whitespace-nowrap">Actions</th>}
                  </tr>
                </thead>
                <tbody className={`divide-y ${
                  activeTheme.startsWith('light-')
                    ? 'divide-slate-200 text-slate-800'
                    : 'divide-neutral-900/40 text-neutral-300'
                }`}>
                  {pageSessions.map((session: any) => (
                    <tr key={session.sessionId} className={`transition-colors ${
                      activeTheme.startsWith('light-')
                        ? 'hover:bg-slate-200/50'
                        : 'hover:bg-neutral-900/10'
                    }`}>
                      <td className="py-2.5 px-3 text-left whitespace-nowrap">
                        {formatToIndianDateTime(session.startedAt)}
                      </td>
                      <td className={`py-2.5 px-3 text-left whitespace-nowrap ${
                        activeTheme.startsWith('light-') ? 'text-slate-500' : 'text-neutral-500'
                      }`}>
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
                            ? activeTheme.startsWith('light-')
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : session.status === 'Logged Out'
                            ? activeTheme.startsWith('light-')
                              ? 'bg-slate-200 text-slate-700 border-slate-300'
                              : 'bg-neutral-900 text-neutral-400 border-neutral-800'
                            : activeTheme.startsWith('light-')
                              ? 'bg-rose-100 text-rose-800 border-rose-300'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}>
                          {session.status}
                        </span>
                      </td>
                      {onTerminateSession && (
                        <td className="py-2.5 px-3 text-left whitespace-nowrap">
                          {session.sessionId === currentSessionId ? (
                            <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                              activeTheme.startsWith('light-')
                                ? 'bg-emerald-100 text-emerald-900 border-emerald-400 font-black'
                                : 'text-emerald-400 bg-emerald-950/20 border-emerald-900/40'
                            }`}>
                              Current
                            </span>
                          ) : isRowActionRunning === session.sessionId ? (
                            <div className="flex items-center gap-1 text-[8px] font-mono text-neutral-400">
                              <span className="w-2.5 h-2.5 border border-neutral-400/30 border-t-neutral-400 rounded-full animate-spin"></span>
                              <span>{confirmingDeleteId === session.sessionId ? 'Deleting...' : 'Terminating...'}</span>
                            </div>
                          ) : confirmingTerminateId === session.sessionId ? (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setConfirmingTerminateId(null)}
                                className="text-neutral-400 hover:text-white cursor-pointer text-[8px] uppercase tracking-wider"
                              >
                                Cancel
                              </button>
                              <span className="text-neutral-600">|</span>
                              <button
                                type="button"
                                onClick={async () => {
                                  setIsRowActionRunning(session.sessionId);
                                  try {
                                    if (onTerminateSession) {
                                      await onTerminateSession(session.sessionId);
                                    }
                                  } catch (e) {
                                    console.error(e);
                                  } finally {
                                    setIsRowActionRunning(null);
                                    setConfirmingTerminateId(null);
                                  }
                                }}
                                className="text-red-500 hover:text-red-400 font-bold hover:underline cursor-pointer text-[8px] uppercase tracking-wider"
                              >
                                Terminate
                              </button>
                            </div>
                          ) : confirmingDeleteId === session.sessionId ? (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setConfirmingDeleteId(null)}
                                className="text-neutral-400 hover:text-white cursor-pointer text-[8px] uppercase tracking-wider"
                              >
                                Cancel
                              </button>
                              <span className="text-neutral-600">|</span>
                              <button
                                type="button"
                                onClick={async () => {
                                  setIsRowActionRunning(session.sessionId);
                                  try {
                                    if (onDeleteSession) {
                                      await onDeleteSession(session.sessionId);
                                    }
                                  } catch (e) {
                                    console.error(e);
                                  } finally {
                                    setIsRowActionRunning(null);
                                    setConfirmingDeleteId(null);
                                  }
                                }}
                                className="text-orange-500 hover:text-orange-400 font-bold hover:underline cursor-pointer text-[8px] uppercase tracking-wider"
                              >
                                Delete
                              </button>
                            </div>
                          ) : session.status === 'Active' ? (
                            <button
                              type="button"
                              disabled={isRowActionRunning !== null || isBulkRunning}
                              onClick={() => {
                                  setConfirmingTerminateId(session.sessionId);
                                  setConfirmingDeleteId(null);
                              }}
                              className="text-red-500 hover:text-red-400 font-bold hover:underline cursor-pointer text-[8px] uppercase tracking-wider disabled:opacity-40 disabled:hover:no-underline"
                            >
                              Terminate
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={isRowActionRunning !== null || isBulkRunning}
                              onClick={() => {
                                  setConfirmingDeleteId(session.sessionId);
                                  setConfirmingTerminateId(null);
                              }}
                              className="text-orange-500 hover:text-orange-400 font-bold hover:underline cursor-pointer text-[8px] uppercase tracking-wider disabled:opacity-40 disabled:hover:no-underline"
                            >
                              Delete
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {maxPage > 1 && (
              <div className="flex items-center justify-between pt-2 font-sans text-xs">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white disabled:opacity-40 disabled:hover:text-neutral-300 transition-colors cursor-pointer"
                >
                  Previous
                </button>
                <span className="text-neutral-500 font-mono text-[10px]">
                  Page {currentPage} of {maxPage}
                </span>
                <button
                  type="button"
                  disabled={currentPage === maxPage}
                  onClick={() => setPage((p) => Math.min(maxPage, p + 1))}
                  className="px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white disabled:opacity-40 disabled:hover:text-neutral-300 transition-colors cursor-pointer"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        ) : (
          <p className="text-[10px] text-neutral-500 italic text-center py-8">No sessions found matching filters.</p>
        )}
      </div>

      <ConfirmationModal
        isOpen={modalOpen}
        title={modalType === 'terminate_others' ? 'Terminate Other Active Sessions' : 'Delete All Inactive Sessions'}
        message={modalType === 'terminate_others' 
          ? 'Are you sure you want to terminate all other active sessions? This will force-logout all other devices currently connected to your account.'
          : 'Are you sure you want to delete all terminated, expired, or logged-out session records? This action cannot be undone and will permanently purge inactive logs.'}
        confirmLabel={modalType === 'terminate_others' ? 'Confirm Termination' : 'Confirm Deletion'}
        cancelLabel="Cancel"
        onConfirm={async () => {
          setIsBulkRunning(true);
          try {
            if (modalType === 'terminate_others') {
              if (onTerminateOtherSessions) {
                await onTerminateOtherSessions();
              }
            } else {
              if (onDeleteInactiveSessions) {
                await onDeleteInactiveSessions();
              }
            }
          } catch (e) {
            console.error(e);
          } finally {
            setIsBulkRunning(false);
            setModalOpen(false);
            setModalType(null);
          }
        }}
        onCancel={() => {
          setModalOpen(false);
          setModalType(null);
        }}
        isLoading={isBulkRunning}
        activeTheme={activeTheme}
        critical={modalType === 'terminate_others'}
      />
    </div>
  );
};
