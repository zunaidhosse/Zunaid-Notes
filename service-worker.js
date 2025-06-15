const CACHE_NAME = 'zunaid-notes-cache-v6';
const URLS_TO_CACHE = [
  'index.html',
  'style.css',
  'theme.css',
  'components.css',
  'views.css',
  'manifest.json',
  'script.js',
  'utils.js',
  'ui.js',
  'notes.js',
  'editor.js',
  'settings.js',
  'categories.js',
  'storage.js',
  'translations.js',
  'audio.js',
  'backup.js',
  'icon-192x192.png',
  'icon-512x512.png',
  'background.png',
  'click.mp3',
  'swoosh.mp3',
  'add.mp3',
  'delete.mp3',
  'open_modal.mp3',
  'close_modal.mp3',
  'https://cdn.jsdelivr.net/npm/luxon@3.4.4/build/es6/luxon.js',
  'https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm',
  'https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;700&display=swap'
];

// 'install' ইভেন্ট: ব্যবহারকারী যখন প্রথমবার অ্যাপটি ভিজিট করে বা service worker আপডেট হয়,
// তখন এই ইভেন্টটি কাজ করে। এখানে আমরা অ্যাপের জন্য প্রয়োজনীয় সব ফাইল (core assets)
// ক্যাশে (Cache) সংরক্ষণ করি। এর ফলে, পরবর্তীতে অফলাইনেও এই ফাইলগুলো ব্যবহার করা যায়।
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache. Caching core assets.');
        // cache.addAll একটি atomic operation। যদি একটি ফাইলও ডাউনলোড হতে ব্যর্থ হয়,
        // তাহলে পুরো ক্যাশিং প্রক্রিয়াটি ব্যর্থ হবে।
        return cache.addAll(URLS_TO_CACHE);
      })
      .catch(error => {
          console.error('Failed to cache core assets:', error);
      })
  );
});

// 'activate' ইভেন্ট: নতুন service worker সক্রিয় (activated) হওয়ার পর এটি কাজ করে।
// এর প্রধান কাজ হলো পুরোনো, অব্যবহৃত ক্যাশগুলো মুছে ফেলা।
// এটি নিশ্চিত করে যে ব্যবহারকারীর ডিভাইসে পুরোনো ডেটা জমে থাকবে না।
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // যদি কোনো ক্যাশের নাম বর্তমান CACHE_NAME এর সাথে না মেলে, তবে সেটি মুছে ফেলা হয়।
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// 'fetch' ইভেন্ট: অ্যাপ যখনই কোনো রিসোর্স (যেমন: ছবি, CSS, JS ফাইল) অনুরোধ (request) করে,
// এই ইভেন্টটি সেই অনুরোধটি ধরে ফেলে। এটি অফলাইন কার্যকারিতার মূল ভিত্তি।
// স্ট্র্যাটেজি: Cache-First, then Network.
self.addEventListener('fetch', event => {
  event.respondWith(
    // ১. প্রথমে ক্যাশে খোঁজা হয়:
    caches.match(event.request)
      .then(response => {
        // যদি ক্যাশে অনুরোধ করা ফাইলটি পাওয়া যায় (cache hit), তবে সরাসরি ক্যাশ থেকে দেওয়া হয়।
        // এটি খুবই দ্রুত এবং অফলাইনেও কাজ করে।
        if (response) {
          return response;
        }

        // ২. ক্যাশে না পাওয়া গেলে নেটওয়ার্ক থেকে আনা হয়:
        return fetch(event.request).then(
          networkResponse => {
            // Check if we received a valid response
            if (!networkResponse || networkResponse.status !== 200) {
              // Also checking for 'opaque' for no-cors requests which have status 0
              if(networkResponse.type !== 'opaque') {
                 return networkResponse;
              }
            }

            // ৩. নেটওয়ার্ক থেকে পাওয়া নতুন রিসোর্সটিকে ভবিষ্যতে ব্যবহারের জন্য ক্যাশে সংরক্ষণ করা হয়:
            // response একটি stream, তাই এটিকে clone করতে হয়। কারণ একটি stream একবারই ব্যবহার করা যায়।
            const responseToCache = networkResponse.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                // নতুন রিসোর্সটি ক্যাশে রাখা হচ্ছে।
                cache.put(event.request, responseToCache);
              });

            return networkResponse;
          }
        ).catch(error => {
            console.error('Fetching failed, and not in cache:', error);
            // যদি ক্যাশেও না থাকে এবং নেটওয়ার্ক থেকেও আনা সম্ভব না হয় (যেমন: ইন্টারনেট নেই),
            // তখন অনুরোধটি ব্যর্থ হবে। এখানে একটি অফলাইন ফলব্যাক পেজ দেখানো যেতে পারে।
        });
      })
  );
});