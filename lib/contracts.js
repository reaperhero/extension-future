export const CONTRACT_NAME_MAP = {
  AP: "苹果",
  CF: "棉花",
  CJ: "红枣",
  CY: "棉纱",
  FG: "玻璃",
  JR: "粳稻",
  LR: "晚籼稻",
  MA: "甲醇",
  OI: "菜籽油",
  PF: "短纤",
  PK: "花生",
  PR: "瓶片",
  PX: "对二甲苯",
  RM: "菜籽粕",
  SA: "纯碱",
  SF: "硅铁",
  SH: "烧碱",
  SM: "锰硅",
  SR: "白糖",
  TA: "PTA",
  UR: "尿素",
  WH: "强麦",
  ZC: "动力煤"
};

export function extractContractPrefix(symbol) {
  const normalized = String(symbol || "").trim().toUpperCase();
  const match = normalized.match(/^[A-Z]+/);
  return match ? match[0] : "";
}

export function getContractDisplayName(symbol) {
  const prefix = extractContractPrefix(symbol);
  return CONTRACT_NAME_MAP[prefix] || "";
}

export function normalizeContractSymbol(symbol) {
  const normalized = String(symbol || "").trim().toUpperCase();
  const match = normalized.match(/^([A-Z]+)(\d{3})$/);
  if (!match) {
    return normalized;
  }

  return `${match[1]}2${match[2]}`;
}

export function parseBatchSymbols(input) {
  return Array.from(
    new Set(
      String(input || "")
        .split(/[\s,;；\n]+/)
        .map(normalizeContractSymbol)
        .filter(Boolean)
    )
  );
}
