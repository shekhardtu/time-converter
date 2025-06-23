// selection-feature/selection-detector.js
// This file must be loaded after date-time-parser.js and timezone-converter.js

(function() {
    'use strict';

    class SelectionDetector {
        constructor() {
            this.tooltip = null;
            this.selectedText = '';
            this.conversionSettings = null;
            this.isTooltipVisible = false;
            this.hideTimeout = null;
            
            this.init();
        }
        
        init() {
            this.createTooltip();
            this.loadSettings();
            this.attachEventListeners();
        }
        
        createTooltip() {
            // Wait for body to be ready
            if (!document.body) {
                setTimeout(() => this.createTooltip(), 100);
                return;
            }
            
            this.tooltip = document.createElement('div');
            this.tooltip.className = 'tz-selection-tooltip';
            this.tooltip.style.cssText = `
                position: fixed !important;
                background: rgba(255, 255, 255, 0.98) !important;
                color: #1a1a1a !important;
                padding: 10px 14px !important;
                border-radius: 8px !important;
                font-size: 13px !important;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15), 0 1px 3px rgba(0, 0, 0, 0.1) !important;
                z-index: 2147483647 !important;
                display: none;
                pointer-events: auto !important;
                backdrop-filter: blur(8px) !important;
                border: 1px solid rgba(0, 0, 0, 0.08) !important;
                max-width: 280px !important;
                line-height: 1.5 !important;
                opacity: 0;
                transform: translateX(-50%) translateY(-5px) !important;
                transition: opacity 0.15s ease, transform 0.15s ease !important;
            `;
            document.body.appendChild(this.tooltip);
        }
        
        async loadSettings() {
            try {
                const result = await chrome.storage.sync.get(['fromTimezone', 'toTimezone']);
                this.conversionSettings = {
                    from: result.fromTimezone || null,
                    to: result.toTimezone || null
                };
            } catch (error) {
                // Failed to load settings
            }
        }
        
        attachEventListeners() {
            document.addEventListener('mouseup', this.handleMouseUp.bind(this));
            document.addEventListener('selectionchange', this.handleSelectionChange.bind(this));
            
            chrome.storage.onChanged.addListener((changes, namespace) => {
                if (namespace === 'sync' && (changes.fromTimezone || changes.toTimezone)) {
                    this.loadSettings();
                }
            });
        }
        
        handleMouseUp(event) {
            setTimeout(() => {
                const selection = window.getSelection();
                const selectedText = selection.toString().trim();
                
                if (!selectedText || selectedText === this.selectedText) {
                    return;
                }
                
                this.selectedText = selectedText;
                this.processSelection(selection, selectedText);
            }, 10);
        }
        
        handleSelectionChange() {
            const selection = window.getSelection();
            const selectedText = selection.toString().trim();
            
            if (!selectedText) {
                this.hideTooltip();
            }
        }
        
        processSelection(selection, text) {
            if (!this.conversionSettings.from || !this.conversionSettings.to) {
                this.hideTooltip();
                return;
            }
            
            const dateInfo = this.detectDateTime(text);
            
            if (!dateInfo) {
                this.hideTooltip();
                return;
            }
            
            try {
                // Use date-fns-tz directly for conversion
                const { zonedTimeToUtc, utcToZonedTime } = dateFnsTz;
                
                // Always use the configured timezone settings from popup
                const fromTz = this.getIANATimezone(this.conversionSettings.from);
                const toTz = this.getIANATimezone(this.conversionSettings.to);
                
                // For time-only selections, we need to use today's date in the source timezone
                let sourceDate;
                if (dateInfo.isTimeOnly) {
                    // Create a date in the source timezone
                    const now = new Date();
                    sourceDate = new Date(
                        now.getFullYear(),
                        now.getMonth(),
                        now.getDate(),
                        dateInfo.date.getHours(),
                        dateInfo.date.getMinutes(),
                        dateInfo.date.getSeconds()
                    );
                } else {
                    sourceDate = dateInfo.date;
                }
                
                // Convert to UTC first, then to target timezone
                let utcDate;
                if (fromTz === 'UTC' || fromTz === 'GMT' || fromTz === 'Etc/GMT') {
                    utcDate = sourceDate;
                } else {
                    utcDate = zonedTimeToUtc(sourceDate, fromTz);
                }
                
                const convertedDate = utcToZonedTime(utcDate, toTz);
                
                this.showTooltip(selection, dateInfo, convertedDate);
            } catch (error) {
                this.hideTooltip();
            }
        }
        
        detectDateTime(text) {
            const trimmedText = text.trim();
            
            // Try the enhanced selection parser first
            const parsedDate = window.TimeConverter.parseSelectedDateTime(trimmedText);
            if (parsedDate) {
                return {
                    originalText: trimmedText,
                    date: parsedDate,
                    detectedTimezone: window.TimeConverter.detectTimezoneInfo(trimmedText) || this.conversionSettings.from,
                    isTimeOnly: /^(\d{1,2})[:.]\d{2}/.test(trimmedText) && !/\d{4}/.test(trimmedText),
                    isUnixTimestamp: /^\d{10}$|^\d{13}$/.test(trimmedText)
                };
            }
            
            // If full text didn't match, try extracting date from larger text
            const words = trimmedText.split(/\s+/);
            for (let i = 0; i < words.length; i++) {
                for (let j = i + 1; j <= Math.min(i + 10, words.length); j++) {
                    const phrase = words.slice(i, j).join(' ');
                    const date = window.TimeConverter.parseSelectedDateTime(phrase);
                    if (date) {
                        return {
                            originalText: phrase,
                            date: date,
                            detectedTimezone: window.TimeConverter.detectTimezoneInfo(phrase) || this.conversionSettings.from,
                            isTimeOnly: /^(\d{1,2})[:.]\d{2}/.test(phrase) && !/\d{4}/.test(phrase),
                            isUnixTimestamp: false
                        };
                    }
                }
            }
            
            return null;
        }
        
        getIANATimezone(tz) {
            const tzMap = {
                'PST': 'America/Los_Angeles', 'PDT': 'America/Los_Angeles',
                'MST': 'America/Denver',      'MDT': 'America/Denver',
                'CST': 'America/Chicago',     'CDT': 'America/Chicago',
                'EST': 'America/New_York',    'EDT': 'America/New_York',
                'IST': 'Asia/Kolkata',
                'AEST': 'Australia/Sydney',  'AEDT': 'Australia/Sydney',
                'JST': 'Asia/Tokyo',
                'CET': 'Europe/Paris',        'CEST': 'Europe/Paris',
                'UTC': 'UTC',
                'GMT': 'Etc/GMT'
            };
            const iana = tzMap[tz.toUpperCase()];
            if (!iana) {
                // Attempt to see if 'tz' itself is a valid IANA timezone
                try {
                    new Intl.DateTimeFormat('en', { timeZone: tz });
                    return tz;
                } catch (e) {
                    // Default to UTC if invalid
                    return 'UTC';
                }
            }
            return iana;
        }
        
        extractTimezone(text) {
            const timezonePatterns = [
                /\b([A-Z]{3,4})\b$/,
                /\(([A-Z]{3,4})\)$/,
                /\b(UTC|GMT)([+-]\d{1,2})?/i,
                /([+-]\d{2}:?\d{2})$/
            ];
            
            for (const pattern of timezonePatterns) {
                const match = text.match(pattern);
                if (match) {
                    return match[1] || match[0];
                }
            }
            
            return null;
        }
        
        showTooltip(selection, dateInfo, convertedDate) {
            if (!this.tooltip) {
                return;
            }
            
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            
            // Always show the configured timezone settings from popup
            const fromTz = this.conversionSettings.from;
            const toTz = this.conversionSettings.to;
            
            let formatOptions;
            let additionalInfo = '';
            
            if (dateInfo.isTimeOnly) {
                // For time-only, show just the time
                formatOptions = {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: dateInfo.originalText.includes(':') && dateInfo.originalText.split(':').length > 2 ? '2-digit' : undefined,
                    hour12: true,
                    timeZone: toTz
                };
                additionalInfo = '<div style="opacity: 0.5; font-size: 11px; margin-top: 2px;">Today\'s date assumed</div>';
            } else if (dateInfo.isUnixTimestamp) {
                // For Unix timestamps, show full date/time
                formatOptions = {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: true,
                    timeZone: toTz
                };
                additionalInfo = `<div style="opacity: 0.5; font-size: 11px; margin-top: 2px;">Unix: ${dateInfo.originalText}</div>`;
            } else {
                // Standard date/time format
                formatOptions = {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true,
                    timeZone: toTz
                };
            }
            
            const formattedDate = new Intl.DateTimeFormat('en-US', formatOptions).format(convertedDate);
            
            this.tooltip.innerHTML = `
                <div style="position: relative; padding-right: 20px;">
                    <button class="tooltip-close" style="
                        position: absolute;
                        top: -6px;
                        right: -6px;
                        width: 18px;
                        height: 18px;
                        border: none;
                        background: rgba(0, 0, 0, 0.06);
                        border-radius: 50%;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        padding: 0;
                        font-size: 12px;
                        color: #999;
                        transition: all 0.2s ease;
                        line-height: 1;
                    " aria-label="Close">×</button>
                    <div style="font-weight: 600; font-size: 14px; color: #0066cc; margin-bottom: 3px;">
                        ${formattedDate}
                    </div>
                    <div style="font-size: 11px; color: #666; display: flex; align-items: center; gap: 4px;">
                        <span style="opacity: 0.8;">${fromTz}</span>
                        <span style="opacity: 0.5;">→</span>
                        <span style="opacity: 0.8;">${toTz}</span>
                    </div>
                    ${additionalInfo ? additionalInfo.replace('opacity: 0.5', 'opacity: 0.7').replace('font-size: 11px', 'font-size: 10px').replace('margin-top: 2px', 'margin-top: 4px') : ''}
                </div>
                <div class="tooltip-arrow" style="
                    position: absolute;
                    width: 0;
                    height: 0;
                    border-left: 6px solid transparent;
                    border-right: 6px solid transparent;
                    bottom: -6px;
                    left: 50%;
                    transform: translateX(-50%);
                    border-top: 6px solid rgba(255, 255, 255, 0.98);
                    filter: drop-shadow(0 2px 2px rgba(0, 0, 0, 0.06));
                "></div>
            `;
            
            // First, show the tooltip to measure its height
            this.tooltip.style.display = 'block';
            this.tooltip.style.opacity = '0';
            
            // Get tooltip dimensions
            const tooltipHeight = this.tooltip.offsetHeight;
            const tooltipWidth = this.tooltip.offsetWidth;
            
            // Calculate position
            const tooltipX = rect.left + (rect.width / 2);
            let tooltipY = rect.top - tooltipHeight - 8; // 8px gap above selection
            let showBelow = false;
            
            // Check if tooltip would go off-screen at top
            if (tooltipY < 10) {
                // Show below selection instead
                tooltipY = rect.bottom + 8; // 8px gap below selection
                showBelow = true;
                
                // Flip the arrow
                const arrow = this.tooltip.querySelector('.tooltip-arrow');
                if (arrow) {
                    arrow.style.top = '-6px';
                    arrow.style.bottom = 'auto';
                    arrow.style.borderTop = 'none';
                    arrow.style.borderBottom = '6px solid rgba(255, 255, 255, 0.98)';
                }
            }
            
            // Check horizontal bounds
            const halfWidth = tooltipWidth / 2;
            let adjustedX = tooltipX;
            
            // Prevent tooltip from going off-screen horizontally
            if (tooltipX - halfWidth < 10) {
                adjustedX = halfWidth + 10;
            } else if (tooltipX + halfWidth > window.innerWidth - 10) {
                adjustedX = window.innerWidth - halfWidth - 10;
            }
            
            this.tooltip.style.left = adjustedX + 'px';
            this.tooltip.style.top = tooltipY + 'px';
            
            // Force browser to recognize the position change
            this.tooltip.offsetHeight;
            
            requestAnimationFrame(() => {
                this.tooltip.style.opacity = '1';
                this.tooltip.style.transform = 'translateX(-50%) translateY(0)';
            });
            
            
            // Add click handler for close button
            const closeBtn = this.tooltip.querySelector('.tooltip-close');
            if (closeBtn) {
                closeBtn.onclick = (e) => {
                    e.stopPropagation();
                    this.hideTooltip();
                };
                
                // Add hover effect
                closeBtn.onmouseenter = () => {
                    closeBtn.style.background = 'rgba(0, 0, 0, 0.1)';
                    closeBtn.style.color = '#666';
                };
                closeBtn.onmouseleave = () => {
                    closeBtn.style.background = 'rgba(0, 0, 0, 0.06)';
                    closeBtn.style.color = '#999';
                };
            }
            
            this.isTooltipVisible = true;
            
            if (this.hideTimeout) {
                clearTimeout(this.hideTimeout);
            }
            
            this.hideTimeout = setTimeout(() => {
                this.hideTooltip();
            }, 3000);
        }
        
        hideTooltip() {
            if (!this.isTooltipVisible) return;
            
            this.tooltip.style.opacity = '0';
            this.tooltip.style.transform = 'translateX(-50%) translateY(-5px)';
            
            setTimeout(() => {
                if (this.tooltip) {
                    this.tooltip.style.display = 'none';
                }
            }, 150);
            
            this.isTooltipVisible = false;
            this.selectedText = '';
            
            if (this.hideTimeout) {
                clearTimeout(this.hideTimeout);
                this.hideTimeout = null;
            }
        }
    }

    // Export to global scope
    window.TimeConverter = window.TimeConverter || {};
    window.TimeConverter.SelectionDetector = SelectionDetector;
})();