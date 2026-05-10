/**
 * Tooltip Component (Plain JS version)
 * Adapted from mithril-components
 * 
 * Usage:
 * Add `data-tooltip="Your text"` to any element.
 * Optional: `data-tooltip-placement="top|bottom|left|right"`
 * Optional: `data-tooltip-arrow="true"`
 */

document.addEventListener('DOMContentLoaded', () => {
    initTooltips();
});

function initTooltips() {
    const elements = document.querySelectorAll('[data-tooltip]');
    
    elements.forEach(el => {
        // Skip if already wrapped
        if (el.parentElement && el.parentElement.classList.contains('mud-tooltip-wrapper')) {
            return;
        }

        const text = el.getAttribute('data-tooltip');
        const placement = el.getAttribute('data-tooltip-placement') || 'bottom';
        const arrow = el.hasAttribute('data-tooltip-arrow');
        
        // Create wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'mud-tooltip-wrapper';
        
        // Wrap the element
        el.parentNode.insertBefore(wrapper, el);
        wrapper.appendChild(el);
        
        // Create tooltip container
        const container = document.createElement('div');
        container.className = `mud-tooltip-container mud-tooltip-${placement}`;
        if (arrow) {
            container.classList.add('mud-tooltip-arrow');
        }
        
        // Create inner text element
        const inner = document.createElement('div');
        inner.className = 'mud-tooltip';
        inner.innerText = text;
        
        container.appendChild(inner);
        wrapper.appendChild(container);
    });
}
