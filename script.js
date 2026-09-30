/* ==========================================================================
   Dominic Siwiec | dominicsiwiec.com
   Shared behaviour for every page. The theme, .js-reveal and .fast-load
   flags are set by the small inline script in each page's <head>, so nothing
   flashes before this runs.
   ========================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var each = function (list, fn) { Array.prototype.forEach.call(list, fn); };

  /* ---------- Footer year ---------- */
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Theme: dark by default, light on request, remembered ---------- */
  var themeMeta = document.querySelector('meta[name="theme-color"]');
  var paintTheme = function (theme) {
    root.setAttribute('data-theme', theme);
    var next = theme === 'dark' ? 'light' : 'dark';
    each(document.querySelectorAll('[data-theme-toggle]'), function (b) {
      b.setAttribute('aria-label', 'Switch to ' + next + ' mode');
      var t = b.querySelector('[data-theme-label]');
      if (t) t.textContent = next === 'light' ? 'Light mode' : 'Dark mode';
    });
    if (themeMeta) themeMeta.setAttribute('content', theme === 'dark' ? '#0b0b0d' : '#f5f5f7');
  };
  paintTheme(root.getAttribute('data-theme') === 'light' ? 'light' : 'dark');
  each(document.querySelectorAll('[data-theme-toggle]'), function (b) {
    b.addEventListener('click', function () {
      var theme = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      paintTheme(theme);
      try { localStorage.setItem('ds_theme', theme); } catch (e) {}
    });
  });

  /* ---------- Photos: mark slots that actually loaded an image ---------- */
  each(document.querySelectorAll('.photo-slot img'), function (img) {
    var slot = img.closest('.photo-slot');
    if (!slot) return;
    var ok = function () { slot.classList.add('has-photo'); };
    var fail = function () { img.remove(); };            // the slot's placeholder shows instead
    if (img.complete) { img.naturalWidth ? ok() : fail(); }
    else { img.addEventListener('load', ok); img.addEventListener('error', fail); }
  });

  /* ---------- Mobile menu ---------- */
  var toggle = document.getElementById('navToggle');
  var links = document.getElementById('navLinks');
  if (toggle && links) {
    var setMenu = function (open) {
      links.classList.toggle('is-open', open);
      toggle.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    };
    toggle.addEventListener('click', function () { setMenu(!links.classList.contains('is-open')); });
    links.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && links.classList.contains('is-open')) { setMenu(false); toggle.focus(); }
    });
  }

  /* ---------- Reveal elements as they scroll into view ---------- */
  var revealEls = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) {
    each(revealEls, function (el) { el.classList.add('is-visible'); });
  } else {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -40px 0px', threshold: 0 });
    each(revealEls, function (el) { revealObserver.observe(el); });

    // A fast scroll can jump an element clean past the viewport before the
    // observer fires, so sweep anything already scrolled into view.
    var sweeping = false;
    var sweep = function () {
      sweeping = false;
      var left = 0;
      each(revealEls, function (el) {
        if (el.classList.contains('is-visible')) return;
        if (el.getBoundingClientRect().top < window.innerHeight) {
          el.classList.add('is-visible');
          revealObserver.unobserve(el);
        } else { left++; }
      });
      if (!left) window.removeEventListener('scroll', onSweep);
    };
    var onSweep = function () {
      if (sweeping) return;
      sweeping = true;
      window.requestAnimationFrame(sweep);
    };
    window.addEventListener('scroll', onSweep, { passive: true });
  }

  /* ---------- Highlight the mobile menu link for the section in view ---------- */
  var navAnchors = document.querySelectorAll('.nav-links a[href*="#"]');
  var sections = [];
  each(navAnchors, function (a) {
    var hash = a.getAttribute('href').split('#')[1];
    var target = hash && document.getElementById(hash);
    if (target) sections.push({ link: a, el: target });
  });
  if (sections.length && 'IntersectionObserver' in window) {
    var sectionObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        sections.forEach(function (s) { s.link.classList.toggle('is-active', s.el === entry.target); });
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
    sections.forEach(function (s) { sectionObserver.observe(s.el); });
  }

  /* ======================================================================
     Scroll tachometer
     The needle sweeps 240 degrees from 0 to 8000 as you scroll, and starts
     shaking as it climbs into the red band near the end of the page.
     ====================================================================== */
  var speedo = document.getElementById('speedo');
  if (speedo) {
    var needle = speedo.querySelector('.gauge-needle');
    var fill = speedo.querySelector('.gauge-fill');
    var rpmEl = speedo.querySelector('[data-rpm]');
    var SWEEP = 240, START = -120, MAX_RPM = 8000, REDLINE = 6500;
    var SHAKE_FROM = 0.62, MAX_SHAKE = 3.4;
    var ARC_LEN = parseFloat(fill && fill.getAttribute('data-arc')) || 0;
    var target = 0, shown = 0, raf = null, ticking = false;

    var readPct = function () {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      return max > 8 ? Math.min(Math.max(window.scrollY / max, 0), 1) : 0;
    };
    var setRpm = function (v) {
      if (!rpmEl) return;
      v = Math.max(0, Math.min(MAX_RPM, Math.round(v / 25) * 25));
      rpmEl.textContent = v.toLocaleString('en-US');
    };
    var paintTrack = function () {
      if (fill && ARC_LEN) fill.style.strokeDashoffset = String(ARC_LEN * (1 - target));
      speedo.classList.toggle('is-redline', target * MAX_RPM >= REDLINE);
      speedo.classList.toggle('is-on', window.scrollY > 60);
    };
    var frame = function (now) {
      shown += (target - shown) * 0.17;
      if (Math.abs(target - shown) < 0.0004) shown = target;
      var t = Math.min(Math.max((shown - SHAKE_FROM) / (1 - SHAKE_FROM), 0), 1);
      var amp = t * t * MAX_SHAKE;
      var wob = amp
        ? (Math.sin(now * 0.047) * 0.55 + Math.sin(now * 0.131) * 0.30 + (Math.random() - 0.5) * 0.50) * amp
        : 0;
      needle.style.transform = 'rotate(' + (START + shown * SWEEP + wob).toFixed(2) + 'deg)';
      setRpm(shown * MAX_RPM + (wob * 0.4 / SWEEP) * MAX_RPM);
      raf = (amp > 0.02 || shown !== target) ? window.requestAnimationFrame(frame) : null;
    };
    var onScroll = function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () {
        target = readPct();
        paintTrack();
        ticking = false;
        if (reduceMotion) {
          shown = target;
          needle.style.transform = 'rotate(' + (START + shown * SWEEP) + 'deg)';
          setRpm(shown * MAX_RPM);
        } else if (!raf) {
          raf = window.requestAnimationFrame(frame);
        }
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    onScroll();
  }

  /* ======================================================================
     Side rail
     Groups collapse so the list stays short. Scroll tracking only ever
     lights a top-level entry, so scrolling through Projects highlights
     "Projects" rather than whichever card is on screen.
     ====================================================================== */
  (function () {
    var railLinks = Array.prototype.slice.call(document.querySelectorAll('.rail-link'));
    if (!railLinks.length) return;

    var here = location.pathname.replace(/index\.html$/, '');
    if (here.length > 1 && here.charAt(here.length - 1) !== '/') here += '/';
    var parse = function (a) {
      var href = a.getAttribute('href') || '';
      var i = href.indexOf('#');
      return { path: (i < 0 ? href : href.slice(0, i)) || '/', hash: i < 0 ? '' : href.slice(i + 1) };
    };

    each(document.querySelectorAll('.rail-group'), function (g) {
      var id = 'rail_' + (g.getAttribute('data-group') || '');
      var caret = g.querySelector('.rail-caret');
      var open = false;
      each(g.querySelectorAll('.rail-link'), function (a) {
        if (a.getAttribute('data-match') === here) open = true;
      });
      if (!open) { try { open = sessionStorage.getItem(id) === '1'; } catch (e) {} }
      var apply = function (state) {
        g.classList.toggle('is-open', state);
        if (caret) caret.setAttribute('aria-expanded', String(state));
      };
      apply(open);
      if (caret) {
        caret.addEventListener('click', function (e) {
          e.preventDefault();
          open = !open;
          apply(open);
          try { sessionStorage.setItem(id, open ? '1' : '0'); } catch (err) {}
        });
      }
    });

    var pairs = [];
    railLinks.forEach(function (a) {
      var p = parse(a);
      if (a.getAttribute('data-match') === here) { a.classList.add('is-active'); a.setAttribute('aria-current', 'page'); }
      if (p.path !== here) return;
      if (!p.hash) { a.classList.add('is-active'); return; }
      if (a.classList.contains('rail-link--sub')) return;     // only group headings win the scroll highlight
      var el = document.getElementById(p.hash);
      if (el) pairs.push({ link: a, el: el });
    });
    if (pairs.length < 2) return;
    pairs.sort(function (x, y) { return x.el.getBoundingClientRect().top - y.el.getBoundingClientRect().top; });

    var pending = false;
    var mark = function () {
      pending = false;
      var line = window.scrollY + window.innerHeight * 0.34;
      var best = null;
      for (var i = 0; i < pairs.length; i++) {
        if (pairs[i].el.getBoundingClientRect().top + window.scrollY <= line) best = pairs[i];
      }
      if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 6) best = pairs[pairs.length - 1];
      if (!best) best = pairs[0];
      pairs.forEach(function (p) { p.link.classList.toggle('is-active', p === best); });
    };
    window.addEventListener('scroll', function () {
      if (pending) return;
      pending = true;
      window.requestAnimationFrame(mark);
    }, { passive: true });
    window.addEventListener('resize', mark, { passive: true });
    mark();
  })();

  /* ======================================================================
     Pointer light: a soft work-light that follows the mouse.
     Pointer-driven only, so it never runs on touch devices.
     ====================================================================== */
  var glow = document.getElementById('cursor-glow');
  if (glow && !reduceMotion && window.matchMedia && window.matchMedia('(hover: hover)').matches) {
    var tx = window.innerWidth / 2, ty = window.innerHeight * 0.3, gx = tx, gy = ty, graf = null;
    var step = function () {
      gx += (tx - gx) * 0.08;
      gy += (ty - gy) * 0.08;
      glow.style.setProperty('--mx', gx.toFixed(1) + 'px');
      glow.style.setProperty('--my', gy.toFixed(1) + 'px');
      graf = (Math.abs(tx - gx) > 0.5 || Math.abs(ty - gy) > 0.5) ? window.requestAnimationFrame(step) : null;
    };
    window.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch') return;
      tx = e.clientX; ty = e.clientY;
      glow.classList.add('is-on');
      if (!graf) graf = window.requestAnimationFrame(step);
    }, { passive: true });
  }

  /* ======================================================================
     Live YouTube subscriber count
     Two keyless public endpoints, tried in order. If both fail, the numbers
     in the markup stay on screen, labelled as the last count.
     ====================================================================== */
  var subsBox = document.getElementById('subs');
  if (subsBox) {
    var CHANNEL = subsBox.getAttribute('data-channel');
    var GOAL = parseInt(subsBox.getAttribute('data-goal'), 10) || 100000;
    var elCount = subsBox.querySelector('[data-subs-count]');
    var elViews = subsBox.querySelector('[data-subs-views]');
    var elVideos = subsBox.querySelector('[data-subs-videos]');
    var elBar = subsBox.querySelector('[data-subs-bar]');
    var elPct = subsBox.querySelector('[data-subs-pct]');
    var elState = subsBox.querySelector('[data-subs-state]');
    var group = function (n) { return Number(n).toLocaleString('en-US'); };

    var paint = function (subs, views, videos) {
      if (elCount && subs) elCount.textContent = group(subs);
      if (elViews && views) elViews.textContent = group(views);
      if (elVideos && videos) elVideos.textContent = group(videos);
      if (subs) {
        var pct = Math.min(subs / GOAL, 1);
        if (elBar) elBar.style.width = (pct * 100).toFixed(1) + '%';
        if (elPct) elPct.textContent = Math.round(pct * 100) + '% there';
      }
    };
    (function () {
      var seed = parseInt((elCount && elCount.textContent || '').replace(/[^\d]/g, ''), 10);
      if (seed) paint(seed, null, null);
    })();

    var sources = [
      {
        url: 'https://api.socialcounts.org/youtube-live-subscriber-count/' + CHANNEL,
        read: function (d) {
          var c = d && d.counters;
          if (!c) return null;
          var s = (c.estimation && c.estimation.subscriberCount) || (c.api && c.api.subscriberCount);
          var v = (c.estimation && c.estimation.viewCount) || (c.api && c.api.viewCount);
          var n = (c.estimation && c.estimation.videoCount) || (c.api && c.api.videoCount);
          return s ? { subs: s, views: v, videos: n } : null;
        }
      },
      {
        url: 'https://mixerno.space/api/youtube-channel-counter/user/' + CHANNEL,
        read: function (d) {
          if (!d || !d.counts) return null;
          var pick = function (k) {
            var hit = d.counts.filter(function (x) { return x.value === k; })[0];
            return hit ? hit.count : null;
          };
          var s = pick('subscribers');
          return s ? { subs: s, views: pick('views'), videos: pick('videos') } : null;
        }
      }
    ];

    (function tryNext(i) {
      if (i >= sources.length || !window.fetch) return;
      var src = sources[i];
      var done = false;
      var timer = setTimeout(function () { if (!done) { done = true; tryNext(i + 1); } }, 6000);
      fetch(src.url, { cache: 'no-store' })
        .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status)); })
        .then(function (d) {
          if (done) return;
          var got = src.read(d);
          if (!got) throw new Error('shape');
          done = true; clearTimeout(timer);
          paint(got.subs, got.views, got.videos);
          subsBox.classList.add('is-live');
          if (elState) elState.textContent = '(live)';
        })
        .catch(function () {
          if (done) return;
          done = true; clearTimeout(timer);
          tryNext(i + 1);
        });
    })(0);
  }

  /* ======================================================================
     Rolling-wheel transition between pages
     Progressive enhancement: if anything here fails, the click falls
     through to normal navigation.
     ====================================================================== */
  if (!reduceMotion) {
    var loaderWheel = document.querySelector('#loader .loader-wheel');
    document.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var a = e.target.closest && e.target.closest('a');
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
      var href = a.getAttribute('href');
      if (!href || href.charAt(0) === '#' || /^(https?:|mailto:|tel:)/i.test(href)) return;
      var url;
      try { url = new URL(href, location.href); } catch (err) { return; }
      if (url.origin !== location.origin || url.pathname === location.pathname) return;

      e.preventDefault();
      var wipe = document.createElement('div');
      wipe.className = 'route-wipe';
      var holder = document.createElement('div');
      holder.className = 'loader-wheel';
      holder.innerHTML = loaderWheel ? loaderWheel.innerHTML : '';
      wipe.appendChild(holder);
      document.body.appendChild(wipe);
      var went = false;
      var go = function () { if (!went) { went = true; window.location.href = href; } };
      setTimeout(go, 450);
      setTimeout(go, 1200);   // failsafe
    });

    // Back/forward restores the page from cache with the transition panel
    // still over it. Clear it on the way in, or the visitor sees a blank screen.
    var clearWipe = function () {
      var w = document.querySelectorAll('.route-wipe');
      for (var i = w.length - 1; i >= 0; i--) { if (w[i].parentNode) w[i].parentNode.removeChild(w[i]); }
    };
    window.addEventListener('pageshow', clearWipe);
    window.addEventListener('popstate', clearWipe);
    window.addEventListener('hashchange', clearWipe);
  }

  /* ---------- Table of contents highlighting (project pages) ---------- */
  var tocLinks = document.querySelectorAll('.toc a[href^="#"]');
  if (tocLinks.length && 'IntersectionObserver' in window) {
    var headings = [];
    each(tocLinks, function (a) {
      var h = document.querySelector(a.getAttribute('href'));
      if (h) headings.push({ link: a, el: h });
    });
    var tocObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        headings.forEach(function (h) { h.link.classList.toggle('is-active', h.el === entry.target); });
      });
    }, { rootMargin: '-15% 0px -70% 0px', threshold: 0 });
    headings.forEach(function (h) { tocObserver.observe(h.el); });
  }
})();
