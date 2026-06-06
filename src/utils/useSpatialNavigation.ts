import { useEffect } from 'react';

export function useSpatialNavigation(enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement as HTMLElement;
      
      const isArrowKey = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key);
      if (!isArrowKey) return;

      // Allow default input typing cursor moves inside searching input
      const isInput = activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA');
      if (isInput && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        return; 
      }

      // Query all focusable elements
      // Elements with tabIndex >= 0 that are visible and not disabled
      const allFocusable = Array.from(
        document.querySelectorAll(
          'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ) as HTMLElement[];

      const visibleFocusable = allFocusable.filter(el => {
        if (el.offsetWidth === 0 && el.offsetHeight === 0) return false;
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') return false;
        return true;
      });

      if (visibleFocusable.length === 0) return;

      // Prevent default page scroll
      e.preventDefault();

      // If no active element or active element is not focusable, focus the first visible focusable element
      if (!activeElement || !visibleFocusable.includes(activeElement)) {
        visibleFocusable[0].focus();
        visibleFocusable[0].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
        return;
      }

      const currentRect = activeElement.getBoundingClientRect();
      const currentCenter = {
        x: currentRect.left + currentRect.width / 2,
        y: currentRect.top + currentRect.height / 2,
      };

      let bestCandidate: HTMLElement | null = null;
      let minScore = Infinity;

      visibleFocusable.forEach(candidate => {
        if (candidate === activeElement) return;

        const rect = candidate.getBoundingClientRect();
        const center = {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        };

        const dx = center.x - currentCenter.x;
        const dy = center.y - currentCenter.y;

        // Verify the candidate is actually in the direction of the arrow key
        let isCorrectDirection = false;
        let primaryDist = 0;
        let secondaryDist = 0;

        switch (e.key) {
          case 'ArrowLeft':
            isCorrectDirection = dx < -5; // Left direction
            primaryDist = Math.abs(dx);
            secondaryDist = Math.abs(dy);
            break;
          case 'ArrowRight':
            isCorrectDirection = dx > 5; // Right direction
            primaryDist = Math.abs(dx);
            secondaryDist = Math.abs(dy);
            break;
          case 'ArrowUp':
            isCorrectDirection = dy < -5; // Up direction
            primaryDist = Math.abs(dy);
            secondaryDist = Math.abs(dx);
            break;
          case 'ArrowDown':
            isCorrectDirection = dy > 5; // Down direction
            primaryDist = Math.abs(dy);
            secondaryDist = Math.abs(dx);
            break;
        }

        if (!isCorrectDirection) return;

        // Spatial logic score formula:
        // We penalize horizontal variations heavily when moving vertically, and vice-versa
        // To maintain alignment selection (e.g. within rows or columns)
        const score = primaryDist + secondaryDist * 2.8;

        if (score < minScore) {
          minScore = score;
          bestCandidate = candidate;
        }
      });

      if (bestCandidate) {
        const nextElement = bestCandidate as HTMLElement;
        nextElement.focus();
        
        // Scroll elegantly
        nextElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'center'
        });
        
        // Check if this belongs to a horizontal movie scroll container
        const scrollParent = nextElement.closest('.movie-row-scroll');
        if (scrollParent) {
          const sParent = scrollParent as HTMLElement;
          const parentRect = sParent.getBoundingClientRect();
          const elemRect = nextElement.getBoundingClientRect();
          
          if (elemRect.left < parentRect.left) {
            sParent.scrollBy({ left: elemRect.left - parentRect.left - 40, behavior: 'smooth' });
          } else if (elemRect.right > parentRect.right) {
            sParent.scrollBy({ left: elemRect.right - parentRect.right + 40, behavior: 'smooth' });
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled]);
}
