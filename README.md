# 단백질 구조 탐색기

한국어 사용자를 위한 단백질 구조 시각화 대시보드 프로토타입입니다. 단백질 이름을 검색하면 RCSB PDB의 실험 구조를 우선으로 보여주고, 후보가 없을 때는 UniProt/AlphaFold 구조 후보를 연결합니다.

## 기능

- 한국어/영어 단백질명 검색
- RCSB PDB 후보 표시
- AlphaFold 구조 fallback
- 3Dmol 기반 단백질 구조 시각화
- 리본, 스틱, 구체, 표면, 신뢰도 색상 보기
- 구조 부위 클릭 시 잔기/원자 설명 툴팁
- Europe PMC 기반 논문 초록 요약, 연관 키워드, 참고문헌 보기
- 추천 단백질 랜덤 카드
- mmCIF/PDB 파일 다운로드 링크

## 실행

로컬 서버를 실행합니다.

```bash
npm start
```

브라우저에서 `http://localhost:4173`을 열면 됩니다. 인터넷 연결이 필요합니다. 3Dmol, RCSB PDB, UniProt, AlphaFold DB의 공개 리소스를 사용합니다.

## 호스팅

정적 파일만으로 동작하므로 Netlify, Vercel, GitHub Pages에 그대로 배포할 수 있습니다.

- GitHub Pages: `master` 브랜치에 push하면 GitHub Actions가 자동 배포합니다. 공개 주소는 `https://yangjunho-m.github.io/foldnote/`입니다.
- Netlify: 저장소를 연결하면 `netlify.toml`의 `publish = "."` 설정을 사용합니다.
- Vercel: 저장소를 연결하면 `vercel.json` 헤더 설정이 적용됩니다.

## 데이터와 라이선스 메모

- RCSB PDB 구조/API 데이터는 CC0 기반이며, 원 구조 저자와 PDB ID를 가능한 한 표기하는 편이 좋습니다.
- AlphaFold DB 데이터는 상업적 사용이 가능한 CC BY 4.0 기반이므로 출처, 라이선스, 관련 논문 인용을 유지해야 합니다.
- Europe PMC 초록과 논문 메타데이터는 각 출판사/저자의 권리가 유지될 수 있으므로 원문이나 초록을 대량 복제하지 않고 짧은 요약, 제목, 링크, 인용 정보 중심으로 보여줍니다.
- 3Dmol.js는 BSD 계열 오픈소스 라이선스 기반이며 제품화 시 라이브러리 고지와 인용을 유지하는 것이 좋습니다.

## 주요 파일

- `index.html`: 앱 진입점
- `src/catalog.js`: 예시 단백질, 추천, API URL, 아이콘, 잔기 설명 데이터
- `src/literatureService.js`: Europe PMC 논문 초록 검색과 근거 요약 로직
- `src/proteinService.js`: RCSB, UniProt, AlphaFold 데이터 검색 로직
- `src/styles/`: 기본, 검색 화면, 뷰어, 반응형 스타일
- `styles.css`: 스타일 모듈 진입점
- `app.js`: 화면 상태, 렌더링, 3D 시각화 연결
- `scripts/serve.mjs`: 로컬 정적 서버
