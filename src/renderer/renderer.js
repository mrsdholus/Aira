const tabStrip = document.querySelector('#tab-strip');
const newTabButton = document.querySelector('#new-tab');
const addressForm = document.querySelector('#address-form');
const addressInput = document.querySelector('#address');
const backButton = document.querySelector('#back');
const forwardButton = document.querySelector('#forward');
const reloadButton = document.querySelector('#reload');
const suggestionsBox = document.querySelector('#suggestions');

let state = { activeTabId: null, tabs: [], history: [] };
let selectedSuggestion = -1;
let visibleSuggestions = [];
let draggedTabId = null;

const popularSites = [
  { title: 'YouTube', url: 'https://youtube.com' },
  { title: 'Wikipedia', url: 'https://wikipedia.org' },
  { title: 'GitHub', url: 'https://github.com' },
  { title: 'Reddit', url: 'https://reddit.com' }
];

function currentTab() {
  return state.tabs.find((tab) => tab.id === state.activeTabId);
}

function makeTab(tab) {
  const button = document.createElement('button');
  button.className = `tab${tab.id === state.activeTabId ? ' active' : ''}`;
  button.type = 'button';
  button.role = 'tab';
  button.draggable = true;
  button.dataset.tabId = String(tab.id);
  button.setAttribute('aria-selected', String(tab.id === state.activeTabId));
  button.title = tab.title;

  const favicon = document.createElement(tab.favicon ? 'img' : 'span');
  favicon.className = `favicon${tab.favicon ? '' : ' favicon-placeholder'}`;
  if (tab.favicon) favicon.src = tab.favicon;
  favicon.setAttribute('aria-hidden', 'true');

  const title = document.createElement('span');
  title.className = 'tab-title';
  title.textContent = tab.title || 'Новая вкладка';

  const close = document.createElement('button');
  close.className = 'tab-close';
  close.type = 'button';
  close.textContent = '×';
  close.title = 'Закрыть вкладку';
  close.setAttribute('aria-label', `Закрыть ${tab.title}`);
  close.addEventListener('click', (event) => {
    event.stopPropagation();
    window.aira.closeTab(tab.id);
  });

  button.append(favicon, title, close);
  button.addEventListener('click', () => window.aira.activateTab(tab.id));
  button.addEventListener('auxclick', (event) => {
    if (event.button === 1) window.aira.closeTab(tab.id);
  });
  button.addEventListener('dragstart', (event) => {
    draggedTabId = tab.id;
    button.classList.add('dragging');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(tab.id));
  });
  button.addEventListener('dragover', (event) => {
    if (draggedTabId === null || draggedTabId === tab.id) return;
    event.preventDefault();
    const after = event.clientX > button.getBoundingClientRect().left + button.offsetWidth / 2;
    button.classList.toggle('drop-after', after);
    button.classList.toggle('drop-before', !after);
  });
  button.addEventListener('dragleave', () => {
    button.classList.remove('drop-before', 'drop-after');
  });
  button.addEventListener('drop', (event) => {
    event.preventDefault();
    const sourceId = Number(event.dataTransfer.getData('text/plain'));
    const after = event.clientX > button.getBoundingClientRect().left + button.offsetWidth / 2;
    button.classList.remove('drop-before', 'drop-after');
    if (sourceId !== tab.id) window.aira.reorderTab(sourceId, tab.id, after);
  });
  button.addEventListener('dragend', () => {
    draggedTabId = null;
    document.querySelectorAll('.tab').forEach((item) => {
      item.classList.remove('dragging', 'drop-before', 'drop-after');
    });
  });
  return button;
}

function render(nextState) {
  state = nextState;
  tabStrip.querySelectorAll('.tab').forEach((tab) => tab.remove());
  for (const tab of state.tabs) tabStrip.insertBefore(makeTab(tab), newTabButton);

  const active = currentTab();
  if (document.activeElement !== addressInput) addressInput.value = active?.url || '';
  backButton.disabled = !active?.canGoBack;
  forwardButton.disabled = !active?.canGoForward;
  reloadButton.textContent = active?.loading ? '×' : '↻';
  reloadButton.title = active?.loading ? 'Остановить' : 'Обновить';
}

function suggestionCandidates(query) {
  const value = query.trim();
  if (!value) return [];
  const needle = value.toLowerCase();
  const pages = [...state.tabs, ...(state.history || []), ...popularSites];
  const unique = [];

  for (const page of pages) {
    if (!page.url || page.url.startsWith('file:')) continue;
    const matches = `${page.title || ''} ${page.url}`.toLowerCase().includes(needle);
    if (matches && !unique.some((item) => item.url === page.url)) {
      unique.push({ title: page.title || page.url, url: page.url, kind: 'page' });
    }
  }

  unique.unshift({
    title: `Искать «${value}»`,
    url: value,
    kind: 'search'
  });
  return unique.slice(0, 6);
}

function hideSuggestions() {
  suggestionsBox.hidden = true;
  addressInput.setAttribute('aria-expanded', 'false');
  selectedSuggestion = -1;
  window.aira.setOverlayBottom(0);
}

function chooseSuggestion(index) {
  const suggestion = visibleSuggestions[index];
  if (!suggestion) return;
  addressInput.value = suggestion.url;
  hideSuggestions();
  window.aira.go(suggestion.url);
  addressInput.blur();
}

function showSuggestions() {
  visibleSuggestions = suggestionCandidates(addressInput.value);
  suggestionsBox.replaceChildren();
  selectedSuggestion = -1;

  if (visibleSuggestions.length === 0) {
    hideSuggestions();
    return;
  }

  visibleSuggestions.forEach((suggestion, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'suggestion';
    button.role = 'option';

    const icon = document.createElement('span');
    icon.className = 'suggestion-icon';
    icon.textContent = suggestion.kind === 'search' ? '⌕' : '↗';

    const copy = document.createElement('span');
    copy.className = 'suggestion-copy';
    const title = document.createElement('span');
    title.className = 'suggestion-title';
    title.textContent = suggestion.title;
    const url = document.createElement('span');
    url.className = 'suggestion-url';
    url.textContent = suggestion.kind === 'search' ? 'DuckDuckGo' : suggestion.url;
    copy.append(title, url);
    button.append(icon, copy);
    button.addEventListener('mousedown', (event) => event.preventDefault());
    button.addEventListener('click', () => chooseSuggestion(index));
    suggestionsBox.append(button);
  });

  suggestionsBox.hidden = false;
  addressInput.setAttribute('aria-expanded', 'true');
  requestAnimationFrame(() => {
    window.aira.setOverlayBottom(suggestionsBox.getBoundingClientRect().bottom + 10);
  });
}

function updateSelectedSuggestion() {
  suggestionsBox.querySelectorAll('.suggestion').forEach((item, index) => {
    item.classList.toggle('selected', index === selectedSuggestion);
  });
}

newTabButton.addEventListener('click', () => window.aira.newTab());
backButton.addEventListener('click', () => window.aira.back());
forwardButton.addEventListener('click', () => window.aira.forward());
reloadButton.addEventListener('click', () => {
  if (currentTab()?.loading) window.aira.stop();
  else window.aira.reload();
});

addressForm.addEventListener('submit', (event) => {
  event.preventDefault();
  if (selectedSuggestion >= 0) {
    chooseSuggestion(selectedSuggestion);
    return;
  }
  hideSuggestions();
  window.aira.go(addressInput.value);
  addressInput.blur();
});

addressInput.addEventListener('input', showSuggestions);
addressInput.addEventListener('focus', () => {
  addressInput.select();
  showSuggestions();
});
addressInput.addEventListener('blur', () => setTimeout(hideSuggestions, 100));
addressInput.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowDown' && visibleSuggestions.length) {
    event.preventDefault();
    selectedSuggestion = (selectedSuggestion + 1) % visibleSuggestions.length;
    updateSelectedSuggestion();
  } else if (event.key === 'ArrowUp' && visibleSuggestions.length) {
    event.preventDefault();
    selectedSuggestion = (selectedSuggestion - 1 + visibleSuggestions.length) % visibleSuggestions.length;
    updateSelectedSuggestion();
  } else if (event.key === 'Escape') {
    hideSuggestions();
    addressInput.blur();
  }
});
window.aira.onState(render);
window.aira.onFocusAddress(() => {
  addressInput.focus();
  addressInput.select();
});
window.aira.getState().then(render);
