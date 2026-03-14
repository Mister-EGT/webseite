const STORAGE = {
  token: 'coc-token',
  player: 'coc-last-player-tag',
  clan: 'coc-last-clan-tag',
  war: 'coc-last-war-tag',
  location: 'coc-last-location',
  apiBase: 'coc-api-base',
  activeTab: 'coc-active-tab'
};

const DEFAULT_API_BASE = 'https://api.clashofclans.com/v1';
const $ = id => document.getElementById(id);

const el = {
  tokenInput: $('tokenInput'),
  apiBaseInput: $('apiBaseInput'),
  tokenStatus: $('tokenStatus'),
  connectionStatus: $('connectionStatus'),
  msg: $('globalMessage'),
  playerTag: $('playerTagInput'),
  clanTag: $('clanTagInput'),
  warTag: $('warClanTagInput'),
  location: $('locationSelect'),
  playerSummary: $('playerSummary'),
  playerDetails: $('playerDetails'),
  clanSummary: $('clanSummary'),
  clanMembers: $('clanMembers'),
  warSummary: $('warSummary'),
  warRoster: $('warRoster'),
  playerRankings: $('playerRankings'),
  clanRankings: $('clanRankings'),
  playerJson: $('playerJson'),
  clanJson: $('clanJson'),
  membersJson: $('membersJson'),
  warJson: $('warJson'),
  leagueJson: $('leagueGroupJson'),
  locationsJson: $('locationsJson'),
  playerRankingsJson: $('playerRankingsJson'),
  clanRankingsJson: $('clanRankingsJson')
};

const escapeHtml = value => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const getToken = () => localStorage.getItem(STORAGE.token)?.trim() || '';
const getApiBase = () => normalizeApiBase(localStorage.getItem(STORAGE.apiBase) || DEFAULT_API_BASE);

function normalizeApiBase(raw) {
  const value = (raw || '').trim();
  if (!value) return DEFAULT_API_BASE;
  return value.replace(/\/+$/, '');
}

function setPill(node, mode, text) {
  node.className = `pill ${mode}`;
  node.textContent = text;
}

function updateTokenPill() {
  setPill(el.tokenStatus, getToken() ? 'success' : 'neutral', getToken() ? 'Token gespeichert' : 'Kein Token gespeichert');
}

function setConnectionNeutral(text = 'Verbindung ungeprüft') {
  setPill(el.connectionStatus, 'neutral', text);
}

function setConnectionSuccess(text) {
  setPill(el.connectionStatus, 'success', text);
}

function setConnectionError(text) {
  setPill(el.connectionStatus, 'error', text);
}

function show(text, type = 'success') {
  el.msg.textContent = text;
  el.msg.className = `message ${type}`;
}

function hideMessage() {
  el.msg.className = 'message hidden';
  el.msg.textContent = '';
}

function norm(raw) {
  const clean = (raw || '')
    .trim()
    .replace(/\s+/g, '')
    .toUpperCase()
    .replace(/^%23/i, '#')
    .replace(/^#+/, '#');
  return clean ? (clean.startsWith('#') ? clean : `#${clean}`) : '';
}

function enc(tag) {
  return encodeURIComponent(norm(tag));
}

function num(value) {
  return value === null || value === undefined || value === ''
    ? '–'
    : new Intl.NumberFormat('de-DE').format(value);
}

function json(target, data) {
  target.textContent = JSON.stringify(data ?? {}, null, 2);
}

function formatApiTime(value) {
  if (!value) return '–';
  const match = String(value).match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/);
  if (!match) return escapeHtml(String(value));
  const [, year, month, day, hour, minute] = match;
  return `${day}.${month}.${year} ${hour}:${minute} UTC`;
}

function metrics(target, items) {
  target.classList.remove('empty');
  target.innerHTML = items.map(item => `
    <article class="metric">
      <span class="metric-label">${escapeHtml(item.label)}</span>
      <strong>${escapeHtml(item.value)}</strong>
    </article>
  `).join('');
}

function listCard(title, items) {
  const safeItems = Array.isArray(items) && items.length ? items : ['Keine Daten'];
  return `
    <section class="card">
      <h4>${escapeHtml(title)}</h4>
      <ul>${safeItems.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
    </section>
  `;
}

function emptyState(target, text, className = 'empty') {
  target.className = className;
  target.innerHTML = escapeHtml(text);
}

function needToken() {
  const token = getToken();
  if (!token) {
    throw new Error('Bitte zuerst einen Clash of Clans API Token speichern.');
  }
  return token;
}

async function api(path) {
  const token = needToken();
  const base = getApiBase();
  let response;

  try {
    response = await fetch(`${base}${path}`, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`
      }
    });
  } catch (error) {
    throw new Error('Netzwerkfehler. Prüfe Token, Internetzugang, API Basis URL oder Browser Einschränkungen.');
  }

  const raw = await response.text();
  let data = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = raw || null;
  }

  if (!response.ok) {
    const apiReason = typeof data === 'object' ? (data?.reason || data?.message) : null;
    if (response.status === 403) {
      throw new Error(apiReason || 'Zugriff verweigert. Häufig ist der Token ungültig oder auf eine andere IP freigeschaltet.');
    }
    if (response.status === 404) {
      throw new Error(apiReason || 'Nicht gefunden. Prüfe das Tag oder den gewählten Endpunkt.');
    }
    if (response.status === 429) {
      throw new Error(apiReason || 'Zu viele Anfragen in kurzer Zeit. Bitte kurz warten und erneut versuchen.');
    }
    throw new Error(apiReason || `HTTP ${response.status}`);
  }

  if (typeof data !== 'object' || data === null) {
    throw new Error('Die API hat keine verwertbaren JSON Daten zurückgegeben.');
  }

  return data;
}

function activate(id) {
  document.querySelectorAll('.content').forEach(panel => panel.classList.toggle('active', panel.id === id));
  document.querySelectorAll('.tab').forEach(button => button.classList.toggle('active', button.dataset.target === id));
  localStorage.setItem(STORAGE.activeTab, id);
}

function setButtonsDisabled(disabled) {
  document.querySelectorAll('button').forEach(button => {
    button.disabled = disabled;
  });
}

async function withBusy(action) {
  setButtonsDisabled(true);
  try {
    await action();
  } finally {
    setButtonsDisabled(false);
  }
}

async function verifyConnection() {
  const locations = await api('/locations');
  const count = Array.isArray(locations.items) ? locations.items.length : 0;
  setConnectionSuccess(`Verbindung ok, ${count} Standorte geladen`);
  json(el.locationsJson, locations.items || []);
  return locations;
}

async function loadLocations(preloaded = null) {
  const payload = preloaded || await api('/locations');
  const items = Array.isArray(payload.items) ? payload.items : [];
  if (!items.length) {
    el.location.innerHTML = '<option value="">Keine Standorte gefunden</option>';
    json(el.locationsJson, []);
    return;
  }

  el.location.innerHTML = items
    .map(item => `<option value="${escapeHtml(String(item.id))}">${escapeHtml(item.name)}</option>`)
    .join('');

  const saved = localStorage.getItem(STORAGE.location);
  const globalLocation = items.find(item => String(item.id).toLowerCase() === 'global' || String(item.name).toLowerCase() === 'global');

  if (saved && items.some(item => String(item.id) === saved)) {
    el.location.value = saved;
  } else if (globalLocation) {
    el.location.value = String(globalLocation.id);
  }

  json(el.locationsJson, items);
}

async function loadPlayer(tag) {
  const normalized = norm(tag);
  if (!normalized) throw new Error('Bitte ein Spieler Tag eingeben.');

  localStorage.setItem(STORAGE.player, normalized);
  const player = await api(`/players/${enc(normalized)}`);

  metrics(el.playerSummary, [
    { label: 'Name', value: player.name || '–' },
    { label: 'Tag', value: player.tag || normalized },
    { label: 'Town Hall', value: num(player.townHallLevel) },
    { label: 'Trophäen', value: num(player.trophies) },
    { label: 'Bestmarke', value: num(player.bestTrophies) },
    { label: 'XP Level', value: num(player.expLevel) },
    { label: 'Angriffe gewonnen', value: num(player.attackWins) },
    { label: 'Verteidigungen gewonnen', value: num(player.defenseWins) }
  ]);

  el.playerDetails.innerHTML = `
    <div class="info">
      ${listCard('Helden', (player.heroes || []).map(hero => `${hero.name}: Level ${hero.level}`))}
      ${listCard('Truppen', (player.troops || []).slice(0, 14).map(troop => `${troop.name}: Level ${troop.level}`))}
      ${listCard('Zauber', (player.spells || []).map(spell => `${spell.name}: Level ${spell.level}`))}
      ${listCard('Erfolge', (player.achievements || []).slice(0, 10).map(achievement => `${achievement.name}: ${num(achievement.value)}`))}
    </div>
  `;

  json(el.playerJson, player);
  show(`Spielerdaten für ${player.name || normalized} geladen.`);
}

function membersTable(items) {
  if (!items?.length) {
    el.clanMembers.innerHTML = '<div class="empty">Keine Mitglieder gefunden.</div>';
    return;
  }

  el.clanMembers.innerHTML = `
    <div class="table">
      <div class="thead"><span>Rang</span><span>Name</span><span>Rolle</span><span>Trophäen</span><span>Spenden</span></div>
      ${items.slice(0, 30).map(member => `
        <div class="tr">
          <span><span class="badge">#${escapeHtml(member.clanRank ?? '–')}</span></span>
          <span>${escapeHtml(member.name)}</span>
          <span>${escapeHtml(member.role || '–')}</span>
          <span>${escapeHtml(num(member.trophies))}</span>
          <span>${escapeHtml(num(member.donations))}</span>
        </div>
      `).join('')}
    </div>
  `;
}

async function loadClan(tag) {
  const normalized = norm(tag);
  if (!normalized) throw new Error('Bitte ein Clan Tag eingeben.');

  localStorage.setItem(STORAGE.clan, normalized);
  const [clan, members] = await Promise.all([
    api(`/clans/${enc(normalized)}`),
    api(`/clans/${enc(normalized)}/members`)
  ]);

  metrics(el.clanSummary, [
    { label: 'Clanname', value: clan.name || '–' },
    { label: 'Tag', value: clan.tag || normalized },
    { label: 'Level', value: num(clan.clanLevel) },
    { label: 'Mitglieder', value: num(clan.members) },
    { label: 'Clan Punkte', value: num(clan.clanPoints) },
    { label: 'War Wins', value: num(clan.warWins) },
    { label: 'Win Streak', value: num(clan.warWinStreak) },
    { label: 'Capital League', value: clan.capitalLeague?.name || '–' }
  ]);

  membersTable(members.items || []);
  json(el.clanJson, clan);
  json(el.membersJson, members.items || []);
  show(`Claninfos für ${clan.name || normalized} geladen.`);
}

function warSides(war) {
  const renderSide = (title, members = []) => `
    <section class="sub">
      <h4>${escapeHtml(title)}</h4>
      <div class="ranking-list">
        ${members.length ? members.slice(0, 15).map(member => `
          <article class="ranking">
            <div class="badge">#${escapeHtml(member.mapPosition || '–')}</div>
            <div class="ranking-name">
              <strong>${escapeHtml(member.name)}</strong>
              <span>Angriffe: ${escapeHtml(num(member.attacks?.length || 0))}</span>
            </div>
            <div class="ranking-value">${escapeHtml(num(member.stars || 0))}★</div>
          </article>
        `).join('') : '<div class="empty">Keine Teilnehmerdaten vorhanden.</div>'}
      </div>
    </section>
  `;

  el.warRoster.innerHTML = `
    <div class="dual">
      ${renderSide(war.clan?.name || 'Eigenes Clanlager', war.clan?.members || [])}
      ${renderSide(war.opponent?.name || 'Gegner', war.opponent?.members || [])}
    </div>
  `;
}

async function loadWar(tag) {
  const normalized = norm(tag);
  if (!normalized) throw new Error('Bitte ein Clan Tag eingeben.');

  localStorage.setItem(STORAGE.war, normalized);
  let war = null;
  let leagueGroup = { info: 'Keine CWL Gruppeninfos verfügbar oder Clan aktuell nicht in Liga.' };

  try {
    war = await api(`/clans/${enc(normalized)}/currentwar`);
  } catch (error) {
    if (!String(error.message).includes('Nicht gefunden')) {
      throw error;
    }
    war = { state: 'notInWar', clan: { name: normalized, members: [] }, opponent: { name: 'Kein aktueller Gegner', members: [] } };
  }

  try {
    leagueGroup = await api(`/clans/${enc(normalized)}/currentwar/leaguegroup`);
  } catch {
    // absichtlich stumm, da CWL nicht immer verfügbar ist
  }

  metrics(el.warSummary, [
    { label: 'Status', value: war.state || '–' },
    { label: 'Team Size', value: num(war.teamSize) },
    { label: 'Clan Sterne', value: num(war.clan?.stars || 0) },
    { label: 'Gegner Sterne', value: num(war.opponent?.stars || 0) },
    { label: 'Clan Zerstörung', value: war.clan?.destructionPercentage !== undefined ? `${war.clan.destructionPercentage}%` : '–' },
    { label: 'Gegner Zerstörung', value: war.opponent?.destructionPercentage !== undefined ? `${war.opponent.destructionPercentage}%` : '–' },
    { label: 'Start', value: formatApiTime(war.startTime) },
    { label: 'Ende', value: formatApiTime(war.endTime) }
  ]);

  warSides(war);
  json(el.warJson, war);
  json(el.leagueJson, leagueGroup);
  show(`Kriegsdaten für ${war.clan?.name || normalized} geladen.`);
}

function rankingList(target, items, type) {
  if (!items?.length) {
    target.className = 'empty';
    target.innerHTML = 'Keine Daten gefunden.';
    return;
  }

  target.className = 'ranking-list';
  target.innerHTML = items.slice(0, 20).map(item => `
    <article class="ranking">
      <div class="badge">#${escapeHtml(item.rank)}</div>
      <div class="ranking-name">
        <strong>${escapeHtml(item.name)}</strong>
        <span>${type === 'player' ? escapeHtml(item.tag || '–') : `${escapeHtml(num(item.members))} Mitglieder`}</span>
      </div>
      <div class="ranking-value">${escapeHtml(num(type === 'player' ? item.trophies : item.clanPoints))}</div>
    </article>
  `).join('');
}

async function loadRankings() {
  const id = el.location.value;
  if (!id) throw new Error('Kein Standort ausgewählt.');

  localStorage.setItem(STORAGE.location, id);
  const [players, clans] = await Promise.all([
    api(`/locations/${id}/rankings/players`),
    api(`/locations/${id}/rankings/clans`)
  ]);

  rankingList(el.playerRankings, players.items || [], 'player');
  rankingList(el.clanRankings, clans.items || [], 'clan');
  json(el.playerRankingsJson, players.items || []);
  json(el.clanRankingsJson, clans.items || []);
  show('Rankings geladen.');
}

function boot() {
  el.tokenInput.value = getToken();
  el.apiBaseInput.value = getApiBase();
  el.playerTag.value = localStorage.getItem(STORAGE.player) || '';
  el.clanTag.value = localStorage.getItem(STORAGE.clan) || '';
  el.warTag.value = localStorage.getItem(STORAGE.war) || '';
  updateTokenPill();
  setConnectionNeutral();

  const rememberedTab = localStorage.getItem(STORAGE.activeTab) || 'playerPanel';
  activate(document.getElementById(rememberedTab) ? rememberedTab : 'playerPanel');
}

function clearDataViews() {
  emptyState(el.playerSummary, 'Noch keine Spielerdaten geladen.', 'grid empty');
  el.playerDetails.innerHTML = '';
  emptyState(el.clanSummary, 'Noch keine Claninfos geladen.', 'grid empty');
  el.clanMembers.innerHTML = '';
  emptyState(el.warSummary, 'Noch keine Kriegsdaten geladen.', 'grid empty');
  el.warRoster.innerHTML = '';
  emptyState(el.playerRankings, 'Noch keine Rankingdaten geladen.');
  emptyState(el.clanRankings, 'Noch keine Rankingdaten geladen.');
  el.location.innerHTML = '';
  json(el.playerJson, {});
  json(el.clanJson, {});
  json(el.membersJson, []);
  json(el.warJson, {});
  json(el.leagueJson, {});
  json(el.locationsJson, []);
  json(el.playerRankingsJson, []);
  json(el.clanRankingsJson, []);
}

function bind() {
  document.querySelectorAll('.tab').forEach(button => {
    button.addEventListener('click', async () => {
      activate(button.dataset.target);
      if (button.dataset.target === 'rankingsPanel' && getToken() && !el.location.options.length) {
        hideMessage();
        await withBusy(async () => {
          try {
            await loadLocations();
          } catch (error) {
            show(error.message, 'error');
            setConnectionError('Standorte konnten nicht geladen werden');
          }
        });
      }
    });
  });

  $('toggleTokenBtn').addEventListener('click', () => {
    const showingPlainText = el.tokenInput.type === 'text';
    el.tokenInput.type = showingPlainText ? 'password' : 'text';
    $('toggleTokenBtn').textContent = showingPlainText ? 'Anzeigen' : 'Verbergen';
  });

  $('saveTokenBtn').addEventListener('click', async () => {
    hideMessage();
    await withBusy(async () => {
      const token = el.tokenInput.value.trim();
      const base = normalizeApiBase(el.apiBaseInput.value);

      if (!token) {
        show('Bitte zuerst einen Token einfügen.', 'error');
        return;
      }

      localStorage.setItem(STORAGE.token, token);
      localStorage.setItem(STORAGE.apiBase, base);
      el.apiBaseInput.value = base;
      updateTokenPill();
      setConnectionNeutral('Verbindung wird geprüft');

      try {
        const locations = await verifyConnection();
        await loadLocations(locations);
        show('Token gespeichert und Verbindung erfolgreich geprüft.');
      } catch (error) {
        setConnectionError('Verbindung fehlgeschlagen');
        show(`Token gespeichert, aber Test fehlgeschlagen: ${error.message}`, 'error');
      }
    });
  });

  $('validateTokenBtn').addEventListener('click', async () => {
    hideMessage();
    await withBusy(async () => {
      const token = el.tokenInput.value.trim();
      const base = normalizeApiBase(el.apiBaseInput.value);
      if (!token) {
        show('Bitte zuerst einen Token einfügen.', 'error');
        return;
      }
      localStorage.setItem(STORAGE.token, token);
      localStorage.setItem(STORAGE.apiBase, base);
      el.apiBaseInput.value = base;
      updateTokenPill();
      setConnectionNeutral('Verbindung wird geprüft');

      try {
        const locations = await verifyConnection();
        await loadLocations(locations);
        show('Verbindung erfolgreich geprüft.');
      } catch (error) {
        setConnectionError('Verbindung fehlgeschlagen');
        show(`Prüfung fehlgeschlagen: ${error.message}`, 'error');
      }
    });
  });

  $('clearTokenBtn').addEventListener('click', () => {
    localStorage.removeItem(STORAGE.token);
    localStorage.removeItem(STORAGE.apiBase);
    el.tokenInput.value = '';
    el.apiBaseInput.value = DEFAULT_API_BASE;
    updateTokenPill();
    setConnectionNeutral();
    clearDataViews();
    show('Token und API Basis URL entfernt.', 'info');
  });

  $('playerForm').addEventListener('submit', async event => {
    event.preventDefault();
    hideMessage();
    await withBusy(async () => {
      try {
        await loadPlayer(el.playerTag.value);
      } catch (error) {
        show(error.message, 'error');
      }
    });
  });

  $('clanForm').addEventListener('submit', async event => {
    event.preventDefault();
    hideMessage();
    await withBusy(async () => {
      try {
        await loadClan(el.clanTag.value);
      } catch (error) {
        show(error.message, 'error');
      }
    });
  });

  $('warForm').addEventListener('submit', async event => {
    event.preventDefault();
    hideMessage();
    await withBusy(async () => {
      try {
        await loadWar(el.warTag.value);
      } catch (error) {
        show(error.message, 'error');
      }
    });
  });

  $('loadRankingsBtn').addEventListener('click', async () => {
    hideMessage();
    await withBusy(async () => {
      try {
        if (!el.location.options.length) {
          await loadLocations();
        }
        await loadRankings();
      } catch (error) {
        show(error.message, 'error');
      }
    });
  });
}

(async function init() {
  boot();
  bind();
  clearDataViews();

  if (getToken()) {
    hideMessage();
    await withBusy(async () => {
      try {
        const locations = await verifyConnection();
        await loadLocations(locations);
        show('Standorte geladen. Du kannst direkt loslegen.', 'success');
      } catch (error) {
        setConnectionError('Verbindung fehlgeschlagen');
        show(`Start fehlgeschlagen: ${error.message}`, 'error');
      }
    });
  }
})();
