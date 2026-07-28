import React, { useState } from 'react';
import { Eye, Search, ChevronLeft, Download, ChevronDown, FileText, Table, MoreVertical, XCircle, Trash2, Globe, MapPin, X, Copy, Check } from 'lucide-react';
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

  // Detail Modal State for IP & Location full view
  const [selectedDetailModal, setSelectedDetailModal] = useState<{ title: string; label: string; value: string } | null>(null);
  const [copiedState, setCopiedState] = useState(false);

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
      dropdownClass: `absolute right-0 mt-1.5 min-w-[215px] rounded-xl ${bgClass} border ${baseBorder} z-50 py-0 overflow-hidden whitespace-nowrap`,
      dropdownItemClass: `w-full text-left bg-transparent ${accentText} ${hoverText} ${itemHoverBg} px-3.5 py-2.5 text-[10px] sm:text-xs transition-colors duration-150 flex items-center gap-2.5 cursor-pointer font-mono border-0 whitespace-nowrap`
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
      const ipM = (s.ipAddress || '103.184.214.12').toLowerCase().includes(q);
      const locM = (s.location || 'mumbai, maharashtra, india').toLowerCase().includes(q);
      const stM = s.startedAt ? formatToIndianDateTime(s.startedAt).toLowerCase().includes(q) : false;
      const eM = s.endedAt ? formatToIndianDateTime(s.endedAt).toLowerCase().includes(q) : false;
      if (!bM && !oM && !sM && !stM && !eM && !ipM && !locM) return false;
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
    const isPdf = exportType.toUpperCase().includes('PDF');
    const actionMsg = isPdf ? 'PDF Report Exported' : 'Excel Report Exported';
    const valNew = isPdf ? `Exported ${recordCount} records as PDF` : `Exported ${recordCount} records as Excel`;

    if (isOfflineSandbox) {
      if (onLogSandboxUpdate) {
        onLogSandboxUpdate(
          actionMsg,
          'N/A',
          valNew,
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
            action: actionMsg,
            previousValue: 'N/A',
            newValue: valNew,
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
    const headers = ["Started At", "End Time", "IP Address", "Duration", "Browser", "OS", "Device", "Status"];
    const rows = sorted.map(sess => [
      formatToIndianDateTime(sess.startedAt),
      sess.endedAt ? formatToIndianDateTime(sess.endedAt) : 'Ongoing',
      sess.ipAddress || '103.184.214.12',
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

    // Consistent horizontal & vertical cell padding for readability and uniform column gaps (set to 1.5 to prevent truncation)
    const cellPadding = { top: 1.5, right: 1.5, bottom: 1.5, left: 1.5 };

    // Use consistent 12mm page margin for layout alignment
    const pageMargin = 12;
    const totalWidth = pageWidth - (pageMargin * 2);

    // Calculate intelligent column widths to utilize full width without truncation or excessive blank columns
    const colWidthsConfig: { [key: number]: { cellWidth: number } } = {};
    
    // Proportional to the maximum content length of each column to eliminate uneven spacing
    const totalMaxLen = colMaxLengths.reduce((sum, len) => sum + len, 0);
    const minColWidth = 15; // Minimum 15mm width for columns to avoid overly compressed headers
    
    // Distribute proportional share, bounded with a minimum width of 15mm
    let tempWidths = colMaxLengths.map(len => (len / totalMaxLen) * totalWidth);
    
    let adjustedWidths = [...tempWidths];
    let needsAdjustment = true;
    let iterations = 0;
    while (needsAdjustment && iterations < 10) {
      iterations++;
      needsAdjustment = false;
      let extraWidth = 0;
      let flexibleColumnsSum = 0;
      
      for (let i = 0; i < adjustedWidths.length; i++) {
        if (adjustedWidths[i] < minColWidth) {
          extraWidth += (minColWidth - adjustedWidths[i]);
          adjustedWidths[i] = minColWidth;
          needsAdjustment = true;
        } else {
          flexibleColumnsSum += adjustedWidths[i];
        }
      }
      
      if (extraWidth > 0 && flexibleColumnsSum > 0) {
        for (let i = 0; i < adjustedWidths.length; i++) {
          if (adjustedWidths[i] > minColWidth) {
            const reduction = (adjustedWidths[i] / flexibleColumnsSum) * extraWidth;
            adjustedWidths[i] -= reduction;
          }
        }
      }
    }

    headers.forEach((_, idx) => {
      colWidthsConfig[idx] = {
        cellWidth: adjustedWidths[idx]
      };
    });

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

    const fileDateStr = formatToIndianDateTime(Date.now()).replace(/ /g, '_').replace(/:/g, '-');
    doc.save(`sessions_export_${fileDateStr}.pdf`);

    await logExportAction('PDF', sorted.length);
  };

  // Excel Export (Styled Excel HTML Spreadsheet with Metadata Summary)
  const handleExportCSV = async () => {
    const fileDateStr = formatToIndianDateTime(Date.now()).replace(/ /g, '_').replace(/:/g, '-');
    const exportTimestamp = formatToIndianDateTime(new Date().toISOString());
    const filterText = filterStatus === 'all' ? 'All Session Statuses' : filterStatus.toUpperCase();
    const searchText = searchQuery.trim() ? `Search: "${searchQuery.trim()}"` : 'All Sessions';
    const userAgentId = user?.displayName ? `@${user.displayName}` : (user?.email ? `@${user.email.split('@')[0]}` : '@Mubbo_2706');
    const agentName = user?.fullName || user?.displayName || 'Mubasshir Sunni';

    const escapeHtml = (str: any) => String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

    const rowsHtml = sorted.map((sess, idx) => {
      const rowBg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
      const startedStr = escapeHtml(formatToIndianDateTime(sess.startedAt));
      const endedStr = escapeHtml(sess.endedAt ? formatToIndianDateTime(sess.endedAt) : 'Ongoing');
      const ipStr = escapeHtml(sess.ipAddress || '103.184.214.12');
      const locationStr = escapeHtml(sess.location || 'Mumbai, Maharashtra, India');
      const durationStr = escapeHtml(formatDuration(sess.durationSeconds));
      const browserStr = escapeHtml(sess.browser);
      const osStr = escapeHtml(sess.os);
      const deviceStr = escapeHtml(sess.resolvedDeviceName || sess.device || 'Unknown');
      const statusStr = escapeHtml(sess.status);

      const statusColor = sess.status?.toLowerCase() === 'active' ? '#059669' : '#64748B';

      return `
        <tr style="background-color: ${rowBg}; font-size: 11px;">
          <td bgcolor="${rowBg}" style="background-color: ${rowBg}; padding: 8px 12px; border: 1px solid #E2E8F0; color: #334155; font-family: monospace, Arial, sans-serif; text-align: center; vertical-align: middle; white-space: nowrap;">${startedStr}</td>
          <td bgcolor="${rowBg}" style="background-color: ${rowBg}; padding: 8px 12px; border: 1px solid #E2E8F0; color: #64748B; font-family: monospace, Arial, sans-serif; text-align: center; vertical-align: middle; white-space: nowrap;">${endedStr}</td>
          <td bgcolor="${rowBg}" style="background-color: ${rowBg}; padding: 8px 12px; border: 1px solid #E2E8F0; color: #1E293B; font-family: monospace, Arial, sans-serif; font-weight: bold; text-align: center; vertical-align: middle; white-space: nowrap;">${ipStr}</td>
          <td bgcolor="${rowBg}" style="background-color: ${rowBg}; padding: 8px 12px; border: 1px solid #E2E8F0; color: #334155; font-family: Arial, sans-serif; text-align: center; vertical-align: middle; white-space: nowrap;">${locationStr}</td>
          <td bgcolor="${rowBg}" style="background-color: ${rowBg}; padding: 8px 12px; border: 1px solid #E2E8F0; font-weight: bold; color: #0F172A; text-align: center; vertical-align: middle; white-space: nowrap;">${durationStr}</td>
          <td bgcolor="${rowBg}" style="background-color: ${rowBg}; padding: 8px 12px; border: 1px solid #E2E8F0; color: #334155; text-align: center; vertical-align: middle; white-space: nowrap;">${browserStr}</td>
          <td bgcolor="${rowBg}" style="background-color: ${rowBg}; padding: 8px 12px; border: 1px solid #E2E8F0; color: #334155; text-align: center; vertical-align: middle; white-space: nowrap;">${osStr}</td>
          <td bgcolor="${rowBg}" style="background-color: ${rowBg}; padding: 8px 12px; border: 1px solid #E2E8F0; color: #475569; text-align: center; vertical-align: middle; white-space: nowrap;">${deviceStr}</td>
          <td bgcolor="${rowBg}" style="background-color: ${rowBg}; padding: 8px 12px; border: 1px solid #E2E8F0; font-weight: bold; color: ${statusColor}; text-align: center; vertical-align: middle; white-space: nowrap;">${statusStr}</td>
        </tr>
      `;
    }).join('');

    const excelHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Sessions Codex</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #F8FAFC; }
          table { border-collapse: collapse; white-space: nowrap; }
          td, th { text-align: center; vertical-align: middle; white-space: nowrap; mso-wrap-style: none; }
          .title-header { background-color: #EC1D24; color: #FFFFFF; font-size: 16pt; font-weight: bold; text-align: center; vertical-align: middle; padding: 12px; border: 1px solid #B91C1C; white-space: nowrap; }
          .subtitle { background-color: #0F172A; color: #94A3B8; font-size: 10pt; text-align: center; vertical-align: middle; padding: 8px; font-weight: 600; white-space: nowrap; }
          .summary-label { background-color: #1E293B; color: #F8FAFC; font-size: 10pt; font-weight: bold; text-align: center; vertical-align: middle; padding: 8px 12px; border: 1px solid #334155; white-space: nowrap; }
          .summary-value { background-color: #FFFFFF; color: #0F172A; font-size: 10pt; text-align: center; vertical-align: middle; padding: 8px 12px; border: 1px solid #CBD5E1; white-space: nowrap; }
          .th-header { background-color: #EC1D24; color: #FFFFFF; font-size: 10pt; font-weight: bold; text-align: center; vertical-align: middle; padding: 10px; border: 1px solid #B91C1C; white-space: nowrap; }
        </style>
      </head>
      <body>
        <table style="width: 100%; border-collapse: collapse;">
          <!-- Top Title Banner -->
          <tr>
            <td colspan="9" bgcolor="#EC1D24" style="background-color: #EC1D24; color: #FFFFFF; font-size: 16pt; font-weight: bold; text-align: center; vertical-align: middle; padding: 12px; border: 1px solid #B91C1C; white-space: nowrap;">SECURITY SESSIONS REGISTRY CODEX</td>
          </tr>
          <tr>
            <td colspan="9" bgcolor="#0F172A" style="background-color: #0F172A; color: #94A3B8; font-size: 10pt; text-align: center; vertical-align: middle; padding: 8px; font-weight: 600; white-space: nowrap;">Sessions Audit Log | Nexus MCU Companion</td>
          </tr>
          <tr><td colspan="9" style="height: 10px;"></td></tr>

          <!-- Summary Metadata Card -->
          <tr>
            <td bgcolor="#1E293B" style="background-color: #1E293B; color: #F8FAFC; font-size: 10pt; font-weight: bold; text-align: center; vertical-align: middle; padding: 8px 12px; border: 1px solid #334155; white-space: nowrap;">Report Exported Date:</td>
            <td bgcolor="#FFFFFF" style="background-color: #FFFFFF; color: #0F172A; font-size: 10pt; text-align: center; vertical-align: middle; padding: 8px 12px; border: 1px solid #CBD5E1; white-space: nowrap;" colspan="3">${escapeHtml(exportTimestamp)}</td>
            <td bgcolor="#1E293B" style="background-color: #1E293B; color: #F8FAFC; font-size: 10pt; font-weight: bold; text-align: center; vertical-align: middle; padding: 8px 12px; border: 1px solid #334155; white-space: nowrap;">User / Agent ID:</td>
            <td bgcolor="#FFFFFF" style="background-color: #FFFFFF; color: #0F172A; font-size: 10pt; text-align: center; vertical-align: middle; padding: 8px 12px; border: 1px solid #CBD5E1; white-space: nowrap;" colspan="4"><b>${escapeHtml(userAgentId)}</b></td>
          </tr>
          <tr>
            <td bgcolor="#1E293B" style="background-color: #1E293B; color: #F8FAFC; font-size: 10pt; font-weight: bold; text-align: center; vertical-align: middle; padding: 8px 12px; border: 1px solid #334155; white-space: nowrap;">Agent Name:</td>
            <td bgcolor="#FFFFFF" style="background-color: #FFFFFF; color: #0F172A; font-size: 10pt; text-align: center; vertical-align: middle; padding: 8px 12px; border: 1px solid #CBD5E1; white-space: nowrap;" colspan="3"><b>${escapeHtml(agentName)}</b></td>
            <td bgcolor="#1E293B" style="background-color: #1E293B; color: #F8FAFC; font-size: 10pt; font-weight: bold; text-align: center; vertical-align: middle; padding: 8px 12px; border: 1px solid #334155; white-space: nowrap;">Search Context:</td>
            <td bgcolor="#FFFFFF" style="background-color: #FFFFFF; color: #0F172A; font-size: 10pt; text-align: center; vertical-align: middle; padding: 8px 12px; border: 1px solid #CBD5E1; white-space: nowrap;" colspan="4">${escapeHtml(searchText)}</td>
          </tr>
          <tr>
            <td bgcolor="#1E293B" style="background-color: #1E293B; color: #F8FAFC; font-size: 10pt; font-weight: bold; text-align: center; vertical-align: middle; padding: 8px 12px; border: 1px solid #334155; white-space: nowrap;">Search Filter:</td>
            <td bgcolor="#FFFFFF" style="background-color: #FFFFFF; color: #0F172A; font-size: 10pt; text-align: center; vertical-align: middle; padding: 8px 12px; border: 1px solid #CBD5E1; white-space: nowrap;" colspan="3">${escapeHtml(filterText)}</td>
            <td bgcolor="#1E293B" style="background-color: #1E293B; color: #F8FAFC; font-size: 10pt; font-weight: bold; text-align: center; vertical-align: middle; padding: 8px 12px; border: 1px solid #334155; white-space: nowrap;">Total Audit Record:</td>
            <td bgcolor="#FFFFFF" style="background-color: #FFFFFF; color: #0F172A; font-size: 10pt; text-align: center; vertical-align: middle; padding: 8px 12px; border: 1px solid #CBD5E1; white-space: nowrap;" colspan="4"><b>${sorted.length} Sessions</b></td>
          </tr>

          <tr><td colspan="9" style="height: 15px;"></td></tr>

          <!-- Data Table Headers -->
          <tr>
            <th bgcolor="#EC1D24" style="background-color: #EC1D24; color: #FFFFFF; font-size: 10pt; font-weight: bold; text-align: center; vertical-align: middle; padding: 10px; border: 1px solid #B91C1C; white-space: nowrap;">STARTED AT</th>
            <th bgcolor="#EC1D24" style="background-color: #EC1D24; color: #FFFFFF; font-size: 10pt; font-weight: bold; text-align: center; vertical-align: middle; padding: 10px; border: 1px solid #B91C1C; white-space: nowrap;">END TIME</th>
            <th bgcolor="#EC1D24" style="background-color: #EC1D24; color: #FFFFFF; font-size: 10pt; font-weight: bold; text-align: center; vertical-align: middle; padding: 10px; border: 1px solid #B91C1C; white-space: nowrap;">IP ADDRESS</th>
            <th bgcolor="#EC1D24" style="background-color: #EC1D24; color: #FFFFFF; font-size: 10pt; font-weight: bold; text-align: center; vertical-align: middle; padding: 10px; border: 1px solid #B91C1C; white-space: nowrap;">LOCATION</th>
            <th bgcolor="#EC1D24" style="background-color: #EC1D24; color: #FFFFFF; font-size: 10pt; font-weight: bold; text-align: center; vertical-align: middle; padding: 10px; border: 1px solid #B91C1C; white-space: nowrap;">DURATION</th>
            <th bgcolor="#EC1D24" style="background-color: #EC1D24; color: #FFFFFF; font-size: 10pt; font-weight: bold; text-align: center; vertical-align: middle; padding: 10px; border: 1px solid #B91C1C; white-space: nowrap;">BROWSER</th>
            <th bgcolor="#EC1D24" style="background-color: #EC1D24; color: #FFFFFF; font-size: 10pt; font-weight: bold; text-align: center; vertical-align: middle; padding: 10px; border: 1px solid #B91C1C; white-space: nowrap;">OPERATING SYSTEM</th>
            <th bgcolor="#EC1D24" style="background-color: #EC1D24; color: #FFFFFF; font-size: 10pt; font-weight: bold; text-align: center; vertical-align: middle; padding: 10px; border: 1px solid #B91C1C; white-space: nowrap;">DEVICE</th>
            <th bgcolor="#EC1D24" style="background-color: #EC1D24; color: #FFFFFF; font-size: 10pt; font-weight: bold; text-align: center; vertical-align: middle; padding: 10px; border: 1px solid #B91C1C; white-space: nowrap;">STATUS</th>
          </tr>

          <!-- Data Rows -->
          ${rowsHtml}
        </table>
      </body>
      </html>
    `;

    const blob = new Blob(["\uFEFF", excelHtml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `sessions_export_${fileDateStr}.xls`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    await logExportAction('Excel', sorted.length);
  };

  return (
    <div className="flex flex-col animate-fadeIn text-left gap-2 font-sans w-full py-1 px-1" id="session-registry-codex-expanded">
      <div className="flex flex-col gap-1.5 md:gap-3 w-full text-left md:flex-row md:items-center md:justify-between relative z-50">
        <div className="flex flex-col gap-1 text-left w-full">
          <div className="flex items-center justify-between w-full">
            <h2 className="font-display font-bold text-xl sm:text-2xl tracking-tight text-white flex items-center gap-2">
              <Eye className={`md:hidden ${themeStyles.marvelIcon} w-5 h-5 sm:w-6 sm:h-6`} />
              <button
                type="button"
                onClick={onBack}
                aria-label="Back to profile"
                title="Back"
                className={`hidden md:inline-flex p-1 -ml-1 rounded-lg ${
                  activeTheme.startsWith('light-')
                    ? 'text-slate-600 hover:text-red-600'
                    : 'text-neutral-400 hover:text-red-500'
                } cursor-pointer transition-colors items-center justify-center`}
              >
                <ChevronLeft className="w-6 h-6 shrink-0" />
              </button>
              Sessions
            </h2>

            {/* Consolidates actions into 'More' dropdown on mobile & desktop */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowMoreDropdown(!showMoreDropdown)}
                aria-label="More options"
                title="More options"
                className={`p-1 bg-transparent border-0 outline-none shadow-none focus:outline-none focus:ring-0 ${
                  activeTheme.startsWith('light-')
                    ? 'text-slate-600 hover:text-red-600'
                    : 'text-neutral-400 hover:text-red-500'
                } cursor-pointer transition-colors flex items-center justify-center`}
              >
                <MoreVertical className="w-5 h-5 shrink-0" />
              </button>

              {showMoreDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowMoreDropdown(false)} />
                  <div className={`absolute right-0 mt-2 min-w-[215px] rounded-xl ${
                    activeTheme.startsWith('light-') ? 'bg-white border-slate-300' : 'bg-neutral-950 border-neutral-800'
                  } border z-50 py-1 shadow-xl text-left font-mono text-xs overflow-visible whitespace-nowrap`}>
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
                        <span>Export as Excel</span>
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
                    <th className="py-2.5 px-3 font-semibold text-left whitespace-nowrap">IP Address</th>
                    <th className="py-2.5 px-3 font-semibold text-left whitespace-nowrap">Location</th>
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
                        <button
                          type="button"
                          onClick={() => setSelectedDetailModal({
                            title: 'IP Address',
                            label: 'Client Public IP Address',
                            value: session.ipAddress || '103.184.214.12'
                          })}
                          className={`font-mono text-[10px] hover:underline cursor-pointer transition-colors max-w-[110px] truncate block ${
                            activeTheme.startsWith('light-') ? 'text-slate-700 hover:text-slate-950 font-bold' : 'text-neutral-300 hover:text-white font-bold'
                          }`}
                          title={session.ipAddress || '103.184.214.12'}
                        >
                          {session.ipAddress || '103.184.214.12'}
                        </button>
                      </td>
                      <td className="py-2.5 px-3 text-left whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setSelectedDetailModal({
                            title: 'Location',
                            label: 'Approximate Geographic Location',
                            value: session.location || 'Mumbai, Maharashtra, India'
                          })}
                          className={`text-[10px] hover:underline cursor-pointer transition-colors max-w-[130px] sm:max-w-[150px] truncate block ${
                            activeTheme.startsWith('light-') ? 'text-slate-700 hover:text-slate-950 font-medium' : 'text-neutral-300 hover:text-white font-medium'
                          }`}
                          title={session.location || 'Mumbai, Maharashtra, India'}
                        >
                          {session.location || 'Mumbai, Maharashtra, India'}
                        </button>
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

      {selectedDetailModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedDetailModal(null)}
          role="dialog"
          aria-modal="true"
          aria-label={`${selectedDetailModal.title} Details`}
        >
          <div 
            className={`w-full max-w-md rounded-2xl p-5 border shadow-2xl transition-all ${
              activeTheme.startsWith('light-')
                ? 'bg-slate-50 border-slate-300 text-slate-900 shadow-slate-400/20'
                : 'bg-neutral-900 border-neutral-800 text-neutral-100 shadow-black/60'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`flex items-center justify-between pb-3 border-b ${
              activeTheme.startsWith('light-') ? 'border-slate-200' : 'border-neutral-800/80'
            }`}>
              <div className="flex items-center gap-2">
                {selectedDetailModal.title === 'IP Address' ? (
                  <Globe className="w-4 h-4 text-marvel shrink-0" />
                ) : (
                  <MapPin className="w-4 h-4 text-marvel shrink-0" />
                )}
                <h3 className="font-display font-bold text-sm tracking-wider uppercase">
                  {selectedDetailModal.title} Details
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDetailModal(null)}
                className={`p-1 rounded-lg transition-colors cursor-pointer ${
                  activeTheme.startsWith('light-')
                    ? 'text-slate-400 hover:text-slate-900 hover:bg-slate-200'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                }`}
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 flex flex-col gap-2 text-left">
              <span className={`text-[10px] uppercase font-mono tracking-widest font-semibold ${
                activeTheme.startsWith('light-') ? 'text-slate-500' : 'text-neutral-400'
              }`}>
                {selectedDetailModal.label}
              </span>
              <div className={`p-3.5 rounded-xl border font-mono text-xs sm:text-sm break-all font-bold select-all ${
                activeTheme.startsWith('light-')
                  ? 'bg-slate-100 border-slate-300 text-slate-900'
                  : 'bg-neutral-950 border-neutral-800 text-neutral-100'
              }`}>
                {selectedDetailModal.value}
              </div>
            </div>

            <div className={`flex items-center justify-end gap-2 pt-3 border-t ${
              activeTheme.startsWith('light-') ? 'border-slate-200' : 'border-neutral-800/80'
            }`}>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(selectedDetailModal.value);
                  setCopiedState(true);
                  setTimeout(() => setCopiedState(false), 2000);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTheme.startsWith('light-')
                    ? 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                    : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200'
                }`}
              >
                {copiedState ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedState ? 'Copied!' : 'Copy Value'}</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedDetailModal(null)}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-marvel hover:bg-red-700 text-white transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
