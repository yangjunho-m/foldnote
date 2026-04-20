# 단백질 구조 탐색기

한국어 사용자를 위한 단백질 구조 시각화 대시보드 프로토타입입니다. 단백질 이름을 검색하면 RCSB PDB의 실험 구조를 우선으로 보여주고, 후보가 없을 때는 UniProt/AlphaFold 구조 후보를 연결합니다.

## 기능

- 한국어/영어 단백질명 검색
- RCSB PDB 후보 표시
- AlphaFold 구조 fallback
- 3Dmol 기반 단백질 구조 시각화
- 리본, 스틱, 구체, 표면, 신뢰도 색상 보기
- 구조 부위 클릭 시 잔기/원자 설명 툴팁
- 추천 단백질 랜덤 카드
- mmCIF/PDB 파일 다운로드 링크

## 실행

브라우저에서 `index.html`을 열면 됩니다.

```text
D:\workspace\protein3d2\index.html
```

인터넷 연결이 필요합니다. 3Dmol, RCSB PDB, UniProt, AlphaFold DB의 공개 리소스를 사용합니다.

## 주요 파일

- `index.html`: 앱 진입점
- `styles.css`: 전체 레이아웃과 UI 스타일
- `app.js`: 검색, 구조 데이터 연결, 3D 시각화 로직
