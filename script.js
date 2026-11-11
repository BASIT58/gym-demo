// Anti-clickjacking (CSP frame-ancestors needs a real HTTP header; this is the fallback)
if (window.top !== window.self) document.documentElement.style.display = 'none';

// ================== إعدادات (عدّلها) ==================
const CONFIG = {
  gym: 'GRIT Gym',
  whatsapp: '201000000000', // رقم واتساب الجيم بالصيغة الدولية بدون + (مثال مصر: 2010xxxxxxxx)
  supabaseUrl: 'https://jbabkedjihqhbvcyhghy.supabase.co',          // مثال: https://xxxxxxxx.supabase.co
  supabaseKey: 'sb_publishable_nIE6qeSyr0YUUj2XdUW1vw_rjfBJ5l7'           // Publishable / anon key (الـ public مش الـ service_role أبداً)
};
// =======================================================

// Navbar background on scroll
const nav = document.getElementById('nav');
const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 40);
onScroll();
window.addEventListener('scroll', onScroll, { passive: true });

// Mobile menu
const burger = document.getElementById('burger');
const menu = document.getElementById('menu');
burger.addEventListener('click', () => {
  const open = menu.classList.toggle('open');
  burger.setAttribute('aria-expanded', open);
});
menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
  menu.classList.remove('open');
  burger.setAttribute('aria-expanded', false);
}));

// Drawer extras: lock scroll, Esc, click overlay, reset on resize
const closeMenu = () => { menu.classList.remove('open'); burger.setAttribute('aria-expanded', false); document.body.style.overflow = ''; };
burger.addEventListener('click', () => { document.body.style.overflow = menu.classList.contains('open') ? 'hidden' : ''; });
menu.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
nav.addEventListener('click', e => { if (e.target === nav) closeMenu(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
window.addEventListener('resize', () => { if (innerWidth > 1024) closeMenu(); });

// Counting stats when visible
const counters = document.querySelectorAll('[data-count]');
const run = el => {
  const target = +el.dataset.count, dur = 1400, t0 = performance.now();
  const step = t => {
    const p = Math.min((t - t0) / dur, 1);
    el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))).toLocaleString('en');
    if (p < 1) requestAnimationFrame(step); else el.textContent = target.toLocaleString('en') + '+';
  };
  requestAnimationFrame(step);
};
const io = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { run(e.target); io.unobserve(e.target); } });
}, { threshold: .6 });
counters.forEach(c => io.observe(c));

document.getElementById('year').textContent = new Date().getFullYear();


// ===== 3D pricing carousel =====
(() => {
  const stage = document.getElementById('stage');
  const plans = [...stage.querySelectorAll('.plan')];
  const dotsBox = document.getElementById('dots');
  const prev = document.getElementById('prevPlan');
  const next = document.getElementById('nextPlan');
  let cur = plans.findIndex(p => p.classList.contains('popular'));
  if (cur < 0) cur = 0;

  const dots = plans.map((p, i) => {
    const b = document.createElement('button');
    b.setAttribute('aria-label', 'الباقة ' + (i + 1));
    b.addEventListener('click', () => go(i));
    dotsBox.appendChild(b);
    return b;
  });

  function render() {
    plans.forEach((p, i) => {
      const d = i - cur;
      p.style.setProperty('--d', Math.max(-3, Math.min(3, d)));
      p.style.setProperty('--abs', Math.min(3, Math.abs(d)));
      p.classList.toggle('active', d === 0);
      p.classList.toggle('hide', Math.abs(d) > 2);
      p.setAttribute('aria-hidden', d !== 0);
    });
    dots.forEach((b, i) => b.classList.toggle('on', i === cur));
    prev.disabled = cur === 0;
    next.disabled = cur === plans.length - 1;
  }
  function go(i) { cur = Math.max(0, Math.min(plans.length - 1, i)); render(); }

  prev.addEventListener('click', () => go(cur - 1));
  next.addEventListener('click', () => go(cur + 1));

  // click a side card to bring it to the center
  plans.forEach((p, i) => p.addEventListener('click', e => {
    if (i !== cur) { e.preventDefault(); go(i); }
  }));

  // swipe / drag
  let x0 = null, moved = false;
  stage.addEventListener('pointerdown', e => { x0 = e.clientX; moved = false; });
  stage.addEventListener('pointermove', e => {
    if (x0 !== null && Math.abs(e.clientX - x0) > 8) { moved = true; stage.classList.add('drag'); }
  });
  const end = e => {
    if (x0 === null) return;
    const dx = e.clientX - x0;
    if (Math.abs(dx) > 45) go(cur + (dx < 0 ? 1 : -1));
    x0 = null; stage.classList.remove('drag');
  };
  stage.addEventListener('pointerup', end);
  stage.addEventListener('pointercancel', () => { x0 = null; stage.classList.remove('drag'); });
  stage.addEventListener('click', e => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);

  // keyboard
  document.getElementById('carousel').addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') go(cur - 1);
    if (e.key === 'ArrowRight') go(cur + 1);
  });

  // mouse tilt on the active card (desktop only)
  if (matchMedia('(hover:hover)').matches) {
    stage.addEventListener('mousemove', e => {
      const a = stage.querySelector('.plan.active .plan-in');
      if (!a) return;
      const r = a.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - .5, py = (e.clientY - r.top) / r.height - .5;
      a.style.setProperty('--ry', (px * 14).toFixed(1) + 'deg');
      a.style.setProperty('--rx', (-py * 14).toFixed(1) + 'deg');
    });
    stage.addEventListener('mouseleave', () => {
      const a = stage.querySelector('.plan.active .plan-in');
      if (a) { a.style.setProperty('--ry', '0deg'); a.style.setProperty('--rx', '0deg'); }
    });
  }
  render();
})();


// ===== Booking: modal + forms =====
// SECURITY MODEL: whatever a visitor types is only ever handled as plain text.
//  1) never inserted with innerHTML (only textContent / DOM nodes / .value)
//  2) cleaned + validated here, and validated again by database constraints (supabase.sql)
//  3) sent as JSON (never concatenated into a URL or SQL), WhatsApp text goes through encodeURIComponent
(() => {
  const PAGE_LOADED = Date.now();
  const COOLDOWN_MS = 20000;   // 1 booking per 20s per visitor
  const MIN_FILL_MS = 2500;    // humans need more than 2.5s to open the page and fill a form
  let lastSent = 0;

  // ---------- plain-text helpers ----------
  const INVISIBLE = /[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2060-\u2069\uFEFF]/g; // control, zero-width, bidi-override
  const FORBIDDEN = /[<>{}\[\]`$=;"()\/\\|^~]/;                                                        // never valid inside a person's name
  const clean = s => String(s ?? '').normalize('NFC').replace(INVISIBLE, '').replace(/\s+/g, ' ').trim();
  const latinDigits = s => s
    .replace(/[\u0660-\u0669]/g, d => d.charCodeAt(0) - 0x0660)
    .replace(/[\u06F0-\u06F9]/g, d => d.charCodeAt(0) - 0x06F0);
  const normPhone = raw => {
    let d = latinDigits(clean(raw)).replace(/\D/g, '');
    if (d.startsWith('0020')) d = d.slice(4);
    else if (d.startsWith('20') && d.length === 12) d = d.slice(2);
    if (d.length === 10 && d[0] === '1') d = '0' + d;
    return d;                                   // canonical: 01xxxxxxxxx
  };
  const phoneOk = d => /^01[0125]\d{8}$/.test(d);
  const nameError = n => n.length < 2 ? 'اكتب اسمك (حرفين على الأقل).'
    : n.length > 60 ? 'الاسم طويل زيادة.'
    : FORBIDDEN.test(n) ? 'الاسم فيه رموز مش مسموحة.' : '';
  const field = (form, n) => form.elements.namedItem(n);   // never form.name (clashes with the form's own property)

  // ---------- plans ----------
  const plansData = [...document.querySelectorAll('.plan .btn[data-plan]')]
    .map(b => ({ name: b.dataset.plan, price: b.dataset.price }));
  const priceOf = n => (plansData.find(p => p.name === n) || {}).price || '';
  const validPlan = n => (plansData.some(p => p.name === n) || n === 'استشارة') ? n : 'استشارة';
  const waLink = t => `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(t)}`;
  const bookingText = d => `مرحباً ${CONFIG.gym} 👋\nأنا ${d.name}\nرقمي: ${d.phone}\nعايز أشترك في: ${d.plan}${priceOf(d.plan) ? ' (' + priceOf(d.plan) + ')' : ''}`;

  const fillSelect = sel => {
    sel.replaceChildren(
      ...plansData.map(p => new Option(`${p.name} - ${p.price}`, p.name)),
      new Option('مش متأكد، عايز استشارة', 'استشارة'));
  };
  const bkSelect = document.getElementById('bkSelect');
  const joinPlan = document.getElementById('joinPlan');
  fillSelect(bkSelect); fillSelect(joinPlan);
  joinPlan.value = 'استشارة';

  // ---------- honeypot (bots fill every field, humans never see this one) ----------
  document.querySelectorAll('#joinForm,#bookForm').forEach(f => {
    const i = document.createElement('input');
    i.className = 'hp'; i.name = 'website'; i.tabIndex = -1; i.autocomplete = 'off';
    i.setAttribute('aria-hidden', 'true');
    f.append(i);
  });

  // ---------- remember visitor (re-cleaned on read: localStorage can be edited by anyone) ----------
  const store = {
    get() {
      try {
        const v = JSON.parse(localStorage.getItem('grit_visitor')) || {};
        const name = clean(v.name).slice(0, 60), phone = normPhone(v.phone);
        return { name: nameError(name) ? '' : name, phone: phoneOk(phone) ? phone : '' };
      } catch { return {}; }
    },
    set(v) { try { localStorage.setItem('grit_visitor', JSON.stringify(v)); } catch {} }
  };
  const prefill = form => {
    const v = store.get(), n = field(form, 'name'), p = field(form, 'phone');
    if (v.name && !n.value) n.value = v.name;
    if (v.phone && !p.value) p.value = v.phone;
  };
  prefill(document.getElementById('joinForm'));

  // ---------- validation ----------
  const setErr = (input, text) => {
    input.classList.toggle('invalid', !!text);
    input.setAttribute('aria-invalid', text ? 'true' : 'false');
    const e = input.closest('label').querySelector('.err');
    if (e) e.textContent = text || '';
  };
  const validate = form => {
    const nEl = field(form, 'name'), pEl = field(form, 'phone');
    const name = clean(nEl.value), phone = normPhone(pEl.value);
    setErr(nEl, nameError(name));
    setErr(pEl, phoneOk(phone) ? '' : 'اكتب رقم موبايل مصري صحيح، مثال 01012345678.');
    const bad = form.querySelector('.invalid');
    if (bad) { bad.focus(); return null; }
    return { name, phone, plan: validPlan(clean(field(form, 'plan').value)), hp: field(form, 'website').value };
  };
  ['joinForm', 'bookForm'].forEach(id => {
    const f = document.getElementById(id);
    ['name', 'phone'].forEach(n => field(f, n).addEventListener('input', () => setErr(field(f, n), '')));
  });
  const tooSoon = () => Date.now() - lastSent < COOLDOWN_MS;
  const waitMsg = 'استنى شوية قبل ما تبعت طلب تاني.';

  // ---------- send ----------
  async function send(data, btn, source) {
    const url = waLink(bookingText(data));
    window.open(url, '_blank', 'noopener,noreferrer');   // synchronous so browsers don't block it
    btn.disabled = true; btn.classList.add('loading');
    const looksLikeBot = !!data.hp || (Date.now() - PAGE_LOADED < MIN_FILL_MS);
    if (CONFIG.supabaseUrl && CONFIG.supabaseKey && !looksLikeBot) {
      try {
        const headers = { 'Content-Type': 'application/json', 'apikey': CONFIG.supabaseKey, 'Prefer': 'return=minimal' };
        if (CONFIG.supabaseKey.startsWith('eyJ')) headers.Authorization = 'Bearer ' + CONFIG.supabaseKey;
        const res = await fetch(CONFIG.supabaseUrl.replace(/\/$/, '') + '/rest/v1/bookings', {
          method: 'POST', headers,
          signal: typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(8000) : undefined,
          body: JSON.stringify({ name: data.name, phone: data.phone, plan: data.plan, price: priceOf(data.plan) || null, source })
        });
        if (!res.ok) console.error('Supabase error', res.status);
      } catch (err) { console.error('Supabase network error'); }
    }
    lastSent = Date.now();
    btn.disabled = false; btn.classList.remove('loading');
    store.set({ name: data.name, phone: data.phone });
    return url;
  }

  // ---------- modal ----------
  const dlg = document.getElementById('bookDialog');
  const formView = document.getElementById('bkFormView');
  const doneView = document.getElementById('bkDone');
  const bookForm = document.getElementById('bookForm');
  const bkMsg = document.getElementById('bkMsg');
  const setPlanHeader = () => {
    const v = field(bookForm, 'plan').value;
    document.getElementById('bkPlan').textContent = v === 'استشارة' ? 'استشارة مجانية' : v;
    document.getElementById('bkPrice').textContent = priceOf(v);
  };
  function openBooking(plan) {
    formView.hidden = false; doneView.hidden = true; bkMsg.textContent = ''; bkMsg.className = 'msg';
    field(bookForm, 'plan').value = validPlan(plan); setPlanHeader(); prefill(bookForm);
    dlg.showModal();
    setTimeout(() => (field(bookForm, 'name').value ? field(bookForm, 'phone') : field(bookForm, 'name')).focus(), 50);
  }
  document.querySelectorAll('.plan .btn[data-plan]').forEach(b =>
    b.addEventListener('click', () => openBooking(b.dataset.plan)));
  field(bookForm, 'plan').addEventListener('change', setPlanHeader);
  document.getElementById('bkClose').addEventListener('click', () => dlg.close());
  document.getElementById('bkOk').addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });

  bookForm.addEventListener('submit', async e => {
    e.preventDefault();
    bkMsg.className = 'msg'; bkMsg.textContent = '';
    const data = validate(bookForm); if (!data) return;
    if (tooSoon()) { bkMsg.className = 'msg err'; bkMsg.textContent = waitMsg; return; }
    const url = await send(data, bookForm.querySelector('button[type=submit]'), 'modal');
    document.getElementById('bkDoneTitle').textContent = `تمام يا ${data.name}!`;
    document.getElementById('bkDoneText').textContent = `سجّلنا طلبك لباقة ${data.plan}. كمّل الرسالة على واتساب وهنكلمك على ${data.phone}.`;
    document.getElementById('bkWa').href = url;
    formView.hidden = true; doneView.hidden = false;
  });

  // ---------- bottom form ----------
  const joinForm = document.getElementById('joinForm');
  const joinMsg = document.getElementById('formMsg');
  joinForm.addEventListener('submit', async e => {
    e.preventDefault();
    joinMsg.className = 'msg'; joinMsg.textContent = '';
    const data = validate(joinForm); if (!data) return;
    if (tooSoon()) { joinMsg.className = 'msg err'; joinMsg.textContent = waitMsg; return; }
    const url = await send(data, joinForm.querySelector('button[type=submit]'), 'form');
    const a = document.createElement('a');
    a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent = 'دوس هنا';
    joinMsg.className = 'msg ok';
    joinMsg.replaceChildren(
      document.createTextNode(`تم يا ${data.name}! لو واتساب ماتفتحش `), a, document.createTextNode(' وابعت الرسالة.'));
  });

  // ---------- whatsapp buttons ----------
  const generalWa = waLink(`مرحباً ${CONFIG.gym}، عندي استفسار.`);
  document.getElementById('waFloat').href = generalWa;
  const mWa = document.getElementById('mWa'); if (mWa) mWa.href = generalWa;

  // hero "احجز حصة تجريبية" scrolls to form and preselects consult
  document.querySelectorAll('a[href="#join"]').forEach(a => a.addEventListener('click', () => { joinPlan.value = 'استشارة'; }));

  // ---------- mobile sticky bar: show after the hero, hide while the booking form is on screen ----------
  const mCta = document.getElementById('mCta');
  if (mCta && 'IntersectionObserver' in window) {
    let heroSeen = true, joinSeen = false;
    const upd = () => mCta.classList.toggle('show', !heroSeen && !joinSeen);
    new IntersectionObserver(en => { heroSeen = en[0].isIntersecting; upd(); }, { threshold: .15 }).observe(document.getElementById('top'));
    new IntersectionObserver(en => { joinSeen = en[0].isIntersecting; upd(); }, { threshold: .2 }).observe(document.getElementById('join'));
  }
})();
