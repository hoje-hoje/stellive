/* 사이트를 그대로 보면서 고치는 편집 모드 — index.html?edit
   글자를 누르면 그 자리에서 고치고, 그림을 누르면 바꾸는 창이 뜬다.
   고친 내용은 이 브라우저에 임시로 남고(stl.editDraft), 저장하거나 site.json 으로 내려받는다.
   목록으로 고치는 게 편한 것(생일·링크·일정·테마 색 등)은 admin.html#site 의 "자세한 설정". */

(() => {
  if (!EDIT) return;

  const IMG_LABELS = {
    'banner.image': '배너', 'images.logo': '로고', 'images.intro': '첫 화면 오른쪽 그림', 'images.crest': '왼쪽 벽 문양',
    'images.cafe': '팬 카페 버튼', 'images.drawer': '목차 배경', 'images.footer': '맨 아래 배경',
  };
  const MULTI = new Set(TEXT_SECTIONS.flatMap(s => s.items.filter(i => i[3]).map(i => i[0])));
  const LONG_FIELDS = /\.(bio)$/;
  let changes = 0;

  /* ── 경로로 값 읽고 쓰기: "members.3.bio" ── */
  const getPath = (o, path) => path.split('.').reduce((x, k) => x?.[k], o);
  function setPath(o, path, v) {
    const ks = path.split('.');
    const last = ks.pop();
    for (const k of ks) o = o[k] ||= {};
    if (v === '' || v == null) delete o[last]; else o[last] = v;
  }

  /* ── 임시 저장 ── */
  function touch() {
    changes++;
    store.set('editDraft', Data.site);
    paintBar();
  }
  function refresh() {
    applySiteStyle(Data.site);
    applyKindNames();
    fillTexts();
    renderDrawer();
    route(true);
    if (Intro.isOpen()) Intro.show();
    convert(document.body);
  }

  /* ── 표시 → 고칠 수 있는 칸 ── */
  const SKIP = new Set(['OPTION', 'TEXTAREA', 'TITLE', 'SCRIPT', 'STYLE']);
  function convert(root) {
    if (!root || root.nodeType !== 1 && root.nodeType !== 3) return;
    // 속성에 묻은 표시는 지운다 (aria-label, title, placeholder …)
    if (root.nodeType === 1) {
      [root, ...root.querySelectorAll('*')].forEach(el => {
        for (const a of el.attributes) if (a.value.includes('')) el.setAttribute(a.name, stripMarks(a.value));
      });
    }
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    for (let n = root.nodeType === 3 ? root : walker.nextNode(); n; n = walker.nextNode()) if (n.nodeValue.includes('')) nodes.push(n);
    for (const n of nodes) {
      if (!n.parentNode) continue;
      if (SKIP.has(n.parentNode.nodeName) || n.parentNode.closest?.('.ed-t')) { n.nodeValue = stripMarks(n.nodeValue); continue; }
      const frag = document.createDocumentFragment();
      let last = 0;
      const v = n.nodeValue;
      v.replace(MARK, (m, key, text, at) => {
        if (at > last) frag.append(stripMarks(v.slice(last, at)));
        const sp = document.createElement('span');
        sp.className = 'ed-t';
        sp.dataset.tk = key;
        sp.textContent = text;
        frag.append(sp);
        last = at + m.length;
      });
      if (last < v.length) frag.append(stripMarks(v.slice(last)));
      n.replaceWith(frag);
    }
  }
  new MutationObserver(list => {
    for (const r of list) r.addedNodes.forEach(convert);
  }).observe(document.body, { childList: true, subtree: true });

  /* ── 글자 고치기 ── */
  function rawTemplate(key) {
    const c = Data.site.texts?.[key];
    return c != null && c !== '' ? c : TEXT_DEFAULT[key] ?? '';
  }
  function startEdit(sp) {
    if (sp.isContentEditable) return;
    const key = sp.dataset.tk, field = sp.dataset.field;
    sp.dataset.before = sp.innerText;
    // {name} 같은 자리가 있는 글자는 원래 틀을 보여 주고 고친다
    if (key && /\{\w+\}/.test(rawTemplate(key))) sp.textContent = rawTemplate(key);
    if (key && MULTI.has(key)) sp.innerText = rawTemplate(key);
    sp.contentEditable = 'plaintext-only' in document.body ? 'plaintext-only' : 'true';
    sp.spellcheck = false;
    sp.focus();
    const r = document.createRange();
    r.selectNodeContents(sp);
    const sel = getSelection();
    sel.removeAllRanges();
    sel.addRange(r);
    const multi = (key && MULTI.has(key)) || (field && LONG_FIELDS.test(field));
    const onKey = e => {
      if (e.key === 'Enter' && !(multi && e.shiftKey)) { e.preventDefault(); sp.blur(); }
      if (e.key === 'Escape') { e.preventDefault(); sp.dataset.cancel = '1'; sp.blur(); }
      e.stopPropagation();
    };
    sp.addEventListener('keydown', onKey);
    sp.addEventListener('blur', () => {
      sp.removeEventListener('keydown', onKey);
      sp.contentEditable = 'false';
      if (sp.dataset.cancel) { delete sp.dataset.cancel; refresh(); return; }
      const v = sp.innerText.replace(/ /g, ' ').replace(/\n+$/, '').trim();
      if (key) {
        Data.site.texts ||= {};
        if (v === '' || v === TEXT_DEFAULT[key]) delete Data.site.texts[key]; else Data.site.texts[key] = v;
      } else if (field) {
        if (/\.(name)$/.test(field) && !v) { toast('이름은 비울 수 없다', true); refresh(); return; }
        setPath(Data.site, field, v);
      }
      if (v !== sp.dataset.before) touch();
      refresh();
    }, { once: true });
  }

  /* ── 그림 바꾸기 ── */
  const pop = document.createElement('div');
  pop.id = 'imgpop';
  pop.hidden = true;
  document.body.append(pop);
  function labelFor(path) {
    if (IMG_LABELS[path]) return IMG_LABELS[path];
    const m = path.match(/^members\.(\d+)\.(\w+)$/);
    if (m) return `${Data.site.members[+m[1]]?.name || ''} ${{ avatar: '프로필 사진', art: '전신 일러스트', artBg: '그림 뒤 배경' }[m[2]] || ''}`;
    return path;
  }
  function openImg(path, anchor) {
    const cur = getPath(Data.site, path) || '';
    const r = anchor.getBoundingClientRect();
    pop.innerHTML = `
      <b>${esc(labelFor(path))}</b>
      <span class="ip-prev" style="background-image:url('${esc(imgUrl(cur, 400))}')"></span>
      <label class="field"><span>주소 또는 드라이브 링크</span><input id="ipUrl" type="url" value="${esc(cur)}" placeholder="https://…"></label>
      <div class="ip-row">
        <label class="btn sm">파일 올리기<input type="file" accept="image/*" id="ipFile" hidden></label>
        <button type="button" class="btn sm" id="ipClear">기본으로</button>
        <span class="grow"></span>
        <button type="button" class="btn sm" id="ipClose">닫기</button>
        <button type="button" class="btn sm solid" id="ipOk">적용</button>
      </div>
      ${/^members\.\d+\.art$/.test(path) ? `<button type="button" class="tiny" id="ipBg">그림 뒤 배경 바꾸기</button>` : ''}`;
    pop.hidden = false;
    const w = 360, top = Math.min(innerHeight - 320, Math.max(12, r.top + 12)), left = Math.min(innerWidth - w - 12, Math.max(12, r.left + 12));
    Object.assign(pop.style, { top: top + 'px', left: left + 'px', width: w + 'px' });
    const url = $('#ipUrl');
    url.addEventListener('input', () => { $('.ip-prev', pop).style.backgroundImage = `url('${imgUrl(url.value, 400)}')`; });
    url.focus();
    const apply = v => { setPath(Data.site, path, v); touch(); refresh(); pop.hidden = true; };
    $('#ipOk').onclick = () => apply(url.value.trim());
    $('#ipClear').onclick = () => apply('');
    $('#ipClose').onclick = () => (pop.hidden = true);
    if ($('#ipBg')) $('#ipBg').onclick = () => openImg(path.replace(/\.art$/, '.artBg'), anchor);
    url.onkeydown = e => { if (e.key === 'Enter') apply(url.value.trim()); if (e.key === 'Escape') pop.hidden = true; };
    $('#ipFile').onchange = async e => {
      const f = e.target.files[0];
      if (!f) return;
      if (!LIVE) return toast('파일 올리기는 구글을 연결한 뒤에 된다. 지금은 주소를 넣자', true);
      try {
        toast('올리는 중…');
        const { id } = await api('uploadImage', { filename: f.name, mimeType: f.type, data: await fileToBase64(f) });
        apply(id);
        toast('올렸다');
      } catch (err) { toast(err.message, true); }
    };
  }

  /* ── 누르기: 고치기 모드에서는 글자·그림을 고친다 ── */
  document.addEventListener('click', e => {
    if (!document.body.classList.contains('editing')) return;
    if (e.target.closest('#editbar, #imgpop')) return;
    const sp = e.target.closest('.ed-t');
    if (sp) { e.preventDefault(); e.stopPropagation(); startEdit(sp); return; }
    const im = e.target.closest('[data-ei]');
    if (im) {
      const inner = e.target.closest('a, button, input, label, select, textarea, [data-play], [data-view-item]');
      if (!inner || inner === im || !im.contains(inner)) { e.preventDefault(); e.stopPropagation(); openImg(im.dataset.ei, im); return; }
    }
    if (!e.target.closest('#imgpop')) pop.hidden = true;
  }, true);

  /* ── 아래 도구 막대 ── */
  const bar = document.createElement('div');
  bar.id = 'editbar';
  document.body.append(bar);
  document.body.classList.add('edit-on', 'editing');

  function pages() {
    const ms = Data.site?.members || [];
    return [['#/', '홈'], ['#/calendar', '캘린더'], ['#/listen', '노래 듣기'], ['#/group', '단체 · 합방'], ['#/stars', '별표'], ['#/about', 'About'],
      ...ms.map(m => [`#/m/${m.id}`, `멤버 · ${m.name}`])];
  }
  function paintBar() {
    const editing = document.body.classList.contains('editing');
    const cur = location.hash || '#/';
    bar.innerHTML = `
      <span class="eb-k">✎ 편집</span>
      <div class="seg" role="group" aria-label="모드">
        <button type="button" data-eb="edit" aria-pressed="${editing}">고치기</button>
        <button type="button" data-eb="browse" aria-pressed="${!editing}">둘러보기</button>
      </div>
      <select data-eb="page" aria-label="페이지">${pages().map(([h, n]) => `<option value="${esc(h)}" ${cur.startsWith(h) && (h !== '#/' || cur === '#/' || cur === '#') ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select>
      <button type="button" class="btn sm" data-eb="intro">첫 화면</button>
      <a class="btn sm" href="admin.html#site">자세한 설정</a>
      <span class="eb-st">${changes ? `저장 안 한 변경 ${changes}` : store.get('editDraft') ? '임시로 고친 내용이 있다' : ''}</span>
      <button type="button" class="btn sm" data-eb="reset">되돌리기</button>
      <button type="button" class="btn sm solid" data-eb="save">${LIVE ? '저장' : 'site.json 내려받기'}</button>
      <a class="btn sm" href="./" title="편집 끝내기">나가기</a>`;
  }
  bar.addEventListener('click', async e => {
    const b = e.target.closest('[data-eb]');
    if (!b) return;
    const a = b.dataset.eb;
    if (a === 'edit' || a === 'browse') { document.body.classList.toggle('editing', a === 'edit'); pop.hidden = true; paintBar(); }
    if (a === 'intro') Intro.show();
    if (a === 'reset') {
      if (!confirm('고친 내용을 전부 버리고 저장된 상태로 되돌릴까?')) return;
      store.del('editDraft');
      location.reload();
    }
    if (a === 'save') {
      const site = JSON.parse(JSON.stringify(Data.site));
      if (!LIVE) {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(new Blob([JSON.stringify(site, null, 2)], { type: 'application/json' }));
        link.download = 'site.json';
        link.click();
        changes = 0;
        toast('내려받았다. 리포지토리의 data/site.json 에 덮어쓰면 반영된다');
        return paintBar();
      }
      try {
        b.disabled = true;
        toast('저장하는 중…');
        await api('saveSite', { site });
        store.del('editDraft');
        changes = 0;
        toast('저장했다 ✦');
      } catch (err) { toast(err.message, true); } finally { b.disabled = false; paintBar(); }
    }
  });
  bar.addEventListener('change', e => { if (e.target.dataset.eb === 'page') location.hash = e.target.value; });
  addEventListener('hashchange', paintBar);
  addEventListener('beforeunload', e => { if (changes && !LIVE) e.preventDefault(); });

  // 임시로 고친 내용이 있으면 그걸로 보여 준다
  window.dataReady.then(() => {
    const draft = store.get('editDraft');
    if (draft) Data.set(draft, Data.items);
    convert(document.body);
    paintBar();
  });
  paintBar();
})();
