/* TermFleet-SSH
 * Themeable workspace, dark terminals, draggable cards grouped into horizontal columns
 * with per-group command broadcast. Terminal transport keeps the original
 * POST + WebSocket contract; file uploads use the Worker-scoped upload route.
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
      toggleLanguage: '切换语言',
      switchToDarkTheme: '切换到夜间主题',
      switchToLightTheme: '切换到日间主题',
      openToolbar: '展开工具栏',
      togglePersistentPanels: '切换顶栏和侧栏固定模式',
      panelsPinned: '顶栏和侧栏已固定展开。',
      panelsAutoCollapse: '顶栏和侧栏已恢复自动收缩。',
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
      pinGroup: '固定分组终端',
      unpinGroup: '取消固定分组终端',
      reconnectFailedGroup: '重连本组失败终端',
      noRetryableGroupTerminals: '{name} 中没有可直接重连的失败终端。',
      reconnectingFailedGroup: '正在重连 {name} 中的 {count}。',
      groupPinned: '已固定 {name}，保存 {count}。',
      groupUnpinned: '已取消固定 {name}。',
      authenticationRequired: '需要重新认证',
      reauthenticate: '重新认证',
      reauthenticateSession: '重新认证终端',
      reauthenticationReady: '请为 {name} 重新输入认证信息。',
      broadcastHistory: '广播命令候选',
      historyCandidate: '历史',
      commonCandidate: '常用',
      broadcastPlaceholder: '向分组广播命令...',
      broadcastSelectedPlaceholder: '向已选 {count} 广播命令...',
      broadcastSelectedEmptyPlaceholder: '请先选择要广播的终端...',
      broadcastLabel: '向 {name} 广播命令',
      broadcastSelectedLabel: '向 {name} 中已选的 {count} 广播命令',
      broadcastSelectionSummary: '{total} · 已选 {selected}',
      selectForBroadcast: '选择 {name} 用于已选范围操作',
      unselectForBroadcast: '取消选择 {name}',
      toggleBroadcastScope: '切换当前分组的消息和文件范围',
      broadcastScopeAll: '全部',
      broadcastScopeSelected: '已选',
      broadcastScopeAllLabel: '消息和文件范围：全部终端；点击切换为已选终端',
      broadcastScopeSelectedLabel: '消息和文件范围：已选终端；点击切换为全部终端',
      broadcastScopeAllToast: '{name} 的消息和文件将发送到全部终端。',
      broadcastScopeSelectedToast: '{name} 的消息和文件将只发送到已选终端。',
      noSelectedBroadcastTargets: '{name} 当前使用已选范围，请先选择终端。',
      uploadFile: '上传文件',
      uploadToGroup: '向分组上传文件',
      fileUpload: '文件上传',
      uploadFileName: '文件',
      uploadFileSize: '大小',
      uploadTargets: '上传目标',
      uploadDirectory: '目标目录',
      currentDirectory: '终端当前目录',
      homeDirectoryFallback: '未检测到当前目录，使用主目录',
      overwriteExisting: '覆盖同名文件',
      startUpload: '开始上传',
      cancel: '取消',
      preparingTargets: '正在读取目标目录...',
      readyToUpload: '等待上传',
      uploadingFile: '上传中 {progress}%',
      uploadComplete: '上传完成',
      uploadFailed: '上传失败：{reason}',
      uploadSummary: '{file} 已上传到 {count} 个终端。',
      uploadPartial: '{file}：成功 {success} 个，失败 {failed} 个。',
      uploadCancelled: '上传已取消。',
      downloadLogs: '保存日志',
      logSaved: '已保存 {count} 份日志。',
      logSavedPartial: '已保存 {success} 份，失败 {failed} 份。',
      noLogsToSave: '没有可保存的终端日志。',
      noSelectedLogTargets: '{name} 当前使用已选范围，请先选择终端再保存日志。',
      logDownload: '保存日志：{name} {count} 份',
      logTargets: '保存目标',
      logFileName: '文件名',
      saveLocation: '保存位置',
      saveLocationDefault: '浏览器默认下载目录',
      chooseLocation: '选择位置',
      locationUnsupported: '当前浏览器不支持选择保存位置，将保存到浏览器默认下载目录。',
      saveLogs: '保存',
      noUploadTargets: '没有可上传文件的已连接终端。',
      noSelectedUploadTargets: '{name} 当前使用已选范围，请先选择终端再上传。',
      invalidUploadDirectory: '目标目录必须是绝对路径。',
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
      hosts: '主机',
      hostManager: '主机管理',
      currentGroup: '当前分组',
      openedInGroup: '分组内已打开',
      noOpenTerminals: '当前分组暂无已打开终端。',
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
      terminalSettings: '终端与连接',
      keyboardShortcuts: '快捷键',
      restoreDefaults: '恢复默认',
      clearShortcut: '清除 {name} 快捷键',
      shortcutConflict: '该快捷键已分配给 {name}。',
      shortcutModifierRequired: '快捷键必须包含 Command/Ctrl 或 Alt。',
      shortcutReset: '快捷键已恢复默认。',
      notSet: '未设置',
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
      logUpload: '上传 {file} 到 {name}：{path}',
      logRenameTerminal: '终端重命名：{oldName} -> {newName}',
      logRenameGroup: '工作组重命名：{oldName} -> {newName}',
      logReconnectFailedGroup: '批量重连 {name}：{count}',
      logSettings: '更新系统设置',
      logGroupFullscreen: '进入工作组全屏：{name}',
      logGroupFullscreenExit: '退出工作组全屏',
      shortcutPlaceholder: '控制键',
      ctrlC: 'Ctrl+C',
      ctrlD: 'Ctrl+D',
      ctrlZ: 'Ctrl+Z',
      ctrlL: 'Ctrl+L',
      tabKey: 'Tab',
      enterKey: 'Enter',
      escKey: 'Esc',
      broadcastShortcut: '广播控制键',
      lineSendMode: '发送方式：一次性或逐行',
      lineSendOnce: '一次性',
      lineSendLines: '逐行',
      lineSendPlaceholder: '逐行模式：一行一条命令，^c 等控制键可单独成行...',
      lineSendModeInterval: '间隔',
      lineSendModePrompt: '提示符',
      lineSendInterval: '发送间隔（毫秒）',
      lineSendBusy: '{name} 的逐行发送仍在进行中，请先停止。',
      lineSendWaiting: '等待 {count} 个终端返回提示符…',
      lineSendTimedOutAdvancing: '等待提示符超时，{count} 个终端已跳过并继续发送。',
      lineSendTargetsLost: '逐行发送中止：{name} 的终端已全部断开。',
      lineSendDone: '逐行发送完成：{name} 共 {total} 行。',
      lineSendStopped: '已停止逐行发送（编辑器内容保留）。',
      lineSendStopProgress: '停止 {index}/{total}',
      logLineSendDone: '逐行发送：{name} {total} 行',
      logLineSendStopped: '停止逐行发送：{name} 剩余 {remaining} 行',
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
      maxTerminals: '最多终端数',
      maxUploadSize: '单文件上传上限（MiB）',
      connectionConcurrency: 'SSH 建连并发数',
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
      toggleLanguage: 'Switch language',
      switchToDarkTheme: 'Switch to dark theme',
      switchToLightTheme: 'Switch to light theme',
      openToolbar: 'Expand toolbar',
      togglePersistentPanels: 'Toggle persistent toolbar and sidebar',
      panelsPinned: 'Toolbar and sidebar are now kept expanded.',
      panelsAutoCollapse: 'Toolbar and sidebar now collapse automatically.',
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
      pinGroup: 'Pin group terminals',
      unpinGroup: 'Unpin group terminals',
      reconnectFailedGroup: 'Reconnect failed terminals in this group',
      noRetryableGroupTerminals: 'No failed terminals in {name} can be reconnected directly.',
      reconnectingFailedGroup: 'Reconnecting {count} in {name}.',
      groupPinned: 'Pinned {name} with {count}.',
      groupUnpinned: 'Unpinned {name}.',
      authenticationRequired: 'Authentication required',
      reauthenticate: 'Re-authenticate',
      reauthenticateSession: 'Re-authenticate terminal',
      reauthenticationReady: 'Enter authentication details again for {name}.',
      broadcastHistory: 'Broadcast command candidates',
      historyCandidate: 'History',
      commonCandidate: 'Common',
      broadcastPlaceholder: 'Broadcast command to group...',
      broadcastSelectedPlaceholder: 'Broadcast to selected {count}...',
      broadcastSelectedEmptyPlaceholder: 'Select terminals before broadcasting...',
      broadcastLabel: 'Broadcast command to {name}',
      broadcastSelectedLabel: 'Broadcast command to selected {count} in {name}',
      broadcastSelectionSummary: '{total} · {selected} selected',
      selectForBroadcast: 'Select {name} for selected-scope actions',
      unselectForBroadcast: 'Deselect {name}',
      toggleBroadcastScope: 'Toggle the message and file scope for the current group',
      broadcastScopeAll: 'All',
      broadcastScopeSelected: 'Selected',
      broadcastScopeAllLabel: 'Message and file scope: all terminals; activate for selected terminals',
      broadcastScopeSelectedLabel: 'Message and file scope: selected terminals; activate for all terminals',
      broadcastScopeAllToast: '{name} will send messages and files to all terminals.',
      broadcastScopeSelectedToast: '{name} will send messages and files only to selected terminals.',
      noSelectedBroadcastTargets: '{name} is using selected scope. Select at least one terminal.',
      uploadFile: 'Upload file',
      uploadToGroup: 'Upload file to group',
      fileUpload: 'File upload',
      uploadFileName: 'File',
      uploadFileSize: 'Size',
      uploadTargets: 'Upload targets',
      uploadDirectory: 'Target directory',
      currentDirectory: 'Terminal current directory',
      homeDirectoryFallback: 'Current directory unavailable; using home',
      overwriteExisting: 'Overwrite files with the same name',
      startUpload: 'Start upload',
      cancel: 'Cancel',
      preparingTargets: 'Resolving target directories...',
      readyToUpload: 'Ready',
      uploadingFile: 'Uploading {progress}%',
      uploadComplete: 'Upload complete',
      uploadFailed: 'Upload failed: {reason}',
      uploadSummary: 'Uploaded {file} to {count} terminals.',
      uploadPartial: '{file}: {success} succeeded, {failed} failed.',
      uploadCancelled: 'Upload cancelled.',
      downloadLogs: 'Save logs',
      logSaved: 'Saved {count} log file(s).',
      logSavedPartial: 'Saved {success}, failed {failed}.',
      noLogsToSave: 'No terminal logs to save.',
      noSelectedLogTargets: '{name} is using selected scope. Select at least one terminal before saving logs.',
      logDownload: 'Saved logs: {count} file(s) from {name}',
      logTargets: 'Log targets',
      logFileName: 'File name',
      saveLocation: 'Save location',
      saveLocationDefault: 'Browser default downloads',
      chooseLocation: 'Choose location',
      locationUnsupported: 'This browser cannot pick a save location; logs go to the default downloads folder.',
      saveLogs: 'Save',
      noUploadTargets: 'No connected terminals are available for upload.',
      noSelectedUploadTargets: '{name} is using selected scope. Select at least one terminal before uploading.',
      invalidUploadDirectory: 'Target directories must be absolute paths.',
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
      hosts: 'Hosts',
      hostManager: 'Host manager',
      currentGroup: 'Current group',
      openedInGroup: 'Open in this group',
      noOpenTerminals: 'No terminals are open in this group.',
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
      terminalSettings: 'Terminal and connection',
      keyboardShortcuts: 'Keyboard shortcuts',
      restoreDefaults: 'Restore defaults',
      clearShortcut: 'Clear {name} shortcut',
      shortcutConflict: 'This shortcut is already assigned to {name}.',
      shortcutModifierRequired: 'Shortcuts must include Command/Ctrl or Alt.',
      shortcutReset: 'Keyboard shortcuts restored to defaults.',
      notSet: 'Not set',
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
      logUpload: 'Upload {file} to {name}: {path}',
      logRenameTerminal: 'Rename terminal: {oldName} -> {newName}',
      logRenameGroup: 'Rename group: {oldName} -> {newName}',
      logReconnectFailedGroup: 'Reconnect failed terminals in {name}: {count}',
      logSettings: 'Update system settings',
      logGroupFullscreen: 'Enter group fullscreen: {name}',
      logGroupFullscreenExit: 'Exit group fullscreen',
      shortcutPlaceholder: 'Keys',
      ctrlC: 'Ctrl+C',
      ctrlD: 'Ctrl+D',
      ctrlZ: 'Ctrl+Z',
      ctrlL: 'Ctrl+L',
      tabKey: 'Tab',
      enterKey: 'Enter',
      escKey: 'Esc',
      broadcastShortcut: 'Broadcast key combo',
      lineSendMode: 'Send mode: once or line by line',
      lineSendOnce: 'Once',
      lineSendLines: 'Lines',
      lineSendPlaceholder: 'Line-by-line: one command per line, ^c etc. may stand alone...',
      lineSendModeInterval: 'Interval',
      lineSendModePrompt: 'Prompt',
      lineSendInterval: 'Send interval (ms)',
      lineSendBusy: 'Line-by-line send for {name} is still running. Stop it first.',
      lineSendWaiting: 'Waiting for {count} terminal(s) to show a prompt…',
      lineSendTimedOutAdvancing: 'Prompt wait timed out; {count} terminal(s) skipped and sending continues.',
      lineSendTargetsLost: 'Line-by-line aborted: all terminals in {name} disconnected.',
      lineSendDone: 'Line-by-line complete: {total} lines to {name}.',
      lineSendStopped: 'Line-by-line stopped (editor content kept).',
      lineSendStopProgress: 'Stop {index}/{total}',
      logLineSendDone: 'Line-by-line: {total} lines to {name}',
      logLineSendStopped: 'Stopped line-by-line: {remaining} lines left for {name}',
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
      maxTerminals: 'Max terminals',
      maxUploadSize: 'Maximum file size (MiB)',
      connectionConcurrency: 'SSH connection concurrency',
      logLocalTerminal: 'Open local terminal',
      logRestored: 'Restore terminal {name}',
      restoringSessions: 'Restoring terminals...',
      localTerminalFailed: 'Failed to open local terminal.',
      savedSettings: 'System settings saved.'
    }
  };

  var currentLang = window.localStorage.getItem('wssh-language') || 'zh';
  var currentTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';

  function t(key, data) {
    var text = (I18N[currentLang] && I18N[currentLang][key]) || I18N.zh[key] || key;
    text = text.replace(/\{count, ([^,{}]+), ([^,{}]+)\}/g, function (_, one, many) {
      return data && Number(data.count) === 1 ? one : many;
    });
    return text.replace(/\{(\w+)\}/g, function (_, name) {
      return data && data[name] !== undefined ? data[name] : '';
    });
  }

  var DEFAULT_SHORTCUTS = {
    connectServer: 'mod+shift+c',
    togglePersistentPanels: 'mod+alt+p',
    toggleBroadcastScope: 'mod+alt+s',
    hostManager: 'mod+shift+h',
    systemSettings: 'mod+shift+,',
    operationLog: '',
    localTerminal: '',
    newGroup: ''
  };

  var SHORTCUT_ACTIONS = [
    { id: 'connectServer', labelKey: 'connectServer', buttonSelector: '.sidebar-rail' },
    { id: 'togglePersistentPanels', labelKey: 'togglePersistentPanels', buttonSelector: '.topbar-rail' },
    { id: 'toggleBroadcastScope', labelKey: 'toggleBroadcastScope', buttonSelector: '.broadcast-scope-widget' },
    { id: 'hostManager', labelKey: 'hostManager', buttonSelector: '#open-host-manager' },
    { id: 'systemSettings', labelKey: 'systemSettings', buttonSelector: '#open-system-settings' },
    { id: 'operationLog', labelKey: 'operationLog', buttonSelector: '#open-log' },
    { id: 'localTerminal', labelKey: 'localTerminal', buttonSelector: '#open-local-terminal' },
    { id: 'newGroup', labelKey: 'newGroup', buttonSelector: '#add-group' }
  ];

  var BROADCAST_HISTORY_LIMIT = 100;
  var BATCH_SOCKET_WAVE_SIZE = 8;
  var BATCH_SOCKET_WAVE_DELAY = 0;
  var BATCH_SOCKET_RETRY_DELAY = 2000;
  var BATCH_CONNECTION_RETRY_DELAY = 0;
  var COMMON_BROADCAST_COMMANDS = [
    'pwd',
    'ls -la',
    'ls -lah',
    'whoami',
    'id',
    'w',
    'hostname',
    'hostnamectl',
    'uname -a',
    'uptime',
    'date',
    'cat /etc/os-release',
    'lscpu',
    'lsblk',
    'df -h',
    'df -ih',
    'free -h',
    'vmstat 1 5',
    'cat /proc/meminfo | head -n 20',
    'ps aux --sort=-%cpu | head -n 20',
    'ps aux --sort=-%mem | head -n 20',
    'last -n 20',
    'ip addr',
    'ip -br addr',
    'ip route',
    'ip neigh',
    'ss -tulpn',
    'ss -lntp',
    'ss -s',
    'cat /etc/resolv.conf',
    'ping -c 4 8.8.8.8',
    'systemctl --failed --no-pager',
    'systemctl --type=service --state=running --no-pager',
    'journalctl -p err -n 50 --no-pager',
    'journalctl -n 100 --no-pager',
    'dmesg --level=err,warn | tail -n 50',
    'docker ps',
    'docker stats --no-stream'
  ];

  // ---- State -------------------------------------------------------------
  var groups = [];          // ordered [{ id, name }]
  var terminals = {};       // id -> terminal record
  var groupSeq = 0;
  var termSeq = 0;

  var drag = null;          // active card drag session
  var columnDrag = null;    // active column drag session
  var focusedGroupId = null;
  var operationLogs = loadLogs();
  var broadcastHistory = loadBroadcastHistory();
  var broadcastEditors = {};  // {groupId: input/sendBtn/sendLabel/uploadBtn/shortcutSelect/line controls}
  var settings = loadSettings();
  var selectedSshConfigHosts = Object.create(null);
  var sshConfigSelectionAnchor = null;
  var groupLayoutObserver = null;
  var hostManagerPreviousFocus = null;
  var connectionPreviousFocus = null;
  var systemSettingsPreviousFocus = null;
  var reauthPreviousFocus = null;
  var hostManagerGroupId = null;
  var pendingAuthenticationRecord = null;
  var uploadSelection = null;
  var uploadPickerRecords = [];
  var uploadPreviousFocus = null;
  var logSaveState = null;
  var logSavePreviousFocus = null;
  var boardWheelLocked = false;

  // ---- DOM ---------------------------------------------------------------
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var board = $('#board');
  var appShell = $('#app-shell');
  var statusText = $('#status-text');
  var summary = $('#fleet-summary');
  var groupSelect = $('#target-group');
  var connectForm = $('#connect');
  var connectFormHome = connectForm.parentNode;
  var connectFormNextSibling = connectForm.nextSibling;
  var connectButton = $('#connect-button');
  var toastStack = $('#toast-stack');
  var themeToggle = $('#theme-toggle');
  var languageToggle = $('#language-toggle');
  var sshConfigHostInput = $('#ssh-config-host');
  var sshConfigList = $('#ssh-config-list');
  var refreshSshConfig = $('#refresh-ssh-config');
  var selectAllSshConfig = $('#select-all-ssh-config');
  var openSelectedSshConfig = $('#open-selected-ssh-config');
  var openSelectedSshConfigLabel = $('#open-selected-ssh-config-label');
  var openHostManagerButton = $('#open-host-manager');
  var sidebarRail = $('.sidebar-rail');
  var connectionOverlay = $('#connection-overlay');
  var connectionDialogBody = $('#connection-dialog-body');
  var closeConnectionButton = $('#close-connection');
  var openSystemSettingsButton = $('#open-system-settings');
  var closeSystemSettingsButton = $('#close-system-settings');
  var systemSettingsOverlay = $('#system-settings-overlay');
  var shortcutSettingsList = $('#shortcut-settings-list');
  var resetShortcutsButton = $('#reset-shortcuts');
  var closeHostManagerButton = $('#close-host-manager');
  var hostManagerOverlay = $('#host-manager-overlay');
  var hostManagerGroups = $('#host-manager-groups');
  var hostManagerAddGroup = $('#host-manager-add-group');
  var hostManagerOpenList = $('#host-manager-open-list');
  var hostManagerOpenCount = $('#host-manager-open-count');
  var sshConfigHosts = [];
  var confirmDisconnectInput = $('#setting-confirm-disconnect');
  var broadcastEnterInput = $('#setting-broadcast-enter');
  var fontSizeInput = $('#setting-font-size');
  var terminalHeightInput = $('#setting-terminal-height');
  var maxTerminalsInput = $('#setting-max-terminals');
  var maxUploadSizeInput = $('#setting-max-upload');
  var connectionConcurrencyInput = $('#setting-connection-concurrency');
  var clearLogButton = $('#clear-log');
  var operationLog = $('#operation-log');
  var openLogButton = $('#open-log');
  var closeLogButton = $('#close-log');
  var clearLogFullButton = $('#clear-log-full');
  var logOverlay = $('#log-overlay');
  var logOutput = $('#log-output');
  var privateKeyInput = $('#privatekey');
  var privateKeyName = $('#privatekey-name');
  var reauthOverlay = $('#reauth-overlay');
  var reauthForm = $('#reauth-form');
  var closeReauthButton = $('#close-reauth');
  var cancelReauthButton = $('#cancel-reauth');
  var submitReauthButton = $('#submit-reauth');
  var reauthPasswordInput = $('#reauth-password');
  var reauthPrivateKeyInput = $('#reauth-privatekey');
  var reauthPrivateKeyName = $('#reauth-privatekey-name');
  var reauthTargetName = $('#reauth-target-name');
  var reauthTargetMeta = $('#reauth-target-meta');
  var openLocalTerminalButton = $('#open-local-terminal');
  var fileUploadPicker = $('#file-upload-picker');
  var fileUploadOverlay = $('#file-upload-overlay');
  var closeFileUploadButton = $('#close-file-upload');
  var cancelFileUploadButton = $('#cancel-file-upload');
  var startFileUploadButton = $('#start-file-upload');
  var logSaveOverlay = $('#log-save-overlay');
  var closeLogSaveButton = $('#close-log-save');
  var cancelLogSaveButton = $('#cancel-log-save');
  var confirmLogSaveButton = $('#confirm-log-save');
  var chooseLogLocationButton = $('#choose-log-location');
  var logSaveTargets = $('#log-save-targets');
  var logSaveLocationText = $('#log-save-location');
  var logSaveCountText = $('#log-save-count');
  var fileUploadName = $('#file-upload-name');
  var fileUploadSize = $('#file-upload-size');
  var fileUploadTargets = $('#file-upload-targets');
  var overwriteUploadInput = $('#overwrite-upload');

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
    plus: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    upload: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 16V4m0 0L7 9m5-5 5 5M5 14v5h14v-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    download: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3v13m0 0 5-5m-5 5-5-5M5 19h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    trash: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    reconnect: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 6v5h-5M4 18v-5h5M18.5 10A7 7 0 0 0 6.1 7.1L4 9M5.5 14a7 7 0 0 0 12.4 2.9L20 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    pin: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 4h6v5l3 7H6l3-7V4ZM12 16v5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    pinActive: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 4h6v5l3 7H6l3-7V4Z" fill="currentColor"/><path d="M12 16v5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    select: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/></svg>',
    selectActive: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/><path d="m8 12 3 3 5-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    maximize: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M8 4H4v4M16 4h4v4M8 20H4v-4M16 20h4v-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    minimize: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 4v3a2 2 0 0 1-2 2H4M15 4v3a2 2 0 0 0 2 2h3M9 20v-3a2 2 0 0 0-2-2H4M15 20v-3a2 2 0 0 1 2-2h3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    close: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    moon: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    sun: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="2"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
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
      panelsPinned: false,
      terminalFontSize: 13,
      terminalHeight: 300,
      maxTerminals: 20,
      maxUploadSize: 100,
      connectionConcurrency: 32,
      shortcuts: Object.assign({}, DEFAULT_SHORTCUTS)
    };
    try {
      var saved = JSON.parse(window.localStorage.getItem('wssh-settings') || '{}');
      var merged = Object.assign({}, defaults, saved);
      merged.shortcuts = Object.assign({}, DEFAULT_SHORTCUTS, saved.shortcuts || {});
      return merged;
    } catch (e) {
      return defaults;
    }
  }

  function saveSettings() {
    window.localStorage.setItem('wssh-settings', JSON.stringify(settings));
  }

  function applyPersistentPanelMode() {
    appShell.classList.toggle('panels-pinned', settings.panelsPinned === true);
  }

  function togglePersistentPanels() {
    settings.panelsPinned = settings.panelsPinned !== true;
    saveSettings();
    applyPersistentPanelMode();
    var message = t(settings.panelsPinned ? 'panelsPinned' : 'panelsAutoCollapse');
    setStatus(message);
    toast(message, 'success');
    window.setTimeout(function () {
      Object.keys(terminals).forEach(function (id) { fitTerminal(terminals[id]); });
    }, 240);
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
        settings.maxUploadSize = data.maxupload || settings.maxUploadSize;
        settings.connectionConcurrency = data.connect_workers || settings.connectionConcurrency;
        saveSettings();
        applySettingsToControls();
      });
  }

  function saveSystemSettings() {
    var body = new window.URLSearchParams();
    body.set('maxconn', settings.maxTerminals);
    body.set('maxupload', settings.maxUploadSize);
    body.set('connect_workers', settings.connectionConcurrency);
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
    maxUploadSizeInput.value = settings.maxUploadSize;
    connectionConcurrencyInput.value = settings.connectionConcurrency;
    applyPersistentPanelMode();
    renderShortcutSettings();
    applyShortcutBindings();
  }

  function shortcutKeyFromEvent(event) {
    if (/^Key[A-Z]$/.test(event.code)) { return event.code.slice(3).toLowerCase(); }
    if (/^Digit[0-9]$/.test(event.code)) { return event.code.slice(5); }
    var codeMap = {
      Comma: ',', Period: '.', Slash: '/', Semicolon: ';',
      BracketLeft: '[', BracketRight: ']', Backslash: '\\',
      Minus: '-', Equal: '=', Space: 'space', Enter: 'enter',
      ArrowUp: 'arrowup', ArrowDown: 'arrowdown',
      ArrowLeft: 'arrowleft', ArrowRight: 'arrowright'
    };
    if (codeMap[event.code]) { return codeMap[event.code]; }
    if (/^F([1-9]|1[0-2])$/.test(event.code)) { return event.code.toLowerCase(); }
    return null;
  }

  function shortcutFromEvent(event) {
    var key = shortcutKeyFromEvent(event);
    if (!key || !(event.ctrlKey || event.metaKey || event.altKey)) { return null; }
    var parts = [];
    if (event.ctrlKey || event.metaKey) { parts.push('mod'); }
    if (event.altKey) { parts.push('alt'); }
    if (event.shiftKey) { parts.push('shift'); }
    parts.push(key);
    return parts.join('+');
  }

  function shortcutLabel(shortcut) {
    if (!shortcut) { return t('notSet'); }
    var mac = /Mac|iPhone|iPad|iPod/.test(window.navigator.platform || '');
    var labels = {
      mod: mac ? 'Command' : 'Ctrl', alt: mac ? 'Option' : 'Alt', shift: 'Shift',
      space: 'Space', enter: 'Enter', arrowup: 'Up', arrowdown: 'Down',
      arrowleft: 'Left', arrowright: 'Right'
    };
    return shortcut.split('+').map(function (part) {
      return labels[part] || part.toUpperCase();
    }).join(' + ');
  }

  function shortcutToAria(shortcut) {
    if (!shortcut) { return ''; }
    var parts = shortcut.split('+');
    var key = parts.pop();
    var modifiers = parts.map(function (part) {
      if (part === 'shift') { return 'Shift'; }
      if (part === 'alt') { return 'Alt'; }
      return part;
    });
    var ariaKey = {
      space: 'Space', enter: 'Enter', arrowup: 'ArrowUp', arrowdown: 'ArrowDown',
      arrowleft: 'ArrowLeft', arrowright: 'ArrowRight'
    }[key] || key.toUpperCase();
    if (modifiers.indexOf('mod') === -1) {
      return modifiers.concat(ariaKey).join('+');
    }
    return ['Control', 'Meta'].map(function (mod) {
      return modifiers.map(function (part) { return part === 'mod' ? mod : part; }).concat(ariaKey).join('+');
    }).join(' ');
  }

  function eventMatchesShortcut(event, shortcut) {
    if (!shortcut) { return false; }
    var parts = shortcut.split('+');
    var key = parts.pop();
    var expectsMod = parts.indexOf('mod') !== -1;
    var expectsAlt = parts.indexOf('alt') !== -1;
    var expectsShift = parts.indexOf('shift') !== -1;
    if (expectsMod !== !!(event.ctrlKey || event.metaKey)) { return false; }
    if (expectsAlt !== event.altKey || expectsShift !== event.shiftKey) { return false; }
    return shortcutKeyFromEvent(event) === key;
  }

  function applyShortcutBindings() {
    SHORTCUT_ACTIONS.forEach(function (action) {
      var value = shortcutToAria(settings.shortcuts[action.id]);
      document.querySelectorAll(action.buttonSelector).forEach(function (button) {
        if (value) {
          button.setAttribute('aria-keyshortcuts', value);
        } else {
          button.removeAttribute('aria-keyshortcuts');
        }
      });
    });
  }

  function renderShortcutSettings() {
    if (!shortcutSettingsList) { return; }
    shortcutSettingsList.innerHTML = '';
    SHORTCUT_ACTIONS.forEach(function (action) {
      var inputId = 'shortcut-' + action.id;
      var input = el('input', {
        class: 'shortcut-input', id: inputId, type: 'text', readonly: 'readonly',
        autocomplete: 'off', value: shortcutLabel(settings.shortcuts[action.id])
      });
      var clearLabel = t('clearShortcut', { name: t(action.labelKey) });
      var clearButton = el('button', {
        class: 'shortcut-clear', type: 'button', title: clearLabel,
        'aria-label': clearLabel, html: ICONS.close
      });
      clearButton.disabled = !settings.shortcuts[action.id];
      input.addEventListener('focus', function () { input.select(); });
      input.addEventListener('keydown', function (event) {
        if (event.key === 'Tab') { return; }
        event.preventDefault();
        event.stopPropagation();
        if (event.key === 'Escape') { input.blur(); return; }
        if ((event.key === 'Backspace' || event.key === 'Delete') && !event.ctrlKey && !event.metaKey && !event.altKey) {
          settings.shortcuts[action.id] = '';
          saveSettings();
          applyShortcutBindings();
          renderShortcutSettings();
          return;
        }
        if (['Control', 'Meta', 'Alt', 'Shift'].indexOf(event.key) !== -1) { return; }
        var shortcut = shortcutFromEvent(event);
        if (!shortcut) {
          toast(t('shortcutModifierRequired'), 'error');
          return;
        }
        var conflict = SHORTCUT_ACTIONS.find(function (item) {
          return item.id !== action.id && settings.shortcuts[item.id] === shortcut;
        });
        if (conflict) {
          toast(t('shortcutConflict', { name: t(conflict.labelKey) }), 'error');
          return;
        }
        settings.shortcuts[action.id] = shortcut;
        saveSettings();
        applyShortcutBindings();
        input.value = shortcutLabel(shortcut);
        input.blur();
      });
      clearButton.addEventListener('click', function () {
        settings.shortcuts[action.id] = '';
        saveSettings();
        applyShortcutBindings();
        renderShortcutSettings();
      });
      shortcutSettingsList.appendChild(el('div', { class: 'shortcut-row' }, [
        el('label', { for: inputId, text: t(action.labelKey) }), input, clearButton
      ]));
    });
  }

  function updateSettingsFromControls() {
    settings.confirmDisconnect = confirmDisconnectInput.checked;
    settings.broadcastEnter = broadcastEnterInput.checked;
    settings.terminalFontSize = Math.max(10, Math.min(24, Number(fontSizeInput.value) || 13));
    settings.terminalHeight = Math.max(180, Math.min(720, Number(terminalHeightInput.value) || 300));
    settings.maxTerminals = Math.max(1, Math.min(500, Number(maxTerminalsInput.value) || 20));
    settings.maxUploadSize = Math.max(1, Math.min(10240, Number(maxUploadSizeInput.value) || 100));
    settings.connectionConcurrency = Math.max(1, Math.min(128, Number(connectionConcurrencyInput.value) || 32));
    saveSettings();
    saveSystemSettings();
    logAction('logSettings');
    Object.keys(terminals).forEach(function (id) {
      var record = terminals[id];
      if (record.term) {
        record.term.setOption('fontSize', settings.terminalFontSize);
        record.body.style.setProperty('--terminal-bottom-space', (settings.terminalFontSize / 2) + 'px');
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

  function loadBroadcastHistory() {
    try {
      var saved = JSON.parse(window.localStorage.getItem('wssh-broadcast-history') || '{}');
      if (!saved || Array.isArray(saved) || typeof saved !== 'object') { return Object.create(null); }
      var history = Object.create(null);
      Object.keys(saved).forEach(function (groupId) {
        if (!Array.isArray(saved[groupId])) { return; }
        history[groupId] = saved[groupId].filter(function (command) {
          return typeof command === 'string' && !!command.trim() && command.length <= 4096;
        }).slice(0, BROADCAST_HISTORY_LIMIT);
      });
      return history;
    } catch (e) {
      return Object.create(null);
    }
  }

  function saveBroadcastHistory() {
    window.localStorage.setItem('wssh-broadcast-history', JSON.stringify(broadcastHistory));
  }

  function rememberBroadcastCommand(groupId, command) {
    var value = String(command || '').replace(/\s+$/, '');
    if (!value.trim() || value.length > 4096) { return; }
    var history = (broadcastHistory[groupId] || []).filter(function (item) { return item.toLowerCase() !== value.toLowerCase(); });
    history.unshift(value);
    broadcastHistory[groupId] = history.slice(0, BROADCAST_HISTORY_LIMIT);
    saveBroadcastHistory();
  }

  function broadcastCommandCandidates(groupId, query, includeCommon) {
    var needle = String(query || '').trim().toLowerCase();
    var prefix = [];
    var contains = [];
    var seen = Object.create(null);
    var sources = [{ commands: broadcastHistory[groupId] || [], source: 'history' }];
    if (includeCommon) {
      var common = { commands: COMMON_BROADCAST_COMMANDS, source: 'common' };
      if (needle) { sources.push(common); } else { sources.unshift(common); }
    }
    sources.forEach(function (source) {
      source.commands.forEach(function (command) {
        if (seen[command]) { return; }
        seen[command] = true;
        var candidate = { command: command, source: source.source };
        var value = command.toLowerCase();
        if (!needle || value.indexOf(needle) === 0) {
          prefix.push(candidate);
        } else if (value.indexOf(needle) !== -1) {
          contains.push(candidate);
        }
      });
    });
    return prefix.concat(contains);
  }

  function removeBroadcastHistory(groupId) {
    if (!broadcastHistory[groupId]) { return; }
    delete broadcastHistory[groupId];
    saveBroadcastHistory();
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

  function applyTheme() {
    var isDark = currentTheme === 'dark';
    var label = t(isDark ? 'switchToLightTheme' : 'switchToDarkTheme');
    document.documentElement.setAttribute('data-theme', currentTheme);
    themeToggle.innerHTML = isDark ? ICONS.sun : ICONS.moon;
    themeToggle.setAttribute('title', label);
    themeToggle.setAttribute('aria-label', label);
    themeToggle.setAttribute('aria-pressed', isDark ? 'true' : 'false');
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
    renderHostManagerTerminals();
    renderShortcutSettings();
    applyShortcutBindings();
    renderLog();
    if (!privateKeyInput.files.length) { privateKeyName.textContent = t('noFileChosen'); }
    updateSummary();
    setStatus(t('readyDetail'));
    applyTheme();
  }

  function refreshDynamicLanguage() {
    groups.forEach(function (group) {
      var column = board.querySelector('.group[data-group="' + group.id + '"]');
      if (!column) { return; }
      column.setAttribute('aria-label', group.name);
      var nameEl = column.querySelector('.group-name');
      var grip = column.querySelector('.group-grip');
      var pinBtn = column.querySelector('.pin-group');
      var reconnectFailedBtn = column.querySelector('.group-reconnect-failed');
      var fullscreenBtn = column.querySelector('.group-fullscreen-btn');
      var deleteBtn = column.querySelector('.danger-hover');
      var historyList = column.querySelector('.broadcast-history');
      var upload = column.querySelector('.broadcast-upload');
      var download = column.querySelector('.broadcast-download');
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
      if (pinBtn) { updateGroupPinButton(group, pinBtn); }
      if (reconnectFailedBtn) {
        reconnectFailedBtn.setAttribute('title', t('reconnectFailedGroup'));
        reconnectFailedBtn.setAttribute('aria-label', t('reconnectFailedGroup'));
      }
      if (fullscreenBtn) {
        fullscreenBtn.setAttribute('title', focusedGroupId === group.id ? t('exitGroupFullscreen') : t('groupFullscreen'));
        fullscreenBtn.setAttribute('aria-label', focusedGroupId === group.id ? t('exitGroupFullscreen') : t('groupFullscreen'));
      }
      if (historyList) { historyList.setAttribute('aria-label', t('broadcastHistory')); }
      if (broadcastEditors[group.id]) {
        // Rebuild shared control-key/mode dropdown and refresh line-send widgets.
        refreshLineSendControls(group);
      }
      if (upload) {
        upload.setAttribute('title', t('uploadToGroup'));
        upload.setAttribute('aria-label', t('uploadToGroup'));
      }
      if (download) {
        download.setAttribute('title', t('downloadLogs'));
        download.setAttribute('aria-label', t('downloadLogs'));
      }
      if (sendText) {
        if (lineRun && lineRun.groupId === group.id) { updateLineRunButton(); }
        else { sendText.textContent = t('send'); }
      }
      refreshBroadcastSelection(group.id);
      updateEmptyState(group.id);
    });

    Object.keys(terminals).forEach(function (id) {
      refreshTerminalLanguage(terminals[id]);
    });
  }

  function refreshTerminalLanguage(record) {
    var upload = record.card.querySelector('.upload-terminal');
    var reconnect = record.card.querySelector('.reconnect-terminal');
    var maximize = record.card.querySelector('.maximize-terminal');
    var close = record.card.querySelector('.close-btn');
    var header = record.card.querySelector('.terminal-header');
    var placeholder = record.card.querySelector('.terminal-placeholder');
    var resize = record.card.querySelector('.resize-handle');
    refreshTerminalBroadcastSelection(record);
    if (upload) {
      upload.setAttribute('title', t('uploadFile'));
      upload.setAttribute('aria-label', t('uploadFile'));
    }
    if (reconnect) {
      reconnect.setAttribute('title', t('reconnectTerminal'));
      reconnect.setAttribute('aria-label', t('reconnectTerminal'));
    }
    if (maximize) {
      maximize.setAttribute('title', record.card.classList.contains('maximized') ? t('restore') : t('maximize'));
      maximize.setAttribute('aria-label', t('maximize'));
    }
    if (close) {
      close.setAttribute('title', t('close'));
      close.setAttribute('aria-label', t('closeTerminal'));
    }
    if (record.nameEl) { record.nameEl.setAttribute('title', t('renameTerminal')); }
    if (header) { header.setAttribute('aria-label', t('dragTerminal', { name: record.displayName || record.hostname })); }
    if (placeholder) {
      if (record.stateKey === 'authenticationRequired') {
        renderAuthenticationRequired(record);
      } else {
        placeholder.textContent = record.stateKey ? t(record.stateKey) : t('establishing');
      }
    }
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
      'enter': '\r',
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

  function newPersistentSessionId() {
    return 'session-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  function canReconnectWithoutStoredSecrets(data) {
    if (!data) { return false; }
    var privatekey = data.get('privatekey');
    var hasPrivateKey = privatekey && (typeof privatekey === 'string' ?
      !!privatekey.trim() : !!(privatekey.name || privatekey.size));
    return !hasPrivateKey && !['password', 'passphrase', 'totp'].some(function (name) {
      var value = data.get(name);
      return typeof value === 'string' && !!value.trim();
    });
  }

  function safePinnedSession(session) {
    if (!session) { return null; }
    var reconnectInfo = safeReconnectInfo(session.reconnectInfo);
    if (!reconnectInfo) { return null; }
    return {
      persistentId: session.persistentId || newPersistentSessionId(),
      hostname: session.hostname || '',
      username: session.username || '',
      port: session.port || (session.isLocal ? '0' : '22'),
      displayName: session.displayName || session.hostname || '',
      bodyHeight: session.bodyHeight || '',
      isLocal: !!session.isLocal,
      autoReconnect: !!session.autoReconnect || !!session.isLocal,
      broadcastSelected: !!session.broadcastSelected,
      reconnectInfo: reconnectInfo
    };
  }

  function pinnedSessionFromRecord(record) {
    return safePinnedSession({
      persistentId: record.persistentId,
      hostname: record.hostname,
      username: record.username,
      port: record.port,
      displayName: record.displayName,
      bodyHeight: record.body ? record.body.style.height : '',
      isLocal: record.isLocal,
      autoReconnect: record.autoReconnect,
      broadcastSelected: !!record.broadcastSelected,
      reconnectInfo: record.reconnectInfo
    });
  }

  function syncPinnedSessionSnapshots() {
    var changed = false;
    groups.filter(function (group) { return group.pinned; }).forEach(function (group) {
      var next = terminalsInGroup(group.id).map(pinnedSessionFromRecord).filter(Boolean);
      if (JSON.stringify(group.pinnedSessions || []) !== JSON.stringify(next)) {
        group.pinnedSessions = next;
        changed = true;
      }
    });
    return changed;
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
        layoutMode: 'stacked-v1',
        colSpan: column ? Number(column.dataset.colSpan) || null : group.colSpan || null,
        rowSpan: column ? Number(column.dataset.rowSpan) || null : group.rowSpan || null,
        manualSize: column ? column.dataset.manualSize === 'true' : !!group.manualSize,
        pinned: !!group.pinned,
        broadcastSelectedOnly: !!group.broadcastSelectedOnly,
        lineSend: !!group.lineSend,
        lineSendMode: group.lineSendMode === 'prompt' ? 'prompt' : 'interval',
        lineSendInterval: Math.min(10000, Math.max(0, Number(group.lineSendInterval) || 500)),
        pinnedSessions: group.pinned ? (group.pinnedSessions || []).map(safePinnedSession).filter(Boolean) : []
      };
    });
    window.localStorage.setItem('wssh-groups', JSON.stringify(records));
  }

  function restoreGroups() {
    var saved = loadGroupRecords();
    if (!saved.length) { return false; }
    saved.forEach(function (item) {
      var stackedLayout = item.layoutMode === 'stacked-v1';
      addGroup(item.name, {
        id: item.id,
        nameKey: item.nameKey,
        number: item.number,
        colSpan: stackedLayout ? item.colSpan : null,
        rowSpan: stackedLayout ? item.rowSpan : null,
        manualSize: stackedLayout && item.manualSize,
        pinned: !!item.pinned,
        broadcastSelectedOnly: !!item.broadcastSelectedOnly,
        lineSend: !!item.lineSend,
        lineSendMode: item.lineSendMode === 'prompt' ? 'prompt' : 'interval',
        lineSendInterval: Math.min(10000, Math.max(0, Number(item.lineSendInterval) || 500)),
        pinnedSessions: (item.pinnedSessions || []).map(safePinnedSession).filter(Boolean),
        skipSave: true
      });
    });
    saveGroups();
    return true;
  }

  function saveSessions() {
    if (syncPinnedSessionSnapshots()) { saveGroups(); }
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
        persistentId: record.persistentId,
        autoReconnect: !!record.autoReconnect,
        groupId: record.group,
        groupName: group ? group.name : '',
        isLocal: !!record.isLocal,
        broadcastSelected: !!record.broadcastSelected,
        currentDirectory: record.currentDirectory || ''
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
    if (!saved.length) {
      restorePinnedSessions();
      return;
    }
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
            currentDirectory: session.currentDirectory || '',
            persistentId: session.persistentId,
            autoReconnect: !!session.autoReconnect,
            broadcastSelected: !!session.broadcastSelected,
            reconnectInfo: session.reconnectInfo || null
          });
          record.workerId = session.workerId;
          openSocket(record, session.workerId, 'utf-8');
          logAction('logRestored', { name: record.displayName || record.hostname });
        });
        restorePinnedSessions();
        saveSessions();
      }).catch(function () {
        restorePinnedSessions();
      });
  }

  function restorePinnedSessions() {
    var existing = Object.create(null);
    var sshBatch = [];
    Object.keys(terminals).forEach(function (id) {
      existing[terminals[id].persistentId] = true;
    });
    groups.filter(function (group) { return group.pinned; }).forEach(function (group) {
      (group.pinnedSessions || []).map(safePinnedSession).filter(Boolean).forEach(function (session) {
        if (existing[session.persistentId]) { return; }
        existing[session.persistentId] = true;
        var record = createCard({
          hostname: session.hostname,
          username: session.username,
          port: session.port,
          group: group.id,
          displayName: session.displayName,
          isLocal: session.isLocal,
          bodyHeight: session.bodyHeight,
          persistentId: session.persistentId,
          autoReconnect: session.autoReconnect,
          broadcastSelected: !!session.broadcastSelected,
          reconnectInfo: session.reconnectInfo
        });
        if (session.isLocal) {
          reconnectLocalTerminal(record);
        } else if (session.autoReconnect) {
          sshBatch.push({
            record: record,
            info: session.reconnectInfo,
            data: reconnectSshFormData(record, session.reconnectInfo, true)
          });
        } else {
          setCardState(record, 'error', null, 'authenticationRequired');
          renderAuthenticationRequired(record);
        }
      });
    });
    if (sshBatch.length) { reconnectSshTerminalBatch(sshBatch); }
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
    var groupId = hostManagerGroupId || groupSelect.value;
    var data = sshConfigHostFormData(host, groupId);
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
    var group = groupById(hostManagerGroupId) || groupById(groupSelect.value) || groups[0];
    if (!group) { group = addGroup(null); }
    connectTerminalBatch(selectedHosts.map(function (host) {
      return sshConfigHostFormData(host, group.id);
    }));
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
      fillBtn.addEventListener('click', function () {
        fillFromSshConfigHost(host);
        closeHostManager();
        $('#hostname').focus();
      });
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

  function renderHostManagerTerminals() {
    hostManagerOpenList.innerHTML = '';
    var group = groupById(hostManagerGroupId) || groupById(groupSelect.value) || groups[0];
    var records = group ? terminalsInGroup(group.id) : [];
    hostManagerOpenCount.textContent = terminalCountText(records.length);
    if (!records.length) {
      hostManagerOpenList.appendChild(el('div', { class: 'ssh-config-empty', text: t('noOpenTerminals') }));
      return;
    }
    records.forEach(function (record) {
      var state = record.state || 'connecting';
      var reconnectBtn = el('button', {
        type: 'button', title: t('reconnectTerminal'),
        'aria-label': t('reconnectTerminal'), html: ICONS.reconnect
      });
      var maximized = record.card.classList.contains('maximized');
      var maxBtn = el('button', {
        type: 'button', title: t(maximized ? 'restore' : 'maximize'),
        'aria-label': t(maximized ? 'restore' : 'maximize'),
        html: maximized ? ICONS.minimize : ICONS.maximize
      });
      var closeBtn = el('button', {
        class: 'close-btn', type: 'button', title: t('close'),
        'aria-label': t('closeTerminal'), html: ICONS.close
      });
      reconnectBtn.addEventListener('click', function () { reconnectTerminal(record); });
      maxBtn.addEventListener('click', function () {
        var cardButton = record.card.querySelector('.maximize-terminal');
        closeHostManager(false);
        toggleMaximize(record, cardButton);
      });
      closeBtn.addEventListener('click', function () { closeTerminal(record.id, t('userClosed')); });
      hostManagerOpenList.appendChild(el('div', { class: 'host-session is-' + state }, [
        el('span', { class: 'host-session-dot', 'aria-hidden': 'true' }),
        el('div', {}, [
          el('div', { class: 'host-session-name', text: record.displayName || record.hostname }),
          el('div', {
            class: 'host-session-meta',
            text: record.username + '@' + record.hostname + ':' + record.port + ' · ' + record.stateText.textContent
          })
        ]),
        el('div', { class: 'terminal-tools host-session-tools' }, [reconnectBtn, maxBtn, closeBtn])
      ]));
    });
  }

  function renderHostManagerGroups() {
    hostManagerGroups.innerHTML = '';
    var selected = groupById(hostManagerGroupId) || groupById(groupSelect.value) || groups[0];
    hostManagerGroupId = selected ? selected.id : null;
    groups.forEach(function (group, index) {
      var active = group.id === hostManagerGroupId;
      var tab = el('button', {
        class: 'host-manager-group-tab', type: 'button',
        dataset: { group: group.id }, 'aria-pressed': active ? 'true' : 'false',
        tabindex: active ? '0' : '-1', title: group.name, text: group.name
      });
      var deleteLabel = t('removeGroup') + ': ' + group.name;
      var deleteBtn = el('button', {
        class: 'host-manager-group-delete', type: 'button',
        title: deleteLabel, 'aria-label': deleteLabel, html: ICONS.trash
      });
      deleteBtn.disabled = groups.length <= 1;
      tab.addEventListener('click', function () { selectHostManagerGroup(group.id); });
      tab.addEventListener('keydown', function (event) {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') { return; }
        event.preventDefault();
        var offset = event.key === 'ArrowRight' ? 1 : -1;
        var next = groups[(index + offset + groups.length) % groups.length];
        selectHostManagerGroup(next.id, true);
      });
      deleteBtn.addEventListener('click', function () {
        removeGroup(group.id);
        focusHostManagerGroup();
      });
      hostManagerGroups.appendChild(el('div', {
        class: 'host-manager-group-item' + (active ? ' is-active' : '')
      }, [tab, deleteBtn]));
    });
  }

  function selectHostManagerGroup(groupId, focus) {
    if (!groupById(groupId)) { return; }
    hostManagerGroupId = groupId;
    groupSelect.value = groupId;
    renderHostManagerGroups();
    renderHostManagerTerminals();
    if (focus) { focusHostManagerGroup(); }
  }

  function focusHostManagerGroup() {
    var tab = hostManagerGroups.querySelector('.host-manager-group-tab[aria-pressed="true"]');
    if (tab) {
      tab.focus();
      tab.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  }

  function openConnectionDialog() {
    if (!closeUploadDialog(false)) { return; }
    connectionPreviousFocus = modalReturnFocus(sidebarRail);
    closeReauthentication(false);
    closeHostManager(false);
    closeSystemSettings(false);
    logOverlay.classList.remove('is-open');
    connectionDialogBody.appendChild(connectForm);
    connectionOverlay.classList.add('is-open');
    connectionOverlay.setAttribute('aria-hidden', 'false');
    window.setTimeout(function () { $('#hostname').focus(); }, 0);
  }

  function closeConnectionDialog(restoreFocus) {
    if (!connectionOverlay.classList.contains('is-open')) { return; }
    connectionOverlay.classList.remove('is-open');
    connectionOverlay.setAttribute('aria-hidden', 'true');
    connectFormHome.insertBefore(connectForm, connectFormNextSibling);
    if (restoreFocus !== false && connectionPreviousFocus && document.contains(connectionPreviousFocus)) {
      connectionPreviousFocus.focus();
    }
    connectionPreviousFocus = null;
  }

  function openHostManager() {
    if (!closeUploadDialog(false)) { return; }
    hostManagerPreviousFocus = modalReturnFocus(openHostManagerButton);
    closeReauthentication(false);
    closeConnectionDialog(false);
    closeSystemSettings(false);
    logOverlay.classList.remove('is-open');
    if (groupById(groupSelect.value)) { hostManagerGroupId = groupSelect.value; }
    hostManagerOverlay.classList.add('is-open');
    hostManagerOverlay.setAttribute('aria-hidden', 'false');
    renderHostManagerGroups();
    renderHostManagerTerminals();
    window.setTimeout(focusHostManagerGroup, 0);
  }

  function closeHostManager(restoreFocus) {
    if (!hostManagerOverlay.classList.contains('is-open')) { return; }
    hostManagerOverlay.classList.remove('is-open');
    hostManagerOverlay.setAttribute('aria-hidden', 'true');
    if (restoreFocus !== false && hostManagerPreviousFocus && document.contains(hostManagerPreviousFocus)) {
      hostManagerPreviousFocus.focus();
    }
    hostManagerPreviousFocus = null;
  }

  function modalReturnFocus(fallback) {
    var active = document.activeElement;
    if (!active || connectionOverlay.contains(active) || hostManagerOverlay.contains(active) || systemSettingsOverlay.contains(active) ||
        reauthOverlay.contains(active) || fileUploadOverlay.contains(active) || logOverlay.contains(active)) {
      return fallback;
    }
    return active;
  }

  function openSystemSettings() {
    if (!closeUploadDialog(false)) { return; }
    systemSettingsPreviousFocus = modalReturnFocus(openSystemSettingsButton);
    closeReauthentication(false);
    closeConnectionDialog(false);
    closeHostManager(false);
    logOverlay.classList.remove('is-open');
    renderShortcutSettings();
    systemSettingsOverlay.classList.add('is-open');
    systemSettingsOverlay.setAttribute('aria-hidden', 'false');
    window.setTimeout(function () { confirmDisconnectInput.focus(); }, 0);
  }

  function closeSystemSettings(restoreFocus) {
    if (!systemSettingsOverlay.classList.contains('is-open')) { return; }
    systemSettingsOverlay.classList.remove('is-open');
    systemSettingsOverlay.setAttribute('aria-hidden', 'true');
    if (restoreFocus !== false && systemSettingsPreviousFocus && document.contains(systemSettingsPreviousFocus)) {
      systemSettingsPreviousFocus.focus();
    }
    systemSettingsPreviousFocus = null;
  }

  function trapModalFocus(overlay, event) {
    var focusable = Array.prototype.slice.call(overlay.querySelectorAll(
      'button:not([disabled]), select:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )).filter(function (node) { return node.tabIndex >= 0; });
    if (!focusable.length) { return; }
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
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

  function selectedBroadcastTerminals(groupId) {
    return terminalsInGroup(groupId).filter(function (record) { return record.broadcastSelected; });
  }

  function broadcastRecipients(groupId) {
    var group = groupById(groupId);
    return group && group.broadcastSelectedOnly ?
      selectedBroadcastTerminals(groupId) : terminalsInGroup(groupId);
  }

  function refreshGroupBroadcastScope(groupId) {
    var group = groupById(groupId);
    var column = board.querySelector('.group[data-group="' + groupId + '"]');
    if (!group || !column) { return; }
    var control = column.querySelector('.broadcast-scope-widget');
    if (!control) { return; }
    var selectedOnly = !!group.broadcastSelectedOnly;
    var label = t(selectedOnly ? 'broadcastScopeSelectedLabel' : 'broadcastScopeAllLabel');
    var allButton = control.querySelector('.broadcast-scope-all');
    var selectedButton = control.querySelector('.broadcast-scope-selected');
    control.setAttribute('title', label);
    control.setAttribute('aria-label', t('toggleBroadcastScope'));
    if (allButton) {
      allButton.classList.toggle('is-active', !selectedOnly);
      allButton.setAttribute('aria-pressed', selectedOnly ? 'false' : 'true');
      allButton.textContent = t('broadcastScopeAll');
    }
    if (selectedButton) {
      selectedButton.classList.toggle('is-active', selectedOnly);
      selectedButton.setAttribute('aria-pressed', selectedOnly ? 'true' : 'false');
      selectedButton.textContent = t('broadcastScopeSelected');
    }
  }

  function setGroupBroadcastScope(group, selectedOnly) {
    if (!group || group.broadcastSelectedOnly === !!selectedOnly) { return; }
    group.broadcastSelectedOnly = !!selectedOnly;
    refreshGroupBroadcastScope(group.id);
    refreshBroadcastSelection(group.id);
    saveGroups();
    var message = t(group.broadcastSelectedOnly ? 'broadcastScopeSelectedToast' : 'broadcastScopeAllToast', {
      name: group.name
    });
    setStatus(message);
    toast(message);
  }

  function refreshBroadcastSelection(groupId) {
    var group = groupById(groupId);
    var column = board.querySelector('.group[data-group="' + groupId + '"]');
    if (!group || !column) { return; }
    var selected = selectedBroadcastTerminals(groupId).length;
    var total = countInGroup(groupId);
    var selectedOnly = !!group.broadcastSelectedOnly;
    var meta = column.querySelector('.group-meta');
    var input = column.querySelector('.broadcast textarea');
    if (meta) {
      meta.textContent = selected ? t('broadcastSelectionSummary', {
        total: terminalCountText(total), selected: terminalCountText(selected)
      }) : terminalCountText(total);
    }
    if (input) {
      input.setAttribute('placeholder', group.lineSend ? t('lineSendPlaceholder') : (selectedOnly ? (selected ?
        t('broadcastSelectedPlaceholder', { count: terminalCountText(selected) }) :
        t('broadcastSelectedEmptyPlaceholder')) : t('broadcastPlaceholder')));
      input.setAttribute('aria-label', selectedOnly ? t('broadcastSelectedLabel', {
        name: group.name, count: terminalCountText(selected)
      }) : t('broadcastLabel', { name: group.name }));
    }
    refreshGroupBroadcastScope(groupId);
  }

  function refreshTerminalBroadcastSelection(record) {
    var button = record.card.querySelector('.broadcast-select-terminal');
    if (!button) { return; }
    var selected = !!record.broadcastSelected;
    var label = t(selected ? 'unselectForBroadcast' : 'selectForBroadcast', {
      name: record.displayName || record.hostname
    });
    record.card.classList.toggle('is-broadcast-selected', selected);
    button.classList.toggle('is-active', selected);
    button.setAttribute('aria-pressed', selected ? 'true' : 'false');
    button.setAttribute('title', label);
    button.setAttribute('aria-label', label);
    button.innerHTML = selected ? ICONS.selectActive : ICONS.select;
  }

  function setTerminalBroadcastSelected(record, selected) {
    var changed = record.broadcastSelected !== !!selected;
    record.broadcastSelected = !!selected;
    refreshTerminalBroadcastSelection(record);
    refreshBroadcastSelection(record.group);
    if (changed) { saveSessions(); }
  }

  // ---- Rendering ---------------------------------------------------------
  function refreshGroupSelect() {
    var current = groupSelect.value;
    var managerCurrent = hostManagerGroupId || current;
    groupSelect.innerHTML = '';
    groups.forEach(function (group) {
      groupSelect.appendChild(el('option', { value: group.id, text: group.name }));
    });
    if (groupById(current)) {
      groupSelect.value = current;
    } else if (groups[0]) {
      groupSelect.value = groups[0].id;
    }
    if (groupById(managerCurrent)) {
      hostManagerGroupId = managerCurrent;
    } else {
      hostManagerGroupId = groupSelect.value;
    }
    renderHostManagerGroups();
    renderHostManagerTerminals();
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
    var index = groups.findIndex(function (group) { return group.id === groupId; });
    var cols = column.dataset.manualSize === 'true'
      ? Number(column.dataset.colSpan) || defaultGroupColSpan()
      : defaultGroupColSpanForIndex(Math.max(0, index), groups.length);
    var rows = defaultGroupRowSpanForIndex(Math.max(0, index), groups.length);
    setGroupGridSpan(column, cols, rows);
  }

  function defaultGroupColSpan() {
    return 1;
  }

  function defaultGroupColSpanForIndex(index, total) {
    var count = Math.max(1, total || 1);
    return count === 1 ? 2 : 1;
  }

  function defaultGroupRowSpanForIndex(index, total) {
    var count = Math.max(1, total || 1);
    if (count <= 2) { return 2; }
    return index % 3 === 0 ? 2 : 1;
  }

  function ensureGroupFitsTerminal(groupId) {
    var column = board.querySelector('.group[data-group="' + groupId + '"]');
    if (!column || column.dataset.manualSize === 'true') { return; }
    var groupIndex = groups.findIndex(function (group) { return group.id === groupId; });
    var cols = defaultGroupColSpanForIndex(Math.max(0, groupIndex), groups.length);
    var rows = defaultGroupRowSpanForIndex(Math.max(0, groupIndex), groups.length);
    setGroupGridSpan(column, cols, rows);
  }

  function boardGridMetrics() {
    var styles = window.getComputedStyle(board);
    var colSize = parseFloat(styles.gridAutoColumns) || Math.max(1, board.clientWidth / 2);
    return {
      colSize: colSize,
      columnGap: parseFloat(styles.columnGap) || 0
    };
  }

  function setGroupGridSpan(column, cols, rows) {
    var nextCols = Math.max(1, Math.min(2, Math.round(cols)));
    var nextRows = Math.max(1, Math.min(2, Math.round(rows || 1)));
    column.dataset.colSpan = String(nextCols);
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
      var rows = defaultGroupRowSpanForIndex(index, groups.length);
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
      refreshBroadcastSelection(group.id);
      updateEmptyState(group.id);
    });
    if (hostManagerOverlay.classList.contains('is-open')) { renderHostManagerTerminals(); }
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
      var btn = column.querySelector('.group-fullscreen-btn');
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

  function updateGroupPinButton(group, button) {
    var pinned = !!group.pinned;
    button.classList.toggle('is-active', pinned);
    button.setAttribute('aria-pressed', pinned ? 'true' : 'false');
    button.setAttribute('title', t(pinned ? 'unpinGroup' : 'pinGroup'));
    button.setAttribute('aria-label', t(pinned ? 'unpinGroup' : 'pinGroup'));
    button.innerHTML = pinned ? ICONS.pinActive : ICONS.pin;
  }

  function toggleGroupPinned(group, button) {
    group.pinned = !group.pinned;
    group.pinnedSessions = group.pinned ? terminalsInGroup(group.id)
      .map(pinnedSessionFromRecord).filter(Boolean) : [];
    updateGroupPinButton(group, button);
    saveGroups();
    if (group.pinned) {
      toast(t('groupPinned', {
        name: group.name,
        count: terminalCountText(group.pinnedSessions.length)
      }), 'success');
    } else {
      toast(t('groupUnpinned', { name: group.name }));
    }
  }

  function reconnectFailedGroup(group) {
    var failed = terminalsInGroup(group.id).filter(function (record) {
      if (record.state !== 'error' || record.stateKey === 'authenticationRequired') { return false; }
      return record.isLocal || !!record.reconnectData || !!record.autoReconnect;
    });
    if (!failed.length) {
      toast(t('noRetryableGroupTerminals', { name: group.name }));
      return;
    }
    var sshBatch = [];
    failed.forEach(function (record) {
      reconnectTerminal(record, false, true, sshBatch);
    });
    if (sshBatch.length) { reconnectSshTerminalBatch(sshBatch); }
    var count = terminalCountText(failed.length);
    var message = t('reconnectingFailedGroup', { name: group.name, count: count });
    setStatus(message);
    toast(message);
    logAction('logReconnectFailedGroup', { name: group.name, count: count });
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
    var pinBtn = el('button', {
      class: 'pin-group' + (group.pinned ? ' is-active' : ''),
      type: 'button', 'aria-pressed': group.pinned ? 'true' : 'false',
      title: t(group.pinned ? 'unpinGroup' : 'pinGroup'),
      'aria-label': t(group.pinned ? 'unpinGroup' : 'pinGroup'),
      html: group.pinned ? ICONS.pinActive : ICONS.pin
    });
    var broadcastScopeAllBtn = el('button', {
      class: 'broadcast-scope-option broadcast-scope-all' + (group.broadcastSelectedOnly ? '' : ' is-active'),
      type: 'button', 'aria-pressed': group.broadcastSelectedOnly ? 'false' : 'true',
      text: t('broadcastScopeAll')
    });
    var broadcastScopeSelectedBtn = el('button', {
      class: 'broadcast-scope-option broadcast-scope-selected' + (group.broadcastSelectedOnly ? ' is-active' : ''),
      type: 'button', 'aria-pressed': group.broadcastSelectedOnly ? 'true' : 'false',
      text: t('broadcastScopeSelected')
    });
    var broadcastScopeControl = el('div', {
      class: 'broadcast-scope-toggle broadcast-scope-widget', role: 'group',
      title: t(group.broadcastSelectedOnly ? 'broadcastScopeSelectedLabel' : 'broadcastScopeAllLabel'),
      'aria-label': t('toggleBroadcastScope')
    }, [broadcastScopeAllBtn, broadcastScopeSelectedBtn]);
    var lineOnceBtn = el('button', {
      class: 'broadcast-scope-option line-send-once' + (group.lineSend ? '' : ' is-active'),
      type: 'button', 'aria-pressed': group.lineSend ? 'false' : 'true',
      text: t('lineSendOnce')
    });
    var lineLinesBtn = el('button', {
      class: 'broadcast-scope-option line-send-lines' + (group.lineSend ? ' is-active' : ''),
      type: 'button', 'aria-pressed': group.lineSend ? 'true' : 'false',
      text: t('lineSendLines')
    });
    var lineSendModeToggle = el('div', {
      class: 'broadcast-scope-toggle line-send-toggle', role: 'group',
      title: t('lineSendMode'), 'aria-label': t('lineSendMode')
    }, [lineOnceBtn, lineLinesBtn]);
    var reconnectFailedBtn = el('button', {
      class: 'group-reconnect-failed', type: 'button',
      title: t('reconnectFailedGroup'), 'aria-label': t('reconnectFailedGroup'), html: ICONS.reconnect
    });
    var fullscreenBtn = el('button', {
      class: 'group-fullscreen-btn',
      type: 'button', title: t('groupFullscreen'),
      'aria-label': t('groupFullscreen'), html: ICONS.maximize
    });
    pinBtn.addEventListener('click', function () { toggleGroupPinned(group, pinBtn); });
    broadcastScopeAllBtn.addEventListener('click', function () { setGroupBroadcastScope(group, false); });
    broadcastScopeSelectedBtn.addEventListener('click', function () { setGroupBroadcastScope(group, true); });
    reconnectFailedBtn.addEventListener('click', function () { reconnectFailedGroup(group); });
    fullscreenBtn.addEventListener('click', function () { toggleGroupFullscreen(group.id, fullscreenBtn); });
    deleteBtn.addEventListener('click', function () { removeGroup(group.id); });

    var head = el('div', { class: 'group-head' }, [
      grip, title,
      el('div', { class: 'group-tools' }, [broadcastScopeControl, lineSendModeToggle, pinBtn, reconnectFailedBtn, fullscreenBtn, deleteBtn])
    ]);

    // Broadcast bar.
    var historyListId = 'broadcast-history-' + group.id;
    var input = el('textarea', {
      rows: '1', wrap: 'off', autocomplete: 'off', spellcheck: 'false',
      placeholder: t('broadcastPlaceholder'),
      role: 'combobox', 'aria-autocomplete': 'list', 'aria-haspopup': 'listbox',
      'aria-controls': historyListId, 'aria-expanded': 'false',
      'aria-label': t('broadcastLabel', { name: group.name })
    });
    var historyList = el('div', {
      class: 'broadcast-history', id: historyListId, role: 'listbox',
      'aria-label': t('broadcastHistory'), hidden: true
    });
    var inputWrap = el('div', { class: 'broadcast-input-wrap' }, [input, historyList]);
    var candidateItems = [];
    var candidateIndex = -1;
    var historyDraft = '';
    var shellHistoryMode = false;

    function resizeBroadcastInput() {
      input.style.height = 'auto';
      var scrollHeight = input.scrollHeight;
      input.style.height = Math.max(40, Math.min(106, scrollHeight)) + 'px';
      input.style.overflowY = scrollHeight > 106 ? 'auto' : 'hidden';
    }

    function closeCandidatesOnScroll(event) {
      if (historyList.contains(event.target)) { return; }
      closeCandidates(false);
    }

    function closeCandidatesOnResize() {
      closeCandidates(false);
    }

    function positionCandidates() {
      var rect = input.getBoundingClientRect();
      var width = Math.min(rect.width, window.innerWidth - 16);
      var left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
      var available = shellHistoryMode ? rect.top - 12 : window.innerHeight - rect.bottom - 12;
      var popupHeight = Math.max(72, Math.min(240, available));
      historyList.style.left = left + 'px';
      historyList.style.width = width + 'px';
      historyList.style.maxHeight = popupHeight + 'px';
      historyList.style.height = shellHistoryMode ? popupHeight + 'px' : 'auto';
      if (shellHistoryMode) {
        historyList.style.top = 'auto';
        historyList.style.bottom = (window.innerHeight - rect.top + 6) + 'px';
      } else {
        historyList.style.top = (rect.bottom + 6) + 'px';
        historyList.style.bottom = 'auto';
      }
    }

    function closeCandidates(restoreDraft) {
      if (restoreDraft) {
        input.value = historyDraft;
        resizeBroadcastInput();
      }
      window.removeEventListener('resize', closeCandidatesOnResize);
      window.removeEventListener('scroll', closeCandidatesOnScroll, true);
      historyList.hidden = true;
      historyList.innerHTML = '';
      historyList.classList.remove('is-portal', 'is-history-mode');
      historyList.removeAttribute('style');
      inputWrap.appendChild(historyList);
      candidateItems = [];
      candidateIndex = -1;
      shellHistoryMode = false;
      input.setAttribute('aria-expanded', 'false');
      input.removeAttribute('aria-activedescendant');
    }

    function selectCandidate(index) {
      candidateIndex = index;
      input.value = candidateItems[index].command;
      resizeBroadcastInput();
      var options = historyList.querySelectorAll('[role="option"]');
      options.forEach(function (option, optionIndex) {
        var active = optionIndex === index;
        option.classList.toggle('is-active', active);
        option.setAttribute('aria-selected', active ? 'true' : 'false');
        if (active) {
          input.setAttribute('aria-activedescendant', option.id);
          if (shellHistoryMode) {
            historyList.scrollTop = Math.max(0,
              option.offsetTop + option.offsetHeight - historyList.clientHeight + 4);
          } else {
            option.scrollIntoView({ block: 'nearest' });
          }
        }
      });
    }

    function acceptCandidate(index) {
      input.value = candidateItems[index].command;
      resizeBroadcastInput();
      historyDraft = input.value;
      closeCandidates(false);
      input.focus();
    }

    function renderCandidates(query, force, includeCommon, historyMode) {
      candidateItems = broadcastCommandCandidates(group.id, query, includeCommon);
      candidateIndex = -1;
      shellHistoryMode = !!historyMode;
      if (shellHistoryMode) { candidateItems.reverse(); }
      historyList.innerHTML = '';
      input.removeAttribute('aria-activedescendant');
      if (!candidateItems.length || (!force && !String(query || '').trim())) {
        closeCandidates(false);
        return;
      }
      var historySpacer = null;
      if (shellHistoryMode) {
        historySpacer = el('div', {
          class: 'broadcast-history-spacer', role: 'presentation', 'aria-hidden': 'true'
        });
        historyList.appendChild(historySpacer);
      }
      candidateItems.forEach(function (candidate, index) {
        var option = el('button', {
          class: 'broadcast-history-option', id: historyListId + '-option-' + index,
          type: 'button', role: 'option', tabindex: '-1', 'aria-selected': 'false'
        }, [
          el('span', { class: 'broadcast-history-command', text: candidate.command }),
          el('span', {
            class: 'broadcast-history-source',
            text: t(candidate.source === 'history' ? 'historyCandidate' : 'commonCandidate')
          })
        ]);
        option.addEventListener('pointerdown', function (event) { event.preventDefault(); });
        option.addEventListener('click', function () { acceptCandidate(index); });
        historyList.appendChild(option);
      });
      historyList.classList.add('is-portal');
      historyList.classList.toggle('is-history-mode', shellHistoryMode);
      document.body.appendChild(historyList);
      historyList.hidden = false;
      positionCandidates();
      if (historySpacer) {
        var firstOption = historyList.querySelector('[role="option"]');
        historySpacer.style.height = Math.max(0,
          historyList.clientHeight - firstOption.offsetHeight - 8) + 'px';
      }
      input.setAttribute('aria-expanded', 'true');
      window.addEventListener('resize', closeCandidatesOnResize);
      window.addEventListener('scroll', closeCandidatesOnScroll, true);
    }

    function openHistoryCandidates() {
      renderCandidates(historyDraft, true, false, true);
      if (!candidateItems.length && historyDraft.trim()) {
        renderCandidates('', true, false, true);
      }
      if (candidateItems.length) {
        selectCandidate(candidateItems.length - 1);
      } else {
        closeCandidates(true);
      }
    }

    function openLowerCandidates() {
      renderCandidates(historyDraft, true, true, false);
      if (candidateItems.length) {
        selectCandidate(0);
      } else {
        closeCandidates(true);
      }
    }

    input.addEventListener('input', function () {
      historyDraft = input.value;
      resizeBroadcastInput();
      renderCandidates(input.value, false, true, false);
    });
    input.addEventListener('keydown', function (event) {
      if (event.isComposing || event.altKey || event.ctrlKey || event.metaKey) { return; }
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendBtn.click();
      } else if (event.shiftKey) {
        return;
      } else if (input.value.indexOf('\n') !== -1 && historyList.hidden &&
          (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
        return;
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        if (historyList.hidden) {
          historyDraft = input.value;
          openHistoryCandidates();
        } else if (candidateItems.length && shellHistoryMode) {
          selectCandidate(Math.max(0, candidateIndex - 1));
        } else if (candidateItems.length && candidateIndex > 0) {
          selectCandidate(candidateIndex - 1);
        } else {
          closeCandidates(true);
        }
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        if (historyList.hidden) {
          historyDraft = input.value;
          openLowerCandidates();
        } else if (shellHistoryMode && candidateIndex < candidateItems.length - 1) {
          selectCandidate(candidateIndex + 1);
        } else if (shellHistoryMode && candidateIndex === candidateItems.length - 1) {
          closeCandidates(true);
        } else if (candidateItems.length) {
          selectCandidate(Math.min(candidateItems.length - 1, candidateIndex + 1));
        }
      } else if (event.key === 'Tab' && input.value.trim()) {
        if (historyList.hidden) {
          renderCandidates(input.value, true, true, false);
        }
        if (candidateItems.length) {
          var completionIndex = candidateIndex >= 0 ? candidateIndex : 0;
          if (candidateItems[completionIndex].command !== input.value) {
            event.preventDefault();
            acceptCandidate(completionIndex);
          } else {
            closeCandidates(false);
          }
        }
      } else if (event.key === 'Escape' && !historyList.hidden) {
        event.preventDefault();
        closeCandidates(true);
      } else if (event.key === 'Escape' && lineRun && lineRun.groupId === group.id) {
        event.preventDefault();
        lineRunStop(group.id);
      }
    });
    input.addEventListener('blur', function () { closeCandidates(false); });
    var shortcutSelect = el('select', { class: 'broadcast-shortcut', 'aria-label': t('broadcastShortcut'), title: t('broadcastShortcut') });
    var intervalInput = el('input', {
      class: 'line-send-interval', type: 'number', min: '0', max: '10000', step: '100',
      value: String(group.lineSendInterval || 500),
      'aria-label': t('lineSendInterval'), title: t('lineSendInterval')
    });
    var intervalWrap = el('label', { class: 'line-send-interval-wrap' }, [
      intervalInput, el('span', { class: 'line-send-unit', text: 'ms' })
    ]);
    var uploadBtn = el('button', {
      class: 'btn btn-icon broadcast-upload', type: 'button',
      title: t('uploadToGroup'), 'aria-label': t('uploadToGroup'), html: ICONS.upload
    });
    var downloadBtn = el('button', {
      class: 'btn btn-icon broadcast-download', type: 'button',
      title: t('downloadLogs'), 'aria-label': t('downloadLogs'), html: ICONS.download
    });
    var sendLabel = el('span', { text: t('send') });
    var sendBtn = el('button', {
      class: 'btn btn-accent btn-sm broadcast-send', type: 'submit', html: ICONS.send
    }, [sendLabel]);
    var broadcastForm = el('form', { class: 'broadcast' }, [
      inputWrap, shortcutSelect, intervalWrap, downloadBtn, uploadBtn, sendBtn
    ]);
    broadcastForm.addEventListener('submit', function (event) {
      event.preventDefault();
      if (lineRun) {
        if (lineRun.groupId === group.id) { lineRunStop(group.id); }
        else { toast(t('lineSendBusy', { name: lineRun.name }), 'error'); }
        return;
      }
      var value = input.value;
      if (group.lineSend) {
        closeCandidates(false);
        if (lineRunStart(group.id, value)) {
          if (value.trim()) { rememberBroadcastCommand(group.id, value); }
        }
        return;
      }
      var hasCommand = !!value.trim();
      if (broadcastToGroup(group.id, hasCommand ? value : 'enter', broadcastRecipients(group.id)) === null) { return; }
      if (hasCommand) { rememberBroadcastCommand(group.id, value); }
      closeCandidates(false);
      input.value = '';
      resizeBroadcastInput();
      historyDraft = '';
      input.focus();
    });
    shortcutSelect.addEventListener('change', function () {
      if (!shortcutSelect.value) { return; }
      if (group.lineSend) {
        group.lineSendMode = shortcutSelect.value === 'prompt' ? 'prompt' : 'interval';
        saveGroups();
        refreshLineSendControls(group);
      } else {
        broadcastToGroup(group.id, shortcutSelect.value, broadcastRecipients(group.id));
        shortcutSelect.value = '';
      }
    });
    lineOnceBtn.addEventListener('click', function () { setGroupLineSend(group, false); });
    lineLinesBtn.addEventListener('click', function () { setGroupLineSend(group, true); });
    intervalInput.addEventListener('change', function () {
      var ms = Math.min(10000, Math.max(0, Number(intervalInput.value) || 0));
      group.lineSendInterval = ms;
      intervalInput.value = String(ms);
      saveGroups();
    });
    uploadBtn.addEventListener('click', function () {
      var records = broadcastRecipients(group.id);
      if (group.broadcastSelectedOnly && !records.length) {
        toast(t('noSelectedUploadTargets', { name: group.name }), 'error');
        return;
      }
      chooseUploadFile(records, uploadBtn);
    });
    downloadBtn.addEventListener('click', function () { downloadTerminalLogs(group.id); });

    var list = el('div', { class: 'terminal-list', dataset: { list: group.id } });

    var groupResizeHandle = el('div', {
      class: 'group-resize-handle',
      title: t('resize'),
      'aria-hidden': 'true'
    });

    broadcastEditors[group.id] = {
      input: input,
      sendBtn: sendBtn,
      sendLabel: sendLabel,
      uploadBtn: uploadBtn,
      downloadBtn: downloadBtn,
      shortcutSelect: shortcutSelect,
      lineSendModeToggle: lineSendModeToggle,
      lineOnceBtn: lineOnceBtn,
      lineLinesBtn: lineLinesBtn,
      intervalInput: intervalInput,
      form: broadcastForm,
      resize: resizeBroadcastInput,
      clearDraft: function () { historyDraft = ''; }
    };
    refreshLineSendControls(group);

    var column = el('section', { class: 'group', dataset: { group: group.id }, 'aria-label': group.name }, [
      head, broadcastForm, list, groupResizeHandle
    ]);
    setGroupGridSpan(column, group.colSpan || defaultGroupColSpan(), group.rowSpan || 1);
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
      refreshBroadcastSelection(group.id);
      if (oldName !== value) {
        logAction('logRenameGroup', { oldName: oldName, newName: value });
      }
      saveGroups();
      saveSessions();
    });

    grip.addEventListener('pointerdown', function (event) { startColumnDrag(event, group.id); });
    startGroupResize(groupResizeHandle, group.id);

    board.appendChild(column);
    applyShortcutBindings();
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
      manualSize: !!opts.manualSize,
      pinned: !!opts.pinned,
      broadcastSelectedOnly: !!opts.broadcastSelectedOnly,
      lineSend: !!opts.lineSend,
      lineSendMode: opts.lineSendMode === 'prompt' ? 'prompt' : 'interval',
      lineSendInterval: Math.min(10000, Math.max(0, Number(opts.lineSendInterval) || 500)),
      pinnedSessions: (opts.pinnedSessions || []).map(safePinnedSession).filter(Boolean)
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
    if (lineRun && lineRun.groupId === groupId) { lineRunStop(groupId); }
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
    removeBroadcastHistory(groupId);
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

    var selectBroadcastBtn = el('button', {
      class: 'broadcast-select-terminal', type: 'button', 'aria-pressed': 'false',
      title: t('selectForBroadcast', { name: displayName }),
      'aria-label': t('selectForBroadcast', { name: displayName }), html: ICONS.select
    });
    var uploadBtn = el('button', { class: 'upload-terminal', type: 'button', title: t('uploadFile'), 'aria-label': t('uploadFile'), html: ICONS.plus });
    uploadBtn.disabled = true;
    var reconnectBtn = el('button', { class: 'reconnect-terminal', type: 'button', title: t('reconnectTerminal'), 'aria-label': t('reconnectTerminal'), html: ICONS.reconnect });
    var maxBtn = el('button', { class: 'maximize-terminal', type: 'button', title: t('maximize'), 'aria-label': t('maximize'), html: ICONS.maximize });
    var closeBtn = el('button', { class: 'close-btn', type: 'button', title: t('close'), 'aria-label': t('closeTerminal'), html: ICONS.close });
    var tools = el('div', { class: 'terminal-tools' }, [selectBroadcastBtn, uploadBtn, reconnectBtn, maxBtn, closeBtn]);

    var header = el('div', {
      class: 'terminal-header', tabindex: '0', role: 'button',
      'aria-label': t('dragTerminal', { name: opts.hostname })
    }, [identity, tools]);

    var bodyInner = el('div', { class: 'terminal-placeholder', text: t('establishing') });
    var body = el('div', { class: 'terminal-body', id: id + '-body' }, [bodyInner]);
    body.style.height = opts.bodyHeight || (settings.terminalHeight + 'px');
    body.style.setProperty('--terminal-bottom-space', (settings.terminalFontSize / 2) + 'px');
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
      workerId: opts.workerId || null, isLocal: !!opts.isLocal,
      currentDirectory: opts.currentDirectory || '', osc7Buffer: '', logBuffer: '',
      persistentId: opts.persistentId || newPersistentSessionId(),
      autoReconnect: !!opts.autoReconnect || !!opts.isLocal,
      broadcastSelected: !!opts.broadcastSelected,
      retryConnection: null, socketRetrying: false, socketTimer: null
    };
    terminals[id] = record;
    refreshTerminalBroadcastSelection(record);

    // Interactions.
    header.addEventListener('pointerdown', function (event) { startCardDrag(event, id); });
    header.addEventListener('keydown', function (event) {
      if (event.target.closest('button')) { return; }
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); }
    });
    closeBtn.addEventListener('click', function () { closeTerminal(id, t('userClosed')); });
    selectBroadcastBtn.addEventListener('click', function () {
      setTerminalBroadcastSelected(record, !record.broadcastSelected);
    });
    uploadBtn.addEventListener('click', function () { chooseUploadFile([record], uploadBtn); });
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
      refreshTerminalBroadcastSelection(record);
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
    var uploadButton = record.card.querySelector('.upload-terminal');
    if (uploadButton) { uploadButton.disabled = state !== 'connected'; }
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

  function renderAuthenticationRequired(record) {
    resetTerminalView(record, t('authenticationRequired'));
    var placeholder = record.body.querySelector('.terminal-placeholder');
    placeholder.innerHTML = '';
    placeholder.appendChild(el('span', { text: t('authenticationRequired') }));
    var button = el('button', {
      class: 'btn btn-primary btn-sm', type: 'button', text: t('reauthenticate')
    });
    button.addEventListener('click', function () { beginReauthentication(record); });
    placeholder.appendChild(button);
  }

  function closeTerminal(id, reason) {
    var record = terminals[id];
    if (!record) { return; }
    record.retryConnection = null;
    record.socketRetrying = false;
    if (record.socketTimer) {
      window.clearTimeout(record.socketTimer);
      record.socketTimer = null;
    }
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
    if (pendingAuthenticationRecord === record) { closeReauthentication(false); }
    record.card.remove();
    delete terminals[id];
    refreshBroadcastSelection(group);
    if (record.workerId) { removeSavedSession(record.workerId); }
    if (syncPinnedSessionSnapshots()) { saveGroups(); }
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

  function beginReauthentication(record) {
    if (!closeUploadDialog(false)) { return; }
    var info = record.reconnectInfo || {};
    reauthPreviousFocus = modalReturnFocus(record.card.querySelector('.reconnect-terminal'));
    pendingAuthenticationRecord = record;
    closeConnectionDialog(false);
    closeHostManager(false);
    closeSystemSettings(false);
    logOverlay.classList.remove('is-open');
    reauthForm.reset();
    reauthPrivateKeyName.textContent = t('noFileChosen');
    reauthTargetName.textContent = record.displayName || record.hostname;
    var group = groupById(record.group);
    reauthTargetMeta.textContent = (info.username || record.username) + '@' +
      (info.hostname || record.hostname) + ':' + (info.port || record.port || '22') +
      (group ? ' · ' + group.name : '');
    reauthOverlay.classList.add('is-open');
    reauthOverlay.setAttribute('aria-hidden', 'false');
    var message = t('reauthenticationReady', { name: record.displayName || record.hostname });
    setStatus(message);
    window.setTimeout(function () { reauthPasswordInput.focus(); }, 0);
  }

  function closeReauthentication(restoreFocus) {
    if (!reauthOverlay.classList.contains('is-open')) { return; }
    reauthOverlay.classList.remove('is-open');
    reauthOverlay.setAttribute('aria-hidden', 'true');
    pendingAuthenticationRecord = null;
    reauthForm.reset();
    reauthPrivateKeyName.textContent = t('noFileChosen');
    if (restoreFocus !== false && reauthPreviousFocus && document.contains(reauthPreviousFocus)) {
      reauthPreviousFocus.focus();
    }
    reauthPreviousFocus = null;
  }

  function reconnectTerminal(record, credentialsReady, quiet, batchEntries) {
    if (!record || record.state === 'connecting') { return; }
    if (!credentialsReady && (record.stateKey === 'authenticationRequired' || pendingAuthenticationRecord === record)) {
      beginReauthentication(record);
      return;
    }
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
    record.currentDirectory = '';
    record.osc7Buffer = '';
    setCardState(record, 'connecting', null, 'connecting');
    resetTerminalView(record, t('establishing'));
    if (!quiet) { toast(t('reconnectingTerminal', { name: record.displayName || record.hostname })); }
    if (info.type === 'local') {
      reconnectLocalTerminal(record);
    } else if (batchEntries) {
      var automatic = record.autoReconnect && !record.reconnectData;
      batchEntries.push({
        record: record,
        info: info,
        data: reconnectSshFormData(record, info, automatic)
      });
    } else {
      reconnectSshTerminal(record, info, record.autoReconnect && !record.reconnectData);
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
      record.autoReconnect = true;
      openSocket(record, msg.id, 'utf-8');
      saveSessions();
    }).catch(function () {
      setCardState(record, 'error', t('localTerminalFailed'));
    });
  }

  function reconnectSshFormData(record, info, automatic) {
    var data;
    if (automatic) {
      data = new window.FormData();
      data.set('_xsrf', xsrfToken());
      data.set('term', 'xterm-256color');
    } else {
      data = record.reconnectData ? cloneFormData(record.reconnectData) : new window.FormData(connectForm);
    }
    data.set('hostname', info.hostname || record.hostname);
    data.set('username', info.username || record.username);
    data.set('port', info.port || record.port || '22');
    data.set('target_group', record.group);
    data.set('ssh_config_host', info.sshConfigHost || '');
    cleanData(data);
    return data;
  }

  function reconnectSshTerminal(record, info, automatic) {
    var reauthenticating = !automatic && pendingAuthenticationRecord === record;
    var data = reconnectSshFormData(record, info, automatic);
    if (reauthenticating) { submitReauthButton.disabled = true; }
    var xhr = new window.XMLHttpRequest();
    xhr.open('POST', '', true);
    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) { return; }
      if (reauthenticating) { submitReauthButton.disabled = false; }
      if (xhr.status !== 200) {
        var requestError = xhr.status + ': ' + xhr.statusText;
        if (reauthenticating) {
          setCardState(record, 'error', null, 'authenticationRequired');
          renderAuthenticationRequired(record);
          toast(requestError, 'error');
        } else {
          setCardState(record, 'error', requestError);
        }
        return;
      }
      var msg;
      try { msg = JSON.parse(xhr.responseText); } catch (e) { msg = null; }
      if (!msg || !msg.id) {
        var connectionError = (msg && msg.status) || t('connectionFailed');
        if (reauthenticating) {
          setCardState(record, 'error', null, 'authenticationRequired');
          renderAuthenticationRequired(record);
          toast(connectionError, 'error');
        } else {
          setCardState(record, 'error', connectionError);
        }
        return;
      }
      record.workerId = msg.id;
      record.reconnectInfo = safeReconnectInfo(info);
      record.reconnectData = cloneFormData(data);
      record.autoReconnect = canReconnectWithoutStoredSecrets(data);
      openSocket(record, msg.id, msg.encoding || 'utf-8');
      if (pendingAuthenticationRecord === record) { closeReauthentication(false); }
      saveSessions();
    };
    xhr.send(data);
  }

  function readBatchFile(value) {
    if (!value || typeof value === 'string' || !value.name) {
      return Promise.resolve(value || '');
    }
    return new Promise(function (resolve, reject) {
      var reader = new window.FileReader();
      reader.onload = function () { resolve(reader.result || ''); };
      reader.onerror = reject;
      reader.readAsText(value);
    });
  }

  function serializeBatchFormData(data) {
    var values = {};
    var pending = [];
    data.forEach(function (value, key) {
      if (typeof value === 'string') {
        values[key] = value;
        return;
      }
      pending.push(readBatchFile(value).then(function (content) {
        values[key] = content;
        values[key + '_filename'] = value.name || '';
      }));
    });
    return Promise.all(pending).then(function () { return values; });
  }

  function requestBatchConnections(entries) {
    return Promise.all(entries.map(function (entry) {
      return serializeBatchFormData(entry.data);
    })).then(function (connections) {
      return window.fetch('batch-connect', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'X-Xsrftoken': xsrfToken()
        },
        body: JSON.stringify({ connections: connections })
      });
    }).then(function (response) {
      if (!response.ok) { throw new Error(response.status + ': ' + response.statusText); }
      return response.json();
    });
  }

  function requestSingleConnection(data) {
    return new Promise(function (resolve, reject) {
      var xhr = new window.XMLHttpRequest();
      xhr.open('POST', '', true);
      xhr.onreadystatechange = function () {
        if (xhr.readyState !== 4) { return; }
        if (xhr.status !== 200) {
          reject(new Error(xhr.status + ': ' + xhr.statusText));
          return;
        }
        var msg;
        try { msg = JSON.parse(xhr.responseText); } catch (e) { msg = null; }
        if (!msg || !msg.id) {
          reject(new Error((msg && msg.status) || t('connectionFailed')));
          return;
        }
        resolve(msg);
      };
      xhr.send(data);
    });
  }

  function retryBatchEntry(entry, reconnect) {
    var record = entry.record;
    record.retryConnection = null;
    record.socketRetrying = true;
    requestSingleConnection(entry.data).then(function (msg) {
      record.socketRetrying = false;
      if (!terminals[record.id]) { return; }
      record.workerId = msg.id;
      if (reconnect) {
        record.reconnectInfo = safeReconnectInfo(entry.info);
        record.reconnectData = cloneFormData(entry.data);
        record.autoReconnect = canReconnectWithoutStoredSecrets(entry.data);
      }
      openSocket(record, msg.id, msg.encoding || 'utf-8');
      if (!reconnect) {
        logAction('logConnect', { name: record.displayName || record.hostname });
      }
      saveSessions();
    }).catch(function (error) {
      record.socketRetrying = false;
      if (!terminals[record.id]) { return; }
      var message = error.message || t('connectionFailed');
      if (entry.batchStatus && entry.batchStatus !== message) {
        message = entry.batchStatus + ' → ' + message;
      }
      setCardState(entry.record, 'error', message);
    });
  }

  function retryBatchEntries(entries, reconnect) {
    entries.forEach(function (entry, index) {
      var delay = BATCH_CONNECTION_RETRY_DELAY +
        Math.floor(index / BATCH_SOCKET_WAVE_SIZE) * BATCH_SOCKET_WAVE_DELAY;
      entry.record.socketTimer = window.setTimeout(function () {
        entry.record.socketTimer = null;
        if (terminals[entry.record.id]) {
          retryBatchEntry(entry, reconnect);
        }
      }, delay);
    });
  }

  function bindBatchSocket(entry, reconnect) {
    var record = entry.record;
    var msg = entry.msg;
    if (!terminals[record.id]) { return; }
    record.workerId = msg.id;
    if (reconnect) {
      record.reconnectInfo = safeReconnectInfo(entry.info);
      record.reconnectData = cloneFormData(entry.data);
      record.autoReconnect = canReconnectWithoutStoredSecrets(entry.data);
    }
    record.socketRetrying = false;
    record.retryConnection = function () {
      record.retryConnection = null;
      record.socketRetrying = true;
      record.socketTimer = window.setTimeout(function () {
        record.socketTimer = null;
        if (!terminals[record.id]) {
          record.socketRetrying = false;
          return;
        }
        record.socketRetrying = false;
        openSocket(record, msg.id, msg.encoding || 'utf-8');
      }, BATCH_SOCKET_RETRY_DELAY);
    };
    openSocket(record, msg.id, msg.encoding || 'utf-8');
    if (!reconnect) {
      logAction('logConnect', { name: record.displayName || record.hostname });
    }
    saveSessions();
  }

  function scheduleBatchSockets(entries, reconnect) {
    entries.forEach(function (entry, index) {
      var delay = Math.floor(index / BATCH_SOCKET_WAVE_SIZE) *
        BATCH_SOCKET_WAVE_DELAY;
      entry.record.socketTimer = window.setTimeout(function () {
        entry.record.socketTimer = null;
        bindBatchSocket(entry, reconnect);
      }, delay);
    });
  }

  function reconnectSshTerminalBatch(entries) {
    requestBatchConnections(entries).then(function (payload) {
      var results = payload && payload.results || [];
      var retryEntries = [];
      var socketEntries = [];
      entries.forEach(function (entry, index) {
        var msg = results[index] || {};
        if (!msg.id) {
          entry.batchStatus = msg.status || t('connectionFailed');
          retryEntries.push(entry);
          return;
        }
        entry.msg = msg;
        socketEntries.push(entry);
      });
      scheduleBatchSockets(socketEntries, true);
      retryBatchEntries(retryEntries, true);
    }).catch(function () {
      retryBatchEntries(entries, true);
    });
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
      var btn = record.card.querySelector('.maximize-terminal');
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
  var LOG_BUFFER_LIMIT = 1024 * 1024;

  function appendTerminalLog(record, text) {
    if (!record || !text) { return; }
    record.logBuffer += text;
    if (record.logBuffer.length > LOG_BUFFER_LIMIT) {
      // Keep the newest half when the buffer overflows; an implicit cap on memory.
      record.logBuffer = record.logBuffer.slice(-Math.floor(LOG_BUFFER_LIMIT / 2));
    }
  }

  function stripAnsiEscapes(text) {
    return text
      .replace(/\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)?/g, '')
      .replace(/\x1b\[[0-9;:?]*[ -\/]*[@-~]/g, '')
      .replace(/\x1b[PX^_][^\x07\x1b]*(?:\x07|\x1b\\)?/g, '')
      .replace(/\x1b[@-Z\\-_]/g, '')
      .replace(/[\x00-\x08\x0b\x0c\x0e-\x1a\x1c-\x1f\x7f]/g, '')
      .replace(/\r\n/g, '\n');
  }

  function logTimestamp() {
    var d = new Date();
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '-' +
      pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds());
  }

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

  function trackTerminalDirectory(record, text) {
    var data = (record.osc7Buffer || '') + (text || '');
    var pattern = /\x1b\]7;([^\x07\x1b]*)(?:\x07|\x1b\\)/g;
    var match;
    var consumed = 0;
    while ((match = pattern.exec(data))) {
      consumed = pattern.lastIndex;
      var uri = match[1];
      if (uri.indexOf('file://') !== 0) { continue; }
      var pathStart = uri.indexOf('/', 7);
      if (pathStart === -1) { continue; }
      var encodedPath = uri.slice(pathStart);
      var path;
      try { path = decodeURIComponent(encodedPath); } catch (e) { path = encodedPath; }
      if (!path || path[0] !== '/' || path.length > 4096 || path.indexOf('\x00') !== -1) { continue; }
      record.osc7Seen = true;
      if (record.onPrompt) { record.onPrompt(); }
      if (record.currentDirectory !== path) {
        record.currentDirectory = path;
        saveSessions();
        if (record.sock && record.sock.readyState === window.WebSocket.OPEN) {
          record.sock.send(JSON.stringify({ cwd: path }));
        }
      }
    }
    if (consumed) {
      var remainder = data.slice(consumed);
      var remainderStart = remainder.lastIndexOf('\x1b]7;');
      record.osc7Buffer = remainderStart >= 0 ? remainder.slice(remainderStart, remainderStart + 4096) : remainder.slice(-16);
    } else {
      var start = data.lastIndexOf('\x1b]7;');
      record.osc7Buffer = start >= 0 ? data.slice(start, start + 4096) : data.slice(-16);
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
      if (record.sock !== sock) { return; }
      record.retryConnection = null;
      record.socketRetrying = false;
      record.body.innerHTML = '';
      term.open(record.body);
      setCardState(record, 'connected', null, 'connected');
      fitTerminal(record);
      term.focus();
      observeResize(record);
      startLatencyProbe(record);
      if (record.currentDirectory) {
        sock.send(JSON.stringify({ cwd: record.currentDirectory }));
      }
    };

    sock.onmessage = function (message) {
      if (record.sock !== sock) { return; }
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
        trackTerminalDirectory(record, text);
        appendTerminalLog(record, text);
        if (record.term) { record.term.write(text); }
      }, record.decoder);
    };

    sock.onerror = function () {
      if (record.sock !== sock) { return; }
      if (record.retryConnection && !record.socketRetrying) {
        var retry = record.retryConnection;
        record.retryConnection = null;
        record.socketRetrying = true;
        retry();
        return;
      }
      if (record.socketRetrying) { return; }
      stopLatencyProbe(record);
      setCardState(record, 'error', null, 'socketError');
      lineRunDropRecord(record);
    };

    sock.onclose = function (event) {
      if (record.sock !== sock) { return; }
      if (record.retryConnection && !record.socketRetrying) {
        var retry = record.retryConnection;
        record.retryConnection = null;
        record.socketRetrying = true;
        retry();
        return;
      }
      if (record.socketRetrying) { return; }
      stopLatencyProbe(record);
      if (terminals[record.id]) {
        setCardState(record, 'error', event.reason || t('disconnected'));
      }
      lineRunDropRecord(record);
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

  function createSshTerminalRecord(data) {
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
      autoReconnect: canReconnectWithoutStoredSecrets(data),
      reconnectInfo: safeReconnectInfo(reconnectInfo)
    });
    record.reconnectData = cloneFormData(data);
    return record;
  }

  function connectTerminal(data) {
    var record = createSshTerminalRecord(data);

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

  function connectTerminalBatch(datas) {
    var entries = datas.map(function (data) {
      return { record: createSshTerminalRecord(data), data: data };
    });
    connectButton.disabled = true;
    requestBatchConnections(entries).then(function (payload) {
      var results = payload && payload.results || [];
      var connected = 0;
      var retryEntries = [];
      var socketEntries = [];
      entries.forEach(function (entry, index) {
        var msg = results[index] || {};
        if (!msg.id) {
          entry.batchStatus = msg.status || t('connectionFailed');
          retryEntries.push(entry);
          return;
        }
        connected += 1;
        entry.msg = msg;
        socketEntries.push(entry);
      });
      setStatus(connected ? t('sessionOpened', {
        name: terminalCountText(connected)
      }) : t('connectionFailed'));
      scheduleBatchSockets(socketEntries, false);
      retryBatchEntries(retryEntries, false);
    }).catch(function () {
      retryBatchEntries(entries, false);
      setStatus(t('connectionFailed'));
    }).then(function () {
      connectButton.disabled = false;
    });
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
      autoReconnect: true,
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
  function broadcastToGroup(groupId, command, records) {
    var group = groupById(groupId);
    var targets = records === undefined ? broadcastRecipients(groupId) : records;
    var name = group ? group.name : groupId;
    if (group && group.broadcastSelectedOnly && !targets.length) {
      var message = t('noSelectedBroadcastTargets', { name: name });
      setStatus(message);
      toast(message, 'error');
      return null;
    }
    var seq = controlSequence(command);
    var payload = seq || (command.replace(/\s+$/, '') + (settings.broadcastEnter ? '\r' : ''));
    var sent = 0;
    targets.forEach(function (record) {
      if (sendToRecord(record, payload)) {
        sent += 1;
      }
    });
    if (sent) {
      setStatus(t('sentStatus', { name: name, count: terminalCountText(sent) }));
      toast(t('broadcastToast', { name: name, count: terminalCountText(sent) }), 'success');
      logAction('logBroadcast', { name: name, detail: seq ? command.toUpperCase() : command });
    } else {
      toast(t('noConnected', { name: name }), 'error');
    }
    return sent > 0;
  }

  function cleanLogFileName(value) {
    return (value || '').replace(/[\\/:*?"<>|\s]+/g, '-').replace(/^-+|-+$/g, '') || 'terminal';
  }

  function downloadTerminalLogs(groupId) {
    var group = groupById(groupId);
    var name = group ? group.name : groupId;
    if (group && group.broadcastSelectedOnly && !selectedBroadcastTerminals(groupId).length) {
      var noTargets = t('noSelectedLogTargets', { name: name });
      setStatus(noTargets);
      toast(noTargets, 'error');
      return;
    }
    var targets = (group ? broadcastRecipients(groupId) : []).filter(function (record) {
      return !!(record && record.logBuffer);
    });
    if (!targets.length) {
      var noLogs = t('noLogsToSave');
      setStatus(noLogs);
      toast(noLogs, 'error');
      return;
    }
    openLogSaveDialog(groupId, targets);
  }

  function openLogSaveDialog(groupId, records) {
    closeConnectionDialog(false);
    closeHostManager(false);
    closeSystemSettings(false);
    logOverlay.classList.remove('is-open');
    var stamp = logTimestamp();
    logSaveState = {
      groupId: groupId, dir: null, saving: false, targets: []
    };
    logSavePreviousFocus = document.activeElement;
    logSaveTargets.innerHTML = '';
    records.forEach(function (record) {
      var inputId = 'log-save-name-' + record.id;
      var defaultValue = cleanLogFileName(record.displayName || record.hostname || record.id || 'terminal') +
        '_' + stamp + '.txt';
      var input = el('input', { id: inputId, type: 'text', value: defaultValue, spellcheck: 'false' });
      var text = stripAnsiEscapes(record.logBuffer);
      var size = formatFileSize(text.length);
      logSaveState.targets.push({ record: record, input: input, text: text, size: size });
      logSaveTargets.appendChild(el('div', { class: 'upload-target-row' }, [
        el('div', { class: 'upload-target-copy' }, [
          el('strong', { text: record.displayName || record.hostname }),
          el('span', { text: size })
        ]),
        el('label', { class: 'upload-path-field', for: inputId }, [
          el('span', { text: t('logFileName') }), input
        ])
      ]));
    });
    logSaveLocationText.textContent = t('saveLocationDefault');
    logSaveCountText.textContent = terminalCountText(records.length);
    logSaveOverlay.classList.add('is-open');
    logSaveOverlay.setAttribute('aria-hidden', 'false');
    confirmLogSaveButton.disabled = false;
    cancelLogSaveButton.disabled = false;
    chooseLogLocationButton.disabled = false;
    var firstInput = logSaveTargets.querySelector('input');
    if (firstInput) { firstInput.focus(); } else { closeLogSaveButton.focus(); }
  }

  function closeLogSaveDialog(restoreFocus) {
    if (!logSaveOverlay.classList.contains('is-open')) { return true; }
    if (logSaveState && logSaveState.saving) { return false; }
    logSaveOverlay.classList.remove('is-open');
    logSaveOverlay.setAttribute('aria-hidden', 'true');
    logSaveState = null;
    if (restoreFocus !== false && logSavePreviousFocus && document.contains(logSavePreviousFocus)) {
      logSavePreviousFocus.focus();
    }
    logSavePreviousFocus = null;
    return true;
  }

  function saveLogFile(text, name, dir) {
    if (dir) {
      return dir.getFileHandle(name, { create: true }).then(function (handle) {
        return handle.createWritable().then(function (writer) {
          return writer.write(text).then(function () { return writer.close(); });
        });
      });
    }
    var blob = new window.Blob([text], { type: 'text/plain;charset=utf-8' });
    var url = window.URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(function () { window.URL.revokeObjectURL(url); }, 5000);
    return Promise.resolve();
  }

  // ---- Line-by-line send -------------------------------------------------
  var lineRun = null;
  var LINE_WAIT_TIMEOUT = 30000;

  function lineScriptEntries(text) {
    return (text || '').split(/\r?\n/).map(function (line) {
      var trimmed = line.replace(/\s+$/, '');
      var seq = controlSequence(trimmed);
      if (trimmed === '' || seq !== undefined) {
        // Blank line = one Enter; a control-key line sends its sequence only.
        return { payload: seq !== undefined ? seq : '\r', control: true };
      }
      return { payload: trimmed + (settings.broadcastEnter ? '\r' : ''), control: false };
    });
  }

  function setGroupLineSend(group, enabled) {
    if (!!group.lineSend === !!enabled) { return; }
    group.lineSend = !!enabled;
    saveGroups();
    refreshLineSendControls(group);
    refreshBroadcastSelection(group.id);
  }

  function refreshBroadcastSelect(group, editor) {
    var sel = editor.shortcutSelect;
    sel.options.length = 0;
    var items;
    if (group.lineSend) {
      items = [
        { value: 'interval', text: t('lineSendModeInterval') },
        { value: 'prompt', text: t('lineSendModePrompt') }
      ];
      sel.setAttribute('aria-label', t('lineSendMode'));
      sel.title = t('lineSendMode');
    } else {
      items = [
        { value: '', text: t('shortcutPlaceholder') },
        { value: 'ctrl+c', text: t('ctrlC') },
        { value: 'ctrl+d', text: t('ctrlD') },
        { value: 'ctrl+z', text: t('ctrlZ') },
        { value: 'ctrl+l', text: t('ctrlL') },
        { value: 'tab', text: t('tabKey') },
        { value: 'enter', text: t('enterKey') },
        { value: 'esc', text: t('escKey') }
      ];
      sel.setAttribute('aria-label', t('broadcastShortcut'));
      sel.title = t('broadcastShortcut');
    }
    items.forEach(function (item) {
      sel.appendChild(el('option', { value: item.value, text: item.text }));
    });
    sel.value = group.lineSend ? (group.lineSendMode === 'prompt' ? 'prompt' : 'interval') : '';
  }

  function refreshLineSendControls(group) {
    var editor = broadcastEditors[group.id];
    if (!editor) { return; }
    var on = !!group.lineSend;
    editor.lineSendModeToggle.title = t('lineSendMode');
    editor.lineSendModeToggle.setAttribute('aria-label', t('lineSendMode'));
    editor.lineOnceBtn.textContent = t('lineSendOnce');
    editor.lineLinesBtn.textContent = t('lineSendLines');
    editor.intervalInput.title = t('lineSendInterval');
    editor.intervalInput.setAttribute('aria-label', t('lineSendInterval'));
    editor.lineOnceBtn.classList.toggle('is-active', !on);
    editor.lineLinesBtn.classList.toggle('is-active', on);
    editor.lineOnceBtn.setAttribute('aria-pressed', on ? 'false' : 'true');
    editor.lineLinesBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    editor.form.classList.toggle('is-line-send', on);
    editor.form.classList.toggle('is-line-prompt', on && group.lineSendMode === 'prompt');
    refreshBroadcastSelect(group, editor);
    editor.intervalInput.parentNode.classList.toggle('is-hidden', !on || group.lineSendMode !== 'interval');
  }

  function updateLineRunButton() {
    var run = lineRun;
    if (!run) { return; }
    var editor = broadcastEditors[run.groupId];
    if (!editor) { return; }
    editor.sendLabel.textContent = t('lineSendStopProgress', {
      index: run.index, total: run.entries.length
    });
  }

  function setLineRunUI(groupId, running) {
    var editor = broadcastEditors[groupId];
    if (!editor) { return; }
    editor.sendBtn.classList.toggle('is-running', running);
    editor.uploadBtn.disabled = !!running;
    editor.downloadBtn.disabled = !!running;
    editor.shortcutSelect.disabled = !!running;
    editor.intervalInput.disabled = !!running;
    editor.lineOnceBtn.disabled = !!running;
    editor.lineLinesBtn.disabled = !!running;
    if (running) {
      editor.sendBtn.setAttribute('aria-label', t('lineSendStopped'));
      updateLineRunButton();
    } else {
      editor.sendLabel.textContent = t('send');
      editor.sendBtn.removeAttribute('aria-label');
    }
  }

  function lineRunStart(groupId, text) {
    if (lineRun) { return false; }
    var group = groupById(groupId);
    if (!group) { return false; }
    if (group.broadcastSelectedOnly && !selectedBroadcastTerminals(groupId).length) {
      var noTargets = t('noSelectedBroadcastTargets', { name: group.name });
      setStatus(noTargets);
      toast(noTargets, 'error');
      return false;
    }
    var targets = broadcastRecipients(groupId).filter(function (record) {
      return record.state === 'connected' && record.sock &&
        record.sock.readyState === window.WebSocket.OPEN;
    });
    if (!targets.length) {
      var offline = t('noConnected', { name: group.name });
      setStatus(offline);
      toast(offline, 'error');
      return false;
    }
    var entries = lineScriptEntries(text);
    if (!entries.length) { return false; }
    lineRun = {
      groupId: groupId,
      name: group.name,
      targets: targets,
      entries: entries,
      index: 0,
      mode: group.lineSendMode === 'prompt' ? 'prompt' : 'interval',
      interval: Math.min(10000, Math.max(0, Number(group.lineSendInterval) || 500)),
      pending: [],
      timer: null,
      stopped: false
    };
    targets.forEach(function (record) {
      record.onPrompt = function () { lineRunPrompt(record); };
    });
    setLineRunUI(groupId, true);
    lineRunSendNext(groupId);
    return true;
  }

  function lineRunSendNext(groupId) {
    var run = lineRun;
    if (!run || run.stopped || run.groupId !== groupId) { return; }
    if (run.index >= run.entries.length) {
      lineRunFinish(groupId);
      return;
    }
    var entry = run.entries[run.index];
    var sent = 0;
    run.targets.forEach(function (record) {
      if (sendToRecord(record, entry.payload)) { sent += 1; }
    });
    run.index += 1;
    run.pending = [];
    if (!sent) {
      lineRunFinish(groupId);
      return;
    }
    updateLineRunButton();
    if (run.mode === 'interval') {
      run.timer = window.setTimeout(function () { lineRunSendNext(groupId); }, run.interval);
    } else {
      run.pending = run.targets.slice();
      setStatus(t('lineSendWaiting', { count: run.pending.length }));
      run.timer = window.setTimeout(function () { lineRunWaitTimeout(groupId); }, LINE_WAIT_TIMEOUT);
    }
  }

  function lineRunPrompt(record) {
    var run = lineRun;
    if (!run || run.stopped || run.mode !== 'prompt' || !run.pending.length) { return; }
    var i = run.pending.indexOf(record);
    if (i === -1) { return; }
    run.pending.splice(i, 1);
    if (!run.pending.length) {
      if (run.timer) { window.clearTimeout(run.timer); run.timer = null; }
      lineRunSendNext(run.groupId);
    }
  }

  function lineRunWaitTimeout(groupId) {
    var run = lineRun;
    if (!run || run.stopped || run.groupId !== groupId || run.mode !== 'prompt') { return; }
    run.timer = null;
    var missed = run.pending.length;
    run.pending = [];
    if (missed) {
      setStatus(t('lineSendTimedOutAdvancing', { count: missed }));
    }
    lineRunSendNext(groupId);
  }

  function lineRunDropRecord(record) {
    var run = lineRun;
    if (!run || run.stopped) { return; }
    var pi = run.pending.indexOf(record);
    if (pi !== -1) { run.pending.splice(pi, 1); }
    var ti = run.targets.indexOf(record);
    if (ti !== -1) { run.targets.splice(ti, 1); }
    if (!run.targets.length) {
      lineRunFinish(run.groupId);
      return;
    }
    if (run.mode === 'prompt' && !run.pending.length && run.timer) {
      window.clearTimeout(run.timer);
      run.timer = null;
      lineRunSendNext(run.groupId);
    }
  }

  function lineRunStop(groupId) {
    var run = lineRun;
    if (!run || (groupId && run.groupId !== groupId)) { return; }
    run.stopped = true;
    if (run.timer) { window.clearTimeout(run.timer); run.timer = null; }
    var remaining = Math.max(0, run.entries.length - run.index);
    run.targets.forEach(function (record) { record.onPrompt = null; });
    lineRun = null;
    setLineRunUI(groupId, false);
    var message = t('lineSendStopped');
    setStatus(message);
    toast(message);
    logAction('logLineSendStopped', { name: run.name, remaining: remaining });
  }

  function lineRunFinish(groupId) {
    var run = lineRun;
    if (!run || run.groupId !== groupId) { return; }
    if (run.timer) { window.clearTimeout(run.timer); run.timer = null; }
    var allSent = run.index >= run.entries.length && !run.stopped;
    run.targets.forEach(function (record) { record.onPrompt = null; });
    lineRun = null;
    setLineRunUI(groupId, false);
    var editor = broadcastEditors[groupId];
    if (allSent && editor) {
      editor.input.value = '';
      editor.resize();
      editor.clearDraft();
      editor.input.focus();
    }
    if (allSent) {
      var done = t('lineSendDone', { name: run.name, total: run.entries.length });
      setStatus(done);
      toast(done, 'success');
      logAction('logLineSendDone', { name: run.name, total: run.entries.length });
    } else {
      var loss = t('lineSendTargetsLost', { name: run.name });
      setStatus(loss);
      toast(loss, 'error');
    }
  }

  function formatFileSize(size) {
    if (size < 1024) { return size + ' B'; }
    if (size < 1024 * 1024) { return (size / 1024).toFixed(1) + ' KB'; }
    if (size < 1024 * 1024 * 1024) { return (size / (1024 * 1024)).toFixed(1) + ' MB'; }
    return (size / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  }

  function uploadRecords(records) {
    var seen = Object.create(null);
    return (records || []).filter(function (record) {
      if (!record || !record.workerId || record.state !== 'connected' || seen[record.workerId]) { return false; }
      seen[record.workerId] = true;
      return true;
    });
  }

  function chooseUploadFile(records, trigger) {
    var available = uploadRecords(records);
    if (!available.length) {
      toast(t('noUploadTargets'), 'error');
      return;
    }
    uploadPickerRecords = available;
    uploadPreviousFocus = trigger || document.activeElement;
    fileUploadPicker.value = '';
    fileUploadPicker.click();
  }

  function uploadResponse(response) {
    return response.json().catch(function () { return {}; }).then(function (data) {
      if (!response.ok) { throw new Error(data.status || response.statusText || t('requestFailed')); }
      return data;
    });
  }

  function resolveUploadTarget(record) {
    return window.fetch('upload?id=' + encodeURIComponent(record.workerId), {
      credentials: 'same-origin'
    }).then(uploadResponse).then(function (data) {
      return {
        record: record,
        path: data.path || '',
        tracked: !!data.tracked,
        available: true,
        status: t('readyToUpload')
      };
    }).catch(function (error) {
      return {
        record: record,
        path: record.currentDirectory || '',
        tracked: !!record.currentDirectory,
        available: false,
        status: error.message || t('requestFailed')
      };
    });
  }

  function renderUploadTargets() {
    fileUploadTargets.innerHTML = '';
    (uploadSelection.targets || []).forEach(function (target) {
      var inputId = 'upload-path-' + target.record.id;
      var inputAttrs = {
        id: inputId, type: 'text', value: target.path, spellcheck: 'false'
      };
      if (!target.available) { inputAttrs.disabled = 'disabled'; }
      var pathInput = el('input', inputAttrs);
      var status = el('span', {
        class: 'upload-target-status' + (target.available ? '' : ' is-error'),
        text: target.status
      });
      var progress = el('span', { class: 'upload-progress-bar' });
      target.pathInput = pathInput;
      target.statusEl = status;
      target.progressEl = progress;
      fileUploadTargets.appendChild(el('div', { class: 'upload-target-row' }, [
        el('div', { class: 'upload-target-copy' }, [
          el('strong', { text: target.record.displayName || target.record.hostname }),
          el('span', { text: target.tracked ? t('currentDirectory') : t('homeDirectoryFallback') })
        ]),
        el('label', { class: 'upload-path-field', for: inputId }, [
          el('span', { text: t('uploadDirectory') }), pathInput
        ]),
        el('div', { class: 'upload-target-result' }, [
          status, el('span', { class: 'upload-progress' }, [progress])
        ])
      ]));
    });
  }

  function openUploadDialog(file, records) {
    closeConnectionDialog(false);
    closeHostManager(false);
    closeSystemSettings(false);
    closeLogSaveDialog(false);
    logOverlay.classList.remove('is-open');
    uploadSelection = {
      file: file, targets: [], uploading: false, finished: false,
      cancelled: false, currentXhr: null
    };
    fileUploadName.textContent = file.name;
    fileUploadSize.textContent = formatFileSize(file.size);
    overwriteUploadInput.checked = false;
    overwriteUploadInput.disabled = false;
    fileUploadTargets.innerHTML = '';
    fileUploadTargets.appendChild(el('div', { class: 'upload-loading', text: t('preparingTargets') }));
    startFileUploadButton.disabled = true;
    fileUploadOverlay.classList.add('is-open');
    fileUploadOverlay.setAttribute('aria-hidden', 'false');
    closeFileUploadButton.focus();
    Promise.all(records.map(resolveUploadTarget)).then(function (targets) {
      if (!uploadSelection || uploadSelection.file !== file) { return; }
      uploadSelection.targets = targets;
      renderUploadTargets();
      startFileUploadButton.disabled = !targets.some(function (target) { return target.available; });
      var firstInput = fileUploadTargets.querySelector('input:not([disabled])');
      if (firstInput) { firstInput.focus(); } else { closeFileUploadButton.focus(); }
    });
  }

  function closeUploadDialog(restoreFocus) {
    if (!fileUploadOverlay.classList.contains('is-open')) { return true; }
    if (uploadSelection && uploadSelection.uploading) { return false; }
    fileUploadOverlay.classList.remove('is-open');
    fileUploadOverlay.setAttribute('aria-hidden', 'true');
    uploadSelection = null;
    uploadPickerRecords = [];
    if (restoreFocus !== false && uploadPreviousFocus && document.contains(uploadPreviousFocus)) {
      uploadPreviousFocus.focus();
    }
    uploadPreviousFocus = null;
    return true;
  }

  function setUploadTargetStatus(target, message, kind, progress) {
    target.statusEl.textContent = message;
    target.statusEl.classList.toggle('is-error', kind === 'error');
    target.statusEl.classList.toggle('is-success', kind === 'success');
    target.progressEl.style.width = Math.max(0, Math.min(100, progress || 0)) + '%';
  }

  function uploadFileToTarget(target, overwrite) {
    return new Promise(function (resolve) {
      var params = new window.URLSearchParams();
      params.set('id', target.record.workerId);
      params.set('filename', uploadSelection.file.name);
      params.set('path', target.pathInput.value);
      params.set('overwrite', overwrite ? '1' : '0');
      var xhr = new window.XMLHttpRequest();
      uploadSelection.currentXhr = xhr;
      xhr.open('POST', 'upload?' + params.toString(), true);
      xhr.setRequestHeader('Content-Type', 'application/octet-stream');
      xhr.setRequestHeader('X-XSRFToken', xsrfToken());
      xhr.upload.onprogress = function (event) {
        var progress = event.lengthComputable ? Math.round(event.loaded / event.total * 100) : 0;
        setUploadTargetStatus(target, t('uploadingFile', { progress: progress }), '', progress);
      };
      xhr.onload = function () {
        var data;
        try { data = JSON.parse(xhr.responseText); } catch (e) { data = {}; }
        if (xhr.status >= 200 && xhr.status < 300) {
          setUploadTargetStatus(target, t('uploadComplete'), 'success', 100);
          logAction('logUpload', {
            file: uploadSelection.file.name,
            name: target.record.displayName || target.record.hostname,
            path: data.path || target.pathInput.value
          });
          resolve(true);
        } else {
          setUploadTargetStatus(target, t('uploadFailed', {
            reason: data.status || xhr.statusText || t('requestFailed')
          }), 'error', 0);
          resolve(false);
        }
      };
      xhr.onerror = function () {
        setUploadTargetStatus(target, t('uploadFailed', { reason: t('requestFailed') }), 'error', 0);
        resolve(false);
      };
      xhr.onabort = function () {
        setUploadTargetStatus(target, t('uploadCancelled'), 'error', 0);
        resolve(false);
      };
      xhr.send(uploadSelection.file);
    });
  }

  function startFileUploads() {
    if (!uploadSelection || uploadSelection.uploading) { return; }
    var targets = uploadSelection.targets.filter(function (target) { return target.available; });
    var invalid = targets.some(function (target) {
      return !target.pathInput.value || target.pathInput.value[0] !== '/';
    });
    if (invalid) {
      toast(t('invalidUploadDirectory'), 'error');
      return;
    }
    uploadSelection.uploading = true;
    startFileUploadButton.disabled = true;
    closeFileUploadButton.disabled = true;
    overwriteUploadInput.disabled = true;
    cancelFileUploadButton.focus();
    targets.forEach(function (target) { target.pathInput.disabled = true; });
    var success = 0;
    var chain = Promise.resolve();
    targets.forEach(function (target) {
      chain = chain.then(function () {
        if (uploadSelection.cancelled) { return; }
        return uploadFileToTarget(target, overwriteUploadInput.checked).then(function (uploaded) {
          if (uploaded) { success += 1; }
        });
      });
    });
    chain.then(function () {
      var failed = uploadSelection.targets.length - success;
      uploadSelection.uploading = false;
      uploadSelection.finished = true;
      uploadSelection.currentXhr = null;
      closeFileUploadButton.disabled = false;
      cancelFileUploadButton.disabled = false;
      var message = uploadSelection.cancelled ? t('uploadCancelled') : (failed ? t('uploadPartial', {
        file: uploadSelection.file.name, success: success, failed: failed
      }) : t('uploadSummary', { file: uploadSelection.file.name, count: success }));
      toast(message, failed || uploadSelection.cancelled ? 'error' : 'success');
      setStatus(message);
    });
  }

  function cancelFileUploads() {
    if (!uploadSelection || !uploadSelection.uploading) {
      closeUploadDialog();
      return;
    }
    uploadSelection.cancelled = true;
    if (uploadSelection.currentXhr) { uploadSelection.currentXhr.abort(); }
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
      if (oldGroup !== newGroup) { setTerminalBroadcastSelected(record, false); }
      record.group = newGroup;
      drag.placeholder.remove();
      if (oldGroup !== newGroup) {
        updateEmptyState(oldGroup);
        refreshBroadcastSelection(newGroup);
      }
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
      var metrics = boardGridMetrics();
      var startCols = Number(column.dataset.colSpan) || defaultGroupColSpan();
      var rows = Number(column.dataset.rowSpan) || 1;
      var colStep = Math.max(1, metrics.colSize + metrics.columnGap);
      handle.setPointerCapture(event.pointerId);
      function move(ev) {
        var nextCols = startCols + Math.round((ev.clientX - startX) / colStep);
        setGroupGridSpan(column, nextCols, rows);
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
    setTerminalBroadcastSelected(record, false);
    record.group = groupId;
    var list = listEl(groupId);
    var empty = list.querySelector('.empty-state');
    if (empty) { empty.remove(); }
    list.appendChild(record.card);
    ensureGroupFitsTerminal(groupId);
    updateEmptyState(oldGroup);
    refreshBroadcastSelection(groupId);
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
    closeConnectionDialog(false);
    connectTerminal(data);
  });

  reauthForm.addEventListener('submit', function (event) {
    event.preventDefault();
    var record = pendingAuthenticationRecord;
    if (!record || !terminals[record.id]) {
      closeReauthentication(false);
      return;
    }
    var info = record.reconnectInfo || {};
    var data = new window.FormData(reauthForm);
    data.set('_xsrf', xsrfToken());
    data.set('term', 'xterm-256color');
    data.set('hostname', info.hostname || record.hostname);
    data.set('username', info.username || record.username);
    data.set('port', info.port || record.port || '22');
    data.set('target_group', record.group);
    data.set('ssh_config_host', info.sshConfigHost || '');
    cleanData(data);
    record.reconnectData = cloneFormData(data);
    record.autoReconnect = canReconnectWithoutStoredSecrets(data);
    reconnectTerminal(record, true);
  });

  function openLogOverlay() {
    if (!closeUploadDialog(false)) { return; }
    closeReauthentication(false);
    closeConnectionDialog(false);
    closeHostManager(false);
    closeSystemSettings(false);
    logOverlay.classList.add('is-open');
  }

  function shortcutActionForEvent(event) {
    if (event.repeat) { return null; }
    return SHORTCUT_ACTIONS.find(function (action) {
      return eventMatchesShortcut(event, settings.shortcuts[action.id]);
    }) || null;
  }

  function runShortcutAction(actionId) {
    if (actionId === 'togglePersistentPanels') {
      togglePersistentPanels();
      return;
    }
    if (actionId === 'toggleBroadcastScope') {
      var focusedColumn = document.activeElement && document.activeElement.closest ?
        document.activeElement.closest('.group') : null;
      var group = groupById(focusedColumn && focusedColumn.getAttribute('data-group')) ||
        groupById(groupSelect.value) || groups[0];
      if (group) { setGroupBroadcastScope(group, !group.broadcastSelectedOnly); }
      return;
    }
    if (reauthOverlay.classList.contains('is-open')) { closeReauthentication(false); }
    if (actionId === 'connectServer') {
      if (connectionOverlay.classList.contains('is-open')) { closeConnectionDialog(); } else { openConnectionDialog(); }
      return;
    }
    if (actionId === 'hostManager') {
      if (hostManagerOverlay.classList.contains('is-open')) { closeHostManager(); } else { openHostManager(); }
      return;
    }
    if (actionId === 'systemSettings') {
      if (systemSettingsOverlay.classList.contains('is-open')) { closeSystemSettings(); } else { openSystemSettings(); }
      return;
    }
    if (actionId === 'operationLog') {
      if (logOverlay.classList.contains('is-open')) { logOverlay.classList.remove('is-open'); } else { openLogOverlay(); }
      return;
    }
    closeConnectionDialog(false);
    closeHostManager(false);
    closeSystemSettings(false);
    logOverlay.classList.remove('is-open');
    if (!closeUploadDialog(false)) { return; }
    if (actionId === 'localTerminal') { openLocalTerminal(); }
    if (actionId === 'newGroup') { addGroup(null, { focus: true }); }
  }

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
  sidebarRail.addEventListener('click', openConnectionDialog);
  closeConnectionButton.addEventListener('click', function () { closeConnectionDialog(); });
  connectionOverlay.addEventListener('click', function (event) {
    if (event.target === connectionOverlay) { closeConnectionDialog(); }
  });
  openHostManagerButton.addEventListener('click', openHostManager);
  openSystemSettingsButton.addEventListener('click', openSystemSettings);
  closeReauthButton.addEventListener('click', function () { closeReauthentication(); });
  cancelReauthButton.addEventListener('click', function () { closeReauthentication(); });
  reauthOverlay.addEventListener('click', function (event) {
    if (event.target === reauthOverlay) { closeReauthentication(); }
  });
  reauthPrivateKeyInput.addEventListener('change', function () {
    reauthPrivateKeyName.textContent = reauthPrivateKeyInput.files.length ?
      reauthPrivateKeyInput.files[0].name : t('noFileChosen');
  });
  closeSystemSettingsButton.addEventListener('click', function () { closeSystemSettings(); });
  systemSettingsOverlay.addEventListener('click', function (event) {
    if (event.target === systemSettingsOverlay) { closeSystemSettings(); }
  });
  closeHostManagerButton.addEventListener('click', function () { closeHostManager(); });
  hostManagerOverlay.addEventListener('click', function (event) {
    if (event.target === hostManagerOverlay) { closeHostManager(); }
  });
  groupSelect.addEventListener('change', function () {
    hostManagerGroupId = groupSelect.value;
    renderHostManagerGroups();
    renderHostManagerTerminals();
  });
  hostManagerAddGroup.addEventListener('click', function () {
    var group = addGroup(null);
    groupSelect.value = group.id;
    hostManagerGroupId = group.id;
    renderHostManagerGroups();
    renderHostManagerTerminals();
    focusHostManagerGroup();
  });
  openLocalTerminalButton.addEventListener('click', openLocalTerminal);
  fileUploadPicker.addEventListener('change', function () {
    var file = fileUploadPicker.files && fileUploadPicker.files[0];
    if (file && uploadPickerRecords.length) {
      openUploadDialog(file, uploadPickerRecords.slice());
    }
  });
  closeFileUploadButton.addEventListener('click', function () { closeUploadDialog(); });
  cancelFileUploadButton.addEventListener('click', cancelFileUploads);
  startFileUploadButton.addEventListener('click', startFileUploads);
  fileUploadOverlay.addEventListener('click', function (event) {
    if (event.target === fileUploadOverlay) { closeUploadDialog(); }
  });
  closeLogSaveButton.addEventListener('click', function () { closeLogSaveDialog(); });
  cancelLogSaveButton.addEventListener('click', function () { closeLogSaveDialog(); });
  logSaveOverlay.addEventListener('click', function (event) {
    if (event.target === logSaveOverlay) { closeLogSaveDialog(); }
  });
  chooseLogLocationButton.addEventListener('click', function () {
    if (!logSaveState || logSaveState.saving) { return; }
    if (window.showDirectoryPicker) {
      window.showDirectoryPicker().then(function (handle) {
        if (!logSaveState) { return; }
        logSaveState.dir = handle;
        logSaveLocationText.textContent = handle.name;
      }).catch(function (error) {
        if (error && error.name === 'AbortError') { return; }
        if (logSaveState) { toast(t('locationUnsupported'), 'error'); }
      });
    } else {
      toast(t('locationUnsupported'), 'error');
    }
  });
  confirmLogSaveButton.addEventListener('click', function () {
    if (!logSaveState || logSaveState.saving) { return; }
    logSaveState.saving = true;
    confirmLogSaveButton.disabled = true;
    cancelLogSaveButton.disabled = true;
    chooseLogLocationButton.disabled = true;
    var stamp = logTimestamp();
    var group = groupById(logSaveState.groupId);
    var groupName = group ? group.name : logSaveState.groupId;
    var tasks = logSaveState.targets.map(function (target) {
      var name = cleanLogFileName(target.input.value) ||
        cleanLogFileName(target.record.displayName || target.record.hostname) + '_' + stamp;
      if (!/\.txt$/i.test(name)) { name += '.txt'; }
      return saveLogFile(target.text, name, logSaveState.dir).then(function () {
        return { ok: true };
      }).catch(function () {
        return { ok: false };
      });
    });
    Promise.all(tasks).then(function (results) {
      var success = results.filter(function (item) { return item.ok; }).length;
      var failed = results.length - success;
      var message = failed ? t('logSavedPartial', { success: success, failed: failed })
        : t('logSaved', { count: success });
      setStatus(message);
      toast(message, failed ? 'error' : 'success');
      logAction('logDownload', { name: groupName, count: success });
      if (logSaveState) { logSaveState.saving = false; }
      closeLogSaveDialog();
    });
  });
  privateKeyInput.addEventListener('change', function () {
    privateKeyName.textContent = privateKeyInput.files.length ? privateKeyInput.files[0].name : t('noFileChosen');
  });
  openLogButton.addEventListener('click', openLogOverlay);
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

  [confirmDisconnectInput, broadcastEnterInput, fontSizeInput, terminalHeightInput, maxTerminalsInput, maxUploadSizeInput, connectionConcurrencyInput].forEach(function (input) {
    input.addEventListener('change', updateSettingsFromControls);
  });
  resetShortcutsButton.addEventListener('click', function () {
    settings.shortcuts = Object.assign({}, DEFAULT_SHORTCUTS);
    saveSettings();
    applyShortcutBindings();
    renderShortcutSettings();
    toast(t('shortcutReset'), 'success');
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

  themeToggle.addEventListener('click', function () {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    window.localStorage.setItem('wssh-theme', currentTheme);
    applyTheme();
  });

  $('.topbar-rail').addEventListener('click', function () {
    languageToggle.focus();
  });

  window.addEventListener('resize', function () {
    Object.keys(terminals).forEach(function (id) { fitTerminal(terminals[id]); });
    updateAllGroupGridSpans();
  });

  board.addEventListener('wheel', function (event) {
    if (event.target.closest('.terminal-list') || board.scrollWidth <= board.clientWidth) { return; }
    var delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    if (!delta) { return; }
    event.preventDefault();
    if (boardWheelLocked) { return; }
    boardWheelLocked = true;
    board.scrollBy({
      left: (delta > 0 ? 1 : -1) * board.clientWidth / 2,
      behavior: 'smooth'
    });
    window.setTimeout(function () { boardWheelLocked = false; }, 360);
  }, { passive: false });

  document.addEventListener('keydown', function (event) {
    var shortcutAction = shortcutActionForEvent(event);
    if (shortcutAction) {
      event.preventDefault();
      runShortcutAction(shortcutAction.id);
      return;
    }
    if (event.key === 'Tab' && connectionOverlay.classList.contains('is-open')) {
      trapModalFocus(connectionOverlay, event);
      return;
    }
    if (event.key === 'Tab' && reauthOverlay.classList.contains('is-open')) {
      trapModalFocus(reauthOverlay, event);
      return;
    }
    if (event.key === 'Tab' && hostManagerOverlay.classList.contains('is-open')) {
      trapModalFocus(hostManagerOverlay, event);
      return;
    }
    if (event.key === 'Tab' && systemSettingsOverlay.classList.contains('is-open')) {
      trapModalFocus(systemSettingsOverlay, event);
      return;
    }
    if (event.key === 'Tab' && fileUploadOverlay.classList.contains('is-open')) {
      trapModalFocus(fileUploadOverlay, event);
      return;
    }
    if (event.key === 'Escape') {
      if (connectionOverlay.classList.contains('is-open')) {
        closeConnectionDialog();
        return;
      }
      if (reauthOverlay.classList.contains('is-open')) {
        closeReauthentication();
        return;
      }
      if (fileUploadOverlay.classList.contains('is-open')) {
        closeUploadDialog();
        return;
      }
      if (logSaveOverlay.classList.contains('is-open')) {
        closeLogSaveDialog();
        return;
      }
      if (hostManagerOverlay.classList.contains('is-open')) {
        closeHostManager();
        return;
      }
      if (systemSettingsOverlay.classList.contains('is-open')) {
        closeSystemSettings();
        return;
      }
      if (logOverlay.classList.contains('is-open')) {
        logOverlay.classList.remove('is-open');
        return;
      }
      if (focusedGroupId) {
        exitGroupFullscreen();
        return;
      }
      Object.keys(terminals).forEach(function (id) {
        var record = terminals[id];
        if (record.card.classList.contains('maximized')) {
          var btn = record.card.querySelector('.maximize-terminal');
          toggleMaximize(record, btn);
        }
      });
    }
  });

  // ---- Public hook (kept for compatibility) ------------------------------
  window.wssh = {
    send: function (data, groupId) {
      var targetGroup = groupId || (groups[0] && groups[0].id);
      broadcastToGroup(targetGroup, data, broadcastRecipients(targetGroup));
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
