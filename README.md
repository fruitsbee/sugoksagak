# 사각사각 디지털 문고

공개 문고: https://fruitsbee.github.io/sugoksagak/

## 실제 배포 경로

GitHub Pages는 main 브랜치의 루트 `index.html`, `github-pages.js`, `github-pages.css`, `lib/reader-core.js`, `public/books/`를 서비스합니다. 빌드가 필요 없는 정적 사이트입니다.

- 로컬 미리보기: `python3 -m http.server 8765`
- 공개 문고 검사: `npm run test:pages`
- 전체 회귀 검사: `npm test`
- 배포: 검증 후 main에 push하고 GitHub Pages 배포 성공과 실제 주소를 확인합니다.

PDF는 열린 문집당 하나의 로딩 작업을 재사용하고, 페이지 이동 시 기존 렌더링을 취소합니다. 서재 복귀와 문집 변경 시 문서를 정리합니다. 읽던 쪽은 브라우저 localStorage에만 저장되며 저장소가 차단되어도 열람할 수 있습니다. `#book=sugok-autumn&page=3` 형태의 주소는 해당 쪽을 직접 엽니다. PDF.js와 워커는 동일 버전의 jsDelivr CDN을 사용합니다. 실패 시 재시도와 원본 PDF 링크를 제공합니다.

## 문집 추가

`public/books/README.md`를 참고하세요. 원본 PDF, 표지, manifest를 함께 커밋합니다. 페이지 수는 실제 PDF와 대조합니다. 원본을 임의로 압축하거나 덮어쓰지 않습니다.

## 보존한 별도 실행 경로

`app/`, `worker/`, `build/`, `.openai/hosting.json`은 기존 Sites/React 버전입니다. GitHub Pages의 실행 코드는 아닙니다. 기존 Sites 연결 보존을 위해 유지하며, 공개 문고 변경은 위 정적 파일에 적용합니다.

- Sites 개발: `npm run dev`
- Sites 빌드/회귀 검사: `npm run test:sites`

참조되지 않는 업로드 편집기, 브라우저 PDF 저장소와 미리보기 컴포넌트는 제거했습니다. 사용자의 브라우저에 있던 저장 데이터는 삭제하지 않습니다.
