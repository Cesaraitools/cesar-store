"use client";

import { Suspense } from "react";
import SyncContent from "./sync-content";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-10 text-center">جاري التحميل...</div>}>
      <SyncContent />
    </Suspense>
  );
}