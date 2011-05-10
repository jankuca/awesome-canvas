(function() {
  var Editor, hex2rgb;
  Editor = Function.inherit(function(container, params) {
    this.container = container;
    if (params) {
      Object.keys(params).forEach(function(key) {
        return this.params[key] = params[key];
      }, this);
    }
    this._build();
    this.activateSwatch(this.params.default_swatch);
    this.activateTool(this.params.default_tool);
  }, {
    applyGridToCoords: function(coords) {
      var a, b, step, x, y;
      step = this.params.grid_step;
      x = coords[0];
      y = coords[1];
      a = x % step;
      b = y % step;
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
    },
    _build: function() {
      this.container.html('');
      this._initWacomPlugin();
      this._buildArea();
      this._buildToolbar();
      this._buildSidebar();
      this._buildLayers();
      return this._addListeners();
    },
    _buildArea: function() {
      this.area = new Element('div', {
        "class": 'area'
      });
      return this.container.insert(this.area);
    },
    _buildToolbar: function() {
      this.toolbar = new Element('div', {
        "class": 'toolbar'
      });
      this.container.insert({
        top: this.toolbar
      });
      this._buildToolPanel();
      return this._buildTogglePanel();
    },
    _buildToolPanel: function() {
      var that;
      that = this;
      this.tool_panel = new Element('ul', {
        "class": 'tools'
      });
      this.toolbar.insert(this.tool_panel);
      this.tool_panel.addEventListener('click', function(e) {
        var target;
        target = e.target;
        if (target.tagName !== 'LI') {
          return;
        }
        return that.activateTool(target.data('tool'));
      });
      return this._buildToolControls();
    },
    _buildTogglePanel: function() {
      var that;
      that = this;
      this.toggle_panel = new Element('ul', {
        "class": 'toggles'
      });
      this.toolbar.insert(this.toggle_panel);
      this.toggle_panel.addEventListener('click', function(e) {
        var target;
        target = e.target;
        if (target.tagName !== 'LI') {
          return;
        }
        return that.toggle(target.data('toggle'));
      });
      return this._buildToggleControls();
    },
    _buildSidebar: function() {
      this.sidebar = new Element('div', {
        "class": 'sidebar'
      });
      this.container.insert(this.sidebar);
      this._buildSwatchPanel();
      this._buildLayerPanel();
      return this._buildOptionToolbar();
    },
    _buildSwatchPanel: function() {
      var list, that;
      that = this;
      this.swatch_panel = new Element('div', {
        "class": 'swatches'
      });
      this.sidebar.insert(this.swatch_panel);
      list = new Element('ul');
      this.swatch_panel.insert(list);
      list.addEventListener('click', function(e) {
        var target;
        target = e.target;
        if (target.tagName !== 'LI') {
          return;
        }
        return that.activateSwatch(target.data('color'));
      });
      that._dragged_swatch = null;
      return list.addEventListener('mousedown', function(e) {
        var ghost, ghost_offset, ghost_style, start, target;
        target = e.target;
        if (target.tagName !== 'LI') {
          return;
        }
        that._dragged_swatch = target.data('swatch');
        start = [e.clientX, e.clientY];
        ghost_offset = [target.offsetLeft + 16, target.offsetTop + 24];
        ghost = new Element('li');
        ghost_style = ghost.style;
        ghost_style.position = 'absolute';
        ghost_style.left = ghost_offset[0] + 'px';
        ghost_style.top = ghost_offset[1] + 'px';
        ghost_style.backgroundColor = that._dragged_swatch;
        ghost_style.zIndex = 3;
        list.insert(ghost);
        target.addEventListener('mousemove', function(e) {
          if (!that._dragged_swatch) {
            return;
          }
          ghost.style.left = offset[0] + e.clientX - start[0] + 'px';
          return ghost.style.top = offset[1] + e.clientY - start[1] + 'px';
        });
        return target.addEventListener('mouseup', function(e) {
          that._dragged_swatch = null;
          ghost.remove();
          this.removeEventListener('mousemove');
          return this.removeEventListener('mouseup');
        });
      });
    },
    _buildLayerPanel: function() {
      var list, that;
      that = this;
      this.layer_panel = new Element('div', {
        "class": 'layers'
      });
      this.sidebar.insert(this.layer_panel);
      list = new Element('ul');
      this.layer_panel.insert(list);
      list.addEventListener('click', function(e) {
        var index, layer, target;
        target = e.target;
        switch (target.tagName) {
          case 'LI':
            return that.activateLayer(target.data('index'));
          case 'SPAN':
            if (target.hasClassName('lock')) {
              index = target.parentNode.data('index');
              layer = that.layers[index];
              return that[layer.locked ? 'unlockLayer' : 'lockLayer'](index);
            }
        }
      });
      return this._buildLayerPanelToolbar();
    },
    _buildLayerPanelToolbar: function() {
      var button, that, toolbar;
      that = this;
      toolbar = new Element('ul', {
        "class": 'toolbar'
      });
      this.layer_panel.insert(toolbar);
      button = new Element('li', {
        "class": 'create'
      });
      button.attr('title', 'New layer');
      button.addEventListener('click', function() {
        return that.createEmptyLayer();
      });
      toolbar.insert(button);
      button = new Element('li', {
        "class": 'delete'
      });
      button.attr('title', 'Delete layer');
      button.addEventListener('click', function() {
        return that.deleteActiveLayer();
      });
      return toolbar.insert(button);
    },
    _buildOptionToolbar: function() {
      var list;
      this.options = {};
      this.option_panel = new Element('div', {
        "class": 'options'
      });
      this.sidebar.insert(this.option_panel);
      list = new Element('ul');
      this.option_panel.insert(list);
      return list.insert(this._buildSizeControl());
    },
    _buildSizeControl: function() {
      var control, option, that;
      that = this;
      option = new Element('li', {
        "class": 'size'
      });
      control = new Element('input', {
        type: 'range',
        min: 2,
        max: 50,
        value: 1
      });
      option.insert(control);
      Object.defineProperty(this.options, 'size', {
        get: function() {
          return control.value;
        }
      });
      control.addEventListener('change', function() {
        return that.setActiveToolSize(control.value);
      });
      return option;
    },
    _buildToolControls: function() {
      var that, tools;
      that = this;
      this.tool_controls = {};
      tools = this.constructor.tools;
      return Object.keys(tools).forEach(function(key) {
        var control, tool;
        tool = tools[key];
        control = new Element('li', {
          title: tool.title
        });
        control.data('tool', key);
        that.tool_panel.insert(control);
        that.tool_controls[key] = control;
        if (tool.listeners && typeof tool.listeners.init === 'function') {
          return tool.listeners.init.call(this, control);
        }
      });
    },
    _buildToggleControls: function() {
      var that, toggles;
      that = this;
      this.toggles = {};
      toggles = this.constructor.toggles;
      return Object.keys(toggles).forEach(function(key) {
        var control, toggle;
        toggle = toggles[key];
        control = new Element('li', {
          title: toggle.title
        });
        control.data('toggle', key);
        that.toggle_panel.insert(control);
        that.toggle_controls[key] = control;
        return that.toggle(key, toggle.active);
      });
    },
    _buildSwatchControls: function() {
      var swatches, that;
      that = this;
      swatches = this.constructor.swatches;
      return swatches.forEach(function(swatch) {
        var control;
        control = new Element('li');
        control.data('swatch', swatch);
        control.style.backgroundColor = swatch;
        return swatch_panel.findOne('ul').insert(control);
      });
    },
    _buildLayers: function() {
      this.layers = [];
      this._createBackgroundLayer();
      this._createGridLayer();
      this._createTempLayer();
      return this.createEmptyLayer();
    },
    _createBackgroundLayer: function() {
      var color_node, layer, panel_item, that;
      that = this;
      this.area.style.backgroundColor = this.params.background_color;
      layer = {
        background_color: this.params.background_color
      };
      layer.index = -1 + this.layers.push(layer);
      panel_item = this._createLayerPanelItem();
      panel_item.data('index', layer.index);
      panel_item.addClassName('background');
      panel_item.findOne('.title').html('Background layer');
      panel_item.addEventListener('mouseover', function(e) {
        if (!that._dragged_swatch || that.background_layer.locked) {
          return;
        }
        return this.addClassName('swatch-change');
      });
      panel_item.addEventListener('mouseout', function(e) {
        if (!that._dragged_swatch || that.background_layer.locked) {
          return;
        }
        return this.removeClassName('swatch-change');
      });
      color_node = new Element('span', {
        "class": 'swatch'
      });
      color_node.style.backgroundColor = this.params.background_color;
      return panel_item.insert(color_node);
    },
    _createGridLayer: function() {
      var canvas, h, that, w;
      that = this;
      w = this.area.clientWidth;
      h = this.area.clientHeight;
      canvas = new Element('canvas', {
        width: w,
        height: h,
        transparent: 'true',
        "class": 'grid'
      });
      this.area.insert({
        top: canvas
      });
      this.grid_layer = {
        canvas: canvas,
        context: canvas.getContext('2d')
      };
      return this._drawGrid();
    },
    _drawGrid: function() {
      var ctx, h, step, w, x, y;
      ctx = this.grid_layer.context;
      step = this.params.grid_step;
      w = this.grid_layer.canvas.width;
      h = this.grid_layer.canvas.height;
      ctx.lineWidth = 2;
      ctx.strokeStyle = this.params.grid_color;
      ctx.beginPath();
      for (x = 0; (0 <= w ? x < w : x > w); (0 <= w ? x += 1 : x -= 1)) {
        if (x % step === 0) {
          ctx.moveTo(x, 0);
          ctx.lineTo(x, h);
        }
      }
      for (y = 0; (0 <= h ? y < h : y > h); (0 <= h ? y += 1 : y -= 1)) {
        if (y % step === 0) {
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
        }
      }
      ctx.closePath();
      return ctx.stroke();
    },
    _createTempLayer: function() {
      var canvas;
      canvas = new Element('canvas', {
        width: this.area.clientWidth,
        height: this.area.clientHeight,
        transparent: 'true',
        "class": 'temp'
      });
      this.area.insert(canvas);
      return this.temp_layer = {
        canvas: canvas,
        context: canvas.getContext('2d')
      };
    },
    createEmptyLayer: function() {
      var canvas, el, layer, panel_item;
      canvas = new Element('canvas', {
        width: this.area.clientWidth,
        height: this.area.clientHeight,
        transparent: 'true'
      });
      el = this.area.findOne('.selection-content');
      if (!el) {
        this.area.insert(canvas);
      } else {
        el.insert({
          before: canvas
        });
      }
      layer = {
        canvas: canvas,
        context: canvas.getContext('2d')
      };
      layer.index = -1 + this.layers.push(layer);
      panel_item = this._createLayerPanelItem();
      panel_item.findOne('.title').html('New layer');
      panel_item.data('index', layer.index);
      return this.activateLayer(layer.index);
    },
    _createLayerPanelItem: function() {
      var lock_node, panel_item, title_node;
      panel_item = new Element('li');
      this.layer_panel.findOne('ul').insert({
        top: panel_item
      });
      title_node = new Element('span', {
        "class": 'title'
      });
      panel_item.insert(title_node);
      lock_node = new Element('span', {
        "class": 'lock'
      });
      panel_item.insert(lock_node);
      return panel_item;
    },
    _addListeners: function() {
      var that;
      that = this;
      this.area.addEventListener('mousedown', function(e) {
        var tool;
        e.preventDefault();
        Editor.env.mousedown = true;
        if (that.active_layer.locked || that.active_layer.canvas === void 0) {
          that.area.style.cursor = 'not-allowed';
          return false;
        }
        Editor.env.drawing = true;
        e = that.processEvent(e);
        tool = that.constructor.tools[that.active_tool];
        if (typeof that.tool_listeners.mousedown === 'function') {
          that.tool_listeners.mousedown.call(that, e, that.active_layer.context);
        }
        that._e = e;
        return false;
      });
      this.area.addEventListener('mouseup', function(e) {
        var tool;
        if (!Editor.env.mousedown) {
          return;
        }
        Editor.env.mousedown = false;
        tool = that.constructor.tools[that.active_tool];
        if (that.active_layer.locked) {
          that.area.style.cursor = tool.cursor || 'default';
        }
        e = that.processEvent(e);
        if (typeof that.tool_listeners.mouseup === 'function') {
          that.tool_listeners.mouseup.call(that, e, that.active_layer.context);
        }
        return that._e = e;
      });
      return this.area.addEventListener('mousemove', function(e) {
        if (!Editor.env.mousedown || that.active_layer.locked) {
          return;
        }
        if (Editor.env.drawing) {
          e.preventDefault();
        }
        e = that.processEvent(e);
        if (typeof that.tool_listeners.mousemove === 'function') {
          that.tool_listeners.mousemove.call(that, e, that.active_layer.context);
        }
        return that._e = e;
      });
    },
    processEvent: function(e) {
      var coords, tool;
      coords = [e.pageX - this.area.offsetLeft, e.pageY - this.area.offsetTop];
      tool = this.constructor.tools[this.active_tool];
      if (this.grid && tool.grid !== false) {
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
    },
    activateLayer: function(index) {
      var active_item, layer;
      layer = this.layers[index];
      if (!layer) {
        throw new Error('Undefined layer');
      }
      if (this.active_layer) {
        active_item = this.layer_panel.findOne('li[data-index="' + this.active_layer.index + '"]');
        if (active_item !== null) {
          active_item.removeClassName('active');
        }
      }
      this.active_layer = layer;
      this.layer_panel.findOne('li[data-index="' + index + '"]').addClassName('active');
      return this._updateLayerContext();
    },
    activateNearestLayer: function(index) {
      var layer, max;
      max = this.layers.length - 1;
      while (layer === void 0 && ++index <= max) {
        layer = this.layers[index];
      }
      if (layer !== void 0) {
        return this.activateLayer(index);
      }
      while (layer === void 0 && --index >= 0) {
        layer = this.layers[index];
      }
      if (layer !== void 0) {
        return this.activateLayer(index);
      }
    },
    _updateLayerContext: function() {
      var ctx, layer, tool;
      layer = this.active_layer;
      if (!this.active_tool || !layer || !layer.canvas) {
        return;
      }
      tool = this.constructor.tools[this.active_tool];
      ctx = layer.context;
      ctx.globalCompositeOperation = tool.mode || 'source-over';
      ctx.lineWidth = tool.size || 1;
      ctx.lineCap = tool.lineCap || 'round';
      return ctx.lineJoin = tool.lineJoin || tool.lineCap || 'round';
    },
    lockLayer: function(index) {
      var layer;
      layer = this.layers[index];
      if (!layer) {
        throw new Error('Undefined layer');
      }
      layer.locked = true;
      return this.layer_panel.findOne('li[data-index="' + index + '"]').addClassName('locked');
    },
    unlockLayer: function(index) {
      var layer;
      layer = this.layers[index];
      if (!layer) {
        throw new Error('Undefined layer');
      }
      layer.locked = false;
      return this.layer_panel.findOne('li[data-index="' + index + '"]').removeClassName('locked');
    },
    deleteActiveLayer: function() {
      var layer;
      layer = this.active_layer;
      if (!layer) {
        throw new Error('Undefined layer');
      }
      if (layer.locked) {
        return;
      }
      layer.canvas.remove();
      this.layer_panel.findOne('li[data-index="' + layer.index + '"]').remove();
      delete this.layers[layer.index];
      this.activateNearestLayer(layer.index);
      if (!this.active_layer) {
        return this.activateLayer(this.layer_panel.findOne('li:last-child').data('index'));
      }
    },
    activateTool: function(key) {
      var active_tool, tool, tools;
      tools = this.constructor.tools;
      tool = tools[key];
      if (!tool) {
        throw new Error('Undefined tool "' + key + '"');
      }
      active_tool = this.active_tool;
      if (active_tool) {
        this.tool_controls[active_tool].removeClassName('active');
        active_tool = tools[active_tool];
        if (typeof active_tool.listeners.blur === 'function') {
          active_tool.listeners.blur.call(this, this.active_layer.context);
        }
      }
      this.active_tool = key;
      this.tool_listeners = tool.listeners || {};
      this.area.style.cursor = tool.cursor || 'default';
      this.tool_controls[key].addClassName('active');
      if (typeof tool.listeners.focus === 'function') {
        tool.listeners.focus.call(this);
      }
      this._updateSizeControl();
      return this._updateLayerContext();
    },
    _updateSizeControl: function() {
      var size, size_control, tool;
      tool = this.constructor.tools[this.active_tool];
      size = tool.size;
      if (size === null) {
        size = this.constructor.tools[this.params.default_tool].size;
      }
      size_control = this.option_panel.findOne('.size input');
      if (size === false) {
        return size_control.disabled = true;
      }
      size_control.disabled = false;
      return size_control.value = size;
    },
    activateSwatch: function(swatch) {
      if (swatch.match(new RegExp('^#?[a-fA-F0-9]{6}$'))) {
        return this.active_swatch = hex2rgb(swatch);
      } else {
        return this.active_swatch = swatch;
      }
    },
    toggle: function(key, value) {
      var active, toggle;
      toggle = this.constructor.toggles[key];
      if (!toggle) {
        throw new Error('Undefined toggle ("' + key + '")');
      }
      active = value !== 'undefined' ? Boolean(value) : !this.toggles[key];
      this.toggles[key] = active;
      toggle[active ? 'activate' : 'deactivate'].call(this);
      return this.toggle_controls[key][active ? 'addClassName' : 'removeClassName']('active');
    },
    getActiveToolSize: function() {
      var size;
      size = this.constructor.tools[this.active_tool].size;
      if (size === null) {
        return this.constructor.tools[this.params.default_tool].size;
      }
      return size;
    },
    setActiveToolSize: function(value) {
      var size, tool;
      tool = this.constructor.tools[this.active_tool];
      size = tool.size;
      if (size === false) {
        return;
      }
      return tool.size = Number(value);
    },
    getWacomPlugin: function() {
      var plugin;
      plugin = this._wacom_plugin;
      if (!Editor.env.tablet_support || !plugin.isWacom || plugin.pointerType === 0) {
        return this.wacom_defaults;
      }
      return plugin;
    },
    _initWacomPlugin: function() {
      var plugin;
      this._wacom_plugin = plugin = document.getElementById('wacom-plugin');
      if (!plugin) {
        plugin = new Element('embed', {
          id: 'wacom-plugin',
          type: 'application/x-wacom-tablet',
          hidden: true,
          pluginspage: 'http://www.wacom.com/productsupport/plugin.php'
        });
        document.body.insert(plugin);
        return window.addEventListener('focus', function(e) {
          plugin.remove();
          return document.body.insert(plugin);
        });
      }
    }
  });
  Editor.tools = {};
  Editor.tools.brush = {
    mode: 'source-over',
    cursor: 'crosshair',
    size: 2,
    listeners: {
      mousedown: function(e, ctx) {
        if (e.button !== 0) {
          return;
        }
        ctx.fillStyle = "rgba(" + (this.active_swatch.join(',')) + "," + this.getWacomPlugin.pressure + ")";
        ctx.lineWidth = this.getActiveToolSize();
        ctx.beginPath();
        ctx.arc(e.x, e.y, ctx.lineWidth / 2, 0, Math.PI * 2, false);
        ctx.closePath();
        ctx.fill();
        return this._e = e;
      },
      mousemove: function(e, ctx) {
        var last;
        if (!Editor.env.mousedown || e.button !== 0) {
          return;
        }
        ctx.strokeStyle = "rgba(" + (this.active_swatch.join(',')) + "," + this.getWacomPlugin.pressure + ")";
        last = this._e;
        ctx.beginPath();
        ctx.moveTo(last.x, last.y);
        ctx.lineTo(e.x, e.y);
        ctx.closePath();
        ctx.stroke();
        return this._e = e;
      }
    }
  };
  Editor.toggles = {};
  Editor.prototype.params = {
    background_color: '#FFFFFF',
    grid_color: 'rgba(0, 0, 0, 0.05)',
    grid_step: 20,
    default_swatch: '#000000',
    default_tool: 'brush'
  };
  Editor.prototype.wacom_defaults = {
    pressure: 1
  };
  Editor.prototype.swatches = ['#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF'];
  Editor.env = {
    mousedown: false,
    tool_size: 1,
    tablet_support: true
  };
  window.AwesomeCanvas = Editor;
  hex2rgb = function(hex) {
    hex = hex.charAt(0) === '#' ? hex.substring(1, 7) : hex;
    return [parseInt(hex.substring(0, 2), 16), parseInt(hex.substring(2, 4), 16), parseInt(hex.substring(4, 6), 16)];
  };
  HTMLCanvasElement.prototype.reset = function() {
    return this.width = this.width;
  };
  CanvasRenderingContext2D.prototype.circle = function(aX, aY, aDiameter) {
    return this.ellipse(aX, aY, aDiameter, aDiameter);
  };
  CanvasRenderingContext2D.prototype.fillCircle = function(aX, aY, aDiameter) {
    this.beginPath();
    this.circle(aX, aY, aDiameter);
    this.closePath();
    return this.fill();
  };
  CanvasRenderingContext2D.prototype.strokeCircle = function(aX, aY, aDiameter) {
    this.beginPath();
    this.circle(aX, aY, aDiameter);
    this.closePath();
    return this.stroke();
  };
  CanvasRenderingContext2D.prototype.ellipse = function(aX, aY, aWidth, aHeight) {
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
    return this.bezierCurveTo(mX - hB, eY, aX, mY + vB, aX, mY);
  };
  CanvasRenderingContext2D.prototype.fillEllipse = function(aX, aY, aWidth, aHeight) {
    this.beginPath();
    this.ellipse(aX, aY, aWidth, aHeight);
    this.closePath();
    return this.fill();
  };
  CanvasRenderingContext2D.prototype.strokeEllipse = function(aX, aY, aWidth, aHeight) {
    this.beginPath();
    this.ellipse(aX, aY, aWidth, aHeight);
    this.closePath();
    return this.stroke();
  };
}).call(this);
