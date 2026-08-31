/* ==========================================================================
   Dominic Siwiec | dominicsiwiec.com
   Shared behaviour for all pages.
   The .js-reveal / .fast-load flags are set by the small inline script in
   each page's <head>, so content never flashes.
   ========================================================================== */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia &&
                     window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Footer year ---------- */
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Photos: mark slots that actually loaded an image ---------- */
  Array.prototype.forEach.call(document.querySelectorAll('.photo-slot img'), function (img) {
    var slot = img.closest('.photo-slot');
    if (!slot) return;
    var ok = function () { slot.classList.add('has-photo'); };
    var fail = function () { img.remove(); };          // fall back to the placeholder
    if (img.complete) { img.naturalWidth ? ok() : fail(); }
    else { img.addEventListener('load', ok); img.addEventListener('error', fail); }
  });

  /* ---------- Mobile nav toggle ---------- */
  var toggle = document.getElementById('navToggle');
  var links  = document.getElementById('navLinks');

  if (toggle && links) {
    toggle.addEventListener('click', function () {
      var open = links.classList.toggle('is-open');
      toggle.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
    });
    links.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        links.classList.remove('is-open');
        toggle.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ---------- Header shadow once scrolled ---------- */
  var header = document.getElementById('siteHeader');
  if (header) {
    var onScroll = function () { header.classList.toggle('is-stuck', window.scrollY > 12); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---------- Reveal elements as they scroll into view ---------- */
  var revealEls = document.querySelectorAll('.reveal');

  if (!('IntersectionObserver' in window)) {
    Array.prototype.forEach.call(revealEls, function (el) { el.classList.add('is-visible'); });
  } else {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -40px 0px', threshold: 0 });
    Array.prototype.forEach.call(revealEls, function (el) { revealObserver.observe(el); });

    // Safety net: a fast scroll can jump an element clean past the viewport
    // before the observer fires, so sweep anything already scrolled into view.
    var sweeping = false;
    var sweep = function () {
      sweeping = false;
      var left = 0;
      Array.prototype.forEach.call(revealEls, function (el) {
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

  /* ---------- Highlight the nav link for the section in view ---------- */
  var navAnchors = document.querySelectorAll('.nav-links a[href*="#"]');
  var sections = [];
  Array.prototype.forEach.call(navAnchors, function (a) {
    var hash = a.getAttribute('href').split('#')[1];
    if (!hash) return;
    var target = document.getElementById(hash);
    if (target) sections.push({ link: a, el: target });
  });

  if (sections.length && 'IntersectionObserver' in window) {
    var sectionObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        sections.forEach(function (s) {
          s.link.classList.toggle('is-active', s.el === entry.target);
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
    sections.forEach(function (s) { sectionObserver.observe(s.el); });
  }

  /* ======================================================================
     Scroll tachometer
     The needle sweeps a 240 degree arc from 0 to 8000 as you scroll, and
     starts shaking as it climbs into the red band near the end of the page.
     ====================================================================== */
  var speedo = document.getElementById('speedo');
  if (speedo) {
    var needle  = speedo.querySelector('.gauge-needle');
    var fill    = speedo.querySelector('.gauge-fill');
    var rpmEl   = speedo.querySelector('[data-rpm]');
    var SWEEP   = 240;          // degrees of travel
    var START   = -120;         // needle drawn pointing up, so 0 sits at lower-left
    var MAX_RPM = 8000;
    var REDLINE = 6500;
    var SHAKE_FROM = 0.62;      // shake starts a bit past halfway
    var MAX_SHAKE  = 3.4;       // degrees at full song
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
      // ease the needle toward wherever the scroll position put it
      shown += (target - shown) * 0.17;
      if (Math.abs(target - shown) < 0.0004) shown = target;

      // shake ramps in over the last third and peaks at the top of the range
      var t = Math.min(Math.max((shown - SHAKE_FROM) / (1 - SHAKE_FROM), 0), 1);
      var amp = t * t * MAX_SHAKE;
      var wob = amp
        ? (Math.sin(now * 0.047) * 0.55 + Math.sin(now * 0.131) * 0.30 +
           (Math.random() - 0.5) * 0.50) * amp
        : 0;

      needle.style.transform = 'rotate(' + (START + shown * SWEEP + wob).toFixed(2) + 'deg)';
      setRpm(shown * MAX_RPM + (wob * 0.4 / SWEEP) * MAX_RPM);

      raf = (amp > 0.02 || shown !== target) ? window.requestAnimationFrame(frame) : null;
    };

    var kick = function () {
      if (!raf) raf = window.requestAnimationFrame(frame);
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
        } else {
          kick();
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
     "Projects" rather than whichever card happens to be on screen.
     ====================================================================== */
  (function () {
    var links = Array.prototype.slice.call(document.querySelectorAll('.rail-link'));
    if (!links.length) return;

    var here = location.pathname.replace(/index\.html$/, '');
    if (here.length > 1 && here.charAt(here.length - 1) !== '/') here += '/';

    var parse = function (a) {
      var href = a.getAttribute('href') || '';
      var i = href.indexOf('#');
      return { path: (i < 0 ? href : href.slice(0, i)) || '/', hash: i < 0 ? '' : href.slice(i + 1) };
    };

    /* ---- collapsible groups ---- */
    var groups = Array.prototype.slice.call(document.querySelectorAll('.rail-group'));
    groups.forEach(function (g) {
      var id     = 'rail_' + (g.getAttribute('data-group') || '');
      var caret  = g.querySelector('.rail-caret');
      var open   = false;

      // open automatically when this group owns the page you are on
      Array.prototype.forEach.call(g.querySelectorAll('.rail-link'), function (a) {
        if (a.getAttribute('data-match') === here) open = true;
      });
      if (!open) {
        try { open = sessionStorage.getItem(id) === '1'; } catch (e) {}
      }

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

    /* ---- which entry is lit ---- */
    var pairs = [];
    links.forEach(function (a) {
      var p = parse(a);
      if (a.getAttribute('data-match') === here) a.classList.add('is-active');
      if (p.path !== here) return;                       // points at another page
      if (!p.hash) { a.classList.add('is-active'); return; }
      // sub-links never win the scroll highlight, only the group heading does
      if (a.classList.contains('rail-link--sub')) return;
      var el = document.getElementById(p.hash);
      if (el) pairs.push({ link: a, el: el });
    });

    if (pairs.length < 2) return;
    pairs.sort(function (x, y) {
      return x.el.getBoundingClientRect().top - y.el.getBoundingClientRect().top;
    });

    var pending = false;
    var mark = function () {
      pending = false;
      var line = window.scrollY + window.innerHeight * 0.34;
      var best = null;
      for (var i = 0; i < pairs.length; i++) {
        if (pairs[i].el.getBoundingClientRect().top + window.scrollY <= line) best = pairs[i];
      }
      if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 6) {
        best = pairs[pairs.length - 1];
      }
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
     Rolling-wheel transition between pages
     Progressive enhancement: if anything here fails the click falls through
     to normal navigation.
     ====================================================================== */
  if (!reduceMotion) {
    var loaderWheel = document.querySelector('#loader .loader-wheel');

    document.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      var a = e.target.closest && e.target.closest('a');
      if (!a) return;
      if (a.target === '_blank' || a.hasAttribute('download')) return;

      var href = a.getAttribute('href');
      if (!href || href.charAt(0) === '#') return;
      if (/^(https?:|mailto:|tel:)/i.test(href)) return;   // external

      // same-origin page navigations only (ignore pure in-page anchors)
      var url;
      try { url = new URL(href, location.href); } catch (err) { return; }
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname) return;      // just a hash jump

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
      setTimeout(go, 430);
      setTimeout(go, 1200);   // failsafe
    });

    /* Going back lands on a page restored from the back/forward cache, which
       still has the transition panel sitting over it. Clear it on the way in,
       otherwise the visitor gets a blank screen. */
    var clearWipe = function () {
      var w = document.querySelectorAll('.route-wipe');
      for (var i = w.length - 1; i >= 0; i--) {
        if (w[i].parentNode) w[i].parentNode.removeChild(w[i]);
      }
    };
    window.addEventListener('pageshow', clearWipe);
    window.addEventListener('popstate', clearWipe);
    window.addEventListener('hashchange', clearWipe);
  }

  /* ---------- Table of contents highlighting (project pages) ---------- */
  var tocLinks = document.querySelectorAll('.toc a[href^="#"]');
  if (tocLinks.length && 'IntersectionObserver' in window) {
    var headings = [];
    Array.prototype.forEach.call(tocLinks, function (a) {
      var h = document.querySelector(a.getAttribute('href'));
      if (h) headings.push({ link: a, el: h });
    });

    var tocObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        headings.forEach(function (h) {
          h.link.classList.toggle('is-active', h.el === entry.target);
        });
      });
    }, { rootMargin: '-15% 0px -70% 0px', threshold: 0 });

    headings.forEach(function (h) { tocObserver.observe(h.el); });
  }
})();
