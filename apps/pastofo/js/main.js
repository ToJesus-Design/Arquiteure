/* Pastofo — main.js — vanilla JS, zero dependencies */
(function () {
  'use strict';

  /* ---- Sticky header shadow on scroll ---- */
  const header = document.getElementById('site-header');
  if (header) {
    const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---- Mobile nav toggle ---- */
  const burger  = document.getElementById('nav-hamburger');
  const mobileNav = document.getElementById('nav-mobile');
  if (burger && mobileNav) {
    burger.addEventListener('click', () => {
      const open = mobileNav.classList.toggle('open');
      burger.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', String(open));
    });

    /* Close menu when a link is clicked */
    mobileNav.querySelectorAll('a').forEach(a =>
      a.addEventListener('click', () => {
        mobileNav.classList.remove('open');
        burger.classList.remove('open');
        burger.setAttribute('aria-expanded', 'false');
      })
    );
  }

  /* ---- Contact form — client-side demo handler ---- */
  const form    = document.getElementById('contact-form');
  const success = document.getElementById('form-success');
  if (form && success) {
    form.addEventListener('submit', e => {
      e.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      /* Disable button while "sending" */
      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.textContent = 'A enviar…';

      /* Simulate network request (replace with real fetch/action) */
      setTimeout(() => {
        form.style.display = 'none';
        success.style.display = 'block';
      }, 900);
    });
  }

  /* ---- Smooth anchor scroll with offset for sticky header ---- */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', e => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      const offset = header ? header.offsetHeight + 16 : 24;
      window.scrollTo({ top: target.offsetTop - offset, behavior: 'smooth' });
    });
  });

  /* ---- Intersection observer: fade-in on scroll ---- */
  if ('IntersectionObserver' in window) {
    const cards = document.querySelectorAll('.product-card, .feature-item, .value-card, .timeline-item');
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.animationPlayState = 'running';
          entry.target.style.opacity = '1';
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    cards.forEach(card => {
      card.style.opacity = '0';
      card.style.animationPlayState = 'paused';
      card.style.animation = 'fadeUp .5s ease both';
      observer.observe(card);
    });
  }
})();
