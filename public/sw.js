let adblockDomains = new Set([
  'doubleclick.net', 'googleadservices.com', 'googlesyndication.com', 
  'adsystem.com', 'adservice.google.com', 'amazon-adsystem.com',
  'adnxs.com', 'criteo.com', 'taboola.com', 'outbrain.com', 'rubiconproject.com',
  'pubmatic.com', 'openx.net', 'adsrvr.org', 'advertising.com', 'moatads.com'
]);

let adblockEnabled = true;

// Fetch a larger list on install
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    fetch('https://raw.githubusercontent.com/StevenBlack/hosts/master/hosts')
      .then(res => res.text())
      .then(text => {
        const lines = text.split('\n');
        lines.forEach(line => {
          if (line.startsWith('0.0.0.0 ')) {
            const domain = line.replace('0.0.0.0 ', '').trim();
            if (domain && domain !== '0.0.0.0') {
              adblockDomains.add(domain);
            }
          }
        });
        console.log(`Loaded ${adblockDomains.size} adblock domains`);
      })
      .catch(err => console.error('Failed to fetch adblock list', err))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'TOGGLE_ADBLOCK') {
    adblockEnabled = event.data.enabled;
    console.log('Adblock enabled:', adblockEnabled);
  }
});

self.addEventListener('fetch', (event) => {
  if (!adblockEnabled) return;
  
  try {
    const url = new URL(event.request.url);
    
    // Check if the exact hostname is in the set, or if a parent domain is
    let hostname = url.hostname;
    let isAd = false;
    
    const parts = hostname.split('.');
    for (let i = 0; i < parts.length - 1; i++) {
      const domainToCheck = parts.slice(i).join('.');
      if (adblockDomains.has(domainToCheck)) {
        isAd = true;
        break;
      }
    }
    
    if (isAd) {
      event.respondWith(
        new Response('Blocked by System Adblocker', {
          status: 403,
          statusText: 'Forbidden'
        })
      );
    }
  } catch (e) {}
});
