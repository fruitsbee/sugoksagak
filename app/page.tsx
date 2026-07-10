import type { Metadata } from "next";
import { SagakApp } from "./components/SagakApp";

export const metadata: Metadata = { title: "사각사각 | 문집 서재", description: "완성된 문집 PDF를 책처럼 읽고, 페이지에 다정한 반응을 남기는 사각사각" };

export default function Home() {
  return <SagakApp />;
}
