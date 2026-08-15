// 버킷피플 정적 사이트 빌드 스크립트
// profiles/ 폴더의 .md(프론트매터)를 읽어 목록(profiles/index.json)과 sitemap.xml을 자동 생성한다.
// 관리자 페이지(admin/)에서 새 프로필을 발행하면 Netlify 배포 시 이 스크립트가 목록에 자동 반영한다.

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const SITE = 'https://bucketpeople-site.cse8801.workers.dev'; // 도메인 연결 시 이 값만 바꾸면 됨

// ── 프론트매터 파서 (YAML 블록 스칼라 |- , 리스트 - , 따옴표 문자열 지원) ──
function parseFrontmatter(raw) {
  const m = raw.match(/^---\s*\r?\n([\s\S]*?)\r?\n---/);
  const data = {};
  if (!m) return data;
  const lines = m[1].split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const km = line.match(/^([A-Za-z0-9_]+):\s?(.*)$/);
    if (!km) continue;
    const key = km[1];
    let val = km[2];

    // 블록 스칼라: key: |- 또는 |
    if (val === '|' || val === '|-' || val === '|+') {
      const buf = [];
      while (i + 1 < lines.length && (/^\s{2,}/.test(lines[i + 1]) || lines[i + 1] === '')) {
        buf.push(lines[++i].replace(/^\s{2}/, ''));
      }
      data[key] = buf.join('\n').replace(/\n+$/, '');
      continue;
    }
    // 리스트: 다음 줄들이 "- item"
    if (val === '' && i + 1 < lines.length && /^\s*-\s+/.test(lines[i + 1])) {
      const arr = [];
      while (i + 1 < lines.length && /^\s*-\s+/.test(lines[i + 1])) {
        let item = lines[++i].replace(/^\s*-\s+/, '').trim();
        item = unquote(item);
        arr.push(item);
      }
      data[key] = arr;
      continue;
    }
    // 인라인 빈 리스트
    if (val.trim() === '[]') { data[key] = []; continue; }
    data[key] = unquote(val.trim());
  }
  return data;
}
function unquote(v) {
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1);
  }
  return v.replace(/\\"/g, '"');
}

// ── 프로필 목록 생성 ──
const items = []; // 가벼운 목록(카드용)
const full = [];  // 전체 데이터(상세 페이지 + 본문 검색용)
if (existsSync('profiles')) {
  const files = readdirSync('profiles').filter((f) => f.endsWith('.md'));
  for (const file of files) {
    const raw = readFileSync(join('profiles', file), 'utf8');
    const d = parseFrontmatter(raw);
    const slug = file.replace(/\.md$/, '');
    // 소개 미리보기: 현재 이야기 첫 문장 위주로 짧게
    const preview = (d.present || d.past || '').split(/(?<=[.!?…”"])\s/)[0].slice(0, 70);
    const tags = Array.isArray(d.tags) ? d.tags : (d.tags ? [d.tags] : []);
    const no = d.no ? Number(d.no) : 0;
    items.push({ slug, no, name: d.name || slug, job: d.job || '', date: d.date ? String(d.date).slice(0, 10) : '', preview, tags, oneWord: d.oneWord || '', photo: d.photo || '' });
    full.push({
      slug, no, name: d.name || slug, job: d.job || '', date: d.date ? String(d.date).slice(0, 10) : '',
      past: d.past || '', present: d.present || '', future: d.future || '',
      expect: d.expect || '', oneWord: d.oneWord || '', tags, photo: d.photo || '',
    });
  }
}
// 번호 내림차순(최신 멤버가 위로)
const byNo = (a, b) => b.no - a.no || String(b.date).localeCompare(String(a.date));
items.sort(byNo);
full.sort(byNo);
if (!existsSync('profiles')) mkdirSync('profiles');
writeFileSync('profiles/index.json', JSON.stringify(items, null, 2) + '\n', 'utf8');
writeFileSync('profiles/all.json', JSON.stringify(full) + '\n', 'utf8');
console.log(`✅ profiles/index.json + all.json 생성 — ${items.length}명`);

// ── 버킷리스트 목록 생성 (bucketlist/*.md → data/bucketlist.json) ──
if (existsSync('bucketlist')) {
  const files = readdirSync('bucketlist').filter((f) => f.endsWith('.md'));
  const bl = files.map((file) => {
    const d = parseFrontmatter(readFileSync(join('bucketlist', file), 'utf8'));
    return {
      slug: file.replace(/\.md$/, ''),
      order: d.order ? Number(d.order) : 999,
      date: d.date ? String(d.date).slice(0, 10) : '',
      title: d.title || '',
      img: d.image || '',
      time: d.time || '',
      fee: d.fee || '',
      href: d.link || '',
    };
  });
  // 진행일자(date) 오름차순 — 전체 페이지·홈 '다가오는' 모두 이 순서 (같은 날짜는 order로)
  bl.sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')) || (a.order - b.order));
  if (!existsSync('data')) mkdirSync('data');
  // date와 order를 함께 담아 홈(최신순 6개)·전체 페이지(order순) 모두 이 파일로 처리
  writeFileSync('data/bucketlist.json', JSON.stringify(bl, null, 2) + '\n', 'utf8');
  console.log(`✅ data/bucketlist.json 생성 — ${bl.length}개 모임`);
}

// ── sitemap.xml 자동 생성 ──
const today = new Date().toISOString().slice(0, 10);
const urls = [
  { loc: `${SITE}/`, priority: '1.0' },
  { loc: `${SITE}/members`, priority: '0.9' },
  { loc: `${SITE}/bucketlist`, priority: '0.7' },
];
for (const it of items) {
  urls.push({ loc: `${SITE}/profile?id=${it.slug}`, priority: '0.6', lastmod: it.date });
}
const xml =
  '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  urls
    .map(
      (u) =>
        `  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>${u.lastmod || today}</lastmod>\n    <priority>${u.priority}</priority>\n  </url>`
    )
    .join('\n') +
  '\n</urlset>\n';
writeFileSync('sitemap.xml', xml, 'utf8');
console.log(`✅ sitemap.xml 생성 — ${urls.length}개 URL`);
