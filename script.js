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
     Speedometer scroll gauge
     The needle sweeps a 240 degree arc as you scroll and drops into the
     red band over the last fifth of the page.
     ====================================================================== */
  var speedo = document.getElementById('speedo');
  if (speedo) {
    var needle   = speedo.querySelector('.gauge-needle');
    var fill     = speedo.querySelector('.gauge-fill');
    var readout  = speedo.querySelector('.gauge-readout');
    var SWEEP    = 240;          // degrees of travel
    var START    = -120;         // needle drawn pointing up, so 0% sits at lower-left
    var ARC_LEN  = parseFloat(fill && fill.getAttribute('data-arc')) || 0;
    var ticking  = false;

    var render = function () {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var pct = max > 8 ? Math.min(Math.max(window.scrollY / max, 0), 1) : 0;

      if (needle) needle.style.transform = 'rotate(' + (START + pct * SWEEP) + 'deg)';
      if (fill && ARC_LEN) fill.style.strokeDashoffset = String(ARC_LEN * (1 - pct));
      if (readout) readout.textContent = Math.round(pct * 100);

      speedo.classList.toggle('is-redline', pct >= 0.8);
      speedo.classList.toggle('is-on', window.scrollY > 60);
      ticking = false;
    };

    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; window.requestAnimationFrame(render); }
    }, { passive: true });
    window.addEventListener('resize', render, { passive: true });
    render();
  }

  /* ======================================================================
     Cursor-reactive background wash
     Pointer-driven only, so it never runs on touch devices.
     ====================================================================== */
  var glow = document.getElementById('cursor-glow');
  if (glow && !reduceMotion && window.matchMedia && window.matchMedia('(hover: hover)').matches) {
    var tx = window.innerWidth / 2, ty = window.innerHeight * 0.3;
    var cx = tx, cy = ty;
    var raf = null;

    var step = function () {
      cx += (tx - cx) * 0.08;          // ease toward the pointer
      cy += (ty - cy) * 0.08;
      glow.style.setProperty('--mx', cx.toFixed(1) + 'px');
      glow.style.setProperty('--my', cy.toFixed(1) + 'px');
      if (Math.abs(tx - cx) > 0.5 || Math.abs(ty - cy) > 0.5) raf = window.requestAnimationFrame(step);
      else raf = null;
    };

    window.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch') return;
      tx = e.clientX; ty = e.clientY;
      glow.classList.add('is-on');
      if (!raf) raf = window.requestAnimationFrame(step);
    }, { passive: true });

    window.addEventListener('pointerdown', function () { glow.classList.add('is-on'); }, { passive: true });
  }

  /* ======================================================================
     Live YouTube subscriber count
     Two keyless public endpoints, tried in order. If both fail the markup's
     starting numbers stay on screen, so the block never looks broken.
     ====================================================================== */
  var subsBox = document.getElementById('subs');
  if (subsBox) {
    var CHANNEL = subsBox.getAttribute('data-channel');
    var GOAL    = parseInt(subsBox.getAttribute('data-goal'), 10) || 100000;

    var elCount = subsBox.querySelector('[data-subs-count]');
    var elViews = subsBox.querySelector('[data-subs-views]');
    var elVideos = subsBox.querySelector('[data-subs-videos]');
    var elBar   = subsBox.querySelector('[data-subs-bar]');
    var elPct   = subsBox.querySelector('[data-subs-pct]');

    var group = function (n) { return n.toLocaleString('en-US'); };

    var paint = function (subs, views, videos) {
      if (elCount && subs)  elCount.textContent  = group(subs);
      if (elViews && views) elViews.textContent  = group(views);
      if (elVideos && videos) elVideos.textContent = group(videos);
      if (subs) {
        var pct = Math.min(subs / GOAL, 1);
        if (elBar) elBar.style.width = (pct * 100).toFixed(1) + '%';
        if (elPct) elPct.textContent = Math.round(pct * 100) + '% there';
      }
    };

    // paint the starting values so the bar animates even before the fetch lands
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
      if (i >= sources.length) return;
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
