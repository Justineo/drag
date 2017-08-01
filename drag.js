/**
 * @file drag.js
 * @author Justineo(justice360@gmail.com)
 */
(function (define) {
    var events = {};

    var vendorProps = {
        'user-select': ['-webkit-', '-moz-', '-ms-'],
        'transform': ['-webkit-', '-moz-', '-ms-'],
        'transition': ['-webkit-', '-moz-', '-ms-']
    };

    var prefixMap = {
        '-webkit-': 'webkit',
        '-moz-': 'Moz',
        '-ms-': 'ms'
    };

    for (var prop in vendorProps) {
        getSupportedAccessor(prop);
    }

    var regMatrix = /(matrix\((?:[^,]+,){4})([^,]+),([^,]+)(\))/i;
    var regMatrix3d = /(matrix3d\((?:[^,]+,){12})([^,]+),([^,]+)(,[^,]+,[^,]+\))/i;

    var translateMode = getSupportedAccessor('transform') ? 'transform' : 'offset';

    function convert(prop) {
        return prop.toLowerCase().replace(/(-\w+-)?([\w-]+)/, function (whole, prefix, standard) {
            prefix = prefix ? prefixMap[prefix] : '';
            var remain = (prefix ? '-' : '') + standard;
            return prefix + remain.replace(/-(\w)/g, function (matched, initial) {
                return initial.toUpperCase();
            });
        });
    }

    function getSupportedAccessor(prop) {
        var accessor = convert(prop);
        var prefixes = vendorProps[prop];
        if (!prefixes) {
            return prop;
        }
        if (typeof prefixes === 'string') {
            return convert(prefixes);
        }
        var elem = document.createElement('div');
        if (elem.style[accessor] !== undefined) {
            vendorProps[prop] = prop;
            return accessor;
        }
        for (var i = 0, j = prefixes.length; i < j; i++) {
            var prefix = prefixes[i];
            var prefixed = convert(prefix + prop);
            if (elem.style[prefixed] !== undefined) {
                vendorProps[prop] = prefix + prop;
                return prefixed;
            }
        }
        return null;
    }

    function getTransform(elem, isComputed) {
        var transform;
        var accessor = getSupportedAccessor('transform');
        if (isComputed) {
            transform = getComputed(elem, accessor);
        } else {
            transform = elem.style[accessor];
        }
        return transform;
    }

    function getScrollOffsets() {
        var result;
        if (window.scrollX !== undefined) {
            result = {
                x: window.scrollX,
                y: window.scrollY
            };
        } else if (window.pageXOffset !== undefined) {
            result = {
                x: window.pageXOffset,
                y: window.pageYOffset
            };
        } else if (document.compatMode === 'CSS1Compat') {
            result = {
                x: doc.scrollLeft,
                y: doc.scrollTop
            };
        } else {
            result = {
                x: document.body.scrollLeft,
                y: document.body.scrollTop
            };
        }
        return result;
    }

    function on(elem, type, listener) {
        if (elem.addEventListener) {
            elem.addEventListener(type, listener, false);
        }
        else if (elem.attachEvent) {
            elem.attachEvent('on' + type, listener);
        }
    }

    function off(elem, type, listener) {
        if (elem.removeEventListener) {
            elem.removeEventListener(type, listener, false);
        }
        else if (elem.attachEvent) {
            elem.detachEvent('on' + type, listener);
        }
    }

    function extend(target, source) {
        for (var key in source) {
            target[key] = source[key];
        }
        return target;
    }

    function attr(elem, attr, value) {
        if (arguments.length === 2) {
            return elem.getAttribute(attr);
        }

        if (value === null) {
            elem.removeAttribute(attr);
        } else {
            elem.setAttribute(attr, value);
        }
        return value;
    }

    function getComputed(elem, prop) {
        var getter = document.defaultView && document.defaultView.getComputedStyle;
        if (getter) {
            if (prop) {
                var accessor = getSupportedAccessor(prop);
                if (accessor) {
                    return getter(elem)[accessor];
                }
                return getter(elem)[prop];
            }
            return getter(elem);
        } else if (elem.currentStyle) {
            if (prop) {
                return elem.currentStyle[prop];
            }
            return elem.currentStyle;
        }
    }

    function getCSSText(elem) {
        if (typeof elem.style.cssText !== 'undefined') {
            return elem.style.cssText;
        }
        return attr(elem, 'style');
    }

    function addStyles(elem, styles, isReplace) {
        var cssText = '';
        if (typeof styles === 'object') {
            for (var prop in styles) {
                if (prop in vendorProps) {
                    cssText += ';' + vendorProps[prop] + ':' + styles[prop];
                } else {
                    cssText += ';' + prop + ':' + styles[prop];
                }
            }
        } else if (typeof styles ==='string') {
            cssText = styles;
        }
        if (typeof elem.style.cssText !== 'undefined') {
            elem.style.cssText = (isReplace ? '' : elem.style.cssText) + cssText;
        } else {
            attr(elem, 'style', (isReplace ? '' : attr(elem, 'style')) + cssText);
        }
    }

    function removeStyles(elem) {
        if (typeof elem.style.cssText !== 'undefined') {
            elem.style.cssText = '';
        } else {
            attr(elem, 'style', '');
        }
    }

    function extractNonPxLength(value) {
        var match = value.match(/^((?:[+-]?(?:\d*\.|)\d+(?:[eE][+-]?\d+|)))((?!px)[a-z%]+)$/i);
        if (match) {
            return {
                value: parseFloat(match[1]),
                unit: match[2].toLowerCase()
            };
        }
        return null;
    }

    function getAbsolute(elem, props) {
        if (typeof props === 'string') {
            props = [props];
        }
        var styles = getComputed(elem);

        var result = {};

        for (var i = 0; i < props.length; i++) {
            var prop = props[i];

            // convert non-px units if possible
            var length = extractNonPxLength(styles[prop]);
            if (length) {
                // var value;
                // if (styles.position !== 'relative') {
                //     switch (prop) {
                //         case 'top':
                //         case 'left':
                //         case 'width':
                //         case 'height':
                //             var metric = prop.replace(/^(\w)/, function (all, first) {
                //                 return 'offset' + first.toUpperCase();
                //             });
                //             value = elem[metric];
                //             break;
                //         case 'right':
                //             var offsetParentWidth = styles.position === 'absolute'
                //                 ? elem.offsetParent.offsetWidth
                //                 : Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
                //             value = offsetParentWidth - elem.offsetLeft - elem.offsetWidth;
                //             break;
                //         case 'bottom':
                //             var offsetParentHeight = styles.position === 'absolute'
                //                 ? elem.offsetParent.offsetHeight
                //                 : Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
                //             value = offsetParentHeight - elem.offsetTop - elem.offsetHeight;
                //             break;
                //     }
                // } else {
                //     var c = 1;
                //     switch (prop) {
                //         case 'bottom':
                //             c = -1;
                //         case 'top':
                //             var top = elem.style.top;
                //             elem.style.top = '0';
                //             var ot = elem.offsetTop;
                //             elem.style.top = top;
                //             value = (elem.offsetTop - ot) * c;
                //             break;
                //         case 'right':
                //             c = -1;
                //         case 'left':
                //             var left = elem.style.left;
                //             elem.style.left = '0';
                //             var ol = elem.offsetLeft;
                //             elem.style.left = left;
                //             value = (elem.offsetLeft - ol) * c;
                //             break;
                //         case 'width':
                //             value = elem.offsetWidth;
                //             break;
                //         case 'height':
                //             value = elem.offsetHeight;
                //     }
                // }
                var value;
                var parent;
                switch (length.unit) {
                    case 'em':
                        parent = elem.parentNode;
                        if (!parent) {
                            value = length.value * 16;
                        } else {
                            value = length.value * parseFloat(getAbsolute(parent, 'fontSize'));
                        }
                        break;
                    case '%':
                        parent = elem.offsetParent;
                        var parentMetric = {
                            top: 'height',
                            right: 'width',
                            bottom: 'height',
                            left: 'width',
                            width: 'width',
                            height: 'height',
                            paddingTop: 'width',
                            paddingRight: 'width',
                            paddingBottom: 'width',
                            paddingLeft: 'width'
                        }[prop];
                        var abs = getAbsolute(parent, parentMetric);
                        value = abs === 'auto' ? abs : (length.value * parseFloat(abs) / 100);
                        break;
                    case 'cm':
                        value = length.value * 960 / 25.4;
                        break;
                    case 'mm':
                        value = length.value * 96 / 25.4;
                        break;
                    case 'pt':
                        value = length.value * 4 / 3;
                        break;
                    case 'in':
                        value = length.value * 96;
                        break;
                    default:
                        value = length.value;
                }
                result[prop] = value === 'auto' ? value : (value + 'px');
            } else {
                result[prop] = styles[prop];
            }
        }
        if (props.length === 1) {
            result = result[props[0]];
        }
        return result;
    }

    function bind(fn, newThis) {
        var slice = Array.prototype.slice;
        var args = slice.call(arguments, 2);
        return function () {
            return fn.apply(newThis, args.concat(slice.call(arguments)));
        };
    }

    var ID_KEY = 'data-drag-id';
    var ID_DOC = '__doc__';
    var guid = 0;
    var util = {
        guid: function () {
            return guid++;
        },

        on: function (elem, type, listener) {
            var id = attr(elem, ID_KEY) || ID_DOC;
            if (!events[id]) {
                events[id] = {};
            }

            if (!events[id][type]) {
                events[id][type] = [];
            }
            events[id][type].push(listener);
            on(elem, type, listener);
        },

        off: function (elem, type, listener) {
            var id = attr(elem, ID_KEY) || ID_DOC;
            var listeners = events[id];

            if (!type) {
                // remove all event listeners on the element
                for (var t in listeners) {
                    for (var i = 0, j = listeners[t].length; i < j; i++) {
                        off(elem, t, listeners[t][i]);
                    }
                    delete listeners[t];
                }
                delete events[id];
            } else if (!listener) {
                for (var i = 0, j = listeners[type].length; i < j; i++) {
                    off(elem, type, listeners[type][i]);
                }
                delete listeners[type];
            }
        }
    };

    function Draggable(target, options) {
        this.target = target;

        if (options && typeof options === 'object') {
            extend(this, options);
        }
    }

    var doc = document.documentElement;
    Draggable.prototype.init = function () {
        var target = this.target;

        if (attr(target, ID_KEY)) {
            throw new Error('The element is already draggable!');
        }

        this.id = util.guid();
        attr(target, ID_KEY, this.id);

        // save current style attribute to recover later
        this.oldStyle = getCSSText(target);
        this.oldDocStyle = getCSSText(doc);

        target.style.cursor = 'default';

        var handle = this.handle || target;
        util.on(handle, 'mousedown', bind(start, this));
    };

    Draggable.prototype.dispose = function () {
        util.off(this.target);
        util.off(doc);
        attr(this.target, ID_KEY, null);
        this.reset();
    };

    Draggable.prototype.reset = function () {
        addStyles(this.target, this.oldStyle, true);
    };

    function start(e) {
        var target = this.target;
        addStyles(doc, {
            'user-select': 'none'
        });
        if (getSupportedAccessor('user-select') === null) {
            this.oldSelectstart = document.onselectstart;
            document.onselectstart = function () {
                return false;
            };
        }

        // log current cursor coodinates
        this.cursor = {
            x: e.clientX,
            y: e.clientY
        };

        target.style.cursor = 'move';
        var newStyle = {};

        if (translateMode === 'transform') {
            var transform = (getTransform(target, true) || '').replace(/\s+/g, '');
            var matched;
            if ((matched = transform.match(regMatrix)) || (matched = transform.match(regMatrix3d))) {
                this.offset = {
                    x: parseFloat(matched[2]),
                    y: parseFloat(matched[3])
                };
            } else {
                this.offset = {
                    x: 0,
                    y: 0
                };

                newStyle = {
                    transform: 'translate(0, 0)'
                };
            }
        } else {
            var props = ['top', 'right', 'bottom', 'left', 'width', 'height', 'position'];
            var style = getAbsolute(target, props);
            var position = style.position;

            if (position === 'static') {
                newStyle.position = 'relative';
                newStyle.top = '0';
                newStyle.left = '0';
            } else if (position === 'absolute' || position === 'fixed') {
                // vertical
                var borderTop = parseInt(getAbsolute(target, 'borderTopWidth'), 10);
                var borderBottom = parseInt(getAbsolute(target, 'borderBottomWidth'), 10);
                var paddingTop = parseInt(getAbsolute(target, 'paddingTop'), 10);
                var paddingBottom = parseInt(getAbsolute(target, 'paddingBottom'), 10);
                if (style.top !== 'auto' && style.bottom !== 'auto') {
                    // conflicting absolute positions
                    newStyle.height = style.height !== 'auto'
                        ? style.height
                        : target.offsetHeight - borderTop - paddingTop - paddingBottom - borderBottom + 'px';
                    newStyle.bottom = 'auto';
                    newStyle.top = style.top; // Firefox returns used values for `auto`
                } else if (style.top === 'auto' && style.bottom === 'auto') {
                    // auto on both directions
                    newStyle.height = style.height !== 'auto'
                        ? style.height
                        : target.offsetHeight - borderTop - paddingTop - paddingBottom - borderBottom + 'px';
                    newStyle.top = target.offsetTop + 'px';
                } else if (style.bottom !== 'auto') {
                    // specified bottom
                    var parentBorderTop = parseInt(getAbsolute(target, 'borderTopWidth'), 10);
                    var parentBorderBottom = parseInt(getAbsolute(target, 'borderBottomWidth'), 10);
                    var offsetParentHeight = position === 'absolute'
                        ? target.offsetParent.offsetHeight - parentBorderTop - parentBorderBottom
                        : Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
                    newStyle.top = offsetParentHeight - target.offsetHeight - parseFloat(style.bottom) + 'px';
                    newStyle.bottom = 'auto';
                }
                // horizontal
                var borderLeft = parseInt(getAbsolute(target, 'borderLeftWidth'), 10);
                var borderRight = parseInt(getAbsolute(target, 'borderRightWidth'), 10);
                var paddingLeft = parseInt(getAbsolute(target, 'paddingLeft'), 10);
                var paddingRight = parseInt(getAbsolute(target, 'paddingRight'), 10);
                if (style.left !== 'auto' && style.right !== 'auto') {
                    // conflicting absolute positions
                    newStyle.width = style.width !== 'auto'
                        ? style.width
                        : target.offsetWidth - borderLeft - paddingLeft - paddingRight - borderRight + 'px';
                    newStyle.right = 'auto';
                    newStyle.left = style.left; // Firefox returns used values for `auto`
                } else if (style.left === 'auto' && style.right === 'auto') {
                    // auto on both directions
                    newStyle.width = style.width !== 'auto'
                        ? style.width
                        : target.offsetWidth - borderLeft - paddingLeft - paddingRight - borderRight + 'px';
                    newStyle.left = target.offsetLeft + 'px';
                } else if (style.right !== 'auto') {
                    // specified right
                    var parentBorderLeft = parseInt(getAbsolute(target, 'borderLeftWidth'), 10);
                    var parentBorderRight = parseInt(getAbsolute(target, 'borderRightWidth'), 10);
                    var offsetParentWidth = position === 'absolute'
                        ? target.offsetParent.offsetWidth - parentBorderLeft - parentBorderRight
                        : Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
                    newStyle.left = offsetParentWidth - target.offsetWidth - parseFloat(style.right) + 'px';
                    newStyle.right = 'auto';
                }
            //     newStyle = {
            //         top: target.offsetTop + 'px',
            //         right: 'auto',
            //         bottom: 'auto',
            //         left: target.offsetLeft + 'px',
            //         width: target.offsetWidth + 'px',
            //         height: target.offsetHeight + 'px'
            //     };
            // } else if (position === 'relative') {
            //     var currentOffsetTop = target.offsetTop;
            //     var topProp = target.style.top;
            //     target.style.top = '0';
            //     var naturalOffsetTop = target.offsetTop;
            //     target.style.top = topProp;

            //     var currentOffsetLeft = target.offsetLeft;
            //     var leftProp = target.style.left;
            //     target.style.left = '0';
            //     var naturalOffsetLeft = target.offsetLeft;
            //     target.style.left = leftProp;

            //     newStyle = {
            //         top: currentOffsetTop - naturalOffsetTop + 'px',
            //         right: 'auto',
            //         bottom: 'auto',
            //         left: currentOffsetLeft - naturalOffsetLeft + 'px',
            //         width: target.offsetWidth + 'px',
            //         height: target.offsetHeight + 'px'
            //     };
            } else if (position === 'relative') {
                if (style.top === 'auto' && style.bottom === 'auto') {
                    newStyle.top = '0';
                } else if (style.top === 'auto' && style.bottom !== 'auto') {
                    newStyle.top = -parseFloat(style.bottom) + 'px';
                    newStyle.bottom = 'auto';
                }
                if (style.left === 'auto' && style.right === 'auto') {
                    newStyle.left = '0';
                } else if (style.left === 'auto' && style.right !== 'auto') {
                    newStyle.left = -parseFloat(style.right) + 'px';
                    newStyle.right = 'auto';
                }
            }

            this.offset = {
                x: parseFloat(newStyle.left || style.left),
                y: parseFloat(newStyle.top || style.top)
            };
        }

        addStyles(target, newStyle);

        // drag can cause scroll so scroll offsets also have to be logged
        this.scroll = getScrollOffsets();

        // lock `transition` to none to prevent lag while tracking
        var transitionAccessor = getSupportedAccessor('transition');
        if (transitionAccessor) {
            var oldTransition = this.target.style[transitionAccessor];
            this.oldTransition = oldTransition;
            this.target.style[transitionAccessor] = 'none';
        }

        util.on(doc, 'mousemove', bind(track, this));
        util.on(doc, 'mouseup', bind(stop, this));
    }

    function track(e) {
        // mouse move deltas
        var dx = e.clientX - this.cursor.x;
        var dy = e.clientY - this.cursor.y;
        this.cursor.x = e.clientX;
        this.cursor.y = e.clientY;

        // scroll deltas
        var scroll = getScrollOffsets();
        var dsx = scroll.x - this.scroll.x;
        var dsy = scroll.y - this.scroll.y;
        this.scroll = scroll;

        // accumulate delta values
        this.offset.x += dx + dsx;
        this.offset.y += dy + dsy;

        locate(this.target, this.offset);
    }

    function stop(e) {
        this.target.style.cursor = 'default';
        var transitionAccessor = getSupportedAccessor('transition');
        if (transitionAccessor) {
            this.target.style[transitionAccessor] = this.oldTransition || '';
        }
        if (this.oldSelectstart) {
            document.onselectstart = this.oldSelectstart;
        }
        addStyles(doc, this.oldDocStyle, true);
        util.off(doc);
    }

    function locate(elem, offset) {
        function replaceTransform(whole, before, x, y, after) {
            return before + offset.x + ', ' + offset.y + after;
        }

        if (translateMode === 'transform') {
            var transform = getTransform(elem, true).replace(/\s+/g, '');
            var newTransform;

            if (transform.match(regMatrix)) {
                newTransform = transform.replace(regMatrix, replaceTransform);
            } else if (transform.match(regMatrix3d)) {
                newTransform = transform.replace(regMatrix3d, replaceTransform);
            }
            addStyles(elem, {
                transform: newTransform
            });
        } else {
            elem.style.top = offset.y + 'px';
            elem.style.left = offset.x + 'px';
        }
    }

    var drag = function (target, options) {
        var wrapped = new Draggable(target, options);
        wrapped.init();
        return wrapped;
    };

    // Everything is ready, export the whole module
    define('drag', function (require, exports, module) {
        module.exports = drag;
    });

}(typeof define === 'function' && define.amd ? define : function (id, factory) {

    // Define it the UMD way
    if (typeof exports !== 'undefined') {
        factory(require, exports, module);
    } else {
        var mod = {};
        var exp = {};

        factory(function (value) {
            return window[value];
        }, exp, mod);

        if (mod.exports) {
            // Defining output using `module.exports`
            window[id] = mod.exports;
        } else {
            // Defining output using `exports.*`
            window[id] = exp;
        }
    }
}));
