/* ==========================================================================
   Instituto de Nutrigenética y Nutrigenómica Traslacional
   Interactividad del sitio: menús, buscador, idioma, filtros,
   selección de perfiles/estudios y formularios de demostración.
   ========================================================================== */
(function () {
  'use strict';

  var params = new URLSearchParams(window.location.search);

  /* ---------- Menús desplegables (navegación y enlaces rápidos) ---------- */
  var toggles = Array.prototype.slice.call(document.querySelectorAll('[data-dropdown]'));

  function setOpen(btn, open) {
    var panel = document.getElementById(btn.getAttribute('aria-controls'));
    btn.setAttribute('aria-expanded', String(open));
    if (panel) panel.hidden = !open;
  }

  function closeAll(except) {
    toggles.forEach(function (btn) {
      if (btn !== except) setOpen(btn, false);
    });
  }

  /* ---------- Botón «Menú» (pantallas pequeñas) ----------
     El CSS muestra la lista del menú cuando el botón tiene aria-expanded="true". */
  var menuBtn = document.querySelector('.boton-menu');

  function setMenuOpen(open) {
    if (menuBtn) menuBtn.setAttribute('aria-expanded', String(open));
  }

  function menuIsOpen() {
    return !!menuBtn && menuBtn.getAttribute('aria-expanded') === 'true';
  }

  if (menuBtn) {
    menuBtn.addEventListener('click', function () {
      var open = !menuIsOpen();
      closeAll();
      setMenuOpen(open);
    });
  }

  toggles.forEach(function (btn) {
    btn.addEventListener('click', function (event) {
      event.stopPropagation();
      var open = btn.getAttribute('aria-expanded') === 'true';
      closeAll(btn);
      // Un desplegable fuera del menú (p. ej. «Enlaces rápidos») cierra el menú.
      if (!btn.closest('.menu-principal')) setMenuOpen(false);
      setOpen(btn, !open);
    });
  });

  document.addEventListener('click', function (event) {
    if (!event.target.closest('.menu-elemento')) closeAll();
    if (menuIsOpen() && !event.target.closest('nav')) setMenuOpen(false);
  });

  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;
    var openBtn = toggles.filter(function (b) { return b.getAttribute('aria-expanded') === 'true'; })[0];
    closeAll();
    if (openBtn) {
      openBtn.focus();
    } else if (menuIsOpen()) {
      setMenuOpen(false);
      menuBtn.focus();
    }
  });

  /* ---------- Buscador ---------- */
  var searchBtn = document.querySelector('[data-search-toggle]');
  if (searchBtn) {
    searchBtn.addEventListener('click', function () {
      var bar = document.getElementById(searchBtn.getAttribute('aria-controls'));
      var open = searchBtn.getAttribute('aria-expanded') !== 'true';
      closeAll();
      searchBtn.setAttribute('aria-expanded', String(open));
      bar.hidden = !open;
      if (open) bar.querySelector('input').focus();
    });
  }

  /* ---------- Selector de idioma (la traducción se conectará después) ---------- */
  document.querySelectorAll('.selector-idioma').forEach(function (group) {
    var buttons = group.querySelectorAll('button');
    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        buttons.forEach(function (b) { b.setAttribute('aria-pressed', String(b === btn)); });
        document.documentElement.lang = btn.dataset.lang || 'es';
      });
    });
  });

  /* ---------- Filtros por categoría ----------
     <div data-filter-group="tema"> con botones data-filter="valor"
     y elementos data-filter-item="tema" data-cat="valor otro".
     El valor inicial puede venir en la URL: pagina.html?tema=valor */
  document.querySelectorAll('[data-filter-group]').forEach(function (group) {
    var name = group.dataset.filterGroup;
    var chips = group.querySelectorAll('[data-filter]');
    var items = document.querySelectorAll('[data-filter-item="' + name + '"]');

    function apply(value) {
      chips.forEach(function (c) { c.setAttribute('aria-pressed', String(c.dataset.filter === value)); });
      items.forEach(function (item) {
        var cats = (item.dataset.cat || '').split(' ');
        item.hidden = value !== 'todos' && cats.indexOf(value) === -1;
      });
      document.dispatchEvent(new CustomEvent('filterchange', { detail: { group: name, value: value } }));
    }

    chips.forEach(function (chip) {
      chip.addEventListener('click', function () { apply(chip.dataset.filter); });
    });

    var initial = params.get(name);
    var valid = Array.prototype.some.call(chips, function (c) { return c.dataset.filter === initial; });
    apply(valid ? initial : 'todos');
  });

  /* ---------- Selección de un elemento con panel de detalle ----------
     <div data-select-group="perfil"> con botones data-select="id-del-panel"
     y paneles data-panel="perfil" id="id-del-panel".
     El valor inicial puede venir en la URL: pagina.html?perfil=id */
  document.querySelectorAll('[data-select-group]').forEach(function (group) {
    var name = group.dataset.selectGroup;
    var options = Array.prototype.slice.call(group.querySelectorAll('[data-select]'));
    var panels = document.querySelectorAll('[data-panel="' + name + '"]');
    var syncFields = document.querySelectorAll('[data-sync="' + name + '"]');

    function select(id) {
      options.forEach(function (o) { o.setAttribute('aria-pressed', String(o.dataset.select === id)); });
      panels.forEach(function (p) { p.hidden = p.id !== id; });
      syncFields.forEach(function (field) { field.value = id; });
    }

    options.forEach(function (o) {
      o.addEventListener('click', function () { select(o.dataset.select); });
    });

    syncFields.forEach(function (field) {
      field.addEventListener('change', function () { select(field.value); });
    });

    // Si un filtro oculta el elemento elegido, se elige el primero visible.
    function keepVisible() {
      var itemOf = function (o) { return o.closest('[data-filter-item]') || o; };
      var current = options.filter(function (o) { return o.getAttribute('aria-pressed') === 'true'; })[0];
      if (current && !itemOf(current).hidden) return;
      var firstVisible = options.filter(function (o) { return !itemOf(o).hidden; })[0];
      if (firstVisible) select(firstVisible.dataset.select);
    }
    document.addEventListener('filterchange', keepVisible);

    var initial = params.get(name);
    var valid = options.some(function (o) { return o.dataset.select === initial; });
    var pressed = options.filter(function (o) { return o.getAttribute('aria-pressed') === 'true'; })[0];
    if (options.length) {
      select(valid ? initial : (pressed || options[0]).dataset.select);
      keepVisible();
    }
  });

  /* ---------- Formularios de demostración ----------
     Muestran el mensaje de confirmación sin enviar datos.
     Al conectar el backend, sustituir por el envío real. */
  document.querySelectorAll('form[data-demo]').forEach(function (form) {
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var ok = form.querySelector('.mensaje-exito');
      if (ok) {
        ok.hidden = false;
        ok.focus();
      }
    });
  });
})();
