import { PipingItem, MetricSummary } from "./types";

export interface GroupedRecap {
  type: string;
  sch: string;
  npd: string;
  totalQty: number;
  unit: string;
  itemCount: number;
  items: PipingItem[];
}

export function computeSummary(items: PipingItem[]): MetricSummary {
  let pipesMeters = 0;
  let elbowCount = 0;
  let reducerCount = 0;
  let teeCount = 0;
  const uniqueLines = new Set<string>();

  items.forEach(item => {
    if (item.lineNumber) uniqueLines.add(item.lineNumber);
    
    const type = item.typeOfItems.toUpperCase();
    if (type === "PIPE" || item.unit === "M") {
      pipesMeters += item.qty;
    } else if (type === "ELBOW" || type.includes("ELBOW")) {
      elbowCount += item.qty;
    } else if (type === "REDUCER" || type.includes("REDUCER")) {
      reducerCount += item.qty;
    } else if (type === "TEE" || type.includes("TEE")) {
      teeCount += item.qty;
    }
  });

  return {
    pipesMeters: parseFloat(pipesMeters.toFixed(2)),
    elbowCount,
    reducerCount,
    teeCount,
    totalLines: uniqueLines.size,
  };
}

// Group items by Type, Schedule, and NPD for the quantitative recap grid
export function getGroupedRecap(items: PipingItem[]): GroupedRecap[] {
  const groups: { [key: string]: GroupedRecap } = {};

  items.forEach(item => {
    const key = `${item.typeOfItems}_${item.schClass}_${item.npd}_${item.unit}`;
    if (!groups[key]) {
      groups[key] = {
        type: item.typeOfItems,
        sch: item.schClass,
        npd: item.npd,
        totalQty: 0,
        unit: item.unit,
        itemCount: 0,
        items: []
      };
    }
    groups[key].totalQty += item.qty;
    groups[key].itemCount += 1;
    groups[key].items.push(item);
  });

  // Sort by item type first, then size, then schedule
  return Object.values(groups).map(g => ({
    ...g,
    totalQty: parseFloat(g.totalQty.toFixed(2))
  })).sort((a, b) => {
    if (a.type !== b.type) return a.type.localeCompare(b.type);
    if (a.npd !== b.npd) return a.npd.localeCompare(b.npd);
    return a.sch.localeCompare(b.sch);
  });
}

// Estimate weld joints based on industrial standards:
// - PIPE: usually has 2 butt welds per typical 6m reel segment.
// - ELBOW: 2 butt welds
// - TEE: 3 butt welds
// - REDUCER: 2 butt welds
export function estimatePipingWelds(items: PipingItem[]): {
  totalWeldsEstimate: number;
  byNpd: { [npd: string]: number };
} {
  let totalWeldsEstimate = 0;
  const byNpd: { [npd: string]: number } = {};

  items.forEach(item => {
    const type = item.typeOfItems.toUpperCase();
    let welds = 0;

    if (type === "PIPE") {
      // General rule of thumb: 1 butt-weld per 6 meters of pipe
      welds = Math.ceil(item.qty / 6) * 1;
    } else if (type === "ELBOW" || type.includes("ELBOW")) {
      welds = item.qty * 2;
    } else if (type === "TEE" || type.includes("TEE")) {
      welds = item.qty * 3;
    } else if (type === "REDUCER" || type.includes("REDUCER")) {
      welds = item.qty * 2;
    } else {
      welds = item.qty * 2; // general default for other fittings (valves, flanges, etc.)
    }

    totalWeldsEstimate += welds;
    
    // Distribute welds by NPD size
    const size = item.npd;
    byNpd[size] = (byNpd[size] || 0) + welds;
  });

  return { totalWeldsEstimate, byNpd };
}

// Helper to convert items list to standard clean CSV text for direct client-side downloads
export function exportToCSV(items: PipingItem[]): string {
  const headers = "LINE NO;ISO NO;REV N°;SERVICE;CLASSE;DESCRIPTION;SCH/CLASS;TYPE OF ITEMS;NPD(MM);CMDTY CODE;QTY;UNIT";
  const rows = items.map(item => {
    return [
      item.lineNumber,
      item.isoNumber,
      item.revNumber,
      item.service,
      item.classe,
      `"${item.description.replace(/"/g, '""')}"`,
      item.schClass,
      item.typeOfItems,
      item.npd,
      item.cmdtyCode,
      item.qty.toString().replace(".", ","), // support standard chemical engineer comma decimal
      item.unit
    ].join(";");
  });
  return [headers, ...rows].join("\n");
}
