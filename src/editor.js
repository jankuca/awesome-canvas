/**
 * Awesome Canvas
 * HTML5 Canvas Editor
 * --
 * @author Jan Kuča <jan@jankuca.com>, http://jankuca.com
 * @company Flow Media, http://flowmedia.cz
 * --
 * Released under the Creative Commons Attribution-ShareAlike 3.0 Unported License
 * http://creativecommons.org/licenses/by-sa/3.0/
 */

(function() {

var Editor = function(container, params) {
	this.container = container;
	this.params = {
		'backgroundColor': '#EEEEEE',
		'gridStep': 20,
		'defaultTool': 'brush'
	};
	if(params) {
		for(var i in params) {
			if(params.hasOwnProperty(i)) {
				this.params[i] = params[i];
			}
		}
	}

	this.build();
	this.addListeners();
	this.activateTool('brush');

	this.wacom_plugin_defaults = {
		'pressure': 1
	};
};

Editor.env = {
	'mousedown': false,
	'tool_size': 1,
	'tablet_support': true
};

Editor.tools = {
	'brush': {
		'mode': 'source-over',
		'cursor': 'crosshair',
		'size': 2,

		'listeners': {
			'focus': function() {
			},
			'mousedown': function(event, context) {
				if(event.button !== 0) {
					return;
				}

				context.fillStyle = 'rgba('+this.active_swatch.join(',')+','+this.getWacomPlugin().pressure+')';
				context.lineWidth = this.getActiveToolSize();
				
				context.beginPath();
				context.arc(event.x, event.y, context.lineWidth / 2, 0, Math.PI*2, false);
				context.closePath();
				context.fill();

				this.last_mouse_event = event;
			},
			'mousemove': function(event, context) {
				if(!Editor.env.mousedown || event.button !== 0) {
					return;
				}

				var last = this.last_mouse_event;

				context.strokeStyle = 'rgba('+this.active_swatch.join(',')+','+this.getWacomPlugin().pressure+')';

				context.beginPath();
				context.moveTo(last.x, last.y);
				context.lineTo(event.x, event.y);
				context.closePath();
				context.stroke();

				this.last_mouse_event = event;
			}
		}
	},
	'line': {
		'mode': 'source-over',
		'cursor': 'crosshair',
		'size': null,

		'listeners': {
			'mousedown': function(event, context) {
				if(event.button !== 0) {
					return;
				}

				var tool = Editor.tools[this.active_tool];
				tool.in_draw = true;				

				tool.start_event = event;
			},
			'mousemove': function(event, context) {
				if(!Editor.env.mousedown || event.button !== 0) {
					return;
				}

				var tool = Editor.tools[this.active_tool],
					start_event = tool.start_event,
					temp_canvas = this.temp_layer.canvas,
					temp_context = this.temp_layer.context;
				
				temp_canvas.width = temp_canvas.width;
				temp_context.strokeStyle = 'rgb('+this.active_swatch.join(',')+')';

				temp_context.beginPath();
				temp_context.moveTo(start_event.x, start_event.y);
				temp_context.lineTo(event.x, event.y);
				temp_context.closePath();
				temp_context.stroke();
			},
			'mouseup': function(event, context) {
				var tool = Editor.tools[this.active_tool];
				
				if(!tool.in_draw) {
					return;
				}
				tool.in_draw = false;

				var	start_event = tool.start_event,
					temp_canvas = this.temp_layer.canvas;
				
				temp_canvas.width = temp_canvas.width;

				context.strokeStyle = 'rgb('+this.active_swatch.join(',')+')';
				context.lineWidth = this.getActiveToolSize();

				context.beginPath();
				context.moveTo(start_event.x, start_event.y);
				context.lineTo(event.x, event.y);
				context.closePath();
				context.stroke();
			}
		}
	},
	'rectangle': {
		'mode': 'source-over',
		'cursor': 'crosshair',
		'size': null,
		'filled': true,

		'listeners': {
			'mousedown': function(event, context) {
				if(event.button !== 0) {
					return;
				}

				var tool = Editor.tools[this.active_tool];
				tool.in_draw = true;				

				tool.start_event = event;
			},
			'mousemove': function(event, context) {
				if(!Editor.env.mousedown || event.button !== 0) {
					return;
				}

				var tool = Editor.tools[this.active_tool],
					start_event = tool.start_event,
					altKey = event.altKey,
					temp_canvas = this.temp_layer.canvas,
					temp_context = this.temp_layer.context,
					delta_y = event.y - start_event.y,
					delta_x = event.x - start_event.x;
				
				if(event.shiftKey) {
					delta_x = (delta_x > 0) ? Math.abs(delta_y) : -Math.abs(delta_y);
				}
				
				temp_canvas.width = temp_canvas.width;

				temp_context.strokeStyle = 'rgb('+this.active_swatch.join(',')+')';

				temp_context.beginPath();
				temp_context.rect(
					!altKey ? start_event.x : start_event.x - delta_x,
					!altKey ? start_event.y : start_event.y - delta_y,
					!altKey ? delta_x : 2 * delta_x,
					!altKey ? delta_y : 2 * delta_y
				);
				temp_context.closePath();
				temp_context.stroke();
			},
			'mouseup': function(event, context) {
				var tool = Editor.tools[this.active_tool];
				
				if(!tool.in_draw) {
					return;
				}
				tool.in_draw = false;

				var	start_event = tool.start_event,
					altKey = event.altKey,
					temp_canvas = this.temp_layer.canvas,
					delta_y = event.y - start_event.y,
					delta_x = event.x - start_event.x;
				
				if(event.shiftKey) {
					delta_x = (delta_x > 0) ? Math.abs(delta_y) : -Math.abs(delta_y);
				}

				temp_canvas.width = temp_canvas.width;

				context.strokeStyle = 'rgb('+this.active_swatch.join(',')+')';
				context.lineWidth = this.getActiveToolSize();

				context.beginPath();
				context.rect(
					!altKey ? start_event.x : start_event.x - delta_x,
					!altKey ? start_event.y : start_event.y - delta_y,
					!altKey ? delta_x : 2 * delta_x,
					!altKey ? delta_y : 2 * delta_y
				);
				context.closePath();
				context.stroke();
			}
		}
	},
	'ellipse': {
		'mode': 'source-over',
		'cursor': 'crosshair',
		'size': null,
		'filled': true,

		'listeners': {
			'mousedown': function(event, context) {
				if(event.button !== 0) {
					return;
				}

				var tool = Editor.tools[this.active_tool];
				tool.in_draw = true;				

				tool.start_event = event;
			},
			'mousemove': function(event, context) {
				if(!Editor.env.mousedown || event.button !== 0) {
					return;
				}

				var tool = Editor.tools[this.active_tool],
					start_event = tool.start_event,
					altKey = event.altKey,
					temp_canvas = this.temp_layer.canvas,
					temp_context = this.temp_layer.context,
					delta_y = event.y - start_event.y,
					delta_x = event.x - start_event.x;
				
				if(event.shiftKey) {
					delta_x = (delta_x > 0) ? Math.abs(delta_y) : -Math.abs(delta_y);
				}
				
				temp_canvas.width = temp_canvas.width;

				temp_context.strokeStyle = 'rgb('+this.active_swatch.join(',')+')';

				temp_context.beginPath();
				temp_context.ellipse(
					!altKey ? start_event.x : start_event.x - delta_x,
					!altKey ? start_event.y : start_event.y - delta_y,
					!altKey ? delta_x : 2 * delta_x,
					!altKey ? delta_y : 2 * delta_y
				);
				temp_context.closePath();
				temp_context.stroke();
			},
			'mouseup': function(event, context) {
				var tool = Editor.tools[this.active_tool];
				
				if(!tool.in_draw) {
					return;
				}
				tool.in_draw = false;

				var	start_event = tool.start_event,
					altKey = event.altKey,
					temp_canvas = this.temp_layer.canvas,
					delta_y = event.y - start_event.y,
					delta_x = event.x - start_event.x;
				
				if(event.shiftKey) {
					delta_x = (delta_x > 0) ? Math.abs(delta_y) : -Math.abs(delta_y);
				}

				temp_canvas.width = temp_canvas.width;

				context.strokeStyle = 'rgb('+this.active_swatch.join(',')+')';
				context.lineWidth = this.getActiveToolSize();

				context.beginPath();
				context.ellipse(
					!altKey ? start_event.x : start_event.x - delta_x,
					!altKey ? start_event.y : start_event.y - delta_y,
					!altKey ? delta_x : 2 * delta_x,
					!altKey ? delta_y : 2 * delta_y
				);
				context.closePath();
				context.stroke();
			}
		}
	},
	'eraser': {
		'mode': 'destination-out',
		'cursor': 'default',
		'size': 10,
		'grid': false,

		'listeners': {
			'focus': function() {
			},
			'mousedown': function(event, context) {
				if(event.button !== 0) {
					return;
				}

				context.lineWidth = this.getActiveToolSize();

				context.beginPath();
				context.arc(event.x, event.y, context.lineWidth / 2, 0, Math.PI*2, false);
				context.closePath();
				context.fill();

				this.last_mouse_event = event;
			},
			'mousemove': function(event, context) {
				if(!Editor.env.mousedown || event.button !== 0) {
					return;
				}

				var last = this.last_mouse_event;

				context.beginPath();
				context.moveTo(last.x, last.y);
				context.lineTo(event.x, event.y);
				context.closePath();
				context.stroke();

				this.last_mouse_event = event;
			}
		}
	},
	'marquee': {
		'mode': 'source-over',
		'cursor': 'crosshair',
		'size': false,

		// Tool state: 0=idle, 1=selecting, 2=selected, 3=moving
		'_state': 0,

		'listeners': {
			'init': function(tool) {
				var canvas;
				canvas = new Element('canvas', {
					'width': this.area_el.clientWidth,
					'height': this.area_el.clientHeight,
					'transparent': 'true',
					'class': 'selections'
				});
				this.area_el.insert(canvas);

				tool.selection_layer = {
					'canvas': canvas,
					'context': canvas.getContext('2d')
				};

				canvas = new Element('canvas', {
					'width': this.area_el.clientWidth,
					'height': this.area_el.clientHeight,
					'transparent': 'true',
					'class': 'selection-content'
				});
				this.area_el.insert(canvas);

				tool.selection_content_layer = {
					'canvas': canvas,
					'context': canvas.getContext('2d')
				};	
			},

			'blur': function(context) {
				var tool = Editor.tools[this.active_tool],
					temp_canvas = tool.selection_content_layer.canvas,
					stroke_canvas = tool.selection_layer.canvas;

				if(tool._moved) {
					var data = temp_canvas.toDataURL();
					var image = new Image();
					image.onload = function() {
						context.globalCompositeOperation = tool.mode;
						context.drawImage(this, 0, 0);
					};
					image.src = data;

					tool._state = 0;
					tool._moved = false;
				}
				temp_canvas.width = temp_canvas.width;
				stroke_canvas.width = stroke_canvas.width;
				
				tool._selection = undefined;
			},

			'mousedown': function(event, context) {
				var tool = Editor.tools[this.active_tool];
				if(tool._state == 2) { // selected
					var temp_canvas = tool.selection_content_layer.canvas,
						temp_context = tool.selection_content_layer.context,
						stroke_canvas = tool.selection_layer.canvas,
						selection = tool._selection;
					
					if(tool._isPointInSelection(event.x, event.y, selection)) {
						// if the content has not been moved yet
						if(!tool._moved) {
							// get the selection content
							tool._data = context.getImageData.apply(context, selection);
							// get the point within the selection
							tool._start_point = [
								event.x - selection[0] + 0.5,
								event.y - selection[1] + 0.5
							];
							// put the data in the temp layer
							temp_context.putImageData(tool._data, selection[0], selection[1]);

							context.globalCompositeOperation = 'destination-out';
							context.beginPath();
							context.rect.apply(context, selection);
							context.closePath();
							context.fill();
						}

						tool._state = 3; // moving
						tool._start_event = event;
						tool._last_event = event;
						return;
					} else {
						var data = temp_canvas.toDataURL();
						temp_canvas.width = temp_canvas.width;
						stroke_canvas.width = stroke_canvas.width;
						var image = new Image();
						image.onload = function() {
							context.globalCompositeOperation = tool.mode;
							context.drawImage(this, 0, 0);
						};
						image.src = data;

						tool._state = 0;
						tool._moved = false;
					}
				}

				tool._state = 1; // selecting
				tool._start_event = event;
				tool._selection = [event.x + 0.5, event.y + 0.5, 0, 0];
			},
			'mousemove': function(event, context) {
				var tool = Editor.tools[this.active_tool],
					delta,
					selection;

				switch(tool._state) {
				case 1: // selecting
					delta = [
						event.x - tool._start_event.x,
						event.y - tool._start_event.y
					];

					tool._selection[2] = delta[0];
					tool._selection[3] = delta[1];
					break;
				
				case 3: // moving
					delta = [
						event.x - tool._last_event.x,
						event.y - tool._last_event.y
					];

					tool._selection[0] += delta[0];
					tool._selection[1] += delta[1];

					var temp_canvas = tool.selection_content_layer.canvas,
						temp_context = tool.selection_content_layer.context;
					selection = tool._selection;
					// empty the temp layer
					temp_canvas.width = temp_canvas.width;
					// put the data in the temp layer
					temp_context.putImageData(tool._data, selection[0], selection[1]);

					tool._last_event = event;
					break;
				}

				var stroke_canvas = tool.selection_layer.canvas,
					stroke_context = tool.selection_layer.context;
				selection = tool._selection;
				// empty the stroke layer
				stroke_canvas.width = stroke_canvas.width;
				// stroke the selected area
				stroke_context.beginPath();
				stroke_context.rect.apply(stroke_context, selection);
				stroke_context.closePath();
				stroke_context.stroke();
			},
			'mouseup': function(event, context) {
				var tool = Editor.tools[this.active_tool],
					delta,
					selection;

				switch(tool._state) {
				case 1: // selecting
					delta = [
						event.x - tool._start_event.x,
						event.y - tool._start_event.y
					];

					if(delta[0] === 0 || delta[1] === 0) {
						tool._selection = undefined;
						return;
					}

					tool._selection[2] = delta[0];
					tool._selection[3] = delta[1];

					var stroke_canvas = tool.selection_layer.canvas,
						stroke_context = tool.selection_layer.context;
					selection = tool._selection;
					// empty the stroke layer
					stroke_canvas.width = stroke_canvas.width;
					// stroke the selected area
					stroke_context.beginPath();
					stroke_context.rect.apply(stroke_context, selection);
					stroke_context.closePath();
					stroke_context.stroke();

					tool._state = 2; // selected
					break;
				
				case 3: // moving
					delta = [
						event.x - tool._last_event.x,
						event.y - tool._last_event.y
					];
					tool._selection[0] += delta[0];
					tool._selection[1] += delta[1];

					var temp_canvas = tool.selection_content_layer.canvas,
						temp_context = tool.selection_content_layer.context;
					selection = tool._selection;
					// empty the temp layer
					temp_canvas.width = temp_canvas.width;
					// put the data in the temp layer
					temp_context.putImageData(tool._data, selection[0], selection[1]);

					tool._state = 2; // selected
					tool._moved = true;
				}
			}
		},
		'_isPointInSelection': function(x, y, selection) {
			var in_selection = false;
			if(!selection) {
				return in_selection;
			}
			if(selection[2] < 0) {
				selection[0] = selection[0] + selection[2];
				selection[2] = -selection[2];
			}
			if(selection[3] < 0) {
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
		}
	}
};

Editor.toggles = {
	'grid': {
		'active': false,
		'activate': function() {
			Editor.env.grid = true;
			this.grid_layer.canvas.setStyle({
				'display': 'block'
			});
		},
		'deactivate': function() {
			Editor.env.grid = false;
			this.grid_layer.canvas.setStyle({
				'display': 'none'
			});
		}
	},
	'wacom-plugin': {
		'active': true,
		'activate': function() {
			Editor.env.tablet_support = true;
		},
		'deactivate': function() {
			Editor.env.tablet_support = false;
		}
	}
};

Editor.hex2rgb = function(hex) {
	hex = (hex.charAt(0) == '#') ? hex.substring(1, 7) : hex;
	return [
		parseInt(hex.substring(0, 2), 16),
		parseInt(hex.substring(2, 4), 16),
		parseInt(hex.substring(4, 6), 16)
	];
};

Editor.prototype.build = function() {
	var i;

	// Init the Wacom plugin
	var plugin = new Element('embed', {
		'id': 'wacom-plugin',
		'type': 'application/x-wacom-tablet',
		'hidden': 'true',
		'pluginspage': 'http://www.wacom.com/productsupport/plugin.php'
	});
	document.body.insert(plugin);

	this.container.update();

	// -- PANELS --
	// sidebar
	var sidebar = new Element('div', {
		'class': 'sidebar'
	});
	this.container.insert(sidebar);

	// tool panel
	this.tools_el = new Element('ul', {
		'class': 'tools'
	});
	sidebar.insert(this.tools_el);
	this.tools_el.observe('click', function(event) {
		var target = event.target;
		if(target.tagName.toUpperCase() != 'LI') {
			return;
		}

		this.activateTool(target.readAttribute('data-tool'));
	}.bind(this));

	// toggle panel
	this.toggles_el = new Element('ul', {
		'class': 'toggles'
	});
	sidebar.insert(this.toggles_el);
	this.toggles_el.observe('click', function(event) {
		var target = event.target;
		if(target.tagName.toUpperCase() != 'LI') {
			return;
		}

		this.toggle(target.readAttribute('data-toggle'));
	}.bind(this));

	// area
	this.area_el = new Element('div', {
		'class': 'area'
	});
	this.container.insert(this.area_el);

	// sidebar
	this.sidebar_el = new Element('div', {
		'class': 'sidebar'
	});
	this.container.insert(this.sidebar_el);
	
	// swatches
	this.swatches_el = new Element('ul', {
		'class': 'swatches'
	});
	this.sidebar_el.insert(this.swatches_el);
	this.swatches_el.observe('click', function(event) {
		var target = event.target;
		if(target.tagName.toUpperCase() != 'LI') {
			return;
		}

		this.activateSwatch(target.readAttribute('data-color'));
	}.bind(this));

	// layers
	this.layers_el = new Element('ul', {
		'class': 'layers'
	});
	this.sidebar_el.insert(this.layers_el);
	this.layers_el.observe('click', function(event) {
		var target = event.target;
		
		switch(target.tagName.toUpperCase()) {
			case 'LI':
				this.activateLayer(target.readAttribute('data-index'));
				break;
			case 'SPAN':
				if(target.hasClassName('lock')) {
					var index = target.up('li').readAttribute('data-index'),
						layer = this.layers[index];
					this[layer.locked ? 'unlockLayer' : 'lockLayer'](index);
				}
				break;
		}
	}.bind(this));

	// layer toolbar
	var toolbar = new Element('ul', {
		'class': 'toolbar'
	});
	this.sidebar_el.insert(toolbar);

	var button;
	button = new Element('li', {
		'class': 'new-layer'
	});
	button.update('New layer');
	button.observe('click', function() {
		this.createEmptyLayer();
	}.bind(this));
	toolbar.insert(button);

	button = new Element('li', {
		'class': 'delete-layer'
	});
	button.update('Delete layer');
	button.observe('click', function() {
		this.deleteActiveLayer();
	}.bind(this));
	toolbar.insert(button);

	// tool options
	this.controls = {};
	this.tool_options_el = new Element('ul', {
		'class': 'tool-options'
	});
	this.sidebar_el.insert(this.tool_options_el);

	var option_el = new Element('li');
	this.tool_options_el.insert(option_el);
	var size_control = new Element('input', {
		'type': 'range',
		'min': '2',
		'max': '50'
	}).setValue('1');
	this.controls.size = size_control;
	option_el.insert(new Element('label')
		.update('Size')
	);
	option_el.insert(size_control);
	size_control.observe('change', function() {
		this.setActiveToolSize(this.controls.size.getValue());
	}.bind(this));


	// -- PANEL ITEMS --
	// layers
	var dataLayers = this.container.readAttribute('data-layers'),
		layers = !!dataLayers ? dataLayers.evalJSON() : false;

	this.layers = [];
	
	this.createBackgroundLayer();
	this.createGridLayer();
	this.createTempLayer();
	if(!layers) {
		this.createEmptyLayer();
	}

	// tool panel items
	var tools = Editor.tools;
	this.tools = {};
	for(i in tools) {
		if(tools.hasOwnProperty(i)) {
			var tool_el = new Element('li', {
				'class': i,
				'data-tool': i
			}).update(i);
			this.tools_el.insert(tool_el);

			this.tools[i] = {
				item: tool_el
			};
			if(tools[i].listeners !== undefined && tools[i].listeners.init !== undefined) {
				tools[i].listeners.init.call(this, tools[i]);
			}
		}
	}

	// toggle panel items
	var toggles = Editor.toggles;
	this.toggles = {};
	for(i in toggles) {
		if(toggles.hasOwnProperty(i)) {
			var toggle_el = new Element('li', {
				'class': i,
				'data-toggle': i
			}).update(i);
			this.toggles_el.insert(toggle_el);

			this.toggles[i] = {
				item: toggle_el
			};

			if(toggles[i].active) {
				this.toggle(i, true);
			} else {
				this.toggle(i, false);
			}
		}
	}

	// swatch panel items
	var swatches = ['#FF0000', '#00FF00', '#0000FF', '#000000', '#FFFFFF'];
	for(var s = 0, ss = swatches.length; s < ss; ++s) {
		var swatch_el = new Element('li', {
			'data-color': swatches[s]
		});
		swatch_el.setStyle({
			'backgroundColor': swatches[s]
		});
		swatch_el.observe('mousedown', function(event) {
			event.preventDefault();

			this.swatch_drag = event.target.readAttribute('data-color');
			var fn_mouseup = function(event) {
				Event.stopObserving(window, 'mouseup', fn_mouseup);
				this.swatch_drag = undefined;
			}.bind(this);
			Event.observe(window, 'mouseup', fn_mouseup);
		}.bind(this));
		this.swatches_el.insert(swatch_el);

		if(s === 0) {
			this.activateSwatch(swatches[s]);
		}
	}


	// cursor
	//var 
};

Editor.prototype.addListeners = function() {
	Event.observe(this.area_el, 'mousedown', function(event) {
		Editor.env.mousedown = true;

		if(this.active_layer.locked || this.active_layer.canvas === undefined) {
			this.area_el.setStyle({
				'cursor': 'not-allowed'
			});
			event.preventDefault();
			return false;
		}

		Editor.env.in_draw = true;

		var coords = [
			event.pageX - this.area_el.offsetLeft,
			event.pageY - this.area_el.offsetTop
		];
		if(Editor.env.grid && Editor.tools[this.active_tool].grid !== false) {
			coords = this.applyGridToCoords(coords);
		}

		var data = {
			'x': coords[0],
			'y': coords[1],
			'button': event.button,
			'ctrlKey': event.ctrlKey,
			'altKey': event.altKey,
			'shiftKey': event.shiftKey
		};

		if(this.tool_listeners.mousedown !== undefined) {			
			this.tool_listeners.mousedown.call(this, data, this.active_layer.context);
		}

		this.last_mouse_event = data;

		event.preventDefault();
		return false;
	}.bind(this));

	Event.observe(window, 'mouseup', function(event) {
		if(!Editor.env.mousedown) {
			return;
		}

		if(this.active_layer.locked || this.active_layer.canvas === undefined) {
			this.area_el.setStyle({
				'cursor': Editor.tools[this.active_tool].cursor || 'default'
			});
		}

		Editor.env.mousedown = false;

		var coords = [
			event.pageX - this.area_el.offsetLeft,
			event.pageY - this.area_el.offsetTop
		];	
		if(Editor.env.grid && Editor.tools[this.active_tool].grid !== false) {
			coords = this.applyGridToCoords(coords);
		}

		var data = {
			'x': coords[0],
			'y': coords[1],
			'button': event.button,
			'ctrlKey': event.ctrlKey,
			'altKey': event.altKey,
			'shiftKey': event.shiftKey
		};

		if(this.tool_listeners.mouseup !== undefined) {
			this.tool_listeners.mouseup.call(this, data, this.active_layer.context);
		}

		this.last_mouse_event = data;
	}.bind(this));

	Event.observe(window, 'mousemove', function(event) {
		if(!Editor.env.mousedown || this.active_layer.locked) {
			return;
		}
		if(Editor.env.in_draw) {
			event.preventDefault();
		}

		var coords = [
			event.pageX - this.area_el.offsetLeft,
			event.pageY - this.area_el.offsetTop
		];	
		if(Editor.env.grid && Editor.tools[this.active_tool].grid !== false) {
			coords = this.applyGridToCoords(coords);
		}

		var data = {
			'x': coords[0],
			'y': coords[1],
			'button': event.button,
			'ctrlKey': event.ctrlKey,
			'altKey': event.altKey,
			'shiftKey': event.shiftKey
		};

		if(this.tool_listeners.mousemove !== undefined) {
			this.tool_listeners.mousemove.call(this, data, this.active_layer.context);
		}

		this.last_mouse_event = data;
	}.bind(this));

	Event.observe(window, 'focus', function() {
		var plugin = document.embeds['wacom-plugin'];
		document.body.removeChild(plugin);
		document.body.appendChild(plugin);
	});
};

Editor.prototype.applyGridToCoords = function(coords) {
	var step = this.params.gridStep,
		x = coords[0],
		y = coords[1],
		a = x % step,
		b = y % step,
		half_step = step / 2;
	
	if(a < half_step) {
		if(b < half_step) {
			x -= a;
			y -= b;
		} else {
			x -= a;
			y += step - b;
		}
	} else {
		if(b < half_step) {
			x += step - a;
			y -= b;
		} else {
			x += step - a;
			y += step - b;
		}
	}

	return [x, y];
};

Editor.prototype.createBackgroundLayer = function() {
	this.area_el.setStyle({
		'backgroundColor': this.params.backgroundColor
	});

	var layer_item_el = new Element('li', {
		'class': 'background',
		'item': layer_item_el
	})
		.update('background');
	layer_item_el.observe('mouseover', function(event) {
		if(!this.swatch_drag) {
			return;
		}

		event.target.addClassName('swatch-change');
	}.bind(this));
	layer_item_el.observe('mouseup', function(event) {
		if(!this.swatch_drag) {
			return;
		}

		this.area_el.setStyle({
			'backgroundColor': this.swatch_drag
		});
		event.target.select('.swatch').first().setStyle({
			'backgroundColor': this.swatch_drag
		});
		event.target.removeClassName('swatch-change');
	}.bind(this));
	layer_item_el.observe('mouseout', function(event) {
		if(!this.swatch_drag) {
			return;
		}

		event.target.removeClassName('swatch-change');
	}.bind(this));

	var swatch_el = new Element('span', {
		'class': 'swatch'
	});
	swatch_el.setStyle({
		'backgroundColor': this.params.backgroundColor
	});
	layer_item_el.insert({
		'top': swatch_el
	});

	this.layers_el.insert(layer_item_el);

	var lock_el = new Element('span', {
		'class': 'lock'
	});
	layer_item_el.insert(lock_el);
	
	var layer = {
		'backgroundColor': this.params.backgroundColor,
		'item': layer_item_el
	};
	var num = this.layers.push(layer);
	layer_item_el.writeAttribute('data-index', num-1);
};

Editor.prototype.createGridLayer = function() {
	var w = this.area_el.clientWidth,
		h = this.area_el.clientHeight;
	var canvas = new Element('canvas', {
		'width': w,
		'height': h,
		'transparent': 'true',
		'class': 'grid'
	});
	var context = canvas.getContext('2d');
	this.area_el.insert({
		'top': canvas
	});

	this.grid_layer = {
		'canvas': canvas,
		'context': context
	};

	var step = this.params.gridStep;
	context.lineWidth = 2;
	context.strokeStyle = 'rgba(0, 0, 0, 0.05)';
	context.beginPath();
	for(var x = 0; x < w; ++x) {
		if(x % step === 0) {
			context.moveTo(x, 0);
			context.lineTo(x, h);
		}
	}
	for(var y = 0; y < h; ++y) {
		if(y % step === 0) {
			context.moveTo(0, y);
			context.lineTo(w, y);
		}
	}
	context.closePath();
	context.stroke();
};

Editor.prototype.createTempLayer = function() {
	var canvas = new Element('canvas', {
		'width': this.area_el.clientWidth,
		'height': this.area_el.clientHeight,
		'transparent': 'true',
		'class': 'temp'
	});
	this.area_el.insert(canvas);

	this.temp_layer = {
		'canvas': canvas,
		'context': canvas.getContext('2d')
	};
};

Editor.prototype.createEmptyLayer = function() {
	var canvas = new Element('canvas', {
		'width': this.area_el.clientWidth,
		'height': this.area_el.clientHeight,
		'transparent': 'true'
	});
	var el = this.area_el.select('.selection-content').first();
	if(!el) {
		this.area_el.insert(canvas);
	} else {
		el.insert({
			'before': canvas
		});
	}

	var layer_item_el = new Element('li', {
		'class': 'canvas'
	}).update('canvas');
	this.layers_el.insert({
		'top': layer_item_el
	});

	var lock_el = new Element('span', {
		'class': 'lock'
	});
	layer_item_el.insert(lock_el);
	
	var layer = {
		'canvas': canvas,
		'context': canvas.getContext('2d'),
		'item': layer_item_el
	};
	var num = this.layers.push(layer);
	layer_item_el.writeAttribute('data-index', num-1);
	
	this.activateLayer(num-1);
};

Editor.prototype.createImageLayer = function(uri) {
	var canvas = new Element('canvas', {
		'width': this.area_el.clientWidth,
		'height': this.area_el.clientHeight,
		'transparent': 'true'
	});
	this.area_el.insert(canvas);

	var layer_item_el = new Element('li', {
		'class': 'canvas'
	}).update('canvas');
	this.layers_el.insert({
		'top': layer_item_el
	});

	var layer = {
		'canvas': canvas,
		'context': canvas.getContext('2d'),
		'item': layer_item_el
	};
	var num = this.layers.push(layer);
	layer_item_el.writeAttribute('data-index', num-1);
	this.activateLayer(num-1);
};

Editor.prototype.activateLayer = function(index) {
	var layer = this.layers[index];
	if(layer === undefined) {
		throw 'The layer does not exist.';
	}

	if(this.active_layer !== undefined) {
		this.active_layer.item.removeClassName('active');
	}
	this.active_layer = layer;
	layer.item.addClassName('active');
	
	if(this.active_tool !== undefined && layer.canvas !== undefined) {
		var tool = Editor.tools[this.active_tool];
		layer.context.globalCompositeOperation = tool.mode || 'source-over';
		layer.context.lineWidth = tool.size || 1;
		layer.context.lineCap = tool.lineCap || 'round';
		layer.context.lineJoin = tool.lineJoin || tool.lineCap || 'round';
	}
};
Editor.prototype.lockLayer = function(index) {
	var layer = this.layers[index];
	if(layer === undefined || layer.locked) {
		return;
	}

	layer.locked = true;
	layer.item.addClassName('locked');
};
Editor.prototype.unlockLayer = function(index) {
	var layer = this.layers[index];
	if(layer === undefined || !layer.locked) {
		return;
	}

	layer.locked = false;
	layer.item.removeClassName('locked');
};
Editor.prototype.deleteActiveLayer = function() {
	var layer = this.active_layer;
	if(layer === undefined || layer.locked || layer.canvas === undefined) {
		return;
	}

	var index = layer.item.readAttribute('data-index');

	layer.canvas.remove();
	layer.item.remove();

	this.activateLayer(index > 0 ? index - 1 : index + 1);

	delete this.layers[index];
};

Editor.prototype.activateTool = function(name) {
	var tool = Editor.tools[name];
	if(tool === undefined) {
		throw 'The tool '+name+' is not defined.';
	}

	var active_tool = this.active_tool;
	if(active_tool !== undefined) {
		this.tools[active_tool].item.removeClassName('active');

		if(Editor.tools[active_tool].listeners.blur !== undefined) {
			Editor.tools[active_tool].listeners.blur.call(this, this.active_layer.context);
		}
	}

	this.active_tool = name;
	this.tool_listeners = tool.listeners || {};
	this.area_el.setStyle({
		'cursor': tool.cursor || 'default'
	});

	if(this.active_layer && this.active_layer.context !== undefined) {
		this.active_layer.context.globalCompositeOperation = tool.mode;
		this.active_layer.context.lineWidth = tool.size;
		this.active_layer.context.lineCap = tool.lineCap || 'round';
		this.active_layer.context.lineJoin = tool.lineJoin || tool.lineCap || 'round';
	}

	this.tools[name].item.addClassName('active');

	if(tool.listeners.focus !== undefined) {
		tool.listeners.focus.call(this);
	}

	var size = tool.size;
	if(size === null) {
		size = Editor.tools[this.params.defaultTool].size;
	} else if(size === false) {
		this.controls.size.disable();
		return;
	}
	this.controls.size.enable();
	this.controls.size.setValue(size);
};

Editor.prototype.activateSwatch = function(color) {
	this.active_swatch = Editor.hex2rgb(color);
};

Editor.prototype.toggle = function(name, value) {
	if(this.toggles.hasOwnProperty(name)) {
		var toggle = Editor.toggles[name];
		toggle.active = (value !== undefined) ? !!value : !toggle.active;
		toggle[toggle.active ? 'activate' : 'deactivate'].call(this);
		if(toggle.active) {
			this.toggles[name].item.addClassName('active');
		} else {
			this.toggles[name].item.removeClassName('active');
		}
	}
};

Editor.prototype.getActiveToolSize = function() {
	var tool_size = Editor.tools[this.active_tool].size;
	if(tool_size === null) {
		tool_size = Editor.tools[this.params.defaultTool].size;
	} else if(tool_size === false) {
		return false;
	}

	return tool_size;
};
Editor.prototype.setActiveToolSize = function(new_value) {
	var tool = Editor.tools[this.active_tool],
		tool_size = tool.size;

	if(tool_size === null) {
		tool = Editor.tools[this.params.defaultTool];
		tool_size = tool.size;
	} else if(tool_size === false) {
		return false;
	}

	tool.size = new_value;
};

Editor.prototype.getWacomPlugin = function() {
	var plugin = document.embeds['wacom-plugin'];
	if(!Editor.env.tablet_support || !plugin.isWacom || plugin.pointerType === 0) {
		return this.wacom_plugin_defaults;
	}
	return plugin;
};


window.Editor = Editor;
})();


// We need to extend the canvas context prototype to add support for circular shapes
// ---
// Source: http://webreflection.blogspot.com/2009/01/ellipse-and-circle-for-canvas-2d.html
// ---
// Circle methods
CanvasRenderingContext2D.prototype.circle = function(aX, aY, aDiameter) {
    this.ellipse(aX, aY, aDiameter, aDiameter);
};
CanvasRenderingContext2D.prototype.fillCircle = function(aX, aY, aDiameter) {
    this.beginPath();
    this.circle(aX, aY, aDiameter);
    this.closePath();
    this.fill();
};
CanvasRenderingContext2D.prototype.strokeCircle = function(aX, aY, aDiameter) {
    this.beginPath();
    this.circle(aX, aY, aDiameter);
    this.closePath();
    this.stroke();
};
// Ellipse methods
CanvasRenderingContext2D.prototype.ellipse = function(aX, aY, aWidth, aHeight) {
    var hB = (aWidth / 2) * 0.5522848,
        vB = (aHeight / 2) * 0.5522848,
        eX = aX + aWidth,
        eY = aY + aHeight,
        mX = aX + aWidth / 2,
        mY = aY + aHeight / 2;
    this.moveTo(aX, mY);
    this.bezierCurveTo(aX, mY - vB, mX - hB, aY, mX, aY);
    this.bezierCurveTo(mX + hB, aY, eX, mY - vB, eX, mY);
    this.bezierCurveTo(eX, mY + vB, mX + hB, eY, mX, eY);
    this.bezierCurveTo(mX - hB, eY, aX, mY + vB, aX, mY);
};
CanvasRenderingContext2D.prototype.fillEllipse = function(aX, aY, aWidth, aHeight) {
    this.beginPath();
    this.ellipse(aX, aY, aWidth, aHeight);
    this.closePath();
    this.fill();
};
CanvasRenderingContext2D.prototype.strokeEllipse = function(aX, aY, aWidth, aHeight) {
    this.beginPath();
    this.ellipse(aX, aY, aWidth, aHeight);
    this.closePath();
    this.stroke();
};