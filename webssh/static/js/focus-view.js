// Focus mode view layer: top tab strip, single-terminal main panel, and the
// focus sidebar (broadcast history / divergent hosts). All session state stays
// inside main.js; this file only relocates existing terminal cards and renders
// derived UI through the minimal window.WSSH_CORE surface.
(function () {
  'use strict';

  var core = null;
  var els = {};
  var activeId = null;

  function ready() {
    if (core) { return true; }
    core = window.WSSH_CORE;
    if (!core) { return false; }
    els.tabs = document.getElementById('focus-tabs');
    els.main = document.getElementById('focus-main');
    els.history = document.getElementById('focus-history');
    els.historyHint = document.getElementById('focus-history-hint');
    els.tabJournal = document.getElementById('focus-tab-journal');
    els.tabBroadcast = document.getElementById('focus-tab-broadcast');
    if (els.tabJournal) {
      els.tabJournal.addEventListener('click', function () { setSidebarTab('journal'); });
    }
    if (els.tabBroadcast) {
      els.tabBroadcast.addEventListener('click', function () { setSidebarTab('broadcast'); });
    }
    els.clusterWidget = document.getElementById('cluster-send-widget');
    els.clusterStatus = document.getElementById('cluster-status');
    els.clusterPending = document.getElementById('cluster-pending');
    if (els.clusterWidget) {
      els.clusterWidget.addEventListener('click', function (event) {
        var button = event.target.closest ? event.target.closest('[data-cluster]') : null;
        var cluster = window.WSSH_CLUSTER;
        if (!button || !cluster) { return; }
        var group = activeGroup();
        if (group) { cluster.setState(group.id, button.getAttribute('data-cluster')); }
      });
    }
    var reconnectBtn = document.getElementById('focus-reconnect-failed');
    if (reconnectBtn) {
      reconnectBtn.addEventListener('click', function () {
        var cluster = window.WSSH_CLUSTER;
        var group = activeGroup();
        if (cluster && group) { cluster.reconnectFailed(group.id); }
      });
    }
    return Boolean(els.tabs && els.main && els.history);
  }

  function allRecords() {
    var map = core.getTerminals();
    return Object.keys(map).map(function (id) { return map[id]; });
  }

  function recordById(id) {
    return core.getTerminals()[id] || null;
  }

  function activeRecord() {
    return activeId ? recordById(activeId) : null;
  }

  function recordsInGroup(groupId) {
    return allRecords().filter(function (record) {
      return record.group === groupId;
    });
  }

  // Reparenting a live xterm leaves its viewport stale; the buffer reflow
  // below rebuilds it. Running while the card is detached keeps the reflow
  // invisible — the renderer never paints the intermediate state.
  function reflowTerminalBuffer(record) {
    if (!record.term) { return; }
    try {
      var term = record.term;
      term.resize(term.cols, Math.max(2, term.rows - 1));
      term.resize(term.cols, term.rows);
    } catch (e) { /* noop */ }
  }

  function refreshTerminalAfterMove(record) {
    core.fitTerminal(record);
    if (record.term) {
      try { record.term.refresh(0, Math.max(0, record.term.rows - 1)); } catch (e) { /* noop */ }
      try { record.term.scrollToBottom(); } catch (e) { /* noop */ }
    }
  }

  function hostCard(record) {
    // Stash the workspace height so persistence keeps reporting it while the
    // card body is stretched by the focus layout.
    record.__preFocusHeight = record.body.style.height || '';
    record.body.style.height = '';
    reflowTerminalBuffer(record);
    els.main.appendChild(record.card);
    window.requestAnimationFrame(function () {
      refreshTerminalAfterMove(record);
      if (record.term) { record.term.focus(); }
    });
    // Fonts and scrollbars settle one frame later; re-measure once more so
    // the terminal geometry matches the hosted layout exactly.
    window.setTimeout(function () {
      if (activeRecord() === record) { refreshTerminalAfterMove(record); }
    }, 300);
  }

  function returnCard(record) {
    if (!record || !record.card) { return; }
    if (record.__preFocusHeight !== undefined && record.__preFocusHeight !== null) {
      record.body.style.height = record.__preFocusHeight;
    }
    delete record.__preFocusHeight;
    reflowTerminalBuffer(record);
    var list = core.listEl(record.group);
    if (list && record.card.parentNode !== list) { list.appendChild(record.card); }
    refreshTerminalAfterMove(record);
  }

  function activate(record) {
    if (!record) { return; }
    var current = activeRecord();
    if (current === record) {
      refreshTerminalAfterMove(record);
      if (record.term) { record.term.focus(); }
      return;
    }
    if (current) { returnCard(current); }
    activeId = record.id;
    core.setActiveTerminalId(record.id);
    els.main.innerHTML = '';
    hostCard(record);
    renderTabs();
    renderSidebar();
  }

  function ensureActive() {
    if (activeRecord()) { return; }
    activeId = null;
    core.setActiveTerminalId(null);
    var records = allRecords();
    if (records.length) {
      activate(records[0]);
    } else {
      renderMainEmpty();
    }
  }

  function buildTab(record) {
    var name = record.displayName || record.hostname;
    var dot = core.el('span', { class: 'focus-tab-dot', 'aria-hidden': 'true' });
    dot.dataset.state = record.state || 'connecting';
    var cluster = window.WSSH_CLUSTER;
    if (cluster) {
      if (cluster.isClusterTarget(record)) { dot.dataset.sync = 'on'; }
      var group = core.groupById(record.group);
      if (group && cluster.getDiff(group.id).indexOf(record.id) >= 0) {
        dot.dataset.forecast = 'warn';
      }
    }
    var closeBtn = core.el('button', {
      class: 'focus-tab-close', type: 'button',
      title: core.t('focusCloseTab', { name: name }),
      'aria-label': core.t('focusCloseTab', { name: name }),
      html: core.ICONS.close
    });
    closeBtn.addEventListener('click', function (event) {
      event.stopPropagation();
      core.closeTerminal(record.id);
    });
    var tab = core.el('button', {
      class: 'focus-tab' + (record.id === activeId ? ' is-active' : '') +
        (record.broadcastSelected ? ' is-broadcast-selected' : ''),
      type: 'button',
      'aria-pressed': record.id === activeId ? 'true' : 'false',
      title: record.networkText ?
        name + ' · ' + record.networkText.textContent : name,
      'aria-label': core.t('focusActivateTab', { name: name })
    }, [dot, core.el('span', { text: name }), closeBtn]);
    tab.dataset.record = record.id;
    tab.addEventListener('click', function () { activate(record); });
    return tab;
  }

  function buildChipPin(group) {
    var cluster = window.WSSH_CLUSTER;
    var pinned = !!group.pinned;
    var label = core.t(pinned ? 'unpinGroup' : 'pinGroup');
    var pin = core.el('button', {
      class: 'focus-chip-pin' + (pinned ? ' is-active' : ''),
      type: 'button', title: label, 'aria-label': label,
      'aria-pressed': pinned ? 'true' : 'false',
      html: pinned ? core.ICONS.pinActive : core.ICONS.pin
    });
    pin.addEventListener('click', function (event) {
      event.stopPropagation();
      if (cluster) { cluster.toggleGroupPin(group.id); }
    });
    return pin;
  }

  // Latency pongs (every 5 s per terminal) and cluster-mode keystrokes call
  // sync() constantly; rebuilding the tab strip each time replaces the node
  // under the pointer, which kills :hover and swallows clicks. Rebuild only
  // when what the tabs render actually changed, and refresh titles in place.
  var tabsSignature = '';

  function refreshTabTitles() {
    var tabs = els.tabs.querySelectorAll('.focus-tab[data-record]');
    Array.prototype.forEach.call(tabs, function (tab) {
      var record = recordById(tab.getAttribute('data-record'));
      if (!record) { return; }
      var name = record.displayName || record.hostname;
      tab.title = record.networkText ?
        name + ' · ' + record.networkText.textContent : name;
    });
  }

  function renderTabs() {
    var cluster = window.WSSH_CLUSTER;
    var parts = [activeId || ''];
    core.getGroups().forEach(function (group) {
      var members = recordsInGroup(group.id);
      if (!members.length) { return; }
      parts.push(group.id, group.name, group.pinned ? '1' : '0',
        core.groupColorValue(group));
      var diff = cluster ? cluster.getDiff(group.id) : [];
      members.forEach(function (record) {
        parts.push(
          record.id,
          record.displayName || record.hostname,
          record.state || 'connecting',
          record.broadcastSelected ? '1' : '0',
          cluster && cluster.isClusterTarget(record) ? '1' : '0',
          diff.indexOf(record.id) >= 0 ? '1' : '0'
        );
      });
    });
    var signature = parts.join('|');
    if (signature === tabsSignature) {
      refreshTabTitles();
      return;
    }
    tabsSignature = signature;
    var frag = document.createDocumentFragment();
    core.getGroups().forEach(function (group) {
      var members = recordsInGroup(group.id);
      if (!members.length) { return; }
      var section = document.createElement('div');
      section.className = 'focus-tab-group';
      section.style.setProperty('--group-color', core.groupColorValue(group));
      section.appendChild(core.el('span', {
        class: 'focus-group-chip', title: group.name
      }, [
        core.el('span', { class: 'group-color-dot', 'aria-hidden': 'true' }),
        core.el('span', { text: group.name }),
        buildChipPin(group)
      ]));
      members.forEach(function (record) {
        section.appendChild(buildTab(record));
      });
      frag.appendChild(section);
    });
    els.tabs.innerHTML = '';
    els.tabs.appendChild(frag);
  }

  function renderMainEmpty() {
    els.main.innerHTML = '';
    els.main.appendChild(core.el('div', { class: 'focus-empty' }, [
      core.el('strong', { text: core.t('focusEmpty') }),
      core.el('span', { text: core.t('focusEmptyHint') })
    ]));
  }

  function fillCommand(recordId, command) {
    var record = recordById(recordId);
    if (!record) {
      core.toast(core.t('networkOffline'), 'error');
      return;
    }
    var cluster = window.WSSH_CLUSTER;
    if (cluster) {
      // Routes through the cluster engine so the pending-line stays truthful.
      cluster.feed(record, command);
      return;
    }
    if (!core.sendToRecord(record, command)) {
      core.toast(core.t('networkOffline'), 'error');
    }
  }

  function activeGroup() {
    var activeId = core.getActiveTerminalId ? core.getActiveTerminalId() : null;
    var record = activeId ? core.getTerminals()[activeId] : null;
    return record ? core.groupById(record.group) : null;
  }

  function setSegmented(mode) {
    if (!els.clusterWidget) { return; }
    var buttons = els.clusterWidget.querySelectorAll('[data-cluster]');
    Array.prototype.forEach.call(buttons, function (button) {
      var active = button.getAttribute('data-cluster') === mode;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  function renderClusterPanel() {
    var cluster = window.WSSH_CLUSTER;
    if (!cluster || !els.clusterWidget) { return; }
    var group = activeGroup();
    if (!group) {
      els.clusterWidget.classList.add('is-disabled');
      setSegmented(null);
      els.clusterStatus.innerHTML = '';
      els.clusterStatus.appendChild(core.el('span', { text: core.t('clusterDisabled') }));
      els.clusterPending.hidden = true;
      return;
    }
    var status = cluster.getStatus(group.id);
    els.clusterWidget.classList.remove('is-disabled');
    setSegmented(status.on ? (status.selectedOnly ? 'selected' : 'all') : 'off');

    els.clusterStatus.innerHTML = '';
    if (status.running) {
      els.clusterStatus.appendChild(core.el('span', {
        text: core.t('clusterRunning', { index: status.index, total: status.total })
      }));
      var stop = core.el('button', {
        class: 'btn cluster-stop-btn', type: 'button', text: core.t('clusterStop')
      });
      stop.addEventListener('click', function () { cluster.stopRun(group.id); });
      els.clusterStatus.appendChild(stop);
    } else if (status.on) {
      els.clusterStatus.appendChild(core.el('span', {
        text: core.t('clusterSyncCount', { count: status.count })
      }));
      var diffCount = cluster.getDiff(group.id).length;
      if (diffCount) {
        els.clusterStatus.appendChild(core.el('span', {
          class: 'cluster-status-warn',
          text: core.t('clusterDiffCount', { count: diffCount })
        }));
      }
      if (status.fail) {
        els.clusterStatus.appendChild(core.el('span', {
          class: 'cluster-status-warn',
          text: core.t('clusterNotDelivered', { count: status.fail })
        }));
      }
    } else {
      els.clusterStatus.appendChild(core.el('span', { text: core.t('clusterIdle') }));
    }

    if (status.pending) {
      els.clusterPending.textContent = core.t('clusterPending') + ' ' + status.pending;
      els.clusterPending.hidden = false;
    } else {
      els.clusterPending.hidden = true;
    }
  }

  function renderDiff() {
    renderClusterPanel();
  }

  // ---- Sidebar tabs: command journal (execution history) vs broadcasts ---
  var sidebarTab = 'journal';
  var journalSignature = '';

  function setSidebarTab(tab) {
    sidebarTab = tab;
    // The two tabs share one container; a stale journal signature would
    // skip the re-render and leave the other tab's content in place.
    journalSignature = '';
    if (els.tabJournal) {
      els.tabJournal.classList.toggle('is-active', tab === 'journal');
      els.tabJournal.setAttribute('aria-selected', tab === 'journal' ? 'true' : 'false');
    }
    if (els.tabBroadcast) {
      els.tabBroadcast.classList.toggle('is-active', tab === 'broadcast');
      els.tabBroadcast.setAttribute('aria-selected', tab === 'broadcast' ? 'true' : 'false');
    }
    if (els.historyHint) { els.historyHint.hidden = tab !== 'broadcast'; }
    renderSidebar();
  }

  function renderSidebar() {
    if (els.historyHint) { els.historyHint.hidden = sidebarTab !== 'broadcast'; }
    if (sidebarTab === 'journal') { renderJournal(); } else { renderHistory(); }
  }

  // One row per command. Entries sharing the same command within a short
  // window (a broadcast round) collapse into a single expandable row; the
  // expanded panel lists every target host vertically with its status dot.
  var expandedJournalKey = null;

  function groupJournalItems(items) {
    var grouped = [];
    items.forEach(function (it) {
      var last = grouped[grouped.length - 1];
      var batchId = it.entry.batchId || null;
      var lastBatch = last ? (last.items[0].entry.batchId || null) : null;
      if (last && batchId && lastBatch && batchId === lastBatch) {
        last.items.push(it);
        if (it.entry.time > last.time) { last.time = it.entry.time; }
      } else if (last && !batchId && !lastBatch &&
          last.command === it.entry.command &&
          Math.abs(last.time - it.entry.time) <= 3000) {
        last.items.push(it);
        if (it.entry.time > last.time) { last.time = it.entry.time; }
      } else {
        grouped.push({ command: it.entry.command, time: it.entry.time, items: [it], batchId: batchId });
      }
    });
    // Expanded host lists are ordered by display name (D01-D45) for scanability.
    grouped.forEach(function (grp) {
      grp.items.sort(function (a, b) {
        var ra = recordById(a.recordId);
        var rb = recordById(b.recordId);
        var na = ra ? (ra.displayName || ra.hostname || a.recordId) : a.recordId;
        var nb = rb ? (rb.displayName || rb.hostname || b.recordId) : b.recordId;
        return na.localeCompare(nb, undefined, { numeric: true, sensitivity: 'base' });
      });
    });
    return grouped;
  }

  function journalDot(status) {
    var dot = core.el('span', { class: 'focus-journal-dot', 'aria-hidden': 'true' });
    if (status !== 'pending') { dot.dataset.exit = status; }
    return dot;
  }

  function journalItemStatus(diffInfo, it) {
    // Persisted verdict takes precedence: history must not be recolored by a later live diff.
    if (it.entry.diverged === true) { return 'warn'; }
    if (it.entry.diverged === false) {
      var code = it.entry.exitCode;
      if (code === null || code === undefined) { return 'pending'; }
      return code === 0 ? 'ok' : 'err';
    }
    // Live diff only applies to the current batch (same batchId) or to entries without a batchId
    // that share the same command (legacy fallback).
    if (diffInfo.batchId && it.entry.batchId) {
      if (diffInfo.batchId !== it.entry.batchId) {
        var code2 = it.entry.exitCode;
        if (code2 === null || code2 === undefined) { return 'pending'; }
        return code2 === 0 ? 'ok' : 'err';
      }
    }
    if (diffInfo.command === it.entry.command &&
        diffInfo.ids.indexOf(it.recordId) >= 0) {
      return 'warn';
    }
    var code = it.entry.exitCode;
    if (code === null || code === undefined) { return 'pending'; }
    return code === 0 ? 'ok' : 'err';
  }

  function isMainEntry(it) {
    var batchId = it.entry.batchId;
    if (!batchId) { return false; }
    var mainId = null;
    if (core.getBatchMain) { mainId = core.getBatchMain(batchId); }
    else if (window.WSSH_CLUSTER && window.WSSH_CLUSTER.getBatchMain) {
      mainId = window.WSSH_CLUSTER.getBatchMain(batchId);
    }
    return mainId === it.recordId;
  }

  function journalHostRow(diffInfo, it) {
    var rec = recordById(it.recordId);
    var name = rec ? (rec.displayName || rec.hostname) : it.recordId;
    var badge = null;
    if (isMainEntry(it)) {
      badge = core.el('span', { class: 'focus-journal-main', text: '主控' });
    }
    var row = core.el('button', {
      class: 'focus-journal-expand-item' + (badge ? ' is-main' : ''), type: 'button',
      title: it.entry.command,
      'aria-label': core.t('focusJournalLocate', { name: name })
    }, [
      journalDot(journalItemStatus(diffInfo, it)),
      core.el('span', { class: 'focus-journal-host', text: name }),
      badge
    ]);
    row.addEventListener('click', function (event) {
      event.stopPropagation();
      locateJournalEntry(it.recordId, it.entry);
    });
    return row;
  }

  function renderJournal() {
    var record = activeRecord();
    var group = record ? core.groupById(record.group) : null;
    var items = group ? core.getGroupJournal(group.id) : [];
    var cluster = window.WSSH_CLUSTER;
    var diffInfo = cluster && group ?
      cluster.getDiffInfo(group.id) : { command: '', ids: [] };
    var signature = items.map(function (it) {
      return it.recordId + ':' + it.entry.id + ':' +
        (it.entry.exitCode === null ? 'p' : it.entry.exitCode) + ':' +
        (it.entry.diverged ? 'w' : '-') + ':' + (it.entry.batchId || '');
    }).join('|') + '@' + diffInfo.command + ':' + diffInfo.ids.join(',') +
      '@' + (expandedJournalKey || '');
    if (signature === journalSignature) { return; }
    journalSignature = signature;
    els.history.innerHTML = '';
    if (!items.length) {
      els.history.appendChild(core.el('div', {
        class: 'focus-history-empty', text: core.t('focusJournalEmpty')
      }));
      return;
    }
    var pad = function (n) { return n < 10 ? '0' + n : n; };
    var list = core.el('div', { class: 'focus-history-list' });
    groupJournalItems(items).forEach(function (grp) {
      var d = new Date(grp.time);
      var timeText = pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());

      if (grp.items.length === 1) {
        var it = grp.items[0];
        var rec = recordById(it.recordId);
        var name = rec ? (rec.displayName || rec.hostname) : it.recordId;
        var badge = isMainEntry(it) ? core.el('span', { class: 'focus-journal-main', text: '主控' }) : null;
        var single = core.el('button', {
          class: 'focus-history-item focus-journal-item' + (badge ? ' is-main' : ''), type: 'button',
          title: name + ' · ' + timeText + '\n' + grp.command,
          'aria-label': core.t('focusJournalLocate', { name: name })
        }, [
          journalDot(journalItemStatus(diffInfo, it)),
          core.el('span', { class: 'focus-journal-host', text: name }),
          badge,
          core.el('span', { class: 'focus-history-command', text: grp.command })
        ]);
        single.addEventListener('click', function () {
          locateJournalEntry(it.recordId, it.entry);
        });
        list.appendChild(single);
        return;
      }

      // Broadcast round: aggregate status (worst wins) and an elevated,
      // vertically expanding panel with one row per target host.
      var key = 'g' + grp.items[0].entry.id;
      var expanded = expandedJournalKey === key;
      var aggregate = 'ok';
      grp.items.forEach(function (it) {
        var status = journalItemStatus(diffInfo, it);
        if (status === 'warn') { aggregate = 'warn'; }
        else if (status === 'err' && aggregate !== 'warn') { aggregate = 'err'; }
        else if (status === 'pending' && aggregate === 'ok') { aggregate = 'pending'; }
      });
      var mainName = null;
      var batchId = grp.items[0].entry.batchId || null;
      if (batchId) {
        var mainId = core.getBatchMain ? core.getBatchMain(batchId) :
          (window.WSSH_CLUSTER && window.WSSH_CLUSTER.getBatchMain ? window.WSSH_CLUSTER.getBatchMain(batchId) : null);
        if (mainId) {
          var mainRec = recordById(mainId);
          mainName = mainRec ? (mainRec.displayName || mainRec.hostname) : mainId;
        }
      }
      var header = core.el('button', {
        class: 'focus-history-item focus-journal-item focus-journal-group' +
          (expanded ? ' is-open' : ''),
        type: 'button',
        title: (mainName ? '主控 ' + mainName + ' · ' : '') + timeText + '\n' + grp.command,
        'aria-expanded': expanded ? 'true' : 'false'
      }, [
        journalDot(aggregate),
        core.el('span', {
          class: 'focus-journal-count',
          text: core.t('focusJournalHosts', { count: grp.items.length })
        }),
        mainName ? core.el('span', { class: 'focus-journal-main', text: '主控 ' + mainName }) : null,
        core.el('span', { class: 'focus-history-command', text: grp.command }),
        core.el('span', { class: 'focus-journal-caret', text: '▸', 'aria-hidden': 'true' })
      ]);
      header.addEventListener('click', function () {
        expandedJournalKey = expanded ? null : key;
        journalSignature = '';
        renderJournal();
      });
      list.appendChild(header);

      var panel = core.el('div', {
        class: 'focus-journal-expand' + (expanded ? ' is-open' : '')
      });
      grp.items.forEach(function (it) { panel.appendChild(journalHostRow(diffInfo, it)); });
      if (expanded) {
        panel.style.maxHeight = (grp.items.length * 32 + 10) + 'px';
      }
      list.appendChild(panel);
    });
    els.history.appendChild(list);
  }

  // Rows only ever shift down (scrollback trims from the top), so the true
  // position is at or above the stored row: search upward for the command
  // echo. Long commands fall back to matching their 40-char tail.
  function findJournalRow(buffer, fromRow, text) {
    var start = Math.min(fromRow >= 0 ? fromRow : buffer.length - 1, buffer.length - 1);
    for (var r = start; r >= 0; r -= 1) {
      var line = buffer.getLine(r);
      if (!line) { continue; }
      var content = line.translateToString(true).replace(/\s+$/, '');
      if (content.slice(-text.length) === text) { return r; }
    }
    return -1;
  }

  function locateJournalEntry(recordId, entry) {
    var record = recordById(recordId);
    if (!record || !record.term) {
      core.toast(core.t('networkOffline'), 'error');
      return;
    }
    var wasActive = activeId === recordId;
    if (!wasActive) { activate(record); }
    var doScroll = function () {
      var buffer = record.term.buffer &&
        (record.term.buffer.active || record.term.buffer);
      var found = buffer ? findJournalRow(buffer, entry.row, entry.command) : -1;
      if (found < 0 && buffer && entry.command.length > 40) {
        found = findJournalRow(buffer, entry.row, entry.command.slice(-40));
      }
      if (found < 0) {
        core.toast(core.t('focusJournalLost'), 'error');
        return;
      }
      // Highlight the command AND its output: the block runs from the echo
      // row to the row above the next prompt (buffer end when this is the
      // latest command). Without a known prompt only the command line can
      // be delimited.
      var endRow = found;
      if (buffer && record.promptText) {
        for (var r = found + 1; r < buffer.length; r += 1) {
          var nextLine = buffer.getLine(r);
          if (!nextLine) { break; }
          if (nextLine.translateToString(true).indexOf(record.promptText) === 0) {
            break;
          }
          endRow = r;
        }
      }
      try {
        record.term.scrollToLine(found);
        // scrollToLine clamps at the bottom, so the target row is not
        // necessarily viewport row 0 — derive the real viewport row.
        var viewRow = found - (buffer.viewportY || 0);
        if (viewRow < 0) { viewRow = 0; }
        var rows = endRow - found + 1;
        record.term.select(0, viewRow, rows * record.term.cols);
      } catch (e) { /* noop */ }
    };
    // A freshly hosted card is re-fitted and scrolled to bottom one frame
    // later (and once more at ~300 ms); scroll only after that settles.
    if (wasActive) { doScroll(); } else { window.setTimeout(doScroll, 350); }
  }

  function renderHistory() {
    var record = activeRecord();
    var group = record ? core.groupById(record.group) : null;
    els.history.innerHTML = '';
    var items = group ? core.getBroadcastHistory(group.id) : [];
    if (!items.length) {
      els.history.appendChild(core.el('div', {
        class: 'focus-history-empty', text: core.t('focusHistoryEmpty')
      }));
      return;
    }
    var list = core.el('div', { class: 'focus-history-list' });
    items.forEach(function (command) {
      var id = record.id;
      var item = core.el('button', {
        class: 'focus-history-item', type: 'button',
        title: command,
        'aria-label': core.t('focusActivateTab', { name: command })
      }, [core.el('span', { class: 'focus-history-command', text: command })]);
      item.addEventListener('click', function () { fillCommand(id, command); });
      list.appendChild(item);
    });
    els.history.appendChild(list);
  }

  window.WSSH_FOCUS = {
    enter: function () {
      if (!ready()) { return; }
      this.sync();
    },
    leave: function () {
      if (!ready()) { return; }
      var record = activeRecord();
      if (record) { returnCard(record); }
      activeId = null;
      core.setActiveTerminalId(null);
      els.main.innerHTML = '';
      els.tabs.innerHTML = '';
      els.history.innerHTML = '';
      tabsSignature = '';
      journalSignature = '';
      expandedJournalKey = null;
    },
    sync: function () {
      if (!ready() || !core.isFocusMode()) { return; }
      ensureActive();
      var record = activeRecord();
      if (record && record.card.parentNode !== els.main) {
        els.main.innerHTML = '';
        hostCard(record);
      }
      renderTabs();
      renderSidebar();
      renderDiff();
    },
    reactivate: function (id) {
      if (!ready()) { return; }
      var record = recordById(id);
      if (!record || activeId !== id) { return; }
      reflowTerminalBuffer(record);
      els.main.appendChild(record.card);
      window.requestAnimationFrame(function () {
        refreshTerminalAfterMove(record);
        if (record.term) { record.term.focus(); }
      });
    }
  };
})();
