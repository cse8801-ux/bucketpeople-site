# 버킷피플 사이트

자피치의 커뮤니티 브랜드 **버킷피플** 독립 사이트. 정적 사이트 + 멤버 프로필 CMS 구조 (자피치 사이트와 동일 방식).

## 브랜드 컬러 — 테라코타 · 노을빛 (#D85A30)

**의미**: 흙과 불빛의 마을. 마을이 딛고 선 땅, 해질녘 집집마다 켜지는 등불, 사람 사이의 정(情)을 색으로 옮긴 온도.

**자피치와의 관계**: 자피치가 가시광선의 *차가운 끝*(보라 · 짧은 파장 · 귀함)이라면, 버킷피플은 그 *정반대편 따뜻한 끝*(주황 · 가장 긴 파장 · 마을의 온기). 같은 빛 스펙트럼의 양 끝을 두 브랜드가 나눠 갖는다.

## 구조

```
index.html          홈페이지 (히어로 · 소개 · 가입여정 · 멤버미리보기 · 버킷리스트)
members.html        멤버 디렉토리 (검색·태그 필터) — /members
profile.html        프로필 상세 — /profile?id=슬러그
css/style.css       공통 스타일 (코랄 브랜드 테마)
profiles/*.md       멤버 프로필 (7항목 양식) — 아임웹 71명 이전 완료
profiles/index.json 멤버 목록(빌드 자동생성)
profiles/all.json   전체 데이터(상세+본문검색용, 빌드 자동생성)
bucketlist/*.md     버킷리스트 모임 (order·title·image·time·fee·link)
data/bucketlist.json 버킷리스트 목록(빌드 자동생성)
img/bucketlist/     모임 이미지 (아임웹에서 이전)
admin/              Decap CMS 관리자 페이지 (/admin)
build.mjs           목록·사이트맵 자동생성 빌드 스크립트
server.mjs          로컬 미리보기 서버 (node server.mjs → localhost:4321)
profiles-backup/    아임웹 원본 백업 (배포 제외, git ignore)
```

## 로컬 미리보기

```bash
node build.mjs      # 목록/사이트맵 생성
node server.mjs     # http://localhost:4321
```

## 새 멤버 / 새 버킷리스트 모임 추가

배포 후 `/admin` 접속 →
- "멤버 프로필" → 7항목 폼 입력 → 발행
- "버킷리스트 모임" → 이미지·시간·참가비·링크·순서 입력 → 발행

1~2분 뒤 자동 반영됩니다.

## 배포 — Cloudflare Pages

Netlify 무료 크레딧 소진 이슈로 Cloudflare Pages에 배포한다. (관리자 OAuth는 `functions/auth.js`, `functions/callback.js` = Cloudflare Pages Functions. `netlify/` 폴더는 미사용이나 보존.)

1. GitHub 저장소 push (완료: `cse8801-ux/bucketpeople-site`)
2. Cloudflare Pages → Create → Connect to Git → 저장소 선택
   - Framework preset: None
   - Build command: `node build.mjs`
   - Build output directory: `/`
3. 배포 후 나온 `*.pages.dev` 주소를 `admin/config.yml`의 `base_url`에 반영 → 커밋
4. GitHub OAuth 앱 생성 (Authorization callback URL = `https://<주소>/callback`) → Cloudflare Pages 환경변수 `OAUTH_CLIENT_ID`, `OAUTH_CLIENT_SECRET` 등록
5. 도메인 연결 (예: bucketpeople.kr) → `build.mjs`·`robots.txt`의 `SITE` 값 교체
6. 아임웹 사이트는 새 사이트 색인 확인 후 정리

## 아임웹 원본
- 원본 페이지: https://companyb.imweb.me/15 (프로필 게시판)
- 71개 프로필 + 21개 버킷리스트 모임 백업 완료 (`profiles-backup/`)
