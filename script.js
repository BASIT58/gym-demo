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
(() => {
  const plansData = [...document.querySelectorAll('.plan .btn[data-plan]')]
    .map(b => ({ name: b.dataset.plan, price: b.dataset.price }));
  const priceOf = n => (plansData.find(p => p.name === n) || {}).price || '';
  const waLink = t => `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(t)}`;
  const bookingText = d => `مرحباً ${CONFIG.gym} 👋\nأنا ${d.name}\nرقمي: ${d.phone}\nعايز أشترك في: ${d.plan}${priceOf(d.plan) ? ' (' + priceOf(d.plan) + ')' : ''}`;

  // fill plan selects
  const fillSelect = (sel, withConsult) => {
    sel.innerHTML = plansData.map(p => `<option value="${p.name}">${p.name} - ${p.price}</option>`).join('')
      + (withConsult ? '<option value="استشارة">مش متأكد، عايز استشارة</option>' : '');
  };
  const bkSelect = document.getElementById('bkSelect');
  const joinPlan = document.getElementById('joinPlan');
  fillSelect(bkSelect, true);
  fillSelect(joinPlan, true);
  joinPlan.value = 'استشارة';

  // honeypot against bots
  document.querySelectorAll('#joinForm,#bookForm').forEach(f => f.insertAdjacentHTML('beforeend','<input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">'));

  // remember visitor
  const store = {
    get() { try { return JSON.parse(localStorage.getItem('grit_visitor')) || {}; } catch { return {}; } },
    set(v) { try { localStorage.setItem('grit_visitor', JSON.stringify(v)); } catch {} }
  };
  const prefill = form => {
    const v = store.get();
    if (v.name && !form.name.value) form.name.value = v.name;
    if (v.phone && !form.phone.value) form.phone.value = v.phone;
  };
  prefill(document.getElementById('joinForm'));

  // validation
  const phoneOk = p => /^(\+?20|0)?1[0125]\d{8}$/.test(p.replace(/[\s-]/g, ''));
  const setErr = (input, text) => {
    input.classList.toggle('invalid', !!text);
    const e = input.closest('label').querySelector('.err');
    if (e) e.textContent = text || '';
  };
  const validate = form => {
    const name = form.name.value.trim(), phone = form.phone.value.trim();
    setErr(form.name, name.length < 2 ? 'اكتب اسمك.' : '');
    setErr(form.phone, phoneOk(phone) ? '' : 'اكتب رقم موبايل مصري صحيح، مثال 01012345678.');
    const bad = form.querySelector('.invalid');
    if (bad) { bad.focus(); return null; }
    return { name, phone, plan: form.plan.value, hp: form.website ? form.website.value : '' };
  };
  ['joinForm', 'bookForm'].forEach(id => {
    const f = document.getElementById(id);
    ['name', 'phone'].forEach(n => f[n].addEventListener('input', () => setErr(f[n], '')));
  });

  // send: opens WhatsApp with ready message + (optional) posts to endpoint
  async function send(data, btn, source) {
    const url = waLink(bookingText(data));
    window.open(url, '_blank', 'noopener'); // synchronous so browsers don't block it
    btn.disabled = true; btn.classList.add('loading');
    if (CONFIG.supabaseUrl && CONFIG.supabaseKey && !data.hp) {
      try {
        const headers = { 'Content-Type': 'application/json', 'apikey': CONFIG.supabaseKey, 'Prefer': 'return=minimal' };
        if (CONFIG.supabaseKey.startsWith('eyJ')) headers.Authorization = 'Bearer ' + CONFIG.supabaseKey;
        const res = await fetch(CONFIG.supabaseUrl.replace(/\/$/, '') + '/rest/v1/bookings', {
          method: 'POST',
          headers,
          body: JSON.stringify({ name: data.name, phone: data.phone, plan: data.plan, price: priceOf(data.plan) || null, source: source })
        });
        if (!res.ok) console.error('Supabase error', res.status, await res.text());
      } catch (err) { console.error('Supabase network error', err); }
    }
    btn.disabled = false; btn.classList.remove('loading');
    store.set({ name: data.name, phone: data.phone });
    return url;
  }

  // modal
  const dlg = document.getElementById('bookDialog');
  const formView = document.getElementById('bkFormView');
  const doneView = document.getElementById('bkDone');
  const bookForm = document.getElementById('bookForm');
  const setPlanHeader = () => {
    document.getElementById('bkPlan').textContent = bookForm.plan.value === 'استشارة' ? 'استشارة مجانية' : bookForm.plan.value;
    document.getElementById('bkPrice').textContent = priceOf(bookForm.plan.value);
  };
  function openBooking(plan) {
    formView.hidden = false; doneView.hidden = true;
    bookForm.plan.value = plan; setPlanHeader(); prefill(bookForm);
    dlg.showModal();
    setTimeout(() => (bookForm.name.value ? bookForm.phone : bookForm.name).focus(), 50);
  }
  document.querySelectorAll('.plan .btn[data-plan]').forEach(b =>
    b.addEventListener('click', () => openBooking(b.dataset.plan)));
  bookForm.plan.addEventListener('change', setPlanHeader);
  document.getElementById('bkClose').addEventListener('click', () => dlg.close());
  document.getElementById('bkOk').addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });

  bookForm.addEventListener('submit', async e => {
    e.preventDefault();
    const data = validate(bookForm); if (!data) return;
    const url = await send(data, bookForm.querySelector('button[type=submit]'), 'modal');
    document.getElementById('bkDoneTitle').textContent = `تمام يا ${data.name}!`;
    document.getElementById('bkDoneText').textContent = `سجّلنا طلبك لباقة ${data.plan}. كمّل الرسالة على واتساب وهنكلمك على ${data.phone}.`;
    document.getElementById('bkWa').href = url;
    formView.hidden = true; doneView.hidden = false;
  });

  // bottom form
  const joinForm = document.getElementById('joinForm');
  const joinMsg = document.getElementById('formMsg');
  joinForm.addEventListener('submit', async e => {
    e.preventDefault();
    joinMsg.className = 'msg'; joinMsg.textContent = '';
    const data = validate(joinForm); if (!data) return;
    const url = await send(data, joinForm.querySelector('button[type=submit]'), 'form');
    joinMsg.className = 'msg ok';
    joinMsg.innerHTML = `تم يا ${data.name}! لو واتساب ماتفتحش <a href="${url}" target="_blank" rel="noopener">دوس هنا</a> وابعت الرسالة.`;
  });

  // floating whatsapp
  document.getElementById('waFloat').href = waLink(`مرحباً ${CONFIG.gym}، عندي استفسار.`);

  // smart: hero "احجز حصة تجريبية" scrolls to form and preselects consult
  document.querySelectorAll('a[href="#join"]').forEach(a => a.addEventListener('click', () => { joinPlan.value = 'استشارة'; }));
})();