export const CONTRACT_NAME_MAP = {
  A: "豆一",
  AD: "铸造铝合金",
  AG: "白银",
  AL: "铝",
  AO: "氧化铝",
  AP: "苹果",
  AU: "黄金",
  B: "豆二",
  BB: "胶合板",
  BC: "国际铜",
  BR: "丁二烯橡胶",
  BU: "沥青",
  BZ: "纯苯",
  C: "玉米",
  CF: "棉花",
  CJ: "红枣",
  CS: "玉米淀粉",
  CU: "铜",
  CY: "棉纱",
  EB: "苯乙烯",
  EC: "集运欧线",
  EG: "乙二醇",
  FB: "纤维板",
  FG: "玻璃",
  FU: "燃料油",
  HC: "热轧卷板",
  I: "铁矿石",
  IC: "中证500",
  IF: "沪深300",
  IH: "上证50",
  IM: "中证1000",
  J: "焦炭",
  JD: "鸡蛋",
  JM: "焦煤",
  JR: "粳稻",
  L: "聚乙烯",
  LC: "碳酸锂",
  LG: "原木",
  LH: "生猪",
  LR: "晚籼稻",
  LU: "低硫燃料油",
  M: "豆粕",
  MA: "甲醇",
  NI: "镍",
  NR: "20号胶",
  OI: "菜籽油",
  OP: "胶版印刷纸",
  P: "棕榈油",
  PB: "铅",
  PD: "钯",
  PF: "短纤",
  PG: "液化石油气",
  PK: "花生",
  PL: "丙烯",
  PR: "瓶片",
  PM: "普麦",
  PP: "聚丙烯",
  PS: "多晶硅",
  PT: "铂",
  PX: "对二甲苯",
  RB: "螺纹钢",
  RI: "早籼稻",
  RM: "菜籽粕",
  RR: "粳米",
  RS: "油菜籽",
  RU: "天然橡胶",
  SA: "纯碱",
  SC: "原油",
  SF: "硅铁",
  SH: "烧碱",
  SI: "工业硅",
  SM: "锰硅",
  SN: "锡",
  SP: "纸浆",
  SR: "白糖",
  SS: "不锈钢",
  T: "10年期国债",
  TA: "PTA",
  TF: "5年期国债",
  TL: "30年期国债",
  TS: "2年期国债",
  UR: "尿素",
  V: "聚氯乙烯",
  WH: "强麦",
  WR: "线材",
  Y: "豆油",
  ZN: "锌",
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

export function isValidContractSymbol(symbol) {
  return /^[A-Z]+\d+[A-Z]*$/.test(String(symbol || "").trim().toUpperCase());
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
