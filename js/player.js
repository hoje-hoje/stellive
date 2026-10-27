/* 아래에 붙어있는 노래 플레이어.
   유튜브는 IFrame API, 드라이브 mp4 는 <video> 로 틀어서 끝나면 다음 곡으로 넘어간다. */

const Player = {
  queue: [], idx: -1, label: '', shuffle: false, repeat: 'all',
  kind: '', // 'yt' | 'video' | 'frame'
  yt: null, ytReady: null, playing: false, view: 'mini',

  init() {
    this.bar = $('#player');
    this.stage = $('#stage');
    this.video = $('#stage video');
    this.frame = $('#stage iframe');
    this.video.addEventListener('ended', () => this.ended());
    this.video.addEventListener('play', () => this.setPlaying(true));
    this.video.addEventListener('pause', () => this.setPlaying(false));
    this.video.addEventListener('error', () => {
      const it = this.current();
      if (!it || this.kind !== 'video' || !this.video.getAttribute('src')) return;
      if (it.ytId && !this.tried.has('youtube')) return this.failover(tRaw('player.driveError'));
      if (it.driveId) { this.showFrame(it); toast(tRaw('player.frame')); }
    });

    this.bar.addEventListener('click', e => {
      const b = e.target.closest('[data-p]');
      if (!b) return;
      const a = b.dataset.p;
      if (a === 'toggle') this.toggle();
      if (a === 'next') this.next();
      if (a === 'prev') this.prev();
      if (a === 'shuffle') { this.shuffle = !this.shuffle; this.paintModes(); }
      if (a === 'repeat') { this.repeat = { all: 'one', one: 'off', off: 'all' }[this.repeat]; this.paintModes(); }
      if (a === 'fav') { const it = this.current(); if (it) Favs.toggle(it.id); }
      if (a === 'view') this.setView(this.view === 'big' ? 'mini' : 'big');
      if (a === 'hide') this.setView(this.view === 'hidden' ? 'mini' : 'hidden');
      if (a === 'queue') $('#queue').classList.toggle('open');
      if (a === 'prefer') this.setPrefer(this.prefer === 'drive' ? 'youtube' : 'drive');
    });
    $('#stage').addEventListener('click', e => {
      const b = e.target.closest('[data-s]');
      if (b) this.setView(b.dataset.s);
    });
    $('#queue').addEventListener('click', e => {
      const r = e.target.closest('[data-qi]');
      if (r) this.go(+r.dataset.qi);
    });

    const seek = $('#pSeek');
    seek.addEventListener('input', () => {
      const d = this.duration();
      if (d) this.seekTo((seek.value / 1000) * d);
    });
    setInterval(() => this.tick(), 500);
    Favs.on(() => this.paintFav());

    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('nexttrack', () => this.next());
      navigator.mediaSession.setActionHandler('previoustrack', () => this.prev());
      navigator.mediaSession.setActionHandler('play', () => this.toggle(true));
      navigator.mediaSession.setActionHandler('pause', () => this.toggle(false));
    }
  },

  /* 목록 통째로 넘겨서 재생 시작 */
  play(items, startId, label) {
    const list = items.filter(i => i.playable);
    if (!list.length) { toast(tRaw('player.noSongs')); return; }
    this.queue = list;
    this.label = stripMarks(label || '');
    let i = startId ? list.findIndex(x => x.id === startId) : 0;
    if (i < 0) i = 0;
    if (this.shuffle && !startId) i = Math.floor(Math.random() * list.length);
    this.bar.hidden = false;
    document.body.classList.add('has-player');
    if (this.view === 'hidden') this.setView('mini');
    this.go(i);
    this.paintQueue();
  },

  current() { return this.queue[this.idx]; },

  /* 어느 쪽으로 틀지: 'youtube' 먼저 / 'drive' 먼저 (학교처럼 유튜브가 막힌 곳이면 drive) */
  prefer: store.get('prefer', 'youtube'),
  setPrefer(p) {
    this.prefer = p;
    store.set('prefer', p);
    this.paintPrefer();
  },

  go(i) {
    if (!this.queue.length) return;
    this.idx = (i + this.queue.length) % this.queue.length;
    const it = this.current();
    this.tried = new Set();
    this.paintNow(it);
    this.paintQueue();
    this.playSource(it, this.prefer === 'drive' && it.hasDrive ? 'drive' : it.ytId ? 'youtube' : 'drive');
  },

  playSource(it, src) {
    this.tried.add(src);
    this.source = src;
    this.paintSource();
    if (src === 'youtube') return this.playYT(it);
    if (it.directUrl) return this.playVideo(it.directUrl);
    if (it.driveId && CFG.driveApiKey) return this.playVideo(`https://www.googleapis.com/drive/v3/files/${it.driveId}?alt=media&key=${CFG.driveApiKey}`);
    if (it.driveId) return this.showFrame(it);
  },

  // 지금 소스가 안 되면 다른 소스로, 그것도 안 되면 다음 곡으로
  failover(why) {
    const it = this.current();
    if (!it) return;
    const other = this.source === 'youtube' ? 'drive' : 'youtube';
    const ok = other === 'youtube' ? !!it.ytId : it.hasDrive || !!it.directUrl;
    if (ok && !this.tried.has(other)) {
      toast(tRaw('player.switch', { why, to: other === 'drive' ? tRaw('player.toDrive') : tRaw('player.toYt') }));
      return this.playSource(it, other);
    }
    toast(tRaw('player.skip', { why }));
    setTimeout(() => { if (this.current() === it) this.next(true); }, 1200);
  },

  next(auto) {
    if (!this.queue.length) return;
    if (auto && this.repeat === 'one') return this.go(this.idx);
    if (this.shuffle && this.queue.length > 1) {
      let n; do n = Math.floor(Math.random() * this.queue.length); while (n === this.idx);
      return this.go(n);
    }
    if (auto && this.repeat === 'off' && this.idx === this.queue.length - 1) return this.setPlaying(false);
    this.go(this.idx + 1);
  },
  prev() {
    if (this.position() > 4) return this.seekTo(0);
    this.go(this.idx - 1);
  },
  ended() { this.next(true); },

  /* ── 유튜브 ── */
  // 유튜브가 막힌 네트워크에서는 스크립트가 안 오므로 8초 기다리고 포기한다
  loadYT() {
    if (this.ytReady) return this.ytReady;
    this.ytReady = new Promise((ok, bad) => {
      window.onYouTubeIframeAPIReady = ok;
      const s = document.createElement('script');
      s.src = 'https://www.youtube.com/iframe_api';
      s.onerror = () => bad(new Error('blocked'));
      document.head.append(s);
      setTimeout(() => bad(new Error('timeout')), 8000);
    });
    this.ytReady.catch(() => { this.ytReady = null; });
    return this.ytReady;
  },
  async playYT(it) {
    this.stopOthers('yt');
    try { await this.loadYT(); }
    catch { if (this.current() === it) this.failover(tRaw('player.ytBlocked')); return; }
    if (this.current() !== it) return;
    if (!this.yt) {
      this.yt = await new Promise(ok => {
        const p = new YT.Player('ytHost', {
          videoId: it.ytId,
          playerVars: { autoplay: 1, playsinline: 1, rel: 0, modestbranding: 1 },
          events: {
            onReady: () => { p.playVideo(); ok(p); },
            onStateChange: e => {
              if (e.data === YT.PlayerState.ENDED) this.ended();
              if (e.data === YT.PlayerState.PLAYING) this.setPlaying(true);
              if (e.data === YT.PlayerState.PAUSED) this.setPlaying(false);
            },
            onError: () => this.failover(tRaw('player.ytError')),
          },
        });
      });
    } else this.yt.loadVideoById(it.ytId);
  },

  /* ── 드라이브 / 직접 주소 ── */
  playVideo(src) {
    this.stopOthers('video');
    this.video.src = src;
    this.video.play().catch(() => {});
  },
  showFrame(it) {
    this.stopOthers('frame');
    this.frame.src = `https://drive.google.com/file/d/${it.driveId}/preview`;
    this.setPlaying(true);
    if (!this._warned) { this._warned = true; toast(tRaw('player.frameNote')); }
  },

  stopOthers(keep) {
    this.kind = keep;
    this.stage.dataset.kind = keep;
    if (keep !== 'yt' && this.yt) this.yt.stopVideo();
    if (keep !== 'video') { this.video.pause(); this.video.removeAttribute('src'); this.video.load(); }
    if (keep !== 'frame') this.frame.src = 'about:blank';
  },

  toggle(force) {
    const want = force ?? !this.playing;
    if (this.kind === 'yt' && this.yt) want ? this.yt.playVideo() : this.yt.pauseVideo();
    if (this.kind === 'video') want ? this.video.play() : this.video.pause();
  },
  position() {
    if (this.kind === 'yt' && this.yt?.getCurrentTime) return this.yt.getCurrentTime() || 0;
    if (this.kind === 'video') return this.video.currentTime || 0;
    return 0;
  },
  duration() {
    if (this.kind === 'yt' && this.yt?.getDuration) return this.yt.getDuration() || 0;
    if (this.kind === 'video') return isFinite(this.video.duration) ? this.video.duration : 0;
    return 0;
  },
  seekTo(t) {
    if (this.kind === 'yt' && this.yt) this.yt.seekTo(t, true);
    if (this.kind === 'video') this.video.currentTime = t;
  },

  setView(v) {
    this.view = v;
    this.stage.dataset.view = v;
    $('[data-p="hide"]', this.bar).classList.toggle('on', v !== 'hidden');
  },
  setPlaying(p) {
    this.playing = p;
    $('[data-p="toggle"]', this.bar).innerHTML = p ? ICON.pause : ICON.play;
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = p ? 'playing' : 'paused';
  },

  tick() {
    if (this.bar.hidden) return;
    const d = this.duration(), p = this.position();
    const f = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
    $('#pTime').textContent = d ? `${f(p)} / ${f(d)}` : '';
    if (document.activeElement !== $('#pSeek')) $('#pSeek').value = d ? Math.round((p / d) * 1000) : 0;
  },

  /* ── 그리기 ── */
  paintNow(it) {
    const names = it.members.map(id => Data.member(id)?.name).filter(Boolean).join(' · ');
    $('#pThumb').style.backgroundImage = it.thumb ? `url("${it.thumb}")` : '';
    $('#pTitle').textContent = it.title || '(제목 없음)';
    $('#pSub').textContent = [names, this.label].filter(Boolean).join('  ·  ');
    this.paintFav();
    if ('mediaSession' in navigator)
      navigator.mediaSession.metadata = new MediaMetadata({ title: it.title, artist: names, album: 'STELLIVE', artwork: it.thumb ? [{ src: it.thumb, sizes: '480x360' }] : [] });
  },
  paintPrefer() {
    const b = $('[data-p="prefer"]', this.bar);
    if (!b) return;
    b.textContent = this.prefer === 'drive' ? tRaw('player.preferDrive') : tRaw('player.preferYt');
    b.title = tRaw('player.preferTitle');
  },
  paintSource() {
    const el = $('#pSrc');
    if (el) el.textContent = this.source === 'youtube' ? 'YouTube' : 'Drive';
  },
  paintFav() {
    const it = this.current();
    const b = $('[data-p="fav"]', this.bar);
    const on = it && Favs.has(it.id);
    b.innerHTML = on ? ICON.star : ICON.starO;
    b.classList.toggle('on', !!on);
  },
  paintModes() {
    $('[data-p="shuffle"]', this.bar).classList.toggle('on', this.shuffle);
    const r = $('[data-p="repeat"]', this.bar);
    r.classList.toggle('on', this.repeat !== 'off');
    r.dataset.one = this.repeat === 'one' ? '1' : '';
    r.title = { all: '전체 반복', one: '한 곡 반복', off: '반복 안 함' }[this.repeat];
  },
  paintQueue() {
    $('#queue .q-head span').textContent = this.label ? `${this.label} · ${this.queue.length}곡` : `${this.queue.length}곡`;
    $('#queue ol').innerHTML = this.queue.map((it, i) => `
      <li data-qi="${i}" class="${i === this.idx ? 'now' : ''}">
        <span class="q-n">${i === this.idx ? ICON.play : i + 1}</span>
        <span class="q-t">${esc(it.title)}</span>
        <span class="q-m">${esc(it.members.map(id => Data.member(id)?.name).filter(Boolean).join(' · '))}</span>
      </li>`).join('');
  },
};
