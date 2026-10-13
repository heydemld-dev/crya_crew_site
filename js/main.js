/* =========================================================
   CRYA CREW — скрипты страницы
   ========================================================= */
(function () {
  'use strict';

  /* 1. Хедер: фон после прокрутки + полоса прогресса */
  var header = document.getElementById('header');
  var progress = document.getElementById('progress');

  function onScroll() {
    var y = window.scrollY || document.documentElement.scrollTop;
    if (header) header.classList.toggle('is-scrolled', y > 30);

    if (progress) {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.width = (h > 0 ? (y / h) * 100 : 0) + '%';
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* 2. Мобильное меню */
  var burger = document.getElementById('burger');
  var nav = document.getElementById('nav');

  function closeNav() {
    if (!nav || !burger) return;
    nav.classList.remove('is-open');
    burger.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Открыть меню');
  }

  if (burger && nav) {
    burger.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      burger.classList.toggle('is-open', open);
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    });

    nav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', closeNav);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeNav();
    });
  }

  /* 3. Плавное появление блоков при прокрутке */
  var revealEls = document.querySelectorAll('.reveal');

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        var delay = parseInt(el.getAttribute('data-delay') || '0', 10);
        el.style.transitionDelay = (delay * 90) + 'ms';
        el.classList.add('is-visible');
        io.unobserve(el);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* 4. Бегущая строка: дублируем содержимое для бесшовного цикла */
  var track = document.getElementById('marqueeTrack');
  if (track) track.innerHTML += track.innerHTML;

  /* 5. Анимация столбцов «поминутного» рейтинга */
  var bars = document.querySelectorAll('.highlight__bars span');
  if (bars.length && 'IntersectionObserver' in window) {
    bars.forEach(function (b) { b.style.transform = 'scaleY(0)'; });
    var bo = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        bars.forEach(function (b, i) {
          setTimeout(function () { b.style.transform = 'scaleY(1)'; }, i * 70);
        });
        bo.disconnect();
      });
    }, { threshold: 0.3 });
    var host = document.querySelector('.highlight__bars');
    if (host) bo.observe(host);
  }

  /* 6. Текущий год в подвале */
  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
})();
