import React, { useState } from 'react';
import { Database, Search, ChevronLeft, Eye, Cpu, Download, ChevronDown, FileText, Table } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CustomDropdown } from '../CustomDropdown';
import { CustomDatePicker } from '../Common/CustomDatePicker';

export function renderLogValue(log: any, isNew: boolean, userId?: string) {
  const isPhotoUpdate = log.action === "Profile Photo Updated" || log.action?.toLowerCase().includes("profile photo") || log.action?.toLowerCase().includes("avatar");
  
  if (isPhotoUpdate) {
    let val = isNew ? log.newValue : log.previousValue;
    if (typeof val === 'string') {
      val = val.replace(/^(Old Value|New Value):\s*/i, '').replace(/\*\*|"/g, '').trim();
    }
    const displayVal = (val === undefined || val === null || val === "" || val === "N/A" || val === "Default") ? "No Avatar" : val;
    if (isNew) {
      return (
        <span className="text-emerald-400 font-semibold font-mono text-[10px] break-all">
          {displayVal}
        </span>
      );
    } else {
      return (
        <span className="text-neutral-500 font-mono text-[10px] break-all">
          {displayVal}
        </span>
      );
    }
  }



  let val = isNew ? log.newValue : log.previousValue;
  if (typeof val === 'string') {
    val = val.replace(/^(Old Value|New Value):\s*/i, '');
    if (val.trim() === '********' || val.trim() === '******') {
      val = '********';
    } else {
      val = val.replace(/\*\*|"/g, ''); // strip markdown asterisks or double quotes
    }
    val = val.trim();
  }
  const displayVal = (val === undefined || val === null || val === "" || val === "N/A" || val === "Default") ? "N/A" : val;

  if (isNew) {
    return (
      <span className="text-emerald-400 font-semibold font-mono text-[10px]">
        {displayVal}
      </span>
    );
  } else {
    return (
      <span className="text-neutral-400 font-mono text-[10px]">
        {displayVal}
      </span>
    );
  }
}


interface ShieldUpdatesLedgerProps {
  onBack: () => void;
  sandboxUpdates: any[];
  user: any;
  activeTheme: 'oled' | 'cosmic' | 'asgardian' | 'wakanda' | 'stark' | 'hydra';
  isOfflineSandbox: boolean;
  formatToIndianDateTime: (timestamp: number | string) => string;
  authToken?: string | null;
  onRefreshProfile?: () => Promise<void>;
  onLogSandboxUpdate?: (action: string, previousValue: string, newValue: string, source: string, metadata?: any) => void;
}

export const ShieldUpdatesLedger: React.FC<ShieldUpdatesLedgerProps> = ({
  onBack,
  sandboxUpdates,
  user,
  activeTheme,
  isOfflineSandbox,
  formatToIndianDateTime,
  authToken,
  onRefreshProfile,
  onLogSandboxUpdate,
}) => {
  // Local States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'action-asc' | 'action-desc'>('newest');
  const [timeRange, setTimeRange] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [showExportDropdown, setShowExportDropdown] = useState(false);

  // Archive Local States & In-Memory Cache
  const [archivedLogs, setArchivedLogs] = useState<any[]>([]);
  const [isLoadingArchive, setIsLoadingArchive] = useState(false);
  const [hasLoadedArchive, setHasLoadedArchive] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);

  const handleLoadArchive = async () => {
    if (!authToken || isOfflineSandbox || isLoadingArchive || hasLoadedArchive) return;
    setIsLoadingArchive(true);
    setArchiveError(null);
    try {
      const res = await fetch('/api/user/logs/archive', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });
      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }
      const data = await res.json();
      if (data.success) {
        const updates = data.updates || [];
        setArchivedLogs(updates);
        setHasLoadedArchive(true);
        setPage((prevPage) => prevPage + 1);

        // Save downloaded archive to browser cache
        try {
          const cacheKey = `shield_archive_${user?.username || 'unknown'}`;
          const currentTotal = typeof user?.totalLogCount === 'number' && user.totalLogCount > 0
            ? user.totalLogCount
            : (user?.updates?.length || 0) + (user?.updatesBuffer?.length || 0);
          localStorage.setItem(cacheKey, JSON.stringify({
            username: user?.username,
            totalLogCount: currentTotal,
            updates: updates
          }));
        } catch (cacheErr) {
          console.error('[Archive Local Cache] Error writing cache:', cacheErr);
        }
      } else {
        throw new Error(data.error || 'Failed to fetch archive');
      }
    } catch (err: any) {
      console.error('Failed to load archive logs:', err);
      setArchiveError(err.message || 'Error loading archive');
    } finally {
      setIsLoadingArchive(false);
    }
  };

  // Load archive from browser cache if valid on mount or profile update
  React.useEffect(() => {
    if (isOfflineSandbox || !user?.username) return;
    try {
      const cacheKey = `shield_archive_${user.username}`;
      const cachedData = localStorage.getItem(cacheKey);
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        const currentTotal = typeof user.totalLogCount === 'number' && user.totalLogCount > 0
          ? user.totalLogCount
          : (user.updates?.length || 0) + (user.updatesBuffer?.length || 0);
        if (parsed && parsed.username === user.username && parsed.totalLogCount === currentTotal && Array.isArray(parsed.updates)) {
          console.log(`[Archive Local Cache] Reusing valid cached archive of ${parsed.updates.length} logs for ${user.username}`);
          setArchivedLogs(parsed.updates);
          setHasLoadedArchive(true);
        }
      }
    } catch (err) {
      console.error("[Archive Local Cache] Error reading cache:", err);
    }
  }, [user, isOfflineSandbox]);

  // Plain Text Log Formatter for exports
  const formatPlainLogValue = (log: any, isNew: boolean) => {
    const isPhotoUpdate = log.action === "Profile Photo Updated" || log.action?.toLowerCase().includes("profile photo") || log.action?.toLowerCase().includes("avatar");
    if (isPhotoUpdate) {
      let val = isNew ? log.newValue : log.previousValue;
      if (typeof val === 'string') {
        val = val.replace(/^(Old Value|New Value):\s*/i, '').replace(/\*\*|"/g, '').trim();
      }
      return (val === undefined || val === null || val === "" || val === "N/A" || val === "Default") ? "No Avatar" : val;
    }
    


    let val = isNew ? log.newValue : log.previousValue;
    if (typeof val === 'string') {
      val = val.replace(/^(Old Value|New Value):\s*/i, '');
      if (val.trim() === '********' || val.trim() === '******') {
        val = '********';
      } else {
        val = val.replace(/\*\*|"/g, '');
      }
      val = val.trim();

      // Clean up garbled stars or raw star symbols for crystal-clear rating display in Excel
      val = val.replace(/â˜\.\.\.|â˜…/g, '★').replace(/â˜☆/g, '☆');
      if (val.includes('★') || val.includes('☆')) {
        const starCount = (val.match(/★/g) || []).length;
        if (starCount > 0) {
          val = val.replace(/★+[☆]*/g, `${starCount}/5 Stars (${'★'.repeat(starCount)}${'☆'.repeat(5 - starCount)})`);
        }
      }
    }
    return (val === undefined || val === null || val === "" || val === "N/A" || val === "Default") ? "N/A" : val;
  };

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
      dropdownClass: `absolute right-0 mt-1.5 min-w-[200px] rounded-xl ${bgClass} border ${baseBorder} z-50 py-0 overflow-hidden whitespace-nowrap`,
      dropdownItemClass: `w-full text-left bg-transparent ${accentText} ${hoverText} ${itemHoverBg} px-3.5 py-2.5 text-[10px] sm:text-xs transition-colors duration-150 flex items-center gap-2.5 cursor-pointer font-mono border-0 whitespace-nowrap`
    };
  };

  const exportStyles = getExportButtonStyles();

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
          'Updates',
          { exportType, sourcePage: 'Updates', timestamp, recordCount }
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
            source: 'Updates',
            metadata: { exportType, sourcePage: 'Updates', timestamp, recordCount }
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

  // Helper to strip/convert star characters to a clean, PDF-compatible standard string
  const cleanStarsForPdf = (str: string): string => {
    if (!str) return 'N/A';
    
    const filledStars = (str.match(/★/g) || []).length;
    const emptyStars = (str.match(/☆/g) || []).length;
    
    if (filledStars > 0 || emptyStars > 0) {
      const totalStars = filledStars + emptyStars;
      if (totalStars === 5) {
        const ratingStr = filledStars > 0 ? `${filledStars}/5 Stars` : 'No Rating';
        return str.replace(/[★☆]{5}/g, ratingStr);
      } else if (str.includes('★')) {
        return str.replace(/(\d+)★/g, '$1/5 Stars');
      }
    }
    return str;
  };

  // PDF Export
  const handleExportPDF = async () => {
    const headers = ["Timestamp", "Category", "Action", "Old Value", "New Value", "Action By"];
    const rows = sorted.map(log => [
      formatToIndianDateTime(log.timestamp),
      log.source || 'General',
      log.action,
      cleanStarsForPdf(formatPlainLogValue(log, false)),
      cleanStarsForPdf(formatPlainLogValue(log, true)),
      `@${log.userPerformed || 'sandbox_agent'}`
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
    const colWidthsConfig: { [key: number]: { cellWidth: number; halign?: 'left' | 'right' | 'center' } } = {};
    
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
        cellWidth: adjustedWidths[idx],
        halign: idx === (headers.length - 1) ? 'right' : 'left'
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
    doc.text("SECURE UPDATES LOG EXPORT", pageMargin, 20);
    
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text("Updates Activity Report", pageMargin, 26);

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
    const categoryFilter = filterCategory.toUpperCase();
    const rangeFilter = timeRange.toUpperCase();
    const activeFilters = `Search: ${searchFilter} | Category: ${categoryFilter} | Timeframe: ${rangeFilter}`;

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
    doc.save(`updates_export_${fileDateStr}.pdf`);

    await logExportAction('PDF', sorted.length);
  };

  // Excel Export (Styled Excel HTML Spreadsheet with Metadata Summary)
  const handleExportCSV = async () => {
    const fileDateStr = formatToIndianDateTime(Date.now()).replace(/ /g, '_').replace(/:/g, '-');
    const exportTimestamp = formatToIndianDateTime(new Date().toISOString());
    const filterText = filterCategory === 'all' ? 'All Categories' : filterCategory.toUpperCase();
    const searchText = searchQuery.trim() ? `Search: "${searchQuery.trim()}"` : 'All Logs';
    const userAgentId = user?.displayName ? `@${user.displayName}` : (user?.email ? `@${user.email.split('@')[0]}` : '@Mubbo_2706');
    const agentName = user?.fullName || user?.displayName || 'Mubasshir Sunni';

    const escapeHtml = (str: any) => String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

    const rowsHtml = sorted.map((log, idx) => {
      const rowBg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
      const timestampStr = escapeHtml(formatToIndianDateTime(log.timestamp));
      const sourceStr = escapeHtml(log.source || 'General');
      const actionStr = escapeHtml(log.action);
      const oldValStr = escapeHtml(formatPlainLogValue(log, false));
      const newValStr = escapeHtml(formatPlainLogValue(log, true));
      const userStr = escapeHtml(`@${log.userPerformed || 'sandbox_agent'}`);

      return `
        <tr style="background-color: ${rowBg}; font-size: 11px;">
          <td bgcolor="${rowBg}" style="background-color: ${rowBg}; padding: 8px 12px; border: 1px solid #E2E8F0; color: #334155; font-family: monospace, Arial, sans-serif; text-align: center; vertical-align: middle; white-space: nowrap;">${timestampStr}</td>
          <td bgcolor="${rowBg}" style="background-color: ${rowBg}; padding: 8px 12px; border: 1px solid #E2E8F0; font-weight: bold; color: #475569; font-family: Arial, sans-serif; text-align: center; vertical-align: middle; white-space: nowrap;">${sourceStr}</td>
          <td bgcolor="${rowBg}" style="background-color: ${rowBg}; padding: 8px 12px; border: 1px solid #E2E8F0; font-weight: bold; color: #0F172A; font-family: Arial, sans-serif; text-align: center; vertical-align: middle; white-space: nowrap;">${actionStr}</td>
          <td bgcolor="${rowBg}" style="background-color: ${rowBg}; padding: 8px 12px; border: 1px solid #E2E8F0; color: #64748B; font-family: Arial, sans-serif; text-align: center; vertical-align: middle; white-space: nowrap;">${oldValStr}</td>
          <td bgcolor="${rowBg}" style="background-color: ${rowBg}; padding: 8px 12px; border: 1px solid #E2E8F0; color: #059669; font-weight: 600; font-family: Arial, sans-serif; text-align: center; vertical-align: middle; white-space: nowrap;">${newValStr}</td>
          <td bgcolor="${rowBg}" style="background-color: ${rowBg}; padding: 8px 12px; border: 1px solid #E2E8F0; color: #DC2626; font-weight: bold; font-family: Arial, sans-serif; text-align: center; vertical-align: middle; white-space: nowrap;">${userStr}</td>
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
                <x:Name>Updates Ledger</x:Name>
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
            <td colspan="6" bgcolor="#EC1D24" style="background-color: #EC1D24; color: #FFFFFF; font-size: 16pt; font-weight: bold; text-align: center; vertical-align: middle; padding: 12px; border: 1px solid #B91C1C; white-space: nowrap;">SECURITY UPDATES LEDGER REPORT</td>
          </tr>
          <tr>
            <td colspan="6" bgcolor="#0F172A" style="background-color: #0F172A; color: #94A3B8; font-size: 10pt; text-align: center; vertical-align: middle; padding: 8px; font-weight: 600; white-space: nowrap;">Security Audit Report | Nexus MCU Companion</td>
          </tr>
          <tr><td colspan="6" style="height: 10px;"></td></tr>

          <!-- Summary Metadata Card -->
          <tr>
            <td bgcolor="#1E293B" style="background-color: #1E293B; color: #F8FAFC; font-size: 10pt; font-weight: bold; text-align: center; vertical-align: middle; padding: 8px 12px; border: 1px solid #334155; white-space: nowrap;">Report Exported Date:</td>
            <td bgcolor="#FFFFFF" style="background-color: #FFFFFF; color: #0F172A; font-size: 10pt; text-align: center; vertical-align: middle; padding: 8px 12px; border: 1px solid #CBD5E1; white-space: nowrap;" colspan="2">${escapeHtml(exportTimestamp)}</td>
            <td bgcolor="#1E293B" style="background-color: #1E293B; color: #F8FAFC; font-size: 10pt; font-weight: bold; text-align: center; vertical-align: middle; padding: 8px 12px; border: 1px solid #334155; white-space: nowrap;">User / Agent ID:</td>
            <td bgcolor="#FFFFFF" style="background-color: #FFFFFF; color: #0F172A; font-size: 10pt; text-align: center; vertical-align: middle; padding: 8px 12px; border: 1px solid #CBD5E1; white-space: nowrap;" colspan="2"><b>${escapeHtml(userAgentId)}</b></td>
          </tr>
          <tr>
            <td bgcolor="#1E293B" style="background-color: #1E293B; color: #F8FAFC; font-size: 10pt; font-weight: bold; text-align: center; vertical-align: middle; padding: 8px 12px; border: 1px solid #334155; white-space: nowrap;">Agent Name:</td>
            <td bgcolor="#FFFFFF" style="background-color: #FFFFFF; color: #0F172A; font-size: 10pt; text-align: center; vertical-align: middle; padding: 8px 12px; border: 1px solid #CBD5E1; white-space: nowrap;" colspan="2"><b>${escapeHtml(agentName)}</b></td>
            <td bgcolor="#1E293B" style="background-color: #1E293B; color: #F8FAFC; font-size: 10pt; font-weight: bold; text-align: center; vertical-align: middle; padding: 8px 12px; border: 1px solid #334155; white-space: nowrap;">Search Context:</td>
            <td bgcolor="#FFFFFF" style="background-color: #FFFFFF; color: #0F172A; font-size: 10pt; text-align: center; vertical-align: middle; padding: 8px 12px; border: 1px solid #CBD5E1; white-space: nowrap;" colspan="2">${escapeHtml(searchText)}</td>
          </tr>
          <tr>
            <td bgcolor="#1E293B" style="background-color: #1E293B; color: #F8FAFC; font-size: 10pt; font-weight: bold; text-align: center; vertical-align: middle; padding: 8px 12px; border: 1px solid #334155; white-space: nowrap;">Search Filter:</td>
            <td bgcolor="#FFFFFF" style="background-color: #FFFFFF; color: #0F172A; font-size: 10pt; text-align: center; vertical-align: middle; padding: 8px 12px; border: 1px solid #CBD5E1; white-space: nowrap;" colspan="2">${escapeHtml(filterText)}</td>
            <td bgcolor="#1E293B" style="background-color: #1E293B; color: #F8FAFC; font-size: 10pt; font-weight: bold; text-align: center; vertical-align: middle; padding: 8px 12px; border: 1px solid #334155; white-space: nowrap;">Total Audit Record:</td>
            <td bgcolor="#FFFFFF" style="background-color: #FFFFFF; color: #0F172A; font-size: 10pt; text-align: center; vertical-align: middle; padding: 8px 12px; border: 1px solid #CBD5E1; white-space: nowrap;" colspan="2"><b>${sorted.length} Entries</b></td>
          </tr>

          <tr><td colspan="6" style="height: 15px;"></td></tr>

          <!-- Data Table Headers -->
          <tr>
            <th bgcolor="#EC1D24" style="background-color: #EC1D24; color: #FFFFFF; font-size: 10pt; font-weight: bold; text-align: center; vertical-align: middle; padding: 10px; border: 1px solid #B91C1C; white-space: nowrap;">TIMESTAMP</th>
            <th bgcolor="#EC1D24" style="background-color: #EC1D24; color: #FFFFFF; font-size: 10pt; font-weight: bold; text-align: center; vertical-align: middle; padding: 10px; border: 1px solid #B91C1C; white-space: nowrap;">CATEGORY</th>
            <th bgcolor="#EC1D24" style="background-color: #EC1D24; color: #FFFFFF; font-size: 10pt; font-weight: bold; text-align: center; vertical-align: middle; padding: 10px; border: 1px solid #B91C1C; white-space: nowrap;">ACTION / TITLE</th>
            <th bgcolor="#EC1D24" style="background-color: #EC1D24; color: #FFFFFF; font-size: 10pt; font-weight: bold; text-align: center; vertical-align: middle; padding: 10px; border: 1px solid #B91C1C; white-space: nowrap;">OLD VALUE</th>
            <th bgcolor="#EC1D24" style="background-color: #EC1D24; color: #FFFFFF; font-size: 10pt; font-weight: bold; text-align: center; vertical-align: middle; padding: 10px; border: 1px solid #B91C1C; white-space: nowrap;">NEW VALUE</th>
            <th bgcolor="#EC1D24" style="background-color: #EC1D24; color: #FFFFFF; font-size: 10pt; font-weight: bold; text-align: center; vertical-align: middle; padding: 10px; border: 1px solid #B91C1C; white-space: nowrap;">ACTION BY</th>
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
    link.setAttribute("download", `updates_export_${fileDateStr}.xls`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    await logExportAction('Excel', sorted.length);
  };

  // Theme helper for Custom Dropdown styles consistency
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

  // Category list
  const categoryOptions = [
    { value: 'all', label: 'All Categories' },
    { value: 'Profile', label: 'Profile' },
    { value: 'Settings', label: 'Settings' },
    { value: 'Watch Status', label: 'Watch Status' },
    { value: 'Theme', label: 'Theme' },
    { value: 'Achievements', label: 'Achievements' },
    { value: 'Account', label: 'Account' }
  ];

  // Sorting list
  const sortOptions = [
    { value: 'newest', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'action-asc', label: 'Action A-Z' },
    { value: 'action-desc', label: 'Action Z-A' },
  ];

  // Time range list
  const timeRangeOptions = [
    { value: 'all', label: 'All' },
    { value: '24h', label: 'Past 24 Hours' },
    { value: '7d', label: 'Past 7 Days' },
    { value: '1m', label: 'Past 1 Month' },
    { value: 'custom', label: 'Custom Range' },
  ];

  // Raw logs list (Combines Recent Logs and Buffer Logs)
  const logs = isOfflineSandbox ? sandboxUpdates : [...(user?.updates || []), ...(user?.updatesBuffer || [])];

  // Combine raw updates and loaded archives with deduplication by ID
  const allLogs = React.useMemo(() => {
    const combined = [...logs, ...archivedLogs];
    const seen = new Set();
    return combined.filter(item => {
      if (!item.id) return true;
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }, [logs, archivedLogs]);

  // Total log count from user profile configuration file or calculated
  const totalLogsCount = isOfflineSandbox
    ? sandboxUpdates.length
    : typeof user?.totalLogCount === 'number' && user.totalLogCount > 0
    ? user.totalLogCount
    : (user?.updates?.length || 0) + (user?.updatesBuffer?.length || 0);

  // Determine if unretrieved archived logs exist in Telegram Storage
  const hasMoreArchivesToLoad = !isOfflineSandbox && !hasLoadedArchive && !!authToken && !!user?.archiveFileId;

  // Filter logic
  const filtered = allLogs.filter((log: any) => {
    // 1. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchAction = log.action?.toLowerCase().includes(q);
      const matchPrev = log.previousValue?.toLowerCase().includes(q);
      const matchNew = log.newValue?.toLowerCase().includes(q);
      if (!matchAction && !matchPrev && !matchNew) return false;
    }

    // 2. Category Filter
    if (filterCategory !== 'all' && log.source !== filterCategory) {
      return false;
    }

    // 3. Time Range Filter
    const timestamp = log.timestamp;
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

  // Sort logic
  const sorted = [...filtered].sort((a: any, b: any) => {
    if (sortOrder === 'newest') return b.timestamp - a.timestamp;
    if (sortOrder === 'oldest') return a.timestamp - b.timestamp;
    if (sortOrder === 'action-asc') return (a.action || '').localeCompare(b.action || '');
    if (sortOrder === 'action-desc') return (b.action || '').localeCompare(a.action || '');
    return 0;
  });

  const limit = 15;
  const maxPage = Math.ceil(sorted.length / limit) || 1;
  const currentPage = Math.min(page, maxPage);
  const startIndex = (currentPage - 1) * limit;
  const pageLogs = sorted.slice(startIndex, startIndex + limit);

  return (
    <div className="flex flex-col animate-fadeIn text-left gap-2 font-sans w-full py-1 px-1" id="updates-ledger-expanded">
      <div className="flex flex-col gap-1.5 md:gap-3 w-full text-left md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-1 text-left w-full md:w-auto">
          {/* Row 1 on mobile: Header (left) and Export Button (right) */}
          <div className="flex items-center justify-between w-full md:w-auto md:justify-start md:gap-2">
            <h2 className="font-display font-bold text-xl sm:text-2xl tracking-tight text-white flex items-center gap-2">
              <Database className={`md:hidden ${themeStyles.marvelIcon} w-5 h-5 sm:w-6 sm:h-6 animate-pulse`} />
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
              Updates
            </h2>

            {/* Theme-Aware Responsive Export Actions (Mobile Only) */}
            <div className="relative md:hidden">
              <button
                type="button"
                onClick={() => setShowExportDropdown(!showExportDropdown)}
                className={exportStyles.buttonClass}
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export</span>
                <ChevronDown className={`w-3 h-3 ml-0.5 transition-transform duration-200 ${showExportDropdown ? 'rotate-180' : ''}`} />
              </button>
              {showExportDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowExportDropdown(false)} />
                  <div className={exportStyles.dropdownClass}>
                    <button
                      onClick={() => {
                        handleExportPDF();
                        setShowExportDropdown(false);
                      }}
                      className={exportStyles.dropdownItemClass}
                    >
                      <FileText className="w-3.5 h-3.5 shrink-0" />
                      <span>Export as PDF</span>
                    </button>
                    <button
                      onClick={() => {
                        handleExportCSV();
                        setShowExportDropdown(false);
                      }}
                      className={exportStyles.dropdownItemClass}
                    >
                      <Table className="w-3.5 h-3.5 shrink-0" />
                      <span>Export as Excel</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Row 2 on mobile: Page Description spanning full width. On desktop, it sits below the header title. */}
          <p className="font-sans text-xs text-neutral-400 w-full">
            Query complete audit trail of modifications made to your Avenger Agent records over time.
          </p>
        </div>

        {/* Desktop Controls (hidden on small screens, shown side-by-side on md+) */}
        <div className="hidden md:flex items-center gap-2">
          <button
            onClick={handleExportPDF}
            className={exportStyles.buttonClass}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export PDF</span>
          </button>
          <button
            onClick={handleExportCSV}
            className={exportStyles.buttonClass}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* Search and Filters Group */}
      <div className="flex flex-col md:flex-row gap-2.5 z-30 w-full md:items-center">
        {/* Row 1 / Left on desktop: Search Bar */}
        <div className="w-full md:flex-1 relative py-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <input
            type="text"
            placeholder="Search action or values..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="w-full bg-neutral-900 border border-neutral-850 text-white text-xs rounded-xl pl-10 pr-4 py-2.5 h-10 focus:border-marvel focus:outline-none font-sans"
          />
        </div>

        {/* Row 2 / Right on desktop: Three Custom Selectors */}
        <div className="grid grid-cols-3 gap-2.5 w-full md:w-auto md:flex md:items-center flex-shrink-0">
          <div className="md:w-44">
            <CustomDropdown
              value={filterCategory}
              onChange={(val) => {
                setFilterCategory(val);
                setPage(1);
              }}
              options={categoryOptions}
              activeTheme={activeTheme}
              placeholder="All Categories"
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

      {/* Audit trail table */}
      <div className="flex flex-col gap-3 text-left pt-3 pb-4">
        {/* Row Header with Single-Line Labels prevented from wrapping */}
        <div className={`flex items-center justify-between gap-2 border-b pb-2.5 ${
          activeTheme.startsWith('light-') ? 'border-slate-300' : 'border-neutral-850'
        }`}>
          <span className={`text-xs sm:text-sm uppercase font-bold tracking-wider font-display whitespace-nowrap ${
            activeTheme.startsWith('light-') ? 'text-slate-900' : 'text-neutral-200'
          }`}>
            Update Logs
          </span>
          <span className={`font-mono text-[9px] uppercase tracking-widest whitespace-nowrap ${
            activeTheme.startsWith('light-') ? 'text-slate-500' : 'text-neutral-500'
          }`}>
            {searchQuery.trim() !== '' || filterCategory !== 'all' || timeRange !== 'all' ? (
              `Found ${sorted.length} of ${totalLogsCount.toLocaleString()} results`
            ) : (
              `${totalLogsCount.toLocaleString()} Total Updates`
            )}
          </span>
        </div>

        {pageLogs.length > 0 ? (
          <div className="flex flex-col gap-4 text-left">
            <div className={`overflow-x-auto no-scrollbar -mx-4 sm:-mx-6 w-[calc(100%+2rem)] sm:w-[calc(100%+3rem)] border-t border-b text-left ${
              activeTheme.startsWith('light-') ? 'border-slate-300' : 'border-neutral-900/40'
            }`}>
              <table className="w-full text-left font-mono text-[10px] leading-normal border-collapse min-w-[750px]">
                <thead>
                  <tr className={`uppercase tracking-wider border-b text-[8px] ${
                    activeTheme.startsWith('light-')
                      ? 'bg-slate-200/60 text-slate-700 border-slate-300'
                      : 'bg-neutral-950/20 text-neutral-400 border-neutral-900'
                  }`}>
                    <th className="py-2.5 pl-4 sm:pl-6 pr-3 font-semibold text-left whitespace-nowrap w-[150px]">Timestamp</th>
                    <th className="py-2.5 px-3 font-semibold text-left whitespace-nowrap w-[100px]">Category</th>
                    <th className="py-2.5 px-3 font-semibold text-left whitespace-nowrap">Action</th>
                    <th className="py-2.5 px-3 font-semibold text-left whitespace-nowrap">Old Value</th>
                    <th className="py-2.5 px-3 font-semibold text-left whitespace-nowrap">New Value</th>
                    <th className="py-2.5 pl-3 pr-4 sm:pr-6 font-semibold text-left whitespace-nowrap w-[120px]">Action By</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${
                  activeTheme.startsWith('light-')
                    ? 'divide-slate-200 text-slate-800'
                    : 'divide-neutral-900/40 text-neutral-300'
                }`}>
                  {pageLogs.map((log: any, idx: number) => (
                    <tr key={log.id || idx} className={`transition-colors ${
                      activeTheme.startsWith('light-')
                        ? 'hover:bg-slate-200/50'
                        : 'hover:bg-neutral-900/10'
                    }`}>
                      <td className="py-2.5 pl-4 sm:pl-6 pr-3 text-left whitespace-nowrap">
                        {formatToIndianDateTime(log.timestamp)}
                      </td>
                      <td className="py-2.5 px-3 text-left whitespace-nowrap">
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${
                          log.source === 'Profile'
                            ? activeTheme.startsWith('light-') ? 'bg-sky-100 text-sky-800 border-sky-300' : 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                            : log.source === 'Settings'
                            ? activeTheme.startsWith('light-') ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : log.source === 'Watch Status'
                            ? activeTheme.startsWith('light-') ? 'bg-purple-100 text-purple-800 border-purple-300' : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                            : log.source === 'Theme'
                            ? activeTheme.startsWith('light-') ? 'bg-teal-100 text-teal-800 border-teal-300' : 'bg-teal-500/10 text-teal-400 border-teal-500/20'
                            : activeTheme.startsWith('light-') ? 'bg-slate-200 text-slate-700 border-slate-300' : 'bg-neutral-800 text-neutral-300 border-neutral-700'
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
                      <td className={`py-2.5 pl-3 pr-4 sm:pr-6 text-left whitespace-nowrap ${
                        activeTheme.startsWith('light-') ? 'text-slate-600' : 'text-neutral-400'
                      }`}>
                        @{log.userPerformed || 'sandbox_agent'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {(maxPage > 1 || hasMoreArchivesToLoad) && (
              <div className="flex items-center justify-between pt-2 font-sans text-xs">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white disabled:opacity-40 disabled:hover:text-neutral-300 transition-colors cursor-pointer"
                >
                  Previous
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-neutral-500 font-mono text-[10px]">
                    Page {currentPage} of {maxPage}
                  </span>
                </div>
                {currentPage === maxPage && hasMoreArchivesToLoad ? (
                  <button
                    type="button"
                    disabled={isLoadingArchive}
                    onClick={handleLoadArchive}
                    className="px-3 py-1.5 rounded-lg bg-amber-950/50 border border-amber-800/80 text-amber-300 hover:bg-amber-900/60 hover:border-amber-600 font-medium transition-all cursor-pointer flex items-center gap-1.5 shadow-sm disabled:opacity-70"
                    title="Load archived logs from Telegram Storage"
                  >
                    {isLoadingArchive ? (
                      <div className="w-3.5 h-3.5 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
                    ) : (
                      <Database className="w-3.5 h-3.5 text-amber-400" />
                    )}
                    {isLoadingArchive ? 'Loading Archive...' : 'Load More'}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={currentPage === maxPage}
                    onClick={() => setPage((p) => Math.min(maxPage, p + 1))}
                    className="px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white disabled:opacity-40 disabled:hover:text-neutral-300 transition-colors cursor-pointer"
                  >
                    Next
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <p className="text-[10px] text-neutral-500 italic text-center py-8">No modifications found matching query.</p>
        )}
      </div>
    </div>
  );
};
