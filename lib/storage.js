const STORAGE_KEYS = {
  contracts: "contracts",
  prices: "prices",
  lastUpdated: "lastUpdated",
  lastError: "lastError"
};

export async function getLocalState(keys = Object.values(STORAGE_KEYS)) {
  return chrome.storage.local.get(keys);
}

export async function ensureContractsInitialized() {
  const { contracts } = await getLocalState([STORAGE_KEYS.contracts]);
  if (Array.isArray(contracts)) {
    return contracts;
  }

  await chrome.storage.local.set({ [STORAGE_KEYS.contracts]: [] });
  return [];
}

export async function getContracts() {
  const { contracts = [] } = await getLocalState([STORAGE_KEYS.contracts]);
  return Array.isArray(contracts) ? contracts : [];
}

export async function saveContracts(contracts) {
  await chrome.storage.local.set({ [STORAGE_KEYS.contracts]: contracts });
}

export async function saveQuotes(prices, errorMessage = "") {
  await chrome.storage.local.set({
    [STORAGE_KEYS.prices]: prices,
    [STORAGE_KEYS.lastUpdated]: Date.now(),
    [STORAGE_KEYS.lastError]: errorMessage
  });
}

export async function saveQuote(symbol, quote, errorMessage = "") {
  const { prices = {} } = await getLocalState([STORAGE_KEYS.prices]);
  await saveQuotes(
    {
      ...prices,
      [symbol]: quote
    },
    errorMessage
  );
}

export { STORAGE_KEYS };
