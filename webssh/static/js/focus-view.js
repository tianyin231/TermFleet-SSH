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
    renderHistory();
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
      renderHistory();
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
