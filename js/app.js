(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

function makeSinkProxies(drivers, streamAdapter) {
    var sinkProxies = {};
    for (var name_1 in drivers) {
        if (drivers.hasOwnProperty(name_1)) {
            var holdSubject = streamAdapter.makeSubject();
            var driverStreamAdapter = drivers[name_1].streamAdapter || streamAdapter;
            var stream = driverStreamAdapter.adapt(holdSubject.stream, streamAdapter.streamSubscribe);
            sinkProxies[name_1] = {
                stream: stream,
                observer: holdSubject.observer
            };
        }
    }
    return sinkProxies;
}
function callDrivers(drivers, sinkProxies, streamAdapter) {
    var sources = {};
    for (var name_2 in drivers) {
        if (drivers.hasOwnProperty(name_2)) {
            var driverOutput = drivers[name_2](sinkProxies[name_2].stream, streamAdapter, name_2);
            var driverStreamAdapter = drivers[name_2].streamAdapter;
            if (driverStreamAdapter && driverStreamAdapter.isValidStream(driverOutput)) {
                sources[name_2] = streamAdapter.adapt(driverOutput, driverStreamAdapter.streamSubscribe);
            } else {
                sources[name_2] = driverOutput;
            }
        }
    }
    return sources;
}
function replicateMany(sinks, sinkProxies, streamAdapter) {
    var results = Object.keys(sinks).filter(function (name) {
        return !!sinkProxies[name];
    }).map(function (name) {
        return streamAdapter.streamSubscribe(sinks[name], sinkProxies[name].observer);
    });
    var disposeFunctions = results.filter(function (dispose) {
        return typeof dispose === 'function';
    });
    return function () {
        disposeFunctions.forEach(function (dispose) {
            return dispose();
        });
    };
}
function disposeSources(sources) {
    for (var k in sources) {
        if (sources.hasOwnProperty(k) && sources[k] && typeof sources[k].dispose === 'function') {
            sources[k].dispose();
        }
    }
}
var isObjectEmpty = function isObjectEmpty(obj) {
    return Object.keys(obj).length === 0;
};
function Cycle(main, drivers, options) {
    if (typeof main !== "function") {
        throw new Error("First argument given to Cycle must be the 'main' " + "function.");
    }
    if ((typeof drivers === 'undefined' ? 'undefined' : _typeof(drivers)) !== "object" || drivers === null) {
        throw new Error("Second argument given to Cycle must be an object " + "with driver functions as properties.");
    }
    if (isObjectEmpty(drivers)) {
        throw new Error("Second argument given to Cycle must be an object " + "with at least one driver function declared as a property.");
    }
    var streamAdapter = options.streamAdapter;
    if (!streamAdapter || isObjectEmpty(streamAdapter)) {
        throw new Error("Third argument given to Cycle must be an options object " + "with the streamAdapter key supplied with a valid stream adapter.");
    }
    var sinkProxies = makeSinkProxies(drivers, streamAdapter);
    var sources = callDrivers(drivers, sinkProxies, streamAdapter);
    var sinks = main(sources);
    if (typeof window !== 'undefined') {
        window.Cyclejs = { sinks: sinks };
    }
    var run = function run() {
        var disposeReplication = replicateMany(sinks, sinkProxies, streamAdapter);
        return function () {
            streamAdapter.dispose(sinks, sinkProxies, sources);
            disposeSources(sources);
            disposeReplication();
        };
    };
    return { sinks: sinks, sources: sources, run: run };
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Cycle;


},{}],2:[function(require,module,exports){
"use strict";
var xstream_adapter_1 = require('@cycle/xstream-adapter');
var xstream_1 = require('xstream');
var ElementFinder_1 = require('./ElementFinder');
var fromEvent_1 = require('./fromEvent');
var isolate_1 = require('./isolate');
var EventDelegator_1 = require('./EventDelegator');
var utils_1 = require('./utils');
var matchesSelector;
try {
    matchesSelector = require("matches-selector");
}
catch (e) {
    matchesSelector = Function.prototype;
}
var eventTypesThatDontBubble = [
    "load",
    "unload",
    "focus",
    "blur",
    "mouseenter",
    "mouseleave",
    "submit",
    "change",
    "reset",
    "timeupdate",
    "playing",
    "waiting",
    "seeking",
    "seeked",
    "ended",
    "loadedmetadata",
    "loadeddata",
    "canplay",
    "canplaythrough",
    "durationchange",
    "play",
    "pause",
    "ratechange",
    "volumechange",
    "suspend",
    "emptied",
    "stalled",
];
function determineUseCapture(eventType, options) {
    var result = false;
    if (typeof options.useCapture === "boolean") {
        result = options.useCapture;
    }
    if (eventTypesThatDontBubble.indexOf(eventType) !== -1) {
        result = true;
    }
    return result;
}
var DOMSource = (function () {
    function DOMSource(_rootElement$, _runStreamAdapter, _namespace, _isolateModule, _delegators) {
        if (_namespace === void 0) { _namespace = []; }
        this._rootElement$ = _rootElement$;
        this._runStreamAdapter = _runStreamAdapter;
        this._namespace = _namespace;
        this._isolateModule = _isolateModule;
        this._delegators = _delegators;
        this.isolateSource = isolate_1.isolateSource;
        this.isolateSink = isolate_1.isolateSink;
    }
    Object.defineProperty(DOMSource.prototype, "elements", {
        get: function () {
            if (this._namespace.length === 0) {
                return this._runStreamAdapter.adapt(this._rootElement$, xstream_adapter_1.default.streamSubscribe);
            }
            else {
                var elementFinder_1 = new ElementFinder_1.ElementFinder(this._namespace, this._isolateModule);
                return this._runStreamAdapter.adapt(this._rootElement$.map(function (el) { return elementFinder_1.call(el); }), xstream_adapter_1.default.streamSubscribe);
            }
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DOMSource.prototype, "namespace", {
        get: function () {
            return this._namespace;
        },
        enumerable: true,
        configurable: true
    });
    DOMSource.prototype.select = function (selector) {
        if (typeof selector !== 'string') {
            throw new Error("DOM driver's select() expects the argument to be a " +
                "string as a CSS selector");
        }
        var trimmedSelector = selector.trim();
        var childNamespace = trimmedSelector === ":root" ?
            this._namespace :
            this._namespace.concat(trimmedSelector);
        return new DOMSource(this._rootElement$, this._runStreamAdapter, childNamespace, this._isolateModule, this._delegators);
    };
    DOMSource.prototype.events = function (eventType, options) {
        if (options === void 0) { options = {}; }
        if (typeof eventType !== "string") {
            throw new Error("DOM driver's events() expects argument to be a " +
                "string representing the event type to listen for.");
        }
        var useCapture = determineUseCapture(eventType, options);
        var namespace = this._namespace;
        var scope = utils_1.getScope(namespace);
        var keyParts = [eventType, useCapture];
        if (scope) {
            keyParts.push(scope);
        }
        var key = keyParts.join('~');
        var domSource = this;
        var rootElement$;
        if (scope) {
            var hadIsolated_mutable_1 = false;
            rootElement$ = this._rootElement$
                .filter(function (rootElement) {
                var hasIsolated = !!domSource._isolateModule.getIsolatedElement(scope);
                var shouldPass = hasIsolated && !hadIsolated_mutable_1;
                hadIsolated_mutable_1 = hasIsolated;
                return shouldPass;
            });
        }
        else {
            rootElement$ = this._rootElement$.take(2);
        }
        var event$ = rootElement$
            .map(function setupEventDelegatorOnTopElement(rootElement) {
            // Event listener just for the root element
            if (!namespace || namespace.length === 0) {
                return fromEvent_1.fromEvent(rootElement, eventType, useCapture);
            }
            // Event listener on the top element as an EventDelegator
            var delegators = domSource._delegators;
            var top = scope
                ? domSource._isolateModule.getIsolatedElement(scope)
                : rootElement;
            var delegator;
            if (delegators.has(key)) {
                delegator = delegators.get(key);
                delegator.updateTopElement(top);
            }
            else {
                delegator = new EventDelegator_1.EventDelegator(top, eventType, useCapture, domSource._isolateModule);
                delegators.set(key, delegator);
            }
            var subject = xstream_1.default.create();
            if (scope) {
                domSource._isolateModule.addEventDelegator(scope, delegator);
            }
            delegator.addDestination(subject, namespace);
            return subject;
        })
            .flatten();
        return this._runStreamAdapter.adapt(event$, xstream_adapter_1.default.streamSubscribe);
    };
    DOMSource.prototype.dispose = function () {
        this._isolateModule.reset();
    };
    return DOMSource;
}());
exports.DOMSource = DOMSource;

},{"./ElementFinder":3,"./EventDelegator":4,"./fromEvent":8,"./isolate":12,"./utils":19,"@cycle/xstream-adapter":20,"matches-selector":78,"xstream":107}],3:[function(require,module,exports){
"use strict";
var ScopeChecker_1 = require('./ScopeChecker');
var utils_1 = require('./utils');
var matchesSelector;
try {
    matchesSelector = require("matches-selector");
}
catch (e) {
    matchesSelector = Function.prototype;
}
function toElArray(input) {
    return Array.prototype.slice.call(input);
}
var ElementFinder = (function () {
    function ElementFinder(namespace, isolateModule) {
        this.namespace = namespace;
        this.isolateModule = isolateModule;
    }
    ElementFinder.prototype.call = function (rootElement) {
        var namespace = this.namespace;
        if (namespace.join("") === "") {
            return rootElement;
        }
        var scope = utils_1.getScope(namespace);
        var scopeChecker = new ScopeChecker_1.ScopeChecker(scope, this.isolateModule);
        var selector = utils_1.getSelectors(namespace);
        var topNode = rootElement;
        var topNodeMatches = [];
        if (scope.length > 0) {
            topNode = this.isolateModule.getIsolatedElement(scope) || rootElement;
            if (selector && matchesSelector(topNode, selector)) {
                topNodeMatches.push(topNode);
            }
        }
        return toElArray(topNode.querySelectorAll(selector))
            .filter(scopeChecker.isStrictlyInRootScope, scopeChecker)
            .concat(topNodeMatches);
    };
    return ElementFinder;
}());
exports.ElementFinder = ElementFinder;

},{"./ScopeChecker":6,"./utils":19,"matches-selector":78}],4:[function(require,module,exports){
"use strict";
var ScopeChecker_1 = require('./ScopeChecker');
var utils_1 = require('./utils');
var matchesSelector;
try {
    matchesSelector = require("matches-selector");
}
catch (e) {
    matchesSelector = Function.prototype;
}
/**
 * Attaches an actual event listener to the DOM root element,
 * handles "destinations" (interested DOMSource output subjects), and bubbling.
 */
var EventDelegator = (function () {
    function EventDelegator(topElement, eventType, useCapture, isolateModule) {
        var _this = this;
        this.topElement = topElement;
        this.eventType = eventType;
        this.useCapture = useCapture;
        this.isolateModule = isolateModule;
        this.destinations = [];
        this.roof = topElement.parentElement;
        if (useCapture) {
            this.domListener = function (ev) { return _this.capture(ev); };
        }
        else {
            this.domListener = function (ev) { return _this.bubble(ev); };
        }
        topElement.addEventListener(eventType, this.domListener, useCapture);
    }
    EventDelegator.prototype.bubble = function (rawEvent) {
        if (!document.body.contains(rawEvent.currentTarget)) {
            return;
        }
        var ev = this.patchEvent(rawEvent);
        for (var el = ev.target; el && el !== this.roof; el = el.parentElement) {
            if (ev.propagationHasBeenStopped) {
                return;
            }
            this.matchEventAgainstDestinations(el, ev);
        }
    };
    EventDelegator.prototype.matchEventAgainstDestinations = function (el, ev) {
        for (var i = 0, n = this.destinations.length; i < n; i++) {
            var dest = this.destinations[i];
            if (!dest.scopeChecker.isStrictlyInRootScope(el)) {
                continue;
            }
            if (matchesSelector(el, dest.selector)) {
                this.mutateEventCurrentTarget(ev, el);
                dest.subject._n(ev);
            }
        }
    };
    EventDelegator.prototype.capture = function (ev) {
        for (var i = 0, n = this.destinations.length; i < n; i++) {
            var dest = this.destinations[i];
            if (matchesSelector(ev.target, dest.selector)) {
                dest.subject._n(ev);
            }
        }
    };
    EventDelegator.prototype.addDestination = function (subject, namespace) {
        var scope = utils_1.getScope(namespace);
        var selector = utils_1.getSelectors(namespace);
        var scopeChecker = new ScopeChecker_1.ScopeChecker(scope, this.isolateModule);
        this.destinations.push({ subject: subject, scopeChecker: scopeChecker, selector: selector });
    };
    EventDelegator.prototype.patchEvent = function (event) {
        var pEvent = event;
        pEvent.propagationHasBeenStopped = false;
        var oldStopPropagation = pEvent.stopPropagation;
        pEvent.stopPropagation = function stopPropagation() {
            oldStopPropagation.call(this);
            this.propagationHasBeenStopped = true;
        };
        return pEvent;
    };
    EventDelegator.prototype.mutateEventCurrentTarget = function (event, currentTargetElement) {
        try {
            Object.defineProperty(event, "currentTarget", {
                value: currentTargetElement,
                configurable: true,
            });
        }
        catch (err) {
            console.log("please use event.ownerTarget");
        }
        event.ownerTarget = currentTargetElement;
    };
    EventDelegator.prototype.updateTopElement = function (newTopElement) {
        this.topElement.removeEventListener(this.eventType, this.domListener, this.useCapture);
        newTopElement.addEventListener(this.eventType, this.domListener, this.useCapture);
        this.topElement = newTopElement;
    };
    return EventDelegator;
}());
exports.EventDelegator = EventDelegator;

},{"./ScopeChecker":6,"./utils":19,"matches-selector":78}],5:[function(require,module,exports){
"use strict";
var xstream_1 = require('xstream');
var xstream_adapter_1 = require('@cycle/xstream-adapter');
var toHTML = require('snabbdom-to-html');
var HTMLSource = (function () {
    function HTMLSource(vnode$, runStreamAdapter) {
        this.runStreamAdapter = runStreamAdapter;
        this._html$ = vnode$.last().map(toHTML);
        this._empty$ = runStreamAdapter.adapt(xstream_1.default.empty(), xstream_adapter_1.default.streamSubscribe);
    }
    Object.defineProperty(HTMLSource.prototype, "elements", {
        get: function () {
            return this.runStreamAdapter.adapt(this._html$, xstream_adapter_1.default.streamSubscribe);
        },
        enumerable: true,
        configurable: true
    });
    HTMLSource.prototype.select = function () {
        return new HTMLSource(xstream_1.default.empty(), this.runStreamAdapter);
    };
    HTMLSource.prototype.events = function () {
        return this._empty$;
    };
    return HTMLSource;
}());
exports.HTMLSource = HTMLSource;

},{"@cycle/xstream-adapter":20,"snabbdom-to-html":84,"xstream":107}],6:[function(require,module,exports){
"use strict";
var ScopeChecker = (function () {
    function ScopeChecker(scope, isolateModule) {
        this.scope = scope;
        this.isolateModule = isolateModule;
    }
    ScopeChecker.prototype.isStrictlyInRootScope = function (leaf) {
        for (var el = leaf; el; el = el.parentElement) {
            var scope = this.isolateModule.isIsolatedElement(el);
            if (scope && scope !== this.scope) {
                return false;
            }
            if (scope) {
                return true;
            }
        }
        return true;
    };
    return ScopeChecker;
}());
exports.ScopeChecker = ScopeChecker;

},{}],7:[function(require,module,exports){
"use strict";
var hyperscript_1 = require('./hyperscript');
var classNameFromVNode_1 = require('snabbdom-selector/lib/classNameFromVNode');
var selectorParser_1 = require('snabbdom-selector/lib/selectorParser');
var VNodeWrapper = (function () {
    function VNodeWrapper(rootElement) {
        this.rootElement = rootElement;
    }
    VNodeWrapper.prototype.call = function (vnode) {
        var _a = selectorParser_1.default(vnode.sel), selectorTagName = _a.tagName, selectorId = _a.id;
        var vNodeClassName = classNameFromVNode_1.default(vnode);
        var vNodeData = vnode.data || {};
        var vNodeDataProps = vNodeData.props || {};
        var _b = vNodeDataProps.id, vNodeId = _b === void 0 ? selectorId : _b;
        var isVNodeAndRootElementIdentical = vNodeId.toUpperCase() === this.rootElement.id.toUpperCase() &&
            selectorTagName.toUpperCase() === this.rootElement.tagName.toUpperCase() &&
            vNodeClassName.toUpperCase() === this.rootElement.className.toUpperCase();
        if (isVNodeAndRootElementIdentical) {
            return vnode;
        }
        var _c = this.rootElement, tagName = _c.tagName, id = _c.id, className = _c.className;
        var elementId = id ? "#" + id : "";
        var elementClassName = className ?
            "." + className.split(" ").join(".") : "";
        return hyperscript_1.h("" + tagName + elementId + elementClassName, {}, [vnode]);
    };
    return VNodeWrapper;
}());
exports.VNodeWrapper = VNodeWrapper;

},{"./hyperscript":10,"snabbdom-selector/lib/classNameFromVNode":81,"snabbdom-selector/lib/selectorParser":82}],8:[function(require,module,exports){
"use strict";
var xstream_1 = require('xstream');
function fromEvent(element, eventName, useCapture) {
    if (useCapture === void 0) { useCapture = false; }
    return xstream_1.Stream.create({
        element: element,
        next: null,
        start: function start(listener) {
            this.next = function next(event) { listener.next(event); };
            this.element.addEventListener(eventName, this.next, useCapture);
        },
        stop: function stop() {
            this.element.removeEventListener(eventName, this.next, useCapture);
        }
    });
}
exports.fromEvent = fromEvent;

},{"xstream":107}],9:[function(require,module,exports){
"use strict";
var hyperscript_1 = require('./hyperscript');
function isValidString(param) {
    return typeof param === 'string' && param.length > 0;
}
function isSelector(param) {
    return isValidString(param) && (param[0] === '.' || param[0] === '#');
}
function createTagFunction(tagName) {
    return function hyperscript(first, b, c) {
        if (isSelector(first)) {
            if (!!b && !!c) {
                return hyperscript_1.h(tagName + first, b, c);
            }
            else if (!!b) {
                return hyperscript_1.h(tagName + first, b);
            }
            else {
                return hyperscript_1.h(tagName + first, {});
            }
        }
        else if (!!b) {
            return hyperscript_1.h(tagName, first, b);
        }
        else if (!!first) {
            return hyperscript_1.h(tagName, first);
        }
        else {
            return hyperscript_1.h(tagName, {});
        }
    };
}
var SVG_TAG_NAMES = [
    'a', 'altGlyph', 'altGlyphDef', 'altGlyphItem', 'animate', 'animateColor',
    'animateMotion', 'animateTransform', 'circle', 'clipPath', 'colorProfile',
    'cursor', 'defs', 'desc', 'ellipse', 'feBlend', 'feColorMatrix',
    'feComponentTransfer', 'feComposite', 'feConvolveMatrix', 'feDiffuseLighting',
    'feDisplacementMap', 'feDistantLight', 'feFlood', 'feFuncA', 'feFuncB',
    'feFuncG', 'feFuncR', 'feGaussianBlur', 'feImage', 'feMerge', 'feMergeNode',
    'feMorphology', 'feOffset', 'fePointLight', 'feSpecularLighting',
    'feSpotlight', 'feTile', 'feTurbulence', 'filter', 'font', 'fontFace',
    'fontFaceFormat', 'fontFaceName', 'fontFaceSrc', 'fontFaceUri',
    'foreignObject', 'g', 'glyph', 'glyphRef', 'hkern', 'image', 'line',
    'linearGradient', 'marker', 'mask', 'metadata', 'missingGlyph', 'mpath',
    'path', 'pattern', 'polygon', 'polyling', 'radialGradient', 'rect', 'script',
    'set', 'stop', 'style', 'switch', 'symbol', 'text', 'textPath', 'title',
    'tref', 'tspan', 'use', 'view', 'vkern'
];
var svg = createTagFunction('svg');
SVG_TAG_NAMES.forEach(function (tag) {
    svg[tag] = createTagFunction(tag);
});
var TAG_NAMES = [
    'a', 'abbr', 'address', 'area', 'article', 'aside', 'audio', 'b', 'base',
    'bdi', 'bdo', 'blockquote', 'body', 'br', 'button', 'canvas', 'caption',
    'cite', 'code', 'col', 'colgroup', 'dd', 'del', 'dfn', 'dir', 'div', 'dl',
    'dt', 'em', 'embed', 'fieldset', 'figcaption', 'figure', 'footer', 'form',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'head', 'header', 'hgroup', 'hr', 'html',
    'i', 'iframe', 'img', 'input', 'ins', 'kbd', 'keygen', 'label', 'legend',
    'li', 'link', 'main', 'map', 'mark', 'menu', 'meta', 'nav', 'noscript',
    'object', 'ol', 'optgroup', 'option', 'p', 'param', 'pre', 'progress', 'q',
    'rp', 'rt', 'ruby', 's', 'samp', 'script', 'section', 'select', 'small',
    'source', 'span', 'strong', 'style', 'sub', 'sup', 'table', 'tbody', 'td',
    'textarea', 'tfoot', 'th', 'thead', 'title', 'tr', 'u', 'ul', 'video'
];
var exported = { SVG_TAG_NAMES: SVG_TAG_NAMES, TAG_NAMES: TAG_NAMES, svg: svg, isSelector: isSelector, createTagFunction: createTagFunction };
TAG_NAMES.forEach(function (n) {
    exported[n] = createTagFunction(n);
});
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = exported;

},{"./hyperscript":10}],10:[function(require,module,exports){
"use strict";
var is = require('snabbdom/is');
var vnode = require('snabbdom/vnode');
function isGenericStream(x) {
    return !Array.isArray(x) && typeof x.map === "function";
}
function mutateStreamWithNS(vNode) {
    addNS(vNode.data, vNode.children);
    return vNode;
}
function addNS(data, children) {
    data.ns = "http://www.w3.org/2000/svg";
    if (typeof children !== "undefined" && is.array(children)) {
        for (var i = 0; i < children.length; ++i) {
            if (isGenericStream(children[i])) {
                children[i] = children[i].map(mutateStreamWithNS);
            }
            else {
                addNS(children[i].data, children[i].children);
            }
        }
    }
}
function h(sel, b, c) {
    var data = {};
    var children;
    var text;
    var i;
    if (arguments.length === 3) {
        data = b;
        if (is.array(c)) {
            children = c;
        }
        else if (is.primitive(c)) {
            text = c;
        }
    }
    else if (arguments.length === 2) {
        if (is.array(b)) {
            children = b;
        }
        else if (is.primitive(b)) {
            text = b;
        }
        else {
            data = b;
        }
    }
    if (is.array(children)) {
        children = children.filter(function (x) { return x; });
        for (i = 0; i < children.length; ++i) {
            if (is.primitive(children[i])) {
                children[i] = vnode(undefined, undefined, undefined, children[i]);
            }
        }
    }
    if (sel[0] === 's' && sel[1] === 'v' && sel[2] === 'g') {
        addNS(data, children);
    }
    return vnode(sel, data, children, text, undefined);
}
exports.h = h;
;

},{"snabbdom/is":92,"snabbdom/vnode":101}],11:[function(require,module,exports){
"use strict";
var thunk = require('snabbdom/thunk');
exports.thunk = thunk;
var makeDOMDriver_1 = require('./makeDOMDriver');
exports.makeDOMDriver = makeDOMDriver_1.makeDOMDriver;
var DOMSource_1 = require('./DOMSource');
exports.DOMSource = DOMSource_1.DOMSource;
var mockDOMSource_1 = require('./mockDOMSource');
exports.mockDOMSource = mockDOMSource_1.mockDOMSource;
var makeHTMLDriver_1 = require('./makeHTMLDriver');
exports.makeHTMLDriver = makeHTMLDriver_1.makeHTMLDriver;
var HTMLSource_1 = require('./HTMLSource');
exports.HTMLSource = HTMLSource_1.HTMLSource;
var hyperscript_1 = require('./hyperscript');
exports.h = hyperscript_1.h;
var hyperscript_helpers_1 = require('./hyperscript-helpers');
var svg = hyperscript_helpers_1.default.svg;
exports.svg = svg;
var a = hyperscript_helpers_1.default.a;
exports.a = a;
var abbr = hyperscript_helpers_1.default.abbr;
exports.abbr = abbr;
var address = hyperscript_helpers_1.default.address;
exports.address = address;
var area = hyperscript_helpers_1.default.area;
exports.area = area;
var article = hyperscript_helpers_1.default.article;
exports.article = article;
var aside = hyperscript_helpers_1.default.aside;
exports.aside = aside;
var audio = hyperscript_helpers_1.default.audio;
exports.audio = audio;
var b = hyperscript_helpers_1.default.b;
exports.b = b;
var base = hyperscript_helpers_1.default.base;
exports.base = base;
var bdi = hyperscript_helpers_1.default.bdi;
exports.bdi = bdi;
var bdo = hyperscript_helpers_1.default.bdo;
exports.bdo = bdo;
var blockquote = hyperscript_helpers_1.default.blockquote;
exports.blockquote = blockquote;
var body = hyperscript_helpers_1.default.body;
exports.body = body;
var br = hyperscript_helpers_1.default.br;
exports.br = br;
var button = hyperscript_helpers_1.default.button;
exports.button = button;
var canvas = hyperscript_helpers_1.default.canvas;
exports.canvas = canvas;
var caption = hyperscript_helpers_1.default.caption;
exports.caption = caption;
var cite = hyperscript_helpers_1.default.cite;
exports.cite = cite;
var code = hyperscript_helpers_1.default.code;
exports.code = code;
var col = hyperscript_helpers_1.default.col;
exports.col = col;
var colgroup = hyperscript_helpers_1.default.colgroup;
exports.colgroup = colgroup;
var dd = hyperscript_helpers_1.default.dd;
exports.dd = dd;
var del = hyperscript_helpers_1.default.del;
exports.del = del;
var dfn = hyperscript_helpers_1.default.dfn;
exports.dfn = dfn;
var dir = hyperscript_helpers_1.default.dir;
exports.dir = dir;
var div = hyperscript_helpers_1.default.div;
exports.div = div;
var dl = hyperscript_helpers_1.default.dl;
exports.dl = dl;
var dt = hyperscript_helpers_1.default.dt;
exports.dt = dt;
var em = hyperscript_helpers_1.default.em;
exports.em = em;
var embed = hyperscript_helpers_1.default.embed;
exports.embed = embed;
var fieldset = hyperscript_helpers_1.default.fieldset;
exports.fieldset = fieldset;
var figcaption = hyperscript_helpers_1.default.figcaption;
exports.figcaption = figcaption;
var figure = hyperscript_helpers_1.default.figure;
exports.figure = figure;
var footer = hyperscript_helpers_1.default.footer;
exports.footer = footer;
var form = hyperscript_helpers_1.default.form;
exports.form = form;
var h1 = hyperscript_helpers_1.default.h1;
exports.h1 = h1;
var h2 = hyperscript_helpers_1.default.h2;
exports.h2 = h2;
var h3 = hyperscript_helpers_1.default.h3;
exports.h3 = h3;
var h4 = hyperscript_helpers_1.default.h4;
exports.h4 = h4;
var h5 = hyperscript_helpers_1.default.h5;
exports.h5 = h5;
var h6 = hyperscript_helpers_1.default.h6;
exports.h6 = h6;
var head = hyperscript_helpers_1.default.head;
exports.head = head;
var header = hyperscript_helpers_1.default.header;
exports.header = header;
var hgroup = hyperscript_helpers_1.default.hgroup;
exports.hgroup = hgroup;
var hr = hyperscript_helpers_1.default.hr;
exports.hr = hr;
var html = hyperscript_helpers_1.default.html;
exports.html = html;
var i = hyperscript_helpers_1.default.i;
exports.i = i;
var iframe = hyperscript_helpers_1.default.iframe;
exports.iframe = iframe;
var img = hyperscript_helpers_1.default.img;
exports.img = img;
var input = hyperscript_helpers_1.default.input;
exports.input = input;
var ins = hyperscript_helpers_1.default.ins;
exports.ins = ins;
var kbd = hyperscript_helpers_1.default.kbd;
exports.kbd = kbd;
var keygen = hyperscript_helpers_1.default.keygen;
exports.keygen = keygen;
var label = hyperscript_helpers_1.default.label;
exports.label = label;
var legend = hyperscript_helpers_1.default.legend;
exports.legend = legend;
var li = hyperscript_helpers_1.default.li;
exports.li = li;
var link = hyperscript_helpers_1.default.link;
exports.link = link;
var main = hyperscript_helpers_1.default.main;
exports.main = main;
var map = hyperscript_helpers_1.default.map;
exports.map = map;
var mark = hyperscript_helpers_1.default.mark;
exports.mark = mark;
var menu = hyperscript_helpers_1.default.menu;
exports.menu = menu;
var meta = hyperscript_helpers_1.default.meta;
exports.meta = meta;
var nav = hyperscript_helpers_1.default.nav;
exports.nav = nav;
var noscript = hyperscript_helpers_1.default.noscript;
exports.noscript = noscript;
var object = hyperscript_helpers_1.default.object;
exports.object = object;
var ol = hyperscript_helpers_1.default.ol;
exports.ol = ol;
var optgroup = hyperscript_helpers_1.default.optgroup;
exports.optgroup = optgroup;
var option = hyperscript_helpers_1.default.option;
exports.option = option;
var p = hyperscript_helpers_1.default.p;
exports.p = p;
var param = hyperscript_helpers_1.default.param;
exports.param = param;
var pre = hyperscript_helpers_1.default.pre;
exports.pre = pre;
var progress = hyperscript_helpers_1.default.progress;
exports.progress = progress;
var q = hyperscript_helpers_1.default.q;
exports.q = q;
var rp = hyperscript_helpers_1.default.rp;
exports.rp = rp;
var rt = hyperscript_helpers_1.default.rt;
exports.rt = rt;
var ruby = hyperscript_helpers_1.default.ruby;
exports.ruby = ruby;
var s = hyperscript_helpers_1.default.s;
exports.s = s;
var samp = hyperscript_helpers_1.default.samp;
exports.samp = samp;
var script = hyperscript_helpers_1.default.script;
exports.script = script;
var section = hyperscript_helpers_1.default.section;
exports.section = section;
var select = hyperscript_helpers_1.default.select;
exports.select = select;
var small = hyperscript_helpers_1.default.small;
exports.small = small;
var source = hyperscript_helpers_1.default.source;
exports.source = source;
var span = hyperscript_helpers_1.default.span;
exports.span = span;
var strong = hyperscript_helpers_1.default.strong;
exports.strong = strong;
var style = hyperscript_helpers_1.default.style;
exports.style = style;
var sub = hyperscript_helpers_1.default.sub;
exports.sub = sub;
var sup = hyperscript_helpers_1.default.sup;
exports.sup = sup;
var table = hyperscript_helpers_1.default.table;
exports.table = table;
var tbody = hyperscript_helpers_1.default.tbody;
exports.tbody = tbody;
var td = hyperscript_helpers_1.default.td;
exports.td = td;
var textarea = hyperscript_helpers_1.default.textarea;
exports.textarea = textarea;
var tfoot = hyperscript_helpers_1.default.tfoot;
exports.tfoot = tfoot;
var th = hyperscript_helpers_1.default.th;
exports.th = th;
var thead = hyperscript_helpers_1.default.thead;
exports.thead = thead;
var title = hyperscript_helpers_1.default.title;
exports.title = title;
var tr = hyperscript_helpers_1.default.tr;
exports.tr = tr;
var u = hyperscript_helpers_1.default.u;
exports.u = u;
var ul = hyperscript_helpers_1.default.ul;
exports.ul = ul;
var video = hyperscript_helpers_1.default.video;
exports.video = video;

},{"./DOMSource":2,"./HTMLSource":5,"./hyperscript":10,"./hyperscript-helpers":9,"./makeDOMDriver":14,"./makeHTMLDriver":15,"./mockDOMSource":16,"snabbdom/thunk":100}],12:[function(require,module,exports){
"use strict";
var utils_1 = require('./utils');
function isolateSource(source, scope) {
    return source.select(utils_1.SCOPE_PREFIX + scope);
}
exports.isolateSource = isolateSource;
function isolateSink(sink, scope) {
    return sink.map(function (vTree) {
        if (vTree.data.isolate) {
            var existingScope = parseInt(vTree.data.isolate.split(utils_1.SCOPE_PREFIX + 'cycle')[1]);
            var _scope = parseInt(scope.split('cycle')[1]);
            if (Number.isNaN(existingScope) ||
                Number.isNaN(_scope) ||
                existingScope > _scope) {
                return vTree;
            }
        }
        vTree.data.isolate = utils_1.SCOPE_PREFIX + scope;
        return vTree;
    });
}
exports.isolateSink = isolateSink;

},{"./utils":19}],13:[function(require,module,exports){
"use strict";
var IsolateModule = (function () {
    function IsolateModule(isolatedElements) {
        this.isolatedElements = isolatedElements;
        this.eventDelegators = new Map();
    }
    IsolateModule.prototype.setScope = function (elm, scope) {
        this.isolatedElements.set(scope, elm);
    };
    IsolateModule.prototype.removeScope = function (scope) {
        this.isolatedElements.delete(scope);
    };
    IsolateModule.prototype.getIsolatedElement = function (scope) {
        return this.isolatedElements.get(scope);
    };
    IsolateModule.prototype.isIsolatedElement = function (elm) {
        var elements = Array.from(this.isolatedElements.entries());
        for (var i = 0; i < elements.length; ++i) {
            if (elm === elements[i][1]) {
                return elements[i][0];
            }
        }
        return false;
    };
    IsolateModule.prototype.addEventDelegator = function (scope, eventDelegator) {
        var delegators = this.eventDelegators.get(scope);
        if (!delegators) {
            delegators = [];
            this.eventDelegators.set(scope, delegators);
        }
        delegators[delegators.length] = eventDelegator;
    };
    IsolateModule.prototype.reset = function () {
        this.isolatedElements.clear();
    };
    IsolateModule.prototype.createModule = function () {
        var self = this;
        return {
            create: function (oldVNode, vNode) {
                var _a = oldVNode.data, oldData = _a === void 0 ? {} : _a;
                var elm = vNode.elm, _b = vNode.data, data = _b === void 0 ? {} : _b;
                var oldScope = oldData.isolate || "";
                var scope = data.isolate || "";
                if (scope) {
                    if (oldScope) {
                        self.removeScope(oldScope);
                    }
                    self.setScope(elm, scope);
                    var delegators = self.eventDelegators.get(scope);
                    if (delegators) {
                        for (var i = 0, len = delegators.length; i < len; ++i) {
                            delegators[i].updateTopElement(elm);
                        }
                    }
                    else if (delegators === void 0) {
                        self.eventDelegators.set(scope, []);
                    }
                }
                if (oldScope && !scope) {
                    self.removeScope(scope);
                }
            },
            update: function (oldVNode, vNode) {
                var _a = oldVNode.data, oldData = _a === void 0 ? {} : _a;
                var elm = vNode.elm, _b = vNode.data, data = _b === void 0 ? {} : _b;
                var oldScope = oldData.isolate || "";
                var scope = data.isolate || "";
                if (scope) {
                    if (oldScope) {
                        self.removeScope(oldScope);
                    }
                    self.setScope(elm, scope);
                }
                if (oldScope && !scope) {
                    self.removeScope(scope);
                }
            },
            remove: function (_a, cb) {
                var data = _a.data;
                data = data || {};
                var scope = data.isolate;
                if (scope) {
                    self.removeScope(scope);
                    if (self.eventDelegators.get(scope)) {
                        self.eventDelegators.set(scope, []);
                    }
                }
                cb();
            },
            destroy: function (_a) {
                var data = _a.data;
                data = data || {};
                var scope = data.isolate;
                if (scope) {
                    self.removeScope(scope);
                    if (self.eventDelegators.get(scope)) {
                        self.eventDelegators.set(scope, []);
                    }
                }
            }
        };
    };
    return IsolateModule;
}());
exports.IsolateModule = IsolateModule;

},{}],14:[function(require,module,exports){
"use strict";
var snabbdom_1 = require('snabbdom');
var xstream_1 = require('xstream');
var DOMSource_1 = require('./DOMSource');
var VNodeWrapper_1 = require('./VNodeWrapper');
var utils_1 = require('./utils');
var modules_1 = require('./modules');
var isolateModule_1 = require('./isolateModule');
var transposition_1 = require('./transposition');
var xstream_adapter_1 = require('@cycle/xstream-adapter');
function makeDOMDriverInputGuard(modules) {
    if (!Array.isArray(modules)) {
        throw new Error("Optional modules option must be " +
            "an array for snabbdom modules");
    }
}
function domDriverInputGuard(view$) {
    if (!view$
        || typeof view$.addListener !== "function"
        || typeof view$.fold !== "function") {
        throw new Error("The DOM driver function expects as input a Stream of " +
            "virtual DOM elements");
    }
}
function makeDOMDriver(container, options) {
    if (!options) {
        options = {};
    }
    var transposition = options.transposition || false;
    var modules = options.modules || modules_1.default;
    var isolateModule = new isolateModule_1.IsolateModule((new Map()));
    var patch = snabbdom_1.init([isolateModule.createModule()].concat(modules));
    var rootElement = utils_1.getElement(container);
    var vnodeWrapper = new VNodeWrapper_1.VNodeWrapper(rootElement);
    var delegators = new Map();
    makeDOMDriverInputGuard(modules);
    function DOMDriver(vnode$, runStreamAdapter) {
        domDriverInputGuard(vnode$);
        var transposeVNode = transposition_1.makeTransposeVNode(runStreamAdapter);
        var preprocessedVNode$ = (transposition ? vnode$.map(transposeVNode).flatten() : vnode$);
        var rootElement$ = preprocessedVNode$
            .map(function (vnode) { return vnodeWrapper.call(vnode); })
            .fold(patch, rootElement)
            .drop(1)
            .map(function unwrapElementFromVNode(vnode) { return vnode.elm; })
            .compose(function (stream) { return xstream_1.default.merge(stream, xstream_1.default.never()); }) // don't complete this stream
            .startWith(rootElement);
        /* tslint:disable:no-empty */
        rootElement$.addListener({ next: function () { }, error: function () { }, complete: function () { } });
        /* tslint:enable:no-empty */
        return new DOMSource_1.DOMSource(rootElement$, runStreamAdapter, [], isolateModule, delegators);
    }
    ;
    DOMDriver.streamAdapter = xstream_adapter_1.default;
    return DOMDriver;
}
exports.makeDOMDriver = makeDOMDriver;

},{"./DOMSource":2,"./VNodeWrapper":7,"./isolateModule":13,"./modules":17,"./transposition":18,"./utils":19,"@cycle/xstream-adapter":20,"snabbdom":99,"xstream":107}],15:[function(require,module,exports){
"use strict";
var xstream_adapter_1 = require('@cycle/xstream-adapter');
var transposition_1 = require('./transposition');
var HTMLSource_1 = require('./HTMLSource');
function makeHTMLDriver(options) {
    if (!options) {
        options = {};
    }
    var transposition = options.transposition || false;
    function htmlDriver(vnode$, runStreamAdapter) {
        var transposeVNode = transposition_1.makeTransposeVNode(runStreamAdapter);
        var preprocessedVNode$ = (transposition ? vnode$.map(transposeVNode).flatten() : vnode$);
        return new HTMLSource_1.HTMLSource(preprocessedVNode$, runStreamAdapter);
    }
    ;
    htmlDriver.streamAdapter = xstream_adapter_1.default;
    return htmlDriver;
}
exports.makeHTMLDriver = makeHTMLDriver;

},{"./HTMLSource":5,"./transposition":18,"@cycle/xstream-adapter":20}],16:[function(require,module,exports){
"use strict";
var xstream_1 = require('xstream');
var MockedDOMSource = (function () {
    function MockedDOMSource(_mockConfig) {
        this._mockConfig = _mockConfig;
        if (_mockConfig['elements']) {
            this.elements = _mockConfig['elements'];
        }
        else {
            this.elements = xstream_1.default.empty();
        }
    }
    MockedDOMSource.prototype.events = function (eventType) {
        var mockConfig = this._mockConfig;
        var keys = Object.keys(mockConfig);
        var keysLen = keys.length;
        for (var i = 0; i < keysLen; i++) {
            var key = keys[i];
            if (key === eventType) {
                return mockConfig[key];
            }
        }
        return xstream_1.default.empty();
    };
    MockedDOMSource.prototype.select = function (selector) {
        var mockConfig = this._mockConfig;
        var keys = Object.keys(mockConfig);
        var keysLen = keys.length;
        for (var i = 0; i < keysLen; i++) {
            var key = keys[i];
            if (key === selector) {
                return new MockedDOMSource(mockConfig[key]);
            }
        }
        return new MockedDOMSource({});
    };
    return MockedDOMSource;
}());
exports.MockedDOMSource = MockedDOMSource;
function mockDOMSource(mockConfig) {
    return new MockedDOMSource(mockConfig);
}
exports.mockDOMSource = mockDOMSource;

},{"xstream":107}],17:[function(require,module,exports){
"use strict";
var ClassModule = require('snabbdom/modules/class');
exports.ClassModule = ClassModule;
var PropsModule = require('snabbdom/modules/props');
exports.PropsModule = PropsModule;
var AttrsModule = require('snabbdom/modules/attributes');
exports.AttrsModule = AttrsModule;
var EventsModule = require('snabbdom/modules/eventlisteners');
exports.EventsModule = EventsModule;
var StyleModule = require('snabbdom/modules/style');
exports.StyleModule = StyleModule;
var HeroModule = require('snabbdom/modules/hero');
exports.HeroModule = HeroModule;
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = [StyleModule, ClassModule, PropsModule, AttrsModule];

},{"snabbdom/modules/attributes":93,"snabbdom/modules/class":94,"snabbdom/modules/eventlisteners":95,"snabbdom/modules/hero":96,"snabbdom/modules/props":97,"snabbdom/modules/style":98}],18:[function(require,module,exports){
"use strict";
var xstream_adapter_1 = require('@cycle/xstream-adapter');
var xstream_1 = require('xstream');
function createVTree(vnode, children) {
    return {
        sel: vnode.sel,
        data: vnode.data,
        text: vnode.text,
        elm: vnode.elm,
        key: vnode.key,
        children: children,
    };
}
function makeTransposeVNode(runStreamAdapter) {
    return function transposeVNode(vnode) {
        if (!vnode) {
            return null;
        }
        else if (vnode && typeof vnode.data === "object" && vnode.data.static) {
            return xstream_1.default.of(vnode);
        }
        else if (runStreamAdapter.isValidStream(vnode)) {
            var xsStream = xstream_adapter_1.default.adapt(vnode, runStreamAdapter.streamSubscribe);
            return xsStream.map(transposeVNode).flatten();
        }
        else if (typeof vnode === "object") {
            if (!vnode.children || vnode.children.length === 0) {
                return xstream_1.default.of(vnode);
            }
            var vnodeChildren = vnode.children
                .map(transposeVNode)
                .filter(function (x) { return x !== null; });
            return vnodeChildren.length === 0 ?
                xstream_1.default.of(createVTree(vnode, vnodeChildren)) :
                xstream_1.default.combine.apply(xstream_1.default, [function () {
                    var children = [];
                    for (var _i = 0; _i < arguments.length; _i++) {
                        children[_i - 0] = arguments[_i];
                    }
                    return createVTree(vnode, children);
                }].concat(vnodeChildren));
        }
        else {
            throw new Error("Unhandled vTree Value");
        }
    };
}
exports.makeTransposeVNode = makeTransposeVNode;

},{"@cycle/xstream-adapter":20,"xstream":107}],19:[function(require,module,exports){
"use strict";
function isElement(obj) {
    return typeof HTMLElement === "object" ?
        obj instanceof HTMLElement || obj instanceof DocumentFragment :
        obj && typeof obj === "object" && obj !== null &&
            (obj.nodeType === 1 || obj.nodeType === 11) &&
            typeof obj.nodeName === "string";
}
exports.SCOPE_PREFIX = "$$CYCLEDOM$$-";
function getElement(selectors) {
    var domElement = (typeof selectors === "string" ?
        document.querySelector(selectors) :
        selectors);
    if (typeof selectors === "string" && domElement === null) {
        throw new Error("Cannot render into unknown element `" + selectors + "`");
    }
    else if (!isElement(domElement)) {
        throw new Error("Given container is not a DOM element neither a " +
            "selector string.");
    }
    return domElement;
}
exports.getElement = getElement;
function getScope(namespace) {
    return namespace
        .filter(function (c) { return c.indexOf(exports.SCOPE_PREFIX) > -1; })
        .slice(-1) // only need the latest, most specific, isolated boundary
        .join("");
}
exports.getScope = getScope;
function getSelectors(namespace) {
    return namespace.filter(function (c) { return c.indexOf(exports.SCOPE_PREFIX) === -1; }).join(" ");
}
exports.getSelectors = getSelectors;

},{}],20:[function(require,module,exports){
"use strict";
var xstream_1 = require('xstream');
function logToConsoleError(err) {
    var target = err.stack || err;
    if (console && console.error) {
        console.error(target);
    }
    else if (console && console.log) {
        console.log(target);
    }
}
var XStreamAdapter = {
    adapt: function (originStream, originStreamSubscribe) {
        if (XStreamAdapter.isValidStream(originStream)) {
            return originStream;
        }
        ;
        var dispose = null;
        return xstream_1.default.create({
            start: function (out) {
                var observer = {
                    next: function (value) { return out.shamefullySendNext(value); },
                    error: function (err) { return out.shamefullySendError(err); },
                    complete: function () { return out.shamefullySendComplete(); },
                };
                dispose = originStreamSubscribe(originStream, observer);
            },
            stop: function () {
                if (typeof dispose === 'function') {
                    dispose();
                }
            }
        });
    },
    dispose: function (sinks, sinkProxies, sources) {
        Object.keys(sources).forEach(function (k) {
            if (typeof sources[k].dispose === 'function') {
                sources[k].dispose();
            }
        });
        Object.keys(sinks).forEach(function (k) {
            sinks[k].removeListener(sinkProxies[k].stream);
        });
    },
    makeSubject: function () {
        var stream = xstream_1.default.create();
        var observer = {
            next: function (x) { stream.shamefullySendNext(x); },
            error: function (err) {
                logToConsoleError(err);
                stream.shamefullySendError(err);
            },
            complete: function () { stream.shamefullySendComplete(); }
        };
        return { observer: observer, stream: stream };
    },
    isValidStream: function (stream) {
        return (typeof stream.addListener === 'function' &&
            typeof stream.shamefullySendNext === 'function');
    },
    streamSubscribe: function (stream, observer) {
        stream.addListener(observer);
        return function () { return stream.removeListener(observer); };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = XStreamAdapter;

},{"xstream":107}],21:[function(require,module,exports){
"use strict";
var clickEvent = 'undefined' !== typeof document && document.ontouchstart ?
    'touchstart' : 'click';
function which(ev) {
    if (typeof window === 'undefined') {
        return false;
    }
    var e = ev || window.event;
    return e.which === null ? e.button : e.which;
}
function sameOrigin(href) {
    if (typeof window === 'undefined') {
        return false;
    }
    return href && href.indexOf(window.location.origin) === 0;
}
function makeClickListener(push) {
    return function clickListener(event) {
        if (which(event) !== 1) {
            return;
        }
        if (event.metaKey || event.ctrlKey || event.shiftKey) {
            return;
        }
        if (event.defaultPrevented) {
            return;
        }
        var element = event.target;
        while (element && element.nodeName !== 'A') {
            element = element.parentNode;
        }
        if (!element || element.nodeName !== 'A') {
            return;
        }
        if (element.hasAttribute('download') ||
            element.getAttribute('rel') === 'external') {
            return;
        }
        if (element.target) {
            return;
        }
        var link = element.getAttribute('href');
        if (link && link.indexOf('mailto:') > -1 || link === '#') {
            return;
        }
        if (!sameOrigin(element.href)) {
            return;
        }
        event.preventDefault();
        var pathname = element.pathname, search = element.search, _a = element.hash, hash = _a === void 0 ? '' : _a;
        push(pathname + search + hash);
    };
}
function captureClicks(push) {
    var listener = makeClickListener(push);
    if (typeof window !== 'undefined') {
        document.addEventListener(clickEvent, listener, false);
    }
}
exports.captureClicks = captureClicks;

},{}],22:[function(require,module,exports){
"use strict";
var makeHistoryDriver_1 = require('./makeHistoryDriver');
exports.makeHistoryDriver = makeHistoryDriver_1.makeHistoryDriver;
var serverHistory_1 = require('./serverHistory');
exports.createServerHistory = serverHistory_1.createServerHistory;
var util_1 = require('./util');
exports.supportsHistory = util_1.supportsHistory;
exports.createLocation = util_1.createLocation;

},{"./makeHistoryDriver":23,"./serverHistory":24,"./util":25}],23:[function(require,module,exports){
"use strict";
var captureClicks_1 = require('./captureClicks');
function makeUpdateHistory(history) {
    return function updateHistory(location) {
        if ('string' === typeof location) {
            history.push(history.createLocation(location));
        }
        else if ('object' === typeof location) {
            // suport things like history.replace()
            var _a = location.type, type = _a === void 0 ? 'push' : _a;
            if (type === 'go') {
                history[type](location);
            }
            else {
                history[type](location);
            }
        }
        else {
            throw new Error('History Driver input must be a string or an ' +
                'object but received ${typeof url}');
        }
    };
}
function defaultOnErrorFn(err) {
    if (console && console.error !== void 0) {
        console.error(err);
    }
}
function makeHistoryDriver(history, options) {
    if (!history || typeof history !== 'object'
        || typeof history.createLocation !== 'function'
        || typeof history.createHref !== 'function'
        || typeof history.listen !== 'function'
        || typeof history.push !== 'function') {
        throw new TypeError('makeHistoryDriver requires an valid history object ' +
            'containing createLocation(), createHref(), push(), and listen() methods');
    }
    var capture = options && options.capture || false;
    var onError = options && options.onError || defaultOnErrorFn;
    return function historyDriver(sink$, runSA) {
        var _a = runSA.makeSubject(), observer = _a.observer, stream = _a.stream;
        var unlisten = history.listen(function (location) {
            observer.next(location);
        });
        if (typeof history.addCompleteCallback === 'function'
            && typeof history.complete === 'function') {
            history.addCompleteCallback(function () {
                observer.complete();
            });
        }
        runSA.streamSubscribe(sink$, {
            next: makeUpdateHistory(history),
            error: onError,
            complete: function () {
                unlisten();
                observer.complete();
            }
        });
        if (capture) {
            captureClicks_1.captureClicks(function (pathname) {
                var location = history.createLocation(pathname);
                history.push(location);
            });
        }
        stream.createHref = history.createHref;
        stream.createLocation = history.createLocation;
        return stream;
    };
}
exports.makeHistoryDriver = makeHistoryDriver;

},{"./captureClicks":21}],24:[function(require,module,exports){
"use strict";
var util_1 = require('./util');
var ServerHistory = (function () {
    function ServerHistory() {
        this.listeners = [];
    }
    ServerHistory.prototype.listen = function (listener) {
        this.listeners.push(listener);
        return function noop() { return void 0; };
    };
    ServerHistory.prototype.push = function (location) {
        var length = this.listeners.length;
        if (length === 0) {
            throw new Error('Must be given at least one listener before pushing');
        }
        for (var i = 0; i < length; ++i) {
            this.listeners[i](util_1.createLocation(location));
        }
    };
    ServerHistory.prototype.replace = function (location) {
        this.push(location);
    };
    ServerHistory.prototype.createHref = function (path) {
        return path;
    };
    ServerHistory.prototype.createLocation = function (location) {
        return util_1.createLocation(location);
    };
    ServerHistory.prototype.addCompleteCallback = function (complete) {
        this._completeCallback = complete;
    };
    ServerHistory.prototype.complete = function () {
        this._completeCallback();
    };
    return ServerHistory;
}());
function createServerHistory() {
    return new ServerHistory();
}
exports.createServerHistory = createServerHistory;

},{"./util":25}],25:[function(require,module,exports){
"use strict";
function supportsHistory() {
    if (typeof navigator === 'undefined') {
        return false;
    }
    var ua = navigator.userAgent;
    if ((ua.indexOf('Android 2.') !== -1 ||
        ua.indexOf('Android 4.0') !== -1) &&
        ua.indexOf('Mobile Safari') !== -1 &&
        ua.indexOf('Chrome') === -1 &&
        ua.indexOf('Windows Phone') === -1) {
        return false;
    }
    if (typeof window !== 'undefined') {
        return window.history && 'pushState' in window.history;
    }
    else {
        return false;
    }
}
exports.supportsHistory = supportsHistory;
var locationDefaults = {
    pathname: '/',
    action: 'POP',
    hash: '',
    search: '',
    state: null,
    key: null,
    query: null,
};
function createLocation(location) {
    if (typeof location === 'string') {
        return Object.assign({}, locationDefaults, { pathname: location });
    }
    return Object.assign({}, locationDefaults, location);
}
exports.createLocation = createLocation;

},{}],26:[function(require,module,exports){
"use strict";

var counter = 0;

function newScope() {
  return "cycle" + ++counter;
}

/**
 * Takes a `dataflowComponent` function and an optional `scope` string, and
 * returns a scoped version of the `dataflowComponent` function.
 *
 * When the scoped dataflow component is invoked, each source provided to the
 * scoped dataflowComponent is isolated to the scope using
 * `source.isolateSource(source, scope)`, if possible. Likewise, the sinks
 * returned from the scoped dataflow component are isolate to the scope using
 * `source.isolateSink(sink, scope)`.
 *
 * If the `scope` is not provided, a new scope will be automatically created.
 * This means that while **`isolate(dataflowComponent, scope)` is pure**
 * (referentially transparent), **`isolate(dataflowComponent)` is impure**
 * (not referentially transparent). Two calls to `isolate(Foo, bar)` will
 * generate two indistinct dataflow components. But, two calls to `isolate(Foo)`
 * will generate two distinct dataflow components.
 *
 * Note that both `isolateSource()` and `isolateSink()` are static members of
 * `source`. The reason for this is that drivers produce `source` while the
 * application produces `sink`, and it's the driver's responsibility to
 * implement `isolateSource()` and `isolateSink()`.
 *
 * @param {Function} dataflowComponent a function that takes `sources` as input
 * and outputs a collection of `sinks`.
 * @param {String} scope an optional string that is used to isolate each
 * `sources` and `sinks` when the returned scoped dataflow component is invoked.
 * @return {Function} the scoped dataflow component function that, as the
 * original `dataflowComponent` function, takes `sources` and returns `sinks`.
 * @function isolate
 */
function isolate(dataflowComponent) {
  var scope = arguments.length <= 1 || arguments[1] === undefined ? newScope() : arguments[1];

  if (typeof dataflowComponent !== "function") {
    throw new Error("First argument given to isolate() must be a " + "'dataflowComponent' function");
  }
  if (typeof scope !== "string") {
    throw new Error("Second argument given to isolate() must be a " + "string for 'scope'");
  }
  return function scopedDataflowComponent(sources) {
    var scopedSources = {};
    for (var key in sources) {
      if (sources.hasOwnProperty(key) && sources[key] && typeof sources[key].isolateSource === "function") {
        scopedSources[key] = sources[key].isolateSource(sources[key], scope);
      } else if (sources.hasOwnProperty(key)) {
        scopedSources[key] = sources[key];
      }
    }

    for (var _len = arguments.length, rest = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
      rest[_key - 1] = arguments[_key];
    }

    var sinks = dataflowComponent.apply(undefined, [scopedSources].concat(rest));
    var scopedSinks = {};
    for (var key in sinks) {
      if (sinks.hasOwnProperty(key) && sources.hasOwnProperty(key) && typeof sources[key].isolateSink === "function") {
        scopedSinks[key] = sources[key].isolateSink(sinks[key], scope);
      } else if (sinks.hasOwnProperty(key)) {
        scopedSinks[key] = sinks[key];
      }
    }
    return scopedSinks;
  };
}

isolate.reset = function () {
  return counter = 0;
};

module.exports = isolate;
},{}],27:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _xstreamAdapter = require('@cycle/xstream-adapter');

var _xstreamAdapter2 = _interopRequireDefault(_xstreamAdapter);

var _writeToStore = require('./writeToStore');

var _writeToStore2 = _interopRequireDefault(_writeToStore);

var _responseCollection = require('./responseCollection');

var _responseCollection2 = _interopRequireDefault(_responseCollection);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Storage Driver.
 *
 * This is a localStorage and sessionStorage Driver for Cycle.js apps. The
 * driver is also a function, and it takes a stream of requests as input, and
 * returns a **`responseCollection`** with functions that allow reading from the
 * storage objects. The functions on the **`responseCollection`** return streams
 * of the storage data that was requested.
 *
 * **Requests**. The stream of requests should emit objects. These should be
 * instructions to write to the desired Storage object. Here are the `request`
 * object properties:
 *
 * - `target` *(String)*: type of storage, can be `local` or `session`, defaults
 * to `local`.
 * - `action` *(String)*: type of action, can be `setItem`, `removeItem` or
 * `clear`, defaults to `setItem`.
 * - `key` *(String)*: storage key.
 * - `value` *(String)*: storage value.
 *
 * **responseCollection**. The **`responseCollection`** is an Object that
 * exposes functions to read from local- and sessionStorage.
 *
 * ```js
 * // Returns key of nth localStorage value.
 * responseCollection.local.getKey(n)
 * // Returns localStorage value of `key`.
 * responseCollection.local.getItem(key)
 * // Returns key of nth sessionStorage value.
 * responseCollection.session.getKey(n)
 * // Returns sessionStorage value of `key`.
 * responseCollection.session.getItem(key)
 * ```
 *
 * @param request$ - a stream of write request objects.
 * @return {Object} the response collection containing functions
 * for reading from storage.
 * @function storageDriver
 */
function storageDriver(request$, runStreamAdapter) {
  // Execute writing actions.
  request$.addListener({
    next: function next(request) {
      return (0, _writeToStore2.default)(request);
    },
    error: function error() {},
    complete: function complete() {}
  });

  // Return reading functions.
  return (0, _responseCollection2.default)(request$, runStreamAdapter);
}

storageDriver.streamAdapter = _xstreamAdapter2.default;

exports.default = storageDriver;
},{"./responseCollection":28,"./writeToStore":30,"@cycle/xstream-adapter":31}],28:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

exports.default = function (request$, runStreamAdapter) {
  return {
    // For localStorage.
    get local() {
      return (0, _util2.default)(request$, runStreamAdapter);
    },
    // For sessionStorage.
    get session() {
      return (0, _util2.default)(request$, runStreamAdapter, 'session');
    }
  };
};

var _util = require('./util');

var _util2 = _interopRequireDefault(_util);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
},{"./util":29}],29:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = getResponseObj;

var _dropRepeats = require('xstream/extra/dropRepeats');

var _dropRepeats2 = _interopRequireDefault(_dropRepeats);

var _xstreamAdapter = require('@cycle/xstream-adapter');

var _xstreamAdapter2 = _interopRequireDefault(_xstreamAdapter);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function getStorage$(request$, type) {
  if (type === 'local') {
    return request$.filter(function (req) {
      return !req.target || req.target === 'local';
    });
  } else {
    return request$.filter(function (req) {
      return req.target === 'session';
    });
  }
}

function storageKey(n, request$) {
  var type = arguments.length <= 2 || arguments[2] === undefined ? 'local' : arguments[2];

  var storage$ = getStorage$(request$, type);
  var key = type === 'local' ? localStorage.key(n) : sessionStorage.key(n);

  return storage$.filter(function (req) {
    return req.key === key;
  }).map(function (req) {
    return req.key;
  }).startWith(key).compose((0, _dropRepeats2.default)());
}

function storageGetItem(key, request$) {
  var type = arguments.length <= 2 || arguments[2] === undefined ? 'local' : arguments[2];

  var storage$ = getStorage$(request$, type);
  var storageObj = type === 'local' ? localStorage : sessionStorage;

  return storage$.filter(function (req) {
    return req.key === key;
  }).map(function (req) {
    return req.value;
  }).startWith(storageObj.getItem(key));
}

function getResponseObj(request$, runSA) {
  var type = arguments.length <= 2 || arguments[2] === undefined ? 'local' : arguments[2];

  return {
    // Function returning stream of the nth key.

    key: function key(n) {
      return runSA.adapt(storageKey(n, request$, type), _xstreamAdapter2.default.streamSubscribe);
    },

    // Function returning stream of item values.
    getItem: function getItem(key) {
      return runSA.adapt(storageGetItem(key, request$, type), _xstreamAdapter2.default.streamSubscribe);
    }
  };
}
},{"@cycle/xstream-adapter":31,"xstream/extra/dropRepeats":106}],30:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
/**
 * @function writeToStore
 * @description
 * A universal write function for localStorage and sessionStorage.
 * @param {object} request - the storage request object
 * @param {string} request.target - a string determines which storage to use
 * @param {string} request.action - a string determines the write action
 * @param {string} request.key - the key of a storage item
 * @param {string} request.value - the value of a storage item
 */
function writeToStore(_ref) {
  var _ref$target = _ref.target;
  var target = _ref$target === undefined ? "local" : _ref$target;
  var _ref$action = _ref.action;
  var action = _ref$action === undefined ? "setItem" : _ref$action;
  var key = _ref.key;
  var value = _ref.value;

  // Determine the storage target.
  var storage = target === "local" ? localStorage : sessionStorage;

  // Execute the storage action and pass arguments if they were defined.
  storage[action](key, value);
}

exports.default = writeToStore;
},{}],31:[function(require,module,exports){
"use strict";
var xstream_1 = require('xstream');
function logToConsoleError(err) {
    var target = err.stack || err;
    if (console && console.error) {
        console.error(target);
    }
    else if (console && console.log) {
        console.log(target);
    }
}
var XStreamAdapter = {
    adapt: function (originStream, originStreamSubscribe) {
        if (XStreamAdapter.isValidStream(originStream)) {
            return originStream;
        }
        ;
        var dispose = null;
        return xstream_1.default.create({
            start: function (out) {
                var observer = {
                    next: function (value) { return out.shamefullySendNext(value); },
                    error: function (err) { return out.shamefullySendError(err); },
                    complete: function () { return out.shamefullySendComplete(); },
                };
                dispose = originStreamSubscribe(originStream, observer);
            },
            stop: function () {
                if (typeof dispose === 'function') {
                    dispose();
                }
            }
        });
    },
    dispose: function (sinks, sinkProxies, sources) {
        Object.keys(sources).forEach(function (k) {
            if (typeof sources[k].dispose === 'function') {
                sources[k].dispose();
            }
        });
        Object.keys(sinks).forEach(function (k) {
            sinks[k].removeListener(sinkProxies[k].stream);
        });
    },
    makeHoldSubject: function () {
        var stream = xstream_1.default.createWithMemory();
        var observer = {
            next: function (x) { stream.shamefullySendNext(x); },
            error: function (err) {
                logToConsoleError(err);
                stream.shamefullySendError(err);
            },
            complete: function () { stream.shamefullySendComplete(); }
        };
        return { observer: observer, stream: stream };
    },
    isValidStream: function (stream) {
        return (typeof stream.addListener === 'function' &&
            typeof stream.imitate === 'function');
    },
    streamSubscribe: function (stream, observer) {
        stream.addListener(observer);
        return function () { return stream.removeListener(observer); };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = XStreamAdapter;

},{"xstream":107}],32:[function(require,module,exports){
"use strict";
var base_1 = require('@cycle/base');
var xstream_adapter_1 = require('@cycle/xstream-adapter');
/**
 * A function that prepares the Cycle application to be executed. Takes a `main`
 * function and prepares to circularly connects it to the given collection of
 * driver functions. As an output, `Cycle()` returns an object with three
 * properties: `sources`, `sinks` and `run`. Only when `run()` is called will
 * the application actually execute. Refer to the documentation of `run()` for
 * more details.
 *
 * **Example:**
 * ```js
 * const {sources, sinks, run} = Cycle(main, drivers);
 * // ...
 * const dispose = run(); // Executes the application
 * // ...
 * dispose();
 * ```
 *
 * @param {Function} main a function that takes `sources` as input
 * and outputs a collection of `sinks` Observables.
 * @param {Object} drivers an object where keys are driver names and values
 * are driver functions.
 * @return {Object} an object with three properties: `sources`, `sinks` and
 * `run`. `sources` is the collection of driver sources, `sinks` is the
 * collection of driver sinks, these can be used for debugging or testing. `run`
 * is the function that once called will execute the application.
 * @function Cycle
 */
var Cycle = function (main, drivers) {
    return base_1.default(main, drivers, { streamAdapter: xstream_adapter_1.default });
};
/**
 * Takes a `main` function and circularly connects it to the given collection
 * of driver functions.
 *
 * **Example:**
 * ```js
 * const dispose = Cycle.run(main, drivers);
 * // ...
 * dispose();
 * ```
 *
 * The `main` function expects a collection of "source" Observables (returned
 * from drivers) as input, and should return a collection of "sink" Observables
 * (to be given to drivers). A "collection of Observables" is a JavaScript
 * object where keys match the driver names registered by the `drivers` object,
 * and values are the Observables. Refer to the documentation of each driver to
 * see more details on what types of sources it outputs and sinks it receives.
 *
 * @param {Function} main a function that takes `sources` as input
 * and outputs a collection of `sinks` Observables.
 * @param {Object} drivers an object where keys are driver names and values
 * are driver functions.
 * @return {Function} a dispose function, used to terminate the execution of the
 * Cycle.js program, cleaning up resources used.
 * @function run
 */
function run(main, drivers) {
    var run = base_1.default(main, drivers, { streamAdapter: xstream_adapter_1.default }).run;
    return run();
}
exports.run = run;
Cycle.run = run;
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Cycle;

},{"@cycle/base":1,"@cycle/xstream-adapter":33}],33:[function(require,module,exports){
arguments[4][20][0].apply(exports,arguments)
},{"dup":20,"xstream":107}],34:[function(require,module,exports){
/*!
 * Cross-Browser Split 1.1.1
 * Copyright 2007-2012 Steven Levithan <stevenlevithan.com>
 * Available under the MIT License
 * ECMAScript compliant, uniform cross-browser split method
 */

/**
 * Splits a string into an array of strings using a regex or string separator. Matches of the
 * separator are not included in the result array. However, if `separator` is a regex that contains
 * capturing groups, backreferences are spliced into the result each time `separator` is matched.
 * Fixes browser bugs compared to the native `String.prototype.split` and can be used reliably
 * cross-browser.
 * @param {String} str String to split.
 * @param {RegExp|String} separator Regex or string to use for separating the string.
 * @param {Number} [limit] Maximum number of items to include in the result array.
 * @returns {Array} Array of substrings.
 * @example
 *
 * // Basic use
 * split('a b c d', ' ');
 * // -> ['a', 'b', 'c', 'd']
 *
 * // With limit
 * split('a b c d', ' ', 2);
 * // -> ['a', 'b']
 *
 * // Backreferences in result array
 * split('..word1 word2..', /([a-z]+)(\d+)/i);
 * // -> ['..', 'word', '1', ' ', 'word', '2', '..']
 */
module.exports = (function split(undef) {

  var nativeSplit = String.prototype.split,
    compliantExecNpcg = /()??/.exec("")[1] === undef,
    // NPCG: nonparticipating capturing group
    self;

  self = function(str, separator, limit) {
    // If `separator` is not a regex, use `nativeSplit`
    if (Object.prototype.toString.call(separator) !== "[object RegExp]") {
      return nativeSplit.call(str, separator, limit);
    }
    var output = [],
      flags = (separator.ignoreCase ? "i" : "") + (separator.multiline ? "m" : "") + (separator.extended ? "x" : "") + // Proposed for ES6
      (separator.sticky ? "y" : ""),
      // Firefox 3+
      lastLastIndex = 0,
      // Make `global` and avoid `lastIndex` issues by working with a copy
      separator = new RegExp(separator.source, flags + "g"),
      separator2, match, lastIndex, lastLength;
    str += ""; // Type-convert
    if (!compliantExecNpcg) {
      // Doesn't need flags gy, but they don't hurt
      separator2 = new RegExp("^" + separator.source + "$(?!\\s)", flags);
    }
    /* Values for `limit`, per the spec:
     * If undefined: 4294967295 // Math.pow(2, 32) - 1
     * If 0, Infinity, or NaN: 0
     * If positive number: limit = Math.floor(limit); if (limit > 4294967295) limit -= 4294967296;
     * If negative number: 4294967296 - Math.floor(Math.abs(limit))
     * If other: Type-convert, then use the above rules
     */
    limit = limit === undef ? -1 >>> 0 : // Math.pow(2, 32) - 1
    limit >>> 0; // ToUint32(limit)
    while (match = separator.exec(str)) {
      // `separator.lastIndex` is not reliable cross-browser
      lastIndex = match.index + match[0].length;
      if (lastIndex > lastLastIndex) {
        output.push(str.slice(lastLastIndex, match.index));
        // Fix browsers whose `exec` methods don't consistently return `undefined` for
        // nonparticipating capturing groups
        if (!compliantExecNpcg && match.length > 1) {
          match[0].replace(separator2, function() {
            for (var i = 1; i < arguments.length - 2; i++) {
              if (arguments[i] === undef) {
                match[i] = undef;
              }
            }
          });
        }
        if (match.length > 1 && match.index < str.length) {
          Array.prototype.push.apply(output, match.slice(1));
        }
        lastLength = match[0].length;
        lastLastIndex = lastIndex;
        if (output.length >= limit) {
          break;
        }
      }
      if (separator.lastIndex === match.index) {
        separator.lastIndex++; // Avoid an infinite loop
      }
    }
    if (lastLastIndex === str.length) {
      if (lastLength || !separator.test("")) {
        output.push("");
      }
    } else {
      output.push(str.slice(lastLastIndex));
    }
    return output.length > limit ? output.slice(0, limit) : output;
  };

  return self;
})();

},{}],35:[function(require,module,exports){
var pSlice = Array.prototype.slice;
var objectKeys = require('./lib/keys.js');
var isArguments = require('./lib/is_arguments.js');

var deepEqual = module.exports = function (actual, expected, opts) {
  if (!opts) opts = {};
  // 7.1. All identical values are equivalent, as determined by ===.
  if (actual === expected) {
    return true;

  } else if (actual instanceof Date && expected instanceof Date) {
    return actual.getTime() === expected.getTime();

  // 7.3. Other pairs that do not both pass typeof value == 'object',
  // equivalence is determined by ==.
  } else if (!actual || !expected || typeof actual != 'object' && typeof expected != 'object') {
    return opts.strict ? actual === expected : actual == expected;

  // 7.4. For all other Object pairs, including Array objects, equivalence is
  // determined by having the same number of owned properties (as verified
  // with Object.prototype.hasOwnProperty.call), the same set of keys
  // (although not necessarily the same order), equivalent values for every
  // corresponding key, and an identical 'prototype' property. Note: this
  // accounts for both named and indexed properties on Arrays.
  } else {
    return objEquiv(actual, expected, opts);
  }
}

function isUndefinedOrNull(value) {
  return value === null || value === undefined;
}

function isBuffer (x) {
  if (!x || typeof x !== 'object' || typeof x.length !== 'number') return false;
  if (typeof x.copy !== 'function' || typeof x.slice !== 'function') {
    return false;
  }
  if (x.length > 0 && typeof x[0] !== 'number') return false;
  return true;
}

function objEquiv(a, b, opts) {
  var i, key;
  if (isUndefinedOrNull(a) || isUndefinedOrNull(b))
    return false;
  // an identical 'prototype' property.
  if (a.prototype !== b.prototype) return false;
  //~~~I've managed to break Object.keys through screwy arguments passing.
  //   Converting to array solves the problem.
  if (isArguments(a)) {
    if (!isArguments(b)) {
      return false;
    }
    a = pSlice.call(a);
    b = pSlice.call(b);
    return deepEqual(a, b, opts);
  }
  if (isBuffer(a)) {
    if (!isBuffer(b)) {
      return false;
    }
    if (a.length !== b.length) return false;
    for (i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }
  try {
    var ka = objectKeys(a),
        kb = objectKeys(b);
  } catch (e) {//happens when one is a string literal and the other isn't
    return false;
  }
  // having the same number of owned properties (keys incorporates
  // hasOwnProperty)
  if (ka.length != kb.length)
    return false;
  //the same set of keys (although not necessarily the same order),
  ka.sort();
  kb.sort();
  //~~~cheap key test
  for (i = ka.length - 1; i >= 0; i--) {
    if (ka[i] != kb[i])
      return false;
  }
  //equivalent values for every corresponding key, and
  //~~~possibly expensive deep test
  for (i = ka.length - 1; i >= 0; i--) {
    key = ka[i];
    if (!deepEqual(a[key], b[key], opts)) return false;
  }
  return typeof a === typeof b;
}

},{"./lib/is_arguments.js":36,"./lib/keys.js":37}],36:[function(require,module,exports){
var supportsArgumentsClass = (function(){
  return Object.prototype.toString.call(arguments)
})() == '[object Arguments]';

exports = module.exports = supportsArgumentsClass ? supported : unsupported;

exports.supported = supported;
function supported(object) {
  return Object.prototype.toString.call(object) == '[object Arguments]';
};

exports.unsupported = unsupported;
function unsupported(object){
  return object &&
    typeof object == 'object' &&
    typeof object.length == 'number' &&
    Object.prototype.hasOwnProperty.call(object, 'callee') &&
    !Object.prototype.propertyIsEnumerable.call(object, 'callee') ||
    false;
};

},{}],37:[function(require,module,exports){
exports = module.exports = typeof Object.keys === 'function'
  ? Object.keys : shim;

exports.shim = shim;
function shim (obj) {
  var keys = [];
  for (var key in obj) keys.push(key);
  return keys;
}

},{}],38:[function(require,module,exports){
/**
 * Indicates that navigation was caused by a call to history.push.
 */
'use strict';

exports.__esModule = true;
var PUSH = 'PUSH';

exports.PUSH = PUSH;
/**
 * Indicates that navigation was caused by a call to history.replace.
 */
var REPLACE = 'REPLACE';

exports.REPLACE = REPLACE;
/**
 * Indicates that navigation was caused by some other action such
 * as using a browser's back/forward buttons and/or manually manipulating
 * the URL in a browser's location bar. This is the default.
 *
 * See https://developer.mozilla.org/en-US/docs/Web/API/WindowEventHandlers/onpopstate
 * for more information.
 */
var POP = 'POP';

exports.POP = POP;
exports['default'] = {
  PUSH: PUSH,
  REPLACE: REPLACE,
  POP: POP
};
},{}],39:[function(require,module,exports){
"use strict";

exports.__esModule = true;
var _slice = Array.prototype.slice;
exports.loopAsync = loopAsync;

function loopAsync(turns, work, callback) {
  var currentTurn = 0,
      isDone = false;
  var sync = false,
      hasNext = false,
      doneArgs = undefined;

  function done() {
    isDone = true;
    if (sync) {
      // Iterate instead of recursing if possible.
      doneArgs = [].concat(_slice.call(arguments));
      return;
    }

    callback.apply(this, arguments);
  }

  function next() {
    if (isDone) {
      return;
    }

    hasNext = true;
    if (sync) {
      // Iterate instead of recursing if possible.
      return;
    }

    sync = true;

    while (!isDone && currentTurn < turns && hasNext) {
      hasNext = false;
      work.call(this, currentTurn++, next, done);
    }

    sync = false;

    if (isDone) {
      // This means the loop finished synchronously.
      callback.apply(this, doneArgs);
      return;
    }

    if (currentTurn >= turns && hasNext) {
      isDone = true;
      callback();
    }
  }

  next();
}
},{}],40:[function(require,module,exports){
(function (process){
/*eslint-disable no-empty */
'use strict';

exports.__esModule = true;
exports.saveState = saveState;
exports.readState = readState;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _warning = require('warning');

var _warning2 = _interopRequireDefault(_warning);

var KeyPrefix = '@@History/';
var QuotaExceededErrors = ['QuotaExceededError', 'QUOTA_EXCEEDED_ERR'];

var SecurityError = 'SecurityError';

function createKey(key) {
  return KeyPrefix + key;
}

function saveState(key, state) {
  try {
    if (state == null) {
      window.sessionStorage.removeItem(createKey(key));
    } else {
      window.sessionStorage.setItem(createKey(key), JSON.stringify(state));
    }
  } catch (error) {
    if (error.name === SecurityError) {
      // Blocking cookies in Chrome/Firefox/Safari throws SecurityError on any
      // attempt to access window.sessionStorage.
      process.env.NODE_ENV !== 'production' ? _warning2['default'](false, '[history] Unable to save state; sessionStorage is not available due to security settings') : undefined;

      return;
    }

    if (QuotaExceededErrors.indexOf(error.name) >= 0 && window.sessionStorage.length === 0) {
      // Safari "private mode" throws QuotaExceededError.
      process.env.NODE_ENV !== 'production' ? _warning2['default'](false, '[history] Unable to save state; sessionStorage is not available in Safari private mode') : undefined;

      return;
    }

    throw error;
  }
}

function readState(key) {
  var json = undefined;
  try {
    json = window.sessionStorage.getItem(createKey(key));
  } catch (error) {
    if (error.name === SecurityError) {
      // Blocking cookies in Chrome/Firefox/Safari throws SecurityError on any
      // attempt to access window.sessionStorage.
      process.env.NODE_ENV !== 'production' ? _warning2['default'](false, '[history] Unable to read state; sessionStorage is not available due to security settings') : undefined;

      return null;
    }
  }

  if (json) {
    try {
      return JSON.parse(json);
    } catch (error) {
      // Ignore invalid JSON.
    }
  }

  return null;
}
}).call(this,require('_process'))

},{"_process":79,"warning":103}],41:[function(require,module,exports){
'use strict';

exports.__esModule = true;
exports.addEventListener = addEventListener;
exports.removeEventListener = removeEventListener;
exports.getHashPath = getHashPath;
exports.replaceHashPath = replaceHashPath;
exports.getWindowPath = getWindowPath;
exports.go = go;
exports.getUserConfirmation = getUserConfirmation;
exports.supportsHistory = supportsHistory;
exports.supportsGoWithoutReloadUsingHash = supportsGoWithoutReloadUsingHash;

function addEventListener(node, event, listener) {
  if (node.addEventListener) {
    node.addEventListener(event, listener, false);
  } else {
    node.attachEvent('on' + event, listener);
  }
}

function removeEventListener(node, event, listener) {
  if (node.removeEventListener) {
    node.removeEventListener(event, listener, false);
  } else {
    node.detachEvent('on' + event, listener);
  }
}

function getHashPath() {
  // We can't use window.location.hash here because it's not
  // consistent across browsers - Firefox will pre-decode it!
  return window.location.href.split('#')[1] || '';
}

function replaceHashPath(path) {
  window.location.replace(window.location.pathname + window.location.search + '#' + path);
}

function getWindowPath() {
  return window.location.pathname + window.location.search + window.location.hash;
}

function go(n) {
  if (n) window.history.go(n);
}

function getUserConfirmation(message, callback) {
  callback(window.confirm(message));
}

/**
 * Returns true if the HTML5 history API is supported. Taken from Modernizr.
 *
 * https://github.com/Modernizr/Modernizr/blob/master/LICENSE
 * https://github.com/Modernizr/Modernizr/blob/master/feature-detects/history.js
 * changed to avoid false negatives for Windows Phones: https://github.com/rackt/react-router/issues/586
 */

function supportsHistory() {
  var ua = navigator.userAgent;
  if ((ua.indexOf('Android 2.') !== -1 || ua.indexOf('Android 4.0') !== -1) && ua.indexOf('Mobile Safari') !== -1 && ua.indexOf('Chrome') === -1 && ua.indexOf('Windows Phone') === -1) {
    return false;
  }
  return window.history && 'pushState' in window.history;
}

/**
 * Returns false if using go(n) with hash history causes a full page reload.
 */

function supportsGoWithoutReloadUsingHash() {
  var ua = navigator.userAgent;
  return ua.indexOf('Firefox') === -1;
}
},{}],42:[function(require,module,exports){
'use strict';

exports.__esModule = true;
var canUseDOM = !!(typeof window !== 'undefined' && window.document && window.document.createElement);
exports.canUseDOM = canUseDOM;
},{}],43:[function(require,module,exports){
(function (process){
'use strict';

exports.__esModule = true;
exports.extractPath = extractPath;
exports.parsePath = parsePath;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _warning = require('warning');

var _warning2 = _interopRequireDefault(_warning);

function extractPath(string) {
  var match = string.match(/^https?:\/\/[^\/]*/);

  if (match == null) return string;

  return string.substring(match[0].length);
}

function parsePath(path) {
  var pathname = extractPath(path);
  var search = '';
  var hash = '';

  process.env.NODE_ENV !== 'production' ? _warning2['default'](path === pathname, 'A path must be pathname + search + hash only, not a fully qualified URL like "%s"', path) : undefined;

  var hashIndex = pathname.indexOf('#');
  if (hashIndex !== -1) {
    hash = pathname.substring(hashIndex);
    pathname = pathname.substring(0, hashIndex);
  }

  var searchIndex = pathname.indexOf('?');
  if (searchIndex !== -1) {
    search = pathname.substring(searchIndex);
    pathname = pathname.substring(0, searchIndex);
  }

  if (pathname === '') pathname = '/';

  return {
    pathname: pathname,
    search: search,
    hash: hash
  };
}
}).call(this,require('_process'))

},{"_process":79,"warning":103}],44:[function(require,module,exports){
(function (process){
'use strict';

exports.__esModule = true;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _invariant = require('invariant');

var _invariant2 = _interopRequireDefault(_invariant);

var _Actions = require('./Actions');

var _PathUtils = require('./PathUtils');

var _ExecutionEnvironment = require('./ExecutionEnvironment');

var _DOMUtils = require('./DOMUtils');

var _DOMStateStorage = require('./DOMStateStorage');

var _createDOMHistory = require('./createDOMHistory');

var _createDOMHistory2 = _interopRequireDefault(_createDOMHistory);

/**
 * Creates and returns a history object that uses HTML5's history API
 * (pushState, replaceState, and the popstate event) to manage history.
 * This is the recommended method of managing history in browsers because
 * it provides the cleanest URLs.
 *
 * Note: In browsers that do not support the HTML5 history API full
 * page reloads will be used to preserve URLs.
 */
function createBrowserHistory() {
  var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

  !_ExecutionEnvironment.canUseDOM ? process.env.NODE_ENV !== 'production' ? _invariant2['default'](false, 'Browser history needs a DOM') : _invariant2['default'](false) : undefined;

  var forceRefresh = options.forceRefresh;

  var isSupported = _DOMUtils.supportsHistory();
  var useRefresh = !isSupported || forceRefresh;

  function getCurrentLocation(historyState) {
    historyState = historyState || window.history.state || {};

    var path = _DOMUtils.getWindowPath();
    var _historyState = historyState;
    var key = _historyState.key;

    var state = undefined;
    if (key) {
      state = _DOMStateStorage.readState(key);
    } else {
      state = null;
      key = history.createKey();

      if (isSupported) window.history.replaceState(_extends({}, historyState, { key: key }), null);
    }

    var location = _PathUtils.parsePath(path);

    return history.createLocation(_extends({}, location, { state: state }), undefined, key);
  }

  function startPopStateListener(_ref) {
    var transitionTo = _ref.transitionTo;

    function popStateListener(event) {
      if (event.state === undefined) return; // Ignore extraneous popstate events in WebKit.

      transitionTo(getCurrentLocation(event.state));
    }

    _DOMUtils.addEventListener(window, 'popstate', popStateListener);

    return function () {
      _DOMUtils.removeEventListener(window, 'popstate', popStateListener);
    };
  }

  function finishTransition(location) {
    var basename = location.basename;
    var pathname = location.pathname;
    var search = location.search;
    var hash = location.hash;
    var state = location.state;
    var action = location.action;
    var key = location.key;

    if (action === _Actions.POP) return; // Nothing to do.

    _DOMStateStorage.saveState(key, state);

    var path = (basename || '') + pathname + search + hash;
    var historyState = {
      key: key
    };

    if (action === _Actions.PUSH) {
      if (useRefresh) {
        window.location.href = path;
        return false; // Prevent location update.
      } else {
          window.history.pushState(historyState, null, path);
        }
    } else {
      // REPLACE
      if (useRefresh) {
        window.location.replace(path);
        return false; // Prevent location update.
      } else {
          window.history.replaceState(historyState, null, path);
        }
    }
  }

  var history = _createDOMHistory2['default'](_extends({}, options, {
    getCurrentLocation: getCurrentLocation,
    finishTransition: finishTransition,
    saveState: _DOMStateStorage.saveState
  }));

  var listenerCount = 0,
      stopPopStateListener = undefined;

  function listenBefore(listener) {
    if (++listenerCount === 1) stopPopStateListener = startPopStateListener(history);

    var unlisten = history.listenBefore(listener);

    return function () {
      unlisten();

      if (--listenerCount === 0) stopPopStateListener();
    };
  }

  function listen(listener) {
    if (++listenerCount === 1) stopPopStateListener = startPopStateListener(history);

    var unlisten = history.listen(listener);

    return function () {
      unlisten();

      if (--listenerCount === 0) stopPopStateListener();
    };
  }

  // deprecated
  function registerTransitionHook(hook) {
    if (++listenerCount === 1) stopPopStateListener = startPopStateListener(history);

    history.registerTransitionHook(hook);
  }

  // deprecated
  function unregisterTransitionHook(hook) {
    history.unregisterTransitionHook(hook);

    if (--listenerCount === 0) stopPopStateListener();
  }

  return _extends({}, history, {
    listenBefore: listenBefore,
    listen: listen,
    registerTransitionHook: registerTransitionHook,
    unregisterTransitionHook: unregisterTransitionHook
  });
}

exports['default'] = createBrowserHistory;
module.exports = exports['default'];
}).call(this,require('_process'))

},{"./Actions":38,"./DOMStateStorage":40,"./DOMUtils":41,"./ExecutionEnvironment":42,"./PathUtils":43,"./createDOMHistory":45,"_process":79,"invariant":58}],45:[function(require,module,exports){
(function (process){
'use strict';

exports.__esModule = true;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _invariant = require('invariant');

var _invariant2 = _interopRequireDefault(_invariant);

var _ExecutionEnvironment = require('./ExecutionEnvironment');

var _DOMUtils = require('./DOMUtils');

var _createHistory = require('./createHistory');

var _createHistory2 = _interopRequireDefault(_createHistory);

function createDOMHistory(options) {
  var history = _createHistory2['default'](_extends({
    getUserConfirmation: _DOMUtils.getUserConfirmation
  }, options, {
    go: _DOMUtils.go
  }));

  function listen(listener) {
    !_ExecutionEnvironment.canUseDOM ? process.env.NODE_ENV !== 'production' ? _invariant2['default'](false, 'DOM history needs a DOM') : _invariant2['default'](false) : undefined;

    return history.listen(listener);
  }

  return _extends({}, history, {
    listen: listen
  });
}

exports['default'] = createDOMHistory;
module.exports = exports['default'];
}).call(this,require('_process'))

},{"./DOMUtils":41,"./ExecutionEnvironment":42,"./createHistory":47,"_process":79,"invariant":58}],46:[function(require,module,exports){
(function (process){
'use strict';

exports.__esModule = true;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _warning = require('warning');

var _warning2 = _interopRequireDefault(_warning);

var _invariant = require('invariant');

var _invariant2 = _interopRequireDefault(_invariant);

var _Actions = require('./Actions');

var _PathUtils = require('./PathUtils');

var _ExecutionEnvironment = require('./ExecutionEnvironment');

var _DOMUtils = require('./DOMUtils');

var _DOMStateStorage = require('./DOMStateStorage');

var _createDOMHistory = require('./createDOMHistory');

var _createDOMHistory2 = _interopRequireDefault(_createDOMHistory);

function isAbsolutePath(path) {
  return typeof path === 'string' && path.charAt(0) === '/';
}

function ensureSlash() {
  var path = _DOMUtils.getHashPath();

  if (isAbsolutePath(path)) return true;

  _DOMUtils.replaceHashPath('/' + path);

  return false;
}

function addQueryStringValueToPath(path, key, value) {
  return path + (path.indexOf('?') === -1 ? '?' : '&') + (key + '=' + value);
}

function stripQueryStringValueFromPath(path, key) {
  return path.replace(new RegExp('[?&]?' + key + '=[a-zA-Z0-9]+'), '');
}

function getQueryStringValueFromPath(path, key) {
  var match = path.match(new RegExp('\\?.*?\\b' + key + '=(.+?)\\b'));
  return match && match[1];
}

var DefaultQueryKey = '_k';

function createHashHistory() {
  var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

  !_ExecutionEnvironment.canUseDOM ? process.env.NODE_ENV !== 'production' ? _invariant2['default'](false, 'Hash history needs a DOM') : _invariant2['default'](false) : undefined;

  var queryKey = options.queryKey;

  if (queryKey === undefined || !!queryKey) queryKey = typeof queryKey === 'string' ? queryKey : DefaultQueryKey;

  function getCurrentLocation() {
    var path = _DOMUtils.getHashPath();

    var key = undefined,
        state = undefined;
    if (queryKey) {
      key = getQueryStringValueFromPath(path, queryKey);
      path = stripQueryStringValueFromPath(path, queryKey);

      if (key) {
        state = _DOMStateStorage.readState(key);
      } else {
        state = null;
        key = history.createKey();
        _DOMUtils.replaceHashPath(addQueryStringValueToPath(path, queryKey, key));
      }
    } else {
      key = state = null;
    }

    var location = _PathUtils.parsePath(path);

    return history.createLocation(_extends({}, location, { state: state }), undefined, key);
  }

  function startHashChangeListener(_ref) {
    var transitionTo = _ref.transitionTo;

    function hashChangeListener() {
      if (!ensureSlash()) return; // Always make sure hashes are preceeded with a /.

      transitionTo(getCurrentLocation());
    }

    ensureSlash();
    _DOMUtils.addEventListener(window, 'hashchange', hashChangeListener);

    return function () {
      _DOMUtils.removeEventListener(window, 'hashchange', hashChangeListener);
    };
  }

  function finishTransition(location) {
    var basename = location.basename;
    var pathname = location.pathname;
    var search = location.search;
    var state = location.state;
    var action = location.action;
    var key = location.key;

    if (action === _Actions.POP) return; // Nothing to do.

    var path = (basename || '') + pathname + search;

    if (queryKey) {
      path = addQueryStringValueToPath(path, queryKey, key);
      _DOMStateStorage.saveState(key, state);
    } else {
      // Drop key and state.
      location.key = location.state = null;
    }

    var currentHash = _DOMUtils.getHashPath();

    if (action === _Actions.PUSH) {
      if (currentHash !== path) {
        window.location.hash = path;
      } else {
        process.env.NODE_ENV !== 'production' ? _warning2['default'](false, 'You cannot PUSH the same path using hash history') : undefined;
      }
    } else if (currentHash !== path) {
      // REPLACE
      _DOMUtils.replaceHashPath(path);
    }
  }

  var history = _createDOMHistory2['default'](_extends({}, options, {
    getCurrentLocation: getCurrentLocation,
    finishTransition: finishTransition,
    saveState: _DOMStateStorage.saveState
  }));

  var listenerCount = 0,
      stopHashChangeListener = undefined;

  function listenBefore(listener) {
    if (++listenerCount === 1) stopHashChangeListener = startHashChangeListener(history);

    var unlisten = history.listenBefore(listener);

    return function () {
      unlisten();

      if (--listenerCount === 0) stopHashChangeListener();
    };
  }

  function listen(listener) {
    if (++listenerCount === 1) stopHashChangeListener = startHashChangeListener(history);

    var unlisten = history.listen(listener);

    return function () {
      unlisten();

      if (--listenerCount === 0) stopHashChangeListener();
    };
  }

  function push(location) {
    process.env.NODE_ENV !== 'production' ? _warning2['default'](queryKey || location.state == null, 'You cannot use state without a queryKey it will be dropped') : undefined;

    history.push(location);
  }

  function replace(location) {
    process.env.NODE_ENV !== 'production' ? _warning2['default'](queryKey || location.state == null, 'You cannot use state without a queryKey it will be dropped') : undefined;

    history.replace(location);
  }

  var goIsSupportedWithoutReload = _DOMUtils.supportsGoWithoutReloadUsingHash();

  function go(n) {
    process.env.NODE_ENV !== 'production' ? _warning2['default'](goIsSupportedWithoutReload, 'Hash history go(n) causes a full page reload in this browser') : undefined;

    history.go(n);
  }

  function createHref(path) {
    return '#' + history.createHref(path);
  }

  // deprecated
  function registerTransitionHook(hook) {
    if (++listenerCount === 1) stopHashChangeListener = startHashChangeListener(history);

    history.registerTransitionHook(hook);
  }

  // deprecated
  function unregisterTransitionHook(hook) {
    history.unregisterTransitionHook(hook);

    if (--listenerCount === 0) stopHashChangeListener();
  }

  // deprecated
  function pushState(state, path) {
    process.env.NODE_ENV !== 'production' ? _warning2['default'](queryKey || state == null, 'You cannot use state without a queryKey it will be dropped') : undefined;

    history.pushState(state, path);
  }

  // deprecated
  function replaceState(state, path) {
    process.env.NODE_ENV !== 'production' ? _warning2['default'](queryKey || state == null, 'You cannot use state without a queryKey it will be dropped') : undefined;

    history.replaceState(state, path);
  }

  return _extends({}, history, {
    listenBefore: listenBefore,
    listen: listen,
    push: push,
    replace: replace,
    go: go,
    createHref: createHref,

    registerTransitionHook: registerTransitionHook, // deprecated - warning is in createHistory
    unregisterTransitionHook: unregisterTransitionHook, // deprecated - warning is in createHistory
    pushState: pushState, // deprecated - warning is in createHistory
    replaceState: replaceState // deprecated - warning is in createHistory
  });
}

exports['default'] = createHashHistory;
module.exports = exports['default'];
}).call(this,require('_process'))

},{"./Actions":38,"./DOMStateStorage":40,"./DOMUtils":41,"./ExecutionEnvironment":42,"./PathUtils":43,"./createDOMHistory":45,"_process":79,"invariant":58,"warning":103}],47:[function(require,module,exports){
(function (process){
'use strict';

exports.__esModule = true;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _warning = require('warning');

var _warning2 = _interopRequireDefault(_warning);

var _deepEqual = require('deep-equal');

var _deepEqual2 = _interopRequireDefault(_deepEqual);

var _PathUtils = require('./PathUtils');

var _AsyncUtils = require('./AsyncUtils');

var _Actions = require('./Actions');

var _createLocation2 = require('./createLocation');

var _createLocation3 = _interopRequireDefault(_createLocation2);

var _runTransitionHook = require('./runTransitionHook');

var _runTransitionHook2 = _interopRequireDefault(_runTransitionHook);

var _deprecate = require('./deprecate');

var _deprecate2 = _interopRequireDefault(_deprecate);

function createRandomKey(length) {
  return Math.random().toString(36).substr(2, length);
}

function locationsAreEqual(a, b) {
  return a.pathname === b.pathname && a.search === b.search &&
  //a.action === b.action && // Different action !== location change.
  a.key === b.key && _deepEqual2['default'](a.state, b.state);
}

var DefaultKeyLength = 6;

function createHistory() {
  var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];
  var getCurrentLocation = options.getCurrentLocation;
  var finishTransition = options.finishTransition;
  var saveState = options.saveState;
  var go = options.go;
  var getUserConfirmation = options.getUserConfirmation;
  var keyLength = options.keyLength;

  if (typeof keyLength !== 'number') keyLength = DefaultKeyLength;

  var transitionHooks = [];

  function listenBefore(hook) {
    transitionHooks.push(hook);

    return function () {
      transitionHooks = transitionHooks.filter(function (item) {
        return item !== hook;
      });
    };
  }

  var allKeys = [];
  var changeListeners = [];
  var location = undefined;

  function getCurrent() {
    if (pendingLocation && pendingLocation.action === _Actions.POP) {
      return allKeys.indexOf(pendingLocation.key);
    } else if (location) {
      return allKeys.indexOf(location.key);
    } else {
      return -1;
    }
  }

  function updateLocation(newLocation) {
    var current = getCurrent();

    location = newLocation;

    if (location.action === _Actions.PUSH) {
      allKeys = [].concat(allKeys.slice(0, current + 1), [location.key]);
    } else if (location.action === _Actions.REPLACE) {
      allKeys[current] = location.key;
    }

    changeListeners.forEach(function (listener) {
      listener(location);
    });
  }

  function listen(listener) {
    changeListeners.push(listener);

    if (location) {
      listener(location);
    } else {
      var _location = getCurrentLocation();
      allKeys = [_location.key];
      updateLocation(_location);
    }

    return function () {
      changeListeners = changeListeners.filter(function (item) {
        return item !== listener;
      });
    };
  }

  function confirmTransitionTo(location, callback) {
    _AsyncUtils.loopAsync(transitionHooks.length, function (index, next, done) {
      _runTransitionHook2['default'](transitionHooks[index], location, function (result) {
        if (result != null) {
          done(result);
        } else {
          next();
        }
      });
    }, function (message) {
      if (getUserConfirmation && typeof message === 'string') {
        getUserConfirmation(message, function (ok) {
          callback(ok !== false);
        });
      } else {
        callback(message !== false);
      }
    });
  }

  var pendingLocation = undefined;

  function transitionTo(nextLocation) {
    if (location && locationsAreEqual(location, nextLocation)) return; // Nothing to do.

    pendingLocation = nextLocation;

    confirmTransitionTo(nextLocation, function (ok) {
      if (pendingLocation !== nextLocation) return; // Transition was interrupted.

      if (ok) {
        // treat PUSH to current path like REPLACE to be consistent with browsers
        if (nextLocation.action === _Actions.PUSH) {
          var prevPath = createPath(location);
          var nextPath = createPath(nextLocation);

          if (nextPath === prevPath && _deepEqual2['default'](location.state, nextLocation.state)) nextLocation.action = _Actions.REPLACE;
        }

        if (finishTransition(nextLocation) !== false) updateLocation(nextLocation);
      } else if (location && nextLocation.action === _Actions.POP) {
        var prevIndex = allKeys.indexOf(location.key);
        var nextIndex = allKeys.indexOf(nextLocation.key);

        if (prevIndex !== -1 && nextIndex !== -1) go(prevIndex - nextIndex); // Restore the URL.
      }
    });
  }

  function push(location) {
    transitionTo(createLocation(location, _Actions.PUSH, createKey()));
  }

  function replace(location) {
    transitionTo(createLocation(location, _Actions.REPLACE, createKey()));
  }

  function goBack() {
    go(-1);
  }

  function goForward() {
    go(1);
  }

  function createKey() {
    return createRandomKey(keyLength);
  }

  function createPath(location) {
    if (location == null || typeof location === 'string') return location;

    var pathname = location.pathname;
    var search = location.search;
    var hash = location.hash;

    var result = pathname;

    if (search) result += search;

    if (hash) result += hash;

    return result;
  }

  function createHref(location) {
    return createPath(location);
  }

  function createLocation(location, action) {
    var key = arguments.length <= 2 || arguments[2] === undefined ? createKey() : arguments[2];

    if (typeof action === 'object') {
      process.env.NODE_ENV !== 'production' ? _warning2['default'](false, 'The state (2nd) argument to history.createLocation is deprecated; use a ' + 'location descriptor instead') : undefined;

      if (typeof location === 'string') location = _PathUtils.parsePath(location);

      location = _extends({}, location, { state: action });

      action = key;
      key = arguments[3] || createKey();
    }

    return _createLocation3['default'](location, action, key);
  }

  // deprecated
  function setState(state) {
    if (location) {
      updateLocationState(location, state);
      updateLocation(location);
    } else {
      updateLocationState(getCurrentLocation(), state);
    }
  }

  function updateLocationState(location, state) {
    location.state = _extends({}, location.state, state);
    saveState(location.key, location.state);
  }

  // deprecated
  function registerTransitionHook(hook) {
    if (transitionHooks.indexOf(hook) === -1) transitionHooks.push(hook);
  }

  // deprecated
  function unregisterTransitionHook(hook) {
    transitionHooks = transitionHooks.filter(function (item) {
      return item !== hook;
    });
  }

  // deprecated
  function pushState(state, path) {
    if (typeof path === 'string') path = _PathUtils.parsePath(path);

    push(_extends({ state: state }, path));
  }

  // deprecated
  function replaceState(state, path) {
    if (typeof path === 'string') path = _PathUtils.parsePath(path);

    replace(_extends({ state: state }, path));
  }

  return {
    listenBefore: listenBefore,
    listen: listen,
    transitionTo: transitionTo,
    push: push,
    replace: replace,
    go: go,
    goBack: goBack,
    goForward: goForward,
    createKey: createKey,
    createPath: createPath,
    createHref: createHref,
    createLocation: createLocation,

    setState: _deprecate2['default'](setState, 'setState is deprecated; use location.key to save state instead'),
    registerTransitionHook: _deprecate2['default'](registerTransitionHook, 'registerTransitionHook is deprecated; use listenBefore instead'),
    unregisterTransitionHook: _deprecate2['default'](unregisterTransitionHook, 'unregisterTransitionHook is deprecated; use the callback returned from listenBefore instead'),
    pushState: _deprecate2['default'](pushState, 'pushState is deprecated; use push instead'),
    replaceState: _deprecate2['default'](replaceState, 'replaceState is deprecated; use replace instead')
  };
}

exports['default'] = createHistory;
module.exports = exports['default'];
}).call(this,require('_process'))

},{"./Actions":38,"./AsyncUtils":39,"./PathUtils":43,"./createLocation":48,"./deprecate":50,"./runTransitionHook":54,"_process":79,"deep-equal":35,"warning":103}],48:[function(require,module,exports){
(function (process){
'use strict';

exports.__esModule = true;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _warning = require('warning');

var _warning2 = _interopRequireDefault(_warning);

var _Actions = require('./Actions');

var _PathUtils = require('./PathUtils');

function createLocation() {
  var location = arguments.length <= 0 || arguments[0] === undefined ? '/' : arguments[0];
  var action = arguments.length <= 1 || arguments[1] === undefined ? _Actions.POP : arguments[1];
  var key = arguments.length <= 2 || arguments[2] === undefined ? null : arguments[2];

  var _fourthArg = arguments.length <= 3 || arguments[3] === undefined ? null : arguments[3];

  if (typeof location === 'string') location = _PathUtils.parsePath(location);

  if (typeof action === 'object') {
    process.env.NODE_ENV !== 'production' ? _warning2['default'](false, 'The state (2nd) argument to createLocation is deprecated; use a ' + 'location descriptor instead') : undefined;

    location = _extends({}, location, { state: action });

    action = key || _Actions.POP;
    key = _fourthArg;
  }

  var pathname = location.pathname || '/';
  var search = location.search || '';
  var hash = location.hash || '';
  var state = location.state || null;

  return {
    pathname: pathname,
    search: search,
    hash: hash,
    state: state,
    action: action,
    key: key
  };
}

exports['default'] = createLocation;
module.exports = exports['default'];
}).call(this,require('_process'))

},{"./Actions":38,"./PathUtils":43,"_process":79,"warning":103}],49:[function(require,module,exports){
(function (process){
'use strict';

exports.__esModule = true;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _warning = require('warning');

var _warning2 = _interopRequireDefault(_warning);

var _invariant = require('invariant');

var _invariant2 = _interopRequireDefault(_invariant);

var _PathUtils = require('./PathUtils');

var _Actions = require('./Actions');

var _createHistory = require('./createHistory');

var _createHistory2 = _interopRequireDefault(_createHistory);

function createStateStorage(entries) {
  return entries.filter(function (entry) {
    return entry.state;
  }).reduce(function (memo, entry) {
    memo[entry.key] = entry.state;
    return memo;
  }, {});
}

function createMemoryHistory() {
  var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

  if (Array.isArray(options)) {
    options = { entries: options };
  } else if (typeof options === 'string') {
    options = { entries: [options] };
  }

  var history = _createHistory2['default'](_extends({}, options, {
    getCurrentLocation: getCurrentLocation,
    finishTransition: finishTransition,
    saveState: saveState,
    go: go
  }));

  var _options = options;
  var entries = _options.entries;
  var current = _options.current;

  if (typeof entries === 'string') {
    entries = [entries];
  } else if (!Array.isArray(entries)) {
    entries = ['/'];
  }

  entries = entries.map(function (entry) {
    var key = history.createKey();

    if (typeof entry === 'string') return { pathname: entry, key: key };

    if (typeof entry === 'object' && entry) return _extends({}, entry, { key: key });

    !false ? process.env.NODE_ENV !== 'production' ? _invariant2['default'](false, 'Unable to create history entry from %s', entry) : _invariant2['default'](false) : undefined;
  });

  if (current == null) {
    current = entries.length - 1;
  } else {
    !(current >= 0 && current < entries.length) ? process.env.NODE_ENV !== 'production' ? _invariant2['default'](false, 'Current index must be >= 0 and < %s, was %s', entries.length, current) : _invariant2['default'](false) : undefined;
  }

  var storage = createStateStorage(entries);

  function saveState(key, state) {
    storage[key] = state;
  }

  function readState(key) {
    return storage[key];
  }

  function getCurrentLocation() {
    var entry = entries[current];
    var basename = entry.basename;
    var pathname = entry.pathname;
    var search = entry.search;

    var path = (basename || '') + pathname + (search || '');

    var key = undefined,
        state = undefined;
    if (entry.key) {
      key = entry.key;
      state = readState(key);
    } else {
      key = history.createKey();
      state = null;
      entry.key = key;
    }

    var location = _PathUtils.parsePath(path);

    return history.createLocation(_extends({}, location, { state: state }), undefined, key);
  }

  function canGo(n) {
    var index = current + n;
    return index >= 0 && index < entries.length;
  }

  function go(n) {
    if (n) {
      if (!canGo(n)) {
        process.env.NODE_ENV !== 'production' ? _warning2['default'](false, 'Cannot go(%s) there is not enough history', n) : undefined;
        return;
      }

      current += n;

      var currentLocation = getCurrentLocation();

      // change action to POP
      history.transitionTo(_extends({}, currentLocation, { action: _Actions.POP }));
    }
  }

  function finishTransition(location) {
    switch (location.action) {
      case _Actions.PUSH:
        current += 1;

        // if we are not on the top of stack
        // remove rest and push new
        if (current < entries.length) entries.splice(current);

        entries.push(location);
        saveState(location.key, location.state);
        break;
      case _Actions.REPLACE:
        entries[current] = location;
        saveState(location.key, location.state);
        break;
    }
  }

  return history;
}

exports['default'] = createMemoryHistory;
module.exports = exports['default'];
}).call(this,require('_process'))

},{"./Actions":38,"./PathUtils":43,"./createHistory":47,"_process":79,"invariant":58,"warning":103}],50:[function(require,module,exports){
(function (process){
'use strict';

exports.__esModule = true;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _warning = require('warning');

var _warning2 = _interopRequireDefault(_warning);

function deprecate(fn, message) {
  return function () {
    process.env.NODE_ENV !== 'production' ? _warning2['default'](false, '[history] ' + message) : undefined;
    return fn.apply(this, arguments);
  };
}

exports['default'] = deprecate;
module.exports = exports['default'];
}).call(this,require('_process'))

},{"_process":79,"warning":103}],51:[function(require,module,exports){
'use strict';

exports.__esModule = true;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _deprecate = require('./deprecate');

var _deprecate2 = _interopRequireDefault(_deprecate);

var _useBeforeUnload = require('./useBeforeUnload');

var _useBeforeUnload2 = _interopRequireDefault(_useBeforeUnload);

exports['default'] = _deprecate2['default'](_useBeforeUnload2['default'], 'enableBeforeUnload is deprecated, use useBeforeUnload instead');
module.exports = exports['default'];
},{"./deprecate":50,"./useBeforeUnload":56}],52:[function(require,module,exports){
'use strict';

exports.__esModule = true;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _deprecate = require('./deprecate');

var _deprecate2 = _interopRequireDefault(_deprecate);

var _useQueries = require('./useQueries');

var _useQueries2 = _interopRequireDefault(_useQueries);

exports['default'] = _deprecate2['default'](_useQueries2['default'], 'enableQueries is deprecated, use useQueries instead');
module.exports = exports['default'];
},{"./deprecate":50,"./useQueries":57}],53:[function(require,module,exports){
'use strict';

exports.__esModule = true;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _deprecate = require('./deprecate');

var _deprecate2 = _interopRequireDefault(_deprecate);

var _createLocation2 = require('./createLocation');

var _createLocation3 = _interopRequireDefault(_createLocation2);

var _createBrowserHistory = require('./createBrowserHistory');

var _createBrowserHistory2 = _interopRequireDefault(_createBrowserHistory);

exports.createHistory = _createBrowserHistory2['default'];

var _createHashHistory2 = require('./createHashHistory');

var _createHashHistory3 = _interopRequireDefault(_createHashHistory2);

exports.createHashHistory = _createHashHistory3['default'];

var _createMemoryHistory2 = require('./createMemoryHistory');

var _createMemoryHistory3 = _interopRequireDefault(_createMemoryHistory2);

exports.createMemoryHistory = _createMemoryHistory3['default'];

var _useBasename2 = require('./useBasename');

var _useBasename3 = _interopRequireDefault(_useBasename2);

exports.useBasename = _useBasename3['default'];

var _useBeforeUnload2 = require('./useBeforeUnload');

var _useBeforeUnload3 = _interopRequireDefault(_useBeforeUnload2);

exports.useBeforeUnload = _useBeforeUnload3['default'];

var _useQueries2 = require('./useQueries');

var _useQueries3 = _interopRequireDefault(_useQueries2);

exports.useQueries = _useQueries3['default'];

var _Actions2 = require('./Actions');

var _Actions3 = _interopRequireDefault(_Actions2);

exports.Actions = _Actions3['default'];

// deprecated

var _enableBeforeUnload2 = require('./enableBeforeUnload');

var _enableBeforeUnload3 = _interopRequireDefault(_enableBeforeUnload2);

exports.enableBeforeUnload = _enableBeforeUnload3['default'];

var _enableQueries2 = require('./enableQueries');

var _enableQueries3 = _interopRequireDefault(_enableQueries2);

exports.enableQueries = _enableQueries3['default'];
var createLocation = _deprecate2['default'](_createLocation3['default'], 'Using createLocation without a history instance is deprecated; please use history.createLocation instead');
exports.createLocation = createLocation;
},{"./Actions":38,"./createBrowserHistory":44,"./createHashHistory":46,"./createLocation":48,"./createMemoryHistory":49,"./deprecate":50,"./enableBeforeUnload":51,"./enableQueries":52,"./useBasename":55,"./useBeforeUnload":56,"./useQueries":57}],54:[function(require,module,exports){
(function (process){
'use strict';

exports.__esModule = true;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _warning = require('warning');

var _warning2 = _interopRequireDefault(_warning);

function runTransitionHook(hook, location, callback) {
  var result = hook(location, callback);

  if (hook.length < 2) {
    // Assume the hook runs synchronously and automatically
    // call the callback with the return value.
    callback(result);
  } else {
    process.env.NODE_ENV !== 'production' ? _warning2['default'](result === undefined, 'You should not "return" in a transition hook with a callback argument; call the callback instead') : undefined;
  }
}

exports['default'] = runTransitionHook;
module.exports = exports['default'];
}).call(this,require('_process'))

},{"_process":79,"warning":103}],55:[function(require,module,exports){
(function (process){
'use strict';

exports.__esModule = true;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _warning = require('warning');

var _warning2 = _interopRequireDefault(_warning);

var _ExecutionEnvironment = require('./ExecutionEnvironment');

var _PathUtils = require('./PathUtils');

var _runTransitionHook = require('./runTransitionHook');

var _runTransitionHook2 = _interopRequireDefault(_runTransitionHook);

var _deprecate = require('./deprecate');

var _deprecate2 = _interopRequireDefault(_deprecate);

function useBasename(createHistory) {
  return function () {
    var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

    var history = createHistory(options);

    var basename = options.basename;

    var checkedBaseHref = false;

    function checkBaseHref() {
      if (checkedBaseHref) {
        return;
      }

      // Automatically use the value of <base href> in HTML
      // documents as basename if it's not explicitly given.
      if (basename == null && _ExecutionEnvironment.canUseDOM) {
        var base = document.getElementsByTagName('base')[0];
        var baseHref = base && base.getAttribute('href');

        if (baseHref != null) {
          basename = baseHref;

          process.env.NODE_ENV !== 'production' ? _warning2['default'](false, 'Automatically setting basename using <base href> is deprecated and will ' + 'be removed in the next major release. The semantics of <base href> are ' + 'subtly different from basename. Please pass the basename explicitly in ' + 'the options to createHistory') : undefined;
        }
      }

      checkedBaseHref = true;
    }

    function addBasename(location) {
      checkBaseHref();

      if (basename && location.basename == null) {
        if (location.pathname.indexOf(basename) === 0) {
          location.pathname = location.pathname.substring(basename.length);
          location.basename = basename;

          if (location.pathname === '') location.pathname = '/';
        } else {
          location.basename = '';
        }
      }

      return location;
    }

    function prependBasename(location) {
      checkBaseHref();

      if (!basename) return location;

      if (typeof location === 'string') location = _PathUtils.parsePath(location);

      var pname = location.pathname;
      var normalizedBasename = basename.slice(-1) === '/' ? basename : basename + '/';
      var normalizedPathname = pname.charAt(0) === '/' ? pname.slice(1) : pname;
      var pathname = normalizedBasename + normalizedPathname;

      return _extends({}, location, {
        pathname: pathname
      });
    }

    // Override all read methods with basename-aware versions.
    function listenBefore(hook) {
      return history.listenBefore(function (location, callback) {
        _runTransitionHook2['default'](hook, addBasename(location), callback);
      });
    }

    function listen(listener) {
      return history.listen(function (location) {
        listener(addBasename(location));
      });
    }

    // Override all write methods with basename-aware versions.
    function push(location) {
      history.push(prependBasename(location));
    }

    function replace(location) {
      history.replace(prependBasename(location));
    }

    function createPath(location) {
      return history.createPath(prependBasename(location));
    }

    function createHref(location) {
      return history.createHref(prependBasename(location));
    }

    function createLocation(location) {
      for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        args[_key - 1] = arguments[_key];
      }

      return addBasename(history.createLocation.apply(history, [prependBasename(location)].concat(args)));
    }

    // deprecated
    function pushState(state, path) {
      if (typeof path === 'string') path = _PathUtils.parsePath(path);

      push(_extends({ state: state }, path));
    }

    // deprecated
    function replaceState(state, path) {
      if (typeof path === 'string') path = _PathUtils.parsePath(path);

      replace(_extends({ state: state }, path));
    }

    return _extends({}, history, {
      listenBefore: listenBefore,
      listen: listen,
      push: push,
      replace: replace,
      createPath: createPath,
      createHref: createHref,
      createLocation: createLocation,

      pushState: _deprecate2['default'](pushState, 'pushState is deprecated; use push instead'),
      replaceState: _deprecate2['default'](replaceState, 'replaceState is deprecated; use replace instead')
    });
  };
}

exports['default'] = useBasename;
module.exports = exports['default'];
}).call(this,require('_process'))

},{"./ExecutionEnvironment":42,"./PathUtils":43,"./deprecate":50,"./runTransitionHook":54,"_process":79,"warning":103}],56:[function(require,module,exports){
(function (process){
'use strict';

exports.__esModule = true;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _warning = require('warning');

var _warning2 = _interopRequireDefault(_warning);

var _ExecutionEnvironment = require('./ExecutionEnvironment');

var _DOMUtils = require('./DOMUtils');

var _deprecate = require('./deprecate');

var _deprecate2 = _interopRequireDefault(_deprecate);

function startBeforeUnloadListener(getBeforeUnloadPromptMessage) {
  function listener(event) {
    var message = getBeforeUnloadPromptMessage();

    if (typeof message === 'string') {
      (event || window.event).returnValue = message;
      return message;
    }
  }

  _DOMUtils.addEventListener(window, 'beforeunload', listener);

  return function () {
    _DOMUtils.removeEventListener(window, 'beforeunload', listener);
  };
}

/**
 * Returns a new createHistory function that can be used to create
 * history objects that know how to use the beforeunload event in web
 * browsers to cancel navigation.
 */
function useBeforeUnload(createHistory) {
  return function (options) {
    var history = createHistory(options);

    var stopBeforeUnloadListener = undefined;
    var beforeUnloadHooks = [];

    function getBeforeUnloadPromptMessage() {
      var message = undefined;

      for (var i = 0, len = beforeUnloadHooks.length; message == null && i < len; ++i) {
        message = beforeUnloadHooks[i].call();
      }return message;
    }

    function listenBeforeUnload(hook) {
      beforeUnloadHooks.push(hook);

      if (beforeUnloadHooks.length === 1) {
        if (_ExecutionEnvironment.canUseDOM) {
          stopBeforeUnloadListener = startBeforeUnloadListener(getBeforeUnloadPromptMessage);
        } else {
          process.env.NODE_ENV !== 'production' ? _warning2['default'](false, 'listenBeforeUnload only works in DOM environments') : undefined;
        }
      }

      return function () {
        beforeUnloadHooks = beforeUnloadHooks.filter(function (item) {
          return item !== hook;
        });

        if (beforeUnloadHooks.length === 0 && stopBeforeUnloadListener) {
          stopBeforeUnloadListener();
          stopBeforeUnloadListener = null;
        }
      };
    }

    // deprecated
    function registerBeforeUnloadHook(hook) {
      if (_ExecutionEnvironment.canUseDOM && beforeUnloadHooks.indexOf(hook) === -1) {
        beforeUnloadHooks.push(hook);

        if (beforeUnloadHooks.length === 1) stopBeforeUnloadListener = startBeforeUnloadListener(getBeforeUnloadPromptMessage);
      }
    }

    // deprecated
    function unregisterBeforeUnloadHook(hook) {
      if (beforeUnloadHooks.length > 0) {
        beforeUnloadHooks = beforeUnloadHooks.filter(function (item) {
          return item !== hook;
        });

        if (beforeUnloadHooks.length === 0) stopBeforeUnloadListener();
      }
    }

    return _extends({}, history, {
      listenBeforeUnload: listenBeforeUnload,

      registerBeforeUnloadHook: _deprecate2['default'](registerBeforeUnloadHook, 'registerBeforeUnloadHook is deprecated; use listenBeforeUnload instead'),
      unregisterBeforeUnloadHook: _deprecate2['default'](unregisterBeforeUnloadHook, 'unregisterBeforeUnloadHook is deprecated; use the callback returned from listenBeforeUnload instead')
    });
  };
}

exports['default'] = useBeforeUnload;
module.exports = exports['default'];
}).call(this,require('_process'))

},{"./DOMUtils":41,"./ExecutionEnvironment":42,"./deprecate":50,"_process":79,"warning":103}],57:[function(require,module,exports){
(function (process){
'use strict';

exports.__esModule = true;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _warning = require('warning');

var _warning2 = _interopRequireDefault(_warning);

var _queryString = require('query-string');

var _runTransitionHook = require('./runTransitionHook');

var _runTransitionHook2 = _interopRequireDefault(_runTransitionHook);

var _PathUtils = require('./PathUtils');

var _deprecate = require('./deprecate');

var _deprecate2 = _interopRequireDefault(_deprecate);

var SEARCH_BASE_KEY = '$searchBase';

function defaultStringifyQuery(query) {
  return _queryString.stringify(query).replace(/%20/g, '+');
}

var defaultParseQueryString = _queryString.parse;

function isNestedObject(object) {
  for (var p in object) {
    if (Object.prototype.hasOwnProperty.call(object, p) && typeof object[p] === 'object' && !Array.isArray(object[p]) && object[p] !== null) return true;
  }return false;
}

/**
 * Returns a new createHistory function that may be used to create
 * history objects that know how to handle URL queries.
 */
function useQueries(createHistory) {
  return function () {
    var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

    var history = createHistory(options);

    var stringifyQuery = options.stringifyQuery;
    var parseQueryString = options.parseQueryString;

    if (typeof stringifyQuery !== 'function') stringifyQuery = defaultStringifyQuery;

    if (typeof parseQueryString !== 'function') parseQueryString = defaultParseQueryString;

    function addQuery(location) {
      if (location.query == null) {
        var search = location.search;

        location.query = parseQueryString(search.substring(1));
        location[SEARCH_BASE_KEY] = { search: search, searchBase: '' };
      }

      // TODO: Instead of all the book-keeping here, this should just strip the
      // stringified query from the search.

      return location;
    }

    function appendQuery(location, query) {
      var _extends2;

      var searchBaseSpec = location[SEARCH_BASE_KEY];
      var queryString = query ? stringifyQuery(query) : '';
      if (!searchBaseSpec && !queryString) {
        return location;
      }

      process.env.NODE_ENV !== 'production' ? _warning2['default'](stringifyQuery !== defaultStringifyQuery || !isNestedObject(query), 'useQueries does not stringify nested query objects by default; ' + 'use a custom stringifyQuery function') : undefined;

      if (typeof location === 'string') location = _PathUtils.parsePath(location);

      var searchBase = undefined;
      if (searchBaseSpec && location.search === searchBaseSpec.search) {
        searchBase = searchBaseSpec.searchBase;
      } else {
        searchBase = location.search || '';
      }

      var search = searchBase;
      if (queryString) {
        search += (search ? '&' : '?') + queryString;
      }

      return _extends({}, location, (_extends2 = {
        search: search
      }, _extends2[SEARCH_BASE_KEY] = { search: search, searchBase: searchBase }, _extends2));
    }

    // Override all read methods with query-aware versions.
    function listenBefore(hook) {
      return history.listenBefore(function (location, callback) {
        _runTransitionHook2['default'](hook, addQuery(location), callback);
      });
    }

    function listen(listener) {
      return history.listen(function (location) {
        listener(addQuery(location));
      });
    }

    // Override all write methods with query-aware versions.
    function push(location) {
      history.push(appendQuery(location, location.query));
    }

    function replace(location) {
      history.replace(appendQuery(location, location.query));
    }

    function createPath(location, query) {
      process.env.NODE_ENV !== 'production' ? _warning2['default'](!query, 'the query argument to createPath is deprecated; use a location descriptor instead') : undefined;

      return history.createPath(appendQuery(location, query || location.query));
    }

    function createHref(location, query) {
      process.env.NODE_ENV !== 'production' ? _warning2['default'](!query, 'the query argument to createHref is deprecated; use a location descriptor instead') : undefined;

      return history.createHref(appendQuery(location, query || location.query));
    }

    function createLocation(location) {
      for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        args[_key - 1] = arguments[_key];
      }

      var fullLocation = history.createLocation.apply(history, [appendQuery(location, location.query)].concat(args));
      if (location.query) {
        fullLocation.query = location.query;
      }
      return addQuery(fullLocation);
    }

    // deprecated
    function pushState(state, path, query) {
      if (typeof path === 'string') path = _PathUtils.parsePath(path);

      push(_extends({ state: state }, path, { query: query }));
    }

    // deprecated
    function replaceState(state, path, query) {
      if (typeof path === 'string') path = _PathUtils.parsePath(path);

      replace(_extends({ state: state }, path, { query: query }));
    }

    return _extends({}, history, {
      listenBefore: listenBefore,
      listen: listen,
      push: push,
      replace: replace,
      createPath: createPath,
      createHref: createHref,
      createLocation: createLocation,

      pushState: _deprecate2['default'](pushState, 'pushState is deprecated; use push instead'),
      replaceState: _deprecate2['default'](replaceState, 'replaceState is deprecated; use replace instead')
    });
  };
}

exports['default'] = useQueries;
module.exports = exports['default'];
}).call(this,require('_process'))

},{"./PathUtils":43,"./deprecate":50,"./runTransitionHook":54,"_process":79,"query-string":80,"warning":103}],58:[function(require,module,exports){
(function (process){
/**
 * Copyright 2013-2015, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

'use strict';

/**
 * Use invariant() to assert state which your program assumes to be true.
 *
 * Provide sprintf-style format (only %s is supported) and arguments
 * to provide information about what broke and what you were
 * expecting.
 *
 * The invariant message will be stripped in production, but the invariant
 * will remain to ensure logic does not differ in production.
 */

var invariant = function(condition, format, a, b, c, d, e, f) {
  if (process.env.NODE_ENV !== 'production') {
    if (format === undefined) {
      throw new Error('invariant requires an error message argument');
    }
  }

  if (!condition) {
    var error;
    if (format === undefined) {
      error = new Error(
        'Minified exception occurred; use the non-minified dev environment ' +
        'for the full error message and additional helpful warnings.'
      );
    } else {
      var args = [a, b, c, d, e, f];
      var argIndex = 0;
      error = new Error(
        format.replace(/%s/g, function() { return args[argIndex++]; })
      );
      error.name = 'Invariant Violation';
    }

    error.framesToPop = 1; // we don't care about invariant's own frame
    throw error;
  }
};

module.exports = invariant;

}).call(this,require('_process'))

},{"_process":79}],59:[function(require,module,exports){
/**
 * lodash 3.1.4 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */
var isArguments = require('lodash.isarguments'),
    isArray = require('lodash.isarray');

/**
 * Checks if `value` is object-like.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 */
function isObjectLike(value) {
  return !!value && typeof value == 'object';
}

/**
 * Used as the [maximum length](http://ecma-international.org/ecma-262/6.0/#sec-number.max_safe_integer)
 * of an array-like value.
 */
var MAX_SAFE_INTEGER = 9007199254740991;

/**
 * Appends the elements of `values` to `array`.
 *
 * @private
 * @param {Array} array The array to modify.
 * @param {Array} values The values to append.
 * @returns {Array} Returns `array`.
 */
function arrayPush(array, values) {
  var index = -1,
      length = values.length,
      offset = array.length;

  while (++index < length) {
    array[offset + index] = values[index];
  }
  return array;
}

/**
 * The base implementation of `_.flatten` with added support for restricting
 * flattening and specifying the start index.
 *
 * @private
 * @param {Array} array The array to flatten.
 * @param {boolean} [isDeep] Specify a deep flatten.
 * @param {boolean} [isStrict] Restrict flattening to arrays-like objects.
 * @param {Array} [result=[]] The initial result value.
 * @returns {Array} Returns the new flattened array.
 */
function baseFlatten(array, isDeep, isStrict, result) {
  result || (result = []);

  var index = -1,
      length = array.length;

  while (++index < length) {
    var value = array[index];
    if (isObjectLike(value) && isArrayLike(value) &&
        (isStrict || isArray(value) || isArguments(value))) {
      if (isDeep) {
        // Recursively flatten arrays (susceptible to call stack limits).
        baseFlatten(value, isDeep, isStrict, result);
      } else {
        arrayPush(result, value);
      }
    } else if (!isStrict) {
      result[result.length] = value;
    }
  }
  return result;
}

/**
 * The base implementation of `_.property` without support for deep paths.
 *
 * @private
 * @param {string} key The key of the property to get.
 * @returns {Function} Returns the new function.
 */
function baseProperty(key) {
  return function(object) {
    return object == null ? undefined : object[key];
  };
}

/**
 * Gets the "length" property value of `object`.
 *
 * **Note:** This function is used to avoid a [JIT bug](https://bugs.webkit.org/show_bug.cgi?id=142792)
 * that affects Safari on at least iOS 8.1-8.3 ARM64.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {*} Returns the "length" value.
 */
var getLength = baseProperty('length');

/**
 * Checks if `value` is array-like.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is array-like, else `false`.
 */
function isArrayLike(value) {
  return value != null && isLength(getLength(value));
}

/**
 * Checks if `value` is a valid array-like length.
 *
 * **Note:** This function is based on [`ToLength`](http://ecma-international.org/ecma-262/6.0/#sec-tolength).
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a valid length, else `false`.
 */
function isLength(value) {
  return typeof value == 'number' && value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
}

module.exports = baseFlatten;

},{"lodash.isarguments":71,"lodash.isarray":72}],60:[function(require,module,exports){
/**
 * lodash 3.0.3 (Custom Build) <https://lodash.com/>
 * Build: `lodash modularize exports="npm" -o ./`
 * Copyright 2012-2016 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2016 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */

/**
 * The base implementation of `baseForIn` and `baseForOwn` which iterates
 * over `object` properties returned by `keysFunc` invoking `iteratee` for
 * each property. Iteratee functions may exit iteration early by explicitly
 * returning `false`.
 *
 * @private
 * @param {Object} object The object to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @param {Function} keysFunc The function to get the keys of `object`.
 * @returns {Object} Returns `object`.
 */
var baseFor = createBaseFor();

/**
 * Creates a base function for methods like `_.forIn`.
 *
 * @private
 * @param {boolean} [fromRight] Specify iterating from right to left.
 * @returns {Function} Returns the new base function.
 */
function createBaseFor(fromRight) {
  return function(object, iteratee, keysFunc) {
    var index = -1,
        iterable = Object(object),
        props = keysFunc(object),
        length = props.length;

    while (length--) {
      var key = props[fromRight ? length : ++index];
      if (iteratee(iterable[key], key, iterable) === false) {
        break;
      }
    }
    return object;
  };
}

module.exports = baseFor;

},{}],61:[function(require,module,exports){
/**
 * lodash 3.1.0 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.2 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */

/**
 * The base implementation of `_.indexOf` without support for binary searches.
 *
 * @private
 * @param {Array} array The array to search.
 * @param {*} value The value to search for.
 * @param {number} fromIndex The index to search from.
 * @returns {number} Returns the index of the matched value, else `-1`.
 */
function baseIndexOf(array, value, fromIndex) {
  if (value !== value) {
    return indexOfNaN(array, fromIndex);
  }
  var index = fromIndex - 1,
      length = array.length;

  while (++index < length) {
    if (array[index] === value) {
      return index;
    }
  }
  return -1;
}

/**
 * Gets the index at which the first occurrence of `NaN` is found in `array`.
 * If `fromRight` is provided elements of `array` are iterated from right to left.
 *
 * @private
 * @param {Array} array The array to search.
 * @param {number} fromIndex The index to search from.
 * @param {boolean} [fromRight] Specify iterating from right to left.
 * @returns {number} Returns the index of the matched `NaN`, else `-1`.
 */
function indexOfNaN(array, fromIndex, fromRight) {
  var length = array.length,
      index = fromIndex + (fromRight ? 0 : -1);

  while ((fromRight ? index-- : ++index < length)) {
    var other = array[index];
    if (other !== other) {
      return index;
    }
  }
  return -1;
}

module.exports = baseIndexOf;

},{}],62:[function(require,module,exports){
/**
 * lodash 3.0.3 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */
var baseIndexOf = require('lodash._baseindexof'),
    cacheIndexOf = require('lodash._cacheindexof'),
    createCache = require('lodash._createcache');

/** Used as the size to enable large array optimizations. */
var LARGE_ARRAY_SIZE = 200;

/**
 * The base implementation of `_.uniq` without support for callback shorthands
 * and `this` binding.
 *
 * @private
 * @param {Array} array The array to inspect.
 * @param {Function} [iteratee] The function invoked per iteration.
 * @returns {Array} Returns the new duplicate-value-free array.
 */
function baseUniq(array, iteratee) {
  var index = -1,
      indexOf = baseIndexOf,
      length = array.length,
      isCommon = true,
      isLarge = isCommon && length >= LARGE_ARRAY_SIZE,
      seen = isLarge ? createCache() : null,
      result = [];

  if (seen) {
    indexOf = cacheIndexOf;
    isCommon = false;
  } else {
    isLarge = false;
    seen = iteratee ? [] : result;
  }
  outer:
  while (++index < length) {
    var value = array[index],
        computed = iteratee ? iteratee(value, index, array) : value;

    if (isCommon && value === value) {
      var seenIndex = seen.length;
      while (seenIndex--) {
        if (seen[seenIndex] === computed) {
          continue outer;
        }
      }
      if (iteratee) {
        seen.push(computed);
      }
      result.push(value);
    }
    else if (indexOf(seen, computed, 0) < 0) {
      if (iteratee || isLarge) {
        seen.push(computed);
      }
      result.push(value);
    }
  }
  return result;
}

module.exports = baseUniq;

},{"lodash._baseindexof":61,"lodash._cacheindexof":64,"lodash._createcache":65}],63:[function(require,module,exports){
/**
 * lodash 3.0.1 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */

/**
 * A specialized version of `baseCallback` which only supports `this` binding
 * and specifying the number of arguments to provide to `func`.
 *
 * @private
 * @param {Function} func The function to bind.
 * @param {*} thisArg The `this` binding of `func`.
 * @param {number} [argCount] The number of arguments to provide to `func`.
 * @returns {Function} Returns the callback.
 */
function bindCallback(func, thisArg, argCount) {
  if (typeof func != 'function') {
    return identity;
  }
  if (thisArg === undefined) {
    return func;
  }
  switch (argCount) {
    case 1: return function(value) {
      return func.call(thisArg, value);
    };
    case 3: return function(value, index, collection) {
      return func.call(thisArg, value, index, collection);
    };
    case 4: return function(accumulator, value, index, collection) {
      return func.call(thisArg, accumulator, value, index, collection);
    };
    case 5: return function(value, other, key, object, source) {
      return func.call(thisArg, value, other, key, object, source);
    };
  }
  return function() {
    return func.apply(thisArg, arguments);
  };
}

/**
 * This method returns the first argument provided to it.
 *
 * @static
 * @memberOf _
 * @category Utility
 * @param {*} value Any value.
 * @returns {*} Returns `value`.
 * @example
 *
 * var object = { 'user': 'fred' };
 *
 * _.identity(object) === object;
 * // => true
 */
function identity(value) {
  return value;
}

module.exports = bindCallback;

},{}],64:[function(require,module,exports){
/**
 * lodash 3.0.2 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */

/**
 * Checks if `value` is in `cache` mimicking the return signature of
 * `_.indexOf` by returning `0` if the value is found, else `-1`.
 *
 * @private
 * @param {Object} cache The cache to search.
 * @param {*} value The value to search for.
 * @returns {number} Returns `0` if `value` is found, else `-1`.
 */
function cacheIndexOf(cache, value) {
  var data = cache.data,
      result = (typeof value == 'string' || isObject(value)) ? data.set.has(value) : data.hash[value];

  return result ? 0 : -1;
}

/**
 * Checks if `value` is the [language type](https://es5.github.io/#x8) of `Object`.
 * (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(1);
 * // => false
 */
function isObject(value) {
  // Avoid a V8 JIT bug in Chrome 19-20.
  // See https://code.google.com/p/v8/issues/detail?id=2291 for more details.
  var type = typeof value;
  return !!value && (type == 'object' || type == 'function');
}

module.exports = cacheIndexOf;

},{}],65:[function(require,module,exports){
(function (global){
/**
 * lodash 3.1.2 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */
var getNative = require('lodash._getnative');

/** Native method references. */
var Set = getNative(global, 'Set');

/* Native method references for those with the same name as other `lodash` methods. */
var nativeCreate = getNative(Object, 'create');

/**
 *
 * Creates a cache object to store unique values.
 *
 * @private
 * @param {Array} [values] The values to cache.
 */
function SetCache(values) {
  var length = values ? values.length : 0;

  this.data = { 'hash': nativeCreate(null), 'set': new Set };
  while (length--) {
    this.push(values[length]);
  }
}

/**
 * Adds `value` to the cache.
 *
 * @private
 * @name push
 * @memberOf SetCache
 * @param {*} value The value to cache.
 */
function cachePush(value) {
  var data = this.data;
  if (typeof value == 'string' || isObject(value)) {
    data.set.add(value);
  } else {
    data.hash[value] = true;
  }
}

/**
 * Creates a `Set` cache object to optimize linear searches of large arrays.
 *
 * @private
 * @param {Array} [values] The values to cache.
 * @returns {null|Object} Returns the new cache object if `Set` is supported, else `null`.
 */
function createCache(values) {
  return (nativeCreate && Set) ? new SetCache(values) : null;
}

/**
 * Checks if `value` is the [language type](https://es5.github.io/#x8) of `Object`.
 * (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(1);
 * // => false
 */
function isObject(value) {
  // Avoid a V8 JIT bug in Chrome 19-20.
  // See https://code.google.com/p/v8/issues/detail?id=2291 for more details.
  var type = typeof value;
  return !!value && (type == 'object' || type == 'function');
}

// Add functions to the `Set` cache.
SetCache.prototype.push = cachePush;

module.exports = createCache;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"lodash._getnative":66}],66:[function(require,module,exports){
/**
 * lodash 3.9.1 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */

/** `Object#toString` result references. */
var funcTag = '[object Function]';

/** Used to detect host constructors (Safari > 5). */
var reIsHostCtor = /^\[object .+?Constructor\]$/;

/**
 * Checks if `value` is object-like.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 */
function isObjectLike(value) {
  return !!value && typeof value == 'object';
}

/** Used for native method references. */
var objectProto = Object.prototype;

/** Used to resolve the decompiled source of functions. */
var fnToString = Function.prototype.toString;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Used to resolve the [`toStringTag`](http://ecma-international.org/ecma-262/6.0/#sec-object.prototype.tostring)
 * of values.
 */
var objToString = objectProto.toString;

/** Used to detect if a method is native. */
var reIsNative = RegExp('^' +
  fnToString.call(hasOwnProperty).replace(/[\\^$.*+?()[\]{}|]/g, '\\$&')
  .replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, '$1.*?') + '$'
);

/**
 * Gets the native function at `key` of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @param {string} key The key of the method to get.
 * @returns {*} Returns the function if it's native, else `undefined`.
 */
function getNative(object, key) {
  var value = object == null ? undefined : object[key];
  return isNative(value) ? value : undefined;
}

/**
 * Checks if `value` is classified as a `Function` object.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
 * @example
 *
 * _.isFunction(_);
 * // => true
 *
 * _.isFunction(/abc/);
 * // => false
 */
function isFunction(value) {
  // The use of `Object#toString` avoids issues with the `typeof` operator
  // in older versions of Chrome and Safari which return 'function' for regexes
  // and Safari 8 equivalents which return 'object' for typed array constructors.
  return isObject(value) && objToString.call(value) == funcTag;
}

/**
 * Checks if `value` is the [language type](https://es5.github.io/#x8) of `Object`.
 * (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(1);
 * // => false
 */
function isObject(value) {
  // Avoid a V8 JIT bug in Chrome 19-20.
  // See https://code.google.com/p/v8/issues/detail?id=2291 for more details.
  var type = typeof value;
  return !!value && (type == 'object' || type == 'function');
}

/**
 * Checks if `value` is a native function.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a native function, else `false`.
 * @example
 *
 * _.isNative(Array.prototype.push);
 * // => true
 *
 * _.isNative(_);
 * // => false
 */
function isNative(value) {
  if (value == null) {
    return false;
  }
  if (isFunction(value)) {
    return reIsNative.test(fnToString.call(value));
  }
  return isObjectLike(value) && reIsHostCtor.test(value);
}

module.exports = getNative;

},{}],67:[function(require,module,exports){
(function (global){
/**
 * lodash 3.0.1 (Custom Build) <https://lodash.com/>
 * Build: `lodash modularize exports="npm" -o ./`
 * Copyright 2012-2016 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2016 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */

/** Used to determine if values are of the language type `Object`. */
var objectTypes = {
  'function': true,
  'object': true
};

/** Detect free variable `exports`. */
var freeExports = (objectTypes[typeof exports] && exports && !exports.nodeType)
  ? exports
  : undefined;

/** Detect free variable `module`. */
var freeModule = (objectTypes[typeof module] && module && !module.nodeType)
  ? module
  : undefined;

/** Detect free variable `global` from Node.js. */
var freeGlobal = checkGlobal(freeExports && freeModule && typeof global == 'object' && global);

/** Detect free variable `self`. */
var freeSelf = checkGlobal(objectTypes[typeof self] && self);

/** Detect free variable `window`. */
var freeWindow = checkGlobal(objectTypes[typeof window] && window);

/** Detect `this` as the global object. */
var thisGlobal = checkGlobal(objectTypes[typeof this] && this);

/**
 * Used as a reference to the global object.
 *
 * The `this` value is used if it's the global object to avoid Greasemonkey's
 * restricted `window` object, otherwise the `window` object is used.
 */
var root = freeGlobal ||
  ((freeWindow !== (thisGlobal && thisGlobal.window)) && freeWindow) ||
    freeSelf || thisGlobal || Function('return this')();

/**
 * Checks if `value` is a global object.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {null|Object} Returns `value` if it's a global object, else `null`.
 */
function checkGlobal(value) {
  return (value && value.Object === Object) ? value : null;
}

module.exports = root;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],68:[function(require,module,exports){
/**
 * lodash 3.2.0 (Custom Build) <https://lodash.com/>
 * Build: `lodash modularize exports="npm" -o ./`
 * Copyright 2012-2016 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2016 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */
var root = require('lodash._root');

/** Used as references for various `Number` constants. */
var INFINITY = 1 / 0;

/** `Object#toString` result references. */
var symbolTag = '[object Symbol]';

/** Used to match latin-1 supplementary letters (excluding mathematical operators). */
var reLatin1 = /[\xc0-\xd6\xd8-\xde\xdf-\xf6\xf8-\xff]/g;

/** Used to compose unicode character classes. */
var rsComboMarksRange = '\\u0300-\\u036f\\ufe20-\\ufe23',
    rsComboSymbolsRange = '\\u20d0-\\u20f0';

/** Used to compose unicode capture groups. */
var rsCombo = '[' + rsComboMarksRange + rsComboSymbolsRange + ']';

/**
 * Used to match [combining diacritical marks](https://en.wikipedia.org/wiki/Combining_Diacritical_Marks) and
 * [combining diacritical marks for symbols](https://en.wikipedia.org/wiki/Combining_Diacritical_Marks_for_Symbols).
 */
var reComboMark = RegExp(rsCombo, 'g');

/** Used to map latin-1 supplementary letters to basic latin letters. */
var deburredLetters = {
  '\xc0': 'A',  '\xc1': 'A', '\xc2': 'A', '\xc3': 'A', '\xc4': 'A', '\xc5': 'A',
  '\xe0': 'a',  '\xe1': 'a', '\xe2': 'a', '\xe3': 'a', '\xe4': 'a', '\xe5': 'a',
  '\xc7': 'C',  '\xe7': 'c',
  '\xd0': 'D',  '\xf0': 'd',
  '\xc8': 'E',  '\xc9': 'E', '\xca': 'E', '\xcb': 'E',
  '\xe8': 'e',  '\xe9': 'e', '\xea': 'e', '\xeb': 'e',
  '\xcC': 'I',  '\xcd': 'I', '\xce': 'I', '\xcf': 'I',
  '\xeC': 'i',  '\xed': 'i', '\xee': 'i', '\xef': 'i',
  '\xd1': 'N',  '\xf1': 'n',
  '\xd2': 'O',  '\xd3': 'O', '\xd4': 'O', '\xd5': 'O', '\xd6': 'O', '\xd8': 'O',
  '\xf2': 'o',  '\xf3': 'o', '\xf4': 'o', '\xf5': 'o', '\xf6': 'o', '\xf8': 'o',
  '\xd9': 'U',  '\xda': 'U', '\xdb': 'U', '\xdc': 'U',
  '\xf9': 'u',  '\xfa': 'u', '\xfb': 'u', '\xfc': 'u',
  '\xdd': 'Y',  '\xfd': 'y', '\xff': 'y',
  '\xc6': 'Ae', '\xe6': 'ae',
  '\xde': 'Th', '\xfe': 'th',
  '\xdf': 'ss'
};

/**
 * Used by `_.deburr` to convert latin-1 supplementary letters to basic latin letters.
 *
 * @private
 * @param {string} letter The matched letter to deburr.
 * @returns {string} Returns the deburred letter.
 */
function deburrLetter(letter) {
  return deburredLetters[letter];
}

/** Used for built-in method references. */
var objectProto = Object.prototype;

/**
 * Used to resolve the [`toStringTag`](http://ecma-international.org/ecma-262/6.0/#sec-object.prototype.tostring)
 * of values.
 */
var objectToString = objectProto.toString;

/** Built-in value references. */
var Symbol = root.Symbol;

/** Used to convert symbols to primitives and strings. */
var symbolProto = Symbol ? Symbol.prototype : undefined,
    symbolToString = Symbol ? symbolProto.toString : undefined;

/**
 * Checks if `value` is object-like. A value is object-like if it's not `null`
 * and has a `typeof` result of "object".
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 * @example
 *
 * _.isObjectLike({});
 * // => true
 *
 * _.isObjectLike([1, 2, 3]);
 * // => true
 *
 * _.isObjectLike(_.noop);
 * // => false
 *
 * _.isObjectLike(null);
 * // => false
 */
function isObjectLike(value) {
  return !!value && typeof value == 'object';
}

/**
 * Checks if `value` is classified as a `Symbol` primitive or object.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
 * @example
 *
 * _.isSymbol(Symbol.iterator);
 * // => true
 *
 * _.isSymbol('abc');
 * // => false
 */
function isSymbol(value) {
  return typeof value == 'symbol' ||
    (isObjectLike(value) && objectToString.call(value) == symbolTag);
}

/**
 * Converts `value` to a string if it's not one. An empty string is returned
 * for `null` and `undefined` values. The sign of `-0` is preserved.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to process.
 * @returns {string} Returns the string.
 * @example
 *
 * _.toString(null);
 * // => ''
 *
 * _.toString(-0);
 * // => '-0'
 *
 * _.toString([1, 2, 3]);
 * // => '1,2,3'
 */
function toString(value) {
  // Exit early for strings to avoid a performance hit in some environments.
  if (typeof value == 'string') {
    return value;
  }
  if (value == null) {
    return '';
  }
  if (isSymbol(value)) {
    return Symbol ? symbolToString.call(value) : '';
  }
  var result = (value + '');
  return (result == '0' && (1 / value) == -INFINITY) ? '-0' : result;
}

/**
 * Deburrs `string` by converting [latin-1 supplementary letters](https://en.wikipedia.org/wiki/Latin-1_Supplement_(Unicode_block)#Character_table)
 * to basic latin letters and removing [combining diacritical marks](https://en.wikipedia.org/wiki/Combining_Diacritical_Marks).
 *
 * @static
 * @memberOf _
 * @category String
 * @param {string} [string=''] The string to deburr.
 * @returns {string} Returns the deburred string.
 * @example
 *
 * _.deburr('déjà vu');
 * // => 'deja vu'
 */
function deburr(string) {
  string = toString(string);
  return string && string.replace(reLatin1, deburrLetter).replace(reComboMark, '');
}

module.exports = deburr;

},{"lodash._root":67}],69:[function(require,module,exports){
/**
 * lodash 3.2.0 (Custom Build) <https://lodash.com/>
 * Build: `lodash modularize exports="npm" -o ./`
 * Copyright 2012-2016 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2016 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */
var root = require('lodash._root');

/** Used as references for various `Number` constants. */
var INFINITY = 1 / 0;

/** `Object#toString` result references. */
var symbolTag = '[object Symbol]';

/** Used to match HTML entities and HTML characters. */
var reUnescapedHtml = /[&<>"'`]/g,
    reHasUnescapedHtml = RegExp(reUnescapedHtml.source);

/** Used to map characters to HTML entities. */
var htmlEscapes = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '`': '&#96;'
};

/**
 * Used by `_.escape` to convert characters to HTML entities.
 *
 * @private
 * @param {string} chr The matched character to escape.
 * @returns {string} Returns the escaped character.
 */
function escapeHtmlChar(chr) {
  return htmlEscapes[chr];
}

/** Used for built-in method references. */
var objectProto = Object.prototype;

/**
 * Used to resolve the [`toStringTag`](http://ecma-international.org/ecma-262/6.0/#sec-object.prototype.tostring)
 * of values.
 */
var objectToString = objectProto.toString;

/** Built-in value references. */
var Symbol = root.Symbol;

/** Used to convert symbols to primitives and strings. */
var symbolProto = Symbol ? Symbol.prototype : undefined,
    symbolToString = Symbol ? symbolProto.toString : undefined;

/**
 * Checks if `value` is object-like. A value is object-like if it's not `null`
 * and has a `typeof` result of "object".
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 * @example
 *
 * _.isObjectLike({});
 * // => true
 *
 * _.isObjectLike([1, 2, 3]);
 * // => true
 *
 * _.isObjectLike(_.noop);
 * // => false
 *
 * _.isObjectLike(null);
 * // => false
 */
function isObjectLike(value) {
  return !!value && typeof value == 'object';
}

/**
 * Checks if `value` is classified as a `Symbol` primitive or object.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
 * @example
 *
 * _.isSymbol(Symbol.iterator);
 * // => true
 *
 * _.isSymbol('abc');
 * // => false
 */
function isSymbol(value) {
  return typeof value == 'symbol' ||
    (isObjectLike(value) && objectToString.call(value) == symbolTag);
}

/**
 * Converts `value` to a string if it's not one. An empty string is returned
 * for `null` and `undefined` values. The sign of `-0` is preserved.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to process.
 * @returns {string} Returns the string.
 * @example
 *
 * _.toString(null);
 * // => ''
 *
 * _.toString(-0);
 * // => '-0'
 *
 * _.toString([1, 2, 3]);
 * // => '1,2,3'
 */
function toString(value) {
  // Exit early for strings to avoid a performance hit in some environments.
  if (typeof value == 'string') {
    return value;
  }
  if (value == null) {
    return '';
  }
  if (isSymbol(value)) {
    return Symbol ? symbolToString.call(value) : '';
  }
  var result = (value + '');
  return (result == '0' && (1 / value) == -INFINITY) ? '-0' : result;
}

/**
 * Converts the characters "&", "<", ">", '"', "'", and "\`" in `string` to
 * their corresponding HTML entities.
 *
 * **Note:** No other characters are escaped. To escape additional
 * characters use a third-party library like [_he_](https://mths.be/he).
 *
 * Though the ">" character is escaped for symmetry, characters like
 * ">" and "/" don't need escaping in HTML and have no special meaning
 * unless they're part of a tag or unquoted attribute value.
 * See [Mathias Bynens's article](https://mathiasbynens.be/notes/ambiguous-ampersands)
 * (under "semi-related fun fact") for more details.
 *
 * Backticks are escaped because in IE < 9, they can break out of
 * attribute values or HTML comments. See [#59](https://html5sec.org/#59),
 * [#102](https://html5sec.org/#102), [#108](https://html5sec.org/#108), and
 * [#133](https://html5sec.org/#133) of the [HTML5 Security Cheatsheet](https://html5sec.org/)
 * for more details.
 *
 * When working with HTML you should always [quote attribute values](http://wonko.com/post/html-escaping)
 * to reduce XSS vectors.
 *
 * @static
 * @memberOf _
 * @category String
 * @param {string} [string=''] The string to escape.
 * @returns {string} Returns the escaped string.
 * @example
 *
 * _.escape('fred, barney, & pebbles');
 * // => 'fred, barney, &amp; pebbles'
 */
function escape(string) {
  string = toString(string);
  return (string && reHasUnescapedHtml.test(string))
    ? string.replace(reUnescapedHtml, escapeHtmlChar)
    : string;
}

module.exports = escape;

},{"lodash._root":67}],70:[function(require,module,exports){
/**
 * lodash 3.0.2 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */
var baseFor = require('lodash._basefor'),
    bindCallback = require('lodash._bindcallback'),
    keys = require('lodash.keys');

/**
 * The base implementation of `_.forOwn` without support for callback
 * shorthands and `this` binding.
 *
 * @private
 * @param {Object} object The object to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @returns {Object} Returns `object`.
 */
function baseForOwn(object, iteratee) {
  return baseFor(object, iteratee, keys);
}

/**
 * Creates a function for `_.forOwn` or `_.forOwnRight`.
 *
 * @private
 * @param {Function} objectFunc The function to iterate over an object.
 * @returns {Function} Returns the new each function.
 */
function createForOwn(objectFunc) {
  return function(object, iteratee, thisArg) {
    if (typeof iteratee != 'function' || thisArg !== undefined) {
      iteratee = bindCallback(iteratee, thisArg, 3);
    }
    return objectFunc(object, iteratee);
  };
}

/**
 * Iterates over own enumerable properties of an object invoking `iteratee`
 * for each property. The `iteratee` is bound to `thisArg` and invoked with
 * three arguments: (value, key, object). Iteratee functions may exit iteration
 * early by explicitly returning `false`.
 *
 * @static
 * @memberOf _
 * @category Object
 * @param {Object} object The object to iterate over.
 * @param {Function} [iteratee=_.identity] The function invoked per iteration.
 * @param {*} [thisArg] The `this` binding of `iteratee`.
 * @returns {Object} Returns `object`.
 * @example
 *
 * function Foo() {
 *   this.a = 1;
 *   this.b = 2;
 * }
 *
 * Foo.prototype.c = 3;
 *
 * _.forOwn(new Foo, function(value, key) {
 *   console.log(key);
 * });
 * // => logs 'a' and 'b' (iteration order is not guaranteed)
 */
var forOwn = createForOwn(baseForOwn);

module.exports = forOwn;

},{"lodash._basefor":60,"lodash._bindcallback":63,"lodash.keys":74}],71:[function(require,module,exports){
/**
 * lodash 3.0.8 (Custom Build) <https://lodash.com/>
 * Build: `lodash modularize exports="npm" -o ./`
 * Copyright 2012-2016 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2016 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */

/** Used as references for various `Number` constants. */
var MAX_SAFE_INTEGER = 9007199254740991;

/** `Object#toString` result references. */
var argsTag = '[object Arguments]',
    funcTag = '[object Function]',
    genTag = '[object GeneratorFunction]';

/** Used for built-in method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Used to resolve the [`toStringTag`](http://ecma-international.org/ecma-262/6.0/#sec-object.prototype.tostring)
 * of values.
 */
var objectToString = objectProto.toString;

/** Built-in value references. */
var propertyIsEnumerable = objectProto.propertyIsEnumerable;

/**
 * The base implementation of `_.property` without support for deep paths.
 *
 * @private
 * @param {string} key The key of the property to get.
 * @returns {Function} Returns the new function.
 */
function baseProperty(key) {
  return function(object) {
    return object == null ? undefined : object[key];
  };
}

/**
 * Gets the "length" property value of `object`.
 *
 * **Note:** This function is used to avoid a [JIT bug](https://bugs.webkit.org/show_bug.cgi?id=142792)
 * that affects Safari on at least iOS 8.1-8.3 ARM64.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {*} Returns the "length" value.
 */
var getLength = baseProperty('length');

/**
 * Checks if `value` is likely an `arguments` object.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
 * @example
 *
 * _.isArguments(function() { return arguments; }());
 * // => true
 *
 * _.isArguments([1, 2, 3]);
 * // => false
 */
function isArguments(value) {
  // Safari 8.1 incorrectly makes `arguments.callee` enumerable in strict mode.
  return isArrayLikeObject(value) && hasOwnProperty.call(value, 'callee') &&
    (!propertyIsEnumerable.call(value, 'callee') || objectToString.call(value) == argsTag);
}

/**
 * Checks if `value` is array-like. A value is considered array-like if it's
 * not a function and has a `value.length` that's an integer greater than or
 * equal to `0` and less than or equal to `Number.MAX_SAFE_INTEGER`.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is array-like, else `false`.
 * @example
 *
 * _.isArrayLike([1, 2, 3]);
 * // => true
 *
 * _.isArrayLike(document.body.children);
 * // => true
 *
 * _.isArrayLike('abc');
 * // => true
 *
 * _.isArrayLike(_.noop);
 * // => false
 */
function isArrayLike(value) {
  return value != null && isLength(getLength(value)) && !isFunction(value);
}

/**
 * This method is like `_.isArrayLike` except that it also checks if `value`
 * is an object.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an array-like object, else `false`.
 * @example
 *
 * _.isArrayLikeObject([1, 2, 3]);
 * // => true
 *
 * _.isArrayLikeObject(document.body.children);
 * // => true
 *
 * _.isArrayLikeObject('abc');
 * // => false
 *
 * _.isArrayLikeObject(_.noop);
 * // => false
 */
function isArrayLikeObject(value) {
  return isObjectLike(value) && isArrayLike(value);
}

/**
 * Checks if `value` is classified as a `Function` object.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
 * @example
 *
 * _.isFunction(_);
 * // => true
 *
 * _.isFunction(/abc/);
 * // => false
 */
function isFunction(value) {
  // The use of `Object#toString` avoids issues with the `typeof` operator
  // in Safari 8 which returns 'object' for typed array and weak map constructors,
  // and PhantomJS 1.9 which returns 'function' for `NodeList` instances.
  var tag = isObject(value) ? objectToString.call(value) : '';
  return tag == funcTag || tag == genTag;
}

/**
 * Checks if `value` is a valid array-like length.
 *
 * **Note:** This function is loosely based on [`ToLength`](http://ecma-international.org/ecma-262/6.0/#sec-tolength).
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a valid length, else `false`.
 * @example
 *
 * _.isLength(3);
 * // => true
 *
 * _.isLength(Number.MIN_VALUE);
 * // => false
 *
 * _.isLength(Infinity);
 * // => false
 *
 * _.isLength('3');
 * // => false
 */
function isLength(value) {
  return typeof value == 'number' &&
    value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
}

/**
 * Checks if `value` is the [language type](https://es5.github.io/#x8) of `Object`.
 * (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(_.noop);
 * // => true
 *
 * _.isObject(null);
 * // => false
 */
function isObject(value) {
  var type = typeof value;
  return !!value && (type == 'object' || type == 'function');
}

/**
 * Checks if `value` is object-like. A value is object-like if it's not `null`
 * and has a `typeof` result of "object".
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 * @example
 *
 * _.isObjectLike({});
 * // => true
 *
 * _.isObjectLike([1, 2, 3]);
 * // => true
 *
 * _.isObjectLike(_.noop);
 * // => false
 *
 * _.isObjectLike(null);
 * // => false
 */
function isObjectLike(value) {
  return !!value && typeof value == 'object';
}

module.exports = isArguments;

},{}],72:[function(require,module,exports){
/**
 * lodash 3.0.4 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */

/** `Object#toString` result references. */
var arrayTag = '[object Array]',
    funcTag = '[object Function]';

/** Used to detect host constructors (Safari > 5). */
var reIsHostCtor = /^\[object .+?Constructor\]$/;

/**
 * Checks if `value` is object-like.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 */
function isObjectLike(value) {
  return !!value && typeof value == 'object';
}

/** Used for native method references. */
var objectProto = Object.prototype;

/** Used to resolve the decompiled source of functions. */
var fnToString = Function.prototype.toString;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Used to resolve the [`toStringTag`](http://ecma-international.org/ecma-262/6.0/#sec-object.prototype.tostring)
 * of values.
 */
var objToString = objectProto.toString;

/** Used to detect if a method is native. */
var reIsNative = RegExp('^' +
  fnToString.call(hasOwnProperty).replace(/[\\^$.*+?()[\]{}|]/g, '\\$&')
  .replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, '$1.*?') + '$'
);

/* Native method references for those with the same name as other `lodash` methods. */
var nativeIsArray = getNative(Array, 'isArray');

/**
 * Used as the [maximum length](http://ecma-international.org/ecma-262/6.0/#sec-number.max_safe_integer)
 * of an array-like value.
 */
var MAX_SAFE_INTEGER = 9007199254740991;

/**
 * Gets the native function at `key` of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @param {string} key The key of the method to get.
 * @returns {*} Returns the function if it's native, else `undefined`.
 */
function getNative(object, key) {
  var value = object == null ? undefined : object[key];
  return isNative(value) ? value : undefined;
}

/**
 * Checks if `value` is a valid array-like length.
 *
 * **Note:** This function is based on [`ToLength`](http://ecma-international.org/ecma-262/6.0/#sec-tolength).
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a valid length, else `false`.
 */
function isLength(value) {
  return typeof value == 'number' && value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
}

/**
 * Checks if `value` is classified as an `Array` object.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
 * @example
 *
 * _.isArray([1, 2, 3]);
 * // => true
 *
 * _.isArray(function() { return arguments; }());
 * // => false
 */
var isArray = nativeIsArray || function(value) {
  return isObjectLike(value) && isLength(value.length) && objToString.call(value) == arrayTag;
};

/**
 * Checks if `value` is classified as a `Function` object.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
 * @example
 *
 * _.isFunction(_);
 * // => true
 *
 * _.isFunction(/abc/);
 * // => false
 */
function isFunction(value) {
  // The use of `Object#toString` avoids issues with the `typeof` operator
  // in older versions of Chrome and Safari which return 'function' for regexes
  // and Safari 8 equivalents which return 'object' for typed array constructors.
  return isObject(value) && objToString.call(value) == funcTag;
}

/**
 * Checks if `value` is the [language type](https://es5.github.io/#x8) of `Object`.
 * (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(1);
 * // => false
 */
function isObject(value) {
  // Avoid a V8 JIT bug in Chrome 19-20.
  // See https://code.google.com/p/v8/issues/detail?id=2291 for more details.
  var type = typeof value;
  return !!value && (type == 'object' || type == 'function');
}

/**
 * Checks if `value` is a native function.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a native function, else `false`.
 * @example
 *
 * _.isNative(Array.prototype.push);
 * // => true
 *
 * _.isNative(_);
 * // => false
 */
function isNative(value) {
  if (value == null) {
    return false;
  }
  if (isFunction(value)) {
    return reIsNative.test(fnToString.call(value));
  }
  return isObjectLike(value) && reIsHostCtor.test(value);
}

module.exports = isArray;

},{}],73:[function(require,module,exports){
/**
 * lodash 3.1.1 (Custom Build) <https://lodash.com/>
 * Build: `lodash modularize exports="npm" -o ./`
 * Copyright 2012-2016 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2016 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */
var deburr = require('lodash.deburr'),
    words = require('lodash.words');

/**
 * A specialized version of `_.reduce` for arrays without support for
 * iteratee shorthands.
 *
 * @private
 * @param {Array} array The array to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @param {*} [accumulator] The initial value.
 * @param {boolean} [initAccum] Specify using the first element of `array` as the initial value.
 * @returns {*} Returns the accumulated value.
 */
function arrayReduce(array, iteratee, accumulator, initAccum) {
  var index = -1,
      length = array.length;

  if (initAccum && length) {
    accumulator = array[++index];
  }
  while (++index < length) {
    accumulator = iteratee(accumulator, array[index], index, array);
  }
  return accumulator;
}

/**
 * Creates a function like `_.camelCase`.
 *
 * @private
 * @param {Function} callback The function to combine each word.
 * @returns {Function} Returns the new compounder function.
 */
function createCompounder(callback) {
  return function(string) {
    return arrayReduce(words(deburr(string)), callback, '');
  };
}

/**
 * Converts `string` to [kebab case](https://en.wikipedia.org/wiki/Letter_case#Special_case_styles).
 *
 * @static
 * @memberOf _
 * @category String
 * @param {string} [string=''] The string to convert.
 * @returns {string} Returns the kebab cased string.
 * @example
 *
 * _.kebabCase('Foo Bar');
 * // => 'foo-bar'
 *
 * _.kebabCase('fooBar');
 * // => 'foo-bar'
 *
 * _.kebabCase('__foo_bar__');
 * // => 'foo-bar'
 */
var kebabCase = createCompounder(function(result, word, index) {
  return result + (index ? '-' : '') + word.toLowerCase();
});

module.exports = kebabCase;

},{"lodash.deburr":68,"lodash.words":77}],74:[function(require,module,exports){
/**
 * lodash 3.1.2 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */
var getNative = require('lodash._getnative'),
    isArguments = require('lodash.isarguments'),
    isArray = require('lodash.isarray');

/** Used to detect unsigned integer values. */
var reIsUint = /^\d+$/;

/** Used for native method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/* Native method references for those with the same name as other `lodash` methods. */
var nativeKeys = getNative(Object, 'keys');

/**
 * Used as the [maximum length](http://ecma-international.org/ecma-262/6.0/#sec-number.max_safe_integer)
 * of an array-like value.
 */
var MAX_SAFE_INTEGER = 9007199254740991;

/**
 * The base implementation of `_.property` without support for deep paths.
 *
 * @private
 * @param {string} key The key of the property to get.
 * @returns {Function} Returns the new function.
 */
function baseProperty(key) {
  return function(object) {
    return object == null ? undefined : object[key];
  };
}

/**
 * Gets the "length" property value of `object`.
 *
 * **Note:** This function is used to avoid a [JIT bug](https://bugs.webkit.org/show_bug.cgi?id=142792)
 * that affects Safari on at least iOS 8.1-8.3 ARM64.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {*} Returns the "length" value.
 */
var getLength = baseProperty('length');

/**
 * Checks if `value` is array-like.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is array-like, else `false`.
 */
function isArrayLike(value) {
  return value != null && isLength(getLength(value));
}

/**
 * Checks if `value` is a valid array-like index.
 *
 * @private
 * @param {*} value The value to check.
 * @param {number} [length=MAX_SAFE_INTEGER] The upper bounds of a valid index.
 * @returns {boolean} Returns `true` if `value` is a valid index, else `false`.
 */
function isIndex(value, length) {
  value = (typeof value == 'number' || reIsUint.test(value)) ? +value : -1;
  length = length == null ? MAX_SAFE_INTEGER : length;
  return value > -1 && value % 1 == 0 && value < length;
}

/**
 * Checks if `value` is a valid array-like length.
 *
 * **Note:** This function is based on [`ToLength`](http://ecma-international.org/ecma-262/6.0/#sec-tolength).
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a valid length, else `false`.
 */
function isLength(value) {
  return typeof value == 'number' && value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
}

/**
 * A fallback implementation of `Object.keys` which creates an array of the
 * own enumerable property names of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names.
 */
function shimKeys(object) {
  var props = keysIn(object),
      propsLength = props.length,
      length = propsLength && object.length;

  var allowIndexes = !!length && isLength(length) &&
    (isArray(object) || isArguments(object));

  var index = -1,
      result = [];

  while (++index < propsLength) {
    var key = props[index];
    if ((allowIndexes && isIndex(key, length)) || hasOwnProperty.call(object, key)) {
      result.push(key);
    }
  }
  return result;
}

/**
 * Checks if `value` is the [language type](https://es5.github.io/#x8) of `Object`.
 * (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(1);
 * // => false
 */
function isObject(value) {
  // Avoid a V8 JIT bug in Chrome 19-20.
  // See https://code.google.com/p/v8/issues/detail?id=2291 for more details.
  var type = typeof value;
  return !!value && (type == 'object' || type == 'function');
}

/**
 * Creates an array of the own enumerable property names of `object`.
 *
 * **Note:** Non-object values are coerced to objects. See the
 * [ES spec](http://ecma-international.org/ecma-262/6.0/#sec-object.keys)
 * for more details.
 *
 * @static
 * @memberOf _
 * @category Object
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names.
 * @example
 *
 * function Foo() {
 *   this.a = 1;
 *   this.b = 2;
 * }
 *
 * Foo.prototype.c = 3;
 *
 * _.keys(new Foo);
 * // => ['a', 'b'] (iteration order is not guaranteed)
 *
 * _.keys('hi');
 * // => ['0', '1']
 */
var keys = !nativeKeys ? shimKeys : function(object) {
  var Ctor = object == null ? undefined : object.constructor;
  if ((typeof Ctor == 'function' && Ctor.prototype === object) ||
      (typeof object != 'function' && isArrayLike(object))) {
    return shimKeys(object);
  }
  return isObject(object) ? nativeKeys(object) : [];
};

/**
 * Creates an array of the own and inherited enumerable property names of `object`.
 *
 * **Note:** Non-object values are coerced to objects.
 *
 * @static
 * @memberOf _
 * @category Object
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names.
 * @example
 *
 * function Foo() {
 *   this.a = 1;
 *   this.b = 2;
 * }
 *
 * Foo.prototype.c = 3;
 *
 * _.keysIn(new Foo);
 * // => ['a', 'b', 'c'] (iteration order is not guaranteed)
 */
function keysIn(object) {
  if (object == null) {
    return [];
  }
  if (!isObject(object)) {
    object = Object(object);
  }
  var length = object.length;
  length = (length && isLength(length) &&
    (isArray(object) || isArguments(object)) && length) || 0;

  var Ctor = object.constructor,
      index = -1,
      isProto = typeof Ctor == 'function' && Ctor.prototype === object,
      result = Array(length),
      skipIndexes = length > 0;

  while (++index < length) {
    result[index] = (index + '');
  }
  for (var key in object) {
    if (!(skipIndexes && isIndex(key, length)) &&
        !(key == 'constructor' && (isProto || !hasOwnProperty.call(object, key)))) {
      result.push(key);
    }
  }
  return result;
}

module.exports = keys;

},{"lodash._getnative":66,"lodash.isarguments":71,"lodash.isarray":72}],75:[function(require,module,exports){
/**
 * lodash 3.6.1 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */

/** Used as the `TypeError` message for "Functions" methods. */
var FUNC_ERROR_TEXT = 'Expected a function';

/* Native method references for those with the same name as other `lodash` methods. */
var nativeMax = Math.max;

/**
 * Creates a function that invokes `func` with the `this` binding of the
 * created function and arguments from `start` and beyond provided as an array.
 *
 * **Note:** This method is based on the [rest parameter](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/rest_parameters).
 *
 * @static
 * @memberOf _
 * @category Function
 * @param {Function} func The function to apply a rest parameter to.
 * @param {number} [start=func.length-1] The start position of the rest parameter.
 * @returns {Function} Returns the new function.
 * @example
 *
 * var say = _.restParam(function(what, names) {
 *   return what + ' ' + _.initial(names).join(', ') +
 *     (_.size(names) > 1 ? ', & ' : '') + _.last(names);
 * });
 *
 * say('hello', 'fred', 'barney', 'pebbles');
 * // => 'hello fred, barney, & pebbles'
 */
function restParam(func, start) {
  if (typeof func != 'function') {
    throw new TypeError(FUNC_ERROR_TEXT);
  }
  start = nativeMax(start === undefined ? (func.length - 1) : (+start || 0), 0);
  return function() {
    var args = arguments,
        index = -1,
        length = nativeMax(args.length - start, 0),
        rest = Array(length);

    while (++index < length) {
      rest[index] = args[start + index];
    }
    switch (start) {
      case 0: return func.call(this, rest);
      case 1: return func.call(this, args[0], rest);
      case 2: return func.call(this, args[0], args[1], rest);
    }
    var otherArgs = Array(start + 1);
    index = -1;
    while (++index < start) {
      otherArgs[index] = args[index];
    }
    otherArgs[start] = rest;
    return func.apply(this, otherArgs);
  };
}

module.exports = restParam;

},{}],76:[function(require,module,exports){
/**
 * lodash 3.1.0 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.2 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */
var baseFlatten = require('lodash._baseflatten'),
    baseUniq = require('lodash._baseuniq'),
    restParam = require('lodash.restparam');

/**
 * Creates an array of unique values, in order, of the provided arrays using
 * `SameValueZero` for equality comparisons.
 *
 * **Note:** [`SameValueZero`](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-samevaluezero)
 * comparisons are like strict equality comparisons, e.g. `===`, except that
 * `NaN` matches `NaN`.
 *
 * @static
 * @memberOf _
 * @category Array
 * @param {...Array} [arrays] The arrays to inspect.
 * @returns {Array} Returns the new array of combined values.
 * @example
 *
 * _.union([1, 2], [4, 2], [2, 1]);
 * // => [1, 2, 4]
 */
var union = restParam(function(arrays) {
  return baseUniq(baseFlatten(arrays, false, true));
});

module.exports = union;

},{"lodash._baseflatten":59,"lodash._baseuniq":62,"lodash.restparam":75}],77:[function(require,module,exports){
/**
 * lodash 3.2.0 (Custom Build) <https://lodash.com/>
 * Build: `lodash modularize exports="npm" -o ./`
 * Copyright 2012-2016 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2016 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */
var root = require('lodash._root');

/** Used as references for various `Number` constants. */
var INFINITY = 1 / 0;

/** `Object#toString` result references. */
var symbolTag = '[object Symbol]';

/** Used to compose unicode character classes. */
var rsAstralRange = '\\ud800-\\udfff',
    rsComboMarksRange = '\\u0300-\\u036f\\ufe20-\\ufe23',
    rsComboSymbolsRange = '\\u20d0-\\u20f0',
    rsDingbatRange = '\\u2700-\\u27bf',
    rsLowerRange = 'a-z\\xdf-\\xf6\\xf8-\\xff',
    rsMathOpRange = '\\xac\\xb1\\xd7\\xf7',
    rsNonCharRange = '\\x00-\\x2f\\x3a-\\x40\\x5b-\\x60\\x7b-\\xbf',
    rsQuoteRange = '\\u2018\\u2019\\u201c\\u201d',
    rsSpaceRange = ' \\t\\x0b\\f\\xa0\\ufeff\\n\\r\\u2028\\u2029\\u1680\\u180e\\u2000\\u2001\\u2002\\u2003\\u2004\\u2005\\u2006\\u2007\\u2008\\u2009\\u200a\\u202f\\u205f\\u3000',
    rsUpperRange = 'A-Z\\xc0-\\xd6\\xd8-\\xde',
    rsVarRange = '\\ufe0e\\ufe0f',
    rsBreakRange = rsMathOpRange + rsNonCharRange + rsQuoteRange + rsSpaceRange;

/** Used to compose unicode capture groups. */
var rsBreak = '[' + rsBreakRange + ']',
    rsCombo = '[' + rsComboMarksRange + rsComboSymbolsRange + ']',
    rsDigits = '\\d+',
    rsDingbat = '[' + rsDingbatRange + ']',
    rsLower = '[' + rsLowerRange + ']',
    rsMisc = '[^' + rsAstralRange + rsBreakRange + rsDigits + rsDingbatRange + rsLowerRange + rsUpperRange + ']',
    rsFitz = '\\ud83c[\\udffb-\\udfff]',
    rsModifier = '(?:' + rsCombo + '|' + rsFitz + ')',
    rsNonAstral = '[^' + rsAstralRange + ']',
    rsRegional = '(?:\\ud83c[\\udde6-\\uddff]){2}',
    rsSurrPair = '[\\ud800-\\udbff][\\udc00-\\udfff]',
    rsUpper = '[' + rsUpperRange + ']',
    rsZWJ = '\\u200d';

/** Used to compose unicode regexes. */
var rsLowerMisc = '(?:' + rsLower + '|' + rsMisc + ')',
    rsUpperMisc = '(?:' + rsUpper + '|' + rsMisc + ')',
    reOptMod = rsModifier + '?',
    rsOptVar = '[' + rsVarRange + ']?',
    rsOptJoin = '(?:' + rsZWJ + '(?:' + [rsNonAstral, rsRegional, rsSurrPair].join('|') + ')' + rsOptVar + reOptMod + ')*',
    rsSeq = rsOptVar + reOptMod + rsOptJoin,
    rsEmoji = '(?:' + [rsDingbat, rsRegional, rsSurrPair].join('|') + ')' + rsSeq;

/** Used to match non-compound words composed of alphanumeric characters. */
var reBasicWord = /[a-zA-Z0-9]+/g;

/** Used to match complex or compound words. */
var reComplexWord = RegExp([
  rsUpper + '?' + rsLower + '+(?=' + [rsBreak, rsUpper, '$'].join('|') + ')',
  rsUpperMisc + '+(?=' + [rsBreak, rsUpper + rsLowerMisc, '$'].join('|') + ')',
  rsUpper + '?' + rsLowerMisc + '+',
  rsUpper + '+',
  rsDigits,
  rsEmoji
].join('|'), 'g');

/** Used to detect strings that need a more robust regexp to match words. */
var reHasComplexWord = /[a-z][A-Z]|[0-9][a-zA-Z]|[a-zA-Z][0-9]|[^a-zA-Z0-9 ]/;

/** Used for built-in method references. */
var objectProto = Object.prototype;

/**
 * Used to resolve the [`toStringTag`](http://ecma-international.org/ecma-262/6.0/#sec-object.prototype.tostring)
 * of values.
 */
var objectToString = objectProto.toString;

/** Built-in value references. */
var Symbol = root.Symbol;

/** Used to convert symbols to primitives and strings. */
var symbolProto = Symbol ? Symbol.prototype : undefined,
    symbolToString = Symbol ? symbolProto.toString : undefined;

/**
 * Checks if `value` is object-like. A value is object-like if it's not `null`
 * and has a `typeof` result of "object".
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 * @example
 *
 * _.isObjectLike({});
 * // => true
 *
 * _.isObjectLike([1, 2, 3]);
 * // => true
 *
 * _.isObjectLike(_.noop);
 * // => false
 *
 * _.isObjectLike(null);
 * // => false
 */
function isObjectLike(value) {
  return !!value && typeof value == 'object';
}

/**
 * Checks if `value` is classified as a `Symbol` primitive or object.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
 * @example
 *
 * _.isSymbol(Symbol.iterator);
 * // => true
 *
 * _.isSymbol('abc');
 * // => false
 */
function isSymbol(value) {
  return typeof value == 'symbol' ||
    (isObjectLike(value) && objectToString.call(value) == symbolTag);
}

/**
 * Converts `value` to a string if it's not one. An empty string is returned
 * for `null` and `undefined` values. The sign of `-0` is preserved.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to process.
 * @returns {string} Returns the string.
 * @example
 *
 * _.toString(null);
 * // => ''
 *
 * _.toString(-0);
 * // => '-0'
 *
 * _.toString([1, 2, 3]);
 * // => '1,2,3'
 */
function toString(value) {
  // Exit early for strings to avoid a performance hit in some environments.
  if (typeof value == 'string') {
    return value;
  }
  if (value == null) {
    return '';
  }
  if (isSymbol(value)) {
    return Symbol ? symbolToString.call(value) : '';
  }
  var result = (value + '');
  return (result == '0' && (1 / value) == -INFINITY) ? '-0' : result;
}

/**
 * Splits `string` into an array of its words.
 *
 * @static
 * @memberOf _
 * @category String
 * @param {string} [string=''] The string to inspect.
 * @param {RegExp|string} [pattern] The pattern to match words.
 * @param- {Object} [guard] Enables use as an iteratee for functions like `_.map`.
 * @returns {Array} Returns the words of `string`.
 * @example
 *
 * _.words('fred, barney, & pebbles');
 * // => ['fred', 'barney', 'pebbles']
 *
 * _.words('fred, barney, & pebbles', /[^, ]+/g);
 * // => ['fred', 'barney', '&', 'pebbles']
 */
function words(string, pattern, guard) {
  string = toString(string);
  pattern = guard ? undefined : pattern;

  if (pattern === undefined) {
    pattern = reHasComplexWord.test(string) ? reComplexWord : reBasicWord;
  }
  return string.match(pattern) || [];
}

module.exports = words;

},{"lodash._root":67}],78:[function(require,module,exports){
'use strict';

var proto = Element.prototype;
var vendor = proto.matches
  || proto.matchesSelector
  || proto.webkitMatchesSelector
  || proto.mozMatchesSelector
  || proto.msMatchesSelector
  || proto.oMatchesSelector;

module.exports = match;

/**
 * Match `el` to `selector`.
 *
 * @param {Element} el
 * @param {String} selector
 * @return {Boolean}
 * @api public
 */

function match(el, selector) {
  if (vendor) return vendor.call(el, selector);
  var nodes = el.parentNode.querySelectorAll(selector);
  for (var i = 0; i < nodes.length; i++) {
    if (nodes[i] == el) return true;
  }
  return false;
}
},{}],79:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = setTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    clearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        setTimeout(drainQueue, 0);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],80:[function(require,module,exports){
'use strict';
var strictUriEncode = require('strict-uri-encode');

exports.extract = function (str) {
	return str.split('?')[1] || '';
};

exports.parse = function (str) {
	if (typeof str !== 'string') {
		return {};
	}

	str = str.trim().replace(/^(\?|#|&)/, '');

	if (!str) {
		return {};
	}

	return str.split('&').reduce(function (ret, param) {
		var parts = param.replace(/\+/g, ' ').split('=');
		// Firefox (pre 40) decodes `%3D` to `=`
		// https://github.com/sindresorhus/query-string/pull/37
		var key = parts.shift();
		var val = parts.length > 0 ? parts.join('=') : undefined;

		key = decodeURIComponent(key);

		// missing `=` should be `null`:
		// http://w3.org/TR/2012/WD-url-20120524/#collect-url-parameters
		val = val === undefined ? null : decodeURIComponent(val);

		if (!ret.hasOwnProperty(key)) {
			ret[key] = val;
		} else if (Array.isArray(ret[key])) {
			ret[key].push(val);
		} else {
			ret[key] = [ret[key], val];
		}

		return ret;
	}, {});
};

exports.stringify = function (obj) {
	return obj ? Object.keys(obj).sort().map(function (key) {
		var val = obj[key];

		if (val === undefined) {
			return '';
		}

		if (val === null) {
			return key;
		}

		if (Array.isArray(val)) {
			return val.slice().sort().map(function (val2) {
				return strictUriEncode(key) + '=' + strictUriEncode(val2);
			}).join('&');
		}

		return strictUriEncode(key) + '=' + strictUriEncode(val);
	}).filter(function (x) {
		return x.length > 0;
	}).join('&') : '';
};

},{"strict-uri-encode":102}],81:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = classNameFromVNode;

var _selectorParser2 = require('./selectorParser');

var _selectorParser3 = _interopRequireDefault(_selectorParser2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function classNameFromVNode(vNode) {
  var _selectorParser = (0, _selectorParser3.default)(vNode.sel);

  var cn = _selectorParser.className;

  if (!vNode.data) {
    return cn;
  }

  var _vNode$data = vNode.data;
  var dataClass = _vNode$data.class;
  var props = _vNode$data.props;

  if (dataClass) {
    var c = Object.keys(vNode.data.class).filter(function (cl) {
      return vNode.data.class[cl];
    });
    cn += ' ' + c.join(' ');
  }

  if (props && props.className) {
    cn += ' ' + props.className;
  }

  return cn.trim();
}
},{"./selectorParser":82}],82:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = selectorParser;

var _browserSplit = require('browser-split');

var _browserSplit2 = _interopRequireDefault(_browserSplit);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var classIdSplit = /([\.#]?[a-zA-Z0-9\u007F-\uFFFF_:-]+)/;
var notClassId = /^\.|#/;

function selectorParser() {
  var selector = arguments.length <= 0 || arguments[0] === undefined ? '' : arguments[0];

  var tagName = undefined;
  var id = '';
  var classes = [];

  var tagParts = (0, _browserSplit2.default)(selector, classIdSplit);

  if (notClassId.test(tagParts[1]) || selector === '') {
    tagName = 'div';
  }

  var part = undefined;
  var type = undefined;
  var i = undefined;

  for (i = 0; i < tagParts.length; i++) {
    part = tagParts[i];

    if (!part) {
      continue;
    }

    type = part.charAt(0);

    if (!tagName) {
      tagName = part;
    } else if (type === '.') {
      classes.push(part.substring(1, part.length));
    } else if (type === '#') {
      id = part.substring(1, part.length);
    }
  }

  return {
    tagName: tagName,
    id: id,
    className: classes.join(' ')
  };
}
},{"browser-split":34}],83:[function(require,module,exports){

// All SVG children elements, not in this list, should self-close

module.exports = {
  // http://www.w3.org/TR/SVG/intro.html#TermContainerElement
  'a': true,
  'defs': true,
  'glyph': true,
  'g': true,
  'marker': true,
  'mask': true,
  'missing-glyph': true,
  'pattern': true,
  'svg': true,
  'switch': true,
  'symbol': true,

  // http://www.w3.org/TR/SVG/intro.html#TermDescriptiveElement
  'desc': true,
  'metadata': true,
  'title': true
};
},{}],84:[function(require,module,exports){

var init = require('./init');

module.exports = init([require('./modules/attributes'), require('./modules/style')]);
},{"./init":85,"./modules/attributes":86,"./modules/style":87}],85:[function(require,module,exports){

var parseSelector = require('./parse-selector');
var VOID_ELEMENTS = require('./void-elements');
var CONTAINER_ELEMENTS = require('./container-elements');

module.exports = function init(modules) {
  function parse(data) {
    return modules.reduce(function (arr, fn) {
      arr.push(fn(data));
      return arr;
    }, []).filter(function (result) {
      return result !== '';
    });
  }

  return function renderToString(vnode) {
    if (!vnode.sel && vnode.text) {
      return vnode.text;
    }

    vnode.data = vnode.data || {};

    // Support thunks
    if (typeof vnode.sel === 'string' && vnode.sel.slice(0, 5) === 'thunk') {
      vnode = vnode.data.fn.apply(null, vnode.data.args);
    }

    var tagName = parseSelector(vnode.sel).tagName;
    var attributes = parse(vnode);
    var svg = vnode.data.ns === 'http://www.w3.org/2000/svg';
    var tag = [];

    // Open tag
    tag.push('<' + tagName);
    if (attributes.length) {
      tag.push(' ' + attributes.join(' '));
    }
    if (svg && CONTAINER_ELEMENTS[tagName] !== true) {
      tag.push(' /');
    }
    tag.push('>');

    // Close tag, if needed
    if (VOID_ELEMENTS[tagName] !== true && !svg || svg && CONTAINER_ELEMENTS[tagName] === true) {
      if (vnode.data.props && vnode.data.props.innerHTML) {
        tag.push(vnode.data.props.innerHTML);
      } else if (vnode.text) {
        tag.push(vnode.text);
      } else if (vnode.children) {
        vnode.children.forEach(function (child) {
          tag.push(renderToString(child));
        });
      }
      tag.push('</' + tagName + '>');
    }

    return tag.join('');
  };
};
},{"./container-elements":83,"./parse-selector":88,"./void-elements":89}],86:[function(require,module,exports){

var forOwn = require('lodash.forown');
var escape = require('lodash.escape');
var union = require('lodash.union');

var parseSelector = require('../parse-selector');

// data.attrs, data.props, data.class

module.exports = function attributes(vnode) {
  var selector = parseSelector(vnode.sel);
  var parsedClasses = selector.className.split(' ');

  var attributes = [];
  var classes = [];
  var values = {};

  if (selector.id) {
    values.id = selector.id;
  }

  setAttributes(vnode.data.props, values);
  setAttributes(vnode.data.attrs, values); // `attrs` override `props`, not sure if this is good so

  if (vnode.data.class) {
    // Omit `className` attribute if `class` is set on vnode
    values.class = undefined;
  }
  forOwn(vnode.data.class, function (value, key) {
    if (value === true) {
      classes.push(key);
    }
  });
  classes = union(classes, values.class, parsedClasses).filter(function (x) {
    return x !== '';
  });

  if (classes.length) {
    values.class = classes.join(' ');
  }

  forOwn(values, function (value, key) {
    attributes.push(value === true ? key : key + '="' + escape(value) + '"');
  });

  return attributes.length ? attributes.join(' ') : '';
};

function setAttributes(values, target) {
  forOwn(values, function (value, key) {
    if (key === 'htmlFor') {
      target['for'] = value;
      return;
    }
    if (key === 'className') {
      target['class'] = value.split(' ');
      return;
    }
    if (key === 'innerHTML') {
      return;
    }
    target[key] = value;
  });
}
},{"../parse-selector":88,"lodash.escape":69,"lodash.forown":70,"lodash.union":76}],87:[function(require,module,exports){
var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var forOwn = require('lodash.forown');
var escape = require('lodash.escape');
var kebabCase = require('lodash.kebabcase');

// data.style

module.exports = function style(vnode) {
  var styles = [];
  var style = vnode.data.style || {};

  // merge in `delayed` properties
  if (style.delayed) {
    _extends(style, style.delayed);
  }

  forOwn(style, function (value, key) {
    // omit hook objects
    if (typeof value === 'string') {
      styles.push(kebabCase(key) + ': ' + escape(value));
    }
  });

  return styles.length ? 'style="' + styles.join('; ') + '"' : '';
};
},{"lodash.escape":69,"lodash.forown":70,"lodash.kebabcase":73}],88:[function(require,module,exports){

// https://github.com/Matt-Esch/virtual-dom/blob/master/virtual-hyperscript/parse-tag.js

var split = require('browser-split');

var classIdSplit = /([\.#]?[a-zA-Z0-9\u007F-\uFFFF_:-]+)/;
var notClassId = /^\.|#/;

module.exports = function parseSelector(selector, upper) {
  selector = selector || '';
  var tagName;
  var id = '';
  var classes = [];

  var tagParts = split(selector, classIdSplit);

  if (notClassId.test(tagParts[1]) || selector === '') {
    tagName = 'div';
  }

  var part, type, i;

  for (i = 0; i < tagParts.length; i++) {
    part = tagParts[i];

    if (!part) {
      continue;
    }

    type = part.charAt(0);

    if (!tagName) {
      tagName = part;
    } else if (type === '.') {
      classes.push(part.substring(1, part.length));
    } else if (type === '#') {
      id = part.substring(1, part.length);
    }
  }

  return {
    tagName: upper === true ? tagName.toUpperCase() : tagName,
    id: id,
    className: classes.join(' ')
  };
};
},{"browser-split":34}],89:[function(require,module,exports){

// http://www.w3.org/html/wg/drafts/html/master/syntax.html#void-elements

module.exports = {
  area: true,
  base: true,
  br: true,
  col: true,
  embed: true,
  hr: true,
  img: true,
  input: true,
  keygen: true,
  link: true,
  meta: true,
  param: true,
  source: true,
  track: true,
  wbr: true
};
},{}],90:[function(require,module,exports){
var VNode = require('./vnode');
var is = require('./is');

function addNS(data, children) {
  data.ns = 'http://www.w3.org/2000/svg';
  if (children !== undefined) {
    for (var i = 0; i < children.length; ++i) {
      addNS(children[i].data, children[i].children);
    }
  }
}

module.exports = function h(sel, b, c) {
  var data = {}, children, text, i;
  if (arguments.length === 3) {
    data = b;
    if (is.array(c)) { children = c; }
    else if (is.primitive(c)) { text = c; }
  } else if (arguments.length === 2) {
    if (is.array(b)) { children = b; }
    else if (is.primitive(b)) { text = b; }
    else { data = b; }
  }
  if (is.array(children)) {
    for (i = 0; i < children.length; ++i) {
      if (is.primitive(children[i])) children[i] = VNode(undefined, undefined, undefined, children[i]);
    }
  }
  if (sel[0] === 's' && sel[1] === 'v' && sel[2] === 'g') {
    addNS(data, children);
  }
  return VNode(sel, data, children, text, undefined);
};

},{"./is":92,"./vnode":101}],91:[function(require,module,exports){
function createElement(tagName){
  return document.createElement(tagName);
}

function createElementNS(namespaceURI, qualifiedName){
  return document.createElementNS(namespaceURI, qualifiedName);
}

function createTextNode(text){
  return document.createTextNode(text);
}


function insertBefore(parentNode, newNode, referenceNode){
  parentNode.insertBefore(newNode, referenceNode);
}


function removeChild(node, child){
  node.removeChild(child);
}

function appendChild(node, child){
  node.appendChild(child);
}

function parentNode(node){
  return node.parentElement;
}

function nextSibling(node){
  return node.nextSibling;
}

function tagName(node){
  return node.tagName;
}

function setTextContent(node, text){
  node.textContent = text;
}

module.exports = {
  createElement: createElement,
  createElementNS: createElementNS,
  createTextNode: createTextNode,
  appendChild: appendChild,
  removeChild: removeChild,
  insertBefore: insertBefore,
  parentNode: parentNode,
  nextSibling: nextSibling,
  tagName: tagName,
  setTextContent: setTextContent
};

},{}],92:[function(require,module,exports){
module.exports = {
  array: Array.isArray,
  primitive: function(s) { return typeof s === 'string' || typeof s === 'number'; },
};

},{}],93:[function(require,module,exports){
var booleanAttrs = ["allowfullscreen", "async", "autofocus", "autoplay", "checked", "compact", "controls", "declare", 
                "default", "defaultchecked", "defaultmuted", "defaultselected", "defer", "disabled", "draggable", 
                "enabled", "formnovalidate", "hidden", "indeterminate", "inert", "ismap", "itemscope", "loop", "multiple", 
                "muted", "nohref", "noresize", "noshade", "novalidate", "nowrap", "open", "pauseonexit", "readonly", 
                "required", "reversed", "scoped", "seamless", "selected", "sortable", "spellcheck", "translate", 
                "truespeed", "typemustmatch", "visible"];
    
var booleanAttrsDict = {};
for(var i=0, len = booleanAttrs.length; i < len; i++) {
  booleanAttrsDict[booleanAttrs[i]] = true;
}
    
function updateAttrs(oldVnode, vnode) {
  var key, cur, old, elm = vnode.elm,
      oldAttrs = oldVnode.data.attrs || {}, attrs = vnode.data.attrs || {};
  
  // update modified attributes, add new attributes
  for (key in attrs) {
    cur = attrs[key];
    old = oldAttrs[key];
    if (old !== cur) {
      // TODO: add support to namespaced attributes (setAttributeNS)
      if(!cur && booleanAttrsDict[key])
        elm.removeAttribute(key);
      else
        elm.setAttribute(key, cur);
    }
  }
  //remove removed attributes
  // use `in` operator since the previous `for` iteration uses it (.i.e. add even attributes with undefined value)
  // the other option is to remove all attributes with value == undefined
  for (key in oldAttrs) {
    if (!(key in attrs)) {
      elm.removeAttribute(key);
    }
  }
}

module.exports = {create: updateAttrs, update: updateAttrs};

},{}],94:[function(require,module,exports){
function updateClass(oldVnode, vnode) {
  var cur, name, elm = vnode.elm,
      oldClass = oldVnode.data.class || {},
      klass = vnode.data.class || {};
  for (name in oldClass) {
    if (!klass[name]) {
      elm.classList.remove(name);
    }
  }
  for (name in klass) {
    cur = klass[name];
    if (cur !== oldClass[name]) {
      elm.classList[cur ? 'add' : 'remove'](name);
    }
  }
}

module.exports = {create: updateClass, update: updateClass};

},{}],95:[function(require,module,exports){
var is = require('../is');

function arrInvoker(arr) {
  return function() {
    // Special case when length is two, for performance
    arr.length === 2 ? arr[0](arr[1]) : arr[0].apply(undefined, arr.slice(1));
  };
}

function fnInvoker(o) {
  return function(ev) { o.fn(ev); };
}

function updateEventListeners(oldVnode, vnode) {
  var name, cur, old, elm = vnode.elm,
      oldOn = oldVnode.data.on || {}, on = vnode.data.on;
  if (!on) return;
  for (name in on) {
    cur = on[name];
    old = oldOn[name];
    if (old === undefined) {
      if (is.array(cur)) {
        elm.addEventListener(name, arrInvoker(cur));
      } else {
        cur = {fn: cur};
        on[name] = cur;
        elm.addEventListener(name, fnInvoker(cur));
      }
    } else if (is.array(old)) {
      // Deliberately modify old array since it's captured in closure created with `arrInvoker`
      old.length = cur.length;
      for (var i = 0; i < old.length; ++i) old[i] = cur[i];
      on[name]  = old;
    } else {
      old.fn = cur;
      on[name] = old;
    }
  }
}

module.exports = {create: updateEventListeners, update: updateEventListeners};

},{"../is":92}],96:[function(require,module,exports){
var raf = (typeof window !== 'undefined' && window.requestAnimationFrame) || setTimeout;
var nextFrame = function(fn) { raf(function() { raf(fn); }); };

function setNextFrame(obj, prop, val) {
  nextFrame(function() { obj[prop] = val; });
}

function getTextNodeRect(textNode) {
  var rect;
  if (document.createRange) {
    var range = document.createRange();
    range.selectNodeContents(textNode);
    if (range.getBoundingClientRect) {
        rect = range.getBoundingClientRect();
    }
  }
  return rect;
}

function calcTransformOrigin(isTextNode, textRect, boundingRect) {
  if (isTextNode) {
    if (textRect) {
      //calculate pixels to center of text from left edge of bounding box
      var relativeCenterX = textRect.left + textRect.width/2 - boundingRect.left;
      var relativeCenterY = textRect.top + textRect.height/2 - boundingRect.top;
      return relativeCenterX + 'px ' + relativeCenterY + 'px';
    }
  }
  return '0 0'; //top left
}

function getTextDx(oldTextRect, newTextRect) {
  if (oldTextRect && newTextRect) {
    return ((oldTextRect.left + oldTextRect.width/2) - (newTextRect.left + newTextRect.width/2));
  }
  return 0;
}
function getTextDy(oldTextRect, newTextRect) {
  if (oldTextRect && newTextRect) {
    return ((oldTextRect.top + oldTextRect.height/2) - (newTextRect.top + newTextRect.height/2));
  }
  return 0;
}

function isTextElement(elm) {
  return elm.childNodes.length === 1 && elm.childNodes[0].nodeType === 3;
}

var removed, created;

function pre(oldVnode, vnode) {
  removed = {};
  created = [];
}

function create(oldVnode, vnode) {
  var hero = vnode.data.hero;
  if (hero && hero.id) {
    created.push(hero.id);
    created.push(vnode);
  }
}

function destroy(vnode) {
  var hero = vnode.data.hero;
  if (hero && hero.id) {
    var elm = vnode.elm;
    vnode.isTextNode = isTextElement(elm); //is this a text node?
    vnode.boundingRect = elm.getBoundingClientRect(); //save the bounding rectangle to a new property on the vnode
    vnode.textRect = vnode.isTextNode ? getTextNodeRect(elm.childNodes[0]) : null; //save bounding rect of inner text node
    var computedStyle = window.getComputedStyle(elm, null); //get current styles (includes inherited properties)
    vnode.savedStyle = JSON.parse(JSON.stringify(computedStyle)); //save a copy of computed style values
    removed[hero.id] = vnode;
  }
}

function post() {
  var i, id, newElm, oldVnode, oldElm, hRatio, wRatio,
      oldRect, newRect, dx, dy, origTransform, origTransition,
      newStyle, oldStyle, newComputedStyle, isTextNode,
      newTextRect, oldTextRect;
  for (i = 0; i < created.length; i += 2) {
    id = created[i];
    newElm = created[i+1].elm;
    oldVnode = removed[id];
    if (oldVnode) {
      isTextNode = oldVnode.isTextNode && isTextElement(newElm); //Are old & new both text?
      newStyle = newElm.style;
      newComputedStyle = window.getComputedStyle(newElm, null); //get full computed style for new element
      oldElm = oldVnode.elm;
      oldStyle = oldElm.style;
      //Overall element bounding boxes
      newRect = newElm.getBoundingClientRect();
      oldRect = oldVnode.boundingRect; //previously saved bounding rect
      //Text node bounding boxes & distances
      if (isTextNode) {
        newTextRect = getTextNodeRect(newElm.childNodes[0]);
        oldTextRect = oldVnode.textRect;
        dx = getTextDx(oldTextRect, newTextRect);
        dy = getTextDy(oldTextRect, newTextRect);
      } else {
        //Calculate distances between old & new positions
        dx = oldRect.left - newRect.left;
        dy = oldRect.top - newRect.top;
      }
      hRatio = newRect.height / (Math.max(oldRect.height, 1));
      wRatio = isTextNode ? hRatio : newRect.width / (Math.max(oldRect.width, 1)); //text scales based on hRatio
      // Animate new element
      origTransform = newStyle.transform;
      origTransition = newStyle.transition;
      if (newComputedStyle.display === 'inline') //inline elements cannot be transformed
        newStyle.display = 'inline-block';        //this does not appear to have any negative side effects
      newStyle.transition = origTransition + 'transform 0s';
      newStyle.transformOrigin = calcTransformOrigin(isTextNode, newTextRect, newRect);
      newStyle.opacity = '0';
      newStyle.transform = origTransform + 'translate('+dx+'px, '+dy+'px) ' +
                               'scale('+1/wRatio+', '+1/hRatio+')';
      setNextFrame(newStyle, 'transition', origTransition);
      setNextFrame(newStyle, 'transform', origTransform);
      setNextFrame(newStyle, 'opacity', '1');
      // Animate old element
      for (var key in oldVnode.savedStyle) { //re-apply saved inherited properties
        if (parseInt(key) != key) {
          var ms = key.substring(0,2) === 'ms';
          var moz = key.substring(0,3) === 'moz';
          var webkit = key.substring(0,6) === 'webkit';
      	  if (!ms && !moz && !webkit) //ignore prefixed style properties
        	  oldStyle[key] = oldVnode.savedStyle[key];
        }
      }
      oldStyle.position = 'absolute';
      oldStyle.top = oldRect.top + 'px'; //start at existing position
      oldStyle.left = oldRect.left + 'px';
      oldStyle.width = oldRect.width + 'px'; //Needed for elements who were sized relative to their parents
      oldStyle.height = oldRect.height + 'px'; //Needed for elements who were sized relative to their parents
      oldStyle.margin = 0; //Margin on hero element leads to incorrect positioning
      oldStyle.transformOrigin = calcTransformOrigin(isTextNode, oldTextRect, oldRect);
      oldStyle.transform = '';
      oldStyle.opacity = '1';
      document.body.appendChild(oldElm);
      setNextFrame(oldStyle, 'transform', 'translate('+ -dx +'px, '+ -dy +'px) scale('+wRatio+', '+hRatio+')'); //scale must be on far right for translate to be correct
      setNextFrame(oldStyle, 'opacity', '0');
      oldElm.addEventListener('transitionend', function(ev) {
        if (ev.propertyName === 'transform')
          document.body.removeChild(ev.target);
      });
    }
  }
  removed = created = undefined;
}

module.exports = {pre: pre, create: create, destroy: destroy, post: post};

},{}],97:[function(require,module,exports){
function updateProps(oldVnode, vnode) {
  var key, cur, old, elm = vnode.elm,
      oldProps = oldVnode.data.props || {}, props = vnode.data.props || {};
  for (key in oldProps) {
    if (!props[key]) {
      delete elm[key];
    }
  }
  for (key in props) {
    cur = props[key];
    old = oldProps[key];
    if (old !== cur && (key !== 'value' || elm[key] !== cur)) {
      elm[key] = cur;
    }
  }
}

module.exports = {create: updateProps, update: updateProps};

},{}],98:[function(require,module,exports){
var raf = (typeof window !== 'undefined' && window.requestAnimationFrame) || setTimeout;
var nextFrame = function(fn) { raf(function() { raf(fn); }); };

function setNextFrame(obj, prop, val) {
  nextFrame(function() { obj[prop] = val; });
}

function updateStyle(oldVnode, vnode) {
  var cur, name, elm = vnode.elm,
      oldStyle = oldVnode.data.style || {},
      style = vnode.data.style || {},
      oldHasDel = 'delayed' in oldStyle;
  for (name in oldStyle) {
    if (!style[name]) {
      elm.style[name] = '';
    }
  }
  for (name in style) {
    cur = style[name];
    if (name === 'delayed') {
      for (name in style.delayed) {
        cur = style.delayed[name];
        if (!oldHasDel || cur !== oldStyle.delayed[name]) {
          setNextFrame(elm.style, name, cur);
        }
      }
    } else if (name !== 'remove' && cur !== oldStyle[name]) {
      elm.style[name] = cur;
    }
  }
}

function applyDestroyStyle(vnode) {
  var style, name, elm = vnode.elm, s = vnode.data.style;
  if (!s || !(style = s.destroy)) return;
  for (name in style) {
    elm.style[name] = style[name];
  }
}

function applyRemoveStyle(vnode, rm) {
  var s = vnode.data.style;
  if (!s || !s.remove) {
    rm();
    return;
  }
  var name, elm = vnode.elm, idx, i = 0, maxDur = 0,
      compStyle, style = s.remove, amount = 0, applied = [];
  for (name in style) {
    applied.push(name);
    elm.style[name] = style[name];
  }
  compStyle = getComputedStyle(elm);
  var props = compStyle['transition-property'].split(', ');
  for (; i < props.length; ++i) {
    if(applied.indexOf(props[i]) !== -1) amount++;
  }
  elm.addEventListener('transitionend', function(ev) {
    if (ev.target === elm) --amount;
    if (amount === 0) rm();
  });
}

module.exports = {create: updateStyle, update: updateStyle, destroy: applyDestroyStyle, remove: applyRemoveStyle};

},{}],99:[function(require,module,exports){
// jshint newcap: false
/* global require, module, document, Node */
'use strict';

var VNode = require('./vnode');
var is = require('./is');
var domApi = require('./htmldomapi.js');

function isUndef(s) { return s === undefined; }
function isDef(s) { return s !== undefined; }

var emptyNode = VNode('', {}, [], undefined, undefined);

function sameVnode(vnode1, vnode2) {
  return vnode1.key === vnode2.key && vnode1.sel === vnode2.sel;
}

function createKeyToOldIdx(children, beginIdx, endIdx) {
  var i, map = {}, key;
  for (i = beginIdx; i <= endIdx; ++i) {
    key = children[i].key;
    if (isDef(key)) map[key] = i;
  }
  return map;
}

var hooks = ['create', 'update', 'remove', 'destroy', 'pre', 'post'];

function init(modules, api) {
  var i, j, cbs = {};

  if (isUndef(api)) api = domApi;

  for (i = 0; i < hooks.length; ++i) {
    cbs[hooks[i]] = [];
    for (j = 0; j < modules.length; ++j) {
      if (modules[j][hooks[i]] !== undefined) cbs[hooks[i]].push(modules[j][hooks[i]]);
    }
  }

  function emptyNodeAt(elm) {
    return VNode(api.tagName(elm).toLowerCase(), {}, [], undefined, elm);
  }

  function createRmCb(childElm, listeners) {
    return function() {
      if (--listeners === 0) {
        var parent = api.parentNode(childElm);
        api.removeChild(parent, childElm);
      }
    };
  }

  function createElm(vnode, insertedVnodeQueue) {
    var i, thunk, data = vnode.data;
    if (isDef(data)) {
      if (isDef(i = data.hook) && isDef(i = i.init)) i(vnode);
      if (isDef(i = data.vnode)) {
          thunk = vnode;
          vnode = i;
      }
    }
    var elm, children = vnode.children, sel = vnode.sel;
    if (isDef(sel)) {
      // Parse selector
      var hashIdx = sel.indexOf('#');
      var dotIdx = sel.indexOf('.', hashIdx);
      var hash = hashIdx > 0 ? hashIdx : sel.length;
      var dot = dotIdx > 0 ? dotIdx : sel.length;
      var tag = hashIdx !== -1 || dotIdx !== -1 ? sel.slice(0, Math.min(hash, dot)) : sel;
      elm = vnode.elm = isDef(data) && isDef(i = data.ns) ? api.createElementNS(i, tag)
                                                          : api.createElement(tag);
      if (hash < dot) elm.id = sel.slice(hash + 1, dot);
      if (dotIdx > 0) elm.className = sel.slice(dot+1).replace(/\./g, ' ');
      if (is.array(children)) {
        for (i = 0; i < children.length; ++i) {
          api.appendChild(elm, createElm(children[i], insertedVnodeQueue));
        }
      } else if (is.primitive(vnode.text)) {
        api.appendChild(elm, api.createTextNode(vnode.text));
      }
      for (i = 0; i < cbs.create.length; ++i) cbs.create[i](emptyNode, vnode);
      i = vnode.data.hook; // Reuse variable
      if (isDef(i)) {
        if (i.create) i.create(emptyNode, vnode);
        if (i.insert) insertedVnodeQueue.push(vnode);
      }
    } else {
      elm = vnode.elm = api.createTextNode(vnode.text);
    }
    if (isDef(thunk)) thunk.elm = vnode.elm;
    return vnode.elm;
  }

  function addVnodes(parentElm, before, vnodes, startIdx, endIdx, insertedVnodeQueue) {
    for (; startIdx <= endIdx; ++startIdx) {
      api.insertBefore(parentElm, createElm(vnodes[startIdx], insertedVnodeQueue), before);
    }
  }

  function invokeDestroyHook(vnode) {
    var i, j, data = vnode.data;
    if (isDef(data)) {
      if (isDef(i = data.hook) && isDef(i = i.destroy)) i(vnode);
      for (i = 0; i < cbs.destroy.length; ++i) cbs.destroy[i](vnode);
      if (isDef(i = vnode.children)) {
        for (j = 0; j < vnode.children.length; ++j) {
          invokeDestroyHook(vnode.children[j]);
        }
      }
      if (isDef(i = data.vnode)) invokeDestroyHook(i);
    }
  }

  function removeVnodes(parentElm, vnodes, startIdx, endIdx) {
    for (; startIdx <= endIdx; ++startIdx) {
      var i, listeners, rm, ch = vnodes[startIdx];
      if (isDef(ch)) {
        if (isDef(ch.sel)) {
          invokeDestroyHook(ch);
          listeners = cbs.remove.length + 1;
          rm = createRmCb(ch.elm, listeners);
          for (i = 0; i < cbs.remove.length; ++i) cbs.remove[i](ch, rm);
          if (isDef(i = ch.data) && isDef(i = i.hook) && isDef(i = i.remove)) {
            i(ch, rm);
          } else {
            rm();
          }
        } else { // Text node
          api.removeChild(parentElm, ch.elm);
        }
      }
    }
  }

  function updateChildren(parentElm, oldCh, newCh, insertedVnodeQueue) {
    var oldStartIdx = 0, newStartIdx = 0;
    var oldEndIdx = oldCh.length - 1;
    var oldStartVnode = oldCh[0];
    var oldEndVnode = oldCh[oldEndIdx];
    var newEndIdx = newCh.length - 1;
    var newStartVnode = newCh[0];
    var newEndVnode = newCh[newEndIdx];
    var oldKeyToIdx, idxInOld, elmToMove, before;

    while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
      if (isUndef(oldStartVnode)) {
        oldStartVnode = oldCh[++oldStartIdx]; // Vnode has been moved left
      } else if (isUndef(oldEndVnode)) {
        oldEndVnode = oldCh[--oldEndIdx];
      } else if (sameVnode(oldStartVnode, newStartVnode)) {
        patchVnode(oldStartVnode, newStartVnode, insertedVnodeQueue);
        oldStartVnode = oldCh[++oldStartIdx];
        newStartVnode = newCh[++newStartIdx];
      } else if (sameVnode(oldEndVnode, newEndVnode)) {
        patchVnode(oldEndVnode, newEndVnode, insertedVnodeQueue);
        oldEndVnode = oldCh[--oldEndIdx];
        newEndVnode = newCh[--newEndIdx];
      } else if (sameVnode(oldStartVnode, newEndVnode)) { // Vnode moved right
        patchVnode(oldStartVnode, newEndVnode, insertedVnodeQueue);
        api.insertBefore(parentElm, oldStartVnode.elm, api.nextSibling(oldEndVnode.elm));
        oldStartVnode = oldCh[++oldStartIdx];
        newEndVnode = newCh[--newEndIdx];
      } else if (sameVnode(oldEndVnode, newStartVnode)) { // Vnode moved left
        patchVnode(oldEndVnode, newStartVnode, insertedVnodeQueue);
        api.insertBefore(parentElm, oldEndVnode.elm, oldStartVnode.elm);
        oldEndVnode = oldCh[--oldEndIdx];
        newStartVnode = newCh[++newStartIdx];
      } else {
        if (isUndef(oldKeyToIdx)) oldKeyToIdx = createKeyToOldIdx(oldCh, oldStartIdx, oldEndIdx);
        idxInOld = oldKeyToIdx[newStartVnode.key];
        if (isUndef(idxInOld)) { // New element
          api.insertBefore(parentElm, createElm(newStartVnode, insertedVnodeQueue), oldStartVnode.elm);
          newStartVnode = newCh[++newStartIdx];
        } else {
          elmToMove = oldCh[idxInOld];
          patchVnode(elmToMove, newStartVnode, insertedVnodeQueue);
          oldCh[idxInOld] = undefined;
          api.insertBefore(parentElm, elmToMove.elm, oldStartVnode.elm);
          newStartVnode = newCh[++newStartIdx];
        }
      }
    }
    if (oldStartIdx > oldEndIdx) {
      before = isUndef(newCh[newEndIdx+1]) ? null : newCh[newEndIdx+1].elm;
      addVnodes(parentElm, before, newCh, newStartIdx, newEndIdx, insertedVnodeQueue);
    } else if (newStartIdx > newEndIdx) {
      removeVnodes(parentElm, oldCh, oldStartIdx, oldEndIdx);
    }
  }

  function patchVnode(oldVnode, vnode, insertedVnodeQueue) {
    var i, hook;
    if (isDef(i = vnode.data) && isDef(hook = i.hook) && isDef(i = hook.prepatch)) {
      i(oldVnode, vnode);
    }
    if (isDef(i = oldVnode.data) && isDef(i = i.vnode)) oldVnode = i;
    if (isDef(i = vnode.data) && isDef(i = i.vnode)) {
      patchVnode(oldVnode, i, insertedVnodeQueue);
      vnode.elm = i.elm;
      return;
    }
    var elm = vnode.elm = oldVnode.elm, oldCh = oldVnode.children, ch = vnode.children;
    if (oldVnode === vnode) return;
    if (!sameVnode(oldVnode, vnode)) {
      var parentElm = api.parentNode(oldVnode.elm);
      elm = createElm(vnode, insertedVnodeQueue);
      api.insertBefore(parentElm, elm, oldVnode.elm);
      removeVnodes(parentElm, [oldVnode], 0, 0);
      return;
    }
    if (isDef(vnode.data)) {
      for (i = 0; i < cbs.update.length; ++i) cbs.update[i](oldVnode, vnode);
      i = vnode.data.hook;
      if (isDef(i) && isDef(i = i.update)) i(oldVnode, vnode);
    }
    if (isUndef(vnode.text)) {
      if (isDef(oldCh) && isDef(ch)) {
        if (oldCh !== ch) updateChildren(elm, oldCh, ch, insertedVnodeQueue);
      } else if (isDef(ch)) {
        if (isDef(oldVnode.text)) api.setTextContent(elm, '');
        addVnodes(elm, null, ch, 0, ch.length - 1, insertedVnodeQueue);
      } else if (isDef(oldCh)) {
        removeVnodes(elm, oldCh, 0, oldCh.length - 1);
      } else if (isDef(oldVnode.text)) {
        api.setTextContent(elm, '');
      }
    } else if (oldVnode.text !== vnode.text) {
      api.setTextContent(elm, vnode.text);
    }
    if (isDef(hook) && isDef(i = hook.postpatch)) {
      i(oldVnode, vnode);
    }
  }

  return function(oldVnode, vnode) {
    var i, elm, parent;
    var insertedVnodeQueue = [];
    for (i = 0; i < cbs.pre.length; ++i) cbs.pre[i]();

    if (isUndef(oldVnode.sel)) {
      oldVnode = emptyNodeAt(oldVnode);
    }

    if (sameVnode(oldVnode, vnode)) {
      patchVnode(oldVnode, vnode, insertedVnodeQueue);
    } else {
      elm = oldVnode.elm;
      parent = api.parentNode(elm);

      createElm(vnode, insertedVnodeQueue);

      if (parent !== null) {
        api.insertBefore(parent, vnode.elm, api.nextSibling(elm));
        removeVnodes(parent, [oldVnode], 0, 0);
      }
    }

    for (i = 0; i < insertedVnodeQueue.length; ++i) {
      insertedVnodeQueue[i].data.hook.insert(insertedVnodeQueue[i]);
    }
    for (i = 0; i < cbs.post.length; ++i) cbs.post[i]();
    return vnode;
  };
}

module.exports = {init: init};

},{"./htmldomapi.js":91,"./is":92,"./vnode":101}],100:[function(require,module,exports){
var h = require('./h');

function init(thunk) {
  var i, cur = thunk.data;
  cur.vnode = cur.fn.apply(undefined, cur.args);
}

function prepatch(oldThunk, thunk) {
  var i, old = oldThunk.data, cur = thunk.data;
  var oldArgs = old.args, args = cur.args;
  cur.vnode = old.vnode;
  if (old.fn !== cur.fn || oldArgs.length !== args.length) {
    cur.vnode = cur.fn.apply(undefined, args);
    return;
  }
  for (i = 0; i < args.length; ++i) {
    if (oldArgs[i] !== args[i]) {
      cur.vnode = cur.fn.apply(undefined, args);
      return;
    }
  }
}

module.exports = function(name, fn /* args */) {
  var i, args = [];
  for (i = 2; i < arguments.length; ++i) {
    args[i - 2] = arguments[i];
  }
  return h('thunk' + name, {
    hook: {init: init, prepatch: prepatch},
    fn: fn, args: args,
  });
};

},{"./h":90}],101:[function(require,module,exports){
module.exports = function(sel, data, children, text, elm) {
  var key = data === undefined ? undefined : data.key;
  return {sel: sel, data: data, children: children,
          text: text, elm: elm, key: key};
};

},{}],102:[function(require,module,exports){
'use strict';
module.exports = function (str) {
	return encodeURIComponent(str).replace(/[!'()*]/g, function (c) {
		return '%' + c.charCodeAt(0).toString(16).toUpperCase();
	});
};

},{}],103:[function(require,module,exports){
(function (process){
/**
 * Copyright 2014-2015, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

'use strict';

/**
 * Similar to invariant but only logs a warning if the condition is not met.
 * This can be used to log issues in development environments in critical
 * paths. Removing the logging code for production environments will keep the
 * same logic and follow the same code paths.
 */

var warning = function() {};

if (process.env.NODE_ENV !== 'production') {
  warning = function(condition, format, args) {
    var len = arguments.length;
    args = new Array(len > 2 ? len - 2 : 0);
    for (var key = 2; key < len; key++) {
      args[key - 2] = arguments[key];
    }
    if (format === undefined) {
      throw new Error(
        '`warning(condition, format, ...args)` requires a warning ' +
        'message argument'
      );
    }

    if (format.length < 10 || (/^[s\W]*$/).test(format)) {
      throw new Error(
        'The warning format should be able to uniquely identify this ' +
        'warning. Please, use a more descriptive format than: ' + format
      );
    }

    if (!condition) {
      var argIndex = 0;
      var message = 'Warning: ' +
        format.replace(/%s/g, function() {
          return args[argIndex++];
        });
      if (typeof console !== 'undefined') {
        console.error(message);
      }
      try {
        // This error was thrown as a convenience so that you can use this stack
        // to find the callsite that caused this warning to fire.
        throw new Error(message);
      } catch(x) {}
    }
  };
}

module.exports = warning;

}).call(this,require('_process'))

},{"_process":79}],104:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var empty = {};
function noop() { }
function copy(a) {
    var l = a.length;
    var b = Array(l);
    for (var i = 0; i < l; ++i) {
        b[i] = a[i];
    }
    return b;
}
exports.emptyListener = {
    _n: noop,
    _e: noop,
    _c: noop,
};
// mutates the input
function internalizeProducer(producer) {
    producer._start =
        function _start(il) {
            il.next = il._n;
            il.error = il._e;
            il.complete = il._c;
            this.start(il);
        };
    producer._stop = producer.stop;
}
function invoke(f, args) {
    switch (args.length) {
        case 0: return f();
        case 1: return f(args[0]);
        case 2: return f(args[0], args[1]);
        case 3: return f(args[0], args[1], args[2]);
        case 4: return f(args[0], args[1], args[2], args[3]);
        case 5: return f(args[0], args[1], args[2], args[3], args[4]);
        default: return f.apply(void 0, args);
    }
}
function compose2(f1, f2) {
    return function composedFn(arg) {
        return f1(f2(arg));
    };
}
function and(f1, f2) {
    return function andFn(t) {
        return f1(t) && f2(t);
    };
}
var CombineListener = (function () {
    function CombineListener(i, p) {
        this.i = i;
        this.p = p;
        p.ils.push(this);
    }
    CombineListener.prototype._n = function (t) {
        var p = this.p, out = p.out;
        if (!out)
            return;
        if (p.up(t, this.i)) {
            try {
                out._n(invoke(p.project, p.vals));
            }
            catch (e) {
                out._e(e);
            }
        }
    };
    CombineListener.prototype._e = function (err) {
        var out = this.p.out;
        if (!out)
            return;
        out._e(err);
    };
    CombineListener.prototype._c = function () {
        var p = this.p;
        if (!p.out)
            return;
        if (--p.ac === 0) {
            p.out._c();
        }
    };
    return CombineListener;
}());
exports.CombineListener = CombineListener;
var CombineProducer = (function () {
    function CombineProducer(project, streams) {
        this.project = project;
        this.streams = streams;
        this.type = 'combine';
        this.out = exports.emptyListener;
        this.ils = [];
        var n = this.ac = this.left = streams.length;
        var vals = this.vals = new Array(n);
        for (var i = 0; i < n; i++) {
            vals[i] = empty;
        }
    }
    CombineProducer.prototype.up = function (t, i) {
        var v = this.vals[i];
        var left = !this.left ? 0 : v === empty ? --this.left : this.left;
        this.vals[i] = t;
        return left === 0;
    };
    CombineProducer.prototype._start = function (out) {
        this.out = out;
        var s = this.streams;
        var n = s.length;
        if (n === 0)
            this.zero(out);
        else {
            for (var i = 0; i < n; i++) {
                s[i]._add(new CombineListener(i, this));
            }
        }
    };
    CombineProducer.prototype._stop = function () {
        var s = this.streams;
        var n = this.ac = this.left = s.length;
        var vals = this.vals = new Array(n);
        for (var i = 0; i < n; i++) {
            s[i]._remove(this.ils[i]);
            vals[i] = empty;
        }
        this.out = null;
        this.ils = [];
    };
    CombineProducer.prototype.zero = function (out) {
        try {
            out._n(this.project());
            out._c();
        }
        catch (e) {
            out._e(e);
        }
    };
    return CombineProducer;
}());
exports.CombineProducer = CombineProducer;
var FromArrayProducer = (function () {
    function FromArrayProducer(a) {
        this.a = a;
        this.type = 'fromArray';
    }
    FromArrayProducer.prototype._start = function (out) {
        var a = this.a;
        for (var i = 0, l = a.length; i < l; i++) {
            out._n(a[i]);
        }
        out._c();
    };
    FromArrayProducer.prototype._stop = function () {
    };
    return FromArrayProducer;
}());
exports.FromArrayProducer = FromArrayProducer;
var FromPromiseProducer = (function () {
    function FromPromiseProducer(p) {
        this.p = p;
        this.type = 'fromPromise';
        this.on = false;
    }
    FromPromiseProducer.prototype._start = function (out) {
        var prod = this;
        this.on = true;
        this.p.then(function (v) {
            if (prod.on) {
                out._n(v);
                out._c();
            }
        }, function (e) {
            out._e(e);
        }).then(null, function (err) {
            setTimeout(function () { throw err; });
        });
    };
    FromPromiseProducer.prototype._stop = function () {
        this.on = false;
    };
    return FromPromiseProducer;
}());
exports.FromPromiseProducer = FromPromiseProducer;
var MergeProducer = (function () {
    function MergeProducer(streams) {
        this.streams = streams;
        this.type = 'merge';
        this.out = exports.emptyListener;
        this.ac = streams.length;
    }
    MergeProducer.prototype._start = function (out) {
        this.out = out;
        var s = this.streams;
        var L = s.length;
        for (var i = 0; i < L; i++) {
            s[i]._add(this);
        }
    };
    MergeProducer.prototype._stop = function () {
        var s = this.streams;
        var L = s.length;
        for (var i = 0; i < L; i++) {
            s[i]._remove(this);
        }
        this.out = null;
        this.ac = L;
    };
    MergeProducer.prototype._n = function (t) {
        var u = this.out;
        if (!u)
            return;
        u._n(t);
    };
    MergeProducer.prototype._e = function (err) {
        var u = this.out;
        if (!u)
            return;
        u._e(err);
    };
    MergeProducer.prototype._c = function () {
        if (--this.ac === 0) {
            var u = this.out;
            if (!u)
                return;
            u._c();
        }
    };
    return MergeProducer;
}());
exports.MergeProducer = MergeProducer;
var PeriodicProducer = (function () {
    function PeriodicProducer(period) {
        this.period = period;
        this.type = 'periodic';
        this.intervalID = -1;
        this.i = 0;
    }
    PeriodicProducer.prototype._start = function (stream) {
        var self = this;
        function intervalHandler() { stream._n(self.i++); }
        this.intervalID = setInterval(intervalHandler, this.period);
    };
    PeriodicProducer.prototype._stop = function () {
        if (this.intervalID !== -1)
            clearInterval(this.intervalID);
        this.intervalID = -1;
        this.i = 0;
    };
    return PeriodicProducer;
}());
exports.PeriodicProducer = PeriodicProducer;
var DebugOperator = (function () {
    function DebugOperator(arg, ins) {
        this.ins = ins;
        this.type = 'debug';
        this.out = null;
        this.s = null; // spy
        this.l = null; // label
        if (typeof arg === 'string') {
            this.l = arg;
        }
        else {
            this.s = arg;
        }
    }
    DebugOperator.prototype._start = function (out) {
        this.out = out;
        this.ins._add(this);
    };
    DebugOperator.prototype._stop = function () {
        this.ins._remove(this);
        this.out = null;
    };
    DebugOperator.prototype._n = function (t) {
        var u = this.out;
        if (!u)
            return;
        var s = this.s, l = this.l;
        if (s) {
            try {
                s(t);
            }
            catch (e) {
                u._e(e);
            }
        }
        else if (l) {
            console.log(l + ':', t);
        }
        else {
            console.log(t);
        }
        u._n(t);
    };
    DebugOperator.prototype._e = function (err) {
        var u = this.out;
        if (!u)
            return;
        u._e(err);
    };
    DebugOperator.prototype._c = function () {
        var u = this.out;
        if (!u)
            return;
        u._c();
    };
    return DebugOperator;
}());
exports.DebugOperator = DebugOperator;
var DropOperator = (function () {
    function DropOperator(max, ins) {
        this.max = max;
        this.ins = ins;
        this.type = 'drop';
        this.out = null;
        this.dropped = 0;
    }
    DropOperator.prototype._start = function (out) {
        this.out = out;
        this.ins._add(this);
    };
    DropOperator.prototype._stop = function () {
        this.ins._remove(this);
        this.out = null;
        this.dropped = 0;
    };
    DropOperator.prototype._n = function (t) {
        var u = this.out;
        if (!u)
            return;
        if (this.dropped++ >= this.max)
            u._n(t);
    };
    DropOperator.prototype._e = function (err) {
        var u = this.out;
        if (!u)
            return;
        u._e(err);
    };
    DropOperator.prototype._c = function () {
        var u = this.out;
        if (!u)
            return;
        u._c();
    };
    return DropOperator;
}());
exports.DropOperator = DropOperator;
var OtherIL = (function () {
    function OtherIL(out, op) {
        this.out = out;
        this.op = op;
    }
    OtherIL.prototype._n = function (t) {
        this.op.end();
    };
    OtherIL.prototype._e = function (err) {
        this.out._e(err);
    };
    OtherIL.prototype._c = function () {
        this.op.end();
    };
    return OtherIL;
}());
var EndWhenOperator = (function () {
    function EndWhenOperator(o, // o = other
        ins) {
        this.o = o;
        this.ins = ins;
        this.type = 'endWhen';
        this.out = null;
        this.oil = exports.emptyListener; // oil = other InternalListener
    }
    EndWhenOperator.prototype._start = function (out) {
        this.out = out;
        this.o._add(this.oil = new OtherIL(out, this));
        this.ins._add(this);
    };
    EndWhenOperator.prototype._stop = function () {
        this.ins._remove(this);
        this.o._remove(this.oil);
        this.out = null;
        this.oil = null;
    };
    EndWhenOperator.prototype.end = function () {
        var u = this.out;
        if (!u)
            return;
        u._c();
    };
    EndWhenOperator.prototype._n = function (t) {
        var u = this.out;
        if (!u)
            return;
        u._n(t);
    };
    EndWhenOperator.prototype._e = function (err) {
        var u = this.out;
        if (!u)
            return;
        u._e(err);
    };
    EndWhenOperator.prototype._c = function () {
        this.end();
    };
    return EndWhenOperator;
}());
exports.EndWhenOperator = EndWhenOperator;
var FilterOperator = (function () {
    function FilterOperator(passes, ins) {
        this.passes = passes;
        this.ins = ins;
        this.type = 'filter';
        this.out = null;
    }
    FilterOperator.prototype._start = function (out) {
        this.out = out;
        this.ins._add(this);
    };
    FilterOperator.prototype._stop = function () {
        this.ins._remove(this);
        this.out = null;
    };
    FilterOperator.prototype._n = function (t) {
        var u = this.out;
        if (!u)
            return;
        try {
            if (this.passes(t))
                u._n(t);
        }
        catch (e) {
            u._e(e);
        }
    };
    FilterOperator.prototype._e = function (err) {
        var u = this.out;
        if (!u)
            return;
        u._e(err);
    };
    FilterOperator.prototype._c = function () {
        var u = this.out;
        if (!u)
            return;
        u._c();
    };
    return FilterOperator;
}());
exports.FilterOperator = FilterOperator;
var FlattenListener = (function () {
    function FlattenListener(out, op) {
        this.out = out;
        this.op = op;
    }
    FlattenListener.prototype._n = function (t) {
        this.out._n(t);
    };
    FlattenListener.prototype._e = function (err) {
        this.out._e(err);
    };
    FlattenListener.prototype._c = function () {
        this.op.inner = null;
        this.op.less();
    };
    return FlattenListener;
}());
var FlattenOperator = (function () {
    function FlattenOperator(ins) {
        this.ins = ins;
        this.type = 'flatten';
        this.inner = null; // Current inner Stream
        this.il = null; // Current inner InternalListener
        this.open = true;
        this.out = null;
    }
    FlattenOperator.prototype._start = function (out) {
        this.out = out;
        this.ins._add(this);
    };
    FlattenOperator.prototype._stop = function () {
        this.ins._remove(this);
        this.inner = null;
        this.il = null;
        this.open = true;
        this.out = null;
    };
    FlattenOperator.prototype.less = function () {
        var u = this.out;
        if (!u)
            return;
        if (!this.open && !this.inner)
            u._c();
    };
    FlattenOperator.prototype._n = function (s) {
        var u = this.out;
        if (!u)
            return;
        var _a = this, inner = _a.inner, il = _a.il;
        if (inner && il)
            inner._remove(il);
        (this.inner = s)._add(this.il = new FlattenListener(u, this));
    };
    FlattenOperator.prototype._e = function (err) {
        var u = this.out;
        if (!u)
            return;
        u._e(err);
    };
    FlattenOperator.prototype._c = function () {
        this.open = false;
        this.less();
    };
    return FlattenOperator;
}());
exports.FlattenOperator = FlattenOperator;
var FoldOperator = (function () {
    function FoldOperator(f, seed, ins) {
        this.f = f;
        this.seed = seed;
        this.ins = ins;
        this.type = 'fold';
        this.out = null;
        this.acc = seed;
    }
    FoldOperator.prototype._start = function (out) {
        this.out = out;
        out._n(this.acc);
        this.ins._add(this);
    };
    FoldOperator.prototype._stop = function () {
        this.ins._remove(this);
        this.out = null;
        this.acc = this.seed;
    };
    FoldOperator.prototype._n = function (t) {
        var u = this.out;
        if (!u)
            return;
        try {
            u._n(this.acc = this.f(this.acc, t));
        }
        catch (e) {
            u._e(e);
        }
    };
    FoldOperator.prototype._e = function (err) {
        var u = this.out;
        if (!u)
            return;
        u._e(err);
    };
    FoldOperator.prototype._c = function () {
        var u = this.out;
        if (!u)
            return;
        u._c();
    };
    return FoldOperator;
}());
exports.FoldOperator = FoldOperator;
var LastOperator = (function () {
    function LastOperator(ins) {
        this.ins = ins;
        this.type = 'last';
        this.out = null;
        this.has = false;
        this.val = empty;
    }
    LastOperator.prototype._start = function (out) {
        this.out = out;
        this.ins._add(this);
    };
    LastOperator.prototype._stop = function () {
        this.ins._remove(this);
        this.out = null;
        this.has = false;
        this.val = empty;
    };
    LastOperator.prototype._n = function (t) {
        this.has = true;
        this.val = t;
    };
    LastOperator.prototype._e = function (err) {
        var u = this.out;
        if (!u)
            return;
        u._e(err);
    };
    LastOperator.prototype._c = function () {
        var u = this.out;
        if (!u)
            return;
        if (this.has) {
            u._n(this.val);
            u._c();
        }
        else {
            u._e('TODO show proper error');
        }
    };
    return LastOperator;
}());
exports.LastOperator = LastOperator;
var MapFlattenInner = (function () {
    function MapFlattenInner(out, op) {
        this.out = out;
        this.op = op;
    }
    MapFlattenInner.prototype._n = function (r) {
        this.out._n(r);
    };
    MapFlattenInner.prototype._e = function (err) {
        this.out._e(err);
    };
    MapFlattenInner.prototype._c = function () {
        this.op.inner = null;
        this.op.less();
    };
    return MapFlattenInner;
}());
var MapFlattenOperator = (function () {
    function MapFlattenOperator(mapOp) {
        this.mapOp = mapOp;
        this.inner = null; // Current inner Stream
        this.il = null; // Current inner InternalListener
        this.open = true;
        this.out = null;
        this.type = mapOp.type + "+flatten";
        this.ins = mapOp.ins;
    }
    MapFlattenOperator.prototype._start = function (out) {
        this.out = out;
        this.mapOp.ins._add(this);
    };
    MapFlattenOperator.prototype._stop = function () {
        this.mapOp.ins._remove(this);
        this.inner = null;
        this.il = null;
        this.open = true;
        this.out = null;
    };
    MapFlattenOperator.prototype.less = function () {
        if (!this.open && !this.inner) {
            var u = this.out;
            if (!u)
                return;
            u._c();
        }
    };
    MapFlattenOperator.prototype._n = function (v) {
        var u = this.out;
        if (!u)
            return;
        var _a = this, inner = _a.inner, il = _a.il;
        if (inner && il)
            inner._remove(il);
        try {
            (this.inner = this.mapOp.project(v))._add(this.il = new MapFlattenInner(u, this));
        }
        catch (e) {
            u._e(e);
        }
    };
    MapFlattenOperator.prototype._e = function (err) {
        var u = this.out;
        if (!u)
            return;
        u._e(err);
    };
    MapFlattenOperator.prototype._c = function () {
        this.open = false;
        this.less();
    };
    return MapFlattenOperator;
}());
exports.MapFlattenOperator = MapFlattenOperator;
var MapOperator = (function () {
    function MapOperator(project, ins) {
        this.project = project;
        this.ins = ins;
        this.type = 'map';
        this.out = null;
    }
    MapOperator.prototype._start = function (out) {
        this.out = out;
        this.ins._add(this);
    };
    MapOperator.prototype._stop = function () {
        this.ins._remove(this);
        this.out = null;
    };
    MapOperator.prototype._n = function (t) {
        var u = this.out;
        if (!u)
            return;
        try {
            u._n(this.project(t));
        }
        catch (e) {
            u._e(e);
        }
    };
    MapOperator.prototype._e = function (err) {
        var u = this.out;
        if (!u)
            return;
        u._e(err);
    };
    MapOperator.prototype._c = function () {
        var u = this.out;
        if (!u)
            return;
        u._c();
    };
    return MapOperator;
}());
exports.MapOperator = MapOperator;
var FilterMapOperator = (function (_super) {
    __extends(FilterMapOperator, _super);
    function FilterMapOperator(passes, project, ins) {
        _super.call(this, project, ins);
        this.passes = passes;
        this.type = 'filter+map';
    }
    FilterMapOperator.prototype._n = function (v) {
        if (this.passes(v)) {
            _super.prototype._n.call(this, v);
        }
        ;
    };
    return FilterMapOperator;
}(MapOperator));
exports.FilterMapOperator = FilterMapOperator;
var ReplaceErrorOperator = (function () {
    function ReplaceErrorOperator(fn, ins) {
        this.fn = fn;
        this.ins = ins;
        this.type = 'replaceError';
        this.out = empty;
    }
    ReplaceErrorOperator.prototype._start = function (out) {
        this.out = out;
        this.ins._add(this);
    };
    ReplaceErrorOperator.prototype._stop = function () {
        this.ins._remove(this);
        this.out = null;
    };
    ReplaceErrorOperator.prototype._n = function (t) {
        var u = this.out;
        if (!u)
            return;
        u._n(t);
    };
    ReplaceErrorOperator.prototype._e = function (err) {
        var u = this.out;
        if (!u)
            return;
        try {
            this.ins._remove(this);
            (this.ins = this.fn(err))._add(this);
        }
        catch (e) {
            u._e(e);
        }
    };
    ReplaceErrorOperator.prototype._c = function () {
        var u = this.out;
        if (!u)
            return;
        u._c();
    };
    return ReplaceErrorOperator;
}());
exports.ReplaceErrorOperator = ReplaceErrorOperator;
var StartWithOperator = (function () {
    function StartWithOperator(ins, value) {
        this.ins = ins;
        this.value = value;
        this.type = 'startWith';
        this.out = exports.emptyListener;
    }
    StartWithOperator.prototype._start = function (out) {
        this.out = out;
        this.out._n(this.value);
        this.ins._add(out);
    };
    StartWithOperator.prototype._stop = function () {
        this.ins._remove(this.out);
        this.out = null;
    };
    return StartWithOperator;
}());
exports.StartWithOperator = StartWithOperator;
var TakeOperator = (function () {
    function TakeOperator(max, ins) {
        this.max = max;
        this.ins = ins;
        this.type = 'take';
        this.out = null;
        this.taken = 0;
    }
    TakeOperator.prototype._start = function (out) {
        this.out = out;
        this.ins._add(this);
    };
    TakeOperator.prototype._stop = function () {
        this.ins._remove(this);
        this.out = null;
        this.taken = 0;
    };
    TakeOperator.prototype._n = function (t) {
        var u = this.out;
        if (!u)
            return;
        if (this.taken++ < this.max - 1) {
            u._n(t);
        }
        else {
            u._n(t);
            u._c();
            this._stop();
        }
    };
    TakeOperator.prototype._e = function (err) {
        var u = this.out;
        if (!u)
            return;
        u._e(err);
    };
    TakeOperator.prototype._c = function () {
        var u = this.out;
        if (!u)
            return;
        u._c();
    };
    return TakeOperator;
}());
exports.TakeOperator = TakeOperator;
var Stream = (function () {
    function Stream(producer) {
        this._stopID = empty;
        this._prod = producer;
        this._ils = [];
    }
    Stream.prototype._n = function (t) {
        var a = this._ils;
        var L = a.length;
        if (L == 1)
            a[0]._n(t);
        else {
            var b = copy(a);
            for (var i = 0; i < L; i++)
                b[i]._n(t);
        }
    };
    Stream.prototype._e = function (err) {
        var a = this._ils;
        var L = a.length;
        if (L == 1)
            a[0]._e(err);
        else {
            var b = copy(a);
            for (var i = 0; i < L; i++)
                b[i]._e(err);
        }
        this._x();
    };
    Stream.prototype._c = function () {
        var a = this._ils;
        var L = a.length;
        if (L == 1)
            a[0]._c();
        else {
            var b = copy(a);
            for (var i = 0; i < L; i++)
                b[i]._c();
        }
        this._x();
    };
    Stream.prototype._x = function () {
        if (this._ils.length === 0)
            return;
        if (this._prod)
            this._prod._stop();
        this._ils = [];
    };
    /**
     * Adds a Listener to the Stream.
     *
     * @param {Listener<T>} listener
     */
    Stream.prototype.addListener = function (listener) {
        if (typeof listener.next !== 'function'
            || typeof listener.error !== 'function'
            || typeof listener.complete !== 'function') {
            throw new Error('stream.addListener() requires all three next, error, ' +
                'and complete functions.');
        }
        listener._n = listener.next;
        listener._e = listener.error;
        listener._c = listener.complete;
        this._add(listener);
    };
    /**
     * Removes a Listener from the Stream, assuming the Listener was added to it.
     *
     * @param {Listener<T>} listener
     */
    Stream.prototype.removeListener = function (listener) {
        this._remove(listener);
    };
    Stream.prototype._add = function (il) {
        var a = this._ils;
        a.push(il);
        if (a.length === 1) {
            if (this._stopID !== empty) {
                clearTimeout(this._stopID);
                this._stopID = empty;
            }
            var p = this._prod;
            if (p)
                p._start(this);
        }
    };
    Stream.prototype._remove = function (il) {
        var a = this._ils;
        var i = a.indexOf(il);
        if (i > -1) {
            a.splice(i, 1);
            var p_1 = this._prod;
            if (p_1 && a.length <= 0) {
                this._stopID = setTimeout(function () { return p_1._stop(); });
            }
        }
    };
    Stream.prototype.ctor = function () {
        return this instanceof MemoryStream ? MemoryStream : Stream;
    };
    /**
     * Creates a new Stream given a Producer.
     *
     * @factory true
     * @param {Producer} producer An optional Producer that dictates how to
     * start, generate events, and stop the Stream.
     * @return {Stream}
     */
    Stream.create = function (producer) {
        if (producer) {
            if (typeof producer.start !== 'function'
                || typeof producer.stop !== 'function') {
                throw new Error('producer requires both start and stop functions');
            }
            internalizeProducer(producer); // mutates the input
        }
        return new Stream(producer);
    };
    /**
     * Creates a new MemoryStream given a Producer.
     *
     * @factory true
     * @param {Producer} producer An optional Producer that dictates how to
     * start, generate events, and stop the Stream.
     * @return {MemoryStream}
     */
    Stream.createWithMemory = function (producer) {
        if (producer) {
            internalizeProducer(producer); // mutates the input
        }
        return new MemoryStream(producer);
    };
    /**
     * Creates a new MimicStream, which can `imitate` another Stream. Only a
     * MimicStream has the `imitate()` method.
     *
     * @factory true
     * @return {MimicStream}
     */
    Stream.createMimic = function () {
        return new MimicStream();
    };
    /**
     * Creates a Stream that does nothing when started. It never emits any event.
     *
     * Marble diagram:
     *
     * ```text
     *          never
     * -----------------------
     * ```
     *
     * @factory true
     * @return {Stream}
     */
    Stream.never = function () {
        return new Stream({ _start: noop, _stop: noop });
    };
    /**
     * Creates a Stream that immediately emits the "complete" notification when
     * started, and that's it.
     *
     * Marble diagram:
     *
     * ```text
     * empty
     * -|
     * ```
     *
     * @factory true
     * @return {Stream}
     */
    Stream.empty = function () {
        return new Stream({
            _start: function (il) { il._c(); },
            _stop: noop,
        });
    };
    /**
     * Creates a Stream that immediately emits an "error" notification with the
     * value you passed as the `error` argument when the stream starts, and that's
     * it.
     *
     * Marble diagram:
     *
     * ```text
     * throw(X)
     * -X
     * ```
     *
     * @factory true
     * @param error The error event to emit on the created stream.
     * @return {Stream}
     */
    Stream.throw = function (error) {
        return new Stream({
            _start: function (il) { il._e(error); },
            _stop: noop,
        });
    };
    /**
     * Creates a Stream that immediately emits the arguments that you give to
     * *of*, then completes.
     *
     * Marble diagram:
     *
     * ```text
     * of(1,2,3)
     * 123|
     * ```
     *
     * @factory true
     * @param a The first value you want to emit as an event on the stream.
     * @param b The second value you want to emit as an event on the stream. One
     * or more of these values may be given as arguments.
     * @return {Stream}
     */
    Stream.of = function () {
        var items = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            items[_i - 0] = arguments[_i];
        }
        return Stream.fromArray(items);
    };
    /**
     * Converts an array to a stream. The returned stream will emit synchronously
     * all the items in the array, and then complete.
     *
     * Marble diagram:
     *
     * ```text
     * fromArray([1,2,3])
     * 123|
     * ```
     *
     * @factory true
     * @param {Array} array The array to be converted as a stream.
     * @return {Stream}
     */
    Stream.fromArray = function (array) {
        return new Stream(new FromArrayProducer(array));
    };
    /**
     * Converts a promise to a stream. The returned stream will emit the resolved
     * value of the promise, and then complete. However, if the promise is
     * rejected, the stream will emit the corresponding error.
     *
     * Marble diagram:
     *
     * ```text
     * fromPromise( ----42 )
     * -----------------42|
     * ```
     *
     * @factory true
     * @param {Promise} promise The promise to be converted as a stream.
     * @return {Stream}
     */
    Stream.fromPromise = function (promise) {
        return new Stream(new FromPromiseProducer(promise));
    };
    /**
     * Creates a stream that periodically emits incremental numbers, every
     * `period` milliseconds.
     *
     * Marble diagram:
     *
     * ```text
     *     periodic(1000)
     * ---0---1---2---3---4---...
     * ```
     *
     * @factory true
     * @param {number} period The interval in milliseconds to use as a rate of
     * emission.
     * @return {Stream}
     */
    Stream.periodic = function (period) {
        return new Stream(new PeriodicProducer(period));
    };
    /**
     * Blends multiple streams together, emitting events from all of them
     * concurrently.
     *
     * *merge* takes multiple streams as arguments, and creates a stream that
     * imitates each of the argument streams, in parallel.
     *
     * Marble diagram:
     *
     * ```text
     * --1----2-----3--------4---
     * ----a-----b----c---d------
     *            merge
     * --1-a--2--b--3-c---d--4---
     * ```
     *
     * @factory true
     * @param {Stream} stream1 A stream to merge together with other streams.
     * @param {Stream} stream2 A stream to merge together with other streams. Two
     * or more streams may be given as arguments.
     * @return {Stream}
     */
    Stream.merge = function () {
        var streams = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            streams[_i - 0] = arguments[_i];
        }
        return new Stream(new MergeProducer(streams));
    };
    Stream.prototype._map = function (project) {
        var p = this._prod;
        var ctor = this.ctor();
        if (p instanceof FilterOperator) {
            return new ctor(new FilterMapOperator(p.passes, project, p.ins));
        }
        if (p instanceof FilterMapOperator) {
            return new ctor(new FilterMapOperator(p.passes, compose2(project, p.project), p.ins));
        }
        if (p instanceof MapOperator) {
            return new ctor(new MapOperator(compose2(project, p.project), p.ins));
        }
        return new ctor(new MapOperator(project, this));
    };
    /**
     * Transforms each event from the input Stream through a `project` function,
     * to get a Stream that emits those transformed events.
     *
     * Marble diagram:
     *
     * ```text
     * --1---3--5-----7------
     *    map(i => i * 10)
     * --10--30-50----70-----
     * ```
     *
     * @param {Function} project A function of type `(t: T) => U` that takes event
     * `t` of type `T` from the input Stream and produces an event of type `U`, to
     * be emitted on the output Stream.
     * @return {Stream}
     */
    Stream.prototype.map = function (project) {
        return this._map(project);
    };
    /**
     * It's like `map`, but transforms each input event to always the same
     * constant value on the output Stream.
     *
     * Marble diagram:
     *
     * ```text
     * --1---3--5-----7-----
     *       mapTo(10)
     * --10--10-10----10----
     * ```
     *
     * @param projectedValue A value to emit on the output Stream whenever the
     * input Stream emits any value.
     * @return {Stream}
     */
    Stream.prototype.mapTo = function (projectedValue) {
        var s = this.map(function () { return projectedValue; });
        var op = s._prod;
        op.type = op.type.replace('map', 'mapTo');
        return s;
    };
    /**
     * Only allows events that pass the test given by the `passes` argument.
     *
     * Each event from the input stream is given to the `passes` function. If the
     * function returns `true`, the event is forwarded to the output stream,
     * otherwise it is ignored and not forwarded.
     *
     * Marble diagram:
     *
     * ```text
     * --1---2--3-----4-----5---6--7-8--
     *     filter(i => i % 2 === 0)
     * ------2--------4---------6----8--
     * ```
     *
     * @param {Function} passes A function of type `(t: T) +> boolean` that takes
     * an event from the input stream and checks if it passes, by returning a
     * boolean.
     * @return {Stream}
     */
    Stream.prototype.filter = function (passes) {
        var p = this._prod;
        if (p instanceof FilterOperator) {
            return new Stream(new FilterOperator(and(passes, p.passes), p.ins));
        }
        return new Stream(new FilterOperator(passes, this));
    };
    /**
     * Lets the first `amount` many events from the input stream pass to the
     * output stream, then makes the output stream complete.
     *
     * Marble diagram:
     *
     * ```text
     * --a---b--c----d---e--
     *    take(3)
     * --a---b--c|
     * ```
     *
     * @param {number} amount How many events to allow from the input stream
     * before completing the output stream.
     * @return {Stream}
     */
    Stream.prototype.take = function (amount) {
        return new (this.ctor())(new TakeOperator(amount, this));
    };
    /**
     * Ignores the first `amount` many events from the input stream, and then
     * after that starts forwarding events from the input stream to the output
     * stream.
     *
     * Marble diagram:
     *
     * ```text
     * --a---b--c----d---e--
     *       drop(3)
     * --------------d---e--
     * ```
     *
     * @param {number} amount How many events to ignore from the input stream
     * before forwarding all events from the input stream to the output stream.
     * @return {Stream}
     */
    Stream.prototype.drop = function (amount) {
        return new Stream(new DropOperator(amount, this));
    };
    /**
     * When the input stream completes, the output stream will emit the last event
     * emitted by the input stream, and then will also complete.
     *
     * Marble diagram:
     *
     * ```text
     * --a---b--c--d----|
     *       last()
     * -----------------d|
     * ```
     *
     * @return {Stream}
     */
    Stream.prototype.last = function () {
        return new Stream(new LastOperator(this));
    };
    /**
     * Prepends the given `initial` value to the sequence of events emitted by the
     * input stream. The returned stream is a MemoryStream, which means it is
     * already `remember()`'d.
     *
     * Marble diagram:
     *
     * ```text
     * ---1---2-----3---
     *   startWith(0)
     * 0--1---2-----3---
     * ```
     *
     * @param initial The value or event to prepend.
     * @return {MemoryStream}
     */
    Stream.prototype.startWith = function (initial) {
        return new MemoryStream(new StartWithOperator(this, initial));
    };
    /**
     * Uses another stream to determine when to complete the current stream.
     *
     * When the given `other` stream emits an event or completes, the output
     * stream will complete. Before that happens, the output stream will imitate
     * whatever happens on the input stream.
     *
     * Marble diagram:
     *
     * ```text
     * ---1---2-----3--4----5----6---
     *   endWhen( --------a--b--| )
     * ---1---2-----3--4--|
     * ```
     *
     * @param other Some other stream that is used to know when should the output
     * stream of this operator complete.
     * @return {Stream}
     */
    Stream.prototype.endWhen = function (other) {
        return new (this.ctor())(new EndWhenOperator(other, this));
    };
    /**
     * "Folds" the stream onto itself.
     *
     * Combines events from the past throughout
     * the entire execution of the input stream, allowing you to accumulate them
     * together. It's essentially like `Array.prototype.reduce`. The returned
     * stream is a MemoryStream, which means it is already `remember()`'d.
     *
     * The output stream starts by emitting the `seed` which you give as argument.
     * Then, when an event happens on the input stream, it is combined with that
     * seed value through the `accumulate` function, and the output value is
     * emitted on the output stream. `fold` remembers that output value as `acc`
     * ("accumulator"), and then when a new input event `t` happens, `acc` will be
     * combined with that to produce the new `acc` and so forth.
     *
     * Marble diagram:
     *
     * ```text
     * ------1-----1--2----1----1------
     *   fold((acc, x) => acc + x, 3)
     * 3-----4-----5--7----8----9------
     * ```
     *
     * @param {Function} accumulate A function of type `(acc: R, t: T) => R` that
     * takes the previous accumulated value `acc` and the incoming event from the
     * input stream and produces the new accumulated value.
     * @param seed The initial accumulated value, of type `R`.
     * @return {MemoryStream}
     */
    Stream.prototype.fold = function (accumulate, seed) {
        return new MemoryStream(new FoldOperator(accumulate, seed, this));
    };
    /**
     * Replaces an error with another stream.
     *
     * When (and if) an error happens on the input stream, instead of forwarding
     * that error to the output stream, *replaceError* will call the `replace`
     * function which returns the stream that the output stream will imitate. And,
     * in case that new stream also emits an error, `replace` will be called again
     * to get another stream to start imitating.
     *
     * Marble diagram:
     *
     * ```text
     * --1---2-----3--4-----X
     *   replaceError( () => --10--| )
     * --1---2-----3--4--------10--|
     * ```
     *
     * @param {Function} replace A function of type `(err) => Stream` that takes
     * the error that occurred on the input stream or on the previous replacement
     * stream and returns a new stream. The output stream will imitate the stream
     * that this function returns.
     * @return {Stream}
     */
    Stream.prototype.replaceError = function (replace) {
        return new (this.ctor())(new ReplaceErrorOperator(replace, this));
    };
    /**
     * Flattens a "stream of streams", handling only one nested stream at a time
     * (no concurrency).
     *
     * If the input stream is a stream that emits streams, then this operator will
     * return an output stream which is a flat stream: emits regular events. The
     * flattening happens without concurrency. It works like this: when the input
     * stream emits a nested stream, *flatten* will start imitating that nested
     * one. However, as soon as the next nested stream is emitted on the input
     * stream, *flatten* will forget the previous nested one it was imitating, and
     * will start imitating the new nested one.
     *
     * Marble diagram:
     *
     * ```text
     * --+--------+---------------
     *   \        \
     *    \       ----1----2---3--
     *    --a--b----c----d--------
     *           flatten
     * -----a--b------1----2---3--
     * ```
     *
     * @return {Stream}
     */
    Stream.prototype.flatten = function () {
        var p = this._prod;
        return new Stream(p instanceof MapOperator && !(p instanceof FilterMapOperator) ?
            new MapFlattenOperator(p) :
            new FlattenOperator(this));
    };
    /**
     * Passes the input stream to a custom operator, to produce an output stream.
     *
     * *compose* is a handy way of using an existing function in a chained style.
     * Instead of writing `outStream = f(inStream)` you can write
     * `outStream = inStream.compose(f)`.
     *
     * @param {function} operator A function that takes a stream as input and
     * returns a stream as well.
     * @return {Stream}
     */
    Stream.prototype.compose = function (operator) {
        return operator(this);
    };
    /**
     * Returns an output stream that imitates the input stream, but also remembers
     * the most recent event that happens on the input stream, so that a newly
     * added listener will immediately receive that memorised event.
     *
     * @return {MemoryStream}
     */
    Stream.prototype.remember = function () {
        var _this = this;
        return new MemoryStream({
            _start: function (il) { _this._prod._start(il); },
            _stop: function () { _this._prod._stop(); },
        });
    };
    /**
     * Returns an output stream that identically imitates the input stream, but
     * also runs a `spy` function fo each event, to help you debug your app.
     *
     * *debug* takes a `spy` function as argument, and runs that for each event
     * happening on the input stream. If you don't provide the `spy` argument,
     * then *debug* will just `console.log` each event. This helps you to
     * understand the flow of events through some operator chain.
     *
     * Please note that if the output stream has no listeners, then it will not
     * start, which means `spy` will never run because no actual event happens in
     * that case.
     *
     * Marble diagram:
     *
     * ```text
     * --1----2-----3-----4--
     *         debug
     * --1----2-----3-----4--
     * ```
     *
     * @param {function} labelOrSpy A string to use as the label when printing
     * debug information on the console, or a 'spy' function that takes an event
     * as argument, and does not need to return anything.
     * @return {Stream}
     */
    Stream.prototype.debug = function (labelOrSpy) {
        return new (this.ctor())(new DebugOperator(labelOrSpy, this));
    };
    /**
     * Forces the Stream to emit the given value to its listeners.
     *
     * As the name indicates, if you use this, you are most likely doing something
     * The Wrong Way. Please try to understand the reactive way before using this
     * method. Use it only when you know what you are doing.
     *
     * @param value The "next" value you want to broadcast to all listeners of
     * this Stream.
     */
    Stream.prototype.shamefullySendNext = function (value) {
        this._n(value);
    };
    /**
     * Forces the Stream to emit the given error to its listeners.
     *
     * As the name indicates, if you use this, you are most likely doing something
     * The Wrong Way. Please try to understand the reactive way before using this
     * method. Use it only when you know what you are doing.
     *
     * @param {any} error The error you want to broadcast to all the listeners of
     * this Stream.
     */
    Stream.prototype.shamefullySendError = function (error) {
        this._e(error);
    };
    /**
     * Forces the Stream to emit the "completed" event to its listeners.
     *
     * As the name indicates, if you use this, you are most likely doing something
     * The Wrong Way. Please try to understand the reactive way before using this
     * method. Use it only when you know what you are doing.
     */
    Stream.prototype.shamefullySendComplete = function () {
        this._c();
    };
    /**
     * Combines multiple streams together to return a stream whose events are
     * calculated from the latest events of each of the input streams.
     *
     * *combine* remembers the most recent event from each of the input streams.
     * When any of the input streams emits an event, that event together with all
     * the other saved events are combined in the `project` function which should
     * return a value. That value will be emitted on the output stream. It's
     * essentially a way of mixing the events from multiple streams according to a
     * formula.
     *
     * Marble diagram:
     *
     * ```text
     * --1----2-----3--------4---
     * ----a-----b-----c--d------
     *   combine((x,y) => x+y)
     * ----1a-2a-2b-3b-3c-3d-4d--
     * ```
     *
     * @factory true
     * @param {Function} project A function of type `(x: T1, y: T2) => R` or
     * similar that takes the most recent events `x` and `y` from the input
     * streams and returns a value. The output stream will emit that value. The
     * number of arguments for this function should match the number of input
     * streams.
     * @param {Stream} stream1 A stream to combine together with other streams.
     * @param {Stream} stream2 A stream to combine together with other streams.
     * Two or more streams may be given as arguments.
     * @return {Stream}
     */
    Stream.combine = function combine(project) {
        var streams = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            streams[_i - 1] = arguments[_i];
        }
        return new Stream(new CombineProducer(project, streams));
    };
    return Stream;
}());
exports.Stream = Stream;
var MimicStream = (function (_super) {
    __extends(MimicStream, _super);
    function MimicStream() {
        _super.call(this);
    }
    MimicStream.prototype._add = function (il) {
        var t = this._target;
        if (!t)
            return;
        t._add(il);
    };
    MimicStream.prototype._remove = function (il) {
        var t = this._target;
        if (!t)
            return;
        t._remove(il);
    };
    /**
     * This method exists only on a MimicStream, which is created through
     * `xs.createMimic()`. `imitate` changes this current MimicStream to imitate
     * the `other` given stream.
     *
     * The *imitate* method returns nothing. Instead, it changes the behavior of
     * the current stream, making it re-emit whatever events are emitted by the
     * given `other` stream.
     *
     * @param {Stream} other The stream to imitate on the current one. Must not be
     * a MemoryStream.
     */
    MimicStream.prototype.imitate = function (other) {
        if (other instanceof MemoryStream) {
            throw new Error('A MemoryStream was given to imitate(), but it only ' +
                'supports a Stream. Read more about this restriction here: ' +
                'https://github.com/staltz/xstream#faq');
        }
        this._target = other;
    };
    return MimicStream;
}(Stream));
exports.MimicStream = MimicStream;
var MemoryStream = (function (_super) {
    __extends(MemoryStream, _super);
    function MemoryStream(producer) {
        _super.call(this, producer);
        this._has = false;
    }
    MemoryStream.prototype._n = function (x) {
        this._v = x;
        this._has = true;
        _super.prototype._n.call(this, x);
    };
    MemoryStream.prototype._add = function (il) {
        if (this._has) {
            il._n(this._v);
        }
        _super.prototype._add.call(this, il);
    };
    MemoryStream.prototype._x = function () {
        this._has = false;
        _super.prototype._x.call(this);
    };
    MemoryStream.prototype.map = function (project) {
        return this._map(project);
    };
    MemoryStream.prototype.mapTo = function (projectedValue) {
        return _super.prototype.mapTo.call(this, projectedValue);
    };
    MemoryStream.prototype.take = function (amount) {
        return _super.prototype.take.call(this, amount);
    };
    MemoryStream.prototype.endWhen = function (other) {
        return _super.prototype.endWhen.call(this, other);
    };
    MemoryStream.prototype.replaceError = function (replace) {
        return _super.prototype.replaceError.call(this, replace);
    };
    MemoryStream.prototype.debug = function (labelOrSpy) {
        return _super.prototype.debug.call(this, labelOrSpy);
    };
    return MemoryStream;
}(Stream));
exports.MemoryStream = MemoryStream;
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Stream;

},{}],105:[function(require,module,exports){
"use strict";
var core_1 = require('../core');
var ConcatProducer = (function () {
    function ConcatProducer(streams) {
        this.streams = streams;
        this.type = 'concat';
        this.out = null;
        this.i = 0;
    }
    ConcatProducer.prototype._start = function (out) {
        this.out = out;
        this.streams[this.i]._add(this);
    };
    ConcatProducer.prototype._stop = function () {
        var streams = this.streams;
        if (this.i < streams.length) {
            streams[this.i]._remove(this);
        }
        this.i = 0;
        this.out = null;
    };
    ConcatProducer.prototype._n = function (t) {
        var u = this.out;
        if (!u)
            return;
        u._n(t);
    };
    ConcatProducer.prototype._e = function (err) {
        var u = this.out;
        if (!u)
            return;
        u._e(err);
    };
    ConcatProducer.prototype._c = function () {
        var u = this.out;
        if (!u)
            return;
        var streams = this.streams;
        streams[this.i]._remove(this);
        if (++this.i < streams.length) {
            streams[this.i]._add(this);
        }
        else {
            u._c();
        }
    };
    return ConcatProducer;
}());
/**
 * Puts one stream after the other. *concat* is a factory that takes multiple
 * streams as arguments, and starts the `n+1`-th stream only when the `n`-th
 * stream has completed. It concatenates those streams together.
 *
 * Marble diagram:
 *
 * ```text
 * --1--2---3---4-|
 * ...............--a-b-c--d-|
 *           concat
 * --1--2---3---4---a-b-c--d-|
 * ```
 *
 * Example:
 *
 * ```js
 * import concat from 'xstream/extra/concat'
 *
 * const streamA = xs.of('a', 'b', 'c')
 * const streamB = xs.of(10, 20, 30)
 * const streamC = xs.of('X', 'Y', 'Z')
 *
 * const outputStream = concat(streamA, streamB, streamC)
 *
 * outputStream.addListener({
 *   next: (x) => console.log(x),
 *   error: (err) => console.error(err),
 *   complete: () => console.log('concat completed'),
 * })
 * ```
 *
 * @factory true
 * @param {Stream} stream1 A stream to concatenate together with other streams.
 * @param {Stream} stream2 A stream to concatenate together with other streams. Two
 * or more streams may be given as arguments.
 * @return {Stream}
 */
function concat() {
    var streams = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        streams[_i - 0] = arguments[_i];
    }
    return new core_1.Stream(new ConcatProducer(streams));
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = concat;

},{"../core":104}],106:[function(require,module,exports){
"use strict";
var core_1 = require('../core');
var empty = {};
var DropRepeatsOperator = (function () {
    function DropRepeatsOperator(fn, ins) {
        this.fn = fn;
        this.ins = ins;
        this.type = 'dropRepeats';
        this.out = null;
        this.v = empty;
    }
    DropRepeatsOperator.prototype._start = function (out) {
        this.out = out;
        this.ins._add(this);
    };
    DropRepeatsOperator.prototype._stop = function () {
        this.ins._remove(this);
        this.out = null;
        this.v = empty;
    };
    DropRepeatsOperator.prototype.isEq = function (x, y) {
        return this.fn ? this.fn(x, y) : x === y;
    };
    DropRepeatsOperator.prototype._n = function (t) {
        var u = this.out;
        if (!u)
            return;
        var v = this.v;
        if (v === empty || !this.isEq(t, v)) {
            u._n(t);
        }
        this.v = t;
    };
    DropRepeatsOperator.prototype._e = function (err) {
        var u = this.out;
        if (!u)
            return;
        u._e(err);
    };
    DropRepeatsOperator.prototype._c = function () {
        var u = this.out;
        if (!u)
            return;
        u._c();
    };
    return DropRepeatsOperator;
}());
exports.DropRepeatsOperator = DropRepeatsOperator;
function dropRepeats(isEqual) {
    if (isEqual === void 0) { isEqual = null; }
    return function dropRepeatsOperator(ins) {
        return new core_1.Stream(new DropRepeatsOperator(isEqual, ins));
    };
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = dropRepeats;

},{"../core":104}],107:[function(require,module,exports){
"use strict";
var core_1 = require('./core');
exports.Stream = core_1.Stream;
exports.MemoryStream = core_1.MemoryStream;
exports.MimicStream = core_1.MimicStream;
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = core_1.Stream;

},{"./core":104}],108:[function(require,module,exports){
'use strict';

var _xstreamRun = require('@cycle/xstream-run');

var _dom = require('@cycle/dom');

var _history = require('@cycle/history');

var _history2 = require('history');

var _storage = require('@cycle/storage');

var _storage2 = _interopRequireDefault(_storage);

var _index = require('./components/TaskList/index');

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var main = _index2.default;

// THE ENTRY POINT
// This is where the whole story starts.
// `run` receives a main function and an object
// with the drivers.

// THE MAIN FUNCTION
// This is the todo list component.
(0, _xstreamRun.run)(main, {
  // THE DOM DRIVER
  // `makeDOMDriver(container)` from Cycle DOM returns a
  // driver function to interact with the DOM.
  DOM: (0, _dom.makeDOMDriver)('.todoapp', { transposition: true }),
  // THE HISTORY DRIVER
  // A driver to interact with browser history
  History: (0, _history.makeHistoryDriver)((0, _history2.createHistory)(), { capture: true }),
  // THE STORAGE DRIVER
  // The storage driver which can be used to access values for
  // local- and sessionStorage keys as streams.
  storage: _storage2.default
});

},{"./components/TaskList/index":113,"@cycle/dom":11,"@cycle/history":22,"@cycle/storage":27,"@cycle/xstream-run":32,"history":53}],109:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _intent = require('./intent');

var _intent2 = _interopRequireDefault(_intent);

var _model = require('./model');

var _model2 = _interopRequireDefault(_model);

var _view = require('./view');

var _view2 = _interopRequireDefault(_view);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// THE TODO ITEM FUNCTION
// This is a simple todo item component,
// structured with the MVI-pattern.
function Task(_ref) {
  var DOM = _ref.DOM;
  var props$ = _ref.props$;

  var action$ = (0, _intent2.default)(DOM);
  var state$ = (0, _model2.default)(props$, action$);
  var vtree$ = (0, _view2.default)(state$);

  return {
    DOM: vtree$,
    action$: action$
  };
}

exports.default = Task;

},{"./intent":110,"./model":111,"./view":112}],110:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _xstream = require('xstream');

var _xstream2 = _interopRequireDefault(_xstream);

var _utils = require('../../utils');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// THE TODO ITEM INTENT
// This intent function returns a stream of all the different,
// actions that can be taken on a todo.
function intent(DOMSource) {
  // THE INTENT MERGE
  // Merge all actions into one stream.
  return _xstream2.default.merge(
  // THE DESTROY ACTION STREAM
  DOMSource.select('.destroy').events('click').mapTo({ type: 'destroy' }),

  // THE TOGGLE ACTION STREAM
  DOMSource.select('.toggle').events('change').mapTo({ type: 'toggle' }),

  // THE START EDIT ACTION STREAM
  DOMSource.select('label').events('dblclick').mapTo({ type: 'startEdit' }),

  // THE ESC KEY ACTION STREAM
  DOMSource.select('.edit').events('keyup').filter(function (ev) {
    return ev.keyCode === _utils.ESC_KEY;
  }).mapTo({ type: 'cancelEdit' }),

  // THE ENTER KEY ACTION STREAM
  DOMSource.select('.edit').events('keyup').filter(function (ev) {
    return ev.keyCode === _utils.ENTER_KEY;
  }).compose(function (s) {
    return _xstream2.default.merge(s, DOMSource.select('.edit').events('blur', true));
  }).map(function (ev) {
    return { title: ev.target.value, type: 'doneEdit' };
  }));
}

exports.default = intent;

},{"../../utils":119,"xstream":107}],111:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _xstream = require('xstream');

var _xstream2 = _interopRequireDefault(_xstream);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function model(props$, action$) {
  // THE SANITIZED PROPERTIES
  // If the list item has no data set it as empty and not completed.
  var sanitizedProps$ = props$.startWith({ title: '', completed: false });

  // THE EDITING STREAM
  // Create a stream that emits booleans that represent the
  // "is editing" state.
  var editing$ = _xstream2.default.merge(action$.filter(function (a) {
    return a.type === 'startEdit';
  }).mapTo(true), action$.filter(function (a) {
    return a.type === 'doneEdit';
  }).mapTo(false), action$.filter(function (a) {
    return a.type === 'cancelEdit';
  }).mapTo(false)).startWith(false);

  return _xstream2.default.combine(function (_ref, editing) {
    var title = _ref.title;
    var completed = _ref.completed;
    return {
      title: title,
      isCompleted: completed,
      isEditing: editing
    };
  }, sanitizedProps$, editing$);
}

exports.default = model;

},{"xstream":107}],112:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _dom = require('@cycle/dom');

function view(state$) {
  return state$.map(function (_ref) {
    var title = _ref.title;
    var isCompleted = _ref.isCompleted;
    var isEditing = _ref.isEditing;

    var todoRootClasses = {
      completed: isCompleted,
      editing: isEditing
    };

    return (0, _dom.li)('.todoRoot', { class: todoRootClasses }, [(0, _dom.div)('.view', [(0, _dom.input)('.toggle', {
      props: { type: 'checkbox', checked: isCompleted }
    }), (0, _dom.label)(title), (0, _dom.button)('.destroy')]), (0, _dom.input)('.edit', {
      props: { type: 'text' },
      hook: {
        update: function update(oldVNode, _ref2) {
          var elm = _ref2.elm;

          elm.value = title;
          if (isEditing) {
            elm.focus();
            elm.selectionStart = elm.value.length;
          }
        }
      }
    })]);
  });
}

exports.default = view;

},{"@cycle/dom":11}],113:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _xstream = require('xstream');

var _xstream2 = _interopRequireDefault(_xstream);

var _isolate = require('@cycle/isolate');

var _isolate2 = _interopRequireDefault(_isolate);

var _intent = require('./intent');

var _intent2 = _interopRequireDefault(_intent);

var _model = require('./model');

var _model2 = _interopRequireDefault(_model);

var _view = require('./view');

var _view2 = _interopRequireDefault(_view);

var _storageSource = require('./storage-source');

var _storageSource2 = _interopRequireDefault(_storageSource);

var _storageSink = require('./storage-sink');

var _storageSink2 = _interopRequireDefault(_storageSink);

var _index = require('../Task/index');

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

// AMEND STATE WITH CHILDREN
// This function creates the projection function
// for the map function below.
function amendStateWithChildren(DOMSource) {
  return function (todosData) {
    return _extends({}, todosData, {
      // The list property is the only one being amended.
      // We map over the array in the list property to
      // enhance them with the actual todo item data flow components.
      list: todosData.list.map(function (data) {
        // Turn the data item into an Observable
        var props$ = _xstream2.default.of(data);
        // Create scoped todo item dataflow component.
        var todoItem = (0, _isolate2.default)(_index2.default)({ DOM: DOMSource, props$: props$ });

        // Return the new data item for the list property array.
        return _extends({}, data, {
          // This is a new property containing the DOM- and action stream of
          // the todo item.
          todoItem: {
            DOM: todoItem.DOM,
            action$: todoItem.action$.map(function (ev) {
              return _extends({}, ev, { id: data.id });
            })
          }
        });
      })
    });
  };
}

// THE TASKLIST COMPONENT
// This is the TaskList component which is being exported below.
function TaskList(sources) {
  // THE LOCALSTORAGE STREAM
  // Here we create a localStorage stream that only streams
  // the first value read from localStorage in order to
  // supply the application with initial state.
  var localStorage$ = sources.storage.local.getItem('todos-cycle').take(1);
  // THE INITIAL TODO DATA
  // The `deserialize` function takes the serialized JSON stored in localStorage
  // and turns it into a stream sending a JSON object.
  var sourceTodosData$ = (0, _storageSource2.default)(localStorage$);
  // THE PROXY ITEM ACTION STREAM
  // We create a stream as a proxy for all the actions from each task.
  var proxyItemAction$ = _xstream2.default.createMimic();
  // THE INTENT (MVI PATTERN)
  // Pass relevant sources to the intent function, which set up
  // streams that model the users actions.
  var action$ = (0, _intent2.default)(sources.DOM, sources.History, proxyItemAction$);
  // THE MODEL (MVI PATTERN)
  // Actions get passed to the model function which transforms the data
  // coming through and prepares the data for the view.
  var state$ = (0, _model2.default)(action$, sourceTodosData$);
  // AMEND STATE WITH CHILDREN
  var amendedState$ = state$.map(amendStateWithChildren(sources.DOM)).remember();
  // A STREAM OF ALL ACTIONS ON ALL TASKS
  // Each todo item has an action stream. All those action streams are being
  // merged into a stream of all actions. Below this stream is passed into
  // the proxyItemAction$ that we passed to the intent function above.
  // This is how the intent on all the todo items flows back through the intent
  // function of the list and can be handled in the model function of the list.
  var itemAction$ = amendedState$.map(function (_ref) {
    var list = _ref.list;
    return _xstream2.default.merge.apply(_xstream2.default, _toConsumableArray(list.map(function (i) {
      return i.todoItem.action$;
    })));
  }).flatten();
  // PASS REAL ITEM ACTIONS TO PROXY
  // The item actions are passed to the proxy object.
  proxyItemAction$.imitate(itemAction$);
  // THE VIEW (MVI PATTERN)
  // We render state as markup for the DOM.
  var vdom$ = (0, _view2.default)(amendedState$);
  // WRITE TO LOCALSTORAGE
  // The latest state is written to localStorage.
  var storage$ = (0, _storageSink2.default)(state$).map(function (state) {
    return {
      key: 'todos-cycle', value: state
    };
  });
  // COMPLETE THE CYCLE
  // Write the virtual dom stream to the DOM and write the
  // storage stream to localStorage.
  var sinks = {
    DOM: vdom$,
    storage: storage$
  };
  return sinks;
}

exports.default = TaskList;

},{"../Task/index":109,"./intent":114,"./model":115,"./storage-sink":116,"./storage-source":117,"./view":118,"@cycle/isolate":26,"xstream":107}],114:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

exports.default = intent;

var _xstream = require('xstream');

var _xstream2 = _interopRequireDefault(_xstream);

var _dropRepeats = require('xstream/extra/dropRepeats');

var _dropRepeats2 = _interopRequireDefault(_dropRepeats);

var _utils = require('../../utils');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// THE INTENT FOR THE LIST
function intent(DOMSource, History, itemAction$) {
  return _xstream2.default.merge(
  // THE ROUTE STREAM
  // A stream that provides the path whenever the route changes.
  History.startWith({ pathname: '/' }).map(function (location) {
    return location.pathname;
  }).compose((0, _dropRepeats2.default)()).map(function (payload) {
    return { type: 'changeRoute', payload: payload };
  }),

  // THE URL STREAM
  // A stream of URL clicks in the app
  DOMSource.select('a').events('click').map(function (event) {
    return event.target.hash.replace('#', '');
  }).map(function (payload) {
    return { type: 'url', payload: payload };
  }),

  // CLEAR INPUT STREAM
  // A stream of ESC key strokes in the `.new-todo` field.
  DOMSource.select('.new-todo').events('keydown').filter(function (ev) {
    return ev.keyCode === _utils.ESC_KEY;
  }).map(function (payload) {
    return { type: 'clearInput', payload: payload };
  }),

  // ENTER KEY STREAM
  // A stream of ENTER key strokes in the `.new-todo` field.
  DOMSource.select('.new-todo').events('keydown')
  // Trim value and only let the data through when there
  // is anything but whitespace in the field and the ENTER key was hit.
  .filter(function (ev) {
    var trimmedVal = String(ev.target.value).trim();
    return ev.keyCode === _utils.ENTER_KEY && trimmedVal;
  })
  // Return the trimmed value.
  .map(function (ev) {
    return String(ev.target.value).trim();
  }).map(function (payload) {
    return { type: 'insertTodo', payload: payload };
  }),

  // TOGGLE STREAM
  // Create a stream out of all the toggle actions on the todo items.
  itemAction$.filter(function (action) {
    return action.type === 'toggle';
  }).map(function (action) {
    return _extends({}, action, { type: 'toggleTodo' });
  }),

  // DELETE STREAM
  // Create a stream out of all the destroy actions on the todo items.
  itemAction$.filter(function (action) {
    return action.type === 'destroy';
  }).map(function (action) {
    return _extends({}, action, { type: 'deleteTodo' });
  }),

  // EDIT STREAM
  // Create a stream out of all the doneEdit actions on the todo items.
  itemAction$.filter(function (action) {
    return action.type === 'doneEdit';
  }).map(function (action) {
    return _extends({}, action, { type: 'editTodo' });
  }),

  // TOGGLE ALL STREAM
  // Create a stream out of the clicks on the `.toggle-all` button.
  DOMSource.select('.toggle-all').events('click').mapTo({ type: 'toggleAll' }),

  // DELETE COMPLETED TODOS STREAM
  // A stream of click events on the `.clear-completed` element.
  DOMSource.select('.clear-completed').events('click').mapTo({ type: 'deleteCompleteds' }));
};

},{"../../utils":119,"xstream":107,"xstream/extra/dropRepeats":106}],115:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _xstream = require('xstream');

var _xstream2 = _interopRequireDefault(_xstream);

var _concat = require('xstream/extra/concat');

var _concat2 = _interopRequireDefault(_concat);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// A helper function that provides filter functions
// depending on the route value.
function getFilterFn(route) {
  switch (route) {
    case '/active':
      return function (task) {
        return task.completed === false;
      };
    case '/completed':
      return function (task) {
        return task.completed === true;
      };
    default:
      return function () {
        return true;
      }; // allow anything
  }
}

// This search function is used in the `makeReducer$`
// function below to retrieve the index of a todo in the todosList
// in order to make a modification to the todo data.
function searchTodoIndex(todosList, todoid) {
  var pointerId = void 0;
  var index = void 0;
  var top = todosList.length;
  var bottom = 0;
  for (var i = todosList.length - 1; i >= 0; i--) {
    // binary search
    index = bottom + (top - bottom >> 1);
    pointerId = todosList[index].id;
    if (pointerId === todoid) {
      return index;
    } else if (pointerId < todoid) {
      bottom = index;
    } else if (pointerId > todoid) {
      top = index;
    }
  }
  return null;
}

// MAKE REDUCER STREAM
// A function that takes the actions on the todo list
// and returns a stream of "reducers": functions that expect the current
// todosData (the state) and return a new version of todosData.
function makeReducer$(action$) {
  var clearInputReducer$ = action$.filter(function (a) {
    return a.type === 'clearInput';
  }).mapTo(function clearInputReducer(todosData) {
    return todosData;
  });

  var insertTodoReducer$ = action$.filter(function (a) {
    return a.type === 'insertTodo';
  }).map(function (action) {
    return function insertTodoReducer(todosData) {
      var lastId = todosData.list.length > 0 ? todosData.list[todosData.list.length - 1].id : 0;
      todosData.list.push({
        id: lastId + 1,
        title: action.payload,
        completed: false
      });
      return todosData;
    };
  });

  var editTodoReducer$ = action$.filter(function (a) {
    return a.type === 'editTodo';
  }).map(function (action) {
    return function editTodoReducer(todosData) {
      var todoIndex = searchTodoIndex(todosData.list, action.id);
      todosData.list[todoIndex].title = action.title;
      return todosData;
    };
  });

  var toggleTodoReducer$ = action$.filter(function (a) {
    return a.type === 'toggleTodo';
  }).map(function (action) {
    return function toggleTodoReducer(todosData) {
      var todoIndex = searchTodoIndex(todosData.list, action.id);
      var previousCompleted = todosData.list[todoIndex].completed;
      todosData.list[todoIndex].completed = !previousCompleted;
      return todosData;
    };
  });

  var toggleAllReducer$ = action$.filter(function (a) {
    return a.type === 'toggleAll';
  }).mapTo(function toggleAllReducer(todosData) {
    var allAreCompleted = todosData.list.reduce(function (x, y) {
      return x && y.completed;
    }, true);
    todosData.list.forEach(function (todoData) {
      todoData.completed = allAreCompleted ? false : true;
    });
    return todosData;
  });

  var deleteTodoReducer$ = action$.filter(function (a) {
    return a.type === 'deleteTodo';
  }).map(function (action) {
    return function deleteTodoReducer(todosData) {
      var todoIndex = searchTodoIndex(todosData.list, action.id);
      todosData.list.splice(todoIndex, 1);
      return todosData;
    };
  });

  var deleteCompletedsReducer$ = action$.filter(function (a) {
    return a.type === 'deleteCompleteds';
  }).mapTo(function deleteCompletedsReducer(todosData) {
    todosData.list = todosData.list.filter(function (todoData) {
      return todoData.completed === false;
    });
    return todosData;
  });

  var changeRouteReducer$ = action$.filter(function (a) {
    return a.type === 'changeRoute';
  }).map(function (a) {
    return a.payload;
  }).startWith('/').map(function (path) {
    var filterFn = getFilterFn(path);
    return function changeRouteReducer(todosData) {
      todosData.filter = path.replace('/', '').trim();
      todosData.filterFn = filterFn;
      return todosData;
    };
  });

  return _xstream2.default.merge(clearInputReducer$, insertTodoReducer$, editTodoReducer$, toggleTodoReducer$, toggleAllReducer$, deleteTodoReducer$, deleteCompletedsReducer$, changeRouteReducer$);
}

// THIS IS THE MODEL FUNCTION
// It expects the actions coming in from the todo items and
// the initial localStorage data.
function model(action$, sourceTodosData$) {
  // THE BUSINESS LOGIC
  // Actions are passed to the `makeReducer$` function
  // which creates a stream of reducer functions that needs
  // to be applied on the todoData when an action happens.
  var reducer$ = makeReducer$(action$);

  // RETURN THE MODEL DATA
  return sourceTodosData$.map(function (sourceTodosData) {
    return reducer$.fold(function (todosData, reducer) {
      return reducer(todosData);
    }, sourceTodosData);
  }).flatten()
  // Make this remember its latest event, so late listeners
  // will be updated with the latest state.
  .remember();
}

exports.default = model;

},{"xstream":107,"xstream/extra/concat":105}],116:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = serialize;
// Turn the data object that contains
// the todos into a string for localStorage.
function serialize(todos$) {
  return todos$.map(function (todosData) {
    return JSON.stringify({
      list: todosData.list.map(function (todoData) {
        return {
          title: todoData.title,
          completed: todoData.completed,
          id: todoData.id
        };
      })
    });
  });
};

},{}],117:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = deserialize;
function merge() {
  var result = {};
  for (var i = 0; i < arguments.length; i++) {
    var object = arguments[i];
    for (var key in object) {
      if (object.hasOwnProperty(key)) {
        result[key] = object[key];
      }
    }
  }
  return result;
}

var safeJSONParse = function safeJSONParse(str) {
  return JSON.parse(str) || {};
};

var mergeWithDefaultTodosData = function mergeWithDefaultTodosData(todosData) {
  return merge({
    list: [],
    filter: '',
    filterFn: function filterFn() {
      return true;
    } }, // allow anything
  todosData);
};

// Take localStorage todoData stream and transform into
// a JavaScript object. Set default data.
function deserialize(localStorageValue$) {
  return localStorageValue$.map(safeJSONParse).map(mergeWithDefaultTodosData);
};

},{}],118:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = view;

var _dom = require('@cycle/dom');

function renderHeader() {
  return (0, _dom.header)('.header', [(0, _dom.h1)('todos'), (0, _dom.input)('.new-todo', {
    props: {
      type: 'text',
      placeholder: 'What needs to be done?',
      autofocus: true,
      name: 'newTodo'
    },
    hook: {
      update: function update(oldVNode, _ref) {
        var elm = _ref.elm;

        elm.value = '';
      }
    }
  })]);
}

function renderMainSection(todosData) {
  var allCompleted = todosData.list.reduce(function (x, y) {
    return x && y.completed;
  }, true);
  var sectionStyle = { 'display': todosData.list.length ? '' : 'none' };

  return (0, _dom.section)('.main', { style: sectionStyle }, [(0, _dom.input)('.toggle-all', {
    props: { type: 'checkbox', checked: allCompleted }
  }), (0, _dom.ul)('.todo-list', todosData.list.filter(todosData.filterFn).map(function (data) {
    return data.todoItem.DOM;
  }))]);
}

function renderFilterButton(todosData, filterTag, path, label) {
  return (0, _dom.li)([todosData.filter === filterTag ? (0, _dom.a)('.selected', { props: { href: path } }, label) : (0, _dom.a)({ props: { href: path } }, label)]);
}

function renderFooter(todosData) {
  var amountCompleted = todosData.list.filter(function (todoData) {
    return todoData.completed;
  }).length;
  var amountActive = todosData.list.length - amountCompleted;
  var footerStyle = { 'display': todosData.list.length ? '' : 'none' };

  return (0, _dom.footer)('.footer', { style: footerStyle }, [(0, _dom.span)('.todo-count', [(0, _dom.strong)(String(amountActive)), ' item' + (amountActive !== 1 ? 's' : '') + ' left']), (0, _dom.ul)('.filters', [renderFilterButton(todosData, '', '/', 'All'), renderFilterButton(todosData, 'active', '/active', 'Active'), renderFilterButton(todosData, 'completed', '/completed', 'Completed')]), amountCompleted > 0 ? (0, _dom.button)('.clear-completed', 'Clear completed (' + amountCompleted + ')') : null]);
}

// THE VIEW
// This function expects the stream of todosData
// from the model function and turns it into a
// virtual DOM stream that is then ultimately returned into
// the DOM sink in the index.js.
function view(todos$) {
  return todos$.map(function (todos) {
    return (0, _dom.div)([renderHeader(), renderMainSection(todos), renderFooter(todos)]);
  });
};

},{"@cycle/dom":11}],119:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var ENTER_KEY = 13;
var ESC_KEY = 27;

exports.ENTER_KEY = ENTER_KEY;
exports.ESC_KEY = ESC_KEY;

},{}]},{},[108])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvQGN5Y2xlL2Jhc2UvbGliL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL0BjeWNsZS9kb20vbGliL0RPTVNvdXJjZS5qcyIsIm5vZGVfbW9kdWxlcy9AY3ljbGUvZG9tL2xpYi9FbGVtZW50RmluZGVyLmpzIiwibm9kZV9tb2R1bGVzL0BjeWNsZS9kb20vbGliL0V2ZW50RGVsZWdhdG9yLmpzIiwibm9kZV9tb2R1bGVzL0BjeWNsZS9kb20vbGliL0hUTUxTb3VyY2UuanMiLCJub2RlX21vZHVsZXMvQGN5Y2xlL2RvbS9saWIvU2NvcGVDaGVja2VyLmpzIiwibm9kZV9tb2R1bGVzL0BjeWNsZS9kb20vbGliL1ZOb2RlV3JhcHBlci5qcyIsIm5vZGVfbW9kdWxlcy9AY3ljbGUvZG9tL2xpYi9mcm9tRXZlbnQuanMiLCJub2RlX21vZHVsZXMvQGN5Y2xlL2RvbS9saWIvaHlwZXJzY3JpcHQtaGVscGVycy5qcyIsIm5vZGVfbW9kdWxlcy9AY3ljbGUvZG9tL2xpYi9oeXBlcnNjcmlwdC5qcyIsIm5vZGVfbW9kdWxlcy9AY3ljbGUvZG9tL2xpYi9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9AY3ljbGUvZG9tL2xpYi9pc29sYXRlLmpzIiwibm9kZV9tb2R1bGVzL0BjeWNsZS9kb20vbGliL2lzb2xhdGVNb2R1bGUuanMiLCJub2RlX21vZHVsZXMvQGN5Y2xlL2RvbS9saWIvbWFrZURPTURyaXZlci5qcyIsIm5vZGVfbW9kdWxlcy9AY3ljbGUvZG9tL2xpYi9tYWtlSFRNTERyaXZlci5qcyIsIm5vZGVfbW9kdWxlcy9AY3ljbGUvZG9tL2xpYi9tb2NrRE9NU291cmNlLmpzIiwibm9kZV9tb2R1bGVzL0BjeWNsZS9kb20vbGliL21vZHVsZXMuanMiLCJub2RlX21vZHVsZXMvQGN5Y2xlL2RvbS9saWIvdHJhbnNwb3NpdGlvbi5qcyIsIm5vZGVfbW9kdWxlcy9AY3ljbGUvZG9tL2xpYi91dGlscy5qcyIsIm5vZGVfbW9kdWxlcy9AY3ljbGUvZG9tL25vZGVfbW9kdWxlcy9AY3ljbGUveHN0cmVhbS1hZGFwdGVyL2xpYi9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9AY3ljbGUvaGlzdG9yeS9saWIvY2FwdHVyZUNsaWNrcy5qcyIsIm5vZGVfbW9kdWxlcy9AY3ljbGUvaGlzdG9yeS9saWIvaW5kZXguanMiLCJub2RlX21vZHVsZXMvQGN5Y2xlL2hpc3RvcnkvbGliL21ha2VIaXN0b3J5RHJpdmVyLmpzIiwibm9kZV9tb2R1bGVzL0BjeWNsZS9oaXN0b3J5L2xpYi9zZXJ2ZXJIaXN0b3J5LmpzIiwibm9kZV9tb2R1bGVzL0BjeWNsZS9oaXN0b3J5L2xpYi91dGlsLmpzIiwibm9kZV9tb2R1bGVzL0BjeWNsZS9pc29sYXRlL2xpYi9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9AY3ljbGUvc3RvcmFnZS9saWIvaW5kZXguanMiLCJub2RlX21vZHVsZXMvQGN5Y2xlL3N0b3JhZ2UvbGliL3Jlc3BvbnNlQ29sbGVjdGlvbi5qcyIsIm5vZGVfbW9kdWxlcy9AY3ljbGUvc3RvcmFnZS9saWIvdXRpbC5qcyIsIm5vZGVfbW9kdWxlcy9AY3ljbGUvc3RvcmFnZS9saWIvd3JpdGVUb1N0b3JlLmpzIiwibm9kZV9tb2R1bGVzL0BjeWNsZS94c3RyZWFtLWFkYXB0ZXIvbGliL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL0BjeWNsZS94c3RyZWFtLXJ1bi9saWIvaW5kZXguanMiLCJub2RlX21vZHVsZXMvYnJvd3Nlci1zcGxpdC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9kZWVwLWVxdWFsL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2RlZXAtZXF1YWwvbGliL2lzX2FyZ3VtZW50cy5qcyIsIm5vZGVfbW9kdWxlcy9kZWVwLWVxdWFsL2xpYi9rZXlzLmpzIiwibm9kZV9tb2R1bGVzL2hpc3RvcnkvbGliL0FjdGlvbnMuanMiLCJub2RlX21vZHVsZXMvaGlzdG9yeS9saWIvQXN5bmNVdGlscy5qcyIsIm5vZGVfbW9kdWxlcy9oaXN0b3J5L2xpYi9ET01TdGF0ZVN0b3JhZ2UuanMiLCJub2RlX21vZHVsZXMvaGlzdG9yeS9saWIvRE9NVXRpbHMuanMiLCJub2RlX21vZHVsZXMvaGlzdG9yeS9saWIvRXhlY3V0aW9uRW52aXJvbm1lbnQuanMiLCJub2RlX21vZHVsZXMvaGlzdG9yeS9saWIvUGF0aFV0aWxzLmpzIiwibm9kZV9tb2R1bGVzL2hpc3RvcnkvbGliL2NyZWF0ZUJyb3dzZXJIaXN0b3J5LmpzIiwibm9kZV9tb2R1bGVzL2hpc3RvcnkvbGliL2NyZWF0ZURPTUhpc3RvcnkuanMiLCJub2RlX21vZHVsZXMvaGlzdG9yeS9saWIvY3JlYXRlSGFzaEhpc3RvcnkuanMiLCJub2RlX21vZHVsZXMvaGlzdG9yeS9saWIvY3JlYXRlSGlzdG9yeS5qcyIsIm5vZGVfbW9kdWxlcy9oaXN0b3J5L2xpYi9jcmVhdGVMb2NhdGlvbi5qcyIsIm5vZGVfbW9kdWxlcy9oaXN0b3J5L2xpYi9jcmVhdGVNZW1vcnlIaXN0b3J5LmpzIiwibm9kZV9tb2R1bGVzL2hpc3RvcnkvbGliL2RlcHJlY2F0ZS5qcyIsIm5vZGVfbW9kdWxlcy9oaXN0b3J5L2xpYi9lbmFibGVCZWZvcmVVbmxvYWQuanMiLCJub2RlX21vZHVsZXMvaGlzdG9yeS9saWIvZW5hYmxlUXVlcmllcy5qcyIsIm5vZGVfbW9kdWxlcy9oaXN0b3J5L2xpYi9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9oaXN0b3J5L2xpYi9ydW5UcmFuc2l0aW9uSG9vay5qcyIsIm5vZGVfbW9kdWxlcy9oaXN0b3J5L2xpYi91c2VCYXNlbmFtZS5qcyIsIm5vZGVfbW9kdWxlcy9oaXN0b3J5L2xpYi91c2VCZWZvcmVVbmxvYWQuanMiLCJub2RlX21vZHVsZXMvaGlzdG9yeS9saWIvdXNlUXVlcmllcy5qcyIsIm5vZGVfbW9kdWxlcy9pbnZhcmlhbnQvYnJvd3Nlci5qcyIsIm5vZGVfbW9kdWxlcy9sb2Rhc2guX2Jhc2VmbGF0dGVuL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2xvZGFzaC5fYmFzZWZvci9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9sb2Rhc2guX2Jhc2VpbmRleG9mL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2xvZGFzaC5fYmFzZXVuaXEvaW5kZXguanMiLCJub2RlX21vZHVsZXMvbG9kYXNoLl9iaW5kY2FsbGJhY2svaW5kZXguanMiLCJub2RlX21vZHVsZXMvbG9kYXNoLl9jYWNoZWluZGV4b2YvaW5kZXguanMiLCJub2RlX21vZHVsZXMvbG9kYXNoLl9jcmVhdGVjYWNoZS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9sb2Rhc2guX2dldG5hdGl2ZS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9sb2Rhc2guX3Jvb3QvaW5kZXguanMiLCJub2RlX21vZHVsZXMvbG9kYXNoLmRlYnVyci9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9sb2Rhc2guZXNjYXBlL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2xvZGFzaC5mb3Jvd24vaW5kZXguanMiLCJub2RlX21vZHVsZXMvbG9kYXNoLmlzYXJndW1lbnRzL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2xvZGFzaC5pc2FycmF5L2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2xvZGFzaC5rZWJhYmNhc2UvaW5kZXguanMiLCJub2RlX21vZHVsZXMvbG9kYXNoLmtleXMvaW5kZXguanMiLCJub2RlX21vZHVsZXMvbG9kYXNoLnJlc3RwYXJhbS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9sb2Rhc2gudW5pb24vaW5kZXguanMiLCJub2RlX21vZHVsZXMvbG9kYXNoLndvcmRzL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL21hdGNoZXMtc2VsZWN0b3IvaW5kZXguanMiLCJub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIiwibm9kZV9tb2R1bGVzL3F1ZXJ5LXN0cmluZy9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9zbmFiYmRvbS1zZWxlY3Rvci9saWIvY2xhc3NOYW1lRnJvbVZOb2RlLmpzIiwibm9kZV9tb2R1bGVzL3NuYWJiZG9tLXNlbGVjdG9yL2xpYi9zZWxlY3RvclBhcnNlci5qcyIsIm5vZGVfbW9kdWxlcy9zbmFiYmRvbS10by1odG1sL2xpYi9jb250YWluZXItZWxlbWVudHMuanMiLCJub2RlX21vZHVsZXMvc25hYmJkb20tdG8taHRtbC9saWIvaW5kZXguanMiLCJub2RlX21vZHVsZXMvc25hYmJkb20tdG8taHRtbC9saWIvaW5pdC5qcyIsIm5vZGVfbW9kdWxlcy9zbmFiYmRvbS10by1odG1sL2xpYi9tb2R1bGVzL2F0dHJpYnV0ZXMuanMiLCJub2RlX21vZHVsZXMvc25hYmJkb20tdG8taHRtbC9saWIvbW9kdWxlcy9zdHlsZS5qcyIsIm5vZGVfbW9kdWxlcy9zbmFiYmRvbS10by1odG1sL2xpYi9wYXJzZS1zZWxlY3Rvci5qcyIsIm5vZGVfbW9kdWxlcy9zbmFiYmRvbS10by1odG1sL2xpYi92b2lkLWVsZW1lbnRzLmpzIiwibm9kZV9tb2R1bGVzL3NuYWJiZG9tL2guanMiLCJub2RlX21vZHVsZXMvc25hYmJkb20vaHRtbGRvbWFwaS5qcyIsIm5vZGVfbW9kdWxlcy9zbmFiYmRvbS9pcy5qcyIsIm5vZGVfbW9kdWxlcy9zbmFiYmRvbS9tb2R1bGVzL2F0dHJpYnV0ZXMuanMiLCJub2RlX21vZHVsZXMvc25hYmJkb20vbW9kdWxlcy9jbGFzcy5qcyIsIm5vZGVfbW9kdWxlcy9zbmFiYmRvbS9tb2R1bGVzL2V2ZW50bGlzdGVuZXJzLmpzIiwibm9kZV9tb2R1bGVzL3NuYWJiZG9tL21vZHVsZXMvaGVyby5qcyIsIm5vZGVfbW9kdWxlcy9zbmFiYmRvbS9tb2R1bGVzL3Byb3BzLmpzIiwibm9kZV9tb2R1bGVzL3NuYWJiZG9tL21vZHVsZXMvc3R5bGUuanMiLCJub2RlX21vZHVsZXMvc25hYmJkb20vc25hYmJkb20uanMiLCJub2RlX21vZHVsZXMvc25hYmJkb20vdGh1bmsuanMiLCJub2RlX21vZHVsZXMvc25hYmJkb20vdm5vZGUuanMiLCJub2RlX21vZHVsZXMvc3RyaWN0LXVyaS1lbmNvZGUvaW5kZXguanMiLCJub2RlX21vZHVsZXMvd2FybmluZy9icm93c2VyLmpzIiwibm9kZV9tb2R1bGVzL3hzdHJlYW0vY29yZS5qcyIsIm5vZGVfbW9kdWxlcy94c3RyZWFtL2V4dHJhL2NvbmNhdC5qcyIsIm5vZGVfbW9kdWxlcy94c3RyZWFtL2V4dHJhL2Ryb3BSZXBlYXRzLmpzIiwibm9kZV9tb2R1bGVzL3hzdHJlYW0vaW5kZXguanMiLCJzcmMvYXBwLmpzIiwic3JjL2NvbXBvbmVudHMvVGFzay9pbmRleC5qcyIsInNyYy9jb21wb25lbnRzL1Rhc2svaW50ZW50LmpzIiwic3JjL2NvbXBvbmVudHMvVGFzay9tb2RlbC5qcyIsInNyYy9jb21wb25lbnRzL1Rhc2svdmlldy5qcyIsInNyYy9jb21wb25lbnRzL1Rhc2tMaXN0L2luZGV4LmpzIiwic3JjL2NvbXBvbmVudHMvVGFza0xpc3QvaW50ZW50LmpzIiwic3JjL2NvbXBvbmVudHMvVGFza0xpc3QvbW9kZWwuanMiLCJzcmMvY29tcG9uZW50cy9UYXNrTGlzdC9zdG9yYWdlLXNpbmsuanMiLCJzcmMvY29tcG9uZW50cy9UYXNrTGlzdC9zdG9yYWdlLXNvdXJjZS5qcyIsInNyYy9jb21wb25lbnRzL1Rhc2tMaXN0L3ZpZXcuanMiLCJzcmMvdXRpbHMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTs7OztBQUNBLFNBQVMsZUFBVCxDQUF5QixPQUF6QixFQUFrQyxhQUFsQyxFQUFpRDtBQUM3QyxRQUFJLGNBQWMsRUFBbEI7QUFDQSxTQUFLLElBQUksTUFBVCxJQUFtQixPQUFuQixFQUE0QjtBQUN4QixZQUFJLFFBQVEsY0FBUixDQUF1QixNQUF2QixDQUFKLEVBQW9DO0FBQ2hDLGdCQUFJLGNBQWMsY0FBYyxXQUFkLEVBQWxCO0FBQ0EsZ0JBQUksc0JBQXNCLFFBQVEsTUFBUixFQUFnQixhQUFoQixJQUFpQyxhQUEzRDtBQUNBLGdCQUFJLFNBQVMsb0JBQW9CLEtBQXBCLENBQTBCLFlBQVksTUFBdEMsRUFBOEMsY0FBYyxlQUE1RCxDQUFiO0FBQ0Esd0JBQVksTUFBWixJQUFzQjtBQUNsQix3QkFBUSxNQURVO0FBRWxCLDBCQUFVLFlBQVk7QUFGSixhQUF0QjtBQUlIO0FBQ0o7QUFDRCxXQUFPLFdBQVA7QUFDSDtBQUNELFNBQVMsV0FBVCxDQUFxQixPQUFyQixFQUE4QixXQUE5QixFQUEyQyxhQUEzQyxFQUEwRDtBQUN0RCxRQUFJLFVBQVUsRUFBZDtBQUNBLFNBQUssSUFBSSxNQUFULElBQW1CLE9BQW5CLEVBQTRCO0FBQ3hCLFlBQUksUUFBUSxjQUFSLENBQXVCLE1BQXZCLENBQUosRUFBb0M7QUFDaEMsZ0JBQUksZUFBZSxRQUFRLE1BQVIsRUFBZ0IsWUFBWSxNQUFaLEVBQW9CLE1BQXBDLEVBQTRDLGFBQTVDLEVBQTJELE1BQTNELENBQW5CO0FBQ0EsZ0JBQUksc0JBQXNCLFFBQVEsTUFBUixFQUFnQixhQUExQztBQUNBLGdCQUFJLHVCQUF1QixvQkFBb0IsYUFBcEIsQ0FBa0MsWUFBbEMsQ0FBM0IsRUFBNEU7QUFDeEUsd0JBQVEsTUFBUixJQUFrQixjQUFjLEtBQWQsQ0FBb0IsWUFBcEIsRUFBa0Msb0JBQW9CLGVBQXRELENBQWxCO0FBQ0gsYUFGRCxNQUdLO0FBQ0Qsd0JBQVEsTUFBUixJQUFrQixZQUFsQjtBQUNIO0FBQ0o7QUFDSjtBQUNELFdBQU8sT0FBUDtBQUNIO0FBQ0QsU0FBUyxhQUFULENBQXVCLEtBQXZCLEVBQThCLFdBQTlCLEVBQTJDLGFBQTNDLEVBQTBEO0FBQ3RELFFBQUksVUFBVSxPQUFPLElBQVAsQ0FBWSxLQUFaLEVBQ1QsTUFEUyxDQUNGLFVBQVUsSUFBVixFQUFnQjtBQUFFLGVBQU8sQ0FBQyxDQUFDLFlBQVksSUFBWixDQUFUO0FBQTZCLEtBRDdDLEVBRVQsR0FGUyxDQUVMLFVBQVUsSUFBVixFQUFnQjtBQUNyQixlQUFPLGNBQWMsZUFBZCxDQUE4QixNQUFNLElBQU4sQ0FBOUIsRUFBMkMsWUFBWSxJQUFaLEVBQWtCLFFBQTdELENBQVA7QUFDSCxLQUphLENBQWQ7QUFLQSxRQUFJLG1CQUFtQixRQUNsQixNQURrQixDQUNYLFVBQVUsT0FBVixFQUFtQjtBQUFFLGVBQU8sT0FBTyxPQUFQLEtBQW1CLFVBQTFCO0FBQXVDLEtBRGpELENBQXZCO0FBRUEsV0FBTyxZQUFZO0FBQ2YseUJBQWlCLE9BQWpCLENBQXlCLFVBQVUsT0FBVixFQUFtQjtBQUFFLG1CQUFPLFNBQVA7QUFBbUIsU0FBakU7QUFDSCxLQUZEO0FBR0g7QUFDRCxTQUFTLGNBQVQsQ0FBd0IsT0FBeEIsRUFBaUM7QUFDN0IsU0FBSyxJQUFJLENBQVQsSUFBYyxPQUFkLEVBQXVCO0FBQ25CLFlBQUksUUFBUSxjQUFSLENBQXVCLENBQXZCLEtBQTZCLFFBQVEsQ0FBUixDQUE3QixJQUNHLE9BQU8sUUFBUSxDQUFSLEVBQVcsT0FBbEIsS0FBOEIsVUFEckMsRUFDaUQ7QUFDN0Msb0JBQVEsQ0FBUixFQUFXLE9BQVg7QUFDSDtBQUNKO0FBQ0o7QUFDRCxJQUFJLGdCQUFnQixTQUFoQixhQUFnQixDQUFVLEdBQVYsRUFBZTtBQUFFLFdBQU8sT0FBTyxJQUFQLENBQVksR0FBWixFQUFpQixNQUFqQixLQUE0QixDQUFuQztBQUF1QyxDQUE1RTtBQUNBLFNBQVMsS0FBVCxDQUFlLElBQWYsRUFBcUIsT0FBckIsRUFBOEIsT0FBOUIsRUFBdUM7QUFDbkMsUUFBSSxPQUFPLElBQVAsS0FBZ0IsVUFBcEIsRUFBZ0M7QUFDNUIsY0FBTSxJQUFJLEtBQUosQ0FBVSxzREFDWixXQURFLENBQU47QUFFSDtBQUNELFFBQUksUUFBTyxPQUFQLHlDQUFPLE9BQVAsT0FBbUIsUUFBbkIsSUFBK0IsWUFBWSxJQUEvQyxFQUFxRDtBQUNqRCxjQUFNLElBQUksS0FBSixDQUFVLHNEQUNaLHNDQURFLENBQU47QUFFSDtBQUNELFFBQUksY0FBYyxPQUFkLENBQUosRUFBNEI7QUFDeEIsY0FBTSxJQUFJLEtBQUosQ0FBVSxzREFDWiwyREFERSxDQUFOO0FBRUg7QUFDRCxRQUFJLGdCQUFnQixRQUFRLGFBQTVCO0FBQ0EsUUFBSSxDQUFDLGFBQUQsSUFBa0IsY0FBYyxhQUFkLENBQXRCLEVBQW9EO0FBQ2hELGNBQU0sSUFBSSxLQUFKLENBQVUsNkRBQ1osa0VBREUsQ0FBTjtBQUVIO0FBQ0QsUUFBSSxjQUFjLGdCQUFnQixPQUFoQixFQUF5QixhQUF6QixDQUFsQjtBQUNBLFFBQUksVUFBVSxZQUFZLE9BQVosRUFBcUIsV0FBckIsRUFBa0MsYUFBbEMsQ0FBZDtBQUNBLFFBQUksUUFBUSxLQUFLLE9BQUwsQ0FBWjtBQUNBLFFBQUksT0FBTyxNQUFQLEtBQWtCLFdBQXRCLEVBQW1DO0FBQy9CLGVBQU8sT0FBUCxHQUFpQixFQUFFLE9BQU8sS0FBVCxFQUFqQjtBQUNIO0FBQ0QsUUFBSSxNQUFNLFNBQU4sR0FBTSxHQUFZO0FBQ2xCLFlBQUkscUJBQXFCLGNBQWMsS0FBZCxFQUFxQixXQUFyQixFQUFrQyxhQUFsQyxDQUF6QjtBQUNBLGVBQU8sWUFBWTtBQUNmLDBCQUFjLE9BQWQsQ0FBc0IsS0FBdEIsRUFBNkIsV0FBN0IsRUFBMEMsT0FBMUM7QUFDQSwyQkFBZSxPQUFmO0FBQ0E7QUFDSCxTQUpEO0FBS0gsS0FQRDtBQVFBLFdBQU8sRUFBRSxPQUFPLEtBQVQsRUFBZ0IsU0FBUyxPQUF6QixFQUFrQyxLQUFLLEdBQXZDLEVBQVA7QUFDSDtBQUNELE9BQU8sY0FBUCxDQUFzQixPQUF0QixFQUErQixZQUEvQixFQUE2QyxFQUFFLE9BQU8sSUFBVCxFQUE3QztBQUNBLFFBQVEsT0FBUixHQUFrQixLQUFsQjs7OztBQ3hGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaktBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMU5BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25FQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDbkVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUN6REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUN4RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUNKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQzlDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQy9LQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUN2Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ3JQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDL1JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUNsREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDekpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ3RFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDN0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUM5R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUMvS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUNuREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25JQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ3JEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDM0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDeklBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQzNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcExBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDblBBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVPQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25FQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JCQTtBQUNBO0FBQ0E7QUFDQTs7QUNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM1FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ05BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDNURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdm1EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ1BBOztBQUNBOztBQUNBOztBQUNBOztBQUNBOzs7O0FBR0E7Ozs7OztBQUVBLElBQU0sc0JBQU47Ozs7Ozs7OztBQU1BLHFCQUFJLElBQUosRUFBVTs7OztBQUlSLE9BQUssd0JBQWMsVUFBZCxFQUEwQixFQUFDLGVBQWUsSUFBaEIsRUFBMUIsQ0FKRzs7O0FBT1IsV0FBUyxnQ0FBa0IsOEJBQWxCLEVBQW1DLEVBQUMsU0FBUyxJQUFWLEVBQW5DLENBUEQ7Ozs7QUFXUjtBQVhRLENBQVY7Ozs7Ozs7OztBQ2ZBOzs7O0FBQ0E7Ozs7QUFDQTs7Ozs7Ozs7O0FBS0EsU0FBUyxJQUFULE9BQTZCO0FBQUEsTUFBZCxHQUFjLFFBQWQsR0FBYztBQUFBLE1BQVQsTUFBUyxRQUFULE1BQVM7O0FBQzNCLE1BQUksVUFBVSxzQkFBTyxHQUFQLENBQWQ7QUFDQSxNQUFJLFNBQVMscUJBQU0sTUFBTixFQUFjLE9BQWQsQ0FBYjtBQUNBLE1BQUksU0FBUyxvQkFBSyxNQUFMLENBQWI7O0FBRUEsU0FBTztBQUNMLFNBQUssTUFEQTtBQUVMO0FBRkssR0FBUDtBQUlEOztrQkFFYyxJOzs7Ozs7Ozs7QUNsQmY7Ozs7QUFDQTs7Ozs7OztBQUtBLFNBQVMsTUFBVCxDQUFnQixTQUFoQixFQUEyQjs7O0FBR3pCLFNBQU8sa0JBQUcsS0FBSDs7QUFFTCxZQUFVLE1BQVYsQ0FBaUIsVUFBakIsRUFBNkIsTUFBN0IsQ0FBb0MsT0FBcEMsRUFDRyxLQURILENBQ1MsRUFBQyxNQUFNLFNBQVAsRUFEVCxDQUZLOzs7QUFNTCxZQUFVLE1BQVYsQ0FBaUIsU0FBakIsRUFBNEIsTUFBNUIsQ0FBbUMsUUFBbkMsRUFDRyxLQURILENBQ1MsRUFBQyxNQUFNLFFBQVAsRUFEVCxDQU5LOzs7QUFVTCxZQUFVLE1BQVYsQ0FBaUIsT0FBakIsRUFBMEIsTUFBMUIsQ0FBaUMsVUFBakMsRUFDRyxLQURILENBQ1MsRUFBQyxNQUFNLFdBQVAsRUFEVCxDQVZLOzs7QUFjTCxZQUFVLE1BQVYsQ0FBaUIsT0FBakIsRUFBMEIsTUFBMUIsQ0FBaUMsT0FBakMsRUFDRyxNQURILENBQ1U7QUFBQSxXQUFNLEdBQUcsT0FBSCxtQkFBTjtBQUFBLEdBRFYsRUFFRyxLQUZILENBRVMsRUFBQyxNQUFNLFlBQVAsRUFGVCxDQWRLOzs7QUFtQkwsWUFBVSxNQUFWLENBQWlCLE9BQWpCLEVBQTBCLE1BQTFCLENBQWlDLE9BQWpDLEVBQ0csTUFESCxDQUNVO0FBQUEsV0FBTSxHQUFHLE9BQUgscUJBQU47QUFBQSxHQURWLEVBRUcsT0FGSCxDQUVXO0FBQUEsV0FBSyxrQkFBRyxLQUFILENBQVMsQ0FBVCxFQUFZLFVBQVUsTUFBVixDQUFpQixPQUFqQixFQUEwQixNQUExQixDQUFpQyxNQUFqQyxFQUF5QyxJQUF6QyxDQUFaLENBQUw7QUFBQSxHQUZYLEVBR0csR0FISCxDQUdPO0FBQUEsV0FBTyxFQUFDLE9BQU8sR0FBRyxNQUFILENBQVUsS0FBbEIsRUFBeUIsTUFBTSxVQUEvQixFQUFQO0FBQUEsR0FIUCxDQW5CSyxDQUFQO0FBd0JEOztrQkFFYyxNOzs7Ozs7Ozs7QUNuQ2Y7Ozs7OztBQUVBLFNBQVMsS0FBVCxDQUFlLE1BQWYsRUFBdUIsT0FBdkIsRUFBZ0M7OztBQUc5QixNQUFJLGtCQUFrQixPQUFPLFNBQVAsQ0FBaUIsRUFBQyxPQUFPLEVBQVIsRUFBWSxXQUFXLEtBQXZCLEVBQWpCLENBQXRCOzs7OztBQUtBLE1BQUksV0FDRixrQkFBRyxLQUFILENBQ0UsUUFBUSxNQUFSLENBQWU7QUFBQSxXQUFLLEVBQUUsSUFBRixLQUFXLFdBQWhCO0FBQUEsR0FBZixFQUE0QyxLQUE1QyxDQUFrRCxJQUFsRCxDQURGLEVBRUUsUUFBUSxNQUFSLENBQWU7QUFBQSxXQUFLLEVBQUUsSUFBRixLQUFXLFVBQWhCO0FBQUEsR0FBZixFQUEyQyxLQUEzQyxDQUFpRCxLQUFqRCxDQUZGLEVBR0UsUUFBUSxNQUFSLENBQWU7QUFBQSxXQUFLLEVBQUUsSUFBRixLQUFXLFlBQWhCO0FBQUEsR0FBZixFQUE2QyxLQUE3QyxDQUFtRCxLQUFuRCxDQUhGLEVBS0MsU0FMRCxDQUtXLEtBTFgsQ0FERjs7QUFRQSxTQUFPLGtCQUFHLE9BQUgsQ0FDTCxnQkFBcUIsT0FBckI7QUFBQSxRQUFFLEtBQUYsUUFBRSxLQUFGO0FBQUEsUUFBUyxTQUFULFFBQVMsU0FBVDtBQUFBLFdBQWtDO0FBQ2hDLGtCQURnQztBQUVoQyxtQkFBYSxTQUZtQjtBQUdoQyxpQkFBVztBQUhxQixLQUFsQztBQUFBLEdBREssRUFNTCxlQU5LLEVBTVksUUFOWixDQUFQO0FBUUQ7O2tCQUVjLEs7Ozs7Ozs7OztBQzVCZjs7QUFFQSxTQUFTLElBQVQsQ0FBYyxNQUFkLEVBQXNCO0FBQ3BCLFNBQU8sT0FBTyxHQUFQLENBQVcsZ0JBQXFDO0FBQUEsUUFBbkMsS0FBbUMsUUFBbkMsS0FBbUM7QUFBQSxRQUE1QixXQUE0QixRQUE1QixXQUE0QjtBQUFBLFFBQWYsU0FBZSxRQUFmLFNBQWU7O0FBQ3JELFFBQUksa0JBQWtCO0FBQ3BCLGlCQUFXLFdBRFM7QUFFcEIsZUFBUztBQUZXLEtBQXRCOztBQUtBLFdBQU8sYUFBRyxXQUFILEVBQWdCLEVBQUMsT0FBTyxlQUFSLEVBQWhCLEVBQTBDLENBQy9DLGNBQUksT0FBSixFQUFhLENBQ1gsZ0JBQU0sU0FBTixFQUFpQjtBQUNmLGFBQU8sRUFBQyxNQUFNLFVBQVAsRUFBbUIsU0FBUyxXQUE1QjtBQURRLEtBQWpCLENBRFcsRUFJWCxnQkFBTSxLQUFOLENBSlcsRUFLWCxpQkFBTyxVQUFQLENBTFcsQ0FBYixDQUQrQyxFQVEvQyxnQkFBTSxPQUFOLEVBQWU7QUFDYixhQUFPLEVBQUMsTUFBTSxNQUFQLEVBRE07QUFFYixZQUFNO0FBQ0osZ0JBQVEsZ0JBQUMsUUFBRCxTQUFxQjtBQUFBLGNBQVQsR0FBUyxTQUFULEdBQVM7O0FBQzNCLGNBQUksS0FBSixHQUFZLEtBQVo7QUFDQSxjQUFJLFNBQUosRUFBZTtBQUNiLGdCQUFJLEtBQUo7QUFDQSxnQkFBSSxjQUFKLEdBQXFCLElBQUksS0FBSixDQUFVLE1BQS9CO0FBQ0Q7QUFDRjtBQVBHO0FBRk8sS0FBZixDQVIrQyxDQUExQyxDQUFQO0FBcUJELEdBM0JNLENBQVA7QUE0QkQ7O2tCQUVjLEk7Ozs7Ozs7Ozs7O0FDakNmOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7Ozs7Ozs7Ozs7O0FBS0EsU0FBUyxzQkFBVCxDQUFnQyxTQUFoQyxFQUEyQztBQUN6QyxTQUFPLFVBQVUsU0FBVixFQUFxQjtBQUMxQix3QkFDSyxTQURMOzs7O0FBS0UsWUFBTSxVQUFVLElBQVYsQ0FBZSxHQUFmLENBQW1CLGdCQUFROztBQUUvQixZQUFJLFNBQVMsa0JBQUcsRUFBSCxDQUFNLElBQU4sQ0FBYjs7QUFFQSxZQUFJLFdBQVcsd0NBQWMsRUFBQyxLQUFLLFNBQU4sRUFBaUIsY0FBakIsRUFBZCxDQUFmOzs7QUFHQSw0QkFDSyxJQURMOzs7QUFJRSxvQkFBVTtBQUNSLGlCQUFLLFNBQVMsR0FETjtBQUVSLHFCQUFTLFNBQVMsT0FBVCxDQUFpQixHQUFqQixDQUFxQjtBQUFBLGtDQUFXLEVBQVgsSUFBZSxJQUFJLEtBQUssRUFBeEI7QUFBQSxhQUFyQjtBQUZEO0FBSlo7QUFTRCxPQWhCSztBQUxSO0FBdUJELEdBeEJEO0FBeUJEOzs7O0FBSUQsU0FBUyxRQUFULENBQWtCLE9BQWxCLEVBQTJCOzs7OztBQUt6QixNQUFJLGdCQUFnQixRQUFRLE9BQVIsQ0FBZ0IsS0FBaEIsQ0FBc0IsT0FBdEIsQ0FBOEIsYUFBOUIsRUFBNkMsSUFBN0MsQ0FBa0QsQ0FBbEQsQ0FBcEI7Ozs7QUFJQSxNQUFJLG1CQUFtQiw2QkFBWSxhQUFaLENBQXZCOzs7QUFHQSxNQUFJLG1CQUFtQixrQkFBRyxXQUFILEVBQXZCOzs7O0FBSUEsTUFBSSxVQUFVLHNCQUFPLFFBQVEsR0FBZixFQUFvQixRQUFRLE9BQTVCLEVBQXFDLGdCQUFyQyxDQUFkOzs7O0FBSUEsTUFBSSxTQUFTLHFCQUFNLE9BQU4sRUFBZSxnQkFBZixDQUFiOztBQUVBLE1BQUksZ0JBQWdCLE9BQ2pCLEdBRGlCLENBQ2IsdUJBQXVCLFFBQVEsR0FBL0IsQ0FEYSxFQUVqQixRQUZpQixFQUFwQjs7Ozs7OztBQVNBLE1BQUksY0FBYyxjQUNmLEdBRGUsQ0FDWDtBQUFBLFFBQUUsSUFBRixRQUFFLElBQUY7QUFBQSxXQUFZLGtCQUFHLEtBQUgsNkNBQVksS0FBSyxHQUFMLENBQVM7QUFBQSxhQUFLLEVBQUUsUUFBRixDQUFXLE9BQWhCO0FBQUEsS0FBVCxDQUFaLEVBQVo7QUFBQSxHQURXLEVBRWYsT0FGZSxFQUFsQjs7O0FBS0EsbUJBQWlCLE9BQWpCLENBQXlCLFdBQXpCOzs7QUFHQSxNQUFJLFFBQVEsb0JBQUssYUFBTCxDQUFaOzs7QUFHQSxNQUFJLFdBQVcsMkJBQVUsTUFBVixFQUFrQixHQUFsQixDQUFzQixVQUFDLEtBQUQ7QUFBQSxXQUFZO0FBQy9DLFdBQUssYUFEMEMsRUFDM0IsT0FBTztBQURvQixLQUFaO0FBQUEsR0FBdEIsQ0FBZjs7OztBQU1BLE1BQUksUUFBUTtBQUNWLFNBQUssS0FESztBQUVWLGFBQVM7QUFGQyxHQUFaO0FBSUEsU0FBTyxLQUFQO0FBQ0Q7O2tCQUVjLFE7Ozs7Ozs7Ozs7O2tCQzVGUyxNOztBQUx4Qjs7OztBQUNBOzs7O0FBQ0E7Ozs7O0FBR2UsU0FBUyxNQUFULENBQWdCLFNBQWhCLEVBQTJCLE9BQTNCLEVBQW9DLFdBQXBDLEVBQWlEO0FBQzlELFNBQU8sa0JBQUcsS0FBSDs7O0FBR0wsVUFDRyxTQURILENBQ2EsRUFBQyxVQUFVLEdBQVgsRUFEYixFQUVHLEdBRkgsQ0FFTztBQUFBLFdBQVksU0FBUyxRQUFyQjtBQUFBLEdBRlAsRUFHRyxPQUhILENBR1csNEJBSFgsRUFJRyxHQUpILENBSU87QUFBQSxXQUFZLEVBQUMsTUFBTSxhQUFQLEVBQXNCLGdCQUF0QixFQUFaO0FBQUEsR0FKUCxDQUhLOzs7O0FBV0wsWUFBVSxNQUFWLENBQWlCLEdBQWpCLEVBQXNCLE1BQXRCLENBQTZCLE9BQTdCLEVBQ0csR0FESCxDQUNPO0FBQUEsV0FBVSxNQUFNLE1BQU4sQ0FBYSxJQUFiLENBQWtCLE9BQWxCLENBQTBCLEdBQTFCLEVBQStCLEVBQS9CLENBQVY7QUFBQSxHQURQLEVBRUcsR0FGSCxDQUVPO0FBQUEsV0FBWSxFQUFDLE1BQU0sS0FBUCxFQUFjLGdCQUFkLEVBQVo7QUFBQSxHQUZQLENBWEs7Ozs7QUFpQkwsWUFBVSxNQUFWLENBQWlCLFdBQWpCLEVBQThCLE1BQTlCLENBQXFDLFNBQXJDLEVBQ0csTUFESCxDQUNVO0FBQUEsV0FBTSxHQUFHLE9BQUgsbUJBQU47QUFBQSxHQURWLEVBRUcsR0FGSCxDQUVPO0FBQUEsV0FBWSxFQUFDLE1BQU0sWUFBUCxFQUFxQixnQkFBckIsRUFBWjtBQUFBLEdBRlAsQ0FqQks7Ozs7QUF1QkwsWUFBVSxNQUFWLENBQWlCLFdBQWpCLEVBQThCLE1BQTlCLENBQXFDLFNBQXJDOzs7QUFBQSxHQUdHLE1BSEgsQ0FHVSxjQUFNO0FBQ1osUUFBSSxhQUFhLE9BQU8sR0FBRyxNQUFILENBQVUsS0FBakIsRUFBd0IsSUFBeEIsRUFBakI7QUFDQSxXQUFPLEdBQUcsT0FBSCx5QkFBNEIsVUFBbkM7QUFDRCxHQU5IOztBQUFBLEdBUUcsR0FSSCxDQVFPO0FBQUEsV0FBTSxPQUFPLEdBQUcsTUFBSCxDQUFVLEtBQWpCLEVBQXdCLElBQXhCLEVBQU47QUFBQSxHQVJQLEVBU0csR0FUSCxDQVNPO0FBQUEsV0FBWSxFQUFDLE1BQU0sWUFBUCxFQUFxQixnQkFBckIsRUFBWjtBQUFBLEdBVFAsQ0F2Qks7Ozs7QUFvQ0wsY0FBWSxNQUFaLENBQW1CO0FBQUEsV0FBVSxPQUFPLElBQVAsS0FBZ0IsUUFBMUI7QUFBQSxHQUFuQixFQUNHLEdBREgsQ0FDTztBQUFBLHdCQUFlLE1BQWYsSUFBdUIsTUFBTSxZQUE3QjtBQUFBLEdBRFAsQ0FwQ0s7Ozs7QUF5Q0wsY0FBWSxNQUFaLENBQW1CO0FBQUEsV0FBVSxPQUFPLElBQVAsS0FBZ0IsU0FBMUI7QUFBQSxHQUFuQixFQUNHLEdBREgsQ0FDTztBQUFBLHdCQUFlLE1BQWYsSUFBdUIsTUFBTSxZQUE3QjtBQUFBLEdBRFAsQ0F6Q0s7Ozs7QUE4Q0wsY0FBWSxNQUFaLENBQW1CO0FBQUEsV0FBVSxPQUFPLElBQVAsS0FBZ0IsVUFBMUI7QUFBQSxHQUFuQixFQUNHLEdBREgsQ0FDTztBQUFBLHdCQUFlLE1BQWYsSUFBdUIsTUFBTSxVQUE3QjtBQUFBLEdBRFAsQ0E5Q0s7Ozs7QUFtREwsWUFBVSxNQUFWLENBQWlCLGFBQWpCLEVBQWdDLE1BQWhDLENBQXVDLE9BQXZDLEVBQ0csS0FESCxDQUNTLEVBQUMsTUFBTSxXQUFQLEVBRFQsQ0FuREs7Ozs7QUF3REwsWUFBVSxNQUFWLENBQWlCLGtCQUFqQixFQUFxQyxNQUFyQyxDQUE0QyxPQUE1QyxFQUNHLEtBREgsQ0FDUyxFQUFDLE1BQU0sa0JBQVAsRUFEVCxDQXhESyxDQUFQO0FBMkREOzs7Ozs7Ozs7QUNqRUQ7Ozs7QUFDQTs7Ozs7Ozs7QUFJQSxTQUFTLFdBQVQsQ0FBcUIsS0FBckIsRUFBNEI7QUFDMUIsVUFBUSxLQUFSO0FBQ0UsU0FBSyxTQUFMO0FBQWdCLGFBQVE7QUFBQSxlQUFRLEtBQUssU0FBTCxLQUFtQixLQUEzQjtBQUFBLE9BQVI7QUFDaEIsU0FBSyxZQUFMO0FBQW1CLGFBQVE7QUFBQSxlQUFRLEtBQUssU0FBTCxLQUFtQixJQUEzQjtBQUFBLE9BQVI7QUFDbkI7QUFBUyxhQUFPO0FBQUEsZUFBTSxJQUFOO0FBQUEsT0FBUCxDO0FBSFg7QUFLRDs7Ozs7QUFLRCxTQUFTLGVBQVQsQ0FBeUIsU0FBekIsRUFBb0MsTUFBcEMsRUFBNEM7QUFDMUMsTUFBSSxrQkFBSjtBQUNBLE1BQUksY0FBSjtBQUNBLE1BQUksTUFBTSxVQUFVLE1BQXBCO0FBQ0EsTUFBSSxTQUFTLENBQWI7QUFDQSxPQUFLLElBQUksSUFBSSxVQUFVLE1BQVYsR0FBbUIsQ0FBaEMsRUFBbUMsS0FBSyxDQUF4QyxFQUEyQyxHQUEzQyxFQUFnRDs7QUFDOUMsWUFBUSxVQUFXLE1BQU0sTUFBUCxJQUFrQixDQUE1QixDQUFSO0FBQ0EsZ0JBQVksVUFBVSxLQUFWLEVBQWlCLEVBQTdCO0FBQ0EsUUFBSSxjQUFjLE1BQWxCLEVBQTBCO0FBQ3hCLGFBQU8sS0FBUDtBQUNELEtBRkQsTUFFTyxJQUFJLFlBQVksTUFBaEIsRUFBd0I7QUFDN0IsZUFBUyxLQUFUO0FBQ0QsS0FGTSxNQUVBLElBQUksWUFBWSxNQUFoQixFQUF3QjtBQUM3QixZQUFNLEtBQU47QUFDRDtBQUNGO0FBQ0QsU0FBTyxJQUFQO0FBQ0Q7Ozs7OztBQU1ELFNBQVMsWUFBVCxDQUFzQixPQUF0QixFQUErQjtBQUM3QixNQUFJLHFCQUFxQixRQUN0QixNQURzQixDQUNmO0FBQUEsV0FBSyxFQUFFLElBQUYsS0FBVyxZQUFoQjtBQUFBLEdBRGUsRUFFdEIsS0FGc0IsQ0FFaEIsU0FBUyxpQkFBVCxDQUEyQixTQUEzQixFQUFzQztBQUMzQyxXQUFPLFNBQVA7QUFDRCxHQUpzQixDQUF6Qjs7QUFNQSxNQUFJLHFCQUFxQixRQUN0QixNQURzQixDQUNmO0FBQUEsV0FBSyxFQUFFLElBQUYsS0FBVyxZQUFoQjtBQUFBLEdBRGUsRUFFdEIsR0FGc0IsQ0FFbEI7QUFBQSxXQUFVLFNBQVMsaUJBQVQsQ0FBMkIsU0FBM0IsRUFBc0M7QUFDbkQsVUFBSSxTQUFTLFVBQVUsSUFBVixDQUFlLE1BQWYsR0FBd0IsQ0FBeEIsR0FDWCxVQUFVLElBQVYsQ0FBZSxVQUFVLElBQVYsQ0FBZSxNQUFmLEdBQXdCLENBQXZDLEVBQTBDLEVBRC9CLEdBRVgsQ0FGRjtBQUdBLGdCQUFVLElBQVYsQ0FBZSxJQUFmLENBQW9CO0FBQ2xCLFlBQUksU0FBUyxDQURLO0FBRWxCLGVBQU8sT0FBTyxPQUZJO0FBR2xCLG1CQUFXO0FBSE8sT0FBcEI7QUFLQSxhQUFPLFNBQVA7QUFDRCxLQVZJO0FBQUEsR0FGa0IsQ0FBekI7O0FBY0EsTUFBSSxtQkFBbUIsUUFDcEIsTUFEb0IsQ0FDYjtBQUFBLFdBQUssRUFBRSxJQUFGLEtBQVcsVUFBaEI7QUFBQSxHQURhLEVBRXBCLEdBRm9CLENBRWhCO0FBQUEsV0FBVSxTQUFTLGVBQVQsQ0FBeUIsU0FBekIsRUFBb0M7QUFDakQsVUFBSSxZQUFZLGdCQUFnQixVQUFVLElBQTFCLEVBQWdDLE9BQU8sRUFBdkMsQ0FBaEI7QUFDQSxnQkFBVSxJQUFWLENBQWUsU0FBZixFQUEwQixLQUExQixHQUFrQyxPQUFPLEtBQXpDO0FBQ0EsYUFBTyxTQUFQO0FBQ0QsS0FKSTtBQUFBLEdBRmdCLENBQXZCOztBQVFBLE1BQUkscUJBQXFCLFFBQ3RCLE1BRHNCLENBQ2Y7QUFBQSxXQUFLLEVBQUUsSUFBRixLQUFXLFlBQWhCO0FBQUEsR0FEZSxFQUV0QixHQUZzQixDQUVsQjtBQUFBLFdBQVUsU0FBUyxpQkFBVCxDQUEyQixTQUEzQixFQUFzQztBQUNuRCxVQUFJLFlBQVksZ0JBQWdCLFVBQVUsSUFBMUIsRUFBZ0MsT0FBTyxFQUF2QyxDQUFoQjtBQUNBLFVBQUksb0JBQW9CLFVBQVUsSUFBVixDQUFlLFNBQWYsRUFBMEIsU0FBbEQ7QUFDQSxnQkFBVSxJQUFWLENBQWUsU0FBZixFQUEwQixTQUExQixHQUFzQyxDQUFDLGlCQUF2QztBQUNBLGFBQU8sU0FBUDtBQUNELEtBTEk7QUFBQSxHQUZrQixDQUF6Qjs7QUFTQSxNQUFJLG9CQUFvQixRQUNyQixNQURxQixDQUNkO0FBQUEsV0FBSyxFQUFFLElBQUYsS0FBVyxXQUFoQjtBQUFBLEdBRGMsRUFFckIsS0FGcUIsQ0FFZixTQUFTLGdCQUFULENBQTBCLFNBQTFCLEVBQXFDO0FBQzFDLFFBQUksa0JBQWtCLFVBQVUsSUFBVixDQUNuQixNQURtQixDQUNaLFVBQUMsQ0FBRCxFQUFJLENBQUo7QUFBQSxhQUFVLEtBQUssRUFBRSxTQUFqQjtBQUFBLEtBRFksRUFDZ0IsSUFEaEIsQ0FBdEI7QUFFQSxjQUFVLElBQVYsQ0FBZSxPQUFmLENBQXVCLFVBQUMsUUFBRCxFQUFjO0FBQ25DLGVBQVMsU0FBVCxHQUFxQixrQkFBa0IsS0FBbEIsR0FBMEIsSUFBL0M7QUFDRCxLQUZEO0FBR0EsV0FBTyxTQUFQO0FBQ0QsR0FUcUIsQ0FBeEI7O0FBV0EsTUFBSSxxQkFBcUIsUUFDdEIsTUFEc0IsQ0FDZjtBQUFBLFdBQUssRUFBRSxJQUFGLEtBQVcsWUFBaEI7QUFBQSxHQURlLEVBRXRCLEdBRnNCLENBRWxCO0FBQUEsV0FBVSxTQUFTLGlCQUFULENBQTJCLFNBQTNCLEVBQXNDO0FBQ25ELFVBQUksWUFBWSxnQkFBZ0IsVUFBVSxJQUExQixFQUFnQyxPQUFPLEVBQXZDLENBQWhCO0FBQ0EsZ0JBQVUsSUFBVixDQUFlLE1BQWYsQ0FBc0IsU0FBdEIsRUFBaUMsQ0FBakM7QUFDQSxhQUFPLFNBQVA7QUFDRCxLQUpJO0FBQUEsR0FGa0IsQ0FBekI7O0FBUUEsTUFBSSwyQkFBMkIsUUFDNUIsTUFENEIsQ0FDckI7QUFBQSxXQUFLLEVBQUUsSUFBRixLQUFXLGtCQUFoQjtBQUFBLEdBRHFCLEVBRTVCLEtBRjRCLENBRXRCLFNBQVMsdUJBQVQsQ0FBaUMsU0FBakMsRUFBNEM7QUFDakQsY0FBVSxJQUFWLEdBQWlCLFVBQVUsSUFBVixDQUNkLE1BRGMsQ0FDUDtBQUFBLGFBQVksU0FBUyxTQUFULEtBQXVCLEtBQW5DO0FBQUEsS0FETyxDQUFqQjtBQUVBLFdBQU8sU0FBUDtBQUNELEdBTjRCLENBQS9COztBQVFBLE1BQUksc0JBQXNCLFFBQ3ZCLE1BRHVCLENBQ2hCO0FBQUEsV0FBSyxFQUFFLElBQUYsS0FBVyxhQUFoQjtBQUFBLEdBRGdCLEVBRXZCLEdBRnVCLENBRW5CO0FBQUEsV0FBSyxFQUFFLE9BQVA7QUFBQSxHQUZtQixFQUd2QixTQUh1QixDQUdiLEdBSGEsRUFJdkIsR0FKdUIsQ0FJbkIsZ0JBQVE7QUFDWCxRQUFJLFdBQVcsWUFBWSxJQUFaLENBQWY7QUFDQSxXQUFPLFNBQVMsa0JBQVQsQ0FBNEIsU0FBNUIsRUFBdUM7QUFDNUMsZ0JBQVUsTUFBVixHQUFtQixLQUFLLE9BQUwsQ0FBYSxHQUFiLEVBQWtCLEVBQWxCLEVBQXNCLElBQXRCLEVBQW5CO0FBQ0EsZ0JBQVUsUUFBVixHQUFxQixRQUFyQjtBQUNBLGFBQU8sU0FBUDtBQUNELEtBSkQ7QUFLRCxHQVh1QixDQUExQjs7QUFhQSxTQUFPLGtCQUFHLEtBQUgsQ0FDTCxrQkFESyxFQUVMLGtCQUZLLEVBR0wsZ0JBSEssRUFJTCxrQkFKSyxFQUtMLGlCQUxLLEVBTUwsa0JBTkssRUFPTCx3QkFQSyxFQVFMLG1CQVJLLENBQVA7QUFVRDs7Ozs7QUFLRCxTQUFTLEtBQVQsQ0FBZSxPQUFmLEVBQXdCLGdCQUF4QixFQUEwQzs7Ozs7QUFLeEMsTUFBSSxXQUFXLGFBQWEsT0FBYixDQUFmOzs7QUFHQSxTQUFPLGlCQUFpQixHQUFqQixDQUFxQjtBQUFBLFdBQzFCLFNBQVMsSUFBVCxDQUFjLFVBQUMsU0FBRCxFQUFZLE9BQVo7QUFBQSxhQUF3QixRQUFRLFNBQVIsQ0FBeEI7QUFBQSxLQUFkLEVBQTBELGVBQTFELENBRDBCO0FBQUEsR0FBckIsRUFFTCxPQUZLOzs7QUFBQSxHQUtOLFFBTE0sRUFBUDtBQU1EOztrQkFFYyxLOzs7Ozs7OztrQkNsSlMsUzs7O0FBQVQsU0FBUyxTQUFULENBQW1CLE1BQW5CLEVBQTJCO0FBQ3hDLFNBQU8sT0FBTyxHQUFQLENBQVc7QUFBQSxXQUFhLEtBQUssU0FBTCxDQUM3QjtBQUNFLFlBQU0sVUFBVSxJQUFWLENBQWUsR0FBZixDQUFtQjtBQUFBLGVBQ3RCO0FBQ0MsaUJBQU8sU0FBUyxLQURqQjtBQUVDLHFCQUFXLFNBQVMsU0FGckI7QUFHQyxjQUFJLFNBQVM7QUFIZCxTQURzQjtBQUFBLE9BQW5CO0FBRFIsS0FENkIsQ0FBYjtBQUFBLEdBQVgsQ0FBUDtBQVdEOzs7Ozs7OztrQkNXdUIsVztBQXpCeEIsU0FBUyxLQUFULEdBQWlCO0FBQ2YsTUFBSSxTQUFTLEVBQWI7QUFDQSxPQUFLLElBQUksSUFBSSxDQUFiLEVBQWdCLElBQUksVUFBVSxNQUE5QixFQUFzQyxHQUF0QyxFQUEyQztBQUN6QyxRQUFJLFNBQVMsVUFBVSxDQUFWLENBQWI7QUFDQSxTQUFLLElBQUksR0FBVCxJQUFnQixNQUFoQixFQUF3QjtBQUN0QixVQUFJLE9BQU8sY0FBUCxDQUFzQixHQUF0QixDQUFKLEVBQWdDO0FBQzlCLGVBQU8sR0FBUCxJQUFjLE9BQU8sR0FBUCxDQUFkO0FBQ0Q7QUFDRjtBQUNGO0FBQ0QsU0FBTyxNQUFQO0FBQ0Q7O0FBRUQsSUFBSSxnQkFBZ0IsU0FBaEIsYUFBZ0I7QUFBQSxTQUFPLEtBQUssS0FBTCxDQUFXLEdBQVgsS0FBbUIsRUFBMUI7QUFBQSxDQUFwQjs7QUFFQSxJQUFJLDRCQUE0QixTQUE1Qix5QkFBNEIsWUFBYTtBQUMzQyxTQUFPLE1BQU07QUFDWCxVQUFNLEVBREs7QUFFWCxZQUFRLEVBRkc7QUFHWCxjQUFVO0FBQUEsYUFBTSxJQUFOO0FBQUEsS0FIQyxFQUFOLEU7QUFJSixXQUpJLENBQVA7QUFLRCxDQU5EOzs7O0FBVWUsU0FBUyxXQUFULENBQXFCLGtCQUFyQixFQUF5QztBQUN0RCxTQUFPLG1CQUNKLEdBREksQ0FDQSxhQURBLEVBRUosR0FGSSxDQUVBLHlCQUZBLENBQVA7QUFHRDs7Ozs7Ozs7a0JDNkN1QixJOztBQTFFeEI7O0FBR0EsU0FBUyxZQUFULEdBQXdCO0FBQ3RCLFNBQU8saUJBQU8sU0FBUCxFQUFrQixDQUN2QixhQUFHLE9BQUgsQ0FEdUIsRUFFdkIsZ0JBQU0sV0FBTixFQUFtQjtBQUNqQixXQUFPO0FBQ0wsWUFBTSxNQUREO0FBRUwsbUJBQWEsd0JBRlI7QUFHTCxpQkFBVyxJQUhOO0FBSUwsWUFBTTtBQUpELEtBRFU7QUFPakIsVUFBTTtBQUNKLGNBQVEsZ0JBQUMsUUFBRCxRQUFxQjtBQUFBLFlBQVQsR0FBUyxRQUFULEdBQVM7O0FBQzNCLFlBQUksS0FBSixHQUFZLEVBQVo7QUFDRDtBQUhHO0FBUFcsR0FBbkIsQ0FGdUIsQ0FBbEIsQ0FBUDtBQWdCRDs7QUFFRCxTQUFTLGlCQUFULENBQTJCLFNBQTNCLEVBQXNDO0FBQ3BDLE1BQUksZUFBZSxVQUFVLElBQVYsQ0FBZSxNQUFmLENBQXNCLFVBQUMsQ0FBRCxFQUFJLENBQUo7QUFBQSxXQUFVLEtBQUssRUFBRSxTQUFqQjtBQUFBLEdBQXRCLEVBQWtELElBQWxELENBQW5CO0FBQ0EsTUFBSSxlQUFlLEVBQUMsV0FBVyxVQUFVLElBQVYsQ0FBZSxNQUFmLEdBQXdCLEVBQXhCLEdBQTZCLE1BQXpDLEVBQW5COztBQUVBLFNBQU8sa0JBQVEsT0FBUixFQUFpQixFQUFDLE9BQU8sWUFBUixFQUFqQixFQUF3QyxDQUM3QyxnQkFBTSxhQUFOLEVBQXFCO0FBQ25CLFdBQU8sRUFBQyxNQUFNLFVBQVAsRUFBbUIsU0FBUyxZQUE1QjtBQURZLEdBQXJCLENBRDZDLEVBSTdDLGFBQUcsWUFBSCxFQUFpQixVQUFVLElBQVYsQ0FDZCxNQURjLENBQ1AsVUFBVSxRQURILEVBRWQsR0FGYyxDQUVWO0FBQUEsV0FBUSxLQUFLLFFBQUwsQ0FBYyxHQUF0QjtBQUFBLEdBRlUsQ0FBakIsQ0FKNkMsQ0FBeEMsQ0FBUDtBQVNEOztBQUVELFNBQVMsa0JBQVQsQ0FBNEIsU0FBNUIsRUFBdUMsU0FBdkMsRUFBa0QsSUFBbEQsRUFBd0QsS0FBeEQsRUFBK0Q7QUFDN0QsU0FBTyxhQUFHLENBQ1IsVUFBVSxNQUFWLEtBQXFCLFNBQXJCLEdBQ0UsWUFBRSxXQUFGLEVBQWUsRUFBQyxPQUFPLEVBQUMsTUFBTSxJQUFQLEVBQVIsRUFBZixFQUFzQyxLQUF0QyxDQURGLEdBRUUsWUFBRSxFQUFDLE9BQU8sRUFBQyxNQUFNLElBQVAsRUFBUixFQUFGLEVBQXlCLEtBQXpCLENBSE0sQ0FBSCxDQUFQO0FBS0Q7O0FBRUQsU0FBUyxZQUFULENBQXNCLFNBQXRCLEVBQWlDO0FBQy9CLE1BQUksa0JBQWtCLFVBQVUsSUFBVixDQUNuQixNQURtQixDQUNaO0FBQUEsV0FBWSxTQUFTLFNBQXJCO0FBQUEsR0FEWSxFQUVuQixNQUZIO0FBR0EsTUFBSSxlQUFlLFVBQVUsSUFBVixDQUFlLE1BQWYsR0FBd0IsZUFBM0M7QUFDQSxNQUFJLGNBQWMsRUFBQyxXQUFXLFVBQVUsSUFBVixDQUFlLE1BQWYsR0FBd0IsRUFBeEIsR0FBNkIsTUFBekMsRUFBbEI7O0FBRUEsU0FBTyxpQkFBTyxTQUFQLEVBQWtCLEVBQUMsT0FBTyxXQUFSLEVBQWxCLEVBQXdDLENBQzdDLGVBQUssYUFBTCxFQUFvQixDQUNsQixpQkFBTyxPQUFPLFlBQVAsQ0FBUCxDQURrQixFQUVsQixXQUFXLGlCQUFpQixDQUFqQixHQUFxQixHQUFyQixHQUEyQixFQUF0QyxJQUE0QyxPQUYxQixDQUFwQixDQUQ2QyxFQUs3QyxhQUFHLFVBQUgsRUFBZSxDQUNiLG1CQUFtQixTQUFuQixFQUE4QixFQUE5QixFQUFrQyxHQUFsQyxFQUF1QyxLQUF2QyxDQURhLEVBRWIsbUJBQW1CLFNBQW5CLEVBQThCLFFBQTlCLEVBQXdDLFNBQXhDLEVBQW1ELFFBQW5ELENBRmEsRUFHYixtQkFBbUIsU0FBbkIsRUFBOEIsV0FBOUIsRUFBMkMsWUFBM0MsRUFBeUQsV0FBekQsQ0FIYSxDQUFmLENBTDZDLEVBVTVDLGtCQUFrQixDQUFsQixHQUNDLGlCQUFPLGtCQUFQLEVBQTJCLHNCQUFzQixlQUF0QixHQUF3QyxHQUFuRSxDQURELEdBRUcsSUFaeUMsQ0FBeEMsQ0FBUDtBQWVEOzs7Ozs7O0FBT2MsU0FBUyxJQUFULENBQWMsTUFBZCxFQUFzQjtBQUNuQyxTQUFPLE9BQU8sR0FBUCxDQUFXO0FBQUEsV0FDaEIsY0FBSSxDQUNGLGNBREUsRUFFRixrQkFBa0IsS0FBbEIsQ0FGRSxFQUdGLGFBQWEsS0FBYixDQUhFLENBQUosQ0FEZ0I7QUFBQSxHQUFYLENBQVA7QUFPRDs7Ozs7Ozs7QUNsRkQsSUFBTSxZQUFZLEVBQWxCO0FBQ0EsSUFBTSxVQUFVLEVBQWhCOztRQUVRLFMsR0FBQSxTO1FBQVcsTyxHQUFBLE8iLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiXCJ1c2Ugc3RyaWN0XCI7XG5mdW5jdGlvbiBtYWtlU2lua1Byb3hpZXMoZHJpdmVycywgc3RyZWFtQWRhcHRlcikge1xuICAgIHZhciBzaW5rUHJveGllcyA9IHt9O1xuICAgIGZvciAodmFyIG5hbWVfMSBpbiBkcml2ZXJzKSB7XG4gICAgICAgIGlmIChkcml2ZXJzLmhhc093blByb3BlcnR5KG5hbWVfMSkpIHtcbiAgICAgICAgICAgIHZhciBob2xkU3ViamVjdCA9IHN0cmVhbUFkYXB0ZXIubWFrZVN1YmplY3QoKTtcbiAgICAgICAgICAgIHZhciBkcml2ZXJTdHJlYW1BZGFwdGVyID0gZHJpdmVyc1tuYW1lXzFdLnN0cmVhbUFkYXB0ZXIgfHwgc3RyZWFtQWRhcHRlcjtcbiAgICAgICAgICAgIHZhciBzdHJlYW0gPSBkcml2ZXJTdHJlYW1BZGFwdGVyLmFkYXB0KGhvbGRTdWJqZWN0LnN0cmVhbSwgc3RyZWFtQWRhcHRlci5zdHJlYW1TdWJzY3JpYmUpO1xuICAgICAgICAgICAgc2lua1Byb3hpZXNbbmFtZV8xXSA9IHtcbiAgICAgICAgICAgICAgICBzdHJlYW06IHN0cmVhbSxcbiAgICAgICAgICAgICAgICBvYnNlcnZlcjogaG9sZFN1YmplY3Qub2JzZXJ2ZXIsXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBzaW5rUHJveGllcztcbn1cbmZ1bmN0aW9uIGNhbGxEcml2ZXJzKGRyaXZlcnMsIHNpbmtQcm94aWVzLCBzdHJlYW1BZGFwdGVyKSB7XG4gICAgdmFyIHNvdXJjZXMgPSB7fTtcbiAgICBmb3IgKHZhciBuYW1lXzIgaW4gZHJpdmVycykge1xuICAgICAgICBpZiAoZHJpdmVycy5oYXNPd25Qcm9wZXJ0eShuYW1lXzIpKSB7XG4gICAgICAgICAgICB2YXIgZHJpdmVyT3V0cHV0ID0gZHJpdmVyc1tuYW1lXzJdKHNpbmtQcm94aWVzW25hbWVfMl0uc3RyZWFtLCBzdHJlYW1BZGFwdGVyLCBuYW1lXzIpO1xuICAgICAgICAgICAgdmFyIGRyaXZlclN0cmVhbUFkYXB0ZXIgPSBkcml2ZXJzW25hbWVfMl0uc3RyZWFtQWRhcHRlcjtcbiAgICAgICAgICAgIGlmIChkcml2ZXJTdHJlYW1BZGFwdGVyICYmIGRyaXZlclN0cmVhbUFkYXB0ZXIuaXNWYWxpZFN0cmVhbShkcml2ZXJPdXRwdXQpKSB7XG4gICAgICAgICAgICAgICAgc291cmNlc1tuYW1lXzJdID0gc3RyZWFtQWRhcHRlci5hZGFwdChkcml2ZXJPdXRwdXQsIGRyaXZlclN0cmVhbUFkYXB0ZXIuc3RyZWFtU3Vic2NyaWJlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHNvdXJjZXNbbmFtZV8yXSA9IGRyaXZlck91dHB1dDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gc291cmNlcztcbn1cbmZ1bmN0aW9uIHJlcGxpY2F0ZU1hbnkoc2lua3MsIHNpbmtQcm94aWVzLCBzdHJlYW1BZGFwdGVyKSB7XG4gICAgdmFyIHJlc3VsdHMgPSBPYmplY3Qua2V5cyhzaW5rcylcbiAgICAgICAgLmZpbHRlcihmdW5jdGlvbiAobmFtZSkgeyByZXR1cm4gISFzaW5rUHJveGllc1tuYW1lXTsgfSlcbiAgICAgICAgLm1hcChmdW5jdGlvbiAobmFtZSkge1xuICAgICAgICByZXR1cm4gc3RyZWFtQWRhcHRlci5zdHJlYW1TdWJzY3JpYmUoc2lua3NbbmFtZV0sIHNpbmtQcm94aWVzW25hbWVdLm9ic2VydmVyKTtcbiAgICB9KTtcbiAgICB2YXIgZGlzcG9zZUZ1bmN0aW9ucyA9IHJlc3VsdHNcbiAgICAgICAgLmZpbHRlcihmdW5jdGlvbiAoZGlzcG9zZSkgeyByZXR1cm4gdHlwZW9mIGRpc3Bvc2UgPT09ICdmdW5jdGlvbic7IH0pO1xuICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGRpc3Bvc2VGdW5jdGlvbnMuZm9yRWFjaChmdW5jdGlvbiAoZGlzcG9zZSkgeyByZXR1cm4gZGlzcG9zZSgpOyB9KTtcbiAgICB9O1xufVxuZnVuY3Rpb24gZGlzcG9zZVNvdXJjZXMoc291cmNlcykge1xuICAgIGZvciAodmFyIGsgaW4gc291cmNlcykge1xuICAgICAgICBpZiAoc291cmNlcy5oYXNPd25Qcm9wZXJ0eShrKSAmJiBzb3VyY2VzW2tdXG4gICAgICAgICAgICAmJiB0eXBlb2Ygc291cmNlc1trXS5kaXNwb3NlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBzb3VyY2VzW2tdLmRpc3Bvc2UoKTtcbiAgICAgICAgfVxuICAgIH1cbn1cbnZhciBpc09iamVjdEVtcHR5ID0gZnVuY3Rpb24gKG9iaikgeyByZXR1cm4gT2JqZWN0LmtleXMob2JqKS5sZW5ndGggPT09IDA7IH07XG5mdW5jdGlvbiBDeWNsZShtYWluLCBkcml2ZXJzLCBvcHRpb25zKSB7XG4gICAgaWYgKHR5cGVvZiBtYWluICE9PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRmlyc3QgYXJndW1lbnQgZ2l2ZW4gdG8gQ3ljbGUgbXVzdCBiZSB0aGUgJ21haW4nIFwiICtcbiAgICAgICAgICAgIFwiZnVuY3Rpb24uXCIpO1xuICAgIH1cbiAgICBpZiAodHlwZW9mIGRyaXZlcnMgIT09IFwib2JqZWN0XCIgfHwgZHJpdmVycyA9PT0gbnVsbCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJTZWNvbmQgYXJndW1lbnQgZ2l2ZW4gdG8gQ3ljbGUgbXVzdCBiZSBhbiBvYmplY3QgXCIgK1xuICAgICAgICAgICAgXCJ3aXRoIGRyaXZlciBmdW5jdGlvbnMgYXMgcHJvcGVydGllcy5cIik7XG4gICAgfVxuICAgIGlmIChpc09iamVjdEVtcHR5KGRyaXZlcnMpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIlNlY29uZCBhcmd1bWVudCBnaXZlbiB0byBDeWNsZSBtdXN0IGJlIGFuIG9iamVjdCBcIiArXG4gICAgICAgICAgICBcIndpdGggYXQgbGVhc3Qgb25lIGRyaXZlciBmdW5jdGlvbiBkZWNsYXJlZCBhcyBhIHByb3BlcnR5LlwiKTtcbiAgICB9XG4gICAgdmFyIHN0cmVhbUFkYXB0ZXIgPSBvcHRpb25zLnN0cmVhbUFkYXB0ZXI7XG4gICAgaWYgKCFzdHJlYW1BZGFwdGVyIHx8IGlzT2JqZWN0RW1wdHkoc3RyZWFtQWRhcHRlcikpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVGhpcmQgYXJndW1lbnQgZ2l2ZW4gdG8gQ3ljbGUgbXVzdCBiZSBhbiBvcHRpb25zIG9iamVjdCBcIiArXG4gICAgICAgICAgICBcIndpdGggdGhlIHN0cmVhbUFkYXB0ZXIga2V5IHN1cHBsaWVkIHdpdGggYSB2YWxpZCBzdHJlYW0gYWRhcHRlci5cIik7XG4gICAgfVxuICAgIHZhciBzaW5rUHJveGllcyA9IG1ha2VTaW5rUHJveGllcyhkcml2ZXJzLCBzdHJlYW1BZGFwdGVyKTtcbiAgICB2YXIgc291cmNlcyA9IGNhbGxEcml2ZXJzKGRyaXZlcnMsIHNpbmtQcm94aWVzLCBzdHJlYW1BZGFwdGVyKTtcbiAgICB2YXIgc2lua3MgPSBtYWluKHNvdXJjZXMpO1xuICAgIGlmICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICB3aW5kb3cuQ3ljbGVqcyA9IHsgc2lua3M6IHNpbmtzIH07XG4gICAgfVxuICAgIHZhciBydW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBkaXNwb3NlUmVwbGljYXRpb24gPSByZXBsaWNhdGVNYW55KHNpbmtzLCBzaW5rUHJveGllcywgc3RyZWFtQWRhcHRlcik7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBzdHJlYW1BZGFwdGVyLmRpc3Bvc2Uoc2lua3MsIHNpbmtQcm94aWVzLCBzb3VyY2VzKTtcbiAgICAgICAgICAgIGRpc3Bvc2VTb3VyY2VzKHNvdXJjZXMpO1xuICAgICAgICAgICAgZGlzcG9zZVJlcGxpY2F0aW9uKCk7XG4gICAgICAgIH07XG4gICAgfTtcbiAgICByZXR1cm4geyBzaW5rczogc2lua3MsIHNvdXJjZXM6IHNvdXJjZXMsIHJ1bjogcnVuIH07XG59XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XG5leHBvcnRzLmRlZmF1bHQgPSBDeWNsZTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWluZGV4LmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xudmFyIHhzdHJlYW1fYWRhcHRlcl8xID0gcmVxdWlyZSgnQGN5Y2xlL3hzdHJlYW0tYWRhcHRlcicpO1xudmFyIHhzdHJlYW1fMSA9IHJlcXVpcmUoJ3hzdHJlYW0nKTtcbnZhciBFbGVtZW50RmluZGVyXzEgPSByZXF1aXJlKCcuL0VsZW1lbnRGaW5kZXInKTtcbnZhciBmcm9tRXZlbnRfMSA9IHJlcXVpcmUoJy4vZnJvbUV2ZW50Jyk7XG52YXIgaXNvbGF0ZV8xID0gcmVxdWlyZSgnLi9pc29sYXRlJyk7XG52YXIgRXZlbnREZWxlZ2F0b3JfMSA9IHJlcXVpcmUoJy4vRXZlbnREZWxlZ2F0b3InKTtcbnZhciB1dGlsc18xID0gcmVxdWlyZSgnLi91dGlscycpO1xudmFyIG1hdGNoZXNTZWxlY3RvcjtcbnRyeSB7XG4gICAgbWF0Y2hlc1NlbGVjdG9yID0gcmVxdWlyZShcIm1hdGNoZXMtc2VsZWN0b3JcIik7XG59XG5jYXRjaCAoZSkge1xuICAgIG1hdGNoZXNTZWxlY3RvciA9IEZ1bmN0aW9uLnByb3RvdHlwZTtcbn1cbnZhciBldmVudFR5cGVzVGhhdERvbnRCdWJibGUgPSBbXG4gICAgXCJsb2FkXCIsXG4gICAgXCJ1bmxvYWRcIixcbiAgICBcImZvY3VzXCIsXG4gICAgXCJibHVyXCIsXG4gICAgXCJtb3VzZWVudGVyXCIsXG4gICAgXCJtb3VzZWxlYXZlXCIsXG4gICAgXCJzdWJtaXRcIixcbiAgICBcImNoYW5nZVwiLFxuICAgIFwicmVzZXRcIixcbiAgICBcInRpbWV1cGRhdGVcIixcbiAgICBcInBsYXlpbmdcIixcbiAgICBcIndhaXRpbmdcIixcbiAgICBcInNlZWtpbmdcIixcbiAgICBcInNlZWtlZFwiLFxuICAgIFwiZW5kZWRcIixcbiAgICBcImxvYWRlZG1ldGFkYXRhXCIsXG4gICAgXCJsb2FkZWRkYXRhXCIsXG4gICAgXCJjYW5wbGF5XCIsXG4gICAgXCJjYW5wbGF5dGhyb3VnaFwiLFxuICAgIFwiZHVyYXRpb25jaGFuZ2VcIixcbiAgICBcInBsYXlcIixcbiAgICBcInBhdXNlXCIsXG4gICAgXCJyYXRlY2hhbmdlXCIsXG4gICAgXCJ2b2x1bWVjaGFuZ2VcIixcbiAgICBcInN1c3BlbmRcIixcbiAgICBcImVtcHRpZWRcIixcbiAgICBcInN0YWxsZWRcIixcbl07XG5mdW5jdGlvbiBkZXRlcm1pbmVVc2VDYXB0dXJlKGV2ZW50VHlwZSwgb3B0aW9ucykge1xuICAgIHZhciByZXN1bHQgPSBmYWxzZTtcbiAgICBpZiAodHlwZW9mIG9wdGlvbnMudXNlQ2FwdHVyZSA9PT0gXCJib29sZWFuXCIpIHtcbiAgICAgICAgcmVzdWx0ID0gb3B0aW9ucy51c2VDYXB0dXJlO1xuICAgIH1cbiAgICBpZiAoZXZlbnRUeXBlc1RoYXREb250QnViYmxlLmluZGV4T2YoZXZlbnRUeXBlKSAhPT0gLTEpIHtcbiAgICAgICAgcmVzdWx0ID0gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbn1cbnZhciBET01Tb3VyY2UgPSAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIERPTVNvdXJjZShfcm9vdEVsZW1lbnQkLCBfcnVuU3RyZWFtQWRhcHRlciwgX25hbWVzcGFjZSwgX2lzb2xhdGVNb2R1bGUsIF9kZWxlZ2F0b3JzKSB7XG4gICAgICAgIGlmIChfbmFtZXNwYWNlID09PSB2b2lkIDApIHsgX25hbWVzcGFjZSA9IFtdOyB9XG4gICAgICAgIHRoaXMuX3Jvb3RFbGVtZW50JCA9IF9yb290RWxlbWVudCQ7XG4gICAgICAgIHRoaXMuX3J1blN0cmVhbUFkYXB0ZXIgPSBfcnVuU3RyZWFtQWRhcHRlcjtcbiAgICAgICAgdGhpcy5fbmFtZXNwYWNlID0gX25hbWVzcGFjZTtcbiAgICAgICAgdGhpcy5faXNvbGF0ZU1vZHVsZSA9IF9pc29sYXRlTW9kdWxlO1xuICAgICAgICB0aGlzLl9kZWxlZ2F0b3JzID0gX2RlbGVnYXRvcnM7XG4gICAgICAgIHRoaXMuaXNvbGF0ZVNvdXJjZSA9IGlzb2xhdGVfMS5pc29sYXRlU291cmNlO1xuICAgICAgICB0aGlzLmlzb2xhdGVTaW5rID0gaXNvbGF0ZV8xLmlzb2xhdGVTaW5rO1xuICAgIH1cbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoRE9NU291cmNlLnByb3RvdHlwZSwgXCJlbGVtZW50c1wiLCB7XG4gICAgICAgIGdldDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYgKHRoaXMuX25hbWVzcGFjZS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5fcnVuU3RyZWFtQWRhcHRlci5hZGFwdCh0aGlzLl9yb290RWxlbWVudCQsIHhzdHJlYW1fYWRhcHRlcl8xLmRlZmF1bHQuc3RyZWFtU3Vic2NyaWJlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHZhciBlbGVtZW50RmluZGVyXzEgPSBuZXcgRWxlbWVudEZpbmRlcl8xLkVsZW1lbnRGaW5kZXIodGhpcy5fbmFtZXNwYWNlLCB0aGlzLl9pc29sYXRlTW9kdWxlKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5fcnVuU3RyZWFtQWRhcHRlci5hZGFwdCh0aGlzLl9yb290RWxlbWVudCQubWFwKGZ1bmN0aW9uIChlbCkgeyByZXR1cm4gZWxlbWVudEZpbmRlcl8xLmNhbGwoZWwpOyB9KSwgeHN0cmVhbV9hZGFwdGVyXzEuZGVmYXVsdC5zdHJlYW1TdWJzY3JpYmUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgICAgICBjb25maWd1cmFibGU6IHRydWVcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoRE9NU291cmNlLnByb3RvdHlwZSwgXCJuYW1lc3BhY2VcIiwge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9uYW1lc3BhY2U7XG4gICAgICAgIH0sXG4gICAgICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgIH0pO1xuICAgIERPTVNvdXJjZS5wcm90b3R5cGUuc2VsZWN0ID0gZnVuY3Rpb24gKHNlbGVjdG9yKSB7XG4gICAgICAgIGlmICh0eXBlb2Ygc2VsZWN0b3IgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJET00gZHJpdmVyJ3Mgc2VsZWN0KCkgZXhwZWN0cyB0aGUgYXJndW1lbnQgdG8gYmUgYSBcIiArXG4gICAgICAgICAgICAgICAgXCJzdHJpbmcgYXMgYSBDU1Mgc2VsZWN0b3JcIik7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHRyaW1tZWRTZWxlY3RvciA9IHNlbGVjdG9yLnRyaW0oKTtcbiAgICAgICAgdmFyIGNoaWxkTmFtZXNwYWNlID0gdHJpbW1lZFNlbGVjdG9yID09PSBcIjpyb290XCIgP1xuICAgICAgICAgICAgdGhpcy5fbmFtZXNwYWNlIDpcbiAgICAgICAgICAgIHRoaXMuX25hbWVzcGFjZS5jb25jYXQodHJpbW1lZFNlbGVjdG9yKTtcbiAgICAgICAgcmV0dXJuIG5ldyBET01Tb3VyY2UodGhpcy5fcm9vdEVsZW1lbnQkLCB0aGlzLl9ydW5TdHJlYW1BZGFwdGVyLCBjaGlsZE5hbWVzcGFjZSwgdGhpcy5faXNvbGF0ZU1vZHVsZSwgdGhpcy5fZGVsZWdhdG9ycyk7XG4gICAgfTtcbiAgICBET01Tb3VyY2UucHJvdG90eXBlLmV2ZW50cyA9IGZ1bmN0aW9uIChldmVudFR5cGUsIG9wdGlvbnMpIHtcbiAgICAgICAgaWYgKG9wdGlvbnMgPT09IHZvaWQgMCkgeyBvcHRpb25zID0ge307IH1cbiAgICAgICAgaWYgKHR5cGVvZiBldmVudFR5cGUgIT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkRPTSBkcml2ZXIncyBldmVudHMoKSBleHBlY3RzIGFyZ3VtZW50IHRvIGJlIGEgXCIgK1xuICAgICAgICAgICAgICAgIFwic3RyaW5nIHJlcHJlc2VudGluZyB0aGUgZXZlbnQgdHlwZSB0byBsaXN0ZW4gZm9yLlwiKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgdXNlQ2FwdHVyZSA9IGRldGVybWluZVVzZUNhcHR1cmUoZXZlbnRUeXBlLCBvcHRpb25zKTtcbiAgICAgICAgdmFyIG5hbWVzcGFjZSA9IHRoaXMuX25hbWVzcGFjZTtcbiAgICAgICAgdmFyIHNjb3BlID0gdXRpbHNfMS5nZXRTY29wZShuYW1lc3BhY2UpO1xuICAgICAgICB2YXIga2V5UGFydHMgPSBbZXZlbnRUeXBlLCB1c2VDYXB0dXJlXTtcbiAgICAgICAgaWYgKHNjb3BlKSB7XG4gICAgICAgICAgICBrZXlQYXJ0cy5wdXNoKHNjb3BlKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIga2V5ID0ga2V5UGFydHMuam9pbignficpO1xuICAgICAgICB2YXIgZG9tU291cmNlID0gdGhpcztcbiAgICAgICAgdmFyIHJvb3RFbGVtZW50JDtcbiAgICAgICAgaWYgKHNjb3BlKSB7XG4gICAgICAgICAgICB2YXIgaGFkSXNvbGF0ZWRfbXV0YWJsZV8xID0gZmFsc2U7XG4gICAgICAgICAgICByb290RWxlbWVudCQgPSB0aGlzLl9yb290RWxlbWVudCRcbiAgICAgICAgICAgICAgICAuZmlsdGVyKGZ1bmN0aW9uIChyb290RWxlbWVudCkge1xuICAgICAgICAgICAgICAgIHZhciBoYXNJc29sYXRlZCA9ICEhZG9tU291cmNlLl9pc29sYXRlTW9kdWxlLmdldElzb2xhdGVkRWxlbWVudChzY29wZSk7XG4gICAgICAgICAgICAgICAgdmFyIHNob3VsZFBhc3MgPSBoYXNJc29sYXRlZCAmJiAhaGFkSXNvbGF0ZWRfbXV0YWJsZV8xO1xuICAgICAgICAgICAgICAgIGhhZElzb2xhdGVkX211dGFibGVfMSA9IGhhc0lzb2xhdGVkO1xuICAgICAgICAgICAgICAgIHJldHVybiBzaG91bGRQYXNzO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICByb290RWxlbWVudCQgPSB0aGlzLl9yb290RWxlbWVudCQudGFrZSgyKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgZXZlbnQkID0gcm9vdEVsZW1lbnQkXG4gICAgICAgICAgICAubWFwKGZ1bmN0aW9uIHNldHVwRXZlbnREZWxlZ2F0b3JPblRvcEVsZW1lbnQocm9vdEVsZW1lbnQpIHtcbiAgICAgICAgICAgIC8vIEV2ZW50IGxpc3RlbmVyIGp1c3QgZm9yIHRoZSByb290IGVsZW1lbnRcbiAgICAgICAgICAgIGlmICghbmFtZXNwYWNlIHx8IG5hbWVzcGFjZS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZnJvbUV2ZW50XzEuZnJvbUV2ZW50KHJvb3RFbGVtZW50LCBldmVudFR5cGUsIHVzZUNhcHR1cmUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gRXZlbnQgbGlzdGVuZXIgb24gdGhlIHRvcCBlbGVtZW50IGFzIGFuIEV2ZW50RGVsZWdhdG9yXG4gICAgICAgICAgICB2YXIgZGVsZWdhdG9ycyA9IGRvbVNvdXJjZS5fZGVsZWdhdG9ycztcbiAgICAgICAgICAgIHZhciB0b3AgPSBzY29wZVxuICAgICAgICAgICAgICAgID8gZG9tU291cmNlLl9pc29sYXRlTW9kdWxlLmdldElzb2xhdGVkRWxlbWVudChzY29wZSlcbiAgICAgICAgICAgICAgICA6IHJvb3RFbGVtZW50O1xuICAgICAgICAgICAgdmFyIGRlbGVnYXRvcjtcbiAgICAgICAgICAgIGlmIChkZWxlZ2F0b3JzLmhhcyhrZXkpKSB7XG4gICAgICAgICAgICAgICAgZGVsZWdhdG9yID0gZGVsZWdhdG9ycy5nZXQoa2V5KTtcbiAgICAgICAgICAgICAgICBkZWxlZ2F0b3IudXBkYXRlVG9wRWxlbWVudCh0b3ApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgZGVsZWdhdG9yID0gbmV3IEV2ZW50RGVsZWdhdG9yXzEuRXZlbnREZWxlZ2F0b3IodG9wLCBldmVudFR5cGUsIHVzZUNhcHR1cmUsIGRvbVNvdXJjZS5faXNvbGF0ZU1vZHVsZSk7XG4gICAgICAgICAgICAgICAgZGVsZWdhdG9ycy5zZXQoa2V5LCBkZWxlZ2F0b3IpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIHN1YmplY3QgPSB4c3RyZWFtXzEuZGVmYXVsdC5jcmVhdGUoKTtcbiAgICAgICAgICAgIGlmIChzY29wZSkge1xuICAgICAgICAgICAgICAgIGRvbVNvdXJjZS5faXNvbGF0ZU1vZHVsZS5hZGRFdmVudERlbGVnYXRvcihzY29wZSwgZGVsZWdhdG9yKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRlbGVnYXRvci5hZGREZXN0aW5hdGlvbihzdWJqZWN0LCBuYW1lc3BhY2UpO1xuICAgICAgICAgICAgcmV0dXJuIHN1YmplY3Q7XG4gICAgICAgIH0pXG4gICAgICAgICAgICAuZmxhdHRlbigpO1xuICAgICAgICByZXR1cm4gdGhpcy5fcnVuU3RyZWFtQWRhcHRlci5hZGFwdChldmVudCQsIHhzdHJlYW1fYWRhcHRlcl8xLmRlZmF1bHQuc3RyZWFtU3Vic2NyaWJlKTtcbiAgICB9O1xuICAgIERPTVNvdXJjZS5wcm90b3R5cGUuZGlzcG9zZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5faXNvbGF0ZU1vZHVsZS5yZXNldCgpO1xuICAgIH07XG4gICAgcmV0dXJuIERPTVNvdXJjZTtcbn0oKSk7XG5leHBvcnRzLkRPTVNvdXJjZSA9IERPTVNvdXJjZTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPURPTVNvdXJjZS5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcbnZhciBTY29wZUNoZWNrZXJfMSA9IHJlcXVpcmUoJy4vU2NvcGVDaGVja2VyJyk7XG52YXIgdXRpbHNfMSA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcbnZhciBtYXRjaGVzU2VsZWN0b3I7XG50cnkge1xuICAgIG1hdGNoZXNTZWxlY3RvciA9IHJlcXVpcmUoXCJtYXRjaGVzLXNlbGVjdG9yXCIpO1xufVxuY2F0Y2ggKGUpIHtcbiAgICBtYXRjaGVzU2VsZWN0b3IgPSBGdW5jdGlvbi5wcm90b3R5cGU7XG59XG5mdW5jdGlvbiB0b0VsQXJyYXkoaW5wdXQpIHtcbiAgICByZXR1cm4gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoaW5wdXQpO1xufVxudmFyIEVsZW1lbnRGaW5kZXIgPSAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIEVsZW1lbnRGaW5kZXIobmFtZXNwYWNlLCBpc29sYXRlTW9kdWxlKSB7XG4gICAgICAgIHRoaXMubmFtZXNwYWNlID0gbmFtZXNwYWNlO1xuICAgICAgICB0aGlzLmlzb2xhdGVNb2R1bGUgPSBpc29sYXRlTW9kdWxlO1xuICAgIH1cbiAgICBFbGVtZW50RmluZGVyLnByb3RvdHlwZS5jYWxsID0gZnVuY3Rpb24gKHJvb3RFbGVtZW50KSB7XG4gICAgICAgIHZhciBuYW1lc3BhY2UgPSB0aGlzLm5hbWVzcGFjZTtcbiAgICAgICAgaWYgKG5hbWVzcGFjZS5qb2luKFwiXCIpID09PSBcIlwiKSB7XG4gICAgICAgICAgICByZXR1cm4gcm9vdEVsZW1lbnQ7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHNjb3BlID0gdXRpbHNfMS5nZXRTY29wZShuYW1lc3BhY2UpO1xuICAgICAgICB2YXIgc2NvcGVDaGVja2VyID0gbmV3IFNjb3BlQ2hlY2tlcl8xLlNjb3BlQ2hlY2tlcihzY29wZSwgdGhpcy5pc29sYXRlTW9kdWxlKTtcbiAgICAgICAgdmFyIHNlbGVjdG9yID0gdXRpbHNfMS5nZXRTZWxlY3RvcnMobmFtZXNwYWNlKTtcbiAgICAgICAgdmFyIHRvcE5vZGUgPSByb290RWxlbWVudDtcbiAgICAgICAgdmFyIHRvcE5vZGVNYXRjaGVzID0gW107XG4gICAgICAgIGlmIChzY29wZS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICB0b3BOb2RlID0gdGhpcy5pc29sYXRlTW9kdWxlLmdldElzb2xhdGVkRWxlbWVudChzY29wZSkgfHwgcm9vdEVsZW1lbnQ7XG4gICAgICAgICAgICBpZiAoc2VsZWN0b3IgJiYgbWF0Y2hlc1NlbGVjdG9yKHRvcE5vZGUsIHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgICAgIHRvcE5vZGVNYXRjaGVzLnB1c2godG9wTm9kZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRvRWxBcnJheSh0b3BOb2RlLnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpKVxuICAgICAgICAgICAgLmZpbHRlcihzY29wZUNoZWNrZXIuaXNTdHJpY3RseUluUm9vdFNjb3BlLCBzY29wZUNoZWNrZXIpXG4gICAgICAgICAgICAuY29uY2F0KHRvcE5vZGVNYXRjaGVzKTtcbiAgICB9O1xuICAgIHJldHVybiBFbGVtZW50RmluZGVyO1xufSgpKTtcbmV4cG9ydHMuRWxlbWVudEZpbmRlciA9IEVsZW1lbnRGaW5kZXI7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1FbGVtZW50RmluZGVyLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xudmFyIFNjb3BlQ2hlY2tlcl8xID0gcmVxdWlyZSgnLi9TY29wZUNoZWNrZXInKTtcbnZhciB1dGlsc18xID0gcmVxdWlyZSgnLi91dGlscycpO1xudmFyIG1hdGNoZXNTZWxlY3RvcjtcbnRyeSB7XG4gICAgbWF0Y2hlc1NlbGVjdG9yID0gcmVxdWlyZShcIm1hdGNoZXMtc2VsZWN0b3JcIik7XG59XG5jYXRjaCAoZSkge1xuICAgIG1hdGNoZXNTZWxlY3RvciA9IEZ1bmN0aW9uLnByb3RvdHlwZTtcbn1cbi8qKlxuICogQXR0YWNoZXMgYW4gYWN0dWFsIGV2ZW50IGxpc3RlbmVyIHRvIHRoZSBET00gcm9vdCBlbGVtZW50LFxuICogaGFuZGxlcyBcImRlc3RpbmF0aW9uc1wiIChpbnRlcmVzdGVkIERPTVNvdXJjZSBvdXRwdXQgc3ViamVjdHMpLCBhbmQgYnViYmxpbmcuXG4gKi9cbnZhciBFdmVudERlbGVnYXRvciA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gRXZlbnREZWxlZ2F0b3IodG9wRWxlbWVudCwgZXZlbnRUeXBlLCB1c2VDYXB0dXJlLCBpc29sYXRlTW9kdWxlKSB7XG4gICAgICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgICAgIHRoaXMudG9wRWxlbWVudCA9IHRvcEVsZW1lbnQ7XG4gICAgICAgIHRoaXMuZXZlbnRUeXBlID0gZXZlbnRUeXBlO1xuICAgICAgICB0aGlzLnVzZUNhcHR1cmUgPSB1c2VDYXB0dXJlO1xuICAgICAgICB0aGlzLmlzb2xhdGVNb2R1bGUgPSBpc29sYXRlTW9kdWxlO1xuICAgICAgICB0aGlzLmRlc3RpbmF0aW9ucyA9IFtdO1xuICAgICAgICB0aGlzLnJvb2YgPSB0b3BFbGVtZW50LnBhcmVudEVsZW1lbnQ7XG4gICAgICAgIGlmICh1c2VDYXB0dXJlKSB7XG4gICAgICAgICAgICB0aGlzLmRvbUxpc3RlbmVyID0gZnVuY3Rpb24gKGV2KSB7IHJldHVybiBfdGhpcy5jYXB0dXJlKGV2KTsgfTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuZG9tTGlzdGVuZXIgPSBmdW5jdGlvbiAoZXYpIHsgcmV0dXJuIF90aGlzLmJ1YmJsZShldik7IH07XG4gICAgICAgIH1cbiAgICAgICAgdG9wRWxlbWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50VHlwZSwgdGhpcy5kb21MaXN0ZW5lciwgdXNlQ2FwdHVyZSk7XG4gICAgfVxuICAgIEV2ZW50RGVsZWdhdG9yLnByb3RvdHlwZS5idWJibGUgPSBmdW5jdGlvbiAocmF3RXZlbnQpIHtcbiAgICAgICAgaWYgKCFkb2N1bWVudC5ib2R5LmNvbnRhaW5zKHJhd0V2ZW50LmN1cnJlbnRUYXJnZXQpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGV2ID0gdGhpcy5wYXRjaEV2ZW50KHJhd0V2ZW50KTtcbiAgICAgICAgZm9yICh2YXIgZWwgPSBldi50YXJnZXQ7IGVsICYmIGVsICE9PSB0aGlzLnJvb2Y7IGVsID0gZWwucGFyZW50RWxlbWVudCkge1xuICAgICAgICAgICAgaWYgKGV2LnByb3BhZ2F0aW9uSGFzQmVlblN0b3BwZWQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLm1hdGNoRXZlbnRBZ2FpbnN0RGVzdGluYXRpb25zKGVsLCBldik7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIEV2ZW50RGVsZWdhdG9yLnByb3RvdHlwZS5tYXRjaEV2ZW50QWdhaW5zdERlc3RpbmF0aW9ucyA9IGZ1bmN0aW9uIChlbCwgZXYpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIG4gPSB0aGlzLmRlc3RpbmF0aW9ucy5sZW5ndGg7IGkgPCBuOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBkZXN0ID0gdGhpcy5kZXN0aW5hdGlvbnNbaV07XG4gICAgICAgICAgICBpZiAoIWRlc3Quc2NvcGVDaGVja2VyLmlzU3RyaWN0bHlJblJvb3RTY29wZShlbCkpIHtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChtYXRjaGVzU2VsZWN0b3IoZWwsIGRlc3Quc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5tdXRhdGVFdmVudEN1cnJlbnRUYXJnZXQoZXYsIGVsKTtcbiAgICAgICAgICAgICAgICBkZXN0LnN1YmplY3QuX24oZXYpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcbiAgICBFdmVudERlbGVnYXRvci5wcm90b3R5cGUuY2FwdHVyZSA9IGZ1bmN0aW9uIChldikge1xuICAgICAgICBmb3IgKHZhciBpID0gMCwgbiA9IHRoaXMuZGVzdGluYXRpb25zLmxlbmd0aDsgaSA8IG47IGkrKykge1xuICAgICAgICAgICAgdmFyIGRlc3QgPSB0aGlzLmRlc3RpbmF0aW9uc1tpXTtcbiAgICAgICAgICAgIGlmIChtYXRjaGVzU2VsZWN0b3IoZXYudGFyZ2V0LCBkZXN0LnNlbGVjdG9yKSkge1xuICAgICAgICAgICAgICAgIGRlc3Quc3ViamVjdC5fbihldik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuICAgIEV2ZW50RGVsZWdhdG9yLnByb3RvdHlwZS5hZGREZXN0aW5hdGlvbiA9IGZ1bmN0aW9uIChzdWJqZWN0LCBuYW1lc3BhY2UpIHtcbiAgICAgICAgdmFyIHNjb3BlID0gdXRpbHNfMS5nZXRTY29wZShuYW1lc3BhY2UpO1xuICAgICAgICB2YXIgc2VsZWN0b3IgPSB1dGlsc18xLmdldFNlbGVjdG9ycyhuYW1lc3BhY2UpO1xuICAgICAgICB2YXIgc2NvcGVDaGVja2VyID0gbmV3IFNjb3BlQ2hlY2tlcl8xLlNjb3BlQ2hlY2tlcihzY29wZSwgdGhpcy5pc29sYXRlTW9kdWxlKTtcbiAgICAgICAgdGhpcy5kZXN0aW5hdGlvbnMucHVzaCh7IHN1YmplY3Q6IHN1YmplY3QsIHNjb3BlQ2hlY2tlcjogc2NvcGVDaGVja2VyLCBzZWxlY3Rvcjogc2VsZWN0b3IgfSk7XG4gICAgfTtcbiAgICBFdmVudERlbGVnYXRvci5wcm90b3R5cGUucGF0Y2hFdmVudCA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICB2YXIgcEV2ZW50ID0gZXZlbnQ7XG4gICAgICAgIHBFdmVudC5wcm9wYWdhdGlvbkhhc0JlZW5TdG9wcGVkID0gZmFsc2U7XG4gICAgICAgIHZhciBvbGRTdG9wUHJvcGFnYXRpb24gPSBwRXZlbnQuc3RvcFByb3BhZ2F0aW9uO1xuICAgICAgICBwRXZlbnQuc3RvcFByb3BhZ2F0aW9uID0gZnVuY3Rpb24gc3RvcFByb3BhZ2F0aW9uKCkge1xuICAgICAgICAgICAgb2xkU3RvcFByb3BhZ2F0aW9uLmNhbGwodGhpcyk7XG4gICAgICAgICAgICB0aGlzLnByb3BhZ2F0aW9uSGFzQmVlblN0b3BwZWQgPSB0cnVlO1xuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gcEV2ZW50O1xuICAgIH07XG4gICAgRXZlbnREZWxlZ2F0b3IucHJvdG90eXBlLm11dGF0ZUV2ZW50Q3VycmVudFRhcmdldCA9IGZ1bmN0aW9uIChldmVudCwgY3VycmVudFRhcmdldEVsZW1lbnQpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShldmVudCwgXCJjdXJyZW50VGFyZ2V0XCIsIHtcbiAgICAgICAgICAgICAgICB2YWx1ZTogY3VycmVudFRhcmdldEVsZW1lbnQsXG4gICAgICAgICAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJwbGVhc2UgdXNlIGV2ZW50Lm93bmVyVGFyZ2V0XCIpO1xuICAgICAgICB9XG4gICAgICAgIGV2ZW50Lm93bmVyVGFyZ2V0ID0gY3VycmVudFRhcmdldEVsZW1lbnQ7XG4gICAgfTtcbiAgICBFdmVudERlbGVnYXRvci5wcm90b3R5cGUudXBkYXRlVG9wRWxlbWVudCA9IGZ1bmN0aW9uIChuZXdUb3BFbGVtZW50KSB7XG4gICAgICAgIHRoaXMudG9wRWxlbWVudC5yZW1vdmVFdmVudExpc3RlbmVyKHRoaXMuZXZlbnRUeXBlLCB0aGlzLmRvbUxpc3RlbmVyLCB0aGlzLnVzZUNhcHR1cmUpO1xuICAgICAgICBuZXdUb3BFbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIodGhpcy5ldmVudFR5cGUsIHRoaXMuZG9tTGlzdGVuZXIsIHRoaXMudXNlQ2FwdHVyZSk7XG4gICAgICAgIHRoaXMudG9wRWxlbWVudCA9IG5ld1RvcEVsZW1lbnQ7XG4gICAgfTtcbiAgICByZXR1cm4gRXZlbnREZWxlZ2F0b3I7XG59KCkpO1xuZXhwb3J0cy5FdmVudERlbGVnYXRvciA9IEV2ZW50RGVsZWdhdG9yO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9RXZlbnREZWxlZ2F0b3IuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgeHN0cmVhbV8xID0gcmVxdWlyZSgneHN0cmVhbScpO1xudmFyIHhzdHJlYW1fYWRhcHRlcl8xID0gcmVxdWlyZSgnQGN5Y2xlL3hzdHJlYW0tYWRhcHRlcicpO1xudmFyIHRvSFRNTCA9IHJlcXVpcmUoJ3NuYWJiZG9tLXRvLWh0bWwnKTtcbnZhciBIVE1MU291cmNlID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBIVE1MU291cmNlKHZub2RlJCwgcnVuU3RyZWFtQWRhcHRlcikge1xuICAgICAgICB0aGlzLnJ1blN0cmVhbUFkYXB0ZXIgPSBydW5TdHJlYW1BZGFwdGVyO1xuICAgICAgICB0aGlzLl9odG1sJCA9IHZub2RlJC5sYXN0KCkubWFwKHRvSFRNTCk7XG4gICAgICAgIHRoaXMuX2VtcHR5JCA9IHJ1blN0cmVhbUFkYXB0ZXIuYWRhcHQoeHN0cmVhbV8xLmRlZmF1bHQuZW1wdHkoKSwgeHN0cmVhbV9hZGFwdGVyXzEuZGVmYXVsdC5zdHJlYW1TdWJzY3JpYmUpO1xuICAgIH1cbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoSFRNTFNvdXJjZS5wcm90b3R5cGUsIFwiZWxlbWVudHNcIiwge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnJ1blN0cmVhbUFkYXB0ZXIuYWRhcHQodGhpcy5faHRtbCQsIHhzdHJlYW1fYWRhcHRlcl8xLmRlZmF1bHQuc3RyZWFtU3Vic2NyaWJlKTtcbiAgICAgICAgfSxcbiAgICAgICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlXG4gICAgfSk7XG4gICAgSFRNTFNvdXJjZS5wcm90b3R5cGUuc2VsZWN0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gbmV3IEhUTUxTb3VyY2UoeHN0cmVhbV8xLmRlZmF1bHQuZW1wdHkoKSwgdGhpcy5ydW5TdHJlYW1BZGFwdGVyKTtcbiAgICB9O1xuICAgIEhUTUxTb3VyY2UucHJvdG90eXBlLmV2ZW50cyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2VtcHR5JDtcbiAgICB9O1xuICAgIHJldHVybiBIVE1MU291cmNlO1xufSgpKTtcbmV4cG9ydHMuSFRNTFNvdXJjZSA9IEhUTUxTb3VyY2U7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1IVE1MU291cmNlLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xudmFyIFNjb3BlQ2hlY2tlciA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gU2NvcGVDaGVja2VyKHNjb3BlLCBpc29sYXRlTW9kdWxlKSB7XG4gICAgICAgIHRoaXMuc2NvcGUgPSBzY29wZTtcbiAgICAgICAgdGhpcy5pc29sYXRlTW9kdWxlID0gaXNvbGF0ZU1vZHVsZTtcbiAgICB9XG4gICAgU2NvcGVDaGVja2VyLnByb3RvdHlwZS5pc1N0cmljdGx5SW5Sb290U2NvcGUgPSBmdW5jdGlvbiAobGVhZikge1xuICAgICAgICBmb3IgKHZhciBlbCA9IGxlYWY7IGVsOyBlbCA9IGVsLnBhcmVudEVsZW1lbnQpIHtcbiAgICAgICAgICAgIHZhciBzY29wZSA9IHRoaXMuaXNvbGF0ZU1vZHVsZS5pc0lzb2xhdGVkRWxlbWVudChlbCk7XG4gICAgICAgICAgICBpZiAoc2NvcGUgJiYgc2NvcGUgIT09IHRoaXMuc2NvcGUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoc2NvcGUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9O1xuICAgIHJldHVybiBTY29wZUNoZWNrZXI7XG59KCkpO1xuZXhwb3J0cy5TY29wZUNoZWNrZXIgPSBTY29wZUNoZWNrZXI7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1TY29wZUNoZWNrZXIuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgaHlwZXJzY3JpcHRfMSA9IHJlcXVpcmUoJy4vaHlwZXJzY3JpcHQnKTtcbnZhciBjbGFzc05hbWVGcm9tVk5vZGVfMSA9IHJlcXVpcmUoJ3NuYWJiZG9tLXNlbGVjdG9yL2xpYi9jbGFzc05hbWVGcm9tVk5vZGUnKTtcbnZhciBzZWxlY3RvclBhcnNlcl8xID0gcmVxdWlyZSgnc25hYmJkb20tc2VsZWN0b3IvbGliL3NlbGVjdG9yUGFyc2VyJyk7XG52YXIgVk5vZGVXcmFwcGVyID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBWTm9kZVdyYXBwZXIocm9vdEVsZW1lbnQpIHtcbiAgICAgICAgdGhpcy5yb290RWxlbWVudCA9IHJvb3RFbGVtZW50O1xuICAgIH1cbiAgICBWTm9kZVdyYXBwZXIucHJvdG90eXBlLmNhbGwgPSBmdW5jdGlvbiAodm5vZGUpIHtcbiAgICAgICAgdmFyIF9hID0gc2VsZWN0b3JQYXJzZXJfMS5kZWZhdWx0KHZub2RlLnNlbCksIHNlbGVjdG9yVGFnTmFtZSA9IF9hLnRhZ05hbWUsIHNlbGVjdG9ySWQgPSBfYS5pZDtcbiAgICAgICAgdmFyIHZOb2RlQ2xhc3NOYW1lID0gY2xhc3NOYW1lRnJvbVZOb2RlXzEuZGVmYXVsdCh2bm9kZSk7XG4gICAgICAgIHZhciB2Tm9kZURhdGEgPSB2bm9kZS5kYXRhIHx8IHt9O1xuICAgICAgICB2YXIgdk5vZGVEYXRhUHJvcHMgPSB2Tm9kZURhdGEucHJvcHMgfHwge307XG4gICAgICAgIHZhciBfYiA9IHZOb2RlRGF0YVByb3BzLmlkLCB2Tm9kZUlkID0gX2IgPT09IHZvaWQgMCA/IHNlbGVjdG9ySWQgOiBfYjtcbiAgICAgICAgdmFyIGlzVk5vZGVBbmRSb290RWxlbWVudElkZW50aWNhbCA9IHZOb2RlSWQudG9VcHBlckNhc2UoKSA9PT0gdGhpcy5yb290RWxlbWVudC5pZC50b1VwcGVyQ2FzZSgpICYmXG4gICAgICAgICAgICBzZWxlY3RvclRhZ05hbWUudG9VcHBlckNhc2UoKSA9PT0gdGhpcy5yb290RWxlbWVudC50YWdOYW1lLnRvVXBwZXJDYXNlKCkgJiZcbiAgICAgICAgICAgIHZOb2RlQ2xhc3NOYW1lLnRvVXBwZXJDYXNlKCkgPT09IHRoaXMucm9vdEVsZW1lbnQuY2xhc3NOYW1lLnRvVXBwZXJDYXNlKCk7XG4gICAgICAgIGlmIChpc1ZOb2RlQW5kUm9vdEVsZW1lbnRJZGVudGljYWwpIHtcbiAgICAgICAgICAgIHJldHVybiB2bm9kZTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgX2MgPSB0aGlzLnJvb3RFbGVtZW50LCB0YWdOYW1lID0gX2MudGFnTmFtZSwgaWQgPSBfYy5pZCwgY2xhc3NOYW1lID0gX2MuY2xhc3NOYW1lO1xuICAgICAgICB2YXIgZWxlbWVudElkID0gaWQgPyBcIiNcIiArIGlkIDogXCJcIjtcbiAgICAgICAgdmFyIGVsZW1lbnRDbGFzc05hbWUgPSBjbGFzc05hbWUgP1xuICAgICAgICAgICAgXCIuXCIgKyBjbGFzc05hbWUuc3BsaXQoXCIgXCIpLmpvaW4oXCIuXCIpIDogXCJcIjtcbiAgICAgICAgcmV0dXJuIGh5cGVyc2NyaXB0XzEuaChcIlwiICsgdGFnTmFtZSArIGVsZW1lbnRJZCArIGVsZW1lbnRDbGFzc05hbWUsIHt9LCBbdm5vZGVdKTtcbiAgICB9O1xuICAgIHJldHVybiBWTm9kZVdyYXBwZXI7XG59KCkpO1xuZXhwb3J0cy5WTm9kZVdyYXBwZXIgPSBWTm9kZVdyYXBwZXI7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1WTm9kZVdyYXBwZXIuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgeHN0cmVhbV8xID0gcmVxdWlyZSgneHN0cmVhbScpO1xuZnVuY3Rpb24gZnJvbUV2ZW50KGVsZW1lbnQsIGV2ZW50TmFtZSwgdXNlQ2FwdHVyZSkge1xuICAgIGlmICh1c2VDYXB0dXJlID09PSB2b2lkIDApIHsgdXNlQ2FwdHVyZSA9IGZhbHNlOyB9XG4gICAgcmV0dXJuIHhzdHJlYW1fMS5TdHJlYW0uY3JlYXRlKHtcbiAgICAgICAgZWxlbWVudDogZWxlbWVudCxcbiAgICAgICAgbmV4dDogbnVsbCxcbiAgICAgICAgc3RhcnQ6IGZ1bmN0aW9uIHN0YXJ0KGxpc3RlbmVyKSB7XG4gICAgICAgICAgICB0aGlzLm5leHQgPSBmdW5jdGlvbiBuZXh0KGV2ZW50KSB7IGxpc3RlbmVyLm5leHQoZXZlbnQpOyB9O1xuICAgICAgICAgICAgdGhpcy5lbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnROYW1lLCB0aGlzLm5leHQsIHVzZUNhcHR1cmUpO1xuICAgICAgICB9LFxuICAgICAgICBzdG9wOiBmdW5jdGlvbiBzdG9wKCkge1xuICAgICAgICAgICAgdGhpcy5lbGVtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnROYW1lLCB0aGlzLm5leHQsIHVzZUNhcHR1cmUpO1xuICAgICAgICB9XG4gICAgfSk7XG59XG5leHBvcnRzLmZyb21FdmVudCA9IGZyb21FdmVudDtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWZyb21FdmVudC5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcbnZhciBoeXBlcnNjcmlwdF8xID0gcmVxdWlyZSgnLi9oeXBlcnNjcmlwdCcpO1xuZnVuY3Rpb24gaXNWYWxpZFN0cmluZyhwYXJhbSkge1xuICAgIHJldHVybiB0eXBlb2YgcGFyYW0gPT09ICdzdHJpbmcnICYmIHBhcmFtLmxlbmd0aCA+IDA7XG59XG5mdW5jdGlvbiBpc1NlbGVjdG9yKHBhcmFtKSB7XG4gICAgcmV0dXJuIGlzVmFsaWRTdHJpbmcocGFyYW0pICYmIChwYXJhbVswXSA9PT0gJy4nIHx8IHBhcmFtWzBdID09PSAnIycpO1xufVxuZnVuY3Rpb24gY3JlYXRlVGFnRnVuY3Rpb24odGFnTmFtZSkge1xuICAgIHJldHVybiBmdW5jdGlvbiBoeXBlcnNjcmlwdChmaXJzdCwgYiwgYykge1xuICAgICAgICBpZiAoaXNTZWxlY3RvcihmaXJzdCkpIHtcbiAgICAgICAgICAgIGlmICghIWIgJiYgISFjKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGh5cGVyc2NyaXB0XzEuaCh0YWdOYW1lICsgZmlyc3QsIGIsIGMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoISFiKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGh5cGVyc2NyaXB0XzEuaCh0YWdOYW1lICsgZmlyc3QsIGIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGh5cGVyc2NyaXB0XzEuaCh0YWdOYW1lICsgZmlyc3QsIHt9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICghIWIpIHtcbiAgICAgICAgICAgIHJldHVybiBoeXBlcnNjcmlwdF8xLmgodGFnTmFtZSwgZmlyc3QsIGIpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKCEhZmlyc3QpIHtcbiAgICAgICAgICAgIHJldHVybiBoeXBlcnNjcmlwdF8xLmgodGFnTmFtZSwgZmlyc3QpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIGh5cGVyc2NyaXB0XzEuaCh0YWdOYW1lLCB7fSk7XG4gICAgICAgIH1cbiAgICB9O1xufVxudmFyIFNWR19UQUdfTkFNRVMgPSBbXG4gICAgJ2EnLCAnYWx0R2x5cGgnLCAnYWx0R2x5cGhEZWYnLCAnYWx0R2x5cGhJdGVtJywgJ2FuaW1hdGUnLCAnYW5pbWF0ZUNvbG9yJyxcbiAgICAnYW5pbWF0ZU1vdGlvbicsICdhbmltYXRlVHJhbnNmb3JtJywgJ2NpcmNsZScsICdjbGlwUGF0aCcsICdjb2xvclByb2ZpbGUnLFxuICAgICdjdXJzb3InLCAnZGVmcycsICdkZXNjJywgJ2VsbGlwc2UnLCAnZmVCbGVuZCcsICdmZUNvbG9yTWF0cml4JyxcbiAgICAnZmVDb21wb25lbnRUcmFuc2ZlcicsICdmZUNvbXBvc2l0ZScsICdmZUNvbnZvbHZlTWF0cml4JywgJ2ZlRGlmZnVzZUxpZ2h0aW5nJyxcbiAgICAnZmVEaXNwbGFjZW1lbnRNYXAnLCAnZmVEaXN0YW50TGlnaHQnLCAnZmVGbG9vZCcsICdmZUZ1bmNBJywgJ2ZlRnVuY0InLFxuICAgICdmZUZ1bmNHJywgJ2ZlRnVuY1InLCAnZmVHYXVzc2lhbkJsdXInLCAnZmVJbWFnZScsICdmZU1lcmdlJywgJ2ZlTWVyZ2VOb2RlJyxcbiAgICAnZmVNb3JwaG9sb2d5JywgJ2ZlT2Zmc2V0JywgJ2ZlUG9pbnRMaWdodCcsICdmZVNwZWN1bGFyTGlnaHRpbmcnLFxuICAgICdmZVNwb3RsaWdodCcsICdmZVRpbGUnLCAnZmVUdXJidWxlbmNlJywgJ2ZpbHRlcicsICdmb250JywgJ2ZvbnRGYWNlJyxcbiAgICAnZm9udEZhY2VGb3JtYXQnLCAnZm9udEZhY2VOYW1lJywgJ2ZvbnRGYWNlU3JjJywgJ2ZvbnRGYWNlVXJpJyxcbiAgICAnZm9yZWlnbk9iamVjdCcsICdnJywgJ2dseXBoJywgJ2dseXBoUmVmJywgJ2hrZXJuJywgJ2ltYWdlJywgJ2xpbmUnLFxuICAgICdsaW5lYXJHcmFkaWVudCcsICdtYXJrZXInLCAnbWFzaycsICdtZXRhZGF0YScsICdtaXNzaW5nR2x5cGgnLCAnbXBhdGgnLFxuICAgICdwYXRoJywgJ3BhdHRlcm4nLCAncG9seWdvbicsICdwb2x5bGluZycsICdyYWRpYWxHcmFkaWVudCcsICdyZWN0JywgJ3NjcmlwdCcsXG4gICAgJ3NldCcsICdzdG9wJywgJ3N0eWxlJywgJ3N3aXRjaCcsICdzeW1ib2wnLCAndGV4dCcsICd0ZXh0UGF0aCcsICd0aXRsZScsXG4gICAgJ3RyZWYnLCAndHNwYW4nLCAndXNlJywgJ3ZpZXcnLCAndmtlcm4nXG5dO1xudmFyIHN2ZyA9IGNyZWF0ZVRhZ0Z1bmN0aW9uKCdzdmcnKTtcblNWR19UQUdfTkFNRVMuZm9yRWFjaChmdW5jdGlvbiAodGFnKSB7XG4gICAgc3ZnW3RhZ10gPSBjcmVhdGVUYWdGdW5jdGlvbih0YWcpO1xufSk7XG52YXIgVEFHX05BTUVTID0gW1xuICAgICdhJywgJ2FiYnInLCAnYWRkcmVzcycsICdhcmVhJywgJ2FydGljbGUnLCAnYXNpZGUnLCAnYXVkaW8nLCAnYicsICdiYXNlJyxcbiAgICAnYmRpJywgJ2JkbycsICdibG9ja3F1b3RlJywgJ2JvZHknLCAnYnInLCAnYnV0dG9uJywgJ2NhbnZhcycsICdjYXB0aW9uJyxcbiAgICAnY2l0ZScsICdjb2RlJywgJ2NvbCcsICdjb2xncm91cCcsICdkZCcsICdkZWwnLCAnZGZuJywgJ2RpcicsICdkaXYnLCAnZGwnLFxuICAgICdkdCcsICdlbScsICdlbWJlZCcsICdmaWVsZHNldCcsICdmaWdjYXB0aW9uJywgJ2ZpZ3VyZScsICdmb290ZXInLCAnZm9ybScsXG4gICAgJ2gxJywgJ2gyJywgJ2gzJywgJ2g0JywgJ2g1JywgJ2g2JywgJ2hlYWQnLCAnaGVhZGVyJywgJ2hncm91cCcsICdocicsICdodG1sJyxcbiAgICAnaScsICdpZnJhbWUnLCAnaW1nJywgJ2lucHV0JywgJ2lucycsICdrYmQnLCAna2V5Z2VuJywgJ2xhYmVsJywgJ2xlZ2VuZCcsXG4gICAgJ2xpJywgJ2xpbmsnLCAnbWFpbicsICdtYXAnLCAnbWFyaycsICdtZW51JywgJ21ldGEnLCAnbmF2JywgJ25vc2NyaXB0JyxcbiAgICAnb2JqZWN0JywgJ29sJywgJ29wdGdyb3VwJywgJ29wdGlvbicsICdwJywgJ3BhcmFtJywgJ3ByZScsICdwcm9ncmVzcycsICdxJyxcbiAgICAncnAnLCAncnQnLCAncnVieScsICdzJywgJ3NhbXAnLCAnc2NyaXB0JywgJ3NlY3Rpb24nLCAnc2VsZWN0JywgJ3NtYWxsJyxcbiAgICAnc291cmNlJywgJ3NwYW4nLCAnc3Ryb25nJywgJ3N0eWxlJywgJ3N1YicsICdzdXAnLCAndGFibGUnLCAndGJvZHknLCAndGQnLFxuICAgICd0ZXh0YXJlYScsICd0Zm9vdCcsICd0aCcsICd0aGVhZCcsICd0aXRsZScsICd0cicsICd1JywgJ3VsJywgJ3ZpZGVvJ1xuXTtcbnZhciBleHBvcnRlZCA9IHsgU1ZHX1RBR19OQU1FUzogU1ZHX1RBR19OQU1FUywgVEFHX05BTUVTOiBUQUdfTkFNRVMsIHN2Zzogc3ZnLCBpc1NlbGVjdG9yOiBpc1NlbGVjdG9yLCBjcmVhdGVUYWdGdW5jdGlvbjogY3JlYXRlVGFnRnVuY3Rpb24gfTtcblRBR19OQU1FUy5mb3JFYWNoKGZ1bmN0aW9uIChuKSB7XG4gICAgZXhwb3J0ZWRbbl0gPSBjcmVhdGVUYWdGdW5jdGlvbihuKTtcbn0pO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xuZXhwb3J0cy5kZWZhdWx0ID0gZXhwb3J0ZWQ7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1oeXBlcnNjcmlwdC1oZWxwZXJzLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xudmFyIGlzID0gcmVxdWlyZSgnc25hYmJkb20vaXMnKTtcbnZhciB2bm9kZSA9IHJlcXVpcmUoJ3NuYWJiZG9tL3Zub2RlJyk7XG5mdW5jdGlvbiBpc0dlbmVyaWNTdHJlYW0oeCkge1xuICAgIHJldHVybiAhQXJyYXkuaXNBcnJheSh4KSAmJiB0eXBlb2YgeC5tYXAgPT09IFwiZnVuY3Rpb25cIjtcbn1cbmZ1bmN0aW9uIG11dGF0ZVN0cmVhbVdpdGhOUyh2Tm9kZSkge1xuICAgIGFkZE5TKHZOb2RlLmRhdGEsIHZOb2RlLmNoaWxkcmVuKTtcbiAgICByZXR1cm4gdk5vZGU7XG59XG5mdW5jdGlvbiBhZGROUyhkYXRhLCBjaGlsZHJlbikge1xuICAgIGRhdGEubnMgPSBcImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCI7XG4gICAgaWYgKHR5cGVvZiBjaGlsZHJlbiAhPT0gXCJ1bmRlZmluZWRcIiAmJiBpcy5hcnJheShjaGlsZHJlbikpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjaGlsZHJlbi5sZW5ndGg7ICsraSkge1xuICAgICAgICAgICAgaWYgKGlzR2VuZXJpY1N0cmVhbShjaGlsZHJlbltpXSkpIHtcbiAgICAgICAgICAgICAgICBjaGlsZHJlbltpXSA9IGNoaWxkcmVuW2ldLm1hcChtdXRhdGVTdHJlYW1XaXRoTlMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgYWRkTlMoY2hpbGRyZW5baV0uZGF0YSwgY2hpbGRyZW5baV0uY2hpbGRyZW4pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxuZnVuY3Rpb24gaChzZWwsIGIsIGMpIHtcbiAgICB2YXIgZGF0YSA9IHt9O1xuICAgIHZhciBjaGlsZHJlbjtcbiAgICB2YXIgdGV4dDtcbiAgICB2YXIgaTtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMykge1xuICAgICAgICBkYXRhID0gYjtcbiAgICAgICAgaWYgKGlzLmFycmF5KGMpKSB7XG4gICAgICAgICAgICBjaGlsZHJlbiA9IGM7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoaXMucHJpbWl0aXZlKGMpKSB7XG4gICAgICAgICAgICB0ZXh0ID0gYztcbiAgICAgICAgfVxuICAgIH1cbiAgICBlbHNlIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAyKSB7XG4gICAgICAgIGlmIChpcy5hcnJheShiKSkge1xuICAgICAgICAgICAgY2hpbGRyZW4gPSBiO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGlzLnByaW1pdGl2ZShiKSkge1xuICAgICAgICAgICAgdGV4dCA9IGI7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBkYXRhID0gYjtcbiAgICAgICAgfVxuICAgIH1cbiAgICBpZiAoaXMuYXJyYXkoY2hpbGRyZW4pKSB7XG4gICAgICAgIGNoaWxkcmVuID0gY2hpbGRyZW4uZmlsdGVyKGZ1bmN0aW9uICh4KSB7IHJldHVybiB4OyB9KTtcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IGNoaWxkcmVuLmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgICBpZiAoaXMucHJpbWl0aXZlKGNoaWxkcmVuW2ldKSkge1xuICAgICAgICAgICAgICAgIGNoaWxkcmVuW2ldID0gdm5vZGUodW5kZWZpbmVkLCB1bmRlZmluZWQsIHVuZGVmaW5lZCwgY2hpbGRyZW5baV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIGlmIChzZWxbMF0gPT09ICdzJyAmJiBzZWxbMV0gPT09ICd2JyAmJiBzZWxbMl0gPT09ICdnJykge1xuICAgICAgICBhZGROUyhkYXRhLCBjaGlsZHJlbik7XG4gICAgfVxuICAgIHJldHVybiB2bm9kZShzZWwsIGRhdGEsIGNoaWxkcmVuLCB0ZXh0LCB1bmRlZmluZWQpO1xufVxuZXhwb3J0cy5oID0gaDtcbjtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWh5cGVyc2NyaXB0LmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xudmFyIHRodW5rID0gcmVxdWlyZSgnc25hYmJkb20vdGh1bmsnKTtcbmV4cG9ydHMudGh1bmsgPSB0aHVuaztcbnZhciBtYWtlRE9NRHJpdmVyXzEgPSByZXF1aXJlKCcuL21ha2VET01Ecml2ZXInKTtcbmV4cG9ydHMubWFrZURPTURyaXZlciA9IG1ha2VET01Ecml2ZXJfMS5tYWtlRE9NRHJpdmVyO1xudmFyIERPTVNvdXJjZV8xID0gcmVxdWlyZSgnLi9ET01Tb3VyY2UnKTtcbmV4cG9ydHMuRE9NU291cmNlID0gRE9NU291cmNlXzEuRE9NU291cmNlO1xudmFyIG1vY2tET01Tb3VyY2VfMSA9IHJlcXVpcmUoJy4vbW9ja0RPTVNvdXJjZScpO1xuZXhwb3J0cy5tb2NrRE9NU291cmNlID0gbW9ja0RPTVNvdXJjZV8xLm1vY2tET01Tb3VyY2U7XG52YXIgbWFrZUhUTUxEcml2ZXJfMSA9IHJlcXVpcmUoJy4vbWFrZUhUTUxEcml2ZXInKTtcbmV4cG9ydHMubWFrZUhUTUxEcml2ZXIgPSBtYWtlSFRNTERyaXZlcl8xLm1ha2VIVE1MRHJpdmVyO1xudmFyIEhUTUxTb3VyY2VfMSA9IHJlcXVpcmUoJy4vSFRNTFNvdXJjZScpO1xuZXhwb3J0cy5IVE1MU291cmNlID0gSFRNTFNvdXJjZV8xLkhUTUxTb3VyY2U7XG52YXIgaHlwZXJzY3JpcHRfMSA9IHJlcXVpcmUoJy4vaHlwZXJzY3JpcHQnKTtcbmV4cG9ydHMuaCA9IGh5cGVyc2NyaXB0XzEuaDtcbnZhciBoeXBlcnNjcmlwdF9oZWxwZXJzXzEgPSByZXF1aXJlKCcuL2h5cGVyc2NyaXB0LWhlbHBlcnMnKTtcbnZhciBzdmcgPSBoeXBlcnNjcmlwdF9oZWxwZXJzXzEuZGVmYXVsdC5zdmc7XG5leHBvcnRzLnN2ZyA9IHN2ZztcbnZhciBhID0gaHlwZXJzY3JpcHRfaGVscGVyc18xLmRlZmF1bHQuYTtcbmV4cG9ydHMuYSA9IGE7XG52YXIgYWJiciA9IGh5cGVyc2NyaXB0X2hlbHBlcnNfMS5kZWZhdWx0LmFiYnI7XG5leHBvcnRzLmFiYnIgPSBhYmJyO1xudmFyIGFkZHJlc3MgPSBoeXBlcnNjcmlwdF9oZWxwZXJzXzEuZGVmYXVsdC5hZGRyZXNzO1xuZXhwb3J0cy5hZGRyZXNzID0gYWRkcmVzcztcbnZhciBhcmVhID0gaHlwZXJzY3JpcHRfaGVscGVyc18xLmRlZmF1bHQuYXJlYTtcbmV4cG9ydHMuYXJlYSA9IGFyZWE7XG52YXIgYXJ0aWNsZSA9IGh5cGVyc2NyaXB0X2hlbHBlcnNfMS5kZWZhdWx0LmFydGljbGU7XG5leHBvcnRzLmFydGljbGUgPSBhcnRpY2xlO1xudmFyIGFzaWRlID0gaHlwZXJzY3JpcHRfaGVscGVyc18xLmRlZmF1bHQuYXNpZGU7XG5leHBvcnRzLmFzaWRlID0gYXNpZGU7XG52YXIgYXVkaW8gPSBoeXBlcnNjcmlwdF9oZWxwZXJzXzEuZGVmYXVsdC5hdWRpbztcbmV4cG9ydHMuYXVkaW8gPSBhdWRpbztcbnZhciBiID0gaHlwZXJzY3JpcHRfaGVscGVyc18xLmRlZmF1bHQuYjtcbmV4cG9ydHMuYiA9IGI7XG52YXIgYmFzZSA9IGh5cGVyc2NyaXB0X2hlbHBlcnNfMS5kZWZhdWx0LmJhc2U7XG5leHBvcnRzLmJhc2UgPSBiYXNlO1xudmFyIGJkaSA9IGh5cGVyc2NyaXB0X2hlbHBlcnNfMS5kZWZhdWx0LmJkaTtcbmV4cG9ydHMuYmRpID0gYmRpO1xudmFyIGJkbyA9IGh5cGVyc2NyaXB0X2hlbHBlcnNfMS5kZWZhdWx0LmJkbztcbmV4cG9ydHMuYmRvID0gYmRvO1xudmFyIGJsb2NrcXVvdGUgPSBoeXBlcnNjcmlwdF9oZWxwZXJzXzEuZGVmYXVsdC5ibG9ja3F1b3RlO1xuZXhwb3J0cy5ibG9ja3F1b3RlID0gYmxvY2txdW90ZTtcbnZhciBib2R5ID0gaHlwZXJzY3JpcHRfaGVscGVyc18xLmRlZmF1bHQuYm9keTtcbmV4cG9ydHMuYm9keSA9IGJvZHk7XG52YXIgYnIgPSBoeXBlcnNjcmlwdF9oZWxwZXJzXzEuZGVmYXVsdC5icjtcbmV4cG9ydHMuYnIgPSBicjtcbnZhciBidXR0b24gPSBoeXBlcnNjcmlwdF9oZWxwZXJzXzEuZGVmYXVsdC5idXR0b247XG5leHBvcnRzLmJ1dHRvbiA9IGJ1dHRvbjtcbnZhciBjYW52YXMgPSBoeXBlcnNjcmlwdF9oZWxwZXJzXzEuZGVmYXVsdC5jYW52YXM7XG5leHBvcnRzLmNhbnZhcyA9IGNhbnZhcztcbnZhciBjYXB0aW9uID0gaHlwZXJzY3JpcHRfaGVscGVyc18xLmRlZmF1bHQuY2FwdGlvbjtcbmV4cG9ydHMuY2FwdGlvbiA9IGNhcHRpb247XG52YXIgY2l0ZSA9IGh5cGVyc2NyaXB0X2hlbHBlcnNfMS5kZWZhdWx0LmNpdGU7XG5leHBvcnRzLmNpdGUgPSBjaXRlO1xudmFyIGNvZGUgPSBoeXBlcnNjcmlwdF9oZWxwZXJzXzEuZGVmYXVsdC5jb2RlO1xuZXhwb3J0cy5jb2RlID0gY29kZTtcbnZhciBjb2wgPSBoeXBlcnNjcmlwdF9oZWxwZXJzXzEuZGVmYXVsdC5jb2w7XG5leHBvcnRzLmNvbCA9IGNvbDtcbnZhciBjb2xncm91cCA9IGh5cGVyc2NyaXB0X2hlbHBlcnNfMS5kZWZhdWx0LmNvbGdyb3VwO1xuZXhwb3J0cy5jb2xncm91cCA9IGNvbGdyb3VwO1xudmFyIGRkID0gaHlwZXJzY3JpcHRfaGVscGVyc18xLmRlZmF1bHQuZGQ7XG5leHBvcnRzLmRkID0gZGQ7XG52YXIgZGVsID0gaHlwZXJzY3JpcHRfaGVscGVyc18xLmRlZmF1bHQuZGVsO1xuZXhwb3J0cy5kZWwgPSBkZWw7XG52YXIgZGZuID0gaHlwZXJzY3JpcHRfaGVscGVyc18xLmRlZmF1bHQuZGZuO1xuZXhwb3J0cy5kZm4gPSBkZm47XG52YXIgZGlyID0gaHlwZXJzY3JpcHRfaGVscGVyc18xLmRlZmF1bHQuZGlyO1xuZXhwb3J0cy5kaXIgPSBkaXI7XG52YXIgZGl2ID0gaHlwZXJzY3JpcHRfaGVscGVyc18xLmRlZmF1bHQuZGl2O1xuZXhwb3J0cy5kaXYgPSBkaXY7XG52YXIgZGwgPSBoeXBlcnNjcmlwdF9oZWxwZXJzXzEuZGVmYXVsdC5kbDtcbmV4cG9ydHMuZGwgPSBkbDtcbnZhciBkdCA9IGh5cGVyc2NyaXB0X2hlbHBlcnNfMS5kZWZhdWx0LmR0O1xuZXhwb3J0cy5kdCA9IGR0O1xudmFyIGVtID0gaHlwZXJzY3JpcHRfaGVscGVyc18xLmRlZmF1bHQuZW07XG5leHBvcnRzLmVtID0gZW07XG52YXIgZW1iZWQgPSBoeXBlcnNjcmlwdF9oZWxwZXJzXzEuZGVmYXVsdC5lbWJlZDtcbmV4cG9ydHMuZW1iZWQgPSBlbWJlZDtcbnZhciBmaWVsZHNldCA9IGh5cGVyc2NyaXB0X2hlbHBlcnNfMS5kZWZhdWx0LmZpZWxkc2V0O1xuZXhwb3J0cy5maWVsZHNldCA9IGZpZWxkc2V0O1xudmFyIGZpZ2NhcHRpb24gPSBoeXBlcnNjcmlwdF9oZWxwZXJzXzEuZGVmYXVsdC5maWdjYXB0aW9uO1xuZXhwb3J0cy5maWdjYXB0aW9uID0gZmlnY2FwdGlvbjtcbnZhciBmaWd1cmUgPSBoeXBlcnNjcmlwdF9oZWxwZXJzXzEuZGVmYXVsdC5maWd1cmU7XG5leHBvcnRzLmZpZ3VyZSA9IGZpZ3VyZTtcbnZhciBmb290ZXIgPSBoeXBlcnNjcmlwdF9oZWxwZXJzXzEuZGVmYXVsdC5mb290ZXI7XG5leHBvcnRzLmZvb3RlciA9IGZvb3RlcjtcbnZhciBmb3JtID0gaHlwZXJzY3JpcHRfaGVscGVyc18xLmRlZmF1bHQuZm9ybTtcbmV4cG9ydHMuZm9ybSA9IGZvcm07XG52YXIgaDEgPSBoeXBlcnNjcmlwdF9oZWxwZXJzXzEuZGVmYXVsdC5oMTtcbmV4cG9ydHMuaDEgPSBoMTtcbnZhciBoMiA9IGh5cGVyc2NyaXB0X2hlbHBlcnNfMS5kZWZhdWx0LmgyO1xuZXhwb3J0cy5oMiA9IGgyO1xudmFyIGgzID0gaHlwZXJzY3JpcHRfaGVscGVyc18xLmRlZmF1bHQuaDM7XG5leHBvcnRzLmgzID0gaDM7XG52YXIgaDQgPSBoeXBlcnNjcmlwdF9oZWxwZXJzXzEuZGVmYXVsdC5oNDtcbmV4cG9ydHMuaDQgPSBoNDtcbnZhciBoNSA9IGh5cGVyc2NyaXB0X2hlbHBlcnNfMS5kZWZhdWx0Lmg1O1xuZXhwb3J0cy5oNSA9IGg1O1xudmFyIGg2ID0gaHlwZXJzY3JpcHRfaGVscGVyc18xLmRlZmF1bHQuaDY7XG5leHBvcnRzLmg2ID0gaDY7XG52YXIgaGVhZCA9IGh5cGVyc2NyaXB0X2hlbHBlcnNfMS5kZWZhdWx0LmhlYWQ7XG5leHBvcnRzLmhlYWQgPSBoZWFkO1xudmFyIGhlYWRlciA9IGh5cGVyc2NyaXB0X2hlbHBlcnNfMS5kZWZhdWx0LmhlYWRlcjtcbmV4cG9ydHMuaGVhZGVyID0gaGVhZGVyO1xudmFyIGhncm91cCA9IGh5cGVyc2NyaXB0X2hlbHBlcnNfMS5kZWZhdWx0Lmhncm91cDtcbmV4cG9ydHMuaGdyb3VwID0gaGdyb3VwO1xudmFyIGhyID0gaHlwZXJzY3JpcHRfaGVscGVyc18xLmRlZmF1bHQuaHI7XG5leHBvcnRzLmhyID0gaHI7XG52YXIgaHRtbCA9IGh5cGVyc2NyaXB0X2hlbHBlcnNfMS5kZWZhdWx0Lmh0bWw7XG5leHBvcnRzLmh0bWwgPSBodG1sO1xudmFyIGkgPSBoeXBlcnNjcmlwdF9oZWxwZXJzXzEuZGVmYXVsdC5pO1xuZXhwb3J0cy5pID0gaTtcbnZhciBpZnJhbWUgPSBoeXBlcnNjcmlwdF9oZWxwZXJzXzEuZGVmYXVsdC5pZnJhbWU7XG5leHBvcnRzLmlmcmFtZSA9IGlmcmFtZTtcbnZhciBpbWcgPSBoeXBlcnNjcmlwdF9oZWxwZXJzXzEuZGVmYXVsdC5pbWc7XG5leHBvcnRzLmltZyA9IGltZztcbnZhciBpbnB1dCA9IGh5cGVyc2NyaXB0X2hlbHBlcnNfMS5kZWZhdWx0LmlucHV0O1xuZXhwb3J0cy5pbnB1dCA9IGlucHV0O1xudmFyIGlucyA9IGh5cGVyc2NyaXB0X2hlbHBlcnNfMS5kZWZhdWx0LmlucztcbmV4cG9ydHMuaW5zID0gaW5zO1xudmFyIGtiZCA9IGh5cGVyc2NyaXB0X2hlbHBlcnNfMS5kZWZhdWx0LmtiZDtcbmV4cG9ydHMua2JkID0ga2JkO1xudmFyIGtleWdlbiA9IGh5cGVyc2NyaXB0X2hlbHBlcnNfMS5kZWZhdWx0LmtleWdlbjtcbmV4cG9ydHMua2V5Z2VuID0ga2V5Z2VuO1xudmFyIGxhYmVsID0gaHlwZXJzY3JpcHRfaGVscGVyc18xLmRlZmF1bHQubGFiZWw7XG5leHBvcnRzLmxhYmVsID0gbGFiZWw7XG52YXIgbGVnZW5kID0gaHlwZXJzY3JpcHRfaGVscGVyc18xLmRlZmF1bHQubGVnZW5kO1xuZXhwb3J0cy5sZWdlbmQgPSBsZWdlbmQ7XG52YXIgbGkgPSBoeXBlcnNjcmlwdF9oZWxwZXJzXzEuZGVmYXVsdC5saTtcbmV4cG9ydHMubGkgPSBsaTtcbnZhciBsaW5rID0gaHlwZXJzY3JpcHRfaGVscGVyc18xLmRlZmF1bHQubGluaztcbmV4cG9ydHMubGluayA9IGxpbms7XG52YXIgbWFpbiA9IGh5cGVyc2NyaXB0X2hlbHBlcnNfMS5kZWZhdWx0Lm1haW47XG5leHBvcnRzLm1haW4gPSBtYWluO1xudmFyIG1hcCA9IGh5cGVyc2NyaXB0X2hlbHBlcnNfMS5kZWZhdWx0Lm1hcDtcbmV4cG9ydHMubWFwID0gbWFwO1xudmFyIG1hcmsgPSBoeXBlcnNjcmlwdF9oZWxwZXJzXzEuZGVmYXVsdC5tYXJrO1xuZXhwb3J0cy5tYXJrID0gbWFyaztcbnZhciBtZW51ID0gaHlwZXJzY3JpcHRfaGVscGVyc18xLmRlZmF1bHQubWVudTtcbmV4cG9ydHMubWVudSA9IG1lbnU7XG52YXIgbWV0YSA9IGh5cGVyc2NyaXB0X2hlbHBlcnNfMS5kZWZhdWx0Lm1ldGE7XG5leHBvcnRzLm1ldGEgPSBtZXRhO1xudmFyIG5hdiA9IGh5cGVyc2NyaXB0X2hlbHBlcnNfMS5kZWZhdWx0Lm5hdjtcbmV4cG9ydHMubmF2ID0gbmF2O1xudmFyIG5vc2NyaXB0ID0gaHlwZXJzY3JpcHRfaGVscGVyc18xLmRlZmF1bHQubm9zY3JpcHQ7XG5leHBvcnRzLm5vc2NyaXB0ID0gbm9zY3JpcHQ7XG52YXIgb2JqZWN0ID0gaHlwZXJzY3JpcHRfaGVscGVyc18xLmRlZmF1bHQub2JqZWN0O1xuZXhwb3J0cy5vYmplY3QgPSBvYmplY3Q7XG52YXIgb2wgPSBoeXBlcnNjcmlwdF9oZWxwZXJzXzEuZGVmYXVsdC5vbDtcbmV4cG9ydHMub2wgPSBvbDtcbnZhciBvcHRncm91cCA9IGh5cGVyc2NyaXB0X2hlbHBlcnNfMS5kZWZhdWx0Lm9wdGdyb3VwO1xuZXhwb3J0cy5vcHRncm91cCA9IG9wdGdyb3VwO1xudmFyIG9wdGlvbiA9IGh5cGVyc2NyaXB0X2hlbHBlcnNfMS5kZWZhdWx0Lm9wdGlvbjtcbmV4cG9ydHMub3B0aW9uID0gb3B0aW9uO1xudmFyIHAgPSBoeXBlcnNjcmlwdF9oZWxwZXJzXzEuZGVmYXVsdC5wO1xuZXhwb3J0cy5wID0gcDtcbnZhciBwYXJhbSA9IGh5cGVyc2NyaXB0X2hlbHBlcnNfMS5kZWZhdWx0LnBhcmFtO1xuZXhwb3J0cy5wYXJhbSA9IHBhcmFtO1xudmFyIHByZSA9IGh5cGVyc2NyaXB0X2hlbHBlcnNfMS5kZWZhdWx0LnByZTtcbmV4cG9ydHMucHJlID0gcHJlO1xudmFyIHByb2dyZXNzID0gaHlwZXJzY3JpcHRfaGVscGVyc18xLmRlZmF1bHQucHJvZ3Jlc3M7XG5leHBvcnRzLnByb2dyZXNzID0gcHJvZ3Jlc3M7XG52YXIgcSA9IGh5cGVyc2NyaXB0X2hlbHBlcnNfMS5kZWZhdWx0LnE7XG5leHBvcnRzLnEgPSBxO1xudmFyIHJwID0gaHlwZXJzY3JpcHRfaGVscGVyc18xLmRlZmF1bHQucnA7XG5leHBvcnRzLnJwID0gcnA7XG52YXIgcnQgPSBoeXBlcnNjcmlwdF9oZWxwZXJzXzEuZGVmYXVsdC5ydDtcbmV4cG9ydHMucnQgPSBydDtcbnZhciBydWJ5ID0gaHlwZXJzY3JpcHRfaGVscGVyc18xLmRlZmF1bHQucnVieTtcbmV4cG9ydHMucnVieSA9IHJ1Ynk7XG52YXIgcyA9IGh5cGVyc2NyaXB0X2hlbHBlcnNfMS5kZWZhdWx0LnM7XG5leHBvcnRzLnMgPSBzO1xudmFyIHNhbXAgPSBoeXBlcnNjcmlwdF9oZWxwZXJzXzEuZGVmYXVsdC5zYW1wO1xuZXhwb3J0cy5zYW1wID0gc2FtcDtcbnZhciBzY3JpcHQgPSBoeXBlcnNjcmlwdF9oZWxwZXJzXzEuZGVmYXVsdC5zY3JpcHQ7XG5leHBvcnRzLnNjcmlwdCA9IHNjcmlwdDtcbnZhciBzZWN0aW9uID0gaHlwZXJzY3JpcHRfaGVscGVyc18xLmRlZmF1bHQuc2VjdGlvbjtcbmV4cG9ydHMuc2VjdGlvbiA9IHNlY3Rpb247XG52YXIgc2VsZWN0ID0gaHlwZXJzY3JpcHRfaGVscGVyc18xLmRlZmF1bHQuc2VsZWN0O1xuZXhwb3J0cy5zZWxlY3QgPSBzZWxlY3Q7XG52YXIgc21hbGwgPSBoeXBlcnNjcmlwdF9oZWxwZXJzXzEuZGVmYXVsdC5zbWFsbDtcbmV4cG9ydHMuc21hbGwgPSBzbWFsbDtcbnZhciBzb3VyY2UgPSBoeXBlcnNjcmlwdF9oZWxwZXJzXzEuZGVmYXVsdC5zb3VyY2U7XG5leHBvcnRzLnNvdXJjZSA9IHNvdXJjZTtcbnZhciBzcGFuID0gaHlwZXJzY3JpcHRfaGVscGVyc18xLmRlZmF1bHQuc3BhbjtcbmV4cG9ydHMuc3BhbiA9IHNwYW47XG52YXIgc3Ryb25nID0gaHlwZXJzY3JpcHRfaGVscGVyc18xLmRlZmF1bHQuc3Ryb25nO1xuZXhwb3J0cy5zdHJvbmcgPSBzdHJvbmc7XG52YXIgc3R5bGUgPSBoeXBlcnNjcmlwdF9oZWxwZXJzXzEuZGVmYXVsdC5zdHlsZTtcbmV4cG9ydHMuc3R5bGUgPSBzdHlsZTtcbnZhciBzdWIgPSBoeXBlcnNjcmlwdF9oZWxwZXJzXzEuZGVmYXVsdC5zdWI7XG5leHBvcnRzLnN1YiA9IHN1YjtcbnZhciBzdXAgPSBoeXBlcnNjcmlwdF9oZWxwZXJzXzEuZGVmYXVsdC5zdXA7XG5leHBvcnRzLnN1cCA9IHN1cDtcbnZhciB0YWJsZSA9IGh5cGVyc2NyaXB0X2hlbHBlcnNfMS5kZWZhdWx0LnRhYmxlO1xuZXhwb3J0cy50YWJsZSA9IHRhYmxlO1xudmFyIHRib2R5ID0gaHlwZXJzY3JpcHRfaGVscGVyc18xLmRlZmF1bHQudGJvZHk7XG5leHBvcnRzLnRib2R5ID0gdGJvZHk7XG52YXIgdGQgPSBoeXBlcnNjcmlwdF9oZWxwZXJzXzEuZGVmYXVsdC50ZDtcbmV4cG9ydHMudGQgPSB0ZDtcbnZhciB0ZXh0YXJlYSA9IGh5cGVyc2NyaXB0X2hlbHBlcnNfMS5kZWZhdWx0LnRleHRhcmVhO1xuZXhwb3J0cy50ZXh0YXJlYSA9IHRleHRhcmVhO1xudmFyIHRmb290ID0gaHlwZXJzY3JpcHRfaGVscGVyc18xLmRlZmF1bHQudGZvb3Q7XG5leHBvcnRzLnRmb290ID0gdGZvb3Q7XG52YXIgdGggPSBoeXBlcnNjcmlwdF9oZWxwZXJzXzEuZGVmYXVsdC50aDtcbmV4cG9ydHMudGggPSB0aDtcbnZhciB0aGVhZCA9IGh5cGVyc2NyaXB0X2hlbHBlcnNfMS5kZWZhdWx0LnRoZWFkO1xuZXhwb3J0cy50aGVhZCA9IHRoZWFkO1xudmFyIHRpdGxlID0gaHlwZXJzY3JpcHRfaGVscGVyc18xLmRlZmF1bHQudGl0bGU7XG5leHBvcnRzLnRpdGxlID0gdGl0bGU7XG52YXIgdHIgPSBoeXBlcnNjcmlwdF9oZWxwZXJzXzEuZGVmYXVsdC50cjtcbmV4cG9ydHMudHIgPSB0cjtcbnZhciB1ID0gaHlwZXJzY3JpcHRfaGVscGVyc18xLmRlZmF1bHQudTtcbmV4cG9ydHMudSA9IHU7XG52YXIgdWwgPSBoeXBlcnNjcmlwdF9oZWxwZXJzXzEuZGVmYXVsdC51bDtcbmV4cG9ydHMudWwgPSB1bDtcbnZhciB2aWRlbyA9IGh5cGVyc2NyaXB0X2hlbHBlcnNfMS5kZWZhdWx0LnZpZGVvO1xuZXhwb3J0cy52aWRlbyA9IHZpZGVvO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9aW5kZXguanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgdXRpbHNfMSA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcbmZ1bmN0aW9uIGlzb2xhdGVTb3VyY2Uoc291cmNlLCBzY29wZSkge1xuICAgIHJldHVybiBzb3VyY2Uuc2VsZWN0KHV0aWxzXzEuU0NPUEVfUFJFRklYICsgc2NvcGUpO1xufVxuZXhwb3J0cy5pc29sYXRlU291cmNlID0gaXNvbGF0ZVNvdXJjZTtcbmZ1bmN0aW9uIGlzb2xhdGVTaW5rKHNpbmssIHNjb3BlKSB7XG4gICAgcmV0dXJuIHNpbmsubWFwKGZ1bmN0aW9uICh2VHJlZSkge1xuICAgICAgICBpZiAodlRyZWUuZGF0YS5pc29sYXRlKSB7XG4gICAgICAgICAgICB2YXIgZXhpc3RpbmdTY29wZSA9IHBhcnNlSW50KHZUcmVlLmRhdGEuaXNvbGF0ZS5zcGxpdCh1dGlsc18xLlNDT1BFX1BSRUZJWCArICdjeWNsZScpWzFdKTtcbiAgICAgICAgICAgIHZhciBfc2NvcGUgPSBwYXJzZUludChzY29wZS5zcGxpdCgnY3ljbGUnKVsxXSk7XG4gICAgICAgICAgICBpZiAoTnVtYmVyLmlzTmFOKGV4aXN0aW5nU2NvcGUpIHx8XG4gICAgICAgICAgICAgICAgTnVtYmVyLmlzTmFOKF9zY29wZSkgfHxcbiAgICAgICAgICAgICAgICBleGlzdGluZ1Njb3BlID4gX3Njb3BlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHZUcmVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHZUcmVlLmRhdGEuaXNvbGF0ZSA9IHV0aWxzXzEuU0NPUEVfUFJFRklYICsgc2NvcGU7XG4gICAgICAgIHJldHVybiB2VHJlZTtcbiAgICB9KTtcbn1cbmV4cG9ydHMuaXNvbGF0ZVNpbmsgPSBpc29sYXRlU2luaztcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWlzb2xhdGUuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgSXNvbGF0ZU1vZHVsZSA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gSXNvbGF0ZU1vZHVsZShpc29sYXRlZEVsZW1lbnRzKSB7XG4gICAgICAgIHRoaXMuaXNvbGF0ZWRFbGVtZW50cyA9IGlzb2xhdGVkRWxlbWVudHM7XG4gICAgICAgIHRoaXMuZXZlbnREZWxlZ2F0b3JzID0gbmV3IE1hcCgpO1xuICAgIH1cbiAgICBJc29sYXRlTW9kdWxlLnByb3RvdHlwZS5zZXRTY29wZSA9IGZ1bmN0aW9uIChlbG0sIHNjb3BlKSB7XG4gICAgICAgIHRoaXMuaXNvbGF0ZWRFbGVtZW50cy5zZXQoc2NvcGUsIGVsbSk7XG4gICAgfTtcbiAgICBJc29sYXRlTW9kdWxlLnByb3RvdHlwZS5yZW1vdmVTY29wZSA9IGZ1bmN0aW9uIChzY29wZSkge1xuICAgICAgICB0aGlzLmlzb2xhdGVkRWxlbWVudHMuZGVsZXRlKHNjb3BlKTtcbiAgICB9O1xuICAgIElzb2xhdGVNb2R1bGUucHJvdG90eXBlLmdldElzb2xhdGVkRWxlbWVudCA9IGZ1bmN0aW9uIChzY29wZSkge1xuICAgICAgICByZXR1cm4gdGhpcy5pc29sYXRlZEVsZW1lbnRzLmdldChzY29wZSk7XG4gICAgfTtcbiAgICBJc29sYXRlTW9kdWxlLnByb3RvdHlwZS5pc0lzb2xhdGVkRWxlbWVudCA9IGZ1bmN0aW9uIChlbG0pIHtcbiAgICAgICAgdmFyIGVsZW1lbnRzID0gQXJyYXkuZnJvbSh0aGlzLmlzb2xhdGVkRWxlbWVudHMuZW50cmllcygpKTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBlbGVtZW50cy5sZW5ndGg7ICsraSkge1xuICAgICAgICAgICAgaWYgKGVsbSA9PT0gZWxlbWVudHNbaV1bMV0pIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZWxlbWVudHNbaV1bMF07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH07XG4gICAgSXNvbGF0ZU1vZHVsZS5wcm90b3R5cGUuYWRkRXZlbnREZWxlZ2F0b3IgPSBmdW5jdGlvbiAoc2NvcGUsIGV2ZW50RGVsZWdhdG9yKSB7XG4gICAgICAgIHZhciBkZWxlZ2F0b3JzID0gdGhpcy5ldmVudERlbGVnYXRvcnMuZ2V0KHNjb3BlKTtcbiAgICAgICAgaWYgKCFkZWxlZ2F0b3JzKSB7XG4gICAgICAgICAgICBkZWxlZ2F0b3JzID0gW107XG4gICAgICAgICAgICB0aGlzLmV2ZW50RGVsZWdhdG9ycy5zZXQoc2NvcGUsIGRlbGVnYXRvcnMpO1xuICAgICAgICB9XG4gICAgICAgIGRlbGVnYXRvcnNbZGVsZWdhdG9ycy5sZW5ndGhdID0gZXZlbnREZWxlZ2F0b3I7XG4gICAgfTtcbiAgICBJc29sYXRlTW9kdWxlLnByb3RvdHlwZS5yZXNldCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5pc29sYXRlZEVsZW1lbnRzLmNsZWFyKCk7XG4gICAgfTtcbiAgICBJc29sYXRlTW9kdWxlLnByb3RvdHlwZS5jcmVhdGVNb2R1bGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGNyZWF0ZTogZnVuY3Rpb24gKG9sZFZOb2RlLCB2Tm9kZSkge1xuICAgICAgICAgICAgICAgIHZhciBfYSA9IG9sZFZOb2RlLmRhdGEsIG9sZERhdGEgPSBfYSA9PT0gdm9pZCAwID8ge30gOiBfYTtcbiAgICAgICAgICAgICAgICB2YXIgZWxtID0gdk5vZGUuZWxtLCBfYiA9IHZOb2RlLmRhdGEsIGRhdGEgPSBfYiA9PT0gdm9pZCAwID8ge30gOiBfYjtcbiAgICAgICAgICAgICAgICB2YXIgb2xkU2NvcGUgPSBvbGREYXRhLmlzb2xhdGUgfHwgXCJcIjtcbiAgICAgICAgICAgICAgICB2YXIgc2NvcGUgPSBkYXRhLmlzb2xhdGUgfHwgXCJcIjtcbiAgICAgICAgICAgICAgICBpZiAoc2NvcGUpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG9sZFNjb3BlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxmLnJlbW92ZVNjb3BlKG9sZFNjb3BlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBzZWxmLnNldFNjb3BlKGVsbSwgc2NvcGUpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgZGVsZWdhdG9ycyA9IHNlbGYuZXZlbnREZWxlZ2F0b3JzLmdldChzY29wZSk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChkZWxlZ2F0b3JzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gZGVsZWdhdG9ycy5sZW5ndGg7IGkgPCBsZW47ICsraSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlbGVnYXRvcnNbaV0udXBkYXRlVG9wRWxlbWVudChlbG0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKGRlbGVnYXRvcnMgPT09IHZvaWQgMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5ldmVudERlbGVnYXRvcnMuc2V0KHNjb3BlLCBbXSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKG9sZFNjb3BlICYmICFzY29wZSkge1xuICAgICAgICAgICAgICAgICAgICBzZWxmLnJlbW92ZVNjb3BlKHNjb3BlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdXBkYXRlOiBmdW5jdGlvbiAob2xkVk5vZGUsIHZOb2RlKSB7XG4gICAgICAgICAgICAgICAgdmFyIF9hID0gb2xkVk5vZGUuZGF0YSwgb2xkRGF0YSA9IF9hID09PSB2b2lkIDAgPyB7fSA6IF9hO1xuICAgICAgICAgICAgICAgIHZhciBlbG0gPSB2Tm9kZS5lbG0sIF9iID0gdk5vZGUuZGF0YSwgZGF0YSA9IF9iID09PSB2b2lkIDAgPyB7fSA6IF9iO1xuICAgICAgICAgICAgICAgIHZhciBvbGRTY29wZSA9IG9sZERhdGEuaXNvbGF0ZSB8fCBcIlwiO1xuICAgICAgICAgICAgICAgIHZhciBzY29wZSA9IGRhdGEuaXNvbGF0ZSB8fCBcIlwiO1xuICAgICAgICAgICAgICAgIGlmIChzY29wZSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAob2xkU2NvcGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYucmVtb3ZlU2NvcGUob2xkU2NvcGUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHNlbGYuc2V0U2NvcGUoZWxtLCBzY29wZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChvbGRTY29wZSAmJiAhc2NvcGUpIHtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5yZW1vdmVTY29wZShzY29wZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHJlbW92ZTogZnVuY3Rpb24gKF9hLCBjYikge1xuICAgICAgICAgICAgICAgIHZhciBkYXRhID0gX2EuZGF0YTtcbiAgICAgICAgICAgICAgICBkYXRhID0gZGF0YSB8fCB7fTtcbiAgICAgICAgICAgICAgICB2YXIgc2NvcGUgPSBkYXRhLmlzb2xhdGU7XG4gICAgICAgICAgICAgICAgaWYgKHNjb3BlKSB7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYucmVtb3ZlU2NvcGUoc2NvcGUpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoc2VsZi5ldmVudERlbGVnYXRvcnMuZ2V0KHNjb3BlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5ldmVudERlbGVnYXRvcnMuc2V0KHNjb3BlLCBbXSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2IoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBkZXN0cm95OiBmdW5jdGlvbiAoX2EpIHtcbiAgICAgICAgICAgICAgICB2YXIgZGF0YSA9IF9hLmRhdGE7XG4gICAgICAgICAgICAgICAgZGF0YSA9IGRhdGEgfHwge307XG4gICAgICAgICAgICAgICAgdmFyIHNjb3BlID0gZGF0YS5pc29sYXRlO1xuICAgICAgICAgICAgICAgIGlmIChzY29wZSkge1xuICAgICAgICAgICAgICAgICAgICBzZWxmLnJlbW92ZVNjb3BlKHNjb3BlKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNlbGYuZXZlbnREZWxlZ2F0b3JzLmdldChzY29wZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuZXZlbnREZWxlZ2F0b3JzLnNldChzY29wZSwgW10pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH07XG4gICAgcmV0dXJuIElzb2xhdGVNb2R1bGU7XG59KCkpO1xuZXhwb3J0cy5Jc29sYXRlTW9kdWxlID0gSXNvbGF0ZU1vZHVsZTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWlzb2xhdGVNb2R1bGUuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgc25hYmJkb21fMSA9IHJlcXVpcmUoJ3NuYWJiZG9tJyk7XG52YXIgeHN0cmVhbV8xID0gcmVxdWlyZSgneHN0cmVhbScpO1xudmFyIERPTVNvdXJjZV8xID0gcmVxdWlyZSgnLi9ET01Tb3VyY2UnKTtcbnZhciBWTm9kZVdyYXBwZXJfMSA9IHJlcXVpcmUoJy4vVk5vZGVXcmFwcGVyJyk7XG52YXIgdXRpbHNfMSA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcbnZhciBtb2R1bGVzXzEgPSByZXF1aXJlKCcuL21vZHVsZXMnKTtcbnZhciBpc29sYXRlTW9kdWxlXzEgPSByZXF1aXJlKCcuL2lzb2xhdGVNb2R1bGUnKTtcbnZhciB0cmFuc3Bvc2l0aW9uXzEgPSByZXF1aXJlKCcuL3RyYW5zcG9zaXRpb24nKTtcbnZhciB4c3RyZWFtX2FkYXB0ZXJfMSA9IHJlcXVpcmUoJ0BjeWNsZS94c3RyZWFtLWFkYXB0ZXInKTtcbmZ1bmN0aW9uIG1ha2VET01Ecml2ZXJJbnB1dEd1YXJkKG1vZHVsZXMpIHtcbiAgICBpZiAoIUFycmF5LmlzQXJyYXkobW9kdWxlcykpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiT3B0aW9uYWwgbW9kdWxlcyBvcHRpb24gbXVzdCBiZSBcIiArXG4gICAgICAgICAgICBcImFuIGFycmF5IGZvciBzbmFiYmRvbSBtb2R1bGVzXCIpO1xuICAgIH1cbn1cbmZ1bmN0aW9uIGRvbURyaXZlcklucHV0R3VhcmQodmlldyQpIHtcbiAgICBpZiAoIXZpZXckXG4gICAgICAgIHx8IHR5cGVvZiB2aWV3JC5hZGRMaXN0ZW5lciAhPT0gXCJmdW5jdGlvblwiXG4gICAgICAgIHx8IHR5cGVvZiB2aWV3JC5mb2xkICE9PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVGhlIERPTSBkcml2ZXIgZnVuY3Rpb24gZXhwZWN0cyBhcyBpbnB1dCBhIFN0cmVhbSBvZiBcIiArXG4gICAgICAgICAgICBcInZpcnR1YWwgRE9NIGVsZW1lbnRzXCIpO1xuICAgIH1cbn1cbmZ1bmN0aW9uIG1ha2VET01Ecml2ZXIoY29udGFpbmVyLCBvcHRpb25zKSB7XG4gICAgaWYgKCFvcHRpb25zKSB7XG4gICAgICAgIG9wdGlvbnMgPSB7fTtcbiAgICB9XG4gICAgdmFyIHRyYW5zcG9zaXRpb24gPSBvcHRpb25zLnRyYW5zcG9zaXRpb24gfHwgZmFsc2U7XG4gICAgdmFyIG1vZHVsZXMgPSBvcHRpb25zLm1vZHVsZXMgfHwgbW9kdWxlc18xLmRlZmF1bHQ7XG4gICAgdmFyIGlzb2xhdGVNb2R1bGUgPSBuZXcgaXNvbGF0ZU1vZHVsZV8xLklzb2xhdGVNb2R1bGUoKG5ldyBNYXAoKSkpO1xuICAgIHZhciBwYXRjaCA9IHNuYWJiZG9tXzEuaW5pdChbaXNvbGF0ZU1vZHVsZS5jcmVhdGVNb2R1bGUoKV0uY29uY2F0KG1vZHVsZXMpKTtcbiAgICB2YXIgcm9vdEVsZW1lbnQgPSB1dGlsc18xLmdldEVsZW1lbnQoY29udGFpbmVyKTtcbiAgICB2YXIgdm5vZGVXcmFwcGVyID0gbmV3IFZOb2RlV3JhcHBlcl8xLlZOb2RlV3JhcHBlcihyb290RWxlbWVudCk7XG4gICAgdmFyIGRlbGVnYXRvcnMgPSBuZXcgTWFwKCk7XG4gICAgbWFrZURPTURyaXZlcklucHV0R3VhcmQobW9kdWxlcyk7XG4gICAgZnVuY3Rpb24gRE9NRHJpdmVyKHZub2RlJCwgcnVuU3RyZWFtQWRhcHRlcikge1xuICAgICAgICBkb21Ecml2ZXJJbnB1dEd1YXJkKHZub2RlJCk7XG4gICAgICAgIHZhciB0cmFuc3Bvc2VWTm9kZSA9IHRyYW5zcG9zaXRpb25fMS5tYWtlVHJhbnNwb3NlVk5vZGUocnVuU3RyZWFtQWRhcHRlcik7XG4gICAgICAgIHZhciBwcmVwcm9jZXNzZWRWTm9kZSQgPSAodHJhbnNwb3NpdGlvbiA/IHZub2RlJC5tYXAodHJhbnNwb3NlVk5vZGUpLmZsYXR0ZW4oKSA6IHZub2RlJCk7XG4gICAgICAgIHZhciByb290RWxlbWVudCQgPSBwcmVwcm9jZXNzZWRWTm9kZSRcbiAgICAgICAgICAgIC5tYXAoZnVuY3Rpb24gKHZub2RlKSB7IHJldHVybiB2bm9kZVdyYXBwZXIuY2FsbCh2bm9kZSk7IH0pXG4gICAgICAgICAgICAuZm9sZChwYXRjaCwgcm9vdEVsZW1lbnQpXG4gICAgICAgICAgICAuZHJvcCgxKVxuICAgICAgICAgICAgLm1hcChmdW5jdGlvbiB1bndyYXBFbGVtZW50RnJvbVZOb2RlKHZub2RlKSB7IHJldHVybiB2bm9kZS5lbG07IH0pXG4gICAgICAgICAgICAuY29tcG9zZShmdW5jdGlvbiAoc3RyZWFtKSB7IHJldHVybiB4c3RyZWFtXzEuZGVmYXVsdC5tZXJnZShzdHJlYW0sIHhzdHJlYW1fMS5kZWZhdWx0Lm5ldmVyKCkpOyB9KSAvLyBkb24ndCBjb21wbGV0ZSB0aGlzIHN0cmVhbVxuICAgICAgICAgICAgLnN0YXJ0V2l0aChyb290RWxlbWVudCk7XG4gICAgICAgIC8qIHRzbGludDpkaXNhYmxlOm5vLWVtcHR5ICovXG4gICAgICAgIHJvb3RFbGVtZW50JC5hZGRMaXN0ZW5lcih7IG5leHQ6IGZ1bmN0aW9uICgpIHsgfSwgZXJyb3I6IGZ1bmN0aW9uICgpIHsgfSwgY29tcGxldGU6IGZ1bmN0aW9uICgpIHsgfSB9KTtcbiAgICAgICAgLyogdHNsaW50OmVuYWJsZTpuby1lbXB0eSAqL1xuICAgICAgICByZXR1cm4gbmV3IERPTVNvdXJjZV8xLkRPTVNvdXJjZShyb290RWxlbWVudCQsIHJ1blN0cmVhbUFkYXB0ZXIsIFtdLCBpc29sYXRlTW9kdWxlLCBkZWxlZ2F0b3JzKTtcbiAgICB9XG4gICAgO1xuICAgIERPTURyaXZlci5zdHJlYW1BZGFwdGVyID0geHN0cmVhbV9hZGFwdGVyXzEuZGVmYXVsdDtcbiAgICByZXR1cm4gRE9NRHJpdmVyO1xufVxuZXhwb3J0cy5tYWtlRE9NRHJpdmVyID0gbWFrZURPTURyaXZlcjtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPW1ha2VET01Ecml2ZXIuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgeHN0cmVhbV9hZGFwdGVyXzEgPSByZXF1aXJlKCdAY3ljbGUveHN0cmVhbS1hZGFwdGVyJyk7XG52YXIgdHJhbnNwb3NpdGlvbl8xID0gcmVxdWlyZSgnLi90cmFuc3Bvc2l0aW9uJyk7XG52YXIgSFRNTFNvdXJjZV8xID0gcmVxdWlyZSgnLi9IVE1MU291cmNlJyk7XG5mdW5jdGlvbiBtYWtlSFRNTERyaXZlcihvcHRpb25zKSB7XG4gICAgaWYgKCFvcHRpb25zKSB7XG4gICAgICAgIG9wdGlvbnMgPSB7fTtcbiAgICB9XG4gICAgdmFyIHRyYW5zcG9zaXRpb24gPSBvcHRpb25zLnRyYW5zcG9zaXRpb24gfHwgZmFsc2U7XG4gICAgZnVuY3Rpb24gaHRtbERyaXZlcih2bm9kZSQsIHJ1blN0cmVhbUFkYXB0ZXIpIHtcbiAgICAgICAgdmFyIHRyYW5zcG9zZVZOb2RlID0gdHJhbnNwb3NpdGlvbl8xLm1ha2VUcmFuc3Bvc2VWTm9kZShydW5TdHJlYW1BZGFwdGVyKTtcbiAgICAgICAgdmFyIHByZXByb2Nlc3NlZFZOb2RlJCA9ICh0cmFuc3Bvc2l0aW9uID8gdm5vZGUkLm1hcCh0cmFuc3Bvc2VWTm9kZSkuZmxhdHRlbigpIDogdm5vZGUkKTtcbiAgICAgICAgcmV0dXJuIG5ldyBIVE1MU291cmNlXzEuSFRNTFNvdXJjZShwcmVwcm9jZXNzZWRWTm9kZSQsIHJ1blN0cmVhbUFkYXB0ZXIpO1xuICAgIH1cbiAgICA7XG4gICAgaHRtbERyaXZlci5zdHJlYW1BZGFwdGVyID0geHN0cmVhbV9hZGFwdGVyXzEuZGVmYXVsdDtcbiAgICByZXR1cm4gaHRtbERyaXZlcjtcbn1cbmV4cG9ydHMubWFrZUhUTUxEcml2ZXIgPSBtYWtlSFRNTERyaXZlcjtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPW1ha2VIVE1MRHJpdmVyLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xudmFyIHhzdHJlYW1fMSA9IHJlcXVpcmUoJ3hzdHJlYW0nKTtcbnZhciBNb2NrZWRET01Tb3VyY2UgPSAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIE1vY2tlZERPTVNvdXJjZShfbW9ja0NvbmZpZykge1xuICAgICAgICB0aGlzLl9tb2NrQ29uZmlnID0gX21vY2tDb25maWc7XG4gICAgICAgIGlmIChfbW9ja0NvbmZpZ1snZWxlbWVudHMnXSkge1xuICAgICAgICAgICAgdGhpcy5lbGVtZW50cyA9IF9tb2NrQ29uZmlnWydlbGVtZW50cyddO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5lbGVtZW50cyA9IHhzdHJlYW1fMS5kZWZhdWx0LmVtcHR5KCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgTW9ja2VkRE9NU291cmNlLnByb3RvdHlwZS5ldmVudHMgPSBmdW5jdGlvbiAoZXZlbnRUeXBlKSB7XG4gICAgICAgIHZhciBtb2NrQ29uZmlnID0gdGhpcy5fbW9ja0NvbmZpZztcbiAgICAgICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhtb2NrQ29uZmlnKTtcbiAgICAgICAgdmFyIGtleXNMZW4gPSBrZXlzLmxlbmd0aDtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBrZXlzTGVuOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBrZXkgPSBrZXlzW2ldO1xuICAgICAgICAgICAgaWYgKGtleSA9PT0gZXZlbnRUeXBlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG1vY2tDb25maWdba2V5XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4geHN0cmVhbV8xLmRlZmF1bHQuZW1wdHkoKTtcbiAgICB9O1xuICAgIE1vY2tlZERPTVNvdXJjZS5wcm90b3R5cGUuc2VsZWN0ID0gZnVuY3Rpb24gKHNlbGVjdG9yKSB7XG4gICAgICAgIHZhciBtb2NrQ29uZmlnID0gdGhpcy5fbW9ja0NvbmZpZztcbiAgICAgICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhtb2NrQ29uZmlnKTtcbiAgICAgICAgdmFyIGtleXNMZW4gPSBrZXlzLmxlbmd0aDtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBrZXlzTGVuOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBrZXkgPSBrZXlzW2ldO1xuICAgICAgICAgICAgaWYgKGtleSA9PT0gc2VsZWN0b3IpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbmV3IE1vY2tlZERPTVNvdXJjZShtb2NrQ29uZmlnW2tleV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZXcgTW9ja2VkRE9NU291cmNlKHt9KTtcbiAgICB9O1xuICAgIHJldHVybiBNb2NrZWRET01Tb3VyY2U7XG59KCkpO1xuZXhwb3J0cy5Nb2NrZWRET01Tb3VyY2UgPSBNb2NrZWRET01Tb3VyY2U7XG5mdW5jdGlvbiBtb2NrRE9NU291cmNlKG1vY2tDb25maWcpIHtcbiAgICByZXR1cm4gbmV3IE1vY2tlZERPTVNvdXJjZShtb2NrQ29uZmlnKTtcbn1cbmV4cG9ydHMubW9ja0RPTVNvdXJjZSA9IG1vY2tET01Tb3VyY2U7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1tb2NrRE9NU291cmNlLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xudmFyIENsYXNzTW9kdWxlID0gcmVxdWlyZSgnc25hYmJkb20vbW9kdWxlcy9jbGFzcycpO1xuZXhwb3J0cy5DbGFzc01vZHVsZSA9IENsYXNzTW9kdWxlO1xudmFyIFByb3BzTW9kdWxlID0gcmVxdWlyZSgnc25hYmJkb20vbW9kdWxlcy9wcm9wcycpO1xuZXhwb3J0cy5Qcm9wc01vZHVsZSA9IFByb3BzTW9kdWxlO1xudmFyIEF0dHJzTW9kdWxlID0gcmVxdWlyZSgnc25hYmJkb20vbW9kdWxlcy9hdHRyaWJ1dGVzJyk7XG5leHBvcnRzLkF0dHJzTW9kdWxlID0gQXR0cnNNb2R1bGU7XG52YXIgRXZlbnRzTW9kdWxlID0gcmVxdWlyZSgnc25hYmJkb20vbW9kdWxlcy9ldmVudGxpc3RlbmVycycpO1xuZXhwb3J0cy5FdmVudHNNb2R1bGUgPSBFdmVudHNNb2R1bGU7XG52YXIgU3R5bGVNb2R1bGUgPSByZXF1aXJlKCdzbmFiYmRvbS9tb2R1bGVzL3N0eWxlJyk7XG5leHBvcnRzLlN0eWxlTW9kdWxlID0gU3R5bGVNb2R1bGU7XG52YXIgSGVyb01vZHVsZSA9IHJlcXVpcmUoJ3NuYWJiZG9tL21vZHVsZXMvaGVybycpO1xuZXhwb3J0cy5IZXJvTW9kdWxlID0gSGVyb01vZHVsZTtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcbmV4cG9ydHMuZGVmYXVsdCA9IFtTdHlsZU1vZHVsZSwgQ2xhc3NNb2R1bGUsIFByb3BzTW9kdWxlLCBBdHRyc01vZHVsZV07XG4vLyMgc291cmNlTWFwcGluZ1VSTD1tb2R1bGVzLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xudmFyIHhzdHJlYW1fYWRhcHRlcl8xID0gcmVxdWlyZSgnQGN5Y2xlL3hzdHJlYW0tYWRhcHRlcicpO1xudmFyIHhzdHJlYW1fMSA9IHJlcXVpcmUoJ3hzdHJlYW0nKTtcbmZ1bmN0aW9uIGNyZWF0ZVZUcmVlKHZub2RlLCBjaGlsZHJlbikge1xuICAgIHJldHVybiB7XG4gICAgICAgIHNlbDogdm5vZGUuc2VsLFxuICAgICAgICBkYXRhOiB2bm9kZS5kYXRhLFxuICAgICAgICB0ZXh0OiB2bm9kZS50ZXh0LFxuICAgICAgICBlbG06IHZub2RlLmVsbSxcbiAgICAgICAga2V5OiB2bm9kZS5rZXksXG4gICAgICAgIGNoaWxkcmVuOiBjaGlsZHJlbixcbiAgICB9O1xufVxuZnVuY3Rpb24gbWFrZVRyYW5zcG9zZVZOb2RlKHJ1blN0cmVhbUFkYXB0ZXIpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gdHJhbnNwb3NlVk5vZGUodm5vZGUpIHtcbiAgICAgICAgaWYgKCF2bm9kZSkge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAodm5vZGUgJiYgdHlwZW9mIHZub2RlLmRhdGEgPT09IFwib2JqZWN0XCIgJiYgdm5vZGUuZGF0YS5zdGF0aWMpIHtcbiAgICAgICAgICAgIHJldHVybiB4c3RyZWFtXzEuZGVmYXVsdC5vZih2bm9kZSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAocnVuU3RyZWFtQWRhcHRlci5pc1ZhbGlkU3RyZWFtKHZub2RlKSkge1xuICAgICAgICAgICAgdmFyIHhzU3RyZWFtID0geHN0cmVhbV9hZGFwdGVyXzEuZGVmYXVsdC5hZGFwdCh2bm9kZSwgcnVuU3RyZWFtQWRhcHRlci5zdHJlYW1TdWJzY3JpYmUpO1xuICAgICAgICAgICAgcmV0dXJuIHhzU3RyZWFtLm1hcCh0cmFuc3Bvc2VWTm9kZSkuZmxhdHRlbigpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHR5cGVvZiB2bm9kZSA9PT0gXCJvYmplY3RcIikge1xuICAgICAgICAgICAgaWYgKCF2bm9kZS5jaGlsZHJlbiB8fCB2bm9kZS5jaGlsZHJlbi5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geHN0cmVhbV8xLmRlZmF1bHQub2Yodm5vZGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIHZub2RlQ2hpbGRyZW4gPSB2bm9kZS5jaGlsZHJlblxuICAgICAgICAgICAgICAgIC5tYXAodHJhbnNwb3NlVk5vZGUpXG4gICAgICAgICAgICAgICAgLmZpbHRlcihmdW5jdGlvbiAoeCkgeyByZXR1cm4geCAhPT0gbnVsbDsgfSk7XG4gICAgICAgICAgICByZXR1cm4gdm5vZGVDaGlsZHJlbi5sZW5ndGggPT09IDAgP1xuICAgICAgICAgICAgICAgIHhzdHJlYW1fMS5kZWZhdWx0Lm9mKGNyZWF0ZVZUcmVlKHZub2RlLCB2bm9kZUNoaWxkcmVuKSkgOlxuICAgICAgICAgICAgICAgIHhzdHJlYW1fMS5kZWZhdWx0LmNvbWJpbmUuYXBwbHkoeHN0cmVhbV8xLmRlZmF1bHQsIFtmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBjaGlsZHJlbiA9IFtdO1xuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBfaSA9IDA7IF9pIDwgYXJndW1lbnRzLmxlbmd0aDsgX2krKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2hpbGRyZW5bX2kgLSAwXSA9IGFyZ3VtZW50c1tfaV07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNyZWF0ZVZUcmVlKHZub2RlLCBjaGlsZHJlbik7XG4gICAgICAgICAgICAgICAgfV0uY29uY2F0KHZub2RlQ2hpbGRyZW4pKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlVuaGFuZGxlZCB2VHJlZSBWYWx1ZVwiKTtcbiAgICAgICAgfVxuICAgIH07XG59XG5leHBvcnRzLm1ha2VUcmFuc3Bvc2VWTm9kZSA9IG1ha2VUcmFuc3Bvc2VWTm9kZTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPXRyYW5zcG9zaXRpb24uanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG5mdW5jdGlvbiBpc0VsZW1lbnQob2JqKSB7XG4gICAgcmV0dXJuIHR5cGVvZiBIVE1MRWxlbWVudCA9PT0gXCJvYmplY3RcIiA/XG4gICAgICAgIG9iaiBpbnN0YW5jZW9mIEhUTUxFbGVtZW50IHx8IG9iaiBpbnN0YW5jZW9mIERvY3VtZW50RnJhZ21lbnQgOlxuICAgICAgICBvYmogJiYgdHlwZW9mIG9iaiA9PT0gXCJvYmplY3RcIiAmJiBvYmogIT09IG51bGwgJiZcbiAgICAgICAgICAgIChvYmoubm9kZVR5cGUgPT09IDEgfHwgb2JqLm5vZGVUeXBlID09PSAxMSkgJiZcbiAgICAgICAgICAgIHR5cGVvZiBvYmoubm9kZU5hbWUgPT09IFwic3RyaW5nXCI7XG59XG5leHBvcnRzLlNDT1BFX1BSRUZJWCA9IFwiJCRDWUNMRURPTSQkLVwiO1xuZnVuY3Rpb24gZ2V0RWxlbWVudChzZWxlY3RvcnMpIHtcbiAgICB2YXIgZG9tRWxlbWVudCA9ICh0eXBlb2Ygc2VsZWN0b3JzID09PSBcInN0cmluZ1wiID9cbiAgICAgICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvcihzZWxlY3RvcnMpIDpcbiAgICAgICAgc2VsZWN0b3JzKTtcbiAgICBpZiAodHlwZW9mIHNlbGVjdG9ycyA9PT0gXCJzdHJpbmdcIiAmJiBkb21FbGVtZW50ID09PSBudWxsKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIkNhbm5vdCByZW5kZXIgaW50byB1bmtub3duIGVsZW1lbnQgYFwiICsgc2VsZWN0b3JzICsgXCJgXCIpO1xuICAgIH1cbiAgICBlbHNlIGlmICghaXNFbGVtZW50KGRvbUVsZW1lbnQpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIkdpdmVuIGNvbnRhaW5lciBpcyBub3QgYSBET00gZWxlbWVudCBuZWl0aGVyIGEgXCIgK1xuICAgICAgICAgICAgXCJzZWxlY3RvciBzdHJpbmcuXCIpO1xuICAgIH1cbiAgICByZXR1cm4gZG9tRWxlbWVudDtcbn1cbmV4cG9ydHMuZ2V0RWxlbWVudCA9IGdldEVsZW1lbnQ7XG5mdW5jdGlvbiBnZXRTY29wZShuYW1lc3BhY2UpIHtcbiAgICByZXR1cm4gbmFtZXNwYWNlXG4gICAgICAgIC5maWx0ZXIoZnVuY3Rpb24gKGMpIHsgcmV0dXJuIGMuaW5kZXhPZihleHBvcnRzLlNDT1BFX1BSRUZJWCkgPiAtMTsgfSlcbiAgICAgICAgLnNsaWNlKC0xKSAvLyBvbmx5IG5lZWQgdGhlIGxhdGVzdCwgbW9zdCBzcGVjaWZpYywgaXNvbGF0ZWQgYm91bmRhcnlcbiAgICAgICAgLmpvaW4oXCJcIik7XG59XG5leHBvcnRzLmdldFNjb3BlID0gZ2V0U2NvcGU7XG5mdW5jdGlvbiBnZXRTZWxlY3RvcnMobmFtZXNwYWNlKSB7XG4gICAgcmV0dXJuIG5hbWVzcGFjZS5maWx0ZXIoZnVuY3Rpb24gKGMpIHsgcmV0dXJuIGMuaW5kZXhPZihleHBvcnRzLlNDT1BFX1BSRUZJWCkgPT09IC0xOyB9KS5qb2luKFwiIFwiKTtcbn1cbmV4cG9ydHMuZ2V0U2VsZWN0b3JzID0gZ2V0U2VsZWN0b3JzO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9dXRpbHMuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgeHN0cmVhbV8xID0gcmVxdWlyZSgneHN0cmVhbScpO1xuZnVuY3Rpb24gbG9nVG9Db25zb2xlRXJyb3IoZXJyKSB7XG4gICAgdmFyIHRhcmdldCA9IGVyci5zdGFjayB8fCBlcnI7XG4gICAgaWYgKGNvbnNvbGUgJiYgY29uc29sZS5lcnJvcikge1xuICAgICAgICBjb25zb2xlLmVycm9yKHRhcmdldCk7XG4gICAgfVxuICAgIGVsc2UgaWYgKGNvbnNvbGUgJiYgY29uc29sZS5sb2cpIHtcbiAgICAgICAgY29uc29sZS5sb2codGFyZ2V0KTtcbiAgICB9XG59XG52YXIgWFN0cmVhbUFkYXB0ZXIgPSB7XG4gICAgYWRhcHQ6IGZ1bmN0aW9uIChvcmlnaW5TdHJlYW0sIG9yaWdpblN0cmVhbVN1YnNjcmliZSkge1xuICAgICAgICBpZiAoWFN0cmVhbUFkYXB0ZXIuaXNWYWxpZFN0cmVhbShvcmlnaW5TdHJlYW0pKSB7XG4gICAgICAgICAgICByZXR1cm4gb3JpZ2luU3RyZWFtO1xuICAgICAgICB9XG4gICAgICAgIDtcbiAgICAgICAgdmFyIGRpc3Bvc2UgPSBudWxsO1xuICAgICAgICByZXR1cm4geHN0cmVhbV8xLmRlZmF1bHQuY3JlYXRlKHtcbiAgICAgICAgICAgIHN0YXJ0OiBmdW5jdGlvbiAob3V0KSB7XG4gICAgICAgICAgICAgICAgdmFyIG9ic2VydmVyID0ge1xuICAgICAgICAgICAgICAgICAgICBuZXh0OiBmdW5jdGlvbiAodmFsdWUpIHsgcmV0dXJuIG91dC5zaGFtZWZ1bGx5U2VuZE5leHQodmFsdWUpOyB9LFxuICAgICAgICAgICAgICAgICAgICBlcnJvcjogZnVuY3Rpb24gKGVycikgeyByZXR1cm4gb3V0LnNoYW1lZnVsbHlTZW5kRXJyb3IoZXJyKTsgfSxcbiAgICAgICAgICAgICAgICAgICAgY29tcGxldGU6IGZ1bmN0aW9uICgpIHsgcmV0dXJuIG91dC5zaGFtZWZ1bGx5U2VuZENvbXBsZXRlKCk7IH0sXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBkaXNwb3NlID0gb3JpZ2luU3RyZWFtU3Vic2NyaWJlKG9yaWdpblN0cmVhbSwgb2JzZXJ2ZXIpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHN0b3A6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGRpc3Bvc2UgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICAgICAgZGlzcG9zZSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBkaXNwb3NlOiBmdW5jdGlvbiAoc2lua3MsIHNpbmtQcm94aWVzLCBzb3VyY2VzKSB7XG4gICAgICAgIE9iamVjdC5rZXlzKHNvdXJjZXMpLmZvckVhY2goZnVuY3Rpb24gKGspIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2Ygc291cmNlc1trXS5kaXNwb3NlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgc291cmNlc1trXS5kaXNwb3NlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBPYmplY3Qua2V5cyhzaW5rcykuZm9yRWFjaChmdW5jdGlvbiAoaykge1xuICAgICAgICAgICAgc2lua3Nba10ucmVtb3ZlTGlzdGVuZXIoc2lua1Byb3hpZXNba10uc3RyZWFtKTtcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBtYWtlU3ViamVjdDogZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgc3RyZWFtID0geHN0cmVhbV8xLmRlZmF1bHQuY3JlYXRlKCk7XG4gICAgICAgIHZhciBvYnNlcnZlciA9IHtcbiAgICAgICAgICAgIG5leHQ6IGZ1bmN0aW9uICh4KSB7IHN0cmVhbS5zaGFtZWZ1bGx5U2VuZE5leHQoeCk7IH0sXG4gICAgICAgICAgICBlcnJvcjogZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgIGxvZ1RvQ29uc29sZUVycm9yKGVycik7XG4gICAgICAgICAgICAgICAgc3RyZWFtLnNoYW1lZnVsbHlTZW5kRXJyb3IoZXJyKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBjb21wbGV0ZTogZnVuY3Rpb24gKCkgeyBzdHJlYW0uc2hhbWVmdWxseVNlbmRDb21wbGV0ZSgpOyB9XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiB7IG9ic2VydmVyOiBvYnNlcnZlciwgc3RyZWFtOiBzdHJlYW0gfTtcbiAgICB9LFxuICAgIGlzVmFsaWRTdHJlYW06IGZ1bmN0aW9uIChzdHJlYW0pIHtcbiAgICAgICAgcmV0dXJuICh0eXBlb2Ygc3RyZWFtLmFkZExpc3RlbmVyID09PSAnZnVuY3Rpb24nICYmXG4gICAgICAgICAgICB0eXBlb2Ygc3RyZWFtLnNoYW1lZnVsbHlTZW5kTmV4dCA9PT0gJ2Z1bmN0aW9uJyk7XG4gICAgfSxcbiAgICBzdHJlYW1TdWJzY3JpYmU6IGZ1bmN0aW9uIChzdHJlYW0sIG9ic2VydmVyKSB7XG4gICAgICAgIHN0cmVhbS5hZGRMaXN0ZW5lcihvYnNlcnZlcik7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoKSB7IHJldHVybiBzdHJlYW0ucmVtb3ZlTGlzdGVuZXIob2JzZXJ2ZXIpOyB9O1xuICAgIH1cbn07XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XG5leHBvcnRzLmRlZmF1bHQgPSBYU3RyZWFtQWRhcHRlcjtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWluZGV4LmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xudmFyIGNsaWNrRXZlbnQgPSAndW5kZWZpbmVkJyAhPT0gdHlwZW9mIGRvY3VtZW50ICYmIGRvY3VtZW50Lm9udG91Y2hzdGFydCA/XG4gICAgJ3RvdWNoc3RhcnQnIDogJ2NsaWNrJztcbmZ1bmN0aW9uIHdoaWNoKGV2KSB7XG4gICAgaWYgKHR5cGVvZiB3aW5kb3cgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgdmFyIGUgPSBldiB8fCB3aW5kb3cuZXZlbnQ7XG4gICAgcmV0dXJuIGUud2hpY2ggPT09IG51bGwgPyBlLmJ1dHRvbiA6IGUud2hpY2g7XG59XG5mdW5jdGlvbiBzYW1lT3JpZ2luKGhyZWYpIHtcbiAgICBpZiAodHlwZW9mIHdpbmRvdyA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gaHJlZiAmJiBocmVmLmluZGV4T2Yod2luZG93LmxvY2F0aW9uLm9yaWdpbikgPT09IDA7XG59XG5mdW5jdGlvbiBtYWtlQ2xpY2tMaXN0ZW5lcihwdXNoKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIGNsaWNrTGlzdGVuZXIoZXZlbnQpIHtcbiAgICAgICAgaWYgKHdoaWNoKGV2ZW50KSAhPT0gMSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmIChldmVudC5tZXRhS2V5IHx8IGV2ZW50LmN0cmxLZXkgfHwgZXZlbnQuc2hpZnRLZXkpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZXZlbnQuZGVmYXVsdFByZXZlbnRlZCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHZhciBlbGVtZW50ID0gZXZlbnQudGFyZ2V0O1xuICAgICAgICB3aGlsZSAoZWxlbWVudCAmJiBlbGVtZW50Lm5vZGVOYW1lICE9PSAnQScpIHtcbiAgICAgICAgICAgIGVsZW1lbnQgPSBlbGVtZW50LnBhcmVudE5vZGU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFlbGVtZW50IHx8IGVsZW1lbnQubm9kZU5hbWUgIT09ICdBJykge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmIChlbGVtZW50Lmhhc0F0dHJpYnV0ZSgnZG93bmxvYWQnKSB8fFxuICAgICAgICAgICAgZWxlbWVudC5nZXRBdHRyaWJ1dGUoJ3JlbCcpID09PSAnZXh0ZXJuYWwnKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGVsZW1lbnQudGFyZ2V0KSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGxpbmsgPSBlbGVtZW50LmdldEF0dHJpYnV0ZSgnaHJlZicpO1xuICAgICAgICBpZiAobGluayAmJiBsaW5rLmluZGV4T2YoJ21haWx0bzonKSA+IC0xIHx8IGxpbmsgPT09ICcjJykge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmICghc2FtZU9yaWdpbihlbGVtZW50LmhyZWYpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgdmFyIHBhdGhuYW1lID0gZWxlbWVudC5wYXRobmFtZSwgc2VhcmNoID0gZWxlbWVudC5zZWFyY2gsIF9hID0gZWxlbWVudC5oYXNoLCBoYXNoID0gX2EgPT09IHZvaWQgMCA/ICcnIDogX2E7XG4gICAgICAgIHB1c2gocGF0aG5hbWUgKyBzZWFyY2ggKyBoYXNoKTtcbiAgICB9O1xufVxuZnVuY3Rpb24gY2FwdHVyZUNsaWNrcyhwdXNoKSB7XG4gICAgdmFyIGxpc3RlbmVyID0gbWFrZUNsaWNrTGlzdGVuZXIocHVzaCk7XG4gICAgaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoY2xpY2tFdmVudCwgbGlzdGVuZXIsIGZhbHNlKTtcbiAgICB9XG59XG5leHBvcnRzLmNhcHR1cmVDbGlja3MgPSBjYXB0dXJlQ2xpY2tzO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9Y2FwdHVyZUNsaWNrcy5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcbnZhciBtYWtlSGlzdG9yeURyaXZlcl8xID0gcmVxdWlyZSgnLi9tYWtlSGlzdG9yeURyaXZlcicpO1xuZXhwb3J0cy5tYWtlSGlzdG9yeURyaXZlciA9IG1ha2VIaXN0b3J5RHJpdmVyXzEubWFrZUhpc3RvcnlEcml2ZXI7XG52YXIgc2VydmVySGlzdG9yeV8xID0gcmVxdWlyZSgnLi9zZXJ2ZXJIaXN0b3J5Jyk7XG5leHBvcnRzLmNyZWF0ZVNlcnZlckhpc3RvcnkgPSBzZXJ2ZXJIaXN0b3J5XzEuY3JlYXRlU2VydmVySGlzdG9yeTtcbnZhciB1dGlsXzEgPSByZXF1aXJlKCcuL3V0aWwnKTtcbmV4cG9ydHMuc3VwcG9ydHNIaXN0b3J5ID0gdXRpbF8xLnN1cHBvcnRzSGlzdG9yeTtcbmV4cG9ydHMuY3JlYXRlTG9jYXRpb24gPSB1dGlsXzEuY3JlYXRlTG9jYXRpb247XG4vLyMgc291cmNlTWFwcGluZ1VSTD1pbmRleC5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcbnZhciBjYXB0dXJlQ2xpY2tzXzEgPSByZXF1aXJlKCcuL2NhcHR1cmVDbGlja3MnKTtcbmZ1bmN0aW9uIG1ha2VVcGRhdGVIaXN0b3J5KGhpc3RvcnkpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gdXBkYXRlSGlzdG9yeShsb2NhdGlvbikge1xuICAgICAgICBpZiAoJ3N0cmluZycgPT09IHR5cGVvZiBsb2NhdGlvbikge1xuICAgICAgICAgICAgaGlzdG9yeS5wdXNoKGhpc3RvcnkuY3JlYXRlTG9jYXRpb24obG9jYXRpb24pKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICgnb2JqZWN0JyA9PT0gdHlwZW9mIGxvY2F0aW9uKSB7XG4gICAgICAgICAgICAvLyBzdXBvcnQgdGhpbmdzIGxpa2UgaGlzdG9yeS5yZXBsYWNlKClcbiAgICAgICAgICAgIHZhciBfYSA9IGxvY2F0aW9uLnR5cGUsIHR5cGUgPSBfYSA9PT0gdm9pZCAwID8gJ3B1c2gnIDogX2E7XG4gICAgICAgICAgICBpZiAodHlwZSA9PT0gJ2dvJykge1xuICAgICAgICAgICAgICAgIGhpc3RvcnlbdHlwZV0obG9jYXRpb24pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgaGlzdG9yeVt0eXBlXShsb2NhdGlvbik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0hpc3RvcnkgRHJpdmVyIGlucHV0IG11c3QgYmUgYSBzdHJpbmcgb3IgYW4gJyArXG4gICAgICAgICAgICAgICAgJ29iamVjdCBidXQgcmVjZWl2ZWQgJHt0eXBlb2YgdXJsfScpO1xuICAgICAgICB9XG4gICAgfTtcbn1cbmZ1bmN0aW9uIGRlZmF1bHRPbkVycm9yRm4oZXJyKSB7XG4gICAgaWYgKGNvbnNvbGUgJiYgY29uc29sZS5lcnJvciAhPT0gdm9pZCAwKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyKTtcbiAgICB9XG59XG5mdW5jdGlvbiBtYWtlSGlzdG9yeURyaXZlcihoaXN0b3J5LCBvcHRpb25zKSB7XG4gICAgaWYgKCFoaXN0b3J5IHx8IHR5cGVvZiBoaXN0b3J5ICE9PSAnb2JqZWN0J1xuICAgICAgICB8fCB0eXBlb2YgaGlzdG9yeS5jcmVhdGVMb2NhdGlvbiAhPT0gJ2Z1bmN0aW9uJ1xuICAgICAgICB8fCB0eXBlb2YgaGlzdG9yeS5jcmVhdGVIcmVmICE9PSAnZnVuY3Rpb24nXG4gICAgICAgIHx8IHR5cGVvZiBoaXN0b3J5Lmxpc3RlbiAhPT0gJ2Z1bmN0aW9uJ1xuICAgICAgICB8fCB0eXBlb2YgaGlzdG9yeS5wdXNoICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ21ha2VIaXN0b3J5RHJpdmVyIHJlcXVpcmVzIGFuIHZhbGlkIGhpc3Rvcnkgb2JqZWN0ICcgK1xuICAgICAgICAgICAgJ2NvbnRhaW5pbmcgY3JlYXRlTG9jYXRpb24oKSwgY3JlYXRlSHJlZigpLCBwdXNoKCksIGFuZCBsaXN0ZW4oKSBtZXRob2RzJyk7XG4gICAgfVxuICAgIHZhciBjYXB0dXJlID0gb3B0aW9ucyAmJiBvcHRpb25zLmNhcHR1cmUgfHwgZmFsc2U7XG4gICAgdmFyIG9uRXJyb3IgPSBvcHRpb25zICYmIG9wdGlvbnMub25FcnJvciB8fCBkZWZhdWx0T25FcnJvckZuO1xuICAgIHJldHVybiBmdW5jdGlvbiBoaXN0b3J5RHJpdmVyKHNpbmskLCBydW5TQSkge1xuICAgICAgICB2YXIgX2EgPSBydW5TQS5tYWtlU3ViamVjdCgpLCBvYnNlcnZlciA9IF9hLm9ic2VydmVyLCBzdHJlYW0gPSBfYS5zdHJlYW07XG4gICAgICAgIHZhciB1bmxpc3RlbiA9IGhpc3RvcnkubGlzdGVuKGZ1bmN0aW9uIChsb2NhdGlvbikge1xuICAgICAgICAgICAgb2JzZXJ2ZXIubmV4dChsb2NhdGlvbik7XG4gICAgICAgIH0pO1xuICAgICAgICBpZiAodHlwZW9mIGhpc3RvcnkuYWRkQ29tcGxldGVDYWxsYmFjayA9PT0gJ2Z1bmN0aW9uJ1xuICAgICAgICAgICAgJiYgdHlwZW9mIGhpc3RvcnkuY29tcGxldGUgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGhpc3RvcnkuYWRkQ29tcGxldGVDYWxsYmFjayhmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgb2JzZXJ2ZXIuY29tcGxldGUoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIHJ1blNBLnN0cmVhbVN1YnNjcmliZShzaW5rJCwge1xuICAgICAgICAgICAgbmV4dDogbWFrZVVwZGF0ZUhpc3RvcnkoaGlzdG9yeSksXG4gICAgICAgICAgICBlcnJvcjogb25FcnJvcixcbiAgICAgICAgICAgIGNvbXBsZXRlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgdW5saXN0ZW4oKTtcbiAgICAgICAgICAgICAgICBvYnNlcnZlci5jb21wbGV0ZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKGNhcHR1cmUpIHtcbiAgICAgICAgICAgIGNhcHR1cmVDbGlja3NfMS5jYXB0dXJlQ2xpY2tzKGZ1bmN0aW9uIChwYXRobmFtZSkge1xuICAgICAgICAgICAgICAgIHZhciBsb2NhdGlvbiA9IGhpc3RvcnkuY3JlYXRlTG9jYXRpb24ocGF0aG5hbWUpO1xuICAgICAgICAgICAgICAgIGhpc3RvcnkucHVzaChsb2NhdGlvbik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBzdHJlYW0uY3JlYXRlSHJlZiA9IGhpc3RvcnkuY3JlYXRlSHJlZjtcbiAgICAgICAgc3RyZWFtLmNyZWF0ZUxvY2F0aW9uID0gaGlzdG9yeS5jcmVhdGVMb2NhdGlvbjtcbiAgICAgICAgcmV0dXJuIHN0cmVhbTtcbiAgICB9O1xufVxuZXhwb3J0cy5tYWtlSGlzdG9yeURyaXZlciA9IG1ha2VIaXN0b3J5RHJpdmVyO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9bWFrZUhpc3RvcnlEcml2ZXIuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgdXRpbF8xID0gcmVxdWlyZSgnLi91dGlsJyk7XG52YXIgU2VydmVySGlzdG9yeSA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gU2VydmVySGlzdG9yeSgpIHtcbiAgICAgICAgdGhpcy5saXN0ZW5lcnMgPSBbXTtcbiAgICB9XG4gICAgU2VydmVySGlzdG9yeS5wcm90b3R5cGUubGlzdGVuID0gZnVuY3Rpb24gKGxpc3RlbmVyKSB7XG4gICAgICAgIHRoaXMubGlzdGVuZXJzLnB1c2gobGlzdGVuZXIpO1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gbm9vcCgpIHsgcmV0dXJuIHZvaWQgMDsgfTtcbiAgICB9O1xuICAgIFNlcnZlckhpc3RvcnkucHJvdG90eXBlLnB1c2ggPSBmdW5jdGlvbiAobG9jYXRpb24pIHtcbiAgICAgICAgdmFyIGxlbmd0aCA9IHRoaXMubGlzdGVuZXJzLmxlbmd0aDtcbiAgICAgICAgaWYgKGxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdNdXN0IGJlIGdpdmVuIGF0IGxlYXN0IG9uZSBsaXN0ZW5lciBiZWZvcmUgcHVzaGluZycpO1xuICAgICAgICB9XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICAgIHRoaXMubGlzdGVuZXJzW2ldKHV0aWxfMS5jcmVhdGVMb2NhdGlvbihsb2NhdGlvbikpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBTZXJ2ZXJIaXN0b3J5LnByb3RvdHlwZS5yZXBsYWNlID0gZnVuY3Rpb24gKGxvY2F0aW9uKSB7XG4gICAgICAgIHRoaXMucHVzaChsb2NhdGlvbik7XG4gICAgfTtcbiAgICBTZXJ2ZXJIaXN0b3J5LnByb3RvdHlwZS5jcmVhdGVIcmVmID0gZnVuY3Rpb24gKHBhdGgpIHtcbiAgICAgICAgcmV0dXJuIHBhdGg7XG4gICAgfTtcbiAgICBTZXJ2ZXJIaXN0b3J5LnByb3RvdHlwZS5jcmVhdGVMb2NhdGlvbiA9IGZ1bmN0aW9uIChsb2NhdGlvbikge1xuICAgICAgICByZXR1cm4gdXRpbF8xLmNyZWF0ZUxvY2F0aW9uKGxvY2F0aW9uKTtcbiAgICB9O1xuICAgIFNlcnZlckhpc3RvcnkucHJvdG90eXBlLmFkZENvbXBsZXRlQ2FsbGJhY2sgPSBmdW5jdGlvbiAoY29tcGxldGUpIHtcbiAgICAgICAgdGhpcy5fY29tcGxldGVDYWxsYmFjayA9IGNvbXBsZXRlO1xuICAgIH07XG4gICAgU2VydmVySGlzdG9yeS5wcm90b3R5cGUuY29tcGxldGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuX2NvbXBsZXRlQ2FsbGJhY2soKTtcbiAgICB9O1xuICAgIHJldHVybiBTZXJ2ZXJIaXN0b3J5O1xufSgpKTtcbmZ1bmN0aW9uIGNyZWF0ZVNlcnZlckhpc3RvcnkoKSB7XG4gICAgcmV0dXJuIG5ldyBTZXJ2ZXJIaXN0b3J5KCk7XG59XG5leHBvcnRzLmNyZWF0ZVNlcnZlckhpc3RvcnkgPSBjcmVhdGVTZXJ2ZXJIaXN0b3J5O1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9c2VydmVySGlzdG9yeS5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcbmZ1bmN0aW9uIHN1cHBvcnRzSGlzdG9yeSgpIHtcbiAgICBpZiAodHlwZW9mIG5hdmlnYXRvciA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICB2YXIgdWEgPSBuYXZpZ2F0b3IudXNlckFnZW50O1xuICAgIGlmICgodWEuaW5kZXhPZignQW5kcm9pZCAyLicpICE9PSAtMSB8fFxuICAgICAgICB1YS5pbmRleE9mKCdBbmRyb2lkIDQuMCcpICE9PSAtMSkgJiZcbiAgICAgICAgdWEuaW5kZXhPZignTW9iaWxlIFNhZmFyaScpICE9PSAtMSAmJlxuICAgICAgICB1YS5pbmRleE9mKCdDaHJvbWUnKSA9PT0gLTEgJiZcbiAgICAgICAgdWEuaW5kZXhPZignV2luZG93cyBQaG9uZScpID09PSAtMSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGlmICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICByZXR1cm4gd2luZG93Lmhpc3RvcnkgJiYgJ3B1c2hTdGF0ZScgaW4gd2luZG93Lmhpc3Rvcnk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxufVxuZXhwb3J0cy5zdXBwb3J0c0hpc3RvcnkgPSBzdXBwb3J0c0hpc3Rvcnk7XG52YXIgbG9jYXRpb25EZWZhdWx0cyA9IHtcbiAgICBwYXRobmFtZTogJy8nLFxuICAgIGFjdGlvbjogJ1BPUCcsXG4gICAgaGFzaDogJycsXG4gICAgc2VhcmNoOiAnJyxcbiAgICBzdGF0ZTogbnVsbCxcbiAgICBrZXk6IG51bGwsXG4gICAgcXVlcnk6IG51bGwsXG59O1xuZnVuY3Rpb24gY3JlYXRlTG9jYXRpb24obG9jYXRpb24pIHtcbiAgICBpZiAodHlwZW9mIGxvY2F0aW9uID09PSAnc3RyaW5nJykge1xuICAgICAgICByZXR1cm4gT2JqZWN0LmFzc2lnbih7fSwgbG9jYXRpb25EZWZhdWx0cywgeyBwYXRobmFtZTogbG9jYXRpb24gfSk7XG4gICAgfVxuICAgIHJldHVybiBPYmplY3QuYXNzaWduKHt9LCBsb2NhdGlvbkRlZmF1bHRzLCBsb2NhdGlvbik7XG59XG5leHBvcnRzLmNyZWF0ZUxvY2F0aW9uID0gY3JlYXRlTG9jYXRpb247XG4vLyMgc291cmNlTWFwcGluZ1VSTD11dGlsLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgY291bnRlciA9IDA7XG5cbmZ1bmN0aW9uIG5ld1Njb3BlKCkge1xuICByZXR1cm4gXCJjeWNsZVwiICsgKytjb3VudGVyO1xufVxuXG4vKipcbiAqIFRha2VzIGEgYGRhdGFmbG93Q29tcG9uZW50YCBmdW5jdGlvbiBhbmQgYW4gb3B0aW9uYWwgYHNjb3BlYCBzdHJpbmcsIGFuZFxuICogcmV0dXJucyBhIHNjb3BlZCB2ZXJzaW9uIG9mIHRoZSBgZGF0YWZsb3dDb21wb25lbnRgIGZ1bmN0aW9uLlxuICpcbiAqIFdoZW4gdGhlIHNjb3BlZCBkYXRhZmxvdyBjb21wb25lbnQgaXMgaW52b2tlZCwgZWFjaCBzb3VyY2UgcHJvdmlkZWQgdG8gdGhlXG4gKiBzY29wZWQgZGF0YWZsb3dDb21wb25lbnQgaXMgaXNvbGF0ZWQgdG8gdGhlIHNjb3BlIHVzaW5nXG4gKiBgc291cmNlLmlzb2xhdGVTb3VyY2Uoc291cmNlLCBzY29wZSlgLCBpZiBwb3NzaWJsZS4gTGlrZXdpc2UsIHRoZSBzaW5rc1xuICogcmV0dXJuZWQgZnJvbSB0aGUgc2NvcGVkIGRhdGFmbG93IGNvbXBvbmVudCBhcmUgaXNvbGF0ZSB0byB0aGUgc2NvcGUgdXNpbmdcbiAqIGBzb3VyY2UuaXNvbGF0ZVNpbmsoc2luaywgc2NvcGUpYC5cbiAqXG4gKiBJZiB0aGUgYHNjb3BlYCBpcyBub3QgcHJvdmlkZWQsIGEgbmV3IHNjb3BlIHdpbGwgYmUgYXV0b21hdGljYWxseSBjcmVhdGVkLlxuICogVGhpcyBtZWFucyB0aGF0IHdoaWxlICoqYGlzb2xhdGUoZGF0YWZsb3dDb21wb25lbnQsIHNjb3BlKWAgaXMgcHVyZSoqXG4gKiAocmVmZXJlbnRpYWxseSB0cmFuc3BhcmVudCksICoqYGlzb2xhdGUoZGF0YWZsb3dDb21wb25lbnQpYCBpcyBpbXB1cmUqKlxuICogKG5vdCByZWZlcmVudGlhbGx5IHRyYW5zcGFyZW50KS4gVHdvIGNhbGxzIHRvIGBpc29sYXRlKEZvbywgYmFyKWAgd2lsbFxuICogZ2VuZXJhdGUgdHdvIGluZGlzdGluY3QgZGF0YWZsb3cgY29tcG9uZW50cy4gQnV0LCB0d28gY2FsbHMgdG8gYGlzb2xhdGUoRm9vKWBcbiAqIHdpbGwgZ2VuZXJhdGUgdHdvIGRpc3RpbmN0IGRhdGFmbG93IGNvbXBvbmVudHMuXG4gKlxuICogTm90ZSB0aGF0IGJvdGggYGlzb2xhdGVTb3VyY2UoKWAgYW5kIGBpc29sYXRlU2luaygpYCBhcmUgc3RhdGljIG1lbWJlcnMgb2ZcbiAqIGBzb3VyY2VgLiBUaGUgcmVhc29uIGZvciB0aGlzIGlzIHRoYXQgZHJpdmVycyBwcm9kdWNlIGBzb3VyY2VgIHdoaWxlIHRoZVxuICogYXBwbGljYXRpb24gcHJvZHVjZXMgYHNpbmtgLCBhbmQgaXQncyB0aGUgZHJpdmVyJ3MgcmVzcG9uc2liaWxpdHkgdG9cbiAqIGltcGxlbWVudCBgaXNvbGF0ZVNvdXJjZSgpYCBhbmQgYGlzb2xhdGVTaW5rKClgLlxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGRhdGFmbG93Q29tcG9uZW50IGEgZnVuY3Rpb24gdGhhdCB0YWtlcyBgc291cmNlc2AgYXMgaW5wdXRcbiAqIGFuZCBvdXRwdXRzIGEgY29sbGVjdGlvbiBvZiBgc2lua3NgLlxuICogQHBhcmFtIHtTdHJpbmd9IHNjb3BlIGFuIG9wdGlvbmFsIHN0cmluZyB0aGF0IGlzIHVzZWQgdG8gaXNvbGF0ZSBlYWNoXG4gKiBgc291cmNlc2AgYW5kIGBzaW5rc2Agd2hlbiB0aGUgcmV0dXJuZWQgc2NvcGVkIGRhdGFmbG93IGNvbXBvbmVudCBpcyBpbnZva2VkLlxuICogQHJldHVybiB7RnVuY3Rpb259IHRoZSBzY29wZWQgZGF0YWZsb3cgY29tcG9uZW50IGZ1bmN0aW9uIHRoYXQsIGFzIHRoZVxuICogb3JpZ2luYWwgYGRhdGFmbG93Q29tcG9uZW50YCBmdW5jdGlvbiwgdGFrZXMgYHNvdXJjZXNgIGFuZCByZXR1cm5zIGBzaW5rc2AuXG4gKiBAZnVuY3Rpb24gaXNvbGF0ZVxuICovXG5mdW5jdGlvbiBpc29sYXRlKGRhdGFmbG93Q29tcG9uZW50KSB7XG4gIHZhciBzY29wZSA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMSB8fCBhcmd1bWVudHNbMV0gPT09IHVuZGVmaW5lZCA/IG5ld1Njb3BlKCkgOiBhcmd1bWVudHNbMV07XG5cbiAgaWYgKHR5cGVvZiBkYXRhZmxvd0NvbXBvbmVudCAhPT0gXCJmdW5jdGlvblwiKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiRmlyc3QgYXJndW1lbnQgZ2l2ZW4gdG8gaXNvbGF0ZSgpIG11c3QgYmUgYSBcIiArIFwiJ2RhdGFmbG93Q29tcG9uZW50JyBmdW5jdGlvblwiKTtcbiAgfVxuICBpZiAodHlwZW9mIHNjb3BlICE9PSBcInN0cmluZ1wiKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiU2Vjb25kIGFyZ3VtZW50IGdpdmVuIHRvIGlzb2xhdGUoKSBtdXN0IGJlIGEgXCIgKyBcInN0cmluZyBmb3IgJ3Njb3BlJ1wiKTtcbiAgfVxuICByZXR1cm4gZnVuY3Rpb24gc2NvcGVkRGF0YWZsb3dDb21wb25lbnQoc291cmNlcykge1xuICAgIHZhciBzY29wZWRTb3VyY2VzID0ge307XG4gICAgZm9yICh2YXIga2V5IGluIHNvdXJjZXMpIHtcbiAgICAgIGlmIChzb3VyY2VzLmhhc093blByb3BlcnR5KGtleSkgJiYgc291cmNlc1trZXldICYmIHR5cGVvZiBzb3VyY2VzW2tleV0uaXNvbGF0ZVNvdXJjZSA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgIHNjb3BlZFNvdXJjZXNba2V5XSA9IHNvdXJjZXNba2V5XS5pc29sYXRlU291cmNlKHNvdXJjZXNba2V5XSwgc2NvcGUpO1xuICAgICAgfSBlbHNlIGlmIChzb3VyY2VzLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgc2NvcGVkU291cmNlc1trZXldID0gc291cmNlc1trZXldO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZvciAodmFyIF9sZW4gPSBhcmd1bWVudHMubGVuZ3RoLCByZXN0ID0gQXJyYXkoX2xlbiA+IDEgPyBfbGVuIC0gMSA6IDApLCBfa2V5ID0gMTsgX2tleSA8IF9sZW47IF9rZXkrKykge1xuICAgICAgcmVzdFtfa2V5IC0gMV0gPSBhcmd1bWVudHNbX2tleV07XG4gICAgfVxuXG4gICAgdmFyIHNpbmtzID0gZGF0YWZsb3dDb21wb25lbnQuYXBwbHkodW5kZWZpbmVkLCBbc2NvcGVkU291cmNlc10uY29uY2F0KHJlc3QpKTtcbiAgICB2YXIgc2NvcGVkU2lua3MgPSB7fTtcbiAgICBmb3IgKHZhciBrZXkgaW4gc2lua3MpIHtcbiAgICAgIGlmIChzaW5rcy5oYXNPd25Qcm9wZXJ0eShrZXkpICYmIHNvdXJjZXMuaGFzT3duUHJvcGVydHkoa2V5KSAmJiB0eXBlb2Ygc291cmNlc1trZXldLmlzb2xhdGVTaW5rID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgc2NvcGVkU2lua3Nba2V5XSA9IHNvdXJjZXNba2V5XS5pc29sYXRlU2luayhzaW5rc1trZXldLCBzY29wZSk7XG4gICAgICB9IGVsc2UgaWYgKHNpbmtzLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgc2NvcGVkU2lua3Nba2V5XSA9IHNpbmtzW2tleV07XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBzY29wZWRTaW5rcztcbiAgfTtcbn1cblxuaXNvbGF0ZS5yZXNldCA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIGNvdW50ZXIgPSAwO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBpc29sYXRlOyIsIid1c2Ugc3RyaWN0JztcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcblxudmFyIF94c3RyZWFtQWRhcHRlciA9IHJlcXVpcmUoJ0BjeWNsZS94c3RyZWFtLWFkYXB0ZXInKTtcblxudmFyIF94c3RyZWFtQWRhcHRlcjIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF94c3RyZWFtQWRhcHRlcik7XG5cbnZhciBfd3JpdGVUb1N0b3JlID0gcmVxdWlyZSgnLi93cml0ZVRvU3RvcmUnKTtcblxudmFyIF93cml0ZVRvU3RvcmUyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfd3JpdGVUb1N0b3JlKTtcblxudmFyIF9yZXNwb25zZUNvbGxlY3Rpb24gPSByZXF1aXJlKCcuL3Jlc3BvbnNlQ29sbGVjdGlvbicpO1xuXG52YXIgX3Jlc3BvbnNlQ29sbGVjdGlvbjIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9yZXNwb25zZUNvbGxlY3Rpb24pO1xuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KG9iaikgeyByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyBkZWZhdWx0OiBvYmogfTsgfVxuXG4vKipcbiAqIFN0b3JhZ2UgRHJpdmVyLlxuICpcbiAqIFRoaXMgaXMgYSBsb2NhbFN0b3JhZ2UgYW5kIHNlc3Npb25TdG9yYWdlIERyaXZlciBmb3IgQ3ljbGUuanMgYXBwcy4gVGhlXG4gKiBkcml2ZXIgaXMgYWxzbyBhIGZ1bmN0aW9uLCBhbmQgaXQgdGFrZXMgYSBzdHJlYW0gb2YgcmVxdWVzdHMgYXMgaW5wdXQsIGFuZFxuICogcmV0dXJucyBhICoqYHJlc3BvbnNlQ29sbGVjdGlvbmAqKiB3aXRoIGZ1bmN0aW9ucyB0aGF0IGFsbG93IHJlYWRpbmcgZnJvbSB0aGVcbiAqIHN0b3JhZ2Ugb2JqZWN0cy4gVGhlIGZ1bmN0aW9ucyBvbiB0aGUgKipgcmVzcG9uc2VDb2xsZWN0aW9uYCoqIHJldHVybiBzdHJlYW1zXG4gKiBvZiB0aGUgc3RvcmFnZSBkYXRhIHRoYXQgd2FzIHJlcXVlc3RlZC5cbiAqXG4gKiAqKlJlcXVlc3RzKiouIFRoZSBzdHJlYW0gb2YgcmVxdWVzdHMgc2hvdWxkIGVtaXQgb2JqZWN0cy4gVGhlc2Ugc2hvdWxkIGJlXG4gKiBpbnN0cnVjdGlvbnMgdG8gd3JpdGUgdG8gdGhlIGRlc2lyZWQgU3RvcmFnZSBvYmplY3QuIEhlcmUgYXJlIHRoZSBgcmVxdWVzdGBcbiAqIG9iamVjdCBwcm9wZXJ0aWVzOlxuICpcbiAqIC0gYHRhcmdldGAgKihTdHJpbmcpKjogdHlwZSBvZiBzdG9yYWdlLCBjYW4gYmUgYGxvY2FsYCBvciBgc2Vzc2lvbmAsIGRlZmF1bHRzXG4gKiB0byBgbG9jYWxgLlxuICogLSBgYWN0aW9uYCAqKFN0cmluZykqOiB0eXBlIG9mIGFjdGlvbiwgY2FuIGJlIGBzZXRJdGVtYCwgYHJlbW92ZUl0ZW1gIG9yXG4gKiBgY2xlYXJgLCBkZWZhdWx0cyB0byBgc2V0SXRlbWAuXG4gKiAtIGBrZXlgICooU3RyaW5nKSo6IHN0b3JhZ2Uga2V5LlxuICogLSBgdmFsdWVgICooU3RyaW5nKSo6IHN0b3JhZ2UgdmFsdWUuXG4gKlxuICogKipyZXNwb25zZUNvbGxlY3Rpb24qKi4gVGhlICoqYHJlc3BvbnNlQ29sbGVjdGlvbmAqKiBpcyBhbiBPYmplY3QgdGhhdFxuICogZXhwb3NlcyBmdW5jdGlvbnMgdG8gcmVhZCBmcm9tIGxvY2FsLSBhbmQgc2Vzc2lvblN0b3JhZ2UuXG4gKlxuICogYGBganNcbiAqIC8vIFJldHVybnMga2V5IG9mIG50aCBsb2NhbFN0b3JhZ2UgdmFsdWUuXG4gKiByZXNwb25zZUNvbGxlY3Rpb24ubG9jYWwuZ2V0S2V5KG4pXG4gKiAvLyBSZXR1cm5zIGxvY2FsU3RvcmFnZSB2YWx1ZSBvZiBga2V5YC5cbiAqIHJlc3BvbnNlQ29sbGVjdGlvbi5sb2NhbC5nZXRJdGVtKGtleSlcbiAqIC8vIFJldHVybnMga2V5IG9mIG50aCBzZXNzaW9uU3RvcmFnZSB2YWx1ZS5cbiAqIHJlc3BvbnNlQ29sbGVjdGlvbi5zZXNzaW9uLmdldEtleShuKVxuICogLy8gUmV0dXJucyBzZXNzaW9uU3RvcmFnZSB2YWx1ZSBvZiBga2V5YC5cbiAqIHJlc3BvbnNlQ29sbGVjdGlvbi5zZXNzaW9uLmdldEl0ZW0oa2V5KVxuICogYGBgXG4gKlxuICogQHBhcmFtIHJlcXVlc3QkIC0gYSBzdHJlYW0gb2Ygd3JpdGUgcmVxdWVzdCBvYmplY3RzLlxuICogQHJldHVybiB7T2JqZWN0fSB0aGUgcmVzcG9uc2UgY29sbGVjdGlvbiBjb250YWluaW5nIGZ1bmN0aW9uc1xuICogZm9yIHJlYWRpbmcgZnJvbSBzdG9yYWdlLlxuICogQGZ1bmN0aW9uIHN0b3JhZ2VEcml2ZXJcbiAqL1xuZnVuY3Rpb24gc3RvcmFnZURyaXZlcihyZXF1ZXN0JCwgcnVuU3RyZWFtQWRhcHRlcikge1xuICAvLyBFeGVjdXRlIHdyaXRpbmcgYWN0aW9ucy5cbiAgcmVxdWVzdCQuYWRkTGlzdGVuZXIoe1xuICAgIG5leHQ6IGZ1bmN0aW9uIG5leHQocmVxdWVzdCkge1xuICAgICAgcmV0dXJuICgwLCBfd3JpdGVUb1N0b3JlMi5kZWZhdWx0KShyZXF1ZXN0KTtcbiAgICB9LFxuICAgIGVycm9yOiBmdW5jdGlvbiBlcnJvcigpIHt9LFxuICAgIGNvbXBsZXRlOiBmdW5jdGlvbiBjb21wbGV0ZSgpIHt9XG4gIH0pO1xuXG4gIC8vIFJldHVybiByZWFkaW5nIGZ1bmN0aW9ucy5cbiAgcmV0dXJuICgwLCBfcmVzcG9uc2VDb2xsZWN0aW9uMi5kZWZhdWx0KShyZXF1ZXN0JCwgcnVuU3RyZWFtQWRhcHRlcik7XG59XG5cbnN0b3JhZ2VEcml2ZXIuc3RyZWFtQWRhcHRlciA9IF94c3RyZWFtQWRhcHRlcjIuZGVmYXVsdDtcblxuZXhwb3J0cy5kZWZhdWx0ID0gc3RvcmFnZURyaXZlcjsiLCIndXNlIHN0cmljdCc7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5cbmV4cG9ydHMuZGVmYXVsdCA9IGZ1bmN0aW9uIChyZXF1ZXN0JCwgcnVuU3RyZWFtQWRhcHRlcikge1xuICByZXR1cm4ge1xuICAgIC8vIEZvciBsb2NhbFN0b3JhZ2UuXG4gICAgZ2V0IGxvY2FsKCkge1xuICAgICAgcmV0dXJuICgwLCBfdXRpbDIuZGVmYXVsdCkocmVxdWVzdCQsIHJ1blN0cmVhbUFkYXB0ZXIpO1xuICAgIH0sXG4gICAgLy8gRm9yIHNlc3Npb25TdG9yYWdlLlxuICAgIGdldCBzZXNzaW9uKCkge1xuICAgICAgcmV0dXJuICgwLCBfdXRpbDIuZGVmYXVsdCkocmVxdWVzdCQsIHJ1blN0cmVhbUFkYXB0ZXIsICdzZXNzaW9uJyk7XG4gICAgfVxuICB9O1xufTtcblxudmFyIF91dGlsID0gcmVxdWlyZSgnLi91dGlsJyk7XG5cbnZhciBfdXRpbDIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF91dGlsKTtcblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgZGVmYXVsdDogb2JqIH07IH0iLCIndXNlIHN0cmljdCc7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLmRlZmF1bHQgPSBnZXRSZXNwb25zZU9iajtcblxudmFyIF9kcm9wUmVwZWF0cyA9IHJlcXVpcmUoJ3hzdHJlYW0vZXh0cmEvZHJvcFJlcGVhdHMnKTtcblxudmFyIF9kcm9wUmVwZWF0czIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9kcm9wUmVwZWF0cyk7XG5cbnZhciBfeHN0cmVhbUFkYXB0ZXIgPSByZXF1aXJlKCdAY3ljbGUveHN0cmVhbS1hZGFwdGVyJyk7XG5cbnZhciBfeHN0cmVhbUFkYXB0ZXIyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfeHN0cmVhbUFkYXB0ZXIpO1xuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KG9iaikgeyByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyBkZWZhdWx0OiBvYmogfTsgfVxuXG5mdW5jdGlvbiBnZXRTdG9yYWdlJChyZXF1ZXN0JCwgdHlwZSkge1xuICBpZiAodHlwZSA9PT0gJ2xvY2FsJykge1xuICAgIHJldHVybiByZXF1ZXN0JC5maWx0ZXIoZnVuY3Rpb24gKHJlcSkge1xuICAgICAgcmV0dXJuICFyZXEudGFyZ2V0IHx8IHJlcS50YXJnZXQgPT09ICdsb2NhbCc7XG4gICAgfSk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHJlcXVlc3QkLmZpbHRlcihmdW5jdGlvbiAocmVxKSB7XG4gICAgICByZXR1cm4gcmVxLnRhcmdldCA9PT0gJ3Nlc3Npb24nO1xuICAgIH0pO1xuICB9XG59XG5cbmZ1bmN0aW9uIHN0b3JhZ2VLZXkobiwgcmVxdWVzdCQpIHtcbiAgdmFyIHR5cGUgPSBhcmd1bWVudHMubGVuZ3RoIDw9IDIgfHwgYXJndW1lbnRzWzJdID09PSB1bmRlZmluZWQgPyAnbG9jYWwnIDogYXJndW1lbnRzWzJdO1xuXG4gIHZhciBzdG9yYWdlJCA9IGdldFN0b3JhZ2UkKHJlcXVlc3QkLCB0eXBlKTtcbiAgdmFyIGtleSA9IHR5cGUgPT09ICdsb2NhbCcgPyBsb2NhbFN0b3JhZ2Uua2V5KG4pIDogc2Vzc2lvblN0b3JhZ2Uua2V5KG4pO1xuXG4gIHJldHVybiBzdG9yYWdlJC5maWx0ZXIoZnVuY3Rpb24gKHJlcSkge1xuICAgIHJldHVybiByZXEua2V5ID09PSBrZXk7XG4gIH0pLm1hcChmdW5jdGlvbiAocmVxKSB7XG4gICAgcmV0dXJuIHJlcS5rZXk7XG4gIH0pLnN0YXJ0V2l0aChrZXkpLmNvbXBvc2UoKDAsIF9kcm9wUmVwZWF0czIuZGVmYXVsdCkoKSk7XG59XG5cbmZ1bmN0aW9uIHN0b3JhZ2VHZXRJdGVtKGtleSwgcmVxdWVzdCQpIHtcbiAgdmFyIHR5cGUgPSBhcmd1bWVudHMubGVuZ3RoIDw9IDIgfHwgYXJndW1lbnRzWzJdID09PSB1bmRlZmluZWQgPyAnbG9jYWwnIDogYXJndW1lbnRzWzJdO1xuXG4gIHZhciBzdG9yYWdlJCA9IGdldFN0b3JhZ2UkKHJlcXVlc3QkLCB0eXBlKTtcbiAgdmFyIHN0b3JhZ2VPYmogPSB0eXBlID09PSAnbG9jYWwnID8gbG9jYWxTdG9yYWdlIDogc2Vzc2lvblN0b3JhZ2U7XG5cbiAgcmV0dXJuIHN0b3JhZ2UkLmZpbHRlcihmdW5jdGlvbiAocmVxKSB7XG4gICAgcmV0dXJuIHJlcS5rZXkgPT09IGtleTtcbiAgfSkubWFwKGZ1bmN0aW9uIChyZXEpIHtcbiAgICByZXR1cm4gcmVxLnZhbHVlO1xuICB9KS5zdGFydFdpdGgoc3RvcmFnZU9iai5nZXRJdGVtKGtleSkpO1xufVxuXG5mdW5jdGlvbiBnZXRSZXNwb25zZU9iaihyZXF1ZXN0JCwgcnVuU0EpIHtcbiAgdmFyIHR5cGUgPSBhcmd1bWVudHMubGVuZ3RoIDw9IDIgfHwgYXJndW1lbnRzWzJdID09PSB1bmRlZmluZWQgPyAnbG9jYWwnIDogYXJndW1lbnRzWzJdO1xuXG4gIHJldHVybiB7XG4gICAgLy8gRnVuY3Rpb24gcmV0dXJuaW5nIHN0cmVhbSBvZiB0aGUgbnRoIGtleS5cblxuICAgIGtleTogZnVuY3Rpb24ga2V5KG4pIHtcbiAgICAgIHJldHVybiBydW5TQS5hZGFwdChzdG9yYWdlS2V5KG4sIHJlcXVlc3QkLCB0eXBlKSwgX3hzdHJlYW1BZGFwdGVyMi5kZWZhdWx0LnN0cmVhbVN1YnNjcmliZSk7XG4gICAgfSxcblxuICAgIC8vIEZ1bmN0aW9uIHJldHVybmluZyBzdHJlYW0gb2YgaXRlbSB2YWx1ZXMuXG4gICAgZ2V0SXRlbTogZnVuY3Rpb24gZ2V0SXRlbShrZXkpIHtcbiAgICAgIHJldHVybiBydW5TQS5hZGFwdChzdG9yYWdlR2V0SXRlbShrZXksIHJlcXVlc3QkLCB0eXBlKSwgX3hzdHJlYW1BZGFwdGVyMi5kZWZhdWx0LnN0cmVhbVN1YnNjcmliZSk7XG4gICAgfVxuICB9O1xufSIsIlwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuLyoqXG4gKiBAZnVuY3Rpb24gd3JpdGVUb1N0b3JlXG4gKiBAZGVzY3JpcHRpb25cbiAqIEEgdW5pdmVyc2FsIHdyaXRlIGZ1bmN0aW9uIGZvciBsb2NhbFN0b3JhZ2UgYW5kIHNlc3Npb25TdG9yYWdlLlxuICogQHBhcmFtIHtvYmplY3R9IHJlcXVlc3QgLSB0aGUgc3RvcmFnZSByZXF1ZXN0IG9iamVjdFxuICogQHBhcmFtIHtzdHJpbmd9IHJlcXVlc3QudGFyZ2V0IC0gYSBzdHJpbmcgZGV0ZXJtaW5lcyB3aGljaCBzdG9yYWdlIHRvIHVzZVxuICogQHBhcmFtIHtzdHJpbmd9IHJlcXVlc3QuYWN0aW9uIC0gYSBzdHJpbmcgZGV0ZXJtaW5lcyB0aGUgd3JpdGUgYWN0aW9uXG4gKiBAcGFyYW0ge3N0cmluZ30gcmVxdWVzdC5rZXkgLSB0aGUga2V5IG9mIGEgc3RvcmFnZSBpdGVtXG4gKiBAcGFyYW0ge3N0cmluZ30gcmVxdWVzdC52YWx1ZSAtIHRoZSB2YWx1ZSBvZiBhIHN0b3JhZ2UgaXRlbVxuICovXG5mdW5jdGlvbiB3cml0ZVRvU3RvcmUoX3JlZikge1xuICB2YXIgX3JlZiR0YXJnZXQgPSBfcmVmLnRhcmdldDtcbiAgdmFyIHRhcmdldCA9IF9yZWYkdGFyZ2V0ID09PSB1bmRlZmluZWQgPyBcImxvY2FsXCIgOiBfcmVmJHRhcmdldDtcbiAgdmFyIF9yZWYkYWN0aW9uID0gX3JlZi5hY3Rpb247XG4gIHZhciBhY3Rpb24gPSBfcmVmJGFjdGlvbiA9PT0gdW5kZWZpbmVkID8gXCJzZXRJdGVtXCIgOiBfcmVmJGFjdGlvbjtcbiAgdmFyIGtleSA9IF9yZWYua2V5O1xuICB2YXIgdmFsdWUgPSBfcmVmLnZhbHVlO1xuXG4gIC8vIERldGVybWluZSB0aGUgc3RvcmFnZSB0YXJnZXQuXG4gIHZhciBzdG9yYWdlID0gdGFyZ2V0ID09PSBcImxvY2FsXCIgPyBsb2NhbFN0b3JhZ2UgOiBzZXNzaW9uU3RvcmFnZTtcblxuICAvLyBFeGVjdXRlIHRoZSBzdG9yYWdlIGFjdGlvbiBhbmQgcGFzcyBhcmd1bWVudHMgaWYgdGhleSB3ZXJlIGRlZmluZWQuXG4gIHN0b3JhZ2VbYWN0aW9uXShrZXksIHZhbHVlKTtcbn1cblxuZXhwb3J0cy5kZWZhdWx0ID0gd3JpdGVUb1N0b3JlOyIsIlwidXNlIHN0cmljdFwiO1xudmFyIHhzdHJlYW1fMSA9IHJlcXVpcmUoJ3hzdHJlYW0nKTtcbmZ1bmN0aW9uIGxvZ1RvQ29uc29sZUVycm9yKGVycikge1xuICAgIHZhciB0YXJnZXQgPSBlcnIuc3RhY2sgfHwgZXJyO1xuICAgIGlmIChjb25zb2xlICYmIGNvbnNvbGUuZXJyb3IpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcih0YXJnZXQpO1xuICAgIH1cbiAgICBlbHNlIGlmIChjb25zb2xlICYmIGNvbnNvbGUubG9nKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKHRhcmdldCk7XG4gICAgfVxufVxudmFyIFhTdHJlYW1BZGFwdGVyID0ge1xuICAgIGFkYXB0OiBmdW5jdGlvbiAob3JpZ2luU3RyZWFtLCBvcmlnaW5TdHJlYW1TdWJzY3JpYmUpIHtcbiAgICAgICAgaWYgKFhTdHJlYW1BZGFwdGVyLmlzVmFsaWRTdHJlYW0ob3JpZ2luU3RyZWFtKSkge1xuICAgICAgICAgICAgcmV0dXJuIG9yaWdpblN0cmVhbTtcbiAgICAgICAgfVxuICAgICAgICA7XG4gICAgICAgIHZhciBkaXNwb3NlID0gbnVsbDtcbiAgICAgICAgcmV0dXJuIHhzdHJlYW1fMS5kZWZhdWx0LmNyZWF0ZSh7XG4gICAgICAgICAgICBzdGFydDogZnVuY3Rpb24gKG91dCkge1xuICAgICAgICAgICAgICAgIHZhciBvYnNlcnZlciA9IHtcbiAgICAgICAgICAgICAgICAgICAgbmV4dDogZnVuY3Rpb24gKHZhbHVlKSB7IHJldHVybiBvdXQuc2hhbWVmdWxseVNlbmROZXh0KHZhbHVlKTsgfSxcbiAgICAgICAgICAgICAgICAgICAgZXJyb3I6IGZ1bmN0aW9uIChlcnIpIHsgcmV0dXJuIG91dC5zaGFtZWZ1bGx5U2VuZEVycm9yKGVycik7IH0sXG4gICAgICAgICAgICAgICAgICAgIGNvbXBsZXRlOiBmdW5jdGlvbiAoKSB7IHJldHVybiBvdXQuc2hhbWVmdWxseVNlbmRDb21wbGV0ZSgpOyB9LFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgZGlzcG9zZSA9IG9yaWdpblN0cmVhbVN1YnNjcmliZShvcmlnaW5TdHJlYW0sIG9ic2VydmVyKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzdG9wOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBkaXNwb3NlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgICAgIGRpc3Bvc2UoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgZGlzcG9zZTogZnVuY3Rpb24gKHNpbmtzLCBzaW5rUHJveGllcywgc291cmNlcykge1xuICAgICAgICBPYmplY3Qua2V5cyhzb3VyY2VzKS5mb3JFYWNoKGZ1bmN0aW9uIChrKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHNvdXJjZXNba10uZGlzcG9zZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgIHNvdXJjZXNba10uZGlzcG9zZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgT2JqZWN0LmtleXMoc2lua3MpLmZvckVhY2goZnVuY3Rpb24gKGspIHtcbiAgICAgICAgICAgIHNpbmtzW2tdLnJlbW92ZUxpc3RlbmVyKHNpbmtQcm94aWVzW2tdLnN0cmVhbSk7XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgbWFrZUhvbGRTdWJqZWN0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBzdHJlYW0gPSB4c3RyZWFtXzEuZGVmYXVsdC5jcmVhdGVXaXRoTWVtb3J5KCk7XG4gICAgICAgIHZhciBvYnNlcnZlciA9IHtcbiAgICAgICAgICAgIG5leHQ6IGZ1bmN0aW9uICh4KSB7IHN0cmVhbS5zaGFtZWZ1bGx5U2VuZE5leHQoeCk7IH0sXG4gICAgICAgICAgICBlcnJvcjogZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgIGxvZ1RvQ29uc29sZUVycm9yKGVycik7XG4gICAgICAgICAgICAgICAgc3RyZWFtLnNoYW1lZnVsbHlTZW5kRXJyb3IoZXJyKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBjb21wbGV0ZTogZnVuY3Rpb24gKCkgeyBzdHJlYW0uc2hhbWVmdWxseVNlbmRDb21wbGV0ZSgpOyB9XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiB7IG9ic2VydmVyOiBvYnNlcnZlciwgc3RyZWFtOiBzdHJlYW0gfTtcbiAgICB9LFxuICAgIGlzVmFsaWRTdHJlYW06IGZ1bmN0aW9uIChzdHJlYW0pIHtcbiAgICAgICAgcmV0dXJuICh0eXBlb2Ygc3RyZWFtLmFkZExpc3RlbmVyID09PSAnZnVuY3Rpb24nICYmXG4gICAgICAgICAgICB0eXBlb2Ygc3RyZWFtLmltaXRhdGUgPT09ICdmdW5jdGlvbicpO1xuICAgIH0sXG4gICAgc3RyZWFtU3Vic2NyaWJlOiBmdW5jdGlvbiAoc3RyZWFtLCBvYnNlcnZlcikge1xuICAgICAgICBzdHJlYW0uYWRkTGlzdGVuZXIob2JzZXJ2ZXIpO1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKCkgeyByZXR1cm4gc3RyZWFtLnJlbW92ZUxpc3RlbmVyKG9ic2VydmVyKTsgfTtcbiAgICB9XG59O1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xuZXhwb3J0cy5kZWZhdWx0ID0gWFN0cmVhbUFkYXB0ZXI7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1pbmRleC5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcbnZhciBiYXNlXzEgPSByZXF1aXJlKCdAY3ljbGUvYmFzZScpO1xudmFyIHhzdHJlYW1fYWRhcHRlcl8xID0gcmVxdWlyZSgnQGN5Y2xlL3hzdHJlYW0tYWRhcHRlcicpO1xuLyoqXG4gKiBBIGZ1bmN0aW9uIHRoYXQgcHJlcGFyZXMgdGhlIEN5Y2xlIGFwcGxpY2F0aW9uIHRvIGJlIGV4ZWN1dGVkLiBUYWtlcyBhIGBtYWluYFxuICogZnVuY3Rpb24gYW5kIHByZXBhcmVzIHRvIGNpcmN1bGFybHkgY29ubmVjdHMgaXQgdG8gdGhlIGdpdmVuIGNvbGxlY3Rpb24gb2ZcbiAqIGRyaXZlciBmdW5jdGlvbnMuIEFzIGFuIG91dHB1dCwgYEN5Y2xlKClgIHJldHVybnMgYW4gb2JqZWN0IHdpdGggdGhyZWVcbiAqIHByb3BlcnRpZXM6IGBzb3VyY2VzYCwgYHNpbmtzYCBhbmQgYHJ1bmAuIE9ubHkgd2hlbiBgcnVuKClgIGlzIGNhbGxlZCB3aWxsXG4gKiB0aGUgYXBwbGljYXRpb24gYWN0dWFsbHkgZXhlY3V0ZS4gUmVmZXIgdG8gdGhlIGRvY3VtZW50YXRpb24gb2YgYHJ1bigpYCBmb3JcbiAqIG1vcmUgZGV0YWlscy5cbiAqXG4gKiAqKkV4YW1wbGU6KipcbiAqIGBgYGpzXG4gKiBjb25zdCB7c291cmNlcywgc2lua3MsIHJ1bn0gPSBDeWNsZShtYWluLCBkcml2ZXJzKTtcbiAqIC8vIC4uLlxuICogY29uc3QgZGlzcG9zZSA9IHJ1bigpOyAvLyBFeGVjdXRlcyB0aGUgYXBwbGljYXRpb25cbiAqIC8vIC4uLlxuICogZGlzcG9zZSgpO1xuICogYGBgXG4gKlxuICogQHBhcmFtIHtGdW5jdGlvbn0gbWFpbiBhIGZ1bmN0aW9uIHRoYXQgdGFrZXMgYHNvdXJjZXNgIGFzIGlucHV0XG4gKiBhbmQgb3V0cHV0cyBhIGNvbGxlY3Rpb24gb2YgYHNpbmtzYCBPYnNlcnZhYmxlcy5cbiAqIEBwYXJhbSB7T2JqZWN0fSBkcml2ZXJzIGFuIG9iamVjdCB3aGVyZSBrZXlzIGFyZSBkcml2ZXIgbmFtZXMgYW5kIHZhbHVlc1xuICogYXJlIGRyaXZlciBmdW5jdGlvbnMuXG4gKiBAcmV0dXJuIHtPYmplY3R9IGFuIG9iamVjdCB3aXRoIHRocmVlIHByb3BlcnRpZXM6IGBzb3VyY2VzYCwgYHNpbmtzYCBhbmRcbiAqIGBydW5gLiBgc291cmNlc2AgaXMgdGhlIGNvbGxlY3Rpb24gb2YgZHJpdmVyIHNvdXJjZXMsIGBzaW5rc2AgaXMgdGhlXG4gKiBjb2xsZWN0aW9uIG9mIGRyaXZlciBzaW5rcywgdGhlc2UgY2FuIGJlIHVzZWQgZm9yIGRlYnVnZ2luZyBvciB0ZXN0aW5nLiBgcnVuYFxuICogaXMgdGhlIGZ1bmN0aW9uIHRoYXQgb25jZSBjYWxsZWQgd2lsbCBleGVjdXRlIHRoZSBhcHBsaWNhdGlvbi5cbiAqIEBmdW5jdGlvbiBDeWNsZVxuICovXG52YXIgQ3ljbGUgPSBmdW5jdGlvbiAobWFpbiwgZHJpdmVycykge1xuICAgIHJldHVybiBiYXNlXzEuZGVmYXVsdChtYWluLCBkcml2ZXJzLCB7IHN0cmVhbUFkYXB0ZXI6IHhzdHJlYW1fYWRhcHRlcl8xLmRlZmF1bHQgfSk7XG59O1xuLyoqXG4gKiBUYWtlcyBhIGBtYWluYCBmdW5jdGlvbiBhbmQgY2lyY3VsYXJseSBjb25uZWN0cyBpdCB0byB0aGUgZ2l2ZW4gY29sbGVjdGlvblxuICogb2YgZHJpdmVyIGZ1bmN0aW9ucy5cbiAqXG4gKiAqKkV4YW1wbGU6KipcbiAqIGBgYGpzXG4gKiBjb25zdCBkaXNwb3NlID0gQ3ljbGUucnVuKG1haW4sIGRyaXZlcnMpO1xuICogLy8gLi4uXG4gKiBkaXNwb3NlKCk7XG4gKiBgYGBcbiAqXG4gKiBUaGUgYG1haW5gIGZ1bmN0aW9uIGV4cGVjdHMgYSBjb2xsZWN0aW9uIG9mIFwic291cmNlXCIgT2JzZXJ2YWJsZXMgKHJldHVybmVkXG4gKiBmcm9tIGRyaXZlcnMpIGFzIGlucHV0LCBhbmQgc2hvdWxkIHJldHVybiBhIGNvbGxlY3Rpb24gb2YgXCJzaW5rXCIgT2JzZXJ2YWJsZXNcbiAqICh0byBiZSBnaXZlbiB0byBkcml2ZXJzKS4gQSBcImNvbGxlY3Rpb24gb2YgT2JzZXJ2YWJsZXNcIiBpcyBhIEphdmFTY3JpcHRcbiAqIG9iamVjdCB3aGVyZSBrZXlzIG1hdGNoIHRoZSBkcml2ZXIgbmFtZXMgcmVnaXN0ZXJlZCBieSB0aGUgYGRyaXZlcnNgIG9iamVjdCxcbiAqIGFuZCB2YWx1ZXMgYXJlIHRoZSBPYnNlcnZhYmxlcy4gUmVmZXIgdG8gdGhlIGRvY3VtZW50YXRpb24gb2YgZWFjaCBkcml2ZXIgdG9cbiAqIHNlZSBtb3JlIGRldGFpbHMgb24gd2hhdCB0eXBlcyBvZiBzb3VyY2VzIGl0IG91dHB1dHMgYW5kIHNpbmtzIGl0IHJlY2VpdmVzLlxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IG1haW4gYSBmdW5jdGlvbiB0aGF0IHRha2VzIGBzb3VyY2VzYCBhcyBpbnB1dFxuICogYW5kIG91dHB1dHMgYSBjb2xsZWN0aW9uIG9mIGBzaW5rc2AgT2JzZXJ2YWJsZXMuXG4gKiBAcGFyYW0ge09iamVjdH0gZHJpdmVycyBhbiBvYmplY3Qgd2hlcmUga2V5cyBhcmUgZHJpdmVyIG5hbWVzIGFuZCB2YWx1ZXNcbiAqIGFyZSBkcml2ZXIgZnVuY3Rpb25zLlxuICogQHJldHVybiB7RnVuY3Rpb259IGEgZGlzcG9zZSBmdW5jdGlvbiwgdXNlZCB0byB0ZXJtaW5hdGUgdGhlIGV4ZWN1dGlvbiBvZiB0aGVcbiAqIEN5Y2xlLmpzIHByb2dyYW0sIGNsZWFuaW5nIHVwIHJlc291cmNlcyB1c2VkLlxuICogQGZ1bmN0aW9uIHJ1blxuICovXG5mdW5jdGlvbiBydW4obWFpbiwgZHJpdmVycykge1xuICAgIHZhciBydW4gPSBiYXNlXzEuZGVmYXVsdChtYWluLCBkcml2ZXJzLCB7IHN0cmVhbUFkYXB0ZXI6IHhzdHJlYW1fYWRhcHRlcl8xLmRlZmF1bHQgfSkucnVuO1xuICAgIHJldHVybiBydW4oKTtcbn1cbmV4cG9ydHMucnVuID0gcnVuO1xuQ3ljbGUucnVuID0gcnVuO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xuZXhwb3J0cy5kZWZhdWx0ID0gQ3ljbGU7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1pbmRleC5qcy5tYXAiLCIvKiFcbiAqIENyb3NzLUJyb3dzZXIgU3BsaXQgMS4xLjFcbiAqIENvcHlyaWdodCAyMDA3LTIwMTIgU3RldmVuIExldml0aGFuIDxzdGV2ZW5sZXZpdGhhbi5jb20+XG4gKiBBdmFpbGFibGUgdW5kZXIgdGhlIE1JVCBMaWNlbnNlXG4gKiBFQ01BU2NyaXB0IGNvbXBsaWFudCwgdW5pZm9ybSBjcm9zcy1icm93c2VyIHNwbGl0IG1ldGhvZFxuICovXG5cbi8qKlxuICogU3BsaXRzIGEgc3RyaW5nIGludG8gYW4gYXJyYXkgb2Ygc3RyaW5ncyB1c2luZyBhIHJlZ2V4IG9yIHN0cmluZyBzZXBhcmF0b3IuIE1hdGNoZXMgb2YgdGhlXG4gKiBzZXBhcmF0b3IgYXJlIG5vdCBpbmNsdWRlZCBpbiB0aGUgcmVzdWx0IGFycmF5LiBIb3dldmVyLCBpZiBgc2VwYXJhdG9yYCBpcyBhIHJlZ2V4IHRoYXQgY29udGFpbnNcbiAqIGNhcHR1cmluZyBncm91cHMsIGJhY2tyZWZlcmVuY2VzIGFyZSBzcGxpY2VkIGludG8gdGhlIHJlc3VsdCBlYWNoIHRpbWUgYHNlcGFyYXRvcmAgaXMgbWF0Y2hlZC5cbiAqIEZpeGVzIGJyb3dzZXIgYnVncyBjb21wYXJlZCB0byB0aGUgbmF0aXZlIGBTdHJpbmcucHJvdG90eXBlLnNwbGl0YCBhbmQgY2FuIGJlIHVzZWQgcmVsaWFibHlcbiAqIGNyb3NzLWJyb3dzZXIuXG4gKiBAcGFyYW0ge1N0cmluZ30gc3RyIFN0cmluZyB0byBzcGxpdC5cbiAqIEBwYXJhbSB7UmVnRXhwfFN0cmluZ30gc2VwYXJhdG9yIFJlZ2V4IG9yIHN0cmluZyB0byB1c2UgZm9yIHNlcGFyYXRpbmcgdGhlIHN0cmluZy5cbiAqIEBwYXJhbSB7TnVtYmVyfSBbbGltaXRdIE1heGltdW0gbnVtYmVyIG9mIGl0ZW1zIHRvIGluY2x1ZGUgaW4gdGhlIHJlc3VsdCBhcnJheS5cbiAqIEByZXR1cm5zIHtBcnJheX0gQXJyYXkgb2Ygc3Vic3RyaW5ncy5cbiAqIEBleGFtcGxlXG4gKlxuICogLy8gQmFzaWMgdXNlXG4gKiBzcGxpdCgnYSBiIGMgZCcsICcgJyk7XG4gKiAvLyAtPiBbJ2EnLCAnYicsICdjJywgJ2QnXVxuICpcbiAqIC8vIFdpdGggbGltaXRcbiAqIHNwbGl0KCdhIGIgYyBkJywgJyAnLCAyKTtcbiAqIC8vIC0+IFsnYScsICdiJ11cbiAqXG4gKiAvLyBCYWNrcmVmZXJlbmNlcyBpbiByZXN1bHQgYXJyYXlcbiAqIHNwbGl0KCcuLndvcmQxIHdvcmQyLi4nLCAvKFthLXpdKykoXFxkKykvaSk7XG4gKiAvLyAtPiBbJy4uJywgJ3dvcmQnLCAnMScsICcgJywgJ3dvcmQnLCAnMicsICcuLiddXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gKGZ1bmN0aW9uIHNwbGl0KHVuZGVmKSB7XG5cbiAgdmFyIG5hdGl2ZVNwbGl0ID0gU3RyaW5nLnByb3RvdHlwZS5zcGxpdCxcbiAgICBjb21wbGlhbnRFeGVjTnBjZyA9IC8oKT8/Ly5leGVjKFwiXCIpWzFdID09PSB1bmRlZixcbiAgICAvLyBOUENHOiBub25wYXJ0aWNpcGF0aW5nIGNhcHR1cmluZyBncm91cFxuICAgIHNlbGY7XG5cbiAgc2VsZiA9IGZ1bmN0aW9uKHN0ciwgc2VwYXJhdG9yLCBsaW1pdCkge1xuICAgIC8vIElmIGBzZXBhcmF0b3JgIGlzIG5vdCBhIHJlZ2V4LCB1c2UgYG5hdGl2ZVNwbGl0YFxuICAgIGlmIChPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoc2VwYXJhdG9yKSAhPT0gXCJbb2JqZWN0IFJlZ0V4cF1cIikge1xuICAgICAgcmV0dXJuIG5hdGl2ZVNwbGl0LmNhbGwoc3RyLCBzZXBhcmF0b3IsIGxpbWl0KTtcbiAgICB9XG4gICAgdmFyIG91dHB1dCA9IFtdLFxuICAgICAgZmxhZ3MgPSAoc2VwYXJhdG9yLmlnbm9yZUNhc2UgPyBcImlcIiA6IFwiXCIpICsgKHNlcGFyYXRvci5tdWx0aWxpbmUgPyBcIm1cIiA6IFwiXCIpICsgKHNlcGFyYXRvci5leHRlbmRlZCA/IFwieFwiIDogXCJcIikgKyAvLyBQcm9wb3NlZCBmb3IgRVM2XG4gICAgICAoc2VwYXJhdG9yLnN0aWNreSA/IFwieVwiIDogXCJcIiksXG4gICAgICAvLyBGaXJlZm94IDMrXG4gICAgICBsYXN0TGFzdEluZGV4ID0gMCxcbiAgICAgIC8vIE1ha2UgYGdsb2JhbGAgYW5kIGF2b2lkIGBsYXN0SW5kZXhgIGlzc3VlcyBieSB3b3JraW5nIHdpdGggYSBjb3B5XG4gICAgICBzZXBhcmF0b3IgPSBuZXcgUmVnRXhwKHNlcGFyYXRvci5zb3VyY2UsIGZsYWdzICsgXCJnXCIpLFxuICAgICAgc2VwYXJhdG9yMiwgbWF0Y2gsIGxhc3RJbmRleCwgbGFzdExlbmd0aDtcbiAgICBzdHIgKz0gXCJcIjsgLy8gVHlwZS1jb252ZXJ0XG4gICAgaWYgKCFjb21wbGlhbnRFeGVjTnBjZykge1xuICAgICAgLy8gRG9lc24ndCBuZWVkIGZsYWdzIGd5LCBidXQgdGhleSBkb24ndCBodXJ0XG4gICAgICBzZXBhcmF0b3IyID0gbmV3IFJlZ0V4cChcIl5cIiArIHNlcGFyYXRvci5zb3VyY2UgKyBcIiQoPyFcXFxccylcIiwgZmxhZ3MpO1xuICAgIH1cbiAgICAvKiBWYWx1ZXMgZm9yIGBsaW1pdGAsIHBlciB0aGUgc3BlYzpcbiAgICAgKiBJZiB1bmRlZmluZWQ6IDQyOTQ5NjcyOTUgLy8gTWF0aC5wb3coMiwgMzIpIC0gMVxuICAgICAqIElmIDAsIEluZmluaXR5LCBvciBOYU46IDBcbiAgICAgKiBJZiBwb3NpdGl2ZSBudW1iZXI6IGxpbWl0ID0gTWF0aC5mbG9vcihsaW1pdCk7IGlmIChsaW1pdCA+IDQyOTQ5NjcyOTUpIGxpbWl0IC09IDQyOTQ5NjcyOTY7XG4gICAgICogSWYgbmVnYXRpdmUgbnVtYmVyOiA0Mjk0OTY3Mjk2IC0gTWF0aC5mbG9vcihNYXRoLmFicyhsaW1pdCkpXG4gICAgICogSWYgb3RoZXI6IFR5cGUtY29udmVydCwgdGhlbiB1c2UgdGhlIGFib3ZlIHJ1bGVzXG4gICAgICovXG4gICAgbGltaXQgPSBsaW1pdCA9PT0gdW5kZWYgPyAtMSA+Pj4gMCA6IC8vIE1hdGgucG93KDIsIDMyKSAtIDFcbiAgICBsaW1pdCA+Pj4gMDsgLy8gVG9VaW50MzIobGltaXQpXG4gICAgd2hpbGUgKG1hdGNoID0gc2VwYXJhdG9yLmV4ZWMoc3RyKSkge1xuICAgICAgLy8gYHNlcGFyYXRvci5sYXN0SW5kZXhgIGlzIG5vdCByZWxpYWJsZSBjcm9zcy1icm93c2VyXG4gICAgICBsYXN0SW5kZXggPSBtYXRjaC5pbmRleCArIG1hdGNoWzBdLmxlbmd0aDtcbiAgICAgIGlmIChsYXN0SW5kZXggPiBsYXN0TGFzdEluZGV4KSB7XG4gICAgICAgIG91dHB1dC5wdXNoKHN0ci5zbGljZShsYXN0TGFzdEluZGV4LCBtYXRjaC5pbmRleCkpO1xuICAgICAgICAvLyBGaXggYnJvd3NlcnMgd2hvc2UgYGV4ZWNgIG1ldGhvZHMgZG9uJ3QgY29uc2lzdGVudGx5IHJldHVybiBgdW5kZWZpbmVkYCBmb3JcbiAgICAgICAgLy8gbm9ucGFydGljaXBhdGluZyBjYXB0dXJpbmcgZ3JvdXBzXG4gICAgICAgIGlmICghY29tcGxpYW50RXhlY05wY2cgJiYgbWF0Y2gubGVuZ3RoID4gMSkge1xuICAgICAgICAgIG1hdGNoWzBdLnJlcGxhY2Uoc2VwYXJhdG9yMiwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGggLSAyOyBpKyspIHtcbiAgICAgICAgICAgICAgaWYgKGFyZ3VtZW50c1tpXSA9PT0gdW5kZWYpIHtcbiAgICAgICAgICAgICAgICBtYXRjaFtpXSA9IHVuZGVmO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG1hdGNoLmxlbmd0aCA+IDEgJiYgbWF0Y2guaW5kZXggPCBzdHIubGVuZ3RoKSB7XG4gICAgICAgICAgQXJyYXkucHJvdG90eXBlLnB1c2guYXBwbHkob3V0cHV0LCBtYXRjaC5zbGljZSgxKSk7XG4gICAgICAgIH1cbiAgICAgICAgbGFzdExlbmd0aCA9IG1hdGNoWzBdLmxlbmd0aDtcbiAgICAgICAgbGFzdExhc3RJbmRleCA9IGxhc3RJbmRleDtcbiAgICAgICAgaWYgKG91dHB1dC5sZW5ndGggPj0gbGltaXQpIHtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKHNlcGFyYXRvci5sYXN0SW5kZXggPT09IG1hdGNoLmluZGV4KSB7XG4gICAgICAgIHNlcGFyYXRvci5sYXN0SW5kZXgrKzsgLy8gQXZvaWQgYW4gaW5maW5pdGUgbG9vcFxuICAgICAgfVxuICAgIH1cbiAgICBpZiAobGFzdExhc3RJbmRleCA9PT0gc3RyLmxlbmd0aCkge1xuICAgICAgaWYgKGxhc3RMZW5ndGggfHwgIXNlcGFyYXRvci50ZXN0KFwiXCIpKSB7XG4gICAgICAgIG91dHB1dC5wdXNoKFwiXCIpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBvdXRwdXQucHVzaChzdHIuc2xpY2UobGFzdExhc3RJbmRleCkpO1xuICAgIH1cbiAgICByZXR1cm4gb3V0cHV0Lmxlbmd0aCA+IGxpbWl0ID8gb3V0cHV0LnNsaWNlKDAsIGxpbWl0KSA6IG91dHB1dDtcbiAgfTtcblxuICByZXR1cm4gc2VsZjtcbn0pKCk7XG4iLCJ2YXIgcFNsaWNlID0gQXJyYXkucHJvdG90eXBlLnNsaWNlO1xudmFyIG9iamVjdEtleXMgPSByZXF1aXJlKCcuL2xpYi9rZXlzLmpzJyk7XG52YXIgaXNBcmd1bWVudHMgPSByZXF1aXJlKCcuL2xpYi9pc19hcmd1bWVudHMuanMnKTtcblxudmFyIGRlZXBFcXVhbCA9IG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGFjdHVhbCwgZXhwZWN0ZWQsIG9wdHMpIHtcbiAgaWYgKCFvcHRzKSBvcHRzID0ge307XG4gIC8vIDcuMS4gQWxsIGlkZW50aWNhbCB2YWx1ZXMgYXJlIGVxdWl2YWxlbnQsIGFzIGRldGVybWluZWQgYnkgPT09LlxuICBpZiAoYWN0dWFsID09PSBleHBlY3RlZCkge1xuICAgIHJldHVybiB0cnVlO1xuXG4gIH0gZWxzZSBpZiAoYWN0dWFsIGluc3RhbmNlb2YgRGF0ZSAmJiBleHBlY3RlZCBpbnN0YW5jZW9mIERhdGUpIHtcbiAgICByZXR1cm4gYWN0dWFsLmdldFRpbWUoKSA9PT0gZXhwZWN0ZWQuZ2V0VGltZSgpO1xuXG4gIC8vIDcuMy4gT3RoZXIgcGFpcnMgdGhhdCBkbyBub3QgYm90aCBwYXNzIHR5cGVvZiB2YWx1ZSA9PSAnb2JqZWN0JyxcbiAgLy8gZXF1aXZhbGVuY2UgaXMgZGV0ZXJtaW5lZCBieSA9PS5cbiAgfSBlbHNlIGlmICghYWN0dWFsIHx8ICFleHBlY3RlZCB8fCB0eXBlb2YgYWN0dWFsICE9ICdvYmplY3QnICYmIHR5cGVvZiBleHBlY3RlZCAhPSAnb2JqZWN0Jykge1xuICAgIHJldHVybiBvcHRzLnN0cmljdCA/IGFjdHVhbCA9PT0gZXhwZWN0ZWQgOiBhY3R1YWwgPT0gZXhwZWN0ZWQ7XG5cbiAgLy8gNy40LiBGb3IgYWxsIG90aGVyIE9iamVjdCBwYWlycywgaW5jbHVkaW5nIEFycmF5IG9iamVjdHMsIGVxdWl2YWxlbmNlIGlzXG4gIC8vIGRldGVybWluZWQgYnkgaGF2aW5nIHRoZSBzYW1lIG51bWJlciBvZiBvd25lZCBwcm9wZXJ0aWVzIChhcyB2ZXJpZmllZFxuICAvLyB3aXRoIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbCksIHRoZSBzYW1lIHNldCBvZiBrZXlzXG4gIC8vIChhbHRob3VnaCBub3QgbmVjZXNzYXJpbHkgdGhlIHNhbWUgb3JkZXIpLCBlcXVpdmFsZW50IHZhbHVlcyBmb3IgZXZlcnlcbiAgLy8gY29ycmVzcG9uZGluZyBrZXksIGFuZCBhbiBpZGVudGljYWwgJ3Byb3RvdHlwZScgcHJvcGVydHkuIE5vdGU6IHRoaXNcbiAgLy8gYWNjb3VudHMgZm9yIGJvdGggbmFtZWQgYW5kIGluZGV4ZWQgcHJvcGVydGllcyBvbiBBcnJheXMuXG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIG9iakVxdWl2KGFjdHVhbCwgZXhwZWN0ZWQsIG9wdHMpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGlzVW5kZWZpbmVkT3JOdWxsKHZhbHVlKSB7XG4gIHJldHVybiB2YWx1ZSA9PT0gbnVsbCB8fCB2YWx1ZSA9PT0gdW5kZWZpbmVkO1xufVxuXG5mdW5jdGlvbiBpc0J1ZmZlciAoeCkge1xuICBpZiAoIXggfHwgdHlwZW9mIHggIT09ICdvYmplY3QnIHx8IHR5cGVvZiB4Lmxlbmd0aCAhPT0gJ251bWJlcicpIHJldHVybiBmYWxzZTtcbiAgaWYgKHR5cGVvZiB4LmNvcHkgIT09ICdmdW5jdGlvbicgfHwgdHlwZW9mIHguc2xpY2UgIT09ICdmdW5jdGlvbicpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgaWYgKHgubGVuZ3RoID4gMCAmJiB0eXBlb2YgeFswXSAhPT0gJ251bWJlcicpIHJldHVybiBmYWxzZTtcbiAgcmV0dXJuIHRydWU7XG59XG5cbmZ1bmN0aW9uIG9iakVxdWl2KGEsIGIsIG9wdHMpIHtcbiAgdmFyIGksIGtleTtcbiAgaWYgKGlzVW5kZWZpbmVkT3JOdWxsKGEpIHx8IGlzVW5kZWZpbmVkT3JOdWxsKGIpKVxuICAgIHJldHVybiBmYWxzZTtcbiAgLy8gYW4gaWRlbnRpY2FsICdwcm90b3R5cGUnIHByb3BlcnR5LlxuICBpZiAoYS5wcm90b3R5cGUgIT09IGIucHJvdG90eXBlKSByZXR1cm4gZmFsc2U7XG4gIC8vfn5+SSd2ZSBtYW5hZ2VkIHRvIGJyZWFrIE9iamVjdC5rZXlzIHRocm91Z2ggc2NyZXd5IGFyZ3VtZW50cyBwYXNzaW5nLlxuICAvLyAgIENvbnZlcnRpbmcgdG8gYXJyYXkgc29sdmVzIHRoZSBwcm9ibGVtLlxuICBpZiAoaXNBcmd1bWVudHMoYSkpIHtcbiAgICBpZiAoIWlzQXJndW1lbnRzKGIpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGEgPSBwU2xpY2UuY2FsbChhKTtcbiAgICBiID0gcFNsaWNlLmNhbGwoYik7XG4gICAgcmV0dXJuIGRlZXBFcXVhbChhLCBiLCBvcHRzKTtcbiAgfVxuICBpZiAoaXNCdWZmZXIoYSkpIHtcbiAgICBpZiAoIWlzQnVmZmVyKGIpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGlmIChhLmxlbmd0aCAhPT0gYi5sZW5ndGgpIHJldHVybiBmYWxzZTtcbiAgICBmb3IgKGkgPSAwOyBpIDwgYS5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKGFbaV0gIT09IGJbaV0pIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbiAgdHJ5IHtcbiAgICB2YXIga2EgPSBvYmplY3RLZXlzKGEpLFxuICAgICAgICBrYiA9IG9iamVjdEtleXMoYik7XG4gIH0gY2F0Y2ggKGUpIHsvL2hhcHBlbnMgd2hlbiBvbmUgaXMgYSBzdHJpbmcgbGl0ZXJhbCBhbmQgdGhlIG90aGVyIGlzbid0XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIC8vIGhhdmluZyB0aGUgc2FtZSBudW1iZXIgb2Ygb3duZWQgcHJvcGVydGllcyAoa2V5cyBpbmNvcnBvcmF0ZXNcbiAgLy8gaGFzT3duUHJvcGVydHkpXG4gIGlmIChrYS5sZW5ndGggIT0ga2IubGVuZ3RoKVxuICAgIHJldHVybiBmYWxzZTtcbiAgLy90aGUgc2FtZSBzZXQgb2Yga2V5cyAoYWx0aG91Z2ggbm90IG5lY2Vzc2FyaWx5IHRoZSBzYW1lIG9yZGVyKSxcbiAga2Euc29ydCgpO1xuICBrYi5zb3J0KCk7XG4gIC8vfn5+Y2hlYXAga2V5IHRlc3RcbiAgZm9yIChpID0ga2EubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICBpZiAoa2FbaV0gIT0ga2JbaV0pXG4gICAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgLy9lcXVpdmFsZW50IHZhbHVlcyBmb3IgZXZlcnkgY29ycmVzcG9uZGluZyBrZXksIGFuZFxuICAvL35+fnBvc3NpYmx5IGV4cGVuc2l2ZSBkZWVwIHRlc3RcbiAgZm9yIChpID0ga2EubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICBrZXkgPSBrYVtpXTtcbiAgICBpZiAoIWRlZXBFcXVhbChhW2tleV0sIGJba2V5XSwgb3B0cykpIHJldHVybiBmYWxzZTtcbiAgfVxuICByZXR1cm4gdHlwZW9mIGEgPT09IHR5cGVvZiBiO1xufVxuIiwidmFyIHN1cHBvcnRzQXJndW1lbnRzQ2xhc3MgPSAoZnVuY3Rpb24oKXtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChhcmd1bWVudHMpXG59KSgpID09ICdbb2JqZWN0IEFyZ3VtZW50c10nO1xuXG5leHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSBzdXBwb3J0c0FyZ3VtZW50c0NsYXNzID8gc3VwcG9ydGVkIDogdW5zdXBwb3J0ZWQ7XG5cbmV4cG9ydHMuc3VwcG9ydGVkID0gc3VwcG9ydGVkO1xuZnVuY3Rpb24gc3VwcG9ydGVkKG9iamVjdCkge1xuICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG9iamVjdCkgPT0gJ1tvYmplY3QgQXJndW1lbnRzXSc7XG59O1xuXG5leHBvcnRzLnVuc3VwcG9ydGVkID0gdW5zdXBwb3J0ZWQ7XG5mdW5jdGlvbiB1bnN1cHBvcnRlZChvYmplY3Qpe1xuICByZXR1cm4gb2JqZWN0ICYmXG4gICAgdHlwZW9mIG9iamVjdCA9PSAnb2JqZWN0JyAmJlxuICAgIHR5cGVvZiBvYmplY3QubGVuZ3RoID09ICdudW1iZXInICYmXG4gICAgT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iamVjdCwgJ2NhbGxlZScpICYmXG4gICAgIU9iamVjdC5wcm90b3R5cGUucHJvcGVydHlJc0VudW1lcmFibGUuY2FsbChvYmplY3QsICdjYWxsZWUnKSB8fFxuICAgIGZhbHNlO1xufTtcbiIsImV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IHR5cGVvZiBPYmplY3Qua2V5cyA9PT0gJ2Z1bmN0aW9uJ1xuICA/IE9iamVjdC5rZXlzIDogc2hpbTtcblxuZXhwb3J0cy5zaGltID0gc2hpbTtcbmZ1bmN0aW9uIHNoaW0gKG9iaikge1xuICB2YXIga2V5cyA9IFtdO1xuICBmb3IgKHZhciBrZXkgaW4gb2JqKSBrZXlzLnB1c2goa2V5KTtcbiAgcmV0dXJuIGtleXM7XG59XG4iLCIvKipcbiAqIEluZGljYXRlcyB0aGF0IG5hdmlnYXRpb24gd2FzIGNhdXNlZCBieSBhIGNhbGwgdG8gaGlzdG9yeS5wdXNoLlxuICovXG4ndXNlIHN0cmljdCc7XG5cbmV4cG9ydHMuX19lc01vZHVsZSA9IHRydWU7XG52YXIgUFVTSCA9ICdQVVNIJztcblxuZXhwb3J0cy5QVVNIID0gUFVTSDtcbi8qKlxuICogSW5kaWNhdGVzIHRoYXQgbmF2aWdhdGlvbiB3YXMgY2F1c2VkIGJ5IGEgY2FsbCB0byBoaXN0b3J5LnJlcGxhY2UuXG4gKi9cbnZhciBSRVBMQUNFID0gJ1JFUExBQ0UnO1xuXG5leHBvcnRzLlJFUExBQ0UgPSBSRVBMQUNFO1xuLyoqXG4gKiBJbmRpY2F0ZXMgdGhhdCBuYXZpZ2F0aW9uIHdhcyBjYXVzZWQgYnkgc29tZSBvdGhlciBhY3Rpb24gc3VjaFxuICogYXMgdXNpbmcgYSBicm93c2VyJ3MgYmFjay9mb3J3YXJkIGJ1dHRvbnMgYW5kL29yIG1hbnVhbGx5IG1hbmlwdWxhdGluZ1xuICogdGhlIFVSTCBpbiBhIGJyb3dzZXIncyBsb2NhdGlvbiBiYXIuIFRoaXMgaXMgdGhlIGRlZmF1bHQuXG4gKlxuICogU2VlIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0FQSS9XaW5kb3dFdmVudEhhbmRsZXJzL29ucG9wc3RhdGVcbiAqIGZvciBtb3JlIGluZm9ybWF0aW9uLlxuICovXG52YXIgUE9QID0gJ1BPUCc7XG5cbmV4cG9ydHMuUE9QID0gUE9QO1xuZXhwb3J0c1snZGVmYXVsdCddID0ge1xuICBQVVNIOiBQVVNILFxuICBSRVBMQUNFOiBSRVBMQUNFLFxuICBQT1A6IFBPUFxufTsiLCJcInVzZSBzdHJpY3RcIjtcblxuZXhwb3J0cy5fX2VzTW9kdWxlID0gdHJ1ZTtcbnZhciBfc2xpY2UgPSBBcnJheS5wcm90b3R5cGUuc2xpY2U7XG5leHBvcnRzLmxvb3BBc3luYyA9IGxvb3BBc3luYztcblxuZnVuY3Rpb24gbG9vcEFzeW5jKHR1cm5zLCB3b3JrLCBjYWxsYmFjaykge1xuICB2YXIgY3VycmVudFR1cm4gPSAwLFxuICAgICAgaXNEb25lID0gZmFsc2U7XG4gIHZhciBzeW5jID0gZmFsc2UsXG4gICAgICBoYXNOZXh0ID0gZmFsc2UsXG4gICAgICBkb25lQXJncyA9IHVuZGVmaW5lZDtcblxuICBmdW5jdGlvbiBkb25lKCkge1xuICAgIGlzRG9uZSA9IHRydWU7XG4gICAgaWYgKHN5bmMpIHtcbiAgICAgIC8vIEl0ZXJhdGUgaW5zdGVhZCBvZiByZWN1cnNpbmcgaWYgcG9zc2libGUuXG4gICAgICBkb25lQXJncyA9IFtdLmNvbmNhdChfc2xpY2UuY2FsbChhcmd1bWVudHMpKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjYWxsYmFjay5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICB9XG5cbiAgZnVuY3Rpb24gbmV4dCgpIHtcbiAgICBpZiAoaXNEb25lKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaGFzTmV4dCA9IHRydWU7XG4gICAgaWYgKHN5bmMpIHtcbiAgICAgIC8vIEl0ZXJhdGUgaW5zdGVhZCBvZiByZWN1cnNpbmcgaWYgcG9zc2libGUuXG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgc3luYyA9IHRydWU7XG5cbiAgICB3aGlsZSAoIWlzRG9uZSAmJiBjdXJyZW50VHVybiA8IHR1cm5zICYmIGhhc05leHQpIHtcbiAgICAgIGhhc05leHQgPSBmYWxzZTtcbiAgICAgIHdvcmsuY2FsbCh0aGlzLCBjdXJyZW50VHVybisrLCBuZXh0LCBkb25lKTtcbiAgICB9XG5cbiAgICBzeW5jID0gZmFsc2U7XG5cbiAgICBpZiAoaXNEb25lKSB7XG4gICAgICAvLyBUaGlzIG1lYW5zIHRoZSBsb29wIGZpbmlzaGVkIHN5bmNocm9ub3VzbHkuXG4gICAgICBjYWxsYmFjay5hcHBseSh0aGlzLCBkb25lQXJncyk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKGN1cnJlbnRUdXJuID49IHR1cm5zICYmIGhhc05leHQpIHtcbiAgICAgIGlzRG9uZSA9IHRydWU7XG4gICAgICBjYWxsYmFjaygpO1xuICAgIH1cbiAgfVxuXG4gIG5leHQoKTtcbn0iLCIvKmVzbGludC1kaXNhYmxlIG5vLWVtcHR5ICovXG4ndXNlIHN0cmljdCc7XG5cbmV4cG9ydHMuX19lc01vZHVsZSA9IHRydWU7XG5leHBvcnRzLnNhdmVTdGF0ZSA9IHNhdmVTdGF0ZTtcbmV4cG9ydHMucmVhZFN0YXRlID0gcmVhZFN0YXRlO1xuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KG9iaikgeyByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyAnZGVmYXVsdCc6IG9iaiB9OyB9XG5cbnZhciBfd2FybmluZyA9IHJlcXVpcmUoJ3dhcm5pbmcnKTtcblxudmFyIF93YXJuaW5nMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX3dhcm5pbmcpO1xuXG52YXIgS2V5UHJlZml4ID0gJ0BASGlzdG9yeS8nO1xudmFyIFF1b3RhRXhjZWVkZWRFcnJvcnMgPSBbJ1F1b3RhRXhjZWVkZWRFcnJvcicsICdRVU9UQV9FWENFRURFRF9FUlInXTtcblxudmFyIFNlY3VyaXR5RXJyb3IgPSAnU2VjdXJpdHlFcnJvcic7XG5cbmZ1bmN0aW9uIGNyZWF0ZUtleShrZXkpIHtcbiAgcmV0dXJuIEtleVByZWZpeCArIGtleTtcbn1cblxuZnVuY3Rpb24gc2F2ZVN0YXRlKGtleSwgc3RhdGUpIHtcbiAgdHJ5IHtcbiAgICBpZiAoc3RhdGUgPT0gbnVsbCkge1xuICAgICAgd2luZG93LnNlc3Npb25TdG9yYWdlLnJlbW92ZUl0ZW0oY3JlYXRlS2V5KGtleSkpO1xuICAgIH0gZWxzZSB7XG4gICAgICB3aW5kb3cuc2Vzc2lvblN0b3JhZ2Uuc2V0SXRlbShjcmVhdGVLZXkoa2V5KSwgSlNPTi5zdHJpbmdpZnkoc3RhdGUpKTtcbiAgICB9XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgaWYgKGVycm9yLm5hbWUgPT09IFNlY3VyaXR5RXJyb3IpIHtcbiAgICAgIC8vIEJsb2NraW5nIGNvb2tpZXMgaW4gQ2hyb21lL0ZpcmVmb3gvU2FmYXJpIHRocm93cyBTZWN1cml0eUVycm9yIG9uIGFueVxuICAgICAgLy8gYXR0ZW1wdCB0byBhY2Nlc3Mgd2luZG93LnNlc3Npb25TdG9yYWdlLlxuICAgICAgcHJvY2Vzcy5lbnYuTk9ERV9FTlYgIT09ICdwcm9kdWN0aW9uJyA/IF93YXJuaW5nMlsnZGVmYXVsdCddKGZhbHNlLCAnW2hpc3RvcnldIFVuYWJsZSB0byBzYXZlIHN0YXRlOyBzZXNzaW9uU3RvcmFnZSBpcyBub3QgYXZhaWxhYmxlIGR1ZSB0byBzZWN1cml0eSBzZXR0aW5ncycpIDogdW5kZWZpbmVkO1xuXG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKFF1b3RhRXhjZWVkZWRFcnJvcnMuaW5kZXhPZihlcnJvci5uYW1lKSA+PSAwICYmIHdpbmRvdy5zZXNzaW9uU3RvcmFnZS5sZW5ndGggPT09IDApIHtcbiAgICAgIC8vIFNhZmFyaSBcInByaXZhdGUgbW9kZVwiIHRocm93cyBRdW90YUV4Y2VlZGVkRXJyb3IuXG4gICAgICBwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ3Byb2R1Y3Rpb24nID8gX3dhcm5pbmcyWydkZWZhdWx0J10oZmFsc2UsICdbaGlzdG9yeV0gVW5hYmxlIHRvIHNhdmUgc3RhdGU7IHNlc3Npb25TdG9yYWdlIGlzIG5vdCBhdmFpbGFibGUgaW4gU2FmYXJpIHByaXZhdGUgbW9kZScpIDogdW5kZWZpbmVkO1xuXG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhyb3cgZXJyb3I7XG4gIH1cbn1cblxuZnVuY3Rpb24gcmVhZFN0YXRlKGtleSkge1xuICB2YXIganNvbiA9IHVuZGVmaW5lZDtcbiAgdHJ5IHtcbiAgICBqc29uID0gd2luZG93LnNlc3Npb25TdG9yYWdlLmdldEl0ZW0oY3JlYXRlS2V5KGtleSkpO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGlmIChlcnJvci5uYW1lID09PSBTZWN1cml0eUVycm9yKSB7XG4gICAgICAvLyBCbG9ja2luZyBjb29raWVzIGluIENocm9tZS9GaXJlZm94L1NhZmFyaSB0aHJvd3MgU2VjdXJpdHlFcnJvciBvbiBhbnlcbiAgICAgIC8vIGF0dGVtcHQgdG8gYWNjZXNzIHdpbmRvdy5zZXNzaW9uU3RvcmFnZS5cbiAgICAgIHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAncHJvZHVjdGlvbicgPyBfd2FybmluZzJbJ2RlZmF1bHQnXShmYWxzZSwgJ1toaXN0b3J5XSBVbmFibGUgdG8gcmVhZCBzdGF0ZTsgc2Vzc2lvblN0b3JhZ2UgaXMgbm90IGF2YWlsYWJsZSBkdWUgdG8gc2VjdXJpdHkgc2V0dGluZ3MnKSA6IHVuZGVmaW5lZDtcblxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICB9XG5cbiAgaWYgKGpzb24pIHtcbiAgICB0cnkge1xuICAgICAgcmV0dXJuIEpTT04ucGFyc2UoanNvbik7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIC8vIElnbm9yZSBpbnZhbGlkIEpTT04uXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG51bGw7XG59IiwiJ3VzZSBzdHJpY3QnO1xuXG5leHBvcnRzLl9fZXNNb2R1bGUgPSB0cnVlO1xuZXhwb3J0cy5hZGRFdmVudExpc3RlbmVyID0gYWRkRXZlbnRMaXN0ZW5lcjtcbmV4cG9ydHMucmVtb3ZlRXZlbnRMaXN0ZW5lciA9IHJlbW92ZUV2ZW50TGlzdGVuZXI7XG5leHBvcnRzLmdldEhhc2hQYXRoID0gZ2V0SGFzaFBhdGg7XG5leHBvcnRzLnJlcGxhY2VIYXNoUGF0aCA9IHJlcGxhY2VIYXNoUGF0aDtcbmV4cG9ydHMuZ2V0V2luZG93UGF0aCA9IGdldFdpbmRvd1BhdGg7XG5leHBvcnRzLmdvID0gZ287XG5leHBvcnRzLmdldFVzZXJDb25maXJtYXRpb24gPSBnZXRVc2VyQ29uZmlybWF0aW9uO1xuZXhwb3J0cy5zdXBwb3J0c0hpc3RvcnkgPSBzdXBwb3J0c0hpc3Rvcnk7XG5leHBvcnRzLnN1cHBvcnRzR29XaXRob3V0UmVsb2FkVXNpbmdIYXNoID0gc3VwcG9ydHNHb1dpdGhvdXRSZWxvYWRVc2luZ0hhc2g7XG5cbmZ1bmN0aW9uIGFkZEV2ZW50TGlzdGVuZXIobm9kZSwgZXZlbnQsIGxpc3RlbmVyKSB7XG4gIGlmIChub2RlLmFkZEV2ZW50TGlzdGVuZXIpIHtcbiAgICBub2RlLmFkZEV2ZW50TGlzdGVuZXIoZXZlbnQsIGxpc3RlbmVyLCBmYWxzZSk7XG4gIH0gZWxzZSB7XG4gICAgbm9kZS5hdHRhY2hFdmVudCgnb24nICsgZXZlbnQsIGxpc3RlbmVyKTtcbiAgfVxufVxuXG5mdW5jdGlvbiByZW1vdmVFdmVudExpc3RlbmVyKG5vZGUsIGV2ZW50LCBsaXN0ZW5lcikge1xuICBpZiAobm9kZS5yZW1vdmVFdmVudExpc3RlbmVyKSB7XG4gICAgbm9kZS5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50LCBsaXN0ZW5lciwgZmFsc2UpO1xuICB9IGVsc2Uge1xuICAgIG5vZGUuZGV0YWNoRXZlbnQoJ29uJyArIGV2ZW50LCBsaXN0ZW5lcik7XG4gIH1cbn1cblxuZnVuY3Rpb24gZ2V0SGFzaFBhdGgoKSB7XG4gIC8vIFdlIGNhbid0IHVzZSB3aW5kb3cubG9jYXRpb24uaGFzaCBoZXJlIGJlY2F1c2UgaXQncyBub3RcbiAgLy8gY29uc2lzdGVudCBhY3Jvc3MgYnJvd3NlcnMgLSBGaXJlZm94IHdpbGwgcHJlLWRlY29kZSBpdCFcbiAgcmV0dXJuIHdpbmRvdy5sb2NhdGlvbi5ocmVmLnNwbGl0KCcjJylbMV0gfHwgJyc7XG59XG5cbmZ1bmN0aW9uIHJlcGxhY2VIYXNoUGF0aChwYXRoKSB7XG4gIHdpbmRvdy5sb2NhdGlvbi5yZXBsYWNlKHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZSArIHdpbmRvdy5sb2NhdGlvbi5zZWFyY2ggKyAnIycgKyBwYXRoKTtcbn1cblxuZnVuY3Rpb24gZ2V0V2luZG93UGF0aCgpIHtcbiAgcmV0dXJuIHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZSArIHdpbmRvdy5sb2NhdGlvbi5zZWFyY2ggKyB3aW5kb3cubG9jYXRpb24uaGFzaDtcbn1cblxuZnVuY3Rpb24gZ28obikge1xuICBpZiAobikgd2luZG93Lmhpc3RvcnkuZ28obik7XG59XG5cbmZ1bmN0aW9uIGdldFVzZXJDb25maXJtYXRpb24obWVzc2FnZSwgY2FsbGJhY2spIHtcbiAgY2FsbGJhY2sod2luZG93LmNvbmZpcm0obWVzc2FnZSkpO1xufVxuXG4vKipcbiAqIFJldHVybnMgdHJ1ZSBpZiB0aGUgSFRNTDUgaGlzdG9yeSBBUEkgaXMgc3VwcG9ydGVkLiBUYWtlbiBmcm9tIE1vZGVybml6ci5cbiAqXG4gKiBodHRwczovL2dpdGh1Yi5jb20vTW9kZXJuaXpyL01vZGVybml6ci9ibG9iL21hc3Rlci9MSUNFTlNFXG4gKiBodHRwczovL2dpdGh1Yi5jb20vTW9kZXJuaXpyL01vZGVybml6ci9ibG9iL21hc3Rlci9mZWF0dXJlLWRldGVjdHMvaGlzdG9yeS5qc1xuICogY2hhbmdlZCB0byBhdm9pZCBmYWxzZSBuZWdhdGl2ZXMgZm9yIFdpbmRvd3MgUGhvbmVzOiBodHRwczovL2dpdGh1Yi5jb20vcmFja3QvcmVhY3Qtcm91dGVyL2lzc3Vlcy81ODZcbiAqL1xuXG5mdW5jdGlvbiBzdXBwb3J0c0hpc3RvcnkoKSB7XG4gIHZhciB1YSA9IG5hdmlnYXRvci51c2VyQWdlbnQ7XG4gIGlmICgodWEuaW5kZXhPZignQW5kcm9pZCAyLicpICE9PSAtMSB8fCB1YS5pbmRleE9mKCdBbmRyb2lkIDQuMCcpICE9PSAtMSkgJiYgdWEuaW5kZXhPZignTW9iaWxlIFNhZmFyaScpICE9PSAtMSAmJiB1YS5pbmRleE9mKCdDaHJvbWUnKSA9PT0gLTEgJiYgdWEuaW5kZXhPZignV2luZG93cyBQaG9uZScpID09PSAtMSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICByZXR1cm4gd2luZG93Lmhpc3RvcnkgJiYgJ3B1c2hTdGF0ZScgaW4gd2luZG93Lmhpc3Rvcnk7XG59XG5cbi8qKlxuICogUmV0dXJucyBmYWxzZSBpZiB1c2luZyBnbyhuKSB3aXRoIGhhc2ggaGlzdG9yeSBjYXVzZXMgYSBmdWxsIHBhZ2UgcmVsb2FkLlxuICovXG5cbmZ1bmN0aW9uIHN1cHBvcnRzR29XaXRob3V0UmVsb2FkVXNpbmdIYXNoKCkge1xuICB2YXIgdWEgPSBuYXZpZ2F0b3IudXNlckFnZW50O1xuICByZXR1cm4gdWEuaW5kZXhPZignRmlyZWZveCcpID09PSAtMTtcbn0iLCIndXNlIHN0cmljdCc7XG5cbmV4cG9ydHMuX19lc01vZHVsZSA9IHRydWU7XG52YXIgY2FuVXNlRE9NID0gISEodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgJiYgd2luZG93LmRvY3VtZW50ICYmIHdpbmRvdy5kb2N1bWVudC5jcmVhdGVFbGVtZW50KTtcbmV4cG9ydHMuY2FuVXNlRE9NID0gY2FuVXNlRE9NOyIsIid1c2Ugc3RyaWN0JztcblxuZXhwb3J0cy5fX2VzTW9kdWxlID0gdHJ1ZTtcbmV4cG9ydHMuZXh0cmFjdFBhdGggPSBleHRyYWN0UGF0aDtcbmV4cG9ydHMucGFyc2VQYXRoID0gcGFyc2VQYXRoO1xuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KG9iaikgeyByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyAnZGVmYXVsdCc6IG9iaiB9OyB9XG5cbnZhciBfd2FybmluZyA9IHJlcXVpcmUoJ3dhcm5pbmcnKTtcblxudmFyIF93YXJuaW5nMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX3dhcm5pbmcpO1xuXG5mdW5jdGlvbiBleHRyYWN0UGF0aChzdHJpbmcpIHtcbiAgdmFyIG1hdGNoID0gc3RyaW5nLm1hdGNoKC9eaHR0cHM/OlxcL1xcL1teXFwvXSovKTtcblxuICBpZiAobWF0Y2ggPT0gbnVsbCkgcmV0dXJuIHN0cmluZztcblxuICByZXR1cm4gc3RyaW5nLnN1YnN0cmluZyhtYXRjaFswXS5sZW5ndGgpO1xufVxuXG5mdW5jdGlvbiBwYXJzZVBhdGgocGF0aCkge1xuICB2YXIgcGF0aG5hbWUgPSBleHRyYWN0UGF0aChwYXRoKTtcbiAgdmFyIHNlYXJjaCA9ICcnO1xuICB2YXIgaGFzaCA9ICcnO1xuXG4gIHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAncHJvZHVjdGlvbicgPyBfd2FybmluZzJbJ2RlZmF1bHQnXShwYXRoID09PSBwYXRobmFtZSwgJ0EgcGF0aCBtdXN0IGJlIHBhdGhuYW1lICsgc2VhcmNoICsgaGFzaCBvbmx5LCBub3QgYSBmdWxseSBxdWFsaWZpZWQgVVJMIGxpa2UgXCIlc1wiJywgcGF0aCkgOiB1bmRlZmluZWQ7XG5cbiAgdmFyIGhhc2hJbmRleCA9IHBhdGhuYW1lLmluZGV4T2YoJyMnKTtcbiAgaWYgKGhhc2hJbmRleCAhPT0gLTEpIHtcbiAgICBoYXNoID0gcGF0aG5hbWUuc3Vic3RyaW5nKGhhc2hJbmRleCk7XG4gICAgcGF0aG5hbWUgPSBwYXRobmFtZS5zdWJzdHJpbmcoMCwgaGFzaEluZGV4KTtcbiAgfVxuXG4gIHZhciBzZWFyY2hJbmRleCA9IHBhdGhuYW1lLmluZGV4T2YoJz8nKTtcbiAgaWYgKHNlYXJjaEluZGV4ICE9PSAtMSkge1xuICAgIHNlYXJjaCA9IHBhdGhuYW1lLnN1YnN0cmluZyhzZWFyY2hJbmRleCk7XG4gICAgcGF0aG5hbWUgPSBwYXRobmFtZS5zdWJzdHJpbmcoMCwgc2VhcmNoSW5kZXgpO1xuICB9XG5cbiAgaWYgKHBhdGhuYW1lID09PSAnJykgcGF0aG5hbWUgPSAnLyc7XG5cbiAgcmV0dXJuIHtcbiAgICBwYXRobmFtZTogcGF0aG5hbWUsXG4gICAgc2VhcmNoOiBzZWFyY2gsXG4gICAgaGFzaDogaGFzaFxuICB9O1xufSIsIid1c2Ugc3RyaWN0JztcblxuZXhwb3J0cy5fX2VzTW9kdWxlID0gdHJ1ZTtcblxudmFyIF9leHRlbmRzID0gT2JqZWN0LmFzc2lnbiB8fCBmdW5jdGlvbiAodGFyZ2V0KSB7IGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7IHZhciBzb3VyY2UgPSBhcmd1bWVudHNbaV07IGZvciAodmFyIGtleSBpbiBzb3VyY2UpIHsgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChzb3VyY2UsIGtleSkpIHsgdGFyZ2V0W2tleV0gPSBzb3VyY2Vba2V5XTsgfSB9IH0gcmV0dXJuIHRhcmdldDsgfTtcblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgJ2RlZmF1bHQnOiBvYmogfTsgfVxuXG52YXIgX2ludmFyaWFudCA9IHJlcXVpcmUoJ2ludmFyaWFudCcpO1xuXG52YXIgX2ludmFyaWFudDIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9pbnZhcmlhbnQpO1xuXG52YXIgX0FjdGlvbnMgPSByZXF1aXJlKCcuL0FjdGlvbnMnKTtcblxudmFyIF9QYXRoVXRpbHMgPSByZXF1aXJlKCcuL1BhdGhVdGlscycpO1xuXG52YXIgX0V4ZWN1dGlvbkVudmlyb25tZW50ID0gcmVxdWlyZSgnLi9FeGVjdXRpb25FbnZpcm9ubWVudCcpO1xuXG52YXIgX0RPTVV0aWxzID0gcmVxdWlyZSgnLi9ET01VdGlscycpO1xuXG52YXIgX0RPTVN0YXRlU3RvcmFnZSA9IHJlcXVpcmUoJy4vRE9NU3RhdGVTdG9yYWdlJyk7XG5cbnZhciBfY3JlYXRlRE9NSGlzdG9yeSA9IHJlcXVpcmUoJy4vY3JlYXRlRE9NSGlzdG9yeScpO1xuXG52YXIgX2NyZWF0ZURPTUhpc3RvcnkyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfY3JlYXRlRE9NSGlzdG9yeSk7XG5cbi8qKlxuICogQ3JlYXRlcyBhbmQgcmV0dXJucyBhIGhpc3Rvcnkgb2JqZWN0IHRoYXQgdXNlcyBIVE1MNSdzIGhpc3RvcnkgQVBJXG4gKiAocHVzaFN0YXRlLCByZXBsYWNlU3RhdGUsIGFuZCB0aGUgcG9wc3RhdGUgZXZlbnQpIHRvIG1hbmFnZSBoaXN0b3J5LlxuICogVGhpcyBpcyB0aGUgcmVjb21tZW5kZWQgbWV0aG9kIG9mIG1hbmFnaW5nIGhpc3RvcnkgaW4gYnJvd3NlcnMgYmVjYXVzZVxuICogaXQgcHJvdmlkZXMgdGhlIGNsZWFuZXN0IFVSTHMuXG4gKlxuICogTm90ZTogSW4gYnJvd3NlcnMgdGhhdCBkbyBub3Qgc3VwcG9ydCB0aGUgSFRNTDUgaGlzdG9yeSBBUEkgZnVsbFxuICogcGFnZSByZWxvYWRzIHdpbGwgYmUgdXNlZCB0byBwcmVzZXJ2ZSBVUkxzLlxuICovXG5mdW5jdGlvbiBjcmVhdGVCcm93c2VySGlzdG9yeSgpIHtcbiAgdmFyIG9wdGlvbnMgPSBhcmd1bWVudHMubGVuZ3RoIDw9IDAgfHwgYXJndW1lbnRzWzBdID09PSB1bmRlZmluZWQgPyB7fSA6IGFyZ3VtZW50c1swXTtcblxuICAhX0V4ZWN1dGlvbkVudmlyb25tZW50LmNhblVzZURPTSA/IHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAncHJvZHVjdGlvbicgPyBfaW52YXJpYW50MlsnZGVmYXVsdCddKGZhbHNlLCAnQnJvd3NlciBoaXN0b3J5IG5lZWRzIGEgRE9NJykgOiBfaW52YXJpYW50MlsnZGVmYXVsdCddKGZhbHNlKSA6IHVuZGVmaW5lZDtcblxuICB2YXIgZm9yY2VSZWZyZXNoID0gb3B0aW9ucy5mb3JjZVJlZnJlc2g7XG5cbiAgdmFyIGlzU3VwcG9ydGVkID0gX0RPTVV0aWxzLnN1cHBvcnRzSGlzdG9yeSgpO1xuICB2YXIgdXNlUmVmcmVzaCA9ICFpc1N1cHBvcnRlZCB8fCBmb3JjZVJlZnJlc2g7XG5cbiAgZnVuY3Rpb24gZ2V0Q3VycmVudExvY2F0aW9uKGhpc3RvcnlTdGF0ZSkge1xuICAgIGhpc3RvcnlTdGF0ZSA9IGhpc3RvcnlTdGF0ZSB8fCB3aW5kb3cuaGlzdG9yeS5zdGF0ZSB8fCB7fTtcblxuICAgIHZhciBwYXRoID0gX0RPTVV0aWxzLmdldFdpbmRvd1BhdGgoKTtcbiAgICB2YXIgX2hpc3RvcnlTdGF0ZSA9IGhpc3RvcnlTdGF0ZTtcbiAgICB2YXIga2V5ID0gX2hpc3RvcnlTdGF0ZS5rZXk7XG5cbiAgICB2YXIgc3RhdGUgPSB1bmRlZmluZWQ7XG4gICAgaWYgKGtleSkge1xuICAgICAgc3RhdGUgPSBfRE9NU3RhdGVTdG9yYWdlLnJlYWRTdGF0ZShrZXkpO1xuICAgIH0gZWxzZSB7XG4gICAgICBzdGF0ZSA9IG51bGw7XG4gICAgICBrZXkgPSBoaXN0b3J5LmNyZWF0ZUtleSgpO1xuXG4gICAgICBpZiAoaXNTdXBwb3J0ZWQpIHdpbmRvdy5oaXN0b3J5LnJlcGxhY2VTdGF0ZShfZXh0ZW5kcyh7fSwgaGlzdG9yeVN0YXRlLCB7IGtleToga2V5IH0pLCBudWxsKTtcbiAgICB9XG5cbiAgICB2YXIgbG9jYXRpb24gPSBfUGF0aFV0aWxzLnBhcnNlUGF0aChwYXRoKTtcblxuICAgIHJldHVybiBoaXN0b3J5LmNyZWF0ZUxvY2F0aW9uKF9leHRlbmRzKHt9LCBsb2NhdGlvbiwgeyBzdGF0ZTogc3RhdGUgfSksIHVuZGVmaW5lZCwga2V5KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHN0YXJ0UG9wU3RhdGVMaXN0ZW5lcihfcmVmKSB7XG4gICAgdmFyIHRyYW5zaXRpb25UbyA9IF9yZWYudHJhbnNpdGlvblRvO1xuXG4gICAgZnVuY3Rpb24gcG9wU3RhdGVMaXN0ZW5lcihldmVudCkge1xuICAgICAgaWYgKGV2ZW50LnN0YXRlID09PSB1bmRlZmluZWQpIHJldHVybjsgLy8gSWdub3JlIGV4dHJhbmVvdXMgcG9wc3RhdGUgZXZlbnRzIGluIFdlYktpdC5cblxuICAgICAgdHJhbnNpdGlvblRvKGdldEN1cnJlbnRMb2NhdGlvbihldmVudC5zdGF0ZSkpO1xuICAgIH1cblxuICAgIF9ET01VdGlscy5hZGRFdmVudExpc3RlbmVyKHdpbmRvdywgJ3BvcHN0YXRlJywgcG9wU3RhdGVMaXN0ZW5lcik7XG5cbiAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgX0RPTVV0aWxzLnJlbW92ZUV2ZW50TGlzdGVuZXIod2luZG93LCAncG9wc3RhdGUnLCBwb3BTdGF0ZUxpc3RlbmVyKTtcbiAgICB9O1xuICB9XG5cbiAgZnVuY3Rpb24gZmluaXNoVHJhbnNpdGlvbihsb2NhdGlvbikge1xuICAgIHZhciBiYXNlbmFtZSA9IGxvY2F0aW9uLmJhc2VuYW1lO1xuICAgIHZhciBwYXRobmFtZSA9IGxvY2F0aW9uLnBhdGhuYW1lO1xuICAgIHZhciBzZWFyY2ggPSBsb2NhdGlvbi5zZWFyY2g7XG4gICAgdmFyIGhhc2ggPSBsb2NhdGlvbi5oYXNoO1xuICAgIHZhciBzdGF0ZSA9IGxvY2F0aW9uLnN0YXRlO1xuICAgIHZhciBhY3Rpb24gPSBsb2NhdGlvbi5hY3Rpb247XG4gICAgdmFyIGtleSA9IGxvY2F0aW9uLmtleTtcblxuICAgIGlmIChhY3Rpb24gPT09IF9BY3Rpb25zLlBPUCkgcmV0dXJuOyAvLyBOb3RoaW5nIHRvIGRvLlxuXG4gICAgX0RPTVN0YXRlU3RvcmFnZS5zYXZlU3RhdGUoa2V5LCBzdGF0ZSk7XG5cbiAgICB2YXIgcGF0aCA9IChiYXNlbmFtZSB8fCAnJykgKyBwYXRobmFtZSArIHNlYXJjaCArIGhhc2g7XG4gICAgdmFyIGhpc3RvcnlTdGF0ZSA9IHtcbiAgICAgIGtleToga2V5XG4gICAgfTtcblxuICAgIGlmIChhY3Rpb24gPT09IF9BY3Rpb25zLlBVU0gpIHtcbiAgICAgIGlmICh1c2VSZWZyZXNoKSB7XG4gICAgICAgIHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gcGF0aDtcbiAgICAgICAgcmV0dXJuIGZhbHNlOyAvLyBQcmV2ZW50IGxvY2F0aW9uIHVwZGF0ZS5cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgd2luZG93Lmhpc3RvcnkucHVzaFN0YXRlKGhpc3RvcnlTdGF0ZSwgbnVsbCwgcGF0aCk7XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgLy8gUkVQTEFDRVxuICAgICAgaWYgKHVzZVJlZnJlc2gpIHtcbiAgICAgICAgd2luZG93LmxvY2F0aW9uLnJlcGxhY2UocGF0aCk7XG4gICAgICAgIHJldHVybiBmYWxzZTsgLy8gUHJldmVudCBsb2NhdGlvbiB1cGRhdGUuXG4gICAgICB9IGVsc2Uge1xuICAgICAgICAgIHdpbmRvdy5oaXN0b3J5LnJlcGxhY2VTdGF0ZShoaXN0b3J5U3RhdGUsIG51bGwsIHBhdGgpO1xuICAgICAgICB9XG4gICAgfVxuICB9XG5cbiAgdmFyIGhpc3RvcnkgPSBfY3JlYXRlRE9NSGlzdG9yeTJbJ2RlZmF1bHQnXShfZXh0ZW5kcyh7fSwgb3B0aW9ucywge1xuICAgIGdldEN1cnJlbnRMb2NhdGlvbjogZ2V0Q3VycmVudExvY2F0aW9uLFxuICAgIGZpbmlzaFRyYW5zaXRpb246IGZpbmlzaFRyYW5zaXRpb24sXG4gICAgc2F2ZVN0YXRlOiBfRE9NU3RhdGVTdG9yYWdlLnNhdmVTdGF0ZVxuICB9KSk7XG5cbiAgdmFyIGxpc3RlbmVyQ291bnQgPSAwLFxuICAgICAgc3RvcFBvcFN0YXRlTGlzdGVuZXIgPSB1bmRlZmluZWQ7XG5cbiAgZnVuY3Rpb24gbGlzdGVuQmVmb3JlKGxpc3RlbmVyKSB7XG4gICAgaWYgKCsrbGlzdGVuZXJDb3VudCA9PT0gMSkgc3RvcFBvcFN0YXRlTGlzdGVuZXIgPSBzdGFydFBvcFN0YXRlTGlzdGVuZXIoaGlzdG9yeSk7XG5cbiAgICB2YXIgdW5saXN0ZW4gPSBoaXN0b3J5Lmxpc3RlbkJlZm9yZShsaXN0ZW5lcik7XG5cbiAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgdW5saXN0ZW4oKTtcblxuICAgICAgaWYgKC0tbGlzdGVuZXJDb3VudCA9PT0gMCkgc3RvcFBvcFN0YXRlTGlzdGVuZXIoKTtcbiAgICB9O1xuICB9XG5cbiAgZnVuY3Rpb24gbGlzdGVuKGxpc3RlbmVyKSB7XG4gICAgaWYgKCsrbGlzdGVuZXJDb3VudCA9PT0gMSkgc3RvcFBvcFN0YXRlTGlzdGVuZXIgPSBzdGFydFBvcFN0YXRlTGlzdGVuZXIoaGlzdG9yeSk7XG5cbiAgICB2YXIgdW5saXN0ZW4gPSBoaXN0b3J5Lmxpc3RlbihsaXN0ZW5lcik7XG5cbiAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgdW5saXN0ZW4oKTtcblxuICAgICAgaWYgKC0tbGlzdGVuZXJDb3VudCA9PT0gMCkgc3RvcFBvcFN0YXRlTGlzdGVuZXIoKTtcbiAgICB9O1xuICB9XG5cbiAgLy8gZGVwcmVjYXRlZFxuICBmdW5jdGlvbiByZWdpc3RlclRyYW5zaXRpb25Ib29rKGhvb2spIHtcbiAgICBpZiAoKytsaXN0ZW5lckNvdW50ID09PSAxKSBzdG9wUG9wU3RhdGVMaXN0ZW5lciA9IHN0YXJ0UG9wU3RhdGVMaXN0ZW5lcihoaXN0b3J5KTtcblxuICAgIGhpc3RvcnkucmVnaXN0ZXJUcmFuc2l0aW9uSG9vayhob29rKTtcbiAgfVxuXG4gIC8vIGRlcHJlY2F0ZWRcbiAgZnVuY3Rpb24gdW5yZWdpc3RlclRyYW5zaXRpb25Ib29rKGhvb2spIHtcbiAgICBoaXN0b3J5LnVucmVnaXN0ZXJUcmFuc2l0aW9uSG9vayhob29rKTtcblxuICAgIGlmICgtLWxpc3RlbmVyQ291bnQgPT09IDApIHN0b3BQb3BTdGF0ZUxpc3RlbmVyKCk7XG4gIH1cblxuICByZXR1cm4gX2V4dGVuZHMoe30sIGhpc3RvcnksIHtcbiAgICBsaXN0ZW5CZWZvcmU6IGxpc3RlbkJlZm9yZSxcbiAgICBsaXN0ZW46IGxpc3RlbixcbiAgICByZWdpc3RlclRyYW5zaXRpb25Ib29rOiByZWdpc3RlclRyYW5zaXRpb25Ib29rLFxuICAgIHVucmVnaXN0ZXJUcmFuc2l0aW9uSG9vazogdW5yZWdpc3RlclRyYW5zaXRpb25Ib29rXG4gIH0pO1xufVxuXG5leHBvcnRzWydkZWZhdWx0J10gPSBjcmVhdGVCcm93c2VySGlzdG9yeTtcbm1vZHVsZS5leHBvcnRzID0gZXhwb3J0c1snZGVmYXVsdCddOyIsIid1c2Ugc3RyaWN0JztcblxuZXhwb3J0cy5fX2VzTW9kdWxlID0gdHJ1ZTtcblxudmFyIF9leHRlbmRzID0gT2JqZWN0LmFzc2lnbiB8fCBmdW5jdGlvbiAodGFyZ2V0KSB7IGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7IHZhciBzb3VyY2UgPSBhcmd1bWVudHNbaV07IGZvciAodmFyIGtleSBpbiBzb3VyY2UpIHsgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChzb3VyY2UsIGtleSkpIHsgdGFyZ2V0W2tleV0gPSBzb3VyY2Vba2V5XTsgfSB9IH0gcmV0dXJuIHRhcmdldDsgfTtcblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgJ2RlZmF1bHQnOiBvYmogfTsgfVxuXG52YXIgX2ludmFyaWFudCA9IHJlcXVpcmUoJ2ludmFyaWFudCcpO1xuXG52YXIgX2ludmFyaWFudDIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9pbnZhcmlhbnQpO1xuXG52YXIgX0V4ZWN1dGlvbkVudmlyb25tZW50ID0gcmVxdWlyZSgnLi9FeGVjdXRpb25FbnZpcm9ubWVudCcpO1xuXG52YXIgX0RPTVV0aWxzID0gcmVxdWlyZSgnLi9ET01VdGlscycpO1xuXG52YXIgX2NyZWF0ZUhpc3RvcnkgPSByZXF1aXJlKCcuL2NyZWF0ZUhpc3RvcnknKTtcblxudmFyIF9jcmVhdGVIaXN0b3J5MiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX2NyZWF0ZUhpc3RvcnkpO1xuXG5mdW5jdGlvbiBjcmVhdGVET01IaXN0b3J5KG9wdGlvbnMpIHtcbiAgdmFyIGhpc3RvcnkgPSBfY3JlYXRlSGlzdG9yeTJbJ2RlZmF1bHQnXShfZXh0ZW5kcyh7XG4gICAgZ2V0VXNlckNvbmZpcm1hdGlvbjogX0RPTVV0aWxzLmdldFVzZXJDb25maXJtYXRpb25cbiAgfSwgb3B0aW9ucywge1xuICAgIGdvOiBfRE9NVXRpbHMuZ29cbiAgfSkpO1xuXG4gIGZ1bmN0aW9uIGxpc3RlbihsaXN0ZW5lcikge1xuICAgICFfRXhlY3V0aW9uRW52aXJvbm1lbnQuY2FuVXNlRE9NID8gcHJvY2Vzcy5lbnYuTk9ERV9FTlYgIT09ICdwcm9kdWN0aW9uJyA/IF9pbnZhcmlhbnQyWydkZWZhdWx0J10oZmFsc2UsICdET00gaGlzdG9yeSBuZWVkcyBhIERPTScpIDogX2ludmFyaWFudDJbJ2RlZmF1bHQnXShmYWxzZSkgOiB1bmRlZmluZWQ7XG5cbiAgICByZXR1cm4gaGlzdG9yeS5saXN0ZW4obGlzdGVuZXIpO1xuICB9XG5cbiAgcmV0dXJuIF9leHRlbmRzKHt9LCBoaXN0b3J5LCB7XG4gICAgbGlzdGVuOiBsaXN0ZW5cbiAgfSk7XG59XG5cbmV4cG9ydHNbJ2RlZmF1bHQnXSA9IGNyZWF0ZURPTUhpc3Rvcnk7XG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHNbJ2RlZmF1bHQnXTsiLCIndXNlIHN0cmljdCc7XG5cbmV4cG9ydHMuX19lc01vZHVsZSA9IHRydWU7XG5cbnZhciBfZXh0ZW5kcyA9IE9iamVjdC5hc3NpZ24gfHwgZnVuY3Rpb24gKHRhcmdldCkgeyBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykgeyB2YXIgc291cmNlID0gYXJndW1lbnRzW2ldOyBmb3IgKHZhciBrZXkgaW4gc291cmNlKSB7IGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoc291cmNlLCBrZXkpKSB7IHRhcmdldFtrZXldID0gc291cmNlW2tleV07IH0gfSB9IHJldHVybiB0YXJnZXQ7IH07XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZURlZmF1bHQob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7ICdkZWZhdWx0Jzogb2JqIH07IH1cblxudmFyIF93YXJuaW5nID0gcmVxdWlyZSgnd2FybmluZycpO1xuXG52YXIgX3dhcm5pbmcyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfd2FybmluZyk7XG5cbnZhciBfaW52YXJpYW50ID0gcmVxdWlyZSgnaW52YXJpYW50Jyk7XG5cbnZhciBfaW52YXJpYW50MiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX2ludmFyaWFudCk7XG5cbnZhciBfQWN0aW9ucyA9IHJlcXVpcmUoJy4vQWN0aW9ucycpO1xuXG52YXIgX1BhdGhVdGlscyA9IHJlcXVpcmUoJy4vUGF0aFV0aWxzJyk7XG5cbnZhciBfRXhlY3V0aW9uRW52aXJvbm1lbnQgPSByZXF1aXJlKCcuL0V4ZWN1dGlvbkVudmlyb25tZW50Jyk7XG5cbnZhciBfRE9NVXRpbHMgPSByZXF1aXJlKCcuL0RPTVV0aWxzJyk7XG5cbnZhciBfRE9NU3RhdGVTdG9yYWdlID0gcmVxdWlyZSgnLi9ET01TdGF0ZVN0b3JhZ2UnKTtcblxudmFyIF9jcmVhdGVET01IaXN0b3J5ID0gcmVxdWlyZSgnLi9jcmVhdGVET01IaXN0b3J5Jyk7XG5cbnZhciBfY3JlYXRlRE9NSGlzdG9yeTIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9jcmVhdGVET01IaXN0b3J5KTtcblxuZnVuY3Rpb24gaXNBYnNvbHV0ZVBhdGgocGF0aCkge1xuICByZXR1cm4gdHlwZW9mIHBhdGggPT09ICdzdHJpbmcnICYmIHBhdGguY2hhckF0KDApID09PSAnLyc7XG59XG5cbmZ1bmN0aW9uIGVuc3VyZVNsYXNoKCkge1xuICB2YXIgcGF0aCA9IF9ET01VdGlscy5nZXRIYXNoUGF0aCgpO1xuXG4gIGlmIChpc0Fic29sdXRlUGF0aChwYXRoKSkgcmV0dXJuIHRydWU7XG5cbiAgX0RPTVV0aWxzLnJlcGxhY2VIYXNoUGF0aCgnLycgKyBwYXRoKTtcblxuICByZXR1cm4gZmFsc2U7XG59XG5cbmZ1bmN0aW9uIGFkZFF1ZXJ5U3RyaW5nVmFsdWVUb1BhdGgocGF0aCwga2V5LCB2YWx1ZSkge1xuICByZXR1cm4gcGF0aCArIChwYXRoLmluZGV4T2YoJz8nKSA9PT0gLTEgPyAnPycgOiAnJicpICsgKGtleSArICc9JyArIHZhbHVlKTtcbn1cblxuZnVuY3Rpb24gc3RyaXBRdWVyeVN0cmluZ1ZhbHVlRnJvbVBhdGgocGF0aCwga2V5KSB7XG4gIHJldHVybiBwYXRoLnJlcGxhY2UobmV3IFJlZ0V4cCgnWz8mXT8nICsga2V5ICsgJz1bYS16QS1aMC05XSsnKSwgJycpO1xufVxuXG5mdW5jdGlvbiBnZXRRdWVyeVN0cmluZ1ZhbHVlRnJvbVBhdGgocGF0aCwga2V5KSB7XG4gIHZhciBtYXRjaCA9IHBhdGgubWF0Y2gobmV3IFJlZ0V4cCgnXFxcXD8uKj9cXFxcYicgKyBrZXkgKyAnPSguKz8pXFxcXGInKSk7XG4gIHJldHVybiBtYXRjaCAmJiBtYXRjaFsxXTtcbn1cblxudmFyIERlZmF1bHRRdWVyeUtleSA9ICdfayc7XG5cbmZ1bmN0aW9uIGNyZWF0ZUhhc2hIaXN0b3J5KCkge1xuICB2YXIgb3B0aW9ucyA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMCB8fCBhcmd1bWVudHNbMF0gPT09IHVuZGVmaW5lZCA/IHt9IDogYXJndW1lbnRzWzBdO1xuXG4gICFfRXhlY3V0aW9uRW52aXJvbm1lbnQuY2FuVXNlRE9NID8gcHJvY2Vzcy5lbnYuTk9ERV9FTlYgIT09ICdwcm9kdWN0aW9uJyA/IF9pbnZhcmlhbnQyWydkZWZhdWx0J10oZmFsc2UsICdIYXNoIGhpc3RvcnkgbmVlZHMgYSBET00nKSA6IF9pbnZhcmlhbnQyWydkZWZhdWx0J10oZmFsc2UpIDogdW5kZWZpbmVkO1xuXG4gIHZhciBxdWVyeUtleSA9IG9wdGlvbnMucXVlcnlLZXk7XG5cbiAgaWYgKHF1ZXJ5S2V5ID09PSB1bmRlZmluZWQgfHwgISFxdWVyeUtleSkgcXVlcnlLZXkgPSB0eXBlb2YgcXVlcnlLZXkgPT09ICdzdHJpbmcnID8gcXVlcnlLZXkgOiBEZWZhdWx0UXVlcnlLZXk7XG5cbiAgZnVuY3Rpb24gZ2V0Q3VycmVudExvY2F0aW9uKCkge1xuICAgIHZhciBwYXRoID0gX0RPTVV0aWxzLmdldEhhc2hQYXRoKCk7XG5cbiAgICB2YXIga2V5ID0gdW5kZWZpbmVkLFxuICAgICAgICBzdGF0ZSA9IHVuZGVmaW5lZDtcbiAgICBpZiAocXVlcnlLZXkpIHtcbiAgICAgIGtleSA9IGdldFF1ZXJ5U3RyaW5nVmFsdWVGcm9tUGF0aChwYXRoLCBxdWVyeUtleSk7XG4gICAgICBwYXRoID0gc3RyaXBRdWVyeVN0cmluZ1ZhbHVlRnJvbVBhdGgocGF0aCwgcXVlcnlLZXkpO1xuXG4gICAgICBpZiAoa2V5KSB7XG4gICAgICAgIHN0YXRlID0gX0RPTVN0YXRlU3RvcmFnZS5yZWFkU3RhdGUoa2V5KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHN0YXRlID0gbnVsbDtcbiAgICAgICAga2V5ID0gaGlzdG9yeS5jcmVhdGVLZXkoKTtcbiAgICAgICAgX0RPTVV0aWxzLnJlcGxhY2VIYXNoUGF0aChhZGRRdWVyeVN0cmluZ1ZhbHVlVG9QYXRoKHBhdGgsIHF1ZXJ5S2V5LCBrZXkpKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAga2V5ID0gc3RhdGUgPSBudWxsO1xuICAgIH1cblxuICAgIHZhciBsb2NhdGlvbiA9IF9QYXRoVXRpbHMucGFyc2VQYXRoKHBhdGgpO1xuXG4gICAgcmV0dXJuIGhpc3RvcnkuY3JlYXRlTG9jYXRpb24oX2V4dGVuZHMoe30sIGxvY2F0aW9uLCB7IHN0YXRlOiBzdGF0ZSB9KSwgdW5kZWZpbmVkLCBrZXkpO1xuICB9XG5cbiAgZnVuY3Rpb24gc3RhcnRIYXNoQ2hhbmdlTGlzdGVuZXIoX3JlZikge1xuICAgIHZhciB0cmFuc2l0aW9uVG8gPSBfcmVmLnRyYW5zaXRpb25UbztcblxuICAgIGZ1bmN0aW9uIGhhc2hDaGFuZ2VMaXN0ZW5lcigpIHtcbiAgICAgIGlmICghZW5zdXJlU2xhc2goKSkgcmV0dXJuOyAvLyBBbHdheXMgbWFrZSBzdXJlIGhhc2hlcyBhcmUgcHJlY2VlZGVkIHdpdGggYSAvLlxuXG4gICAgICB0cmFuc2l0aW9uVG8oZ2V0Q3VycmVudExvY2F0aW9uKCkpO1xuICAgIH1cblxuICAgIGVuc3VyZVNsYXNoKCk7XG4gICAgX0RPTVV0aWxzLmFkZEV2ZW50TGlzdGVuZXIod2luZG93LCAnaGFzaGNoYW5nZScsIGhhc2hDaGFuZ2VMaXN0ZW5lcik7XG5cbiAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgX0RPTVV0aWxzLnJlbW92ZUV2ZW50TGlzdGVuZXIod2luZG93LCAnaGFzaGNoYW5nZScsIGhhc2hDaGFuZ2VMaXN0ZW5lcik7XG4gICAgfTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGZpbmlzaFRyYW5zaXRpb24obG9jYXRpb24pIHtcbiAgICB2YXIgYmFzZW5hbWUgPSBsb2NhdGlvbi5iYXNlbmFtZTtcbiAgICB2YXIgcGF0aG5hbWUgPSBsb2NhdGlvbi5wYXRobmFtZTtcbiAgICB2YXIgc2VhcmNoID0gbG9jYXRpb24uc2VhcmNoO1xuICAgIHZhciBzdGF0ZSA9IGxvY2F0aW9uLnN0YXRlO1xuICAgIHZhciBhY3Rpb24gPSBsb2NhdGlvbi5hY3Rpb247XG4gICAgdmFyIGtleSA9IGxvY2F0aW9uLmtleTtcblxuICAgIGlmIChhY3Rpb24gPT09IF9BY3Rpb25zLlBPUCkgcmV0dXJuOyAvLyBOb3RoaW5nIHRvIGRvLlxuXG4gICAgdmFyIHBhdGggPSAoYmFzZW5hbWUgfHwgJycpICsgcGF0aG5hbWUgKyBzZWFyY2g7XG5cbiAgICBpZiAocXVlcnlLZXkpIHtcbiAgICAgIHBhdGggPSBhZGRRdWVyeVN0cmluZ1ZhbHVlVG9QYXRoKHBhdGgsIHF1ZXJ5S2V5LCBrZXkpO1xuICAgICAgX0RPTVN0YXRlU3RvcmFnZS5zYXZlU3RhdGUoa2V5LCBzdGF0ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIERyb3Aga2V5IGFuZCBzdGF0ZS5cbiAgICAgIGxvY2F0aW9uLmtleSA9IGxvY2F0aW9uLnN0YXRlID0gbnVsbDtcbiAgICB9XG5cbiAgICB2YXIgY3VycmVudEhhc2ggPSBfRE9NVXRpbHMuZ2V0SGFzaFBhdGgoKTtcblxuICAgIGlmIChhY3Rpb24gPT09IF9BY3Rpb25zLlBVU0gpIHtcbiAgICAgIGlmIChjdXJyZW50SGFzaCAhPT0gcGF0aCkge1xuICAgICAgICB3aW5kb3cubG9jYXRpb24uaGFzaCA9IHBhdGg7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ3Byb2R1Y3Rpb24nID8gX3dhcm5pbmcyWydkZWZhdWx0J10oZmFsc2UsICdZb3UgY2Fubm90IFBVU0ggdGhlIHNhbWUgcGF0aCB1c2luZyBoYXNoIGhpc3RvcnknKSA6IHVuZGVmaW5lZDtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGN1cnJlbnRIYXNoICE9PSBwYXRoKSB7XG4gICAgICAvLyBSRVBMQUNFXG4gICAgICBfRE9NVXRpbHMucmVwbGFjZUhhc2hQYXRoKHBhdGgpO1xuICAgIH1cbiAgfVxuXG4gIHZhciBoaXN0b3J5ID0gX2NyZWF0ZURPTUhpc3RvcnkyWydkZWZhdWx0J10oX2V4dGVuZHMoe30sIG9wdGlvbnMsIHtcbiAgICBnZXRDdXJyZW50TG9jYXRpb246IGdldEN1cnJlbnRMb2NhdGlvbixcbiAgICBmaW5pc2hUcmFuc2l0aW9uOiBmaW5pc2hUcmFuc2l0aW9uLFxuICAgIHNhdmVTdGF0ZTogX0RPTVN0YXRlU3RvcmFnZS5zYXZlU3RhdGVcbiAgfSkpO1xuXG4gIHZhciBsaXN0ZW5lckNvdW50ID0gMCxcbiAgICAgIHN0b3BIYXNoQ2hhbmdlTGlzdGVuZXIgPSB1bmRlZmluZWQ7XG5cbiAgZnVuY3Rpb24gbGlzdGVuQmVmb3JlKGxpc3RlbmVyKSB7XG4gICAgaWYgKCsrbGlzdGVuZXJDb3VudCA9PT0gMSkgc3RvcEhhc2hDaGFuZ2VMaXN0ZW5lciA9IHN0YXJ0SGFzaENoYW5nZUxpc3RlbmVyKGhpc3RvcnkpO1xuXG4gICAgdmFyIHVubGlzdGVuID0gaGlzdG9yeS5saXN0ZW5CZWZvcmUobGlzdGVuZXIpO1xuXG4gICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgIHVubGlzdGVuKCk7XG5cbiAgICAgIGlmICgtLWxpc3RlbmVyQ291bnQgPT09IDApIHN0b3BIYXNoQ2hhbmdlTGlzdGVuZXIoKTtcbiAgICB9O1xuICB9XG5cbiAgZnVuY3Rpb24gbGlzdGVuKGxpc3RlbmVyKSB7XG4gICAgaWYgKCsrbGlzdGVuZXJDb3VudCA9PT0gMSkgc3RvcEhhc2hDaGFuZ2VMaXN0ZW5lciA9IHN0YXJ0SGFzaENoYW5nZUxpc3RlbmVyKGhpc3RvcnkpO1xuXG4gICAgdmFyIHVubGlzdGVuID0gaGlzdG9yeS5saXN0ZW4obGlzdGVuZXIpO1xuXG4gICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgIHVubGlzdGVuKCk7XG5cbiAgICAgIGlmICgtLWxpc3RlbmVyQ291bnQgPT09IDApIHN0b3BIYXNoQ2hhbmdlTGlzdGVuZXIoKTtcbiAgICB9O1xuICB9XG5cbiAgZnVuY3Rpb24gcHVzaChsb2NhdGlvbikge1xuICAgIHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAncHJvZHVjdGlvbicgPyBfd2FybmluZzJbJ2RlZmF1bHQnXShxdWVyeUtleSB8fCBsb2NhdGlvbi5zdGF0ZSA9PSBudWxsLCAnWW91IGNhbm5vdCB1c2Ugc3RhdGUgd2l0aG91dCBhIHF1ZXJ5S2V5IGl0IHdpbGwgYmUgZHJvcHBlZCcpIDogdW5kZWZpbmVkO1xuXG4gICAgaGlzdG9yeS5wdXNoKGxvY2F0aW9uKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlcGxhY2UobG9jYXRpb24pIHtcbiAgICBwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ3Byb2R1Y3Rpb24nID8gX3dhcm5pbmcyWydkZWZhdWx0J10ocXVlcnlLZXkgfHwgbG9jYXRpb24uc3RhdGUgPT0gbnVsbCwgJ1lvdSBjYW5ub3QgdXNlIHN0YXRlIHdpdGhvdXQgYSBxdWVyeUtleSBpdCB3aWxsIGJlIGRyb3BwZWQnKSA6IHVuZGVmaW5lZDtcblxuICAgIGhpc3RvcnkucmVwbGFjZShsb2NhdGlvbik7XG4gIH1cblxuICB2YXIgZ29Jc1N1cHBvcnRlZFdpdGhvdXRSZWxvYWQgPSBfRE9NVXRpbHMuc3VwcG9ydHNHb1dpdGhvdXRSZWxvYWRVc2luZ0hhc2goKTtcblxuICBmdW5jdGlvbiBnbyhuKSB7XG4gICAgcHJvY2Vzcy5lbnYuTk9ERV9FTlYgIT09ICdwcm9kdWN0aW9uJyA/IF93YXJuaW5nMlsnZGVmYXVsdCddKGdvSXNTdXBwb3J0ZWRXaXRob3V0UmVsb2FkLCAnSGFzaCBoaXN0b3J5IGdvKG4pIGNhdXNlcyBhIGZ1bGwgcGFnZSByZWxvYWQgaW4gdGhpcyBicm93c2VyJykgOiB1bmRlZmluZWQ7XG5cbiAgICBoaXN0b3J5LmdvKG4pO1xuICB9XG5cbiAgZnVuY3Rpb24gY3JlYXRlSHJlZihwYXRoKSB7XG4gICAgcmV0dXJuICcjJyArIGhpc3RvcnkuY3JlYXRlSHJlZihwYXRoKTtcbiAgfVxuXG4gIC8vIGRlcHJlY2F0ZWRcbiAgZnVuY3Rpb24gcmVnaXN0ZXJUcmFuc2l0aW9uSG9vayhob29rKSB7XG4gICAgaWYgKCsrbGlzdGVuZXJDb3VudCA9PT0gMSkgc3RvcEhhc2hDaGFuZ2VMaXN0ZW5lciA9IHN0YXJ0SGFzaENoYW5nZUxpc3RlbmVyKGhpc3RvcnkpO1xuXG4gICAgaGlzdG9yeS5yZWdpc3RlclRyYW5zaXRpb25Ib29rKGhvb2spO1xuICB9XG5cbiAgLy8gZGVwcmVjYXRlZFxuICBmdW5jdGlvbiB1bnJlZ2lzdGVyVHJhbnNpdGlvbkhvb2soaG9vaykge1xuICAgIGhpc3RvcnkudW5yZWdpc3RlclRyYW5zaXRpb25Ib29rKGhvb2spO1xuXG4gICAgaWYgKC0tbGlzdGVuZXJDb3VudCA9PT0gMCkgc3RvcEhhc2hDaGFuZ2VMaXN0ZW5lcigpO1xuICB9XG5cbiAgLy8gZGVwcmVjYXRlZFxuICBmdW5jdGlvbiBwdXNoU3RhdGUoc3RhdGUsIHBhdGgpIHtcbiAgICBwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ3Byb2R1Y3Rpb24nID8gX3dhcm5pbmcyWydkZWZhdWx0J10ocXVlcnlLZXkgfHwgc3RhdGUgPT0gbnVsbCwgJ1lvdSBjYW5ub3QgdXNlIHN0YXRlIHdpdGhvdXQgYSBxdWVyeUtleSBpdCB3aWxsIGJlIGRyb3BwZWQnKSA6IHVuZGVmaW5lZDtcblxuICAgIGhpc3RvcnkucHVzaFN0YXRlKHN0YXRlLCBwYXRoKTtcbiAgfVxuXG4gIC8vIGRlcHJlY2F0ZWRcbiAgZnVuY3Rpb24gcmVwbGFjZVN0YXRlKHN0YXRlLCBwYXRoKSB7XG4gICAgcHJvY2Vzcy5lbnYuTk9ERV9FTlYgIT09ICdwcm9kdWN0aW9uJyA/IF93YXJuaW5nMlsnZGVmYXVsdCddKHF1ZXJ5S2V5IHx8IHN0YXRlID09IG51bGwsICdZb3UgY2Fubm90IHVzZSBzdGF0ZSB3aXRob3V0IGEgcXVlcnlLZXkgaXQgd2lsbCBiZSBkcm9wcGVkJykgOiB1bmRlZmluZWQ7XG5cbiAgICBoaXN0b3J5LnJlcGxhY2VTdGF0ZShzdGF0ZSwgcGF0aCk7XG4gIH1cblxuICByZXR1cm4gX2V4dGVuZHMoe30sIGhpc3RvcnksIHtcbiAgICBsaXN0ZW5CZWZvcmU6IGxpc3RlbkJlZm9yZSxcbiAgICBsaXN0ZW46IGxpc3RlbixcbiAgICBwdXNoOiBwdXNoLFxuICAgIHJlcGxhY2U6IHJlcGxhY2UsXG4gICAgZ286IGdvLFxuICAgIGNyZWF0ZUhyZWY6IGNyZWF0ZUhyZWYsXG5cbiAgICByZWdpc3RlclRyYW5zaXRpb25Ib29rOiByZWdpc3RlclRyYW5zaXRpb25Ib29rLCAvLyBkZXByZWNhdGVkIC0gd2FybmluZyBpcyBpbiBjcmVhdGVIaXN0b3J5XG4gICAgdW5yZWdpc3RlclRyYW5zaXRpb25Ib29rOiB1bnJlZ2lzdGVyVHJhbnNpdGlvbkhvb2ssIC8vIGRlcHJlY2F0ZWQgLSB3YXJuaW5nIGlzIGluIGNyZWF0ZUhpc3RvcnlcbiAgICBwdXNoU3RhdGU6IHB1c2hTdGF0ZSwgLy8gZGVwcmVjYXRlZCAtIHdhcm5pbmcgaXMgaW4gY3JlYXRlSGlzdG9yeVxuICAgIHJlcGxhY2VTdGF0ZTogcmVwbGFjZVN0YXRlIC8vIGRlcHJlY2F0ZWQgLSB3YXJuaW5nIGlzIGluIGNyZWF0ZUhpc3RvcnlcbiAgfSk7XG59XG5cbmV4cG9ydHNbJ2RlZmF1bHQnXSA9IGNyZWF0ZUhhc2hIaXN0b3J5O1xubW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzWydkZWZhdWx0J107IiwiJ3VzZSBzdHJpY3QnO1xuXG5leHBvcnRzLl9fZXNNb2R1bGUgPSB0cnVlO1xuXG52YXIgX2V4dGVuZHMgPSBPYmplY3QuYXNzaWduIHx8IGZ1bmN0aW9uICh0YXJnZXQpIHsgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHsgdmFyIHNvdXJjZSA9IGFyZ3VtZW50c1tpXTsgZm9yICh2YXIga2V5IGluIHNvdXJjZSkgeyBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHNvdXJjZSwga2V5KSkgeyB0YXJnZXRba2V5XSA9IHNvdXJjZVtrZXldOyB9IH0gfSByZXR1cm4gdGFyZ2V0OyB9O1xuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KG9iaikgeyByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyAnZGVmYXVsdCc6IG9iaiB9OyB9XG5cbnZhciBfd2FybmluZyA9IHJlcXVpcmUoJ3dhcm5pbmcnKTtcblxudmFyIF93YXJuaW5nMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX3dhcm5pbmcpO1xuXG52YXIgX2RlZXBFcXVhbCA9IHJlcXVpcmUoJ2RlZXAtZXF1YWwnKTtcblxudmFyIF9kZWVwRXF1YWwyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfZGVlcEVxdWFsKTtcblxudmFyIF9QYXRoVXRpbHMgPSByZXF1aXJlKCcuL1BhdGhVdGlscycpO1xuXG52YXIgX0FzeW5jVXRpbHMgPSByZXF1aXJlKCcuL0FzeW5jVXRpbHMnKTtcblxudmFyIF9BY3Rpb25zID0gcmVxdWlyZSgnLi9BY3Rpb25zJyk7XG5cbnZhciBfY3JlYXRlTG9jYXRpb24yID0gcmVxdWlyZSgnLi9jcmVhdGVMb2NhdGlvbicpO1xuXG52YXIgX2NyZWF0ZUxvY2F0aW9uMyA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX2NyZWF0ZUxvY2F0aW9uMik7XG5cbnZhciBfcnVuVHJhbnNpdGlvbkhvb2sgPSByZXF1aXJlKCcuL3J1blRyYW5zaXRpb25Ib29rJyk7XG5cbnZhciBfcnVuVHJhbnNpdGlvbkhvb2syID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfcnVuVHJhbnNpdGlvbkhvb2spO1xuXG52YXIgX2RlcHJlY2F0ZSA9IHJlcXVpcmUoJy4vZGVwcmVjYXRlJyk7XG5cbnZhciBfZGVwcmVjYXRlMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX2RlcHJlY2F0ZSk7XG5cbmZ1bmN0aW9uIGNyZWF0ZVJhbmRvbUtleShsZW5ndGgpIHtcbiAgcmV0dXJuIE1hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnN1YnN0cigyLCBsZW5ndGgpO1xufVxuXG5mdW5jdGlvbiBsb2NhdGlvbnNBcmVFcXVhbChhLCBiKSB7XG4gIHJldHVybiBhLnBhdGhuYW1lID09PSBiLnBhdGhuYW1lICYmIGEuc2VhcmNoID09PSBiLnNlYXJjaCAmJlxuICAvL2EuYWN0aW9uID09PSBiLmFjdGlvbiAmJiAvLyBEaWZmZXJlbnQgYWN0aW9uICE9PSBsb2NhdGlvbiBjaGFuZ2UuXG4gIGEua2V5ID09PSBiLmtleSAmJiBfZGVlcEVxdWFsMlsnZGVmYXVsdCddKGEuc3RhdGUsIGIuc3RhdGUpO1xufVxuXG52YXIgRGVmYXVsdEtleUxlbmd0aCA9IDY7XG5cbmZ1bmN0aW9uIGNyZWF0ZUhpc3RvcnkoKSB7XG4gIHZhciBvcHRpb25zID0gYXJndW1lbnRzLmxlbmd0aCA8PSAwIHx8IGFyZ3VtZW50c1swXSA9PT0gdW5kZWZpbmVkID8ge30gOiBhcmd1bWVudHNbMF07XG4gIHZhciBnZXRDdXJyZW50TG9jYXRpb24gPSBvcHRpb25zLmdldEN1cnJlbnRMb2NhdGlvbjtcbiAgdmFyIGZpbmlzaFRyYW5zaXRpb24gPSBvcHRpb25zLmZpbmlzaFRyYW5zaXRpb247XG4gIHZhciBzYXZlU3RhdGUgPSBvcHRpb25zLnNhdmVTdGF0ZTtcbiAgdmFyIGdvID0gb3B0aW9ucy5nbztcbiAgdmFyIGdldFVzZXJDb25maXJtYXRpb24gPSBvcHRpb25zLmdldFVzZXJDb25maXJtYXRpb247XG4gIHZhciBrZXlMZW5ndGggPSBvcHRpb25zLmtleUxlbmd0aDtcblxuICBpZiAodHlwZW9mIGtleUxlbmd0aCAhPT0gJ251bWJlcicpIGtleUxlbmd0aCA9IERlZmF1bHRLZXlMZW5ndGg7XG5cbiAgdmFyIHRyYW5zaXRpb25Ib29rcyA9IFtdO1xuXG4gIGZ1bmN0aW9uIGxpc3RlbkJlZm9yZShob29rKSB7XG4gICAgdHJhbnNpdGlvbkhvb2tzLnB1c2goaG9vayk7XG5cbiAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgdHJhbnNpdGlvbkhvb2tzID0gdHJhbnNpdGlvbkhvb2tzLmZpbHRlcihmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgICByZXR1cm4gaXRlbSAhPT0gaG9vaztcbiAgICAgIH0pO1xuICAgIH07XG4gIH1cblxuICB2YXIgYWxsS2V5cyA9IFtdO1xuICB2YXIgY2hhbmdlTGlzdGVuZXJzID0gW107XG4gIHZhciBsb2NhdGlvbiA9IHVuZGVmaW5lZDtcblxuICBmdW5jdGlvbiBnZXRDdXJyZW50KCkge1xuICAgIGlmIChwZW5kaW5nTG9jYXRpb24gJiYgcGVuZGluZ0xvY2F0aW9uLmFjdGlvbiA9PT0gX0FjdGlvbnMuUE9QKSB7XG4gICAgICByZXR1cm4gYWxsS2V5cy5pbmRleE9mKHBlbmRpbmdMb2NhdGlvbi5rZXkpO1xuICAgIH0gZWxzZSBpZiAobG9jYXRpb24pIHtcbiAgICAgIHJldHVybiBhbGxLZXlzLmluZGV4T2YobG9jYXRpb24ua2V5KTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIC0xO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZUxvY2F0aW9uKG5ld0xvY2F0aW9uKSB7XG4gICAgdmFyIGN1cnJlbnQgPSBnZXRDdXJyZW50KCk7XG5cbiAgICBsb2NhdGlvbiA9IG5ld0xvY2F0aW9uO1xuXG4gICAgaWYgKGxvY2F0aW9uLmFjdGlvbiA9PT0gX0FjdGlvbnMuUFVTSCkge1xuICAgICAgYWxsS2V5cyA9IFtdLmNvbmNhdChhbGxLZXlzLnNsaWNlKDAsIGN1cnJlbnQgKyAxKSwgW2xvY2F0aW9uLmtleV0pO1xuICAgIH0gZWxzZSBpZiAobG9jYXRpb24uYWN0aW9uID09PSBfQWN0aW9ucy5SRVBMQUNFKSB7XG4gICAgICBhbGxLZXlzW2N1cnJlbnRdID0gbG9jYXRpb24ua2V5O1xuICAgIH1cblxuICAgIGNoYW5nZUxpc3RlbmVycy5mb3JFYWNoKGZ1bmN0aW9uIChsaXN0ZW5lcikge1xuICAgICAgbGlzdGVuZXIobG9jYXRpb24pO1xuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gbGlzdGVuKGxpc3RlbmVyKSB7XG4gICAgY2hhbmdlTGlzdGVuZXJzLnB1c2gobGlzdGVuZXIpO1xuXG4gICAgaWYgKGxvY2F0aW9uKSB7XG4gICAgICBsaXN0ZW5lcihsb2NhdGlvbik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBfbG9jYXRpb24gPSBnZXRDdXJyZW50TG9jYXRpb24oKTtcbiAgICAgIGFsbEtleXMgPSBbX2xvY2F0aW9uLmtleV07XG4gICAgICB1cGRhdGVMb2NhdGlvbihfbG9jYXRpb24pO1xuICAgIH1cblxuICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICBjaGFuZ2VMaXN0ZW5lcnMgPSBjaGFuZ2VMaXN0ZW5lcnMuZmlsdGVyKGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICAgIHJldHVybiBpdGVtICE9PSBsaXN0ZW5lcjtcbiAgICAgIH0pO1xuICAgIH07XG4gIH1cblxuICBmdW5jdGlvbiBjb25maXJtVHJhbnNpdGlvblRvKGxvY2F0aW9uLCBjYWxsYmFjaykge1xuICAgIF9Bc3luY1V0aWxzLmxvb3BBc3luYyh0cmFuc2l0aW9uSG9va3MubGVuZ3RoLCBmdW5jdGlvbiAoaW5kZXgsIG5leHQsIGRvbmUpIHtcbiAgICAgIF9ydW5UcmFuc2l0aW9uSG9vazJbJ2RlZmF1bHQnXSh0cmFuc2l0aW9uSG9va3NbaW5kZXhdLCBsb2NhdGlvbiwgZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICBpZiAocmVzdWx0ICE9IG51bGwpIHtcbiAgICAgICAgICBkb25lKHJlc3VsdCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbmV4dCgpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9LCBmdW5jdGlvbiAobWVzc2FnZSkge1xuICAgICAgaWYgKGdldFVzZXJDb25maXJtYXRpb24gJiYgdHlwZW9mIG1lc3NhZ2UgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIGdldFVzZXJDb25maXJtYXRpb24obWVzc2FnZSwgZnVuY3Rpb24gKG9rKSB7XG4gICAgICAgICAgY2FsbGJhY2sob2sgIT09IGZhbHNlKTtcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjYWxsYmFjayhtZXNzYWdlICE9PSBmYWxzZSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICB2YXIgcGVuZGluZ0xvY2F0aW9uID0gdW5kZWZpbmVkO1xuXG4gIGZ1bmN0aW9uIHRyYW5zaXRpb25UbyhuZXh0TG9jYXRpb24pIHtcbiAgICBpZiAobG9jYXRpb24gJiYgbG9jYXRpb25zQXJlRXF1YWwobG9jYXRpb24sIG5leHRMb2NhdGlvbikpIHJldHVybjsgLy8gTm90aGluZyB0byBkby5cblxuICAgIHBlbmRpbmdMb2NhdGlvbiA9IG5leHRMb2NhdGlvbjtcblxuICAgIGNvbmZpcm1UcmFuc2l0aW9uVG8obmV4dExvY2F0aW9uLCBmdW5jdGlvbiAob2spIHtcbiAgICAgIGlmIChwZW5kaW5nTG9jYXRpb24gIT09IG5leHRMb2NhdGlvbikgcmV0dXJuOyAvLyBUcmFuc2l0aW9uIHdhcyBpbnRlcnJ1cHRlZC5cblxuICAgICAgaWYgKG9rKSB7XG4gICAgICAgIC8vIHRyZWF0IFBVU0ggdG8gY3VycmVudCBwYXRoIGxpa2UgUkVQTEFDRSB0byBiZSBjb25zaXN0ZW50IHdpdGggYnJvd3NlcnNcbiAgICAgICAgaWYgKG5leHRMb2NhdGlvbi5hY3Rpb24gPT09IF9BY3Rpb25zLlBVU0gpIHtcbiAgICAgICAgICB2YXIgcHJldlBhdGggPSBjcmVhdGVQYXRoKGxvY2F0aW9uKTtcbiAgICAgICAgICB2YXIgbmV4dFBhdGggPSBjcmVhdGVQYXRoKG5leHRMb2NhdGlvbik7XG5cbiAgICAgICAgICBpZiAobmV4dFBhdGggPT09IHByZXZQYXRoICYmIF9kZWVwRXF1YWwyWydkZWZhdWx0J10obG9jYXRpb24uc3RhdGUsIG5leHRMb2NhdGlvbi5zdGF0ZSkpIG5leHRMb2NhdGlvbi5hY3Rpb24gPSBfQWN0aW9ucy5SRVBMQUNFO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGZpbmlzaFRyYW5zaXRpb24obmV4dExvY2F0aW9uKSAhPT0gZmFsc2UpIHVwZGF0ZUxvY2F0aW9uKG5leHRMb2NhdGlvbik7XG4gICAgICB9IGVsc2UgaWYgKGxvY2F0aW9uICYmIG5leHRMb2NhdGlvbi5hY3Rpb24gPT09IF9BY3Rpb25zLlBPUCkge1xuICAgICAgICB2YXIgcHJldkluZGV4ID0gYWxsS2V5cy5pbmRleE9mKGxvY2F0aW9uLmtleSk7XG4gICAgICAgIHZhciBuZXh0SW5kZXggPSBhbGxLZXlzLmluZGV4T2YobmV4dExvY2F0aW9uLmtleSk7XG5cbiAgICAgICAgaWYgKHByZXZJbmRleCAhPT0gLTEgJiYgbmV4dEluZGV4ICE9PSAtMSkgZ28ocHJldkluZGV4IC0gbmV4dEluZGV4KTsgLy8gUmVzdG9yZSB0aGUgVVJMLlxuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gcHVzaChsb2NhdGlvbikge1xuICAgIHRyYW5zaXRpb25UbyhjcmVhdGVMb2NhdGlvbihsb2NhdGlvbiwgX0FjdGlvbnMuUFVTSCwgY3JlYXRlS2V5KCkpKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlcGxhY2UobG9jYXRpb24pIHtcbiAgICB0cmFuc2l0aW9uVG8oY3JlYXRlTG9jYXRpb24obG9jYXRpb24sIF9BY3Rpb25zLlJFUExBQ0UsIGNyZWF0ZUtleSgpKSk7XG4gIH1cblxuICBmdW5jdGlvbiBnb0JhY2soKSB7XG4gICAgZ28oLTEpO1xuICB9XG5cbiAgZnVuY3Rpb24gZ29Gb3J3YXJkKCkge1xuICAgIGdvKDEpO1xuICB9XG5cbiAgZnVuY3Rpb24gY3JlYXRlS2V5KCkge1xuICAgIHJldHVybiBjcmVhdGVSYW5kb21LZXkoa2V5TGVuZ3RoKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNyZWF0ZVBhdGgobG9jYXRpb24pIHtcbiAgICBpZiAobG9jYXRpb24gPT0gbnVsbCB8fCB0eXBlb2YgbG9jYXRpb24gPT09ICdzdHJpbmcnKSByZXR1cm4gbG9jYXRpb247XG5cbiAgICB2YXIgcGF0aG5hbWUgPSBsb2NhdGlvbi5wYXRobmFtZTtcbiAgICB2YXIgc2VhcmNoID0gbG9jYXRpb24uc2VhcmNoO1xuICAgIHZhciBoYXNoID0gbG9jYXRpb24uaGFzaDtcblxuICAgIHZhciByZXN1bHQgPSBwYXRobmFtZTtcblxuICAgIGlmIChzZWFyY2gpIHJlc3VsdCArPSBzZWFyY2g7XG5cbiAgICBpZiAoaGFzaCkgcmVzdWx0ICs9IGhhc2g7XG5cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgZnVuY3Rpb24gY3JlYXRlSHJlZihsb2NhdGlvbikge1xuICAgIHJldHVybiBjcmVhdGVQYXRoKGxvY2F0aW9uKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNyZWF0ZUxvY2F0aW9uKGxvY2F0aW9uLCBhY3Rpb24pIHtcbiAgICB2YXIga2V5ID0gYXJndW1lbnRzLmxlbmd0aCA8PSAyIHx8IGFyZ3VtZW50c1syXSA9PT0gdW5kZWZpbmVkID8gY3JlYXRlS2V5KCkgOiBhcmd1bWVudHNbMl07XG5cbiAgICBpZiAodHlwZW9mIGFjdGlvbiA9PT0gJ29iamVjdCcpIHtcbiAgICAgIHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAncHJvZHVjdGlvbicgPyBfd2FybmluZzJbJ2RlZmF1bHQnXShmYWxzZSwgJ1RoZSBzdGF0ZSAoMm5kKSBhcmd1bWVudCB0byBoaXN0b3J5LmNyZWF0ZUxvY2F0aW9uIGlzIGRlcHJlY2F0ZWQ7IHVzZSBhICcgKyAnbG9jYXRpb24gZGVzY3JpcHRvciBpbnN0ZWFkJykgOiB1bmRlZmluZWQ7XG5cbiAgICAgIGlmICh0eXBlb2YgbG9jYXRpb24gPT09ICdzdHJpbmcnKSBsb2NhdGlvbiA9IF9QYXRoVXRpbHMucGFyc2VQYXRoKGxvY2F0aW9uKTtcblxuICAgICAgbG9jYXRpb24gPSBfZXh0ZW5kcyh7fSwgbG9jYXRpb24sIHsgc3RhdGU6IGFjdGlvbiB9KTtcblxuICAgICAgYWN0aW9uID0ga2V5O1xuICAgICAga2V5ID0gYXJndW1lbnRzWzNdIHx8IGNyZWF0ZUtleSgpO1xuICAgIH1cblxuICAgIHJldHVybiBfY3JlYXRlTG9jYXRpb24zWydkZWZhdWx0J10obG9jYXRpb24sIGFjdGlvbiwga2V5KTtcbiAgfVxuXG4gIC8vIGRlcHJlY2F0ZWRcbiAgZnVuY3Rpb24gc2V0U3RhdGUoc3RhdGUpIHtcbiAgICBpZiAobG9jYXRpb24pIHtcbiAgICAgIHVwZGF0ZUxvY2F0aW9uU3RhdGUobG9jYXRpb24sIHN0YXRlKTtcbiAgICAgIHVwZGF0ZUxvY2F0aW9uKGxvY2F0aW9uKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdXBkYXRlTG9jYXRpb25TdGF0ZShnZXRDdXJyZW50TG9jYXRpb24oKSwgc3RhdGUpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZUxvY2F0aW9uU3RhdGUobG9jYXRpb24sIHN0YXRlKSB7XG4gICAgbG9jYXRpb24uc3RhdGUgPSBfZXh0ZW5kcyh7fSwgbG9jYXRpb24uc3RhdGUsIHN0YXRlKTtcbiAgICBzYXZlU3RhdGUobG9jYXRpb24ua2V5LCBsb2NhdGlvbi5zdGF0ZSk7XG4gIH1cblxuICAvLyBkZXByZWNhdGVkXG4gIGZ1bmN0aW9uIHJlZ2lzdGVyVHJhbnNpdGlvbkhvb2soaG9vaykge1xuICAgIGlmICh0cmFuc2l0aW9uSG9va3MuaW5kZXhPZihob29rKSA9PT0gLTEpIHRyYW5zaXRpb25Ib29rcy5wdXNoKGhvb2spO1xuICB9XG5cbiAgLy8gZGVwcmVjYXRlZFxuICBmdW5jdGlvbiB1bnJlZ2lzdGVyVHJhbnNpdGlvbkhvb2soaG9vaykge1xuICAgIHRyYW5zaXRpb25Ib29rcyA9IHRyYW5zaXRpb25Ib29rcy5maWx0ZXIoZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgIHJldHVybiBpdGVtICE9PSBob29rO1xuICAgIH0pO1xuICB9XG5cbiAgLy8gZGVwcmVjYXRlZFxuICBmdW5jdGlvbiBwdXNoU3RhdGUoc3RhdGUsIHBhdGgpIHtcbiAgICBpZiAodHlwZW9mIHBhdGggPT09ICdzdHJpbmcnKSBwYXRoID0gX1BhdGhVdGlscy5wYXJzZVBhdGgocGF0aCk7XG5cbiAgICBwdXNoKF9leHRlbmRzKHsgc3RhdGU6IHN0YXRlIH0sIHBhdGgpKTtcbiAgfVxuXG4gIC8vIGRlcHJlY2F0ZWRcbiAgZnVuY3Rpb24gcmVwbGFjZVN0YXRlKHN0YXRlLCBwYXRoKSB7XG4gICAgaWYgKHR5cGVvZiBwYXRoID09PSAnc3RyaW5nJykgcGF0aCA9IF9QYXRoVXRpbHMucGFyc2VQYXRoKHBhdGgpO1xuXG4gICAgcmVwbGFjZShfZXh0ZW5kcyh7IHN0YXRlOiBzdGF0ZSB9LCBwYXRoKSk7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGxpc3RlbkJlZm9yZTogbGlzdGVuQmVmb3JlLFxuICAgIGxpc3RlbjogbGlzdGVuLFxuICAgIHRyYW5zaXRpb25UbzogdHJhbnNpdGlvblRvLFxuICAgIHB1c2g6IHB1c2gsXG4gICAgcmVwbGFjZTogcmVwbGFjZSxcbiAgICBnbzogZ28sXG4gICAgZ29CYWNrOiBnb0JhY2ssXG4gICAgZ29Gb3J3YXJkOiBnb0ZvcndhcmQsXG4gICAgY3JlYXRlS2V5OiBjcmVhdGVLZXksXG4gICAgY3JlYXRlUGF0aDogY3JlYXRlUGF0aCxcbiAgICBjcmVhdGVIcmVmOiBjcmVhdGVIcmVmLFxuICAgIGNyZWF0ZUxvY2F0aW9uOiBjcmVhdGVMb2NhdGlvbixcblxuICAgIHNldFN0YXRlOiBfZGVwcmVjYXRlMlsnZGVmYXVsdCddKHNldFN0YXRlLCAnc2V0U3RhdGUgaXMgZGVwcmVjYXRlZDsgdXNlIGxvY2F0aW9uLmtleSB0byBzYXZlIHN0YXRlIGluc3RlYWQnKSxcbiAgICByZWdpc3RlclRyYW5zaXRpb25Ib29rOiBfZGVwcmVjYXRlMlsnZGVmYXVsdCddKHJlZ2lzdGVyVHJhbnNpdGlvbkhvb2ssICdyZWdpc3RlclRyYW5zaXRpb25Ib29rIGlzIGRlcHJlY2F0ZWQ7IHVzZSBsaXN0ZW5CZWZvcmUgaW5zdGVhZCcpLFxuICAgIHVucmVnaXN0ZXJUcmFuc2l0aW9uSG9vazogX2RlcHJlY2F0ZTJbJ2RlZmF1bHQnXSh1bnJlZ2lzdGVyVHJhbnNpdGlvbkhvb2ssICd1bnJlZ2lzdGVyVHJhbnNpdGlvbkhvb2sgaXMgZGVwcmVjYXRlZDsgdXNlIHRoZSBjYWxsYmFjayByZXR1cm5lZCBmcm9tIGxpc3RlbkJlZm9yZSBpbnN0ZWFkJyksXG4gICAgcHVzaFN0YXRlOiBfZGVwcmVjYXRlMlsnZGVmYXVsdCddKHB1c2hTdGF0ZSwgJ3B1c2hTdGF0ZSBpcyBkZXByZWNhdGVkOyB1c2UgcHVzaCBpbnN0ZWFkJyksXG4gICAgcmVwbGFjZVN0YXRlOiBfZGVwcmVjYXRlMlsnZGVmYXVsdCddKHJlcGxhY2VTdGF0ZSwgJ3JlcGxhY2VTdGF0ZSBpcyBkZXByZWNhdGVkOyB1c2UgcmVwbGFjZSBpbnN0ZWFkJylcbiAgfTtcbn1cblxuZXhwb3J0c1snZGVmYXVsdCddID0gY3JlYXRlSGlzdG9yeTtcbm1vZHVsZS5leHBvcnRzID0gZXhwb3J0c1snZGVmYXVsdCddOyIsIid1c2Ugc3RyaWN0JztcblxuZXhwb3J0cy5fX2VzTW9kdWxlID0gdHJ1ZTtcblxudmFyIF9leHRlbmRzID0gT2JqZWN0LmFzc2lnbiB8fCBmdW5jdGlvbiAodGFyZ2V0KSB7IGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7IHZhciBzb3VyY2UgPSBhcmd1bWVudHNbaV07IGZvciAodmFyIGtleSBpbiBzb3VyY2UpIHsgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChzb3VyY2UsIGtleSkpIHsgdGFyZ2V0W2tleV0gPSBzb3VyY2Vba2V5XTsgfSB9IH0gcmV0dXJuIHRhcmdldDsgfTtcblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgJ2RlZmF1bHQnOiBvYmogfTsgfVxuXG52YXIgX3dhcm5pbmcgPSByZXF1aXJlKCd3YXJuaW5nJyk7XG5cbnZhciBfd2FybmluZzIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF93YXJuaW5nKTtcblxudmFyIF9BY3Rpb25zID0gcmVxdWlyZSgnLi9BY3Rpb25zJyk7XG5cbnZhciBfUGF0aFV0aWxzID0gcmVxdWlyZSgnLi9QYXRoVXRpbHMnKTtcblxuZnVuY3Rpb24gY3JlYXRlTG9jYXRpb24oKSB7XG4gIHZhciBsb2NhdGlvbiA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMCB8fCBhcmd1bWVudHNbMF0gPT09IHVuZGVmaW5lZCA/ICcvJyA6IGFyZ3VtZW50c1swXTtcbiAgdmFyIGFjdGlvbiA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMSB8fCBhcmd1bWVudHNbMV0gPT09IHVuZGVmaW5lZCA/IF9BY3Rpb25zLlBPUCA6IGFyZ3VtZW50c1sxXTtcbiAgdmFyIGtleSA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMiB8fCBhcmd1bWVudHNbMl0gPT09IHVuZGVmaW5lZCA/IG51bGwgOiBhcmd1bWVudHNbMl07XG5cbiAgdmFyIF9mb3VydGhBcmcgPSBhcmd1bWVudHMubGVuZ3RoIDw9IDMgfHwgYXJndW1lbnRzWzNdID09PSB1bmRlZmluZWQgPyBudWxsIDogYXJndW1lbnRzWzNdO1xuXG4gIGlmICh0eXBlb2YgbG9jYXRpb24gPT09ICdzdHJpbmcnKSBsb2NhdGlvbiA9IF9QYXRoVXRpbHMucGFyc2VQYXRoKGxvY2F0aW9uKTtcblxuICBpZiAodHlwZW9mIGFjdGlvbiA9PT0gJ29iamVjdCcpIHtcbiAgICBwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ3Byb2R1Y3Rpb24nID8gX3dhcm5pbmcyWydkZWZhdWx0J10oZmFsc2UsICdUaGUgc3RhdGUgKDJuZCkgYXJndW1lbnQgdG8gY3JlYXRlTG9jYXRpb24gaXMgZGVwcmVjYXRlZDsgdXNlIGEgJyArICdsb2NhdGlvbiBkZXNjcmlwdG9yIGluc3RlYWQnKSA6IHVuZGVmaW5lZDtcblxuICAgIGxvY2F0aW9uID0gX2V4dGVuZHMoe30sIGxvY2F0aW9uLCB7IHN0YXRlOiBhY3Rpb24gfSk7XG5cbiAgICBhY3Rpb24gPSBrZXkgfHwgX0FjdGlvbnMuUE9QO1xuICAgIGtleSA9IF9mb3VydGhBcmc7XG4gIH1cblxuICB2YXIgcGF0aG5hbWUgPSBsb2NhdGlvbi5wYXRobmFtZSB8fCAnLyc7XG4gIHZhciBzZWFyY2ggPSBsb2NhdGlvbi5zZWFyY2ggfHwgJyc7XG4gIHZhciBoYXNoID0gbG9jYXRpb24uaGFzaCB8fCAnJztcbiAgdmFyIHN0YXRlID0gbG9jYXRpb24uc3RhdGUgfHwgbnVsbDtcblxuICByZXR1cm4ge1xuICAgIHBhdGhuYW1lOiBwYXRobmFtZSxcbiAgICBzZWFyY2g6IHNlYXJjaCxcbiAgICBoYXNoOiBoYXNoLFxuICAgIHN0YXRlOiBzdGF0ZSxcbiAgICBhY3Rpb246IGFjdGlvbixcbiAgICBrZXk6IGtleVxuICB9O1xufVxuXG5leHBvcnRzWydkZWZhdWx0J10gPSBjcmVhdGVMb2NhdGlvbjtcbm1vZHVsZS5leHBvcnRzID0gZXhwb3J0c1snZGVmYXVsdCddOyIsIid1c2Ugc3RyaWN0JztcblxuZXhwb3J0cy5fX2VzTW9kdWxlID0gdHJ1ZTtcblxudmFyIF9leHRlbmRzID0gT2JqZWN0LmFzc2lnbiB8fCBmdW5jdGlvbiAodGFyZ2V0KSB7IGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7IHZhciBzb3VyY2UgPSBhcmd1bWVudHNbaV07IGZvciAodmFyIGtleSBpbiBzb3VyY2UpIHsgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChzb3VyY2UsIGtleSkpIHsgdGFyZ2V0W2tleV0gPSBzb3VyY2Vba2V5XTsgfSB9IH0gcmV0dXJuIHRhcmdldDsgfTtcblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgJ2RlZmF1bHQnOiBvYmogfTsgfVxuXG52YXIgX3dhcm5pbmcgPSByZXF1aXJlKCd3YXJuaW5nJyk7XG5cbnZhciBfd2FybmluZzIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF93YXJuaW5nKTtcblxudmFyIF9pbnZhcmlhbnQgPSByZXF1aXJlKCdpbnZhcmlhbnQnKTtcblxudmFyIF9pbnZhcmlhbnQyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfaW52YXJpYW50KTtcblxudmFyIF9QYXRoVXRpbHMgPSByZXF1aXJlKCcuL1BhdGhVdGlscycpO1xuXG52YXIgX0FjdGlvbnMgPSByZXF1aXJlKCcuL0FjdGlvbnMnKTtcblxudmFyIF9jcmVhdGVIaXN0b3J5ID0gcmVxdWlyZSgnLi9jcmVhdGVIaXN0b3J5Jyk7XG5cbnZhciBfY3JlYXRlSGlzdG9yeTIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9jcmVhdGVIaXN0b3J5KTtcblxuZnVuY3Rpb24gY3JlYXRlU3RhdGVTdG9yYWdlKGVudHJpZXMpIHtcbiAgcmV0dXJuIGVudHJpZXMuZmlsdGVyKGZ1bmN0aW9uIChlbnRyeSkge1xuICAgIHJldHVybiBlbnRyeS5zdGF0ZTtcbiAgfSkucmVkdWNlKGZ1bmN0aW9uIChtZW1vLCBlbnRyeSkge1xuICAgIG1lbW9bZW50cnkua2V5XSA9IGVudHJ5LnN0YXRlO1xuICAgIHJldHVybiBtZW1vO1xuICB9LCB7fSk7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZU1lbW9yeUhpc3RvcnkoKSB7XG4gIHZhciBvcHRpb25zID0gYXJndW1lbnRzLmxlbmd0aCA8PSAwIHx8IGFyZ3VtZW50c1swXSA9PT0gdW5kZWZpbmVkID8ge30gOiBhcmd1bWVudHNbMF07XG5cbiAgaWYgKEFycmF5LmlzQXJyYXkob3B0aW9ucykpIHtcbiAgICBvcHRpb25zID0geyBlbnRyaWVzOiBvcHRpb25zIH07XG4gIH0gZWxzZSBpZiAodHlwZW9mIG9wdGlvbnMgPT09ICdzdHJpbmcnKSB7XG4gICAgb3B0aW9ucyA9IHsgZW50cmllczogW29wdGlvbnNdIH07XG4gIH1cblxuICB2YXIgaGlzdG9yeSA9IF9jcmVhdGVIaXN0b3J5MlsnZGVmYXVsdCddKF9leHRlbmRzKHt9LCBvcHRpb25zLCB7XG4gICAgZ2V0Q3VycmVudExvY2F0aW9uOiBnZXRDdXJyZW50TG9jYXRpb24sXG4gICAgZmluaXNoVHJhbnNpdGlvbjogZmluaXNoVHJhbnNpdGlvbixcbiAgICBzYXZlU3RhdGU6IHNhdmVTdGF0ZSxcbiAgICBnbzogZ29cbiAgfSkpO1xuXG4gIHZhciBfb3B0aW9ucyA9IG9wdGlvbnM7XG4gIHZhciBlbnRyaWVzID0gX29wdGlvbnMuZW50cmllcztcbiAgdmFyIGN1cnJlbnQgPSBfb3B0aW9ucy5jdXJyZW50O1xuXG4gIGlmICh0eXBlb2YgZW50cmllcyA9PT0gJ3N0cmluZycpIHtcbiAgICBlbnRyaWVzID0gW2VudHJpZXNdO1xuICB9IGVsc2UgaWYgKCFBcnJheS5pc0FycmF5KGVudHJpZXMpKSB7XG4gICAgZW50cmllcyA9IFsnLyddO1xuICB9XG5cbiAgZW50cmllcyA9IGVudHJpZXMubWFwKGZ1bmN0aW9uIChlbnRyeSkge1xuICAgIHZhciBrZXkgPSBoaXN0b3J5LmNyZWF0ZUtleSgpO1xuXG4gICAgaWYgKHR5cGVvZiBlbnRyeSA9PT0gJ3N0cmluZycpIHJldHVybiB7IHBhdGhuYW1lOiBlbnRyeSwga2V5OiBrZXkgfTtcblxuICAgIGlmICh0eXBlb2YgZW50cnkgPT09ICdvYmplY3QnICYmIGVudHJ5KSByZXR1cm4gX2V4dGVuZHMoe30sIGVudHJ5LCB7IGtleToga2V5IH0pO1xuXG4gICAgIWZhbHNlID8gcHJvY2Vzcy5lbnYuTk9ERV9FTlYgIT09ICdwcm9kdWN0aW9uJyA/IF9pbnZhcmlhbnQyWydkZWZhdWx0J10oZmFsc2UsICdVbmFibGUgdG8gY3JlYXRlIGhpc3RvcnkgZW50cnkgZnJvbSAlcycsIGVudHJ5KSA6IF9pbnZhcmlhbnQyWydkZWZhdWx0J10oZmFsc2UpIDogdW5kZWZpbmVkO1xuICB9KTtcblxuICBpZiAoY3VycmVudCA9PSBudWxsKSB7XG4gICAgY3VycmVudCA9IGVudHJpZXMubGVuZ3RoIC0gMTtcbiAgfSBlbHNlIHtcbiAgICAhKGN1cnJlbnQgPj0gMCAmJiBjdXJyZW50IDwgZW50cmllcy5sZW5ndGgpID8gcHJvY2Vzcy5lbnYuTk9ERV9FTlYgIT09ICdwcm9kdWN0aW9uJyA/IF9pbnZhcmlhbnQyWydkZWZhdWx0J10oZmFsc2UsICdDdXJyZW50IGluZGV4IG11c3QgYmUgPj0gMCBhbmQgPCAlcywgd2FzICVzJywgZW50cmllcy5sZW5ndGgsIGN1cnJlbnQpIDogX2ludmFyaWFudDJbJ2RlZmF1bHQnXShmYWxzZSkgOiB1bmRlZmluZWQ7XG4gIH1cblxuICB2YXIgc3RvcmFnZSA9IGNyZWF0ZVN0YXRlU3RvcmFnZShlbnRyaWVzKTtcblxuICBmdW5jdGlvbiBzYXZlU3RhdGUoa2V5LCBzdGF0ZSkge1xuICAgIHN0b3JhZ2Vba2V5XSA9IHN0YXRlO1xuICB9XG5cbiAgZnVuY3Rpb24gcmVhZFN0YXRlKGtleSkge1xuICAgIHJldHVybiBzdG9yYWdlW2tleV07XG4gIH1cblxuICBmdW5jdGlvbiBnZXRDdXJyZW50TG9jYXRpb24oKSB7XG4gICAgdmFyIGVudHJ5ID0gZW50cmllc1tjdXJyZW50XTtcbiAgICB2YXIgYmFzZW5hbWUgPSBlbnRyeS5iYXNlbmFtZTtcbiAgICB2YXIgcGF0aG5hbWUgPSBlbnRyeS5wYXRobmFtZTtcbiAgICB2YXIgc2VhcmNoID0gZW50cnkuc2VhcmNoO1xuXG4gICAgdmFyIHBhdGggPSAoYmFzZW5hbWUgfHwgJycpICsgcGF0aG5hbWUgKyAoc2VhcmNoIHx8ICcnKTtcblxuICAgIHZhciBrZXkgPSB1bmRlZmluZWQsXG4gICAgICAgIHN0YXRlID0gdW5kZWZpbmVkO1xuICAgIGlmIChlbnRyeS5rZXkpIHtcbiAgICAgIGtleSA9IGVudHJ5LmtleTtcbiAgICAgIHN0YXRlID0gcmVhZFN0YXRlKGtleSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGtleSA9IGhpc3RvcnkuY3JlYXRlS2V5KCk7XG4gICAgICBzdGF0ZSA9IG51bGw7XG4gICAgICBlbnRyeS5rZXkgPSBrZXk7XG4gICAgfVxuXG4gICAgdmFyIGxvY2F0aW9uID0gX1BhdGhVdGlscy5wYXJzZVBhdGgocGF0aCk7XG5cbiAgICByZXR1cm4gaGlzdG9yeS5jcmVhdGVMb2NhdGlvbihfZXh0ZW5kcyh7fSwgbG9jYXRpb24sIHsgc3RhdGU6IHN0YXRlIH0pLCB1bmRlZmluZWQsIGtleSk7XG4gIH1cblxuICBmdW5jdGlvbiBjYW5HbyhuKSB7XG4gICAgdmFyIGluZGV4ID0gY3VycmVudCArIG47XG4gICAgcmV0dXJuIGluZGV4ID49IDAgJiYgaW5kZXggPCBlbnRyaWVzLmxlbmd0aDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdvKG4pIHtcbiAgICBpZiAobikge1xuICAgICAgaWYgKCFjYW5HbyhuKSkge1xuICAgICAgICBwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ3Byb2R1Y3Rpb24nID8gX3dhcm5pbmcyWydkZWZhdWx0J10oZmFsc2UsICdDYW5ub3QgZ28oJXMpIHRoZXJlIGlzIG5vdCBlbm91Z2ggaGlzdG9yeScsIG4pIDogdW5kZWZpbmVkO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGN1cnJlbnQgKz0gbjtcblxuICAgICAgdmFyIGN1cnJlbnRMb2NhdGlvbiA9IGdldEN1cnJlbnRMb2NhdGlvbigpO1xuXG4gICAgICAvLyBjaGFuZ2UgYWN0aW9uIHRvIFBPUFxuICAgICAgaGlzdG9yeS50cmFuc2l0aW9uVG8oX2V4dGVuZHMoe30sIGN1cnJlbnRMb2NhdGlvbiwgeyBhY3Rpb246IF9BY3Rpb25zLlBPUCB9KSk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gZmluaXNoVHJhbnNpdGlvbihsb2NhdGlvbikge1xuICAgIHN3aXRjaCAobG9jYXRpb24uYWN0aW9uKSB7XG4gICAgICBjYXNlIF9BY3Rpb25zLlBVU0g6XG4gICAgICAgIGN1cnJlbnQgKz0gMTtcblxuICAgICAgICAvLyBpZiB3ZSBhcmUgbm90IG9uIHRoZSB0b3Agb2Ygc3RhY2tcbiAgICAgICAgLy8gcmVtb3ZlIHJlc3QgYW5kIHB1c2ggbmV3XG4gICAgICAgIGlmIChjdXJyZW50IDwgZW50cmllcy5sZW5ndGgpIGVudHJpZXMuc3BsaWNlKGN1cnJlbnQpO1xuXG4gICAgICAgIGVudHJpZXMucHVzaChsb2NhdGlvbik7XG4gICAgICAgIHNhdmVTdGF0ZShsb2NhdGlvbi5rZXksIGxvY2F0aW9uLnN0YXRlKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIF9BY3Rpb25zLlJFUExBQ0U6XG4gICAgICAgIGVudHJpZXNbY3VycmVudF0gPSBsb2NhdGlvbjtcbiAgICAgICAgc2F2ZVN0YXRlKGxvY2F0aW9uLmtleSwgbG9jYXRpb24uc3RhdGUpO1xuICAgICAgICBicmVhaztcbiAgICB9XG4gIH1cblxuICByZXR1cm4gaGlzdG9yeTtcbn1cblxuZXhwb3J0c1snZGVmYXVsdCddID0gY3JlYXRlTWVtb3J5SGlzdG9yeTtcbm1vZHVsZS5leHBvcnRzID0gZXhwb3J0c1snZGVmYXVsdCddOyIsIid1c2Ugc3RyaWN0JztcblxuZXhwb3J0cy5fX2VzTW9kdWxlID0gdHJ1ZTtcblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgJ2RlZmF1bHQnOiBvYmogfTsgfVxuXG52YXIgX3dhcm5pbmcgPSByZXF1aXJlKCd3YXJuaW5nJyk7XG5cbnZhciBfd2FybmluZzIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF93YXJuaW5nKTtcblxuZnVuY3Rpb24gZGVwcmVjYXRlKGZuLCBtZXNzYWdlKSB7XG4gIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgcHJvY2Vzcy5lbnYuTk9ERV9FTlYgIT09ICdwcm9kdWN0aW9uJyA/IF93YXJuaW5nMlsnZGVmYXVsdCddKGZhbHNlLCAnW2hpc3RvcnldICcgKyBtZXNzYWdlKSA6IHVuZGVmaW5lZDtcbiAgICByZXR1cm4gZm4uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgfTtcbn1cblxuZXhwb3J0c1snZGVmYXVsdCddID0gZGVwcmVjYXRlO1xubW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzWydkZWZhdWx0J107IiwiJ3VzZSBzdHJpY3QnO1xuXG5leHBvcnRzLl9fZXNNb2R1bGUgPSB0cnVlO1xuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KG9iaikgeyByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyAnZGVmYXVsdCc6IG9iaiB9OyB9XG5cbnZhciBfZGVwcmVjYXRlID0gcmVxdWlyZSgnLi9kZXByZWNhdGUnKTtcblxudmFyIF9kZXByZWNhdGUyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfZGVwcmVjYXRlKTtcblxudmFyIF91c2VCZWZvcmVVbmxvYWQgPSByZXF1aXJlKCcuL3VzZUJlZm9yZVVubG9hZCcpO1xuXG52YXIgX3VzZUJlZm9yZVVubG9hZDIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF91c2VCZWZvcmVVbmxvYWQpO1xuXG5leHBvcnRzWydkZWZhdWx0J10gPSBfZGVwcmVjYXRlMlsnZGVmYXVsdCddKF91c2VCZWZvcmVVbmxvYWQyWydkZWZhdWx0J10sICdlbmFibGVCZWZvcmVVbmxvYWQgaXMgZGVwcmVjYXRlZCwgdXNlIHVzZUJlZm9yZVVubG9hZCBpbnN0ZWFkJyk7XG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHNbJ2RlZmF1bHQnXTsiLCIndXNlIHN0cmljdCc7XG5cbmV4cG9ydHMuX19lc01vZHVsZSA9IHRydWU7XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZURlZmF1bHQob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7ICdkZWZhdWx0Jzogb2JqIH07IH1cblxudmFyIF9kZXByZWNhdGUgPSByZXF1aXJlKCcuL2RlcHJlY2F0ZScpO1xuXG52YXIgX2RlcHJlY2F0ZTIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9kZXByZWNhdGUpO1xuXG52YXIgX3VzZVF1ZXJpZXMgPSByZXF1aXJlKCcuL3VzZVF1ZXJpZXMnKTtcblxudmFyIF91c2VRdWVyaWVzMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX3VzZVF1ZXJpZXMpO1xuXG5leHBvcnRzWydkZWZhdWx0J10gPSBfZGVwcmVjYXRlMlsnZGVmYXVsdCddKF91c2VRdWVyaWVzMlsnZGVmYXVsdCddLCAnZW5hYmxlUXVlcmllcyBpcyBkZXByZWNhdGVkLCB1c2UgdXNlUXVlcmllcyBpbnN0ZWFkJyk7XG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHNbJ2RlZmF1bHQnXTsiLCIndXNlIHN0cmljdCc7XG5cbmV4cG9ydHMuX19lc01vZHVsZSA9IHRydWU7XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZURlZmF1bHQob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7ICdkZWZhdWx0Jzogb2JqIH07IH1cblxudmFyIF9kZXByZWNhdGUgPSByZXF1aXJlKCcuL2RlcHJlY2F0ZScpO1xuXG52YXIgX2RlcHJlY2F0ZTIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9kZXByZWNhdGUpO1xuXG52YXIgX2NyZWF0ZUxvY2F0aW9uMiA9IHJlcXVpcmUoJy4vY3JlYXRlTG9jYXRpb24nKTtcblxudmFyIF9jcmVhdGVMb2NhdGlvbjMgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9jcmVhdGVMb2NhdGlvbjIpO1xuXG52YXIgX2NyZWF0ZUJyb3dzZXJIaXN0b3J5ID0gcmVxdWlyZSgnLi9jcmVhdGVCcm93c2VySGlzdG9yeScpO1xuXG52YXIgX2NyZWF0ZUJyb3dzZXJIaXN0b3J5MiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX2NyZWF0ZUJyb3dzZXJIaXN0b3J5KTtcblxuZXhwb3J0cy5jcmVhdGVIaXN0b3J5ID0gX2NyZWF0ZUJyb3dzZXJIaXN0b3J5MlsnZGVmYXVsdCddO1xuXG52YXIgX2NyZWF0ZUhhc2hIaXN0b3J5MiA9IHJlcXVpcmUoJy4vY3JlYXRlSGFzaEhpc3RvcnknKTtcblxudmFyIF9jcmVhdGVIYXNoSGlzdG9yeTMgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9jcmVhdGVIYXNoSGlzdG9yeTIpO1xuXG5leHBvcnRzLmNyZWF0ZUhhc2hIaXN0b3J5ID0gX2NyZWF0ZUhhc2hIaXN0b3J5M1snZGVmYXVsdCddO1xuXG52YXIgX2NyZWF0ZU1lbW9yeUhpc3RvcnkyID0gcmVxdWlyZSgnLi9jcmVhdGVNZW1vcnlIaXN0b3J5Jyk7XG5cbnZhciBfY3JlYXRlTWVtb3J5SGlzdG9yeTMgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9jcmVhdGVNZW1vcnlIaXN0b3J5Mik7XG5cbmV4cG9ydHMuY3JlYXRlTWVtb3J5SGlzdG9yeSA9IF9jcmVhdGVNZW1vcnlIaXN0b3J5M1snZGVmYXVsdCddO1xuXG52YXIgX3VzZUJhc2VuYW1lMiA9IHJlcXVpcmUoJy4vdXNlQmFzZW5hbWUnKTtcblxudmFyIF91c2VCYXNlbmFtZTMgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF91c2VCYXNlbmFtZTIpO1xuXG5leHBvcnRzLnVzZUJhc2VuYW1lID0gX3VzZUJhc2VuYW1lM1snZGVmYXVsdCddO1xuXG52YXIgX3VzZUJlZm9yZVVubG9hZDIgPSByZXF1aXJlKCcuL3VzZUJlZm9yZVVubG9hZCcpO1xuXG52YXIgX3VzZUJlZm9yZVVubG9hZDMgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF91c2VCZWZvcmVVbmxvYWQyKTtcblxuZXhwb3J0cy51c2VCZWZvcmVVbmxvYWQgPSBfdXNlQmVmb3JlVW5sb2FkM1snZGVmYXVsdCddO1xuXG52YXIgX3VzZVF1ZXJpZXMyID0gcmVxdWlyZSgnLi91c2VRdWVyaWVzJyk7XG5cbnZhciBfdXNlUXVlcmllczMgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF91c2VRdWVyaWVzMik7XG5cbmV4cG9ydHMudXNlUXVlcmllcyA9IF91c2VRdWVyaWVzM1snZGVmYXVsdCddO1xuXG52YXIgX0FjdGlvbnMyID0gcmVxdWlyZSgnLi9BY3Rpb25zJyk7XG5cbnZhciBfQWN0aW9uczMgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9BY3Rpb25zMik7XG5cbmV4cG9ydHMuQWN0aW9ucyA9IF9BY3Rpb25zM1snZGVmYXVsdCddO1xuXG4vLyBkZXByZWNhdGVkXG5cbnZhciBfZW5hYmxlQmVmb3JlVW5sb2FkMiA9IHJlcXVpcmUoJy4vZW5hYmxlQmVmb3JlVW5sb2FkJyk7XG5cbnZhciBfZW5hYmxlQmVmb3JlVW5sb2FkMyA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX2VuYWJsZUJlZm9yZVVubG9hZDIpO1xuXG5leHBvcnRzLmVuYWJsZUJlZm9yZVVubG9hZCA9IF9lbmFibGVCZWZvcmVVbmxvYWQzWydkZWZhdWx0J107XG5cbnZhciBfZW5hYmxlUXVlcmllczIgPSByZXF1aXJlKCcuL2VuYWJsZVF1ZXJpZXMnKTtcblxudmFyIF9lbmFibGVRdWVyaWVzMyA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX2VuYWJsZVF1ZXJpZXMyKTtcblxuZXhwb3J0cy5lbmFibGVRdWVyaWVzID0gX2VuYWJsZVF1ZXJpZXMzWydkZWZhdWx0J107XG52YXIgY3JlYXRlTG9jYXRpb24gPSBfZGVwcmVjYXRlMlsnZGVmYXVsdCddKF9jcmVhdGVMb2NhdGlvbjNbJ2RlZmF1bHQnXSwgJ1VzaW5nIGNyZWF0ZUxvY2F0aW9uIHdpdGhvdXQgYSBoaXN0b3J5IGluc3RhbmNlIGlzIGRlcHJlY2F0ZWQ7IHBsZWFzZSB1c2UgaGlzdG9yeS5jcmVhdGVMb2NhdGlvbiBpbnN0ZWFkJyk7XG5leHBvcnRzLmNyZWF0ZUxvY2F0aW9uID0gY3JlYXRlTG9jYXRpb247IiwiJ3VzZSBzdHJpY3QnO1xuXG5leHBvcnRzLl9fZXNNb2R1bGUgPSB0cnVlO1xuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KG9iaikgeyByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyAnZGVmYXVsdCc6IG9iaiB9OyB9XG5cbnZhciBfd2FybmluZyA9IHJlcXVpcmUoJ3dhcm5pbmcnKTtcblxudmFyIF93YXJuaW5nMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX3dhcm5pbmcpO1xuXG5mdW5jdGlvbiBydW5UcmFuc2l0aW9uSG9vayhob29rLCBsb2NhdGlvbiwgY2FsbGJhY2spIHtcbiAgdmFyIHJlc3VsdCA9IGhvb2sobG9jYXRpb24sIGNhbGxiYWNrKTtcblxuICBpZiAoaG9vay5sZW5ndGggPCAyKSB7XG4gICAgLy8gQXNzdW1lIHRoZSBob29rIHJ1bnMgc3luY2hyb25vdXNseSBhbmQgYXV0b21hdGljYWxseVxuICAgIC8vIGNhbGwgdGhlIGNhbGxiYWNrIHdpdGggdGhlIHJldHVybiB2YWx1ZS5cbiAgICBjYWxsYmFjayhyZXN1bHQpO1xuICB9IGVsc2Uge1xuICAgIHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAncHJvZHVjdGlvbicgPyBfd2FybmluZzJbJ2RlZmF1bHQnXShyZXN1bHQgPT09IHVuZGVmaW5lZCwgJ1lvdSBzaG91bGQgbm90IFwicmV0dXJuXCIgaW4gYSB0cmFuc2l0aW9uIGhvb2sgd2l0aCBhIGNhbGxiYWNrIGFyZ3VtZW50OyBjYWxsIHRoZSBjYWxsYmFjayBpbnN0ZWFkJykgOiB1bmRlZmluZWQ7XG4gIH1cbn1cblxuZXhwb3J0c1snZGVmYXVsdCddID0gcnVuVHJhbnNpdGlvbkhvb2s7XG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHNbJ2RlZmF1bHQnXTsiLCIndXNlIHN0cmljdCc7XG5cbmV4cG9ydHMuX19lc01vZHVsZSA9IHRydWU7XG5cbnZhciBfZXh0ZW5kcyA9IE9iamVjdC5hc3NpZ24gfHwgZnVuY3Rpb24gKHRhcmdldCkgeyBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykgeyB2YXIgc291cmNlID0gYXJndW1lbnRzW2ldOyBmb3IgKHZhciBrZXkgaW4gc291cmNlKSB7IGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoc291cmNlLCBrZXkpKSB7IHRhcmdldFtrZXldID0gc291cmNlW2tleV07IH0gfSB9IHJldHVybiB0YXJnZXQ7IH07XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZURlZmF1bHQob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7ICdkZWZhdWx0Jzogb2JqIH07IH1cblxudmFyIF93YXJuaW5nID0gcmVxdWlyZSgnd2FybmluZycpO1xuXG52YXIgX3dhcm5pbmcyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfd2FybmluZyk7XG5cbnZhciBfRXhlY3V0aW9uRW52aXJvbm1lbnQgPSByZXF1aXJlKCcuL0V4ZWN1dGlvbkVudmlyb25tZW50Jyk7XG5cbnZhciBfUGF0aFV0aWxzID0gcmVxdWlyZSgnLi9QYXRoVXRpbHMnKTtcblxudmFyIF9ydW5UcmFuc2l0aW9uSG9vayA9IHJlcXVpcmUoJy4vcnVuVHJhbnNpdGlvbkhvb2snKTtcblxudmFyIF9ydW5UcmFuc2l0aW9uSG9vazIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9ydW5UcmFuc2l0aW9uSG9vayk7XG5cbnZhciBfZGVwcmVjYXRlID0gcmVxdWlyZSgnLi9kZXByZWNhdGUnKTtcblxudmFyIF9kZXByZWNhdGUyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfZGVwcmVjYXRlKTtcblxuZnVuY3Rpb24gdXNlQmFzZW5hbWUoY3JlYXRlSGlzdG9yeSkge1xuICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgIHZhciBvcHRpb25zID0gYXJndW1lbnRzLmxlbmd0aCA8PSAwIHx8IGFyZ3VtZW50c1swXSA9PT0gdW5kZWZpbmVkID8ge30gOiBhcmd1bWVudHNbMF07XG5cbiAgICB2YXIgaGlzdG9yeSA9IGNyZWF0ZUhpc3Rvcnkob3B0aW9ucyk7XG5cbiAgICB2YXIgYmFzZW5hbWUgPSBvcHRpb25zLmJhc2VuYW1lO1xuXG4gICAgdmFyIGNoZWNrZWRCYXNlSHJlZiA9IGZhbHNlO1xuXG4gICAgZnVuY3Rpb24gY2hlY2tCYXNlSHJlZigpIHtcbiAgICAgIGlmIChjaGVja2VkQmFzZUhyZWYpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICAvLyBBdXRvbWF0aWNhbGx5IHVzZSB0aGUgdmFsdWUgb2YgPGJhc2UgaHJlZj4gaW4gSFRNTFxuICAgICAgLy8gZG9jdW1lbnRzIGFzIGJhc2VuYW1lIGlmIGl0J3Mgbm90IGV4cGxpY2l0bHkgZ2l2ZW4uXG4gICAgICBpZiAoYmFzZW5hbWUgPT0gbnVsbCAmJiBfRXhlY3V0aW9uRW52aXJvbm1lbnQuY2FuVXNlRE9NKSB7XG4gICAgICAgIHZhciBiYXNlID0gZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2Jhc2UnKVswXTtcbiAgICAgICAgdmFyIGJhc2VIcmVmID0gYmFzZSAmJiBiYXNlLmdldEF0dHJpYnV0ZSgnaHJlZicpO1xuXG4gICAgICAgIGlmIChiYXNlSHJlZiAhPSBudWxsKSB7XG4gICAgICAgICAgYmFzZW5hbWUgPSBiYXNlSHJlZjtcblxuICAgICAgICAgIHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAncHJvZHVjdGlvbicgPyBfd2FybmluZzJbJ2RlZmF1bHQnXShmYWxzZSwgJ0F1dG9tYXRpY2FsbHkgc2V0dGluZyBiYXNlbmFtZSB1c2luZyA8YmFzZSBocmVmPiBpcyBkZXByZWNhdGVkIGFuZCB3aWxsICcgKyAnYmUgcmVtb3ZlZCBpbiB0aGUgbmV4dCBtYWpvciByZWxlYXNlLiBUaGUgc2VtYW50aWNzIG9mIDxiYXNlIGhyZWY+IGFyZSAnICsgJ3N1YnRseSBkaWZmZXJlbnQgZnJvbSBiYXNlbmFtZS4gUGxlYXNlIHBhc3MgdGhlIGJhc2VuYW1lIGV4cGxpY2l0bHkgaW4gJyArICd0aGUgb3B0aW9ucyB0byBjcmVhdGVIaXN0b3J5JykgOiB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgY2hlY2tlZEJhc2VIcmVmID0gdHJ1ZTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBhZGRCYXNlbmFtZShsb2NhdGlvbikge1xuICAgICAgY2hlY2tCYXNlSHJlZigpO1xuXG4gICAgICBpZiAoYmFzZW5hbWUgJiYgbG9jYXRpb24uYmFzZW5hbWUgPT0gbnVsbCkge1xuICAgICAgICBpZiAobG9jYXRpb24ucGF0aG5hbWUuaW5kZXhPZihiYXNlbmFtZSkgPT09IDApIHtcbiAgICAgICAgICBsb2NhdGlvbi5wYXRobmFtZSA9IGxvY2F0aW9uLnBhdGhuYW1lLnN1YnN0cmluZyhiYXNlbmFtZS5sZW5ndGgpO1xuICAgICAgICAgIGxvY2F0aW9uLmJhc2VuYW1lID0gYmFzZW5hbWU7XG5cbiAgICAgICAgICBpZiAobG9jYXRpb24ucGF0aG5hbWUgPT09ICcnKSBsb2NhdGlvbi5wYXRobmFtZSA9ICcvJztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBsb2NhdGlvbi5iYXNlbmFtZSA9ICcnO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBsb2NhdGlvbjtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwcmVwZW5kQmFzZW5hbWUobG9jYXRpb24pIHtcbiAgICAgIGNoZWNrQmFzZUhyZWYoKTtcblxuICAgICAgaWYgKCFiYXNlbmFtZSkgcmV0dXJuIGxvY2F0aW9uO1xuXG4gICAgICBpZiAodHlwZW9mIGxvY2F0aW9uID09PSAnc3RyaW5nJykgbG9jYXRpb24gPSBfUGF0aFV0aWxzLnBhcnNlUGF0aChsb2NhdGlvbik7XG5cbiAgICAgIHZhciBwbmFtZSA9IGxvY2F0aW9uLnBhdGhuYW1lO1xuICAgICAgdmFyIG5vcm1hbGl6ZWRCYXNlbmFtZSA9IGJhc2VuYW1lLnNsaWNlKC0xKSA9PT0gJy8nID8gYmFzZW5hbWUgOiBiYXNlbmFtZSArICcvJztcbiAgICAgIHZhciBub3JtYWxpemVkUGF0aG5hbWUgPSBwbmFtZS5jaGFyQXQoMCkgPT09ICcvJyA/IHBuYW1lLnNsaWNlKDEpIDogcG5hbWU7XG4gICAgICB2YXIgcGF0aG5hbWUgPSBub3JtYWxpemVkQmFzZW5hbWUgKyBub3JtYWxpemVkUGF0aG5hbWU7XG5cbiAgICAgIHJldHVybiBfZXh0ZW5kcyh7fSwgbG9jYXRpb24sIHtcbiAgICAgICAgcGF0aG5hbWU6IHBhdGhuYW1lXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBPdmVycmlkZSBhbGwgcmVhZCBtZXRob2RzIHdpdGggYmFzZW5hbWUtYXdhcmUgdmVyc2lvbnMuXG4gICAgZnVuY3Rpb24gbGlzdGVuQmVmb3JlKGhvb2spIHtcbiAgICAgIHJldHVybiBoaXN0b3J5Lmxpc3RlbkJlZm9yZShmdW5jdGlvbiAobG9jYXRpb24sIGNhbGxiYWNrKSB7XG4gICAgICAgIF9ydW5UcmFuc2l0aW9uSG9vazJbJ2RlZmF1bHQnXShob29rLCBhZGRCYXNlbmFtZShsb2NhdGlvbiksIGNhbGxiYWNrKTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGxpc3RlbihsaXN0ZW5lcikge1xuICAgICAgcmV0dXJuIGhpc3RvcnkubGlzdGVuKGZ1bmN0aW9uIChsb2NhdGlvbikge1xuICAgICAgICBsaXN0ZW5lcihhZGRCYXNlbmFtZShsb2NhdGlvbikpO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gT3ZlcnJpZGUgYWxsIHdyaXRlIG1ldGhvZHMgd2l0aCBiYXNlbmFtZS1hd2FyZSB2ZXJzaW9ucy5cbiAgICBmdW5jdGlvbiBwdXNoKGxvY2F0aW9uKSB7XG4gICAgICBoaXN0b3J5LnB1c2gocHJlcGVuZEJhc2VuYW1lKGxvY2F0aW9uKSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcmVwbGFjZShsb2NhdGlvbikge1xuICAgICAgaGlzdG9yeS5yZXBsYWNlKHByZXBlbmRCYXNlbmFtZShsb2NhdGlvbikpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNyZWF0ZVBhdGgobG9jYXRpb24pIHtcbiAgICAgIHJldHVybiBoaXN0b3J5LmNyZWF0ZVBhdGgocHJlcGVuZEJhc2VuYW1lKGxvY2F0aW9uKSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY3JlYXRlSHJlZihsb2NhdGlvbikge1xuICAgICAgcmV0dXJuIGhpc3RvcnkuY3JlYXRlSHJlZihwcmVwZW5kQmFzZW5hbWUobG9jYXRpb24pKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjcmVhdGVMb2NhdGlvbihsb2NhdGlvbikge1xuICAgICAgZm9yICh2YXIgX2xlbiA9IGFyZ3VtZW50cy5sZW5ndGgsIGFyZ3MgPSBBcnJheShfbGVuID4gMSA/IF9sZW4gLSAxIDogMCksIF9rZXkgPSAxOyBfa2V5IDwgX2xlbjsgX2tleSsrKSB7XG4gICAgICAgIGFyZ3NbX2tleSAtIDFdID0gYXJndW1lbnRzW19rZXldO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gYWRkQmFzZW5hbWUoaGlzdG9yeS5jcmVhdGVMb2NhdGlvbi5hcHBseShoaXN0b3J5LCBbcHJlcGVuZEJhc2VuYW1lKGxvY2F0aW9uKV0uY29uY2F0KGFyZ3MpKSk7XG4gICAgfVxuXG4gICAgLy8gZGVwcmVjYXRlZFxuICAgIGZ1bmN0aW9uIHB1c2hTdGF0ZShzdGF0ZSwgcGF0aCkge1xuICAgICAgaWYgKHR5cGVvZiBwYXRoID09PSAnc3RyaW5nJykgcGF0aCA9IF9QYXRoVXRpbHMucGFyc2VQYXRoKHBhdGgpO1xuXG4gICAgICBwdXNoKF9leHRlbmRzKHsgc3RhdGU6IHN0YXRlIH0sIHBhdGgpKTtcbiAgICB9XG5cbiAgICAvLyBkZXByZWNhdGVkXG4gICAgZnVuY3Rpb24gcmVwbGFjZVN0YXRlKHN0YXRlLCBwYXRoKSB7XG4gICAgICBpZiAodHlwZW9mIHBhdGggPT09ICdzdHJpbmcnKSBwYXRoID0gX1BhdGhVdGlscy5wYXJzZVBhdGgocGF0aCk7XG5cbiAgICAgIHJlcGxhY2UoX2V4dGVuZHMoeyBzdGF0ZTogc3RhdGUgfSwgcGF0aCkpO1xuICAgIH1cblxuICAgIHJldHVybiBfZXh0ZW5kcyh7fSwgaGlzdG9yeSwge1xuICAgICAgbGlzdGVuQmVmb3JlOiBsaXN0ZW5CZWZvcmUsXG4gICAgICBsaXN0ZW46IGxpc3RlbixcbiAgICAgIHB1c2g6IHB1c2gsXG4gICAgICByZXBsYWNlOiByZXBsYWNlLFxuICAgICAgY3JlYXRlUGF0aDogY3JlYXRlUGF0aCxcbiAgICAgIGNyZWF0ZUhyZWY6IGNyZWF0ZUhyZWYsXG4gICAgICBjcmVhdGVMb2NhdGlvbjogY3JlYXRlTG9jYXRpb24sXG5cbiAgICAgIHB1c2hTdGF0ZTogX2RlcHJlY2F0ZTJbJ2RlZmF1bHQnXShwdXNoU3RhdGUsICdwdXNoU3RhdGUgaXMgZGVwcmVjYXRlZDsgdXNlIHB1c2ggaW5zdGVhZCcpLFxuICAgICAgcmVwbGFjZVN0YXRlOiBfZGVwcmVjYXRlMlsnZGVmYXVsdCddKHJlcGxhY2VTdGF0ZSwgJ3JlcGxhY2VTdGF0ZSBpcyBkZXByZWNhdGVkOyB1c2UgcmVwbGFjZSBpbnN0ZWFkJylcbiAgICB9KTtcbiAgfTtcbn1cblxuZXhwb3J0c1snZGVmYXVsdCddID0gdXNlQmFzZW5hbWU7XG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHNbJ2RlZmF1bHQnXTsiLCIndXNlIHN0cmljdCc7XG5cbmV4cG9ydHMuX19lc01vZHVsZSA9IHRydWU7XG5cbnZhciBfZXh0ZW5kcyA9IE9iamVjdC5hc3NpZ24gfHwgZnVuY3Rpb24gKHRhcmdldCkgeyBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykgeyB2YXIgc291cmNlID0gYXJndW1lbnRzW2ldOyBmb3IgKHZhciBrZXkgaW4gc291cmNlKSB7IGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoc291cmNlLCBrZXkpKSB7IHRhcmdldFtrZXldID0gc291cmNlW2tleV07IH0gfSB9IHJldHVybiB0YXJnZXQ7IH07XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZURlZmF1bHQob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7ICdkZWZhdWx0Jzogb2JqIH07IH1cblxudmFyIF93YXJuaW5nID0gcmVxdWlyZSgnd2FybmluZycpO1xuXG52YXIgX3dhcm5pbmcyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfd2FybmluZyk7XG5cbnZhciBfRXhlY3V0aW9uRW52aXJvbm1lbnQgPSByZXF1aXJlKCcuL0V4ZWN1dGlvbkVudmlyb25tZW50Jyk7XG5cbnZhciBfRE9NVXRpbHMgPSByZXF1aXJlKCcuL0RPTVV0aWxzJyk7XG5cbnZhciBfZGVwcmVjYXRlID0gcmVxdWlyZSgnLi9kZXByZWNhdGUnKTtcblxudmFyIF9kZXByZWNhdGUyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfZGVwcmVjYXRlKTtcblxuZnVuY3Rpb24gc3RhcnRCZWZvcmVVbmxvYWRMaXN0ZW5lcihnZXRCZWZvcmVVbmxvYWRQcm9tcHRNZXNzYWdlKSB7XG4gIGZ1bmN0aW9uIGxpc3RlbmVyKGV2ZW50KSB7XG4gICAgdmFyIG1lc3NhZ2UgPSBnZXRCZWZvcmVVbmxvYWRQcm9tcHRNZXNzYWdlKCk7XG5cbiAgICBpZiAodHlwZW9mIG1lc3NhZ2UgPT09ICdzdHJpbmcnKSB7XG4gICAgICAoZXZlbnQgfHwgd2luZG93LmV2ZW50KS5yZXR1cm5WYWx1ZSA9IG1lc3NhZ2U7XG4gICAgICByZXR1cm4gbWVzc2FnZTtcbiAgICB9XG4gIH1cblxuICBfRE9NVXRpbHMuYWRkRXZlbnRMaXN0ZW5lcih3aW5kb3csICdiZWZvcmV1bmxvYWQnLCBsaXN0ZW5lcik7XG5cbiAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICBfRE9NVXRpbHMucmVtb3ZlRXZlbnRMaXN0ZW5lcih3aW5kb3csICdiZWZvcmV1bmxvYWQnLCBsaXN0ZW5lcik7XG4gIH07XG59XG5cbi8qKlxuICogUmV0dXJucyBhIG5ldyBjcmVhdGVIaXN0b3J5IGZ1bmN0aW9uIHRoYXQgY2FuIGJlIHVzZWQgdG8gY3JlYXRlXG4gKiBoaXN0b3J5IG9iamVjdHMgdGhhdCBrbm93IGhvdyB0byB1c2UgdGhlIGJlZm9yZXVubG9hZCBldmVudCBpbiB3ZWJcbiAqIGJyb3dzZXJzIHRvIGNhbmNlbCBuYXZpZ2F0aW9uLlxuICovXG5mdW5jdGlvbiB1c2VCZWZvcmVVbmxvYWQoY3JlYXRlSGlzdG9yeSkge1xuICByZXR1cm4gZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgICB2YXIgaGlzdG9yeSA9IGNyZWF0ZUhpc3Rvcnkob3B0aW9ucyk7XG5cbiAgICB2YXIgc3RvcEJlZm9yZVVubG9hZExpc3RlbmVyID0gdW5kZWZpbmVkO1xuICAgIHZhciBiZWZvcmVVbmxvYWRIb29rcyA9IFtdO1xuXG4gICAgZnVuY3Rpb24gZ2V0QmVmb3JlVW5sb2FkUHJvbXB0TWVzc2FnZSgpIHtcbiAgICAgIHZhciBtZXNzYWdlID0gdW5kZWZpbmVkO1xuXG4gICAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gYmVmb3JlVW5sb2FkSG9va3MubGVuZ3RoOyBtZXNzYWdlID09IG51bGwgJiYgaSA8IGxlbjsgKytpKSB7XG4gICAgICAgIG1lc3NhZ2UgPSBiZWZvcmVVbmxvYWRIb29rc1tpXS5jYWxsKCk7XG4gICAgICB9cmV0dXJuIG1lc3NhZ2U7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbGlzdGVuQmVmb3JlVW5sb2FkKGhvb2spIHtcbiAgICAgIGJlZm9yZVVubG9hZEhvb2tzLnB1c2goaG9vayk7XG5cbiAgICAgIGlmIChiZWZvcmVVbmxvYWRIb29rcy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgaWYgKF9FeGVjdXRpb25FbnZpcm9ubWVudC5jYW5Vc2VET00pIHtcbiAgICAgICAgICBzdG9wQmVmb3JlVW5sb2FkTGlzdGVuZXIgPSBzdGFydEJlZm9yZVVubG9hZExpc3RlbmVyKGdldEJlZm9yZVVubG9hZFByb21wdE1lc3NhZ2UpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAncHJvZHVjdGlvbicgPyBfd2FybmluZzJbJ2RlZmF1bHQnXShmYWxzZSwgJ2xpc3RlbkJlZm9yZVVubG9hZCBvbmx5IHdvcmtzIGluIERPTSBlbnZpcm9ubWVudHMnKSA6IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgICBiZWZvcmVVbmxvYWRIb29rcyA9IGJlZm9yZVVubG9hZEhvb2tzLmZpbHRlcihmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgICAgIHJldHVybiBpdGVtICE9PSBob29rO1xuICAgICAgICB9KTtcblxuICAgICAgICBpZiAoYmVmb3JlVW5sb2FkSG9va3MubGVuZ3RoID09PSAwICYmIHN0b3BCZWZvcmVVbmxvYWRMaXN0ZW5lcikge1xuICAgICAgICAgIHN0b3BCZWZvcmVVbmxvYWRMaXN0ZW5lcigpO1xuICAgICAgICAgIHN0b3BCZWZvcmVVbmxvYWRMaXN0ZW5lciA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gZGVwcmVjYXRlZFxuICAgIGZ1bmN0aW9uIHJlZ2lzdGVyQmVmb3JlVW5sb2FkSG9vayhob29rKSB7XG4gICAgICBpZiAoX0V4ZWN1dGlvbkVudmlyb25tZW50LmNhblVzZURPTSAmJiBiZWZvcmVVbmxvYWRIb29rcy5pbmRleE9mKGhvb2spID09PSAtMSkge1xuICAgICAgICBiZWZvcmVVbmxvYWRIb29rcy5wdXNoKGhvb2spO1xuXG4gICAgICAgIGlmIChiZWZvcmVVbmxvYWRIb29rcy5sZW5ndGggPT09IDEpIHN0b3BCZWZvcmVVbmxvYWRMaXN0ZW5lciA9IHN0YXJ0QmVmb3JlVW5sb2FkTGlzdGVuZXIoZ2V0QmVmb3JlVW5sb2FkUHJvbXB0TWVzc2FnZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gZGVwcmVjYXRlZFxuICAgIGZ1bmN0aW9uIHVucmVnaXN0ZXJCZWZvcmVVbmxvYWRIb29rKGhvb2spIHtcbiAgICAgIGlmIChiZWZvcmVVbmxvYWRIb29rcy5sZW5ndGggPiAwKSB7XG4gICAgICAgIGJlZm9yZVVubG9hZEhvb2tzID0gYmVmb3JlVW5sb2FkSG9va3MuZmlsdGVyKGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICAgICAgcmV0dXJuIGl0ZW0gIT09IGhvb2s7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmIChiZWZvcmVVbmxvYWRIb29rcy5sZW5ndGggPT09IDApIHN0b3BCZWZvcmVVbmxvYWRMaXN0ZW5lcigpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBfZXh0ZW5kcyh7fSwgaGlzdG9yeSwge1xuICAgICAgbGlzdGVuQmVmb3JlVW5sb2FkOiBsaXN0ZW5CZWZvcmVVbmxvYWQsXG5cbiAgICAgIHJlZ2lzdGVyQmVmb3JlVW5sb2FkSG9vazogX2RlcHJlY2F0ZTJbJ2RlZmF1bHQnXShyZWdpc3RlckJlZm9yZVVubG9hZEhvb2ssICdyZWdpc3RlckJlZm9yZVVubG9hZEhvb2sgaXMgZGVwcmVjYXRlZDsgdXNlIGxpc3RlbkJlZm9yZVVubG9hZCBpbnN0ZWFkJyksXG4gICAgICB1bnJlZ2lzdGVyQmVmb3JlVW5sb2FkSG9vazogX2RlcHJlY2F0ZTJbJ2RlZmF1bHQnXSh1bnJlZ2lzdGVyQmVmb3JlVW5sb2FkSG9vaywgJ3VucmVnaXN0ZXJCZWZvcmVVbmxvYWRIb29rIGlzIGRlcHJlY2F0ZWQ7IHVzZSB0aGUgY2FsbGJhY2sgcmV0dXJuZWQgZnJvbSBsaXN0ZW5CZWZvcmVVbmxvYWQgaW5zdGVhZCcpXG4gICAgfSk7XG4gIH07XG59XG5cbmV4cG9ydHNbJ2RlZmF1bHQnXSA9IHVzZUJlZm9yZVVubG9hZDtcbm1vZHVsZS5leHBvcnRzID0gZXhwb3J0c1snZGVmYXVsdCddOyIsIid1c2Ugc3RyaWN0JztcblxuZXhwb3J0cy5fX2VzTW9kdWxlID0gdHJ1ZTtcblxudmFyIF9leHRlbmRzID0gT2JqZWN0LmFzc2lnbiB8fCBmdW5jdGlvbiAodGFyZ2V0KSB7IGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7IHZhciBzb3VyY2UgPSBhcmd1bWVudHNbaV07IGZvciAodmFyIGtleSBpbiBzb3VyY2UpIHsgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChzb3VyY2UsIGtleSkpIHsgdGFyZ2V0W2tleV0gPSBzb3VyY2Vba2V5XTsgfSB9IH0gcmV0dXJuIHRhcmdldDsgfTtcblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgJ2RlZmF1bHQnOiBvYmogfTsgfVxuXG52YXIgX3dhcm5pbmcgPSByZXF1aXJlKCd3YXJuaW5nJyk7XG5cbnZhciBfd2FybmluZzIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF93YXJuaW5nKTtcblxudmFyIF9xdWVyeVN0cmluZyA9IHJlcXVpcmUoJ3F1ZXJ5LXN0cmluZycpO1xuXG52YXIgX3J1blRyYW5zaXRpb25Ib29rID0gcmVxdWlyZSgnLi9ydW5UcmFuc2l0aW9uSG9vaycpO1xuXG52YXIgX3J1blRyYW5zaXRpb25Ib29rMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX3J1blRyYW5zaXRpb25Ib29rKTtcblxudmFyIF9QYXRoVXRpbHMgPSByZXF1aXJlKCcuL1BhdGhVdGlscycpO1xuXG52YXIgX2RlcHJlY2F0ZSA9IHJlcXVpcmUoJy4vZGVwcmVjYXRlJyk7XG5cbnZhciBfZGVwcmVjYXRlMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX2RlcHJlY2F0ZSk7XG5cbnZhciBTRUFSQ0hfQkFTRV9LRVkgPSAnJHNlYXJjaEJhc2UnO1xuXG5mdW5jdGlvbiBkZWZhdWx0U3RyaW5naWZ5UXVlcnkocXVlcnkpIHtcbiAgcmV0dXJuIF9xdWVyeVN0cmluZy5zdHJpbmdpZnkocXVlcnkpLnJlcGxhY2UoLyUyMC9nLCAnKycpO1xufVxuXG52YXIgZGVmYXVsdFBhcnNlUXVlcnlTdHJpbmcgPSBfcXVlcnlTdHJpbmcucGFyc2U7XG5cbmZ1bmN0aW9uIGlzTmVzdGVkT2JqZWN0KG9iamVjdCkge1xuICBmb3IgKHZhciBwIGluIG9iamVjdCkge1xuICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqZWN0LCBwKSAmJiB0eXBlb2Ygb2JqZWN0W3BdID09PSAnb2JqZWN0JyAmJiAhQXJyYXkuaXNBcnJheShvYmplY3RbcF0pICYmIG9iamVjdFtwXSAhPT0gbnVsbCkgcmV0dXJuIHRydWU7XG4gIH1yZXR1cm4gZmFsc2U7XG59XG5cbi8qKlxuICogUmV0dXJucyBhIG5ldyBjcmVhdGVIaXN0b3J5IGZ1bmN0aW9uIHRoYXQgbWF5IGJlIHVzZWQgdG8gY3JlYXRlXG4gKiBoaXN0b3J5IG9iamVjdHMgdGhhdCBrbm93IGhvdyB0byBoYW5kbGUgVVJMIHF1ZXJpZXMuXG4gKi9cbmZ1bmN0aW9uIHVzZVF1ZXJpZXMoY3JlYXRlSGlzdG9yeSkge1xuICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgIHZhciBvcHRpb25zID0gYXJndW1lbnRzLmxlbmd0aCA8PSAwIHx8IGFyZ3VtZW50c1swXSA9PT0gdW5kZWZpbmVkID8ge30gOiBhcmd1bWVudHNbMF07XG5cbiAgICB2YXIgaGlzdG9yeSA9IGNyZWF0ZUhpc3Rvcnkob3B0aW9ucyk7XG5cbiAgICB2YXIgc3RyaW5naWZ5UXVlcnkgPSBvcHRpb25zLnN0cmluZ2lmeVF1ZXJ5O1xuICAgIHZhciBwYXJzZVF1ZXJ5U3RyaW5nID0gb3B0aW9ucy5wYXJzZVF1ZXJ5U3RyaW5nO1xuXG4gICAgaWYgKHR5cGVvZiBzdHJpbmdpZnlRdWVyeSAhPT0gJ2Z1bmN0aW9uJykgc3RyaW5naWZ5UXVlcnkgPSBkZWZhdWx0U3RyaW5naWZ5UXVlcnk7XG5cbiAgICBpZiAodHlwZW9mIHBhcnNlUXVlcnlTdHJpbmcgIT09ICdmdW5jdGlvbicpIHBhcnNlUXVlcnlTdHJpbmcgPSBkZWZhdWx0UGFyc2VRdWVyeVN0cmluZztcblxuICAgIGZ1bmN0aW9uIGFkZFF1ZXJ5KGxvY2F0aW9uKSB7XG4gICAgICBpZiAobG9jYXRpb24ucXVlcnkgPT0gbnVsbCkge1xuICAgICAgICB2YXIgc2VhcmNoID0gbG9jYXRpb24uc2VhcmNoO1xuXG4gICAgICAgIGxvY2F0aW9uLnF1ZXJ5ID0gcGFyc2VRdWVyeVN0cmluZyhzZWFyY2guc3Vic3RyaW5nKDEpKTtcbiAgICAgICAgbG9jYXRpb25bU0VBUkNIX0JBU0VfS0VZXSA9IHsgc2VhcmNoOiBzZWFyY2gsIHNlYXJjaEJhc2U6ICcnIH07XG4gICAgICB9XG5cbiAgICAgIC8vIFRPRE86IEluc3RlYWQgb2YgYWxsIHRoZSBib29rLWtlZXBpbmcgaGVyZSwgdGhpcyBzaG91bGQganVzdCBzdHJpcCB0aGVcbiAgICAgIC8vIHN0cmluZ2lmaWVkIHF1ZXJ5IGZyb20gdGhlIHNlYXJjaC5cblxuICAgICAgcmV0dXJuIGxvY2F0aW9uO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGFwcGVuZFF1ZXJ5KGxvY2F0aW9uLCBxdWVyeSkge1xuICAgICAgdmFyIF9leHRlbmRzMjtcblxuICAgICAgdmFyIHNlYXJjaEJhc2VTcGVjID0gbG9jYXRpb25bU0VBUkNIX0JBU0VfS0VZXTtcbiAgICAgIHZhciBxdWVyeVN0cmluZyA9IHF1ZXJ5ID8gc3RyaW5naWZ5UXVlcnkocXVlcnkpIDogJyc7XG4gICAgICBpZiAoIXNlYXJjaEJhc2VTcGVjICYmICFxdWVyeVN0cmluZykge1xuICAgICAgICByZXR1cm4gbG9jYXRpb247XG4gICAgICB9XG5cbiAgICAgIHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAncHJvZHVjdGlvbicgPyBfd2FybmluZzJbJ2RlZmF1bHQnXShzdHJpbmdpZnlRdWVyeSAhPT0gZGVmYXVsdFN0cmluZ2lmeVF1ZXJ5IHx8ICFpc05lc3RlZE9iamVjdChxdWVyeSksICd1c2VRdWVyaWVzIGRvZXMgbm90IHN0cmluZ2lmeSBuZXN0ZWQgcXVlcnkgb2JqZWN0cyBieSBkZWZhdWx0OyAnICsgJ3VzZSBhIGN1c3RvbSBzdHJpbmdpZnlRdWVyeSBmdW5jdGlvbicpIDogdW5kZWZpbmVkO1xuXG4gICAgICBpZiAodHlwZW9mIGxvY2F0aW9uID09PSAnc3RyaW5nJykgbG9jYXRpb24gPSBfUGF0aFV0aWxzLnBhcnNlUGF0aChsb2NhdGlvbik7XG5cbiAgICAgIHZhciBzZWFyY2hCYXNlID0gdW5kZWZpbmVkO1xuICAgICAgaWYgKHNlYXJjaEJhc2VTcGVjICYmIGxvY2F0aW9uLnNlYXJjaCA9PT0gc2VhcmNoQmFzZVNwZWMuc2VhcmNoKSB7XG4gICAgICAgIHNlYXJjaEJhc2UgPSBzZWFyY2hCYXNlU3BlYy5zZWFyY2hCYXNlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc2VhcmNoQmFzZSA9IGxvY2F0aW9uLnNlYXJjaCB8fCAnJztcbiAgICAgIH1cblxuICAgICAgdmFyIHNlYXJjaCA9IHNlYXJjaEJhc2U7XG4gICAgICBpZiAocXVlcnlTdHJpbmcpIHtcbiAgICAgICAgc2VhcmNoICs9IChzZWFyY2ggPyAnJicgOiAnPycpICsgcXVlcnlTdHJpbmc7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBfZXh0ZW5kcyh7fSwgbG9jYXRpb24sIChfZXh0ZW5kczIgPSB7XG4gICAgICAgIHNlYXJjaDogc2VhcmNoXG4gICAgICB9LCBfZXh0ZW5kczJbU0VBUkNIX0JBU0VfS0VZXSA9IHsgc2VhcmNoOiBzZWFyY2gsIHNlYXJjaEJhc2U6IHNlYXJjaEJhc2UgfSwgX2V4dGVuZHMyKSk7XG4gICAgfVxuXG4gICAgLy8gT3ZlcnJpZGUgYWxsIHJlYWQgbWV0aG9kcyB3aXRoIHF1ZXJ5LWF3YXJlIHZlcnNpb25zLlxuICAgIGZ1bmN0aW9uIGxpc3RlbkJlZm9yZShob29rKSB7XG4gICAgICByZXR1cm4gaGlzdG9yeS5saXN0ZW5CZWZvcmUoZnVuY3Rpb24gKGxvY2F0aW9uLCBjYWxsYmFjaykge1xuICAgICAgICBfcnVuVHJhbnNpdGlvbkhvb2syWydkZWZhdWx0J10oaG9vaywgYWRkUXVlcnkobG9jYXRpb24pLCBjYWxsYmFjayk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBsaXN0ZW4obGlzdGVuZXIpIHtcbiAgICAgIHJldHVybiBoaXN0b3J5Lmxpc3RlbihmdW5jdGlvbiAobG9jYXRpb24pIHtcbiAgICAgICAgbGlzdGVuZXIoYWRkUXVlcnkobG9jYXRpb24pKTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIE92ZXJyaWRlIGFsbCB3cml0ZSBtZXRob2RzIHdpdGggcXVlcnktYXdhcmUgdmVyc2lvbnMuXG4gICAgZnVuY3Rpb24gcHVzaChsb2NhdGlvbikge1xuICAgICAgaGlzdG9yeS5wdXNoKGFwcGVuZFF1ZXJ5KGxvY2F0aW9uLCBsb2NhdGlvbi5xdWVyeSkpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJlcGxhY2UobG9jYXRpb24pIHtcbiAgICAgIGhpc3RvcnkucmVwbGFjZShhcHBlbmRRdWVyeShsb2NhdGlvbiwgbG9jYXRpb24ucXVlcnkpKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjcmVhdGVQYXRoKGxvY2F0aW9uLCBxdWVyeSkge1xuICAgICAgcHJvY2Vzcy5lbnYuTk9ERV9FTlYgIT09ICdwcm9kdWN0aW9uJyA/IF93YXJuaW5nMlsnZGVmYXVsdCddKCFxdWVyeSwgJ3RoZSBxdWVyeSBhcmd1bWVudCB0byBjcmVhdGVQYXRoIGlzIGRlcHJlY2F0ZWQ7IHVzZSBhIGxvY2F0aW9uIGRlc2NyaXB0b3IgaW5zdGVhZCcpIDogdW5kZWZpbmVkO1xuXG4gICAgICByZXR1cm4gaGlzdG9yeS5jcmVhdGVQYXRoKGFwcGVuZFF1ZXJ5KGxvY2F0aW9uLCBxdWVyeSB8fCBsb2NhdGlvbi5xdWVyeSkpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNyZWF0ZUhyZWYobG9jYXRpb24sIHF1ZXJ5KSB7XG4gICAgICBwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ3Byb2R1Y3Rpb24nID8gX3dhcm5pbmcyWydkZWZhdWx0J10oIXF1ZXJ5LCAndGhlIHF1ZXJ5IGFyZ3VtZW50IHRvIGNyZWF0ZUhyZWYgaXMgZGVwcmVjYXRlZDsgdXNlIGEgbG9jYXRpb24gZGVzY3JpcHRvciBpbnN0ZWFkJykgOiB1bmRlZmluZWQ7XG5cbiAgICAgIHJldHVybiBoaXN0b3J5LmNyZWF0ZUhyZWYoYXBwZW5kUXVlcnkobG9jYXRpb24sIHF1ZXJ5IHx8IGxvY2F0aW9uLnF1ZXJ5KSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY3JlYXRlTG9jYXRpb24obG9jYXRpb24pIHtcbiAgICAgIGZvciAodmFyIF9sZW4gPSBhcmd1bWVudHMubGVuZ3RoLCBhcmdzID0gQXJyYXkoX2xlbiA+IDEgPyBfbGVuIC0gMSA6IDApLCBfa2V5ID0gMTsgX2tleSA8IF9sZW47IF9rZXkrKykge1xuICAgICAgICBhcmdzW19rZXkgLSAxXSA9IGFyZ3VtZW50c1tfa2V5XTtcbiAgICAgIH1cblxuICAgICAgdmFyIGZ1bGxMb2NhdGlvbiA9IGhpc3RvcnkuY3JlYXRlTG9jYXRpb24uYXBwbHkoaGlzdG9yeSwgW2FwcGVuZFF1ZXJ5KGxvY2F0aW9uLCBsb2NhdGlvbi5xdWVyeSldLmNvbmNhdChhcmdzKSk7XG4gICAgICBpZiAobG9jYXRpb24ucXVlcnkpIHtcbiAgICAgICAgZnVsbExvY2F0aW9uLnF1ZXJ5ID0gbG9jYXRpb24ucXVlcnk7XG4gICAgICB9XG4gICAgICByZXR1cm4gYWRkUXVlcnkoZnVsbExvY2F0aW9uKTtcbiAgICB9XG5cbiAgICAvLyBkZXByZWNhdGVkXG4gICAgZnVuY3Rpb24gcHVzaFN0YXRlKHN0YXRlLCBwYXRoLCBxdWVyeSkge1xuICAgICAgaWYgKHR5cGVvZiBwYXRoID09PSAnc3RyaW5nJykgcGF0aCA9IF9QYXRoVXRpbHMucGFyc2VQYXRoKHBhdGgpO1xuXG4gICAgICBwdXNoKF9leHRlbmRzKHsgc3RhdGU6IHN0YXRlIH0sIHBhdGgsIHsgcXVlcnk6IHF1ZXJ5IH0pKTtcbiAgICB9XG5cbiAgICAvLyBkZXByZWNhdGVkXG4gICAgZnVuY3Rpb24gcmVwbGFjZVN0YXRlKHN0YXRlLCBwYXRoLCBxdWVyeSkge1xuICAgICAgaWYgKHR5cGVvZiBwYXRoID09PSAnc3RyaW5nJykgcGF0aCA9IF9QYXRoVXRpbHMucGFyc2VQYXRoKHBhdGgpO1xuXG4gICAgICByZXBsYWNlKF9leHRlbmRzKHsgc3RhdGU6IHN0YXRlIH0sIHBhdGgsIHsgcXVlcnk6IHF1ZXJ5IH0pKTtcbiAgICB9XG5cbiAgICByZXR1cm4gX2V4dGVuZHMoe30sIGhpc3RvcnksIHtcbiAgICAgIGxpc3RlbkJlZm9yZTogbGlzdGVuQmVmb3JlLFxuICAgICAgbGlzdGVuOiBsaXN0ZW4sXG4gICAgICBwdXNoOiBwdXNoLFxuICAgICAgcmVwbGFjZTogcmVwbGFjZSxcbiAgICAgIGNyZWF0ZVBhdGg6IGNyZWF0ZVBhdGgsXG4gICAgICBjcmVhdGVIcmVmOiBjcmVhdGVIcmVmLFxuICAgICAgY3JlYXRlTG9jYXRpb246IGNyZWF0ZUxvY2F0aW9uLFxuXG4gICAgICBwdXNoU3RhdGU6IF9kZXByZWNhdGUyWydkZWZhdWx0J10ocHVzaFN0YXRlLCAncHVzaFN0YXRlIGlzIGRlcHJlY2F0ZWQ7IHVzZSBwdXNoIGluc3RlYWQnKSxcbiAgICAgIHJlcGxhY2VTdGF0ZTogX2RlcHJlY2F0ZTJbJ2RlZmF1bHQnXShyZXBsYWNlU3RhdGUsICdyZXBsYWNlU3RhdGUgaXMgZGVwcmVjYXRlZDsgdXNlIHJlcGxhY2UgaW5zdGVhZCcpXG4gICAgfSk7XG4gIH07XG59XG5cbmV4cG9ydHNbJ2RlZmF1bHQnXSA9IHVzZVF1ZXJpZXM7XG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHNbJ2RlZmF1bHQnXTsiLCIvKipcbiAqIENvcHlyaWdodCAyMDEzLTIwMTUsIEZhY2Vib29rLCBJbmMuXG4gKiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuICpcbiAqIFRoaXMgc291cmNlIGNvZGUgaXMgbGljZW5zZWQgdW5kZXIgdGhlIEJTRC1zdHlsZSBsaWNlbnNlIGZvdW5kIGluIHRoZVxuICogTElDRU5TRSBmaWxlIGluIHRoZSByb290IGRpcmVjdG9yeSBvZiB0aGlzIHNvdXJjZSB0cmVlLiBBbiBhZGRpdGlvbmFsIGdyYW50XG4gKiBvZiBwYXRlbnQgcmlnaHRzIGNhbiBiZSBmb3VuZCBpbiB0aGUgUEFURU5UUyBmaWxlIGluIHRoZSBzYW1lIGRpcmVjdG9yeS5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbi8qKlxuICogVXNlIGludmFyaWFudCgpIHRvIGFzc2VydCBzdGF0ZSB3aGljaCB5b3VyIHByb2dyYW0gYXNzdW1lcyB0byBiZSB0cnVlLlxuICpcbiAqIFByb3ZpZGUgc3ByaW50Zi1zdHlsZSBmb3JtYXQgKG9ubHkgJXMgaXMgc3VwcG9ydGVkKSBhbmQgYXJndW1lbnRzXG4gKiB0byBwcm92aWRlIGluZm9ybWF0aW9uIGFib3V0IHdoYXQgYnJva2UgYW5kIHdoYXQgeW91IHdlcmVcbiAqIGV4cGVjdGluZy5cbiAqXG4gKiBUaGUgaW52YXJpYW50IG1lc3NhZ2Ugd2lsbCBiZSBzdHJpcHBlZCBpbiBwcm9kdWN0aW9uLCBidXQgdGhlIGludmFyaWFudFxuICogd2lsbCByZW1haW4gdG8gZW5zdXJlIGxvZ2ljIGRvZXMgbm90IGRpZmZlciBpbiBwcm9kdWN0aW9uLlxuICovXG5cbnZhciBpbnZhcmlhbnQgPSBmdW5jdGlvbihjb25kaXRpb24sIGZvcm1hdCwgYSwgYiwgYywgZCwgZSwgZikge1xuICBpZiAocHJvY2Vzcy5lbnYuTk9ERV9FTlYgIT09ICdwcm9kdWN0aW9uJykge1xuICAgIGlmIChmb3JtYXQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdpbnZhcmlhbnQgcmVxdWlyZXMgYW4gZXJyb3IgbWVzc2FnZSBhcmd1bWVudCcpO1xuICAgIH1cbiAgfVxuXG4gIGlmICghY29uZGl0aW9uKSB7XG4gICAgdmFyIGVycm9yO1xuICAgIGlmIChmb3JtYXQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgZXJyb3IgPSBuZXcgRXJyb3IoXG4gICAgICAgICdNaW5pZmllZCBleGNlcHRpb24gb2NjdXJyZWQ7IHVzZSB0aGUgbm9uLW1pbmlmaWVkIGRldiBlbnZpcm9ubWVudCAnICtcbiAgICAgICAgJ2ZvciB0aGUgZnVsbCBlcnJvciBtZXNzYWdlIGFuZCBhZGRpdGlvbmFsIGhlbHBmdWwgd2FybmluZ3MuJ1xuICAgICAgKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIGFyZ3MgPSBbYSwgYiwgYywgZCwgZSwgZl07XG4gICAgICB2YXIgYXJnSW5kZXggPSAwO1xuICAgICAgZXJyb3IgPSBuZXcgRXJyb3IoXG4gICAgICAgIGZvcm1hdC5yZXBsYWNlKC8lcy9nLCBmdW5jdGlvbigpIHsgcmV0dXJuIGFyZ3NbYXJnSW5kZXgrK107IH0pXG4gICAgICApO1xuICAgICAgZXJyb3IubmFtZSA9ICdJbnZhcmlhbnQgVmlvbGF0aW9uJztcbiAgICB9XG5cbiAgICBlcnJvci5mcmFtZXNUb1BvcCA9IDE7IC8vIHdlIGRvbid0IGNhcmUgYWJvdXQgaW52YXJpYW50J3Mgb3duIGZyYW1lXG4gICAgdGhyb3cgZXJyb3I7XG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gaW52YXJpYW50O1xuIiwiLyoqXG4gKiBsb2Rhc2ggMy4xLjQgKEN1c3RvbSBCdWlsZCkgPGh0dHBzOi8vbG9kYXNoLmNvbS8+XG4gKiBCdWlsZDogYGxvZGFzaCBtb2Rlcm4gbW9kdWxhcml6ZSBleHBvcnRzPVwibnBtXCIgLW8gLi9gXG4gKiBDb3B5cmlnaHQgMjAxMi0yMDE1IFRoZSBEb2pvIEZvdW5kYXRpb24gPGh0dHA6Ly9kb2pvZm91bmRhdGlvbi5vcmcvPlxuICogQmFzZWQgb24gVW5kZXJzY29yZS5qcyAxLjguMyA8aHR0cDovL3VuZGVyc2NvcmVqcy5vcmcvTElDRU5TRT5cbiAqIENvcHlyaWdodCAyMDA5LTIwMTUgSmVyZW15IEFzaGtlbmFzLCBEb2N1bWVudENsb3VkIGFuZCBJbnZlc3RpZ2F0aXZlIFJlcG9ydGVycyAmIEVkaXRvcnNcbiAqIEF2YWlsYWJsZSB1bmRlciBNSVQgbGljZW5zZSA8aHR0cHM6Ly9sb2Rhc2guY29tL2xpY2Vuc2U+XG4gKi9cbnZhciBpc0FyZ3VtZW50cyA9IHJlcXVpcmUoJ2xvZGFzaC5pc2FyZ3VtZW50cycpLFxuICAgIGlzQXJyYXkgPSByZXF1aXJlKCdsb2Rhc2guaXNhcnJheScpO1xuXG4vKipcbiAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIG9iamVjdC1saWtlLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBgdmFsdWVgIGlzIG9iamVjdC1saWtlLCBlbHNlIGBmYWxzZWAuXG4gKi9cbmZ1bmN0aW9uIGlzT2JqZWN0TGlrZSh2YWx1ZSkge1xuICByZXR1cm4gISF2YWx1ZSAmJiB0eXBlb2YgdmFsdWUgPT0gJ29iamVjdCc7XG59XG5cbi8qKlxuICogVXNlZCBhcyB0aGUgW21heGltdW0gbGVuZ3RoXShodHRwOi8vZWNtYS1pbnRlcm5hdGlvbmFsLm9yZy9lY21hLTI2Mi82LjAvI3NlYy1udW1iZXIubWF4X3NhZmVfaW50ZWdlcilcbiAqIG9mIGFuIGFycmF5LWxpa2UgdmFsdWUuXG4gKi9cbnZhciBNQVhfU0FGRV9JTlRFR0VSID0gOTAwNzE5OTI1NDc0MDk5MTtcblxuLyoqXG4gKiBBcHBlbmRzIHRoZSBlbGVtZW50cyBvZiBgdmFsdWVzYCB0byBgYXJyYXlgLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge0FycmF5fSBhcnJheSBUaGUgYXJyYXkgdG8gbW9kaWZ5LlxuICogQHBhcmFtIHtBcnJheX0gdmFsdWVzIFRoZSB2YWx1ZXMgdG8gYXBwZW5kLlxuICogQHJldHVybnMge0FycmF5fSBSZXR1cm5zIGBhcnJheWAuXG4gKi9cbmZ1bmN0aW9uIGFycmF5UHVzaChhcnJheSwgdmFsdWVzKSB7XG4gIHZhciBpbmRleCA9IC0xLFxuICAgICAgbGVuZ3RoID0gdmFsdWVzLmxlbmd0aCxcbiAgICAgIG9mZnNldCA9IGFycmF5Lmxlbmd0aDtcblxuICB3aGlsZSAoKytpbmRleCA8IGxlbmd0aCkge1xuICAgIGFycmF5W29mZnNldCArIGluZGV4XSA9IHZhbHVlc1tpbmRleF07XG4gIH1cbiAgcmV0dXJuIGFycmF5O1xufVxuXG4vKipcbiAqIFRoZSBiYXNlIGltcGxlbWVudGF0aW9uIG9mIGBfLmZsYXR0ZW5gIHdpdGggYWRkZWQgc3VwcG9ydCBmb3IgcmVzdHJpY3RpbmdcbiAqIGZsYXR0ZW5pbmcgYW5kIHNwZWNpZnlpbmcgdGhlIHN0YXJ0IGluZGV4LlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge0FycmF5fSBhcnJheSBUaGUgYXJyYXkgdG8gZmxhdHRlbi5cbiAqIEBwYXJhbSB7Ym9vbGVhbn0gW2lzRGVlcF0gU3BlY2lmeSBhIGRlZXAgZmxhdHRlbi5cbiAqIEBwYXJhbSB7Ym9vbGVhbn0gW2lzU3RyaWN0XSBSZXN0cmljdCBmbGF0dGVuaW5nIHRvIGFycmF5cy1saWtlIG9iamVjdHMuXG4gKiBAcGFyYW0ge0FycmF5fSBbcmVzdWx0PVtdXSBUaGUgaW5pdGlhbCByZXN1bHQgdmFsdWUuXG4gKiBAcmV0dXJucyB7QXJyYXl9IFJldHVybnMgdGhlIG5ldyBmbGF0dGVuZWQgYXJyYXkuXG4gKi9cbmZ1bmN0aW9uIGJhc2VGbGF0dGVuKGFycmF5LCBpc0RlZXAsIGlzU3RyaWN0LCByZXN1bHQpIHtcbiAgcmVzdWx0IHx8IChyZXN1bHQgPSBbXSk7XG5cbiAgdmFyIGluZGV4ID0gLTEsXG4gICAgICBsZW5ndGggPSBhcnJheS5sZW5ndGg7XG5cbiAgd2hpbGUgKCsraW5kZXggPCBsZW5ndGgpIHtcbiAgICB2YXIgdmFsdWUgPSBhcnJheVtpbmRleF07XG4gICAgaWYgKGlzT2JqZWN0TGlrZSh2YWx1ZSkgJiYgaXNBcnJheUxpa2UodmFsdWUpICYmXG4gICAgICAgIChpc1N0cmljdCB8fCBpc0FycmF5KHZhbHVlKSB8fCBpc0FyZ3VtZW50cyh2YWx1ZSkpKSB7XG4gICAgICBpZiAoaXNEZWVwKSB7XG4gICAgICAgIC8vIFJlY3Vyc2l2ZWx5IGZsYXR0ZW4gYXJyYXlzIChzdXNjZXB0aWJsZSB0byBjYWxsIHN0YWNrIGxpbWl0cykuXG4gICAgICAgIGJhc2VGbGF0dGVuKHZhbHVlLCBpc0RlZXAsIGlzU3RyaWN0LCByZXN1bHQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYXJyYXlQdXNoKHJlc3VsdCwgdmFsdWUpO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoIWlzU3RyaWN0KSB7XG4gICAgICByZXN1bHRbcmVzdWx0Lmxlbmd0aF0gPSB2YWx1ZTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuLyoqXG4gKiBUaGUgYmFzZSBpbXBsZW1lbnRhdGlvbiBvZiBgXy5wcm9wZXJ0eWAgd2l0aG91dCBzdXBwb3J0IGZvciBkZWVwIHBhdGhzLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge3N0cmluZ30ga2V5IFRoZSBrZXkgb2YgdGhlIHByb3BlcnR5IHRvIGdldC5cbiAqIEByZXR1cm5zIHtGdW5jdGlvbn0gUmV0dXJucyB0aGUgbmV3IGZ1bmN0aW9uLlxuICovXG5mdW5jdGlvbiBiYXNlUHJvcGVydHkoa2V5KSB7XG4gIHJldHVybiBmdW5jdGlvbihvYmplY3QpIHtcbiAgICByZXR1cm4gb2JqZWN0ID09IG51bGwgPyB1bmRlZmluZWQgOiBvYmplY3Rba2V5XTtcbiAgfTtcbn1cblxuLyoqXG4gKiBHZXRzIHRoZSBcImxlbmd0aFwiIHByb3BlcnR5IHZhbHVlIG9mIGBvYmplY3RgLlxuICpcbiAqICoqTm90ZToqKiBUaGlzIGZ1bmN0aW9uIGlzIHVzZWQgdG8gYXZvaWQgYSBbSklUIGJ1Z10oaHR0cHM6Ly9idWdzLndlYmtpdC5vcmcvc2hvd19idWcuY2dpP2lkPTE0Mjc5MilcbiAqIHRoYXQgYWZmZWN0cyBTYWZhcmkgb24gYXQgbGVhc3QgaU9TIDguMS04LjMgQVJNNjQuXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3QgVGhlIG9iamVjdCB0byBxdWVyeS5cbiAqIEByZXR1cm5zIHsqfSBSZXR1cm5zIHRoZSBcImxlbmd0aFwiIHZhbHVlLlxuICovXG52YXIgZ2V0TGVuZ3RoID0gYmFzZVByb3BlcnR5KCdsZW5ndGgnKTtcblxuLyoqXG4gKiBDaGVja3MgaWYgYHZhbHVlYCBpcyBhcnJheS1saWtlLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBgdmFsdWVgIGlzIGFycmF5LWxpa2UsIGVsc2UgYGZhbHNlYC5cbiAqL1xuZnVuY3Rpb24gaXNBcnJheUxpa2UodmFsdWUpIHtcbiAgcmV0dXJuIHZhbHVlICE9IG51bGwgJiYgaXNMZW5ndGgoZ2V0TGVuZ3RoKHZhbHVlKSk7XG59XG5cbi8qKlxuICogQ2hlY2tzIGlmIGB2YWx1ZWAgaXMgYSB2YWxpZCBhcnJheS1saWtlIGxlbmd0aC5cbiAqXG4gKiAqKk5vdGU6KiogVGhpcyBmdW5jdGlvbiBpcyBiYXNlZCBvbiBbYFRvTGVuZ3RoYF0oaHR0cDovL2VjbWEtaW50ZXJuYXRpb25hbC5vcmcvZWNtYS0yNjIvNi4wLyNzZWMtdG9sZW5ndGgpLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBgdmFsdWVgIGlzIGEgdmFsaWQgbGVuZ3RoLCBlbHNlIGBmYWxzZWAuXG4gKi9cbmZ1bmN0aW9uIGlzTGVuZ3RoKHZhbHVlKSB7XG4gIHJldHVybiB0eXBlb2YgdmFsdWUgPT0gJ251bWJlcicgJiYgdmFsdWUgPiAtMSAmJiB2YWx1ZSAlIDEgPT0gMCAmJiB2YWx1ZSA8PSBNQVhfU0FGRV9JTlRFR0VSO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGJhc2VGbGF0dGVuO1xuIiwiLyoqXG4gKiBsb2Rhc2ggMy4wLjMgKEN1c3RvbSBCdWlsZCkgPGh0dHBzOi8vbG9kYXNoLmNvbS8+XG4gKiBCdWlsZDogYGxvZGFzaCBtb2R1bGFyaXplIGV4cG9ydHM9XCJucG1cIiAtbyAuL2BcbiAqIENvcHlyaWdodCAyMDEyLTIwMTYgVGhlIERvam8gRm91bmRhdGlvbiA8aHR0cDovL2Rvam9mb3VuZGF0aW9uLm9yZy8+XG4gKiBCYXNlZCBvbiBVbmRlcnNjb3JlLmpzIDEuOC4zIDxodHRwOi8vdW5kZXJzY29yZWpzLm9yZy9MSUNFTlNFPlxuICogQ29weXJpZ2h0IDIwMDktMjAxNiBKZXJlbXkgQXNoa2VuYXMsIERvY3VtZW50Q2xvdWQgYW5kIEludmVzdGlnYXRpdmUgUmVwb3J0ZXJzICYgRWRpdG9yc1xuICogQXZhaWxhYmxlIHVuZGVyIE1JVCBsaWNlbnNlIDxodHRwczovL2xvZGFzaC5jb20vbGljZW5zZT5cbiAqL1xuXG4vKipcbiAqIFRoZSBiYXNlIGltcGxlbWVudGF0aW9uIG9mIGBiYXNlRm9ySW5gIGFuZCBgYmFzZUZvck93bmAgd2hpY2ggaXRlcmF0ZXNcbiAqIG92ZXIgYG9iamVjdGAgcHJvcGVydGllcyByZXR1cm5lZCBieSBga2V5c0Z1bmNgIGludm9raW5nIGBpdGVyYXRlZWAgZm9yXG4gKiBlYWNoIHByb3BlcnR5LiBJdGVyYXRlZSBmdW5jdGlvbnMgbWF5IGV4aXQgaXRlcmF0aW9uIGVhcmx5IGJ5IGV4cGxpY2l0bHlcbiAqIHJldHVybmluZyBgZmFsc2VgLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0IFRoZSBvYmplY3QgdG8gaXRlcmF0ZSBvdmVyLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gaXRlcmF0ZWUgVGhlIGZ1bmN0aW9uIGludm9rZWQgcGVyIGl0ZXJhdGlvbi5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IGtleXNGdW5jIFRoZSBmdW5jdGlvbiB0byBnZXQgdGhlIGtleXMgb2YgYG9iamVjdGAuXG4gKiBAcmV0dXJucyB7T2JqZWN0fSBSZXR1cm5zIGBvYmplY3RgLlxuICovXG52YXIgYmFzZUZvciA9IGNyZWF0ZUJhc2VGb3IoKTtcblxuLyoqXG4gKiBDcmVhdGVzIGEgYmFzZSBmdW5jdGlvbiBmb3IgbWV0aG9kcyBsaWtlIGBfLmZvckluYC5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHtib29sZWFufSBbZnJvbVJpZ2h0XSBTcGVjaWZ5IGl0ZXJhdGluZyBmcm9tIHJpZ2h0IHRvIGxlZnQuXG4gKiBAcmV0dXJucyB7RnVuY3Rpb259IFJldHVybnMgdGhlIG5ldyBiYXNlIGZ1bmN0aW9uLlxuICovXG5mdW5jdGlvbiBjcmVhdGVCYXNlRm9yKGZyb21SaWdodCkge1xuICByZXR1cm4gZnVuY3Rpb24ob2JqZWN0LCBpdGVyYXRlZSwga2V5c0Z1bmMpIHtcbiAgICB2YXIgaW5kZXggPSAtMSxcbiAgICAgICAgaXRlcmFibGUgPSBPYmplY3Qob2JqZWN0KSxcbiAgICAgICAgcHJvcHMgPSBrZXlzRnVuYyhvYmplY3QpLFxuICAgICAgICBsZW5ndGggPSBwcm9wcy5sZW5ndGg7XG5cbiAgICB3aGlsZSAobGVuZ3RoLS0pIHtcbiAgICAgIHZhciBrZXkgPSBwcm9wc1tmcm9tUmlnaHQgPyBsZW5ndGggOiArK2luZGV4XTtcbiAgICAgIGlmIChpdGVyYXRlZShpdGVyYWJsZVtrZXldLCBrZXksIGl0ZXJhYmxlKSA9PT0gZmFsc2UpIHtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBvYmplY3Q7XG4gIH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gYmFzZUZvcjtcbiIsIi8qKlxuICogbG9kYXNoIDMuMS4wIChDdXN0b20gQnVpbGQpIDxodHRwczovL2xvZGFzaC5jb20vPlxuICogQnVpbGQ6IGBsb2Rhc2ggbW9kZXJuIG1vZHVsYXJpemUgZXhwb3J0cz1cIm5wbVwiIC1vIC4vYFxuICogQ29weXJpZ2h0IDIwMTItMjAxNSBUaGUgRG9qbyBGb3VuZGF0aW9uIDxodHRwOi8vZG9qb2ZvdW5kYXRpb24ub3JnLz5cbiAqIEJhc2VkIG9uIFVuZGVyc2NvcmUuanMgMS44LjIgPGh0dHA6Ly91bmRlcnNjb3JlanMub3JnL0xJQ0VOU0U+XG4gKiBDb3B5cmlnaHQgMjAwOS0yMDE1IEplcmVteSBBc2hrZW5hcywgRG9jdW1lbnRDbG91ZCBhbmQgSW52ZXN0aWdhdGl2ZSBSZXBvcnRlcnMgJiBFZGl0b3JzXG4gKiBBdmFpbGFibGUgdW5kZXIgTUlUIGxpY2Vuc2UgPGh0dHBzOi8vbG9kYXNoLmNvbS9saWNlbnNlPlxuICovXG5cbi8qKlxuICogVGhlIGJhc2UgaW1wbGVtZW50YXRpb24gb2YgYF8uaW5kZXhPZmAgd2l0aG91dCBzdXBwb3J0IGZvciBiaW5hcnkgc2VhcmNoZXMuXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7QXJyYXl9IGFycmF5IFRoZSBhcnJheSB0byBzZWFyY2guXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBzZWFyY2ggZm9yLlxuICogQHBhcmFtIHtudW1iZXJ9IGZyb21JbmRleCBUaGUgaW5kZXggdG8gc2VhcmNoIGZyb20uXG4gKiBAcmV0dXJucyB7bnVtYmVyfSBSZXR1cm5zIHRoZSBpbmRleCBvZiB0aGUgbWF0Y2hlZCB2YWx1ZSwgZWxzZSBgLTFgLlxuICovXG5mdW5jdGlvbiBiYXNlSW5kZXhPZihhcnJheSwgdmFsdWUsIGZyb21JbmRleCkge1xuICBpZiAodmFsdWUgIT09IHZhbHVlKSB7XG4gICAgcmV0dXJuIGluZGV4T2ZOYU4oYXJyYXksIGZyb21JbmRleCk7XG4gIH1cbiAgdmFyIGluZGV4ID0gZnJvbUluZGV4IC0gMSxcbiAgICAgIGxlbmd0aCA9IGFycmF5Lmxlbmd0aDtcblxuICB3aGlsZSAoKytpbmRleCA8IGxlbmd0aCkge1xuICAgIGlmIChhcnJheVtpbmRleF0gPT09IHZhbHVlKSB7XG4gICAgICByZXR1cm4gaW5kZXg7XG4gICAgfVxuICB9XG4gIHJldHVybiAtMTtcbn1cblxuLyoqXG4gKiBHZXRzIHRoZSBpbmRleCBhdCB3aGljaCB0aGUgZmlyc3Qgb2NjdXJyZW5jZSBvZiBgTmFOYCBpcyBmb3VuZCBpbiBgYXJyYXlgLlxuICogSWYgYGZyb21SaWdodGAgaXMgcHJvdmlkZWQgZWxlbWVudHMgb2YgYGFycmF5YCBhcmUgaXRlcmF0ZWQgZnJvbSByaWdodCB0byBsZWZ0LlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge0FycmF5fSBhcnJheSBUaGUgYXJyYXkgdG8gc2VhcmNoLlxuICogQHBhcmFtIHtudW1iZXJ9IGZyb21JbmRleCBUaGUgaW5kZXggdG8gc2VhcmNoIGZyb20uXG4gKiBAcGFyYW0ge2Jvb2xlYW59IFtmcm9tUmlnaHRdIFNwZWNpZnkgaXRlcmF0aW5nIGZyb20gcmlnaHQgdG8gbGVmdC5cbiAqIEByZXR1cm5zIHtudW1iZXJ9IFJldHVybnMgdGhlIGluZGV4IG9mIHRoZSBtYXRjaGVkIGBOYU5gLCBlbHNlIGAtMWAuXG4gKi9cbmZ1bmN0aW9uIGluZGV4T2ZOYU4oYXJyYXksIGZyb21JbmRleCwgZnJvbVJpZ2h0KSB7XG4gIHZhciBsZW5ndGggPSBhcnJheS5sZW5ndGgsXG4gICAgICBpbmRleCA9IGZyb21JbmRleCArIChmcm9tUmlnaHQgPyAwIDogLTEpO1xuXG4gIHdoaWxlICgoZnJvbVJpZ2h0ID8gaW5kZXgtLSA6ICsraW5kZXggPCBsZW5ndGgpKSB7XG4gICAgdmFyIG90aGVyID0gYXJyYXlbaW5kZXhdO1xuICAgIGlmIChvdGhlciAhPT0gb3RoZXIpIHtcbiAgICAgIHJldHVybiBpbmRleDtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIC0xO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGJhc2VJbmRleE9mO1xuIiwiLyoqXG4gKiBsb2Rhc2ggMy4wLjMgKEN1c3RvbSBCdWlsZCkgPGh0dHBzOi8vbG9kYXNoLmNvbS8+XG4gKiBCdWlsZDogYGxvZGFzaCBtb2Rlcm4gbW9kdWxhcml6ZSBleHBvcnRzPVwibnBtXCIgLW8gLi9gXG4gKiBDb3B5cmlnaHQgMjAxMi0yMDE1IFRoZSBEb2pvIEZvdW5kYXRpb24gPGh0dHA6Ly9kb2pvZm91bmRhdGlvbi5vcmcvPlxuICogQmFzZWQgb24gVW5kZXJzY29yZS5qcyAxLjguMyA8aHR0cDovL3VuZGVyc2NvcmVqcy5vcmcvTElDRU5TRT5cbiAqIENvcHlyaWdodCAyMDA5LTIwMTUgSmVyZW15IEFzaGtlbmFzLCBEb2N1bWVudENsb3VkIGFuZCBJbnZlc3RpZ2F0aXZlIFJlcG9ydGVycyAmIEVkaXRvcnNcbiAqIEF2YWlsYWJsZSB1bmRlciBNSVQgbGljZW5zZSA8aHR0cHM6Ly9sb2Rhc2guY29tL2xpY2Vuc2U+XG4gKi9cbnZhciBiYXNlSW5kZXhPZiA9IHJlcXVpcmUoJ2xvZGFzaC5fYmFzZWluZGV4b2YnKSxcbiAgICBjYWNoZUluZGV4T2YgPSByZXF1aXJlKCdsb2Rhc2guX2NhY2hlaW5kZXhvZicpLFxuICAgIGNyZWF0ZUNhY2hlID0gcmVxdWlyZSgnbG9kYXNoLl9jcmVhdGVjYWNoZScpO1xuXG4vKiogVXNlZCBhcyB0aGUgc2l6ZSB0byBlbmFibGUgbGFyZ2UgYXJyYXkgb3B0aW1pemF0aW9ucy4gKi9cbnZhciBMQVJHRV9BUlJBWV9TSVpFID0gMjAwO1xuXG4vKipcbiAqIFRoZSBiYXNlIGltcGxlbWVudGF0aW9uIG9mIGBfLnVuaXFgIHdpdGhvdXQgc3VwcG9ydCBmb3IgY2FsbGJhY2sgc2hvcnRoYW5kc1xuICogYW5kIGB0aGlzYCBiaW5kaW5nLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge0FycmF5fSBhcnJheSBUaGUgYXJyYXkgdG8gaW5zcGVjdC5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtpdGVyYXRlZV0gVGhlIGZ1bmN0aW9uIGludm9rZWQgcGVyIGl0ZXJhdGlvbi5cbiAqIEByZXR1cm5zIHtBcnJheX0gUmV0dXJucyB0aGUgbmV3IGR1cGxpY2F0ZS12YWx1ZS1mcmVlIGFycmF5LlxuICovXG5mdW5jdGlvbiBiYXNlVW5pcShhcnJheSwgaXRlcmF0ZWUpIHtcbiAgdmFyIGluZGV4ID0gLTEsXG4gICAgICBpbmRleE9mID0gYmFzZUluZGV4T2YsXG4gICAgICBsZW5ndGggPSBhcnJheS5sZW5ndGgsXG4gICAgICBpc0NvbW1vbiA9IHRydWUsXG4gICAgICBpc0xhcmdlID0gaXNDb21tb24gJiYgbGVuZ3RoID49IExBUkdFX0FSUkFZX1NJWkUsXG4gICAgICBzZWVuID0gaXNMYXJnZSA/IGNyZWF0ZUNhY2hlKCkgOiBudWxsLFxuICAgICAgcmVzdWx0ID0gW107XG5cbiAgaWYgKHNlZW4pIHtcbiAgICBpbmRleE9mID0gY2FjaGVJbmRleE9mO1xuICAgIGlzQ29tbW9uID0gZmFsc2U7XG4gIH0gZWxzZSB7XG4gICAgaXNMYXJnZSA9IGZhbHNlO1xuICAgIHNlZW4gPSBpdGVyYXRlZSA/IFtdIDogcmVzdWx0O1xuICB9XG4gIG91dGVyOlxuICB3aGlsZSAoKytpbmRleCA8IGxlbmd0aCkge1xuICAgIHZhciB2YWx1ZSA9IGFycmF5W2luZGV4XSxcbiAgICAgICAgY29tcHV0ZWQgPSBpdGVyYXRlZSA/IGl0ZXJhdGVlKHZhbHVlLCBpbmRleCwgYXJyYXkpIDogdmFsdWU7XG5cbiAgICBpZiAoaXNDb21tb24gJiYgdmFsdWUgPT09IHZhbHVlKSB7XG4gICAgICB2YXIgc2VlbkluZGV4ID0gc2Vlbi5sZW5ndGg7XG4gICAgICB3aGlsZSAoc2VlbkluZGV4LS0pIHtcbiAgICAgICAgaWYgKHNlZW5bc2VlbkluZGV4XSA9PT0gY29tcHV0ZWQpIHtcbiAgICAgICAgICBjb250aW51ZSBvdXRlcjtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKGl0ZXJhdGVlKSB7XG4gICAgICAgIHNlZW4ucHVzaChjb21wdXRlZCk7XG4gICAgICB9XG4gICAgICByZXN1bHQucHVzaCh2YWx1ZSk7XG4gICAgfVxuICAgIGVsc2UgaWYgKGluZGV4T2Yoc2VlbiwgY29tcHV0ZWQsIDApIDwgMCkge1xuICAgICAgaWYgKGl0ZXJhdGVlIHx8IGlzTGFyZ2UpIHtcbiAgICAgICAgc2Vlbi5wdXNoKGNvbXB1dGVkKTtcbiAgICAgIH1cbiAgICAgIHJlc3VsdC5wdXNoKHZhbHVlKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBiYXNlVW5pcTtcbiIsIi8qKlxuICogbG9kYXNoIDMuMC4xIChDdXN0b20gQnVpbGQpIDxodHRwczovL2xvZGFzaC5jb20vPlxuICogQnVpbGQ6IGBsb2Rhc2ggbW9kZXJuIG1vZHVsYXJpemUgZXhwb3J0cz1cIm5wbVwiIC1vIC4vYFxuICogQ29weXJpZ2h0IDIwMTItMjAxNSBUaGUgRG9qbyBGb3VuZGF0aW9uIDxodHRwOi8vZG9qb2ZvdW5kYXRpb24ub3JnLz5cbiAqIEJhc2VkIG9uIFVuZGVyc2NvcmUuanMgMS44LjMgPGh0dHA6Ly91bmRlcnNjb3JlanMub3JnL0xJQ0VOU0U+XG4gKiBDb3B5cmlnaHQgMjAwOS0yMDE1IEplcmVteSBBc2hrZW5hcywgRG9jdW1lbnRDbG91ZCBhbmQgSW52ZXN0aWdhdGl2ZSBSZXBvcnRlcnMgJiBFZGl0b3JzXG4gKiBBdmFpbGFibGUgdW5kZXIgTUlUIGxpY2Vuc2UgPGh0dHBzOi8vbG9kYXNoLmNvbS9saWNlbnNlPlxuICovXG5cbi8qKlxuICogQSBzcGVjaWFsaXplZCB2ZXJzaW9uIG9mIGBiYXNlQ2FsbGJhY2tgIHdoaWNoIG9ubHkgc3VwcG9ydHMgYHRoaXNgIGJpbmRpbmdcbiAqIGFuZCBzcGVjaWZ5aW5nIHRoZSBudW1iZXIgb2YgYXJndW1lbnRzIHRvIHByb3ZpZGUgdG8gYGZ1bmNgLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmdW5jIFRoZSBmdW5jdGlvbiB0byBiaW5kLlxuICogQHBhcmFtIHsqfSB0aGlzQXJnIFRoZSBgdGhpc2AgYmluZGluZyBvZiBgZnVuY2AuXG4gKiBAcGFyYW0ge251bWJlcn0gW2FyZ0NvdW50XSBUaGUgbnVtYmVyIG9mIGFyZ3VtZW50cyB0byBwcm92aWRlIHRvIGBmdW5jYC5cbiAqIEByZXR1cm5zIHtGdW5jdGlvbn0gUmV0dXJucyB0aGUgY2FsbGJhY2suXG4gKi9cbmZ1bmN0aW9uIGJpbmRDYWxsYmFjayhmdW5jLCB0aGlzQXJnLCBhcmdDb3VudCkge1xuICBpZiAodHlwZW9mIGZ1bmMgIT0gJ2Z1bmN0aW9uJykge1xuICAgIHJldHVybiBpZGVudGl0eTtcbiAgfVxuICBpZiAodGhpc0FyZyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgcmV0dXJuIGZ1bmM7XG4gIH1cbiAgc3dpdGNoIChhcmdDb3VudCkge1xuICAgIGNhc2UgMTogcmV0dXJuIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICByZXR1cm4gZnVuYy5jYWxsKHRoaXNBcmcsIHZhbHVlKTtcbiAgICB9O1xuICAgIGNhc2UgMzogcmV0dXJuIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgY29sbGVjdGlvbikge1xuICAgICAgcmV0dXJuIGZ1bmMuY2FsbCh0aGlzQXJnLCB2YWx1ZSwgaW5kZXgsIGNvbGxlY3Rpb24pO1xuICAgIH07XG4gICAgY2FzZSA0OiByZXR1cm4gZnVuY3Rpb24oYWNjdW11bGF0b3IsIHZhbHVlLCBpbmRleCwgY29sbGVjdGlvbikge1xuICAgICAgcmV0dXJuIGZ1bmMuY2FsbCh0aGlzQXJnLCBhY2N1bXVsYXRvciwgdmFsdWUsIGluZGV4LCBjb2xsZWN0aW9uKTtcbiAgICB9O1xuICAgIGNhc2UgNTogcmV0dXJuIGZ1bmN0aW9uKHZhbHVlLCBvdGhlciwga2V5LCBvYmplY3QsIHNvdXJjZSkge1xuICAgICAgcmV0dXJuIGZ1bmMuY2FsbCh0aGlzQXJnLCB2YWx1ZSwgb3RoZXIsIGtleSwgb2JqZWN0LCBzb3VyY2UpO1xuICAgIH07XG4gIH1cbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBmdW5jLmFwcGx5KHRoaXNBcmcsIGFyZ3VtZW50cyk7XG4gIH07XG59XG5cbi8qKlxuICogVGhpcyBtZXRob2QgcmV0dXJucyB0aGUgZmlyc3QgYXJndW1lbnQgcHJvdmlkZWQgdG8gaXQuXG4gKlxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIF9cbiAqIEBjYXRlZ29yeSBVdGlsaXR5XG4gKiBAcGFyYW0geyp9IHZhbHVlIEFueSB2YWx1ZS5cbiAqIEByZXR1cm5zIHsqfSBSZXR1cm5zIGB2YWx1ZWAuXG4gKiBAZXhhbXBsZVxuICpcbiAqIHZhciBvYmplY3QgPSB7ICd1c2VyJzogJ2ZyZWQnIH07XG4gKlxuICogXy5pZGVudGl0eShvYmplY3QpID09PSBvYmplY3Q7XG4gKiAvLyA9PiB0cnVlXG4gKi9cbmZ1bmN0aW9uIGlkZW50aXR5KHZhbHVlKSB7XG4gIHJldHVybiB2YWx1ZTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBiaW5kQ2FsbGJhY2s7XG4iLCIvKipcbiAqIGxvZGFzaCAzLjAuMiAoQ3VzdG9tIEJ1aWxkKSA8aHR0cHM6Ly9sb2Rhc2guY29tLz5cbiAqIEJ1aWxkOiBgbG9kYXNoIG1vZGVybiBtb2R1bGFyaXplIGV4cG9ydHM9XCJucG1cIiAtbyAuL2BcbiAqIENvcHlyaWdodCAyMDEyLTIwMTUgVGhlIERvam8gRm91bmRhdGlvbiA8aHR0cDovL2Rvam9mb3VuZGF0aW9uLm9yZy8+XG4gKiBCYXNlZCBvbiBVbmRlcnNjb3JlLmpzIDEuOC4zIDxodHRwOi8vdW5kZXJzY29yZWpzLm9yZy9MSUNFTlNFPlxuICogQ29weXJpZ2h0IDIwMDktMjAxNSBKZXJlbXkgQXNoa2VuYXMsIERvY3VtZW50Q2xvdWQgYW5kIEludmVzdGlnYXRpdmUgUmVwb3J0ZXJzICYgRWRpdG9yc1xuICogQXZhaWxhYmxlIHVuZGVyIE1JVCBsaWNlbnNlIDxodHRwczovL2xvZGFzaC5jb20vbGljZW5zZT5cbiAqL1xuXG4vKipcbiAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIGluIGBjYWNoZWAgbWltaWNraW5nIHRoZSByZXR1cm4gc2lnbmF0dXJlIG9mXG4gKiBgXy5pbmRleE9mYCBieSByZXR1cm5pbmcgYDBgIGlmIHRoZSB2YWx1ZSBpcyBmb3VuZCwgZWxzZSBgLTFgLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge09iamVjdH0gY2FjaGUgVGhlIGNhY2hlIHRvIHNlYXJjaC5cbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIHNlYXJjaCBmb3IuXG4gKiBAcmV0dXJucyB7bnVtYmVyfSBSZXR1cm5zIGAwYCBpZiBgdmFsdWVgIGlzIGZvdW5kLCBlbHNlIGAtMWAuXG4gKi9cbmZ1bmN0aW9uIGNhY2hlSW5kZXhPZihjYWNoZSwgdmFsdWUpIHtcbiAgdmFyIGRhdGEgPSBjYWNoZS5kYXRhLFxuICAgICAgcmVzdWx0ID0gKHR5cGVvZiB2YWx1ZSA9PSAnc3RyaW5nJyB8fCBpc09iamVjdCh2YWx1ZSkpID8gZGF0YS5zZXQuaGFzKHZhbHVlKSA6IGRhdGEuaGFzaFt2YWx1ZV07XG5cbiAgcmV0dXJuIHJlc3VsdCA/IDAgOiAtMTtcbn1cblxuLyoqXG4gKiBDaGVja3MgaWYgYHZhbHVlYCBpcyB0aGUgW2xhbmd1YWdlIHR5cGVdKGh0dHBzOi8vZXM1LmdpdGh1Yi5pby8jeDgpIG9mIGBPYmplY3RgLlxuICogKGUuZy4gYXJyYXlzLCBmdW5jdGlvbnMsIG9iamVjdHMsIHJlZ2V4ZXMsIGBuZXcgTnVtYmVyKDApYCwgYW5kIGBuZXcgU3RyaW5nKCcnKWApXG4gKlxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIF9cbiAqIEBjYXRlZ29yeSBMYW5nXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBgdmFsdWVgIGlzIGFuIG9iamVjdCwgZWxzZSBgZmFsc2VgLlxuICogQGV4YW1wbGVcbiAqXG4gKiBfLmlzT2JqZWN0KHt9KTtcbiAqIC8vID0+IHRydWVcbiAqXG4gKiBfLmlzT2JqZWN0KFsxLCAyLCAzXSk7XG4gKiAvLyA9PiB0cnVlXG4gKlxuICogXy5pc09iamVjdCgxKTtcbiAqIC8vID0+IGZhbHNlXG4gKi9cbmZ1bmN0aW9uIGlzT2JqZWN0KHZhbHVlKSB7XG4gIC8vIEF2b2lkIGEgVjggSklUIGJ1ZyBpbiBDaHJvbWUgMTktMjAuXG4gIC8vIFNlZSBodHRwczovL2NvZGUuZ29vZ2xlLmNvbS9wL3Y4L2lzc3Vlcy9kZXRhaWw/aWQ9MjI5MSBmb3IgbW9yZSBkZXRhaWxzLlxuICB2YXIgdHlwZSA9IHR5cGVvZiB2YWx1ZTtcbiAgcmV0dXJuICEhdmFsdWUgJiYgKHR5cGUgPT0gJ29iamVjdCcgfHwgdHlwZSA9PSAnZnVuY3Rpb24nKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBjYWNoZUluZGV4T2Y7XG4iLCIvKipcbiAqIGxvZGFzaCAzLjEuMiAoQ3VzdG9tIEJ1aWxkKSA8aHR0cHM6Ly9sb2Rhc2guY29tLz5cbiAqIEJ1aWxkOiBgbG9kYXNoIG1vZGVybiBtb2R1bGFyaXplIGV4cG9ydHM9XCJucG1cIiAtbyAuL2BcbiAqIENvcHlyaWdodCAyMDEyLTIwMTUgVGhlIERvam8gRm91bmRhdGlvbiA8aHR0cDovL2Rvam9mb3VuZGF0aW9uLm9yZy8+XG4gKiBCYXNlZCBvbiBVbmRlcnNjb3JlLmpzIDEuOC4zIDxodHRwOi8vdW5kZXJzY29yZWpzLm9yZy9MSUNFTlNFPlxuICogQ29weXJpZ2h0IDIwMDktMjAxNSBKZXJlbXkgQXNoa2VuYXMsIERvY3VtZW50Q2xvdWQgYW5kIEludmVzdGlnYXRpdmUgUmVwb3J0ZXJzICYgRWRpdG9yc1xuICogQXZhaWxhYmxlIHVuZGVyIE1JVCBsaWNlbnNlIDxodHRwczovL2xvZGFzaC5jb20vbGljZW5zZT5cbiAqL1xudmFyIGdldE5hdGl2ZSA9IHJlcXVpcmUoJ2xvZGFzaC5fZ2V0bmF0aXZlJyk7XG5cbi8qKiBOYXRpdmUgbWV0aG9kIHJlZmVyZW5jZXMuICovXG52YXIgU2V0ID0gZ2V0TmF0aXZlKGdsb2JhbCwgJ1NldCcpO1xuXG4vKiBOYXRpdmUgbWV0aG9kIHJlZmVyZW5jZXMgZm9yIHRob3NlIHdpdGggdGhlIHNhbWUgbmFtZSBhcyBvdGhlciBgbG9kYXNoYCBtZXRob2RzLiAqL1xudmFyIG5hdGl2ZUNyZWF0ZSA9IGdldE5hdGl2ZShPYmplY3QsICdjcmVhdGUnKTtcblxuLyoqXG4gKlxuICogQ3JlYXRlcyBhIGNhY2hlIG9iamVjdCB0byBzdG9yZSB1bmlxdWUgdmFsdWVzLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge0FycmF5fSBbdmFsdWVzXSBUaGUgdmFsdWVzIHRvIGNhY2hlLlxuICovXG5mdW5jdGlvbiBTZXRDYWNoZSh2YWx1ZXMpIHtcbiAgdmFyIGxlbmd0aCA9IHZhbHVlcyA/IHZhbHVlcy5sZW5ndGggOiAwO1xuXG4gIHRoaXMuZGF0YSA9IHsgJ2hhc2gnOiBuYXRpdmVDcmVhdGUobnVsbCksICdzZXQnOiBuZXcgU2V0IH07XG4gIHdoaWxlIChsZW5ndGgtLSkge1xuICAgIHRoaXMucHVzaCh2YWx1ZXNbbGVuZ3RoXSk7XG4gIH1cbn1cblxuLyoqXG4gKiBBZGRzIGB2YWx1ZWAgdG8gdGhlIGNhY2hlLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAbmFtZSBwdXNoXG4gKiBAbWVtYmVyT2YgU2V0Q2FjaGVcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNhY2hlLlxuICovXG5mdW5jdGlvbiBjYWNoZVB1c2godmFsdWUpIHtcbiAgdmFyIGRhdGEgPSB0aGlzLmRhdGE7XG4gIGlmICh0eXBlb2YgdmFsdWUgPT0gJ3N0cmluZycgfHwgaXNPYmplY3QodmFsdWUpKSB7XG4gICAgZGF0YS5zZXQuYWRkKHZhbHVlKTtcbiAgfSBlbHNlIHtcbiAgICBkYXRhLmhhc2hbdmFsdWVdID0gdHJ1ZTtcbiAgfVxufVxuXG4vKipcbiAqIENyZWF0ZXMgYSBgU2V0YCBjYWNoZSBvYmplY3QgdG8gb3B0aW1pemUgbGluZWFyIHNlYXJjaGVzIG9mIGxhcmdlIGFycmF5cy5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHtBcnJheX0gW3ZhbHVlc10gVGhlIHZhbHVlcyB0byBjYWNoZS5cbiAqIEByZXR1cm5zIHtudWxsfE9iamVjdH0gUmV0dXJucyB0aGUgbmV3IGNhY2hlIG9iamVjdCBpZiBgU2V0YCBpcyBzdXBwb3J0ZWQsIGVsc2UgYG51bGxgLlxuICovXG5mdW5jdGlvbiBjcmVhdGVDYWNoZSh2YWx1ZXMpIHtcbiAgcmV0dXJuIChuYXRpdmVDcmVhdGUgJiYgU2V0KSA/IG5ldyBTZXRDYWNoZSh2YWx1ZXMpIDogbnVsbDtcbn1cblxuLyoqXG4gKiBDaGVja3MgaWYgYHZhbHVlYCBpcyB0aGUgW2xhbmd1YWdlIHR5cGVdKGh0dHBzOi8vZXM1LmdpdGh1Yi5pby8jeDgpIG9mIGBPYmplY3RgLlxuICogKGUuZy4gYXJyYXlzLCBmdW5jdGlvbnMsIG9iamVjdHMsIHJlZ2V4ZXMsIGBuZXcgTnVtYmVyKDApYCwgYW5kIGBuZXcgU3RyaW5nKCcnKWApXG4gKlxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIF9cbiAqIEBjYXRlZ29yeSBMYW5nXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBgdmFsdWVgIGlzIGFuIG9iamVjdCwgZWxzZSBgZmFsc2VgLlxuICogQGV4YW1wbGVcbiAqXG4gKiBfLmlzT2JqZWN0KHt9KTtcbiAqIC8vID0+IHRydWVcbiAqXG4gKiBfLmlzT2JqZWN0KFsxLCAyLCAzXSk7XG4gKiAvLyA9PiB0cnVlXG4gKlxuICogXy5pc09iamVjdCgxKTtcbiAqIC8vID0+IGZhbHNlXG4gKi9cbmZ1bmN0aW9uIGlzT2JqZWN0KHZhbHVlKSB7XG4gIC8vIEF2b2lkIGEgVjggSklUIGJ1ZyBpbiBDaHJvbWUgMTktMjAuXG4gIC8vIFNlZSBodHRwczovL2NvZGUuZ29vZ2xlLmNvbS9wL3Y4L2lzc3Vlcy9kZXRhaWw/aWQ9MjI5MSBmb3IgbW9yZSBkZXRhaWxzLlxuICB2YXIgdHlwZSA9IHR5cGVvZiB2YWx1ZTtcbiAgcmV0dXJuICEhdmFsdWUgJiYgKHR5cGUgPT0gJ29iamVjdCcgfHwgdHlwZSA9PSAnZnVuY3Rpb24nKTtcbn1cblxuLy8gQWRkIGZ1bmN0aW9ucyB0byB0aGUgYFNldGAgY2FjaGUuXG5TZXRDYWNoZS5wcm90b3R5cGUucHVzaCA9IGNhY2hlUHVzaDtcblxubW9kdWxlLmV4cG9ydHMgPSBjcmVhdGVDYWNoZTtcbiIsIi8qKlxuICogbG9kYXNoIDMuOS4xIChDdXN0b20gQnVpbGQpIDxodHRwczovL2xvZGFzaC5jb20vPlxuICogQnVpbGQ6IGBsb2Rhc2ggbW9kZXJuIG1vZHVsYXJpemUgZXhwb3J0cz1cIm5wbVwiIC1vIC4vYFxuICogQ29weXJpZ2h0IDIwMTItMjAxNSBUaGUgRG9qbyBGb3VuZGF0aW9uIDxodHRwOi8vZG9qb2ZvdW5kYXRpb24ub3JnLz5cbiAqIEJhc2VkIG9uIFVuZGVyc2NvcmUuanMgMS44LjMgPGh0dHA6Ly91bmRlcnNjb3JlanMub3JnL0xJQ0VOU0U+XG4gKiBDb3B5cmlnaHQgMjAwOS0yMDE1IEplcmVteSBBc2hrZW5hcywgRG9jdW1lbnRDbG91ZCBhbmQgSW52ZXN0aWdhdGl2ZSBSZXBvcnRlcnMgJiBFZGl0b3JzXG4gKiBBdmFpbGFibGUgdW5kZXIgTUlUIGxpY2Vuc2UgPGh0dHBzOi8vbG9kYXNoLmNvbS9saWNlbnNlPlxuICovXG5cbi8qKiBgT2JqZWN0I3RvU3RyaW5nYCByZXN1bHQgcmVmZXJlbmNlcy4gKi9cbnZhciBmdW5jVGFnID0gJ1tvYmplY3QgRnVuY3Rpb25dJztcblxuLyoqIFVzZWQgdG8gZGV0ZWN0IGhvc3QgY29uc3RydWN0b3JzIChTYWZhcmkgPiA1KS4gKi9cbnZhciByZUlzSG9zdEN0b3IgPSAvXlxcW29iamVjdCAuKz9Db25zdHJ1Y3RvclxcXSQvO1xuXG4vKipcbiAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIG9iamVjdC1saWtlLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBgdmFsdWVgIGlzIG9iamVjdC1saWtlLCBlbHNlIGBmYWxzZWAuXG4gKi9cbmZ1bmN0aW9uIGlzT2JqZWN0TGlrZSh2YWx1ZSkge1xuICByZXR1cm4gISF2YWx1ZSAmJiB0eXBlb2YgdmFsdWUgPT0gJ29iamVjdCc7XG59XG5cbi8qKiBVc2VkIGZvciBuYXRpdmUgbWV0aG9kIHJlZmVyZW5jZXMuICovXG52YXIgb2JqZWN0UHJvdG8gPSBPYmplY3QucHJvdG90eXBlO1xuXG4vKiogVXNlZCB0byByZXNvbHZlIHRoZSBkZWNvbXBpbGVkIHNvdXJjZSBvZiBmdW5jdGlvbnMuICovXG52YXIgZm5Ub1N0cmluZyA9IEZ1bmN0aW9uLnByb3RvdHlwZS50b1N0cmluZztcblxuLyoqIFVzZWQgdG8gY2hlY2sgb2JqZWN0cyBmb3Igb3duIHByb3BlcnRpZXMuICovXG52YXIgaGFzT3duUHJvcGVydHkgPSBvYmplY3RQcm90by5oYXNPd25Qcm9wZXJ0eTtcblxuLyoqXG4gKiBVc2VkIHRvIHJlc29sdmUgdGhlIFtgdG9TdHJpbmdUYWdgXShodHRwOi8vZWNtYS1pbnRlcm5hdGlvbmFsLm9yZy9lY21hLTI2Mi82LjAvI3NlYy1vYmplY3QucHJvdG90eXBlLnRvc3RyaW5nKVxuICogb2YgdmFsdWVzLlxuICovXG52YXIgb2JqVG9TdHJpbmcgPSBvYmplY3RQcm90by50b1N0cmluZztcblxuLyoqIFVzZWQgdG8gZGV0ZWN0IGlmIGEgbWV0aG9kIGlzIG5hdGl2ZS4gKi9cbnZhciByZUlzTmF0aXZlID0gUmVnRXhwKCdeJyArXG4gIGZuVG9TdHJpbmcuY2FsbChoYXNPd25Qcm9wZXJ0eSkucmVwbGFjZSgvW1xcXFxeJC4qKz8oKVtcXF17fXxdL2csICdcXFxcJCYnKVxuICAucmVwbGFjZSgvaGFzT3duUHJvcGVydHl8KGZ1bmN0aW9uKS4qPyg/PVxcXFxcXCgpfCBmb3IgLis/KD89XFxcXFxcXSkvZywgJyQxLio/JykgKyAnJCdcbik7XG5cbi8qKlxuICogR2V0cyB0aGUgbmF0aXZlIGZ1bmN0aW9uIGF0IGBrZXlgIG9mIGBvYmplY3RgLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0IFRoZSBvYmplY3QgdG8gcXVlcnkuXG4gKiBAcGFyYW0ge3N0cmluZ30ga2V5IFRoZSBrZXkgb2YgdGhlIG1ldGhvZCB0byBnZXQuXG4gKiBAcmV0dXJucyB7Kn0gUmV0dXJucyB0aGUgZnVuY3Rpb24gaWYgaXQncyBuYXRpdmUsIGVsc2UgYHVuZGVmaW5lZGAuXG4gKi9cbmZ1bmN0aW9uIGdldE5hdGl2ZShvYmplY3QsIGtleSkge1xuICB2YXIgdmFsdWUgPSBvYmplY3QgPT0gbnVsbCA/IHVuZGVmaW5lZCA6IG9iamVjdFtrZXldO1xuICByZXR1cm4gaXNOYXRpdmUodmFsdWUpID8gdmFsdWUgOiB1bmRlZmluZWQ7XG59XG5cbi8qKlxuICogQ2hlY2tzIGlmIGB2YWx1ZWAgaXMgY2xhc3NpZmllZCBhcyBhIGBGdW5jdGlvbmAgb2JqZWN0LlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBfXG4gKiBAY2F0ZWdvcnkgTGFuZ1xuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgYHZhbHVlYCBpcyBjb3JyZWN0bHkgY2xhc3NpZmllZCwgZWxzZSBgZmFsc2VgLlxuICogQGV4YW1wbGVcbiAqXG4gKiBfLmlzRnVuY3Rpb24oXyk7XG4gKiAvLyA9PiB0cnVlXG4gKlxuICogXy5pc0Z1bmN0aW9uKC9hYmMvKTtcbiAqIC8vID0+IGZhbHNlXG4gKi9cbmZ1bmN0aW9uIGlzRnVuY3Rpb24odmFsdWUpIHtcbiAgLy8gVGhlIHVzZSBvZiBgT2JqZWN0I3RvU3RyaW5nYCBhdm9pZHMgaXNzdWVzIHdpdGggdGhlIGB0eXBlb2ZgIG9wZXJhdG9yXG4gIC8vIGluIG9sZGVyIHZlcnNpb25zIG9mIENocm9tZSBhbmQgU2FmYXJpIHdoaWNoIHJldHVybiAnZnVuY3Rpb24nIGZvciByZWdleGVzXG4gIC8vIGFuZCBTYWZhcmkgOCBlcXVpdmFsZW50cyB3aGljaCByZXR1cm4gJ29iamVjdCcgZm9yIHR5cGVkIGFycmF5IGNvbnN0cnVjdG9ycy5cbiAgcmV0dXJuIGlzT2JqZWN0KHZhbHVlKSAmJiBvYmpUb1N0cmluZy5jYWxsKHZhbHVlKSA9PSBmdW5jVGFnO1xufVxuXG4vKipcbiAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIHRoZSBbbGFuZ3VhZ2UgdHlwZV0oaHR0cHM6Ly9lczUuZ2l0aHViLmlvLyN4OCkgb2YgYE9iamVjdGAuXG4gKiAoZS5nLiBhcnJheXMsIGZ1bmN0aW9ucywgb2JqZWN0cywgcmVnZXhlcywgYG5ldyBOdW1iZXIoMClgLCBhbmQgYG5ldyBTdHJpbmcoJycpYClcbiAqXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgX1xuICogQGNhdGVnb3J5IExhbmdcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIGB2YWx1ZWAgaXMgYW4gb2JqZWN0LCBlbHNlIGBmYWxzZWAuXG4gKiBAZXhhbXBsZVxuICpcbiAqIF8uaXNPYmplY3Qoe30pO1xuICogLy8gPT4gdHJ1ZVxuICpcbiAqIF8uaXNPYmplY3QoWzEsIDIsIDNdKTtcbiAqIC8vID0+IHRydWVcbiAqXG4gKiBfLmlzT2JqZWN0KDEpO1xuICogLy8gPT4gZmFsc2VcbiAqL1xuZnVuY3Rpb24gaXNPYmplY3QodmFsdWUpIHtcbiAgLy8gQXZvaWQgYSBWOCBKSVQgYnVnIGluIENocm9tZSAxOS0yMC5cbiAgLy8gU2VlIGh0dHBzOi8vY29kZS5nb29nbGUuY29tL3AvdjgvaXNzdWVzL2RldGFpbD9pZD0yMjkxIGZvciBtb3JlIGRldGFpbHMuXG4gIHZhciB0eXBlID0gdHlwZW9mIHZhbHVlO1xuICByZXR1cm4gISF2YWx1ZSAmJiAodHlwZSA9PSAnb2JqZWN0JyB8fCB0eXBlID09ICdmdW5jdGlvbicpO1xufVxuXG4vKipcbiAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIGEgbmF0aXZlIGZ1bmN0aW9uLlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBfXG4gKiBAY2F0ZWdvcnkgTGFuZ1xuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgYHZhbHVlYCBpcyBhIG5hdGl2ZSBmdW5jdGlvbiwgZWxzZSBgZmFsc2VgLlxuICogQGV4YW1wbGVcbiAqXG4gKiBfLmlzTmF0aXZlKEFycmF5LnByb3RvdHlwZS5wdXNoKTtcbiAqIC8vID0+IHRydWVcbiAqXG4gKiBfLmlzTmF0aXZlKF8pO1xuICogLy8gPT4gZmFsc2VcbiAqL1xuZnVuY3Rpb24gaXNOYXRpdmUodmFsdWUpIHtcbiAgaWYgKHZhbHVlID09IG51bGwpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgaWYgKGlzRnVuY3Rpb24odmFsdWUpKSB7XG4gICAgcmV0dXJuIHJlSXNOYXRpdmUudGVzdChmblRvU3RyaW5nLmNhbGwodmFsdWUpKTtcbiAgfVxuICByZXR1cm4gaXNPYmplY3RMaWtlKHZhbHVlKSAmJiByZUlzSG9zdEN0b3IudGVzdCh2YWx1ZSk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gZ2V0TmF0aXZlO1xuIiwiLyoqXG4gKiBsb2Rhc2ggMy4wLjEgKEN1c3RvbSBCdWlsZCkgPGh0dHBzOi8vbG9kYXNoLmNvbS8+XG4gKiBCdWlsZDogYGxvZGFzaCBtb2R1bGFyaXplIGV4cG9ydHM9XCJucG1cIiAtbyAuL2BcbiAqIENvcHlyaWdodCAyMDEyLTIwMTYgVGhlIERvam8gRm91bmRhdGlvbiA8aHR0cDovL2Rvam9mb3VuZGF0aW9uLm9yZy8+XG4gKiBCYXNlZCBvbiBVbmRlcnNjb3JlLmpzIDEuOC4zIDxodHRwOi8vdW5kZXJzY29yZWpzLm9yZy9MSUNFTlNFPlxuICogQ29weXJpZ2h0IDIwMDktMjAxNiBKZXJlbXkgQXNoa2VuYXMsIERvY3VtZW50Q2xvdWQgYW5kIEludmVzdGlnYXRpdmUgUmVwb3J0ZXJzICYgRWRpdG9yc1xuICogQXZhaWxhYmxlIHVuZGVyIE1JVCBsaWNlbnNlIDxodHRwczovL2xvZGFzaC5jb20vbGljZW5zZT5cbiAqL1xuXG4vKiogVXNlZCB0byBkZXRlcm1pbmUgaWYgdmFsdWVzIGFyZSBvZiB0aGUgbGFuZ3VhZ2UgdHlwZSBgT2JqZWN0YC4gKi9cbnZhciBvYmplY3RUeXBlcyA9IHtcbiAgJ2Z1bmN0aW9uJzogdHJ1ZSxcbiAgJ29iamVjdCc6IHRydWVcbn07XG5cbi8qKiBEZXRlY3QgZnJlZSB2YXJpYWJsZSBgZXhwb3J0c2AuICovXG52YXIgZnJlZUV4cG9ydHMgPSAob2JqZWN0VHlwZXNbdHlwZW9mIGV4cG9ydHNdICYmIGV4cG9ydHMgJiYgIWV4cG9ydHMubm9kZVR5cGUpXG4gID8gZXhwb3J0c1xuICA6IHVuZGVmaW5lZDtcblxuLyoqIERldGVjdCBmcmVlIHZhcmlhYmxlIGBtb2R1bGVgLiAqL1xudmFyIGZyZWVNb2R1bGUgPSAob2JqZWN0VHlwZXNbdHlwZW9mIG1vZHVsZV0gJiYgbW9kdWxlICYmICFtb2R1bGUubm9kZVR5cGUpXG4gID8gbW9kdWxlXG4gIDogdW5kZWZpbmVkO1xuXG4vKiogRGV0ZWN0IGZyZWUgdmFyaWFibGUgYGdsb2JhbGAgZnJvbSBOb2RlLmpzLiAqL1xudmFyIGZyZWVHbG9iYWwgPSBjaGVja0dsb2JhbChmcmVlRXhwb3J0cyAmJiBmcmVlTW9kdWxlICYmIHR5cGVvZiBnbG9iYWwgPT0gJ29iamVjdCcgJiYgZ2xvYmFsKTtcblxuLyoqIERldGVjdCBmcmVlIHZhcmlhYmxlIGBzZWxmYC4gKi9cbnZhciBmcmVlU2VsZiA9IGNoZWNrR2xvYmFsKG9iamVjdFR5cGVzW3R5cGVvZiBzZWxmXSAmJiBzZWxmKTtcblxuLyoqIERldGVjdCBmcmVlIHZhcmlhYmxlIGB3aW5kb3dgLiAqL1xudmFyIGZyZWVXaW5kb3cgPSBjaGVja0dsb2JhbChvYmplY3RUeXBlc1t0eXBlb2Ygd2luZG93XSAmJiB3aW5kb3cpO1xuXG4vKiogRGV0ZWN0IGB0aGlzYCBhcyB0aGUgZ2xvYmFsIG9iamVjdC4gKi9cbnZhciB0aGlzR2xvYmFsID0gY2hlY2tHbG9iYWwob2JqZWN0VHlwZXNbdHlwZW9mIHRoaXNdICYmIHRoaXMpO1xuXG4vKipcbiAqIFVzZWQgYXMgYSByZWZlcmVuY2UgdG8gdGhlIGdsb2JhbCBvYmplY3QuXG4gKlxuICogVGhlIGB0aGlzYCB2YWx1ZSBpcyB1c2VkIGlmIGl0J3MgdGhlIGdsb2JhbCBvYmplY3QgdG8gYXZvaWQgR3JlYXNlbW9ua2V5J3NcbiAqIHJlc3RyaWN0ZWQgYHdpbmRvd2Agb2JqZWN0LCBvdGhlcndpc2UgdGhlIGB3aW5kb3dgIG9iamVjdCBpcyB1c2VkLlxuICovXG52YXIgcm9vdCA9IGZyZWVHbG9iYWwgfHxcbiAgKChmcmVlV2luZG93ICE9PSAodGhpc0dsb2JhbCAmJiB0aGlzR2xvYmFsLndpbmRvdykpICYmIGZyZWVXaW5kb3cpIHx8XG4gICAgZnJlZVNlbGYgfHwgdGhpc0dsb2JhbCB8fCBGdW5jdGlvbigncmV0dXJuIHRoaXMnKSgpO1xuXG4vKipcbiAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIGEgZ2xvYmFsIG9iamVjdC5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7bnVsbHxPYmplY3R9IFJldHVybnMgYHZhbHVlYCBpZiBpdCdzIGEgZ2xvYmFsIG9iamVjdCwgZWxzZSBgbnVsbGAuXG4gKi9cbmZ1bmN0aW9uIGNoZWNrR2xvYmFsKHZhbHVlKSB7XG4gIHJldHVybiAodmFsdWUgJiYgdmFsdWUuT2JqZWN0ID09PSBPYmplY3QpID8gdmFsdWUgOiBudWxsO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHJvb3Q7XG4iLCIvKipcbiAqIGxvZGFzaCAzLjIuMCAoQ3VzdG9tIEJ1aWxkKSA8aHR0cHM6Ly9sb2Rhc2guY29tLz5cbiAqIEJ1aWxkOiBgbG9kYXNoIG1vZHVsYXJpemUgZXhwb3J0cz1cIm5wbVwiIC1vIC4vYFxuICogQ29weXJpZ2h0IDIwMTItMjAxNiBUaGUgRG9qbyBGb3VuZGF0aW9uIDxodHRwOi8vZG9qb2ZvdW5kYXRpb24ub3JnLz5cbiAqIEJhc2VkIG9uIFVuZGVyc2NvcmUuanMgMS44LjMgPGh0dHA6Ly91bmRlcnNjb3JlanMub3JnL0xJQ0VOU0U+XG4gKiBDb3B5cmlnaHQgMjAwOS0yMDE2IEplcmVteSBBc2hrZW5hcywgRG9jdW1lbnRDbG91ZCBhbmQgSW52ZXN0aWdhdGl2ZSBSZXBvcnRlcnMgJiBFZGl0b3JzXG4gKiBBdmFpbGFibGUgdW5kZXIgTUlUIGxpY2Vuc2UgPGh0dHBzOi8vbG9kYXNoLmNvbS9saWNlbnNlPlxuICovXG52YXIgcm9vdCA9IHJlcXVpcmUoJ2xvZGFzaC5fcm9vdCcpO1xuXG4vKiogVXNlZCBhcyByZWZlcmVuY2VzIGZvciB2YXJpb3VzIGBOdW1iZXJgIGNvbnN0YW50cy4gKi9cbnZhciBJTkZJTklUWSA9IDEgLyAwO1xuXG4vKiogYE9iamVjdCN0b1N0cmluZ2AgcmVzdWx0IHJlZmVyZW5jZXMuICovXG52YXIgc3ltYm9sVGFnID0gJ1tvYmplY3QgU3ltYm9sXSc7XG5cbi8qKiBVc2VkIHRvIG1hdGNoIGxhdGluLTEgc3VwcGxlbWVudGFyeSBsZXR0ZXJzIChleGNsdWRpbmcgbWF0aGVtYXRpY2FsIG9wZXJhdG9ycykuICovXG52YXIgcmVMYXRpbjEgPSAvW1xceGMwLVxceGQ2XFx4ZDgtXFx4ZGVcXHhkZi1cXHhmNlxceGY4LVxceGZmXS9nO1xuXG4vKiogVXNlZCB0byBjb21wb3NlIHVuaWNvZGUgY2hhcmFjdGVyIGNsYXNzZXMuICovXG52YXIgcnNDb21ib01hcmtzUmFuZ2UgPSAnXFxcXHUwMzAwLVxcXFx1MDM2ZlxcXFx1ZmUyMC1cXFxcdWZlMjMnLFxuICAgIHJzQ29tYm9TeW1ib2xzUmFuZ2UgPSAnXFxcXHUyMGQwLVxcXFx1MjBmMCc7XG5cbi8qKiBVc2VkIHRvIGNvbXBvc2UgdW5pY29kZSBjYXB0dXJlIGdyb3Vwcy4gKi9cbnZhciByc0NvbWJvID0gJ1snICsgcnNDb21ib01hcmtzUmFuZ2UgKyByc0NvbWJvU3ltYm9sc1JhbmdlICsgJ10nO1xuXG4vKipcbiAqIFVzZWQgdG8gbWF0Y2ggW2NvbWJpbmluZyBkaWFjcml0aWNhbCBtYXJrc10oaHR0cHM6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvQ29tYmluaW5nX0RpYWNyaXRpY2FsX01hcmtzKSBhbmRcbiAqIFtjb21iaW5pbmcgZGlhY3JpdGljYWwgbWFya3MgZm9yIHN5bWJvbHNdKGh0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0NvbWJpbmluZ19EaWFjcml0aWNhbF9NYXJrc19mb3JfU3ltYm9scykuXG4gKi9cbnZhciByZUNvbWJvTWFyayA9IFJlZ0V4cChyc0NvbWJvLCAnZycpO1xuXG4vKiogVXNlZCB0byBtYXAgbGF0aW4tMSBzdXBwbGVtZW50YXJ5IGxldHRlcnMgdG8gYmFzaWMgbGF0aW4gbGV0dGVycy4gKi9cbnZhciBkZWJ1cnJlZExldHRlcnMgPSB7XG4gICdcXHhjMCc6ICdBJywgICdcXHhjMSc6ICdBJywgJ1xceGMyJzogJ0EnLCAnXFx4YzMnOiAnQScsICdcXHhjNCc6ICdBJywgJ1xceGM1JzogJ0EnLFxuICAnXFx4ZTAnOiAnYScsICAnXFx4ZTEnOiAnYScsICdcXHhlMic6ICdhJywgJ1xceGUzJzogJ2EnLCAnXFx4ZTQnOiAnYScsICdcXHhlNSc6ICdhJyxcbiAgJ1xceGM3JzogJ0MnLCAgJ1xceGU3JzogJ2MnLFxuICAnXFx4ZDAnOiAnRCcsICAnXFx4ZjAnOiAnZCcsXG4gICdcXHhjOCc6ICdFJywgICdcXHhjOSc6ICdFJywgJ1xceGNhJzogJ0UnLCAnXFx4Y2InOiAnRScsXG4gICdcXHhlOCc6ICdlJywgICdcXHhlOSc6ICdlJywgJ1xceGVhJzogJ2UnLCAnXFx4ZWInOiAnZScsXG4gICdcXHhjQyc6ICdJJywgICdcXHhjZCc6ICdJJywgJ1xceGNlJzogJ0knLCAnXFx4Y2YnOiAnSScsXG4gICdcXHhlQyc6ICdpJywgICdcXHhlZCc6ICdpJywgJ1xceGVlJzogJ2knLCAnXFx4ZWYnOiAnaScsXG4gICdcXHhkMSc6ICdOJywgICdcXHhmMSc6ICduJyxcbiAgJ1xceGQyJzogJ08nLCAgJ1xceGQzJzogJ08nLCAnXFx4ZDQnOiAnTycsICdcXHhkNSc6ICdPJywgJ1xceGQ2JzogJ08nLCAnXFx4ZDgnOiAnTycsXG4gICdcXHhmMic6ICdvJywgICdcXHhmMyc6ICdvJywgJ1xceGY0JzogJ28nLCAnXFx4ZjUnOiAnbycsICdcXHhmNic6ICdvJywgJ1xceGY4JzogJ28nLFxuICAnXFx4ZDknOiAnVScsICAnXFx4ZGEnOiAnVScsICdcXHhkYic6ICdVJywgJ1xceGRjJzogJ1UnLFxuICAnXFx4ZjknOiAndScsICAnXFx4ZmEnOiAndScsICdcXHhmYic6ICd1JywgJ1xceGZjJzogJ3UnLFxuICAnXFx4ZGQnOiAnWScsICAnXFx4ZmQnOiAneScsICdcXHhmZic6ICd5JyxcbiAgJ1xceGM2JzogJ0FlJywgJ1xceGU2JzogJ2FlJyxcbiAgJ1xceGRlJzogJ1RoJywgJ1xceGZlJzogJ3RoJyxcbiAgJ1xceGRmJzogJ3NzJ1xufTtcblxuLyoqXG4gKiBVc2VkIGJ5IGBfLmRlYnVycmAgdG8gY29udmVydCBsYXRpbi0xIHN1cHBsZW1lbnRhcnkgbGV0dGVycyB0byBiYXNpYyBsYXRpbiBsZXR0ZXJzLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge3N0cmluZ30gbGV0dGVyIFRoZSBtYXRjaGVkIGxldHRlciB0byBkZWJ1cnIuXG4gKiBAcmV0dXJucyB7c3RyaW5nfSBSZXR1cm5zIHRoZSBkZWJ1cnJlZCBsZXR0ZXIuXG4gKi9cbmZ1bmN0aW9uIGRlYnVyckxldHRlcihsZXR0ZXIpIHtcbiAgcmV0dXJuIGRlYnVycmVkTGV0dGVyc1tsZXR0ZXJdO1xufVxuXG4vKiogVXNlZCBmb3IgYnVpbHQtaW4gbWV0aG9kIHJlZmVyZW5jZXMuICovXG52YXIgb2JqZWN0UHJvdG8gPSBPYmplY3QucHJvdG90eXBlO1xuXG4vKipcbiAqIFVzZWQgdG8gcmVzb2x2ZSB0aGUgW2B0b1N0cmluZ1RhZ2BdKGh0dHA6Ly9lY21hLWludGVybmF0aW9uYWwub3JnL2VjbWEtMjYyLzYuMC8jc2VjLW9iamVjdC5wcm90b3R5cGUudG9zdHJpbmcpXG4gKiBvZiB2YWx1ZXMuXG4gKi9cbnZhciBvYmplY3RUb1N0cmluZyA9IG9iamVjdFByb3RvLnRvU3RyaW5nO1xuXG4vKiogQnVpbHQtaW4gdmFsdWUgcmVmZXJlbmNlcy4gKi9cbnZhciBTeW1ib2wgPSByb290LlN5bWJvbDtcblxuLyoqIFVzZWQgdG8gY29udmVydCBzeW1ib2xzIHRvIHByaW1pdGl2ZXMgYW5kIHN0cmluZ3MuICovXG52YXIgc3ltYm9sUHJvdG8gPSBTeW1ib2wgPyBTeW1ib2wucHJvdG90eXBlIDogdW5kZWZpbmVkLFxuICAgIHN5bWJvbFRvU3RyaW5nID0gU3ltYm9sID8gc3ltYm9sUHJvdG8udG9TdHJpbmcgOiB1bmRlZmluZWQ7XG5cbi8qKlxuICogQ2hlY2tzIGlmIGB2YWx1ZWAgaXMgb2JqZWN0LWxpa2UuIEEgdmFsdWUgaXMgb2JqZWN0LWxpa2UgaWYgaXQncyBub3QgYG51bGxgXG4gKiBhbmQgaGFzIGEgYHR5cGVvZmAgcmVzdWx0IG9mIFwib2JqZWN0XCIuXG4gKlxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIF9cbiAqIEBjYXRlZ29yeSBMYW5nXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBgdmFsdWVgIGlzIG9iamVjdC1saWtlLCBlbHNlIGBmYWxzZWAuXG4gKiBAZXhhbXBsZVxuICpcbiAqIF8uaXNPYmplY3RMaWtlKHt9KTtcbiAqIC8vID0+IHRydWVcbiAqXG4gKiBfLmlzT2JqZWN0TGlrZShbMSwgMiwgM10pO1xuICogLy8gPT4gdHJ1ZVxuICpcbiAqIF8uaXNPYmplY3RMaWtlKF8ubm9vcCk7XG4gKiAvLyA9PiBmYWxzZVxuICpcbiAqIF8uaXNPYmplY3RMaWtlKG51bGwpO1xuICogLy8gPT4gZmFsc2VcbiAqL1xuZnVuY3Rpb24gaXNPYmplY3RMaWtlKHZhbHVlKSB7XG4gIHJldHVybiAhIXZhbHVlICYmIHR5cGVvZiB2YWx1ZSA9PSAnb2JqZWN0Jztcbn1cblxuLyoqXG4gKiBDaGVja3MgaWYgYHZhbHVlYCBpcyBjbGFzc2lmaWVkIGFzIGEgYFN5bWJvbGAgcHJpbWl0aXZlIG9yIG9iamVjdC5cbiAqXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgX1xuICogQGNhdGVnb3J5IExhbmdcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIGB2YWx1ZWAgaXMgY29ycmVjdGx5IGNsYXNzaWZpZWQsIGVsc2UgYGZhbHNlYC5cbiAqIEBleGFtcGxlXG4gKlxuICogXy5pc1N5bWJvbChTeW1ib2wuaXRlcmF0b3IpO1xuICogLy8gPT4gdHJ1ZVxuICpcbiAqIF8uaXNTeW1ib2woJ2FiYycpO1xuICogLy8gPT4gZmFsc2VcbiAqL1xuZnVuY3Rpb24gaXNTeW1ib2wodmFsdWUpIHtcbiAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PSAnc3ltYm9sJyB8fFxuICAgIChpc09iamVjdExpa2UodmFsdWUpICYmIG9iamVjdFRvU3RyaW5nLmNhbGwodmFsdWUpID09IHN5bWJvbFRhZyk7XG59XG5cbi8qKlxuICogQ29udmVydHMgYHZhbHVlYCB0byBhIHN0cmluZyBpZiBpdCdzIG5vdCBvbmUuIEFuIGVtcHR5IHN0cmluZyBpcyByZXR1cm5lZFxuICogZm9yIGBudWxsYCBhbmQgYHVuZGVmaW5lZGAgdmFsdWVzLiBUaGUgc2lnbiBvZiBgLTBgIGlzIHByZXNlcnZlZC5cbiAqXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgX1xuICogQGNhdGVnb3J5IExhbmdcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIHByb2Nlc3MuXG4gKiBAcmV0dXJucyB7c3RyaW5nfSBSZXR1cm5zIHRoZSBzdHJpbmcuXG4gKiBAZXhhbXBsZVxuICpcbiAqIF8udG9TdHJpbmcobnVsbCk7XG4gKiAvLyA9PiAnJ1xuICpcbiAqIF8udG9TdHJpbmcoLTApO1xuICogLy8gPT4gJy0wJ1xuICpcbiAqIF8udG9TdHJpbmcoWzEsIDIsIDNdKTtcbiAqIC8vID0+ICcxLDIsMydcbiAqL1xuZnVuY3Rpb24gdG9TdHJpbmcodmFsdWUpIHtcbiAgLy8gRXhpdCBlYXJseSBmb3Igc3RyaW5ncyB0byBhdm9pZCBhIHBlcmZvcm1hbmNlIGhpdCBpbiBzb21lIGVudmlyb25tZW50cy5cbiAgaWYgKHR5cGVvZiB2YWx1ZSA9PSAnc3RyaW5nJykge1xuICAgIHJldHVybiB2YWx1ZTtcbiAgfVxuICBpZiAodmFsdWUgPT0gbnVsbCkge1xuICAgIHJldHVybiAnJztcbiAgfVxuICBpZiAoaXNTeW1ib2wodmFsdWUpKSB7XG4gICAgcmV0dXJuIFN5bWJvbCA/IHN5bWJvbFRvU3RyaW5nLmNhbGwodmFsdWUpIDogJyc7XG4gIH1cbiAgdmFyIHJlc3VsdCA9ICh2YWx1ZSArICcnKTtcbiAgcmV0dXJuIChyZXN1bHQgPT0gJzAnICYmICgxIC8gdmFsdWUpID09IC1JTkZJTklUWSkgPyAnLTAnIDogcmVzdWx0O1xufVxuXG4vKipcbiAqIERlYnVycnMgYHN0cmluZ2AgYnkgY29udmVydGluZyBbbGF0aW4tMSBzdXBwbGVtZW50YXJ5IGxldHRlcnNdKGh0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0xhdGluLTFfU3VwcGxlbWVudF8oVW5pY29kZV9ibG9jaykjQ2hhcmFjdGVyX3RhYmxlKVxuICogdG8gYmFzaWMgbGF0aW4gbGV0dGVycyBhbmQgcmVtb3ZpbmcgW2NvbWJpbmluZyBkaWFjcml0aWNhbCBtYXJrc10oaHR0cHM6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvQ29tYmluaW5nX0RpYWNyaXRpY2FsX01hcmtzKS5cbiAqXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgX1xuICogQGNhdGVnb3J5IFN0cmluZ1xuICogQHBhcmFtIHtzdHJpbmd9IFtzdHJpbmc9JyddIFRoZSBzdHJpbmcgdG8gZGVidXJyLlxuICogQHJldHVybnMge3N0cmluZ30gUmV0dXJucyB0aGUgZGVidXJyZWQgc3RyaW5nLlxuICogQGV4YW1wbGVcbiAqXG4gKiBfLmRlYnVycignZMOpasOgIHZ1Jyk7XG4gKiAvLyA9PiAnZGVqYSB2dSdcbiAqL1xuZnVuY3Rpb24gZGVidXJyKHN0cmluZykge1xuICBzdHJpbmcgPSB0b1N0cmluZyhzdHJpbmcpO1xuICByZXR1cm4gc3RyaW5nICYmIHN0cmluZy5yZXBsYWNlKHJlTGF0aW4xLCBkZWJ1cnJMZXR0ZXIpLnJlcGxhY2UocmVDb21ib01hcmssICcnKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBkZWJ1cnI7XG4iLCIvKipcbiAqIGxvZGFzaCAzLjIuMCAoQ3VzdG9tIEJ1aWxkKSA8aHR0cHM6Ly9sb2Rhc2guY29tLz5cbiAqIEJ1aWxkOiBgbG9kYXNoIG1vZHVsYXJpemUgZXhwb3J0cz1cIm5wbVwiIC1vIC4vYFxuICogQ29weXJpZ2h0IDIwMTItMjAxNiBUaGUgRG9qbyBGb3VuZGF0aW9uIDxodHRwOi8vZG9qb2ZvdW5kYXRpb24ub3JnLz5cbiAqIEJhc2VkIG9uIFVuZGVyc2NvcmUuanMgMS44LjMgPGh0dHA6Ly91bmRlcnNjb3JlanMub3JnL0xJQ0VOU0U+XG4gKiBDb3B5cmlnaHQgMjAwOS0yMDE2IEplcmVteSBBc2hrZW5hcywgRG9jdW1lbnRDbG91ZCBhbmQgSW52ZXN0aWdhdGl2ZSBSZXBvcnRlcnMgJiBFZGl0b3JzXG4gKiBBdmFpbGFibGUgdW5kZXIgTUlUIGxpY2Vuc2UgPGh0dHBzOi8vbG9kYXNoLmNvbS9saWNlbnNlPlxuICovXG52YXIgcm9vdCA9IHJlcXVpcmUoJ2xvZGFzaC5fcm9vdCcpO1xuXG4vKiogVXNlZCBhcyByZWZlcmVuY2VzIGZvciB2YXJpb3VzIGBOdW1iZXJgIGNvbnN0YW50cy4gKi9cbnZhciBJTkZJTklUWSA9IDEgLyAwO1xuXG4vKiogYE9iamVjdCN0b1N0cmluZ2AgcmVzdWx0IHJlZmVyZW5jZXMuICovXG52YXIgc3ltYm9sVGFnID0gJ1tvYmplY3QgU3ltYm9sXSc7XG5cbi8qKiBVc2VkIHRvIG1hdGNoIEhUTUwgZW50aXRpZXMgYW5kIEhUTUwgY2hhcmFjdGVycy4gKi9cbnZhciByZVVuZXNjYXBlZEh0bWwgPSAvWyY8PlwiJ2BdL2csXG4gICAgcmVIYXNVbmVzY2FwZWRIdG1sID0gUmVnRXhwKHJlVW5lc2NhcGVkSHRtbC5zb3VyY2UpO1xuXG4vKiogVXNlZCB0byBtYXAgY2hhcmFjdGVycyB0byBIVE1MIGVudGl0aWVzLiAqL1xudmFyIGh0bWxFc2NhcGVzID0ge1xuICAnJic6ICcmYW1wOycsXG4gICc8JzogJyZsdDsnLFxuICAnPic6ICcmZ3Q7JyxcbiAgJ1wiJzogJyZxdW90OycsXG4gIFwiJ1wiOiAnJiMzOTsnLFxuICAnYCc6ICcmIzk2Oydcbn07XG5cbi8qKlxuICogVXNlZCBieSBgXy5lc2NhcGVgIHRvIGNvbnZlcnQgY2hhcmFjdGVycyB0byBIVE1MIGVudGl0aWVzLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge3N0cmluZ30gY2hyIFRoZSBtYXRjaGVkIGNoYXJhY3RlciB0byBlc2NhcGUuXG4gKiBAcmV0dXJucyB7c3RyaW5nfSBSZXR1cm5zIHRoZSBlc2NhcGVkIGNoYXJhY3Rlci5cbiAqL1xuZnVuY3Rpb24gZXNjYXBlSHRtbENoYXIoY2hyKSB7XG4gIHJldHVybiBodG1sRXNjYXBlc1tjaHJdO1xufVxuXG4vKiogVXNlZCBmb3IgYnVpbHQtaW4gbWV0aG9kIHJlZmVyZW5jZXMuICovXG52YXIgb2JqZWN0UHJvdG8gPSBPYmplY3QucHJvdG90eXBlO1xuXG4vKipcbiAqIFVzZWQgdG8gcmVzb2x2ZSB0aGUgW2B0b1N0cmluZ1RhZ2BdKGh0dHA6Ly9lY21hLWludGVybmF0aW9uYWwub3JnL2VjbWEtMjYyLzYuMC8jc2VjLW9iamVjdC5wcm90b3R5cGUudG9zdHJpbmcpXG4gKiBvZiB2YWx1ZXMuXG4gKi9cbnZhciBvYmplY3RUb1N0cmluZyA9IG9iamVjdFByb3RvLnRvU3RyaW5nO1xuXG4vKiogQnVpbHQtaW4gdmFsdWUgcmVmZXJlbmNlcy4gKi9cbnZhciBTeW1ib2wgPSByb290LlN5bWJvbDtcblxuLyoqIFVzZWQgdG8gY29udmVydCBzeW1ib2xzIHRvIHByaW1pdGl2ZXMgYW5kIHN0cmluZ3MuICovXG52YXIgc3ltYm9sUHJvdG8gPSBTeW1ib2wgPyBTeW1ib2wucHJvdG90eXBlIDogdW5kZWZpbmVkLFxuICAgIHN5bWJvbFRvU3RyaW5nID0gU3ltYm9sID8gc3ltYm9sUHJvdG8udG9TdHJpbmcgOiB1bmRlZmluZWQ7XG5cbi8qKlxuICogQ2hlY2tzIGlmIGB2YWx1ZWAgaXMgb2JqZWN0LWxpa2UuIEEgdmFsdWUgaXMgb2JqZWN0LWxpa2UgaWYgaXQncyBub3QgYG51bGxgXG4gKiBhbmQgaGFzIGEgYHR5cGVvZmAgcmVzdWx0IG9mIFwib2JqZWN0XCIuXG4gKlxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIF9cbiAqIEBjYXRlZ29yeSBMYW5nXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBgdmFsdWVgIGlzIG9iamVjdC1saWtlLCBlbHNlIGBmYWxzZWAuXG4gKiBAZXhhbXBsZVxuICpcbiAqIF8uaXNPYmplY3RMaWtlKHt9KTtcbiAqIC8vID0+IHRydWVcbiAqXG4gKiBfLmlzT2JqZWN0TGlrZShbMSwgMiwgM10pO1xuICogLy8gPT4gdHJ1ZVxuICpcbiAqIF8uaXNPYmplY3RMaWtlKF8ubm9vcCk7XG4gKiAvLyA9PiBmYWxzZVxuICpcbiAqIF8uaXNPYmplY3RMaWtlKG51bGwpO1xuICogLy8gPT4gZmFsc2VcbiAqL1xuZnVuY3Rpb24gaXNPYmplY3RMaWtlKHZhbHVlKSB7XG4gIHJldHVybiAhIXZhbHVlICYmIHR5cGVvZiB2YWx1ZSA9PSAnb2JqZWN0Jztcbn1cblxuLyoqXG4gKiBDaGVja3MgaWYgYHZhbHVlYCBpcyBjbGFzc2lmaWVkIGFzIGEgYFN5bWJvbGAgcHJpbWl0aXZlIG9yIG9iamVjdC5cbiAqXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgX1xuICogQGNhdGVnb3J5IExhbmdcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIGB2YWx1ZWAgaXMgY29ycmVjdGx5IGNsYXNzaWZpZWQsIGVsc2UgYGZhbHNlYC5cbiAqIEBleGFtcGxlXG4gKlxuICogXy5pc1N5bWJvbChTeW1ib2wuaXRlcmF0b3IpO1xuICogLy8gPT4gdHJ1ZVxuICpcbiAqIF8uaXNTeW1ib2woJ2FiYycpO1xuICogLy8gPT4gZmFsc2VcbiAqL1xuZnVuY3Rpb24gaXNTeW1ib2wodmFsdWUpIHtcbiAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PSAnc3ltYm9sJyB8fFxuICAgIChpc09iamVjdExpa2UodmFsdWUpICYmIG9iamVjdFRvU3RyaW5nLmNhbGwodmFsdWUpID09IHN5bWJvbFRhZyk7XG59XG5cbi8qKlxuICogQ29udmVydHMgYHZhbHVlYCB0byBhIHN0cmluZyBpZiBpdCdzIG5vdCBvbmUuIEFuIGVtcHR5IHN0cmluZyBpcyByZXR1cm5lZFxuICogZm9yIGBudWxsYCBhbmQgYHVuZGVmaW5lZGAgdmFsdWVzLiBUaGUgc2lnbiBvZiBgLTBgIGlzIHByZXNlcnZlZC5cbiAqXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgX1xuICogQGNhdGVnb3J5IExhbmdcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIHByb2Nlc3MuXG4gKiBAcmV0dXJucyB7c3RyaW5nfSBSZXR1cm5zIHRoZSBzdHJpbmcuXG4gKiBAZXhhbXBsZVxuICpcbiAqIF8udG9TdHJpbmcobnVsbCk7XG4gKiAvLyA9PiAnJ1xuICpcbiAqIF8udG9TdHJpbmcoLTApO1xuICogLy8gPT4gJy0wJ1xuICpcbiAqIF8udG9TdHJpbmcoWzEsIDIsIDNdKTtcbiAqIC8vID0+ICcxLDIsMydcbiAqL1xuZnVuY3Rpb24gdG9TdHJpbmcodmFsdWUpIHtcbiAgLy8gRXhpdCBlYXJseSBmb3Igc3RyaW5ncyB0byBhdm9pZCBhIHBlcmZvcm1hbmNlIGhpdCBpbiBzb21lIGVudmlyb25tZW50cy5cbiAgaWYgKHR5cGVvZiB2YWx1ZSA9PSAnc3RyaW5nJykge1xuICAgIHJldHVybiB2YWx1ZTtcbiAgfVxuICBpZiAodmFsdWUgPT0gbnVsbCkge1xuICAgIHJldHVybiAnJztcbiAgfVxuICBpZiAoaXNTeW1ib2wodmFsdWUpKSB7XG4gICAgcmV0dXJuIFN5bWJvbCA/IHN5bWJvbFRvU3RyaW5nLmNhbGwodmFsdWUpIDogJyc7XG4gIH1cbiAgdmFyIHJlc3VsdCA9ICh2YWx1ZSArICcnKTtcbiAgcmV0dXJuIChyZXN1bHQgPT0gJzAnICYmICgxIC8gdmFsdWUpID09IC1JTkZJTklUWSkgPyAnLTAnIDogcmVzdWx0O1xufVxuXG4vKipcbiAqIENvbnZlcnRzIHRoZSBjaGFyYWN0ZXJzIFwiJlwiLCBcIjxcIiwgXCI+XCIsICdcIicsIFwiJ1wiLCBhbmQgXCJcXGBcIiBpbiBgc3RyaW5nYCB0b1xuICogdGhlaXIgY29ycmVzcG9uZGluZyBIVE1MIGVudGl0aWVzLlxuICpcbiAqICoqTm90ZToqKiBObyBvdGhlciBjaGFyYWN0ZXJzIGFyZSBlc2NhcGVkLiBUbyBlc2NhcGUgYWRkaXRpb25hbFxuICogY2hhcmFjdGVycyB1c2UgYSB0aGlyZC1wYXJ0eSBsaWJyYXJ5IGxpa2UgW19oZV9dKGh0dHBzOi8vbXRocy5iZS9oZSkuXG4gKlxuICogVGhvdWdoIHRoZSBcIj5cIiBjaGFyYWN0ZXIgaXMgZXNjYXBlZCBmb3Igc3ltbWV0cnksIGNoYXJhY3RlcnMgbGlrZVxuICogXCI+XCIgYW5kIFwiL1wiIGRvbid0IG5lZWQgZXNjYXBpbmcgaW4gSFRNTCBhbmQgaGF2ZSBubyBzcGVjaWFsIG1lYW5pbmdcbiAqIHVubGVzcyB0aGV5J3JlIHBhcnQgb2YgYSB0YWcgb3IgdW5xdW90ZWQgYXR0cmlidXRlIHZhbHVlLlxuICogU2VlIFtNYXRoaWFzIEJ5bmVucydzIGFydGljbGVdKGh0dHBzOi8vbWF0aGlhc2J5bmVucy5iZS9ub3Rlcy9hbWJpZ3VvdXMtYW1wZXJzYW5kcylcbiAqICh1bmRlciBcInNlbWktcmVsYXRlZCBmdW4gZmFjdFwiKSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIEJhY2t0aWNrcyBhcmUgZXNjYXBlZCBiZWNhdXNlIGluIElFIDwgOSwgdGhleSBjYW4gYnJlYWsgb3V0IG9mXG4gKiBhdHRyaWJ1dGUgdmFsdWVzIG9yIEhUTUwgY29tbWVudHMuIFNlZSBbIzU5XShodHRwczovL2h0bWw1c2VjLm9yZy8jNTkpLFxuICogWyMxMDJdKGh0dHBzOi8vaHRtbDVzZWMub3JnLyMxMDIpLCBbIzEwOF0oaHR0cHM6Ly9odG1sNXNlYy5vcmcvIzEwOCksIGFuZFxuICogWyMxMzNdKGh0dHBzOi8vaHRtbDVzZWMub3JnLyMxMzMpIG9mIHRoZSBbSFRNTDUgU2VjdXJpdHkgQ2hlYXRzaGVldF0oaHR0cHM6Ly9odG1sNXNlYy5vcmcvKVxuICogZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBXaGVuIHdvcmtpbmcgd2l0aCBIVE1MIHlvdSBzaG91bGQgYWx3YXlzIFtxdW90ZSBhdHRyaWJ1dGUgdmFsdWVzXShodHRwOi8vd29ua28uY29tL3Bvc3QvaHRtbC1lc2NhcGluZylcbiAqIHRvIHJlZHVjZSBYU1MgdmVjdG9ycy5cbiAqXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgX1xuICogQGNhdGVnb3J5IFN0cmluZ1xuICogQHBhcmFtIHtzdHJpbmd9IFtzdHJpbmc9JyddIFRoZSBzdHJpbmcgdG8gZXNjYXBlLlxuICogQHJldHVybnMge3N0cmluZ30gUmV0dXJucyB0aGUgZXNjYXBlZCBzdHJpbmcuXG4gKiBAZXhhbXBsZVxuICpcbiAqIF8uZXNjYXBlKCdmcmVkLCBiYXJuZXksICYgcGViYmxlcycpO1xuICogLy8gPT4gJ2ZyZWQsIGJhcm5leSwgJmFtcDsgcGViYmxlcydcbiAqL1xuZnVuY3Rpb24gZXNjYXBlKHN0cmluZykge1xuICBzdHJpbmcgPSB0b1N0cmluZyhzdHJpbmcpO1xuICByZXR1cm4gKHN0cmluZyAmJiByZUhhc1VuZXNjYXBlZEh0bWwudGVzdChzdHJpbmcpKVxuICAgID8gc3RyaW5nLnJlcGxhY2UocmVVbmVzY2FwZWRIdG1sLCBlc2NhcGVIdG1sQ2hhcilcbiAgICA6IHN0cmluZztcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBlc2NhcGU7XG4iLCIvKipcbiAqIGxvZGFzaCAzLjAuMiAoQ3VzdG9tIEJ1aWxkKSA8aHR0cHM6Ly9sb2Rhc2guY29tLz5cbiAqIEJ1aWxkOiBgbG9kYXNoIG1vZGVybiBtb2R1bGFyaXplIGV4cG9ydHM9XCJucG1cIiAtbyAuL2BcbiAqIENvcHlyaWdodCAyMDEyLTIwMTUgVGhlIERvam8gRm91bmRhdGlvbiA8aHR0cDovL2Rvam9mb3VuZGF0aW9uLm9yZy8+XG4gKiBCYXNlZCBvbiBVbmRlcnNjb3JlLmpzIDEuOC4zIDxodHRwOi8vdW5kZXJzY29yZWpzLm9yZy9MSUNFTlNFPlxuICogQ29weXJpZ2h0IDIwMDktMjAxNSBKZXJlbXkgQXNoa2VuYXMsIERvY3VtZW50Q2xvdWQgYW5kIEludmVzdGlnYXRpdmUgUmVwb3J0ZXJzICYgRWRpdG9yc1xuICogQXZhaWxhYmxlIHVuZGVyIE1JVCBsaWNlbnNlIDxodHRwczovL2xvZGFzaC5jb20vbGljZW5zZT5cbiAqL1xudmFyIGJhc2VGb3IgPSByZXF1aXJlKCdsb2Rhc2guX2Jhc2Vmb3InKSxcbiAgICBiaW5kQ2FsbGJhY2sgPSByZXF1aXJlKCdsb2Rhc2guX2JpbmRjYWxsYmFjaycpLFxuICAgIGtleXMgPSByZXF1aXJlKCdsb2Rhc2gua2V5cycpO1xuXG4vKipcbiAqIFRoZSBiYXNlIGltcGxlbWVudGF0aW9uIG9mIGBfLmZvck93bmAgd2l0aG91dCBzdXBwb3J0IGZvciBjYWxsYmFja1xuICogc2hvcnRoYW5kcyBhbmQgYHRoaXNgIGJpbmRpbmcuXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3QgVGhlIG9iamVjdCB0byBpdGVyYXRlIG92ZXIuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBpdGVyYXRlZSBUaGUgZnVuY3Rpb24gaW52b2tlZCBwZXIgaXRlcmF0aW9uLlxuICogQHJldHVybnMge09iamVjdH0gUmV0dXJucyBgb2JqZWN0YC5cbiAqL1xuZnVuY3Rpb24gYmFzZUZvck93bihvYmplY3QsIGl0ZXJhdGVlKSB7XG4gIHJldHVybiBiYXNlRm9yKG9iamVjdCwgaXRlcmF0ZWUsIGtleXMpO1xufVxuXG4vKipcbiAqIENyZWF0ZXMgYSBmdW5jdGlvbiBmb3IgYF8uZm9yT3duYCBvciBgXy5mb3JPd25SaWdodGAuXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7RnVuY3Rpb259IG9iamVjdEZ1bmMgVGhlIGZ1bmN0aW9uIHRvIGl0ZXJhdGUgb3ZlciBhbiBvYmplY3QuXG4gKiBAcmV0dXJucyB7RnVuY3Rpb259IFJldHVybnMgdGhlIG5ldyBlYWNoIGZ1bmN0aW9uLlxuICovXG5mdW5jdGlvbiBjcmVhdGVGb3JPd24ob2JqZWN0RnVuYykge1xuICByZXR1cm4gZnVuY3Rpb24ob2JqZWN0LCBpdGVyYXRlZSwgdGhpc0FyZykge1xuICAgIGlmICh0eXBlb2YgaXRlcmF0ZWUgIT0gJ2Z1bmN0aW9uJyB8fCB0aGlzQXJnICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGl0ZXJhdGVlID0gYmluZENhbGxiYWNrKGl0ZXJhdGVlLCB0aGlzQXJnLCAzKTtcbiAgICB9XG4gICAgcmV0dXJuIG9iamVjdEZ1bmMob2JqZWN0LCBpdGVyYXRlZSk7XG4gIH07XG59XG5cbi8qKlxuICogSXRlcmF0ZXMgb3ZlciBvd24gZW51bWVyYWJsZSBwcm9wZXJ0aWVzIG9mIGFuIG9iamVjdCBpbnZva2luZyBgaXRlcmF0ZWVgXG4gKiBmb3IgZWFjaCBwcm9wZXJ0eS4gVGhlIGBpdGVyYXRlZWAgaXMgYm91bmQgdG8gYHRoaXNBcmdgIGFuZCBpbnZva2VkIHdpdGhcbiAqIHRocmVlIGFyZ3VtZW50czogKHZhbHVlLCBrZXksIG9iamVjdCkuIEl0ZXJhdGVlIGZ1bmN0aW9ucyBtYXkgZXhpdCBpdGVyYXRpb25cbiAqIGVhcmx5IGJ5IGV4cGxpY2l0bHkgcmV0dXJuaW5nIGBmYWxzZWAuXG4gKlxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIF9cbiAqIEBjYXRlZ29yeSBPYmplY3RcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3QgVGhlIG9iamVjdCB0byBpdGVyYXRlIG92ZXIuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbaXRlcmF0ZWU9Xy5pZGVudGl0eV0gVGhlIGZ1bmN0aW9uIGludm9rZWQgcGVyIGl0ZXJhdGlvbi5cbiAqIEBwYXJhbSB7Kn0gW3RoaXNBcmddIFRoZSBgdGhpc2AgYmluZGluZyBvZiBgaXRlcmF0ZWVgLlxuICogQHJldHVybnMge09iamVjdH0gUmV0dXJucyBgb2JqZWN0YC5cbiAqIEBleGFtcGxlXG4gKlxuICogZnVuY3Rpb24gRm9vKCkge1xuICogICB0aGlzLmEgPSAxO1xuICogICB0aGlzLmIgPSAyO1xuICogfVxuICpcbiAqIEZvby5wcm90b3R5cGUuYyA9IDM7XG4gKlxuICogXy5mb3JPd24obmV3IEZvbywgZnVuY3Rpb24odmFsdWUsIGtleSkge1xuICogICBjb25zb2xlLmxvZyhrZXkpO1xuICogfSk7XG4gKiAvLyA9PiBsb2dzICdhJyBhbmQgJ2InIChpdGVyYXRpb24gb3JkZXIgaXMgbm90IGd1YXJhbnRlZWQpXG4gKi9cbnZhciBmb3JPd24gPSBjcmVhdGVGb3JPd24oYmFzZUZvck93bik7XG5cbm1vZHVsZS5leHBvcnRzID0gZm9yT3duO1xuIiwiLyoqXG4gKiBsb2Rhc2ggMy4wLjggKEN1c3RvbSBCdWlsZCkgPGh0dHBzOi8vbG9kYXNoLmNvbS8+XG4gKiBCdWlsZDogYGxvZGFzaCBtb2R1bGFyaXplIGV4cG9ydHM9XCJucG1cIiAtbyAuL2BcbiAqIENvcHlyaWdodCAyMDEyLTIwMTYgVGhlIERvam8gRm91bmRhdGlvbiA8aHR0cDovL2Rvam9mb3VuZGF0aW9uLm9yZy8+XG4gKiBCYXNlZCBvbiBVbmRlcnNjb3JlLmpzIDEuOC4zIDxodHRwOi8vdW5kZXJzY29yZWpzLm9yZy9MSUNFTlNFPlxuICogQ29weXJpZ2h0IDIwMDktMjAxNiBKZXJlbXkgQXNoa2VuYXMsIERvY3VtZW50Q2xvdWQgYW5kIEludmVzdGlnYXRpdmUgUmVwb3J0ZXJzICYgRWRpdG9yc1xuICogQXZhaWxhYmxlIHVuZGVyIE1JVCBsaWNlbnNlIDxodHRwczovL2xvZGFzaC5jb20vbGljZW5zZT5cbiAqL1xuXG4vKiogVXNlZCBhcyByZWZlcmVuY2VzIGZvciB2YXJpb3VzIGBOdW1iZXJgIGNvbnN0YW50cy4gKi9cbnZhciBNQVhfU0FGRV9JTlRFR0VSID0gOTAwNzE5OTI1NDc0MDk5MTtcblxuLyoqIGBPYmplY3QjdG9TdHJpbmdgIHJlc3VsdCByZWZlcmVuY2VzLiAqL1xudmFyIGFyZ3NUYWcgPSAnW29iamVjdCBBcmd1bWVudHNdJyxcbiAgICBmdW5jVGFnID0gJ1tvYmplY3QgRnVuY3Rpb25dJyxcbiAgICBnZW5UYWcgPSAnW29iamVjdCBHZW5lcmF0b3JGdW5jdGlvbl0nO1xuXG4vKiogVXNlZCBmb3IgYnVpbHQtaW4gbWV0aG9kIHJlZmVyZW5jZXMuICovXG52YXIgb2JqZWN0UHJvdG8gPSBPYmplY3QucHJvdG90eXBlO1xuXG4vKiogVXNlZCB0byBjaGVjayBvYmplY3RzIGZvciBvd24gcHJvcGVydGllcy4gKi9cbnZhciBoYXNPd25Qcm9wZXJ0eSA9IG9iamVjdFByb3RvLmhhc093blByb3BlcnR5O1xuXG4vKipcbiAqIFVzZWQgdG8gcmVzb2x2ZSB0aGUgW2B0b1N0cmluZ1RhZ2BdKGh0dHA6Ly9lY21hLWludGVybmF0aW9uYWwub3JnL2VjbWEtMjYyLzYuMC8jc2VjLW9iamVjdC5wcm90b3R5cGUudG9zdHJpbmcpXG4gKiBvZiB2YWx1ZXMuXG4gKi9cbnZhciBvYmplY3RUb1N0cmluZyA9IG9iamVjdFByb3RvLnRvU3RyaW5nO1xuXG4vKiogQnVpbHQtaW4gdmFsdWUgcmVmZXJlbmNlcy4gKi9cbnZhciBwcm9wZXJ0eUlzRW51bWVyYWJsZSA9IG9iamVjdFByb3RvLnByb3BlcnR5SXNFbnVtZXJhYmxlO1xuXG4vKipcbiAqIFRoZSBiYXNlIGltcGxlbWVudGF0aW9uIG9mIGBfLnByb3BlcnR5YCB3aXRob3V0IHN1cHBvcnQgZm9yIGRlZXAgcGF0aHMuXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7c3RyaW5nfSBrZXkgVGhlIGtleSBvZiB0aGUgcHJvcGVydHkgdG8gZ2V0LlxuICogQHJldHVybnMge0Z1bmN0aW9ufSBSZXR1cm5zIHRoZSBuZXcgZnVuY3Rpb24uXG4gKi9cbmZ1bmN0aW9uIGJhc2VQcm9wZXJ0eShrZXkpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKG9iamVjdCkge1xuICAgIHJldHVybiBvYmplY3QgPT0gbnVsbCA/IHVuZGVmaW5lZCA6IG9iamVjdFtrZXldO1xuICB9O1xufVxuXG4vKipcbiAqIEdldHMgdGhlIFwibGVuZ3RoXCIgcHJvcGVydHkgdmFsdWUgb2YgYG9iamVjdGAuXG4gKlxuICogKipOb3RlOioqIFRoaXMgZnVuY3Rpb24gaXMgdXNlZCB0byBhdm9pZCBhIFtKSVQgYnVnXShodHRwczovL2J1Z3Mud2Via2l0Lm9yZy9zaG93X2J1Zy5jZ2k/aWQ9MTQyNzkyKVxuICogdGhhdCBhZmZlY3RzIFNhZmFyaSBvbiBhdCBsZWFzdCBpT1MgOC4xLTguMyBBUk02NC5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHtPYmplY3R9IG9iamVjdCBUaGUgb2JqZWN0IHRvIHF1ZXJ5LlxuICogQHJldHVybnMgeyp9IFJldHVybnMgdGhlIFwibGVuZ3RoXCIgdmFsdWUuXG4gKi9cbnZhciBnZXRMZW5ndGggPSBiYXNlUHJvcGVydHkoJ2xlbmd0aCcpO1xuXG4vKipcbiAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIGxpa2VseSBhbiBgYXJndW1lbnRzYCBvYmplY3QuXG4gKlxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIF9cbiAqIEBjYXRlZ29yeSBMYW5nXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBgdmFsdWVgIGlzIGNvcnJlY3RseSBjbGFzc2lmaWVkLCBlbHNlIGBmYWxzZWAuXG4gKiBAZXhhbXBsZVxuICpcbiAqIF8uaXNBcmd1bWVudHMoZnVuY3Rpb24oKSB7IHJldHVybiBhcmd1bWVudHM7IH0oKSk7XG4gKiAvLyA9PiB0cnVlXG4gKlxuICogXy5pc0FyZ3VtZW50cyhbMSwgMiwgM10pO1xuICogLy8gPT4gZmFsc2VcbiAqL1xuZnVuY3Rpb24gaXNBcmd1bWVudHModmFsdWUpIHtcbiAgLy8gU2FmYXJpIDguMSBpbmNvcnJlY3RseSBtYWtlcyBgYXJndW1lbnRzLmNhbGxlZWAgZW51bWVyYWJsZSBpbiBzdHJpY3QgbW9kZS5cbiAgcmV0dXJuIGlzQXJyYXlMaWtlT2JqZWN0KHZhbHVlKSAmJiBoYXNPd25Qcm9wZXJ0eS5jYWxsKHZhbHVlLCAnY2FsbGVlJykgJiZcbiAgICAoIXByb3BlcnR5SXNFbnVtZXJhYmxlLmNhbGwodmFsdWUsICdjYWxsZWUnKSB8fCBvYmplY3RUb1N0cmluZy5jYWxsKHZhbHVlKSA9PSBhcmdzVGFnKTtcbn1cblxuLyoqXG4gKiBDaGVja3MgaWYgYHZhbHVlYCBpcyBhcnJheS1saWtlLiBBIHZhbHVlIGlzIGNvbnNpZGVyZWQgYXJyYXktbGlrZSBpZiBpdCdzXG4gKiBub3QgYSBmdW5jdGlvbiBhbmQgaGFzIGEgYHZhbHVlLmxlbmd0aGAgdGhhdCdzIGFuIGludGVnZXIgZ3JlYXRlciB0aGFuIG9yXG4gKiBlcXVhbCB0byBgMGAgYW5kIGxlc3MgdGhhbiBvciBlcXVhbCB0byBgTnVtYmVyLk1BWF9TQUZFX0lOVEVHRVJgLlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBfXG4gKiBAY2F0ZWdvcnkgTGFuZ1xuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgYHZhbHVlYCBpcyBhcnJheS1saWtlLCBlbHNlIGBmYWxzZWAuXG4gKiBAZXhhbXBsZVxuICpcbiAqIF8uaXNBcnJheUxpa2UoWzEsIDIsIDNdKTtcbiAqIC8vID0+IHRydWVcbiAqXG4gKiBfLmlzQXJyYXlMaWtlKGRvY3VtZW50LmJvZHkuY2hpbGRyZW4pO1xuICogLy8gPT4gdHJ1ZVxuICpcbiAqIF8uaXNBcnJheUxpa2UoJ2FiYycpO1xuICogLy8gPT4gdHJ1ZVxuICpcbiAqIF8uaXNBcnJheUxpa2UoXy5ub29wKTtcbiAqIC8vID0+IGZhbHNlXG4gKi9cbmZ1bmN0aW9uIGlzQXJyYXlMaWtlKHZhbHVlKSB7XG4gIHJldHVybiB2YWx1ZSAhPSBudWxsICYmIGlzTGVuZ3RoKGdldExlbmd0aCh2YWx1ZSkpICYmICFpc0Z1bmN0aW9uKHZhbHVlKTtcbn1cblxuLyoqXG4gKiBUaGlzIG1ldGhvZCBpcyBsaWtlIGBfLmlzQXJyYXlMaWtlYCBleGNlcHQgdGhhdCBpdCBhbHNvIGNoZWNrcyBpZiBgdmFsdWVgXG4gKiBpcyBhbiBvYmplY3QuXG4gKlxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIF9cbiAqIEBjYXRlZ29yeSBMYW5nXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBgdmFsdWVgIGlzIGFuIGFycmF5LWxpa2Ugb2JqZWN0LCBlbHNlIGBmYWxzZWAuXG4gKiBAZXhhbXBsZVxuICpcbiAqIF8uaXNBcnJheUxpa2VPYmplY3QoWzEsIDIsIDNdKTtcbiAqIC8vID0+IHRydWVcbiAqXG4gKiBfLmlzQXJyYXlMaWtlT2JqZWN0KGRvY3VtZW50LmJvZHkuY2hpbGRyZW4pO1xuICogLy8gPT4gdHJ1ZVxuICpcbiAqIF8uaXNBcnJheUxpa2VPYmplY3QoJ2FiYycpO1xuICogLy8gPT4gZmFsc2VcbiAqXG4gKiBfLmlzQXJyYXlMaWtlT2JqZWN0KF8ubm9vcCk7XG4gKiAvLyA9PiBmYWxzZVxuICovXG5mdW5jdGlvbiBpc0FycmF5TGlrZU9iamVjdCh2YWx1ZSkge1xuICByZXR1cm4gaXNPYmplY3RMaWtlKHZhbHVlKSAmJiBpc0FycmF5TGlrZSh2YWx1ZSk7XG59XG5cbi8qKlxuICogQ2hlY2tzIGlmIGB2YWx1ZWAgaXMgY2xhc3NpZmllZCBhcyBhIGBGdW5jdGlvbmAgb2JqZWN0LlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBfXG4gKiBAY2F0ZWdvcnkgTGFuZ1xuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgYHZhbHVlYCBpcyBjb3JyZWN0bHkgY2xhc3NpZmllZCwgZWxzZSBgZmFsc2VgLlxuICogQGV4YW1wbGVcbiAqXG4gKiBfLmlzRnVuY3Rpb24oXyk7XG4gKiAvLyA9PiB0cnVlXG4gKlxuICogXy5pc0Z1bmN0aW9uKC9hYmMvKTtcbiAqIC8vID0+IGZhbHNlXG4gKi9cbmZ1bmN0aW9uIGlzRnVuY3Rpb24odmFsdWUpIHtcbiAgLy8gVGhlIHVzZSBvZiBgT2JqZWN0I3RvU3RyaW5nYCBhdm9pZHMgaXNzdWVzIHdpdGggdGhlIGB0eXBlb2ZgIG9wZXJhdG9yXG4gIC8vIGluIFNhZmFyaSA4IHdoaWNoIHJldHVybnMgJ29iamVjdCcgZm9yIHR5cGVkIGFycmF5IGFuZCB3ZWFrIG1hcCBjb25zdHJ1Y3RvcnMsXG4gIC8vIGFuZCBQaGFudG9tSlMgMS45IHdoaWNoIHJldHVybnMgJ2Z1bmN0aW9uJyBmb3IgYE5vZGVMaXN0YCBpbnN0YW5jZXMuXG4gIHZhciB0YWcgPSBpc09iamVjdCh2YWx1ZSkgPyBvYmplY3RUb1N0cmluZy5jYWxsKHZhbHVlKSA6ICcnO1xuICByZXR1cm4gdGFnID09IGZ1bmNUYWcgfHwgdGFnID09IGdlblRhZztcbn1cblxuLyoqXG4gKiBDaGVja3MgaWYgYHZhbHVlYCBpcyBhIHZhbGlkIGFycmF5LWxpa2UgbGVuZ3RoLlxuICpcbiAqICoqTm90ZToqKiBUaGlzIGZ1bmN0aW9uIGlzIGxvb3NlbHkgYmFzZWQgb24gW2BUb0xlbmd0aGBdKGh0dHA6Ly9lY21hLWludGVybmF0aW9uYWwub3JnL2VjbWEtMjYyLzYuMC8jc2VjLXRvbGVuZ3RoKS5cbiAqXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgX1xuICogQGNhdGVnb3J5IExhbmdcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIGB2YWx1ZWAgaXMgYSB2YWxpZCBsZW5ndGgsIGVsc2UgYGZhbHNlYC5cbiAqIEBleGFtcGxlXG4gKlxuICogXy5pc0xlbmd0aCgzKTtcbiAqIC8vID0+IHRydWVcbiAqXG4gKiBfLmlzTGVuZ3RoKE51bWJlci5NSU5fVkFMVUUpO1xuICogLy8gPT4gZmFsc2VcbiAqXG4gKiBfLmlzTGVuZ3RoKEluZmluaXR5KTtcbiAqIC8vID0+IGZhbHNlXG4gKlxuICogXy5pc0xlbmd0aCgnMycpO1xuICogLy8gPT4gZmFsc2VcbiAqL1xuZnVuY3Rpb24gaXNMZW5ndGgodmFsdWUpIHtcbiAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PSAnbnVtYmVyJyAmJlxuICAgIHZhbHVlID4gLTEgJiYgdmFsdWUgJSAxID09IDAgJiYgdmFsdWUgPD0gTUFYX1NBRkVfSU5URUdFUjtcbn1cblxuLyoqXG4gKiBDaGVja3MgaWYgYHZhbHVlYCBpcyB0aGUgW2xhbmd1YWdlIHR5cGVdKGh0dHBzOi8vZXM1LmdpdGh1Yi5pby8jeDgpIG9mIGBPYmplY3RgLlxuICogKGUuZy4gYXJyYXlzLCBmdW5jdGlvbnMsIG9iamVjdHMsIHJlZ2V4ZXMsIGBuZXcgTnVtYmVyKDApYCwgYW5kIGBuZXcgU3RyaW5nKCcnKWApXG4gKlxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIF9cbiAqIEBjYXRlZ29yeSBMYW5nXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBgdmFsdWVgIGlzIGFuIG9iamVjdCwgZWxzZSBgZmFsc2VgLlxuICogQGV4YW1wbGVcbiAqXG4gKiBfLmlzT2JqZWN0KHt9KTtcbiAqIC8vID0+IHRydWVcbiAqXG4gKiBfLmlzT2JqZWN0KFsxLCAyLCAzXSk7XG4gKiAvLyA9PiB0cnVlXG4gKlxuICogXy5pc09iamVjdChfLm5vb3ApO1xuICogLy8gPT4gdHJ1ZVxuICpcbiAqIF8uaXNPYmplY3QobnVsbCk7XG4gKiAvLyA9PiBmYWxzZVxuICovXG5mdW5jdGlvbiBpc09iamVjdCh2YWx1ZSkge1xuICB2YXIgdHlwZSA9IHR5cGVvZiB2YWx1ZTtcbiAgcmV0dXJuICEhdmFsdWUgJiYgKHR5cGUgPT0gJ29iamVjdCcgfHwgdHlwZSA9PSAnZnVuY3Rpb24nKTtcbn1cblxuLyoqXG4gKiBDaGVja3MgaWYgYHZhbHVlYCBpcyBvYmplY3QtbGlrZS4gQSB2YWx1ZSBpcyBvYmplY3QtbGlrZSBpZiBpdCdzIG5vdCBgbnVsbGBcbiAqIGFuZCBoYXMgYSBgdHlwZW9mYCByZXN1bHQgb2YgXCJvYmplY3RcIi5cbiAqXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgX1xuICogQGNhdGVnb3J5IExhbmdcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIGB2YWx1ZWAgaXMgb2JqZWN0LWxpa2UsIGVsc2UgYGZhbHNlYC5cbiAqIEBleGFtcGxlXG4gKlxuICogXy5pc09iamVjdExpa2Uoe30pO1xuICogLy8gPT4gdHJ1ZVxuICpcbiAqIF8uaXNPYmplY3RMaWtlKFsxLCAyLCAzXSk7XG4gKiAvLyA9PiB0cnVlXG4gKlxuICogXy5pc09iamVjdExpa2UoXy5ub29wKTtcbiAqIC8vID0+IGZhbHNlXG4gKlxuICogXy5pc09iamVjdExpa2UobnVsbCk7XG4gKiAvLyA9PiBmYWxzZVxuICovXG5mdW5jdGlvbiBpc09iamVjdExpa2UodmFsdWUpIHtcbiAgcmV0dXJuICEhdmFsdWUgJiYgdHlwZW9mIHZhbHVlID09ICdvYmplY3QnO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGlzQXJndW1lbnRzO1xuIiwiLyoqXG4gKiBsb2Rhc2ggMy4wLjQgKEN1c3RvbSBCdWlsZCkgPGh0dHBzOi8vbG9kYXNoLmNvbS8+XG4gKiBCdWlsZDogYGxvZGFzaCBtb2Rlcm4gbW9kdWxhcml6ZSBleHBvcnRzPVwibnBtXCIgLW8gLi9gXG4gKiBDb3B5cmlnaHQgMjAxMi0yMDE1IFRoZSBEb2pvIEZvdW5kYXRpb24gPGh0dHA6Ly9kb2pvZm91bmRhdGlvbi5vcmcvPlxuICogQmFzZWQgb24gVW5kZXJzY29yZS5qcyAxLjguMyA8aHR0cDovL3VuZGVyc2NvcmVqcy5vcmcvTElDRU5TRT5cbiAqIENvcHlyaWdodCAyMDA5LTIwMTUgSmVyZW15IEFzaGtlbmFzLCBEb2N1bWVudENsb3VkIGFuZCBJbnZlc3RpZ2F0aXZlIFJlcG9ydGVycyAmIEVkaXRvcnNcbiAqIEF2YWlsYWJsZSB1bmRlciBNSVQgbGljZW5zZSA8aHR0cHM6Ly9sb2Rhc2guY29tL2xpY2Vuc2U+XG4gKi9cblxuLyoqIGBPYmplY3QjdG9TdHJpbmdgIHJlc3VsdCByZWZlcmVuY2VzLiAqL1xudmFyIGFycmF5VGFnID0gJ1tvYmplY3QgQXJyYXldJyxcbiAgICBmdW5jVGFnID0gJ1tvYmplY3QgRnVuY3Rpb25dJztcblxuLyoqIFVzZWQgdG8gZGV0ZWN0IGhvc3QgY29uc3RydWN0b3JzIChTYWZhcmkgPiA1KS4gKi9cbnZhciByZUlzSG9zdEN0b3IgPSAvXlxcW29iamVjdCAuKz9Db25zdHJ1Y3RvclxcXSQvO1xuXG4vKipcbiAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIG9iamVjdC1saWtlLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBgdmFsdWVgIGlzIG9iamVjdC1saWtlLCBlbHNlIGBmYWxzZWAuXG4gKi9cbmZ1bmN0aW9uIGlzT2JqZWN0TGlrZSh2YWx1ZSkge1xuICByZXR1cm4gISF2YWx1ZSAmJiB0eXBlb2YgdmFsdWUgPT0gJ29iamVjdCc7XG59XG5cbi8qKiBVc2VkIGZvciBuYXRpdmUgbWV0aG9kIHJlZmVyZW5jZXMuICovXG52YXIgb2JqZWN0UHJvdG8gPSBPYmplY3QucHJvdG90eXBlO1xuXG4vKiogVXNlZCB0byByZXNvbHZlIHRoZSBkZWNvbXBpbGVkIHNvdXJjZSBvZiBmdW5jdGlvbnMuICovXG52YXIgZm5Ub1N0cmluZyA9IEZ1bmN0aW9uLnByb3RvdHlwZS50b1N0cmluZztcblxuLyoqIFVzZWQgdG8gY2hlY2sgb2JqZWN0cyBmb3Igb3duIHByb3BlcnRpZXMuICovXG52YXIgaGFzT3duUHJvcGVydHkgPSBvYmplY3RQcm90by5oYXNPd25Qcm9wZXJ0eTtcblxuLyoqXG4gKiBVc2VkIHRvIHJlc29sdmUgdGhlIFtgdG9TdHJpbmdUYWdgXShodHRwOi8vZWNtYS1pbnRlcm5hdGlvbmFsLm9yZy9lY21hLTI2Mi82LjAvI3NlYy1vYmplY3QucHJvdG90eXBlLnRvc3RyaW5nKVxuICogb2YgdmFsdWVzLlxuICovXG52YXIgb2JqVG9TdHJpbmcgPSBvYmplY3RQcm90by50b1N0cmluZztcblxuLyoqIFVzZWQgdG8gZGV0ZWN0IGlmIGEgbWV0aG9kIGlzIG5hdGl2ZS4gKi9cbnZhciByZUlzTmF0aXZlID0gUmVnRXhwKCdeJyArXG4gIGZuVG9TdHJpbmcuY2FsbChoYXNPd25Qcm9wZXJ0eSkucmVwbGFjZSgvW1xcXFxeJC4qKz8oKVtcXF17fXxdL2csICdcXFxcJCYnKVxuICAucmVwbGFjZSgvaGFzT3duUHJvcGVydHl8KGZ1bmN0aW9uKS4qPyg/PVxcXFxcXCgpfCBmb3IgLis/KD89XFxcXFxcXSkvZywgJyQxLio/JykgKyAnJCdcbik7XG5cbi8qIE5hdGl2ZSBtZXRob2QgcmVmZXJlbmNlcyBmb3IgdGhvc2Ugd2l0aCB0aGUgc2FtZSBuYW1lIGFzIG90aGVyIGBsb2Rhc2hgIG1ldGhvZHMuICovXG52YXIgbmF0aXZlSXNBcnJheSA9IGdldE5hdGl2ZShBcnJheSwgJ2lzQXJyYXknKTtcblxuLyoqXG4gKiBVc2VkIGFzIHRoZSBbbWF4aW11bSBsZW5ndGhdKGh0dHA6Ly9lY21hLWludGVybmF0aW9uYWwub3JnL2VjbWEtMjYyLzYuMC8jc2VjLW51bWJlci5tYXhfc2FmZV9pbnRlZ2VyKVxuICogb2YgYW4gYXJyYXktbGlrZSB2YWx1ZS5cbiAqL1xudmFyIE1BWF9TQUZFX0lOVEVHRVIgPSA5MDA3MTk5MjU0NzQwOTkxO1xuXG4vKipcbiAqIEdldHMgdGhlIG5hdGl2ZSBmdW5jdGlvbiBhdCBga2V5YCBvZiBgb2JqZWN0YC5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHtPYmplY3R9IG9iamVjdCBUaGUgb2JqZWN0IHRvIHF1ZXJ5LlxuICogQHBhcmFtIHtzdHJpbmd9IGtleSBUaGUga2V5IG9mIHRoZSBtZXRob2QgdG8gZ2V0LlxuICogQHJldHVybnMgeyp9IFJldHVybnMgdGhlIGZ1bmN0aW9uIGlmIGl0J3MgbmF0aXZlLCBlbHNlIGB1bmRlZmluZWRgLlxuICovXG5mdW5jdGlvbiBnZXROYXRpdmUob2JqZWN0LCBrZXkpIHtcbiAgdmFyIHZhbHVlID0gb2JqZWN0ID09IG51bGwgPyB1bmRlZmluZWQgOiBvYmplY3Rba2V5XTtcbiAgcmV0dXJuIGlzTmF0aXZlKHZhbHVlKSA/IHZhbHVlIDogdW5kZWZpbmVkO1xufVxuXG4vKipcbiAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIGEgdmFsaWQgYXJyYXktbGlrZSBsZW5ndGguXG4gKlxuICogKipOb3RlOioqIFRoaXMgZnVuY3Rpb24gaXMgYmFzZWQgb24gW2BUb0xlbmd0aGBdKGh0dHA6Ly9lY21hLWludGVybmF0aW9uYWwub3JnL2VjbWEtMjYyLzYuMC8jc2VjLXRvbGVuZ3RoKS5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgYHZhbHVlYCBpcyBhIHZhbGlkIGxlbmd0aCwgZWxzZSBgZmFsc2VgLlxuICovXG5mdW5jdGlvbiBpc0xlbmd0aCh2YWx1ZSkge1xuICByZXR1cm4gdHlwZW9mIHZhbHVlID09ICdudW1iZXInICYmIHZhbHVlID4gLTEgJiYgdmFsdWUgJSAxID09IDAgJiYgdmFsdWUgPD0gTUFYX1NBRkVfSU5URUdFUjtcbn1cblxuLyoqXG4gKiBDaGVja3MgaWYgYHZhbHVlYCBpcyBjbGFzc2lmaWVkIGFzIGFuIGBBcnJheWAgb2JqZWN0LlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBfXG4gKiBAY2F0ZWdvcnkgTGFuZ1xuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgYHZhbHVlYCBpcyBjb3JyZWN0bHkgY2xhc3NpZmllZCwgZWxzZSBgZmFsc2VgLlxuICogQGV4YW1wbGVcbiAqXG4gKiBfLmlzQXJyYXkoWzEsIDIsIDNdKTtcbiAqIC8vID0+IHRydWVcbiAqXG4gKiBfLmlzQXJyYXkoZnVuY3Rpb24oKSB7IHJldHVybiBhcmd1bWVudHM7IH0oKSk7XG4gKiAvLyA9PiBmYWxzZVxuICovXG52YXIgaXNBcnJheSA9IG5hdGl2ZUlzQXJyYXkgfHwgZnVuY3Rpb24odmFsdWUpIHtcbiAgcmV0dXJuIGlzT2JqZWN0TGlrZSh2YWx1ZSkgJiYgaXNMZW5ndGgodmFsdWUubGVuZ3RoKSAmJiBvYmpUb1N0cmluZy5jYWxsKHZhbHVlKSA9PSBhcnJheVRhZztcbn07XG5cbi8qKlxuICogQ2hlY2tzIGlmIGB2YWx1ZWAgaXMgY2xhc3NpZmllZCBhcyBhIGBGdW5jdGlvbmAgb2JqZWN0LlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBfXG4gKiBAY2F0ZWdvcnkgTGFuZ1xuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgYHZhbHVlYCBpcyBjb3JyZWN0bHkgY2xhc3NpZmllZCwgZWxzZSBgZmFsc2VgLlxuICogQGV4YW1wbGVcbiAqXG4gKiBfLmlzRnVuY3Rpb24oXyk7XG4gKiAvLyA9PiB0cnVlXG4gKlxuICogXy5pc0Z1bmN0aW9uKC9hYmMvKTtcbiAqIC8vID0+IGZhbHNlXG4gKi9cbmZ1bmN0aW9uIGlzRnVuY3Rpb24odmFsdWUpIHtcbiAgLy8gVGhlIHVzZSBvZiBgT2JqZWN0I3RvU3RyaW5nYCBhdm9pZHMgaXNzdWVzIHdpdGggdGhlIGB0eXBlb2ZgIG9wZXJhdG9yXG4gIC8vIGluIG9sZGVyIHZlcnNpb25zIG9mIENocm9tZSBhbmQgU2FmYXJpIHdoaWNoIHJldHVybiAnZnVuY3Rpb24nIGZvciByZWdleGVzXG4gIC8vIGFuZCBTYWZhcmkgOCBlcXVpdmFsZW50cyB3aGljaCByZXR1cm4gJ29iamVjdCcgZm9yIHR5cGVkIGFycmF5IGNvbnN0cnVjdG9ycy5cbiAgcmV0dXJuIGlzT2JqZWN0KHZhbHVlKSAmJiBvYmpUb1N0cmluZy5jYWxsKHZhbHVlKSA9PSBmdW5jVGFnO1xufVxuXG4vKipcbiAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIHRoZSBbbGFuZ3VhZ2UgdHlwZV0oaHR0cHM6Ly9lczUuZ2l0aHViLmlvLyN4OCkgb2YgYE9iamVjdGAuXG4gKiAoZS5nLiBhcnJheXMsIGZ1bmN0aW9ucywgb2JqZWN0cywgcmVnZXhlcywgYG5ldyBOdW1iZXIoMClgLCBhbmQgYG5ldyBTdHJpbmcoJycpYClcbiAqXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgX1xuICogQGNhdGVnb3J5IExhbmdcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIGB2YWx1ZWAgaXMgYW4gb2JqZWN0LCBlbHNlIGBmYWxzZWAuXG4gKiBAZXhhbXBsZVxuICpcbiAqIF8uaXNPYmplY3Qoe30pO1xuICogLy8gPT4gdHJ1ZVxuICpcbiAqIF8uaXNPYmplY3QoWzEsIDIsIDNdKTtcbiAqIC8vID0+IHRydWVcbiAqXG4gKiBfLmlzT2JqZWN0KDEpO1xuICogLy8gPT4gZmFsc2VcbiAqL1xuZnVuY3Rpb24gaXNPYmplY3QodmFsdWUpIHtcbiAgLy8gQXZvaWQgYSBWOCBKSVQgYnVnIGluIENocm9tZSAxOS0yMC5cbiAgLy8gU2VlIGh0dHBzOi8vY29kZS5nb29nbGUuY29tL3AvdjgvaXNzdWVzL2RldGFpbD9pZD0yMjkxIGZvciBtb3JlIGRldGFpbHMuXG4gIHZhciB0eXBlID0gdHlwZW9mIHZhbHVlO1xuICByZXR1cm4gISF2YWx1ZSAmJiAodHlwZSA9PSAnb2JqZWN0JyB8fCB0eXBlID09ICdmdW5jdGlvbicpO1xufVxuXG4vKipcbiAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIGEgbmF0aXZlIGZ1bmN0aW9uLlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBfXG4gKiBAY2F0ZWdvcnkgTGFuZ1xuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgYHZhbHVlYCBpcyBhIG5hdGl2ZSBmdW5jdGlvbiwgZWxzZSBgZmFsc2VgLlxuICogQGV4YW1wbGVcbiAqXG4gKiBfLmlzTmF0aXZlKEFycmF5LnByb3RvdHlwZS5wdXNoKTtcbiAqIC8vID0+IHRydWVcbiAqXG4gKiBfLmlzTmF0aXZlKF8pO1xuICogLy8gPT4gZmFsc2VcbiAqL1xuZnVuY3Rpb24gaXNOYXRpdmUodmFsdWUpIHtcbiAgaWYgKHZhbHVlID09IG51bGwpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgaWYgKGlzRnVuY3Rpb24odmFsdWUpKSB7XG4gICAgcmV0dXJuIHJlSXNOYXRpdmUudGVzdChmblRvU3RyaW5nLmNhbGwodmFsdWUpKTtcbiAgfVxuICByZXR1cm4gaXNPYmplY3RMaWtlKHZhbHVlKSAmJiByZUlzSG9zdEN0b3IudGVzdCh2YWx1ZSk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gaXNBcnJheTtcbiIsIi8qKlxuICogbG9kYXNoIDMuMS4xIChDdXN0b20gQnVpbGQpIDxodHRwczovL2xvZGFzaC5jb20vPlxuICogQnVpbGQ6IGBsb2Rhc2ggbW9kdWxhcml6ZSBleHBvcnRzPVwibnBtXCIgLW8gLi9gXG4gKiBDb3B5cmlnaHQgMjAxMi0yMDE2IFRoZSBEb2pvIEZvdW5kYXRpb24gPGh0dHA6Ly9kb2pvZm91bmRhdGlvbi5vcmcvPlxuICogQmFzZWQgb24gVW5kZXJzY29yZS5qcyAxLjguMyA8aHR0cDovL3VuZGVyc2NvcmVqcy5vcmcvTElDRU5TRT5cbiAqIENvcHlyaWdodCAyMDA5LTIwMTYgSmVyZW15IEFzaGtlbmFzLCBEb2N1bWVudENsb3VkIGFuZCBJbnZlc3RpZ2F0aXZlIFJlcG9ydGVycyAmIEVkaXRvcnNcbiAqIEF2YWlsYWJsZSB1bmRlciBNSVQgbGljZW5zZSA8aHR0cHM6Ly9sb2Rhc2guY29tL2xpY2Vuc2U+XG4gKi9cbnZhciBkZWJ1cnIgPSByZXF1aXJlKCdsb2Rhc2guZGVidXJyJyksXG4gICAgd29yZHMgPSByZXF1aXJlKCdsb2Rhc2gud29yZHMnKTtcblxuLyoqXG4gKiBBIHNwZWNpYWxpemVkIHZlcnNpb24gb2YgYF8ucmVkdWNlYCBmb3IgYXJyYXlzIHdpdGhvdXQgc3VwcG9ydCBmb3JcbiAqIGl0ZXJhdGVlIHNob3J0aGFuZHMuXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7QXJyYXl9IGFycmF5IFRoZSBhcnJheSB0byBpdGVyYXRlIG92ZXIuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBpdGVyYXRlZSBUaGUgZnVuY3Rpb24gaW52b2tlZCBwZXIgaXRlcmF0aW9uLlxuICogQHBhcmFtIHsqfSBbYWNjdW11bGF0b3JdIFRoZSBpbml0aWFsIHZhbHVlLlxuICogQHBhcmFtIHtib29sZWFufSBbaW5pdEFjY3VtXSBTcGVjaWZ5IHVzaW5nIHRoZSBmaXJzdCBlbGVtZW50IG9mIGBhcnJheWAgYXMgdGhlIGluaXRpYWwgdmFsdWUuXG4gKiBAcmV0dXJucyB7Kn0gUmV0dXJucyB0aGUgYWNjdW11bGF0ZWQgdmFsdWUuXG4gKi9cbmZ1bmN0aW9uIGFycmF5UmVkdWNlKGFycmF5LCBpdGVyYXRlZSwgYWNjdW11bGF0b3IsIGluaXRBY2N1bSkge1xuICB2YXIgaW5kZXggPSAtMSxcbiAgICAgIGxlbmd0aCA9IGFycmF5Lmxlbmd0aDtcblxuICBpZiAoaW5pdEFjY3VtICYmIGxlbmd0aCkge1xuICAgIGFjY3VtdWxhdG9yID0gYXJyYXlbKytpbmRleF07XG4gIH1cbiAgd2hpbGUgKCsraW5kZXggPCBsZW5ndGgpIHtcbiAgICBhY2N1bXVsYXRvciA9IGl0ZXJhdGVlKGFjY3VtdWxhdG9yLCBhcnJheVtpbmRleF0sIGluZGV4LCBhcnJheSk7XG4gIH1cbiAgcmV0dXJuIGFjY3VtdWxhdG9yO1xufVxuXG4vKipcbiAqIENyZWF0ZXMgYSBmdW5jdGlvbiBsaWtlIGBfLmNhbWVsQ2FzZWAuXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIFRoZSBmdW5jdGlvbiB0byBjb21iaW5lIGVhY2ggd29yZC5cbiAqIEByZXR1cm5zIHtGdW5jdGlvbn0gUmV0dXJucyB0aGUgbmV3IGNvbXBvdW5kZXIgZnVuY3Rpb24uXG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZUNvbXBvdW5kZXIoY2FsbGJhY2spIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKHN0cmluZykge1xuICAgIHJldHVybiBhcnJheVJlZHVjZSh3b3JkcyhkZWJ1cnIoc3RyaW5nKSksIGNhbGxiYWNrLCAnJyk7XG4gIH07XG59XG5cbi8qKlxuICogQ29udmVydHMgYHN0cmluZ2AgdG8gW2tlYmFiIGNhc2VdKGh0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0xldHRlcl9jYXNlI1NwZWNpYWxfY2FzZV9zdHlsZXMpLlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBfXG4gKiBAY2F0ZWdvcnkgU3RyaW5nXG4gKiBAcGFyYW0ge3N0cmluZ30gW3N0cmluZz0nJ10gVGhlIHN0cmluZyB0byBjb252ZXJ0LlxuICogQHJldHVybnMge3N0cmluZ30gUmV0dXJucyB0aGUga2ViYWIgY2FzZWQgc3RyaW5nLlxuICogQGV4YW1wbGVcbiAqXG4gKiBfLmtlYmFiQ2FzZSgnRm9vIEJhcicpO1xuICogLy8gPT4gJ2Zvby1iYXInXG4gKlxuICogXy5rZWJhYkNhc2UoJ2Zvb0JhcicpO1xuICogLy8gPT4gJ2Zvby1iYXInXG4gKlxuICogXy5rZWJhYkNhc2UoJ19fZm9vX2Jhcl9fJyk7XG4gKiAvLyA9PiAnZm9vLWJhcidcbiAqL1xudmFyIGtlYmFiQ2FzZSA9IGNyZWF0ZUNvbXBvdW5kZXIoZnVuY3Rpb24ocmVzdWx0LCB3b3JkLCBpbmRleCkge1xuICByZXR1cm4gcmVzdWx0ICsgKGluZGV4ID8gJy0nIDogJycpICsgd29yZC50b0xvd2VyQ2FzZSgpO1xufSk7XG5cbm1vZHVsZS5leHBvcnRzID0ga2ViYWJDYXNlO1xuIiwiLyoqXG4gKiBsb2Rhc2ggMy4xLjIgKEN1c3RvbSBCdWlsZCkgPGh0dHBzOi8vbG9kYXNoLmNvbS8+XG4gKiBCdWlsZDogYGxvZGFzaCBtb2Rlcm4gbW9kdWxhcml6ZSBleHBvcnRzPVwibnBtXCIgLW8gLi9gXG4gKiBDb3B5cmlnaHQgMjAxMi0yMDE1IFRoZSBEb2pvIEZvdW5kYXRpb24gPGh0dHA6Ly9kb2pvZm91bmRhdGlvbi5vcmcvPlxuICogQmFzZWQgb24gVW5kZXJzY29yZS5qcyAxLjguMyA8aHR0cDovL3VuZGVyc2NvcmVqcy5vcmcvTElDRU5TRT5cbiAqIENvcHlyaWdodCAyMDA5LTIwMTUgSmVyZW15IEFzaGtlbmFzLCBEb2N1bWVudENsb3VkIGFuZCBJbnZlc3RpZ2F0aXZlIFJlcG9ydGVycyAmIEVkaXRvcnNcbiAqIEF2YWlsYWJsZSB1bmRlciBNSVQgbGljZW5zZSA8aHR0cHM6Ly9sb2Rhc2guY29tL2xpY2Vuc2U+XG4gKi9cbnZhciBnZXROYXRpdmUgPSByZXF1aXJlKCdsb2Rhc2guX2dldG5hdGl2ZScpLFxuICAgIGlzQXJndW1lbnRzID0gcmVxdWlyZSgnbG9kYXNoLmlzYXJndW1lbnRzJyksXG4gICAgaXNBcnJheSA9IHJlcXVpcmUoJ2xvZGFzaC5pc2FycmF5Jyk7XG5cbi8qKiBVc2VkIHRvIGRldGVjdCB1bnNpZ25lZCBpbnRlZ2VyIHZhbHVlcy4gKi9cbnZhciByZUlzVWludCA9IC9eXFxkKyQvO1xuXG4vKiogVXNlZCBmb3IgbmF0aXZlIG1ldGhvZCByZWZlcmVuY2VzLiAqL1xudmFyIG9iamVjdFByb3RvID0gT2JqZWN0LnByb3RvdHlwZTtcblxuLyoqIFVzZWQgdG8gY2hlY2sgb2JqZWN0cyBmb3Igb3duIHByb3BlcnRpZXMuICovXG52YXIgaGFzT3duUHJvcGVydHkgPSBvYmplY3RQcm90by5oYXNPd25Qcm9wZXJ0eTtcblxuLyogTmF0aXZlIG1ldGhvZCByZWZlcmVuY2VzIGZvciB0aG9zZSB3aXRoIHRoZSBzYW1lIG5hbWUgYXMgb3RoZXIgYGxvZGFzaGAgbWV0aG9kcy4gKi9cbnZhciBuYXRpdmVLZXlzID0gZ2V0TmF0aXZlKE9iamVjdCwgJ2tleXMnKTtcblxuLyoqXG4gKiBVc2VkIGFzIHRoZSBbbWF4aW11bSBsZW5ndGhdKGh0dHA6Ly9lY21hLWludGVybmF0aW9uYWwub3JnL2VjbWEtMjYyLzYuMC8jc2VjLW51bWJlci5tYXhfc2FmZV9pbnRlZ2VyKVxuICogb2YgYW4gYXJyYXktbGlrZSB2YWx1ZS5cbiAqL1xudmFyIE1BWF9TQUZFX0lOVEVHRVIgPSA5MDA3MTk5MjU0NzQwOTkxO1xuXG4vKipcbiAqIFRoZSBiYXNlIGltcGxlbWVudGF0aW9uIG9mIGBfLnByb3BlcnR5YCB3aXRob3V0IHN1cHBvcnQgZm9yIGRlZXAgcGF0aHMuXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7c3RyaW5nfSBrZXkgVGhlIGtleSBvZiB0aGUgcHJvcGVydHkgdG8gZ2V0LlxuICogQHJldHVybnMge0Z1bmN0aW9ufSBSZXR1cm5zIHRoZSBuZXcgZnVuY3Rpb24uXG4gKi9cbmZ1bmN0aW9uIGJhc2VQcm9wZXJ0eShrZXkpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKG9iamVjdCkge1xuICAgIHJldHVybiBvYmplY3QgPT0gbnVsbCA/IHVuZGVmaW5lZCA6IG9iamVjdFtrZXldO1xuICB9O1xufVxuXG4vKipcbiAqIEdldHMgdGhlIFwibGVuZ3RoXCIgcHJvcGVydHkgdmFsdWUgb2YgYG9iamVjdGAuXG4gKlxuICogKipOb3RlOioqIFRoaXMgZnVuY3Rpb24gaXMgdXNlZCB0byBhdm9pZCBhIFtKSVQgYnVnXShodHRwczovL2J1Z3Mud2Via2l0Lm9yZy9zaG93X2J1Zy5jZ2k/aWQ9MTQyNzkyKVxuICogdGhhdCBhZmZlY3RzIFNhZmFyaSBvbiBhdCBsZWFzdCBpT1MgOC4xLTguMyBBUk02NC5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHtPYmplY3R9IG9iamVjdCBUaGUgb2JqZWN0IHRvIHF1ZXJ5LlxuICogQHJldHVybnMgeyp9IFJldHVybnMgdGhlIFwibGVuZ3RoXCIgdmFsdWUuXG4gKi9cbnZhciBnZXRMZW5ndGggPSBiYXNlUHJvcGVydHkoJ2xlbmd0aCcpO1xuXG4vKipcbiAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIGFycmF5LWxpa2UuXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIGB2YWx1ZWAgaXMgYXJyYXktbGlrZSwgZWxzZSBgZmFsc2VgLlxuICovXG5mdW5jdGlvbiBpc0FycmF5TGlrZSh2YWx1ZSkge1xuICByZXR1cm4gdmFsdWUgIT0gbnVsbCAmJiBpc0xlbmd0aChnZXRMZW5ndGgodmFsdWUpKTtcbn1cblxuLyoqXG4gKiBDaGVja3MgaWYgYHZhbHVlYCBpcyBhIHZhbGlkIGFycmF5LWxpa2UgaW5kZXguXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrLlxuICogQHBhcmFtIHtudW1iZXJ9IFtsZW5ndGg9TUFYX1NBRkVfSU5URUdFUl0gVGhlIHVwcGVyIGJvdW5kcyBvZiBhIHZhbGlkIGluZGV4LlxuICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIGB2YWx1ZWAgaXMgYSB2YWxpZCBpbmRleCwgZWxzZSBgZmFsc2VgLlxuICovXG5mdW5jdGlvbiBpc0luZGV4KHZhbHVlLCBsZW5ndGgpIHtcbiAgdmFsdWUgPSAodHlwZW9mIHZhbHVlID09ICdudW1iZXInIHx8IHJlSXNVaW50LnRlc3QodmFsdWUpKSA/ICt2YWx1ZSA6IC0xO1xuICBsZW5ndGggPSBsZW5ndGggPT0gbnVsbCA/IE1BWF9TQUZFX0lOVEVHRVIgOiBsZW5ndGg7XG4gIHJldHVybiB2YWx1ZSA+IC0xICYmIHZhbHVlICUgMSA9PSAwICYmIHZhbHVlIDwgbGVuZ3RoO1xufVxuXG4vKipcbiAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIGEgdmFsaWQgYXJyYXktbGlrZSBsZW5ndGguXG4gKlxuICogKipOb3RlOioqIFRoaXMgZnVuY3Rpb24gaXMgYmFzZWQgb24gW2BUb0xlbmd0aGBdKGh0dHA6Ly9lY21hLWludGVybmF0aW9uYWwub3JnL2VjbWEtMjYyLzYuMC8jc2VjLXRvbGVuZ3RoKS5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgYHZhbHVlYCBpcyBhIHZhbGlkIGxlbmd0aCwgZWxzZSBgZmFsc2VgLlxuICovXG5mdW5jdGlvbiBpc0xlbmd0aCh2YWx1ZSkge1xuICByZXR1cm4gdHlwZW9mIHZhbHVlID09ICdudW1iZXInICYmIHZhbHVlID4gLTEgJiYgdmFsdWUgJSAxID09IDAgJiYgdmFsdWUgPD0gTUFYX1NBRkVfSU5URUdFUjtcbn1cblxuLyoqXG4gKiBBIGZhbGxiYWNrIGltcGxlbWVudGF0aW9uIG9mIGBPYmplY3Qua2V5c2Agd2hpY2ggY3JlYXRlcyBhbiBhcnJheSBvZiB0aGVcbiAqIG93biBlbnVtZXJhYmxlIHByb3BlcnR5IG5hbWVzIG9mIGBvYmplY3RgLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0IFRoZSBvYmplY3QgdG8gcXVlcnkuXG4gKiBAcmV0dXJucyB7QXJyYXl9IFJldHVybnMgdGhlIGFycmF5IG9mIHByb3BlcnR5IG5hbWVzLlxuICovXG5mdW5jdGlvbiBzaGltS2V5cyhvYmplY3QpIHtcbiAgdmFyIHByb3BzID0ga2V5c0luKG9iamVjdCksXG4gICAgICBwcm9wc0xlbmd0aCA9IHByb3BzLmxlbmd0aCxcbiAgICAgIGxlbmd0aCA9IHByb3BzTGVuZ3RoICYmIG9iamVjdC5sZW5ndGg7XG5cbiAgdmFyIGFsbG93SW5kZXhlcyA9ICEhbGVuZ3RoICYmIGlzTGVuZ3RoKGxlbmd0aCkgJiZcbiAgICAoaXNBcnJheShvYmplY3QpIHx8IGlzQXJndW1lbnRzKG9iamVjdCkpO1xuXG4gIHZhciBpbmRleCA9IC0xLFxuICAgICAgcmVzdWx0ID0gW107XG5cbiAgd2hpbGUgKCsraW5kZXggPCBwcm9wc0xlbmd0aCkge1xuICAgIHZhciBrZXkgPSBwcm9wc1tpbmRleF07XG4gICAgaWYgKChhbGxvd0luZGV4ZXMgJiYgaXNJbmRleChrZXksIGxlbmd0aCkpIHx8IGhhc093blByb3BlcnR5LmNhbGwob2JqZWN0LCBrZXkpKSB7XG4gICAgICByZXN1bHQucHVzaChrZXkpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufVxuXG4vKipcbiAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIHRoZSBbbGFuZ3VhZ2UgdHlwZV0oaHR0cHM6Ly9lczUuZ2l0aHViLmlvLyN4OCkgb2YgYE9iamVjdGAuXG4gKiAoZS5nLiBhcnJheXMsIGZ1bmN0aW9ucywgb2JqZWN0cywgcmVnZXhlcywgYG5ldyBOdW1iZXIoMClgLCBhbmQgYG5ldyBTdHJpbmcoJycpYClcbiAqXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgX1xuICogQGNhdGVnb3J5IExhbmdcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIGB2YWx1ZWAgaXMgYW4gb2JqZWN0LCBlbHNlIGBmYWxzZWAuXG4gKiBAZXhhbXBsZVxuICpcbiAqIF8uaXNPYmplY3Qoe30pO1xuICogLy8gPT4gdHJ1ZVxuICpcbiAqIF8uaXNPYmplY3QoWzEsIDIsIDNdKTtcbiAqIC8vID0+IHRydWVcbiAqXG4gKiBfLmlzT2JqZWN0KDEpO1xuICogLy8gPT4gZmFsc2VcbiAqL1xuZnVuY3Rpb24gaXNPYmplY3QodmFsdWUpIHtcbiAgLy8gQXZvaWQgYSBWOCBKSVQgYnVnIGluIENocm9tZSAxOS0yMC5cbiAgLy8gU2VlIGh0dHBzOi8vY29kZS5nb29nbGUuY29tL3AvdjgvaXNzdWVzL2RldGFpbD9pZD0yMjkxIGZvciBtb3JlIGRldGFpbHMuXG4gIHZhciB0eXBlID0gdHlwZW9mIHZhbHVlO1xuICByZXR1cm4gISF2YWx1ZSAmJiAodHlwZSA9PSAnb2JqZWN0JyB8fCB0eXBlID09ICdmdW5jdGlvbicpO1xufVxuXG4vKipcbiAqIENyZWF0ZXMgYW4gYXJyYXkgb2YgdGhlIG93biBlbnVtZXJhYmxlIHByb3BlcnR5IG5hbWVzIG9mIGBvYmplY3RgLlxuICpcbiAqICoqTm90ZToqKiBOb24tb2JqZWN0IHZhbHVlcyBhcmUgY29lcmNlZCB0byBvYmplY3RzLiBTZWUgdGhlXG4gKiBbRVMgc3BlY10oaHR0cDovL2VjbWEtaW50ZXJuYXRpb25hbC5vcmcvZWNtYS0yNjIvNi4wLyNzZWMtb2JqZWN0LmtleXMpXG4gKiBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBfXG4gKiBAY2F0ZWdvcnkgT2JqZWN0XG4gKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0IFRoZSBvYmplY3QgdG8gcXVlcnkuXG4gKiBAcmV0dXJucyB7QXJyYXl9IFJldHVybnMgdGhlIGFycmF5IG9mIHByb3BlcnR5IG5hbWVzLlxuICogQGV4YW1wbGVcbiAqXG4gKiBmdW5jdGlvbiBGb28oKSB7XG4gKiAgIHRoaXMuYSA9IDE7XG4gKiAgIHRoaXMuYiA9IDI7XG4gKiB9XG4gKlxuICogRm9vLnByb3RvdHlwZS5jID0gMztcbiAqXG4gKiBfLmtleXMobmV3IEZvbyk7XG4gKiAvLyA9PiBbJ2EnLCAnYiddIChpdGVyYXRpb24gb3JkZXIgaXMgbm90IGd1YXJhbnRlZWQpXG4gKlxuICogXy5rZXlzKCdoaScpO1xuICogLy8gPT4gWycwJywgJzEnXVxuICovXG52YXIga2V5cyA9ICFuYXRpdmVLZXlzID8gc2hpbUtleXMgOiBmdW5jdGlvbihvYmplY3QpIHtcbiAgdmFyIEN0b3IgPSBvYmplY3QgPT0gbnVsbCA/IHVuZGVmaW5lZCA6IG9iamVjdC5jb25zdHJ1Y3RvcjtcbiAgaWYgKCh0eXBlb2YgQ3RvciA9PSAnZnVuY3Rpb24nICYmIEN0b3IucHJvdG90eXBlID09PSBvYmplY3QpIHx8XG4gICAgICAodHlwZW9mIG9iamVjdCAhPSAnZnVuY3Rpb24nICYmIGlzQXJyYXlMaWtlKG9iamVjdCkpKSB7XG4gICAgcmV0dXJuIHNoaW1LZXlzKG9iamVjdCk7XG4gIH1cbiAgcmV0dXJuIGlzT2JqZWN0KG9iamVjdCkgPyBuYXRpdmVLZXlzKG9iamVjdCkgOiBbXTtcbn07XG5cbi8qKlxuICogQ3JlYXRlcyBhbiBhcnJheSBvZiB0aGUgb3duIGFuZCBpbmhlcml0ZWQgZW51bWVyYWJsZSBwcm9wZXJ0eSBuYW1lcyBvZiBgb2JqZWN0YC5cbiAqXG4gKiAqKk5vdGU6KiogTm9uLW9iamVjdCB2YWx1ZXMgYXJlIGNvZXJjZWQgdG8gb2JqZWN0cy5cbiAqXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgX1xuICogQGNhdGVnb3J5IE9iamVjdFxuICogQHBhcmFtIHtPYmplY3R9IG9iamVjdCBUaGUgb2JqZWN0IHRvIHF1ZXJ5LlxuICogQHJldHVybnMge0FycmF5fSBSZXR1cm5zIHRoZSBhcnJheSBvZiBwcm9wZXJ0eSBuYW1lcy5cbiAqIEBleGFtcGxlXG4gKlxuICogZnVuY3Rpb24gRm9vKCkge1xuICogICB0aGlzLmEgPSAxO1xuICogICB0aGlzLmIgPSAyO1xuICogfVxuICpcbiAqIEZvby5wcm90b3R5cGUuYyA9IDM7XG4gKlxuICogXy5rZXlzSW4obmV3IEZvbyk7XG4gKiAvLyA9PiBbJ2EnLCAnYicsICdjJ10gKGl0ZXJhdGlvbiBvcmRlciBpcyBub3QgZ3VhcmFudGVlZClcbiAqL1xuZnVuY3Rpb24ga2V5c0luKG9iamVjdCkge1xuICBpZiAob2JqZWN0ID09IG51bGwpIHtcbiAgICByZXR1cm4gW107XG4gIH1cbiAgaWYgKCFpc09iamVjdChvYmplY3QpKSB7XG4gICAgb2JqZWN0ID0gT2JqZWN0KG9iamVjdCk7XG4gIH1cbiAgdmFyIGxlbmd0aCA9IG9iamVjdC5sZW5ndGg7XG4gIGxlbmd0aCA9IChsZW5ndGggJiYgaXNMZW5ndGgobGVuZ3RoKSAmJlxuICAgIChpc0FycmF5KG9iamVjdCkgfHwgaXNBcmd1bWVudHMob2JqZWN0KSkgJiYgbGVuZ3RoKSB8fCAwO1xuXG4gIHZhciBDdG9yID0gb2JqZWN0LmNvbnN0cnVjdG9yLFxuICAgICAgaW5kZXggPSAtMSxcbiAgICAgIGlzUHJvdG8gPSB0eXBlb2YgQ3RvciA9PSAnZnVuY3Rpb24nICYmIEN0b3IucHJvdG90eXBlID09PSBvYmplY3QsXG4gICAgICByZXN1bHQgPSBBcnJheShsZW5ndGgpLFxuICAgICAgc2tpcEluZGV4ZXMgPSBsZW5ndGggPiAwO1xuXG4gIHdoaWxlICgrK2luZGV4IDwgbGVuZ3RoKSB7XG4gICAgcmVzdWx0W2luZGV4XSA9IChpbmRleCArICcnKTtcbiAgfVxuICBmb3IgKHZhciBrZXkgaW4gb2JqZWN0KSB7XG4gICAgaWYgKCEoc2tpcEluZGV4ZXMgJiYgaXNJbmRleChrZXksIGxlbmd0aCkpICYmXG4gICAgICAgICEoa2V5ID09ICdjb25zdHJ1Y3RvcicgJiYgKGlzUHJvdG8gfHwgIWhhc093blByb3BlcnR5LmNhbGwob2JqZWN0LCBrZXkpKSkpIHtcbiAgICAgIHJlc3VsdC5wdXNoKGtleSk7XG4gICAgfVxuICB9XG4gIHJldHVybiByZXN1bHQ7XG59XG5cbm1vZHVsZS5leHBvcnRzID0ga2V5cztcbiIsIi8qKlxuICogbG9kYXNoIDMuNi4xIChDdXN0b20gQnVpbGQpIDxodHRwczovL2xvZGFzaC5jb20vPlxuICogQnVpbGQ6IGBsb2Rhc2ggbW9kZXJuIG1vZHVsYXJpemUgZXhwb3J0cz1cIm5wbVwiIC1vIC4vYFxuICogQ29weXJpZ2h0IDIwMTItMjAxNSBUaGUgRG9qbyBGb3VuZGF0aW9uIDxodHRwOi8vZG9qb2ZvdW5kYXRpb24ub3JnLz5cbiAqIEJhc2VkIG9uIFVuZGVyc2NvcmUuanMgMS44LjMgPGh0dHA6Ly91bmRlcnNjb3JlanMub3JnL0xJQ0VOU0U+XG4gKiBDb3B5cmlnaHQgMjAwOS0yMDE1IEplcmVteSBBc2hrZW5hcywgRG9jdW1lbnRDbG91ZCBhbmQgSW52ZXN0aWdhdGl2ZSBSZXBvcnRlcnMgJiBFZGl0b3JzXG4gKiBBdmFpbGFibGUgdW5kZXIgTUlUIGxpY2Vuc2UgPGh0dHBzOi8vbG9kYXNoLmNvbS9saWNlbnNlPlxuICovXG5cbi8qKiBVc2VkIGFzIHRoZSBgVHlwZUVycm9yYCBtZXNzYWdlIGZvciBcIkZ1bmN0aW9uc1wiIG1ldGhvZHMuICovXG52YXIgRlVOQ19FUlJPUl9URVhUID0gJ0V4cGVjdGVkIGEgZnVuY3Rpb24nO1xuXG4vKiBOYXRpdmUgbWV0aG9kIHJlZmVyZW5jZXMgZm9yIHRob3NlIHdpdGggdGhlIHNhbWUgbmFtZSBhcyBvdGhlciBgbG9kYXNoYCBtZXRob2RzLiAqL1xudmFyIG5hdGl2ZU1heCA9IE1hdGgubWF4O1xuXG4vKipcbiAqIENyZWF0ZXMgYSBmdW5jdGlvbiB0aGF0IGludm9rZXMgYGZ1bmNgIHdpdGggdGhlIGB0aGlzYCBiaW5kaW5nIG9mIHRoZVxuICogY3JlYXRlZCBmdW5jdGlvbiBhbmQgYXJndW1lbnRzIGZyb20gYHN0YXJ0YCBhbmQgYmV5b25kIHByb3ZpZGVkIGFzIGFuIGFycmF5LlxuICpcbiAqICoqTm90ZToqKiBUaGlzIG1ldGhvZCBpcyBiYXNlZCBvbiB0aGUgW3Jlc3QgcGFyYW1ldGVyXShodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9KYXZhU2NyaXB0L1JlZmVyZW5jZS9GdW5jdGlvbnMvcmVzdF9wYXJhbWV0ZXJzKS5cbiAqXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgX1xuICogQGNhdGVnb3J5IEZ1bmN0aW9uXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmdW5jIFRoZSBmdW5jdGlvbiB0byBhcHBseSBhIHJlc3QgcGFyYW1ldGVyIHRvLlxuICogQHBhcmFtIHtudW1iZXJ9IFtzdGFydD1mdW5jLmxlbmd0aC0xXSBUaGUgc3RhcnQgcG9zaXRpb24gb2YgdGhlIHJlc3QgcGFyYW1ldGVyLlxuICogQHJldHVybnMge0Z1bmN0aW9ufSBSZXR1cm5zIHRoZSBuZXcgZnVuY3Rpb24uXG4gKiBAZXhhbXBsZVxuICpcbiAqIHZhciBzYXkgPSBfLnJlc3RQYXJhbShmdW5jdGlvbih3aGF0LCBuYW1lcykge1xuICogICByZXR1cm4gd2hhdCArICcgJyArIF8uaW5pdGlhbChuYW1lcykuam9pbignLCAnKSArXG4gKiAgICAgKF8uc2l6ZShuYW1lcykgPiAxID8gJywgJiAnIDogJycpICsgXy5sYXN0KG5hbWVzKTtcbiAqIH0pO1xuICpcbiAqIHNheSgnaGVsbG8nLCAnZnJlZCcsICdiYXJuZXknLCAncGViYmxlcycpO1xuICogLy8gPT4gJ2hlbGxvIGZyZWQsIGJhcm5leSwgJiBwZWJibGVzJ1xuICovXG5mdW5jdGlvbiByZXN0UGFyYW0oZnVuYywgc3RhcnQpIHtcbiAgaWYgKHR5cGVvZiBmdW5jICE9ICdmdW5jdGlvbicpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKEZVTkNfRVJST1JfVEVYVCk7XG4gIH1cbiAgc3RhcnQgPSBuYXRpdmVNYXgoc3RhcnQgPT09IHVuZGVmaW5lZCA/IChmdW5jLmxlbmd0aCAtIDEpIDogKCtzdGFydCB8fCAwKSwgMCk7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICB2YXIgYXJncyA9IGFyZ3VtZW50cyxcbiAgICAgICAgaW5kZXggPSAtMSxcbiAgICAgICAgbGVuZ3RoID0gbmF0aXZlTWF4KGFyZ3MubGVuZ3RoIC0gc3RhcnQsIDApLFxuICAgICAgICByZXN0ID0gQXJyYXkobGVuZ3RoKTtcblxuICAgIHdoaWxlICgrK2luZGV4IDwgbGVuZ3RoKSB7XG4gICAgICByZXN0W2luZGV4XSA9IGFyZ3Nbc3RhcnQgKyBpbmRleF07XG4gICAgfVxuICAgIHN3aXRjaCAoc3RhcnQpIHtcbiAgICAgIGNhc2UgMDogcmV0dXJuIGZ1bmMuY2FsbCh0aGlzLCByZXN0KTtcbiAgICAgIGNhc2UgMTogcmV0dXJuIGZ1bmMuY2FsbCh0aGlzLCBhcmdzWzBdLCByZXN0KTtcbiAgICAgIGNhc2UgMjogcmV0dXJuIGZ1bmMuY2FsbCh0aGlzLCBhcmdzWzBdLCBhcmdzWzFdLCByZXN0KTtcbiAgICB9XG4gICAgdmFyIG90aGVyQXJncyA9IEFycmF5KHN0YXJ0ICsgMSk7XG4gICAgaW5kZXggPSAtMTtcbiAgICB3aGlsZSAoKytpbmRleCA8IHN0YXJ0KSB7XG4gICAgICBvdGhlckFyZ3NbaW5kZXhdID0gYXJnc1tpbmRleF07XG4gICAgfVxuICAgIG90aGVyQXJnc1tzdGFydF0gPSByZXN0O1xuICAgIHJldHVybiBmdW5jLmFwcGx5KHRoaXMsIG90aGVyQXJncyk7XG4gIH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gcmVzdFBhcmFtO1xuIiwiLyoqXG4gKiBsb2Rhc2ggMy4xLjAgKEN1c3RvbSBCdWlsZCkgPGh0dHBzOi8vbG9kYXNoLmNvbS8+XG4gKiBCdWlsZDogYGxvZGFzaCBtb2Rlcm4gbW9kdWxhcml6ZSBleHBvcnRzPVwibnBtXCIgLW8gLi9gXG4gKiBDb3B5cmlnaHQgMjAxMi0yMDE1IFRoZSBEb2pvIEZvdW5kYXRpb24gPGh0dHA6Ly9kb2pvZm91bmRhdGlvbi5vcmcvPlxuICogQmFzZWQgb24gVW5kZXJzY29yZS5qcyAxLjguMiA8aHR0cDovL3VuZGVyc2NvcmVqcy5vcmcvTElDRU5TRT5cbiAqIENvcHlyaWdodCAyMDA5LTIwMTUgSmVyZW15IEFzaGtlbmFzLCBEb2N1bWVudENsb3VkIGFuZCBJbnZlc3RpZ2F0aXZlIFJlcG9ydGVycyAmIEVkaXRvcnNcbiAqIEF2YWlsYWJsZSB1bmRlciBNSVQgbGljZW5zZSA8aHR0cHM6Ly9sb2Rhc2guY29tL2xpY2Vuc2U+XG4gKi9cbnZhciBiYXNlRmxhdHRlbiA9IHJlcXVpcmUoJ2xvZGFzaC5fYmFzZWZsYXR0ZW4nKSxcbiAgICBiYXNlVW5pcSA9IHJlcXVpcmUoJ2xvZGFzaC5fYmFzZXVuaXEnKSxcbiAgICByZXN0UGFyYW0gPSByZXF1aXJlKCdsb2Rhc2gucmVzdHBhcmFtJyk7XG5cbi8qKlxuICogQ3JlYXRlcyBhbiBhcnJheSBvZiB1bmlxdWUgdmFsdWVzLCBpbiBvcmRlciwgb2YgdGhlIHByb3ZpZGVkIGFycmF5cyB1c2luZ1xuICogYFNhbWVWYWx1ZVplcm9gIGZvciBlcXVhbGl0eSBjb21wYXJpc29ucy5cbiAqXG4gKiAqKk5vdGU6KiogW2BTYW1lVmFsdWVaZXJvYF0oaHR0cHM6Ly9wZW9wbGUubW96aWxsYS5vcmcvfmpvcmVuZG9yZmYvZXM2LWRyYWZ0Lmh0bWwjc2VjLXNhbWV2YWx1ZXplcm8pXG4gKiBjb21wYXJpc29ucyBhcmUgbGlrZSBzdHJpY3QgZXF1YWxpdHkgY29tcGFyaXNvbnMsIGUuZy4gYD09PWAsIGV4Y2VwdCB0aGF0XG4gKiBgTmFOYCBtYXRjaGVzIGBOYU5gLlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBfXG4gKiBAY2F0ZWdvcnkgQXJyYXlcbiAqIEBwYXJhbSB7Li4uQXJyYXl9IFthcnJheXNdIFRoZSBhcnJheXMgdG8gaW5zcGVjdC5cbiAqIEByZXR1cm5zIHtBcnJheX0gUmV0dXJucyB0aGUgbmV3IGFycmF5IG9mIGNvbWJpbmVkIHZhbHVlcy5cbiAqIEBleGFtcGxlXG4gKlxuICogXy51bmlvbihbMSwgMl0sIFs0LCAyXSwgWzIsIDFdKTtcbiAqIC8vID0+IFsxLCAyLCA0XVxuICovXG52YXIgdW5pb24gPSByZXN0UGFyYW0oZnVuY3Rpb24oYXJyYXlzKSB7XG4gIHJldHVybiBiYXNlVW5pcShiYXNlRmxhdHRlbihhcnJheXMsIGZhbHNlLCB0cnVlKSk7XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSB1bmlvbjtcbiIsIi8qKlxuICogbG9kYXNoIDMuMi4wIChDdXN0b20gQnVpbGQpIDxodHRwczovL2xvZGFzaC5jb20vPlxuICogQnVpbGQ6IGBsb2Rhc2ggbW9kdWxhcml6ZSBleHBvcnRzPVwibnBtXCIgLW8gLi9gXG4gKiBDb3B5cmlnaHQgMjAxMi0yMDE2IFRoZSBEb2pvIEZvdW5kYXRpb24gPGh0dHA6Ly9kb2pvZm91bmRhdGlvbi5vcmcvPlxuICogQmFzZWQgb24gVW5kZXJzY29yZS5qcyAxLjguMyA8aHR0cDovL3VuZGVyc2NvcmVqcy5vcmcvTElDRU5TRT5cbiAqIENvcHlyaWdodCAyMDA5LTIwMTYgSmVyZW15IEFzaGtlbmFzLCBEb2N1bWVudENsb3VkIGFuZCBJbnZlc3RpZ2F0aXZlIFJlcG9ydGVycyAmIEVkaXRvcnNcbiAqIEF2YWlsYWJsZSB1bmRlciBNSVQgbGljZW5zZSA8aHR0cHM6Ly9sb2Rhc2guY29tL2xpY2Vuc2U+XG4gKi9cbnZhciByb290ID0gcmVxdWlyZSgnbG9kYXNoLl9yb290Jyk7XG5cbi8qKiBVc2VkIGFzIHJlZmVyZW5jZXMgZm9yIHZhcmlvdXMgYE51bWJlcmAgY29uc3RhbnRzLiAqL1xudmFyIElORklOSVRZID0gMSAvIDA7XG5cbi8qKiBgT2JqZWN0I3RvU3RyaW5nYCByZXN1bHQgcmVmZXJlbmNlcy4gKi9cbnZhciBzeW1ib2xUYWcgPSAnW29iamVjdCBTeW1ib2xdJztcblxuLyoqIFVzZWQgdG8gY29tcG9zZSB1bmljb2RlIGNoYXJhY3RlciBjbGFzc2VzLiAqL1xudmFyIHJzQXN0cmFsUmFuZ2UgPSAnXFxcXHVkODAwLVxcXFx1ZGZmZicsXG4gICAgcnNDb21ib01hcmtzUmFuZ2UgPSAnXFxcXHUwMzAwLVxcXFx1MDM2ZlxcXFx1ZmUyMC1cXFxcdWZlMjMnLFxuICAgIHJzQ29tYm9TeW1ib2xzUmFuZ2UgPSAnXFxcXHUyMGQwLVxcXFx1MjBmMCcsXG4gICAgcnNEaW5nYmF0UmFuZ2UgPSAnXFxcXHUyNzAwLVxcXFx1MjdiZicsXG4gICAgcnNMb3dlclJhbmdlID0gJ2EtelxcXFx4ZGYtXFxcXHhmNlxcXFx4ZjgtXFxcXHhmZicsXG4gICAgcnNNYXRoT3BSYW5nZSA9ICdcXFxceGFjXFxcXHhiMVxcXFx4ZDdcXFxceGY3JyxcbiAgICByc05vbkNoYXJSYW5nZSA9ICdcXFxceDAwLVxcXFx4MmZcXFxceDNhLVxcXFx4NDBcXFxceDViLVxcXFx4NjBcXFxceDdiLVxcXFx4YmYnLFxuICAgIHJzUXVvdGVSYW5nZSA9ICdcXFxcdTIwMThcXFxcdTIwMTlcXFxcdTIwMWNcXFxcdTIwMWQnLFxuICAgIHJzU3BhY2VSYW5nZSA9ICcgXFxcXHRcXFxceDBiXFxcXGZcXFxceGEwXFxcXHVmZWZmXFxcXG5cXFxcclxcXFx1MjAyOFxcXFx1MjAyOVxcXFx1MTY4MFxcXFx1MTgwZVxcXFx1MjAwMFxcXFx1MjAwMVxcXFx1MjAwMlxcXFx1MjAwM1xcXFx1MjAwNFxcXFx1MjAwNVxcXFx1MjAwNlxcXFx1MjAwN1xcXFx1MjAwOFxcXFx1MjAwOVxcXFx1MjAwYVxcXFx1MjAyZlxcXFx1MjA1ZlxcXFx1MzAwMCcsXG4gICAgcnNVcHBlclJhbmdlID0gJ0EtWlxcXFx4YzAtXFxcXHhkNlxcXFx4ZDgtXFxcXHhkZScsXG4gICAgcnNWYXJSYW5nZSA9ICdcXFxcdWZlMGVcXFxcdWZlMGYnLFxuICAgIHJzQnJlYWtSYW5nZSA9IHJzTWF0aE9wUmFuZ2UgKyByc05vbkNoYXJSYW5nZSArIHJzUXVvdGVSYW5nZSArIHJzU3BhY2VSYW5nZTtcblxuLyoqIFVzZWQgdG8gY29tcG9zZSB1bmljb2RlIGNhcHR1cmUgZ3JvdXBzLiAqL1xudmFyIHJzQnJlYWsgPSAnWycgKyByc0JyZWFrUmFuZ2UgKyAnXScsXG4gICAgcnNDb21ibyA9ICdbJyArIHJzQ29tYm9NYXJrc1JhbmdlICsgcnNDb21ib1N5bWJvbHNSYW5nZSArICddJyxcbiAgICByc0RpZ2l0cyA9ICdcXFxcZCsnLFxuICAgIHJzRGluZ2JhdCA9ICdbJyArIHJzRGluZ2JhdFJhbmdlICsgJ10nLFxuICAgIHJzTG93ZXIgPSAnWycgKyByc0xvd2VyUmFuZ2UgKyAnXScsXG4gICAgcnNNaXNjID0gJ1teJyArIHJzQXN0cmFsUmFuZ2UgKyByc0JyZWFrUmFuZ2UgKyByc0RpZ2l0cyArIHJzRGluZ2JhdFJhbmdlICsgcnNMb3dlclJhbmdlICsgcnNVcHBlclJhbmdlICsgJ10nLFxuICAgIHJzRml0eiA9ICdcXFxcdWQ4M2NbXFxcXHVkZmZiLVxcXFx1ZGZmZl0nLFxuICAgIHJzTW9kaWZpZXIgPSAnKD86JyArIHJzQ29tYm8gKyAnfCcgKyByc0ZpdHogKyAnKScsXG4gICAgcnNOb25Bc3RyYWwgPSAnW14nICsgcnNBc3RyYWxSYW5nZSArICddJyxcbiAgICByc1JlZ2lvbmFsID0gJyg/OlxcXFx1ZDgzY1tcXFxcdWRkZTYtXFxcXHVkZGZmXSl7Mn0nLFxuICAgIHJzU3VyclBhaXIgPSAnW1xcXFx1ZDgwMC1cXFxcdWRiZmZdW1xcXFx1ZGMwMC1cXFxcdWRmZmZdJyxcbiAgICByc1VwcGVyID0gJ1snICsgcnNVcHBlclJhbmdlICsgJ10nLFxuICAgIHJzWldKID0gJ1xcXFx1MjAwZCc7XG5cbi8qKiBVc2VkIHRvIGNvbXBvc2UgdW5pY29kZSByZWdleGVzLiAqL1xudmFyIHJzTG93ZXJNaXNjID0gJyg/OicgKyByc0xvd2VyICsgJ3wnICsgcnNNaXNjICsgJyknLFxuICAgIHJzVXBwZXJNaXNjID0gJyg/OicgKyByc1VwcGVyICsgJ3wnICsgcnNNaXNjICsgJyknLFxuICAgIHJlT3B0TW9kID0gcnNNb2RpZmllciArICc/JyxcbiAgICByc09wdFZhciA9ICdbJyArIHJzVmFyUmFuZ2UgKyAnXT8nLFxuICAgIHJzT3B0Sm9pbiA9ICcoPzonICsgcnNaV0ogKyAnKD86JyArIFtyc05vbkFzdHJhbCwgcnNSZWdpb25hbCwgcnNTdXJyUGFpcl0uam9pbignfCcpICsgJyknICsgcnNPcHRWYXIgKyByZU9wdE1vZCArICcpKicsXG4gICAgcnNTZXEgPSByc09wdFZhciArIHJlT3B0TW9kICsgcnNPcHRKb2luLFxuICAgIHJzRW1vamkgPSAnKD86JyArIFtyc0RpbmdiYXQsIHJzUmVnaW9uYWwsIHJzU3VyclBhaXJdLmpvaW4oJ3wnKSArICcpJyArIHJzU2VxO1xuXG4vKiogVXNlZCB0byBtYXRjaCBub24tY29tcG91bmQgd29yZHMgY29tcG9zZWQgb2YgYWxwaGFudW1lcmljIGNoYXJhY3RlcnMuICovXG52YXIgcmVCYXNpY1dvcmQgPSAvW2EtekEtWjAtOV0rL2c7XG5cbi8qKiBVc2VkIHRvIG1hdGNoIGNvbXBsZXggb3IgY29tcG91bmQgd29yZHMuICovXG52YXIgcmVDb21wbGV4V29yZCA9IFJlZ0V4cChbXG4gIHJzVXBwZXIgKyAnPycgKyByc0xvd2VyICsgJysoPz0nICsgW3JzQnJlYWssIHJzVXBwZXIsICckJ10uam9pbignfCcpICsgJyknLFxuICByc1VwcGVyTWlzYyArICcrKD89JyArIFtyc0JyZWFrLCByc1VwcGVyICsgcnNMb3dlck1pc2MsICckJ10uam9pbignfCcpICsgJyknLFxuICByc1VwcGVyICsgJz8nICsgcnNMb3dlck1pc2MgKyAnKycsXG4gIHJzVXBwZXIgKyAnKycsXG4gIHJzRGlnaXRzLFxuICByc0Vtb2ppXG5dLmpvaW4oJ3wnKSwgJ2cnKTtcblxuLyoqIFVzZWQgdG8gZGV0ZWN0IHN0cmluZ3MgdGhhdCBuZWVkIGEgbW9yZSByb2J1c3QgcmVnZXhwIHRvIG1hdGNoIHdvcmRzLiAqL1xudmFyIHJlSGFzQ29tcGxleFdvcmQgPSAvW2Etel1bQS1aXXxbMC05XVthLXpBLVpdfFthLXpBLVpdWzAtOV18W15hLXpBLVowLTkgXS87XG5cbi8qKiBVc2VkIGZvciBidWlsdC1pbiBtZXRob2QgcmVmZXJlbmNlcy4gKi9cbnZhciBvYmplY3RQcm90byA9IE9iamVjdC5wcm90b3R5cGU7XG5cbi8qKlxuICogVXNlZCB0byByZXNvbHZlIHRoZSBbYHRvU3RyaW5nVGFnYF0oaHR0cDovL2VjbWEtaW50ZXJuYXRpb25hbC5vcmcvZWNtYS0yNjIvNi4wLyNzZWMtb2JqZWN0LnByb3RvdHlwZS50b3N0cmluZylcbiAqIG9mIHZhbHVlcy5cbiAqL1xudmFyIG9iamVjdFRvU3RyaW5nID0gb2JqZWN0UHJvdG8udG9TdHJpbmc7XG5cbi8qKiBCdWlsdC1pbiB2YWx1ZSByZWZlcmVuY2VzLiAqL1xudmFyIFN5bWJvbCA9IHJvb3QuU3ltYm9sO1xuXG4vKiogVXNlZCB0byBjb252ZXJ0IHN5bWJvbHMgdG8gcHJpbWl0aXZlcyBhbmQgc3RyaW5ncy4gKi9cbnZhciBzeW1ib2xQcm90byA9IFN5bWJvbCA/IFN5bWJvbC5wcm90b3R5cGUgOiB1bmRlZmluZWQsXG4gICAgc3ltYm9sVG9TdHJpbmcgPSBTeW1ib2wgPyBzeW1ib2xQcm90by50b1N0cmluZyA6IHVuZGVmaW5lZDtcblxuLyoqXG4gKiBDaGVja3MgaWYgYHZhbHVlYCBpcyBvYmplY3QtbGlrZS4gQSB2YWx1ZSBpcyBvYmplY3QtbGlrZSBpZiBpdCdzIG5vdCBgbnVsbGBcbiAqIGFuZCBoYXMgYSBgdHlwZW9mYCByZXN1bHQgb2YgXCJvYmplY3RcIi5cbiAqXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgX1xuICogQGNhdGVnb3J5IExhbmdcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIGB2YWx1ZWAgaXMgb2JqZWN0LWxpa2UsIGVsc2UgYGZhbHNlYC5cbiAqIEBleGFtcGxlXG4gKlxuICogXy5pc09iamVjdExpa2Uoe30pO1xuICogLy8gPT4gdHJ1ZVxuICpcbiAqIF8uaXNPYmplY3RMaWtlKFsxLCAyLCAzXSk7XG4gKiAvLyA9PiB0cnVlXG4gKlxuICogXy5pc09iamVjdExpa2UoXy5ub29wKTtcbiAqIC8vID0+IGZhbHNlXG4gKlxuICogXy5pc09iamVjdExpa2UobnVsbCk7XG4gKiAvLyA9PiBmYWxzZVxuICovXG5mdW5jdGlvbiBpc09iamVjdExpa2UodmFsdWUpIHtcbiAgcmV0dXJuICEhdmFsdWUgJiYgdHlwZW9mIHZhbHVlID09ICdvYmplY3QnO1xufVxuXG4vKipcbiAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIGNsYXNzaWZpZWQgYXMgYSBgU3ltYm9sYCBwcmltaXRpdmUgb3Igb2JqZWN0LlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBfXG4gKiBAY2F0ZWdvcnkgTGFuZ1xuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgYHZhbHVlYCBpcyBjb3JyZWN0bHkgY2xhc3NpZmllZCwgZWxzZSBgZmFsc2VgLlxuICogQGV4YW1wbGVcbiAqXG4gKiBfLmlzU3ltYm9sKFN5bWJvbC5pdGVyYXRvcik7XG4gKiAvLyA9PiB0cnVlXG4gKlxuICogXy5pc1N5bWJvbCgnYWJjJyk7XG4gKiAvLyA9PiBmYWxzZVxuICovXG5mdW5jdGlvbiBpc1N5bWJvbCh2YWx1ZSkge1xuICByZXR1cm4gdHlwZW9mIHZhbHVlID09ICdzeW1ib2wnIHx8XG4gICAgKGlzT2JqZWN0TGlrZSh2YWx1ZSkgJiYgb2JqZWN0VG9TdHJpbmcuY2FsbCh2YWx1ZSkgPT0gc3ltYm9sVGFnKTtcbn1cblxuLyoqXG4gKiBDb252ZXJ0cyBgdmFsdWVgIHRvIGEgc3RyaW5nIGlmIGl0J3Mgbm90IG9uZS4gQW4gZW1wdHkgc3RyaW5nIGlzIHJldHVybmVkXG4gKiBmb3IgYG51bGxgIGFuZCBgdW5kZWZpbmVkYCB2YWx1ZXMuIFRoZSBzaWduIG9mIGAtMGAgaXMgcHJlc2VydmVkLlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBfXG4gKiBAY2F0ZWdvcnkgTGFuZ1xuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gcHJvY2Vzcy5cbiAqIEByZXR1cm5zIHtzdHJpbmd9IFJldHVybnMgdGhlIHN0cmluZy5cbiAqIEBleGFtcGxlXG4gKlxuICogXy50b1N0cmluZyhudWxsKTtcbiAqIC8vID0+ICcnXG4gKlxuICogXy50b1N0cmluZygtMCk7XG4gKiAvLyA9PiAnLTAnXG4gKlxuICogXy50b1N0cmluZyhbMSwgMiwgM10pO1xuICogLy8gPT4gJzEsMiwzJ1xuICovXG5mdW5jdGlvbiB0b1N0cmluZyh2YWx1ZSkge1xuICAvLyBFeGl0IGVhcmx5IGZvciBzdHJpbmdzIHRvIGF2b2lkIGEgcGVyZm9ybWFuY2UgaGl0IGluIHNvbWUgZW52aXJvbm1lbnRzLlxuICBpZiAodHlwZW9mIHZhbHVlID09ICdzdHJpbmcnKSB7XG4gICAgcmV0dXJuIHZhbHVlO1xuICB9XG4gIGlmICh2YWx1ZSA9PSBudWxsKSB7XG4gICAgcmV0dXJuICcnO1xuICB9XG4gIGlmIChpc1N5bWJvbCh2YWx1ZSkpIHtcbiAgICByZXR1cm4gU3ltYm9sID8gc3ltYm9sVG9TdHJpbmcuY2FsbCh2YWx1ZSkgOiAnJztcbiAgfVxuICB2YXIgcmVzdWx0ID0gKHZhbHVlICsgJycpO1xuICByZXR1cm4gKHJlc3VsdCA9PSAnMCcgJiYgKDEgLyB2YWx1ZSkgPT0gLUlORklOSVRZKSA/ICctMCcgOiByZXN1bHQ7XG59XG5cbi8qKlxuICogU3BsaXRzIGBzdHJpbmdgIGludG8gYW4gYXJyYXkgb2YgaXRzIHdvcmRzLlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBfXG4gKiBAY2F0ZWdvcnkgU3RyaW5nXG4gKiBAcGFyYW0ge3N0cmluZ30gW3N0cmluZz0nJ10gVGhlIHN0cmluZyB0byBpbnNwZWN0LlxuICogQHBhcmFtIHtSZWdFeHB8c3RyaW5nfSBbcGF0dGVybl0gVGhlIHBhdHRlcm4gdG8gbWF0Y2ggd29yZHMuXG4gKiBAcGFyYW0tIHtPYmplY3R9IFtndWFyZF0gRW5hYmxlcyB1c2UgYXMgYW4gaXRlcmF0ZWUgZm9yIGZ1bmN0aW9ucyBsaWtlIGBfLm1hcGAuXG4gKiBAcmV0dXJucyB7QXJyYXl9IFJldHVybnMgdGhlIHdvcmRzIG9mIGBzdHJpbmdgLlxuICogQGV4YW1wbGVcbiAqXG4gKiBfLndvcmRzKCdmcmVkLCBiYXJuZXksICYgcGViYmxlcycpO1xuICogLy8gPT4gWydmcmVkJywgJ2Jhcm5leScsICdwZWJibGVzJ11cbiAqXG4gKiBfLndvcmRzKCdmcmVkLCBiYXJuZXksICYgcGViYmxlcycsIC9bXiwgXSsvZyk7XG4gKiAvLyA9PiBbJ2ZyZWQnLCAnYmFybmV5JywgJyYnLCAncGViYmxlcyddXG4gKi9cbmZ1bmN0aW9uIHdvcmRzKHN0cmluZywgcGF0dGVybiwgZ3VhcmQpIHtcbiAgc3RyaW5nID0gdG9TdHJpbmcoc3RyaW5nKTtcbiAgcGF0dGVybiA9IGd1YXJkID8gdW5kZWZpbmVkIDogcGF0dGVybjtcblxuICBpZiAocGF0dGVybiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgcGF0dGVybiA9IHJlSGFzQ29tcGxleFdvcmQudGVzdChzdHJpbmcpID8gcmVDb21wbGV4V29yZCA6IHJlQmFzaWNXb3JkO1xuICB9XG4gIHJldHVybiBzdHJpbmcubWF0Y2gocGF0dGVybikgfHwgW107XG59XG5cbm1vZHVsZS5leHBvcnRzID0gd29yZHM7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBwcm90byA9IEVsZW1lbnQucHJvdG90eXBlO1xudmFyIHZlbmRvciA9IHByb3RvLm1hdGNoZXNcbiAgfHwgcHJvdG8ubWF0Y2hlc1NlbGVjdG9yXG4gIHx8IHByb3RvLndlYmtpdE1hdGNoZXNTZWxlY3RvclxuICB8fCBwcm90by5tb3pNYXRjaGVzU2VsZWN0b3JcbiAgfHwgcHJvdG8ubXNNYXRjaGVzU2VsZWN0b3JcbiAgfHwgcHJvdG8ub01hdGNoZXNTZWxlY3RvcjtcblxubW9kdWxlLmV4cG9ydHMgPSBtYXRjaDtcblxuLyoqXG4gKiBNYXRjaCBgZWxgIHRvIGBzZWxlY3RvcmAuXG4gKlxuICogQHBhcmFtIHtFbGVtZW50fSBlbFxuICogQHBhcmFtIHtTdHJpbmd9IHNlbGVjdG9yXG4gKiBAcmV0dXJuIHtCb29sZWFufVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5mdW5jdGlvbiBtYXRjaChlbCwgc2VsZWN0b3IpIHtcbiAgaWYgKHZlbmRvcikgcmV0dXJuIHZlbmRvci5jYWxsKGVsLCBzZWxlY3Rvcik7XG4gIHZhciBub2RlcyA9IGVsLnBhcmVudE5vZGUucXVlcnlTZWxlY3RvckFsbChzZWxlY3Rvcik7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbm9kZXMubGVuZ3RoOyBpKyspIHtcbiAgICBpZiAobm9kZXNbaV0gPT0gZWwpIHJldHVybiB0cnVlO1xuICB9XG4gIHJldHVybiBmYWxzZTtcbn0iLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcblxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xudmFyIHF1ZXVlID0gW107XG52YXIgZHJhaW5pbmcgPSBmYWxzZTtcbnZhciBjdXJyZW50UXVldWU7XG52YXIgcXVldWVJbmRleCA9IC0xO1xuXG5mdW5jdGlvbiBjbGVhblVwTmV4dFRpY2soKSB7XG4gICAgaWYgKCFkcmFpbmluZyB8fCAhY3VycmVudFF1ZXVlKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBpZiAoY3VycmVudFF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBxdWV1ZSA9IGN1cnJlbnRRdWV1ZS5jb25jYXQocXVldWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICB9XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBkcmFpblF1ZXVlKCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBkcmFpblF1ZXVlKCkge1xuICAgIGlmIChkcmFpbmluZykge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciB0aW1lb3V0ID0gc2V0VGltZW91dChjbGVhblVwTmV4dFRpY2spO1xuICAgIGRyYWluaW5nID0gdHJ1ZTtcblxuICAgIHZhciBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgd2hpbGUobGVuKSB7XG4gICAgICAgIGN1cnJlbnRRdWV1ZSA9IHF1ZXVlO1xuICAgICAgICBxdWV1ZSA9IFtdO1xuICAgICAgICB3aGlsZSAoKytxdWV1ZUluZGV4IDwgbGVuKSB7XG4gICAgICAgICAgICBpZiAoY3VycmVudFF1ZXVlKSB7XG4gICAgICAgICAgICAgICAgY3VycmVudFF1ZXVlW3F1ZXVlSW5kZXhdLnJ1bigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICAgICAgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIH1cbiAgICBjdXJyZW50UXVldWUgPSBudWxsO1xuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xufVxuXG5wcm9jZXNzLm5leHRUaWNrID0gZnVuY3Rpb24gKGZ1bikge1xuICAgIHZhciBhcmdzID0gbmV3IEFycmF5KGFyZ3VtZW50cy5sZW5ndGggLSAxKTtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgICB9XG4gICAgfVxuICAgIHF1ZXVlLnB1c2gobmV3IEl0ZW0oZnVuLCBhcmdzKSk7XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCA9PT0gMSAmJiAhZHJhaW5pbmcpIHtcbiAgICAgICAgc2V0VGltZW91dChkcmFpblF1ZXVlLCAwKTtcbiAgICB9XG59O1xuXG4vLyB2OCBsaWtlcyBwcmVkaWN0aWJsZSBvYmplY3RzXG5mdW5jdGlvbiBJdGVtKGZ1biwgYXJyYXkpIHtcbiAgICB0aGlzLmZ1biA9IGZ1bjtcbiAgICB0aGlzLmFycmF5ID0gYXJyYXk7XG59XG5JdGVtLnByb3RvdHlwZS5ydW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5mdW4uYXBwbHkobnVsbCwgdGhpcy5hcnJheSk7XG59O1xucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5wcm9jZXNzLnZlcnNpb24gPSAnJzsgLy8gZW1wdHkgc3RyaW5nIHRvIGF2b2lkIHJlZ2V4cCBpc3N1ZXNcbnByb2Nlc3MudmVyc2lvbnMgPSB7fTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5cbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xucHJvY2Vzcy51bWFzayA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gMDsgfTtcbiIsIid1c2Ugc3RyaWN0JztcbnZhciBzdHJpY3RVcmlFbmNvZGUgPSByZXF1aXJlKCdzdHJpY3QtdXJpLWVuY29kZScpO1xuXG5leHBvcnRzLmV4dHJhY3QgPSBmdW5jdGlvbiAoc3RyKSB7XG5cdHJldHVybiBzdHIuc3BsaXQoJz8nKVsxXSB8fCAnJztcbn07XG5cbmV4cG9ydHMucGFyc2UgPSBmdW5jdGlvbiAoc3RyKSB7XG5cdGlmICh0eXBlb2Ygc3RyICE9PSAnc3RyaW5nJykge1xuXHRcdHJldHVybiB7fTtcblx0fVxuXG5cdHN0ciA9IHN0ci50cmltKCkucmVwbGFjZSgvXihcXD98I3wmKS8sICcnKTtcblxuXHRpZiAoIXN0cikge1xuXHRcdHJldHVybiB7fTtcblx0fVxuXG5cdHJldHVybiBzdHIuc3BsaXQoJyYnKS5yZWR1Y2UoZnVuY3Rpb24gKHJldCwgcGFyYW0pIHtcblx0XHR2YXIgcGFydHMgPSBwYXJhbS5yZXBsYWNlKC9cXCsvZywgJyAnKS5zcGxpdCgnPScpO1xuXHRcdC8vIEZpcmVmb3ggKHByZSA0MCkgZGVjb2RlcyBgJTNEYCB0byBgPWBcblx0XHQvLyBodHRwczovL2dpdGh1Yi5jb20vc2luZHJlc29yaHVzL3F1ZXJ5LXN0cmluZy9wdWxsLzM3XG5cdFx0dmFyIGtleSA9IHBhcnRzLnNoaWZ0KCk7XG5cdFx0dmFyIHZhbCA9IHBhcnRzLmxlbmd0aCA+IDAgPyBwYXJ0cy5qb2luKCc9JykgOiB1bmRlZmluZWQ7XG5cblx0XHRrZXkgPSBkZWNvZGVVUklDb21wb25lbnQoa2V5KTtcblxuXHRcdC8vIG1pc3NpbmcgYD1gIHNob3VsZCBiZSBgbnVsbGA6XG5cdFx0Ly8gaHR0cDovL3czLm9yZy9UUi8yMDEyL1dELXVybC0yMDEyMDUyNC8jY29sbGVjdC11cmwtcGFyYW1ldGVyc1xuXHRcdHZhbCA9IHZhbCA9PT0gdW5kZWZpbmVkID8gbnVsbCA6IGRlY29kZVVSSUNvbXBvbmVudCh2YWwpO1xuXG5cdFx0aWYgKCFyZXQuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuXHRcdFx0cmV0W2tleV0gPSB2YWw7XG5cdFx0fSBlbHNlIGlmIChBcnJheS5pc0FycmF5KHJldFtrZXldKSkge1xuXHRcdFx0cmV0W2tleV0ucHVzaCh2YWwpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXRba2V5XSA9IFtyZXRba2V5XSwgdmFsXTtcblx0XHR9XG5cblx0XHRyZXR1cm4gcmV0O1xuXHR9LCB7fSk7XG59O1xuXG5leHBvcnRzLnN0cmluZ2lmeSA9IGZ1bmN0aW9uIChvYmopIHtcblx0cmV0dXJuIG9iaiA/IE9iamVjdC5rZXlzKG9iaikuc29ydCgpLm1hcChmdW5jdGlvbiAoa2V5KSB7XG5cdFx0dmFyIHZhbCA9IG9ialtrZXldO1xuXG5cdFx0aWYgKHZhbCA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRyZXR1cm4gJyc7XG5cdFx0fVxuXG5cdFx0aWYgKHZhbCA9PT0gbnVsbCkge1xuXHRcdFx0cmV0dXJuIGtleTtcblx0XHR9XG5cblx0XHRpZiAoQXJyYXkuaXNBcnJheSh2YWwpKSB7XG5cdFx0XHRyZXR1cm4gdmFsLnNsaWNlKCkuc29ydCgpLm1hcChmdW5jdGlvbiAodmFsMikge1xuXHRcdFx0XHRyZXR1cm4gc3RyaWN0VXJpRW5jb2RlKGtleSkgKyAnPScgKyBzdHJpY3RVcmlFbmNvZGUodmFsMik7XG5cdFx0XHR9KS5qb2luKCcmJyk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHN0cmljdFVyaUVuY29kZShrZXkpICsgJz0nICsgc3RyaWN0VXJpRW5jb2RlKHZhbCk7XG5cdH0pLmZpbHRlcihmdW5jdGlvbiAoeCkge1xuXHRcdHJldHVybiB4Lmxlbmd0aCA+IDA7XG5cdH0pLmpvaW4oJyYnKSA6ICcnO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuZGVmYXVsdCA9IGNsYXNzTmFtZUZyb21WTm9kZTtcblxudmFyIF9zZWxlY3RvclBhcnNlcjIgPSByZXF1aXJlKCcuL3NlbGVjdG9yUGFyc2VyJyk7XG5cbnZhciBfc2VsZWN0b3JQYXJzZXIzID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfc2VsZWN0b3JQYXJzZXIyKTtcblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgZGVmYXVsdDogb2JqIH07IH1cblxuZnVuY3Rpb24gY2xhc3NOYW1lRnJvbVZOb2RlKHZOb2RlKSB7XG4gIHZhciBfc2VsZWN0b3JQYXJzZXIgPSAoMCwgX3NlbGVjdG9yUGFyc2VyMy5kZWZhdWx0KSh2Tm9kZS5zZWwpO1xuXG4gIHZhciBjbiA9IF9zZWxlY3RvclBhcnNlci5jbGFzc05hbWU7XG5cbiAgaWYgKCF2Tm9kZS5kYXRhKSB7XG4gICAgcmV0dXJuIGNuO1xuICB9XG5cbiAgdmFyIF92Tm9kZSRkYXRhID0gdk5vZGUuZGF0YTtcbiAgdmFyIGRhdGFDbGFzcyA9IF92Tm9kZSRkYXRhLmNsYXNzO1xuICB2YXIgcHJvcHMgPSBfdk5vZGUkZGF0YS5wcm9wcztcblxuICBpZiAoZGF0YUNsYXNzKSB7XG4gICAgdmFyIGMgPSBPYmplY3Qua2V5cyh2Tm9kZS5kYXRhLmNsYXNzKS5maWx0ZXIoZnVuY3Rpb24gKGNsKSB7XG4gICAgICByZXR1cm4gdk5vZGUuZGF0YS5jbGFzc1tjbF07XG4gICAgfSk7XG4gICAgY24gKz0gJyAnICsgYy5qb2luKCcgJyk7XG4gIH1cblxuICBpZiAocHJvcHMgJiYgcHJvcHMuY2xhc3NOYW1lKSB7XG4gICAgY24gKz0gJyAnICsgcHJvcHMuY2xhc3NOYW1lO1xuICB9XG5cbiAgcmV0dXJuIGNuLnRyaW0oKTtcbn0iLCIndXNlIHN0cmljdCc7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLmRlZmF1bHQgPSBzZWxlY3RvclBhcnNlcjtcblxudmFyIF9icm93c2VyU3BsaXQgPSByZXF1aXJlKCdicm93c2VyLXNwbGl0Jyk7XG5cbnZhciBfYnJvd3NlclNwbGl0MiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX2Jyb3dzZXJTcGxpdCk7XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZURlZmF1bHQob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7IGRlZmF1bHQ6IG9iaiB9OyB9XG5cbnZhciBjbGFzc0lkU3BsaXQgPSAvKFtcXC4jXT9bYS16QS1aMC05XFx1MDA3Ri1cXHVGRkZGXzotXSspLztcbnZhciBub3RDbGFzc0lkID0gL15cXC58Iy87XG5cbmZ1bmN0aW9uIHNlbGVjdG9yUGFyc2VyKCkge1xuICB2YXIgc2VsZWN0b3IgPSBhcmd1bWVudHMubGVuZ3RoIDw9IDAgfHwgYXJndW1lbnRzWzBdID09PSB1bmRlZmluZWQgPyAnJyA6IGFyZ3VtZW50c1swXTtcblxuICB2YXIgdGFnTmFtZSA9IHVuZGVmaW5lZDtcbiAgdmFyIGlkID0gJyc7XG4gIHZhciBjbGFzc2VzID0gW107XG5cbiAgdmFyIHRhZ1BhcnRzID0gKDAsIF9icm93c2VyU3BsaXQyLmRlZmF1bHQpKHNlbGVjdG9yLCBjbGFzc0lkU3BsaXQpO1xuXG4gIGlmIChub3RDbGFzc0lkLnRlc3QodGFnUGFydHNbMV0pIHx8IHNlbGVjdG9yID09PSAnJykge1xuICAgIHRhZ05hbWUgPSAnZGl2JztcbiAgfVxuXG4gIHZhciBwYXJ0ID0gdW5kZWZpbmVkO1xuICB2YXIgdHlwZSA9IHVuZGVmaW5lZDtcbiAgdmFyIGkgPSB1bmRlZmluZWQ7XG5cbiAgZm9yIChpID0gMDsgaSA8IHRhZ1BhcnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgcGFydCA9IHRhZ1BhcnRzW2ldO1xuXG4gICAgaWYgKCFwYXJ0KSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICB0eXBlID0gcGFydC5jaGFyQXQoMCk7XG5cbiAgICBpZiAoIXRhZ05hbWUpIHtcbiAgICAgIHRhZ05hbWUgPSBwYXJ0O1xuICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gJy4nKSB7XG4gICAgICBjbGFzc2VzLnB1c2gocGFydC5zdWJzdHJpbmcoMSwgcGFydC5sZW5ndGgpKTtcbiAgICB9IGVsc2UgaWYgKHR5cGUgPT09ICcjJykge1xuICAgICAgaWQgPSBwYXJ0LnN1YnN0cmluZygxLCBwYXJ0Lmxlbmd0aCk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHtcbiAgICB0YWdOYW1lOiB0YWdOYW1lLFxuICAgIGlkOiBpZCxcbiAgICBjbGFzc05hbWU6IGNsYXNzZXMuam9pbignICcpXG4gIH07XG59IiwiXG4vLyBBbGwgU1ZHIGNoaWxkcmVuIGVsZW1lbnRzLCBub3QgaW4gdGhpcyBsaXN0LCBzaG91bGQgc2VsZi1jbG9zZVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgLy8gaHR0cDovL3d3dy53My5vcmcvVFIvU1ZHL2ludHJvLmh0bWwjVGVybUNvbnRhaW5lckVsZW1lbnRcbiAgJ2EnOiB0cnVlLFxuICAnZGVmcyc6IHRydWUsXG4gICdnbHlwaCc6IHRydWUsXG4gICdnJzogdHJ1ZSxcbiAgJ21hcmtlcic6IHRydWUsXG4gICdtYXNrJzogdHJ1ZSxcbiAgJ21pc3NpbmctZ2x5cGgnOiB0cnVlLFxuICAncGF0dGVybic6IHRydWUsXG4gICdzdmcnOiB0cnVlLFxuICAnc3dpdGNoJzogdHJ1ZSxcbiAgJ3N5bWJvbCc6IHRydWUsXG5cbiAgLy8gaHR0cDovL3d3dy53My5vcmcvVFIvU1ZHL2ludHJvLmh0bWwjVGVybURlc2NyaXB0aXZlRWxlbWVudFxuICAnZGVzYyc6IHRydWUsXG4gICdtZXRhZGF0YSc6IHRydWUsXG4gICd0aXRsZSc6IHRydWVcbn07IiwiXG52YXIgaW5pdCA9IHJlcXVpcmUoJy4vaW5pdCcpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGluaXQoW3JlcXVpcmUoJy4vbW9kdWxlcy9hdHRyaWJ1dGVzJyksIHJlcXVpcmUoJy4vbW9kdWxlcy9zdHlsZScpXSk7IiwiXG52YXIgcGFyc2VTZWxlY3RvciA9IHJlcXVpcmUoJy4vcGFyc2Utc2VsZWN0b3InKTtcbnZhciBWT0lEX0VMRU1FTlRTID0gcmVxdWlyZSgnLi92b2lkLWVsZW1lbnRzJyk7XG52YXIgQ09OVEFJTkVSX0VMRU1FTlRTID0gcmVxdWlyZSgnLi9jb250YWluZXItZWxlbWVudHMnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpbml0KG1vZHVsZXMpIHtcbiAgZnVuY3Rpb24gcGFyc2UoZGF0YSkge1xuICAgIHJldHVybiBtb2R1bGVzLnJlZHVjZShmdW5jdGlvbiAoYXJyLCBmbikge1xuICAgICAgYXJyLnB1c2goZm4oZGF0YSkpO1xuICAgICAgcmV0dXJuIGFycjtcbiAgICB9LCBbXSkuZmlsdGVyKGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgIHJldHVybiByZXN1bHQgIT09ICcnO1xuICAgIH0pO1xuICB9XG5cbiAgcmV0dXJuIGZ1bmN0aW9uIHJlbmRlclRvU3RyaW5nKHZub2RlKSB7XG4gICAgaWYgKCF2bm9kZS5zZWwgJiYgdm5vZGUudGV4dCkge1xuICAgICAgcmV0dXJuIHZub2RlLnRleHQ7XG4gICAgfVxuXG4gICAgdm5vZGUuZGF0YSA9IHZub2RlLmRhdGEgfHwge307XG5cbiAgICAvLyBTdXBwb3J0IHRodW5rc1xuICAgIGlmICh0eXBlb2Ygdm5vZGUuc2VsID09PSAnc3RyaW5nJyAmJiB2bm9kZS5zZWwuc2xpY2UoMCwgNSkgPT09ICd0aHVuaycpIHtcbiAgICAgIHZub2RlID0gdm5vZGUuZGF0YS5mbi5hcHBseShudWxsLCB2bm9kZS5kYXRhLmFyZ3MpO1xuICAgIH1cblxuICAgIHZhciB0YWdOYW1lID0gcGFyc2VTZWxlY3Rvcih2bm9kZS5zZWwpLnRhZ05hbWU7XG4gICAgdmFyIGF0dHJpYnV0ZXMgPSBwYXJzZSh2bm9kZSk7XG4gICAgdmFyIHN2ZyA9IHZub2RlLmRhdGEubnMgPT09ICdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Zyc7XG4gICAgdmFyIHRhZyA9IFtdO1xuXG4gICAgLy8gT3BlbiB0YWdcbiAgICB0YWcucHVzaCgnPCcgKyB0YWdOYW1lKTtcbiAgICBpZiAoYXR0cmlidXRlcy5sZW5ndGgpIHtcbiAgICAgIHRhZy5wdXNoKCcgJyArIGF0dHJpYnV0ZXMuam9pbignICcpKTtcbiAgICB9XG4gICAgaWYgKHN2ZyAmJiBDT05UQUlORVJfRUxFTUVOVFNbdGFnTmFtZV0gIT09IHRydWUpIHtcbiAgICAgIHRhZy5wdXNoKCcgLycpO1xuICAgIH1cbiAgICB0YWcucHVzaCgnPicpO1xuXG4gICAgLy8gQ2xvc2UgdGFnLCBpZiBuZWVkZWRcbiAgICBpZiAoVk9JRF9FTEVNRU5UU1t0YWdOYW1lXSAhPT0gdHJ1ZSAmJiAhc3ZnIHx8IHN2ZyAmJiBDT05UQUlORVJfRUxFTUVOVFNbdGFnTmFtZV0gPT09IHRydWUpIHtcbiAgICAgIGlmICh2bm9kZS5kYXRhLnByb3BzICYmIHZub2RlLmRhdGEucHJvcHMuaW5uZXJIVE1MKSB7XG4gICAgICAgIHRhZy5wdXNoKHZub2RlLmRhdGEucHJvcHMuaW5uZXJIVE1MKTtcbiAgICAgIH0gZWxzZSBpZiAodm5vZGUudGV4dCkge1xuICAgICAgICB0YWcucHVzaCh2bm9kZS50ZXh0KTtcbiAgICAgIH0gZWxzZSBpZiAodm5vZGUuY2hpbGRyZW4pIHtcbiAgICAgICAgdm5vZGUuY2hpbGRyZW4uZm9yRWFjaChmdW5jdGlvbiAoY2hpbGQpIHtcbiAgICAgICAgICB0YWcucHVzaChyZW5kZXJUb1N0cmluZyhjaGlsZCkpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIHRhZy5wdXNoKCc8LycgKyB0YWdOYW1lICsgJz4nKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGFnLmpvaW4oJycpO1xuICB9O1xufTsiLCJcbnZhciBmb3JPd24gPSByZXF1aXJlKCdsb2Rhc2guZm9yb3duJyk7XG52YXIgZXNjYXBlID0gcmVxdWlyZSgnbG9kYXNoLmVzY2FwZScpO1xudmFyIHVuaW9uID0gcmVxdWlyZSgnbG9kYXNoLnVuaW9uJyk7XG5cbnZhciBwYXJzZVNlbGVjdG9yID0gcmVxdWlyZSgnLi4vcGFyc2Utc2VsZWN0b3InKTtcblxuLy8gZGF0YS5hdHRycywgZGF0YS5wcm9wcywgZGF0YS5jbGFzc1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGF0dHJpYnV0ZXModm5vZGUpIHtcbiAgdmFyIHNlbGVjdG9yID0gcGFyc2VTZWxlY3Rvcih2bm9kZS5zZWwpO1xuICB2YXIgcGFyc2VkQ2xhc3NlcyA9IHNlbGVjdG9yLmNsYXNzTmFtZS5zcGxpdCgnICcpO1xuXG4gIHZhciBhdHRyaWJ1dGVzID0gW107XG4gIHZhciBjbGFzc2VzID0gW107XG4gIHZhciB2YWx1ZXMgPSB7fTtcblxuICBpZiAoc2VsZWN0b3IuaWQpIHtcbiAgICB2YWx1ZXMuaWQgPSBzZWxlY3Rvci5pZDtcbiAgfVxuXG4gIHNldEF0dHJpYnV0ZXModm5vZGUuZGF0YS5wcm9wcywgdmFsdWVzKTtcbiAgc2V0QXR0cmlidXRlcyh2bm9kZS5kYXRhLmF0dHJzLCB2YWx1ZXMpOyAvLyBgYXR0cnNgIG92ZXJyaWRlIGBwcm9wc2AsIG5vdCBzdXJlIGlmIHRoaXMgaXMgZ29vZCBzb1xuXG4gIGlmICh2bm9kZS5kYXRhLmNsYXNzKSB7XG4gICAgLy8gT21pdCBgY2xhc3NOYW1lYCBhdHRyaWJ1dGUgaWYgYGNsYXNzYCBpcyBzZXQgb24gdm5vZGVcbiAgICB2YWx1ZXMuY2xhc3MgPSB1bmRlZmluZWQ7XG4gIH1cbiAgZm9yT3duKHZub2RlLmRhdGEuY2xhc3MsIGZ1bmN0aW9uICh2YWx1ZSwga2V5KSB7XG4gICAgaWYgKHZhbHVlID09PSB0cnVlKSB7XG4gICAgICBjbGFzc2VzLnB1c2goa2V5KTtcbiAgICB9XG4gIH0pO1xuICBjbGFzc2VzID0gdW5pb24oY2xhc3NlcywgdmFsdWVzLmNsYXNzLCBwYXJzZWRDbGFzc2VzKS5maWx0ZXIoZnVuY3Rpb24gKHgpIHtcbiAgICByZXR1cm4geCAhPT0gJyc7XG4gIH0pO1xuXG4gIGlmIChjbGFzc2VzLmxlbmd0aCkge1xuICAgIHZhbHVlcy5jbGFzcyA9IGNsYXNzZXMuam9pbignICcpO1xuICB9XG5cbiAgZm9yT3duKHZhbHVlcywgZnVuY3Rpb24gKHZhbHVlLCBrZXkpIHtcbiAgICBhdHRyaWJ1dGVzLnB1c2godmFsdWUgPT09IHRydWUgPyBrZXkgOiBrZXkgKyAnPVwiJyArIGVzY2FwZSh2YWx1ZSkgKyAnXCInKTtcbiAgfSk7XG5cbiAgcmV0dXJuIGF0dHJpYnV0ZXMubGVuZ3RoID8gYXR0cmlidXRlcy5qb2luKCcgJykgOiAnJztcbn07XG5cbmZ1bmN0aW9uIHNldEF0dHJpYnV0ZXModmFsdWVzLCB0YXJnZXQpIHtcbiAgZm9yT3duKHZhbHVlcywgZnVuY3Rpb24gKHZhbHVlLCBrZXkpIHtcbiAgICBpZiAoa2V5ID09PSAnaHRtbEZvcicpIHtcbiAgICAgIHRhcmdldFsnZm9yJ10gPSB2YWx1ZTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKGtleSA9PT0gJ2NsYXNzTmFtZScpIHtcbiAgICAgIHRhcmdldFsnY2xhc3MnXSA9IHZhbHVlLnNwbGl0KCcgJyk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmIChrZXkgPT09ICdpbm5lckhUTUwnKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRhcmdldFtrZXldID0gdmFsdWU7XG4gIH0pO1xufSIsInZhciBfZXh0ZW5kcyA9IE9iamVjdC5hc3NpZ24gfHwgZnVuY3Rpb24gKHRhcmdldCkgeyBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykgeyB2YXIgc291cmNlID0gYXJndW1lbnRzW2ldOyBmb3IgKHZhciBrZXkgaW4gc291cmNlKSB7IGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoc291cmNlLCBrZXkpKSB7IHRhcmdldFtrZXldID0gc291cmNlW2tleV07IH0gfSB9IHJldHVybiB0YXJnZXQ7IH07XG5cbnZhciBmb3JPd24gPSByZXF1aXJlKCdsb2Rhc2guZm9yb3duJyk7XG52YXIgZXNjYXBlID0gcmVxdWlyZSgnbG9kYXNoLmVzY2FwZScpO1xudmFyIGtlYmFiQ2FzZSA9IHJlcXVpcmUoJ2xvZGFzaC5rZWJhYmNhc2UnKTtcblxuLy8gZGF0YS5zdHlsZVxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIHN0eWxlKHZub2RlKSB7XG4gIHZhciBzdHlsZXMgPSBbXTtcbiAgdmFyIHN0eWxlID0gdm5vZGUuZGF0YS5zdHlsZSB8fCB7fTtcblxuICAvLyBtZXJnZSBpbiBgZGVsYXllZGAgcHJvcGVydGllc1xuICBpZiAoc3R5bGUuZGVsYXllZCkge1xuICAgIF9leHRlbmRzKHN0eWxlLCBzdHlsZS5kZWxheWVkKTtcbiAgfVxuXG4gIGZvck93bihzdHlsZSwgZnVuY3Rpb24gKHZhbHVlLCBrZXkpIHtcbiAgICAvLyBvbWl0IGhvb2sgb2JqZWN0c1xuICAgIGlmICh0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnKSB7XG4gICAgICBzdHlsZXMucHVzaChrZWJhYkNhc2Uoa2V5KSArICc6ICcgKyBlc2NhcGUodmFsdWUpKTtcbiAgICB9XG4gIH0pO1xuXG4gIHJldHVybiBzdHlsZXMubGVuZ3RoID8gJ3N0eWxlPVwiJyArIHN0eWxlcy5qb2luKCc7ICcpICsgJ1wiJyA6ICcnO1xufTsiLCJcbi8vIGh0dHBzOi8vZ2l0aHViLmNvbS9NYXR0LUVzY2gvdmlydHVhbC1kb20vYmxvYi9tYXN0ZXIvdmlydHVhbC1oeXBlcnNjcmlwdC9wYXJzZS10YWcuanNcblxudmFyIHNwbGl0ID0gcmVxdWlyZSgnYnJvd3Nlci1zcGxpdCcpO1xuXG52YXIgY2xhc3NJZFNwbGl0ID0gLyhbXFwuI10/W2EtekEtWjAtOVxcdTAwN0YtXFx1RkZGRl86LV0rKS87XG52YXIgbm90Q2xhc3NJZCA9IC9eXFwufCMvO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIHBhcnNlU2VsZWN0b3Ioc2VsZWN0b3IsIHVwcGVyKSB7XG4gIHNlbGVjdG9yID0gc2VsZWN0b3IgfHwgJyc7XG4gIHZhciB0YWdOYW1lO1xuICB2YXIgaWQgPSAnJztcbiAgdmFyIGNsYXNzZXMgPSBbXTtcblxuICB2YXIgdGFnUGFydHMgPSBzcGxpdChzZWxlY3RvciwgY2xhc3NJZFNwbGl0KTtcblxuICBpZiAobm90Q2xhc3NJZC50ZXN0KHRhZ1BhcnRzWzFdKSB8fCBzZWxlY3RvciA9PT0gJycpIHtcbiAgICB0YWdOYW1lID0gJ2Rpdic7XG4gIH1cblxuICB2YXIgcGFydCwgdHlwZSwgaTtcblxuICBmb3IgKGkgPSAwOyBpIDwgdGFnUGFydHMubGVuZ3RoOyBpKyspIHtcbiAgICBwYXJ0ID0gdGFnUGFydHNbaV07XG5cbiAgICBpZiAoIXBhcnQpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIHR5cGUgPSBwYXJ0LmNoYXJBdCgwKTtcblxuICAgIGlmICghdGFnTmFtZSkge1xuICAgICAgdGFnTmFtZSA9IHBhcnQ7XG4gICAgfSBlbHNlIGlmICh0eXBlID09PSAnLicpIHtcbiAgICAgIGNsYXNzZXMucHVzaChwYXJ0LnN1YnN0cmluZygxLCBwYXJ0Lmxlbmd0aCkpO1xuICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gJyMnKSB7XG4gICAgICBpZCA9IHBhcnQuc3Vic3RyaW5nKDEsIHBhcnQubGVuZ3RoKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4ge1xuICAgIHRhZ05hbWU6IHVwcGVyID09PSB0cnVlID8gdGFnTmFtZS50b1VwcGVyQ2FzZSgpIDogdGFnTmFtZSxcbiAgICBpZDogaWQsXG4gICAgY2xhc3NOYW1lOiBjbGFzc2VzLmpvaW4oJyAnKVxuICB9O1xufTsiLCJcbi8vIGh0dHA6Ly93d3cudzMub3JnL2h0bWwvd2cvZHJhZnRzL2h0bWwvbWFzdGVyL3N5bnRheC5odG1sI3ZvaWQtZWxlbWVudHNcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGFyZWE6IHRydWUsXG4gIGJhc2U6IHRydWUsXG4gIGJyOiB0cnVlLFxuICBjb2w6IHRydWUsXG4gIGVtYmVkOiB0cnVlLFxuICBocjogdHJ1ZSxcbiAgaW1nOiB0cnVlLFxuICBpbnB1dDogdHJ1ZSxcbiAga2V5Z2VuOiB0cnVlLFxuICBsaW5rOiB0cnVlLFxuICBtZXRhOiB0cnVlLFxuICBwYXJhbTogdHJ1ZSxcbiAgc291cmNlOiB0cnVlLFxuICB0cmFjazogdHJ1ZSxcbiAgd2JyOiB0cnVlXG59OyIsInZhciBWTm9kZSA9IHJlcXVpcmUoJy4vdm5vZGUnKTtcbnZhciBpcyA9IHJlcXVpcmUoJy4vaXMnKTtcblxuZnVuY3Rpb24gYWRkTlMoZGF0YSwgY2hpbGRyZW4pIHtcbiAgZGF0YS5ucyA9ICdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Zyc7XG4gIGlmIChjaGlsZHJlbiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjaGlsZHJlbi5sZW5ndGg7ICsraSkge1xuICAgICAgYWRkTlMoY2hpbGRyZW5baV0uZGF0YSwgY2hpbGRyZW5baV0uY2hpbGRyZW4pO1xuICAgIH1cbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGgoc2VsLCBiLCBjKSB7XG4gIHZhciBkYXRhID0ge30sIGNoaWxkcmVuLCB0ZXh0LCBpO1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMykge1xuICAgIGRhdGEgPSBiO1xuICAgIGlmIChpcy5hcnJheShjKSkgeyBjaGlsZHJlbiA9IGM7IH1cbiAgICBlbHNlIGlmIChpcy5wcmltaXRpdmUoYykpIHsgdGV4dCA9IGM7IH1cbiAgfSBlbHNlIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAyKSB7XG4gICAgaWYgKGlzLmFycmF5KGIpKSB7IGNoaWxkcmVuID0gYjsgfVxuICAgIGVsc2UgaWYgKGlzLnByaW1pdGl2ZShiKSkgeyB0ZXh0ID0gYjsgfVxuICAgIGVsc2UgeyBkYXRhID0gYjsgfVxuICB9XG4gIGlmIChpcy5hcnJheShjaGlsZHJlbikpIHtcbiAgICBmb3IgKGkgPSAwOyBpIDwgY2hpbGRyZW4ubGVuZ3RoOyArK2kpIHtcbiAgICAgIGlmIChpcy5wcmltaXRpdmUoY2hpbGRyZW5baV0pKSBjaGlsZHJlbltpXSA9IFZOb2RlKHVuZGVmaW5lZCwgdW5kZWZpbmVkLCB1bmRlZmluZWQsIGNoaWxkcmVuW2ldKTtcbiAgICB9XG4gIH1cbiAgaWYgKHNlbFswXSA9PT0gJ3MnICYmIHNlbFsxXSA9PT0gJ3YnICYmIHNlbFsyXSA9PT0gJ2cnKSB7XG4gICAgYWRkTlMoZGF0YSwgY2hpbGRyZW4pO1xuICB9XG4gIHJldHVybiBWTm9kZShzZWwsIGRhdGEsIGNoaWxkcmVuLCB0ZXh0LCB1bmRlZmluZWQpO1xufTtcbiIsImZ1bmN0aW9uIGNyZWF0ZUVsZW1lbnQodGFnTmFtZSl7XG4gIHJldHVybiBkb2N1bWVudC5jcmVhdGVFbGVtZW50KHRhZ05hbWUpO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVFbGVtZW50TlMobmFtZXNwYWNlVVJJLCBxdWFsaWZpZWROYW1lKXtcbiAgcmV0dXJuIGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUyhuYW1lc3BhY2VVUkksIHF1YWxpZmllZE5hbWUpO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVUZXh0Tm9kZSh0ZXh0KXtcbiAgcmV0dXJuIGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKHRleHQpO1xufVxuXG5cbmZ1bmN0aW9uIGluc2VydEJlZm9yZShwYXJlbnROb2RlLCBuZXdOb2RlLCByZWZlcmVuY2VOb2RlKXtcbiAgcGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUobmV3Tm9kZSwgcmVmZXJlbmNlTm9kZSk7XG59XG5cblxuZnVuY3Rpb24gcmVtb3ZlQ2hpbGQobm9kZSwgY2hpbGQpe1xuICBub2RlLnJlbW92ZUNoaWxkKGNoaWxkKTtcbn1cblxuZnVuY3Rpb24gYXBwZW5kQ2hpbGQobm9kZSwgY2hpbGQpe1xuICBub2RlLmFwcGVuZENoaWxkKGNoaWxkKTtcbn1cblxuZnVuY3Rpb24gcGFyZW50Tm9kZShub2RlKXtcbiAgcmV0dXJuIG5vZGUucGFyZW50RWxlbWVudDtcbn1cblxuZnVuY3Rpb24gbmV4dFNpYmxpbmcobm9kZSl7XG4gIHJldHVybiBub2RlLm5leHRTaWJsaW5nO1xufVxuXG5mdW5jdGlvbiB0YWdOYW1lKG5vZGUpe1xuICByZXR1cm4gbm9kZS50YWdOYW1lO1xufVxuXG5mdW5jdGlvbiBzZXRUZXh0Q29udGVudChub2RlLCB0ZXh0KXtcbiAgbm9kZS50ZXh0Q29udGVudCA9IHRleHQ7XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBjcmVhdGVFbGVtZW50OiBjcmVhdGVFbGVtZW50LFxuICBjcmVhdGVFbGVtZW50TlM6IGNyZWF0ZUVsZW1lbnROUyxcbiAgY3JlYXRlVGV4dE5vZGU6IGNyZWF0ZVRleHROb2RlLFxuICBhcHBlbmRDaGlsZDogYXBwZW5kQ2hpbGQsXG4gIHJlbW92ZUNoaWxkOiByZW1vdmVDaGlsZCxcbiAgaW5zZXJ0QmVmb3JlOiBpbnNlcnRCZWZvcmUsXG4gIHBhcmVudE5vZGU6IHBhcmVudE5vZGUsXG4gIG5leHRTaWJsaW5nOiBuZXh0U2libGluZyxcbiAgdGFnTmFtZTogdGFnTmFtZSxcbiAgc2V0VGV4dENvbnRlbnQ6IHNldFRleHRDb250ZW50XG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSB7XG4gIGFycmF5OiBBcnJheS5pc0FycmF5LFxuICBwcmltaXRpdmU6IGZ1bmN0aW9uKHMpIHsgcmV0dXJuIHR5cGVvZiBzID09PSAnc3RyaW5nJyB8fCB0eXBlb2YgcyA9PT0gJ251bWJlcic7IH0sXG59O1xuIiwidmFyIGJvb2xlYW5BdHRycyA9IFtcImFsbG93ZnVsbHNjcmVlblwiLCBcImFzeW5jXCIsIFwiYXV0b2ZvY3VzXCIsIFwiYXV0b3BsYXlcIiwgXCJjaGVja2VkXCIsIFwiY29tcGFjdFwiLCBcImNvbnRyb2xzXCIsIFwiZGVjbGFyZVwiLCBcbiAgICAgICAgICAgICAgICBcImRlZmF1bHRcIiwgXCJkZWZhdWx0Y2hlY2tlZFwiLCBcImRlZmF1bHRtdXRlZFwiLCBcImRlZmF1bHRzZWxlY3RlZFwiLCBcImRlZmVyXCIsIFwiZGlzYWJsZWRcIiwgXCJkcmFnZ2FibGVcIiwgXG4gICAgICAgICAgICAgICAgXCJlbmFibGVkXCIsIFwiZm9ybW5vdmFsaWRhdGVcIiwgXCJoaWRkZW5cIiwgXCJpbmRldGVybWluYXRlXCIsIFwiaW5lcnRcIiwgXCJpc21hcFwiLCBcIml0ZW1zY29wZVwiLCBcImxvb3BcIiwgXCJtdWx0aXBsZVwiLCBcbiAgICAgICAgICAgICAgICBcIm11dGVkXCIsIFwibm9ocmVmXCIsIFwibm9yZXNpemVcIiwgXCJub3NoYWRlXCIsIFwibm92YWxpZGF0ZVwiLCBcIm5vd3JhcFwiLCBcIm9wZW5cIiwgXCJwYXVzZW9uZXhpdFwiLCBcInJlYWRvbmx5XCIsIFxuICAgICAgICAgICAgICAgIFwicmVxdWlyZWRcIiwgXCJyZXZlcnNlZFwiLCBcInNjb3BlZFwiLCBcInNlYW1sZXNzXCIsIFwic2VsZWN0ZWRcIiwgXCJzb3J0YWJsZVwiLCBcInNwZWxsY2hlY2tcIiwgXCJ0cmFuc2xhdGVcIiwgXG4gICAgICAgICAgICAgICAgXCJ0cnVlc3BlZWRcIiwgXCJ0eXBlbXVzdG1hdGNoXCIsIFwidmlzaWJsZVwiXTtcbiAgICBcbnZhciBib29sZWFuQXR0cnNEaWN0ID0ge307XG5mb3IodmFyIGk9MCwgbGVuID0gYm9vbGVhbkF0dHJzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gIGJvb2xlYW5BdHRyc0RpY3RbYm9vbGVhbkF0dHJzW2ldXSA9IHRydWU7XG59XG4gICAgXG5mdW5jdGlvbiB1cGRhdGVBdHRycyhvbGRWbm9kZSwgdm5vZGUpIHtcbiAgdmFyIGtleSwgY3VyLCBvbGQsIGVsbSA9IHZub2RlLmVsbSxcbiAgICAgIG9sZEF0dHJzID0gb2xkVm5vZGUuZGF0YS5hdHRycyB8fCB7fSwgYXR0cnMgPSB2bm9kZS5kYXRhLmF0dHJzIHx8IHt9O1xuICBcbiAgLy8gdXBkYXRlIG1vZGlmaWVkIGF0dHJpYnV0ZXMsIGFkZCBuZXcgYXR0cmlidXRlc1xuICBmb3IgKGtleSBpbiBhdHRycykge1xuICAgIGN1ciA9IGF0dHJzW2tleV07XG4gICAgb2xkID0gb2xkQXR0cnNba2V5XTtcbiAgICBpZiAob2xkICE9PSBjdXIpIHtcbiAgICAgIC8vIFRPRE86IGFkZCBzdXBwb3J0IHRvIG5hbWVzcGFjZWQgYXR0cmlidXRlcyAoc2V0QXR0cmlidXRlTlMpXG4gICAgICBpZighY3VyICYmIGJvb2xlYW5BdHRyc0RpY3Rba2V5XSlcbiAgICAgICAgZWxtLnJlbW92ZUF0dHJpYnV0ZShrZXkpO1xuICAgICAgZWxzZVxuICAgICAgICBlbG0uc2V0QXR0cmlidXRlKGtleSwgY3VyKTtcbiAgICB9XG4gIH1cbiAgLy9yZW1vdmUgcmVtb3ZlZCBhdHRyaWJ1dGVzXG4gIC8vIHVzZSBgaW5gIG9wZXJhdG9yIHNpbmNlIHRoZSBwcmV2aW91cyBgZm9yYCBpdGVyYXRpb24gdXNlcyBpdCAoLmkuZS4gYWRkIGV2ZW4gYXR0cmlidXRlcyB3aXRoIHVuZGVmaW5lZCB2YWx1ZSlcbiAgLy8gdGhlIG90aGVyIG9wdGlvbiBpcyB0byByZW1vdmUgYWxsIGF0dHJpYnV0ZXMgd2l0aCB2YWx1ZSA9PSB1bmRlZmluZWRcbiAgZm9yIChrZXkgaW4gb2xkQXR0cnMpIHtcbiAgICBpZiAoIShrZXkgaW4gYXR0cnMpKSB7XG4gICAgICBlbG0ucmVtb3ZlQXR0cmlidXRlKGtleSk7XG4gICAgfVxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge2NyZWF0ZTogdXBkYXRlQXR0cnMsIHVwZGF0ZTogdXBkYXRlQXR0cnN9O1xuIiwiZnVuY3Rpb24gdXBkYXRlQ2xhc3Mob2xkVm5vZGUsIHZub2RlKSB7XG4gIHZhciBjdXIsIG5hbWUsIGVsbSA9IHZub2RlLmVsbSxcbiAgICAgIG9sZENsYXNzID0gb2xkVm5vZGUuZGF0YS5jbGFzcyB8fCB7fSxcbiAgICAgIGtsYXNzID0gdm5vZGUuZGF0YS5jbGFzcyB8fCB7fTtcbiAgZm9yIChuYW1lIGluIG9sZENsYXNzKSB7XG4gICAgaWYgKCFrbGFzc1tuYW1lXSkge1xuICAgICAgZWxtLmNsYXNzTGlzdC5yZW1vdmUobmFtZSk7XG4gICAgfVxuICB9XG4gIGZvciAobmFtZSBpbiBrbGFzcykge1xuICAgIGN1ciA9IGtsYXNzW25hbWVdO1xuICAgIGlmIChjdXIgIT09IG9sZENsYXNzW25hbWVdKSB7XG4gICAgICBlbG0uY2xhc3NMaXN0W2N1ciA/ICdhZGQnIDogJ3JlbW92ZSddKG5hbWUpO1xuICAgIH1cbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtjcmVhdGU6IHVwZGF0ZUNsYXNzLCB1cGRhdGU6IHVwZGF0ZUNsYXNzfTtcbiIsInZhciBpcyA9IHJlcXVpcmUoJy4uL2lzJyk7XG5cbmZ1bmN0aW9uIGFyckludm9rZXIoYXJyKSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAvLyBTcGVjaWFsIGNhc2Ugd2hlbiBsZW5ndGggaXMgdHdvLCBmb3IgcGVyZm9ybWFuY2VcbiAgICBhcnIubGVuZ3RoID09PSAyID8gYXJyWzBdKGFyclsxXSkgOiBhcnJbMF0uYXBwbHkodW5kZWZpbmVkLCBhcnIuc2xpY2UoMSkpO1xuICB9O1xufVxuXG5mdW5jdGlvbiBmbkludm9rZXIobykge1xuICByZXR1cm4gZnVuY3Rpb24oZXYpIHsgby5mbihldik7IH07XG59XG5cbmZ1bmN0aW9uIHVwZGF0ZUV2ZW50TGlzdGVuZXJzKG9sZFZub2RlLCB2bm9kZSkge1xuICB2YXIgbmFtZSwgY3VyLCBvbGQsIGVsbSA9IHZub2RlLmVsbSxcbiAgICAgIG9sZE9uID0gb2xkVm5vZGUuZGF0YS5vbiB8fCB7fSwgb24gPSB2bm9kZS5kYXRhLm9uO1xuICBpZiAoIW9uKSByZXR1cm47XG4gIGZvciAobmFtZSBpbiBvbikge1xuICAgIGN1ciA9IG9uW25hbWVdO1xuICAgIG9sZCA9IG9sZE9uW25hbWVdO1xuICAgIGlmIChvbGQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgaWYgKGlzLmFycmF5KGN1cikpIHtcbiAgICAgICAgZWxtLmFkZEV2ZW50TGlzdGVuZXIobmFtZSwgYXJySW52b2tlcihjdXIpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGN1ciA9IHtmbjogY3VyfTtcbiAgICAgICAgb25bbmFtZV0gPSBjdXI7XG4gICAgICAgIGVsbS5hZGRFdmVudExpc3RlbmVyKG5hbWUsIGZuSW52b2tlcihjdXIpKTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGlzLmFycmF5KG9sZCkpIHtcbiAgICAgIC8vIERlbGliZXJhdGVseSBtb2RpZnkgb2xkIGFycmF5IHNpbmNlIGl0J3MgY2FwdHVyZWQgaW4gY2xvc3VyZSBjcmVhdGVkIHdpdGggYGFyckludm9rZXJgXG4gICAgICBvbGQubGVuZ3RoID0gY3VyLmxlbmd0aDtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgb2xkLmxlbmd0aDsgKytpKSBvbGRbaV0gPSBjdXJbaV07XG4gICAgICBvbltuYW1lXSAgPSBvbGQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIG9sZC5mbiA9IGN1cjtcbiAgICAgIG9uW25hbWVdID0gb2xkO1xuICAgIH1cbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtjcmVhdGU6IHVwZGF0ZUV2ZW50TGlzdGVuZXJzLCB1cGRhdGU6IHVwZGF0ZUV2ZW50TGlzdGVuZXJzfTtcbiIsInZhciByYWYgPSAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgJiYgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSkgfHwgc2V0VGltZW91dDtcbnZhciBuZXh0RnJhbWUgPSBmdW5jdGlvbihmbikgeyByYWYoZnVuY3Rpb24oKSB7IHJhZihmbik7IH0pOyB9O1xuXG5mdW5jdGlvbiBzZXROZXh0RnJhbWUob2JqLCBwcm9wLCB2YWwpIHtcbiAgbmV4dEZyYW1lKGZ1bmN0aW9uKCkgeyBvYmpbcHJvcF0gPSB2YWw7IH0pO1xufVxuXG5mdW5jdGlvbiBnZXRUZXh0Tm9kZVJlY3QodGV4dE5vZGUpIHtcbiAgdmFyIHJlY3Q7XG4gIGlmIChkb2N1bWVudC5jcmVhdGVSYW5nZSkge1xuICAgIHZhciByYW5nZSA9IGRvY3VtZW50LmNyZWF0ZVJhbmdlKCk7XG4gICAgcmFuZ2Uuc2VsZWN0Tm9kZUNvbnRlbnRzKHRleHROb2RlKTtcbiAgICBpZiAocmFuZ2UuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KSB7XG4gICAgICAgIHJlY3QgPSByYW5nZS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHJlY3Q7XG59XG5cbmZ1bmN0aW9uIGNhbGNUcmFuc2Zvcm1PcmlnaW4oaXNUZXh0Tm9kZSwgdGV4dFJlY3QsIGJvdW5kaW5nUmVjdCkge1xuICBpZiAoaXNUZXh0Tm9kZSkge1xuICAgIGlmICh0ZXh0UmVjdCkge1xuICAgICAgLy9jYWxjdWxhdGUgcGl4ZWxzIHRvIGNlbnRlciBvZiB0ZXh0IGZyb20gbGVmdCBlZGdlIG9mIGJvdW5kaW5nIGJveFxuICAgICAgdmFyIHJlbGF0aXZlQ2VudGVyWCA9IHRleHRSZWN0LmxlZnQgKyB0ZXh0UmVjdC53aWR0aC8yIC0gYm91bmRpbmdSZWN0LmxlZnQ7XG4gICAgICB2YXIgcmVsYXRpdmVDZW50ZXJZID0gdGV4dFJlY3QudG9wICsgdGV4dFJlY3QuaGVpZ2h0LzIgLSBib3VuZGluZ1JlY3QudG9wO1xuICAgICAgcmV0dXJuIHJlbGF0aXZlQ2VudGVyWCArICdweCAnICsgcmVsYXRpdmVDZW50ZXJZICsgJ3B4JztcbiAgICB9XG4gIH1cbiAgcmV0dXJuICcwIDAnOyAvL3RvcCBsZWZ0XG59XG5cbmZ1bmN0aW9uIGdldFRleHREeChvbGRUZXh0UmVjdCwgbmV3VGV4dFJlY3QpIHtcbiAgaWYgKG9sZFRleHRSZWN0ICYmIG5ld1RleHRSZWN0KSB7XG4gICAgcmV0dXJuICgob2xkVGV4dFJlY3QubGVmdCArIG9sZFRleHRSZWN0LndpZHRoLzIpIC0gKG5ld1RleHRSZWN0LmxlZnQgKyBuZXdUZXh0UmVjdC53aWR0aC8yKSk7XG4gIH1cbiAgcmV0dXJuIDA7XG59XG5mdW5jdGlvbiBnZXRUZXh0RHkob2xkVGV4dFJlY3QsIG5ld1RleHRSZWN0KSB7XG4gIGlmIChvbGRUZXh0UmVjdCAmJiBuZXdUZXh0UmVjdCkge1xuICAgIHJldHVybiAoKG9sZFRleHRSZWN0LnRvcCArIG9sZFRleHRSZWN0LmhlaWdodC8yKSAtIChuZXdUZXh0UmVjdC50b3AgKyBuZXdUZXh0UmVjdC5oZWlnaHQvMikpO1xuICB9XG4gIHJldHVybiAwO1xufVxuXG5mdW5jdGlvbiBpc1RleHRFbGVtZW50KGVsbSkge1xuICByZXR1cm4gZWxtLmNoaWxkTm9kZXMubGVuZ3RoID09PSAxICYmIGVsbS5jaGlsZE5vZGVzWzBdLm5vZGVUeXBlID09PSAzO1xufVxuXG52YXIgcmVtb3ZlZCwgY3JlYXRlZDtcblxuZnVuY3Rpb24gcHJlKG9sZFZub2RlLCB2bm9kZSkge1xuICByZW1vdmVkID0ge307XG4gIGNyZWF0ZWQgPSBbXTtcbn1cblxuZnVuY3Rpb24gY3JlYXRlKG9sZFZub2RlLCB2bm9kZSkge1xuICB2YXIgaGVybyA9IHZub2RlLmRhdGEuaGVybztcbiAgaWYgKGhlcm8gJiYgaGVyby5pZCkge1xuICAgIGNyZWF0ZWQucHVzaChoZXJvLmlkKTtcbiAgICBjcmVhdGVkLnB1c2godm5vZGUpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGRlc3Ryb3kodm5vZGUpIHtcbiAgdmFyIGhlcm8gPSB2bm9kZS5kYXRhLmhlcm87XG4gIGlmIChoZXJvICYmIGhlcm8uaWQpIHtcbiAgICB2YXIgZWxtID0gdm5vZGUuZWxtO1xuICAgIHZub2RlLmlzVGV4dE5vZGUgPSBpc1RleHRFbGVtZW50KGVsbSk7IC8vaXMgdGhpcyBhIHRleHQgbm9kZT9cbiAgICB2bm9kZS5ib3VuZGluZ1JlY3QgPSBlbG0uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7IC8vc2F2ZSB0aGUgYm91bmRpbmcgcmVjdGFuZ2xlIHRvIGEgbmV3IHByb3BlcnR5IG9uIHRoZSB2bm9kZVxuICAgIHZub2RlLnRleHRSZWN0ID0gdm5vZGUuaXNUZXh0Tm9kZSA/IGdldFRleHROb2RlUmVjdChlbG0uY2hpbGROb2Rlc1swXSkgOiBudWxsOyAvL3NhdmUgYm91bmRpbmcgcmVjdCBvZiBpbm5lciB0ZXh0IG5vZGVcbiAgICB2YXIgY29tcHV0ZWRTdHlsZSA9IHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKGVsbSwgbnVsbCk7IC8vZ2V0IGN1cnJlbnQgc3R5bGVzIChpbmNsdWRlcyBpbmhlcml0ZWQgcHJvcGVydGllcylcbiAgICB2bm9kZS5zYXZlZFN0eWxlID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShjb21wdXRlZFN0eWxlKSk7IC8vc2F2ZSBhIGNvcHkgb2YgY29tcHV0ZWQgc3R5bGUgdmFsdWVzXG4gICAgcmVtb3ZlZFtoZXJvLmlkXSA9IHZub2RlO1xuICB9XG59XG5cbmZ1bmN0aW9uIHBvc3QoKSB7XG4gIHZhciBpLCBpZCwgbmV3RWxtLCBvbGRWbm9kZSwgb2xkRWxtLCBoUmF0aW8sIHdSYXRpbyxcbiAgICAgIG9sZFJlY3QsIG5ld1JlY3QsIGR4LCBkeSwgb3JpZ1RyYW5zZm9ybSwgb3JpZ1RyYW5zaXRpb24sXG4gICAgICBuZXdTdHlsZSwgb2xkU3R5bGUsIG5ld0NvbXB1dGVkU3R5bGUsIGlzVGV4dE5vZGUsXG4gICAgICBuZXdUZXh0UmVjdCwgb2xkVGV4dFJlY3Q7XG4gIGZvciAoaSA9IDA7IGkgPCBjcmVhdGVkLmxlbmd0aDsgaSArPSAyKSB7XG4gICAgaWQgPSBjcmVhdGVkW2ldO1xuICAgIG5ld0VsbSA9IGNyZWF0ZWRbaSsxXS5lbG07XG4gICAgb2xkVm5vZGUgPSByZW1vdmVkW2lkXTtcbiAgICBpZiAob2xkVm5vZGUpIHtcbiAgICAgIGlzVGV4dE5vZGUgPSBvbGRWbm9kZS5pc1RleHROb2RlICYmIGlzVGV4dEVsZW1lbnQobmV3RWxtKTsgLy9BcmUgb2xkICYgbmV3IGJvdGggdGV4dD9cbiAgICAgIG5ld1N0eWxlID0gbmV3RWxtLnN0eWxlO1xuICAgICAgbmV3Q29tcHV0ZWRTdHlsZSA9IHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKG5ld0VsbSwgbnVsbCk7IC8vZ2V0IGZ1bGwgY29tcHV0ZWQgc3R5bGUgZm9yIG5ldyBlbGVtZW50XG4gICAgICBvbGRFbG0gPSBvbGRWbm9kZS5lbG07XG4gICAgICBvbGRTdHlsZSA9IG9sZEVsbS5zdHlsZTtcbiAgICAgIC8vT3ZlcmFsbCBlbGVtZW50IGJvdW5kaW5nIGJveGVzXG4gICAgICBuZXdSZWN0ID0gbmV3RWxtLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgICAgb2xkUmVjdCA9IG9sZFZub2RlLmJvdW5kaW5nUmVjdDsgLy9wcmV2aW91c2x5IHNhdmVkIGJvdW5kaW5nIHJlY3RcbiAgICAgIC8vVGV4dCBub2RlIGJvdW5kaW5nIGJveGVzICYgZGlzdGFuY2VzXG4gICAgICBpZiAoaXNUZXh0Tm9kZSkge1xuICAgICAgICBuZXdUZXh0UmVjdCA9IGdldFRleHROb2RlUmVjdChuZXdFbG0uY2hpbGROb2Rlc1swXSk7XG4gICAgICAgIG9sZFRleHRSZWN0ID0gb2xkVm5vZGUudGV4dFJlY3Q7XG4gICAgICAgIGR4ID0gZ2V0VGV4dER4KG9sZFRleHRSZWN0LCBuZXdUZXh0UmVjdCk7XG4gICAgICAgIGR5ID0gZ2V0VGV4dER5KG9sZFRleHRSZWN0LCBuZXdUZXh0UmVjdCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvL0NhbGN1bGF0ZSBkaXN0YW5jZXMgYmV0d2VlbiBvbGQgJiBuZXcgcG9zaXRpb25zXG4gICAgICAgIGR4ID0gb2xkUmVjdC5sZWZ0IC0gbmV3UmVjdC5sZWZ0O1xuICAgICAgICBkeSA9IG9sZFJlY3QudG9wIC0gbmV3UmVjdC50b3A7XG4gICAgICB9XG4gICAgICBoUmF0aW8gPSBuZXdSZWN0LmhlaWdodCAvIChNYXRoLm1heChvbGRSZWN0LmhlaWdodCwgMSkpO1xuICAgICAgd1JhdGlvID0gaXNUZXh0Tm9kZSA/IGhSYXRpbyA6IG5ld1JlY3Qud2lkdGggLyAoTWF0aC5tYXgob2xkUmVjdC53aWR0aCwgMSkpOyAvL3RleHQgc2NhbGVzIGJhc2VkIG9uIGhSYXRpb1xuICAgICAgLy8gQW5pbWF0ZSBuZXcgZWxlbWVudFxuICAgICAgb3JpZ1RyYW5zZm9ybSA9IG5ld1N0eWxlLnRyYW5zZm9ybTtcbiAgICAgIG9yaWdUcmFuc2l0aW9uID0gbmV3U3R5bGUudHJhbnNpdGlvbjtcbiAgICAgIGlmIChuZXdDb21wdXRlZFN0eWxlLmRpc3BsYXkgPT09ICdpbmxpbmUnKSAvL2lubGluZSBlbGVtZW50cyBjYW5ub3QgYmUgdHJhbnNmb3JtZWRcbiAgICAgICAgbmV3U3R5bGUuZGlzcGxheSA9ICdpbmxpbmUtYmxvY2snOyAgICAgICAgLy90aGlzIGRvZXMgbm90IGFwcGVhciB0byBoYXZlIGFueSBuZWdhdGl2ZSBzaWRlIGVmZmVjdHNcbiAgICAgIG5ld1N0eWxlLnRyYW5zaXRpb24gPSBvcmlnVHJhbnNpdGlvbiArICd0cmFuc2Zvcm0gMHMnO1xuICAgICAgbmV3U3R5bGUudHJhbnNmb3JtT3JpZ2luID0gY2FsY1RyYW5zZm9ybU9yaWdpbihpc1RleHROb2RlLCBuZXdUZXh0UmVjdCwgbmV3UmVjdCk7XG4gICAgICBuZXdTdHlsZS5vcGFjaXR5ID0gJzAnO1xuICAgICAgbmV3U3R5bGUudHJhbnNmb3JtID0gb3JpZ1RyYW5zZm9ybSArICd0cmFuc2xhdGUoJytkeCsncHgsICcrZHkrJ3B4KSAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnc2NhbGUoJysxL3dSYXRpbysnLCAnKzEvaFJhdGlvKycpJztcbiAgICAgIHNldE5leHRGcmFtZShuZXdTdHlsZSwgJ3RyYW5zaXRpb24nLCBvcmlnVHJhbnNpdGlvbik7XG4gICAgICBzZXROZXh0RnJhbWUobmV3U3R5bGUsICd0cmFuc2Zvcm0nLCBvcmlnVHJhbnNmb3JtKTtcbiAgICAgIHNldE5leHRGcmFtZShuZXdTdHlsZSwgJ29wYWNpdHknLCAnMScpO1xuICAgICAgLy8gQW5pbWF0ZSBvbGQgZWxlbWVudFxuICAgICAgZm9yICh2YXIga2V5IGluIG9sZFZub2RlLnNhdmVkU3R5bGUpIHsgLy9yZS1hcHBseSBzYXZlZCBpbmhlcml0ZWQgcHJvcGVydGllc1xuICAgICAgICBpZiAocGFyc2VJbnQoa2V5KSAhPSBrZXkpIHtcbiAgICAgICAgICB2YXIgbXMgPSBrZXkuc3Vic3RyaW5nKDAsMikgPT09ICdtcyc7XG4gICAgICAgICAgdmFyIG1veiA9IGtleS5zdWJzdHJpbmcoMCwzKSA9PT0gJ21veic7XG4gICAgICAgICAgdmFyIHdlYmtpdCA9IGtleS5zdWJzdHJpbmcoMCw2KSA9PT0gJ3dlYmtpdCc7XG4gICAgICBcdCAgaWYgKCFtcyAmJiAhbW96ICYmICF3ZWJraXQpIC8vaWdub3JlIHByZWZpeGVkIHN0eWxlIHByb3BlcnRpZXNcbiAgICAgICAgXHQgIG9sZFN0eWxlW2tleV0gPSBvbGRWbm9kZS5zYXZlZFN0eWxlW2tleV07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIG9sZFN0eWxlLnBvc2l0aW9uID0gJ2Fic29sdXRlJztcbiAgICAgIG9sZFN0eWxlLnRvcCA9IG9sZFJlY3QudG9wICsgJ3B4JzsgLy9zdGFydCBhdCBleGlzdGluZyBwb3NpdGlvblxuICAgICAgb2xkU3R5bGUubGVmdCA9IG9sZFJlY3QubGVmdCArICdweCc7XG4gICAgICBvbGRTdHlsZS53aWR0aCA9IG9sZFJlY3Qud2lkdGggKyAncHgnOyAvL05lZWRlZCBmb3IgZWxlbWVudHMgd2hvIHdlcmUgc2l6ZWQgcmVsYXRpdmUgdG8gdGhlaXIgcGFyZW50c1xuICAgICAgb2xkU3R5bGUuaGVpZ2h0ID0gb2xkUmVjdC5oZWlnaHQgKyAncHgnOyAvL05lZWRlZCBmb3IgZWxlbWVudHMgd2hvIHdlcmUgc2l6ZWQgcmVsYXRpdmUgdG8gdGhlaXIgcGFyZW50c1xuICAgICAgb2xkU3R5bGUubWFyZ2luID0gMDsgLy9NYXJnaW4gb24gaGVybyBlbGVtZW50IGxlYWRzIHRvIGluY29ycmVjdCBwb3NpdGlvbmluZ1xuICAgICAgb2xkU3R5bGUudHJhbnNmb3JtT3JpZ2luID0gY2FsY1RyYW5zZm9ybU9yaWdpbihpc1RleHROb2RlLCBvbGRUZXh0UmVjdCwgb2xkUmVjdCk7XG4gICAgICBvbGRTdHlsZS50cmFuc2Zvcm0gPSAnJztcbiAgICAgIG9sZFN0eWxlLm9wYWNpdHkgPSAnMSc7XG4gICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKG9sZEVsbSk7XG4gICAgICBzZXROZXh0RnJhbWUob2xkU3R5bGUsICd0cmFuc2Zvcm0nLCAndHJhbnNsYXRlKCcrIC1keCArJ3B4LCAnKyAtZHkgKydweCkgc2NhbGUoJyt3UmF0aW8rJywgJytoUmF0aW8rJyknKTsgLy9zY2FsZSBtdXN0IGJlIG9uIGZhciByaWdodCBmb3IgdHJhbnNsYXRlIHRvIGJlIGNvcnJlY3RcbiAgICAgIHNldE5leHRGcmFtZShvbGRTdHlsZSwgJ29wYWNpdHknLCAnMCcpO1xuICAgICAgb2xkRWxtLmFkZEV2ZW50TGlzdGVuZXIoJ3RyYW5zaXRpb25lbmQnLCBmdW5jdGlvbihldikge1xuICAgICAgICBpZiAoZXYucHJvcGVydHlOYW1lID09PSAndHJhbnNmb3JtJylcbiAgICAgICAgICBkb2N1bWVudC5ib2R5LnJlbW92ZUNoaWxkKGV2LnRhcmdldCk7XG4gICAgICB9KTtcbiAgICB9XG4gIH1cbiAgcmVtb3ZlZCA9IGNyZWF0ZWQgPSB1bmRlZmluZWQ7XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge3ByZTogcHJlLCBjcmVhdGU6IGNyZWF0ZSwgZGVzdHJveTogZGVzdHJveSwgcG9zdDogcG9zdH07XG4iLCJmdW5jdGlvbiB1cGRhdGVQcm9wcyhvbGRWbm9kZSwgdm5vZGUpIHtcbiAgdmFyIGtleSwgY3VyLCBvbGQsIGVsbSA9IHZub2RlLmVsbSxcbiAgICAgIG9sZFByb3BzID0gb2xkVm5vZGUuZGF0YS5wcm9wcyB8fCB7fSwgcHJvcHMgPSB2bm9kZS5kYXRhLnByb3BzIHx8IHt9O1xuICBmb3IgKGtleSBpbiBvbGRQcm9wcykge1xuICAgIGlmICghcHJvcHNba2V5XSkge1xuICAgICAgZGVsZXRlIGVsbVtrZXldO1xuICAgIH1cbiAgfVxuICBmb3IgKGtleSBpbiBwcm9wcykge1xuICAgIGN1ciA9IHByb3BzW2tleV07XG4gICAgb2xkID0gb2xkUHJvcHNba2V5XTtcbiAgICBpZiAob2xkICE9PSBjdXIgJiYgKGtleSAhPT0gJ3ZhbHVlJyB8fCBlbG1ba2V5XSAhPT0gY3VyKSkge1xuICAgICAgZWxtW2tleV0gPSBjdXI7XG4gICAgfVxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge2NyZWF0ZTogdXBkYXRlUHJvcHMsIHVwZGF0ZTogdXBkYXRlUHJvcHN9O1xuIiwidmFyIHJhZiA9ICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyAmJiB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKSB8fCBzZXRUaW1lb3V0O1xudmFyIG5leHRGcmFtZSA9IGZ1bmN0aW9uKGZuKSB7IHJhZihmdW5jdGlvbigpIHsgcmFmKGZuKTsgfSk7IH07XG5cbmZ1bmN0aW9uIHNldE5leHRGcmFtZShvYmosIHByb3AsIHZhbCkge1xuICBuZXh0RnJhbWUoZnVuY3Rpb24oKSB7IG9ialtwcm9wXSA9IHZhbDsgfSk7XG59XG5cbmZ1bmN0aW9uIHVwZGF0ZVN0eWxlKG9sZFZub2RlLCB2bm9kZSkge1xuICB2YXIgY3VyLCBuYW1lLCBlbG0gPSB2bm9kZS5lbG0sXG4gICAgICBvbGRTdHlsZSA9IG9sZFZub2RlLmRhdGEuc3R5bGUgfHwge30sXG4gICAgICBzdHlsZSA9IHZub2RlLmRhdGEuc3R5bGUgfHwge30sXG4gICAgICBvbGRIYXNEZWwgPSAnZGVsYXllZCcgaW4gb2xkU3R5bGU7XG4gIGZvciAobmFtZSBpbiBvbGRTdHlsZSkge1xuICAgIGlmICghc3R5bGVbbmFtZV0pIHtcbiAgICAgIGVsbS5zdHlsZVtuYW1lXSA9ICcnO1xuICAgIH1cbiAgfVxuICBmb3IgKG5hbWUgaW4gc3R5bGUpIHtcbiAgICBjdXIgPSBzdHlsZVtuYW1lXTtcbiAgICBpZiAobmFtZSA9PT0gJ2RlbGF5ZWQnKSB7XG4gICAgICBmb3IgKG5hbWUgaW4gc3R5bGUuZGVsYXllZCkge1xuICAgICAgICBjdXIgPSBzdHlsZS5kZWxheWVkW25hbWVdO1xuICAgICAgICBpZiAoIW9sZEhhc0RlbCB8fCBjdXIgIT09IG9sZFN0eWxlLmRlbGF5ZWRbbmFtZV0pIHtcbiAgICAgICAgICBzZXROZXh0RnJhbWUoZWxtLnN0eWxlLCBuYW1lLCBjdXIpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChuYW1lICE9PSAncmVtb3ZlJyAmJiBjdXIgIT09IG9sZFN0eWxlW25hbWVdKSB7XG4gICAgICBlbG0uc3R5bGVbbmFtZV0gPSBjdXI7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGFwcGx5RGVzdHJveVN0eWxlKHZub2RlKSB7XG4gIHZhciBzdHlsZSwgbmFtZSwgZWxtID0gdm5vZGUuZWxtLCBzID0gdm5vZGUuZGF0YS5zdHlsZTtcbiAgaWYgKCFzIHx8ICEoc3R5bGUgPSBzLmRlc3Ryb3kpKSByZXR1cm47XG4gIGZvciAobmFtZSBpbiBzdHlsZSkge1xuICAgIGVsbS5zdHlsZVtuYW1lXSA9IHN0eWxlW25hbWVdO1xuICB9XG59XG5cbmZ1bmN0aW9uIGFwcGx5UmVtb3ZlU3R5bGUodm5vZGUsIHJtKSB7XG4gIHZhciBzID0gdm5vZGUuZGF0YS5zdHlsZTtcbiAgaWYgKCFzIHx8ICFzLnJlbW92ZSkge1xuICAgIHJtKCk7XG4gICAgcmV0dXJuO1xuICB9XG4gIHZhciBuYW1lLCBlbG0gPSB2bm9kZS5lbG0sIGlkeCwgaSA9IDAsIG1heER1ciA9IDAsXG4gICAgICBjb21wU3R5bGUsIHN0eWxlID0gcy5yZW1vdmUsIGFtb3VudCA9IDAsIGFwcGxpZWQgPSBbXTtcbiAgZm9yIChuYW1lIGluIHN0eWxlKSB7XG4gICAgYXBwbGllZC5wdXNoKG5hbWUpO1xuICAgIGVsbS5zdHlsZVtuYW1lXSA9IHN0eWxlW25hbWVdO1xuICB9XG4gIGNvbXBTdHlsZSA9IGdldENvbXB1dGVkU3R5bGUoZWxtKTtcbiAgdmFyIHByb3BzID0gY29tcFN0eWxlWyd0cmFuc2l0aW9uLXByb3BlcnR5J10uc3BsaXQoJywgJyk7XG4gIGZvciAoOyBpIDwgcHJvcHMubGVuZ3RoOyArK2kpIHtcbiAgICBpZihhcHBsaWVkLmluZGV4T2YocHJvcHNbaV0pICE9PSAtMSkgYW1vdW50Kys7XG4gIH1cbiAgZWxtLmFkZEV2ZW50TGlzdGVuZXIoJ3RyYW5zaXRpb25lbmQnLCBmdW5jdGlvbihldikge1xuICAgIGlmIChldi50YXJnZXQgPT09IGVsbSkgLS1hbW91bnQ7XG4gICAgaWYgKGFtb3VudCA9PT0gMCkgcm0oKTtcbiAgfSk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge2NyZWF0ZTogdXBkYXRlU3R5bGUsIHVwZGF0ZTogdXBkYXRlU3R5bGUsIGRlc3Ryb3k6IGFwcGx5RGVzdHJveVN0eWxlLCByZW1vdmU6IGFwcGx5UmVtb3ZlU3R5bGV9O1xuIiwiLy8ganNoaW50IG5ld2NhcDogZmFsc2Vcbi8qIGdsb2JhbCByZXF1aXJlLCBtb2R1bGUsIGRvY3VtZW50LCBOb2RlICovXG4ndXNlIHN0cmljdCc7XG5cbnZhciBWTm9kZSA9IHJlcXVpcmUoJy4vdm5vZGUnKTtcbnZhciBpcyA9IHJlcXVpcmUoJy4vaXMnKTtcbnZhciBkb21BcGkgPSByZXF1aXJlKCcuL2h0bWxkb21hcGkuanMnKTtcblxuZnVuY3Rpb24gaXNVbmRlZihzKSB7IHJldHVybiBzID09PSB1bmRlZmluZWQ7IH1cbmZ1bmN0aW9uIGlzRGVmKHMpIHsgcmV0dXJuIHMgIT09IHVuZGVmaW5lZDsgfVxuXG52YXIgZW1wdHlOb2RlID0gVk5vZGUoJycsIHt9LCBbXSwgdW5kZWZpbmVkLCB1bmRlZmluZWQpO1xuXG5mdW5jdGlvbiBzYW1lVm5vZGUodm5vZGUxLCB2bm9kZTIpIHtcbiAgcmV0dXJuIHZub2RlMS5rZXkgPT09IHZub2RlMi5rZXkgJiYgdm5vZGUxLnNlbCA9PT0gdm5vZGUyLnNlbDtcbn1cblxuZnVuY3Rpb24gY3JlYXRlS2V5VG9PbGRJZHgoY2hpbGRyZW4sIGJlZ2luSWR4LCBlbmRJZHgpIHtcbiAgdmFyIGksIG1hcCA9IHt9LCBrZXk7XG4gIGZvciAoaSA9IGJlZ2luSWR4OyBpIDw9IGVuZElkeDsgKytpKSB7XG4gICAga2V5ID0gY2hpbGRyZW5baV0ua2V5O1xuICAgIGlmIChpc0RlZihrZXkpKSBtYXBba2V5XSA9IGk7XG4gIH1cbiAgcmV0dXJuIG1hcDtcbn1cblxudmFyIGhvb2tzID0gWydjcmVhdGUnLCAndXBkYXRlJywgJ3JlbW92ZScsICdkZXN0cm95JywgJ3ByZScsICdwb3N0J107XG5cbmZ1bmN0aW9uIGluaXQobW9kdWxlcywgYXBpKSB7XG4gIHZhciBpLCBqLCBjYnMgPSB7fTtcblxuICBpZiAoaXNVbmRlZihhcGkpKSBhcGkgPSBkb21BcGk7XG5cbiAgZm9yIChpID0gMDsgaSA8IGhvb2tzLmxlbmd0aDsgKytpKSB7XG4gICAgY2JzW2hvb2tzW2ldXSA9IFtdO1xuICAgIGZvciAoaiA9IDA7IGogPCBtb2R1bGVzLmxlbmd0aDsgKytqKSB7XG4gICAgICBpZiAobW9kdWxlc1tqXVtob29rc1tpXV0gIT09IHVuZGVmaW5lZCkgY2JzW2hvb2tzW2ldXS5wdXNoKG1vZHVsZXNbal1baG9va3NbaV1dKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBlbXB0eU5vZGVBdChlbG0pIHtcbiAgICByZXR1cm4gVk5vZGUoYXBpLnRhZ05hbWUoZWxtKS50b0xvd2VyQ2FzZSgpLCB7fSwgW10sIHVuZGVmaW5lZCwgZWxtKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNyZWF0ZVJtQ2IoY2hpbGRFbG0sIGxpc3RlbmVycykge1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIGlmICgtLWxpc3RlbmVycyA9PT0gMCkge1xuICAgICAgICB2YXIgcGFyZW50ID0gYXBpLnBhcmVudE5vZGUoY2hpbGRFbG0pO1xuICAgICAgICBhcGkucmVtb3ZlQ2hpbGQocGFyZW50LCBjaGlsZEVsbSk7XG4gICAgICB9XG4gICAgfTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNyZWF0ZUVsbSh2bm9kZSwgaW5zZXJ0ZWRWbm9kZVF1ZXVlKSB7XG4gICAgdmFyIGksIHRodW5rLCBkYXRhID0gdm5vZGUuZGF0YTtcbiAgICBpZiAoaXNEZWYoZGF0YSkpIHtcbiAgICAgIGlmIChpc0RlZihpID0gZGF0YS5ob29rKSAmJiBpc0RlZihpID0gaS5pbml0KSkgaSh2bm9kZSk7XG4gICAgICBpZiAoaXNEZWYoaSA9IGRhdGEudm5vZGUpKSB7XG4gICAgICAgICAgdGh1bmsgPSB2bm9kZTtcbiAgICAgICAgICB2bm9kZSA9IGk7XG4gICAgICB9XG4gICAgfVxuICAgIHZhciBlbG0sIGNoaWxkcmVuID0gdm5vZGUuY2hpbGRyZW4sIHNlbCA9IHZub2RlLnNlbDtcbiAgICBpZiAoaXNEZWYoc2VsKSkge1xuICAgICAgLy8gUGFyc2Ugc2VsZWN0b3JcbiAgICAgIHZhciBoYXNoSWR4ID0gc2VsLmluZGV4T2YoJyMnKTtcbiAgICAgIHZhciBkb3RJZHggPSBzZWwuaW5kZXhPZignLicsIGhhc2hJZHgpO1xuICAgICAgdmFyIGhhc2ggPSBoYXNoSWR4ID4gMCA/IGhhc2hJZHggOiBzZWwubGVuZ3RoO1xuICAgICAgdmFyIGRvdCA9IGRvdElkeCA+IDAgPyBkb3RJZHggOiBzZWwubGVuZ3RoO1xuICAgICAgdmFyIHRhZyA9IGhhc2hJZHggIT09IC0xIHx8IGRvdElkeCAhPT0gLTEgPyBzZWwuc2xpY2UoMCwgTWF0aC5taW4oaGFzaCwgZG90KSkgOiBzZWw7XG4gICAgICBlbG0gPSB2bm9kZS5lbG0gPSBpc0RlZihkYXRhKSAmJiBpc0RlZihpID0gZGF0YS5ucykgPyBhcGkuY3JlYXRlRWxlbWVudE5TKGksIHRhZylcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA6IGFwaS5jcmVhdGVFbGVtZW50KHRhZyk7XG4gICAgICBpZiAoaGFzaCA8IGRvdCkgZWxtLmlkID0gc2VsLnNsaWNlKGhhc2ggKyAxLCBkb3QpO1xuICAgICAgaWYgKGRvdElkeCA+IDApIGVsbS5jbGFzc05hbWUgPSBzZWwuc2xpY2UoZG90KzEpLnJlcGxhY2UoL1xcLi9nLCAnICcpO1xuICAgICAgaWYgKGlzLmFycmF5KGNoaWxkcmVuKSkge1xuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgY2hpbGRyZW4ubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICBhcGkuYXBwZW5kQ2hpbGQoZWxtLCBjcmVhdGVFbG0oY2hpbGRyZW5baV0sIGluc2VydGVkVm5vZGVRdWV1ZSkpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKGlzLnByaW1pdGl2ZSh2bm9kZS50ZXh0KSkge1xuICAgICAgICBhcGkuYXBwZW5kQ2hpbGQoZWxtLCBhcGkuY3JlYXRlVGV4dE5vZGUodm5vZGUudGV4dCkpO1xuICAgICAgfVxuICAgICAgZm9yIChpID0gMDsgaSA8IGNicy5jcmVhdGUubGVuZ3RoOyArK2kpIGNicy5jcmVhdGVbaV0oZW1wdHlOb2RlLCB2bm9kZSk7XG4gICAgICBpID0gdm5vZGUuZGF0YS5ob29rOyAvLyBSZXVzZSB2YXJpYWJsZVxuICAgICAgaWYgKGlzRGVmKGkpKSB7XG4gICAgICAgIGlmIChpLmNyZWF0ZSkgaS5jcmVhdGUoZW1wdHlOb2RlLCB2bm9kZSk7XG4gICAgICAgIGlmIChpLmluc2VydCkgaW5zZXJ0ZWRWbm9kZVF1ZXVlLnB1c2godm5vZGUpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBlbG0gPSB2bm9kZS5lbG0gPSBhcGkuY3JlYXRlVGV4dE5vZGUodm5vZGUudGV4dCk7XG4gICAgfVxuICAgIGlmIChpc0RlZih0aHVuaykpIHRodW5rLmVsbSA9IHZub2RlLmVsbTtcbiAgICByZXR1cm4gdm5vZGUuZWxtO1xuICB9XG5cbiAgZnVuY3Rpb24gYWRkVm5vZGVzKHBhcmVudEVsbSwgYmVmb3JlLCB2bm9kZXMsIHN0YXJ0SWR4LCBlbmRJZHgsIGluc2VydGVkVm5vZGVRdWV1ZSkge1xuICAgIGZvciAoOyBzdGFydElkeCA8PSBlbmRJZHg7ICsrc3RhcnRJZHgpIHtcbiAgICAgIGFwaS5pbnNlcnRCZWZvcmUocGFyZW50RWxtLCBjcmVhdGVFbG0odm5vZGVzW3N0YXJ0SWR4XSwgaW5zZXJ0ZWRWbm9kZVF1ZXVlKSwgYmVmb3JlKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBpbnZva2VEZXN0cm95SG9vayh2bm9kZSkge1xuICAgIHZhciBpLCBqLCBkYXRhID0gdm5vZGUuZGF0YTtcbiAgICBpZiAoaXNEZWYoZGF0YSkpIHtcbiAgICAgIGlmIChpc0RlZihpID0gZGF0YS5ob29rKSAmJiBpc0RlZihpID0gaS5kZXN0cm95KSkgaSh2bm9kZSk7XG4gICAgICBmb3IgKGkgPSAwOyBpIDwgY2JzLmRlc3Ryb3kubGVuZ3RoOyArK2kpIGNicy5kZXN0cm95W2ldKHZub2RlKTtcbiAgICAgIGlmIChpc0RlZihpID0gdm5vZGUuY2hpbGRyZW4pKSB7XG4gICAgICAgIGZvciAoaiA9IDA7IGogPCB2bm9kZS5jaGlsZHJlbi5sZW5ndGg7ICsraikge1xuICAgICAgICAgIGludm9rZURlc3Ryb3lIb29rKHZub2RlLmNoaWxkcmVuW2pdKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKGlzRGVmKGkgPSBkYXRhLnZub2RlKSkgaW52b2tlRGVzdHJveUhvb2soaSk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gcmVtb3ZlVm5vZGVzKHBhcmVudEVsbSwgdm5vZGVzLCBzdGFydElkeCwgZW5kSWR4KSB7XG4gICAgZm9yICg7IHN0YXJ0SWR4IDw9IGVuZElkeDsgKytzdGFydElkeCkge1xuICAgICAgdmFyIGksIGxpc3RlbmVycywgcm0sIGNoID0gdm5vZGVzW3N0YXJ0SWR4XTtcbiAgICAgIGlmIChpc0RlZihjaCkpIHtcbiAgICAgICAgaWYgKGlzRGVmKGNoLnNlbCkpIHtcbiAgICAgICAgICBpbnZva2VEZXN0cm95SG9vayhjaCk7XG4gICAgICAgICAgbGlzdGVuZXJzID0gY2JzLnJlbW92ZS5sZW5ndGggKyAxO1xuICAgICAgICAgIHJtID0gY3JlYXRlUm1DYihjaC5lbG0sIGxpc3RlbmVycyk7XG4gICAgICAgICAgZm9yIChpID0gMDsgaSA8IGNicy5yZW1vdmUubGVuZ3RoOyArK2kpIGNicy5yZW1vdmVbaV0oY2gsIHJtKTtcbiAgICAgICAgICBpZiAoaXNEZWYoaSA9IGNoLmRhdGEpICYmIGlzRGVmKGkgPSBpLmhvb2spICYmIGlzRGVmKGkgPSBpLnJlbW92ZSkpIHtcbiAgICAgICAgICAgIGkoY2gsIHJtKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcm0oKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7IC8vIFRleHQgbm9kZVxuICAgICAgICAgIGFwaS5yZW1vdmVDaGlsZChwYXJlbnRFbG0sIGNoLmVsbSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiB1cGRhdGVDaGlsZHJlbihwYXJlbnRFbG0sIG9sZENoLCBuZXdDaCwgaW5zZXJ0ZWRWbm9kZVF1ZXVlKSB7XG4gICAgdmFyIG9sZFN0YXJ0SWR4ID0gMCwgbmV3U3RhcnRJZHggPSAwO1xuICAgIHZhciBvbGRFbmRJZHggPSBvbGRDaC5sZW5ndGggLSAxO1xuICAgIHZhciBvbGRTdGFydFZub2RlID0gb2xkQ2hbMF07XG4gICAgdmFyIG9sZEVuZFZub2RlID0gb2xkQ2hbb2xkRW5kSWR4XTtcbiAgICB2YXIgbmV3RW5kSWR4ID0gbmV3Q2gubGVuZ3RoIC0gMTtcbiAgICB2YXIgbmV3U3RhcnRWbm9kZSA9IG5ld0NoWzBdO1xuICAgIHZhciBuZXdFbmRWbm9kZSA9IG5ld0NoW25ld0VuZElkeF07XG4gICAgdmFyIG9sZEtleVRvSWR4LCBpZHhJbk9sZCwgZWxtVG9Nb3ZlLCBiZWZvcmU7XG5cbiAgICB3aGlsZSAob2xkU3RhcnRJZHggPD0gb2xkRW5kSWR4ICYmIG5ld1N0YXJ0SWR4IDw9IG5ld0VuZElkeCkge1xuICAgICAgaWYgKGlzVW5kZWYob2xkU3RhcnRWbm9kZSkpIHtcbiAgICAgICAgb2xkU3RhcnRWbm9kZSA9IG9sZENoWysrb2xkU3RhcnRJZHhdOyAvLyBWbm9kZSBoYXMgYmVlbiBtb3ZlZCBsZWZ0XG4gICAgICB9IGVsc2UgaWYgKGlzVW5kZWYob2xkRW5kVm5vZGUpKSB7XG4gICAgICAgIG9sZEVuZFZub2RlID0gb2xkQ2hbLS1vbGRFbmRJZHhdO1xuICAgICAgfSBlbHNlIGlmIChzYW1lVm5vZGUob2xkU3RhcnRWbm9kZSwgbmV3U3RhcnRWbm9kZSkpIHtcbiAgICAgICAgcGF0Y2hWbm9kZShvbGRTdGFydFZub2RlLCBuZXdTdGFydFZub2RlLCBpbnNlcnRlZFZub2RlUXVldWUpO1xuICAgICAgICBvbGRTdGFydFZub2RlID0gb2xkQ2hbKytvbGRTdGFydElkeF07XG4gICAgICAgIG5ld1N0YXJ0Vm5vZGUgPSBuZXdDaFsrK25ld1N0YXJ0SWR4XTtcbiAgICAgIH0gZWxzZSBpZiAoc2FtZVZub2RlKG9sZEVuZFZub2RlLCBuZXdFbmRWbm9kZSkpIHtcbiAgICAgICAgcGF0Y2hWbm9kZShvbGRFbmRWbm9kZSwgbmV3RW5kVm5vZGUsIGluc2VydGVkVm5vZGVRdWV1ZSk7XG4gICAgICAgIG9sZEVuZFZub2RlID0gb2xkQ2hbLS1vbGRFbmRJZHhdO1xuICAgICAgICBuZXdFbmRWbm9kZSA9IG5ld0NoWy0tbmV3RW5kSWR4XTtcbiAgICAgIH0gZWxzZSBpZiAoc2FtZVZub2RlKG9sZFN0YXJ0Vm5vZGUsIG5ld0VuZFZub2RlKSkgeyAvLyBWbm9kZSBtb3ZlZCByaWdodFxuICAgICAgICBwYXRjaFZub2RlKG9sZFN0YXJ0Vm5vZGUsIG5ld0VuZFZub2RlLCBpbnNlcnRlZFZub2RlUXVldWUpO1xuICAgICAgICBhcGkuaW5zZXJ0QmVmb3JlKHBhcmVudEVsbSwgb2xkU3RhcnRWbm9kZS5lbG0sIGFwaS5uZXh0U2libGluZyhvbGRFbmRWbm9kZS5lbG0pKTtcbiAgICAgICAgb2xkU3RhcnRWbm9kZSA9IG9sZENoWysrb2xkU3RhcnRJZHhdO1xuICAgICAgICBuZXdFbmRWbm9kZSA9IG5ld0NoWy0tbmV3RW5kSWR4XTtcbiAgICAgIH0gZWxzZSBpZiAoc2FtZVZub2RlKG9sZEVuZFZub2RlLCBuZXdTdGFydFZub2RlKSkgeyAvLyBWbm9kZSBtb3ZlZCBsZWZ0XG4gICAgICAgIHBhdGNoVm5vZGUob2xkRW5kVm5vZGUsIG5ld1N0YXJ0Vm5vZGUsIGluc2VydGVkVm5vZGVRdWV1ZSk7XG4gICAgICAgIGFwaS5pbnNlcnRCZWZvcmUocGFyZW50RWxtLCBvbGRFbmRWbm9kZS5lbG0sIG9sZFN0YXJ0Vm5vZGUuZWxtKTtcbiAgICAgICAgb2xkRW5kVm5vZGUgPSBvbGRDaFstLW9sZEVuZElkeF07XG4gICAgICAgIG5ld1N0YXJ0Vm5vZGUgPSBuZXdDaFsrK25ld1N0YXJ0SWR4XTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChpc1VuZGVmKG9sZEtleVRvSWR4KSkgb2xkS2V5VG9JZHggPSBjcmVhdGVLZXlUb09sZElkeChvbGRDaCwgb2xkU3RhcnRJZHgsIG9sZEVuZElkeCk7XG4gICAgICAgIGlkeEluT2xkID0gb2xkS2V5VG9JZHhbbmV3U3RhcnRWbm9kZS5rZXldO1xuICAgICAgICBpZiAoaXNVbmRlZihpZHhJbk9sZCkpIHsgLy8gTmV3IGVsZW1lbnRcbiAgICAgICAgICBhcGkuaW5zZXJ0QmVmb3JlKHBhcmVudEVsbSwgY3JlYXRlRWxtKG5ld1N0YXJ0Vm5vZGUsIGluc2VydGVkVm5vZGVRdWV1ZSksIG9sZFN0YXJ0Vm5vZGUuZWxtKTtcbiAgICAgICAgICBuZXdTdGFydFZub2RlID0gbmV3Q2hbKytuZXdTdGFydElkeF07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZWxtVG9Nb3ZlID0gb2xkQ2hbaWR4SW5PbGRdO1xuICAgICAgICAgIHBhdGNoVm5vZGUoZWxtVG9Nb3ZlLCBuZXdTdGFydFZub2RlLCBpbnNlcnRlZFZub2RlUXVldWUpO1xuICAgICAgICAgIG9sZENoW2lkeEluT2xkXSA9IHVuZGVmaW5lZDtcbiAgICAgICAgICBhcGkuaW5zZXJ0QmVmb3JlKHBhcmVudEVsbSwgZWxtVG9Nb3ZlLmVsbSwgb2xkU3RhcnRWbm9kZS5lbG0pO1xuICAgICAgICAgIG5ld1N0YXJ0Vm5vZGUgPSBuZXdDaFsrK25ld1N0YXJ0SWR4XTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBpZiAob2xkU3RhcnRJZHggPiBvbGRFbmRJZHgpIHtcbiAgICAgIGJlZm9yZSA9IGlzVW5kZWYobmV3Q2hbbmV3RW5kSWR4KzFdKSA/IG51bGwgOiBuZXdDaFtuZXdFbmRJZHgrMV0uZWxtO1xuICAgICAgYWRkVm5vZGVzKHBhcmVudEVsbSwgYmVmb3JlLCBuZXdDaCwgbmV3U3RhcnRJZHgsIG5ld0VuZElkeCwgaW5zZXJ0ZWRWbm9kZVF1ZXVlKTtcbiAgICB9IGVsc2UgaWYgKG5ld1N0YXJ0SWR4ID4gbmV3RW5kSWR4KSB7XG4gICAgICByZW1vdmVWbm9kZXMocGFyZW50RWxtLCBvbGRDaCwgb2xkU3RhcnRJZHgsIG9sZEVuZElkeCk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gcGF0Y2hWbm9kZShvbGRWbm9kZSwgdm5vZGUsIGluc2VydGVkVm5vZGVRdWV1ZSkge1xuICAgIHZhciBpLCBob29rO1xuICAgIGlmIChpc0RlZihpID0gdm5vZGUuZGF0YSkgJiYgaXNEZWYoaG9vayA9IGkuaG9vaykgJiYgaXNEZWYoaSA9IGhvb2sucHJlcGF0Y2gpKSB7XG4gICAgICBpKG9sZFZub2RlLCB2bm9kZSk7XG4gICAgfVxuICAgIGlmIChpc0RlZihpID0gb2xkVm5vZGUuZGF0YSkgJiYgaXNEZWYoaSA9IGkudm5vZGUpKSBvbGRWbm9kZSA9IGk7XG4gICAgaWYgKGlzRGVmKGkgPSB2bm9kZS5kYXRhKSAmJiBpc0RlZihpID0gaS52bm9kZSkpIHtcbiAgICAgIHBhdGNoVm5vZGUob2xkVm5vZGUsIGksIGluc2VydGVkVm5vZGVRdWV1ZSk7XG4gICAgICB2bm9kZS5lbG0gPSBpLmVsbTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIGVsbSA9IHZub2RlLmVsbSA9IG9sZFZub2RlLmVsbSwgb2xkQ2ggPSBvbGRWbm9kZS5jaGlsZHJlbiwgY2ggPSB2bm9kZS5jaGlsZHJlbjtcbiAgICBpZiAob2xkVm5vZGUgPT09IHZub2RlKSByZXR1cm47XG4gICAgaWYgKCFzYW1lVm5vZGUob2xkVm5vZGUsIHZub2RlKSkge1xuICAgICAgdmFyIHBhcmVudEVsbSA9IGFwaS5wYXJlbnROb2RlKG9sZFZub2RlLmVsbSk7XG4gICAgICBlbG0gPSBjcmVhdGVFbG0odm5vZGUsIGluc2VydGVkVm5vZGVRdWV1ZSk7XG4gICAgICBhcGkuaW5zZXJ0QmVmb3JlKHBhcmVudEVsbSwgZWxtLCBvbGRWbm9kZS5lbG0pO1xuICAgICAgcmVtb3ZlVm5vZGVzKHBhcmVudEVsbSwgW29sZFZub2RlXSwgMCwgMCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmIChpc0RlZih2bm9kZS5kYXRhKSkge1xuICAgICAgZm9yIChpID0gMDsgaSA8IGNicy51cGRhdGUubGVuZ3RoOyArK2kpIGNicy51cGRhdGVbaV0ob2xkVm5vZGUsIHZub2RlKTtcbiAgICAgIGkgPSB2bm9kZS5kYXRhLmhvb2s7XG4gICAgICBpZiAoaXNEZWYoaSkgJiYgaXNEZWYoaSA9IGkudXBkYXRlKSkgaShvbGRWbm9kZSwgdm5vZGUpO1xuICAgIH1cbiAgICBpZiAoaXNVbmRlZih2bm9kZS50ZXh0KSkge1xuICAgICAgaWYgKGlzRGVmKG9sZENoKSAmJiBpc0RlZihjaCkpIHtcbiAgICAgICAgaWYgKG9sZENoICE9PSBjaCkgdXBkYXRlQ2hpbGRyZW4oZWxtLCBvbGRDaCwgY2gsIGluc2VydGVkVm5vZGVRdWV1ZSk7XG4gICAgICB9IGVsc2UgaWYgKGlzRGVmKGNoKSkge1xuICAgICAgICBpZiAoaXNEZWYob2xkVm5vZGUudGV4dCkpIGFwaS5zZXRUZXh0Q29udGVudChlbG0sICcnKTtcbiAgICAgICAgYWRkVm5vZGVzKGVsbSwgbnVsbCwgY2gsIDAsIGNoLmxlbmd0aCAtIDEsIGluc2VydGVkVm5vZGVRdWV1ZSk7XG4gICAgICB9IGVsc2UgaWYgKGlzRGVmKG9sZENoKSkge1xuICAgICAgICByZW1vdmVWbm9kZXMoZWxtLCBvbGRDaCwgMCwgb2xkQ2gubGVuZ3RoIC0gMSk7XG4gICAgICB9IGVsc2UgaWYgKGlzRGVmKG9sZFZub2RlLnRleHQpKSB7XG4gICAgICAgIGFwaS5zZXRUZXh0Q29udGVudChlbG0sICcnKTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKG9sZFZub2RlLnRleHQgIT09IHZub2RlLnRleHQpIHtcbiAgICAgIGFwaS5zZXRUZXh0Q29udGVudChlbG0sIHZub2RlLnRleHQpO1xuICAgIH1cbiAgICBpZiAoaXNEZWYoaG9vaykgJiYgaXNEZWYoaSA9IGhvb2sucG9zdHBhdGNoKSkge1xuICAgICAgaShvbGRWbm9kZSwgdm5vZGUpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBmdW5jdGlvbihvbGRWbm9kZSwgdm5vZGUpIHtcbiAgICB2YXIgaSwgZWxtLCBwYXJlbnQ7XG4gICAgdmFyIGluc2VydGVkVm5vZGVRdWV1ZSA9IFtdO1xuICAgIGZvciAoaSA9IDA7IGkgPCBjYnMucHJlLmxlbmd0aDsgKytpKSBjYnMucHJlW2ldKCk7XG5cbiAgICBpZiAoaXNVbmRlZihvbGRWbm9kZS5zZWwpKSB7XG4gICAgICBvbGRWbm9kZSA9IGVtcHR5Tm9kZUF0KG9sZFZub2RlKTtcbiAgICB9XG5cbiAgICBpZiAoc2FtZVZub2RlKG9sZFZub2RlLCB2bm9kZSkpIHtcbiAgICAgIHBhdGNoVm5vZGUob2xkVm5vZGUsIHZub2RlLCBpbnNlcnRlZFZub2RlUXVldWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBlbG0gPSBvbGRWbm9kZS5lbG07XG4gICAgICBwYXJlbnQgPSBhcGkucGFyZW50Tm9kZShlbG0pO1xuXG4gICAgICBjcmVhdGVFbG0odm5vZGUsIGluc2VydGVkVm5vZGVRdWV1ZSk7XG5cbiAgICAgIGlmIChwYXJlbnQgIT09IG51bGwpIHtcbiAgICAgICAgYXBpLmluc2VydEJlZm9yZShwYXJlbnQsIHZub2RlLmVsbSwgYXBpLm5leHRTaWJsaW5nKGVsbSkpO1xuICAgICAgICByZW1vdmVWbm9kZXMocGFyZW50LCBbb2xkVm5vZGVdLCAwLCAwKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmb3IgKGkgPSAwOyBpIDwgaW5zZXJ0ZWRWbm9kZVF1ZXVlLmxlbmd0aDsgKytpKSB7XG4gICAgICBpbnNlcnRlZFZub2RlUXVldWVbaV0uZGF0YS5ob29rLmluc2VydChpbnNlcnRlZFZub2RlUXVldWVbaV0pO1xuICAgIH1cbiAgICBmb3IgKGkgPSAwOyBpIDwgY2JzLnBvc3QubGVuZ3RoOyArK2kpIGNicy5wb3N0W2ldKCk7XG4gICAgcmV0dXJuIHZub2RlO1xuICB9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtpbml0OiBpbml0fTtcbiIsInZhciBoID0gcmVxdWlyZSgnLi9oJyk7XG5cbmZ1bmN0aW9uIGluaXQodGh1bmspIHtcbiAgdmFyIGksIGN1ciA9IHRodW5rLmRhdGE7XG4gIGN1ci52bm9kZSA9IGN1ci5mbi5hcHBseSh1bmRlZmluZWQsIGN1ci5hcmdzKTtcbn1cblxuZnVuY3Rpb24gcHJlcGF0Y2gob2xkVGh1bmssIHRodW5rKSB7XG4gIHZhciBpLCBvbGQgPSBvbGRUaHVuay5kYXRhLCBjdXIgPSB0aHVuay5kYXRhO1xuICB2YXIgb2xkQXJncyA9IG9sZC5hcmdzLCBhcmdzID0gY3VyLmFyZ3M7XG4gIGN1ci52bm9kZSA9IG9sZC52bm9kZTtcbiAgaWYgKG9sZC5mbiAhPT0gY3VyLmZuIHx8IG9sZEFyZ3MubGVuZ3RoICE9PSBhcmdzLmxlbmd0aCkge1xuICAgIGN1ci52bm9kZSA9IGN1ci5mbi5hcHBseSh1bmRlZmluZWQsIGFyZ3MpO1xuICAgIHJldHVybjtcbiAgfVxuICBmb3IgKGkgPSAwOyBpIDwgYXJncy5sZW5ndGg7ICsraSkge1xuICAgIGlmIChvbGRBcmdzW2ldICE9PSBhcmdzW2ldKSB7XG4gICAgICBjdXIudm5vZGUgPSBjdXIuZm4uYXBwbHkodW5kZWZpbmVkLCBhcmdzKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihuYW1lLCBmbiAvKiBhcmdzICovKSB7XG4gIHZhciBpLCBhcmdzID0gW107XG4gIGZvciAoaSA9IDI7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyArK2kpIHtcbiAgICBhcmdzW2kgLSAyXSA9IGFyZ3VtZW50c1tpXTtcbiAgfVxuICByZXR1cm4gaCgndGh1bmsnICsgbmFtZSwge1xuICAgIGhvb2s6IHtpbml0OiBpbml0LCBwcmVwYXRjaDogcHJlcGF0Y2h9LFxuICAgIGZuOiBmbiwgYXJnczogYXJncyxcbiAgfSk7XG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihzZWwsIGRhdGEsIGNoaWxkcmVuLCB0ZXh0LCBlbG0pIHtcbiAgdmFyIGtleSA9IGRhdGEgPT09IHVuZGVmaW5lZCA/IHVuZGVmaW5lZCA6IGRhdGEua2V5O1xuICByZXR1cm4ge3NlbDogc2VsLCBkYXRhOiBkYXRhLCBjaGlsZHJlbjogY2hpbGRyZW4sXG4gICAgICAgICAgdGV4dDogdGV4dCwgZWxtOiBlbG0sIGtleToga2V5fTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChzdHIpIHtcblx0cmV0dXJuIGVuY29kZVVSSUNvbXBvbmVudChzdHIpLnJlcGxhY2UoL1shJygpKl0vZywgZnVuY3Rpb24gKGMpIHtcblx0XHRyZXR1cm4gJyUnICsgYy5jaGFyQ29kZUF0KDApLnRvU3RyaW5nKDE2KS50b1VwcGVyQ2FzZSgpO1xuXHR9KTtcbn07XG4iLCIvKipcbiAqIENvcHlyaWdodCAyMDE0LTIwMTUsIEZhY2Vib29rLCBJbmMuXG4gKiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuICpcbiAqIFRoaXMgc291cmNlIGNvZGUgaXMgbGljZW5zZWQgdW5kZXIgdGhlIEJTRC1zdHlsZSBsaWNlbnNlIGZvdW5kIGluIHRoZVxuICogTElDRU5TRSBmaWxlIGluIHRoZSByb290IGRpcmVjdG9yeSBvZiB0aGlzIHNvdXJjZSB0cmVlLiBBbiBhZGRpdGlvbmFsIGdyYW50XG4gKiBvZiBwYXRlbnQgcmlnaHRzIGNhbiBiZSBmb3VuZCBpbiB0aGUgUEFURU5UUyBmaWxlIGluIHRoZSBzYW1lIGRpcmVjdG9yeS5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbi8qKlxuICogU2ltaWxhciB0byBpbnZhcmlhbnQgYnV0IG9ubHkgbG9ncyBhIHdhcm5pbmcgaWYgdGhlIGNvbmRpdGlvbiBpcyBub3QgbWV0LlxuICogVGhpcyBjYW4gYmUgdXNlZCB0byBsb2cgaXNzdWVzIGluIGRldmVsb3BtZW50IGVudmlyb25tZW50cyBpbiBjcml0aWNhbFxuICogcGF0aHMuIFJlbW92aW5nIHRoZSBsb2dnaW5nIGNvZGUgZm9yIHByb2R1Y3Rpb24gZW52aXJvbm1lbnRzIHdpbGwga2VlcCB0aGVcbiAqIHNhbWUgbG9naWMgYW5kIGZvbGxvdyB0aGUgc2FtZSBjb2RlIHBhdGhzLlxuICovXG5cbnZhciB3YXJuaW5nID0gZnVuY3Rpb24oKSB7fTtcblxuaWYgKHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAncHJvZHVjdGlvbicpIHtcbiAgd2FybmluZyA9IGZ1bmN0aW9uKGNvbmRpdGlvbiwgZm9ybWF0LCBhcmdzKSB7XG4gICAgdmFyIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgYXJncyA9IG5ldyBBcnJheShsZW4gPiAyID8gbGVuIC0gMiA6IDApO1xuICAgIGZvciAodmFyIGtleSA9IDI7IGtleSA8IGxlbjsga2V5KyspIHtcbiAgICAgIGFyZ3Nba2V5IC0gMl0gPSBhcmd1bWVudHNba2V5XTtcbiAgICB9XG4gICAgaWYgKGZvcm1hdCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICdgd2FybmluZyhjb25kaXRpb24sIGZvcm1hdCwgLi4uYXJncylgIHJlcXVpcmVzIGEgd2FybmluZyAnICtcbiAgICAgICAgJ21lc3NhZ2UgYXJndW1lbnQnXG4gICAgICApO1xuICAgIH1cblxuICAgIGlmIChmb3JtYXQubGVuZ3RoIDwgMTAgfHwgKC9eW3NcXFddKiQvKS50ZXN0KGZvcm1hdCkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgJ1RoZSB3YXJuaW5nIGZvcm1hdCBzaG91bGQgYmUgYWJsZSB0byB1bmlxdWVseSBpZGVudGlmeSB0aGlzICcgK1xuICAgICAgICAnd2FybmluZy4gUGxlYXNlLCB1c2UgYSBtb3JlIGRlc2NyaXB0aXZlIGZvcm1hdCB0aGFuOiAnICsgZm9ybWF0XG4gICAgICApO1xuICAgIH1cblxuICAgIGlmICghY29uZGl0aW9uKSB7XG4gICAgICB2YXIgYXJnSW5kZXggPSAwO1xuICAgICAgdmFyIG1lc3NhZ2UgPSAnV2FybmluZzogJyArXG4gICAgICAgIGZvcm1hdC5yZXBsYWNlKC8lcy9nLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICByZXR1cm4gYXJnc1thcmdJbmRleCsrXTtcbiAgICAgICAgfSk7XG4gICAgICBpZiAodHlwZW9mIGNvbnNvbGUgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IobWVzc2FnZSk7XG4gICAgICB9XG4gICAgICB0cnkge1xuICAgICAgICAvLyBUaGlzIGVycm9yIHdhcyB0aHJvd24gYXMgYSBjb252ZW5pZW5jZSBzbyB0aGF0IHlvdSBjYW4gdXNlIHRoaXMgc3RhY2tcbiAgICAgICAgLy8gdG8gZmluZCB0aGUgY2FsbHNpdGUgdGhhdCBjYXVzZWQgdGhpcyB3YXJuaW5nIHRvIGZpcmUuXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihtZXNzYWdlKTtcbiAgICAgIH0gY2F0Y2goeCkge31cbiAgICB9XG4gIH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gd2FybmluZztcbiIsIlwidXNlIHN0cmljdFwiO1xudmFyIF9fZXh0ZW5kcyA9ICh0aGlzICYmIHRoaXMuX19leHRlbmRzKSB8fCBmdW5jdGlvbiAoZCwgYikge1xuICAgIGZvciAodmFyIHAgaW4gYikgaWYgKGIuaGFzT3duUHJvcGVydHkocCkpIGRbcF0gPSBiW3BdO1xuICAgIGZ1bmN0aW9uIF9fKCkgeyB0aGlzLmNvbnN0cnVjdG9yID0gZDsgfVxuICAgIGQucHJvdG90eXBlID0gYiA9PT0gbnVsbCA/IE9iamVjdC5jcmVhdGUoYikgOiAoX18ucHJvdG90eXBlID0gYi5wcm90b3R5cGUsIG5ldyBfXygpKTtcbn07XG52YXIgZW1wdHkgPSB7fTtcbmZ1bmN0aW9uIG5vb3AoKSB7IH1cbmZ1bmN0aW9uIGNvcHkoYSkge1xuICAgIHZhciBsID0gYS5sZW5ndGg7XG4gICAgdmFyIGIgPSBBcnJheShsKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGw7ICsraSkge1xuICAgICAgICBiW2ldID0gYVtpXTtcbiAgICB9XG4gICAgcmV0dXJuIGI7XG59XG5leHBvcnRzLmVtcHR5TGlzdGVuZXIgPSB7XG4gICAgX246IG5vb3AsXG4gICAgX2U6IG5vb3AsXG4gICAgX2M6IG5vb3AsXG59O1xuLy8gbXV0YXRlcyB0aGUgaW5wdXRcbmZ1bmN0aW9uIGludGVybmFsaXplUHJvZHVjZXIocHJvZHVjZXIpIHtcbiAgICBwcm9kdWNlci5fc3RhcnQgPVxuICAgICAgICBmdW5jdGlvbiBfc3RhcnQoaWwpIHtcbiAgICAgICAgICAgIGlsLm5leHQgPSBpbC5fbjtcbiAgICAgICAgICAgIGlsLmVycm9yID0gaWwuX2U7XG4gICAgICAgICAgICBpbC5jb21wbGV0ZSA9IGlsLl9jO1xuICAgICAgICAgICAgdGhpcy5zdGFydChpbCk7XG4gICAgICAgIH07XG4gICAgcHJvZHVjZXIuX3N0b3AgPSBwcm9kdWNlci5zdG9wO1xufVxuZnVuY3Rpb24gaW52b2tlKGYsIGFyZ3MpIHtcbiAgICBzd2l0Y2ggKGFyZ3MubGVuZ3RoKSB7XG4gICAgICAgIGNhc2UgMDogcmV0dXJuIGYoKTtcbiAgICAgICAgY2FzZSAxOiByZXR1cm4gZihhcmdzWzBdKTtcbiAgICAgICAgY2FzZSAyOiByZXR1cm4gZihhcmdzWzBdLCBhcmdzWzFdKTtcbiAgICAgICAgY2FzZSAzOiByZXR1cm4gZihhcmdzWzBdLCBhcmdzWzFdLCBhcmdzWzJdKTtcbiAgICAgICAgY2FzZSA0OiByZXR1cm4gZihhcmdzWzBdLCBhcmdzWzFdLCBhcmdzWzJdLCBhcmdzWzNdKTtcbiAgICAgICAgY2FzZSA1OiByZXR1cm4gZihhcmdzWzBdLCBhcmdzWzFdLCBhcmdzWzJdLCBhcmdzWzNdLCBhcmdzWzRdKTtcbiAgICAgICAgZGVmYXVsdDogcmV0dXJuIGYuYXBwbHkodm9pZCAwLCBhcmdzKTtcbiAgICB9XG59XG5mdW5jdGlvbiBjb21wb3NlMihmMSwgZjIpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gY29tcG9zZWRGbihhcmcpIHtcbiAgICAgICAgcmV0dXJuIGYxKGYyKGFyZykpO1xuICAgIH07XG59XG5mdW5jdGlvbiBhbmQoZjEsIGYyKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIGFuZEZuKHQpIHtcbiAgICAgICAgcmV0dXJuIGYxKHQpICYmIGYyKHQpO1xuICAgIH07XG59XG52YXIgQ29tYmluZUxpc3RlbmVyID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBDb21iaW5lTGlzdGVuZXIoaSwgcCkge1xuICAgICAgICB0aGlzLmkgPSBpO1xuICAgICAgICB0aGlzLnAgPSBwO1xuICAgICAgICBwLmlscy5wdXNoKHRoaXMpO1xuICAgIH1cbiAgICBDb21iaW5lTGlzdGVuZXIucHJvdG90eXBlLl9uID0gZnVuY3Rpb24gKHQpIHtcbiAgICAgICAgdmFyIHAgPSB0aGlzLnAsIG91dCA9IHAub3V0O1xuICAgICAgICBpZiAoIW91dClcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgaWYgKHAudXAodCwgdGhpcy5pKSkge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBvdXQuX24oaW52b2tlKHAucHJvamVjdCwgcC52YWxzKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIG91dC5fZShlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG4gICAgQ29tYmluZUxpc3RlbmVyLnByb3RvdHlwZS5fZSA9IGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgdmFyIG91dCA9IHRoaXMucC5vdXQ7XG4gICAgICAgIGlmICghb3V0KVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICBvdXQuX2UoZXJyKTtcbiAgICB9O1xuICAgIENvbWJpbmVMaXN0ZW5lci5wcm90b3R5cGUuX2MgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBwID0gdGhpcy5wO1xuICAgICAgICBpZiAoIXAub3V0KVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICBpZiAoLS1wLmFjID09PSAwKSB7XG4gICAgICAgICAgICBwLm91dC5fYygpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICByZXR1cm4gQ29tYmluZUxpc3RlbmVyO1xufSgpKTtcbmV4cG9ydHMuQ29tYmluZUxpc3RlbmVyID0gQ29tYmluZUxpc3RlbmVyO1xudmFyIENvbWJpbmVQcm9kdWNlciA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gQ29tYmluZVByb2R1Y2VyKHByb2plY3QsIHN0cmVhbXMpIHtcbiAgICAgICAgdGhpcy5wcm9qZWN0ID0gcHJvamVjdDtcbiAgICAgICAgdGhpcy5zdHJlYW1zID0gc3RyZWFtcztcbiAgICAgICAgdGhpcy50eXBlID0gJ2NvbWJpbmUnO1xuICAgICAgICB0aGlzLm91dCA9IGV4cG9ydHMuZW1wdHlMaXN0ZW5lcjtcbiAgICAgICAgdGhpcy5pbHMgPSBbXTtcbiAgICAgICAgdmFyIG4gPSB0aGlzLmFjID0gdGhpcy5sZWZ0ID0gc3RyZWFtcy5sZW5ndGg7XG4gICAgICAgIHZhciB2YWxzID0gdGhpcy52YWxzID0gbmV3IEFycmF5KG4pO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG47IGkrKykge1xuICAgICAgICAgICAgdmFsc1tpXSA9IGVtcHR5O1xuICAgICAgICB9XG4gICAgfVxuICAgIENvbWJpbmVQcm9kdWNlci5wcm90b3R5cGUudXAgPSBmdW5jdGlvbiAodCwgaSkge1xuICAgICAgICB2YXIgdiA9IHRoaXMudmFsc1tpXTtcbiAgICAgICAgdmFyIGxlZnQgPSAhdGhpcy5sZWZ0ID8gMCA6IHYgPT09IGVtcHR5ID8gLS10aGlzLmxlZnQgOiB0aGlzLmxlZnQ7XG4gICAgICAgIHRoaXMudmFsc1tpXSA9IHQ7XG4gICAgICAgIHJldHVybiBsZWZ0ID09PSAwO1xuICAgIH07XG4gICAgQ29tYmluZVByb2R1Y2VyLnByb3RvdHlwZS5fc3RhcnQgPSBmdW5jdGlvbiAob3V0KSB7XG4gICAgICAgIHRoaXMub3V0ID0gb3V0O1xuICAgICAgICB2YXIgcyA9IHRoaXMuc3RyZWFtcztcbiAgICAgICAgdmFyIG4gPSBzLmxlbmd0aDtcbiAgICAgICAgaWYgKG4gPT09IDApXG4gICAgICAgICAgICB0aGlzLnplcm8ob3V0KTtcbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG47IGkrKykge1xuICAgICAgICAgICAgICAgIHNbaV0uX2FkZChuZXcgQ29tYmluZUxpc3RlbmVyKGksIHRoaXMpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG4gICAgQ29tYmluZVByb2R1Y2VyLnByb3RvdHlwZS5fc3RvcCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHMgPSB0aGlzLnN0cmVhbXM7XG4gICAgICAgIHZhciBuID0gdGhpcy5hYyA9IHRoaXMubGVmdCA9IHMubGVuZ3RoO1xuICAgICAgICB2YXIgdmFscyA9IHRoaXMudmFscyA9IG5ldyBBcnJheShuKTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBuOyBpKyspIHtcbiAgICAgICAgICAgIHNbaV0uX3JlbW92ZSh0aGlzLmlsc1tpXSk7XG4gICAgICAgICAgICB2YWxzW2ldID0gZW1wdHk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5vdXQgPSBudWxsO1xuICAgICAgICB0aGlzLmlscyA9IFtdO1xuICAgIH07XG4gICAgQ29tYmluZVByb2R1Y2VyLnByb3RvdHlwZS56ZXJvID0gZnVuY3Rpb24gKG91dCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgb3V0Ll9uKHRoaXMucHJvamVjdCgpKTtcbiAgICAgICAgICAgIG91dC5fYygpO1xuICAgICAgICB9XG4gICAgICAgIGNhdGNoIChlKSB7XG4gICAgICAgICAgICBvdXQuX2UoZSk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHJldHVybiBDb21iaW5lUHJvZHVjZXI7XG59KCkpO1xuZXhwb3J0cy5Db21iaW5lUHJvZHVjZXIgPSBDb21iaW5lUHJvZHVjZXI7XG52YXIgRnJvbUFycmF5UHJvZHVjZXIgPSAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIEZyb21BcnJheVByb2R1Y2VyKGEpIHtcbiAgICAgICAgdGhpcy5hID0gYTtcbiAgICAgICAgdGhpcy50eXBlID0gJ2Zyb21BcnJheSc7XG4gICAgfVxuICAgIEZyb21BcnJheVByb2R1Y2VyLnByb3RvdHlwZS5fc3RhcnQgPSBmdW5jdGlvbiAob3V0KSB7XG4gICAgICAgIHZhciBhID0gdGhpcy5hO1xuICAgICAgICBmb3IgKHZhciBpID0gMCwgbCA9IGEubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgICAgICBvdXQuX24oYVtpXSk7XG4gICAgICAgIH1cbiAgICAgICAgb3V0Ll9jKCk7XG4gICAgfTtcbiAgICBGcm9tQXJyYXlQcm9kdWNlci5wcm90b3R5cGUuX3N0b3AgPSBmdW5jdGlvbiAoKSB7XG4gICAgfTtcbiAgICByZXR1cm4gRnJvbUFycmF5UHJvZHVjZXI7XG59KCkpO1xuZXhwb3J0cy5Gcm9tQXJyYXlQcm9kdWNlciA9IEZyb21BcnJheVByb2R1Y2VyO1xudmFyIEZyb21Qcm9taXNlUHJvZHVjZXIgPSAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIEZyb21Qcm9taXNlUHJvZHVjZXIocCkge1xuICAgICAgICB0aGlzLnAgPSBwO1xuICAgICAgICB0aGlzLnR5cGUgPSAnZnJvbVByb21pc2UnO1xuICAgICAgICB0aGlzLm9uID0gZmFsc2U7XG4gICAgfVxuICAgIEZyb21Qcm9taXNlUHJvZHVjZXIucHJvdG90eXBlLl9zdGFydCA9IGZ1bmN0aW9uIChvdXQpIHtcbiAgICAgICAgdmFyIHByb2QgPSB0aGlzO1xuICAgICAgICB0aGlzLm9uID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5wLnRoZW4oZnVuY3Rpb24gKHYpIHtcbiAgICAgICAgICAgIGlmIChwcm9kLm9uKSB7XG4gICAgICAgICAgICAgICAgb3V0Ll9uKHYpO1xuICAgICAgICAgICAgICAgIG91dC5fYygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgb3V0Ll9lKGUpO1xuICAgICAgICB9KS50aGVuKG51bGwsIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkgeyB0aHJvdyBlcnI7IH0pO1xuICAgICAgICB9KTtcbiAgICB9O1xuICAgIEZyb21Qcm9taXNlUHJvZHVjZXIucHJvdG90eXBlLl9zdG9wID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLm9uID0gZmFsc2U7XG4gICAgfTtcbiAgICByZXR1cm4gRnJvbVByb21pc2VQcm9kdWNlcjtcbn0oKSk7XG5leHBvcnRzLkZyb21Qcm9taXNlUHJvZHVjZXIgPSBGcm9tUHJvbWlzZVByb2R1Y2VyO1xudmFyIE1lcmdlUHJvZHVjZXIgPSAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIE1lcmdlUHJvZHVjZXIoc3RyZWFtcykge1xuICAgICAgICB0aGlzLnN0cmVhbXMgPSBzdHJlYW1zO1xuICAgICAgICB0aGlzLnR5cGUgPSAnbWVyZ2UnO1xuICAgICAgICB0aGlzLm91dCA9IGV4cG9ydHMuZW1wdHlMaXN0ZW5lcjtcbiAgICAgICAgdGhpcy5hYyA9IHN0cmVhbXMubGVuZ3RoO1xuICAgIH1cbiAgICBNZXJnZVByb2R1Y2VyLnByb3RvdHlwZS5fc3RhcnQgPSBmdW5jdGlvbiAob3V0KSB7XG4gICAgICAgIHRoaXMub3V0ID0gb3V0O1xuICAgICAgICB2YXIgcyA9IHRoaXMuc3RyZWFtcztcbiAgICAgICAgdmFyIEwgPSBzLmxlbmd0aDtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBMOyBpKyspIHtcbiAgICAgICAgICAgIHNbaV0uX2FkZCh0aGlzKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgTWVyZ2VQcm9kdWNlci5wcm90b3R5cGUuX3N0b3AgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBzID0gdGhpcy5zdHJlYW1zO1xuICAgICAgICB2YXIgTCA9IHMubGVuZ3RoO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IEw7IGkrKykge1xuICAgICAgICAgICAgc1tpXS5fcmVtb3ZlKHRoaXMpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMub3V0ID0gbnVsbDtcbiAgICAgICAgdGhpcy5hYyA9IEw7XG4gICAgfTtcbiAgICBNZXJnZVByb2R1Y2VyLnByb3RvdHlwZS5fbiA9IGZ1bmN0aW9uICh0KSB7XG4gICAgICAgIHZhciB1ID0gdGhpcy5vdXQ7XG4gICAgICAgIGlmICghdSlcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgdS5fbih0KTtcbiAgICB9O1xuICAgIE1lcmdlUHJvZHVjZXIucHJvdG90eXBlLl9lID0gZnVuY3Rpb24gKGVycikge1xuICAgICAgICB2YXIgdSA9IHRoaXMub3V0O1xuICAgICAgICBpZiAoIXUpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIHUuX2UoZXJyKTtcbiAgICB9O1xuICAgIE1lcmdlUHJvZHVjZXIucHJvdG90eXBlLl9jID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoLS10aGlzLmFjID09PSAwKSB7XG4gICAgICAgICAgICB2YXIgdSA9IHRoaXMub3V0O1xuICAgICAgICAgICAgaWYgKCF1KVxuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIHUuX2MoKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgcmV0dXJuIE1lcmdlUHJvZHVjZXI7XG59KCkpO1xuZXhwb3J0cy5NZXJnZVByb2R1Y2VyID0gTWVyZ2VQcm9kdWNlcjtcbnZhciBQZXJpb2RpY1Byb2R1Y2VyID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBQZXJpb2RpY1Byb2R1Y2VyKHBlcmlvZCkge1xuICAgICAgICB0aGlzLnBlcmlvZCA9IHBlcmlvZDtcbiAgICAgICAgdGhpcy50eXBlID0gJ3BlcmlvZGljJztcbiAgICAgICAgdGhpcy5pbnRlcnZhbElEID0gLTE7XG4gICAgICAgIHRoaXMuaSA9IDA7XG4gICAgfVxuICAgIFBlcmlvZGljUHJvZHVjZXIucHJvdG90eXBlLl9zdGFydCA9IGZ1bmN0aW9uIChzdHJlYW0pIHtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICBmdW5jdGlvbiBpbnRlcnZhbEhhbmRsZXIoKSB7IHN0cmVhbS5fbihzZWxmLmkrKyk7IH1cbiAgICAgICAgdGhpcy5pbnRlcnZhbElEID0gc2V0SW50ZXJ2YWwoaW50ZXJ2YWxIYW5kbGVyLCB0aGlzLnBlcmlvZCk7XG4gICAgfTtcbiAgICBQZXJpb2RpY1Byb2R1Y2VyLnByb3RvdHlwZS5fc3RvcCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKHRoaXMuaW50ZXJ2YWxJRCAhPT0gLTEpXG4gICAgICAgICAgICBjbGVhckludGVydmFsKHRoaXMuaW50ZXJ2YWxJRCk7XG4gICAgICAgIHRoaXMuaW50ZXJ2YWxJRCA9IC0xO1xuICAgICAgICB0aGlzLmkgPSAwO1xuICAgIH07XG4gICAgcmV0dXJuIFBlcmlvZGljUHJvZHVjZXI7XG59KCkpO1xuZXhwb3J0cy5QZXJpb2RpY1Byb2R1Y2VyID0gUGVyaW9kaWNQcm9kdWNlcjtcbnZhciBEZWJ1Z09wZXJhdG9yID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBEZWJ1Z09wZXJhdG9yKGFyZywgaW5zKSB7XG4gICAgICAgIHRoaXMuaW5zID0gaW5zO1xuICAgICAgICB0aGlzLnR5cGUgPSAnZGVidWcnO1xuICAgICAgICB0aGlzLm91dCA9IG51bGw7XG4gICAgICAgIHRoaXMucyA9IG51bGw7IC8vIHNweVxuICAgICAgICB0aGlzLmwgPSBudWxsOyAvLyBsYWJlbFxuICAgICAgICBpZiAodHlwZW9mIGFyZyA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIHRoaXMubCA9IGFyZztcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMucyA9IGFyZztcbiAgICAgICAgfVxuICAgIH1cbiAgICBEZWJ1Z09wZXJhdG9yLnByb3RvdHlwZS5fc3RhcnQgPSBmdW5jdGlvbiAob3V0KSB7XG4gICAgICAgIHRoaXMub3V0ID0gb3V0O1xuICAgICAgICB0aGlzLmlucy5fYWRkKHRoaXMpO1xuICAgIH07XG4gICAgRGVidWdPcGVyYXRvci5wcm90b3R5cGUuX3N0b3AgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuaW5zLl9yZW1vdmUodGhpcyk7XG4gICAgICAgIHRoaXMub3V0ID0gbnVsbDtcbiAgICB9O1xuICAgIERlYnVnT3BlcmF0b3IucHJvdG90eXBlLl9uID0gZnVuY3Rpb24gKHQpIHtcbiAgICAgICAgdmFyIHUgPSB0aGlzLm91dDtcbiAgICAgICAgaWYgKCF1KVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB2YXIgcyA9IHRoaXMucywgbCA9IHRoaXMubDtcbiAgICAgICAgaWYgKHMpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgcyh0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgdS5fZShlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChsKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhsICsgJzonLCB0KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKHQpO1xuICAgICAgICB9XG4gICAgICAgIHUuX24odCk7XG4gICAgfTtcbiAgICBEZWJ1Z09wZXJhdG9yLnByb3RvdHlwZS5fZSA9IGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgdmFyIHUgPSB0aGlzLm91dDtcbiAgICAgICAgaWYgKCF1KVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB1Ll9lKGVycik7XG4gICAgfTtcbiAgICBEZWJ1Z09wZXJhdG9yLnByb3RvdHlwZS5fYyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHUgPSB0aGlzLm91dDtcbiAgICAgICAgaWYgKCF1KVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB1Ll9jKCk7XG4gICAgfTtcbiAgICByZXR1cm4gRGVidWdPcGVyYXRvcjtcbn0oKSk7XG5leHBvcnRzLkRlYnVnT3BlcmF0b3IgPSBEZWJ1Z09wZXJhdG9yO1xudmFyIERyb3BPcGVyYXRvciA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gRHJvcE9wZXJhdG9yKG1heCwgaW5zKSB7XG4gICAgICAgIHRoaXMubWF4ID0gbWF4O1xuICAgICAgICB0aGlzLmlucyA9IGlucztcbiAgICAgICAgdGhpcy50eXBlID0gJ2Ryb3AnO1xuICAgICAgICB0aGlzLm91dCA9IG51bGw7XG4gICAgICAgIHRoaXMuZHJvcHBlZCA9IDA7XG4gICAgfVxuICAgIERyb3BPcGVyYXRvci5wcm90b3R5cGUuX3N0YXJ0ID0gZnVuY3Rpb24gKG91dCkge1xuICAgICAgICB0aGlzLm91dCA9IG91dDtcbiAgICAgICAgdGhpcy5pbnMuX2FkZCh0aGlzKTtcbiAgICB9O1xuICAgIERyb3BPcGVyYXRvci5wcm90b3R5cGUuX3N0b3AgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuaW5zLl9yZW1vdmUodGhpcyk7XG4gICAgICAgIHRoaXMub3V0ID0gbnVsbDtcbiAgICAgICAgdGhpcy5kcm9wcGVkID0gMDtcbiAgICB9O1xuICAgIERyb3BPcGVyYXRvci5wcm90b3R5cGUuX24gPSBmdW5jdGlvbiAodCkge1xuICAgICAgICB2YXIgdSA9IHRoaXMub3V0O1xuICAgICAgICBpZiAoIXUpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIGlmICh0aGlzLmRyb3BwZWQrKyA+PSB0aGlzLm1heClcbiAgICAgICAgICAgIHUuX24odCk7XG4gICAgfTtcbiAgICBEcm9wT3BlcmF0b3IucHJvdG90eXBlLl9lID0gZnVuY3Rpb24gKGVycikge1xuICAgICAgICB2YXIgdSA9IHRoaXMub3V0O1xuICAgICAgICBpZiAoIXUpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIHUuX2UoZXJyKTtcbiAgICB9O1xuICAgIERyb3BPcGVyYXRvci5wcm90b3R5cGUuX2MgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciB1ID0gdGhpcy5vdXQ7XG4gICAgICAgIGlmICghdSlcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgdS5fYygpO1xuICAgIH07XG4gICAgcmV0dXJuIERyb3BPcGVyYXRvcjtcbn0oKSk7XG5leHBvcnRzLkRyb3BPcGVyYXRvciA9IERyb3BPcGVyYXRvcjtcbnZhciBPdGhlcklMID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBPdGhlcklMKG91dCwgb3ApIHtcbiAgICAgICAgdGhpcy5vdXQgPSBvdXQ7XG4gICAgICAgIHRoaXMub3AgPSBvcDtcbiAgICB9XG4gICAgT3RoZXJJTC5wcm90b3R5cGUuX24gPSBmdW5jdGlvbiAodCkge1xuICAgICAgICB0aGlzLm9wLmVuZCgpO1xuICAgIH07XG4gICAgT3RoZXJJTC5wcm90b3R5cGUuX2UgPSBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgIHRoaXMub3V0Ll9lKGVycik7XG4gICAgfTtcbiAgICBPdGhlcklMLnByb3RvdHlwZS5fYyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5vcC5lbmQoKTtcbiAgICB9O1xuICAgIHJldHVybiBPdGhlcklMO1xufSgpKTtcbnZhciBFbmRXaGVuT3BlcmF0b3IgPSAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIEVuZFdoZW5PcGVyYXRvcihvLCAvLyBvID0gb3RoZXJcbiAgICAgICAgaW5zKSB7XG4gICAgICAgIHRoaXMubyA9IG87XG4gICAgICAgIHRoaXMuaW5zID0gaW5zO1xuICAgICAgICB0aGlzLnR5cGUgPSAnZW5kV2hlbic7XG4gICAgICAgIHRoaXMub3V0ID0gbnVsbDtcbiAgICAgICAgdGhpcy5vaWwgPSBleHBvcnRzLmVtcHR5TGlzdGVuZXI7IC8vIG9pbCA9IG90aGVyIEludGVybmFsTGlzdGVuZXJcbiAgICB9XG4gICAgRW5kV2hlbk9wZXJhdG9yLnByb3RvdHlwZS5fc3RhcnQgPSBmdW5jdGlvbiAob3V0KSB7XG4gICAgICAgIHRoaXMub3V0ID0gb3V0O1xuICAgICAgICB0aGlzLm8uX2FkZCh0aGlzLm9pbCA9IG5ldyBPdGhlcklMKG91dCwgdGhpcykpO1xuICAgICAgICB0aGlzLmlucy5fYWRkKHRoaXMpO1xuICAgIH07XG4gICAgRW5kV2hlbk9wZXJhdG9yLnByb3RvdHlwZS5fc3RvcCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5pbnMuX3JlbW92ZSh0aGlzKTtcbiAgICAgICAgdGhpcy5vLl9yZW1vdmUodGhpcy5vaWwpO1xuICAgICAgICB0aGlzLm91dCA9IG51bGw7XG4gICAgICAgIHRoaXMub2lsID0gbnVsbDtcbiAgICB9O1xuICAgIEVuZFdoZW5PcGVyYXRvci5wcm90b3R5cGUuZW5kID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgdSA9IHRoaXMub3V0O1xuICAgICAgICBpZiAoIXUpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIHUuX2MoKTtcbiAgICB9O1xuICAgIEVuZFdoZW5PcGVyYXRvci5wcm90b3R5cGUuX24gPSBmdW5jdGlvbiAodCkge1xuICAgICAgICB2YXIgdSA9IHRoaXMub3V0O1xuICAgICAgICBpZiAoIXUpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIHUuX24odCk7XG4gICAgfTtcbiAgICBFbmRXaGVuT3BlcmF0b3IucHJvdG90eXBlLl9lID0gZnVuY3Rpb24gKGVycikge1xuICAgICAgICB2YXIgdSA9IHRoaXMub3V0O1xuICAgICAgICBpZiAoIXUpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIHUuX2UoZXJyKTtcbiAgICB9O1xuICAgIEVuZFdoZW5PcGVyYXRvci5wcm90b3R5cGUuX2MgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuZW5kKCk7XG4gICAgfTtcbiAgICByZXR1cm4gRW5kV2hlbk9wZXJhdG9yO1xufSgpKTtcbmV4cG9ydHMuRW5kV2hlbk9wZXJhdG9yID0gRW5kV2hlbk9wZXJhdG9yO1xudmFyIEZpbHRlck9wZXJhdG9yID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBGaWx0ZXJPcGVyYXRvcihwYXNzZXMsIGlucykge1xuICAgICAgICB0aGlzLnBhc3NlcyA9IHBhc3NlcztcbiAgICAgICAgdGhpcy5pbnMgPSBpbnM7XG4gICAgICAgIHRoaXMudHlwZSA9ICdmaWx0ZXInO1xuICAgICAgICB0aGlzLm91dCA9IG51bGw7XG4gICAgfVxuICAgIEZpbHRlck9wZXJhdG9yLnByb3RvdHlwZS5fc3RhcnQgPSBmdW5jdGlvbiAob3V0KSB7XG4gICAgICAgIHRoaXMub3V0ID0gb3V0O1xuICAgICAgICB0aGlzLmlucy5fYWRkKHRoaXMpO1xuICAgIH07XG4gICAgRmlsdGVyT3BlcmF0b3IucHJvdG90eXBlLl9zdG9wID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLmlucy5fcmVtb3ZlKHRoaXMpO1xuICAgICAgICB0aGlzLm91dCA9IG51bGw7XG4gICAgfTtcbiAgICBGaWx0ZXJPcGVyYXRvci5wcm90b3R5cGUuX24gPSBmdW5jdGlvbiAodCkge1xuICAgICAgICB2YXIgdSA9IHRoaXMub3V0O1xuICAgICAgICBpZiAoIXUpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBpZiAodGhpcy5wYXNzZXModCkpXG4gICAgICAgICAgICAgICAgdS5fbih0KTtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaCAoZSkge1xuICAgICAgICAgICAgdS5fZShlKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgRmlsdGVyT3BlcmF0b3IucHJvdG90eXBlLl9lID0gZnVuY3Rpb24gKGVycikge1xuICAgICAgICB2YXIgdSA9IHRoaXMub3V0O1xuICAgICAgICBpZiAoIXUpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIHUuX2UoZXJyKTtcbiAgICB9O1xuICAgIEZpbHRlck9wZXJhdG9yLnByb3RvdHlwZS5fYyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHUgPSB0aGlzLm91dDtcbiAgICAgICAgaWYgKCF1KVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB1Ll9jKCk7XG4gICAgfTtcbiAgICByZXR1cm4gRmlsdGVyT3BlcmF0b3I7XG59KCkpO1xuZXhwb3J0cy5GaWx0ZXJPcGVyYXRvciA9IEZpbHRlck9wZXJhdG9yO1xudmFyIEZsYXR0ZW5MaXN0ZW5lciA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gRmxhdHRlbkxpc3RlbmVyKG91dCwgb3ApIHtcbiAgICAgICAgdGhpcy5vdXQgPSBvdXQ7XG4gICAgICAgIHRoaXMub3AgPSBvcDtcbiAgICB9XG4gICAgRmxhdHRlbkxpc3RlbmVyLnByb3RvdHlwZS5fbiA9IGZ1bmN0aW9uICh0KSB7XG4gICAgICAgIHRoaXMub3V0Ll9uKHQpO1xuICAgIH07XG4gICAgRmxhdHRlbkxpc3RlbmVyLnByb3RvdHlwZS5fZSA9IGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgdGhpcy5vdXQuX2UoZXJyKTtcbiAgICB9O1xuICAgIEZsYXR0ZW5MaXN0ZW5lci5wcm90b3R5cGUuX2MgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMub3AuaW5uZXIgPSBudWxsO1xuICAgICAgICB0aGlzLm9wLmxlc3MoKTtcbiAgICB9O1xuICAgIHJldHVybiBGbGF0dGVuTGlzdGVuZXI7XG59KCkpO1xudmFyIEZsYXR0ZW5PcGVyYXRvciA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gRmxhdHRlbk9wZXJhdG9yKGlucykge1xuICAgICAgICB0aGlzLmlucyA9IGlucztcbiAgICAgICAgdGhpcy50eXBlID0gJ2ZsYXR0ZW4nO1xuICAgICAgICB0aGlzLmlubmVyID0gbnVsbDsgLy8gQ3VycmVudCBpbm5lciBTdHJlYW1cbiAgICAgICAgdGhpcy5pbCA9IG51bGw7IC8vIEN1cnJlbnQgaW5uZXIgSW50ZXJuYWxMaXN0ZW5lclxuICAgICAgICB0aGlzLm9wZW4gPSB0cnVlO1xuICAgICAgICB0aGlzLm91dCA9IG51bGw7XG4gICAgfVxuICAgIEZsYXR0ZW5PcGVyYXRvci5wcm90b3R5cGUuX3N0YXJ0ID0gZnVuY3Rpb24gKG91dCkge1xuICAgICAgICB0aGlzLm91dCA9IG91dDtcbiAgICAgICAgdGhpcy5pbnMuX2FkZCh0aGlzKTtcbiAgICB9O1xuICAgIEZsYXR0ZW5PcGVyYXRvci5wcm90b3R5cGUuX3N0b3AgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuaW5zLl9yZW1vdmUodGhpcyk7XG4gICAgICAgIHRoaXMuaW5uZXIgPSBudWxsO1xuICAgICAgICB0aGlzLmlsID0gbnVsbDtcbiAgICAgICAgdGhpcy5vcGVuID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5vdXQgPSBudWxsO1xuICAgIH07XG4gICAgRmxhdHRlbk9wZXJhdG9yLnByb3RvdHlwZS5sZXNzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgdSA9IHRoaXMub3V0O1xuICAgICAgICBpZiAoIXUpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIGlmICghdGhpcy5vcGVuICYmICF0aGlzLmlubmVyKVxuICAgICAgICAgICAgdS5fYygpO1xuICAgIH07XG4gICAgRmxhdHRlbk9wZXJhdG9yLnByb3RvdHlwZS5fbiA9IGZ1bmN0aW9uIChzKSB7XG4gICAgICAgIHZhciB1ID0gdGhpcy5vdXQ7XG4gICAgICAgIGlmICghdSlcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgdmFyIF9hID0gdGhpcywgaW5uZXIgPSBfYS5pbm5lciwgaWwgPSBfYS5pbDtcbiAgICAgICAgaWYgKGlubmVyICYmIGlsKVxuICAgICAgICAgICAgaW5uZXIuX3JlbW92ZShpbCk7XG4gICAgICAgICh0aGlzLmlubmVyID0gcykuX2FkZCh0aGlzLmlsID0gbmV3IEZsYXR0ZW5MaXN0ZW5lcih1LCB0aGlzKSk7XG4gICAgfTtcbiAgICBGbGF0dGVuT3BlcmF0b3IucHJvdG90eXBlLl9lID0gZnVuY3Rpb24gKGVycikge1xuICAgICAgICB2YXIgdSA9IHRoaXMub3V0O1xuICAgICAgICBpZiAoIXUpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIHUuX2UoZXJyKTtcbiAgICB9O1xuICAgIEZsYXR0ZW5PcGVyYXRvci5wcm90b3R5cGUuX2MgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMub3BlbiA9IGZhbHNlO1xuICAgICAgICB0aGlzLmxlc3MoKTtcbiAgICB9O1xuICAgIHJldHVybiBGbGF0dGVuT3BlcmF0b3I7XG59KCkpO1xuZXhwb3J0cy5GbGF0dGVuT3BlcmF0b3IgPSBGbGF0dGVuT3BlcmF0b3I7XG52YXIgRm9sZE9wZXJhdG9yID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBGb2xkT3BlcmF0b3IoZiwgc2VlZCwgaW5zKSB7XG4gICAgICAgIHRoaXMuZiA9IGY7XG4gICAgICAgIHRoaXMuc2VlZCA9IHNlZWQ7XG4gICAgICAgIHRoaXMuaW5zID0gaW5zO1xuICAgICAgICB0aGlzLnR5cGUgPSAnZm9sZCc7XG4gICAgICAgIHRoaXMub3V0ID0gbnVsbDtcbiAgICAgICAgdGhpcy5hY2MgPSBzZWVkO1xuICAgIH1cbiAgICBGb2xkT3BlcmF0b3IucHJvdG90eXBlLl9zdGFydCA9IGZ1bmN0aW9uIChvdXQpIHtcbiAgICAgICAgdGhpcy5vdXQgPSBvdXQ7XG4gICAgICAgIG91dC5fbih0aGlzLmFjYyk7XG4gICAgICAgIHRoaXMuaW5zLl9hZGQodGhpcyk7XG4gICAgfTtcbiAgICBGb2xkT3BlcmF0b3IucHJvdG90eXBlLl9zdG9wID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLmlucy5fcmVtb3ZlKHRoaXMpO1xuICAgICAgICB0aGlzLm91dCA9IG51bGw7XG4gICAgICAgIHRoaXMuYWNjID0gdGhpcy5zZWVkO1xuICAgIH07XG4gICAgRm9sZE9wZXJhdG9yLnByb3RvdHlwZS5fbiA9IGZ1bmN0aW9uICh0KSB7XG4gICAgICAgIHZhciB1ID0gdGhpcy5vdXQ7XG4gICAgICAgIGlmICghdSlcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHUuX24odGhpcy5hY2MgPSB0aGlzLmYodGhpcy5hY2MsIHQpKTtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaCAoZSkge1xuICAgICAgICAgICAgdS5fZShlKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgRm9sZE9wZXJhdG9yLnByb3RvdHlwZS5fZSA9IGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgdmFyIHUgPSB0aGlzLm91dDtcbiAgICAgICAgaWYgKCF1KVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB1Ll9lKGVycik7XG4gICAgfTtcbiAgICBGb2xkT3BlcmF0b3IucHJvdG90eXBlLl9jID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgdSA9IHRoaXMub3V0O1xuICAgICAgICBpZiAoIXUpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIHUuX2MoKTtcbiAgICB9O1xuICAgIHJldHVybiBGb2xkT3BlcmF0b3I7XG59KCkpO1xuZXhwb3J0cy5Gb2xkT3BlcmF0b3IgPSBGb2xkT3BlcmF0b3I7XG52YXIgTGFzdE9wZXJhdG9yID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBMYXN0T3BlcmF0b3IoaW5zKSB7XG4gICAgICAgIHRoaXMuaW5zID0gaW5zO1xuICAgICAgICB0aGlzLnR5cGUgPSAnbGFzdCc7XG4gICAgICAgIHRoaXMub3V0ID0gbnVsbDtcbiAgICAgICAgdGhpcy5oYXMgPSBmYWxzZTtcbiAgICAgICAgdGhpcy52YWwgPSBlbXB0eTtcbiAgICB9XG4gICAgTGFzdE9wZXJhdG9yLnByb3RvdHlwZS5fc3RhcnQgPSBmdW5jdGlvbiAob3V0KSB7XG4gICAgICAgIHRoaXMub3V0ID0gb3V0O1xuICAgICAgICB0aGlzLmlucy5fYWRkKHRoaXMpO1xuICAgIH07XG4gICAgTGFzdE9wZXJhdG9yLnByb3RvdHlwZS5fc3RvcCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5pbnMuX3JlbW92ZSh0aGlzKTtcbiAgICAgICAgdGhpcy5vdXQgPSBudWxsO1xuICAgICAgICB0aGlzLmhhcyA9IGZhbHNlO1xuICAgICAgICB0aGlzLnZhbCA9IGVtcHR5O1xuICAgIH07XG4gICAgTGFzdE9wZXJhdG9yLnByb3RvdHlwZS5fbiA9IGZ1bmN0aW9uICh0KSB7XG4gICAgICAgIHRoaXMuaGFzID0gdHJ1ZTtcbiAgICAgICAgdGhpcy52YWwgPSB0O1xuICAgIH07XG4gICAgTGFzdE9wZXJhdG9yLnByb3RvdHlwZS5fZSA9IGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgdmFyIHUgPSB0aGlzLm91dDtcbiAgICAgICAgaWYgKCF1KVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB1Ll9lKGVycik7XG4gICAgfTtcbiAgICBMYXN0T3BlcmF0b3IucHJvdG90eXBlLl9jID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgdSA9IHRoaXMub3V0O1xuICAgICAgICBpZiAoIXUpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIGlmICh0aGlzLmhhcykge1xuICAgICAgICAgICAgdS5fbih0aGlzLnZhbCk7XG4gICAgICAgICAgICB1Ll9jKCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB1Ll9lKCdUT0RPIHNob3cgcHJvcGVyIGVycm9yJyk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHJldHVybiBMYXN0T3BlcmF0b3I7XG59KCkpO1xuZXhwb3J0cy5MYXN0T3BlcmF0b3IgPSBMYXN0T3BlcmF0b3I7XG52YXIgTWFwRmxhdHRlbklubmVyID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBNYXBGbGF0dGVuSW5uZXIob3V0LCBvcCkge1xuICAgICAgICB0aGlzLm91dCA9IG91dDtcbiAgICAgICAgdGhpcy5vcCA9IG9wO1xuICAgIH1cbiAgICBNYXBGbGF0dGVuSW5uZXIucHJvdG90eXBlLl9uID0gZnVuY3Rpb24gKHIpIHtcbiAgICAgICAgdGhpcy5vdXQuX24ocik7XG4gICAgfTtcbiAgICBNYXBGbGF0dGVuSW5uZXIucHJvdG90eXBlLl9lID0gZnVuY3Rpb24gKGVycikge1xuICAgICAgICB0aGlzLm91dC5fZShlcnIpO1xuICAgIH07XG4gICAgTWFwRmxhdHRlbklubmVyLnByb3RvdHlwZS5fYyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5vcC5pbm5lciA9IG51bGw7XG4gICAgICAgIHRoaXMub3AubGVzcygpO1xuICAgIH07XG4gICAgcmV0dXJuIE1hcEZsYXR0ZW5Jbm5lcjtcbn0oKSk7XG52YXIgTWFwRmxhdHRlbk9wZXJhdG9yID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBNYXBGbGF0dGVuT3BlcmF0b3IobWFwT3ApIHtcbiAgICAgICAgdGhpcy5tYXBPcCA9IG1hcE9wO1xuICAgICAgICB0aGlzLmlubmVyID0gbnVsbDsgLy8gQ3VycmVudCBpbm5lciBTdHJlYW1cbiAgICAgICAgdGhpcy5pbCA9IG51bGw7IC8vIEN1cnJlbnQgaW5uZXIgSW50ZXJuYWxMaXN0ZW5lclxuICAgICAgICB0aGlzLm9wZW4gPSB0cnVlO1xuICAgICAgICB0aGlzLm91dCA9IG51bGw7XG4gICAgICAgIHRoaXMudHlwZSA9IG1hcE9wLnR5cGUgKyBcIitmbGF0dGVuXCI7XG4gICAgICAgIHRoaXMuaW5zID0gbWFwT3AuaW5zO1xuICAgIH1cbiAgICBNYXBGbGF0dGVuT3BlcmF0b3IucHJvdG90eXBlLl9zdGFydCA9IGZ1bmN0aW9uIChvdXQpIHtcbiAgICAgICAgdGhpcy5vdXQgPSBvdXQ7XG4gICAgICAgIHRoaXMubWFwT3AuaW5zLl9hZGQodGhpcyk7XG4gICAgfTtcbiAgICBNYXBGbGF0dGVuT3BlcmF0b3IucHJvdG90eXBlLl9zdG9wID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLm1hcE9wLmlucy5fcmVtb3ZlKHRoaXMpO1xuICAgICAgICB0aGlzLmlubmVyID0gbnVsbDtcbiAgICAgICAgdGhpcy5pbCA9IG51bGw7XG4gICAgICAgIHRoaXMub3BlbiA9IHRydWU7XG4gICAgICAgIHRoaXMub3V0ID0gbnVsbDtcbiAgICB9O1xuICAgIE1hcEZsYXR0ZW5PcGVyYXRvci5wcm90b3R5cGUubGVzcyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKCF0aGlzLm9wZW4gJiYgIXRoaXMuaW5uZXIpIHtcbiAgICAgICAgICAgIHZhciB1ID0gdGhpcy5vdXQ7XG4gICAgICAgICAgICBpZiAoIXUpXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgdS5fYygpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBNYXBGbGF0dGVuT3BlcmF0b3IucHJvdG90eXBlLl9uID0gZnVuY3Rpb24gKHYpIHtcbiAgICAgICAgdmFyIHUgPSB0aGlzLm91dDtcbiAgICAgICAgaWYgKCF1KVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB2YXIgX2EgPSB0aGlzLCBpbm5lciA9IF9hLmlubmVyLCBpbCA9IF9hLmlsO1xuICAgICAgICBpZiAoaW5uZXIgJiYgaWwpXG4gICAgICAgICAgICBpbm5lci5fcmVtb3ZlKGlsKTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICh0aGlzLmlubmVyID0gdGhpcy5tYXBPcC5wcm9qZWN0KHYpKS5fYWRkKHRoaXMuaWwgPSBuZXcgTWFwRmxhdHRlbklubmVyKHUsIHRoaXMpKTtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaCAoZSkge1xuICAgICAgICAgICAgdS5fZShlKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgTWFwRmxhdHRlbk9wZXJhdG9yLnByb3RvdHlwZS5fZSA9IGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgdmFyIHUgPSB0aGlzLm91dDtcbiAgICAgICAgaWYgKCF1KVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB1Ll9lKGVycik7XG4gICAgfTtcbiAgICBNYXBGbGF0dGVuT3BlcmF0b3IucHJvdG90eXBlLl9jID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLm9wZW4gPSBmYWxzZTtcbiAgICAgICAgdGhpcy5sZXNzKCk7XG4gICAgfTtcbiAgICByZXR1cm4gTWFwRmxhdHRlbk9wZXJhdG9yO1xufSgpKTtcbmV4cG9ydHMuTWFwRmxhdHRlbk9wZXJhdG9yID0gTWFwRmxhdHRlbk9wZXJhdG9yO1xudmFyIE1hcE9wZXJhdG9yID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBNYXBPcGVyYXRvcihwcm9qZWN0LCBpbnMpIHtcbiAgICAgICAgdGhpcy5wcm9qZWN0ID0gcHJvamVjdDtcbiAgICAgICAgdGhpcy5pbnMgPSBpbnM7XG4gICAgICAgIHRoaXMudHlwZSA9ICdtYXAnO1xuICAgICAgICB0aGlzLm91dCA9IG51bGw7XG4gICAgfVxuICAgIE1hcE9wZXJhdG9yLnByb3RvdHlwZS5fc3RhcnQgPSBmdW5jdGlvbiAob3V0KSB7XG4gICAgICAgIHRoaXMub3V0ID0gb3V0O1xuICAgICAgICB0aGlzLmlucy5fYWRkKHRoaXMpO1xuICAgIH07XG4gICAgTWFwT3BlcmF0b3IucHJvdG90eXBlLl9zdG9wID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLmlucy5fcmVtb3ZlKHRoaXMpO1xuICAgICAgICB0aGlzLm91dCA9IG51bGw7XG4gICAgfTtcbiAgICBNYXBPcGVyYXRvci5wcm90b3R5cGUuX24gPSBmdW5jdGlvbiAodCkge1xuICAgICAgICB2YXIgdSA9IHRoaXMub3V0O1xuICAgICAgICBpZiAoIXUpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICB1Ll9uKHRoaXMucHJvamVjdCh0KSk7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIHUuX2UoZSk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIE1hcE9wZXJhdG9yLnByb3RvdHlwZS5fZSA9IGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgdmFyIHUgPSB0aGlzLm91dDtcbiAgICAgICAgaWYgKCF1KVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB1Ll9lKGVycik7XG4gICAgfTtcbiAgICBNYXBPcGVyYXRvci5wcm90b3R5cGUuX2MgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciB1ID0gdGhpcy5vdXQ7XG4gICAgICAgIGlmICghdSlcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgdS5fYygpO1xuICAgIH07XG4gICAgcmV0dXJuIE1hcE9wZXJhdG9yO1xufSgpKTtcbmV4cG9ydHMuTWFwT3BlcmF0b3IgPSBNYXBPcGVyYXRvcjtcbnZhciBGaWx0ZXJNYXBPcGVyYXRvciA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKEZpbHRlck1hcE9wZXJhdG9yLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIEZpbHRlck1hcE9wZXJhdG9yKHBhc3NlcywgcHJvamVjdCwgaW5zKSB7XG4gICAgICAgIF9zdXBlci5jYWxsKHRoaXMsIHByb2plY3QsIGlucyk7XG4gICAgICAgIHRoaXMucGFzc2VzID0gcGFzc2VzO1xuICAgICAgICB0aGlzLnR5cGUgPSAnZmlsdGVyK21hcCc7XG4gICAgfVxuICAgIEZpbHRlck1hcE9wZXJhdG9yLnByb3RvdHlwZS5fbiA9IGZ1bmN0aW9uICh2KSB7XG4gICAgICAgIGlmICh0aGlzLnBhc3Nlcyh2KSkge1xuICAgICAgICAgICAgX3N1cGVyLnByb3RvdHlwZS5fbi5jYWxsKHRoaXMsIHYpO1xuICAgICAgICB9XG4gICAgICAgIDtcbiAgICB9O1xuICAgIHJldHVybiBGaWx0ZXJNYXBPcGVyYXRvcjtcbn0oTWFwT3BlcmF0b3IpKTtcbmV4cG9ydHMuRmlsdGVyTWFwT3BlcmF0b3IgPSBGaWx0ZXJNYXBPcGVyYXRvcjtcbnZhciBSZXBsYWNlRXJyb3JPcGVyYXRvciA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gUmVwbGFjZUVycm9yT3BlcmF0b3IoZm4sIGlucykge1xuICAgICAgICB0aGlzLmZuID0gZm47XG4gICAgICAgIHRoaXMuaW5zID0gaW5zO1xuICAgICAgICB0aGlzLnR5cGUgPSAncmVwbGFjZUVycm9yJztcbiAgICAgICAgdGhpcy5vdXQgPSBlbXB0eTtcbiAgICB9XG4gICAgUmVwbGFjZUVycm9yT3BlcmF0b3IucHJvdG90eXBlLl9zdGFydCA9IGZ1bmN0aW9uIChvdXQpIHtcbiAgICAgICAgdGhpcy5vdXQgPSBvdXQ7XG4gICAgICAgIHRoaXMuaW5zLl9hZGQodGhpcyk7XG4gICAgfTtcbiAgICBSZXBsYWNlRXJyb3JPcGVyYXRvci5wcm90b3R5cGUuX3N0b3AgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuaW5zLl9yZW1vdmUodGhpcyk7XG4gICAgICAgIHRoaXMub3V0ID0gbnVsbDtcbiAgICB9O1xuICAgIFJlcGxhY2VFcnJvck9wZXJhdG9yLnByb3RvdHlwZS5fbiA9IGZ1bmN0aW9uICh0KSB7XG4gICAgICAgIHZhciB1ID0gdGhpcy5vdXQ7XG4gICAgICAgIGlmICghdSlcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgdS5fbih0KTtcbiAgICB9O1xuICAgIFJlcGxhY2VFcnJvck9wZXJhdG9yLnByb3RvdHlwZS5fZSA9IGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgdmFyIHUgPSB0aGlzLm91dDtcbiAgICAgICAgaWYgKCF1KVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgdGhpcy5pbnMuX3JlbW92ZSh0aGlzKTtcbiAgICAgICAgICAgICh0aGlzLmlucyA9IHRoaXMuZm4oZXJyKSkuX2FkZCh0aGlzKTtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaCAoZSkge1xuICAgICAgICAgICAgdS5fZShlKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgUmVwbGFjZUVycm9yT3BlcmF0b3IucHJvdG90eXBlLl9jID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgdSA9IHRoaXMub3V0O1xuICAgICAgICBpZiAoIXUpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIHUuX2MoKTtcbiAgICB9O1xuICAgIHJldHVybiBSZXBsYWNlRXJyb3JPcGVyYXRvcjtcbn0oKSk7XG5leHBvcnRzLlJlcGxhY2VFcnJvck9wZXJhdG9yID0gUmVwbGFjZUVycm9yT3BlcmF0b3I7XG52YXIgU3RhcnRXaXRoT3BlcmF0b3IgPSAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIFN0YXJ0V2l0aE9wZXJhdG9yKGlucywgdmFsdWUpIHtcbiAgICAgICAgdGhpcy5pbnMgPSBpbnM7XG4gICAgICAgIHRoaXMudmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgdGhpcy50eXBlID0gJ3N0YXJ0V2l0aCc7XG4gICAgICAgIHRoaXMub3V0ID0gZXhwb3J0cy5lbXB0eUxpc3RlbmVyO1xuICAgIH1cbiAgICBTdGFydFdpdGhPcGVyYXRvci5wcm90b3R5cGUuX3N0YXJ0ID0gZnVuY3Rpb24gKG91dCkge1xuICAgICAgICB0aGlzLm91dCA9IG91dDtcbiAgICAgICAgdGhpcy5vdXQuX24odGhpcy52YWx1ZSk7XG4gICAgICAgIHRoaXMuaW5zLl9hZGQob3V0KTtcbiAgICB9O1xuICAgIFN0YXJ0V2l0aE9wZXJhdG9yLnByb3RvdHlwZS5fc3RvcCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5pbnMuX3JlbW92ZSh0aGlzLm91dCk7XG4gICAgICAgIHRoaXMub3V0ID0gbnVsbDtcbiAgICB9O1xuICAgIHJldHVybiBTdGFydFdpdGhPcGVyYXRvcjtcbn0oKSk7XG5leHBvcnRzLlN0YXJ0V2l0aE9wZXJhdG9yID0gU3RhcnRXaXRoT3BlcmF0b3I7XG52YXIgVGFrZU9wZXJhdG9yID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBUYWtlT3BlcmF0b3IobWF4LCBpbnMpIHtcbiAgICAgICAgdGhpcy5tYXggPSBtYXg7XG4gICAgICAgIHRoaXMuaW5zID0gaW5zO1xuICAgICAgICB0aGlzLnR5cGUgPSAndGFrZSc7XG4gICAgICAgIHRoaXMub3V0ID0gbnVsbDtcbiAgICAgICAgdGhpcy50YWtlbiA9IDA7XG4gICAgfVxuICAgIFRha2VPcGVyYXRvci5wcm90b3R5cGUuX3N0YXJ0ID0gZnVuY3Rpb24gKG91dCkge1xuICAgICAgICB0aGlzLm91dCA9IG91dDtcbiAgICAgICAgdGhpcy5pbnMuX2FkZCh0aGlzKTtcbiAgICB9O1xuICAgIFRha2VPcGVyYXRvci5wcm90b3R5cGUuX3N0b3AgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuaW5zLl9yZW1vdmUodGhpcyk7XG4gICAgICAgIHRoaXMub3V0ID0gbnVsbDtcbiAgICAgICAgdGhpcy50YWtlbiA9IDA7XG4gICAgfTtcbiAgICBUYWtlT3BlcmF0b3IucHJvdG90eXBlLl9uID0gZnVuY3Rpb24gKHQpIHtcbiAgICAgICAgdmFyIHUgPSB0aGlzLm91dDtcbiAgICAgICAgaWYgKCF1KVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICBpZiAodGhpcy50YWtlbisrIDwgdGhpcy5tYXggLSAxKSB7XG4gICAgICAgICAgICB1Ll9uKHQpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdS5fbih0KTtcbiAgICAgICAgICAgIHUuX2MoKTtcbiAgICAgICAgICAgIHRoaXMuX3N0b3AoKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgVGFrZU9wZXJhdG9yLnByb3RvdHlwZS5fZSA9IGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgdmFyIHUgPSB0aGlzLm91dDtcbiAgICAgICAgaWYgKCF1KVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB1Ll9lKGVycik7XG4gICAgfTtcbiAgICBUYWtlT3BlcmF0b3IucHJvdG90eXBlLl9jID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgdSA9IHRoaXMub3V0O1xuICAgICAgICBpZiAoIXUpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIHUuX2MoKTtcbiAgICB9O1xuICAgIHJldHVybiBUYWtlT3BlcmF0b3I7XG59KCkpO1xuZXhwb3J0cy5UYWtlT3BlcmF0b3IgPSBUYWtlT3BlcmF0b3I7XG52YXIgU3RyZWFtID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBTdHJlYW0ocHJvZHVjZXIpIHtcbiAgICAgICAgdGhpcy5fc3RvcElEID0gZW1wdHk7XG4gICAgICAgIHRoaXMuX3Byb2QgPSBwcm9kdWNlcjtcbiAgICAgICAgdGhpcy5faWxzID0gW107XG4gICAgfVxuICAgIFN0cmVhbS5wcm90b3R5cGUuX24gPSBmdW5jdGlvbiAodCkge1xuICAgICAgICB2YXIgYSA9IHRoaXMuX2lscztcbiAgICAgICAgdmFyIEwgPSBhLmxlbmd0aDtcbiAgICAgICAgaWYgKEwgPT0gMSlcbiAgICAgICAgICAgIGFbMF0uX24odCk7XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdmFyIGIgPSBjb3B5KGEpO1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBMOyBpKyspXG4gICAgICAgICAgICAgICAgYltpXS5fbih0KTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgU3RyZWFtLnByb3RvdHlwZS5fZSA9IGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgdmFyIGEgPSB0aGlzLl9pbHM7XG4gICAgICAgIHZhciBMID0gYS5sZW5ndGg7XG4gICAgICAgIGlmIChMID09IDEpXG4gICAgICAgICAgICBhWzBdLl9lKGVycik7XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdmFyIGIgPSBjb3B5KGEpO1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBMOyBpKyspXG4gICAgICAgICAgICAgICAgYltpXS5fZShlcnIpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX3goKTtcbiAgICB9O1xuICAgIFN0cmVhbS5wcm90b3R5cGUuX2MgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBhID0gdGhpcy5faWxzO1xuICAgICAgICB2YXIgTCA9IGEubGVuZ3RoO1xuICAgICAgICBpZiAoTCA9PSAxKVxuICAgICAgICAgICAgYVswXS5fYygpO1xuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHZhciBiID0gY29weShhKTtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgTDsgaSsrKVxuICAgICAgICAgICAgICAgIGJbaV0uX2MoKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl94KCk7XG4gICAgfTtcbiAgICBTdHJlYW0ucHJvdG90eXBlLl94ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAodGhpcy5faWxzLmxlbmd0aCA9PT0gMClcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgaWYgKHRoaXMuX3Byb2QpXG4gICAgICAgICAgICB0aGlzLl9wcm9kLl9zdG9wKCk7XG4gICAgICAgIHRoaXMuX2lscyA9IFtdO1xuICAgIH07XG4gICAgLyoqXG4gICAgICogQWRkcyBhIExpc3RlbmVyIHRvIHRoZSBTdHJlYW0uXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge0xpc3RlbmVyPFQ+fSBsaXN0ZW5lclxuICAgICAqL1xuICAgIFN0cmVhbS5wcm90b3R5cGUuYWRkTGlzdGVuZXIgPSBmdW5jdGlvbiAobGlzdGVuZXIpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBsaXN0ZW5lci5uZXh0ICE9PSAnZnVuY3Rpb24nXG4gICAgICAgICAgICB8fCB0eXBlb2YgbGlzdGVuZXIuZXJyb3IgIT09ICdmdW5jdGlvbidcbiAgICAgICAgICAgIHx8IHR5cGVvZiBsaXN0ZW5lci5jb21wbGV0ZSAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdzdHJlYW0uYWRkTGlzdGVuZXIoKSByZXF1aXJlcyBhbGwgdGhyZWUgbmV4dCwgZXJyb3IsICcgK1xuICAgICAgICAgICAgICAgICdhbmQgY29tcGxldGUgZnVuY3Rpb25zLicpO1xuICAgICAgICB9XG4gICAgICAgIGxpc3RlbmVyLl9uID0gbGlzdGVuZXIubmV4dDtcbiAgICAgICAgbGlzdGVuZXIuX2UgPSBsaXN0ZW5lci5lcnJvcjtcbiAgICAgICAgbGlzdGVuZXIuX2MgPSBsaXN0ZW5lci5jb21wbGV0ZTtcbiAgICAgICAgdGhpcy5fYWRkKGxpc3RlbmVyKTtcbiAgICB9O1xuICAgIC8qKlxuICAgICAqIFJlbW92ZXMgYSBMaXN0ZW5lciBmcm9tIHRoZSBTdHJlYW0sIGFzc3VtaW5nIHRoZSBMaXN0ZW5lciB3YXMgYWRkZWQgdG8gaXQuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge0xpc3RlbmVyPFQ+fSBsaXN0ZW5lclxuICAgICAqL1xuICAgIFN0cmVhbS5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXIgPSBmdW5jdGlvbiAobGlzdGVuZXIpIHtcbiAgICAgICAgdGhpcy5fcmVtb3ZlKGxpc3RlbmVyKTtcbiAgICB9O1xuICAgIFN0cmVhbS5wcm90b3R5cGUuX2FkZCA9IGZ1bmN0aW9uIChpbCkge1xuICAgICAgICB2YXIgYSA9IHRoaXMuX2lscztcbiAgICAgICAgYS5wdXNoKGlsKTtcbiAgICAgICAgaWYgKGEubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5fc3RvcElEICE9PSBlbXB0eSkge1xuICAgICAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aGlzLl9zdG9wSUQpO1xuICAgICAgICAgICAgICAgIHRoaXMuX3N0b3BJRCA9IGVtcHR5O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIHAgPSB0aGlzLl9wcm9kO1xuICAgICAgICAgICAgaWYgKHApXG4gICAgICAgICAgICAgICAgcC5fc3RhcnQodGhpcyk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIFN0cmVhbS5wcm90b3R5cGUuX3JlbW92ZSA9IGZ1bmN0aW9uIChpbCkge1xuICAgICAgICB2YXIgYSA9IHRoaXMuX2lscztcbiAgICAgICAgdmFyIGkgPSBhLmluZGV4T2YoaWwpO1xuICAgICAgICBpZiAoaSA+IC0xKSB7XG4gICAgICAgICAgICBhLnNwbGljZShpLCAxKTtcbiAgICAgICAgICAgIHZhciBwXzEgPSB0aGlzLl9wcm9kO1xuICAgICAgICAgICAgaWYgKHBfMSAmJiBhLmxlbmd0aCA8PSAwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fc3RvcElEID0gc2V0VGltZW91dChmdW5jdGlvbiAoKSB7IHJldHVybiBwXzEuX3N0b3AoKTsgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuICAgIFN0cmVhbS5wcm90b3R5cGUuY3RvciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMgaW5zdGFuY2VvZiBNZW1vcnlTdHJlYW0gPyBNZW1vcnlTdHJlYW0gOiBTdHJlYW07XG4gICAgfTtcbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGEgbmV3IFN0cmVhbSBnaXZlbiBhIFByb2R1Y2VyLlxuICAgICAqXG4gICAgICogQGZhY3RvcnkgdHJ1ZVxuICAgICAqIEBwYXJhbSB7UHJvZHVjZXJ9IHByb2R1Y2VyIEFuIG9wdGlvbmFsIFByb2R1Y2VyIHRoYXQgZGljdGF0ZXMgaG93IHRvXG4gICAgICogc3RhcnQsIGdlbmVyYXRlIGV2ZW50cywgYW5kIHN0b3AgdGhlIFN0cmVhbS5cbiAgICAgKiBAcmV0dXJuIHtTdHJlYW19XG4gICAgICovXG4gICAgU3RyZWFtLmNyZWF0ZSA9IGZ1bmN0aW9uIChwcm9kdWNlcikge1xuICAgICAgICBpZiAocHJvZHVjZXIpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgcHJvZHVjZXIuc3RhcnQgIT09ICdmdW5jdGlvbidcbiAgICAgICAgICAgICAgICB8fCB0eXBlb2YgcHJvZHVjZXIuc3RvcCAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcigncHJvZHVjZXIgcmVxdWlyZXMgYm90aCBzdGFydCBhbmQgc3RvcCBmdW5jdGlvbnMnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGludGVybmFsaXplUHJvZHVjZXIocHJvZHVjZXIpOyAvLyBtdXRhdGVzIHRoZSBpbnB1dFxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZXcgU3RyZWFtKHByb2R1Y2VyKTtcbiAgICB9O1xuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYSBuZXcgTWVtb3J5U3RyZWFtIGdpdmVuIGEgUHJvZHVjZXIuXG4gICAgICpcbiAgICAgKiBAZmFjdG9yeSB0cnVlXG4gICAgICogQHBhcmFtIHtQcm9kdWNlcn0gcHJvZHVjZXIgQW4gb3B0aW9uYWwgUHJvZHVjZXIgdGhhdCBkaWN0YXRlcyBob3cgdG9cbiAgICAgKiBzdGFydCwgZ2VuZXJhdGUgZXZlbnRzLCBhbmQgc3RvcCB0aGUgU3RyZWFtLlxuICAgICAqIEByZXR1cm4ge01lbW9yeVN0cmVhbX1cbiAgICAgKi9cbiAgICBTdHJlYW0uY3JlYXRlV2l0aE1lbW9yeSA9IGZ1bmN0aW9uIChwcm9kdWNlcikge1xuICAgICAgICBpZiAocHJvZHVjZXIpIHtcbiAgICAgICAgICAgIGludGVybmFsaXplUHJvZHVjZXIocHJvZHVjZXIpOyAvLyBtdXRhdGVzIHRoZSBpbnB1dFxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZXcgTWVtb3J5U3RyZWFtKHByb2R1Y2VyKTtcbiAgICB9O1xuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYSBuZXcgTWltaWNTdHJlYW0sIHdoaWNoIGNhbiBgaW1pdGF0ZWAgYW5vdGhlciBTdHJlYW0uIE9ubHkgYVxuICAgICAqIE1pbWljU3RyZWFtIGhhcyB0aGUgYGltaXRhdGUoKWAgbWV0aG9kLlxuICAgICAqXG4gICAgICogQGZhY3RvcnkgdHJ1ZVxuICAgICAqIEByZXR1cm4ge01pbWljU3RyZWFtfVxuICAgICAqL1xuICAgIFN0cmVhbS5jcmVhdGVNaW1pYyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBNaW1pY1N0cmVhbSgpO1xuICAgIH07XG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhIFN0cmVhbSB0aGF0IGRvZXMgbm90aGluZyB3aGVuIHN0YXJ0ZWQuIEl0IG5ldmVyIGVtaXRzIGFueSBldmVudC5cbiAgICAgKlxuICAgICAqIE1hcmJsZSBkaWFncmFtOlxuICAgICAqXG4gICAgICogYGBgdGV4dFxuICAgICAqICAgICAgICAgIG5ldmVyXG4gICAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgKiBgYGBcbiAgICAgKlxuICAgICAqIEBmYWN0b3J5IHRydWVcbiAgICAgKiBAcmV0dXJuIHtTdHJlYW19XG4gICAgICovXG4gICAgU3RyZWFtLm5ldmVyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gbmV3IFN0cmVhbSh7IF9zdGFydDogbm9vcCwgX3N0b3A6IG5vb3AgfSk7XG4gICAgfTtcbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGEgU3RyZWFtIHRoYXQgaW1tZWRpYXRlbHkgZW1pdHMgdGhlIFwiY29tcGxldGVcIiBub3RpZmljYXRpb24gd2hlblxuICAgICAqIHN0YXJ0ZWQsIGFuZCB0aGF0J3MgaXQuXG4gICAgICpcbiAgICAgKiBNYXJibGUgZGlhZ3JhbTpcbiAgICAgKlxuICAgICAqIGBgYHRleHRcbiAgICAgKiBlbXB0eVxuICAgICAqIC18XG4gICAgICogYGBgXG4gICAgICpcbiAgICAgKiBAZmFjdG9yeSB0cnVlXG4gICAgICogQHJldHVybiB7U3RyZWFtfVxuICAgICAqL1xuICAgIFN0cmVhbS5lbXB0eSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBTdHJlYW0oe1xuICAgICAgICAgICAgX3N0YXJ0OiBmdW5jdGlvbiAoaWwpIHsgaWwuX2MoKTsgfSxcbiAgICAgICAgICAgIF9zdG9wOiBub29wLFxuICAgICAgICB9KTtcbiAgICB9O1xuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYSBTdHJlYW0gdGhhdCBpbW1lZGlhdGVseSBlbWl0cyBhbiBcImVycm9yXCIgbm90aWZpY2F0aW9uIHdpdGggdGhlXG4gICAgICogdmFsdWUgeW91IHBhc3NlZCBhcyB0aGUgYGVycm9yYCBhcmd1bWVudCB3aGVuIHRoZSBzdHJlYW0gc3RhcnRzLCBhbmQgdGhhdCdzXG4gICAgICogaXQuXG4gICAgICpcbiAgICAgKiBNYXJibGUgZGlhZ3JhbTpcbiAgICAgKlxuICAgICAqIGBgYHRleHRcbiAgICAgKiB0aHJvdyhYKVxuICAgICAqIC1YXG4gICAgICogYGBgXG4gICAgICpcbiAgICAgKiBAZmFjdG9yeSB0cnVlXG4gICAgICogQHBhcmFtIGVycm9yIFRoZSBlcnJvciBldmVudCB0byBlbWl0IG9uIHRoZSBjcmVhdGVkIHN0cmVhbS5cbiAgICAgKiBAcmV0dXJuIHtTdHJlYW19XG4gICAgICovXG4gICAgU3RyZWFtLnRocm93ID0gZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgICAgIHJldHVybiBuZXcgU3RyZWFtKHtcbiAgICAgICAgICAgIF9zdGFydDogZnVuY3Rpb24gKGlsKSB7IGlsLl9lKGVycm9yKTsgfSxcbiAgICAgICAgICAgIF9zdG9wOiBub29wLFxuICAgICAgICB9KTtcbiAgICB9O1xuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYSBTdHJlYW0gdGhhdCBpbW1lZGlhdGVseSBlbWl0cyB0aGUgYXJndW1lbnRzIHRoYXQgeW91IGdpdmUgdG9cbiAgICAgKiAqb2YqLCB0aGVuIGNvbXBsZXRlcy5cbiAgICAgKlxuICAgICAqIE1hcmJsZSBkaWFncmFtOlxuICAgICAqXG4gICAgICogYGBgdGV4dFxuICAgICAqIG9mKDEsMiwzKVxuICAgICAqIDEyM3xcbiAgICAgKiBgYGBcbiAgICAgKlxuICAgICAqIEBmYWN0b3J5IHRydWVcbiAgICAgKiBAcGFyYW0gYSBUaGUgZmlyc3QgdmFsdWUgeW91IHdhbnQgdG8gZW1pdCBhcyBhbiBldmVudCBvbiB0aGUgc3RyZWFtLlxuICAgICAqIEBwYXJhbSBiIFRoZSBzZWNvbmQgdmFsdWUgeW91IHdhbnQgdG8gZW1pdCBhcyBhbiBldmVudCBvbiB0aGUgc3RyZWFtLiBPbmVcbiAgICAgKiBvciBtb3JlIG9mIHRoZXNlIHZhbHVlcyBtYXkgYmUgZ2l2ZW4gYXMgYXJndW1lbnRzLlxuICAgICAqIEByZXR1cm4ge1N0cmVhbX1cbiAgICAgKi9cbiAgICBTdHJlYW0ub2YgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBpdGVtcyA9IFtdO1xuICAgICAgICBmb3IgKHZhciBfaSA9IDA7IF9pIDwgYXJndW1lbnRzLmxlbmd0aDsgX2krKykge1xuICAgICAgICAgICAgaXRlbXNbX2kgLSAwXSA9IGFyZ3VtZW50c1tfaV07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIFN0cmVhbS5mcm9tQXJyYXkoaXRlbXMpO1xuICAgIH07XG4gICAgLyoqXG4gICAgICogQ29udmVydHMgYW4gYXJyYXkgdG8gYSBzdHJlYW0uIFRoZSByZXR1cm5lZCBzdHJlYW0gd2lsbCBlbWl0IHN5bmNocm9ub3VzbHlcbiAgICAgKiBhbGwgdGhlIGl0ZW1zIGluIHRoZSBhcnJheSwgYW5kIHRoZW4gY29tcGxldGUuXG4gICAgICpcbiAgICAgKiBNYXJibGUgZGlhZ3JhbTpcbiAgICAgKlxuICAgICAqIGBgYHRleHRcbiAgICAgKiBmcm9tQXJyYXkoWzEsMiwzXSlcbiAgICAgKiAxMjN8XG4gICAgICogYGBgXG4gICAgICpcbiAgICAgKiBAZmFjdG9yeSB0cnVlXG4gICAgICogQHBhcmFtIHtBcnJheX0gYXJyYXkgVGhlIGFycmF5IHRvIGJlIGNvbnZlcnRlZCBhcyBhIHN0cmVhbS5cbiAgICAgKiBAcmV0dXJuIHtTdHJlYW19XG4gICAgICovXG4gICAgU3RyZWFtLmZyb21BcnJheSA9IGZ1bmN0aW9uIChhcnJheSkge1xuICAgICAgICByZXR1cm4gbmV3IFN0cmVhbShuZXcgRnJvbUFycmF5UHJvZHVjZXIoYXJyYXkpKTtcbiAgICB9O1xuICAgIC8qKlxuICAgICAqIENvbnZlcnRzIGEgcHJvbWlzZSB0byBhIHN0cmVhbS4gVGhlIHJldHVybmVkIHN0cmVhbSB3aWxsIGVtaXQgdGhlIHJlc29sdmVkXG4gICAgICogdmFsdWUgb2YgdGhlIHByb21pc2UsIGFuZCB0aGVuIGNvbXBsZXRlLiBIb3dldmVyLCBpZiB0aGUgcHJvbWlzZSBpc1xuICAgICAqIHJlamVjdGVkLCB0aGUgc3RyZWFtIHdpbGwgZW1pdCB0aGUgY29ycmVzcG9uZGluZyBlcnJvci5cbiAgICAgKlxuICAgICAqIE1hcmJsZSBkaWFncmFtOlxuICAgICAqXG4gICAgICogYGBgdGV4dFxuICAgICAqIGZyb21Qcm9taXNlKCAtLS0tNDIgKVxuICAgICAqIC0tLS0tLS0tLS0tLS0tLS0tNDJ8XG4gICAgICogYGBgXG4gICAgICpcbiAgICAgKiBAZmFjdG9yeSB0cnVlXG4gICAgICogQHBhcmFtIHtQcm9taXNlfSBwcm9taXNlIFRoZSBwcm9taXNlIHRvIGJlIGNvbnZlcnRlZCBhcyBhIHN0cmVhbS5cbiAgICAgKiBAcmV0dXJuIHtTdHJlYW19XG4gICAgICovXG4gICAgU3RyZWFtLmZyb21Qcm9taXNlID0gZnVuY3Rpb24gKHByb21pc2UpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBTdHJlYW0obmV3IEZyb21Qcm9taXNlUHJvZHVjZXIocHJvbWlzZSkpO1xuICAgIH07XG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhIHN0cmVhbSB0aGF0IHBlcmlvZGljYWxseSBlbWl0cyBpbmNyZW1lbnRhbCBudW1iZXJzLCBldmVyeVxuICAgICAqIGBwZXJpb2RgIG1pbGxpc2Vjb25kcy5cbiAgICAgKlxuICAgICAqIE1hcmJsZSBkaWFncmFtOlxuICAgICAqXG4gICAgICogYGBgdGV4dFxuICAgICAqICAgICBwZXJpb2RpYygxMDAwKVxuICAgICAqIC0tLTAtLS0xLS0tMi0tLTMtLS00LS0tLi4uXG4gICAgICogYGBgXG4gICAgICpcbiAgICAgKiBAZmFjdG9yeSB0cnVlXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHBlcmlvZCBUaGUgaW50ZXJ2YWwgaW4gbWlsbGlzZWNvbmRzIHRvIHVzZSBhcyBhIHJhdGUgb2ZcbiAgICAgKiBlbWlzc2lvbi5cbiAgICAgKiBAcmV0dXJuIHtTdHJlYW19XG4gICAgICovXG4gICAgU3RyZWFtLnBlcmlvZGljID0gZnVuY3Rpb24gKHBlcmlvZCkge1xuICAgICAgICByZXR1cm4gbmV3IFN0cmVhbShuZXcgUGVyaW9kaWNQcm9kdWNlcihwZXJpb2QpKTtcbiAgICB9O1xuICAgIC8qKlxuICAgICAqIEJsZW5kcyBtdWx0aXBsZSBzdHJlYW1zIHRvZ2V0aGVyLCBlbWl0dGluZyBldmVudHMgZnJvbSBhbGwgb2YgdGhlbVxuICAgICAqIGNvbmN1cnJlbnRseS5cbiAgICAgKlxuICAgICAqICptZXJnZSogdGFrZXMgbXVsdGlwbGUgc3RyZWFtcyBhcyBhcmd1bWVudHMsIGFuZCBjcmVhdGVzIGEgc3RyZWFtIHRoYXRcbiAgICAgKiBpbWl0YXRlcyBlYWNoIG9mIHRoZSBhcmd1bWVudCBzdHJlYW1zLCBpbiBwYXJhbGxlbC5cbiAgICAgKlxuICAgICAqIE1hcmJsZSBkaWFncmFtOlxuICAgICAqXG4gICAgICogYGBgdGV4dFxuICAgICAqIC0tMS0tLS0yLS0tLS0zLS0tLS0tLS00LS0tXG4gICAgICogLS0tLWEtLS0tLWItLS0tYy0tLWQtLS0tLS1cbiAgICAgKiAgICAgICAgICAgIG1lcmdlXG4gICAgICogLS0xLWEtLTItLWItLTMtYy0tLWQtLTQtLS1cbiAgICAgKiBgYGBcbiAgICAgKlxuICAgICAqIEBmYWN0b3J5IHRydWVcbiAgICAgKiBAcGFyYW0ge1N0cmVhbX0gc3RyZWFtMSBBIHN0cmVhbSB0byBtZXJnZSB0b2dldGhlciB3aXRoIG90aGVyIHN0cmVhbXMuXG4gICAgICogQHBhcmFtIHtTdHJlYW19IHN0cmVhbTIgQSBzdHJlYW0gdG8gbWVyZ2UgdG9nZXRoZXIgd2l0aCBvdGhlciBzdHJlYW1zLiBUd29cbiAgICAgKiBvciBtb3JlIHN0cmVhbXMgbWF5IGJlIGdpdmVuIGFzIGFyZ3VtZW50cy5cbiAgICAgKiBAcmV0dXJuIHtTdHJlYW19XG4gICAgICovXG4gICAgU3RyZWFtLm1lcmdlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgc3RyZWFtcyA9IFtdO1xuICAgICAgICBmb3IgKHZhciBfaSA9IDA7IF9pIDwgYXJndW1lbnRzLmxlbmd0aDsgX2krKykge1xuICAgICAgICAgICAgc3RyZWFtc1tfaSAtIDBdID0gYXJndW1lbnRzW19pXTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbmV3IFN0cmVhbShuZXcgTWVyZ2VQcm9kdWNlcihzdHJlYW1zKSk7XG4gICAgfTtcbiAgICBTdHJlYW0ucHJvdG90eXBlLl9tYXAgPSBmdW5jdGlvbiAocHJvamVjdCkge1xuICAgICAgICB2YXIgcCA9IHRoaXMuX3Byb2Q7XG4gICAgICAgIHZhciBjdG9yID0gdGhpcy5jdG9yKCk7XG4gICAgICAgIGlmIChwIGluc3RhbmNlb2YgRmlsdGVyT3BlcmF0b3IpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgY3RvcihuZXcgRmlsdGVyTWFwT3BlcmF0b3IocC5wYXNzZXMsIHByb2plY3QsIHAuaW5zKSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHAgaW5zdGFuY2VvZiBGaWx0ZXJNYXBPcGVyYXRvcikge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBjdG9yKG5ldyBGaWx0ZXJNYXBPcGVyYXRvcihwLnBhc3NlcywgY29tcG9zZTIocHJvamVjdCwgcC5wcm9qZWN0KSwgcC5pbnMpKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocCBpbnN0YW5jZW9mIE1hcE9wZXJhdG9yKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IGN0b3IobmV3IE1hcE9wZXJhdG9yKGNvbXBvc2UyKHByb2plY3QsIHAucHJvamVjdCksIHAuaW5zKSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG5ldyBjdG9yKG5ldyBNYXBPcGVyYXRvcihwcm9qZWN0LCB0aGlzKSk7XG4gICAgfTtcbiAgICAvKipcbiAgICAgKiBUcmFuc2Zvcm1zIGVhY2ggZXZlbnQgZnJvbSB0aGUgaW5wdXQgU3RyZWFtIHRocm91Z2ggYSBgcHJvamVjdGAgZnVuY3Rpb24sXG4gICAgICogdG8gZ2V0IGEgU3RyZWFtIHRoYXQgZW1pdHMgdGhvc2UgdHJhbnNmb3JtZWQgZXZlbnRzLlxuICAgICAqXG4gICAgICogTWFyYmxlIGRpYWdyYW06XG4gICAgICpcbiAgICAgKiBgYGB0ZXh0XG4gICAgICogLS0xLS0tMy0tNS0tLS0tNy0tLS0tLVxuICAgICAqICAgIG1hcChpID0+IGkgKiAxMClcbiAgICAgKiAtLTEwLS0zMC01MC0tLS03MC0tLS0tXG4gICAgICogYGBgXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBwcm9qZWN0IEEgZnVuY3Rpb24gb2YgdHlwZSBgKHQ6IFQpID0+IFVgIHRoYXQgdGFrZXMgZXZlbnRcbiAgICAgKiBgdGAgb2YgdHlwZSBgVGAgZnJvbSB0aGUgaW5wdXQgU3RyZWFtIGFuZCBwcm9kdWNlcyBhbiBldmVudCBvZiB0eXBlIGBVYCwgdG9cbiAgICAgKiBiZSBlbWl0dGVkIG9uIHRoZSBvdXRwdXQgU3RyZWFtLlxuICAgICAqIEByZXR1cm4ge1N0cmVhbX1cbiAgICAgKi9cbiAgICBTdHJlYW0ucHJvdG90eXBlLm1hcCA9IGZ1bmN0aW9uIChwcm9qZWN0KSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9tYXAocHJvamVjdCk7XG4gICAgfTtcbiAgICAvKipcbiAgICAgKiBJdCdzIGxpa2UgYG1hcGAsIGJ1dCB0cmFuc2Zvcm1zIGVhY2ggaW5wdXQgZXZlbnQgdG8gYWx3YXlzIHRoZSBzYW1lXG4gICAgICogY29uc3RhbnQgdmFsdWUgb24gdGhlIG91dHB1dCBTdHJlYW0uXG4gICAgICpcbiAgICAgKiBNYXJibGUgZGlhZ3JhbTpcbiAgICAgKlxuICAgICAqIGBgYHRleHRcbiAgICAgKiAtLTEtLS0zLS01LS0tLS03LS0tLS1cbiAgICAgKiAgICAgICBtYXBUbygxMClcbiAgICAgKiAtLTEwLS0xMC0xMC0tLS0xMC0tLS1cbiAgICAgKiBgYGBcbiAgICAgKlxuICAgICAqIEBwYXJhbSBwcm9qZWN0ZWRWYWx1ZSBBIHZhbHVlIHRvIGVtaXQgb24gdGhlIG91dHB1dCBTdHJlYW0gd2hlbmV2ZXIgdGhlXG4gICAgICogaW5wdXQgU3RyZWFtIGVtaXRzIGFueSB2YWx1ZS5cbiAgICAgKiBAcmV0dXJuIHtTdHJlYW19XG4gICAgICovXG4gICAgU3RyZWFtLnByb3RvdHlwZS5tYXBUbyA9IGZ1bmN0aW9uIChwcm9qZWN0ZWRWYWx1ZSkge1xuICAgICAgICB2YXIgcyA9IHRoaXMubWFwKGZ1bmN0aW9uICgpIHsgcmV0dXJuIHByb2plY3RlZFZhbHVlOyB9KTtcbiAgICAgICAgdmFyIG9wID0gcy5fcHJvZDtcbiAgICAgICAgb3AudHlwZSA9IG9wLnR5cGUucmVwbGFjZSgnbWFwJywgJ21hcFRvJyk7XG4gICAgICAgIHJldHVybiBzO1xuICAgIH07XG4gICAgLyoqXG4gICAgICogT25seSBhbGxvd3MgZXZlbnRzIHRoYXQgcGFzcyB0aGUgdGVzdCBnaXZlbiBieSB0aGUgYHBhc3Nlc2AgYXJndW1lbnQuXG4gICAgICpcbiAgICAgKiBFYWNoIGV2ZW50IGZyb20gdGhlIGlucHV0IHN0cmVhbSBpcyBnaXZlbiB0byB0aGUgYHBhc3Nlc2AgZnVuY3Rpb24uIElmIHRoZVxuICAgICAqIGZ1bmN0aW9uIHJldHVybnMgYHRydWVgLCB0aGUgZXZlbnQgaXMgZm9yd2FyZGVkIHRvIHRoZSBvdXRwdXQgc3RyZWFtLFxuICAgICAqIG90aGVyd2lzZSBpdCBpcyBpZ25vcmVkIGFuZCBub3QgZm9yd2FyZGVkLlxuICAgICAqXG4gICAgICogTWFyYmxlIGRpYWdyYW06XG4gICAgICpcbiAgICAgKiBgYGB0ZXh0XG4gICAgICogLS0xLS0tMi0tMy0tLS0tNC0tLS0tNS0tLTYtLTctOC0tXG4gICAgICogICAgIGZpbHRlcihpID0+IGkgJSAyID09PSAwKVxuICAgICAqIC0tLS0tLTItLS0tLS0tLTQtLS0tLS0tLS02LS0tLTgtLVxuICAgICAqIGBgYFxuICAgICAqXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gcGFzc2VzIEEgZnVuY3Rpb24gb2YgdHlwZSBgKHQ6IFQpICs+IGJvb2xlYW5gIHRoYXQgdGFrZXNcbiAgICAgKiBhbiBldmVudCBmcm9tIHRoZSBpbnB1dCBzdHJlYW0gYW5kIGNoZWNrcyBpZiBpdCBwYXNzZXMsIGJ5IHJldHVybmluZyBhXG4gICAgICogYm9vbGVhbi5cbiAgICAgKiBAcmV0dXJuIHtTdHJlYW19XG4gICAgICovXG4gICAgU3RyZWFtLnByb3RvdHlwZS5maWx0ZXIgPSBmdW5jdGlvbiAocGFzc2VzKSB7XG4gICAgICAgIHZhciBwID0gdGhpcy5fcHJvZDtcbiAgICAgICAgaWYgKHAgaW5zdGFuY2VvZiBGaWx0ZXJPcGVyYXRvcikge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBTdHJlYW0obmV3IEZpbHRlck9wZXJhdG9yKGFuZChwYXNzZXMsIHAucGFzc2VzKSwgcC5pbnMpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbmV3IFN0cmVhbShuZXcgRmlsdGVyT3BlcmF0b3IocGFzc2VzLCB0aGlzKSk7XG4gICAgfTtcbiAgICAvKipcbiAgICAgKiBMZXRzIHRoZSBmaXJzdCBgYW1vdW50YCBtYW55IGV2ZW50cyBmcm9tIHRoZSBpbnB1dCBzdHJlYW0gcGFzcyB0byB0aGVcbiAgICAgKiBvdXRwdXQgc3RyZWFtLCB0aGVuIG1ha2VzIHRoZSBvdXRwdXQgc3RyZWFtIGNvbXBsZXRlLlxuICAgICAqXG4gICAgICogTWFyYmxlIGRpYWdyYW06XG4gICAgICpcbiAgICAgKiBgYGB0ZXh0XG4gICAgICogLS1hLS0tYi0tYy0tLS1kLS0tZS0tXG4gICAgICogICAgdGFrZSgzKVxuICAgICAqIC0tYS0tLWItLWN8XG4gICAgICogYGBgXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gYW1vdW50IEhvdyBtYW55IGV2ZW50cyB0byBhbGxvdyBmcm9tIHRoZSBpbnB1dCBzdHJlYW1cbiAgICAgKiBiZWZvcmUgY29tcGxldGluZyB0aGUgb3V0cHV0IHN0cmVhbS5cbiAgICAgKiBAcmV0dXJuIHtTdHJlYW19XG4gICAgICovXG4gICAgU3RyZWFtLnByb3RvdHlwZS50YWtlID0gZnVuY3Rpb24gKGFtb3VudCkge1xuICAgICAgICByZXR1cm4gbmV3ICh0aGlzLmN0b3IoKSkobmV3IFRha2VPcGVyYXRvcihhbW91bnQsIHRoaXMpKTtcbiAgICB9O1xuICAgIC8qKlxuICAgICAqIElnbm9yZXMgdGhlIGZpcnN0IGBhbW91bnRgIG1hbnkgZXZlbnRzIGZyb20gdGhlIGlucHV0IHN0cmVhbSwgYW5kIHRoZW5cbiAgICAgKiBhZnRlciB0aGF0IHN0YXJ0cyBmb3J3YXJkaW5nIGV2ZW50cyBmcm9tIHRoZSBpbnB1dCBzdHJlYW0gdG8gdGhlIG91dHB1dFxuICAgICAqIHN0cmVhbS5cbiAgICAgKlxuICAgICAqIE1hcmJsZSBkaWFncmFtOlxuICAgICAqXG4gICAgICogYGBgdGV4dFxuICAgICAqIC0tYS0tLWItLWMtLS0tZC0tLWUtLVxuICAgICAqICAgICAgIGRyb3AoMylcbiAgICAgKiAtLS0tLS0tLS0tLS0tLWQtLS1lLS1cbiAgICAgKiBgYGBcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBhbW91bnQgSG93IG1hbnkgZXZlbnRzIHRvIGlnbm9yZSBmcm9tIHRoZSBpbnB1dCBzdHJlYW1cbiAgICAgKiBiZWZvcmUgZm9yd2FyZGluZyBhbGwgZXZlbnRzIGZyb20gdGhlIGlucHV0IHN0cmVhbSB0byB0aGUgb3V0cHV0IHN0cmVhbS5cbiAgICAgKiBAcmV0dXJuIHtTdHJlYW19XG4gICAgICovXG4gICAgU3RyZWFtLnByb3RvdHlwZS5kcm9wID0gZnVuY3Rpb24gKGFtb3VudCkge1xuICAgICAgICByZXR1cm4gbmV3IFN0cmVhbShuZXcgRHJvcE9wZXJhdG9yKGFtb3VudCwgdGhpcykpO1xuICAgIH07XG4gICAgLyoqXG4gICAgICogV2hlbiB0aGUgaW5wdXQgc3RyZWFtIGNvbXBsZXRlcywgdGhlIG91dHB1dCBzdHJlYW0gd2lsbCBlbWl0IHRoZSBsYXN0IGV2ZW50XG4gICAgICogZW1pdHRlZCBieSB0aGUgaW5wdXQgc3RyZWFtLCBhbmQgdGhlbiB3aWxsIGFsc28gY29tcGxldGUuXG4gICAgICpcbiAgICAgKiBNYXJibGUgZGlhZ3JhbTpcbiAgICAgKlxuICAgICAqIGBgYHRleHRcbiAgICAgKiAtLWEtLS1iLS1jLS1kLS0tLXxcbiAgICAgKiAgICAgICBsYXN0KClcbiAgICAgKiAtLS0tLS0tLS0tLS0tLS0tLWR8XG4gICAgICogYGBgXG4gICAgICpcbiAgICAgKiBAcmV0dXJuIHtTdHJlYW19XG4gICAgICovXG4gICAgU3RyZWFtLnByb3RvdHlwZS5sYXN0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gbmV3IFN0cmVhbShuZXcgTGFzdE9wZXJhdG9yKHRoaXMpKTtcbiAgICB9O1xuICAgIC8qKlxuICAgICAqIFByZXBlbmRzIHRoZSBnaXZlbiBgaW5pdGlhbGAgdmFsdWUgdG8gdGhlIHNlcXVlbmNlIG9mIGV2ZW50cyBlbWl0dGVkIGJ5IHRoZVxuICAgICAqIGlucHV0IHN0cmVhbS4gVGhlIHJldHVybmVkIHN0cmVhbSBpcyBhIE1lbW9yeVN0cmVhbSwgd2hpY2ggbWVhbnMgaXQgaXNcbiAgICAgKiBhbHJlYWR5IGByZW1lbWJlcigpYCdkLlxuICAgICAqXG4gICAgICogTWFyYmxlIGRpYWdyYW06XG4gICAgICpcbiAgICAgKiBgYGB0ZXh0XG4gICAgICogLS0tMS0tLTItLS0tLTMtLS1cbiAgICAgKiAgIHN0YXJ0V2l0aCgwKVxuICAgICAqIDAtLTEtLS0yLS0tLS0zLS0tXG4gICAgICogYGBgXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaW5pdGlhbCBUaGUgdmFsdWUgb3IgZXZlbnQgdG8gcHJlcGVuZC5cbiAgICAgKiBAcmV0dXJuIHtNZW1vcnlTdHJlYW19XG4gICAgICovXG4gICAgU3RyZWFtLnByb3RvdHlwZS5zdGFydFdpdGggPSBmdW5jdGlvbiAoaW5pdGlhbCkge1xuICAgICAgICByZXR1cm4gbmV3IE1lbW9yeVN0cmVhbShuZXcgU3RhcnRXaXRoT3BlcmF0b3IodGhpcywgaW5pdGlhbCkpO1xuICAgIH07XG4gICAgLyoqXG4gICAgICogVXNlcyBhbm90aGVyIHN0cmVhbSB0byBkZXRlcm1pbmUgd2hlbiB0byBjb21wbGV0ZSB0aGUgY3VycmVudCBzdHJlYW0uXG4gICAgICpcbiAgICAgKiBXaGVuIHRoZSBnaXZlbiBgb3RoZXJgIHN0cmVhbSBlbWl0cyBhbiBldmVudCBvciBjb21wbGV0ZXMsIHRoZSBvdXRwdXRcbiAgICAgKiBzdHJlYW0gd2lsbCBjb21wbGV0ZS4gQmVmb3JlIHRoYXQgaGFwcGVucywgdGhlIG91dHB1dCBzdHJlYW0gd2lsbCBpbWl0YXRlXG4gICAgICogd2hhdGV2ZXIgaGFwcGVucyBvbiB0aGUgaW5wdXQgc3RyZWFtLlxuICAgICAqXG4gICAgICogTWFyYmxlIGRpYWdyYW06XG4gICAgICpcbiAgICAgKiBgYGB0ZXh0XG4gICAgICogLS0tMS0tLTItLS0tLTMtLTQtLS0tNS0tLS02LS0tXG4gICAgICogICBlbmRXaGVuKCAtLS0tLS0tLWEtLWItLXwgKVxuICAgICAqIC0tLTEtLS0yLS0tLS0zLS00LS18XG4gICAgICogYGBgXG4gICAgICpcbiAgICAgKiBAcGFyYW0gb3RoZXIgU29tZSBvdGhlciBzdHJlYW0gdGhhdCBpcyB1c2VkIHRvIGtub3cgd2hlbiBzaG91bGQgdGhlIG91dHB1dFxuICAgICAqIHN0cmVhbSBvZiB0aGlzIG9wZXJhdG9yIGNvbXBsZXRlLlxuICAgICAqIEByZXR1cm4ge1N0cmVhbX1cbiAgICAgKi9cbiAgICBTdHJlYW0ucHJvdG90eXBlLmVuZFdoZW4gPSBmdW5jdGlvbiAob3RoZXIpIHtcbiAgICAgICAgcmV0dXJuIG5ldyAodGhpcy5jdG9yKCkpKG5ldyBFbmRXaGVuT3BlcmF0b3Iob3RoZXIsIHRoaXMpKTtcbiAgICB9O1xuICAgIC8qKlxuICAgICAqIFwiRm9sZHNcIiB0aGUgc3RyZWFtIG9udG8gaXRzZWxmLlxuICAgICAqXG4gICAgICogQ29tYmluZXMgZXZlbnRzIGZyb20gdGhlIHBhc3QgdGhyb3VnaG91dFxuICAgICAqIHRoZSBlbnRpcmUgZXhlY3V0aW9uIG9mIHRoZSBpbnB1dCBzdHJlYW0sIGFsbG93aW5nIHlvdSB0byBhY2N1bXVsYXRlIHRoZW1cbiAgICAgKiB0b2dldGhlci4gSXQncyBlc3NlbnRpYWxseSBsaWtlIGBBcnJheS5wcm90b3R5cGUucmVkdWNlYC4gVGhlIHJldHVybmVkXG4gICAgICogc3RyZWFtIGlzIGEgTWVtb3J5U3RyZWFtLCB3aGljaCBtZWFucyBpdCBpcyBhbHJlYWR5IGByZW1lbWJlcigpYCdkLlxuICAgICAqXG4gICAgICogVGhlIG91dHB1dCBzdHJlYW0gc3RhcnRzIGJ5IGVtaXR0aW5nIHRoZSBgc2VlZGAgd2hpY2ggeW91IGdpdmUgYXMgYXJndW1lbnQuXG4gICAgICogVGhlbiwgd2hlbiBhbiBldmVudCBoYXBwZW5zIG9uIHRoZSBpbnB1dCBzdHJlYW0sIGl0IGlzIGNvbWJpbmVkIHdpdGggdGhhdFxuICAgICAqIHNlZWQgdmFsdWUgdGhyb3VnaCB0aGUgYGFjY3VtdWxhdGVgIGZ1bmN0aW9uLCBhbmQgdGhlIG91dHB1dCB2YWx1ZSBpc1xuICAgICAqIGVtaXR0ZWQgb24gdGhlIG91dHB1dCBzdHJlYW0uIGBmb2xkYCByZW1lbWJlcnMgdGhhdCBvdXRwdXQgdmFsdWUgYXMgYGFjY2BcbiAgICAgKiAoXCJhY2N1bXVsYXRvclwiKSwgYW5kIHRoZW4gd2hlbiBhIG5ldyBpbnB1dCBldmVudCBgdGAgaGFwcGVucywgYGFjY2Agd2lsbCBiZVxuICAgICAqIGNvbWJpbmVkIHdpdGggdGhhdCB0byBwcm9kdWNlIHRoZSBuZXcgYGFjY2AgYW5kIHNvIGZvcnRoLlxuICAgICAqXG4gICAgICogTWFyYmxlIGRpYWdyYW06XG4gICAgICpcbiAgICAgKiBgYGB0ZXh0XG4gICAgICogLS0tLS0tMS0tLS0tMS0tMi0tLS0xLS0tLTEtLS0tLS1cbiAgICAgKiAgIGZvbGQoKGFjYywgeCkgPT4gYWNjICsgeCwgMylcbiAgICAgKiAzLS0tLS00LS0tLS01LS03LS0tLTgtLS0tOS0tLS0tLVxuICAgICAqIGBgYFxuICAgICAqXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gYWNjdW11bGF0ZSBBIGZ1bmN0aW9uIG9mIHR5cGUgYChhY2M6IFIsIHQ6IFQpID0+IFJgIHRoYXRcbiAgICAgKiB0YWtlcyB0aGUgcHJldmlvdXMgYWNjdW11bGF0ZWQgdmFsdWUgYGFjY2AgYW5kIHRoZSBpbmNvbWluZyBldmVudCBmcm9tIHRoZVxuICAgICAqIGlucHV0IHN0cmVhbSBhbmQgcHJvZHVjZXMgdGhlIG5ldyBhY2N1bXVsYXRlZCB2YWx1ZS5cbiAgICAgKiBAcGFyYW0gc2VlZCBUaGUgaW5pdGlhbCBhY2N1bXVsYXRlZCB2YWx1ZSwgb2YgdHlwZSBgUmAuXG4gICAgICogQHJldHVybiB7TWVtb3J5U3RyZWFtfVxuICAgICAqL1xuICAgIFN0cmVhbS5wcm90b3R5cGUuZm9sZCA9IGZ1bmN0aW9uIChhY2N1bXVsYXRlLCBzZWVkKSB7XG4gICAgICAgIHJldHVybiBuZXcgTWVtb3J5U3RyZWFtKG5ldyBGb2xkT3BlcmF0b3IoYWNjdW11bGF0ZSwgc2VlZCwgdGhpcykpO1xuICAgIH07XG4gICAgLyoqXG4gICAgICogUmVwbGFjZXMgYW4gZXJyb3Igd2l0aCBhbm90aGVyIHN0cmVhbS5cbiAgICAgKlxuICAgICAqIFdoZW4gKGFuZCBpZikgYW4gZXJyb3IgaGFwcGVucyBvbiB0aGUgaW5wdXQgc3RyZWFtLCBpbnN0ZWFkIG9mIGZvcndhcmRpbmdcbiAgICAgKiB0aGF0IGVycm9yIHRvIHRoZSBvdXRwdXQgc3RyZWFtLCAqcmVwbGFjZUVycm9yKiB3aWxsIGNhbGwgdGhlIGByZXBsYWNlYFxuICAgICAqIGZ1bmN0aW9uIHdoaWNoIHJldHVybnMgdGhlIHN0cmVhbSB0aGF0IHRoZSBvdXRwdXQgc3RyZWFtIHdpbGwgaW1pdGF0ZS4gQW5kLFxuICAgICAqIGluIGNhc2UgdGhhdCBuZXcgc3RyZWFtIGFsc28gZW1pdHMgYW4gZXJyb3IsIGByZXBsYWNlYCB3aWxsIGJlIGNhbGxlZCBhZ2FpblxuICAgICAqIHRvIGdldCBhbm90aGVyIHN0cmVhbSB0byBzdGFydCBpbWl0YXRpbmcuXG4gICAgICpcbiAgICAgKiBNYXJibGUgZGlhZ3JhbTpcbiAgICAgKlxuICAgICAqIGBgYHRleHRcbiAgICAgKiAtLTEtLS0yLS0tLS0zLS00LS0tLS1YXG4gICAgICogICByZXBsYWNlRXJyb3IoICgpID0+IC0tMTAtLXwgKVxuICAgICAqIC0tMS0tLTItLS0tLTMtLTQtLS0tLS0tLTEwLS18XG4gICAgICogYGBgXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSByZXBsYWNlIEEgZnVuY3Rpb24gb2YgdHlwZSBgKGVycikgPT4gU3RyZWFtYCB0aGF0IHRha2VzXG4gICAgICogdGhlIGVycm9yIHRoYXQgb2NjdXJyZWQgb24gdGhlIGlucHV0IHN0cmVhbSBvciBvbiB0aGUgcHJldmlvdXMgcmVwbGFjZW1lbnRcbiAgICAgKiBzdHJlYW0gYW5kIHJldHVybnMgYSBuZXcgc3RyZWFtLiBUaGUgb3V0cHV0IHN0cmVhbSB3aWxsIGltaXRhdGUgdGhlIHN0cmVhbVxuICAgICAqIHRoYXQgdGhpcyBmdW5jdGlvbiByZXR1cm5zLlxuICAgICAqIEByZXR1cm4ge1N0cmVhbX1cbiAgICAgKi9cbiAgICBTdHJlYW0ucHJvdG90eXBlLnJlcGxhY2VFcnJvciA9IGZ1bmN0aW9uIChyZXBsYWNlKSB7XG4gICAgICAgIHJldHVybiBuZXcgKHRoaXMuY3RvcigpKShuZXcgUmVwbGFjZUVycm9yT3BlcmF0b3IocmVwbGFjZSwgdGhpcykpO1xuICAgIH07XG4gICAgLyoqXG4gICAgICogRmxhdHRlbnMgYSBcInN0cmVhbSBvZiBzdHJlYW1zXCIsIGhhbmRsaW5nIG9ubHkgb25lIG5lc3RlZCBzdHJlYW0gYXQgYSB0aW1lXG4gICAgICogKG5vIGNvbmN1cnJlbmN5KS5cbiAgICAgKlxuICAgICAqIElmIHRoZSBpbnB1dCBzdHJlYW0gaXMgYSBzdHJlYW0gdGhhdCBlbWl0cyBzdHJlYW1zLCB0aGVuIHRoaXMgb3BlcmF0b3Igd2lsbFxuICAgICAqIHJldHVybiBhbiBvdXRwdXQgc3RyZWFtIHdoaWNoIGlzIGEgZmxhdCBzdHJlYW06IGVtaXRzIHJlZ3VsYXIgZXZlbnRzLiBUaGVcbiAgICAgKiBmbGF0dGVuaW5nIGhhcHBlbnMgd2l0aG91dCBjb25jdXJyZW5jeS4gSXQgd29ya3MgbGlrZSB0aGlzOiB3aGVuIHRoZSBpbnB1dFxuICAgICAqIHN0cmVhbSBlbWl0cyBhIG5lc3RlZCBzdHJlYW0sICpmbGF0dGVuKiB3aWxsIHN0YXJ0IGltaXRhdGluZyB0aGF0IG5lc3RlZFxuICAgICAqIG9uZS4gSG93ZXZlciwgYXMgc29vbiBhcyB0aGUgbmV4dCBuZXN0ZWQgc3RyZWFtIGlzIGVtaXR0ZWQgb24gdGhlIGlucHV0XG4gICAgICogc3RyZWFtLCAqZmxhdHRlbiogd2lsbCBmb3JnZXQgdGhlIHByZXZpb3VzIG5lc3RlZCBvbmUgaXQgd2FzIGltaXRhdGluZywgYW5kXG4gICAgICogd2lsbCBzdGFydCBpbWl0YXRpbmcgdGhlIG5ldyBuZXN0ZWQgb25lLlxuICAgICAqXG4gICAgICogTWFyYmxlIGRpYWdyYW06XG4gICAgICpcbiAgICAgKiBgYGB0ZXh0XG4gICAgICogLS0rLS0tLS0tLS0rLS0tLS0tLS0tLS0tLS0tXG4gICAgICogICBcXCAgICAgICAgXFxcbiAgICAgKiAgICBcXCAgICAgICAtLS0tMS0tLS0yLS0tMy0tXG4gICAgICogICAgLS1hLS1iLS0tLWMtLS0tZC0tLS0tLS0tXG4gICAgICogICAgICAgICAgIGZsYXR0ZW5cbiAgICAgKiAtLS0tLWEtLWItLS0tLS0xLS0tLTItLS0zLS1cbiAgICAgKiBgYGBcbiAgICAgKlxuICAgICAqIEByZXR1cm4ge1N0cmVhbX1cbiAgICAgKi9cbiAgICBTdHJlYW0ucHJvdG90eXBlLmZsYXR0ZW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBwID0gdGhpcy5fcHJvZDtcbiAgICAgICAgcmV0dXJuIG5ldyBTdHJlYW0ocCBpbnN0YW5jZW9mIE1hcE9wZXJhdG9yICYmICEocCBpbnN0YW5jZW9mIEZpbHRlck1hcE9wZXJhdG9yKSA/XG4gICAgICAgICAgICBuZXcgTWFwRmxhdHRlbk9wZXJhdG9yKHApIDpcbiAgICAgICAgICAgIG5ldyBGbGF0dGVuT3BlcmF0b3IodGhpcykpO1xuICAgIH07XG4gICAgLyoqXG4gICAgICogUGFzc2VzIHRoZSBpbnB1dCBzdHJlYW0gdG8gYSBjdXN0b20gb3BlcmF0b3IsIHRvIHByb2R1Y2UgYW4gb3V0cHV0IHN0cmVhbS5cbiAgICAgKlxuICAgICAqICpjb21wb3NlKiBpcyBhIGhhbmR5IHdheSBvZiB1c2luZyBhbiBleGlzdGluZyBmdW5jdGlvbiBpbiBhIGNoYWluZWQgc3R5bGUuXG4gICAgICogSW5zdGVhZCBvZiB3cml0aW5nIGBvdXRTdHJlYW0gPSBmKGluU3RyZWFtKWAgeW91IGNhbiB3cml0ZVxuICAgICAqIGBvdXRTdHJlYW0gPSBpblN0cmVhbS5jb21wb3NlKGYpYC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IG9wZXJhdG9yIEEgZnVuY3Rpb24gdGhhdCB0YWtlcyBhIHN0cmVhbSBhcyBpbnB1dCBhbmRcbiAgICAgKiByZXR1cm5zIGEgc3RyZWFtIGFzIHdlbGwuXG4gICAgICogQHJldHVybiB7U3RyZWFtfVxuICAgICAqL1xuICAgIFN0cmVhbS5wcm90b3R5cGUuY29tcG9zZSA9IGZ1bmN0aW9uIChvcGVyYXRvcikge1xuICAgICAgICByZXR1cm4gb3BlcmF0b3IodGhpcyk7XG4gICAgfTtcbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIGFuIG91dHB1dCBzdHJlYW0gdGhhdCBpbWl0YXRlcyB0aGUgaW5wdXQgc3RyZWFtLCBidXQgYWxzbyByZW1lbWJlcnNcbiAgICAgKiB0aGUgbW9zdCByZWNlbnQgZXZlbnQgdGhhdCBoYXBwZW5zIG9uIHRoZSBpbnB1dCBzdHJlYW0sIHNvIHRoYXQgYSBuZXdseVxuICAgICAqIGFkZGVkIGxpc3RlbmVyIHdpbGwgaW1tZWRpYXRlbHkgcmVjZWl2ZSB0aGF0IG1lbW9yaXNlZCBldmVudC5cbiAgICAgKlxuICAgICAqIEByZXR1cm4ge01lbW9yeVN0cmVhbX1cbiAgICAgKi9cbiAgICBTdHJlYW0ucHJvdG90eXBlLnJlbWVtYmVyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgICAgICByZXR1cm4gbmV3IE1lbW9yeVN0cmVhbSh7XG4gICAgICAgICAgICBfc3RhcnQ6IGZ1bmN0aW9uIChpbCkgeyBfdGhpcy5fcHJvZC5fc3RhcnQoaWwpOyB9LFxuICAgICAgICAgICAgX3N0b3A6IGZ1bmN0aW9uICgpIHsgX3RoaXMuX3Byb2QuX3N0b3AoKTsgfSxcbiAgICAgICAgfSk7XG4gICAgfTtcbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIGFuIG91dHB1dCBzdHJlYW0gdGhhdCBpZGVudGljYWxseSBpbWl0YXRlcyB0aGUgaW5wdXQgc3RyZWFtLCBidXRcbiAgICAgKiBhbHNvIHJ1bnMgYSBgc3B5YCBmdW5jdGlvbiBmbyBlYWNoIGV2ZW50LCB0byBoZWxwIHlvdSBkZWJ1ZyB5b3VyIGFwcC5cbiAgICAgKlxuICAgICAqICpkZWJ1ZyogdGFrZXMgYSBgc3B5YCBmdW5jdGlvbiBhcyBhcmd1bWVudCwgYW5kIHJ1bnMgdGhhdCBmb3IgZWFjaCBldmVudFxuICAgICAqIGhhcHBlbmluZyBvbiB0aGUgaW5wdXQgc3RyZWFtLiBJZiB5b3UgZG9uJ3QgcHJvdmlkZSB0aGUgYHNweWAgYXJndW1lbnQsXG4gICAgICogdGhlbiAqZGVidWcqIHdpbGwganVzdCBgY29uc29sZS5sb2dgIGVhY2ggZXZlbnQuIFRoaXMgaGVscHMgeW91IHRvXG4gICAgICogdW5kZXJzdGFuZCB0aGUgZmxvdyBvZiBldmVudHMgdGhyb3VnaCBzb21lIG9wZXJhdG9yIGNoYWluLlxuICAgICAqXG4gICAgICogUGxlYXNlIG5vdGUgdGhhdCBpZiB0aGUgb3V0cHV0IHN0cmVhbSBoYXMgbm8gbGlzdGVuZXJzLCB0aGVuIGl0IHdpbGwgbm90XG4gICAgICogc3RhcnQsIHdoaWNoIG1lYW5zIGBzcHlgIHdpbGwgbmV2ZXIgcnVuIGJlY2F1c2Ugbm8gYWN0dWFsIGV2ZW50IGhhcHBlbnMgaW5cbiAgICAgKiB0aGF0IGNhc2UuXG4gICAgICpcbiAgICAgKiBNYXJibGUgZGlhZ3JhbTpcbiAgICAgKlxuICAgICAqIGBgYHRleHRcbiAgICAgKiAtLTEtLS0tMi0tLS0tMy0tLS0tNC0tXG4gICAgICogICAgICAgICBkZWJ1Z1xuICAgICAqIC0tMS0tLS0yLS0tLS0zLS0tLS00LS1cbiAgICAgKiBgYGBcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGxhYmVsT3JTcHkgQSBzdHJpbmcgdG8gdXNlIGFzIHRoZSBsYWJlbCB3aGVuIHByaW50aW5nXG4gICAgICogZGVidWcgaW5mb3JtYXRpb24gb24gdGhlIGNvbnNvbGUsIG9yIGEgJ3NweScgZnVuY3Rpb24gdGhhdCB0YWtlcyBhbiBldmVudFxuICAgICAqIGFzIGFyZ3VtZW50LCBhbmQgZG9lcyBub3QgbmVlZCB0byByZXR1cm4gYW55dGhpbmcuXG4gICAgICogQHJldHVybiB7U3RyZWFtfVxuICAgICAqL1xuICAgIFN0cmVhbS5wcm90b3R5cGUuZGVidWcgPSBmdW5jdGlvbiAobGFiZWxPclNweSkge1xuICAgICAgICByZXR1cm4gbmV3ICh0aGlzLmN0b3IoKSkobmV3IERlYnVnT3BlcmF0b3IobGFiZWxPclNweSwgdGhpcykpO1xuICAgIH07XG4gICAgLyoqXG4gICAgICogRm9yY2VzIHRoZSBTdHJlYW0gdG8gZW1pdCB0aGUgZ2l2ZW4gdmFsdWUgdG8gaXRzIGxpc3RlbmVycy5cbiAgICAgKlxuICAgICAqIEFzIHRoZSBuYW1lIGluZGljYXRlcywgaWYgeW91IHVzZSB0aGlzLCB5b3UgYXJlIG1vc3QgbGlrZWx5IGRvaW5nIHNvbWV0aGluZ1xuICAgICAqIFRoZSBXcm9uZyBXYXkuIFBsZWFzZSB0cnkgdG8gdW5kZXJzdGFuZCB0aGUgcmVhY3RpdmUgd2F5IGJlZm9yZSB1c2luZyB0aGlzXG4gICAgICogbWV0aG9kLiBVc2UgaXQgb25seSB3aGVuIHlvdSBrbm93IHdoYXQgeW91IGFyZSBkb2luZy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB2YWx1ZSBUaGUgXCJuZXh0XCIgdmFsdWUgeW91IHdhbnQgdG8gYnJvYWRjYXN0IHRvIGFsbCBsaXN0ZW5lcnMgb2ZcbiAgICAgKiB0aGlzIFN0cmVhbS5cbiAgICAgKi9cbiAgICBTdHJlYW0ucHJvdG90eXBlLnNoYW1lZnVsbHlTZW5kTmV4dCA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICB0aGlzLl9uKHZhbHVlKTtcbiAgICB9O1xuICAgIC8qKlxuICAgICAqIEZvcmNlcyB0aGUgU3RyZWFtIHRvIGVtaXQgdGhlIGdpdmVuIGVycm9yIHRvIGl0cyBsaXN0ZW5lcnMuXG4gICAgICpcbiAgICAgKiBBcyB0aGUgbmFtZSBpbmRpY2F0ZXMsIGlmIHlvdSB1c2UgdGhpcywgeW91IGFyZSBtb3N0IGxpa2VseSBkb2luZyBzb21ldGhpbmdcbiAgICAgKiBUaGUgV3JvbmcgV2F5LiBQbGVhc2UgdHJ5IHRvIHVuZGVyc3RhbmQgdGhlIHJlYWN0aXZlIHdheSBiZWZvcmUgdXNpbmcgdGhpc1xuICAgICAqIG1ldGhvZC4gVXNlIGl0IG9ubHkgd2hlbiB5b3Uga25vdyB3aGF0IHlvdSBhcmUgZG9pbmcuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge2FueX0gZXJyb3IgVGhlIGVycm9yIHlvdSB3YW50IHRvIGJyb2FkY2FzdCB0byBhbGwgdGhlIGxpc3RlbmVycyBvZlxuICAgICAqIHRoaXMgU3RyZWFtLlxuICAgICAqL1xuICAgIFN0cmVhbS5wcm90b3R5cGUuc2hhbWVmdWxseVNlbmRFcnJvciA9IGZ1bmN0aW9uIChlcnJvcikge1xuICAgICAgICB0aGlzLl9lKGVycm9yKTtcbiAgICB9O1xuICAgIC8qKlxuICAgICAqIEZvcmNlcyB0aGUgU3RyZWFtIHRvIGVtaXQgdGhlIFwiY29tcGxldGVkXCIgZXZlbnQgdG8gaXRzIGxpc3RlbmVycy5cbiAgICAgKlxuICAgICAqIEFzIHRoZSBuYW1lIGluZGljYXRlcywgaWYgeW91IHVzZSB0aGlzLCB5b3UgYXJlIG1vc3QgbGlrZWx5IGRvaW5nIHNvbWV0aGluZ1xuICAgICAqIFRoZSBXcm9uZyBXYXkuIFBsZWFzZSB0cnkgdG8gdW5kZXJzdGFuZCB0aGUgcmVhY3RpdmUgd2F5IGJlZm9yZSB1c2luZyB0aGlzXG4gICAgICogbWV0aG9kLiBVc2UgaXQgb25seSB3aGVuIHlvdSBrbm93IHdoYXQgeW91IGFyZSBkb2luZy5cbiAgICAgKi9cbiAgICBTdHJlYW0ucHJvdG90eXBlLnNoYW1lZnVsbHlTZW5kQ29tcGxldGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuX2MoKTtcbiAgICB9O1xuICAgIC8qKlxuICAgICAqIENvbWJpbmVzIG11bHRpcGxlIHN0cmVhbXMgdG9nZXRoZXIgdG8gcmV0dXJuIGEgc3RyZWFtIHdob3NlIGV2ZW50cyBhcmVcbiAgICAgKiBjYWxjdWxhdGVkIGZyb20gdGhlIGxhdGVzdCBldmVudHMgb2YgZWFjaCBvZiB0aGUgaW5wdXQgc3RyZWFtcy5cbiAgICAgKlxuICAgICAqICpjb21iaW5lKiByZW1lbWJlcnMgdGhlIG1vc3QgcmVjZW50IGV2ZW50IGZyb20gZWFjaCBvZiB0aGUgaW5wdXQgc3RyZWFtcy5cbiAgICAgKiBXaGVuIGFueSBvZiB0aGUgaW5wdXQgc3RyZWFtcyBlbWl0cyBhbiBldmVudCwgdGhhdCBldmVudCB0b2dldGhlciB3aXRoIGFsbFxuICAgICAqIHRoZSBvdGhlciBzYXZlZCBldmVudHMgYXJlIGNvbWJpbmVkIGluIHRoZSBgcHJvamVjdGAgZnVuY3Rpb24gd2hpY2ggc2hvdWxkXG4gICAgICogcmV0dXJuIGEgdmFsdWUuIFRoYXQgdmFsdWUgd2lsbCBiZSBlbWl0dGVkIG9uIHRoZSBvdXRwdXQgc3RyZWFtLiBJdCdzXG4gICAgICogZXNzZW50aWFsbHkgYSB3YXkgb2YgbWl4aW5nIHRoZSBldmVudHMgZnJvbSBtdWx0aXBsZSBzdHJlYW1zIGFjY29yZGluZyB0byBhXG4gICAgICogZm9ybXVsYS5cbiAgICAgKlxuICAgICAqIE1hcmJsZSBkaWFncmFtOlxuICAgICAqXG4gICAgICogYGBgdGV4dFxuICAgICAqIC0tMS0tLS0yLS0tLS0zLS0tLS0tLS00LS0tXG4gICAgICogLS0tLWEtLS0tLWItLS0tLWMtLWQtLS0tLS1cbiAgICAgKiAgIGNvbWJpbmUoKHgseSkgPT4geCt5KVxuICAgICAqIC0tLS0xYS0yYS0yYi0zYi0zYy0zZC00ZC0tXG4gICAgICogYGBgXG4gICAgICpcbiAgICAgKiBAZmFjdG9yeSB0cnVlXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gcHJvamVjdCBBIGZ1bmN0aW9uIG9mIHR5cGUgYCh4OiBUMSwgeTogVDIpID0+IFJgIG9yXG4gICAgICogc2ltaWxhciB0aGF0IHRha2VzIHRoZSBtb3N0IHJlY2VudCBldmVudHMgYHhgIGFuZCBgeWAgZnJvbSB0aGUgaW5wdXRcbiAgICAgKiBzdHJlYW1zIGFuZCByZXR1cm5zIGEgdmFsdWUuIFRoZSBvdXRwdXQgc3RyZWFtIHdpbGwgZW1pdCB0aGF0IHZhbHVlLiBUaGVcbiAgICAgKiBudW1iZXIgb2YgYXJndW1lbnRzIGZvciB0aGlzIGZ1bmN0aW9uIHNob3VsZCBtYXRjaCB0aGUgbnVtYmVyIG9mIGlucHV0XG4gICAgICogc3RyZWFtcy5cbiAgICAgKiBAcGFyYW0ge1N0cmVhbX0gc3RyZWFtMSBBIHN0cmVhbSB0byBjb21iaW5lIHRvZ2V0aGVyIHdpdGggb3RoZXIgc3RyZWFtcy5cbiAgICAgKiBAcGFyYW0ge1N0cmVhbX0gc3RyZWFtMiBBIHN0cmVhbSB0byBjb21iaW5lIHRvZ2V0aGVyIHdpdGggb3RoZXIgc3RyZWFtcy5cbiAgICAgKiBUd28gb3IgbW9yZSBzdHJlYW1zIG1heSBiZSBnaXZlbiBhcyBhcmd1bWVudHMuXG4gICAgICogQHJldHVybiB7U3RyZWFtfVxuICAgICAqL1xuICAgIFN0cmVhbS5jb21iaW5lID0gZnVuY3Rpb24gY29tYmluZShwcm9qZWN0KSB7XG4gICAgICAgIHZhciBzdHJlYW1zID0gW107XG4gICAgICAgIGZvciAodmFyIF9pID0gMTsgX2kgPCBhcmd1bWVudHMubGVuZ3RoOyBfaSsrKSB7XG4gICAgICAgICAgICBzdHJlYW1zW19pIC0gMV0gPSBhcmd1bWVudHNbX2ldO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZXcgU3RyZWFtKG5ldyBDb21iaW5lUHJvZHVjZXIocHJvamVjdCwgc3RyZWFtcykpO1xuICAgIH07XG4gICAgcmV0dXJuIFN0cmVhbTtcbn0oKSk7XG5leHBvcnRzLlN0cmVhbSA9IFN0cmVhbTtcbnZhciBNaW1pY1N0cmVhbSA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKE1pbWljU3RyZWFtLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIE1pbWljU3RyZWFtKCkge1xuICAgICAgICBfc3VwZXIuY2FsbCh0aGlzKTtcbiAgICB9XG4gICAgTWltaWNTdHJlYW0ucHJvdG90eXBlLl9hZGQgPSBmdW5jdGlvbiAoaWwpIHtcbiAgICAgICAgdmFyIHQgPSB0aGlzLl90YXJnZXQ7XG4gICAgICAgIGlmICghdClcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgdC5fYWRkKGlsKTtcbiAgICB9O1xuICAgIE1pbWljU3RyZWFtLnByb3RvdHlwZS5fcmVtb3ZlID0gZnVuY3Rpb24gKGlsKSB7XG4gICAgICAgIHZhciB0ID0gdGhpcy5fdGFyZ2V0O1xuICAgICAgICBpZiAoIXQpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIHQuX3JlbW92ZShpbCk7XG4gICAgfTtcbiAgICAvKipcbiAgICAgKiBUaGlzIG1ldGhvZCBleGlzdHMgb25seSBvbiBhIE1pbWljU3RyZWFtLCB3aGljaCBpcyBjcmVhdGVkIHRocm91Z2hcbiAgICAgKiBgeHMuY3JlYXRlTWltaWMoKWAuIGBpbWl0YXRlYCBjaGFuZ2VzIHRoaXMgY3VycmVudCBNaW1pY1N0cmVhbSB0byBpbWl0YXRlXG4gICAgICogdGhlIGBvdGhlcmAgZ2l2ZW4gc3RyZWFtLlxuICAgICAqXG4gICAgICogVGhlICppbWl0YXRlKiBtZXRob2QgcmV0dXJucyBub3RoaW5nLiBJbnN0ZWFkLCBpdCBjaGFuZ2VzIHRoZSBiZWhhdmlvciBvZlxuICAgICAqIHRoZSBjdXJyZW50IHN0cmVhbSwgbWFraW5nIGl0IHJlLWVtaXQgd2hhdGV2ZXIgZXZlbnRzIGFyZSBlbWl0dGVkIGJ5IHRoZVxuICAgICAqIGdpdmVuIGBvdGhlcmAgc3RyZWFtLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtTdHJlYW19IG90aGVyIFRoZSBzdHJlYW0gdG8gaW1pdGF0ZSBvbiB0aGUgY3VycmVudCBvbmUuIE11c3Qgbm90IGJlXG4gICAgICogYSBNZW1vcnlTdHJlYW0uXG4gICAgICovXG4gICAgTWltaWNTdHJlYW0ucHJvdG90eXBlLmltaXRhdGUgPSBmdW5jdGlvbiAob3RoZXIpIHtcbiAgICAgICAgaWYgKG90aGVyIGluc3RhbmNlb2YgTWVtb3J5U3RyZWFtKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0EgTWVtb3J5U3RyZWFtIHdhcyBnaXZlbiB0byBpbWl0YXRlKCksIGJ1dCBpdCBvbmx5ICcgK1xuICAgICAgICAgICAgICAgICdzdXBwb3J0cyBhIFN0cmVhbS4gUmVhZCBtb3JlIGFib3V0IHRoaXMgcmVzdHJpY3Rpb24gaGVyZTogJyArXG4gICAgICAgICAgICAgICAgJ2h0dHBzOi8vZ2l0aHViLmNvbS9zdGFsdHoveHN0cmVhbSNmYXEnKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl90YXJnZXQgPSBvdGhlcjtcbiAgICB9O1xuICAgIHJldHVybiBNaW1pY1N0cmVhbTtcbn0oU3RyZWFtKSk7XG5leHBvcnRzLk1pbWljU3RyZWFtID0gTWltaWNTdHJlYW07XG52YXIgTWVtb3J5U3RyZWFtID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoTWVtb3J5U3RyZWFtLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIE1lbW9yeVN0cmVhbShwcm9kdWNlcikge1xuICAgICAgICBfc3VwZXIuY2FsbCh0aGlzLCBwcm9kdWNlcik7XG4gICAgICAgIHRoaXMuX2hhcyA9IGZhbHNlO1xuICAgIH1cbiAgICBNZW1vcnlTdHJlYW0ucHJvdG90eXBlLl9uID0gZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgdGhpcy5fdiA9IHg7XG4gICAgICAgIHRoaXMuX2hhcyA9IHRydWU7XG4gICAgICAgIF9zdXBlci5wcm90b3R5cGUuX24uY2FsbCh0aGlzLCB4KTtcbiAgICB9O1xuICAgIE1lbW9yeVN0cmVhbS5wcm90b3R5cGUuX2FkZCA9IGZ1bmN0aW9uIChpbCkge1xuICAgICAgICBpZiAodGhpcy5faGFzKSB7XG4gICAgICAgICAgICBpbC5fbih0aGlzLl92KTtcbiAgICAgICAgfVxuICAgICAgICBfc3VwZXIucHJvdG90eXBlLl9hZGQuY2FsbCh0aGlzLCBpbCk7XG4gICAgfTtcbiAgICBNZW1vcnlTdHJlYW0ucHJvdG90eXBlLl94ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl9oYXMgPSBmYWxzZTtcbiAgICAgICAgX3N1cGVyLnByb3RvdHlwZS5feC5jYWxsKHRoaXMpO1xuICAgIH07XG4gICAgTWVtb3J5U3RyZWFtLnByb3RvdHlwZS5tYXAgPSBmdW5jdGlvbiAocHJvamVjdCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fbWFwKHByb2plY3QpO1xuICAgIH07XG4gICAgTWVtb3J5U3RyZWFtLnByb3RvdHlwZS5tYXBUbyA9IGZ1bmN0aW9uIChwcm9qZWN0ZWRWYWx1ZSkge1xuICAgICAgICByZXR1cm4gX3N1cGVyLnByb3RvdHlwZS5tYXBUby5jYWxsKHRoaXMsIHByb2plY3RlZFZhbHVlKTtcbiAgICB9O1xuICAgIE1lbW9yeVN0cmVhbS5wcm90b3R5cGUudGFrZSA9IGZ1bmN0aW9uIChhbW91bnQpIHtcbiAgICAgICAgcmV0dXJuIF9zdXBlci5wcm90b3R5cGUudGFrZS5jYWxsKHRoaXMsIGFtb3VudCk7XG4gICAgfTtcbiAgICBNZW1vcnlTdHJlYW0ucHJvdG90eXBlLmVuZFdoZW4gPSBmdW5jdGlvbiAob3RoZXIpIHtcbiAgICAgICAgcmV0dXJuIF9zdXBlci5wcm90b3R5cGUuZW5kV2hlbi5jYWxsKHRoaXMsIG90aGVyKTtcbiAgICB9O1xuICAgIE1lbW9yeVN0cmVhbS5wcm90b3R5cGUucmVwbGFjZUVycm9yID0gZnVuY3Rpb24gKHJlcGxhY2UpIHtcbiAgICAgICAgcmV0dXJuIF9zdXBlci5wcm90b3R5cGUucmVwbGFjZUVycm9yLmNhbGwodGhpcywgcmVwbGFjZSk7XG4gICAgfTtcbiAgICBNZW1vcnlTdHJlYW0ucHJvdG90eXBlLmRlYnVnID0gZnVuY3Rpb24gKGxhYmVsT3JTcHkpIHtcbiAgICAgICAgcmV0dXJuIF9zdXBlci5wcm90b3R5cGUuZGVidWcuY2FsbCh0aGlzLCBsYWJlbE9yU3B5KTtcbiAgICB9O1xuICAgIHJldHVybiBNZW1vcnlTdHJlYW07XG59KFN0cmVhbSkpO1xuZXhwb3J0cy5NZW1vcnlTdHJlYW0gPSBNZW1vcnlTdHJlYW07XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XG5leHBvcnRzLmRlZmF1bHQgPSBTdHJlYW07XG4vLyMgc291cmNlTWFwcGluZ1VSTD1jb3JlLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xudmFyIGNvcmVfMSA9IHJlcXVpcmUoJy4uL2NvcmUnKTtcbnZhciBDb25jYXRQcm9kdWNlciA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gQ29uY2F0UHJvZHVjZXIoc3RyZWFtcykge1xuICAgICAgICB0aGlzLnN0cmVhbXMgPSBzdHJlYW1zO1xuICAgICAgICB0aGlzLnR5cGUgPSAnY29uY2F0JztcbiAgICAgICAgdGhpcy5vdXQgPSBudWxsO1xuICAgICAgICB0aGlzLmkgPSAwO1xuICAgIH1cbiAgICBDb25jYXRQcm9kdWNlci5wcm90b3R5cGUuX3N0YXJ0ID0gZnVuY3Rpb24gKG91dCkge1xuICAgICAgICB0aGlzLm91dCA9IG91dDtcbiAgICAgICAgdGhpcy5zdHJlYW1zW3RoaXMuaV0uX2FkZCh0aGlzKTtcbiAgICB9O1xuICAgIENvbmNhdFByb2R1Y2VyLnByb3RvdHlwZS5fc3RvcCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHN0cmVhbXMgPSB0aGlzLnN0cmVhbXM7XG4gICAgICAgIGlmICh0aGlzLmkgPCBzdHJlYW1zLmxlbmd0aCkge1xuICAgICAgICAgICAgc3RyZWFtc1t0aGlzLmldLl9yZW1vdmUodGhpcyk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5pID0gMDtcbiAgICAgICAgdGhpcy5vdXQgPSBudWxsO1xuICAgIH07XG4gICAgQ29uY2F0UHJvZHVjZXIucHJvdG90eXBlLl9uID0gZnVuY3Rpb24gKHQpIHtcbiAgICAgICAgdmFyIHUgPSB0aGlzLm91dDtcbiAgICAgICAgaWYgKCF1KVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB1Ll9uKHQpO1xuICAgIH07XG4gICAgQ29uY2F0UHJvZHVjZXIucHJvdG90eXBlLl9lID0gZnVuY3Rpb24gKGVycikge1xuICAgICAgICB2YXIgdSA9IHRoaXMub3V0O1xuICAgICAgICBpZiAoIXUpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIHUuX2UoZXJyKTtcbiAgICB9O1xuICAgIENvbmNhdFByb2R1Y2VyLnByb3RvdHlwZS5fYyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHUgPSB0aGlzLm91dDtcbiAgICAgICAgaWYgKCF1KVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB2YXIgc3RyZWFtcyA9IHRoaXMuc3RyZWFtcztcbiAgICAgICAgc3RyZWFtc1t0aGlzLmldLl9yZW1vdmUodGhpcyk7XG4gICAgICAgIGlmICgrK3RoaXMuaSA8IHN0cmVhbXMubGVuZ3RoKSB7XG4gICAgICAgICAgICBzdHJlYW1zW3RoaXMuaV0uX2FkZCh0aGlzKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHUuX2MoKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgcmV0dXJuIENvbmNhdFByb2R1Y2VyO1xufSgpKTtcbi8qKlxuICogUHV0cyBvbmUgc3RyZWFtIGFmdGVyIHRoZSBvdGhlci4gKmNvbmNhdCogaXMgYSBmYWN0b3J5IHRoYXQgdGFrZXMgbXVsdGlwbGVcbiAqIHN0cmVhbXMgYXMgYXJndW1lbnRzLCBhbmQgc3RhcnRzIHRoZSBgbisxYC10aCBzdHJlYW0gb25seSB3aGVuIHRoZSBgbmAtdGhcbiAqIHN0cmVhbSBoYXMgY29tcGxldGVkLiBJdCBjb25jYXRlbmF0ZXMgdGhvc2Ugc3RyZWFtcyB0b2dldGhlci5cbiAqXG4gKiBNYXJibGUgZGlhZ3JhbTpcbiAqXG4gKiBgYGB0ZXh0XG4gKiAtLTEtLTItLS0zLS0tNC18XG4gKiAuLi4uLi4uLi4uLi4uLi4tLWEtYi1jLS1kLXxcbiAqICAgICAgICAgICBjb25jYXRcbiAqIC0tMS0tMi0tLTMtLS00LS0tYS1iLWMtLWQtfFxuICogYGBgXG4gKlxuICogRXhhbXBsZTpcbiAqXG4gKiBgYGBqc1xuICogaW1wb3J0IGNvbmNhdCBmcm9tICd4c3RyZWFtL2V4dHJhL2NvbmNhdCdcbiAqXG4gKiBjb25zdCBzdHJlYW1BID0geHMub2YoJ2EnLCAnYicsICdjJylcbiAqIGNvbnN0IHN0cmVhbUIgPSB4cy5vZigxMCwgMjAsIDMwKVxuICogY29uc3Qgc3RyZWFtQyA9IHhzLm9mKCdYJywgJ1knLCAnWicpXG4gKlxuICogY29uc3Qgb3V0cHV0U3RyZWFtID0gY29uY2F0KHN0cmVhbUEsIHN0cmVhbUIsIHN0cmVhbUMpXG4gKlxuICogb3V0cHV0U3RyZWFtLmFkZExpc3RlbmVyKHtcbiAqICAgbmV4dDogKHgpID0+IGNvbnNvbGUubG9nKHgpLFxuICogICBlcnJvcjogKGVycikgPT4gY29uc29sZS5lcnJvcihlcnIpLFxuICogICBjb21wbGV0ZTogKCkgPT4gY29uc29sZS5sb2coJ2NvbmNhdCBjb21wbGV0ZWQnKSxcbiAqIH0pXG4gKiBgYGBcbiAqXG4gKiBAZmFjdG9yeSB0cnVlXG4gKiBAcGFyYW0ge1N0cmVhbX0gc3RyZWFtMSBBIHN0cmVhbSB0byBjb25jYXRlbmF0ZSB0b2dldGhlciB3aXRoIG90aGVyIHN0cmVhbXMuXG4gKiBAcGFyYW0ge1N0cmVhbX0gc3RyZWFtMiBBIHN0cmVhbSB0byBjb25jYXRlbmF0ZSB0b2dldGhlciB3aXRoIG90aGVyIHN0cmVhbXMuIFR3b1xuICogb3IgbW9yZSBzdHJlYW1zIG1heSBiZSBnaXZlbiBhcyBhcmd1bWVudHMuXG4gKiBAcmV0dXJuIHtTdHJlYW19XG4gKi9cbmZ1bmN0aW9uIGNvbmNhdCgpIHtcbiAgICB2YXIgc3RyZWFtcyA9IFtdO1xuICAgIGZvciAodmFyIF9pID0gMDsgX2kgPCBhcmd1bWVudHMubGVuZ3RoOyBfaSsrKSB7XG4gICAgICAgIHN0cmVhbXNbX2kgLSAwXSA9IGFyZ3VtZW50c1tfaV07XG4gICAgfVxuICAgIHJldHVybiBuZXcgY29yZV8xLlN0cmVhbShuZXcgQ29uY2F0UHJvZHVjZXIoc3RyZWFtcykpO1xufVxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xuZXhwb3J0cy5kZWZhdWx0ID0gY29uY2F0O1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9Y29uY2F0LmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xudmFyIGNvcmVfMSA9IHJlcXVpcmUoJy4uL2NvcmUnKTtcbnZhciBlbXB0eSA9IHt9O1xudmFyIERyb3BSZXBlYXRzT3BlcmF0b3IgPSAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIERyb3BSZXBlYXRzT3BlcmF0b3IoZm4sIGlucykge1xuICAgICAgICB0aGlzLmZuID0gZm47XG4gICAgICAgIHRoaXMuaW5zID0gaW5zO1xuICAgICAgICB0aGlzLnR5cGUgPSAnZHJvcFJlcGVhdHMnO1xuICAgICAgICB0aGlzLm91dCA9IG51bGw7XG4gICAgICAgIHRoaXMudiA9IGVtcHR5O1xuICAgIH1cbiAgICBEcm9wUmVwZWF0c09wZXJhdG9yLnByb3RvdHlwZS5fc3RhcnQgPSBmdW5jdGlvbiAob3V0KSB7XG4gICAgICAgIHRoaXMub3V0ID0gb3V0O1xuICAgICAgICB0aGlzLmlucy5fYWRkKHRoaXMpO1xuICAgIH07XG4gICAgRHJvcFJlcGVhdHNPcGVyYXRvci5wcm90b3R5cGUuX3N0b3AgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuaW5zLl9yZW1vdmUodGhpcyk7XG4gICAgICAgIHRoaXMub3V0ID0gbnVsbDtcbiAgICAgICAgdGhpcy52ID0gZW1wdHk7XG4gICAgfTtcbiAgICBEcm9wUmVwZWF0c09wZXJhdG9yLnByb3RvdHlwZS5pc0VxID0gZnVuY3Rpb24gKHgsIHkpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZm4gPyB0aGlzLmZuKHgsIHkpIDogeCA9PT0geTtcbiAgICB9O1xuICAgIERyb3BSZXBlYXRzT3BlcmF0b3IucHJvdG90eXBlLl9uID0gZnVuY3Rpb24gKHQpIHtcbiAgICAgICAgdmFyIHUgPSB0aGlzLm91dDtcbiAgICAgICAgaWYgKCF1KVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB2YXIgdiA9IHRoaXMudjtcbiAgICAgICAgaWYgKHYgPT09IGVtcHR5IHx8ICF0aGlzLmlzRXEodCwgdikpIHtcbiAgICAgICAgICAgIHUuX24odCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy52ID0gdDtcbiAgICB9O1xuICAgIERyb3BSZXBlYXRzT3BlcmF0b3IucHJvdG90eXBlLl9lID0gZnVuY3Rpb24gKGVycikge1xuICAgICAgICB2YXIgdSA9IHRoaXMub3V0O1xuICAgICAgICBpZiAoIXUpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIHUuX2UoZXJyKTtcbiAgICB9O1xuICAgIERyb3BSZXBlYXRzT3BlcmF0b3IucHJvdG90eXBlLl9jID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgdSA9IHRoaXMub3V0O1xuICAgICAgICBpZiAoIXUpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIHUuX2MoKTtcbiAgICB9O1xuICAgIHJldHVybiBEcm9wUmVwZWF0c09wZXJhdG9yO1xufSgpKTtcbmV4cG9ydHMuRHJvcFJlcGVhdHNPcGVyYXRvciA9IERyb3BSZXBlYXRzT3BlcmF0b3I7XG5mdW5jdGlvbiBkcm9wUmVwZWF0cyhpc0VxdWFsKSB7XG4gICAgaWYgKGlzRXF1YWwgPT09IHZvaWQgMCkgeyBpc0VxdWFsID0gbnVsbDsgfVxuICAgIHJldHVybiBmdW5jdGlvbiBkcm9wUmVwZWF0c09wZXJhdG9yKGlucykge1xuICAgICAgICByZXR1cm4gbmV3IGNvcmVfMS5TdHJlYW0obmV3IERyb3BSZXBlYXRzT3BlcmF0b3IoaXNFcXVhbCwgaW5zKSk7XG4gICAgfTtcbn1cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcbmV4cG9ydHMuZGVmYXVsdCA9IGRyb3BSZXBlYXRzO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9ZHJvcFJlcGVhdHMuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgY29yZV8xID0gcmVxdWlyZSgnLi9jb3JlJyk7XG5leHBvcnRzLlN0cmVhbSA9IGNvcmVfMS5TdHJlYW07XG5leHBvcnRzLk1lbW9yeVN0cmVhbSA9IGNvcmVfMS5NZW1vcnlTdHJlYW07XG5leHBvcnRzLk1pbWljU3RyZWFtID0gY29yZV8xLk1pbWljU3RyZWFtO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xuZXhwb3J0cy5kZWZhdWx0ID0gY29yZV8xLlN0cmVhbTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWluZGV4LmpzLm1hcCIsImltcG9ydCB7cnVufSBmcm9tICdAY3ljbGUveHN0cmVhbS1ydW4nO1xuaW1wb3J0IHttYWtlRE9NRHJpdmVyfSBmcm9tICdAY3ljbGUvZG9tJztcbmltcG9ydCB7bWFrZUhpc3RvcnlEcml2ZXJ9IGZyb20gJ0BjeWNsZS9oaXN0b3J5J1xuaW1wb3J0IHtjcmVhdGVIaXN0b3J5fSBmcm9tICdoaXN0b3J5JztcbmltcG9ydCBzdG9yYWdlRHJpdmVyIGZyb20gJ0BjeWNsZS9zdG9yYWdlJztcbi8vIFRIRSBNQUlOIEZVTkNUSU9OXG4vLyBUaGlzIGlzIHRoZSB0b2RvIGxpc3QgY29tcG9uZW50LlxuaW1wb3J0IFRhc2tMaXN0IGZyb20gJy4vY29tcG9uZW50cy9UYXNrTGlzdC9pbmRleCc7XG5cbmNvbnN0IG1haW4gPSBUYXNrTGlzdDtcblxuLy8gVEhFIEVOVFJZIFBPSU5UXG4vLyBUaGlzIGlzIHdoZXJlIHRoZSB3aG9sZSBzdG9yeSBzdGFydHMuXG4vLyBgcnVuYCByZWNlaXZlcyBhIG1haW4gZnVuY3Rpb24gYW5kIGFuIG9iamVjdFxuLy8gd2l0aCB0aGUgZHJpdmVycy5cbnJ1bihtYWluLCB7XG4gIC8vIFRIRSBET00gRFJJVkVSXG4gIC8vIGBtYWtlRE9NRHJpdmVyKGNvbnRhaW5lcilgIGZyb20gQ3ljbGUgRE9NIHJldHVybnMgYVxuICAvLyBkcml2ZXIgZnVuY3Rpb24gdG8gaW50ZXJhY3Qgd2l0aCB0aGUgRE9NLlxuICBET006IG1ha2VET01Ecml2ZXIoJy50b2RvYXBwJywge3RyYW5zcG9zaXRpb246IHRydWV9KSxcbiAgLy8gVEhFIEhJU1RPUlkgRFJJVkVSXG4gIC8vIEEgZHJpdmVyIHRvIGludGVyYWN0IHdpdGggYnJvd3NlciBoaXN0b3J5XG4gIEhpc3Rvcnk6IG1ha2VIaXN0b3J5RHJpdmVyKGNyZWF0ZUhpc3RvcnkoKSwge2NhcHR1cmU6IHRydWV9KSxcbiAgLy8gVEhFIFNUT1JBR0UgRFJJVkVSXG4gIC8vIFRoZSBzdG9yYWdlIGRyaXZlciB3aGljaCBjYW4gYmUgdXNlZCB0byBhY2Nlc3MgdmFsdWVzIGZvclxuICAvLyBsb2NhbC0gYW5kIHNlc3Npb25TdG9yYWdlIGtleXMgYXMgc3RyZWFtcy5cbiAgc3RvcmFnZTogc3RvcmFnZURyaXZlclxufSk7XG4iLCJpbXBvcnQgaW50ZW50IGZyb20gJy4vaW50ZW50JztcbmltcG9ydCBtb2RlbCBmcm9tICcuL21vZGVsJztcbmltcG9ydCB2aWV3IGZyb20gJy4vdmlldyc7XG5cbi8vIFRIRSBUT0RPIElURU0gRlVOQ1RJT05cbi8vIFRoaXMgaXMgYSBzaW1wbGUgdG9kbyBpdGVtIGNvbXBvbmVudCxcbi8vIHN0cnVjdHVyZWQgd2l0aCB0aGUgTVZJLXBhdHRlcm4uXG5mdW5jdGlvbiBUYXNrKHtET00sIHByb3BzJH0pIHtcbiAgbGV0IGFjdGlvbiQgPSBpbnRlbnQoRE9NKTtcbiAgbGV0IHN0YXRlJCA9IG1vZGVsKHByb3BzJCwgYWN0aW9uJCk7XG4gIGxldCB2dHJlZSQgPSB2aWV3KHN0YXRlJCk7XG5cbiAgcmV0dXJuIHtcbiAgICBET006IHZ0cmVlJCxcbiAgICBhY3Rpb24kLFxuICB9O1xufVxuXG5leHBvcnQgZGVmYXVsdCBUYXNrO1xuIiwiaW1wb3J0IHhzIGZyb20gJ3hzdHJlYW0nO1xuaW1wb3J0IHtFTlRFUl9LRVksIEVTQ19LRVl9IGZyb20gJy4uLy4uL3V0aWxzJztcblxuLy8gVEhFIFRPRE8gSVRFTSBJTlRFTlRcbi8vIFRoaXMgaW50ZW50IGZ1bmN0aW9uIHJldHVybnMgYSBzdHJlYW0gb2YgYWxsIHRoZSBkaWZmZXJlbnQsXG4vLyBhY3Rpb25zIHRoYXQgY2FuIGJlIHRha2VuIG9uIGEgdG9kby5cbmZ1bmN0aW9uIGludGVudChET01Tb3VyY2UpIHtcbiAgLy8gVEhFIElOVEVOVCBNRVJHRVxuICAvLyBNZXJnZSBhbGwgYWN0aW9ucyBpbnRvIG9uZSBzdHJlYW0uXG4gIHJldHVybiB4cy5tZXJnZShcbiAgICAvLyBUSEUgREVTVFJPWSBBQ1RJT04gU1RSRUFNXG4gICAgRE9NU291cmNlLnNlbGVjdCgnLmRlc3Ryb3knKS5ldmVudHMoJ2NsaWNrJylcbiAgICAgIC5tYXBUbyh7dHlwZTogJ2Rlc3Ryb3knfSksXG5cbiAgICAvLyBUSEUgVE9HR0xFIEFDVElPTiBTVFJFQU1cbiAgICBET01Tb3VyY2Uuc2VsZWN0KCcudG9nZ2xlJykuZXZlbnRzKCdjaGFuZ2UnKVxuICAgICAgLm1hcFRvKHt0eXBlOiAndG9nZ2xlJ30pLFxuXG4gICAgLy8gVEhFIFNUQVJUIEVESVQgQUNUSU9OIFNUUkVBTVxuICAgIERPTVNvdXJjZS5zZWxlY3QoJ2xhYmVsJykuZXZlbnRzKCdkYmxjbGljaycpXG4gICAgICAubWFwVG8oe3R5cGU6ICdzdGFydEVkaXQnfSksXG5cbiAgICAvLyBUSEUgRVNDIEtFWSBBQ1RJT04gU1RSRUFNXG4gICAgRE9NU291cmNlLnNlbGVjdCgnLmVkaXQnKS5ldmVudHMoJ2tleXVwJylcbiAgICAgIC5maWx0ZXIoZXYgPT4gZXYua2V5Q29kZSA9PT0gRVNDX0tFWSlcbiAgICAgIC5tYXBUbyh7dHlwZTogJ2NhbmNlbEVkaXQnfSksXG5cbiAgICAvLyBUSEUgRU5URVIgS0VZIEFDVElPTiBTVFJFQU1cbiAgICBET01Tb3VyY2Uuc2VsZWN0KCcuZWRpdCcpLmV2ZW50cygna2V5dXAnKVxuICAgICAgLmZpbHRlcihldiA9PiBldi5rZXlDb2RlID09PSBFTlRFUl9LRVkpXG4gICAgICAuY29tcG9zZShzID0+IHhzLm1lcmdlKHMsIERPTVNvdXJjZS5zZWxlY3QoJy5lZGl0JykuZXZlbnRzKCdibHVyJywgdHJ1ZSkpKVxuICAgICAgLm1hcChldiA9PiAoe3RpdGxlOiBldi50YXJnZXQudmFsdWUsIHR5cGU6ICdkb25lRWRpdCd9KSlcbiAgKTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgaW50ZW50O1xuIiwiaW1wb3J0IHhzIGZyb20gJ3hzdHJlYW0nO1xuXG5mdW5jdGlvbiBtb2RlbChwcm9wcyQsIGFjdGlvbiQpIHtcbiAgLy8gVEhFIFNBTklUSVpFRCBQUk9QRVJUSUVTXG4gIC8vIElmIHRoZSBsaXN0IGl0ZW0gaGFzIG5vIGRhdGEgc2V0IGl0IGFzIGVtcHR5IGFuZCBub3QgY29tcGxldGVkLlxuICBsZXQgc2FuaXRpemVkUHJvcHMkID0gcHJvcHMkLnN0YXJ0V2l0aCh7dGl0bGU6ICcnLCBjb21wbGV0ZWQ6IGZhbHNlfSk7XG5cbiAgLy8gVEhFIEVESVRJTkcgU1RSRUFNXG4gIC8vIENyZWF0ZSBhIHN0cmVhbSB0aGF0IGVtaXRzIGJvb2xlYW5zIHRoYXQgcmVwcmVzZW50IHRoZVxuICAvLyBcImlzIGVkaXRpbmdcIiBzdGF0ZS5cbiAgbGV0IGVkaXRpbmckID1cbiAgICB4cy5tZXJnZShcbiAgICAgIGFjdGlvbiQuZmlsdGVyKGEgPT4gYS50eXBlID09PSAnc3RhcnRFZGl0JykubWFwVG8odHJ1ZSksXG4gICAgICBhY3Rpb24kLmZpbHRlcihhID0+IGEudHlwZSA9PT0gJ2RvbmVFZGl0JykubWFwVG8oZmFsc2UpLFxuICAgICAgYWN0aW9uJC5maWx0ZXIoYSA9PiBhLnR5cGUgPT09ICdjYW5jZWxFZGl0JykubWFwVG8oZmFsc2UpXG4gICAgKVxuICAgIC5zdGFydFdpdGgoZmFsc2UpO1xuXG4gIHJldHVybiB4cy5jb21iaW5lKFxuICAgICh7dGl0bGUsIGNvbXBsZXRlZH0sIGVkaXRpbmcpID0+ICh7XG4gICAgICB0aXRsZSxcbiAgICAgIGlzQ29tcGxldGVkOiBjb21wbGV0ZWQsXG4gICAgICBpc0VkaXRpbmc6IGVkaXRpbmcsXG4gICAgfSksXG4gICAgc2FuaXRpemVkUHJvcHMkLCBlZGl0aW5nJFxuICApO1xufVxuXG5leHBvcnQgZGVmYXVsdCBtb2RlbDtcbiIsImltcG9ydCB7YnV0dG9uLCBkaXYsIGlucHV0LCBsYWJlbCwgbGl9IGZyb20gJ0BjeWNsZS9kb20nO1xuXG5mdW5jdGlvbiB2aWV3KHN0YXRlJCkge1xuICByZXR1cm4gc3RhdGUkLm1hcCgoe3RpdGxlLCBpc0NvbXBsZXRlZCwgaXNFZGl0aW5nfSkgPT4ge1xuICAgIGxldCB0b2RvUm9vdENsYXNzZXMgPSB7XG4gICAgICBjb21wbGV0ZWQ6IGlzQ29tcGxldGVkLFxuICAgICAgZWRpdGluZzogaXNFZGl0aW5nLFxuICAgIH07XG5cbiAgICByZXR1cm4gbGkoJy50b2RvUm9vdCcsIHtjbGFzczogdG9kb1Jvb3RDbGFzc2VzfSwgW1xuICAgICAgZGl2KCcudmlldycsIFtcbiAgICAgICAgaW5wdXQoJy50b2dnbGUnLCB7XG4gICAgICAgICAgcHJvcHM6IHt0eXBlOiAnY2hlY2tib3gnLCBjaGVja2VkOiBpc0NvbXBsZXRlZH0sXG4gICAgICAgIH0pLFxuICAgICAgICBsYWJlbCh0aXRsZSksXG4gICAgICAgIGJ1dHRvbignLmRlc3Ryb3knKVxuICAgICAgXSksXG4gICAgICBpbnB1dCgnLmVkaXQnLCB7XG4gICAgICAgIHByb3BzOiB7dHlwZTogJ3RleHQnfSxcbiAgICAgICAgaG9vazoge1xuICAgICAgICAgIHVwZGF0ZTogKG9sZFZOb2RlLCB7ZWxtfSkgPT4ge1xuICAgICAgICAgICAgZWxtLnZhbHVlID0gdGl0bGU7XG4gICAgICAgICAgICBpZiAoaXNFZGl0aW5nKSB7XG4gICAgICAgICAgICAgIGVsbS5mb2N1cygpO1xuICAgICAgICAgICAgICBlbG0uc2VsZWN0aW9uU3RhcnQgPSBlbG0udmFsdWUubGVuZ3RoO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSlcbiAgICBdKTtcbiAgfSk7XG59XG5cbmV4cG9ydCBkZWZhdWx0IHZpZXc7XG4iLCJpbXBvcnQgeHMgZnJvbSAneHN0cmVhbSc7XG5pbXBvcnQgaXNvbGF0ZSBmcm9tICdAY3ljbGUvaXNvbGF0ZSdcbmltcG9ydCBpbnRlbnQgZnJvbSAnLi9pbnRlbnQnO1xuaW1wb3J0IG1vZGVsIGZyb20gJy4vbW9kZWwnO1xuaW1wb3J0IHZpZXcgZnJvbSAnLi92aWV3JztcbmltcG9ydCBkZXNlcmlhbGl6ZSBmcm9tICcuL3N0b3JhZ2Utc291cmNlJztcbmltcG9ydCBzZXJpYWxpemUgZnJvbSAnLi9zdG9yYWdlLXNpbmsnO1xuaW1wb3J0IFRhc2sgZnJvbSAnLi4vVGFzay9pbmRleCc7XG5cbi8vIEFNRU5EIFNUQVRFIFdJVEggQ0hJTERSRU5cbi8vIFRoaXMgZnVuY3Rpb24gY3JlYXRlcyB0aGUgcHJvamVjdGlvbiBmdW5jdGlvblxuLy8gZm9yIHRoZSBtYXAgZnVuY3Rpb24gYmVsb3cuXG5mdW5jdGlvbiBhbWVuZFN0YXRlV2l0aENoaWxkcmVuKERPTVNvdXJjZSkge1xuICByZXR1cm4gZnVuY3Rpb24gKHRvZG9zRGF0YSkge1xuICAgIHJldHVybiB7XG4gICAgICAuLi50b2Rvc0RhdGEsXG4gICAgICAvLyBUaGUgbGlzdCBwcm9wZXJ0eSBpcyB0aGUgb25seSBvbmUgYmVpbmcgYW1lbmRlZC5cbiAgICAgIC8vIFdlIG1hcCBvdmVyIHRoZSBhcnJheSBpbiB0aGUgbGlzdCBwcm9wZXJ0eSB0b1xuICAgICAgLy8gZW5oYW5jZSB0aGVtIHdpdGggdGhlIGFjdHVhbCB0b2RvIGl0ZW0gZGF0YSBmbG93IGNvbXBvbmVudHMuXG4gICAgICBsaXN0OiB0b2Rvc0RhdGEubGlzdC5tYXAoZGF0YSA9PiB7XG4gICAgICAgIC8vIFR1cm4gdGhlIGRhdGEgaXRlbSBpbnRvIGFuIE9ic2VydmFibGVcbiAgICAgICAgbGV0IHByb3BzJCA9IHhzLm9mKGRhdGEpO1xuICAgICAgICAvLyBDcmVhdGUgc2NvcGVkIHRvZG8gaXRlbSBkYXRhZmxvdyBjb21wb25lbnQuXG4gICAgICAgIGxldCB0b2RvSXRlbSA9IGlzb2xhdGUoVGFzaykoe0RPTTogRE9NU291cmNlLCBwcm9wcyR9KTtcblxuICAgICAgICAvLyBSZXR1cm4gdGhlIG5ldyBkYXRhIGl0ZW0gZm9yIHRoZSBsaXN0IHByb3BlcnR5IGFycmF5LlxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIC4uLmRhdGEsXG4gICAgICAgICAgLy8gVGhpcyBpcyBhIG5ldyBwcm9wZXJ0eSBjb250YWluaW5nIHRoZSBET00tIGFuZCBhY3Rpb24gc3RyZWFtIG9mXG4gICAgICAgICAgLy8gdGhlIHRvZG8gaXRlbS5cbiAgICAgICAgICB0b2RvSXRlbToge1xuICAgICAgICAgICAgRE9NOiB0b2RvSXRlbS5ET00sXG4gICAgICAgICAgICBhY3Rpb24kOiB0b2RvSXRlbS5hY3Rpb24kLm1hcChldiA9PiAoey4uLmV2LCBpZDogZGF0YS5pZH0pKVxuICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgIH0pLFxuICAgIH07XG4gIH07XG59XG5cbi8vIFRIRSBUQVNLTElTVCBDT01QT05FTlRcbi8vIFRoaXMgaXMgdGhlIFRhc2tMaXN0IGNvbXBvbmVudCB3aGljaCBpcyBiZWluZyBleHBvcnRlZCBiZWxvdy5cbmZ1bmN0aW9uIFRhc2tMaXN0KHNvdXJjZXMpIHtcbiAgLy8gVEhFIExPQ0FMU1RPUkFHRSBTVFJFQU1cbiAgLy8gSGVyZSB3ZSBjcmVhdGUgYSBsb2NhbFN0b3JhZ2Ugc3RyZWFtIHRoYXQgb25seSBzdHJlYW1zXG4gIC8vIHRoZSBmaXJzdCB2YWx1ZSByZWFkIGZyb20gbG9jYWxTdG9yYWdlIGluIG9yZGVyIHRvXG4gIC8vIHN1cHBseSB0aGUgYXBwbGljYXRpb24gd2l0aCBpbml0aWFsIHN0YXRlLlxuICBsZXQgbG9jYWxTdG9yYWdlJCA9IHNvdXJjZXMuc3RvcmFnZS5sb2NhbC5nZXRJdGVtKCd0b2Rvcy1jeWNsZScpLnRha2UoMSk7XG4gIC8vIFRIRSBJTklUSUFMIFRPRE8gREFUQVxuICAvLyBUaGUgYGRlc2VyaWFsaXplYCBmdW5jdGlvbiB0YWtlcyB0aGUgc2VyaWFsaXplZCBKU09OIHN0b3JlZCBpbiBsb2NhbFN0b3JhZ2VcbiAgLy8gYW5kIHR1cm5zIGl0IGludG8gYSBzdHJlYW0gc2VuZGluZyBhIEpTT04gb2JqZWN0LlxuICBsZXQgc291cmNlVG9kb3NEYXRhJCA9IGRlc2VyaWFsaXplKGxvY2FsU3RvcmFnZSQpO1xuICAvLyBUSEUgUFJPWFkgSVRFTSBBQ1RJT04gU1RSRUFNXG4gIC8vIFdlIGNyZWF0ZSBhIHN0cmVhbSBhcyBhIHByb3h5IGZvciBhbGwgdGhlIGFjdGlvbnMgZnJvbSBlYWNoIHRhc2suXG4gIGxldCBwcm94eUl0ZW1BY3Rpb24kID0geHMuY3JlYXRlTWltaWMoKTtcbiAgLy8gVEhFIElOVEVOVCAoTVZJIFBBVFRFUk4pXG4gIC8vIFBhc3MgcmVsZXZhbnQgc291cmNlcyB0byB0aGUgaW50ZW50IGZ1bmN0aW9uLCB3aGljaCBzZXQgdXBcbiAgLy8gc3RyZWFtcyB0aGF0IG1vZGVsIHRoZSB1c2VycyBhY3Rpb25zLlxuICBsZXQgYWN0aW9uJCA9IGludGVudChzb3VyY2VzLkRPTSwgc291cmNlcy5IaXN0b3J5LCBwcm94eUl0ZW1BY3Rpb24kKTtcbiAgLy8gVEhFIE1PREVMIChNVkkgUEFUVEVSTilcbiAgLy8gQWN0aW9ucyBnZXQgcGFzc2VkIHRvIHRoZSBtb2RlbCBmdW5jdGlvbiB3aGljaCB0cmFuc2Zvcm1zIHRoZSBkYXRhXG4gIC8vIGNvbWluZyB0aHJvdWdoIGFuZCBwcmVwYXJlcyB0aGUgZGF0YSBmb3IgdGhlIHZpZXcuXG4gIGxldCBzdGF0ZSQgPSBtb2RlbChhY3Rpb24kLCBzb3VyY2VUb2Rvc0RhdGEkKTtcbiAgLy8gQU1FTkQgU1RBVEUgV0lUSCBDSElMRFJFTlxuICBsZXQgYW1lbmRlZFN0YXRlJCA9IHN0YXRlJFxuICAgIC5tYXAoYW1lbmRTdGF0ZVdpdGhDaGlsZHJlbihzb3VyY2VzLkRPTSkpXG4gICAgLnJlbWVtYmVyKCk7XG4gIC8vIEEgU1RSRUFNIE9GIEFMTCBBQ1RJT05TIE9OIEFMTCBUQVNLU1xuICAvLyBFYWNoIHRvZG8gaXRlbSBoYXMgYW4gYWN0aW9uIHN0cmVhbS4gQWxsIHRob3NlIGFjdGlvbiBzdHJlYW1zIGFyZSBiZWluZ1xuICAvLyBtZXJnZWQgaW50byBhIHN0cmVhbSBvZiBhbGwgYWN0aW9ucy4gQmVsb3cgdGhpcyBzdHJlYW0gaXMgcGFzc2VkIGludG9cbiAgLy8gdGhlIHByb3h5SXRlbUFjdGlvbiQgdGhhdCB3ZSBwYXNzZWQgdG8gdGhlIGludGVudCBmdW5jdGlvbiBhYm92ZS5cbiAgLy8gVGhpcyBpcyBob3cgdGhlIGludGVudCBvbiBhbGwgdGhlIHRvZG8gaXRlbXMgZmxvd3MgYmFjayB0aHJvdWdoIHRoZSBpbnRlbnRcbiAgLy8gZnVuY3Rpb24gb2YgdGhlIGxpc3QgYW5kIGNhbiBiZSBoYW5kbGVkIGluIHRoZSBtb2RlbCBmdW5jdGlvbiBvZiB0aGUgbGlzdC5cbiAgbGV0IGl0ZW1BY3Rpb24kID0gYW1lbmRlZFN0YXRlJFxuICAgIC5tYXAoKHtsaXN0fSkgPT4geHMubWVyZ2UoLi4ubGlzdC5tYXAoaSA9PiBpLnRvZG9JdGVtLmFjdGlvbiQpKSlcbiAgICAuZmxhdHRlbigpO1xuICAvLyBQQVNTIFJFQUwgSVRFTSBBQ1RJT05TIFRPIFBST1hZXG4gIC8vIFRoZSBpdGVtIGFjdGlvbnMgYXJlIHBhc3NlZCB0byB0aGUgcHJveHkgb2JqZWN0LlxuICBwcm94eUl0ZW1BY3Rpb24kLmltaXRhdGUoaXRlbUFjdGlvbiQpO1xuICAvLyBUSEUgVklFVyAoTVZJIFBBVFRFUk4pXG4gIC8vIFdlIHJlbmRlciBzdGF0ZSBhcyBtYXJrdXAgZm9yIHRoZSBET00uXG4gIGxldCB2ZG9tJCA9IHZpZXcoYW1lbmRlZFN0YXRlJCk7XG4gIC8vIFdSSVRFIFRPIExPQ0FMU1RPUkFHRVxuICAvLyBUaGUgbGF0ZXN0IHN0YXRlIGlzIHdyaXR0ZW4gdG8gbG9jYWxTdG9yYWdlLlxuICBsZXQgc3RvcmFnZSQgPSBzZXJpYWxpemUoc3RhdGUkKS5tYXAoKHN0YXRlKSA9PiAoe1xuICAgIGtleTogJ3RvZG9zLWN5Y2xlJywgdmFsdWU6IHN0YXRlXG4gIH0pKTtcbiAgLy8gQ09NUExFVEUgVEhFIENZQ0xFXG4gIC8vIFdyaXRlIHRoZSB2aXJ0dWFsIGRvbSBzdHJlYW0gdG8gdGhlIERPTSBhbmQgd3JpdGUgdGhlXG4gIC8vIHN0b3JhZ2Ugc3RyZWFtIHRvIGxvY2FsU3RvcmFnZS5cbiAgbGV0IHNpbmtzID0ge1xuICAgIERPTTogdmRvbSQsXG4gICAgc3RvcmFnZTogc3RvcmFnZSQsXG4gIH07XG4gIHJldHVybiBzaW5rcztcbn1cblxuZXhwb3J0IGRlZmF1bHQgVGFza0xpc3Q7XG4iLCJpbXBvcnQgeHMgZnJvbSAneHN0cmVhbSc7XG5pbXBvcnQgZHJvcFJlcGVhdHMgZnJvbSAneHN0cmVhbS9leHRyYS9kcm9wUmVwZWF0cyc7XG5pbXBvcnQge0VOVEVSX0tFWSwgRVNDX0tFWX0gZnJvbSAnLi4vLi4vdXRpbHMnO1xuXG4vLyBUSEUgSU5URU5UIEZPUiBUSEUgTElTVFxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gaW50ZW50KERPTVNvdXJjZSwgSGlzdG9yeSwgaXRlbUFjdGlvbiQpIHtcbiAgcmV0dXJuIHhzLm1lcmdlKFxuICAgIC8vIFRIRSBST1VURSBTVFJFQU1cbiAgICAvLyBBIHN0cmVhbSB0aGF0IHByb3ZpZGVzIHRoZSBwYXRoIHdoZW5ldmVyIHRoZSByb3V0ZSBjaGFuZ2VzLlxuICAgIEhpc3RvcnlcbiAgICAgIC5zdGFydFdpdGgoe3BhdGhuYW1lOiAnLyd9KVxuICAgICAgLm1hcChsb2NhdGlvbiA9PiBsb2NhdGlvbi5wYXRobmFtZSlcbiAgICAgIC5jb21wb3NlKGRyb3BSZXBlYXRzKCkpXG4gICAgICAubWFwKHBheWxvYWQgPT4gKHt0eXBlOiAnY2hhbmdlUm91dGUnLCBwYXlsb2FkfSkpLFxuXG4gICAgLy8gVEhFIFVSTCBTVFJFQU1cbiAgICAvLyBBIHN0cmVhbSBvZiBVUkwgY2xpY2tzIGluIHRoZSBhcHBcbiAgICBET01Tb3VyY2Uuc2VsZWN0KCdhJykuZXZlbnRzKCdjbGljaycpXG4gICAgICAubWFwKGV2ZW50ID0+ICBldmVudC50YXJnZXQuaGFzaC5yZXBsYWNlKCcjJywgJycpKVxuICAgICAgLm1hcChwYXlsb2FkID0+ICh7dHlwZTogJ3VybCcsIHBheWxvYWR9KSksXG5cbiAgICAvLyBDTEVBUiBJTlBVVCBTVFJFQU1cbiAgICAvLyBBIHN0cmVhbSBvZiBFU0Mga2V5IHN0cm9rZXMgaW4gdGhlIGAubmV3LXRvZG9gIGZpZWxkLlxuICAgIERPTVNvdXJjZS5zZWxlY3QoJy5uZXctdG9kbycpLmV2ZW50cygna2V5ZG93bicpXG4gICAgICAuZmlsdGVyKGV2ID0+IGV2LmtleUNvZGUgPT09IEVTQ19LRVkpXG4gICAgICAubWFwKHBheWxvYWQgPT4gKHt0eXBlOiAnY2xlYXJJbnB1dCcsIHBheWxvYWR9KSksXG5cbiAgICAvLyBFTlRFUiBLRVkgU1RSRUFNXG4gICAgLy8gQSBzdHJlYW0gb2YgRU5URVIga2V5IHN0cm9rZXMgaW4gdGhlIGAubmV3LXRvZG9gIGZpZWxkLlxuICAgIERPTVNvdXJjZS5zZWxlY3QoJy5uZXctdG9kbycpLmV2ZW50cygna2V5ZG93bicpXG4gICAgICAvLyBUcmltIHZhbHVlIGFuZCBvbmx5IGxldCB0aGUgZGF0YSB0aHJvdWdoIHdoZW4gdGhlcmVcbiAgICAgIC8vIGlzIGFueXRoaW5nIGJ1dCB3aGl0ZXNwYWNlIGluIHRoZSBmaWVsZCBhbmQgdGhlIEVOVEVSIGtleSB3YXMgaGl0LlxuICAgICAgLmZpbHRlcihldiA9PiB7XG4gICAgICAgIGxldCB0cmltbWVkVmFsID0gU3RyaW5nKGV2LnRhcmdldC52YWx1ZSkudHJpbSgpO1xuICAgICAgICByZXR1cm4gZXYua2V5Q29kZSA9PT0gRU5URVJfS0VZICYmIHRyaW1tZWRWYWw7XG4gICAgICB9KVxuICAgICAgLy8gUmV0dXJuIHRoZSB0cmltbWVkIHZhbHVlLlxuICAgICAgLm1hcChldiA9PiBTdHJpbmcoZXYudGFyZ2V0LnZhbHVlKS50cmltKCkpXG4gICAgICAubWFwKHBheWxvYWQgPT4gKHt0eXBlOiAnaW5zZXJ0VG9kbycsIHBheWxvYWR9KSksXG5cbiAgICAvLyBUT0dHTEUgU1RSRUFNXG4gICAgLy8gQ3JlYXRlIGEgc3RyZWFtIG91dCBvZiBhbGwgdGhlIHRvZ2dsZSBhY3Rpb25zIG9uIHRoZSB0b2RvIGl0ZW1zLlxuICAgIGl0ZW1BY3Rpb24kLmZpbHRlcihhY3Rpb24gPT4gYWN0aW9uLnR5cGUgPT09ICd0b2dnbGUnKVxuICAgICAgLm1hcChhY3Rpb24gPT4gKHsuLi5hY3Rpb24sIHR5cGU6ICd0b2dnbGVUb2RvJ30pKSxcblxuICAgIC8vIERFTEVURSBTVFJFQU1cbiAgICAvLyBDcmVhdGUgYSBzdHJlYW0gb3V0IG9mIGFsbCB0aGUgZGVzdHJveSBhY3Rpb25zIG9uIHRoZSB0b2RvIGl0ZW1zLlxuICAgIGl0ZW1BY3Rpb24kLmZpbHRlcihhY3Rpb24gPT4gYWN0aW9uLnR5cGUgPT09ICdkZXN0cm95JylcbiAgICAgIC5tYXAoYWN0aW9uID0+ICh7Li4uYWN0aW9uLCB0eXBlOiAnZGVsZXRlVG9kbyd9KSksXG5cbiAgICAvLyBFRElUIFNUUkVBTVxuICAgIC8vIENyZWF0ZSBhIHN0cmVhbSBvdXQgb2YgYWxsIHRoZSBkb25lRWRpdCBhY3Rpb25zIG9uIHRoZSB0b2RvIGl0ZW1zLlxuICAgIGl0ZW1BY3Rpb24kLmZpbHRlcihhY3Rpb24gPT4gYWN0aW9uLnR5cGUgPT09ICdkb25lRWRpdCcpXG4gICAgICAubWFwKGFjdGlvbiA9PiAoey4uLmFjdGlvbiwgdHlwZTogJ2VkaXRUb2RvJ30pKSxcblxuICAgIC8vIFRPR0dMRSBBTEwgU1RSRUFNXG4gICAgLy8gQ3JlYXRlIGEgc3RyZWFtIG91dCBvZiB0aGUgY2xpY2tzIG9uIHRoZSBgLnRvZ2dsZS1hbGxgIGJ1dHRvbi5cbiAgICBET01Tb3VyY2Uuc2VsZWN0KCcudG9nZ2xlLWFsbCcpLmV2ZW50cygnY2xpY2snKVxuICAgICAgLm1hcFRvKHt0eXBlOiAndG9nZ2xlQWxsJ30pLFxuXG4gICAgLy8gREVMRVRFIENPTVBMRVRFRCBUT0RPUyBTVFJFQU1cbiAgICAvLyBBIHN0cmVhbSBvZiBjbGljayBldmVudHMgb24gdGhlIGAuY2xlYXItY29tcGxldGVkYCBlbGVtZW50LlxuICAgIERPTVNvdXJjZS5zZWxlY3QoJy5jbGVhci1jb21wbGV0ZWQnKS5ldmVudHMoJ2NsaWNrJylcbiAgICAgIC5tYXBUbyh7dHlwZTogJ2RlbGV0ZUNvbXBsZXRlZHMnfSlcbiAgKTtcbn07XG4iLCJpbXBvcnQgeHMgZnJvbSAneHN0cmVhbSc7XG5pbXBvcnQgY29uY2F0IGZyb20gJ3hzdHJlYW0vZXh0cmEvY29uY2F0JztcblxuLy8gQSBoZWxwZXIgZnVuY3Rpb24gdGhhdCBwcm92aWRlcyBmaWx0ZXIgZnVuY3Rpb25zXG4vLyBkZXBlbmRpbmcgb24gdGhlIHJvdXRlIHZhbHVlLlxuZnVuY3Rpb24gZ2V0RmlsdGVyRm4ocm91dGUpIHtcbiAgc3dpdGNoIChyb3V0ZSkge1xuICAgIGNhc2UgJy9hY3RpdmUnOiByZXR1cm4gKHRhc2sgPT4gdGFzay5jb21wbGV0ZWQgPT09IGZhbHNlKTtcbiAgICBjYXNlICcvY29tcGxldGVkJzogcmV0dXJuICh0YXNrID0+IHRhc2suY29tcGxldGVkID09PSB0cnVlKTtcbiAgICBkZWZhdWx0OiByZXR1cm4gKCkgPT4gdHJ1ZTsgLy8gYWxsb3cgYW55dGhpbmdcbiAgfVxufVxuXG4vLyBUaGlzIHNlYXJjaCBmdW5jdGlvbiBpcyB1c2VkIGluIHRoZSBgbWFrZVJlZHVjZXIkYFxuLy8gZnVuY3Rpb24gYmVsb3cgdG8gcmV0cmlldmUgdGhlIGluZGV4IG9mIGEgdG9kbyBpbiB0aGUgdG9kb3NMaXN0XG4vLyBpbiBvcmRlciB0byBtYWtlIGEgbW9kaWZpY2F0aW9uIHRvIHRoZSB0b2RvIGRhdGEuXG5mdW5jdGlvbiBzZWFyY2hUb2RvSW5kZXgodG9kb3NMaXN0LCB0b2RvaWQpIHtcbiAgbGV0IHBvaW50ZXJJZDtcbiAgbGV0IGluZGV4O1xuICBsZXQgdG9wID0gdG9kb3NMaXN0Lmxlbmd0aDtcbiAgbGV0IGJvdHRvbSA9IDA7XG4gIGZvciAobGV0IGkgPSB0b2Rvc0xpc3QubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHsgLy8gYmluYXJ5IHNlYXJjaFxuICAgIGluZGV4ID0gYm90dG9tICsgKCh0b3AgLSBib3R0b20pID4+IDEpO1xuICAgIHBvaW50ZXJJZCA9IHRvZG9zTGlzdFtpbmRleF0uaWQ7XG4gICAgaWYgKHBvaW50ZXJJZCA9PT0gdG9kb2lkKSB7XG4gICAgICByZXR1cm4gaW5kZXg7XG4gICAgfSBlbHNlIGlmIChwb2ludGVySWQgPCB0b2RvaWQpIHtcbiAgICAgIGJvdHRvbSA9IGluZGV4O1xuICAgIH0gZWxzZSBpZiAocG9pbnRlcklkID4gdG9kb2lkKSB7XG4gICAgICB0b3AgPSBpbmRleDtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIG51bGw7XG59XG5cbi8vIE1BS0UgUkVEVUNFUiBTVFJFQU1cbi8vIEEgZnVuY3Rpb24gdGhhdCB0YWtlcyB0aGUgYWN0aW9ucyBvbiB0aGUgdG9kbyBsaXN0XG4vLyBhbmQgcmV0dXJucyBhIHN0cmVhbSBvZiBcInJlZHVjZXJzXCI6IGZ1bmN0aW9ucyB0aGF0IGV4cGVjdCB0aGUgY3VycmVudFxuLy8gdG9kb3NEYXRhICh0aGUgc3RhdGUpIGFuZCByZXR1cm4gYSBuZXcgdmVyc2lvbiBvZiB0b2Rvc0RhdGEuXG5mdW5jdGlvbiBtYWtlUmVkdWNlciQoYWN0aW9uJCkge1xuICBsZXQgY2xlYXJJbnB1dFJlZHVjZXIkID0gYWN0aW9uJFxuICAgIC5maWx0ZXIoYSA9PiBhLnR5cGUgPT09ICdjbGVhcklucHV0JylcbiAgICAubWFwVG8oZnVuY3Rpb24gY2xlYXJJbnB1dFJlZHVjZXIodG9kb3NEYXRhKSB7XG4gICAgICByZXR1cm4gdG9kb3NEYXRhO1xuICAgIH0pO1xuXG4gIGxldCBpbnNlcnRUb2RvUmVkdWNlciQgPSBhY3Rpb24kXG4gICAgLmZpbHRlcihhID0+IGEudHlwZSA9PT0gJ2luc2VydFRvZG8nKVxuICAgIC5tYXAoYWN0aW9uID0+IGZ1bmN0aW9uIGluc2VydFRvZG9SZWR1Y2VyKHRvZG9zRGF0YSkge1xuICAgICAgbGV0IGxhc3RJZCA9IHRvZG9zRGF0YS5saXN0Lmxlbmd0aCA+IDAgP1xuICAgICAgICB0b2Rvc0RhdGEubGlzdFt0b2Rvc0RhdGEubGlzdC5sZW5ndGggLSAxXS5pZCA6XG4gICAgICAgIDA7XG4gICAgICB0b2Rvc0RhdGEubGlzdC5wdXNoKHtcbiAgICAgICAgaWQ6IGxhc3RJZCArIDEsXG4gICAgICAgIHRpdGxlOiBhY3Rpb24ucGF5bG9hZCxcbiAgICAgICAgY29tcGxldGVkOiBmYWxzZVxuICAgICAgfSk7XG4gICAgICByZXR1cm4gdG9kb3NEYXRhO1xuICAgIH0pO1xuXG4gIGxldCBlZGl0VG9kb1JlZHVjZXIkID0gYWN0aW9uJFxuICAgIC5maWx0ZXIoYSA9PiBhLnR5cGUgPT09ICdlZGl0VG9kbycpXG4gICAgLm1hcChhY3Rpb24gPT4gZnVuY3Rpb24gZWRpdFRvZG9SZWR1Y2VyKHRvZG9zRGF0YSkge1xuICAgICAgbGV0IHRvZG9JbmRleCA9IHNlYXJjaFRvZG9JbmRleCh0b2Rvc0RhdGEubGlzdCwgYWN0aW9uLmlkKTtcbiAgICAgIHRvZG9zRGF0YS5saXN0W3RvZG9JbmRleF0udGl0bGUgPSBhY3Rpb24udGl0bGU7XG4gICAgICByZXR1cm4gdG9kb3NEYXRhO1xuICAgIH0pO1xuXG4gIGxldCB0b2dnbGVUb2RvUmVkdWNlciQgPSBhY3Rpb24kXG4gICAgLmZpbHRlcihhID0+IGEudHlwZSA9PT0gJ3RvZ2dsZVRvZG8nKVxuICAgIC5tYXAoYWN0aW9uID0+IGZ1bmN0aW9uIHRvZ2dsZVRvZG9SZWR1Y2VyKHRvZG9zRGF0YSkge1xuICAgICAgbGV0IHRvZG9JbmRleCA9IHNlYXJjaFRvZG9JbmRleCh0b2Rvc0RhdGEubGlzdCwgYWN0aW9uLmlkKTtcbiAgICAgIGxldCBwcmV2aW91c0NvbXBsZXRlZCA9IHRvZG9zRGF0YS5saXN0W3RvZG9JbmRleF0uY29tcGxldGVkO1xuICAgICAgdG9kb3NEYXRhLmxpc3RbdG9kb0luZGV4XS5jb21wbGV0ZWQgPSAhcHJldmlvdXNDb21wbGV0ZWQ7XG4gICAgICByZXR1cm4gdG9kb3NEYXRhO1xuICAgIH0pO1xuXG4gIGxldCB0b2dnbGVBbGxSZWR1Y2VyJCA9IGFjdGlvbiRcbiAgICAuZmlsdGVyKGEgPT4gYS50eXBlID09PSAndG9nZ2xlQWxsJylcbiAgICAubWFwVG8oZnVuY3Rpb24gdG9nZ2xlQWxsUmVkdWNlcih0b2Rvc0RhdGEpIHtcbiAgICAgIGxldCBhbGxBcmVDb21wbGV0ZWQgPSB0b2Rvc0RhdGEubGlzdFxuICAgICAgICAucmVkdWNlKCh4LCB5KSA9PiB4ICYmIHkuY29tcGxldGVkLCB0cnVlKTtcbiAgICAgIHRvZG9zRGF0YS5saXN0LmZvckVhY2goKHRvZG9EYXRhKSA9PiB7XG4gICAgICAgIHRvZG9EYXRhLmNvbXBsZXRlZCA9IGFsbEFyZUNvbXBsZXRlZCA/IGZhbHNlIDogdHJ1ZTtcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIHRvZG9zRGF0YTtcbiAgICB9KTtcblxuICBsZXQgZGVsZXRlVG9kb1JlZHVjZXIkID0gYWN0aW9uJFxuICAgIC5maWx0ZXIoYSA9PiBhLnR5cGUgPT09ICdkZWxldGVUb2RvJylcbiAgICAubWFwKGFjdGlvbiA9PiBmdW5jdGlvbiBkZWxldGVUb2RvUmVkdWNlcih0b2Rvc0RhdGEpIHtcbiAgICAgIGxldCB0b2RvSW5kZXggPSBzZWFyY2hUb2RvSW5kZXgodG9kb3NEYXRhLmxpc3QsIGFjdGlvbi5pZCk7XG4gICAgICB0b2Rvc0RhdGEubGlzdC5zcGxpY2UodG9kb0luZGV4LCAxKTtcbiAgICAgIHJldHVybiB0b2Rvc0RhdGE7XG4gICAgfSk7XG5cbiAgbGV0IGRlbGV0ZUNvbXBsZXRlZHNSZWR1Y2VyJCA9IGFjdGlvbiRcbiAgICAuZmlsdGVyKGEgPT4gYS50eXBlID09PSAnZGVsZXRlQ29tcGxldGVkcycpXG4gICAgLm1hcFRvKGZ1bmN0aW9uIGRlbGV0ZUNvbXBsZXRlZHNSZWR1Y2VyKHRvZG9zRGF0YSkge1xuICAgICAgdG9kb3NEYXRhLmxpc3QgPSB0b2Rvc0RhdGEubGlzdFxuICAgICAgICAuZmlsdGVyKHRvZG9EYXRhID0+IHRvZG9EYXRhLmNvbXBsZXRlZCA9PT0gZmFsc2UpO1xuICAgICAgcmV0dXJuIHRvZG9zRGF0YTtcbiAgICB9KTtcblxuICBsZXQgY2hhbmdlUm91dGVSZWR1Y2VyJCA9IGFjdGlvbiRcbiAgICAuZmlsdGVyKGEgPT4gYS50eXBlID09PSAnY2hhbmdlUm91dGUnKVxuICAgIC5tYXAoYSA9PiBhLnBheWxvYWQpXG4gICAgLnN0YXJ0V2l0aCgnLycpXG4gICAgLm1hcChwYXRoID0+IHtcbiAgICAgIGxldCBmaWx0ZXJGbiA9IGdldEZpbHRlckZuKHBhdGgpO1xuICAgICAgcmV0dXJuIGZ1bmN0aW9uIGNoYW5nZVJvdXRlUmVkdWNlcih0b2Rvc0RhdGEpIHtcbiAgICAgICAgdG9kb3NEYXRhLmZpbHRlciA9IHBhdGgucmVwbGFjZSgnLycsICcnKS50cmltKCk7XG4gICAgICAgIHRvZG9zRGF0YS5maWx0ZXJGbiA9IGZpbHRlckZuO1xuICAgICAgICByZXR1cm4gdG9kb3NEYXRhO1xuICAgICAgfTtcbiAgICB9KTtcblxuICByZXR1cm4geHMubWVyZ2UoXG4gICAgY2xlYXJJbnB1dFJlZHVjZXIkLFxuICAgIGluc2VydFRvZG9SZWR1Y2VyJCxcbiAgICBlZGl0VG9kb1JlZHVjZXIkLFxuICAgIHRvZ2dsZVRvZG9SZWR1Y2VyJCxcbiAgICB0b2dnbGVBbGxSZWR1Y2VyJCxcbiAgICBkZWxldGVUb2RvUmVkdWNlciQsXG4gICAgZGVsZXRlQ29tcGxldGVkc1JlZHVjZXIkLFxuICAgIGNoYW5nZVJvdXRlUmVkdWNlciRcbiAgKTtcbn1cblxuLy8gVEhJUyBJUyBUSEUgTU9ERUwgRlVOQ1RJT05cbi8vIEl0IGV4cGVjdHMgdGhlIGFjdGlvbnMgY29taW5nIGluIGZyb20gdGhlIHRvZG8gaXRlbXMgYW5kXG4vLyB0aGUgaW5pdGlhbCBsb2NhbFN0b3JhZ2UgZGF0YS5cbmZ1bmN0aW9uIG1vZGVsKGFjdGlvbiQsIHNvdXJjZVRvZG9zRGF0YSQpIHtcbiAgLy8gVEhFIEJVU0lORVNTIExPR0lDXG4gIC8vIEFjdGlvbnMgYXJlIHBhc3NlZCB0byB0aGUgYG1ha2VSZWR1Y2VyJGAgZnVuY3Rpb25cbiAgLy8gd2hpY2ggY3JlYXRlcyBhIHN0cmVhbSBvZiByZWR1Y2VyIGZ1bmN0aW9ucyB0aGF0IG5lZWRzXG4gIC8vIHRvIGJlIGFwcGxpZWQgb24gdGhlIHRvZG9EYXRhIHdoZW4gYW4gYWN0aW9uIGhhcHBlbnMuXG4gIGxldCByZWR1Y2VyJCA9IG1ha2VSZWR1Y2VyJChhY3Rpb24kKTtcblxuICAvLyBSRVRVUk4gVEhFIE1PREVMIERBVEFcbiAgcmV0dXJuIHNvdXJjZVRvZG9zRGF0YSQubWFwKHNvdXJjZVRvZG9zRGF0YSA9PlxuICAgIHJlZHVjZXIkLmZvbGQoKHRvZG9zRGF0YSwgcmVkdWNlcikgPT4gcmVkdWNlcih0b2Rvc0RhdGEpLCBzb3VyY2VUb2Rvc0RhdGEpXG4gICkuZmxhdHRlbigpXG4gIC8vIE1ha2UgdGhpcyByZW1lbWJlciBpdHMgbGF0ZXN0IGV2ZW50LCBzbyBsYXRlIGxpc3RlbmVyc1xuICAvLyB3aWxsIGJlIHVwZGF0ZWQgd2l0aCB0aGUgbGF0ZXN0IHN0YXRlLlxuICAucmVtZW1iZXIoKTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgbW9kZWw7XG4iLCIvLyBUdXJuIHRoZSBkYXRhIG9iamVjdCB0aGF0IGNvbnRhaW5zXG4vLyB0aGUgdG9kb3MgaW50byBhIHN0cmluZyBmb3IgbG9jYWxTdG9yYWdlLlxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gc2VyaWFsaXplKHRvZG9zJCkge1xuICByZXR1cm4gdG9kb3MkLm1hcCh0b2Rvc0RhdGEgPT4gSlNPTi5zdHJpbmdpZnkoXG4gICAge1xuICAgICAgbGlzdDogdG9kb3NEYXRhLmxpc3QubWFwKHRvZG9EYXRhID0+XG4gICAgICAgICh7XG4gICAgICAgICAgdGl0bGU6IHRvZG9EYXRhLnRpdGxlLFxuICAgICAgICAgIGNvbXBsZXRlZDogdG9kb0RhdGEuY29tcGxldGVkLFxuICAgICAgICAgIGlkOiB0b2RvRGF0YS5pZFxuICAgICAgICB9KVxuICAgICAgKVxuICAgIH1cbiAgKSk7XG59O1xuIiwiZnVuY3Rpb24gbWVyZ2UoKSB7XG4gIGxldCByZXN1bHQgPSB7fTtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICBsZXQgb2JqZWN0ID0gYXJndW1lbnRzW2ldO1xuICAgIGZvciAobGV0IGtleSBpbiBvYmplY3QpIHtcbiAgICAgIGlmIChvYmplY3QuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICByZXN1bHRba2V5XSA9IG9iamVjdFtrZXldO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufVxuXG5sZXQgc2FmZUpTT05QYXJzZSA9IHN0ciA9PiBKU09OLnBhcnNlKHN0cikgfHwge307XG5cbmxldCBtZXJnZVdpdGhEZWZhdWx0VG9kb3NEYXRhID0gdG9kb3NEYXRhID0+IHtcbiAgcmV0dXJuIG1lcmdlKHtcbiAgICBsaXN0OiBbXSxcbiAgICBmaWx0ZXI6ICcnLFxuICAgIGZpbHRlckZuOiAoKSA9PiB0cnVlLCAvLyBhbGxvdyBhbnl0aGluZ1xuICB9LCB0b2Rvc0RhdGEpO1xufVxuXG4vLyBUYWtlIGxvY2FsU3RvcmFnZSB0b2RvRGF0YSBzdHJlYW0gYW5kIHRyYW5zZm9ybSBpbnRvXG4vLyBhIEphdmFTY3JpcHQgb2JqZWN0LiBTZXQgZGVmYXVsdCBkYXRhLlxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gZGVzZXJpYWxpemUobG9jYWxTdG9yYWdlVmFsdWUkKSB7XG4gIHJldHVybiBsb2NhbFN0b3JhZ2VWYWx1ZSRcbiAgICAubWFwKHNhZmVKU09OUGFyc2UpXG4gICAgLm1hcChtZXJnZVdpdGhEZWZhdWx0VG9kb3NEYXRhKTtcbn07XG4iLCJpbXBvcnQge2EsIGJ1dHRvbiwgZGl2LCBmb290ZXIsIGgxLCBoZWFkZXIsIGlucHV0LCBsaSxcbiAgICAgICAgc2VjdGlvbiwgc3Bhbiwgc3Ryb25nLCB1bH0gZnJvbSAnQGN5Y2xlL2RvbSc7XG5cbmZ1bmN0aW9uIHJlbmRlckhlYWRlcigpIHtcbiAgcmV0dXJuIGhlYWRlcignLmhlYWRlcicsIFtcbiAgICBoMSgndG9kb3MnKSxcbiAgICBpbnB1dCgnLm5ldy10b2RvJywge1xuICAgICAgcHJvcHM6IHtcbiAgICAgICAgdHlwZTogJ3RleHQnLFxuICAgICAgICBwbGFjZWhvbGRlcjogJ1doYXQgbmVlZHMgdG8gYmUgZG9uZT8nLFxuICAgICAgICBhdXRvZm9jdXM6IHRydWUsXG4gICAgICAgIG5hbWU6ICduZXdUb2RvJ1xuICAgICAgfSxcbiAgICAgIGhvb2s6IHtcbiAgICAgICAgdXBkYXRlOiAob2xkVk5vZGUsIHtlbG19KSA9PiB7XG4gICAgICAgICAgZWxtLnZhbHVlID0gJyc7XG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0pXG4gIF0pO1xufVxuXG5mdW5jdGlvbiByZW5kZXJNYWluU2VjdGlvbih0b2Rvc0RhdGEpIHtcbiAgbGV0IGFsbENvbXBsZXRlZCA9IHRvZG9zRGF0YS5saXN0LnJlZHVjZSgoeCwgeSkgPT4geCAmJiB5LmNvbXBsZXRlZCwgdHJ1ZSk7XG4gIGxldCBzZWN0aW9uU3R5bGUgPSB7J2Rpc3BsYXknOiB0b2Rvc0RhdGEubGlzdC5sZW5ndGggPyAnJyA6ICdub25lJ307XG5cbiAgcmV0dXJuIHNlY3Rpb24oJy5tYWluJywge3N0eWxlOiBzZWN0aW9uU3R5bGV9LCBbXG4gICAgaW5wdXQoJy50b2dnbGUtYWxsJywge1xuICAgICAgcHJvcHM6IHt0eXBlOiAnY2hlY2tib3gnLCBjaGVja2VkOiBhbGxDb21wbGV0ZWR9LFxuICAgIH0pLFxuICAgIHVsKCcudG9kby1saXN0JywgdG9kb3NEYXRhLmxpc3RcbiAgICAgIC5maWx0ZXIodG9kb3NEYXRhLmZpbHRlckZuKVxuICAgICAgLm1hcChkYXRhID0+IGRhdGEudG9kb0l0ZW0uRE9NKVxuICAgIClcbiAgXSk7XG59XG5cbmZ1bmN0aW9uIHJlbmRlckZpbHRlckJ1dHRvbih0b2Rvc0RhdGEsIGZpbHRlclRhZywgcGF0aCwgbGFiZWwpIHtcbiAgcmV0dXJuIGxpKFtcbiAgICB0b2Rvc0RhdGEuZmlsdGVyID09PSBmaWx0ZXJUYWcgP1xuICAgICAgYSgnLnNlbGVjdGVkJywge3Byb3BzOiB7aHJlZjogcGF0aH19LCBsYWJlbCkgOlxuICAgICAgYSh7cHJvcHM6IHtocmVmOiBwYXRofX0sIGxhYmVsKVxuICBdKTtcbn1cblxuZnVuY3Rpb24gcmVuZGVyRm9vdGVyKHRvZG9zRGF0YSkge1xuICBsZXQgYW1vdW50Q29tcGxldGVkID0gdG9kb3NEYXRhLmxpc3RcbiAgICAuZmlsdGVyKHRvZG9EYXRhID0+IHRvZG9EYXRhLmNvbXBsZXRlZClcbiAgICAubGVuZ3RoO1xuICBsZXQgYW1vdW50QWN0aXZlID0gdG9kb3NEYXRhLmxpc3QubGVuZ3RoIC0gYW1vdW50Q29tcGxldGVkO1xuICBsZXQgZm9vdGVyU3R5bGUgPSB7J2Rpc3BsYXknOiB0b2Rvc0RhdGEubGlzdC5sZW5ndGggPyAnJyA6ICdub25lJ307XG5cbiAgcmV0dXJuIGZvb3RlcignLmZvb3RlcicsIHtzdHlsZTogZm9vdGVyU3R5bGV9LCBbXG4gICAgc3BhbignLnRvZG8tY291bnQnLCBbXG4gICAgICBzdHJvbmcoU3RyaW5nKGFtb3VudEFjdGl2ZSkpLFxuICAgICAgJyBpdGVtJyArIChhbW91bnRBY3RpdmUgIT09IDEgPyAncycgOiAnJykgKyAnIGxlZnQnXG4gICAgXSksXG4gICAgdWwoJy5maWx0ZXJzJywgW1xuICAgICAgcmVuZGVyRmlsdGVyQnV0dG9uKHRvZG9zRGF0YSwgJycsICcvJywgJ0FsbCcpLFxuICAgICAgcmVuZGVyRmlsdGVyQnV0dG9uKHRvZG9zRGF0YSwgJ2FjdGl2ZScsICcvYWN0aXZlJywgJ0FjdGl2ZScpLFxuICAgICAgcmVuZGVyRmlsdGVyQnV0dG9uKHRvZG9zRGF0YSwgJ2NvbXBsZXRlZCcsICcvY29tcGxldGVkJywgJ0NvbXBsZXRlZCcpLFxuICAgIF0pLFxuICAgIChhbW91bnRDb21wbGV0ZWQgPiAwID9cbiAgICAgIGJ1dHRvbignLmNsZWFyLWNvbXBsZXRlZCcsICdDbGVhciBjb21wbGV0ZWQgKCcgKyBhbW91bnRDb21wbGV0ZWQgKyAnKScpXG4gICAgICA6IG51bGxcbiAgICApXG4gIF0pXG59XG5cbi8vIFRIRSBWSUVXXG4vLyBUaGlzIGZ1bmN0aW9uIGV4cGVjdHMgdGhlIHN0cmVhbSBvZiB0b2Rvc0RhdGFcbi8vIGZyb20gdGhlIG1vZGVsIGZ1bmN0aW9uIGFuZCB0dXJucyBpdCBpbnRvIGFcbi8vIHZpcnR1YWwgRE9NIHN0cmVhbSB0aGF0IGlzIHRoZW4gdWx0aW1hdGVseSByZXR1cm5lZCBpbnRvXG4vLyB0aGUgRE9NIHNpbmsgaW4gdGhlIGluZGV4LmpzLlxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gdmlldyh0b2RvcyQpIHtcbiAgcmV0dXJuIHRvZG9zJC5tYXAodG9kb3MgPT5cbiAgICBkaXYoW1xuICAgICAgcmVuZGVySGVhZGVyKCksXG4gICAgICByZW5kZXJNYWluU2VjdGlvbih0b2RvcyksXG4gICAgICByZW5kZXJGb290ZXIodG9kb3MpXG4gICAgXSlcbiAgKTtcbn07XG4iLCJjb25zdCBFTlRFUl9LRVkgPSAxMztcbmNvbnN0IEVTQ19LRVkgPSAyNztcblxuZXhwb3J0IHtFTlRFUl9LRVksIEVTQ19LRVl9O1xuIl19
