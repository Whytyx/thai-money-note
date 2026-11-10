var CACHE = "thai-money-note-v3";
var ASSETS = [
  "./",
  "./index.html",
  "./css/style.css",
  "./js/parser.js",
  "./js/categories.js",
  "./js/advice.js",
  "./js/app.js",
  "./manifest.json",
  "./fonts/Sarabun-Regular.woff",
  "./fonts/Sarabun-SemiBold.woff",
  "./fonts/Sarabun-Bold.woff",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png",
  "./icons/favicon.svg",
  "./icons/favicon-32.png",
  "./icons/favicon-16.png",
  "./icons/icon.svg"
];

function isAppCode(url) {
  var path = url.pathname.replace(/\/+$/, "/") || "/";
  if (path.endsWith("/")) return true;
  if (path.endsWith("/index.html")) return true;
  if (path.endsWith("/manifest.json") || path.endsWith("manifest.json")) return true;
  if (path.endsWith("/sw.js")) return true;
  if (path.indexOf("/js/") !== -1 && path.endsWith(".js")) return true;
  if (path.indexOf("/css/") !== -1 && path.endsWith(".css")) return true;
  return false;
}

function putCache(req, res) {
  if (res && res.ok && (res.type === "basic" || res.type === "cors")) {
    var copy = res.clone();
    caches.open(CACHE).then(function (cache) { cache.put(req, copy); });
  }
}

function networkFirst(req) {
  return fetch(req).then(function (res) {
    putCache(req, res);
    return res;
  }).catch(function () {
    return caches.match(req).then(function (cached) {
      if (cached) return cached;
      if (req.mode === "navigate") return caches.match("./index.html");
      return undefined;
    });
  });
}

function cacheFirst(req) {
  return caches.match(req).then(function (cached) {
    var fetched = fetch(req).then(function (res) {
      putCache(req, res);
      return res;
    }).catch(function () { return cached; });
    return cached || fetched;
  });
}

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) { return cache.addAll(ASSETS); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (event) {
  var req = event.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (isAppCode(url) || req.mode === "navigate") {
    event.respondWith(networkFirst(req));
  } else {
    event.respondWith(cacheFirst(req));
  }
});
