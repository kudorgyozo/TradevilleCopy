// ==UserScript==
// @name         Tradeville Value Copier
// @namespace    tradeville-copy
// @version      1.0
// @description  Copy selected values from the trading page to the clipboard as JSON via Ctrl+Alt+C
// @match        https://portal.tradeville.ro/portal/trading.htm*
// @grant        GM_setClipboard
// @run-at       document-idle
// @license      MIT
// ==/UserScript==

(function () {
    'use strict';

    // ---------------------------------------------------------------
    // 1. Configure the values you want to copy here.
    //    - "key" is the JSON property name (no spaces, used by your
    //      Sheets script to map to a specific cell).
    //    - "selector" is a CSS selector for the element holding the value.
    //
    //    To find a selector: right-click the value on the page ->
    //    "Inspect" -> in DevTools, right-click the highlighted element ->
    //    Copy -> "Copy selector". Paste it below.
    // ---------------------------------------------------------------
    const FIELDS = [
        { key: 'name',      selector: '#simbolPaginaSimbol' },
        { key: 'interest',  selector: '#detaliiTsimOblig > div > div:nth-child(1) > span.denomPrc' },
        { key: 'maturity',  selector: '#detaliiTsimOblig > div > div:nth-child(3) > span:nth-child(2)' },
        { key: 'cleanPrice',  selector: '#NewOrderSection input[name=pret]' },
        { key: 'dirtyPrice',  selector: '#NewOrderSection .ordinprev span[gi=dirty]' },
        { key: 'total',  selector: '#NewOrderSection .ordinprev span[gi=valord]' },
        { key: 'count',  selector: '#NewOrderSection input[name=cant]' },
        
        // Add more { key: '...', selector: '...' } lines as needed.
    ];

    const SHORTCUT = { ctrl: true, alt: true, shift: false, key: 'c' };

    function stripQuotes(value) {
        return value.replace(/^["']+|["']+$/g, '');
    }

    // Per-field cleanup applied after stripQuotes, before the value goes into the JSON.
    const CLEANERS = {
        total: (value) => value.replace(/,/g, ''), // "2,024.86" -> "2024.86"
    };

    function getValue(el) {
        if (!el) return '';
        if ('value' in el && el.tagName !== 'DIV' && el.tagName !== 'SPAN') {
            return stripQuotes(String(el.value).trim());
        }

        return stripQuotes(el.textContent.trim());
    }

    function showToast(message, isError) {
        const toast = document.createElement('div');
        toast.textContent = message;
        Object.assign(toast.style, {
            position: 'fixed',
            top: '16px',
            right: '16px',
            zIndex: 999999,
            padding: '8px 14px',
            borderRadius: '6px',
            fontFamily: 'sans-serif',
            fontSize: '13px',
            color: '#fff',
            background: isError ? '#c0392b' : '#27ae60',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        });
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2000);
    }

    function copyValues() {
        const missing = [];
        const result = {};
        FIELDS.forEach(({ key, selector }) => {
            const el = document.querySelector(selector);
            if (!el) missing.push(key);
            let value = getValue(el);
            if (CLEANERS[key]) value = CLEANERS[key](value);
            result[key] = value;
        });

        const json = JSON.stringify(result);
        GM_setClipboard(json, 'text');

        if (missing.length) {
            showToast(`Copied, but missing: ${missing.join(', ')}`, true);
        } else {
            showToast(`Copied: ${json}`);
        }
        console.log('[Tradeville Value Copier] copied:', json);
    }

    document.addEventListener('keydown', (e) => {
        const key = e.key.toLowerCase();
        if (
            e.ctrlKey === SHORTCUT.ctrl &&
            e.altKey === SHORTCUT.alt &&
            e.shiftKey === SHORTCUT.shift &&
            key === SHORTCUT.key
        ) {
            e.preventDefault();
            copyValues();
        }
    });
})();
