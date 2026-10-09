/*
 * API client shared by the storefront and the admin panel.
 * 1) Normal mode: talks to server.js over fetch().
 * 2) Demo mode: when no server answers (static hosting / preview), the very same
 *    business logic from core.js runs in the browser and keeps data in localStorage.
 */
(function () {
  'use strict';
  var Core = window.PalmaCore;
  var KEY = 'palma.demo.db.v1';
  var TOKEN_KEY = 'palma.admin.token';
  var mode = null; // 'server' | 'demo'

  function store(get, set) { try { return get(); } catch (e) { return set; } }
  function readToken() { return store(function () { return localStorage.getItem(TOKEN_KEY) || ''; }, ''); }
  function writeToken(t) { try { if (t) localStorage.setItem(TOKEN_KEY, t); else localStorage.removeItem(TOKEN_KEY); } catch (e) {} }

  /* ---- demo backend ---- */
  var memoryDb = null;
  var demoApi = Core.createApi({
    load: async function () {
      if (memoryDb) return memoryDb;
      try { var raw = localStorage.getItem(KEY); if (raw) memoryDb = JSON.parse(raw); } catch (e) {}
      return memoryDb;
    },
    save: async function (db) {
      memoryDb = db;
      try { localStorage.setItem(KEY, JSON.stringify(db)); }
      catch (e) { var err = new Error('quota'); err.code = 'quota'; throw err; }
    },
    hash: async function (pw, salt) {
      var buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(salt + ':' + pw));
      return Array.prototype.map.call(new Uint8Array(buf), function (b) { return b.toString(16).padStart(2, '0'); }).join('');
    },
    random: async function (n) {
      var a = new Uint8Array(n); crypto.getRandomValues(a);
      return Array.prototype.map.call(a, function (b) { return b.toString(16).padStart(2, '0'); }).join('');
    },
    saveImage: async function (dataUrl) { return dataUrl; }
  });

  async function detect() {
    if (mode) return mode;
    if (location.protocol === 'file:') { mode = 'demo'; return mode; }
    try {
      var r = await fetch(base() + 'api/public', { headers: { Accept: 'application/json' } });
      var ct = r.headers.get('content-type') || '';
      mode = (r.ok && ct.indexOf('json') >= 0) ? 'server' : 'demo';
    } catch (e) { mode = 'demo'; }
    return mode;
  }
  // base path of the site, so the same files work at "/" and inside a sub-folder
  function base() {
    var p = location.pathname;
    if (/\/admin\/(index\.html)?$/.test(p)) return p.replace(/admin\/(index\.html)?$/, '');
    return p.replace(/[^/]*$/, '');
  }

  async function call(method, path, body, opts) {
    opts = opts || {};
    var m = await detect();
    var token = readToken();
    if (m === 'demo') {
      try {
        var r = await demoApi.handle({ method: method, path: path, body: body ? JSON.parse(JSON.stringify(body)) : {}, token: token });
        return r.body;
      } catch (e) {
        return { ok: false, error: e && e.code === 'quota' ? 'quota' : 'server' };
      }
    }
    try {
      var res = await fetch(base() + path.replace(/^\//, ''), {
        method: method,
        headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: 'Bearer ' + token } : {}),
        body: body && method !== 'GET' ? JSON.stringify(body) : undefined
      });
      return await res.json();
    } catch (e) { return { ok: false, error: 'network' }; }
  }

  window.PalmaAPI = {
    mode: detect,
    get: function (p) { return call('GET', p); },
    post: function (p, b) { return call('POST', p, b); },
    put: function (p, b) { return call('PUT', p, b); },
    del: function (p) { return call('DELETE', p); },
    token: { get: readToken, set: writeToken },
    resetDemo: function () { memoryDb = null; try { localStorage.removeItem(KEY); } catch (e) {} },
    /** make a URL from a stored image path, honouring the site base */
    img: function (u) {
      if (!u) return '';
      if (/^(data:|https?:)/.test(u)) return u;
      return base() + u.replace(/^\//, '');
    }
  };
})();
