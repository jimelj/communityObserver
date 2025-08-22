// AdSense Integration for Community Observer
(function() {
  'use strict';

  // AdSense configuration
  const ADSENSE_CONFIG = {
    publisherId: 'ca-pub-2586199346677304',
    enablePageLevelAds: false,
    adSlots: {
      'top_leaderboard': {
        adSlot: '8910818665',
        adFormat: 'auto',
        fullWidthResponsive: true
      },
      'sidebar_rect': {
        adSlot: '4109902211', 
        adFormat: 'auto',
        fullWidthResponsive: false
      },
      'in_article': {
        adSlot: '6563856923',
        adFormat: 'auto', 
        fullWidthResponsive: false
      }
    }
  };

  // Load AdSense script if not already loaded
  function loadAdSenseScript() {
    if (window.adsbygoogle) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.async = true;
      script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';
      script.crossOrigin = 'anonymous';
      
      script.onload = () => {
        console.log('AdSense script loaded successfully');
        resolve();
      };
      
      script.onerror = () => {
        console.error('Failed to load AdSense script');
        reject();
      };

      document.head.appendChild(script);
    });
  }

  // Initialize AdSense ads
  function initializeAdSense() {
    if (!window.adsbygoogle) {
      console.warn('AdSense not loaded yet');
      return;
    }

    // Find all AdSense ad containers
    const adContainers = document.querySelectorAll('.adsense-ad');
    
    adContainers.forEach(container => {
      const slotName = container.dataset.adSlot;
      const format = container.dataset.adFormat;
      const responsive = container.dataset.fullWidthResponsive === 'true';
      
      if (slotName && ADSENSE_CONFIG.adSlots[slotName]) {
        // Create AdSense ad unit
        const adUnit = document.createElement('ins');
        adUnit.className = 'adsbygoogle';
        adUnit.style.display = 'block';
        adUnit.setAttribute('data-ad-client', ADSENSE_CONFIG.publisherId);
        adUnit.setAttribute('data-ad-slot', ADSENSE_CONFIG.adSlots[slotName].adSlot);
        adUnit.setAttribute('data-ad-format', format);
        
        if (responsive) {
          adUnit.setAttribute('data-full-width-responsive', 'true');
        }
        
        // Replace placeholder with AdSense ad
        const placeholder = container.querySelector('.ad-placeholder');
        if (placeholder) {
          placeholder.style.display = 'none';
        }
        
        container.appendChild(adUnit);
        
        // Push ad to AdSense
        try {
          (adsbygoogle = window.adsbygoogle || []).push({});
          console.log(`AdSense ad initialized for slot: ${slotName}`);
        } catch (error) {
          console.error(`Failed to initialize AdSense ad for slot: ${slotName}`, error);
        }
      }
    });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      loadAdSenseScript().then(initializeAdSense);
    });
  } else {
    loadAdSenseScript().then(initializeAdSense);
  }

  // Re-initialize ads on navigation (for SPA-like behavior)
  document.addEventListener('astro:page-load', function() {
    setTimeout(initializeAdSense, 100);
  });

})();
