const SINA_HTTP_PREFIX = "http://hq.sinajs.cn/list=nf_";
const SINA_HTTPS_PREFIX = "https://hq.sinajs.cn/list=nf_";

function normalizeSymbol(symbol) {
  return String(symbol || "").trim().toUpperCase();
}

function isValidClockTime(hours, minutes, seconds = 0) {
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59 && seconds >= 0 && seconds <= 59;
}

function formatTickTime(rawTime) {
  const value = String(rawTime || "").trim();
  if (/^\d{6}$/.test(value)) {
    const hours = Number.parseInt(value.slice(0, 2), 10);
    const minutes = Number.parseInt(value.slice(2, 4), 10);
    const seconds = Number.parseInt(value.slice(4, 6), 10);
    if (!isValidClockTime(hours, minutes, seconds)) {
      return "";
    }

    return `${value.slice(2, 4)}:${value.slice(4, 6)}`;
  }

  const timeMatch = value.match(/^\d{1,2}:(\d{2}):(\d{2})$/);
  if (timeMatch) {
    const hours = Number.parseInt(value.split(":")[0], 10);
    const minutes = Number.parseInt(timeMatch[1], 10);
    const seconds = Number.parseInt(timeMatch[2], 10);
    if (!isValidClockTime(hours, minutes, seconds)) {
      return "";
    }

    return `${timeMatch[1]}:${timeMatch[2]}`;
  }

  const minuteMatch = value.match(/^\d{1,2}:(\d{2})$/);
  if (minuteMatch) {
    const hours = Number.parseInt(value.split(":")[0], 10);
    const minutes = Number.parseInt(minuteMatch[1], 10);
    if (!isValidClockTime(hours, minutes)) {
      return "";
    }

    return `${minuteMatch[1]}:00`;
  }

  return "";
}

function getQuoteTime(values) {
  const primaryTime = formatTickTime(values[1]);
  if (primaryTime) {
    return primaryTime;
  }

  for (const value of values) {
    if (/^\s*\d{1,2}:\d{2}(:\d{2})?\s*$/.test(String(value || ""))) {
      return formatTickTime(value);
    }
  }

  return "";
}

export function parseSinaQuote(rawText, contract) {
  const eqIndex = rawText.indexOf("=");
  if (eqIndex === -1) {
    throw new Error("数据格式错误：未找到等号");
  }

  let dataPart = rawText.slice(eqIndex + 1).trim();
  if (dataPart.startsWith("\"")) {
    dataPart = dataPart.slice(1);
  }
  dataPart = dataPart.replace(/;$/, "").replace(/"$/, "").trim();

  if (!dataPart) {
    throw new Error("行情为空，可能是合约代码不存在或已过期");
  }

  const values = dataPart.split(",");
  if (values.length < 13) {
    throw new Error(`数据字段不足: ${values.length}`);
  }

  const price = Number.parseFloat(values[8]?.trim());
  const previousClose = Number.parseFloat(values[10]?.trim());

  if (!Number.isFinite(price)) {
    throw new Error(`解析最新价失败: ${values[8]}`);
  }
  if (!Number.isFinite(previousClose)) {
    throw new Error(`解析昨收价失败: ${values[10]}`);
  }
  if (previousClose === 0) {
    throw new Error("昨收价为 0，无法计算涨跌幅");
  }

  const change = price - previousClose;
  const changePct = (change / previousClose) * 100;

  return {
    symbol: normalizeSymbol(contract.sinaSymbol),
    displayName: contract.displayName,
    price,
    change,
    changePct,
    time: getQuoteTime(values),
    fetchedAt: Date.now()
  };
}

async function fetchWithFallback(urls) {
  let lastError;

  for (const url of urls) {
    try {
      const response = await fetch(url, {
        method: "GET",
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.text();
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("请求失败");
}

export async function fetchQuote(contract) {
  const symbol = normalizeSymbol(contract.sinaSymbol);
  if (!symbol) {
    throw new Error("合约代码不能为空");
  }

  const rawText = await fetchWithFallback([
    `${SINA_HTTP_PREFIX}${encodeURIComponent(symbol)}`,
    `${SINA_HTTPS_PREFIX}${encodeURIComponent(symbol)}`
  ]);

  return parseSinaQuote(rawText, {
    ...contract,
    sinaSymbol: symbol
  });
}

export async function fetchAllQuotes(contracts) {
  const prices = {};
  const errors = [];

  await Promise.all(
    contracts.map(async (contract) => {
      try {
        const quote = await fetchQuote(contract);
        prices[contract.sinaSymbol] = quote;
      } catch (error) {
        prices[contract.sinaSymbol] = {
          symbol: normalizeSymbol(contract.sinaSymbol),
          displayName: contract.displayName,
          error: error instanceof Error ? error.message : String(error),
          fetchedAt: Date.now()
        };
        errors.push(`${contract.sinaSymbol}: ${prices[contract.sinaSymbol].error}`);
      }
    })
  );

  return {
    prices,
    errorMessage: errors.join(" | ")
  };
}

export function formatBadgeText(price) {
  if (!price || price.error || !Number.isFinite(price.changePct)) {
    return "ERR";
  }

  const value = price.changePct;
  const absValue = Math.abs(value);
  if (absValue >= 10) {
    return `${value >= 0 ? "+" : ""}${value.toFixed(0)}%`;
  }

  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

export function getBadgeColor(price) {
  if (!price || price.error) {
    return "#64748b";
  }
  if (price.changePct > 0) {
    return "#dc2626";
  }
  if (price.changePct < 0) {
    return "#2563eb";
  }
  return "#475569";
}
