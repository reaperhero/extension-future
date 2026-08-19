import { fetchAllQuotes, fetchQuote } from "./lib/sina.js";
import {
  ensureContractsInitialized,
  getContracts,
  getLocalState,
  saveQuote,
  saveQuotes,
  STORAGE_KEYS
} from "./lib/storage.js";

const REFRESH_ALARM = "refresh-quotes";
const REFRESH_INTERVAL_MINUTES = 1;

async function updateBadge() {
  await chrome.action.setBadgeText({ text: "" });
}

async function refreshQuotes() {
  const contracts = await getContracts();
  if (!contracts.length) {
    await saveQuotes({}, "");
    await updateBadge();
    return { prices: {}, errorMessage: "" };
  }

  const result = await fetchAllQuotes(contracts);
  await saveQuotes(result.prices, result.errorMessage);
  await updateBadge();
  return result;
}

async function refreshContractQuote(symbol) {
  const contracts = await getContracts();
  const contract = contracts.find((item) => item.sinaSymbol === symbol);
  if (!contract) {
    throw new Error(`合约不存在：${symbol}`);
  }

  try {
    const quote = await fetchQuote(contract);
    await saveQuote(contract.sinaSymbol, quote, "");
    await updateBadge();
    return { price: quote, errorMessage: "" };
  } catch (error) {
    const errorQuote = {
      symbol: contract.sinaSymbol,
      displayName: contract.displayName,
      error: error instanceof Error ? error.message : String(error),
      fetchedAt: Date.now()
    };
    await saveQuote(contract.sinaSymbol, errorQuote, errorQuote.error);
    await updateBadge();
    return { price: errorQuote, errorMessage: errorQuote.error };
  }
}

async function initialize() {
  await ensureContractsInitialized();
  await chrome.alarms.create(REFRESH_ALARM, {
    periodInMinutes: REFRESH_INTERVAL_MINUTES
  });
  await refreshQuotes();
}

chrome.runtime.onInstalled.addListener(() => {
  void initialize();
});

chrome.runtime.onStartup.addListener(() => {
  void initialize();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === REFRESH_ALARM) {
    void refreshQuotes();
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "refreshQuotes") {
    refreshQuotes()
      .then((result) => sendResponse({ ok: true, ...result }))
      .catch((error) =>
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : String(error)
        })
      );
    return true;
  }

  if (message?.type === "refreshQuote") {
    refreshContractQuote(message.symbol)
      .then((result) => sendResponse({ ok: true, ...result }))
      .catch((error) =>
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : String(error)
        })
      );
    return true;
  }

  if (message?.type === "contractsUpdated") {
    refreshQuotes()
      .then(() => sendResponse({ ok: true }))
      .catch((error) =>
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : String(error)
        })
      );
    return true;
  }

  return false;
});
