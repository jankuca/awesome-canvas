goog.provide('awesomeCanvas.Tools');

/**
 * @type {Object.<string, Object>}
 */
awesomeCanvas.Tools = {};

awesomeCanvas.Tools['brush'] = {
  'title': 'Brush',
  mode: 'source-over',
  cursor: 'crosshair',
  size: 2,
  listeners: {
    mousedown: function (editor, e, ctx) {
      if (e.button !== 0) {
        return;
      }
      ctx.fillStyle = "rgba(" + (editor.active_swatch.join(',')) + "," + editor.getWacomPlugin()['pressure'] + ")";
      ctx.lineWidth = editor.getActiveToolSize();
      ctx.beginPath();
      ctx.arc(e.x, e.y, ctx.lineWidth / 2, 0, Math.PI * 2, false);
      ctx.closePath();
      ctx.fill();
      editor.e_ = e;
    },
    mousemove: function (editor, e, ctx) {
      var last = editor.e_
      if (!awesomeCanvas.Editor.env.mousedown || e.button !== 0 || !last) {
        return;
      }
      ctx.strokeStyle = "rgba(" + (editor.active_swatch.join(',')) + "," + editor.getWacomPlugin()['pressure'] + ")";
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(e.x, e.y);
      ctx.closePath();
      ctx.stroke();
      editor.e_ = e;
    }
  }
};

awesomeCanvas.Tools['line'] = {
  'title': 'Line',
  mode: 'source-over',
  cursor: 'crosshair',
  size: null,

  listeners: {
    mousedown: function (editor, event, context) {
      if (event.button !== 0) {
        return;
      }

      var tool = awesomeCanvas.Tools[editor.active_tool];
      tool.in_draw = true;        

      tool.start_event = event;
    },
    mousemove: function (editor, event, context) {
      if (!awesomeCanvas.Editor.env.mousedown || event.button !== 0) {
        return;
      }

      var tool = awesomeCanvas.Tools[editor.active_tool],
        start_event = tool.start_event,
        temp_canvas = editor.temp_layer.canvas,
        temp_context = editor.temp_layer.context;
      
      temp_canvas.reset();
      temp_context.strokeStyle = 'rgb(' + editor.active_swatch.join(',') + ')';

      temp_context.beginPath();
      temp_context.moveTo(start_event.x, start_event.y);
      temp_context.lineTo(event.x, event.y);
      temp_context.closePath();
      temp_context.stroke();
    },
    mouseup: function (editor, event, context) {
      var tool = awesomeCanvas.Tools[editor.active_tool];
      
      if(!tool.in_draw) {
        return;
      }
      tool.in_draw = false;

      var start_event = tool.start_event,
        temp_canvas = editor.temp_layer.canvas;
      
      temp_canvas.reset();

      context.strokeStyle = 'rgb(' + editor.active_swatch.join(',') + ')';
      context.lineWidth = editor.getActiveToolSize();

      context.beginPath();
      context.moveTo(start_event.x, start_event.y);
      context.lineTo(event.x, event.y);
      context.closePath();
      context.stroke();
    }
  }
};

awesomeCanvas.Tools['rectangle'] = {
  'title': 'Rectangle',
  mode: 'source-over',
  lineCap: 'butt',
  lineJoin: 'miter',
  cursor: 'crosshair',
  size: null,
  filled: true,

  listeners: {
    mousedown: function (editor, event, context) {
      if (event.button !== 0) {
        return;
      }

      var tool = awesomeCanvas.Tools[editor.active_tool];
      tool.in_draw = true;        

      tool.start_event = event;
    },
    mousemove: function (editor, event, context) {
      if (!awesomeCanvas.Editor.env.mousedown || event.button !== 0) {
        return;
      }

      var tool = awesomeCanvas.Tools[editor.active_tool],
        start_event = tool.start_event,
        altKey = event.altKey,
        temp_canvas = editor.temp_layer.canvas,
        temp_context = editor.temp_layer.context,
        delta_y = event.y - start_event.y,
        delta_x = event.x - start_event.x;
      
      if (event.shiftKey) {
        delta_x = (delta_x > 0) ? Math.abs(delta_y) : -Math.abs(delta_y);
      }
      
      temp_canvas.reset();

      temp_context.strokeStyle = 'rgb(' + editor.active_swatch.join(',') + ')';

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
    mouseup: function (editor, event, context) {
      var tool = awesomeCanvas.Tools[editor.active_tool];
      
      if (!tool.in_draw) {
        return;
      }
      tool.in_draw = false;

      var start_event = tool.start_event,
        altKey = event.altKey,
        temp_canvas = editor.temp_layer.canvas,
        delta_y = event.y - start_event.y,
        delta_x = event.x - start_event.x,
        size = editor.getActiveToolSize();
      
      if(event.shiftKey) {
        delta_x = (delta_x > 0) ? Math.abs(delta_y) : -Math.abs(delta_y);
      }

      temp_canvas.reset();

      context.strokeStyle = 'rgb(' + editor.active_swatch.join(',') + ')';
      context.lineWidth = size;

      context.beginPath();
      context.rect(
        (!altKey ? start_event.x : start_event.x - delta_x) + (delta_x > 0 ? size / 2 : -size / 2),
        (!altKey ? start_event.y : start_event.y - delta_y) + (delta_y > 0 ? size / 2 : -size / 2),
        (!altKey ? delta_x : 2 * delta_x) - (delta_x > 0 ? size : -size),
        (!altKey ? delta_y : 2 * delta_y) - (delta_y > 0 ? size : -size)
      );
      context.closePath();
      context.stroke();
    }
  }
};

awesomeCanvas.Tools['ellipse'] = {
  'title': 'Ellipse',
  mode: 'source-over',
  cursor: 'crosshair',
  size: null,
  filled: true,

  listeners: {
    mousedown: function (editor, event, context) {
      if (event.button !== 0) {
        return;
      }

      var tool = awesomeCanvas.Tools[editor.active_tool];
      tool.in_draw = true;        

      tool.start_event = event;
    },
    mousemove: function (editor, event, context) {
      if(!awesomeCanvas.Editor.env.mousedown || event.button !== 0) {
        return;
      }

      var tool = awesomeCanvas.Tools[editor.active_tool],
        start_event = tool.start_event,
        altKey = event.altKey,
        temp_canvas = editor.temp_layer.canvas,
        temp_context = editor.temp_layer.context,
        delta_y = event.y - start_event.y,
        delta_x = event.x - start_event.x;
      
      if(event.shiftKey) {
        delta_x = (delta_x > 0) ? Math.abs(delta_y) : -Math.abs(delta_y);
      }
      
      temp_canvas.reset();

      temp_context.strokeStyle = 'rgb(' + editor.active_swatch.join(',') + ')';

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
    mouseup: function (editor, event, context) {
      var tool = awesomeCanvas.Tools[editor.active_tool];
      
      if (!tool.in_draw) {
        return;
      }
      tool.in_draw = false;

      var start_event = tool.start_event,
        altKey = event.altKey,
        temp_canvas = editor.temp_layer.canvas,
        delta_y = event.y - start_event.y,
        delta_x = event.x - start_event.x;
      
      if (event.shiftKey) {
        delta_x = (delta_x > 0) ? Math.abs(delta_y) : -Math.abs(delta_y);
      }

      temp_canvas.reset();

      context.strokeStyle = 'rgb(' + editor.active_swatch.join(',') + ')';
      context.lineWidth = editor.getActiveToolSize();

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
};

awesomeCanvas.Tools['eraser'] = {
  'title': 'Eraser',
  mode: 'destination-out',
  cursor: 'crosshair',
  size: 20,
  grid: false,

  listeners: {
    focus: function () {
    },
    mousedown: function (editor, event, context) {
      if (event.button !== 0) {
        return;
      }

      context.lineWidth = editor.getActiveToolSize();

      context.beginPath();
      context.arc(event.x, event.y, context.lineWidth / 2, 0, Math.PI*2, false);
      context.closePath();
      context.fill();

      editor.last_mouse_event = event;
    },
    mousemove: function (editor, event, context) {
      if (!awesomeCanvas.Editor.env.mousedown || event.button !== 0) {
        return;
      }

      var last = editor.last_mouse_event;

      context.beginPath();
      context.moveTo(last.x, last.y);
      context.lineTo(event.x, event.y);
      context.closePath();
      context.stroke();

      editor.last_mouse_event = event;
    }
  }
};
awesomeCanvas.Tools['marquee'] = {
  'title': 'Selection',
  mode: 'source-over',
  cursor: 'crosshair',
  size: false,

  // Tool state: 0=idle, 1=selecting, 2=selected, 3=moving
  _state: 0,

  listeners: {
    init: function (editor, tool) {
      var canvas;
      canvas = goog.dom.createDom('canvas', {
        'width': editor.area.clientWidth,
        'height': editor.area.clientHeight,
        'transparent': 'true',
        'class': 'selections'
      });
      goog.dom.appendChild(editor.area, canvas);

      editor.selection_layer = {
        canvas: canvas,
        context: canvas.getContext('2d')
      };

      canvas = goog.dom.createDom('canvas', {
        'width': editor.area.clientWidth,
        'height': editor.area.clientHeight,
        'transparent': 'true',
        'class': 'selection-content'
      });
      goog.dom.appendChild(editor.area, canvas);

      editor.selection_content_layer = {
        canvas: canvas,
        context: canvas.getContext('2d')
      };  
    },

    blur: function (editor, context) {
      var tool = awesomeCanvas.Tools[editor.active_tool],
        temp_canvas = editor.selection_content_layer.canvas,
        stroke_canvas = editor.selection_layer.canvas;

      if (tool._moved) {
        var data = temp_canvas.toDataURL();
        var image = new Image();
        image.onload = function () {
          context.globalCompositeOperation = tool.mode;
          context.drawImage(editor, 0, 0);
        };
        image.src = data;

        tool._state = 0;
        tool._moved = false;
      }
      temp_canvas.reset();
      stroke_canvas.reset();
      
      tool._selection = undefined;
    },

    mousedown: function (editor, event, context) {
      var tool = awesomeCanvas.Tools[editor.active_tool];
      if(tool._state == 2) { // selected
        var temp_canvas = editor.selection_content_layer.canvas,
          temp_context = editor.selection_content_layer.context,
          stroke_canvas = editor.selection_layer.canvas,
          selection = tool._selection;
        
        if (awesomeCanvas.isPointInSelection(event.x, event.y, selection)) {
          // if the content has not been moved yet
          if (!tool._moved) {
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
          temp_canvas.reset();
          stroke_canvas.reset();
          var image = new Image();
          image.onload = function () {
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
    mousemove: function (editor, event, context) {
      var tool = awesomeCanvas.Tools[editor.active_tool],
        delta,
        selection;

      switch (tool._state) {
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

        var temp_canvas = editor.selection_content_layer.canvas,
          temp_context = editor.selection_content_layer.context;
        selection = tool._selection;
        // empty the temp layer
        temp_canvas.reset();
        // put the data in the temp layer
        temp_context.putImageData(tool._data, selection[0], selection[1]);

        tool._last_event = event;
        break;
      }

      var stroke_canvas = editor.selection_layer.canvas,
        stroke_context = editor.selection_layer.context;
      selection = tool._selection;
      // empty the stroke layer
      stroke_canvas.reset();
      // stroke the selected area
      stroke_context.beginPath();
      stroke_context.rect.apply(stroke_context, selection);
      stroke_context.closePath();
      stroke_context.stroke();
    },
    mouseup: function (editor, event, context) {
      var tool = awesomeCanvas.Tools[editor.active_tool],
        delta,
        selection;

      switch(tool._state) {
      case 1: // selecting
        delta = [
          event.x - tool._start_event.x,
          event.y - tool._start_event.y
        ];

        if (delta[0] === 0 || delta[1] === 0) {
          tool._selection = undefined;
          return;
        }

        tool._selection[2] = delta[0];
        tool._selection[3] = delta[1];

        var stroke_canvas = editor.selection_layer.canvas,
          stroke_context = editor.selection_layer.context;
        selection = tool._selection;
        // empty the stroke layer
        stroke_canvas.reset();
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

        var temp_canvas = editor.selection_content_layer.canvas,
          temp_context = editor.selection_content_layer.context;
        selection = tool._selection;
        // empty the temp layer
        temp_canvas.reset();
        // put the data in the temp layer
        temp_context.putImageData(tool._data, selection[0], selection[1]);

        tool._state = 2; // selected
        tool._moved = true;
      }
    }
  }
};

