(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var xstream_1 = require("xstream");
var adapt_1 = require("@cycle/run/lib/adapt");
var fromEvent_1 = require("./fromEvent");
var BodyDOMSource = (function () {
    function BodyDOMSource(_name) {
        this._name = _name;
    }
    BodyDOMSource.prototype.select = function (selector) {
        // This functionality is still undefined/undecided.
        return this;
    };
    BodyDOMSource.prototype.elements = function () {
        var out = adapt_1.adapt(xstream_1.default.of(document.body));
        out._isCycleSource = this._name;
        return out;
    };
    BodyDOMSource.prototype.events = function (eventType, options) {
        if (options === void 0) { options = {}; }
        var stream;
        if (options && typeof options.useCapture === 'boolean') {
            stream = fromEvent_1.fromEvent(document.body, eventType, options.useCapture);
        }
        else {
            stream = fromEvent_1.fromEvent(document.body, eventType);
        }
        if (options && options.preventDefault) {
            stream = stream.map(function (ev) {
                ev.preventDefault();
                return ev;
            });
        }
        var out = adapt_1.adapt(stream);
        out._isCycleSource = this._name;
        return out;
    };
    return BodyDOMSource;
}());
exports.BodyDOMSource = BodyDOMSource;

},{"./fromEvent":9,"@cycle/run/lib/adapt":24,"xstream":125}],2:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var xstream_1 = require("xstream");
var adapt_1 = require("@cycle/run/lib/adapt");
var fromEvent_1 = require("./fromEvent");
var DocumentDOMSource = (function () {
    function DocumentDOMSource(_name) {
        this._name = _name;
    }
    DocumentDOMSource.prototype.select = function (selector) {
        // This functionality is still undefined/undecided.
        return this;
    };
    DocumentDOMSource.prototype.elements = function () {
        var out = adapt_1.adapt(xstream_1.default.of(document));
        out._isCycleSource = this._name;
        return out;
    };
    DocumentDOMSource.prototype.events = function (eventType, options) {
        if (options === void 0) { options = {}; }
        var stream;
        if (options && typeof options.useCapture === 'boolean') {
            stream = fromEvent_1.fromEvent(document, eventType, options.useCapture);
        }
        else {
            stream = fromEvent_1.fromEvent(document, eventType);
        }
        if (options && options.preventDefault) {
            stream = stream.map(function (ev) {
                ev.preventDefault();
                return ev;
            });
        }
        var out = adapt_1.adapt(stream);
        out._isCycleSource = this._name;
        return out;
    };
    return DocumentDOMSource;
}());
exports.DocumentDOMSource = DocumentDOMSource;

},{"./fromEvent":9,"@cycle/run/lib/adapt":24,"xstream":125}],3:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ScopeChecker_1 = require("./ScopeChecker");
var utils_1 = require("./utils");
var matchesSelector_1 = require("./matchesSelector");
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
        var selector = utils_1.getSelectors(namespace);
        if (!selector) {
            return rootElement;
        }
        var fullScope = utils_1.getFullScope(namespace);
        var scopeChecker = new ScopeChecker_1.ScopeChecker(fullScope, this.isolateModule);
        var topNode = fullScope ?
            this.isolateModule.getElement(fullScope) || rootElement :
            rootElement;
        var topNodeMatchesSelector = !!fullScope && !!selector && matchesSelector_1.matchesSelector(topNode, selector);
        return toElArray(topNode.querySelectorAll(selector))
            .filter(scopeChecker.isDirectlyInScope, scopeChecker)
            .concat(topNodeMatchesSelector ? [topNode] : []);
    };
    return ElementFinder;
}());
exports.ElementFinder = ElementFinder;

},{"./ScopeChecker":7,"./matchesSelector":14,"./utils":18}],4:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var xstream_1 = require("xstream");
var ScopeChecker_1 = require("./ScopeChecker");
var utils_1 = require("./utils");
var matchesSelector_1 = require("./matchesSelector");
/**
 * Finds (with binary search) index of the destination that id equal to searchId
 * among the destinations in the given array.
 */
function indexOf(arr, searchId) {
    var minIndex = 0;
    var maxIndex = arr.length - 1;
    var currentIndex;
    var current;
    while (minIndex <= maxIndex) {
        currentIndex = (minIndex + maxIndex) / 2 | 0; // tslint:disable-line:no-bitwise
        current = arr[currentIndex];
        var currentId = current.id;
        if (currentId < searchId) {
            minIndex = currentIndex + 1;
        }
        else if (currentId > searchId) {
            maxIndex = currentIndex - 1;
        }
        else {
            return currentIndex;
        }
    }
    return -1;
}
/**
 * Manages "Event delegation", by connecting an origin with multiple
 * destinations.
 *
 * Attaches a DOM event listener to the DOM element called the "origin",
 * and delegates events to "destinations", which are subjects as outputs
 * for the DOMSource. Simulates bubbling or capturing, with regards to
 * isolation boundaries too.
 */
var EventDelegator = (function () {
    function EventDelegator(origin, eventType, useCapture, isolateModule) {
        var _this = this;
        this.origin = origin;
        this.eventType = eventType;
        this.useCapture = useCapture;
        this.isolateModule = isolateModule;
        this.destinations = [];
        this._lastId = 0;
        if (useCapture) {
            this.listener = function (ev) { return _this.capture(ev); };
        }
        else {
            this.listener = function (ev) { return _this.bubble(ev); };
        }
        origin.addEventListener(eventType, this.listener, useCapture);
    }
    EventDelegator.prototype.updateOrigin = function (newOrigin) {
        this.origin.removeEventListener(this.eventType, this.listener, this.useCapture);
        newOrigin.addEventListener(this.eventType, this.listener, this.useCapture);
        this.origin = newOrigin;
    };
    /**
     * Creates a *new* destination given the namespace and returns the subject
     * representing the destination of events. Is not referentially transparent,
     * will always return a different output for the same input.
     */
    EventDelegator.prototype.createDestination = function (namespace) {
        var _this = this;
        var id = this._lastId++;
        var selector = utils_1.getSelectors(namespace);
        var scopeChecker = new ScopeChecker_1.ScopeChecker(utils_1.getFullScope(namespace), this.isolateModule);
        var subject = xstream_1.default.create({
            start: function () { },
            stop: function () {
                if ('requestIdleCallback' in window) {
                    requestIdleCallback(function () {
                        _this.removeDestination(id);
                    });
                }
                else {
                    _this.removeDestination(id);
                }
            },
        });
        var destination = { id: id, selector: selector, scopeChecker: scopeChecker, subject: subject };
        this.destinations.push(destination);
        return subject;
    };
    /**
     * Removes the destination that has the given id.
     */
    EventDelegator.prototype.removeDestination = function (id) {
        var i = indexOf(this.destinations, id);
        i >= 0 && this.destinations.splice(i, 1); // tslint:disable-line:no-unused-expression
    };
    EventDelegator.prototype.capture = function (ev) {
        var n = this.destinations.length;
        for (var i = 0; i < n; i++) {
            var dest = this.destinations[i];
            if (matchesSelector_1.matchesSelector(ev.target, dest.selector)) {
                dest.subject._n(ev);
            }
        }
    };
    EventDelegator.prototype.bubble = function (rawEvent) {
        var origin = this.origin;
        if (!origin.contains(rawEvent.currentTarget)) {
            return;
        }
        var roof = origin.parentElement;
        var ev = this.patchEvent(rawEvent);
        for (var el = ev.target; el && el !== roof; el = el.parentElement) {
            if (!origin.contains(el)) {
                ev.stopPropagation();
            }
            if (ev.propagationHasBeenStopped) {
                return;
            }
            this.matchEventAgainstDestinations(el, ev);
        }
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
    EventDelegator.prototype.matchEventAgainstDestinations = function (el, ev) {
        var n = this.destinations.length;
        for (var i = 0; i < n; i++) {
            var dest = this.destinations[i];
            if (!dest.scopeChecker.isDirectlyInScope(el)) {
                continue;
            }
            if (matchesSelector_1.matchesSelector(el, dest.selector)) {
                this.mutateEventCurrentTarget(ev, el);
                dest.subject._n(ev);
            }
        }
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
    return EventDelegator;
}());
exports.EventDelegator = EventDelegator;

},{"./ScopeChecker":7,"./matchesSelector":14,"./utils":18,"xstream":125}],5:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var MapPolyfill = require('es6-map');
var IsolateModule = (function () {
    function IsolateModule() {
        this.elementsByFullScope = new MapPolyfill();
        this.delegatorsByFullScope = new MapPolyfill();
        this.fullScopesBeingUpdated = [];
    }
    IsolateModule.prototype.cleanupVNode = function (_a) {
        var data = _a.data, elm = _a.elm;
        var fullScope = (data || {}).isolate || '';
        var isCurrentElm = this.elementsByFullScope.get(fullScope) === elm;
        var isScopeBeingUpdated = this.fullScopesBeingUpdated.indexOf(fullScope) >= 0;
        if (fullScope && isCurrentElm && !isScopeBeingUpdated) {
            this.elementsByFullScope.delete(fullScope);
            this.delegatorsByFullScope.delete(fullScope);
        }
    };
    IsolateModule.prototype.getElement = function (fullScope) {
        return this.elementsByFullScope.get(fullScope);
    };
    IsolateModule.prototype.getFullScope = function (elm) {
        var iterator = this.elementsByFullScope.entries();
        for (var result = iterator.next(); !!result.value; result = iterator.next()) {
            var _a = result.value, fullScope = _a[0], element = _a[1];
            if (elm === element) {
                return fullScope;
            }
        }
        return '';
    };
    IsolateModule.prototype.addEventDelegator = function (fullScope, eventDelegator) {
        var delegators = this.delegatorsByFullScope.get(fullScope);
        if (!delegators) {
            delegators = [];
            this.delegatorsByFullScope.set(fullScope, delegators);
        }
        delegators[delegators.length] = eventDelegator;
    };
    IsolateModule.prototype.reset = function () {
        this.elementsByFullScope.clear();
        this.delegatorsByFullScope.clear();
        this.fullScopesBeingUpdated = [];
    };
    IsolateModule.prototype.createModule = function () {
        var self = this;
        return {
            create: function (oldVNode, vNode) {
                var _a = oldVNode.data, oldData = _a === void 0 ? {} : _a;
                var elm = vNode.elm, _b = vNode.data, data = _b === void 0 ? {} : _b;
                var oldFullScope = oldData.isolate || '';
                var fullScope = data.isolate || '';
                // Update data structures with the newly-created element
                if (fullScope) {
                    self.fullScopesBeingUpdated.push(fullScope);
                    if (oldFullScope) {
                        self.elementsByFullScope.delete(oldFullScope);
                    }
                    self.elementsByFullScope.set(fullScope, elm);
                    // Update delegators for this scope
                    var delegators = self.delegatorsByFullScope.get(fullScope);
                    if (delegators) {
                        var len = delegators.length;
                        for (var i = 0; i < len; ++i) {
                            delegators[i].updateOrigin(elm);
                        }
                    }
                }
                if (oldFullScope && !fullScope) {
                    self.elementsByFullScope.delete(fullScope);
                }
            },
            update: function (oldVNode, vNode) {
                var _a = oldVNode.data, oldData = _a === void 0 ? {} : _a;
                var elm = vNode.elm, _b = vNode.data, data = _b === void 0 ? {} : _b;
                var oldFullScope = oldData.isolate || '';
                var fullScope = data.isolate || '';
                // Same element, but different scope, so update the data structures
                if (fullScope && fullScope !== oldFullScope) {
                    if (oldFullScope) {
                        self.elementsByFullScope.delete(oldFullScope);
                    }
                    self.elementsByFullScope.set(fullScope, elm);
                    var delegators = self.delegatorsByFullScope.get(oldFullScope);
                    if (delegators) {
                        self.delegatorsByFullScope.delete(oldFullScope);
                        self.delegatorsByFullScope.set(fullScope, delegators);
                    }
                }
                // Same element, but lost the scope, so update the data structures
                if (oldFullScope && !fullScope) {
                    self.elementsByFullScope.delete(oldFullScope);
                    self.delegatorsByFullScope.delete(oldFullScope);
                }
            },
            destroy: function (vNode) {
                self.cleanupVNode(vNode);
            },
            remove: function (vNode, cb) {
                self.cleanupVNode(vNode);
                cb();
            },
            post: function () {
                self.fullScopesBeingUpdated = [];
            },
        };
    };
    return IsolateModule;
}());
exports.IsolateModule = IsolateModule;

},{"es6-map":82}],6:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var adapt_1 = require("@cycle/run/lib/adapt");
var DocumentDOMSource_1 = require("./DocumentDOMSource");
var BodyDOMSource_1 = require("./BodyDOMSource");
var ElementFinder_1 = require("./ElementFinder");
var fromEvent_1 = require("./fromEvent");
var isolate_1 = require("./isolate");
var EventDelegator_1 = require("./EventDelegator");
var utils_1 = require("./utils");
var eventTypesThatDontBubble = [
    "blur",
    "canplay",
    "canplaythrough",
    "change",
    "durationchange",
    "emptied",
    "ended",
    "focus",
    "load",
    "loadeddata",
    "loadedmetadata",
    "mouseenter",
    "mouseleave",
    "pause",
    "play",
    "playing",
    "ratechange",
    "reset",
    "scroll",
    "seeked",
    "seeking",
    "stalled",
    "submit",
    "suspend",
    "timeupdate",
    "unload",
    "volumechange",
    "waiting",
];
function determineUseCapture(eventType, options) {
    var result = false;
    if (typeof options.useCapture === 'boolean') {
        result = options.useCapture;
    }
    if (eventTypesThatDontBubble.indexOf(eventType) !== -1) {
        result = true;
    }
    return result;
}
function filterBasedOnIsolation(domSource, fullScope) {
    return function filterBasedOnIsolationOperator(rootElement$) {
        var initialState = {
            wasIsolated: false,
            shouldPass: false,
            element: null,
        };
        return rootElement$
            .fold(function checkIfShouldPass(state, element) {
            var isIsolated = !!domSource._isolateModule.getElement(fullScope);
            state.shouldPass = isIsolated && !state.wasIsolated;
            state.wasIsolated = isIsolated;
            state.element = element;
            return state;
        }, initialState)
            .drop(1)
            .filter(function (s) { return s.shouldPass; })
            .map(function (s) { return s.element; });
    };
}
var MainDOMSource = (function () {
    function MainDOMSource(_rootElement$, _sanitation$, _namespace, _isolateModule, _delegators, _name) {
        if (_namespace === void 0) { _namespace = []; }
        var _this = this;
        this._rootElement$ = _rootElement$;
        this._sanitation$ = _sanitation$;
        this._namespace = _namespace;
        this._isolateModule = _isolateModule;
        this._delegators = _delegators;
        this._name = _name;
        this.isolateSource = isolate_1.isolateSource;
        this.isolateSink = function (sink, scope) {
            if (scope === ':root') {
                return sink;
            }
            else if (utils_1.isClassOrId(scope)) {
                return isolate_1.siblingIsolateSink(sink, scope);
            }
            else {
                var prevFullScope = utils_1.getFullScope(_this._namespace);
                var nextFullScope = [prevFullScope, scope].filter(function (x) { return !!x; }).join('-');
                return isolate_1.totalIsolateSink(sink, nextFullScope);
            }
        };
    }
    MainDOMSource.prototype.elements = function () {
        var output$;
        if (this._namespace.length === 0) {
            output$ = this._rootElement$;
        }
        else {
            var elementFinder_1 = new ElementFinder_1.ElementFinder(this._namespace, this._isolateModule);
            output$ = this._rootElement$.map(function (el) { return elementFinder_1.call(el); });
        }
        var out = adapt_1.adapt(output$.remember());
        out._isCycleSource = this._name;
        return out;
    };
    Object.defineProperty(MainDOMSource.prototype, "namespace", {
        get: function () {
            return this._namespace;
        },
        enumerable: true,
        configurable: true
    });
    MainDOMSource.prototype.select = function (selector) {
        if (typeof selector !== 'string') {
            throw new Error("DOM driver's select() expects the argument to be a " +
                "string as a CSS selector");
        }
        if (selector === 'document') {
            return new DocumentDOMSource_1.DocumentDOMSource(this._name);
        }
        if (selector === 'body') {
            return new BodyDOMSource_1.BodyDOMSource(this._name);
        }
        var trimmedSelector = selector.trim();
        var childNamespace = trimmedSelector === ":root" ?
            this._namespace :
            this._namespace.concat(trimmedSelector);
        return new MainDOMSource(this._rootElement$, this._sanitation$, childNamespace, this._isolateModule, this._delegators, this._name);
    };
    MainDOMSource.prototype.events = function (eventType, options) {
        if (options === void 0) { options = {}; }
        if (typeof eventType !== "string") {
            throw new Error("DOM driver's events() expects argument to be a " +
                "string representing the event type to listen for.");
        }
        var useCapture = determineUseCapture(eventType, options);
        var namespace = this._namespace;
        var fullScope = utils_1.getFullScope(namespace);
        var keyParts = [eventType, useCapture];
        if (fullScope) {
            keyParts.push(fullScope);
        }
        var key = keyParts.join('~');
        var domSource = this;
        var rootElement$;
        if (fullScope) {
            rootElement$ = this._rootElement$
                .compose(filterBasedOnIsolation(domSource, fullScope));
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
            // Event listener on the origin element as an EventDelegator
            var delegators = domSource._delegators;
            var origin = domSource._isolateModule.getElement(fullScope) || rootElement;
            var delegator;
            if (delegators.has(key)) {
                delegator = delegators.get(key);
                delegator.updateOrigin(origin);
            }
            else {
                delegator = new EventDelegator_1.EventDelegator(origin, eventType, useCapture, domSource._isolateModule);
                delegators.set(key, delegator);
            }
            if (fullScope) {
                domSource._isolateModule.addEventDelegator(fullScope, delegator);
            }
            var subject = delegator.createDestination(namespace);
            return subject;
        })
            .flatten();
        if (options && options.preventDefault) {
            event$ = event$.map(function (ev) {
                ev.preventDefault();
                return ev;
            });
        }
        var out = adapt_1.adapt(event$);
        out._isCycleSource = domSource._name;
        return out;
    };
    MainDOMSource.prototype.dispose = function () {
        this._sanitation$.shamefullySendNext(null);
        this._isolateModule.reset();
    };
    return MainDOMSource;
}());
exports.MainDOMSource = MainDOMSource;

},{"./BodyDOMSource":1,"./DocumentDOMSource":2,"./ElementFinder":3,"./EventDelegator":4,"./fromEvent":9,"./isolate":12,"./utils":18,"@cycle/run/lib/adapt":24}],7:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ScopeChecker = (function () {
    function ScopeChecker(fullScope, isolateModule) {
        this.fullScope = fullScope;
        this.isolateModule = isolateModule;
    }
    /**
     * Checks whether the given element is *directly* in the scope of this
     * scope checker. Being contained *indirectly* through other scopes
     * is not valid. This is crucial for implementing parent-child isolation,
     * so that the parent selectors don't search inside a child scope.
     */
    ScopeChecker.prototype.isDirectlyInScope = function (leaf) {
        for (var el = leaf; el; el = el.parentElement) {
            var fullScope = this.isolateModule.getFullScope(el);
            if (fullScope && fullScope !== this.fullScope) {
                return false;
            }
            if (fullScope) {
                return true;
            }
        }
        return true;
    };
    return ScopeChecker;
}());
exports.ScopeChecker = ScopeChecker;

},{}],8:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var h_1 = require("snabbdom/h");
var classNameFromVNode_1 = require("snabbdom-selector/lib/commonjs/classNameFromVNode");
var selectorParser_1 = require("snabbdom-selector/lib/commonjs/selectorParser");
var VNodeWrapper = (function () {
    function VNodeWrapper(rootElement) {
        this.rootElement = rootElement;
    }
    VNodeWrapper.prototype.call = function (vnode) {
        if (vnode === null) {
            return this.wrap([]);
        }
        var _a = selectorParser_1.selectorParser(vnode), selTagName = _a.tagName, selId = _a.id;
        var vNodeClassName = classNameFromVNode_1.classNameFromVNode(vnode);
        var vNodeData = vnode.data || {};
        var vNodeDataProps = vNodeData.props || {};
        var _b = vNodeDataProps.id, vNodeId = _b === void 0 ? selId : _b;
        var isVNodeAndRootElementIdentical = typeof vNodeId === 'string' &&
            vNodeId.toUpperCase() === this.rootElement.id.toUpperCase() &&
            selTagName.toUpperCase() === this.rootElement.tagName.toUpperCase() &&
            vNodeClassName.toUpperCase() === this.rootElement.className.toUpperCase();
        if (isVNodeAndRootElementIdentical) {
            return vnode;
        }
        return this.wrap([vnode]);
    };
    VNodeWrapper.prototype.wrap = function (children) {
        var _a = this.rootElement, tagName = _a.tagName, id = _a.id, className = _a.className;
        var selId = id ? "#" + id : '';
        var selClass = className ?
            "." + className.split(" ").join(".") : '';
        return h_1.h("" + tagName.toLowerCase() + selId + selClass, {}, children);
    };
    return VNodeWrapper;
}());
exports.VNodeWrapper = VNodeWrapper;

},{"snabbdom-selector/lib/commonjs/classNameFromVNode":105,"snabbdom-selector/lib/commonjs/selectorParser":106,"snabbdom/h":107}],9:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var xstream_1 = require("xstream");
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
        },
    });
}
exports.fromEvent = fromEvent;

},{"xstream":125}],10:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var h_1 = require("snabbdom/h");
function isValidString(param) {
    return typeof param === 'string' && param.length > 0;
}
function isSelector(param) {
    return isValidString(param) && (param[0] === '.' || param[0] === '#');
}
function createTagFunction(tagName) {
    return function hyperscript(a, b, c) {
        var hasA = typeof a !== 'undefined';
        var hasB = typeof b !== 'undefined';
        var hasC = typeof c !== 'undefined';
        if (isSelector(a)) {
            if (hasB && hasC) {
                return h_1.h(tagName + a, b, c);
            }
            else if (hasB) {
                return h_1.h(tagName + a, b);
            }
            else {
                return h_1.h(tagName + a, {});
            }
        }
        else if (hasC) {
            return h_1.h(tagName + a, b, c);
        }
        else if (hasB) {
            return h_1.h(tagName, a, b);
        }
        else if (hasA) {
            return h_1.h(tagName, a);
        }
        else {
            return h_1.h(tagName, {});
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
    'path', 'pattern', 'polygon', 'polyline', 'radialGradient', 'rect', 'script',
    'set', 'stop', 'style', 'switch', 'symbol', 'text', 'textPath', 'title',
    'tref', 'tspan', 'use', 'view', 'vkern',
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
    'textarea', 'tfoot', 'th', 'thead', 'title', 'tr', 'u', 'ul', 'video',
];
var exported = { SVG_TAG_NAMES: SVG_TAG_NAMES, TAG_NAMES: TAG_NAMES, svg: svg, isSelector: isSelector, createTagFunction: createTagFunction };
TAG_NAMES.forEach(function (n) {
    exported[n] = createTagFunction(n);
});
exports.default = exported;

},{"snabbdom/h":107}],11:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var thunk_1 = require("./thunk");
exports.thunk = thunk_1.thunk;
var MainDOMSource_1 = require("./MainDOMSource");
exports.MainDOMSource = MainDOMSource_1.MainDOMSource;
/**
 * A factory for the DOM driver function.
 *
 * Takes a `container` to define the target on the existing DOM which this
 * driver will operate on, and an `options` object as the second argument. The
 * input to this driver is a stream of virtual DOM objects, or in other words,
 * Snabbdom "VNode" objects. The output of this driver is a "DOMSource": a
 * collection of Observables queried with the methods `select()` and `events()`.
 *
 * `DOMSource.select(selector)` returns a new DOMSource with scope restricted to
 * the element(s) that matches the CSS `selector` given.
 *
 * `DOMSource.events(eventType, options)` returns a stream of events of
 * `eventType` happening on the elements that match the current DOMSource. The
 * event object contains the `ownerTarget` property that behaves exactly like
 * `currentTarget`. The reason for this is that some browsers doesn't allow
 * `currentTarget` property to be mutated, hence a new property is created. The
 * returned stream is an *xstream* Stream if you use `@cycle/xstream-run` to run
 * your app with this driver, or it is an RxJS Observable if you use
 * `@cycle/rxjs-run`, and so forth. The `options` parameter can have the
 * property `useCapture`, which is by default `false`, except it is `true` for
 * event types that do not bubble. Read more here
 * https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener
 * about the `useCapture` and its purpose.
 * The other option is `preventDefault` that is set to false by default.
 * If set to true, the driver will automatically call `preventDefault()` on every event.
 *
 * `DOMSource.elements()` returns a stream of the DOM element(s) matched by the
 * selectors in the DOMSource. Also, `DOMSource.select(':root').elements()`
 * returns a stream of DOM element corresponding to the root (or container) of
 * the app on the DOM.
 *
 * @param {(String|HTMLElement)} container the DOM selector for the element
 * (or the element itself) to contain the rendering of the VTrees.
 * @param {DOMDriverOptions} options an object with two optional properties:
 *
 *   - `modules: array` overrides `@cycle/dom`'s default Snabbdom modules as
 *     as defined in [`src/modules.ts`](./src/modules.ts).
 *   - `transposition: boolean` enables/disables transposition of inner streams
 *     in the virtual DOM tree.
 * @return {Function} the DOM driver function. The function expects a stream of
 * VNode as input, and outputs the DOMSource object.
 * @function makeDOMDriver
 */
var makeDOMDriver_1 = require("./makeDOMDriver");
exports.makeDOMDriver = makeDOMDriver_1.makeDOMDriver;
/**
 * A factory function to create mocked DOMSource objects, for testing purposes.
 *
 * Takes a `streamAdapter` and a `mockConfig` object as arguments, and returns
 * a DOMSource that can be given to any Cycle.js app that expects a DOMSource in
 * the sources, for testing.
 *
 * The `streamAdapter` parameter is a package such as `@cycle/xstream-adapter`,
 * `@cycle/rxjs-adapter`, etc. Import it as `import a from '@cycle/rx-adapter`,
 * then provide it to `mockDOMSource`. This is important so the DOMSource created
 * knows which stream library should it use to export its streams when you call
 * `DOMSource.events()` for instance.
 *
 * The `mockConfig` parameter is an object specifying selectors, eventTypes and
 * their streams. Example:
 *
 * ```js
 * const domSource = mockDOMSource(RxAdapter, {
 *   '.foo': {
 *     'click': Rx.Observable.of({target: {}}),
 *     'mouseover': Rx.Observable.of({target: {}}),
 *   },
 *   '.bar': {
 *     'scroll': Rx.Observable.of({target: {}}),
 *     elements: Rx.Observable.of({tagName: 'div'}),
 *   }
 * });
 *
 * // Usage
 * const click$ = domSource.select('.foo').events('click');
 * const element$ = domSource.select('.bar').elements();
 * ```
 *
 * The mocked DOM Source supports isolation. It has the functions `isolateSink`
 * and `isolateSource` attached to it, and performs simple isolation using
 * classNames. *isolateSink* with scope `foo` will append the class `___foo` to
 * the stream of virtual DOM nodes, and *isolateSource* with scope `foo` will
 * perform a conventional `mockedDOMSource.select('.__foo')` call.
 *
 * @param {Object} mockConfig an object where keys are selector strings
 * and values are objects. Those nested objects have `eventType` strings as keys
 * and values are streams you created.
 * @return {Object} fake DOM source object, with an API containing `select()`
 * and `events()` and `elements()` which can be used just like the DOM Driver's
 * DOMSource.
 *
 * @function mockDOMSource
 */
var mockDOMSource_1 = require("./mockDOMSource");
exports.mockDOMSource = mockDOMSource_1.mockDOMSource;
exports.MockedDOMSource = mockDOMSource_1.MockedDOMSource;
/**
 * The hyperscript function `h()` is a function to create virtual DOM objects,
 * also known as VNodes. Call
 *
 * ```js
 * h('div.myClass', {style: {color: 'red'}}, [])
 * ```
 *
 * to create a VNode that represents a `DIV` element with className `myClass`,
 * styled with red color, and no children because the `[]` array was passed. The
 * API is `h(tagOrSelector, optionalData, optionalChildrenOrText)`.
 *
 * However, usually you should use "hyperscript helpers", which are shortcut
 * functions based on hyperscript. There is one hyperscript helper function for
 * each DOM tagName, such as `h1()`, `h2()`, `div()`, `span()`, `label()`,
 * `input()`. For instance, the previous example could have been written
 * as:
 *
 * ```js
 * div('.myClass', {style: {color: 'red'}}, [])
 * ```
 *
 * There are also SVG helper functions, which apply the appropriate SVG
 * namespace to the resulting elements. `svg()` function creates the top-most
 * SVG element, and `svg.g`, `svg.polygon`, `svg.circle`, `svg.path` are for
 * SVG-specific child elements. Example:
 *
 * ```js
 * svg({width: 150, height: 150}, [
 *   svg.polygon({
 *     attrs: {
 *       class: 'triangle',
 *       points: '20 0 20 150 150 20'
 *     }
 *   })
 * ])
 * ```
 *
 * @function h
 */
var h_1 = require("snabbdom/h");
exports.h = h_1.h;
var hyperscript_helpers_1 = require("./hyperscript-helpers");
exports.svg = hyperscript_helpers_1.default.svg;
exports.a = hyperscript_helpers_1.default.a;
exports.abbr = hyperscript_helpers_1.default.abbr;
exports.address = hyperscript_helpers_1.default.address;
exports.area = hyperscript_helpers_1.default.area;
exports.article = hyperscript_helpers_1.default.article;
exports.aside = hyperscript_helpers_1.default.aside;
exports.audio = hyperscript_helpers_1.default.audio;
exports.b = hyperscript_helpers_1.default.b;
exports.base = hyperscript_helpers_1.default.base;
exports.bdi = hyperscript_helpers_1.default.bdi;
exports.bdo = hyperscript_helpers_1.default.bdo;
exports.blockquote = hyperscript_helpers_1.default.blockquote;
exports.body = hyperscript_helpers_1.default.body;
exports.br = hyperscript_helpers_1.default.br;
exports.button = hyperscript_helpers_1.default.button;
exports.canvas = hyperscript_helpers_1.default.canvas;
exports.caption = hyperscript_helpers_1.default.caption;
exports.cite = hyperscript_helpers_1.default.cite;
exports.code = hyperscript_helpers_1.default.code;
exports.col = hyperscript_helpers_1.default.col;
exports.colgroup = hyperscript_helpers_1.default.colgroup;
exports.dd = hyperscript_helpers_1.default.dd;
exports.del = hyperscript_helpers_1.default.del;
exports.dfn = hyperscript_helpers_1.default.dfn;
exports.dir = hyperscript_helpers_1.default.dir;
exports.div = hyperscript_helpers_1.default.div;
exports.dl = hyperscript_helpers_1.default.dl;
exports.dt = hyperscript_helpers_1.default.dt;
exports.em = hyperscript_helpers_1.default.em;
exports.embed = hyperscript_helpers_1.default.embed;
exports.fieldset = hyperscript_helpers_1.default.fieldset;
exports.figcaption = hyperscript_helpers_1.default.figcaption;
exports.figure = hyperscript_helpers_1.default.figure;
exports.footer = hyperscript_helpers_1.default.footer;
exports.form = hyperscript_helpers_1.default.form;
exports.h1 = hyperscript_helpers_1.default.h1;
exports.h2 = hyperscript_helpers_1.default.h2;
exports.h3 = hyperscript_helpers_1.default.h3;
exports.h4 = hyperscript_helpers_1.default.h4;
exports.h5 = hyperscript_helpers_1.default.h5;
exports.h6 = hyperscript_helpers_1.default.h6;
exports.head = hyperscript_helpers_1.default.head;
exports.header = hyperscript_helpers_1.default.header;
exports.hgroup = hyperscript_helpers_1.default.hgroup;
exports.hr = hyperscript_helpers_1.default.hr;
exports.html = hyperscript_helpers_1.default.html;
exports.i = hyperscript_helpers_1.default.i;
exports.iframe = hyperscript_helpers_1.default.iframe;
exports.img = hyperscript_helpers_1.default.img;
exports.input = hyperscript_helpers_1.default.input;
exports.ins = hyperscript_helpers_1.default.ins;
exports.kbd = hyperscript_helpers_1.default.kbd;
exports.keygen = hyperscript_helpers_1.default.keygen;
exports.label = hyperscript_helpers_1.default.label;
exports.legend = hyperscript_helpers_1.default.legend;
exports.li = hyperscript_helpers_1.default.li;
exports.link = hyperscript_helpers_1.default.link;
exports.main = hyperscript_helpers_1.default.main;
exports.map = hyperscript_helpers_1.default.map;
exports.mark = hyperscript_helpers_1.default.mark;
exports.menu = hyperscript_helpers_1.default.menu;
exports.meta = hyperscript_helpers_1.default.meta;
exports.nav = hyperscript_helpers_1.default.nav;
exports.noscript = hyperscript_helpers_1.default.noscript;
exports.object = hyperscript_helpers_1.default.object;
exports.ol = hyperscript_helpers_1.default.ol;
exports.optgroup = hyperscript_helpers_1.default.optgroup;
exports.option = hyperscript_helpers_1.default.option;
exports.p = hyperscript_helpers_1.default.p;
exports.param = hyperscript_helpers_1.default.param;
exports.pre = hyperscript_helpers_1.default.pre;
exports.progress = hyperscript_helpers_1.default.progress;
exports.q = hyperscript_helpers_1.default.q;
exports.rp = hyperscript_helpers_1.default.rp;
exports.rt = hyperscript_helpers_1.default.rt;
exports.ruby = hyperscript_helpers_1.default.ruby;
exports.s = hyperscript_helpers_1.default.s;
exports.samp = hyperscript_helpers_1.default.samp;
exports.script = hyperscript_helpers_1.default.script;
exports.section = hyperscript_helpers_1.default.section;
exports.select = hyperscript_helpers_1.default.select;
exports.small = hyperscript_helpers_1.default.small;
exports.source = hyperscript_helpers_1.default.source;
exports.span = hyperscript_helpers_1.default.span;
exports.strong = hyperscript_helpers_1.default.strong;
exports.style = hyperscript_helpers_1.default.style;
exports.sub = hyperscript_helpers_1.default.sub;
exports.sup = hyperscript_helpers_1.default.sup;
exports.table = hyperscript_helpers_1.default.table;
exports.tbody = hyperscript_helpers_1.default.tbody;
exports.td = hyperscript_helpers_1.default.td;
exports.textarea = hyperscript_helpers_1.default.textarea;
exports.tfoot = hyperscript_helpers_1.default.tfoot;
exports.th = hyperscript_helpers_1.default.th;
exports.thead = hyperscript_helpers_1.default.thead;
exports.title = hyperscript_helpers_1.default.title;
exports.tr = hyperscript_helpers_1.default.tr;
exports.u = hyperscript_helpers_1.default.u;
exports.ul = hyperscript_helpers_1.default.ul;
exports.video = hyperscript_helpers_1.default.video;

},{"./MainDOMSource":6,"./hyperscript-helpers":10,"./makeDOMDriver":13,"./mockDOMSource":15,"./thunk":17,"snabbdom/h":107}],12:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var vnode_1 = require("snabbdom/vnode");
var utils_1 = require("./utils");
function totalIsolateSource(source, scope) {
    return source.select(utils_1.SCOPE_PREFIX + scope);
}
function siblingIsolateSource(source, scope) {
    return source.select(scope);
}
function isolateSource(source, scope) {
    if (scope === ':root') {
        return source;
    }
    else if (utils_1.isClassOrId(scope)) {
        return siblingIsolateSource(source, scope);
    }
    else {
        return totalIsolateSource(source, scope);
    }
}
exports.isolateSource = isolateSource;
function siblingIsolateSink(sink, scope) {
    return sink.map(function (node) {
        return node ?
            vnode_1.vnode(node.sel + scope, node.data, node.children, node.text, node.elm) :
            node;
    });
}
exports.siblingIsolateSink = siblingIsolateSink;
function totalIsolateSink(sink, fullScope) {
    return sink.map(function (node) {
        if (!node) {
            return node;
        }
        // Ignore if already had up-to-date full scope in vnode.data.isolate
        if (node.data && node.data.isolate) {
            var isolateData = node.data.isolate;
            var prevFullScopeNum = isolateData.replace(/(cycle|\-)/g, '');
            var fullScopeNum = fullScope.replace(/(cycle|\-)/g, '');
            if (isNaN(parseInt(prevFullScopeNum))
                || isNaN(parseInt(fullScopeNum))
                || prevFullScopeNum > fullScopeNum) {
                return node;
            }
        }
        // Insert up-to-date full scope in vnode.data.isolate, and also a key if needed
        node.data = node.data || {};
        node.data.isolate = fullScope;
        if (typeof node.key === 'undefined') {
            node.key = utils_1.SCOPE_PREFIX + fullScope;
        }
        return node;
    });
}
exports.totalIsolateSink = totalIsolateSink;

},{"./utils":18,"snabbdom/vnode":118}],13:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var snabbdom_1 = require("snabbdom");
var xstream_1 = require("xstream");
var MainDOMSource_1 = require("./MainDOMSource");
var tovnode_1 = require("snabbdom/tovnode");
var VNodeWrapper_1 = require("./VNodeWrapper");
var utils_1 = require("./utils");
var modules_1 = require("./modules");
var IsolateModule_1 = require("./IsolateModule");
var MapPolyfill = require('es6-map');
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
function dropCompletion(input) {
    return xstream_1.default.merge(input, xstream_1.default.never());
}
function unwrapElementFromVNode(vnode) {
    return vnode.elm;
}
function reportSnabbdomError(err) {
    (console.error || console.log)(err);
}
function makeDOMDriver(container, options) {
    if (!options) {
        options = {};
    }
    var modules = options.modules || modules_1.default;
    var isolateModule = new IsolateModule_1.IsolateModule();
    var patch = snabbdom_1.init([isolateModule.createModule()].concat(modules));
    var rootElement = utils_1.getElement(container) || document.body;
    var vnodeWrapper = new VNodeWrapper_1.VNodeWrapper(rootElement);
    var delegators = new MapPolyfill();
    makeDOMDriverInputGuard(modules);
    function DOMDriver(vnode$, name) {
        if (name === void 0) { name = 'DOM'; }
        domDriverInputGuard(vnode$);
        var sanitation$ = xstream_1.default.create();
        var rootElement$ = xstream_1.default.merge(vnode$.endWhen(sanitation$), sanitation$)
            .map(function (vnode) { return vnodeWrapper.call(vnode); })
            .fold(patch, tovnode_1.toVNode(rootElement))
            .drop(1)
            .map(unwrapElementFromVNode)
            .compose(dropCompletion) // don't complete this stream
            .startWith(rootElement);
        // Start the snabbdom patching, over time
        var listener = { error: reportSnabbdomError };
        if (document.readyState === 'loading') {
            document.addEventListener('readystatechange', function () {
                if (document.readyState === 'interactive') {
                    rootElement$.addListener(listener);
                }
            });
        }
        else {
            rootElement$.addListener(listener);
        }
        return new MainDOMSource_1.MainDOMSource(rootElement$, sanitation$, [], isolateModule, delegators, name);
    }
    ;
    return DOMDriver;
}
exports.makeDOMDriver = makeDOMDriver;

},{"./IsolateModule":5,"./MainDOMSource":6,"./VNodeWrapper":8,"./modules":16,"./utils":18,"es6-map":82,"snabbdom":115,"snabbdom/tovnode":117,"xstream":125}],14:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function createMatchesSelector() {
    var vendor;
    try {
        var proto = Element.prototype;
        vendor = proto.matches
            || proto.matchesSelector
            || proto.webkitMatchesSelector
            || proto.mozMatchesSelector
            || proto.msMatchesSelector
            || proto.oMatchesSelector;
    }
    catch (err) {
        vendor = null;
    }
    return function match(elem, selector) {
        if (vendor) {
            return vendor.call(elem, selector);
        }
        var nodes = elem.parentNode.querySelectorAll(selector);
        for (var i = 0; i < nodes.length; i++) {
            if (nodes[i] === elem) {
                return true;
            }
        }
        return false;
    };
}
exports.matchesSelector = createMatchesSelector();

},{}],15:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var xstream_1 = require("xstream");
var adapt_1 = require("@cycle/run/lib/adapt");
var SCOPE_PREFIX = '___';
var MockedDOMSource = (function () {
    function MockedDOMSource(_mockConfig) {
        this._mockConfig = _mockConfig;
        if (_mockConfig['elements']) {
            this._elements = _mockConfig['elements'];
        }
        else {
            this._elements = adapt_1.adapt(xstream_1.default.empty());
        }
    }
    MockedDOMSource.prototype.elements = function () {
        var out = this._elements;
        out._isCycleSource = 'MockedDOM';
        return out;
    };
    MockedDOMSource.prototype.events = function (eventType, options) {
        var streamForEventType = this._mockConfig[eventType];
        var out = adapt_1.adapt(streamForEventType || xstream_1.default.empty());
        out._isCycleSource = 'MockedDOM';
        return out;
    };
    MockedDOMSource.prototype.select = function (selector) {
        var mockConfigForSelector = this._mockConfig[selector] || {};
        return new MockedDOMSource(mockConfigForSelector);
    };
    MockedDOMSource.prototype.isolateSource = function (source, scope) {
        return source.select('.' + SCOPE_PREFIX + scope);
    };
    MockedDOMSource.prototype.isolateSink = function (sink, scope) {
        return sink.map(function (vnode) {
            if (vnode.sel && vnode.sel.indexOf(SCOPE_PREFIX + scope) !== -1) {
                return vnode;
            }
            else {
                vnode.sel += "." + SCOPE_PREFIX + scope;
                return vnode;
            }
        });
    };
    return MockedDOMSource;
}());
exports.MockedDOMSource = MockedDOMSource;
function mockDOMSource(mockConfig) {
    return new MockedDOMSource(mockConfig);
}
exports.mockDOMSource = mockDOMSource;

},{"@cycle/run/lib/adapt":24,"xstream":125}],16:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var class_1 = require("snabbdom/modules/class");
exports.ClassModule = class_1.default;
var props_1 = require("snabbdom/modules/props");
exports.PropsModule = props_1.default;
var attributes_1 = require("snabbdom/modules/attributes");
exports.AttrsModule = attributes_1.default;
var style_1 = require("snabbdom/modules/style");
exports.StyleModule = style_1.default;
var dataset_1 = require("snabbdom/modules/dataset");
exports.DatasetModule = dataset_1.default;
var modules = [style_1.default, class_1.default, props_1.default, attributes_1.default, dataset_1.default];
exports.default = modules;

},{"snabbdom/modules/attributes":110,"snabbdom/modules/class":111,"snabbdom/modules/dataset":112,"snabbdom/modules/props":113,"snabbdom/modules/style":114}],17:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var h_1 = require("snabbdom/h");
function copyToThunk(vnode, thunk) {
    thunk.elm = vnode.elm;
    vnode.data.fn = thunk.data.fn;
    vnode.data.args = thunk.data.args;
    vnode.data.isolate = thunk.data.isolate;
    thunk.data = vnode.data;
    thunk.children = vnode.children;
    thunk.text = vnode.text;
    thunk.elm = vnode.elm;
}
function init(thunk) {
    var cur = thunk.data;
    var vnode = cur.fn.apply(undefined, cur.args);
    copyToThunk(vnode, thunk);
}
function prepatch(oldVnode, thunk) {
    var old = oldVnode.data, cur = thunk.data;
    var i;
    var oldArgs = old.args, args = cur.args;
    if (old.fn !== cur.fn || oldArgs.length !== args.length) {
        copyToThunk(cur.fn.apply(undefined, args), thunk);
    }
    for (i = 0; i < args.length; ++i) {
        if (oldArgs[i] !== args[i]) {
            copyToThunk(cur.fn.apply(undefined, args), thunk);
            return;
        }
    }
    copyToThunk(oldVnode, thunk);
}
exports.thunk = function thunk(sel, key, fn, args) {
    if (args === undefined) {
        args = fn;
        fn = key;
        key = undefined;
    }
    return h_1.h(sel, {
        key: key,
        hook: { init: init, prepatch: prepatch },
        fn: fn,
        args: args,
    });
};
exports.default = exports.thunk;

},{"snabbdom/h":107}],18:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function isElement(obj) {
    var ELEM_TYPE = 1;
    var FRAG_TYPE = 11;
    return typeof HTMLElement === 'object' ?
        obj instanceof HTMLElement || obj instanceof DocumentFragment :
        obj && typeof obj === 'object' && obj !== null &&
            (obj.nodeType === ELEM_TYPE || obj.nodeType === FRAG_TYPE) &&
            typeof obj.nodeName === 'string';
}
function isClassOrId(str) {
    return str.length > 1 && (str[0] === '.' || str[0] === '#');
}
exports.isClassOrId = isClassOrId;
exports.SCOPE_PREFIX = '$$CYCLEDOM$$-';
function getElement(selectors) {
    var domElement = typeof selectors === 'string' ?
        document.querySelector(selectors) :
        selectors;
    if (typeof selectors === 'string' && domElement === null) {
        throw new Error("Cannot render into unknown element `" + selectors + "`");
    }
    else if (!isElement(domElement)) {
        throw new Error('Given container is not a DOM element neither a ' +
            'selector string.');
    }
    return domElement;
}
exports.getElement = getElement;
/**
 * The full scope of a namespace is the "absolute path" of scopes from
 * parent to child. This is extracted from the namespace, filter only for
 * scopes in the namespace.
 */
function getFullScope(namespace) {
    return namespace
        .filter(function (c) { return c.indexOf(exports.SCOPE_PREFIX) > -1; })
        .map(function (c) { return c.replace(exports.SCOPE_PREFIX, ''); })
        .join('-');
}
exports.getFullScope = getFullScope;
function getSelectors(namespace) {
    return namespace.filter(function (c) { return c.indexOf(exports.SCOPE_PREFIX) === -1; }).join(' ');
}
exports.getSelectors = getSelectors;

},{}],19:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var xstream_1 = require("xstream");
var CLICK_EVENT = typeof document !== 'undefined' && document.ontouchstart ?
    'touchstart' :
    'click';
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
        if (link && link.indexOf('mailto:') > -1 || link.charAt(0) === '#') {
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
function captureAnchorClicks(push) {
    var listener = makeClickListener(push);
    if (typeof window !== 'undefined') {
        document.addEventListener(CLICK_EVENT, listener, false);
    }
}
function captureClicks(historyDriver) {
    return function historyDriverWithClickCapture(sink$) {
        var internalSink$ = xstream_1.default.create();
        captureAnchorClicks(function (pathname) {
            internalSink$._n({ type: 'push', pathname: pathname });
        });
        sink$._add(internalSink$);
        return historyDriver(internalSink$);
    };
}
exports.captureClicks = captureClicks;

},{"xstream":125}],20:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var xstream_1 = require("xstream");
function createHistory$(history, sink$) {
    var history$ = xstream_1.default.createWithMemory().startWith(history.location);
    var call = makeCallOnHistory(history);
    var unlisten = history.listen(function (loc) { history$._n(loc); });
    var sub = sink$.subscribe(createObserver(call, unlisten));
    history$.dispose = function () { sub.unsubscribe(); unlisten(); };
    return history$;
}
exports.createHistory$ = createHistory$;
;
function makeCallOnHistory(history) {
    return function call(input) {
        if (input.type === 'push') {
            history.push(input.pathname, input.state);
        }
        if (input.type === 'replace') {
            history.replace(input.pathname, input.state);
        }
        if (input.type === 'go') {
            history.go(input.amount);
        }
        if (input.type === 'goBack') {
            history.goBack();
        }
        if (input.type === 'goForward') {
            history.goForward();
        }
    };
}
function createObserver(call, unlisten) {
    return {
        next: function (input) {
            if (typeof input === 'string') {
                call({ type: 'push', pathname: input });
            }
            else {
                call(input);
            }
        },
        error: function (err) { unlisten(); },
        complete: function () { setTimeout(unlisten); },
    };
}

},{"xstream":125}],21:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var history_1 = require("history");
var createHistory_1 = require("./createHistory$");
function makeHistoryDriver(options) {
    var history;
    if (options && options.hasOwnProperty('createHref')) {
        history = options;
    }
    else {
        history = history_1.createBrowserHistory(options);
    }
    return function historyDriver(sink$) {
        return createHistory_1.createHistory$(history, sink$);
    };
}
exports.makeHistoryDriver = makeHistoryDriver;
function makeServerHistoryDriver(options) {
    var history = history_1.createMemoryHistory(options);
    return function serverHistoryDriver(sink$) {
        return createHistory_1.createHistory$(history, sink$);
    };
}
exports.makeServerHistoryDriver = makeServerHistoryDriver;
function makeHashHistoryDriver(options) {
    var history = history_1.createHashHistory(options);
    return function hashHistoryDriver(sink$) {
        return createHistory_1.createHistory$(history, sink$);
    };
}
exports.makeHashHistoryDriver = makeHashHistoryDriver;

},{"./createHistory$":20,"history":101}],22:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Create a History Driver to be used in the browser.
 *
 * This is a function which, when called, returns a History Driver for Cycle.js
 * apps. The driver is also a function, and it takes a stream of new locations
 * (strings representing pathnames or location objects) as input, and outputs
 * another stream of locations that were applied. Example:
 *
 * ```js
 * import {run} from '@cycle/run';
 * import {makeHistoryDriver} from '@cycle/history';
 *
 * function main(sources){
 *   return {
 *     // updates the browser URL every 500ms
 *     history: xs.periodic(500).map(i => `url-${i}`)
 *   };
 * }
 *
 * const drivers = {
 *   history: makeHistoryDriver()
 * };
 *
 * run(main, drivers);
 * ```
 *
 * @param {object|History|MemoryHistory} options an object with some options specific to
 * this driver. These options are the same as for the corresponding
 * `createBrowserHistory()` function in History v4. Check its
 * [docs](https://github.com/mjackson/history/tree/v4.5.1#usage) for a good
 * description on the options. Alternatively, a History object can also be sent
 * in case the external consumer needs direct access to any of the direct History
 * methods
 * @return {Function} the History Driver function
 * @function makeHistoryDriver
 */
var drivers_1 = require("./drivers");
exports.makeHistoryDriver = drivers_1.makeHistoryDriver;
/**
 * Create a History Driver for older browsers using hash routing.
 *
 * This is a function which, when called, returns a History Driver for Cycle.js
 * apps. The driver is also a function, and it takes a stream of new locations
 * (strings representing pathnames or location objects) as input, and outputs
 * another stream of locations that were applied.
 *
 * @param {object} options an object with some options specific to
 * this driver. These options are the same as for the corresponding
 * `createHashHistory()` function in History v4. Check its
 * [docs](https://github.com/mjackson/history/tree/v4.5.1#usage) for a good
 * description on the options.
 * @return {Function} the History Driver function
 * @function makeHashHistoryDriver
 */
var drivers_2 = require("./drivers");
exports.makeHashHistoryDriver = drivers_2.makeHashHistoryDriver;
/**
 * Wraps a History Driver to add "click capturing" functionality.
 *
 * If you want to intercept and handle any click event that leads to a link,
 * like on an `<a>` element, you pass your existing driver (e.g. created from
 * `makeHistoryDriver()`) as argument and this function will return another
 * driver of the same nature, but including click capturing logic. Example:
 *
 * ```js
 * import {captureClicks, makeHistoryDriver} from '@cycle/history';
 *
 * const drivers = {
 *   history: captureClicks(makeHistoryDriver())
 * };
 * ```
 *
 * @param {Function} driver an existing History Driver function.
 * @return {Function} a History Driver function
 * @function captureClicks
 */
var captureClicks_1 = require("./captureClicks");
exports.captureClicks = captureClicks_1.captureClicks;
/**
 * Create a History Driver to be used in non-browser enviroments such as
 * server-side Node.js.
 *
 * This is a function which, when called, returns a History Driver for Cycle.js
 * apps. The driver is also a function, and it takes a stream of new locations
 * (strings representing pathnames or location objects) as input, and outputs
 * another stream of locations that were applied.
 *
 * @param {object} options an object with some options specific to
 * this driver. These options are the same as for the corresponding
 * `createMemoryHistory()` function in History v4. Check its
 * [docs](https://github.com/mjackson/history/tree/v4.5.1#usage) for a good
 * description on the options.
 * @return {Function} the History Driver function
 * @function makeServerHistoryDriver
 */
var drivers_3 = require("./drivers");
exports.makeServerHistoryDriver = drivers_3.makeServerHistoryDriver;

},{"./captureClicks":19,"./drivers":21}],23:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function checkIsolateArgs(dataflowComponent, scope) {
    if (typeof dataflowComponent !== "function") {
        throw new Error("First argument given to isolate() must be a " +
            "'dataflowComponent' function");
    }
    if (scope === null) {
        throw new Error("Second argument given to isolate() must not be null");
    }
}
function normalizeScopes(sources, scopes, randomScope) {
    var perChannel = {};
    Object.keys(sources).forEach(function (channel) {
        if (typeof scopes === 'string') {
            perChannel[channel] = scopes;
            return;
        }
        var candidate = scopes[channel];
        if (typeof candidate !== 'undefined') {
            perChannel[channel] = candidate;
            return;
        }
        var wildcard = scopes['*'];
        if (typeof wildcard !== 'undefined') {
            perChannel[channel] = wildcard;
            return;
        }
        perChannel[channel] = randomScope;
    });
    return perChannel;
}
function isolateAllSources(outerSources, scopes) {
    var innerSources = {};
    for (var channel in outerSources) {
        var outerSource = outerSources[channel];
        if (outerSources.hasOwnProperty(channel)
            && outerSource
            && typeof outerSource.isolateSource === 'function') {
            innerSources[channel] = outerSource.isolateSource(outerSource, scopes[channel]);
        }
        else if (outerSources.hasOwnProperty(channel)) {
            innerSources[channel] = outerSources[channel];
        }
    }
    return innerSources;
}
function isolateAllSinks(sources, innerSinks, scopes) {
    var outerSinks = {};
    for (var channel in innerSinks) {
        var source = sources[channel];
        var innerSink = innerSinks[channel];
        if (innerSinks.hasOwnProperty(channel)
            && source
            && typeof source.isolateSink === 'function') {
            outerSinks[channel] = source.isolateSink(innerSink, scopes[channel]);
        }
        else if (innerSinks.hasOwnProperty(channel)) {
            outerSinks[channel] = innerSinks[channel];
        }
    }
    return outerSinks;
}
var counter = 0;
function newScope() {
    return "cycle" + ++counter;
}
/**
 * Takes a `component` function and an optional `scope` string, and returns a
 * scoped version of the `component` function.
 *
 * When the scoped component is invoked, each source provided to the scoped
 * component is isolated to the given `scope` using
 * `source.isolateSource(source, scope)`, if possible. Likewise, the sinks
 * returned from the scoped component are isolated to the `scope` using
 * `source.isolateSink(sink, scope)`.
 *
 * If the `scope` is not provided, a new scope will be automatically created.
 * This means that while **`isolate(component, scope)` is pure**
 * (referentially transparent), **`isolate(component)` is impure**
 * (not referentially transparent). Two calls to `isolate(Foo, bar)` will
 * generate the same component. But, two calls to `isolate(Foo)` will generate
 * two distinct components.
 *
 * Note that both `isolateSource()` and `isolateSink()` are static members of
 * `source`. The reason for this is that drivers produce `source` while the
 * application produces `sink`, and it's the driver's responsibility to
 * implement `isolateSource()` and `isolateSink()`.
 *
 * @param {Function} component a function that takes `sources` as input
 * and outputs a collection of `sinks`.
 * @param {String} scope an optional string that is used to isolate each
 * `sources` and `sinks` when the returned scoped component is invoked.
 * @return {Function} the scoped component function that, as the original
 * `component` function, takes `sources` and returns `sinks`.
 * @function isolate
 */
function isolate(component, scope) {
    if (scope === void 0) { scope = newScope(); }
    checkIsolateArgs(component, scope);
    var randomScope = typeof scope === 'object' ? newScope() : '';
    var scopes = typeof scope === 'string' || typeof scope === 'object' ?
        scope :
        scope.toString();
    return function wrappedComponent(outerSources) {
        var rest = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            rest[_i - 1] = arguments[_i];
        }
        var scopesPerChannel = normalizeScopes(outerSources, scopes, randomScope);
        var innerSources = isolateAllSources(outerSources, scopesPerChannel);
        var innerSinks = component.apply(void 0, [innerSources].concat(rest));
        var outerSinks = isolateAllSinks(outerSources, innerSinks, scopesPerChannel);
        return outerSinks;
    };
}
isolate.reset = function () { return counter = 0; };
exports.default = isolate;

},{}],24:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var adaptStream = function (x) { return x; };
function setAdapt(f) {
    adaptStream = f;
}
exports.setAdapt = setAdapt;
function adapt(stream) {
    return adaptStream(stream);
}
exports.adapt = adapt;

},{}],25:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var xstream_1 = require("xstream");
var adapt_1 = require("./adapt");
function logToConsoleError(err) {
    var target = err.stack || err;
    if (console && console.error) {
        console.error(target);
    }
    else if (console && console.log) {
        console.log(target);
    }
}
function makeSinkProxies(drivers) {
    var sinkProxies = {};
    for (var name_1 in drivers) {
        if (drivers.hasOwnProperty(name_1)) {
            sinkProxies[name_1] = xstream_1.default.createWithMemory();
        }
    }
    return sinkProxies;
}
function callDrivers(drivers, sinkProxies) {
    var sources = {};
    for (var name_2 in drivers) {
        if (drivers.hasOwnProperty(name_2)) {
            sources[name_2] = drivers[name_2](sinkProxies[name_2], name_2);
            if (sources[name_2] && typeof sources[name_2] === 'object') {
                sources[name_2]._isCycleSource = name_2;
            }
        }
    }
    return sources;
}
// NOTE: this will mutate `sources`.
function adaptSources(sources) {
    for (var name_3 in sources) {
        if (sources.hasOwnProperty(name_3)
            && sources[name_3]
            && typeof sources[name_3]['shamefullySendNext'] === 'function') {
            sources[name_3] = adapt_1.adapt(sources[name_3]);
        }
    }
    return sources;
}
function replicateMany(sinks, sinkProxies) {
    var sinkNames = Object.keys(sinks).filter(function (name) { return !!sinkProxies[name]; });
    var buffers = {};
    var replicators = {};
    sinkNames.forEach(function (name) {
        buffers[name] = { _n: [], _e: [] };
        replicators[name] = {
            next: function (x) { return buffers[name]._n.push(x); },
            error: function (err) { return buffers[name]._e.push(err); },
            complete: function () { },
        };
    });
    var subscriptions = sinkNames
        .map(function (name) { return xstream_1.default.fromObservable(sinks[name]).subscribe(replicators[name]); });
    sinkNames.forEach(function (name) {
        var listener = sinkProxies[name];
        var next = function (x) { listener._n(x); };
        var error = function (err) { logToConsoleError(err); listener._e(err); };
        buffers[name]._n.forEach(next);
        buffers[name]._e.forEach(error);
        replicators[name].next = next;
        replicators[name].error = error;
        // because sink.subscribe(replicator) had mutated replicator to add
        // _n, _e, _c, we must also update these:
        replicators[name]._n = next;
        replicators[name]._e = error;
    });
    buffers = null; // free up for GC
    return function disposeReplication() {
        subscriptions.forEach(function (s) { return s.unsubscribe(); });
        sinkNames.forEach(function (name) { return sinkProxies[name]._c(); });
    };
}
function disposeSources(sources) {
    for (var k in sources) {
        if (sources.hasOwnProperty(k) && sources[k] && sources[k].dispose) {
            sources[k].dispose();
        }
    }
}
function isObjectEmpty(obj) {
    return Object.keys(obj).length === 0;
}
/**
 * A function that prepares the Cycle application to be executed. Takes a `main`
 * function and prepares to circularly connects it to the given collection of
 * driver functions. As an output, `setup()` returns an object with three
 * properties: `sources`, `sinks` and `run`. Only when `run()` is called will
 * the application actually execute. Refer to the documentation of `run()` for
 * more details.
 *
 * **Example:**
 * ```js
 * import {setup} from '@cycle/run';
 * const {sources, sinks, run} = setup(main, drivers);
 * // ...
 * const dispose = run(); // Executes the application
 * // ...
 * dispose();
 * ```
 *
 * @param {Function} main a function that takes `sources` as input and outputs
 * `sinks`.
 * @param {Object} drivers an object where keys are driver names and values
 * are driver functions.
 * @return {Object} an object with three properties: `sources`, `sinks` and
 * `run`. `sources` is the collection of driver sources, `sinks` is the
 * collection of driver sinks, these can be used for debugging or testing. `run`
 * is the function that once called will execute the application.
 * @function setup
 */
function setup(main, drivers) {
    if (typeof main !== "function") {
        throw new Error("First argument given to Cycle must be the 'main' " +
            "function.");
    }
    if (typeof drivers !== "object" || drivers === null) {
        throw new Error("Second argument given to Cycle must be an object " +
            "with driver functions as properties.");
    }
    if (isObjectEmpty(drivers)) {
        throw new Error("Second argument given to Cycle must be an object " +
            "with at least one driver function declared as a property.");
    }
    var sinkProxies = makeSinkProxies(drivers);
    var sources = callDrivers(drivers, sinkProxies);
    var adaptedSources = adaptSources(sources);
    var sinks = main(adaptedSources);
    if (typeof window !== 'undefined') {
        window.Cyclejs = window.Cyclejs || {};
        window.Cyclejs.sinks = sinks;
    }
    function run() {
        var disposeReplication = replicateMany(sinks, sinkProxies);
        return function dispose() {
            disposeSources(sources);
            disposeReplication();
        };
    }
    ;
    return { sinks: sinks, sources: sources, run: run };
}
exports.setup = setup;
/**
 * Takes a `main` function and circularly connects it to the given collection
 * of driver functions.
 *
 * **Example:**
 * ```js
 * import run from '@cycle/run';
 * const dispose = run(main, drivers);
 * // ...
 * dispose();
 * ```
 *
 * The `main` function expects a collection of "source" streams (returned from
 * drivers) as input, and should return a collection of "sink" streams (to be
 * given to drivers). A "collection of streams" is a JavaScript object where
 * keys match the driver names registered by the `drivers` object, and values
 * are the streams. Refer to the documentation of each driver to see more
 * details on what types of sources it outputs and sinks it receives.
 *
 * @param {Function} main a function that takes `sources` as input and outputs
 * `sinks`.
 * @param {Object} drivers an object where keys are driver names and values
 * are driver functions.
 * @return {Function} a dispose function, used to terminate the execution of the
 * Cycle.js program, cleaning up resources used.
 * @function run
 */
function run(main, drivers) {
    var _a = setup(main, drivers), run = _a.run, sinks = _a.sinks;
    if (typeof window !== 'undefined' && window['CyclejsDevTool_startGraphSerializer']) {
        window['CyclejsDevTool_startGraphSerializer'](sinks);
    }
    return run();
}
exports.run = run;
exports.default = run;

},{"./adapt":24,"xstream":125}],26:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

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
function storageDriver(request$) {
  // Execute writing actions.
  request$.addListener({
    next: function next(request) {
      return (0, _writeToStore2.default)(request);
    },
    error: function error() {},
    complete: function complete() {}
  });

  // Return reading functions.
  return (0, _responseCollection2.default)(request$);
}

exports.default = storageDriver;
},{"./responseCollection":27,"./writeToStore":29}],27:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

exports.default = function (request$) {
  return {
    // For localStorage.
    get local() {
      return (0, _util2.default)(request$);
    },
    // For sessionStorage.
    get session() {
      return (0, _util2.default)(request$, 'session');
    }
  };
};

var _util = require('./util');

var _util2 = _interopRequireDefault(_util);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
},{"./util":28}],28:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = getResponseObj;

var _dropRepeats = require('xstream/extra/dropRepeats');

var _dropRepeats2 = _interopRequireDefault(_dropRepeats);

var _adapt = require('@cycle/run/lib/adapt');

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
  var type = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 'local';

  var storage$ = getStorage$(request$, type);
  var key = type === 'local' ? localStorage.key(n) : sessionStorage.key(n);

  return storage$.filter(function (req) {
    return req.key === key;
  }).map(function (req) {
    return req.key;
  }).startWith(key).compose((0, _dropRepeats2.default)());
}

function storageGetItem(key, request$) {
  var type = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 'local';

  var storage$ = getStorage$(request$, type);
  var storageObj = type === 'local' ? localStorage : sessionStorage;

  return storage$.filter(function (req) {
    return req.key === key;
  }).map(function (req) {
    return req.value;
  }).startWith(storageObj.getItem(key));
}

function getResponseObj(request$) {
  var type = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'local';

  return {
    // Function returning stream of the nth key.
    key: function key(n) {
      return (0, _adapt.adapt)(storageKey(n, request$, type));
    },

    // Function returning stream of item values.
    getItem: function getItem(key) {
      return (0, _adapt.adapt)(storageGetItem(key, request$, type));
    }
  };
}
},{"@cycle/run/lib/adapt":24,"xstream/extra/dropRepeats":124}],29:[function(require,module,exports){
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
  var _ref$target = _ref.target,
      target = _ref$target === undefined ? "local" : _ref$target,
      _ref$action = _ref.action,
      action = _ref$action === undefined ? "setItem" : _ref$action,
      key = _ref.key,
      value = _ref.value;

  // Determine the storage target.
  var storage = target === "local" ? localStorage : sessionStorage;

  // Execute the storage action and pass arguments if they were defined.
  storage[action](key, value);
}

exports.default = writeToStore;
},{}],30:[function(require,module,exports){
"use strict";
var __assign = (this && this.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
var xstream_1 = require("xstream");
var dropRepeats_1 = require("xstream/extra/dropRepeats");
var isolate_1 = require("@cycle/isolate");
var adapt_1 = require("@cycle/run/lib/adapt");
var pickCombine_1 = require("./pickCombine");
exports.pickCombine = pickCombine_1.pickCombine;
var pickMerge_1 = require("./pickMerge");
exports.pickMerge = pickMerge_1.pickMerge;
function onionifyChild(childComp) {
    return function childOnionified(sources) {
        var reducerMimic$ = xstream_1.default.create();
        var state$ = sources.onion.state$
            .map(function (stateFromParent) {
            return reducerMimic$.fold(function (state, reducer) { return reducer(state); }, stateFromParent);
        }).flatten().remember();
        sources.onion = new StateSource(state$, 'onion');
        var sinks = childComp(sources);
        if (sinks.onion) {
            var stream$ = xstream_1.default.fromObservable(sinks.onion);
            reducerMimic$.imitate(stream$);
            var reducerToParent$ = state$.map(function (state) { return function () { return state; }; });
            return __assign({}, sinks, { onion: reducerToParent$ });
        }
        else {
            return sinks;
        }
    };
}
function defaultGetKey(statePiece) {
    return statePiece.key;
}
function instanceLens(key) {
    return {
        get: function (arr) {
            if (typeof arr === 'undefined') {
                return void 0;
            }
            else {
                for (var i = 0, n = arr.length; i < n; ++i) {
                    if (arr[i].key === key) {
                        return arr[i];
                    }
                }
                return void 0;
            }
        },
        set: function (arr, item) {
            if (typeof arr === 'undefined') {
                return [item];
            }
            else if (typeof item === 'undefined') {
                return arr.filter(function (s) { return s.key !== key; });
            }
            else {
                return arr.map(function (s) {
                    if (s.key === key) {
                        return item;
                    }
                    else {
                        return s;
                    }
                });
            }
        },
    };
}
function collection(itemComp, sources, getKey) {
    if (getKey === void 0) { getKey = defaultGetKey; }
    var array$ = sources.onion.state$;
    var collection$ = array$.fold(function (acc, nextStateArray) {
        var dict = acc.dict;
        var nextInstArray = Array(nextStateArray.length);
        var nextKeys = new Set();
        // add
        for (var i = 0, n = nextStateArray.length; i < n; ++i) {
            var key = getKey(nextStateArray[i]);
            nextKeys.add(key);
            if (dict.has(key)) {
                nextInstArray[i] = dict.get(key);
            }
            else {
                var scopes = { '*': '$' + key, onion: instanceLens(key) };
                var sinks = isolate_1.default(onionifyChild(itemComp), scopes)(sources);
                dict.set(key, sinks);
                nextInstArray[i] = sinks;
            }
            nextInstArray[i]._key = key;
        }
        // remove
        dict.forEach(function (_, key) {
            if (!nextKeys.has(key)) {
                dict.delete(key);
            }
        });
        nextKeys.clear();
        return { dict: dict, arr: nextInstArray };
    }, { dict: new Map(), arr: [] });
    return collection$;
}
exports.collection = collection;
function makeGetter(scope) {
    if (typeof scope === 'string' || typeof scope === 'number') {
        return function lensGet(state) {
            if (typeof state === 'undefined') {
                return void 0;
            }
            else {
                return state[scope];
            }
        };
    }
    else {
        return scope.get;
    }
}
function makeSetter(scope) {
    if (typeof scope === 'string' || typeof scope === 'number') {
        return function lensSet(state, childState) {
            if (Array.isArray(state)) {
                return updateArrayEntry(state, scope, childState);
            }
            else if (typeof state === 'undefined') {
                return _a = {}, _a[scope] = childState, _a;
            }
            else {
                return __assign({}, state, (_b = {}, _b[scope] = childState, _b));
            }
            var _a, _b;
        };
    }
    else {
        return scope.set;
    }
}
function updateArrayEntry(array, scope, newVal) {
    if (newVal === array[scope]) {
        return array;
    }
    var index = parseInt(scope);
    if (typeof newVal === 'undefined') {
        return array.filter(function (val, i) { return i !== index; });
    }
    return array.map(function (val, i) { return i === index ? newVal : val; });
}
function isolateSource(source, scope) {
    return source.select(scope);
}
exports.isolateSource = isolateSource;
function isolateSink(innerReducer$, scope) {
    var get = makeGetter(scope);
    var set = makeSetter(scope);
    return innerReducer$
        .map(function (innerReducer) { return function outerReducer(outer) {
        var prevInner = get(outer);
        var nextInner = innerReducer(prevInner);
        if (prevInner === nextInner) {
            return outer;
        }
        else {
            return set(outer, nextInner);
        }
    }; });
}
exports.isolateSink = isolateSink;
var StateSource = (function () {
    function StateSource(stream, name) {
        this.isolateSource = isolateSource;
        this.isolateSink = isolateSink;
        this._name = name;
        this._state$ = stream
            .filter(function (s) { return typeof s !== 'undefined'; })
            .compose(dropRepeats_1.default())
            .remember();
        this.state$ = adapt_1.adapt(this._state$);
        if (!name) {
            return;
        }
        this._state$._isCycleSource = name;
    }
    StateSource.prototype.select = function (scope) {
        var get = makeGetter(scope);
        return new StateSource(this._state$.map(get), null);
    };
    return StateSource;
}());
exports.StateSource = StateSource;
function onionify(main, name) {
    if (name === void 0) { name = 'onion'; }
    return function mainOnionified(sources) {
        var reducerMimic$ = xstream_1.default.create();
        var state$ = reducerMimic$
            .fold(function (state, reducer) { return reducer(state); }, void 0)
            .drop(1);
        sources[name] = new StateSource(state$, name);
        var sinks = main(sources);
        if (sinks[name]) {
            var stream$ = xstream_1.default.fromObservable(sinks[name]);
            reducerMimic$.imitate(stream$);
        }
        return sinks;
    };
}
exports.default = onionify;

},{"./pickCombine":31,"./pickMerge":32,"@cycle/isolate":23,"@cycle/run/lib/adapt":24,"xstream":125,"xstream/extra/dropRepeats":124}],31:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var xstream_1 = require("xstream");
var PickCombineListener = (function () {
    function PickCombineListener(key, out, p, ins) {
        this.key = key;
        this.out = out;
        this.p = p;
        this.val = xstream_1.NO;
        this.ins = ins;
        this.c = false;
    }
    PickCombineListener.prototype._n = function (t) {
        var p = this.p, out = this.out;
        this.val = t;
        if (out === null) {
            return;
        }
        this.p.up();
    };
    PickCombineListener.prototype._e = function (err) {
        var out = this.out;
        if (out === null) {
            return;
        }
        out._e(err);
    };
    PickCombineListener.prototype._c = function () {
        var p = this.p, out = this.out;
        this.c = true;
        if (out === null) {
            return;
        }
        var n = p.inst.arr.length;
        var ils = p.ils;
        var instArr = p.inst.arr;
        for (var i = 0; i < n; ++i) {
            if (ils.get(instArr[i]._key).c === false) {
                return;
            }
        }
        out._c();
    };
    return PickCombineListener;
}());
var PickCombine = (function () {
    function PickCombine(sel, ins) {
        this.type = 'combine';
        this.ins = ins;
        this.sel = sel;
        this.out = null;
        this.ils = new Map();
        this.inst = null;
    }
    PickCombine.prototype._start = function (out) {
        this.out = out;
        this.ins._add(this);
    };
    PickCombine.prototype._stop = function () {
        var ils = this.ils;
        ils.forEach(function (il) {
            il.ins._remove(il);
            il.ins = null;
            il.out = null;
            il.val = null;
        });
        ils.clear();
        this.out = null;
        this.ils = new Map();
        this.inst = null;
    };
    PickCombine.prototype.up = function () {
        var arr = this.inst.arr;
        var n = arr.length;
        var outArr = Array(n);
        var ils = this.ils;
        for (var i = 0; i < n; ++i) {
            var sinks = arr[i];
            var key = sinks._key;
            if (!ils.has(key)) {
                return;
            }
            var val = ils.get(key).val;
            if (val === xstream_1.NO) {
                return;
            }
            outArr[i] = val;
        }
        this.out._n(outArr);
    };
    PickCombine.prototype._n = function (inst) {
        this.inst = inst;
        var arrSinks = inst.arr;
        var ils = this.ils;
        var out = this.out;
        var sel = this.sel;
        var dict = inst.dict;
        var n = arrSinks.length;
        // remove
        var removed = false;
        ils.forEach(function (il, key) {
            if (!dict.has(key)) {
                il.ins._remove(il);
                il.ins = null;
                il.out = null;
                il.val = null;
                ils.delete(key);
                removed = true;
            }
        });
        if (n === 0) {
            out._n([]);
            return;
        }
        // add
        var added = false;
        for (var i = 0; i < n; ++i) {
            var sinks = arrSinks[i];
            var key = sinks._key;
            var sink = sinks[sel];
            if (!ils.has(key)) {
                ils.set(key, new PickCombineListener(key, out, this, sink));
                added = true;
            }
        }
        if (added) {
            for (var i = 0; i < n; ++i) {
                var sinks = arrSinks[i];
                var key = sinks._key;
                var sink = sinks[sel];
                if (sink._ils.length === 0) {
                    sink._add(ils.get(key));
                }
            }
        }
        if (removed) {
            this.up();
        }
    };
    PickCombine.prototype._e = function (e) {
        var out = this.out;
        if (out === null) {
            return;
        }
        out._e(e);
    };
    PickCombine.prototype._c = function () {
        var out = this.out;
        if (out === null) {
            return;
        }
        out._c();
    };
    return PickCombine;
}());
function pickCombine(selector) {
    return function pickCombineOperator(inst$) {
        return new xstream_1.Stream(new PickCombine(selector, inst$));
    };
}
exports.pickCombine = pickCombine;

},{"xstream":125}],32:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var xstream_1 = require("xstream");
var PickMergeListener = (function () {
    function PickMergeListener(out, p, ins) {
        this.ins = ins;
        this.out = out;
        this.p = p;
        this.c = false;
    }
    PickMergeListener.prototype._n = function (t) {
        var p = this.p, out = this.out;
        if (out === null) {
            return;
        }
        out._n(t);
    };
    PickMergeListener.prototype._e = function (err) {
        var out = this.out;
        if (out === null) {
            return;
        }
        out._e(err);
    };
    PickMergeListener.prototype._c = function () {
        var p = this.p, out = this.out;
        this.c = true;
        if (out === null) {
            return;
        }
        var n = p.inst.arr.length;
        var ils = p.ils;
        var instArr = p.inst.arr;
        for (var i = 0; i < n; ++i) {
            if (ils.get(instArr[i]._key).c === false) {
                return;
            }
        }
        out._c();
    };
    return PickMergeListener;
}());
var PickMerge = (function () {
    function PickMerge(sel, ins) {
        this.type = 'pickMerge';
        this.ins = ins;
        this.out = null;
        this.sel = sel;
        this.ils = new Map();
        this.inst = null;
    }
    PickMerge.prototype._start = function (out) {
        this.out = out;
        this.ins._add(this);
    };
    PickMerge.prototype._stop = function () {
        var ils = this.ils;
        ils.forEach(function (il, key) {
            il.ins._remove(il);
            il.ins = null;
            il.out = null;
            ils.delete(key);
        });
        ils.clear();
        this.out = null;
        this.ils = new Map();
        this.inst = null;
    };
    PickMerge.prototype._n = function (inst) {
        this.inst = inst;
        var arrSinks = inst.arr;
        var ils = this.ils;
        var out = this.out;
        var sel = this.sel;
        var n = arrSinks.length;
        // add
        for (var i = 0; i < n; ++i) {
            var sinks = arrSinks[i];
            var key = sinks._key;
            var sink = sinks[sel];
            if (!ils.has(key)) {
                ils.set(key, new PickMergeListener(out, this, sink));
            }
        }
        for (var i = 0; i < n; ++i) {
            var sinks = arrSinks[i];
            var key = sinks._key;
            var sink = sinks[sel];
            if (sink._ils.length === 0) {
                sink._add(ils.get(key));
            }
        }
        // remove
        ils.forEach(function (il, key) {
            if (!inst.dict.has(key) || !inst.dict.get(key)) {
                il.ins._remove(il);
                il.ins = null;
                il.out = null;
                ils.delete(key);
            }
        });
    };
    PickMerge.prototype._e = function (err) {
        var u = this.out;
        if (u === xstream_1.NO)
            return;
        u._e(err);
    };
    PickMerge.prototype._c = function () {
        var u = this.out;
        if (u === xstream_1.NO)
            return;
        u._c();
    };
    return PickMerge;
}());
function pickMerge(selector) {
    return function pickMergeOperator(inst$) {
        return new xstream_1.Stream(new PickMerge(selector, inst$));
    };
}
exports.pickMerge = pickMerge;

},{"xstream":125}],33:[function(require,module,exports){
"use strict";
var xstream_1 = require('xstream');
function serialize(state) {
    return JSON.stringify(state);
}
function deserialize(str) {
    return JSON.parse(str) || {};
}
function storageify(Component, options) {
    var _options = Object.assign(
    // defaults
    {
        key: 'storageify',
        serialize: serialize,
        deserialize: deserialize,
    }, options);
    return function (sources) {
        var localStorage$ = sources.storage.local.getItem(_options.key).take(1);
        var storedData$ = localStorage$.map(_options.deserialize);
        var state$ = sources.onion.state$;
        var componentSinks = Component(sources);
        // change initial reducer (first reducer) of component
        // to merge default state with stored state
        var childReducer$ = componentSinks.onion;
        var parentReducer$ = storedData$.map(function (storedData) {
          return childReducer$.startWith(function initialStorageReducer(prevState) {
            if (prevState) {
              return Object.assign({}, prevState, storedData);
            } else {
              return storedData;
            }
          })
        }).flatten()
        var storage$ = state$.map(_options.serialize)
            .map(function (value) { return ({ key: _options.key, value: value }); });
        var sinks = Object.assign(componentSinks, {
            onion: parentReducer$,
            storage: storage$,
        });
        return sinks;
    };
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = storageify;

},{"xstream":35}],34:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var symbol_observable_1 = require('symbol-observable');
var NO = {};
function noop() { }
function copy(a) {
    var l = a.length;
    var b = Array(l);
    for (var i = 0; i < l; ++i) {
        b[i] = a[i];
    }
    return b;
}
exports.NO_IL = {
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
var Subscription = (function () {
    function Subscription(_stream, _listener) {
        this._stream = _stream;
        this._listener = _listener;
    }
    Subscription.prototype.unsubscribe = function () {
        this._stream.removeListener(this._listener);
    };
    return Subscription;
}());
exports.Subscription = Subscription;
var ObservableProducer = (function () {
    function ObservableProducer(observable) {
        this.type = 'fromObservable';
        this.ins = observable;
    }
    ObservableProducer.prototype._start = function (out) {
        this.out = out;
        this._subscription = this.ins.subscribe(new ObservableListener(out));
    };
    ObservableProducer.prototype._stop = function () {
        this._subscription.unsubscribe();
    };
    return ObservableProducer;
}());
var ObservableListener = (function () {
    function ObservableListener(_listener) {
        this._listener = _listener;
    }
    ObservableListener.prototype.next = function (value) {
        this._listener._n(value);
    };
    ObservableListener.prototype.error = function (err) {
        this._listener._e(err);
    };
    ObservableListener.prototype.complete = function () {
        this._listener._c();
    };
    return ObservableListener;
}());
var MergeProducer = (function () {
    function MergeProducer(insArr) {
        this.type = 'merge';
        this.insArr = insArr;
        this.out = NO;
        this.ac = 0;
    }
    MergeProducer.prototype._start = function (out) {
        this.out = out;
        var s = this.insArr;
        var L = s.length;
        this.ac = L;
        for (var i = 0; i < L; i++) {
            s[i]._add(this);
        }
    };
    MergeProducer.prototype._stop = function () {
        var s = this.insArr;
        var L = s.length;
        for (var i = 0; i < L; i++) {
            s[i]._remove(this);
        }
        this.out = NO;
    };
    MergeProducer.prototype._n = function (t) {
        var u = this.out;
        if (u === NO)
            return;
        u._n(t);
    };
    MergeProducer.prototype._e = function (err) {
        var u = this.out;
        if (u === NO)
            return;
        u._e(err);
    };
    MergeProducer.prototype._c = function () {
        if (--this.ac <= 0) {
            var u = this.out;
            if (u === NO)
                return;
            u._c();
        }
    };
    return MergeProducer;
}());
exports.MergeProducer = MergeProducer;
var CombineListener = (function () {
    function CombineListener(i, out, p) {
        this.i = i;
        this.out = out;
        this.p = p;
        p.ils.push(this);
    }
    CombineListener.prototype._n = function (t) {
        var p = this.p, out = this.out;
        if (out === NO)
            return;
        if (p.up(t, this.i)) {
            out._n(p.vals);
        }
    };
    CombineListener.prototype._e = function (err) {
        var out = this.out;
        if (out === NO)
            return;
        out._e(err);
    };
    CombineListener.prototype._c = function () {
        var p = this.p;
        if (p.out === NO)
            return;
        if (--p.Nc === 0) {
            p.out._c();
        }
    };
    return CombineListener;
}());
exports.CombineListener = CombineListener;
var CombineProducer = (function () {
    function CombineProducer(insArr) {
        this.type = 'combine';
        this.insArr = insArr;
        this.out = NO;
        this.ils = [];
        this.Nc = this.Nn = 0;
        this.vals = [];
    }
    CombineProducer.prototype.up = function (t, i) {
        var v = this.vals[i];
        var Nn = !this.Nn ? 0 : v === NO ? --this.Nn : this.Nn;
        this.vals[i] = t;
        return Nn === 0;
    };
    CombineProducer.prototype._start = function (out) {
        this.out = out;
        var s = this.insArr;
        var n = this.Nc = this.Nn = s.length;
        var vals = this.vals = new Array(n);
        if (n === 0) {
            out._n([]);
            out._c();
        }
        else {
            for (var i = 0; i < n; i++) {
                vals[i] = NO;
                s[i]._add(new CombineListener(i, out, this));
            }
        }
    };
    CombineProducer.prototype._stop = function () {
        var s = this.insArr;
        var n = s.length;
        var ils = this.ils;
        for (var i = 0; i < n; i++) {
            s[i]._remove(ils[i]);
        }
        this.out = NO;
        this.ils = [];
        this.vals = [];
    };
    return CombineProducer;
}());
exports.CombineProducer = CombineProducer;
var FromArrayProducer = (function () {
    function FromArrayProducer(a) {
        this.type = 'fromArray';
        this.a = a;
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
        this.type = 'fromPromise';
        this.on = false;
        this.p = p;
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
        }).then(noop, function (err) {
            setTimeout(function () { throw err; });
        });
    };
    FromPromiseProducer.prototype._stop = function () {
        this.on = false;
    };
    return FromPromiseProducer;
}());
exports.FromPromiseProducer = FromPromiseProducer;
var PeriodicProducer = (function () {
    function PeriodicProducer(period) {
        this.type = 'periodic';
        this.period = period;
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
    function DebugOperator(ins, arg) {
        this.type = 'debug';
        this.ins = ins;
        this.out = NO;
        this.s = noop;
        this.l = '';
        if (typeof arg === 'string') {
            this.l = arg;
        }
        else if (typeof arg === 'function') {
            this.s = arg;
        }
    }
    DebugOperator.prototype._start = function (out) {
        this.out = out;
        this.ins._add(this);
    };
    DebugOperator.prototype._stop = function () {
        this.ins._remove(this);
        this.out = NO;
    };
    DebugOperator.prototype._n = function (t) {
        var u = this.out;
        if (u === NO)
            return;
        var s = this.s, l = this.l;
        if (s !== noop) {
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
        if (u === NO)
            return;
        u._e(err);
    };
    DebugOperator.prototype._c = function () {
        var u = this.out;
        if (u === NO)
            return;
        u._c();
    };
    return DebugOperator;
}());
exports.DebugOperator = DebugOperator;
var DropOperator = (function () {
    function DropOperator(max, ins) {
        this.type = 'drop';
        this.ins = ins;
        this.out = NO;
        this.max = max;
        this.dropped = 0;
    }
    DropOperator.prototype._start = function (out) {
        this.out = out;
        this.dropped = 0;
        this.ins._add(this);
    };
    DropOperator.prototype._stop = function () {
        this.ins._remove(this);
        this.out = NO;
    };
    DropOperator.prototype._n = function (t) {
        var u = this.out;
        if (u === NO)
            return;
        if (this.dropped++ >= this.max)
            u._n(t);
    };
    DropOperator.prototype._e = function (err) {
        var u = this.out;
        if (u === NO)
            return;
        u._e(err);
    };
    DropOperator.prototype._c = function () {
        var u = this.out;
        if (u === NO)
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
    function EndWhenOperator(o, ins) {
        this.type = 'endWhen';
        this.ins = ins;
        this.out = NO;
        this.o = o;
        this.oil = exports.NO_IL;
    }
    EndWhenOperator.prototype._start = function (out) {
        this.out = out;
        this.o._add(this.oil = new OtherIL(out, this));
        this.ins._add(this);
    };
    EndWhenOperator.prototype._stop = function () {
        this.ins._remove(this);
        this.o._remove(this.oil);
        this.out = NO;
        this.oil = exports.NO_IL;
    };
    EndWhenOperator.prototype.end = function () {
        var u = this.out;
        if (u === NO)
            return;
        u._c();
    };
    EndWhenOperator.prototype._n = function (t) {
        var u = this.out;
        if (u === NO)
            return;
        u._n(t);
    };
    EndWhenOperator.prototype._e = function (err) {
        var u = this.out;
        if (u === NO)
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
        this.type = 'filter';
        this.ins = ins;
        this.out = NO;
        this.passes = passes;
    }
    FilterOperator.prototype._start = function (out) {
        this.out = out;
        this.ins._add(this);
    };
    FilterOperator.prototype._stop = function () {
        this.ins._remove(this);
        this.out = NO;
    };
    FilterOperator.prototype._n = function (t) {
        var u = this.out;
        if (u === NO)
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
        if (u === NO)
            return;
        u._e(err);
    };
    FilterOperator.prototype._c = function () {
        var u = this.out;
        if (u === NO)
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
        this.op.inner = NO;
        this.op.less();
    };
    return FlattenListener;
}());
var FlattenOperator = (function () {
    function FlattenOperator(ins) {
        this.type = 'flatten';
        this.ins = ins;
        this.out = NO;
        this.open = true;
        this.inner = NO;
        this.il = exports.NO_IL;
    }
    FlattenOperator.prototype._start = function (out) {
        this.out = out;
        this.open = true;
        this.inner = NO;
        this.il = exports.NO_IL;
        this.ins._add(this);
    };
    FlattenOperator.prototype._stop = function () {
        this.ins._remove(this);
        if (this.inner !== NO)
            this.inner._remove(this.il);
        this.out = NO;
        this.open = true;
        this.inner = NO;
        this.il = exports.NO_IL;
    };
    FlattenOperator.prototype.less = function () {
        var u = this.out;
        if (u === NO)
            return;
        if (!this.open && this.inner === NO)
            u._c();
    };
    FlattenOperator.prototype._n = function (s) {
        var u = this.out;
        if (u === NO)
            return;
        var _a = this, inner = _a.inner, il = _a.il;
        if (inner !== NO && il !== exports.NO_IL)
            inner._remove(il);
        (this.inner = s)._add(this.il = new FlattenListener(u, this));
    };
    FlattenOperator.prototype._e = function (err) {
        var u = this.out;
        if (u === NO)
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
        this.type = 'fold';
        this.ins = ins;
        this.out = NO;
        this.f = f;
        this.acc = this.seed = seed;
    }
    FoldOperator.prototype._start = function (out) {
        this.out = out;
        this.acc = this.seed;
        out._n(this.acc);
        this.ins._add(this);
    };
    FoldOperator.prototype._stop = function () {
        this.ins._remove(this);
        this.out = NO;
        this.acc = this.seed;
    };
    FoldOperator.prototype._n = function (t) {
        var u = this.out;
        if (u === NO)
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
        if (u === NO)
            return;
        u._e(err);
    };
    FoldOperator.prototype._c = function () {
        var u = this.out;
        if (u === NO)
            return;
        u._c();
    };
    return FoldOperator;
}());
exports.FoldOperator = FoldOperator;
var LastOperator = (function () {
    function LastOperator(ins) {
        this.type = 'last';
        this.ins = ins;
        this.out = NO;
        this.has = false;
        this.val = NO;
    }
    LastOperator.prototype._start = function (out) {
        this.out = out;
        this.has = false;
        this.ins._add(this);
    };
    LastOperator.prototype._stop = function () {
        this.ins._remove(this);
        this.out = NO;
        this.val = NO;
    };
    LastOperator.prototype._n = function (t) {
        this.has = true;
        this.val = t;
    };
    LastOperator.prototype._e = function (err) {
        var u = this.out;
        if (u === NO)
            return;
        u._e(err);
    };
    LastOperator.prototype._c = function () {
        var u = this.out;
        if (u === NO)
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
        this.op.inner = NO;
        this.op.less();
    };
    return MapFlattenInner;
}());
var MapFlattenOperator = (function () {
    function MapFlattenOperator(mapOp) {
        this.type = mapOp.type + "+flatten";
        this.ins = mapOp.ins;
        this.out = NO;
        this.mapOp = mapOp;
        this.inner = NO;
        this.il = exports.NO_IL;
        this.open = true;
    }
    MapFlattenOperator.prototype._start = function (out) {
        this.out = out;
        this.inner = NO;
        this.il = exports.NO_IL;
        this.open = true;
        this.mapOp.ins._add(this);
    };
    MapFlattenOperator.prototype._stop = function () {
        this.mapOp.ins._remove(this);
        if (this.inner !== NO)
            this.inner._remove(this.il);
        this.out = NO;
        this.inner = NO;
        this.il = exports.NO_IL;
    };
    MapFlattenOperator.prototype.less = function () {
        if (!this.open && this.inner === NO) {
            var u = this.out;
            if (u === NO)
                return;
            u._c();
        }
    };
    MapFlattenOperator.prototype._n = function (v) {
        var u = this.out;
        if (u === NO)
            return;
        var _a = this, inner = _a.inner, il = _a.il;
        var s;
        try {
            s = this.mapOp.project(v);
        }
        catch (e) {
            u._e(e);
            return;
        }
        if (inner !== NO && il !== exports.NO_IL)
            inner._remove(il);
        (this.inner = s)._add(this.il = new MapFlattenInner(u, this));
    };
    MapFlattenOperator.prototype._e = function (err) {
        var u = this.out;
        if (u === NO)
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
        this.type = 'map';
        this.ins = ins;
        this.out = NO;
        this.project = project;
    }
    MapOperator.prototype._start = function (out) {
        this.out = out;
        this.ins._add(this);
    };
    MapOperator.prototype._stop = function () {
        this.ins._remove(this);
        this.out = NO;
    };
    MapOperator.prototype._n = function (t) {
        var u = this.out;
        if (u === NO)
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
        if (u === NO)
            return;
        u._e(err);
    };
    MapOperator.prototype._c = function () {
        var u = this.out;
        if (u === NO)
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
        this.type = 'filter+map';
        this.passes = passes;
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
var RememberOperator = (function () {
    function RememberOperator(ins) {
        this.type = 'remember';
        this.ins = ins;
        this.out = NO;
    }
    RememberOperator.prototype._start = function (out) {
        this.out = out;
        this.ins._add(out);
    };
    RememberOperator.prototype._stop = function () {
        this.ins._remove(this.out);
        this.out = NO;
    };
    return RememberOperator;
}());
exports.RememberOperator = RememberOperator;
var ReplaceErrorOperator = (function () {
    function ReplaceErrorOperator(fn, ins) {
        this.type = 'replaceError';
        this.ins = ins;
        this.out = NO;
        this.fn = fn;
    }
    ReplaceErrorOperator.prototype._start = function (out) {
        this.out = out;
        this.ins._add(this);
    };
    ReplaceErrorOperator.prototype._stop = function () {
        this.ins._remove(this);
        this.out = NO;
    };
    ReplaceErrorOperator.prototype._n = function (t) {
        var u = this.out;
        if (u === NO)
            return;
        u._n(t);
    };
    ReplaceErrorOperator.prototype._e = function (err) {
        var u = this.out;
        if (u === NO)
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
        if (u === NO)
            return;
        u._c();
    };
    return ReplaceErrorOperator;
}());
exports.ReplaceErrorOperator = ReplaceErrorOperator;
var StartWithOperator = (function () {
    function StartWithOperator(ins, val) {
        this.type = 'startWith';
        this.ins = ins;
        this.out = NO;
        this.val = val;
    }
    StartWithOperator.prototype._start = function (out) {
        this.out = out;
        this.out._n(this.val);
        this.ins._add(out);
    };
    StartWithOperator.prototype._stop = function () {
        this.ins._remove(this.out);
        this.out = NO;
    };
    return StartWithOperator;
}());
exports.StartWithOperator = StartWithOperator;
var TakeOperator = (function () {
    function TakeOperator(max, ins) {
        this.type = 'take';
        this.ins = ins;
        this.out = NO;
        this.max = max;
        this.taken = 0;
    }
    TakeOperator.prototype._start = function (out) {
        this.out = out;
        this.taken = 0;
        if (this.max <= 0) {
            out._c();
        }
        else {
            this.ins._add(this);
        }
    };
    TakeOperator.prototype._stop = function () {
        this.ins._remove(this);
        this.out = NO;
    };
    TakeOperator.prototype._n = function (t) {
        var u = this.out;
        if (u === NO)
            return;
        if (this.taken++ < this.max - 1) {
            u._n(t);
        }
        else {
            u._n(t);
            u._c();
        }
    };
    TakeOperator.prototype._e = function (err) {
        var u = this.out;
        if (u === NO)
            return;
        u._e(err);
    };
    TakeOperator.prototype._c = function () {
        var u = this.out;
        if (u === NO)
            return;
        u._c();
    };
    return TakeOperator;
}());
exports.TakeOperator = TakeOperator;
var Stream = (function () {
    function Stream(producer) {
        this._prod = producer || NO;
        this._ils = [];
        this._stopID = NO;
        this._dl = NO;
        this._d = false;
        this._target = NO;
        this._err = NO;
    }
    Stream.prototype._n = function (t) {
        var a = this._ils;
        var L = a.length;
        if (this._d)
            this._dl._n(t);
        if (L == 1)
            a[0]._n(t);
        else {
            var b = copy(a);
            for (var i = 0; i < L; i++)
                b[i]._n(t);
        }
    };
    Stream.prototype._e = function (err) {
        if (this._err !== NO)
            return;
        this._err = err;
        var a = this._ils;
        var L = a.length;
        this._x();
        if (this._d)
            this._dl._e(err);
        if (L == 1)
            a[0]._e(err);
        else {
            var b = copy(a);
            for (var i = 0; i < L; i++)
                b[i]._e(err);
        }
    };
    Stream.prototype._c = function () {
        var a = this._ils;
        var L = a.length;
        this._x();
        if (this._d)
            this._dl._c();
        if (L == 1)
            a[0]._c();
        else {
            var b = copy(a);
            for (var i = 0; i < L; i++)
                b[i]._c();
        }
    };
    Stream.prototype._x = function () {
        if (this._ils.length === 0)
            return;
        if (this._prod !== NO)
            this._prod._stop();
        this._err = NO;
        this._ils = [];
    };
    Stream.prototype._stopNow = function () {
        // WARNING: code that calls this method should
        // first check if this._prod is valid (not `NO`)
        this._prod._stop();
        this._err = NO;
        this._stopID = NO;
    };
    Stream.prototype._add = function (il) {
        var ta = this._target;
        if (ta !== NO)
            return ta._add(il);
        var a = this._ils;
        a.push(il);
        if (a.length > 1)
            return;
        if (this._stopID !== NO) {
            clearTimeout(this._stopID);
            this._stopID = NO;
        }
        else {
            var p = this._prod;
            if (p !== NO)
                p._start(this);
        }
    };
    Stream.prototype._remove = function (il) {
        var _this = this;
        var ta = this._target;
        if (ta !== NO)
            return ta._remove(il);
        var a = this._ils;
        var i = a.indexOf(il);
        if (i > -1) {
            a.splice(i, 1);
            if (this._prod !== NO && a.length <= 0) {
                this._err = NO;
                this._stopID = setTimeout(function () { return _this._stopNow(); });
            }
            else if (a.length === 1) {
                this._pruneCycles();
            }
        }
    };
    // If all paths stemming from `this` stream eventually end at `this`
    // stream, then we remove the single listener of `this` stream, to
    // force it to end its execution and dispose resources. This method
    // assumes as a precondition that this._ils has just one listener.
    Stream.prototype._pruneCycles = function () {
        if (this._hasNoSinks(this, [])) {
            this._remove(this._ils[0]);
        }
    };
    // Checks whether *there is no* path starting from `x` that leads to an end
    // listener (sink) in the stream graph, following edges A->B where B is a
    // listener of A. This means these paths constitute a cycle somehow. Is given
    // a trace of all visited nodes so far.
    Stream.prototype._hasNoSinks = function (x, trace) {
        if (trace.indexOf(x) !== -1) {
            return true;
        }
        else if (x.out === this) {
            return true;
        }
        else if (x.out && x.out !== NO) {
            return this._hasNoSinks(x.out, trace.concat(x));
        }
        else if (x._ils) {
            for (var i = 0, N = x._ils.length; i < N; i++) {
                if (!this._hasNoSinks(x._ils[i], trace.concat(x))) {
                    return false;
                }
            }
            return true;
        }
        else {
            return false;
        }
    };
    Stream.prototype.ctor = function () {
        return this instanceof MemoryStream ? MemoryStream : Stream;
    };
    /**
     * Adds a Listener to the Stream.
     *
     * @param {Listener<T>} listener
     */
    Stream.prototype.addListener = function (listener) {
        listener._n = listener.next || noop;
        listener._e = listener.error || noop;
        listener._c = listener.complete || noop;
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
    /**
     * Adds a Listener to the Stream returning a Subscription to remove that
     * listener.
     *
     * @param {Listener} listener
     * @returns {Subscription}
     */
    Stream.prototype.subscribe = function (listener) {
        this.addListener(listener);
        return new Subscription(this, listener);
    };
    /**
     * Add interop between most.js and RxJS 5
     *
     * @returns {Stream}
     */
    Stream.prototype[symbol_observable_1.default] = function () {
        return this;
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
     * Creates a stream from an Array, Promise, or an Observable.
     *
     * @factory true
     * @param {Array|Promise|Observable} input The input to make a stream from.
     * @return {Stream}
     */
    Stream.from = function (input) {
        if (typeof input[symbol_observable_1.default] === 'function') {
            return Stream.fromObservable(input);
        }
        else if (typeof input.then === 'function') {
            return Stream.fromPromise(input);
        }
        else if (Array.isArray(input)) {
            return Stream.fromArray(input);
        }
        throw new TypeError("Type of input to from() must be an Array, Promise, or Observable");
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
     * Converts an Observable into a Stream.
     *
     * @factory true
     * @param {any} observable The observable to be converted as a stream.
     * @return {Stream}
     */
    Stream.fromObservable = function (observable) {
        return new Stream(new ObservableProducer(observable));
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
            return new Stream(new FilterOperator(and(p.passes, passes), p.ins));
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
     * stream will complete. Before that happens, the output stream will behaves
     * like the input stream.
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
     * function which returns the stream that the output stream will replicate.
     * And, in case that new stream also emits an error, `replace` will be called
     * again to get another stream to start replicating.
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
     * stream and returns a new stream. The output stream will behave like the
     * stream that this function returns.
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
     * Returns an output stream that behaves like the input stream, but also
     * remembers the most recent event that happens on the input stream, so that a
     * newly added listener will immediately receive that memorised event.
     *
     * @return {MemoryStream}
     */
    Stream.prototype.remember = function () {
        return new MemoryStream(new RememberOperator(this));
    };
    /**
     * Returns an output stream that identically behaves like the input stream,
     * but also runs a `spy` function fo each event, to help you debug your app.
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
        return new (this.ctor())(new DebugOperator(this, labelOrSpy));
    };
    /**
     * *imitate* changes this current Stream to emit the same events that the
     * `other` given Stream does. This method returns nothing.
     *
     * This method exists to allow one thing: **circular dependency of streams**.
     * For instance, let's imagine that for some reason you need to create a
     * circular dependency where stream `first$` depends on stream `second$`
     * which in turn depends on `first$`:
     *
     * <!-- skip-example -->
     * ```js
     * import delay from 'xstream/extra/delay'
     *
     * var first$ = second$.map(x => x * 10).take(3);
     * var second$ = first$.map(x => x + 1).startWith(1).compose(delay(100));
     * ```
     *
     * However, that is invalid JavaScript, because `second$` is undefined
     * on the first line. This is how *imitate* can help solve it:
     *
     * ```js
     * import delay from 'xstream/extra/delay'
     *
     * var secondProxy$ = xs.create();
     * var first$ = secondProxy$.map(x => x * 10).take(3);
     * var second$ = first$.map(x => x + 1).startWith(1).compose(delay(100));
     * secondProxy$.imitate(second$);
     * ```
     *
     * We create `secondProxy$` before the others, so it can be used in the
     * declaration of `first$`. Then, after both `first$` and `second$` are
     * defined, we hook `secondProxy$` with `second$` with `imitate()` to tell
     * that they are "the same". `imitate` will not trigger the start of any
     * stream, it just binds `secondProxy$` and `second$` together.
     *
     * The following is an example where `imitate()` is important in Cycle.js
     * applications. A parent component contains some child components. A child
     * has an action stream which is given to the parent to define its state:
     *
     * <!-- skip-example -->
     * ```js
     * const childActionProxy$ = xs.create();
     * const parent = Parent({...sources, childAction$: childActionProxy$});
     * const childAction$ = parent.state$.map(s => s.child.action$).flatten();
     * childActionProxy$.imitate(childAction$);
     * ```
     *
     * Note, though, that **`imitate()` does not support MemoryStreams**. If we
     * would attempt to imitate a MemoryStream in a circular dependency, we would
     * either get a race condition (where the symptom would be "nothing happens")
     * or an infinite cyclic emission of values. It's useful to think about
     * MemoryStreams as cells in a spreadsheet. It doesn't make any sense to
     * define a spreadsheet cell `A1` with a formula that depends on `B1` and
     * cell `B1` defined with a formula that depends on `A1`.
     *
     * If you find yourself wanting to use `imitate()` with a
     * MemoryStream, you should rework your code around `imitate()` to use a
     * Stream instead. Look for the stream in the circular dependency that
     * represents an event stream, and that would be a candidate for creating a
     * proxy Stream which then imitates the target Stream.
     *
     * @param {Stream} target The other stream to imitate on the current one. Must
     * not be a MemoryStream.
     */
    Stream.prototype.imitate = function (target) {
        if (target instanceof MemoryStream) {
            throw new Error('A MemoryStream was given to imitate(), but it only ' +
                'supports a Stream. Read more about this restriction here: ' +
                'https://github.com/staltz/xstream#faq');
        }
        this._target = target;
        for (var ils = this._ils, N = ils.length, i = 0; i < N; i++) {
            target._add(ils[i]);
        }
        this._ils = [];
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
     * Adds a "debug" listener to the stream. There can only be one debug
     * listener, that's why this is 'setDebugListener'. To remove the debug
     * listener, just call setDebugListener(null).
     *
     * A debug listener is like any other listener. The only difference is that a
     * debug listener is "stealthy": its presence/absence does not trigger the
     * start/stop of the stream (or the producer inside the stream). This is
     * useful so you can inspect what is going on without changing the behavior
     * of the program. If you have an idle stream and you add a normal listener to
     * it, the stream will start executing. But if you set a debug listener on an
     * idle stream, it won't start executing (not until the first normal listener
     * is added).
     *
     * As the name indicates, we don't recommend using this method to build app
     * logic. In fact, in most cases the debug operator works just fine. Only use
     * this one if you know what you're doing.
     *
     * @param {Listener<T>} listener
     */
    Stream.prototype.setDebugListener = function (listener) {
        if (!listener) {
            this._d = false;
            this._dl = NO;
        }
        else {
            this._d = true;
            listener._n = listener.next;
            listener._e = listener.error;
            listener._c = listener.complete;
            this._dl = listener;
        }
    };
    /**
     * Blends multiple streams together, emitting events from all of them
     * concurrently.
     *
     * *merge* takes multiple streams as arguments, and creates a stream that
     * behaves like each of the argument streams, in parallel.
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
    Stream.merge = function merge() {
        var streams = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            streams[_i - 0] = arguments[_i];
        }
        return new Stream(new MergeProducer(streams));
    };
    /**
     * Combines multiple input streams together to return a stream whose events
     * are arrays that collect the latest events from each input stream.
     *
     * *combine* internally remembers the most recent event from each of the input
     * streams. When any of the input streams emits an event, that event together
     * with all the other saved events are combined into an array. That array will
     * be emitted on the output stream. It's essentially a way of joining together
     * the events from multiple streams.
     *
     * Marble diagram:
     *
     * ```text
     * --1----2-----3--------4---
     * ----a-----b-----c--d------
     *          combine
     * ----1a-2a-2b-3b-3c-3d-4d--
     * ```
     *
     * @factory true
     * @param {Stream} stream1 A stream to combine together with other streams.
     * @param {Stream} stream2 A stream to combine together with other streams.
     * Multiple streams, not just two, may be given as arguments.
     * @return {Stream}
     */
    Stream.combine = function combine() {
        var streams = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            streams[_i - 0] = arguments[_i];
        }
        return new Stream(new CombineProducer(streams));
    };
    return Stream;
}());
exports.Stream = Stream;
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
    MemoryStream.prototype._stopNow = function () {
        this._has = false;
        _super.prototype._stopNow.call(this);
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
    MemoryStream.prototype.remember = function () {
        return this;
    };
    MemoryStream.prototype.debug = function (labelOrSpy) {
        return _super.prototype.debug.call(this, labelOrSpy);
    };
    return MemoryStream;
}(Stream));
exports.MemoryStream = MemoryStream;
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Stream;

},{"symbol-observable":119}],35:[function(require,module,exports){
"use strict";
var core_1 = require('./core');
exports.Stream = core_1.Stream;
exports.MemoryStream = core_1.MemoryStream;
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = core_1.Stream;

},{"./core":34}],36:[function(require,module,exports){
'use strict';

var copy             = require('es5-ext/object/copy')
  , normalizeOptions = require('es5-ext/object/normalize-options')
  , ensureCallable   = require('es5-ext/object/valid-callable')
  , map              = require('es5-ext/object/map')
  , callable         = require('es5-ext/object/valid-callable')
  , validValue       = require('es5-ext/object/valid-value')

  , bind = Function.prototype.bind, defineProperty = Object.defineProperty
  , hasOwnProperty = Object.prototype.hasOwnProperty
  , define;

define = function (name, desc, options) {
	var value = validValue(desc) && callable(desc.value), dgs;
	dgs = copy(desc);
	delete dgs.writable;
	delete dgs.value;
	dgs.get = function () {
		if (!options.overwriteDefinition && hasOwnProperty.call(this, name)) return value;
		desc.value = bind.call(value, options.resolveContext ? options.resolveContext(this) : this);
		defineProperty(this, name, desc);
		return this[name];
	};
	return dgs;
};

module.exports = function (props/*, options*/) {
	var options = normalizeOptions(arguments[1]);
	if (options.resolveContext != null) ensureCallable(options.resolveContext);
	return map(props, function (desc, name) { return define(name, desc, options); });
};

},{"es5-ext/object/copy":55,"es5-ext/object/map":63,"es5-ext/object/normalize-options":64,"es5-ext/object/valid-callable":69,"es5-ext/object/valid-value":70}],37:[function(require,module,exports){
'use strict';

var assign        = require('es5-ext/object/assign')
  , normalizeOpts = require('es5-ext/object/normalize-options')
  , isCallable    = require('es5-ext/object/is-callable')
  , contains      = require('es5-ext/string/#/contains')

  , d;

d = module.exports = function (dscr, value/*, options*/) {
	var c, e, w, options, desc;
	if ((arguments.length < 2) || (typeof dscr !== 'string')) {
		options = value;
		value = dscr;
		dscr = null;
	} else {
		options = arguments[2];
	}
	if (dscr == null) {
		c = w = true;
		e = false;
	} else {
		c = contains.call(dscr, 'c');
		e = contains.call(dscr, 'e');
		w = contains.call(dscr, 'w');
	}

	desc = { value: value, configurable: c, enumerable: e, writable: w };
	return !options ? desc : assign(normalizeOpts(options), desc);
};

d.gs = function (dscr, get, set/*, options*/) {
	var c, e, options, desc;
	if (typeof dscr !== 'string') {
		options = set;
		set = get;
		get = dscr;
		dscr = null;
	} else {
		options = arguments[3];
	}
	if (get == null) {
		get = undefined;
	} else if (!isCallable(get)) {
		options = get;
		get = set = undefined;
	} else if (set == null) {
		set = undefined;
	} else if (!isCallable(set)) {
		options = set;
		set = undefined;
	}
	if (dscr == null) {
		c = true;
		e = false;
	} else {
		c = contains.call(dscr, 'c');
		e = contains.call(dscr, 'e');
	}

	desc = { get: get, set: set, configurable: c, enumerable: e };
	return !options ? desc : assign(normalizeOpts(options), desc);
};

},{"es5-ext/object/assign":52,"es5-ext/object/is-callable":58,"es5-ext/object/normalize-options":64,"es5-ext/string/#/contains":71}],38:[function(require,module,exports){
// Inspired by Google Closure:
// http://closure-library.googlecode.com/svn/docs/
// closure_goog_array_array.js.html#goog.array.clear

'use strict';

var value = require('../../object/valid-value');

module.exports = function () {
	value(this).length = 0;
	return this;
};

},{"../../object/valid-value":70}],39:[function(require,module,exports){
'use strict';

var toPosInt = require('../../number/to-pos-integer')
  , value    = require('../../object/valid-value')

  , indexOf = Array.prototype.indexOf
  , hasOwnProperty = Object.prototype.hasOwnProperty
  , abs = Math.abs, floor = Math.floor;

module.exports = function (searchElement/*, fromIndex*/) {
	var i, l, fromIndex, val;
	if (searchElement === searchElement) { //jslint: ignore
		return indexOf.apply(this, arguments);
	}

	l = toPosInt(value(this).length);
	fromIndex = arguments[1];
	if (isNaN(fromIndex)) fromIndex = 0;
	else if (fromIndex >= 0) fromIndex = floor(fromIndex);
	else fromIndex = toPosInt(this.length) - floor(abs(fromIndex));

	for (i = fromIndex; i < l; ++i) {
		if (hasOwnProperty.call(this, i)) {
			val = this[i];
			if (val !== val) return i; //jslint: ignore
		}
	}
	return -1;
};

},{"../../number/to-pos-integer":50,"../../object/valid-value":70}],40:[function(require,module,exports){
'use strict';

module.exports = require('./is-implemented')()
	? Array.from
	: require('./shim');

},{"./is-implemented":41,"./shim":42}],41:[function(require,module,exports){
'use strict';

module.exports = function () {
	var from = Array.from, arr, result;
	if (typeof from !== 'function') return false;
	arr = ['raz', 'dwa'];
	result = from(arr);
	return Boolean(result && (result !== arr) && (result[1] === 'dwa'));
};

},{}],42:[function(require,module,exports){
'use strict';

var iteratorSymbol = require('es6-symbol').iterator
  , isArguments    = require('../../function/is-arguments')
  , isFunction     = require('../../function/is-function')
  , toPosInt       = require('../../number/to-pos-integer')
  , callable       = require('../../object/valid-callable')
  , validValue     = require('../../object/valid-value')
  , isString       = require('../../string/is-string')

  , isArray = Array.isArray, call = Function.prototype.call
  , desc = { configurable: true, enumerable: true, writable: true, value: null }
  , defineProperty = Object.defineProperty;

module.exports = function (arrayLike/*, mapFn, thisArg*/) {
	var mapFn = arguments[1], thisArg = arguments[2], Constructor, i, j, arr, l, code, iterator
	  , result, getIterator, value;

	arrayLike = Object(validValue(arrayLike));

	if (mapFn != null) callable(mapFn);
	if (!this || (this === Array) || !isFunction(this)) {
		// Result: Plain array
		if (!mapFn) {
			if (isArguments(arrayLike)) {
				// Source: Arguments
				l = arrayLike.length;
				if (l !== 1) return Array.apply(null, arrayLike);
				arr = new Array(1);
				arr[0] = arrayLike[0];
				return arr;
			}
			if (isArray(arrayLike)) {
				// Source: Array
				arr = new Array(l = arrayLike.length);
				for (i = 0; i < l; ++i) arr[i] = arrayLike[i];
				return arr;
			}
		}
		arr = [];
	} else {
		// Result: Non plain array
		Constructor = this;
	}

	if (!isArray(arrayLike)) {
		if ((getIterator = arrayLike[iteratorSymbol]) !== undefined) {
			// Source: Iterator
			iterator = callable(getIterator).call(arrayLike);
			if (Constructor) arr = new Constructor();
			result = iterator.next();
			i = 0;
			while (!result.done) {
				value = mapFn ? call.call(mapFn, thisArg, result.value, i) : result.value;
				if (!Constructor) {
					arr[i] = value;
				} else {
					desc.value = value;
					defineProperty(arr, i, desc);
				}
				result = iterator.next();
				++i;
			}
			l = i;
		} else if (isString(arrayLike)) {
			// Source: String
			l = arrayLike.length;
			if (Constructor) arr = new Constructor();
			for (i = 0, j = 0; i < l; ++i) {
				value = arrayLike[i];
				if ((i + 1) < l) {
					code = value.charCodeAt(0);
					if ((code >= 0xD800) && (code <= 0xDBFF)) value += arrayLike[++i];
				}
				value = mapFn ? call.call(mapFn, thisArg, value, j) : value;
				if (!Constructor) {
					arr[j] = value;
				} else {
					desc.value = value;
					defineProperty(arr, j, desc);
				}
				++j;
			}
			l = j;
		}
	}
	if (l === undefined) {
		// Source: array or array-like
		l = toPosInt(arrayLike.length);
		if (Constructor) arr = new Constructor(l);
		for (i = 0; i < l; ++i) {
			value = mapFn ? call.call(mapFn, thisArg, arrayLike[i], i) : arrayLike[i];
			if (!Constructor) {
				arr[i] = value;
			} else {
				desc.value = value;
				defineProperty(arr, i, desc);
			}
		}
	}
	if (Constructor) {
		desc.value = null;
		arr.length = l;
	}
	return arr;
};

},{"../../function/is-arguments":43,"../../function/is-function":44,"../../number/to-pos-integer":50,"../../object/valid-callable":69,"../../object/valid-value":70,"../../string/is-string":74,"es6-symbol":88}],43:[function(require,module,exports){
'use strict';

var toString = Object.prototype.toString

  , id = toString.call((function () { return arguments; }()));

module.exports = function (x) { return (toString.call(x) === id); };

},{}],44:[function(require,module,exports){
'use strict';

var toString = Object.prototype.toString

  , id = toString.call(require('./noop'));

module.exports = function (f) {
	return (typeof f === "function") && (toString.call(f) === id);
};

},{"./noop":45}],45:[function(require,module,exports){
'use strict';

module.exports = function () {};

},{}],46:[function(require,module,exports){
'use strict';

module.exports = require('./is-implemented')()
	? Math.sign
	: require('./shim');

},{"./is-implemented":47,"./shim":48}],47:[function(require,module,exports){
'use strict';

module.exports = function () {
	var sign = Math.sign;
	if (typeof sign !== 'function') return false;
	return ((sign(10) === 1) && (sign(-20) === -1));
};

},{}],48:[function(require,module,exports){
'use strict';

module.exports = function (value) {
	value = Number(value);
	if (isNaN(value) || (value === 0)) return value;
	return (value > 0) ? 1 : -1;
};

},{}],49:[function(require,module,exports){
'use strict';

var sign = require('../math/sign')

  , abs = Math.abs, floor = Math.floor;

module.exports = function (value) {
	if (isNaN(value)) return 0;
	value = Number(value);
	if ((value === 0) || !isFinite(value)) return value;
	return sign(value) * floor(abs(value));
};

},{"../math/sign":46}],50:[function(require,module,exports){
'use strict';

var toInteger = require('./to-integer')

  , max = Math.max;

module.exports = function (value) { return max(0, toInteger(value)); };

},{"./to-integer":49}],51:[function(require,module,exports){
// Internal method, used by iteration functions.
// Calls a function for each key-value pair found in object
// Optionally takes compareFn to iterate object in specific order

'use strict';

var callable = require('./valid-callable')
  , value    = require('./valid-value')

  , bind = Function.prototype.bind, call = Function.prototype.call, keys = Object.keys
  , propertyIsEnumerable = Object.prototype.propertyIsEnumerable;

module.exports = function (method, defVal) {
	return function (obj, cb/*, thisArg, compareFn*/) {
		var list, thisArg = arguments[2], compareFn = arguments[3];
		obj = Object(value(obj));
		callable(cb);

		list = keys(obj);
		if (compareFn) {
			list.sort((typeof compareFn === 'function') ? bind.call(compareFn, obj) : undefined);
		}
		if (typeof method !== 'function') method = list[method];
		return call.call(method, list, function (key, index) {
			if (!propertyIsEnumerable.call(obj, key)) return defVal;
			return call.call(cb, thisArg, obj[key], key, obj, index);
		});
	};
};

},{"./valid-callable":69,"./valid-value":70}],52:[function(require,module,exports){
'use strict';

module.exports = require('./is-implemented')()
	? Object.assign
	: require('./shim');

},{"./is-implemented":53,"./shim":54}],53:[function(require,module,exports){
'use strict';

module.exports = function () {
	var assign = Object.assign, obj;
	if (typeof assign !== 'function') return false;
	obj = { foo: 'raz' };
	assign(obj, { bar: 'dwa' }, { trzy: 'trzy' });
	return (obj.foo + obj.bar + obj.trzy) === 'razdwatrzy';
};

},{}],54:[function(require,module,exports){
'use strict';

var keys  = require('../keys')
  , value = require('../valid-value')

  , max = Math.max;

module.exports = function (dest, src/*, …srcn*/) {
	var error, i, l = max(arguments.length, 2), assign;
	dest = Object(value(dest));
	assign = function (key) {
		try { dest[key] = src[key]; } catch (e) {
			if (!error) error = e;
		}
	};
	for (i = 1; i < l; ++i) {
		src = arguments[i];
		keys(src).forEach(assign);
	}
	if (error !== undefined) throw error;
	return dest;
};

},{"../keys":60,"../valid-value":70}],55:[function(require,module,exports){
'use strict';

var aFrom  = require('../array/from')
  , assign = require('./assign')
  , value  = require('./valid-value');

module.exports = function (obj/*, propertyNames, options*/) {
	var copy = Object(value(obj)), propertyNames = arguments[1], options = Object(arguments[2]);
	if (copy !== obj && !propertyNames) return copy;
	var result = {};
	if (propertyNames) {
		aFrom(propertyNames, function (propertyName) {
			if (options.ensure || propertyName in obj) result[propertyName] = obj[propertyName];
		});
	} else {
		assign(result, obj);
	}
	return result;
};

},{"../array/from":40,"./assign":52,"./valid-value":70}],56:[function(require,module,exports){
// Workaround for http://code.google.com/p/v8/issues/detail?id=2804

'use strict';

var create = Object.create, shim;

if (!require('./set-prototype-of/is-implemented')()) {
	shim = require('./set-prototype-of/shim');
}

module.exports = (function () {
	var nullObject, props, desc;
	if (!shim) return create;
	if (shim.level !== 1) return create;

	nullObject = {};
	props = {};
	desc = { configurable: false, enumerable: false, writable: true,
		value: undefined };
	Object.getOwnPropertyNames(Object.prototype).forEach(function (name) {
		if (name === '__proto__') {
			props[name] = { configurable: true, enumerable: false, writable: true,
				value: undefined };
			return;
		}
		props[name] = desc;
	});
	Object.defineProperties(nullObject, props);

	Object.defineProperty(shim, 'nullPolyfill', { configurable: false,
		enumerable: false, writable: false, value: nullObject });

	return function (prototype, props) {
		return create((prototype === null) ? nullObject : prototype, props);
	};
}());

},{"./set-prototype-of/is-implemented":67,"./set-prototype-of/shim":68}],57:[function(require,module,exports){
'use strict';

module.exports = require('./_iterate')('forEach');

},{"./_iterate":51}],58:[function(require,module,exports){
// Deprecated

'use strict';

module.exports = function (obj) { return typeof obj === 'function'; };

},{}],59:[function(require,module,exports){
'use strict';

var map = { 'function': true, object: true };

module.exports = function (x) {
	return ((x != null) && map[typeof x]) || false;
};

},{}],60:[function(require,module,exports){
'use strict';

module.exports = require('./is-implemented')()
	? Object.keys
	: require('./shim');

},{"./is-implemented":61,"./shim":62}],61:[function(require,module,exports){
'use strict';

module.exports = function () {
	try {
		Object.keys('primitive');
		return true;
	} catch (e) { return false; }
};

},{}],62:[function(require,module,exports){
'use strict';

var keys = Object.keys;

module.exports = function (object) {
	return keys(object == null ? object : Object(object));
};

},{}],63:[function(require,module,exports){
'use strict';

var callable = require('./valid-callable')
  , forEach  = require('./for-each')

  , call = Function.prototype.call;

module.exports = function (obj, cb/*, thisArg*/) {
	var o = {}, thisArg = arguments[2];
	callable(cb);
	forEach(obj, function (value, key, obj, index) {
		o[key] = call.call(cb, thisArg, value, key, obj, index);
	});
	return o;
};

},{"./for-each":57,"./valid-callable":69}],64:[function(require,module,exports){
'use strict';

var forEach = Array.prototype.forEach, create = Object.create;

var process = function (src, obj) {
	var key;
	for (key in src) obj[key] = src[key];
};

module.exports = function (options/*, …options*/) {
	var result = create(null);
	forEach.call(arguments, function (options) {
		if (options == null) return;
		process(Object(options), result);
	});
	return result;
};

},{}],65:[function(require,module,exports){
'use strict';

var forEach = Array.prototype.forEach, create = Object.create;

module.exports = function (arg/*, …args*/) {
	var set = create(null);
	forEach.call(arguments, function (name) { set[name] = true; });
	return set;
};

},{}],66:[function(require,module,exports){
'use strict';

module.exports = require('./is-implemented')()
	? Object.setPrototypeOf
	: require('./shim');

},{"./is-implemented":67,"./shim":68}],67:[function(require,module,exports){
'use strict';

var create = Object.create, getPrototypeOf = Object.getPrototypeOf
  , x = {};

module.exports = function (/*customCreate*/) {
	var setPrototypeOf = Object.setPrototypeOf
	  , customCreate = arguments[0] || create;
	if (typeof setPrototypeOf !== 'function') return false;
	return getPrototypeOf(setPrototypeOf(customCreate(null), x)) === x;
};

},{}],68:[function(require,module,exports){
// Big thanks to @WebReflection for sorting this out
// https://gist.github.com/WebReflection/5593554

'use strict';

var isObject      = require('../is-object')
  , value         = require('../valid-value')

  , isPrototypeOf = Object.prototype.isPrototypeOf
  , defineProperty = Object.defineProperty
  , nullDesc = { configurable: true, enumerable: false, writable: true,
		value: undefined }
  , validate;

validate = function (obj, prototype) {
	value(obj);
	if ((prototype === null) || isObject(prototype)) return obj;
	throw new TypeError('Prototype must be null or an object');
};

module.exports = (function (status) {
	var fn, set;
	if (!status) return null;
	if (status.level === 2) {
		if (status.set) {
			set = status.set;
			fn = function (obj, prototype) {
				set.call(validate(obj, prototype), prototype);
				return obj;
			};
		} else {
			fn = function (obj, prototype) {
				validate(obj, prototype).__proto__ = prototype;
				return obj;
			};
		}
	} else {
		fn = function self(obj, prototype) {
			var isNullBase;
			validate(obj, prototype);
			isNullBase = isPrototypeOf.call(self.nullPolyfill, obj);
			if (isNullBase) delete self.nullPolyfill.__proto__;
			if (prototype === null) prototype = self.nullPolyfill;
			obj.__proto__ = prototype;
			if (isNullBase) defineProperty(self.nullPolyfill, '__proto__', nullDesc);
			return obj;
		};
	}
	return Object.defineProperty(fn, 'level', { configurable: false,
		enumerable: false, writable: false, value: status.level });
}((function () {
	var x = Object.create(null), y = {}, set
	  , desc = Object.getOwnPropertyDescriptor(Object.prototype, '__proto__');

	if (desc) {
		try {
			set = desc.set; // Opera crashes at this point
			set.call(x, y);
		} catch (ignore) { }
		if (Object.getPrototypeOf(x) === y) return { set: set, level: 2 };
	}

	x.__proto__ = y;
	if (Object.getPrototypeOf(x) === y) return { level: 2 };

	x = {};
	x.__proto__ = y;
	if (Object.getPrototypeOf(x) === y) return { level: 1 };

	return false;
}())));

require('../create');

},{"../create":56,"../is-object":59,"../valid-value":70}],69:[function(require,module,exports){
'use strict';

module.exports = function (fn) {
	if (typeof fn !== 'function') throw new TypeError(fn + " is not a function");
	return fn;
};

},{}],70:[function(require,module,exports){
'use strict';

module.exports = function (value) {
	if (value == null) throw new TypeError("Cannot use null or undefined");
	return value;
};

},{}],71:[function(require,module,exports){
'use strict';

module.exports = require('./is-implemented')()
	? String.prototype.contains
	: require('./shim');

},{"./is-implemented":72,"./shim":73}],72:[function(require,module,exports){
'use strict';

var str = 'razdwatrzy';

module.exports = function () {
	if (typeof str.contains !== 'function') return false;
	return ((str.contains('dwa') === true) && (str.contains('foo') === false));
};

},{}],73:[function(require,module,exports){
'use strict';

var indexOf = String.prototype.indexOf;

module.exports = function (searchString/*, position*/) {
	return indexOf.call(this, searchString, arguments[1]) > -1;
};

},{}],74:[function(require,module,exports){
'use strict';

var toString = Object.prototype.toString

  , id = toString.call('');

module.exports = function (x) {
	return (typeof x === 'string') || (x && (typeof x === 'object') &&
		((x instanceof String) || (toString.call(x) === id))) || false;
};

},{}],75:[function(require,module,exports){
'use strict';

var setPrototypeOf = require('es5-ext/object/set-prototype-of')
  , contains       = require('es5-ext/string/#/contains')
  , d              = require('d')
  , Iterator       = require('./')

  , defineProperty = Object.defineProperty
  , ArrayIterator;

ArrayIterator = module.exports = function (arr, kind) {
	if (!(this instanceof ArrayIterator)) return new ArrayIterator(arr, kind);
	Iterator.call(this, arr);
	if (!kind) kind = 'value';
	else if (contains.call(kind, 'key+value')) kind = 'key+value';
	else if (contains.call(kind, 'key')) kind = 'key';
	else kind = 'value';
	defineProperty(this, '__kind__', d('', kind));
};
if (setPrototypeOf) setPrototypeOf(ArrayIterator, Iterator);

ArrayIterator.prototype = Object.create(Iterator.prototype, {
	constructor: d(ArrayIterator),
	_resolve: d(function (i) {
		if (this.__kind__ === 'value') return this.__list__[i];
		if (this.__kind__ === 'key+value') return [i, this.__list__[i]];
		return i;
	}),
	toString: d(function () { return '[object Array Iterator]'; })
});

},{"./":78,"d":37,"es5-ext/object/set-prototype-of":66,"es5-ext/string/#/contains":71}],76:[function(require,module,exports){
'use strict';

var isArguments = require('es5-ext/function/is-arguments')
  , callable    = require('es5-ext/object/valid-callable')
  , isString    = require('es5-ext/string/is-string')
  , get         = require('./get')

  , isArray = Array.isArray, call = Function.prototype.call
  , some = Array.prototype.some;

module.exports = function (iterable, cb/*, thisArg*/) {
	var mode, thisArg = arguments[2], result, doBreak, broken, i, l, char, code;
	if (isArray(iterable) || isArguments(iterable)) mode = 'array';
	else if (isString(iterable)) mode = 'string';
	else iterable = get(iterable);

	callable(cb);
	doBreak = function () { broken = true; };
	if (mode === 'array') {
		some.call(iterable, function (value) {
			call.call(cb, thisArg, value, doBreak);
			if (broken) return true;
		});
		return;
	}
	if (mode === 'string') {
		l = iterable.length;
		for (i = 0; i < l; ++i) {
			char = iterable[i];
			if ((i + 1) < l) {
				code = char.charCodeAt(0);
				if ((code >= 0xD800) && (code <= 0xDBFF)) char += iterable[++i];
			}
			call.call(cb, thisArg, char, doBreak);
			if (broken) break;
		}
		return;
	}
	result = iterable.next();

	while (!result.done) {
		call.call(cb, thisArg, result.value, doBreak);
		if (broken) return;
		result = iterable.next();
	}
};

},{"./get":77,"es5-ext/function/is-arguments":43,"es5-ext/object/valid-callable":69,"es5-ext/string/is-string":74}],77:[function(require,module,exports){
'use strict';

var isArguments    = require('es5-ext/function/is-arguments')
  , isString       = require('es5-ext/string/is-string')
  , ArrayIterator  = require('./array')
  , StringIterator = require('./string')
  , iterable       = require('./valid-iterable')
  , iteratorSymbol = require('es6-symbol').iterator;

module.exports = function (obj) {
	if (typeof iterable(obj)[iteratorSymbol] === 'function') return obj[iteratorSymbol]();
	if (isArguments(obj)) return new ArrayIterator(obj);
	if (isString(obj)) return new StringIterator(obj);
	return new ArrayIterator(obj);
};

},{"./array":75,"./string":80,"./valid-iterable":81,"es5-ext/function/is-arguments":43,"es5-ext/string/is-string":74,"es6-symbol":88}],78:[function(require,module,exports){
'use strict';

var clear    = require('es5-ext/array/#/clear')
  , assign   = require('es5-ext/object/assign')
  , callable = require('es5-ext/object/valid-callable')
  , value    = require('es5-ext/object/valid-value')
  , d        = require('d')
  , autoBind = require('d/auto-bind')
  , Symbol   = require('es6-symbol')

  , defineProperty = Object.defineProperty
  , defineProperties = Object.defineProperties
  , Iterator;

module.exports = Iterator = function (list, context) {
	if (!(this instanceof Iterator)) return new Iterator(list, context);
	defineProperties(this, {
		__list__: d('w', value(list)),
		__context__: d('w', context),
		__nextIndex__: d('w', 0)
	});
	if (!context) return;
	callable(context.on);
	context.on('_add', this._onAdd);
	context.on('_delete', this._onDelete);
	context.on('_clear', this._onClear);
};

defineProperties(Iterator.prototype, assign({
	constructor: d(Iterator),
	_next: d(function () {
		var i;
		if (!this.__list__) return;
		if (this.__redo__) {
			i = this.__redo__.shift();
			if (i !== undefined) return i;
		}
		if (this.__nextIndex__ < this.__list__.length) return this.__nextIndex__++;
		this._unBind();
	}),
	next: d(function () { return this._createResult(this._next()); }),
	_createResult: d(function (i) {
		if (i === undefined) return { done: true, value: undefined };
		return { done: false, value: this._resolve(i) };
	}),
	_resolve: d(function (i) { return this.__list__[i]; }),
	_unBind: d(function () {
		this.__list__ = null;
		delete this.__redo__;
		if (!this.__context__) return;
		this.__context__.off('_add', this._onAdd);
		this.__context__.off('_delete', this._onDelete);
		this.__context__.off('_clear', this._onClear);
		this.__context__ = null;
	}),
	toString: d(function () { return '[object Iterator]'; })
}, autoBind({
	_onAdd: d(function (index) {
		if (index >= this.__nextIndex__) return;
		++this.__nextIndex__;
		if (!this.__redo__) {
			defineProperty(this, '__redo__', d('c', [index]));
			return;
		}
		this.__redo__.forEach(function (redo, i) {
			if (redo >= index) this.__redo__[i] = ++redo;
		}, this);
		this.__redo__.push(index);
	}),
	_onDelete: d(function (index) {
		var i;
		if (index >= this.__nextIndex__) return;
		--this.__nextIndex__;
		if (!this.__redo__) return;
		i = this.__redo__.indexOf(index);
		if (i !== -1) this.__redo__.splice(i, 1);
		this.__redo__.forEach(function (redo, i) {
			if (redo > index) this.__redo__[i] = --redo;
		}, this);
	}),
	_onClear: d(function () {
		if (this.__redo__) clear.call(this.__redo__);
		this.__nextIndex__ = 0;
	})
})));

defineProperty(Iterator.prototype, Symbol.iterator, d(function () {
	return this;
}));
defineProperty(Iterator.prototype, Symbol.toStringTag, d('', 'Iterator'));

},{"d":37,"d/auto-bind":36,"es5-ext/array/#/clear":38,"es5-ext/object/assign":52,"es5-ext/object/valid-callable":69,"es5-ext/object/valid-value":70,"es6-symbol":88}],79:[function(require,module,exports){
'use strict';

var isArguments    = require('es5-ext/function/is-arguments')
  , isString       = require('es5-ext/string/is-string')
  , iteratorSymbol = require('es6-symbol').iterator

  , isArray = Array.isArray;

module.exports = function (value) {
	if (value == null) return false;
	if (isArray(value)) return true;
	if (isString(value)) return true;
	if (isArguments(value)) return true;
	return (typeof value[iteratorSymbol] === 'function');
};

},{"es5-ext/function/is-arguments":43,"es5-ext/string/is-string":74,"es6-symbol":88}],80:[function(require,module,exports){
// Thanks @mathiasbynens
// http://mathiasbynens.be/notes/javascript-unicode#iterating-over-symbols

'use strict';

var setPrototypeOf = require('es5-ext/object/set-prototype-of')
  , d              = require('d')
  , Iterator       = require('./')

  , defineProperty = Object.defineProperty
  , StringIterator;

StringIterator = module.exports = function (str) {
	if (!(this instanceof StringIterator)) return new StringIterator(str);
	str = String(str);
	Iterator.call(this, str);
	defineProperty(this, '__length__', d('', str.length));

};
if (setPrototypeOf) setPrototypeOf(StringIterator, Iterator);

StringIterator.prototype = Object.create(Iterator.prototype, {
	constructor: d(StringIterator),
	_next: d(function () {
		if (!this.__list__) return;
		if (this.__nextIndex__ < this.__length__) return this.__nextIndex__++;
		this._unBind();
	}),
	_resolve: d(function (i) {
		var char = this.__list__[i], code;
		if (this.__nextIndex__ === this.__length__) return char;
		code = char.charCodeAt(0);
		if ((code >= 0xD800) && (code <= 0xDBFF)) return char + this.__list__[this.__nextIndex__++];
		return char;
	}),
	toString: d(function () { return '[object String Iterator]'; })
});

},{"./":78,"d":37,"es5-ext/object/set-prototype-of":66}],81:[function(require,module,exports){
'use strict';

var isIterable = require('./is-iterable');

module.exports = function (value) {
	if (!isIterable(value)) throw new TypeError(value + " is not iterable");
	return value;
};

},{"./is-iterable":79}],82:[function(require,module,exports){
'use strict';

module.exports = require('./is-implemented')() ? Map : require('./polyfill');

},{"./is-implemented":83,"./polyfill":87}],83:[function(require,module,exports){
'use strict';

module.exports = function () {
	var map, iterator, result;
	if (typeof Map !== 'function') return false;
	try {
		// WebKit doesn't support arguments and crashes
		map = new Map([['raz', 'one'], ['dwa', 'two'], ['trzy', 'three']]);
	} catch (e) {
		return false;
	}
	if (String(map) !== '[object Map]') return false;
	if (map.size !== 3) return false;
	if (typeof map.clear !== 'function') return false;
	if (typeof map.delete !== 'function') return false;
	if (typeof map.entries !== 'function') return false;
	if (typeof map.forEach !== 'function') return false;
	if (typeof map.get !== 'function') return false;
	if (typeof map.has !== 'function') return false;
	if (typeof map.keys !== 'function') return false;
	if (typeof map.set !== 'function') return false;
	if (typeof map.values !== 'function') return false;

	iterator = map.entries();
	result = iterator.next();
	if (result.done !== false) return false;
	if (!result.value) return false;
	if (result.value[0] !== 'raz') return false;
	if (result.value[1] !== 'one') return false;

	return true;
};

},{}],84:[function(require,module,exports){
// Exports true if environment provides native `Map` implementation,
// whatever that is.

'use strict';

module.exports = (function () {
	if (typeof Map === 'undefined') return false;
	return (Object.prototype.toString.call(new Map()) === '[object Map]');
}());

},{}],85:[function(require,module,exports){
'use strict';

module.exports = require('es5-ext/object/primitive-set')('key',
	'value', 'key+value');

},{"es5-ext/object/primitive-set":65}],86:[function(require,module,exports){
'use strict';

var setPrototypeOf    = require('es5-ext/object/set-prototype-of')
  , d                 = require('d')
  , Iterator          = require('es6-iterator')
  , toStringTagSymbol = require('es6-symbol').toStringTag
  , kinds             = require('./iterator-kinds')

  , defineProperties = Object.defineProperties
  , unBind = Iterator.prototype._unBind
  , MapIterator;

MapIterator = module.exports = function (map, kind) {
	if (!(this instanceof MapIterator)) return new MapIterator(map, kind);
	Iterator.call(this, map.__mapKeysData__, map);
	if (!kind || !kinds[kind]) kind = 'key+value';
	defineProperties(this, {
		__kind__: d('', kind),
		__values__: d('w', map.__mapValuesData__)
	});
};
if (setPrototypeOf) setPrototypeOf(MapIterator, Iterator);

MapIterator.prototype = Object.create(Iterator.prototype, {
	constructor: d(MapIterator),
	_resolve: d(function (i) {
		if (this.__kind__ === 'value') return this.__values__[i];
		if (this.__kind__ === 'key') return this.__list__[i];
		return [this.__list__[i], this.__values__[i]];
	}),
	_unBind: d(function () {
		this.__values__ = null;
		unBind.call(this);
	}),
	toString: d(function () { return '[object Map Iterator]'; })
});
Object.defineProperty(MapIterator.prototype, toStringTagSymbol,
	d('c', 'Map Iterator'));

},{"./iterator-kinds":85,"d":37,"es5-ext/object/set-prototype-of":66,"es6-iterator":78,"es6-symbol":88}],87:[function(require,module,exports){
'use strict';

var clear          = require('es5-ext/array/#/clear')
  , eIndexOf       = require('es5-ext/array/#/e-index-of')
  , setPrototypeOf = require('es5-ext/object/set-prototype-of')
  , callable       = require('es5-ext/object/valid-callable')
  , validValue     = require('es5-ext/object/valid-value')
  , d              = require('d')
  , ee             = require('event-emitter')
  , Symbol         = require('es6-symbol')
  , iterator       = require('es6-iterator/valid-iterable')
  , forOf          = require('es6-iterator/for-of')
  , Iterator       = require('./lib/iterator')
  , isNative       = require('./is-native-implemented')

  , call = Function.prototype.call
  , defineProperties = Object.defineProperties, getPrototypeOf = Object.getPrototypeOf
  , MapPoly;

module.exports = MapPoly = function (/*iterable*/) {
	var iterable = arguments[0], keys, values, self;
	if (!(this instanceof MapPoly)) throw new TypeError('Constructor requires \'new\'');
	if (isNative && setPrototypeOf && (Map !== MapPoly)) {
		self = setPrototypeOf(new Map(), getPrototypeOf(this));
	} else {
		self = this;
	}
	if (iterable != null) iterator(iterable);
	defineProperties(self, {
		__mapKeysData__: d('c', keys = []),
		__mapValuesData__: d('c', values = [])
	});
	if (!iterable) return self;
	forOf(iterable, function (value) {
		var key = validValue(value)[0];
		value = value[1];
		if (eIndexOf.call(keys, key) !== -1) return;
		keys.push(key);
		values.push(value);
	}, self);
	return self;
};

if (isNative) {
	if (setPrototypeOf) setPrototypeOf(MapPoly, Map);
	MapPoly.prototype = Object.create(Map.prototype, {
		constructor: d(MapPoly)
	});
}

ee(defineProperties(MapPoly.prototype, {
	clear: d(function () {
		if (!this.__mapKeysData__.length) return;
		clear.call(this.__mapKeysData__);
		clear.call(this.__mapValuesData__);
		this.emit('_clear');
	}),
	delete: d(function (key) {
		var index = eIndexOf.call(this.__mapKeysData__, key);
		if (index === -1) return false;
		this.__mapKeysData__.splice(index, 1);
		this.__mapValuesData__.splice(index, 1);
		this.emit('_delete', index, key);
		return true;
	}),
	entries: d(function () { return new Iterator(this, 'key+value'); }),
	forEach: d(function (cb/*, thisArg*/) {
		var thisArg = arguments[1], iterator, result;
		callable(cb);
		iterator = this.entries();
		result = iterator._next();
		while (result !== undefined) {
			call.call(cb, thisArg, this.__mapValuesData__[result],
				this.__mapKeysData__[result], this);
			result = iterator._next();
		}
	}),
	get: d(function (key) {
		var index = eIndexOf.call(this.__mapKeysData__, key);
		if (index === -1) return;
		return this.__mapValuesData__[index];
	}),
	has: d(function (key) {
		return (eIndexOf.call(this.__mapKeysData__, key) !== -1);
	}),
	keys: d(function () { return new Iterator(this, 'key'); }),
	set: d(function (key, value) {
		var index = eIndexOf.call(this.__mapKeysData__, key), emit;
		if (index === -1) {
			index = this.__mapKeysData__.push(key) - 1;
			emit = true;
		}
		this.__mapValuesData__[index] = value;
		if (emit) this.emit('_add', index, key);
		return this;
	}),
	size: d.gs(function () { return this.__mapKeysData__.length; }),
	values: d(function () { return new Iterator(this, 'value'); }),
	toString: d(function () { return '[object Map]'; })
}));
Object.defineProperty(MapPoly.prototype, Symbol.iterator, d(function () {
	return this.entries();
}));
Object.defineProperty(MapPoly.prototype, Symbol.toStringTag, d('c', 'Map'));

},{"./is-native-implemented":84,"./lib/iterator":86,"d":37,"es5-ext/array/#/clear":38,"es5-ext/array/#/e-index-of":39,"es5-ext/object/set-prototype-of":66,"es5-ext/object/valid-callable":69,"es5-ext/object/valid-value":70,"es6-iterator/for-of":76,"es6-iterator/valid-iterable":81,"es6-symbol":88,"event-emitter":93}],88:[function(require,module,exports){
'use strict';

module.exports = require('./is-implemented')() ? Symbol : require('./polyfill');

},{"./is-implemented":89,"./polyfill":91}],89:[function(require,module,exports){
'use strict';

var validTypes = { object: true, symbol: true };

module.exports = function () {
	var symbol;
	if (typeof Symbol !== 'function') return false;
	symbol = Symbol('test symbol');
	try { String(symbol); } catch (e) { return false; }

	// Return 'true' also for polyfills
	if (!validTypes[typeof Symbol.iterator]) return false;
	if (!validTypes[typeof Symbol.toPrimitive]) return false;
	if (!validTypes[typeof Symbol.toStringTag]) return false;

	return true;
};

},{}],90:[function(require,module,exports){
'use strict';

module.exports = function (x) {
	if (!x) return false;
	if (typeof x === 'symbol') return true;
	if (!x.constructor) return false;
	if (x.constructor.name !== 'Symbol') return false;
	return (x[x.constructor.toStringTag] === 'Symbol');
};

},{}],91:[function(require,module,exports){
// ES2015 Symbol polyfill for environments that do not (or partially) support it

'use strict';

var d              = require('d')
  , validateSymbol = require('./validate-symbol')

  , create = Object.create, defineProperties = Object.defineProperties
  , defineProperty = Object.defineProperty, objPrototype = Object.prototype
  , NativeSymbol, SymbolPolyfill, HiddenSymbol, globalSymbols = create(null)
  , isNativeSafe;

if (typeof Symbol === 'function') {
	NativeSymbol = Symbol;
	try {
		String(NativeSymbol());
		isNativeSafe = true;
	} catch (ignore) {}
}

var generateName = (function () {
	var created = create(null);
	return function (desc) {
		var postfix = 0, name, ie11BugWorkaround;
		while (created[desc + (postfix || '')]) ++postfix;
		desc += (postfix || '');
		created[desc] = true;
		name = '@@' + desc;
		defineProperty(objPrototype, name, d.gs(null, function (value) {
			// For IE11 issue see:
			// https://connect.microsoft.com/IE/feedbackdetail/view/1928508/
			//    ie11-broken-getters-on-dom-objects
			// https://github.com/medikoo/es6-symbol/issues/12
			if (ie11BugWorkaround) return;
			ie11BugWorkaround = true;
			defineProperty(this, name, d(value));
			ie11BugWorkaround = false;
		}));
		return name;
	};
}());

// Internal constructor (not one exposed) for creating Symbol instances.
// This one is used to ensure that `someSymbol instanceof Symbol` always return false
HiddenSymbol = function Symbol(description) {
	if (this instanceof HiddenSymbol) throw new TypeError('Symbol is not a constructor');
	return SymbolPolyfill(description);
};

// Exposed `Symbol` constructor
// (returns instances of HiddenSymbol)
module.exports = SymbolPolyfill = function Symbol(description) {
	var symbol;
	if (this instanceof Symbol) throw new TypeError('Symbol is not a constructor');
	if (isNativeSafe) return NativeSymbol(description);
	symbol = create(HiddenSymbol.prototype);
	description = (description === undefined ? '' : String(description));
	return defineProperties(symbol, {
		__description__: d('', description),
		__name__: d('', generateName(description))
	});
};
defineProperties(SymbolPolyfill, {
	for: d(function (key) {
		if (globalSymbols[key]) return globalSymbols[key];
		return (globalSymbols[key] = SymbolPolyfill(String(key)));
	}),
	keyFor: d(function (s) {
		var key;
		validateSymbol(s);
		for (key in globalSymbols) if (globalSymbols[key] === s) return key;
	}),

	// To ensure proper interoperability with other native functions (e.g. Array.from)
	// fallback to eventual native implementation of given symbol
	hasInstance: d('', (NativeSymbol && NativeSymbol.hasInstance) || SymbolPolyfill('hasInstance')),
	isConcatSpreadable: d('', (NativeSymbol && NativeSymbol.isConcatSpreadable) ||
		SymbolPolyfill('isConcatSpreadable')),
	iterator: d('', (NativeSymbol && NativeSymbol.iterator) || SymbolPolyfill('iterator')),
	match: d('', (NativeSymbol && NativeSymbol.match) || SymbolPolyfill('match')),
	replace: d('', (NativeSymbol && NativeSymbol.replace) || SymbolPolyfill('replace')),
	search: d('', (NativeSymbol && NativeSymbol.search) || SymbolPolyfill('search')),
	species: d('', (NativeSymbol && NativeSymbol.species) || SymbolPolyfill('species')),
	split: d('', (NativeSymbol && NativeSymbol.split) || SymbolPolyfill('split')),
	toPrimitive: d('', (NativeSymbol && NativeSymbol.toPrimitive) || SymbolPolyfill('toPrimitive')),
	toStringTag: d('', (NativeSymbol && NativeSymbol.toStringTag) || SymbolPolyfill('toStringTag')),
	unscopables: d('', (NativeSymbol && NativeSymbol.unscopables) || SymbolPolyfill('unscopables'))
});

// Internal tweaks for real symbol producer
defineProperties(HiddenSymbol.prototype, {
	constructor: d(SymbolPolyfill),
	toString: d('', function () { return this.__name__; })
});

// Proper implementation of methods exposed on Symbol.prototype
// They won't be accessible on produced symbol instances as they derive from HiddenSymbol.prototype
defineProperties(SymbolPolyfill.prototype, {
	toString: d(function () { return 'Symbol (' + validateSymbol(this).__description__ + ')'; }),
	valueOf: d(function () { return validateSymbol(this); })
});
defineProperty(SymbolPolyfill.prototype, SymbolPolyfill.toPrimitive, d('', function () {
	var symbol = validateSymbol(this);
	if (typeof symbol === 'symbol') return symbol;
	return symbol.toString();
}));
defineProperty(SymbolPolyfill.prototype, SymbolPolyfill.toStringTag, d('c', 'Symbol'));

// Proper implementaton of toPrimitive and toStringTag for returned symbol instances
defineProperty(HiddenSymbol.prototype, SymbolPolyfill.toStringTag,
	d('c', SymbolPolyfill.prototype[SymbolPolyfill.toStringTag]));

// Note: It's important to define `toPrimitive` as last one, as some implementations
// implement `toPrimitive` natively without implementing `toStringTag` (or other specified symbols)
// And that may invoke error in definition flow:
// See: https://github.com/medikoo/es6-symbol/issues/13#issuecomment-164146149
defineProperty(HiddenSymbol.prototype, SymbolPolyfill.toPrimitive,
	d('c', SymbolPolyfill.prototype[SymbolPolyfill.toPrimitive]));

},{"./validate-symbol":92,"d":37}],92:[function(require,module,exports){
'use strict';

var isSymbol = require('./is-symbol');

module.exports = function (value) {
	if (!isSymbol(value)) throw new TypeError(value + " is not a symbol");
	return value;
};

},{"./is-symbol":90}],93:[function(require,module,exports){
'use strict';

var d        = require('d')
  , callable = require('es5-ext/object/valid-callable')

  , apply = Function.prototype.apply, call = Function.prototype.call
  , create = Object.create, defineProperty = Object.defineProperty
  , defineProperties = Object.defineProperties
  , hasOwnProperty = Object.prototype.hasOwnProperty
  , descriptor = { configurable: true, enumerable: false, writable: true }

  , on, once, off, emit, methods, descriptors, base;

on = function (type, listener) {
	var data;

	callable(listener);

	if (!hasOwnProperty.call(this, '__ee__')) {
		data = descriptor.value = create(null);
		defineProperty(this, '__ee__', descriptor);
		descriptor.value = null;
	} else {
		data = this.__ee__;
	}
	if (!data[type]) data[type] = listener;
	else if (typeof data[type] === 'object') data[type].push(listener);
	else data[type] = [data[type], listener];

	return this;
};

once = function (type, listener) {
	var once, self;

	callable(listener);
	self = this;
	on.call(this, type, once = function () {
		off.call(self, type, once);
		apply.call(listener, this, arguments);
	});

	once.__eeOnceListener__ = listener;
	return this;
};

off = function (type, listener) {
	var data, listeners, candidate, i;

	callable(listener);

	if (!hasOwnProperty.call(this, '__ee__')) return this;
	data = this.__ee__;
	if (!data[type]) return this;
	listeners = data[type];

	if (typeof listeners === 'object') {
		for (i = 0; (candidate = listeners[i]); ++i) {
			if ((candidate === listener) ||
					(candidate.__eeOnceListener__ === listener)) {
				if (listeners.length === 2) data[type] = listeners[i ? 0 : 1];
				else listeners.splice(i, 1);
			}
		}
	} else {
		if ((listeners === listener) ||
				(listeners.__eeOnceListener__ === listener)) {
			delete data[type];
		}
	}

	return this;
};

emit = function (type) {
	var i, l, listener, listeners, args;

	if (!hasOwnProperty.call(this, '__ee__')) return;
	listeners = this.__ee__[type];
	if (!listeners) return;

	if (typeof listeners === 'object') {
		l = arguments.length;
		args = new Array(l - 1);
		for (i = 1; i < l; ++i) args[i - 1] = arguments[i];

		listeners = listeners.slice();
		for (i = 0; (listener = listeners[i]); ++i) {
			apply.call(listener, this, args);
		}
	} else {
		switch (arguments.length) {
		case 1:
			call.call(listeners, this);
			break;
		case 2:
			call.call(listeners, this, arguments[1]);
			break;
		case 3:
			call.call(listeners, this, arguments[1], arguments[2]);
			break;
		default:
			l = arguments.length;
			args = new Array(l - 1);
			for (i = 1; i < l; ++i) {
				args[i - 1] = arguments[i];
			}
			apply.call(listeners, this, args);
		}
	}
};

methods = {
	on: on,
	once: once,
	off: off,
	emit: emit
};

descriptors = {
	on: d(on),
	once: d(once),
	off: d(off),
	emit: d(emit)
};

base = defineProperties({}, descriptors);

module.exports = exports = function (o) {
	return (o == null) ? create(base) : defineProperties(Object(o), descriptors);
};
exports.methods = methods;

},{"d":37,"es5-ext/object/valid-callable":69}],94:[function(require,module,exports){
'use strict';

exports.__esModule = true;
var canUseDOM = exports.canUseDOM = !!(typeof window !== 'undefined' && window.document && window.document.createElement);

var addEventListener = exports.addEventListener = function addEventListener(node, event, listener) {
  return node.addEventListener ? node.addEventListener(event, listener, false) : node.attachEvent('on' + event, listener);
};

var removeEventListener = exports.removeEventListener = function removeEventListener(node, event, listener) {
  return node.removeEventListener ? node.removeEventListener(event, listener, false) : node.detachEvent('on' + event, listener);
};

var getConfirmation = exports.getConfirmation = function getConfirmation(message, callback) {
  return callback(window.confirm(message));
}; // eslint-disable-line no-alert

/**
 * Returns true if the HTML5 history API is supported. Taken from Modernizr.
 *
 * https://github.com/Modernizr/Modernizr/blob/master/LICENSE
 * https://github.com/Modernizr/Modernizr/blob/master/feature-detects/history.js
 * changed to avoid false negatives for Windows Phones: https://github.com/reactjs/react-router/issues/586
 */
var supportsHistory = exports.supportsHistory = function supportsHistory() {
  var ua = window.navigator.userAgent;

  if ((ua.indexOf('Android 2.') !== -1 || ua.indexOf('Android 4.0') !== -1) && ua.indexOf('Mobile Safari') !== -1 && ua.indexOf('Chrome') === -1 && ua.indexOf('Windows Phone') === -1) return false;

  return window.history && 'pushState' in window.history;
};

/**
 * Returns true if browser fires popstate on hash change.
 * IE10 and IE11 do not.
 */
var supportsPopStateOnHashChange = exports.supportsPopStateOnHashChange = function supportsPopStateOnHashChange() {
  return window.navigator.userAgent.indexOf('Trident') === -1;
};

/**
 * Returns false if using go(n) with hash history causes a full page reload.
 */
var supportsGoWithoutReloadUsingHash = exports.supportsGoWithoutReloadUsingHash = function supportsGoWithoutReloadUsingHash() {
  return window.navigator.userAgent.indexOf('Firefox') === -1;
};

/**
 * Returns true if a given popstate event is an extraneous WebKit event.
 * Accounts for the fact that Chrome on iOS fires real popstate events
 * containing undefined state when pressing the back button.
 */
var isExtraneousPopstateEvent = exports.isExtraneousPopstateEvent = function isExtraneousPopstateEvent(event) {
  return event.state === undefined && navigator.userAgent.indexOf('CriOS') === -1;
};
},{}],95:[function(require,module,exports){
'use strict';

exports.__esModule = true;
exports.locationsAreEqual = exports.createLocation = undefined;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _resolvePathname = require('resolve-pathname');

var _resolvePathname2 = _interopRequireDefault(_resolvePathname);

var _valueEqual = require('value-equal');

var _valueEqual2 = _interopRequireDefault(_valueEqual);

var _PathUtils = require('./PathUtils');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var createLocation = exports.createLocation = function createLocation(path, state, key, currentLocation) {
  var location = void 0;
  if (typeof path === 'string') {
    // Two-arg form: push(path, state)
    location = (0, _PathUtils.parsePath)(path);
    location.state = state;
  } else {
    // One-arg form: push(location)
    location = _extends({}, path);

    if (location.pathname === undefined) location.pathname = '';

    if (location.search) {
      if (location.search.charAt(0) !== '?') location.search = '?' + location.search;
    } else {
      location.search = '';
    }

    if (location.hash) {
      if (location.hash.charAt(0) !== '#') location.hash = '#' + location.hash;
    } else {
      location.hash = '';
    }

    if (state !== undefined && location.state === undefined) location.state = state;
  }

  location.key = key;

  if (currentLocation) {
    // Resolve incomplete/relative pathname relative to current location.
    if (!location.pathname) {
      location.pathname = currentLocation.pathname;
    } else if (location.pathname.charAt(0) !== '/') {
      location.pathname = (0, _resolvePathname2.default)(location.pathname, currentLocation.pathname);
    }
  }

  return location;
};

var locationsAreEqual = exports.locationsAreEqual = function locationsAreEqual(a, b) {
  return a.pathname === b.pathname && a.search === b.search && a.hash === b.hash && a.key === b.key && (0, _valueEqual2.default)(a.state, b.state);
};
},{"./PathUtils":96,"resolve-pathname":104,"value-equal":122}],96:[function(require,module,exports){
'use strict';

exports.__esModule = true;
var addLeadingSlash = exports.addLeadingSlash = function addLeadingSlash(path) {
  return path.charAt(0) === '/' ? path : '/' + path;
};

var stripLeadingSlash = exports.stripLeadingSlash = function stripLeadingSlash(path) {
  return path.charAt(0) === '/' ? path.substr(1) : path;
};

var stripPrefix = exports.stripPrefix = function stripPrefix(path, prefix) {
  return path.indexOf(prefix) === 0 ? path.substr(prefix.length) : path;
};

var stripTrailingSlash = exports.stripTrailingSlash = function stripTrailingSlash(path) {
  return path.charAt(path.length - 1) === '/' ? path.slice(0, -1) : path;
};

var parsePath = exports.parsePath = function parsePath(path) {
  var pathname = path || '/';
  var search = '';
  var hash = '';

  var hashIndex = pathname.indexOf('#');
  if (hashIndex !== -1) {
    hash = pathname.substr(hashIndex);
    pathname = pathname.substr(0, hashIndex);
  }

  var searchIndex = pathname.indexOf('?');
  if (searchIndex !== -1) {
    search = pathname.substr(searchIndex);
    pathname = pathname.substr(0, searchIndex);
  }

  pathname = decodeURI(pathname);

  return {
    pathname: pathname,
    search: search === '?' ? '' : search,
    hash: hash === '#' ? '' : hash
  };
};

var createPath = exports.createPath = function createPath(location) {
  var pathname = location.pathname,
      search = location.search,
      hash = location.hash;


  var path = encodeURI(pathname || '/');

  if (search && search !== '?') path += search.charAt(0) === '?' ? search : '?' + search;

  if (hash && hash !== '#') path += hash.charAt(0) === '#' ? hash : '#' + hash;

  return path;
};
},{}],97:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _warning = require('warning');

var _warning2 = _interopRequireDefault(_warning);

var _invariant = require('invariant');

var _invariant2 = _interopRequireDefault(_invariant);

var _LocationUtils = require('./LocationUtils');

var _PathUtils = require('./PathUtils');

var _createTransitionManager = require('./createTransitionManager');

var _createTransitionManager2 = _interopRequireDefault(_createTransitionManager);

var _DOMUtils = require('./DOMUtils');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var PopStateEvent = 'popstate';
var HashChangeEvent = 'hashchange';

var getHistoryState = function getHistoryState() {
  try {
    return window.history.state || {};
  } catch (e) {
    // IE 11 sometimes throws when accessing window.history.state
    // See https://github.com/ReactTraining/history/pull/289
    return {};
  }
};

/**
 * Creates a history object that uses the HTML5 history API including
 * pushState, replaceState, and the popstate event.
 */
var createBrowserHistory = function createBrowserHistory() {
  var props = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

  (0, _invariant2.default)(_DOMUtils.canUseDOM, 'Browser history needs a DOM');

  var globalHistory = window.history;
  var canUseHistory = (0, _DOMUtils.supportsHistory)();
  var needsHashChangeListener = !(0, _DOMUtils.supportsPopStateOnHashChange)();

  var _props$forceRefresh = props.forceRefresh,
      forceRefresh = _props$forceRefresh === undefined ? false : _props$forceRefresh,
      _props$getUserConfirm = props.getUserConfirmation,
      getUserConfirmation = _props$getUserConfirm === undefined ? _DOMUtils.getConfirmation : _props$getUserConfirm,
      _props$keyLength = props.keyLength,
      keyLength = _props$keyLength === undefined ? 6 : _props$keyLength;

  var basename = props.basename ? (0, _PathUtils.stripTrailingSlash)((0, _PathUtils.addLeadingSlash)(props.basename)) : '';

  var getDOMLocation = function getDOMLocation(historyState) {
    var _ref = historyState || {},
        key = _ref.key,
        state = _ref.state;

    var _window$location = window.location,
        pathname = _window$location.pathname,
        search = _window$location.search,
        hash = _window$location.hash;


    var path = pathname + search + hash;

    if (basename) path = (0, _PathUtils.stripPrefix)(path, basename);

    return _extends({}, (0, _PathUtils.parsePath)(path), {
      state: state,
      key: key
    });
  };

  var createKey = function createKey() {
    return Math.random().toString(36).substr(2, keyLength);
  };

  var transitionManager = (0, _createTransitionManager2.default)();

  var setState = function setState(nextState) {
    _extends(history, nextState);

    history.length = globalHistory.length;

    transitionManager.notifyListeners(history.location, history.action);
  };

  var handlePopState = function handlePopState(event) {
    // Ignore extraneous popstate events in WebKit.
    if ((0, _DOMUtils.isExtraneousPopstateEvent)(event)) return;

    handlePop(getDOMLocation(event.state));
  };

  var handleHashChange = function handleHashChange() {
    handlePop(getDOMLocation(getHistoryState()));
  };

  var forceNextPop = false;

  var handlePop = function handlePop(location) {
    if (forceNextPop) {
      forceNextPop = false;
      setState();
    } else {
      var action = 'POP';

      transitionManager.confirmTransitionTo(location, action, getUserConfirmation, function (ok) {
        if (ok) {
          setState({ action: action, location: location });
        } else {
          revertPop(location);
        }
      });
    }
  };

  var revertPop = function revertPop(fromLocation) {
    var toLocation = history.location;

    // TODO: We could probably make this more reliable by
    // keeping a list of keys we've seen in sessionStorage.
    // Instead, we just default to 0 for keys we don't know.

    var toIndex = allKeys.indexOf(toLocation.key);

    if (toIndex === -1) toIndex = 0;

    var fromIndex = allKeys.indexOf(fromLocation.key);

    if (fromIndex === -1) fromIndex = 0;

    var delta = toIndex - fromIndex;

    if (delta) {
      forceNextPop = true;
      go(delta);
    }
  };

  var initialLocation = getDOMLocation(getHistoryState());
  var allKeys = [initialLocation.key];

  // Public interface

  var createHref = function createHref(location) {
    return basename + (0, _PathUtils.createPath)(location);
  };

  var push = function push(path, state) {
    (0, _warning2.default)(!((typeof path === 'undefined' ? 'undefined' : _typeof(path)) === 'object' && path.state !== undefined && state !== undefined), 'You should avoid providing a 2nd state argument to push when the 1st ' + 'argument is a location-like object that already has state; it is ignored');

    var action = 'PUSH';
    var location = (0, _LocationUtils.createLocation)(path, state, createKey(), history.location);

    transitionManager.confirmTransitionTo(location, action, getUserConfirmation, function (ok) {
      if (!ok) return;

      var href = createHref(location);
      var key = location.key,
          state = location.state;


      if (canUseHistory) {
        globalHistory.pushState({ key: key, state: state }, null, href);

        if (forceRefresh) {
          window.location.href = href;
        } else {
          var prevIndex = allKeys.indexOf(history.location.key);
          var nextKeys = allKeys.slice(0, prevIndex === -1 ? 0 : prevIndex + 1);

          nextKeys.push(location.key);
          allKeys = nextKeys;

          setState({ action: action, location: location });
        }
      } else {
        (0, _warning2.default)(state === undefined, 'Browser history cannot push state in browsers that do not support HTML5 history');

        window.location.href = href;
      }
    });
  };

  var replace = function replace(path, state) {
    (0, _warning2.default)(!((typeof path === 'undefined' ? 'undefined' : _typeof(path)) === 'object' && path.state !== undefined && state !== undefined), 'You should avoid providing a 2nd state argument to replace when the 1st ' + 'argument is a location-like object that already has state; it is ignored');

    var action = 'REPLACE';
    var location = (0, _LocationUtils.createLocation)(path, state, createKey(), history.location);

    transitionManager.confirmTransitionTo(location, action, getUserConfirmation, function (ok) {
      if (!ok) return;

      var href = createHref(location);
      var key = location.key,
          state = location.state;


      if (canUseHistory) {
        globalHistory.replaceState({ key: key, state: state }, null, href);

        if (forceRefresh) {
          window.location.replace(href);
        } else {
          var prevIndex = allKeys.indexOf(history.location.key);

          if (prevIndex !== -1) allKeys[prevIndex] = location.key;

          setState({ action: action, location: location });
        }
      } else {
        (0, _warning2.default)(state === undefined, 'Browser history cannot replace state in browsers that do not support HTML5 history');

        window.location.replace(href);
      }
    });
  };

  var go = function go(n) {
    globalHistory.go(n);
  };

  var goBack = function goBack() {
    return go(-1);
  };

  var goForward = function goForward() {
    return go(1);
  };

  var listenerCount = 0;

  var checkDOMListeners = function checkDOMListeners(delta) {
    listenerCount += delta;

    if (listenerCount === 1) {
      (0, _DOMUtils.addEventListener)(window, PopStateEvent, handlePopState);

      if (needsHashChangeListener) (0, _DOMUtils.addEventListener)(window, HashChangeEvent, handleHashChange);
    } else if (listenerCount === 0) {
      (0, _DOMUtils.removeEventListener)(window, PopStateEvent, handlePopState);

      if (needsHashChangeListener) (0, _DOMUtils.removeEventListener)(window, HashChangeEvent, handleHashChange);
    }
  };

  var isBlocked = false;

  var block = function block() {
    var prompt = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;

    var unblock = transitionManager.setPrompt(prompt);

    if (!isBlocked) {
      checkDOMListeners(1);
      isBlocked = true;
    }

    return function () {
      if (isBlocked) {
        isBlocked = false;
        checkDOMListeners(-1);
      }

      return unblock();
    };
  };

  var listen = function listen(listener) {
    var unlisten = transitionManager.appendListener(listener);
    checkDOMListeners(1);

    return function () {
      checkDOMListeners(-1);
      unlisten();
    };
  };

  var history = {
    length: globalHistory.length,
    action: 'POP',
    location: initialLocation,
    createHref: createHref,
    push: push,
    replace: replace,
    go: go,
    goBack: goBack,
    goForward: goForward,
    block: block,
    listen: listen
  };

  return history;
};

exports.default = createBrowserHistory;
},{"./DOMUtils":94,"./LocationUtils":95,"./PathUtils":96,"./createTransitionManager":100,"invariant":102,"warning":123}],98:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _warning = require('warning');

var _warning2 = _interopRequireDefault(_warning);

var _invariant = require('invariant');

var _invariant2 = _interopRequireDefault(_invariant);

var _LocationUtils = require('./LocationUtils');

var _PathUtils = require('./PathUtils');

var _createTransitionManager = require('./createTransitionManager');

var _createTransitionManager2 = _interopRequireDefault(_createTransitionManager);

var _DOMUtils = require('./DOMUtils');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var HashChangeEvent = 'hashchange';

var HashPathCoders = {
  hashbang: {
    encodePath: function encodePath(path) {
      return path.charAt(0) === '!' ? path : '!/' + (0, _PathUtils.stripLeadingSlash)(path);
    },
    decodePath: function decodePath(path) {
      return path.charAt(0) === '!' ? path.substr(1) : path;
    }
  },
  noslash: {
    encodePath: _PathUtils.stripLeadingSlash,
    decodePath: _PathUtils.addLeadingSlash
  },
  slash: {
    encodePath: _PathUtils.addLeadingSlash,
    decodePath: _PathUtils.addLeadingSlash
  }
};

var getHashPath = function getHashPath() {
  // We can't use window.location.hash here because it's not
  // consistent across browsers - Firefox will pre-decode it!
  var href = window.location.href;
  var hashIndex = href.indexOf('#');
  return hashIndex === -1 ? '' : href.substring(hashIndex + 1);
};

var pushHashPath = function pushHashPath(path) {
  return window.location.hash = path;
};

var replaceHashPath = function replaceHashPath(path) {
  var hashIndex = window.location.href.indexOf('#');

  window.location.replace(window.location.href.slice(0, hashIndex >= 0 ? hashIndex : 0) + '#' + path);
};

var createHashHistory = function createHashHistory() {
  var props = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

  (0, _invariant2.default)(_DOMUtils.canUseDOM, 'Hash history needs a DOM');

  var globalHistory = window.history;
  var canGoWithoutReload = (0, _DOMUtils.supportsGoWithoutReloadUsingHash)();

  var _props$getUserConfirm = props.getUserConfirmation,
      getUserConfirmation = _props$getUserConfirm === undefined ? _DOMUtils.getConfirmation : _props$getUserConfirm,
      _props$hashType = props.hashType,
      hashType = _props$hashType === undefined ? 'slash' : _props$hashType;

  var basename = props.basename ? (0, _PathUtils.stripTrailingSlash)((0, _PathUtils.addLeadingSlash)(props.basename)) : '';

  var _HashPathCoders$hashT = HashPathCoders[hashType],
      encodePath = _HashPathCoders$hashT.encodePath,
      decodePath = _HashPathCoders$hashT.decodePath;


  var getDOMLocation = function getDOMLocation() {
    var path = decodePath(getHashPath());

    if (basename) path = (0, _PathUtils.stripPrefix)(path, basename);

    return (0, _PathUtils.parsePath)(path);
  };

  var transitionManager = (0, _createTransitionManager2.default)();

  var setState = function setState(nextState) {
    _extends(history, nextState);

    history.length = globalHistory.length;

    transitionManager.notifyListeners(history.location, history.action);
  };

  var forceNextPop = false;
  var ignorePath = null;

  var handleHashChange = function handleHashChange() {
    var path = getHashPath();
    var encodedPath = encodePath(path);

    if (path !== encodedPath) {
      // Ensure we always have a properly-encoded hash.
      replaceHashPath(encodedPath);
    } else {
      var location = getDOMLocation();
      var prevLocation = history.location;

      if (!forceNextPop && (0, _LocationUtils.locationsAreEqual)(prevLocation, location)) return; // A hashchange doesn't always == location change.

      if (ignorePath === (0, _PathUtils.createPath)(location)) return; // Ignore this change; we already setState in push/replace.

      ignorePath = null;

      handlePop(location);
    }
  };

  var handlePop = function handlePop(location) {
    if (forceNextPop) {
      forceNextPop = false;
      setState();
    } else {
      var action = 'POP';

      transitionManager.confirmTransitionTo(location, action, getUserConfirmation, function (ok) {
        if (ok) {
          setState({ action: action, location: location });
        } else {
          revertPop(location);
        }
      });
    }
  };

  var revertPop = function revertPop(fromLocation) {
    var toLocation = history.location;

    // TODO: We could probably make this more reliable by
    // keeping a list of paths we've seen in sessionStorage.
    // Instead, we just default to 0 for paths we don't know.

    var toIndex = allPaths.lastIndexOf((0, _PathUtils.createPath)(toLocation));

    if (toIndex === -1) toIndex = 0;

    var fromIndex = allPaths.lastIndexOf((0, _PathUtils.createPath)(fromLocation));

    if (fromIndex === -1) fromIndex = 0;

    var delta = toIndex - fromIndex;

    if (delta) {
      forceNextPop = true;
      go(delta);
    }
  };

  // Ensure the hash is encoded properly before doing anything else.
  var path = getHashPath();
  var encodedPath = encodePath(path);

  if (path !== encodedPath) replaceHashPath(encodedPath);

  var initialLocation = getDOMLocation();
  var allPaths = [(0, _PathUtils.createPath)(initialLocation)];

  // Public interface

  var createHref = function createHref(location) {
    return '#' + encodePath(basename + (0, _PathUtils.createPath)(location));
  };

  var push = function push(path, state) {
    (0, _warning2.default)(state === undefined, 'Hash history cannot push state; it is ignored');

    var action = 'PUSH';
    var location = (0, _LocationUtils.createLocation)(path, undefined, undefined, history.location);

    transitionManager.confirmTransitionTo(location, action, getUserConfirmation, function (ok) {
      if (!ok) return;

      var path = (0, _PathUtils.createPath)(location);
      var encodedPath = encodePath(basename + path);
      var hashChanged = getHashPath() !== encodedPath;

      if (hashChanged) {
        // We cannot tell if a hashchange was caused by a PUSH, so we'd
        // rather setState here and ignore the hashchange. The caveat here
        // is that other hash histories in the page will consider it a POP.
        ignorePath = path;
        pushHashPath(encodedPath);

        var prevIndex = allPaths.lastIndexOf((0, _PathUtils.createPath)(history.location));
        var nextPaths = allPaths.slice(0, prevIndex === -1 ? 0 : prevIndex + 1);

        nextPaths.push(path);
        allPaths = nextPaths;

        setState({ action: action, location: location });
      } else {
        (0, _warning2.default)(false, 'Hash history cannot PUSH the same path; a new entry will not be added to the history stack');

        setState();
      }
    });
  };

  var replace = function replace(path, state) {
    (0, _warning2.default)(state === undefined, 'Hash history cannot replace state; it is ignored');

    var action = 'REPLACE';
    var location = (0, _LocationUtils.createLocation)(path, undefined, undefined, history.location);

    transitionManager.confirmTransitionTo(location, action, getUserConfirmation, function (ok) {
      if (!ok) return;

      var path = (0, _PathUtils.createPath)(location);
      var encodedPath = encodePath(basename + path);
      var hashChanged = getHashPath() !== encodedPath;

      if (hashChanged) {
        // We cannot tell if a hashchange was caused by a REPLACE, so we'd
        // rather setState here and ignore the hashchange. The caveat here
        // is that other hash histories in the page will consider it a POP.
        ignorePath = path;
        replaceHashPath(encodedPath);
      }

      var prevIndex = allPaths.indexOf((0, _PathUtils.createPath)(history.location));

      if (prevIndex !== -1) allPaths[prevIndex] = path;

      setState({ action: action, location: location });
    });
  };

  var go = function go(n) {
    (0, _warning2.default)(canGoWithoutReload, 'Hash history go(n) causes a full page reload in this browser');

    globalHistory.go(n);
  };

  var goBack = function goBack() {
    return go(-1);
  };

  var goForward = function goForward() {
    return go(1);
  };

  var listenerCount = 0;

  var checkDOMListeners = function checkDOMListeners(delta) {
    listenerCount += delta;

    if (listenerCount === 1) {
      (0, _DOMUtils.addEventListener)(window, HashChangeEvent, handleHashChange);
    } else if (listenerCount === 0) {
      (0, _DOMUtils.removeEventListener)(window, HashChangeEvent, handleHashChange);
    }
  };

  var isBlocked = false;

  var block = function block() {
    var prompt = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;

    var unblock = transitionManager.setPrompt(prompt);

    if (!isBlocked) {
      checkDOMListeners(1);
      isBlocked = true;
    }

    return function () {
      if (isBlocked) {
        isBlocked = false;
        checkDOMListeners(-1);
      }

      return unblock();
    };
  };

  var listen = function listen(listener) {
    var unlisten = transitionManager.appendListener(listener);
    checkDOMListeners(1);

    return function () {
      checkDOMListeners(-1);
      unlisten();
    };
  };

  var history = {
    length: globalHistory.length,
    action: 'POP',
    location: initialLocation,
    createHref: createHref,
    push: push,
    replace: replace,
    go: go,
    goBack: goBack,
    goForward: goForward,
    block: block,
    listen: listen
  };

  return history;
};

exports.default = createHashHistory;
},{"./DOMUtils":94,"./LocationUtils":95,"./PathUtils":96,"./createTransitionManager":100,"invariant":102,"warning":123}],99:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _warning = require('warning');

var _warning2 = _interopRequireDefault(_warning);

var _PathUtils = require('./PathUtils');

var _LocationUtils = require('./LocationUtils');

var _createTransitionManager = require('./createTransitionManager');

var _createTransitionManager2 = _interopRequireDefault(_createTransitionManager);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var clamp = function clamp(n, lowerBound, upperBound) {
  return Math.min(Math.max(n, lowerBound), upperBound);
};

/**
 * Creates a history object that stores locations in memory.
 */
var createMemoryHistory = function createMemoryHistory() {
  var props = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  var getUserConfirmation = props.getUserConfirmation,
      _props$initialEntries = props.initialEntries,
      initialEntries = _props$initialEntries === undefined ? ['/'] : _props$initialEntries,
      _props$initialIndex = props.initialIndex,
      initialIndex = _props$initialIndex === undefined ? 0 : _props$initialIndex,
      _props$keyLength = props.keyLength,
      keyLength = _props$keyLength === undefined ? 6 : _props$keyLength;


  var transitionManager = (0, _createTransitionManager2.default)();

  var setState = function setState(nextState) {
    _extends(history, nextState);

    history.length = history.entries.length;

    transitionManager.notifyListeners(history.location, history.action);
  };

  var createKey = function createKey() {
    return Math.random().toString(36).substr(2, keyLength);
  };

  var index = clamp(initialIndex, 0, initialEntries.length - 1);
  var entries = initialEntries.map(function (entry) {
    return typeof entry === 'string' ? (0, _LocationUtils.createLocation)(entry, undefined, createKey()) : (0, _LocationUtils.createLocation)(entry, undefined, entry.key || createKey());
  });

  // Public interface

  var createHref = _PathUtils.createPath;

  var push = function push(path, state) {
    (0, _warning2.default)(!((typeof path === 'undefined' ? 'undefined' : _typeof(path)) === 'object' && path.state !== undefined && state !== undefined), 'You should avoid providing a 2nd state argument to push when the 1st ' + 'argument is a location-like object that already has state; it is ignored');

    var action = 'PUSH';
    var location = (0, _LocationUtils.createLocation)(path, state, createKey(), history.location);

    transitionManager.confirmTransitionTo(location, action, getUserConfirmation, function (ok) {
      if (!ok) return;

      var prevIndex = history.index;
      var nextIndex = prevIndex + 1;

      var nextEntries = history.entries.slice(0);
      if (nextEntries.length > nextIndex) {
        nextEntries.splice(nextIndex, nextEntries.length - nextIndex, location);
      } else {
        nextEntries.push(location);
      }

      setState({
        action: action,
        location: location,
        index: nextIndex,
        entries: nextEntries
      });
    });
  };

  var replace = function replace(path, state) {
    (0, _warning2.default)(!((typeof path === 'undefined' ? 'undefined' : _typeof(path)) === 'object' && path.state !== undefined && state !== undefined), 'You should avoid providing a 2nd state argument to replace when the 1st ' + 'argument is a location-like object that already has state; it is ignored');

    var action = 'REPLACE';
    var location = (0, _LocationUtils.createLocation)(path, state, createKey(), history.location);

    transitionManager.confirmTransitionTo(location, action, getUserConfirmation, function (ok) {
      if (!ok) return;

      history.entries[history.index] = location;

      setState({ action: action, location: location });
    });
  };

  var go = function go(n) {
    var nextIndex = clamp(history.index + n, 0, history.entries.length - 1);

    var action = 'POP';
    var location = history.entries[nextIndex];

    transitionManager.confirmTransitionTo(location, action, getUserConfirmation, function (ok) {
      if (ok) {
        setState({
          action: action,
          location: location,
          index: nextIndex
        });
      } else {
        // Mimic the behavior of DOM histories by
        // causing a render after a cancelled POP.
        setState();
      }
    });
  };

  var goBack = function goBack() {
    return go(-1);
  };

  var goForward = function goForward() {
    return go(1);
  };

  var canGo = function canGo(n) {
    var nextIndex = history.index + n;
    return nextIndex >= 0 && nextIndex < history.entries.length;
  };

  var block = function block() {
    var prompt = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;
    return transitionManager.setPrompt(prompt);
  };

  var listen = function listen(listener) {
    return transitionManager.appendListener(listener);
  };

  var history = {
    length: entries.length,
    action: 'POP',
    location: entries[index],
    index: index,
    entries: entries,
    createHref: createHref,
    push: push,
    replace: replace,
    go: go,
    goBack: goBack,
    goForward: goForward,
    canGo: canGo,
    block: block,
    listen: listen
  };

  return history;
};

exports.default = createMemoryHistory;
},{"./LocationUtils":95,"./PathUtils":96,"./createTransitionManager":100,"warning":123}],100:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _warning = require('warning');

var _warning2 = _interopRequireDefault(_warning);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var createTransitionManager = function createTransitionManager() {
  var prompt = null;

  var setPrompt = function setPrompt(nextPrompt) {
    (0, _warning2.default)(prompt == null, 'A history supports only one prompt at a time');

    prompt = nextPrompt;

    return function () {
      if (prompt === nextPrompt) prompt = null;
    };
  };

  var confirmTransitionTo = function confirmTransitionTo(location, action, getUserConfirmation, callback) {
    // TODO: If another transition starts while we're still confirming
    // the previous one, we may end up in a weird state. Figure out the
    // best way to handle this.
    if (prompt != null) {
      var result = typeof prompt === 'function' ? prompt(location, action) : prompt;

      if (typeof result === 'string') {
        if (typeof getUserConfirmation === 'function') {
          getUserConfirmation(result, callback);
        } else {
          (0, _warning2.default)(false, 'A history needs a getUserConfirmation function in order to use a prompt message');

          callback(true);
        }
      } else {
        // Return false from a transition hook to cancel the transition.
        callback(result !== false);
      }
    } else {
      callback(true);
    }
  };

  var listeners = [];

  var appendListener = function appendListener(fn) {
    var isActive = true;

    var listener = function listener() {
      if (isActive) fn.apply(undefined, arguments);
    };

    listeners.push(listener);

    return function () {
      isActive = false;
      listeners = listeners.filter(function (item) {
        return item !== listener;
      });
    };
  };

  var notifyListeners = function notifyListeners() {
    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    listeners.forEach(function (listener) {
      return listener.apply(undefined, args);
    });
  };

  return {
    setPrompt: setPrompt,
    confirmTransitionTo: confirmTransitionTo,
    appendListener: appendListener,
    notifyListeners: notifyListeners
  };
};

exports.default = createTransitionManager;
},{"warning":123}],101:[function(require,module,exports){
'use strict';

exports.__esModule = true;
exports.createPath = exports.parsePath = exports.locationsAreEqual = exports.createLocation = exports.createMemoryHistory = exports.createHashHistory = exports.createBrowserHistory = undefined;

var _LocationUtils = require('./LocationUtils');

Object.defineProperty(exports, 'createLocation', {
  enumerable: true,
  get: function get() {
    return _LocationUtils.createLocation;
  }
});
Object.defineProperty(exports, 'locationsAreEqual', {
  enumerable: true,
  get: function get() {
    return _LocationUtils.locationsAreEqual;
  }
});

var _PathUtils = require('./PathUtils');

Object.defineProperty(exports, 'parsePath', {
  enumerable: true,
  get: function get() {
    return _PathUtils.parsePath;
  }
});
Object.defineProperty(exports, 'createPath', {
  enumerable: true,
  get: function get() {
    return _PathUtils.createPath;
  }
});

var _createBrowserHistory2 = require('./createBrowserHistory');

var _createBrowserHistory3 = _interopRequireDefault(_createBrowserHistory2);

var _createHashHistory2 = require('./createHashHistory');

var _createHashHistory3 = _interopRequireDefault(_createHashHistory2);

var _createMemoryHistory2 = require('./createMemoryHistory');

var _createMemoryHistory3 = _interopRequireDefault(_createMemoryHistory2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.createBrowserHistory = _createBrowserHistory3.default;
exports.createHashHistory = _createHashHistory3.default;
exports.createMemoryHistory = _createMemoryHistory3.default;
},{"./LocationUtils":95,"./PathUtils":96,"./createBrowserHistory":97,"./createHashHistory":98,"./createMemoryHistory":99}],102:[function(require,module,exports){
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

},{"_process":103}],103:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
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
    var timeout = runTimeout(cleanUpNextTick);
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
    runClearTimeout(timeout);
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
        runTimeout(drainQueue);
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
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],104:[function(require,module,exports){
'use strict';

var isAbsolute = function isAbsolute(pathname) {
  return pathname.charAt(0) === '/';
};

// About 1.5x faster than the two-arg version of Array#splice()
var spliceOne = function spliceOne(list, index) {
  for (var i = index, k = i + 1, n = list.length; k < n; i += 1, k += 1) {
    list[i] = list[k];
  }list.pop();
};

// This implementation is based heavily on node's url.parse
var resolvePathname = function resolvePathname(to) {
  var from = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';

  var toParts = to && to.split('/') || [];
  var fromParts = from && from.split('/') || [];

  var isToAbs = to && isAbsolute(to);
  var isFromAbs = from && isAbsolute(from);
  var mustEndAbs = isToAbs || isFromAbs;

  if (to && isAbsolute(to)) {
    // to is absolute
    fromParts = toParts;
  } else if (toParts.length) {
    // to is relative, drop the filename
    fromParts.pop();
    fromParts = fromParts.concat(toParts);
  }

  if (!fromParts.length) return '/';

  var hasTrailingSlash = void 0;
  if (fromParts.length) {
    var last = fromParts[fromParts.length - 1];
    hasTrailingSlash = last === '.' || last === '..' || last === '';
  } else {
    hasTrailingSlash = false;
  }

  var up = 0;
  for (var i = fromParts.length; i >= 0; i--) {
    var part = fromParts[i];

    if (part === '.') {
      spliceOne(fromParts, i);
    } else if (part === '..') {
      spliceOne(fromParts, i);
      up++;
    } else if (up) {
      spliceOne(fromParts, i);
      up--;
    }
  }

  if (!mustEndAbs) for (; up--; up) {
    fromParts.unshift('..');
  }if (mustEndAbs && fromParts[0] !== '' && (!fromParts[0] || !isAbsolute(fromParts[0]))) fromParts.unshift('');

  var result = fromParts.join('/');

  if (hasTrailingSlash && result.substr(-1) !== '/') result += '/';

  return result;
};

module.exports = resolvePathname;
},{}],105:[function(require,module,exports){
"use strict";
var selectorParser_1 = require('./selectorParser');
function classNameFromVNode(vNode) {
    var _a = selectorParser_1.selectorParser(vNode).className, cn = _a === void 0 ? '' : _a;
    if (!vNode.data) {
        return cn;
    }
    var _b = vNode.data, dataClass = _b.class, props = _b.props;
    if (dataClass) {
        var c = Object.keys(dataClass)
            .filter(function (cl) { return dataClass[cl]; });
        cn += " " + c.join(" ");
    }
    if (props && props.className) {
        cn += " " + props.className;
    }
    return cn && cn.trim();
}
exports.classNameFromVNode = classNameFromVNode;

},{"./selectorParser":106}],106:[function(require,module,exports){
"use strict";
function selectorParser(node) {
    if (!node.sel) {
        return {
            tagName: '',
            id: '',
            className: '',
        };
    }
    var sel = node.sel;
    var hashIdx = sel.indexOf('#');
    var dotIdx = sel.indexOf('.', hashIdx);
    var hash = hashIdx > 0 ? hashIdx : sel.length;
    var dot = dotIdx > 0 ? dotIdx : sel.length;
    var tagName = hashIdx !== -1 || dotIdx !== -1 ?
        sel.slice(0, Math.min(hash, dot)) :
        sel;
    var id = hash < dot ? sel.slice(hash + 1, dot) : void 0;
    var className = dotIdx > 0 ? sel.slice(dot + 1).replace(/\./g, ' ') : void 0;
    return {
        tagName: tagName,
        id: id,
        className: className,
    };
}
exports.selectorParser = selectorParser;

},{}],107:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var vnode_1 = require("./vnode");
var is = require("./is");
function addNS(data, children, sel) {
    data.ns = 'http://www.w3.org/2000/svg';
    if (sel !== 'foreignObject' && children !== undefined) {
        for (var i = 0; i < children.length; ++i) {
            var childData = children[i].data;
            if (childData !== undefined) {
                addNS(childData, children[i].children, children[i].sel);
            }
        }
    }
}
function h(sel, b, c) {
    var data = {}, children, text, i;
    if (c !== undefined) {
        data = b;
        if (is.array(c)) {
            children = c;
        }
        else if (is.primitive(c)) {
            text = c;
        }
        else if (c && c.sel) {
            children = [c];
        }
    }
    else if (b !== undefined) {
        if (is.array(b)) {
            children = b;
        }
        else if (is.primitive(b)) {
            text = b;
        }
        else if (b && b.sel) {
            children = [b];
        }
        else {
            data = b;
        }
    }
    if (is.array(children)) {
        for (i = 0; i < children.length; ++i) {
            if (is.primitive(children[i]))
                children[i] = vnode_1.vnode(undefined, undefined, undefined, children[i]);
        }
    }
    if (sel[0] === 's' && sel[1] === 'v' && sel[2] === 'g' &&
        (sel.length === 3 || sel[3] === '.' || sel[3] === '#')) {
        addNS(data, children, sel);
    }
    return vnode_1.vnode(sel, data, children, text, undefined);
}
exports.h = h;
;
exports.default = h;

},{"./is":109,"./vnode":118}],108:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function createElement(tagName) {
    return document.createElement(tagName);
}
function createElementNS(namespaceURI, qualifiedName) {
    return document.createElementNS(namespaceURI, qualifiedName);
}
function createTextNode(text) {
    return document.createTextNode(text);
}
function createComment(text) {
    return document.createComment(text);
}
function insertBefore(parentNode, newNode, referenceNode) {
    parentNode.insertBefore(newNode, referenceNode);
}
function removeChild(node, child) {
    node.removeChild(child);
}
function appendChild(node, child) {
    node.appendChild(child);
}
function parentNode(node) {
    return node.parentNode;
}
function nextSibling(node) {
    return node.nextSibling;
}
function tagName(elm) {
    return elm.tagName;
}
function setTextContent(node, text) {
    node.textContent = text;
}
function getTextContent(node) {
    return node.textContent;
}
function isElement(node) {
    return node.nodeType === 1;
}
function isText(node) {
    return node.nodeType === 3;
}
function isComment(node) {
    return node.nodeType === 8;
}
exports.htmlDomApi = {
    createElement: createElement,
    createElementNS: createElementNS,
    createTextNode: createTextNode,
    createComment: createComment,
    insertBefore: insertBefore,
    removeChild: removeChild,
    appendChild: appendChild,
    parentNode: parentNode,
    nextSibling: nextSibling,
    tagName: tagName,
    setTextContent: setTextContent,
    getTextContent: getTextContent,
    isElement: isElement,
    isText: isText,
    isComment: isComment,
};
exports.default = exports.htmlDomApi;

},{}],109:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.array = Array.isArray;
function primitive(s) {
    return typeof s === 'string' || typeof s === 'number';
}
exports.primitive = primitive;

},{}],110:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var booleanAttrs = ["allowfullscreen", "async", "autofocus", "autoplay", "checked", "compact", "controls", "declare",
    "default", "defaultchecked", "defaultmuted", "defaultselected", "defer", "disabled", "draggable",
    "enabled", "formnovalidate", "hidden", "indeterminate", "inert", "ismap", "itemscope", "loop", "multiple",
    "muted", "nohref", "noresize", "noshade", "novalidate", "nowrap", "open", "pauseonexit", "readonly",
    "required", "reversed", "scoped", "seamless", "selected", "sortable", "spellcheck", "translate",
    "truespeed", "typemustmatch", "visible"];
var xlinkNS = 'http://www.w3.org/1999/xlink';
var xmlNS = 'http://www.w3.org/XML/1998/namespace';
var colonChar = 58;
var xChar = 120;
var booleanAttrsDict = Object.create(null);
for (var i = 0, len = booleanAttrs.length; i < len; i++) {
    booleanAttrsDict[booleanAttrs[i]] = true;
}
function updateAttrs(oldVnode, vnode) {
    var key, elm = vnode.elm, oldAttrs = oldVnode.data.attrs, attrs = vnode.data.attrs;
    if (!oldAttrs && !attrs)
        return;
    if (oldAttrs === attrs)
        return;
    oldAttrs = oldAttrs || {};
    attrs = attrs || {};
    // update modified attributes, add new attributes
    for (key in attrs) {
        var cur = attrs[key];
        var old = oldAttrs[key];
        if (old !== cur) {
            if (booleanAttrsDict[key]) {
                if (cur) {
                    elm.setAttribute(key, "");
                }
                else {
                    elm.removeAttribute(key);
                }
            }
            else {
                if (key.charCodeAt(0) !== xChar) {
                    elm.setAttribute(key, cur);
                }
                else if (key.charCodeAt(3) === colonChar) {
                    // Assume xml namespace
                    elm.setAttributeNS(xmlNS, key, cur);
                }
                else if (key.charCodeAt(5) === colonChar) {
                    // Assume xlink namespace
                    elm.setAttributeNS(xlinkNS, key, cur);
                }
                else {
                    elm.setAttribute(key, cur);
                }
            }
        }
    }
    // remove removed attributes
    // use `in` operator since the previous `for` iteration uses it (.i.e. add even attributes with undefined value)
    // the other option is to remove all attributes with value == undefined
    for (key in oldAttrs) {
        if (!(key in attrs)) {
            elm.removeAttribute(key);
        }
    }
}
exports.attributesModule = { create: updateAttrs, update: updateAttrs };
exports.default = exports.attributesModule;

},{}],111:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function updateClass(oldVnode, vnode) {
    var cur, name, elm = vnode.elm, oldClass = oldVnode.data.class, klass = vnode.data.class;
    if (!oldClass && !klass)
        return;
    if (oldClass === klass)
        return;
    oldClass = oldClass || {};
    klass = klass || {};
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
exports.classModule = { create: updateClass, update: updateClass };
exports.default = exports.classModule;

},{}],112:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var CAPS_REGEX = /[A-Z]/g;
function updateDataset(oldVnode, vnode) {
    var elm = vnode.elm, oldDataset = oldVnode.data.dataset, dataset = vnode.data.dataset, key;
    if (!oldDataset && !dataset)
        return;
    if (oldDataset === dataset)
        return;
    oldDataset = oldDataset || {};
    dataset = dataset || {};
    var d = elm.dataset;
    for (key in oldDataset) {
        if (!dataset[key]) {
            if (d) {
                delete d[key];
            }
            else {
                elm.removeAttribute('data-' + key.replace(CAPS_REGEX, '-$&').toLowerCase());
            }
        }
    }
    for (key in dataset) {
        if (oldDataset[key] !== dataset[key]) {
            if (d) {
                d[key] = dataset[key];
            }
            else {
                elm.setAttribute('data-' + key.replace(CAPS_REGEX, '-$&').toLowerCase(), dataset[key]);
            }
        }
    }
}
exports.datasetModule = { create: updateDataset, update: updateDataset };
exports.default = exports.datasetModule;

},{}],113:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function updateProps(oldVnode, vnode) {
    var key, cur, old, elm = vnode.elm, oldProps = oldVnode.data.props, props = vnode.data.props;
    if (!oldProps && !props)
        return;
    if (oldProps === props)
        return;
    oldProps = oldProps || {};
    props = props || {};
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
exports.propsModule = { create: updateProps, update: updateProps };
exports.default = exports.propsModule;

},{}],114:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var raf = (typeof window !== 'undefined' && window.requestAnimationFrame) || setTimeout;
var nextFrame = function (fn) { raf(function () { raf(fn); }); };
function setNextFrame(obj, prop, val) {
    nextFrame(function () { obj[prop] = val; });
}
function updateStyle(oldVnode, vnode) {
    var cur, name, elm = vnode.elm, oldStyle = oldVnode.data.style, style = vnode.data.style;
    if (!oldStyle && !style)
        return;
    if (oldStyle === style)
        return;
    oldStyle = oldStyle || {};
    style = style || {};
    var oldHasDel = 'delayed' in oldStyle;
    for (name in oldStyle) {
        if (!style[name]) {
            if (name[0] === '-' && name[1] === '-') {
                elm.style.removeProperty(name);
            }
            else {
                elm.style[name] = '';
            }
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
        }
        else if (name !== 'remove' && cur !== oldStyle[name]) {
            if (name[0] === '-' && name[1] === '-') {
                elm.style.setProperty(name, cur);
            }
            else {
                elm.style[name] = cur;
            }
        }
    }
}
function applyDestroyStyle(vnode) {
    var style, name, elm = vnode.elm, s = vnode.data.style;
    if (!s || !(style = s.destroy))
        return;
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
    var name, elm = vnode.elm, i = 0, compStyle, style = s.remove, amount = 0, applied = [];
    for (name in style) {
        applied.push(name);
        elm.style[name] = style[name];
    }
    compStyle = getComputedStyle(elm);
    var props = compStyle['transition-property'].split(', ');
    for (; i < props.length; ++i) {
        if (applied.indexOf(props[i]) !== -1)
            amount++;
    }
    elm.addEventListener('transitionend', function (ev) {
        if (ev.target === elm)
            --amount;
        if (amount === 0)
            rm();
    });
}
exports.styleModule = {
    create: updateStyle,
    update: updateStyle,
    destroy: applyDestroyStyle,
    remove: applyRemoveStyle
};
exports.default = exports.styleModule;

},{}],115:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var vnode_1 = require("./vnode");
var is = require("./is");
var htmldomapi_1 = require("./htmldomapi");
function isUndef(s) { return s === undefined; }
function isDef(s) { return s !== undefined; }
var emptyNode = vnode_1.default('', {}, [], undefined, undefined);
function sameVnode(vnode1, vnode2) {
    return vnode1.key === vnode2.key && vnode1.sel === vnode2.sel;
}
function isVnode(vnode) {
    return vnode.sel !== undefined;
}
function createKeyToOldIdx(children, beginIdx, endIdx) {
    var i, map = {}, key, ch;
    for (i = beginIdx; i <= endIdx; ++i) {
        ch = children[i];
        if (ch != null) {
            key = ch.key;
            if (key !== undefined)
                map[key] = i;
        }
    }
    return map;
}
var hooks = ['create', 'update', 'remove', 'destroy', 'pre', 'post'];
var h_1 = require("./h");
exports.h = h_1.h;
var thunk_1 = require("./thunk");
exports.thunk = thunk_1.thunk;
function init(modules, domApi) {
    var i, j, cbs = {};
    var api = domApi !== undefined ? domApi : htmldomapi_1.default;
    for (i = 0; i < hooks.length; ++i) {
        cbs[hooks[i]] = [];
        for (j = 0; j < modules.length; ++j) {
            var hook = modules[j][hooks[i]];
            if (hook !== undefined) {
                cbs[hooks[i]].push(hook);
            }
        }
    }
    function emptyNodeAt(elm) {
        var id = elm.id ? '#' + elm.id : '';
        var c = elm.className ? '.' + elm.className.split(' ').join('.') : '';
        return vnode_1.default(api.tagName(elm).toLowerCase() + id + c, {}, [], undefined, elm);
    }
    function createRmCb(childElm, listeners) {
        return function rmCb() {
            if (--listeners === 0) {
                var parent_1 = api.parentNode(childElm);
                api.removeChild(parent_1, childElm);
            }
        };
    }
    function createElm(vnode, insertedVnodeQueue) {
        var i, data = vnode.data;
        if (data !== undefined) {
            if (isDef(i = data.hook) && isDef(i = i.init)) {
                i(vnode);
                data = vnode.data;
            }
        }
        var children = vnode.children, sel = vnode.sel;
        if (sel === '!') {
            if (isUndef(vnode.text)) {
                vnode.text = '';
            }
            vnode.elm = api.createComment(vnode.text);
        }
        else if (sel !== undefined) {
            // Parse selector
            var hashIdx = sel.indexOf('#');
            var dotIdx = sel.indexOf('.', hashIdx);
            var hash = hashIdx > 0 ? hashIdx : sel.length;
            var dot = dotIdx > 0 ? dotIdx : sel.length;
            var tag = hashIdx !== -1 || dotIdx !== -1 ? sel.slice(0, Math.min(hash, dot)) : sel;
            var elm = vnode.elm = isDef(data) && isDef(i = data.ns) ? api.createElementNS(i, tag)
                : api.createElement(tag);
            if (hash < dot)
                elm.setAttribute('id', sel.slice(hash + 1, dot));
            if (dotIdx > 0)
                elm.setAttribute('class', sel.slice(dot + 1).replace(/\./g, ' '));
            for (i = 0; i < cbs.create.length; ++i)
                cbs.create[i](emptyNode, vnode);
            if (is.array(children)) {
                for (i = 0; i < children.length; ++i) {
                    var ch = children[i];
                    if (ch != null) {
                        api.appendChild(elm, createElm(ch, insertedVnodeQueue));
                    }
                }
            }
            else if (is.primitive(vnode.text)) {
                api.appendChild(elm, api.createTextNode(vnode.text));
            }
            i = vnode.data.hook; // Reuse variable
            if (isDef(i)) {
                if (i.create)
                    i.create(emptyNode, vnode);
                if (i.insert)
                    insertedVnodeQueue.push(vnode);
            }
        }
        else {
            vnode.elm = api.createTextNode(vnode.text);
        }
        return vnode.elm;
    }
    function addVnodes(parentElm, before, vnodes, startIdx, endIdx, insertedVnodeQueue) {
        for (; startIdx <= endIdx; ++startIdx) {
            var ch = vnodes[startIdx];
            if (ch != null) {
                api.insertBefore(parentElm, createElm(ch, insertedVnodeQueue), before);
            }
        }
    }
    function invokeDestroyHook(vnode) {
        var i, j, data = vnode.data;
        if (data !== undefined) {
            if (isDef(i = data.hook) && isDef(i = i.destroy))
                i(vnode);
            for (i = 0; i < cbs.destroy.length; ++i)
                cbs.destroy[i](vnode);
            if (vnode.children !== undefined) {
                for (j = 0; j < vnode.children.length; ++j) {
                    i = vnode.children[j];
                    if (i != null && typeof i !== "string") {
                        invokeDestroyHook(i);
                    }
                }
            }
        }
    }
    function removeVnodes(parentElm, vnodes, startIdx, endIdx) {
        for (; startIdx <= endIdx; ++startIdx) {
            var i_1 = void 0, listeners = void 0, rm = void 0, ch = vnodes[startIdx];
            if (ch != null) {
                if (isDef(ch.sel)) {
                    invokeDestroyHook(ch);
                    listeners = cbs.remove.length + 1;
                    rm = createRmCb(ch.elm, listeners);
                    for (i_1 = 0; i_1 < cbs.remove.length; ++i_1)
                        cbs.remove[i_1](ch, rm);
                    if (isDef(i_1 = ch.data) && isDef(i_1 = i_1.hook) && isDef(i_1 = i_1.remove)) {
                        i_1(ch, rm);
                    }
                    else {
                        rm();
                    }
                }
                else {
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
        var oldKeyToIdx;
        var idxInOld;
        var elmToMove;
        var before;
        while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
            if (oldStartVnode == null) {
                oldStartVnode = oldCh[++oldStartIdx]; // Vnode might have been moved left
            }
            else if (oldEndVnode == null) {
                oldEndVnode = oldCh[--oldEndIdx];
            }
            else if (newStartVnode == null) {
                newStartVnode = newCh[++newStartIdx];
            }
            else if (newEndVnode == null) {
                newEndVnode = newCh[--newEndIdx];
            }
            else if (sameVnode(oldStartVnode, newStartVnode)) {
                patchVnode(oldStartVnode, newStartVnode, insertedVnodeQueue);
                oldStartVnode = oldCh[++oldStartIdx];
                newStartVnode = newCh[++newStartIdx];
            }
            else if (sameVnode(oldEndVnode, newEndVnode)) {
                patchVnode(oldEndVnode, newEndVnode, insertedVnodeQueue);
                oldEndVnode = oldCh[--oldEndIdx];
                newEndVnode = newCh[--newEndIdx];
            }
            else if (sameVnode(oldStartVnode, newEndVnode)) {
                patchVnode(oldStartVnode, newEndVnode, insertedVnodeQueue);
                api.insertBefore(parentElm, oldStartVnode.elm, api.nextSibling(oldEndVnode.elm));
                oldStartVnode = oldCh[++oldStartIdx];
                newEndVnode = newCh[--newEndIdx];
            }
            else if (sameVnode(oldEndVnode, newStartVnode)) {
                patchVnode(oldEndVnode, newStartVnode, insertedVnodeQueue);
                api.insertBefore(parentElm, oldEndVnode.elm, oldStartVnode.elm);
                oldEndVnode = oldCh[--oldEndIdx];
                newStartVnode = newCh[++newStartIdx];
            }
            else {
                if (oldKeyToIdx === undefined) {
                    oldKeyToIdx = createKeyToOldIdx(oldCh, oldStartIdx, oldEndIdx);
                }
                idxInOld = oldKeyToIdx[newStartVnode.key];
                if (isUndef(idxInOld)) {
                    api.insertBefore(parentElm, createElm(newStartVnode, insertedVnodeQueue), oldStartVnode.elm);
                    newStartVnode = newCh[++newStartIdx];
                }
                else {
                    elmToMove = oldCh[idxInOld];
                    if (elmToMove.sel !== newStartVnode.sel) {
                        api.insertBefore(parentElm, createElm(newStartVnode, insertedVnodeQueue), oldStartVnode.elm);
                    }
                    else {
                        patchVnode(elmToMove, newStartVnode, insertedVnodeQueue);
                        oldCh[idxInOld] = undefined;
                        api.insertBefore(parentElm, elmToMove.elm, oldStartVnode.elm);
                    }
                    newStartVnode = newCh[++newStartIdx];
                }
            }
        }
        if (oldStartIdx > oldEndIdx) {
            before = newCh[newEndIdx + 1] == null ? null : newCh[newEndIdx + 1].elm;
            addVnodes(parentElm, before, newCh, newStartIdx, newEndIdx, insertedVnodeQueue);
        }
        else if (newStartIdx > newEndIdx) {
            removeVnodes(parentElm, oldCh, oldStartIdx, oldEndIdx);
        }
    }
    function patchVnode(oldVnode, vnode, insertedVnodeQueue) {
        var i, hook;
        if (isDef(i = vnode.data) && isDef(hook = i.hook) && isDef(i = hook.prepatch)) {
            i(oldVnode, vnode);
        }
        var elm = vnode.elm = oldVnode.elm;
        var oldCh = oldVnode.children;
        var ch = vnode.children;
        if (oldVnode === vnode)
            return;
        if (vnode.data !== undefined) {
            for (i = 0; i < cbs.update.length; ++i)
                cbs.update[i](oldVnode, vnode);
            i = vnode.data.hook;
            if (isDef(i) && isDef(i = i.update))
                i(oldVnode, vnode);
        }
        if (isUndef(vnode.text)) {
            if (isDef(oldCh) && isDef(ch)) {
                if (oldCh !== ch)
                    updateChildren(elm, oldCh, ch, insertedVnodeQueue);
            }
            else if (isDef(ch)) {
                if (isDef(oldVnode.text))
                    api.setTextContent(elm, '');
                addVnodes(elm, null, ch, 0, ch.length - 1, insertedVnodeQueue);
            }
            else if (isDef(oldCh)) {
                removeVnodes(elm, oldCh, 0, oldCh.length - 1);
            }
            else if (isDef(oldVnode.text)) {
                api.setTextContent(elm, '');
            }
        }
        else if (oldVnode.text !== vnode.text) {
            api.setTextContent(elm, vnode.text);
        }
        if (isDef(hook) && isDef(i = hook.postpatch)) {
            i(oldVnode, vnode);
        }
    }
    return function patch(oldVnode, vnode) {
        var i, elm, parent;
        var insertedVnodeQueue = [];
        for (i = 0; i < cbs.pre.length; ++i)
            cbs.pre[i]();
        if (!isVnode(oldVnode)) {
            oldVnode = emptyNodeAt(oldVnode);
        }
        if (sameVnode(oldVnode, vnode)) {
            patchVnode(oldVnode, vnode, insertedVnodeQueue);
        }
        else {
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
        for (i = 0; i < cbs.post.length; ++i)
            cbs.post[i]();
        return vnode;
    };
}
exports.init = init;

},{"./h":107,"./htmldomapi":108,"./is":109,"./thunk":116,"./vnode":118}],116:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var h_1 = require("./h");
function copyToThunk(vnode, thunk) {
    thunk.elm = vnode.elm;
    vnode.data.fn = thunk.data.fn;
    vnode.data.args = thunk.data.args;
    thunk.data = vnode.data;
    thunk.children = vnode.children;
    thunk.text = vnode.text;
    thunk.elm = vnode.elm;
}
function init(thunk) {
    var cur = thunk.data;
    var vnode = cur.fn.apply(undefined, cur.args);
    copyToThunk(vnode, thunk);
}
function prepatch(oldVnode, thunk) {
    var i, old = oldVnode.data, cur = thunk.data;
    var oldArgs = old.args, args = cur.args;
    if (old.fn !== cur.fn || oldArgs.length !== args.length) {
        copyToThunk(cur.fn.apply(undefined, args), thunk);
        return;
    }
    for (i = 0; i < args.length; ++i) {
        if (oldArgs[i] !== args[i]) {
            copyToThunk(cur.fn.apply(undefined, args), thunk);
            return;
        }
    }
    copyToThunk(oldVnode, thunk);
}
exports.thunk = function thunk(sel, key, fn, args) {
    if (args === undefined) {
        args = fn;
        fn = key;
        key = undefined;
    }
    return h_1.h(sel, {
        key: key,
        hook: { init: init, prepatch: prepatch },
        fn: fn,
        args: args
    });
};
exports.default = exports.thunk;

},{"./h":107}],117:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var vnode_1 = require("./vnode");
var htmldomapi_1 = require("./htmldomapi");
function toVNode(node, domApi) {
    var api = domApi !== undefined ? domApi : htmldomapi_1.default;
    var text;
    if (api.isElement(node)) {
        var id = node.id ? '#' + node.id : '';
        var cn = node.getAttribute('class');
        var c = cn ? '.' + cn.split(' ').join('.') : '';
        var sel = api.tagName(node).toLowerCase() + id + c;
        var attrs = {};
        var children = [];
        var name_1;
        var i = void 0, n = void 0;
        var elmAttrs = node.attributes;
        var elmChildren = node.childNodes;
        for (i = 0, n = elmAttrs.length; i < n; i++) {
            name_1 = elmAttrs[i].nodeName;
            if (name_1 !== 'id' && name_1 !== 'class') {
                attrs[name_1] = elmAttrs[i].nodeValue;
            }
        }
        for (i = 0, n = elmChildren.length; i < n; i++) {
            children.push(toVNode(elmChildren[i]));
        }
        return vnode_1.default(sel, { attrs: attrs }, children, undefined, node);
    }
    else if (api.isText(node)) {
        text = api.getTextContent(node);
        return vnode_1.default(undefined, undefined, undefined, text, node);
    }
    else if (api.isComment(node)) {
        text = api.getTextContent(node);
        return vnode_1.default('!', {}, [], text, node);
    }
    else {
        return vnode_1.default('', {}, [], undefined, undefined);
    }
}
exports.toVNode = toVNode;
exports.default = toVNode;

},{"./htmldomapi":108,"./vnode":118}],118:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function vnode(sel, data, children, text, elm) {
    var key = data === undefined ? undefined : data.key;
    return { sel: sel, data: data, children: children,
        text: text, elm: elm, key: key };
}
exports.vnode = vnode;
exports.default = vnode;

},{}],119:[function(require,module,exports){
module.exports = require('./lib/index');

},{"./lib/index":120}],120:[function(require,module,exports){
(function (global){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _ponyfill = require('./ponyfill');

var _ponyfill2 = _interopRequireDefault(_ponyfill);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var root; /* global window */


if (typeof self !== 'undefined') {
  root = self;
} else if (typeof window !== 'undefined') {
  root = window;
} else if (typeof global !== 'undefined') {
  root = global;
} else if (typeof module !== 'undefined') {
  root = module;
} else {
  root = Function('return this')();
}

var result = (0, _ponyfill2['default'])(root);
exports['default'] = result;
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./ponyfill":121}],121:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports['default'] = symbolObservablePonyfill;
function symbolObservablePonyfill(root) {
	var result;
	var _Symbol = root.Symbol;

	if (typeof _Symbol === 'function') {
		if (_Symbol.observable) {
			result = _Symbol.observable;
		} else {
			result = _Symbol('observable');
			_Symbol.observable = result;
		}
	} else {
		result = '@@observable';
	}

	return result;
};
},{}],122:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var valueEqual = function valueEqual(a, b) {
  if (a === b) return true;

  if (a == null || b == null) return false;

  if (Array.isArray(a)) return Array.isArray(b) && a.length === b.length && a.every(function (item, index) {
    return valueEqual(item, b[index]);
  });

  var aType = typeof a === 'undefined' ? 'undefined' : _typeof(a);
  var bType = typeof b === 'undefined' ? 'undefined' : _typeof(b);

  if (aType !== bType) return false;

  if (aType === 'object') {
    var aValue = a.valueOf();
    var bValue = b.valueOf();

    if (aValue !== a || bValue !== b) return valueEqual(aValue, bValue);

    var aKeys = Object.keys(a);
    var bKeys = Object.keys(b);

    if (aKeys.length !== bKeys.length) return false;

    return aKeys.every(function (key) {
      return valueEqual(a[key], b[key]);
    });
  }

  return false;
};

exports.default = valueEqual;
},{}],123:[function(require,module,exports){
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

},{"_process":103}],124:[function(require,module,exports){
"use strict";
var index_1 = require("../index");
var empty = {};
var DropRepeatsOperator = (function () {
    function DropRepeatsOperator(ins, fn) {
        this.ins = ins;
        this.fn = fn;
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
        if (v !== empty && this.isEq(t, v))
            return;
        this.v = t;
        u._n(t);
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
/**
 * Drops consecutive duplicate values in a stream.
 *
 * Marble diagram:
 *
 * ```text
 * --1--2--1--1--1--2--3--4--3--3|
 *     dropRepeats
 * --1--2--1--------2--3--4--3---|
 * ```
 *
 * Example:
 *
 * ```js
 * import dropRepeats from 'xstream/extra/dropRepeats'
 *
 * const stream = xs.of(1, 2, 1, 1, 1, 2, 3, 4, 3, 3)
 *   .compose(dropRepeats())
 *
 * stream.addListener({
 *   next: i => console.log(i),
 *   error: err => console.error(err),
 *   complete: () => console.log('completed')
 * })
 * ```
 *
 * ```text
 * > 1
 * > 2
 * > 1
 * > 2
 * > 3
 * > 4
 * > 3
 * > completed
 * ```
 *
 * Example with a custom isEqual function:
 *
 * ```js
 * import dropRepeats from 'xstream/extra/dropRepeats'
 *
 * const stream = xs.of('a', 'b', 'a', 'A', 'B', 'b')
 *   .compose(dropRepeats((x, y) => x.toLowerCase() === y.toLowerCase()))
 *
 * stream.addListener({
 *   next: i => console.log(i),
 *   error: err => console.error(err),
 *   complete: () => console.log('completed')
 * })
 * ```
 *
 * ```text
 * > a
 * > b
 * > a
 * > B
 * > completed
 * ```
 *
 * @param {Function} isEqual An optional function of type
 * `(x: T, y: T) => boolean` that takes an event from the input stream and
 * checks if it is equal to previous event, by returning a boolean.
 * @return {Stream}
 */
function dropRepeats(isEqual) {
    if (isEqual === void 0) { isEqual = void 0; }
    return function dropRepeatsOperator(ins) {
        return new index_1.Stream(new DropRepeatsOperator(ins, isEqual));
    };
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = dropRepeats;

},{"../index":125}],125:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var symbol_observable_1 = require("symbol-observable");
var NO = {};
exports.NO = NO;
function noop() { }
function cp(a) {
    var l = a.length;
    var b = Array(l);
    for (var i = 0; i < l; ++i)
        b[i] = a[i];
    return b;
}
function and(f1, f2) {
    return function andFn(t) {
        return f1(t) && f2(t);
    };
}
function _try(c, t, u) {
    try {
        return c.f(t);
    }
    catch (e) {
        u._e(e);
        return NO;
    }
}
var NO_IL = {
    _n: noop,
    _e: noop,
    _c: noop,
};
exports.NO_IL = NO_IL;
// mutates the input
function internalizeProducer(producer) {
    producer._start = function _start(il) {
        il.next = il._n;
        il.error = il._e;
        il.complete = il._c;
        this.start(il);
    };
    producer._stop = producer.stop;
}
var StreamSub = (function () {
    function StreamSub(_stream, _listener) {
        this._stream = _stream;
        this._listener = _listener;
    }
    StreamSub.prototype.unsubscribe = function () {
        this._stream.removeListener(this._listener);
    };
    return StreamSub;
}());
var Observer = (function () {
    function Observer(_listener) {
        this._listener = _listener;
    }
    Observer.prototype.next = function (value) {
        this._listener._n(value);
    };
    Observer.prototype.error = function (err) {
        this._listener._e(err);
    };
    Observer.prototype.complete = function () {
        this._listener._c();
    };
    return Observer;
}());
var FromObservable = (function () {
    function FromObservable(observable) {
        this.type = 'fromObservable';
        this.ins = observable;
        this.active = false;
    }
    FromObservable.prototype._start = function (out) {
        this.out = out;
        this.active = true;
        this._sub = this.ins.subscribe(new Observer(out));
        if (!this.active)
            this._sub.unsubscribe();
    };
    FromObservable.prototype._stop = function () {
        if (this._sub)
            this._sub.unsubscribe();
        this.active = false;
    };
    return FromObservable;
}());
var Merge = (function () {
    function Merge(insArr) {
        this.type = 'merge';
        this.insArr = insArr;
        this.out = NO;
        this.ac = 0;
    }
    Merge.prototype._start = function (out) {
        this.out = out;
        var s = this.insArr;
        var L = s.length;
        this.ac = L;
        for (var i = 0; i < L; i++)
            s[i]._add(this);
    };
    Merge.prototype._stop = function () {
        var s = this.insArr;
        var L = s.length;
        for (var i = 0; i < L; i++)
            s[i]._remove(this);
        this.out = NO;
    };
    Merge.prototype._n = function (t) {
        var u = this.out;
        if (u === NO)
            return;
        u._n(t);
    };
    Merge.prototype._e = function (err) {
        var u = this.out;
        if (u === NO)
            return;
        u._e(err);
    };
    Merge.prototype._c = function () {
        if (--this.ac <= 0) {
            var u = this.out;
            if (u === NO)
                return;
            u._c();
        }
    };
    return Merge;
}());
var CombineListener = (function () {
    function CombineListener(i, out, p) {
        this.i = i;
        this.out = out;
        this.p = p;
        p.ils.push(this);
    }
    CombineListener.prototype._n = function (t) {
        var p = this.p, out = this.out;
        if (out === NO)
            return;
        if (p.up(t, this.i)) {
            var a = p.vals;
            var l = a.length;
            var b = Array(l);
            for (var i = 0; i < l; ++i)
                b[i] = a[i];
            out._n(b);
        }
    };
    CombineListener.prototype._e = function (err) {
        var out = this.out;
        if (out === NO)
            return;
        out._e(err);
    };
    CombineListener.prototype._c = function () {
        var p = this.p;
        if (p.out === NO)
            return;
        if (--p.Nc === 0)
            p.out._c();
    };
    return CombineListener;
}());
var Combine = (function () {
    function Combine(insArr) {
        this.type = 'combine';
        this.insArr = insArr;
        this.out = NO;
        this.ils = [];
        this.Nc = this.Nn = 0;
        this.vals = [];
    }
    Combine.prototype.up = function (t, i) {
        var v = this.vals[i];
        var Nn = !this.Nn ? 0 : v === NO ? --this.Nn : this.Nn;
        this.vals[i] = t;
        return Nn === 0;
    };
    Combine.prototype._start = function (out) {
        this.out = out;
        var s = this.insArr;
        var n = this.Nc = this.Nn = s.length;
        var vals = this.vals = new Array(n);
        if (n === 0) {
            out._n([]);
            out._c();
        }
        else {
            for (var i = 0; i < n; i++) {
                vals[i] = NO;
                s[i]._add(new CombineListener(i, out, this));
            }
        }
    };
    Combine.prototype._stop = function () {
        var s = this.insArr;
        var n = s.length;
        var ils = this.ils;
        for (var i = 0; i < n; i++)
            s[i]._remove(ils[i]);
        this.out = NO;
        this.ils = [];
        this.vals = [];
    };
    return Combine;
}());
var FromArray = (function () {
    function FromArray(a) {
        this.type = 'fromArray';
        this.a = a;
    }
    FromArray.prototype._start = function (out) {
        var a = this.a;
        for (var i = 0, n = a.length; i < n; i++)
            out._n(a[i]);
        out._c();
    };
    FromArray.prototype._stop = function () {
    };
    return FromArray;
}());
var FromPromise = (function () {
    function FromPromise(p) {
        this.type = 'fromPromise';
        this.on = false;
        this.p = p;
    }
    FromPromise.prototype._start = function (out) {
        var prod = this;
        this.on = true;
        this.p.then(function (v) {
            if (prod.on) {
                out._n(v);
                out._c();
            }
        }, function (e) {
            out._e(e);
        }).then(noop, function (err) {
            setTimeout(function () { throw err; });
        });
    };
    FromPromise.prototype._stop = function () {
        this.on = false;
    };
    return FromPromise;
}());
var Periodic = (function () {
    function Periodic(period) {
        this.type = 'periodic';
        this.period = period;
        this.intervalID = -1;
        this.i = 0;
    }
    Periodic.prototype._start = function (out) {
        var self = this;
        function intervalHandler() { out._n(self.i++); }
        this.intervalID = setInterval(intervalHandler, this.period);
    };
    Periodic.prototype._stop = function () {
        if (this.intervalID !== -1)
            clearInterval(this.intervalID);
        this.intervalID = -1;
        this.i = 0;
    };
    return Periodic;
}());
var Debug = (function () {
    function Debug(ins, arg) {
        this.type = 'debug';
        this.ins = ins;
        this.out = NO;
        this.s = noop;
        this.l = '';
        if (typeof arg === 'string')
            this.l = arg;
        else if (typeof arg === 'function')
            this.s = arg;
    }
    Debug.prototype._start = function (out) {
        this.out = out;
        this.ins._add(this);
    };
    Debug.prototype._stop = function () {
        this.ins._remove(this);
        this.out = NO;
    };
    Debug.prototype._n = function (t) {
        var u = this.out;
        if (u === NO)
            return;
        var s = this.s, l = this.l;
        if (s !== noop) {
            try {
                s(t);
            }
            catch (e) {
                u._e(e);
            }
        }
        else if (l)
            console.log(l + ':', t);
        else
            console.log(t);
        u._n(t);
    };
    Debug.prototype._e = function (err) {
        var u = this.out;
        if (u === NO)
            return;
        u._e(err);
    };
    Debug.prototype._c = function () {
        var u = this.out;
        if (u === NO)
            return;
        u._c();
    };
    return Debug;
}());
var Drop = (function () {
    function Drop(max, ins) {
        this.type = 'drop';
        this.ins = ins;
        this.out = NO;
        this.max = max;
        this.dropped = 0;
    }
    Drop.prototype._start = function (out) {
        this.out = out;
        this.dropped = 0;
        this.ins._add(this);
    };
    Drop.prototype._stop = function () {
        this.ins._remove(this);
        this.out = NO;
    };
    Drop.prototype._n = function (t) {
        var u = this.out;
        if (u === NO)
            return;
        if (this.dropped++ >= this.max)
            u._n(t);
    };
    Drop.prototype._e = function (err) {
        var u = this.out;
        if (u === NO)
            return;
        u._e(err);
    };
    Drop.prototype._c = function () {
        var u = this.out;
        if (u === NO)
            return;
        u._c();
    };
    return Drop;
}());
var EndWhenListener = (function () {
    function EndWhenListener(out, op) {
        this.out = out;
        this.op = op;
    }
    EndWhenListener.prototype._n = function () {
        this.op.end();
    };
    EndWhenListener.prototype._e = function (err) {
        this.out._e(err);
    };
    EndWhenListener.prototype._c = function () {
        this.op.end();
    };
    return EndWhenListener;
}());
var EndWhen = (function () {
    function EndWhen(o, ins) {
        this.type = 'endWhen';
        this.ins = ins;
        this.out = NO;
        this.o = o;
        this.oil = NO_IL;
    }
    EndWhen.prototype._start = function (out) {
        this.out = out;
        this.o._add(this.oil = new EndWhenListener(out, this));
        this.ins._add(this);
    };
    EndWhen.prototype._stop = function () {
        this.ins._remove(this);
        this.o._remove(this.oil);
        this.out = NO;
        this.oil = NO_IL;
    };
    EndWhen.prototype.end = function () {
        var u = this.out;
        if (u === NO)
            return;
        u._c();
    };
    EndWhen.prototype._n = function (t) {
        var u = this.out;
        if (u === NO)
            return;
        u._n(t);
    };
    EndWhen.prototype._e = function (err) {
        var u = this.out;
        if (u === NO)
            return;
        u._e(err);
    };
    EndWhen.prototype._c = function () {
        this.end();
    };
    return EndWhen;
}());
var Filter = (function () {
    function Filter(passes, ins) {
        this.type = 'filter';
        this.ins = ins;
        this.out = NO;
        this.f = passes;
    }
    Filter.prototype._start = function (out) {
        this.out = out;
        this.ins._add(this);
    };
    Filter.prototype._stop = function () {
        this.ins._remove(this);
        this.out = NO;
    };
    Filter.prototype._n = function (t) {
        var u = this.out;
        if (u === NO)
            return;
        var r = _try(this, t, u);
        if (r === NO || !r)
            return;
        u._n(t);
    };
    Filter.prototype._e = function (err) {
        var u = this.out;
        if (u === NO)
            return;
        u._e(err);
    };
    Filter.prototype._c = function () {
        var u = this.out;
        if (u === NO)
            return;
        u._c();
    };
    return Filter;
}());
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
        this.op.inner = NO;
        this.op.less();
    };
    return FlattenListener;
}());
var Flatten = (function () {
    function Flatten(ins) {
        this.type = 'flatten';
        this.ins = ins;
        this.out = NO;
        this.open = true;
        this.inner = NO;
        this.il = NO_IL;
    }
    Flatten.prototype._start = function (out) {
        this.out = out;
        this.open = true;
        this.inner = NO;
        this.il = NO_IL;
        this.ins._add(this);
    };
    Flatten.prototype._stop = function () {
        this.ins._remove(this);
        if (this.inner !== NO)
            this.inner._remove(this.il);
        this.out = NO;
        this.open = true;
        this.inner = NO;
        this.il = NO_IL;
    };
    Flatten.prototype.less = function () {
        var u = this.out;
        if (u === NO)
            return;
        if (!this.open && this.inner === NO)
            u._c();
    };
    Flatten.prototype._n = function (s) {
        var u = this.out;
        if (u === NO)
            return;
        var _a = this, inner = _a.inner, il = _a.il;
        if (inner !== NO && il !== NO_IL)
            inner._remove(il);
        (this.inner = s)._add(this.il = new FlattenListener(u, this));
    };
    Flatten.prototype._e = function (err) {
        var u = this.out;
        if (u === NO)
            return;
        u._e(err);
    };
    Flatten.prototype._c = function () {
        this.open = false;
        this.less();
    };
    return Flatten;
}());
var Fold = (function () {
    function Fold(f, seed, ins) {
        var _this = this;
        this.type = 'fold';
        this.ins = ins;
        this.out = NO;
        this.f = function (t) { return f(_this.acc, t); };
        this.acc = this.seed = seed;
    }
    Fold.prototype._start = function (out) {
        this.out = out;
        this.acc = this.seed;
        out._n(this.acc);
        this.ins._add(this);
    };
    Fold.prototype._stop = function () {
        this.ins._remove(this);
        this.out = NO;
        this.acc = this.seed;
    };
    Fold.prototype._n = function (t) {
        var u = this.out;
        if (u === NO)
            return;
        var r = _try(this, t, u);
        if (r === NO)
            return;
        u._n(this.acc = r);
    };
    Fold.prototype._e = function (err) {
        var u = this.out;
        if (u === NO)
            return;
        u._e(err);
    };
    Fold.prototype._c = function () {
        var u = this.out;
        if (u === NO)
            return;
        u._c();
    };
    return Fold;
}());
var Last = (function () {
    function Last(ins) {
        this.type = 'last';
        this.ins = ins;
        this.out = NO;
        this.has = false;
        this.val = NO;
    }
    Last.prototype._start = function (out) {
        this.out = out;
        this.has = false;
        this.ins._add(this);
    };
    Last.prototype._stop = function () {
        this.ins._remove(this);
        this.out = NO;
        this.val = NO;
    };
    Last.prototype._n = function (t) {
        this.has = true;
        this.val = t;
    };
    Last.prototype._e = function (err) {
        var u = this.out;
        if (u === NO)
            return;
        u._e(err);
    };
    Last.prototype._c = function () {
        var u = this.out;
        if (u === NO)
            return;
        if (this.has) {
            u._n(this.val);
            u._c();
        }
        else
            u._e(new Error('last() failed because input stream completed'));
    };
    return Last;
}());
var MapOp = (function () {
    function MapOp(project, ins) {
        this.type = 'map';
        this.ins = ins;
        this.out = NO;
        this.f = project;
    }
    MapOp.prototype._start = function (out) {
        this.out = out;
        this.ins._add(this);
    };
    MapOp.prototype._stop = function () {
        this.ins._remove(this);
        this.out = NO;
    };
    MapOp.prototype._n = function (t) {
        var u = this.out;
        if (u === NO)
            return;
        var r = _try(this, t, u);
        if (r === NO)
            return;
        u._n(r);
    };
    MapOp.prototype._e = function (err) {
        var u = this.out;
        if (u === NO)
            return;
        u._e(err);
    };
    MapOp.prototype._c = function () {
        var u = this.out;
        if (u === NO)
            return;
        u._c();
    };
    return MapOp;
}());
var Remember = (function () {
    function Remember(ins) {
        this.type = 'remember';
        this.ins = ins;
        this.out = NO;
    }
    Remember.prototype._start = function (out) {
        this.out = out;
        this.ins._add(out);
    };
    Remember.prototype._stop = function () {
        this.ins._remove(this.out);
        this.out = NO;
    };
    return Remember;
}());
var ReplaceError = (function () {
    function ReplaceError(replacer, ins) {
        this.type = 'replaceError';
        this.ins = ins;
        this.out = NO;
        this.f = replacer;
    }
    ReplaceError.prototype._start = function (out) {
        this.out = out;
        this.ins._add(this);
    };
    ReplaceError.prototype._stop = function () {
        this.ins._remove(this);
        this.out = NO;
    };
    ReplaceError.prototype._n = function (t) {
        var u = this.out;
        if (u === NO)
            return;
        u._n(t);
    };
    ReplaceError.prototype._e = function (err) {
        var u = this.out;
        if (u === NO)
            return;
        try {
            this.ins._remove(this);
            (this.ins = this.f(err))._add(this);
        }
        catch (e) {
            u._e(e);
        }
    };
    ReplaceError.prototype._c = function () {
        var u = this.out;
        if (u === NO)
            return;
        u._c();
    };
    return ReplaceError;
}());
var StartWith = (function () {
    function StartWith(ins, val) {
        this.type = 'startWith';
        this.ins = ins;
        this.out = NO;
        this.val = val;
    }
    StartWith.prototype._start = function (out) {
        this.out = out;
        this.out._n(this.val);
        this.ins._add(out);
    };
    StartWith.prototype._stop = function () {
        this.ins._remove(this.out);
        this.out = NO;
    };
    return StartWith;
}());
var Take = (function () {
    function Take(max, ins) {
        this.type = 'take';
        this.ins = ins;
        this.out = NO;
        this.max = max;
        this.taken = 0;
    }
    Take.prototype._start = function (out) {
        this.out = out;
        this.taken = 0;
        if (this.max <= 0)
            out._c();
        else
            this.ins._add(this);
    };
    Take.prototype._stop = function () {
        this.ins._remove(this);
        this.out = NO;
    };
    Take.prototype._n = function (t) {
        var u = this.out;
        if (u === NO)
            return;
        var m = ++this.taken;
        if (m < this.max)
            u._n(t);
        else if (m === this.max) {
            u._n(t);
            u._c();
        }
    };
    Take.prototype._e = function (err) {
        var u = this.out;
        if (u === NO)
            return;
        u._e(err);
    };
    Take.prototype._c = function () {
        var u = this.out;
        if (u === NO)
            return;
        u._c();
    };
    return Take;
}());
var Stream = (function () {
    function Stream(producer) {
        this._prod = producer || NO;
        this._ils = [];
        this._stopID = NO;
        this._dl = NO;
        this._d = false;
        this._target = NO;
        this._err = NO;
    }
    Stream.prototype._n = function (t) {
        var a = this._ils;
        var L = a.length;
        if (this._d)
            this._dl._n(t);
        if (L == 1)
            a[0]._n(t);
        else if (L == 0)
            return;
        else {
            var b = cp(a);
            for (var i = 0; i < L; i++)
                b[i]._n(t);
        }
    };
    Stream.prototype._e = function (err) {
        if (this._err !== NO)
            return;
        this._err = err;
        var a = this._ils;
        var L = a.length;
        this._x();
        if (this._d)
            this._dl._e(err);
        if (L == 1)
            a[0]._e(err);
        else if (L == 0)
            return;
        else {
            var b = cp(a);
            for (var i = 0; i < L; i++)
                b[i]._e(err);
        }
        if (!this._d && L == 0)
            throw this._err;
    };
    Stream.prototype._c = function () {
        var a = this._ils;
        var L = a.length;
        this._x();
        if (this._d)
            this._dl._c();
        if (L == 1)
            a[0]._c();
        else if (L == 0)
            return;
        else {
            var b = cp(a);
            for (var i = 0; i < L; i++)
                b[i]._c();
        }
    };
    Stream.prototype._x = function () {
        if (this._ils.length === 0)
            return;
        if (this._prod !== NO)
            this._prod._stop();
        this._err = NO;
        this._ils = [];
    };
    Stream.prototype._stopNow = function () {
        // WARNING: code that calls this method should
        // first check if this._prod is valid (not `NO`)
        this._prod._stop();
        this._err = NO;
        this._stopID = NO;
    };
    Stream.prototype._add = function (il) {
        var ta = this._target;
        if (ta !== NO)
            return ta._add(il);
        var a = this._ils;
        a.push(il);
        if (a.length > 1)
            return;
        if (this._stopID !== NO) {
            clearTimeout(this._stopID);
            this._stopID = NO;
        }
        else {
            var p = this._prod;
            if (p !== NO)
                p._start(this);
        }
    };
    Stream.prototype._remove = function (il) {
        var _this = this;
        var ta = this._target;
        if (ta !== NO)
            return ta._remove(il);
        var a = this._ils;
        var i = a.indexOf(il);
        if (i > -1) {
            a.splice(i, 1);
            if (this._prod !== NO && a.length <= 0) {
                this._err = NO;
                this._stopID = setTimeout(function () { return _this._stopNow(); });
            }
            else if (a.length === 1) {
                this._pruneCycles();
            }
        }
    };
    // If all paths stemming from `this` stream eventually end at `this`
    // stream, then we remove the single listener of `this` stream, to
    // force it to end its execution and dispose resources. This method
    // assumes as a precondition that this._ils has just one listener.
    Stream.prototype._pruneCycles = function () {
        if (this._hasNoSinks(this, []))
            this._remove(this._ils[0]);
    };
    // Checks whether *there is no* path starting from `x` that leads to an end
    // listener (sink) in the stream graph, following edges A->B where B is a
    // listener of A. This means these paths constitute a cycle somehow. Is given
    // a trace of all visited nodes so far.
    Stream.prototype._hasNoSinks = function (x, trace) {
        if (trace.indexOf(x) !== -1)
            return true;
        else if (x.out === this)
            return true;
        else if (x.out && x.out !== NO)
            return this._hasNoSinks(x.out, trace.concat(x));
        else if (x._ils) {
            for (var i = 0, N = x._ils.length; i < N; i++)
                if (!this._hasNoSinks(x._ils[i], trace.concat(x)))
                    return false;
            return true;
        }
        else
            return false;
    };
    Stream.prototype.ctor = function () {
        return this instanceof MemoryStream ? MemoryStream : Stream;
    };
    /**
     * Adds a Listener to the Stream.
     *
     * @param {Listener} listener
     */
    Stream.prototype.addListener = function (listener) {
        listener._n = listener.next || noop;
        listener._e = listener.error || noop;
        listener._c = listener.complete || noop;
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
    /**
     * Adds a Listener to the Stream returning a Subscription to remove that
     * listener.
     *
     * @param {Listener} listener
     * @returns {Subscription}
     */
    Stream.prototype.subscribe = function (listener) {
        this.addListener(listener);
        return new StreamSub(this, listener);
    };
    /**
     * Add interop between most.js and RxJS 5
     *
     * @returns {Stream}
     */
    Stream.prototype[symbol_observable_1.default] = function () {
        return this;
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
                || typeof producer.stop !== 'function')
                throw new Error('producer requires both start and stop functions');
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
        if (producer)
            internalizeProducer(producer); // mutates the input
        return new MemoryStream(producer);
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
     * Creates a stream from an Array, Promise, or an Observable.
     *
     * @factory true
     * @param {Array|PromiseLike|Observable} input The input to make a stream from.
     * @return {Stream}
     */
    Stream.from = function (input) {
        if (typeof input[symbol_observable_1.default] === 'function')
            return Stream.fromObservable(input);
        else if (typeof input.then === 'function')
            return Stream.fromPromise(input);
        else if (Array.isArray(input))
            return Stream.fromArray(input);
        throw new TypeError("Type of input to from() must be an Array, Promise, or Observable");
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
            items[_i] = arguments[_i];
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
        return new Stream(new FromArray(array));
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
     * @param {PromiseLike} promise The promise to be converted as a stream.
     * @return {Stream}
     */
    Stream.fromPromise = function (promise) {
        return new Stream(new FromPromise(promise));
    };
    /**
     * Converts an Observable into a Stream.
     *
     * @factory true
     * @param {any} observable The observable to be converted as a stream.
     * @return {Stream}
     */
    Stream.fromObservable = function (obs) {
        if (obs.endWhen)
            return obs;
        return new Stream(new FromObservable(obs));
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
        return new Stream(new Periodic(period));
    };
    Stream.prototype._map = function (project) {
        return new (this.ctor())(new MapOp(project, this));
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
        op.type = 'mapTo';
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
        if (p instanceof Filter)
            return new Stream(new Filter(and(p.f, passes), p.ins));
        return new Stream(new Filter(passes, this));
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
        return new (this.ctor())(new Take(amount, this));
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
        return new Stream(new Drop(amount, this));
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
        return new Stream(new Last(this));
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
        return new MemoryStream(new StartWith(this, initial));
    };
    /**
     * Uses another stream to determine when to complete the current stream.
     *
     * When the given `other` stream emits an event or completes, the output
     * stream will complete. Before that happens, the output stream will behaves
     * like the input stream.
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
        return new (this.ctor())(new EndWhen(other, this));
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
        return new MemoryStream(new Fold(accumulate, seed, this));
    };
    /**
     * Replaces an error with another stream.
     *
     * When (and if) an error happens on the input stream, instead of forwarding
     * that error to the output stream, *replaceError* will call the `replace`
     * function which returns the stream that the output stream will replicate.
     * And, in case that new stream also emits an error, `replace` will be called
     * again to get another stream to start replicating.
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
     * stream and returns a new stream. The output stream will behave like the
     * stream that this function returns.
     * @return {Stream}
     */
    Stream.prototype.replaceError = function (replace) {
        return new (this.ctor())(new ReplaceError(replace, this));
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
        return new Stream(new Flatten(this));
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
     * Returns an output stream that behaves like the input stream, but also
     * remembers the most recent event that happens on the input stream, so that a
     * newly added listener will immediately receive that memorised event.
     *
     * @return {MemoryStream}
     */
    Stream.prototype.remember = function () {
        return new MemoryStream(new Remember(this));
    };
    /**
     * Returns an output stream that identically behaves like the input stream,
     * but also runs a `spy` function fo each event, to help you debug your app.
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
        return new (this.ctor())(new Debug(this, labelOrSpy));
    };
    /**
     * *imitate* changes this current Stream to emit the same events that the
     * `other` given Stream does. This method returns nothing.
     *
     * This method exists to allow one thing: **circular dependency of streams**.
     * For instance, let's imagine that for some reason you need to create a
     * circular dependency where stream `first$` depends on stream `second$`
     * which in turn depends on `first$`:
     *
     * <!-- skip-example -->
     * ```js
     * import delay from 'xstream/extra/delay'
     *
     * var first$ = second$.map(x => x * 10).take(3);
     * var second$ = first$.map(x => x + 1).startWith(1).compose(delay(100));
     * ```
     *
     * However, that is invalid JavaScript, because `second$` is undefined
     * on the first line. This is how *imitate* can help solve it:
     *
     * ```js
     * import delay from 'xstream/extra/delay'
     *
     * var secondProxy$ = xs.create();
     * var first$ = secondProxy$.map(x => x * 10).take(3);
     * var second$ = first$.map(x => x + 1).startWith(1).compose(delay(100));
     * secondProxy$.imitate(second$);
     * ```
     *
     * We create `secondProxy$` before the others, so it can be used in the
     * declaration of `first$`. Then, after both `first$` and `second$` are
     * defined, we hook `secondProxy$` with `second$` with `imitate()` to tell
     * that they are "the same". `imitate` will not trigger the start of any
     * stream, it just binds `secondProxy$` and `second$` together.
     *
     * The following is an example where `imitate()` is important in Cycle.js
     * applications. A parent component contains some child components. A child
     * has an action stream which is given to the parent to define its state:
     *
     * <!-- skip-example -->
     * ```js
     * const childActionProxy$ = xs.create();
     * const parent = Parent({...sources, childAction$: childActionProxy$});
     * const childAction$ = parent.state$.map(s => s.child.action$).flatten();
     * childActionProxy$.imitate(childAction$);
     * ```
     *
     * Note, though, that **`imitate()` does not support MemoryStreams**. If we
     * would attempt to imitate a MemoryStream in a circular dependency, we would
     * either get a race condition (where the symptom would be "nothing happens")
     * or an infinite cyclic emission of values. It's useful to think about
     * MemoryStreams as cells in a spreadsheet. It doesn't make any sense to
     * define a spreadsheet cell `A1` with a formula that depends on `B1` and
     * cell `B1` defined with a formula that depends on `A1`.
     *
     * If you find yourself wanting to use `imitate()` with a
     * MemoryStream, you should rework your code around `imitate()` to use a
     * Stream instead. Look for the stream in the circular dependency that
     * represents an event stream, and that would be a candidate for creating a
     * proxy Stream which then imitates the target Stream.
     *
     * @param {Stream} target The other stream to imitate on the current one. Must
     * not be a MemoryStream.
     */
    Stream.prototype.imitate = function (target) {
        if (target instanceof MemoryStream)
            throw new Error('A MemoryStream was given to imitate(), but it only ' +
                'supports a Stream. Read more about this restriction here: ' +
                'https://github.com/staltz/xstream#faq');
        this._target = target;
        for (var ils = this._ils, N = ils.length, i = 0; i < N; i++)
            target._add(ils[i]);
        this._ils = [];
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
     * Adds a "debug" listener to the stream. There can only be one debug
     * listener, that's why this is 'setDebugListener'. To remove the debug
     * listener, just call setDebugListener(null).
     *
     * A debug listener is like any other listener. The only difference is that a
     * debug listener is "stealthy": its presence/absence does not trigger the
     * start/stop of the stream (or the producer inside the stream). This is
     * useful so you can inspect what is going on without changing the behavior
     * of the program. If you have an idle stream and you add a normal listener to
     * it, the stream will start executing. But if you set a debug listener on an
     * idle stream, it won't start executing (not until the first normal listener
     * is added).
     *
     * As the name indicates, we don't recommend using this method to build app
     * logic. In fact, in most cases the debug operator works just fine. Only use
     * this one if you know what you're doing.
     *
     * @param {Listener<T>} listener
     */
    Stream.prototype.setDebugListener = function (listener) {
        if (!listener) {
            this._d = false;
            this._dl = NO;
        }
        else {
            this._d = true;
            listener._n = listener.next || noop;
            listener._e = listener.error || noop;
            listener._c = listener.complete || noop;
            this._dl = listener;
        }
    };
    return Stream;
}());
/**
 * Blends multiple streams together, emitting events from all of them
 * concurrently.
 *
 * *merge* takes multiple streams as arguments, and creates a stream that
 * behaves like each of the argument streams, in parallel.
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
Stream.merge = function merge() {
    var streams = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        streams[_i] = arguments[_i];
    }
    return new Stream(new Merge(streams));
};
/**
 * Combines multiple input streams together to return a stream whose events
 * are arrays that collect the latest events from each input stream.
 *
 * *combine* internally remembers the most recent event from each of the input
 * streams. When any of the input streams emits an event, that event together
 * with all the other saved events are combined into an array. That array will
 * be emitted on the output stream. It's essentially a way of joining together
 * the events from multiple streams.
 *
 * Marble diagram:
 *
 * ```text
 * --1----2-----3--------4---
 * ----a-----b-----c--d------
 *          combine
 * ----1a-2a-2b-3b-3c-3d-4d--
 * ```
 *
 * Note: to minimize garbage collection, *combine* uses the same array
 * instance for each emission.  If you need to compare emissions over time,
 * cache the values with `map` first:
 *
 * ```js
 * import pairwise from 'xstream/extra/pairwise'
 *
 * const stream1 = xs.of(1);
 * const stream2 = xs.of(2);
 *
 * xs.combine(stream1, stream2).map(
 *   combinedEmissions => ([ ...combinedEmissions ])
 * ).compose(pairwise)
 * ```
 *
 * @factory true
 * @param {Stream} stream1 A stream to combine together with other streams.
 * @param {Stream} stream2 A stream to combine together with other streams.
 * Multiple streams, not just two, may be given as arguments.
 * @return {Stream}
 */
Stream.combine = function combine() {
    var streams = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        streams[_i] = arguments[_i];
    }
    return new Stream(new Combine(streams));
};
exports.Stream = Stream;
var MemoryStream = (function (_super) {
    __extends(MemoryStream, _super);
    function MemoryStream(producer) {
        var _this = _super.call(this, producer) || this;
        _this._has = false;
        return _this;
    }
    MemoryStream.prototype._n = function (x) {
        this._v = x;
        this._has = true;
        _super.prototype._n.call(this, x);
    };
    MemoryStream.prototype._add = function (il) {
        var ta = this._target;
        if (ta !== NO)
            return ta._add(il);
        var a = this._ils;
        a.push(il);
        if (a.length > 1) {
            if (this._has)
                il._n(this._v);
            return;
        }
        if (this._stopID !== NO) {
            if (this._has)
                il._n(this._v);
            clearTimeout(this._stopID);
            this._stopID = NO;
        }
        else if (this._has)
            il._n(this._v);
        else {
            var p = this._prod;
            if (p !== NO)
                p._start(this);
        }
    };
    MemoryStream.prototype._stopNow = function () {
        this._has = false;
        _super.prototype._stopNow.call(this);
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
    MemoryStream.prototype.remember = function () {
        return this;
    };
    MemoryStream.prototype.debug = function (labelOrSpy) {
        return _super.prototype.debug.call(this, labelOrSpy);
    };
    return MemoryStream;
}(Stream));
exports.MemoryStream = MemoryStream;
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Stream;

},{"symbol-observable":119}],126:[function(require,module,exports){
'use strict';

var _run = require('@cycle/run');

var _dom = require('@cycle/dom');

var _storage = require('@cycle/storage');

var _storage2 = _interopRequireDefault(_storage);

var _history = require('@cycle/history');

var _cycleOnionify = require('cycle-onionify');

var _cycleOnionify2 = _interopRequireDefault(_cycleOnionify);

var _cycleStorageify = require('cycle-storageify');

var _cycleStorageify2 = _interopRequireDefault(_cycleStorageify);

var _index = require('./components/TaskList/index');

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var main = (0, _cycleOnionify2.default)((0, _cycleStorageify2.default)(_index2.default, { key: 'todos-cycle' }));

(0, _run.run)(main, {
  DOM: (0, _dom.makeDOMDriver)('.todoapp'),
  history: (0, _history.captureClicks)((0, _history.makeHistoryDriver)()),
  storage: _storage2.default
});

},{"./components/TaskList/index":132,"@cycle/dom":11,"@cycle/history":22,"@cycle/run":25,"@cycle/storage":26,"cycle-onionify":30,"cycle-storageify":33}],127:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = Task;

var _intent = require('./intent');

var _intent2 = _interopRequireDefault(_intent);

var _model = require('./model');

var _model2 = _interopRequireDefault(_model);

var _view = require('./view');

var _view2 = _interopRequireDefault(_view);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function Task(sources) {
  var state$ = sources.onion.state$;
  var actions = (0, _intent2.default)(sources.DOM);
  var reducer$ = (0, _model2.default)(actions);
  var vdom$ = (0, _view2.default)(state$);

  return {
    DOM: vdom$,
    onion: reducer$
  };
}

},{"./intent":128,"./model":129,"./view":130}],128:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = intent;

var _xstream = require('xstream');

var _xstream2 = _interopRequireDefault(_xstream);

var _utils = require('../../utils');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function intent(domSource) {
  var editEnterEvent$ = domSource.select('.edit').events('keyup').filter(function (ev) {
    return ev.keyCode === _utils.ENTER_KEY;
  });

  var editBlurEvent$ = domSource.select('.edit').events('blur', true);

  return {
    startEdit$: domSource.select('label').events('dblclick').mapTo(null),

    doneEdit$: _xstream2.default.merge(editEnterEvent$, editBlurEvent$).map(function (ev) {
      return ev.target.value;
    }),

    cancelEdit$: domSource.select('.edit').events('keyup').filter(function (ev) {
      return ev.keyCode === _utils.ESC_KEY;
    }).mapTo(null),

    toggle$: domSource.select('.toggle').events('change').map(function (ev) {
      return ev.target.checked;
    }),

    destroy$: domSource.select('.destroy').events('click').mapTo(null)
  };
}

},{"../../utils":136,"xstream":125}],129:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

exports.default = model;

var _xstream = require('xstream');

var _xstream2 = _interopRequireDefault(_xstream);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function model(actions) {
  var startEditReducer$ = actions.startEdit$.mapTo(function startEditReducer(data) {
    return _extends({}, data, { editing: true });
  });

  var doneEditReducer$ = actions.doneEdit$.map(function (content) {
    return function doneEditReducer(data) {
      return _extends({}, data, { title: content, editing: false });
    };
  });

  var cancelEditReducer$ = actions.cancelEdit$.mapTo(function cancelEditReducer(data) {
    return _extends({}, data, { editing: false });
  });

  var toggleReducer$ = actions.toggle$.map(function (isToggled) {
    return function toggleReducer(data) {
      return _extends({}, data, { completed: isToggled });
    };
  });

  var destroyReducer$ = actions.destroy$.mapTo(function destroyReducer(data) {
    return void 0;
  });

  return _xstream2.default.merge(startEditReducer$, doneEditReducer$, cancelEditReducer$, toggleReducer$, destroyReducer$);
}

},{"xstream":125}],130:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = view;

var _dom = require('@cycle/dom');

function view(state$) {
  return state$.map(function (_ref) {
    var title = _ref.title,
        completed = _ref.completed,
        editing = _ref.editing;
    return (0, _dom.li)('.todoRoot', { class: { completed: completed, editing: editing } }, [(0, _dom.div)('.view', [(0, _dom.input)('.toggle', {
      props: { type: 'checkbox', checked: completed }
    }), (0, _dom.label)(title), (0, _dom.button)('.destroy')]), (0, _dom.input)('.edit', {
      props: { type: 'text' },
      hook: {
        update: function update(oldVNode, _ref2) {
          var elm = _ref2.elm;

          elm.value = title;
          if (editing) {
            elm.focus();
            elm.selectionStart = elm.value.length;
          }
        }
      }
    })]);
  });
}

},{"@cycle/dom":11}],131:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.listLens = undefined;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

exports.List = List;

var _dom = require('@cycle/dom');

var _cycleOnionify = require('cycle-onionify');

var _index = require('../Task/index');

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var listLens = exports.listLens = {
  get: function get(state) {
    return state.list.filter(state.filterFn);
  },

  set: function set(state, nextFilteredList) {
    var prevFilteredList = state.list.filter(state.filterFn);
    var newList = state.list.map(function (task) {
      return nextFilteredList.find(function (t) {
        return t.key === task.key;
      }) || task;
    }).filter(function (task) {
      return prevFilteredList.some(function (t) {
        return t.key === task.key;
      }) && nextFilteredList.some(function (t) {
        return t.key === task.key;
      });
    });
    return _extends({}, state, {
      list: newList
    });
  }
};

function List(sources) {
  var tasks$ = (0, _cycleOnionify.collection)(_index2.default, sources);

  var vdom$ = tasks$.compose((0, _cycleOnionify.pickCombine)('DOM')).map(function (vnodes) {
    return (0, _dom.ul)('.todo-list', vnodes);
  });

  var reducer$ = tasks$.compose((0, _cycleOnionify.pickMerge)('onion'));

  return {
    DOM: vdom$,
    onion: reducer$
  };
}

},{"../Task/index":127,"@cycle/dom":11,"cycle-onionify":30}],132:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = TaskList;

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

var _List = require('./List');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function TaskList(sources) {
  var state$ = sources.onion.state$;
  var actions = (0, _intent2.default)(sources.DOM, sources.history);
  var parentReducer$ = (0, _model2.default)(actions);

  var listSinks = (0, _isolate2.default)(_List.List, { onion: _List.listLens })(sources);
  var listVDom$ = listSinks.DOM;
  var listReducer$ = listSinks.onion;

  var vdom$ = (0, _view2.default)(state$, listVDom$);
  var reducer$ = _xstream2.default.merge(parentReducer$, listReducer$);

  return {
    DOM: vdom$,
    onion: reducer$
  };
}

},{"./List":131,"./intent":133,"./model":134,"./view":135,"@cycle/isolate":23,"xstream":125}],133:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = intent;

var _xstream = require('xstream');

var _xstream2 = _interopRequireDefault(_xstream);

var _dropRepeats = require('xstream/extra/dropRepeats');

var _dropRepeats2 = _interopRequireDefault(_dropRepeats);

var _utils = require('../../utils');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function intent(domSource, historySource) {
  return {
    changeRoute$: historySource.map(function (location) {
      return location.pathname;
    }).compose((0, _dropRepeats2.default)()),

    updateInputValue$: domSource.select('.new-todo').events('input').map(function (ev) {
      return ev.target.value;
    }),

    cancelInput$: domSource.select('.new-todo').events('keydown').filter(function (ev) {
      return ev.keyCode === _utils.ESC_KEY;
    }),

    insertTodo$: domSource.select('.new-todo').events('keydown').filter(function (ev) {
      var trimmedVal = String(ev.target.value).trim();
      return ev.keyCode === _utils.ENTER_KEY && trimmedVal;
    }).map(function (ev) {
      return String(ev.target.value).trim();
    }),

    toggleAll$: domSource.select('.toggle-all').events('click').map(function (ev) {
      return ev.target.checked;
    }),

    deleteCompleted$: domSource.select('.clear-completed').events('click').mapTo(null)
  };
};

},{"../../utils":136,"xstream":125,"xstream/extra/dropRepeats":124}],134:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

exports.default = model;

var _xstream = require('xstream');

var _xstream2 = _interopRequireDefault(_xstream);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

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

var uuid = Date.now();

function model(actions) {
  var initialReducer$ = _xstream2.default.of(function initialReducer(prevState) {
    if (prevState) {
      return prevState;
    } else {
      return {
        inputValue: '',
        list: [],
        filter: '',
        filterFn: function filterFn() {
          return true;
        } };
    }
  });

  var changeRouteReducer$ = actions.changeRoute$.startWith('/').map(function (path) {
    var filterFn = getFilterFn(path);
    return function changeRouteReducer(prevState) {
      return _extends({}, prevState, {
        filter: path.replace('/', '').trim(),
        filterFn: filterFn
      });
    };
  });

  var updateInputValueReducer$ = actions.updateInputValue$.map(function (inputValue) {
    return function updateInputValue(prevState) {
      return _extends({}, prevState, { inputValue: inputValue });
    };
  });

  var clearInputReducer$ = _xstream2.default.merge(actions.cancelInput$, actions.insertTodo$).mapTo(function clearInputReducer(prevState) {
    return _extends({}, prevState, { inputValue: '' });
  });

  var insertTodoReducer$ = actions.insertTodo$.map(function (content) {
    return function insertTodoReducer(prevState) {
      var newTodo = {
        key: uuid++,
        title: content,
        completed: false,
        editing: false
      };
      return _extends({}, prevState, {
        list: prevState.list.concat(newTodo)
      });
    };
  });

  var toggleAllReducer$ = actions.toggleAll$.map(function (isToggled) {
    return function toggleAllReducer(prevState) {
      return _extends({}, prevState, {
        list: prevState.list.map(function (task) {
          return _extends({}, task, { completed: isToggled });
        })
      });
    };
  });

  var deleteCompletedReducer$ = actions.deleteCompleted$.mapTo(function deleteCompletedsReducer(prevState) {
    return _extends({}, prevState, {
      list: prevState.list.filter(function (task) {
        return task.completed === false;
      })
    });
  });

  return _xstream2.default.merge(initialReducer$, updateInputValueReducer$, changeRouteReducer$, clearInputReducer$, insertTodoReducer$, toggleAllReducer$, deleteCompletedReducer$);
}

},{"xstream":125}],135:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

exports.default = view;

var _xstream = require('xstream');

var _xstream2 = _interopRequireDefault(_xstream);

var _dom = require('@cycle/dom');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function renderHeader(state) {
  return (0, _dom.header)('.header', [(0, _dom.h1)('todos'), (0, _dom.input)('.new-todo', {
    props: {
      type: 'text',
      placeholder: 'What needs to be done?',
      autofocus: true,
      name: 'newTodo',
      value: state.inputValue
    }
  })]);
}

function renderMainSection(state, listVDom) {
  var allCompleted = state.list.reduce(function (x, y) {
    return x && y.completed;
  }, true);
  var sectionStyle = { 'display': state.list.length ? '' : 'none' };

  return (0, _dom.section)('.main', { style: sectionStyle }, [(0, _dom.input)('.toggle-all', {
    props: { type: 'checkbox', checked: allCompleted }
  }), listVDom]);
}

function renderFilterButton(state, filterTag, path, label) {
  return (0, _dom.li)([(0, _dom.a)({
    attrs: { href: path },
    class: { selected: state.filter === filterTag }
  }, label)]);
}

function renderFooter(state) {
  var amountCompleted = state.list.filter(function (task) {
    return task.completed;
  }).length;
  var amountActive = state.list.length - amountCompleted;
  var footerStyle = { 'display': state.list.length ? '' : 'none' };

  return (0, _dom.footer)('.footer', { style: footerStyle }, [(0, _dom.span)('.todo-count', [(0, _dom.strong)(String(amountActive)), ' item' + (amountActive !== 1 ? 's' : '') + ' left']), (0, _dom.ul)('.filters', [renderFilterButton(state, '', '/', 'All'), renderFilterButton(state, 'active', '/active', 'Active'), renderFilterButton(state, 'completed', '/completed', 'Completed')]), amountCompleted > 0 ? (0, _dom.button)('.clear-completed', 'Clear completed (' + amountCompleted + ')') : null]);
}

function view(state$, listVDom$) {
  return _xstream2.default.combine(state$, listVDom$).map(function (_ref) {
    var _ref2 = _slicedToArray(_ref, 2),
        state = _ref2[0],
        listVDom = _ref2[1];

    return (0, _dom.div)([renderHeader(state), renderMainSection(state, listVDom), renderFooter(state)]);
  });
};

},{"@cycle/dom":11,"xstream":125}],136:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var ENTER_KEY = 13;
var ESC_KEY = 27;

exports.ENTER_KEY = ENTER_KEY;
exports.ESC_KEY = ESC_KEY;

},{}]},{},[126])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvQGN5Y2xlL2RvbS9saWIvQm9keURPTVNvdXJjZS5qcyIsIm5vZGVfbW9kdWxlcy9AY3ljbGUvZG9tL2xpYi9Eb2N1bWVudERPTVNvdXJjZS5qcyIsIm5vZGVfbW9kdWxlcy9AY3ljbGUvZG9tL2xpYi9FbGVtZW50RmluZGVyLmpzIiwibm9kZV9tb2R1bGVzL0BjeWNsZS9kb20vbGliL0V2ZW50RGVsZWdhdG9yLmpzIiwibm9kZV9tb2R1bGVzL0BjeWNsZS9kb20vbGliL0lzb2xhdGVNb2R1bGUuanMiLCJub2RlX21vZHVsZXMvQGN5Y2xlL2RvbS9saWIvTWFpbkRPTVNvdXJjZS5qcyIsIm5vZGVfbW9kdWxlcy9AY3ljbGUvZG9tL2xpYi9TY29wZUNoZWNrZXIuanMiLCJub2RlX21vZHVsZXMvQGN5Y2xlL2RvbS9saWIvVk5vZGVXcmFwcGVyLmpzIiwibm9kZV9tb2R1bGVzL0BjeWNsZS9kb20vbGliL2Zyb21FdmVudC5qcyIsIm5vZGVfbW9kdWxlcy9AY3ljbGUvZG9tL2xpYi9oeXBlcnNjcmlwdC1oZWxwZXJzLmpzIiwibm9kZV9tb2R1bGVzL0BjeWNsZS9kb20vbGliL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL0BjeWNsZS9kb20vbGliL2lzb2xhdGUuanMiLCJub2RlX21vZHVsZXMvQGN5Y2xlL2RvbS9saWIvbWFrZURPTURyaXZlci5qcyIsIm5vZGVfbW9kdWxlcy9AY3ljbGUvZG9tL2xpYi9tYXRjaGVzU2VsZWN0b3IuanMiLCJub2RlX21vZHVsZXMvQGN5Y2xlL2RvbS9saWIvbW9ja0RPTVNvdXJjZS5qcyIsIm5vZGVfbW9kdWxlcy9AY3ljbGUvZG9tL2xpYi9tb2R1bGVzLmpzIiwibm9kZV9tb2R1bGVzL0BjeWNsZS9kb20vbGliL3RodW5rLmpzIiwibm9kZV9tb2R1bGVzL0BjeWNsZS9kb20vbGliL3V0aWxzLmpzIiwibm9kZV9tb2R1bGVzL0BjeWNsZS9oaXN0b3J5L2xpYi9jYXB0dXJlQ2xpY2tzLmpzIiwibm9kZV9tb2R1bGVzL0BjeWNsZS9oaXN0b3J5L2xpYi9jcmVhdGVIaXN0b3J5JC5qcyIsIm5vZGVfbW9kdWxlcy9AY3ljbGUvaGlzdG9yeS9saWIvZHJpdmVycy5qcyIsIm5vZGVfbW9kdWxlcy9AY3ljbGUvaGlzdG9yeS9saWIvaW5kZXguanMiLCJub2RlX21vZHVsZXMvQGN5Y2xlL2lzb2xhdGUvbGliL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL0BjeWNsZS9ydW4vbGliL2FkYXB0LmpzIiwibm9kZV9tb2R1bGVzL0BjeWNsZS9ydW4vbGliL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL0BjeWNsZS9zdG9yYWdlL2xpYi9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9AY3ljbGUvc3RvcmFnZS9saWIvcmVzcG9uc2VDb2xsZWN0aW9uLmpzIiwibm9kZV9tb2R1bGVzL0BjeWNsZS9zdG9yYWdlL2xpYi91dGlsLmpzIiwibm9kZV9tb2R1bGVzL0BjeWNsZS9zdG9yYWdlL2xpYi93cml0ZVRvU3RvcmUuanMiLCJub2RlX21vZHVsZXMvY3ljbGUtb25pb25pZnkvbGliL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2N5Y2xlLW9uaW9uaWZ5L2xpYi9waWNrQ29tYmluZS5qcyIsIm5vZGVfbW9kdWxlcy9jeWNsZS1vbmlvbmlmeS9saWIvcGlja01lcmdlLmpzIiwibm9kZV9tb2R1bGVzL2N5Y2xlLXN0b3JhZ2VpZnkvbGliL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2N5Y2xlLXN0b3JhZ2VpZnkvbm9kZV9tb2R1bGVzL3hzdHJlYW0vY29yZS5qcyIsIm5vZGVfbW9kdWxlcy9jeWNsZS1zdG9yYWdlaWZ5L25vZGVfbW9kdWxlcy94c3RyZWFtL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2QvYXV0by1iaW5kLmpzIiwibm9kZV9tb2R1bGVzL2QvaW5kZXguanMiLCJub2RlX21vZHVsZXMvZXM1LWV4dC9hcnJheS8jL2NsZWFyLmpzIiwibm9kZV9tb2R1bGVzL2VzNS1leHQvYXJyYXkvIy9lLWluZGV4LW9mLmpzIiwibm9kZV9tb2R1bGVzL2VzNS1leHQvYXJyYXkvZnJvbS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9lczUtZXh0L2FycmF5L2Zyb20vaXMtaW1wbGVtZW50ZWQuanMiLCJub2RlX21vZHVsZXMvZXM1LWV4dC9hcnJheS9mcm9tL3NoaW0uanMiLCJub2RlX21vZHVsZXMvZXM1LWV4dC9mdW5jdGlvbi9pcy1hcmd1bWVudHMuanMiLCJub2RlX21vZHVsZXMvZXM1LWV4dC9mdW5jdGlvbi9pcy1mdW5jdGlvbi5qcyIsIm5vZGVfbW9kdWxlcy9lczUtZXh0L2Z1bmN0aW9uL25vb3AuanMiLCJub2RlX21vZHVsZXMvZXM1LWV4dC9tYXRoL3NpZ24vaW5kZXguanMiLCJub2RlX21vZHVsZXMvZXM1LWV4dC9tYXRoL3NpZ24vaXMtaW1wbGVtZW50ZWQuanMiLCJub2RlX21vZHVsZXMvZXM1LWV4dC9tYXRoL3NpZ24vc2hpbS5qcyIsIm5vZGVfbW9kdWxlcy9lczUtZXh0L251bWJlci90by1pbnRlZ2VyLmpzIiwibm9kZV9tb2R1bGVzL2VzNS1leHQvbnVtYmVyL3RvLXBvcy1pbnRlZ2VyLmpzIiwibm9kZV9tb2R1bGVzL2VzNS1leHQvb2JqZWN0L19pdGVyYXRlLmpzIiwibm9kZV9tb2R1bGVzL2VzNS1leHQvb2JqZWN0L2Fzc2lnbi9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9lczUtZXh0L29iamVjdC9hc3NpZ24vaXMtaW1wbGVtZW50ZWQuanMiLCJub2RlX21vZHVsZXMvZXM1LWV4dC9vYmplY3QvYXNzaWduL3NoaW0uanMiLCJub2RlX21vZHVsZXMvZXM1LWV4dC9vYmplY3QvY29weS5qcyIsIm5vZGVfbW9kdWxlcy9lczUtZXh0L29iamVjdC9jcmVhdGUuanMiLCJub2RlX21vZHVsZXMvZXM1LWV4dC9vYmplY3QvZm9yLWVhY2guanMiLCJub2RlX21vZHVsZXMvZXM1LWV4dC9vYmplY3QvaXMtY2FsbGFibGUuanMiLCJub2RlX21vZHVsZXMvZXM1LWV4dC9vYmplY3QvaXMtb2JqZWN0LmpzIiwibm9kZV9tb2R1bGVzL2VzNS1leHQvb2JqZWN0L2tleXMvaW5kZXguanMiLCJub2RlX21vZHVsZXMvZXM1LWV4dC9vYmplY3Qva2V5cy9pcy1pbXBsZW1lbnRlZC5qcyIsIm5vZGVfbW9kdWxlcy9lczUtZXh0L29iamVjdC9rZXlzL3NoaW0uanMiLCJub2RlX21vZHVsZXMvZXM1LWV4dC9vYmplY3QvbWFwLmpzIiwibm9kZV9tb2R1bGVzL2VzNS1leHQvb2JqZWN0L25vcm1hbGl6ZS1vcHRpb25zLmpzIiwibm9kZV9tb2R1bGVzL2VzNS1leHQvb2JqZWN0L3ByaW1pdGl2ZS1zZXQuanMiLCJub2RlX21vZHVsZXMvZXM1LWV4dC9vYmplY3Qvc2V0LXByb3RvdHlwZS1vZi9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9lczUtZXh0L29iamVjdC9zZXQtcHJvdG90eXBlLW9mL2lzLWltcGxlbWVudGVkLmpzIiwibm9kZV9tb2R1bGVzL2VzNS1leHQvb2JqZWN0L3NldC1wcm90b3R5cGUtb2Yvc2hpbS5qcyIsIm5vZGVfbW9kdWxlcy9lczUtZXh0L29iamVjdC92YWxpZC1jYWxsYWJsZS5qcyIsIm5vZGVfbW9kdWxlcy9lczUtZXh0L29iamVjdC92YWxpZC12YWx1ZS5qcyIsIm5vZGVfbW9kdWxlcy9lczUtZXh0L3N0cmluZy8jL2NvbnRhaW5zL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2VzNS1leHQvc3RyaW5nLyMvY29udGFpbnMvaXMtaW1wbGVtZW50ZWQuanMiLCJub2RlX21vZHVsZXMvZXM1LWV4dC9zdHJpbmcvIy9jb250YWlucy9zaGltLmpzIiwibm9kZV9tb2R1bGVzL2VzNS1leHQvc3RyaW5nL2lzLXN0cmluZy5qcyIsIm5vZGVfbW9kdWxlcy9lczYtaXRlcmF0b3IvYXJyYXkuanMiLCJub2RlX21vZHVsZXMvZXM2LWl0ZXJhdG9yL2Zvci1vZi5qcyIsIm5vZGVfbW9kdWxlcy9lczYtaXRlcmF0b3IvZ2V0LmpzIiwibm9kZV9tb2R1bGVzL2VzNi1pdGVyYXRvci9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9lczYtaXRlcmF0b3IvaXMtaXRlcmFibGUuanMiLCJub2RlX21vZHVsZXMvZXM2LWl0ZXJhdG9yL3N0cmluZy5qcyIsIm5vZGVfbW9kdWxlcy9lczYtaXRlcmF0b3IvdmFsaWQtaXRlcmFibGUuanMiLCJub2RlX21vZHVsZXMvZXM2LW1hcC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9lczYtbWFwL2lzLWltcGxlbWVudGVkLmpzIiwibm9kZV9tb2R1bGVzL2VzNi1tYXAvaXMtbmF0aXZlLWltcGxlbWVudGVkLmpzIiwibm9kZV9tb2R1bGVzL2VzNi1tYXAvbGliL2l0ZXJhdG9yLWtpbmRzLmpzIiwibm9kZV9tb2R1bGVzL2VzNi1tYXAvbGliL2l0ZXJhdG9yLmpzIiwibm9kZV9tb2R1bGVzL2VzNi1tYXAvcG9seWZpbGwuanMiLCJub2RlX21vZHVsZXMvZXM2LXN5bWJvbC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9lczYtc3ltYm9sL2lzLWltcGxlbWVudGVkLmpzIiwibm9kZV9tb2R1bGVzL2VzNi1zeW1ib2wvaXMtc3ltYm9sLmpzIiwibm9kZV9tb2R1bGVzL2VzNi1zeW1ib2wvcG9seWZpbGwuanMiLCJub2RlX21vZHVsZXMvZXM2LXN5bWJvbC92YWxpZGF0ZS1zeW1ib2wuanMiLCJub2RlX21vZHVsZXMvZXZlbnQtZW1pdHRlci9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9oaXN0b3J5L0RPTVV0aWxzLmpzIiwibm9kZV9tb2R1bGVzL2hpc3RvcnkvTG9jYXRpb25VdGlscy5qcyIsIm5vZGVfbW9kdWxlcy9oaXN0b3J5L1BhdGhVdGlscy5qcyIsIm5vZGVfbW9kdWxlcy9oaXN0b3J5L2NyZWF0ZUJyb3dzZXJIaXN0b3J5LmpzIiwibm9kZV9tb2R1bGVzL2hpc3RvcnkvY3JlYXRlSGFzaEhpc3RvcnkuanMiLCJub2RlX21vZHVsZXMvaGlzdG9yeS9jcmVhdGVNZW1vcnlIaXN0b3J5LmpzIiwibm9kZV9tb2R1bGVzL2hpc3RvcnkvY3JlYXRlVHJhbnNpdGlvbk1hbmFnZXIuanMiLCJub2RlX21vZHVsZXMvaGlzdG9yeS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9pbnZhcmlhbnQvYnJvd3Nlci5qcyIsIm5vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiLCJub2RlX21vZHVsZXMvcmVzb2x2ZS1wYXRobmFtZS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9zbmFiYmRvbS1zZWxlY3Rvci9saWIvY29tbW9uanMvY2xhc3NOYW1lRnJvbVZOb2RlLmpzIiwibm9kZV9tb2R1bGVzL3NuYWJiZG9tLXNlbGVjdG9yL2xpYi9jb21tb25qcy9zZWxlY3RvclBhcnNlci5qcyIsIm5vZGVfbW9kdWxlcy9zbmFiYmRvbS9oLmpzIiwibm9kZV9tb2R1bGVzL3NuYWJiZG9tL2h0bWxkb21hcGkuanMiLCJub2RlX21vZHVsZXMvc25hYmJkb20vaXMuanMiLCJub2RlX21vZHVsZXMvc25hYmJkb20vbW9kdWxlcy9hdHRyaWJ1dGVzLmpzIiwibm9kZV9tb2R1bGVzL3NuYWJiZG9tL21vZHVsZXMvY2xhc3MuanMiLCJub2RlX21vZHVsZXMvc25hYmJkb20vbW9kdWxlcy9kYXRhc2V0LmpzIiwibm9kZV9tb2R1bGVzL3NuYWJiZG9tL21vZHVsZXMvcHJvcHMuanMiLCJub2RlX21vZHVsZXMvc25hYmJkb20vbW9kdWxlcy9zdHlsZS5qcyIsIm5vZGVfbW9kdWxlcy9zbmFiYmRvbS9zbmFiYmRvbS5qcyIsIm5vZGVfbW9kdWxlcy9zbmFiYmRvbS90aHVuay5qcyIsIm5vZGVfbW9kdWxlcy9zbmFiYmRvbS90b3Zub2RlLmpzIiwibm9kZV9tb2R1bGVzL3NuYWJiZG9tL3Zub2RlLmpzIiwibm9kZV9tb2R1bGVzL3N5bWJvbC1vYnNlcnZhYmxlL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3N5bWJvbC1vYnNlcnZhYmxlL2xpYi9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9zeW1ib2wtb2JzZXJ2YWJsZS9saWIvcG9ueWZpbGwuanMiLCJub2RlX21vZHVsZXMvdmFsdWUtZXF1YWwvaW5kZXguanMiLCJub2RlX21vZHVsZXMvd2FybmluZy9icm93c2VyLmpzIiwibm9kZV9tb2R1bGVzL3hzdHJlYW0vZXh0cmEvZHJvcFJlcGVhdHMuanMiLCJub2RlX21vZHVsZXMveHN0cmVhbS9pbmRleC5qcyIsInNyYy9hcHAuanMiLCJzcmMvY29tcG9uZW50cy9UYXNrL2luZGV4LmpzIiwic3JjL2NvbXBvbmVudHMvVGFzay9pbnRlbnQuanMiLCJzcmMvY29tcG9uZW50cy9UYXNrL21vZGVsLmpzIiwic3JjL2NvbXBvbmVudHMvVGFzay92aWV3LmpzIiwic3JjL2NvbXBvbmVudHMvVGFza0xpc3QvTGlzdC5qcyIsInNyYy9jb21wb25lbnRzL1Rhc2tMaXN0L2luZGV4LmpzIiwic3JjL2NvbXBvbmVudHMvVGFza0xpc3QvaW50ZW50LmpzIiwic3JjL2NvbXBvbmVudHMvVGFza0xpc3QvbW9kZWwuanMiLCJzcmMvY29tcG9uZW50cy9UYXNrTGlzdC92aWV3LmpzIiwic3JjL3V0aWxzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeExBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOXpEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1RBO0FBQ0E7QUFDQTtBQUNBOztBQ0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNSQTtBQUNBO0FBQ0E7QUFDQTs7QUNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEdBO0FBQ0E7QUFDQTtBQUNBOztBQ0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25UQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqVUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6S0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUNuREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUNuREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVEE7QUFDQTs7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQzVCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDdkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDNURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUN6dERBOztBQUNBOztBQUNBOzs7O0FBQ0E7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOzs7Ozs7QUFFQSxJQUFNLE9BQU8sNkJBQVMsZ0RBQXFCLEVBQUMsS0FBSyxhQUFOLEVBQXJCLENBQVQsQ0FBYjs7QUFFQSxjQUFJLElBQUosRUFBVTtBQUNSLE9BQUssd0JBQWMsVUFBZCxDQURHO0FBRVIsV0FBUyw0QkFBYyxpQ0FBZCxDQUZEO0FBR1I7QUFIUSxDQUFWOzs7Ozs7OztrQkNOd0IsSTs7QUFKeEI7Ozs7QUFDQTs7OztBQUNBOzs7Ozs7QUFFZSxTQUFTLElBQVQsQ0FBYyxPQUFkLEVBQXVCO0FBQ3BDLE1BQU0sU0FBUyxRQUFRLEtBQVIsQ0FBYyxNQUE3QjtBQUNBLE1BQU0sVUFBVSxzQkFBTyxRQUFRLEdBQWYsQ0FBaEI7QUFDQSxNQUFNLFdBQVcscUJBQU0sT0FBTixDQUFqQjtBQUNBLE1BQU0sUUFBUSxvQkFBSyxNQUFMLENBQWQ7O0FBRUEsU0FBTztBQUNMLFNBQUssS0FEQTtBQUVMLFdBQU87QUFGRixHQUFQO0FBSUQ7Ozs7Ozs7O2tCQ1h1QixNOztBQUh4Qjs7OztBQUNBOzs7O0FBRWUsU0FBUyxNQUFULENBQWdCLFNBQWhCLEVBQTJCO0FBQ3hDLE1BQU0sa0JBQWtCLFVBQ3JCLE1BRHFCLENBQ2QsT0FEYyxFQUNMLE1BREssQ0FDRSxPQURGLEVBRXJCLE1BRnFCLENBRWQ7QUFBQSxXQUFNLEdBQUcsT0FBSCxxQkFBTjtBQUFBLEdBRmMsQ0FBeEI7O0FBSUEsTUFBTSxpQkFBaUIsVUFBVSxNQUFWLENBQWlCLE9BQWpCLEVBQTBCLE1BQTFCLENBQWlDLE1BQWpDLEVBQXlDLElBQXpDLENBQXZCOztBQUVBLFNBQU87QUFDTCxnQkFBWSxVQUNULE1BRFMsQ0FDRixPQURFLEVBQ08sTUFEUCxDQUNjLFVBRGQsRUFFVCxLQUZTLENBRUgsSUFGRyxDQURQOztBQUtMLGVBQVcsa0JBQUcsS0FBSCxDQUFTLGVBQVQsRUFBMEIsY0FBMUIsRUFDUixHQURRLENBQ0o7QUFBQSxhQUFNLEdBQUcsTUFBSCxDQUFVLEtBQWhCO0FBQUEsS0FESSxDQUxOOztBQVFMLGlCQUFhLFVBQ1YsTUFEVSxDQUNILE9BREcsRUFDTSxNQUROLENBQ2EsT0FEYixFQUVWLE1BRlUsQ0FFSDtBQUFBLGFBQU0sR0FBRyxPQUFILG1CQUFOO0FBQUEsS0FGRyxFQUdWLEtBSFUsQ0FHSixJQUhJLENBUlI7O0FBYUwsYUFBUyxVQUNOLE1BRE0sQ0FDQyxTQURELEVBQ1ksTUFEWixDQUNtQixRQURuQixFQUVOLEdBRk0sQ0FFRjtBQUFBLGFBQU0sR0FBRyxNQUFILENBQVUsT0FBaEI7QUFBQSxLQUZFLENBYko7O0FBaUJMLGNBQVUsVUFDUCxNQURPLENBQ0EsVUFEQSxFQUNZLE1BRFosQ0FDbUIsT0FEbkIsRUFFUCxLQUZPLENBRUQsSUFGQztBQWpCTCxHQUFQO0FBcUJEOzs7Ozs7Ozs7OztrQkM3QnVCLEs7O0FBRnhCOzs7Ozs7QUFFZSxTQUFTLEtBQVQsQ0FBZSxPQUFmLEVBQXdCO0FBQ3JDLE1BQU0sb0JBQW9CLFFBQVEsVUFBUixDQUN2QixLQUR1QixDQUNqQixTQUFTLGdCQUFULENBQTBCLElBQTFCLEVBQWdDO0FBQ3JDLHdCQUFXLElBQVgsSUFBaUIsU0FBUyxJQUExQjtBQUNELEdBSHVCLENBQTFCOztBQUtBLE1BQU0sbUJBQW1CLFFBQVEsU0FBUixDQUN0QixHQURzQixDQUNsQjtBQUFBLFdBQVcsU0FBUyxlQUFULENBQXlCLElBQXpCLEVBQStCO0FBQzdDLDBCQUFXLElBQVgsSUFBaUIsT0FBTyxPQUF4QixFQUFpQyxTQUFTLEtBQTFDO0FBQ0QsS0FGSTtBQUFBLEdBRGtCLENBQXpCOztBQUtBLE1BQU0scUJBQXFCLFFBQVEsV0FBUixDQUN4QixLQUR3QixDQUNsQixTQUFTLGlCQUFULENBQTJCLElBQTNCLEVBQWlDO0FBQ3RDLHdCQUFXLElBQVgsSUFBaUIsU0FBUyxLQUExQjtBQUNELEdBSHdCLENBQTNCOztBQUtBLE1BQU0saUJBQWlCLFFBQVEsT0FBUixDQUNwQixHQURvQixDQUNoQjtBQUFBLFdBQWEsU0FBUyxhQUFULENBQXVCLElBQXZCLEVBQTZCO0FBQzdDLDBCQUFXLElBQVgsSUFBaUIsV0FBVyxTQUE1QjtBQUNELEtBRkk7QUFBQSxHQURnQixDQUF2Qjs7QUFLQSxNQUFNLGtCQUFrQixRQUFRLFFBQVIsQ0FDckIsS0FEcUIsQ0FDZixTQUFTLGNBQVQsQ0FBd0IsSUFBeEIsRUFBOEI7QUFDbkMsV0FBTyxLQUFLLENBQVo7QUFDRCxHQUhxQixDQUF4Qjs7QUFLQSxTQUFPLGtCQUFHLEtBQUgsQ0FDTCxpQkFESyxFQUVMLGdCQUZLLEVBR0wsa0JBSEssRUFJTCxjQUpLLEVBS0wsZUFMSyxDQUFQO0FBT0Q7Ozs7Ozs7O2tCQ2pDdUIsSTs7QUFGeEI7O0FBRWUsU0FBUyxJQUFULENBQWMsTUFBZCxFQUFzQjtBQUNuQyxTQUFPLE9BQU8sR0FBUCxDQUFXO0FBQUEsUUFBRSxLQUFGLFFBQUUsS0FBRjtBQUFBLFFBQVMsU0FBVCxRQUFTLFNBQVQ7QUFBQSxRQUFvQixPQUFwQixRQUFvQixPQUFwQjtBQUFBLFdBQ2hCLGFBQUcsV0FBSCxFQUFnQixFQUFDLE9BQU8sRUFBQyxvQkFBRCxFQUFZLGdCQUFaLEVBQVIsRUFBaEIsRUFBK0MsQ0FDN0MsY0FBSSxPQUFKLEVBQWEsQ0FDWCxnQkFBTSxTQUFOLEVBQWlCO0FBQ2YsYUFBTyxFQUFDLE1BQU0sVUFBUCxFQUFtQixTQUFTLFNBQTVCO0FBRFEsS0FBakIsQ0FEVyxFQUlYLGdCQUFNLEtBQU4sQ0FKVyxFQUtYLGlCQUFPLFVBQVAsQ0FMVyxDQUFiLENBRDZDLEVBUTdDLGdCQUFNLE9BQU4sRUFBZTtBQUNiLGFBQU8sRUFBQyxNQUFNLE1BQVAsRUFETTtBQUViLFlBQU07QUFDSixnQkFBUSxnQkFBQyxRQUFELFNBQXFCO0FBQUEsY0FBVCxHQUFTLFNBQVQsR0FBUzs7QUFDM0IsY0FBSSxLQUFKLEdBQVksS0FBWjtBQUNBLGNBQUksT0FBSixFQUFhO0FBQ1gsZ0JBQUksS0FBSjtBQUNBLGdCQUFJLGNBQUosR0FBcUIsSUFBSSxLQUFKLENBQVUsTUFBL0I7QUFDRDtBQUNGO0FBUEc7QUFGTyxLQUFmLENBUjZDLENBQS9DLENBRGdCO0FBQUEsR0FBWCxDQUFQO0FBdUJEOzs7Ozs7Ozs7Ozs7UUNGZSxJLEdBQUEsSTs7QUF4QmhCOztBQUNBOztBQUNBOzs7Ozs7QUFFTyxJQUFNLDhCQUFXO0FBQ3RCLE9BQUssYUFBQyxLQUFELEVBQVc7QUFDZCxXQUFPLE1BQU0sSUFBTixDQUFXLE1BQVgsQ0FBa0IsTUFBTSxRQUF4QixDQUFQO0FBQ0QsR0FIcUI7O0FBS3RCLE9BQUssYUFBQyxLQUFELEVBQVEsZ0JBQVIsRUFBNkI7QUFDaEMsUUFBTSxtQkFBbUIsTUFBTSxJQUFOLENBQVcsTUFBWCxDQUFrQixNQUFNLFFBQXhCLENBQXpCO0FBQ0EsUUFBTSxVQUFVLE1BQU0sSUFBTixDQUNiLEdBRGEsQ0FDVDtBQUFBLGFBQVEsaUJBQWlCLElBQWpCLENBQXNCO0FBQUEsZUFBSyxFQUFFLEdBQUYsS0FBVSxLQUFLLEdBQXBCO0FBQUEsT0FBdEIsS0FBa0QsSUFBMUQ7QUFBQSxLQURTLEVBRWIsTUFGYSxDQUVOO0FBQUEsYUFDTixpQkFBaUIsSUFBakIsQ0FBc0I7QUFBQSxlQUFLLEVBQUUsR0FBRixLQUFVLEtBQUssR0FBcEI7QUFBQSxPQUF0QixLQUNBLGlCQUFpQixJQUFqQixDQUFzQjtBQUFBLGVBQUssRUFBRSxHQUFGLEtBQVUsS0FBSyxHQUFwQjtBQUFBLE9BQXRCLENBRk07QUFBQSxLQUZNLENBQWhCO0FBTUEsd0JBQ0ssS0FETDtBQUVFLFlBQU07QUFGUjtBQUlEO0FBakJxQixDQUFqQjs7QUFvQkEsU0FBUyxJQUFULENBQWMsT0FBZCxFQUF1QjtBQUM1QixNQUFNLFNBQVMsZ0RBQWlCLE9BQWpCLENBQWY7O0FBRUEsTUFBTSxRQUFRLE9BQ1gsT0FEVyxDQUNILGdDQUFZLEtBQVosQ0FERyxFQUVYLEdBRlcsQ0FFUCxrQkFBVTtBQUNiLFdBQU8sYUFBRyxZQUFILEVBQWlCLE1BQWpCLENBQVA7QUFDRCxHQUpXLENBQWQ7O0FBTUEsTUFBTSxXQUFXLE9BQ2QsT0FEYyxDQUNOLDhCQUFVLE9BQVYsQ0FETSxDQUFqQjs7QUFHQSxTQUFPO0FBQ0wsU0FBSyxLQURBO0FBRUwsV0FBTztBQUZGLEdBQVA7QUFJRDs7Ozs7Ozs7a0JDakN1QixROztBQVB4Qjs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFFZSxTQUFTLFFBQVQsQ0FBa0IsT0FBbEIsRUFBMkI7QUFDeEMsTUFBTSxTQUFTLFFBQVEsS0FBUixDQUFjLE1BQTdCO0FBQ0EsTUFBTSxVQUFVLHNCQUFPLFFBQVEsR0FBZixFQUFvQixRQUFRLE9BQTVCLENBQWhCO0FBQ0EsTUFBTSxpQkFBaUIscUJBQU0sT0FBTixDQUF2Qjs7QUFFQSxNQUFNLFlBQVksbUNBQWMsRUFBQyxxQkFBRCxFQUFkLEVBQWlDLE9BQWpDLENBQWxCO0FBQ0EsTUFBTSxZQUFZLFVBQVUsR0FBNUI7QUFDQSxNQUFNLGVBQWUsVUFBVSxLQUEvQjs7QUFFQSxNQUFNLFFBQVEsb0JBQUssTUFBTCxFQUFhLFNBQWIsQ0FBZDtBQUNBLE1BQU0sV0FBVyxrQkFBRyxLQUFILENBQVMsY0FBVCxFQUF5QixZQUF6QixDQUFqQjs7QUFFQSxTQUFPO0FBQ0wsU0FBSyxLQURBO0FBRUwsV0FBTztBQUZGLEdBQVA7QUFJRDs7Ozs7Ozs7a0JDbkJ1QixNOztBQUp4Qjs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFFZSxTQUFTLE1BQVQsQ0FBZ0IsU0FBaEIsRUFBMkIsYUFBM0IsRUFBMEM7QUFDdkQsU0FBTztBQUNMLGtCQUFjLGNBQ1gsR0FEVyxDQUNQO0FBQUEsYUFBWSxTQUFTLFFBQXJCO0FBQUEsS0FETyxFQUVYLE9BRlcsQ0FFSCw0QkFGRyxDQURUOztBQUtMLHVCQUFtQixVQUNoQixNQURnQixDQUNULFdBRFMsRUFDSSxNQURKLENBQ1csT0FEWCxFQUVoQixHQUZnQixDQUVaO0FBQUEsYUFBTSxHQUFHLE1BQUgsQ0FBVSxLQUFoQjtBQUFBLEtBRlksQ0FMZDs7QUFTTCxrQkFBYyxVQUNYLE1BRFcsQ0FDSixXQURJLEVBQ1MsTUFEVCxDQUNnQixTQURoQixFQUVYLE1BRlcsQ0FFSjtBQUFBLGFBQU0sR0FBRyxPQUFILG1CQUFOO0FBQUEsS0FGSSxDQVRUOztBQWFMLGlCQUFhLFVBQ1YsTUFEVSxDQUNILFdBREcsRUFDVSxNQURWLENBQ2lCLFNBRGpCLEVBRVYsTUFGVSxDQUVILGNBQU07QUFDWixVQUFNLGFBQWEsT0FBTyxHQUFHLE1BQUgsQ0FBVSxLQUFqQixFQUF3QixJQUF4QixFQUFuQjtBQUNBLGFBQU8sR0FBRyxPQUFILHlCQUE0QixVQUFuQztBQUNELEtBTFUsRUFNVixHQU5VLENBTU47QUFBQSxhQUFNLE9BQU8sR0FBRyxNQUFILENBQVUsS0FBakIsRUFBd0IsSUFBeEIsRUFBTjtBQUFBLEtBTk0sQ0FiUjs7QUFxQkwsZ0JBQVksVUFDVCxNQURTLENBQ0YsYUFERSxFQUNhLE1BRGIsQ0FDb0IsT0FEcEIsRUFFVCxHQUZTLENBRUw7QUFBQSxhQUFNLEdBQUcsTUFBSCxDQUFVLE9BQWhCO0FBQUEsS0FGSyxDQXJCUDs7QUF5Qkwsc0JBQWtCLFVBQ2YsTUFEZSxDQUNSLGtCQURRLEVBQ1ksTUFEWixDQUNtQixPQURuQixFQUVmLEtBRmUsQ0FFVCxJQUZTO0FBekJiLEdBQVA7QUE2QkQ7Ozs7Ozs7Ozs7O2tCQ3RCdUIsSzs7QUFaeEI7Ozs7OztBQUVBLFNBQVMsV0FBVCxDQUFxQixLQUFyQixFQUE0QjtBQUMxQixVQUFRLEtBQVI7QUFDRSxTQUFLLFNBQUw7QUFBZ0IsYUFBUTtBQUFBLGVBQVEsS0FBSyxTQUFMLEtBQW1CLEtBQTNCO0FBQUEsT0FBUjtBQUNoQixTQUFLLFlBQUw7QUFBbUIsYUFBUTtBQUFBLGVBQVEsS0FBSyxTQUFMLEtBQW1CLElBQTNCO0FBQUEsT0FBUjtBQUNuQjtBQUFTLGFBQU87QUFBQSxlQUFNLElBQU47QUFBQSxPQUFQLENBSFgsQ0FHOEI7QUFIOUI7QUFLRDs7QUFFRCxJQUFJLE9BQU8sS0FBSyxHQUFMLEVBQVg7O0FBRWUsU0FBUyxLQUFULENBQWUsT0FBZixFQUF3QjtBQUNyQyxNQUFNLGtCQUFrQixrQkFBRyxFQUFILENBQU0sU0FBUyxjQUFULENBQXdCLFNBQXhCLEVBQW1DO0FBQy9ELFFBQUksU0FBSixFQUFlO0FBQ2IsYUFBTyxTQUFQO0FBQ0QsS0FGRCxNQUVPO0FBQ0wsYUFBTztBQUNMLG9CQUFZLEVBRFA7QUFFTCxjQUFNLEVBRkQ7QUFHTCxnQkFBUSxFQUhIO0FBSUwsa0JBQVU7QUFBQSxpQkFBTSxJQUFOO0FBQUEsU0FKTCxFQUFQO0FBTUQ7QUFDRixHQVh1QixDQUF4Qjs7QUFhQSxNQUFNLHNCQUFzQixRQUFRLFlBQVIsQ0FDekIsU0FEeUIsQ0FDZixHQURlLEVBRXpCLEdBRnlCLENBRXJCLGdCQUFRO0FBQ1gsUUFBTSxXQUFXLFlBQVksSUFBWixDQUFqQjtBQUNBLFdBQU8sU0FBUyxrQkFBVCxDQUE0QixTQUE1QixFQUF1QztBQUM1QywwQkFDSyxTQURMO0FBRUUsZ0JBQVEsS0FBSyxPQUFMLENBQWEsR0FBYixFQUFrQixFQUFsQixFQUFzQixJQUF0QixFQUZWO0FBR0Usa0JBQVU7QUFIWjtBQUtELEtBTkQ7QUFPRCxHQVh5QixDQUE1Qjs7QUFhQSxNQUFNLDJCQUEyQixRQUFRLGlCQUFSLENBQzlCLEdBRDhCLENBQzFCO0FBQUEsV0FBYyxTQUFTLGdCQUFULENBQTBCLFNBQTFCLEVBQXFDO0FBQ3RELDBCQUFXLFNBQVgsSUFBc0IsWUFBWSxVQUFsQztBQUNELEtBRkk7QUFBQSxHQUQwQixDQUFqQzs7QUFLQSxNQUFNLHFCQUFxQixrQkFBRyxLQUFILENBQVMsUUFBUSxZQUFqQixFQUErQixRQUFRLFdBQXZDLEVBQ3hCLEtBRHdCLENBQ2xCLFNBQVMsaUJBQVQsQ0FBMkIsU0FBM0IsRUFBc0M7QUFDM0Msd0JBQVcsU0FBWCxJQUFzQixZQUFZLEVBQWxDO0FBQ0QsR0FId0IsQ0FBM0I7O0FBS0EsTUFBTSxxQkFBcUIsUUFBUSxXQUFSLENBQ3hCLEdBRHdCLENBQ3BCO0FBQUEsV0FBVyxTQUFTLGlCQUFULENBQTJCLFNBQTNCLEVBQXNDO0FBQ3BELFVBQU0sVUFBVTtBQUNkLGFBQUssTUFEUztBQUVkLGVBQU8sT0FGTztBQUdkLG1CQUFXLEtBSEc7QUFJZCxpQkFBUztBQUpLLE9BQWhCO0FBTUEsMEJBQ0ssU0FETDtBQUVFLGNBQU0sVUFBVSxJQUFWLENBQWUsTUFBZixDQUFzQixPQUF0QjtBQUZSO0FBSUQsS0FYSTtBQUFBLEdBRG9CLENBQTNCOztBQWNBLE1BQU0sb0JBQW9CLFFBQVEsVUFBUixDQUN2QixHQUR1QixDQUNuQjtBQUFBLFdBQWEsU0FBUyxnQkFBVCxDQUEwQixTQUExQixFQUFxQztBQUNyRCwwQkFDSyxTQURMO0FBRUUsY0FBTSxVQUFVLElBQVYsQ0FBZSxHQUFmLENBQW1CO0FBQUEsOEJBQ2xCLElBRGtCLElBQ1osV0FBVyxTQURDO0FBQUEsU0FBbkI7QUFGUjtBQU1ELEtBUEk7QUFBQSxHQURtQixDQUExQjs7QUFVQSxNQUFNLDBCQUEwQixRQUFRLGdCQUFSLENBQzdCLEtBRDZCLENBQ3ZCLFNBQVMsdUJBQVQsQ0FBaUMsU0FBakMsRUFBNEM7QUFDakQsd0JBQ0ssU0FETDtBQUVFLFlBQU0sVUFBVSxJQUFWLENBQWUsTUFBZixDQUFzQjtBQUFBLGVBQVEsS0FBSyxTQUFMLEtBQW1CLEtBQTNCO0FBQUEsT0FBdEI7QUFGUjtBQUlELEdBTjZCLENBQWhDOztBQVFBLFNBQU8sa0JBQUcsS0FBSCxDQUNMLGVBREssRUFFTCx3QkFGSyxFQUdMLG1CQUhLLEVBSUwsa0JBSkssRUFLTCxrQkFMSyxFQU1MLGlCQU5LLEVBT0wsdUJBUEssQ0FBUDtBQVNEOzs7Ozs7Ozs7OztrQkN6QnVCLEk7O0FBakV4Qjs7OztBQUNBOzs7O0FBSUEsU0FBUyxZQUFULENBQXNCLEtBQXRCLEVBQTZCO0FBQzNCLFNBQU8saUJBQU8sU0FBUCxFQUFrQixDQUN2QixhQUFHLE9BQUgsQ0FEdUIsRUFFdkIsZ0JBQU0sV0FBTixFQUFtQjtBQUNqQixXQUFPO0FBQ0wsWUFBTSxNQUREO0FBRUwsbUJBQWEsd0JBRlI7QUFHTCxpQkFBVyxJQUhOO0FBSUwsWUFBTSxTQUpEO0FBS0wsYUFBTyxNQUFNO0FBTFI7QUFEVSxHQUFuQixDQUZ1QixDQUFsQixDQUFQO0FBWUQ7O0FBRUQsU0FBUyxpQkFBVCxDQUEyQixLQUEzQixFQUFrQyxRQUFsQyxFQUE0QztBQUMxQyxNQUFNLGVBQWUsTUFBTSxJQUFOLENBQVcsTUFBWCxDQUFrQixVQUFDLENBQUQsRUFBSSxDQUFKO0FBQUEsV0FBVSxLQUFLLEVBQUUsU0FBakI7QUFBQSxHQUFsQixFQUE4QyxJQUE5QyxDQUFyQjtBQUNBLE1BQU0sZUFBZSxFQUFDLFdBQVcsTUFBTSxJQUFOLENBQVcsTUFBWCxHQUFvQixFQUFwQixHQUF5QixNQUFyQyxFQUFyQjs7QUFFQSxTQUFPLGtCQUFRLE9BQVIsRUFBaUIsRUFBQyxPQUFPLFlBQVIsRUFBakIsRUFBd0MsQ0FDN0MsZ0JBQU0sYUFBTixFQUFxQjtBQUNuQixXQUFPLEVBQUMsTUFBTSxVQUFQLEVBQW1CLFNBQVMsWUFBNUI7QUFEWSxHQUFyQixDQUQ2QyxFQUk3QyxRQUo2QyxDQUF4QyxDQUFQO0FBTUQ7O0FBRUQsU0FBUyxrQkFBVCxDQUE0QixLQUE1QixFQUFtQyxTQUFuQyxFQUE4QyxJQUE5QyxFQUFvRCxLQUFwRCxFQUEyRDtBQUN6RCxTQUFPLGFBQUcsQ0FDUixZQUFFO0FBQ0EsV0FBTyxFQUFDLE1BQU0sSUFBUCxFQURQO0FBRUEsV0FBTyxFQUFDLFVBQVUsTUFBTSxNQUFOLEtBQWlCLFNBQTVCO0FBRlAsR0FBRixFQUdHLEtBSEgsQ0FEUSxDQUFILENBQVA7QUFNRDs7QUFFRCxTQUFTLFlBQVQsQ0FBc0IsS0FBdEIsRUFBNkI7QUFDM0IsTUFBTSxrQkFBa0IsTUFBTSxJQUFOLENBQ3JCLE1BRHFCLENBQ2Q7QUFBQSxXQUFRLEtBQUssU0FBYjtBQUFBLEdBRGMsRUFFckIsTUFGSDtBQUdBLE1BQU0sZUFBZSxNQUFNLElBQU4sQ0FBVyxNQUFYLEdBQW9CLGVBQXpDO0FBQ0EsTUFBTSxjQUFjLEVBQUMsV0FBVyxNQUFNLElBQU4sQ0FBVyxNQUFYLEdBQW9CLEVBQXBCLEdBQXlCLE1BQXJDLEVBQXBCOztBQUVBLFNBQU8saUJBQU8sU0FBUCxFQUFrQixFQUFDLE9BQU8sV0FBUixFQUFsQixFQUF3QyxDQUM3QyxlQUFLLGFBQUwsRUFBb0IsQ0FDbEIsaUJBQU8sT0FBTyxZQUFQLENBQVAsQ0FEa0IsRUFFbEIsV0FBVyxpQkFBaUIsQ0FBakIsR0FBcUIsR0FBckIsR0FBMkIsRUFBdEMsSUFBNEMsT0FGMUIsQ0FBcEIsQ0FENkMsRUFLN0MsYUFBRyxVQUFILEVBQWUsQ0FDYixtQkFBbUIsS0FBbkIsRUFBMEIsRUFBMUIsRUFBOEIsR0FBOUIsRUFBbUMsS0FBbkMsQ0FEYSxFQUViLG1CQUFtQixLQUFuQixFQUEwQixRQUExQixFQUFvQyxTQUFwQyxFQUErQyxRQUEvQyxDQUZhLEVBR2IsbUJBQW1CLEtBQW5CLEVBQTBCLFdBQTFCLEVBQXVDLFlBQXZDLEVBQXFELFdBQXJELENBSGEsQ0FBZixDQUw2QyxFQVU1QyxrQkFBa0IsQ0FBbEIsR0FDQyxpQkFBTyxrQkFBUCxFQUEyQixzQkFBc0IsZUFBdEIsR0FBd0MsR0FBbkUsQ0FERCxHQUVHLElBWnlDLENBQXhDLENBQVA7QUFlRDs7QUFFYyxTQUFTLElBQVQsQ0FBYyxNQUFkLEVBQXNCLFNBQXRCLEVBQWlDO0FBQzlDLFNBQU8sa0JBQUcsT0FBSCxDQUFXLE1BQVgsRUFBbUIsU0FBbkIsRUFBOEIsR0FBOUIsQ0FBa0M7QUFBQTtBQUFBLFFBQUUsS0FBRjtBQUFBLFFBQVMsUUFBVDs7QUFBQSxXQUN2QyxjQUFJLENBQ0YsYUFBYSxLQUFiLENBREUsRUFFRixrQkFBa0IsS0FBbEIsRUFBeUIsUUFBekIsQ0FGRSxFQUdGLGFBQWEsS0FBYixDQUhFLENBQUosQ0FEdUM7QUFBQSxHQUFsQyxDQUFQO0FBT0Q7Ozs7Ozs7O0FDekVELElBQU0sWUFBWSxFQUFsQjtBQUNBLElBQU0sVUFBVSxFQUFoQjs7UUFFUSxTLEdBQUEsUztRQUFXLE8sR0FBQSxPIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIlwidXNlIHN0cmljdFwiO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xudmFyIHhzdHJlYW1fMSA9IHJlcXVpcmUoXCJ4c3RyZWFtXCIpO1xudmFyIGFkYXB0XzEgPSByZXF1aXJlKFwiQGN5Y2xlL3J1bi9saWIvYWRhcHRcIik7XG52YXIgZnJvbUV2ZW50XzEgPSByZXF1aXJlKFwiLi9mcm9tRXZlbnRcIik7XG52YXIgQm9keURPTVNvdXJjZSA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gQm9keURPTVNvdXJjZShfbmFtZSkge1xuICAgICAgICB0aGlzLl9uYW1lID0gX25hbWU7XG4gICAgfVxuICAgIEJvZHlET01Tb3VyY2UucHJvdG90eXBlLnNlbGVjdCA9IGZ1bmN0aW9uIChzZWxlY3Rvcikge1xuICAgICAgICAvLyBUaGlzIGZ1bmN0aW9uYWxpdHkgaXMgc3RpbGwgdW5kZWZpbmVkL3VuZGVjaWRlZC5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcbiAgICBCb2R5RE9NU291cmNlLnByb3RvdHlwZS5lbGVtZW50cyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIG91dCA9IGFkYXB0XzEuYWRhcHQoeHN0cmVhbV8xLmRlZmF1bHQub2YoZG9jdW1lbnQuYm9keSkpO1xuICAgICAgICBvdXQuX2lzQ3ljbGVTb3VyY2UgPSB0aGlzLl9uYW1lO1xuICAgICAgICByZXR1cm4gb3V0O1xuICAgIH07XG4gICAgQm9keURPTVNvdXJjZS5wcm90b3R5cGUuZXZlbnRzID0gZnVuY3Rpb24gKGV2ZW50VHlwZSwgb3B0aW9ucykge1xuICAgICAgICBpZiAob3B0aW9ucyA9PT0gdm9pZCAwKSB7IG9wdGlvbnMgPSB7fTsgfVxuICAgICAgICB2YXIgc3RyZWFtO1xuICAgICAgICBpZiAob3B0aW9ucyAmJiB0eXBlb2Ygb3B0aW9ucy51c2VDYXB0dXJlID09PSAnYm9vbGVhbicpIHtcbiAgICAgICAgICAgIHN0cmVhbSA9IGZyb21FdmVudF8xLmZyb21FdmVudChkb2N1bWVudC5ib2R5LCBldmVudFR5cGUsIG9wdGlvbnMudXNlQ2FwdHVyZSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBzdHJlYW0gPSBmcm9tRXZlbnRfMS5mcm9tRXZlbnQoZG9jdW1lbnQuYm9keSwgZXZlbnRUeXBlKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAob3B0aW9ucyAmJiBvcHRpb25zLnByZXZlbnREZWZhdWx0KSB7XG4gICAgICAgICAgICBzdHJlYW0gPSBzdHJlYW0ubWFwKGZ1bmN0aW9uIChldikge1xuICAgICAgICAgICAgICAgIGV2LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGV2O1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIG91dCA9IGFkYXB0XzEuYWRhcHQoc3RyZWFtKTtcbiAgICAgICAgb3V0Ll9pc0N5Y2xlU291cmNlID0gdGhpcy5fbmFtZTtcbiAgICAgICAgcmV0dXJuIG91dDtcbiAgICB9O1xuICAgIHJldHVybiBCb2R5RE9NU291cmNlO1xufSgpKTtcbmV4cG9ydHMuQm9keURPTVNvdXJjZSA9IEJvZHlET01Tb3VyY2U7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1Cb2R5RE9NU291cmNlLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xudmFyIHhzdHJlYW1fMSA9IHJlcXVpcmUoXCJ4c3RyZWFtXCIpO1xudmFyIGFkYXB0XzEgPSByZXF1aXJlKFwiQGN5Y2xlL3J1bi9saWIvYWRhcHRcIik7XG52YXIgZnJvbUV2ZW50XzEgPSByZXF1aXJlKFwiLi9mcm9tRXZlbnRcIik7XG52YXIgRG9jdW1lbnRET01Tb3VyY2UgPSAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIERvY3VtZW50RE9NU291cmNlKF9uYW1lKSB7XG4gICAgICAgIHRoaXMuX25hbWUgPSBfbmFtZTtcbiAgICB9XG4gICAgRG9jdW1lbnRET01Tb3VyY2UucHJvdG90eXBlLnNlbGVjdCA9IGZ1bmN0aW9uIChzZWxlY3Rvcikge1xuICAgICAgICAvLyBUaGlzIGZ1bmN0aW9uYWxpdHkgaXMgc3RpbGwgdW5kZWZpbmVkL3VuZGVjaWRlZC5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcbiAgICBEb2N1bWVudERPTVNvdXJjZS5wcm90b3R5cGUuZWxlbWVudHMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBvdXQgPSBhZGFwdF8xLmFkYXB0KHhzdHJlYW1fMS5kZWZhdWx0Lm9mKGRvY3VtZW50KSk7XG4gICAgICAgIG91dC5faXNDeWNsZVNvdXJjZSA9IHRoaXMuX25hbWU7XG4gICAgICAgIHJldHVybiBvdXQ7XG4gICAgfTtcbiAgICBEb2N1bWVudERPTVNvdXJjZS5wcm90b3R5cGUuZXZlbnRzID0gZnVuY3Rpb24gKGV2ZW50VHlwZSwgb3B0aW9ucykge1xuICAgICAgICBpZiAob3B0aW9ucyA9PT0gdm9pZCAwKSB7IG9wdGlvbnMgPSB7fTsgfVxuICAgICAgICB2YXIgc3RyZWFtO1xuICAgICAgICBpZiAob3B0aW9ucyAmJiB0eXBlb2Ygb3B0aW9ucy51c2VDYXB0dXJlID09PSAnYm9vbGVhbicpIHtcbiAgICAgICAgICAgIHN0cmVhbSA9IGZyb21FdmVudF8xLmZyb21FdmVudChkb2N1bWVudCwgZXZlbnRUeXBlLCBvcHRpb25zLnVzZUNhcHR1cmUpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgc3RyZWFtID0gZnJvbUV2ZW50XzEuZnJvbUV2ZW50KGRvY3VtZW50LCBldmVudFR5cGUpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChvcHRpb25zICYmIG9wdGlvbnMucHJldmVudERlZmF1bHQpIHtcbiAgICAgICAgICAgIHN0cmVhbSA9IHN0cmVhbS5tYXAoZnVuY3Rpb24gKGV2KSB7XG4gICAgICAgICAgICAgICAgZXYucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZXY7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgb3V0ID0gYWRhcHRfMS5hZGFwdChzdHJlYW0pO1xuICAgICAgICBvdXQuX2lzQ3ljbGVTb3VyY2UgPSB0aGlzLl9uYW1lO1xuICAgICAgICByZXR1cm4gb3V0O1xuICAgIH07XG4gICAgcmV0dXJuIERvY3VtZW50RE9NU291cmNlO1xufSgpKTtcbmV4cG9ydHMuRG9jdW1lbnRET01Tb3VyY2UgPSBEb2N1bWVudERPTVNvdXJjZTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPURvY3VtZW50RE9NU291cmNlLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xudmFyIFNjb3BlQ2hlY2tlcl8xID0gcmVxdWlyZShcIi4vU2NvcGVDaGVja2VyXCIpO1xudmFyIHV0aWxzXzEgPSByZXF1aXJlKFwiLi91dGlsc1wiKTtcbnZhciBtYXRjaGVzU2VsZWN0b3JfMSA9IHJlcXVpcmUoXCIuL21hdGNoZXNTZWxlY3RvclwiKTtcbmZ1bmN0aW9uIHRvRWxBcnJheShpbnB1dCkge1xuICAgIHJldHVybiBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChpbnB1dCk7XG59XG52YXIgRWxlbWVudEZpbmRlciA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gRWxlbWVudEZpbmRlcihuYW1lc3BhY2UsIGlzb2xhdGVNb2R1bGUpIHtcbiAgICAgICAgdGhpcy5uYW1lc3BhY2UgPSBuYW1lc3BhY2U7XG4gICAgICAgIHRoaXMuaXNvbGF0ZU1vZHVsZSA9IGlzb2xhdGVNb2R1bGU7XG4gICAgfVxuICAgIEVsZW1lbnRGaW5kZXIucHJvdG90eXBlLmNhbGwgPSBmdW5jdGlvbiAocm9vdEVsZW1lbnQpIHtcbiAgICAgICAgdmFyIG5hbWVzcGFjZSA9IHRoaXMubmFtZXNwYWNlO1xuICAgICAgICB2YXIgc2VsZWN0b3IgPSB1dGlsc18xLmdldFNlbGVjdG9ycyhuYW1lc3BhY2UpO1xuICAgICAgICBpZiAoIXNlbGVjdG9yKSB7XG4gICAgICAgICAgICByZXR1cm4gcm9vdEVsZW1lbnQ7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGZ1bGxTY29wZSA9IHV0aWxzXzEuZ2V0RnVsbFNjb3BlKG5hbWVzcGFjZSk7XG4gICAgICAgIHZhciBzY29wZUNoZWNrZXIgPSBuZXcgU2NvcGVDaGVja2VyXzEuU2NvcGVDaGVja2VyKGZ1bGxTY29wZSwgdGhpcy5pc29sYXRlTW9kdWxlKTtcbiAgICAgICAgdmFyIHRvcE5vZGUgPSBmdWxsU2NvcGUgP1xuICAgICAgICAgICAgdGhpcy5pc29sYXRlTW9kdWxlLmdldEVsZW1lbnQoZnVsbFNjb3BlKSB8fCByb290RWxlbWVudCA6XG4gICAgICAgICAgICByb290RWxlbWVudDtcbiAgICAgICAgdmFyIHRvcE5vZGVNYXRjaGVzU2VsZWN0b3IgPSAhIWZ1bGxTY29wZSAmJiAhIXNlbGVjdG9yICYmIG1hdGNoZXNTZWxlY3Rvcl8xLm1hdGNoZXNTZWxlY3Rvcih0b3BOb2RlLCBzZWxlY3Rvcik7XG4gICAgICAgIHJldHVybiB0b0VsQXJyYXkodG9wTm9kZS5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKSlcbiAgICAgICAgICAgIC5maWx0ZXIoc2NvcGVDaGVja2VyLmlzRGlyZWN0bHlJblNjb3BlLCBzY29wZUNoZWNrZXIpXG4gICAgICAgICAgICAuY29uY2F0KHRvcE5vZGVNYXRjaGVzU2VsZWN0b3IgPyBbdG9wTm9kZV0gOiBbXSk7XG4gICAgfTtcbiAgICByZXR1cm4gRWxlbWVudEZpbmRlcjtcbn0oKSk7XG5leHBvcnRzLkVsZW1lbnRGaW5kZXIgPSBFbGVtZW50RmluZGVyO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9RWxlbWVudEZpbmRlci5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcbnZhciB4c3RyZWFtXzEgPSByZXF1aXJlKFwieHN0cmVhbVwiKTtcbnZhciBTY29wZUNoZWNrZXJfMSA9IHJlcXVpcmUoXCIuL1Njb3BlQ2hlY2tlclwiKTtcbnZhciB1dGlsc18xID0gcmVxdWlyZShcIi4vdXRpbHNcIik7XG52YXIgbWF0Y2hlc1NlbGVjdG9yXzEgPSByZXF1aXJlKFwiLi9tYXRjaGVzU2VsZWN0b3JcIik7XG4vKipcbiAqIEZpbmRzICh3aXRoIGJpbmFyeSBzZWFyY2gpIGluZGV4IG9mIHRoZSBkZXN0aW5hdGlvbiB0aGF0IGlkIGVxdWFsIHRvIHNlYXJjaElkXG4gKiBhbW9uZyB0aGUgZGVzdGluYXRpb25zIGluIHRoZSBnaXZlbiBhcnJheS5cbiAqL1xuZnVuY3Rpb24gaW5kZXhPZihhcnIsIHNlYXJjaElkKSB7XG4gICAgdmFyIG1pbkluZGV4ID0gMDtcbiAgICB2YXIgbWF4SW5kZXggPSBhcnIubGVuZ3RoIC0gMTtcbiAgICB2YXIgY3VycmVudEluZGV4O1xuICAgIHZhciBjdXJyZW50O1xuICAgIHdoaWxlIChtaW5JbmRleCA8PSBtYXhJbmRleCkge1xuICAgICAgICBjdXJyZW50SW5kZXggPSAobWluSW5kZXggKyBtYXhJbmRleCkgLyAyIHwgMDsgLy8gdHNsaW50OmRpc2FibGUtbGluZTpuby1iaXR3aXNlXG4gICAgICAgIGN1cnJlbnQgPSBhcnJbY3VycmVudEluZGV4XTtcbiAgICAgICAgdmFyIGN1cnJlbnRJZCA9IGN1cnJlbnQuaWQ7XG4gICAgICAgIGlmIChjdXJyZW50SWQgPCBzZWFyY2hJZCkge1xuICAgICAgICAgICAgbWluSW5kZXggPSBjdXJyZW50SW5kZXggKyAxO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGN1cnJlbnRJZCA+IHNlYXJjaElkKSB7XG4gICAgICAgICAgICBtYXhJbmRleCA9IGN1cnJlbnRJbmRleCAtIDE7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gY3VycmVudEluZGV4O1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiAtMTtcbn1cbi8qKlxuICogTWFuYWdlcyBcIkV2ZW50IGRlbGVnYXRpb25cIiwgYnkgY29ubmVjdGluZyBhbiBvcmlnaW4gd2l0aCBtdWx0aXBsZVxuICogZGVzdGluYXRpb25zLlxuICpcbiAqIEF0dGFjaGVzIGEgRE9NIGV2ZW50IGxpc3RlbmVyIHRvIHRoZSBET00gZWxlbWVudCBjYWxsZWQgdGhlIFwib3JpZ2luXCIsXG4gKiBhbmQgZGVsZWdhdGVzIGV2ZW50cyB0byBcImRlc3RpbmF0aW9uc1wiLCB3aGljaCBhcmUgc3ViamVjdHMgYXMgb3V0cHV0c1xuICogZm9yIHRoZSBET01Tb3VyY2UuIFNpbXVsYXRlcyBidWJibGluZyBvciBjYXB0dXJpbmcsIHdpdGggcmVnYXJkcyB0b1xuICogaXNvbGF0aW9uIGJvdW5kYXJpZXMgdG9vLlxuICovXG52YXIgRXZlbnREZWxlZ2F0b3IgPSAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIEV2ZW50RGVsZWdhdG9yKG9yaWdpbiwgZXZlbnRUeXBlLCB1c2VDYXB0dXJlLCBpc29sYXRlTW9kdWxlKSB7XG4gICAgICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgICAgIHRoaXMub3JpZ2luID0gb3JpZ2luO1xuICAgICAgICB0aGlzLmV2ZW50VHlwZSA9IGV2ZW50VHlwZTtcbiAgICAgICAgdGhpcy51c2VDYXB0dXJlID0gdXNlQ2FwdHVyZTtcbiAgICAgICAgdGhpcy5pc29sYXRlTW9kdWxlID0gaXNvbGF0ZU1vZHVsZTtcbiAgICAgICAgdGhpcy5kZXN0aW5hdGlvbnMgPSBbXTtcbiAgICAgICAgdGhpcy5fbGFzdElkID0gMDtcbiAgICAgICAgaWYgKHVzZUNhcHR1cmUpIHtcbiAgICAgICAgICAgIHRoaXMubGlzdGVuZXIgPSBmdW5jdGlvbiAoZXYpIHsgcmV0dXJuIF90aGlzLmNhcHR1cmUoZXYpOyB9O1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5saXN0ZW5lciA9IGZ1bmN0aW9uIChldikgeyByZXR1cm4gX3RoaXMuYnViYmxlKGV2KTsgfTtcbiAgICAgICAgfVxuICAgICAgICBvcmlnaW4uYWRkRXZlbnRMaXN0ZW5lcihldmVudFR5cGUsIHRoaXMubGlzdGVuZXIsIHVzZUNhcHR1cmUpO1xuICAgIH1cbiAgICBFdmVudERlbGVnYXRvci5wcm90b3R5cGUudXBkYXRlT3JpZ2luID0gZnVuY3Rpb24gKG5ld09yaWdpbikge1xuICAgICAgICB0aGlzLm9yaWdpbi5yZW1vdmVFdmVudExpc3RlbmVyKHRoaXMuZXZlbnRUeXBlLCB0aGlzLmxpc3RlbmVyLCB0aGlzLnVzZUNhcHR1cmUpO1xuICAgICAgICBuZXdPcmlnaW4uYWRkRXZlbnRMaXN0ZW5lcih0aGlzLmV2ZW50VHlwZSwgdGhpcy5saXN0ZW5lciwgdGhpcy51c2VDYXB0dXJlKTtcbiAgICAgICAgdGhpcy5vcmlnaW4gPSBuZXdPcmlnaW47XG4gICAgfTtcbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGEgKm5ldyogZGVzdGluYXRpb24gZ2l2ZW4gdGhlIG5hbWVzcGFjZSBhbmQgcmV0dXJucyB0aGUgc3ViamVjdFxuICAgICAqIHJlcHJlc2VudGluZyB0aGUgZGVzdGluYXRpb24gb2YgZXZlbnRzLiBJcyBub3QgcmVmZXJlbnRpYWxseSB0cmFuc3BhcmVudCxcbiAgICAgKiB3aWxsIGFsd2F5cyByZXR1cm4gYSBkaWZmZXJlbnQgb3V0cHV0IGZvciB0aGUgc2FtZSBpbnB1dC5cbiAgICAgKi9cbiAgICBFdmVudERlbGVnYXRvci5wcm90b3R5cGUuY3JlYXRlRGVzdGluYXRpb24gPSBmdW5jdGlvbiAobmFtZXNwYWNlKSB7XG4gICAgICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgICAgIHZhciBpZCA9IHRoaXMuX2xhc3RJZCsrO1xuICAgICAgICB2YXIgc2VsZWN0b3IgPSB1dGlsc18xLmdldFNlbGVjdG9ycyhuYW1lc3BhY2UpO1xuICAgICAgICB2YXIgc2NvcGVDaGVja2VyID0gbmV3IFNjb3BlQ2hlY2tlcl8xLlNjb3BlQ2hlY2tlcih1dGlsc18xLmdldEZ1bGxTY29wZShuYW1lc3BhY2UpLCB0aGlzLmlzb2xhdGVNb2R1bGUpO1xuICAgICAgICB2YXIgc3ViamVjdCA9IHhzdHJlYW1fMS5kZWZhdWx0LmNyZWF0ZSh7XG4gICAgICAgICAgICBzdGFydDogZnVuY3Rpb24gKCkgeyB9LFxuICAgICAgICAgICAgc3RvcDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGlmICgncmVxdWVzdElkbGVDYWxsYmFjaycgaW4gd2luZG93KSB7XG4gICAgICAgICAgICAgICAgICAgIHJlcXVlc3RJZGxlQ2FsbGJhY2soZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgX3RoaXMucmVtb3ZlRGVzdGluYXRpb24oaWQpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIF90aGlzLnJlbW92ZURlc3RpbmF0aW9uKGlkKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICAgICAgdmFyIGRlc3RpbmF0aW9uID0geyBpZDogaWQsIHNlbGVjdG9yOiBzZWxlY3Rvciwgc2NvcGVDaGVja2VyOiBzY29wZUNoZWNrZXIsIHN1YmplY3Q6IHN1YmplY3QgfTtcbiAgICAgICAgdGhpcy5kZXN0aW5hdGlvbnMucHVzaChkZXN0aW5hdGlvbik7XG4gICAgICAgIHJldHVybiBzdWJqZWN0O1xuICAgIH07XG4gICAgLyoqXG4gICAgICogUmVtb3ZlcyB0aGUgZGVzdGluYXRpb24gdGhhdCBoYXMgdGhlIGdpdmVuIGlkLlxuICAgICAqL1xuICAgIEV2ZW50RGVsZWdhdG9yLnByb3RvdHlwZS5yZW1vdmVEZXN0aW5hdGlvbiA9IGZ1bmN0aW9uIChpZCkge1xuICAgICAgICB2YXIgaSA9IGluZGV4T2YodGhpcy5kZXN0aW5hdGlvbnMsIGlkKTtcbiAgICAgICAgaSA+PSAwICYmIHRoaXMuZGVzdGluYXRpb25zLnNwbGljZShpLCAxKTsgLy8gdHNsaW50OmRpc2FibGUtbGluZTpuby11bnVzZWQtZXhwcmVzc2lvblxuICAgIH07XG4gICAgRXZlbnREZWxlZ2F0b3IucHJvdG90eXBlLmNhcHR1cmUgPSBmdW5jdGlvbiAoZXYpIHtcbiAgICAgICAgdmFyIG4gPSB0aGlzLmRlc3RpbmF0aW9ucy5sZW5ndGg7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbjsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgZGVzdCA9IHRoaXMuZGVzdGluYXRpb25zW2ldO1xuICAgICAgICAgICAgaWYgKG1hdGNoZXNTZWxlY3Rvcl8xLm1hdGNoZXNTZWxlY3Rvcihldi50YXJnZXQsIGRlc3Quc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgZGVzdC5zdWJqZWN0Ll9uKGV2KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG4gICAgRXZlbnREZWxlZ2F0b3IucHJvdG90eXBlLmJ1YmJsZSA9IGZ1bmN0aW9uIChyYXdFdmVudCkge1xuICAgICAgICB2YXIgb3JpZ2luID0gdGhpcy5vcmlnaW47XG4gICAgICAgIGlmICghb3JpZ2luLmNvbnRhaW5zKHJhd0V2ZW50LmN1cnJlbnRUYXJnZXQpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHJvb2YgPSBvcmlnaW4ucGFyZW50RWxlbWVudDtcbiAgICAgICAgdmFyIGV2ID0gdGhpcy5wYXRjaEV2ZW50KHJhd0V2ZW50KTtcbiAgICAgICAgZm9yICh2YXIgZWwgPSBldi50YXJnZXQ7IGVsICYmIGVsICE9PSByb29mOyBlbCA9IGVsLnBhcmVudEVsZW1lbnQpIHtcbiAgICAgICAgICAgIGlmICghb3JpZ2luLmNvbnRhaW5zKGVsKSkge1xuICAgICAgICAgICAgICAgIGV2LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGV2LnByb3BhZ2F0aW9uSGFzQmVlblN0b3BwZWQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLm1hdGNoRXZlbnRBZ2FpbnN0RGVzdGluYXRpb25zKGVsLCBldik7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIEV2ZW50RGVsZWdhdG9yLnByb3RvdHlwZS5wYXRjaEV2ZW50ID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgIHZhciBwRXZlbnQgPSBldmVudDtcbiAgICAgICAgcEV2ZW50LnByb3BhZ2F0aW9uSGFzQmVlblN0b3BwZWQgPSBmYWxzZTtcbiAgICAgICAgdmFyIG9sZFN0b3BQcm9wYWdhdGlvbiA9IHBFdmVudC5zdG9wUHJvcGFnYXRpb247XG4gICAgICAgIHBFdmVudC5zdG9wUHJvcGFnYXRpb24gPSBmdW5jdGlvbiBzdG9wUHJvcGFnYXRpb24oKSB7XG4gICAgICAgICAgICBvbGRTdG9wUHJvcGFnYXRpb24uY2FsbCh0aGlzKTtcbiAgICAgICAgICAgIHRoaXMucHJvcGFnYXRpb25IYXNCZWVuU3RvcHBlZCA9IHRydWU7XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiBwRXZlbnQ7XG4gICAgfTtcbiAgICBFdmVudERlbGVnYXRvci5wcm90b3R5cGUubWF0Y2hFdmVudEFnYWluc3REZXN0aW5hdGlvbnMgPSBmdW5jdGlvbiAoZWwsIGV2KSB7XG4gICAgICAgIHZhciBuID0gdGhpcy5kZXN0aW5hdGlvbnMubGVuZ3RoO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG47IGkrKykge1xuICAgICAgICAgICAgdmFyIGRlc3QgPSB0aGlzLmRlc3RpbmF0aW9uc1tpXTtcbiAgICAgICAgICAgIGlmICghZGVzdC5zY29wZUNoZWNrZXIuaXNEaXJlY3RseUluU2NvcGUoZWwpKSB7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobWF0Y2hlc1NlbGVjdG9yXzEubWF0Y2hlc1NlbGVjdG9yKGVsLCBkZXN0LnNlbGVjdG9yKSkge1xuICAgICAgICAgICAgICAgIHRoaXMubXV0YXRlRXZlbnRDdXJyZW50VGFyZ2V0KGV2LCBlbCk7XG4gICAgICAgICAgICAgICAgZGVzdC5zdWJqZWN0Ll9uKGV2KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG4gICAgRXZlbnREZWxlZ2F0b3IucHJvdG90eXBlLm11dGF0ZUV2ZW50Q3VycmVudFRhcmdldCA9IGZ1bmN0aW9uIChldmVudCwgY3VycmVudFRhcmdldEVsZW1lbnQpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShldmVudCwgXCJjdXJyZW50VGFyZ2V0XCIsIHtcbiAgICAgICAgICAgICAgICB2YWx1ZTogY3VycmVudFRhcmdldEVsZW1lbnQsXG4gICAgICAgICAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJwbGVhc2UgdXNlIGV2ZW50Lm93bmVyVGFyZ2V0XCIpO1xuICAgICAgICB9XG4gICAgICAgIGV2ZW50Lm93bmVyVGFyZ2V0ID0gY3VycmVudFRhcmdldEVsZW1lbnQ7XG4gICAgfTtcbiAgICByZXR1cm4gRXZlbnREZWxlZ2F0b3I7XG59KCkpO1xuZXhwb3J0cy5FdmVudERlbGVnYXRvciA9IEV2ZW50RGVsZWdhdG9yO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9RXZlbnREZWxlZ2F0b3IuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XG52YXIgTWFwUG9seWZpbGwgPSByZXF1aXJlKCdlczYtbWFwJyk7XG52YXIgSXNvbGF0ZU1vZHVsZSA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gSXNvbGF0ZU1vZHVsZSgpIHtcbiAgICAgICAgdGhpcy5lbGVtZW50c0J5RnVsbFNjb3BlID0gbmV3IE1hcFBvbHlmaWxsKCk7XG4gICAgICAgIHRoaXMuZGVsZWdhdG9yc0J5RnVsbFNjb3BlID0gbmV3IE1hcFBvbHlmaWxsKCk7XG4gICAgICAgIHRoaXMuZnVsbFNjb3Blc0JlaW5nVXBkYXRlZCA9IFtdO1xuICAgIH1cbiAgICBJc29sYXRlTW9kdWxlLnByb3RvdHlwZS5jbGVhbnVwVk5vZGUgPSBmdW5jdGlvbiAoX2EpIHtcbiAgICAgICAgdmFyIGRhdGEgPSBfYS5kYXRhLCBlbG0gPSBfYS5lbG07XG4gICAgICAgIHZhciBmdWxsU2NvcGUgPSAoZGF0YSB8fCB7fSkuaXNvbGF0ZSB8fCAnJztcbiAgICAgICAgdmFyIGlzQ3VycmVudEVsbSA9IHRoaXMuZWxlbWVudHNCeUZ1bGxTY29wZS5nZXQoZnVsbFNjb3BlKSA9PT0gZWxtO1xuICAgICAgICB2YXIgaXNTY29wZUJlaW5nVXBkYXRlZCA9IHRoaXMuZnVsbFNjb3Blc0JlaW5nVXBkYXRlZC5pbmRleE9mKGZ1bGxTY29wZSkgPj0gMDtcbiAgICAgICAgaWYgKGZ1bGxTY29wZSAmJiBpc0N1cnJlbnRFbG0gJiYgIWlzU2NvcGVCZWluZ1VwZGF0ZWQpIHtcbiAgICAgICAgICAgIHRoaXMuZWxlbWVudHNCeUZ1bGxTY29wZS5kZWxldGUoZnVsbFNjb3BlKTtcbiAgICAgICAgICAgIHRoaXMuZGVsZWdhdG9yc0J5RnVsbFNjb3BlLmRlbGV0ZShmdWxsU2NvcGUpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBJc29sYXRlTW9kdWxlLnByb3RvdHlwZS5nZXRFbGVtZW50ID0gZnVuY3Rpb24gKGZ1bGxTY29wZSkge1xuICAgICAgICByZXR1cm4gdGhpcy5lbGVtZW50c0J5RnVsbFNjb3BlLmdldChmdWxsU2NvcGUpO1xuICAgIH07XG4gICAgSXNvbGF0ZU1vZHVsZS5wcm90b3R5cGUuZ2V0RnVsbFNjb3BlID0gZnVuY3Rpb24gKGVsbSkge1xuICAgICAgICB2YXIgaXRlcmF0b3IgPSB0aGlzLmVsZW1lbnRzQnlGdWxsU2NvcGUuZW50cmllcygpO1xuICAgICAgICBmb3IgKHZhciByZXN1bHQgPSBpdGVyYXRvci5uZXh0KCk7ICEhcmVzdWx0LnZhbHVlOyByZXN1bHQgPSBpdGVyYXRvci5uZXh0KCkpIHtcbiAgICAgICAgICAgIHZhciBfYSA9IHJlc3VsdC52YWx1ZSwgZnVsbFNjb3BlID0gX2FbMF0sIGVsZW1lbnQgPSBfYVsxXTtcbiAgICAgICAgICAgIGlmIChlbG0gPT09IGVsZW1lbnQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZnVsbFNjb3BlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiAnJztcbiAgICB9O1xuICAgIElzb2xhdGVNb2R1bGUucHJvdG90eXBlLmFkZEV2ZW50RGVsZWdhdG9yID0gZnVuY3Rpb24gKGZ1bGxTY29wZSwgZXZlbnREZWxlZ2F0b3IpIHtcbiAgICAgICAgdmFyIGRlbGVnYXRvcnMgPSB0aGlzLmRlbGVnYXRvcnNCeUZ1bGxTY29wZS5nZXQoZnVsbFNjb3BlKTtcbiAgICAgICAgaWYgKCFkZWxlZ2F0b3JzKSB7XG4gICAgICAgICAgICBkZWxlZ2F0b3JzID0gW107XG4gICAgICAgICAgICB0aGlzLmRlbGVnYXRvcnNCeUZ1bGxTY29wZS5zZXQoZnVsbFNjb3BlLCBkZWxlZ2F0b3JzKTtcbiAgICAgICAgfVxuICAgICAgICBkZWxlZ2F0b3JzW2RlbGVnYXRvcnMubGVuZ3RoXSA9IGV2ZW50RGVsZWdhdG9yO1xuICAgIH07XG4gICAgSXNvbGF0ZU1vZHVsZS5wcm90b3R5cGUucmVzZXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuZWxlbWVudHNCeUZ1bGxTY29wZS5jbGVhcigpO1xuICAgICAgICB0aGlzLmRlbGVnYXRvcnNCeUZ1bGxTY29wZS5jbGVhcigpO1xuICAgICAgICB0aGlzLmZ1bGxTY29wZXNCZWluZ1VwZGF0ZWQgPSBbXTtcbiAgICB9O1xuICAgIElzb2xhdGVNb2R1bGUucHJvdG90eXBlLmNyZWF0ZU1vZHVsZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgY3JlYXRlOiBmdW5jdGlvbiAob2xkVk5vZGUsIHZOb2RlKSB7XG4gICAgICAgICAgICAgICAgdmFyIF9hID0gb2xkVk5vZGUuZGF0YSwgb2xkRGF0YSA9IF9hID09PSB2b2lkIDAgPyB7fSA6IF9hO1xuICAgICAgICAgICAgICAgIHZhciBlbG0gPSB2Tm9kZS5lbG0sIF9iID0gdk5vZGUuZGF0YSwgZGF0YSA9IF9iID09PSB2b2lkIDAgPyB7fSA6IF9iO1xuICAgICAgICAgICAgICAgIHZhciBvbGRGdWxsU2NvcGUgPSBvbGREYXRhLmlzb2xhdGUgfHwgJyc7XG4gICAgICAgICAgICAgICAgdmFyIGZ1bGxTY29wZSA9IGRhdGEuaXNvbGF0ZSB8fCAnJztcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgZGF0YSBzdHJ1Y3R1cmVzIHdpdGggdGhlIG5ld2x5LWNyZWF0ZWQgZWxlbWVudFxuICAgICAgICAgICAgICAgIGlmIChmdWxsU2NvcGUpIHtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5mdWxsU2NvcGVzQmVpbmdVcGRhdGVkLnB1c2goZnVsbFNjb3BlKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG9sZEZ1bGxTY29wZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5lbGVtZW50c0J5RnVsbFNjb3BlLmRlbGV0ZShvbGRGdWxsU2NvcGUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHNlbGYuZWxlbWVudHNCeUZ1bGxTY29wZS5zZXQoZnVsbFNjb3BlLCBlbG0pO1xuICAgICAgICAgICAgICAgICAgICAvLyBVcGRhdGUgZGVsZWdhdG9ycyBmb3IgdGhpcyBzY29wZVxuICAgICAgICAgICAgICAgICAgICB2YXIgZGVsZWdhdG9ycyA9IHNlbGYuZGVsZWdhdG9yc0J5RnVsbFNjb3BlLmdldChmdWxsU2NvcGUpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZGVsZWdhdG9ycykge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGxlbiA9IGRlbGVnYXRvcnMubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47ICsraSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlbGVnYXRvcnNbaV0udXBkYXRlT3JpZ2luKGVsbSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKG9sZEZ1bGxTY29wZSAmJiAhZnVsbFNjb3BlKSB7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYuZWxlbWVudHNCeUZ1bGxTY29wZS5kZWxldGUoZnVsbFNjb3BlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdXBkYXRlOiBmdW5jdGlvbiAob2xkVk5vZGUsIHZOb2RlKSB7XG4gICAgICAgICAgICAgICAgdmFyIF9hID0gb2xkVk5vZGUuZGF0YSwgb2xkRGF0YSA9IF9hID09PSB2b2lkIDAgPyB7fSA6IF9hO1xuICAgICAgICAgICAgICAgIHZhciBlbG0gPSB2Tm9kZS5lbG0sIF9iID0gdk5vZGUuZGF0YSwgZGF0YSA9IF9iID09PSB2b2lkIDAgPyB7fSA6IF9iO1xuICAgICAgICAgICAgICAgIHZhciBvbGRGdWxsU2NvcGUgPSBvbGREYXRhLmlzb2xhdGUgfHwgJyc7XG4gICAgICAgICAgICAgICAgdmFyIGZ1bGxTY29wZSA9IGRhdGEuaXNvbGF0ZSB8fCAnJztcbiAgICAgICAgICAgICAgICAvLyBTYW1lIGVsZW1lbnQsIGJ1dCBkaWZmZXJlbnQgc2NvcGUsIHNvIHVwZGF0ZSB0aGUgZGF0YSBzdHJ1Y3R1cmVzXG4gICAgICAgICAgICAgICAgaWYgKGZ1bGxTY29wZSAmJiBmdWxsU2NvcGUgIT09IG9sZEZ1bGxTY29wZSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAob2xkRnVsbFNjb3BlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxmLmVsZW1lbnRzQnlGdWxsU2NvcGUuZGVsZXRlKG9sZEZ1bGxTY29wZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgc2VsZi5lbGVtZW50c0J5RnVsbFNjb3BlLnNldChmdWxsU2NvcGUsIGVsbSk7XG4gICAgICAgICAgICAgICAgICAgIHZhciBkZWxlZ2F0b3JzID0gc2VsZi5kZWxlZ2F0b3JzQnlGdWxsU2NvcGUuZ2V0KG9sZEZ1bGxTY29wZSk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChkZWxlZ2F0b3JzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxmLmRlbGVnYXRvcnNCeUZ1bGxTY29wZS5kZWxldGUob2xkRnVsbFNjb3BlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuZGVsZWdhdG9yc0J5RnVsbFNjb3BlLnNldChmdWxsU2NvcGUsIGRlbGVnYXRvcnMpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIFNhbWUgZWxlbWVudCwgYnV0IGxvc3QgdGhlIHNjb3BlLCBzbyB1cGRhdGUgdGhlIGRhdGEgc3RydWN0dXJlc1xuICAgICAgICAgICAgICAgIGlmIChvbGRGdWxsU2NvcGUgJiYgIWZ1bGxTY29wZSkge1xuICAgICAgICAgICAgICAgICAgICBzZWxmLmVsZW1lbnRzQnlGdWxsU2NvcGUuZGVsZXRlKG9sZEZ1bGxTY29wZSk7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYuZGVsZWdhdG9yc0J5RnVsbFNjb3BlLmRlbGV0ZShvbGRGdWxsU2NvcGUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBkZXN0cm95OiBmdW5jdGlvbiAodk5vZGUpIHtcbiAgICAgICAgICAgICAgICBzZWxmLmNsZWFudXBWTm9kZSh2Tm9kZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcmVtb3ZlOiBmdW5jdGlvbiAodk5vZGUsIGNiKSB7XG4gICAgICAgICAgICAgICAgc2VsZi5jbGVhbnVwVk5vZGUodk5vZGUpO1xuICAgICAgICAgICAgICAgIGNiKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcG9zdDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHNlbGYuZnVsbFNjb3Blc0JlaW5nVXBkYXRlZCA9IFtdO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfTtcbiAgICB9O1xuICAgIHJldHVybiBJc29sYXRlTW9kdWxlO1xufSgpKTtcbmV4cG9ydHMuSXNvbGF0ZU1vZHVsZSA9IElzb2xhdGVNb2R1bGU7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1Jc29sYXRlTW9kdWxlLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xudmFyIGFkYXB0XzEgPSByZXF1aXJlKFwiQGN5Y2xlL3J1bi9saWIvYWRhcHRcIik7XG52YXIgRG9jdW1lbnRET01Tb3VyY2VfMSA9IHJlcXVpcmUoXCIuL0RvY3VtZW50RE9NU291cmNlXCIpO1xudmFyIEJvZHlET01Tb3VyY2VfMSA9IHJlcXVpcmUoXCIuL0JvZHlET01Tb3VyY2VcIik7XG52YXIgRWxlbWVudEZpbmRlcl8xID0gcmVxdWlyZShcIi4vRWxlbWVudEZpbmRlclwiKTtcbnZhciBmcm9tRXZlbnRfMSA9IHJlcXVpcmUoXCIuL2Zyb21FdmVudFwiKTtcbnZhciBpc29sYXRlXzEgPSByZXF1aXJlKFwiLi9pc29sYXRlXCIpO1xudmFyIEV2ZW50RGVsZWdhdG9yXzEgPSByZXF1aXJlKFwiLi9FdmVudERlbGVnYXRvclwiKTtcbnZhciB1dGlsc18xID0gcmVxdWlyZShcIi4vdXRpbHNcIik7XG52YXIgZXZlbnRUeXBlc1RoYXREb250QnViYmxlID0gW1xuICAgIFwiYmx1clwiLFxuICAgIFwiY2FucGxheVwiLFxuICAgIFwiY2FucGxheXRocm91Z2hcIixcbiAgICBcImNoYW5nZVwiLFxuICAgIFwiZHVyYXRpb25jaGFuZ2VcIixcbiAgICBcImVtcHRpZWRcIixcbiAgICBcImVuZGVkXCIsXG4gICAgXCJmb2N1c1wiLFxuICAgIFwibG9hZFwiLFxuICAgIFwibG9hZGVkZGF0YVwiLFxuICAgIFwibG9hZGVkbWV0YWRhdGFcIixcbiAgICBcIm1vdXNlZW50ZXJcIixcbiAgICBcIm1vdXNlbGVhdmVcIixcbiAgICBcInBhdXNlXCIsXG4gICAgXCJwbGF5XCIsXG4gICAgXCJwbGF5aW5nXCIsXG4gICAgXCJyYXRlY2hhbmdlXCIsXG4gICAgXCJyZXNldFwiLFxuICAgIFwic2Nyb2xsXCIsXG4gICAgXCJzZWVrZWRcIixcbiAgICBcInNlZWtpbmdcIixcbiAgICBcInN0YWxsZWRcIixcbiAgICBcInN1Ym1pdFwiLFxuICAgIFwic3VzcGVuZFwiLFxuICAgIFwidGltZXVwZGF0ZVwiLFxuICAgIFwidW5sb2FkXCIsXG4gICAgXCJ2b2x1bWVjaGFuZ2VcIixcbiAgICBcIndhaXRpbmdcIixcbl07XG5mdW5jdGlvbiBkZXRlcm1pbmVVc2VDYXB0dXJlKGV2ZW50VHlwZSwgb3B0aW9ucykge1xuICAgIHZhciByZXN1bHQgPSBmYWxzZTtcbiAgICBpZiAodHlwZW9mIG9wdGlvbnMudXNlQ2FwdHVyZSA9PT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgIHJlc3VsdCA9IG9wdGlvbnMudXNlQ2FwdHVyZTtcbiAgICB9XG4gICAgaWYgKGV2ZW50VHlwZXNUaGF0RG9udEJ1YmJsZS5pbmRleE9mKGV2ZW50VHlwZSkgIT09IC0xKSB7XG4gICAgICAgIHJlc3VsdCA9IHRydWU7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG59XG5mdW5jdGlvbiBmaWx0ZXJCYXNlZE9uSXNvbGF0aW9uKGRvbVNvdXJjZSwgZnVsbFNjb3BlKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIGZpbHRlckJhc2VkT25Jc29sYXRpb25PcGVyYXRvcihyb290RWxlbWVudCQpIHtcbiAgICAgICAgdmFyIGluaXRpYWxTdGF0ZSA9IHtcbiAgICAgICAgICAgIHdhc0lzb2xhdGVkOiBmYWxzZSxcbiAgICAgICAgICAgIHNob3VsZFBhc3M6IGZhbHNlLFxuICAgICAgICAgICAgZWxlbWVudDogbnVsbCxcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIHJvb3RFbGVtZW50JFxuICAgICAgICAgICAgLmZvbGQoZnVuY3Rpb24gY2hlY2tJZlNob3VsZFBhc3Moc3RhdGUsIGVsZW1lbnQpIHtcbiAgICAgICAgICAgIHZhciBpc0lzb2xhdGVkID0gISFkb21Tb3VyY2UuX2lzb2xhdGVNb2R1bGUuZ2V0RWxlbWVudChmdWxsU2NvcGUpO1xuICAgICAgICAgICAgc3RhdGUuc2hvdWxkUGFzcyA9IGlzSXNvbGF0ZWQgJiYgIXN0YXRlLndhc0lzb2xhdGVkO1xuICAgICAgICAgICAgc3RhdGUud2FzSXNvbGF0ZWQgPSBpc0lzb2xhdGVkO1xuICAgICAgICAgICAgc3RhdGUuZWxlbWVudCA9IGVsZW1lbnQ7XG4gICAgICAgICAgICByZXR1cm4gc3RhdGU7XG4gICAgICAgIH0sIGluaXRpYWxTdGF0ZSlcbiAgICAgICAgICAgIC5kcm9wKDEpXG4gICAgICAgICAgICAuZmlsdGVyKGZ1bmN0aW9uIChzKSB7IHJldHVybiBzLnNob3VsZFBhc3M7IH0pXG4gICAgICAgICAgICAubWFwKGZ1bmN0aW9uIChzKSB7IHJldHVybiBzLmVsZW1lbnQ7IH0pO1xuICAgIH07XG59XG52YXIgTWFpbkRPTVNvdXJjZSA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gTWFpbkRPTVNvdXJjZShfcm9vdEVsZW1lbnQkLCBfc2FuaXRhdGlvbiQsIF9uYW1lc3BhY2UsIF9pc29sYXRlTW9kdWxlLCBfZGVsZWdhdG9ycywgX25hbWUpIHtcbiAgICAgICAgaWYgKF9uYW1lc3BhY2UgPT09IHZvaWQgMCkgeyBfbmFtZXNwYWNlID0gW107IH1cbiAgICAgICAgdmFyIF90aGlzID0gdGhpcztcbiAgICAgICAgdGhpcy5fcm9vdEVsZW1lbnQkID0gX3Jvb3RFbGVtZW50JDtcbiAgICAgICAgdGhpcy5fc2FuaXRhdGlvbiQgPSBfc2FuaXRhdGlvbiQ7XG4gICAgICAgIHRoaXMuX25hbWVzcGFjZSA9IF9uYW1lc3BhY2U7XG4gICAgICAgIHRoaXMuX2lzb2xhdGVNb2R1bGUgPSBfaXNvbGF0ZU1vZHVsZTtcbiAgICAgICAgdGhpcy5fZGVsZWdhdG9ycyA9IF9kZWxlZ2F0b3JzO1xuICAgICAgICB0aGlzLl9uYW1lID0gX25hbWU7XG4gICAgICAgIHRoaXMuaXNvbGF0ZVNvdXJjZSA9IGlzb2xhdGVfMS5pc29sYXRlU291cmNlO1xuICAgICAgICB0aGlzLmlzb2xhdGVTaW5rID0gZnVuY3Rpb24gKHNpbmssIHNjb3BlKSB7XG4gICAgICAgICAgICBpZiAoc2NvcGUgPT09ICc6cm9vdCcpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gc2luaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKHV0aWxzXzEuaXNDbGFzc09ySWQoc2NvcGUpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGlzb2xhdGVfMS5zaWJsaW5nSXNvbGF0ZVNpbmsoc2luaywgc2NvcGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdmFyIHByZXZGdWxsU2NvcGUgPSB1dGlsc18xLmdldEZ1bGxTY29wZShfdGhpcy5fbmFtZXNwYWNlKTtcbiAgICAgICAgICAgICAgICB2YXIgbmV4dEZ1bGxTY29wZSA9IFtwcmV2RnVsbFNjb3BlLCBzY29wZV0uZmlsdGVyKGZ1bmN0aW9uICh4KSB7IHJldHVybiAhIXg7IH0pLmpvaW4oJy0nKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gaXNvbGF0ZV8xLnRvdGFsSXNvbGF0ZVNpbmsoc2luaywgbmV4dEZ1bGxTY29wZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfVxuICAgIE1haW5ET01Tb3VyY2UucHJvdG90eXBlLmVsZW1lbnRzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgb3V0cHV0JDtcbiAgICAgICAgaWYgKHRoaXMuX25hbWVzcGFjZS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIG91dHB1dCQgPSB0aGlzLl9yb290RWxlbWVudCQ7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB2YXIgZWxlbWVudEZpbmRlcl8xID0gbmV3IEVsZW1lbnRGaW5kZXJfMS5FbGVtZW50RmluZGVyKHRoaXMuX25hbWVzcGFjZSwgdGhpcy5faXNvbGF0ZU1vZHVsZSk7XG4gICAgICAgICAgICBvdXRwdXQkID0gdGhpcy5fcm9vdEVsZW1lbnQkLm1hcChmdW5jdGlvbiAoZWwpIHsgcmV0dXJuIGVsZW1lbnRGaW5kZXJfMS5jYWxsKGVsKTsgfSk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIG91dCA9IGFkYXB0XzEuYWRhcHQob3V0cHV0JC5yZW1lbWJlcigpKTtcbiAgICAgICAgb3V0Ll9pc0N5Y2xlU291cmNlID0gdGhpcy5fbmFtZTtcbiAgICAgICAgcmV0dXJuIG91dDtcbiAgICB9O1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShNYWluRE9NU291cmNlLnByb3RvdHlwZSwgXCJuYW1lc3BhY2VcIiwge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9uYW1lc3BhY2U7XG4gICAgICAgIH0sXG4gICAgICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgIH0pO1xuICAgIE1haW5ET01Tb3VyY2UucHJvdG90eXBlLnNlbGVjdCA9IGZ1bmN0aW9uIChzZWxlY3Rvcikge1xuICAgICAgICBpZiAodHlwZW9mIHNlbGVjdG9yICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRE9NIGRyaXZlcidzIHNlbGVjdCgpIGV4cGVjdHMgdGhlIGFyZ3VtZW50IHRvIGJlIGEgXCIgK1xuICAgICAgICAgICAgICAgIFwic3RyaW5nIGFzIGEgQ1NTIHNlbGVjdG9yXCIpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzZWxlY3RvciA9PT0gJ2RvY3VtZW50Jykge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBEb2N1bWVudERPTVNvdXJjZV8xLkRvY3VtZW50RE9NU291cmNlKHRoaXMuX25hbWUpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzZWxlY3RvciA9PT0gJ2JvZHknKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IEJvZHlET01Tb3VyY2VfMS5Cb2R5RE9NU291cmNlKHRoaXMuX25hbWUpO1xuICAgICAgICB9XG4gICAgICAgIHZhciB0cmltbWVkU2VsZWN0b3IgPSBzZWxlY3Rvci50cmltKCk7XG4gICAgICAgIHZhciBjaGlsZE5hbWVzcGFjZSA9IHRyaW1tZWRTZWxlY3RvciA9PT0gXCI6cm9vdFwiID9cbiAgICAgICAgICAgIHRoaXMuX25hbWVzcGFjZSA6XG4gICAgICAgICAgICB0aGlzLl9uYW1lc3BhY2UuY29uY2F0KHRyaW1tZWRTZWxlY3Rvcik7XG4gICAgICAgIHJldHVybiBuZXcgTWFpbkRPTVNvdXJjZSh0aGlzLl9yb290RWxlbWVudCQsIHRoaXMuX3Nhbml0YXRpb24kLCBjaGlsZE5hbWVzcGFjZSwgdGhpcy5faXNvbGF0ZU1vZHVsZSwgdGhpcy5fZGVsZWdhdG9ycywgdGhpcy5fbmFtZSk7XG4gICAgfTtcbiAgICBNYWluRE9NU291cmNlLnByb3RvdHlwZS5ldmVudHMgPSBmdW5jdGlvbiAoZXZlbnRUeXBlLCBvcHRpb25zKSB7XG4gICAgICAgIGlmIChvcHRpb25zID09PSB2b2lkIDApIHsgb3B0aW9ucyA9IHt9OyB9XG4gICAgICAgIGlmICh0eXBlb2YgZXZlbnRUeXBlICE9PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJET00gZHJpdmVyJ3MgZXZlbnRzKCkgZXhwZWN0cyBhcmd1bWVudCB0byBiZSBhIFwiICtcbiAgICAgICAgICAgICAgICBcInN0cmluZyByZXByZXNlbnRpbmcgdGhlIGV2ZW50IHR5cGUgdG8gbGlzdGVuIGZvci5cIik7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHVzZUNhcHR1cmUgPSBkZXRlcm1pbmVVc2VDYXB0dXJlKGV2ZW50VHlwZSwgb3B0aW9ucyk7XG4gICAgICAgIHZhciBuYW1lc3BhY2UgPSB0aGlzLl9uYW1lc3BhY2U7XG4gICAgICAgIHZhciBmdWxsU2NvcGUgPSB1dGlsc18xLmdldEZ1bGxTY29wZShuYW1lc3BhY2UpO1xuICAgICAgICB2YXIga2V5UGFydHMgPSBbZXZlbnRUeXBlLCB1c2VDYXB0dXJlXTtcbiAgICAgICAgaWYgKGZ1bGxTY29wZSkge1xuICAgICAgICAgICAga2V5UGFydHMucHVzaChmdWxsU2NvcGUpO1xuICAgICAgICB9XG4gICAgICAgIHZhciBrZXkgPSBrZXlQYXJ0cy5qb2luKCd+Jyk7XG4gICAgICAgIHZhciBkb21Tb3VyY2UgPSB0aGlzO1xuICAgICAgICB2YXIgcm9vdEVsZW1lbnQkO1xuICAgICAgICBpZiAoZnVsbFNjb3BlKSB7XG4gICAgICAgICAgICByb290RWxlbWVudCQgPSB0aGlzLl9yb290RWxlbWVudCRcbiAgICAgICAgICAgICAgICAuY29tcG9zZShmaWx0ZXJCYXNlZE9uSXNvbGF0aW9uKGRvbVNvdXJjZSwgZnVsbFNjb3BlKSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICByb290RWxlbWVudCQgPSB0aGlzLl9yb290RWxlbWVudCQudGFrZSgyKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgZXZlbnQkID0gcm9vdEVsZW1lbnQkXG4gICAgICAgICAgICAubWFwKGZ1bmN0aW9uIHNldHVwRXZlbnREZWxlZ2F0b3JPblRvcEVsZW1lbnQocm9vdEVsZW1lbnQpIHtcbiAgICAgICAgICAgIC8vIEV2ZW50IGxpc3RlbmVyIGp1c3QgZm9yIHRoZSByb290IGVsZW1lbnRcbiAgICAgICAgICAgIGlmICghbmFtZXNwYWNlIHx8IG5hbWVzcGFjZS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZnJvbUV2ZW50XzEuZnJvbUV2ZW50KHJvb3RFbGVtZW50LCBldmVudFR5cGUsIHVzZUNhcHR1cmUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gRXZlbnQgbGlzdGVuZXIgb24gdGhlIG9yaWdpbiBlbGVtZW50IGFzIGFuIEV2ZW50RGVsZWdhdG9yXG4gICAgICAgICAgICB2YXIgZGVsZWdhdG9ycyA9IGRvbVNvdXJjZS5fZGVsZWdhdG9ycztcbiAgICAgICAgICAgIHZhciBvcmlnaW4gPSBkb21Tb3VyY2UuX2lzb2xhdGVNb2R1bGUuZ2V0RWxlbWVudChmdWxsU2NvcGUpIHx8IHJvb3RFbGVtZW50O1xuICAgICAgICAgICAgdmFyIGRlbGVnYXRvcjtcbiAgICAgICAgICAgIGlmIChkZWxlZ2F0b3JzLmhhcyhrZXkpKSB7XG4gICAgICAgICAgICAgICAgZGVsZWdhdG9yID0gZGVsZWdhdG9ycy5nZXQoa2V5KTtcbiAgICAgICAgICAgICAgICBkZWxlZ2F0b3IudXBkYXRlT3JpZ2luKG9yaWdpbik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBkZWxlZ2F0b3IgPSBuZXcgRXZlbnREZWxlZ2F0b3JfMS5FdmVudERlbGVnYXRvcihvcmlnaW4sIGV2ZW50VHlwZSwgdXNlQ2FwdHVyZSwgZG9tU291cmNlLl9pc29sYXRlTW9kdWxlKTtcbiAgICAgICAgICAgICAgICBkZWxlZ2F0b3JzLnNldChrZXksIGRlbGVnYXRvcik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoZnVsbFNjb3BlKSB7XG4gICAgICAgICAgICAgICAgZG9tU291cmNlLl9pc29sYXRlTW9kdWxlLmFkZEV2ZW50RGVsZWdhdG9yKGZ1bGxTY29wZSwgZGVsZWdhdG9yKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBzdWJqZWN0ID0gZGVsZWdhdG9yLmNyZWF0ZURlc3RpbmF0aW9uKG5hbWVzcGFjZSk7XG4gICAgICAgICAgICByZXR1cm4gc3ViamVjdDtcbiAgICAgICAgfSlcbiAgICAgICAgICAgIC5mbGF0dGVuKCk7XG4gICAgICAgIGlmIChvcHRpb25zICYmIG9wdGlvbnMucHJldmVudERlZmF1bHQpIHtcbiAgICAgICAgICAgIGV2ZW50JCA9IGV2ZW50JC5tYXAoZnVuY3Rpb24gKGV2KSB7XG4gICAgICAgICAgICAgICAgZXYucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZXY7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgb3V0ID0gYWRhcHRfMS5hZGFwdChldmVudCQpO1xuICAgICAgICBvdXQuX2lzQ3ljbGVTb3VyY2UgPSBkb21Tb3VyY2UuX25hbWU7XG4gICAgICAgIHJldHVybiBvdXQ7XG4gICAgfTtcbiAgICBNYWluRE9NU291cmNlLnByb3RvdHlwZS5kaXNwb3NlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl9zYW5pdGF0aW9uJC5zaGFtZWZ1bGx5U2VuZE5leHQobnVsbCk7XG4gICAgICAgIHRoaXMuX2lzb2xhdGVNb2R1bGUucmVzZXQoKTtcbiAgICB9O1xuICAgIHJldHVybiBNYWluRE9NU291cmNlO1xufSgpKTtcbmV4cG9ydHMuTWFpbkRPTVNvdXJjZSA9IE1haW5ET01Tb3VyY2U7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1NYWluRE9NU291cmNlLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xudmFyIFNjb3BlQ2hlY2tlciA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gU2NvcGVDaGVja2VyKGZ1bGxTY29wZSwgaXNvbGF0ZU1vZHVsZSkge1xuICAgICAgICB0aGlzLmZ1bGxTY29wZSA9IGZ1bGxTY29wZTtcbiAgICAgICAgdGhpcy5pc29sYXRlTW9kdWxlID0gaXNvbGF0ZU1vZHVsZTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQ2hlY2tzIHdoZXRoZXIgdGhlIGdpdmVuIGVsZW1lbnQgaXMgKmRpcmVjdGx5KiBpbiB0aGUgc2NvcGUgb2YgdGhpc1xuICAgICAqIHNjb3BlIGNoZWNrZXIuIEJlaW5nIGNvbnRhaW5lZCAqaW5kaXJlY3RseSogdGhyb3VnaCBvdGhlciBzY29wZXNcbiAgICAgKiBpcyBub3QgdmFsaWQuIFRoaXMgaXMgY3J1Y2lhbCBmb3IgaW1wbGVtZW50aW5nIHBhcmVudC1jaGlsZCBpc29sYXRpb24sXG4gICAgICogc28gdGhhdCB0aGUgcGFyZW50IHNlbGVjdG9ycyBkb24ndCBzZWFyY2ggaW5zaWRlIGEgY2hpbGQgc2NvcGUuXG4gICAgICovXG4gICAgU2NvcGVDaGVja2VyLnByb3RvdHlwZS5pc0RpcmVjdGx5SW5TY29wZSA9IGZ1bmN0aW9uIChsZWFmKSB7XG4gICAgICAgIGZvciAodmFyIGVsID0gbGVhZjsgZWw7IGVsID0gZWwucGFyZW50RWxlbWVudCkge1xuICAgICAgICAgICAgdmFyIGZ1bGxTY29wZSA9IHRoaXMuaXNvbGF0ZU1vZHVsZS5nZXRGdWxsU2NvcGUoZWwpO1xuICAgICAgICAgICAgaWYgKGZ1bGxTY29wZSAmJiBmdWxsU2NvcGUgIT09IHRoaXMuZnVsbFNjb3BlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGZ1bGxTY29wZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH07XG4gICAgcmV0dXJuIFNjb3BlQ2hlY2tlcjtcbn0oKSk7XG5leHBvcnRzLlNjb3BlQ2hlY2tlciA9IFNjb3BlQ2hlY2tlcjtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPVNjb3BlQ2hlY2tlci5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcbnZhciBoXzEgPSByZXF1aXJlKFwic25hYmJkb20vaFwiKTtcbnZhciBjbGFzc05hbWVGcm9tVk5vZGVfMSA9IHJlcXVpcmUoXCJzbmFiYmRvbS1zZWxlY3Rvci9saWIvY29tbW9uanMvY2xhc3NOYW1lRnJvbVZOb2RlXCIpO1xudmFyIHNlbGVjdG9yUGFyc2VyXzEgPSByZXF1aXJlKFwic25hYmJkb20tc2VsZWN0b3IvbGliL2NvbW1vbmpzL3NlbGVjdG9yUGFyc2VyXCIpO1xudmFyIFZOb2RlV3JhcHBlciA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gVk5vZGVXcmFwcGVyKHJvb3RFbGVtZW50KSB7XG4gICAgICAgIHRoaXMucm9vdEVsZW1lbnQgPSByb290RWxlbWVudDtcbiAgICB9XG4gICAgVk5vZGVXcmFwcGVyLnByb3RvdHlwZS5jYWxsID0gZnVuY3Rpb24gKHZub2RlKSB7XG4gICAgICAgIGlmICh2bm9kZSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMud3JhcChbXSk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIF9hID0gc2VsZWN0b3JQYXJzZXJfMS5zZWxlY3RvclBhcnNlcih2bm9kZSksIHNlbFRhZ05hbWUgPSBfYS50YWdOYW1lLCBzZWxJZCA9IF9hLmlkO1xuICAgICAgICB2YXIgdk5vZGVDbGFzc05hbWUgPSBjbGFzc05hbWVGcm9tVk5vZGVfMS5jbGFzc05hbWVGcm9tVk5vZGUodm5vZGUpO1xuICAgICAgICB2YXIgdk5vZGVEYXRhID0gdm5vZGUuZGF0YSB8fCB7fTtcbiAgICAgICAgdmFyIHZOb2RlRGF0YVByb3BzID0gdk5vZGVEYXRhLnByb3BzIHx8IHt9O1xuICAgICAgICB2YXIgX2IgPSB2Tm9kZURhdGFQcm9wcy5pZCwgdk5vZGVJZCA9IF9iID09PSB2b2lkIDAgPyBzZWxJZCA6IF9iO1xuICAgICAgICB2YXIgaXNWTm9kZUFuZFJvb3RFbGVtZW50SWRlbnRpY2FsID0gdHlwZW9mIHZOb2RlSWQgPT09ICdzdHJpbmcnICYmXG4gICAgICAgICAgICB2Tm9kZUlkLnRvVXBwZXJDYXNlKCkgPT09IHRoaXMucm9vdEVsZW1lbnQuaWQudG9VcHBlckNhc2UoKSAmJlxuICAgICAgICAgICAgc2VsVGFnTmFtZS50b1VwcGVyQ2FzZSgpID09PSB0aGlzLnJvb3RFbGVtZW50LnRhZ05hbWUudG9VcHBlckNhc2UoKSAmJlxuICAgICAgICAgICAgdk5vZGVDbGFzc05hbWUudG9VcHBlckNhc2UoKSA9PT0gdGhpcy5yb290RWxlbWVudC5jbGFzc05hbWUudG9VcHBlckNhc2UoKTtcbiAgICAgICAgaWYgKGlzVk5vZGVBbmRSb290RWxlbWVudElkZW50aWNhbCkge1xuICAgICAgICAgICAgcmV0dXJuIHZub2RlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLndyYXAoW3Zub2RlXSk7XG4gICAgfTtcbiAgICBWTm9kZVdyYXBwZXIucHJvdG90eXBlLndyYXAgPSBmdW5jdGlvbiAoY2hpbGRyZW4pIHtcbiAgICAgICAgdmFyIF9hID0gdGhpcy5yb290RWxlbWVudCwgdGFnTmFtZSA9IF9hLnRhZ05hbWUsIGlkID0gX2EuaWQsIGNsYXNzTmFtZSA9IF9hLmNsYXNzTmFtZTtcbiAgICAgICAgdmFyIHNlbElkID0gaWQgPyBcIiNcIiArIGlkIDogJyc7XG4gICAgICAgIHZhciBzZWxDbGFzcyA9IGNsYXNzTmFtZSA/XG4gICAgICAgICAgICBcIi5cIiArIGNsYXNzTmFtZS5zcGxpdChcIiBcIikuam9pbihcIi5cIikgOiAnJztcbiAgICAgICAgcmV0dXJuIGhfMS5oKFwiXCIgKyB0YWdOYW1lLnRvTG93ZXJDYXNlKCkgKyBzZWxJZCArIHNlbENsYXNzLCB7fSwgY2hpbGRyZW4pO1xuICAgIH07XG4gICAgcmV0dXJuIFZOb2RlV3JhcHBlcjtcbn0oKSk7XG5leHBvcnRzLlZOb2RlV3JhcHBlciA9IFZOb2RlV3JhcHBlcjtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPVZOb2RlV3JhcHBlci5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcbnZhciB4c3RyZWFtXzEgPSByZXF1aXJlKFwieHN0cmVhbVwiKTtcbmZ1bmN0aW9uIGZyb21FdmVudChlbGVtZW50LCBldmVudE5hbWUsIHVzZUNhcHR1cmUpIHtcbiAgICBpZiAodXNlQ2FwdHVyZSA9PT0gdm9pZCAwKSB7IHVzZUNhcHR1cmUgPSBmYWxzZTsgfVxuICAgIHJldHVybiB4c3RyZWFtXzEuU3RyZWFtLmNyZWF0ZSh7XG4gICAgICAgIGVsZW1lbnQ6IGVsZW1lbnQsXG4gICAgICAgIG5leHQ6IG51bGwsXG4gICAgICAgIHN0YXJ0OiBmdW5jdGlvbiBzdGFydChsaXN0ZW5lcikge1xuICAgICAgICAgICAgdGhpcy5uZXh0ID0gZnVuY3Rpb24gbmV4dChldmVudCkgeyBsaXN0ZW5lci5uZXh0KGV2ZW50KTsgfTtcbiAgICAgICAgICAgIHRoaXMuZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50TmFtZSwgdGhpcy5uZXh0LCB1c2VDYXB0dXJlKTtcbiAgICAgICAgfSxcbiAgICAgICAgc3RvcDogZnVuY3Rpb24gc3RvcCgpIHtcbiAgICAgICAgICAgIHRoaXMuZWxlbWVudC5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50TmFtZSwgdGhpcy5uZXh0LCB1c2VDYXB0dXJlKTtcbiAgICAgICAgfSxcbiAgICB9KTtcbn1cbmV4cG9ydHMuZnJvbUV2ZW50ID0gZnJvbUV2ZW50O1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9ZnJvbUV2ZW50LmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xudmFyIGhfMSA9IHJlcXVpcmUoXCJzbmFiYmRvbS9oXCIpO1xuZnVuY3Rpb24gaXNWYWxpZFN0cmluZyhwYXJhbSkge1xuICAgIHJldHVybiB0eXBlb2YgcGFyYW0gPT09ICdzdHJpbmcnICYmIHBhcmFtLmxlbmd0aCA+IDA7XG59XG5mdW5jdGlvbiBpc1NlbGVjdG9yKHBhcmFtKSB7XG4gICAgcmV0dXJuIGlzVmFsaWRTdHJpbmcocGFyYW0pICYmIChwYXJhbVswXSA9PT0gJy4nIHx8IHBhcmFtWzBdID09PSAnIycpO1xufVxuZnVuY3Rpb24gY3JlYXRlVGFnRnVuY3Rpb24odGFnTmFtZSkge1xuICAgIHJldHVybiBmdW5jdGlvbiBoeXBlcnNjcmlwdChhLCBiLCBjKSB7XG4gICAgICAgIHZhciBoYXNBID0gdHlwZW9mIGEgIT09ICd1bmRlZmluZWQnO1xuICAgICAgICB2YXIgaGFzQiA9IHR5cGVvZiBiICE9PSAndW5kZWZpbmVkJztcbiAgICAgICAgdmFyIGhhc0MgPSB0eXBlb2YgYyAhPT0gJ3VuZGVmaW5lZCc7XG4gICAgICAgIGlmIChpc1NlbGVjdG9yKGEpKSB7XG4gICAgICAgICAgICBpZiAoaGFzQiAmJiBoYXNDKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGhfMS5oKHRhZ05hbWUgKyBhLCBiLCBjKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGhhc0IpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gaF8xLmgodGFnTmFtZSArIGEsIGIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGhfMS5oKHRhZ05hbWUgKyBhLCB7fSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoaGFzQykge1xuICAgICAgICAgICAgcmV0dXJuIGhfMS5oKHRhZ05hbWUgKyBhLCBiLCBjKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChoYXNCKSB7XG4gICAgICAgICAgICByZXR1cm4gaF8xLmgodGFnTmFtZSwgYSwgYik7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoaGFzQSkge1xuICAgICAgICAgICAgcmV0dXJuIGhfMS5oKHRhZ05hbWUsIGEpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIGhfMS5oKHRhZ05hbWUsIHt9KTtcbiAgICAgICAgfVxuICAgIH07XG59XG52YXIgU1ZHX1RBR19OQU1FUyA9IFtcbiAgICAnYScsICdhbHRHbHlwaCcsICdhbHRHbHlwaERlZicsICdhbHRHbHlwaEl0ZW0nLCAnYW5pbWF0ZScsICdhbmltYXRlQ29sb3InLFxuICAgICdhbmltYXRlTW90aW9uJywgJ2FuaW1hdGVUcmFuc2Zvcm0nLCAnY2lyY2xlJywgJ2NsaXBQYXRoJywgJ2NvbG9yUHJvZmlsZScsXG4gICAgJ2N1cnNvcicsICdkZWZzJywgJ2Rlc2MnLCAnZWxsaXBzZScsICdmZUJsZW5kJywgJ2ZlQ29sb3JNYXRyaXgnLFxuICAgICdmZUNvbXBvbmVudFRyYW5zZmVyJywgJ2ZlQ29tcG9zaXRlJywgJ2ZlQ29udm9sdmVNYXRyaXgnLCAnZmVEaWZmdXNlTGlnaHRpbmcnLFxuICAgICdmZURpc3BsYWNlbWVudE1hcCcsICdmZURpc3RhbnRMaWdodCcsICdmZUZsb29kJywgJ2ZlRnVuY0EnLCAnZmVGdW5jQicsXG4gICAgJ2ZlRnVuY0cnLCAnZmVGdW5jUicsICdmZUdhdXNzaWFuQmx1cicsICdmZUltYWdlJywgJ2ZlTWVyZ2UnLCAnZmVNZXJnZU5vZGUnLFxuICAgICdmZU1vcnBob2xvZ3knLCAnZmVPZmZzZXQnLCAnZmVQb2ludExpZ2h0JywgJ2ZlU3BlY3VsYXJMaWdodGluZycsXG4gICAgJ2ZlU3BvdGxpZ2h0JywgJ2ZlVGlsZScsICdmZVR1cmJ1bGVuY2UnLCAnZmlsdGVyJywgJ2ZvbnQnLCAnZm9udEZhY2UnLFxuICAgICdmb250RmFjZUZvcm1hdCcsICdmb250RmFjZU5hbWUnLCAnZm9udEZhY2VTcmMnLCAnZm9udEZhY2VVcmknLFxuICAgICdmb3JlaWduT2JqZWN0JywgJ2cnLCAnZ2x5cGgnLCAnZ2x5cGhSZWYnLCAnaGtlcm4nLCAnaW1hZ2UnLCAnbGluZScsXG4gICAgJ2xpbmVhckdyYWRpZW50JywgJ21hcmtlcicsICdtYXNrJywgJ21ldGFkYXRhJywgJ21pc3NpbmdHbHlwaCcsICdtcGF0aCcsXG4gICAgJ3BhdGgnLCAncGF0dGVybicsICdwb2x5Z29uJywgJ3BvbHlsaW5lJywgJ3JhZGlhbEdyYWRpZW50JywgJ3JlY3QnLCAnc2NyaXB0JyxcbiAgICAnc2V0JywgJ3N0b3AnLCAnc3R5bGUnLCAnc3dpdGNoJywgJ3N5bWJvbCcsICd0ZXh0JywgJ3RleHRQYXRoJywgJ3RpdGxlJyxcbiAgICAndHJlZicsICd0c3BhbicsICd1c2UnLCAndmlldycsICd2a2VybicsXG5dO1xudmFyIHN2ZyA9IGNyZWF0ZVRhZ0Z1bmN0aW9uKCdzdmcnKTtcblNWR19UQUdfTkFNRVMuZm9yRWFjaChmdW5jdGlvbiAodGFnKSB7XG4gICAgc3ZnW3RhZ10gPSBjcmVhdGVUYWdGdW5jdGlvbih0YWcpO1xufSk7XG52YXIgVEFHX05BTUVTID0gW1xuICAgICdhJywgJ2FiYnInLCAnYWRkcmVzcycsICdhcmVhJywgJ2FydGljbGUnLCAnYXNpZGUnLCAnYXVkaW8nLCAnYicsICdiYXNlJyxcbiAgICAnYmRpJywgJ2JkbycsICdibG9ja3F1b3RlJywgJ2JvZHknLCAnYnInLCAnYnV0dG9uJywgJ2NhbnZhcycsICdjYXB0aW9uJyxcbiAgICAnY2l0ZScsICdjb2RlJywgJ2NvbCcsICdjb2xncm91cCcsICdkZCcsICdkZWwnLCAnZGZuJywgJ2RpcicsICdkaXYnLCAnZGwnLFxuICAgICdkdCcsICdlbScsICdlbWJlZCcsICdmaWVsZHNldCcsICdmaWdjYXB0aW9uJywgJ2ZpZ3VyZScsICdmb290ZXInLCAnZm9ybScsXG4gICAgJ2gxJywgJ2gyJywgJ2gzJywgJ2g0JywgJ2g1JywgJ2g2JywgJ2hlYWQnLCAnaGVhZGVyJywgJ2hncm91cCcsICdocicsICdodG1sJyxcbiAgICAnaScsICdpZnJhbWUnLCAnaW1nJywgJ2lucHV0JywgJ2lucycsICdrYmQnLCAna2V5Z2VuJywgJ2xhYmVsJywgJ2xlZ2VuZCcsXG4gICAgJ2xpJywgJ2xpbmsnLCAnbWFpbicsICdtYXAnLCAnbWFyaycsICdtZW51JywgJ21ldGEnLCAnbmF2JywgJ25vc2NyaXB0JyxcbiAgICAnb2JqZWN0JywgJ29sJywgJ29wdGdyb3VwJywgJ29wdGlvbicsICdwJywgJ3BhcmFtJywgJ3ByZScsICdwcm9ncmVzcycsICdxJyxcbiAgICAncnAnLCAncnQnLCAncnVieScsICdzJywgJ3NhbXAnLCAnc2NyaXB0JywgJ3NlY3Rpb24nLCAnc2VsZWN0JywgJ3NtYWxsJyxcbiAgICAnc291cmNlJywgJ3NwYW4nLCAnc3Ryb25nJywgJ3N0eWxlJywgJ3N1YicsICdzdXAnLCAndGFibGUnLCAndGJvZHknLCAndGQnLFxuICAgICd0ZXh0YXJlYScsICd0Zm9vdCcsICd0aCcsICd0aGVhZCcsICd0aXRsZScsICd0cicsICd1JywgJ3VsJywgJ3ZpZGVvJyxcbl07XG52YXIgZXhwb3J0ZWQgPSB7IFNWR19UQUdfTkFNRVM6IFNWR19UQUdfTkFNRVMsIFRBR19OQU1FUzogVEFHX05BTUVTLCBzdmc6IHN2ZywgaXNTZWxlY3RvcjogaXNTZWxlY3RvciwgY3JlYXRlVGFnRnVuY3Rpb246IGNyZWF0ZVRhZ0Z1bmN0aW9uIH07XG5UQUdfTkFNRVMuZm9yRWFjaChmdW5jdGlvbiAobikge1xuICAgIGV4cG9ydGVkW25dID0gY3JlYXRlVGFnRnVuY3Rpb24obik7XG59KTtcbmV4cG9ydHMuZGVmYXVsdCA9IGV4cG9ydGVkO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9aHlwZXJzY3JpcHQtaGVscGVycy5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcbnZhciB0aHVua18xID0gcmVxdWlyZShcIi4vdGh1bmtcIik7XG5leHBvcnRzLnRodW5rID0gdGh1bmtfMS50aHVuaztcbnZhciBNYWluRE9NU291cmNlXzEgPSByZXF1aXJlKFwiLi9NYWluRE9NU291cmNlXCIpO1xuZXhwb3J0cy5NYWluRE9NU291cmNlID0gTWFpbkRPTVNvdXJjZV8xLk1haW5ET01Tb3VyY2U7XG4vKipcbiAqIEEgZmFjdG9yeSBmb3IgdGhlIERPTSBkcml2ZXIgZnVuY3Rpb24uXG4gKlxuICogVGFrZXMgYSBgY29udGFpbmVyYCB0byBkZWZpbmUgdGhlIHRhcmdldCBvbiB0aGUgZXhpc3RpbmcgRE9NIHdoaWNoIHRoaXNcbiAqIGRyaXZlciB3aWxsIG9wZXJhdGUgb24sIGFuZCBhbiBgb3B0aW9uc2Agb2JqZWN0IGFzIHRoZSBzZWNvbmQgYXJndW1lbnQuIFRoZVxuICogaW5wdXQgdG8gdGhpcyBkcml2ZXIgaXMgYSBzdHJlYW0gb2YgdmlydHVhbCBET00gb2JqZWN0cywgb3IgaW4gb3RoZXIgd29yZHMsXG4gKiBTbmFiYmRvbSBcIlZOb2RlXCIgb2JqZWN0cy4gVGhlIG91dHB1dCBvZiB0aGlzIGRyaXZlciBpcyBhIFwiRE9NU291cmNlXCI6IGFcbiAqIGNvbGxlY3Rpb24gb2YgT2JzZXJ2YWJsZXMgcXVlcmllZCB3aXRoIHRoZSBtZXRob2RzIGBzZWxlY3QoKWAgYW5kIGBldmVudHMoKWAuXG4gKlxuICogYERPTVNvdXJjZS5zZWxlY3Qoc2VsZWN0b3IpYCByZXR1cm5zIGEgbmV3IERPTVNvdXJjZSB3aXRoIHNjb3BlIHJlc3RyaWN0ZWQgdG9cbiAqIHRoZSBlbGVtZW50KHMpIHRoYXQgbWF0Y2hlcyB0aGUgQ1NTIGBzZWxlY3RvcmAgZ2l2ZW4uXG4gKlxuICogYERPTVNvdXJjZS5ldmVudHMoZXZlbnRUeXBlLCBvcHRpb25zKWAgcmV0dXJucyBhIHN0cmVhbSBvZiBldmVudHMgb2ZcbiAqIGBldmVudFR5cGVgIGhhcHBlbmluZyBvbiB0aGUgZWxlbWVudHMgdGhhdCBtYXRjaCB0aGUgY3VycmVudCBET01Tb3VyY2UuIFRoZVxuICogZXZlbnQgb2JqZWN0IGNvbnRhaW5zIHRoZSBgb3duZXJUYXJnZXRgIHByb3BlcnR5IHRoYXQgYmVoYXZlcyBleGFjdGx5IGxpa2VcbiAqIGBjdXJyZW50VGFyZ2V0YC4gVGhlIHJlYXNvbiBmb3IgdGhpcyBpcyB0aGF0IHNvbWUgYnJvd3NlcnMgZG9lc24ndCBhbGxvd1xuICogYGN1cnJlbnRUYXJnZXRgIHByb3BlcnR5IHRvIGJlIG11dGF0ZWQsIGhlbmNlIGEgbmV3IHByb3BlcnR5IGlzIGNyZWF0ZWQuIFRoZVxuICogcmV0dXJuZWQgc3RyZWFtIGlzIGFuICp4c3RyZWFtKiBTdHJlYW0gaWYgeW91IHVzZSBgQGN5Y2xlL3hzdHJlYW0tcnVuYCB0byBydW5cbiAqIHlvdXIgYXBwIHdpdGggdGhpcyBkcml2ZXIsIG9yIGl0IGlzIGFuIFJ4SlMgT2JzZXJ2YWJsZSBpZiB5b3UgdXNlXG4gKiBgQGN5Y2xlL3J4anMtcnVuYCwgYW5kIHNvIGZvcnRoLiBUaGUgYG9wdGlvbnNgIHBhcmFtZXRlciBjYW4gaGF2ZSB0aGVcbiAqIHByb3BlcnR5IGB1c2VDYXB0dXJlYCwgd2hpY2ggaXMgYnkgZGVmYXVsdCBgZmFsc2VgLCBleGNlcHQgaXQgaXMgYHRydWVgIGZvclxuICogZXZlbnQgdHlwZXMgdGhhdCBkbyBub3QgYnViYmxlLiBSZWFkIG1vcmUgaGVyZVxuICogaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvQVBJL0V2ZW50VGFyZ2V0L2FkZEV2ZW50TGlzdGVuZXJcbiAqIGFib3V0IHRoZSBgdXNlQ2FwdHVyZWAgYW5kIGl0cyBwdXJwb3NlLlxuICogVGhlIG90aGVyIG9wdGlvbiBpcyBgcHJldmVudERlZmF1bHRgIHRoYXQgaXMgc2V0IHRvIGZhbHNlIGJ5IGRlZmF1bHQuXG4gKiBJZiBzZXQgdG8gdHJ1ZSwgdGhlIGRyaXZlciB3aWxsIGF1dG9tYXRpY2FsbHkgY2FsbCBgcHJldmVudERlZmF1bHQoKWAgb24gZXZlcnkgZXZlbnQuXG4gKlxuICogYERPTVNvdXJjZS5lbGVtZW50cygpYCByZXR1cm5zIGEgc3RyZWFtIG9mIHRoZSBET00gZWxlbWVudChzKSBtYXRjaGVkIGJ5IHRoZVxuICogc2VsZWN0b3JzIGluIHRoZSBET01Tb3VyY2UuIEFsc28sIGBET01Tb3VyY2Uuc2VsZWN0KCc6cm9vdCcpLmVsZW1lbnRzKClgXG4gKiByZXR1cm5zIGEgc3RyZWFtIG9mIERPTSBlbGVtZW50IGNvcnJlc3BvbmRpbmcgdG8gdGhlIHJvb3QgKG9yIGNvbnRhaW5lcikgb2ZcbiAqIHRoZSBhcHAgb24gdGhlIERPTS5cbiAqXG4gKiBAcGFyYW0geyhTdHJpbmd8SFRNTEVsZW1lbnQpfSBjb250YWluZXIgdGhlIERPTSBzZWxlY3RvciBmb3IgdGhlIGVsZW1lbnRcbiAqIChvciB0aGUgZWxlbWVudCBpdHNlbGYpIHRvIGNvbnRhaW4gdGhlIHJlbmRlcmluZyBvZiB0aGUgVlRyZWVzLlxuICogQHBhcmFtIHtET01Ecml2ZXJPcHRpb25zfSBvcHRpb25zIGFuIG9iamVjdCB3aXRoIHR3byBvcHRpb25hbCBwcm9wZXJ0aWVzOlxuICpcbiAqICAgLSBgbW9kdWxlczogYXJyYXlgIG92ZXJyaWRlcyBgQGN5Y2xlL2RvbWAncyBkZWZhdWx0IFNuYWJiZG9tIG1vZHVsZXMgYXNcbiAqICAgICBhcyBkZWZpbmVkIGluIFtgc3JjL21vZHVsZXMudHNgXSguL3NyYy9tb2R1bGVzLnRzKS5cbiAqICAgLSBgdHJhbnNwb3NpdGlvbjogYm9vbGVhbmAgZW5hYmxlcy9kaXNhYmxlcyB0cmFuc3Bvc2l0aW9uIG9mIGlubmVyIHN0cmVhbXNcbiAqICAgICBpbiB0aGUgdmlydHVhbCBET00gdHJlZS5cbiAqIEByZXR1cm4ge0Z1bmN0aW9ufSB0aGUgRE9NIGRyaXZlciBmdW5jdGlvbi4gVGhlIGZ1bmN0aW9uIGV4cGVjdHMgYSBzdHJlYW0gb2ZcbiAqIFZOb2RlIGFzIGlucHV0LCBhbmQgb3V0cHV0cyB0aGUgRE9NU291cmNlIG9iamVjdC5cbiAqIEBmdW5jdGlvbiBtYWtlRE9NRHJpdmVyXG4gKi9cbnZhciBtYWtlRE9NRHJpdmVyXzEgPSByZXF1aXJlKFwiLi9tYWtlRE9NRHJpdmVyXCIpO1xuZXhwb3J0cy5tYWtlRE9NRHJpdmVyID0gbWFrZURPTURyaXZlcl8xLm1ha2VET01Ecml2ZXI7XG4vKipcbiAqIEEgZmFjdG9yeSBmdW5jdGlvbiB0byBjcmVhdGUgbW9ja2VkIERPTVNvdXJjZSBvYmplY3RzLCBmb3IgdGVzdGluZyBwdXJwb3Nlcy5cbiAqXG4gKiBUYWtlcyBhIGBzdHJlYW1BZGFwdGVyYCBhbmQgYSBgbW9ja0NvbmZpZ2Agb2JqZWN0IGFzIGFyZ3VtZW50cywgYW5kIHJldHVybnNcbiAqIGEgRE9NU291cmNlIHRoYXQgY2FuIGJlIGdpdmVuIHRvIGFueSBDeWNsZS5qcyBhcHAgdGhhdCBleHBlY3RzIGEgRE9NU291cmNlIGluXG4gKiB0aGUgc291cmNlcywgZm9yIHRlc3RpbmcuXG4gKlxuICogVGhlIGBzdHJlYW1BZGFwdGVyYCBwYXJhbWV0ZXIgaXMgYSBwYWNrYWdlIHN1Y2ggYXMgYEBjeWNsZS94c3RyZWFtLWFkYXB0ZXJgLFxuICogYEBjeWNsZS9yeGpzLWFkYXB0ZXJgLCBldGMuIEltcG9ydCBpdCBhcyBgaW1wb3J0IGEgZnJvbSAnQGN5Y2xlL3J4LWFkYXB0ZXJgLFxuICogdGhlbiBwcm92aWRlIGl0IHRvIGBtb2NrRE9NU291cmNlYC4gVGhpcyBpcyBpbXBvcnRhbnQgc28gdGhlIERPTVNvdXJjZSBjcmVhdGVkXG4gKiBrbm93cyB3aGljaCBzdHJlYW0gbGlicmFyeSBzaG91bGQgaXQgdXNlIHRvIGV4cG9ydCBpdHMgc3RyZWFtcyB3aGVuIHlvdSBjYWxsXG4gKiBgRE9NU291cmNlLmV2ZW50cygpYCBmb3IgaW5zdGFuY2UuXG4gKlxuICogVGhlIGBtb2NrQ29uZmlnYCBwYXJhbWV0ZXIgaXMgYW4gb2JqZWN0IHNwZWNpZnlpbmcgc2VsZWN0b3JzLCBldmVudFR5cGVzIGFuZFxuICogdGhlaXIgc3RyZWFtcy4gRXhhbXBsZTpcbiAqXG4gKiBgYGBqc1xuICogY29uc3QgZG9tU291cmNlID0gbW9ja0RPTVNvdXJjZShSeEFkYXB0ZXIsIHtcbiAqICAgJy5mb28nOiB7XG4gKiAgICAgJ2NsaWNrJzogUnguT2JzZXJ2YWJsZS5vZih7dGFyZ2V0OiB7fX0pLFxuICogICAgICdtb3VzZW92ZXInOiBSeC5PYnNlcnZhYmxlLm9mKHt0YXJnZXQ6IHt9fSksXG4gKiAgIH0sXG4gKiAgICcuYmFyJzoge1xuICogICAgICdzY3JvbGwnOiBSeC5PYnNlcnZhYmxlLm9mKHt0YXJnZXQ6IHt9fSksXG4gKiAgICAgZWxlbWVudHM6IFJ4Lk9ic2VydmFibGUub2Yoe3RhZ05hbWU6ICdkaXYnfSksXG4gKiAgIH1cbiAqIH0pO1xuICpcbiAqIC8vIFVzYWdlXG4gKiBjb25zdCBjbGljayQgPSBkb21Tb3VyY2Uuc2VsZWN0KCcuZm9vJykuZXZlbnRzKCdjbGljaycpO1xuICogY29uc3QgZWxlbWVudCQgPSBkb21Tb3VyY2Uuc2VsZWN0KCcuYmFyJykuZWxlbWVudHMoKTtcbiAqIGBgYFxuICpcbiAqIFRoZSBtb2NrZWQgRE9NIFNvdXJjZSBzdXBwb3J0cyBpc29sYXRpb24uIEl0IGhhcyB0aGUgZnVuY3Rpb25zIGBpc29sYXRlU2lua2BcbiAqIGFuZCBgaXNvbGF0ZVNvdXJjZWAgYXR0YWNoZWQgdG8gaXQsIGFuZCBwZXJmb3JtcyBzaW1wbGUgaXNvbGF0aW9uIHVzaW5nXG4gKiBjbGFzc05hbWVzLiAqaXNvbGF0ZVNpbmsqIHdpdGggc2NvcGUgYGZvb2Agd2lsbCBhcHBlbmQgdGhlIGNsYXNzIGBfX19mb29gIHRvXG4gKiB0aGUgc3RyZWFtIG9mIHZpcnR1YWwgRE9NIG5vZGVzLCBhbmQgKmlzb2xhdGVTb3VyY2UqIHdpdGggc2NvcGUgYGZvb2Agd2lsbFxuICogcGVyZm9ybSBhIGNvbnZlbnRpb25hbCBgbW9ja2VkRE9NU291cmNlLnNlbGVjdCgnLl9fZm9vJylgIGNhbGwuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG1vY2tDb25maWcgYW4gb2JqZWN0IHdoZXJlIGtleXMgYXJlIHNlbGVjdG9yIHN0cmluZ3NcbiAqIGFuZCB2YWx1ZXMgYXJlIG9iamVjdHMuIFRob3NlIG5lc3RlZCBvYmplY3RzIGhhdmUgYGV2ZW50VHlwZWAgc3RyaW5ncyBhcyBrZXlzXG4gKiBhbmQgdmFsdWVzIGFyZSBzdHJlYW1zIHlvdSBjcmVhdGVkLlxuICogQHJldHVybiB7T2JqZWN0fSBmYWtlIERPTSBzb3VyY2Ugb2JqZWN0LCB3aXRoIGFuIEFQSSBjb250YWluaW5nIGBzZWxlY3QoKWBcbiAqIGFuZCBgZXZlbnRzKClgIGFuZCBgZWxlbWVudHMoKWAgd2hpY2ggY2FuIGJlIHVzZWQganVzdCBsaWtlIHRoZSBET00gRHJpdmVyJ3NcbiAqIERPTVNvdXJjZS5cbiAqXG4gKiBAZnVuY3Rpb24gbW9ja0RPTVNvdXJjZVxuICovXG52YXIgbW9ja0RPTVNvdXJjZV8xID0gcmVxdWlyZShcIi4vbW9ja0RPTVNvdXJjZVwiKTtcbmV4cG9ydHMubW9ja0RPTVNvdXJjZSA9IG1vY2tET01Tb3VyY2VfMS5tb2NrRE9NU291cmNlO1xuZXhwb3J0cy5Nb2NrZWRET01Tb3VyY2UgPSBtb2NrRE9NU291cmNlXzEuTW9ja2VkRE9NU291cmNlO1xuLyoqXG4gKiBUaGUgaHlwZXJzY3JpcHQgZnVuY3Rpb24gYGgoKWAgaXMgYSBmdW5jdGlvbiB0byBjcmVhdGUgdmlydHVhbCBET00gb2JqZWN0cyxcbiAqIGFsc28ga25vd24gYXMgVk5vZGVzLiBDYWxsXG4gKlxuICogYGBganNcbiAqIGgoJ2Rpdi5teUNsYXNzJywge3N0eWxlOiB7Y29sb3I6ICdyZWQnfX0sIFtdKVxuICogYGBgXG4gKlxuICogdG8gY3JlYXRlIGEgVk5vZGUgdGhhdCByZXByZXNlbnRzIGEgYERJVmAgZWxlbWVudCB3aXRoIGNsYXNzTmFtZSBgbXlDbGFzc2AsXG4gKiBzdHlsZWQgd2l0aCByZWQgY29sb3IsIGFuZCBubyBjaGlsZHJlbiBiZWNhdXNlIHRoZSBgW11gIGFycmF5IHdhcyBwYXNzZWQuIFRoZVxuICogQVBJIGlzIGBoKHRhZ09yU2VsZWN0b3IsIG9wdGlvbmFsRGF0YSwgb3B0aW9uYWxDaGlsZHJlbk9yVGV4dClgLlxuICpcbiAqIEhvd2V2ZXIsIHVzdWFsbHkgeW91IHNob3VsZCB1c2UgXCJoeXBlcnNjcmlwdCBoZWxwZXJzXCIsIHdoaWNoIGFyZSBzaG9ydGN1dFxuICogZnVuY3Rpb25zIGJhc2VkIG9uIGh5cGVyc2NyaXB0LiBUaGVyZSBpcyBvbmUgaHlwZXJzY3JpcHQgaGVscGVyIGZ1bmN0aW9uIGZvclxuICogZWFjaCBET00gdGFnTmFtZSwgc3VjaCBhcyBgaDEoKWAsIGBoMigpYCwgYGRpdigpYCwgYHNwYW4oKWAsIGBsYWJlbCgpYCxcbiAqIGBpbnB1dCgpYC4gRm9yIGluc3RhbmNlLCB0aGUgcHJldmlvdXMgZXhhbXBsZSBjb3VsZCBoYXZlIGJlZW4gd3JpdHRlblxuICogYXM6XG4gKlxuICogYGBganNcbiAqIGRpdignLm15Q2xhc3MnLCB7c3R5bGU6IHtjb2xvcjogJ3JlZCd9fSwgW10pXG4gKiBgYGBcbiAqXG4gKiBUaGVyZSBhcmUgYWxzbyBTVkcgaGVscGVyIGZ1bmN0aW9ucywgd2hpY2ggYXBwbHkgdGhlIGFwcHJvcHJpYXRlIFNWR1xuICogbmFtZXNwYWNlIHRvIHRoZSByZXN1bHRpbmcgZWxlbWVudHMuIGBzdmcoKWAgZnVuY3Rpb24gY3JlYXRlcyB0aGUgdG9wLW1vc3RcbiAqIFNWRyBlbGVtZW50LCBhbmQgYHN2Zy5nYCwgYHN2Zy5wb2x5Z29uYCwgYHN2Zy5jaXJjbGVgLCBgc3ZnLnBhdGhgIGFyZSBmb3JcbiAqIFNWRy1zcGVjaWZpYyBjaGlsZCBlbGVtZW50cy4gRXhhbXBsZTpcbiAqXG4gKiBgYGBqc1xuICogc3ZnKHt3aWR0aDogMTUwLCBoZWlnaHQ6IDE1MH0sIFtcbiAqICAgc3ZnLnBvbHlnb24oe1xuICogICAgIGF0dHJzOiB7XG4gKiAgICAgICBjbGFzczogJ3RyaWFuZ2xlJyxcbiAqICAgICAgIHBvaW50czogJzIwIDAgMjAgMTUwIDE1MCAyMCdcbiAqICAgICB9XG4gKiAgIH0pXG4gKiBdKVxuICogYGBgXG4gKlxuICogQGZ1bmN0aW9uIGhcbiAqL1xudmFyIGhfMSA9IHJlcXVpcmUoXCJzbmFiYmRvbS9oXCIpO1xuZXhwb3J0cy5oID0gaF8xLmg7XG52YXIgaHlwZXJzY3JpcHRfaGVscGVyc18xID0gcmVxdWlyZShcIi4vaHlwZXJzY3JpcHQtaGVscGVyc1wiKTtcbmV4cG9ydHMuc3ZnID0gaHlwZXJzY3JpcHRfaGVscGVyc18xLmRlZmF1bHQuc3ZnO1xuZXhwb3J0cy5hID0gaHlwZXJzY3JpcHRfaGVscGVyc18xLmRlZmF1bHQuYTtcbmV4cG9ydHMuYWJiciA9IGh5cGVyc2NyaXB0X2hlbHBlcnNfMS5kZWZhdWx0LmFiYnI7XG5leHBvcnRzLmFkZHJlc3MgPSBoeXBlcnNjcmlwdF9oZWxwZXJzXzEuZGVmYXVsdC5hZGRyZXNzO1xuZXhwb3J0cy5hcmVhID0gaHlwZXJzY3JpcHRfaGVscGVyc18xLmRlZmF1bHQuYXJlYTtcbmV4cG9ydHMuYXJ0aWNsZSA9IGh5cGVyc2NyaXB0X2hlbHBlcnNfMS5kZWZhdWx0LmFydGljbGU7XG5leHBvcnRzLmFzaWRlID0gaHlwZXJzY3JpcHRfaGVscGVyc18xLmRlZmF1bHQuYXNpZGU7XG5leHBvcnRzLmF1ZGlvID0gaHlwZXJzY3JpcHRfaGVscGVyc18xLmRlZmF1bHQuYXVkaW87XG5leHBvcnRzLmIgPSBoeXBlcnNjcmlwdF9oZWxwZXJzXzEuZGVmYXVsdC5iO1xuZXhwb3J0cy5iYXNlID0gaHlwZXJzY3JpcHRfaGVscGVyc18xLmRlZmF1bHQuYmFzZTtcbmV4cG9ydHMuYmRpID0gaHlwZXJzY3JpcHRfaGVscGVyc18xLmRlZmF1bHQuYmRpO1xuZXhwb3J0cy5iZG8gPSBoeXBlcnNjcmlwdF9oZWxwZXJzXzEuZGVmYXVsdC5iZG87XG5leHBvcnRzLmJsb2NrcXVvdGUgPSBoeXBlcnNjcmlwdF9oZWxwZXJzXzEuZGVmYXVsdC5ibG9ja3F1b3RlO1xuZXhwb3J0cy5ib2R5ID0gaHlwZXJzY3JpcHRfaGVscGVyc18xLmRlZmF1bHQuYm9keTtcbmV4cG9ydHMuYnIgPSBoeXBlcnNjcmlwdF9oZWxwZXJzXzEuZGVmYXVsdC5icjtcbmV4cG9ydHMuYnV0dG9uID0gaHlwZXJzY3JpcHRfaGVscGVyc18xLmRlZmF1bHQuYnV0dG9uO1xuZXhwb3J0cy5jYW52YXMgPSBoeXBlcnNjcmlwdF9oZWxwZXJzXzEuZGVmYXVsdC5jYW52YXM7XG5leHBvcnRzLmNhcHRpb24gPSBoeXBlcnNjcmlwdF9oZWxwZXJzXzEuZGVmYXVsdC5jYXB0aW9uO1xuZXhwb3J0cy5jaXRlID0gaHlwZXJzY3JpcHRfaGVscGVyc18xLmRlZmF1bHQuY2l0ZTtcbmV4cG9ydHMuY29kZSA9IGh5cGVyc2NyaXB0X2hlbHBlcnNfMS5kZWZhdWx0LmNvZGU7XG5leHBvcnRzLmNvbCA9IGh5cGVyc2NyaXB0X2hlbHBlcnNfMS5kZWZhdWx0LmNvbDtcbmV4cG9ydHMuY29sZ3JvdXAgPSBoeXBlcnNjcmlwdF9oZWxwZXJzXzEuZGVmYXVsdC5jb2xncm91cDtcbmV4cG9ydHMuZGQgPSBoeXBlcnNjcmlwdF9oZWxwZXJzXzEuZGVmYXVsdC5kZDtcbmV4cG9ydHMuZGVsID0gaHlwZXJzY3JpcHRfaGVscGVyc18xLmRlZmF1bHQuZGVsO1xuZXhwb3J0cy5kZm4gPSBoeXBlcnNjcmlwdF9oZWxwZXJzXzEuZGVmYXVsdC5kZm47XG5leHBvcnRzLmRpciA9IGh5cGVyc2NyaXB0X2hlbHBlcnNfMS5kZWZhdWx0LmRpcjtcbmV4cG9ydHMuZGl2ID0gaHlwZXJzY3JpcHRfaGVscGVyc18xLmRlZmF1bHQuZGl2O1xuZXhwb3J0cy5kbCA9IGh5cGVyc2NyaXB0X2hlbHBlcnNfMS5kZWZhdWx0LmRsO1xuZXhwb3J0cy5kdCA9IGh5cGVyc2NyaXB0X2hlbHBlcnNfMS5kZWZhdWx0LmR0O1xuZXhwb3J0cy5lbSA9IGh5cGVyc2NyaXB0X2hlbHBlcnNfMS5kZWZhdWx0LmVtO1xuZXhwb3J0cy5lbWJlZCA9IGh5cGVyc2NyaXB0X2hlbHBlcnNfMS5kZWZhdWx0LmVtYmVkO1xuZXhwb3J0cy5maWVsZHNldCA9IGh5cGVyc2NyaXB0X2hlbHBlcnNfMS5kZWZhdWx0LmZpZWxkc2V0O1xuZXhwb3J0cy5maWdjYXB0aW9uID0gaHlwZXJzY3JpcHRfaGVscGVyc18xLmRlZmF1bHQuZmlnY2FwdGlvbjtcbmV4cG9ydHMuZmlndXJlID0gaHlwZXJzY3JpcHRfaGVscGVyc18xLmRlZmF1bHQuZmlndXJlO1xuZXhwb3J0cy5mb290ZXIgPSBoeXBlcnNjcmlwdF9oZWxwZXJzXzEuZGVmYXVsdC5mb290ZXI7XG5leHBvcnRzLmZvcm0gPSBoeXBlcnNjcmlwdF9oZWxwZXJzXzEuZGVmYXVsdC5mb3JtO1xuZXhwb3J0cy5oMSA9IGh5cGVyc2NyaXB0X2hlbHBlcnNfMS5kZWZhdWx0LmgxO1xuZXhwb3J0cy5oMiA9IGh5cGVyc2NyaXB0X2hlbHBlcnNfMS5kZWZhdWx0LmgyO1xuZXhwb3J0cy5oMyA9IGh5cGVyc2NyaXB0X2hlbHBlcnNfMS5kZWZhdWx0LmgzO1xuZXhwb3J0cy5oNCA9IGh5cGVyc2NyaXB0X2hlbHBlcnNfMS5kZWZhdWx0Lmg0O1xuZXhwb3J0cy5oNSA9IGh5cGVyc2NyaXB0X2hlbHBlcnNfMS5kZWZhdWx0Lmg1O1xuZXhwb3J0cy5oNiA9IGh5cGVyc2NyaXB0X2hlbHBlcnNfMS5kZWZhdWx0Lmg2O1xuZXhwb3J0cy5oZWFkID0gaHlwZXJzY3JpcHRfaGVscGVyc18xLmRlZmF1bHQuaGVhZDtcbmV4cG9ydHMuaGVhZGVyID0gaHlwZXJzY3JpcHRfaGVscGVyc18xLmRlZmF1bHQuaGVhZGVyO1xuZXhwb3J0cy5oZ3JvdXAgPSBoeXBlcnNjcmlwdF9oZWxwZXJzXzEuZGVmYXVsdC5oZ3JvdXA7XG5leHBvcnRzLmhyID0gaHlwZXJzY3JpcHRfaGVscGVyc18xLmRlZmF1bHQuaHI7XG5leHBvcnRzLmh0bWwgPSBoeXBlcnNjcmlwdF9oZWxwZXJzXzEuZGVmYXVsdC5odG1sO1xuZXhwb3J0cy5pID0gaHlwZXJzY3JpcHRfaGVscGVyc18xLmRlZmF1bHQuaTtcbmV4cG9ydHMuaWZyYW1lID0gaHlwZXJzY3JpcHRfaGVscGVyc18xLmRlZmF1bHQuaWZyYW1lO1xuZXhwb3J0cy5pbWcgPSBoeXBlcnNjcmlwdF9oZWxwZXJzXzEuZGVmYXVsdC5pbWc7XG5leHBvcnRzLmlucHV0ID0gaHlwZXJzY3JpcHRfaGVscGVyc18xLmRlZmF1bHQuaW5wdXQ7XG5leHBvcnRzLmlucyA9IGh5cGVyc2NyaXB0X2hlbHBlcnNfMS5kZWZhdWx0LmlucztcbmV4cG9ydHMua2JkID0gaHlwZXJzY3JpcHRfaGVscGVyc18xLmRlZmF1bHQua2JkO1xuZXhwb3J0cy5rZXlnZW4gPSBoeXBlcnNjcmlwdF9oZWxwZXJzXzEuZGVmYXVsdC5rZXlnZW47XG5leHBvcnRzLmxhYmVsID0gaHlwZXJzY3JpcHRfaGVscGVyc18xLmRlZmF1bHQubGFiZWw7XG5leHBvcnRzLmxlZ2VuZCA9IGh5cGVyc2NyaXB0X2hlbHBlcnNfMS5kZWZhdWx0LmxlZ2VuZDtcbmV4cG9ydHMubGkgPSBoeXBlcnNjcmlwdF9oZWxwZXJzXzEuZGVmYXVsdC5saTtcbmV4cG9ydHMubGluayA9IGh5cGVyc2NyaXB0X2hlbHBlcnNfMS5kZWZhdWx0Lmxpbms7XG5leHBvcnRzLm1haW4gPSBoeXBlcnNjcmlwdF9oZWxwZXJzXzEuZGVmYXVsdC5tYWluO1xuZXhwb3J0cy5tYXAgPSBoeXBlcnNjcmlwdF9oZWxwZXJzXzEuZGVmYXVsdC5tYXA7XG5leHBvcnRzLm1hcmsgPSBoeXBlcnNjcmlwdF9oZWxwZXJzXzEuZGVmYXVsdC5tYXJrO1xuZXhwb3J0cy5tZW51ID0gaHlwZXJzY3JpcHRfaGVscGVyc18xLmRlZmF1bHQubWVudTtcbmV4cG9ydHMubWV0YSA9IGh5cGVyc2NyaXB0X2hlbHBlcnNfMS5kZWZhdWx0Lm1ldGE7XG5leHBvcnRzLm5hdiA9IGh5cGVyc2NyaXB0X2hlbHBlcnNfMS5kZWZhdWx0Lm5hdjtcbmV4cG9ydHMubm9zY3JpcHQgPSBoeXBlcnNjcmlwdF9oZWxwZXJzXzEuZGVmYXVsdC5ub3NjcmlwdDtcbmV4cG9ydHMub2JqZWN0ID0gaHlwZXJzY3JpcHRfaGVscGVyc18xLmRlZmF1bHQub2JqZWN0O1xuZXhwb3J0cy5vbCA9IGh5cGVyc2NyaXB0X2hlbHBlcnNfMS5kZWZhdWx0Lm9sO1xuZXhwb3J0cy5vcHRncm91cCA9IGh5cGVyc2NyaXB0X2hlbHBlcnNfMS5kZWZhdWx0Lm9wdGdyb3VwO1xuZXhwb3J0cy5vcHRpb24gPSBoeXBlcnNjcmlwdF9oZWxwZXJzXzEuZGVmYXVsdC5vcHRpb247XG5leHBvcnRzLnAgPSBoeXBlcnNjcmlwdF9oZWxwZXJzXzEuZGVmYXVsdC5wO1xuZXhwb3J0cy5wYXJhbSA9IGh5cGVyc2NyaXB0X2hlbHBlcnNfMS5kZWZhdWx0LnBhcmFtO1xuZXhwb3J0cy5wcmUgPSBoeXBlcnNjcmlwdF9oZWxwZXJzXzEuZGVmYXVsdC5wcmU7XG5leHBvcnRzLnByb2dyZXNzID0gaHlwZXJzY3JpcHRfaGVscGVyc18xLmRlZmF1bHQucHJvZ3Jlc3M7XG5leHBvcnRzLnEgPSBoeXBlcnNjcmlwdF9oZWxwZXJzXzEuZGVmYXVsdC5xO1xuZXhwb3J0cy5ycCA9IGh5cGVyc2NyaXB0X2hlbHBlcnNfMS5kZWZhdWx0LnJwO1xuZXhwb3J0cy5ydCA9IGh5cGVyc2NyaXB0X2hlbHBlcnNfMS5kZWZhdWx0LnJ0O1xuZXhwb3J0cy5ydWJ5ID0gaHlwZXJzY3JpcHRfaGVscGVyc18xLmRlZmF1bHQucnVieTtcbmV4cG9ydHMucyA9IGh5cGVyc2NyaXB0X2hlbHBlcnNfMS5kZWZhdWx0LnM7XG5leHBvcnRzLnNhbXAgPSBoeXBlcnNjcmlwdF9oZWxwZXJzXzEuZGVmYXVsdC5zYW1wO1xuZXhwb3J0cy5zY3JpcHQgPSBoeXBlcnNjcmlwdF9oZWxwZXJzXzEuZGVmYXVsdC5zY3JpcHQ7XG5leHBvcnRzLnNlY3Rpb24gPSBoeXBlcnNjcmlwdF9oZWxwZXJzXzEuZGVmYXVsdC5zZWN0aW9uO1xuZXhwb3J0cy5zZWxlY3QgPSBoeXBlcnNjcmlwdF9oZWxwZXJzXzEuZGVmYXVsdC5zZWxlY3Q7XG5leHBvcnRzLnNtYWxsID0gaHlwZXJzY3JpcHRfaGVscGVyc18xLmRlZmF1bHQuc21hbGw7XG5leHBvcnRzLnNvdXJjZSA9IGh5cGVyc2NyaXB0X2hlbHBlcnNfMS5kZWZhdWx0LnNvdXJjZTtcbmV4cG9ydHMuc3BhbiA9IGh5cGVyc2NyaXB0X2hlbHBlcnNfMS5kZWZhdWx0LnNwYW47XG5leHBvcnRzLnN0cm9uZyA9IGh5cGVyc2NyaXB0X2hlbHBlcnNfMS5kZWZhdWx0LnN0cm9uZztcbmV4cG9ydHMuc3R5bGUgPSBoeXBlcnNjcmlwdF9oZWxwZXJzXzEuZGVmYXVsdC5zdHlsZTtcbmV4cG9ydHMuc3ViID0gaHlwZXJzY3JpcHRfaGVscGVyc18xLmRlZmF1bHQuc3ViO1xuZXhwb3J0cy5zdXAgPSBoeXBlcnNjcmlwdF9oZWxwZXJzXzEuZGVmYXVsdC5zdXA7XG5leHBvcnRzLnRhYmxlID0gaHlwZXJzY3JpcHRfaGVscGVyc18xLmRlZmF1bHQudGFibGU7XG5leHBvcnRzLnRib2R5ID0gaHlwZXJzY3JpcHRfaGVscGVyc18xLmRlZmF1bHQudGJvZHk7XG5leHBvcnRzLnRkID0gaHlwZXJzY3JpcHRfaGVscGVyc18xLmRlZmF1bHQudGQ7XG5leHBvcnRzLnRleHRhcmVhID0gaHlwZXJzY3JpcHRfaGVscGVyc18xLmRlZmF1bHQudGV4dGFyZWE7XG5leHBvcnRzLnRmb290ID0gaHlwZXJzY3JpcHRfaGVscGVyc18xLmRlZmF1bHQudGZvb3Q7XG5leHBvcnRzLnRoID0gaHlwZXJzY3JpcHRfaGVscGVyc18xLmRlZmF1bHQudGg7XG5leHBvcnRzLnRoZWFkID0gaHlwZXJzY3JpcHRfaGVscGVyc18xLmRlZmF1bHQudGhlYWQ7XG5leHBvcnRzLnRpdGxlID0gaHlwZXJzY3JpcHRfaGVscGVyc18xLmRlZmF1bHQudGl0bGU7XG5leHBvcnRzLnRyID0gaHlwZXJzY3JpcHRfaGVscGVyc18xLmRlZmF1bHQudHI7XG5leHBvcnRzLnUgPSBoeXBlcnNjcmlwdF9oZWxwZXJzXzEuZGVmYXVsdC51O1xuZXhwb3J0cy51bCA9IGh5cGVyc2NyaXB0X2hlbHBlcnNfMS5kZWZhdWx0LnVsO1xuZXhwb3J0cy52aWRlbyA9IGh5cGVyc2NyaXB0X2hlbHBlcnNfMS5kZWZhdWx0LnZpZGVvO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9aW5kZXguanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XG52YXIgdm5vZGVfMSA9IHJlcXVpcmUoXCJzbmFiYmRvbS92bm9kZVwiKTtcbnZhciB1dGlsc18xID0gcmVxdWlyZShcIi4vdXRpbHNcIik7XG5mdW5jdGlvbiB0b3RhbElzb2xhdGVTb3VyY2Uoc291cmNlLCBzY29wZSkge1xuICAgIHJldHVybiBzb3VyY2Uuc2VsZWN0KHV0aWxzXzEuU0NPUEVfUFJFRklYICsgc2NvcGUpO1xufVxuZnVuY3Rpb24gc2libGluZ0lzb2xhdGVTb3VyY2Uoc291cmNlLCBzY29wZSkge1xuICAgIHJldHVybiBzb3VyY2Uuc2VsZWN0KHNjb3BlKTtcbn1cbmZ1bmN0aW9uIGlzb2xhdGVTb3VyY2Uoc291cmNlLCBzY29wZSkge1xuICAgIGlmIChzY29wZSA9PT0gJzpyb290Jykge1xuICAgICAgICByZXR1cm4gc291cmNlO1xuICAgIH1cbiAgICBlbHNlIGlmICh1dGlsc18xLmlzQ2xhc3NPcklkKHNjb3BlKSkge1xuICAgICAgICByZXR1cm4gc2libGluZ0lzb2xhdGVTb3VyY2Uoc291cmNlLCBzY29wZSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICByZXR1cm4gdG90YWxJc29sYXRlU291cmNlKHNvdXJjZSwgc2NvcGUpO1xuICAgIH1cbn1cbmV4cG9ydHMuaXNvbGF0ZVNvdXJjZSA9IGlzb2xhdGVTb3VyY2U7XG5mdW5jdGlvbiBzaWJsaW5nSXNvbGF0ZVNpbmsoc2luaywgc2NvcGUpIHtcbiAgICByZXR1cm4gc2luay5tYXAoZnVuY3Rpb24gKG5vZGUpIHtcbiAgICAgICAgcmV0dXJuIG5vZGUgP1xuICAgICAgICAgICAgdm5vZGVfMS52bm9kZShub2RlLnNlbCArIHNjb3BlLCBub2RlLmRhdGEsIG5vZGUuY2hpbGRyZW4sIG5vZGUudGV4dCwgbm9kZS5lbG0pIDpcbiAgICAgICAgICAgIG5vZGU7XG4gICAgfSk7XG59XG5leHBvcnRzLnNpYmxpbmdJc29sYXRlU2luayA9IHNpYmxpbmdJc29sYXRlU2luaztcbmZ1bmN0aW9uIHRvdGFsSXNvbGF0ZVNpbmsoc2luaywgZnVsbFNjb3BlKSB7XG4gICAgcmV0dXJuIHNpbmsubWFwKGZ1bmN0aW9uIChub2RlKSB7XG4gICAgICAgIGlmICghbm9kZSkge1xuICAgICAgICAgICAgcmV0dXJuIG5vZGU7XG4gICAgICAgIH1cbiAgICAgICAgLy8gSWdub3JlIGlmIGFscmVhZHkgaGFkIHVwLXRvLWRhdGUgZnVsbCBzY29wZSBpbiB2bm9kZS5kYXRhLmlzb2xhdGVcbiAgICAgICAgaWYgKG5vZGUuZGF0YSAmJiBub2RlLmRhdGEuaXNvbGF0ZSkge1xuICAgICAgICAgICAgdmFyIGlzb2xhdGVEYXRhID0gbm9kZS5kYXRhLmlzb2xhdGU7XG4gICAgICAgICAgICB2YXIgcHJldkZ1bGxTY29wZU51bSA9IGlzb2xhdGVEYXRhLnJlcGxhY2UoLyhjeWNsZXxcXC0pL2csICcnKTtcbiAgICAgICAgICAgIHZhciBmdWxsU2NvcGVOdW0gPSBmdWxsU2NvcGUucmVwbGFjZSgvKGN5Y2xlfFxcLSkvZywgJycpO1xuICAgICAgICAgICAgaWYgKGlzTmFOKHBhcnNlSW50KHByZXZGdWxsU2NvcGVOdW0pKVxuICAgICAgICAgICAgICAgIHx8IGlzTmFOKHBhcnNlSW50KGZ1bGxTY29wZU51bSkpXG4gICAgICAgICAgICAgICAgfHwgcHJldkZ1bGxTY29wZU51bSA+IGZ1bGxTY29wZU51bSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBub2RlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vIEluc2VydCB1cC10by1kYXRlIGZ1bGwgc2NvcGUgaW4gdm5vZGUuZGF0YS5pc29sYXRlLCBhbmQgYWxzbyBhIGtleSBpZiBuZWVkZWRcbiAgICAgICAgbm9kZS5kYXRhID0gbm9kZS5kYXRhIHx8IHt9O1xuICAgICAgICBub2RlLmRhdGEuaXNvbGF0ZSA9IGZ1bGxTY29wZTtcbiAgICAgICAgaWYgKHR5cGVvZiBub2RlLmtleSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIG5vZGUua2V5ID0gdXRpbHNfMS5TQ09QRV9QUkVGSVggKyBmdWxsU2NvcGU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG5vZGU7XG4gICAgfSk7XG59XG5leHBvcnRzLnRvdGFsSXNvbGF0ZVNpbmsgPSB0b3RhbElzb2xhdGVTaW5rO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9aXNvbGF0ZS5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcbnZhciBzbmFiYmRvbV8xID0gcmVxdWlyZShcInNuYWJiZG9tXCIpO1xudmFyIHhzdHJlYW1fMSA9IHJlcXVpcmUoXCJ4c3RyZWFtXCIpO1xudmFyIE1haW5ET01Tb3VyY2VfMSA9IHJlcXVpcmUoXCIuL01haW5ET01Tb3VyY2VcIik7XG52YXIgdG92bm9kZV8xID0gcmVxdWlyZShcInNuYWJiZG9tL3Rvdm5vZGVcIik7XG52YXIgVk5vZGVXcmFwcGVyXzEgPSByZXF1aXJlKFwiLi9WTm9kZVdyYXBwZXJcIik7XG52YXIgdXRpbHNfMSA9IHJlcXVpcmUoXCIuL3V0aWxzXCIpO1xudmFyIG1vZHVsZXNfMSA9IHJlcXVpcmUoXCIuL21vZHVsZXNcIik7XG52YXIgSXNvbGF0ZU1vZHVsZV8xID0gcmVxdWlyZShcIi4vSXNvbGF0ZU1vZHVsZVwiKTtcbnZhciBNYXBQb2x5ZmlsbCA9IHJlcXVpcmUoJ2VzNi1tYXAnKTtcbmZ1bmN0aW9uIG1ha2VET01Ecml2ZXJJbnB1dEd1YXJkKG1vZHVsZXMpIHtcbiAgICBpZiAoIUFycmF5LmlzQXJyYXkobW9kdWxlcykpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiT3B0aW9uYWwgbW9kdWxlcyBvcHRpb24gbXVzdCBiZSBcIiArXG4gICAgICAgICAgICBcImFuIGFycmF5IGZvciBzbmFiYmRvbSBtb2R1bGVzXCIpO1xuICAgIH1cbn1cbmZ1bmN0aW9uIGRvbURyaXZlcklucHV0R3VhcmQodmlldyQpIHtcbiAgICBpZiAoIXZpZXckXG4gICAgICAgIHx8IHR5cGVvZiB2aWV3JC5hZGRMaXN0ZW5lciAhPT0gXCJmdW5jdGlvblwiXG4gICAgICAgIHx8IHR5cGVvZiB2aWV3JC5mb2xkICE9PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVGhlIERPTSBkcml2ZXIgZnVuY3Rpb24gZXhwZWN0cyBhcyBpbnB1dCBhIFN0cmVhbSBvZiBcIiArXG4gICAgICAgICAgICBcInZpcnR1YWwgRE9NIGVsZW1lbnRzXCIpO1xuICAgIH1cbn1cbmZ1bmN0aW9uIGRyb3BDb21wbGV0aW9uKGlucHV0KSB7XG4gICAgcmV0dXJuIHhzdHJlYW1fMS5kZWZhdWx0Lm1lcmdlKGlucHV0LCB4c3RyZWFtXzEuZGVmYXVsdC5uZXZlcigpKTtcbn1cbmZ1bmN0aW9uIHVud3JhcEVsZW1lbnRGcm9tVk5vZGUodm5vZGUpIHtcbiAgICByZXR1cm4gdm5vZGUuZWxtO1xufVxuZnVuY3Rpb24gcmVwb3J0U25hYmJkb21FcnJvcihlcnIpIHtcbiAgICAoY29uc29sZS5lcnJvciB8fCBjb25zb2xlLmxvZykoZXJyKTtcbn1cbmZ1bmN0aW9uIG1ha2VET01Ecml2ZXIoY29udGFpbmVyLCBvcHRpb25zKSB7XG4gICAgaWYgKCFvcHRpb25zKSB7XG4gICAgICAgIG9wdGlvbnMgPSB7fTtcbiAgICB9XG4gICAgdmFyIG1vZHVsZXMgPSBvcHRpb25zLm1vZHVsZXMgfHwgbW9kdWxlc18xLmRlZmF1bHQ7XG4gICAgdmFyIGlzb2xhdGVNb2R1bGUgPSBuZXcgSXNvbGF0ZU1vZHVsZV8xLklzb2xhdGVNb2R1bGUoKTtcbiAgICB2YXIgcGF0Y2ggPSBzbmFiYmRvbV8xLmluaXQoW2lzb2xhdGVNb2R1bGUuY3JlYXRlTW9kdWxlKCldLmNvbmNhdChtb2R1bGVzKSk7XG4gICAgdmFyIHJvb3RFbGVtZW50ID0gdXRpbHNfMS5nZXRFbGVtZW50KGNvbnRhaW5lcikgfHwgZG9jdW1lbnQuYm9keTtcbiAgICB2YXIgdm5vZGVXcmFwcGVyID0gbmV3IFZOb2RlV3JhcHBlcl8xLlZOb2RlV3JhcHBlcihyb290RWxlbWVudCk7XG4gICAgdmFyIGRlbGVnYXRvcnMgPSBuZXcgTWFwUG9seWZpbGwoKTtcbiAgICBtYWtlRE9NRHJpdmVySW5wdXRHdWFyZChtb2R1bGVzKTtcbiAgICBmdW5jdGlvbiBET01Ecml2ZXIodm5vZGUkLCBuYW1lKSB7XG4gICAgICAgIGlmIChuYW1lID09PSB2b2lkIDApIHsgbmFtZSA9ICdET00nOyB9XG4gICAgICAgIGRvbURyaXZlcklucHV0R3VhcmQodm5vZGUkKTtcbiAgICAgICAgdmFyIHNhbml0YXRpb24kID0geHN0cmVhbV8xLmRlZmF1bHQuY3JlYXRlKCk7XG4gICAgICAgIHZhciByb290RWxlbWVudCQgPSB4c3RyZWFtXzEuZGVmYXVsdC5tZXJnZSh2bm9kZSQuZW5kV2hlbihzYW5pdGF0aW9uJCksIHNhbml0YXRpb24kKVxuICAgICAgICAgICAgLm1hcChmdW5jdGlvbiAodm5vZGUpIHsgcmV0dXJuIHZub2RlV3JhcHBlci5jYWxsKHZub2RlKTsgfSlcbiAgICAgICAgICAgIC5mb2xkKHBhdGNoLCB0b3Zub2RlXzEudG9WTm9kZShyb290RWxlbWVudCkpXG4gICAgICAgICAgICAuZHJvcCgxKVxuICAgICAgICAgICAgLm1hcCh1bndyYXBFbGVtZW50RnJvbVZOb2RlKVxuICAgICAgICAgICAgLmNvbXBvc2UoZHJvcENvbXBsZXRpb24pIC8vIGRvbid0IGNvbXBsZXRlIHRoaXMgc3RyZWFtXG4gICAgICAgICAgICAuc3RhcnRXaXRoKHJvb3RFbGVtZW50KTtcbiAgICAgICAgLy8gU3RhcnQgdGhlIHNuYWJiZG9tIHBhdGNoaW5nLCBvdmVyIHRpbWVcbiAgICAgICAgdmFyIGxpc3RlbmVyID0geyBlcnJvcjogcmVwb3J0U25hYmJkb21FcnJvciB9O1xuICAgICAgICBpZiAoZG9jdW1lbnQucmVhZHlTdGF0ZSA9PT0gJ2xvYWRpbmcnKSB7XG4gICAgICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdyZWFkeXN0YXRlY2hhbmdlJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGlmIChkb2N1bWVudC5yZWFkeVN0YXRlID09PSAnaW50ZXJhY3RpdmUnKSB7XG4gICAgICAgICAgICAgICAgICAgIHJvb3RFbGVtZW50JC5hZGRMaXN0ZW5lcihsaXN0ZW5lcik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICByb290RWxlbWVudCQuYWRkTGlzdGVuZXIobGlzdGVuZXIpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZXcgTWFpbkRPTVNvdXJjZV8xLk1haW5ET01Tb3VyY2Uocm9vdEVsZW1lbnQkLCBzYW5pdGF0aW9uJCwgW10sIGlzb2xhdGVNb2R1bGUsIGRlbGVnYXRvcnMsIG5hbWUpO1xuICAgIH1cbiAgICA7XG4gICAgcmV0dXJuIERPTURyaXZlcjtcbn1cbmV4cG9ydHMubWFrZURPTURyaXZlciA9IG1ha2VET01Ecml2ZXI7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1tYWtlRE9NRHJpdmVyLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xuZnVuY3Rpb24gY3JlYXRlTWF0Y2hlc1NlbGVjdG9yKCkge1xuICAgIHZhciB2ZW5kb3I7XG4gICAgdHJ5IHtcbiAgICAgICAgdmFyIHByb3RvID0gRWxlbWVudC5wcm90b3R5cGU7XG4gICAgICAgIHZlbmRvciA9IHByb3RvLm1hdGNoZXNcbiAgICAgICAgICAgIHx8IHByb3RvLm1hdGNoZXNTZWxlY3RvclxuICAgICAgICAgICAgfHwgcHJvdG8ud2Via2l0TWF0Y2hlc1NlbGVjdG9yXG4gICAgICAgICAgICB8fCBwcm90by5tb3pNYXRjaGVzU2VsZWN0b3JcbiAgICAgICAgICAgIHx8IHByb3RvLm1zTWF0Y2hlc1NlbGVjdG9yXG4gICAgICAgICAgICB8fCBwcm90by5vTWF0Y2hlc1NlbGVjdG9yO1xuICAgIH1cbiAgICBjYXRjaCAoZXJyKSB7XG4gICAgICAgIHZlbmRvciA9IG51bGw7XG4gICAgfVxuICAgIHJldHVybiBmdW5jdGlvbiBtYXRjaChlbGVtLCBzZWxlY3Rvcikge1xuICAgICAgICBpZiAodmVuZG9yKSB7XG4gICAgICAgICAgICByZXR1cm4gdmVuZG9yLmNhbGwoZWxlbSwgc2VsZWN0b3IpO1xuICAgICAgICB9XG4gICAgICAgIHZhciBub2RlcyA9IGVsZW0ucGFyZW50Tm9kZS5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBub2Rlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgaWYgKG5vZGVzW2ldID09PSBlbGVtKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH07XG59XG5leHBvcnRzLm1hdGNoZXNTZWxlY3RvciA9IGNyZWF0ZU1hdGNoZXNTZWxlY3RvcigpO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9bWF0Y2hlc1NlbGVjdG9yLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xudmFyIHhzdHJlYW1fMSA9IHJlcXVpcmUoXCJ4c3RyZWFtXCIpO1xudmFyIGFkYXB0XzEgPSByZXF1aXJlKFwiQGN5Y2xlL3J1bi9saWIvYWRhcHRcIik7XG52YXIgU0NPUEVfUFJFRklYID0gJ19fXyc7XG52YXIgTW9ja2VkRE9NU291cmNlID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBNb2NrZWRET01Tb3VyY2UoX21vY2tDb25maWcpIHtcbiAgICAgICAgdGhpcy5fbW9ja0NvbmZpZyA9IF9tb2NrQ29uZmlnO1xuICAgICAgICBpZiAoX21vY2tDb25maWdbJ2VsZW1lbnRzJ10pIHtcbiAgICAgICAgICAgIHRoaXMuX2VsZW1lbnRzID0gX21vY2tDb25maWdbJ2VsZW1lbnRzJ107XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9lbGVtZW50cyA9IGFkYXB0XzEuYWRhcHQoeHN0cmVhbV8xLmRlZmF1bHQuZW1wdHkoKSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgTW9ja2VkRE9NU291cmNlLnByb3RvdHlwZS5lbGVtZW50cyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIG91dCA9IHRoaXMuX2VsZW1lbnRzO1xuICAgICAgICBvdXQuX2lzQ3ljbGVTb3VyY2UgPSAnTW9ja2VkRE9NJztcbiAgICAgICAgcmV0dXJuIG91dDtcbiAgICB9O1xuICAgIE1vY2tlZERPTVNvdXJjZS5wcm90b3R5cGUuZXZlbnRzID0gZnVuY3Rpb24gKGV2ZW50VHlwZSwgb3B0aW9ucykge1xuICAgICAgICB2YXIgc3RyZWFtRm9yRXZlbnRUeXBlID0gdGhpcy5fbW9ja0NvbmZpZ1tldmVudFR5cGVdO1xuICAgICAgICB2YXIgb3V0ID0gYWRhcHRfMS5hZGFwdChzdHJlYW1Gb3JFdmVudFR5cGUgfHwgeHN0cmVhbV8xLmRlZmF1bHQuZW1wdHkoKSk7XG4gICAgICAgIG91dC5faXNDeWNsZVNvdXJjZSA9ICdNb2NrZWRET00nO1xuICAgICAgICByZXR1cm4gb3V0O1xuICAgIH07XG4gICAgTW9ja2VkRE9NU291cmNlLnByb3RvdHlwZS5zZWxlY3QgPSBmdW5jdGlvbiAoc2VsZWN0b3IpIHtcbiAgICAgICAgdmFyIG1vY2tDb25maWdGb3JTZWxlY3RvciA9IHRoaXMuX21vY2tDb25maWdbc2VsZWN0b3JdIHx8IHt9O1xuICAgICAgICByZXR1cm4gbmV3IE1vY2tlZERPTVNvdXJjZShtb2NrQ29uZmlnRm9yU2VsZWN0b3IpO1xuICAgIH07XG4gICAgTW9ja2VkRE9NU291cmNlLnByb3RvdHlwZS5pc29sYXRlU291cmNlID0gZnVuY3Rpb24gKHNvdXJjZSwgc2NvcGUpIHtcbiAgICAgICAgcmV0dXJuIHNvdXJjZS5zZWxlY3QoJy4nICsgU0NPUEVfUFJFRklYICsgc2NvcGUpO1xuICAgIH07XG4gICAgTW9ja2VkRE9NU291cmNlLnByb3RvdHlwZS5pc29sYXRlU2luayA9IGZ1bmN0aW9uIChzaW5rLCBzY29wZSkge1xuICAgICAgICByZXR1cm4gc2luay5tYXAoZnVuY3Rpb24gKHZub2RlKSB7XG4gICAgICAgICAgICBpZiAodm5vZGUuc2VsICYmIHZub2RlLnNlbC5pbmRleE9mKFNDT1BFX1BSRUZJWCArIHNjb3BlKSAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdm5vZGU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB2bm9kZS5zZWwgKz0gXCIuXCIgKyBTQ09QRV9QUkVGSVggKyBzY29wZTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdm5vZGU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH07XG4gICAgcmV0dXJuIE1vY2tlZERPTVNvdXJjZTtcbn0oKSk7XG5leHBvcnRzLk1vY2tlZERPTVNvdXJjZSA9IE1vY2tlZERPTVNvdXJjZTtcbmZ1bmN0aW9uIG1vY2tET01Tb3VyY2UobW9ja0NvbmZpZykge1xuICAgIHJldHVybiBuZXcgTW9ja2VkRE9NU291cmNlKG1vY2tDb25maWcpO1xufVxuZXhwb3J0cy5tb2NrRE9NU291cmNlID0gbW9ja0RPTVNvdXJjZTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPW1vY2tET01Tb3VyY2UuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XG52YXIgY2xhc3NfMSA9IHJlcXVpcmUoXCJzbmFiYmRvbS9tb2R1bGVzL2NsYXNzXCIpO1xuZXhwb3J0cy5DbGFzc01vZHVsZSA9IGNsYXNzXzEuZGVmYXVsdDtcbnZhciBwcm9wc18xID0gcmVxdWlyZShcInNuYWJiZG9tL21vZHVsZXMvcHJvcHNcIik7XG5leHBvcnRzLlByb3BzTW9kdWxlID0gcHJvcHNfMS5kZWZhdWx0O1xudmFyIGF0dHJpYnV0ZXNfMSA9IHJlcXVpcmUoXCJzbmFiYmRvbS9tb2R1bGVzL2F0dHJpYnV0ZXNcIik7XG5leHBvcnRzLkF0dHJzTW9kdWxlID0gYXR0cmlidXRlc18xLmRlZmF1bHQ7XG52YXIgc3R5bGVfMSA9IHJlcXVpcmUoXCJzbmFiYmRvbS9tb2R1bGVzL3N0eWxlXCIpO1xuZXhwb3J0cy5TdHlsZU1vZHVsZSA9IHN0eWxlXzEuZGVmYXVsdDtcbnZhciBkYXRhc2V0XzEgPSByZXF1aXJlKFwic25hYmJkb20vbW9kdWxlcy9kYXRhc2V0XCIpO1xuZXhwb3J0cy5EYXRhc2V0TW9kdWxlID0gZGF0YXNldF8xLmRlZmF1bHQ7XG52YXIgbW9kdWxlcyA9IFtzdHlsZV8xLmRlZmF1bHQsIGNsYXNzXzEuZGVmYXVsdCwgcHJvcHNfMS5kZWZhdWx0LCBhdHRyaWJ1dGVzXzEuZGVmYXVsdCwgZGF0YXNldF8xLmRlZmF1bHRdO1xuZXhwb3J0cy5kZWZhdWx0ID0gbW9kdWxlcztcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPW1vZHVsZXMuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XG52YXIgaF8xID0gcmVxdWlyZShcInNuYWJiZG9tL2hcIik7XG5mdW5jdGlvbiBjb3B5VG9UaHVuayh2bm9kZSwgdGh1bmspIHtcbiAgICB0aHVuay5lbG0gPSB2bm9kZS5lbG07XG4gICAgdm5vZGUuZGF0YS5mbiA9IHRodW5rLmRhdGEuZm47XG4gICAgdm5vZGUuZGF0YS5hcmdzID0gdGh1bmsuZGF0YS5hcmdzO1xuICAgIHZub2RlLmRhdGEuaXNvbGF0ZSA9IHRodW5rLmRhdGEuaXNvbGF0ZTtcbiAgICB0aHVuay5kYXRhID0gdm5vZGUuZGF0YTtcbiAgICB0aHVuay5jaGlsZHJlbiA9IHZub2RlLmNoaWxkcmVuO1xuICAgIHRodW5rLnRleHQgPSB2bm9kZS50ZXh0O1xuICAgIHRodW5rLmVsbSA9IHZub2RlLmVsbTtcbn1cbmZ1bmN0aW9uIGluaXQodGh1bmspIHtcbiAgICB2YXIgY3VyID0gdGh1bmsuZGF0YTtcbiAgICB2YXIgdm5vZGUgPSBjdXIuZm4uYXBwbHkodW5kZWZpbmVkLCBjdXIuYXJncyk7XG4gICAgY29weVRvVGh1bmsodm5vZGUsIHRodW5rKTtcbn1cbmZ1bmN0aW9uIHByZXBhdGNoKG9sZFZub2RlLCB0aHVuaykge1xuICAgIHZhciBvbGQgPSBvbGRWbm9kZS5kYXRhLCBjdXIgPSB0aHVuay5kYXRhO1xuICAgIHZhciBpO1xuICAgIHZhciBvbGRBcmdzID0gb2xkLmFyZ3MsIGFyZ3MgPSBjdXIuYXJncztcbiAgICBpZiAob2xkLmZuICE9PSBjdXIuZm4gfHwgb2xkQXJncy5sZW5ndGggIT09IGFyZ3MubGVuZ3RoKSB7XG4gICAgICAgIGNvcHlUb1RodW5rKGN1ci5mbi5hcHBseSh1bmRlZmluZWQsIGFyZ3MpLCB0aHVuayk7XG4gICAgfVxuICAgIGZvciAoaSA9IDA7IGkgPCBhcmdzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgIGlmIChvbGRBcmdzW2ldICE9PSBhcmdzW2ldKSB7XG4gICAgICAgICAgICBjb3B5VG9UaHVuayhjdXIuZm4uYXBwbHkodW5kZWZpbmVkLCBhcmdzKSwgdGh1bmspO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgfVxuICAgIGNvcHlUb1RodW5rKG9sZFZub2RlLCB0aHVuayk7XG59XG5leHBvcnRzLnRodW5rID0gZnVuY3Rpb24gdGh1bmsoc2VsLCBrZXksIGZuLCBhcmdzKSB7XG4gICAgaWYgKGFyZ3MgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBhcmdzID0gZm47XG4gICAgICAgIGZuID0ga2V5O1xuICAgICAgICBrZXkgPSB1bmRlZmluZWQ7XG4gICAgfVxuICAgIHJldHVybiBoXzEuaChzZWwsIHtcbiAgICAgICAga2V5OiBrZXksXG4gICAgICAgIGhvb2s6IHsgaW5pdDogaW5pdCwgcHJlcGF0Y2g6IHByZXBhdGNoIH0sXG4gICAgICAgIGZuOiBmbixcbiAgICAgICAgYXJnczogYXJncyxcbiAgICB9KTtcbn07XG5leHBvcnRzLmRlZmF1bHQgPSBleHBvcnRzLnRodW5rO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9dGh1bmsuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XG5mdW5jdGlvbiBpc0VsZW1lbnQob2JqKSB7XG4gICAgdmFyIEVMRU1fVFlQRSA9IDE7XG4gICAgdmFyIEZSQUdfVFlQRSA9IDExO1xuICAgIHJldHVybiB0eXBlb2YgSFRNTEVsZW1lbnQgPT09ICdvYmplY3QnID9cbiAgICAgICAgb2JqIGluc3RhbmNlb2YgSFRNTEVsZW1lbnQgfHwgb2JqIGluc3RhbmNlb2YgRG9jdW1lbnRGcmFnbWVudCA6XG4gICAgICAgIG9iaiAmJiB0eXBlb2Ygb2JqID09PSAnb2JqZWN0JyAmJiBvYmogIT09IG51bGwgJiZcbiAgICAgICAgICAgIChvYmoubm9kZVR5cGUgPT09IEVMRU1fVFlQRSB8fCBvYmoubm9kZVR5cGUgPT09IEZSQUdfVFlQRSkgJiZcbiAgICAgICAgICAgIHR5cGVvZiBvYmoubm9kZU5hbWUgPT09ICdzdHJpbmcnO1xufVxuZnVuY3Rpb24gaXNDbGFzc09ySWQoc3RyKSB7XG4gICAgcmV0dXJuIHN0ci5sZW5ndGggPiAxICYmIChzdHJbMF0gPT09ICcuJyB8fCBzdHJbMF0gPT09ICcjJyk7XG59XG5leHBvcnRzLmlzQ2xhc3NPcklkID0gaXNDbGFzc09ySWQ7XG5leHBvcnRzLlNDT1BFX1BSRUZJWCA9ICckJENZQ0xFRE9NJCQtJztcbmZ1bmN0aW9uIGdldEVsZW1lbnQoc2VsZWN0b3JzKSB7XG4gICAgdmFyIGRvbUVsZW1lbnQgPSB0eXBlb2Ygc2VsZWN0b3JzID09PSAnc3RyaW5nJyA/XG4gICAgICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3Ioc2VsZWN0b3JzKSA6XG4gICAgICAgIHNlbGVjdG9ycztcbiAgICBpZiAodHlwZW9mIHNlbGVjdG9ycyA9PT0gJ3N0cmluZycgJiYgZG9tRWxlbWVudCA9PT0gbnVsbCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgcmVuZGVyIGludG8gdW5rbm93biBlbGVtZW50IGBcIiArIHNlbGVjdG9ycyArIFwiYFwiKTtcbiAgICB9XG4gICAgZWxzZSBpZiAoIWlzRWxlbWVudChkb21FbGVtZW50KSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0dpdmVuIGNvbnRhaW5lciBpcyBub3QgYSBET00gZWxlbWVudCBuZWl0aGVyIGEgJyArXG4gICAgICAgICAgICAnc2VsZWN0b3Igc3RyaW5nLicpO1xuICAgIH1cbiAgICByZXR1cm4gZG9tRWxlbWVudDtcbn1cbmV4cG9ydHMuZ2V0RWxlbWVudCA9IGdldEVsZW1lbnQ7XG4vKipcbiAqIFRoZSBmdWxsIHNjb3BlIG9mIGEgbmFtZXNwYWNlIGlzIHRoZSBcImFic29sdXRlIHBhdGhcIiBvZiBzY29wZXMgZnJvbVxuICogcGFyZW50IHRvIGNoaWxkLiBUaGlzIGlzIGV4dHJhY3RlZCBmcm9tIHRoZSBuYW1lc3BhY2UsIGZpbHRlciBvbmx5IGZvclxuICogc2NvcGVzIGluIHRoZSBuYW1lc3BhY2UuXG4gKi9cbmZ1bmN0aW9uIGdldEZ1bGxTY29wZShuYW1lc3BhY2UpIHtcbiAgICByZXR1cm4gbmFtZXNwYWNlXG4gICAgICAgIC5maWx0ZXIoZnVuY3Rpb24gKGMpIHsgcmV0dXJuIGMuaW5kZXhPZihleHBvcnRzLlNDT1BFX1BSRUZJWCkgPiAtMTsgfSlcbiAgICAgICAgLm1hcChmdW5jdGlvbiAoYykgeyByZXR1cm4gYy5yZXBsYWNlKGV4cG9ydHMuU0NPUEVfUFJFRklYLCAnJyk7IH0pXG4gICAgICAgIC5qb2luKCctJyk7XG59XG5leHBvcnRzLmdldEZ1bGxTY29wZSA9IGdldEZ1bGxTY29wZTtcbmZ1bmN0aW9uIGdldFNlbGVjdG9ycyhuYW1lc3BhY2UpIHtcbiAgICByZXR1cm4gbmFtZXNwYWNlLmZpbHRlcihmdW5jdGlvbiAoYykgeyByZXR1cm4gYy5pbmRleE9mKGV4cG9ydHMuU0NPUEVfUFJFRklYKSA9PT0gLTE7IH0pLmpvaW4oJyAnKTtcbn1cbmV4cG9ydHMuZ2V0U2VsZWN0b3JzID0gZ2V0U2VsZWN0b3JzO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9dXRpbHMuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XG52YXIgeHN0cmVhbV8xID0gcmVxdWlyZShcInhzdHJlYW1cIik7XG52YXIgQ0xJQ0tfRVZFTlQgPSB0eXBlb2YgZG9jdW1lbnQgIT09ICd1bmRlZmluZWQnICYmIGRvY3VtZW50Lm9udG91Y2hzdGFydCA/XG4gICAgJ3RvdWNoc3RhcnQnIDpcbiAgICAnY2xpY2snO1xuZnVuY3Rpb24gd2hpY2goZXYpIHtcbiAgICBpZiAodHlwZW9mIHdpbmRvdyA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICB2YXIgZSA9IGV2IHx8IHdpbmRvdy5ldmVudDtcbiAgICByZXR1cm4gZS53aGljaCA9PT0gbnVsbCA/IGUuYnV0dG9uIDogZS53aGljaDtcbn1cbmZ1bmN0aW9uIHNhbWVPcmlnaW4oaHJlZikge1xuICAgIGlmICh0eXBlb2Ygd2luZG93ID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiBocmVmICYmIGhyZWYuaW5kZXhPZih3aW5kb3cubG9jYXRpb24ub3JpZ2luKSA9PT0gMDtcbn1cbmZ1bmN0aW9uIG1ha2VDbGlja0xpc3RlbmVyKHB1c2gpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gY2xpY2tMaXN0ZW5lcihldmVudCkge1xuICAgICAgICBpZiAod2hpY2goZXZlbnQpICE9PSAxKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGV2ZW50Lm1ldGFLZXkgfHwgZXZlbnQuY3RybEtleSB8fCBldmVudC5zaGlmdEtleSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmIChldmVudC5kZWZhdWx0UHJldmVudGVkKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGVsZW1lbnQgPSBldmVudC50YXJnZXQ7XG4gICAgICAgIHdoaWxlIChlbGVtZW50ICYmIGVsZW1lbnQubm9kZU5hbWUgIT09ICdBJykge1xuICAgICAgICAgICAgZWxlbWVudCA9IGVsZW1lbnQucGFyZW50Tm9kZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIWVsZW1lbnQgfHwgZWxlbWVudC5ub2RlTmFtZSAhPT0gJ0EnKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGVsZW1lbnQuaGFzQXR0cmlidXRlKCdkb3dubG9hZCcpIHx8XG4gICAgICAgICAgICBlbGVtZW50LmdldEF0dHJpYnV0ZSgncmVsJykgPT09ICdleHRlcm5hbCcpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZWxlbWVudC50YXJnZXQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB2YXIgbGluayA9IGVsZW1lbnQuZ2V0QXR0cmlidXRlKCdocmVmJyk7XG4gICAgICAgIGlmIChsaW5rICYmIGxpbmsuaW5kZXhPZignbWFpbHRvOicpID4gLTEgfHwgbGluay5jaGFyQXQoMCkgPT09ICcjJykge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmICghc2FtZU9yaWdpbihlbGVtZW50LmhyZWYpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgdmFyIHBhdGhuYW1lID0gZWxlbWVudC5wYXRobmFtZSwgc2VhcmNoID0gZWxlbWVudC5zZWFyY2gsIF9hID0gZWxlbWVudC5oYXNoLCBoYXNoID0gX2EgPT09IHZvaWQgMCA/ICcnIDogX2E7XG4gICAgICAgIHB1c2gocGF0aG5hbWUgKyBzZWFyY2ggKyBoYXNoKTtcbiAgICB9O1xufVxuZnVuY3Rpb24gY2FwdHVyZUFuY2hvckNsaWNrcyhwdXNoKSB7XG4gICAgdmFyIGxpc3RlbmVyID0gbWFrZUNsaWNrTGlzdGVuZXIocHVzaCk7XG4gICAgaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoQ0xJQ0tfRVZFTlQsIGxpc3RlbmVyLCBmYWxzZSk7XG4gICAgfVxufVxuZnVuY3Rpb24gY2FwdHVyZUNsaWNrcyhoaXN0b3J5RHJpdmVyKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIGhpc3RvcnlEcml2ZXJXaXRoQ2xpY2tDYXB0dXJlKHNpbmskKSB7XG4gICAgICAgIHZhciBpbnRlcm5hbFNpbmskID0geHN0cmVhbV8xLmRlZmF1bHQuY3JlYXRlKCk7XG4gICAgICAgIGNhcHR1cmVBbmNob3JDbGlja3MoZnVuY3Rpb24gKHBhdGhuYW1lKSB7XG4gICAgICAgICAgICBpbnRlcm5hbFNpbmskLl9uKHsgdHlwZTogJ3B1c2gnLCBwYXRobmFtZTogcGF0aG5hbWUgfSk7XG4gICAgICAgIH0pO1xuICAgICAgICBzaW5rJC5fYWRkKGludGVybmFsU2luayQpO1xuICAgICAgICByZXR1cm4gaGlzdG9yeURyaXZlcihpbnRlcm5hbFNpbmskKTtcbiAgICB9O1xufVxuZXhwb3J0cy5jYXB0dXJlQ2xpY2tzID0gY2FwdHVyZUNsaWNrcztcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWNhcHR1cmVDbGlja3MuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XG52YXIgeHN0cmVhbV8xID0gcmVxdWlyZShcInhzdHJlYW1cIik7XG5mdW5jdGlvbiBjcmVhdGVIaXN0b3J5JChoaXN0b3J5LCBzaW5rJCkge1xuICAgIHZhciBoaXN0b3J5JCA9IHhzdHJlYW1fMS5kZWZhdWx0LmNyZWF0ZVdpdGhNZW1vcnkoKS5zdGFydFdpdGgoaGlzdG9yeS5sb2NhdGlvbik7XG4gICAgdmFyIGNhbGwgPSBtYWtlQ2FsbE9uSGlzdG9yeShoaXN0b3J5KTtcbiAgICB2YXIgdW5saXN0ZW4gPSBoaXN0b3J5Lmxpc3RlbihmdW5jdGlvbiAobG9jKSB7IGhpc3RvcnkkLl9uKGxvYyk7IH0pO1xuICAgIHZhciBzdWIgPSBzaW5rJC5zdWJzY3JpYmUoY3JlYXRlT2JzZXJ2ZXIoY2FsbCwgdW5saXN0ZW4pKTtcbiAgICBoaXN0b3J5JC5kaXNwb3NlID0gZnVuY3Rpb24gKCkgeyBzdWIudW5zdWJzY3JpYmUoKTsgdW5saXN0ZW4oKTsgfTtcbiAgICByZXR1cm4gaGlzdG9yeSQ7XG59XG5leHBvcnRzLmNyZWF0ZUhpc3RvcnkkID0gY3JlYXRlSGlzdG9yeSQ7XG47XG5mdW5jdGlvbiBtYWtlQ2FsbE9uSGlzdG9yeShoaXN0b3J5KSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIGNhbGwoaW5wdXQpIHtcbiAgICAgICAgaWYgKGlucHV0LnR5cGUgPT09ICdwdXNoJykge1xuICAgICAgICAgICAgaGlzdG9yeS5wdXNoKGlucHV0LnBhdGhuYW1lLCBpbnB1dC5zdGF0ZSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGlucHV0LnR5cGUgPT09ICdyZXBsYWNlJykge1xuICAgICAgICAgICAgaGlzdG9yeS5yZXBsYWNlKGlucHV0LnBhdGhuYW1lLCBpbnB1dC5zdGF0ZSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGlucHV0LnR5cGUgPT09ICdnbycpIHtcbiAgICAgICAgICAgIGhpc3RvcnkuZ28oaW5wdXQuYW1vdW50KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaW5wdXQudHlwZSA9PT0gJ2dvQmFjaycpIHtcbiAgICAgICAgICAgIGhpc3RvcnkuZ29CYWNrKCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGlucHV0LnR5cGUgPT09ICdnb0ZvcndhcmQnKSB7XG4gICAgICAgICAgICBoaXN0b3J5LmdvRm9yd2FyZCgpO1xuICAgICAgICB9XG4gICAgfTtcbn1cbmZ1bmN0aW9uIGNyZWF0ZU9ic2VydmVyKGNhbGwsIHVubGlzdGVuKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgbmV4dDogZnVuY3Rpb24gKGlucHV0KSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIGlucHV0ID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgIGNhbGwoeyB0eXBlOiAncHVzaCcsIHBhdGhuYW1lOiBpbnB1dCB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGNhbGwoaW5wdXQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBlcnJvcjogZnVuY3Rpb24gKGVycikgeyB1bmxpc3RlbigpOyB9LFxuICAgICAgICBjb21wbGV0ZTogZnVuY3Rpb24gKCkgeyBzZXRUaW1lb3V0KHVubGlzdGVuKTsgfSxcbiAgICB9O1xufVxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9Y3JlYXRlSGlzdG9yeSQuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XG52YXIgaGlzdG9yeV8xID0gcmVxdWlyZShcImhpc3RvcnlcIik7XG52YXIgY3JlYXRlSGlzdG9yeV8xID0gcmVxdWlyZShcIi4vY3JlYXRlSGlzdG9yeSRcIik7XG5mdW5jdGlvbiBtYWtlSGlzdG9yeURyaXZlcihvcHRpb25zKSB7XG4gICAgdmFyIGhpc3Rvcnk7XG4gICAgaWYgKG9wdGlvbnMgJiYgb3B0aW9ucy5oYXNPd25Qcm9wZXJ0eSgnY3JlYXRlSHJlZicpKSB7XG4gICAgICAgIGhpc3RvcnkgPSBvcHRpb25zO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgaGlzdG9yeSA9IGhpc3RvcnlfMS5jcmVhdGVCcm93c2VySGlzdG9yeShvcHRpb25zKTtcbiAgICB9XG4gICAgcmV0dXJuIGZ1bmN0aW9uIGhpc3RvcnlEcml2ZXIoc2luayQpIHtcbiAgICAgICAgcmV0dXJuIGNyZWF0ZUhpc3RvcnlfMS5jcmVhdGVIaXN0b3J5JChoaXN0b3J5LCBzaW5rJCk7XG4gICAgfTtcbn1cbmV4cG9ydHMubWFrZUhpc3RvcnlEcml2ZXIgPSBtYWtlSGlzdG9yeURyaXZlcjtcbmZ1bmN0aW9uIG1ha2VTZXJ2ZXJIaXN0b3J5RHJpdmVyKG9wdGlvbnMpIHtcbiAgICB2YXIgaGlzdG9yeSA9IGhpc3RvcnlfMS5jcmVhdGVNZW1vcnlIaXN0b3J5KG9wdGlvbnMpO1xuICAgIHJldHVybiBmdW5jdGlvbiBzZXJ2ZXJIaXN0b3J5RHJpdmVyKHNpbmskKSB7XG4gICAgICAgIHJldHVybiBjcmVhdGVIaXN0b3J5XzEuY3JlYXRlSGlzdG9yeSQoaGlzdG9yeSwgc2luayQpO1xuICAgIH07XG59XG5leHBvcnRzLm1ha2VTZXJ2ZXJIaXN0b3J5RHJpdmVyID0gbWFrZVNlcnZlckhpc3RvcnlEcml2ZXI7XG5mdW5jdGlvbiBtYWtlSGFzaEhpc3RvcnlEcml2ZXIob3B0aW9ucykge1xuICAgIHZhciBoaXN0b3J5ID0gaGlzdG9yeV8xLmNyZWF0ZUhhc2hIaXN0b3J5KG9wdGlvbnMpO1xuICAgIHJldHVybiBmdW5jdGlvbiBoYXNoSGlzdG9yeURyaXZlcihzaW5rJCkge1xuICAgICAgICByZXR1cm4gY3JlYXRlSGlzdG9yeV8xLmNyZWF0ZUhpc3RvcnkkKGhpc3RvcnksIHNpbmskKTtcbiAgICB9O1xufVxuZXhwb3J0cy5tYWtlSGFzaEhpc3RvcnlEcml2ZXIgPSBtYWtlSGFzaEhpc3RvcnlEcml2ZXI7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1kcml2ZXJzLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xuLyoqXG4gKiBDcmVhdGUgYSBIaXN0b3J5IERyaXZlciB0byBiZSB1c2VkIGluIHRoZSBicm93c2VyLlxuICpcbiAqIFRoaXMgaXMgYSBmdW5jdGlvbiB3aGljaCwgd2hlbiBjYWxsZWQsIHJldHVybnMgYSBIaXN0b3J5IERyaXZlciBmb3IgQ3ljbGUuanNcbiAqIGFwcHMuIFRoZSBkcml2ZXIgaXMgYWxzbyBhIGZ1bmN0aW9uLCBhbmQgaXQgdGFrZXMgYSBzdHJlYW0gb2YgbmV3IGxvY2F0aW9uc1xuICogKHN0cmluZ3MgcmVwcmVzZW50aW5nIHBhdGhuYW1lcyBvciBsb2NhdGlvbiBvYmplY3RzKSBhcyBpbnB1dCwgYW5kIG91dHB1dHNcbiAqIGFub3RoZXIgc3RyZWFtIG9mIGxvY2F0aW9ucyB0aGF0IHdlcmUgYXBwbGllZC4gRXhhbXBsZTpcbiAqXG4gKiBgYGBqc1xuICogaW1wb3J0IHtydW59IGZyb20gJ0BjeWNsZS9ydW4nO1xuICogaW1wb3J0IHttYWtlSGlzdG9yeURyaXZlcn0gZnJvbSAnQGN5Y2xlL2hpc3RvcnknO1xuICpcbiAqIGZ1bmN0aW9uIG1haW4oc291cmNlcyl7XG4gKiAgIHJldHVybiB7XG4gKiAgICAgLy8gdXBkYXRlcyB0aGUgYnJvd3NlciBVUkwgZXZlcnkgNTAwbXNcbiAqICAgICBoaXN0b3J5OiB4cy5wZXJpb2RpYyg1MDApLm1hcChpID0+IGB1cmwtJHtpfWApXG4gKiAgIH07XG4gKiB9XG4gKlxuICogY29uc3QgZHJpdmVycyA9IHtcbiAqICAgaGlzdG9yeTogbWFrZUhpc3RvcnlEcml2ZXIoKVxuICogfTtcbiAqXG4gKiBydW4obWFpbiwgZHJpdmVycyk7XG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0ge29iamVjdHxIaXN0b3J5fE1lbW9yeUhpc3Rvcnl9IG9wdGlvbnMgYW4gb2JqZWN0IHdpdGggc29tZSBvcHRpb25zIHNwZWNpZmljIHRvXG4gKiB0aGlzIGRyaXZlci4gVGhlc2Ugb3B0aW9ucyBhcmUgdGhlIHNhbWUgYXMgZm9yIHRoZSBjb3JyZXNwb25kaW5nXG4gKiBgY3JlYXRlQnJvd3Nlckhpc3RvcnkoKWAgZnVuY3Rpb24gaW4gSGlzdG9yeSB2NC4gQ2hlY2sgaXRzXG4gKiBbZG9jc10oaHR0cHM6Ly9naXRodWIuY29tL21qYWNrc29uL2hpc3RvcnkvdHJlZS92NC41LjEjdXNhZ2UpIGZvciBhIGdvb2RcbiAqIGRlc2NyaXB0aW9uIG9uIHRoZSBvcHRpb25zLiBBbHRlcm5hdGl2ZWx5LCBhIEhpc3Rvcnkgb2JqZWN0IGNhbiBhbHNvIGJlIHNlbnRcbiAqIGluIGNhc2UgdGhlIGV4dGVybmFsIGNvbnN1bWVyIG5lZWRzIGRpcmVjdCBhY2Nlc3MgdG8gYW55IG9mIHRoZSBkaXJlY3QgSGlzdG9yeVxuICogbWV0aG9kc1xuICogQHJldHVybiB7RnVuY3Rpb259IHRoZSBIaXN0b3J5IERyaXZlciBmdW5jdGlvblxuICogQGZ1bmN0aW9uIG1ha2VIaXN0b3J5RHJpdmVyXG4gKi9cbnZhciBkcml2ZXJzXzEgPSByZXF1aXJlKFwiLi9kcml2ZXJzXCIpO1xuZXhwb3J0cy5tYWtlSGlzdG9yeURyaXZlciA9IGRyaXZlcnNfMS5tYWtlSGlzdG9yeURyaXZlcjtcbi8qKlxuICogQ3JlYXRlIGEgSGlzdG9yeSBEcml2ZXIgZm9yIG9sZGVyIGJyb3dzZXJzIHVzaW5nIGhhc2ggcm91dGluZy5cbiAqXG4gKiBUaGlzIGlzIGEgZnVuY3Rpb24gd2hpY2gsIHdoZW4gY2FsbGVkLCByZXR1cm5zIGEgSGlzdG9yeSBEcml2ZXIgZm9yIEN5Y2xlLmpzXG4gKiBhcHBzLiBUaGUgZHJpdmVyIGlzIGFsc28gYSBmdW5jdGlvbiwgYW5kIGl0IHRha2VzIGEgc3RyZWFtIG9mIG5ldyBsb2NhdGlvbnNcbiAqIChzdHJpbmdzIHJlcHJlc2VudGluZyBwYXRobmFtZXMgb3IgbG9jYXRpb24gb2JqZWN0cykgYXMgaW5wdXQsIGFuZCBvdXRwdXRzXG4gKiBhbm90aGVyIHN0cmVhbSBvZiBsb2NhdGlvbnMgdGhhdCB3ZXJlIGFwcGxpZWQuXG4gKlxuICogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnMgYW4gb2JqZWN0IHdpdGggc29tZSBvcHRpb25zIHNwZWNpZmljIHRvXG4gKiB0aGlzIGRyaXZlci4gVGhlc2Ugb3B0aW9ucyBhcmUgdGhlIHNhbWUgYXMgZm9yIHRoZSBjb3JyZXNwb25kaW5nXG4gKiBgY3JlYXRlSGFzaEhpc3RvcnkoKWAgZnVuY3Rpb24gaW4gSGlzdG9yeSB2NC4gQ2hlY2sgaXRzXG4gKiBbZG9jc10oaHR0cHM6Ly9naXRodWIuY29tL21qYWNrc29uL2hpc3RvcnkvdHJlZS92NC41LjEjdXNhZ2UpIGZvciBhIGdvb2RcbiAqIGRlc2NyaXB0aW9uIG9uIHRoZSBvcHRpb25zLlxuICogQHJldHVybiB7RnVuY3Rpb259IHRoZSBIaXN0b3J5IERyaXZlciBmdW5jdGlvblxuICogQGZ1bmN0aW9uIG1ha2VIYXNoSGlzdG9yeURyaXZlclxuICovXG52YXIgZHJpdmVyc18yID0gcmVxdWlyZShcIi4vZHJpdmVyc1wiKTtcbmV4cG9ydHMubWFrZUhhc2hIaXN0b3J5RHJpdmVyID0gZHJpdmVyc18yLm1ha2VIYXNoSGlzdG9yeURyaXZlcjtcbi8qKlxuICogV3JhcHMgYSBIaXN0b3J5IERyaXZlciB0byBhZGQgXCJjbGljayBjYXB0dXJpbmdcIiBmdW5jdGlvbmFsaXR5LlxuICpcbiAqIElmIHlvdSB3YW50IHRvIGludGVyY2VwdCBhbmQgaGFuZGxlIGFueSBjbGljayBldmVudCB0aGF0IGxlYWRzIHRvIGEgbGluayxcbiAqIGxpa2Ugb24gYW4gYDxhPmAgZWxlbWVudCwgeW91IHBhc3MgeW91ciBleGlzdGluZyBkcml2ZXIgKGUuZy4gY3JlYXRlZCBmcm9tXG4gKiBgbWFrZUhpc3RvcnlEcml2ZXIoKWApIGFzIGFyZ3VtZW50IGFuZCB0aGlzIGZ1bmN0aW9uIHdpbGwgcmV0dXJuIGFub3RoZXJcbiAqIGRyaXZlciBvZiB0aGUgc2FtZSBuYXR1cmUsIGJ1dCBpbmNsdWRpbmcgY2xpY2sgY2FwdHVyaW5nIGxvZ2ljLiBFeGFtcGxlOlxuICpcbiAqIGBgYGpzXG4gKiBpbXBvcnQge2NhcHR1cmVDbGlja3MsIG1ha2VIaXN0b3J5RHJpdmVyfSBmcm9tICdAY3ljbGUvaGlzdG9yeSc7XG4gKlxuICogY29uc3QgZHJpdmVycyA9IHtcbiAqICAgaGlzdG9yeTogY2FwdHVyZUNsaWNrcyhtYWtlSGlzdG9yeURyaXZlcigpKVxuICogfTtcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGRyaXZlciBhbiBleGlzdGluZyBIaXN0b3J5IERyaXZlciBmdW5jdGlvbi5cbiAqIEByZXR1cm4ge0Z1bmN0aW9ufSBhIEhpc3RvcnkgRHJpdmVyIGZ1bmN0aW9uXG4gKiBAZnVuY3Rpb24gY2FwdHVyZUNsaWNrc1xuICovXG52YXIgY2FwdHVyZUNsaWNrc18xID0gcmVxdWlyZShcIi4vY2FwdHVyZUNsaWNrc1wiKTtcbmV4cG9ydHMuY2FwdHVyZUNsaWNrcyA9IGNhcHR1cmVDbGlja3NfMS5jYXB0dXJlQ2xpY2tzO1xuLyoqXG4gKiBDcmVhdGUgYSBIaXN0b3J5IERyaXZlciB0byBiZSB1c2VkIGluIG5vbi1icm93c2VyIGVudmlyb21lbnRzIHN1Y2ggYXNcbiAqIHNlcnZlci1zaWRlIE5vZGUuanMuXG4gKlxuICogVGhpcyBpcyBhIGZ1bmN0aW9uIHdoaWNoLCB3aGVuIGNhbGxlZCwgcmV0dXJucyBhIEhpc3RvcnkgRHJpdmVyIGZvciBDeWNsZS5qc1xuICogYXBwcy4gVGhlIGRyaXZlciBpcyBhbHNvIGEgZnVuY3Rpb24sIGFuZCBpdCB0YWtlcyBhIHN0cmVhbSBvZiBuZXcgbG9jYXRpb25zXG4gKiAoc3RyaW5ncyByZXByZXNlbnRpbmcgcGF0aG5hbWVzIG9yIGxvY2F0aW9uIG9iamVjdHMpIGFzIGlucHV0LCBhbmQgb3V0cHV0c1xuICogYW5vdGhlciBzdHJlYW0gb2YgbG9jYXRpb25zIHRoYXQgd2VyZSBhcHBsaWVkLlxuICpcbiAqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zIGFuIG9iamVjdCB3aXRoIHNvbWUgb3B0aW9ucyBzcGVjaWZpYyB0b1xuICogdGhpcyBkcml2ZXIuIFRoZXNlIG9wdGlvbnMgYXJlIHRoZSBzYW1lIGFzIGZvciB0aGUgY29ycmVzcG9uZGluZ1xuICogYGNyZWF0ZU1lbW9yeUhpc3RvcnkoKWAgZnVuY3Rpb24gaW4gSGlzdG9yeSB2NC4gQ2hlY2sgaXRzXG4gKiBbZG9jc10oaHR0cHM6Ly9naXRodWIuY29tL21qYWNrc29uL2hpc3RvcnkvdHJlZS92NC41LjEjdXNhZ2UpIGZvciBhIGdvb2RcbiAqIGRlc2NyaXB0aW9uIG9uIHRoZSBvcHRpb25zLlxuICogQHJldHVybiB7RnVuY3Rpb259IHRoZSBIaXN0b3J5IERyaXZlciBmdW5jdGlvblxuICogQGZ1bmN0aW9uIG1ha2VTZXJ2ZXJIaXN0b3J5RHJpdmVyXG4gKi9cbnZhciBkcml2ZXJzXzMgPSByZXF1aXJlKFwiLi9kcml2ZXJzXCIpO1xuZXhwb3J0cy5tYWtlU2VydmVySGlzdG9yeURyaXZlciA9IGRyaXZlcnNfMy5tYWtlU2VydmVySGlzdG9yeURyaXZlcjtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWluZGV4LmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xuZnVuY3Rpb24gY2hlY2tJc29sYXRlQXJncyhkYXRhZmxvd0NvbXBvbmVudCwgc2NvcGUpIHtcbiAgICBpZiAodHlwZW9mIGRhdGFmbG93Q29tcG9uZW50ICE9PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRmlyc3QgYXJndW1lbnQgZ2l2ZW4gdG8gaXNvbGF0ZSgpIG11c3QgYmUgYSBcIiArXG4gICAgICAgICAgICBcIidkYXRhZmxvd0NvbXBvbmVudCcgZnVuY3Rpb25cIik7XG4gICAgfVxuICAgIGlmIChzY29wZSA9PT0gbnVsbCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJTZWNvbmQgYXJndW1lbnQgZ2l2ZW4gdG8gaXNvbGF0ZSgpIG11c3Qgbm90IGJlIG51bGxcIik7XG4gICAgfVxufVxuZnVuY3Rpb24gbm9ybWFsaXplU2NvcGVzKHNvdXJjZXMsIHNjb3BlcywgcmFuZG9tU2NvcGUpIHtcbiAgICB2YXIgcGVyQ2hhbm5lbCA9IHt9O1xuICAgIE9iamVjdC5rZXlzKHNvdXJjZXMpLmZvckVhY2goZnVuY3Rpb24gKGNoYW5uZWwpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBzY29wZXMgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBwZXJDaGFubmVsW2NoYW5uZWxdID0gc2NvcGVzO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHZhciBjYW5kaWRhdGUgPSBzY29wZXNbY2hhbm5lbF07XG4gICAgICAgIGlmICh0eXBlb2YgY2FuZGlkYXRlICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgcGVyQ2hhbm5lbFtjaGFubmVsXSA9IGNhbmRpZGF0ZTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB2YXIgd2lsZGNhcmQgPSBzY29wZXNbJyonXTtcbiAgICAgICAgaWYgKHR5cGVvZiB3aWxkY2FyZCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIHBlckNoYW5uZWxbY2hhbm5lbF0gPSB3aWxkY2FyZDtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBwZXJDaGFubmVsW2NoYW5uZWxdID0gcmFuZG9tU2NvcGU7XG4gICAgfSk7XG4gICAgcmV0dXJuIHBlckNoYW5uZWw7XG59XG5mdW5jdGlvbiBpc29sYXRlQWxsU291cmNlcyhvdXRlclNvdXJjZXMsIHNjb3Blcykge1xuICAgIHZhciBpbm5lclNvdXJjZXMgPSB7fTtcbiAgICBmb3IgKHZhciBjaGFubmVsIGluIG91dGVyU291cmNlcykge1xuICAgICAgICB2YXIgb3V0ZXJTb3VyY2UgPSBvdXRlclNvdXJjZXNbY2hhbm5lbF07XG4gICAgICAgIGlmIChvdXRlclNvdXJjZXMuaGFzT3duUHJvcGVydHkoY2hhbm5lbClcbiAgICAgICAgICAgICYmIG91dGVyU291cmNlXG4gICAgICAgICAgICAmJiB0eXBlb2Ygb3V0ZXJTb3VyY2UuaXNvbGF0ZVNvdXJjZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgaW5uZXJTb3VyY2VzW2NoYW5uZWxdID0gb3V0ZXJTb3VyY2UuaXNvbGF0ZVNvdXJjZShvdXRlclNvdXJjZSwgc2NvcGVzW2NoYW5uZWxdKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChvdXRlclNvdXJjZXMuaGFzT3duUHJvcGVydHkoY2hhbm5lbCkpIHtcbiAgICAgICAgICAgIGlubmVyU291cmNlc1tjaGFubmVsXSA9IG91dGVyU291cmNlc1tjaGFubmVsXTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gaW5uZXJTb3VyY2VzO1xufVxuZnVuY3Rpb24gaXNvbGF0ZUFsbFNpbmtzKHNvdXJjZXMsIGlubmVyU2lua3MsIHNjb3Blcykge1xuICAgIHZhciBvdXRlclNpbmtzID0ge307XG4gICAgZm9yICh2YXIgY2hhbm5lbCBpbiBpbm5lclNpbmtzKSB7XG4gICAgICAgIHZhciBzb3VyY2UgPSBzb3VyY2VzW2NoYW5uZWxdO1xuICAgICAgICB2YXIgaW5uZXJTaW5rID0gaW5uZXJTaW5rc1tjaGFubmVsXTtcbiAgICAgICAgaWYgKGlubmVyU2lua3MuaGFzT3duUHJvcGVydHkoY2hhbm5lbClcbiAgICAgICAgICAgICYmIHNvdXJjZVxuICAgICAgICAgICAgJiYgdHlwZW9mIHNvdXJjZS5pc29sYXRlU2luayA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgb3V0ZXJTaW5rc1tjaGFubmVsXSA9IHNvdXJjZS5pc29sYXRlU2luayhpbm5lclNpbmssIHNjb3Blc1tjaGFubmVsXSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoaW5uZXJTaW5rcy5oYXNPd25Qcm9wZXJ0eShjaGFubmVsKSkge1xuICAgICAgICAgICAgb3V0ZXJTaW5rc1tjaGFubmVsXSA9IGlubmVyU2lua3NbY2hhbm5lbF07XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG91dGVyU2lua3M7XG59XG52YXIgY291bnRlciA9IDA7XG5mdW5jdGlvbiBuZXdTY29wZSgpIHtcbiAgICByZXR1cm4gXCJjeWNsZVwiICsgKytjb3VudGVyO1xufVxuLyoqXG4gKiBUYWtlcyBhIGBjb21wb25lbnRgIGZ1bmN0aW9uIGFuZCBhbiBvcHRpb25hbCBgc2NvcGVgIHN0cmluZywgYW5kIHJldHVybnMgYVxuICogc2NvcGVkIHZlcnNpb24gb2YgdGhlIGBjb21wb25lbnRgIGZ1bmN0aW9uLlxuICpcbiAqIFdoZW4gdGhlIHNjb3BlZCBjb21wb25lbnQgaXMgaW52b2tlZCwgZWFjaCBzb3VyY2UgcHJvdmlkZWQgdG8gdGhlIHNjb3BlZFxuICogY29tcG9uZW50IGlzIGlzb2xhdGVkIHRvIHRoZSBnaXZlbiBgc2NvcGVgIHVzaW5nXG4gKiBgc291cmNlLmlzb2xhdGVTb3VyY2Uoc291cmNlLCBzY29wZSlgLCBpZiBwb3NzaWJsZS4gTGlrZXdpc2UsIHRoZSBzaW5rc1xuICogcmV0dXJuZWQgZnJvbSB0aGUgc2NvcGVkIGNvbXBvbmVudCBhcmUgaXNvbGF0ZWQgdG8gdGhlIGBzY29wZWAgdXNpbmdcbiAqIGBzb3VyY2UuaXNvbGF0ZVNpbmsoc2luaywgc2NvcGUpYC5cbiAqXG4gKiBJZiB0aGUgYHNjb3BlYCBpcyBub3QgcHJvdmlkZWQsIGEgbmV3IHNjb3BlIHdpbGwgYmUgYXV0b21hdGljYWxseSBjcmVhdGVkLlxuICogVGhpcyBtZWFucyB0aGF0IHdoaWxlICoqYGlzb2xhdGUoY29tcG9uZW50LCBzY29wZSlgIGlzIHB1cmUqKlxuICogKHJlZmVyZW50aWFsbHkgdHJhbnNwYXJlbnQpLCAqKmBpc29sYXRlKGNvbXBvbmVudClgIGlzIGltcHVyZSoqXG4gKiAobm90IHJlZmVyZW50aWFsbHkgdHJhbnNwYXJlbnQpLiBUd28gY2FsbHMgdG8gYGlzb2xhdGUoRm9vLCBiYXIpYCB3aWxsXG4gKiBnZW5lcmF0ZSB0aGUgc2FtZSBjb21wb25lbnQuIEJ1dCwgdHdvIGNhbGxzIHRvIGBpc29sYXRlKEZvbylgIHdpbGwgZ2VuZXJhdGVcbiAqIHR3byBkaXN0aW5jdCBjb21wb25lbnRzLlxuICpcbiAqIE5vdGUgdGhhdCBib3RoIGBpc29sYXRlU291cmNlKClgIGFuZCBgaXNvbGF0ZVNpbmsoKWAgYXJlIHN0YXRpYyBtZW1iZXJzIG9mXG4gKiBgc291cmNlYC4gVGhlIHJlYXNvbiBmb3IgdGhpcyBpcyB0aGF0IGRyaXZlcnMgcHJvZHVjZSBgc291cmNlYCB3aGlsZSB0aGVcbiAqIGFwcGxpY2F0aW9uIHByb2R1Y2VzIGBzaW5rYCwgYW5kIGl0J3MgdGhlIGRyaXZlcidzIHJlc3BvbnNpYmlsaXR5IHRvXG4gKiBpbXBsZW1lbnQgYGlzb2xhdGVTb3VyY2UoKWAgYW5kIGBpc29sYXRlU2luaygpYC5cbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBjb21wb25lbnQgYSBmdW5jdGlvbiB0aGF0IHRha2VzIGBzb3VyY2VzYCBhcyBpbnB1dFxuICogYW5kIG91dHB1dHMgYSBjb2xsZWN0aW9uIG9mIGBzaW5rc2AuXG4gKiBAcGFyYW0ge1N0cmluZ30gc2NvcGUgYW4gb3B0aW9uYWwgc3RyaW5nIHRoYXQgaXMgdXNlZCB0byBpc29sYXRlIGVhY2hcbiAqIGBzb3VyY2VzYCBhbmQgYHNpbmtzYCB3aGVuIHRoZSByZXR1cm5lZCBzY29wZWQgY29tcG9uZW50IGlzIGludm9rZWQuXG4gKiBAcmV0dXJuIHtGdW5jdGlvbn0gdGhlIHNjb3BlZCBjb21wb25lbnQgZnVuY3Rpb24gdGhhdCwgYXMgdGhlIG9yaWdpbmFsXG4gKiBgY29tcG9uZW50YCBmdW5jdGlvbiwgdGFrZXMgYHNvdXJjZXNgIGFuZCByZXR1cm5zIGBzaW5rc2AuXG4gKiBAZnVuY3Rpb24gaXNvbGF0ZVxuICovXG5mdW5jdGlvbiBpc29sYXRlKGNvbXBvbmVudCwgc2NvcGUpIHtcbiAgICBpZiAoc2NvcGUgPT09IHZvaWQgMCkgeyBzY29wZSA9IG5ld1Njb3BlKCk7IH1cbiAgICBjaGVja0lzb2xhdGVBcmdzKGNvbXBvbmVudCwgc2NvcGUpO1xuICAgIHZhciByYW5kb21TY29wZSA9IHR5cGVvZiBzY29wZSA9PT0gJ29iamVjdCcgPyBuZXdTY29wZSgpIDogJyc7XG4gICAgdmFyIHNjb3BlcyA9IHR5cGVvZiBzY29wZSA9PT0gJ3N0cmluZycgfHwgdHlwZW9mIHNjb3BlID09PSAnb2JqZWN0JyA/XG4gICAgICAgIHNjb3BlIDpcbiAgICAgICAgc2NvcGUudG9TdHJpbmcoKTtcbiAgICByZXR1cm4gZnVuY3Rpb24gd3JhcHBlZENvbXBvbmVudChvdXRlclNvdXJjZXMpIHtcbiAgICAgICAgdmFyIHJlc3QgPSBbXTtcbiAgICAgICAgZm9yICh2YXIgX2kgPSAxOyBfaSA8IGFyZ3VtZW50cy5sZW5ndGg7IF9pKyspIHtcbiAgICAgICAgICAgIHJlc3RbX2kgLSAxXSA9IGFyZ3VtZW50c1tfaV07XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHNjb3Blc1BlckNoYW5uZWwgPSBub3JtYWxpemVTY29wZXMob3V0ZXJTb3VyY2VzLCBzY29wZXMsIHJhbmRvbVNjb3BlKTtcbiAgICAgICAgdmFyIGlubmVyU291cmNlcyA9IGlzb2xhdGVBbGxTb3VyY2VzKG91dGVyU291cmNlcywgc2NvcGVzUGVyQ2hhbm5lbCk7XG4gICAgICAgIHZhciBpbm5lclNpbmtzID0gY29tcG9uZW50LmFwcGx5KHZvaWQgMCwgW2lubmVyU291cmNlc10uY29uY2F0KHJlc3QpKTtcbiAgICAgICAgdmFyIG91dGVyU2lua3MgPSBpc29sYXRlQWxsU2lua3Mob3V0ZXJTb3VyY2VzLCBpbm5lclNpbmtzLCBzY29wZXNQZXJDaGFubmVsKTtcbiAgICAgICAgcmV0dXJuIG91dGVyU2lua3M7XG4gICAgfTtcbn1cbmlzb2xhdGUucmVzZXQgPSBmdW5jdGlvbiAoKSB7IHJldHVybiBjb3VudGVyID0gMDsgfTtcbmV4cG9ydHMuZGVmYXVsdCA9IGlzb2xhdGU7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1pbmRleC5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcbnZhciBhZGFwdFN0cmVhbSA9IGZ1bmN0aW9uICh4KSB7IHJldHVybiB4OyB9O1xuZnVuY3Rpb24gc2V0QWRhcHQoZikge1xuICAgIGFkYXB0U3RyZWFtID0gZjtcbn1cbmV4cG9ydHMuc2V0QWRhcHQgPSBzZXRBZGFwdDtcbmZ1bmN0aW9uIGFkYXB0KHN0cmVhbSkge1xuICAgIHJldHVybiBhZGFwdFN0cmVhbShzdHJlYW0pO1xufVxuZXhwb3J0cy5hZGFwdCA9IGFkYXB0O1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9YWRhcHQuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XG52YXIgeHN0cmVhbV8xID0gcmVxdWlyZShcInhzdHJlYW1cIik7XG52YXIgYWRhcHRfMSA9IHJlcXVpcmUoXCIuL2FkYXB0XCIpO1xuZnVuY3Rpb24gbG9nVG9Db25zb2xlRXJyb3IoZXJyKSB7XG4gICAgdmFyIHRhcmdldCA9IGVyci5zdGFjayB8fCBlcnI7XG4gICAgaWYgKGNvbnNvbGUgJiYgY29uc29sZS5lcnJvcikge1xuICAgICAgICBjb25zb2xlLmVycm9yKHRhcmdldCk7XG4gICAgfVxuICAgIGVsc2UgaWYgKGNvbnNvbGUgJiYgY29uc29sZS5sb2cpIHtcbiAgICAgICAgY29uc29sZS5sb2codGFyZ2V0KTtcbiAgICB9XG59XG5mdW5jdGlvbiBtYWtlU2lua1Byb3hpZXMoZHJpdmVycykge1xuICAgIHZhciBzaW5rUHJveGllcyA9IHt9O1xuICAgIGZvciAodmFyIG5hbWVfMSBpbiBkcml2ZXJzKSB7XG4gICAgICAgIGlmIChkcml2ZXJzLmhhc093blByb3BlcnR5KG5hbWVfMSkpIHtcbiAgICAgICAgICAgIHNpbmtQcm94aWVzW25hbWVfMV0gPSB4c3RyZWFtXzEuZGVmYXVsdC5jcmVhdGVXaXRoTWVtb3J5KCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHNpbmtQcm94aWVzO1xufVxuZnVuY3Rpb24gY2FsbERyaXZlcnMoZHJpdmVycywgc2lua1Byb3hpZXMpIHtcbiAgICB2YXIgc291cmNlcyA9IHt9O1xuICAgIGZvciAodmFyIG5hbWVfMiBpbiBkcml2ZXJzKSB7XG4gICAgICAgIGlmIChkcml2ZXJzLmhhc093blByb3BlcnR5KG5hbWVfMikpIHtcbiAgICAgICAgICAgIHNvdXJjZXNbbmFtZV8yXSA9IGRyaXZlcnNbbmFtZV8yXShzaW5rUHJveGllc1tuYW1lXzJdLCBuYW1lXzIpO1xuICAgICAgICAgICAgaWYgKHNvdXJjZXNbbmFtZV8yXSAmJiB0eXBlb2Ygc291cmNlc1tuYW1lXzJdID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgICAgIHNvdXJjZXNbbmFtZV8yXS5faXNDeWNsZVNvdXJjZSA9IG5hbWVfMjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gc291cmNlcztcbn1cbi8vIE5PVEU6IHRoaXMgd2lsbCBtdXRhdGUgYHNvdXJjZXNgLlxuZnVuY3Rpb24gYWRhcHRTb3VyY2VzKHNvdXJjZXMpIHtcbiAgICBmb3IgKHZhciBuYW1lXzMgaW4gc291cmNlcykge1xuICAgICAgICBpZiAoc291cmNlcy5oYXNPd25Qcm9wZXJ0eShuYW1lXzMpXG4gICAgICAgICAgICAmJiBzb3VyY2VzW25hbWVfM11cbiAgICAgICAgICAgICYmIHR5cGVvZiBzb3VyY2VzW25hbWVfM11bJ3NoYW1lZnVsbHlTZW5kTmV4dCddID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBzb3VyY2VzW25hbWVfM10gPSBhZGFwdF8xLmFkYXB0KHNvdXJjZXNbbmFtZV8zXSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHNvdXJjZXM7XG59XG5mdW5jdGlvbiByZXBsaWNhdGVNYW55KHNpbmtzLCBzaW5rUHJveGllcykge1xuICAgIHZhciBzaW5rTmFtZXMgPSBPYmplY3Qua2V5cyhzaW5rcykuZmlsdGVyKGZ1bmN0aW9uIChuYW1lKSB7IHJldHVybiAhIXNpbmtQcm94aWVzW25hbWVdOyB9KTtcbiAgICB2YXIgYnVmZmVycyA9IHt9O1xuICAgIHZhciByZXBsaWNhdG9ycyA9IHt9O1xuICAgIHNpbmtOYW1lcy5mb3JFYWNoKGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgICAgIGJ1ZmZlcnNbbmFtZV0gPSB7IF9uOiBbXSwgX2U6IFtdIH07XG4gICAgICAgIHJlcGxpY2F0b3JzW25hbWVdID0ge1xuICAgICAgICAgICAgbmV4dDogZnVuY3Rpb24gKHgpIHsgcmV0dXJuIGJ1ZmZlcnNbbmFtZV0uX24ucHVzaCh4KTsgfSxcbiAgICAgICAgICAgIGVycm9yOiBmdW5jdGlvbiAoZXJyKSB7IHJldHVybiBidWZmZXJzW25hbWVdLl9lLnB1c2goZXJyKTsgfSxcbiAgICAgICAgICAgIGNvbXBsZXRlOiBmdW5jdGlvbiAoKSB7IH0sXG4gICAgICAgIH07XG4gICAgfSk7XG4gICAgdmFyIHN1YnNjcmlwdGlvbnMgPSBzaW5rTmFtZXNcbiAgICAgICAgLm1hcChmdW5jdGlvbiAobmFtZSkgeyByZXR1cm4geHN0cmVhbV8xLmRlZmF1bHQuZnJvbU9ic2VydmFibGUoc2lua3NbbmFtZV0pLnN1YnNjcmliZShyZXBsaWNhdG9yc1tuYW1lXSk7IH0pO1xuICAgIHNpbmtOYW1lcy5mb3JFYWNoKGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgICAgIHZhciBsaXN0ZW5lciA9IHNpbmtQcm94aWVzW25hbWVdO1xuICAgICAgICB2YXIgbmV4dCA9IGZ1bmN0aW9uICh4KSB7IGxpc3RlbmVyLl9uKHgpOyB9O1xuICAgICAgICB2YXIgZXJyb3IgPSBmdW5jdGlvbiAoZXJyKSB7IGxvZ1RvQ29uc29sZUVycm9yKGVycik7IGxpc3RlbmVyLl9lKGVycik7IH07XG4gICAgICAgIGJ1ZmZlcnNbbmFtZV0uX24uZm9yRWFjaChuZXh0KTtcbiAgICAgICAgYnVmZmVyc1tuYW1lXS5fZS5mb3JFYWNoKGVycm9yKTtcbiAgICAgICAgcmVwbGljYXRvcnNbbmFtZV0ubmV4dCA9IG5leHQ7XG4gICAgICAgIHJlcGxpY2F0b3JzW25hbWVdLmVycm9yID0gZXJyb3I7XG4gICAgICAgIC8vIGJlY2F1c2Ugc2luay5zdWJzY3JpYmUocmVwbGljYXRvcikgaGFkIG11dGF0ZWQgcmVwbGljYXRvciB0byBhZGRcbiAgICAgICAgLy8gX24sIF9lLCBfYywgd2UgbXVzdCBhbHNvIHVwZGF0ZSB0aGVzZTpcbiAgICAgICAgcmVwbGljYXRvcnNbbmFtZV0uX24gPSBuZXh0O1xuICAgICAgICByZXBsaWNhdG9yc1tuYW1lXS5fZSA9IGVycm9yO1xuICAgIH0pO1xuICAgIGJ1ZmZlcnMgPSBudWxsOyAvLyBmcmVlIHVwIGZvciBHQ1xuICAgIHJldHVybiBmdW5jdGlvbiBkaXNwb3NlUmVwbGljYXRpb24oKSB7XG4gICAgICAgIHN1YnNjcmlwdGlvbnMuZm9yRWFjaChmdW5jdGlvbiAocykgeyByZXR1cm4gcy51bnN1YnNjcmliZSgpOyB9KTtcbiAgICAgICAgc2lua05hbWVzLmZvckVhY2goZnVuY3Rpb24gKG5hbWUpIHsgcmV0dXJuIHNpbmtQcm94aWVzW25hbWVdLl9jKCk7IH0pO1xuICAgIH07XG59XG5mdW5jdGlvbiBkaXNwb3NlU291cmNlcyhzb3VyY2VzKSB7XG4gICAgZm9yICh2YXIgayBpbiBzb3VyY2VzKSB7XG4gICAgICAgIGlmIChzb3VyY2VzLmhhc093blByb3BlcnR5KGspICYmIHNvdXJjZXNba10gJiYgc291cmNlc1trXS5kaXNwb3NlKSB7XG4gICAgICAgICAgICBzb3VyY2VzW2tdLmRpc3Bvc2UoKTtcbiAgICAgICAgfVxuICAgIH1cbn1cbmZ1bmN0aW9uIGlzT2JqZWN0RW1wdHkob2JqKSB7XG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKG9iaikubGVuZ3RoID09PSAwO1xufVxuLyoqXG4gKiBBIGZ1bmN0aW9uIHRoYXQgcHJlcGFyZXMgdGhlIEN5Y2xlIGFwcGxpY2F0aW9uIHRvIGJlIGV4ZWN1dGVkLiBUYWtlcyBhIGBtYWluYFxuICogZnVuY3Rpb24gYW5kIHByZXBhcmVzIHRvIGNpcmN1bGFybHkgY29ubmVjdHMgaXQgdG8gdGhlIGdpdmVuIGNvbGxlY3Rpb24gb2ZcbiAqIGRyaXZlciBmdW5jdGlvbnMuIEFzIGFuIG91dHB1dCwgYHNldHVwKClgIHJldHVybnMgYW4gb2JqZWN0IHdpdGggdGhyZWVcbiAqIHByb3BlcnRpZXM6IGBzb3VyY2VzYCwgYHNpbmtzYCBhbmQgYHJ1bmAuIE9ubHkgd2hlbiBgcnVuKClgIGlzIGNhbGxlZCB3aWxsXG4gKiB0aGUgYXBwbGljYXRpb24gYWN0dWFsbHkgZXhlY3V0ZS4gUmVmZXIgdG8gdGhlIGRvY3VtZW50YXRpb24gb2YgYHJ1bigpYCBmb3JcbiAqIG1vcmUgZGV0YWlscy5cbiAqXG4gKiAqKkV4YW1wbGU6KipcbiAqIGBgYGpzXG4gKiBpbXBvcnQge3NldHVwfSBmcm9tICdAY3ljbGUvcnVuJztcbiAqIGNvbnN0IHtzb3VyY2VzLCBzaW5rcywgcnVufSA9IHNldHVwKG1haW4sIGRyaXZlcnMpO1xuICogLy8gLi4uXG4gKiBjb25zdCBkaXNwb3NlID0gcnVuKCk7IC8vIEV4ZWN1dGVzIHRoZSBhcHBsaWNhdGlvblxuICogLy8gLi4uXG4gKiBkaXNwb3NlKCk7XG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBtYWluIGEgZnVuY3Rpb24gdGhhdCB0YWtlcyBgc291cmNlc2AgYXMgaW5wdXQgYW5kIG91dHB1dHNcbiAqIGBzaW5rc2AuXG4gKiBAcGFyYW0ge09iamVjdH0gZHJpdmVycyBhbiBvYmplY3Qgd2hlcmUga2V5cyBhcmUgZHJpdmVyIG5hbWVzIGFuZCB2YWx1ZXNcbiAqIGFyZSBkcml2ZXIgZnVuY3Rpb25zLlxuICogQHJldHVybiB7T2JqZWN0fSBhbiBvYmplY3Qgd2l0aCB0aHJlZSBwcm9wZXJ0aWVzOiBgc291cmNlc2AsIGBzaW5rc2AgYW5kXG4gKiBgcnVuYC4gYHNvdXJjZXNgIGlzIHRoZSBjb2xsZWN0aW9uIG9mIGRyaXZlciBzb3VyY2VzLCBgc2lua3NgIGlzIHRoZVxuICogY29sbGVjdGlvbiBvZiBkcml2ZXIgc2lua3MsIHRoZXNlIGNhbiBiZSB1c2VkIGZvciBkZWJ1Z2dpbmcgb3IgdGVzdGluZy4gYHJ1bmBcbiAqIGlzIHRoZSBmdW5jdGlvbiB0aGF0IG9uY2UgY2FsbGVkIHdpbGwgZXhlY3V0ZSB0aGUgYXBwbGljYXRpb24uXG4gKiBAZnVuY3Rpb24gc2V0dXBcbiAqL1xuZnVuY3Rpb24gc2V0dXAobWFpbiwgZHJpdmVycykge1xuICAgIGlmICh0eXBlb2YgbWFpbiAhPT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIkZpcnN0IGFyZ3VtZW50IGdpdmVuIHRvIEN5Y2xlIG11c3QgYmUgdGhlICdtYWluJyBcIiArXG4gICAgICAgICAgICBcImZ1bmN0aW9uLlwiKTtcbiAgICB9XG4gICAgaWYgKHR5cGVvZiBkcml2ZXJzICE9PSBcIm9iamVjdFwiIHx8IGRyaXZlcnMgPT09IG51bGwpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiU2Vjb25kIGFyZ3VtZW50IGdpdmVuIHRvIEN5Y2xlIG11c3QgYmUgYW4gb2JqZWN0IFwiICtcbiAgICAgICAgICAgIFwid2l0aCBkcml2ZXIgZnVuY3Rpb25zIGFzIHByb3BlcnRpZXMuXCIpO1xuICAgIH1cbiAgICBpZiAoaXNPYmplY3RFbXB0eShkcml2ZXJzKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJTZWNvbmQgYXJndW1lbnQgZ2l2ZW4gdG8gQ3ljbGUgbXVzdCBiZSBhbiBvYmplY3QgXCIgK1xuICAgICAgICAgICAgXCJ3aXRoIGF0IGxlYXN0IG9uZSBkcml2ZXIgZnVuY3Rpb24gZGVjbGFyZWQgYXMgYSBwcm9wZXJ0eS5cIik7XG4gICAgfVxuICAgIHZhciBzaW5rUHJveGllcyA9IG1ha2VTaW5rUHJveGllcyhkcml2ZXJzKTtcbiAgICB2YXIgc291cmNlcyA9IGNhbGxEcml2ZXJzKGRyaXZlcnMsIHNpbmtQcm94aWVzKTtcbiAgICB2YXIgYWRhcHRlZFNvdXJjZXMgPSBhZGFwdFNvdXJjZXMoc291cmNlcyk7XG4gICAgdmFyIHNpbmtzID0gbWFpbihhZGFwdGVkU291cmNlcyk7XG4gICAgaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIHdpbmRvdy5DeWNsZWpzID0gd2luZG93LkN5Y2xlanMgfHwge307XG4gICAgICAgIHdpbmRvdy5DeWNsZWpzLnNpbmtzID0gc2lua3M7XG4gICAgfVxuICAgIGZ1bmN0aW9uIHJ1bigpIHtcbiAgICAgICAgdmFyIGRpc3Bvc2VSZXBsaWNhdGlvbiA9IHJlcGxpY2F0ZU1hbnkoc2lua3MsIHNpbmtQcm94aWVzKTtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIGRpc3Bvc2UoKSB7XG4gICAgICAgICAgICBkaXNwb3NlU291cmNlcyhzb3VyY2VzKTtcbiAgICAgICAgICAgIGRpc3Bvc2VSZXBsaWNhdGlvbigpO1xuICAgICAgICB9O1xuICAgIH1cbiAgICA7XG4gICAgcmV0dXJuIHsgc2lua3M6IHNpbmtzLCBzb3VyY2VzOiBzb3VyY2VzLCBydW46IHJ1biB9O1xufVxuZXhwb3J0cy5zZXR1cCA9IHNldHVwO1xuLyoqXG4gKiBUYWtlcyBhIGBtYWluYCBmdW5jdGlvbiBhbmQgY2lyY3VsYXJseSBjb25uZWN0cyBpdCB0byB0aGUgZ2l2ZW4gY29sbGVjdGlvblxuICogb2YgZHJpdmVyIGZ1bmN0aW9ucy5cbiAqXG4gKiAqKkV4YW1wbGU6KipcbiAqIGBgYGpzXG4gKiBpbXBvcnQgcnVuIGZyb20gJ0BjeWNsZS9ydW4nO1xuICogY29uc3QgZGlzcG9zZSA9IHJ1bihtYWluLCBkcml2ZXJzKTtcbiAqIC8vIC4uLlxuICogZGlzcG9zZSgpO1xuICogYGBgXG4gKlxuICogVGhlIGBtYWluYCBmdW5jdGlvbiBleHBlY3RzIGEgY29sbGVjdGlvbiBvZiBcInNvdXJjZVwiIHN0cmVhbXMgKHJldHVybmVkIGZyb21cbiAqIGRyaXZlcnMpIGFzIGlucHV0LCBhbmQgc2hvdWxkIHJldHVybiBhIGNvbGxlY3Rpb24gb2YgXCJzaW5rXCIgc3RyZWFtcyAodG8gYmVcbiAqIGdpdmVuIHRvIGRyaXZlcnMpLiBBIFwiY29sbGVjdGlvbiBvZiBzdHJlYW1zXCIgaXMgYSBKYXZhU2NyaXB0IG9iamVjdCB3aGVyZVxuICoga2V5cyBtYXRjaCB0aGUgZHJpdmVyIG5hbWVzIHJlZ2lzdGVyZWQgYnkgdGhlIGBkcml2ZXJzYCBvYmplY3QsIGFuZCB2YWx1ZXNcbiAqIGFyZSB0aGUgc3RyZWFtcy4gUmVmZXIgdG8gdGhlIGRvY3VtZW50YXRpb24gb2YgZWFjaCBkcml2ZXIgdG8gc2VlIG1vcmVcbiAqIGRldGFpbHMgb24gd2hhdCB0eXBlcyBvZiBzb3VyY2VzIGl0IG91dHB1dHMgYW5kIHNpbmtzIGl0IHJlY2VpdmVzLlxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IG1haW4gYSBmdW5jdGlvbiB0aGF0IHRha2VzIGBzb3VyY2VzYCBhcyBpbnB1dCBhbmQgb3V0cHV0c1xuICogYHNpbmtzYC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBkcml2ZXJzIGFuIG9iamVjdCB3aGVyZSBrZXlzIGFyZSBkcml2ZXIgbmFtZXMgYW5kIHZhbHVlc1xuICogYXJlIGRyaXZlciBmdW5jdGlvbnMuXG4gKiBAcmV0dXJuIHtGdW5jdGlvbn0gYSBkaXNwb3NlIGZ1bmN0aW9uLCB1c2VkIHRvIHRlcm1pbmF0ZSB0aGUgZXhlY3V0aW9uIG9mIHRoZVxuICogQ3ljbGUuanMgcHJvZ3JhbSwgY2xlYW5pbmcgdXAgcmVzb3VyY2VzIHVzZWQuXG4gKiBAZnVuY3Rpb24gcnVuXG4gKi9cbmZ1bmN0aW9uIHJ1bihtYWluLCBkcml2ZXJzKSB7XG4gICAgdmFyIF9hID0gc2V0dXAobWFpbiwgZHJpdmVycyksIHJ1biA9IF9hLnJ1biwgc2lua3MgPSBfYS5zaW5rcztcbiAgICBpZiAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgJiYgd2luZG93WydDeWNsZWpzRGV2VG9vbF9zdGFydEdyYXBoU2VyaWFsaXplciddKSB7XG4gICAgICAgIHdpbmRvd1snQ3ljbGVqc0RldlRvb2xfc3RhcnRHcmFwaFNlcmlhbGl6ZXInXShzaW5rcyk7XG4gICAgfVxuICAgIHJldHVybiBydW4oKTtcbn1cbmV4cG9ydHMucnVuID0gcnVuO1xuZXhwb3J0cy5kZWZhdWx0ID0gcnVuO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9aW5kZXguanMubWFwIiwiJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuXG52YXIgX3dyaXRlVG9TdG9yZSA9IHJlcXVpcmUoJy4vd3JpdGVUb1N0b3JlJyk7XG5cbnZhciBfd3JpdGVUb1N0b3JlMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX3dyaXRlVG9TdG9yZSk7XG5cbnZhciBfcmVzcG9uc2VDb2xsZWN0aW9uID0gcmVxdWlyZSgnLi9yZXNwb25zZUNvbGxlY3Rpb24nKTtcblxudmFyIF9yZXNwb25zZUNvbGxlY3Rpb24yID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfcmVzcG9uc2VDb2xsZWN0aW9uKTtcblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgZGVmYXVsdDogb2JqIH07IH1cblxuLyoqXG4gKiBTdG9yYWdlIERyaXZlci5cbiAqXG4gKiBUaGlzIGlzIGEgbG9jYWxTdG9yYWdlIGFuZCBzZXNzaW9uU3RvcmFnZSBEcml2ZXIgZm9yIEN5Y2xlLmpzIGFwcHMuIFRoZVxuICogZHJpdmVyIGlzIGFsc28gYSBmdW5jdGlvbiwgYW5kIGl0IHRha2VzIGEgc3RyZWFtIG9mIHJlcXVlc3RzIGFzIGlucHV0LCBhbmRcbiAqIHJldHVybnMgYSAqKmByZXNwb25zZUNvbGxlY3Rpb25gKiogd2l0aCBmdW5jdGlvbnMgdGhhdCBhbGxvdyByZWFkaW5nIGZyb20gdGhlXG4gKiBzdG9yYWdlIG9iamVjdHMuIFRoZSBmdW5jdGlvbnMgb24gdGhlICoqYHJlc3BvbnNlQ29sbGVjdGlvbmAqKiByZXR1cm4gc3RyZWFtc1xuICogb2YgdGhlIHN0b3JhZ2UgZGF0YSB0aGF0IHdhcyByZXF1ZXN0ZWQuXG4gKlxuICogKipSZXF1ZXN0cyoqLiBUaGUgc3RyZWFtIG9mIHJlcXVlc3RzIHNob3VsZCBlbWl0IG9iamVjdHMuIFRoZXNlIHNob3VsZCBiZVxuICogaW5zdHJ1Y3Rpb25zIHRvIHdyaXRlIHRvIHRoZSBkZXNpcmVkIFN0b3JhZ2Ugb2JqZWN0LiBIZXJlIGFyZSB0aGUgYHJlcXVlc3RgXG4gKiBvYmplY3QgcHJvcGVydGllczpcbiAqXG4gKiAtIGB0YXJnZXRgICooU3RyaW5nKSo6IHR5cGUgb2Ygc3RvcmFnZSwgY2FuIGJlIGBsb2NhbGAgb3IgYHNlc3Npb25gLCBkZWZhdWx0c1xuICogdG8gYGxvY2FsYC5cbiAqIC0gYGFjdGlvbmAgKihTdHJpbmcpKjogdHlwZSBvZiBhY3Rpb24sIGNhbiBiZSBgc2V0SXRlbWAsIGByZW1vdmVJdGVtYCBvclxuICogYGNsZWFyYCwgZGVmYXVsdHMgdG8gYHNldEl0ZW1gLlxuICogLSBga2V5YCAqKFN0cmluZykqOiBzdG9yYWdlIGtleS5cbiAqIC0gYHZhbHVlYCAqKFN0cmluZykqOiBzdG9yYWdlIHZhbHVlLlxuICpcbiAqICoqcmVzcG9uc2VDb2xsZWN0aW9uKiouIFRoZSAqKmByZXNwb25zZUNvbGxlY3Rpb25gKiogaXMgYW4gT2JqZWN0IHRoYXRcbiAqIGV4cG9zZXMgZnVuY3Rpb25zIHRvIHJlYWQgZnJvbSBsb2NhbC0gYW5kIHNlc3Npb25TdG9yYWdlLlxuICpcbiAqIGBgYGpzXG4gKiAvLyBSZXR1cm5zIGtleSBvZiBudGggbG9jYWxTdG9yYWdlIHZhbHVlLlxuICogcmVzcG9uc2VDb2xsZWN0aW9uLmxvY2FsLmdldEtleShuKVxuICogLy8gUmV0dXJucyBsb2NhbFN0b3JhZ2UgdmFsdWUgb2YgYGtleWAuXG4gKiByZXNwb25zZUNvbGxlY3Rpb24ubG9jYWwuZ2V0SXRlbShrZXkpXG4gKiAvLyBSZXR1cm5zIGtleSBvZiBudGggc2Vzc2lvblN0b3JhZ2UgdmFsdWUuXG4gKiByZXNwb25zZUNvbGxlY3Rpb24uc2Vzc2lvbi5nZXRLZXkobilcbiAqIC8vIFJldHVybnMgc2Vzc2lvblN0b3JhZ2UgdmFsdWUgb2YgYGtleWAuXG4gKiByZXNwb25zZUNvbGxlY3Rpb24uc2Vzc2lvbi5nZXRJdGVtKGtleSlcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSByZXF1ZXN0JCAtIGEgc3RyZWFtIG9mIHdyaXRlIHJlcXVlc3Qgb2JqZWN0cy5cbiAqIEByZXR1cm4ge09iamVjdH0gdGhlIHJlc3BvbnNlIGNvbGxlY3Rpb24gY29udGFpbmluZyBmdW5jdGlvbnNcbiAqIGZvciByZWFkaW5nIGZyb20gc3RvcmFnZS5cbiAqIEBmdW5jdGlvbiBzdG9yYWdlRHJpdmVyXG4gKi9cbmZ1bmN0aW9uIHN0b3JhZ2VEcml2ZXIocmVxdWVzdCQpIHtcbiAgLy8gRXhlY3V0ZSB3cml0aW5nIGFjdGlvbnMuXG4gIHJlcXVlc3QkLmFkZExpc3RlbmVyKHtcbiAgICBuZXh0OiBmdW5jdGlvbiBuZXh0KHJlcXVlc3QpIHtcbiAgICAgIHJldHVybiAoMCwgX3dyaXRlVG9TdG9yZTIuZGVmYXVsdCkocmVxdWVzdCk7XG4gICAgfSxcbiAgICBlcnJvcjogZnVuY3Rpb24gZXJyb3IoKSB7fSxcbiAgICBjb21wbGV0ZTogZnVuY3Rpb24gY29tcGxldGUoKSB7fVxuICB9KTtcblxuICAvLyBSZXR1cm4gcmVhZGluZyBmdW5jdGlvbnMuXG4gIHJldHVybiAoMCwgX3Jlc3BvbnNlQ29sbGVjdGlvbjIuZGVmYXVsdCkocmVxdWVzdCQpO1xufVxuXG5leHBvcnRzLmRlZmF1bHQgPSBzdG9yYWdlRHJpdmVyOyIsIid1c2Ugc3RyaWN0JztcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcblxuZXhwb3J0cy5kZWZhdWx0ID0gZnVuY3Rpb24gKHJlcXVlc3QkKSB7XG4gIHJldHVybiB7XG4gICAgLy8gRm9yIGxvY2FsU3RvcmFnZS5cbiAgICBnZXQgbG9jYWwoKSB7XG4gICAgICByZXR1cm4gKDAsIF91dGlsMi5kZWZhdWx0KShyZXF1ZXN0JCk7XG4gICAgfSxcbiAgICAvLyBGb3Igc2Vzc2lvblN0b3JhZ2UuXG4gICAgZ2V0IHNlc3Npb24oKSB7XG4gICAgICByZXR1cm4gKDAsIF91dGlsMi5kZWZhdWx0KShyZXF1ZXN0JCwgJ3Nlc3Npb24nKTtcbiAgICB9XG4gIH07XG59O1xuXG52YXIgX3V0aWwgPSByZXF1aXJlKCcuL3V0aWwnKTtcblxudmFyIF91dGlsMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX3V0aWwpO1xuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KG9iaikgeyByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyBkZWZhdWx0OiBvYmogfTsgfSIsIid1c2Ugc3RyaWN0JztcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuZGVmYXVsdCA9IGdldFJlc3BvbnNlT2JqO1xuXG52YXIgX2Ryb3BSZXBlYXRzID0gcmVxdWlyZSgneHN0cmVhbS9leHRyYS9kcm9wUmVwZWF0cycpO1xuXG52YXIgX2Ryb3BSZXBlYXRzMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX2Ryb3BSZXBlYXRzKTtcblxudmFyIF9hZGFwdCA9IHJlcXVpcmUoJ0BjeWNsZS9ydW4vbGliL2FkYXB0Jyk7XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZURlZmF1bHQob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7IGRlZmF1bHQ6IG9iaiB9OyB9XG5cbmZ1bmN0aW9uIGdldFN0b3JhZ2UkKHJlcXVlc3QkLCB0eXBlKSB7XG4gIGlmICh0eXBlID09PSAnbG9jYWwnKSB7XG4gICAgcmV0dXJuIHJlcXVlc3QkLmZpbHRlcihmdW5jdGlvbiAocmVxKSB7XG4gICAgICByZXR1cm4gIXJlcS50YXJnZXQgfHwgcmVxLnRhcmdldCA9PT0gJ2xvY2FsJztcbiAgICB9KTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gcmVxdWVzdCQuZmlsdGVyKGZ1bmN0aW9uIChyZXEpIHtcbiAgICAgIHJldHVybiByZXEudGFyZ2V0ID09PSAnc2Vzc2lvbic7XG4gICAgfSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gc3RvcmFnZUtleShuLCByZXF1ZXN0JCkge1xuICB2YXIgdHlwZSA9IGFyZ3VtZW50cy5sZW5ndGggPiAyICYmIGFyZ3VtZW50c1syXSAhPT0gdW5kZWZpbmVkID8gYXJndW1lbnRzWzJdIDogJ2xvY2FsJztcblxuICB2YXIgc3RvcmFnZSQgPSBnZXRTdG9yYWdlJChyZXF1ZXN0JCwgdHlwZSk7XG4gIHZhciBrZXkgPSB0eXBlID09PSAnbG9jYWwnID8gbG9jYWxTdG9yYWdlLmtleShuKSA6IHNlc3Npb25TdG9yYWdlLmtleShuKTtcblxuICByZXR1cm4gc3RvcmFnZSQuZmlsdGVyKGZ1bmN0aW9uIChyZXEpIHtcbiAgICByZXR1cm4gcmVxLmtleSA9PT0ga2V5O1xuICB9KS5tYXAoZnVuY3Rpb24gKHJlcSkge1xuICAgIHJldHVybiByZXEua2V5O1xuICB9KS5zdGFydFdpdGgoa2V5KS5jb21wb3NlKCgwLCBfZHJvcFJlcGVhdHMyLmRlZmF1bHQpKCkpO1xufVxuXG5mdW5jdGlvbiBzdG9yYWdlR2V0SXRlbShrZXksIHJlcXVlc3QkKSB7XG4gIHZhciB0eXBlID0gYXJndW1lbnRzLmxlbmd0aCA+IDIgJiYgYXJndW1lbnRzWzJdICE9PSB1bmRlZmluZWQgPyBhcmd1bWVudHNbMl0gOiAnbG9jYWwnO1xuXG4gIHZhciBzdG9yYWdlJCA9IGdldFN0b3JhZ2UkKHJlcXVlc3QkLCB0eXBlKTtcbiAgdmFyIHN0b3JhZ2VPYmogPSB0eXBlID09PSAnbG9jYWwnID8gbG9jYWxTdG9yYWdlIDogc2Vzc2lvblN0b3JhZ2U7XG5cbiAgcmV0dXJuIHN0b3JhZ2UkLmZpbHRlcihmdW5jdGlvbiAocmVxKSB7XG4gICAgcmV0dXJuIHJlcS5rZXkgPT09IGtleTtcbiAgfSkubWFwKGZ1bmN0aW9uIChyZXEpIHtcbiAgICByZXR1cm4gcmVxLnZhbHVlO1xuICB9KS5zdGFydFdpdGgoc3RvcmFnZU9iai5nZXRJdGVtKGtleSkpO1xufVxuXG5mdW5jdGlvbiBnZXRSZXNwb25zZU9iaihyZXF1ZXN0JCkge1xuICB2YXIgdHlwZSA9IGFyZ3VtZW50cy5sZW5ndGggPiAxICYmIGFyZ3VtZW50c1sxXSAhPT0gdW5kZWZpbmVkID8gYXJndW1lbnRzWzFdIDogJ2xvY2FsJztcblxuICByZXR1cm4ge1xuICAgIC8vIEZ1bmN0aW9uIHJldHVybmluZyBzdHJlYW0gb2YgdGhlIG50aCBrZXkuXG4gICAga2V5OiBmdW5jdGlvbiBrZXkobikge1xuICAgICAgcmV0dXJuICgwLCBfYWRhcHQuYWRhcHQpKHN0b3JhZ2VLZXkobiwgcmVxdWVzdCQsIHR5cGUpKTtcbiAgICB9LFxuXG4gICAgLy8gRnVuY3Rpb24gcmV0dXJuaW5nIHN0cmVhbSBvZiBpdGVtIHZhbHVlcy5cbiAgICBnZXRJdGVtOiBmdW5jdGlvbiBnZXRJdGVtKGtleSkge1xuICAgICAgcmV0dXJuICgwLCBfYWRhcHQuYWRhcHQpKHN0b3JhZ2VHZXRJdGVtKGtleSwgcmVxdWVzdCQsIHR5cGUpKTtcbiAgICB9XG4gIH07XG59IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG4vKipcbiAqIEBmdW5jdGlvbiB3cml0ZVRvU3RvcmVcbiAqIEBkZXNjcmlwdGlvblxuICogQSB1bml2ZXJzYWwgd3JpdGUgZnVuY3Rpb24gZm9yIGxvY2FsU3RvcmFnZSBhbmQgc2Vzc2lvblN0b3JhZ2UuXG4gKiBAcGFyYW0ge29iamVjdH0gcmVxdWVzdCAtIHRoZSBzdG9yYWdlIHJlcXVlc3Qgb2JqZWN0XG4gKiBAcGFyYW0ge3N0cmluZ30gcmVxdWVzdC50YXJnZXQgLSBhIHN0cmluZyBkZXRlcm1pbmVzIHdoaWNoIHN0b3JhZ2UgdG8gdXNlXG4gKiBAcGFyYW0ge3N0cmluZ30gcmVxdWVzdC5hY3Rpb24gLSBhIHN0cmluZyBkZXRlcm1pbmVzIHRoZSB3cml0ZSBhY3Rpb25cbiAqIEBwYXJhbSB7c3RyaW5nfSByZXF1ZXN0LmtleSAtIHRoZSBrZXkgb2YgYSBzdG9yYWdlIGl0ZW1cbiAqIEBwYXJhbSB7c3RyaW5nfSByZXF1ZXN0LnZhbHVlIC0gdGhlIHZhbHVlIG9mIGEgc3RvcmFnZSBpdGVtXG4gKi9cbmZ1bmN0aW9uIHdyaXRlVG9TdG9yZShfcmVmKSB7XG4gIHZhciBfcmVmJHRhcmdldCA9IF9yZWYudGFyZ2V0LFxuICAgICAgdGFyZ2V0ID0gX3JlZiR0YXJnZXQgPT09IHVuZGVmaW5lZCA/IFwibG9jYWxcIiA6IF9yZWYkdGFyZ2V0LFxuICAgICAgX3JlZiRhY3Rpb24gPSBfcmVmLmFjdGlvbixcbiAgICAgIGFjdGlvbiA9IF9yZWYkYWN0aW9uID09PSB1bmRlZmluZWQgPyBcInNldEl0ZW1cIiA6IF9yZWYkYWN0aW9uLFxuICAgICAga2V5ID0gX3JlZi5rZXksXG4gICAgICB2YWx1ZSA9IF9yZWYudmFsdWU7XG5cbiAgLy8gRGV0ZXJtaW5lIHRoZSBzdG9yYWdlIHRhcmdldC5cbiAgdmFyIHN0b3JhZ2UgPSB0YXJnZXQgPT09IFwibG9jYWxcIiA/IGxvY2FsU3RvcmFnZSA6IHNlc3Npb25TdG9yYWdlO1xuXG4gIC8vIEV4ZWN1dGUgdGhlIHN0b3JhZ2UgYWN0aW9uIGFuZCBwYXNzIGFyZ3VtZW50cyBpZiB0aGV5IHdlcmUgZGVmaW5lZC5cbiAgc3RvcmFnZVthY3Rpb25dKGtleSwgdmFsdWUpO1xufVxuXG5leHBvcnRzLmRlZmF1bHQgPSB3cml0ZVRvU3RvcmU7IiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgX19hc3NpZ24gPSAodGhpcyAmJiB0aGlzLl9fYXNzaWduKSB8fCBPYmplY3QuYXNzaWduIHx8IGZ1bmN0aW9uKHQpIHtcbiAgICBmb3IgKHZhciBzLCBpID0gMSwgbiA9IGFyZ3VtZW50cy5sZW5ndGg7IGkgPCBuOyBpKyspIHtcbiAgICAgICAgcyA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgZm9yICh2YXIgcCBpbiBzKSBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHMsIHApKVxuICAgICAgICAgICAgdFtwXSA9IHNbcF07XG4gICAgfVxuICAgIHJldHVybiB0O1xufTtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcbnZhciB4c3RyZWFtXzEgPSByZXF1aXJlKFwieHN0cmVhbVwiKTtcbnZhciBkcm9wUmVwZWF0c18xID0gcmVxdWlyZShcInhzdHJlYW0vZXh0cmEvZHJvcFJlcGVhdHNcIik7XG52YXIgaXNvbGF0ZV8xID0gcmVxdWlyZShcIkBjeWNsZS9pc29sYXRlXCIpO1xudmFyIGFkYXB0XzEgPSByZXF1aXJlKFwiQGN5Y2xlL3J1bi9saWIvYWRhcHRcIik7XG52YXIgcGlja0NvbWJpbmVfMSA9IHJlcXVpcmUoXCIuL3BpY2tDb21iaW5lXCIpO1xuZXhwb3J0cy5waWNrQ29tYmluZSA9IHBpY2tDb21iaW5lXzEucGlja0NvbWJpbmU7XG52YXIgcGlja01lcmdlXzEgPSByZXF1aXJlKFwiLi9waWNrTWVyZ2VcIik7XG5leHBvcnRzLnBpY2tNZXJnZSA9IHBpY2tNZXJnZV8xLnBpY2tNZXJnZTtcbmZ1bmN0aW9uIG9uaW9uaWZ5Q2hpbGQoY2hpbGRDb21wKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIGNoaWxkT25pb25pZmllZChzb3VyY2VzKSB7XG4gICAgICAgIHZhciByZWR1Y2VyTWltaWMkID0geHN0cmVhbV8xLmRlZmF1bHQuY3JlYXRlKCk7XG4gICAgICAgIHZhciBzdGF0ZSQgPSBzb3VyY2VzLm9uaW9uLnN0YXRlJFxuICAgICAgICAgICAgLm1hcChmdW5jdGlvbiAoc3RhdGVGcm9tUGFyZW50KSB7XG4gICAgICAgICAgICByZXR1cm4gcmVkdWNlck1pbWljJC5mb2xkKGZ1bmN0aW9uIChzdGF0ZSwgcmVkdWNlcikgeyByZXR1cm4gcmVkdWNlcihzdGF0ZSk7IH0sIHN0YXRlRnJvbVBhcmVudCk7XG4gICAgICAgIH0pLmZsYXR0ZW4oKS5yZW1lbWJlcigpO1xuICAgICAgICBzb3VyY2VzLm9uaW9uID0gbmV3IFN0YXRlU291cmNlKHN0YXRlJCwgJ29uaW9uJyk7XG4gICAgICAgIHZhciBzaW5rcyA9IGNoaWxkQ29tcChzb3VyY2VzKTtcbiAgICAgICAgaWYgKHNpbmtzLm9uaW9uKSB7XG4gICAgICAgICAgICB2YXIgc3RyZWFtJCA9IHhzdHJlYW1fMS5kZWZhdWx0LmZyb21PYnNlcnZhYmxlKHNpbmtzLm9uaW9uKTtcbiAgICAgICAgICAgIHJlZHVjZXJNaW1pYyQuaW1pdGF0ZShzdHJlYW0kKTtcbiAgICAgICAgICAgIHZhciByZWR1Y2VyVG9QYXJlbnQkID0gc3RhdGUkLm1hcChmdW5jdGlvbiAoc3RhdGUpIHsgcmV0dXJuIGZ1bmN0aW9uICgpIHsgcmV0dXJuIHN0YXRlOyB9OyB9KTtcbiAgICAgICAgICAgIHJldHVybiBfX2Fzc2lnbih7fSwgc2lua3MsIHsgb25pb246IHJlZHVjZXJUb1BhcmVudCQgfSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gc2lua3M7XG4gICAgICAgIH1cbiAgICB9O1xufVxuZnVuY3Rpb24gZGVmYXVsdEdldEtleShzdGF0ZVBpZWNlKSB7XG4gICAgcmV0dXJuIHN0YXRlUGllY2Uua2V5O1xufVxuZnVuY3Rpb24gaW5zdGFuY2VMZW5zKGtleSkge1xuICAgIHJldHVybiB7XG4gICAgICAgIGdldDogZnVuY3Rpb24gKGFycikge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBhcnIgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHZvaWQgMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBuID0gYXJyLmxlbmd0aDsgaSA8IG47ICsraSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoYXJyW2ldLmtleSA9PT0ga2V5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXJyW2ldO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiB2b2lkIDA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHNldDogZnVuY3Rpb24gKGFyciwgaXRlbSkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBhcnIgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFtpdGVtXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKHR5cGVvZiBpdGVtID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIHJldHVybiBhcnIuZmlsdGVyKGZ1bmN0aW9uIChzKSB7IHJldHVybiBzLmtleSAhPT0ga2V5OyB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiBhcnIubWFwKGZ1bmN0aW9uIChzKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzLmtleSA9PT0ga2V5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gaXRlbTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBzO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgfTtcbn1cbmZ1bmN0aW9uIGNvbGxlY3Rpb24oaXRlbUNvbXAsIHNvdXJjZXMsIGdldEtleSkge1xuICAgIGlmIChnZXRLZXkgPT09IHZvaWQgMCkgeyBnZXRLZXkgPSBkZWZhdWx0R2V0S2V5OyB9XG4gICAgdmFyIGFycmF5JCA9IHNvdXJjZXMub25pb24uc3RhdGUkO1xuICAgIHZhciBjb2xsZWN0aW9uJCA9IGFycmF5JC5mb2xkKGZ1bmN0aW9uIChhY2MsIG5leHRTdGF0ZUFycmF5KSB7XG4gICAgICAgIHZhciBkaWN0ID0gYWNjLmRpY3Q7XG4gICAgICAgIHZhciBuZXh0SW5zdEFycmF5ID0gQXJyYXkobmV4dFN0YXRlQXJyYXkubGVuZ3RoKTtcbiAgICAgICAgdmFyIG5leHRLZXlzID0gbmV3IFNldCgpO1xuICAgICAgICAvLyBhZGRcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIG4gPSBuZXh0U3RhdGVBcnJheS5sZW5ndGg7IGkgPCBuOyArK2kpIHtcbiAgICAgICAgICAgIHZhciBrZXkgPSBnZXRLZXkobmV4dFN0YXRlQXJyYXlbaV0pO1xuICAgICAgICAgICAgbmV4dEtleXMuYWRkKGtleSk7XG4gICAgICAgICAgICBpZiAoZGljdC5oYXMoa2V5KSkge1xuICAgICAgICAgICAgICAgIG5leHRJbnN0QXJyYXlbaV0gPSBkaWN0LmdldChrZXkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdmFyIHNjb3BlcyA9IHsgJyonOiAnJCcgKyBrZXksIG9uaW9uOiBpbnN0YW5jZUxlbnMoa2V5KSB9O1xuICAgICAgICAgICAgICAgIHZhciBzaW5rcyA9IGlzb2xhdGVfMS5kZWZhdWx0KG9uaW9uaWZ5Q2hpbGQoaXRlbUNvbXApLCBzY29wZXMpKHNvdXJjZXMpO1xuICAgICAgICAgICAgICAgIGRpY3Quc2V0KGtleSwgc2lua3MpO1xuICAgICAgICAgICAgICAgIG5leHRJbnN0QXJyYXlbaV0gPSBzaW5rcztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG5leHRJbnN0QXJyYXlbaV0uX2tleSA9IGtleTtcbiAgICAgICAgfVxuICAgICAgICAvLyByZW1vdmVcbiAgICAgICAgZGljdC5mb3JFYWNoKGZ1bmN0aW9uIChfLCBrZXkpIHtcbiAgICAgICAgICAgIGlmICghbmV4dEtleXMuaGFzKGtleSkpIHtcbiAgICAgICAgICAgICAgICBkaWN0LmRlbGV0ZShrZXkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgbmV4dEtleXMuY2xlYXIoKTtcbiAgICAgICAgcmV0dXJuIHsgZGljdDogZGljdCwgYXJyOiBuZXh0SW5zdEFycmF5IH07XG4gICAgfSwgeyBkaWN0OiBuZXcgTWFwKCksIGFycjogW10gfSk7XG4gICAgcmV0dXJuIGNvbGxlY3Rpb24kO1xufVxuZXhwb3J0cy5jb2xsZWN0aW9uID0gY29sbGVjdGlvbjtcbmZ1bmN0aW9uIG1ha2VHZXR0ZXIoc2NvcGUpIHtcbiAgICBpZiAodHlwZW9mIHNjb3BlID09PSAnc3RyaW5nJyB8fCB0eXBlb2Ygc2NvcGUgPT09ICdudW1iZXInKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiBsZW5zR2V0KHN0YXRlKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHN0YXRlID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIHJldHVybiB2b2lkIDA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gc3RhdGVbc2NvcGVdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHNjb3BlLmdldDtcbiAgICB9XG59XG5mdW5jdGlvbiBtYWtlU2V0dGVyKHNjb3BlKSB7XG4gICAgaWYgKHR5cGVvZiBzY29wZSA9PT0gJ3N0cmluZycgfHwgdHlwZW9mIHNjb3BlID09PSAnbnVtYmVyJykge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gbGVuc1NldChzdGF0ZSwgY2hpbGRTdGF0ZSkge1xuICAgICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkoc3RhdGUpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHVwZGF0ZUFycmF5RW50cnkoc3RhdGUsIHNjb3BlLCBjaGlsZFN0YXRlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKHR5cGVvZiBzdGF0ZSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gX2EgPSB7fSwgX2Fbc2NvcGVdID0gY2hpbGRTdGF0ZSwgX2E7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gX19hc3NpZ24oe30sIHN0YXRlLCAoX2IgPSB7fSwgX2Jbc2NvcGVdID0gY2hpbGRTdGF0ZSwgX2IpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBfYSwgX2I7XG4gICAgICAgIH07XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICByZXR1cm4gc2NvcGUuc2V0O1xuICAgIH1cbn1cbmZ1bmN0aW9uIHVwZGF0ZUFycmF5RW50cnkoYXJyYXksIHNjb3BlLCBuZXdWYWwpIHtcbiAgICBpZiAobmV3VmFsID09PSBhcnJheVtzY29wZV0pIHtcbiAgICAgICAgcmV0dXJuIGFycmF5O1xuICAgIH1cbiAgICB2YXIgaW5kZXggPSBwYXJzZUludChzY29wZSk7XG4gICAgaWYgKHR5cGVvZiBuZXdWYWwgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIHJldHVybiBhcnJheS5maWx0ZXIoZnVuY3Rpb24gKHZhbCwgaSkgeyByZXR1cm4gaSAhPT0gaW5kZXg7IH0pO1xuICAgIH1cbiAgICByZXR1cm4gYXJyYXkubWFwKGZ1bmN0aW9uICh2YWwsIGkpIHsgcmV0dXJuIGkgPT09IGluZGV4ID8gbmV3VmFsIDogdmFsOyB9KTtcbn1cbmZ1bmN0aW9uIGlzb2xhdGVTb3VyY2Uoc291cmNlLCBzY29wZSkge1xuICAgIHJldHVybiBzb3VyY2Uuc2VsZWN0KHNjb3BlKTtcbn1cbmV4cG9ydHMuaXNvbGF0ZVNvdXJjZSA9IGlzb2xhdGVTb3VyY2U7XG5mdW5jdGlvbiBpc29sYXRlU2luayhpbm5lclJlZHVjZXIkLCBzY29wZSkge1xuICAgIHZhciBnZXQgPSBtYWtlR2V0dGVyKHNjb3BlKTtcbiAgICB2YXIgc2V0ID0gbWFrZVNldHRlcihzY29wZSk7XG4gICAgcmV0dXJuIGlubmVyUmVkdWNlciRcbiAgICAgICAgLm1hcChmdW5jdGlvbiAoaW5uZXJSZWR1Y2VyKSB7IHJldHVybiBmdW5jdGlvbiBvdXRlclJlZHVjZXIob3V0ZXIpIHtcbiAgICAgICAgdmFyIHByZXZJbm5lciA9IGdldChvdXRlcik7XG4gICAgICAgIHZhciBuZXh0SW5uZXIgPSBpbm5lclJlZHVjZXIocHJldklubmVyKTtcbiAgICAgICAgaWYgKHByZXZJbm5lciA9PT0gbmV4dElubmVyKSB7XG4gICAgICAgICAgICByZXR1cm4gb3V0ZXI7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gc2V0KG91dGVyLCBuZXh0SW5uZXIpO1xuICAgICAgICB9XG4gICAgfTsgfSk7XG59XG5leHBvcnRzLmlzb2xhdGVTaW5rID0gaXNvbGF0ZVNpbms7XG52YXIgU3RhdGVTb3VyY2UgPSAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIFN0YXRlU291cmNlKHN0cmVhbSwgbmFtZSkge1xuICAgICAgICB0aGlzLmlzb2xhdGVTb3VyY2UgPSBpc29sYXRlU291cmNlO1xuICAgICAgICB0aGlzLmlzb2xhdGVTaW5rID0gaXNvbGF0ZVNpbms7XG4gICAgICAgIHRoaXMuX25hbWUgPSBuYW1lO1xuICAgICAgICB0aGlzLl9zdGF0ZSQgPSBzdHJlYW1cbiAgICAgICAgICAgIC5maWx0ZXIoZnVuY3Rpb24gKHMpIHsgcmV0dXJuIHR5cGVvZiBzICE9PSAndW5kZWZpbmVkJzsgfSlcbiAgICAgICAgICAgIC5jb21wb3NlKGRyb3BSZXBlYXRzXzEuZGVmYXVsdCgpKVxuICAgICAgICAgICAgLnJlbWVtYmVyKCk7XG4gICAgICAgIHRoaXMuc3RhdGUkID0gYWRhcHRfMS5hZGFwdCh0aGlzLl9zdGF0ZSQpO1xuICAgICAgICBpZiAoIW5hbWUpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9zdGF0ZSQuX2lzQ3ljbGVTb3VyY2UgPSBuYW1lO1xuICAgIH1cbiAgICBTdGF0ZVNvdXJjZS5wcm90b3R5cGUuc2VsZWN0ID0gZnVuY3Rpb24gKHNjb3BlKSB7XG4gICAgICAgIHZhciBnZXQgPSBtYWtlR2V0dGVyKHNjb3BlKTtcbiAgICAgICAgcmV0dXJuIG5ldyBTdGF0ZVNvdXJjZSh0aGlzLl9zdGF0ZSQubWFwKGdldCksIG51bGwpO1xuICAgIH07XG4gICAgcmV0dXJuIFN0YXRlU291cmNlO1xufSgpKTtcbmV4cG9ydHMuU3RhdGVTb3VyY2UgPSBTdGF0ZVNvdXJjZTtcbmZ1bmN0aW9uIG9uaW9uaWZ5KG1haW4sIG5hbWUpIHtcbiAgICBpZiAobmFtZSA9PT0gdm9pZCAwKSB7IG5hbWUgPSAnb25pb24nOyB9XG4gICAgcmV0dXJuIGZ1bmN0aW9uIG1haW5PbmlvbmlmaWVkKHNvdXJjZXMpIHtcbiAgICAgICAgdmFyIHJlZHVjZXJNaW1pYyQgPSB4c3RyZWFtXzEuZGVmYXVsdC5jcmVhdGUoKTtcbiAgICAgICAgdmFyIHN0YXRlJCA9IHJlZHVjZXJNaW1pYyRcbiAgICAgICAgICAgIC5mb2xkKGZ1bmN0aW9uIChzdGF0ZSwgcmVkdWNlcikgeyByZXR1cm4gcmVkdWNlcihzdGF0ZSk7IH0sIHZvaWQgMClcbiAgICAgICAgICAgIC5kcm9wKDEpO1xuICAgICAgICBzb3VyY2VzW25hbWVdID0gbmV3IFN0YXRlU291cmNlKHN0YXRlJCwgbmFtZSk7XG4gICAgICAgIHZhciBzaW5rcyA9IG1haW4oc291cmNlcyk7XG4gICAgICAgIGlmIChzaW5rc1tuYW1lXSkge1xuICAgICAgICAgICAgdmFyIHN0cmVhbSQgPSB4c3RyZWFtXzEuZGVmYXVsdC5mcm9tT2JzZXJ2YWJsZShzaW5rc1tuYW1lXSk7XG4gICAgICAgICAgICByZWR1Y2VyTWltaWMkLmltaXRhdGUoc3RyZWFtJCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHNpbmtzO1xuICAgIH07XG59XG5leHBvcnRzLmRlZmF1bHQgPSBvbmlvbmlmeTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWluZGV4LmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xudmFyIHhzdHJlYW1fMSA9IHJlcXVpcmUoXCJ4c3RyZWFtXCIpO1xudmFyIFBpY2tDb21iaW5lTGlzdGVuZXIgPSAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIFBpY2tDb21iaW5lTGlzdGVuZXIoa2V5LCBvdXQsIHAsIGlucykge1xuICAgICAgICB0aGlzLmtleSA9IGtleTtcbiAgICAgICAgdGhpcy5vdXQgPSBvdXQ7XG4gICAgICAgIHRoaXMucCA9IHA7XG4gICAgICAgIHRoaXMudmFsID0geHN0cmVhbV8xLk5PO1xuICAgICAgICB0aGlzLmlucyA9IGlucztcbiAgICAgICAgdGhpcy5jID0gZmFsc2U7XG4gICAgfVxuICAgIFBpY2tDb21iaW5lTGlzdGVuZXIucHJvdG90eXBlLl9uID0gZnVuY3Rpb24gKHQpIHtcbiAgICAgICAgdmFyIHAgPSB0aGlzLnAsIG91dCA9IHRoaXMub3V0O1xuICAgICAgICB0aGlzLnZhbCA9IHQ7XG4gICAgICAgIGlmIChvdXQgPT09IG51bGwpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnAudXAoKTtcbiAgICB9O1xuICAgIFBpY2tDb21iaW5lTGlzdGVuZXIucHJvdG90eXBlLl9lID0gZnVuY3Rpb24gKGVycikge1xuICAgICAgICB2YXIgb3V0ID0gdGhpcy5vdXQ7XG4gICAgICAgIGlmIChvdXQgPT09IG51bGwpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBvdXQuX2UoZXJyKTtcbiAgICB9O1xuICAgIFBpY2tDb21iaW5lTGlzdGVuZXIucHJvdG90eXBlLl9jID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgcCA9IHRoaXMucCwgb3V0ID0gdGhpcy5vdXQ7XG4gICAgICAgIHRoaXMuYyA9IHRydWU7XG4gICAgICAgIGlmIChvdXQgPT09IG51bGwpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB2YXIgbiA9IHAuaW5zdC5hcnIubGVuZ3RoO1xuICAgICAgICB2YXIgaWxzID0gcC5pbHM7XG4gICAgICAgIHZhciBpbnN0QXJyID0gcC5pbnN0LmFycjtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBuOyArK2kpIHtcbiAgICAgICAgICAgIGlmIChpbHMuZ2V0KGluc3RBcnJbaV0uX2tleSkuYyA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgb3V0Ll9jKCk7XG4gICAgfTtcbiAgICByZXR1cm4gUGlja0NvbWJpbmVMaXN0ZW5lcjtcbn0oKSk7XG52YXIgUGlja0NvbWJpbmUgPSAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIFBpY2tDb21iaW5lKHNlbCwgaW5zKSB7XG4gICAgICAgIHRoaXMudHlwZSA9ICdjb21iaW5lJztcbiAgICAgICAgdGhpcy5pbnMgPSBpbnM7XG4gICAgICAgIHRoaXMuc2VsID0gc2VsO1xuICAgICAgICB0aGlzLm91dCA9IG51bGw7XG4gICAgICAgIHRoaXMuaWxzID0gbmV3IE1hcCgpO1xuICAgICAgICB0aGlzLmluc3QgPSBudWxsO1xuICAgIH1cbiAgICBQaWNrQ29tYmluZS5wcm90b3R5cGUuX3N0YXJ0ID0gZnVuY3Rpb24gKG91dCkge1xuICAgICAgICB0aGlzLm91dCA9IG91dDtcbiAgICAgICAgdGhpcy5pbnMuX2FkZCh0aGlzKTtcbiAgICB9O1xuICAgIFBpY2tDb21iaW5lLnByb3RvdHlwZS5fc3RvcCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGlscyA9IHRoaXMuaWxzO1xuICAgICAgICBpbHMuZm9yRWFjaChmdW5jdGlvbiAoaWwpIHtcbiAgICAgICAgICAgIGlsLmlucy5fcmVtb3ZlKGlsKTtcbiAgICAgICAgICAgIGlsLmlucyA9IG51bGw7XG4gICAgICAgICAgICBpbC5vdXQgPSBudWxsO1xuICAgICAgICAgICAgaWwudmFsID0gbnVsbDtcbiAgICAgICAgfSk7XG4gICAgICAgIGlscy5jbGVhcigpO1xuICAgICAgICB0aGlzLm91dCA9IG51bGw7XG4gICAgICAgIHRoaXMuaWxzID0gbmV3IE1hcCgpO1xuICAgICAgICB0aGlzLmluc3QgPSBudWxsO1xuICAgIH07XG4gICAgUGlja0NvbWJpbmUucHJvdG90eXBlLnVwID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgYXJyID0gdGhpcy5pbnN0LmFycjtcbiAgICAgICAgdmFyIG4gPSBhcnIubGVuZ3RoO1xuICAgICAgICB2YXIgb3V0QXJyID0gQXJyYXkobik7XG4gICAgICAgIHZhciBpbHMgPSB0aGlzLmlscztcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBuOyArK2kpIHtcbiAgICAgICAgICAgIHZhciBzaW5rcyA9IGFycltpXTtcbiAgICAgICAgICAgIHZhciBrZXkgPSBzaW5rcy5fa2V5O1xuICAgICAgICAgICAgaWYgKCFpbHMuaGFzKGtleSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgdmFsID0gaWxzLmdldChrZXkpLnZhbDtcbiAgICAgICAgICAgIGlmICh2YWwgPT09IHhzdHJlYW1fMS5OTykge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG91dEFycltpXSA9IHZhbDtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLm91dC5fbihvdXRBcnIpO1xuICAgIH07XG4gICAgUGlja0NvbWJpbmUucHJvdG90eXBlLl9uID0gZnVuY3Rpb24gKGluc3QpIHtcbiAgICAgICAgdGhpcy5pbnN0ID0gaW5zdDtcbiAgICAgICAgdmFyIGFyclNpbmtzID0gaW5zdC5hcnI7XG4gICAgICAgIHZhciBpbHMgPSB0aGlzLmlscztcbiAgICAgICAgdmFyIG91dCA9IHRoaXMub3V0O1xuICAgICAgICB2YXIgc2VsID0gdGhpcy5zZWw7XG4gICAgICAgIHZhciBkaWN0ID0gaW5zdC5kaWN0O1xuICAgICAgICB2YXIgbiA9IGFyclNpbmtzLmxlbmd0aDtcbiAgICAgICAgLy8gcmVtb3ZlXG4gICAgICAgIHZhciByZW1vdmVkID0gZmFsc2U7XG4gICAgICAgIGlscy5mb3JFYWNoKGZ1bmN0aW9uIChpbCwga2V5KSB7XG4gICAgICAgICAgICBpZiAoIWRpY3QuaGFzKGtleSkpIHtcbiAgICAgICAgICAgICAgICBpbC5pbnMuX3JlbW92ZShpbCk7XG4gICAgICAgICAgICAgICAgaWwuaW5zID0gbnVsbDtcbiAgICAgICAgICAgICAgICBpbC5vdXQgPSBudWxsO1xuICAgICAgICAgICAgICAgIGlsLnZhbCA9IG51bGw7XG4gICAgICAgICAgICAgICAgaWxzLmRlbGV0ZShrZXkpO1xuICAgICAgICAgICAgICAgIHJlbW92ZWQgPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKG4gPT09IDApIHtcbiAgICAgICAgICAgIG91dC5fbihbXSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgLy8gYWRkXG4gICAgICAgIHZhciBhZGRlZCA9IGZhbHNlO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG47ICsraSkge1xuICAgICAgICAgICAgdmFyIHNpbmtzID0gYXJyU2lua3NbaV07XG4gICAgICAgICAgICB2YXIga2V5ID0gc2lua3MuX2tleTtcbiAgICAgICAgICAgIHZhciBzaW5rID0gc2lua3Nbc2VsXTtcbiAgICAgICAgICAgIGlmICghaWxzLmhhcyhrZXkpKSB7XG4gICAgICAgICAgICAgICAgaWxzLnNldChrZXksIG5ldyBQaWNrQ29tYmluZUxpc3RlbmVyKGtleSwgb3V0LCB0aGlzLCBzaW5rKSk7XG4gICAgICAgICAgICAgICAgYWRkZWQgPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChhZGRlZCkge1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBuOyArK2kpIHtcbiAgICAgICAgICAgICAgICB2YXIgc2lua3MgPSBhcnJTaW5rc1tpXTtcbiAgICAgICAgICAgICAgICB2YXIga2V5ID0gc2lua3MuX2tleTtcbiAgICAgICAgICAgICAgICB2YXIgc2luayA9IHNpbmtzW3NlbF07XG4gICAgICAgICAgICAgICAgaWYgKHNpbmsuX2lscy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgc2luay5fYWRkKGlscy5nZXQoa2V5KSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChyZW1vdmVkKSB7XG4gICAgICAgICAgICB0aGlzLnVwKCk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIFBpY2tDb21iaW5lLnByb3RvdHlwZS5fZSA9IGZ1bmN0aW9uIChlKSB7XG4gICAgICAgIHZhciBvdXQgPSB0aGlzLm91dDtcbiAgICAgICAgaWYgKG91dCA9PT0gbnVsbCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIG91dC5fZShlKTtcbiAgICB9O1xuICAgIFBpY2tDb21iaW5lLnByb3RvdHlwZS5fYyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIG91dCA9IHRoaXMub3V0O1xuICAgICAgICBpZiAob3V0ID09PSBudWxsKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgb3V0Ll9jKCk7XG4gICAgfTtcbiAgICByZXR1cm4gUGlja0NvbWJpbmU7XG59KCkpO1xuZnVuY3Rpb24gcGlja0NvbWJpbmUoc2VsZWN0b3IpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gcGlja0NvbWJpbmVPcGVyYXRvcihpbnN0JCkge1xuICAgICAgICByZXR1cm4gbmV3IHhzdHJlYW1fMS5TdHJlYW0obmV3IFBpY2tDb21iaW5lKHNlbGVjdG9yLCBpbnN0JCkpO1xuICAgIH07XG59XG5leHBvcnRzLnBpY2tDb21iaW5lID0gcGlja0NvbWJpbmU7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1waWNrQ29tYmluZS5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcbnZhciB4c3RyZWFtXzEgPSByZXF1aXJlKFwieHN0cmVhbVwiKTtcbnZhciBQaWNrTWVyZ2VMaXN0ZW5lciA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gUGlja01lcmdlTGlzdGVuZXIob3V0LCBwLCBpbnMpIHtcbiAgICAgICAgdGhpcy5pbnMgPSBpbnM7XG4gICAgICAgIHRoaXMub3V0ID0gb3V0O1xuICAgICAgICB0aGlzLnAgPSBwO1xuICAgICAgICB0aGlzLmMgPSBmYWxzZTtcbiAgICB9XG4gICAgUGlja01lcmdlTGlzdGVuZXIucHJvdG90eXBlLl9uID0gZnVuY3Rpb24gKHQpIHtcbiAgICAgICAgdmFyIHAgPSB0aGlzLnAsIG91dCA9IHRoaXMub3V0O1xuICAgICAgICBpZiAob3V0ID09PSBudWxsKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgb3V0Ll9uKHQpO1xuICAgIH07XG4gICAgUGlja01lcmdlTGlzdGVuZXIucHJvdG90eXBlLl9lID0gZnVuY3Rpb24gKGVycikge1xuICAgICAgICB2YXIgb3V0ID0gdGhpcy5vdXQ7XG4gICAgICAgIGlmIChvdXQgPT09IG51bGwpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBvdXQuX2UoZXJyKTtcbiAgICB9O1xuICAgIFBpY2tNZXJnZUxpc3RlbmVyLnByb3RvdHlwZS5fYyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHAgPSB0aGlzLnAsIG91dCA9IHRoaXMub3V0O1xuICAgICAgICB0aGlzLmMgPSB0cnVlO1xuICAgICAgICBpZiAob3V0ID09PSBudWxsKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdmFyIG4gPSBwLmluc3QuYXJyLmxlbmd0aDtcbiAgICAgICAgdmFyIGlscyA9IHAuaWxzO1xuICAgICAgICB2YXIgaW5zdEFyciA9IHAuaW5zdC5hcnI7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbjsgKytpKSB7XG4gICAgICAgICAgICBpZiAoaWxzLmdldChpbnN0QXJyW2ldLl9rZXkpLmMgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIG91dC5fYygpO1xuICAgIH07XG4gICAgcmV0dXJuIFBpY2tNZXJnZUxpc3RlbmVyO1xufSgpKTtcbnZhciBQaWNrTWVyZ2UgPSAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIFBpY2tNZXJnZShzZWwsIGlucykge1xuICAgICAgICB0aGlzLnR5cGUgPSAncGlja01lcmdlJztcbiAgICAgICAgdGhpcy5pbnMgPSBpbnM7XG4gICAgICAgIHRoaXMub3V0ID0gbnVsbDtcbiAgICAgICAgdGhpcy5zZWwgPSBzZWw7XG4gICAgICAgIHRoaXMuaWxzID0gbmV3IE1hcCgpO1xuICAgICAgICB0aGlzLmluc3QgPSBudWxsO1xuICAgIH1cbiAgICBQaWNrTWVyZ2UucHJvdG90eXBlLl9zdGFydCA9IGZ1bmN0aW9uIChvdXQpIHtcbiAgICAgICAgdGhpcy5vdXQgPSBvdXQ7XG4gICAgICAgIHRoaXMuaW5zLl9hZGQodGhpcyk7XG4gICAgfTtcbiAgICBQaWNrTWVyZ2UucHJvdG90eXBlLl9zdG9wID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgaWxzID0gdGhpcy5pbHM7XG4gICAgICAgIGlscy5mb3JFYWNoKGZ1bmN0aW9uIChpbCwga2V5KSB7XG4gICAgICAgICAgICBpbC5pbnMuX3JlbW92ZShpbCk7XG4gICAgICAgICAgICBpbC5pbnMgPSBudWxsO1xuICAgICAgICAgICAgaWwub3V0ID0gbnVsbDtcbiAgICAgICAgICAgIGlscy5kZWxldGUoa2V5KTtcbiAgICAgICAgfSk7XG4gICAgICAgIGlscy5jbGVhcigpO1xuICAgICAgICB0aGlzLm91dCA9IG51bGw7XG4gICAgICAgIHRoaXMuaWxzID0gbmV3IE1hcCgpO1xuICAgICAgICB0aGlzLmluc3QgPSBudWxsO1xuICAgIH07XG4gICAgUGlja01lcmdlLnByb3RvdHlwZS5fbiA9IGZ1bmN0aW9uIChpbnN0KSB7XG4gICAgICAgIHRoaXMuaW5zdCA9IGluc3Q7XG4gICAgICAgIHZhciBhcnJTaW5rcyA9IGluc3QuYXJyO1xuICAgICAgICB2YXIgaWxzID0gdGhpcy5pbHM7XG4gICAgICAgIHZhciBvdXQgPSB0aGlzLm91dDtcbiAgICAgICAgdmFyIHNlbCA9IHRoaXMuc2VsO1xuICAgICAgICB2YXIgbiA9IGFyclNpbmtzLmxlbmd0aDtcbiAgICAgICAgLy8gYWRkXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbjsgKytpKSB7XG4gICAgICAgICAgICB2YXIgc2lua3MgPSBhcnJTaW5rc1tpXTtcbiAgICAgICAgICAgIHZhciBrZXkgPSBzaW5rcy5fa2V5O1xuICAgICAgICAgICAgdmFyIHNpbmsgPSBzaW5rc1tzZWxdO1xuICAgICAgICAgICAgaWYgKCFpbHMuaGFzKGtleSkpIHtcbiAgICAgICAgICAgICAgICBpbHMuc2V0KGtleSwgbmV3IFBpY2tNZXJnZUxpc3RlbmVyKG91dCwgdGhpcywgc2luaykpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbjsgKytpKSB7XG4gICAgICAgICAgICB2YXIgc2lua3MgPSBhcnJTaW5rc1tpXTtcbiAgICAgICAgICAgIHZhciBrZXkgPSBzaW5rcy5fa2V5O1xuICAgICAgICAgICAgdmFyIHNpbmsgPSBzaW5rc1tzZWxdO1xuICAgICAgICAgICAgaWYgKHNpbmsuX2lscy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICBzaW5rLl9hZGQoaWxzLmdldChrZXkpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyByZW1vdmVcbiAgICAgICAgaWxzLmZvckVhY2goZnVuY3Rpb24gKGlsLCBrZXkpIHtcbiAgICAgICAgICAgIGlmICghaW5zdC5kaWN0LmhhcyhrZXkpIHx8ICFpbnN0LmRpY3QuZ2V0KGtleSkpIHtcbiAgICAgICAgICAgICAgICBpbC5pbnMuX3JlbW92ZShpbCk7XG4gICAgICAgICAgICAgICAgaWwuaW5zID0gbnVsbDtcbiAgICAgICAgICAgICAgICBpbC5vdXQgPSBudWxsO1xuICAgICAgICAgICAgICAgIGlscy5kZWxldGUoa2V5KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfTtcbiAgICBQaWNrTWVyZ2UucHJvdG90eXBlLl9lID0gZnVuY3Rpb24gKGVycikge1xuICAgICAgICB2YXIgdSA9IHRoaXMub3V0O1xuICAgICAgICBpZiAodSA9PT0geHN0cmVhbV8xLk5PKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB1Ll9lKGVycik7XG4gICAgfTtcbiAgICBQaWNrTWVyZ2UucHJvdG90eXBlLl9jID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgdSA9IHRoaXMub3V0O1xuICAgICAgICBpZiAodSA9PT0geHN0cmVhbV8xLk5PKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB1Ll9jKCk7XG4gICAgfTtcbiAgICByZXR1cm4gUGlja01lcmdlO1xufSgpKTtcbmZ1bmN0aW9uIHBpY2tNZXJnZShzZWxlY3Rvcikge1xuICAgIHJldHVybiBmdW5jdGlvbiBwaWNrTWVyZ2VPcGVyYXRvcihpbnN0JCkge1xuICAgICAgICByZXR1cm4gbmV3IHhzdHJlYW1fMS5TdHJlYW0obmV3IFBpY2tNZXJnZShzZWxlY3RvciwgaW5zdCQpKTtcbiAgICB9O1xufVxuZXhwb3J0cy5waWNrTWVyZ2UgPSBwaWNrTWVyZ2U7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1waWNrTWVyZ2UuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgeHN0cmVhbV8xID0gcmVxdWlyZSgneHN0cmVhbScpO1xuZnVuY3Rpb24gc2VyaWFsaXplKHN0YXRlKSB7XG4gICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KHN0YXRlKTtcbn1cbmZ1bmN0aW9uIGRlc2VyaWFsaXplKHN0cikge1xuICAgIHJldHVybiBKU09OLnBhcnNlKHN0cikgfHwge307XG59XG5mdW5jdGlvbiBzdG9yYWdlaWZ5KENvbXBvbmVudCwgb3B0aW9ucykge1xuICAgIHZhciBfb3B0aW9ucyA9IE9iamVjdC5hc3NpZ24oXG4gICAgLy8gZGVmYXVsdHNcbiAgICB7XG4gICAgICAgIGtleTogJ3N0b3JhZ2VpZnknLFxuICAgICAgICBzZXJpYWxpemU6IHNlcmlhbGl6ZSxcbiAgICAgICAgZGVzZXJpYWxpemU6IGRlc2VyaWFsaXplLFxuICAgIH0sIG9wdGlvbnMpO1xuICAgIHJldHVybiBmdW5jdGlvbiAoc291cmNlcykge1xuICAgICAgICB2YXIgbG9jYWxTdG9yYWdlJCA9IHNvdXJjZXMuc3RvcmFnZS5sb2NhbC5nZXRJdGVtKF9vcHRpb25zLmtleSkudGFrZSgxKTtcbiAgICAgICAgdmFyIHN0b3JlZERhdGEkID0gbG9jYWxTdG9yYWdlJC5tYXAoX29wdGlvbnMuZGVzZXJpYWxpemUpO1xuICAgICAgICB2YXIgc3RhdGUkID0gc291cmNlcy5vbmlvbi5zdGF0ZSQ7XG4gICAgICAgIHZhciBjb21wb25lbnRTaW5rcyA9IENvbXBvbmVudChzb3VyY2VzKTtcbiAgICAgICAgLy8gY2hhbmdlIGluaXRpYWwgcmVkdWNlciAoZmlyc3QgcmVkdWNlcikgb2YgY29tcG9uZW50XG4gICAgICAgIC8vIHRvIG1lcmdlIGRlZmF1bHQgc3RhdGUgd2l0aCBzdG9yZWQgc3RhdGVcbiAgICAgICAgdmFyIGNoaWxkUmVkdWNlciQgPSBjb21wb25lbnRTaW5rcy5vbmlvbjtcbiAgICAgICAgdmFyIHBhcmVudFJlZHVjZXIkID0gc3RvcmVkRGF0YSQubWFwKGZ1bmN0aW9uIChzdG9yZWREYXRhKSB7XG4gICAgICAgICAgcmV0dXJuIGNoaWxkUmVkdWNlciQuc3RhcnRXaXRoKGZ1bmN0aW9uIGluaXRpYWxTdG9yYWdlUmVkdWNlcihwcmV2U3RhdGUpIHtcbiAgICAgICAgICAgIGlmIChwcmV2U3RhdGUpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIE9iamVjdC5hc3NpZ24oe30sIHByZXZTdGF0ZSwgc3RvcmVkRGF0YSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICByZXR1cm4gc3RvcmVkRGF0YTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KVxuICAgICAgICB9KS5mbGF0dGVuKClcbiAgICAgICAgdmFyIHN0b3JhZ2UkID0gc3RhdGUkLm1hcChfb3B0aW9ucy5zZXJpYWxpemUpXG4gICAgICAgICAgICAubWFwKGZ1bmN0aW9uICh2YWx1ZSkgeyByZXR1cm4gKHsga2V5OiBfb3B0aW9ucy5rZXksIHZhbHVlOiB2YWx1ZSB9KTsgfSk7XG4gICAgICAgIHZhciBzaW5rcyA9IE9iamVjdC5hc3NpZ24oY29tcG9uZW50U2lua3MsIHtcbiAgICAgICAgICAgIG9uaW9uOiBwYXJlbnRSZWR1Y2VyJCxcbiAgICAgICAgICAgIHN0b3JhZ2U6IHN0b3JhZ2UkLFxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHNpbmtzO1xuICAgIH07XG59XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XG5leHBvcnRzLmRlZmF1bHQgPSBzdG9yYWdlaWZ5O1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9aW5kZXguanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgX19leHRlbmRzID0gKHRoaXMgJiYgdGhpcy5fX2V4dGVuZHMpIHx8IGZ1bmN0aW9uIChkLCBiKSB7XG4gICAgZm9yICh2YXIgcCBpbiBiKSBpZiAoYi5oYXNPd25Qcm9wZXJ0eShwKSkgZFtwXSA9IGJbcF07XG4gICAgZnVuY3Rpb24gX18oKSB7IHRoaXMuY29uc3RydWN0b3IgPSBkOyB9XG4gICAgZC5wcm90b3R5cGUgPSBiID09PSBudWxsID8gT2JqZWN0LmNyZWF0ZShiKSA6IChfXy5wcm90b3R5cGUgPSBiLnByb3RvdHlwZSwgbmV3IF9fKCkpO1xufTtcbnZhciBzeW1ib2xfb2JzZXJ2YWJsZV8xID0gcmVxdWlyZSgnc3ltYm9sLW9ic2VydmFibGUnKTtcbnZhciBOTyA9IHt9O1xuZnVuY3Rpb24gbm9vcCgpIHsgfVxuZnVuY3Rpb24gY29weShhKSB7XG4gICAgdmFyIGwgPSBhLmxlbmd0aDtcbiAgICB2YXIgYiA9IEFycmF5KGwpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbDsgKytpKSB7XG4gICAgICAgIGJbaV0gPSBhW2ldO1xuICAgIH1cbiAgICByZXR1cm4gYjtcbn1cbmV4cG9ydHMuTk9fSUwgPSB7XG4gICAgX246IG5vb3AsXG4gICAgX2U6IG5vb3AsXG4gICAgX2M6IG5vb3AsXG59O1xuLy8gbXV0YXRlcyB0aGUgaW5wdXRcbmZ1bmN0aW9uIGludGVybmFsaXplUHJvZHVjZXIocHJvZHVjZXIpIHtcbiAgICBwcm9kdWNlci5fc3RhcnQgPVxuICAgICAgICBmdW5jdGlvbiBfc3RhcnQoaWwpIHtcbiAgICAgICAgICAgIGlsLm5leHQgPSBpbC5fbjtcbiAgICAgICAgICAgIGlsLmVycm9yID0gaWwuX2U7XG4gICAgICAgICAgICBpbC5jb21wbGV0ZSA9IGlsLl9jO1xuICAgICAgICAgICAgdGhpcy5zdGFydChpbCk7XG4gICAgICAgIH07XG4gICAgcHJvZHVjZXIuX3N0b3AgPSBwcm9kdWNlci5zdG9wO1xufVxuZnVuY3Rpb24gY29tcG9zZTIoZjEsIGYyKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIGNvbXBvc2VkRm4oYXJnKSB7XG4gICAgICAgIHJldHVybiBmMShmMihhcmcpKTtcbiAgICB9O1xufVxuZnVuY3Rpb24gYW5kKGYxLCBmMikge1xuICAgIHJldHVybiBmdW5jdGlvbiBhbmRGbih0KSB7XG4gICAgICAgIHJldHVybiBmMSh0KSAmJiBmMih0KTtcbiAgICB9O1xufVxudmFyIFN1YnNjcmlwdGlvbiA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gU3Vic2NyaXB0aW9uKF9zdHJlYW0sIF9saXN0ZW5lcikge1xuICAgICAgICB0aGlzLl9zdHJlYW0gPSBfc3RyZWFtO1xuICAgICAgICB0aGlzLl9saXN0ZW5lciA9IF9saXN0ZW5lcjtcbiAgICB9XG4gICAgU3Vic2NyaXB0aW9uLnByb3RvdHlwZS51bnN1YnNjcmliZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5fc3RyZWFtLnJlbW92ZUxpc3RlbmVyKHRoaXMuX2xpc3RlbmVyKTtcbiAgICB9O1xuICAgIHJldHVybiBTdWJzY3JpcHRpb247XG59KCkpO1xuZXhwb3J0cy5TdWJzY3JpcHRpb24gPSBTdWJzY3JpcHRpb247XG52YXIgT2JzZXJ2YWJsZVByb2R1Y2VyID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBPYnNlcnZhYmxlUHJvZHVjZXIob2JzZXJ2YWJsZSkge1xuICAgICAgICB0aGlzLnR5cGUgPSAnZnJvbU9ic2VydmFibGUnO1xuICAgICAgICB0aGlzLmlucyA9IG9ic2VydmFibGU7XG4gICAgfVxuICAgIE9ic2VydmFibGVQcm9kdWNlci5wcm90b3R5cGUuX3N0YXJ0ID0gZnVuY3Rpb24gKG91dCkge1xuICAgICAgICB0aGlzLm91dCA9IG91dDtcbiAgICAgICAgdGhpcy5fc3Vic2NyaXB0aW9uID0gdGhpcy5pbnMuc3Vic2NyaWJlKG5ldyBPYnNlcnZhYmxlTGlzdGVuZXIob3V0KSk7XG4gICAgfTtcbiAgICBPYnNlcnZhYmxlUHJvZHVjZXIucHJvdG90eXBlLl9zdG9wID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl9zdWJzY3JpcHRpb24udW5zdWJzY3JpYmUoKTtcbiAgICB9O1xuICAgIHJldHVybiBPYnNlcnZhYmxlUHJvZHVjZXI7XG59KCkpO1xudmFyIE9ic2VydmFibGVMaXN0ZW5lciA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gT2JzZXJ2YWJsZUxpc3RlbmVyKF9saXN0ZW5lcikge1xuICAgICAgICB0aGlzLl9saXN0ZW5lciA9IF9saXN0ZW5lcjtcbiAgICB9XG4gICAgT2JzZXJ2YWJsZUxpc3RlbmVyLnByb3RvdHlwZS5uZXh0ID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIHRoaXMuX2xpc3RlbmVyLl9uKHZhbHVlKTtcbiAgICB9O1xuICAgIE9ic2VydmFibGVMaXN0ZW5lci5wcm90b3R5cGUuZXJyb3IgPSBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgIHRoaXMuX2xpc3RlbmVyLl9lKGVycik7XG4gICAgfTtcbiAgICBPYnNlcnZhYmxlTGlzdGVuZXIucHJvdG90eXBlLmNvbXBsZXRlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl9saXN0ZW5lci5fYygpO1xuICAgIH07XG4gICAgcmV0dXJuIE9ic2VydmFibGVMaXN0ZW5lcjtcbn0oKSk7XG52YXIgTWVyZ2VQcm9kdWNlciA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gTWVyZ2VQcm9kdWNlcihpbnNBcnIpIHtcbiAgICAgICAgdGhpcy50eXBlID0gJ21lcmdlJztcbiAgICAgICAgdGhpcy5pbnNBcnIgPSBpbnNBcnI7XG4gICAgICAgIHRoaXMub3V0ID0gTk87XG4gICAgICAgIHRoaXMuYWMgPSAwO1xuICAgIH1cbiAgICBNZXJnZVByb2R1Y2VyLnByb3RvdHlwZS5fc3RhcnQgPSBmdW5jdGlvbiAob3V0KSB7XG4gICAgICAgIHRoaXMub3V0ID0gb3V0O1xuICAgICAgICB2YXIgcyA9IHRoaXMuaW5zQXJyO1xuICAgICAgICB2YXIgTCA9IHMubGVuZ3RoO1xuICAgICAgICB0aGlzLmFjID0gTDtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBMOyBpKyspIHtcbiAgICAgICAgICAgIHNbaV0uX2FkZCh0aGlzKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgTWVyZ2VQcm9kdWNlci5wcm90b3R5cGUuX3N0b3AgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBzID0gdGhpcy5pbnNBcnI7XG4gICAgICAgIHZhciBMID0gcy5sZW5ndGg7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgTDsgaSsrKSB7XG4gICAgICAgICAgICBzW2ldLl9yZW1vdmUodGhpcyk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5vdXQgPSBOTztcbiAgICB9O1xuICAgIE1lcmdlUHJvZHVjZXIucHJvdG90eXBlLl9uID0gZnVuY3Rpb24gKHQpIHtcbiAgICAgICAgdmFyIHUgPSB0aGlzLm91dDtcbiAgICAgICAgaWYgKHUgPT09IE5PKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB1Ll9uKHQpO1xuICAgIH07XG4gICAgTWVyZ2VQcm9kdWNlci5wcm90b3R5cGUuX2UgPSBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgIHZhciB1ID0gdGhpcy5vdXQ7XG4gICAgICAgIGlmICh1ID09PSBOTylcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgdS5fZShlcnIpO1xuICAgIH07XG4gICAgTWVyZ2VQcm9kdWNlci5wcm90b3R5cGUuX2MgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICgtLXRoaXMuYWMgPD0gMCkge1xuICAgICAgICAgICAgdmFyIHUgPSB0aGlzLm91dDtcbiAgICAgICAgICAgIGlmICh1ID09PSBOTylcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB1Ll9jKCk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHJldHVybiBNZXJnZVByb2R1Y2VyO1xufSgpKTtcbmV4cG9ydHMuTWVyZ2VQcm9kdWNlciA9IE1lcmdlUHJvZHVjZXI7XG52YXIgQ29tYmluZUxpc3RlbmVyID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBDb21iaW5lTGlzdGVuZXIoaSwgb3V0LCBwKSB7XG4gICAgICAgIHRoaXMuaSA9IGk7XG4gICAgICAgIHRoaXMub3V0ID0gb3V0O1xuICAgICAgICB0aGlzLnAgPSBwO1xuICAgICAgICBwLmlscy5wdXNoKHRoaXMpO1xuICAgIH1cbiAgICBDb21iaW5lTGlzdGVuZXIucHJvdG90eXBlLl9uID0gZnVuY3Rpb24gKHQpIHtcbiAgICAgICAgdmFyIHAgPSB0aGlzLnAsIG91dCA9IHRoaXMub3V0O1xuICAgICAgICBpZiAob3V0ID09PSBOTylcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgaWYgKHAudXAodCwgdGhpcy5pKSkge1xuICAgICAgICAgICAgb3V0Ll9uKHAudmFscyk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIENvbWJpbmVMaXN0ZW5lci5wcm90b3R5cGUuX2UgPSBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgIHZhciBvdXQgPSB0aGlzLm91dDtcbiAgICAgICAgaWYgKG91dCA9PT0gTk8pXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIG91dC5fZShlcnIpO1xuICAgIH07XG4gICAgQ29tYmluZUxpc3RlbmVyLnByb3RvdHlwZS5fYyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHAgPSB0aGlzLnA7XG4gICAgICAgIGlmIChwLm91dCA9PT0gTk8pXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIGlmICgtLXAuTmMgPT09IDApIHtcbiAgICAgICAgICAgIHAub3V0Ll9jKCk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHJldHVybiBDb21iaW5lTGlzdGVuZXI7XG59KCkpO1xuZXhwb3J0cy5Db21iaW5lTGlzdGVuZXIgPSBDb21iaW5lTGlzdGVuZXI7XG52YXIgQ29tYmluZVByb2R1Y2VyID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBDb21iaW5lUHJvZHVjZXIoaW5zQXJyKSB7XG4gICAgICAgIHRoaXMudHlwZSA9ICdjb21iaW5lJztcbiAgICAgICAgdGhpcy5pbnNBcnIgPSBpbnNBcnI7XG4gICAgICAgIHRoaXMub3V0ID0gTk87XG4gICAgICAgIHRoaXMuaWxzID0gW107XG4gICAgICAgIHRoaXMuTmMgPSB0aGlzLk5uID0gMDtcbiAgICAgICAgdGhpcy52YWxzID0gW107XG4gICAgfVxuICAgIENvbWJpbmVQcm9kdWNlci5wcm90b3R5cGUudXAgPSBmdW5jdGlvbiAodCwgaSkge1xuICAgICAgICB2YXIgdiA9IHRoaXMudmFsc1tpXTtcbiAgICAgICAgdmFyIE5uID0gIXRoaXMuTm4gPyAwIDogdiA9PT0gTk8gPyAtLXRoaXMuTm4gOiB0aGlzLk5uO1xuICAgICAgICB0aGlzLnZhbHNbaV0gPSB0O1xuICAgICAgICByZXR1cm4gTm4gPT09IDA7XG4gICAgfTtcbiAgICBDb21iaW5lUHJvZHVjZXIucHJvdG90eXBlLl9zdGFydCA9IGZ1bmN0aW9uIChvdXQpIHtcbiAgICAgICAgdGhpcy5vdXQgPSBvdXQ7XG4gICAgICAgIHZhciBzID0gdGhpcy5pbnNBcnI7XG4gICAgICAgIHZhciBuID0gdGhpcy5OYyA9IHRoaXMuTm4gPSBzLmxlbmd0aDtcbiAgICAgICAgdmFyIHZhbHMgPSB0aGlzLnZhbHMgPSBuZXcgQXJyYXkobik7XG4gICAgICAgIGlmIChuID09PSAwKSB7XG4gICAgICAgICAgICBvdXQuX24oW10pO1xuICAgICAgICAgICAgb3V0Ll9jKCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG47IGkrKykge1xuICAgICAgICAgICAgICAgIHZhbHNbaV0gPSBOTztcbiAgICAgICAgICAgICAgICBzW2ldLl9hZGQobmV3IENvbWJpbmVMaXN0ZW5lcihpLCBvdXQsIHRoaXMpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG4gICAgQ29tYmluZVByb2R1Y2VyLnByb3RvdHlwZS5fc3RvcCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHMgPSB0aGlzLmluc0FycjtcbiAgICAgICAgdmFyIG4gPSBzLmxlbmd0aDtcbiAgICAgICAgdmFyIGlscyA9IHRoaXMuaWxzO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG47IGkrKykge1xuICAgICAgICAgICAgc1tpXS5fcmVtb3ZlKGlsc1tpXSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5vdXQgPSBOTztcbiAgICAgICAgdGhpcy5pbHMgPSBbXTtcbiAgICAgICAgdGhpcy52YWxzID0gW107XG4gICAgfTtcbiAgICByZXR1cm4gQ29tYmluZVByb2R1Y2VyO1xufSgpKTtcbmV4cG9ydHMuQ29tYmluZVByb2R1Y2VyID0gQ29tYmluZVByb2R1Y2VyO1xudmFyIEZyb21BcnJheVByb2R1Y2VyID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBGcm9tQXJyYXlQcm9kdWNlcihhKSB7XG4gICAgICAgIHRoaXMudHlwZSA9ICdmcm9tQXJyYXknO1xuICAgICAgICB0aGlzLmEgPSBhO1xuICAgIH1cbiAgICBGcm9tQXJyYXlQcm9kdWNlci5wcm90b3R5cGUuX3N0YXJ0ID0gZnVuY3Rpb24gKG91dCkge1xuICAgICAgICB2YXIgYSA9IHRoaXMuYTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGwgPSBhLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICAgICAgb3V0Ll9uKGFbaV0pO1xuICAgICAgICB9XG4gICAgICAgIG91dC5fYygpO1xuICAgIH07XG4gICAgRnJvbUFycmF5UHJvZHVjZXIucHJvdG90eXBlLl9zdG9wID0gZnVuY3Rpb24gKCkge1xuICAgIH07XG4gICAgcmV0dXJuIEZyb21BcnJheVByb2R1Y2VyO1xufSgpKTtcbmV4cG9ydHMuRnJvbUFycmF5UHJvZHVjZXIgPSBGcm9tQXJyYXlQcm9kdWNlcjtcbnZhciBGcm9tUHJvbWlzZVByb2R1Y2VyID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBGcm9tUHJvbWlzZVByb2R1Y2VyKHApIHtcbiAgICAgICAgdGhpcy50eXBlID0gJ2Zyb21Qcm9taXNlJztcbiAgICAgICAgdGhpcy5vbiA9IGZhbHNlO1xuICAgICAgICB0aGlzLnAgPSBwO1xuICAgIH1cbiAgICBGcm9tUHJvbWlzZVByb2R1Y2VyLnByb3RvdHlwZS5fc3RhcnQgPSBmdW5jdGlvbiAob3V0KSB7XG4gICAgICAgIHZhciBwcm9kID0gdGhpcztcbiAgICAgICAgdGhpcy5vbiA9IHRydWU7XG4gICAgICAgIHRoaXMucC50aGVuKGZ1bmN0aW9uICh2KSB7XG4gICAgICAgICAgICBpZiAocHJvZC5vbikge1xuICAgICAgICAgICAgICAgIG91dC5fbih2KTtcbiAgICAgICAgICAgICAgICBvdXQuX2MoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgIG91dC5fZShlKTtcbiAgICAgICAgfSkudGhlbihub29wLCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHsgdGhyb3cgZXJyOyB9KTtcbiAgICAgICAgfSk7XG4gICAgfTtcbiAgICBGcm9tUHJvbWlzZVByb2R1Y2VyLnByb3RvdHlwZS5fc3RvcCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5vbiA9IGZhbHNlO1xuICAgIH07XG4gICAgcmV0dXJuIEZyb21Qcm9taXNlUHJvZHVjZXI7XG59KCkpO1xuZXhwb3J0cy5Gcm9tUHJvbWlzZVByb2R1Y2VyID0gRnJvbVByb21pc2VQcm9kdWNlcjtcbnZhciBQZXJpb2RpY1Byb2R1Y2VyID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBQZXJpb2RpY1Byb2R1Y2VyKHBlcmlvZCkge1xuICAgICAgICB0aGlzLnR5cGUgPSAncGVyaW9kaWMnO1xuICAgICAgICB0aGlzLnBlcmlvZCA9IHBlcmlvZDtcbiAgICAgICAgdGhpcy5pbnRlcnZhbElEID0gLTE7XG4gICAgICAgIHRoaXMuaSA9IDA7XG4gICAgfVxuICAgIFBlcmlvZGljUHJvZHVjZXIucHJvdG90eXBlLl9zdGFydCA9IGZ1bmN0aW9uIChzdHJlYW0pIHtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICBmdW5jdGlvbiBpbnRlcnZhbEhhbmRsZXIoKSB7IHN0cmVhbS5fbihzZWxmLmkrKyk7IH1cbiAgICAgICAgdGhpcy5pbnRlcnZhbElEID0gc2V0SW50ZXJ2YWwoaW50ZXJ2YWxIYW5kbGVyLCB0aGlzLnBlcmlvZCk7XG4gICAgfTtcbiAgICBQZXJpb2RpY1Byb2R1Y2VyLnByb3RvdHlwZS5fc3RvcCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKHRoaXMuaW50ZXJ2YWxJRCAhPT0gLTEpXG4gICAgICAgICAgICBjbGVhckludGVydmFsKHRoaXMuaW50ZXJ2YWxJRCk7XG4gICAgICAgIHRoaXMuaW50ZXJ2YWxJRCA9IC0xO1xuICAgICAgICB0aGlzLmkgPSAwO1xuICAgIH07XG4gICAgcmV0dXJuIFBlcmlvZGljUHJvZHVjZXI7XG59KCkpO1xuZXhwb3J0cy5QZXJpb2RpY1Byb2R1Y2VyID0gUGVyaW9kaWNQcm9kdWNlcjtcbnZhciBEZWJ1Z09wZXJhdG9yID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBEZWJ1Z09wZXJhdG9yKGlucywgYXJnKSB7XG4gICAgICAgIHRoaXMudHlwZSA9ICdkZWJ1Zyc7XG4gICAgICAgIHRoaXMuaW5zID0gaW5zO1xuICAgICAgICB0aGlzLm91dCA9IE5PO1xuICAgICAgICB0aGlzLnMgPSBub29wO1xuICAgICAgICB0aGlzLmwgPSAnJztcbiAgICAgICAgaWYgKHR5cGVvZiBhcmcgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICB0aGlzLmwgPSBhcmc7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAodHlwZW9mIGFyZyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgdGhpcy5zID0gYXJnO1xuICAgICAgICB9XG4gICAgfVxuICAgIERlYnVnT3BlcmF0b3IucHJvdG90eXBlLl9zdGFydCA9IGZ1bmN0aW9uIChvdXQpIHtcbiAgICAgICAgdGhpcy5vdXQgPSBvdXQ7XG4gICAgICAgIHRoaXMuaW5zLl9hZGQodGhpcyk7XG4gICAgfTtcbiAgICBEZWJ1Z09wZXJhdG9yLnByb3RvdHlwZS5fc3RvcCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5pbnMuX3JlbW92ZSh0aGlzKTtcbiAgICAgICAgdGhpcy5vdXQgPSBOTztcbiAgICB9O1xuICAgIERlYnVnT3BlcmF0b3IucHJvdG90eXBlLl9uID0gZnVuY3Rpb24gKHQpIHtcbiAgICAgICAgdmFyIHUgPSB0aGlzLm91dDtcbiAgICAgICAgaWYgKHUgPT09IE5PKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB2YXIgcyA9IHRoaXMucywgbCA9IHRoaXMubDtcbiAgICAgICAgaWYgKHMgIT09IG5vb3ApIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgcyh0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgdS5fZShlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChsKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhsICsgJzonLCB0KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKHQpO1xuICAgICAgICB9XG4gICAgICAgIHUuX24odCk7XG4gICAgfTtcbiAgICBEZWJ1Z09wZXJhdG9yLnByb3RvdHlwZS5fZSA9IGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgdmFyIHUgPSB0aGlzLm91dDtcbiAgICAgICAgaWYgKHUgPT09IE5PKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB1Ll9lKGVycik7XG4gICAgfTtcbiAgICBEZWJ1Z09wZXJhdG9yLnByb3RvdHlwZS5fYyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHUgPSB0aGlzLm91dDtcbiAgICAgICAgaWYgKHUgPT09IE5PKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB1Ll9jKCk7XG4gICAgfTtcbiAgICByZXR1cm4gRGVidWdPcGVyYXRvcjtcbn0oKSk7XG5leHBvcnRzLkRlYnVnT3BlcmF0b3IgPSBEZWJ1Z09wZXJhdG9yO1xudmFyIERyb3BPcGVyYXRvciA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gRHJvcE9wZXJhdG9yKG1heCwgaW5zKSB7XG4gICAgICAgIHRoaXMudHlwZSA9ICdkcm9wJztcbiAgICAgICAgdGhpcy5pbnMgPSBpbnM7XG4gICAgICAgIHRoaXMub3V0ID0gTk87XG4gICAgICAgIHRoaXMubWF4ID0gbWF4O1xuICAgICAgICB0aGlzLmRyb3BwZWQgPSAwO1xuICAgIH1cbiAgICBEcm9wT3BlcmF0b3IucHJvdG90eXBlLl9zdGFydCA9IGZ1bmN0aW9uIChvdXQpIHtcbiAgICAgICAgdGhpcy5vdXQgPSBvdXQ7XG4gICAgICAgIHRoaXMuZHJvcHBlZCA9IDA7XG4gICAgICAgIHRoaXMuaW5zLl9hZGQodGhpcyk7XG4gICAgfTtcbiAgICBEcm9wT3BlcmF0b3IucHJvdG90eXBlLl9zdG9wID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLmlucy5fcmVtb3ZlKHRoaXMpO1xuICAgICAgICB0aGlzLm91dCA9IE5PO1xuICAgIH07XG4gICAgRHJvcE9wZXJhdG9yLnByb3RvdHlwZS5fbiA9IGZ1bmN0aW9uICh0KSB7XG4gICAgICAgIHZhciB1ID0gdGhpcy5vdXQ7XG4gICAgICAgIGlmICh1ID09PSBOTylcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgaWYgKHRoaXMuZHJvcHBlZCsrID49IHRoaXMubWF4KVxuICAgICAgICAgICAgdS5fbih0KTtcbiAgICB9O1xuICAgIERyb3BPcGVyYXRvci5wcm90b3R5cGUuX2UgPSBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgIHZhciB1ID0gdGhpcy5vdXQ7XG4gICAgICAgIGlmICh1ID09PSBOTylcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgdS5fZShlcnIpO1xuICAgIH07XG4gICAgRHJvcE9wZXJhdG9yLnByb3RvdHlwZS5fYyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHUgPSB0aGlzLm91dDtcbiAgICAgICAgaWYgKHUgPT09IE5PKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB1Ll9jKCk7XG4gICAgfTtcbiAgICByZXR1cm4gRHJvcE9wZXJhdG9yO1xufSgpKTtcbmV4cG9ydHMuRHJvcE9wZXJhdG9yID0gRHJvcE9wZXJhdG9yO1xudmFyIE90aGVySUwgPSAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIE90aGVySUwob3V0LCBvcCkge1xuICAgICAgICB0aGlzLm91dCA9IG91dDtcbiAgICAgICAgdGhpcy5vcCA9IG9wO1xuICAgIH1cbiAgICBPdGhlcklMLnByb3RvdHlwZS5fbiA9IGZ1bmN0aW9uICh0KSB7XG4gICAgICAgIHRoaXMub3AuZW5kKCk7XG4gICAgfTtcbiAgICBPdGhlcklMLnByb3RvdHlwZS5fZSA9IGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgdGhpcy5vdXQuX2UoZXJyKTtcbiAgICB9O1xuICAgIE90aGVySUwucHJvdG90eXBlLl9jID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLm9wLmVuZCgpO1xuICAgIH07XG4gICAgcmV0dXJuIE90aGVySUw7XG59KCkpO1xudmFyIEVuZFdoZW5PcGVyYXRvciA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gRW5kV2hlbk9wZXJhdG9yKG8sIGlucykge1xuICAgICAgICB0aGlzLnR5cGUgPSAnZW5kV2hlbic7XG4gICAgICAgIHRoaXMuaW5zID0gaW5zO1xuICAgICAgICB0aGlzLm91dCA9IE5PO1xuICAgICAgICB0aGlzLm8gPSBvO1xuICAgICAgICB0aGlzLm9pbCA9IGV4cG9ydHMuTk9fSUw7XG4gICAgfVxuICAgIEVuZFdoZW5PcGVyYXRvci5wcm90b3R5cGUuX3N0YXJ0ID0gZnVuY3Rpb24gKG91dCkge1xuICAgICAgICB0aGlzLm91dCA9IG91dDtcbiAgICAgICAgdGhpcy5vLl9hZGQodGhpcy5vaWwgPSBuZXcgT3RoZXJJTChvdXQsIHRoaXMpKTtcbiAgICAgICAgdGhpcy5pbnMuX2FkZCh0aGlzKTtcbiAgICB9O1xuICAgIEVuZFdoZW5PcGVyYXRvci5wcm90b3R5cGUuX3N0b3AgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuaW5zLl9yZW1vdmUodGhpcyk7XG4gICAgICAgIHRoaXMuby5fcmVtb3ZlKHRoaXMub2lsKTtcbiAgICAgICAgdGhpcy5vdXQgPSBOTztcbiAgICAgICAgdGhpcy5vaWwgPSBleHBvcnRzLk5PX0lMO1xuICAgIH07XG4gICAgRW5kV2hlbk9wZXJhdG9yLnByb3RvdHlwZS5lbmQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciB1ID0gdGhpcy5vdXQ7XG4gICAgICAgIGlmICh1ID09PSBOTylcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgdS5fYygpO1xuICAgIH07XG4gICAgRW5kV2hlbk9wZXJhdG9yLnByb3RvdHlwZS5fbiA9IGZ1bmN0aW9uICh0KSB7XG4gICAgICAgIHZhciB1ID0gdGhpcy5vdXQ7XG4gICAgICAgIGlmICh1ID09PSBOTylcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgdS5fbih0KTtcbiAgICB9O1xuICAgIEVuZFdoZW5PcGVyYXRvci5wcm90b3R5cGUuX2UgPSBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgIHZhciB1ID0gdGhpcy5vdXQ7XG4gICAgICAgIGlmICh1ID09PSBOTylcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgdS5fZShlcnIpO1xuICAgIH07XG4gICAgRW5kV2hlbk9wZXJhdG9yLnByb3RvdHlwZS5fYyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5lbmQoKTtcbiAgICB9O1xuICAgIHJldHVybiBFbmRXaGVuT3BlcmF0b3I7XG59KCkpO1xuZXhwb3J0cy5FbmRXaGVuT3BlcmF0b3IgPSBFbmRXaGVuT3BlcmF0b3I7XG52YXIgRmlsdGVyT3BlcmF0b3IgPSAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIEZpbHRlck9wZXJhdG9yKHBhc3NlcywgaW5zKSB7XG4gICAgICAgIHRoaXMudHlwZSA9ICdmaWx0ZXInO1xuICAgICAgICB0aGlzLmlucyA9IGlucztcbiAgICAgICAgdGhpcy5vdXQgPSBOTztcbiAgICAgICAgdGhpcy5wYXNzZXMgPSBwYXNzZXM7XG4gICAgfVxuICAgIEZpbHRlck9wZXJhdG9yLnByb3RvdHlwZS5fc3RhcnQgPSBmdW5jdGlvbiAob3V0KSB7XG4gICAgICAgIHRoaXMub3V0ID0gb3V0O1xuICAgICAgICB0aGlzLmlucy5fYWRkKHRoaXMpO1xuICAgIH07XG4gICAgRmlsdGVyT3BlcmF0b3IucHJvdG90eXBlLl9zdG9wID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLmlucy5fcmVtb3ZlKHRoaXMpO1xuICAgICAgICB0aGlzLm91dCA9IE5PO1xuICAgIH07XG4gICAgRmlsdGVyT3BlcmF0b3IucHJvdG90eXBlLl9uID0gZnVuY3Rpb24gKHQpIHtcbiAgICAgICAgdmFyIHUgPSB0aGlzLm91dDtcbiAgICAgICAgaWYgKHUgPT09IE5PKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgaWYgKHRoaXMucGFzc2VzKHQpKVxuICAgICAgICAgICAgICAgIHUuX24odCk7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIHUuX2UoZSk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIEZpbHRlck9wZXJhdG9yLnByb3RvdHlwZS5fZSA9IGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgdmFyIHUgPSB0aGlzLm91dDtcbiAgICAgICAgaWYgKHUgPT09IE5PKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB1Ll9lKGVycik7XG4gICAgfTtcbiAgICBGaWx0ZXJPcGVyYXRvci5wcm90b3R5cGUuX2MgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciB1ID0gdGhpcy5vdXQ7XG4gICAgICAgIGlmICh1ID09PSBOTylcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgdS5fYygpO1xuICAgIH07XG4gICAgcmV0dXJuIEZpbHRlck9wZXJhdG9yO1xufSgpKTtcbmV4cG9ydHMuRmlsdGVyT3BlcmF0b3IgPSBGaWx0ZXJPcGVyYXRvcjtcbnZhciBGbGF0dGVuTGlzdGVuZXIgPSAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIEZsYXR0ZW5MaXN0ZW5lcihvdXQsIG9wKSB7XG4gICAgICAgIHRoaXMub3V0ID0gb3V0O1xuICAgICAgICB0aGlzLm9wID0gb3A7XG4gICAgfVxuICAgIEZsYXR0ZW5MaXN0ZW5lci5wcm90b3R5cGUuX24gPSBmdW5jdGlvbiAodCkge1xuICAgICAgICB0aGlzLm91dC5fbih0KTtcbiAgICB9O1xuICAgIEZsYXR0ZW5MaXN0ZW5lci5wcm90b3R5cGUuX2UgPSBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgIHRoaXMub3V0Ll9lKGVycik7XG4gICAgfTtcbiAgICBGbGF0dGVuTGlzdGVuZXIucHJvdG90eXBlLl9jID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLm9wLmlubmVyID0gTk87XG4gICAgICAgIHRoaXMub3AubGVzcygpO1xuICAgIH07XG4gICAgcmV0dXJuIEZsYXR0ZW5MaXN0ZW5lcjtcbn0oKSk7XG52YXIgRmxhdHRlbk9wZXJhdG9yID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBGbGF0dGVuT3BlcmF0b3IoaW5zKSB7XG4gICAgICAgIHRoaXMudHlwZSA9ICdmbGF0dGVuJztcbiAgICAgICAgdGhpcy5pbnMgPSBpbnM7XG4gICAgICAgIHRoaXMub3V0ID0gTk87XG4gICAgICAgIHRoaXMub3BlbiA9IHRydWU7XG4gICAgICAgIHRoaXMuaW5uZXIgPSBOTztcbiAgICAgICAgdGhpcy5pbCA9IGV4cG9ydHMuTk9fSUw7XG4gICAgfVxuICAgIEZsYXR0ZW5PcGVyYXRvci5wcm90b3R5cGUuX3N0YXJ0ID0gZnVuY3Rpb24gKG91dCkge1xuICAgICAgICB0aGlzLm91dCA9IG91dDtcbiAgICAgICAgdGhpcy5vcGVuID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5pbm5lciA9IE5PO1xuICAgICAgICB0aGlzLmlsID0gZXhwb3J0cy5OT19JTDtcbiAgICAgICAgdGhpcy5pbnMuX2FkZCh0aGlzKTtcbiAgICB9O1xuICAgIEZsYXR0ZW5PcGVyYXRvci5wcm90b3R5cGUuX3N0b3AgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuaW5zLl9yZW1vdmUodGhpcyk7XG4gICAgICAgIGlmICh0aGlzLmlubmVyICE9PSBOTylcbiAgICAgICAgICAgIHRoaXMuaW5uZXIuX3JlbW92ZSh0aGlzLmlsKTtcbiAgICAgICAgdGhpcy5vdXQgPSBOTztcbiAgICAgICAgdGhpcy5vcGVuID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5pbm5lciA9IE5PO1xuICAgICAgICB0aGlzLmlsID0gZXhwb3J0cy5OT19JTDtcbiAgICB9O1xuICAgIEZsYXR0ZW5PcGVyYXRvci5wcm90b3R5cGUubGVzcyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHUgPSB0aGlzLm91dDtcbiAgICAgICAgaWYgKHUgPT09IE5PKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICBpZiAoIXRoaXMub3BlbiAmJiB0aGlzLmlubmVyID09PSBOTylcbiAgICAgICAgICAgIHUuX2MoKTtcbiAgICB9O1xuICAgIEZsYXR0ZW5PcGVyYXRvci5wcm90b3R5cGUuX24gPSBmdW5jdGlvbiAocykge1xuICAgICAgICB2YXIgdSA9IHRoaXMub3V0O1xuICAgICAgICBpZiAodSA9PT0gTk8pXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIHZhciBfYSA9IHRoaXMsIGlubmVyID0gX2EuaW5uZXIsIGlsID0gX2EuaWw7XG4gICAgICAgIGlmIChpbm5lciAhPT0gTk8gJiYgaWwgIT09IGV4cG9ydHMuTk9fSUwpXG4gICAgICAgICAgICBpbm5lci5fcmVtb3ZlKGlsKTtcbiAgICAgICAgKHRoaXMuaW5uZXIgPSBzKS5fYWRkKHRoaXMuaWwgPSBuZXcgRmxhdHRlbkxpc3RlbmVyKHUsIHRoaXMpKTtcbiAgICB9O1xuICAgIEZsYXR0ZW5PcGVyYXRvci5wcm90b3R5cGUuX2UgPSBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgIHZhciB1ID0gdGhpcy5vdXQ7XG4gICAgICAgIGlmICh1ID09PSBOTylcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgdS5fZShlcnIpO1xuICAgIH07XG4gICAgRmxhdHRlbk9wZXJhdG9yLnByb3RvdHlwZS5fYyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5vcGVuID0gZmFsc2U7XG4gICAgICAgIHRoaXMubGVzcygpO1xuICAgIH07XG4gICAgcmV0dXJuIEZsYXR0ZW5PcGVyYXRvcjtcbn0oKSk7XG5leHBvcnRzLkZsYXR0ZW5PcGVyYXRvciA9IEZsYXR0ZW5PcGVyYXRvcjtcbnZhciBGb2xkT3BlcmF0b3IgPSAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIEZvbGRPcGVyYXRvcihmLCBzZWVkLCBpbnMpIHtcbiAgICAgICAgdGhpcy50eXBlID0gJ2ZvbGQnO1xuICAgICAgICB0aGlzLmlucyA9IGlucztcbiAgICAgICAgdGhpcy5vdXQgPSBOTztcbiAgICAgICAgdGhpcy5mID0gZjtcbiAgICAgICAgdGhpcy5hY2MgPSB0aGlzLnNlZWQgPSBzZWVkO1xuICAgIH1cbiAgICBGb2xkT3BlcmF0b3IucHJvdG90eXBlLl9zdGFydCA9IGZ1bmN0aW9uIChvdXQpIHtcbiAgICAgICAgdGhpcy5vdXQgPSBvdXQ7XG4gICAgICAgIHRoaXMuYWNjID0gdGhpcy5zZWVkO1xuICAgICAgICBvdXQuX24odGhpcy5hY2MpO1xuICAgICAgICB0aGlzLmlucy5fYWRkKHRoaXMpO1xuICAgIH07XG4gICAgRm9sZE9wZXJhdG9yLnByb3RvdHlwZS5fc3RvcCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5pbnMuX3JlbW92ZSh0aGlzKTtcbiAgICAgICAgdGhpcy5vdXQgPSBOTztcbiAgICAgICAgdGhpcy5hY2MgPSB0aGlzLnNlZWQ7XG4gICAgfTtcbiAgICBGb2xkT3BlcmF0b3IucHJvdG90eXBlLl9uID0gZnVuY3Rpb24gKHQpIHtcbiAgICAgICAgdmFyIHUgPSB0aGlzLm91dDtcbiAgICAgICAgaWYgKHUgPT09IE5PKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgdS5fbih0aGlzLmFjYyA9IHRoaXMuZih0aGlzLmFjYywgdCkpO1xuICAgICAgICB9XG4gICAgICAgIGNhdGNoIChlKSB7XG4gICAgICAgICAgICB1Ll9lKGUpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBGb2xkT3BlcmF0b3IucHJvdG90eXBlLl9lID0gZnVuY3Rpb24gKGVycikge1xuICAgICAgICB2YXIgdSA9IHRoaXMub3V0O1xuICAgICAgICBpZiAodSA9PT0gTk8pXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIHUuX2UoZXJyKTtcbiAgICB9O1xuICAgIEZvbGRPcGVyYXRvci5wcm90b3R5cGUuX2MgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciB1ID0gdGhpcy5vdXQ7XG4gICAgICAgIGlmICh1ID09PSBOTylcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgdS5fYygpO1xuICAgIH07XG4gICAgcmV0dXJuIEZvbGRPcGVyYXRvcjtcbn0oKSk7XG5leHBvcnRzLkZvbGRPcGVyYXRvciA9IEZvbGRPcGVyYXRvcjtcbnZhciBMYXN0T3BlcmF0b3IgPSAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIExhc3RPcGVyYXRvcihpbnMpIHtcbiAgICAgICAgdGhpcy50eXBlID0gJ2xhc3QnO1xuICAgICAgICB0aGlzLmlucyA9IGlucztcbiAgICAgICAgdGhpcy5vdXQgPSBOTztcbiAgICAgICAgdGhpcy5oYXMgPSBmYWxzZTtcbiAgICAgICAgdGhpcy52YWwgPSBOTztcbiAgICB9XG4gICAgTGFzdE9wZXJhdG9yLnByb3RvdHlwZS5fc3RhcnQgPSBmdW5jdGlvbiAob3V0KSB7XG4gICAgICAgIHRoaXMub3V0ID0gb3V0O1xuICAgICAgICB0aGlzLmhhcyA9IGZhbHNlO1xuICAgICAgICB0aGlzLmlucy5fYWRkKHRoaXMpO1xuICAgIH07XG4gICAgTGFzdE9wZXJhdG9yLnByb3RvdHlwZS5fc3RvcCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5pbnMuX3JlbW92ZSh0aGlzKTtcbiAgICAgICAgdGhpcy5vdXQgPSBOTztcbiAgICAgICAgdGhpcy52YWwgPSBOTztcbiAgICB9O1xuICAgIExhc3RPcGVyYXRvci5wcm90b3R5cGUuX24gPSBmdW5jdGlvbiAodCkge1xuICAgICAgICB0aGlzLmhhcyA9IHRydWU7XG4gICAgICAgIHRoaXMudmFsID0gdDtcbiAgICB9O1xuICAgIExhc3RPcGVyYXRvci5wcm90b3R5cGUuX2UgPSBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgIHZhciB1ID0gdGhpcy5vdXQ7XG4gICAgICAgIGlmICh1ID09PSBOTylcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgdS5fZShlcnIpO1xuICAgIH07XG4gICAgTGFzdE9wZXJhdG9yLnByb3RvdHlwZS5fYyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHUgPSB0aGlzLm91dDtcbiAgICAgICAgaWYgKHUgPT09IE5PKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICBpZiAodGhpcy5oYXMpIHtcbiAgICAgICAgICAgIHUuX24odGhpcy52YWwpO1xuICAgICAgICAgICAgdS5fYygpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdS5fZSgnVE9ETyBzaG93IHByb3BlciBlcnJvcicpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICByZXR1cm4gTGFzdE9wZXJhdG9yO1xufSgpKTtcbmV4cG9ydHMuTGFzdE9wZXJhdG9yID0gTGFzdE9wZXJhdG9yO1xudmFyIE1hcEZsYXR0ZW5Jbm5lciA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gTWFwRmxhdHRlbklubmVyKG91dCwgb3ApIHtcbiAgICAgICAgdGhpcy5vdXQgPSBvdXQ7XG4gICAgICAgIHRoaXMub3AgPSBvcDtcbiAgICB9XG4gICAgTWFwRmxhdHRlbklubmVyLnByb3RvdHlwZS5fbiA9IGZ1bmN0aW9uIChyKSB7XG4gICAgICAgIHRoaXMub3V0Ll9uKHIpO1xuICAgIH07XG4gICAgTWFwRmxhdHRlbklubmVyLnByb3RvdHlwZS5fZSA9IGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgdGhpcy5vdXQuX2UoZXJyKTtcbiAgICB9O1xuICAgIE1hcEZsYXR0ZW5Jbm5lci5wcm90b3R5cGUuX2MgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMub3AuaW5uZXIgPSBOTztcbiAgICAgICAgdGhpcy5vcC5sZXNzKCk7XG4gICAgfTtcbiAgICByZXR1cm4gTWFwRmxhdHRlbklubmVyO1xufSgpKTtcbnZhciBNYXBGbGF0dGVuT3BlcmF0b3IgPSAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIE1hcEZsYXR0ZW5PcGVyYXRvcihtYXBPcCkge1xuICAgICAgICB0aGlzLnR5cGUgPSBtYXBPcC50eXBlICsgXCIrZmxhdHRlblwiO1xuICAgICAgICB0aGlzLmlucyA9IG1hcE9wLmlucztcbiAgICAgICAgdGhpcy5vdXQgPSBOTztcbiAgICAgICAgdGhpcy5tYXBPcCA9IG1hcE9wO1xuICAgICAgICB0aGlzLmlubmVyID0gTk87XG4gICAgICAgIHRoaXMuaWwgPSBleHBvcnRzLk5PX0lMO1xuICAgICAgICB0aGlzLm9wZW4gPSB0cnVlO1xuICAgIH1cbiAgICBNYXBGbGF0dGVuT3BlcmF0b3IucHJvdG90eXBlLl9zdGFydCA9IGZ1bmN0aW9uIChvdXQpIHtcbiAgICAgICAgdGhpcy5vdXQgPSBvdXQ7XG4gICAgICAgIHRoaXMuaW5uZXIgPSBOTztcbiAgICAgICAgdGhpcy5pbCA9IGV4cG9ydHMuTk9fSUw7XG4gICAgICAgIHRoaXMub3BlbiA9IHRydWU7XG4gICAgICAgIHRoaXMubWFwT3AuaW5zLl9hZGQodGhpcyk7XG4gICAgfTtcbiAgICBNYXBGbGF0dGVuT3BlcmF0b3IucHJvdG90eXBlLl9zdG9wID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLm1hcE9wLmlucy5fcmVtb3ZlKHRoaXMpO1xuICAgICAgICBpZiAodGhpcy5pbm5lciAhPT0gTk8pXG4gICAgICAgICAgICB0aGlzLmlubmVyLl9yZW1vdmUodGhpcy5pbCk7XG4gICAgICAgIHRoaXMub3V0ID0gTk87XG4gICAgICAgIHRoaXMuaW5uZXIgPSBOTztcbiAgICAgICAgdGhpcy5pbCA9IGV4cG9ydHMuTk9fSUw7XG4gICAgfTtcbiAgICBNYXBGbGF0dGVuT3BlcmF0b3IucHJvdG90eXBlLmxlc3MgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICghdGhpcy5vcGVuICYmIHRoaXMuaW5uZXIgPT09IE5PKSB7XG4gICAgICAgICAgICB2YXIgdSA9IHRoaXMub3V0O1xuICAgICAgICAgICAgaWYgKHUgPT09IE5PKVxuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIHUuX2MoKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgTWFwRmxhdHRlbk9wZXJhdG9yLnByb3RvdHlwZS5fbiA9IGZ1bmN0aW9uICh2KSB7XG4gICAgICAgIHZhciB1ID0gdGhpcy5vdXQ7XG4gICAgICAgIGlmICh1ID09PSBOTylcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgdmFyIF9hID0gdGhpcywgaW5uZXIgPSBfYS5pbm5lciwgaWwgPSBfYS5pbDtcbiAgICAgICAgdmFyIHM7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBzID0gdGhpcy5tYXBPcC5wcm9qZWN0KHYpO1xuICAgICAgICB9XG4gICAgICAgIGNhdGNoIChlKSB7XG4gICAgICAgICAgICB1Ll9lKGUpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpbm5lciAhPT0gTk8gJiYgaWwgIT09IGV4cG9ydHMuTk9fSUwpXG4gICAgICAgICAgICBpbm5lci5fcmVtb3ZlKGlsKTtcbiAgICAgICAgKHRoaXMuaW5uZXIgPSBzKS5fYWRkKHRoaXMuaWwgPSBuZXcgTWFwRmxhdHRlbklubmVyKHUsIHRoaXMpKTtcbiAgICB9O1xuICAgIE1hcEZsYXR0ZW5PcGVyYXRvci5wcm90b3R5cGUuX2UgPSBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgIHZhciB1ID0gdGhpcy5vdXQ7XG4gICAgICAgIGlmICh1ID09PSBOTylcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgdS5fZShlcnIpO1xuICAgIH07XG4gICAgTWFwRmxhdHRlbk9wZXJhdG9yLnByb3RvdHlwZS5fYyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5vcGVuID0gZmFsc2U7XG4gICAgICAgIHRoaXMubGVzcygpO1xuICAgIH07XG4gICAgcmV0dXJuIE1hcEZsYXR0ZW5PcGVyYXRvcjtcbn0oKSk7XG5leHBvcnRzLk1hcEZsYXR0ZW5PcGVyYXRvciA9IE1hcEZsYXR0ZW5PcGVyYXRvcjtcbnZhciBNYXBPcGVyYXRvciA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gTWFwT3BlcmF0b3IocHJvamVjdCwgaW5zKSB7XG4gICAgICAgIHRoaXMudHlwZSA9ICdtYXAnO1xuICAgICAgICB0aGlzLmlucyA9IGlucztcbiAgICAgICAgdGhpcy5vdXQgPSBOTztcbiAgICAgICAgdGhpcy5wcm9qZWN0ID0gcHJvamVjdDtcbiAgICB9XG4gICAgTWFwT3BlcmF0b3IucHJvdG90eXBlLl9zdGFydCA9IGZ1bmN0aW9uIChvdXQpIHtcbiAgICAgICAgdGhpcy5vdXQgPSBvdXQ7XG4gICAgICAgIHRoaXMuaW5zLl9hZGQodGhpcyk7XG4gICAgfTtcbiAgICBNYXBPcGVyYXRvci5wcm90b3R5cGUuX3N0b3AgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuaW5zLl9yZW1vdmUodGhpcyk7XG4gICAgICAgIHRoaXMub3V0ID0gTk87XG4gICAgfTtcbiAgICBNYXBPcGVyYXRvci5wcm90b3R5cGUuX24gPSBmdW5jdGlvbiAodCkge1xuICAgICAgICB2YXIgdSA9IHRoaXMub3V0O1xuICAgICAgICBpZiAodSA9PT0gTk8pXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICB1Ll9uKHRoaXMucHJvamVjdCh0KSk7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIHUuX2UoZSk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIE1hcE9wZXJhdG9yLnByb3RvdHlwZS5fZSA9IGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgdmFyIHUgPSB0aGlzLm91dDtcbiAgICAgICAgaWYgKHUgPT09IE5PKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB1Ll9lKGVycik7XG4gICAgfTtcbiAgICBNYXBPcGVyYXRvci5wcm90b3R5cGUuX2MgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciB1ID0gdGhpcy5vdXQ7XG4gICAgICAgIGlmICh1ID09PSBOTylcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgdS5fYygpO1xuICAgIH07XG4gICAgcmV0dXJuIE1hcE9wZXJhdG9yO1xufSgpKTtcbmV4cG9ydHMuTWFwT3BlcmF0b3IgPSBNYXBPcGVyYXRvcjtcbnZhciBGaWx0ZXJNYXBPcGVyYXRvciA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKEZpbHRlck1hcE9wZXJhdG9yLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIEZpbHRlck1hcE9wZXJhdG9yKHBhc3NlcywgcHJvamVjdCwgaW5zKSB7XG4gICAgICAgIF9zdXBlci5jYWxsKHRoaXMsIHByb2plY3QsIGlucyk7XG4gICAgICAgIHRoaXMudHlwZSA9ICdmaWx0ZXIrbWFwJztcbiAgICAgICAgdGhpcy5wYXNzZXMgPSBwYXNzZXM7XG4gICAgfVxuICAgIEZpbHRlck1hcE9wZXJhdG9yLnByb3RvdHlwZS5fbiA9IGZ1bmN0aW9uICh2KSB7XG4gICAgICAgIGlmICh0aGlzLnBhc3Nlcyh2KSkge1xuICAgICAgICAgICAgX3N1cGVyLnByb3RvdHlwZS5fbi5jYWxsKHRoaXMsIHYpO1xuICAgICAgICB9XG4gICAgICAgIDtcbiAgICB9O1xuICAgIHJldHVybiBGaWx0ZXJNYXBPcGVyYXRvcjtcbn0oTWFwT3BlcmF0b3IpKTtcbmV4cG9ydHMuRmlsdGVyTWFwT3BlcmF0b3IgPSBGaWx0ZXJNYXBPcGVyYXRvcjtcbnZhciBSZW1lbWJlck9wZXJhdG9yID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBSZW1lbWJlck9wZXJhdG9yKGlucykge1xuICAgICAgICB0aGlzLnR5cGUgPSAncmVtZW1iZXInO1xuICAgICAgICB0aGlzLmlucyA9IGlucztcbiAgICAgICAgdGhpcy5vdXQgPSBOTztcbiAgICB9XG4gICAgUmVtZW1iZXJPcGVyYXRvci5wcm90b3R5cGUuX3N0YXJ0ID0gZnVuY3Rpb24gKG91dCkge1xuICAgICAgICB0aGlzLm91dCA9IG91dDtcbiAgICAgICAgdGhpcy5pbnMuX2FkZChvdXQpO1xuICAgIH07XG4gICAgUmVtZW1iZXJPcGVyYXRvci5wcm90b3R5cGUuX3N0b3AgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuaW5zLl9yZW1vdmUodGhpcy5vdXQpO1xuICAgICAgICB0aGlzLm91dCA9IE5PO1xuICAgIH07XG4gICAgcmV0dXJuIFJlbWVtYmVyT3BlcmF0b3I7XG59KCkpO1xuZXhwb3J0cy5SZW1lbWJlck9wZXJhdG9yID0gUmVtZW1iZXJPcGVyYXRvcjtcbnZhciBSZXBsYWNlRXJyb3JPcGVyYXRvciA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gUmVwbGFjZUVycm9yT3BlcmF0b3IoZm4sIGlucykge1xuICAgICAgICB0aGlzLnR5cGUgPSAncmVwbGFjZUVycm9yJztcbiAgICAgICAgdGhpcy5pbnMgPSBpbnM7XG4gICAgICAgIHRoaXMub3V0ID0gTk87XG4gICAgICAgIHRoaXMuZm4gPSBmbjtcbiAgICB9XG4gICAgUmVwbGFjZUVycm9yT3BlcmF0b3IucHJvdG90eXBlLl9zdGFydCA9IGZ1bmN0aW9uIChvdXQpIHtcbiAgICAgICAgdGhpcy5vdXQgPSBvdXQ7XG4gICAgICAgIHRoaXMuaW5zLl9hZGQodGhpcyk7XG4gICAgfTtcbiAgICBSZXBsYWNlRXJyb3JPcGVyYXRvci5wcm90b3R5cGUuX3N0b3AgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuaW5zLl9yZW1vdmUodGhpcyk7XG4gICAgICAgIHRoaXMub3V0ID0gTk87XG4gICAgfTtcbiAgICBSZXBsYWNlRXJyb3JPcGVyYXRvci5wcm90b3R5cGUuX24gPSBmdW5jdGlvbiAodCkge1xuICAgICAgICB2YXIgdSA9IHRoaXMub3V0O1xuICAgICAgICBpZiAodSA9PT0gTk8pXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIHUuX24odCk7XG4gICAgfTtcbiAgICBSZXBsYWNlRXJyb3JPcGVyYXRvci5wcm90b3R5cGUuX2UgPSBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgIHZhciB1ID0gdGhpcy5vdXQ7XG4gICAgICAgIGlmICh1ID09PSBOTylcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHRoaXMuaW5zLl9yZW1vdmUodGhpcyk7XG4gICAgICAgICAgICAodGhpcy5pbnMgPSB0aGlzLmZuKGVycikpLl9hZGQodGhpcyk7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIHUuX2UoZSk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIFJlcGxhY2VFcnJvck9wZXJhdG9yLnByb3RvdHlwZS5fYyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHUgPSB0aGlzLm91dDtcbiAgICAgICAgaWYgKHUgPT09IE5PKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB1Ll9jKCk7XG4gICAgfTtcbiAgICByZXR1cm4gUmVwbGFjZUVycm9yT3BlcmF0b3I7XG59KCkpO1xuZXhwb3J0cy5SZXBsYWNlRXJyb3JPcGVyYXRvciA9IFJlcGxhY2VFcnJvck9wZXJhdG9yO1xudmFyIFN0YXJ0V2l0aE9wZXJhdG9yID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBTdGFydFdpdGhPcGVyYXRvcihpbnMsIHZhbCkge1xuICAgICAgICB0aGlzLnR5cGUgPSAnc3RhcnRXaXRoJztcbiAgICAgICAgdGhpcy5pbnMgPSBpbnM7XG4gICAgICAgIHRoaXMub3V0ID0gTk87XG4gICAgICAgIHRoaXMudmFsID0gdmFsO1xuICAgIH1cbiAgICBTdGFydFdpdGhPcGVyYXRvci5wcm90b3R5cGUuX3N0YXJ0ID0gZnVuY3Rpb24gKG91dCkge1xuICAgICAgICB0aGlzLm91dCA9IG91dDtcbiAgICAgICAgdGhpcy5vdXQuX24odGhpcy52YWwpO1xuICAgICAgICB0aGlzLmlucy5fYWRkKG91dCk7XG4gICAgfTtcbiAgICBTdGFydFdpdGhPcGVyYXRvci5wcm90b3R5cGUuX3N0b3AgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuaW5zLl9yZW1vdmUodGhpcy5vdXQpO1xuICAgICAgICB0aGlzLm91dCA9IE5PO1xuICAgIH07XG4gICAgcmV0dXJuIFN0YXJ0V2l0aE9wZXJhdG9yO1xufSgpKTtcbmV4cG9ydHMuU3RhcnRXaXRoT3BlcmF0b3IgPSBTdGFydFdpdGhPcGVyYXRvcjtcbnZhciBUYWtlT3BlcmF0b3IgPSAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIFRha2VPcGVyYXRvcihtYXgsIGlucykge1xuICAgICAgICB0aGlzLnR5cGUgPSAndGFrZSc7XG4gICAgICAgIHRoaXMuaW5zID0gaW5zO1xuICAgICAgICB0aGlzLm91dCA9IE5PO1xuICAgICAgICB0aGlzLm1heCA9IG1heDtcbiAgICAgICAgdGhpcy50YWtlbiA9IDA7XG4gICAgfVxuICAgIFRha2VPcGVyYXRvci5wcm90b3R5cGUuX3N0YXJ0ID0gZnVuY3Rpb24gKG91dCkge1xuICAgICAgICB0aGlzLm91dCA9IG91dDtcbiAgICAgICAgdGhpcy50YWtlbiA9IDA7XG4gICAgICAgIGlmICh0aGlzLm1heCA8PSAwKSB7XG4gICAgICAgICAgICBvdXQuX2MoKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuaW5zLl9hZGQodGhpcyk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIFRha2VPcGVyYXRvci5wcm90b3R5cGUuX3N0b3AgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuaW5zLl9yZW1vdmUodGhpcyk7XG4gICAgICAgIHRoaXMub3V0ID0gTk87XG4gICAgfTtcbiAgICBUYWtlT3BlcmF0b3IucHJvdG90eXBlLl9uID0gZnVuY3Rpb24gKHQpIHtcbiAgICAgICAgdmFyIHUgPSB0aGlzLm91dDtcbiAgICAgICAgaWYgKHUgPT09IE5PKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICBpZiAodGhpcy50YWtlbisrIDwgdGhpcy5tYXggLSAxKSB7XG4gICAgICAgICAgICB1Ll9uKHQpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdS5fbih0KTtcbiAgICAgICAgICAgIHUuX2MoKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgVGFrZU9wZXJhdG9yLnByb3RvdHlwZS5fZSA9IGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgdmFyIHUgPSB0aGlzLm91dDtcbiAgICAgICAgaWYgKHUgPT09IE5PKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB1Ll9lKGVycik7XG4gICAgfTtcbiAgICBUYWtlT3BlcmF0b3IucHJvdG90eXBlLl9jID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgdSA9IHRoaXMub3V0O1xuICAgICAgICBpZiAodSA9PT0gTk8pXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIHUuX2MoKTtcbiAgICB9O1xuICAgIHJldHVybiBUYWtlT3BlcmF0b3I7XG59KCkpO1xuZXhwb3J0cy5UYWtlT3BlcmF0b3IgPSBUYWtlT3BlcmF0b3I7XG52YXIgU3RyZWFtID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBTdHJlYW0ocHJvZHVjZXIpIHtcbiAgICAgICAgdGhpcy5fcHJvZCA9IHByb2R1Y2VyIHx8IE5PO1xuICAgICAgICB0aGlzLl9pbHMgPSBbXTtcbiAgICAgICAgdGhpcy5fc3RvcElEID0gTk87XG4gICAgICAgIHRoaXMuX2RsID0gTk87XG4gICAgICAgIHRoaXMuX2QgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5fdGFyZ2V0ID0gTk87XG4gICAgICAgIHRoaXMuX2VyciA9IE5PO1xuICAgIH1cbiAgICBTdHJlYW0ucHJvdG90eXBlLl9uID0gZnVuY3Rpb24gKHQpIHtcbiAgICAgICAgdmFyIGEgPSB0aGlzLl9pbHM7XG4gICAgICAgIHZhciBMID0gYS5sZW5ndGg7XG4gICAgICAgIGlmICh0aGlzLl9kKVxuICAgICAgICAgICAgdGhpcy5fZGwuX24odCk7XG4gICAgICAgIGlmIChMID09IDEpXG4gICAgICAgICAgICBhWzBdLl9uKHQpO1xuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHZhciBiID0gY29weShhKTtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgTDsgaSsrKVxuICAgICAgICAgICAgICAgIGJbaV0uX24odCk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIFN0cmVhbS5wcm90b3R5cGUuX2UgPSBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgIGlmICh0aGlzLl9lcnIgIT09IE5PKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB0aGlzLl9lcnIgPSBlcnI7XG4gICAgICAgIHZhciBhID0gdGhpcy5faWxzO1xuICAgICAgICB2YXIgTCA9IGEubGVuZ3RoO1xuICAgICAgICB0aGlzLl94KCk7XG4gICAgICAgIGlmICh0aGlzLl9kKVxuICAgICAgICAgICAgdGhpcy5fZGwuX2UoZXJyKTtcbiAgICAgICAgaWYgKEwgPT0gMSlcbiAgICAgICAgICAgIGFbMF0uX2UoZXJyKTtcbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB2YXIgYiA9IGNvcHkoYSk7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IEw7IGkrKylcbiAgICAgICAgICAgICAgICBiW2ldLl9lKGVycik7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIFN0cmVhbS5wcm90b3R5cGUuX2MgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBhID0gdGhpcy5faWxzO1xuICAgICAgICB2YXIgTCA9IGEubGVuZ3RoO1xuICAgICAgICB0aGlzLl94KCk7XG4gICAgICAgIGlmICh0aGlzLl9kKVxuICAgICAgICAgICAgdGhpcy5fZGwuX2MoKTtcbiAgICAgICAgaWYgKEwgPT0gMSlcbiAgICAgICAgICAgIGFbMF0uX2MoKTtcbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB2YXIgYiA9IGNvcHkoYSk7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IEw7IGkrKylcbiAgICAgICAgICAgICAgICBiW2ldLl9jKCk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIFN0cmVhbS5wcm90b3R5cGUuX3ggPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICh0aGlzLl9pbHMubGVuZ3RoID09PSAwKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICBpZiAodGhpcy5fcHJvZCAhPT0gTk8pXG4gICAgICAgICAgICB0aGlzLl9wcm9kLl9zdG9wKCk7XG4gICAgICAgIHRoaXMuX2VyciA9IE5PO1xuICAgICAgICB0aGlzLl9pbHMgPSBbXTtcbiAgICB9O1xuICAgIFN0cmVhbS5wcm90b3R5cGUuX3N0b3BOb3cgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIC8vIFdBUk5JTkc6IGNvZGUgdGhhdCBjYWxscyB0aGlzIG1ldGhvZCBzaG91bGRcbiAgICAgICAgLy8gZmlyc3QgY2hlY2sgaWYgdGhpcy5fcHJvZCBpcyB2YWxpZCAobm90IGBOT2ApXG4gICAgICAgIHRoaXMuX3Byb2QuX3N0b3AoKTtcbiAgICAgICAgdGhpcy5fZXJyID0gTk87XG4gICAgICAgIHRoaXMuX3N0b3BJRCA9IE5PO1xuICAgIH07XG4gICAgU3RyZWFtLnByb3RvdHlwZS5fYWRkID0gZnVuY3Rpb24gKGlsKSB7XG4gICAgICAgIHZhciB0YSA9IHRoaXMuX3RhcmdldDtcbiAgICAgICAgaWYgKHRhICE9PSBOTylcbiAgICAgICAgICAgIHJldHVybiB0YS5fYWRkKGlsKTtcbiAgICAgICAgdmFyIGEgPSB0aGlzLl9pbHM7XG4gICAgICAgIGEucHVzaChpbCk7XG4gICAgICAgIGlmIChhLmxlbmd0aCA+IDEpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIGlmICh0aGlzLl9zdG9wSUQgIT09IE5PKSB7XG4gICAgICAgICAgICBjbGVhclRpbWVvdXQodGhpcy5fc3RvcElEKTtcbiAgICAgICAgICAgIHRoaXMuX3N0b3BJRCA9IE5PO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdmFyIHAgPSB0aGlzLl9wcm9kO1xuICAgICAgICAgICAgaWYgKHAgIT09IE5PKVxuICAgICAgICAgICAgICAgIHAuX3N0YXJ0KHRoaXMpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBTdHJlYW0ucHJvdG90eXBlLl9yZW1vdmUgPSBmdW5jdGlvbiAoaWwpIHtcbiAgICAgICAgdmFyIF90aGlzID0gdGhpcztcbiAgICAgICAgdmFyIHRhID0gdGhpcy5fdGFyZ2V0O1xuICAgICAgICBpZiAodGEgIT09IE5PKVxuICAgICAgICAgICAgcmV0dXJuIHRhLl9yZW1vdmUoaWwpO1xuICAgICAgICB2YXIgYSA9IHRoaXMuX2lscztcbiAgICAgICAgdmFyIGkgPSBhLmluZGV4T2YoaWwpO1xuICAgICAgICBpZiAoaSA+IC0xKSB7XG4gICAgICAgICAgICBhLnNwbGljZShpLCAxKTtcbiAgICAgICAgICAgIGlmICh0aGlzLl9wcm9kICE9PSBOTyAmJiBhLmxlbmd0aCA8PSAwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fZXJyID0gTk87XG4gICAgICAgICAgICAgICAgdGhpcy5fc3RvcElEID0gc2V0VGltZW91dChmdW5jdGlvbiAoKSB7IHJldHVybiBfdGhpcy5fc3RvcE5vdygpOyB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGEubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fcHJ1bmVDeWNsZXMoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG4gICAgLy8gSWYgYWxsIHBhdGhzIHN0ZW1taW5nIGZyb20gYHRoaXNgIHN0cmVhbSBldmVudHVhbGx5IGVuZCBhdCBgdGhpc2BcbiAgICAvLyBzdHJlYW0sIHRoZW4gd2UgcmVtb3ZlIHRoZSBzaW5nbGUgbGlzdGVuZXIgb2YgYHRoaXNgIHN0cmVhbSwgdG9cbiAgICAvLyBmb3JjZSBpdCB0byBlbmQgaXRzIGV4ZWN1dGlvbiBhbmQgZGlzcG9zZSByZXNvdXJjZXMuIFRoaXMgbWV0aG9kXG4gICAgLy8gYXNzdW1lcyBhcyBhIHByZWNvbmRpdGlvbiB0aGF0IHRoaXMuX2lscyBoYXMganVzdCBvbmUgbGlzdGVuZXIuXG4gICAgU3RyZWFtLnByb3RvdHlwZS5fcHJ1bmVDeWNsZXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICh0aGlzLl9oYXNOb1NpbmtzKHRoaXMsIFtdKSkge1xuICAgICAgICAgICAgdGhpcy5fcmVtb3ZlKHRoaXMuX2lsc1swXSk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIC8vIENoZWNrcyB3aGV0aGVyICp0aGVyZSBpcyBubyogcGF0aCBzdGFydGluZyBmcm9tIGB4YCB0aGF0IGxlYWRzIHRvIGFuIGVuZFxuICAgIC8vIGxpc3RlbmVyIChzaW5rKSBpbiB0aGUgc3RyZWFtIGdyYXBoLCBmb2xsb3dpbmcgZWRnZXMgQS0+QiB3aGVyZSBCIGlzIGFcbiAgICAvLyBsaXN0ZW5lciBvZiBBLiBUaGlzIG1lYW5zIHRoZXNlIHBhdGhzIGNvbnN0aXR1dGUgYSBjeWNsZSBzb21laG93LiBJcyBnaXZlblxuICAgIC8vIGEgdHJhY2Ugb2YgYWxsIHZpc2l0ZWQgbm9kZXMgc28gZmFyLlxuICAgIFN0cmVhbS5wcm90b3R5cGUuX2hhc05vU2lua3MgPSBmdW5jdGlvbiAoeCwgdHJhY2UpIHtcbiAgICAgICAgaWYgKHRyYWNlLmluZGV4T2YoeCkgIT09IC0xKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICh4Lm91dCA9PT0gdGhpcykge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoeC5vdXQgJiYgeC5vdXQgIT09IE5PKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5faGFzTm9TaW5rcyh4Lm91dCwgdHJhY2UuY29uY2F0KHgpKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICh4Ll9pbHMpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBOID0geC5faWxzLmxlbmd0aDsgaSA8IE47IGkrKykge1xuICAgICAgICAgICAgICAgIGlmICghdGhpcy5faGFzTm9TaW5rcyh4Ll9pbHNbaV0sIHRyYWNlLmNvbmNhdCh4KSkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBTdHJlYW0ucHJvdG90eXBlLmN0b3IgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzIGluc3RhbmNlb2YgTWVtb3J5U3RyZWFtID8gTWVtb3J5U3RyZWFtIDogU3RyZWFtO1xuICAgIH07XG4gICAgLyoqXG4gICAgICogQWRkcyBhIExpc3RlbmVyIHRvIHRoZSBTdHJlYW0uXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge0xpc3RlbmVyPFQ+fSBsaXN0ZW5lclxuICAgICAqL1xuICAgIFN0cmVhbS5wcm90b3R5cGUuYWRkTGlzdGVuZXIgPSBmdW5jdGlvbiAobGlzdGVuZXIpIHtcbiAgICAgICAgbGlzdGVuZXIuX24gPSBsaXN0ZW5lci5uZXh0IHx8IG5vb3A7XG4gICAgICAgIGxpc3RlbmVyLl9lID0gbGlzdGVuZXIuZXJyb3IgfHwgbm9vcDtcbiAgICAgICAgbGlzdGVuZXIuX2MgPSBsaXN0ZW5lci5jb21wbGV0ZSB8fCBub29wO1xuICAgICAgICB0aGlzLl9hZGQobGlzdGVuZXIpO1xuICAgIH07XG4gICAgLyoqXG4gICAgICogUmVtb3ZlcyBhIExpc3RlbmVyIGZyb20gdGhlIFN0cmVhbSwgYXNzdW1pbmcgdGhlIExpc3RlbmVyIHdhcyBhZGRlZCB0byBpdC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7TGlzdGVuZXI8VD59IGxpc3RlbmVyXG4gICAgICovXG4gICAgU3RyZWFtLnByb3RvdHlwZS5yZW1vdmVMaXN0ZW5lciA9IGZ1bmN0aW9uIChsaXN0ZW5lcikge1xuICAgICAgICB0aGlzLl9yZW1vdmUobGlzdGVuZXIpO1xuICAgIH07XG4gICAgLyoqXG4gICAgICogQWRkcyBhIExpc3RlbmVyIHRvIHRoZSBTdHJlYW0gcmV0dXJuaW5nIGEgU3Vic2NyaXB0aW9uIHRvIHJlbW92ZSB0aGF0XG4gICAgICogbGlzdGVuZXIuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge0xpc3RlbmVyfSBsaXN0ZW5lclxuICAgICAqIEByZXR1cm5zIHtTdWJzY3JpcHRpb259XG4gICAgICovXG4gICAgU3RyZWFtLnByb3RvdHlwZS5zdWJzY3JpYmUgPSBmdW5jdGlvbiAobGlzdGVuZXIpIHtcbiAgICAgICAgdGhpcy5hZGRMaXN0ZW5lcihsaXN0ZW5lcik7XG4gICAgICAgIHJldHVybiBuZXcgU3Vic2NyaXB0aW9uKHRoaXMsIGxpc3RlbmVyKTtcbiAgICB9O1xuICAgIC8qKlxuICAgICAqIEFkZCBpbnRlcm9wIGJldHdlZW4gbW9zdC5qcyBhbmQgUnhKUyA1XG4gICAgICpcbiAgICAgKiBAcmV0dXJucyB7U3RyZWFtfVxuICAgICAqL1xuICAgIFN0cmVhbS5wcm90b3R5cGVbc3ltYm9sX29ic2VydmFibGVfMS5kZWZhdWx0XSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGEgbmV3IFN0cmVhbSBnaXZlbiBhIFByb2R1Y2VyLlxuICAgICAqXG4gICAgICogQGZhY3RvcnkgdHJ1ZVxuICAgICAqIEBwYXJhbSB7UHJvZHVjZXJ9IHByb2R1Y2VyIEFuIG9wdGlvbmFsIFByb2R1Y2VyIHRoYXQgZGljdGF0ZXMgaG93IHRvXG4gICAgICogc3RhcnQsIGdlbmVyYXRlIGV2ZW50cywgYW5kIHN0b3AgdGhlIFN0cmVhbS5cbiAgICAgKiBAcmV0dXJuIHtTdHJlYW19XG4gICAgICovXG4gICAgU3RyZWFtLmNyZWF0ZSA9IGZ1bmN0aW9uIChwcm9kdWNlcikge1xuICAgICAgICBpZiAocHJvZHVjZXIpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgcHJvZHVjZXIuc3RhcnQgIT09ICdmdW5jdGlvbidcbiAgICAgICAgICAgICAgICB8fCB0eXBlb2YgcHJvZHVjZXIuc3RvcCAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcigncHJvZHVjZXIgcmVxdWlyZXMgYm90aCBzdGFydCBhbmQgc3RvcCBmdW5jdGlvbnMnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGludGVybmFsaXplUHJvZHVjZXIocHJvZHVjZXIpOyAvLyBtdXRhdGVzIHRoZSBpbnB1dFxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZXcgU3RyZWFtKHByb2R1Y2VyKTtcbiAgICB9O1xuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYSBuZXcgTWVtb3J5U3RyZWFtIGdpdmVuIGEgUHJvZHVjZXIuXG4gICAgICpcbiAgICAgKiBAZmFjdG9yeSB0cnVlXG4gICAgICogQHBhcmFtIHtQcm9kdWNlcn0gcHJvZHVjZXIgQW4gb3B0aW9uYWwgUHJvZHVjZXIgdGhhdCBkaWN0YXRlcyBob3cgdG9cbiAgICAgKiBzdGFydCwgZ2VuZXJhdGUgZXZlbnRzLCBhbmQgc3RvcCB0aGUgU3RyZWFtLlxuICAgICAqIEByZXR1cm4ge01lbW9yeVN0cmVhbX1cbiAgICAgKi9cbiAgICBTdHJlYW0uY3JlYXRlV2l0aE1lbW9yeSA9IGZ1bmN0aW9uIChwcm9kdWNlcikge1xuICAgICAgICBpZiAocHJvZHVjZXIpIHtcbiAgICAgICAgICAgIGludGVybmFsaXplUHJvZHVjZXIocHJvZHVjZXIpOyAvLyBtdXRhdGVzIHRoZSBpbnB1dFxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZXcgTWVtb3J5U3RyZWFtKHByb2R1Y2VyKTtcbiAgICB9O1xuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYSBTdHJlYW0gdGhhdCBkb2VzIG5vdGhpbmcgd2hlbiBzdGFydGVkLiBJdCBuZXZlciBlbWl0cyBhbnkgZXZlbnQuXG4gICAgICpcbiAgICAgKiBNYXJibGUgZGlhZ3JhbTpcbiAgICAgKlxuICAgICAqIGBgYHRleHRcbiAgICAgKiAgICAgICAgICBuZXZlclxuICAgICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICogYGBgXG4gICAgICpcbiAgICAgKiBAZmFjdG9yeSB0cnVlXG4gICAgICogQHJldHVybiB7U3RyZWFtfVxuICAgICAqL1xuICAgIFN0cmVhbS5uZXZlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBTdHJlYW0oeyBfc3RhcnQ6IG5vb3AsIF9zdG9wOiBub29wIH0pO1xuICAgIH07XG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhIFN0cmVhbSB0aGF0IGltbWVkaWF0ZWx5IGVtaXRzIHRoZSBcImNvbXBsZXRlXCIgbm90aWZpY2F0aW9uIHdoZW5cbiAgICAgKiBzdGFydGVkLCBhbmQgdGhhdCdzIGl0LlxuICAgICAqXG4gICAgICogTWFyYmxlIGRpYWdyYW06XG4gICAgICpcbiAgICAgKiBgYGB0ZXh0XG4gICAgICogZW1wdHlcbiAgICAgKiAtfFxuICAgICAqIGBgYFxuICAgICAqXG4gICAgICogQGZhY3RvcnkgdHJ1ZVxuICAgICAqIEByZXR1cm4ge1N0cmVhbX1cbiAgICAgKi9cbiAgICBTdHJlYW0uZW1wdHkgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBuZXcgU3RyZWFtKHtcbiAgICAgICAgICAgIF9zdGFydDogZnVuY3Rpb24gKGlsKSB7IGlsLl9jKCk7IH0sXG4gICAgICAgICAgICBfc3RvcDogbm9vcCxcbiAgICAgICAgfSk7XG4gICAgfTtcbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGEgU3RyZWFtIHRoYXQgaW1tZWRpYXRlbHkgZW1pdHMgYW4gXCJlcnJvclwiIG5vdGlmaWNhdGlvbiB3aXRoIHRoZVxuICAgICAqIHZhbHVlIHlvdSBwYXNzZWQgYXMgdGhlIGBlcnJvcmAgYXJndW1lbnQgd2hlbiB0aGUgc3RyZWFtIHN0YXJ0cywgYW5kIHRoYXQnc1xuICAgICAqIGl0LlxuICAgICAqXG4gICAgICogTWFyYmxlIGRpYWdyYW06XG4gICAgICpcbiAgICAgKiBgYGB0ZXh0XG4gICAgICogdGhyb3coWClcbiAgICAgKiAtWFxuICAgICAqIGBgYFxuICAgICAqXG4gICAgICogQGZhY3RvcnkgdHJ1ZVxuICAgICAqIEBwYXJhbSBlcnJvciBUaGUgZXJyb3IgZXZlbnQgdG8gZW1pdCBvbiB0aGUgY3JlYXRlZCBzdHJlYW0uXG4gICAgICogQHJldHVybiB7U3RyZWFtfVxuICAgICAqL1xuICAgIFN0cmVhbS50aHJvdyA9IGZ1bmN0aW9uIChlcnJvcikge1xuICAgICAgICByZXR1cm4gbmV3IFN0cmVhbSh7XG4gICAgICAgICAgICBfc3RhcnQ6IGZ1bmN0aW9uIChpbCkgeyBpbC5fZShlcnJvcik7IH0sXG4gICAgICAgICAgICBfc3RvcDogbm9vcCxcbiAgICAgICAgfSk7XG4gICAgfTtcbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGEgc3RyZWFtIGZyb20gYW4gQXJyYXksIFByb21pc2UsIG9yIGFuIE9ic2VydmFibGUuXG4gICAgICpcbiAgICAgKiBAZmFjdG9yeSB0cnVlXG4gICAgICogQHBhcmFtIHtBcnJheXxQcm9taXNlfE9ic2VydmFibGV9IGlucHV0IFRoZSBpbnB1dCB0byBtYWtlIGEgc3RyZWFtIGZyb20uXG4gICAgICogQHJldHVybiB7U3RyZWFtfVxuICAgICAqL1xuICAgIFN0cmVhbS5mcm9tID0gZnVuY3Rpb24gKGlucHV0KSB7XG4gICAgICAgIGlmICh0eXBlb2YgaW5wdXRbc3ltYm9sX29ic2VydmFibGVfMS5kZWZhdWx0XSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgcmV0dXJuIFN0cmVhbS5mcm9tT2JzZXJ2YWJsZShpbnB1dCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAodHlwZW9mIGlucHV0LnRoZW4gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIHJldHVybiBTdHJlYW0uZnJvbVByb21pc2UoaW5wdXQpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKEFycmF5LmlzQXJyYXkoaW5wdXQpKSB7XG4gICAgICAgICAgICByZXR1cm4gU3RyZWFtLmZyb21BcnJheShpbnB1dCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlR5cGUgb2YgaW5wdXQgdG8gZnJvbSgpIG11c3QgYmUgYW4gQXJyYXksIFByb21pc2UsIG9yIE9ic2VydmFibGVcIik7XG4gICAgfTtcbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGEgU3RyZWFtIHRoYXQgaW1tZWRpYXRlbHkgZW1pdHMgdGhlIGFyZ3VtZW50cyB0aGF0IHlvdSBnaXZlIHRvXG4gICAgICogKm9mKiwgdGhlbiBjb21wbGV0ZXMuXG4gICAgICpcbiAgICAgKiBNYXJibGUgZGlhZ3JhbTpcbiAgICAgKlxuICAgICAqIGBgYHRleHRcbiAgICAgKiBvZigxLDIsMylcbiAgICAgKiAxMjN8XG4gICAgICogYGBgXG4gICAgICpcbiAgICAgKiBAZmFjdG9yeSB0cnVlXG4gICAgICogQHBhcmFtIGEgVGhlIGZpcnN0IHZhbHVlIHlvdSB3YW50IHRvIGVtaXQgYXMgYW4gZXZlbnQgb24gdGhlIHN0cmVhbS5cbiAgICAgKiBAcGFyYW0gYiBUaGUgc2Vjb25kIHZhbHVlIHlvdSB3YW50IHRvIGVtaXQgYXMgYW4gZXZlbnQgb24gdGhlIHN0cmVhbS4gT25lXG4gICAgICogb3IgbW9yZSBvZiB0aGVzZSB2YWx1ZXMgbWF5IGJlIGdpdmVuIGFzIGFyZ3VtZW50cy5cbiAgICAgKiBAcmV0dXJuIHtTdHJlYW19XG4gICAgICovXG4gICAgU3RyZWFtLm9mID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgaXRlbXMgPSBbXTtcbiAgICAgICAgZm9yICh2YXIgX2kgPSAwOyBfaSA8IGFyZ3VtZW50cy5sZW5ndGg7IF9pKyspIHtcbiAgICAgICAgICAgIGl0ZW1zW19pIC0gMF0gPSBhcmd1bWVudHNbX2ldO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBTdHJlYW0uZnJvbUFycmF5KGl0ZW1zKTtcbiAgICB9O1xuICAgIC8qKlxuICAgICAqIENvbnZlcnRzIGFuIGFycmF5IHRvIGEgc3RyZWFtLiBUaGUgcmV0dXJuZWQgc3RyZWFtIHdpbGwgZW1pdCBzeW5jaHJvbm91c2x5XG4gICAgICogYWxsIHRoZSBpdGVtcyBpbiB0aGUgYXJyYXksIGFuZCB0aGVuIGNvbXBsZXRlLlxuICAgICAqXG4gICAgICogTWFyYmxlIGRpYWdyYW06XG4gICAgICpcbiAgICAgKiBgYGB0ZXh0XG4gICAgICogZnJvbUFycmF5KFsxLDIsM10pXG4gICAgICogMTIzfFxuICAgICAqIGBgYFxuICAgICAqXG4gICAgICogQGZhY3RvcnkgdHJ1ZVxuICAgICAqIEBwYXJhbSB7QXJyYXl9IGFycmF5IFRoZSBhcnJheSB0byBiZSBjb252ZXJ0ZWQgYXMgYSBzdHJlYW0uXG4gICAgICogQHJldHVybiB7U3RyZWFtfVxuICAgICAqL1xuICAgIFN0cmVhbS5mcm9tQXJyYXkgPSBmdW5jdGlvbiAoYXJyYXkpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBTdHJlYW0obmV3IEZyb21BcnJheVByb2R1Y2VyKGFycmF5KSk7XG4gICAgfTtcbiAgICAvKipcbiAgICAgKiBDb252ZXJ0cyBhIHByb21pc2UgdG8gYSBzdHJlYW0uIFRoZSByZXR1cm5lZCBzdHJlYW0gd2lsbCBlbWl0IHRoZSByZXNvbHZlZFxuICAgICAqIHZhbHVlIG9mIHRoZSBwcm9taXNlLCBhbmQgdGhlbiBjb21wbGV0ZS4gSG93ZXZlciwgaWYgdGhlIHByb21pc2UgaXNcbiAgICAgKiByZWplY3RlZCwgdGhlIHN0cmVhbSB3aWxsIGVtaXQgdGhlIGNvcnJlc3BvbmRpbmcgZXJyb3IuXG4gICAgICpcbiAgICAgKiBNYXJibGUgZGlhZ3JhbTpcbiAgICAgKlxuICAgICAqIGBgYHRleHRcbiAgICAgKiBmcm9tUHJvbWlzZSggLS0tLTQyIClcbiAgICAgKiAtLS0tLS0tLS0tLS0tLS0tLTQyfFxuICAgICAqIGBgYFxuICAgICAqXG4gICAgICogQGZhY3RvcnkgdHJ1ZVxuICAgICAqIEBwYXJhbSB7UHJvbWlzZX0gcHJvbWlzZSBUaGUgcHJvbWlzZSB0byBiZSBjb252ZXJ0ZWQgYXMgYSBzdHJlYW0uXG4gICAgICogQHJldHVybiB7U3RyZWFtfVxuICAgICAqL1xuICAgIFN0cmVhbS5mcm9tUHJvbWlzZSA9IGZ1bmN0aW9uIChwcm9taXNlKSB7XG4gICAgICAgIHJldHVybiBuZXcgU3RyZWFtKG5ldyBGcm9tUHJvbWlzZVByb2R1Y2VyKHByb21pc2UpKTtcbiAgICB9O1xuICAgIC8qKlxuICAgICAqIENvbnZlcnRzIGFuIE9ic2VydmFibGUgaW50byBhIFN0cmVhbS5cbiAgICAgKlxuICAgICAqIEBmYWN0b3J5IHRydWVcbiAgICAgKiBAcGFyYW0ge2FueX0gb2JzZXJ2YWJsZSBUaGUgb2JzZXJ2YWJsZSB0byBiZSBjb252ZXJ0ZWQgYXMgYSBzdHJlYW0uXG4gICAgICogQHJldHVybiB7U3RyZWFtfVxuICAgICAqL1xuICAgIFN0cmVhbS5mcm9tT2JzZXJ2YWJsZSA9IGZ1bmN0aW9uIChvYnNlcnZhYmxlKSB7XG4gICAgICAgIHJldHVybiBuZXcgU3RyZWFtKG5ldyBPYnNlcnZhYmxlUHJvZHVjZXIob2JzZXJ2YWJsZSkpO1xuICAgIH07XG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhIHN0cmVhbSB0aGF0IHBlcmlvZGljYWxseSBlbWl0cyBpbmNyZW1lbnRhbCBudW1iZXJzLCBldmVyeVxuICAgICAqIGBwZXJpb2RgIG1pbGxpc2Vjb25kcy5cbiAgICAgKlxuICAgICAqIE1hcmJsZSBkaWFncmFtOlxuICAgICAqXG4gICAgICogYGBgdGV4dFxuICAgICAqICAgICBwZXJpb2RpYygxMDAwKVxuICAgICAqIC0tLTAtLS0xLS0tMi0tLTMtLS00LS0tLi4uXG4gICAgICogYGBgXG4gICAgICpcbiAgICAgKiBAZmFjdG9yeSB0cnVlXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHBlcmlvZCBUaGUgaW50ZXJ2YWwgaW4gbWlsbGlzZWNvbmRzIHRvIHVzZSBhcyBhIHJhdGUgb2ZcbiAgICAgKiBlbWlzc2lvbi5cbiAgICAgKiBAcmV0dXJuIHtTdHJlYW19XG4gICAgICovXG4gICAgU3RyZWFtLnBlcmlvZGljID0gZnVuY3Rpb24gKHBlcmlvZCkge1xuICAgICAgICByZXR1cm4gbmV3IFN0cmVhbShuZXcgUGVyaW9kaWNQcm9kdWNlcihwZXJpb2QpKTtcbiAgICB9O1xuICAgIFN0cmVhbS5wcm90b3R5cGUuX21hcCA9IGZ1bmN0aW9uIChwcm9qZWN0KSB7XG4gICAgICAgIHZhciBwID0gdGhpcy5fcHJvZDtcbiAgICAgICAgdmFyIGN0b3IgPSB0aGlzLmN0b3IoKTtcbiAgICAgICAgaWYgKHAgaW5zdGFuY2VvZiBGaWx0ZXJPcGVyYXRvcikge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBjdG9yKG5ldyBGaWx0ZXJNYXBPcGVyYXRvcihwLnBhc3NlcywgcHJvamVjdCwgcC5pbnMpKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocCBpbnN0YW5jZW9mIEZpbHRlck1hcE9wZXJhdG9yKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IGN0b3IobmV3IEZpbHRlck1hcE9wZXJhdG9yKHAucGFzc2VzLCBjb21wb3NlMihwcm9qZWN0LCBwLnByb2plY3QpLCBwLmlucykpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChwIGluc3RhbmNlb2YgTWFwT3BlcmF0b3IpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgY3RvcihuZXcgTWFwT3BlcmF0b3IoY29tcG9zZTIocHJvamVjdCwgcC5wcm9qZWN0KSwgcC5pbnMpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbmV3IGN0b3IobmV3IE1hcE9wZXJhdG9yKHByb2plY3QsIHRoaXMpKTtcbiAgICB9O1xuICAgIC8qKlxuICAgICAqIFRyYW5zZm9ybXMgZWFjaCBldmVudCBmcm9tIHRoZSBpbnB1dCBTdHJlYW0gdGhyb3VnaCBhIGBwcm9qZWN0YCBmdW5jdGlvbixcbiAgICAgKiB0byBnZXQgYSBTdHJlYW0gdGhhdCBlbWl0cyB0aG9zZSB0cmFuc2Zvcm1lZCBldmVudHMuXG4gICAgICpcbiAgICAgKiBNYXJibGUgZGlhZ3JhbTpcbiAgICAgKlxuICAgICAqIGBgYHRleHRcbiAgICAgKiAtLTEtLS0zLS01LS0tLS03LS0tLS0tXG4gICAgICogICAgbWFwKGkgPT4gaSAqIDEwKVxuICAgICAqIC0tMTAtLTMwLTUwLS0tLTcwLS0tLS1cbiAgICAgKiBgYGBcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IHByb2plY3QgQSBmdW5jdGlvbiBvZiB0eXBlIGAodDogVCkgPT4gVWAgdGhhdCB0YWtlcyBldmVudFxuICAgICAqIGB0YCBvZiB0eXBlIGBUYCBmcm9tIHRoZSBpbnB1dCBTdHJlYW0gYW5kIHByb2R1Y2VzIGFuIGV2ZW50IG9mIHR5cGUgYFVgLCB0b1xuICAgICAqIGJlIGVtaXR0ZWQgb24gdGhlIG91dHB1dCBTdHJlYW0uXG4gICAgICogQHJldHVybiB7U3RyZWFtfVxuICAgICAqL1xuICAgIFN0cmVhbS5wcm90b3R5cGUubWFwID0gZnVuY3Rpb24gKHByb2plY3QpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX21hcChwcm9qZWN0KTtcbiAgICB9O1xuICAgIC8qKlxuICAgICAqIEl0J3MgbGlrZSBgbWFwYCwgYnV0IHRyYW5zZm9ybXMgZWFjaCBpbnB1dCBldmVudCB0byBhbHdheXMgdGhlIHNhbWVcbiAgICAgKiBjb25zdGFudCB2YWx1ZSBvbiB0aGUgb3V0cHV0IFN0cmVhbS5cbiAgICAgKlxuICAgICAqIE1hcmJsZSBkaWFncmFtOlxuICAgICAqXG4gICAgICogYGBgdGV4dFxuICAgICAqIC0tMS0tLTMtLTUtLS0tLTctLS0tLVxuICAgICAqICAgICAgIG1hcFRvKDEwKVxuICAgICAqIC0tMTAtLTEwLTEwLS0tLTEwLS0tLVxuICAgICAqIGBgYFxuICAgICAqXG4gICAgICogQHBhcmFtIHByb2plY3RlZFZhbHVlIEEgdmFsdWUgdG8gZW1pdCBvbiB0aGUgb3V0cHV0IFN0cmVhbSB3aGVuZXZlciB0aGVcbiAgICAgKiBpbnB1dCBTdHJlYW0gZW1pdHMgYW55IHZhbHVlLlxuICAgICAqIEByZXR1cm4ge1N0cmVhbX1cbiAgICAgKi9cbiAgICBTdHJlYW0ucHJvdG90eXBlLm1hcFRvID0gZnVuY3Rpb24gKHByb2plY3RlZFZhbHVlKSB7XG4gICAgICAgIHZhciBzID0gdGhpcy5tYXAoZnVuY3Rpb24gKCkgeyByZXR1cm4gcHJvamVjdGVkVmFsdWU7IH0pO1xuICAgICAgICB2YXIgb3AgPSBzLl9wcm9kO1xuICAgICAgICBvcC50eXBlID0gb3AudHlwZS5yZXBsYWNlKCdtYXAnLCAnbWFwVG8nKTtcbiAgICAgICAgcmV0dXJuIHM7XG4gICAgfTtcbiAgICAvKipcbiAgICAgKiBPbmx5IGFsbG93cyBldmVudHMgdGhhdCBwYXNzIHRoZSB0ZXN0IGdpdmVuIGJ5IHRoZSBgcGFzc2VzYCBhcmd1bWVudC5cbiAgICAgKlxuICAgICAqIEVhY2ggZXZlbnQgZnJvbSB0aGUgaW5wdXQgc3RyZWFtIGlzIGdpdmVuIHRvIHRoZSBgcGFzc2VzYCBmdW5jdGlvbi4gSWYgdGhlXG4gICAgICogZnVuY3Rpb24gcmV0dXJucyBgdHJ1ZWAsIHRoZSBldmVudCBpcyBmb3J3YXJkZWQgdG8gdGhlIG91dHB1dCBzdHJlYW0sXG4gICAgICogb3RoZXJ3aXNlIGl0IGlzIGlnbm9yZWQgYW5kIG5vdCBmb3J3YXJkZWQuXG4gICAgICpcbiAgICAgKiBNYXJibGUgZGlhZ3JhbTpcbiAgICAgKlxuICAgICAqIGBgYHRleHRcbiAgICAgKiAtLTEtLS0yLS0zLS0tLS00LS0tLS01LS0tNi0tNy04LS1cbiAgICAgKiAgICAgZmlsdGVyKGkgPT4gaSAlIDIgPT09IDApXG4gICAgICogLS0tLS0tMi0tLS0tLS0tNC0tLS0tLS0tLTYtLS0tOC0tXG4gICAgICogYGBgXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBwYXNzZXMgQSBmdW5jdGlvbiBvZiB0eXBlIGAodDogVCkgKz4gYm9vbGVhbmAgdGhhdCB0YWtlc1xuICAgICAqIGFuIGV2ZW50IGZyb20gdGhlIGlucHV0IHN0cmVhbSBhbmQgY2hlY2tzIGlmIGl0IHBhc3NlcywgYnkgcmV0dXJuaW5nIGFcbiAgICAgKiBib29sZWFuLlxuICAgICAqIEByZXR1cm4ge1N0cmVhbX1cbiAgICAgKi9cbiAgICBTdHJlYW0ucHJvdG90eXBlLmZpbHRlciA9IGZ1bmN0aW9uIChwYXNzZXMpIHtcbiAgICAgICAgdmFyIHAgPSB0aGlzLl9wcm9kO1xuICAgICAgICBpZiAocCBpbnN0YW5jZW9mIEZpbHRlck9wZXJhdG9yKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IFN0cmVhbShuZXcgRmlsdGVyT3BlcmF0b3IoYW5kKHAucGFzc2VzLCBwYXNzZXMpLCBwLmlucykpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZXcgU3RyZWFtKG5ldyBGaWx0ZXJPcGVyYXRvcihwYXNzZXMsIHRoaXMpKTtcbiAgICB9O1xuICAgIC8qKlxuICAgICAqIExldHMgdGhlIGZpcnN0IGBhbW91bnRgIG1hbnkgZXZlbnRzIGZyb20gdGhlIGlucHV0IHN0cmVhbSBwYXNzIHRvIHRoZVxuICAgICAqIG91dHB1dCBzdHJlYW0sIHRoZW4gbWFrZXMgdGhlIG91dHB1dCBzdHJlYW0gY29tcGxldGUuXG4gICAgICpcbiAgICAgKiBNYXJibGUgZGlhZ3JhbTpcbiAgICAgKlxuICAgICAqIGBgYHRleHRcbiAgICAgKiAtLWEtLS1iLS1jLS0tLWQtLS1lLS1cbiAgICAgKiAgICB0YWtlKDMpXG4gICAgICogLS1hLS0tYi0tY3xcbiAgICAgKiBgYGBcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBhbW91bnQgSG93IG1hbnkgZXZlbnRzIHRvIGFsbG93IGZyb20gdGhlIGlucHV0IHN0cmVhbVxuICAgICAqIGJlZm9yZSBjb21wbGV0aW5nIHRoZSBvdXRwdXQgc3RyZWFtLlxuICAgICAqIEByZXR1cm4ge1N0cmVhbX1cbiAgICAgKi9cbiAgICBTdHJlYW0ucHJvdG90eXBlLnRha2UgPSBmdW5jdGlvbiAoYW1vdW50KSB7XG4gICAgICAgIHJldHVybiBuZXcgKHRoaXMuY3RvcigpKShuZXcgVGFrZU9wZXJhdG9yKGFtb3VudCwgdGhpcykpO1xuICAgIH07XG4gICAgLyoqXG4gICAgICogSWdub3JlcyB0aGUgZmlyc3QgYGFtb3VudGAgbWFueSBldmVudHMgZnJvbSB0aGUgaW5wdXQgc3RyZWFtLCBhbmQgdGhlblxuICAgICAqIGFmdGVyIHRoYXQgc3RhcnRzIGZvcndhcmRpbmcgZXZlbnRzIGZyb20gdGhlIGlucHV0IHN0cmVhbSB0byB0aGUgb3V0cHV0XG4gICAgICogc3RyZWFtLlxuICAgICAqXG4gICAgICogTWFyYmxlIGRpYWdyYW06XG4gICAgICpcbiAgICAgKiBgYGB0ZXh0XG4gICAgICogLS1hLS0tYi0tYy0tLS1kLS0tZS0tXG4gICAgICogICAgICAgZHJvcCgzKVxuICAgICAqIC0tLS0tLS0tLS0tLS0tZC0tLWUtLVxuICAgICAqIGBgYFxuICAgICAqXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGFtb3VudCBIb3cgbWFueSBldmVudHMgdG8gaWdub3JlIGZyb20gdGhlIGlucHV0IHN0cmVhbVxuICAgICAqIGJlZm9yZSBmb3J3YXJkaW5nIGFsbCBldmVudHMgZnJvbSB0aGUgaW5wdXQgc3RyZWFtIHRvIHRoZSBvdXRwdXQgc3RyZWFtLlxuICAgICAqIEByZXR1cm4ge1N0cmVhbX1cbiAgICAgKi9cbiAgICBTdHJlYW0ucHJvdG90eXBlLmRyb3AgPSBmdW5jdGlvbiAoYW1vdW50KSB7XG4gICAgICAgIHJldHVybiBuZXcgU3RyZWFtKG5ldyBEcm9wT3BlcmF0b3IoYW1vdW50LCB0aGlzKSk7XG4gICAgfTtcbiAgICAvKipcbiAgICAgKiBXaGVuIHRoZSBpbnB1dCBzdHJlYW0gY29tcGxldGVzLCB0aGUgb3V0cHV0IHN0cmVhbSB3aWxsIGVtaXQgdGhlIGxhc3QgZXZlbnRcbiAgICAgKiBlbWl0dGVkIGJ5IHRoZSBpbnB1dCBzdHJlYW0sIGFuZCB0aGVuIHdpbGwgYWxzbyBjb21wbGV0ZS5cbiAgICAgKlxuICAgICAqIE1hcmJsZSBkaWFncmFtOlxuICAgICAqXG4gICAgICogYGBgdGV4dFxuICAgICAqIC0tYS0tLWItLWMtLWQtLS0tfFxuICAgICAqICAgICAgIGxhc3QoKVxuICAgICAqIC0tLS0tLS0tLS0tLS0tLS0tZHxcbiAgICAgKiBgYGBcbiAgICAgKlxuICAgICAqIEByZXR1cm4ge1N0cmVhbX1cbiAgICAgKi9cbiAgICBTdHJlYW0ucHJvdG90eXBlLmxhc3QgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBuZXcgU3RyZWFtKG5ldyBMYXN0T3BlcmF0b3IodGhpcykpO1xuICAgIH07XG4gICAgLyoqXG4gICAgICogUHJlcGVuZHMgdGhlIGdpdmVuIGBpbml0aWFsYCB2YWx1ZSB0byB0aGUgc2VxdWVuY2Ugb2YgZXZlbnRzIGVtaXR0ZWQgYnkgdGhlXG4gICAgICogaW5wdXQgc3RyZWFtLiBUaGUgcmV0dXJuZWQgc3RyZWFtIGlzIGEgTWVtb3J5U3RyZWFtLCB3aGljaCBtZWFucyBpdCBpc1xuICAgICAqIGFscmVhZHkgYHJlbWVtYmVyKClgJ2QuXG4gICAgICpcbiAgICAgKiBNYXJibGUgZGlhZ3JhbTpcbiAgICAgKlxuICAgICAqIGBgYHRleHRcbiAgICAgKiAtLS0xLS0tMi0tLS0tMy0tLVxuICAgICAqICAgc3RhcnRXaXRoKDApXG4gICAgICogMC0tMS0tLTItLS0tLTMtLS1cbiAgICAgKiBgYGBcbiAgICAgKlxuICAgICAqIEBwYXJhbSBpbml0aWFsIFRoZSB2YWx1ZSBvciBldmVudCB0byBwcmVwZW5kLlxuICAgICAqIEByZXR1cm4ge01lbW9yeVN0cmVhbX1cbiAgICAgKi9cbiAgICBTdHJlYW0ucHJvdG90eXBlLnN0YXJ0V2l0aCA9IGZ1bmN0aW9uIChpbml0aWFsKSB7XG4gICAgICAgIHJldHVybiBuZXcgTWVtb3J5U3RyZWFtKG5ldyBTdGFydFdpdGhPcGVyYXRvcih0aGlzLCBpbml0aWFsKSk7XG4gICAgfTtcbiAgICAvKipcbiAgICAgKiBVc2VzIGFub3RoZXIgc3RyZWFtIHRvIGRldGVybWluZSB3aGVuIHRvIGNvbXBsZXRlIHRoZSBjdXJyZW50IHN0cmVhbS5cbiAgICAgKlxuICAgICAqIFdoZW4gdGhlIGdpdmVuIGBvdGhlcmAgc3RyZWFtIGVtaXRzIGFuIGV2ZW50IG9yIGNvbXBsZXRlcywgdGhlIG91dHB1dFxuICAgICAqIHN0cmVhbSB3aWxsIGNvbXBsZXRlLiBCZWZvcmUgdGhhdCBoYXBwZW5zLCB0aGUgb3V0cHV0IHN0cmVhbSB3aWxsIGJlaGF2ZXNcbiAgICAgKiBsaWtlIHRoZSBpbnB1dCBzdHJlYW0uXG4gICAgICpcbiAgICAgKiBNYXJibGUgZGlhZ3JhbTpcbiAgICAgKlxuICAgICAqIGBgYHRleHRcbiAgICAgKiAtLS0xLS0tMi0tLS0tMy0tNC0tLS01LS0tLTYtLS1cbiAgICAgKiAgIGVuZFdoZW4oIC0tLS0tLS0tYS0tYi0tfCApXG4gICAgICogLS0tMS0tLTItLS0tLTMtLTQtLXxcbiAgICAgKiBgYGBcbiAgICAgKlxuICAgICAqIEBwYXJhbSBvdGhlciBTb21lIG90aGVyIHN0cmVhbSB0aGF0IGlzIHVzZWQgdG8ga25vdyB3aGVuIHNob3VsZCB0aGUgb3V0cHV0XG4gICAgICogc3RyZWFtIG9mIHRoaXMgb3BlcmF0b3IgY29tcGxldGUuXG4gICAgICogQHJldHVybiB7U3RyZWFtfVxuICAgICAqL1xuICAgIFN0cmVhbS5wcm90b3R5cGUuZW5kV2hlbiA9IGZ1bmN0aW9uIChvdGhlcikge1xuICAgICAgICByZXR1cm4gbmV3ICh0aGlzLmN0b3IoKSkobmV3IEVuZFdoZW5PcGVyYXRvcihvdGhlciwgdGhpcykpO1xuICAgIH07XG4gICAgLyoqXG4gICAgICogXCJGb2xkc1wiIHRoZSBzdHJlYW0gb250byBpdHNlbGYuXG4gICAgICpcbiAgICAgKiBDb21iaW5lcyBldmVudHMgZnJvbSB0aGUgcGFzdCB0aHJvdWdob3V0XG4gICAgICogdGhlIGVudGlyZSBleGVjdXRpb24gb2YgdGhlIGlucHV0IHN0cmVhbSwgYWxsb3dpbmcgeW91IHRvIGFjY3VtdWxhdGUgdGhlbVxuICAgICAqIHRvZ2V0aGVyLiBJdCdzIGVzc2VudGlhbGx5IGxpa2UgYEFycmF5LnByb3RvdHlwZS5yZWR1Y2VgLiBUaGUgcmV0dXJuZWRcbiAgICAgKiBzdHJlYW0gaXMgYSBNZW1vcnlTdHJlYW0sIHdoaWNoIG1lYW5zIGl0IGlzIGFscmVhZHkgYHJlbWVtYmVyKClgJ2QuXG4gICAgICpcbiAgICAgKiBUaGUgb3V0cHV0IHN0cmVhbSBzdGFydHMgYnkgZW1pdHRpbmcgdGhlIGBzZWVkYCB3aGljaCB5b3UgZ2l2ZSBhcyBhcmd1bWVudC5cbiAgICAgKiBUaGVuLCB3aGVuIGFuIGV2ZW50IGhhcHBlbnMgb24gdGhlIGlucHV0IHN0cmVhbSwgaXQgaXMgY29tYmluZWQgd2l0aCB0aGF0XG4gICAgICogc2VlZCB2YWx1ZSB0aHJvdWdoIHRoZSBgYWNjdW11bGF0ZWAgZnVuY3Rpb24sIGFuZCB0aGUgb3V0cHV0IHZhbHVlIGlzXG4gICAgICogZW1pdHRlZCBvbiB0aGUgb3V0cHV0IHN0cmVhbS4gYGZvbGRgIHJlbWVtYmVycyB0aGF0IG91dHB1dCB2YWx1ZSBhcyBgYWNjYFxuICAgICAqIChcImFjY3VtdWxhdG9yXCIpLCBhbmQgdGhlbiB3aGVuIGEgbmV3IGlucHV0IGV2ZW50IGB0YCBoYXBwZW5zLCBgYWNjYCB3aWxsIGJlXG4gICAgICogY29tYmluZWQgd2l0aCB0aGF0IHRvIHByb2R1Y2UgdGhlIG5ldyBgYWNjYCBhbmQgc28gZm9ydGguXG4gICAgICpcbiAgICAgKiBNYXJibGUgZGlhZ3JhbTpcbiAgICAgKlxuICAgICAqIGBgYHRleHRcbiAgICAgKiAtLS0tLS0xLS0tLS0xLS0yLS0tLTEtLS0tMS0tLS0tLVxuICAgICAqICAgZm9sZCgoYWNjLCB4KSA9PiBhY2MgKyB4LCAzKVxuICAgICAqIDMtLS0tLTQtLS0tLTUtLTctLS0tOC0tLS05LS0tLS0tXG4gICAgICogYGBgXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBhY2N1bXVsYXRlIEEgZnVuY3Rpb24gb2YgdHlwZSBgKGFjYzogUiwgdDogVCkgPT4gUmAgdGhhdFxuICAgICAqIHRha2VzIHRoZSBwcmV2aW91cyBhY2N1bXVsYXRlZCB2YWx1ZSBgYWNjYCBhbmQgdGhlIGluY29taW5nIGV2ZW50IGZyb20gdGhlXG4gICAgICogaW5wdXQgc3RyZWFtIGFuZCBwcm9kdWNlcyB0aGUgbmV3IGFjY3VtdWxhdGVkIHZhbHVlLlxuICAgICAqIEBwYXJhbSBzZWVkIFRoZSBpbml0aWFsIGFjY3VtdWxhdGVkIHZhbHVlLCBvZiB0eXBlIGBSYC5cbiAgICAgKiBAcmV0dXJuIHtNZW1vcnlTdHJlYW19XG4gICAgICovXG4gICAgU3RyZWFtLnByb3RvdHlwZS5mb2xkID0gZnVuY3Rpb24gKGFjY3VtdWxhdGUsIHNlZWQpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBNZW1vcnlTdHJlYW0obmV3IEZvbGRPcGVyYXRvcihhY2N1bXVsYXRlLCBzZWVkLCB0aGlzKSk7XG4gICAgfTtcbiAgICAvKipcbiAgICAgKiBSZXBsYWNlcyBhbiBlcnJvciB3aXRoIGFub3RoZXIgc3RyZWFtLlxuICAgICAqXG4gICAgICogV2hlbiAoYW5kIGlmKSBhbiBlcnJvciBoYXBwZW5zIG9uIHRoZSBpbnB1dCBzdHJlYW0sIGluc3RlYWQgb2YgZm9yd2FyZGluZ1xuICAgICAqIHRoYXQgZXJyb3IgdG8gdGhlIG91dHB1dCBzdHJlYW0sICpyZXBsYWNlRXJyb3IqIHdpbGwgY2FsbCB0aGUgYHJlcGxhY2VgXG4gICAgICogZnVuY3Rpb24gd2hpY2ggcmV0dXJucyB0aGUgc3RyZWFtIHRoYXQgdGhlIG91dHB1dCBzdHJlYW0gd2lsbCByZXBsaWNhdGUuXG4gICAgICogQW5kLCBpbiBjYXNlIHRoYXQgbmV3IHN0cmVhbSBhbHNvIGVtaXRzIGFuIGVycm9yLCBgcmVwbGFjZWAgd2lsbCBiZSBjYWxsZWRcbiAgICAgKiBhZ2FpbiB0byBnZXQgYW5vdGhlciBzdHJlYW0gdG8gc3RhcnQgcmVwbGljYXRpbmcuXG4gICAgICpcbiAgICAgKiBNYXJibGUgZGlhZ3JhbTpcbiAgICAgKlxuICAgICAqIGBgYHRleHRcbiAgICAgKiAtLTEtLS0yLS0tLS0zLS00LS0tLS1YXG4gICAgICogICByZXBsYWNlRXJyb3IoICgpID0+IC0tMTAtLXwgKVxuICAgICAqIC0tMS0tLTItLS0tLTMtLTQtLS0tLS0tLTEwLS18XG4gICAgICogYGBgXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSByZXBsYWNlIEEgZnVuY3Rpb24gb2YgdHlwZSBgKGVycikgPT4gU3RyZWFtYCB0aGF0IHRha2VzXG4gICAgICogdGhlIGVycm9yIHRoYXQgb2NjdXJyZWQgb24gdGhlIGlucHV0IHN0cmVhbSBvciBvbiB0aGUgcHJldmlvdXMgcmVwbGFjZW1lbnRcbiAgICAgKiBzdHJlYW0gYW5kIHJldHVybnMgYSBuZXcgc3RyZWFtLiBUaGUgb3V0cHV0IHN0cmVhbSB3aWxsIGJlaGF2ZSBsaWtlIHRoZVxuICAgICAqIHN0cmVhbSB0aGF0IHRoaXMgZnVuY3Rpb24gcmV0dXJucy5cbiAgICAgKiBAcmV0dXJuIHtTdHJlYW19XG4gICAgICovXG4gICAgU3RyZWFtLnByb3RvdHlwZS5yZXBsYWNlRXJyb3IgPSBmdW5jdGlvbiAocmVwbGFjZSkge1xuICAgICAgICByZXR1cm4gbmV3ICh0aGlzLmN0b3IoKSkobmV3IFJlcGxhY2VFcnJvck9wZXJhdG9yKHJlcGxhY2UsIHRoaXMpKTtcbiAgICB9O1xuICAgIC8qKlxuICAgICAqIEZsYXR0ZW5zIGEgXCJzdHJlYW0gb2Ygc3RyZWFtc1wiLCBoYW5kbGluZyBvbmx5IG9uZSBuZXN0ZWQgc3RyZWFtIGF0IGEgdGltZVxuICAgICAqIChubyBjb25jdXJyZW5jeSkuXG4gICAgICpcbiAgICAgKiBJZiB0aGUgaW5wdXQgc3RyZWFtIGlzIGEgc3RyZWFtIHRoYXQgZW1pdHMgc3RyZWFtcywgdGhlbiB0aGlzIG9wZXJhdG9yIHdpbGxcbiAgICAgKiByZXR1cm4gYW4gb3V0cHV0IHN0cmVhbSB3aGljaCBpcyBhIGZsYXQgc3RyZWFtOiBlbWl0cyByZWd1bGFyIGV2ZW50cy4gVGhlXG4gICAgICogZmxhdHRlbmluZyBoYXBwZW5zIHdpdGhvdXQgY29uY3VycmVuY3kuIEl0IHdvcmtzIGxpa2UgdGhpczogd2hlbiB0aGUgaW5wdXRcbiAgICAgKiBzdHJlYW0gZW1pdHMgYSBuZXN0ZWQgc3RyZWFtLCAqZmxhdHRlbiogd2lsbCBzdGFydCBpbWl0YXRpbmcgdGhhdCBuZXN0ZWRcbiAgICAgKiBvbmUuIEhvd2V2ZXIsIGFzIHNvb24gYXMgdGhlIG5leHQgbmVzdGVkIHN0cmVhbSBpcyBlbWl0dGVkIG9uIHRoZSBpbnB1dFxuICAgICAqIHN0cmVhbSwgKmZsYXR0ZW4qIHdpbGwgZm9yZ2V0IHRoZSBwcmV2aW91cyBuZXN0ZWQgb25lIGl0IHdhcyBpbWl0YXRpbmcsIGFuZFxuICAgICAqIHdpbGwgc3RhcnQgaW1pdGF0aW5nIHRoZSBuZXcgbmVzdGVkIG9uZS5cbiAgICAgKlxuICAgICAqIE1hcmJsZSBkaWFncmFtOlxuICAgICAqXG4gICAgICogYGBgdGV4dFxuICAgICAqIC0tKy0tLS0tLS0tKy0tLS0tLS0tLS0tLS0tLVxuICAgICAqICAgXFwgICAgICAgIFxcXG4gICAgICogICAgXFwgICAgICAgLS0tLTEtLS0tMi0tLTMtLVxuICAgICAqICAgIC0tYS0tYi0tLS1jLS0tLWQtLS0tLS0tLVxuICAgICAqICAgICAgICAgICBmbGF0dGVuXG4gICAgICogLS0tLS1hLS1iLS0tLS0tMS0tLS0yLS0tMy0tXG4gICAgICogYGBgXG4gICAgICpcbiAgICAgKiBAcmV0dXJuIHtTdHJlYW19XG4gICAgICovXG4gICAgU3RyZWFtLnByb3RvdHlwZS5mbGF0dGVuID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgcCA9IHRoaXMuX3Byb2Q7XG4gICAgICAgIHJldHVybiBuZXcgU3RyZWFtKHAgaW5zdGFuY2VvZiBNYXBPcGVyYXRvciAmJiAhKHAgaW5zdGFuY2VvZiBGaWx0ZXJNYXBPcGVyYXRvcikgP1xuICAgICAgICAgICAgbmV3IE1hcEZsYXR0ZW5PcGVyYXRvcihwKSA6XG4gICAgICAgICAgICBuZXcgRmxhdHRlbk9wZXJhdG9yKHRoaXMpKTtcbiAgICB9O1xuICAgIC8qKlxuICAgICAqIFBhc3NlcyB0aGUgaW5wdXQgc3RyZWFtIHRvIGEgY3VzdG9tIG9wZXJhdG9yLCB0byBwcm9kdWNlIGFuIG91dHB1dCBzdHJlYW0uXG4gICAgICpcbiAgICAgKiAqY29tcG9zZSogaXMgYSBoYW5keSB3YXkgb2YgdXNpbmcgYW4gZXhpc3RpbmcgZnVuY3Rpb24gaW4gYSBjaGFpbmVkIHN0eWxlLlxuICAgICAqIEluc3RlYWQgb2Ygd3JpdGluZyBgb3V0U3RyZWFtID0gZihpblN0cmVhbSlgIHlvdSBjYW4gd3JpdGVcbiAgICAgKiBgb3V0U3RyZWFtID0gaW5TdHJlYW0uY29tcG9zZShmKWAuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBvcGVyYXRvciBBIGZ1bmN0aW9uIHRoYXQgdGFrZXMgYSBzdHJlYW0gYXMgaW5wdXQgYW5kXG4gICAgICogcmV0dXJucyBhIHN0cmVhbSBhcyB3ZWxsLlxuICAgICAqIEByZXR1cm4ge1N0cmVhbX1cbiAgICAgKi9cbiAgICBTdHJlYW0ucHJvdG90eXBlLmNvbXBvc2UgPSBmdW5jdGlvbiAob3BlcmF0b3IpIHtcbiAgICAgICAgcmV0dXJuIG9wZXJhdG9yKHRoaXMpO1xuICAgIH07XG4gICAgLyoqXG4gICAgICogUmV0dXJucyBhbiBvdXRwdXQgc3RyZWFtIHRoYXQgYmVoYXZlcyBsaWtlIHRoZSBpbnB1dCBzdHJlYW0sIGJ1dCBhbHNvXG4gICAgICogcmVtZW1iZXJzIHRoZSBtb3N0IHJlY2VudCBldmVudCB0aGF0IGhhcHBlbnMgb24gdGhlIGlucHV0IHN0cmVhbSwgc28gdGhhdCBhXG4gICAgICogbmV3bHkgYWRkZWQgbGlzdGVuZXIgd2lsbCBpbW1lZGlhdGVseSByZWNlaXZlIHRoYXQgbWVtb3Jpc2VkIGV2ZW50LlxuICAgICAqXG4gICAgICogQHJldHVybiB7TWVtb3J5U3RyZWFtfVxuICAgICAqL1xuICAgIFN0cmVhbS5wcm90b3R5cGUucmVtZW1iZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBuZXcgTWVtb3J5U3RyZWFtKG5ldyBSZW1lbWJlck9wZXJhdG9yKHRoaXMpKTtcbiAgICB9O1xuICAgIC8qKlxuICAgICAqIFJldHVybnMgYW4gb3V0cHV0IHN0cmVhbSB0aGF0IGlkZW50aWNhbGx5IGJlaGF2ZXMgbGlrZSB0aGUgaW5wdXQgc3RyZWFtLFxuICAgICAqIGJ1dCBhbHNvIHJ1bnMgYSBgc3B5YCBmdW5jdGlvbiBmbyBlYWNoIGV2ZW50LCB0byBoZWxwIHlvdSBkZWJ1ZyB5b3VyIGFwcC5cbiAgICAgKlxuICAgICAqICpkZWJ1ZyogdGFrZXMgYSBgc3B5YCBmdW5jdGlvbiBhcyBhcmd1bWVudCwgYW5kIHJ1bnMgdGhhdCBmb3IgZWFjaCBldmVudFxuICAgICAqIGhhcHBlbmluZyBvbiB0aGUgaW5wdXQgc3RyZWFtLiBJZiB5b3UgZG9uJ3QgcHJvdmlkZSB0aGUgYHNweWAgYXJndW1lbnQsXG4gICAgICogdGhlbiAqZGVidWcqIHdpbGwganVzdCBgY29uc29sZS5sb2dgIGVhY2ggZXZlbnQuIFRoaXMgaGVscHMgeW91IHRvXG4gICAgICogdW5kZXJzdGFuZCB0aGUgZmxvdyBvZiBldmVudHMgdGhyb3VnaCBzb21lIG9wZXJhdG9yIGNoYWluLlxuICAgICAqXG4gICAgICogUGxlYXNlIG5vdGUgdGhhdCBpZiB0aGUgb3V0cHV0IHN0cmVhbSBoYXMgbm8gbGlzdGVuZXJzLCB0aGVuIGl0IHdpbGwgbm90XG4gICAgICogc3RhcnQsIHdoaWNoIG1lYW5zIGBzcHlgIHdpbGwgbmV2ZXIgcnVuIGJlY2F1c2Ugbm8gYWN0dWFsIGV2ZW50IGhhcHBlbnMgaW5cbiAgICAgKiB0aGF0IGNhc2UuXG4gICAgICpcbiAgICAgKiBNYXJibGUgZGlhZ3JhbTpcbiAgICAgKlxuICAgICAqIGBgYHRleHRcbiAgICAgKiAtLTEtLS0tMi0tLS0tMy0tLS0tNC0tXG4gICAgICogICAgICAgICBkZWJ1Z1xuICAgICAqIC0tMS0tLS0yLS0tLS0zLS0tLS00LS1cbiAgICAgKiBgYGBcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGxhYmVsT3JTcHkgQSBzdHJpbmcgdG8gdXNlIGFzIHRoZSBsYWJlbCB3aGVuIHByaW50aW5nXG4gICAgICogZGVidWcgaW5mb3JtYXRpb24gb24gdGhlIGNvbnNvbGUsIG9yIGEgJ3NweScgZnVuY3Rpb24gdGhhdCB0YWtlcyBhbiBldmVudFxuICAgICAqIGFzIGFyZ3VtZW50LCBhbmQgZG9lcyBub3QgbmVlZCB0byByZXR1cm4gYW55dGhpbmcuXG4gICAgICogQHJldHVybiB7U3RyZWFtfVxuICAgICAqL1xuICAgIFN0cmVhbS5wcm90b3R5cGUuZGVidWcgPSBmdW5jdGlvbiAobGFiZWxPclNweSkge1xuICAgICAgICByZXR1cm4gbmV3ICh0aGlzLmN0b3IoKSkobmV3IERlYnVnT3BlcmF0b3IodGhpcywgbGFiZWxPclNweSkpO1xuICAgIH07XG4gICAgLyoqXG4gICAgICogKmltaXRhdGUqIGNoYW5nZXMgdGhpcyBjdXJyZW50IFN0cmVhbSB0byBlbWl0IHRoZSBzYW1lIGV2ZW50cyB0aGF0IHRoZVxuICAgICAqIGBvdGhlcmAgZ2l2ZW4gU3RyZWFtIGRvZXMuIFRoaXMgbWV0aG9kIHJldHVybnMgbm90aGluZy5cbiAgICAgKlxuICAgICAqIFRoaXMgbWV0aG9kIGV4aXN0cyB0byBhbGxvdyBvbmUgdGhpbmc6ICoqY2lyY3VsYXIgZGVwZW5kZW5jeSBvZiBzdHJlYW1zKiouXG4gICAgICogRm9yIGluc3RhbmNlLCBsZXQncyBpbWFnaW5lIHRoYXQgZm9yIHNvbWUgcmVhc29uIHlvdSBuZWVkIHRvIGNyZWF0ZSBhXG4gICAgICogY2lyY3VsYXIgZGVwZW5kZW5jeSB3aGVyZSBzdHJlYW0gYGZpcnN0JGAgZGVwZW5kcyBvbiBzdHJlYW0gYHNlY29uZCRgXG4gICAgICogd2hpY2ggaW4gdHVybiBkZXBlbmRzIG9uIGBmaXJzdCRgOlxuICAgICAqXG4gICAgICogPCEtLSBza2lwLWV4YW1wbGUgLS0+XG4gICAgICogYGBganNcbiAgICAgKiBpbXBvcnQgZGVsYXkgZnJvbSAneHN0cmVhbS9leHRyYS9kZWxheSdcbiAgICAgKlxuICAgICAqIHZhciBmaXJzdCQgPSBzZWNvbmQkLm1hcCh4ID0+IHggKiAxMCkudGFrZSgzKTtcbiAgICAgKiB2YXIgc2Vjb25kJCA9IGZpcnN0JC5tYXAoeCA9PiB4ICsgMSkuc3RhcnRXaXRoKDEpLmNvbXBvc2UoZGVsYXkoMTAwKSk7XG4gICAgICogYGBgXG4gICAgICpcbiAgICAgKiBIb3dldmVyLCB0aGF0IGlzIGludmFsaWQgSmF2YVNjcmlwdCwgYmVjYXVzZSBgc2Vjb25kJGAgaXMgdW5kZWZpbmVkXG4gICAgICogb24gdGhlIGZpcnN0IGxpbmUuIFRoaXMgaXMgaG93ICppbWl0YXRlKiBjYW4gaGVscCBzb2x2ZSBpdDpcbiAgICAgKlxuICAgICAqIGBgYGpzXG4gICAgICogaW1wb3J0IGRlbGF5IGZyb20gJ3hzdHJlYW0vZXh0cmEvZGVsYXknXG4gICAgICpcbiAgICAgKiB2YXIgc2Vjb25kUHJveHkkID0geHMuY3JlYXRlKCk7XG4gICAgICogdmFyIGZpcnN0JCA9IHNlY29uZFByb3h5JC5tYXAoeCA9PiB4ICogMTApLnRha2UoMyk7XG4gICAgICogdmFyIHNlY29uZCQgPSBmaXJzdCQubWFwKHggPT4geCArIDEpLnN0YXJ0V2l0aCgxKS5jb21wb3NlKGRlbGF5KDEwMCkpO1xuICAgICAqIHNlY29uZFByb3h5JC5pbWl0YXRlKHNlY29uZCQpO1xuICAgICAqIGBgYFxuICAgICAqXG4gICAgICogV2UgY3JlYXRlIGBzZWNvbmRQcm94eSRgIGJlZm9yZSB0aGUgb3RoZXJzLCBzbyBpdCBjYW4gYmUgdXNlZCBpbiB0aGVcbiAgICAgKiBkZWNsYXJhdGlvbiBvZiBgZmlyc3QkYC4gVGhlbiwgYWZ0ZXIgYm90aCBgZmlyc3QkYCBhbmQgYHNlY29uZCRgIGFyZVxuICAgICAqIGRlZmluZWQsIHdlIGhvb2sgYHNlY29uZFByb3h5JGAgd2l0aCBgc2Vjb25kJGAgd2l0aCBgaW1pdGF0ZSgpYCB0byB0ZWxsXG4gICAgICogdGhhdCB0aGV5IGFyZSBcInRoZSBzYW1lXCIuIGBpbWl0YXRlYCB3aWxsIG5vdCB0cmlnZ2VyIHRoZSBzdGFydCBvZiBhbnlcbiAgICAgKiBzdHJlYW0sIGl0IGp1c3QgYmluZHMgYHNlY29uZFByb3h5JGAgYW5kIGBzZWNvbmQkYCB0b2dldGhlci5cbiAgICAgKlxuICAgICAqIFRoZSBmb2xsb3dpbmcgaXMgYW4gZXhhbXBsZSB3aGVyZSBgaW1pdGF0ZSgpYCBpcyBpbXBvcnRhbnQgaW4gQ3ljbGUuanNcbiAgICAgKiBhcHBsaWNhdGlvbnMuIEEgcGFyZW50IGNvbXBvbmVudCBjb250YWlucyBzb21lIGNoaWxkIGNvbXBvbmVudHMuIEEgY2hpbGRcbiAgICAgKiBoYXMgYW4gYWN0aW9uIHN0cmVhbSB3aGljaCBpcyBnaXZlbiB0byB0aGUgcGFyZW50IHRvIGRlZmluZSBpdHMgc3RhdGU6XG4gICAgICpcbiAgICAgKiA8IS0tIHNraXAtZXhhbXBsZSAtLT5cbiAgICAgKiBgYGBqc1xuICAgICAqIGNvbnN0IGNoaWxkQWN0aW9uUHJveHkkID0geHMuY3JlYXRlKCk7XG4gICAgICogY29uc3QgcGFyZW50ID0gUGFyZW50KHsuLi5zb3VyY2VzLCBjaGlsZEFjdGlvbiQ6IGNoaWxkQWN0aW9uUHJveHkkfSk7XG4gICAgICogY29uc3QgY2hpbGRBY3Rpb24kID0gcGFyZW50LnN0YXRlJC5tYXAocyA9PiBzLmNoaWxkLmFjdGlvbiQpLmZsYXR0ZW4oKTtcbiAgICAgKiBjaGlsZEFjdGlvblByb3h5JC5pbWl0YXRlKGNoaWxkQWN0aW9uJCk7XG4gICAgICogYGBgXG4gICAgICpcbiAgICAgKiBOb3RlLCB0aG91Z2gsIHRoYXQgKipgaW1pdGF0ZSgpYCBkb2VzIG5vdCBzdXBwb3J0IE1lbW9yeVN0cmVhbXMqKi4gSWYgd2VcbiAgICAgKiB3b3VsZCBhdHRlbXB0IHRvIGltaXRhdGUgYSBNZW1vcnlTdHJlYW0gaW4gYSBjaXJjdWxhciBkZXBlbmRlbmN5LCB3ZSB3b3VsZFxuICAgICAqIGVpdGhlciBnZXQgYSByYWNlIGNvbmRpdGlvbiAod2hlcmUgdGhlIHN5bXB0b20gd291bGQgYmUgXCJub3RoaW5nIGhhcHBlbnNcIilcbiAgICAgKiBvciBhbiBpbmZpbml0ZSBjeWNsaWMgZW1pc3Npb24gb2YgdmFsdWVzLiBJdCdzIHVzZWZ1bCB0byB0aGluayBhYm91dFxuICAgICAqIE1lbW9yeVN0cmVhbXMgYXMgY2VsbHMgaW4gYSBzcHJlYWRzaGVldC4gSXQgZG9lc24ndCBtYWtlIGFueSBzZW5zZSB0b1xuICAgICAqIGRlZmluZSBhIHNwcmVhZHNoZWV0IGNlbGwgYEExYCB3aXRoIGEgZm9ybXVsYSB0aGF0IGRlcGVuZHMgb24gYEIxYCBhbmRcbiAgICAgKiBjZWxsIGBCMWAgZGVmaW5lZCB3aXRoIGEgZm9ybXVsYSB0aGF0IGRlcGVuZHMgb24gYEExYC5cbiAgICAgKlxuICAgICAqIElmIHlvdSBmaW5kIHlvdXJzZWxmIHdhbnRpbmcgdG8gdXNlIGBpbWl0YXRlKClgIHdpdGggYVxuICAgICAqIE1lbW9yeVN0cmVhbSwgeW91IHNob3VsZCByZXdvcmsgeW91ciBjb2RlIGFyb3VuZCBgaW1pdGF0ZSgpYCB0byB1c2UgYVxuICAgICAqIFN0cmVhbSBpbnN0ZWFkLiBMb29rIGZvciB0aGUgc3RyZWFtIGluIHRoZSBjaXJjdWxhciBkZXBlbmRlbmN5IHRoYXRcbiAgICAgKiByZXByZXNlbnRzIGFuIGV2ZW50IHN0cmVhbSwgYW5kIHRoYXQgd291bGQgYmUgYSBjYW5kaWRhdGUgZm9yIGNyZWF0aW5nIGFcbiAgICAgKiBwcm94eSBTdHJlYW0gd2hpY2ggdGhlbiBpbWl0YXRlcyB0aGUgdGFyZ2V0IFN0cmVhbS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7U3RyZWFtfSB0YXJnZXQgVGhlIG90aGVyIHN0cmVhbSB0byBpbWl0YXRlIG9uIHRoZSBjdXJyZW50IG9uZS4gTXVzdFxuICAgICAqIG5vdCBiZSBhIE1lbW9yeVN0cmVhbS5cbiAgICAgKi9cbiAgICBTdHJlYW0ucHJvdG90eXBlLmltaXRhdGUgPSBmdW5jdGlvbiAodGFyZ2V0KSB7XG4gICAgICAgIGlmICh0YXJnZXQgaW5zdGFuY2VvZiBNZW1vcnlTdHJlYW0pIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignQSBNZW1vcnlTdHJlYW0gd2FzIGdpdmVuIHRvIGltaXRhdGUoKSwgYnV0IGl0IG9ubHkgJyArXG4gICAgICAgICAgICAgICAgJ3N1cHBvcnRzIGEgU3RyZWFtLiBSZWFkIG1vcmUgYWJvdXQgdGhpcyByZXN0cmljdGlvbiBoZXJlOiAnICtcbiAgICAgICAgICAgICAgICAnaHR0cHM6Ly9naXRodWIuY29tL3N0YWx0ei94c3RyZWFtI2ZhcScpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX3RhcmdldCA9IHRhcmdldDtcbiAgICAgICAgZm9yICh2YXIgaWxzID0gdGhpcy5faWxzLCBOID0gaWxzLmxlbmd0aCwgaSA9IDA7IGkgPCBOOyBpKyspIHtcbiAgICAgICAgICAgIHRhcmdldC5fYWRkKGlsc1tpXSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5faWxzID0gW107XG4gICAgfTtcbiAgICAvKipcbiAgICAgKiBGb3JjZXMgdGhlIFN0cmVhbSB0byBlbWl0IHRoZSBnaXZlbiB2YWx1ZSB0byBpdHMgbGlzdGVuZXJzLlxuICAgICAqXG4gICAgICogQXMgdGhlIG5hbWUgaW5kaWNhdGVzLCBpZiB5b3UgdXNlIHRoaXMsIHlvdSBhcmUgbW9zdCBsaWtlbHkgZG9pbmcgc29tZXRoaW5nXG4gICAgICogVGhlIFdyb25nIFdheS4gUGxlYXNlIHRyeSB0byB1bmRlcnN0YW5kIHRoZSByZWFjdGl2ZSB3YXkgYmVmb3JlIHVzaW5nIHRoaXNcbiAgICAgKiBtZXRob2QuIFVzZSBpdCBvbmx5IHdoZW4geW91IGtub3cgd2hhdCB5b3UgYXJlIGRvaW5nLlxuICAgICAqXG4gICAgICogQHBhcmFtIHZhbHVlIFRoZSBcIm5leHRcIiB2YWx1ZSB5b3Ugd2FudCB0byBicm9hZGNhc3QgdG8gYWxsIGxpc3RlbmVycyBvZlxuICAgICAqIHRoaXMgU3RyZWFtLlxuICAgICAqL1xuICAgIFN0cmVhbS5wcm90b3R5cGUuc2hhbWVmdWxseVNlbmROZXh0ID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIHRoaXMuX24odmFsdWUpO1xuICAgIH07XG4gICAgLyoqXG4gICAgICogRm9yY2VzIHRoZSBTdHJlYW0gdG8gZW1pdCB0aGUgZ2l2ZW4gZXJyb3IgdG8gaXRzIGxpc3RlbmVycy5cbiAgICAgKlxuICAgICAqIEFzIHRoZSBuYW1lIGluZGljYXRlcywgaWYgeW91IHVzZSB0aGlzLCB5b3UgYXJlIG1vc3QgbGlrZWx5IGRvaW5nIHNvbWV0aGluZ1xuICAgICAqIFRoZSBXcm9uZyBXYXkuIFBsZWFzZSB0cnkgdG8gdW5kZXJzdGFuZCB0aGUgcmVhY3RpdmUgd2F5IGJlZm9yZSB1c2luZyB0aGlzXG4gICAgICogbWV0aG9kLiBVc2UgaXQgb25seSB3aGVuIHlvdSBrbm93IHdoYXQgeW91IGFyZSBkb2luZy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7YW55fSBlcnJvciBUaGUgZXJyb3IgeW91IHdhbnQgdG8gYnJvYWRjYXN0IHRvIGFsbCB0aGUgbGlzdGVuZXJzIG9mXG4gICAgICogdGhpcyBTdHJlYW0uXG4gICAgICovXG4gICAgU3RyZWFtLnByb3RvdHlwZS5zaGFtZWZ1bGx5U2VuZEVycm9yID0gZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgICAgIHRoaXMuX2UoZXJyb3IpO1xuICAgIH07XG4gICAgLyoqXG4gICAgICogRm9yY2VzIHRoZSBTdHJlYW0gdG8gZW1pdCB0aGUgXCJjb21wbGV0ZWRcIiBldmVudCB0byBpdHMgbGlzdGVuZXJzLlxuICAgICAqXG4gICAgICogQXMgdGhlIG5hbWUgaW5kaWNhdGVzLCBpZiB5b3UgdXNlIHRoaXMsIHlvdSBhcmUgbW9zdCBsaWtlbHkgZG9pbmcgc29tZXRoaW5nXG4gICAgICogVGhlIFdyb25nIFdheS4gUGxlYXNlIHRyeSB0byB1bmRlcnN0YW5kIHRoZSByZWFjdGl2ZSB3YXkgYmVmb3JlIHVzaW5nIHRoaXNcbiAgICAgKiBtZXRob2QuIFVzZSBpdCBvbmx5IHdoZW4geW91IGtub3cgd2hhdCB5b3UgYXJlIGRvaW5nLlxuICAgICAqL1xuICAgIFN0cmVhbS5wcm90b3R5cGUuc2hhbWVmdWxseVNlbmRDb21wbGV0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5fYygpO1xuICAgIH07XG4gICAgLyoqXG4gICAgICogQWRkcyBhIFwiZGVidWdcIiBsaXN0ZW5lciB0byB0aGUgc3RyZWFtLiBUaGVyZSBjYW4gb25seSBiZSBvbmUgZGVidWdcbiAgICAgKiBsaXN0ZW5lciwgdGhhdCdzIHdoeSB0aGlzIGlzICdzZXREZWJ1Z0xpc3RlbmVyJy4gVG8gcmVtb3ZlIHRoZSBkZWJ1Z1xuICAgICAqIGxpc3RlbmVyLCBqdXN0IGNhbGwgc2V0RGVidWdMaXN0ZW5lcihudWxsKS5cbiAgICAgKlxuICAgICAqIEEgZGVidWcgbGlzdGVuZXIgaXMgbGlrZSBhbnkgb3RoZXIgbGlzdGVuZXIuIFRoZSBvbmx5IGRpZmZlcmVuY2UgaXMgdGhhdCBhXG4gICAgICogZGVidWcgbGlzdGVuZXIgaXMgXCJzdGVhbHRoeVwiOiBpdHMgcHJlc2VuY2UvYWJzZW5jZSBkb2VzIG5vdCB0cmlnZ2VyIHRoZVxuICAgICAqIHN0YXJ0L3N0b3Agb2YgdGhlIHN0cmVhbSAob3IgdGhlIHByb2R1Y2VyIGluc2lkZSB0aGUgc3RyZWFtKS4gVGhpcyBpc1xuICAgICAqIHVzZWZ1bCBzbyB5b3UgY2FuIGluc3BlY3Qgd2hhdCBpcyBnb2luZyBvbiB3aXRob3V0IGNoYW5naW5nIHRoZSBiZWhhdmlvclxuICAgICAqIG9mIHRoZSBwcm9ncmFtLiBJZiB5b3UgaGF2ZSBhbiBpZGxlIHN0cmVhbSBhbmQgeW91IGFkZCBhIG5vcm1hbCBsaXN0ZW5lciB0b1xuICAgICAqIGl0LCB0aGUgc3RyZWFtIHdpbGwgc3RhcnQgZXhlY3V0aW5nLiBCdXQgaWYgeW91IHNldCBhIGRlYnVnIGxpc3RlbmVyIG9uIGFuXG4gICAgICogaWRsZSBzdHJlYW0sIGl0IHdvbid0IHN0YXJ0IGV4ZWN1dGluZyAobm90IHVudGlsIHRoZSBmaXJzdCBub3JtYWwgbGlzdGVuZXJcbiAgICAgKiBpcyBhZGRlZCkuXG4gICAgICpcbiAgICAgKiBBcyB0aGUgbmFtZSBpbmRpY2F0ZXMsIHdlIGRvbid0IHJlY29tbWVuZCB1c2luZyB0aGlzIG1ldGhvZCB0byBidWlsZCBhcHBcbiAgICAgKiBsb2dpYy4gSW4gZmFjdCwgaW4gbW9zdCBjYXNlcyB0aGUgZGVidWcgb3BlcmF0b3Igd29ya3MganVzdCBmaW5lLiBPbmx5IHVzZVxuICAgICAqIHRoaXMgb25lIGlmIHlvdSBrbm93IHdoYXQgeW91J3JlIGRvaW5nLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtMaXN0ZW5lcjxUPn0gbGlzdGVuZXJcbiAgICAgKi9cbiAgICBTdHJlYW0ucHJvdG90eXBlLnNldERlYnVnTGlzdGVuZXIgPSBmdW5jdGlvbiAobGlzdGVuZXIpIHtcbiAgICAgICAgaWYgKCFsaXN0ZW5lcikge1xuICAgICAgICAgICAgdGhpcy5fZCA9IGZhbHNlO1xuICAgICAgICAgICAgdGhpcy5fZGwgPSBOTztcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX2QgPSB0cnVlO1xuICAgICAgICAgICAgbGlzdGVuZXIuX24gPSBsaXN0ZW5lci5uZXh0O1xuICAgICAgICAgICAgbGlzdGVuZXIuX2UgPSBsaXN0ZW5lci5lcnJvcjtcbiAgICAgICAgICAgIGxpc3RlbmVyLl9jID0gbGlzdGVuZXIuY29tcGxldGU7XG4gICAgICAgICAgICB0aGlzLl9kbCA9IGxpc3RlbmVyO1xuICAgICAgICB9XG4gICAgfTtcbiAgICAvKipcbiAgICAgKiBCbGVuZHMgbXVsdGlwbGUgc3RyZWFtcyB0b2dldGhlciwgZW1pdHRpbmcgZXZlbnRzIGZyb20gYWxsIG9mIHRoZW1cbiAgICAgKiBjb25jdXJyZW50bHkuXG4gICAgICpcbiAgICAgKiAqbWVyZ2UqIHRha2VzIG11bHRpcGxlIHN0cmVhbXMgYXMgYXJndW1lbnRzLCBhbmQgY3JlYXRlcyBhIHN0cmVhbSB0aGF0XG4gICAgICogYmVoYXZlcyBsaWtlIGVhY2ggb2YgdGhlIGFyZ3VtZW50IHN0cmVhbXMsIGluIHBhcmFsbGVsLlxuICAgICAqXG4gICAgICogTWFyYmxlIGRpYWdyYW06XG4gICAgICpcbiAgICAgKiBgYGB0ZXh0XG4gICAgICogLS0xLS0tLTItLS0tLTMtLS0tLS0tLTQtLS1cbiAgICAgKiAtLS0tYS0tLS0tYi0tLS1jLS0tZC0tLS0tLVxuICAgICAqICAgICAgICAgICAgbWVyZ2VcbiAgICAgKiAtLTEtYS0tMi0tYi0tMy1jLS0tZC0tNC0tLVxuICAgICAqIGBgYFxuICAgICAqXG4gICAgICogQGZhY3RvcnkgdHJ1ZVxuICAgICAqIEBwYXJhbSB7U3RyZWFtfSBzdHJlYW0xIEEgc3RyZWFtIHRvIG1lcmdlIHRvZ2V0aGVyIHdpdGggb3RoZXIgc3RyZWFtcy5cbiAgICAgKiBAcGFyYW0ge1N0cmVhbX0gc3RyZWFtMiBBIHN0cmVhbSB0byBtZXJnZSB0b2dldGhlciB3aXRoIG90aGVyIHN0cmVhbXMuIFR3b1xuICAgICAqIG9yIG1vcmUgc3RyZWFtcyBtYXkgYmUgZ2l2ZW4gYXMgYXJndW1lbnRzLlxuICAgICAqIEByZXR1cm4ge1N0cmVhbX1cbiAgICAgKi9cbiAgICBTdHJlYW0ubWVyZ2UgPSBmdW5jdGlvbiBtZXJnZSgpIHtcbiAgICAgICAgdmFyIHN0cmVhbXMgPSBbXTtcbiAgICAgICAgZm9yICh2YXIgX2kgPSAwOyBfaSA8IGFyZ3VtZW50cy5sZW5ndGg7IF9pKyspIHtcbiAgICAgICAgICAgIHN0cmVhbXNbX2kgLSAwXSA9IGFyZ3VtZW50c1tfaV07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG5ldyBTdHJlYW0obmV3IE1lcmdlUHJvZHVjZXIoc3RyZWFtcykpO1xuICAgIH07XG4gICAgLyoqXG4gICAgICogQ29tYmluZXMgbXVsdGlwbGUgaW5wdXQgc3RyZWFtcyB0b2dldGhlciB0byByZXR1cm4gYSBzdHJlYW0gd2hvc2UgZXZlbnRzXG4gICAgICogYXJlIGFycmF5cyB0aGF0IGNvbGxlY3QgdGhlIGxhdGVzdCBldmVudHMgZnJvbSBlYWNoIGlucHV0IHN0cmVhbS5cbiAgICAgKlxuICAgICAqICpjb21iaW5lKiBpbnRlcm5hbGx5IHJlbWVtYmVycyB0aGUgbW9zdCByZWNlbnQgZXZlbnQgZnJvbSBlYWNoIG9mIHRoZSBpbnB1dFxuICAgICAqIHN0cmVhbXMuIFdoZW4gYW55IG9mIHRoZSBpbnB1dCBzdHJlYW1zIGVtaXRzIGFuIGV2ZW50LCB0aGF0IGV2ZW50IHRvZ2V0aGVyXG4gICAgICogd2l0aCBhbGwgdGhlIG90aGVyIHNhdmVkIGV2ZW50cyBhcmUgY29tYmluZWQgaW50byBhbiBhcnJheS4gVGhhdCBhcnJheSB3aWxsXG4gICAgICogYmUgZW1pdHRlZCBvbiB0aGUgb3V0cHV0IHN0cmVhbS4gSXQncyBlc3NlbnRpYWxseSBhIHdheSBvZiBqb2luaW5nIHRvZ2V0aGVyXG4gICAgICogdGhlIGV2ZW50cyBmcm9tIG11bHRpcGxlIHN0cmVhbXMuXG4gICAgICpcbiAgICAgKiBNYXJibGUgZGlhZ3JhbTpcbiAgICAgKlxuICAgICAqIGBgYHRleHRcbiAgICAgKiAtLTEtLS0tMi0tLS0tMy0tLS0tLS0tNC0tLVxuICAgICAqIC0tLS1hLS0tLS1iLS0tLS1jLS1kLS0tLS0tXG4gICAgICogICAgICAgICAgY29tYmluZVxuICAgICAqIC0tLS0xYS0yYS0yYi0zYi0zYy0zZC00ZC0tXG4gICAgICogYGBgXG4gICAgICpcbiAgICAgKiBAZmFjdG9yeSB0cnVlXG4gICAgICogQHBhcmFtIHtTdHJlYW19IHN0cmVhbTEgQSBzdHJlYW0gdG8gY29tYmluZSB0b2dldGhlciB3aXRoIG90aGVyIHN0cmVhbXMuXG4gICAgICogQHBhcmFtIHtTdHJlYW19IHN0cmVhbTIgQSBzdHJlYW0gdG8gY29tYmluZSB0b2dldGhlciB3aXRoIG90aGVyIHN0cmVhbXMuXG4gICAgICogTXVsdGlwbGUgc3RyZWFtcywgbm90IGp1c3QgdHdvLCBtYXkgYmUgZ2l2ZW4gYXMgYXJndW1lbnRzLlxuICAgICAqIEByZXR1cm4ge1N0cmVhbX1cbiAgICAgKi9cbiAgICBTdHJlYW0uY29tYmluZSA9IGZ1bmN0aW9uIGNvbWJpbmUoKSB7XG4gICAgICAgIHZhciBzdHJlYW1zID0gW107XG4gICAgICAgIGZvciAodmFyIF9pID0gMDsgX2kgPCBhcmd1bWVudHMubGVuZ3RoOyBfaSsrKSB7XG4gICAgICAgICAgICBzdHJlYW1zW19pIC0gMF0gPSBhcmd1bWVudHNbX2ldO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZXcgU3RyZWFtKG5ldyBDb21iaW5lUHJvZHVjZXIoc3RyZWFtcykpO1xuICAgIH07XG4gICAgcmV0dXJuIFN0cmVhbTtcbn0oKSk7XG5leHBvcnRzLlN0cmVhbSA9IFN0cmVhbTtcbnZhciBNZW1vcnlTdHJlYW0gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhNZW1vcnlTdHJlYW0sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gTWVtb3J5U3RyZWFtKHByb2R1Y2VyKSB7XG4gICAgICAgIF9zdXBlci5jYWxsKHRoaXMsIHByb2R1Y2VyKTtcbiAgICAgICAgdGhpcy5faGFzID0gZmFsc2U7XG4gICAgfVxuICAgIE1lbW9yeVN0cmVhbS5wcm90b3R5cGUuX24gPSBmdW5jdGlvbiAoeCkge1xuICAgICAgICB0aGlzLl92ID0geDtcbiAgICAgICAgdGhpcy5faGFzID0gdHJ1ZTtcbiAgICAgICAgX3N1cGVyLnByb3RvdHlwZS5fbi5jYWxsKHRoaXMsIHgpO1xuICAgIH07XG4gICAgTWVtb3J5U3RyZWFtLnByb3RvdHlwZS5fYWRkID0gZnVuY3Rpb24gKGlsKSB7XG4gICAgICAgIGlmICh0aGlzLl9oYXMpIHtcbiAgICAgICAgICAgIGlsLl9uKHRoaXMuX3YpO1xuICAgICAgICB9XG4gICAgICAgIF9zdXBlci5wcm90b3R5cGUuX2FkZC5jYWxsKHRoaXMsIGlsKTtcbiAgICB9O1xuICAgIE1lbW9yeVN0cmVhbS5wcm90b3R5cGUuX3N0b3BOb3cgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuX2hhcyA9IGZhbHNlO1xuICAgICAgICBfc3VwZXIucHJvdG90eXBlLl9zdG9wTm93LmNhbGwodGhpcyk7XG4gICAgfTtcbiAgICBNZW1vcnlTdHJlYW0ucHJvdG90eXBlLl94ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl9oYXMgPSBmYWxzZTtcbiAgICAgICAgX3N1cGVyLnByb3RvdHlwZS5feC5jYWxsKHRoaXMpO1xuICAgIH07XG4gICAgTWVtb3J5U3RyZWFtLnByb3RvdHlwZS5tYXAgPSBmdW5jdGlvbiAocHJvamVjdCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fbWFwKHByb2plY3QpO1xuICAgIH07XG4gICAgTWVtb3J5U3RyZWFtLnByb3RvdHlwZS5tYXBUbyA9IGZ1bmN0aW9uIChwcm9qZWN0ZWRWYWx1ZSkge1xuICAgICAgICByZXR1cm4gX3N1cGVyLnByb3RvdHlwZS5tYXBUby5jYWxsKHRoaXMsIHByb2plY3RlZFZhbHVlKTtcbiAgICB9O1xuICAgIE1lbW9yeVN0cmVhbS5wcm90b3R5cGUudGFrZSA9IGZ1bmN0aW9uIChhbW91bnQpIHtcbiAgICAgICAgcmV0dXJuIF9zdXBlci5wcm90b3R5cGUudGFrZS5jYWxsKHRoaXMsIGFtb3VudCk7XG4gICAgfTtcbiAgICBNZW1vcnlTdHJlYW0ucHJvdG90eXBlLmVuZFdoZW4gPSBmdW5jdGlvbiAob3RoZXIpIHtcbiAgICAgICAgcmV0dXJuIF9zdXBlci5wcm90b3R5cGUuZW5kV2hlbi5jYWxsKHRoaXMsIG90aGVyKTtcbiAgICB9O1xuICAgIE1lbW9yeVN0cmVhbS5wcm90b3R5cGUucmVwbGFjZUVycm9yID0gZnVuY3Rpb24gKHJlcGxhY2UpIHtcbiAgICAgICAgcmV0dXJuIF9zdXBlci5wcm90b3R5cGUucmVwbGFjZUVycm9yLmNhbGwodGhpcywgcmVwbGFjZSk7XG4gICAgfTtcbiAgICBNZW1vcnlTdHJlYW0ucHJvdG90eXBlLnJlbWVtYmVyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuICAgIE1lbW9yeVN0cmVhbS5wcm90b3R5cGUuZGVidWcgPSBmdW5jdGlvbiAobGFiZWxPclNweSkge1xuICAgICAgICByZXR1cm4gX3N1cGVyLnByb3RvdHlwZS5kZWJ1Zy5jYWxsKHRoaXMsIGxhYmVsT3JTcHkpO1xuICAgIH07XG4gICAgcmV0dXJuIE1lbW9yeVN0cmVhbTtcbn0oU3RyZWFtKSk7XG5leHBvcnRzLk1lbW9yeVN0cmVhbSA9IE1lbW9yeVN0cmVhbTtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcbmV4cG9ydHMuZGVmYXVsdCA9IFN0cmVhbTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWNvcmUuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgY29yZV8xID0gcmVxdWlyZSgnLi9jb3JlJyk7XG5leHBvcnRzLlN0cmVhbSA9IGNvcmVfMS5TdHJlYW07XG5leHBvcnRzLk1lbW9yeVN0cmVhbSA9IGNvcmVfMS5NZW1vcnlTdHJlYW07XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XG5leHBvcnRzLmRlZmF1bHQgPSBjb3JlXzEuU3RyZWFtO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9aW5kZXguanMubWFwIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgY29weSAgICAgICAgICAgICA9IHJlcXVpcmUoJ2VzNS1leHQvb2JqZWN0L2NvcHknKVxuICAsIG5vcm1hbGl6ZU9wdGlvbnMgPSByZXF1aXJlKCdlczUtZXh0L29iamVjdC9ub3JtYWxpemUtb3B0aW9ucycpXG4gICwgZW5zdXJlQ2FsbGFibGUgICA9IHJlcXVpcmUoJ2VzNS1leHQvb2JqZWN0L3ZhbGlkLWNhbGxhYmxlJylcbiAgLCBtYXAgICAgICAgICAgICAgID0gcmVxdWlyZSgnZXM1LWV4dC9vYmplY3QvbWFwJylcbiAgLCBjYWxsYWJsZSAgICAgICAgID0gcmVxdWlyZSgnZXM1LWV4dC9vYmplY3QvdmFsaWQtY2FsbGFibGUnKVxuICAsIHZhbGlkVmFsdWUgICAgICAgPSByZXF1aXJlKCdlczUtZXh0L29iamVjdC92YWxpZC12YWx1ZScpXG5cbiAgLCBiaW5kID0gRnVuY3Rpb24ucHJvdG90eXBlLmJpbmQsIGRlZmluZVByb3BlcnR5ID0gT2JqZWN0LmRlZmluZVByb3BlcnR5XG4gICwgaGFzT3duUHJvcGVydHkgPSBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5XG4gICwgZGVmaW5lO1xuXG5kZWZpbmUgPSBmdW5jdGlvbiAobmFtZSwgZGVzYywgb3B0aW9ucykge1xuXHR2YXIgdmFsdWUgPSB2YWxpZFZhbHVlKGRlc2MpICYmIGNhbGxhYmxlKGRlc2MudmFsdWUpLCBkZ3M7XG5cdGRncyA9IGNvcHkoZGVzYyk7XG5cdGRlbGV0ZSBkZ3Mud3JpdGFibGU7XG5cdGRlbGV0ZSBkZ3MudmFsdWU7XG5cdGRncy5nZXQgPSBmdW5jdGlvbiAoKSB7XG5cdFx0aWYgKCFvcHRpb25zLm92ZXJ3cml0ZURlZmluaXRpb24gJiYgaGFzT3duUHJvcGVydHkuY2FsbCh0aGlzLCBuYW1lKSkgcmV0dXJuIHZhbHVlO1xuXHRcdGRlc2MudmFsdWUgPSBiaW5kLmNhbGwodmFsdWUsIG9wdGlvbnMucmVzb2x2ZUNvbnRleHQgPyBvcHRpb25zLnJlc29sdmVDb250ZXh0KHRoaXMpIDogdGhpcyk7XG5cdFx0ZGVmaW5lUHJvcGVydHkodGhpcywgbmFtZSwgZGVzYyk7XG5cdFx0cmV0dXJuIHRoaXNbbmFtZV07XG5cdH07XG5cdHJldHVybiBkZ3M7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChwcm9wcy8qLCBvcHRpb25zKi8pIHtcblx0dmFyIG9wdGlvbnMgPSBub3JtYWxpemVPcHRpb25zKGFyZ3VtZW50c1sxXSk7XG5cdGlmIChvcHRpb25zLnJlc29sdmVDb250ZXh0ICE9IG51bGwpIGVuc3VyZUNhbGxhYmxlKG9wdGlvbnMucmVzb2x2ZUNvbnRleHQpO1xuXHRyZXR1cm4gbWFwKHByb3BzLCBmdW5jdGlvbiAoZGVzYywgbmFtZSkgeyByZXR1cm4gZGVmaW5lKG5hbWUsIGRlc2MsIG9wdGlvbnMpOyB9KTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBhc3NpZ24gICAgICAgID0gcmVxdWlyZSgnZXM1LWV4dC9vYmplY3QvYXNzaWduJylcbiAgLCBub3JtYWxpemVPcHRzID0gcmVxdWlyZSgnZXM1LWV4dC9vYmplY3Qvbm9ybWFsaXplLW9wdGlvbnMnKVxuICAsIGlzQ2FsbGFibGUgICAgPSByZXF1aXJlKCdlczUtZXh0L29iamVjdC9pcy1jYWxsYWJsZScpXG4gICwgY29udGFpbnMgICAgICA9IHJlcXVpcmUoJ2VzNS1leHQvc3RyaW5nLyMvY29udGFpbnMnKVxuXG4gICwgZDtcblxuZCA9IG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGRzY3IsIHZhbHVlLyosIG9wdGlvbnMqLykge1xuXHR2YXIgYywgZSwgdywgb3B0aW9ucywgZGVzYztcblx0aWYgKChhcmd1bWVudHMubGVuZ3RoIDwgMikgfHwgKHR5cGVvZiBkc2NyICE9PSAnc3RyaW5nJykpIHtcblx0XHRvcHRpb25zID0gdmFsdWU7XG5cdFx0dmFsdWUgPSBkc2NyO1xuXHRcdGRzY3IgPSBudWxsO1xuXHR9IGVsc2Uge1xuXHRcdG9wdGlvbnMgPSBhcmd1bWVudHNbMl07XG5cdH1cblx0aWYgKGRzY3IgPT0gbnVsbCkge1xuXHRcdGMgPSB3ID0gdHJ1ZTtcblx0XHRlID0gZmFsc2U7XG5cdH0gZWxzZSB7XG5cdFx0YyA9IGNvbnRhaW5zLmNhbGwoZHNjciwgJ2MnKTtcblx0XHRlID0gY29udGFpbnMuY2FsbChkc2NyLCAnZScpO1xuXHRcdHcgPSBjb250YWlucy5jYWxsKGRzY3IsICd3Jyk7XG5cdH1cblxuXHRkZXNjID0geyB2YWx1ZTogdmFsdWUsIGNvbmZpZ3VyYWJsZTogYywgZW51bWVyYWJsZTogZSwgd3JpdGFibGU6IHcgfTtcblx0cmV0dXJuICFvcHRpb25zID8gZGVzYyA6IGFzc2lnbihub3JtYWxpemVPcHRzKG9wdGlvbnMpLCBkZXNjKTtcbn07XG5cbmQuZ3MgPSBmdW5jdGlvbiAoZHNjciwgZ2V0LCBzZXQvKiwgb3B0aW9ucyovKSB7XG5cdHZhciBjLCBlLCBvcHRpb25zLCBkZXNjO1xuXHRpZiAodHlwZW9mIGRzY3IgIT09ICdzdHJpbmcnKSB7XG5cdFx0b3B0aW9ucyA9IHNldDtcblx0XHRzZXQgPSBnZXQ7XG5cdFx0Z2V0ID0gZHNjcjtcblx0XHRkc2NyID0gbnVsbDtcblx0fSBlbHNlIHtcblx0XHRvcHRpb25zID0gYXJndW1lbnRzWzNdO1xuXHR9XG5cdGlmIChnZXQgPT0gbnVsbCkge1xuXHRcdGdldCA9IHVuZGVmaW5lZDtcblx0fSBlbHNlIGlmICghaXNDYWxsYWJsZShnZXQpKSB7XG5cdFx0b3B0aW9ucyA9IGdldDtcblx0XHRnZXQgPSBzZXQgPSB1bmRlZmluZWQ7XG5cdH0gZWxzZSBpZiAoc2V0ID09IG51bGwpIHtcblx0XHRzZXQgPSB1bmRlZmluZWQ7XG5cdH0gZWxzZSBpZiAoIWlzQ2FsbGFibGUoc2V0KSkge1xuXHRcdG9wdGlvbnMgPSBzZXQ7XG5cdFx0c2V0ID0gdW5kZWZpbmVkO1xuXHR9XG5cdGlmIChkc2NyID09IG51bGwpIHtcblx0XHRjID0gdHJ1ZTtcblx0XHRlID0gZmFsc2U7XG5cdH0gZWxzZSB7XG5cdFx0YyA9IGNvbnRhaW5zLmNhbGwoZHNjciwgJ2MnKTtcblx0XHRlID0gY29udGFpbnMuY2FsbChkc2NyLCAnZScpO1xuXHR9XG5cblx0ZGVzYyA9IHsgZ2V0OiBnZXQsIHNldDogc2V0LCBjb25maWd1cmFibGU6IGMsIGVudW1lcmFibGU6IGUgfTtcblx0cmV0dXJuICFvcHRpb25zID8gZGVzYyA6IGFzc2lnbihub3JtYWxpemVPcHRzKG9wdGlvbnMpLCBkZXNjKTtcbn07XG4iLCIvLyBJbnNwaXJlZCBieSBHb29nbGUgQ2xvc3VyZTpcbi8vIGh0dHA6Ly9jbG9zdXJlLWxpYnJhcnkuZ29vZ2xlY29kZS5jb20vc3ZuL2RvY3MvXG4vLyBjbG9zdXJlX2dvb2dfYXJyYXlfYXJyYXkuanMuaHRtbCNnb29nLmFycmF5LmNsZWFyXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIHZhbHVlID0gcmVxdWlyZSgnLi4vLi4vb2JqZWN0L3ZhbGlkLXZhbHVlJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKCkge1xuXHR2YWx1ZSh0aGlzKS5sZW5ndGggPSAwO1xuXHRyZXR1cm4gdGhpcztcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciB0b1Bvc0ludCA9IHJlcXVpcmUoJy4uLy4uL251bWJlci90by1wb3MtaW50ZWdlcicpXG4gICwgdmFsdWUgICAgPSByZXF1aXJlKCcuLi8uLi9vYmplY3QvdmFsaWQtdmFsdWUnKVxuXG4gICwgaW5kZXhPZiA9IEFycmF5LnByb3RvdHlwZS5pbmRleE9mXG4gICwgaGFzT3duUHJvcGVydHkgPSBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5XG4gICwgYWJzID0gTWF0aC5hYnMsIGZsb29yID0gTWF0aC5mbG9vcjtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoc2VhcmNoRWxlbWVudC8qLCBmcm9tSW5kZXgqLykge1xuXHR2YXIgaSwgbCwgZnJvbUluZGV4LCB2YWw7XG5cdGlmIChzZWFyY2hFbGVtZW50ID09PSBzZWFyY2hFbGVtZW50KSB7IC8vanNsaW50OiBpZ25vcmVcblx0XHRyZXR1cm4gaW5kZXhPZi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXHR9XG5cblx0bCA9IHRvUG9zSW50KHZhbHVlKHRoaXMpLmxlbmd0aCk7XG5cdGZyb21JbmRleCA9IGFyZ3VtZW50c1sxXTtcblx0aWYgKGlzTmFOKGZyb21JbmRleCkpIGZyb21JbmRleCA9IDA7XG5cdGVsc2UgaWYgKGZyb21JbmRleCA+PSAwKSBmcm9tSW5kZXggPSBmbG9vcihmcm9tSW5kZXgpO1xuXHRlbHNlIGZyb21JbmRleCA9IHRvUG9zSW50KHRoaXMubGVuZ3RoKSAtIGZsb29yKGFicyhmcm9tSW5kZXgpKTtcblxuXHRmb3IgKGkgPSBmcm9tSW5kZXg7IGkgPCBsOyArK2kpIHtcblx0XHRpZiAoaGFzT3duUHJvcGVydHkuY2FsbCh0aGlzLCBpKSkge1xuXHRcdFx0dmFsID0gdGhpc1tpXTtcblx0XHRcdGlmICh2YWwgIT09IHZhbCkgcmV0dXJuIGk7IC8vanNsaW50OiBpZ25vcmVcblx0XHR9XG5cdH1cblx0cmV0dXJuIC0xO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKCcuL2lzLWltcGxlbWVudGVkJykoKVxuXHQ/IEFycmF5LmZyb21cblx0OiByZXF1aXJlKCcuL3NoaW0nKTtcbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoKSB7XG5cdHZhciBmcm9tID0gQXJyYXkuZnJvbSwgYXJyLCByZXN1bHQ7XG5cdGlmICh0eXBlb2YgZnJvbSAhPT0gJ2Z1bmN0aW9uJykgcmV0dXJuIGZhbHNlO1xuXHRhcnIgPSBbJ3JheicsICdkd2EnXTtcblx0cmVzdWx0ID0gZnJvbShhcnIpO1xuXHRyZXR1cm4gQm9vbGVhbihyZXN1bHQgJiYgKHJlc3VsdCAhPT0gYXJyKSAmJiAocmVzdWx0WzFdID09PSAnZHdhJykpO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGl0ZXJhdG9yU3ltYm9sID0gcmVxdWlyZSgnZXM2LXN5bWJvbCcpLml0ZXJhdG9yXG4gICwgaXNBcmd1bWVudHMgICAgPSByZXF1aXJlKCcuLi8uLi9mdW5jdGlvbi9pcy1hcmd1bWVudHMnKVxuICAsIGlzRnVuY3Rpb24gICAgID0gcmVxdWlyZSgnLi4vLi4vZnVuY3Rpb24vaXMtZnVuY3Rpb24nKVxuICAsIHRvUG9zSW50ICAgICAgID0gcmVxdWlyZSgnLi4vLi4vbnVtYmVyL3RvLXBvcy1pbnRlZ2VyJylcbiAgLCBjYWxsYWJsZSAgICAgICA9IHJlcXVpcmUoJy4uLy4uL29iamVjdC92YWxpZC1jYWxsYWJsZScpXG4gICwgdmFsaWRWYWx1ZSAgICAgPSByZXF1aXJlKCcuLi8uLi9vYmplY3QvdmFsaWQtdmFsdWUnKVxuICAsIGlzU3RyaW5nICAgICAgID0gcmVxdWlyZSgnLi4vLi4vc3RyaW5nL2lzLXN0cmluZycpXG5cbiAgLCBpc0FycmF5ID0gQXJyYXkuaXNBcnJheSwgY2FsbCA9IEZ1bmN0aW9uLnByb3RvdHlwZS5jYWxsXG4gICwgZGVzYyA9IHsgY29uZmlndXJhYmxlOiB0cnVlLCBlbnVtZXJhYmxlOiB0cnVlLCB3cml0YWJsZTogdHJ1ZSwgdmFsdWU6IG51bGwgfVxuICAsIGRlZmluZVByb3BlcnR5ID0gT2JqZWN0LmRlZmluZVByb3BlcnR5O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChhcnJheUxpa2UvKiwgbWFwRm4sIHRoaXNBcmcqLykge1xuXHR2YXIgbWFwRm4gPSBhcmd1bWVudHNbMV0sIHRoaXNBcmcgPSBhcmd1bWVudHNbMl0sIENvbnN0cnVjdG9yLCBpLCBqLCBhcnIsIGwsIGNvZGUsIGl0ZXJhdG9yXG5cdCAgLCByZXN1bHQsIGdldEl0ZXJhdG9yLCB2YWx1ZTtcblxuXHRhcnJheUxpa2UgPSBPYmplY3QodmFsaWRWYWx1ZShhcnJheUxpa2UpKTtcblxuXHRpZiAobWFwRm4gIT0gbnVsbCkgY2FsbGFibGUobWFwRm4pO1xuXHRpZiAoIXRoaXMgfHwgKHRoaXMgPT09IEFycmF5KSB8fCAhaXNGdW5jdGlvbih0aGlzKSkge1xuXHRcdC8vIFJlc3VsdDogUGxhaW4gYXJyYXlcblx0XHRpZiAoIW1hcEZuKSB7XG5cdFx0XHRpZiAoaXNBcmd1bWVudHMoYXJyYXlMaWtlKSkge1xuXHRcdFx0XHQvLyBTb3VyY2U6IEFyZ3VtZW50c1xuXHRcdFx0XHRsID0gYXJyYXlMaWtlLmxlbmd0aDtcblx0XHRcdFx0aWYgKGwgIT09IDEpIHJldHVybiBBcnJheS5hcHBseShudWxsLCBhcnJheUxpa2UpO1xuXHRcdFx0XHRhcnIgPSBuZXcgQXJyYXkoMSk7XG5cdFx0XHRcdGFyclswXSA9IGFycmF5TGlrZVswXTtcblx0XHRcdFx0cmV0dXJuIGFycjtcblx0XHRcdH1cblx0XHRcdGlmIChpc0FycmF5KGFycmF5TGlrZSkpIHtcblx0XHRcdFx0Ly8gU291cmNlOiBBcnJheVxuXHRcdFx0XHRhcnIgPSBuZXcgQXJyYXkobCA9IGFycmF5TGlrZS5sZW5ndGgpO1xuXHRcdFx0XHRmb3IgKGkgPSAwOyBpIDwgbDsgKytpKSBhcnJbaV0gPSBhcnJheUxpa2VbaV07XG5cdFx0XHRcdHJldHVybiBhcnI7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdGFyciA9IFtdO1xuXHR9IGVsc2Uge1xuXHRcdC8vIFJlc3VsdDogTm9uIHBsYWluIGFycmF5XG5cdFx0Q29uc3RydWN0b3IgPSB0aGlzO1xuXHR9XG5cblx0aWYgKCFpc0FycmF5KGFycmF5TGlrZSkpIHtcblx0XHRpZiAoKGdldEl0ZXJhdG9yID0gYXJyYXlMaWtlW2l0ZXJhdG9yU3ltYm9sXSkgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0Ly8gU291cmNlOiBJdGVyYXRvclxuXHRcdFx0aXRlcmF0b3IgPSBjYWxsYWJsZShnZXRJdGVyYXRvcikuY2FsbChhcnJheUxpa2UpO1xuXHRcdFx0aWYgKENvbnN0cnVjdG9yKSBhcnIgPSBuZXcgQ29uc3RydWN0b3IoKTtcblx0XHRcdHJlc3VsdCA9IGl0ZXJhdG9yLm5leHQoKTtcblx0XHRcdGkgPSAwO1xuXHRcdFx0d2hpbGUgKCFyZXN1bHQuZG9uZSkge1xuXHRcdFx0XHR2YWx1ZSA9IG1hcEZuID8gY2FsbC5jYWxsKG1hcEZuLCB0aGlzQXJnLCByZXN1bHQudmFsdWUsIGkpIDogcmVzdWx0LnZhbHVlO1xuXHRcdFx0XHRpZiAoIUNvbnN0cnVjdG9yKSB7XG5cdFx0XHRcdFx0YXJyW2ldID0gdmFsdWU7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0ZGVzYy52YWx1ZSA9IHZhbHVlO1xuXHRcdFx0XHRcdGRlZmluZVByb3BlcnR5KGFyciwgaSwgZGVzYyk7XG5cdFx0XHRcdH1cblx0XHRcdFx0cmVzdWx0ID0gaXRlcmF0b3IubmV4dCgpO1xuXHRcdFx0XHQrK2k7XG5cdFx0XHR9XG5cdFx0XHRsID0gaTtcblx0XHR9IGVsc2UgaWYgKGlzU3RyaW5nKGFycmF5TGlrZSkpIHtcblx0XHRcdC8vIFNvdXJjZTogU3RyaW5nXG5cdFx0XHRsID0gYXJyYXlMaWtlLmxlbmd0aDtcblx0XHRcdGlmIChDb25zdHJ1Y3RvcikgYXJyID0gbmV3IENvbnN0cnVjdG9yKCk7XG5cdFx0XHRmb3IgKGkgPSAwLCBqID0gMDsgaSA8IGw7ICsraSkge1xuXHRcdFx0XHR2YWx1ZSA9IGFycmF5TGlrZVtpXTtcblx0XHRcdFx0aWYgKChpICsgMSkgPCBsKSB7XG5cdFx0XHRcdFx0Y29kZSA9IHZhbHVlLmNoYXJDb2RlQXQoMCk7XG5cdFx0XHRcdFx0aWYgKChjb2RlID49IDB4RDgwMCkgJiYgKGNvZGUgPD0gMHhEQkZGKSkgdmFsdWUgKz0gYXJyYXlMaWtlWysraV07XG5cdFx0XHRcdH1cblx0XHRcdFx0dmFsdWUgPSBtYXBGbiA/IGNhbGwuY2FsbChtYXBGbiwgdGhpc0FyZywgdmFsdWUsIGopIDogdmFsdWU7XG5cdFx0XHRcdGlmICghQ29uc3RydWN0b3IpIHtcblx0XHRcdFx0XHRhcnJbal0gPSB2YWx1ZTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRkZXNjLnZhbHVlID0gdmFsdWU7XG5cdFx0XHRcdFx0ZGVmaW5lUHJvcGVydHkoYXJyLCBqLCBkZXNjKTtcblx0XHRcdFx0fVxuXHRcdFx0XHQrK2o7XG5cdFx0XHR9XG5cdFx0XHRsID0gajtcblx0XHR9XG5cdH1cblx0aWYgKGwgPT09IHVuZGVmaW5lZCkge1xuXHRcdC8vIFNvdXJjZTogYXJyYXkgb3IgYXJyYXktbGlrZVxuXHRcdGwgPSB0b1Bvc0ludChhcnJheUxpa2UubGVuZ3RoKTtcblx0XHRpZiAoQ29uc3RydWN0b3IpIGFyciA9IG5ldyBDb25zdHJ1Y3RvcihsKTtcblx0XHRmb3IgKGkgPSAwOyBpIDwgbDsgKytpKSB7XG5cdFx0XHR2YWx1ZSA9IG1hcEZuID8gY2FsbC5jYWxsKG1hcEZuLCB0aGlzQXJnLCBhcnJheUxpa2VbaV0sIGkpIDogYXJyYXlMaWtlW2ldO1xuXHRcdFx0aWYgKCFDb25zdHJ1Y3Rvcikge1xuXHRcdFx0XHRhcnJbaV0gPSB2YWx1ZTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGRlc2MudmFsdWUgPSB2YWx1ZTtcblx0XHRcdFx0ZGVmaW5lUHJvcGVydHkoYXJyLCBpLCBkZXNjKTtcblx0XHRcdH1cblx0XHR9XG5cdH1cblx0aWYgKENvbnN0cnVjdG9yKSB7XG5cdFx0ZGVzYy52YWx1ZSA9IG51bGw7XG5cdFx0YXJyLmxlbmd0aCA9IGw7XG5cdH1cblx0cmV0dXJuIGFycjtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciB0b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmdcblxuICAsIGlkID0gdG9TdHJpbmcuY2FsbCgoZnVuY3Rpb24gKCkgeyByZXR1cm4gYXJndW1lbnRzOyB9KCkpKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoeCkgeyByZXR1cm4gKHRvU3RyaW5nLmNhbGwoeCkgPT09IGlkKTsgfTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHRvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZ1xuXG4gICwgaWQgPSB0b1N0cmluZy5jYWxsKHJlcXVpcmUoJy4vbm9vcCcpKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoZikge1xuXHRyZXR1cm4gKHR5cGVvZiBmID09PSBcImZ1bmN0aW9uXCIpICYmICh0b1N0cmluZy5jYWxsKGYpID09PSBpZCk7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uICgpIHt9O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJy4vaXMtaW1wbGVtZW50ZWQnKSgpXG5cdD8gTWF0aC5zaWduXG5cdDogcmVxdWlyZSgnLi9zaGltJyk7XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKCkge1xuXHR2YXIgc2lnbiA9IE1hdGguc2lnbjtcblx0aWYgKHR5cGVvZiBzaWduICE9PSAnZnVuY3Rpb24nKSByZXR1cm4gZmFsc2U7XG5cdHJldHVybiAoKHNpZ24oMTApID09PSAxKSAmJiAoc2lnbigtMjApID09PSAtMSkpO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAodmFsdWUpIHtcblx0dmFsdWUgPSBOdW1iZXIodmFsdWUpO1xuXHRpZiAoaXNOYU4odmFsdWUpIHx8ICh2YWx1ZSA9PT0gMCkpIHJldHVybiB2YWx1ZTtcblx0cmV0dXJuICh2YWx1ZSA+IDApID8gMSA6IC0xO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHNpZ24gPSByZXF1aXJlKCcuLi9tYXRoL3NpZ24nKVxuXG4gICwgYWJzID0gTWF0aC5hYnMsIGZsb29yID0gTWF0aC5mbG9vcjtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAodmFsdWUpIHtcblx0aWYgKGlzTmFOKHZhbHVlKSkgcmV0dXJuIDA7XG5cdHZhbHVlID0gTnVtYmVyKHZhbHVlKTtcblx0aWYgKCh2YWx1ZSA9PT0gMCkgfHwgIWlzRmluaXRlKHZhbHVlKSkgcmV0dXJuIHZhbHVlO1xuXHRyZXR1cm4gc2lnbih2YWx1ZSkgKiBmbG9vcihhYnModmFsdWUpKTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciB0b0ludGVnZXIgPSByZXF1aXJlKCcuL3RvLWludGVnZXInKVxuXG4gICwgbWF4ID0gTWF0aC5tYXg7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKHZhbHVlKSB7IHJldHVybiBtYXgoMCwgdG9JbnRlZ2VyKHZhbHVlKSk7IH07XG4iLCIvLyBJbnRlcm5hbCBtZXRob2QsIHVzZWQgYnkgaXRlcmF0aW9uIGZ1bmN0aW9ucy5cbi8vIENhbGxzIGEgZnVuY3Rpb24gZm9yIGVhY2gga2V5LXZhbHVlIHBhaXIgZm91bmQgaW4gb2JqZWN0XG4vLyBPcHRpb25hbGx5IHRha2VzIGNvbXBhcmVGbiB0byBpdGVyYXRlIG9iamVjdCBpbiBzcGVjaWZpYyBvcmRlclxuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBjYWxsYWJsZSA9IHJlcXVpcmUoJy4vdmFsaWQtY2FsbGFibGUnKVxuICAsIHZhbHVlICAgID0gcmVxdWlyZSgnLi92YWxpZC12YWx1ZScpXG5cbiAgLCBiaW5kID0gRnVuY3Rpb24ucHJvdG90eXBlLmJpbmQsIGNhbGwgPSBGdW5jdGlvbi5wcm90b3R5cGUuY2FsbCwga2V5cyA9IE9iamVjdC5rZXlzXG4gICwgcHJvcGVydHlJc0VudW1lcmFibGUgPSBPYmplY3QucHJvdG90eXBlLnByb3BlcnR5SXNFbnVtZXJhYmxlO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChtZXRob2QsIGRlZlZhbCkge1xuXHRyZXR1cm4gZnVuY3Rpb24gKG9iaiwgY2IvKiwgdGhpc0FyZywgY29tcGFyZUZuKi8pIHtcblx0XHR2YXIgbGlzdCwgdGhpc0FyZyA9IGFyZ3VtZW50c1syXSwgY29tcGFyZUZuID0gYXJndW1lbnRzWzNdO1xuXHRcdG9iaiA9IE9iamVjdCh2YWx1ZShvYmopKTtcblx0XHRjYWxsYWJsZShjYik7XG5cblx0XHRsaXN0ID0ga2V5cyhvYmopO1xuXHRcdGlmIChjb21wYXJlRm4pIHtcblx0XHRcdGxpc3Quc29ydCgodHlwZW9mIGNvbXBhcmVGbiA9PT0gJ2Z1bmN0aW9uJykgPyBiaW5kLmNhbGwoY29tcGFyZUZuLCBvYmopIDogdW5kZWZpbmVkKTtcblx0XHR9XG5cdFx0aWYgKHR5cGVvZiBtZXRob2QgIT09ICdmdW5jdGlvbicpIG1ldGhvZCA9IGxpc3RbbWV0aG9kXTtcblx0XHRyZXR1cm4gY2FsbC5jYWxsKG1ldGhvZCwgbGlzdCwgZnVuY3Rpb24gKGtleSwgaW5kZXgpIHtcblx0XHRcdGlmICghcHJvcGVydHlJc0VudW1lcmFibGUuY2FsbChvYmosIGtleSkpIHJldHVybiBkZWZWYWw7XG5cdFx0XHRyZXR1cm4gY2FsbC5jYWxsKGNiLCB0aGlzQXJnLCBvYmpba2V5XSwga2V5LCBvYmosIGluZGV4KTtcblx0XHR9KTtcblx0fTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnLi9pcy1pbXBsZW1lbnRlZCcpKClcblx0PyBPYmplY3QuYXNzaWduXG5cdDogcmVxdWlyZSgnLi9zaGltJyk7XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKCkge1xuXHR2YXIgYXNzaWduID0gT2JqZWN0LmFzc2lnbiwgb2JqO1xuXHRpZiAodHlwZW9mIGFzc2lnbiAhPT0gJ2Z1bmN0aW9uJykgcmV0dXJuIGZhbHNlO1xuXHRvYmogPSB7IGZvbzogJ3JheicgfTtcblx0YXNzaWduKG9iaiwgeyBiYXI6ICdkd2EnIH0sIHsgdHJ6eTogJ3RyenknIH0pO1xuXHRyZXR1cm4gKG9iai5mb28gKyBvYmouYmFyICsgb2JqLnRyenkpID09PSAncmF6ZHdhdHJ6eSc7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIga2V5cyAgPSByZXF1aXJlKCcuLi9rZXlzJylcbiAgLCB2YWx1ZSA9IHJlcXVpcmUoJy4uL3ZhbGlkLXZhbHVlJylcblxuICAsIG1heCA9IE1hdGgubWF4O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChkZXN0LCBzcmMvKiwg4oCmc3JjbiovKSB7XG5cdHZhciBlcnJvciwgaSwgbCA9IG1heChhcmd1bWVudHMubGVuZ3RoLCAyKSwgYXNzaWduO1xuXHRkZXN0ID0gT2JqZWN0KHZhbHVlKGRlc3QpKTtcblx0YXNzaWduID0gZnVuY3Rpb24gKGtleSkge1xuXHRcdHRyeSB7IGRlc3Rba2V5XSA9IHNyY1trZXldOyB9IGNhdGNoIChlKSB7XG5cdFx0XHRpZiAoIWVycm9yKSBlcnJvciA9IGU7XG5cdFx0fVxuXHR9O1xuXHRmb3IgKGkgPSAxOyBpIDwgbDsgKytpKSB7XG5cdFx0c3JjID0gYXJndW1lbnRzW2ldO1xuXHRcdGtleXMoc3JjKS5mb3JFYWNoKGFzc2lnbik7XG5cdH1cblx0aWYgKGVycm9yICE9PSB1bmRlZmluZWQpIHRocm93IGVycm9yO1xuXHRyZXR1cm4gZGVzdDtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBhRnJvbSAgPSByZXF1aXJlKCcuLi9hcnJheS9mcm9tJylcbiAgLCBhc3NpZ24gPSByZXF1aXJlKCcuL2Fzc2lnbicpXG4gICwgdmFsdWUgID0gcmVxdWlyZSgnLi92YWxpZC12YWx1ZScpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChvYmovKiwgcHJvcGVydHlOYW1lcywgb3B0aW9ucyovKSB7XG5cdHZhciBjb3B5ID0gT2JqZWN0KHZhbHVlKG9iaikpLCBwcm9wZXJ0eU5hbWVzID0gYXJndW1lbnRzWzFdLCBvcHRpb25zID0gT2JqZWN0KGFyZ3VtZW50c1syXSk7XG5cdGlmIChjb3B5ICE9PSBvYmogJiYgIXByb3BlcnR5TmFtZXMpIHJldHVybiBjb3B5O1xuXHR2YXIgcmVzdWx0ID0ge307XG5cdGlmIChwcm9wZXJ0eU5hbWVzKSB7XG5cdFx0YUZyb20ocHJvcGVydHlOYW1lcywgZnVuY3Rpb24gKHByb3BlcnR5TmFtZSkge1xuXHRcdFx0aWYgKG9wdGlvbnMuZW5zdXJlIHx8IHByb3BlcnR5TmFtZSBpbiBvYmopIHJlc3VsdFtwcm9wZXJ0eU5hbWVdID0gb2JqW3Byb3BlcnR5TmFtZV07XG5cdFx0fSk7XG5cdH0gZWxzZSB7XG5cdFx0YXNzaWduKHJlc3VsdCwgb2JqKTtcblx0fVxuXHRyZXR1cm4gcmVzdWx0O1xufTtcbiIsIi8vIFdvcmthcm91bmQgZm9yIGh0dHA6Ly9jb2RlLmdvb2dsZS5jb20vcC92OC9pc3N1ZXMvZGV0YWlsP2lkPTI4MDRcblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgY3JlYXRlID0gT2JqZWN0LmNyZWF0ZSwgc2hpbTtcblxuaWYgKCFyZXF1aXJlKCcuL3NldC1wcm90b3R5cGUtb2YvaXMtaW1wbGVtZW50ZWQnKSgpKSB7XG5cdHNoaW0gPSByZXF1aXJlKCcuL3NldC1wcm90b3R5cGUtb2Yvc2hpbScpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IChmdW5jdGlvbiAoKSB7XG5cdHZhciBudWxsT2JqZWN0LCBwcm9wcywgZGVzYztcblx0aWYgKCFzaGltKSByZXR1cm4gY3JlYXRlO1xuXHRpZiAoc2hpbS5sZXZlbCAhPT0gMSkgcmV0dXJuIGNyZWF0ZTtcblxuXHRudWxsT2JqZWN0ID0ge307XG5cdHByb3BzID0ge307XG5cdGRlc2MgPSB7IGNvbmZpZ3VyYWJsZTogZmFsc2UsIGVudW1lcmFibGU6IGZhbHNlLCB3cml0YWJsZTogdHJ1ZSxcblx0XHR2YWx1ZTogdW5kZWZpbmVkIH07XG5cdE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKE9iamVjdC5wcm90b3R5cGUpLmZvckVhY2goZnVuY3Rpb24gKG5hbWUpIHtcblx0XHRpZiAobmFtZSA9PT0gJ19fcHJvdG9fXycpIHtcblx0XHRcdHByb3BzW25hbWVdID0geyBjb25maWd1cmFibGU6IHRydWUsIGVudW1lcmFibGU6IGZhbHNlLCB3cml0YWJsZTogdHJ1ZSxcblx0XHRcdFx0dmFsdWU6IHVuZGVmaW5lZCB9O1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHRwcm9wc1tuYW1lXSA9IGRlc2M7XG5cdH0pO1xuXHRPYmplY3QuZGVmaW5lUHJvcGVydGllcyhudWxsT2JqZWN0LCBwcm9wcyk7XG5cblx0T2JqZWN0LmRlZmluZVByb3BlcnR5KHNoaW0sICdudWxsUG9seWZpbGwnLCB7IGNvbmZpZ3VyYWJsZTogZmFsc2UsXG5cdFx0ZW51bWVyYWJsZTogZmFsc2UsIHdyaXRhYmxlOiBmYWxzZSwgdmFsdWU6IG51bGxPYmplY3QgfSk7XG5cblx0cmV0dXJuIGZ1bmN0aW9uIChwcm90b3R5cGUsIHByb3BzKSB7XG5cdFx0cmV0dXJuIGNyZWF0ZSgocHJvdG90eXBlID09PSBudWxsKSA/IG51bGxPYmplY3QgOiBwcm90b3R5cGUsIHByb3BzKTtcblx0fTtcbn0oKSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnLi9faXRlcmF0ZScpKCdmb3JFYWNoJyk7XG4iLCIvLyBEZXByZWNhdGVkXG5cbid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAob2JqKSB7IHJldHVybiB0eXBlb2Ygb2JqID09PSAnZnVuY3Rpb24nOyB9O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgbWFwID0geyAnZnVuY3Rpb24nOiB0cnVlLCBvYmplY3Q6IHRydWUgfTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoeCkge1xuXHRyZXR1cm4gKCh4ICE9IG51bGwpICYmIG1hcFt0eXBlb2YgeF0pIHx8IGZhbHNlO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKCcuL2lzLWltcGxlbWVudGVkJykoKVxuXHQ/IE9iamVjdC5rZXlzXG5cdDogcmVxdWlyZSgnLi9zaGltJyk7XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKCkge1xuXHR0cnkge1xuXHRcdE9iamVjdC5rZXlzKCdwcmltaXRpdmUnKTtcblx0XHRyZXR1cm4gdHJ1ZTtcblx0fSBjYXRjaCAoZSkgeyByZXR1cm4gZmFsc2U7IH1cbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBrZXlzID0gT2JqZWN0LmtleXM7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKG9iamVjdCkge1xuXHRyZXR1cm4ga2V5cyhvYmplY3QgPT0gbnVsbCA/IG9iamVjdCA6IE9iamVjdChvYmplY3QpKTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBjYWxsYWJsZSA9IHJlcXVpcmUoJy4vdmFsaWQtY2FsbGFibGUnKVxuICAsIGZvckVhY2ggID0gcmVxdWlyZSgnLi9mb3ItZWFjaCcpXG5cbiAgLCBjYWxsID0gRnVuY3Rpb24ucHJvdG90eXBlLmNhbGw7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKG9iaiwgY2IvKiwgdGhpc0FyZyovKSB7XG5cdHZhciBvID0ge30sIHRoaXNBcmcgPSBhcmd1bWVudHNbMl07XG5cdGNhbGxhYmxlKGNiKTtcblx0Zm9yRWFjaChvYmosIGZ1bmN0aW9uICh2YWx1ZSwga2V5LCBvYmosIGluZGV4KSB7XG5cdFx0b1trZXldID0gY2FsbC5jYWxsKGNiLCB0aGlzQXJnLCB2YWx1ZSwga2V5LCBvYmosIGluZGV4KTtcblx0fSk7XG5cdHJldHVybiBvO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGZvckVhY2ggPSBBcnJheS5wcm90b3R5cGUuZm9yRWFjaCwgY3JlYXRlID0gT2JqZWN0LmNyZWF0ZTtcblxudmFyIHByb2Nlc3MgPSBmdW5jdGlvbiAoc3JjLCBvYmopIHtcblx0dmFyIGtleTtcblx0Zm9yIChrZXkgaW4gc3JjKSBvYmpba2V5XSA9IHNyY1trZXldO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAob3B0aW9ucy8qLCDigKZvcHRpb25zKi8pIHtcblx0dmFyIHJlc3VsdCA9IGNyZWF0ZShudWxsKTtcblx0Zm9yRWFjaC5jYWxsKGFyZ3VtZW50cywgZnVuY3Rpb24gKG9wdGlvbnMpIHtcblx0XHRpZiAob3B0aW9ucyA9PSBudWxsKSByZXR1cm47XG5cdFx0cHJvY2VzcyhPYmplY3Qob3B0aW9ucyksIHJlc3VsdCk7XG5cdH0pO1xuXHRyZXR1cm4gcmVzdWx0O1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGZvckVhY2ggPSBBcnJheS5wcm90b3R5cGUuZm9yRWFjaCwgY3JlYXRlID0gT2JqZWN0LmNyZWF0ZTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoYXJnLyosIOKApmFyZ3MqLykge1xuXHR2YXIgc2V0ID0gY3JlYXRlKG51bGwpO1xuXHRmb3JFYWNoLmNhbGwoYXJndW1lbnRzLCBmdW5jdGlvbiAobmFtZSkgeyBzZXRbbmFtZV0gPSB0cnVlOyB9KTtcblx0cmV0dXJuIHNldDtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnLi9pcy1pbXBsZW1lbnRlZCcpKClcblx0PyBPYmplY3Quc2V0UHJvdG90eXBlT2Zcblx0OiByZXF1aXJlKCcuL3NoaW0nKTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGNyZWF0ZSA9IE9iamVjdC5jcmVhdGUsIGdldFByb3RvdHlwZU9mID0gT2JqZWN0LmdldFByb3RvdHlwZU9mXG4gICwgeCA9IHt9O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uICgvKmN1c3RvbUNyZWF0ZSovKSB7XG5cdHZhciBzZXRQcm90b3R5cGVPZiA9IE9iamVjdC5zZXRQcm90b3R5cGVPZlxuXHQgICwgY3VzdG9tQ3JlYXRlID0gYXJndW1lbnRzWzBdIHx8IGNyZWF0ZTtcblx0aWYgKHR5cGVvZiBzZXRQcm90b3R5cGVPZiAhPT0gJ2Z1bmN0aW9uJykgcmV0dXJuIGZhbHNlO1xuXHRyZXR1cm4gZ2V0UHJvdG90eXBlT2Yoc2V0UHJvdG90eXBlT2YoY3VzdG9tQ3JlYXRlKG51bGwpLCB4KSkgPT09IHg7XG59O1xuIiwiLy8gQmlnIHRoYW5rcyB0byBAV2ViUmVmbGVjdGlvbiBmb3Igc29ydGluZyB0aGlzIG91dFxuLy8gaHR0cHM6Ly9naXN0LmdpdGh1Yi5jb20vV2ViUmVmbGVjdGlvbi81NTkzNTU0XG5cbid1c2Ugc3RyaWN0JztcblxudmFyIGlzT2JqZWN0ICAgICAgPSByZXF1aXJlKCcuLi9pcy1vYmplY3QnKVxuICAsIHZhbHVlICAgICAgICAgPSByZXF1aXJlKCcuLi92YWxpZC12YWx1ZScpXG5cbiAgLCBpc1Byb3RvdHlwZU9mID0gT2JqZWN0LnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mXG4gICwgZGVmaW5lUHJvcGVydHkgPSBPYmplY3QuZGVmaW5lUHJvcGVydHlcbiAgLCBudWxsRGVzYyA9IHsgY29uZmlndXJhYmxlOiB0cnVlLCBlbnVtZXJhYmxlOiBmYWxzZSwgd3JpdGFibGU6IHRydWUsXG5cdFx0dmFsdWU6IHVuZGVmaW5lZCB9XG4gICwgdmFsaWRhdGU7XG5cbnZhbGlkYXRlID0gZnVuY3Rpb24gKG9iaiwgcHJvdG90eXBlKSB7XG5cdHZhbHVlKG9iaik7XG5cdGlmICgocHJvdG90eXBlID09PSBudWxsKSB8fCBpc09iamVjdChwcm90b3R5cGUpKSByZXR1cm4gb2JqO1xuXHR0aHJvdyBuZXcgVHlwZUVycm9yKCdQcm90b3R5cGUgbXVzdCBiZSBudWxsIG9yIGFuIG9iamVjdCcpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSAoZnVuY3Rpb24gKHN0YXR1cykge1xuXHR2YXIgZm4sIHNldDtcblx0aWYgKCFzdGF0dXMpIHJldHVybiBudWxsO1xuXHRpZiAoc3RhdHVzLmxldmVsID09PSAyKSB7XG5cdFx0aWYgKHN0YXR1cy5zZXQpIHtcblx0XHRcdHNldCA9IHN0YXR1cy5zZXQ7XG5cdFx0XHRmbiA9IGZ1bmN0aW9uIChvYmosIHByb3RvdHlwZSkge1xuXHRcdFx0XHRzZXQuY2FsbCh2YWxpZGF0ZShvYmosIHByb3RvdHlwZSksIHByb3RvdHlwZSk7XG5cdFx0XHRcdHJldHVybiBvYmo7XG5cdFx0XHR9O1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRmbiA9IGZ1bmN0aW9uIChvYmosIHByb3RvdHlwZSkge1xuXHRcdFx0XHR2YWxpZGF0ZShvYmosIHByb3RvdHlwZSkuX19wcm90b19fID0gcHJvdG90eXBlO1xuXHRcdFx0XHRyZXR1cm4gb2JqO1xuXHRcdFx0fTtcblx0XHR9XG5cdH0gZWxzZSB7XG5cdFx0Zm4gPSBmdW5jdGlvbiBzZWxmKG9iaiwgcHJvdG90eXBlKSB7XG5cdFx0XHR2YXIgaXNOdWxsQmFzZTtcblx0XHRcdHZhbGlkYXRlKG9iaiwgcHJvdG90eXBlKTtcblx0XHRcdGlzTnVsbEJhc2UgPSBpc1Byb3RvdHlwZU9mLmNhbGwoc2VsZi5udWxsUG9seWZpbGwsIG9iaik7XG5cdFx0XHRpZiAoaXNOdWxsQmFzZSkgZGVsZXRlIHNlbGYubnVsbFBvbHlmaWxsLl9fcHJvdG9fXztcblx0XHRcdGlmIChwcm90b3R5cGUgPT09IG51bGwpIHByb3RvdHlwZSA9IHNlbGYubnVsbFBvbHlmaWxsO1xuXHRcdFx0b2JqLl9fcHJvdG9fXyA9IHByb3RvdHlwZTtcblx0XHRcdGlmIChpc051bGxCYXNlKSBkZWZpbmVQcm9wZXJ0eShzZWxmLm51bGxQb2x5ZmlsbCwgJ19fcHJvdG9fXycsIG51bGxEZXNjKTtcblx0XHRcdHJldHVybiBvYmo7XG5cdFx0fTtcblx0fVxuXHRyZXR1cm4gT2JqZWN0LmRlZmluZVByb3BlcnR5KGZuLCAnbGV2ZWwnLCB7IGNvbmZpZ3VyYWJsZTogZmFsc2UsXG5cdFx0ZW51bWVyYWJsZTogZmFsc2UsIHdyaXRhYmxlOiBmYWxzZSwgdmFsdWU6IHN0YXR1cy5sZXZlbCB9KTtcbn0oKGZ1bmN0aW9uICgpIHtcblx0dmFyIHggPSBPYmplY3QuY3JlYXRlKG51bGwpLCB5ID0ge30sIHNldFxuXHQgICwgZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IoT2JqZWN0LnByb3RvdHlwZSwgJ19fcHJvdG9fXycpO1xuXG5cdGlmIChkZXNjKSB7XG5cdFx0dHJ5IHtcblx0XHRcdHNldCA9IGRlc2Muc2V0OyAvLyBPcGVyYSBjcmFzaGVzIGF0IHRoaXMgcG9pbnRcblx0XHRcdHNldC5jYWxsKHgsIHkpO1xuXHRcdH0gY2F0Y2ggKGlnbm9yZSkgeyB9XG5cdFx0aWYgKE9iamVjdC5nZXRQcm90b3R5cGVPZih4KSA9PT0geSkgcmV0dXJuIHsgc2V0OiBzZXQsIGxldmVsOiAyIH07XG5cdH1cblxuXHR4Ll9fcHJvdG9fXyA9IHk7XG5cdGlmIChPYmplY3QuZ2V0UHJvdG90eXBlT2YoeCkgPT09IHkpIHJldHVybiB7IGxldmVsOiAyIH07XG5cblx0eCA9IHt9O1xuXHR4Ll9fcHJvdG9fXyA9IHk7XG5cdGlmIChPYmplY3QuZ2V0UHJvdG90eXBlT2YoeCkgPT09IHkpIHJldHVybiB7IGxldmVsOiAxIH07XG5cblx0cmV0dXJuIGZhbHNlO1xufSgpKSkpO1xuXG5yZXF1aXJlKCcuLi9jcmVhdGUnKTtcbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoZm4pIHtcblx0aWYgKHR5cGVvZiBmbiAhPT0gJ2Z1bmN0aW9uJykgdGhyb3cgbmV3IFR5cGVFcnJvcihmbiArIFwiIGlzIG5vdCBhIGZ1bmN0aW9uXCIpO1xuXHRyZXR1cm4gZm47XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuXHRpZiAodmFsdWUgPT0gbnVsbCkgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkNhbm5vdCB1c2UgbnVsbCBvciB1bmRlZmluZWRcIik7XG5cdHJldHVybiB2YWx1ZTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnLi9pcy1pbXBsZW1lbnRlZCcpKClcblx0PyBTdHJpbmcucHJvdG90eXBlLmNvbnRhaW5zXG5cdDogcmVxdWlyZSgnLi9zaGltJyk7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBzdHIgPSAncmF6ZHdhdHJ6eSc7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKCkge1xuXHRpZiAodHlwZW9mIHN0ci5jb250YWlucyAhPT0gJ2Z1bmN0aW9uJykgcmV0dXJuIGZhbHNlO1xuXHRyZXR1cm4gKChzdHIuY29udGFpbnMoJ2R3YScpID09PSB0cnVlKSAmJiAoc3RyLmNvbnRhaW5zKCdmb28nKSA9PT0gZmFsc2UpKTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBpbmRleE9mID0gU3RyaW5nLnByb3RvdHlwZS5pbmRleE9mO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChzZWFyY2hTdHJpbmcvKiwgcG9zaXRpb24qLykge1xuXHRyZXR1cm4gaW5kZXhPZi5jYWxsKHRoaXMsIHNlYXJjaFN0cmluZywgYXJndW1lbnRzWzFdKSA+IC0xO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHRvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZ1xuXG4gICwgaWQgPSB0b1N0cmluZy5jYWxsKCcnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoeCkge1xuXHRyZXR1cm4gKHR5cGVvZiB4ID09PSAnc3RyaW5nJykgfHwgKHggJiYgKHR5cGVvZiB4ID09PSAnb2JqZWN0JykgJiZcblx0XHQoKHggaW5zdGFuY2VvZiBTdHJpbmcpIHx8ICh0b1N0cmluZy5jYWxsKHgpID09PSBpZCkpKSB8fCBmYWxzZTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBzZXRQcm90b3R5cGVPZiA9IHJlcXVpcmUoJ2VzNS1leHQvb2JqZWN0L3NldC1wcm90b3R5cGUtb2YnKVxuICAsIGNvbnRhaW5zICAgICAgID0gcmVxdWlyZSgnZXM1LWV4dC9zdHJpbmcvIy9jb250YWlucycpXG4gICwgZCAgICAgICAgICAgICAgPSByZXF1aXJlKCdkJylcbiAgLCBJdGVyYXRvciAgICAgICA9IHJlcXVpcmUoJy4vJylcblxuICAsIGRlZmluZVByb3BlcnR5ID0gT2JqZWN0LmRlZmluZVByb3BlcnR5XG4gICwgQXJyYXlJdGVyYXRvcjtcblxuQXJyYXlJdGVyYXRvciA9IG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGFyciwga2luZCkge1xuXHRpZiAoISh0aGlzIGluc3RhbmNlb2YgQXJyYXlJdGVyYXRvcikpIHJldHVybiBuZXcgQXJyYXlJdGVyYXRvcihhcnIsIGtpbmQpO1xuXHRJdGVyYXRvci5jYWxsKHRoaXMsIGFycik7XG5cdGlmICgha2luZCkga2luZCA9ICd2YWx1ZSc7XG5cdGVsc2UgaWYgKGNvbnRhaW5zLmNhbGwoa2luZCwgJ2tleSt2YWx1ZScpKSBraW5kID0gJ2tleSt2YWx1ZSc7XG5cdGVsc2UgaWYgKGNvbnRhaW5zLmNhbGwoa2luZCwgJ2tleScpKSBraW5kID0gJ2tleSc7XG5cdGVsc2Uga2luZCA9ICd2YWx1ZSc7XG5cdGRlZmluZVByb3BlcnR5KHRoaXMsICdfX2tpbmRfXycsIGQoJycsIGtpbmQpKTtcbn07XG5pZiAoc2V0UHJvdG90eXBlT2YpIHNldFByb3RvdHlwZU9mKEFycmF5SXRlcmF0b3IsIEl0ZXJhdG9yKTtcblxuQXJyYXlJdGVyYXRvci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEl0ZXJhdG9yLnByb3RvdHlwZSwge1xuXHRjb25zdHJ1Y3RvcjogZChBcnJheUl0ZXJhdG9yKSxcblx0X3Jlc29sdmU6IGQoZnVuY3Rpb24gKGkpIHtcblx0XHRpZiAodGhpcy5fX2tpbmRfXyA9PT0gJ3ZhbHVlJykgcmV0dXJuIHRoaXMuX19saXN0X19baV07XG5cdFx0aWYgKHRoaXMuX19raW5kX18gPT09ICdrZXkrdmFsdWUnKSByZXR1cm4gW2ksIHRoaXMuX19saXN0X19baV1dO1xuXHRcdHJldHVybiBpO1xuXHR9KSxcblx0dG9TdHJpbmc6IGQoZnVuY3Rpb24gKCkgeyByZXR1cm4gJ1tvYmplY3QgQXJyYXkgSXRlcmF0b3JdJzsgfSlcbn0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgaXNBcmd1bWVudHMgPSByZXF1aXJlKCdlczUtZXh0L2Z1bmN0aW9uL2lzLWFyZ3VtZW50cycpXG4gICwgY2FsbGFibGUgICAgPSByZXF1aXJlKCdlczUtZXh0L29iamVjdC92YWxpZC1jYWxsYWJsZScpXG4gICwgaXNTdHJpbmcgICAgPSByZXF1aXJlKCdlczUtZXh0L3N0cmluZy9pcy1zdHJpbmcnKVxuICAsIGdldCAgICAgICAgID0gcmVxdWlyZSgnLi9nZXQnKVxuXG4gICwgaXNBcnJheSA9IEFycmF5LmlzQXJyYXksIGNhbGwgPSBGdW5jdGlvbi5wcm90b3R5cGUuY2FsbFxuICAsIHNvbWUgPSBBcnJheS5wcm90b3R5cGUuc29tZTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoaXRlcmFibGUsIGNiLyosIHRoaXNBcmcqLykge1xuXHR2YXIgbW9kZSwgdGhpc0FyZyA9IGFyZ3VtZW50c1syXSwgcmVzdWx0LCBkb0JyZWFrLCBicm9rZW4sIGksIGwsIGNoYXIsIGNvZGU7XG5cdGlmIChpc0FycmF5KGl0ZXJhYmxlKSB8fCBpc0FyZ3VtZW50cyhpdGVyYWJsZSkpIG1vZGUgPSAnYXJyYXknO1xuXHRlbHNlIGlmIChpc1N0cmluZyhpdGVyYWJsZSkpIG1vZGUgPSAnc3RyaW5nJztcblx0ZWxzZSBpdGVyYWJsZSA9IGdldChpdGVyYWJsZSk7XG5cblx0Y2FsbGFibGUoY2IpO1xuXHRkb0JyZWFrID0gZnVuY3Rpb24gKCkgeyBicm9rZW4gPSB0cnVlOyB9O1xuXHRpZiAobW9kZSA9PT0gJ2FycmF5Jykge1xuXHRcdHNvbWUuY2FsbChpdGVyYWJsZSwgZnVuY3Rpb24gKHZhbHVlKSB7XG5cdFx0XHRjYWxsLmNhbGwoY2IsIHRoaXNBcmcsIHZhbHVlLCBkb0JyZWFrKTtcblx0XHRcdGlmIChicm9rZW4pIHJldHVybiB0cnVlO1xuXHRcdH0pO1xuXHRcdHJldHVybjtcblx0fVxuXHRpZiAobW9kZSA9PT0gJ3N0cmluZycpIHtcblx0XHRsID0gaXRlcmFibGUubGVuZ3RoO1xuXHRcdGZvciAoaSA9IDA7IGkgPCBsOyArK2kpIHtcblx0XHRcdGNoYXIgPSBpdGVyYWJsZVtpXTtcblx0XHRcdGlmICgoaSArIDEpIDwgbCkge1xuXHRcdFx0XHRjb2RlID0gY2hhci5jaGFyQ29kZUF0KDApO1xuXHRcdFx0XHRpZiAoKGNvZGUgPj0gMHhEODAwKSAmJiAoY29kZSA8PSAweERCRkYpKSBjaGFyICs9IGl0ZXJhYmxlWysraV07XG5cdFx0XHR9XG5cdFx0XHRjYWxsLmNhbGwoY2IsIHRoaXNBcmcsIGNoYXIsIGRvQnJlYWspO1xuXHRcdFx0aWYgKGJyb2tlbikgYnJlYWs7XG5cdFx0fVxuXHRcdHJldHVybjtcblx0fVxuXHRyZXN1bHQgPSBpdGVyYWJsZS5uZXh0KCk7XG5cblx0d2hpbGUgKCFyZXN1bHQuZG9uZSkge1xuXHRcdGNhbGwuY2FsbChjYiwgdGhpc0FyZywgcmVzdWx0LnZhbHVlLCBkb0JyZWFrKTtcblx0XHRpZiAoYnJva2VuKSByZXR1cm47XG5cdFx0cmVzdWx0ID0gaXRlcmFibGUubmV4dCgpO1xuXHR9XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgaXNBcmd1bWVudHMgICAgPSByZXF1aXJlKCdlczUtZXh0L2Z1bmN0aW9uL2lzLWFyZ3VtZW50cycpXG4gICwgaXNTdHJpbmcgICAgICAgPSByZXF1aXJlKCdlczUtZXh0L3N0cmluZy9pcy1zdHJpbmcnKVxuICAsIEFycmF5SXRlcmF0b3IgID0gcmVxdWlyZSgnLi9hcnJheScpXG4gICwgU3RyaW5nSXRlcmF0b3IgPSByZXF1aXJlKCcuL3N0cmluZycpXG4gICwgaXRlcmFibGUgICAgICAgPSByZXF1aXJlKCcuL3ZhbGlkLWl0ZXJhYmxlJylcbiAgLCBpdGVyYXRvclN5bWJvbCA9IHJlcXVpcmUoJ2VzNi1zeW1ib2wnKS5pdGVyYXRvcjtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAob2JqKSB7XG5cdGlmICh0eXBlb2YgaXRlcmFibGUob2JqKVtpdGVyYXRvclN5bWJvbF0gPT09ICdmdW5jdGlvbicpIHJldHVybiBvYmpbaXRlcmF0b3JTeW1ib2xdKCk7XG5cdGlmIChpc0FyZ3VtZW50cyhvYmopKSByZXR1cm4gbmV3IEFycmF5SXRlcmF0b3Iob2JqKTtcblx0aWYgKGlzU3RyaW5nKG9iaikpIHJldHVybiBuZXcgU3RyaW5nSXRlcmF0b3Iob2JqKTtcblx0cmV0dXJuIG5ldyBBcnJheUl0ZXJhdG9yKG9iaik7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgY2xlYXIgICAgPSByZXF1aXJlKCdlczUtZXh0L2FycmF5LyMvY2xlYXInKVxuICAsIGFzc2lnbiAgID0gcmVxdWlyZSgnZXM1LWV4dC9vYmplY3QvYXNzaWduJylcbiAgLCBjYWxsYWJsZSA9IHJlcXVpcmUoJ2VzNS1leHQvb2JqZWN0L3ZhbGlkLWNhbGxhYmxlJylcbiAgLCB2YWx1ZSAgICA9IHJlcXVpcmUoJ2VzNS1leHQvb2JqZWN0L3ZhbGlkLXZhbHVlJylcbiAgLCBkICAgICAgICA9IHJlcXVpcmUoJ2QnKVxuICAsIGF1dG9CaW5kID0gcmVxdWlyZSgnZC9hdXRvLWJpbmQnKVxuICAsIFN5bWJvbCAgID0gcmVxdWlyZSgnZXM2LXN5bWJvbCcpXG5cbiAgLCBkZWZpbmVQcm9wZXJ0eSA9IE9iamVjdC5kZWZpbmVQcm9wZXJ0eVxuICAsIGRlZmluZVByb3BlcnRpZXMgPSBPYmplY3QuZGVmaW5lUHJvcGVydGllc1xuICAsIEl0ZXJhdG9yO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEl0ZXJhdG9yID0gZnVuY3Rpb24gKGxpc3QsIGNvbnRleHQpIHtcblx0aWYgKCEodGhpcyBpbnN0YW5jZW9mIEl0ZXJhdG9yKSkgcmV0dXJuIG5ldyBJdGVyYXRvcihsaXN0LCBjb250ZXh0KTtcblx0ZGVmaW5lUHJvcGVydGllcyh0aGlzLCB7XG5cdFx0X19saXN0X186IGQoJ3cnLCB2YWx1ZShsaXN0KSksXG5cdFx0X19jb250ZXh0X186IGQoJ3cnLCBjb250ZXh0KSxcblx0XHRfX25leHRJbmRleF9fOiBkKCd3JywgMClcblx0fSk7XG5cdGlmICghY29udGV4dCkgcmV0dXJuO1xuXHRjYWxsYWJsZShjb250ZXh0Lm9uKTtcblx0Y29udGV4dC5vbignX2FkZCcsIHRoaXMuX29uQWRkKTtcblx0Y29udGV4dC5vbignX2RlbGV0ZScsIHRoaXMuX29uRGVsZXRlKTtcblx0Y29udGV4dC5vbignX2NsZWFyJywgdGhpcy5fb25DbGVhcik7XG59O1xuXG5kZWZpbmVQcm9wZXJ0aWVzKEl0ZXJhdG9yLnByb3RvdHlwZSwgYXNzaWduKHtcblx0Y29uc3RydWN0b3I6IGQoSXRlcmF0b3IpLFxuXHRfbmV4dDogZChmdW5jdGlvbiAoKSB7XG5cdFx0dmFyIGk7XG5cdFx0aWYgKCF0aGlzLl9fbGlzdF9fKSByZXR1cm47XG5cdFx0aWYgKHRoaXMuX19yZWRvX18pIHtcblx0XHRcdGkgPSB0aGlzLl9fcmVkb19fLnNoaWZ0KCk7XG5cdFx0XHRpZiAoaSAhPT0gdW5kZWZpbmVkKSByZXR1cm4gaTtcblx0XHR9XG5cdFx0aWYgKHRoaXMuX19uZXh0SW5kZXhfXyA8IHRoaXMuX19saXN0X18ubGVuZ3RoKSByZXR1cm4gdGhpcy5fX25leHRJbmRleF9fKys7XG5cdFx0dGhpcy5fdW5CaW5kKCk7XG5cdH0pLFxuXHRuZXh0OiBkKGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXMuX2NyZWF0ZVJlc3VsdCh0aGlzLl9uZXh0KCkpOyB9KSxcblx0X2NyZWF0ZVJlc3VsdDogZChmdW5jdGlvbiAoaSkge1xuXHRcdGlmIChpID09PSB1bmRlZmluZWQpIHJldHVybiB7IGRvbmU6IHRydWUsIHZhbHVlOiB1bmRlZmluZWQgfTtcblx0XHRyZXR1cm4geyBkb25lOiBmYWxzZSwgdmFsdWU6IHRoaXMuX3Jlc29sdmUoaSkgfTtcblx0fSksXG5cdF9yZXNvbHZlOiBkKGZ1bmN0aW9uIChpKSB7IHJldHVybiB0aGlzLl9fbGlzdF9fW2ldOyB9KSxcblx0X3VuQmluZDogZChmdW5jdGlvbiAoKSB7XG5cdFx0dGhpcy5fX2xpc3RfXyA9IG51bGw7XG5cdFx0ZGVsZXRlIHRoaXMuX19yZWRvX187XG5cdFx0aWYgKCF0aGlzLl9fY29udGV4dF9fKSByZXR1cm47XG5cdFx0dGhpcy5fX2NvbnRleHRfXy5vZmYoJ19hZGQnLCB0aGlzLl9vbkFkZCk7XG5cdFx0dGhpcy5fX2NvbnRleHRfXy5vZmYoJ19kZWxldGUnLCB0aGlzLl9vbkRlbGV0ZSk7XG5cdFx0dGhpcy5fX2NvbnRleHRfXy5vZmYoJ19jbGVhcicsIHRoaXMuX29uQ2xlYXIpO1xuXHRcdHRoaXMuX19jb250ZXh0X18gPSBudWxsO1xuXHR9KSxcblx0dG9TdHJpbmc6IGQoZnVuY3Rpb24gKCkgeyByZXR1cm4gJ1tvYmplY3QgSXRlcmF0b3JdJzsgfSlcbn0sIGF1dG9CaW5kKHtcblx0X29uQWRkOiBkKGZ1bmN0aW9uIChpbmRleCkge1xuXHRcdGlmIChpbmRleCA+PSB0aGlzLl9fbmV4dEluZGV4X18pIHJldHVybjtcblx0XHQrK3RoaXMuX19uZXh0SW5kZXhfXztcblx0XHRpZiAoIXRoaXMuX19yZWRvX18pIHtcblx0XHRcdGRlZmluZVByb3BlcnR5KHRoaXMsICdfX3JlZG9fXycsIGQoJ2MnLCBbaW5kZXhdKSk7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdHRoaXMuX19yZWRvX18uZm9yRWFjaChmdW5jdGlvbiAocmVkbywgaSkge1xuXHRcdFx0aWYgKHJlZG8gPj0gaW5kZXgpIHRoaXMuX19yZWRvX19baV0gPSArK3JlZG87XG5cdFx0fSwgdGhpcyk7XG5cdFx0dGhpcy5fX3JlZG9fXy5wdXNoKGluZGV4KTtcblx0fSksXG5cdF9vbkRlbGV0ZTogZChmdW5jdGlvbiAoaW5kZXgpIHtcblx0XHR2YXIgaTtcblx0XHRpZiAoaW5kZXggPj0gdGhpcy5fX25leHRJbmRleF9fKSByZXR1cm47XG5cdFx0LS10aGlzLl9fbmV4dEluZGV4X187XG5cdFx0aWYgKCF0aGlzLl9fcmVkb19fKSByZXR1cm47XG5cdFx0aSA9IHRoaXMuX19yZWRvX18uaW5kZXhPZihpbmRleCk7XG5cdFx0aWYgKGkgIT09IC0xKSB0aGlzLl9fcmVkb19fLnNwbGljZShpLCAxKTtcblx0XHR0aGlzLl9fcmVkb19fLmZvckVhY2goZnVuY3Rpb24gKHJlZG8sIGkpIHtcblx0XHRcdGlmIChyZWRvID4gaW5kZXgpIHRoaXMuX19yZWRvX19baV0gPSAtLXJlZG87XG5cdFx0fSwgdGhpcyk7XG5cdH0pLFxuXHRfb25DbGVhcjogZChmdW5jdGlvbiAoKSB7XG5cdFx0aWYgKHRoaXMuX19yZWRvX18pIGNsZWFyLmNhbGwodGhpcy5fX3JlZG9fXyk7XG5cdFx0dGhpcy5fX25leHRJbmRleF9fID0gMDtcblx0fSlcbn0pKSk7XG5cbmRlZmluZVByb3BlcnR5KEl0ZXJhdG9yLnByb3RvdHlwZSwgU3ltYm9sLml0ZXJhdG9yLCBkKGZ1bmN0aW9uICgpIHtcblx0cmV0dXJuIHRoaXM7XG59KSk7XG5kZWZpbmVQcm9wZXJ0eShJdGVyYXRvci5wcm90b3R5cGUsIFN5bWJvbC50b1N0cmluZ1RhZywgZCgnJywgJ0l0ZXJhdG9yJykpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgaXNBcmd1bWVudHMgICAgPSByZXF1aXJlKCdlczUtZXh0L2Z1bmN0aW9uL2lzLWFyZ3VtZW50cycpXG4gICwgaXNTdHJpbmcgICAgICAgPSByZXF1aXJlKCdlczUtZXh0L3N0cmluZy9pcy1zdHJpbmcnKVxuICAsIGl0ZXJhdG9yU3ltYm9sID0gcmVxdWlyZSgnZXM2LXN5bWJvbCcpLml0ZXJhdG9yXG5cbiAgLCBpc0FycmF5ID0gQXJyYXkuaXNBcnJheTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAodmFsdWUpIHtcblx0aWYgKHZhbHVlID09IG51bGwpIHJldHVybiBmYWxzZTtcblx0aWYgKGlzQXJyYXkodmFsdWUpKSByZXR1cm4gdHJ1ZTtcblx0aWYgKGlzU3RyaW5nKHZhbHVlKSkgcmV0dXJuIHRydWU7XG5cdGlmIChpc0FyZ3VtZW50cyh2YWx1ZSkpIHJldHVybiB0cnVlO1xuXHRyZXR1cm4gKHR5cGVvZiB2YWx1ZVtpdGVyYXRvclN5bWJvbF0gPT09ICdmdW5jdGlvbicpO1xufTtcbiIsIi8vIFRoYW5rcyBAbWF0aGlhc2J5bmVuc1xuLy8gaHR0cDovL21hdGhpYXNieW5lbnMuYmUvbm90ZXMvamF2YXNjcmlwdC11bmljb2RlI2l0ZXJhdGluZy1vdmVyLXN5bWJvbHNcblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgc2V0UHJvdG90eXBlT2YgPSByZXF1aXJlKCdlczUtZXh0L29iamVjdC9zZXQtcHJvdG90eXBlLW9mJylcbiAgLCBkICAgICAgICAgICAgICA9IHJlcXVpcmUoJ2QnKVxuICAsIEl0ZXJhdG9yICAgICAgID0gcmVxdWlyZSgnLi8nKVxuXG4gICwgZGVmaW5lUHJvcGVydHkgPSBPYmplY3QuZGVmaW5lUHJvcGVydHlcbiAgLCBTdHJpbmdJdGVyYXRvcjtcblxuU3RyaW5nSXRlcmF0b3IgPSBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChzdHIpIHtcblx0aWYgKCEodGhpcyBpbnN0YW5jZW9mIFN0cmluZ0l0ZXJhdG9yKSkgcmV0dXJuIG5ldyBTdHJpbmdJdGVyYXRvcihzdHIpO1xuXHRzdHIgPSBTdHJpbmcoc3RyKTtcblx0SXRlcmF0b3IuY2FsbCh0aGlzLCBzdHIpO1xuXHRkZWZpbmVQcm9wZXJ0eSh0aGlzLCAnX19sZW5ndGhfXycsIGQoJycsIHN0ci5sZW5ndGgpKTtcblxufTtcbmlmIChzZXRQcm90b3R5cGVPZikgc2V0UHJvdG90eXBlT2YoU3RyaW5nSXRlcmF0b3IsIEl0ZXJhdG9yKTtcblxuU3RyaW5nSXRlcmF0b3IucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShJdGVyYXRvci5wcm90b3R5cGUsIHtcblx0Y29uc3RydWN0b3I6IGQoU3RyaW5nSXRlcmF0b3IpLFxuXHRfbmV4dDogZChmdW5jdGlvbiAoKSB7XG5cdFx0aWYgKCF0aGlzLl9fbGlzdF9fKSByZXR1cm47XG5cdFx0aWYgKHRoaXMuX19uZXh0SW5kZXhfXyA8IHRoaXMuX19sZW5ndGhfXykgcmV0dXJuIHRoaXMuX19uZXh0SW5kZXhfXysrO1xuXHRcdHRoaXMuX3VuQmluZCgpO1xuXHR9KSxcblx0X3Jlc29sdmU6IGQoZnVuY3Rpb24gKGkpIHtcblx0XHR2YXIgY2hhciA9IHRoaXMuX19saXN0X19baV0sIGNvZGU7XG5cdFx0aWYgKHRoaXMuX19uZXh0SW5kZXhfXyA9PT0gdGhpcy5fX2xlbmd0aF9fKSByZXR1cm4gY2hhcjtcblx0XHRjb2RlID0gY2hhci5jaGFyQ29kZUF0KDApO1xuXHRcdGlmICgoY29kZSA+PSAweEQ4MDApICYmIChjb2RlIDw9IDB4REJGRikpIHJldHVybiBjaGFyICsgdGhpcy5fX2xpc3RfX1t0aGlzLl9fbmV4dEluZGV4X18rK107XG5cdFx0cmV0dXJuIGNoYXI7XG5cdH0pLFxuXHR0b1N0cmluZzogZChmdW5jdGlvbiAoKSB7IHJldHVybiAnW29iamVjdCBTdHJpbmcgSXRlcmF0b3JdJzsgfSlcbn0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgaXNJdGVyYWJsZSA9IHJlcXVpcmUoJy4vaXMtaXRlcmFibGUnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAodmFsdWUpIHtcblx0aWYgKCFpc0l0ZXJhYmxlKHZhbHVlKSkgdGhyb3cgbmV3IFR5cGVFcnJvcih2YWx1ZSArIFwiIGlzIG5vdCBpdGVyYWJsZVwiKTtcblx0cmV0dXJuIHZhbHVlO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKCcuL2lzLWltcGxlbWVudGVkJykoKSA/IE1hcCA6IHJlcXVpcmUoJy4vcG9seWZpbGwnKTtcbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoKSB7XG5cdHZhciBtYXAsIGl0ZXJhdG9yLCByZXN1bHQ7XG5cdGlmICh0eXBlb2YgTWFwICE9PSAnZnVuY3Rpb24nKSByZXR1cm4gZmFsc2U7XG5cdHRyeSB7XG5cdFx0Ly8gV2ViS2l0IGRvZXNuJ3Qgc3VwcG9ydCBhcmd1bWVudHMgYW5kIGNyYXNoZXNcblx0XHRtYXAgPSBuZXcgTWFwKFtbJ3JheicsICdvbmUnXSwgWydkd2EnLCAndHdvJ10sIFsndHJ6eScsICd0aHJlZSddXSk7XG5cdH0gY2F0Y2ggKGUpIHtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblx0aWYgKFN0cmluZyhtYXApICE9PSAnW29iamVjdCBNYXBdJykgcmV0dXJuIGZhbHNlO1xuXHRpZiAobWFwLnNpemUgIT09IDMpIHJldHVybiBmYWxzZTtcblx0aWYgKHR5cGVvZiBtYXAuY2xlYXIgIT09ICdmdW5jdGlvbicpIHJldHVybiBmYWxzZTtcblx0aWYgKHR5cGVvZiBtYXAuZGVsZXRlICE9PSAnZnVuY3Rpb24nKSByZXR1cm4gZmFsc2U7XG5cdGlmICh0eXBlb2YgbWFwLmVudHJpZXMgIT09ICdmdW5jdGlvbicpIHJldHVybiBmYWxzZTtcblx0aWYgKHR5cGVvZiBtYXAuZm9yRWFjaCAhPT0gJ2Z1bmN0aW9uJykgcmV0dXJuIGZhbHNlO1xuXHRpZiAodHlwZW9mIG1hcC5nZXQgIT09ICdmdW5jdGlvbicpIHJldHVybiBmYWxzZTtcblx0aWYgKHR5cGVvZiBtYXAuaGFzICE9PSAnZnVuY3Rpb24nKSByZXR1cm4gZmFsc2U7XG5cdGlmICh0eXBlb2YgbWFwLmtleXMgIT09ICdmdW5jdGlvbicpIHJldHVybiBmYWxzZTtcblx0aWYgKHR5cGVvZiBtYXAuc2V0ICE9PSAnZnVuY3Rpb24nKSByZXR1cm4gZmFsc2U7XG5cdGlmICh0eXBlb2YgbWFwLnZhbHVlcyAhPT0gJ2Z1bmN0aW9uJykgcmV0dXJuIGZhbHNlO1xuXG5cdGl0ZXJhdG9yID0gbWFwLmVudHJpZXMoKTtcblx0cmVzdWx0ID0gaXRlcmF0b3IubmV4dCgpO1xuXHRpZiAocmVzdWx0LmRvbmUgIT09IGZhbHNlKSByZXR1cm4gZmFsc2U7XG5cdGlmICghcmVzdWx0LnZhbHVlKSByZXR1cm4gZmFsc2U7XG5cdGlmIChyZXN1bHQudmFsdWVbMF0gIT09ICdyYXonKSByZXR1cm4gZmFsc2U7XG5cdGlmIChyZXN1bHQudmFsdWVbMV0gIT09ICdvbmUnKSByZXR1cm4gZmFsc2U7XG5cblx0cmV0dXJuIHRydWU7XG59O1xuIiwiLy8gRXhwb3J0cyB0cnVlIGlmIGVudmlyb25tZW50IHByb3ZpZGVzIG5hdGl2ZSBgTWFwYCBpbXBsZW1lbnRhdGlvbixcbi8vIHdoYXRldmVyIHRoYXQgaXMuXG5cbid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSAoZnVuY3Rpb24gKCkge1xuXHRpZiAodHlwZW9mIE1hcCA9PT0gJ3VuZGVmaW5lZCcpIHJldHVybiBmYWxzZTtcblx0cmV0dXJuIChPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwobmV3IE1hcCgpKSA9PT0gJ1tvYmplY3QgTWFwXScpO1xufSgpKTtcbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKCdlczUtZXh0L29iamVjdC9wcmltaXRpdmUtc2V0JykoJ2tleScsXG5cdCd2YWx1ZScsICdrZXkrdmFsdWUnKTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHNldFByb3RvdHlwZU9mICAgID0gcmVxdWlyZSgnZXM1LWV4dC9vYmplY3Qvc2V0LXByb3RvdHlwZS1vZicpXG4gICwgZCAgICAgICAgICAgICAgICAgPSByZXF1aXJlKCdkJylcbiAgLCBJdGVyYXRvciAgICAgICAgICA9IHJlcXVpcmUoJ2VzNi1pdGVyYXRvcicpXG4gICwgdG9TdHJpbmdUYWdTeW1ib2wgPSByZXF1aXJlKCdlczYtc3ltYm9sJykudG9TdHJpbmdUYWdcbiAgLCBraW5kcyAgICAgICAgICAgICA9IHJlcXVpcmUoJy4vaXRlcmF0b3Ita2luZHMnKVxuXG4gICwgZGVmaW5lUHJvcGVydGllcyA9IE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzXG4gICwgdW5CaW5kID0gSXRlcmF0b3IucHJvdG90eXBlLl91bkJpbmRcbiAgLCBNYXBJdGVyYXRvcjtcblxuTWFwSXRlcmF0b3IgPSBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChtYXAsIGtpbmQpIHtcblx0aWYgKCEodGhpcyBpbnN0YW5jZW9mIE1hcEl0ZXJhdG9yKSkgcmV0dXJuIG5ldyBNYXBJdGVyYXRvcihtYXAsIGtpbmQpO1xuXHRJdGVyYXRvci5jYWxsKHRoaXMsIG1hcC5fX21hcEtleXNEYXRhX18sIG1hcCk7XG5cdGlmICgha2luZCB8fCAha2luZHNba2luZF0pIGtpbmQgPSAna2V5K3ZhbHVlJztcblx0ZGVmaW5lUHJvcGVydGllcyh0aGlzLCB7XG5cdFx0X19raW5kX186IGQoJycsIGtpbmQpLFxuXHRcdF9fdmFsdWVzX186IGQoJ3cnLCBtYXAuX19tYXBWYWx1ZXNEYXRhX18pXG5cdH0pO1xufTtcbmlmIChzZXRQcm90b3R5cGVPZikgc2V0UHJvdG90eXBlT2YoTWFwSXRlcmF0b3IsIEl0ZXJhdG9yKTtcblxuTWFwSXRlcmF0b3IucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShJdGVyYXRvci5wcm90b3R5cGUsIHtcblx0Y29uc3RydWN0b3I6IGQoTWFwSXRlcmF0b3IpLFxuXHRfcmVzb2x2ZTogZChmdW5jdGlvbiAoaSkge1xuXHRcdGlmICh0aGlzLl9fa2luZF9fID09PSAndmFsdWUnKSByZXR1cm4gdGhpcy5fX3ZhbHVlc19fW2ldO1xuXHRcdGlmICh0aGlzLl9fa2luZF9fID09PSAna2V5JykgcmV0dXJuIHRoaXMuX19saXN0X19baV07XG5cdFx0cmV0dXJuIFt0aGlzLl9fbGlzdF9fW2ldLCB0aGlzLl9fdmFsdWVzX19baV1dO1xuXHR9KSxcblx0X3VuQmluZDogZChmdW5jdGlvbiAoKSB7XG5cdFx0dGhpcy5fX3ZhbHVlc19fID0gbnVsbDtcblx0XHR1bkJpbmQuY2FsbCh0aGlzKTtcblx0fSksXG5cdHRvU3RyaW5nOiBkKGZ1bmN0aW9uICgpIHsgcmV0dXJuICdbb2JqZWN0IE1hcCBJdGVyYXRvcl0nOyB9KVxufSk7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoTWFwSXRlcmF0b3IucHJvdG90eXBlLCB0b1N0cmluZ1RhZ1N5bWJvbCxcblx0ZCgnYycsICdNYXAgSXRlcmF0b3InKSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBjbGVhciAgICAgICAgICA9IHJlcXVpcmUoJ2VzNS1leHQvYXJyYXkvIy9jbGVhcicpXG4gICwgZUluZGV4T2YgICAgICAgPSByZXF1aXJlKCdlczUtZXh0L2FycmF5LyMvZS1pbmRleC1vZicpXG4gICwgc2V0UHJvdG90eXBlT2YgPSByZXF1aXJlKCdlczUtZXh0L29iamVjdC9zZXQtcHJvdG90eXBlLW9mJylcbiAgLCBjYWxsYWJsZSAgICAgICA9IHJlcXVpcmUoJ2VzNS1leHQvb2JqZWN0L3ZhbGlkLWNhbGxhYmxlJylcbiAgLCB2YWxpZFZhbHVlICAgICA9IHJlcXVpcmUoJ2VzNS1leHQvb2JqZWN0L3ZhbGlkLXZhbHVlJylcbiAgLCBkICAgICAgICAgICAgICA9IHJlcXVpcmUoJ2QnKVxuICAsIGVlICAgICAgICAgICAgID0gcmVxdWlyZSgnZXZlbnQtZW1pdHRlcicpXG4gICwgU3ltYm9sICAgICAgICAgPSByZXF1aXJlKCdlczYtc3ltYm9sJylcbiAgLCBpdGVyYXRvciAgICAgICA9IHJlcXVpcmUoJ2VzNi1pdGVyYXRvci92YWxpZC1pdGVyYWJsZScpXG4gICwgZm9yT2YgICAgICAgICAgPSByZXF1aXJlKCdlczYtaXRlcmF0b3IvZm9yLW9mJylcbiAgLCBJdGVyYXRvciAgICAgICA9IHJlcXVpcmUoJy4vbGliL2l0ZXJhdG9yJylcbiAgLCBpc05hdGl2ZSAgICAgICA9IHJlcXVpcmUoJy4vaXMtbmF0aXZlLWltcGxlbWVudGVkJylcblxuICAsIGNhbGwgPSBGdW5jdGlvbi5wcm90b3R5cGUuY2FsbFxuICAsIGRlZmluZVByb3BlcnRpZXMgPSBPYmplY3QuZGVmaW5lUHJvcGVydGllcywgZ2V0UHJvdG90eXBlT2YgPSBPYmplY3QuZ2V0UHJvdG90eXBlT2ZcbiAgLCBNYXBQb2x5O1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1hcFBvbHkgPSBmdW5jdGlvbiAoLyppdGVyYWJsZSovKSB7XG5cdHZhciBpdGVyYWJsZSA9IGFyZ3VtZW50c1swXSwga2V5cywgdmFsdWVzLCBzZWxmO1xuXHRpZiAoISh0aGlzIGluc3RhbmNlb2YgTWFwUG9seSkpIHRocm93IG5ldyBUeXBlRXJyb3IoJ0NvbnN0cnVjdG9yIHJlcXVpcmVzIFxcJ25ld1xcJycpO1xuXHRpZiAoaXNOYXRpdmUgJiYgc2V0UHJvdG90eXBlT2YgJiYgKE1hcCAhPT0gTWFwUG9seSkpIHtcblx0XHRzZWxmID0gc2V0UHJvdG90eXBlT2YobmV3IE1hcCgpLCBnZXRQcm90b3R5cGVPZih0aGlzKSk7XG5cdH0gZWxzZSB7XG5cdFx0c2VsZiA9IHRoaXM7XG5cdH1cblx0aWYgKGl0ZXJhYmxlICE9IG51bGwpIGl0ZXJhdG9yKGl0ZXJhYmxlKTtcblx0ZGVmaW5lUHJvcGVydGllcyhzZWxmLCB7XG5cdFx0X19tYXBLZXlzRGF0YV9fOiBkKCdjJywga2V5cyA9IFtdKSxcblx0XHRfX21hcFZhbHVlc0RhdGFfXzogZCgnYycsIHZhbHVlcyA9IFtdKVxuXHR9KTtcblx0aWYgKCFpdGVyYWJsZSkgcmV0dXJuIHNlbGY7XG5cdGZvck9mKGl0ZXJhYmxlLCBmdW5jdGlvbiAodmFsdWUpIHtcblx0XHR2YXIga2V5ID0gdmFsaWRWYWx1ZSh2YWx1ZSlbMF07XG5cdFx0dmFsdWUgPSB2YWx1ZVsxXTtcblx0XHRpZiAoZUluZGV4T2YuY2FsbChrZXlzLCBrZXkpICE9PSAtMSkgcmV0dXJuO1xuXHRcdGtleXMucHVzaChrZXkpO1xuXHRcdHZhbHVlcy5wdXNoKHZhbHVlKTtcblx0fSwgc2VsZik7XG5cdHJldHVybiBzZWxmO1xufTtcblxuaWYgKGlzTmF0aXZlKSB7XG5cdGlmIChzZXRQcm90b3R5cGVPZikgc2V0UHJvdG90eXBlT2YoTWFwUG9seSwgTWFwKTtcblx0TWFwUG9seS5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKE1hcC5wcm90b3R5cGUsIHtcblx0XHRjb25zdHJ1Y3RvcjogZChNYXBQb2x5KVxuXHR9KTtcbn1cblxuZWUoZGVmaW5lUHJvcGVydGllcyhNYXBQb2x5LnByb3RvdHlwZSwge1xuXHRjbGVhcjogZChmdW5jdGlvbiAoKSB7XG5cdFx0aWYgKCF0aGlzLl9fbWFwS2V5c0RhdGFfXy5sZW5ndGgpIHJldHVybjtcblx0XHRjbGVhci5jYWxsKHRoaXMuX19tYXBLZXlzRGF0YV9fKTtcblx0XHRjbGVhci5jYWxsKHRoaXMuX19tYXBWYWx1ZXNEYXRhX18pO1xuXHRcdHRoaXMuZW1pdCgnX2NsZWFyJyk7XG5cdH0pLFxuXHRkZWxldGU6IGQoZnVuY3Rpb24gKGtleSkge1xuXHRcdHZhciBpbmRleCA9IGVJbmRleE9mLmNhbGwodGhpcy5fX21hcEtleXNEYXRhX18sIGtleSk7XG5cdFx0aWYgKGluZGV4ID09PSAtMSkgcmV0dXJuIGZhbHNlO1xuXHRcdHRoaXMuX19tYXBLZXlzRGF0YV9fLnNwbGljZShpbmRleCwgMSk7XG5cdFx0dGhpcy5fX21hcFZhbHVlc0RhdGFfXy5zcGxpY2UoaW5kZXgsIDEpO1xuXHRcdHRoaXMuZW1pdCgnX2RlbGV0ZScsIGluZGV4LCBrZXkpO1xuXHRcdHJldHVybiB0cnVlO1xuXHR9KSxcblx0ZW50cmllczogZChmdW5jdGlvbiAoKSB7IHJldHVybiBuZXcgSXRlcmF0b3IodGhpcywgJ2tleSt2YWx1ZScpOyB9KSxcblx0Zm9yRWFjaDogZChmdW5jdGlvbiAoY2IvKiwgdGhpc0FyZyovKSB7XG5cdFx0dmFyIHRoaXNBcmcgPSBhcmd1bWVudHNbMV0sIGl0ZXJhdG9yLCByZXN1bHQ7XG5cdFx0Y2FsbGFibGUoY2IpO1xuXHRcdGl0ZXJhdG9yID0gdGhpcy5lbnRyaWVzKCk7XG5cdFx0cmVzdWx0ID0gaXRlcmF0b3IuX25leHQoKTtcblx0XHR3aGlsZSAocmVzdWx0ICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdGNhbGwuY2FsbChjYiwgdGhpc0FyZywgdGhpcy5fX21hcFZhbHVlc0RhdGFfX1tyZXN1bHRdLFxuXHRcdFx0XHR0aGlzLl9fbWFwS2V5c0RhdGFfX1tyZXN1bHRdLCB0aGlzKTtcblx0XHRcdHJlc3VsdCA9IGl0ZXJhdG9yLl9uZXh0KCk7XG5cdFx0fVxuXHR9KSxcblx0Z2V0OiBkKGZ1bmN0aW9uIChrZXkpIHtcblx0XHR2YXIgaW5kZXggPSBlSW5kZXhPZi5jYWxsKHRoaXMuX19tYXBLZXlzRGF0YV9fLCBrZXkpO1xuXHRcdGlmIChpbmRleCA9PT0gLTEpIHJldHVybjtcblx0XHRyZXR1cm4gdGhpcy5fX21hcFZhbHVlc0RhdGFfX1tpbmRleF07XG5cdH0pLFxuXHRoYXM6IGQoZnVuY3Rpb24gKGtleSkge1xuXHRcdHJldHVybiAoZUluZGV4T2YuY2FsbCh0aGlzLl9fbWFwS2V5c0RhdGFfXywga2V5KSAhPT0gLTEpO1xuXHR9KSxcblx0a2V5czogZChmdW5jdGlvbiAoKSB7IHJldHVybiBuZXcgSXRlcmF0b3IodGhpcywgJ2tleScpOyB9KSxcblx0c2V0OiBkKGZ1bmN0aW9uIChrZXksIHZhbHVlKSB7XG5cdFx0dmFyIGluZGV4ID0gZUluZGV4T2YuY2FsbCh0aGlzLl9fbWFwS2V5c0RhdGFfXywga2V5KSwgZW1pdDtcblx0XHRpZiAoaW5kZXggPT09IC0xKSB7XG5cdFx0XHRpbmRleCA9IHRoaXMuX19tYXBLZXlzRGF0YV9fLnB1c2goa2V5KSAtIDE7XG5cdFx0XHRlbWl0ID0gdHJ1ZTtcblx0XHR9XG5cdFx0dGhpcy5fX21hcFZhbHVlc0RhdGFfX1tpbmRleF0gPSB2YWx1ZTtcblx0XHRpZiAoZW1pdCkgdGhpcy5lbWl0KCdfYWRkJywgaW5kZXgsIGtleSk7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0pLFxuXHRzaXplOiBkLmdzKGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXMuX19tYXBLZXlzRGF0YV9fLmxlbmd0aDsgfSksXG5cdHZhbHVlczogZChmdW5jdGlvbiAoKSB7IHJldHVybiBuZXcgSXRlcmF0b3IodGhpcywgJ3ZhbHVlJyk7IH0pLFxuXHR0b1N0cmluZzogZChmdW5jdGlvbiAoKSB7IHJldHVybiAnW29iamVjdCBNYXBdJzsgfSlcbn0pKTtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShNYXBQb2x5LnByb3RvdHlwZSwgU3ltYm9sLml0ZXJhdG9yLCBkKGZ1bmN0aW9uICgpIHtcblx0cmV0dXJuIHRoaXMuZW50cmllcygpO1xufSkpO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KE1hcFBvbHkucHJvdG90eXBlLCBTeW1ib2wudG9TdHJpbmdUYWcsIGQoJ2MnLCAnTWFwJykpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJy4vaXMtaW1wbGVtZW50ZWQnKSgpID8gU3ltYm9sIDogcmVxdWlyZSgnLi9wb2x5ZmlsbCcpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgdmFsaWRUeXBlcyA9IHsgb2JqZWN0OiB0cnVlLCBzeW1ib2w6IHRydWUgfTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoKSB7XG5cdHZhciBzeW1ib2w7XG5cdGlmICh0eXBlb2YgU3ltYm9sICE9PSAnZnVuY3Rpb24nKSByZXR1cm4gZmFsc2U7XG5cdHN5bWJvbCA9IFN5bWJvbCgndGVzdCBzeW1ib2wnKTtcblx0dHJ5IHsgU3RyaW5nKHN5bWJvbCk7IH0gY2F0Y2ggKGUpIHsgcmV0dXJuIGZhbHNlOyB9XG5cblx0Ly8gUmV0dXJuICd0cnVlJyBhbHNvIGZvciBwb2x5ZmlsbHNcblx0aWYgKCF2YWxpZFR5cGVzW3R5cGVvZiBTeW1ib2wuaXRlcmF0b3JdKSByZXR1cm4gZmFsc2U7XG5cdGlmICghdmFsaWRUeXBlc1t0eXBlb2YgU3ltYm9sLnRvUHJpbWl0aXZlXSkgcmV0dXJuIGZhbHNlO1xuXHRpZiAoIXZhbGlkVHlwZXNbdHlwZW9mIFN5bWJvbC50b1N0cmluZ1RhZ10pIHJldHVybiBmYWxzZTtcblxuXHRyZXR1cm4gdHJ1ZTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKHgpIHtcblx0aWYgKCF4KSByZXR1cm4gZmFsc2U7XG5cdGlmICh0eXBlb2YgeCA9PT0gJ3N5bWJvbCcpIHJldHVybiB0cnVlO1xuXHRpZiAoIXguY29uc3RydWN0b3IpIHJldHVybiBmYWxzZTtcblx0aWYgKHguY29uc3RydWN0b3IubmFtZSAhPT0gJ1N5bWJvbCcpIHJldHVybiBmYWxzZTtcblx0cmV0dXJuICh4W3guY29uc3RydWN0b3IudG9TdHJpbmdUYWddID09PSAnU3ltYm9sJyk7XG59O1xuIiwiLy8gRVMyMDE1IFN5bWJvbCBwb2x5ZmlsbCBmb3IgZW52aXJvbm1lbnRzIHRoYXQgZG8gbm90IChvciBwYXJ0aWFsbHkpIHN1cHBvcnQgaXRcblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgZCAgICAgICAgICAgICAgPSByZXF1aXJlKCdkJylcbiAgLCB2YWxpZGF0ZVN5bWJvbCA9IHJlcXVpcmUoJy4vdmFsaWRhdGUtc3ltYm9sJylcblxuICAsIGNyZWF0ZSA9IE9iamVjdC5jcmVhdGUsIGRlZmluZVByb3BlcnRpZXMgPSBPYmplY3QuZGVmaW5lUHJvcGVydGllc1xuICAsIGRlZmluZVByb3BlcnR5ID0gT2JqZWN0LmRlZmluZVByb3BlcnR5LCBvYmpQcm90b3R5cGUgPSBPYmplY3QucHJvdG90eXBlXG4gICwgTmF0aXZlU3ltYm9sLCBTeW1ib2xQb2x5ZmlsbCwgSGlkZGVuU3ltYm9sLCBnbG9iYWxTeW1ib2xzID0gY3JlYXRlKG51bGwpXG4gICwgaXNOYXRpdmVTYWZlO1xuXG5pZiAodHlwZW9mIFN5bWJvbCA9PT0gJ2Z1bmN0aW9uJykge1xuXHROYXRpdmVTeW1ib2wgPSBTeW1ib2w7XG5cdHRyeSB7XG5cdFx0U3RyaW5nKE5hdGl2ZVN5bWJvbCgpKTtcblx0XHRpc05hdGl2ZVNhZmUgPSB0cnVlO1xuXHR9IGNhdGNoIChpZ25vcmUpIHt9XG59XG5cbnZhciBnZW5lcmF0ZU5hbWUgPSAoZnVuY3Rpb24gKCkge1xuXHR2YXIgY3JlYXRlZCA9IGNyZWF0ZShudWxsKTtcblx0cmV0dXJuIGZ1bmN0aW9uIChkZXNjKSB7XG5cdFx0dmFyIHBvc3RmaXggPSAwLCBuYW1lLCBpZTExQnVnV29ya2Fyb3VuZDtcblx0XHR3aGlsZSAoY3JlYXRlZFtkZXNjICsgKHBvc3RmaXggfHwgJycpXSkgKytwb3N0Zml4O1xuXHRcdGRlc2MgKz0gKHBvc3RmaXggfHwgJycpO1xuXHRcdGNyZWF0ZWRbZGVzY10gPSB0cnVlO1xuXHRcdG5hbWUgPSAnQEAnICsgZGVzYztcblx0XHRkZWZpbmVQcm9wZXJ0eShvYmpQcm90b3R5cGUsIG5hbWUsIGQuZ3MobnVsbCwgZnVuY3Rpb24gKHZhbHVlKSB7XG5cdFx0XHQvLyBGb3IgSUUxMSBpc3N1ZSBzZWU6XG5cdFx0XHQvLyBodHRwczovL2Nvbm5lY3QubWljcm9zb2Z0LmNvbS9JRS9mZWVkYmFja2RldGFpbC92aWV3LzE5Mjg1MDgvXG5cdFx0XHQvLyAgICBpZTExLWJyb2tlbi1nZXR0ZXJzLW9uLWRvbS1vYmplY3RzXG5cdFx0XHQvLyBodHRwczovL2dpdGh1Yi5jb20vbWVkaWtvby9lczYtc3ltYm9sL2lzc3Vlcy8xMlxuXHRcdFx0aWYgKGllMTFCdWdXb3JrYXJvdW5kKSByZXR1cm47XG5cdFx0XHRpZTExQnVnV29ya2Fyb3VuZCA9IHRydWU7XG5cdFx0XHRkZWZpbmVQcm9wZXJ0eSh0aGlzLCBuYW1lLCBkKHZhbHVlKSk7XG5cdFx0XHRpZTExQnVnV29ya2Fyb3VuZCA9IGZhbHNlO1xuXHRcdH0pKTtcblx0XHRyZXR1cm4gbmFtZTtcblx0fTtcbn0oKSk7XG5cbi8vIEludGVybmFsIGNvbnN0cnVjdG9yIChub3Qgb25lIGV4cG9zZWQpIGZvciBjcmVhdGluZyBTeW1ib2wgaW5zdGFuY2VzLlxuLy8gVGhpcyBvbmUgaXMgdXNlZCB0byBlbnN1cmUgdGhhdCBgc29tZVN5bWJvbCBpbnN0YW5jZW9mIFN5bWJvbGAgYWx3YXlzIHJldHVybiBmYWxzZVxuSGlkZGVuU3ltYm9sID0gZnVuY3Rpb24gU3ltYm9sKGRlc2NyaXB0aW9uKSB7XG5cdGlmICh0aGlzIGluc3RhbmNlb2YgSGlkZGVuU3ltYm9sKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdTeW1ib2wgaXMgbm90IGEgY29uc3RydWN0b3InKTtcblx0cmV0dXJuIFN5bWJvbFBvbHlmaWxsKGRlc2NyaXB0aW9uKTtcbn07XG5cbi8vIEV4cG9zZWQgYFN5bWJvbGAgY29uc3RydWN0b3Jcbi8vIChyZXR1cm5zIGluc3RhbmNlcyBvZiBIaWRkZW5TeW1ib2wpXG5tb2R1bGUuZXhwb3J0cyA9IFN5bWJvbFBvbHlmaWxsID0gZnVuY3Rpb24gU3ltYm9sKGRlc2NyaXB0aW9uKSB7XG5cdHZhciBzeW1ib2w7XG5cdGlmICh0aGlzIGluc3RhbmNlb2YgU3ltYm9sKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdTeW1ib2wgaXMgbm90IGEgY29uc3RydWN0b3InKTtcblx0aWYgKGlzTmF0aXZlU2FmZSkgcmV0dXJuIE5hdGl2ZVN5bWJvbChkZXNjcmlwdGlvbik7XG5cdHN5bWJvbCA9IGNyZWF0ZShIaWRkZW5TeW1ib2wucHJvdG90eXBlKTtcblx0ZGVzY3JpcHRpb24gPSAoZGVzY3JpcHRpb24gPT09IHVuZGVmaW5lZCA/ICcnIDogU3RyaW5nKGRlc2NyaXB0aW9uKSk7XG5cdHJldHVybiBkZWZpbmVQcm9wZXJ0aWVzKHN5bWJvbCwge1xuXHRcdF9fZGVzY3JpcHRpb25fXzogZCgnJywgZGVzY3JpcHRpb24pLFxuXHRcdF9fbmFtZV9fOiBkKCcnLCBnZW5lcmF0ZU5hbWUoZGVzY3JpcHRpb24pKVxuXHR9KTtcbn07XG5kZWZpbmVQcm9wZXJ0aWVzKFN5bWJvbFBvbHlmaWxsLCB7XG5cdGZvcjogZChmdW5jdGlvbiAoa2V5KSB7XG5cdFx0aWYgKGdsb2JhbFN5bWJvbHNba2V5XSkgcmV0dXJuIGdsb2JhbFN5bWJvbHNba2V5XTtcblx0XHRyZXR1cm4gKGdsb2JhbFN5bWJvbHNba2V5XSA9IFN5bWJvbFBvbHlmaWxsKFN0cmluZyhrZXkpKSk7XG5cdH0pLFxuXHRrZXlGb3I6IGQoZnVuY3Rpb24gKHMpIHtcblx0XHR2YXIga2V5O1xuXHRcdHZhbGlkYXRlU3ltYm9sKHMpO1xuXHRcdGZvciAoa2V5IGluIGdsb2JhbFN5bWJvbHMpIGlmIChnbG9iYWxTeW1ib2xzW2tleV0gPT09IHMpIHJldHVybiBrZXk7XG5cdH0pLFxuXG5cdC8vIFRvIGVuc3VyZSBwcm9wZXIgaW50ZXJvcGVyYWJpbGl0eSB3aXRoIG90aGVyIG5hdGl2ZSBmdW5jdGlvbnMgKGUuZy4gQXJyYXkuZnJvbSlcblx0Ly8gZmFsbGJhY2sgdG8gZXZlbnR1YWwgbmF0aXZlIGltcGxlbWVudGF0aW9uIG9mIGdpdmVuIHN5bWJvbFxuXHRoYXNJbnN0YW5jZTogZCgnJywgKE5hdGl2ZVN5bWJvbCAmJiBOYXRpdmVTeW1ib2wuaGFzSW5zdGFuY2UpIHx8IFN5bWJvbFBvbHlmaWxsKCdoYXNJbnN0YW5jZScpKSxcblx0aXNDb25jYXRTcHJlYWRhYmxlOiBkKCcnLCAoTmF0aXZlU3ltYm9sICYmIE5hdGl2ZVN5bWJvbC5pc0NvbmNhdFNwcmVhZGFibGUpIHx8XG5cdFx0U3ltYm9sUG9seWZpbGwoJ2lzQ29uY2F0U3ByZWFkYWJsZScpKSxcblx0aXRlcmF0b3I6IGQoJycsIChOYXRpdmVTeW1ib2wgJiYgTmF0aXZlU3ltYm9sLml0ZXJhdG9yKSB8fCBTeW1ib2xQb2x5ZmlsbCgnaXRlcmF0b3InKSksXG5cdG1hdGNoOiBkKCcnLCAoTmF0aXZlU3ltYm9sICYmIE5hdGl2ZVN5bWJvbC5tYXRjaCkgfHwgU3ltYm9sUG9seWZpbGwoJ21hdGNoJykpLFxuXHRyZXBsYWNlOiBkKCcnLCAoTmF0aXZlU3ltYm9sICYmIE5hdGl2ZVN5bWJvbC5yZXBsYWNlKSB8fCBTeW1ib2xQb2x5ZmlsbCgncmVwbGFjZScpKSxcblx0c2VhcmNoOiBkKCcnLCAoTmF0aXZlU3ltYm9sICYmIE5hdGl2ZVN5bWJvbC5zZWFyY2gpIHx8IFN5bWJvbFBvbHlmaWxsKCdzZWFyY2gnKSksXG5cdHNwZWNpZXM6IGQoJycsIChOYXRpdmVTeW1ib2wgJiYgTmF0aXZlU3ltYm9sLnNwZWNpZXMpIHx8IFN5bWJvbFBvbHlmaWxsKCdzcGVjaWVzJykpLFxuXHRzcGxpdDogZCgnJywgKE5hdGl2ZVN5bWJvbCAmJiBOYXRpdmVTeW1ib2wuc3BsaXQpIHx8IFN5bWJvbFBvbHlmaWxsKCdzcGxpdCcpKSxcblx0dG9QcmltaXRpdmU6IGQoJycsIChOYXRpdmVTeW1ib2wgJiYgTmF0aXZlU3ltYm9sLnRvUHJpbWl0aXZlKSB8fCBTeW1ib2xQb2x5ZmlsbCgndG9QcmltaXRpdmUnKSksXG5cdHRvU3RyaW5nVGFnOiBkKCcnLCAoTmF0aXZlU3ltYm9sICYmIE5hdGl2ZVN5bWJvbC50b1N0cmluZ1RhZykgfHwgU3ltYm9sUG9seWZpbGwoJ3RvU3RyaW5nVGFnJykpLFxuXHR1bnNjb3BhYmxlczogZCgnJywgKE5hdGl2ZVN5bWJvbCAmJiBOYXRpdmVTeW1ib2wudW5zY29wYWJsZXMpIHx8IFN5bWJvbFBvbHlmaWxsKCd1bnNjb3BhYmxlcycpKVxufSk7XG5cbi8vIEludGVybmFsIHR3ZWFrcyBmb3IgcmVhbCBzeW1ib2wgcHJvZHVjZXJcbmRlZmluZVByb3BlcnRpZXMoSGlkZGVuU3ltYm9sLnByb3RvdHlwZSwge1xuXHRjb25zdHJ1Y3RvcjogZChTeW1ib2xQb2x5ZmlsbCksXG5cdHRvU3RyaW5nOiBkKCcnLCBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzLl9fbmFtZV9fOyB9KVxufSk7XG5cbi8vIFByb3BlciBpbXBsZW1lbnRhdGlvbiBvZiBtZXRob2RzIGV4cG9zZWQgb24gU3ltYm9sLnByb3RvdHlwZVxuLy8gVGhleSB3b24ndCBiZSBhY2Nlc3NpYmxlIG9uIHByb2R1Y2VkIHN5bWJvbCBpbnN0YW5jZXMgYXMgdGhleSBkZXJpdmUgZnJvbSBIaWRkZW5TeW1ib2wucHJvdG90eXBlXG5kZWZpbmVQcm9wZXJ0aWVzKFN5bWJvbFBvbHlmaWxsLnByb3RvdHlwZSwge1xuXHR0b1N0cmluZzogZChmdW5jdGlvbiAoKSB7IHJldHVybiAnU3ltYm9sICgnICsgdmFsaWRhdGVTeW1ib2wodGhpcykuX19kZXNjcmlwdGlvbl9fICsgJyknOyB9KSxcblx0dmFsdWVPZjogZChmdW5jdGlvbiAoKSB7IHJldHVybiB2YWxpZGF0ZVN5bWJvbCh0aGlzKTsgfSlcbn0pO1xuZGVmaW5lUHJvcGVydHkoU3ltYm9sUG9seWZpbGwucHJvdG90eXBlLCBTeW1ib2xQb2x5ZmlsbC50b1ByaW1pdGl2ZSwgZCgnJywgZnVuY3Rpb24gKCkge1xuXHR2YXIgc3ltYm9sID0gdmFsaWRhdGVTeW1ib2wodGhpcyk7XG5cdGlmICh0eXBlb2Ygc3ltYm9sID09PSAnc3ltYm9sJykgcmV0dXJuIHN5bWJvbDtcblx0cmV0dXJuIHN5bWJvbC50b1N0cmluZygpO1xufSkpO1xuZGVmaW5lUHJvcGVydHkoU3ltYm9sUG9seWZpbGwucHJvdG90eXBlLCBTeW1ib2xQb2x5ZmlsbC50b1N0cmluZ1RhZywgZCgnYycsICdTeW1ib2wnKSk7XG5cbi8vIFByb3BlciBpbXBsZW1lbnRhdG9uIG9mIHRvUHJpbWl0aXZlIGFuZCB0b1N0cmluZ1RhZyBmb3IgcmV0dXJuZWQgc3ltYm9sIGluc3RhbmNlc1xuZGVmaW5lUHJvcGVydHkoSGlkZGVuU3ltYm9sLnByb3RvdHlwZSwgU3ltYm9sUG9seWZpbGwudG9TdHJpbmdUYWcsXG5cdGQoJ2MnLCBTeW1ib2xQb2x5ZmlsbC5wcm90b3R5cGVbU3ltYm9sUG9seWZpbGwudG9TdHJpbmdUYWddKSk7XG5cbi8vIE5vdGU6IEl0J3MgaW1wb3J0YW50IHRvIGRlZmluZSBgdG9QcmltaXRpdmVgIGFzIGxhc3Qgb25lLCBhcyBzb21lIGltcGxlbWVudGF0aW9uc1xuLy8gaW1wbGVtZW50IGB0b1ByaW1pdGl2ZWAgbmF0aXZlbHkgd2l0aG91dCBpbXBsZW1lbnRpbmcgYHRvU3RyaW5nVGFnYCAob3Igb3RoZXIgc3BlY2lmaWVkIHN5bWJvbHMpXG4vLyBBbmQgdGhhdCBtYXkgaW52b2tlIGVycm9yIGluIGRlZmluaXRpb24gZmxvdzpcbi8vIFNlZTogaHR0cHM6Ly9naXRodWIuY29tL21lZGlrb28vZXM2LXN5bWJvbC9pc3N1ZXMvMTMjaXNzdWVjb21tZW50LTE2NDE0NjE0OVxuZGVmaW5lUHJvcGVydHkoSGlkZGVuU3ltYm9sLnByb3RvdHlwZSwgU3ltYm9sUG9seWZpbGwudG9QcmltaXRpdmUsXG5cdGQoJ2MnLCBTeW1ib2xQb2x5ZmlsbC5wcm90b3R5cGVbU3ltYm9sUG9seWZpbGwudG9QcmltaXRpdmVdKSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBpc1N5bWJvbCA9IHJlcXVpcmUoJy4vaXMtc3ltYm9sJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKHZhbHVlKSB7XG5cdGlmICghaXNTeW1ib2wodmFsdWUpKSB0aHJvdyBuZXcgVHlwZUVycm9yKHZhbHVlICsgXCIgaXMgbm90IGEgc3ltYm9sXCIpO1xuXHRyZXR1cm4gdmFsdWU7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgZCAgICAgICAgPSByZXF1aXJlKCdkJylcbiAgLCBjYWxsYWJsZSA9IHJlcXVpcmUoJ2VzNS1leHQvb2JqZWN0L3ZhbGlkLWNhbGxhYmxlJylcblxuICAsIGFwcGx5ID0gRnVuY3Rpb24ucHJvdG90eXBlLmFwcGx5LCBjYWxsID0gRnVuY3Rpb24ucHJvdG90eXBlLmNhbGxcbiAgLCBjcmVhdGUgPSBPYmplY3QuY3JlYXRlLCBkZWZpbmVQcm9wZXJ0eSA9IE9iamVjdC5kZWZpbmVQcm9wZXJ0eVxuICAsIGRlZmluZVByb3BlcnRpZXMgPSBPYmplY3QuZGVmaW5lUHJvcGVydGllc1xuICAsIGhhc093blByb3BlcnR5ID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eVxuICAsIGRlc2NyaXB0b3IgPSB7IGNvbmZpZ3VyYWJsZTogdHJ1ZSwgZW51bWVyYWJsZTogZmFsc2UsIHdyaXRhYmxlOiB0cnVlIH1cblxuICAsIG9uLCBvbmNlLCBvZmYsIGVtaXQsIG1ldGhvZHMsIGRlc2NyaXB0b3JzLCBiYXNlO1xuXG5vbiA9IGZ1bmN0aW9uICh0eXBlLCBsaXN0ZW5lcikge1xuXHR2YXIgZGF0YTtcblxuXHRjYWxsYWJsZShsaXN0ZW5lcik7XG5cblx0aWYgKCFoYXNPd25Qcm9wZXJ0eS5jYWxsKHRoaXMsICdfX2VlX18nKSkge1xuXHRcdGRhdGEgPSBkZXNjcmlwdG9yLnZhbHVlID0gY3JlYXRlKG51bGwpO1xuXHRcdGRlZmluZVByb3BlcnR5KHRoaXMsICdfX2VlX18nLCBkZXNjcmlwdG9yKTtcblx0XHRkZXNjcmlwdG9yLnZhbHVlID0gbnVsbDtcblx0fSBlbHNlIHtcblx0XHRkYXRhID0gdGhpcy5fX2VlX187XG5cdH1cblx0aWYgKCFkYXRhW3R5cGVdKSBkYXRhW3R5cGVdID0gbGlzdGVuZXI7XG5cdGVsc2UgaWYgKHR5cGVvZiBkYXRhW3R5cGVdID09PSAnb2JqZWN0JykgZGF0YVt0eXBlXS5wdXNoKGxpc3RlbmVyKTtcblx0ZWxzZSBkYXRhW3R5cGVdID0gW2RhdGFbdHlwZV0sIGxpc3RlbmVyXTtcblxuXHRyZXR1cm4gdGhpcztcbn07XG5cbm9uY2UgPSBmdW5jdGlvbiAodHlwZSwgbGlzdGVuZXIpIHtcblx0dmFyIG9uY2UsIHNlbGY7XG5cblx0Y2FsbGFibGUobGlzdGVuZXIpO1xuXHRzZWxmID0gdGhpcztcblx0b24uY2FsbCh0aGlzLCB0eXBlLCBvbmNlID0gZnVuY3Rpb24gKCkge1xuXHRcdG9mZi5jYWxsKHNlbGYsIHR5cGUsIG9uY2UpO1xuXHRcdGFwcGx5LmNhbGwobGlzdGVuZXIsIHRoaXMsIGFyZ3VtZW50cyk7XG5cdH0pO1xuXG5cdG9uY2UuX19lZU9uY2VMaXN0ZW5lcl9fID0gbGlzdGVuZXI7XG5cdHJldHVybiB0aGlzO1xufTtcblxub2ZmID0gZnVuY3Rpb24gKHR5cGUsIGxpc3RlbmVyKSB7XG5cdHZhciBkYXRhLCBsaXN0ZW5lcnMsIGNhbmRpZGF0ZSwgaTtcblxuXHRjYWxsYWJsZShsaXN0ZW5lcik7XG5cblx0aWYgKCFoYXNPd25Qcm9wZXJ0eS5jYWxsKHRoaXMsICdfX2VlX18nKSkgcmV0dXJuIHRoaXM7XG5cdGRhdGEgPSB0aGlzLl9fZWVfXztcblx0aWYgKCFkYXRhW3R5cGVdKSByZXR1cm4gdGhpcztcblx0bGlzdGVuZXJzID0gZGF0YVt0eXBlXTtcblxuXHRpZiAodHlwZW9mIGxpc3RlbmVycyA9PT0gJ29iamVjdCcpIHtcblx0XHRmb3IgKGkgPSAwOyAoY2FuZGlkYXRlID0gbGlzdGVuZXJzW2ldKTsgKytpKSB7XG5cdFx0XHRpZiAoKGNhbmRpZGF0ZSA9PT0gbGlzdGVuZXIpIHx8XG5cdFx0XHRcdFx0KGNhbmRpZGF0ZS5fX2VlT25jZUxpc3RlbmVyX18gPT09IGxpc3RlbmVyKSkge1xuXHRcdFx0XHRpZiAobGlzdGVuZXJzLmxlbmd0aCA9PT0gMikgZGF0YVt0eXBlXSA9IGxpc3RlbmVyc1tpID8gMCA6IDFdO1xuXHRcdFx0XHRlbHNlIGxpc3RlbmVycy5zcGxpY2UoaSwgMSk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9IGVsc2Uge1xuXHRcdGlmICgobGlzdGVuZXJzID09PSBsaXN0ZW5lcikgfHxcblx0XHRcdFx0KGxpc3RlbmVycy5fX2VlT25jZUxpc3RlbmVyX18gPT09IGxpc3RlbmVyKSkge1xuXHRcdFx0ZGVsZXRlIGRhdGFbdHlwZV07XG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIHRoaXM7XG59O1xuXG5lbWl0ID0gZnVuY3Rpb24gKHR5cGUpIHtcblx0dmFyIGksIGwsIGxpc3RlbmVyLCBsaXN0ZW5lcnMsIGFyZ3M7XG5cblx0aWYgKCFoYXNPd25Qcm9wZXJ0eS5jYWxsKHRoaXMsICdfX2VlX18nKSkgcmV0dXJuO1xuXHRsaXN0ZW5lcnMgPSB0aGlzLl9fZWVfX1t0eXBlXTtcblx0aWYgKCFsaXN0ZW5lcnMpIHJldHVybjtcblxuXHRpZiAodHlwZW9mIGxpc3RlbmVycyA9PT0gJ29iamVjdCcpIHtcblx0XHRsID0gYXJndW1lbnRzLmxlbmd0aDtcblx0XHRhcmdzID0gbmV3IEFycmF5KGwgLSAxKTtcblx0XHRmb3IgKGkgPSAxOyBpIDwgbDsgKytpKSBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcblxuXHRcdGxpc3RlbmVycyA9IGxpc3RlbmVycy5zbGljZSgpO1xuXHRcdGZvciAoaSA9IDA7IChsaXN0ZW5lciA9IGxpc3RlbmVyc1tpXSk7ICsraSkge1xuXHRcdFx0YXBwbHkuY2FsbChsaXN0ZW5lciwgdGhpcywgYXJncyk7XG5cdFx0fVxuXHR9IGVsc2Uge1xuXHRcdHN3aXRjaCAoYXJndW1lbnRzLmxlbmd0aCkge1xuXHRcdGNhc2UgMTpcblx0XHRcdGNhbGwuY2FsbChsaXN0ZW5lcnMsIHRoaXMpO1xuXHRcdFx0YnJlYWs7XG5cdFx0Y2FzZSAyOlxuXHRcdFx0Y2FsbC5jYWxsKGxpc3RlbmVycywgdGhpcywgYXJndW1lbnRzWzFdKTtcblx0XHRcdGJyZWFrO1xuXHRcdGNhc2UgMzpcblx0XHRcdGNhbGwuY2FsbChsaXN0ZW5lcnMsIHRoaXMsIGFyZ3VtZW50c1sxXSwgYXJndW1lbnRzWzJdKTtcblx0XHRcdGJyZWFrO1xuXHRcdGRlZmF1bHQ6XG5cdFx0XHRsID0gYXJndW1lbnRzLmxlbmd0aDtcblx0XHRcdGFyZ3MgPSBuZXcgQXJyYXkobCAtIDEpO1xuXHRcdFx0Zm9yIChpID0gMTsgaSA8IGw7ICsraSkge1xuXHRcdFx0XHRhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcblx0XHRcdH1cblx0XHRcdGFwcGx5LmNhbGwobGlzdGVuZXJzLCB0aGlzLCBhcmdzKTtcblx0XHR9XG5cdH1cbn07XG5cbm1ldGhvZHMgPSB7XG5cdG9uOiBvbixcblx0b25jZTogb25jZSxcblx0b2ZmOiBvZmYsXG5cdGVtaXQ6IGVtaXRcbn07XG5cbmRlc2NyaXB0b3JzID0ge1xuXHRvbjogZChvbiksXG5cdG9uY2U6IGQob25jZSksXG5cdG9mZjogZChvZmYpLFxuXHRlbWl0OiBkKGVtaXQpXG59O1xuXG5iYXNlID0gZGVmaW5lUHJvcGVydGllcyh7fSwgZGVzY3JpcHRvcnMpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHMgPSBmdW5jdGlvbiAobykge1xuXHRyZXR1cm4gKG8gPT0gbnVsbCkgPyBjcmVhdGUoYmFzZSkgOiBkZWZpbmVQcm9wZXJ0aWVzKE9iamVjdChvKSwgZGVzY3JpcHRvcnMpO1xufTtcbmV4cG9ydHMubWV0aG9kcyA9IG1ldGhvZHM7XG4iLCIndXNlIHN0cmljdCc7XG5cbmV4cG9ydHMuX19lc01vZHVsZSA9IHRydWU7XG52YXIgY2FuVXNlRE9NID0gZXhwb3J0cy5jYW5Vc2VET00gPSAhISh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyAmJiB3aW5kb3cuZG9jdW1lbnQgJiYgd2luZG93LmRvY3VtZW50LmNyZWF0ZUVsZW1lbnQpO1xuXG52YXIgYWRkRXZlbnRMaXN0ZW5lciA9IGV4cG9ydHMuYWRkRXZlbnRMaXN0ZW5lciA9IGZ1bmN0aW9uIGFkZEV2ZW50TGlzdGVuZXIobm9kZSwgZXZlbnQsIGxpc3RlbmVyKSB7XG4gIHJldHVybiBub2RlLmFkZEV2ZW50TGlzdGVuZXIgPyBub2RlLmFkZEV2ZW50TGlzdGVuZXIoZXZlbnQsIGxpc3RlbmVyLCBmYWxzZSkgOiBub2RlLmF0dGFjaEV2ZW50KCdvbicgKyBldmVudCwgbGlzdGVuZXIpO1xufTtcblxudmFyIHJlbW92ZUV2ZW50TGlzdGVuZXIgPSBleHBvcnRzLnJlbW92ZUV2ZW50TGlzdGVuZXIgPSBmdW5jdGlvbiByZW1vdmVFdmVudExpc3RlbmVyKG5vZGUsIGV2ZW50LCBsaXN0ZW5lcikge1xuICByZXR1cm4gbm9kZS5yZW1vdmVFdmVudExpc3RlbmVyID8gbm9kZS5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50LCBsaXN0ZW5lciwgZmFsc2UpIDogbm9kZS5kZXRhY2hFdmVudCgnb24nICsgZXZlbnQsIGxpc3RlbmVyKTtcbn07XG5cbnZhciBnZXRDb25maXJtYXRpb24gPSBleHBvcnRzLmdldENvbmZpcm1hdGlvbiA9IGZ1bmN0aW9uIGdldENvbmZpcm1hdGlvbihtZXNzYWdlLCBjYWxsYmFjaykge1xuICByZXR1cm4gY2FsbGJhY2sod2luZG93LmNvbmZpcm0obWVzc2FnZSkpO1xufTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1hbGVydFxuXG4vKipcbiAqIFJldHVybnMgdHJ1ZSBpZiB0aGUgSFRNTDUgaGlzdG9yeSBBUEkgaXMgc3VwcG9ydGVkLiBUYWtlbiBmcm9tIE1vZGVybml6ci5cbiAqXG4gKiBodHRwczovL2dpdGh1Yi5jb20vTW9kZXJuaXpyL01vZGVybml6ci9ibG9iL21hc3Rlci9MSUNFTlNFXG4gKiBodHRwczovL2dpdGh1Yi5jb20vTW9kZXJuaXpyL01vZGVybml6ci9ibG9iL21hc3Rlci9mZWF0dXJlLWRldGVjdHMvaGlzdG9yeS5qc1xuICogY2hhbmdlZCB0byBhdm9pZCBmYWxzZSBuZWdhdGl2ZXMgZm9yIFdpbmRvd3MgUGhvbmVzOiBodHRwczovL2dpdGh1Yi5jb20vcmVhY3Rqcy9yZWFjdC1yb3V0ZXIvaXNzdWVzLzU4NlxuICovXG52YXIgc3VwcG9ydHNIaXN0b3J5ID0gZXhwb3J0cy5zdXBwb3J0c0hpc3RvcnkgPSBmdW5jdGlvbiBzdXBwb3J0c0hpc3RvcnkoKSB7XG4gIHZhciB1YSA9IHdpbmRvdy5uYXZpZ2F0b3IudXNlckFnZW50O1xuXG4gIGlmICgodWEuaW5kZXhPZignQW5kcm9pZCAyLicpICE9PSAtMSB8fCB1YS5pbmRleE9mKCdBbmRyb2lkIDQuMCcpICE9PSAtMSkgJiYgdWEuaW5kZXhPZignTW9iaWxlIFNhZmFyaScpICE9PSAtMSAmJiB1YS5pbmRleE9mKCdDaHJvbWUnKSA9PT0gLTEgJiYgdWEuaW5kZXhPZignV2luZG93cyBQaG9uZScpID09PSAtMSkgcmV0dXJuIGZhbHNlO1xuXG4gIHJldHVybiB3aW5kb3cuaGlzdG9yeSAmJiAncHVzaFN0YXRlJyBpbiB3aW5kb3cuaGlzdG9yeTtcbn07XG5cbi8qKlxuICogUmV0dXJucyB0cnVlIGlmIGJyb3dzZXIgZmlyZXMgcG9wc3RhdGUgb24gaGFzaCBjaGFuZ2UuXG4gKiBJRTEwIGFuZCBJRTExIGRvIG5vdC5cbiAqL1xudmFyIHN1cHBvcnRzUG9wU3RhdGVPbkhhc2hDaGFuZ2UgPSBleHBvcnRzLnN1cHBvcnRzUG9wU3RhdGVPbkhhc2hDaGFuZ2UgPSBmdW5jdGlvbiBzdXBwb3J0c1BvcFN0YXRlT25IYXNoQ2hhbmdlKCkge1xuICByZXR1cm4gd2luZG93Lm5hdmlnYXRvci51c2VyQWdlbnQuaW5kZXhPZignVHJpZGVudCcpID09PSAtMTtcbn07XG5cbi8qKlxuICogUmV0dXJucyBmYWxzZSBpZiB1c2luZyBnbyhuKSB3aXRoIGhhc2ggaGlzdG9yeSBjYXVzZXMgYSBmdWxsIHBhZ2UgcmVsb2FkLlxuICovXG52YXIgc3VwcG9ydHNHb1dpdGhvdXRSZWxvYWRVc2luZ0hhc2ggPSBleHBvcnRzLnN1cHBvcnRzR29XaXRob3V0UmVsb2FkVXNpbmdIYXNoID0gZnVuY3Rpb24gc3VwcG9ydHNHb1dpdGhvdXRSZWxvYWRVc2luZ0hhc2goKSB7XG4gIHJldHVybiB3aW5kb3cubmF2aWdhdG9yLnVzZXJBZ2VudC5pbmRleE9mKCdGaXJlZm94JykgPT09IC0xO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIHRydWUgaWYgYSBnaXZlbiBwb3BzdGF0ZSBldmVudCBpcyBhbiBleHRyYW5lb3VzIFdlYktpdCBldmVudC5cbiAqIEFjY291bnRzIGZvciB0aGUgZmFjdCB0aGF0IENocm9tZSBvbiBpT1MgZmlyZXMgcmVhbCBwb3BzdGF0ZSBldmVudHNcbiAqIGNvbnRhaW5pbmcgdW5kZWZpbmVkIHN0YXRlIHdoZW4gcHJlc3NpbmcgdGhlIGJhY2sgYnV0dG9uLlxuICovXG52YXIgaXNFeHRyYW5lb3VzUG9wc3RhdGVFdmVudCA9IGV4cG9ydHMuaXNFeHRyYW5lb3VzUG9wc3RhdGVFdmVudCA9IGZ1bmN0aW9uIGlzRXh0cmFuZW91c1BvcHN0YXRlRXZlbnQoZXZlbnQpIHtcbiAgcmV0dXJuIGV2ZW50LnN0YXRlID09PSB1bmRlZmluZWQgJiYgbmF2aWdhdG9yLnVzZXJBZ2VudC5pbmRleE9mKCdDcmlPUycpID09PSAtMTtcbn07IiwiJ3VzZSBzdHJpY3QnO1xuXG5leHBvcnRzLl9fZXNNb2R1bGUgPSB0cnVlO1xuZXhwb3J0cy5sb2NhdGlvbnNBcmVFcXVhbCA9IGV4cG9ydHMuY3JlYXRlTG9jYXRpb24gPSB1bmRlZmluZWQ7XG5cbnZhciBfZXh0ZW5kcyA9IE9iamVjdC5hc3NpZ24gfHwgZnVuY3Rpb24gKHRhcmdldCkgeyBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykgeyB2YXIgc291cmNlID0gYXJndW1lbnRzW2ldOyBmb3IgKHZhciBrZXkgaW4gc291cmNlKSB7IGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoc291cmNlLCBrZXkpKSB7IHRhcmdldFtrZXldID0gc291cmNlW2tleV07IH0gfSB9IHJldHVybiB0YXJnZXQ7IH07XG5cbnZhciBfcmVzb2x2ZVBhdGhuYW1lID0gcmVxdWlyZSgncmVzb2x2ZS1wYXRobmFtZScpO1xuXG52YXIgX3Jlc29sdmVQYXRobmFtZTIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9yZXNvbHZlUGF0aG5hbWUpO1xuXG52YXIgX3ZhbHVlRXF1YWwgPSByZXF1aXJlKCd2YWx1ZS1lcXVhbCcpO1xuXG52YXIgX3ZhbHVlRXF1YWwyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfdmFsdWVFcXVhbCk7XG5cbnZhciBfUGF0aFV0aWxzID0gcmVxdWlyZSgnLi9QYXRoVXRpbHMnKTtcblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgZGVmYXVsdDogb2JqIH07IH1cblxudmFyIGNyZWF0ZUxvY2F0aW9uID0gZXhwb3J0cy5jcmVhdGVMb2NhdGlvbiA9IGZ1bmN0aW9uIGNyZWF0ZUxvY2F0aW9uKHBhdGgsIHN0YXRlLCBrZXksIGN1cnJlbnRMb2NhdGlvbikge1xuICB2YXIgbG9jYXRpb24gPSB2b2lkIDA7XG4gIGlmICh0eXBlb2YgcGF0aCA9PT0gJ3N0cmluZycpIHtcbiAgICAvLyBUd28tYXJnIGZvcm06IHB1c2gocGF0aCwgc3RhdGUpXG4gICAgbG9jYXRpb24gPSAoMCwgX1BhdGhVdGlscy5wYXJzZVBhdGgpKHBhdGgpO1xuICAgIGxvY2F0aW9uLnN0YXRlID0gc3RhdGU7XG4gIH0gZWxzZSB7XG4gICAgLy8gT25lLWFyZyBmb3JtOiBwdXNoKGxvY2F0aW9uKVxuICAgIGxvY2F0aW9uID0gX2V4dGVuZHMoe30sIHBhdGgpO1xuXG4gICAgaWYgKGxvY2F0aW9uLnBhdGhuYW1lID09PSB1bmRlZmluZWQpIGxvY2F0aW9uLnBhdGhuYW1lID0gJyc7XG5cbiAgICBpZiAobG9jYXRpb24uc2VhcmNoKSB7XG4gICAgICBpZiAobG9jYXRpb24uc2VhcmNoLmNoYXJBdCgwKSAhPT0gJz8nKSBsb2NhdGlvbi5zZWFyY2ggPSAnPycgKyBsb2NhdGlvbi5zZWFyY2g7XG4gICAgfSBlbHNlIHtcbiAgICAgIGxvY2F0aW9uLnNlYXJjaCA9ICcnO1xuICAgIH1cblxuICAgIGlmIChsb2NhdGlvbi5oYXNoKSB7XG4gICAgICBpZiAobG9jYXRpb24uaGFzaC5jaGFyQXQoMCkgIT09ICcjJykgbG9jYXRpb24uaGFzaCA9ICcjJyArIGxvY2F0aW9uLmhhc2g7XG4gICAgfSBlbHNlIHtcbiAgICAgIGxvY2F0aW9uLmhhc2ggPSAnJztcbiAgICB9XG5cbiAgICBpZiAoc3RhdGUgIT09IHVuZGVmaW5lZCAmJiBsb2NhdGlvbi5zdGF0ZSA9PT0gdW5kZWZpbmVkKSBsb2NhdGlvbi5zdGF0ZSA9IHN0YXRlO1xuICB9XG5cbiAgbG9jYXRpb24ua2V5ID0ga2V5O1xuXG4gIGlmIChjdXJyZW50TG9jYXRpb24pIHtcbiAgICAvLyBSZXNvbHZlIGluY29tcGxldGUvcmVsYXRpdmUgcGF0aG5hbWUgcmVsYXRpdmUgdG8gY3VycmVudCBsb2NhdGlvbi5cbiAgICBpZiAoIWxvY2F0aW9uLnBhdGhuYW1lKSB7XG4gICAgICBsb2NhdGlvbi5wYXRobmFtZSA9IGN1cnJlbnRMb2NhdGlvbi5wYXRobmFtZTtcbiAgICB9IGVsc2UgaWYgKGxvY2F0aW9uLnBhdGhuYW1lLmNoYXJBdCgwKSAhPT0gJy8nKSB7XG4gICAgICBsb2NhdGlvbi5wYXRobmFtZSA9ICgwLCBfcmVzb2x2ZVBhdGhuYW1lMi5kZWZhdWx0KShsb2NhdGlvbi5wYXRobmFtZSwgY3VycmVudExvY2F0aW9uLnBhdGhuYW1lKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gbG9jYXRpb247XG59O1xuXG52YXIgbG9jYXRpb25zQXJlRXF1YWwgPSBleHBvcnRzLmxvY2F0aW9uc0FyZUVxdWFsID0gZnVuY3Rpb24gbG9jYXRpb25zQXJlRXF1YWwoYSwgYikge1xuICByZXR1cm4gYS5wYXRobmFtZSA9PT0gYi5wYXRobmFtZSAmJiBhLnNlYXJjaCA9PT0gYi5zZWFyY2ggJiYgYS5oYXNoID09PSBiLmhhc2ggJiYgYS5rZXkgPT09IGIua2V5ICYmICgwLCBfdmFsdWVFcXVhbDIuZGVmYXVsdCkoYS5zdGF0ZSwgYi5zdGF0ZSk7XG59OyIsIid1c2Ugc3RyaWN0JztcblxuZXhwb3J0cy5fX2VzTW9kdWxlID0gdHJ1ZTtcbnZhciBhZGRMZWFkaW5nU2xhc2ggPSBleHBvcnRzLmFkZExlYWRpbmdTbGFzaCA9IGZ1bmN0aW9uIGFkZExlYWRpbmdTbGFzaChwYXRoKSB7XG4gIHJldHVybiBwYXRoLmNoYXJBdCgwKSA9PT0gJy8nID8gcGF0aCA6ICcvJyArIHBhdGg7XG59O1xuXG52YXIgc3RyaXBMZWFkaW5nU2xhc2ggPSBleHBvcnRzLnN0cmlwTGVhZGluZ1NsYXNoID0gZnVuY3Rpb24gc3RyaXBMZWFkaW5nU2xhc2gocGF0aCkge1xuICByZXR1cm4gcGF0aC5jaGFyQXQoMCkgPT09ICcvJyA/IHBhdGguc3Vic3RyKDEpIDogcGF0aDtcbn07XG5cbnZhciBzdHJpcFByZWZpeCA9IGV4cG9ydHMuc3RyaXBQcmVmaXggPSBmdW5jdGlvbiBzdHJpcFByZWZpeChwYXRoLCBwcmVmaXgpIHtcbiAgcmV0dXJuIHBhdGguaW5kZXhPZihwcmVmaXgpID09PSAwID8gcGF0aC5zdWJzdHIocHJlZml4Lmxlbmd0aCkgOiBwYXRoO1xufTtcblxudmFyIHN0cmlwVHJhaWxpbmdTbGFzaCA9IGV4cG9ydHMuc3RyaXBUcmFpbGluZ1NsYXNoID0gZnVuY3Rpb24gc3RyaXBUcmFpbGluZ1NsYXNoKHBhdGgpIHtcbiAgcmV0dXJuIHBhdGguY2hhckF0KHBhdGgubGVuZ3RoIC0gMSkgPT09ICcvJyA/IHBhdGguc2xpY2UoMCwgLTEpIDogcGF0aDtcbn07XG5cbnZhciBwYXJzZVBhdGggPSBleHBvcnRzLnBhcnNlUGF0aCA9IGZ1bmN0aW9uIHBhcnNlUGF0aChwYXRoKSB7XG4gIHZhciBwYXRobmFtZSA9IHBhdGggfHwgJy8nO1xuICB2YXIgc2VhcmNoID0gJyc7XG4gIHZhciBoYXNoID0gJyc7XG5cbiAgdmFyIGhhc2hJbmRleCA9IHBhdGhuYW1lLmluZGV4T2YoJyMnKTtcbiAgaWYgKGhhc2hJbmRleCAhPT0gLTEpIHtcbiAgICBoYXNoID0gcGF0aG5hbWUuc3Vic3RyKGhhc2hJbmRleCk7XG4gICAgcGF0aG5hbWUgPSBwYXRobmFtZS5zdWJzdHIoMCwgaGFzaEluZGV4KTtcbiAgfVxuXG4gIHZhciBzZWFyY2hJbmRleCA9IHBhdGhuYW1lLmluZGV4T2YoJz8nKTtcbiAgaWYgKHNlYXJjaEluZGV4ICE9PSAtMSkge1xuICAgIHNlYXJjaCA9IHBhdGhuYW1lLnN1YnN0cihzZWFyY2hJbmRleCk7XG4gICAgcGF0aG5hbWUgPSBwYXRobmFtZS5zdWJzdHIoMCwgc2VhcmNoSW5kZXgpO1xuICB9XG5cbiAgcGF0aG5hbWUgPSBkZWNvZGVVUkkocGF0aG5hbWUpO1xuXG4gIHJldHVybiB7XG4gICAgcGF0aG5hbWU6IHBhdGhuYW1lLFxuICAgIHNlYXJjaDogc2VhcmNoID09PSAnPycgPyAnJyA6IHNlYXJjaCxcbiAgICBoYXNoOiBoYXNoID09PSAnIycgPyAnJyA6IGhhc2hcbiAgfTtcbn07XG5cbnZhciBjcmVhdGVQYXRoID0gZXhwb3J0cy5jcmVhdGVQYXRoID0gZnVuY3Rpb24gY3JlYXRlUGF0aChsb2NhdGlvbikge1xuICB2YXIgcGF0aG5hbWUgPSBsb2NhdGlvbi5wYXRobmFtZSxcbiAgICAgIHNlYXJjaCA9IGxvY2F0aW9uLnNlYXJjaCxcbiAgICAgIGhhc2ggPSBsb2NhdGlvbi5oYXNoO1xuXG5cbiAgdmFyIHBhdGggPSBlbmNvZGVVUkkocGF0aG5hbWUgfHwgJy8nKTtcblxuICBpZiAoc2VhcmNoICYmIHNlYXJjaCAhPT0gJz8nKSBwYXRoICs9IHNlYXJjaC5jaGFyQXQoMCkgPT09ICc/JyA/IHNlYXJjaCA6ICc/JyArIHNlYXJjaDtcblxuICBpZiAoaGFzaCAmJiBoYXNoICE9PSAnIycpIHBhdGggKz0gaGFzaC5jaGFyQXQoMCkgPT09ICcjJyA/IGhhc2ggOiAnIycgKyBoYXNoO1xuXG4gIHJldHVybiBwYXRoO1xufTsiLCIndXNlIHN0cmljdCc7XG5cbmV4cG9ydHMuX19lc01vZHVsZSA9IHRydWU7XG5cbnZhciBfdHlwZW9mID0gdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIHR5cGVvZiBTeW1ib2wuaXRlcmF0b3IgPT09IFwic3ltYm9sXCIgPyBmdW5jdGlvbiAob2JqKSB7IHJldHVybiB0eXBlb2Ygb2JqOyB9IDogZnVuY3Rpb24gKG9iaikgeyByZXR1cm4gb2JqICYmIHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiBvYmouY29uc3RydWN0b3IgPT09IFN5bWJvbCAmJiBvYmogIT09IFN5bWJvbC5wcm90b3R5cGUgPyBcInN5bWJvbFwiIDogdHlwZW9mIG9iajsgfTtcblxudmFyIF9leHRlbmRzID0gT2JqZWN0LmFzc2lnbiB8fCBmdW5jdGlvbiAodGFyZ2V0KSB7IGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7IHZhciBzb3VyY2UgPSBhcmd1bWVudHNbaV07IGZvciAodmFyIGtleSBpbiBzb3VyY2UpIHsgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChzb3VyY2UsIGtleSkpIHsgdGFyZ2V0W2tleV0gPSBzb3VyY2Vba2V5XTsgfSB9IH0gcmV0dXJuIHRhcmdldDsgfTtcblxudmFyIF93YXJuaW5nID0gcmVxdWlyZSgnd2FybmluZycpO1xuXG52YXIgX3dhcm5pbmcyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfd2FybmluZyk7XG5cbnZhciBfaW52YXJpYW50ID0gcmVxdWlyZSgnaW52YXJpYW50Jyk7XG5cbnZhciBfaW52YXJpYW50MiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX2ludmFyaWFudCk7XG5cbnZhciBfTG9jYXRpb25VdGlscyA9IHJlcXVpcmUoJy4vTG9jYXRpb25VdGlscycpO1xuXG52YXIgX1BhdGhVdGlscyA9IHJlcXVpcmUoJy4vUGF0aFV0aWxzJyk7XG5cbnZhciBfY3JlYXRlVHJhbnNpdGlvbk1hbmFnZXIgPSByZXF1aXJlKCcuL2NyZWF0ZVRyYW5zaXRpb25NYW5hZ2VyJyk7XG5cbnZhciBfY3JlYXRlVHJhbnNpdGlvbk1hbmFnZXIyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfY3JlYXRlVHJhbnNpdGlvbk1hbmFnZXIpO1xuXG52YXIgX0RPTVV0aWxzID0gcmVxdWlyZSgnLi9ET01VdGlscycpO1xuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KG9iaikgeyByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyBkZWZhdWx0OiBvYmogfTsgfVxuXG52YXIgUG9wU3RhdGVFdmVudCA9ICdwb3BzdGF0ZSc7XG52YXIgSGFzaENoYW5nZUV2ZW50ID0gJ2hhc2hjaGFuZ2UnO1xuXG52YXIgZ2V0SGlzdG9yeVN0YXRlID0gZnVuY3Rpb24gZ2V0SGlzdG9yeVN0YXRlKCkge1xuICB0cnkge1xuICAgIHJldHVybiB3aW5kb3cuaGlzdG9yeS5zdGF0ZSB8fCB7fTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIC8vIElFIDExIHNvbWV0aW1lcyB0aHJvd3Mgd2hlbiBhY2Nlc3Npbmcgd2luZG93Lmhpc3Rvcnkuc3RhdGVcbiAgICAvLyBTZWUgaHR0cHM6Ly9naXRodWIuY29tL1JlYWN0VHJhaW5pbmcvaGlzdG9yeS9wdWxsLzI4OVxuICAgIHJldHVybiB7fTtcbiAgfVxufTtcblxuLyoqXG4gKiBDcmVhdGVzIGEgaGlzdG9yeSBvYmplY3QgdGhhdCB1c2VzIHRoZSBIVE1MNSBoaXN0b3J5IEFQSSBpbmNsdWRpbmdcbiAqIHB1c2hTdGF0ZSwgcmVwbGFjZVN0YXRlLCBhbmQgdGhlIHBvcHN0YXRlIGV2ZW50LlxuICovXG52YXIgY3JlYXRlQnJvd3Nlckhpc3RvcnkgPSBmdW5jdGlvbiBjcmVhdGVCcm93c2VySGlzdG9yeSgpIHtcbiAgdmFyIHByb3BzID0gYXJndW1lbnRzLmxlbmd0aCA+IDAgJiYgYXJndW1lbnRzWzBdICE9PSB1bmRlZmluZWQgPyBhcmd1bWVudHNbMF0gOiB7fTtcblxuICAoMCwgX2ludmFyaWFudDIuZGVmYXVsdCkoX0RPTVV0aWxzLmNhblVzZURPTSwgJ0Jyb3dzZXIgaGlzdG9yeSBuZWVkcyBhIERPTScpO1xuXG4gIHZhciBnbG9iYWxIaXN0b3J5ID0gd2luZG93Lmhpc3Rvcnk7XG4gIHZhciBjYW5Vc2VIaXN0b3J5ID0gKDAsIF9ET01VdGlscy5zdXBwb3J0c0hpc3RvcnkpKCk7XG4gIHZhciBuZWVkc0hhc2hDaGFuZ2VMaXN0ZW5lciA9ICEoMCwgX0RPTVV0aWxzLnN1cHBvcnRzUG9wU3RhdGVPbkhhc2hDaGFuZ2UpKCk7XG5cbiAgdmFyIF9wcm9wcyRmb3JjZVJlZnJlc2ggPSBwcm9wcy5mb3JjZVJlZnJlc2gsXG4gICAgICBmb3JjZVJlZnJlc2ggPSBfcHJvcHMkZm9yY2VSZWZyZXNoID09PSB1bmRlZmluZWQgPyBmYWxzZSA6IF9wcm9wcyRmb3JjZVJlZnJlc2gsXG4gICAgICBfcHJvcHMkZ2V0VXNlckNvbmZpcm0gPSBwcm9wcy5nZXRVc2VyQ29uZmlybWF0aW9uLFxuICAgICAgZ2V0VXNlckNvbmZpcm1hdGlvbiA9IF9wcm9wcyRnZXRVc2VyQ29uZmlybSA9PT0gdW5kZWZpbmVkID8gX0RPTVV0aWxzLmdldENvbmZpcm1hdGlvbiA6IF9wcm9wcyRnZXRVc2VyQ29uZmlybSxcbiAgICAgIF9wcm9wcyRrZXlMZW5ndGggPSBwcm9wcy5rZXlMZW5ndGgsXG4gICAgICBrZXlMZW5ndGggPSBfcHJvcHMka2V5TGVuZ3RoID09PSB1bmRlZmluZWQgPyA2IDogX3Byb3BzJGtleUxlbmd0aDtcblxuICB2YXIgYmFzZW5hbWUgPSBwcm9wcy5iYXNlbmFtZSA/ICgwLCBfUGF0aFV0aWxzLnN0cmlwVHJhaWxpbmdTbGFzaCkoKDAsIF9QYXRoVXRpbHMuYWRkTGVhZGluZ1NsYXNoKShwcm9wcy5iYXNlbmFtZSkpIDogJyc7XG5cbiAgdmFyIGdldERPTUxvY2F0aW9uID0gZnVuY3Rpb24gZ2V0RE9NTG9jYXRpb24oaGlzdG9yeVN0YXRlKSB7XG4gICAgdmFyIF9yZWYgPSBoaXN0b3J5U3RhdGUgfHwge30sXG4gICAgICAgIGtleSA9IF9yZWYua2V5LFxuICAgICAgICBzdGF0ZSA9IF9yZWYuc3RhdGU7XG5cbiAgICB2YXIgX3dpbmRvdyRsb2NhdGlvbiA9IHdpbmRvdy5sb2NhdGlvbixcbiAgICAgICAgcGF0aG5hbWUgPSBfd2luZG93JGxvY2F0aW9uLnBhdGhuYW1lLFxuICAgICAgICBzZWFyY2ggPSBfd2luZG93JGxvY2F0aW9uLnNlYXJjaCxcbiAgICAgICAgaGFzaCA9IF93aW5kb3ckbG9jYXRpb24uaGFzaDtcblxuXG4gICAgdmFyIHBhdGggPSBwYXRobmFtZSArIHNlYXJjaCArIGhhc2g7XG5cbiAgICBpZiAoYmFzZW5hbWUpIHBhdGggPSAoMCwgX1BhdGhVdGlscy5zdHJpcFByZWZpeCkocGF0aCwgYmFzZW5hbWUpO1xuXG4gICAgcmV0dXJuIF9leHRlbmRzKHt9LCAoMCwgX1BhdGhVdGlscy5wYXJzZVBhdGgpKHBhdGgpLCB7XG4gICAgICBzdGF0ZTogc3RhdGUsXG4gICAgICBrZXk6IGtleVxuICAgIH0pO1xuICB9O1xuXG4gIHZhciBjcmVhdGVLZXkgPSBmdW5jdGlvbiBjcmVhdGVLZXkoKSB7XG4gICAgcmV0dXJuIE1hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnN1YnN0cigyLCBrZXlMZW5ndGgpO1xuICB9O1xuXG4gIHZhciB0cmFuc2l0aW9uTWFuYWdlciA9ICgwLCBfY3JlYXRlVHJhbnNpdGlvbk1hbmFnZXIyLmRlZmF1bHQpKCk7XG5cbiAgdmFyIHNldFN0YXRlID0gZnVuY3Rpb24gc2V0U3RhdGUobmV4dFN0YXRlKSB7XG4gICAgX2V4dGVuZHMoaGlzdG9yeSwgbmV4dFN0YXRlKTtcblxuICAgIGhpc3RvcnkubGVuZ3RoID0gZ2xvYmFsSGlzdG9yeS5sZW5ndGg7XG5cbiAgICB0cmFuc2l0aW9uTWFuYWdlci5ub3RpZnlMaXN0ZW5lcnMoaGlzdG9yeS5sb2NhdGlvbiwgaGlzdG9yeS5hY3Rpb24pO1xuICB9O1xuXG4gIHZhciBoYW5kbGVQb3BTdGF0ZSA9IGZ1bmN0aW9uIGhhbmRsZVBvcFN0YXRlKGV2ZW50KSB7XG4gICAgLy8gSWdub3JlIGV4dHJhbmVvdXMgcG9wc3RhdGUgZXZlbnRzIGluIFdlYktpdC5cbiAgICBpZiAoKDAsIF9ET01VdGlscy5pc0V4dHJhbmVvdXNQb3BzdGF0ZUV2ZW50KShldmVudCkpIHJldHVybjtcblxuICAgIGhhbmRsZVBvcChnZXRET01Mb2NhdGlvbihldmVudC5zdGF0ZSkpO1xuICB9O1xuXG4gIHZhciBoYW5kbGVIYXNoQ2hhbmdlID0gZnVuY3Rpb24gaGFuZGxlSGFzaENoYW5nZSgpIHtcbiAgICBoYW5kbGVQb3AoZ2V0RE9NTG9jYXRpb24oZ2V0SGlzdG9yeVN0YXRlKCkpKTtcbiAgfTtcblxuICB2YXIgZm9yY2VOZXh0UG9wID0gZmFsc2U7XG5cbiAgdmFyIGhhbmRsZVBvcCA9IGZ1bmN0aW9uIGhhbmRsZVBvcChsb2NhdGlvbikge1xuICAgIGlmIChmb3JjZU5leHRQb3ApIHtcbiAgICAgIGZvcmNlTmV4dFBvcCA9IGZhbHNlO1xuICAgICAgc2V0U3RhdGUoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIGFjdGlvbiA9ICdQT1AnO1xuXG4gICAgICB0cmFuc2l0aW9uTWFuYWdlci5jb25maXJtVHJhbnNpdGlvblRvKGxvY2F0aW9uLCBhY3Rpb24sIGdldFVzZXJDb25maXJtYXRpb24sIGZ1bmN0aW9uIChvaykge1xuICAgICAgICBpZiAob2spIHtcbiAgICAgICAgICBzZXRTdGF0ZSh7IGFjdGlvbjogYWN0aW9uLCBsb2NhdGlvbjogbG9jYXRpb24gfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV2ZXJ0UG9wKGxvY2F0aW9uKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICB9O1xuXG4gIHZhciByZXZlcnRQb3AgPSBmdW5jdGlvbiByZXZlcnRQb3AoZnJvbUxvY2F0aW9uKSB7XG4gICAgdmFyIHRvTG9jYXRpb24gPSBoaXN0b3J5LmxvY2F0aW9uO1xuXG4gICAgLy8gVE9ETzogV2UgY291bGQgcHJvYmFibHkgbWFrZSB0aGlzIG1vcmUgcmVsaWFibGUgYnlcbiAgICAvLyBrZWVwaW5nIGEgbGlzdCBvZiBrZXlzIHdlJ3ZlIHNlZW4gaW4gc2Vzc2lvblN0b3JhZ2UuXG4gICAgLy8gSW5zdGVhZCwgd2UganVzdCBkZWZhdWx0IHRvIDAgZm9yIGtleXMgd2UgZG9uJ3Qga25vdy5cblxuICAgIHZhciB0b0luZGV4ID0gYWxsS2V5cy5pbmRleE9mKHRvTG9jYXRpb24ua2V5KTtcblxuICAgIGlmICh0b0luZGV4ID09PSAtMSkgdG9JbmRleCA9IDA7XG5cbiAgICB2YXIgZnJvbUluZGV4ID0gYWxsS2V5cy5pbmRleE9mKGZyb21Mb2NhdGlvbi5rZXkpO1xuXG4gICAgaWYgKGZyb21JbmRleCA9PT0gLTEpIGZyb21JbmRleCA9IDA7XG5cbiAgICB2YXIgZGVsdGEgPSB0b0luZGV4IC0gZnJvbUluZGV4O1xuXG4gICAgaWYgKGRlbHRhKSB7XG4gICAgICBmb3JjZU5leHRQb3AgPSB0cnVlO1xuICAgICAgZ28oZGVsdGEpO1xuICAgIH1cbiAgfTtcblxuICB2YXIgaW5pdGlhbExvY2F0aW9uID0gZ2V0RE9NTG9jYXRpb24oZ2V0SGlzdG9yeVN0YXRlKCkpO1xuICB2YXIgYWxsS2V5cyA9IFtpbml0aWFsTG9jYXRpb24ua2V5XTtcblxuICAvLyBQdWJsaWMgaW50ZXJmYWNlXG5cbiAgdmFyIGNyZWF0ZUhyZWYgPSBmdW5jdGlvbiBjcmVhdGVIcmVmKGxvY2F0aW9uKSB7XG4gICAgcmV0dXJuIGJhc2VuYW1lICsgKDAsIF9QYXRoVXRpbHMuY3JlYXRlUGF0aCkobG9jYXRpb24pO1xuICB9O1xuXG4gIHZhciBwdXNoID0gZnVuY3Rpb24gcHVzaChwYXRoLCBzdGF0ZSkge1xuICAgICgwLCBfd2FybmluZzIuZGVmYXVsdCkoISgodHlwZW9mIHBhdGggPT09ICd1bmRlZmluZWQnID8gJ3VuZGVmaW5lZCcgOiBfdHlwZW9mKHBhdGgpKSA9PT0gJ29iamVjdCcgJiYgcGF0aC5zdGF0ZSAhPT0gdW5kZWZpbmVkICYmIHN0YXRlICE9PSB1bmRlZmluZWQpLCAnWW91IHNob3VsZCBhdm9pZCBwcm92aWRpbmcgYSAybmQgc3RhdGUgYXJndW1lbnQgdG8gcHVzaCB3aGVuIHRoZSAxc3QgJyArICdhcmd1bWVudCBpcyBhIGxvY2F0aW9uLWxpa2Ugb2JqZWN0IHRoYXQgYWxyZWFkeSBoYXMgc3RhdGU7IGl0IGlzIGlnbm9yZWQnKTtcblxuICAgIHZhciBhY3Rpb24gPSAnUFVTSCc7XG4gICAgdmFyIGxvY2F0aW9uID0gKDAsIF9Mb2NhdGlvblV0aWxzLmNyZWF0ZUxvY2F0aW9uKShwYXRoLCBzdGF0ZSwgY3JlYXRlS2V5KCksIGhpc3RvcnkubG9jYXRpb24pO1xuXG4gICAgdHJhbnNpdGlvbk1hbmFnZXIuY29uZmlybVRyYW5zaXRpb25Ubyhsb2NhdGlvbiwgYWN0aW9uLCBnZXRVc2VyQ29uZmlybWF0aW9uLCBmdW5jdGlvbiAob2spIHtcbiAgICAgIGlmICghb2spIHJldHVybjtcblxuICAgICAgdmFyIGhyZWYgPSBjcmVhdGVIcmVmKGxvY2F0aW9uKTtcbiAgICAgIHZhciBrZXkgPSBsb2NhdGlvbi5rZXksXG4gICAgICAgICAgc3RhdGUgPSBsb2NhdGlvbi5zdGF0ZTtcblxuXG4gICAgICBpZiAoY2FuVXNlSGlzdG9yeSkge1xuICAgICAgICBnbG9iYWxIaXN0b3J5LnB1c2hTdGF0ZSh7IGtleToga2V5LCBzdGF0ZTogc3RhdGUgfSwgbnVsbCwgaHJlZik7XG5cbiAgICAgICAgaWYgKGZvcmNlUmVmcmVzaCkge1xuICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gaHJlZjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB2YXIgcHJldkluZGV4ID0gYWxsS2V5cy5pbmRleE9mKGhpc3RvcnkubG9jYXRpb24ua2V5KTtcbiAgICAgICAgICB2YXIgbmV4dEtleXMgPSBhbGxLZXlzLnNsaWNlKDAsIHByZXZJbmRleCA9PT0gLTEgPyAwIDogcHJldkluZGV4ICsgMSk7XG5cbiAgICAgICAgICBuZXh0S2V5cy5wdXNoKGxvY2F0aW9uLmtleSk7XG4gICAgICAgICAgYWxsS2V5cyA9IG5leHRLZXlzO1xuXG4gICAgICAgICAgc2V0U3RhdGUoeyBhY3Rpb246IGFjdGlvbiwgbG9jYXRpb246IGxvY2F0aW9uIH0pO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAoMCwgX3dhcm5pbmcyLmRlZmF1bHQpKHN0YXRlID09PSB1bmRlZmluZWQsICdCcm93c2VyIGhpc3RvcnkgY2Fubm90IHB1c2ggc3RhdGUgaW4gYnJvd3NlcnMgdGhhdCBkbyBub3Qgc3VwcG9ydCBIVE1MNSBoaXN0b3J5Jyk7XG5cbiAgICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSBocmVmO1xuICAgICAgfVxuICAgIH0pO1xuICB9O1xuXG4gIHZhciByZXBsYWNlID0gZnVuY3Rpb24gcmVwbGFjZShwYXRoLCBzdGF0ZSkge1xuICAgICgwLCBfd2FybmluZzIuZGVmYXVsdCkoISgodHlwZW9mIHBhdGggPT09ICd1bmRlZmluZWQnID8gJ3VuZGVmaW5lZCcgOiBfdHlwZW9mKHBhdGgpKSA9PT0gJ29iamVjdCcgJiYgcGF0aC5zdGF0ZSAhPT0gdW5kZWZpbmVkICYmIHN0YXRlICE9PSB1bmRlZmluZWQpLCAnWW91IHNob3VsZCBhdm9pZCBwcm92aWRpbmcgYSAybmQgc3RhdGUgYXJndW1lbnQgdG8gcmVwbGFjZSB3aGVuIHRoZSAxc3QgJyArICdhcmd1bWVudCBpcyBhIGxvY2F0aW9uLWxpa2Ugb2JqZWN0IHRoYXQgYWxyZWFkeSBoYXMgc3RhdGU7IGl0IGlzIGlnbm9yZWQnKTtcblxuICAgIHZhciBhY3Rpb24gPSAnUkVQTEFDRSc7XG4gICAgdmFyIGxvY2F0aW9uID0gKDAsIF9Mb2NhdGlvblV0aWxzLmNyZWF0ZUxvY2F0aW9uKShwYXRoLCBzdGF0ZSwgY3JlYXRlS2V5KCksIGhpc3RvcnkubG9jYXRpb24pO1xuXG4gICAgdHJhbnNpdGlvbk1hbmFnZXIuY29uZmlybVRyYW5zaXRpb25Ubyhsb2NhdGlvbiwgYWN0aW9uLCBnZXRVc2VyQ29uZmlybWF0aW9uLCBmdW5jdGlvbiAob2spIHtcbiAgICAgIGlmICghb2spIHJldHVybjtcblxuICAgICAgdmFyIGhyZWYgPSBjcmVhdGVIcmVmKGxvY2F0aW9uKTtcbiAgICAgIHZhciBrZXkgPSBsb2NhdGlvbi5rZXksXG4gICAgICAgICAgc3RhdGUgPSBsb2NhdGlvbi5zdGF0ZTtcblxuXG4gICAgICBpZiAoY2FuVXNlSGlzdG9yeSkge1xuICAgICAgICBnbG9iYWxIaXN0b3J5LnJlcGxhY2VTdGF0ZSh7IGtleToga2V5LCBzdGF0ZTogc3RhdGUgfSwgbnVsbCwgaHJlZik7XG5cbiAgICAgICAgaWYgKGZvcmNlUmVmcmVzaCkge1xuICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5yZXBsYWNlKGhyZWYpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHZhciBwcmV2SW5kZXggPSBhbGxLZXlzLmluZGV4T2YoaGlzdG9yeS5sb2NhdGlvbi5rZXkpO1xuXG4gICAgICAgICAgaWYgKHByZXZJbmRleCAhPT0gLTEpIGFsbEtleXNbcHJldkluZGV4XSA9IGxvY2F0aW9uLmtleTtcblxuICAgICAgICAgIHNldFN0YXRlKHsgYWN0aW9uOiBhY3Rpb24sIGxvY2F0aW9uOiBsb2NhdGlvbiB9KTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgKDAsIF93YXJuaW5nMi5kZWZhdWx0KShzdGF0ZSA9PT0gdW5kZWZpbmVkLCAnQnJvd3NlciBoaXN0b3J5IGNhbm5vdCByZXBsYWNlIHN0YXRlIGluIGJyb3dzZXJzIHRoYXQgZG8gbm90IHN1cHBvcnQgSFRNTDUgaGlzdG9yeScpO1xuXG4gICAgICAgIHdpbmRvdy5sb2NhdGlvbi5yZXBsYWNlKGhyZWYpO1xuICAgICAgfVxuICAgIH0pO1xuICB9O1xuXG4gIHZhciBnbyA9IGZ1bmN0aW9uIGdvKG4pIHtcbiAgICBnbG9iYWxIaXN0b3J5LmdvKG4pO1xuICB9O1xuXG4gIHZhciBnb0JhY2sgPSBmdW5jdGlvbiBnb0JhY2soKSB7XG4gICAgcmV0dXJuIGdvKC0xKTtcbiAgfTtcblxuICB2YXIgZ29Gb3J3YXJkID0gZnVuY3Rpb24gZ29Gb3J3YXJkKCkge1xuICAgIHJldHVybiBnbygxKTtcbiAgfTtcblxuICB2YXIgbGlzdGVuZXJDb3VudCA9IDA7XG5cbiAgdmFyIGNoZWNrRE9NTGlzdGVuZXJzID0gZnVuY3Rpb24gY2hlY2tET01MaXN0ZW5lcnMoZGVsdGEpIHtcbiAgICBsaXN0ZW5lckNvdW50ICs9IGRlbHRhO1xuXG4gICAgaWYgKGxpc3RlbmVyQ291bnQgPT09IDEpIHtcbiAgICAgICgwLCBfRE9NVXRpbHMuYWRkRXZlbnRMaXN0ZW5lcikod2luZG93LCBQb3BTdGF0ZUV2ZW50LCBoYW5kbGVQb3BTdGF0ZSk7XG5cbiAgICAgIGlmIChuZWVkc0hhc2hDaGFuZ2VMaXN0ZW5lcikgKDAsIF9ET01VdGlscy5hZGRFdmVudExpc3RlbmVyKSh3aW5kb3csIEhhc2hDaGFuZ2VFdmVudCwgaGFuZGxlSGFzaENoYW5nZSk7XG4gICAgfSBlbHNlIGlmIChsaXN0ZW5lckNvdW50ID09PSAwKSB7XG4gICAgICAoMCwgX0RPTVV0aWxzLnJlbW92ZUV2ZW50TGlzdGVuZXIpKHdpbmRvdywgUG9wU3RhdGVFdmVudCwgaGFuZGxlUG9wU3RhdGUpO1xuXG4gICAgICBpZiAobmVlZHNIYXNoQ2hhbmdlTGlzdGVuZXIpICgwLCBfRE9NVXRpbHMucmVtb3ZlRXZlbnRMaXN0ZW5lcikod2luZG93LCBIYXNoQ2hhbmdlRXZlbnQsIGhhbmRsZUhhc2hDaGFuZ2UpO1xuICAgIH1cbiAgfTtcblxuICB2YXIgaXNCbG9ja2VkID0gZmFsc2U7XG5cbiAgdmFyIGJsb2NrID0gZnVuY3Rpb24gYmxvY2soKSB7XG4gICAgdmFyIHByb21wdCA9IGFyZ3VtZW50cy5sZW5ndGggPiAwICYmIGFyZ3VtZW50c1swXSAhPT0gdW5kZWZpbmVkID8gYXJndW1lbnRzWzBdIDogZmFsc2U7XG5cbiAgICB2YXIgdW5ibG9jayA9IHRyYW5zaXRpb25NYW5hZ2VyLnNldFByb21wdChwcm9tcHQpO1xuXG4gICAgaWYgKCFpc0Jsb2NrZWQpIHtcbiAgICAgIGNoZWNrRE9NTGlzdGVuZXJzKDEpO1xuICAgICAgaXNCbG9ja2VkID0gdHJ1ZTtcbiAgICB9XG5cbiAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgaWYgKGlzQmxvY2tlZCkge1xuICAgICAgICBpc0Jsb2NrZWQgPSBmYWxzZTtcbiAgICAgICAgY2hlY2tET01MaXN0ZW5lcnMoLTEpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gdW5ibG9jaygpO1xuICAgIH07XG4gIH07XG5cbiAgdmFyIGxpc3RlbiA9IGZ1bmN0aW9uIGxpc3RlbihsaXN0ZW5lcikge1xuICAgIHZhciB1bmxpc3RlbiA9IHRyYW5zaXRpb25NYW5hZ2VyLmFwcGVuZExpc3RlbmVyKGxpc3RlbmVyKTtcbiAgICBjaGVja0RPTUxpc3RlbmVycygxKTtcblxuICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICBjaGVja0RPTUxpc3RlbmVycygtMSk7XG4gICAgICB1bmxpc3RlbigpO1xuICAgIH07XG4gIH07XG5cbiAgdmFyIGhpc3RvcnkgPSB7XG4gICAgbGVuZ3RoOiBnbG9iYWxIaXN0b3J5Lmxlbmd0aCxcbiAgICBhY3Rpb246ICdQT1AnLFxuICAgIGxvY2F0aW9uOiBpbml0aWFsTG9jYXRpb24sXG4gICAgY3JlYXRlSHJlZjogY3JlYXRlSHJlZixcbiAgICBwdXNoOiBwdXNoLFxuICAgIHJlcGxhY2U6IHJlcGxhY2UsXG4gICAgZ286IGdvLFxuICAgIGdvQmFjazogZ29CYWNrLFxuICAgIGdvRm9yd2FyZDogZ29Gb3J3YXJkLFxuICAgIGJsb2NrOiBibG9jayxcbiAgICBsaXN0ZW46IGxpc3RlblxuICB9O1xuXG4gIHJldHVybiBoaXN0b3J5O1xufTtcblxuZXhwb3J0cy5kZWZhdWx0ID0gY3JlYXRlQnJvd3Nlckhpc3Rvcnk7IiwiJ3VzZSBzdHJpY3QnO1xuXG5leHBvcnRzLl9fZXNNb2R1bGUgPSB0cnVlO1xuXG52YXIgX2V4dGVuZHMgPSBPYmplY3QuYXNzaWduIHx8IGZ1bmN0aW9uICh0YXJnZXQpIHsgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHsgdmFyIHNvdXJjZSA9IGFyZ3VtZW50c1tpXTsgZm9yICh2YXIga2V5IGluIHNvdXJjZSkgeyBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHNvdXJjZSwga2V5KSkgeyB0YXJnZXRba2V5XSA9IHNvdXJjZVtrZXldOyB9IH0gfSByZXR1cm4gdGFyZ2V0OyB9O1xuXG52YXIgX3dhcm5pbmcgPSByZXF1aXJlKCd3YXJuaW5nJyk7XG5cbnZhciBfd2FybmluZzIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF93YXJuaW5nKTtcblxudmFyIF9pbnZhcmlhbnQgPSByZXF1aXJlKCdpbnZhcmlhbnQnKTtcblxudmFyIF9pbnZhcmlhbnQyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfaW52YXJpYW50KTtcblxudmFyIF9Mb2NhdGlvblV0aWxzID0gcmVxdWlyZSgnLi9Mb2NhdGlvblV0aWxzJyk7XG5cbnZhciBfUGF0aFV0aWxzID0gcmVxdWlyZSgnLi9QYXRoVXRpbHMnKTtcblxudmFyIF9jcmVhdGVUcmFuc2l0aW9uTWFuYWdlciA9IHJlcXVpcmUoJy4vY3JlYXRlVHJhbnNpdGlvbk1hbmFnZXInKTtcblxudmFyIF9jcmVhdGVUcmFuc2l0aW9uTWFuYWdlcjIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9jcmVhdGVUcmFuc2l0aW9uTWFuYWdlcik7XG5cbnZhciBfRE9NVXRpbHMgPSByZXF1aXJlKCcuL0RPTVV0aWxzJyk7XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZURlZmF1bHQob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7IGRlZmF1bHQ6IG9iaiB9OyB9XG5cbnZhciBIYXNoQ2hhbmdlRXZlbnQgPSAnaGFzaGNoYW5nZSc7XG5cbnZhciBIYXNoUGF0aENvZGVycyA9IHtcbiAgaGFzaGJhbmc6IHtcbiAgICBlbmNvZGVQYXRoOiBmdW5jdGlvbiBlbmNvZGVQYXRoKHBhdGgpIHtcbiAgICAgIHJldHVybiBwYXRoLmNoYXJBdCgwKSA9PT0gJyEnID8gcGF0aCA6ICchLycgKyAoMCwgX1BhdGhVdGlscy5zdHJpcExlYWRpbmdTbGFzaCkocGF0aCk7XG4gICAgfSxcbiAgICBkZWNvZGVQYXRoOiBmdW5jdGlvbiBkZWNvZGVQYXRoKHBhdGgpIHtcbiAgICAgIHJldHVybiBwYXRoLmNoYXJBdCgwKSA9PT0gJyEnID8gcGF0aC5zdWJzdHIoMSkgOiBwYXRoO1xuICAgIH1cbiAgfSxcbiAgbm9zbGFzaDoge1xuICAgIGVuY29kZVBhdGg6IF9QYXRoVXRpbHMuc3RyaXBMZWFkaW5nU2xhc2gsXG4gICAgZGVjb2RlUGF0aDogX1BhdGhVdGlscy5hZGRMZWFkaW5nU2xhc2hcbiAgfSxcbiAgc2xhc2g6IHtcbiAgICBlbmNvZGVQYXRoOiBfUGF0aFV0aWxzLmFkZExlYWRpbmdTbGFzaCxcbiAgICBkZWNvZGVQYXRoOiBfUGF0aFV0aWxzLmFkZExlYWRpbmdTbGFzaFxuICB9XG59O1xuXG52YXIgZ2V0SGFzaFBhdGggPSBmdW5jdGlvbiBnZXRIYXNoUGF0aCgpIHtcbiAgLy8gV2UgY2FuJ3QgdXNlIHdpbmRvdy5sb2NhdGlvbi5oYXNoIGhlcmUgYmVjYXVzZSBpdCdzIG5vdFxuICAvLyBjb25zaXN0ZW50IGFjcm9zcyBicm93c2VycyAtIEZpcmVmb3ggd2lsbCBwcmUtZGVjb2RlIGl0IVxuICB2YXIgaHJlZiA9IHdpbmRvdy5sb2NhdGlvbi5ocmVmO1xuICB2YXIgaGFzaEluZGV4ID0gaHJlZi5pbmRleE9mKCcjJyk7XG4gIHJldHVybiBoYXNoSW5kZXggPT09IC0xID8gJycgOiBocmVmLnN1YnN0cmluZyhoYXNoSW5kZXggKyAxKTtcbn07XG5cbnZhciBwdXNoSGFzaFBhdGggPSBmdW5jdGlvbiBwdXNoSGFzaFBhdGgocGF0aCkge1xuICByZXR1cm4gd2luZG93LmxvY2F0aW9uLmhhc2ggPSBwYXRoO1xufTtcblxudmFyIHJlcGxhY2VIYXNoUGF0aCA9IGZ1bmN0aW9uIHJlcGxhY2VIYXNoUGF0aChwYXRoKSB7XG4gIHZhciBoYXNoSW5kZXggPSB3aW5kb3cubG9jYXRpb24uaHJlZi5pbmRleE9mKCcjJyk7XG5cbiAgd2luZG93LmxvY2F0aW9uLnJlcGxhY2Uod2luZG93LmxvY2F0aW9uLmhyZWYuc2xpY2UoMCwgaGFzaEluZGV4ID49IDAgPyBoYXNoSW5kZXggOiAwKSArICcjJyArIHBhdGgpO1xufTtcblxudmFyIGNyZWF0ZUhhc2hIaXN0b3J5ID0gZnVuY3Rpb24gY3JlYXRlSGFzaEhpc3RvcnkoKSB7XG4gIHZhciBwcm9wcyA9IGFyZ3VtZW50cy5sZW5ndGggPiAwICYmIGFyZ3VtZW50c1swXSAhPT0gdW5kZWZpbmVkID8gYXJndW1lbnRzWzBdIDoge307XG5cbiAgKDAsIF9pbnZhcmlhbnQyLmRlZmF1bHQpKF9ET01VdGlscy5jYW5Vc2VET00sICdIYXNoIGhpc3RvcnkgbmVlZHMgYSBET00nKTtcblxuICB2YXIgZ2xvYmFsSGlzdG9yeSA9IHdpbmRvdy5oaXN0b3J5O1xuICB2YXIgY2FuR29XaXRob3V0UmVsb2FkID0gKDAsIF9ET01VdGlscy5zdXBwb3J0c0dvV2l0aG91dFJlbG9hZFVzaW5nSGFzaCkoKTtcblxuICB2YXIgX3Byb3BzJGdldFVzZXJDb25maXJtID0gcHJvcHMuZ2V0VXNlckNvbmZpcm1hdGlvbixcbiAgICAgIGdldFVzZXJDb25maXJtYXRpb24gPSBfcHJvcHMkZ2V0VXNlckNvbmZpcm0gPT09IHVuZGVmaW5lZCA/IF9ET01VdGlscy5nZXRDb25maXJtYXRpb24gOiBfcHJvcHMkZ2V0VXNlckNvbmZpcm0sXG4gICAgICBfcHJvcHMkaGFzaFR5cGUgPSBwcm9wcy5oYXNoVHlwZSxcbiAgICAgIGhhc2hUeXBlID0gX3Byb3BzJGhhc2hUeXBlID09PSB1bmRlZmluZWQgPyAnc2xhc2gnIDogX3Byb3BzJGhhc2hUeXBlO1xuXG4gIHZhciBiYXNlbmFtZSA9IHByb3BzLmJhc2VuYW1lID8gKDAsIF9QYXRoVXRpbHMuc3RyaXBUcmFpbGluZ1NsYXNoKSgoMCwgX1BhdGhVdGlscy5hZGRMZWFkaW5nU2xhc2gpKHByb3BzLmJhc2VuYW1lKSkgOiAnJztcblxuICB2YXIgX0hhc2hQYXRoQ29kZXJzJGhhc2hUID0gSGFzaFBhdGhDb2RlcnNbaGFzaFR5cGVdLFxuICAgICAgZW5jb2RlUGF0aCA9IF9IYXNoUGF0aENvZGVycyRoYXNoVC5lbmNvZGVQYXRoLFxuICAgICAgZGVjb2RlUGF0aCA9IF9IYXNoUGF0aENvZGVycyRoYXNoVC5kZWNvZGVQYXRoO1xuXG5cbiAgdmFyIGdldERPTUxvY2F0aW9uID0gZnVuY3Rpb24gZ2V0RE9NTG9jYXRpb24oKSB7XG4gICAgdmFyIHBhdGggPSBkZWNvZGVQYXRoKGdldEhhc2hQYXRoKCkpO1xuXG4gICAgaWYgKGJhc2VuYW1lKSBwYXRoID0gKDAsIF9QYXRoVXRpbHMuc3RyaXBQcmVmaXgpKHBhdGgsIGJhc2VuYW1lKTtcblxuICAgIHJldHVybiAoMCwgX1BhdGhVdGlscy5wYXJzZVBhdGgpKHBhdGgpO1xuICB9O1xuXG4gIHZhciB0cmFuc2l0aW9uTWFuYWdlciA9ICgwLCBfY3JlYXRlVHJhbnNpdGlvbk1hbmFnZXIyLmRlZmF1bHQpKCk7XG5cbiAgdmFyIHNldFN0YXRlID0gZnVuY3Rpb24gc2V0U3RhdGUobmV4dFN0YXRlKSB7XG4gICAgX2V4dGVuZHMoaGlzdG9yeSwgbmV4dFN0YXRlKTtcblxuICAgIGhpc3RvcnkubGVuZ3RoID0gZ2xvYmFsSGlzdG9yeS5sZW5ndGg7XG5cbiAgICB0cmFuc2l0aW9uTWFuYWdlci5ub3RpZnlMaXN0ZW5lcnMoaGlzdG9yeS5sb2NhdGlvbiwgaGlzdG9yeS5hY3Rpb24pO1xuICB9O1xuXG4gIHZhciBmb3JjZU5leHRQb3AgPSBmYWxzZTtcbiAgdmFyIGlnbm9yZVBhdGggPSBudWxsO1xuXG4gIHZhciBoYW5kbGVIYXNoQ2hhbmdlID0gZnVuY3Rpb24gaGFuZGxlSGFzaENoYW5nZSgpIHtcbiAgICB2YXIgcGF0aCA9IGdldEhhc2hQYXRoKCk7XG4gICAgdmFyIGVuY29kZWRQYXRoID0gZW5jb2RlUGF0aChwYXRoKTtcblxuICAgIGlmIChwYXRoICE9PSBlbmNvZGVkUGF0aCkge1xuICAgICAgLy8gRW5zdXJlIHdlIGFsd2F5cyBoYXZlIGEgcHJvcGVybHktZW5jb2RlZCBoYXNoLlxuICAgICAgcmVwbGFjZUhhc2hQYXRoKGVuY29kZWRQYXRoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIGxvY2F0aW9uID0gZ2V0RE9NTG9jYXRpb24oKTtcbiAgICAgIHZhciBwcmV2TG9jYXRpb24gPSBoaXN0b3J5LmxvY2F0aW9uO1xuXG4gICAgICBpZiAoIWZvcmNlTmV4dFBvcCAmJiAoMCwgX0xvY2F0aW9uVXRpbHMubG9jYXRpb25zQXJlRXF1YWwpKHByZXZMb2NhdGlvbiwgbG9jYXRpb24pKSByZXR1cm47IC8vIEEgaGFzaGNoYW5nZSBkb2Vzbid0IGFsd2F5cyA9PSBsb2NhdGlvbiBjaGFuZ2UuXG5cbiAgICAgIGlmIChpZ25vcmVQYXRoID09PSAoMCwgX1BhdGhVdGlscy5jcmVhdGVQYXRoKShsb2NhdGlvbikpIHJldHVybjsgLy8gSWdub3JlIHRoaXMgY2hhbmdlOyB3ZSBhbHJlYWR5IHNldFN0YXRlIGluIHB1c2gvcmVwbGFjZS5cblxuICAgICAgaWdub3JlUGF0aCA9IG51bGw7XG5cbiAgICAgIGhhbmRsZVBvcChsb2NhdGlvbik7XG4gICAgfVxuICB9O1xuXG4gIHZhciBoYW5kbGVQb3AgPSBmdW5jdGlvbiBoYW5kbGVQb3AobG9jYXRpb24pIHtcbiAgICBpZiAoZm9yY2VOZXh0UG9wKSB7XG4gICAgICBmb3JjZU5leHRQb3AgPSBmYWxzZTtcbiAgICAgIHNldFN0YXRlKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBhY3Rpb24gPSAnUE9QJztcblxuICAgICAgdHJhbnNpdGlvbk1hbmFnZXIuY29uZmlybVRyYW5zaXRpb25Ubyhsb2NhdGlvbiwgYWN0aW9uLCBnZXRVc2VyQ29uZmlybWF0aW9uLCBmdW5jdGlvbiAob2spIHtcbiAgICAgICAgaWYgKG9rKSB7XG4gICAgICAgICAgc2V0U3RhdGUoeyBhY3Rpb246IGFjdGlvbiwgbG9jYXRpb246IGxvY2F0aW9uIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldmVydFBvcChsb2NhdGlvbik7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgfTtcblxuICB2YXIgcmV2ZXJ0UG9wID0gZnVuY3Rpb24gcmV2ZXJ0UG9wKGZyb21Mb2NhdGlvbikge1xuICAgIHZhciB0b0xvY2F0aW9uID0gaGlzdG9yeS5sb2NhdGlvbjtcblxuICAgIC8vIFRPRE86IFdlIGNvdWxkIHByb2JhYmx5IG1ha2UgdGhpcyBtb3JlIHJlbGlhYmxlIGJ5XG4gICAgLy8ga2VlcGluZyBhIGxpc3Qgb2YgcGF0aHMgd2UndmUgc2VlbiBpbiBzZXNzaW9uU3RvcmFnZS5cbiAgICAvLyBJbnN0ZWFkLCB3ZSBqdXN0IGRlZmF1bHQgdG8gMCBmb3IgcGF0aHMgd2UgZG9uJ3Qga25vdy5cblxuICAgIHZhciB0b0luZGV4ID0gYWxsUGF0aHMubGFzdEluZGV4T2YoKDAsIF9QYXRoVXRpbHMuY3JlYXRlUGF0aCkodG9Mb2NhdGlvbikpO1xuXG4gICAgaWYgKHRvSW5kZXggPT09IC0xKSB0b0luZGV4ID0gMDtcblxuICAgIHZhciBmcm9tSW5kZXggPSBhbGxQYXRocy5sYXN0SW5kZXhPZigoMCwgX1BhdGhVdGlscy5jcmVhdGVQYXRoKShmcm9tTG9jYXRpb24pKTtcblxuICAgIGlmIChmcm9tSW5kZXggPT09IC0xKSBmcm9tSW5kZXggPSAwO1xuXG4gICAgdmFyIGRlbHRhID0gdG9JbmRleCAtIGZyb21JbmRleDtcblxuICAgIGlmIChkZWx0YSkge1xuICAgICAgZm9yY2VOZXh0UG9wID0gdHJ1ZTtcbiAgICAgIGdvKGRlbHRhKTtcbiAgICB9XG4gIH07XG5cbiAgLy8gRW5zdXJlIHRoZSBoYXNoIGlzIGVuY29kZWQgcHJvcGVybHkgYmVmb3JlIGRvaW5nIGFueXRoaW5nIGVsc2UuXG4gIHZhciBwYXRoID0gZ2V0SGFzaFBhdGgoKTtcbiAgdmFyIGVuY29kZWRQYXRoID0gZW5jb2RlUGF0aChwYXRoKTtcblxuICBpZiAocGF0aCAhPT0gZW5jb2RlZFBhdGgpIHJlcGxhY2VIYXNoUGF0aChlbmNvZGVkUGF0aCk7XG5cbiAgdmFyIGluaXRpYWxMb2NhdGlvbiA9IGdldERPTUxvY2F0aW9uKCk7XG4gIHZhciBhbGxQYXRocyA9IFsoMCwgX1BhdGhVdGlscy5jcmVhdGVQYXRoKShpbml0aWFsTG9jYXRpb24pXTtcblxuICAvLyBQdWJsaWMgaW50ZXJmYWNlXG5cbiAgdmFyIGNyZWF0ZUhyZWYgPSBmdW5jdGlvbiBjcmVhdGVIcmVmKGxvY2F0aW9uKSB7XG4gICAgcmV0dXJuICcjJyArIGVuY29kZVBhdGgoYmFzZW5hbWUgKyAoMCwgX1BhdGhVdGlscy5jcmVhdGVQYXRoKShsb2NhdGlvbikpO1xuICB9O1xuXG4gIHZhciBwdXNoID0gZnVuY3Rpb24gcHVzaChwYXRoLCBzdGF0ZSkge1xuICAgICgwLCBfd2FybmluZzIuZGVmYXVsdCkoc3RhdGUgPT09IHVuZGVmaW5lZCwgJ0hhc2ggaGlzdG9yeSBjYW5ub3QgcHVzaCBzdGF0ZTsgaXQgaXMgaWdub3JlZCcpO1xuXG4gICAgdmFyIGFjdGlvbiA9ICdQVVNIJztcbiAgICB2YXIgbG9jYXRpb24gPSAoMCwgX0xvY2F0aW9uVXRpbHMuY3JlYXRlTG9jYXRpb24pKHBhdGgsIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCBoaXN0b3J5LmxvY2F0aW9uKTtcblxuICAgIHRyYW5zaXRpb25NYW5hZ2VyLmNvbmZpcm1UcmFuc2l0aW9uVG8obG9jYXRpb24sIGFjdGlvbiwgZ2V0VXNlckNvbmZpcm1hdGlvbiwgZnVuY3Rpb24gKG9rKSB7XG4gICAgICBpZiAoIW9rKSByZXR1cm47XG5cbiAgICAgIHZhciBwYXRoID0gKDAsIF9QYXRoVXRpbHMuY3JlYXRlUGF0aCkobG9jYXRpb24pO1xuICAgICAgdmFyIGVuY29kZWRQYXRoID0gZW5jb2RlUGF0aChiYXNlbmFtZSArIHBhdGgpO1xuICAgICAgdmFyIGhhc2hDaGFuZ2VkID0gZ2V0SGFzaFBhdGgoKSAhPT0gZW5jb2RlZFBhdGg7XG5cbiAgICAgIGlmIChoYXNoQ2hhbmdlZCkge1xuICAgICAgICAvLyBXZSBjYW5ub3QgdGVsbCBpZiBhIGhhc2hjaGFuZ2Ugd2FzIGNhdXNlZCBieSBhIFBVU0gsIHNvIHdlJ2RcbiAgICAgICAgLy8gcmF0aGVyIHNldFN0YXRlIGhlcmUgYW5kIGlnbm9yZSB0aGUgaGFzaGNoYW5nZS4gVGhlIGNhdmVhdCBoZXJlXG4gICAgICAgIC8vIGlzIHRoYXQgb3RoZXIgaGFzaCBoaXN0b3JpZXMgaW4gdGhlIHBhZ2Ugd2lsbCBjb25zaWRlciBpdCBhIFBPUC5cbiAgICAgICAgaWdub3JlUGF0aCA9IHBhdGg7XG4gICAgICAgIHB1c2hIYXNoUGF0aChlbmNvZGVkUGF0aCk7XG5cbiAgICAgICAgdmFyIHByZXZJbmRleCA9IGFsbFBhdGhzLmxhc3RJbmRleE9mKCgwLCBfUGF0aFV0aWxzLmNyZWF0ZVBhdGgpKGhpc3RvcnkubG9jYXRpb24pKTtcbiAgICAgICAgdmFyIG5leHRQYXRocyA9IGFsbFBhdGhzLnNsaWNlKDAsIHByZXZJbmRleCA9PT0gLTEgPyAwIDogcHJldkluZGV4ICsgMSk7XG5cbiAgICAgICAgbmV4dFBhdGhzLnB1c2gocGF0aCk7XG4gICAgICAgIGFsbFBhdGhzID0gbmV4dFBhdGhzO1xuXG4gICAgICAgIHNldFN0YXRlKHsgYWN0aW9uOiBhY3Rpb24sIGxvY2F0aW9uOiBsb2NhdGlvbiB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgICgwLCBfd2FybmluZzIuZGVmYXVsdCkoZmFsc2UsICdIYXNoIGhpc3RvcnkgY2Fubm90IFBVU0ggdGhlIHNhbWUgcGF0aDsgYSBuZXcgZW50cnkgd2lsbCBub3QgYmUgYWRkZWQgdG8gdGhlIGhpc3Rvcnkgc3RhY2snKTtcblxuICAgICAgICBzZXRTdGF0ZSgpO1xuICAgICAgfVxuICAgIH0pO1xuICB9O1xuXG4gIHZhciByZXBsYWNlID0gZnVuY3Rpb24gcmVwbGFjZShwYXRoLCBzdGF0ZSkge1xuICAgICgwLCBfd2FybmluZzIuZGVmYXVsdCkoc3RhdGUgPT09IHVuZGVmaW5lZCwgJ0hhc2ggaGlzdG9yeSBjYW5ub3QgcmVwbGFjZSBzdGF0ZTsgaXQgaXMgaWdub3JlZCcpO1xuXG4gICAgdmFyIGFjdGlvbiA9ICdSRVBMQUNFJztcbiAgICB2YXIgbG9jYXRpb24gPSAoMCwgX0xvY2F0aW9uVXRpbHMuY3JlYXRlTG9jYXRpb24pKHBhdGgsIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCBoaXN0b3J5LmxvY2F0aW9uKTtcblxuICAgIHRyYW5zaXRpb25NYW5hZ2VyLmNvbmZpcm1UcmFuc2l0aW9uVG8obG9jYXRpb24sIGFjdGlvbiwgZ2V0VXNlckNvbmZpcm1hdGlvbiwgZnVuY3Rpb24gKG9rKSB7XG4gICAgICBpZiAoIW9rKSByZXR1cm47XG5cbiAgICAgIHZhciBwYXRoID0gKDAsIF9QYXRoVXRpbHMuY3JlYXRlUGF0aCkobG9jYXRpb24pO1xuICAgICAgdmFyIGVuY29kZWRQYXRoID0gZW5jb2RlUGF0aChiYXNlbmFtZSArIHBhdGgpO1xuICAgICAgdmFyIGhhc2hDaGFuZ2VkID0gZ2V0SGFzaFBhdGgoKSAhPT0gZW5jb2RlZFBhdGg7XG5cbiAgICAgIGlmIChoYXNoQ2hhbmdlZCkge1xuICAgICAgICAvLyBXZSBjYW5ub3QgdGVsbCBpZiBhIGhhc2hjaGFuZ2Ugd2FzIGNhdXNlZCBieSBhIFJFUExBQ0UsIHNvIHdlJ2RcbiAgICAgICAgLy8gcmF0aGVyIHNldFN0YXRlIGhlcmUgYW5kIGlnbm9yZSB0aGUgaGFzaGNoYW5nZS4gVGhlIGNhdmVhdCBoZXJlXG4gICAgICAgIC8vIGlzIHRoYXQgb3RoZXIgaGFzaCBoaXN0b3JpZXMgaW4gdGhlIHBhZ2Ugd2lsbCBjb25zaWRlciBpdCBhIFBPUC5cbiAgICAgICAgaWdub3JlUGF0aCA9IHBhdGg7XG4gICAgICAgIHJlcGxhY2VIYXNoUGF0aChlbmNvZGVkUGF0aCk7XG4gICAgICB9XG5cbiAgICAgIHZhciBwcmV2SW5kZXggPSBhbGxQYXRocy5pbmRleE9mKCgwLCBfUGF0aFV0aWxzLmNyZWF0ZVBhdGgpKGhpc3RvcnkubG9jYXRpb24pKTtcblxuICAgICAgaWYgKHByZXZJbmRleCAhPT0gLTEpIGFsbFBhdGhzW3ByZXZJbmRleF0gPSBwYXRoO1xuXG4gICAgICBzZXRTdGF0ZSh7IGFjdGlvbjogYWN0aW9uLCBsb2NhdGlvbjogbG9jYXRpb24gfSk7XG4gICAgfSk7XG4gIH07XG5cbiAgdmFyIGdvID0gZnVuY3Rpb24gZ28obikge1xuICAgICgwLCBfd2FybmluZzIuZGVmYXVsdCkoY2FuR29XaXRob3V0UmVsb2FkLCAnSGFzaCBoaXN0b3J5IGdvKG4pIGNhdXNlcyBhIGZ1bGwgcGFnZSByZWxvYWQgaW4gdGhpcyBicm93c2VyJyk7XG5cbiAgICBnbG9iYWxIaXN0b3J5LmdvKG4pO1xuICB9O1xuXG4gIHZhciBnb0JhY2sgPSBmdW5jdGlvbiBnb0JhY2soKSB7XG4gICAgcmV0dXJuIGdvKC0xKTtcbiAgfTtcblxuICB2YXIgZ29Gb3J3YXJkID0gZnVuY3Rpb24gZ29Gb3J3YXJkKCkge1xuICAgIHJldHVybiBnbygxKTtcbiAgfTtcblxuICB2YXIgbGlzdGVuZXJDb3VudCA9IDA7XG5cbiAgdmFyIGNoZWNrRE9NTGlzdGVuZXJzID0gZnVuY3Rpb24gY2hlY2tET01MaXN0ZW5lcnMoZGVsdGEpIHtcbiAgICBsaXN0ZW5lckNvdW50ICs9IGRlbHRhO1xuXG4gICAgaWYgKGxpc3RlbmVyQ291bnQgPT09IDEpIHtcbiAgICAgICgwLCBfRE9NVXRpbHMuYWRkRXZlbnRMaXN0ZW5lcikod2luZG93LCBIYXNoQ2hhbmdlRXZlbnQsIGhhbmRsZUhhc2hDaGFuZ2UpO1xuICAgIH0gZWxzZSBpZiAobGlzdGVuZXJDb3VudCA9PT0gMCkge1xuICAgICAgKDAsIF9ET01VdGlscy5yZW1vdmVFdmVudExpc3RlbmVyKSh3aW5kb3csIEhhc2hDaGFuZ2VFdmVudCwgaGFuZGxlSGFzaENoYW5nZSk7XG4gICAgfVxuICB9O1xuXG4gIHZhciBpc0Jsb2NrZWQgPSBmYWxzZTtcblxuICB2YXIgYmxvY2sgPSBmdW5jdGlvbiBibG9jaygpIHtcbiAgICB2YXIgcHJvbXB0ID0gYXJndW1lbnRzLmxlbmd0aCA+IDAgJiYgYXJndW1lbnRzWzBdICE9PSB1bmRlZmluZWQgPyBhcmd1bWVudHNbMF0gOiBmYWxzZTtcblxuICAgIHZhciB1bmJsb2NrID0gdHJhbnNpdGlvbk1hbmFnZXIuc2V0UHJvbXB0KHByb21wdCk7XG5cbiAgICBpZiAoIWlzQmxvY2tlZCkge1xuICAgICAgY2hlY2tET01MaXN0ZW5lcnMoMSk7XG4gICAgICBpc0Jsb2NrZWQgPSB0cnVlO1xuICAgIH1cblxuICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICBpZiAoaXNCbG9ja2VkKSB7XG4gICAgICAgIGlzQmxvY2tlZCA9IGZhbHNlO1xuICAgICAgICBjaGVja0RPTUxpc3RlbmVycygtMSk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB1bmJsb2NrKCk7XG4gICAgfTtcbiAgfTtcblxuICB2YXIgbGlzdGVuID0gZnVuY3Rpb24gbGlzdGVuKGxpc3RlbmVyKSB7XG4gICAgdmFyIHVubGlzdGVuID0gdHJhbnNpdGlvbk1hbmFnZXIuYXBwZW5kTGlzdGVuZXIobGlzdGVuZXIpO1xuICAgIGNoZWNrRE9NTGlzdGVuZXJzKDEpO1xuXG4gICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgIGNoZWNrRE9NTGlzdGVuZXJzKC0xKTtcbiAgICAgIHVubGlzdGVuKCk7XG4gICAgfTtcbiAgfTtcblxuICB2YXIgaGlzdG9yeSA9IHtcbiAgICBsZW5ndGg6IGdsb2JhbEhpc3RvcnkubGVuZ3RoLFxuICAgIGFjdGlvbjogJ1BPUCcsXG4gICAgbG9jYXRpb246IGluaXRpYWxMb2NhdGlvbixcbiAgICBjcmVhdGVIcmVmOiBjcmVhdGVIcmVmLFxuICAgIHB1c2g6IHB1c2gsXG4gICAgcmVwbGFjZTogcmVwbGFjZSxcbiAgICBnbzogZ28sXG4gICAgZ29CYWNrOiBnb0JhY2ssXG4gICAgZ29Gb3J3YXJkOiBnb0ZvcndhcmQsXG4gICAgYmxvY2s6IGJsb2NrLFxuICAgIGxpc3RlbjogbGlzdGVuXG4gIH07XG5cbiAgcmV0dXJuIGhpc3Rvcnk7XG59O1xuXG5leHBvcnRzLmRlZmF1bHQgPSBjcmVhdGVIYXNoSGlzdG9yeTsiLCIndXNlIHN0cmljdCc7XG5cbmV4cG9ydHMuX19lc01vZHVsZSA9IHRydWU7XG5cbnZhciBfdHlwZW9mID0gdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIHR5cGVvZiBTeW1ib2wuaXRlcmF0b3IgPT09IFwic3ltYm9sXCIgPyBmdW5jdGlvbiAob2JqKSB7IHJldHVybiB0eXBlb2Ygb2JqOyB9IDogZnVuY3Rpb24gKG9iaikgeyByZXR1cm4gb2JqICYmIHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiBvYmouY29uc3RydWN0b3IgPT09IFN5bWJvbCAmJiBvYmogIT09IFN5bWJvbC5wcm90b3R5cGUgPyBcInN5bWJvbFwiIDogdHlwZW9mIG9iajsgfTtcblxudmFyIF9leHRlbmRzID0gT2JqZWN0LmFzc2lnbiB8fCBmdW5jdGlvbiAodGFyZ2V0KSB7IGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7IHZhciBzb3VyY2UgPSBhcmd1bWVudHNbaV07IGZvciAodmFyIGtleSBpbiBzb3VyY2UpIHsgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChzb3VyY2UsIGtleSkpIHsgdGFyZ2V0W2tleV0gPSBzb3VyY2Vba2V5XTsgfSB9IH0gcmV0dXJuIHRhcmdldDsgfTtcblxudmFyIF93YXJuaW5nID0gcmVxdWlyZSgnd2FybmluZycpO1xuXG52YXIgX3dhcm5pbmcyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfd2FybmluZyk7XG5cbnZhciBfUGF0aFV0aWxzID0gcmVxdWlyZSgnLi9QYXRoVXRpbHMnKTtcblxudmFyIF9Mb2NhdGlvblV0aWxzID0gcmVxdWlyZSgnLi9Mb2NhdGlvblV0aWxzJyk7XG5cbnZhciBfY3JlYXRlVHJhbnNpdGlvbk1hbmFnZXIgPSByZXF1aXJlKCcuL2NyZWF0ZVRyYW5zaXRpb25NYW5hZ2VyJyk7XG5cbnZhciBfY3JlYXRlVHJhbnNpdGlvbk1hbmFnZXIyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfY3JlYXRlVHJhbnNpdGlvbk1hbmFnZXIpO1xuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KG9iaikgeyByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyBkZWZhdWx0OiBvYmogfTsgfVxuXG52YXIgY2xhbXAgPSBmdW5jdGlvbiBjbGFtcChuLCBsb3dlckJvdW5kLCB1cHBlckJvdW5kKSB7XG4gIHJldHVybiBNYXRoLm1pbihNYXRoLm1heChuLCBsb3dlckJvdW5kKSwgdXBwZXJCb3VuZCk7XG59O1xuXG4vKipcbiAqIENyZWF0ZXMgYSBoaXN0b3J5IG9iamVjdCB0aGF0IHN0b3JlcyBsb2NhdGlvbnMgaW4gbWVtb3J5LlxuICovXG52YXIgY3JlYXRlTWVtb3J5SGlzdG9yeSA9IGZ1bmN0aW9uIGNyZWF0ZU1lbW9yeUhpc3RvcnkoKSB7XG4gIHZhciBwcm9wcyA9IGFyZ3VtZW50cy5sZW5ndGggPiAwICYmIGFyZ3VtZW50c1swXSAhPT0gdW5kZWZpbmVkID8gYXJndW1lbnRzWzBdIDoge307XG4gIHZhciBnZXRVc2VyQ29uZmlybWF0aW9uID0gcHJvcHMuZ2V0VXNlckNvbmZpcm1hdGlvbixcbiAgICAgIF9wcm9wcyRpbml0aWFsRW50cmllcyA9IHByb3BzLmluaXRpYWxFbnRyaWVzLFxuICAgICAgaW5pdGlhbEVudHJpZXMgPSBfcHJvcHMkaW5pdGlhbEVudHJpZXMgPT09IHVuZGVmaW5lZCA/IFsnLyddIDogX3Byb3BzJGluaXRpYWxFbnRyaWVzLFxuICAgICAgX3Byb3BzJGluaXRpYWxJbmRleCA9IHByb3BzLmluaXRpYWxJbmRleCxcbiAgICAgIGluaXRpYWxJbmRleCA9IF9wcm9wcyRpbml0aWFsSW5kZXggPT09IHVuZGVmaW5lZCA/IDAgOiBfcHJvcHMkaW5pdGlhbEluZGV4LFxuICAgICAgX3Byb3BzJGtleUxlbmd0aCA9IHByb3BzLmtleUxlbmd0aCxcbiAgICAgIGtleUxlbmd0aCA9IF9wcm9wcyRrZXlMZW5ndGggPT09IHVuZGVmaW5lZCA/IDYgOiBfcHJvcHMka2V5TGVuZ3RoO1xuXG5cbiAgdmFyIHRyYW5zaXRpb25NYW5hZ2VyID0gKDAsIF9jcmVhdGVUcmFuc2l0aW9uTWFuYWdlcjIuZGVmYXVsdCkoKTtcblxuICB2YXIgc2V0U3RhdGUgPSBmdW5jdGlvbiBzZXRTdGF0ZShuZXh0U3RhdGUpIHtcbiAgICBfZXh0ZW5kcyhoaXN0b3J5LCBuZXh0U3RhdGUpO1xuXG4gICAgaGlzdG9yeS5sZW5ndGggPSBoaXN0b3J5LmVudHJpZXMubGVuZ3RoO1xuXG4gICAgdHJhbnNpdGlvbk1hbmFnZXIubm90aWZ5TGlzdGVuZXJzKGhpc3RvcnkubG9jYXRpb24sIGhpc3RvcnkuYWN0aW9uKTtcbiAgfTtcblxuICB2YXIgY3JlYXRlS2V5ID0gZnVuY3Rpb24gY3JlYXRlS2V5KCkge1xuICAgIHJldHVybiBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zdWJzdHIoMiwga2V5TGVuZ3RoKTtcbiAgfTtcblxuICB2YXIgaW5kZXggPSBjbGFtcChpbml0aWFsSW5kZXgsIDAsIGluaXRpYWxFbnRyaWVzLmxlbmd0aCAtIDEpO1xuICB2YXIgZW50cmllcyA9IGluaXRpYWxFbnRyaWVzLm1hcChmdW5jdGlvbiAoZW50cnkpIHtcbiAgICByZXR1cm4gdHlwZW9mIGVudHJ5ID09PSAnc3RyaW5nJyA/ICgwLCBfTG9jYXRpb25VdGlscy5jcmVhdGVMb2NhdGlvbikoZW50cnksIHVuZGVmaW5lZCwgY3JlYXRlS2V5KCkpIDogKDAsIF9Mb2NhdGlvblV0aWxzLmNyZWF0ZUxvY2F0aW9uKShlbnRyeSwgdW5kZWZpbmVkLCBlbnRyeS5rZXkgfHwgY3JlYXRlS2V5KCkpO1xuICB9KTtcblxuICAvLyBQdWJsaWMgaW50ZXJmYWNlXG5cbiAgdmFyIGNyZWF0ZUhyZWYgPSBfUGF0aFV0aWxzLmNyZWF0ZVBhdGg7XG5cbiAgdmFyIHB1c2ggPSBmdW5jdGlvbiBwdXNoKHBhdGgsIHN0YXRlKSB7XG4gICAgKDAsIF93YXJuaW5nMi5kZWZhdWx0KSghKCh0eXBlb2YgcGF0aCA9PT0gJ3VuZGVmaW5lZCcgPyAndW5kZWZpbmVkJyA6IF90eXBlb2YocGF0aCkpID09PSAnb2JqZWN0JyAmJiBwYXRoLnN0YXRlICE9PSB1bmRlZmluZWQgJiYgc3RhdGUgIT09IHVuZGVmaW5lZCksICdZb3Ugc2hvdWxkIGF2b2lkIHByb3ZpZGluZyBhIDJuZCBzdGF0ZSBhcmd1bWVudCB0byBwdXNoIHdoZW4gdGhlIDFzdCAnICsgJ2FyZ3VtZW50IGlzIGEgbG9jYXRpb24tbGlrZSBvYmplY3QgdGhhdCBhbHJlYWR5IGhhcyBzdGF0ZTsgaXQgaXMgaWdub3JlZCcpO1xuXG4gICAgdmFyIGFjdGlvbiA9ICdQVVNIJztcbiAgICB2YXIgbG9jYXRpb24gPSAoMCwgX0xvY2F0aW9uVXRpbHMuY3JlYXRlTG9jYXRpb24pKHBhdGgsIHN0YXRlLCBjcmVhdGVLZXkoKSwgaGlzdG9yeS5sb2NhdGlvbik7XG5cbiAgICB0cmFuc2l0aW9uTWFuYWdlci5jb25maXJtVHJhbnNpdGlvblRvKGxvY2F0aW9uLCBhY3Rpb24sIGdldFVzZXJDb25maXJtYXRpb24sIGZ1bmN0aW9uIChvaykge1xuICAgICAgaWYgKCFvaykgcmV0dXJuO1xuXG4gICAgICB2YXIgcHJldkluZGV4ID0gaGlzdG9yeS5pbmRleDtcbiAgICAgIHZhciBuZXh0SW5kZXggPSBwcmV2SW5kZXggKyAxO1xuXG4gICAgICB2YXIgbmV4dEVudHJpZXMgPSBoaXN0b3J5LmVudHJpZXMuc2xpY2UoMCk7XG4gICAgICBpZiAobmV4dEVudHJpZXMubGVuZ3RoID4gbmV4dEluZGV4KSB7XG4gICAgICAgIG5leHRFbnRyaWVzLnNwbGljZShuZXh0SW5kZXgsIG5leHRFbnRyaWVzLmxlbmd0aCAtIG5leHRJbmRleCwgbG9jYXRpb24pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbmV4dEVudHJpZXMucHVzaChsb2NhdGlvbik7XG4gICAgICB9XG5cbiAgICAgIHNldFN0YXRlKHtcbiAgICAgICAgYWN0aW9uOiBhY3Rpb24sXG4gICAgICAgIGxvY2F0aW9uOiBsb2NhdGlvbixcbiAgICAgICAgaW5kZXg6IG5leHRJbmRleCxcbiAgICAgICAgZW50cmllczogbmV4dEVudHJpZXNcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9O1xuXG4gIHZhciByZXBsYWNlID0gZnVuY3Rpb24gcmVwbGFjZShwYXRoLCBzdGF0ZSkge1xuICAgICgwLCBfd2FybmluZzIuZGVmYXVsdCkoISgodHlwZW9mIHBhdGggPT09ICd1bmRlZmluZWQnID8gJ3VuZGVmaW5lZCcgOiBfdHlwZW9mKHBhdGgpKSA9PT0gJ29iamVjdCcgJiYgcGF0aC5zdGF0ZSAhPT0gdW5kZWZpbmVkICYmIHN0YXRlICE9PSB1bmRlZmluZWQpLCAnWW91IHNob3VsZCBhdm9pZCBwcm92aWRpbmcgYSAybmQgc3RhdGUgYXJndW1lbnQgdG8gcmVwbGFjZSB3aGVuIHRoZSAxc3QgJyArICdhcmd1bWVudCBpcyBhIGxvY2F0aW9uLWxpa2Ugb2JqZWN0IHRoYXQgYWxyZWFkeSBoYXMgc3RhdGU7IGl0IGlzIGlnbm9yZWQnKTtcblxuICAgIHZhciBhY3Rpb24gPSAnUkVQTEFDRSc7XG4gICAgdmFyIGxvY2F0aW9uID0gKDAsIF9Mb2NhdGlvblV0aWxzLmNyZWF0ZUxvY2F0aW9uKShwYXRoLCBzdGF0ZSwgY3JlYXRlS2V5KCksIGhpc3RvcnkubG9jYXRpb24pO1xuXG4gICAgdHJhbnNpdGlvbk1hbmFnZXIuY29uZmlybVRyYW5zaXRpb25Ubyhsb2NhdGlvbiwgYWN0aW9uLCBnZXRVc2VyQ29uZmlybWF0aW9uLCBmdW5jdGlvbiAob2spIHtcbiAgICAgIGlmICghb2spIHJldHVybjtcblxuICAgICAgaGlzdG9yeS5lbnRyaWVzW2hpc3RvcnkuaW5kZXhdID0gbG9jYXRpb247XG5cbiAgICAgIHNldFN0YXRlKHsgYWN0aW9uOiBhY3Rpb24sIGxvY2F0aW9uOiBsb2NhdGlvbiB9KTtcbiAgICB9KTtcbiAgfTtcblxuICB2YXIgZ28gPSBmdW5jdGlvbiBnbyhuKSB7XG4gICAgdmFyIG5leHRJbmRleCA9IGNsYW1wKGhpc3RvcnkuaW5kZXggKyBuLCAwLCBoaXN0b3J5LmVudHJpZXMubGVuZ3RoIC0gMSk7XG5cbiAgICB2YXIgYWN0aW9uID0gJ1BPUCc7XG4gICAgdmFyIGxvY2F0aW9uID0gaGlzdG9yeS5lbnRyaWVzW25leHRJbmRleF07XG5cbiAgICB0cmFuc2l0aW9uTWFuYWdlci5jb25maXJtVHJhbnNpdGlvblRvKGxvY2F0aW9uLCBhY3Rpb24sIGdldFVzZXJDb25maXJtYXRpb24sIGZ1bmN0aW9uIChvaykge1xuICAgICAgaWYgKG9rKSB7XG4gICAgICAgIHNldFN0YXRlKHtcbiAgICAgICAgICBhY3Rpb246IGFjdGlvbixcbiAgICAgICAgICBsb2NhdGlvbjogbG9jYXRpb24sXG4gICAgICAgICAgaW5kZXg6IG5leHRJbmRleFxuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIE1pbWljIHRoZSBiZWhhdmlvciBvZiBET00gaGlzdG9yaWVzIGJ5XG4gICAgICAgIC8vIGNhdXNpbmcgYSByZW5kZXIgYWZ0ZXIgYSBjYW5jZWxsZWQgUE9QLlxuICAgICAgICBzZXRTdGF0ZSgpO1xuICAgICAgfVxuICAgIH0pO1xuICB9O1xuXG4gIHZhciBnb0JhY2sgPSBmdW5jdGlvbiBnb0JhY2soKSB7XG4gICAgcmV0dXJuIGdvKC0xKTtcbiAgfTtcblxuICB2YXIgZ29Gb3J3YXJkID0gZnVuY3Rpb24gZ29Gb3J3YXJkKCkge1xuICAgIHJldHVybiBnbygxKTtcbiAgfTtcblxuICB2YXIgY2FuR28gPSBmdW5jdGlvbiBjYW5HbyhuKSB7XG4gICAgdmFyIG5leHRJbmRleCA9IGhpc3RvcnkuaW5kZXggKyBuO1xuICAgIHJldHVybiBuZXh0SW5kZXggPj0gMCAmJiBuZXh0SW5kZXggPCBoaXN0b3J5LmVudHJpZXMubGVuZ3RoO1xuICB9O1xuXG4gIHZhciBibG9jayA9IGZ1bmN0aW9uIGJsb2NrKCkge1xuICAgIHZhciBwcm9tcHQgPSBhcmd1bWVudHMubGVuZ3RoID4gMCAmJiBhcmd1bWVudHNbMF0gIT09IHVuZGVmaW5lZCA/IGFyZ3VtZW50c1swXSA6IGZhbHNlO1xuICAgIHJldHVybiB0cmFuc2l0aW9uTWFuYWdlci5zZXRQcm9tcHQocHJvbXB0KTtcbiAgfTtcblxuICB2YXIgbGlzdGVuID0gZnVuY3Rpb24gbGlzdGVuKGxpc3RlbmVyKSB7XG4gICAgcmV0dXJuIHRyYW5zaXRpb25NYW5hZ2VyLmFwcGVuZExpc3RlbmVyKGxpc3RlbmVyKTtcbiAgfTtcblxuICB2YXIgaGlzdG9yeSA9IHtcbiAgICBsZW5ndGg6IGVudHJpZXMubGVuZ3RoLFxuICAgIGFjdGlvbjogJ1BPUCcsXG4gICAgbG9jYXRpb246IGVudHJpZXNbaW5kZXhdLFxuICAgIGluZGV4OiBpbmRleCxcbiAgICBlbnRyaWVzOiBlbnRyaWVzLFxuICAgIGNyZWF0ZUhyZWY6IGNyZWF0ZUhyZWYsXG4gICAgcHVzaDogcHVzaCxcbiAgICByZXBsYWNlOiByZXBsYWNlLFxuICAgIGdvOiBnbyxcbiAgICBnb0JhY2s6IGdvQmFjayxcbiAgICBnb0ZvcndhcmQ6IGdvRm9yd2FyZCxcbiAgICBjYW5HbzogY2FuR28sXG4gICAgYmxvY2s6IGJsb2NrLFxuICAgIGxpc3RlbjogbGlzdGVuXG4gIH07XG5cbiAgcmV0dXJuIGhpc3Rvcnk7XG59O1xuXG5leHBvcnRzLmRlZmF1bHQgPSBjcmVhdGVNZW1vcnlIaXN0b3J5OyIsIid1c2Ugc3RyaWN0JztcblxuZXhwb3J0cy5fX2VzTW9kdWxlID0gdHJ1ZTtcblxudmFyIF93YXJuaW5nID0gcmVxdWlyZSgnd2FybmluZycpO1xuXG52YXIgX3dhcm5pbmcyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfd2FybmluZyk7XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZURlZmF1bHQob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7IGRlZmF1bHQ6IG9iaiB9OyB9XG5cbnZhciBjcmVhdGVUcmFuc2l0aW9uTWFuYWdlciA9IGZ1bmN0aW9uIGNyZWF0ZVRyYW5zaXRpb25NYW5hZ2VyKCkge1xuICB2YXIgcHJvbXB0ID0gbnVsbDtcblxuICB2YXIgc2V0UHJvbXB0ID0gZnVuY3Rpb24gc2V0UHJvbXB0KG5leHRQcm9tcHQpIHtcbiAgICAoMCwgX3dhcm5pbmcyLmRlZmF1bHQpKHByb21wdCA9PSBudWxsLCAnQSBoaXN0b3J5IHN1cHBvcnRzIG9ubHkgb25lIHByb21wdCBhdCBhIHRpbWUnKTtcblxuICAgIHByb21wdCA9IG5leHRQcm9tcHQ7XG5cbiAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgaWYgKHByb21wdCA9PT0gbmV4dFByb21wdCkgcHJvbXB0ID0gbnVsbDtcbiAgICB9O1xuICB9O1xuXG4gIHZhciBjb25maXJtVHJhbnNpdGlvblRvID0gZnVuY3Rpb24gY29uZmlybVRyYW5zaXRpb25Ubyhsb2NhdGlvbiwgYWN0aW9uLCBnZXRVc2VyQ29uZmlybWF0aW9uLCBjYWxsYmFjaykge1xuICAgIC8vIFRPRE86IElmIGFub3RoZXIgdHJhbnNpdGlvbiBzdGFydHMgd2hpbGUgd2UncmUgc3RpbGwgY29uZmlybWluZ1xuICAgIC8vIHRoZSBwcmV2aW91cyBvbmUsIHdlIG1heSBlbmQgdXAgaW4gYSB3ZWlyZCBzdGF0ZS4gRmlndXJlIG91dCB0aGVcbiAgICAvLyBiZXN0IHdheSB0byBoYW5kbGUgdGhpcy5cbiAgICBpZiAocHJvbXB0ICE9IG51bGwpIHtcbiAgICAgIHZhciByZXN1bHQgPSB0eXBlb2YgcHJvbXB0ID09PSAnZnVuY3Rpb24nID8gcHJvbXB0KGxvY2F0aW9uLCBhY3Rpb24pIDogcHJvbXB0O1xuXG4gICAgICBpZiAodHlwZW9mIHJlc3VsdCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBnZXRVc2VyQ29uZmlybWF0aW9uID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgZ2V0VXNlckNvbmZpcm1hdGlvbihyZXN1bHQsIGNhbGxiYWNrKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAoMCwgX3dhcm5pbmcyLmRlZmF1bHQpKGZhbHNlLCAnQSBoaXN0b3J5IG5lZWRzIGEgZ2V0VXNlckNvbmZpcm1hdGlvbiBmdW5jdGlvbiBpbiBvcmRlciB0byB1c2UgYSBwcm9tcHQgbWVzc2FnZScpO1xuXG4gICAgICAgICAgY2FsbGJhY2sodHJ1ZSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIFJldHVybiBmYWxzZSBmcm9tIGEgdHJhbnNpdGlvbiBob29rIHRvIGNhbmNlbCB0aGUgdHJhbnNpdGlvbi5cbiAgICAgICAgY2FsbGJhY2socmVzdWx0ICE9PSBmYWxzZSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGNhbGxiYWNrKHRydWUpO1xuICAgIH1cbiAgfTtcblxuICB2YXIgbGlzdGVuZXJzID0gW107XG5cbiAgdmFyIGFwcGVuZExpc3RlbmVyID0gZnVuY3Rpb24gYXBwZW5kTGlzdGVuZXIoZm4pIHtcbiAgICB2YXIgaXNBY3RpdmUgPSB0cnVlO1xuXG4gICAgdmFyIGxpc3RlbmVyID0gZnVuY3Rpb24gbGlzdGVuZXIoKSB7XG4gICAgICBpZiAoaXNBY3RpdmUpIGZuLmFwcGx5KHVuZGVmaW5lZCwgYXJndW1lbnRzKTtcbiAgICB9O1xuXG4gICAgbGlzdGVuZXJzLnB1c2gobGlzdGVuZXIpO1xuXG4gICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgIGlzQWN0aXZlID0gZmFsc2U7XG4gICAgICBsaXN0ZW5lcnMgPSBsaXN0ZW5lcnMuZmlsdGVyKGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICAgIHJldHVybiBpdGVtICE9PSBsaXN0ZW5lcjtcbiAgICAgIH0pO1xuICAgIH07XG4gIH07XG5cbiAgdmFyIG5vdGlmeUxpc3RlbmVycyA9IGZ1bmN0aW9uIG5vdGlmeUxpc3RlbmVycygpIHtcbiAgICBmb3IgKHZhciBfbGVuID0gYXJndW1lbnRzLmxlbmd0aCwgYXJncyA9IEFycmF5KF9sZW4pLCBfa2V5ID0gMDsgX2tleSA8IF9sZW47IF9rZXkrKykge1xuICAgICAgYXJnc1tfa2V5XSA9IGFyZ3VtZW50c1tfa2V5XTtcbiAgICB9XG5cbiAgICBsaXN0ZW5lcnMuZm9yRWFjaChmdW5jdGlvbiAobGlzdGVuZXIpIHtcbiAgICAgIHJldHVybiBsaXN0ZW5lci5hcHBseSh1bmRlZmluZWQsIGFyZ3MpO1xuICAgIH0pO1xuICB9O1xuXG4gIHJldHVybiB7XG4gICAgc2V0UHJvbXB0OiBzZXRQcm9tcHQsXG4gICAgY29uZmlybVRyYW5zaXRpb25UbzogY29uZmlybVRyYW5zaXRpb25UbyxcbiAgICBhcHBlbmRMaXN0ZW5lcjogYXBwZW5kTGlzdGVuZXIsXG4gICAgbm90aWZ5TGlzdGVuZXJzOiBub3RpZnlMaXN0ZW5lcnNcbiAgfTtcbn07XG5cbmV4cG9ydHMuZGVmYXVsdCA9IGNyZWF0ZVRyYW5zaXRpb25NYW5hZ2VyOyIsIid1c2Ugc3RyaWN0JztcblxuZXhwb3J0cy5fX2VzTW9kdWxlID0gdHJ1ZTtcbmV4cG9ydHMuY3JlYXRlUGF0aCA9IGV4cG9ydHMucGFyc2VQYXRoID0gZXhwb3J0cy5sb2NhdGlvbnNBcmVFcXVhbCA9IGV4cG9ydHMuY3JlYXRlTG9jYXRpb24gPSBleHBvcnRzLmNyZWF0ZU1lbW9yeUhpc3RvcnkgPSBleHBvcnRzLmNyZWF0ZUhhc2hIaXN0b3J5ID0gZXhwb3J0cy5jcmVhdGVCcm93c2VySGlzdG9yeSA9IHVuZGVmaW5lZDtcblxudmFyIF9Mb2NhdGlvblV0aWxzID0gcmVxdWlyZSgnLi9Mb2NhdGlvblV0aWxzJyk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCAnY3JlYXRlTG9jYXRpb24nLCB7XG4gIGVudW1lcmFibGU6IHRydWUsXG4gIGdldDogZnVuY3Rpb24gZ2V0KCkge1xuICAgIHJldHVybiBfTG9jYXRpb25VdGlscy5jcmVhdGVMb2NhdGlvbjtcbiAgfVxufSk7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgJ2xvY2F0aW9uc0FyZUVxdWFsJywge1xuICBlbnVtZXJhYmxlOiB0cnVlLFxuICBnZXQ6IGZ1bmN0aW9uIGdldCgpIHtcbiAgICByZXR1cm4gX0xvY2F0aW9uVXRpbHMubG9jYXRpb25zQXJlRXF1YWw7XG4gIH1cbn0pO1xuXG52YXIgX1BhdGhVdGlscyA9IHJlcXVpcmUoJy4vUGF0aFV0aWxzJyk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCAncGFyc2VQYXRoJywge1xuICBlbnVtZXJhYmxlOiB0cnVlLFxuICBnZXQ6IGZ1bmN0aW9uIGdldCgpIHtcbiAgICByZXR1cm4gX1BhdGhVdGlscy5wYXJzZVBhdGg7XG4gIH1cbn0pO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsICdjcmVhdGVQYXRoJywge1xuICBlbnVtZXJhYmxlOiB0cnVlLFxuICBnZXQ6IGZ1bmN0aW9uIGdldCgpIHtcbiAgICByZXR1cm4gX1BhdGhVdGlscy5jcmVhdGVQYXRoO1xuICB9XG59KTtcblxudmFyIF9jcmVhdGVCcm93c2VySGlzdG9yeTIgPSByZXF1aXJlKCcuL2NyZWF0ZUJyb3dzZXJIaXN0b3J5Jyk7XG5cbnZhciBfY3JlYXRlQnJvd3Nlckhpc3RvcnkzID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfY3JlYXRlQnJvd3Nlckhpc3RvcnkyKTtcblxudmFyIF9jcmVhdGVIYXNoSGlzdG9yeTIgPSByZXF1aXJlKCcuL2NyZWF0ZUhhc2hIaXN0b3J5Jyk7XG5cbnZhciBfY3JlYXRlSGFzaEhpc3RvcnkzID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfY3JlYXRlSGFzaEhpc3RvcnkyKTtcblxudmFyIF9jcmVhdGVNZW1vcnlIaXN0b3J5MiA9IHJlcXVpcmUoJy4vY3JlYXRlTWVtb3J5SGlzdG9yeScpO1xuXG52YXIgX2NyZWF0ZU1lbW9yeUhpc3RvcnkzID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfY3JlYXRlTWVtb3J5SGlzdG9yeTIpO1xuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KG9iaikgeyByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyBkZWZhdWx0OiBvYmogfTsgfVxuXG5leHBvcnRzLmNyZWF0ZUJyb3dzZXJIaXN0b3J5ID0gX2NyZWF0ZUJyb3dzZXJIaXN0b3J5My5kZWZhdWx0O1xuZXhwb3J0cy5jcmVhdGVIYXNoSGlzdG9yeSA9IF9jcmVhdGVIYXNoSGlzdG9yeTMuZGVmYXVsdDtcbmV4cG9ydHMuY3JlYXRlTWVtb3J5SGlzdG9yeSA9IF9jcmVhdGVNZW1vcnlIaXN0b3J5My5kZWZhdWx0OyIsIi8qKlxuICogQ29weXJpZ2h0IDIwMTMtMjAxNSwgRmFjZWJvb2ssIEluYy5cbiAqIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKlxuICogVGhpcyBzb3VyY2UgY29kZSBpcyBsaWNlbnNlZCB1bmRlciB0aGUgQlNELXN0eWxlIGxpY2Vuc2UgZm91bmQgaW4gdGhlXG4gKiBMSUNFTlNFIGZpbGUgaW4gdGhlIHJvb3QgZGlyZWN0b3J5IG9mIHRoaXMgc291cmNlIHRyZWUuIEFuIGFkZGl0aW9uYWwgZ3JhbnRcbiAqIG9mIHBhdGVudCByaWdodHMgY2FuIGJlIGZvdW5kIGluIHRoZSBQQVRFTlRTIGZpbGUgaW4gdGhlIHNhbWUgZGlyZWN0b3J5LlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBVc2UgaW52YXJpYW50KCkgdG8gYXNzZXJ0IHN0YXRlIHdoaWNoIHlvdXIgcHJvZ3JhbSBhc3N1bWVzIHRvIGJlIHRydWUuXG4gKlxuICogUHJvdmlkZSBzcHJpbnRmLXN0eWxlIGZvcm1hdCAob25seSAlcyBpcyBzdXBwb3J0ZWQpIGFuZCBhcmd1bWVudHNcbiAqIHRvIHByb3ZpZGUgaW5mb3JtYXRpb24gYWJvdXQgd2hhdCBicm9rZSBhbmQgd2hhdCB5b3Ugd2VyZVxuICogZXhwZWN0aW5nLlxuICpcbiAqIFRoZSBpbnZhcmlhbnQgbWVzc2FnZSB3aWxsIGJlIHN0cmlwcGVkIGluIHByb2R1Y3Rpb24sIGJ1dCB0aGUgaW52YXJpYW50XG4gKiB3aWxsIHJlbWFpbiB0byBlbnN1cmUgbG9naWMgZG9lcyBub3QgZGlmZmVyIGluIHByb2R1Y3Rpb24uXG4gKi9cblxudmFyIGludmFyaWFudCA9IGZ1bmN0aW9uKGNvbmRpdGlvbiwgZm9ybWF0LCBhLCBiLCBjLCBkLCBlLCBmKSB7XG4gIGlmIChwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ3Byb2R1Y3Rpb24nKSB7XG4gICAgaWYgKGZvcm1hdCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ2ludmFyaWFudCByZXF1aXJlcyBhbiBlcnJvciBtZXNzYWdlIGFyZ3VtZW50Jyk7XG4gICAgfVxuICB9XG5cbiAgaWYgKCFjb25kaXRpb24pIHtcbiAgICB2YXIgZXJyb3I7XG4gICAgaWYgKGZvcm1hdCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBlcnJvciA9IG5ldyBFcnJvcihcbiAgICAgICAgJ01pbmlmaWVkIGV4Y2VwdGlvbiBvY2N1cnJlZDsgdXNlIHRoZSBub24tbWluaWZpZWQgZGV2IGVudmlyb25tZW50ICcgK1xuICAgICAgICAnZm9yIHRoZSBmdWxsIGVycm9yIG1lc3NhZ2UgYW5kIGFkZGl0aW9uYWwgaGVscGZ1bCB3YXJuaW5ncy4nXG4gICAgICApO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgYXJncyA9IFthLCBiLCBjLCBkLCBlLCBmXTtcbiAgICAgIHZhciBhcmdJbmRleCA9IDA7XG4gICAgICBlcnJvciA9IG5ldyBFcnJvcihcbiAgICAgICAgZm9ybWF0LnJlcGxhY2UoLyVzL2csIGZ1bmN0aW9uKCkgeyByZXR1cm4gYXJnc1thcmdJbmRleCsrXTsgfSlcbiAgICAgICk7XG4gICAgICBlcnJvci5uYW1lID0gJ0ludmFyaWFudCBWaW9sYXRpb24nO1xuICAgIH1cblxuICAgIGVycm9yLmZyYW1lc1RvUG9wID0gMTsgLy8gd2UgZG9uJ3QgY2FyZSBhYm91dCBpbnZhcmlhbnQncyBvd24gZnJhbWVcbiAgICB0aHJvdyBlcnJvcjtcbiAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBpbnZhcmlhbnQ7XG4iLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcbnZhciBwcm9jZXNzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcblxuLy8gY2FjaGVkIGZyb20gd2hhdGV2ZXIgZ2xvYmFsIGlzIHByZXNlbnQgc28gdGhhdCB0ZXN0IHJ1bm5lcnMgdGhhdCBzdHViIGl0XG4vLyBkb24ndCBicmVhayB0aGluZ3MuICBCdXQgd2UgbmVlZCB0byB3cmFwIGl0IGluIGEgdHJ5IGNhdGNoIGluIGNhc2UgaXQgaXNcbi8vIHdyYXBwZWQgaW4gc3RyaWN0IG1vZGUgY29kZSB3aGljaCBkb2Vzbid0IGRlZmluZSBhbnkgZ2xvYmFscy4gIEl0J3MgaW5zaWRlIGFcbi8vIGZ1bmN0aW9uIGJlY2F1c2UgdHJ5L2NhdGNoZXMgZGVvcHRpbWl6ZSBpbiBjZXJ0YWluIGVuZ2luZXMuXG5cbnZhciBjYWNoZWRTZXRUaW1lb3V0O1xudmFyIGNhY2hlZENsZWFyVGltZW91dDtcblxuZnVuY3Rpb24gZGVmYXVsdFNldFRpbW91dCgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3NldFRpbWVvdXQgaGFzIG5vdCBiZWVuIGRlZmluZWQnKTtcbn1cbmZ1bmN0aW9uIGRlZmF1bHRDbGVhclRpbWVvdXQgKCkge1xuICAgIHRocm93IG5ldyBFcnJvcignY2xlYXJUaW1lb3V0IGhhcyBub3QgYmVlbiBkZWZpbmVkJyk7XG59XG4oZnVuY3Rpb24gKCkge1xuICAgIHRyeSB7XG4gICAgICAgIGlmICh0eXBlb2Ygc2V0VGltZW91dCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IHNldFRpbWVvdXQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gZGVmYXVsdFNldFRpbW91dDtcbiAgICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IGRlZmF1bHRTZXRUaW1vdXQ7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIGlmICh0eXBlb2YgY2xlYXJUaW1lb3V0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBjbGVhclRpbWVvdXQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBkZWZhdWx0Q2xlYXJUaW1lb3V0O1xuICAgICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBkZWZhdWx0Q2xlYXJUaW1lb3V0O1xuICAgIH1cbn0gKCkpXG5mdW5jdGlvbiBydW5UaW1lb3V0KGZ1bikge1xuICAgIGlmIChjYWNoZWRTZXRUaW1lb3V0ID09PSBzZXRUaW1lb3V0KSB7XG4gICAgICAgIC8vbm9ybWFsIGVudmlyb21lbnRzIGluIHNhbmUgc2l0dWF0aW9uc1xuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW4sIDApO1xuICAgIH1cbiAgICAvLyBpZiBzZXRUaW1lb3V0IHdhc24ndCBhdmFpbGFibGUgYnV0IHdhcyBsYXR0ZXIgZGVmaW5lZFxuICAgIGlmICgoY2FjaGVkU2V0VGltZW91dCA9PT0gZGVmYXVsdFNldFRpbW91dCB8fCAhY2FjaGVkU2V0VGltZW91dCkgJiYgc2V0VGltZW91dCkge1xuICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gc2V0VGltZW91dDtcbiAgICAgICAgcmV0dXJuIHNldFRpbWVvdXQoZnVuLCAwKTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgLy8gd2hlbiB3aGVuIHNvbWVib2R5IGhhcyBzY3Jld2VkIHdpdGggc2V0VGltZW91dCBidXQgbm8gSS5FLiBtYWRkbmVzc1xuICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dChmdW4sIDApO1xuICAgIH0gY2F0Y2goZSl7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBXaGVuIHdlIGFyZSBpbiBJLkUuIGJ1dCB0aGUgc2NyaXB0IGhhcyBiZWVuIGV2YWxlZCBzbyBJLkUuIGRvZXNuJ3QgdHJ1c3QgdGhlIGdsb2JhbCBvYmplY3Qgd2hlbiBjYWxsZWQgbm9ybWFsbHlcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0LmNhbGwobnVsbCwgZnVuLCAwKTtcbiAgICAgICAgfSBjYXRjaChlKXtcbiAgICAgICAgICAgIC8vIHNhbWUgYXMgYWJvdmUgYnV0IHdoZW4gaXQncyBhIHZlcnNpb24gb2YgSS5FLiB0aGF0IG11c3QgaGF2ZSB0aGUgZ2xvYmFsIG9iamVjdCBmb3IgJ3RoaXMnLCBob3BmdWxseSBvdXIgY29udGV4dCBjb3JyZWN0IG90aGVyd2lzZSBpdCB3aWxsIHRocm93IGEgZ2xvYmFsIGVycm9yXG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dC5jYWxsKHRoaXMsIGZ1biwgMCk7XG4gICAgICAgIH1cbiAgICB9XG5cblxufVxuZnVuY3Rpb24gcnVuQ2xlYXJUaW1lb3V0KG1hcmtlcikge1xuICAgIGlmIChjYWNoZWRDbGVhclRpbWVvdXQgPT09IGNsZWFyVGltZW91dCkge1xuICAgICAgICAvL25vcm1hbCBlbnZpcm9tZW50cyBpbiBzYW5lIHNpdHVhdGlvbnNcbiAgICAgICAgcmV0dXJuIGNsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH1cbiAgICAvLyBpZiBjbGVhclRpbWVvdXQgd2Fzbid0IGF2YWlsYWJsZSBidXQgd2FzIGxhdHRlciBkZWZpbmVkXG4gICAgaWYgKChjYWNoZWRDbGVhclRpbWVvdXQgPT09IGRlZmF1bHRDbGVhclRpbWVvdXQgfHwgIWNhY2hlZENsZWFyVGltZW91dCkgJiYgY2xlYXJUaW1lb3V0KSB7XG4gICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGNsZWFyVGltZW91dDtcbiAgICAgICAgcmV0dXJuIGNsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICAvLyB3aGVuIHdoZW4gc29tZWJvZHkgaGFzIHNjcmV3ZWQgd2l0aCBzZXRUaW1lb3V0IGJ1dCBubyBJLkUuIG1hZGRuZXNzXG4gICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQobWFya2VyKTtcbiAgICB9IGNhdGNoIChlKXtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFdoZW4gd2UgYXJlIGluIEkuRS4gYnV0IHRoZSBzY3JpcHQgaGFzIGJlZW4gZXZhbGVkIHNvIEkuRS4gZG9lc24ndCAgdHJ1c3QgdGhlIGdsb2JhbCBvYmplY3Qgd2hlbiBjYWxsZWQgbm9ybWFsbHlcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQuY2FsbChudWxsLCBtYXJrZXIpO1xuICAgICAgICB9IGNhdGNoIChlKXtcbiAgICAgICAgICAgIC8vIHNhbWUgYXMgYWJvdmUgYnV0IHdoZW4gaXQncyBhIHZlcnNpb24gb2YgSS5FLiB0aGF0IG11c3QgaGF2ZSB0aGUgZ2xvYmFsIG9iamVjdCBmb3IgJ3RoaXMnLCBob3BmdWxseSBvdXIgY29udGV4dCBjb3JyZWN0IG90aGVyd2lzZSBpdCB3aWxsIHRocm93IGEgZ2xvYmFsIGVycm9yLlxuICAgICAgICAgICAgLy8gU29tZSB2ZXJzaW9ucyBvZiBJLkUuIGhhdmUgZGlmZmVyZW50IHJ1bGVzIGZvciBjbGVhclRpbWVvdXQgdnMgc2V0VGltZW91dFxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dC5jYWxsKHRoaXMsIG1hcmtlcik7XG4gICAgICAgIH1cbiAgICB9XG5cblxuXG59XG52YXIgcXVldWUgPSBbXTtcbnZhciBkcmFpbmluZyA9IGZhbHNlO1xudmFyIGN1cnJlbnRRdWV1ZTtcbnZhciBxdWV1ZUluZGV4ID0gLTE7XG5cbmZ1bmN0aW9uIGNsZWFuVXBOZXh0VGljaygpIHtcbiAgICBpZiAoIWRyYWluaW5nIHx8ICFjdXJyZW50UXVldWUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIGlmIChjdXJyZW50UXVldWUubGVuZ3RoKSB7XG4gICAgICAgIHF1ZXVlID0gY3VycmVudFF1ZXVlLmNvbmNhdChxdWV1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcXVldWVJbmRleCA9IC0xO1xuICAgIH1cbiAgICBpZiAocXVldWUubGVuZ3RoKSB7XG4gICAgICAgIGRyYWluUXVldWUoKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGRyYWluUXVldWUoKSB7XG4gICAgaWYgKGRyYWluaW5nKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHRpbWVvdXQgPSBydW5UaW1lb3V0KGNsZWFuVXBOZXh0VGljayk7XG4gICAgZHJhaW5pbmcgPSB0cnVlO1xuXG4gICAgdmFyIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB3aGlsZShsZW4pIHtcbiAgICAgICAgY3VycmVudFF1ZXVlID0gcXVldWU7XG4gICAgICAgIHF1ZXVlID0gW107XG4gICAgICAgIHdoaWxlICgrK3F1ZXVlSW5kZXggPCBsZW4pIHtcbiAgICAgICAgICAgIGlmIChjdXJyZW50UXVldWUpIHtcbiAgICAgICAgICAgICAgICBjdXJyZW50UXVldWVbcXVldWVJbmRleF0ucnVuKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcXVldWVJbmRleCA9IC0xO1xuICAgICAgICBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgfVxuICAgIGN1cnJlbnRRdWV1ZSA9IG51bGw7XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBydW5DbGVhclRpbWVvdXQodGltZW91dCk7XG59XG5cbnByb2Nlc3MubmV4dFRpY2sgPSBmdW5jdGlvbiAoZnVuKSB7XG4gICAgdmFyIGFyZ3MgPSBuZXcgQXJyYXkoYXJndW1lbnRzLmxlbmd0aCAtIDEpO1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSkge1xuICAgICAgICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgIH1cbiAgICB9XG4gICAgcXVldWUucHVzaChuZXcgSXRlbShmdW4sIGFyZ3MpKTtcbiAgICBpZiAocXVldWUubGVuZ3RoID09PSAxICYmICFkcmFpbmluZykge1xuICAgICAgICBydW5UaW1lb3V0KGRyYWluUXVldWUpO1xuICAgIH1cbn07XG5cbi8vIHY4IGxpa2VzIHByZWRpY3RpYmxlIG9iamVjdHNcbmZ1bmN0aW9uIEl0ZW0oZnVuLCBhcnJheSkge1xuICAgIHRoaXMuZnVuID0gZnVuO1xuICAgIHRoaXMuYXJyYXkgPSBhcnJheTtcbn1cbkl0ZW0ucHJvdG90eXBlLnJ1biA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmZ1bi5hcHBseShudWxsLCB0aGlzLmFycmF5KTtcbn07XG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcbnByb2Nlc3MuZW52ID0ge307XG5wcm9jZXNzLmFyZ3YgPSBbXTtcbnByb2Nlc3MudmVyc2lvbiA9ICcnOyAvLyBlbXB0eSBzdHJpbmcgdG8gYXZvaWQgcmVnZXhwIGlzc3Vlc1xucHJvY2Vzcy52ZXJzaW9ucyA9IHt9O1xuXG5mdW5jdGlvbiBub29wKCkge31cblxucHJvY2Vzcy5vbiA9IG5vb3A7XG5wcm9jZXNzLmFkZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3Mub25jZSA9IG5vb3A7XG5wcm9jZXNzLm9mZiA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUxpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlQWxsTGlzdGVuZXJzID0gbm9vcDtcbnByb2Nlc3MuZW1pdCA9IG5vb3A7XG5wcm9jZXNzLnByZXBlbmRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnByZXBlbmRPbmNlTGlzdGVuZXIgPSBub29wO1xuXG5wcm9jZXNzLmxpc3RlbmVycyA9IGZ1bmN0aW9uIChuYW1lKSB7IHJldHVybiBbXSB9XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcblxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5wcm9jZXNzLnVtYXNrID0gZnVuY3Rpb24oKSB7IHJldHVybiAwOyB9O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgaXNBYnNvbHV0ZSA9IGZ1bmN0aW9uIGlzQWJzb2x1dGUocGF0aG5hbWUpIHtcbiAgcmV0dXJuIHBhdGhuYW1lLmNoYXJBdCgwKSA9PT0gJy8nO1xufTtcblxuLy8gQWJvdXQgMS41eCBmYXN0ZXIgdGhhbiB0aGUgdHdvLWFyZyB2ZXJzaW9uIG9mIEFycmF5I3NwbGljZSgpXG52YXIgc3BsaWNlT25lID0gZnVuY3Rpb24gc3BsaWNlT25lKGxpc3QsIGluZGV4KSB7XG4gIGZvciAodmFyIGkgPSBpbmRleCwgayA9IGkgKyAxLCBuID0gbGlzdC5sZW5ndGg7IGsgPCBuOyBpICs9IDEsIGsgKz0gMSkge1xuICAgIGxpc3RbaV0gPSBsaXN0W2tdO1xuICB9bGlzdC5wb3AoKTtcbn07XG5cbi8vIFRoaXMgaW1wbGVtZW50YXRpb24gaXMgYmFzZWQgaGVhdmlseSBvbiBub2RlJ3MgdXJsLnBhcnNlXG52YXIgcmVzb2x2ZVBhdGhuYW1lID0gZnVuY3Rpb24gcmVzb2x2ZVBhdGhuYW1lKHRvKSB7XG4gIHZhciBmcm9tID0gYXJndW1lbnRzLmxlbmd0aCA+IDEgJiYgYXJndW1lbnRzWzFdICE9PSB1bmRlZmluZWQgPyBhcmd1bWVudHNbMV0gOiAnJztcblxuICB2YXIgdG9QYXJ0cyA9IHRvICYmIHRvLnNwbGl0KCcvJykgfHwgW107XG4gIHZhciBmcm9tUGFydHMgPSBmcm9tICYmIGZyb20uc3BsaXQoJy8nKSB8fCBbXTtcblxuICB2YXIgaXNUb0FicyA9IHRvICYmIGlzQWJzb2x1dGUodG8pO1xuICB2YXIgaXNGcm9tQWJzID0gZnJvbSAmJiBpc0Fic29sdXRlKGZyb20pO1xuICB2YXIgbXVzdEVuZEFicyA9IGlzVG9BYnMgfHwgaXNGcm9tQWJzO1xuXG4gIGlmICh0byAmJiBpc0Fic29sdXRlKHRvKSkge1xuICAgIC8vIHRvIGlzIGFic29sdXRlXG4gICAgZnJvbVBhcnRzID0gdG9QYXJ0cztcbiAgfSBlbHNlIGlmICh0b1BhcnRzLmxlbmd0aCkge1xuICAgIC8vIHRvIGlzIHJlbGF0aXZlLCBkcm9wIHRoZSBmaWxlbmFtZVxuICAgIGZyb21QYXJ0cy5wb3AoKTtcbiAgICBmcm9tUGFydHMgPSBmcm9tUGFydHMuY29uY2F0KHRvUGFydHMpO1xuICB9XG5cbiAgaWYgKCFmcm9tUGFydHMubGVuZ3RoKSByZXR1cm4gJy8nO1xuXG4gIHZhciBoYXNUcmFpbGluZ1NsYXNoID0gdm9pZCAwO1xuICBpZiAoZnJvbVBhcnRzLmxlbmd0aCkge1xuICAgIHZhciBsYXN0ID0gZnJvbVBhcnRzW2Zyb21QYXJ0cy5sZW5ndGggLSAxXTtcbiAgICBoYXNUcmFpbGluZ1NsYXNoID0gbGFzdCA9PT0gJy4nIHx8IGxhc3QgPT09ICcuLicgfHwgbGFzdCA9PT0gJyc7XG4gIH0gZWxzZSB7XG4gICAgaGFzVHJhaWxpbmdTbGFzaCA9IGZhbHNlO1xuICB9XG5cbiAgdmFyIHVwID0gMDtcbiAgZm9yICh2YXIgaSA9IGZyb21QYXJ0cy5sZW5ndGg7IGkgPj0gMDsgaS0tKSB7XG4gICAgdmFyIHBhcnQgPSBmcm9tUGFydHNbaV07XG5cbiAgICBpZiAocGFydCA9PT0gJy4nKSB7XG4gICAgICBzcGxpY2VPbmUoZnJvbVBhcnRzLCBpKTtcbiAgICB9IGVsc2UgaWYgKHBhcnQgPT09ICcuLicpIHtcbiAgICAgIHNwbGljZU9uZShmcm9tUGFydHMsIGkpO1xuICAgICAgdXArKztcbiAgICB9IGVsc2UgaWYgKHVwKSB7XG4gICAgICBzcGxpY2VPbmUoZnJvbVBhcnRzLCBpKTtcbiAgICAgIHVwLS07XG4gICAgfVxuICB9XG5cbiAgaWYgKCFtdXN0RW5kQWJzKSBmb3IgKDsgdXAtLTsgdXApIHtcbiAgICBmcm9tUGFydHMudW5zaGlmdCgnLi4nKTtcbiAgfWlmIChtdXN0RW5kQWJzICYmIGZyb21QYXJ0c1swXSAhPT0gJycgJiYgKCFmcm9tUGFydHNbMF0gfHwgIWlzQWJzb2x1dGUoZnJvbVBhcnRzWzBdKSkpIGZyb21QYXJ0cy51bnNoaWZ0KCcnKTtcblxuICB2YXIgcmVzdWx0ID0gZnJvbVBhcnRzLmpvaW4oJy8nKTtcblxuICBpZiAoaGFzVHJhaWxpbmdTbGFzaCAmJiByZXN1bHQuc3Vic3RyKC0xKSAhPT0gJy8nKSByZXN1bHQgKz0gJy8nO1xuXG4gIHJldHVybiByZXN1bHQ7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHJlc29sdmVQYXRobmFtZTsiLCJcInVzZSBzdHJpY3RcIjtcbnZhciBzZWxlY3RvclBhcnNlcl8xID0gcmVxdWlyZSgnLi9zZWxlY3RvclBhcnNlcicpO1xuZnVuY3Rpb24gY2xhc3NOYW1lRnJvbVZOb2RlKHZOb2RlKSB7XG4gICAgdmFyIF9hID0gc2VsZWN0b3JQYXJzZXJfMS5zZWxlY3RvclBhcnNlcih2Tm9kZSkuY2xhc3NOYW1lLCBjbiA9IF9hID09PSB2b2lkIDAgPyAnJyA6IF9hO1xuICAgIGlmICghdk5vZGUuZGF0YSkge1xuICAgICAgICByZXR1cm4gY247XG4gICAgfVxuICAgIHZhciBfYiA9IHZOb2RlLmRhdGEsIGRhdGFDbGFzcyA9IF9iLmNsYXNzLCBwcm9wcyA9IF9iLnByb3BzO1xuICAgIGlmIChkYXRhQ2xhc3MpIHtcbiAgICAgICAgdmFyIGMgPSBPYmplY3Qua2V5cyhkYXRhQ2xhc3MpXG4gICAgICAgICAgICAuZmlsdGVyKGZ1bmN0aW9uIChjbCkgeyByZXR1cm4gZGF0YUNsYXNzW2NsXTsgfSk7XG4gICAgICAgIGNuICs9IFwiIFwiICsgYy5qb2luKFwiIFwiKTtcbiAgICB9XG4gICAgaWYgKHByb3BzICYmIHByb3BzLmNsYXNzTmFtZSkge1xuICAgICAgICBjbiArPSBcIiBcIiArIHByb3BzLmNsYXNzTmFtZTtcbiAgICB9XG4gICAgcmV0dXJuIGNuICYmIGNuLnRyaW0oKTtcbn1cbmV4cG9ydHMuY2xhc3NOYW1lRnJvbVZOb2RlID0gY2xhc3NOYW1lRnJvbVZOb2RlO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9Y2xhc3NOYW1lRnJvbVZOb2RlLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xuZnVuY3Rpb24gc2VsZWN0b3JQYXJzZXIobm9kZSkge1xuICAgIGlmICghbm9kZS5zZWwpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHRhZ05hbWU6ICcnLFxuICAgICAgICAgICAgaWQ6ICcnLFxuICAgICAgICAgICAgY2xhc3NOYW1lOiAnJyxcbiAgICAgICAgfTtcbiAgICB9XG4gICAgdmFyIHNlbCA9IG5vZGUuc2VsO1xuICAgIHZhciBoYXNoSWR4ID0gc2VsLmluZGV4T2YoJyMnKTtcbiAgICB2YXIgZG90SWR4ID0gc2VsLmluZGV4T2YoJy4nLCBoYXNoSWR4KTtcbiAgICB2YXIgaGFzaCA9IGhhc2hJZHggPiAwID8gaGFzaElkeCA6IHNlbC5sZW5ndGg7XG4gICAgdmFyIGRvdCA9IGRvdElkeCA+IDAgPyBkb3RJZHggOiBzZWwubGVuZ3RoO1xuICAgIHZhciB0YWdOYW1lID0gaGFzaElkeCAhPT0gLTEgfHwgZG90SWR4ICE9PSAtMSA/XG4gICAgICAgIHNlbC5zbGljZSgwLCBNYXRoLm1pbihoYXNoLCBkb3QpKSA6XG4gICAgICAgIHNlbDtcbiAgICB2YXIgaWQgPSBoYXNoIDwgZG90ID8gc2VsLnNsaWNlKGhhc2ggKyAxLCBkb3QpIDogdm9pZCAwO1xuICAgIHZhciBjbGFzc05hbWUgPSBkb3RJZHggPiAwID8gc2VsLnNsaWNlKGRvdCArIDEpLnJlcGxhY2UoL1xcLi9nLCAnICcpIDogdm9pZCAwO1xuICAgIHJldHVybiB7XG4gICAgICAgIHRhZ05hbWU6IHRhZ05hbWUsXG4gICAgICAgIGlkOiBpZCxcbiAgICAgICAgY2xhc3NOYW1lOiBjbGFzc05hbWUsXG4gICAgfTtcbn1cbmV4cG9ydHMuc2VsZWN0b3JQYXJzZXIgPSBzZWxlY3RvclBhcnNlcjtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPXNlbGVjdG9yUGFyc2VyLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xudmFyIHZub2RlXzEgPSByZXF1aXJlKFwiLi92bm9kZVwiKTtcbnZhciBpcyA9IHJlcXVpcmUoXCIuL2lzXCIpO1xuZnVuY3Rpb24gYWRkTlMoZGF0YSwgY2hpbGRyZW4sIHNlbCkge1xuICAgIGRhdGEubnMgPSAnaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnO1xuICAgIGlmIChzZWwgIT09ICdmb3JlaWduT2JqZWN0JyAmJiBjaGlsZHJlbiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY2hpbGRyZW4ubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICAgIHZhciBjaGlsZERhdGEgPSBjaGlsZHJlbltpXS5kYXRhO1xuICAgICAgICAgICAgaWYgKGNoaWxkRGF0YSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgYWRkTlMoY2hpbGREYXRhLCBjaGlsZHJlbltpXS5jaGlsZHJlbiwgY2hpbGRyZW5baV0uc2VsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn1cbmZ1bmN0aW9uIGgoc2VsLCBiLCBjKSB7XG4gICAgdmFyIGRhdGEgPSB7fSwgY2hpbGRyZW4sIHRleHQsIGk7XG4gICAgaWYgKGMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBkYXRhID0gYjtcbiAgICAgICAgaWYgKGlzLmFycmF5KGMpKSB7XG4gICAgICAgICAgICBjaGlsZHJlbiA9IGM7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoaXMucHJpbWl0aXZlKGMpKSB7XG4gICAgICAgICAgICB0ZXh0ID0gYztcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChjICYmIGMuc2VsKSB7XG4gICAgICAgICAgICBjaGlsZHJlbiA9IFtjXTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBlbHNlIGlmIChiICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaWYgKGlzLmFycmF5KGIpKSB7XG4gICAgICAgICAgICBjaGlsZHJlbiA9IGI7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoaXMucHJpbWl0aXZlKGIpKSB7XG4gICAgICAgICAgICB0ZXh0ID0gYjtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChiICYmIGIuc2VsKSB7XG4gICAgICAgICAgICBjaGlsZHJlbiA9IFtiXTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGRhdGEgPSBiO1xuICAgICAgICB9XG4gICAgfVxuICAgIGlmIChpcy5hcnJheShjaGlsZHJlbikpIHtcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IGNoaWxkcmVuLmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgICBpZiAoaXMucHJpbWl0aXZlKGNoaWxkcmVuW2ldKSlcbiAgICAgICAgICAgICAgICBjaGlsZHJlbltpXSA9IHZub2RlXzEudm5vZGUodW5kZWZpbmVkLCB1bmRlZmluZWQsIHVuZGVmaW5lZCwgY2hpbGRyZW5baV0pO1xuICAgICAgICB9XG4gICAgfVxuICAgIGlmIChzZWxbMF0gPT09ICdzJyAmJiBzZWxbMV0gPT09ICd2JyAmJiBzZWxbMl0gPT09ICdnJyAmJlxuICAgICAgICAoc2VsLmxlbmd0aCA9PT0gMyB8fCBzZWxbM10gPT09ICcuJyB8fCBzZWxbM10gPT09ICcjJykpIHtcbiAgICAgICAgYWRkTlMoZGF0YSwgY2hpbGRyZW4sIHNlbCk7XG4gICAgfVxuICAgIHJldHVybiB2bm9kZV8xLnZub2RlKHNlbCwgZGF0YSwgY2hpbGRyZW4sIHRleHQsIHVuZGVmaW5lZCk7XG59XG5leHBvcnRzLmggPSBoO1xuO1xuZXhwb3J0cy5kZWZhdWx0ID0gaDtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWguanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XG5mdW5jdGlvbiBjcmVhdGVFbGVtZW50KHRhZ05hbWUpIHtcbiAgICByZXR1cm4gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCh0YWdOYW1lKTtcbn1cbmZ1bmN0aW9uIGNyZWF0ZUVsZW1lbnROUyhuYW1lc3BhY2VVUkksIHF1YWxpZmllZE5hbWUpIHtcbiAgICByZXR1cm4gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKG5hbWVzcGFjZVVSSSwgcXVhbGlmaWVkTmFtZSk7XG59XG5mdW5jdGlvbiBjcmVhdGVUZXh0Tm9kZSh0ZXh0KSB7XG4gICAgcmV0dXJuIGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKHRleHQpO1xufVxuZnVuY3Rpb24gY3JlYXRlQ29tbWVudCh0ZXh0KSB7XG4gICAgcmV0dXJuIGRvY3VtZW50LmNyZWF0ZUNvbW1lbnQodGV4dCk7XG59XG5mdW5jdGlvbiBpbnNlcnRCZWZvcmUocGFyZW50Tm9kZSwgbmV3Tm9kZSwgcmVmZXJlbmNlTm9kZSkge1xuICAgIHBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKG5ld05vZGUsIHJlZmVyZW5jZU5vZGUpO1xufVxuZnVuY3Rpb24gcmVtb3ZlQ2hpbGQobm9kZSwgY2hpbGQpIHtcbiAgICBub2RlLnJlbW92ZUNoaWxkKGNoaWxkKTtcbn1cbmZ1bmN0aW9uIGFwcGVuZENoaWxkKG5vZGUsIGNoaWxkKSB7XG4gICAgbm9kZS5hcHBlbmRDaGlsZChjaGlsZCk7XG59XG5mdW5jdGlvbiBwYXJlbnROb2RlKG5vZGUpIHtcbiAgICByZXR1cm4gbm9kZS5wYXJlbnROb2RlO1xufVxuZnVuY3Rpb24gbmV4dFNpYmxpbmcobm9kZSkge1xuICAgIHJldHVybiBub2RlLm5leHRTaWJsaW5nO1xufVxuZnVuY3Rpb24gdGFnTmFtZShlbG0pIHtcbiAgICByZXR1cm4gZWxtLnRhZ05hbWU7XG59XG5mdW5jdGlvbiBzZXRUZXh0Q29udGVudChub2RlLCB0ZXh0KSB7XG4gICAgbm9kZS50ZXh0Q29udGVudCA9IHRleHQ7XG59XG5mdW5jdGlvbiBnZXRUZXh0Q29udGVudChub2RlKSB7XG4gICAgcmV0dXJuIG5vZGUudGV4dENvbnRlbnQ7XG59XG5mdW5jdGlvbiBpc0VsZW1lbnQobm9kZSkge1xuICAgIHJldHVybiBub2RlLm5vZGVUeXBlID09PSAxO1xufVxuZnVuY3Rpb24gaXNUZXh0KG5vZGUpIHtcbiAgICByZXR1cm4gbm9kZS5ub2RlVHlwZSA9PT0gMztcbn1cbmZ1bmN0aW9uIGlzQ29tbWVudChub2RlKSB7XG4gICAgcmV0dXJuIG5vZGUubm9kZVR5cGUgPT09IDg7XG59XG5leHBvcnRzLmh0bWxEb21BcGkgPSB7XG4gICAgY3JlYXRlRWxlbWVudDogY3JlYXRlRWxlbWVudCxcbiAgICBjcmVhdGVFbGVtZW50TlM6IGNyZWF0ZUVsZW1lbnROUyxcbiAgICBjcmVhdGVUZXh0Tm9kZTogY3JlYXRlVGV4dE5vZGUsXG4gICAgY3JlYXRlQ29tbWVudDogY3JlYXRlQ29tbWVudCxcbiAgICBpbnNlcnRCZWZvcmU6IGluc2VydEJlZm9yZSxcbiAgICByZW1vdmVDaGlsZDogcmVtb3ZlQ2hpbGQsXG4gICAgYXBwZW5kQ2hpbGQ6IGFwcGVuZENoaWxkLFxuICAgIHBhcmVudE5vZGU6IHBhcmVudE5vZGUsXG4gICAgbmV4dFNpYmxpbmc6IG5leHRTaWJsaW5nLFxuICAgIHRhZ05hbWU6IHRhZ05hbWUsXG4gICAgc2V0VGV4dENvbnRlbnQ6IHNldFRleHRDb250ZW50LFxuICAgIGdldFRleHRDb250ZW50OiBnZXRUZXh0Q29udGVudCxcbiAgICBpc0VsZW1lbnQ6IGlzRWxlbWVudCxcbiAgICBpc1RleHQ6IGlzVGV4dCxcbiAgICBpc0NvbW1lbnQ6IGlzQ29tbWVudCxcbn07XG5leHBvcnRzLmRlZmF1bHQgPSBleHBvcnRzLmh0bWxEb21BcGk7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1odG1sZG9tYXBpLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xuZXhwb3J0cy5hcnJheSA9IEFycmF5LmlzQXJyYXk7XG5mdW5jdGlvbiBwcmltaXRpdmUocykge1xuICAgIHJldHVybiB0eXBlb2YgcyA9PT0gJ3N0cmluZycgfHwgdHlwZW9mIHMgPT09ICdudW1iZXInO1xufVxuZXhwb3J0cy5wcmltaXRpdmUgPSBwcmltaXRpdmU7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1pcy5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcbnZhciBib29sZWFuQXR0cnMgPSBbXCJhbGxvd2Z1bGxzY3JlZW5cIiwgXCJhc3luY1wiLCBcImF1dG9mb2N1c1wiLCBcImF1dG9wbGF5XCIsIFwiY2hlY2tlZFwiLCBcImNvbXBhY3RcIiwgXCJjb250cm9sc1wiLCBcImRlY2xhcmVcIixcbiAgICBcImRlZmF1bHRcIiwgXCJkZWZhdWx0Y2hlY2tlZFwiLCBcImRlZmF1bHRtdXRlZFwiLCBcImRlZmF1bHRzZWxlY3RlZFwiLCBcImRlZmVyXCIsIFwiZGlzYWJsZWRcIiwgXCJkcmFnZ2FibGVcIixcbiAgICBcImVuYWJsZWRcIiwgXCJmb3Jtbm92YWxpZGF0ZVwiLCBcImhpZGRlblwiLCBcImluZGV0ZXJtaW5hdGVcIiwgXCJpbmVydFwiLCBcImlzbWFwXCIsIFwiaXRlbXNjb3BlXCIsIFwibG9vcFwiLCBcIm11bHRpcGxlXCIsXG4gICAgXCJtdXRlZFwiLCBcIm5vaHJlZlwiLCBcIm5vcmVzaXplXCIsIFwibm9zaGFkZVwiLCBcIm5vdmFsaWRhdGVcIiwgXCJub3dyYXBcIiwgXCJvcGVuXCIsIFwicGF1c2VvbmV4aXRcIiwgXCJyZWFkb25seVwiLFxuICAgIFwicmVxdWlyZWRcIiwgXCJyZXZlcnNlZFwiLCBcInNjb3BlZFwiLCBcInNlYW1sZXNzXCIsIFwic2VsZWN0ZWRcIiwgXCJzb3J0YWJsZVwiLCBcInNwZWxsY2hlY2tcIiwgXCJ0cmFuc2xhdGVcIixcbiAgICBcInRydWVzcGVlZFwiLCBcInR5cGVtdXN0bWF0Y2hcIiwgXCJ2aXNpYmxlXCJdO1xudmFyIHhsaW5rTlMgPSAnaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayc7XG52YXIgeG1sTlMgPSAnaHR0cDovL3d3dy53My5vcmcvWE1MLzE5OTgvbmFtZXNwYWNlJztcbnZhciBjb2xvbkNoYXIgPSA1ODtcbnZhciB4Q2hhciA9IDEyMDtcbnZhciBib29sZWFuQXR0cnNEaWN0ID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbmZvciAodmFyIGkgPSAwLCBsZW4gPSBib29sZWFuQXR0cnMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICBib29sZWFuQXR0cnNEaWN0W2Jvb2xlYW5BdHRyc1tpXV0gPSB0cnVlO1xufVxuZnVuY3Rpb24gdXBkYXRlQXR0cnMob2xkVm5vZGUsIHZub2RlKSB7XG4gICAgdmFyIGtleSwgZWxtID0gdm5vZGUuZWxtLCBvbGRBdHRycyA9IG9sZFZub2RlLmRhdGEuYXR0cnMsIGF0dHJzID0gdm5vZGUuZGF0YS5hdHRycztcbiAgICBpZiAoIW9sZEF0dHJzICYmICFhdHRycylcbiAgICAgICAgcmV0dXJuO1xuICAgIGlmIChvbGRBdHRycyA9PT0gYXR0cnMpXG4gICAgICAgIHJldHVybjtcbiAgICBvbGRBdHRycyA9IG9sZEF0dHJzIHx8IHt9O1xuICAgIGF0dHJzID0gYXR0cnMgfHwge307XG4gICAgLy8gdXBkYXRlIG1vZGlmaWVkIGF0dHJpYnV0ZXMsIGFkZCBuZXcgYXR0cmlidXRlc1xuICAgIGZvciAoa2V5IGluIGF0dHJzKSB7XG4gICAgICAgIHZhciBjdXIgPSBhdHRyc1trZXldO1xuICAgICAgICB2YXIgb2xkID0gb2xkQXR0cnNba2V5XTtcbiAgICAgICAgaWYgKG9sZCAhPT0gY3VyKSB7XG4gICAgICAgICAgICBpZiAoYm9vbGVhbkF0dHJzRGljdFtrZXldKSB7XG4gICAgICAgICAgICAgICAgaWYgKGN1cikge1xuICAgICAgICAgICAgICAgICAgICBlbG0uc2V0QXR0cmlidXRlKGtleSwgXCJcIik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBlbG0ucmVtb3ZlQXR0cmlidXRlKGtleSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKGtleS5jaGFyQ29kZUF0KDApICE9PSB4Q2hhcikge1xuICAgICAgICAgICAgICAgICAgICBlbG0uc2V0QXR0cmlidXRlKGtleSwgY3VyKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAoa2V5LmNoYXJDb2RlQXQoMykgPT09IGNvbG9uQ2hhcikge1xuICAgICAgICAgICAgICAgICAgICAvLyBBc3N1bWUgeG1sIG5hbWVzcGFjZVxuICAgICAgICAgICAgICAgICAgICBlbG0uc2V0QXR0cmlidXRlTlMoeG1sTlMsIGtleSwgY3VyKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAoa2V5LmNoYXJDb2RlQXQoNSkgPT09IGNvbG9uQ2hhcikge1xuICAgICAgICAgICAgICAgICAgICAvLyBBc3N1bWUgeGxpbmsgbmFtZXNwYWNlXG4gICAgICAgICAgICAgICAgICAgIGVsbS5zZXRBdHRyaWJ1dGVOUyh4bGlua05TLCBrZXksIGN1cik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBlbG0uc2V0QXR0cmlidXRlKGtleSwgY3VyKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgLy8gcmVtb3ZlIHJlbW92ZWQgYXR0cmlidXRlc1xuICAgIC8vIHVzZSBgaW5gIG9wZXJhdG9yIHNpbmNlIHRoZSBwcmV2aW91cyBgZm9yYCBpdGVyYXRpb24gdXNlcyBpdCAoLmkuZS4gYWRkIGV2ZW4gYXR0cmlidXRlcyB3aXRoIHVuZGVmaW5lZCB2YWx1ZSlcbiAgICAvLyB0aGUgb3RoZXIgb3B0aW9uIGlzIHRvIHJlbW92ZSBhbGwgYXR0cmlidXRlcyB3aXRoIHZhbHVlID09IHVuZGVmaW5lZFxuICAgIGZvciAoa2V5IGluIG9sZEF0dHJzKSB7XG4gICAgICAgIGlmICghKGtleSBpbiBhdHRycykpIHtcbiAgICAgICAgICAgIGVsbS5yZW1vdmVBdHRyaWJ1dGUoa2V5KTtcbiAgICAgICAgfVxuICAgIH1cbn1cbmV4cG9ydHMuYXR0cmlidXRlc01vZHVsZSA9IHsgY3JlYXRlOiB1cGRhdGVBdHRycywgdXBkYXRlOiB1cGRhdGVBdHRycyB9O1xuZXhwb3J0cy5kZWZhdWx0ID0gZXhwb3J0cy5hdHRyaWJ1dGVzTW9kdWxlO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9YXR0cmlidXRlcy5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcbmZ1bmN0aW9uIHVwZGF0ZUNsYXNzKG9sZFZub2RlLCB2bm9kZSkge1xuICAgIHZhciBjdXIsIG5hbWUsIGVsbSA9IHZub2RlLmVsbSwgb2xkQ2xhc3MgPSBvbGRWbm9kZS5kYXRhLmNsYXNzLCBrbGFzcyA9IHZub2RlLmRhdGEuY2xhc3M7XG4gICAgaWYgKCFvbGRDbGFzcyAmJiAha2xhc3MpXG4gICAgICAgIHJldHVybjtcbiAgICBpZiAob2xkQ2xhc3MgPT09IGtsYXNzKVxuICAgICAgICByZXR1cm47XG4gICAgb2xkQ2xhc3MgPSBvbGRDbGFzcyB8fCB7fTtcbiAgICBrbGFzcyA9IGtsYXNzIHx8IHt9O1xuICAgIGZvciAobmFtZSBpbiBvbGRDbGFzcykge1xuICAgICAgICBpZiAoIWtsYXNzW25hbWVdKSB7XG4gICAgICAgICAgICBlbG0uY2xhc3NMaXN0LnJlbW92ZShuYW1lKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBmb3IgKG5hbWUgaW4ga2xhc3MpIHtcbiAgICAgICAgY3VyID0ga2xhc3NbbmFtZV07XG4gICAgICAgIGlmIChjdXIgIT09IG9sZENsYXNzW25hbWVdKSB7XG4gICAgICAgICAgICBlbG0uY2xhc3NMaXN0W2N1ciA/ICdhZGQnIDogJ3JlbW92ZSddKG5hbWUpO1xuICAgICAgICB9XG4gICAgfVxufVxuZXhwb3J0cy5jbGFzc01vZHVsZSA9IHsgY3JlYXRlOiB1cGRhdGVDbGFzcywgdXBkYXRlOiB1cGRhdGVDbGFzcyB9O1xuZXhwb3J0cy5kZWZhdWx0ID0gZXhwb3J0cy5jbGFzc01vZHVsZTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWNsYXNzLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xudmFyIENBUFNfUkVHRVggPSAvW0EtWl0vZztcbmZ1bmN0aW9uIHVwZGF0ZURhdGFzZXQob2xkVm5vZGUsIHZub2RlKSB7XG4gICAgdmFyIGVsbSA9IHZub2RlLmVsbSwgb2xkRGF0YXNldCA9IG9sZFZub2RlLmRhdGEuZGF0YXNldCwgZGF0YXNldCA9IHZub2RlLmRhdGEuZGF0YXNldCwga2V5O1xuICAgIGlmICghb2xkRGF0YXNldCAmJiAhZGF0YXNldClcbiAgICAgICAgcmV0dXJuO1xuICAgIGlmIChvbGREYXRhc2V0ID09PSBkYXRhc2V0KVxuICAgICAgICByZXR1cm47XG4gICAgb2xkRGF0YXNldCA9IG9sZERhdGFzZXQgfHwge307XG4gICAgZGF0YXNldCA9IGRhdGFzZXQgfHwge307XG4gICAgdmFyIGQgPSBlbG0uZGF0YXNldDtcbiAgICBmb3IgKGtleSBpbiBvbGREYXRhc2V0KSB7XG4gICAgICAgIGlmICghZGF0YXNldFtrZXldKSB7XG4gICAgICAgICAgICBpZiAoZCkge1xuICAgICAgICAgICAgICAgIGRlbGV0ZSBkW2tleV07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBlbG0ucmVtb3ZlQXR0cmlidXRlKCdkYXRhLScgKyBrZXkucmVwbGFjZShDQVBTX1JFR0VYLCAnLSQmJykudG9Mb3dlckNhc2UoKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgZm9yIChrZXkgaW4gZGF0YXNldCkge1xuICAgICAgICBpZiAob2xkRGF0YXNldFtrZXldICE9PSBkYXRhc2V0W2tleV0pIHtcbiAgICAgICAgICAgIGlmIChkKSB7XG4gICAgICAgICAgICAgICAgZFtrZXldID0gZGF0YXNldFtrZXldO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgZWxtLnNldEF0dHJpYnV0ZSgnZGF0YS0nICsga2V5LnJlcGxhY2UoQ0FQU19SRUdFWCwgJy0kJicpLnRvTG93ZXJDYXNlKCksIGRhdGFzZXRba2V5XSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59XG5leHBvcnRzLmRhdGFzZXRNb2R1bGUgPSB7IGNyZWF0ZTogdXBkYXRlRGF0YXNldCwgdXBkYXRlOiB1cGRhdGVEYXRhc2V0IH07XG5leHBvcnRzLmRlZmF1bHQgPSBleHBvcnRzLmRhdGFzZXRNb2R1bGU7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1kYXRhc2V0LmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xuZnVuY3Rpb24gdXBkYXRlUHJvcHMob2xkVm5vZGUsIHZub2RlKSB7XG4gICAgdmFyIGtleSwgY3VyLCBvbGQsIGVsbSA9IHZub2RlLmVsbSwgb2xkUHJvcHMgPSBvbGRWbm9kZS5kYXRhLnByb3BzLCBwcm9wcyA9IHZub2RlLmRhdGEucHJvcHM7XG4gICAgaWYgKCFvbGRQcm9wcyAmJiAhcHJvcHMpXG4gICAgICAgIHJldHVybjtcbiAgICBpZiAob2xkUHJvcHMgPT09IHByb3BzKVxuICAgICAgICByZXR1cm47XG4gICAgb2xkUHJvcHMgPSBvbGRQcm9wcyB8fCB7fTtcbiAgICBwcm9wcyA9IHByb3BzIHx8IHt9O1xuICAgIGZvciAoa2V5IGluIG9sZFByb3BzKSB7XG4gICAgICAgIGlmICghcHJvcHNba2V5XSkge1xuICAgICAgICAgICAgZGVsZXRlIGVsbVtrZXldO1xuICAgICAgICB9XG4gICAgfVxuICAgIGZvciAoa2V5IGluIHByb3BzKSB7XG4gICAgICAgIGN1ciA9IHByb3BzW2tleV07XG4gICAgICAgIG9sZCA9IG9sZFByb3BzW2tleV07XG4gICAgICAgIGlmIChvbGQgIT09IGN1ciAmJiAoa2V5ICE9PSAndmFsdWUnIHx8IGVsbVtrZXldICE9PSBjdXIpKSB7XG4gICAgICAgICAgICBlbG1ba2V5XSA9IGN1cjtcbiAgICAgICAgfVxuICAgIH1cbn1cbmV4cG9ydHMucHJvcHNNb2R1bGUgPSB7IGNyZWF0ZTogdXBkYXRlUHJvcHMsIHVwZGF0ZTogdXBkYXRlUHJvcHMgfTtcbmV4cG9ydHMuZGVmYXVsdCA9IGV4cG9ydHMucHJvcHNNb2R1bGU7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1wcm9wcy5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcbnZhciByYWYgPSAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgJiYgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSkgfHwgc2V0VGltZW91dDtcbnZhciBuZXh0RnJhbWUgPSBmdW5jdGlvbiAoZm4pIHsgcmFmKGZ1bmN0aW9uICgpIHsgcmFmKGZuKTsgfSk7IH07XG5mdW5jdGlvbiBzZXROZXh0RnJhbWUob2JqLCBwcm9wLCB2YWwpIHtcbiAgICBuZXh0RnJhbWUoZnVuY3Rpb24gKCkgeyBvYmpbcHJvcF0gPSB2YWw7IH0pO1xufVxuZnVuY3Rpb24gdXBkYXRlU3R5bGUob2xkVm5vZGUsIHZub2RlKSB7XG4gICAgdmFyIGN1ciwgbmFtZSwgZWxtID0gdm5vZGUuZWxtLCBvbGRTdHlsZSA9IG9sZFZub2RlLmRhdGEuc3R5bGUsIHN0eWxlID0gdm5vZGUuZGF0YS5zdHlsZTtcbiAgICBpZiAoIW9sZFN0eWxlICYmICFzdHlsZSlcbiAgICAgICAgcmV0dXJuO1xuICAgIGlmIChvbGRTdHlsZSA9PT0gc3R5bGUpXG4gICAgICAgIHJldHVybjtcbiAgICBvbGRTdHlsZSA9IG9sZFN0eWxlIHx8IHt9O1xuICAgIHN0eWxlID0gc3R5bGUgfHwge307XG4gICAgdmFyIG9sZEhhc0RlbCA9ICdkZWxheWVkJyBpbiBvbGRTdHlsZTtcbiAgICBmb3IgKG5hbWUgaW4gb2xkU3R5bGUpIHtcbiAgICAgICAgaWYgKCFzdHlsZVtuYW1lXSkge1xuICAgICAgICAgICAgaWYgKG5hbWVbMF0gPT09ICctJyAmJiBuYW1lWzFdID09PSAnLScpIHtcbiAgICAgICAgICAgICAgICBlbG0uc3R5bGUucmVtb3ZlUHJvcGVydHkobmFtZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBlbG0uc3R5bGVbbmFtZV0gPSAnJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICBmb3IgKG5hbWUgaW4gc3R5bGUpIHtcbiAgICAgICAgY3VyID0gc3R5bGVbbmFtZV07XG4gICAgICAgIGlmIChuYW1lID09PSAnZGVsYXllZCcpIHtcbiAgICAgICAgICAgIGZvciAobmFtZSBpbiBzdHlsZS5kZWxheWVkKSB7XG4gICAgICAgICAgICAgICAgY3VyID0gc3R5bGUuZGVsYXllZFtuYW1lXTtcbiAgICAgICAgICAgICAgICBpZiAoIW9sZEhhc0RlbCB8fCBjdXIgIT09IG9sZFN0eWxlLmRlbGF5ZWRbbmFtZV0pIHtcbiAgICAgICAgICAgICAgICAgICAgc2V0TmV4dEZyYW1lKGVsbS5zdHlsZSwgbmFtZSwgY3VyKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAobmFtZSAhPT0gJ3JlbW92ZScgJiYgY3VyICE9PSBvbGRTdHlsZVtuYW1lXSkge1xuICAgICAgICAgICAgaWYgKG5hbWVbMF0gPT09ICctJyAmJiBuYW1lWzFdID09PSAnLScpIHtcbiAgICAgICAgICAgICAgICBlbG0uc3R5bGUuc2V0UHJvcGVydHkobmFtZSwgY3VyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGVsbS5zdHlsZVtuYW1lXSA9IGN1cjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn1cbmZ1bmN0aW9uIGFwcGx5RGVzdHJveVN0eWxlKHZub2RlKSB7XG4gICAgdmFyIHN0eWxlLCBuYW1lLCBlbG0gPSB2bm9kZS5lbG0sIHMgPSB2bm9kZS5kYXRhLnN0eWxlO1xuICAgIGlmICghcyB8fCAhKHN0eWxlID0gcy5kZXN0cm95KSlcbiAgICAgICAgcmV0dXJuO1xuICAgIGZvciAobmFtZSBpbiBzdHlsZSkge1xuICAgICAgICBlbG0uc3R5bGVbbmFtZV0gPSBzdHlsZVtuYW1lXTtcbiAgICB9XG59XG5mdW5jdGlvbiBhcHBseVJlbW92ZVN0eWxlKHZub2RlLCBybSkge1xuICAgIHZhciBzID0gdm5vZGUuZGF0YS5zdHlsZTtcbiAgICBpZiAoIXMgfHwgIXMucmVtb3ZlKSB7XG4gICAgICAgIHJtKCk7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIG5hbWUsIGVsbSA9IHZub2RlLmVsbSwgaSA9IDAsIGNvbXBTdHlsZSwgc3R5bGUgPSBzLnJlbW92ZSwgYW1vdW50ID0gMCwgYXBwbGllZCA9IFtdO1xuICAgIGZvciAobmFtZSBpbiBzdHlsZSkge1xuICAgICAgICBhcHBsaWVkLnB1c2gobmFtZSk7XG4gICAgICAgIGVsbS5zdHlsZVtuYW1lXSA9IHN0eWxlW25hbWVdO1xuICAgIH1cbiAgICBjb21wU3R5bGUgPSBnZXRDb21wdXRlZFN0eWxlKGVsbSk7XG4gICAgdmFyIHByb3BzID0gY29tcFN0eWxlWyd0cmFuc2l0aW9uLXByb3BlcnR5J10uc3BsaXQoJywgJyk7XG4gICAgZm9yICg7IGkgPCBwcm9wcy5sZW5ndGg7ICsraSkge1xuICAgICAgICBpZiAoYXBwbGllZC5pbmRleE9mKHByb3BzW2ldKSAhPT0gLTEpXG4gICAgICAgICAgICBhbW91bnQrKztcbiAgICB9XG4gICAgZWxtLmFkZEV2ZW50TGlzdGVuZXIoJ3RyYW5zaXRpb25lbmQnLCBmdW5jdGlvbiAoZXYpIHtcbiAgICAgICAgaWYgKGV2LnRhcmdldCA9PT0gZWxtKVxuICAgICAgICAgICAgLS1hbW91bnQ7XG4gICAgICAgIGlmIChhbW91bnQgPT09IDApXG4gICAgICAgICAgICBybSgpO1xuICAgIH0pO1xufVxuZXhwb3J0cy5zdHlsZU1vZHVsZSA9IHtcbiAgICBjcmVhdGU6IHVwZGF0ZVN0eWxlLFxuICAgIHVwZGF0ZTogdXBkYXRlU3R5bGUsXG4gICAgZGVzdHJveTogYXBwbHlEZXN0cm95U3R5bGUsXG4gICAgcmVtb3ZlOiBhcHBseVJlbW92ZVN0eWxlXG59O1xuZXhwb3J0cy5kZWZhdWx0ID0gZXhwb3J0cy5zdHlsZU1vZHVsZTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPXN0eWxlLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xudmFyIHZub2RlXzEgPSByZXF1aXJlKFwiLi92bm9kZVwiKTtcbnZhciBpcyA9IHJlcXVpcmUoXCIuL2lzXCIpO1xudmFyIGh0bWxkb21hcGlfMSA9IHJlcXVpcmUoXCIuL2h0bWxkb21hcGlcIik7XG5mdW5jdGlvbiBpc1VuZGVmKHMpIHsgcmV0dXJuIHMgPT09IHVuZGVmaW5lZDsgfVxuZnVuY3Rpb24gaXNEZWYocykgeyByZXR1cm4gcyAhPT0gdW5kZWZpbmVkOyB9XG52YXIgZW1wdHlOb2RlID0gdm5vZGVfMS5kZWZhdWx0KCcnLCB7fSwgW10sIHVuZGVmaW5lZCwgdW5kZWZpbmVkKTtcbmZ1bmN0aW9uIHNhbWVWbm9kZSh2bm9kZTEsIHZub2RlMikge1xuICAgIHJldHVybiB2bm9kZTEua2V5ID09PSB2bm9kZTIua2V5ICYmIHZub2RlMS5zZWwgPT09IHZub2RlMi5zZWw7XG59XG5mdW5jdGlvbiBpc1Zub2RlKHZub2RlKSB7XG4gICAgcmV0dXJuIHZub2RlLnNlbCAhPT0gdW5kZWZpbmVkO1xufVxuZnVuY3Rpb24gY3JlYXRlS2V5VG9PbGRJZHgoY2hpbGRyZW4sIGJlZ2luSWR4LCBlbmRJZHgpIHtcbiAgICB2YXIgaSwgbWFwID0ge30sIGtleSwgY2g7XG4gICAgZm9yIChpID0gYmVnaW5JZHg7IGkgPD0gZW5kSWR4OyArK2kpIHtcbiAgICAgICAgY2ggPSBjaGlsZHJlbltpXTtcbiAgICAgICAgaWYgKGNoICE9IG51bGwpIHtcbiAgICAgICAgICAgIGtleSA9IGNoLmtleTtcbiAgICAgICAgICAgIGlmIChrZXkgIT09IHVuZGVmaW5lZClcbiAgICAgICAgICAgICAgICBtYXBba2V5XSA9IGk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG1hcDtcbn1cbnZhciBob29rcyA9IFsnY3JlYXRlJywgJ3VwZGF0ZScsICdyZW1vdmUnLCAnZGVzdHJveScsICdwcmUnLCAncG9zdCddO1xudmFyIGhfMSA9IHJlcXVpcmUoXCIuL2hcIik7XG5leHBvcnRzLmggPSBoXzEuaDtcbnZhciB0aHVua18xID0gcmVxdWlyZShcIi4vdGh1bmtcIik7XG5leHBvcnRzLnRodW5rID0gdGh1bmtfMS50aHVuaztcbmZ1bmN0aW9uIGluaXQobW9kdWxlcywgZG9tQXBpKSB7XG4gICAgdmFyIGksIGosIGNicyA9IHt9O1xuICAgIHZhciBhcGkgPSBkb21BcGkgIT09IHVuZGVmaW5lZCA/IGRvbUFwaSA6IGh0bWxkb21hcGlfMS5kZWZhdWx0O1xuICAgIGZvciAoaSA9IDA7IGkgPCBob29rcy5sZW5ndGg7ICsraSkge1xuICAgICAgICBjYnNbaG9va3NbaV1dID0gW107XG4gICAgICAgIGZvciAoaiA9IDA7IGogPCBtb2R1bGVzLmxlbmd0aDsgKytqKSB7XG4gICAgICAgICAgICB2YXIgaG9vayA9IG1vZHVsZXNbal1baG9va3NbaV1dO1xuICAgICAgICAgICAgaWYgKGhvb2sgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIGNic1tob29rc1tpXV0ucHVzaChob29rKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICBmdW5jdGlvbiBlbXB0eU5vZGVBdChlbG0pIHtcbiAgICAgICAgdmFyIGlkID0gZWxtLmlkID8gJyMnICsgZWxtLmlkIDogJyc7XG4gICAgICAgIHZhciBjID0gZWxtLmNsYXNzTmFtZSA/ICcuJyArIGVsbS5jbGFzc05hbWUuc3BsaXQoJyAnKS5qb2luKCcuJykgOiAnJztcbiAgICAgICAgcmV0dXJuIHZub2RlXzEuZGVmYXVsdChhcGkudGFnTmFtZShlbG0pLnRvTG93ZXJDYXNlKCkgKyBpZCArIGMsIHt9LCBbXSwgdW5kZWZpbmVkLCBlbG0pO1xuICAgIH1cbiAgICBmdW5jdGlvbiBjcmVhdGVSbUNiKGNoaWxkRWxtLCBsaXN0ZW5lcnMpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIHJtQ2IoKSB7XG4gICAgICAgICAgICBpZiAoLS1saXN0ZW5lcnMgPT09IDApIHtcbiAgICAgICAgICAgICAgICB2YXIgcGFyZW50XzEgPSBhcGkucGFyZW50Tm9kZShjaGlsZEVsbSk7XG4gICAgICAgICAgICAgICAgYXBpLnJlbW92ZUNoaWxkKHBhcmVudF8xLCBjaGlsZEVsbSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfVxuICAgIGZ1bmN0aW9uIGNyZWF0ZUVsbSh2bm9kZSwgaW5zZXJ0ZWRWbm9kZVF1ZXVlKSB7XG4gICAgICAgIHZhciBpLCBkYXRhID0gdm5vZGUuZGF0YTtcbiAgICAgICAgaWYgKGRhdGEgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgaWYgKGlzRGVmKGkgPSBkYXRhLmhvb2spICYmIGlzRGVmKGkgPSBpLmluaXQpKSB7XG4gICAgICAgICAgICAgICAgaSh2bm9kZSk7XG4gICAgICAgICAgICAgICAgZGF0YSA9IHZub2RlLmRhdGE7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGNoaWxkcmVuID0gdm5vZGUuY2hpbGRyZW4sIHNlbCA9IHZub2RlLnNlbDtcbiAgICAgICAgaWYgKHNlbCA9PT0gJyEnKSB7XG4gICAgICAgICAgICBpZiAoaXNVbmRlZih2bm9kZS50ZXh0KSkge1xuICAgICAgICAgICAgICAgIHZub2RlLnRleHQgPSAnJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZub2RlLmVsbSA9IGFwaS5jcmVhdGVDb21tZW50KHZub2RlLnRleHQpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHNlbCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAvLyBQYXJzZSBzZWxlY3RvclxuICAgICAgICAgICAgdmFyIGhhc2hJZHggPSBzZWwuaW5kZXhPZignIycpO1xuICAgICAgICAgICAgdmFyIGRvdElkeCA9IHNlbC5pbmRleE9mKCcuJywgaGFzaElkeCk7XG4gICAgICAgICAgICB2YXIgaGFzaCA9IGhhc2hJZHggPiAwID8gaGFzaElkeCA6IHNlbC5sZW5ndGg7XG4gICAgICAgICAgICB2YXIgZG90ID0gZG90SWR4ID4gMCA/IGRvdElkeCA6IHNlbC5sZW5ndGg7XG4gICAgICAgICAgICB2YXIgdGFnID0gaGFzaElkeCAhPT0gLTEgfHwgZG90SWR4ICE9PSAtMSA/IHNlbC5zbGljZSgwLCBNYXRoLm1pbihoYXNoLCBkb3QpKSA6IHNlbDtcbiAgICAgICAgICAgIHZhciBlbG0gPSB2bm9kZS5lbG0gPSBpc0RlZihkYXRhKSAmJiBpc0RlZihpID0gZGF0YS5ucykgPyBhcGkuY3JlYXRlRWxlbWVudE5TKGksIHRhZylcbiAgICAgICAgICAgICAgICA6IGFwaS5jcmVhdGVFbGVtZW50KHRhZyk7XG4gICAgICAgICAgICBpZiAoaGFzaCA8IGRvdClcbiAgICAgICAgICAgICAgICBlbG0uc2V0QXR0cmlidXRlKCdpZCcsIHNlbC5zbGljZShoYXNoICsgMSwgZG90KSk7XG4gICAgICAgICAgICBpZiAoZG90SWR4ID4gMClcbiAgICAgICAgICAgICAgICBlbG0uc2V0QXR0cmlidXRlKCdjbGFzcycsIHNlbC5zbGljZShkb3QgKyAxKS5yZXBsYWNlKC9cXC4vZywgJyAnKSk7XG4gICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgY2JzLmNyZWF0ZS5sZW5ndGg7ICsraSlcbiAgICAgICAgICAgICAgICBjYnMuY3JlYXRlW2ldKGVtcHR5Tm9kZSwgdm5vZGUpO1xuICAgICAgICAgICAgaWYgKGlzLmFycmF5KGNoaWxkcmVuKSkge1xuICAgICAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBjaGlsZHJlbi5sZW5ndGg7ICsraSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgY2ggPSBjaGlsZHJlbltpXTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNoICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFwaS5hcHBlbmRDaGlsZChlbG0sIGNyZWF0ZUVsbShjaCwgaW5zZXJ0ZWRWbm9kZVF1ZXVlKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChpcy5wcmltaXRpdmUodm5vZGUudGV4dCkpIHtcbiAgICAgICAgICAgICAgICBhcGkuYXBwZW5kQ2hpbGQoZWxtLCBhcGkuY3JlYXRlVGV4dE5vZGUodm5vZGUudGV4dCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaSA9IHZub2RlLmRhdGEuaG9vazsgLy8gUmV1c2UgdmFyaWFibGVcbiAgICAgICAgICAgIGlmIChpc0RlZihpKSkge1xuICAgICAgICAgICAgICAgIGlmIChpLmNyZWF0ZSlcbiAgICAgICAgICAgICAgICAgICAgaS5jcmVhdGUoZW1wdHlOb2RlLCB2bm9kZSk7XG4gICAgICAgICAgICAgICAgaWYgKGkuaW5zZXJ0KVxuICAgICAgICAgICAgICAgICAgICBpbnNlcnRlZFZub2RlUXVldWUucHVzaCh2bm9kZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB2bm9kZS5lbG0gPSBhcGkuY3JlYXRlVGV4dE5vZGUodm5vZGUudGV4dCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHZub2RlLmVsbTtcbiAgICB9XG4gICAgZnVuY3Rpb24gYWRkVm5vZGVzKHBhcmVudEVsbSwgYmVmb3JlLCB2bm9kZXMsIHN0YXJ0SWR4LCBlbmRJZHgsIGluc2VydGVkVm5vZGVRdWV1ZSkge1xuICAgICAgICBmb3IgKDsgc3RhcnRJZHggPD0gZW5kSWR4OyArK3N0YXJ0SWR4KSB7XG4gICAgICAgICAgICB2YXIgY2ggPSB2bm9kZXNbc3RhcnRJZHhdO1xuICAgICAgICAgICAgaWYgKGNoICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICBhcGkuaW5zZXJ0QmVmb3JlKHBhcmVudEVsbSwgY3JlYXRlRWxtKGNoLCBpbnNlcnRlZFZub2RlUXVldWUpLCBiZWZvcmUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIGZ1bmN0aW9uIGludm9rZURlc3Ryb3lIb29rKHZub2RlKSB7XG4gICAgICAgIHZhciBpLCBqLCBkYXRhID0gdm5vZGUuZGF0YTtcbiAgICAgICAgaWYgKGRhdGEgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgaWYgKGlzRGVmKGkgPSBkYXRhLmhvb2spICYmIGlzRGVmKGkgPSBpLmRlc3Ryb3kpKVxuICAgICAgICAgICAgICAgIGkodm5vZGUpO1xuICAgICAgICAgICAgZm9yIChpID0gMDsgaSA8IGNicy5kZXN0cm95Lmxlbmd0aDsgKytpKVxuICAgICAgICAgICAgICAgIGNicy5kZXN0cm95W2ldKHZub2RlKTtcbiAgICAgICAgICAgIGlmICh2bm9kZS5jaGlsZHJlbiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgZm9yIChqID0gMDsgaiA8IHZub2RlLmNoaWxkcmVuLmxlbmd0aDsgKytqKSB7XG4gICAgICAgICAgICAgICAgICAgIGkgPSB2bm9kZS5jaGlsZHJlbltqXTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGkgIT0gbnVsbCAmJiB0eXBlb2YgaSAhPT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgICAgICAgICAgICAgICAgaW52b2tlRGVzdHJveUhvb2soaSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgZnVuY3Rpb24gcmVtb3ZlVm5vZGVzKHBhcmVudEVsbSwgdm5vZGVzLCBzdGFydElkeCwgZW5kSWR4KSB7XG4gICAgICAgIGZvciAoOyBzdGFydElkeCA8PSBlbmRJZHg7ICsrc3RhcnRJZHgpIHtcbiAgICAgICAgICAgIHZhciBpXzEgPSB2b2lkIDAsIGxpc3RlbmVycyA9IHZvaWQgMCwgcm0gPSB2b2lkIDAsIGNoID0gdm5vZGVzW3N0YXJ0SWR4XTtcbiAgICAgICAgICAgIGlmIChjaCAhPSBudWxsKSB7XG4gICAgICAgICAgICAgICAgaWYgKGlzRGVmKGNoLnNlbCkpIHtcbiAgICAgICAgICAgICAgICAgICAgaW52b2tlRGVzdHJveUhvb2soY2gpO1xuICAgICAgICAgICAgICAgICAgICBsaXN0ZW5lcnMgPSBjYnMucmVtb3ZlLmxlbmd0aCArIDE7XG4gICAgICAgICAgICAgICAgICAgIHJtID0gY3JlYXRlUm1DYihjaC5lbG0sIGxpc3RlbmVycyk7XG4gICAgICAgICAgICAgICAgICAgIGZvciAoaV8xID0gMDsgaV8xIDwgY2JzLnJlbW92ZS5sZW5ndGg7ICsraV8xKVxuICAgICAgICAgICAgICAgICAgICAgICAgY2JzLnJlbW92ZVtpXzFdKGNoLCBybSk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpc0RlZihpXzEgPSBjaC5kYXRhKSAmJiBpc0RlZihpXzEgPSBpXzEuaG9vaykgJiYgaXNEZWYoaV8xID0gaV8xLnJlbW92ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlfMShjaCwgcm0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcm0oKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgYXBpLnJlbW92ZUNoaWxkKHBhcmVudEVsbSwgY2guZWxtKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgZnVuY3Rpb24gdXBkYXRlQ2hpbGRyZW4ocGFyZW50RWxtLCBvbGRDaCwgbmV3Q2gsIGluc2VydGVkVm5vZGVRdWV1ZSkge1xuICAgICAgICB2YXIgb2xkU3RhcnRJZHggPSAwLCBuZXdTdGFydElkeCA9IDA7XG4gICAgICAgIHZhciBvbGRFbmRJZHggPSBvbGRDaC5sZW5ndGggLSAxO1xuICAgICAgICB2YXIgb2xkU3RhcnRWbm9kZSA9IG9sZENoWzBdO1xuICAgICAgICB2YXIgb2xkRW5kVm5vZGUgPSBvbGRDaFtvbGRFbmRJZHhdO1xuICAgICAgICB2YXIgbmV3RW5kSWR4ID0gbmV3Q2gubGVuZ3RoIC0gMTtcbiAgICAgICAgdmFyIG5ld1N0YXJ0Vm5vZGUgPSBuZXdDaFswXTtcbiAgICAgICAgdmFyIG5ld0VuZFZub2RlID0gbmV3Q2hbbmV3RW5kSWR4XTtcbiAgICAgICAgdmFyIG9sZEtleVRvSWR4O1xuICAgICAgICB2YXIgaWR4SW5PbGQ7XG4gICAgICAgIHZhciBlbG1Ub01vdmU7XG4gICAgICAgIHZhciBiZWZvcmU7XG4gICAgICAgIHdoaWxlIChvbGRTdGFydElkeCA8PSBvbGRFbmRJZHggJiYgbmV3U3RhcnRJZHggPD0gbmV3RW5kSWR4KSB7XG4gICAgICAgICAgICBpZiAob2xkU3RhcnRWbm9kZSA9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgb2xkU3RhcnRWbm9kZSA9IG9sZENoWysrb2xkU3RhcnRJZHhdOyAvLyBWbm9kZSBtaWdodCBoYXZlIGJlZW4gbW92ZWQgbGVmdFxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAob2xkRW5kVm5vZGUgPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIG9sZEVuZFZub2RlID0gb2xkQ2hbLS1vbGRFbmRJZHhdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAobmV3U3RhcnRWbm9kZSA9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgbmV3U3RhcnRWbm9kZSA9IG5ld0NoWysrbmV3U3RhcnRJZHhdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAobmV3RW5kVm5vZGUgPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIG5ld0VuZFZub2RlID0gbmV3Q2hbLS1uZXdFbmRJZHhdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoc2FtZVZub2RlKG9sZFN0YXJ0Vm5vZGUsIG5ld1N0YXJ0Vm5vZGUpKSB7XG4gICAgICAgICAgICAgICAgcGF0Y2hWbm9kZShvbGRTdGFydFZub2RlLCBuZXdTdGFydFZub2RlLCBpbnNlcnRlZFZub2RlUXVldWUpO1xuICAgICAgICAgICAgICAgIG9sZFN0YXJ0Vm5vZGUgPSBvbGRDaFsrK29sZFN0YXJ0SWR4XTtcbiAgICAgICAgICAgICAgICBuZXdTdGFydFZub2RlID0gbmV3Q2hbKytuZXdTdGFydElkeF07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChzYW1lVm5vZGUob2xkRW5kVm5vZGUsIG5ld0VuZFZub2RlKSkge1xuICAgICAgICAgICAgICAgIHBhdGNoVm5vZGUob2xkRW5kVm5vZGUsIG5ld0VuZFZub2RlLCBpbnNlcnRlZFZub2RlUXVldWUpO1xuICAgICAgICAgICAgICAgIG9sZEVuZFZub2RlID0gb2xkQ2hbLS1vbGRFbmRJZHhdO1xuICAgICAgICAgICAgICAgIG5ld0VuZFZub2RlID0gbmV3Q2hbLS1uZXdFbmRJZHhdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoc2FtZVZub2RlKG9sZFN0YXJ0Vm5vZGUsIG5ld0VuZFZub2RlKSkge1xuICAgICAgICAgICAgICAgIHBhdGNoVm5vZGUob2xkU3RhcnRWbm9kZSwgbmV3RW5kVm5vZGUsIGluc2VydGVkVm5vZGVRdWV1ZSk7XG4gICAgICAgICAgICAgICAgYXBpLmluc2VydEJlZm9yZShwYXJlbnRFbG0sIG9sZFN0YXJ0Vm5vZGUuZWxtLCBhcGkubmV4dFNpYmxpbmcob2xkRW5kVm5vZGUuZWxtKSk7XG4gICAgICAgICAgICAgICAgb2xkU3RhcnRWbm9kZSA9IG9sZENoWysrb2xkU3RhcnRJZHhdO1xuICAgICAgICAgICAgICAgIG5ld0VuZFZub2RlID0gbmV3Q2hbLS1uZXdFbmRJZHhdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoc2FtZVZub2RlKG9sZEVuZFZub2RlLCBuZXdTdGFydFZub2RlKSkge1xuICAgICAgICAgICAgICAgIHBhdGNoVm5vZGUob2xkRW5kVm5vZGUsIG5ld1N0YXJ0Vm5vZGUsIGluc2VydGVkVm5vZGVRdWV1ZSk7XG4gICAgICAgICAgICAgICAgYXBpLmluc2VydEJlZm9yZShwYXJlbnRFbG0sIG9sZEVuZFZub2RlLmVsbSwgb2xkU3RhcnRWbm9kZS5lbG0pO1xuICAgICAgICAgICAgICAgIG9sZEVuZFZub2RlID0gb2xkQ2hbLS1vbGRFbmRJZHhdO1xuICAgICAgICAgICAgICAgIG5ld1N0YXJ0Vm5vZGUgPSBuZXdDaFsrK25ld1N0YXJ0SWR4XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmIChvbGRLZXlUb0lkeCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIG9sZEtleVRvSWR4ID0gY3JlYXRlS2V5VG9PbGRJZHgob2xkQ2gsIG9sZFN0YXJ0SWR4LCBvbGRFbmRJZHgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZHhJbk9sZCA9IG9sZEtleVRvSWR4W25ld1N0YXJ0Vm5vZGUua2V5XTtcbiAgICAgICAgICAgICAgICBpZiAoaXNVbmRlZihpZHhJbk9sZCkpIHtcbiAgICAgICAgICAgICAgICAgICAgYXBpLmluc2VydEJlZm9yZShwYXJlbnRFbG0sIGNyZWF0ZUVsbShuZXdTdGFydFZub2RlLCBpbnNlcnRlZFZub2RlUXVldWUpLCBvbGRTdGFydFZub2RlLmVsbSk7XG4gICAgICAgICAgICAgICAgICAgIG5ld1N0YXJ0Vm5vZGUgPSBuZXdDaFsrK25ld1N0YXJ0SWR4XTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGVsbVRvTW92ZSA9IG9sZENoW2lkeEluT2xkXTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVsbVRvTW92ZS5zZWwgIT09IG5ld1N0YXJ0Vm5vZGUuc2VsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhcGkuaW5zZXJ0QmVmb3JlKHBhcmVudEVsbSwgY3JlYXRlRWxtKG5ld1N0YXJ0Vm5vZGUsIGluc2VydGVkVm5vZGVRdWV1ZSksIG9sZFN0YXJ0Vm5vZGUuZWxtKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhdGNoVm5vZGUoZWxtVG9Nb3ZlLCBuZXdTdGFydFZub2RlLCBpbnNlcnRlZFZub2RlUXVldWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgb2xkQ2hbaWR4SW5PbGRdID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgICAgICAgICAgYXBpLmluc2VydEJlZm9yZShwYXJlbnRFbG0sIGVsbVRvTW92ZS5lbG0sIG9sZFN0YXJ0Vm5vZGUuZWxtKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBuZXdTdGFydFZub2RlID0gbmV3Q2hbKytuZXdTdGFydElkeF07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChvbGRTdGFydElkeCA+IG9sZEVuZElkeCkge1xuICAgICAgICAgICAgYmVmb3JlID0gbmV3Q2hbbmV3RW5kSWR4ICsgMV0gPT0gbnVsbCA/IG51bGwgOiBuZXdDaFtuZXdFbmRJZHggKyAxXS5lbG07XG4gICAgICAgICAgICBhZGRWbm9kZXMocGFyZW50RWxtLCBiZWZvcmUsIG5ld0NoLCBuZXdTdGFydElkeCwgbmV3RW5kSWR4LCBpbnNlcnRlZFZub2RlUXVldWUpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKG5ld1N0YXJ0SWR4ID4gbmV3RW5kSWR4KSB7XG4gICAgICAgICAgICByZW1vdmVWbm9kZXMocGFyZW50RWxtLCBvbGRDaCwgb2xkU3RhcnRJZHgsIG9sZEVuZElkeCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZnVuY3Rpb24gcGF0Y2hWbm9kZShvbGRWbm9kZSwgdm5vZGUsIGluc2VydGVkVm5vZGVRdWV1ZSkge1xuICAgICAgICB2YXIgaSwgaG9vaztcbiAgICAgICAgaWYgKGlzRGVmKGkgPSB2bm9kZS5kYXRhKSAmJiBpc0RlZihob29rID0gaS5ob29rKSAmJiBpc0RlZihpID0gaG9vay5wcmVwYXRjaCkpIHtcbiAgICAgICAgICAgIGkob2xkVm5vZGUsIHZub2RlKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgZWxtID0gdm5vZGUuZWxtID0gb2xkVm5vZGUuZWxtO1xuICAgICAgICB2YXIgb2xkQ2ggPSBvbGRWbm9kZS5jaGlsZHJlbjtcbiAgICAgICAgdmFyIGNoID0gdm5vZGUuY2hpbGRyZW47XG4gICAgICAgIGlmIChvbGRWbm9kZSA9PT0gdm5vZGUpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIGlmICh2bm9kZS5kYXRhICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBjYnMudXBkYXRlLmxlbmd0aDsgKytpKVxuICAgICAgICAgICAgICAgIGNicy51cGRhdGVbaV0ob2xkVm5vZGUsIHZub2RlKTtcbiAgICAgICAgICAgIGkgPSB2bm9kZS5kYXRhLmhvb2s7XG4gICAgICAgICAgICBpZiAoaXNEZWYoaSkgJiYgaXNEZWYoaSA9IGkudXBkYXRlKSlcbiAgICAgICAgICAgICAgICBpKG9sZFZub2RlLCB2bm9kZSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGlzVW5kZWYodm5vZGUudGV4dCkpIHtcbiAgICAgICAgICAgIGlmIChpc0RlZihvbGRDaCkgJiYgaXNEZWYoY2gpKSB7XG4gICAgICAgICAgICAgICAgaWYgKG9sZENoICE9PSBjaClcbiAgICAgICAgICAgICAgICAgICAgdXBkYXRlQ2hpbGRyZW4oZWxtLCBvbGRDaCwgY2gsIGluc2VydGVkVm5vZGVRdWV1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChpc0RlZihjaCkpIHtcbiAgICAgICAgICAgICAgICBpZiAoaXNEZWYob2xkVm5vZGUudGV4dCkpXG4gICAgICAgICAgICAgICAgICAgIGFwaS5zZXRUZXh0Q29udGVudChlbG0sICcnKTtcbiAgICAgICAgICAgICAgICBhZGRWbm9kZXMoZWxtLCBudWxsLCBjaCwgMCwgY2gubGVuZ3RoIC0gMSwgaW5zZXJ0ZWRWbm9kZVF1ZXVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGlzRGVmKG9sZENoKSkge1xuICAgICAgICAgICAgICAgIHJlbW92ZVZub2RlcyhlbG0sIG9sZENoLCAwLCBvbGRDaC5sZW5ndGggLSAxKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGlzRGVmKG9sZFZub2RlLnRleHQpKSB7XG4gICAgICAgICAgICAgICAgYXBpLnNldFRleHRDb250ZW50KGVsbSwgJycpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKG9sZFZub2RlLnRleHQgIT09IHZub2RlLnRleHQpIHtcbiAgICAgICAgICAgIGFwaS5zZXRUZXh0Q29udGVudChlbG0sIHZub2RlLnRleHQpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpc0RlZihob29rKSAmJiBpc0RlZihpID0gaG9vay5wb3N0cGF0Y2gpKSB7XG4gICAgICAgICAgICBpKG9sZFZub2RlLCB2bm9kZSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZ1bmN0aW9uIHBhdGNoKG9sZFZub2RlLCB2bm9kZSkge1xuICAgICAgICB2YXIgaSwgZWxtLCBwYXJlbnQ7XG4gICAgICAgIHZhciBpbnNlcnRlZFZub2RlUXVldWUgPSBbXTtcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IGNicy5wcmUubGVuZ3RoOyArK2kpXG4gICAgICAgICAgICBjYnMucHJlW2ldKCk7XG4gICAgICAgIGlmICghaXNWbm9kZShvbGRWbm9kZSkpIHtcbiAgICAgICAgICAgIG9sZFZub2RlID0gZW1wdHlOb2RlQXQob2xkVm5vZGUpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzYW1lVm5vZGUob2xkVm5vZGUsIHZub2RlKSkge1xuICAgICAgICAgICAgcGF0Y2hWbm9kZShvbGRWbm9kZSwgdm5vZGUsIGluc2VydGVkVm5vZGVRdWV1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBlbG0gPSBvbGRWbm9kZS5lbG07XG4gICAgICAgICAgICBwYXJlbnQgPSBhcGkucGFyZW50Tm9kZShlbG0pO1xuICAgICAgICAgICAgY3JlYXRlRWxtKHZub2RlLCBpbnNlcnRlZFZub2RlUXVldWUpO1xuICAgICAgICAgICAgaWYgKHBhcmVudCAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIGFwaS5pbnNlcnRCZWZvcmUocGFyZW50LCB2bm9kZS5lbG0sIGFwaS5uZXh0U2libGluZyhlbG0pKTtcbiAgICAgICAgICAgICAgICByZW1vdmVWbm9kZXMocGFyZW50LCBbb2xkVm5vZGVdLCAwLCAwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgaW5zZXJ0ZWRWbm9kZVF1ZXVlLmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgICBpbnNlcnRlZFZub2RlUXVldWVbaV0uZGF0YS5ob29rLmluc2VydChpbnNlcnRlZFZub2RlUXVldWVbaV0pO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBjYnMucG9zdC5sZW5ndGg7ICsraSlcbiAgICAgICAgICAgIGNicy5wb3N0W2ldKCk7XG4gICAgICAgIHJldHVybiB2bm9kZTtcbiAgICB9O1xufVxuZXhwb3J0cy5pbml0ID0gaW5pdDtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPXNuYWJiZG9tLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xudmFyIGhfMSA9IHJlcXVpcmUoXCIuL2hcIik7XG5mdW5jdGlvbiBjb3B5VG9UaHVuayh2bm9kZSwgdGh1bmspIHtcbiAgICB0aHVuay5lbG0gPSB2bm9kZS5lbG07XG4gICAgdm5vZGUuZGF0YS5mbiA9IHRodW5rLmRhdGEuZm47XG4gICAgdm5vZGUuZGF0YS5hcmdzID0gdGh1bmsuZGF0YS5hcmdzO1xuICAgIHRodW5rLmRhdGEgPSB2bm9kZS5kYXRhO1xuICAgIHRodW5rLmNoaWxkcmVuID0gdm5vZGUuY2hpbGRyZW47XG4gICAgdGh1bmsudGV4dCA9IHZub2RlLnRleHQ7XG4gICAgdGh1bmsuZWxtID0gdm5vZGUuZWxtO1xufVxuZnVuY3Rpb24gaW5pdCh0aHVuaykge1xuICAgIHZhciBjdXIgPSB0aHVuay5kYXRhO1xuICAgIHZhciB2bm9kZSA9IGN1ci5mbi5hcHBseSh1bmRlZmluZWQsIGN1ci5hcmdzKTtcbiAgICBjb3B5VG9UaHVuayh2bm9kZSwgdGh1bmspO1xufVxuZnVuY3Rpb24gcHJlcGF0Y2gob2xkVm5vZGUsIHRodW5rKSB7XG4gICAgdmFyIGksIG9sZCA9IG9sZFZub2RlLmRhdGEsIGN1ciA9IHRodW5rLmRhdGE7XG4gICAgdmFyIG9sZEFyZ3MgPSBvbGQuYXJncywgYXJncyA9IGN1ci5hcmdzO1xuICAgIGlmIChvbGQuZm4gIT09IGN1ci5mbiB8fCBvbGRBcmdzLmxlbmd0aCAhPT0gYXJncy5sZW5ndGgpIHtcbiAgICAgICAgY29weVRvVGh1bmsoY3VyLmZuLmFwcGx5KHVuZGVmaW5lZCwgYXJncyksIHRodW5rKTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBmb3IgKGkgPSAwOyBpIDwgYXJncy5sZW5ndGg7ICsraSkge1xuICAgICAgICBpZiAob2xkQXJnc1tpXSAhPT0gYXJnc1tpXSkge1xuICAgICAgICAgICAgY29weVRvVGh1bmsoY3VyLmZuLmFwcGx5KHVuZGVmaW5lZCwgYXJncyksIHRodW5rKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgIH1cbiAgICBjb3B5VG9UaHVuayhvbGRWbm9kZSwgdGh1bmspO1xufVxuZXhwb3J0cy50aHVuayA9IGZ1bmN0aW9uIHRodW5rKHNlbCwga2V5LCBmbiwgYXJncykge1xuICAgIGlmIChhcmdzID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgYXJncyA9IGZuO1xuICAgICAgICBmbiA9IGtleTtcbiAgICAgICAga2V5ID0gdW5kZWZpbmVkO1xuICAgIH1cbiAgICByZXR1cm4gaF8xLmgoc2VsLCB7XG4gICAgICAgIGtleToga2V5LFxuICAgICAgICBob29rOiB7IGluaXQ6IGluaXQsIHByZXBhdGNoOiBwcmVwYXRjaCB9LFxuICAgICAgICBmbjogZm4sXG4gICAgICAgIGFyZ3M6IGFyZ3NcbiAgICB9KTtcbn07XG5leHBvcnRzLmRlZmF1bHQgPSBleHBvcnRzLnRodW5rO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9dGh1bmsuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XG52YXIgdm5vZGVfMSA9IHJlcXVpcmUoXCIuL3Zub2RlXCIpO1xudmFyIGh0bWxkb21hcGlfMSA9IHJlcXVpcmUoXCIuL2h0bWxkb21hcGlcIik7XG5mdW5jdGlvbiB0b1ZOb2RlKG5vZGUsIGRvbUFwaSkge1xuICAgIHZhciBhcGkgPSBkb21BcGkgIT09IHVuZGVmaW5lZCA/IGRvbUFwaSA6IGh0bWxkb21hcGlfMS5kZWZhdWx0O1xuICAgIHZhciB0ZXh0O1xuICAgIGlmIChhcGkuaXNFbGVtZW50KG5vZGUpKSB7XG4gICAgICAgIHZhciBpZCA9IG5vZGUuaWQgPyAnIycgKyBub2RlLmlkIDogJyc7XG4gICAgICAgIHZhciBjbiA9IG5vZGUuZ2V0QXR0cmlidXRlKCdjbGFzcycpO1xuICAgICAgICB2YXIgYyA9IGNuID8gJy4nICsgY24uc3BsaXQoJyAnKS5qb2luKCcuJykgOiAnJztcbiAgICAgICAgdmFyIHNlbCA9IGFwaS50YWdOYW1lKG5vZGUpLnRvTG93ZXJDYXNlKCkgKyBpZCArIGM7XG4gICAgICAgIHZhciBhdHRycyA9IHt9O1xuICAgICAgICB2YXIgY2hpbGRyZW4gPSBbXTtcbiAgICAgICAgdmFyIG5hbWVfMTtcbiAgICAgICAgdmFyIGkgPSB2b2lkIDAsIG4gPSB2b2lkIDA7XG4gICAgICAgIHZhciBlbG1BdHRycyA9IG5vZGUuYXR0cmlidXRlcztcbiAgICAgICAgdmFyIGVsbUNoaWxkcmVuID0gbm9kZS5jaGlsZE5vZGVzO1xuICAgICAgICBmb3IgKGkgPSAwLCBuID0gZWxtQXR0cnMubGVuZ3RoOyBpIDwgbjsgaSsrKSB7XG4gICAgICAgICAgICBuYW1lXzEgPSBlbG1BdHRyc1tpXS5ub2RlTmFtZTtcbiAgICAgICAgICAgIGlmIChuYW1lXzEgIT09ICdpZCcgJiYgbmFtZV8xICE9PSAnY2xhc3MnKSB7XG4gICAgICAgICAgICAgICAgYXR0cnNbbmFtZV8xXSA9IGVsbUF0dHJzW2ldLm5vZGVWYWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBmb3IgKGkgPSAwLCBuID0gZWxtQ2hpbGRyZW4ubGVuZ3RoOyBpIDwgbjsgaSsrKSB7XG4gICAgICAgICAgICBjaGlsZHJlbi5wdXNoKHRvVk5vZGUoZWxtQ2hpbGRyZW5baV0pKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdm5vZGVfMS5kZWZhdWx0KHNlbCwgeyBhdHRyczogYXR0cnMgfSwgY2hpbGRyZW4sIHVuZGVmaW5lZCwgbm9kZSk7XG4gICAgfVxuICAgIGVsc2UgaWYgKGFwaS5pc1RleHQobm9kZSkpIHtcbiAgICAgICAgdGV4dCA9IGFwaS5nZXRUZXh0Q29udGVudChub2RlKTtcbiAgICAgICAgcmV0dXJuIHZub2RlXzEuZGVmYXVsdCh1bmRlZmluZWQsIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCB0ZXh0LCBub2RlKTtcbiAgICB9XG4gICAgZWxzZSBpZiAoYXBpLmlzQ29tbWVudChub2RlKSkge1xuICAgICAgICB0ZXh0ID0gYXBpLmdldFRleHRDb250ZW50KG5vZGUpO1xuICAgICAgICByZXR1cm4gdm5vZGVfMS5kZWZhdWx0KCchJywge30sIFtdLCB0ZXh0LCBub2RlKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHJldHVybiB2bm9kZV8xLmRlZmF1bHQoJycsIHt9LCBbXSwgdW5kZWZpbmVkLCB1bmRlZmluZWQpO1xuICAgIH1cbn1cbmV4cG9ydHMudG9WTm9kZSA9IHRvVk5vZGU7XG5leHBvcnRzLmRlZmF1bHQgPSB0b1ZOb2RlO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9dG92bm9kZS5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcbmZ1bmN0aW9uIHZub2RlKHNlbCwgZGF0YSwgY2hpbGRyZW4sIHRleHQsIGVsbSkge1xuICAgIHZhciBrZXkgPSBkYXRhID09PSB1bmRlZmluZWQgPyB1bmRlZmluZWQgOiBkYXRhLmtleTtcbiAgICByZXR1cm4geyBzZWw6IHNlbCwgZGF0YTogZGF0YSwgY2hpbGRyZW46IGNoaWxkcmVuLFxuICAgICAgICB0ZXh0OiB0ZXh0LCBlbG06IGVsbSwga2V5OiBrZXkgfTtcbn1cbmV4cG9ydHMudm5vZGUgPSB2bm9kZTtcbmV4cG9ydHMuZGVmYXVsdCA9IHZub2RlO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9dm5vZGUuanMubWFwIiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKCcuL2xpYi9pbmRleCcpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuXG52YXIgX3BvbnlmaWxsID0gcmVxdWlyZSgnLi9wb255ZmlsbCcpO1xuXG52YXIgX3BvbnlmaWxsMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX3BvbnlmaWxsKTtcblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgJ2RlZmF1bHQnOiBvYmogfTsgfVxuXG52YXIgcm9vdDsgLyogZ2xvYmFsIHdpbmRvdyAqL1xuXG5cbmlmICh0eXBlb2Ygc2VsZiAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgcm9vdCA9IHNlbGY7XG59IGVsc2UgaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKSB7XG4gIHJvb3QgPSB3aW5kb3c7XG59IGVsc2UgaWYgKHR5cGVvZiBnbG9iYWwgIT09ICd1bmRlZmluZWQnKSB7XG4gIHJvb3QgPSBnbG9iYWw7XG59IGVsc2UgaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnKSB7XG4gIHJvb3QgPSBtb2R1bGU7XG59IGVsc2Uge1xuICByb290ID0gRnVuY3Rpb24oJ3JldHVybiB0aGlzJykoKTtcbn1cblxudmFyIHJlc3VsdCA9ICgwLCBfcG9ueWZpbGwyWydkZWZhdWx0J10pKHJvb3QpO1xuZXhwb3J0c1snZGVmYXVsdCddID0gcmVzdWx0OyIsIid1c2Ugc3RyaWN0JztcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG5cdHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHNbJ2RlZmF1bHQnXSA9IHN5bWJvbE9ic2VydmFibGVQb255ZmlsbDtcbmZ1bmN0aW9uIHN5bWJvbE9ic2VydmFibGVQb255ZmlsbChyb290KSB7XG5cdHZhciByZXN1bHQ7XG5cdHZhciBfU3ltYm9sID0gcm9vdC5TeW1ib2w7XG5cblx0aWYgKHR5cGVvZiBfU3ltYm9sID09PSAnZnVuY3Rpb24nKSB7XG5cdFx0aWYgKF9TeW1ib2wub2JzZXJ2YWJsZSkge1xuXHRcdFx0cmVzdWx0ID0gX1N5bWJvbC5vYnNlcnZhYmxlO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXN1bHQgPSBfU3ltYm9sKCdvYnNlcnZhYmxlJyk7XG5cdFx0XHRfU3ltYm9sLm9ic2VydmFibGUgPSByZXN1bHQ7XG5cdFx0fVxuXHR9IGVsc2Uge1xuXHRcdHJlc3VsdCA9ICdAQG9ic2VydmFibGUnO1xuXHR9XG5cblx0cmV0dXJuIHJlc3VsdDtcbn07IiwiJ3VzZSBzdHJpY3QnO1xuXG5leHBvcnRzLl9fZXNNb2R1bGUgPSB0cnVlO1xuXG52YXIgX3R5cGVvZiA9IHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiB0eXBlb2YgU3ltYm9sLml0ZXJhdG9yID09PSBcInN5bWJvbFwiID8gZnVuY3Rpb24gKG9iaikgeyByZXR1cm4gdHlwZW9mIG9iajsgfSA6IGZ1bmN0aW9uIChvYmopIHsgcmV0dXJuIG9iaiAmJiB0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgb2JqLmNvbnN0cnVjdG9yID09PSBTeW1ib2wgJiYgb2JqICE9PSBTeW1ib2wucHJvdG90eXBlID8gXCJzeW1ib2xcIiA6IHR5cGVvZiBvYmo7IH07XG5cbnZhciB2YWx1ZUVxdWFsID0gZnVuY3Rpb24gdmFsdWVFcXVhbChhLCBiKSB7XG4gIGlmIChhID09PSBiKSByZXR1cm4gdHJ1ZTtcblxuICBpZiAoYSA9PSBudWxsIHx8IGIgPT0gbnVsbCkgcmV0dXJuIGZhbHNlO1xuXG4gIGlmIChBcnJheS5pc0FycmF5KGEpKSByZXR1cm4gQXJyYXkuaXNBcnJheShiKSAmJiBhLmxlbmd0aCA9PT0gYi5sZW5ndGggJiYgYS5ldmVyeShmdW5jdGlvbiAoaXRlbSwgaW5kZXgpIHtcbiAgICByZXR1cm4gdmFsdWVFcXVhbChpdGVtLCBiW2luZGV4XSk7XG4gIH0pO1xuXG4gIHZhciBhVHlwZSA9IHR5cGVvZiBhID09PSAndW5kZWZpbmVkJyA/ICd1bmRlZmluZWQnIDogX3R5cGVvZihhKTtcbiAgdmFyIGJUeXBlID0gdHlwZW9mIGIgPT09ICd1bmRlZmluZWQnID8gJ3VuZGVmaW5lZCcgOiBfdHlwZW9mKGIpO1xuXG4gIGlmIChhVHlwZSAhPT0gYlR5cGUpIHJldHVybiBmYWxzZTtcblxuICBpZiAoYVR5cGUgPT09ICdvYmplY3QnKSB7XG4gICAgdmFyIGFWYWx1ZSA9IGEudmFsdWVPZigpO1xuICAgIHZhciBiVmFsdWUgPSBiLnZhbHVlT2YoKTtcblxuICAgIGlmIChhVmFsdWUgIT09IGEgfHwgYlZhbHVlICE9PSBiKSByZXR1cm4gdmFsdWVFcXVhbChhVmFsdWUsIGJWYWx1ZSk7XG5cbiAgICB2YXIgYUtleXMgPSBPYmplY3Qua2V5cyhhKTtcbiAgICB2YXIgYktleXMgPSBPYmplY3Qua2V5cyhiKTtcblxuICAgIGlmIChhS2V5cy5sZW5ndGggIT09IGJLZXlzLmxlbmd0aCkgcmV0dXJuIGZhbHNlO1xuXG4gICAgcmV0dXJuIGFLZXlzLmV2ZXJ5KGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgIHJldHVybiB2YWx1ZUVxdWFsKGFba2V5XSwgYltrZXldKTtcbiAgICB9KTtcbiAgfVxuXG4gIHJldHVybiBmYWxzZTtcbn07XG5cbmV4cG9ydHMuZGVmYXVsdCA9IHZhbHVlRXF1YWw7IiwiLyoqXG4gKiBDb3B5cmlnaHQgMjAxNC0yMDE1LCBGYWNlYm9vaywgSW5jLlxuICogQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqXG4gKiBUaGlzIHNvdXJjZSBjb2RlIGlzIGxpY2Vuc2VkIHVuZGVyIHRoZSBCU0Qtc3R5bGUgbGljZW5zZSBmb3VuZCBpbiB0aGVcbiAqIExJQ0VOU0UgZmlsZSBpbiB0aGUgcm9vdCBkaXJlY3Rvcnkgb2YgdGhpcyBzb3VyY2UgdHJlZS4gQW4gYWRkaXRpb25hbCBncmFudFxuICogb2YgcGF0ZW50IHJpZ2h0cyBjYW4gYmUgZm91bmQgaW4gdGhlIFBBVEVOVFMgZmlsZSBpbiB0aGUgc2FtZSBkaXJlY3RvcnkuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIFNpbWlsYXIgdG8gaW52YXJpYW50IGJ1dCBvbmx5IGxvZ3MgYSB3YXJuaW5nIGlmIHRoZSBjb25kaXRpb24gaXMgbm90IG1ldC5cbiAqIFRoaXMgY2FuIGJlIHVzZWQgdG8gbG9nIGlzc3VlcyBpbiBkZXZlbG9wbWVudCBlbnZpcm9ubWVudHMgaW4gY3JpdGljYWxcbiAqIHBhdGhzLiBSZW1vdmluZyB0aGUgbG9nZ2luZyBjb2RlIGZvciBwcm9kdWN0aW9uIGVudmlyb25tZW50cyB3aWxsIGtlZXAgdGhlXG4gKiBzYW1lIGxvZ2ljIGFuZCBmb2xsb3cgdGhlIHNhbWUgY29kZSBwYXRocy5cbiAqL1xuXG52YXIgd2FybmluZyA9IGZ1bmN0aW9uKCkge307XG5cbmlmIChwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ3Byb2R1Y3Rpb24nKSB7XG4gIHdhcm5pbmcgPSBmdW5jdGlvbihjb25kaXRpb24sIGZvcm1hdCwgYXJncykge1xuICAgIHZhciBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgIGFyZ3MgPSBuZXcgQXJyYXkobGVuID4gMiA/IGxlbiAtIDIgOiAwKTtcbiAgICBmb3IgKHZhciBrZXkgPSAyOyBrZXkgPCBsZW47IGtleSsrKSB7XG4gICAgICBhcmdzW2tleSAtIDJdID0gYXJndW1lbnRzW2tleV07XG4gICAgfVxuICAgIGlmIChmb3JtYXQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAnYHdhcm5pbmcoY29uZGl0aW9uLCBmb3JtYXQsIC4uLmFyZ3MpYCByZXF1aXJlcyBhIHdhcm5pbmcgJyArXG4gICAgICAgICdtZXNzYWdlIGFyZ3VtZW50J1xuICAgICAgKTtcbiAgICB9XG5cbiAgICBpZiAoZm9ybWF0Lmxlbmd0aCA8IDEwIHx8ICgvXltzXFxXXSokLykudGVzdChmb3JtYXQpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICdUaGUgd2FybmluZyBmb3JtYXQgc2hvdWxkIGJlIGFibGUgdG8gdW5pcXVlbHkgaWRlbnRpZnkgdGhpcyAnICtcbiAgICAgICAgJ3dhcm5pbmcuIFBsZWFzZSwgdXNlIGEgbW9yZSBkZXNjcmlwdGl2ZSBmb3JtYXQgdGhhbjogJyArIGZvcm1hdFxuICAgICAgKTtcbiAgICB9XG5cbiAgICBpZiAoIWNvbmRpdGlvbikge1xuICAgICAgdmFyIGFyZ0luZGV4ID0gMDtcbiAgICAgIHZhciBtZXNzYWdlID0gJ1dhcm5pbmc6ICcgK1xuICAgICAgICBmb3JtYXQucmVwbGFjZSgvJXMvZywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgcmV0dXJuIGFyZ3NbYXJnSW5kZXgrK107XG4gICAgICAgIH0pO1xuICAgICAgaWYgKHR5cGVvZiBjb25zb2xlICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICBjb25zb2xlLmVycm9yKG1lc3NhZ2UpO1xuICAgICAgfVxuICAgICAgdHJ5IHtcbiAgICAgICAgLy8gVGhpcyBlcnJvciB3YXMgdGhyb3duIGFzIGEgY29udmVuaWVuY2Ugc28gdGhhdCB5b3UgY2FuIHVzZSB0aGlzIHN0YWNrXG4gICAgICAgIC8vIHRvIGZpbmQgdGhlIGNhbGxzaXRlIHRoYXQgY2F1c2VkIHRoaXMgd2FybmluZyB0byBmaXJlLlxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZSk7XG4gICAgICB9IGNhdGNoKHgpIHt9XG4gICAgfVxuICB9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHdhcm5pbmc7XG4iLCJcInVzZSBzdHJpY3RcIjtcbnZhciBpbmRleF8xID0gcmVxdWlyZShcIi4uL2luZGV4XCIpO1xudmFyIGVtcHR5ID0ge307XG52YXIgRHJvcFJlcGVhdHNPcGVyYXRvciA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gRHJvcFJlcGVhdHNPcGVyYXRvcihpbnMsIGZuKSB7XG4gICAgICAgIHRoaXMuaW5zID0gaW5zO1xuICAgICAgICB0aGlzLmZuID0gZm47XG4gICAgICAgIHRoaXMudHlwZSA9ICdkcm9wUmVwZWF0cyc7XG4gICAgICAgIHRoaXMub3V0ID0gbnVsbDtcbiAgICAgICAgdGhpcy52ID0gZW1wdHk7XG4gICAgfVxuICAgIERyb3BSZXBlYXRzT3BlcmF0b3IucHJvdG90eXBlLl9zdGFydCA9IGZ1bmN0aW9uIChvdXQpIHtcbiAgICAgICAgdGhpcy5vdXQgPSBvdXQ7XG4gICAgICAgIHRoaXMuaW5zLl9hZGQodGhpcyk7XG4gICAgfTtcbiAgICBEcm9wUmVwZWF0c09wZXJhdG9yLnByb3RvdHlwZS5fc3RvcCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5pbnMuX3JlbW92ZSh0aGlzKTtcbiAgICAgICAgdGhpcy5vdXQgPSBudWxsO1xuICAgICAgICB0aGlzLnYgPSBlbXB0eTtcbiAgICB9O1xuICAgIERyb3BSZXBlYXRzT3BlcmF0b3IucHJvdG90eXBlLmlzRXEgPSBmdW5jdGlvbiAoeCwgeSkge1xuICAgICAgICByZXR1cm4gdGhpcy5mbiA/IHRoaXMuZm4oeCwgeSkgOiB4ID09PSB5O1xuICAgIH07XG4gICAgRHJvcFJlcGVhdHNPcGVyYXRvci5wcm90b3R5cGUuX24gPSBmdW5jdGlvbiAodCkge1xuICAgICAgICB2YXIgdSA9IHRoaXMub3V0O1xuICAgICAgICBpZiAoIXUpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIHZhciB2ID0gdGhpcy52O1xuICAgICAgICBpZiAodiAhPT0gZW1wdHkgJiYgdGhpcy5pc0VxKHQsIHYpKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB0aGlzLnYgPSB0O1xuICAgICAgICB1Ll9uKHQpO1xuICAgIH07XG4gICAgRHJvcFJlcGVhdHNPcGVyYXRvci5wcm90b3R5cGUuX2UgPSBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgIHZhciB1ID0gdGhpcy5vdXQ7XG4gICAgICAgIGlmICghdSlcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgdS5fZShlcnIpO1xuICAgIH07XG4gICAgRHJvcFJlcGVhdHNPcGVyYXRvci5wcm90b3R5cGUuX2MgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciB1ID0gdGhpcy5vdXQ7XG4gICAgICAgIGlmICghdSlcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgdS5fYygpO1xuICAgIH07XG4gICAgcmV0dXJuIERyb3BSZXBlYXRzT3BlcmF0b3I7XG59KCkpO1xuZXhwb3J0cy5Ecm9wUmVwZWF0c09wZXJhdG9yID0gRHJvcFJlcGVhdHNPcGVyYXRvcjtcbi8qKlxuICogRHJvcHMgY29uc2VjdXRpdmUgZHVwbGljYXRlIHZhbHVlcyBpbiBhIHN0cmVhbS5cbiAqXG4gKiBNYXJibGUgZGlhZ3JhbTpcbiAqXG4gKiBgYGB0ZXh0XG4gKiAtLTEtLTItLTEtLTEtLTEtLTItLTMtLTQtLTMtLTN8XG4gKiAgICAgZHJvcFJlcGVhdHNcbiAqIC0tMS0tMi0tMS0tLS0tLS0tMi0tMy0tNC0tMy0tLXxcbiAqIGBgYFxuICpcbiAqIEV4YW1wbGU6XG4gKlxuICogYGBganNcbiAqIGltcG9ydCBkcm9wUmVwZWF0cyBmcm9tICd4c3RyZWFtL2V4dHJhL2Ryb3BSZXBlYXRzJ1xuICpcbiAqIGNvbnN0IHN0cmVhbSA9IHhzLm9mKDEsIDIsIDEsIDEsIDEsIDIsIDMsIDQsIDMsIDMpXG4gKiAgIC5jb21wb3NlKGRyb3BSZXBlYXRzKCkpXG4gKlxuICogc3RyZWFtLmFkZExpc3RlbmVyKHtcbiAqICAgbmV4dDogaSA9PiBjb25zb2xlLmxvZyhpKSxcbiAqICAgZXJyb3I6IGVyciA9PiBjb25zb2xlLmVycm9yKGVyciksXG4gKiAgIGNvbXBsZXRlOiAoKSA9PiBjb25zb2xlLmxvZygnY29tcGxldGVkJylcbiAqIH0pXG4gKiBgYGBcbiAqXG4gKiBgYGB0ZXh0XG4gKiA+IDFcbiAqID4gMlxuICogPiAxXG4gKiA+IDJcbiAqID4gM1xuICogPiA0XG4gKiA+IDNcbiAqID4gY29tcGxldGVkXG4gKiBgYGBcbiAqXG4gKiBFeGFtcGxlIHdpdGggYSBjdXN0b20gaXNFcXVhbCBmdW5jdGlvbjpcbiAqXG4gKiBgYGBqc1xuICogaW1wb3J0IGRyb3BSZXBlYXRzIGZyb20gJ3hzdHJlYW0vZXh0cmEvZHJvcFJlcGVhdHMnXG4gKlxuICogY29uc3Qgc3RyZWFtID0geHMub2YoJ2EnLCAnYicsICdhJywgJ0EnLCAnQicsICdiJylcbiAqICAgLmNvbXBvc2UoZHJvcFJlcGVhdHMoKHgsIHkpID0+IHgudG9Mb3dlckNhc2UoKSA9PT0geS50b0xvd2VyQ2FzZSgpKSlcbiAqXG4gKiBzdHJlYW0uYWRkTGlzdGVuZXIoe1xuICogICBuZXh0OiBpID0+IGNvbnNvbGUubG9nKGkpLFxuICogICBlcnJvcjogZXJyID0+IGNvbnNvbGUuZXJyb3IoZXJyKSxcbiAqICAgY29tcGxldGU6ICgpID0+IGNvbnNvbGUubG9nKCdjb21wbGV0ZWQnKVxuICogfSlcbiAqIGBgYFxuICpcbiAqIGBgYHRleHRcbiAqID4gYVxuICogPiBiXG4gKiA+IGFcbiAqID4gQlxuICogPiBjb21wbGV0ZWRcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGlzRXF1YWwgQW4gb3B0aW9uYWwgZnVuY3Rpb24gb2YgdHlwZVxuICogYCh4OiBULCB5OiBUKSA9PiBib29sZWFuYCB0aGF0IHRha2VzIGFuIGV2ZW50IGZyb20gdGhlIGlucHV0IHN0cmVhbSBhbmRcbiAqIGNoZWNrcyBpZiBpdCBpcyBlcXVhbCB0byBwcmV2aW91cyBldmVudCwgYnkgcmV0dXJuaW5nIGEgYm9vbGVhbi5cbiAqIEByZXR1cm4ge1N0cmVhbX1cbiAqL1xuZnVuY3Rpb24gZHJvcFJlcGVhdHMoaXNFcXVhbCkge1xuICAgIGlmIChpc0VxdWFsID09PSB2b2lkIDApIHsgaXNFcXVhbCA9IHZvaWQgMDsgfVxuICAgIHJldHVybiBmdW5jdGlvbiBkcm9wUmVwZWF0c09wZXJhdG9yKGlucykge1xuICAgICAgICByZXR1cm4gbmV3IGluZGV4XzEuU3RyZWFtKG5ldyBEcm9wUmVwZWF0c09wZXJhdG9yKGlucywgaXNFcXVhbCkpO1xuICAgIH07XG59XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XG5leHBvcnRzLmRlZmF1bHQgPSBkcm9wUmVwZWF0cztcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWRyb3BSZXBlYXRzLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xudmFyIF9fZXh0ZW5kcyA9ICh0aGlzICYmIHRoaXMuX19leHRlbmRzKSB8fCBmdW5jdGlvbiAoZCwgYikge1xuICAgIGZvciAodmFyIHAgaW4gYikgaWYgKGIuaGFzT3duUHJvcGVydHkocCkpIGRbcF0gPSBiW3BdO1xuICAgIGZ1bmN0aW9uIF9fKCkgeyB0aGlzLmNvbnN0cnVjdG9yID0gZDsgfVxuICAgIGQucHJvdG90eXBlID0gYiA9PT0gbnVsbCA/IE9iamVjdC5jcmVhdGUoYikgOiAoX18ucHJvdG90eXBlID0gYi5wcm90b3R5cGUsIG5ldyBfXygpKTtcbn07XG52YXIgc3ltYm9sX29ic2VydmFibGVfMSA9IHJlcXVpcmUoXCJzeW1ib2wtb2JzZXJ2YWJsZVwiKTtcbnZhciBOTyA9IHt9O1xuZXhwb3J0cy5OTyA9IE5PO1xuZnVuY3Rpb24gbm9vcCgpIHsgfVxuZnVuY3Rpb24gY3AoYSkge1xuICAgIHZhciBsID0gYS5sZW5ndGg7XG4gICAgdmFyIGIgPSBBcnJheShsKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGw7ICsraSlcbiAgICAgICAgYltpXSA9IGFbaV07XG4gICAgcmV0dXJuIGI7XG59XG5mdW5jdGlvbiBhbmQoZjEsIGYyKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIGFuZEZuKHQpIHtcbiAgICAgICAgcmV0dXJuIGYxKHQpICYmIGYyKHQpO1xuICAgIH07XG59XG5mdW5jdGlvbiBfdHJ5KGMsIHQsIHUpIHtcbiAgICB0cnkge1xuICAgICAgICByZXR1cm4gYy5mKHQpO1xuICAgIH1cbiAgICBjYXRjaCAoZSkge1xuICAgICAgICB1Ll9lKGUpO1xuICAgICAgICByZXR1cm4gTk87XG4gICAgfVxufVxudmFyIE5PX0lMID0ge1xuICAgIF9uOiBub29wLFxuICAgIF9lOiBub29wLFxuICAgIF9jOiBub29wLFxufTtcbmV4cG9ydHMuTk9fSUwgPSBOT19JTDtcbi8vIG11dGF0ZXMgdGhlIGlucHV0XG5mdW5jdGlvbiBpbnRlcm5hbGl6ZVByb2R1Y2VyKHByb2R1Y2VyKSB7XG4gICAgcHJvZHVjZXIuX3N0YXJ0ID0gZnVuY3Rpb24gX3N0YXJ0KGlsKSB7XG4gICAgICAgIGlsLm5leHQgPSBpbC5fbjtcbiAgICAgICAgaWwuZXJyb3IgPSBpbC5fZTtcbiAgICAgICAgaWwuY29tcGxldGUgPSBpbC5fYztcbiAgICAgICAgdGhpcy5zdGFydChpbCk7XG4gICAgfTtcbiAgICBwcm9kdWNlci5fc3RvcCA9IHByb2R1Y2VyLnN0b3A7XG59XG52YXIgU3RyZWFtU3ViID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBTdHJlYW1TdWIoX3N0cmVhbSwgX2xpc3RlbmVyKSB7XG4gICAgICAgIHRoaXMuX3N0cmVhbSA9IF9zdHJlYW07XG4gICAgICAgIHRoaXMuX2xpc3RlbmVyID0gX2xpc3RlbmVyO1xuICAgIH1cbiAgICBTdHJlYW1TdWIucHJvdG90eXBlLnVuc3Vic2NyaWJlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl9zdHJlYW0ucmVtb3ZlTGlzdGVuZXIodGhpcy5fbGlzdGVuZXIpO1xuICAgIH07XG4gICAgcmV0dXJuIFN0cmVhbVN1Yjtcbn0oKSk7XG52YXIgT2JzZXJ2ZXIgPSAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIE9ic2VydmVyKF9saXN0ZW5lcikge1xuICAgICAgICB0aGlzLl9saXN0ZW5lciA9IF9saXN0ZW5lcjtcbiAgICB9XG4gICAgT2JzZXJ2ZXIucHJvdG90eXBlLm5leHQgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgdGhpcy5fbGlzdGVuZXIuX24odmFsdWUpO1xuICAgIH07XG4gICAgT2JzZXJ2ZXIucHJvdG90eXBlLmVycm9yID0gZnVuY3Rpb24gKGVycikge1xuICAgICAgICB0aGlzLl9saXN0ZW5lci5fZShlcnIpO1xuICAgIH07XG4gICAgT2JzZXJ2ZXIucHJvdG90eXBlLmNvbXBsZXRlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl9saXN0ZW5lci5fYygpO1xuICAgIH07XG4gICAgcmV0dXJuIE9ic2VydmVyO1xufSgpKTtcbnZhciBGcm9tT2JzZXJ2YWJsZSA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gRnJvbU9ic2VydmFibGUob2JzZXJ2YWJsZSkge1xuICAgICAgICB0aGlzLnR5cGUgPSAnZnJvbU9ic2VydmFibGUnO1xuICAgICAgICB0aGlzLmlucyA9IG9ic2VydmFibGU7XG4gICAgICAgIHRoaXMuYWN0aXZlID0gZmFsc2U7XG4gICAgfVxuICAgIEZyb21PYnNlcnZhYmxlLnByb3RvdHlwZS5fc3RhcnQgPSBmdW5jdGlvbiAob3V0KSB7XG4gICAgICAgIHRoaXMub3V0ID0gb3V0O1xuICAgICAgICB0aGlzLmFjdGl2ZSA9IHRydWU7XG4gICAgICAgIHRoaXMuX3N1YiA9IHRoaXMuaW5zLnN1YnNjcmliZShuZXcgT2JzZXJ2ZXIob3V0KSk7XG4gICAgICAgIGlmICghdGhpcy5hY3RpdmUpXG4gICAgICAgICAgICB0aGlzLl9zdWIudW5zdWJzY3JpYmUoKTtcbiAgICB9O1xuICAgIEZyb21PYnNlcnZhYmxlLnByb3RvdHlwZS5fc3RvcCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKHRoaXMuX3N1YilcbiAgICAgICAgICAgIHRoaXMuX3N1Yi51bnN1YnNjcmliZSgpO1xuICAgICAgICB0aGlzLmFjdGl2ZSA9IGZhbHNlO1xuICAgIH07XG4gICAgcmV0dXJuIEZyb21PYnNlcnZhYmxlO1xufSgpKTtcbnZhciBNZXJnZSA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gTWVyZ2UoaW5zQXJyKSB7XG4gICAgICAgIHRoaXMudHlwZSA9ICdtZXJnZSc7XG4gICAgICAgIHRoaXMuaW5zQXJyID0gaW5zQXJyO1xuICAgICAgICB0aGlzLm91dCA9IE5PO1xuICAgICAgICB0aGlzLmFjID0gMDtcbiAgICB9XG4gICAgTWVyZ2UucHJvdG90eXBlLl9zdGFydCA9IGZ1bmN0aW9uIChvdXQpIHtcbiAgICAgICAgdGhpcy5vdXQgPSBvdXQ7XG4gICAgICAgIHZhciBzID0gdGhpcy5pbnNBcnI7XG4gICAgICAgIHZhciBMID0gcy5sZW5ndGg7XG4gICAgICAgIHRoaXMuYWMgPSBMO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IEw7IGkrKylcbiAgICAgICAgICAgIHNbaV0uX2FkZCh0aGlzKTtcbiAgICB9O1xuICAgIE1lcmdlLnByb3RvdHlwZS5fc3RvcCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHMgPSB0aGlzLmluc0FycjtcbiAgICAgICAgdmFyIEwgPSBzLmxlbmd0aDtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBMOyBpKyspXG4gICAgICAgICAgICBzW2ldLl9yZW1vdmUodGhpcyk7XG4gICAgICAgIHRoaXMub3V0ID0gTk87XG4gICAgfTtcbiAgICBNZXJnZS5wcm90b3R5cGUuX24gPSBmdW5jdGlvbiAodCkge1xuICAgICAgICB2YXIgdSA9IHRoaXMub3V0O1xuICAgICAgICBpZiAodSA9PT0gTk8pXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIHUuX24odCk7XG4gICAgfTtcbiAgICBNZXJnZS5wcm90b3R5cGUuX2UgPSBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgIHZhciB1ID0gdGhpcy5vdXQ7XG4gICAgICAgIGlmICh1ID09PSBOTylcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgdS5fZShlcnIpO1xuICAgIH07XG4gICAgTWVyZ2UucHJvdG90eXBlLl9jID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoLS10aGlzLmFjIDw9IDApIHtcbiAgICAgICAgICAgIHZhciB1ID0gdGhpcy5vdXQ7XG4gICAgICAgICAgICBpZiAodSA9PT0gTk8pXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgdS5fYygpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICByZXR1cm4gTWVyZ2U7XG59KCkpO1xudmFyIENvbWJpbmVMaXN0ZW5lciA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gQ29tYmluZUxpc3RlbmVyKGksIG91dCwgcCkge1xuICAgICAgICB0aGlzLmkgPSBpO1xuICAgICAgICB0aGlzLm91dCA9IG91dDtcbiAgICAgICAgdGhpcy5wID0gcDtcbiAgICAgICAgcC5pbHMucHVzaCh0aGlzKTtcbiAgICB9XG4gICAgQ29tYmluZUxpc3RlbmVyLnByb3RvdHlwZS5fbiA9IGZ1bmN0aW9uICh0KSB7XG4gICAgICAgIHZhciBwID0gdGhpcy5wLCBvdXQgPSB0aGlzLm91dDtcbiAgICAgICAgaWYgKG91dCA9PT0gTk8pXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIGlmIChwLnVwKHQsIHRoaXMuaSkpIHtcbiAgICAgICAgICAgIHZhciBhID0gcC52YWxzO1xuICAgICAgICAgICAgdmFyIGwgPSBhLmxlbmd0aDtcbiAgICAgICAgICAgIHZhciBiID0gQXJyYXkobCk7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGw7ICsraSlcbiAgICAgICAgICAgICAgICBiW2ldID0gYVtpXTtcbiAgICAgICAgICAgIG91dC5fbihiKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgQ29tYmluZUxpc3RlbmVyLnByb3RvdHlwZS5fZSA9IGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgdmFyIG91dCA9IHRoaXMub3V0O1xuICAgICAgICBpZiAob3V0ID09PSBOTylcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgb3V0Ll9lKGVycik7XG4gICAgfTtcbiAgICBDb21iaW5lTGlzdGVuZXIucHJvdG90eXBlLl9jID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgcCA9IHRoaXMucDtcbiAgICAgICAgaWYgKHAub3V0ID09PSBOTylcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgaWYgKC0tcC5OYyA9PT0gMClcbiAgICAgICAgICAgIHAub3V0Ll9jKCk7XG4gICAgfTtcbiAgICByZXR1cm4gQ29tYmluZUxpc3RlbmVyO1xufSgpKTtcbnZhciBDb21iaW5lID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBDb21iaW5lKGluc0Fycikge1xuICAgICAgICB0aGlzLnR5cGUgPSAnY29tYmluZSc7XG4gICAgICAgIHRoaXMuaW5zQXJyID0gaW5zQXJyO1xuICAgICAgICB0aGlzLm91dCA9IE5PO1xuICAgICAgICB0aGlzLmlscyA9IFtdO1xuICAgICAgICB0aGlzLk5jID0gdGhpcy5ObiA9IDA7XG4gICAgICAgIHRoaXMudmFscyA9IFtdO1xuICAgIH1cbiAgICBDb21iaW5lLnByb3RvdHlwZS51cCA9IGZ1bmN0aW9uICh0LCBpKSB7XG4gICAgICAgIHZhciB2ID0gdGhpcy52YWxzW2ldO1xuICAgICAgICB2YXIgTm4gPSAhdGhpcy5ObiA/IDAgOiB2ID09PSBOTyA/IC0tdGhpcy5ObiA6IHRoaXMuTm47XG4gICAgICAgIHRoaXMudmFsc1tpXSA9IHQ7XG4gICAgICAgIHJldHVybiBObiA9PT0gMDtcbiAgICB9O1xuICAgIENvbWJpbmUucHJvdG90eXBlLl9zdGFydCA9IGZ1bmN0aW9uIChvdXQpIHtcbiAgICAgICAgdGhpcy5vdXQgPSBvdXQ7XG4gICAgICAgIHZhciBzID0gdGhpcy5pbnNBcnI7XG4gICAgICAgIHZhciBuID0gdGhpcy5OYyA9IHRoaXMuTm4gPSBzLmxlbmd0aDtcbiAgICAgICAgdmFyIHZhbHMgPSB0aGlzLnZhbHMgPSBuZXcgQXJyYXkobik7XG4gICAgICAgIGlmIChuID09PSAwKSB7XG4gICAgICAgICAgICBvdXQuX24oW10pO1xuICAgICAgICAgICAgb3V0Ll9jKCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG47IGkrKykge1xuICAgICAgICAgICAgICAgIHZhbHNbaV0gPSBOTztcbiAgICAgICAgICAgICAgICBzW2ldLl9hZGQobmV3IENvbWJpbmVMaXN0ZW5lcihpLCBvdXQsIHRoaXMpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG4gICAgQ29tYmluZS5wcm90b3R5cGUuX3N0b3AgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBzID0gdGhpcy5pbnNBcnI7XG4gICAgICAgIHZhciBuID0gcy5sZW5ndGg7XG4gICAgICAgIHZhciBpbHMgPSB0aGlzLmlscztcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBuOyBpKyspXG4gICAgICAgICAgICBzW2ldLl9yZW1vdmUoaWxzW2ldKTtcbiAgICAgICAgdGhpcy5vdXQgPSBOTztcbiAgICAgICAgdGhpcy5pbHMgPSBbXTtcbiAgICAgICAgdGhpcy52YWxzID0gW107XG4gICAgfTtcbiAgICByZXR1cm4gQ29tYmluZTtcbn0oKSk7XG52YXIgRnJvbUFycmF5ID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBGcm9tQXJyYXkoYSkge1xuICAgICAgICB0aGlzLnR5cGUgPSAnZnJvbUFycmF5JztcbiAgICAgICAgdGhpcy5hID0gYTtcbiAgICB9XG4gICAgRnJvbUFycmF5LnByb3RvdHlwZS5fc3RhcnQgPSBmdW5jdGlvbiAob3V0KSB7XG4gICAgICAgIHZhciBhID0gdGhpcy5hO1xuICAgICAgICBmb3IgKHZhciBpID0gMCwgbiA9IGEubGVuZ3RoOyBpIDwgbjsgaSsrKVxuICAgICAgICAgICAgb3V0Ll9uKGFbaV0pO1xuICAgICAgICBvdXQuX2MoKTtcbiAgICB9O1xuICAgIEZyb21BcnJheS5wcm90b3R5cGUuX3N0b3AgPSBmdW5jdGlvbiAoKSB7XG4gICAgfTtcbiAgICByZXR1cm4gRnJvbUFycmF5O1xufSgpKTtcbnZhciBGcm9tUHJvbWlzZSA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gRnJvbVByb21pc2UocCkge1xuICAgICAgICB0aGlzLnR5cGUgPSAnZnJvbVByb21pc2UnO1xuICAgICAgICB0aGlzLm9uID0gZmFsc2U7XG4gICAgICAgIHRoaXMucCA9IHA7XG4gICAgfVxuICAgIEZyb21Qcm9taXNlLnByb3RvdHlwZS5fc3RhcnQgPSBmdW5jdGlvbiAob3V0KSB7XG4gICAgICAgIHZhciBwcm9kID0gdGhpcztcbiAgICAgICAgdGhpcy5vbiA9IHRydWU7XG4gICAgICAgIHRoaXMucC50aGVuKGZ1bmN0aW9uICh2KSB7XG4gICAgICAgICAgICBpZiAocHJvZC5vbikge1xuICAgICAgICAgICAgICAgIG91dC5fbih2KTtcbiAgICAgICAgICAgICAgICBvdXQuX2MoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgIG91dC5fZShlKTtcbiAgICAgICAgfSkudGhlbihub29wLCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHsgdGhyb3cgZXJyOyB9KTtcbiAgICAgICAgfSk7XG4gICAgfTtcbiAgICBGcm9tUHJvbWlzZS5wcm90b3R5cGUuX3N0b3AgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMub24gPSBmYWxzZTtcbiAgICB9O1xuICAgIHJldHVybiBGcm9tUHJvbWlzZTtcbn0oKSk7XG52YXIgUGVyaW9kaWMgPSAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIFBlcmlvZGljKHBlcmlvZCkge1xuICAgICAgICB0aGlzLnR5cGUgPSAncGVyaW9kaWMnO1xuICAgICAgICB0aGlzLnBlcmlvZCA9IHBlcmlvZDtcbiAgICAgICAgdGhpcy5pbnRlcnZhbElEID0gLTE7XG4gICAgICAgIHRoaXMuaSA9IDA7XG4gICAgfVxuICAgIFBlcmlvZGljLnByb3RvdHlwZS5fc3RhcnQgPSBmdW5jdGlvbiAob3V0KSB7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgZnVuY3Rpb24gaW50ZXJ2YWxIYW5kbGVyKCkgeyBvdXQuX24oc2VsZi5pKyspOyB9XG4gICAgICAgIHRoaXMuaW50ZXJ2YWxJRCA9IHNldEludGVydmFsKGludGVydmFsSGFuZGxlciwgdGhpcy5wZXJpb2QpO1xuICAgIH07XG4gICAgUGVyaW9kaWMucHJvdG90eXBlLl9zdG9wID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAodGhpcy5pbnRlcnZhbElEICE9PSAtMSlcbiAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwodGhpcy5pbnRlcnZhbElEKTtcbiAgICAgICAgdGhpcy5pbnRlcnZhbElEID0gLTE7XG4gICAgICAgIHRoaXMuaSA9IDA7XG4gICAgfTtcbiAgICByZXR1cm4gUGVyaW9kaWM7XG59KCkpO1xudmFyIERlYnVnID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBEZWJ1ZyhpbnMsIGFyZykge1xuICAgICAgICB0aGlzLnR5cGUgPSAnZGVidWcnO1xuICAgICAgICB0aGlzLmlucyA9IGlucztcbiAgICAgICAgdGhpcy5vdXQgPSBOTztcbiAgICAgICAgdGhpcy5zID0gbm9vcDtcbiAgICAgICAgdGhpcy5sID0gJyc7XG4gICAgICAgIGlmICh0eXBlb2YgYXJnID09PSAnc3RyaW5nJylcbiAgICAgICAgICAgIHRoaXMubCA9IGFyZztcbiAgICAgICAgZWxzZSBpZiAodHlwZW9mIGFyZyA9PT0gJ2Z1bmN0aW9uJylcbiAgICAgICAgICAgIHRoaXMucyA9IGFyZztcbiAgICB9XG4gICAgRGVidWcucHJvdG90eXBlLl9zdGFydCA9IGZ1bmN0aW9uIChvdXQpIHtcbiAgICAgICAgdGhpcy5vdXQgPSBvdXQ7XG4gICAgICAgIHRoaXMuaW5zLl9hZGQodGhpcyk7XG4gICAgfTtcbiAgICBEZWJ1Zy5wcm90b3R5cGUuX3N0b3AgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuaW5zLl9yZW1vdmUodGhpcyk7XG4gICAgICAgIHRoaXMub3V0ID0gTk87XG4gICAgfTtcbiAgICBEZWJ1Zy5wcm90b3R5cGUuX24gPSBmdW5jdGlvbiAodCkge1xuICAgICAgICB2YXIgdSA9IHRoaXMub3V0O1xuICAgICAgICBpZiAodSA9PT0gTk8pXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIHZhciBzID0gdGhpcy5zLCBsID0gdGhpcy5sO1xuICAgICAgICBpZiAocyAhPT0gbm9vcCkge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBzKHQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICB1Ll9lKGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGwpXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhsICsgJzonLCB0KTtcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgY29uc29sZS5sb2codCk7XG4gICAgICAgIHUuX24odCk7XG4gICAgfTtcbiAgICBEZWJ1Zy5wcm90b3R5cGUuX2UgPSBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgIHZhciB1ID0gdGhpcy5vdXQ7XG4gICAgICAgIGlmICh1ID09PSBOTylcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgdS5fZShlcnIpO1xuICAgIH07XG4gICAgRGVidWcucHJvdG90eXBlLl9jID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgdSA9IHRoaXMub3V0O1xuICAgICAgICBpZiAodSA9PT0gTk8pXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIHUuX2MoKTtcbiAgICB9O1xuICAgIHJldHVybiBEZWJ1Zztcbn0oKSk7XG52YXIgRHJvcCA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gRHJvcChtYXgsIGlucykge1xuICAgICAgICB0aGlzLnR5cGUgPSAnZHJvcCc7XG4gICAgICAgIHRoaXMuaW5zID0gaW5zO1xuICAgICAgICB0aGlzLm91dCA9IE5PO1xuICAgICAgICB0aGlzLm1heCA9IG1heDtcbiAgICAgICAgdGhpcy5kcm9wcGVkID0gMDtcbiAgICB9XG4gICAgRHJvcC5wcm90b3R5cGUuX3N0YXJ0ID0gZnVuY3Rpb24gKG91dCkge1xuICAgICAgICB0aGlzLm91dCA9IG91dDtcbiAgICAgICAgdGhpcy5kcm9wcGVkID0gMDtcbiAgICAgICAgdGhpcy5pbnMuX2FkZCh0aGlzKTtcbiAgICB9O1xuICAgIERyb3AucHJvdG90eXBlLl9zdG9wID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLmlucy5fcmVtb3ZlKHRoaXMpO1xuICAgICAgICB0aGlzLm91dCA9IE5PO1xuICAgIH07XG4gICAgRHJvcC5wcm90b3R5cGUuX24gPSBmdW5jdGlvbiAodCkge1xuICAgICAgICB2YXIgdSA9IHRoaXMub3V0O1xuICAgICAgICBpZiAodSA9PT0gTk8pXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIGlmICh0aGlzLmRyb3BwZWQrKyA+PSB0aGlzLm1heClcbiAgICAgICAgICAgIHUuX24odCk7XG4gICAgfTtcbiAgICBEcm9wLnByb3RvdHlwZS5fZSA9IGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgdmFyIHUgPSB0aGlzLm91dDtcbiAgICAgICAgaWYgKHUgPT09IE5PKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB1Ll9lKGVycik7XG4gICAgfTtcbiAgICBEcm9wLnByb3RvdHlwZS5fYyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHUgPSB0aGlzLm91dDtcbiAgICAgICAgaWYgKHUgPT09IE5PKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB1Ll9jKCk7XG4gICAgfTtcbiAgICByZXR1cm4gRHJvcDtcbn0oKSk7XG52YXIgRW5kV2hlbkxpc3RlbmVyID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBFbmRXaGVuTGlzdGVuZXIob3V0LCBvcCkge1xuICAgICAgICB0aGlzLm91dCA9IG91dDtcbiAgICAgICAgdGhpcy5vcCA9IG9wO1xuICAgIH1cbiAgICBFbmRXaGVuTGlzdGVuZXIucHJvdG90eXBlLl9uID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLm9wLmVuZCgpO1xuICAgIH07XG4gICAgRW5kV2hlbkxpc3RlbmVyLnByb3RvdHlwZS5fZSA9IGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgdGhpcy5vdXQuX2UoZXJyKTtcbiAgICB9O1xuICAgIEVuZFdoZW5MaXN0ZW5lci5wcm90b3R5cGUuX2MgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMub3AuZW5kKCk7XG4gICAgfTtcbiAgICByZXR1cm4gRW5kV2hlbkxpc3RlbmVyO1xufSgpKTtcbnZhciBFbmRXaGVuID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBFbmRXaGVuKG8sIGlucykge1xuICAgICAgICB0aGlzLnR5cGUgPSAnZW5kV2hlbic7XG4gICAgICAgIHRoaXMuaW5zID0gaW5zO1xuICAgICAgICB0aGlzLm91dCA9IE5PO1xuICAgICAgICB0aGlzLm8gPSBvO1xuICAgICAgICB0aGlzLm9pbCA9IE5PX0lMO1xuICAgIH1cbiAgICBFbmRXaGVuLnByb3RvdHlwZS5fc3RhcnQgPSBmdW5jdGlvbiAob3V0KSB7XG4gICAgICAgIHRoaXMub3V0ID0gb3V0O1xuICAgICAgICB0aGlzLm8uX2FkZCh0aGlzLm9pbCA9IG5ldyBFbmRXaGVuTGlzdGVuZXIob3V0LCB0aGlzKSk7XG4gICAgICAgIHRoaXMuaW5zLl9hZGQodGhpcyk7XG4gICAgfTtcbiAgICBFbmRXaGVuLnByb3RvdHlwZS5fc3RvcCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5pbnMuX3JlbW92ZSh0aGlzKTtcbiAgICAgICAgdGhpcy5vLl9yZW1vdmUodGhpcy5vaWwpO1xuICAgICAgICB0aGlzLm91dCA9IE5PO1xuICAgICAgICB0aGlzLm9pbCA9IE5PX0lMO1xuICAgIH07XG4gICAgRW5kV2hlbi5wcm90b3R5cGUuZW5kID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgdSA9IHRoaXMub3V0O1xuICAgICAgICBpZiAodSA9PT0gTk8pXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIHUuX2MoKTtcbiAgICB9O1xuICAgIEVuZFdoZW4ucHJvdG90eXBlLl9uID0gZnVuY3Rpb24gKHQpIHtcbiAgICAgICAgdmFyIHUgPSB0aGlzLm91dDtcbiAgICAgICAgaWYgKHUgPT09IE5PKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB1Ll9uKHQpO1xuICAgIH07XG4gICAgRW5kV2hlbi5wcm90b3R5cGUuX2UgPSBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgIHZhciB1ID0gdGhpcy5vdXQ7XG4gICAgICAgIGlmICh1ID09PSBOTylcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgdS5fZShlcnIpO1xuICAgIH07XG4gICAgRW5kV2hlbi5wcm90b3R5cGUuX2MgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuZW5kKCk7XG4gICAgfTtcbiAgICByZXR1cm4gRW5kV2hlbjtcbn0oKSk7XG52YXIgRmlsdGVyID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBGaWx0ZXIocGFzc2VzLCBpbnMpIHtcbiAgICAgICAgdGhpcy50eXBlID0gJ2ZpbHRlcic7XG4gICAgICAgIHRoaXMuaW5zID0gaW5zO1xuICAgICAgICB0aGlzLm91dCA9IE5PO1xuICAgICAgICB0aGlzLmYgPSBwYXNzZXM7XG4gICAgfVxuICAgIEZpbHRlci5wcm90b3R5cGUuX3N0YXJ0ID0gZnVuY3Rpb24gKG91dCkge1xuICAgICAgICB0aGlzLm91dCA9IG91dDtcbiAgICAgICAgdGhpcy5pbnMuX2FkZCh0aGlzKTtcbiAgICB9O1xuICAgIEZpbHRlci5wcm90b3R5cGUuX3N0b3AgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuaW5zLl9yZW1vdmUodGhpcyk7XG4gICAgICAgIHRoaXMub3V0ID0gTk87XG4gICAgfTtcbiAgICBGaWx0ZXIucHJvdG90eXBlLl9uID0gZnVuY3Rpb24gKHQpIHtcbiAgICAgICAgdmFyIHUgPSB0aGlzLm91dDtcbiAgICAgICAgaWYgKHUgPT09IE5PKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB2YXIgciA9IF90cnkodGhpcywgdCwgdSk7XG4gICAgICAgIGlmIChyID09PSBOTyB8fCAhcilcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgdS5fbih0KTtcbiAgICB9O1xuICAgIEZpbHRlci5wcm90b3R5cGUuX2UgPSBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgIHZhciB1ID0gdGhpcy5vdXQ7XG4gICAgICAgIGlmICh1ID09PSBOTylcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgdS5fZShlcnIpO1xuICAgIH07XG4gICAgRmlsdGVyLnByb3RvdHlwZS5fYyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHUgPSB0aGlzLm91dDtcbiAgICAgICAgaWYgKHUgPT09IE5PKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB1Ll9jKCk7XG4gICAgfTtcbiAgICByZXR1cm4gRmlsdGVyO1xufSgpKTtcbnZhciBGbGF0dGVuTGlzdGVuZXIgPSAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIEZsYXR0ZW5MaXN0ZW5lcihvdXQsIG9wKSB7XG4gICAgICAgIHRoaXMub3V0ID0gb3V0O1xuICAgICAgICB0aGlzLm9wID0gb3A7XG4gICAgfVxuICAgIEZsYXR0ZW5MaXN0ZW5lci5wcm90b3R5cGUuX24gPSBmdW5jdGlvbiAodCkge1xuICAgICAgICB0aGlzLm91dC5fbih0KTtcbiAgICB9O1xuICAgIEZsYXR0ZW5MaXN0ZW5lci5wcm90b3R5cGUuX2UgPSBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgIHRoaXMub3V0Ll9lKGVycik7XG4gICAgfTtcbiAgICBGbGF0dGVuTGlzdGVuZXIucHJvdG90eXBlLl9jID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLm9wLmlubmVyID0gTk87XG4gICAgICAgIHRoaXMub3AubGVzcygpO1xuICAgIH07XG4gICAgcmV0dXJuIEZsYXR0ZW5MaXN0ZW5lcjtcbn0oKSk7XG52YXIgRmxhdHRlbiA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gRmxhdHRlbihpbnMpIHtcbiAgICAgICAgdGhpcy50eXBlID0gJ2ZsYXR0ZW4nO1xuICAgICAgICB0aGlzLmlucyA9IGlucztcbiAgICAgICAgdGhpcy5vdXQgPSBOTztcbiAgICAgICAgdGhpcy5vcGVuID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5pbm5lciA9IE5PO1xuICAgICAgICB0aGlzLmlsID0gTk9fSUw7XG4gICAgfVxuICAgIEZsYXR0ZW4ucHJvdG90eXBlLl9zdGFydCA9IGZ1bmN0aW9uIChvdXQpIHtcbiAgICAgICAgdGhpcy5vdXQgPSBvdXQ7XG4gICAgICAgIHRoaXMub3BlbiA9IHRydWU7XG4gICAgICAgIHRoaXMuaW5uZXIgPSBOTztcbiAgICAgICAgdGhpcy5pbCA9IE5PX0lMO1xuICAgICAgICB0aGlzLmlucy5fYWRkKHRoaXMpO1xuICAgIH07XG4gICAgRmxhdHRlbi5wcm90b3R5cGUuX3N0b3AgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuaW5zLl9yZW1vdmUodGhpcyk7XG4gICAgICAgIGlmICh0aGlzLmlubmVyICE9PSBOTylcbiAgICAgICAgICAgIHRoaXMuaW5uZXIuX3JlbW92ZSh0aGlzLmlsKTtcbiAgICAgICAgdGhpcy5vdXQgPSBOTztcbiAgICAgICAgdGhpcy5vcGVuID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5pbm5lciA9IE5PO1xuICAgICAgICB0aGlzLmlsID0gTk9fSUw7XG4gICAgfTtcbiAgICBGbGF0dGVuLnByb3RvdHlwZS5sZXNzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgdSA9IHRoaXMub3V0O1xuICAgICAgICBpZiAodSA9PT0gTk8pXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIGlmICghdGhpcy5vcGVuICYmIHRoaXMuaW5uZXIgPT09IE5PKVxuICAgICAgICAgICAgdS5fYygpO1xuICAgIH07XG4gICAgRmxhdHRlbi5wcm90b3R5cGUuX24gPSBmdW5jdGlvbiAocykge1xuICAgICAgICB2YXIgdSA9IHRoaXMub3V0O1xuICAgICAgICBpZiAodSA9PT0gTk8pXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIHZhciBfYSA9IHRoaXMsIGlubmVyID0gX2EuaW5uZXIsIGlsID0gX2EuaWw7XG4gICAgICAgIGlmIChpbm5lciAhPT0gTk8gJiYgaWwgIT09IE5PX0lMKVxuICAgICAgICAgICAgaW5uZXIuX3JlbW92ZShpbCk7XG4gICAgICAgICh0aGlzLmlubmVyID0gcykuX2FkZCh0aGlzLmlsID0gbmV3IEZsYXR0ZW5MaXN0ZW5lcih1LCB0aGlzKSk7XG4gICAgfTtcbiAgICBGbGF0dGVuLnByb3RvdHlwZS5fZSA9IGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgdmFyIHUgPSB0aGlzLm91dDtcbiAgICAgICAgaWYgKHUgPT09IE5PKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB1Ll9lKGVycik7XG4gICAgfTtcbiAgICBGbGF0dGVuLnByb3RvdHlwZS5fYyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5vcGVuID0gZmFsc2U7XG4gICAgICAgIHRoaXMubGVzcygpO1xuICAgIH07XG4gICAgcmV0dXJuIEZsYXR0ZW47XG59KCkpO1xudmFyIEZvbGQgPSAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIEZvbGQoZiwgc2VlZCwgaW5zKSB7XG4gICAgICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgICAgIHRoaXMudHlwZSA9ICdmb2xkJztcbiAgICAgICAgdGhpcy5pbnMgPSBpbnM7XG4gICAgICAgIHRoaXMub3V0ID0gTk87XG4gICAgICAgIHRoaXMuZiA9IGZ1bmN0aW9uICh0KSB7IHJldHVybiBmKF90aGlzLmFjYywgdCk7IH07XG4gICAgICAgIHRoaXMuYWNjID0gdGhpcy5zZWVkID0gc2VlZDtcbiAgICB9XG4gICAgRm9sZC5wcm90b3R5cGUuX3N0YXJ0ID0gZnVuY3Rpb24gKG91dCkge1xuICAgICAgICB0aGlzLm91dCA9IG91dDtcbiAgICAgICAgdGhpcy5hY2MgPSB0aGlzLnNlZWQ7XG4gICAgICAgIG91dC5fbih0aGlzLmFjYyk7XG4gICAgICAgIHRoaXMuaW5zLl9hZGQodGhpcyk7XG4gICAgfTtcbiAgICBGb2xkLnByb3RvdHlwZS5fc3RvcCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5pbnMuX3JlbW92ZSh0aGlzKTtcbiAgICAgICAgdGhpcy5vdXQgPSBOTztcbiAgICAgICAgdGhpcy5hY2MgPSB0aGlzLnNlZWQ7XG4gICAgfTtcbiAgICBGb2xkLnByb3RvdHlwZS5fbiA9IGZ1bmN0aW9uICh0KSB7XG4gICAgICAgIHZhciB1ID0gdGhpcy5vdXQ7XG4gICAgICAgIGlmICh1ID09PSBOTylcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgdmFyIHIgPSBfdHJ5KHRoaXMsIHQsIHUpO1xuICAgICAgICBpZiAociA9PT0gTk8pXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIHUuX24odGhpcy5hY2MgPSByKTtcbiAgICB9O1xuICAgIEZvbGQucHJvdG90eXBlLl9lID0gZnVuY3Rpb24gKGVycikge1xuICAgICAgICB2YXIgdSA9IHRoaXMub3V0O1xuICAgICAgICBpZiAodSA9PT0gTk8pXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIHUuX2UoZXJyKTtcbiAgICB9O1xuICAgIEZvbGQucHJvdG90eXBlLl9jID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgdSA9IHRoaXMub3V0O1xuICAgICAgICBpZiAodSA9PT0gTk8pXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIHUuX2MoKTtcbiAgICB9O1xuICAgIHJldHVybiBGb2xkO1xufSgpKTtcbnZhciBMYXN0ID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBMYXN0KGlucykge1xuICAgICAgICB0aGlzLnR5cGUgPSAnbGFzdCc7XG4gICAgICAgIHRoaXMuaW5zID0gaW5zO1xuICAgICAgICB0aGlzLm91dCA9IE5PO1xuICAgICAgICB0aGlzLmhhcyA9IGZhbHNlO1xuICAgICAgICB0aGlzLnZhbCA9IE5PO1xuICAgIH1cbiAgICBMYXN0LnByb3RvdHlwZS5fc3RhcnQgPSBmdW5jdGlvbiAob3V0KSB7XG4gICAgICAgIHRoaXMub3V0ID0gb3V0O1xuICAgICAgICB0aGlzLmhhcyA9IGZhbHNlO1xuICAgICAgICB0aGlzLmlucy5fYWRkKHRoaXMpO1xuICAgIH07XG4gICAgTGFzdC5wcm90b3R5cGUuX3N0b3AgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuaW5zLl9yZW1vdmUodGhpcyk7XG4gICAgICAgIHRoaXMub3V0ID0gTk87XG4gICAgICAgIHRoaXMudmFsID0gTk87XG4gICAgfTtcbiAgICBMYXN0LnByb3RvdHlwZS5fbiA9IGZ1bmN0aW9uICh0KSB7XG4gICAgICAgIHRoaXMuaGFzID0gdHJ1ZTtcbiAgICAgICAgdGhpcy52YWwgPSB0O1xuICAgIH07XG4gICAgTGFzdC5wcm90b3R5cGUuX2UgPSBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgIHZhciB1ID0gdGhpcy5vdXQ7XG4gICAgICAgIGlmICh1ID09PSBOTylcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgdS5fZShlcnIpO1xuICAgIH07XG4gICAgTGFzdC5wcm90b3R5cGUuX2MgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciB1ID0gdGhpcy5vdXQ7XG4gICAgICAgIGlmICh1ID09PSBOTylcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgaWYgKHRoaXMuaGFzKSB7XG4gICAgICAgICAgICB1Ll9uKHRoaXMudmFsKTtcbiAgICAgICAgICAgIHUuX2MoKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlXG4gICAgICAgICAgICB1Ll9lKG5ldyBFcnJvcignbGFzdCgpIGZhaWxlZCBiZWNhdXNlIGlucHV0IHN0cmVhbSBjb21wbGV0ZWQnKSk7XG4gICAgfTtcbiAgICByZXR1cm4gTGFzdDtcbn0oKSk7XG52YXIgTWFwT3AgPSAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIE1hcE9wKHByb2plY3QsIGlucykge1xuICAgICAgICB0aGlzLnR5cGUgPSAnbWFwJztcbiAgICAgICAgdGhpcy5pbnMgPSBpbnM7XG4gICAgICAgIHRoaXMub3V0ID0gTk87XG4gICAgICAgIHRoaXMuZiA9IHByb2plY3Q7XG4gICAgfVxuICAgIE1hcE9wLnByb3RvdHlwZS5fc3RhcnQgPSBmdW5jdGlvbiAob3V0KSB7XG4gICAgICAgIHRoaXMub3V0ID0gb3V0O1xuICAgICAgICB0aGlzLmlucy5fYWRkKHRoaXMpO1xuICAgIH07XG4gICAgTWFwT3AucHJvdG90eXBlLl9zdG9wID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLmlucy5fcmVtb3ZlKHRoaXMpO1xuICAgICAgICB0aGlzLm91dCA9IE5PO1xuICAgIH07XG4gICAgTWFwT3AucHJvdG90eXBlLl9uID0gZnVuY3Rpb24gKHQpIHtcbiAgICAgICAgdmFyIHUgPSB0aGlzLm91dDtcbiAgICAgICAgaWYgKHUgPT09IE5PKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB2YXIgciA9IF90cnkodGhpcywgdCwgdSk7XG4gICAgICAgIGlmIChyID09PSBOTylcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgdS5fbihyKTtcbiAgICB9O1xuICAgIE1hcE9wLnByb3RvdHlwZS5fZSA9IGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgdmFyIHUgPSB0aGlzLm91dDtcbiAgICAgICAgaWYgKHUgPT09IE5PKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB1Ll9lKGVycik7XG4gICAgfTtcbiAgICBNYXBPcC5wcm90b3R5cGUuX2MgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciB1ID0gdGhpcy5vdXQ7XG4gICAgICAgIGlmICh1ID09PSBOTylcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgdS5fYygpO1xuICAgIH07XG4gICAgcmV0dXJuIE1hcE9wO1xufSgpKTtcbnZhciBSZW1lbWJlciA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gUmVtZW1iZXIoaW5zKSB7XG4gICAgICAgIHRoaXMudHlwZSA9ICdyZW1lbWJlcic7XG4gICAgICAgIHRoaXMuaW5zID0gaW5zO1xuICAgICAgICB0aGlzLm91dCA9IE5PO1xuICAgIH1cbiAgICBSZW1lbWJlci5wcm90b3R5cGUuX3N0YXJ0ID0gZnVuY3Rpb24gKG91dCkge1xuICAgICAgICB0aGlzLm91dCA9IG91dDtcbiAgICAgICAgdGhpcy5pbnMuX2FkZChvdXQpO1xuICAgIH07XG4gICAgUmVtZW1iZXIucHJvdG90eXBlLl9zdG9wID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLmlucy5fcmVtb3ZlKHRoaXMub3V0KTtcbiAgICAgICAgdGhpcy5vdXQgPSBOTztcbiAgICB9O1xuICAgIHJldHVybiBSZW1lbWJlcjtcbn0oKSk7XG52YXIgUmVwbGFjZUVycm9yID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBSZXBsYWNlRXJyb3IocmVwbGFjZXIsIGlucykge1xuICAgICAgICB0aGlzLnR5cGUgPSAncmVwbGFjZUVycm9yJztcbiAgICAgICAgdGhpcy5pbnMgPSBpbnM7XG4gICAgICAgIHRoaXMub3V0ID0gTk87XG4gICAgICAgIHRoaXMuZiA9IHJlcGxhY2VyO1xuICAgIH1cbiAgICBSZXBsYWNlRXJyb3IucHJvdG90eXBlLl9zdGFydCA9IGZ1bmN0aW9uIChvdXQpIHtcbiAgICAgICAgdGhpcy5vdXQgPSBvdXQ7XG4gICAgICAgIHRoaXMuaW5zLl9hZGQodGhpcyk7XG4gICAgfTtcbiAgICBSZXBsYWNlRXJyb3IucHJvdG90eXBlLl9zdG9wID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLmlucy5fcmVtb3ZlKHRoaXMpO1xuICAgICAgICB0aGlzLm91dCA9IE5PO1xuICAgIH07XG4gICAgUmVwbGFjZUVycm9yLnByb3RvdHlwZS5fbiA9IGZ1bmN0aW9uICh0KSB7XG4gICAgICAgIHZhciB1ID0gdGhpcy5vdXQ7XG4gICAgICAgIGlmICh1ID09PSBOTylcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgdS5fbih0KTtcbiAgICB9O1xuICAgIFJlcGxhY2VFcnJvci5wcm90b3R5cGUuX2UgPSBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgIHZhciB1ID0gdGhpcy5vdXQ7XG4gICAgICAgIGlmICh1ID09PSBOTylcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHRoaXMuaW5zLl9yZW1vdmUodGhpcyk7XG4gICAgICAgICAgICAodGhpcy5pbnMgPSB0aGlzLmYoZXJyKSkuX2FkZCh0aGlzKTtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaCAoZSkge1xuICAgICAgICAgICAgdS5fZShlKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgUmVwbGFjZUVycm9yLnByb3RvdHlwZS5fYyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHUgPSB0aGlzLm91dDtcbiAgICAgICAgaWYgKHUgPT09IE5PKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB1Ll9jKCk7XG4gICAgfTtcbiAgICByZXR1cm4gUmVwbGFjZUVycm9yO1xufSgpKTtcbnZhciBTdGFydFdpdGggPSAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIFN0YXJ0V2l0aChpbnMsIHZhbCkge1xuICAgICAgICB0aGlzLnR5cGUgPSAnc3RhcnRXaXRoJztcbiAgICAgICAgdGhpcy5pbnMgPSBpbnM7XG4gICAgICAgIHRoaXMub3V0ID0gTk87XG4gICAgICAgIHRoaXMudmFsID0gdmFsO1xuICAgIH1cbiAgICBTdGFydFdpdGgucHJvdG90eXBlLl9zdGFydCA9IGZ1bmN0aW9uIChvdXQpIHtcbiAgICAgICAgdGhpcy5vdXQgPSBvdXQ7XG4gICAgICAgIHRoaXMub3V0Ll9uKHRoaXMudmFsKTtcbiAgICAgICAgdGhpcy5pbnMuX2FkZChvdXQpO1xuICAgIH07XG4gICAgU3RhcnRXaXRoLnByb3RvdHlwZS5fc3RvcCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5pbnMuX3JlbW92ZSh0aGlzLm91dCk7XG4gICAgICAgIHRoaXMub3V0ID0gTk87XG4gICAgfTtcbiAgICByZXR1cm4gU3RhcnRXaXRoO1xufSgpKTtcbnZhciBUYWtlID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBUYWtlKG1heCwgaW5zKSB7XG4gICAgICAgIHRoaXMudHlwZSA9ICd0YWtlJztcbiAgICAgICAgdGhpcy5pbnMgPSBpbnM7XG4gICAgICAgIHRoaXMub3V0ID0gTk87XG4gICAgICAgIHRoaXMubWF4ID0gbWF4O1xuICAgICAgICB0aGlzLnRha2VuID0gMDtcbiAgICB9XG4gICAgVGFrZS5wcm90b3R5cGUuX3N0YXJ0ID0gZnVuY3Rpb24gKG91dCkge1xuICAgICAgICB0aGlzLm91dCA9IG91dDtcbiAgICAgICAgdGhpcy50YWtlbiA9IDA7XG4gICAgICAgIGlmICh0aGlzLm1heCA8PSAwKVxuICAgICAgICAgICAgb3V0Ll9jKCk7XG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIHRoaXMuaW5zLl9hZGQodGhpcyk7XG4gICAgfTtcbiAgICBUYWtlLnByb3RvdHlwZS5fc3RvcCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5pbnMuX3JlbW92ZSh0aGlzKTtcbiAgICAgICAgdGhpcy5vdXQgPSBOTztcbiAgICB9O1xuICAgIFRha2UucHJvdG90eXBlLl9uID0gZnVuY3Rpb24gKHQpIHtcbiAgICAgICAgdmFyIHUgPSB0aGlzLm91dDtcbiAgICAgICAgaWYgKHUgPT09IE5PKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB2YXIgbSA9ICsrdGhpcy50YWtlbjtcbiAgICAgICAgaWYgKG0gPCB0aGlzLm1heClcbiAgICAgICAgICAgIHUuX24odCk7XG4gICAgICAgIGVsc2UgaWYgKG0gPT09IHRoaXMubWF4KSB7XG4gICAgICAgICAgICB1Ll9uKHQpO1xuICAgICAgICAgICAgdS5fYygpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBUYWtlLnByb3RvdHlwZS5fZSA9IGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgdmFyIHUgPSB0aGlzLm91dDtcbiAgICAgICAgaWYgKHUgPT09IE5PKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB1Ll9lKGVycik7XG4gICAgfTtcbiAgICBUYWtlLnByb3RvdHlwZS5fYyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHUgPSB0aGlzLm91dDtcbiAgICAgICAgaWYgKHUgPT09IE5PKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB1Ll9jKCk7XG4gICAgfTtcbiAgICByZXR1cm4gVGFrZTtcbn0oKSk7XG52YXIgU3RyZWFtID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBTdHJlYW0ocHJvZHVjZXIpIHtcbiAgICAgICAgdGhpcy5fcHJvZCA9IHByb2R1Y2VyIHx8IE5PO1xuICAgICAgICB0aGlzLl9pbHMgPSBbXTtcbiAgICAgICAgdGhpcy5fc3RvcElEID0gTk87XG4gICAgICAgIHRoaXMuX2RsID0gTk87XG4gICAgICAgIHRoaXMuX2QgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5fdGFyZ2V0ID0gTk87XG4gICAgICAgIHRoaXMuX2VyciA9IE5PO1xuICAgIH1cbiAgICBTdHJlYW0ucHJvdG90eXBlLl9uID0gZnVuY3Rpb24gKHQpIHtcbiAgICAgICAgdmFyIGEgPSB0aGlzLl9pbHM7XG4gICAgICAgIHZhciBMID0gYS5sZW5ndGg7XG4gICAgICAgIGlmICh0aGlzLl9kKVxuICAgICAgICAgICAgdGhpcy5fZGwuX24odCk7XG4gICAgICAgIGlmIChMID09IDEpXG4gICAgICAgICAgICBhWzBdLl9uKHQpO1xuICAgICAgICBlbHNlIGlmIChMID09IDApXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdmFyIGIgPSBjcChhKTtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgTDsgaSsrKVxuICAgICAgICAgICAgICAgIGJbaV0uX24odCk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIFN0cmVhbS5wcm90b3R5cGUuX2UgPSBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgIGlmICh0aGlzLl9lcnIgIT09IE5PKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB0aGlzLl9lcnIgPSBlcnI7XG4gICAgICAgIHZhciBhID0gdGhpcy5faWxzO1xuICAgICAgICB2YXIgTCA9IGEubGVuZ3RoO1xuICAgICAgICB0aGlzLl94KCk7XG4gICAgICAgIGlmICh0aGlzLl9kKVxuICAgICAgICAgICAgdGhpcy5fZGwuX2UoZXJyKTtcbiAgICAgICAgaWYgKEwgPT0gMSlcbiAgICAgICAgICAgIGFbMF0uX2UoZXJyKTtcbiAgICAgICAgZWxzZSBpZiAoTCA9PSAwKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHZhciBiID0gY3AoYSk7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IEw7IGkrKylcbiAgICAgICAgICAgICAgICBiW2ldLl9lKGVycik7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCF0aGlzLl9kICYmIEwgPT0gMClcbiAgICAgICAgICAgIHRocm93IHRoaXMuX2VycjtcbiAgICB9O1xuICAgIFN0cmVhbS5wcm90b3R5cGUuX2MgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBhID0gdGhpcy5faWxzO1xuICAgICAgICB2YXIgTCA9IGEubGVuZ3RoO1xuICAgICAgICB0aGlzLl94KCk7XG4gICAgICAgIGlmICh0aGlzLl9kKVxuICAgICAgICAgICAgdGhpcy5fZGwuX2MoKTtcbiAgICAgICAgaWYgKEwgPT0gMSlcbiAgICAgICAgICAgIGFbMF0uX2MoKTtcbiAgICAgICAgZWxzZSBpZiAoTCA9PSAwKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHZhciBiID0gY3AoYSk7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IEw7IGkrKylcbiAgICAgICAgICAgICAgICBiW2ldLl9jKCk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIFN0cmVhbS5wcm90b3R5cGUuX3ggPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICh0aGlzLl9pbHMubGVuZ3RoID09PSAwKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICBpZiAodGhpcy5fcHJvZCAhPT0gTk8pXG4gICAgICAgICAgICB0aGlzLl9wcm9kLl9zdG9wKCk7XG4gICAgICAgIHRoaXMuX2VyciA9IE5PO1xuICAgICAgICB0aGlzLl9pbHMgPSBbXTtcbiAgICB9O1xuICAgIFN0cmVhbS5wcm90b3R5cGUuX3N0b3BOb3cgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIC8vIFdBUk5JTkc6IGNvZGUgdGhhdCBjYWxscyB0aGlzIG1ldGhvZCBzaG91bGRcbiAgICAgICAgLy8gZmlyc3QgY2hlY2sgaWYgdGhpcy5fcHJvZCBpcyB2YWxpZCAobm90IGBOT2ApXG4gICAgICAgIHRoaXMuX3Byb2QuX3N0b3AoKTtcbiAgICAgICAgdGhpcy5fZXJyID0gTk87XG4gICAgICAgIHRoaXMuX3N0b3BJRCA9IE5PO1xuICAgIH07XG4gICAgU3RyZWFtLnByb3RvdHlwZS5fYWRkID0gZnVuY3Rpb24gKGlsKSB7XG4gICAgICAgIHZhciB0YSA9IHRoaXMuX3RhcmdldDtcbiAgICAgICAgaWYgKHRhICE9PSBOTylcbiAgICAgICAgICAgIHJldHVybiB0YS5fYWRkKGlsKTtcbiAgICAgICAgdmFyIGEgPSB0aGlzLl9pbHM7XG4gICAgICAgIGEucHVzaChpbCk7XG4gICAgICAgIGlmIChhLmxlbmd0aCA+IDEpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIGlmICh0aGlzLl9zdG9wSUQgIT09IE5PKSB7XG4gICAgICAgICAgICBjbGVhclRpbWVvdXQodGhpcy5fc3RvcElEKTtcbiAgICAgICAgICAgIHRoaXMuX3N0b3BJRCA9IE5PO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdmFyIHAgPSB0aGlzLl9wcm9kO1xuICAgICAgICAgICAgaWYgKHAgIT09IE5PKVxuICAgICAgICAgICAgICAgIHAuX3N0YXJ0KHRoaXMpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBTdHJlYW0ucHJvdG90eXBlLl9yZW1vdmUgPSBmdW5jdGlvbiAoaWwpIHtcbiAgICAgICAgdmFyIF90aGlzID0gdGhpcztcbiAgICAgICAgdmFyIHRhID0gdGhpcy5fdGFyZ2V0O1xuICAgICAgICBpZiAodGEgIT09IE5PKVxuICAgICAgICAgICAgcmV0dXJuIHRhLl9yZW1vdmUoaWwpO1xuICAgICAgICB2YXIgYSA9IHRoaXMuX2lscztcbiAgICAgICAgdmFyIGkgPSBhLmluZGV4T2YoaWwpO1xuICAgICAgICBpZiAoaSA+IC0xKSB7XG4gICAgICAgICAgICBhLnNwbGljZShpLCAxKTtcbiAgICAgICAgICAgIGlmICh0aGlzLl9wcm9kICE9PSBOTyAmJiBhLmxlbmd0aCA8PSAwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fZXJyID0gTk87XG4gICAgICAgICAgICAgICAgdGhpcy5fc3RvcElEID0gc2V0VGltZW91dChmdW5jdGlvbiAoKSB7IHJldHVybiBfdGhpcy5fc3RvcE5vdygpOyB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGEubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fcHJ1bmVDeWNsZXMoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG4gICAgLy8gSWYgYWxsIHBhdGhzIHN0ZW1taW5nIGZyb20gYHRoaXNgIHN0cmVhbSBldmVudHVhbGx5IGVuZCBhdCBgdGhpc2BcbiAgICAvLyBzdHJlYW0sIHRoZW4gd2UgcmVtb3ZlIHRoZSBzaW5nbGUgbGlzdGVuZXIgb2YgYHRoaXNgIHN0cmVhbSwgdG9cbiAgICAvLyBmb3JjZSBpdCB0byBlbmQgaXRzIGV4ZWN1dGlvbiBhbmQgZGlzcG9zZSByZXNvdXJjZXMuIFRoaXMgbWV0aG9kXG4gICAgLy8gYXNzdW1lcyBhcyBhIHByZWNvbmRpdGlvbiB0aGF0IHRoaXMuX2lscyBoYXMganVzdCBvbmUgbGlzdGVuZXIuXG4gICAgU3RyZWFtLnByb3RvdHlwZS5fcHJ1bmVDeWNsZXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICh0aGlzLl9oYXNOb1NpbmtzKHRoaXMsIFtdKSlcbiAgICAgICAgICAgIHRoaXMuX3JlbW92ZSh0aGlzLl9pbHNbMF0pO1xuICAgIH07XG4gICAgLy8gQ2hlY2tzIHdoZXRoZXIgKnRoZXJlIGlzIG5vKiBwYXRoIHN0YXJ0aW5nIGZyb20gYHhgIHRoYXQgbGVhZHMgdG8gYW4gZW5kXG4gICAgLy8gbGlzdGVuZXIgKHNpbmspIGluIHRoZSBzdHJlYW0gZ3JhcGgsIGZvbGxvd2luZyBlZGdlcyBBLT5CIHdoZXJlIEIgaXMgYVxuICAgIC8vIGxpc3RlbmVyIG9mIEEuIFRoaXMgbWVhbnMgdGhlc2UgcGF0aHMgY29uc3RpdHV0ZSBhIGN5Y2xlIHNvbWVob3cuIElzIGdpdmVuXG4gICAgLy8gYSB0cmFjZSBvZiBhbGwgdmlzaXRlZCBub2RlcyBzbyBmYXIuXG4gICAgU3RyZWFtLnByb3RvdHlwZS5faGFzTm9TaW5rcyA9IGZ1bmN0aW9uICh4LCB0cmFjZSkge1xuICAgICAgICBpZiAodHJhY2UuaW5kZXhPZih4KSAhPT0gLTEpXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgZWxzZSBpZiAoeC5vdXQgPT09IHRoaXMpXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgZWxzZSBpZiAoeC5vdXQgJiYgeC5vdXQgIT09IE5PKVxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2hhc05vU2lua3MoeC5vdXQsIHRyYWNlLmNvbmNhdCh4KSk7XG4gICAgICAgIGVsc2UgaWYgKHguX2lscykge1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDAsIE4gPSB4Ll9pbHMubGVuZ3RoOyBpIDwgTjsgaSsrKVxuICAgICAgICAgICAgICAgIGlmICghdGhpcy5faGFzTm9TaW5rcyh4Ll9pbHNbaV0sIHRyYWNlLmNvbmNhdCh4KSkpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9O1xuICAgIFN0cmVhbS5wcm90b3R5cGUuY3RvciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMgaW5zdGFuY2VvZiBNZW1vcnlTdHJlYW0gPyBNZW1vcnlTdHJlYW0gOiBTdHJlYW07XG4gICAgfTtcbiAgICAvKipcbiAgICAgKiBBZGRzIGEgTGlzdGVuZXIgdG8gdGhlIFN0cmVhbS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7TGlzdGVuZXJ9IGxpc3RlbmVyXG4gICAgICovXG4gICAgU3RyZWFtLnByb3RvdHlwZS5hZGRMaXN0ZW5lciA9IGZ1bmN0aW9uIChsaXN0ZW5lcikge1xuICAgICAgICBsaXN0ZW5lci5fbiA9IGxpc3RlbmVyLm5leHQgfHwgbm9vcDtcbiAgICAgICAgbGlzdGVuZXIuX2UgPSBsaXN0ZW5lci5lcnJvciB8fCBub29wO1xuICAgICAgICBsaXN0ZW5lci5fYyA9IGxpc3RlbmVyLmNvbXBsZXRlIHx8IG5vb3A7XG4gICAgICAgIHRoaXMuX2FkZChsaXN0ZW5lcik7XG4gICAgfTtcbiAgICAvKipcbiAgICAgKiBSZW1vdmVzIGEgTGlzdGVuZXIgZnJvbSB0aGUgU3RyZWFtLCBhc3N1bWluZyB0aGUgTGlzdGVuZXIgd2FzIGFkZGVkIHRvIGl0LlxuICAgICAqXG4gICAgICogQHBhcmFtIHtMaXN0ZW5lcjxUPn0gbGlzdGVuZXJcbiAgICAgKi9cbiAgICBTdHJlYW0ucHJvdG90eXBlLnJlbW92ZUxpc3RlbmVyID0gZnVuY3Rpb24gKGxpc3RlbmVyKSB7XG4gICAgICAgIHRoaXMuX3JlbW92ZShsaXN0ZW5lcik7XG4gICAgfTtcbiAgICAvKipcbiAgICAgKiBBZGRzIGEgTGlzdGVuZXIgdG8gdGhlIFN0cmVhbSByZXR1cm5pbmcgYSBTdWJzY3JpcHRpb24gdG8gcmVtb3ZlIHRoYXRcbiAgICAgKiBsaXN0ZW5lci5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7TGlzdGVuZXJ9IGxpc3RlbmVyXG4gICAgICogQHJldHVybnMge1N1YnNjcmlwdGlvbn1cbiAgICAgKi9cbiAgICBTdHJlYW0ucHJvdG90eXBlLnN1YnNjcmliZSA9IGZ1bmN0aW9uIChsaXN0ZW5lcikge1xuICAgICAgICB0aGlzLmFkZExpc3RlbmVyKGxpc3RlbmVyKTtcbiAgICAgICAgcmV0dXJuIG5ldyBTdHJlYW1TdWIodGhpcywgbGlzdGVuZXIpO1xuICAgIH07XG4gICAgLyoqXG4gICAgICogQWRkIGludGVyb3AgYmV0d2VlbiBtb3N0LmpzIGFuZCBSeEpTIDVcbiAgICAgKlxuICAgICAqIEByZXR1cm5zIHtTdHJlYW19XG4gICAgICovXG4gICAgU3RyZWFtLnByb3RvdHlwZVtzeW1ib2xfb2JzZXJ2YWJsZV8xLmRlZmF1bHRdID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYSBuZXcgU3RyZWFtIGdpdmVuIGEgUHJvZHVjZXIuXG4gICAgICpcbiAgICAgKiBAZmFjdG9yeSB0cnVlXG4gICAgICogQHBhcmFtIHtQcm9kdWNlcn0gcHJvZHVjZXIgQW4gb3B0aW9uYWwgUHJvZHVjZXIgdGhhdCBkaWN0YXRlcyBob3cgdG9cbiAgICAgKiBzdGFydCwgZ2VuZXJhdGUgZXZlbnRzLCBhbmQgc3RvcCB0aGUgU3RyZWFtLlxuICAgICAqIEByZXR1cm4ge1N0cmVhbX1cbiAgICAgKi9cbiAgICBTdHJlYW0uY3JlYXRlID0gZnVuY3Rpb24gKHByb2R1Y2VyKSB7XG4gICAgICAgIGlmIChwcm9kdWNlcikge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBwcm9kdWNlci5zdGFydCAhPT0gJ2Z1bmN0aW9uJ1xuICAgICAgICAgICAgICAgIHx8IHR5cGVvZiBwcm9kdWNlci5zdG9wICE9PSAnZnVuY3Rpb24nKVxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcigncHJvZHVjZXIgcmVxdWlyZXMgYm90aCBzdGFydCBhbmQgc3RvcCBmdW5jdGlvbnMnKTtcbiAgICAgICAgICAgIGludGVybmFsaXplUHJvZHVjZXIocHJvZHVjZXIpOyAvLyBtdXRhdGVzIHRoZSBpbnB1dFxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZXcgU3RyZWFtKHByb2R1Y2VyKTtcbiAgICB9O1xuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYSBuZXcgTWVtb3J5U3RyZWFtIGdpdmVuIGEgUHJvZHVjZXIuXG4gICAgICpcbiAgICAgKiBAZmFjdG9yeSB0cnVlXG4gICAgICogQHBhcmFtIHtQcm9kdWNlcn0gcHJvZHVjZXIgQW4gb3B0aW9uYWwgUHJvZHVjZXIgdGhhdCBkaWN0YXRlcyBob3cgdG9cbiAgICAgKiBzdGFydCwgZ2VuZXJhdGUgZXZlbnRzLCBhbmQgc3RvcCB0aGUgU3RyZWFtLlxuICAgICAqIEByZXR1cm4ge01lbW9yeVN0cmVhbX1cbiAgICAgKi9cbiAgICBTdHJlYW0uY3JlYXRlV2l0aE1lbW9yeSA9IGZ1bmN0aW9uIChwcm9kdWNlcikge1xuICAgICAgICBpZiAocHJvZHVjZXIpXG4gICAgICAgICAgICBpbnRlcm5hbGl6ZVByb2R1Y2VyKHByb2R1Y2VyKTsgLy8gbXV0YXRlcyB0aGUgaW5wdXRcbiAgICAgICAgcmV0dXJuIG5ldyBNZW1vcnlTdHJlYW0ocHJvZHVjZXIpO1xuICAgIH07XG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhIFN0cmVhbSB0aGF0IGRvZXMgbm90aGluZyB3aGVuIHN0YXJ0ZWQuIEl0IG5ldmVyIGVtaXRzIGFueSBldmVudC5cbiAgICAgKlxuICAgICAqIE1hcmJsZSBkaWFncmFtOlxuICAgICAqXG4gICAgICogYGBgdGV4dFxuICAgICAqICAgICAgICAgIG5ldmVyXG4gICAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgKiBgYGBcbiAgICAgKlxuICAgICAqIEBmYWN0b3J5IHRydWVcbiAgICAgKiBAcmV0dXJuIHtTdHJlYW19XG4gICAgICovXG4gICAgU3RyZWFtLm5ldmVyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gbmV3IFN0cmVhbSh7IF9zdGFydDogbm9vcCwgX3N0b3A6IG5vb3AgfSk7XG4gICAgfTtcbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGEgU3RyZWFtIHRoYXQgaW1tZWRpYXRlbHkgZW1pdHMgdGhlIFwiY29tcGxldGVcIiBub3RpZmljYXRpb24gd2hlblxuICAgICAqIHN0YXJ0ZWQsIGFuZCB0aGF0J3MgaXQuXG4gICAgICpcbiAgICAgKiBNYXJibGUgZGlhZ3JhbTpcbiAgICAgKlxuICAgICAqIGBgYHRleHRcbiAgICAgKiBlbXB0eVxuICAgICAqIC18XG4gICAgICogYGBgXG4gICAgICpcbiAgICAgKiBAZmFjdG9yeSB0cnVlXG4gICAgICogQHJldHVybiB7U3RyZWFtfVxuICAgICAqL1xuICAgIFN0cmVhbS5lbXB0eSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBTdHJlYW0oe1xuICAgICAgICAgICAgX3N0YXJ0OiBmdW5jdGlvbiAoaWwpIHsgaWwuX2MoKTsgfSxcbiAgICAgICAgICAgIF9zdG9wOiBub29wLFxuICAgICAgICB9KTtcbiAgICB9O1xuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYSBTdHJlYW0gdGhhdCBpbW1lZGlhdGVseSBlbWl0cyBhbiBcImVycm9yXCIgbm90aWZpY2F0aW9uIHdpdGggdGhlXG4gICAgICogdmFsdWUgeW91IHBhc3NlZCBhcyB0aGUgYGVycm9yYCBhcmd1bWVudCB3aGVuIHRoZSBzdHJlYW0gc3RhcnRzLCBhbmQgdGhhdCdzXG4gICAgICogaXQuXG4gICAgICpcbiAgICAgKiBNYXJibGUgZGlhZ3JhbTpcbiAgICAgKlxuICAgICAqIGBgYHRleHRcbiAgICAgKiB0aHJvdyhYKVxuICAgICAqIC1YXG4gICAgICogYGBgXG4gICAgICpcbiAgICAgKiBAZmFjdG9yeSB0cnVlXG4gICAgICogQHBhcmFtIGVycm9yIFRoZSBlcnJvciBldmVudCB0byBlbWl0IG9uIHRoZSBjcmVhdGVkIHN0cmVhbS5cbiAgICAgKiBAcmV0dXJuIHtTdHJlYW19XG4gICAgICovXG4gICAgU3RyZWFtLnRocm93ID0gZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgICAgIHJldHVybiBuZXcgU3RyZWFtKHtcbiAgICAgICAgICAgIF9zdGFydDogZnVuY3Rpb24gKGlsKSB7IGlsLl9lKGVycm9yKTsgfSxcbiAgICAgICAgICAgIF9zdG9wOiBub29wLFxuICAgICAgICB9KTtcbiAgICB9O1xuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYSBzdHJlYW0gZnJvbSBhbiBBcnJheSwgUHJvbWlzZSwgb3IgYW4gT2JzZXJ2YWJsZS5cbiAgICAgKlxuICAgICAqIEBmYWN0b3J5IHRydWVcbiAgICAgKiBAcGFyYW0ge0FycmF5fFByb21pc2VMaWtlfE9ic2VydmFibGV9IGlucHV0IFRoZSBpbnB1dCB0byBtYWtlIGEgc3RyZWFtIGZyb20uXG4gICAgICogQHJldHVybiB7U3RyZWFtfVxuICAgICAqL1xuICAgIFN0cmVhbS5mcm9tID0gZnVuY3Rpb24gKGlucHV0KSB7XG4gICAgICAgIGlmICh0eXBlb2YgaW5wdXRbc3ltYm9sX29ic2VydmFibGVfMS5kZWZhdWx0XSA9PT0gJ2Z1bmN0aW9uJylcbiAgICAgICAgICAgIHJldHVybiBTdHJlYW0uZnJvbU9ic2VydmFibGUoaW5wdXQpO1xuICAgICAgICBlbHNlIGlmICh0eXBlb2YgaW5wdXQudGhlbiA9PT0gJ2Z1bmN0aW9uJylcbiAgICAgICAgICAgIHJldHVybiBTdHJlYW0uZnJvbVByb21pc2UoaW5wdXQpO1xuICAgICAgICBlbHNlIGlmIChBcnJheS5pc0FycmF5KGlucHV0KSlcbiAgICAgICAgICAgIHJldHVybiBTdHJlYW0uZnJvbUFycmF5KGlucHV0KTtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlR5cGUgb2YgaW5wdXQgdG8gZnJvbSgpIG11c3QgYmUgYW4gQXJyYXksIFByb21pc2UsIG9yIE9ic2VydmFibGVcIik7XG4gICAgfTtcbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGEgU3RyZWFtIHRoYXQgaW1tZWRpYXRlbHkgZW1pdHMgdGhlIGFyZ3VtZW50cyB0aGF0IHlvdSBnaXZlIHRvXG4gICAgICogKm9mKiwgdGhlbiBjb21wbGV0ZXMuXG4gICAgICpcbiAgICAgKiBNYXJibGUgZGlhZ3JhbTpcbiAgICAgKlxuICAgICAqIGBgYHRleHRcbiAgICAgKiBvZigxLDIsMylcbiAgICAgKiAxMjN8XG4gICAgICogYGBgXG4gICAgICpcbiAgICAgKiBAZmFjdG9yeSB0cnVlXG4gICAgICogQHBhcmFtIGEgVGhlIGZpcnN0IHZhbHVlIHlvdSB3YW50IHRvIGVtaXQgYXMgYW4gZXZlbnQgb24gdGhlIHN0cmVhbS5cbiAgICAgKiBAcGFyYW0gYiBUaGUgc2Vjb25kIHZhbHVlIHlvdSB3YW50IHRvIGVtaXQgYXMgYW4gZXZlbnQgb24gdGhlIHN0cmVhbS4gT25lXG4gICAgICogb3IgbW9yZSBvZiB0aGVzZSB2YWx1ZXMgbWF5IGJlIGdpdmVuIGFzIGFyZ3VtZW50cy5cbiAgICAgKiBAcmV0dXJuIHtTdHJlYW19XG4gICAgICovXG4gICAgU3RyZWFtLm9mID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgaXRlbXMgPSBbXTtcbiAgICAgICAgZm9yICh2YXIgX2kgPSAwOyBfaSA8IGFyZ3VtZW50cy5sZW5ndGg7IF9pKyspIHtcbiAgICAgICAgICAgIGl0ZW1zW19pXSA9IGFyZ3VtZW50c1tfaV07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIFN0cmVhbS5mcm9tQXJyYXkoaXRlbXMpO1xuICAgIH07XG4gICAgLyoqXG4gICAgICogQ29udmVydHMgYW4gYXJyYXkgdG8gYSBzdHJlYW0uIFRoZSByZXR1cm5lZCBzdHJlYW0gd2lsbCBlbWl0IHN5bmNocm9ub3VzbHlcbiAgICAgKiBhbGwgdGhlIGl0ZW1zIGluIHRoZSBhcnJheSwgYW5kIHRoZW4gY29tcGxldGUuXG4gICAgICpcbiAgICAgKiBNYXJibGUgZGlhZ3JhbTpcbiAgICAgKlxuICAgICAqIGBgYHRleHRcbiAgICAgKiBmcm9tQXJyYXkoWzEsMiwzXSlcbiAgICAgKiAxMjN8XG4gICAgICogYGBgXG4gICAgICpcbiAgICAgKiBAZmFjdG9yeSB0cnVlXG4gICAgICogQHBhcmFtIHtBcnJheX0gYXJyYXkgVGhlIGFycmF5IHRvIGJlIGNvbnZlcnRlZCBhcyBhIHN0cmVhbS5cbiAgICAgKiBAcmV0dXJuIHtTdHJlYW19XG4gICAgICovXG4gICAgU3RyZWFtLmZyb21BcnJheSA9IGZ1bmN0aW9uIChhcnJheSkge1xuICAgICAgICByZXR1cm4gbmV3IFN0cmVhbShuZXcgRnJvbUFycmF5KGFycmF5KSk7XG4gICAgfTtcbiAgICAvKipcbiAgICAgKiBDb252ZXJ0cyBhIHByb21pc2UgdG8gYSBzdHJlYW0uIFRoZSByZXR1cm5lZCBzdHJlYW0gd2lsbCBlbWl0IHRoZSByZXNvbHZlZFxuICAgICAqIHZhbHVlIG9mIHRoZSBwcm9taXNlLCBhbmQgdGhlbiBjb21wbGV0ZS4gSG93ZXZlciwgaWYgdGhlIHByb21pc2UgaXNcbiAgICAgKiByZWplY3RlZCwgdGhlIHN0cmVhbSB3aWxsIGVtaXQgdGhlIGNvcnJlc3BvbmRpbmcgZXJyb3IuXG4gICAgICpcbiAgICAgKiBNYXJibGUgZGlhZ3JhbTpcbiAgICAgKlxuICAgICAqIGBgYHRleHRcbiAgICAgKiBmcm9tUHJvbWlzZSggLS0tLTQyIClcbiAgICAgKiAtLS0tLS0tLS0tLS0tLS0tLTQyfFxuICAgICAqIGBgYFxuICAgICAqXG4gICAgICogQGZhY3RvcnkgdHJ1ZVxuICAgICAqIEBwYXJhbSB7UHJvbWlzZUxpa2V9IHByb21pc2UgVGhlIHByb21pc2UgdG8gYmUgY29udmVydGVkIGFzIGEgc3RyZWFtLlxuICAgICAqIEByZXR1cm4ge1N0cmVhbX1cbiAgICAgKi9cbiAgICBTdHJlYW0uZnJvbVByb21pc2UgPSBmdW5jdGlvbiAocHJvbWlzZSkge1xuICAgICAgICByZXR1cm4gbmV3IFN0cmVhbShuZXcgRnJvbVByb21pc2UocHJvbWlzZSkpO1xuICAgIH07XG4gICAgLyoqXG4gICAgICogQ29udmVydHMgYW4gT2JzZXJ2YWJsZSBpbnRvIGEgU3RyZWFtLlxuICAgICAqXG4gICAgICogQGZhY3RvcnkgdHJ1ZVxuICAgICAqIEBwYXJhbSB7YW55fSBvYnNlcnZhYmxlIFRoZSBvYnNlcnZhYmxlIHRvIGJlIGNvbnZlcnRlZCBhcyBhIHN0cmVhbS5cbiAgICAgKiBAcmV0dXJuIHtTdHJlYW19XG4gICAgICovXG4gICAgU3RyZWFtLmZyb21PYnNlcnZhYmxlID0gZnVuY3Rpb24gKG9icykge1xuICAgICAgICBpZiAob2JzLmVuZFdoZW4pXG4gICAgICAgICAgICByZXR1cm4gb2JzO1xuICAgICAgICByZXR1cm4gbmV3IFN0cmVhbShuZXcgRnJvbU9ic2VydmFibGUob2JzKSk7XG4gICAgfTtcbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGEgc3RyZWFtIHRoYXQgcGVyaW9kaWNhbGx5IGVtaXRzIGluY3JlbWVudGFsIG51bWJlcnMsIGV2ZXJ5XG4gICAgICogYHBlcmlvZGAgbWlsbGlzZWNvbmRzLlxuICAgICAqXG4gICAgICogTWFyYmxlIGRpYWdyYW06XG4gICAgICpcbiAgICAgKiBgYGB0ZXh0XG4gICAgICogICAgIHBlcmlvZGljKDEwMDApXG4gICAgICogLS0tMC0tLTEtLS0yLS0tMy0tLTQtLS0uLi5cbiAgICAgKiBgYGBcbiAgICAgKlxuICAgICAqIEBmYWN0b3J5IHRydWVcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gcGVyaW9kIFRoZSBpbnRlcnZhbCBpbiBtaWxsaXNlY29uZHMgdG8gdXNlIGFzIGEgcmF0ZSBvZlxuICAgICAqIGVtaXNzaW9uLlxuICAgICAqIEByZXR1cm4ge1N0cmVhbX1cbiAgICAgKi9cbiAgICBTdHJlYW0ucGVyaW9kaWMgPSBmdW5jdGlvbiAocGVyaW9kKSB7XG4gICAgICAgIHJldHVybiBuZXcgU3RyZWFtKG5ldyBQZXJpb2RpYyhwZXJpb2QpKTtcbiAgICB9O1xuICAgIFN0cmVhbS5wcm90b3R5cGUuX21hcCA9IGZ1bmN0aW9uIChwcm9qZWN0KSB7XG4gICAgICAgIHJldHVybiBuZXcgKHRoaXMuY3RvcigpKShuZXcgTWFwT3AocHJvamVjdCwgdGhpcykpO1xuICAgIH07XG4gICAgLyoqXG4gICAgICogVHJhbnNmb3JtcyBlYWNoIGV2ZW50IGZyb20gdGhlIGlucHV0IFN0cmVhbSB0aHJvdWdoIGEgYHByb2plY3RgIGZ1bmN0aW9uLFxuICAgICAqIHRvIGdldCBhIFN0cmVhbSB0aGF0IGVtaXRzIHRob3NlIHRyYW5zZm9ybWVkIGV2ZW50cy5cbiAgICAgKlxuICAgICAqIE1hcmJsZSBkaWFncmFtOlxuICAgICAqXG4gICAgICogYGBgdGV4dFxuICAgICAqIC0tMS0tLTMtLTUtLS0tLTctLS0tLS1cbiAgICAgKiAgICBtYXAoaSA9PiBpICogMTApXG4gICAgICogLS0xMC0tMzAtNTAtLS0tNzAtLS0tLVxuICAgICAqIGBgYFxuICAgICAqXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gcHJvamVjdCBBIGZ1bmN0aW9uIG9mIHR5cGUgYCh0OiBUKSA9PiBVYCB0aGF0IHRha2VzIGV2ZW50XG4gICAgICogYHRgIG9mIHR5cGUgYFRgIGZyb20gdGhlIGlucHV0IFN0cmVhbSBhbmQgcHJvZHVjZXMgYW4gZXZlbnQgb2YgdHlwZSBgVWAsIHRvXG4gICAgICogYmUgZW1pdHRlZCBvbiB0aGUgb3V0cHV0IFN0cmVhbS5cbiAgICAgKiBAcmV0dXJuIHtTdHJlYW19XG4gICAgICovXG4gICAgU3RyZWFtLnByb3RvdHlwZS5tYXAgPSBmdW5jdGlvbiAocHJvamVjdCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fbWFwKHByb2plY3QpO1xuICAgIH07XG4gICAgLyoqXG4gICAgICogSXQncyBsaWtlIGBtYXBgLCBidXQgdHJhbnNmb3JtcyBlYWNoIGlucHV0IGV2ZW50IHRvIGFsd2F5cyB0aGUgc2FtZVxuICAgICAqIGNvbnN0YW50IHZhbHVlIG9uIHRoZSBvdXRwdXQgU3RyZWFtLlxuICAgICAqXG4gICAgICogTWFyYmxlIGRpYWdyYW06XG4gICAgICpcbiAgICAgKiBgYGB0ZXh0XG4gICAgICogLS0xLS0tMy0tNS0tLS0tNy0tLS0tXG4gICAgICogICAgICAgbWFwVG8oMTApXG4gICAgICogLS0xMC0tMTAtMTAtLS0tMTAtLS0tXG4gICAgICogYGBgXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcHJvamVjdGVkVmFsdWUgQSB2YWx1ZSB0byBlbWl0IG9uIHRoZSBvdXRwdXQgU3RyZWFtIHdoZW5ldmVyIHRoZVxuICAgICAqIGlucHV0IFN0cmVhbSBlbWl0cyBhbnkgdmFsdWUuXG4gICAgICogQHJldHVybiB7U3RyZWFtfVxuICAgICAqL1xuICAgIFN0cmVhbS5wcm90b3R5cGUubWFwVG8gPSBmdW5jdGlvbiAocHJvamVjdGVkVmFsdWUpIHtcbiAgICAgICAgdmFyIHMgPSB0aGlzLm1hcChmdW5jdGlvbiAoKSB7IHJldHVybiBwcm9qZWN0ZWRWYWx1ZTsgfSk7XG4gICAgICAgIHZhciBvcCA9IHMuX3Byb2Q7XG4gICAgICAgIG9wLnR5cGUgPSAnbWFwVG8nO1xuICAgICAgICByZXR1cm4gcztcbiAgICB9O1xuICAgIC8qKlxuICAgICAqIE9ubHkgYWxsb3dzIGV2ZW50cyB0aGF0IHBhc3MgdGhlIHRlc3QgZ2l2ZW4gYnkgdGhlIGBwYXNzZXNgIGFyZ3VtZW50LlxuICAgICAqXG4gICAgICogRWFjaCBldmVudCBmcm9tIHRoZSBpbnB1dCBzdHJlYW0gaXMgZ2l2ZW4gdG8gdGhlIGBwYXNzZXNgIGZ1bmN0aW9uLiBJZiB0aGVcbiAgICAgKiBmdW5jdGlvbiByZXR1cm5zIGB0cnVlYCwgdGhlIGV2ZW50IGlzIGZvcndhcmRlZCB0byB0aGUgb3V0cHV0IHN0cmVhbSxcbiAgICAgKiBvdGhlcndpc2UgaXQgaXMgaWdub3JlZCBhbmQgbm90IGZvcndhcmRlZC5cbiAgICAgKlxuICAgICAqIE1hcmJsZSBkaWFncmFtOlxuICAgICAqXG4gICAgICogYGBgdGV4dFxuICAgICAqIC0tMS0tLTItLTMtLS0tLTQtLS0tLTUtLS02LS03LTgtLVxuICAgICAqICAgICBmaWx0ZXIoaSA9PiBpICUgMiA9PT0gMClcbiAgICAgKiAtLS0tLS0yLS0tLS0tLS00LS0tLS0tLS0tNi0tLS04LS1cbiAgICAgKiBgYGBcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IHBhc3NlcyBBIGZ1bmN0aW9uIG9mIHR5cGUgYCh0OiBUKSArPiBib29sZWFuYCB0aGF0IHRha2VzXG4gICAgICogYW4gZXZlbnQgZnJvbSB0aGUgaW5wdXQgc3RyZWFtIGFuZCBjaGVja3MgaWYgaXQgcGFzc2VzLCBieSByZXR1cm5pbmcgYVxuICAgICAqIGJvb2xlYW4uXG4gICAgICogQHJldHVybiB7U3RyZWFtfVxuICAgICAqL1xuICAgIFN0cmVhbS5wcm90b3R5cGUuZmlsdGVyID0gZnVuY3Rpb24gKHBhc3Nlcykge1xuICAgICAgICB2YXIgcCA9IHRoaXMuX3Byb2Q7XG4gICAgICAgIGlmIChwIGluc3RhbmNlb2YgRmlsdGVyKVxuICAgICAgICAgICAgcmV0dXJuIG5ldyBTdHJlYW0obmV3IEZpbHRlcihhbmQocC5mLCBwYXNzZXMpLCBwLmlucykpO1xuICAgICAgICByZXR1cm4gbmV3IFN0cmVhbShuZXcgRmlsdGVyKHBhc3NlcywgdGhpcykpO1xuICAgIH07XG4gICAgLyoqXG4gICAgICogTGV0cyB0aGUgZmlyc3QgYGFtb3VudGAgbWFueSBldmVudHMgZnJvbSB0aGUgaW5wdXQgc3RyZWFtIHBhc3MgdG8gdGhlXG4gICAgICogb3V0cHV0IHN0cmVhbSwgdGhlbiBtYWtlcyB0aGUgb3V0cHV0IHN0cmVhbSBjb21wbGV0ZS5cbiAgICAgKlxuICAgICAqIE1hcmJsZSBkaWFncmFtOlxuICAgICAqXG4gICAgICogYGBgdGV4dFxuICAgICAqIC0tYS0tLWItLWMtLS0tZC0tLWUtLVxuICAgICAqICAgIHRha2UoMylcbiAgICAgKiAtLWEtLS1iLS1jfFxuICAgICAqIGBgYFxuICAgICAqXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGFtb3VudCBIb3cgbWFueSBldmVudHMgdG8gYWxsb3cgZnJvbSB0aGUgaW5wdXQgc3RyZWFtXG4gICAgICogYmVmb3JlIGNvbXBsZXRpbmcgdGhlIG91dHB1dCBzdHJlYW0uXG4gICAgICogQHJldHVybiB7U3RyZWFtfVxuICAgICAqL1xuICAgIFN0cmVhbS5wcm90b3R5cGUudGFrZSA9IGZ1bmN0aW9uIChhbW91bnQpIHtcbiAgICAgICAgcmV0dXJuIG5ldyAodGhpcy5jdG9yKCkpKG5ldyBUYWtlKGFtb3VudCwgdGhpcykpO1xuICAgIH07XG4gICAgLyoqXG4gICAgICogSWdub3JlcyB0aGUgZmlyc3QgYGFtb3VudGAgbWFueSBldmVudHMgZnJvbSB0aGUgaW5wdXQgc3RyZWFtLCBhbmQgdGhlblxuICAgICAqIGFmdGVyIHRoYXQgc3RhcnRzIGZvcndhcmRpbmcgZXZlbnRzIGZyb20gdGhlIGlucHV0IHN0cmVhbSB0byB0aGUgb3V0cHV0XG4gICAgICogc3RyZWFtLlxuICAgICAqXG4gICAgICogTWFyYmxlIGRpYWdyYW06XG4gICAgICpcbiAgICAgKiBgYGB0ZXh0XG4gICAgICogLS1hLS0tYi0tYy0tLS1kLS0tZS0tXG4gICAgICogICAgICAgZHJvcCgzKVxuICAgICAqIC0tLS0tLS0tLS0tLS0tZC0tLWUtLVxuICAgICAqIGBgYFxuICAgICAqXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGFtb3VudCBIb3cgbWFueSBldmVudHMgdG8gaWdub3JlIGZyb20gdGhlIGlucHV0IHN0cmVhbVxuICAgICAqIGJlZm9yZSBmb3J3YXJkaW5nIGFsbCBldmVudHMgZnJvbSB0aGUgaW5wdXQgc3RyZWFtIHRvIHRoZSBvdXRwdXQgc3RyZWFtLlxuICAgICAqIEByZXR1cm4ge1N0cmVhbX1cbiAgICAgKi9cbiAgICBTdHJlYW0ucHJvdG90eXBlLmRyb3AgPSBmdW5jdGlvbiAoYW1vdW50KSB7XG4gICAgICAgIHJldHVybiBuZXcgU3RyZWFtKG5ldyBEcm9wKGFtb3VudCwgdGhpcykpO1xuICAgIH07XG4gICAgLyoqXG4gICAgICogV2hlbiB0aGUgaW5wdXQgc3RyZWFtIGNvbXBsZXRlcywgdGhlIG91dHB1dCBzdHJlYW0gd2lsbCBlbWl0IHRoZSBsYXN0IGV2ZW50XG4gICAgICogZW1pdHRlZCBieSB0aGUgaW5wdXQgc3RyZWFtLCBhbmQgdGhlbiB3aWxsIGFsc28gY29tcGxldGUuXG4gICAgICpcbiAgICAgKiBNYXJibGUgZGlhZ3JhbTpcbiAgICAgKlxuICAgICAqIGBgYHRleHRcbiAgICAgKiAtLWEtLS1iLS1jLS1kLS0tLXxcbiAgICAgKiAgICAgICBsYXN0KClcbiAgICAgKiAtLS0tLS0tLS0tLS0tLS0tLWR8XG4gICAgICogYGBgXG4gICAgICpcbiAgICAgKiBAcmV0dXJuIHtTdHJlYW19XG4gICAgICovXG4gICAgU3RyZWFtLnByb3RvdHlwZS5sYXN0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gbmV3IFN0cmVhbShuZXcgTGFzdCh0aGlzKSk7XG4gICAgfTtcbiAgICAvKipcbiAgICAgKiBQcmVwZW5kcyB0aGUgZ2l2ZW4gYGluaXRpYWxgIHZhbHVlIHRvIHRoZSBzZXF1ZW5jZSBvZiBldmVudHMgZW1pdHRlZCBieSB0aGVcbiAgICAgKiBpbnB1dCBzdHJlYW0uIFRoZSByZXR1cm5lZCBzdHJlYW0gaXMgYSBNZW1vcnlTdHJlYW0sIHdoaWNoIG1lYW5zIGl0IGlzXG4gICAgICogYWxyZWFkeSBgcmVtZW1iZXIoKWAnZC5cbiAgICAgKlxuICAgICAqIE1hcmJsZSBkaWFncmFtOlxuICAgICAqXG4gICAgICogYGBgdGV4dFxuICAgICAqIC0tLTEtLS0yLS0tLS0zLS0tXG4gICAgICogICBzdGFydFdpdGgoMClcbiAgICAgKiAwLS0xLS0tMi0tLS0tMy0tLVxuICAgICAqIGBgYFxuICAgICAqXG4gICAgICogQHBhcmFtIGluaXRpYWwgVGhlIHZhbHVlIG9yIGV2ZW50IHRvIHByZXBlbmQuXG4gICAgICogQHJldHVybiB7TWVtb3J5U3RyZWFtfVxuICAgICAqL1xuICAgIFN0cmVhbS5wcm90b3R5cGUuc3RhcnRXaXRoID0gZnVuY3Rpb24gKGluaXRpYWwpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBNZW1vcnlTdHJlYW0obmV3IFN0YXJ0V2l0aCh0aGlzLCBpbml0aWFsKSk7XG4gICAgfTtcbiAgICAvKipcbiAgICAgKiBVc2VzIGFub3RoZXIgc3RyZWFtIHRvIGRldGVybWluZSB3aGVuIHRvIGNvbXBsZXRlIHRoZSBjdXJyZW50IHN0cmVhbS5cbiAgICAgKlxuICAgICAqIFdoZW4gdGhlIGdpdmVuIGBvdGhlcmAgc3RyZWFtIGVtaXRzIGFuIGV2ZW50IG9yIGNvbXBsZXRlcywgdGhlIG91dHB1dFxuICAgICAqIHN0cmVhbSB3aWxsIGNvbXBsZXRlLiBCZWZvcmUgdGhhdCBoYXBwZW5zLCB0aGUgb3V0cHV0IHN0cmVhbSB3aWxsIGJlaGF2ZXNcbiAgICAgKiBsaWtlIHRoZSBpbnB1dCBzdHJlYW0uXG4gICAgICpcbiAgICAgKiBNYXJibGUgZGlhZ3JhbTpcbiAgICAgKlxuICAgICAqIGBgYHRleHRcbiAgICAgKiAtLS0xLS0tMi0tLS0tMy0tNC0tLS01LS0tLTYtLS1cbiAgICAgKiAgIGVuZFdoZW4oIC0tLS0tLS0tYS0tYi0tfCApXG4gICAgICogLS0tMS0tLTItLS0tLTMtLTQtLXxcbiAgICAgKiBgYGBcbiAgICAgKlxuICAgICAqIEBwYXJhbSBvdGhlciBTb21lIG90aGVyIHN0cmVhbSB0aGF0IGlzIHVzZWQgdG8ga25vdyB3aGVuIHNob3VsZCB0aGUgb3V0cHV0XG4gICAgICogc3RyZWFtIG9mIHRoaXMgb3BlcmF0b3IgY29tcGxldGUuXG4gICAgICogQHJldHVybiB7U3RyZWFtfVxuICAgICAqL1xuICAgIFN0cmVhbS5wcm90b3R5cGUuZW5kV2hlbiA9IGZ1bmN0aW9uIChvdGhlcikge1xuICAgICAgICByZXR1cm4gbmV3ICh0aGlzLmN0b3IoKSkobmV3IEVuZFdoZW4ob3RoZXIsIHRoaXMpKTtcbiAgICB9O1xuICAgIC8qKlxuICAgICAqIFwiRm9sZHNcIiB0aGUgc3RyZWFtIG9udG8gaXRzZWxmLlxuICAgICAqXG4gICAgICogQ29tYmluZXMgZXZlbnRzIGZyb20gdGhlIHBhc3QgdGhyb3VnaG91dFxuICAgICAqIHRoZSBlbnRpcmUgZXhlY3V0aW9uIG9mIHRoZSBpbnB1dCBzdHJlYW0sIGFsbG93aW5nIHlvdSB0byBhY2N1bXVsYXRlIHRoZW1cbiAgICAgKiB0b2dldGhlci4gSXQncyBlc3NlbnRpYWxseSBsaWtlIGBBcnJheS5wcm90b3R5cGUucmVkdWNlYC4gVGhlIHJldHVybmVkXG4gICAgICogc3RyZWFtIGlzIGEgTWVtb3J5U3RyZWFtLCB3aGljaCBtZWFucyBpdCBpcyBhbHJlYWR5IGByZW1lbWJlcigpYCdkLlxuICAgICAqXG4gICAgICogVGhlIG91dHB1dCBzdHJlYW0gc3RhcnRzIGJ5IGVtaXR0aW5nIHRoZSBgc2VlZGAgd2hpY2ggeW91IGdpdmUgYXMgYXJndW1lbnQuXG4gICAgICogVGhlbiwgd2hlbiBhbiBldmVudCBoYXBwZW5zIG9uIHRoZSBpbnB1dCBzdHJlYW0sIGl0IGlzIGNvbWJpbmVkIHdpdGggdGhhdFxuICAgICAqIHNlZWQgdmFsdWUgdGhyb3VnaCB0aGUgYGFjY3VtdWxhdGVgIGZ1bmN0aW9uLCBhbmQgdGhlIG91dHB1dCB2YWx1ZSBpc1xuICAgICAqIGVtaXR0ZWQgb24gdGhlIG91dHB1dCBzdHJlYW0uIGBmb2xkYCByZW1lbWJlcnMgdGhhdCBvdXRwdXQgdmFsdWUgYXMgYGFjY2BcbiAgICAgKiAoXCJhY2N1bXVsYXRvclwiKSwgYW5kIHRoZW4gd2hlbiBhIG5ldyBpbnB1dCBldmVudCBgdGAgaGFwcGVucywgYGFjY2Agd2lsbCBiZVxuICAgICAqIGNvbWJpbmVkIHdpdGggdGhhdCB0byBwcm9kdWNlIHRoZSBuZXcgYGFjY2AgYW5kIHNvIGZvcnRoLlxuICAgICAqXG4gICAgICogTWFyYmxlIGRpYWdyYW06XG4gICAgICpcbiAgICAgKiBgYGB0ZXh0XG4gICAgICogLS0tLS0tMS0tLS0tMS0tMi0tLS0xLS0tLTEtLS0tLS1cbiAgICAgKiAgIGZvbGQoKGFjYywgeCkgPT4gYWNjICsgeCwgMylcbiAgICAgKiAzLS0tLS00LS0tLS01LS03LS0tLTgtLS0tOS0tLS0tLVxuICAgICAqIGBgYFxuICAgICAqXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gYWNjdW11bGF0ZSBBIGZ1bmN0aW9uIG9mIHR5cGUgYChhY2M6IFIsIHQ6IFQpID0+IFJgIHRoYXRcbiAgICAgKiB0YWtlcyB0aGUgcHJldmlvdXMgYWNjdW11bGF0ZWQgdmFsdWUgYGFjY2AgYW5kIHRoZSBpbmNvbWluZyBldmVudCBmcm9tIHRoZVxuICAgICAqIGlucHV0IHN0cmVhbSBhbmQgcHJvZHVjZXMgdGhlIG5ldyBhY2N1bXVsYXRlZCB2YWx1ZS5cbiAgICAgKiBAcGFyYW0gc2VlZCBUaGUgaW5pdGlhbCBhY2N1bXVsYXRlZCB2YWx1ZSwgb2YgdHlwZSBgUmAuXG4gICAgICogQHJldHVybiB7TWVtb3J5U3RyZWFtfVxuICAgICAqL1xuICAgIFN0cmVhbS5wcm90b3R5cGUuZm9sZCA9IGZ1bmN0aW9uIChhY2N1bXVsYXRlLCBzZWVkKSB7XG4gICAgICAgIHJldHVybiBuZXcgTWVtb3J5U3RyZWFtKG5ldyBGb2xkKGFjY3VtdWxhdGUsIHNlZWQsIHRoaXMpKTtcbiAgICB9O1xuICAgIC8qKlxuICAgICAqIFJlcGxhY2VzIGFuIGVycm9yIHdpdGggYW5vdGhlciBzdHJlYW0uXG4gICAgICpcbiAgICAgKiBXaGVuIChhbmQgaWYpIGFuIGVycm9yIGhhcHBlbnMgb24gdGhlIGlucHV0IHN0cmVhbSwgaW5zdGVhZCBvZiBmb3J3YXJkaW5nXG4gICAgICogdGhhdCBlcnJvciB0byB0aGUgb3V0cHV0IHN0cmVhbSwgKnJlcGxhY2VFcnJvciogd2lsbCBjYWxsIHRoZSBgcmVwbGFjZWBcbiAgICAgKiBmdW5jdGlvbiB3aGljaCByZXR1cm5zIHRoZSBzdHJlYW0gdGhhdCB0aGUgb3V0cHV0IHN0cmVhbSB3aWxsIHJlcGxpY2F0ZS5cbiAgICAgKiBBbmQsIGluIGNhc2UgdGhhdCBuZXcgc3RyZWFtIGFsc28gZW1pdHMgYW4gZXJyb3IsIGByZXBsYWNlYCB3aWxsIGJlIGNhbGxlZFxuICAgICAqIGFnYWluIHRvIGdldCBhbm90aGVyIHN0cmVhbSB0byBzdGFydCByZXBsaWNhdGluZy5cbiAgICAgKlxuICAgICAqIE1hcmJsZSBkaWFncmFtOlxuICAgICAqXG4gICAgICogYGBgdGV4dFxuICAgICAqIC0tMS0tLTItLS0tLTMtLTQtLS0tLVhcbiAgICAgKiAgIHJlcGxhY2VFcnJvciggKCkgPT4gLS0xMC0tfCApXG4gICAgICogLS0xLS0tMi0tLS0tMy0tNC0tLS0tLS0tMTAtLXxcbiAgICAgKiBgYGBcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IHJlcGxhY2UgQSBmdW5jdGlvbiBvZiB0eXBlIGAoZXJyKSA9PiBTdHJlYW1gIHRoYXQgdGFrZXNcbiAgICAgKiB0aGUgZXJyb3IgdGhhdCBvY2N1cnJlZCBvbiB0aGUgaW5wdXQgc3RyZWFtIG9yIG9uIHRoZSBwcmV2aW91cyByZXBsYWNlbWVudFxuICAgICAqIHN0cmVhbSBhbmQgcmV0dXJucyBhIG5ldyBzdHJlYW0uIFRoZSBvdXRwdXQgc3RyZWFtIHdpbGwgYmVoYXZlIGxpa2UgdGhlXG4gICAgICogc3RyZWFtIHRoYXQgdGhpcyBmdW5jdGlvbiByZXR1cm5zLlxuICAgICAqIEByZXR1cm4ge1N0cmVhbX1cbiAgICAgKi9cbiAgICBTdHJlYW0ucHJvdG90eXBlLnJlcGxhY2VFcnJvciA9IGZ1bmN0aW9uIChyZXBsYWNlKSB7XG4gICAgICAgIHJldHVybiBuZXcgKHRoaXMuY3RvcigpKShuZXcgUmVwbGFjZUVycm9yKHJlcGxhY2UsIHRoaXMpKTtcbiAgICB9O1xuICAgIC8qKlxuICAgICAqIEZsYXR0ZW5zIGEgXCJzdHJlYW0gb2Ygc3RyZWFtc1wiLCBoYW5kbGluZyBvbmx5IG9uZSBuZXN0ZWQgc3RyZWFtIGF0IGEgdGltZVxuICAgICAqIChubyBjb25jdXJyZW5jeSkuXG4gICAgICpcbiAgICAgKiBJZiB0aGUgaW5wdXQgc3RyZWFtIGlzIGEgc3RyZWFtIHRoYXQgZW1pdHMgc3RyZWFtcywgdGhlbiB0aGlzIG9wZXJhdG9yIHdpbGxcbiAgICAgKiByZXR1cm4gYW4gb3V0cHV0IHN0cmVhbSB3aGljaCBpcyBhIGZsYXQgc3RyZWFtOiBlbWl0cyByZWd1bGFyIGV2ZW50cy4gVGhlXG4gICAgICogZmxhdHRlbmluZyBoYXBwZW5zIHdpdGhvdXQgY29uY3VycmVuY3kuIEl0IHdvcmtzIGxpa2UgdGhpczogd2hlbiB0aGUgaW5wdXRcbiAgICAgKiBzdHJlYW0gZW1pdHMgYSBuZXN0ZWQgc3RyZWFtLCAqZmxhdHRlbiogd2lsbCBzdGFydCBpbWl0YXRpbmcgdGhhdCBuZXN0ZWRcbiAgICAgKiBvbmUuIEhvd2V2ZXIsIGFzIHNvb24gYXMgdGhlIG5leHQgbmVzdGVkIHN0cmVhbSBpcyBlbWl0dGVkIG9uIHRoZSBpbnB1dFxuICAgICAqIHN0cmVhbSwgKmZsYXR0ZW4qIHdpbGwgZm9yZ2V0IHRoZSBwcmV2aW91cyBuZXN0ZWQgb25lIGl0IHdhcyBpbWl0YXRpbmcsIGFuZFxuICAgICAqIHdpbGwgc3RhcnQgaW1pdGF0aW5nIHRoZSBuZXcgbmVzdGVkIG9uZS5cbiAgICAgKlxuICAgICAqIE1hcmJsZSBkaWFncmFtOlxuICAgICAqXG4gICAgICogYGBgdGV4dFxuICAgICAqIC0tKy0tLS0tLS0tKy0tLS0tLS0tLS0tLS0tLVxuICAgICAqICAgXFwgICAgICAgIFxcXG4gICAgICogICAgXFwgICAgICAgLS0tLTEtLS0tMi0tLTMtLVxuICAgICAqICAgIC0tYS0tYi0tLS1jLS0tLWQtLS0tLS0tLVxuICAgICAqICAgICAgICAgICBmbGF0dGVuXG4gICAgICogLS0tLS1hLS1iLS0tLS0tMS0tLS0yLS0tMy0tXG4gICAgICogYGBgXG4gICAgICpcbiAgICAgKiBAcmV0dXJuIHtTdHJlYW19XG4gICAgICovXG4gICAgU3RyZWFtLnByb3RvdHlwZS5mbGF0dGVuID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgcCA9IHRoaXMuX3Byb2Q7XG4gICAgICAgIHJldHVybiBuZXcgU3RyZWFtKG5ldyBGbGF0dGVuKHRoaXMpKTtcbiAgICB9O1xuICAgIC8qKlxuICAgICAqIFBhc3NlcyB0aGUgaW5wdXQgc3RyZWFtIHRvIGEgY3VzdG9tIG9wZXJhdG9yLCB0byBwcm9kdWNlIGFuIG91dHB1dCBzdHJlYW0uXG4gICAgICpcbiAgICAgKiAqY29tcG9zZSogaXMgYSBoYW5keSB3YXkgb2YgdXNpbmcgYW4gZXhpc3RpbmcgZnVuY3Rpb24gaW4gYSBjaGFpbmVkIHN0eWxlLlxuICAgICAqIEluc3RlYWQgb2Ygd3JpdGluZyBgb3V0U3RyZWFtID0gZihpblN0cmVhbSlgIHlvdSBjYW4gd3JpdGVcbiAgICAgKiBgb3V0U3RyZWFtID0gaW5TdHJlYW0uY29tcG9zZShmKWAuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBvcGVyYXRvciBBIGZ1bmN0aW9uIHRoYXQgdGFrZXMgYSBzdHJlYW0gYXMgaW5wdXQgYW5kXG4gICAgICogcmV0dXJucyBhIHN0cmVhbSBhcyB3ZWxsLlxuICAgICAqIEByZXR1cm4ge1N0cmVhbX1cbiAgICAgKi9cbiAgICBTdHJlYW0ucHJvdG90eXBlLmNvbXBvc2UgPSBmdW5jdGlvbiAob3BlcmF0b3IpIHtcbiAgICAgICAgcmV0dXJuIG9wZXJhdG9yKHRoaXMpO1xuICAgIH07XG4gICAgLyoqXG4gICAgICogUmV0dXJucyBhbiBvdXRwdXQgc3RyZWFtIHRoYXQgYmVoYXZlcyBsaWtlIHRoZSBpbnB1dCBzdHJlYW0sIGJ1dCBhbHNvXG4gICAgICogcmVtZW1iZXJzIHRoZSBtb3N0IHJlY2VudCBldmVudCB0aGF0IGhhcHBlbnMgb24gdGhlIGlucHV0IHN0cmVhbSwgc28gdGhhdCBhXG4gICAgICogbmV3bHkgYWRkZWQgbGlzdGVuZXIgd2lsbCBpbW1lZGlhdGVseSByZWNlaXZlIHRoYXQgbWVtb3Jpc2VkIGV2ZW50LlxuICAgICAqXG4gICAgICogQHJldHVybiB7TWVtb3J5U3RyZWFtfVxuICAgICAqL1xuICAgIFN0cmVhbS5wcm90b3R5cGUucmVtZW1iZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBuZXcgTWVtb3J5U3RyZWFtKG5ldyBSZW1lbWJlcih0aGlzKSk7XG4gICAgfTtcbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIGFuIG91dHB1dCBzdHJlYW0gdGhhdCBpZGVudGljYWxseSBiZWhhdmVzIGxpa2UgdGhlIGlucHV0IHN0cmVhbSxcbiAgICAgKiBidXQgYWxzbyBydW5zIGEgYHNweWAgZnVuY3Rpb24gZm8gZWFjaCBldmVudCwgdG8gaGVscCB5b3UgZGVidWcgeW91ciBhcHAuXG4gICAgICpcbiAgICAgKiAqZGVidWcqIHRha2VzIGEgYHNweWAgZnVuY3Rpb24gYXMgYXJndW1lbnQsIGFuZCBydW5zIHRoYXQgZm9yIGVhY2ggZXZlbnRcbiAgICAgKiBoYXBwZW5pbmcgb24gdGhlIGlucHV0IHN0cmVhbS4gSWYgeW91IGRvbid0IHByb3ZpZGUgdGhlIGBzcHlgIGFyZ3VtZW50LFxuICAgICAqIHRoZW4gKmRlYnVnKiB3aWxsIGp1c3QgYGNvbnNvbGUubG9nYCBlYWNoIGV2ZW50LiBUaGlzIGhlbHBzIHlvdSB0b1xuICAgICAqIHVuZGVyc3RhbmQgdGhlIGZsb3cgb2YgZXZlbnRzIHRocm91Z2ggc29tZSBvcGVyYXRvciBjaGFpbi5cbiAgICAgKlxuICAgICAqIFBsZWFzZSBub3RlIHRoYXQgaWYgdGhlIG91dHB1dCBzdHJlYW0gaGFzIG5vIGxpc3RlbmVycywgdGhlbiBpdCB3aWxsIG5vdFxuICAgICAqIHN0YXJ0LCB3aGljaCBtZWFucyBgc3B5YCB3aWxsIG5ldmVyIHJ1biBiZWNhdXNlIG5vIGFjdHVhbCBldmVudCBoYXBwZW5zIGluXG4gICAgICogdGhhdCBjYXNlLlxuICAgICAqXG4gICAgICogTWFyYmxlIGRpYWdyYW06XG4gICAgICpcbiAgICAgKiBgYGB0ZXh0XG4gICAgICogLS0xLS0tLTItLS0tLTMtLS0tLTQtLVxuICAgICAqICAgICAgICAgZGVidWdcbiAgICAgKiAtLTEtLS0tMi0tLS0tMy0tLS0tNC0tXG4gICAgICogYGBgXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBsYWJlbE9yU3B5IEEgc3RyaW5nIHRvIHVzZSBhcyB0aGUgbGFiZWwgd2hlbiBwcmludGluZ1xuICAgICAqIGRlYnVnIGluZm9ybWF0aW9uIG9uIHRoZSBjb25zb2xlLCBvciBhICdzcHknIGZ1bmN0aW9uIHRoYXQgdGFrZXMgYW4gZXZlbnRcbiAgICAgKiBhcyBhcmd1bWVudCwgYW5kIGRvZXMgbm90IG5lZWQgdG8gcmV0dXJuIGFueXRoaW5nLlxuICAgICAqIEByZXR1cm4ge1N0cmVhbX1cbiAgICAgKi9cbiAgICBTdHJlYW0ucHJvdG90eXBlLmRlYnVnID0gZnVuY3Rpb24gKGxhYmVsT3JTcHkpIHtcbiAgICAgICAgcmV0dXJuIG5ldyAodGhpcy5jdG9yKCkpKG5ldyBEZWJ1Zyh0aGlzLCBsYWJlbE9yU3B5KSk7XG4gICAgfTtcbiAgICAvKipcbiAgICAgKiAqaW1pdGF0ZSogY2hhbmdlcyB0aGlzIGN1cnJlbnQgU3RyZWFtIHRvIGVtaXQgdGhlIHNhbWUgZXZlbnRzIHRoYXQgdGhlXG4gICAgICogYG90aGVyYCBnaXZlbiBTdHJlYW0gZG9lcy4gVGhpcyBtZXRob2QgcmV0dXJucyBub3RoaW5nLlxuICAgICAqXG4gICAgICogVGhpcyBtZXRob2QgZXhpc3RzIHRvIGFsbG93IG9uZSB0aGluZzogKipjaXJjdWxhciBkZXBlbmRlbmN5IG9mIHN0cmVhbXMqKi5cbiAgICAgKiBGb3IgaW5zdGFuY2UsIGxldCdzIGltYWdpbmUgdGhhdCBmb3Igc29tZSByZWFzb24geW91IG5lZWQgdG8gY3JlYXRlIGFcbiAgICAgKiBjaXJjdWxhciBkZXBlbmRlbmN5IHdoZXJlIHN0cmVhbSBgZmlyc3QkYCBkZXBlbmRzIG9uIHN0cmVhbSBgc2Vjb25kJGBcbiAgICAgKiB3aGljaCBpbiB0dXJuIGRlcGVuZHMgb24gYGZpcnN0JGA6XG4gICAgICpcbiAgICAgKiA8IS0tIHNraXAtZXhhbXBsZSAtLT5cbiAgICAgKiBgYGBqc1xuICAgICAqIGltcG9ydCBkZWxheSBmcm9tICd4c3RyZWFtL2V4dHJhL2RlbGF5J1xuICAgICAqXG4gICAgICogdmFyIGZpcnN0JCA9IHNlY29uZCQubWFwKHggPT4geCAqIDEwKS50YWtlKDMpO1xuICAgICAqIHZhciBzZWNvbmQkID0gZmlyc3QkLm1hcCh4ID0+IHggKyAxKS5zdGFydFdpdGgoMSkuY29tcG9zZShkZWxheSgxMDApKTtcbiAgICAgKiBgYGBcbiAgICAgKlxuICAgICAqIEhvd2V2ZXIsIHRoYXQgaXMgaW52YWxpZCBKYXZhU2NyaXB0LCBiZWNhdXNlIGBzZWNvbmQkYCBpcyB1bmRlZmluZWRcbiAgICAgKiBvbiB0aGUgZmlyc3QgbGluZS4gVGhpcyBpcyBob3cgKmltaXRhdGUqIGNhbiBoZWxwIHNvbHZlIGl0OlxuICAgICAqXG4gICAgICogYGBganNcbiAgICAgKiBpbXBvcnQgZGVsYXkgZnJvbSAneHN0cmVhbS9leHRyYS9kZWxheSdcbiAgICAgKlxuICAgICAqIHZhciBzZWNvbmRQcm94eSQgPSB4cy5jcmVhdGUoKTtcbiAgICAgKiB2YXIgZmlyc3QkID0gc2Vjb25kUHJveHkkLm1hcCh4ID0+IHggKiAxMCkudGFrZSgzKTtcbiAgICAgKiB2YXIgc2Vjb25kJCA9IGZpcnN0JC5tYXAoeCA9PiB4ICsgMSkuc3RhcnRXaXRoKDEpLmNvbXBvc2UoZGVsYXkoMTAwKSk7XG4gICAgICogc2Vjb25kUHJveHkkLmltaXRhdGUoc2Vjb25kJCk7XG4gICAgICogYGBgXG4gICAgICpcbiAgICAgKiBXZSBjcmVhdGUgYHNlY29uZFByb3h5JGAgYmVmb3JlIHRoZSBvdGhlcnMsIHNvIGl0IGNhbiBiZSB1c2VkIGluIHRoZVxuICAgICAqIGRlY2xhcmF0aW9uIG9mIGBmaXJzdCRgLiBUaGVuLCBhZnRlciBib3RoIGBmaXJzdCRgIGFuZCBgc2Vjb25kJGAgYXJlXG4gICAgICogZGVmaW5lZCwgd2UgaG9vayBgc2Vjb25kUHJveHkkYCB3aXRoIGBzZWNvbmQkYCB3aXRoIGBpbWl0YXRlKClgIHRvIHRlbGxcbiAgICAgKiB0aGF0IHRoZXkgYXJlIFwidGhlIHNhbWVcIi4gYGltaXRhdGVgIHdpbGwgbm90IHRyaWdnZXIgdGhlIHN0YXJ0IG9mIGFueVxuICAgICAqIHN0cmVhbSwgaXQganVzdCBiaW5kcyBgc2Vjb25kUHJveHkkYCBhbmQgYHNlY29uZCRgIHRvZ2V0aGVyLlxuICAgICAqXG4gICAgICogVGhlIGZvbGxvd2luZyBpcyBhbiBleGFtcGxlIHdoZXJlIGBpbWl0YXRlKClgIGlzIGltcG9ydGFudCBpbiBDeWNsZS5qc1xuICAgICAqIGFwcGxpY2F0aW9ucy4gQSBwYXJlbnQgY29tcG9uZW50IGNvbnRhaW5zIHNvbWUgY2hpbGQgY29tcG9uZW50cy4gQSBjaGlsZFxuICAgICAqIGhhcyBhbiBhY3Rpb24gc3RyZWFtIHdoaWNoIGlzIGdpdmVuIHRvIHRoZSBwYXJlbnQgdG8gZGVmaW5lIGl0cyBzdGF0ZTpcbiAgICAgKlxuICAgICAqIDwhLS0gc2tpcC1leGFtcGxlIC0tPlxuICAgICAqIGBgYGpzXG4gICAgICogY29uc3QgY2hpbGRBY3Rpb25Qcm94eSQgPSB4cy5jcmVhdGUoKTtcbiAgICAgKiBjb25zdCBwYXJlbnQgPSBQYXJlbnQoey4uLnNvdXJjZXMsIGNoaWxkQWN0aW9uJDogY2hpbGRBY3Rpb25Qcm94eSR9KTtcbiAgICAgKiBjb25zdCBjaGlsZEFjdGlvbiQgPSBwYXJlbnQuc3RhdGUkLm1hcChzID0+IHMuY2hpbGQuYWN0aW9uJCkuZmxhdHRlbigpO1xuICAgICAqIGNoaWxkQWN0aW9uUHJveHkkLmltaXRhdGUoY2hpbGRBY3Rpb24kKTtcbiAgICAgKiBgYGBcbiAgICAgKlxuICAgICAqIE5vdGUsIHRob3VnaCwgdGhhdCAqKmBpbWl0YXRlKClgIGRvZXMgbm90IHN1cHBvcnQgTWVtb3J5U3RyZWFtcyoqLiBJZiB3ZVxuICAgICAqIHdvdWxkIGF0dGVtcHQgdG8gaW1pdGF0ZSBhIE1lbW9yeVN0cmVhbSBpbiBhIGNpcmN1bGFyIGRlcGVuZGVuY3ksIHdlIHdvdWxkXG4gICAgICogZWl0aGVyIGdldCBhIHJhY2UgY29uZGl0aW9uICh3aGVyZSB0aGUgc3ltcHRvbSB3b3VsZCBiZSBcIm5vdGhpbmcgaGFwcGVuc1wiKVxuICAgICAqIG9yIGFuIGluZmluaXRlIGN5Y2xpYyBlbWlzc2lvbiBvZiB2YWx1ZXMuIEl0J3MgdXNlZnVsIHRvIHRoaW5rIGFib3V0XG4gICAgICogTWVtb3J5U3RyZWFtcyBhcyBjZWxscyBpbiBhIHNwcmVhZHNoZWV0LiBJdCBkb2Vzbid0IG1ha2UgYW55IHNlbnNlIHRvXG4gICAgICogZGVmaW5lIGEgc3ByZWFkc2hlZXQgY2VsbCBgQTFgIHdpdGggYSBmb3JtdWxhIHRoYXQgZGVwZW5kcyBvbiBgQjFgIGFuZFxuICAgICAqIGNlbGwgYEIxYCBkZWZpbmVkIHdpdGggYSBmb3JtdWxhIHRoYXQgZGVwZW5kcyBvbiBgQTFgLlxuICAgICAqXG4gICAgICogSWYgeW91IGZpbmQgeW91cnNlbGYgd2FudGluZyB0byB1c2UgYGltaXRhdGUoKWAgd2l0aCBhXG4gICAgICogTWVtb3J5U3RyZWFtLCB5b3Ugc2hvdWxkIHJld29yayB5b3VyIGNvZGUgYXJvdW5kIGBpbWl0YXRlKClgIHRvIHVzZSBhXG4gICAgICogU3RyZWFtIGluc3RlYWQuIExvb2sgZm9yIHRoZSBzdHJlYW0gaW4gdGhlIGNpcmN1bGFyIGRlcGVuZGVuY3kgdGhhdFxuICAgICAqIHJlcHJlc2VudHMgYW4gZXZlbnQgc3RyZWFtLCBhbmQgdGhhdCB3b3VsZCBiZSBhIGNhbmRpZGF0ZSBmb3IgY3JlYXRpbmcgYVxuICAgICAqIHByb3h5IFN0cmVhbSB3aGljaCB0aGVuIGltaXRhdGVzIHRoZSB0YXJnZXQgU3RyZWFtLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtTdHJlYW19IHRhcmdldCBUaGUgb3RoZXIgc3RyZWFtIHRvIGltaXRhdGUgb24gdGhlIGN1cnJlbnQgb25lLiBNdXN0XG4gICAgICogbm90IGJlIGEgTWVtb3J5U3RyZWFtLlxuICAgICAqL1xuICAgIFN0cmVhbS5wcm90b3R5cGUuaW1pdGF0ZSA9IGZ1bmN0aW9uICh0YXJnZXQpIHtcbiAgICAgICAgaWYgKHRhcmdldCBpbnN0YW5jZW9mIE1lbW9yeVN0cmVhbSlcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignQSBNZW1vcnlTdHJlYW0gd2FzIGdpdmVuIHRvIGltaXRhdGUoKSwgYnV0IGl0IG9ubHkgJyArXG4gICAgICAgICAgICAgICAgJ3N1cHBvcnRzIGEgU3RyZWFtLiBSZWFkIG1vcmUgYWJvdXQgdGhpcyByZXN0cmljdGlvbiBoZXJlOiAnICtcbiAgICAgICAgICAgICAgICAnaHR0cHM6Ly9naXRodWIuY29tL3N0YWx0ei94c3RyZWFtI2ZhcScpO1xuICAgICAgICB0aGlzLl90YXJnZXQgPSB0YXJnZXQ7XG4gICAgICAgIGZvciAodmFyIGlscyA9IHRoaXMuX2lscywgTiA9IGlscy5sZW5ndGgsIGkgPSAwOyBpIDwgTjsgaSsrKVxuICAgICAgICAgICAgdGFyZ2V0Ll9hZGQoaWxzW2ldKTtcbiAgICAgICAgdGhpcy5faWxzID0gW107XG4gICAgfTtcbiAgICAvKipcbiAgICAgKiBGb3JjZXMgdGhlIFN0cmVhbSB0byBlbWl0IHRoZSBnaXZlbiB2YWx1ZSB0byBpdHMgbGlzdGVuZXJzLlxuICAgICAqXG4gICAgICogQXMgdGhlIG5hbWUgaW5kaWNhdGVzLCBpZiB5b3UgdXNlIHRoaXMsIHlvdSBhcmUgbW9zdCBsaWtlbHkgZG9pbmcgc29tZXRoaW5nXG4gICAgICogVGhlIFdyb25nIFdheS4gUGxlYXNlIHRyeSB0byB1bmRlcnN0YW5kIHRoZSByZWFjdGl2ZSB3YXkgYmVmb3JlIHVzaW5nIHRoaXNcbiAgICAgKiBtZXRob2QuIFVzZSBpdCBvbmx5IHdoZW4geW91IGtub3cgd2hhdCB5b3UgYXJlIGRvaW5nLlxuICAgICAqXG4gICAgICogQHBhcmFtIHZhbHVlIFRoZSBcIm5leHRcIiB2YWx1ZSB5b3Ugd2FudCB0byBicm9hZGNhc3QgdG8gYWxsIGxpc3RlbmVycyBvZlxuICAgICAqIHRoaXMgU3RyZWFtLlxuICAgICAqL1xuICAgIFN0cmVhbS5wcm90b3R5cGUuc2hhbWVmdWxseVNlbmROZXh0ID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIHRoaXMuX24odmFsdWUpO1xuICAgIH07XG4gICAgLyoqXG4gICAgICogRm9yY2VzIHRoZSBTdHJlYW0gdG8gZW1pdCB0aGUgZ2l2ZW4gZXJyb3IgdG8gaXRzIGxpc3RlbmVycy5cbiAgICAgKlxuICAgICAqIEFzIHRoZSBuYW1lIGluZGljYXRlcywgaWYgeW91IHVzZSB0aGlzLCB5b3UgYXJlIG1vc3QgbGlrZWx5IGRvaW5nIHNvbWV0aGluZ1xuICAgICAqIFRoZSBXcm9uZyBXYXkuIFBsZWFzZSB0cnkgdG8gdW5kZXJzdGFuZCB0aGUgcmVhY3RpdmUgd2F5IGJlZm9yZSB1c2luZyB0aGlzXG4gICAgICogbWV0aG9kLiBVc2UgaXQgb25seSB3aGVuIHlvdSBrbm93IHdoYXQgeW91IGFyZSBkb2luZy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7YW55fSBlcnJvciBUaGUgZXJyb3IgeW91IHdhbnQgdG8gYnJvYWRjYXN0IHRvIGFsbCB0aGUgbGlzdGVuZXJzIG9mXG4gICAgICogdGhpcyBTdHJlYW0uXG4gICAgICovXG4gICAgU3RyZWFtLnByb3RvdHlwZS5zaGFtZWZ1bGx5U2VuZEVycm9yID0gZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgICAgIHRoaXMuX2UoZXJyb3IpO1xuICAgIH07XG4gICAgLyoqXG4gICAgICogRm9yY2VzIHRoZSBTdHJlYW0gdG8gZW1pdCB0aGUgXCJjb21wbGV0ZWRcIiBldmVudCB0byBpdHMgbGlzdGVuZXJzLlxuICAgICAqXG4gICAgICogQXMgdGhlIG5hbWUgaW5kaWNhdGVzLCBpZiB5b3UgdXNlIHRoaXMsIHlvdSBhcmUgbW9zdCBsaWtlbHkgZG9pbmcgc29tZXRoaW5nXG4gICAgICogVGhlIFdyb25nIFdheS4gUGxlYXNlIHRyeSB0byB1bmRlcnN0YW5kIHRoZSByZWFjdGl2ZSB3YXkgYmVmb3JlIHVzaW5nIHRoaXNcbiAgICAgKiBtZXRob2QuIFVzZSBpdCBvbmx5IHdoZW4geW91IGtub3cgd2hhdCB5b3UgYXJlIGRvaW5nLlxuICAgICAqL1xuICAgIFN0cmVhbS5wcm90b3R5cGUuc2hhbWVmdWxseVNlbmRDb21wbGV0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5fYygpO1xuICAgIH07XG4gICAgLyoqXG4gICAgICogQWRkcyBhIFwiZGVidWdcIiBsaXN0ZW5lciB0byB0aGUgc3RyZWFtLiBUaGVyZSBjYW4gb25seSBiZSBvbmUgZGVidWdcbiAgICAgKiBsaXN0ZW5lciwgdGhhdCdzIHdoeSB0aGlzIGlzICdzZXREZWJ1Z0xpc3RlbmVyJy4gVG8gcmVtb3ZlIHRoZSBkZWJ1Z1xuICAgICAqIGxpc3RlbmVyLCBqdXN0IGNhbGwgc2V0RGVidWdMaXN0ZW5lcihudWxsKS5cbiAgICAgKlxuICAgICAqIEEgZGVidWcgbGlzdGVuZXIgaXMgbGlrZSBhbnkgb3RoZXIgbGlzdGVuZXIuIFRoZSBvbmx5IGRpZmZlcmVuY2UgaXMgdGhhdCBhXG4gICAgICogZGVidWcgbGlzdGVuZXIgaXMgXCJzdGVhbHRoeVwiOiBpdHMgcHJlc2VuY2UvYWJzZW5jZSBkb2VzIG5vdCB0cmlnZ2VyIHRoZVxuICAgICAqIHN0YXJ0L3N0b3Agb2YgdGhlIHN0cmVhbSAob3IgdGhlIHByb2R1Y2VyIGluc2lkZSB0aGUgc3RyZWFtKS4gVGhpcyBpc1xuICAgICAqIHVzZWZ1bCBzbyB5b3UgY2FuIGluc3BlY3Qgd2hhdCBpcyBnb2luZyBvbiB3aXRob3V0IGNoYW5naW5nIHRoZSBiZWhhdmlvclxuICAgICAqIG9mIHRoZSBwcm9ncmFtLiBJZiB5b3UgaGF2ZSBhbiBpZGxlIHN0cmVhbSBhbmQgeW91IGFkZCBhIG5vcm1hbCBsaXN0ZW5lciB0b1xuICAgICAqIGl0LCB0aGUgc3RyZWFtIHdpbGwgc3RhcnQgZXhlY3V0aW5nLiBCdXQgaWYgeW91IHNldCBhIGRlYnVnIGxpc3RlbmVyIG9uIGFuXG4gICAgICogaWRsZSBzdHJlYW0sIGl0IHdvbid0IHN0YXJ0IGV4ZWN1dGluZyAobm90IHVudGlsIHRoZSBmaXJzdCBub3JtYWwgbGlzdGVuZXJcbiAgICAgKiBpcyBhZGRlZCkuXG4gICAgICpcbiAgICAgKiBBcyB0aGUgbmFtZSBpbmRpY2F0ZXMsIHdlIGRvbid0IHJlY29tbWVuZCB1c2luZyB0aGlzIG1ldGhvZCB0byBidWlsZCBhcHBcbiAgICAgKiBsb2dpYy4gSW4gZmFjdCwgaW4gbW9zdCBjYXNlcyB0aGUgZGVidWcgb3BlcmF0b3Igd29ya3MganVzdCBmaW5lLiBPbmx5IHVzZVxuICAgICAqIHRoaXMgb25lIGlmIHlvdSBrbm93IHdoYXQgeW91J3JlIGRvaW5nLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtMaXN0ZW5lcjxUPn0gbGlzdGVuZXJcbiAgICAgKi9cbiAgICBTdHJlYW0ucHJvdG90eXBlLnNldERlYnVnTGlzdGVuZXIgPSBmdW5jdGlvbiAobGlzdGVuZXIpIHtcbiAgICAgICAgaWYgKCFsaXN0ZW5lcikge1xuICAgICAgICAgICAgdGhpcy5fZCA9IGZhbHNlO1xuICAgICAgICAgICAgdGhpcy5fZGwgPSBOTztcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX2QgPSB0cnVlO1xuICAgICAgICAgICAgbGlzdGVuZXIuX24gPSBsaXN0ZW5lci5uZXh0IHx8IG5vb3A7XG4gICAgICAgICAgICBsaXN0ZW5lci5fZSA9IGxpc3RlbmVyLmVycm9yIHx8IG5vb3A7XG4gICAgICAgICAgICBsaXN0ZW5lci5fYyA9IGxpc3RlbmVyLmNvbXBsZXRlIHx8IG5vb3A7XG4gICAgICAgICAgICB0aGlzLl9kbCA9IGxpc3RlbmVyO1xuICAgICAgICB9XG4gICAgfTtcbiAgICByZXR1cm4gU3RyZWFtO1xufSgpKTtcbi8qKlxuICogQmxlbmRzIG11bHRpcGxlIHN0cmVhbXMgdG9nZXRoZXIsIGVtaXR0aW5nIGV2ZW50cyBmcm9tIGFsbCBvZiB0aGVtXG4gKiBjb25jdXJyZW50bHkuXG4gKlxuICogKm1lcmdlKiB0YWtlcyBtdWx0aXBsZSBzdHJlYW1zIGFzIGFyZ3VtZW50cywgYW5kIGNyZWF0ZXMgYSBzdHJlYW0gdGhhdFxuICogYmVoYXZlcyBsaWtlIGVhY2ggb2YgdGhlIGFyZ3VtZW50IHN0cmVhbXMsIGluIHBhcmFsbGVsLlxuICpcbiAqIE1hcmJsZSBkaWFncmFtOlxuICpcbiAqIGBgYHRleHRcbiAqIC0tMS0tLS0yLS0tLS0zLS0tLS0tLS00LS0tXG4gKiAtLS0tYS0tLS0tYi0tLS1jLS0tZC0tLS0tLVxuICogICAgICAgICAgICBtZXJnZVxuICogLS0xLWEtLTItLWItLTMtYy0tLWQtLTQtLS1cbiAqIGBgYFxuICpcbiAqIEBmYWN0b3J5IHRydWVcbiAqIEBwYXJhbSB7U3RyZWFtfSBzdHJlYW0xIEEgc3RyZWFtIHRvIG1lcmdlIHRvZ2V0aGVyIHdpdGggb3RoZXIgc3RyZWFtcy5cbiAqIEBwYXJhbSB7U3RyZWFtfSBzdHJlYW0yIEEgc3RyZWFtIHRvIG1lcmdlIHRvZ2V0aGVyIHdpdGggb3RoZXIgc3RyZWFtcy4gVHdvXG4gKiBvciBtb3JlIHN0cmVhbXMgbWF5IGJlIGdpdmVuIGFzIGFyZ3VtZW50cy5cbiAqIEByZXR1cm4ge1N0cmVhbX1cbiAqL1xuU3RyZWFtLm1lcmdlID0gZnVuY3Rpb24gbWVyZ2UoKSB7XG4gICAgdmFyIHN0cmVhbXMgPSBbXTtcbiAgICBmb3IgKHZhciBfaSA9IDA7IF9pIDwgYXJndW1lbnRzLmxlbmd0aDsgX2krKykge1xuICAgICAgICBzdHJlYW1zW19pXSA9IGFyZ3VtZW50c1tfaV07XG4gICAgfVxuICAgIHJldHVybiBuZXcgU3RyZWFtKG5ldyBNZXJnZShzdHJlYW1zKSk7XG59O1xuLyoqXG4gKiBDb21iaW5lcyBtdWx0aXBsZSBpbnB1dCBzdHJlYW1zIHRvZ2V0aGVyIHRvIHJldHVybiBhIHN0cmVhbSB3aG9zZSBldmVudHNcbiAqIGFyZSBhcnJheXMgdGhhdCBjb2xsZWN0IHRoZSBsYXRlc3QgZXZlbnRzIGZyb20gZWFjaCBpbnB1dCBzdHJlYW0uXG4gKlxuICogKmNvbWJpbmUqIGludGVybmFsbHkgcmVtZW1iZXJzIHRoZSBtb3N0IHJlY2VudCBldmVudCBmcm9tIGVhY2ggb2YgdGhlIGlucHV0XG4gKiBzdHJlYW1zLiBXaGVuIGFueSBvZiB0aGUgaW5wdXQgc3RyZWFtcyBlbWl0cyBhbiBldmVudCwgdGhhdCBldmVudCB0b2dldGhlclxuICogd2l0aCBhbGwgdGhlIG90aGVyIHNhdmVkIGV2ZW50cyBhcmUgY29tYmluZWQgaW50byBhbiBhcnJheS4gVGhhdCBhcnJheSB3aWxsXG4gKiBiZSBlbWl0dGVkIG9uIHRoZSBvdXRwdXQgc3RyZWFtLiBJdCdzIGVzc2VudGlhbGx5IGEgd2F5IG9mIGpvaW5pbmcgdG9nZXRoZXJcbiAqIHRoZSBldmVudHMgZnJvbSBtdWx0aXBsZSBzdHJlYW1zLlxuICpcbiAqIE1hcmJsZSBkaWFncmFtOlxuICpcbiAqIGBgYHRleHRcbiAqIC0tMS0tLS0yLS0tLS0zLS0tLS0tLS00LS0tXG4gKiAtLS0tYS0tLS0tYi0tLS0tYy0tZC0tLS0tLVxuICogICAgICAgICAgY29tYmluZVxuICogLS0tLTFhLTJhLTJiLTNiLTNjLTNkLTRkLS1cbiAqIGBgYFxuICpcbiAqIE5vdGU6IHRvIG1pbmltaXplIGdhcmJhZ2UgY29sbGVjdGlvbiwgKmNvbWJpbmUqIHVzZXMgdGhlIHNhbWUgYXJyYXlcbiAqIGluc3RhbmNlIGZvciBlYWNoIGVtaXNzaW9uLiAgSWYgeW91IG5lZWQgdG8gY29tcGFyZSBlbWlzc2lvbnMgb3ZlciB0aW1lLFxuICogY2FjaGUgdGhlIHZhbHVlcyB3aXRoIGBtYXBgIGZpcnN0OlxuICpcbiAqIGBgYGpzXG4gKiBpbXBvcnQgcGFpcndpc2UgZnJvbSAneHN0cmVhbS9leHRyYS9wYWlyd2lzZSdcbiAqXG4gKiBjb25zdCBzdHJlYW0xID0geHMub2YoMSk7XG4gKiBjb25zdCBzdHJlYW0yID0geHMub2YoMik7XG4gKlxuICogeHMuY29tYmluZShzdHJlYW0xLCBzdHJlYW0yKS5tYXAoXG4gKiAgIGNvbWJpbmVkRW1pc3Npb25zID0+IChbIC4uLmNvbWJpbmVkRW1pc3Npb25zIF0pXG4gKiApLmNvbXBvc2UocGFpcndpc2UpXG4gKiBgYGBcbiAqXG4gKiBAZmFjdG9yeSB0cnVlXG4gKiBAcGFyYW0ge1N0cmVhbX0gc3RyZWFtMSBBIHN0cmVhbSB0byBjb21iaW5lIHRvZ2V0aGVyIHdpdGggb3RoZXIgc3RyZWFtcy5cbiAqIEBwYXJhbSB7U3RyZWFtfSBzdHJlYW0yIEEgc3RyZWFtIHRvIGNvbWJpbmUgdG9nZXRoZXIgd2l0aCBvdGhlciBzdHJlYW1zLlxuICogTXVsdGlwbGUgc3RyZWFtcywgbm90IGp1c3QgdHdvLCBtYXkgYmUgZ2l2ZW4gYXMgYXJndW1lbnRzLlxuICogQHJldHVybiB7U3RyZWFtfVxuICovXG5TdHJlYW0uY29tYmluZSA9IGZ1bmN0aW9uIGNvbWJpbmUoKSB7XG4gICAgdmFyIHN0cmVhbXMgPSBbXTtcbiAgICBmb3IgKHZhciBfaSA9IDA7IF9pIDwgYXJndW1lbnRzLmxlbmd0aDsgX2krKykge1xuICAgICAgICBzdHJlYW1zW19pXSA9IGFyZ3VtZW50c1tfaV07XG4gICAgfVxuICAgIHJldHVybiBuZXcgU3RyZWFtKG5ldyBDb21iaW5lKHN0cmVhbXMpKTtcbn07XG5leHBvcnRzLlN0cmVhbSA9IFN0cmVhbTtcbnZhciBNZW1vcnlTdHJlYW0gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhNZW1vcnlTdHJlYW0sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gTWVtb3J5U3RyZWFtKHByb2R1Y2VyKSB7XG4gICAgICAgIHZhciBfdGhpcyA9IF9zdXBlci5jYWxsKHRoaXMsIHByb2R1Y2VyKSB8fCB0aGlzO1xuICAgICAgICBfdGhpcy5faGFzID0gZmFsc2U7XG4gICAgICAgIHJldHVybiBfdGhpcztcbiAgICB9XG4gICAgTWVtb3J5U3RyZWFtLnByb3RvdHlwZS5fbiA9IGZ1bmN0aW9uICh4KSB7XG4gICAgICAgIHRoaXMuX3YgPSB4O1xuICAgICAgICB0aGlzLl9oYXMgPSB0cnVlO1xuICAgICAgICBfc3VwZXIucHJvdG90eXBlLl9uLmNhbGwodGhpcywgeCk7XG4gICAgfTtcbiAgICBNZW1vcnlTdHJlYW0ucHJvdG90eXBlLl9hZGQgPSBmdW5jdGlvbiAoaWwpIHtcbiAgICAgICAgdmFyIHRhID0gdGhpcy5fdGFyZ2V0O1xuICAgICAgICBpZiAodGEgIT09IE5PKVxuICAgICAgICAgICAgcmV0dXJuIHRhLl9hZGQoaWwpO1xuICAgICAgICB2YXIgYSA9IHRoaXMuX2lscztcbiAgICAgICAgYS5wdXNoKGlsKTtcbiAgICAgICAgaWYgKGEubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgaWYgKHRoaXMuX2hhcylcbiAgICAgICAgICAgICAgICBpbC5fbih0aGlzLl92KTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5fc3RvcElEICE9PSBOTykge1xuICAgICAgICAgICAgaWYgKHRoaXMuX2hhcylcbiAgICAgICAgICAgICAgICBpbC5fbih0aGlzLl92KTtcbiAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aGlzLl9zdG9wSUQpO1xuICAgICAgICAgICAgdGhpcy5fc3RvcElEID0gTk87XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAodGhpcy5faGFzKVxuICAgICAgICAgICAgaWwuX24odGhpcy5fdik7XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdmFyIHAgPSB0aGlzLl9wcm9kO1xuICAgICAgICAgICAgaWYgKHAgIT09IE5PKVxuICAgICAgICAgICAgICAgIHAuX3N0YXJ0KHRoaXMpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBNZW1vcnlTdHJlYW0ucHJvdG90eXBlLl9zdG9wTm93ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl9oYXMgPSBmYWxzZTtcbiAgICAgICAgX3N1cGVyLnByb3RvdHlwZS5fc3RvcE5vdy5jYWxsKHRoaXMpO1xuICAgIH07XG4gICAgTWVtb3J5U3RyZWFtLnByb3RvdHlwZS5feCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5faGFzID0gZmFsc2U7XG4gICAgICAgIF9zdXBlci5wcm90b3R5cGUuX3guY2FsbCh0aGlzKTtcbiAgICB9O1xuICAgIE1lbW9yeVN0cmVhbS5wcm90b3R5cGUubWFwID0gZnVuY3Rpb24gKHByb2plY3QpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX21hcChwcm9qZWN0KTtcbiAgICB9O1xuICAgIE1lbW9yeVN0cmVhbS5wcm90b3R5cGUubWFwVG8gPSBmdW5jdGlvbiAocHJvamVjdGVkVmFsdWUpIHtcbiAgICAgICAgcmV0dXJuIF9zdXBlci5wcm90b3R5cGUubWFwVG8uY2FsbCh0aGlzLCBwcm9qZWN0ZWRWYWx1ZSk7XG4gICAgfTtcbiAgICBNZW1vcnlTdHJlYW0ucHJvdG90eXBlLnRha2UgPSBmdW5jdGlvbiAoYW1vdW50KSB7XG4gICAgICAgIHJldHVybiBfc3VwZXIucHJvdG90eXBlLnRha2UuY2FsbCh0aGlzLCBhbW91bnQpO1xuICAgIH07XG4gICAgTWVtb3J5U3RyZWFtLnByb3RvdHlwZS5lbmRXaGVuID0gZnVuY3Rpb24gKG90aGVyKSB7XG4gICAgICAgIHJldHVybiBfc3VwZXIucHJvdG90eXBlLmVuZFdoZW4uY2FsbCh0aGlzLCBvdGhlcik7XG4gICAgfTtcbiAgICBNZW1vcnlTdHJlYW0ucHJvdG90eXBlLnJlcGxhY2VFcnJvciA9IGZ1bmN0aW9uIChyZXBsYWNlKSB7XG4gICAgICAgIHJldHVybiBfc3VwZXIucHJvdG90eXBlLnJlcGxhY2VFcnJvci5jYWxsKHRoaXMsIHJlcGxhY2UpO1xuICAgIH07XG4gICAgTWVtb3J5U3RyZWFtLnByb3RvdHlwZS5yZW1lbWJlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcbiAgICBNZW1vcnlTdHJlYW0ucHJvdG90eXBlLmRlYnVnID0gZnVuY3Rpb24gKGxhYmVsT3JTcHkpIHtcbiAgICAgICAgcmV0dXJuIF9zdXBlci5wcm90b3R5cGUuZGVidWcuY2FsbCh0aGlzLCBsYWJlbE9yU3B5KTtcbiAgICB9O1xuICAgIHJldHVybiBNZW1vcnlTdHJlYW07XG59KFN0cmVhbSkpO1xuZXhwb3J0cy5NZW1vcnlTdHJlYW0gPSBNZW1vcnlTdHJlYW07XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XG5leHBvcnRzLmRlZmF1bHQgPSBTdHJlYW07XG4vLyMgc291cmNlTWFwcGluZ1VSTD1pbmRleC5qcy5tYXAiLCJpbXBvcnQge3J1bn0gZnJvbSAnQGN5Y2xlL3J1bic7XG5pbXBvcnQge21ha2VET01Ecml2ZXJ9IGZyb20gJ0BjeWNsZS9kb20nO1xuaW1wb3J0IHN0b3JhZ2VEcml2ZXIgZnJvbSAnQGN5Y2xlL3N0b3JhZ2UnO1xuaW1wb3J0IHtjYXB0dXJlQ2xpY2tzLCBtYWtlSGlzdG9yeURyaXZlcn0gZnJvbSAnQGN5Y2xlL2hpc3RvcnknXG5pbXBvcnQgb25pb25pZnkgZnJvbSAnY3ljbGUtb25pb25pZnknO1xuaW1wb3J0IHN0b3JhZ2VpZnkgZnJvbSBcImN5Y2xlLXN0b3JhZ2VpZnlcIjtcbmltcG9ydCBUYXNrTGlzdCBmcm9tICcuL2NvbXBvbmVudHMvVGFza0xpc3QvaW5kZXgnO1xuXG5jb25zdCBtYWluID0gb25pb25pZnkoc3RvcmFnZWlmeShUYXNrTGlzdCwge2tleTogJ3RvZG9zLWN5Y2xlJ30pKTtcblxucnVuKG1haW4sIHtcbiAgRE9NOiBtYWtlRE9NRHJpdmVyKCcudG9kb2FwcCcpLFxuICBoaXN0b3J5OiBjYXB0dXJlQ2xpY2tzKG1ha2VIaXN0b3J5RHJpdmVyKCkpLFxuICBzdG9yYWdlOiBzdG9yYWdlRHJpdmVyLFxufSk7XG4iLCJpbXBvcnQgaW50ZW50IGZyb20gJy4vaW50ZW50JztcbmltcG9ydCBtb2RlbCBmcm9tICcuL21vZGVsJztcbmltcG9ydCB2aWV3IGZyb20gJy4vdmlldyc7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIFRhc2soc291cmNlcykge1xuICBjb25zdCBzdGF0ZSQgPSBzb3VyY2VzLm9uaW9uLnN0YXRlJDtcbiAgY29uc3QgYWN0aW9ucyA9IGludGVudChzb3VyY2VzLkRPTSk7XG4gIGNvbnN0IHJlZHVjZXIkID0gbW9kZWwoYWN0aW9ucyk7XG4gIGNvbnN0IHZkb20kID0gdmlldyhzdGF0ZSQpO1xuXG4gIHJldHVybiB7XG4gICAgRE9NOiB2ZG9tJCxcbiAgICBvbmlvbjogcmVkdWNlciQsXG4gIH07XG59XG4iLCJpbXBvcnQgeHMgZnJvbSAneHN0cmVhbSc7XG5pbXBvcnQge0VOVEVSX0tFWSwgRVNDX0tFWX0gZnJvbSAnLi4vLi4vdXRpbHMnO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBpbnRlbnQoZG9tU291cmNlKSB7XG4gIGNvbnN0IGVkaXRFbnRlckV2ZW50JCA9IGRvbVNvdXJjZVxuICAgIC5zZWxlY3QoJy5lZGl0JykuZXZlbnRzKCdrZXl1cCcpXG4gICAgLmZpbHRlcihldiA9PiBldi5rZXlDb2RlID09PSBFTlRFUl9LRVkpO1xuXG4gIGNvbnN0IGVkaXRCbHVyRXZlbnQkID0gZG9tU291cmNlLnNlbGVjdCgnLmVkaXQnKS5ldmVudHMoJ2JsdXInLCB0cnVlKTtcblxuICByZXR1cm4ge1xuICAgIHN0YXJ0RWRpdCQ6IGRvbVNvdXJjZVxuICAgICAgLnNlbGVjdCgnbGFiZWwnKS5ldmVudHMoJ2RibGNsaWNrJylcbiAgICAgIC5tYXBUbyhudWxsKSxcblxuICAgIGRvbmVFZGl0JDogeHMubWVyZ2UoZWRpdEVudGVyRXZlbnQkLCBlZGl0Qmx1ckV2ZW50JClcbiAgICAgIC5tYXAoZXYgPT4gZXYudGFyZ2V0LnZhbHVlKSxcblxuICAgIGNhbmNlbEVkaXQkOiBkb21Tb3VyY2VcbiAgICAgIC5zZWxlY3QoJy5lZGl0JykuZXZlbnRzKCdrZXl1cCcpXG4gICAgICAuZmlsdGVyKGV2ID0+IGV2LmtleUNvZGUgPT09IEVTQ19LRVkpXG4gICAgICAubWFwVG8obnVsbCksXG5cbiAgICB0b2dnbGUkOiBkb21Tb3VyY2VcbiAgICAgIC5zZWxlY3QoJy50b2dnbGUnKS5ldmVudHMoJ2NoYW5nZScpXG4gICAgICAubWFwKGV2ID0+IGV2LnRhcmdldC5jaGVja2VkKSxcblxuICAgIGRlc3Ryb3kkOiBkb21Tb3VyY2VcbiAgICAgIC5zZWxlY3QoJy5kZXN0cm95JykuZXZlbnRzKCdjbGljaycpXG4gICAgICAubWFwVG8obnVsbCksXG4gIH1cbn1cbiIsImltcG9ydCB4cyBmcm9tICd4c3RyZWFtJztcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gbW9kZWwoYWN0aW9ucykge1xuICBjb25zdCBzdGFydEVkaXRSZWR1Y2VyJCA9IGFjdGlvbnMuc3RhcnRFZGl0JFxuICAgIC5tYXBUbyhmdW5jdGlvbiBzdGFydEVkaXRSZWR1Y2VyKGRhdGEpIHtcbiAgICAgIHJldHVybiB7Li4uZGF0YSwgZWRpdGluZzogdHJ1ZX07XG4gICAgfSk7XG5cbiAgY29uc3QgZG9uZUVkaXRSZWR1Y2VyJCA9IGFjdGlvbnMuZG9uZUVkaXQkXG4gICAgLm1hcChjb250ZW50ID0+IGZ1bmN0aW9uIGRvbmVFZGl0UmVkdWNlcihkYXRhKSB7XG4gICAgICByZXR1cm4gey4uLmRhdGEsIHRpdGxlOiBjb250ZW50LCBlZGl0aW5nOiBmYWxzZX07XG4gICAgfSk7XG5cbiAgY29uc3QgY2FuY2VsRWRpdFJlZHVjZXIkID0gYWN0aW9ucy5jYW5jZWxFZGl0JFxuICAgIC5tYXBUbyhmdW5jdGlvbiBjYW5jZWxFZGl0UmVkdWNlcihkYXRhKSB7XG4gICAgICByZXR1cm4gey4uLmRhdGEsIGVkaXRpbmc6IGZhbHNlfTtcbiAgICB9KTtcblxuICBjb25zdCB0b2dnbGVSZWR1Y2VyJCA9IGFjdGlvbnMudG9nZ2xlJFxuICAgIC5tYXAoaXNUb2dnbGVkID0+IGZ1bmN0aW9uIHRvZ2dsZVJlZHVjZXIoZGF0YSkge1xuICAgICAgcmV0dXJuIHsuLi5kYXRhLCBjb21wbGV0ZWQ6IGlzVG9nZ2xlZH07XG4gICAgfSk7XG5cbiAgY29uc3QgZGVzdHJveVJlZHVjZXIkID0gYWN0aW9ucy5kZXN0cm95JFxuICAgIC5tYXBUbyhmdW5jdGlvbiBkZXN0cm95UmVkdWNlcihkYXRhKSB7XG4gICAgICByZXR1cm4gdm9pZCAwO1xuICAgIH0pO1xuXG4gIHJldHVybiB4cy5tZXJnZShcbiAgICBzdGFydEVkaXRSZWR1Y2VyJCxcbiAgICBkb25lRWRpdFJlZHVjZXIkLFxuICAgIGNhbmNlbEVkaXRSZWR1Y2VyJCxcbiAgICB0b2dnbGVSZWR1Y2VyJCxcbiAgICBkZXN0cm95UmVkdWNlciRcbiAgKTtcbn1cbiIsImltcG9ydCB7YnV0dG9uLCBkaXYsIGlucHV0LCBsYWJlbCwgbGl9IGZyb20gJ0BjeWNsZS9kb20nO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiB2aWV3KHN0YXRlJCkge1xuICByZXR1cm4gc3RhdGUkLm1hcCgoe3RpdGxlLCBjb21wbGV0ZWQsIGVkaXRpbmd9KSA9PlxuICAgIGxpKCcudG9kb1Jvb3QnLCB7Y2xhc3M6IHtjb21wbGV0ZWQsIGVkaXRpbmd9fSwgW1xuICAgICAgZGl2KCcudmlldycsIFtcbiAgICAgICAgaW5wdXQoJy50b2dnbGUnLCB7XG4gICAgICAgICAgcHJvcHM6IHt0eXBlOiAnY2hlY2tib3gnLCBjaGVja2VkOiBjb21wbGV0ZWR9LFxuICAgICAgICB9KSxcbiAgICAgICAgbGFiZWwodGl0bGUpLFxuICAgICAgICBidXR0b24oJy5kZXN0cm95JylcbiAgICAgIF0pLFxuICAgICAgaW5wdXQoJy5lZGl0Jywge1xuICAgICAgICBwcm9wczoge3R5cGU6ICd0ZXh0J30sXG4gICAgICAgIGhvb2s6IHtcbiAgICAgICAgICB1cGRhdGU6IChvbGRWTm9kZSwge2VsbX0pID0+IHtcbiAgICAgICAgICAgIGVsbS52YWx1ZSA9IHRpdGxlO1xuICAgICAgICAgICAgaWYgKGVkaXRpbmcpIHtcbiAgICAgICAgICAgICAgZWxtLmZvY3VzKCk7XG4gICAgICAgICAgICAgIGVsbS5zZWxlY3Rpb25TdGFydCA9IGVsbS52YWx1ZS5sZW5ndGg7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KVxuICAgIF0pXG4gICk7XG59XG4iLCJpbXBvcnQge3VsfSBmcm9tICdAY3ljbGUvZG9tJztcbmltcG9ydCB7Y29sbGVjdGlvbiwgcGlja0NvbWJpbmUsIHBpY2tNZXJnZX0gZnJvbSAnY3ljbGUtb25pb25pZnknO1xuaW1wb3J0IFRhc2sgZnJvbSAnLi4vVGFzay9pbmRleCc7XG5cbmV4cG9ydCBjb25zdCBsaXN0TGVucyA9IHtcbiAgZ2V0OiAoc3RhdGUpID0+IHtcbiAgICByZXR1cm4gc3RhdGUubGlzdC5maWx0ZXIoc3RhdGUuZmlsdGVyRm4pO1xuICB9LFxuXG4gIHNldDogKHN0YXRlLCBuZXh0RmlsdGVyZWRMaXN0KSA9PiB7XG4gICAgY29uc3QgcHJldkZpbHRlcmVkTGlzdCA9IHN0YXRlLmxpc3QuZmlsdGVyKHN0YXRlLmZpbHRlckZuKTtcbiAgICBjb25zdCBuZXdMaXN0ID0gc3RhdGUubGlzdFxuICAgICAgLm1hcCh0YXNrID0+IG5leHRGaWx0ZXJlZExpc3QuZmluZCh0ID0+IHQua2V5ID09PSB0YXNrLmtleSkgfHwgdGFzaylcbiAgICAgIC5maWx0ZXIodGFzayA9PlxuICAgICAgICBwcmV2RmlsdGVyZWRMaXN0LnNvbWUodCA9PiB0LmtleSA9PT0gdGFzay5rZXkpICYmXG4gICAgICAgIG5leHRGaWx0ZXJlZExpc3Quc29tZSh0ID0+IHQua2V5ID09PSB0YXNrLmtleSlcbiAgICAgICk7XG4gICAgcmV0dXJuIHtcbiAgICAgIC4uLnN0YXRlLFxuICAgICAgbGlzdDogbmV3TGlzdCxcbiAgICB9O1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBMaXN0KHNvdXJjZXMpIHtcbiAgY29uc3QgdGFza3MkID0gY29sbGVjdGlvbihUYXNrLCBzb3VyY2VzKTtcblxuICBjb25zdCB2ZG9tJCA9IHRhc2tzJFxuICAgIC5jb21wb3NlKHBpY2tDb21iaW5lKCdET00nKSlcbiAgICAubWFwKHZub2RlcyA9PiB7XG4gICAgICByZXR1cm4gdWwoJy50b2RvLWxpc3QnLCB2bm9kZXMpXG4gICAgfSlcblxuICBjb25zdCByZWR1Y2VyJCA9IHRhc2tzJFxuICAgIC5jb21wb3NlKHBpY2tNZXJnZSgnb25pb24nKSk7XG5cbiAgcmV0dXJuIHtcbiAgICBET006IHZkb20kLFxuICAgIG9uaW9uOiByZWR1Y2VyJCxcbiAgfTtcbn1cbiIsImltcG9ydCB4cyBmcm9tICd4c3RyZWFtJztcbmltcG9ydCBpc29sYXRlIGZyb20gJ0BjeWNsZS9pc29sYXRlJztcbmltcG9ydCBpbnRlbnQgZnJvbSAnLi9pbnRlbnQnO1xuaW1wb3J0IG1vZGVsIGZyb20gJy4vbW9kZWwnO1xuaW1wb3J0IHZpZXcgZnJvbSAnLi92aWV3JztcbmltcG9ydCB7bGlzdExlbnMsIExpc3R9IGZyb20gJy4vTGlzdCc7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIFRhc2tMaXN0KHNvdXJjZXMpIHtcbiAgY29uc3Qgc3RhdGUkID0gc291cmNlcy5vbmlvbi5zdGF0ZSQ7XG4gIGNvbnN0IGFjdGlvbnMgPSBpbnRlbnQoc291cmNlcy5ET00sIHNvdXJjZXMuaGlzdG9yeSk7XG4gIGNvbnN0IHBhcmVudFJlZHVjZXIkID0gbW9kZWwoYWN0aW9ucyk7XG5cbiAgY29uc3QgbGlzdFNpbmtzID0gaXNvbGF0ZShMaXN0LCB7b25pb246IGxpc3RMZW5zfSkoc291cmNlcyk7XG4gIGNvbnN0IGxpc3RWRG9tJCA9IGxpc3RTaW5rcy5ET007XG4gIGNvbnN0IGxpc3RSZWR1Y2VyJCA9IGxpc3RTaW5rcy5vbmlvbjtcblxuICBjb25zdCB2ZG9tJCA9IHZpZXcoc3RhdGUkLCBsaXN0VkRvbSQpO1xuICBjb25zdCByZWR1Y2VyJCA9IHhzLm1lcmdlKHBhcmVudFJlZHVjZXIkLCBsaXN0UmVkdWNlciQpO1xuXG4gIHJldHVybiB7XG4gICAgRE9NOiB2ZG9tJCxcbiAgICBvbmlvbjogcmVkdWNlciQsXG4gIH07XG59XG4iLCJpbXBvcnQgeHMgZnJvbSAneHN0cmVhbSc7XG5pbXBvcnQgZHJvcFJlcGVhdHMgZnJvbSAneHN0cmVhbS9leHRyYS9kcm9wUmVwZWF0cyc7XG5pbXBvcnQge0VOVEVSX0tFWSwgRVNDX0tFWX0gZnJvbSAnLi4vLi4vdXRpbHMnO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBpbnRlbnQoZG9tU291cmNlLCBoaXN0b3J5U291cmNlKSB7XG4gIHJldHVybiB7XG4gICAgY2hhbmdlUm91dGUkOiBoaXN0b3J5U291cmNlXG4gICAgICAubWFwKGxvY2F0aW9uID0+IGxvY2F0aW9uLnBhdGhuYW1lKVxuICAgICAgLmNvbXBvc2UoZHJvcFJlcGVhdHMoKSksXG5cbiAgICB1cGRhdGVJbnB1dFZhbHVlJDogZG9tU291cmNlXG4gICAgICAuc2VsZWN0KCcubmV3LXRvZG8nKS5ldmVudHMoJ2lucHV0JylcbiAgICAgIC5tYXAoZXYgPT4gZXYudGFyZ2V0LnZhbHVlKSxcblxuICAgIGNhbmNlbElucHV0JDogZG9tU291cmNlXG4gICAgICAuc2VsZWN0KCcubmV3LXRvZG8nKS5ldmVudHMoJ2tleWRvd24nKVxuICAgICAgLmZpbHRlcihldiA9PiBldi5rZXlDb2RlID09PSBFU0NfS0VZKSxcblxuICAgIGluc2VydFRvZG8kOiBkb21Tb3VyY2VcbiAgICAgIC5zZWxlY3QoJy5uZXctdG9kbycpLmV2ZW50cygna2V5ZG93bicpXG4gICAgICAuZmlsdGVyKGV2ID0+IHtcbiAgICAgICAgY29uc3QgdHJpbW1lZFZhbCA9IFN0cmluZyhldi50YXJnZXQudmFsdWUpLnRyaW0oKTtcbiAgICAgICAgcmV0dXJuIGV2LmtleUNvZGUgPT09IEVOVEVSX0tFWSAmJiB0cmltbWVkVmFsO1xuICAgICAgfSlcbiAgICAgIC5tYXAoZXYgPT4gU3RyaW5nKGV2LnRhcmdldC52YWx1ZSkudHJpbSgpKSxcblxuICAgIHRvZ2dsZUFsbCQ6IGRvbVNvdXJjZVxuICAgICAgLnNlbGVjdCgnLnRvZ2dsZS1hbGwnKS5ldmVudHMoJ2NsaWNrJylcbiAgICAgIC5tYXAoZXYgPT4gZXYudGFyZ2V0LmNoZWNrZWQpLFxuXG4gICAgZGVsZXRlQ29tcGxldGVkJDogZG9tU291cmNlXG4gICAgICAuc2VsZWN0KCcuY2xlYXItY29tcGxldGVkJykuZXZlbnRzKCdjbGljaycpXG4gICAgICAubWFwVG8obnVsbCksXG4gIH07XG59O1xuIiwiaW1wb3J0IHhzIGZyb20gJ3hzdHJlYW0nO1xuXG5mdW5jdGlvbiBnZXRGaWx0ZXJGbihyb3V0ZSkge1xuICBzd2l0Y2ggKHJvdXRlKSB7XG4gICAgY2FzZSAnL2FjdGl2ZSc6IHJldHVybiAodGFzayA9PiB0YXNrLmNvbXBsZXRlZCA9PT0gZmFsc2UpO1xuICAgIGNhc2UgJy9jb21wbGV0ZWQnOiByZXR1cm4gKHRhc2sgPT4gdGFzay5jb21wbGV0ZWQgPT09IHRydWUpO1xuICAgIGRlZmF1bHQ6IHJldHVybiAoKSA9PiB0cnVlOyAvLyBhbGxvdyBhbnl0aGluZ1xuICB9XG59XG5cbmxldCB1dWlkID0gRGF0ZS5ub3coKTtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gbW9kZWwoYWN0aW9ucykge1xuICBjb25zdCBpbml0aWFsUmVkdWNlciQgPSB4cy5vZihmdW5jdGlvbiBpbml0aWFsUmVkdWNlcihwcmV2U3RhdGUpIHtcbiAgICBpZiAocHJldlN0YXRlKSB7XG4gICAgICByZXR1cm4gcHJldlN0YXRlO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBpbnB1dFZhbHVlOiAnJyxcbiAgICAgICAgbGlzdDogW10sXG4gICAgICAgIGZpbHRlcjogJycsXG4gICAgICAgIGZpbHRlckZuOiAoKSA9PiB0cnVlLCAvLyBhbGxvdyBhbnl0aGluZ1xuICAgICAgfTtcbiAgICB9XG4gIH0pO1xuXG4gIGNvbnN0IGNoYW5nZVJvdXRlUmVkdWNlciQgPSBhY3Rpb25zLmNoYW5nZVJvdXRlJFxuICAgIC5zdGFydFdpdGgoJy8nKVxuICAgIC5tYXAocGF0aCA9PiB7XG4gICAgICBjb25zdCBmaWx0ZXJGbiA9IGdldEZpbHRlckZuKHBhdGgpO1xuICAgICAgcmV0dXJuIGZ1bmN0aW9uIGNoYW5nZVJvdXRlUmVkdWNlcihwcmV2U3RhdGUpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAuLi5wcmV2U3RhdGUsXG4gICAgICAgICAgZmlsdGVyOiBwYXRoLnJlcGxhY2UoJy8nLCAnJykudHJpbSgpLFxuICAgICAgICAgIGZpbHRlckZuOiBmaWx0ZXJGbixcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICB9KTtcblxuICBjb25zdCB1cGRhdGVJbnB1dFZhbHVlUmVkdWNlciQgPSBhY3Rpb25zLnVwZGF0ZUlucHV0VmFsdWUkXG4gICAgLm1hcChpbnB1dFZhbHVlID0+IGZ1bmN0aW9uIHVwZGF0ZUlucHV0VmFsdWUocHJldlN0YXRlKSB7XG4gICAgICByZXR1cm4gey4uLnByZXZTdGF0ZSwgaW5wdXRWYWx1ZTogaW5wdXRWYWx1ZX07XG4gICAgfSk7XG5cbiAgY29uc3QgY2xlYXJJbnB1dFJlZHVjZXIkID0geHMubWVyZ2UoYWN0aW9ucy5jYW5jZWxJbnB1dCQsIGFjdGlvbnMuaW5zZXJ0VG9kbyQpXG4gICAgLm1hcFRvKGZ1bmN0aW9uIGNsZWFySW5wdXRSZWR1Y2VyKHByZXZTdGF0ZSkge1xuICAgICAgcmV0dXJuIHsuLi5wcmV2U3RhdGUsIGlucHV0VmFsdWU6ICcnfTtcbiAgICB9KTtcblxuICBjb25zdCBpbnNlcnRUb2RvUmVkdWNlciQgPSBhY3Rpb25zLmluc2VydFRvZG8kXG4gICAgLm1hcChjb250ZW50ID0+IGZ1bmN0aW9uIGluc2VydFRvZG9SZWR1Y2VyKHByZXZTdGF0ZSkge1xuICAgICAgY29uc3QgbmV3VG9kbyA9IHtcbiAgICAgICAga2V5OiB1dWlkKyssXG4gICAgICAgIHRpdGxlOiBjb250ZW50LFxuICAgICAgICBjb21wbGV0ZWQ6IGZhbHNlLFxuICAgICAgICBlZGl0aW5nOiBmYWxzZSxcbiAgICAgIH07XG4gICAgICByZXR1cm4ge1xuICAgICAgICAuLi5wcmV2U3RhdGUsXG4gICAgICAgIGxpc3Q6IHByZXZTdGF0ZS5saXN0LmNvbmNhdChuZXdUb2RvKSxcbiAgICAgIH1cbiAgICB9KTtcblxuICBjb25zdCB0b2dnbGVBbGxSZWR1Y2VyJCA9IGFjdGlvbnMudG9nZ2xlQWxsJFxuICAgIC5tYXAoaXNUb2dnbGVkID0+IGZ1bmN0aW9uIHRvZ2dsZUFsbFJlZHVjZXIocHJldlN0YXRlKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICAuLi5wcmV2U3RhdGUsXG4gICAgICAgIGxpc3Q6IHByZXZTdGF0ZS5saXN0Lm1hcCh0YXNrID0+XG4gICAgICAgICAgKHsuLi50YXNrLCBjb21wbGV0ZWQ6IGlzVG9nZ2xlZH0pXG4gICAgICAgICksXG4gICAgICB9XG4gICAgfSk7XG5cbiAgY29uc3QgZGVsZXRlQ29tcGxldGVkUmVkdWNlciQgPSBhY3Rpb25zLmRlbGV0ZUNvbXBsZXRlZCRcbiAgICAubWFwVG8oZnVuY3Rpb24gZGVsZXRlQ29tcGxldGVkc1JlZHVjZXIocHJldlN0YXRlKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICAuLi5wcmV2U3RhdGUsXG4gICAgICAgIGxpc3Q6IHByZXZTdGF0ZS5saXN0LmZpbHRlcih0YXNrID0+IHRhc2suY29tcGxldGVkID09PSBmYWxzZSksXG4gICAgICB9O1xuICAgIH0pO1xuXG4gIHJldHVybiB4cy5tZXJnZShcbiAgICBpbml0aWFsUmVkdWNlciQsXG4gICAgdXBkYXRlSW5wdXRWYWx1ZVJlZHVjZXIkLFxuICAgIGNoYW5nZVJvdXRlUmVkdWNlciQsXG4gICAgY2xlYXJJbnB1dFJlZHVjZXIkLFxuICAgIGluc2VydFRvZG9SZWR1Y2VyJCxcbiAgICB0b2dnbGVBbGxSZWR1Y2VyJCxcbiAgICBkZWxldGVDb21wbGV0ZWRSZWR1Y2VyJFxuICApO1xufVxuIiwiaW1wb3J0IHhzIGZyb20gJ3hzdHJlYW0nO1xuaW1wb3J0IHtcbiAgYSwgYnV0dG9uLCBkaXYsIGZvb3RlciwgaDEsIGhlYWRlciwgaW5wdXQsIGxpLCBzZWN0aW9uLCBzcGFuLCBzdHJvbmcsIHVsXG59IGZyb20gJ0BjeWNsZS9kb20nO1xuXG5mdW5jdGlvbiByZW5kZXJIZWFkZXIoc3RhdGUpIHtcbiAgcmV0dXJuIGhlYWRlcignLmhlYWRlcicsIFtcbiAgICBoMSgndG9kb3MnKSxcbiAgICBpbnB1dCgnLm5ldy10b2RvJywge1xuICAgICAgcHJvcHM6IHtcbiAgICAgICAgdHlwZTogJ3RleHQnLFxuICAgICAgICBwbGFjZWhvbGRlcjogJ1doYXQgbmVlZHMgdG8gYmUgZG9uZT8nLFxuICAgICAgICBhdXRvZm9jdXM6IHRydWUsXG4gICAgICAgIG5hbWU6ICduZXdUb2RvJyxcbiAgICAgICAgdmFsdWU6IHN0YXRlLmlucHV0VmFsdWVcbiAgICAgIH1cbiAgICB9KVxuICBdKTtcbn1cblxuZnVuY3Rpb24gcmVuZGVyTWFpblNlY3Rpb24oc3RhdGUsIGxpc3RWRG9tKSB7XG4gIGNvbnN0IGFsbENvbXBsZXRlZCA9IHN0YXRlLmxpc3QucmVkdWNlKCh4LCB5KSA9PiB4ICYmIHkuY29tcGxldGVkLCB0cnVlKTtcbiAgY29uc3Qgc2VjdGlvblN0eWxlID0geydkaXNwbGF5Jzogc3RhdGUubGlzdC5sZW5ndGggPyAnJyA6ICdub25lJ307XG5cbiAgcmV0dXJuIHNlY3Rpb24oJy5tYWluJywge3N0eWxlOiBzZWN0aW9uU3R5bGV9LCBbXG4gICAgaW5wdXQoJy50b2dnbGUtYWxsJywge1xuICAgICAgcHJvcHM6IHt0eXBlOiAnY2hlY2tib3gnLCBjaGVja2VkOiBhbGxDb21wbGV0ZWR9LFxuICAgIH0pLFxuICAgIGxpc3RWRG9tXG4gIF0pO1xufVxuXG5mdW5jdGlvbiByZW5kZXJGaWx0ZXJCdXR0b24oc3RhdGUsIGZpbHRlclRhZywgcGF0aCwgbGFiZWwpIHtcbiAgcmV0dXJuIGxpKFtcbiAgICBhKHtcbiAgICAgIGF0dHJzOiB7aHJlZjogcGF0aH0sXG4gICAgICBjbGFzczoge3NlbGVjdGVkOiBzdGF0ZS5maWx0ZXIgPT09IGZpbHRlclRhZ31cbiAgICB9LCBsYWJlbClcbiAgXSk7XG59XG5cbmZ1bmN0aW9uIHJlbmRlckZvb3RlcihzdGF0ZSkge1xuICBjb25zdCBhbW91bnRDb21wbGV0ZWQgPSBzdGF0ZS5saXN0XG4gICAgLmZpbHRlcih0YXNrID0+IHRhc2suY29tcGxldGVkKVxuICAgIC5sZW5ndGg7XG4gIGNvbnN0IGFtb3VudEFjdGl2ZSA9IHN0YXRlLmxpc3QubGVuZ3RoIC0gYW1vdW50Q29tcGxldGVkO1xuICBjb25zdCBmb290ZXJTdHlsZSA9IHsnZGlzcGxheSc6IHN0YXRlLmxpc3QubGVuZ3RoID8gJycgOiAnbm9uZSd9O1xuXG4gIHJldHVybiBmb290ZXIoJy5mb290ZXInLCB7c3R5bGU6IGZvb3RlclN0eWxlfSwgW1xuICAgIHNwYW4oJy50b2RvLWNvdW50JywgW1xuICAgICAgc3Ryb25nKFN0cmluZyhhbW91bnRBY3RpdmUpKSxcbiAgICAgICcgaXRlbScgKyAoYW1vdW50QWN0aXZlICE9PSAxID8gJ3MnIDogJycpICsgJyBsZWZ0J1xuICAgIF0pLFxuICAgIHVsKCcuZmlsdGVycycsIFtcbiAgICAgIHJlbmRlckZpbHRlckJ1dHRvbihzdGF0ZSwgJycsICcvJywgJ0FsbCcpLFxuICAgICAgcmVuZGVyRmlsdGVyQnV0dG9uKHN0YXRlLCAnYWN0aXZlJywgJy9hY3RpdmUnLCAnQWN0aXZlJyksXG4gICAgICByZW5kZXJGaWx0ZXJCdXR0b24oc3RhdGUsICdjb21wbGV0ZWQnLCAnL2NvbXBsZXRlZCcsICdDb21wbGV0ZWQnKSxcbiAgICBdKSxcbiAgICAoYW1vdW50Q29tcGxldGVkID4gMCA/XG4gICAgICBidXR0b24oJy5jbGVhci1jb21wbGV0ZWQnLCAnQ2xlYXIgY29tcGxldGVkICgnICsgYW1vdW50Q29tcGxldGVkICsgJyknKVxuICAgICAgOiBudWxsXG4gICAgKVxuICBdKVxufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiB2aWV3KHN0YXRlJCwgbGlzdFZEb20kKSB7XG4gIHJldHVybiB4cy5jb21iaW5lKHN0YXRlJCwgbGlzdFZEb20kKS5tYXAoKFtzdGF0ZSwgbGlzdFZEb21dKSA9PlxuICAgIGRpdihbXG4gICAgICByZW5kZXJIZWFkZXIoc3RhdGUpLFxuICAgICAgcmVuZGVyTWFpblNlY3Rpb24oc3RhdGUsIGxpc3RWRG9tKSxcbiAgICAgIHJlbmRlckZvb3RlcihzdGF0ZSlcbiAgICBdKVxuICApO1xufTtcbiIsImNvbnN0IEVOVEVSX0tFWSA9IDEzO1xuY29uc3QgRVNDX0tFWSA9IDI3O1xuXG5leHBvcnQge0VOVEVSX0tFWSwgRVNDX0tFWX07XG4iXX0=
