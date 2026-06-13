export interface PipingItem {
  id: string;
  lineNumber: string;
  isoNumber: string;
  revNumber: string;
  service: string;
  classe: string;
  description: string;
  schClass: string;
  typeOfItems: string; // 'PIPE', 'RED TEE', 'CONC REDUCER', '90 SR ELBOW', 'TEE', etc.
  npd: string; // e.g., '250', '100', '250*100', '300', '300*250'
  cmdtyCode: string;
  qty: number;
  unit: string; // 'M' or 'PC'
}

export interface MetricSummary {
  pipesMeters: number;
  elbowCount: number;
  reducerCount: number;
  teeCount: number;
  totalLines: number;
}
