import {
  extractContractPrefix,
  getContractDisplayName,
  isValidContractSymbol,
  parseBatchSymbols
} from "./lib/contracts.js";
import { fetchAllQuotes } from "./lib/sina.js";
import { getLocalState, saveContracts, STORAGE_KEYS } from "./lib/storage.js";

const REFRESH_CYCLE_MS = 8000;

const form = document.querySelector("#contractForm");
const symbolsInput = document.querySelector("#symbolsInput");
const contractsList = document.querySelector("#contractsList");
const statusText = document.querySelector("#statusText");
const contractTemplate = document.querySelector("#contractTemplate");

function setStatus(text) {
  statusText.textContent = text;
}

function formatSignedPercent(value) {
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(2)}%`;
}

function getQuoteTone(changePct) {
  if (changePct > 0) {
    return "is-positive";
  }
  if (changePct < 0) {
    return "is-negative";
  }
  return "is-neutral";
}

function renderEmptyState() {
  contractsList.innerHTML = '<div class="empty-state">还没有合约，先添加一条记录。</div>';
}

function getSortChangePct(contract, prices) {
  const quote = prices[contract.sinaSymbol];
  if (!quote || quote.error || !Number.isFinite(quote.changePct)) {
    return Number.NEGATIVE_INFINITY;
  }
  return quote.changePct;
}

function renderContracts(contracts, prices) {
  contractsList.innerHTML = "";
  if (!contracts.length) {
    renderEmptyState();
    return;
  }

  const fragment = document.createDocumentFragment();
  const sortedContracts = [...contracts].sort((left, right) => {
    return getSortChangePct(right, prices) - getSortChangePct(left, prices);
  });

  for (const contract of sortedContracts) {
    const node = contractTemplate.content.firstElementChild.cloneNode(true);
    const quote = prices[contract.sinaSymbol];

    node.querySelector(".contract-name").textContent = `${contract.displayName} ${contract.sinaSymbol}`;

    const meta = node.querySelector(".contract-meta");
    const priceElement = node.querySelector(".quote-price");
    const changeElement = node.querySelector(".quote-change");

    if (!quote) {
      meta.textContent = "--:--";
      priceElement.textContent = "--";
      changeElement.textContent = "--";
      changeElement.classList.add("is-neutral");
    } else if (quote.error) {
      meta.textContent = "错误";
      priceElement.textContent = "错误";
      changeElement.textContent = "--";
      priceElement.classList.add("is-neutral");
      changeElement.classList.add("is-neutral");
    } else {
      const toneClass = getQuoteTone(quote.changePct);
      meta.textContent = quote.time || "--:--";
      priceElement.textContent = quote.price.toFixed(1);
      changeElement.textContent = formatSignedPercent(quote.changePct);
      priceElement.classList.add(toneClass);
      changeElement.classList.add(toneClass);
    }

    node.querySelector(".remove-button").addEventListener("click", async () => {
      const nextContracts = contracts.filter((item) => item.sinaSymbol !== contract.sinaSymbol);
      await saveContracts(nextContracts);
      await notifyContractsUpdated();
      await refreshView();
      await restartAutoRefresh();
    });

    fragment.appendChild(node);
  }

  contractsList.appendChild(fragment);
}

async function notifyContractsUpdated() {
  return chrome.runtime.sendMessage({ type: "contractsUpdated" });
}

async function refreshQuotes() {
  const response = await chrome.runtime.sendMessage({ type: "refreshQuotes" });
  if (!response?.ok) {
    throw new Error(response?.error || "异常");
  }
  return response;
}

async function refreshQuote(symbol) {
  const response = await chrome.runtime.sendMessage({ type: "refreshQuote", symbol });
  if (!response?.ok) {
    throw new Error(response?.error || "异常");
  }
  return response;
}

async function refreshView(statusOverride = "") {
  const state = await getLocalState([
    STORAGE_KEYS.contracts,
    STORAGE_KEYS.prices,
    STORAGE_KEYS.lastUpdated,
    STORAGE_KEYS.lastError
  ]);

  const contracts = Array.isArray(state.contracts) ? state.contracts : [];
  const prices = state.prices || {};

  renderContracts(contracts, prices);

  if (statusOverride) {
    setStatus(statusOverride);
    return;
  }

  if (state.lastUpdated) {
    setStatus(`最近刷新 ${new Date(state.lastUpdated).toLocaleTimeString("zh-CN", { hour12: false })}`);
    return;
  }

  setStatus("");
}

function shuffleContracts(contracts) {
  const result = [...contracts];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[randomIndex]] = [result[randomIndex], result[index]];
  }
  return result;
}

async function addContract(event) {
  event.preventDefault();

  const symbols = parseBatchSymbols(symbolsInput.value);
  if (!symbols.length) {
    setStatus("请先输入至少一个合约代码");
    return;
  }

  const { contracts = [] } = await getLocalState([STORAGE_KEYS.contracts]);
  const existingSymbols = new Set(contracts.map((item) => item.sinaSymbol));
  const invalidSymbols = [];
  const duplicateSymbols = [];
  const additions = [];

  for (const symbol of symbols) {
    if (!isValidContractSymbol(symbol)) {
      invalidSymbols.push(symbol);
      continue;
    }
    if (existingSymbols.has(symbol)) {
      duplicateSymbols.push(symbol);
      continue;
    }

    const displayName = getContractDisplayName(symbol) || extractContractPrefix(symbol) || symbol;
    additions.push({
      displayName,
      sinaSymbol: symbol
    });
  }

  if (!additions.length) {
    const messages = [];
    if (invalidSymbols.length) {
      messages.push(`格式不对：${invalidSymbols.join("、")}`);
    }
    if (duplicateSymbols.length) {
      messages.push(`已存在：${duplicateSymbols.join("、")}`);
    }
    setStatus(messages.join("；") || "没有可添加的合约");
    return;
  }

  const nextContracts = [...contracts, ...additions];
  await saveContracts(nextContracts);

  try {
    setStatus("正在校验并刷新行情...");
    const result = await fetchAllQuotes(nextContracts);
    const failedSymbols = additions
      .filter((item) => result.prices[item.sinaSymbol]?.error)
      .map((item) => `${item.sinaSymbol}(${result.prices[item.sinaSymbol].error})`);

    const messages = [`已添加 ${additions.length} 个合约`];
    if (duplicateSymbols.length) {
      messages.push(`已跳过重复：${duplicateSymbols.join("、")}`);
    }
    if (invalidSymbols.length) {
      messages.push(`格式不对：${invalidSymbols.join("、")}`);
    }
    if (failedSymbols.length) {
      messages.push(`未更新：${failedSymbols.join("；")}`);
    }

    await notifyContractsUpdated();
    form.reset();
    await refreshView(messages.join("；"));
    await restartAutoRefresh();
  } catch (error) {
    setStatus("异常");
  }
}

let pollTimer;
let refreshTimeouts = [];

function stopAutoRefresh() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = undefined;
  }

  for (const timeoutId of refreshTimeouts) {
    clearTimeout(timeoutId);
  }
  refreshTimeouts = [];
}

async function scheduleRandomRefreshCycle() {
  for (const timeoutId of refreshTimeouts) {
    clearTimeout(timeoutId);
  }
  refreshTimeouts = [];

  const { contracts = [] } = await getLocalState([STORAGE_KEYS.contracts]);
  if (!Array.isArray(contracts) || !contracts.length) {
    return;
  }

  const randomizedContracts = shuffleContracts(contracts);
  const stepMs = REFRESH_CYCLE_MS / randomizedContracts.length;

  randomizedContracts.forEach((contract, index) => {
    const delayMs = Math.min(
      REFRESH_CYCLE_MS - 250,
      Math.round(index * stepMs + Math.random() * stepMs * 0.6)
    );

    const timeoutId = window.setTimeout(() => {
      void refreshQuote(contract.sinaSymbol)
        .then(() => refreshView())
        .catch(() => {});
    }, delayMs);
    refreshTimeouts.push(timeoutId);
  });
}

async function restartAutoRefresh() {
  stopAutoRefresh();
  await scheduleRandomRefreshCycle();
  pollTimer = window.setInterval(() => {
    void scheduleRandomRefreshCycle();
  }, REFRESH_CYCLE_MS);
}

async function handleManualRefresh() {
  try {
    setStatus("刷新中...");
    await refreshQuotes();
    await refreshView();
    await restartAutoRefresh();
  } catch (error) {
    setStatus("");
  }
}

form.addEventListener("submit", addContract);

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    void handleManualRefresh();
  } else {
    stopAutoRefresh();
  }
});

window.addEventListener("unload", () => {
  stopAutoRefresh();
});

async function bootstrap() {
  await refreshView();

  try {
    await refreshQuotes();
  } catch (error) {
    setStatus("");
  }

  await refreshView();

  await restartAutoRefresh();
}

void bootstrap();
