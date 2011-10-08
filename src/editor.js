goog.require('goog.dom');
goog.require('goog.dom.classes');
goog.require('goog.dom.dataset');
goog.require('goog.events');
goog.require('goog.events.EventHandler');
goog.require('goog.events.EventTarget');
goog.require('goog.events.BrowserEvent');
goog.require('goog.debug.ErrorHandler');
goog.require('awesomeCanvas.Tools');
goog.require('awesomeCanvas.Toggles');

goog.provide('awesomeCanvas.Editor');


/**
 * @constructor
 * @param {Element} container
 * @param {!Object=} params
 */
awesomeCanvas.Editor = function (container, params) {
  this.params = {
    background_color: '#FFFFFF',
    grid_color: 'rgba(0, 0, 0, 0.05)',
    grid_step: 20,
    default_swatch: '#000000',
    default_tool: 'brush'
  };
  this.tools = [ 'brush', 'eraser', 'line', 'rectangle', 'ellipse', 'marquee' ];
  this.swatches = ['#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF'];
  this.wacom_defaults = {
    'pressure': 1
  };

  this.container = container;
  if (params) {
    Object.keys(params).forEach(function (key) {
      this.params[key] = params[key];
    }, this);
  }
};

/**
 * Merges all layers into a single image and provides the callback
 *   function with the merged image as well as an array of layers
 * @param {function(
 *   Array.<{ color: ?string, data: ?string }>=
 * )} callback The callback function
 *   to which to pass the data. The function will get the output
 *   as an array of layers with the first iter being all layers merged into one.
 *   The layers are expressed as data URIs and background color strings.
 */
awesomeCanvas.Editor.prototype.getState = function (callback) {
  var w = this.area.clientWidth;
  var h = this.area.clientHeight;
  var layers = this.layers;
  var layer_count = layers.length;

  var canvas = goog.dom.createDom('canvas', {
    'width': w,
    'height': h
  });
  var ctx = canvas.getContext('2d');
  var output = [];

  var available = [];
  var last_drawn_index = 0;
  var drawAvailable = function () {
    var img;
    while (img = available[last_drawn_index + 1]) {
      ctx.drawImage(img, 0, 0);
      last_drawn_index += 1;
    }

    if (last_drawn_index + 1 === layer_count) {
      output.unshift({ 'data': canvas.toDataURL() });
      callback(output);
    }
  };

  layers.forEach(function (layer, i) {
    if (layer.background_color) {
      ctx.fillStyle = layer.background_color;
      ctx.fillRect(0, 0, w, h);
      output[i] = { 'color': layer.background_color };
    } else {
      var data = layer.canvas.toDataURL();
      var img = new Image();
      img.src = data;
      img.layer_index = i;
      img.onload = function () {
        available[i] = img;
        output[i] = { 'data': data };
        drawAvailable();
      };
    }
  });
};

/**
 * @param {!Object} coords Coordinates to align to the grid
 * @return {!Object}
 */
awesomeCanvas.Editor.prototype.applyGridToCoords = function (coords) {
  var step = this.params.grid_step;
  var x = coords[0];
  var y = coords[1];
  var a = x % step;
  var b = y % step;
  if (a < step / 2) {
    if (b < step / 2) {
      x -= a;
      y -= b;
    } else {
      x -= a;
      y += step - b;
    }
  } else {
    if (b < step / 2) {
      x += step - a;
      y -= b;
    } else {
      x += step - a;
      y += step - b;
    }
  }
  return [x, y];
};
awesomeCanvas.Editor.prototype.build = function () {
  this.container.innerHTML = '';
  this.initWacomPlugin_();
  this.buildArea_();
  this.buildToolbar_();
  this.buildSidebar_();
  this.buildLayers_();
  this.applyToggleDefaults_();
  this.addListeners_();

  this.activateSwatch(this.params.default_swatch);
  this.activateTool(this.params.default_tool);
};
awesomeCanvas.Editor.prototype.buildArea_ = function () {
  this.area = goog.dom.createDom('div', {
    'class': 'area'
  });
  goog.dom.appendChild(this.container, this.area);
};
awesomeCanvas.Editor.prototype.buildToolbar_ = function () {
  this.toolbar = goog.dom.createDom('div', {
    'class': 'sidebar'
  });
  goog.dom.insertChildAt(this.container, this.toolbar, 0);
  this.buildToolPanel_();
  this.buildTogglePanel_();
};
awesomeCanvas.Editor.prototype.buildToolPanel_ = function () {
  this.tool_panel = goog.dom.createDom('ul', {
    'class': 'tools'
  });
  goog.dom.appendChild(this.toolbar, this.tool_panel);
  goog.events.listen(this.tool_panel, goog.events.EventType.CLICK, function (e) {
    var target = e.target;
    if (target.tagName !== 'LI') {
      return;
    }
    this.activateTool(goog.dom.dataset.get(target, 'tool'));
  }, false, this);
  this.buildToolControls_();
};
awesomeCanvas.Editor.prototype.buildTogglePanel_ = function () {
  this.toggle_panel = goog.dom.createDom('ul', {
    'class': 'toggles'
  });
  goog.dom.appendChild(this.toolbar, this.toggle_panel);
  goog.events.listen(this.toggle_panel, goog.events.EventType.CLICK, function (e) {
    var target = e.target;
    if (target.tagName !== 'LI') {
      return;
    }
    this.toggle(goog.dom.dataset.get(target, 'toggle'));
  }, false, this);
  this.buildToggleControls_();
};
awesomeCanvas.Editor.prototype.buildSidebar_ = function () {
  this.sidebar = goog.dom.createDom('div', {
    'class': 'sidebar'
  });
  goog.dom.appendChild(this.container, this.sidebar);
  this.buildSwatchPanel_();
  this.buildLayerPanel_();
  this.buildOptionToolbar_();
};
awesomeCanvas.Editor.prototype.buildSwatchPanel_ = function () {
  this.swatch_panel = goog.dom.createDom('div', {
    'class': 'swatches'
  });
  goog.dom.appendChild(this.sidebar, this.swatch_panel);
  var list = goog.dom.createDom('ul');
  goog.dom.appendChild(this.swatch_panel, list);

  var swatches = this.swatches;
  for (var i = 0, ii = swatches.length; i < ii; ++i) {
    var item = goog.dom.createDom('li');
    item.style.backgroundColor = swatches[i];
    goog.dom.dataset.set(item, 'color', swatches[i]);
    goog.dom.appendChild(list, item);
  }

  goog.events.listen(list, goog.events.EventType.CLICK, function (e) {
    var target;
    target = e.target;
    if (target.tagName !== 'LI') {
      return;
    }
    this.activateSwatch(goog.dom.dataset.get(target, 'color'));
  }, false, this);
};
awesomeCanvas.Editor.prototype.buildLayerPanel_ = function () {
  this.layer_panel = goog.dom.createDom('div', {
    'class': 'layers'
  });
  goog.dom.appendChild(this.sidebar, this.layer_panel);
  var list = goog.dom.createDom('ul');
  goog.dom.appendChild(this.layer_panel, list);
  goog.events.listen(list, goog.events.EventType.CLICK, function (e) {
    var target = e.target;
    switch (target.tagName) {
      case 'LI':
        this.activateLayer(goog.dom.dataset.get(target, 'index'));
        break;
      case 'SPAN':
        if (goog.dom.classes.has(target, 'lock')) {
          var index = goog.dom.dataset.get(target.parentNode, 'index');
          var layer = this.layers[index];
          if (layer.locked) {
            this.unlockLayer(index);
          } else {
            this.lockLayer(index);
          }
        }
        break;
    }
  }, false, this);
  this.buildLayerPanelToolbar_();
};
awesomeCanvas.Editor.prototype.buildLayerPanelToolbar_ = function () {
  var self = this;
  var toolbar = goog.dom.createDom('ul', {
    'class': 'toolbar'
  });
  goog.dom.appendChild(this.layer_panel, toolbar);
  var button = goog.dom.createDom('li', {
    'class': 'create'
  });
  button.setAttribute('title', 'New layer');
  goog.events.listen(button, goog.events.EventType.CLICK, function (e) {
    this.createEmptyLayer();
  }, false, this);
  goog.dom.appendChild(toolbar, button);
  button = goog.dom.createDom('li', {
    'class': 'delete'
  });
  button.setAttribute('title', 'Delete layer');
  goog.events.listen(button, goog.events.EventType.CLICK, function (e) {
    this.deleteActiveLayer();
  }, false, this);
  goog.dom.appendChild(toolbar, button);
};
awesomeCanvas.Editor.prototype.buildOptionToolbar_ = function () {
  this.options = {};
  this.option_panel = goog.dom.createDom('div', {
    'class': 'options'
  });
  goog.dom.appendChild(this.sidebar, this.option_panel);
  var list = goog.dom.createDom('ul');
  goog.dom.appendChild(this.option_panel, list);
  goog.dom.appendChild(list, this.buildSizeControl_());
};

/**
 * @return {Element}
 */
awesomeCanvas.Editor.prototype.buildSizeControl_ = function () {
  var self = this;
  var option = goog.dom.createDom('li', {
    'class': 'size'
  });
  var control = goog.dom.createDom('input', {
    'type': 'range',
    'min': 2,
    'max': 50,
    'value': 1
  });
  goog.dom.appendChild(option, control);
  Object.defineProperty(this.options, 'size', {
    get: function () {
      return control.value;
    }
  });
  goog.events.listen(control, goog.events.EventType.CHANGE, function (e) {
    this.setActiveToolSize(control.value);
  }, false, this);
  return option;
};
awesomeCanvas.Editor.prototype.buildToolControls_ = function () {
  this.tool_controls = {};
  var tool_keys = this.tools;
  var tools = awesomeCanvas.Tools || {};
  tool_keys.forEach(function (key) {
    var tool = tools[key];
    var control = goog.dom.createDom('li', {
      'title': tool.title
    });
    goog.dom.dataset.set(control, 'tool', key);
    goog.dom.appendChild(this.tool_panel, control);
    this.tool_controls[key] = control;
    if (tool.listeners && typeof tool.listeners.init === 'function') {
      tool.listeners.init.call(tool, this, control, null);
    }
  }, this);
};
awesomeCanvas.Editor.prototype.buildToggleControls_ = function () {
  this.toggles = {};
  this.toggle_controls = {};

  var toggles = awesomeCanvas.Toggles;
  Object.keys(toggles || {}).forEach(function (key) {
    var toggle = toggles[key];
    var control = goog.dom.createDom('li', {
      'title': toggle.title
    });
    goog.dom.dataset.set(control, 'toggle', key);
    goog.dom.appendChild(this.toggle_panel, control);
    this.toggle_controls[key] = control;
  }, this);
};
awesomeCanvas.Editor.prototype.applyToggleDefaults_ = function () {
  var toggles = awesomeCanvas.Toggles;
  Object.keys(toggles || {}).forEach(function (key) {
    var toggle = toggles[key];
    this.toggle(key, toggle.active);
  }, this);
}
awesomeCanvas.Editor.prototype.buildSwatchControls_ = function () {
  var swatches = this.swatches;
  swatches.forEach(function (swatch) {
    var control = goog.dom.createDom('li');
    goog.dom.dataset.set(control, 'swatch', swatch);
    control.style.backgroundColor = swatch;
    goog.dom.appendChild(this.swatch_panel.querySelector('ul'), control);
  });
};
awesomeCanvas.Editor.prototype.buildLayers_ = function () {
  this.layers = [];
  this.createBackgroundLayer_();
  this.createGridLayer_();
  this.createTempLayer_();
  this.createEmptyLayer();
};
awesomeCanvas.Editor.prototype.createBackgroundLayer_ = function () {
  var self = this;

  this.area.style.backgroundColor = this.params.background_color;
  var layer = {
    background_color: this.params.background_color
  };
  layer.index = -1 + this.layers.push(layer);
  this.background_layer = layer;

  var panel_item = this.createLayerPanelItem_();
  goog.dom.dataset.set(panel_item, 'index', layer.index);
  goog.dom.classes.add(panel_item, 'background');
  panel_item.querySelector('.title').innerHTML = 'Background layer';
  goog.events.listen(panel_item, goog.events.EventType.MOUSEOVER, function (e) {
    if (!self.dragged_swatch || self.background_layer.locked) {
      return;
    }
    goog.dom.classes.add(this, 'swatch-change');
  });
  goog.events.listen(panel_item, goog.events.EventType.MOUSEOUT, function (e) {
    if (!self.dragged_swatch || self.background_layer.locked) {
      return;
    }
    goog.dom.classes.remove(this, 'swatch-change');
  });
  var color_node = goog.dom.createDom('span', {
    'class': 'swatch'
  });
  color_node.style.backgroundColor = this.params.background_color;
  goog.dom.appendChild(panel_item, color_node);
};
awesomeCanvas.Editor.prototype.createGridLayer_ = function () {
  var self = this;
  var w = this.area.clientWidth;
  var h = this.area.clientHeight;
  var canvas = goog.dom.createDom('canvas', {
    'width': w,
    'height': h,
    'transparent': 'true',
    'class': 'grid'
  });
  goog.dom.insertChildAt(this.area, canvas, 0);
  this.grid_layer = {
    canvas: canvas,
    context: canvas.getContext('2d')
  };
  this.drawGrid_();
};
awesomeCanvas.Editor.prototype.drawGrid_ = function () {
  var ctx = this.grid_layer.context;
  var step = this.params.grid_step;
  var w = this.grid_layer.canvas.width;
  var h = this.grid_layer.canvas.height;
  ctx.lineWidth = 2;
  ctx.strokeStyle = this.params.grid_color;
  ctx.beginPath();
  for (var x = 0; (0 <= w ? x < w : x > w); (0 <= w ? x += 1 : x -= 1)) {
    if (x % step === 0) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
    }
  }
  for (var y = 0; (0 <= h ? y < h : y > h); (0 <= h ? y += 1 : y -= 1)) {
    if (y % step === 0) {
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
  }
  ctx.closePath();
  ctx.stroke();
};
awesomeCanvas.Editor.prototype.createTempLayer_ = function () {
  var canvas = goog.dom.createDom('canvas', {
    'width': this.area.clientWidth,
    'height': this.area.clientHeight,
    'transparent': 'true',
    'class': 'temp'
  });
  goog.dom.appendChild(this.area, canvas);
  this.temp_layer = {
    canvas: canvas,
    context: canvas.getContext('2d')
  };
};
awesomeCanvas.Editor.prototype.createEmptyLayer = function () {
  var canvas = goog.dom.createDom('canvas', {
    'width': this.area.clientWidth,
    'height': this.area.clientHeight,
    'transparent': 'true'
  });
  var el = this.area.querySelector('.selection-content');
  if (!el) {
    goog.dom.appendChild(this.area, canvas);
  } else {
    goog.dom.insertSiblingBefore(canvas, el);
  }
  var layer = {
    canvas: canvas,
    context: canvas.getContext('2d')
  };
  layer.index = -1 + this.layers.push(layer);
  var panel_item = this.createLayerPanelItem_();
  panel_item.querySelector('.title').innerHTML = 'New layer';
  goog.dom.dataset.set(panel_item, 'index', layer.index);
  this.activateLayer(layer.index);
};
awesomeCanvas.Editor.prototype.createLayerPanelItem_ = function () {
  var panel_item = goog.dom.createDom('li');
  goog.dom.insertChildAt(this.layer_panel.querySelector('ul'), panel_item, 0);
  var title_node = goog.dom.createDom('span', {
    'class': 'title'
  });
  goog.dom.appendChild(panel_item, title_node);
  var lock_node = goog.dom.createDom('span', {
    'class': 'lock'
  });
  goog.dom.appendChild(panel_item, lock_node);
  return panel_item;
};
awesomeCanvas.Editor.prototype.addListeners_ = function () {
  var self = this;
  goog.events.listen(this.area, goog.events.EventType.MOUSEDOWN, function (e) {
    e.preventDefault();
    awesomeCanvas.Editor.env.mousedown = true;
    if (this.active_layer.locked || self.active_layer.canvas === undefined) {
      this.area.style.cursor = 'not-allowed';
      return false;
    }
    awesomeCanvas.Editor.env.drawing = true;
    e = this.processEvent(e);
    var tool = awesomeCanvas.Tools[this.active_tool];
    if (typeof self.tool_listeners.mousedown === 'function') {
      this.tool_listeners.mousedown.call(tool, this, e, this.active_layer.context);
    }
    this.e_ = e;
    return false;
  }, false, this);
  goog.events.listen(this.area, goog.events.EventType.MOUSEUP, function (e) {
    if (!awesomeCanvas.Editor.env.mousedown) {
      return;
    }
    awesomeCanvas.Editor.env.mousedown = false;
    var tool = awesomeCanvas.Tools[this.active_tool];
    if (this.active_layer.locked) {
      this.area.style.cursor = tool.cursor || 'default';
    }
    e = this.processEvent(e);
    if (typeof this.tool_listeners.mouseup === 'function') {
      this.tool_listeners.mouseup.call(tool, this, e, this.active_layer.context);
    }
    this.e_ = e;
  }, false, this);
  goog.events.listen(window, goog.events.EventType.MOUSEMOVE, function (e) {
    if (!awesomeCanvas.Editor.env.mousedown || this.active_layer.locked) {
      return;
    }
    if (awesomeCanvas.Editor.env.drawing) {
      e.preventDefault();
    }
    e = this.processEvent(e);
    if (typeof this.tool_listeners.mousemove === 'function') {
      this.tool_listeners.mousemove.call(this.active_tool, this, e, this.active_layer.context);
    }
    this.e_ = e;
  }, false, this);
};

/**
 * @param {Event} e
 * @return {{
 *   x: number,
 *   y: number,
 *   button: number,
 *   ctrlKey: boolean,
 *   altKey: boolean,
 *   shiftKey: boolean
 * }}
 */
awesomeCanvas.Editor.prototype.processEvent = function (e) {
  var offset = this.getAreaOffset_();
  var coords = [
    e.clientX + window.scrollX - offset[0],
    e.clientY + window.scrollY - offset[1]
  ];
  var tool = awesomeCanvas.Tools[this.active_tool];
  if (this.toggles['grid'] && tool.grid !== false) {
    coords = this.applyGridToCoords(coords);
  }
  return {
    x: coords[0],
    y: coords[1],
    button: e.button,
    ctrlKey: e.ctrlKey,
    altKey: e.altKey,
    shiftKey: e.shiftKey
  };
};

/**
 * Returns the total offset of the drawing area
 * @return {Array.<number>}
 */
awesomeCanvas.Editor.prototype.getAreaOffset_ = function () {
  var left = 0;
  var top = 0;
  var el = this.area;
  var style = null;
  do {
    style = window.getComputedStyle(el, null);
    left += el.offsetLeft - el.scrollLeft + parseInt(style.borderLeftWidth, 10);
    top += el.offsetTop - el.scrollTop + parseInt(style.borderTopWidth, 10);
  } while (el = el.offsetParent);

  return [left, top];
};

/**
 * @param {number} index
 */
awesomeCanvas.Editor.prototype.activateLayer = function (index) {
  var layer = this.layers[index];
  if (!layer) {
    throw new Error('Undefined layer');
  }
  if (this.active_layer) {
    var active_item = this.layer_panel.querySelector('li[data-index="' + this.active_layer.index + '"]');
    if (active_item !== null) {
      goog.dom.classes.remove(active_item, 'active');
    }
  }
  this.active_layer = layer;
  goog.dom.classes.add(
    this.layer_panel.querySelector('li[data-index="' + index + '"]'), 'active');
  this.updateLayerContext_();
};

/**
 * @param {number} index
 */
awesomeCanvas.Editor.prototype.activateNearestLayer = function (index) {
  var max = this.layers.length - 1;
  var layer;
  while (layer === undefined && ++index <= max) {
    layer = this.layers[index];
  }
  if (layer !== undefined) {
    this.activateLayer(index);
    return;
  }
  while (layer === undefined && --index >= 0) {
    layer = this.layers[index];
  }
  if (layer !== undefined) {
    this.activateLayer(index);
    return;
  }
};
awesomeCanvas.Editor.prototype.updateLayerContext_ = function () {
  var layer = this.active_layer;
  if (!this.active_tool || !layer || !layer.canvas) {
    return;
  }
  var tool = awesomeCanvas.Tools[this.active_tool];
  var ctx = layer.context;
  ctx.globalCompositeOperation = tool.mode || 'source-over';
  ctx.lineWidth = tool.size || 1;
  ctx.lineCap = tool.lineCap || 'round';
  //ctx.lineJoin = tool.lineJoin || 'round';
};

/**
 * @param {number} index
 */
awesomeCanvas.Editor.prototype.lockLayer = function (index) {
  var layer = this.layers[index];
  if (!layer) {
    throw new Error('Undefined layer');
  }
  layer.locked = true;
  goog.dom.classes.add(
    this.layer_panel.querySelector('li[data-index="' + index + '"]'), 'locked');
};

/**
 * @param {number} index
 */
awesomeCanvas.Editor.prototype.unlockLayer = function (index) {
  var layer = this.layers[index];
  if (!layer) {
    throw new Error('Undefined layer');
  }
  layer.locked = false;
  goog.dom.classes.remove(
    this.layer_panel.querySelector('li[data-index="' + index + '"]'), 'locked');
};
awesomeCanvas.Editor.prototype.deleteActiveLayer = function () {
  var layer = this.active_layer;
  if (!layer) {
    throw new Error('Undefined layer');
  }
  if (layer.locked) {
    return;
  }
  goog.dom.removeNode(layer.canvas);
  goog.dom.removeNode(
    this.layer_panel.querySelector('li[data-index="' + layer.index + '"]'));
  delete this.layers[layer.index];
  this.activateNearestLayer(layer.index);
  if (!this.active_layer) {
    this.activateLayer(
      Number(goog.dom.dataset.get(
        this.layer_panel.querySelector('li:last-child'), 'index')) || 0);
  }
};

/**
 * @param {string} key
 */
awesomeCanvas.Editor.prototype.activateTool = function (key) {
  var tools = awesomeCanvas.Tools;
  var tool = tools[key];
  if (!tool) {
    throw new Error('Undefined tool "' + key + '"');
  }
  var active_tool = this.active_tool;
  if (active_tool) {
    goog.dom.classes.remove(this.tool_controls[active_tool], 'active');
    active_tool = tools[active_tool];
    if (typeof active_tool.listeners.blur === 'function') {
      active_tool.listeners.blur.call(active_tool, this, this.active_layer.context);
    }
  }
  this.active_tool = key;
  this.tool_listeners = tool.listeners || {};
  this.area.style.cursor = tool.cursor || 'default';
  goog.dom.classes.add(this.tool_controls[key], 'active');
  if (typeof tool.listeners.focus === 'function') {
    tool.listeners.focus.call(tool, this);
  }
  this.updateSizeControl_();
  this.updateLayerContext_();
};
awesomeCanvas.Editor.prototype.updateSizeControl_ = function () {
  var tool = awesomeCanvas.Tools[this.active_tool];
  var size = tool.size;
  if (size === null) {
    size = awesomeCanvas.Tools[this.params.default_tool].size;
  }
  var size_control = this.option_panel.querySelector('.size input');
  if (size === false) {
    size_control.disabled = true;
  } else {
    size_control.disabled = false;
    size_control.value = size;
  }
};

/**
 * @param {string|Array.<number>} swatch RGB or HEX color
 */
awesomeCanvas.Editor.prototype.activateSwatch = function (swatch) {
  if (Array.isArray(swatch)) {
    this.active_swatch = swatch;
  } else if (typeof swatch === 'string') {
    this.active_swatch = awesomeCanvas.hex2rgb(swatch);
  }
};

/**
 * @param {string} key
 * @param {boolean=} value A value to force 
 */
awesomeCanvas.Editor.prototype.toggle = function (key, value) {
  var toggle = awesomeCanvas.Toggles[key];
  if (!toggle) {
    throw new Error('Undefined toggle ("' + key + '")');
  }
  var active = (typeof value !== 'undefined') ? Boolean(value) : !this.toggles[key];
  this.toggles[key] = active;

  if (active) {
    toggle.activate.call(toggle, this);
    goog.dom.classes.add(this.toggle_controls[key], 'active');
  } else {
    toggle.deactivate.call(toggle, this);
    goog.dom.classes.remove(this.toggle_controls[key], 'active');
  }
};

awesomeCanvas.Editor.prototype.getActiveToolSize = function () {
  var size = awesomeCanvas.Tools[this.active_tool].size;
  return size === null ? awesomeCanvas.Tools[this.params.default_tool].size : size;
};

/**
 * @param {number} value
 */
awesomeCanvas.Editor.prototype.setActiveToolSize = function (value) {
  var tool = awesomeCanvas.Tools[this.active_tool];
  var size = tool.size;
  if (size !== false) {
    tool.size = Number(value);
  }
};
awesomeCanvas.Editor.prototype.getWacomPlugin = function () {
  var plugin = this.wacom_plugin;
  if (!awesomeCanvas.Editor.env.tablet_support || !plugin['isWacom'] || plugin['pointerType'] === 0) {
    return this.wacom_defaults;
  }
  return plugin;
};
awesomeCanvas.Editor.prototype.initWacomPlugin_ = function () {
  var plugin = document.getElementById('wacom-plugin');
  this.wacom_plugin = plugin;
  if (!plugin) {
    plugin = goog.dom.createDom('embed', {
      'id': 'wacom-plugin',
      'type': 'application/x-wacom-tablet',
      'hidden': true,
      'pluginspage': 'http://www.wacom.com/productsupport/plugin.php',
      'style': 'display: none'
    });
    this.wacom_plugin = plugin;
    goog.dom.appendChild(document.body, plugin);
    goog.events.listen(window, goog.events.EventType.FOCUS, function (e) {
      goog.dom.removeNode(plugin);
      goog.dom.appendChild(document.body, plugin);
    });
  }
}


awesomeCanvas.Editor.env = {
  mousedown: false,
  tool_size: 1,
  tablet_support: true
};


goog.exportProperty(awesomeCanvas.Editor.prototype, 'build', awesomeCanvas.Editor.prototype.build);
goog.exportProperty(awesomeCanvas.Editor.prototype, 'getState', awesomeCanvas.Editor.prototype.getState);


/**
 * Convers a HEX color to RGB
 * @param {string} hex
 * @return {Array.<number>}
 */
awesomeCanvas.hex2rgb = function (hex) {
  hex = (hex.charAt(0) === '#') ? hex.substring(1, 7) : hex;
  return [
    parseInt(hex.substring(0, 2), 16),
    parseInt(hex.substring(2, 4), 16),
    parseInt(hex.substring(4, 6), 16)
  ];
};


awesomeCanvas.isPointInSelection = function (x, y, selection) {
  var in_selection = false;
  if (!selection) {
    return in_selection;
  }
  if (selection[2] < 0) {
    selection[0] = selection[0] + selection[2];
    selection[2] = -selection[2];
  }
  if (selection[3] < 0) {
    selection[1] = selection[1] + selection[3];
    selection[3] = -selection[3];
  }

  if (x >= selection[0]-1 &&
    x <= selection[0] + selection[2] &&
    y >= selection[1]-1 &&
    y <= selection[1] + selection[3]
  ) {
    in_selection = true;
  }

  return in_selection;
};


HTMLCanvasElement.prototype.reset = function () {
  this.width = this.width;
};

/**
 * Creates a circular path
 * @param {number} aX X coordinate of the center
 * @param {number} aY Y coordinate of the center
 * @param {number} aDiameter Diameter
 */
CanvasRenderingContext2D.prototype.circle = function (aX, aY, aDiameter) {
  this.ellipse(aX, aY, aDiameter, aDiameter);
};

/**
 * Creates a circular path and fills it
 * @param {number} aX X coordinate of the center
 * @param {number} aY Y coordinate of the center
 * @param {number} aDiameter Diameter
 */
CanvasRenderingContext2D.prototype.fillCircle = function (aX, aY, aDiameter) {
  this.beginPath();
  this.circle(aX, aY, aDiameter);
  this.closePath();
  this.fill();
};

/**
 * Creates a circular path and strokes it
 * @param {number} aX X coordinate of the center
 * @param {number} aY Y coordinate of the center
 * @param {number} aDiameter Diameter
 */
CanvasRenderingContext2D.prototype.strokeCircle = function (aX, aY, aDiameter) {
  this.beginPath();
  this.circle(aX, aY, aDiameter);
  this.closePath();
  this.stroke();
};

/**
 * Creates an elliptic path
 * @param {number} aX X coordinate of the center
 * @param {number} aY Y coordinate of the center
 * @param {number} aWidth Width
 * @param {number} aHeight Height
 */
CanvasRenderingContext2D.prototype.ellipse = function (aX, aY, aWidth, aHeight) {
  var eX, eY, hB, mX, mY, vB;
  hB = (aWidth / 2) * 0.5522848;
  vB = (aHeight / 2) * 0.5522848;
  eX = aX + aWidth;
  eY = aY + aHeight;
  mX = aX + aWidth / 2;
  mY = aY + aHeight / 2;
  this.moveTo(aX, mY);
  this.bezierCurveTo(aX, mY - vB, mX - hB, aY, mX, aY);
  this.bezierCurveTo(mX + hB, aY, eX, mY - vB, eX, mY);
  this.bezierCurveTo(eX, mY + vB, mX + hB, eY, mX, eY);
  this.bezierCurveTo(mX - hB, eY, aX, mY + vB, aX, mY);
};

/**
 * Creates an elliptic path and fills it
 * @param {number} aX X coordinate of the center
 * @param {number} aY Y coordinate of the center
 * @param {number} aWidth Width
 * @param {number} aHeight Height
 */
CanvasRenderingContext2D.prototype.fillEllipse = function (aX, aY, aWidth, aHeight) {
  this.beginPath();
  this.ellipse(aX, aY, aWidth, aHeight);
  this.closePath();
  this.fill();
};

/**
 * Creates an elliptic path and strokes it
 * @param {number} aX X coordinate of the center
 * @param {number} aY Y coordinate of the center
 * @param {number} aWidth Width
 * @param {number} aHeight Height
 */
CanvasRenderingContext2D.prototype.strokeEllipse = function (aX, aY, aWidth, aHeight) {
  this.beginPath();
  this.ellipse(aX, aY, aWidth, aHeight);
  this.closePath();
  this.stroke();
};
