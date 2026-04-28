export type ProductImportStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed";

export type ProductImportFailure = {
  index: number;
  name: string;
  reason: string;
};

export type ProductImportJobSnapshot = {
  id: string;
  fileName: string;
  status: ProductImportStatus;
  rowsTotal: number;
  rowsProcessed: number;
  rowsSuccess: number;
  rowsFailed: number;
  rowsSkipped: number;
  nextIndex: number;
  startedAt: string | null;
  finishedAt: string | null;
  lastError: string | null;
  failures: ProductImportFailure[];
};
