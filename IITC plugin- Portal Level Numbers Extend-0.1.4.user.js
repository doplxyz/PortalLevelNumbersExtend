// ==UserScript==
// @author         IITC User (Add-on logic)
// @name           IITC plugin: Portal Level Numbers Extend
// @category       d.org.addon
// @version        0.1.4
// @description    [0.1.4]【要:元プラグイン】Portal Level Numbersの機能を拡張し、表示レベル(L1-L8)を個別にON/OFFできる機能を追加します。
// @id             portal-level-numbers-extend
// @namespace      https://github.com/IITC-CE/ingress-intel-total-conversion
// @match          https://intel.ingress.com/*
// @match          https://intel-x.ingress.com/*
// @grant          none
// ==/UserScript==

function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

plugin_info.buildName = 'release';
plugin_info.dateTimeVersion = '2026-01-25-040000';
plugin_info.pluginId = 'portal-level-numbers-extend';

// -----------------------------------------------------------------------
// PLUGIN START
// -----------------------------------------------------------------------

window.plugin.portalLevelNumbersExtend = function () {};
var self = window.plugin.portalLevelNumbersExtend;

// 設定保存用キー
const KEY_CONFIG = 'plugin-portal-level-numbers-extend-config';

// デフォルト設定 (L7, L8のみ有効)
self.config = {
  1: false,
  2: false,
  3: false,
  4: false,
  5: false,
  6: false,
  7: true,
  8: true
};

// 設定読み込み
self.loadSettings = function() {
  try {
    var saved = localStorage.getItem(KEY_CONFIG);
    if (saved) {
      self.config = JSON.parse(saved);
    }
  } catch(e) {
    console.error('PLN Extend: Load Error', e);
  }
};

// 設定保存
self.saveSettings = function() {
  try {
    localStorage.setItem(KEY_CONFIG, JSON.stringify(self.config));
  } catch(e) {
    console.error('PLN Extend: Save Error', e);
  }
};

// 元プラグインの関数をフックする
self.patchOriginalPlugin = function(retryCount) {
  if (retryCount === undefined) retryCount = 0;

  // 元プラグイン(Portal Level Numbers)が存在するかチェック
  if (window.plugin.portalLevelNumbers && window.plugin.portalLevelNumbers.addLabel) {

      // 既にパッチ済みなら何もしないが、念の為再描画だけかける
      if (window.plugin.portalLevelNumbers.originalAddLabel) {
           if(window.plugin.portalLevelNumbers.updatePortalLabels) {
               window.plugin.portalLevelNumbers.updatePortalLabels();
           }
           return;
      }

      // 元の addLabel 関数を退避
      window.plugin.portalLevelNumbers.originalAddLabel = window.plugin.portalLevelNumbers.addLabel;

      // 新しい addLabel で上書き (モンキーパッチ)
      window.plugin.portalLevelNumbers.addLabel = function(guid, latLng) {
        var p = window.portals[guid];
        if (!p || !p.options) return;

        var level = parseInt(p.options.level);

        // --- フィルター判定 ---
        if (self.config[level] === false) {
          // 設定でOFFの場合：
          // 既存のラベルが表示されている可能性があるので「削除」を実行する
          if (window.plugin.portalLevelNumbers.removeLabel) {
              window.plugin.portalLevelNumbers.removeLabel(guid);
          }
          // ここでreturnすることで、新しいラベルの描画(originalAddLabel)を阻止する
          return;
        }

        // フィルターを通過（ON）の場合：
        // 元の描画処理を呼び出す
        window.plugin.portalLevelNumbers.originalAddLabel.call(this, guid, latLng);
      };

      console.log('Portal Level Numbers Extend: Patched successfully.');

      // パッチ適用直後に画面を更新してフィルタを適用
      if(window.plugin.portalLevelNumbers.updatePortalLabels) {
          window.plugin.portalLevelNumbers.updatePortalLabels();
      }

  } else {
      // まだ元プラグインがロードされていない場合、最大10秒間リトライする
      if (retryCount < 20) {
          setTimeout(function() {
              self.patchOriginalPlugin(retryCount + 1);
          }, 500);
      }
  }
};

// 設定UI
self.openSettings = function() {
  var html = '<div class="pln-settings" style="min-width:250px;">';
  html += '<div style="margin-bottom:10px; font-weight:bold; color:#ffce00;">PortalLevelEX Settings</div>';
  html += '<table style="width:100%; text-align:center; border-collapse:collapse;">';
  html += '<tr style="border-bottom:1px solid #555;"><th>Lvl</th><th>Show</th></tr>';

  for (var i = 1; i <= 8; i++) {
    var checked = self.config[i] ? 'checked' : '';
    html += '<tr style="border-bottom:1px solid #333;">';
    html += '<td style="padding:8px;">L' + i + '</td>';
    html += '<td style="padding:8px;"><input type="checkbox" class="pln-checkbox" data-lvl="' + i + '" ' + checked + ' style="transform:scale(1.5);"></td>';
    html += '</tr>';
  }
  html += '</table>';
  html += '<div style="margin-top:10px; font-size:0.8em; color:#aaa;">※Requires: Portal Level Numbers plugin</div>';
  html += '</div>';

  window.dialog({
    html: html,
    id: 'plugin-portal-level-numbers-extend-ui',
    title: 'PortalLevelEX',
    width: 'auto',
    closeCallback: function() {
      self.saveSettings();
      // ダイアログを閉じた時にも更新
      if(window.plugin.portalLevelNumbers.updatePortalLabels) {
          window.plugin.portalLevelNumbers.updatePortalLabels();
      }
    }
  });

  $('.pln-checkbox').on('change', function() {
    var lvl = $(this).data('lvl');
    self.config[lvl] = this.checked;
    self.saveSettings();

    // 即時反映: 遅延なしで更新関数を呼び出す
    if(window.plugin.portalLevelNumbers.updatePortalLabels) {
        window.plugin.portalLevelNumbers.updatePortalLabels();
    }
  });
};

var setup = function () {
  self.loadSettings();

  // Toolboxメニュー追加 (名称: PortalLevelEX)
  $('#toolbox').append('<a onclick="window.plugin.portalLevelNumbersExtend.openSettings();return false;">PortalLevelEX</a>');

  self.patchOriginalPlugin();
};

setup.info = plugin_info;
if(!window.bootPlugins) window.bootPlugins = [];
window.bootPlugins.push(setup);
if(window.iitcLoaded && typeof setup === 'function') setup();
}

var script = document.createElement('script');
var info = {};
if (typeof GM_info !== 'undefined' && GM_info && GM_info.script) info.script = { version: GM_info.script.version, name: GM_info.script.name, description: GM_info.script.description };
script.appendChild(document.createTextNode('('+ wrapper +')('+JSON.stringify(info)+');'));
(document.body || document.head || document.documentElement).appendChild(script);
