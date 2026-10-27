/* 보는 사람용 화면 — #/ 주소로 페이지를 바꾼다
   #/              홈 (배너 · 캘린더 · 기수별 멤버 · 졸업 · 맨 아래)
   #/m/id/탭        멤버 프로필
   #/group/기수/탭   단체 · 합방
   #/listen        노래 듣기
   #/calendar      캘린더
   #/stars         별표
   #/about         소개 · 2차 창작 가이드라인 */

const view = $('#view');
const state = { calMonth: null, calPick: null, listenKinds: new Set(['cover', 'original', 'album']), search: '', guideOpen: 1 };

// 프로필 탭 순서는 홈/단체와 다르다 (팬아트·짤을 앞으로)
const PROFILE_TABS = [
  ['cover', 'Covers'], ['fanart', 'Fan art'], ['meme', 'Memes'], ['clip', 'Clips'], ['original', 'Originals'], ['album', 'Albums'],
];
const GROUP_EN = { cover: 'Covers', original: 'Originals', album: 'Albums', clip: 'Clips' };

/* ─── 공통 조각 ─── */
const pad2 = n => String(n).padStart(2, '0');
const memberNames = it => it.members.map(id => Data.member(id)?.name).filter(Boolean);
const canDelete = it => Auth.user && it.byEmail && Auth.user.email === it.byEmail;
const active = () => Data.site.members.filter(m => !m.graduated);
const graduates = () => Data.site.members.filter(m => m.graduated);
const genNo = g => pad2(Data.site.groups.indexOf(g));

function linkBtns(m) {
  const L = m.links || {};
  const one = (k, title) => `<a class="lk ${L[k] ? '' : 'off'}" href="${esc(L[k] || '#')}" target="_blank" rel="noopener" title="${title}" aria-label="${esc(m.name)} ${title}">${ICON[k]}</a>`;
  return one('chzzk', '치지직') + one('x', 'X') + one('youtube', '유튜브');
}

function starBtn(it) {
  const on = Favs.has(it.id);
  return `<button type="button" class="star ${on ? 'on' : ''}" data-fav="${esc(it.id)}" aria-label="별표" aria-pressed="${on}">${on ? ICON.star : ICON.starO}</button>`;
}

function emptyBox(text, kind, members, group) {
  return `<div class="empty">
    <div class="empty-star">${ICON.sparkle}</div>
    <p>${text}</p>
    <button type="button" class="btn sm line" data-upload='${esc(JSON.stringify({ kind, members, group }))}'>${esc(t('list.first'))}</button>
  </div>`;
}

/* 노래 목록 */
function songList(items, label) {
  if (!items.length) return '';
  return `<ol class="songs" data-label="${esc(label || '')}">${items.map((it, i) => `
    <li class="song ${Player.current()?.id === it.id ? 'now' : ''}" data-play="${esc(it.id)}">
      <span class="s-n">${pad2(i + 1)}</span>
      <span class="s-th" style="background-image:url('${esc(it.thumb || '')}')">${it.playable ? `<i>${ICON.play}</i>` : ''}</span>
      <span class="s-t"><b>${esc(it.title)}</b><small>${esc(memberNames(it).join(' · '))}${it.group && Data.group(it.group) ? ` · ${esc(Data.group(it.group).label)} 단체` : it.group === 'all' ? ' · 전체' : ''}</small></span>
      <span class="srcs">${it.ytId ? '<span>YouTube</span>' : ''}${it.hasDrive ? '<span>Drive</span>' : ''}</span>
      <span class="s-x">
        ${starBtn(it)}
        <a class="icon-btn sm" href="${esc(it.open)}" target="_blank" rel="noopener" aria-label="${esc(t('list.open'))}" title="${esc(t('list.open'))}">${ICON.ext}</a>
        ${canDelete(it) ? `<button type="button" class="icon-btn sm" data-del="${esc(it.id)}" aria-label="지우기">${ICON.trash}</button>` : ''}
      </span>
      <span class="playc">${ICON.play}</span>
    </li>`).join('')}</ol>`;
}

function clipGrid(items) {
  if (!items.length) return '';
  return `<div class="clips">${items.map(it => `
    <article class="clip" data-view-item="${esc(it.id)}">
      <div class="c-th" style="${it.thumb ? `background-image:url('${esc(it.thumb)}')` : ''}">${it.thumb ? '' : it.link?.type === 'chzzk' ? ICON.chzzk : it.link?.type === 'x' ? ICON.x : ICON.video}</div>
      <div class="c-meta"><b>${esc(it.title || '클립')}</b><small>${esc(memberNames(it).join(' · '))}${it.by ? ` · ${esc(it.by)}` : ''}</small></div>
      <div class="c-x">${starBtn(it)}${canDelete(it) ? `<button type="button" class="icon-btn sm" data-del="${esc(it.id)}" aria-label="지우기">${ICON.trash}</button>` : ''}</div>
    </article>`).join('')}</div>`;
}

function imageGrid(items) {
  if (!items.length) return '';
  return `<div class="masonry">${items.map(it => `
    <figure class="art" data-view-item="${esc(it.id)}">
      ${it.thumb ? `<img src="${esc(it.thumb)}" alt="${esc(it.title)}" loading="lazy">` : `<div class="art-link">${it.link?.type === 'x' ? ICON.x : ICON.ext}<span>${esc(it.title || '링크로 보기')}</span></div>`}
      <figcaption><span>${esc(it.title)}${it.by ? ` · ${esc(it.by)}` : ''}</span>${starBtn(it)}${canDelete(it) ? `<button type="button" class="icon-btn sm" data-del="${esc(it.id)}" aria-label="지우기">${ICON.trash}</button>` : ''}</figcaption>
    </figure>`).join('')}</div>`;
}

function itemsBlock(kind, items, label, ctx = {}) {
  if (!items.length) return emptyBox(esc(t('list.empty', { kind: KIND[kind]?.name || '' })), kind, ctx.members, ctx.group);
  if (KIND[kind]?.music) return `
    <div class="list-head">
      <span>${esc(t('list.count', { n: items.length }))}</span><span class="grow"></span>
      <button type="button" class="btn sm" data-playall data-shuffle="1">${ICON.shuffle} ${esc(t('list.shuffle'))}</button>
      <button type="button" class="btn sm solid" data-playall>${ICON.play} ${esc(t('list.playAll'))}</button>
    </div>` + songList(items, label);
  if (KIND[kind]?.image) return imageGrid(items);
  return clipGrid(items);
}

/* ─── 홈 ─── */
function renderHome() {
  const s = Data.site, b = s.banner || {};
  const bimg = imgUrl(b.image, 1920);
  const songs = Data.items.filter(i => KIND[i.kind]?.music).length;
  const others = Data.items.length - songs;
  view.innerHTML = `
    <section class="banner ${bimg ? 'has-img' : ''}" ${bimg ? `style="background-image:url('${esc(bimg)}')"` : ''}>
      <div class="bn-in">
        <div class="bn-t">
          <span class="sc">${esc(t('home.kicker'))}</span>
          <h1>${esc(t('home.title'))}</h1>
          <p>${th('home.sub')}</p>
        </div>
        <div class="bn-stats">
          <div><b>${songs}</b><small>${esc(t('home.songs'))}</small></div>
          <div><b>${others}</b><small>${esc(t('home.others'))}</small></div>
          ${s.fanCafe ? `<a class="cafe" href="${esc(s.fanCafe)}" target="_blank" rel="noopener" aria-label="${esc(t('home.cafe'))}" title="${esc(t('home.cafe'))}"><img src="assets/logo.svg" alt=""></a>` : ''}
        </div>
      </div>
    </section>

    <section id="cal">${calendarHtml()}</section>

    ${s.groups.map(g => {
      const ms = active().filter(m => m.group === g.id);
      if (!ms.length) return '';
      return `<section class="gen" style="--g:${esc(g.color)}">
        <div class="gen-h"><b>${genNo(g)}</b><i class="it">${esc(g.name)}</i><span>${esc(g.label)}</span></div>
        <div class="gen-cards">${ms.map(m => memberCard(m)).join('')}</div>
      </section>`;
    }).join('')}

    ${graduates().length ? `<section class="gen">
      <div class="gen-h"><span class="grad-t">${esc(t('home.graduation'))}</span><span>${esc(t('home.graduationKo'))}</span></div>
      <div class="gen-cards">${graduates().map(m => memberCard(m, true)).join('')}</div>
    </section>` : ''}

    ${footerHtml()}`;
}

function memberCard(m, grad) {
  const img = imgUrl(m.avatar, 500);
  return `<div class="mcard ${grad ? 'grad' : ''}" style="--c:${esc(m.color)}">
    <a class="mc-img ${img ? 'has-img' : ''}" href="#/m/${esc(m.id)}" aria-label="${esc(m.name)} 프로필">
      ${img ? `<img src="${esc(img)}" alt="" loading="lazy">` : `<span class="mc-ini">${esc(m.name.slice(0, 1))}</span>`}
      <span class="mc-en">${esc((m.en || '').toUpperCase())}</span>
    </a>
    <a class="mc-cap" href="#/m/${esc(m.id)}"><b>${esc(m.name)}</b><i>${esc(m.en || '')}</i></a>
    ${grad ? '' : `<div class="mc-links">${linkBtns(m)}</div>`}
  </div>`;
}

function footerHtml() {
  return `<footer class="foot">
    <div class="foot-in">
      <div class="foot-top">
        <div class="foot-brand">
          <div><img src="assets/logo.svg" alt="">STELLIVE <i>Archive</i></div>
          <p>${th('footer.note')}</p>
        </div>
        <nav aria-label="${esc(t('footer.archive'))}"><span class="kk">${esc(t('footer.archive'))}</span><a href="#/listen">${esc(t('nav.listen'))}</a><a href="#/group">${esc(t('nav.group'))}</a><a href="#/stars">${esc(t('nav.stars'))}</a></nav>
        <nav aria-label="${esc(t('footer.contribute'))}"><span class="kk">${esc(t('footer.contribute'))}</span><a href="#" data-upload="{}">${esc(t('upload.title'))}</a><a href="#/about">About · ${esc(t('nav.about'))}</a><a href="admin.html">${esc(t('footer.admin'))}</a></nav>
        <nav aria-label="${esc(t('footer.official'))}"><span class="kk">${esc(t('footer.official'))}</span><a href="https://stellive.me" target="_blank" rel="noopener">${esc(t('footer.officialSite'))}</a></nav>
      </div>
      <div class="foot-bot">
        <span>${Auth.user ? esc(t('footer.loginOn', { name: Auth.user.name })) : esc(t('footer.loginOff'))}</span>
        ${Theme.dots()}
        <a href="#top" data-top>TOP ${ICON.chevR.replace('M9 5l7 7-7 7', 'M5 15l7-7 7 7')}</a>
      </div>
    </div>
  </footer>`;
}

/* ─── 캘린더 ─── */
const EVENT_TYPES = { birthday: '생일', debut: '데뷔', event: '이벤트', broadcast: '방송', release: '발매', etc: '기타' };
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function eventsOn(y, mo, d) {
  const iso = `${y}-${pad2(mo + 1)}-${pad2(d)}`, md = iso.slice(5), out = [];
  for (const m of Data.site.members) {
    if (m.graduated) continue;
    if (m.birthday && m.birthday.slice(-5) === md) out.push({ type: 'birthday', title: `${m.name} 생일`, color: m.color });
    if (m.debut && m.debut.slice(5) === md && +m.debut.slice(0, 4) < y) out.push({ type: 'debut', title: `${m.name} 데뷔 ${y - +m.debut.slice(0, 4)}주년`, color: m.color });
  }
  for (const e of Data.site.events) {
    if (e.date <= iso && iso <= (e.end || e.date)) out.push({ type: e.type || 'event', title: e.title, color: Data.member(e.members?.[0])?.color, url: e.url });
  }
  return out;
}

function calendarHtml(big) {
  const now = new Date();
  const [y, mo] = state.calMonth || [now.getFullYear(), now.getMonth()];
  const first = new Date(y, mo, 1).getDay(), days = new Date(y, mo + 1, 0).getDate();
  const todayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
  let cells = '';
  for (let i = 0; i < first; i++) cells += '<div class="cd blank"></div>';
  for (let d = 1; d <= days; d++) {
    const key = `${y}-${mo}-${d}`, ev = eventsOn(y, mo, d);
    cells += `<button type="button" class="cd ${todayKey === key ? 'today' : ''} ${state.calPick === key ? 'pick' : ''}" data-day="${key}" aria-label="${mo + 1}월 ${d}일${ev.length ? ' 일정 ' + ev.length + '개' : ''}">
      <span class="n">${d}</span>
      ${ev.slice(0, 2).map(e => `<span class="ev" ${e.color ? `style="--c:${esc(e.color)}"` : ''}>${esc(e.title)}</span>`).join('')}
      ${ev.length > 2 ? `<span class="ev more">+${ev.length - 2}</span>` : ''}
    </button>`;
  }
  let list = [];
  if (state.calPick) {
    const [py, pm, pd] = state.calPick.split('-').map(Number);
    list = eventsOn(py, pm, pd).map(e => ({ ...e, d: new Date(py, pm, pd) }));
  } else {
    for (let i = 0; i < 60; i++) {
      const dt = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
      eventsOn(dt.getFullYear(), dt.getMonth(), dt.getDate()).forEach(e => list.push({ ...e, d: dt }));
    }
  }
  const t0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dday = d => { const n = Math.round((d - t0) / 864e5); return n === 0 ? 'D-DAY' : n > 0 ? `D-${n}` : `D+${-n}`; };
  return `<div class="cal ${big ? 'cal-big' : ''}">
    <div class="cal-side">
      <span class="kk">${esc(t('cal.kicker'))}</span>
      <span class="cal-month">${mo + 1}</span>
      <span class="cal-ym">${MONTHS[mo]}, ${y}</span>
      <div class="cal-nav">
        <button type="button" class="icon-btn" data-cal="-1" aria-label="이전 달">${ICON.chevL}</button>
        <button type="button" class="icon-btn" data-cal="1" aria-label="다음 달">${ICON.chevR}</button>
        <button type="button" class="btn sm line" data-cal="0">${esc(t('cal.today'))}</button>
      </div>
      <h3>${state.calPick ? `${+state.calPick.split('-')[1] + 1}월 ${state.calPick.split('-')[2]}일` : esc(t('cal.upcoming'))}</h3>
      ${list.length ? `<ul class="up-list">${list.map(e => `<li style="${e.color ? `--c:${esc(e.color)}` : ''}">
        <span class="d">${state.calPick ? `${e.d.getMonth() + 1}/${e.d.getDate()}` : dday(e.d)}</span>
        <span class="t"><em>${EVENT_TYPES[e.type] || '일정'} · ${e.d.getMonth() + 1}/${e.d.getDate()}</em>${e.url ? `<a href="${esc(e.url)}" target="_blank" rel="noopener">${esc(e.title)}</a>` : esc(e.title)}</span>
      </li>`).join('')}</ul>` : `<p class="muted">${esc(t('cal.none'))}</p>`}
    </div>
    <div class="cal-main">
      <div class="cal-dow">${['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(x => `<span>${x}</span>`).join('')}</div>
      <div class="cal-grid">${cells}</div>
    </div>
  </div>`;
}

/* ─── 멤버 프로필 (캐릭터 인포 가로형) ─── */
function renderMember(id, tab) {
  const m = Data.member(id);
  if (!m) return renderNotFound();
  const g = Data.group(m.group);
  const order = [...active(), ...graduates()];
  const i = order.indexOf(m), prev = order[(i - 1 + order.length) % order.length], next = order[(i + 1) % order.length];
  const counts = Object.fromEntries(KINDS.map(k => [k.id, Data.forMember(id, k.id).length]));
  tab = PROFILE_TABS.some(t => t[0] === tab) ? tab : 'cover';
  const items = Data.forMember(id, tab);
  const art = imgUrl(m.art || m.avatar, 1200);
  const family = ((m.enFull || m.en || m.name).split(' ')[0] || '').toUpperCase();
  const bd = m.birthday ? m.birthday.slice(-5).split('-').map(Number) : null;
  const fanarts = Data.forMember(id, 'fanart').slice(0, 4);
  const sameGen = order.filter(x => x.group === m.group && !!x.graduated === !!m.graduated);

  view.innerHTML = `
    <nav class="pf-nav">
      <a href="#/">${ICON.chevL} ${esc(t('profile.back'))}</a>
      <span>${m.graduated ? 'GRADUATION' : g ? `${genNo(g)} · ${esc(g.name.toUpperCase())} — ${sameGen.indexOf(m) + 1} / ${sameGen.length}` : ''}</span>
      <a href="#/m/${esc(next.id)}" title="${esc(prev.name)} ← → ${esc(next.name)}">${esc((next.en || next.name).toUpperCase())} ${ICON.chevR}</a>
    </nav>

    <article class="pf-card" style="--c:${esc(m.color)}">
      <div class="pf-left">
        <div class="pf-strip" aria-hidden="true"><span>${esc(family)}</span></div>
        <div class="pf-art">
          ${art ? `<img src="${esc(art)}" alt="${esc(m.name)} 일러스트">` : `<span class="ph" aria-hidden="true">${esc(m.name.slice(0, 1))}</span>`}
          <span class="ci" aria-hidden="true">${th('profile.ci')}</span>
        </div>
      </div>
      <div class="pf-right">
        <div>
          <h1 class="pf-name">${esc(m.en || m.name)}</h1>
          <div class="pf-unit"><i>Stellive · ${m.graduated ? 'Graduation' : esc(g?.name || '')}</i></div>
        </div>
        <div class="pf-ko">
          <b>${esc(m.fullName || m.name)}</b>
          <span class="sw" aria-hidden="true"><span style="background:var(--c)"></span><span style="background:color-mix(in srgb, var(--c) 55%, #6d6fd8)"></span><span style="background:color-mix(in srgb, var(--c) 30%, #2b2b78)"></span></span>
        </div>
        <div class="tags">
          ${bd ? `<div class="tag"><span><b>${esc(t('profile.birthday'))}</b>${bd[0]}월 ${bd[1]}일</span></div>` : ''}
          ${m.debut ? `<div class="tag"><span><b>${esc(t('profile.debut'))}</b>${fmtDate(m.debut).replace(/\./g, '. ')}</span></div>` : ''}
          <div class="tag"><span><b>${esc(t('profile.unit'))}</b>${m.graduated ? esc(t('profile.graduated')) : `${esc(g?.label || '')} ${esc((g?.name || '').toUpperCase())}`}</span></div>
        </div>
        ${m.bio ? `<div class="summary"><h3>${esc(t('profile.summary'))}</h3><p>${esc(m.bio)}</p></div>` : ''}
        ${m.quote ? `<p class="quote">“${esc(m.quote)}”</p>` : ''}
        <div class="pf-links">
          ${['chzzk', 'x', 'youtube'].map(k => m.links?.[k] ? `<a class="btn sm" href="${esc(m.links[k])}" target="_blank" rel="noopener">${ICON[k]} ${{ chzzk: '치지직', x: 'X', youtube: 'YouTube' }[k]}</a>` : '').join('')}
          <button type="button" class="btn sm solid" data-playmember="${esc(m.id)}">${ICON.play} ${esc(t('profile.playAll'))}</button>
        </div>
        <div class="mini">
          ${[0, 1, 2, 3].map(n => fanarts[n]
            ? `<button type="button" data-view-item="${esc(fanarts[n].id)}" style="background-image:url('${esc(fanarts[n].thumb || '')}')" aria-label="${esc(fanarts[n].title)}">${fanarts[n].thumb ? '' : fanarts[n].link?.type === 'x' ? ICON.x : ICON.ext}</button>`
            : `<button type="button" data-upload='${esc(JSON.stringify({ kind: 'fanart', members: [m.id] }))}' aria-label="${esc(t('profile.addFanart'))}">${esc(t('profile.addFanart'))}</button>`).join('')}
        </div>
      </div>
    </article>

    <nav class="tabs" aria-label="종류">
      ${PROFILE_TABS.map(([k, en]) => `<a href="#/m/${esc(m.id)}/${k}" class="${tab === k ? 'on' : ''}" ${tab === k ? 'aria-current="page"' : ''}><span class="ko">${KIND[k].name}</span><i>${en}</i>${counts[k] ? `<small>${counts[k]}</small>` : ''}</a>`).join('')}
    </nav>
    <div>
      <div class="list-tools"><button type="button" class="btn sm line" data-upload='${esc(JSON.stringify({ kind: tab, members: [m.id] }))}'>${esc(t('list.add', { kind: KIND[tab].name }))}</button></div>
      <div style="margin-top:72px">${itemsBlock(tab, items, `${m.name} ${KIND[tab].name}`, { members: [m.id] })}</div>
    </div>`;
}

/* ─── 단체 · 합방 ─── */
function renderGroup(gid, tab) {
  tab = GROUP_KINDS.includes(tab) ? tab : 'cover';
  gid = gid || 'all';
  const groups = Data.site.groups.filter(g => Data.membersOf(g.id).length > 1);
  let pool = Data.items.filter(i => Data.isGroupItem(i));
  if (gid === 'duo') pool = pool.filter(i => !i.group && i.members.length >= 2);
  else if (gid !== 'all') {
    const ids = Data.membersOf(gid).map(m => m.id);
    pool = pool.filter(i => i.group === gid || (!i.group && i.members.length >= 2 && i.members.every(x => ids.includes(x))));
  }
  const items = pool.filter(i => i.kind === tab);
  const g = Data.group(gid);
  view.innerHTML = `
    <header class="page-h"><span class="big">${esc(t('group.big'))}</span><span class="ko">${esc(t('group.ko'))}</span></header>
    <nav class="pills" aria-label="기수">
      <a href="#/group/all/${tab}" class="${gid === 'all' ? 'on' : ''}"><b>${esc(t('group.all'))}</b></a>
      ${groups.map(x => `<a href="#/group/${x.id}/${tab}" class="${gid === x.id ? 'on' : ''}"><b>${genNo(x)}</b><i>${esc(x.name)}</i></a>`).join('')}
      <a href="#/group/duo/${tab}" class="${gid === 'duo' ? 'on' : ''}"><b>${esc(t('group.duo'))}</b><i>${esc(t('group.duoKo'))}</i></a>
    </nav>
    <nav class="tabs" aria-label="종류">${GROUP_KINDS.map(k => `<a href="#/group/${gid}/${k}" class="${tab === k ? 'on' : ''}"><span class="ko">${KIND[k].name}</span><i>${GROUP_EN[k]}</i><small>${pool.filter(i => i.kind === k).length || ''}</small></a>`).join('')}</nav>
    <div>
      <div class="list-tools"><button type="button" class="btn sm line" data-upload='${esc(JSON.stringify({ kind: tab, group: g ? g.id : gid === 'all' ? 'all' : '', members: [] }))}'>${esc(t('list.add', { kind: KIND[tab].name }))}</button></div>
      <div style="margin-top:72px">${itemsBlock(tab, items, `${g ? g.label : gid === 'duo' ? t('group.duoKo') : t('group.ko')} ${KIND[tab].name}`, { group: g?.id, members: [] })}</div>
    </div>`;
}

/* ─── 노래 듣기 ─── */
function renderListen() {
  const music = Data.items.filter(i => state.listenKinds.has(i.kind) && i.playable);
  const q = state.search.trim().toLowerCase();
  const shown = q ? music.filter(i => (i.title + ' ' + memberNames(i).join(' ')).toLowerCase().includes(q)) : music;
  const favs = music.filter(i => Favs.has(i.id));
  view.innerHTML = `
    <header class="page-h"><span class="big">${esc(t('listen.big'))}</span><span class="ko">${esc(t('listen.ko'))}</span><p>${esc(t('listen.desc'))}</p></header>
    <div class="chips">
      ${KINDS.filter(k => k.music).map(k => `<button type="button" class="chip ${state.listenKinds.has(k.id) ? 'on' : ''}" data-lk="${k.id}" aria-pressed="${state.listenKinds.has(k.id)}">${k.name}</button>`).join('')}
      <span class="grow"></span>
      <span class="chip-k">${esc(t('listen.preferNote'))}</span>
      <button type="button" class="chip ${Player.prefer === 'drive' ? 'on' : ''}" data-prefer aria-pressed="${Player.prefer === 'drive'}">${esc(t('listen.prefer'))}</button>
    </div>
    <div class="modes">
      <button type="button" class="mode" data-mode="random"><span class="bd">01</span><span class="ko">${esc(t('listen.random'))}</span><small>${esc(t('list.count', { n: music.length }))}</small></button>
      <button type="button" class="mode" data-mode="stars"><span class="bd">02</span><span class="ko">${esc(t('listen.stars'))}</span><small>${esc(t('list.count', { n: favs.length }))} · ${Auth.user ? '구글 계정' : '이 기기'}</small></button>
      <button type="button" class="mode" data-mode="newest"><span class="bd">03</span><span class="ko">${esc(t('listen.newest'))}</span><small>${esc(t('listen.newestDesc'))}</small></button>
    </div>
    <section style="display:flex;flex-direction:column;gap:20px">
      <div class="sec-h"><span class="kk">MEMBERS</span><span class="ko">${esc(t('listen.members'))}</span></div>
      <div class="mgrid">${active().map(m => {
        const n = music.filter(i => i.members.includes(m.id)).length;
        return `<button type="button" class="mpick" data-playmember="${esc(m.id)}" style="--c:${esc(m.color)}" ${n ? '' : 'disabled'}>${avatarHtml(m, 'av md')}<b>${esc(m.name)}</b><small>${esc(t('list.count', { n }))}</small></button>`;
      }).join('')}</div>
      <div class="sec-h" style="margin-top:20px"><span class="kk">UNITS</span><span class="ko">${esc(t('listen.units'))}</span></div>
      <div class="mgrid">${Data.site.groups.map(g => {
        const ids = Data.membersOf(g.id).map(m => m.id);
        const n = music.filter(i => i.group === g.id || i.members.some(x => ids.includes(x))).length;
        return `<button type="button" class="mpick grp" data-playgroup="${esc(g.id)}" style="--c:${esc(g.color)}" ${n ? '' : 'disabled'}><span class="bd">${genNo(g)}</span><i>${esc(g.name)}</i><small>${esc(t('list.count', { n }))}</small></button>`;
      }).join('')}</div>
    </section>
    <section>
      <input class="search" id="songSearch" placeholder="${esc(t('listen.search'))}" value="${esc(state.search)}" aria-label="${esc(t('listen.search'))}">
      ${shown.length ? songList(shown, t('listen.ko')) : emptyBox(esc(t('list.empty', { kind: '노래' })), 'cover', [])}
    </section>`;
  const inp = $('#songSearch');
  inp.addEventListener('input', () => {
    state.search = inp.value;
    const pos = inp.selectionStart;
    renderListen();
    const again = $('#songSearch');
    again.focus();
    again.setSelectionRange(pos, pos);
  });
}

/* ─── 별표 · 캘린더 ─── */
function renderStars() {
  const items = Data.items.filter(i => Favs.has(i.id));
  const music = items.filter(i => KIND[i.kind]?.music), clips = items.filter(i => i.kind === 'clip'), arts = items.filter(i => KIND[i.kind]?.image);
  view.innerHTML = `
    <header class="page-h"><span class="big">${esc(t('stars.big'))}</span><span class="ko">${esc(t('stars.ko'))}</span><p>${Auth.user ? esc(t('stars.login', { name: Auth.user.name })) : esc(t('stars.local'))}</p></header>
    ${items.length ? '' : `<div class="empty"><div class="empty-star">${ICON.sparkle}</div><p>${esc(t('stars.empty'))}</p></div>`}
    ${music.length ? `<section><div class="sec-h"><span class="ko">노래</span></div>${itemsBlock('cover', music, t('stars.ko'))}</section>` : ''}
    ${clips.length ? `<section><div class="sec-h" style="margin-bottom:16px"><span class="ko">클립</span></div>${clipGrid(clips)}</section>` : ''}
    ${arts.length ? `<section><div class="sec-h" style="margin-bottom:16px"><span class="ko">팬아트 · 짤</span></div>${imageGrid(arts)}</section>` : ''}`;
}

function renderCalendarPage() {
  view.innerHTML = `
    <header class="page-h"><span class="big">${esc(t('cal.big'))}</span><span class="ko">${esc(t('cal.ko'))}</span><p>${esc(t('cal.desc'))}</p></header>
    <section id="cal">${calendarHtml(true)}</section>`;
}

function renderNotFound() {
  view.innerHTML = `<div class="empty"><div class="empty-star">${ICON.sparkle}</div><p>${esc(t('notFound'))}</p><a class="btn line" href="#/">${esc(t('nav.home'))}</a></div>`;
}

/* ─── About ─── */
const aboutData = () => {
  const a = Data.site.about || {};
  const d = window.ABOUT_DEFAULT;
  return { facts: a.facts?.length ? a.facts : d.facts, cares: a.cares?.length ? a.cares : d.cares, chapters: a.chapters?.length ? a.chapters : d.chapters };
};

// 가이드라인 본문(글자) → 블록들. 빈 줄 = 문단 끝, "1. " = 번호 항목, "   a. " = 하위 항목, [라벨](주소) = 버튼
function parseGuide(body) {
  const blocks = [];
  let cur = null;
  for (const raw of String(body || '').split('\n')) {
    const line = raw.trimEnd();
    if (!line.trim()) { cur = null; continue; }
    let m;
    if ((m = line.match(/^\[(.+)\]\((https?:\/\/\S+)\)$/))) { blocks.push({ type: 'link', label: m[1], url: m[2] }); cur = null; continue; }
    if ((m = line.match(/^\s+([a-z])\.\s+(.*)$/)) && cur && (cur.type === 'item' || cur.type === 'sub')) {
      const item = cur.type === 'item' ? cur : cur.parent;
      cur = { type: 'sub', n: m[1], text: m[2], parent: item };
      item.subs.push(cur);
      continue;
    }
    if ((m = line.match(/^(\d+)\.\s+(.*)$/))) { cur = { type: 'item', n: m[1], text: m[2], subs: [] }; blocks.push(cur); continue; }
    if (cur && cur.type !== 'link') { cur.text += '\n' + line.trim(); continue; }
    cur = { type: 'p', text: line.trim() };
    blocks.push(cur);
  }
  return blocks;
}

function renderAbout() {
  const A = aboutData();
  view.innerHTML = `
    <section class="about-top">
      <div>
        <span class="page-h" style="margin:0"><span class="big">${esc(t('about.big'))}</span></span>
        <span class="ko" style="font-size:30px;font-weight:700">${esc(t('about.ko'))}</span>
        <p class="lead">${th('about.lead')}</p>
      </div>
      <div class="facts">${A.facts.map((f, i) => `<div><span class="bd">${pad2(i + 1)}</span><div><b>${esc(f[0])}</b><p>${esc(f[1])}</p></div></div>`).join('')}</div>
    </section>

    <section>
      <div class="sec-h" style="margin-bottom:24px"><span class="kk">${esc(t('about.promiseKicker'))}</span><span class="ko">${esc(t('about.promise'))}</span><span class="note">${esc(t('about.promiseNote'))}</span></div>
      <div class="cares">${A.cares.map((c, i) => `<div><span class="bd">${pad2(i + 1)}</span><div><b>${esc(c[0])}</b><p>${esc(c[1])}</p>${c[2] ? `<small>${esc(c[2])}</small>` : ''}</div></div>`).join('')}</div>
      <p class="contact">${esc(t('about.contact'))} ${Data.site.contact ? `<a href="mailto:${esc(Data.site.contact)}">${esc(Data.site.contact)}</a>` : ''}</p>
    </section>

    <section class="guide" id="guide">
      <nav class="g-toc" aria-label="${esc(t('about.guide'))}">
        <span class="kk">${esc(t('about.guideKicker'))}</span>
        <span class="ko">${esc(t('about.guide'))}</span>
        ${A.chapters.map((ch, i) => `<button type="button" data-guide="${i}" aria-current="${state.guideOpen === i}"><span class="bd">${pad2(i)}</span><span class="ko">${esc(ch.title)}</span></button>`).join('')}
        <p>${th('about.source')}</p>
      </nav>
      <div class="g-body">${A.chapters.map((ch, i) => {
        const open = state.guideOpen === i;
        return `<article class="g-ch" id="g${i}">
          <button type="button" data-guide="${i}" aria-expanded="${open}">
            <span class="bd">${pad2(i)}</span>
            <span><span class="ko">${esc(ch.title)}</span><i>${esc(ch.en || '')}</i></span>
            <span class="sign" aria-hidden="true">${open ? '−' : '+'}</span>
          </button>
          ${open ? `<div class="g-in">${parseGuide(ch.body).map(b =>
            b.type === 'p' ? `<p>${esc(b.text)}</p>`
            : b.type === 'link' ? `<a class="btn solid" style="align-self:flex-start" href="${esc(b.url)}" target="_blank" rel="noopener">${esc(b.label)} ${ICON.ext}</a>`
            : `<div class="g-item"><span class="bd">${b.n}</span><div><p>${esc(b.text)}</p>${b.subs.map(sb => `<div class="g-sub"><i>${sb.n}</i><p>${esc(sb.text)}</p></div>`).join('')}</div></div>`
          ).join('')}</div>` : ''}
        </article>`;
      }).join('')}</div>
    </section>
    ${footerHtml()}`;
}

/* ─── 목차 ─── */
const NAV = [
  ['#/', 'nav.home', 'nav.homeEn'], ['#/calendar', 'nav.calendar', 'nav.calendarEn'], ['#/listen', 'nav.listen', 'nav.listenEn'],
  ['#/group', 'nav.group', 'nav.groupEn'], ['#/stars', 'nav.stars', 'nav.starsEn'], ['#/about', 'nav.about', 'nav.aboutEn'],
];
function renderDrawer() {
  const block = (no, name, ms, color) => ms.length ? `<div class="dr-g" style="--g:${esc(color || '#fff')}">
    <div class="dr-gh"><b>${no}</b><i>${esc(name)}</i></div>
    <div class="dr-ms">${ms.map(m => `<a class="dr-m" href="#/m/${esc(m.id)}" data-nav="m-${esc(m.id)}" style="--c:${esc(m.color)}">${esc(m.name)}</a>`).join('')}</div>
  </div>` : '';
  $('#drawer').innerHTML = `
    <div class="dr-head">
      <img src="assets/logo.svg" alt="">
      <div><b>STELLIVE</b><small>${esc(t('nav.title'))}</small></div>
      <button type="button" class="icon-btn" data-drawer-close aria-label="목차 닫기">${ICON.close}</button>
    </div>
    <nav class="dr-nav">${NAV.map(([href, ko, en], i) => `<a href="${href}" data-href="${href}"><span class="no">${pad2(i + 1)}</span><span class="ko">${esc(t(ko))}</span><span class="en">${esc(t(en))}</span></a>`).join('')}</nav>
    <div class="dr-k">${esc(t('nav.members'))}</div>
    <div class="dr-gens">
      ${Data.site.groups.map(g => block(genNo(g), g.name, active().filter(m => m.group === g.id), g.color)).join('')}
      ${block('✦', t('nav.graduation'), graduates(), '#cfc6ff')}
    </div>
    <div class="dr-foot">
      <div class="row">${Theme.dots()}<span class="grow"></span><button type="button" class="btn sm line" data-intro>${esc(t('nav.intro'))}</button></div>
      <div class="row"><button type="button" class="btn sm solid" data-upload="{}">${esc(t('nav.upload'))}</button><div id="login"></div></div>
    </div>`;
  $('#tbLinks').innerHTML = NAV.map(([href, , en]) => `<a href="${href}" data-href="${href}">${esc(t(en))}</a>`).join('');
  paintLogin(Auth.user);
  markNav();
}

function markNav() {
  const [, page, id] = location.hash.split('/');
  const href = '#/' + (page && page !== 'm' ? page : page === 'm' ? '__' : '');
  $$('[data-href]').forEach(a => a.classList.toggle('on', a.dataset.href === href));
  $$('#drawer [data-nav]').forEach(a => a.classList.toggle('on', page === 'm' && a.dataset.nav === 'm-' + id));
}

// data-t="키" 가 붙은 곳에 글자를 채운다
function fillTexts(root = document) {
  $$('[data-t]', root).forEach(el => { el.innerHTML = th(el.dataset.t); });
}

/* ─── 가장자리 메뉴 ─── */
const Menu = {
  hover: matchMedia('(hover: hover) and (min-width: 821px)'),
  openDrawer(byHover) { $('#drawer').classList.add('open'); this.byHover = byHover; $('#indexTab').setAttribute('aria-expanded', 'true'); },
  closeDrawer() { $('#drawer').classList.remove('open'); $('#indexTab').setAttribute('aria-expanded', 'false'); },
  setTop(open) { $('#topbar').classList.toggle('open', open); $('#topBtn').setAttribute('aria-expanded', open); },
  init() {
    $('#edgeLeft').addEventListener('mouseenter', () => this.openDrawer(true));
    $('#indexTab').addEventListener('mouseenter', () => { if (this.hover.matches) this.openDrawer(true); });
    $('#drawer').addEventListener('mouseleave', () => { if (this.byHover) this.closeDrawer(); });
    $('#indexTab').addEventListener('click', () => ($('#drawer').classList.contains('open') ? this.closeDrawer() : this.openDrawer(false)));
    $('#menuBtn').addEventListener('click', () => this.openDrawer(false));
    $('#topBtn').addEventListener('click', () => this.setTop(!$('#topbar').classList.contains('open')));
    document.addEventListener('click', e => {
      if (e.target.closest('[data-drawer-close]')) return this.closeDrawer();
      if ($('#drawer').classList.contains('open') && !e.target.closest('#drawer, #indexTab, #menuBtn, #edgeLeft')) this.closeDrawer();
      if ($('#topbar').classList.contains('open') && !e.target.closest('#topbar, #topBtn')) this.setTop(false);
    });
  },
};

/* ─── 첫 화면 ─── */
const Intro = {
  today: () => new Date().toISOString().slice(0, 10),
  shouldShow() { return store.get('introSkip') !== this.today(); },
  isOpen() { return !$('#intro').hidden && !$('#intro').classList.contains('leaving'); },
  show() {
    const img = imgUrl(Data.site?.banner?.image, 1920);
    const sky = $('#introSky');
    sky.style.backgroundImage = img ? `url("${img}")` : '';
    sky.classList.toggle('has-img', !!img);
    fillTexts($('#intro'));
    $('#introDots').innerHTML = Theme.dots();
    $('#skipToday').checked = store.get('introSkip') === this.today();
    const el = $('#intro');
    el.classList.remove('leaving');
    el.hidden = false;
    document.body.style.overflow = 'hidden';
    Menu.closeDrawer();
  },
  // 왼쪽으로 천천히 밀려나며 사라진다
  hide() {
    if (!this.isOpen()) return;
    if ($('#skipToday').checked) store.set('introSkip', this.today()); else store.del('introSkip');
    const el = $('#intro');
    el.classList.add('leaving');
    document.body.style.overflow = '';
    setTimeout(() => { if (el.classList.contains('leaving')) el.hidden = true; }, 1400);
  },
};

/* ─── 주소 바뀔 때 ─── */
let lastPage = '';
function route(keepScroll) {
  if (!Data.site) return;
  const [, page, a, b] = location.hash.split('/');
  // 커버곡·오리곡 같은 탭만 바뀐 거면 맨 위로 올리지 않는다
  const pageKey = `${page || ''}/${page === 'm' ? a : ''}`;
  if (pageKey === lastPage) keepScroll = true;
  lastPage = pageKey;
  view.classList.toggle('about-v', page === 'about');
  if (!page) renderHome();
  else if (page === 'm') renderMember(decodeURIComponent(a || ''), b);
  else if (page === 'group') renderGroup(a, b);
  else if (page === 'listen') renderListen();
  else if (page === 'calendar') renderCalendarPage();
  else if (page === 'stars') renderStars();
  else if (page === 'about') renderAbout();
  else renderNotFound();
  markNav();
  Menu.closeDrawer();
  Menu.setTop(false);
  if (!keepScroll) window.scrollTo(0, 0);
}

/* ─── 클릭 처리 ─── */
document.addEventListener('click', e => {
  const tg = e.target;
  let el;
  if ((el = tg.closest('[data-fav]'))) { e.stopPropagation(); Favs.toggle(el.dataset.fav); return; }
  if ((el = tg.closest('[data-del]'))) { e.stopPropagation(); deleteItem(el.dataset.del); return; }
  if ((el = tg.closest('[data-upload]'))) { e.preventDefault(); openUpload(JSON.parse(el.dataset.upload || '{}')); return; }
  if (tg.closest('[data-top]')) { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
  if ((el = tg.closest('[data-play]'))) {
    if (tg.closest('a')) return;
    const list = el.closest('.songs');
    const items = $$('[data-play]', list).map(x => Data.item(x.dataset.play)).filter(Boolean);
    const it = Data.item(el.dataset.play);
    if (!it.playable) return openViewer(it);
    Player.play(items, it.id, list.dataset.label);
    return;
  }
  if ((el = tg.closest('[data-playall]'))) {
    const list = el.closest('.list-head').nextElementSibling;
    const items = $$('[data-play]', list).map(x => Data.item(x.dataset.play)).filter(Boolean);
    if (el.dataset.shuffle) { Player.shuffle = true; Player.paintModes(); }
    Player.play(items, null, list.dataset.label);
    return;
  }
  if ((el = tg.closest('[data-playmember]'))) {
    const m = Data.member(el.dataset.playmember);
    const kinds = location.hash.startsWith('#/listen') ? state.listenKinds : new Set(['cover', 'original', 'album']);
    Player.play(Data.items.filter(i => kinds.has(i.kind) && i.members.includes(m.id)), null, `${m.name} 노래`);
    return;
  }
  if ((el = tg.closest('[data-playgroup]'))) {
    const g = Data.group(el.dataset.playgroup), ids = Data.membersOf(g.id).map(m => m.id);
    Player.play(Data.items.filter(i => state.listenKinds.has(i.kind) && (i.group === g.id || i.members.some(x => ids.includes(x)))), null, `${g.label} 노래`);
    return;
  }
  if ((el = tg.closest('[data-mode]'))) {
    const music = Data.items.filter(i => state.listenKinds.has(i.kind) && i.playable);
    const mode = el.dataset.mode;
    if (mode === 'random') { Player.shuffle = true; Player.paintModes(); Player.play(music, null, '전체 랜덤'); }
    if (mode === 'stars') {
      const favs = music.filter(i => Favs.has(i.id));
      if (!favs.length) return toast('별표한 노래가 없다');
      Player.play(favs, null, '별표한 노래');
    }
    if (mode === 'newest') { Player.shuffle = false; Player.paintModes(); Player.play(music, null, '최신순'); }
    return;
  }
  if (tg.closest('[data-prefer]')) { Player.setPrefer(Player.prefer === 'drive' ? 'youtube' : 'drive'); renderListen(); return; }
  if ((el = tg.closest('[data-lk]'))) {
    const k = el.dataset.lk;
    state.listenKinds.has(k) ? state.listenKinds.delete(k) : state.listenKinds.add(k);
    if (!state.listenKinds.size) state.listenKinds.add(k);
    return renderListen();
  }
  if (tg.closest('[data-intro]')) { Intro.show(); return; }
  if ((el = tg.closest('[data-guide]'))) {
    const i = +el.dataset.guide;
    const fromToc = !!el.closest('.g-toc');
    state.guideOpen = fromToc ? i : state.guideOpen === i ? -1 : i;
    route(true);
    if (fromToc) $('#g' + i)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }
  if ((el = tg.closest('[data-view-item]'))) { openViewer(Data.item(el.dataset.viewItem)); return; }
  if ((el = tg.closest('[data-cal]'))) {
    const now = new Date();
    const [y, mo] = state.calMonth || [now.getFullYear(), now.getMonth()];
    const d = +el.dataset.cal;
    state.calMonth = d ? [new Date(y, mo + d).getFullYear(), new Date(y, mo + d).getMonth()] : null;
    state.calPick = null;
    $('#cal').innerHTML = calendarHtml(location.hash.startsWith('#/calendar'));
    return;
  }
  if ((el = tg.closest('[data-day]'))) {
    state.calPick = state.calPick === el.dataset.day ? null : el.dataset.day;
    $('#cal').innerHTML = calendarHtml(location.hash.startsWith('#/calendar'));
    return;
  }
  if (tg.closest('[data-close]') || tg.classList.contains('modal')) closeModals();
});

document.addEventListener('keydown', e => {
  if (Intro.isOpen()) { if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); Intro.hide(); } return; }
  if (e.key === 'Escape') { closeModals(); Menu.closeDrawer(); Menu.setTop(false); }
  if (e.key === ' ' && !Player.bar.hidden && !/INPUT|TEXTAREA|SELECT|BUTTON|A/.test(document.activeElement.tagName)) { e.preventDefault(); Player.toggle(); }
});

/* ─── 보기 창 ─── */
function openViewer(it) {
  if (!it) return;
  const body = $('#viewer .viewer-body');
  let html;
  if (it.isImage && it.driveId) html = `<img class="big-img" src="https://drive.google.com/thumbnail?id=${it.driveId}&sz=w2000" alt="">`;
  else if (it.isImage) html = `<img class="big-img" src="${esc(it.url)}" alt="">`;
  else if (it.ytId && !(Player.prefer === 'drive' && it.hasDrive)) html = `<div class="ratio"><iframe src="https://www.youtube.com/embed/${it.ytId}?autoplay=1&rel=0" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen title="${esc(it.title)}"></iframe></div>`;
  else if (it.link?.type === 'chzzk') html = `<div class="ratio"><iframe src="https://chzzk.naver.com/embed/clip/${esc(it.link.id)}" allow="autoplay; fullscreen" allowfullscreen title="${esc(it.title)}"></iframe></div>`;
  else if (it.driveId && it.media && CFG.driveApiKey) html = `<video class="big-vid" controls autoplay playsinline src="https://www.googleapis.com/drive/v3/files/${it.driveId}?alt=media&key=${CFG.driveApiKey}"></video>`;
  else if (it.driveId) html = `<div class="ratio"><iframe src="https://drive.google.com/file/d/${it.driveId}/preview" allow="autoplay" allowfullscreen title="${esc(it.title)}"></iframe></div>`;
  else if (it.directUrl) html = `<video class="big-vid" controls autoplay playsinline src="${esc(it.directUrl)}"></video>`;
  else if (it.link?.type === 'x') html = `<div class="x-embed"><blockquote class="twitter-tweet" data-theme="${Theme.get() === 'dark' ? 'dark' : 'light'}" data-lang="ko"><a href="${esc(it.url.replace('//x.com', '//twitter.com'))}"></a></blockquote></div>`;
  else html = `<div class="empty"><p>여기서는 바로 못 보여 준다</p></div>`;
  body.innerHTML = html;
  $('#viewer .viewer-foot').innerHTML = `
    <div><b>${esc(it.title)}</b><small>${esc(memberNames(it).join(' · '))}${it.by ? ` · 올린 사람 ${esc(it.by)}` : ''}</small></div>
    <span class="grow"></span>${starBtn(it)}
    <a class="btn sm" href="${esc(it.open)}" target="_blank" rel="noopener">${ICON.ext} ${esc(t('list.open'))}</a>`;
  $('#viewer').hidden = false;
  if (it.link?.type === 'x') loadX().then(() => window.twttr?.widgets?.load(body));
  if (Player.playing && (it.ytId || it.media || it.link?.type === 'chzzk')) Player.toggle(false);
}
function loadX() {
  return (loadX.p ||= new Promise(ok => {
    const s = document.createElement('script');
    s.src = 'https://platform.twitter.com/widgets.js';
    s.onload = ok; s.onerror = ok;
    document.head.append(s);
  }));
}
function closeModals() {
  $$('.modal').forEach(m => (m.hidden = true));
  $('#viewer .viewer-body').innerHTML = '';
  $('#queue').classList.remove('open');
}

/* ─── 올리기 ─── */
const up = { kind: 'cover', members: new Set() };

function openUpload(pre = {}) {
  up.kind = pre.kind || up.kind;
  up.members = new Set(pre.members || []);
  if (!up.members.size) {
    const [, page, id] = location.hash.split('/');
    if (page === 'm') up.members.add(id);
  }
  $('#upKind').innerHTML = KINDS.map(k => `<button type="button" class="chip ${k.id === up.kind ? 'on' : ''}" data-uk="${k.id}" aria-pressed="${k.id === up.kind}">${k.name}</button>`).join('');
  $('#upMembers').innerHTML = Data.site.members.map(m => `<button type="button" class="chip ${up.members.has(m.id) ? 'on' : ''}" data-um="${esc(m.id)}" aria-pressed="${up.members.has(m.id)}" style="--c:${esc(m.color)}">${avatarHtml(m, 'av')}${esc(m.name)}</button>`).join('');
  $('#upGroup').innerHTML = `<option value="">아님</option><option value="all">전체 단체곡</option>` +
    Data.site.groups.map(g => `<option value="${esc(g.id)}">${esc(g.label)} ${esc(g.name)}</option>`).join('');
  $('#upGroup').value = pre.group || '';
  ['#upTitle', '#upUrl', '#upAlt', '#upFile'].forEach(s => ($(s).value = ''));
  $('.drop-txt').textContent = '드라이브에 올릴 파일 — 끌어다 놓거나 눌러서 고르기';
  $('#upStatus').textContent = '';
  fillTexts($('#upload'));
  $('#upHint').textContent = !LIVE ? t('upload.demo') : Auth.user ? t('upload.as', { name: Auth.user.name }) : t('upload.login');
  $('#upload').hidden = false;
}

$('#upload').addEventListener('click', e => {
  const k = e.target.closest('[data-uk]'), mm = e.target.closest('[data-um]');
  if (k) { up.kind = k.dataset.uk; $$('#upKind .chip').forEach(c => { c.classList.toggle('on', c === k); c.setAttribute('aria-pressed', c === k); }); }
  if (mm) { const id = mm.dataset.um; up.members.has(id) ? up.members.delete(id) : up.members.add(id); mm.classList.toggle('on'); mm.setAttribute('aria-pressed', up.members.has(id)); }
});
$('#upFile').addEventListener('change', () => {
  const f = $('#upFile').files[0];
  $('.drop-txt').textContent = f ? `${f.name} · ${(f.size / 1048576).toFixed(1)}MB` : '드라이브에 올릴 파일 — 끌어다 놓거나 눌러서 고르기';
  if (f && !$('#upTitle').value) $('#upTitle').value = f.name.replace(/\.[^.]+$/, '');
});

$('#upload form').addEventListener('submit', async e => {
  e.preventDefault();
  const status = $('#upStatus');
  const members = [...up.members], group = $('#upGroup').value, title = $('#upTitle').value.trim();
  const url = $('#upUrl').value.trim(), alt = $('#upAlt').value.trim(), f = $('#upFile').files[0];
  if (!members.length && !group) return (status.textContent = '멤버를 고르자');
  if (!url && !alt && !f) return (status.textContent = '링크나 파일을 하나 이상 넣자');
  const btn = $('#upSubmit');
  try {
    btn.disabled = true;
    let item;
    if (f) {
      if (f.size > (CFG.maxUploadMB || 35) * 1048576) throw new Error(`${CFG.maxUploadMB || 35}MB 까지만 된다. 큰 영상은 드라이브에 직접 올리고 링크를 붙이자`);
      if (!LIVE) throw new Error('파일 올리기는 서버를 연결한 뒤에 된다');
      status.textContent = '파일 읽는 중…';
      const data = await fileToBase64(f);
      status.textContent = '드라이브에 올리는 중… (큰 파일은 1분쯤 걸린다)';
      item = (await api('upload', { kind: up.kind, title, members, group, filename: f.name, mimeType: f.type, data, url })).item;
    } else {
      const main = url || alt, second = url ? alt : '';
      if (!/^https?:\/\//.test(main) || (second && !/^https?:\/\//.test(second))) throw new Error('링크가 이상하다');
      if (!LIVE) {
        item = { id: 'l_' + Date.now(), kind: up.kind, title: title || main, src: 'link', url: main, alt: second, members, group, by: '나', at: new Date().toISOString() };
        store.set('demoItems', [item, ...store.get('demoItems', [])]);
      } else {
        status.textContent = '올리는 중…';
        item = (await api('addLink', { kind: up.kind, title, url: main, alt: second, members, group })).item;
      }
    }
    Data.items.unshift(enrich(item));
    store.set('cache', { site: Data.site, items: Data.items.map(({ _ok, ...x }) => x) });
    $('#upload').hidden = true;
    toast(t('upload.done'));
    route(true);
  } catch (err) {
    status.textContent = err.message;
  } finally { btn.disabled = false; }
});

async function deleteItem(id) {
  if (!confirm(t('upload.confirmDelete'))) return;
  try {
    if (!LIVE) store.set('demoItems', store.get('demoItems', []).filter(x => x.id !== id));
    else await api('remove', { id });
    Data.items = Data.items.filter(i => i.id !== id);
    toast(t('upload.deleted'));
    route(true);
  } catch (e) { toast(e.message, true); }
}

/* ─── 시작 ─── */
function paintLogin(user) {
  const el = $('#login');
  if (!el) return;
  if (user) {
    el.innerHTML = `<div class="me">${user.picture ? `<img src="${esc(user.picture)}" alt="" referrerpolicy="no-referrer">` : ''}<span>${esc(user.name)}</span><button type="button" class="tiny" id="logout">로그아웃</button></div>`;
    $('#logout').onclick = () => Auth.logout();
  } else Auth.renderButton(el);
}

Auth.on(user => { paintLogin(user); if (user) Favs.sync(); if (Data.site) route(true); });
Favs.on(() => {
  $$('[data-fav]').forEach(b => { const on = Favs.has(b.dataset.fav); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); b.innerHTML = on ? ICON.star : ICON.starO; });
  if (location.hash.startsWith('#/stars')) route(true);
});
Data.on(() => { applySiteStyle(Data.site); fillTexts(); renderDrawer(); route(true); });
addEventListener('hashchange', () => route());

$('#cornerDots').innerHTML = Theme.dots();
$('#introBtn').addEventListener('click', () => Intro.show());
$('#enterBtn').addEventListener('click', () => Intro.hide());
$('#intro').addEventListener('wheel', e => { if (e.deltaY > 30) Intro.hide(); }, { passive: true });
addEventListener('themechange', () => { $('#cornerDots').innerHTML = Theme.dots(); });

starfield($('#sky'));
Menu.init();
Player.init();
$('[data-p="shuffle"]').innerHTML = ICON.shuffle;
$('[data-p="prev"]').innerHTML = ICON.prev;
$('[data-p="next"]').innerHTML = ICON.next;
$('[data-p="repeat"]').innerHTML = ICON.repeat;
$('[data-p="hide"]').innerHTML = ICON.video;
$('[data-p="queue"]').innerHTML = ICON.menu;
$$('.close').forEach(b => (b.innerHTML = ICON.close));
Player.setPlaying(false);
Player.paintModes();
Player.paintPrefer();
Auth.init();
Data.load().then(() => { if (!location.hash.slice(2) && Intro.shouldShow()) Intro.show(); });
