// selection-feature/selection-content.js
// This file initializes the selection detector

(function() {
    'use strict';

    let selectionDetector = null;

    function initSelectionFeature() {
        if (selectionDetector) {
            return;
        }
        
        // Make sure SelectionDetector is available
        if (!window.TimeConverter?.SelectionDetector) {
            return;
        }
        
        selectionDetector = new window.TimeConverter.SelectionDetector();
    }

    async function checkIfEnabled() {
        try {
            const url = window.location.href;
            const hostname = window.location.hostname;
            
            const result = await chrome.storage.sync.get(['disabledSites', 'disabledPages']);
            const disabledSites = result.disabledSites || [];
            const disabledPages = result.disabledPages || [];
            
            if (disabledSites.includes(hostname) || disabledPages.includes(url)) {
                return false;
            }
            
            return true;
        } catch (error) {
            return true;
        }
    }

    async function init() {
        const isEnabled = await checkIfEnabled();
        
        if (isEnabled) {
            initSelectionFeature();
        }
        
        chrome.storage.onChanged.addListener(async (changes, namespace) => {
            if (namespace === 'sync' && (changes.disabledSites || changes.disabledPages)) {
                const isNowEnabled = await checkIfEnabled();
                
                if (isNowEnabled && !selectionDetector) {
                    initSelectionFeature();
                } else if (!isNowEnabled && selectionDetector) {
                    if (selectionDetector.tooltip) {
                        selectionDetector.tooltip.remove();
                    }
                    selectionDetector = null;
                }
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();