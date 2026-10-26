(() => {
  const menu = document.querySelector('.menu-toggle');
  const nav = document.querySelector('#primary-nav');
  const closeMenu = () => { menu?.setAttribute('aria-expanded', 'false'); menu?.setAttribute('aria-label', 'Open navigation'); nav?.classList.remove('is-open'); };
  menu?.addEventListener('click', () => {
    const open = menu.getAttribute('aria-expanded') !== 'true';
    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    nav.classList.toggle('is-open', open);
  });
  document.addEventListener('keydown', (event) => { if(event.key === 'Escape') closeMenu(); });
  document.addEventListener('click', (event) => { if(!event.target.closest('.site-header')) closeMenu(); });
  const dialog = document.querySelector('#search-dialog');
  const input = document.querySelector('#site-search');
  const results = document.querySelector('#search-results');
  const trigger = document.querySelector('.search-toggle');
  trigger?.addEventListener('click', () => { closeMenu(); dialog.showModal(); input.focus(); });
  dialog?.querySelector('.search-close').addEventListener('click', () => dialog.close());
  dialog?.addEventListener('click', (event) => { if(event.target === dialog) { const rect=dialog.getBoundingClientRect(); if(event.clientX<rect.left || event.clientX>rect.right || event.clientY<rect.top || event.clientY>rect.bottom) dialog.close(); } });
  dialog?.addEventListener('close', () => trigger.focus());
  let timer, controller;
  input?.addEventListener('input', () => {
    clearTimeout(timer); controller?.abort();
    results.replaceChildren();
    const q = input.value.trim();
    if(q.length < 2) return;
    timer = setTimeout(async () => {
      controller = new AbortController();
      results.textContent = 'Looking for a good match…';
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(q)}`, {signal:controller.signal});
        if(!response.ok) throw new Error('Search unavailable');
        const items = await response.json();
        if(input.value.trim() !== q) return;
        results.replaceChildren();
        if(!items.length) { results.textContent = 'No matches yet. Try brakes, tires, or maintenance—or call us for a hand.'; return; }
        for(const item of items) {
          const link=document.createElement('a');link.className='search-result';link.href=item.url;
          const title=document.createElement('strong');title.textContent=item.title;
          const excerpt=document.createElement('span');excerpt.textContent=item.excerpt;
          link.append(title,excerpt);results.append(link);
        }
      } catch(error) { if(error.name !== 'AbortError') results.textContent='Press Search to see results, or call (636) 498-6600 for help.'; }
    }, 250);
  });
  // Preserve real link destinations until the vendor portal is available.
  // Delegation also covers future appointment links and clicks on nested SVG icons.
  document.addEventListener('click', event => {
    const link = event.target.closest?.('a[href="/book/"], a[data-book-appointment]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.hasAttribute('download') || link.target === '_blank') return;
    if (typeof window.AutoOps?.show !== 'function') return;
    try {
      window.AutoOps.show();
      event.preventDefault();
      closeMenu();
    } catch {
      // Let the browser follow the original booking URL when the portal cannot open.
    }
  });
  const notice = document.querySelector('#inquiry-result');
  if(notice) notice.focus({preventScroll:false});

})();
