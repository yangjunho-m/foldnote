# FoldNote

FoldNote는 단백질 이름이나 PDB ID를 검색해서 구조, 기능, 논문 근거, 학습 내용을 함께 볼 수 있는 정적 웹앱입니다.  
생명과학을 처음 배우는 사람도 3D 단백질 구조를 읽을 수 있도록 한국어/영어 설명, 용어 정리, 구조 노트, 리포트 미리보기를 제공합니다.

## 주요 기능

- 단백질명, UniProt accession, PDB ID 검색
- RCSB PDB 실험 구조 우선 검색
- UniProt/AlphaFold 기반 예측 구조 fallback
- 3Dmol.js 기반 단백질 3D 뷰어
- 리본, 스틱, 구체, 표면, 신뢰도 색상 보기
- 원자/잔기 클릭 시 Asymmetric Unit, 체인, 잔기 설명 표시
- 기본정보, 구조 비교, 변이 해석, 참고문헌 표시
- Europe PMC 기반 논문 근거와 참고문헌 링크
- 최근 본 단백질 5개 저장 및 삭제
- 4개 고정 노트 폴더와 노트 저장
- 노트 폴더 이름 변경
- Pro 리포트 미리보기, Markdown 저장, PDF 변환
- 생화학 학습 페이지
  - 0. 시작하기: 용어 정리
  - 1. 아미노산과 단백질
  - 2. 단백질 구조
  - 3. 효소와 결합
  - 4. DNA/RNA와 단백질
  - 5. 변이와 질병
  - 6. 구조 데이터 읽기
- 한국어/영어 UI 전환
- Supabase 이벤트 로그 연동 준비
- 무료/서버리스 AI 학습 확장 연동 준비

## 실행 방법

이 프로젝트는 번들러 없이 정적 파일로 동작합니다. Node.js는 로컬 정적 서버 실행에만 사용합니다.

```bash
npm start
```

브라우저에서 아래 주소를 엽니다.

```text
http://localhost:4173
```

다른 포트를 쓰고 싶으면 `PORT` 환경변수를 지정할 수 있습니다.

```bash
PORT=3000 npm start
```

Windows PowerShell에서는 다음처럼 실행합니다.

```powershell
$env:PORT=3000
npm start
```

## 배포

정적 파일만 업로드하면 배포할 수 있습니다.

### GitHub Pages

이 저장소에는 GitHub Pages 배포용 workflow가 포함되어 있습니다.

- workflow: `.github/workflows/pages.yml`
- 배포 브랜치: `master`
- 방식: GitHub Actions가 저장소 루트 전체를 Pages artifact로 업로드
- Pages 설정: GitHub Pages를 GitHub Actions 배포 방식으로 설정해야 합니다.

`master` 브랜치에 push하면 자동 배포됩니다.

### Netlify

`netlify.toml`이 포함되어 있습니다. 저장소를 연결하면 루트 디렉터리를 그대로 publish 합니다.

### Vercel

`vercel.json`이 포함되어 있습니다. 정적 사이트로 배포됩니다.

## Supabase 로그 설정

앱은 다음 이벤트를 Supabase로 보낼 수 있도록 준비되어 있습니다.

- 검색어 입력
- 검색 결과 클릭
- 논문 근거 영역 열림
- 노트 저장 버튼 클릭
- Pro 리포트 생성 버튼 클릭
- 세션 시간
- AI 학습 확장 버튼 클릭

설정 방법은 아래 문서를 참고하세요.

- `docs/supabase-ai-setup.md`

빠른 설정:

1. Supabase SQL Editor에서 `docs/supabase-ai-setup.md`의 `foldnote_events` 테이블과 RLS 정책을 실행합니다.
2. `config.js`에 Supabase `Project URL`과 `anon public key`를 입력합니다.
3. GitHub Pages에 다시 배포하면 방문자 로그가 `foldnote_events` 테이블에 쌓입니다.

Supabase URL과 anon key가 설정되지 않으면 이벤트는 브라우저 로컬 큐에만 저장되고, 앱 기능은 그대로 동작합니다. `config.js`에는 Supabase service role key를 절대 넣지 말고, 공개 가능한 anon public key만 넣으세요.

## AI 학습 확장

학습 페이지의 `AI로 넓히기` 기능은 기본적으로 외부 API 키 없이 로컬 학습 확장을 생성합니다.  
실제 AI API를 붙일 때는 브라우저에 개인 키를 직접 넣지 말고 Supabase Edge Function이나 별도 서버리스 함수 뒤에 숨기는 구성을 권장합니다.

자세한 설정은 `docs/supabase-ai-setup.md`를 참고하세요.

## 프로젝트 구조

```text
foldnote/
├─ index.html
├─ app.js
├─ styles.css
├─ package.json
├─ scripts/
│  └─ serve.mjs
├─ src/
│  ├─ analyticsService.js
│  ├─ catalog.js
│  ├─ learningAiService.js
│  ├─ literatureService.js
│  ├─ noteStore.js
│  ├─ proteinService.js
│  └─ styles/
│     ├─ base.css
│     ├─ responsive.css
│     ├─ search.css
│     └─ viewer.css
├─ docs/
│  └─ supabase-ai-setup.md
├─ .github/
│  └─ workflows/
│     └─ pages.yml
├─ netlify.toml
├─ vercel.json
├─ NOTICE.md
└─ LICENSE
```

## 주요 파일

- `index.html`: 앱 진입점, 3Dmol.js 로드
- `app.js`: 화면 상태, 렌더링, 이벤트 연결
- `src/proteinService.js`: RCSB PDB, UniProt, AlphaFold 검색 로직
- `src/literatureService.js`: Europe PMC 논문 근거 검색
- `src/noteStore.js`: localStorage 기반 노트/최근 기록 저장
- `src/analyticsService.js`: Supabase 로그 전송 준비
- `src/learningAiService.js`: AI 학습 확장 준비
- `src/catalog.js`: 추천 단백질, 아이콘, 잔기 설명, API URL
- `src/styles/`: 화면별 CSS
- `scripts/serve.mjs`: 로컬 정적 서버

## 데이터와 라이선스 주의

FoldNote의 코드, UI, 제품명, 자체 작성 설명 문구는 저장소 라이선스와 저작권 정책을 따릅니다.  
상용화 전에는 별도의 Terms of Service, Privacy Policy, Attribution 페이지를 준비하는 것이 좋습니다.

사용 데이터와 외부 라이브러리는 다음 정책을 확인해야 합니다.

- RCSB PDB: 구조/API 데이터는 CC0 기반이며 원 구조 저자 표기를 권장합니다.
- AlphaFold DB: CC BY 4.0 기반으로 출처와 라이선스 표기가 필요합니다.
- Europe PMC: 논문 메타데이터와 초록의 권리는 출판사/저자에게 남아 있을 수 있습니다. 초록/원문 전체 저장이나 재배포보다는 짧은 요약, 링크, 인용 정보 중심으로 사용하세요.
- 3Dmol.js: 오픈소스 라이브러리이며 라이선스 고지를 유지하는 것이 좋습니다.

자세한 고지는 `NOTICE.md`를 참고하세요.

## 개발 메모

- 이 앱은 현재 프론트엔드 정적 앱입니다.
- 사용자의 노트와 최근 본 단백질은 브라우저 localStorage에 저장됩니다.
- 로그인, 서버 저장, 결제, 팀 워크스페이스는 아직 실제 구현 전 단계입니다.
- 의료 진단/치료 목적이 아니라 연구, 교육, 탐색용 도구로 표시해야 합니다.
