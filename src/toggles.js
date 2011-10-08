goog.provide('awesomeCanvas.Toggles');

/**
 * @type {Object.<string, {
 *   active: boolean,
 *   activate: function(awesomeCanvas.Editor),
 *   deactivate: function(awesomeCanvas.Editor)
 * }>}
 */
awesomeCanvas.Toggles = {};

awesomeCanvas.Toggles['grid'] = {
  active: false,
  activate: function (editor) {
    awesomeCanvas.Editor.env.grid = true;
    editor.grid_layer.canvas.style.display = 'block';
  },
  deactivate: function (editor) {
    awesomeCanvas.Editor.env.grid = false;
    editor.grid_layer.canvas.style.display = 'none';
  }
};

awesomeCanvas.Toggles['wacom-plugin'] = {
  active: true,
  activate: function (editor) {
    awesomeCanvas.Editor.env.tablet_support = true;
  },
  deactivate: function (editor) {
    awesomeCanvas.Editor.env.tablet_support = false;
  }
};
