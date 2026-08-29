/* ==========================================================================
   Dominic Siwiec — dominicsiwiec.com
   Shared behaviour for all pages.
   ========================================================================== */
(function () {
  'use strict';

  /* ---------- Footer year ---------- */
  /* (The .js-reveal flag that enables scroll animations is set by the small
      inline script in each page's <head>, so content never flashes.) */
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Mobile nav toggle ---------- */
  var toggle = document.getElementById('navToggle');
  var links  = document.getElementById('navLinks');

  if (toggle && links) {
    toggle.addEventListener('click', function () {
      var open = links.classList.toggle('is-open');
      toggle.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
    });

    // Close the menu after tapping a link on mobile
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
    var onScroll = function () {
      header.classList.toggle('is-stuck', window.scrollY > 12);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---------- Reveal elements as they scroll into view ---------- */
  var revealEls = document.querySelectorAll('.reveal');

  if (!('IntersectionObserver' in window)) {
    // Old browser: just show everything.
    Array.prototype.forEach.call(revealEls, function (el) {
      el.classList.add('is-visible');
    });
  } else {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -40px 0px', threshold: 0 });

    Array.prototype.forEach.call(revealEls, function (el) {
      revealObserver.observe(el);
    });
  }

  /* ---------- Highlight the nav link for the section in view ---------- */
  var navAnchors = document.querySelectorAll('.nav-links a[href^="#"]');
  var sections = [];

  Array.prototype.forEach.call(navAnchors, function (a) {
    var target = document.querySelector(a.getAttribute('href'));
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

  /* ---------- Tachometer scroll progress bar ---------- */
  var tach = document.getElementById('tach');
  if (tach) {
    var ticking = false;
    var updateTach = function () {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var pct = max > 0 ? Math.min(window.scrollY / max, 1) : 0;
      tach.style.transform = 'scaleX(' + pct + ')';
      ticking = false;
    };
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; window.requestAnimationFrame(updateTach); }
    }, { passive: true });
    window.addEventListener('resize', updateTach, { passive: true });
    updateTach();
  }

  /* ---------- Rolling-wheel transition between pages ----------
     Progressive enhancement only: if anything here fails, the click falls
     through to normal navigation. */
  var reduceMotion = window.matchMedia &&
                     window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!reduceMotion) {
    var loaderWheel = document.querySelector('#loader .loader-wheel');

    document.addEventListener('click', function (e) {
      // Respect modifier clicks, middle-click, and new-tab links
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      var a = e.target.closest && e.target.closest('a');
      if (!a) return;
      if (a.target === '_blank' || a.hasAttribute('download')) return;

      var href = a.getAttribute('href');
      if (!href || href.charAt(0) === '#') return;
      if (/^(https?:|mailto:|tel:)/i.test(href)) return;   // external
      if (!/\.html?($|[?#])/i.test(href)) return;          // only our pages

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
      setTimeout(go, 430);        // normal case
      setTimeout(go, 1200);       // failsafe if the animation never fires
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
