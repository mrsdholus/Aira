const STORAGE_KEY = 'aira.shortcuts.v1';
const MAX_SHORTCUTS = 10;
const defaultShortcuts = [
  { name: 'YouTube', url: 'https://youtube.com' },
  { name: 'Wikipedia', url: 'https://wikipedia.org' },
  { name: 'GitHub', url: 'https://github.com' }
];

const rows = document.querySelector('#shortcut-rows');
const dialog = document.querySelector('#shortcut-dialog');
const form = document.querySelector('#shortcut-form');
const dialogTitle = document.querySelector('#dialog-title');
const nameInput = document.querySelector('#shortcut-name');
const urlInput = document.querySelector('#shortcut-url');
const formError = document.querySelector('#form-error');
const cancelButton = document.querySelector('#dialog-cancel');

let editingIndex = null;
let shortcuts = loadShortcuts();

function loadShortcuts() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(saved) ? saved.slice(0, MAX_SHORTCUTS) : defaultShortcuts;
  } catch {
    return defaultShortcuts;
  }
}

function saveShortcuts() { localStorage.setItem(STORAGE_KEY, JSON.stringify(shortcuts)); }

function normalizeUrl(value) {
  const input = value.trim();
  if (!input) return null;
  try {
    const url = new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(input) ? input : `https://${input}`);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  } catch { return null; }
}

function initial(name) { return [...name.trim()][0]?.toUpperCase() || '↗'; }

function closeMenus(except) {
  document.querySelectorAll('.shortcut-menu').forEach((menu) => {
    if (menu !== except) menu.hidden = true;
  });
}

function openEditor(index = null) {
  editingIndex = index;
  const item = index === null ? null : shortcuts[index];
  dialogTitle.textContent = item ? 'Изменить ярлык' : 'Добавить ярлык';
  nameInput.value = item?.name || '';
  urlInput.value = item?.url || '';
  formError.textContent = '';
  dialog.showModal();
  setTimeout(() => nameInput.focus(), 0);
}

function makeShortcut(item, index) {
  const wrapper = document.createElement('div');
  wrapper.className = 'shortcut';
  const link = document.createElement('a');
  link.className = 'shortcut-link';
  link.href = item.url;
  link.title = item.url;
  const icon = document.createElement('span');
  icon.className = 'shortcut-icon';
  icon.textContent = initial(item.name);
  const name = document.createElement('span');
  name.className = 'shortcut-name';
  name.textContent = item.name;
  link.append(icon, name);

  const menuButton = document.createElement('button');
  menuButton.type = 'button';
  menuButton.className = 'shortcut-menu-button';
  menuButton.textContent = '•••';
  menuButton.title = 'Настроить ярлык';
  const menu = document.createElement('div');
  menu.className = 'shortcut-menu';
  menu.hidden = true;
  const rename = document.createElement('button');
  rename.type = 'button';
  rename.textContent = 'Переименовать';
  rename.addEventListener('click', () => openEditor(index));
  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'delete';
  remove.textContent = 'Удалить';
  remove.addEventListener('click', () => {
    shortcuts.splice(index, 1);
    saveShortcuts();
    render();
  });
  menu.append(rename, remove);
  menuButton.addEventListener('click', (event) => {
    event.stopPropagation();
    const willOpen = menu.hidden;
    closeMenus();
    menu.hidden = !willOpen;
  });
  wrapper.append(link, menuButton, menu);
  return wrapper;
}

function makeAddButton() {
  const wrapper = document.createElement('div');
  wrapper.className = 'shortcut';
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'add-shortcut';
  button.title = 'Добавить ярлык';
  const icon = document.createElement('span');
  icon.className = 'shortcut-icon';
  icon.textContent = '+';
  const name = document.createElement('span');
  name.className = 'shortcut-name';
  name.textContent = 'Добавить';
  button.append(icon, name);
  button.addEventListener('click', () => openEditor());
  wrapper.append(button);
  return wrapper;
}

function render() {
  rows.replaceChildren();
  const items = shortcuts.map(makeShortcut);
  if (shortcuts.length < MAX_SHORTCUTS) items.push(makeAddButton());
  for (let start = 0; start < items.length; start += 5) {
    const row = document.createElement('div');
    row.className = 'shortcut-row';
    row.append(...items.slice(start, start + 5));
    rows.append(row);
  }
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const name = nameInput.value.trim();
  const url = normalizeUrl(urlInput.value);
  if (!name || !url) {
    formError.textContent = 'Введите название и корректный адрес сайта.';
    return;
  }
  const item = { name, url };
  if (editingIndex === null) {
    if (shortcuts.length >= MAX_SHORTCUTS) return;
    shortcuts.push(item);
  } else {
    shortcuts[editingIndex] = item;
  }
  saveShortcuts();
  dialog.close();
  render();
});

cancelButton.addEventListener('click', () => dialog.close());
document.addEventListener('click', () => closeMenus());
document.addEventListener('contextmenu', (event) => {
  const shortcut = event.target.closest('.shortcut');
  if (!shortcut || shortcut.querySelector('.add-shortcut')) return;
  event.preventDefault();
  shortcut.querySelector('.shortcut-menu-button').click();
});
render();
