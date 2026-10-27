/* 사이트에 나오는 글자 전부.
   관리자 페이지 "글자" 탭에서 바꾸면 site.json 의 texts 가 이 기본값을 덮어쓴다.
   {name} 처럼 중괄호로 감싼 곳은 화면에서 실제 값으로 바뀌는 자리다. */

const TEXT_SECTIONS = [
  { id: 'intro', name: '첫 화면', items: [
    ['intro.kicker', '맨 위 작은 글씨', 'Stellar Live Archive'],
    ['intro.title', '큰 제목', 'STELLIVE'],
    ['intro.sub', '기울인 부제', 'Archive'],
    ['intro.ko', '한글 한 줄', '별들의 노래와 순간을 모아 두는 곳'],
    ['intro.enter', '들어가기 버튼', 'ENTER'],
    ['intro.skip', '다시 보지 않기', '오늘 하루 다시 보지 않기'],
    ['intro.wallEn', '왼쪽 벽 영문', 'Since the first star\n— a fan archive', true],
    ['intro.wallKo', '왼쪽 벽 안내', '팬이 만든 비공식 아카이브 ·\n스텔라이브 공식 활동이 아니다', true],
  ] },
  { id: 'nav', name: '목차 · 위 링크 줄', items: [
    ['nav.title', '목차 제목', 'INDEX'],
    ['nav.home', '홈', '홈'], ['nav.homeEn', '홈 (영문)', 'Home'],
    ['nav.calendar', '캘린더', '캘린더'], ['nav.calendarEn', '캘린더 (영문)', 'Calendar'],
    ['nav.listen', '노래 듣기', '노래 듣기'], ['nav.listenEn', '노래 듣기 (영문)', 'Listen'],
    ['nav.group', '단체', '단체 · 합방'], ['nav.groupEn', '단체 (영문)', 'Units'],
    ['nav.stars', '별표', '별표'], ['nav.starsEn', '별표 (영문)', 'Stars'],
    ['nav.about', 'About', '소개 · 가이드라인'], ['nav.aboutEn', 'About (영문)', 'About'],
    ['nav.members', '멤버 묶음 제목', 'MEMBERS'],
    ['nav.graduation', '졸업 묶음 이름', 'Graduation'],
    ['nav.upload', '올리기 버튼', '＋ 올리기'],
    ['nav.intro', '첫 화면 버튼', 'INTRO'],
  ] },
  { id: 'home', name: '홈', items: [
    ['home.kicker', '배너 작은 글씨', 'Stellar Live Archive'],
    ['home.title', '배너 제목', 'STELLIVE'],
    ['home.sub', '배너 한 줄', '별들의 노래와 순간을 모아 두는 곳'],
    ['home.songs', '노래 수 옆 글씨', '노래'],
    ['home.others', '클립 수 옆 글씨', '클립 · 팬아트'],
    ['home.cafe', '팬 카페 버튼 설명', '팬 카페로 간다'],
    ['home.graduation', '졸업 큰 제목', 'GRADUATION'],
    ['home.graduationKo', '졸업 작은 제목', '졸업 멤버'],
  ] },
  { id: 'cal', name: '캘린더', items: [
    ['cal.kicker', '작은 제목', 'CALENDAR'],
    ['cal.upcoming', '다가오는 일정', '다가오는 일정'],
    ['cal.none', '일정이 없을 때', '일정이 없다'],
    ['cal.today', '오늘 버튼', '오늘'],
    ['cal.big', '캘린더 페이지 큰 제목', 'Calendar'],
    ['cal.ko', '캘린더 페이지 한글 제목', '캘린더'],
    ['cal.desc', '캘린더 페이지 설명', '생일 · 데뷔 기념일 · 이벤트'],
  ] },
  { id: 'profile', name: '멤버 프로필', items: [
    ['profile.back', '왼쪽 위 돌아가기', 'INDEX'],
    ['profile.ci', '그림 아래 글씨', 'CHARACTER\nINFORMATION', true],
    ['profile.birthday', '생일 칸', '생일'],
    ['profile.debut', '데뷔 칸', '데뷔'],
    ['profile.unit', '유닛 칸', '유닛'],
    ['profile.graduated', '졸업 멤버 유닛 칸', '졸업 멤버'],
    ['profile.summary', '소개 제목', 'Summary'],
    ['profile.playAll', '노래 전부 듣기', '노래 전부 듣기'],
    ['profile.addFanart', '팬아트 빈칸', '＋ 팬아트'],
  ] },
  { id: 'list', name: '목록 · 빈 화면', items: [
    ['list.count', '노래 개수', '{n}곡'],
    ['list.shuffle', '랜덤 버튼', '랜덤'],
    ['list.playAll', '전부 듣기 버튼', '전부 듣기'],
    ['list.add', '올리기 버튼', '＋ {kind} 올리기'],
    ['list.empty', '아무것도 없을 때', '아직 {kind}이(가) 없다'],
    ['list.first', '처음 올리기 버튼', '＋ 처음으로 올리기'],
    ['list.open', '원본 열기', '원본'],
    ['notFound', '없는 주소', '여긴 아무것도 없는 우주다'],
  ] },
  { id: 'group', name: '단체 · 합방', items: [
    ['group.big', '큰 제목', 'Units'],
    ['group.ko', '한글 제목', '단체 · 합방'],
    ['group.all', '전부 탭', 'All'],
    ['group.duo', '합방 탭', 'Duo'],
    ['group.duoKo', '합방 탭 한글', '합방'],
  ] },
  { id: 'listen', name: '노래 듣기', items: [
    ['listen.big', '큰 제목', 'Listen'],
    ['listen.ko', '한글 제목', '노래 듣기'],
    ['listen.desc', '설명', '고르면 아래 플레이어에서 끝날 때마다 다음 곡으로 넘어간다'],
    ['listen.preferNote', '드라이브 버튼 앞 설명', '유튜브가 막힌 곳(학교 등)이면'],
    ['listen.prefer', '드라이브 버튼', '드라이브 먼저 틀기'],
    ['listen.random', '전체 랜덤', '전체 랜덤'],
    ['listen.stars', '별표한 노래', '별표한 노래'],
    ['listen.newest', '최신순', '최신순'],
    ['listen.newestDesc', '최신순 설명', '새로 올라온 것부터'],
    ['listen.members', '멤버별 제목', '멤버별'],
    ['listen.units', '기수별 제목', '기수별'],
    ['listen.search', '찾기 칸', '제목이나 멤버로 찾기'],
  ] },
  { id: 'stars', name: '별표', items: [
    ['stars.big', '큰 제목', 'Stars'],
    ['stars.ko', '한글 제목', '별표'],
    ['stars.login', '로그인했을 때', '{name} 계정에 저장된다'],
    ['stars.local', '로그인 안 했을 때', '이 기기에만 저장된다. 로그인하면 계정에 합쳐진다'],
    ['stars.empty', '별표가 없을 때', '☆ 를 눌러서 모아 보자'],
  ] },
  { id: 'about', name: 'About', items: [
    ['about.big', '큰 제목', 'About'],
    ['about.ko', '한글 제목', '이 사이트에 대해'],
    ['about.lead', '소개 글 (**굵게**)', 'STELLIVE ARCHIVE는 스텔라이브를 좋아하는 **팬이 만든 비공식 팬 아카이브**다. 스텔라이브의 공식 활동이 아니며, 스텔라이브 및 소속 멤버와 관계가 없다. 멤버들의 노래와 순간, 팬들의 창작물을 한곳에서 찾아보기 쉽게 모아 두는 곳이다.', true],
    ['about.promiseKicker', '주의한 점 작은 제목', 'OUR PROMISE'],
    ['about.promise', '주의한 점 제목', '이 사이트가 주의한 점'],
    ['about.promiseNote', '주의한 점 설명', '아래 가이드라인을 읽고 이렇게 운영하기로 했다.'],
    ['about.contact', '삭제 요청 문장', '권리자나 창작자가 내려 달라고 하면 바로 내린다. 삭제 요청:'],
    ['about.guideKicker', '가이드라인 작은 제목', 'GUIDELINE'],
    ['about.guide', '가이드라인 제목', '스텔라이브 2차 창작 가이드라인'],
    ['about.source', '출처 안내', '출처: 스텔라이브 공식 2차 창작 가이드라인. 가이드라인은 수정될 수 있으니 창작 전에 공식 공지에서 최신 버전을 꼭 확인하자.', true],
  ] },
  { id: 'footer', name: '맨 아래', items: [
    ['footer.note', '로고 아래 글', '팬이 만든 비공식 아카이브다.\n모든 영상·이미지의 권리는 스텔라이브와 원작자에게 있다.', true],
    ['footer.archive', '첫째 묶음', 'ARCHIVE'],
    ['footer.contribute', '둘째 묶음', 'CONTRIBUTE'],
    ['footer.official', '셋째 묶음', 'OFFICIAL'],
    ['footer.officialSite', '공식 사이트 링크', '스텔라이브 공식 사이트'],
    ['footer.admin', '관리자 링크', '관리자'],
    ['footer.loginOn', '로그인했을 때', '{name} · 별표는 계정에 저장된다'],
    ['footer.loginOff', '로그인 안 했을 때', '로그인하지 않으면 별표는 이 기기에만 저장된다'],
  ] },
  { id: 'upload', name: '올리기 창', items: [
    ['upload.title', '제목', '올리기'],
    ['upload.demo', '미리보기 모드 안내', '지금은 미리보기 모드라 링크만 이 브라우저에 저장된다. 서버를 연결하면 모두에게 보인다.'],
    ['upload.as', '로그인했을 때', '{name} 이름으로 올라간다. 파일은 공유 드라이브의 멤버 폴더에 들어간다.'],
    ['upload.login', '로그인 안 했을 때', '올리려면 먼저 목차 아래에서 구글 로그인을 하자.'],
    ['upload.rules', '아래 주의 문구', '올리기 전에 2차 창작 가이드라인을 확인하자. 원본 공개 전 클립, 방송 전체를 담은 영상은 받지 않는다.'],
    ['upload.done', '올린 뒤', '올렸다 ✦'],
    ['upload.deleted', '지운 뒤', '지웠다'],
    ['upload.confirmDelete', '지우기 확인', '지울까?'],
  ] },
  { id: 'player', name: '플레이어', items: [
    ['player.preferDrive', '드라이브 먼저', '드라이브 먼저'],
    ['player.preferYt', '유튜브 먼저', '유튜브 먼저'],
    ['player.queue', '재생 목록', '재생 목록'],
  ] },
];

const TEXT_DEFAULT = Object.fromEntries(TEXT_SECTIONS.flatMap(s => s.items.map(([k, , v]) => [k, v])));

// t('list.empty', { kind: '커버곡' })
function t(key, vars) {
  const custom = Data.site?.texts?.[key];
  let s = custom != null && custom !== '' ? custom : TEXT_DEFAULT[key] ?? key;
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] ?? m));
  return s;
}
// 줄바꿈과 **굵게** 를 살린 HTML
function th(key, vars) {
  return esc(t(key, vars)).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');
}
