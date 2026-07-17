/* TermFleet-SSH
 * Light UI, dark terminals, draggable cards grouped into horizontal columns
 * with per-group command broadcast. The SSH transport (POST + WebSocket)
 * matches the original webssh backend contract.
 */
(function () {
  'use strict';

  var HOSTNAME_RE = /((^\s*((([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5]))\s*$)|(^\s*((([0-9A-Fa-f]{1,4}:){7}([0-9A-Fa-f]{1,4}|:))|(([0-9A-Fa-f]{1,4}:){6}(:[0-9A-Fa-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){5}(((:[0-9A-Fa-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){4}(((:[0-9A-Fa-f]{1,4}){1,3})|((:[0-9A-Fa-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){3}(((:[0-9A-Fa-f]{1,4}){1,4})|((:[0-9A-Fa-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){2}(((:[0-9A-Fa-f]{1,4}){1,5})|((:[0-9A-Fa-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){1}(((:[0-9A-Fa-f]{1,4}){1,6})|((:[0-9A-Fa-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9A-Fa-f]{1,4}){1,7})|((:[0-9A-Fa-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))(%.+)?\s*$))|(^\s*((?=.{1,255}$)(?=.*[A-Za-z].*)[0-9A-Za-z](?:(?:[0-9A-Za-z]|\b-){0,61}[0-9A-Za-z])?(?:\.[0-9A-Za-z](?:(?:[0-9A-Za-z]|\b-){0,61}[0-9A-Za-z])?)*)\s*$)/;

  // xterm.js renders to canvas and cannot read CSS custom properties, so the
  // mono stack is passed as a literal string (mirrors the --mono CSS variable).
  var MONO_FONT = '"Fira Code", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace';

  var TERMINAL_THEME = {
    background: '#0a0f1f',
    foreground: '#dbeafe',
    cursor: '#22d3ee',
    cursorAccent: '#0a0f1f',
    selectionBackground: '#334155',
    black: '#1e293b',
    brightBlack: '#475569',
    red: '#f87171',
    green: '#4ade80',
    yellow: '#fbbf24',
    blue: '#60a5fa',
    magenta: '#c084fc',
    cyan: '#22d3ee',
    white: '#e2e8f0',
    brightWhite: '#f8fafc'
  };

  var I18N = {
    zh: {
      langCode: 'zh-CN',
      languageButton: 'EN',
      appTitle: 'TermFleet-SSH',
      skipTerminals: '跳到终端列表',
      togglePanel: '切换连接面板',
      toggleLanguage: '切换语言',
      newGroup: '新建分组',
      disconnectAll: '全部断开',
      connectServer: '连接服务器',
      openSession: '打开新的 SSH 会话',
      hostname: '主机名',
      hostnamePlaceholder: '10.0.0.12 或 host.internal',
      username: '用户名',
      port: '端口',
      password: '密码',
      privateKey: '私钥',
      passphrase: '私钥口令',
      addToGroup: '加入分组',
      connect: '连接',
      serverGroups: '服务器分组',
      ready: '就绪。',
      readyDetail: '就绪。填写表单后即可连接。',
      connectedSummary: '已连接 {count} 个 · {groups}',
      groupCount: '{count} 个分组',
      terminalCount: '{count} 个终端',
      noTerminals: '暂无终端',
      emptyHint: '连接服务器，或将终端卡片拖到这里',
      renameGroup: '双击重命名',
      renameTerminal: '点击重命名终端',
      reorderGroup: '调整分组顺序',
      reorderGroupTitle: '拖动调整分组顺序',
      removeGroup: '删除分组',
      broadcastPlaceholder: '向分组广播命令...',
      broadcastLabel: '向 {name} 广播命令',
      send: '发送',
      defaultGroup: '分组 {number}',
      production: '生产环境',
      staging: '预发布环境',
      keepGroup: '至少保留一个分组。',
      movedTerminals: '已将 {count} 移动到 {name}。',
      connecting: '连接中',
      fitCard: '适应卡片',
      fitTerminal: '调整终端大小',
      maximize: '最大化',
      restore: '还原',
      close: '关闭',
      closeTerminal: '关闭终端',
      dragTerminal: '拖动 {name}',
      establishing: '正在建立连接...',
      resize: '拖动调整高度',
      connected: '已连接',
      socketError: 'WebSocket 错误',
      disconnected: '已断开',
      requestFailed: '请求失败',
      connectionFailed: '连接失败',
      sessionOpened: '{name} 的会话已打开。',
      sentStatus: '已向 {name} 中的 {count} 发送命令。',
      broadcastToast: '已向 {name} 广播 {count}',
      noConnected: '{name} 中没有已连接的终端',
      hostnameRequired: '请填写主机名。',
      hostnameInvalid: '主机名无效。',
      usernameRequired: '请填写用户名。',
      portInvalid: '端口无效。',
      noDisconnect: '没有可断开的终端。',
      allDisconnected: '已断开全部终端。',
      userClosed: '用户关闭',
      closed: '已关闭',
      clientDisconnected: '客户端已断开',
      recognizedHosts: '已识别主机',
      refreshHosts: '刷新',
      loadingHosts: '正在读取 SSH 配置...',
      noHosts: '没有识别到可用主机。',
      hostLoadFailed: '读取 SSH 配置失败。',
      fillHost: '填入',
      openHost: '打开',
      configKey: '私钥',
      configPassword: '密码',
      configNoAuth: '未配置认证',
      loadedHosts: '已识别 {count}。',
      systemSettings: '系统设置',
      confirmDisconnect: '断开全部前确认',
      broadcastEnter: '广播命令自动回车',
      terminalFontSize: '终端字号',
      terminalHeight: '终端默认高度',
      operationLog: '操作日志',
      clearLog: '清空',
      noLogs: '暂无操作记录',
      logConnect: '连接 {name}',
      logDisconnect: '断开 {name}',
      logBroadcast: '向 {name} 广播 {detail}',
      logRenameTerminal: '终端重命名：{oldName} -> {newName}',
      logRenameGroup: '工作组重命名：{oldName} -> {newName}',
      logSettings: '更新系统设置',
      logGroupFullscreen: '进入工作组全屏：{name}',
      logGroupFullscreenExit: '退出工作组全屏',
      shortcutPlaceholder: '控制键',
      ctrlC: 'Ctrl+C',
      ctrlD: 'Ctrl+D',
      ctrlZ: 'Ctrl+Z',
      ctrlL: 'Ctrl+L',
      tabKey: 'Tab',
      escKey: 'Esc',
      broadcastShortcut: '广播控制键',
      reconnectTerminal: '重新连接',
      networkConnecting: '网络：连接中',
      networkOnline: '延迟：{latency} ms',
      networkOffline: '网络：离线',
      groupFullscreen: '工作组全屏',
      exitGroupFullscreen: '退出全屏',
      confirmDisconnectMessage: '确认断开全部终端？',
      terminalRenamed: '终端名称已更新。',
      reconnectingTerminal: '正在重新连接 {name}。',
      localTerminal: '本机终端',
      chooseFile: '选择文件',
      noFileChosen: '未选择文件',
      selectAllHosts: '全选',
      selectHost: '选择 {name}',
      openSelectedHosts: '打开所选（{count}）',
      noHostsSelected: '请先选择要打开的主机。',
      openingSelectedHosts: '正在打开所选 {count} 台主机到 {name}。',
      collapseHosts: '收起',
      expandHosts: '展开',
      maxTerminals: '最多终端数',
      logLocalTerminal: '打开本机终端',
      logRestored: '恢复终端 {name}',
      restoringSessions: '正在恢复终端...',
      localTerminalFailed: '打开本机终端失败。',
      savedSettings: '系统设置已保存。'
    },
    en: {
      langCode: 'en',
      languageButton: '中文',
      appTitle: 'TermFleet-SSH',
      skipTerminals: 'Skip to terminals',
      togglePanel: 'Toggle connection panel',
      toggleLanguage: 'Switch language',
      newGroup: 'New group',
      disconnectAll: 'Disconnect all',
      connectServer: 'Connect server',
      openSession: 'Open a new SSH session',
      hostname: 'Hostname',
      hostnamePlaceholder: '10.0.0.12 or host.internal',
      username: 'Username',
      port: 'Port',
      password: 'Password',
      privateKey: 'Private key',
      passphrase: 'Passphrase',
      addToGroup: 'Add to group',
      connect: 'Connect',
      serverGroups: 'Server groups',
      ready: 'Ready.',
      readyDetail: 'Ready. Fill in the form and connect.',
      connectedSummary: '{count} connected · {groups}',
      groupCount: '{count} {count, group, groups}',
      terminalCount: '{count} {count, terminal, terminals}',
      noTerminals: 'No terminals yet',
      emptyHint: 'Connect a server or drag a card here',
      renameGroup: 'Double-click to rename',
      renameTerminal: 'Click to rename terminal',
      reorderGroup: 'Reorder group',
      reorderGroupTitle: 'Drag to reorder group',
      removeGroup: 'Remove group',
      broadcastPlaceholder: 'Broadcast command to group...',
      broadcastLabel: 'Broadcast command to {name}',
      send: 'Send',
      defaultGroup: 'Group {number}',
      production: 'Production',
      staging: 'Staging',
      keepGroup: 'Keep at least one group.',
      movedTerminals: 'Moved {count} to {name}.',
      connecting: 'connecting',
      fitCard: 'Fit to card',
      fitTerminal: 'Fit terminal',
      maximize: 'Maximize',
      restore: 'Restore',
      close: 'Close',
      closeTerminal: 'Close terminal',
      dragTerminal: 'Drag to move {name}',
      establishing: 'Establishing connection...',
      resize: 'Drag to resize',
      connected: 'connected',
      socketError: 'WebSocket error',
      disconnected: 'disconnected',
      requestFailed: 'request failed',
      connectionFailed: 'Connection failed',
      sessionOpened: 'Session opened for {name}.',
      sentStatus: 'Sent to {count} in {name}.',
      broadcastToast: 'Broadcast to {count} in {name}',
      noConnected: 'No connected terminals in {name}',
      hostnameRequired: 'Hostname is required.',
      hostnameInvalid: 'Invalid hostname.',
      usernameRequired: 'Username is required.',
      portInvalid: 'Invalid port.',
      noDisconnect: 'No terminals to disconnect.',
      allDisconnected: 'Disconnected all terminals.',
      userClosed: 'closed by user',
      closed: 'closed',
      clientDisconnected: 'client disconnected',
      recognizedHosts: 'Recognized hosts',
      refreshHosts: 'Refresh',
      loadingHosts: 'Reading SSH config...',
      noHosts: 'No usable hosts found.',
      hostLoadFailed: 'Failed to read SSH config.',
      fillHost: 'Fill',
      openHost: 'Open',
      configKey: 'key',
      configPassword: 'password',
      configNoAuth: 'no auth configured',
      loadedHosts: 'Found {count}.',
      systemSettings: 'System settings',
      confirmDisconnect: 'Confirm before disconnect all',
      broadcastEnter: 'Append Enter to broadcasts',
      terminalFontSize: 'Terminal font size',
      terminalHeight: 'Default terminal height',
      operationLog: 'Operation log',
      clearLog: 'Clear',
      noLogs: 'No activity yet',
      logConnect: 'Connect {name}',
      logDisconnect: 'Disconnect {name}',
      logBroadcast: 'Broadcast {detail} to {name}',
      logRenameTerminal: 'Rename terminal: {oldName} -> {newName}',
      logRenameGroup: 'Rename group: {oldName} -> {newName}',
      logSettings: 'Update system settings',
      logGroupFullscreen: 'Enter group fullscreen: {name}',
      logGroupFullscreenExit: 'Exit group fullscreen',
      shortcutPlaceholder: 'Keys',
      ctrlC: 'Ctrl+C',
      ctrlD: 'Ctrl+D',
      ctrlZ: 'Ctrl+Z',
      ctrlL: 'Ctrl+L',
      tabKey: 'Tab',
      escKey: 'Esc',
      broadcastShortcut: 'Broadcast key combo',
      reconnectTerminal: 'Reconnect',
      networkConnecting: 'Network: connecting',
      networkOnline: 'Latency: {latency} ms',
      networkOffline: 'Network: offline',
      groupFullscreen: 'Group fullscreen',
      exitGroupFullscreen: 'Exit fullscreen',
      confirmDisconnectMessage: 'Disconnect all terminals?',
      terminalRenamed: 'Terminal name updated.',
      reconnectingTerminal: 'Reconnecting {name}.',
      localTerminal: 'Local terminal',
      chooseFile: 'Choose file',
      noFileChosen: 'No file chosen',
      selectAllHosts: 'Select all',
      selectHost: 'Select {name}',
      openSelectedHosts: 'Open selected ({count})',
      noHostsSelected: 'Select at least one host to open.',
      openingSelectedHosts: 'Opening {count} selected hosts in {name}.',
      collapseHosts: 'Collapse',
      expandHosts: 'Expand',
      maxTerminals: 'Max terminals',
      logLocalTerminal: 'Open local terminal',
      logRestored: 'Restore terminal {name}',
      restoringSessions: 'Restoring terminals...',
      localTerminalFailed: 'Failed to open local terminal.',
      savedSettings: 'System settings saved.'
    }
  };

  var currentLang = window.localStorage.getItem('wssh-language') || 'zh';

  function t(key, data) {
    var text = (I18N[currentLang] && I18N[currentLang][key]) || I18N.zh[key] || key;
    text = text.replace(/\{count, ([^,{}]+), ([^,{}]+)\}/g, function (_, one, many) {
      return data && Number(data.count) === 1 ? one : many;
    });
    return text.replace(/\{(\w+)\}/g, function (_, name) {
      return data && data[name] !== undefined ? data[name] : '';
    });
  }

  // ---- State -------------------------------------------------------------
  var groups = [];          // ordered [{ id, name }]
  var terminals = {};       // id -> terminal record
  var groupSeq = 0;
  var termSeq = 0;

  var drag = null;          // active card drag session
  var columnDrag = null;    // active column drag session
  var focusedGroupId = null;
  var operationLogs = loadLogs();
  var settings = loadSettings();
  var sshConfigCollapsed = false;
  var selectedSshConfigHosts = Object.create(null);
  var sshConfigSelectionAnchor = null;
  var groupLayoutObserver = null;

  // ---- DOM ---------------------------------------------------------------
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var board = $('#board');
  var appShell = $('#app-shell');
  var statusText = $('#status-text');
  var summary = $('#fleet-summary');
  var groupSelect = $('#target-group');
  var connectForm = $('#connect');
  var connectButton = $('#connect-button');
  var toastStack = $('#toast-stack');
  var languageToggle = $('#language-toggle');
  var sshConfigHostInput = $('#ssh-config-host');
  var sshConfigList = $('#ssh-config-list');
  var refreshSshConfig = $('#refresh-ssh-config');
  var selectAllSshConfig = $('#select-all-ssh-config');
  var openSelectedSshConfig = $('#open-selected-ssh-config');
  var openSelectedSshConfigLabel = $('#open-selected-ssh-config-label');
  var sshConfigHosts = [];
  var confirmDisconnectInput = $('#setting-confirm-disconnect');
  var broadcastEnterInput = $('#setting-broadcast-enter');
  var fontSizeInput = $('#setting-font-size');
  var terminalHeightInput = $('#setting-terminal-height');
  var maxTerminalsInput = $('#setting-max-terminals');
  var clearLogButton = $('#clear-log');
  var operationLog = $('#operation-log');
  var openLogButton = $('#open-log');
  var closeLogButton = $('#close-log');
  var clearLogFullButton = $('#clear-log-full');
  var logOverlay = $('#log-overlay');
  var logOutput = $('#log-output');
  var privateKeyInput = $('#privatekey');
  var privateKeyName = $('#privatekey-name');
  var toggleSshConfigButton = $('#toggle-ssh-config');
  var openLocalTerminalButton = $('#open-local-terminal');

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        if (key === 'class') {
          node.className = attrs[key];
        } else if (key === 'text') {
          node.textContent = attrs[key];
        } else if (key === 'html') {
          node.innerHTML = attrs[key];
        } else if (key === 'dataset') {
          Object.keys(attrs[key]).forEach(function (d) { node.dataset[d] = attrs[key][d]; });
        } else {
          node.setAttribute(key, attrs[key]);
        }
      });
    }
    (children || []).forEach(function (child) {
      if (child) { node.appendChild(child); }
    });
    return node;
  }

  var ICONS = {
    grip: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg>',
    send: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m5 12 14-7-6 14-2-5-6-2Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
    trash: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    reconnect: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 6v5h-5M4 18v-5h5M18.5 10A7 7 0 0 0 6.1 7.1L4 9M5.5 14a7 7 0 0 0 12.4 2.9L20 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    maximize: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M8 4H4v4M16 4h4v4M8 20H4v-4M16 20h4v-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    minimize: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 4v3a2 2 0 0 1-2 2H4M15 4v3a2 2 0 0 0 2 2h3M9 20v-3a2 2 0 0 0-2-2H4M15 20v-3a2 2 0 0 1 2-2h3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    close: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
  };

  // ---- Helpers -----------------------------------------------------------
  function setStatus(text) {
    statusText.textContent = text || t('ready');
  }

  function terminalCountText(count) {
    return t('terminalCount', { count: count });
  }

  function groupCountText(count) {
    return t('groupCount', { count: count });
  }

  function loadSettings() {
    var defaults = {
      confirmDisconnect: true,
      broadcastEnter: true,
      terminalFontSize: 13,
      terminalHeight: 300,
      maxTerminals: 20
    };
    try {
      return Object.assign(defaults, JSON.parse(window.localStorage.getItem('wssh-settings') || '{}'));
    } catch (e) {
      return defaults;
    }
  }

  function saveSettings() {
    window.localStorage.setItem('wssh-settings', JSON.stringify(settings));
  }

  function xsrfToken() {
    var input = connectForm.querySelector('input[name="_xsrf"]');
    return input ? input.value : '';
  }

  function loadSystemSettings() {
    window.fetch('system-settings', { credentials: 'same-origin' })
      .then(function (response) { return response.ok ? response.json() : null; })
      .then(function (data) {
        if (!data) { return; }
        settings.maxTerminals = data.maxconn || settings.maxTerminals;
        saveSettings();
        applySettingsToControls();
      });
  }

  function saveSystemSettings() {
    var body = new window.URLSearchParams();
    body.set('maxconn', settings.maxTerminals);
    body.set('_xsrf', xsrfToken());
    window.fetch('system-settings', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString()
    }).then(function (response) {
      if (response.ok) { toast(t('savedSettings'), 'success'); }
    });
  }

  function applySettingsToControls() {
    confirmDisconnectInput.checked = settings.confirmDisconnect;
    broadcastEnterInput.checked = settings.broadcastEnter;
    fontSizeInput.value = settings.terminalFontSize;
    terminalHeightInput.value = settings.terminalHeight;
    maxTerminalsInput.value = settings.maxTerminals;
  }

  function updateSettingsFromControls() {
    settings.confirmDisconnect = confirmDisconnectInput.checked;
    settings.broadcastEnter = broadcastEnterInput.checked;
    settings.terminalFontSize = Math.max(10, Math.min(24, Number(fontSizeInput.value) || 13));
    settings.terminalHeight = Math.max(180, Math.min(720, Number(terminalHeightInput.value) || 300));
    settings.maxTerminals = Math.max(1, Math.min(500, Number(maxTerminalsInput.value) || 20));
    saveSettings();
    saveSystemSettings();
    logAction('logSettings');
    Object.keys(terminals).forEach(function (id) {
      var record = terminals[id];
      if (record.term) {
        record.term.setOption('fontSize', settings.terminalFontSize);
        fitTerminal(record);
      }
    });
  }

  function logAction(key, data) {
    operationLogs.unshift({
      time: new Date().toISOString(),
      key: key,
      data: data || {}
    });
    operationLogs = operationLogs.slice(0, 100);
    saveLogs();
    renderLog();
  }

  function loadLogs() {
    try {
      return JSON.parse(window.localStorage.getItem('wssh-operation-logs') || '[]');
    } catch (e) {
      return [];
    }
  }

  function saveLogs() {
    window.localStorage.setItem('wssh-operation-logs', JSON.stringify(operationLogs));
  }

  function renderLog() {
    operationLog.innerHTML = '';
    if (!operationLogs.length) {
      operationLog.appendChild(el('div', { class: 'ssh-config-empty', text: t('noLogs') }));
      logOutput.textContent = t('noLogs');
      return;
    }
    logOutput.textContent = operationLogs.map(function (entry) {
      return '[' + new Date(entry.time).toISOString() + '] ' + t(entry.key, entry.data);
    }).join('\n');
    operationLogs.forEach(function (entry) {
      operationLog.appendChild(el('div', { class: 'log-entry' }, [
        el('time', { text: new Date(entry.time).toLocaleTimeString() }),
        el('span', { text: t(entry.key, entry.data) })
      ]));
    });
  }

  function applyLanguage() {
    document.documentElement.lang = t('langCode');
    document.title = t('appTitle');
    languageToggle.textContent = t('languageButton');

    document.querySelectorAll('[data-i18n]').forEach(function (node) {
      node.textContent = t(node.getAttribute('data-i18n'));
    });
    document.querySelectorAll('[data-i18n-title]').forEach(function (node) {
      node.setAttribute('title', t(node.getAttribute('data-i18n-title')));
    });
    document.querySelectorAll('[data-i18n-aria-label]').forEach(function (node) {
      node.setAttribute('aria-label', t(node.getAttribute('data-i18n-aria-label')));
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function (node) {
      node.setAttribute('placeholder', t(node.getAttribute('data-i18n-placeholder')));
    });

    groups.forEach(function (group) {
      if (group.nameKey) {
        group.name = t(group.nameKey, { number: group.number });
        var nameEl = board.querySelector('.group[data-group="' + group.id + '"] .group-name');
        if (nameEl) { nameEl.textContent = group.name; }
      }
    });
    refreshGroupSelect();
    refreshDynamicLanguage();
    renderSshConfigHosts();
    renderLog();
    updateSshConfigCollapse();
    if (!privateKeyInput.files.length) { privateKeyName.textContent = t('noFileChosen'); }
    updateSummary();
    setStatus(t('readyDetail'));
  }

  function refreshDynamicLanguage() {
    groups.forEach(function (group) {
      var column = board.querySelector('.group[data-group="' + group.id + '"]');
      if (!column) { return; }
      column.setAttribute('aria-label', group.name);
      var nameEl = column.querySelector('.group-name');
      var grip = column.querySelector('.group-grip');
      var groupButtons = column.querySelectorAll('.group-tools button');
      var fullscreenBtn = groupButtons[0];
      var deleteBtn = groupButtons[1];
      var input = column.querySelector('.broadcast input');
      var shortcut = column.querySelector('.broadcast select');
      var sendText = column.querySelector('.broadcast button span');
      if (nameEl) { nameEl.setAttribute('title', t('renameGroup')); }
      if (grip) {
        grip.setAttribute('title', t('reorderGroupTitle'));
        grip.setAttribute('aria-label', t('reorderGroup'));
      }
      if (deleteBtn) {
        deleteBtn.setAttribute('title', t('removeGroup'));
        deleteBtn.setAttribute('aria-label', t('removeGroup'));
      }
      if (fullscreenBtn) {
        fullscreenBtn.setAttribute('title', focusedGroupId === group.id ? t('exitGroupFullscreen') : t('groupFullscreen'));
        fullscreenBtn.setAttribute('aria-label', focusedGroupId === group.id ? t('exitGroupFullscreen') : t('groupFullscreen'));
      }
      if (input) {
        input.setAttribute('placeholder', t('broadcastPlaceholder'));
        input.setAttribute('aria-label', t('broadcastLabel', { name: group.name }));
      }
      if (shortcut) {
        shortcut.setAttribute('title', t('broadcastShortcut'));
        shortcut.setAttribute('aria-label', t('broadcastShortcut'));
        shortcut.options[0].textContent = t('shortcutPlaceholder');
        shortcut.options[1].textContent = t('ctrlC');
        shortcut.options[2].textContent = t('ctrlD');
        shortcut.options[3].textContent = t('ctrlZ');
        shortcut.options[4].textContent = t('ctrlL');
        shortcut.options[5].textContent = t('tabKey');
        shortcut.options[6].textContent = t('escKey');
      }
      if (sendText) { sendText.textContent = t('send'); }
      updateEmptyState(group.id);
    });

    Object.keys(terminals).forEach(function (id) {
      refreshTerminalLanguage(terminals[id]);
    });
  }

  function refreshTerminalLanguage(record) {
    var buttons = record.card.querySelectorAll('.terminal-tools button');
    var header = record.card.querySelector('.terminal-header');
    var placeholder = record.card.querySelector('.terminal-placeholder');
    var resize = record.card.querySelector('.resize-handle');
    if (buttons[0]) {
      buttons[0].setAttribute('title', t('reconnectTerminal'));
      buttons[0].setAttribute('aria-label', t('reconnectTerminal'));
    }
    if (buttons[1]) {
      buttons[1].setAttribute('title', record.card.classList.contains('maximized') ? t('restore') : t('maximize'));
      buttons[1].setAttribute('aria-label', t('maximize'));
    }
    if (buttons[2]) {
      buttons[2].setAttribute('title', t('close'));
      buttons[2].setAttribute('aria-label', t('closeTerminal'));
    }
    if (record.nameEl) { record.nameEl.setAttribute('title', t('renameTerminal')); }
    if (header) { header.setAttribute('aria-label', t('dragTerminal', { name: record.displayName || record.hostname })); }
    if (placeholder) { placeholder.textContent = t('establishing'); }
    if (resize) { resize.setAttribute('title', t('resize')); }
    if (record.stateKey) { record.stateText.textContent = t(record.stateKey); }
    if (record.networkText) {
      setNetworkState(record, record.networkText.dataset.network || 'offline');
    }
  }

  function toast(message, kind) {
    var node = el('div', { class: 'toast' + (kind ? ' ' + kind : ''), text: message });
    toastStack.appendChild(node);
    window.setTimeout(function () {
      node.style.transition = 'opacity 200ms ease';
      node.style.opacity = '0';
      window.setTimeout(function () { node.remove(); }, 220);
    }, 2600);
  }

  function controlSequence(value) {
    var key = (value || '').trim().toLowerCase();
    var map = {
      'ctrl+c': '\x03',
      '^c': '\x03',
      'ctrl+d': '\x04',
      '^d': '\x04',
      'ctrl+z': '\x1a',
      '^z': '\x1a',
      'ctrl+l': '\x0c',
      '^l': '\x0c',
      'tab': '\t',
      'esc': '\x1b',
      'escape': '\x1b'
    };
    return map[key];
  }

  function sendToRecord(record, payload) {
    if (record.state === 'connected' && record.sock && record.sock.readyState === window.WebSocket.OPEN) {
      record.sock.send(JSON.stringify({ data: payload }));
      return true;
    }
    return false;
  }

  function loadSessionRecords() {
    try {
      return JSON.parse(window.localStorage.getItem('wssh-sessions') || '[]');
    } catch (e) {
      return [];
    }
  }

  function saveSessionRecords(records) {
    window.localStorage.setItem('wssh-sessions', JSON.stringify(records));
  }

  function safeReconnectInfo(info) {
    if (!info) { return null; }
    return {
      type: info.type,
      hostname: info.hostname || '',
      username: info.username || '',
      port: info.port || '22',
      sshConfigHost: info.sshConfigHost || ''
    };
  }

  function cloneFormData(data) {
    var copy = new window.FormData();
    data.forEach(function (value, key) {
      copy.append(key, value);
    });
    return copy;
  }

  function loadGroupRecords() {
    try {
      return JSON.parse(window.localStorage.getItem('wssh-groups') || '[]');
    } catch (e) {
      return [];
    }
  }

  function saveGroups() {
    var order = Array.prototype.slice.call(board.querySelectorAll('.group'))
      .map(function (col) { return col.getAttribute('data-group'); });
    var records = groups.slice().sort(function (a, b) {
      return order.indexOf(a.id) - order.indexOf(b.id);
    }).map(function (group) {
      var column = board.querySelector('.group[data-group="' + group.id + '"]');
      return {
        id: group.id,
        name: group.name,
        nameKey: group.nameKey || null,
        number: group.number,
        colSpan: column ? Number(column.dataset.colSpan) || null : group.colSpan || null,
        rowSpan: column ? Number(column.dataset.rowSpan) || null : group.rowSpan || null,
        manualSize: column ? column.dataset.manualSize === 'true' : !!group.manualSize
      };
    });
    window.localStorage.setItem('wssh-groups', JSON.stringify(records));
  }

  function restoreGroups() {
    var saved = loadGroupRecords();
    if (!saved.length) { return false; }
    saved.forEach(function (item) {
      addGroup(item.name, {
        id: item.id,
        nameKey: item.nameKey,
        number: item.number,
        colSpan: item.colSpan,
        rowSpan: item.rowSpan,
        manualSize: item.manualSize,
        skipSave: true
      });
    });
    saveGroups();
    return true;
  }

  function saveSessions() {
    var records = Object.keys(terminals).map(function (id) {
      var record = terminals[id];
      var group = groupById(record.group);
      return {
        workerId: record.workerId,
        hostname: record.hostname,
        username: record.username,
        port: record.port,
        displayName: record.displayName,
        bodyHeight: record.body ? record.body.style.height : '',
        reconnectInfo: safeReconnectInfo(record.reconnectInfo),
        groupId: record.group,
        groupName: group ? group.name : '',
        isLocal: !!record.isLocal
      };
    }).filter(function (item) { return item.workerId; });
    saveSessionRecords(records);
  }

  function removeSavedSession(workerId) {
    saveSessionRecords(loadSessionRecords().filter(function (item) {
      return item.workerId !== workerId;
    }));
  }

  function groupForSavedSession(session) {
    if (session.groupId && groupById(session.groupId)) { return session.groupId; }
    for (var i = 0; i < groups.length; i += 1) {
      if (groups[i].name === session.groupName) { return groups[i].id; }
    }
    return addGroup(session.groupName || null).id;
  }

  function restoreSessions() {
    var saved = loadSessionRecords();
    if (!saved.length) { return; }
    setStatus(t('restoringSessions'));
    window.fetch('active-workers', { credentials: 'same-origin' })
      .then(function (response) { return response.ok ? response.json() : { ids: [] }; })
      .then(function (data) {
        var active = {};
        (data.ids || []).forEach(function (id) { active[id] = true; });
        saved.forEach(function (session) {
          if (!active[session.workerId]) { return; }
          var record = createCard({
            hostname: session.hostname,
            username: session.username,
            port: session.port,
            group: groupForSavedSession(session),
            displayName: session.displayName,
            isLocal: session.isLocal,
            bodyHeight: session.bodyHeight,
            reconnectInfo: session.reconnectInfo || null
          });
          record.workerId = session.workerId;
          openSocket(record, session.workerId, 'utf-8');
          logAction('logRestored', { name: record.displayName || record.hostname });
        });
        saveSessions();
      });
  }

  function hostAuthLabel(host) {
    if (host.has_identity_file) { return t('configKey'); }
    return t('configNoAuth');
  }

  function fillFromSshConfigHost(host) {
    $('#hostname').value = host.hostname || host.alias;
    $('#username').value = host.username || '';
    $('#port').value = host.port || '22';
    sshConfigHostInput.value = host.alias;
    setStatus(host.alias + ' -> ' + (host.username ? host.username + '@' : '') + (host.hostname || host.alias));
  }

  function openSshConfigHost(host) {
    fillFromSshConfigHost(host);
    var data = new window.FormData(connectForm);
    cleanData(data);
    var errors = validateData(data);
    if (errors.length) {
      setStatus(errors.join(' '));
      toast(errors[0], 'error');
      return;
    }
    connectTerminal(data);
  }

  function sshConfigHostFormData(host, groupId) {
    var data = new window.FormData(connectForm);
    data.set('hostname', host.hostname || host.alias);
    data.set('username', host.username || '');
    data.set('port', host.port || '22');
    data.set('ssh_config_host', host.alias);
    data.set('target_group', groupId);
    cleanData(data);
    return data;
  }

  function selectedSshConfigHostList() {
    return sshConfigHosts.filter(function (host) {
      return !!selectedSshConfigHosts[host.alias];
    });
  }

  function sshConfigHostIndex(alias) {
    for (var i = 0; i < sshConfigHosts.length; i += 1) {
      if (sshConfigHosts[i].alias === alias) { return i; }
    }
    return -1;
  }

  function refreshSshConfigSelectionState() {
    Array.prototype.forEach.call(sshConfigList.querySelectorAll('.ssh-host'), function (row) {
      var selected = !!selectedSshConfigHosts[row.dataset.hostAlias];
      var checkbox = row.querySelector('input[type="checkbox"]');
      row.classList.toggle('is-selected', selected);
      if (checkbox) { checkbox.checked = selected; }
    });
    updateSshConfigSelectionControls(false);
  }

  function updateSshConfigHostSelection(alias, event, requestedState) {
    var index = sshConfigHostIndex(alias);
    var anchorIndex = sshConfigHostIndex(sshConfigSelectionAnchor);
    var range = !!(event && event.shiftKey && anchorIndex >= 0 && index >= 0);

    if (range) {
      var selectRange = requestedState === undefined ? true : requestedState;
      var start = Math.min(anchorIndex, index);
      var end = Math.max(anchorIndex, index);
      for (var i = start; i <= end; i += 1) {
        var rangeAlias = sshConfigHosts[i].alias;
        if (selectRange) {
          selectedSshConfigHosts[rangeAlias] = true;
        } else {
          delete selectedSshConfigHosts[rangeAlias];
        }
      }
    } else if (requestedState !== undefined) {
      if (requestedState) {
        selectedSshConfigHosts[alias] = true;
      } else {
        delete selectedSshConfigHosts[alias];
      }
    } else {
      if (selectedSshConfigHosts[alias]) {
        delete selectedSshConfigHosts[alias];
      } else {
        selectedSshConfigHosts[alias] = true;
      }
    }

    sshConfigSelectionAnchor = alias;
    refreshSshConfigSelectionState();
  }

  function updateSshConfigSelectionControls(disabled) {
    var selectedCount = selectedSshConfigHostList().length;
    var hasHosts = sshConfigHosts.length > 0;
    selectAllSshConfig.checked = hasHosts && selectedCount === sshConfigHosts.length;
    selectAllSshConfig.indeterminate = selectedCount > 0 && selectedCount < sshConfigHosts.length;
    selectAllSshConfig.disabled = !!disabled || !hasHosts;
    openSelectedSshConfig.disabled = !!disabled || selectedCount === 0;
    openSelectedSshConfigLabel.textContent = t('openSelectedHosts', { count: selectedCount });
  }

  function openSelectedSshConfigHosts() {
    var selectedHosts = selectedSshConfigHostList();
    if (!selectedHosts.length) {
      toast(t('noHostsSelected'), 'error');
      return;
    }
    var group = groupById(groupSelect.value) || groups[0];
    if (!group) { group = addGroup(null); }
    selectedHosts.forEach(function (host) {
      connectTerminal(sshConfigHostFormData(host, group.id));
    });
    selectedSshConfigHosts = Object.create(null);
    sshConfigSelectionAnchor = null;
    refreshSshConfigSelectionState();
    setStatus(t('openingSelectedHosts', { count: selectedHosts.length, name: group.name }));
    toast(t('openingSelectedHosts', { count: selectedHosts.length, name: group.name }));
  }

  function renderSshConfigHosts(message) {
    sshConfigList.innerHTML = '';
    if (message) {
      sshConfigList.appendChild(el('div', { class: 'ssh-config-empty', text: message }));
      updateSshConfigSelectionControls(true);
      return;
    }
    if (!sshConfigHosts.length) {
      sshConfigList.appendChild(el('div', { class: 'ssh-config-empty', text: t('noHosts') }));
      updateSshConfigSelectionControls(false);
      return;
    }

    sshConfigHosts.forEach(function (host) {
      var meta = (host.username ? host.username + '@' : '') +
        (host.hostname || host.alias) + ':' + host.port + ' · ' + hostAuthLabel(host);
      var selected = !!selectedSshConfigHosts[host.alias];
      var checkbox = el('input', {
        type: 'checkbox',
        'aria-label': t('selectHost', { name: host.alias })
      });
      checkbox.checked = selected;
      var fillBtn = el('button', { class: 'btn btn-sm', type: 'button', text: t('fillHost') });
      var openBtn = el('button', { class: 'btn btn-primary btn-sm', type: 'button', text: t('openHost') });
      var checkLabel = el('label', { class: 'ssh-host-check' }, [checkbox]);
      var row = el('div', {
        class: 'ssh-host' + (selected ? ' is-selected' : ''),
        dataset: { hostAlias: host.alias }
      });
      checkbox.addEventListener('click', function (event) {
        updateSshConfigHostSelection(host.alias, event, checkbox.checked);
      });
      checkLabel.addEventListener('click', function (event) {
        if (event.target === checkbox) { return; }
        event.preventDefault();
        event.stopPropagation();
        updateSshConfigHostSelection(host.alias, event, !selectedSshConfigHosts[host.alias]);
      });
      fillBtn.addEventListener('click', function () { fillFromSshConfigHost(host); });
      openBtn.addEventListener('click', function () { openSshConfigHost(host); });
      row.addEventListener('click', function (event) {
        if (event.target.closest('button') || event.target.closest('.ssh-host-check')) { return; }
        updateSshConfigHostSelection(host.alias, event);
      });
      row.appendChild(el('div', { class: 'ssh-host-select' }, [
        checkLabel,
        el('div', { class: 'ssh-host-copy' }, [
          el('div', { class: 'ssh-host-name', text: host.alias }),
          el('div', { class: 'ssh-host-meta', text: meta })
        ])
      ]));
      row.appendChild(fillBtn);
      row.appendChild(openBtn);
      sshConfigList.appendChild(row);
    });
    updateSshConfigSelectionControls(false);
  }

  function updateSshConfigCollapse() {
    var panel = document.querySelector('.ssh-config-panel');
    panel.classList.toggle('is-collapsed', sshConfigCollapsed);
    toggleSshConfigButton.textContent = sshConfigCollapsed ? t('expandHosts') : t('collapseHosts');
  }

  function loadSshConfigHosts() {
    renderSshConfigHosts(t('loadingHosts'));
    window.fetch('ssh-config', { credentials: 'same-origin' })
      .then(function (response) {
        if (!response.ok) { throw new Error(response.statusText); }
        return response.json();
      })
      .then(function (data) {
        sshConfigHosts = data.hosts || [];
        var available = Object.create(null);
        sshConfigHosts.forEach(function (host) { available[host.alias] = true; });
        Object.keys(selectedSshConfigHosts).forEach(function (alias) {
          if (!available[alias]) { delete selectedSshConfigHosts[alias]; }
        });
        if (!available[sshConfigSelectionAnchor]) { sshConfigSelectionAnchor = null; }
        renderSshConfigHosts();
        if (sshConfigHosts.length) {
          setStatus(t('loadedHosts', { count: sshConfigHosts.length }));
        }
      })
      .catch(function () {
        sshConfigHosts = [];
        renderSshConfigHosts(t('hostLoadFailed'));
      });
  }

  function groupById(id) {
    for (var i = 0; i < groups.length; i += 1) {
      if (groups[i].id === id) { return groups[i]; }
    }
    return null;
  }

  function listEl(groupId) {
    return board.querySelector('.terminal-list[data-list="' + groupId + '"]');
  }

  function countInGroup(groupId) {
    var count = 0;
    Object.keys(terminals).forEach(function (id) {
      if (terminals[id].group === groupId) { count += 1; }
    });
    return count;
  }

  function terminalsInGroup(groupId) {
    return Object.keys(terminals)
      .map(function (id) { return terminals[id]; })
      .filter(function (t) { return t.group === groupId; });
  }

  // ---- Rendering ---------------------------------------------------------
  function refreshGroupSelect() {
    var current = groupSelect.value;
    groupSelect.innerHTML = '';
    groups.forEach(function (group) {
      var opt = el('option', { value: group.id, text: group.name });
      groupSelect.appendChild(opt);
    });
    if (groupById(current)) {
      groupSelect.value = current;
    }
  }

  function updateEmptyState(groupId) {
    var list = listEl(groupId);
    if (!list) { return; }
    var column = board.querySelector('.group[data-group="' + groupId + '"]');
    var emptyGroup = countInGroup(groupId) === 0;
    if (column) { column.classList.toggle('is-empty', emptyGroup); }
    var existing = list.querySelector('.empty-state');
    if (emptyGroup) {
      if (!existing) {
        list.appendChild(el('div', { class: 'empty-state' }, [
          el('div', {}, [
            el('strong', { text: t('noTerminals') }),
            el('span', { text: t('emptyHint') })
          ])
        ]));
      } else {
        existing.querySelector('strong').textContent = t('noTerminals');
        existing.querySelector('span').textContent = t('emptyHint');
      }
    } else if (existing) {
      existing.remove();
    }
    updateGroupGridSpan(groupId);
  }

  function updateGroupGridSpan(groupId) {
    var column = board.querySelector('.group[data-group="' + groupId + '"]');
    if (!column || appShell.classList.contains('group-fullscreen')) { return; }
    if (column.classList.contains('is-floating')) { return; }
    var cols = Number(column.dataset.colSpan) || defaultGroupColSpan();
    var rows = Number(column.dataset.rowSpan) || defaultGroupRowSpan();
    setGroupGridSpan(column, cols, rows);
  }

  function defaultGroupColSpan() {
    return 4;
  }

  function defaultGroupColSpanForIndex(index, total) {
    var metrics = boardGridMetrics();
    var count = Math.max(1, total || 1);
    var minCols = 4;
    if (count <= Math.max(1, Math.floor(metrics.cols / minCols))) {
      var base = Math.floor(metrics.cols / count);
      var remainder = metrics.cols % count;
      return Math.max(minCols, base + (index < remainder ? 1 : 0));
    }
    return minCols;
  }

  function defaultGroupRowSpan() {
    return 16;
  }

  function terminalGroupRowSpan() {
    return 16;
  }

  function ensureGroupFitsTerminal(groupId) {
    var column = board.querySelector('.group[data-group="' + groupId + '"]');
    if (!column || column.dataset.manualSize === 'true') { return; }
    var groupIndex = groups.findIndex(function (group) { return group.id === groupId; });
    var cols = defaultGroupColSpanForIndex(Math.max(0, groupIndex), groups.length);
    var rows = Number(column.dataset.rowSpan) || defaultGroupRowSpan();
    setGroupGridSpan(column, cols, Math.max(rows, terminalGroupRowSpan()));
  }

  function boardGridMetrics() {
    var styles = window.getComputedStyle(board);
    var tracks = styles.gridTemplateColumns.split(' ').filter(function (track) {
      return parseFloat(track) > 0;
    });
    return {
      cols: Math.max(1, tracks.length || 1),
      colSize: tracks.length ? parseFloat(tracks[0]) : 96,
      rowSize: parseFloat(styles.gridAutoRows) || 24,
      columnGap: parseFloat(styles.columnGap) || 0,
      rowGap: parseFloat(styles.rowGap) || 0
    };
  }

  function setGroupGridSpan(column, cols, rows) {
    var metrics = boardGridMetrics();
    var requestedCols = Math.max(3, Math.round(cols));
    var nextCols = Math.max(1, Math.min(metrics.cols, requestedCols));
    var nextRows = Math.max(7, Math.round(rows));
    column.dataset.colSpan = String(requestedCols);
    column.dataset.rowSpan = String(nextRows);
    column.style.gridColumnEnd = 'span ' + nextCols;
    column.style.gridRowEnd = 'span ' + nextRows;
    column.style.width = '';
    column.style.height = '';
  }

  function updateAllGroupGridSpans() {
    autoSizeDefaultGroups();
    groups.forEach(function (group) { updateGroupGridSpan(group.id); });
  }

  function autoSizeDefaultGroups() {
    if (appShell.classList.contains('group-fullscreen')) { return; }
    groups.forEach(function (group, index) {
      var column = board.querySelector('.group[data-group="' + group.id + '"]');
      if (!column || column.dataset.manualSize === 'true') { return; }
      var cols = defaultGroupColSpanForIndex(index, groups.length);
      var rows = Number(column.dataset.rowSpan) || defaultGroupRowSpan();
      setGroupGridSpan(column, cols, rows);
    });
  }

  function observeGroupLayout(column) {
    if (!window.ResizeObserver) { return; }
    if (!groupLayoutObserver) {
      groupLayoutObserver = new window.ResizeObserver(function (entries) {
        entries.forEach(function (entry) {
          var groupId = entry.target.getAttribute('data-group');
          if (groupId) { updateGroupGridSpan(groupId); }
        });
      });
    }
    groupLayoutObserver.observe(column);
  }

  function updateSummary() {
    var connected = 0;
    Object.keys(terminals).forEach(function (id) {
      if (terminals[id].state === 'connected') { connected += 1; }
    });
    summary.textContent = t('connectedSummary', { count: connected, groups: groupCountText(groups.length) });

    groups.forEach(function (group) {
      var meta = board.querySelector('.group-meta[data-meta="' + group.id + '"]');
      if (meta) {
        var n = countInGroup(group.id);
        meta.textContent = terminalCountText(n);
      }
      updateEmptyState(group.id);
    });
  }

  function toggleGroupFullscreen(groupId, button) {
    if (focusedGroupId === groupId) {
      exitGroupFullscreen();
      return;
    }
    focusedGroupId = groupId;
    appShell.classList.add('group-fullscreen');
    board.querySelectorAll('.group').forEach(function (column) {
      var active = column.getAttribute('data-group') === groupId;
      column.classList.toggle('is-focused', active);
    });
    if (button) {
      button.innerHTML = ICONS.minimize;
      button.setAttribute('title', t('exitGroupFullscreen'));
      button.setAttribute('aria-label', t('exitGroupFullscreen'));
    }
    var group = groupById(groupId);
    logAction('logGroupFullscreen', { name: group ? group.name : groupId });
    window.setTimeout(function () {
      terminalsInGroup(groupId).forEach(fitTerminal);
    }, 80);
  }

  function exitGroupFullscreen() {
    if (!focusedGroupId) { return; }
    var oldGroupId = focusedGroupId;
    focusedGroupId = null;
    appShell.classList.remove('group-fullscreen');
    board.querySelectorAll('.group').forEach(function (column) {
      column.classList.remove('is-focused');
      var btn = column.querySelector('.group-tools button');
      if (btn) {
        btn.innerHTML = ICONS.maximize;
        btn.setAttribute('title', t('groupFullscreen'));
        btn.setAttribute('aria-label', t('groupFullscreen'));
      }
    });
    logAction('logGroupFullscreenExit');
    window.setTimeout(function () {
      terminalsInGroup(oldGroupId).forEach(fitTerminal);
      updateAllGroupGridSpans();
    }, 80);
  }

  function renderGroup(group) {
    var nameEl = el('span', {
      class: 'group-name',
      role: 'textbox',
      tabindex: '0',
      contenteditable: 'true',
      spellcheck: 'false',
      title: t('renameTerminal'),
      text: group.name
    });

    var grip = el('button', {
      class: 'group-grip', type: 'button', title: t('reorderGroupTitle'),
      'aria-label': t('reorderGroup'), html: ICONS.grip
    });

    var title = el('div', { class: 'group-title' }, [
      nameEl,
      el('span', { class: 'group-meta', dataset: { meta: group.id }, text: terminalCountText(0) })
    ]);

    var deleteBtn = el('button', {
      class: 'danger-hover', type: 'button', title: t('removeGroup'),
      'aria-label': t('removeGroup'), html: ICONS.trash
    });
    var fullscreenBtn = el('button', {
      type: 'button', title: t('groupFullscreen'),
      'aria-label': t('groupFullscreen'), html: ICONS.maximize
    });
    fullscreenBtn.addEventListener('click', function () { toggleGroupFullscreen(group.id, fullscreenBtn); });
    deleteBtn.addEventListener('click', function () { removeGroup(group.id); });

    var head = el('div', { class: 'group-head' }, [
      grip, title,
      el('div', { class: 'group-tools' }, [fullscreenBtn, deleteBtn])
    ]);

    // Broadcast bar.
    var input = el('input', {
      type: 'text', autocomplete: 'off', spellcheck: 'false',
      placeholder: t('broadcastPlaceholder'),
      'aria-label': t('broadcastLabel', { name: group.name })
    });
    var shortcutSelect = el('select', { 'aria-label': t('broadcastShortcut'), title: t('broadcastShortcut') }, [
      el('option', { value: '', text: t('shortcutPlaceholder') }),
      el('option', { value: 'ctrl+c', text: t('ctrlC') }),
      el('option', { value: 'ctrl+d', text: t('ctrlD') }),
      el('option', { value: 'ctrl+z', text: t('ctrlZ') }),
      el('option', { value: 'ctrl+l', text: t('ctrlL') }),
      el('option', { value: 'tab', text: t('tabKey') }),
      el('option', { value: 'esc', text: t('escKey') })
    ]);
    var sendBtn = el('button', { class: 'btn btn-accent btn-sm', type: 'submit', html: ICONS.send + '<span>' + t('send') + '</span>' });
    var broadcastForm = el('form', { class: 'broadcast' }, [input, shortcutSelect, sendBtn]);
    broadcastForm.addEventListener('submit', function (event) {
      event.preventDefault();
      var value = input.value;
      if (!value.trim()) { return; }
      broadcastToGroup(group.id, value);
      input.value = '';
      input.focus();
    });
    shortcutSelect.addEventListener('change', function () {
      if (!shortcutSelect.value) { return; }
      broadcastToGroup(group.id, shortcutSelect.value);
      shortcutSelect.value = '';
    });

    var list = el('div', { class: 'terminal-list', dataset: { list: group.id } });

    var groupResizeHandle = el('div', {
      class: 'group-resize-handle',
      title: t('resize'),
      'aria-hidden': 'true'
    });

    var column = el('section', { class: 'group', dataset: { group: group.id }, 'aria-label': group.name }, [
      head, broadcastForm, list, groupResizeHandle
    ]);
    setGroupGridSpan(column, group.colSpan || defaultGroupColSpan(), group.rowSpan || defaultGroupRowSpan());
    if (group.manualSize) { column.dataset.manualSize = 'true'; }

    // Rename interactions.
    nameEl.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') { event.preventDefault(); nameEl.blur(); }
      if (event.key === 'Escape') { nameEl.textContent = group.name; nameEl.blur(); }
    });
    nameEl.addEventListener('blur', function () {
      var oldName = group.name;
      var value = nameEl.textContent.trim();
      if (!value) { value = group.name; }
      group.name = value;
      group.nameKey = null;
      nameEl.textContent = value;
      column.setAttribute('aria-label', value);
      refreshGroupSelect();
      if (oldName !== value) {
        logAction('logRenameGroup', { oldName: oldName, newName: value });
      }
      saveGroups();
      saveSessions();
    });

    grip.addEventListener('pointerdown', function (event) { startColumnDrag(event, group.id); });
    startGroupResize(groupResizeHandle, group.id);

    board.appendChild(column);
    observeGroupLayout(column);
    window.requestAnimationFrame(function () { updateGroupGridSpan(group.id); });
    return column;
  }

  function addGroup(name, opts) {
    opts = opts || {};
    var requestedId = opts.id || null;
    var requestedNumber = Number(opts.number) || null;
    var idNumber = requestedId && requestedId.match(/^group-(\d+)$/);
    groupSeq = Math.max(groupSeq, requestedNumber || 0, idNumber ? Number(idNumber[1]) : 0);
    if (!requestedId) { groupSeq += 1; }
    var number = requestedNumber || groupSeq;
    var nameKey = opts && opts.nameKey;
    var group = {
      id: requestedId || ('group-' + groupSeq),
      name: nameKey ? t(nameKey, { number: number }) : (name || t('defaultGroup', { number: number })),
      nameKey: nameKey || (name ? null : 'defaultGroup'),
      number: number,
      colSpan: opts.colSpan || null,
      rowSpan: opts.rowSpan || null,
      manualSize: !!opts.manualSize
    };
    groups.push(group);
    renderGroup(group);
    autoSizeDefaultGroups();
    refreshGroupSelect();
    updateSummary();
    if (!opts.skipSave) { saveGroups(); }
    if (opts && opts.focus) {
      var nameEl = board.querySelector('.group[data-group="' + group.id + '"] .group-name');
      if (nameEl) {
        board.scrollLeft = board.scrollWidth;
        nameEl.focus();
        selectAll(nameEl);
      }
    }
    return group;
  }

  function removeGroup(groupId) {
    if (groups.length <= 1) {
      toast(t('keepGroup'), 'error');
      return;
    }
    if (focusedGroupId === groupId) { exitGroupFullscreen(); }
    var members = terminalsInGroup(groupId);
    if (members.length) {
      // Relocate live terminals to the previous group instead of dropping them.
      var index = groups.findIndex(function (g) { return g.id === groupId; });
      var fallback = groups[index === 0 ? 1 : index - 1];
      members.forEach(function (item) { moveCardToGroup(item.id, fallback.id); });
      toast(t('movedTerminals', { count: terminalCountText(members.length), name: fallback.name }));
    }
    groups = groups.filter(function (g) { return g.id !== groupId; });
    var column = board.querySelector('.group[data-group="' + groupId + '"]');
    if (column) { column.remove(); }
    autoSizeDefaultGroups();
    refreshGroupSelect();
    updateSummary();
    saveGroups();
    saveSessions();
  }

  function selectAll(node) {
    var range = document.createRange();
    range.selectNodeContents(node);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }

  // ---- Terminal cards ----------------------------------------------------
  function createCard(opts) {
    termSeq += 1;
    var id = 'term-' + termSeq;
    var label = opts.username + '@' + opts.hostname + ':' + opts.port;
    var displayName = opts.displayName || opts.hostname;

    var statusDot = el('span', { class: 'status-dot', 'aria-hidden': 'true' });
    var stateText = el('span', { dataset: { state: '' }, text: t('connecting') });
    var networkText = el('span', {
      class: 'terminal-network',
      dataset: { network: 'connecting' },
      text: t('networkConnecting')
    });
    var nameEl = el('div', {
      class: 'terminal-name',
      role: 'textbox',
      tabindex: '0',
      contenteditable: 'true',
      spellcheck: 'false',
      title: t('renameGroup'),
      text: displayName
    });
    var identity = el('div', { class: 'terminal-identity' }, [
      statusDot,
      el('div', { style: 'min-width:0' }, [
        nameEl,
        el('div', { class: 'terminal-meta' }, [
          document.createTextNode(label + ' · '), stateText,
          document.createTextNode(' · '), networkText
        ])
      ])
    ]);

    var reconnectBtn = el('button', { type: 'button', title: t('reconnectTerminal'), 'aria-label': t('reconnectTerminal'), html: ICONS.reconnect });
    var maxBtn = el('button', { type: 'button', title: t('maximize'), 'aria-label': t('maximize'), html: ICONS.maximize });
    var closeBtn = el('button', { class: 'close-btn', type: 'button', title: t('close'), 'aria-label': t('closeTerminal'), html: ICONS.close });
    var tools = el('div', { class: 'terminal-tools' }, [reconnectBtn, maxBtn, closeBtn]);

    var header = el('div', {
      class: 'terminal-header', tabindex: '0', role: 'button',
      'aria-label': t('dragTerminal', { name: opts.hostname })
    }, [identity, tools]);

    var bodyInner = el('div', { class: 'terminal-placeholder', text: t('establishing') });
    var body = el('div', { class: 'terminal-body', id: id + '-body' }, [bodyInner]);
    body.style.height = opts.bodyHeight || (settings.terminalHeight + 'px');
    var resizeHandle = el('div', { class: 'resize-handle', title: t('resize'), 'aria-hidden': 'true' });

    var card = el('article', {
      class: 'terminal-card is-connecting', dataset: { term: id }
    }, [header, body, resizeHandle]);

    listEl(opts.group).appendChild(card);
    ensureGroupFitsTerminal(opts.group);
    updateGroupGridSpan(opts.group);

    var record = {
      id: id, group: opts.group, hostname: opts.hostname, username: opts.username,
      port: opts.port, displayName: displayName, nameEl: nameEl, card: card, body: body,
      stateText: stateText, networkText: networkText, reconnectInfo: opts.reconnectInfo || null,
      term: null, sock: null, decoder: 'utf-8', state: 'connecting', stateKey: 'connecting', observer: null,
      workerId: opts.workerId || null, isLocal: !!opts.isLocal
    };
    terminals[id] = record;

    // Interactions.
    header.addEventListener('pointerdown', function (event) { startCardDrag(event, id); });
    header.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); }
    });
    closeBtn.addEventListener('click', function () { closeTerminal(id, t('userClosed')); });
    reconnectBtn.addEventListener('click', function () { reconnectTerminal(record); });
    maxBtn.addEventListener('click', function () { toggleMaximize(record, maxBtn); });
    nameEl.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') { event.preventDefault(); nameEl.blur(); }
      if (event.key === 'Escape') { nameEl.textContent = record.displayName; nameEl.blur(); }
    });
    nameEl.addEventListener('blur', function () {
      var oldName = record.displayName;
      var next = nameEl.textContent.trim() || oldName;
      record.displayName = next;
      nameEl.textContent = next;
      if (oldName !== next) {
        toast(t('terminalRenamed'));
        logAction('logRenameTerminal', { oldName: oldName, newName: next });
        saveSessions();
      }
    });
    startResize(resizeHandle, record);

    updateSummary();
    return record;
  }

  function setCardState(record, state, message, stateKey) {
    record.state = state;
    record.stateKey = stateKey || null;
    record.card.classList.remove('is-connecting', 'is-connected', 'is-error');
    record.card.classList.add('is-' + state);
    record.stateText.textContent = stateKey ? t(stateKey) : (message || state);
    setNetworkState(record, state === 'connected' ? 'online' : (state === 'connecting' ? 'connecting' : 'offline'));
    updateSummary();
  }

  function setNetworkState(record, state) {
    if (!record || !record.networkText) { return; }
    if (state === 'online') {
      record.networkText.textContent = t('networkOnline', { latency: record.latency || 0 });
      record.networkText.dataset.latency = latencyLevel(record.latency || 0);
    } else {
      record.networkText.textContent = t(state === 'connecting' ? 'networkConnecting' : 'networkOffline');
      record.networkText.dataset.latency = state;
    }
    record.networkText.dataset.network = state;
  }

  function latencyLevel(latency) {
    if (latency <= 120) { return 'good'; }
    if (latency <= 300) { return 'fair'; }
    return 'poor';
  }

  function stopLatencyProbe(record) {
    if (record.latencyTimer) {
      window.clearInterval(record.latencyTimer);
      record.latencyTimer = null;
    }
    record.pendingPing = null;
  }

  function sendLatencyPing(record) {
    if (!record || !record.sock || record.sock.readyState !== window.WebSocket.OPEN) { return; }
    var now = Date.now();
    if (record.pendingPing && now - record.pendingPing.sentAt > 9000) {
      record.pendingPing = null;
      setNetworkState(record, 'offline');
      return;
    }
    if (record.pendingPing) { return; }
    record.pendingPing = { value: String(now), sentAt: now };
    try {
      record.sock.send(JSON.stringify({ ping: record.pendingPing.value }));
    } catch (e) {
      record.pendingPing = null;
      setNetworkState(record, 'offline');
    }
  }

  function startLatencyProbe(record) {
    stopLatencyProbe(record);
    sendLatencyPing(record);
    record.latencyTimer = window.setInterval(function () {
      sendLatencyPing(record);
    }, 5000);
  }

  function handleLatencyPong(record, value) {
    if (!record || !record.pendingPing || String(value) !== record.pendingPing.value) { return; }
    record.latency = Math.max(0, Date.now() - record.pendingPing.sentAt);
    record.pendingPing = null;
    setNetworkState(record, 'online');
  }

  function resetTerminalView(record, message) {
    stopLatencyProbe(record);
    if (record.observer) {
      record.observer.disconnect();
      record.observer = null;
    }
    if (record.term) {
      try { record.term.dispose(); } catch (e) { /* noop */ }
      record.term = null;
    }
    record.body.innerHTML = '';
    record.body.appendChild(el('div', { class: 'terminal-placeholder', text: message || t('establishing') }));
  }

  function closeTerminal(id, reason) {
    var record = terminals[id];
    if (!record) { return; }
    if (record.card.classList.contains('maximized')) { unmaximize(record); }
    stopLatencyProbe(record);
    if (record.observer) { record.observer.disconnect(); }
    if (record.sock) {
      try { record.sock.close(1000, reason || t('clientDisconnected')); } catch (e) { /* noop */ }
    }
    if (record.term) {
      try { record.term.dispose(); } catch (e) { /* noop */ }
    }
    var group = record.group;
    record.card.remove();
    delete terminals[id];
    if (record.workerId) { removeSavedSession(record.workerId); }
    logAction('logDisconnect', { name: record.displayName || record.hostname });
    updateSummary();
    updateEmptyState(group);
    updateGroupGridSpan(group);
  }

  function fitTerminal(record) {
    if (!record || !record.term) { return; }
    try {
      record.term.fitAddon.fit();
    } catch (e) {
      var body = record.body;
      var cols = Math.max(20, Math.floor(body.clientWidth / 9));
      var rows = Math.max(6, Math.floor(body.clientHeight / 18));
      record.term.resize(cols, rows);
    }
    if (record.sock && record.sock.readyState === window.WebSocket.OPEN) {
      record.sock.send(JSON.stringify({ resize: [record.term.cols, record.term.rows] }));
    }
  }

  function reconnectTerminal(record) {
    if (!record || record.state === 'connecting') { return; }
    var info = record.reconnectInfo || safeReconnectInfo({
      type: record.isLocal ? 'local' : 'ssh',
      hostname: record.hostname,
      username: record.username,
      port: record.port
    });
    if (!info) { return; }
    if (record.sock) {
      try { record.sock.close(1000, t('userClosed')); } catch (e) { /* noop */ }
      record.sock = null;
    }
    if (record.workerId) {
      removeSavedSession(record.workerId);
      record.workerId = null;
    }
    setCardState(record, 'connecting', null, 'connecting');
    resetTerminalView(record, t('establishing'));
    toast(t('reconnectingTerminal', { name: record.displayName || record.hostname }));
    if (info.type === 'local') {
      reconnectLocalTerminal(record);
    } else {
      reconnectSshTerminal(record, info);
    }
  }

  function reconnectLocalTerminal(record) {
    var body = new window.URLSearchParams();
    body.set('_xsrf', xsrfToken());
    body.set('term', 'xterm-256color');
    window.fetch('local-terminal', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString()
    }).then(function (response) {
      if (!response.ok) { throw new Error(response.statusText); }
      return response.json();
    }).then(function (msg) {
      if (!msg || !msg.id) { throw new Error(t('localTerminalFailed')); }
      record.workerId = msg.id;
      record.reconnectInfo = { type: 'local' };
      openSocket(record, msg.id, 'utf-8');
      saveSessions();
    }).catch(function () {
      setCardState(record, 'error', t('localTerminalFailed'));
    });
  }

  function reconnectSshTerminal(record, info) {
    var data = record.reconnectData ? cloneFormData(record.reconnectData) : new window.FormData(connectForm);
    data.set('hostname', info.hostname || record.hostname);
    data.set('username', info.username || record.username);
    data.set('port', info.port || record.port || '22');
    data.set('target_group', record.group);
    data.set('ssh_config_host', info.sshConfigHost || '');
    cleanData(data);
    var xhr = new window.XMLHttpRequest();
    xhr.open('POST', '', true);
    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) { return; }
      if (xhr.status !== 200) {
        setCardState(record, 'error', xhr.status + ': ' + xhr.statusText);
        return;
      }
      var msg;
      try { msg = JSON.parse(xhr.responseText); } catch (e) { msg = null; }
      if (!msg || !msg.id) {
        setCardState(record, 'error', (msg && msg.status) || t('connectionFailed'));
        return;
      }
      record.workerId = msg.id;
      record.reconnectInfo = safeReconnectInfo(info);
      record.reconnectData = cloneFormData(data);
      openSocket(record, msg.id, msg.encoding || 'utf-8');
      saveSessions();
    };
    xhr.send(data);
  }

  function toggleMaximize(record, button) {
    if (record.card.classList.contains('maximized')) {
      unmaximize(record);
      button.innerHTML = ICONS.maximize;
      button.title = t('maximize');
    } else {
      maximize(record);
      button.innerHTML = ICONS.minimize;
      button.title = t('restore');
    }
  }

  var backdrop = null;
  function maximize(record) {
    backdrop = el('div', { class: 'backdrop' });
    backdrop.addEventListener('click', function () {
      var btn = record.card.querySelector('.terminal-tools button:nth-child(2)');
      toggleMaximize(record, btn);
    });
    document.body.appendChild(backdrop);
    // Stash any custom card height so the fullscreen flex layout can take over.
    record.savedHeight = record.body.style.height;
    record.body.style.height = '';
    record.card.classList.add('maximized');
    window.requestAnimationFrame(function () {
      fitTerminal(record);
      if (record.term) { record.term.focus(); }
    });
  }

  function unmaximize(record) {
    record.card.classList.remove('maximized');
    if (record.savedHeight) { record.body.style.height = record.savedHeight; }
    if (backdrop) { backdrop.remove(); backdrop = null; }
    window.requestAnimationFrame(function () { fitTerminal(record); });
  }

  // ---- SSH transport (unchanged contract) --------------------------------
  function readMessage(blob, callback, decoder) {
    var reader = new window.FileReader();
    reader.onload = function () {
      var text;
      if (window.TextDecoder && decoder && typeof decoder.decode === 'function') {
        try { text = decoder.decode(reader.result); } catch (e) { text = ''; }
      } else {
        text = reader.result;
      }
      callback(text);
    };
    if (window.TextDecoder && decoder && typeof decoder.decode === 'function') {
      reader.readAsArrayBuffer(blob);
    } else {
      reader.readAsText(blob, decoder || 'utf-8');
    }
  }

  function openSocket(record, workerId, encoding) {
    var wsUrl = window.location.href.split(/\?|#/, 1)[0].replace('http', 'ws');
    var join = (wsUrl[wsUrl.length - 1] === '/' ? '' : '/');
    var url = wsUrl + join + 'ws?id=' + encodeURIComponent(workerId);
    var sock = new window.WebSocket(url);
    var term = new window.Terminal({
      cursorBlink: true,
      fontSize: settings.terminalFontSize,
      fontFamily: MONO_FONT,
      allowProposedApi: true,
      theme: TERMINAL_THEME
    });

    record.decoder = window.TextDecoder ? new window.TextDecoder(encoding || 'utf-8') : (encoding || 'utf-8');
    record.sock = sock;
    record.term = term;

    term.fitAddon = new window.FitAddon.FitAddon();
    term.loadAddon(term.fitAddon);

    term.onData(function (data) {
      if (record.state === 'connected' && sock.readyState === window.WebSocket.OPEN) {
        sock.send(JSON.stringify({ data: data }));
      }
    });

    sock.onopen = function () {
      record.body.innerHTML = '';
      term.open(record.body);
      setCardState(record, 'connected', null, 'connected');
      fitTerminal(record);
      term.focus();
      observeResize(record);
      startLatencyProbe(record);
    };

    sock.onmessage = function (message) {
      if (typeof message.data === 'string') {
        try {
          var event = JSON.parse(message.data);
          if (event && event.pong !== undefined) {
            handleLatencyPong(record, event.pong);
            return;
          }
        } catch (e) {
          // Terminal data from the backend is binary; ignore non-JSON strings.
        }
      }
      setNetworkState(record, 'online');
      readMessage(message.data, function (text) {
        if (record.term) { record.term.write(text); }
      }, record.decoder);
    };

    sock.onerror = function () {
      if (record.sock !== sock) { return; }
      stopLatencyProbe(record);
      setCardState(record, 'error', null, 'socketError');
    };

    sock.onclose = function (event) {
      if (record.sock !== sock) { return; }
      stopLatencyProbe(record);
      if (terminals[record.id]) {
        setCardState(record, 'error', event.reason || t('disconnected'));
      }
    };
  }

  function observeResize(record) {
    if (!window.ResizeObserver) { return; }
    var raf = null;
    record.observer = new window.ResizeObserver(function () {
      if (raf) { window.cancelAnimationFrame(raf); }
      raf = window.requestAnimationFrame(function () { fitTerminal(record); });
    });
    record.observer.observe(record.body);
  }

  function connectTerminal(data) {
    var groupId = data.get('target_group') || groupSelect.value || (groups[0] && groups[0].id);
    if (!groupId) { addGroup(null); groupId = groups[0].id; }

    var reconnectInfo = {
      type: 'ssh',
      hostname: data.get('hostname'),
      username: data.get('username'),
      port: data.get('port') || '22',
      sshConfigHost: data.get('ssh_config_host') || ''
    };
    var record = createCard({
      hostname: data.get('hostname'),
      username: data.get('username'),
      port: data.get('port') || '22',
      group: groupId,
      displayName: reconnectInfo.sshConfigHost || reconnectInfo.hostname,
      reconnectInfo: safeReconnectInfo(reconnectInfo)
    });
    record.reconnectData = cloneFormData(data);

    connectButton.disabled = true;
    var xhr = new window.XMLHttpRequest();
    xhr.open('POST', '', true);
    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) { return; }
      connectButton.disabled = false;
      if (xhr.status !== 200) {
        setCardState(record, 'error', xhr.status + ': ' + xhr.statusText);
        setStatus(xhr.status + ': ' + (xhr.statusText || t('requestFailed')));
        return;
      }
      var msg;
      try { msg = JSON.parse(xhr.responseText); } catch (e) { msg = null; }
      if (!msg || !msg.id) {
        var reason = (msg && msg.status) || t('connectionFailed');
        setCardState(record, 'error', reason);
        setStatus(reason);
        toast(reason, 'error');
        return;
      }
      record.workerId = msg.id;
      openSocket(record, msg.id, msg.encoding || 'utf-8');
      setStatus(t('sessionOpened', { name: record.hostname }));
      logAction('logConnect', { name: record.displayName || record.hostname });
      saveSessions();
    };
    xhr.send(data);
  }

  function openLocalTerminal() {
    var groupId = groupSelect.value || (groups[0] && groups[0].id);
    var record = createCard({
      hostname: 'localhost',
      username: 'local',
      port: '0',
      group: groupId,
      displayName: t('localTerminal'),
      isLocal: true,
      reconnectInfo: { type: 'local' }
    });
    var body = new window.URLSearchParams();
    body.set('_xsrf', xsrfToken());
    body.set('term', 'xterm-256color');
    window.fetch('local-terminal', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString()
    }).then(function (response) {
      if (!response.ok) { throw new Error(response.statusText); }
      return response.json();
    }).then(function (msg) {
      if (!msg || !msg.id) { throw new Error(t('localTerminalFailed')); }
      record.workerId = msg.id;
      openSocket(record, msg.id, 'utf-8');
      logAction('logLocalTerminal');
      saveSessions();
    }).catch(function () {
      setCardState(record, 'error', t('localTerminalFailed'));
      toast(t('localTerminalFailed'), 'error');
    });
  }

  // ---- Broadcast ---------------------------------------------------------
  function broadcastToGroup(groupId, command) {
    var seq = controlSequence(command);
    var payload = seq || (command.replace(/\s+$/, '') + (settings.broadcastEnter ? '\r' : ''));
    var sent = 0;
    terminalsInGroup(groupId).forEach(function (record) {
      if (sendToRecord(record, payload)) {
        sent += 1;
      }
    });
    var group = groupById(groupId);
    var name = group ? group.name : groupId;
    if (sent) {
      setStatus(t('sentStatus', { name: name, count: terminalCountText(sent) }));
      toast(t('broadcastToast', { name: name, count: terminalCountText(sent) }), 'success');
      logAction('logBroadcast', { name: name, detail: seq ? command.toUpperCase() : command });
    } else {
      toast(t('noConnected', { name: name }), 'error');
    }
  }

  // ---- Card drag (within / across groups) --------------------------------
  function startCardDrag(event, id) {
    if (event.button !== undefined && event.button !== 0) { return; }
    if (event.target.closest('button')) { return; }
    if (event.target.closest('[contenteditable="true"]')) { return; }
    var record = terminals[id];
    if (!record || record.card.classList.contains('maximized')) { return; }

    var card = record.card;
    var rect = card.getBoundingClientRect();
    drag = {
      id: id, card: card, moved: false,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      width: rect.width, height: rect.height,
      placeholder: el('div', { class: 'card-placeholder' }),
      autoScroll: 0
    };
    drag.placeholder.style.height = rect.height + 'px';

    document.addEventListener('pointermove', onCardDragMove);
    document.addEventListener('pointerup', onCardDragEnd, { once: true });
    event.preventDefault();
  }

  function beginFloating() {
    var card = drag.card;
    card.parentNode.insertBefore(drag.placeholder, card);
    card.classList.add('dragging');
    card.style.position = 'fixed';
    card.style.zIndex = '40';
    card.style.width = drag.width + 'px';
    card.style.pointerEvents = 'none';
    card.style.margin = '0';
    document.body.appendChild(card);
  }

  function onCardDragMove(event) {
    if (!drag) { return; }
    if (!drag.moved) {
      drag.moved = true;
      beginFloating();
    }
    drag.card.style.left = (event.clientX - drag.offsetX) + 'px';
    drag.card.style.top = (event.clientY - drag.offsetY) + 'px';

    edgeAutoScroll(event.clientX);

    var target = document.elementFromPoint(event.clientX, event.clientY);
    var column = target ? target.closest('.group') : null;
    board.querySelectorAll('.group.drag-over').forEach(function (g) { g.classList.remove('drag-over'); });
    if (!column) { return; }
    column.classList.add('drag-over');
    var list = column.querySelector('.terminal-list');
    var empty = list.querySelector('.empty-state');
    if (empty) { empty.remove(); }
    var before = cardAfterPoint(list, event.clientY);
    if (before) {
      list.insertBefore(drag.placeholder, before);
    } else {
      list.appendChild(drag.placeholder);
    }
  }

  function cardAfterPoint(list, y) {
    var cards = Array.prototype.slice.call(list.querySelectorAll('.terminal-card'));
    for (var i = 0; i < cards.length; i += 1) {
      var rect = cards[i].getBoundingClientRect();
      if (y < rect.top + rect.height / 2) { return cards[i]; }
    }
    return null;
  }

  function edgeAutoScroll(x) {
    var rect = board.getBoundingClientRect();
    var margin = 60;
    if (x > rect.right - margin) {
      board.scrollLeft += 18;
    } else if (x < rect.left + margin) {
      board.scrollLeft -= 18;
    }
  }

  function onCardDragEnd() {
    document.removeEventListener('pointermove', onCardDragMove);
    if (!drag) { return; }
    var record = terminals[drag.id];
    board.querySelectorAll('.group.drag-over').forEach(function (g) { g.classList.remove('drag-over'); });

    if (drag.moved && record) {
      var card = drag.card;
      card.classList.remove('dragging');
      card.style.position = '';
      card.style.zIndex = '';
      card.style.width = '';
      card.style.left = '';
      card.style.top = '';
      card.style.pointerEvents = '';
      card.style.margin = '';
      var parent = drag.placeholder.parentNode;
      parent.insertBefore(card, drag.placeholder);
      var newGroup = parent.getAttribute('data-list');
      var oldGroup = record.group;
      record.group = newGroup;
      drag.placeholder.remove();
      if (oldGroup !== newGroup) { updateEmptyState(oldGroup); }
      updateSummary();
      saveSessions();
      updateGroupGridSpan(newGroup);
      fitTerminal(record);
    } else if (drag.placeholder.parentNode) {
      drag.placeholder.remove();
    }
    drag = null;
  }

  // ---- Column drag (reorder groups) --------------------------------------
  function startColumnDrag(event, groupId) {
    if (event.button !== undefined && event.button !== 0) { return; }
    var column = board.querySelector('.group[data-group="' + groupId + '"]');
    if (!column) { return; }
    var rect = column.getBoundingClientRect();
    columnDrag = {
      id: groupId,
      column: column,
      moved: false,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      width: rect.width,
      height: rect.height,
      placeholder: el('div', { class: 'group-placeholder' })
    };
    columnDrag.placeholder.style.gridColumnEnd = column.style.gridColumnEnd;
    columnDrag.placeholder.style.gridRowEnd = column.style.gridRowEnd;
    columnDrag.placeholder.style.height = rect.height + 'px';
    board.classList.add('no-smooth');
    document.addEventListener('pointermove', onColumnDragMove);
    document.addEventListener('pointerup', onColumnDragEnd, { once: true });
    event.preventDefault();
  }

  function beginGroupFloating() {
    var column = columnDrag.column;
    column.parentNode.insertBefore(columnDrag.placeholder, column);
    column.classList.add('is-floating');
    column.style.position = 'fixed';
    column.style.zIndex = '40';
    column.style.width = columnDrag.width + 'px';
    column.style.height = columnDrag.height + 'px';
    column.style.margin = '0';
    document.body.appendChild(column);
  }

  function onColumnDragMove(event) {
    if (!columnDrag) { return; }
    if (!columnDrag.moved) {
      columnDrag.moved = true;
      beginGroupFloating();
    }
    columnDrag.column.style.left = (event.clientX - columnDrag.offsetX) + 'px';
    columnDrag.column.style.top = (event.clientY - columnDrag.offsetY) + 'px';
    edgeAutoScroll(event.clientX);
    var before = groupAfterPoint(event.clientX, event.clientY);
    if (before) {
      board.insertBefore(columnDrag.placeholder, before);
    } else {
      board.appendChild(columnDrag.placeholder);
    }
  }

  function groupAfterPoint(x, y) {
    var items = Array.prototype.slice.call(board.querySelectorAll('.group:not(.is-floating), .group-placeholder'));
    var best = null;
    var bestDistance = Infinity;
    items.forEach(function (item) {
      if (item === columnDrag.placeholder) { return; }
      var rect = item.getBoundingClientRect();
      var before = y < rect.top + rect.height / 2 ||
        (Math.abs(y - (rect.top + rect.height / 2)) < rect.height / 2 && x < rect.left + rect.width / 2);
      if (!before) { return; }
      var dx = x - (rect.left + rect.width / 2);
      var dy = y - (rect.top + rect.height / 2);
      var distance = dx * dx + dy * dy;
      if (distance < bestDistance) {
        bestDistance = distance;
        best = item;
      }
    });
    return best;
  }

  function onColumnDragEnd() {
    document.removeEventListener('pointermove', onColumnDragMove);
    if (!columnDrag) { return; }
    board.classList.remove('no-smooth');
    if (columnDrag.moved) {
      var column = columnDrag.column;
      column.classList.remove('is-floating');
      column.style.position = '';
      column.style.zIndex = '';
      column.style.left = '';
      column.style.top = '';
      column.style.margin = '';
      var parent = columnDrag.placeholder.parentNode;
      parent.insertBefore(column, columnDrag.placeholder);
      columnDrag.placeholder.remove();
      updateGroupGridSpan(columnDrag.id);
    }
    // Re-sync the groups order from the DOM.
    var order = Array.prototype.slice.call(board.querySelectorAll('.group'))
      .map(function (col) { return col.getAttribute('data-group'); });
    groups.sort(function (a, b) { return order.indexOf(a.id) - order.indexOf(b.id); });
    refreshGroupSelect();
    updateAllGroupGridSpans();
    saveGroups();
    columnDrag = null;
  }

  function startGroupResize(handle, groupId) {
    handle.addEventListener('pointerdown', function (event) {
      if (event.button !== undefined && event.button !== 0) { return; }
      var column = board.querySelector('.group[data-group="' + groupId + '"]');
      if (!column) { return; }
      event.preventDefault();
      event.stopPropagation();
      column.dataset.manualSize = 'true';
      var startX = event.clientX;
      var startY = event.clientY;
      var metrics = boardGridMetrics();
      var startCols = Number(column.dataset.colSpan) || defaultGroupColSpan();
      var startRows = Number(column.dataset.rowSpan) || defaultGroupRowSpan();
      var colStep = Math.max(1, metrics.colSize + metrics.columnGap);
      var rowStep = Math.max(1, metrics.rowSize + metrics.rowGap);
      handle.setPointerCapture(event.pointerId);
      function move(ev) {
        var nextCols = startCols + Math.round((ev.clientX - startX) / colStep);
        var nextRows = startRows + Math.round((ev.clientY - startY) / rowStep);
        setGroupGridSpan(column, nextCols, nextRows);
      }
      function up() {
        handle.removeEventListener('pointermove', move);
        handle.removeEventListener('pointerup', up);
        updateGroupGridSpan(groupId);
        saveGroups();
      }
      handle.addEventListener('pointermove', move);
      handle.addEventListener('pointerup', up);
    });
  }

  function moveCardToGroup(id, groupId) {
    var record = terminals[id];
    if (!record || record.group === groupId) { return; }
    var oldGroup = record.group;
    record.group = groupId;
    var list = listEl(groupId);
    var empty = list.querySelector('.empty-state');
    if (empty) { empty.remove(); }
    list.appendChild(record.card);
    ensureGroupFitsTerminal(groupId);
    updateEmptyState(oldGroup);
    updateSummary();
    saveSessions();
    fitTerminal(record);
  }

  // ---- Card vertical resize ----------------------------------------------
  function startResize(handle, record) {
    handle.addEventListener('pointerdown', function (event) {
      if (event.button !== undefined && event.button !== 0) { return; }
      event.preventDefault();
      var startY = event.clientY;
      var startH = record.body.clientHeight;
      handle.setPointerCapture(event.pointerId);
      function move(ev) {
        var next = Math.max(150, startH + (ev.clientY - startY));
        record.body.style.height = next + 'px';
        fitTerminal(record);
        updateGroupGridSpan(record.group);
      }
      function up() {
        handle.removeEventListener('pointermove', move);
        handle.removeEventListener('pointerup', up);
        fitTerminal(record);
        updateGroupGridSpan(record.group);
        saveSessions();
      }
      handle.addEventListener('pointermove', move);
      handle.addEventListener('pointerup', up);
    });
  }

  // ---- Connect form ------------------------------------------------------
  function cleanData(data) {
    ['hostname', 'port', 'username', 'password', 'passphrase', 'totp'].forEach(function (name) {
      var value = data.get(name);
      if (typeof value === 'string') { data.set(name, value.trim()); }
    });
  }

  function validateData(data) {
    var hostname = data.get('hostname');
    var username = data.get('username');
    var port = data.get('port');
    var errors = [];
    if (!hostname) {
      errors.push(t('hostnameRequired'));
    } else if (!HOSTNAME_RE.test(hostname)) {
      errors.push(t('hostnameInvalid'));
    }
    if (!username) { errors.push(t('usernameRequired')); }
    if (port && (Number(port) < 1 || Number(port) > 65535)) { errors.push(t('portInvalid')); }
    return errors;
  }

  connectForm.addEventListener('submit', function (event) {
    event.preventDefault();
    var data = new window.FormData(connectForm);
    cleanData(data);
    var errors = validateData(data);
    if (errors.length) {
      setStatus(errors.join(' '));
      toast(errors[0], 'error');
      return;
    }
    connectTerminal(data);
  });

  // ---- Top bar actions ---------------------------------------------------
  $('#add-group').addEventListener('click', function () { addGroup(null, { focus: true }); });

  refreshSshConfig.addEventListener('click', loadSshConfigHosts);
  selectAllSshConfig.addEventListener('change', function () {
    selectedSshConfigHosts = Object.create(null);
    sshConfigSelectionAnchor = null;
    if (selectAllSshConfig.checked) {
      sshConfigHosts.forEach(function (host) { selectedSshConfigHosts[host.alias] = true; });
    }
    refreshSshConfigSelectionState();
  });
  openSelectedSshConfig.addEventListener('click', openSelectedSshConfigHosts);
  toggleSshConfigButton.addEventListener('click', function () {
    sshConfigCollapsed = !sshConfigCollapsed;
    updateSshConfigCollapse();
  });
  openLocalTerminalButton.addEventListener('click', openLocalTerminal);
  privateKeyInput.addEventListener('change', function () {
    privateKeyName.textContent = privateKeyInput.files.length ? privateKeyInput.files[0].name : t('noFileChosen');
  });
  openLogButton.addEventListener('click', function () {
    logOverlay.classList.add('is-open');
  });
  closeLogButton.addEventListener('click', function () {
    logOverlay.classList.remove('is-open');
  });

  $('#hostname').addEventListener('input', function () {
    sshConfigHostInput.value = '';
  });

  $('#disconnect-all').addEventListener('click', function () {
    var ids = Object.keys(terminals);
    if (!ids.length) { toast(t('noDisconnect')); return; }
    if (settings.confirmDisconnect && !window.confirm(t('confirmDisconnectMessage'))) { return; }
    ids.forEach(function (id) { closeTerminal(id, t('closed')); });
    setStatus(t('allDisconnected'));
    toast(t('allDisconnected'));
  });

  [confirmDisconnectInput, broadcastEnterInput, fontSizeInput, terminalHeightInput, maxTerminalsInput].forEach(function (input) {
    input.addEventListener('change', updateSettingsFromControls);
  });

  function clearLogs() {
    operationLogs = [];
    saveLogs();
    renderLog();
  }
  clearLogButton.addEventListener('click', clearLogs);
  clearLogFullButton.addEventListener('click', clearLogs);

  languageToggle.addEventListener('click', function () {
    currentLang = currentLang === 'zh' ? 'en' : 'zh';
    window.localStorage.setItem('wssh-language', currentLang);
    applyLanguage();
  });

  $('#toggle-sidebar').addEventListener('click', function () {
    appShell.classList.toggle('sidebar-collapsed');
    window.setTimeout(function () {
      updateAllGroupGridSpans();
      Object.keys(terminals).forEach(function (id) { fitTerminal(terminals[id]); });
    }, 260);
  });

  window.addEventListener('resize', function () {
    Object.keys(terminals).forEach(function (id) { fitTerminal(terminals[id]); });
    updateAllGroupGridSpans();
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      if (focusedGroupId) {
        exitGroupFullscreen();
        return;
      }
      if (logOverlay.classList.contains('is-open')) {
        logOverlay.classList.remove('is-open');
        return;
      }
      Object.keys(terminals).forEach(function (id) {
        var record = terminals[id];
        if (record.card.classList.contains('maximized')) {
          var btn = record.card.querySelector('.terminal-tools button:nth-child(2)');
          toggleMaximize(record, btn);
        }
      });
    }
  });

  // ---- Public hook (kept for compatibility) ------------------------------
  window.wssh = {
    send: function (data, groupId) {
      broadcastToGroup(groupId || (groups[0] && groups[0].id), data);
    }
  };

  // ---- Bootstrap ---------------------------------------------------------
  applyLanguage();
  applySettingsToControls();
  loadSystemSettings();
  renderLog();
  if (!restoreGroups()) {
    addGroup(null, { nameKey: 'production', skipSave: true });
    addGroup(null, { nameKey: 'staging', skipSave: true });
    saveGroups();
  }
  refreshGroupSelect();
  updateSummary();
  setStatus(t('readyDetail'));
  loadSshConfigHosts();
  restoreSessions();
})();
