# 사각사각 문집 등록

PDF 원본과 표지 이미지를 `public/books/`에 넣고 `manifest.json`에 한 항목을 추가합니다.

필수 항목은 `id`, `title`, `subtitle`, `editor`, `createdAt`, `pageCount`, `pdfUrl`, `coverUrl`입니다.
이 폴더는 공개 업로드 화면이 아니라 발행된 문집 원본을 관리하는 운영용 폴더입니다.
PDF와 `manifest.json`은 GitHub에 함께 커밋되므로, 다음 PDF도 이 폴더에 넣고 manifest 항목을 추가하면 GitHub에서도 같은 문집이 열립니다.
