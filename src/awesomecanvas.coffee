Editor = Function.inherit (container, params) ->
	@container = container
	if params
		Object.keys(params).forEach (key) ->
			@params[key] = params[key]
		, this

	do @_build
	@activateSwatch @params.default_swatch
	@activateTool @params.default_tool
	return
,
	applyGridToCoords: (coords) ->
		step = @params.grid_step
		x = coords[0]
		y = coords[1]
		a = x % step
		b = y % step
		if a < step / 2
			if b  < step / 2
				x -= a
				y -= b
			else
				x -= a
				y += step - b
		else
			if b < step / 2
				x += step - a
				y -= b
			else
				x += step - a
				y += step - b
		return [x, y]

	_build: ->
		@container.html ''
		do @_initWacomPlugin
		do @_buildArea
		do @_buildToolbar
		do @_buildSidebar
		do @_buildLayers
		do @_addListeners

	_buildArea: ->
		@area = new Element 'div',
			class: 'area'
		@container.insert @area

	_buildToolbar: ->
		@toolbar = new Element 'div',
			class: 'toolbar'
		@container.insert top: @toolbar

		do @_buildToolPanel
		do @_buildTogglePanel
	
	_buildToolPanel: ->
		that = this

		@tool_panel = new Element 'ul',
			class: 'tools'
		@toolbar.insert @tool_panel
		@tool_panel.addEventListener 'click', (e) ->
			target = e.target
			return if target.tagName isnt 'LI'
			that.activateTool target.data 'tool'

		do @_buildToolControls

	_buildTogglePanel: ->
		that = this

		@toggle_panel = new Element 'ul',
			class: 'toggles'
		@toolbar.insert @toggle_panel
		@toggle_panel.addEventListener 'click', (e) ->
			target = e.target
			return if target.tagName isnt 'LI'
			that.toggle target.data 'toggle'

		do @_buildToggleControls

	_buildSidebar: ->
		@sidebar = new Element 'div',
			class: 'sidebar'
		@container.insert @sidebar

		do @_buildSwatchPanel
		do @_buildLayerPanel
		do @_buildOptionToolbar
	
	_buildSwatchPanel: ->
		that = this

		@swatch_panel = new Element 'div',
			class: 'swatches'
		@sidebar.insert @swatch_panel
		list = new Element 'ul'
		@swatch_panel.insert list
		list.addEventListener 'click', (e) ->
			target = e.target
			return if target.tagName isnt 'LI'
			that.activateSwatch target.data 'color'

		that._dragged_swatch = null
		list.addEventListener 'mousedown', (e) ->
			target = e.target
			return if target.tagName isnt 'LI'
			# drag info
			that._dragged_swatch = target.data 'swatch'
			start = [e.clientX, e.clientY]
			# create ghost
			ghost_offset = [target.offsetLeft + 16, target.offsetTop + 24]
			ghost = new Element 'li'
			ghost_style = ghost.style
			ghost_style.position = 'absolute'
			ghost_style.left = ghost_offset[0] + 'px'
			ghost_style.top = ghost_offset[1] + 'px'
			ghost_style.backgroundColor = that._dragged_swatch
			ghost_style.zIndex = 3
			list.insert ghost
			# manage ghost
			target.addEventListener 'mousemove', (e) ->
				return if not that._dragged_swatch
				ghost.style.left = offset[0] + e.clientX - start[0] + 'px'
				ghost.style.top = offset[1] + e.clientY - start[1] + 'px'
			target.addEventListener 'mouseup', (e) ->
				that._dragged_swatch = null
				do ghost.remove
				@removeEventListener 'mousemove'
				@removeEventListener 'mouseup'

	_buildLayerPanel: ->
		that = this

		@layer_panel = new Element 'div',
			class: 'layers'
		@sidebar.insert @layer_panel
		list = new Element 'ul'
		@layer_panel.insert list
		list.addEventListener 'click', (e) ->
			target = e.target

			switch target.tagName
				when 'LI' then that.activateLayer target.data 'index'
				when 'SPAN'
					if target.hasClassName 'lock'
						index = target.parentNode.data 'index'
						layer = that.layers[index]
						that[if layer.locked then 'unlockLayer' else 'lockLayer'] index

		do @_buildLayerPanelToolbar
	
	_buildLayerPanelToolbar: ->
		that = this

		toolbar = new Element 'ul',
			class: 'toolbar'
		@layer_panel.insert toolbar

		button = new Element 'li',
			class: 'create'
		button.attr 'title', 'New layer'
		button.addEventListener 'click', -> do that.createEmptyLayer
		toolbar.insert button

		button = new Element 'li',
			class: 'delete'
		button.attr 'title', 'Delete layer'
		button.addEventListener 'click', -> do that.deleteActiveLayer
		toolbar.insert button

	_buildOptionToolbar: ->
		@options = {}

		@option_panel = new Element 'div',
			class: 'options'
		@sidebar.insert @option_panel
		list = new Element 'ul'
		@option_panel.insert list

		list.insert @_buildSizeControl()

	_buildSizeControl: ->
		that = this

		option = new Element 'li',
			class: 'size'
		control = new Element 'input',
			type: 'range'
			min: 2
			max: 50
			value: 1
		option.insert control
		Object.defineProperty @options, 'size',
			get: -> control.value
		control.addEventListener 'change', -> that.setActiveToolSize control.value
		return option

	_buildToolControls: ->
		that = this

		@tool_controls = {}
		tools = @constructor.tools
		Object.keys(tools).forEach (key) ->
			tool = tools[key]
			control = new Element 'li',
				title: tool.title
			control.data 'tool', key
			that.tool_panel.insert control
			that.tool_controls[key] = control
			tool.listeners.init.call this, control if tool.listeners and typeof tool.listeners.init is 'function'

	_buildToggleControls: ->
		that = this

		@toggles = {}
		toggles = @constructor.toggles
		Object.keys(toggles).forEach (key) ->
			toggle = toggles[key]
			control = new Element 'li',
				title: toggle.title
			control.data 'toggle', key
			that.toggle_panel.insert control
			that.toggle_controls[key] = control
			that.toggle key, toggle.active

	_buildSwatchControls: ->
		that = this

		swatches = @constructor.swatches
		swatches.forEach (swatch) ->
			control = new Element 'li'
			control.data 'swatch', swatch
			control.style.backgroundColor = swatch
			swatch_panel.findOne('ul').insert control

	_buildLayers: ->
		@layers = []
		do @_createBackgroundLayer
		do @_createGridLayer
		do @_createTempLayer
		do @createEmptyLayer
	
	_createBackgroundLayer: ->
		that = this

		@area.style.backgroundColor = @params.background_color

		layer =
			background_color: @params.background_color
		layer.index = -1 + @layers.push layer

		panel_item = do @_createLayerPanelItem
		panel_item.data 'index', layer.index
		panel_item.addClassName 'background'
		panel_item.findOne('.title').html 'Background layer'
		# swatch receiver	
		panel_item.addEventListener 'mouseover', (e) ->
			return if not that._dragged_swatch or that.background_layer.locked
			@addClassName 'swatch-change'
		panel_item.addEventListener 'mouseout', (e) ->
			return if not that._dragged_swatch or that.background_layer.locked
			@removeClassName 'swatch-change'
		# color node
		color_node = new Element 'span',
			class: 'swatch'
		color_node.style.backgroundColor = @params.background_color
		panel_item.insert color_node

	_createGridLayer: ->
		that = this

		w = @area.clientWidth
		h = @area.clientHeight
		canvas = new Element 'canvas',
			width: w
			height: h
			transparent: 'true'
			class: 'grid'
		@area.insert top: canvas

		@grid_layer =
			canvas: canvas
			context: canvas.getContext '2d'

		do @_drawGrid
	
	_drawGrid: ->
		ctx = @grid_layer.context
		step = @params.grid_step
		w = @grid_layer.canvas.width
		h = @grid_layer.canvas.height

		ctx.lineWidth = 2
		ctx.strokeStyle = @params.grid_color
		do ctx.beginPath
		for x in [0...w]
			if x % step is 0
				ctx.moveTo x, 0
				ctx.lineTo x, h
		for y in [0...h]
			if y % step is 0
				ctx.moveTo 0, y
				ctx.lineTo w, y
		do ctx.closePath
		do ctx.stroke

	_createTempLayer: ->
		canvas = new Element 'canvas',
			width: @area.clientWidth
			height: @area.clientHeight
			transparent: 'true'
			class: 'temp'
		@area.insert canvas

		@temp_layer =
			canvas: canvas
			context: canvas.getContext '2d'

	createEmptyLayer: ->
		canvas = new Element 'canvas',
			width: @area.clientWidth
			height: @area.clientHeight
			transparent: 'true'
		el = @area.findOne '.selection-content'
		if not el
			@area.insert canvas
		else
			el.insert before: canvas

		layer =
			canvas: canvas
			context: canvas.getContext '2d'
		layer.index = -1 + @layers.push layer

		panel_item = do @_createLayerPanelItem
		panel_item.findOne('.title').html 'New layer'
		panel_item.data 'index', layer.index
		@activateLayer layer.index

	_createLayerPanelItem: ->
		panel_item = new Element 'li'
		@layer_panel.findOne('ul').insert top: panel_item
		# title node
		title_node = new Element 'span',
			class: 'title'
		panel_item.insert title_node
		# lock node
		lock_node = new Element 'span',
			class: 'lock'
		panel_item.insert lock_node
		
		return panel_item

	_addListeners: ->
		that = this
		@area.addEventListener 'mousedown', (e) ->
			do e.preventDefault

			Editor.env.mousedown = yes

			if that.active_layer.locked or that.active_layer.canvas is undefined
				that.area.style.cursor = 'not-allowed'
				return false

			Editor.env.drawing = yes

			e = that.processEvent e
			tool = that.constructor.tools[that.active_tool]
			if typeof that.tool_listeners.mousedown is 'function'
				that.tool_listeners.mousedown.call that, e, that.active_layer.context
			that._e = e
			
			return false

		@area.addEventListener 'mouseup', (e) ->
			return if not Editor.env.mousedown
			Editor.env.mousedown = no

			tool = that.constructor.tools[that.active_tool]

			if that.active_layer.locked
				that.area.style.cursor = tool.cursor or 'default'

			e = that.processEvent e
			if typeof that.tool_listeners.mouseup is 'function'
				that.tool_listeners.mouseup.call that, e, that.active_layer.context
			that._e = e

		@area.addEventListener 'mousemove', (e) ->
			return if not Editor.env.mousedown or that.active_layer.locked
			do e.preventDefault if Editor.env.drawing

			e = that.processEvent e
			if typeof that.tool_listeners.mousemove is 'function'
				that.tool_listeners.mousemove.call that, e, that.active_layer.context
			that._e = e
	
	processEvent: (e) ->
		coords = [
			e.pageX - @area.offsetLeft
			e.pageY - @area.offsetTop
		]
		tool = @constructor.tools[@active_tool]
		if @grid and tool.grid isnt off
			coords = @applyGridToCoords coords

		x: coords[0]
		y: coords[1]
		button: e.button
		ctrlKey: e.ctrlKey
		altKey: e.altKey
		shiftKey: e.shiftKey


	activateLayer: (index) ->
		layer = @layers[index]
		throw new Error 'Undefined layer' if not layer

		if @active_layer
			active_item = @layer_panel.findOne('li[data-index="' + @active_layer.index + '"]')
			active_item.removeClassName 'active' unless active_item is null

		@active_layer = layer
		@layer_panel.findOne('li[data-index="' + index + '"]').addClassName 'active'

		do @_updateLayerContext
	
	activateNearestLayer: (index) ->
		max = @layers.length - 1
		while layer is undefined and ++index <= max
			layer = @layers[index]
		return @activateLayer index if layer isnt undefined
		while layer is undefined and --index >= 0
			layer = @layers[index]
		@activateLayer index if layer isnt undefined

	_updateLayerContext: ->
		layer = @active_layer
		return if not @active_tool or not layer or not layer.canvas
		tool = @constructor.tools[@active_tool]
		ctx = layer.context
		ctx.globalCompositeOperation = tool.mode or 'source-over'
		ctx.lineWidth = tool.size or 1
		ctx.lineCap = tool.lineCap or 'round'
		ctx.lineJoin = tool.lineJoin or tool.lineCap or 'round'

	lockLayer: (index) ->
		layer = @layers[index]
		throw new Error 'Undefined layer' if not layer
		layer.locked = yes
		@layer_panel.findOne('li[data-index="' + index + '"]').addClassName 'locked'
	
	unlockLayer: (index) ->
		layer = @layers[index]
		throw new Error 'Undefined layer' if not layer
		layer.locked = no
		@layer_panel.findOne('li[data-index="' + index + '"]').removeClassName 'locked'

	deleteActiveLayer: ->
		layer = @active_layer
		throw new Error 'Undefined layer' if not layer
		return if layer.locked

		do layer.canvas.remove
		do @layer_panel.findOne('li[data-index="' + layer.index + '"]').remove
		delete @layers[layer.index]

		@activateNearestLayer layer.index
		@activateLayer @layer_panel.findOne('li:last-child').data 'index' if not @active_layer

	activateTool: (key) ->
		tools = @constructor.tools
		tool = tools[key]
		throw new Error 'Undefined tool "' + key + '"' if not tool

		active_tool = @active_tool
		if active_tool
			@tool_controls[active_tool].removeClassName 'active'
			active_tool = tools[active_tool]
			if typeof active_tool.listeners.blur is 'function'
				active_tool.listeners.blur.call this, @active_layer.context

		@active_tool = key
		@tool_listeners = tool.listeners or {}
		@area.style.cursor = tool.cursor or 'default'
		@tool_controls[key].addClassName 'active'

		if typeof tool.listeners.focus is 'function'
			tool.listeners.focus.call this

		do @_updateSizeControl
		do @_updateLayerContext

	_updateSizeControl: ->
		tool = @constructor.tools[@active_tool]
		size = tool.size
		size = @constructor.tools[@params.default_tool].size if size is null

		size_control = @option_panel.findOne('.size input')
		return size_control.disabled = yes if size is off
		size_control.disabled = no
		size_control.value = size

	activateSwatch: (swatch) ->
		if swatch.match new RegExp '^#?[a-fA-F0-9]{6}$'
			@active_swatch = hex2rgb swatch
		else
			@active_swatch = swatch

	toggle: (key, value) ->
		toggle = @constructor.toggles[key]
		throw new Error 'Undefined toggle ("' + key + '")' if not toggle
		active = if value isnt 'undefined' then Boolean value else not @toggles[key]
		@toggles[key] = active
		toggle[if active then 'activate' else 'deactivate'].call this
		@toggle_controls[key][if active then 'addClassName' else 'removeClassName'] 'active'

	getActiveToolSize: ->
		size = @constructor.tools[@active_tool].size
		return @constructor.tools[@params.default_tool].size if size is null
		return size

	setActiveToolSize: (value) ->
		tool = @constructor.tools[@active_tool]
		size = tool.size
		return if size is off
		tool.size = Number value

	getWacomPlugin: ->
		plugin = @_wacom_plugin
		if not Editor.env.tablet_support or not plugin.isWacom or plugin.pointerType is 0
			return @wacom_defaults
		return plugin

	_initWacomPlugin: ->
		@_wacom_plugin = plugin = document.getElementById 'wacom-plugin'
		if not plugin
			plugin = new Element 'embed',
				id: 'wacom-plugin'
				type: 'application/x-wacom-tablet'
				hidden: yes
				pluginspage: 'http://www.wacom.com/productsupport/plugin.php'
			document.body.insert plugin

			window.addEventListener 'focus', (e) ->
				do plugin.remove
				document.body.insert plugin

Editor.tools = {}

Editor.tools.brush =
	mode: 'source-over'
	cursor: 'crosshair'
	size: 2
	listeners:
		mousedown: (e, ctx) ->
			return if e.button isnt 0

			ctx.fillStyle = "rgba(#{@active_swatch.join(',')},#{@getWacomPlugin.pressure})" 
			ctx.lineWidth = do @getActiveToolSize

			do ctx.beginPath
			ctx.arc e.x, e.y, ctx.lineWidth / 2, 0, Math.PI * 2, false
			do ctx.closePath
			do ctx.fill
			@_e = e

		mousemove: (e, ctx) ->
			return if not Editor.env.mousedown or e.button isnt 0

			ctx.strokeStyle = "rgba(#{@active_swatch.join(',')},#{@getWacomPlugin.pressure})"

			last = @_e
			do ctx.beginPath
			ctx.moveTo last.x, last.y
			ctx.lineTo e.x, e.y
			do ctx.closePath
			do ctx.stroke
			@_e = e


Editor.toggles = {}


Editor::params =
	background_color: '#FFFFFF'
	grid_color: 'rgba(0, 0, 0, 0.05)'
	grid_step: 20
	default_swatch: '#000000'
	default_tool: 'brush'

Editor::wacom_defaults =
	pressure: 1

Editor::swatches = [
	'#000000'
	'#FFFFFF'
	'#FF0000'
	'#00FF00'
	'#0000FF'
]

Editor.env =
	mousedown: no
	tool_size: 1
	tablet_support: on

window.AwesomeCanvas = Editor

# == UTILS ==
hex2rgb = (hex) ->
	hex = if hex.charAt(0) is '#' then hex.substring 1, 7 else hex
	return [
		parseInt(hex.substring(0, 2), 16)
		parseInt(hex.substring(2, 4), 16)
		parseInt(hex.substring(4, 6), 16)
	]


HTMLCanvasElement::reset = -> @width = @width


# We need to extend the canvas context prototype to add support for circular shapes
# ---
# Source: http://webreflection.blogspot.com/2009/01/ellipse-and-circle-for-canvas-2d.html
# ---

# Circle methods
CanvasRenderingContext2D::circle = (aX, aY, aDiameter) ->
	@ellipse aX, aY, aDiameter, aDiameter
CanvasRenderingContext2D::fillCircle = (aX, aY, aDiameter) ->
	do @beginPath
	@circle aX, aY, aDiameter
	do @closePath
	do @fill
CanvasRenderingContext2D::strokeCircle = (aX, aY, aDiameter) ->
	do @beginPath
	@circle aX, aY, aDiameter
	do @closePath
	do @stroke

# Ellipse methods
CanvasRenderingContext2D::ellipse = (aX, aY, aWidth, aHeight) ->
	hB = (aWidth / 2) * 0.5522848
	vB = (aHeight / 2) * 0.5522848
	eX = aX + aWidth
	eY = aY + aHeight
	mX = aX + aWidth / 2
	mY = aY + aHeight / 2
	@moveTo aX, mY
	@bezierCurveTo aX, mY - vB, mX - hB, aY, mX, aY
	@bezierCurveTo mX + hB, aY, eX, mY - vB, eX, mY
	@bezierCurveTo eX, mY + vB, mX + hB, eY, mX, eY
	@bezierCurveTo mX - hB, eY, aX, mY + vB, aX, mY
CanvasRenderingContext2D::fillEllipse = (aX, aY, aWidth, aHeight) ->
	do @beginPath
	@ellipse aX, aY, aWidth, aHeight
	do @closePath
	do @fill
CanvasRenderingContext2D::strokeEllipse = (aX, aY, aWidth, aHeight) ->
	do @beginPath
	@ellipse aX, aY, aWidth, aHeight
	do @closePath
	do @stroke
