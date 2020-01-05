(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.WebApiClient = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (process,global){
/* @preserve
 * The MIT License (MIT)
 * 
 * Copyright (c) 2013-2017 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * 
 */
/**
 * bluebird build version 3.5.1
 * Features enabled: core, race, call_get, generators, map, nodeify, promisify, props, reduce, settle, some, using, timers, filter, any, each
*/
!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.Promise=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof _dereq_=="function"&&_dereq_;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof _dereq_=="function"&&_dereq_;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise) {
var SomePromiseArray = Promise._SomePromiseArray;
function any(promises) {
    var ret = new SomePromiseArray(promises);
    var promise = ret.promise();
    ret.setHowMany(1);
    ret.setUnwrap();
    ret.init();
    return promise;
}

Promise.any = function (promises) {
    return any(promises);
};

Promise.prototype.any = function () {
    return any(this);
};

};

},{}],2:[function(_dereq_,module,exports){
"use strict";
var firstLineError;
try {throw new Error(); } catch (e) {firstLineError = e;}
var schedule = _dereq_("./schedule");
var Queue = _dereq_("./queue");
var util = _dereq_("./util");

function Async() {
    this._customScheduler = false;
    this._isTickUsed = false;
    this._lateQueue = new Queue(16);
    this._normalQueue = new Queue(16);
    this._haveDrainedQueues = false;
    this._trampolineEnabled = true;
    var self = this;
    this.drainQueues = function () {
        self._drainQueues();
    };
    this._schedule = schedule;
}

Async.prototype.setScheduler = function(fn) {
    var prev = this._schedule;
    this._schedule = fn;
    this._customScheduler = true;
    return prev;
};

Async.prototype.hasCustomScheduler = function() {
    return this._customScheduler;
};

Async.prototype.enableTrampoline = function() {
    this._trampolineEnabled = true;
};

Async.prototype.disableTrampolineIfNecessary = function() {
    if (util.hasDevTools) {
        this._trampolineEnabled = false;
    }
};

Async.prototype.haveItemsQueued = function () {
    return this._isTickUsed || this._haveDrainedQueues;
};


Async.prototype.fatalError = function(e, isNode) {
    if (isNode) {
        process.stderr.write("Fatal " + (e instanceof Error ? e.stack : e) +
            "\n");
        process.exit(2);
    } else {
        this.throwLater(e);
    }
};

Async.prototype.throwLater = function(fn, arg) {
    if (arguments.length === 1) {
        arg = fn;
        fn = function () { throw arg; };
    }
    if (typeof setTimeout !== "undefined") {
        setTimeout(function() {
            fn(arg);
        }, 0);
    } else try {
        this._schedule(function() {
            fn(arg);
        });
    } catch (e) {
        throw new Error("No async scheduler available\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
    }
};

function AsyncInvokeLater(fn, receiver, arg) {
    this._lateQueue.push(fn, receiver, arg);
    this._queueTick();
}

function AsyncInvoke(fn, receiver, arg) {
    this._normalQueue.push(fn, receiver, arg);
    this._queueTick();
}

function AsyncSettlePromises(promise) {
    this._normalQueue._pushOne(promise);
    this._queueTick();
}

if (!util.hasDevTools) {
    Async.prototype.invokeLater = AsyncInvokeLater;
    Async.prototype.invoke = AsyncInvoke;
    Async.prototype.settlePromises = AsyncSettlePromises;
} else {
    Async.prototype.invokeLater = function (fn, receiver, arg) {
        if (this._trampolineEnabled) {
            AsyncInvokeLater.call(this, fn, receiver, arg);
        } else {
            this._schedule(function() {
                setTimeout(function() {
                    fn.call(receiver, arg);
                }, 100);
            });
        }
    };

    Async.prototype.invoke = function (fn, receiver, arg) {
        if (this._trampolineEnabled) {
            AsyncInvoke.call(this, fn, receiver, arg);
        } else {
            this._schedule(function() {
                fn.call(receiver, arg);
            });
        }
    };

    Async.prototype.settlePromises = function(promise) {
        if (this._trampolineEnabled) {
            AsyncSettlePromises.call(this, promise);
        } else {
            this._schedule(function() {
                promise._settlePromises();
            });
        }
    };
}

Async.prototype._drainQueue = function(queue) {
    while (queue.length() > 0) {
        var fn = queue.shift();
        if (typeof fn !== "function") {
            fn._settlePromises();
            continue;
        }
        var receiver = queue.shift();
        var arg = queue.shift();
        fn.call(receiver, arg);
    }
};

Async.prototype._drainQueues = function () {
    this._drainQueue(this._normalQueue);
    this._reset();
    this._haveDrainedQueues = true;
    this._drainQueue(this._lateQueue);
};

Async.prototype._queueTick = function () {
    if (!this._isTickUsed) {
        this._isTickUsed = true;
        this._schedule(this.drainQueues);
    }
};

Async.prototype._reset = function () {
    this._isTickUsed = false;
};

module.exports = Async;
module.exports.firstLineError = firstLineError;

},{"./queue":26,"./schedule":29,"./util":36}],3:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, INTERNAL, tryConvertToPromise, debug) {
var calledBind = false;
var rejectThis = function(_, e) {
    this._reject(e);
};

var targetRejected = function(e, context) {
    context.promiseRejectionQueued = true;
    context.bindingPromise._then(rejectThis, rejectThis, null, this, e);
};

var bindingResolved = function(thisArg, context) {
    if (((this._bitField & 50397184) === 0)) {
        this._resolveCallback(context.target);
    }
};

var bindingRejected = function(e, context) {
    if (!context.promiseRejectionQueued) this._reject(e);
};

Promise.prototype.bind = function (thisArg) {
    if (!calledBind) {
        calledBind = true;
        Promise.prototype._propagateFrom = debug.propagateFromFunction();
        Promise.prototype._boundValue = debug.boundValueFunction();
    }
    var maybePromise = tryConvertToPromise(thisArg);
    var ret = new Promise(INTERNAL);
    ret._propagateFrom(this, 1);
    var target = this._target();
    ret._setBoundTo(maybePromise);
    if (maybePromise instanceof Promise) {
        var context = {
            promiseRejectionQueued: false,
            promise: ret,
            target: target,
            bindingPromise: maybePromise
        };
        target._then(INTERNAL, targetRejected, undefined, ret, context);
        maybePromise._then(
            bindingResolved, bindingRejected, undefined, ret, context);
        ret._setOnCancel(maybePromise);
    } else {
        ret._resolveCallback(target);
    }
    return ret;
};

Promise.prototype._setBoundTo = function (obj) {
    if (obj !== undefined) {
        this._bitField = this._bitField | 2097152;
        this._boundTo = obj;
    } else {
        this._bitField = this._bitField & (~2097152);
    }
};

Promise.prototype._isBound = function () {
    return (this._bitField & 2097152) === 2097152;
};

Promise.bind = function (thisArg, value) {
    return Promise.resolve(value).bind(thisArg);
};
};

},{}],4:[function(_dereq_,module,exports){
"use strict";
var old;
if (typeof Promise !== "undefined") old = Promise;
function noConflict() {
    try { if (Promise === bluebird) Promise = old; }
    catch (e) {}
    return bluebird;
}
var bluebird = _dereq_("./promise")();
bluebird.noConflict = noConflict;
module.exports = bluebird;

},{"./promise":22}],5:[function(_dereq_,module,exports){
"use strict";
var cr = Object.create;
if (cr) {
    var callerCache = cr(null);
    var getterCache = cr(null);
    callerCache[" size"] = getterCache[" size"] = 0;
}

module.exports = function(Promise) {
var util = _dereq_("./util");
var canEvaluate = util.canEvaluate;
var isIdentifier = util.isIdentifier;

var getMethodCaller;
var getGetter;
if (!true) {
var makeMethodCaller = function (methodName) {
    return new Function("ensureMethod", "                                    \n\
        return function(obj) {                                               \n\
            'use strict'                                                     \n\
            var len = this.length;                                           \n\
            ensureMethod(obj, 'methodName');                                 \n\
            switch(len) {                                                    \n\
                case 1: return obj.methodName(this[0]);                      \n\
                case 2: return obj.methodName(this[0], this[1]);             \n\
                case 3: return obj.methodName(this[0], this[1], this[2]);    \n\
                case 0: return obj.methodName();                             \n\
                default:                                                     \n\
                    return obj.methodName.apply(obj, this);                  \n\
            }                                                                \n\
        };                                                                   \n\
        ".replace(/methodName/g, methodName))(ensureMethod);
};

var makeGetter = function (propertyName) {
    return new Function("obj", "                                             \n\
        'use strict';                                                        \n\
        return obj.propertyName;                                             \n\
        ".replace("propertyName", propertyName));
};

var getCompiled = function(name, compiler, cache) {
    var ret = cache[name];
    if (typeof ret !== "function") {
        if (!isIdentifier(name)) {
            return null;
        }
        ret = compiler(name);
        cache[name] = ret;
        cache[" size"]++;
        if (cache[" size"] > 512) {
            var keys = Object.keys(cache);
            for (var i = 0; i < 256; ++i) delete cache[keys[i]];
            cache[" size"] = keys.length - 256;
        }
    }
    return ret;
};

getMethodCaller = function(name) {
    return getCompiled(name, makeMethodCaller, callerCache);
};

getGetter = function(name) {
    return getCompiled(name, makeGetter, getterCache);
};
}

function ensureMethod(obj, methodName) {
    var fn;
    if (obj != null) fn = obj[methodName];
    if (typeof fn !== "function") {
        var message = "Object " + util.classString(obj) + " has no method '" +
            util.toString(methodName) + "'";
        throw new Promise.TypeError(message);
    }
    return fn;
}

function caller(obj) {
    var methodName = this.pop();
    var fn = ensureMethod(obj, methodName);
    return fn.apply(obj, this);
}
Promise.prototype.call = function (methodName) {
    var args = [].slice.call(arguments, 1);;
    if (!true) {
        if (canEvaluate) {
            var maybeCaller = getMethodCaller(methodName);
            if (maybeCaller !== null) {
                return this._then(
                    maybeCaller, undefined, undefined, args, undefined);
            }
        }
    }
    args.push(methodName);
    return this._then(caller, undefined, undefined, args, undefined);
};

function namedGetter(obj) {
    return obj[this];
}
function indexedGetter(obj) {
    var index = +this;
    if (index < 0) index = Math.max(0, index + obj.length);
    return obj[index];
}
Promise.prototype.get = function (propertyName) {
    var isIndex = (typeof propertyName === "number");
    var getter;
    if (!isIndex) {
        if (canEvaluate) {
            var maybeGetter = getGetter(propertyName);
            getter = maybeGetter !== null ? maybeGetter : namedGetter;
        } else {
            getter = namedGetter;
        }
    } else {
        getter = indexedGetter;
    }
    return this._then(getter, undefined, undefined, propertyName, undefined);
};
};

},{"./util":36}],6:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, PromiseArray, apiRejection, debug) {
var util = _dereq_("./util");
var tryCatch = util.tryCatch;
var errorObj = util.errorObj;
var async = Promise._async;

Promise.prototype["break"] = Promise.prototype.cancel = function() {
    if (!debug.cancellation()) return this._warn("cancellation is disabled");

    var promise = this;
    var child = promise;
    while (promise._isCancellable()) {
        if (!promise._cancelBy(child)) {
            if (child._isFollowing()) {
                child._followee().cancel();
            } else {
                child._cancelBranched();
            }
            break;
        }

        var parent = promise._cancellationParent;
        if (parent == null || !parent._isCancellable()) {
            if (promise._isFollowing()) {
                promise._followee().cancel();
            } else {
                promise._cancelBranched();
            }
            break;
        } else {
            if (promise._isFollowing()) promise._followee().cancel();
            promise._setWillBeCancelled();
            child = promise;
            promise = parent;
        }
    }
};

Promise.prototype._branchHasCancelled = function() {
    this._branchesRemainingToCancel--;
};

Promise.prototype._enoughBranchesHaveCancelled = function() {
    return this._branchesRemainingToCancel === undefined ||
           this._branchesRemainingToCancel <= 0;
};

Promise.prototype._cancelBy = function(canceller) {
    if (canceller === this) {
        this._branchesRemainingToCancel = 0;
        this._invokeOnCancel();
        return true;
    } else {
        this._branchHasCancelled();
        if (this._enoughBranchesHaveCancelled()) {
            this._invokeOnCancel();
            return true;
        }
    }
    return false;
};

Promise.prototype._cancelBranched = function() {
    if (this._enoughBranchesHaveCancelled()) {
        this._cancel();
    }
};

Promise.prototype._cancel = function() {
    if (!this._isCancellable()) return;
    this._setCancelled();
    async.invoke(this._cancelPromises, this, undefined);
};

Promise.prototype._cancelPromises = function() {
    if (this._length() > 0) this._settlePromises();
};

Promise.prototype._unsetOnCancel = function() {
    this._onCancelField = undefined;
};

Promise.prototype._isCancellable = function() {
    return this.isPending() && !this._isCancelled();
};

Promise.prototype.isCancellable = function() {
    return this.isPending() && !this.isCancelled();
};

Promise.prototype._doInvokeOnCancel = function(onCancelCallback, internalOnly) {
    if (util.isArray(onCancelCallback)) {
        for (var i = 0; i < onCancelCallback.length; ++i) {
            this._doInvokeOnCancel(onCancelCallback[i], internalOnly);
        }
    } else if (onCancelCallback !== undefined) {
        if (typeof onCancelCallback === "function") {
            if (!internalOnly) {
                var e = tryCatch(onCancelCallback).call(this._boundValue());
                if (e === errorObj) {
                    this._attachExtraTrace(e.e);
                    async.throwLater(e.e);
                }
            }
        } else {
            onCancelCallback._resultCancelled(this);
        }
    }
};

Promise.prototype._invokeOnCancel = function() {
    var onCancelCallback = this._onCancel();
    this._unsetOnCancel();
    async.invoke(this._doInvokeOnCancel, this, onCancelCallback);
};

Promise.prototype._invokeInternalOnCancel = function() {
    if (this._isCancellable()) {
        this._doInvokeOnCancel(this._onCancel(), true);
        this._unsetOnCancel();
    }
};

Promise.prototype._resultCancelled = function() {
    this.cancel();
};

};

},{"./util":36}],7:[function(_dereq_,module,exports){
"use strict";
module.exports = function(NEXT_FILTER) {
var util = _dereq_("./util");
var getKeys = _dereq_("./es5").keys;
var tryCatch = util.tryCatch;
var errorObj = util.errorObj;

function catchFilter(instances, cb, promise) {
    return function(e) {
        var boundTo = promise._boundValue();
        predicateLoop: for (var i = 0; i < instances.length; ++i) {
            var item = instances[i];

            if (item === Error ||
                (item != null && item.prototype instanceof Error)) {
                if (e instanceof item) {
                    return tryCatch(cb).call(boundTo, e);
                }
            } else if (typeof item === "function") {
                var matchesPredicate = tryCatch(item).call(boundTo, e);
                if (matchesPredicate === errorObj) {
                    return matchesPredicate;
                } else if (matchesPredicate) {
                    return tryCatch(cb).call(boundTo, e);
                }
            } else if (util.isObject(e)) {
                var keys = getKeys(item);
                for (var j = 0; j < keys.length; ++j) {
                    var key = keys[j];
                    if (item[key] != e[key]) {
                        continue predicateLoop;
                    }
                }
                return tryCatch(cb).call(boundTo, e);
            }
        }
        return NEXT_FILTER;
    };
}

return catchFilter;
};

},{"./es5":13,"./util":36}],8:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise) {
var longStackTraces = false;
var contextStack = [];

Promise.prototype._promiseCreated = function() {};
Promise.prototype._pushContext = function() {};
Promise.prototype._popContext = function() {return null;};
Promise._peekContext = Promise.prototype._peekContext = function() {};

function Context() {
    this._trace = new Context.CapturedTrace(peekContext());
}
Context.prototype._pushContext = function () {
    if (this._trace !== undefined) {
        this._trace._promiseCreated = null;
        contextStack.push(this._trace);
    }
};

Context.prototype._popContext = function () {
    if (this._trace !== undefined) {
        var trace = contextStack.pop();
        var ret = trace._promiseCreated;
        trace._promiseCreated = null;
        return ret;
    }
    return null;
};

function createContext() {
    if (longStackTraces) return new Context();
}

function peekContext() {
    var lastIndex = contextStack.length - 1;
    if (lastIndex >= 0) {
        return contextStack[lastIndex];
    }
    return undefined;
}
Context.CapturedTrace = null;
Context.create = createContext;
Context.deactivateLongStackTraces = function() {};
Context.activateLongStackTraces = function() {
    var Promise_pushContext = Promise.prototype._pushContext;
    var Promise_popContext = Promise.prototype._popContext;
    var Promise_PeekContext = Promise._peekContext;
    var Promise_peekContext = Promise.prototype._peekContext;
    var Promise_promiseCreated = Promise.prototype._promiseCreated;
    Context.deactivateLongStackTraces = function() {
        Promise.prototype._pushContext = Promise_pushContext;
        Promise.prototype._popContext = Promise_popContext;
        Promise._peekContext = Promise_PeekContext;
        Promise.prototype._peekContext = Promise_peekContext;
        Promise.prototype._promiseCreated = Promise_promiseCreated;
        longStackTraces = false;
    };
    longStackTraces = true;
    Promise.prototype._pushContext = Context.prototype._pushContext;
    Promise.prototype._popContext = Context.prototype._popContext;
    Promise._peekContext = Promise.prototype._peekContext = peekContext;
    Promise.prototype._promiseCreated = function() {
        var ctx = this._peekContext();
        if (ctx && ctx._promiseCreated == null) ctx._promiseCreated = this;
    };
};
return Context;
};

},{}],9:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, Context) {
var getDomain = Promise._getDomain;
var async = Promise._async;
var Warning = _dereq_("./errors").Warning;
var util = _dereq_("./util");
var canAttachTrace = util.canAttachTrace;
var unhandledRejectionHandled;
var possiblyUnhandledRejection;
var bluebirdFramePattern =
    /[\\\/]bluebird[\\\/]js[\\\/](release|debug|instrumented)/;
var nodeFramePattern = /\((?:timers\.js):\d+:\d+\)/;
var parseLinePattern = /[\/<\(](.+?):(\d+):(\d+)\)?\s*$/;
var stackFramePattern = null;
var formatStack = null;
var indentStackFrames = false;
var printWarning;
var debugging = !!(util.env("BLUEBIRD_DEBUG") != 0 &&
                        (true ||
                         util.env("BLUEBIRD_DEBUG") ||
                         util.env("NODE_ENV") === "development"));

var warnings = !!(util.env("BLUEBIRD_WARNINGS") != 0 &&
    (debugging || util.env("BLUEBIRD_WARNINGS")));

var longStackTraces = !!(util.env("BLUEBIRD_LONG_STACK_TRACES") != 0 &&
    (debugging || util.env("BLUEBIRD_LONG_STACK_TRACES")));

var wForgottenReturn = util.env("BLUEBIRD_W_FORGOTTEN_RETURN") != 0 &&
    (warnings || !!util.env("BLUEBIRD_W_FORGOTTEN_RETURN"));

Promise.prototype.suppressUnhandledRejections = function() {
    var target = this._target();
    target._bitField = ((target._bitField & (~1048576)) |
                      524288);
};

Promise.prototype._ensurePossibleRejectionHandled = function () {
    if ((this._bitField & 524288) !== 0) return;
    this._setRejectionIsUnhandled();
    var self = this;
    setTimeout(function() {
        self._notifyUnhandledRejection();
    }, 1);
};

Promise.prototype._notifyUnhandledRejectionIsHandled = function () {
    fireRejectionEvent("rejectionHandled",
                                  unhandledRejectionHandled, undefined, this);
};

Promise.prototype._setReturnedNonUndefined = function() {
    this._bitField = this._bitField | 268435456;
};

Promise.prototype._returnedNonUndefined = function() {
    return (this._bitField & 268435456) !== 0;
};

Promise.prototype._notifyUnhandledRejection = function () {
    if (this._isRejectionUnhandled()) {
        var reason = this._settledValue();
        this._setUnhandledRejectionIsNotified();
        fireRejectionEvent("unhandledRejection",
                                      possiblyUnhandledRejection, reason, this);
    }
};

Promise.prototype._setUnhandledRejectionIsNotified = function () {
    this._bitField = this._bitField | 262144;
};

Promise.prototype._unsetUnhandledRejectionIsNotified = function () {
    this._bitField = this._bitField & (~262144);
};

Promise.prototype._isUnhandledRejectionNotified = function () {
    return (this._bitField & 262144) > 0;
};

Promise.prototype._setRejectionIsUnhandled = function () {
    this._bitField = this._bitField | 1048576;
};

Promise.prototype._unsetRejectionIsUnhandled = function () {
    this._bitField = this._bitField & (~1048576);
    if (this._isUnhandledRejectionNotified()) {
        this._unsetUnhandledRejectionIsNotified();
        this._notifyUnhandledRejectionIsHandled();
    }
};

Promise.prototype._isRejectionUnhandled = function () {
    return (this._bitField & 1048576) > 0;
};

Promise.prototype._warn = function(message, shouldUseOwnTrace, promise) {
    return warn(message, shouldUseOwnTrace, promise || this);
};

Promise.onPossiblyUnhandledRejection = function (fn) {
    var domain = getDomain();
    possiblyUnhandledRejection =
        typeof fn === "function" ? (domain === null ?
                                            fn : util.domainBind(domain, fn))
                                 : undefined;
};

Promise.onUnhandledRejectionHandled = function (fn) {
    var domain = getDomain();
    unhandledRejectionHandled =
        typeof fn === "function" ? (domain === null ?
                                            fn : util.domainBind(domain, fn))
                                 : undefined;
};

var disableLongStackTraces = function() {};
Promise.longStackTraces = function () {
    if (async.haveItemsQueued() && !config.longStackTraces) {
        throw new Error("cannot enable long stack traces after promises have been created\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
    }
    if (!config.longStackTraces && longStackTracesIsSupported()) {
        var Promise_captureStackTrace = Promise.prototype._captureStackTrace;
        var Promise_attachExtraTrace = Promise.prototype._attachExtraTrace;
        config.longStackTraces = true;
        disableLongStackTraces = function() {
            if (async.haveItemsQueued() && !config.longStackTraces) {
                throw new Error("cannot enable long stack traces after promises have been created\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
            }
            Promise.prototype._captureStackTrace = Promise_captureStackTrace;
            Promise.prototype._attachExtraTrace = Promise_attachExtraTrace;
            Context.deactivateLongStackTraces();
            async.enableTrampoline();
            config.longStackTraces = false;
        };
        Promise.prototype._captureStackTrace = longStackTracesCaptureStackTrace;
        Promise.prototype._attachExtraTrace = longStackTracesAttachExtraTrace;
        Context.activateLongStackTraces();
        async.disableTrampolineIfNecessary();
    }
};

Promise.hasLongStackTraces = function () {
    return config.longStackTraces && longStackTracesIsSupported();
};

var fireDomEvent = (function() {
    try {
        if (typeof CustomEvent === "function") {
            var event = new CustomEvent("CustomEvent");
            util.global.dispatchEvent(event);
            return function(name, event) {
                var domEvent = new CustomEvent(name.toLowerCase(), {
                    detail: event,
                    cancelable: true
                });
                return !util.global.dispatchEvent(domEvent);
            };
        } else if (typeof Event === "function") {
            var event = new Event("CustomEvent");
            util.global.dispatchEvent(event);
            return function(name, event) {
                var domEvent = new Event(name.toLowerCase(), {
                    cancelable: true
                });
                domEvent.detail = event;
                return !util.global.dispatchEvent(domEvent);
            };
        } else {
            var event = document.createEvent("CustomEvent");
            event.initCustomEvent("testingtheevent", false, true, {});
            util.global.dispatchEvent(event);
            return function(name, event) {
                var domEvent = document.createEvent("CustomEvent");
                domEvent.initCustomEvent(name.toLowerCase(), false, true,
                    event);
                return !util.global.dispatchEvent(domEvent);
            };
        }
    } catch (e) {}
    return function() {
        return false;
    };
})();

var fireGlobalEvent = (function() {
    if (util.isNode) {
        return function() {
            return process.emit.apply(process, arguments);
        };
    } else {
        if (!util.global) {
            return function() {
                return false;
            };
        }
        return function(name) {
            var methodName = "on" + name.toLowerCase();
            var method = util.global[methodName];
            if (!method) return false;
            method.apply(util.global, [].slice.call(arguments, 1));
            return true;
        };
    }
})();

function generatePromiseLifecycleEventObject(name, promise) {
    return {promise: promise};
}

var eventToObjectGenerator = {
    promiseCreated: generatePromiseLifecycleEventObject,
    promiseFulfilled: generatePromiseLifecycleEventObject,
    promiseRejected: generatePromiseLifecycleEventObject,
    promiseResolved: generatePromiseLifecycleEventObject,
    promiseCancelled: generatePromiseLifecycleEventObject,
    promiseChained: function(name, promise, child) {
        return {promise: promise, child: child};
    },
    warning: function(name, warning) {
        return {warning: warning};
    },
    unhandledRejection: function (name, reason, promise) {
        return {reason: reason, promise: promise};
    },
    rejectionHandled: generatePromiseLifecycleEventObject
};

var activeFireEvent = function (name) {
    var globalEventFired = false;
    try {
        globalEventFired = fireGlobalEvent.apply(null, arguments);
    } catch (e) {
        async.throwLater(e);
        globalEventFired = true;
    }

    var domEventFired = false;
    try {
        domEventFired = fireDomEvent(name,
                    eventToObjectGenerator[name].apply(null, arguments));
    } catch (e) {
        async.throwLater(e);
        domEventFired = true;
    }

    return domEventFired || globalEventFired;
};

Promise.config = function(opts) {
    opts = Object(opts);
    if ("longStackTraces" in opts) {
        if (opts.longStackTraces) {
            Promise.longStackTraces();
        } else if (!opts.longStackTraces && Promise.hasLongStackTraces()) {
            disableLongStackTraces();
        }
    }
    if ("warnings" in opts) {
        var warningsOption = opts.warnings;
        config.warnings = !!warningsOption;
        wForgottenReturn = config.warnings;

        if (util.isObject(warningsOption)) {
            if ("wForgottenReturn" in warningsOption) {
                wForgottenReturn = !!warningsOption.wForgottenReturn;
            }
        }
    }
    if ("cancellation" in opts && opts.cancellation && !config.cancellation) {
        if (async.haveItemsQueued()) {
            throw new Error(
                "cannot enable cancellation after promises are in use");
        }
        Promise.prototype._clearCancellationData =
            cancellationClearCancellationData;
        Promise.prototype._propagateFrom = cancellationPropagateFrom;
        Promise.prototype._onCancel = cancellationOnCancel;
        Promise.prototype._setOnCancel = cancellationSetOnCancel;
        Promise.prototype._attachCancellationCallback =
            cancellationAttachCancellationCallback;
        Promise.prototype._execute = cancellationExecute;
        propagateFromFunction = cancellationPropagateFrom;
        config.cancellation = true;
    }
    if ("monitoring" in opts) {
        if (opts.monitoring && !config.monitoring) {
            config.monitoring = true;
            Promise.prototype._fireEvent = activeFireEvent;
        } else if (!opts.monitoring && config.monitoring) {
            config.monitoring = false;
            Promise.prototype._fireEvent = defaultFireEvent;
        }
    }
    return Promise;
};

function defaultFireEvent() { return false; }

Promise.prototype._fireEvent = defaultFireEvent;
Promise.prototype._execute = function(executor, resolve, reject) {
    try {
        executor(resolve, reject);
    } catch (e) {
        return e;
    }
};
Promise.prototype._onCancel = function () {};
Promise.prototype._setOnCancel = function (handler) { ; };
Promise.prototype._attachCancellationCallback = function(onCancel) {
    ;
};
Promise.prototype._captureStackTrace = function () {};
Promise.prototype._attachExtraTrace = function () {};
Promise.prototype._clearCancellationData = function() {};
Promise.prototype._propagateFrom = function (parent, flags) {
    ;
    ;
};

function cancellationExecute(executor, resolve, reject) {
    var promise = this;
    try {
        executor(resolve, reject, function(onCancel) {
            if (typeof onCancel !== "function") {
                throw new TypeError("onCancel must be a function, got: " +
                                    util.toString(onCancel));
            }
            promise._attachCancellationCallback(onCancel);
        });
    } catch (e) {
        return e;
    }
}

function cancellationAttachCancellationCallback(onCancel) {
    if (!this._isCancellable()) return this;

    var previousOnCancel = this._onCancel();
    if (previousOnCancel !== undefined) {
        if (util.isArray(previousOnCancel)) {
            previousOnCancel.push(onCancel);
        } else {
            this._setOnCancel([previousOnCancel, onCancel]);
        }
    } else {
        this._setOnCancel(onCancel);
    }
}

function cancellationOnCancel() {
    return this._onCancelField;
}

function cancellationSetOnCancel(onCancel) {
    this._onCancelField = onCancel;
}

function cancellationClearCancellationData() {
    this._cancellationParent = undefined;
    this._onCancelField = undefined;
}

function cancellationPropagateFrom(parent, flags) {
    if ((flags & 1) !== 0) {
        this._cancellationParent = parent;
        var branchesRemainingToCancel = parent._branchesRemainingToCancel;
        if (branchesRemainingToCancel === undefined) {
            branchesRemainingToCancel = 0;
        }
        parent._branchesRemainingToCancel = branchesRemainingToCancel + 1;
    }
    if ((flags & 2) !== 0 && parent._isBound()) {
        this._setBoundTo(parent._boundTo);
    }
}

function bindingPropagateFrom(parent, flags) {
    if ((flags & 2) !== 0 && parent._isBound()) {
        this._setBoundTo(parent._boundTo);
    }
}
var propagateFromFunction = bindingPropagateFrom;

function boundValueFunction() {
    var ret = this._boundTo;
    if (ret !== undefined) {
        if (ret instanceof Promise) {
            if (ret.isFulfilled()) {
                return ret.value();
            } else {
                return undefined;
            }
        }
    }
    return ret;
}

function longStackTracesCaptureStackTrace() {
    this._trace = new CapturedTrace(this._peekContext());
}

function longStackTracesAttachExtraTrace(error, ignoreSelf) {
    if (canAttachTrace(error)) {
        var trace = this._trace;
        if (trace !== undefined) {
            if (ignoreSelf) trace = trace._parent;
        }
        if (trace !== undefined) {
            trace.attachExtraTrace(error);
        } else if (!error.__stackCleaned__) {
            var parsed = parseStackAndMessage(error);
            util.notEnumerableProp(error, "stack",
                parsed.message + "\n" + parsed.stack.join("\n"));
            util.notEnumerableProp(error, "__stackCleaned__", true);
        }
    }
}

function checkForgottenReturns(returnValue, promiseCreated, name, promise,
                               parent) {
    if (returnValue === undefined && promiseCreated !== null &&
        wForgottenReturn) {
        if (parent !== undefined && parent._returnedNonUndefined()) return;
        if ((promise._bitField & 65535) === 0) return;

        if (name) name = name + " ";
        var handlerLine = "";
        var creatorLine = "";
        if (promiseCreated._trace) {
            var traceLines = promiseCreated._trace.stack.split("\n");
            var stack = cleanStack(traceLines);
            for (var i = stack.length - 1; i >= 0; --i) {
                var line = stack[i];
                if (!nodeFramePattern.test(line)) {
                    var lineMatches = line.match(parseLinePattern);
                    if (lineMatches) {
                        handlerLine  = "at " + lineMatches[1] +
                            ":" + lineMatches[2] + ":" + lineMatches[3] + " ";
                    }
                    break;
                }
            }

            if (stack.length > 0) {
                var firstUserLine = stack[0];
                for (var i = 0; i < traceLines.length; ++i) {

                    if (traceLines[i] === firstUserLine) {
                        if (i > 0) {
                            creatorLine = "\n" + traceLines[i - 1];
                        }
                        break;
                    }
                }

            }
        }
        var msg = "a promise was created in a " + name +
            "handler " + handlerLine + "but was not returned from it, " +
            "see http://goo.gl/rRqMUw" +
            creatorLine;
        promise._warn(msg, true, promiseCreated);
    }
}

function deprecated(name, replacement) {
    var message = name +
        " is deprecated and will be removed in a future version.";
    if (replacement) message += " Use " + replacement + " instead.";
    return warn(message);
}

function warn(message, shouldUseOwnTrace, promise) {
    if (!config.warnings) return;
    var warning = new Warning(message);
    var ctx;
    if (shouldUseOwnTrace) {
        promise._attachExtraTrace(warning);
    } else if (config.longStackTraces && (ctx = Promise._peekContext())) {
        ctx.attachExtraTrace(warning);
    } else {
        var parsed = parseStackAndMessage(warning);
        warning.stack = parsed.message + "\n" + parsed.stack.join("\n");
    }

    if (!activeFireEvent("warning", warning)) {
        formatAndLogError(warning, "", true);
    }
}

function reconstructStack(message, stacks) {
    for (var i = 0; i < stacks.length - 1; ++i) {
        stacks[i].push("From previous event:");
        stacks[i] = stacks[i].join("\n");
    }
    if (i < stacks.length) {
        stacks[i] = stacks[i].join("\n");
    }
    return message + "\n" + stacks.join("\n");
}

function removeDuplicateOrEmptyJumps(stacks) {
    for (var i = 0; i < stacks.length; ++i) {
        if (stacks[i].length === 0 ||
            ((i + 1 < stacks.length) && stacks[i][0] === stacks[i+1][0])) {
            stacks.splice(i, 1);
            i--;
        }
    }
}

function removeCommonRoots(stacks) {
    var current = stacks[0];
    for (var i = 1; i < stacks.length; ++i) {
        var prev = stacks[i];
        var currentLastIndex = current.length - 1;
        var currentLastLine = current[currentLastIndex];
        var commonRootMeetPoint = -1;

        for (var j = prev.length - 1; j >= 0; --j) {
            if (prev[j] === currentLastLine) {
                commonRootMeetPoint = j;
                break;
            }
        }

        for (var j = commonRootMeetPoint; j >= 0; --j) {
            var line = prev[j];
            if (current[currentLastIndex] === line) {
                current.pop();
                currentLastIndex--;
            } else {
                break;
            }
        }
        current = prev;
    }
}

function cleanStack(stack) {
    var ret = [];
    for (var i = 0; i < stack.length; ++i) {
        var line = stack[i];
        var isTraceLine = "    (No stack trace)" === line ||
            stackFramePattern.test(line);
        var isInternalFrame = isTraceLine && shouldIgnore(line);
        if (isTraceLine && !isInternalFrame) {
            if (indentStackFrames && line.charAt(0) !== " ") {
                line = "    " + line;
            }
            ret.push(line);
        }
    }
    return ret;
}

function stackFramesAsArray(error) {
    var stack = error.stack.replace(/\s+$/g, "").split("\n");
    for (var i = 0; i < stack.length; ++i) {
        var line = stack[i];
        if ("    (No stack trace)" === line || stackFramePattern.test(line)) {
            break;
        }
    }
    if (i > 0 && error.name != "SyntaxError") {
        stack = stack.slice(i);
    }
    return stack;
}

function parseStackAndMessage(error) {
    var stack = error.stack;
    var message = error.toString();
    stack = typeof stack === "string" && stack.length > 0
                ? stackFramesAsArray(error) : ["    (No stack trace)"];
    return {
        message: message,
        stack: error.name == "SyntaxError" ? stack : cleanStack(stack)
    };
}

function formatAndLogError(error, title, isSoft) {
    if (typeof console !== "undefined") {
        var message;
        if (util.isObject(error)) {
            var stack = error.stack;
            message = title + formatStack(stack, error);
        } else {
            message = title + String(error);
        }
        if (typeof printWarning === "function") {
            printWarning(message, isSoft);
        } else if (typeof console.log === "function" ||
            typeof console.log === "object") {
            console.log(message);
        }
    }
}

function fireRejectionEvent(name, localHandler, reason, promise) {
    var localEventFired = false;
    try {
        if (typeof localHandler === "function") {
            localEventFired = true;
            if (name === "rejectionHandled") {
                localHandler(promise);
            } else {
                localHandler(reason, promise);
            }
        }
    } catch (e) {
        async.throwLater(e);
    }

    if (name === "unhandledRejection") {
        if (!activeFireEvent(name, reason, promise) && !localEventFired) {
            formatAndLogError(reason, "Unhandled rejection ");
        }
    } else {
        activeFireEvent(name, promise);
    }
}

function formatNonError(obj) {
    var str;
    if (typeof obj === "function") {
        str = "[function " +
            (obj.name || "anonymous") +
            "]";
    } else {
        str = obj && typeof obj.toString === "function"
            ? obj.toString() : util.toString(obj);
        var ruselessToString = /\[object [a-zA-Z0-9$_]+\]/;
        if (ruselessToString.test(str)) {
            try {
                var newStr = JSON.stringify(obj);
                str = newStr;
            }
            catch(e) {

            }
        }
        if (str.length === 0) {
            str = "(empty array)";
        }
    }
    return ("(<" + snip(str) + ">, no stack trace)");
}

function snip(str) {
    var maxChars = 41;
    if (str.length < maxChars) {
        return str;
    }
    return str.substr(0, maxChars - 3) + "...";
}

function longStackTracesIsSupported() {
    return typeof captureStackTrace === "function";
}

var shouldIgnore = function() { return false; };
var parseLineInfoRegex = /[\/<\(]([^:\/]+):(\d+):(?:\d+)\)?\s*$/;
function parseLineInfo(line) {
    var matches = line.match(parseLineInfoRegex);
    if (matches) {
        return {
            fileName: matches[1],
            line: parseInt(matches[2], 10)
        };
    }
}

function setBounds(firstLineError, lastLineError) {
    if (!longStackTracesIsSupported()) return;
    var firstStackLines = firstLineError.stack.split("\n");
    var lastStackLines = lastLineError.stack.split("\n");
    var firstIndex = -1;
    var lastIndex = -1;
    var firstFileName;
    var lastFileName;
    for (var i = 0; i < firstStackLines.length; ++i) {
        var result = parseLineInfo(firstStackLines[i]);
        if (result) {
            firstFileName = result.fileName;
            firstIndex = result.line;
            break;
        }
    }
    for (var i = 0; i < lastStackLines.length; ++i) {
        var result = parseLineInfo(lastStackLines[i]);
        if (result) {
            lastFileName = result.fileName;
            lastIndex = result.line;
            break;
        }
    }
    if (firstIndex < 0 || lastIndex < 0 || !firstFileName || !lastFileName ||
        firstFileName !== lastFileName || firstIndex >= lastIndex) {
        return;
    }

    shouldIgnore = function(line) {
        if (bluebirdFramePattern.test(line)) return true;
        var info = parseLineInfo(line);
        if (info) {
            if (info.fileName === firstFileName &&
                (firstIndex <= info.line && info.line <= lastIndex)) {
                return true;
            }
        }
        return false;
    };
}

function CapturedTrace(parent) {
    this._parent = parent;
    this._promisesCreated = 0;
    var length = this._length = 1 + (parent === undefined ? 0 : parent._length);
    captureStackTrace(this, CapturedTrace);
    if (length > 32) this.uncycle();
}
util.inherits(CapturedTrace, Error);
Context.CapturedTrace = CapturedTrace;

CapturedTrace.prototype.uncycle = function() {
    var length = this._length;
    if (length < 2) return;
    var nodes = [];
    var stackToIndex = {};

    for (var i = 0, node = this; node !== undefined; ++i) {
        nodes.push(node);
        node = node._parent;
    }
    length = this._length = i;
    for (var i = length - 1; i >= 0; --i) {
        var stack = nodes[i].stack;
        if (stackToIndex[stack] === undefined) {
            stackToIndex[stack] = i;
        }
    }
    for (var i = 0; i < length; ++i) {
        var currentStack = nodes[i].stack;
        var index = stackToIndex[currentStack];
        if (index !== undefined && index !== i) {
            if (index > 0) {
                nodes[index - 1]._parent = undefined;
                nodes[index - 1]._length = 1;
            }
            nodes[i]._parent = undefined;
            nodes[i]._length = 1;
            var cycleEdgeNode = i > 0 ? nodes[i - 1] : this;

            if (index < length - 1) {
                cycleEdgeNode._parent = nodes[index + 1];
                cycleEdgeNode._parent.uncycle();
                cycleEdgeNode._length =
                    cycleEdgeNode._parent._length + 1;
            } else {
                cycleEdgeNode._parent = undefined;
                cycleEdgeNode._length = 1;
            }
            var currentChildLength = cycleEdgeNode._length + 1;
            for (var j = i - 2; j >= 0; --j) {
                nodes[j]._length = currentChildLength;
                currentChildLength++;
            }
            return;
        }
    }
};

CapturedTrace.prototype.attachExtraTrace = function(error) {
    if (error.__stackCleaned__) return;
    this.uncycle();
    var parsed = parseStackAndMessage(error);
    var message = parsed.message;
    var stacks = [parsed.stack];

    var trace = this;
    while (trace !== undefined) {
        stacks.push(cleanStack(trace.stack.split("\n")));
        trace = trace._parent;
    }
    removeCommonRoots(stacks);
    removeDuplicateOrEmptyJumps(stacks);
    util.notEnumerableProp(error, "stack", reconstructStack(message, stacks));
    util.notEnumerableProp(error, "__stackCleaned__", true);
};

var captureStackTrace = (function stackDetection() {
    var v8stackFramePattern = /^\s*at\s*/;
    var v8stackFormatter = function(stack, error) {
        if (typeof stack === "string") return stack;

        if (error.name !== undefined &&
            error.message !== undefined) {
            return error.toString();
        }
        return formatNonError(error);
    };

    if (typeof Error.stackTraceLimit === "number" &&
        typeof Error.captureStackTrace === "function") {
        Error.stackTraceLimit += 6;
        stackFramePattern = v8stackFramePattern;
        formatStack = v8stackFormatter;
        var captureStackTrace = Error.captureStackTrace;

        shouldIgnore = function(line) {
            return bluebirdFramePattern.test(line);
        };
        return function(receiver, ignoreUntil) {
            Error.stackTraceLimit += 6;
            captureStackTrace(receiver, ignoreUntil);
            Error.stackTraceLimit -= 6;
        };
    }
    var err = new Error();

    if (typeof err.stack === "string" &&
        err.stack.split("\n")[0].indexOf("stackDetection@") >= 0) {
        stackFramePattern = /@/;
        formatStack = v8stackFormatter;
        indentStackFrames = true;
        return function captureStackTrace(o) {
            o.stack = new Error().stack;
        };
    }

    var hasStackAfterThrow;
    try { throw new Error(); }
    catch(e) {
        hasStackAfterThrow = ("stack" in e);
    }
    if (!("stack" in err) && hasStackAfterThrow &&
        typeof Error.stackTraceLimit === "number") {
        stackFramePattern = v8stackFramePattern;
        formatStack = v8stackFormatter;
        return function captureStackTrace(o) {
            Error.stackTraceLimit += 6;
            try { throw new Error(); }
            catch(e) { o.stack = e.stack; }
            Error.stackTraceLimit -= 6;
        };
    }

    formatStack = function(stack, error) {
        if (typeof stack === "string") return stack;

        if ((typeof error === "object" ||
            typeof error === "function") &&
            error.name !== undefined &&
            error.message !== undefined) {
            return error.toString();
        }
        return formatNonError(error);
    };

    return null;

})([]);

if (typeof console !== "undefined" && typeof console.warn !== "undefined") {
    printWarning = function (message) {
        console.warn(message);
    };
    if (util.isNode && process.stderr.isTTY) {
        printWarning = function(message, isSoft) {
            var color = isSoft ? "\u001b[33m" : "\u001b[31m";
            console.warn(color + message + "\u001b[0m\n");
        };
    } else if (!util.isNode && typeof (new Error().stack) === "string") {
        printWarning = function(message, isSoft) {
            console.warn("%c" + message,
                        isSoft ? "color: darkorange" : "color: red");
        };
    }
}

var config = {
    warnings: warnings,
    longStackTraces: false,
    cancellation: false,
    monitoring: false
};

if (longStackTraces) Promise.longStackTraces();

return {
    longStackTraces: function() {
        return config.longStackTraces;
    },
    warnings: function() {
        return config.warnings;
    },
    cancellation: function() {
        return config.cancellation;
    },
    monitoring: function() {
        return config.monitoring;
    },
    propagateFromFunction: function() {
        return propagateFromFunction;
    },
    boundValueFunction: function() {
        return boundValueFunction;
    },
    checkForgottenReturns: checkForgottenReturns,
    setBounds: setBounds,
    warn: warn,
    deprecated: deprecated,
    CapturedTrace: CapturedTrace,
    fireDomEvent: fireDomEvent,
    fireGlobalEvent: fireGlobalEvent
};
};

},{"./errors":12,"./util":36}],10:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise) {
function returner() {
    return this.value;
}
function thrower() {
    throw this.reason;
}

Promise.prototype["return"] =
Promise.prototype.thenReturn = function (value) {
    if (value instanceof Promise) value.suppressUnhandledRejections();
    return this._then(
        returner, undefined, undefined, {value: value}, undefined);
};

Promise.prototype["throw"] =
Promise.prototype.thenThrow = function (reason) {
    return this._then(
        thrower, undefined, undefined, {reason: reason}, undefined);
};

Promise.prototype.catchThrow = function (reason) {
    if (arguments.length <= 1) {
        return this._then(
            undefined, thrower, undefined, {reason: reason}, undefined);
    } else {
        var _reason = arguments[1];
        var handler = function() {throw _reason;};
        return this.caught(reason, handler);
    }
};

Promise.prototype.catchReturn = function (value) {
    if (arguments.length <= 1) {
        if (value instanceof Promise) value.suppressUnhandledRejections();
        return this._then(
            undefined, returner, undefined, {value: value}, undefined);
    } else {
        var _value = arguments[1];
        if (_value instanceof Promise) _value.suppressUnhandledRejections();
        var handler = function() {return _value;};
        return this.caught(value, handler);
    }
};
};

},{}],11:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, INTERNAL) {
var PromiseReduce = Promise.reduce;
var PromiseAll = Promise.all;

function promiseAllThis() {
    return PromiseAll(this);
}

function PromiseMapSeries(promises, fn) {
    return PromiseReduce(promises, fn, INTERNAL, INTERNAL);
}

Promise.prototype.each = function (fn) {
    return PromiseReduce(this, fn, INTERNAL, 0)
              ._then(promiseAllThis, undefined, undefined, this, undefined);
};

Promise.prototype.mapSeries = function (fn) {
    return PromiseReduce(this, fn, INTERNAL, INTERNAL);
};

Promise.each = function (promises, fn) {
    return PromiseReduce(promises, fn, INTERNAL, 0)
              ._then(promiseAllThis, undefined, undefined, promises, undefined);
};

Promise.mapSeries = PromiseMapSeries;
};


},{}],12:[function(_dereq_,module,exports){
"use strict";
var es5 = _dereq_("./es5");
var Objectfreeze = es5.freeze;
var util = _dereq_("./util");
var inherits = util.inherits;
var notEnumerableProp = util.notEnumerableProp;

function subError(nameProperty, defaultMessage) {
    function SubError(message) {
        if (!(this instanceof SubError)) return new SubError(message);
        notEnumerableProp(this, "message",
            typeof message === "string" ? message : defaultMessage);
        notEnumerableProp(this, "name", nameProperty);
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        } else {
            Error.call(this);
        }
    }
    inherits(SubError, Error);
    return SubError;
}

var _TypeError, _RangeError;
var Warning = subError("Warning", "warning");
var CancellationError = subError("CancellationError", "cancellation error");
var TimeoutError = subError("TimeoutError", "timeout error");
var AggregateError = subError("AggregateError", "aggregate error");
try {
    _TypeError = TypeError;
    _RangeError = RangeError;
} catch(e) {
    _TypeError = subError("TypeError", "type error");
    _RangeError = subError("RangeError", "range error");
}

var methods = ("join pop push shift unshift slice filter forEach some " +
    "every map indexOf lastIndexOf reduce reduceRight sort reverse").split(" ");

for (var i = 0; i < methods.length; ++i) {
    if (typeof Array.prototype[methods[i]] === "function") {
        AggregateError.prototype[methods[i]] = Array.prototype[methods[i]];
    }
}

es5.defineProperty(AggregateError.prototype, "length", {
    value: 0,
    configurable: false,
    writable: true,
    enumerable: true
});
AggregateError.prototype["isOperational"] = true;
var level = 0;
AggregateError.prototype.toString = function() {
    var indent = Array(level * 4 + 1).join(" ");
    var ret = "\n" + indent + "AggregateError of:" + "\n";
    level++;
    indent = Array(level * 4 + 1).join(" ");
    for (var i = 0; i < this.length; ++i) {
        var str = this[i] === this ? "[Circular AggregateError]" : this[i] + "";
        var lines = str.split("\n");
        for (var j = 0; j < lines.length; ++j) {
            lines[j] = indent + lines[j];
        }
        str = lines.join("\n");
        ret += str + "\n";
    }
    level--;
    return ret;
};

function OperationalError(message) {
    if (!(this instanceof OperationalError))
        return new OperationalError(message);
    notEnumerableProp(this, "name", "OperationalError");
    notEnumerableProp(this, "message", message);
    this.cause = message;
    this["isOperational"] = true;

    if (message instanceof Error) {
        notEnumerableProp(this, "message", message.message);
        notEnumerableProp(this, "stack", message.stack);
    } else if (Error.captureStackTrace) {
        Error.captureStackTrace(this, this.constructor);
    }

}
inherits(OperationalError, Error);

var errorTypes = Error["__BluebirdErrorTypes__"];
if (!errorTypes) {
    errorTypes = Objectfreeze({
        CancellationError: CancellationError,
        TimeoutError: TimeoutError,
        OperationalError: OperationalError,
        RejectionError: OperationalError,
        AggregateError: AggregateError
    });
    es5.defineProperty(Error, "__BluebirdErrorTypes__", {
        value: errorTypes,
        writable: false,
        enumerable: false,
        configurable: false
    });
}

module.exports = {
    Error: Error,
    TypeError: _TypeError,
    RangeError: _RangeError,
    CancellationError: errorTypes.CancellationError,
    OperationalError: errorTypes.OperationalError,
    TimeoutError: errorTypes.TimeoutError,
    AggregateError: errorTypes.AggregateError,
    Warning: Warning
};

},{"./es5":13,"./util":36}],13:[function(_dereq_,module,exports){
var isES5 = (function(){
    "use strict";
    return this === undefined;
})();

if (isES5) {
    module.exports = {
        freeze: Object.freeze,
        defineProperty: Object.defineProperty,
        getDescriptor: Object.getOwnPropertyDescriptor,
        keys: Object.keys,
        names: Object.getOwnPropertyNames,
        getPrototypeOf: Object.getPrototypeOf,
        isArray: Array.isArray,
        isES5: isES5,
        propertyIsWritable: function(obj, prop) {
            var descriptor = Object.getOwnPropertyDescriptor(obj, prop);
            return !!(!descriptor || descriptor.writable || descriptor.set);
        }
    };
} else {
    var has = {}.hasOwnProperty;
    var str = {}.toString;
    var proto = {}.constructor.prototype;

    var ObjectKeys = function (o) {
        var ret = [];
        for (var key in o) {
            if (has.call(o, key)) {
                ret.push(key);
            }
        }
        return ret;
    };

    var ObjectGetDescriptor = function(o, key) {
        return {value: o[key]};
    };

    var ObjectDefineProperty = function (o, key, desc) {
        o[key] = desc.value;
        return o;
    };

    var ObjectFreeze = function (obj) {
        return obj;
    };

    var ObjectGetPrototypeOf = function (obj) {
        try {
            return Object(obj).constructor.prototype;
        }
        catch (e) {
            return proto;
        }
    };

    var ArrayIsArray = function (obj) {
        try {
            return str.call(obj) === "[object Array]";
        }
        catch(e) {
            return false;
        }
    };

    module.exports = {
        isArray: ArrayIsArray,
        keys: ObjectKeys,
        names: ObjectKeys,
        defineProperty: ObjectDefineProperty,
        getDescriptor: ObjectGetDescriptor,
        freeze: ObjectFreeze,
        getPrototypeOf: ObjectGetPrototypeOf,
        isES5: isES5,
        propertyIsWritable: function() {
            return true;
        }
    };
}

},{}],14:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, INTERNAL) {
var PromiseMap = Promise.map;

Promise.prototype.filter = function (fn, options) {
    return PromiseMap(this, fn, options, INTERNAL);
};

Promise.filter = function (promises, fn, options) {
    return PromiseMap(promises, fn, options, INTERNAL);
};
};

},{}],15:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, tryConvertToPromise, NEXT_FILTER) {
var util = _dereq_("./util");
var CancellationError = Promise.CancellationError;
var errorObj = util.errorObj;
var catchFilter = _dereq_("./catch_filter")(NEXT_FILTER);

function PassThroughHandlerContext(promise, type, handler) {
    this.promise = promise;
    this.type = type;
    this.handler = handler;
    this.called = false;
    this.cancelPromise = null;
}

PassThroughHandlerContext.prototype.isFinallyHandler = function() {
    return this.type === 0;
};

function FinallyHandlerCancelReaction(finallyHandler) {
    this.finallyHandler = finallyHandler;
}

FinallyHandlerCancelReaction.prototype._resultCancelled = function() {
    checkCancel(this.finallyHandler);
};

function checkCancel(ctx, reason) {
    if (ctx.cancelPromise != null) {
        if (arguments.length > 1) {
            ctx.cancelPromise._reject(reason);
        } else {
            ctx.cancelPromise._cancel();
        }
        ctx.cancelPromise = null;
        return true;
    }
    return false;
}

function succeed() {
    return finallyHandler.call(this, this.promise._target()._settledValue());
}
function fail(reason) {
    if (checkCancel(this, reason)) return;
    errorObj.e = reason;
    return errorObj;
}
function finallyHandler(reasonOrValue) {
    var promise = this.promise;
    var handler = this.handler;

    if (!this.called) {
        this.called = true;
        var ret = this.isFinallyHandler()
            ? handler.call(promise._boundValue())
            : handler.call(promise._boundValue(), reasonOrValue);
        if (ret === NEXT_FILTER) {
            return ret;
        } else if (ret !== undefined) {
            promise._setReturnedNonUndefined();
            var maybePromise = tryConvertToPromise(ret, promise);
            if (maybePromise instanceof Promise) {
                if (this.cancelPromise != null) {
                    if (maybePromise._isCancelled()) {
                        var reason =
                            new CancellationError("late cancellation observer");
                        promise._attachExtraTrace(reason);
                        errorObj.e = reason;
                        return errorObj;
                    } else if (maybePromise.isPending()) {
                        maybePromise._attachCancellationCallback(
                            new FinallyHandlerCancelReaction(this));
                    }
                }
                return maybePromise._then(
                    succeed, fail, undefined, this, undefined);
            }
        }
    }

    if (promise.isRejected()) {
        checkCancel(this);
        errorObj.e = reasonOrValue;
        return errorObj;
    } else {
        checkCancel(this);
        return reasonOrValue;
    }
}

Promise.prototype._passThrough = function(handler, type, success, fail) {
    if (typeof handler !== "function") return this.then();
    return this._then(success,
                      fail,
                      undefined,
                      new PassThroughHandlerContext(this, type, handler),
                      undefined);
};

Promise.prototype.lastly =
Promise.prototype["finally"] = function (handler) {
    return this._passThrough(handler,
                             0,
                             finallyHandler,
                             finallyHandler);
};


Promise.prototype.tap = function (handler) {
    return this._passThrough(handler, 1, finallyHandler);
};

Promise.prototype.tapCatch = function (handlerOrPredicate) {
    var len = arguments.length;
    if(len === 1) {
        return this._passThrough(handlerOrPredicate,
                                 1,
                                 undefined,
                                 finallyHandler);
    } else {
         var catchInstances = new Array(len - 1),
            j = 0, i;
        for (i = 0; i < len - 1; ++i) {
            var item = arguments[i];
            if (util.isObject(item)) {
                catchInstances[j++] = item;
            } else {
                return Promise.reject(new TypeError(
                    "tapCatch statement predicate: "
                    + "expecting an object but got " + util.classString(item)
                ));
            }
        }
        catchInstances.length = j;
        var handler = arguments[i];
        return this._passThrough(catchFilter(catchInstances, handler, this),
                                 1,
                                 undefined,
                                 finallyHandler);
    }

};

return PassThroughHandlerContext;
};

},{"./catch_filter":7,"./util":36}],16:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise,
                          apiRejection,
                          INTERNAL,
                          tryConvertToPromise,
                          Proxyable,
                          debug) {
var errors = _dereq_("./errors");
var TypeError = errors.TypeError;
var util = _dereq_("./util");
var errorObj = util.errorObj;
var tryCatch = util.tryCatch;
var yieldHandlers = [];

function promiseFromYieldHandler(value, yieldHandlers, traceParent) {
    for (var i = 0; i < yieldHandlers.length; ++i) {
        traceParent._pushContext();
        var result = tryCatch(yieldHandlers[i])(value);
        traceParent._popContext();
        if (result === errorObj) {
            traceParent._pushContext();
            var ret = Promise.reject(errorObj.e);
            traceParent._popContext();
            return ret;
        }
        var maybePromise = tryConvertToPromise(result, traceParent);
        if (maybePromise instanceof Promise) return maybePromise;
    }
    return null;
}

function PromiseSpawn(generatorFunction, receiver, yieldHandler, stack) {
    if (debug.cancellation()) {
        var internal = new Promise(INTERNAL);
        var _finallyPromise = this._finallyPromise = new Promise(INTERNAL);
        this._promise = internal.lastly(function() {
            return _finallyPromise;
        });
        internal._captureStackTrace();
        internal._setOnCancel(this);
    } else {
        var promise = this._promise = new Promise(INTERNAL);
        promise._captureStackTrace();
    }
    this._stack = stack;
    this._generatorFunction = generatorFunction;
    this._receiver = receiver;
    this._generator = undefined;
    this._yieldHandlers = typeof yieldHandler === "function"
        ? [yieldHandler].concat(yieldHandlers)
        : yieldHandlers;
    this._yieldedPromise = null;
    this._cancellationPhase = false;
}
util.inherits(PromiseSpawn, Proxyable);

PromiseSpawn.prototype._isResolved = function() {
    return this._promise === null;
};

PromiseSpawn.prototype._cleanup = function() {
    this._promise = this._generator = null;
    if (debug.cancellation() && this._finallyPromise !== null) {
        this._finallyPromise._fulfill();
        this._finallyPromise = null;
    }
};

PromiseSpawn.prototype._promiseCancelled = function() {
    if (this._isResolved()) return;
    var implementsReturn = typeof this._generator["return"] !== "undefined";

    var result;
    if (!implementsReturn) {
        var reason = new Promise.CancellationError(
            "generator .return() sentinel");
        Promise.coroutine.returnSentinel = reason;
        this._promise._attachExtraTrace(reason);
        this._promise._pushContext();
        result = tryCatch(this._generator["throw"]).call(this._generator,
                                                         reason);
        this._promise._popContext();
    } else {
        this._promise._pushContext();
        result = tryCatch(this._generator["return"]).call(this._generator,
                                                          undefined);
        this._promise._popContext();
    }
    this._cancellationPhase = true;
    this._yieldedPromise = null;
    this._continue(result);
};

PromiseSpawn.prototype._promiseFulfilled = function(value) {
    this._yieldedPromise = null;
    this._promise._pushContext();
    var result = tryCatch(this._generator.next).call(this._generator, value);
    this._promise._popContext();
    this._continue(result);
};

PromiseSpawn.prototype._promiseRejected = function(reason) {
    this._yieldedPromise = null;
    this._promise._attachExtraTrace(reason);
    this._promise._pushContext();
    var result = tryCatch(this._generator["throw"])
        .call(this._generator, reason);
    this._promise._popContext();
    this._continue(result);
};

PromiseSpawn.prototype._resultCancelled = function() {
    if (this._yieldedPromise instanceof Promise) {
        var promise = this._yieldedPromise;
        this._yieldedPromise = null;
        promise.cancel();
    }
};

PromiseSpawn.prototype.promise = function () {
    return this._promise;
};

PromiseSpawn.prototype._run = function () {
    this._generator = this._generatorFunction.call(this._receiver);
    this._receiver =
        this._generatorFunction = undefined;
    this._promiseFulfilled(undefined);
};

PromiseSpawn.prototype._continue = function (result) {
    var promise = this._promise;
    if (result === errorObj) {
        this._cleanup();
        if (this._cancellationPhase) {
            return promise.cancel();
        } else {
            return promise._rejectCallback(result.e, false);
        }
    }

    var value = result.value;
    if (result.done === true) {
        this._cleanup();
        if (this._cancellationPhase) {
            return promise.cancel();
        } else {
            return promise._resolveCallback(value);
        }
    } else {
        var maybePromise = tryConvertToPromise(value, this._promise);
        if (!(maybePromise instanceof Promise)) {
            maybePromise =
                promiseFromYieldHandler(maybePromise,
                                        this._yieldHandlers,
                                        this._promise);
            if (maybePromise === null) {
                this._promiseRejected(
                    new TypeError(
                        "A value %s was yielded that could not be treated as a promise\u000a\u000a    See http://goo.gl/MqrFmX\u000a\u000a".replace("%s", String(value)) +
                        "From coroutine:\u000a" +
                        this._stack.split("\n").slice(1, -7).join("\n")
                    )
                );
                return;
            }
        }
        maybePromise = maybePromise._target();
        var bitField = maybePromise._bitField;
        ;
        if (((bitField & 50397184) === 0)) {
            this._yieldedPromise = maybePromise;
            maybePromise._proxy(this, null);
        } else if (((bitField & 33554432) !== 0)) {
            Promise._async.invoke(
                this._promiseFulfilled, this, maybePromise._value()
            );
        } else if (((bitField & 16777216) !== 0)) {
            Promise._async.invoke(
                this._promiseRejected, this, maybePromise._reason()
            );
        } else {
            this._promiseCancelled();
        }
    }
};

Promise.coroutine = function (generatorFunction, options) {
    if (typeof generatorFunction !== "function") {
        throw new TypeError("generatorFunction must be a function\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
    }
    var yieldHandler = Object(options).yieldHandler;
    var PromiseSpawn$ = PromiseSpawn;
    var stack = new Error().stack;
    return function () {
        var generator = generatorFunction.apply(this, arguments);
        var spawn = new PromiseSpawn$(undefined, undefined, yieldHandler,
                                      stack);
        var ret = spawn.promise();
        spawn._generator = generator;
        spawn._promiseFulfilled(undefined);
        return ret;
    };
};

Promise.coroutine.addYieldHandler = function(fn) {
    if (typeof fn !== "function") {
        throw new TypeError("expecting a function but got " + util.classString(fn));
    }
    yieldHandlers.push(fn);
};

Promise.spawn = function (generatorFunction) {
    debug.deprecated("Promise.spawn()", "Promise.coroutine()");
    if (typeof generatorFunction !== "function") {
        return apiRejection("generatorFunction must be a function\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
    }
    var spawn = new PromiseSpawn(generatorFunction, this);
    var ret = spawn.promise();
    spawn._run(Promise.spawn);
    return ret;
};
};

},{"./errors":12,"./util":36}],17:[function(_dereq_,module,exports){
"use strict";
module.exports =
function(Promise, PromiseArray, tryConvertToPromise, INTERNAL, async,
         getDomain) {
var util = _dereq_("./util");
var canEvaluate = util.canEvaluate;
var tryCatch = util.tryCatch;
var errorObj = util.errorObj;
var reject;

if (!true) {
if (canEvaluate) {
    var thenCallback = function(i) {
        return new Function("value", "holder", "                             \n\
            'use strict';                                                    \n\
            holder.pIndex = value;                                           \n\
            holder.checkFulfillment(this);                                   \n\
            ".replace(/Index/g, i));
    };

    var promiseSetter = function(i) {
        return new Function("promise", "holder", "                           \n\
            'use strict';                                                    \n\
            holder.pIndex = promise;                                         \n\
            ".replace(/Index/g, i));
    };

    var generateHolderClass = function(total) {
        var props = new Array(total);
        for (var i = 0; i < props.length; ++i) {
            props[i] = "this.p" + (i+1);
        }
        var assignment = props.join(" = ") + " = null;";
        var cancellationCode= "var promise;\n" + props.map(function(prop) {
            return "                                                         \n\
                promise = " + prop + ";                                      \n\
                if (promise instanceof Promise) {                            \n\
                    promise.cancel();                                        \n\
                }                                                            \n\
            ";
        }).join("\n");
        var passedArguments = props.join(", ");
        var name = "Holder$" + total;


        var code = "return function(tryCatch, errorObj, Promise, async) {    \n\
            'use strict';                                                    \n\
            function [TheName](fn) {                                         \n\
                [TheProperties]                                              \n\
                this.fn = fn;                                                \n\
                this.asyncNeeded = true;                                     \n\
                this.now = 0;                                                \n\
            }                                                                \n\
                                                                             \n\
            [TheName].prototype._callFunction = function(promise) {          \n\
                promise._pushContext();                                      \n\
                var ret = tryCatch(this.fn)([ThePassedArguments]);           \n\
                promise._popContext();                                       \n\
                if (ret === errorObj) {                                      \n\
                    promise._rejectCallback(ret.e, false);                   \n\
                } else {                                                     \n\
                    promise._resolveCallback(ret);                           \n\
                }                                                            \n\
            };                                                               \n\
                                                                             \n\
            [TheName].prototype.checkFulfillment = function(promise) {       \n\
                var now = ++this.now;                                        \n\
                if (now === [TheTotal]) {                                    \n\
                    if (this.asyncNeeded) {                                  \n\
                        async.invoke(this._callFunction, this, promise);     \n\
                    } else {                                                 \n\
                        this._callFunction(promise);                         \n\
                    }                                                        \n\
                                                                             \n\
                }                                                            \n\
            };                                                               \n\
                                                                             \n\
            [TheName].prototype._resultCancelled = function() {              \n\
                [CancellationCode]                                           \n\
            };                                                               \n\
                                                                             \n\
            return [TheName];                                                \n\
        }(tryCatch, errorObj, Promise, async);                               \n\
        ";

        code = code.replace(/\[TheName\]/g, name)
            .replace(/\[TheTotal\]/g, total)
            .replace(/\[ThePassedArguments\]/g, passedArguments)
            .replace(/\[TheProperties\]/g, assignment)
            .replace(/\[CancellationCode\]/g, cancellationCode);

        return new Function("tryCatch", "errorObj", "Promise", "async", code)
                           (tryCatch, errorObj, Promise, async);
    };

    var holderClasses = [];
    var thenCallbacks = [];
    var promiseSetters = [];

    for (var i = 0; i < 8; ++i) {
        holderClasses.push(generateHolderClass(i + 1));
        thenCallbacks.push(thenCallback(i + 1));
        promiseSetters.push(promiseSetter(i + 1));
    }

    reject = function (reason) {
        this._reject(reason);
    };
}}

Promise.join = function () {
    var last = arguments.length - 1;
    var fn;
    if (last > 0 && typeof arguments[last] === "function") {
        fn = arguments[last];
        if (!true) {
            if (last <= 8 && canEvaluate) {
                var ret = new Promise(INTERNAL);
                ret._captureStackTrace();
                var HolderClass = holderClasses[last - 1];
                var holder = new HolderClass(fn);
                var callbacks = thenCallbacks;

                for (var i = 0; i < last; ++i) {
                    var maybePromise = tryConvertToPromise(arguments[i], ret);
                    if (maybePromise instanceof Promise) {
                        maybePromise = maybePromise._target();
                        var bitField = maybePromise._bitField;
                        ;
                        if (((bitField & 50397184) === 0)) {
                            maybePromise._then(callbacks[i], reject,
                                               undefined, ret, holder);
                            promiseSetters[i](maybePromise, holder);
                            holder.asyncNeeded = false;
                        } else if (((bitField & 33554432) !== 0)) {
                            callbacks[i].call(ret,
                                              maybePromise._value(), holder);
                        } else if (((bitField & 16777216) !== 0)) {
                            ret._reject(maybePromise._reason());
                        } else {
                            ret._cancel();
                        }
                    } else {
                        callbacks[i].call(ret, maybePromise, holder);
                    }
                }

                if (!ret._isFateSealed()) {
                    if (holder.asyncNeeded) {
                        var domain = getDomain();
                        if (domain !== null) {
                            holder.fn = util.domainBind(domain, holder.fn);
                        }
                    }
                    ret._setAsyncGuaranteed();
                    ret._setOnCancel(holder);
                }
                return ret;
            }
        }
    }
    var args = [].slice.call(arguments);;
    if (fn) args.pop();
    var ret = new PromiseArray(args).promise();
    return fn !== undefined ? ret.spread(fn) : ret;
};

};

},{"./util":36}],18:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise,
                          PromiseArray,
                          apiRejection,
                          tryConvertToPromise,
                          INTERNAL,
                          debug) {
var getDomain = Promise._getDomain;
var util = _dereq_("./util");
var tryCatch = util.tryCatch;
var errorObj = util.errorObj;
var async = Promise._async;

function MappingPromiseArray(promises, fn, limit, _filter) {
    this.constructor$(promises);
    this._promise._captureStackTrace();
    var domain = getDomain();
    this._callback = domain === null ? fn : util.domainBind(domain, fn);
    this._preservedValues = _filter === INTERNAL
        ? new Array(this.length())
        : null;
    this._limit = limit;
    this._inFlight = 0;
    this._queue = [];
    async.invoke(this._asyncInit, this, undefined);
}
util.inherits(MappingPromiseArray, PromiseArray);

MappingPromiseArray.prototype._asyncInit = function() {
    this._init$(undefined, -2);
};

MappingPromiseArray.prototype._init = function () {};

MappingPromiseArray.prototype._promiseFulfilled = function (value, index) {
    var values = this._values;
    var length = this.length();
    var preservedValues = this._preservedValues;
    var limit = this._limit;

    if (index < 0) {
        index = (index * -1) - 1;
        values[index] = value;
        if (limit >= 1) {
            this._inFlight--;
            this._drainQueue();
            if (this._isResolved()) return true;
        }
    } else {
        if (limit >= 1 && this._inFlight >= limit) {
            values[index] = value;
            this._queue.push(index);
            return false;
        }
        if (preservedValues !== null) preservedValues[index] = value;

        var promise = this._promise;
        var callback = this._callback;
        var receiver = promise._boundValue();
        promise._pushContext();
        var ret = tryCatch(callback).call(receiver, value, index, length);
        var promiseCreated = promise._popContext();
        debug.checkForgottenReturns(
            ret,
            promiseCreated,
            preservedValues !== null ? "Promise.filter" : "Promise.map",
            promise
        );
        if (ret === errorObj) {
            this._reject(ret.e);
            return true;
        }

        var maybePromise = tryConvertToPromise(ret, this._promise);
        if (maybePromise instanceof Promise) {
            maybePromise = maybePromise._target();
            var bitField = maybePromise._bitField;
            ;
            if (((bitField & 50397184) === 0)) {
                if (limit >= 1) this._inFlight++;
                values[index] = maybePromise;
                maybePromise._proxy(this, (index + 1) * -1);
                return false;
            } else if (((bitField & 33554432) !== 0)) {
                ret = maybePromise._value();
            } else if (((bitField & 16777216) !== 0)) {
                this._reject(maybePromise._reason());
                return true;
            } else {
                this._cancel();
                return true;
            }
        }
        values[index] = ret;
    }
    var totalResolved = ++this._totalResolved;
    if (totalResolved >= length) {
        if (preservedValues !== null) {
            this._filter(values, preservedValues);
        } else {
            this._resolve(values);
        }
        return true;
    }
    return false;
};

MappingPromiseArray.prototype._drainQueue = function () {
    var queue = this._queue;
    var limit = this._limit;
    var values = this._values;
    while (queue.length > 0 && this._inFlight < limit) {
        if (this._isResolved()) return;
        var index = queue.pop();
        this._promiseFulfilled(values[index], index);
    }
};

MappingPromiseArray.prototype._filter = function (booleans, values) {
    var len = values.length;
    var ret = new Array(len);
    var j = 0;
    for (var i = 0; i < len; ++i) {
        if (booleans[i]) ret[j++] = values[i];
    }
    ret.length = j;
    this._resolve(ret);
};

MappingPromiseArray.prototype.preservedValues = function () {
    return this._preservedValues;
};

function map(promises, fn, options, _filter) {
    if (typeof fn !== "function") {
        return apiRejection("expecting a function but got " + util.classString(fn));
    }

    var limit = 0;
    if (options !== undefined) {
        if (typeof options === "object" && options !== null) {
            if (typeof options.concurrency !== "number") {
                return Promise.reject(
                    new TypeError("'concurrency' must be a number but it is " +
                                    util.classString(options.concurrency)));
            }
            limit = options.concurrency;
        } else {
            return Promise.reject(new TypeError(
                            "options argument must be an object but it is " +
                             util.classString(options)));
        }
    }
    limit = typeof limit === "number" &&
        isFinite(limit) && limit >= 1 ? limit : 0;
    return new MappingPromiseArray(promises, fn, limit, _filter).promise();
}

Promise.prototype.map = function (fn, options) {
    return map(this, fn, options, null);
};

Promise.map = function (promises, fn, options, _filter) {
    return map(promises, fn, options, _filter);
};


};

},{"./util":36}],19:[function(_dereq_,module,exports){
"use strict";
module.exports =
function(Promise, INTERNAL, tryConvertToPromise, apiRejection, debug) {
var util = _dereq_("./util");
var tryCatch = util.tryCatch;

Promise.method = function (fn) {
    if (typeof fn !== "function") {
        throw new Promise.TypeError("expecting a function but got " + util.classString(fn));
    }
    return function () {
        var ret = new Promise(INTERNAL);
        ret._captureStackTrace();
        ret._pushContext();
        var value = tryCatch(fn).apply(this, arguments);
        var promiseCreated = ret._popContext();
        debug.checkForgottenReturns(
            value, promiseCreated, "Promise.method", ret);
        ret._resolveFromSyncValue(value);
        return ret;
    };
};

Promise.attempt = Promise["try"] = function (fn) {
    if (typeof fn !== "function") {
        return apiRejection("expecting a function but got " + util.classString(fn));
    }
    var ret = new Promise(INTERNAL);
    ret._captureStackTrace();
    ret._pushContext();
    var value;
    if (arguments.length > 1) {
        debug.deprecated("calling Promise.try with more than 1 argument");
        var arg = arguments[1];
        var ctx = arguments[2];
        value = util.isArray(arg) ? tryCatch(fn).apply(ctx, arg)
                                  : tryCatch(fn).call(ctx, arg);
    } else {
        value = tryCatch(fn)();
    }
    var promiseCreated = ret._popContext();
    debug.checkForgottenReturns(
        value, promiseCreated, "Promise.try", ret);
    ret._resolveFromSyncValue(value);
    return ret;
};

Promise.prototype._resolveFromSyncValue = function (value) {
    if (value === util.errorObj) {
        this._rejectCallback(value.e, false);
    } else {
        this._resolveCallback(value, true);
    }
};
};

},{"./util":36}],20:[function(_dereq_,module,exports){
"use strict";
var util = _dereq_("./util");
var maybeWrapAsError = util.maybeWrapAsError;
var errors = _dereq_("./errors");
var OperationalError = errors.OperationalError;
var es5 = _dereq_("./es5");

function isUntypedError(obj) {
    return obj instanceof Error &&
        es5.getPrototypeOf(obj) === Error.prototype;
}

var rErrorKey = /^(?:name|message|stack|cause)$/;
function wrapAsOperationalError(obj) {
    var ret;
    if (isUntypedError(obj)) {
        ret = new OperationalError(obj);
        ret.name = obj.name;
        ret.message = obj.message;
        ret.stack = obj.stack;
        var keys = es5.keys(obj);
        for (var i = 0; i < keys.length; ++i) {
            var key = keys[i];
            if (!rErrorKey.test(key)) {
                ret[key] = obj[key];
            }
        }
        return ret;
    }
    util.markAsOriginatingFromRejection(obj);
    return obj;
}

function nodebackForPromise(promise, multiArgs) {
    return function(err, value) {
        if (promise === null) return;
        if (err) {
            var wrapped = wrapAsOperationalError(maybeWrapAsError(err));
            promise._attachExtraTrace(wrapped);
            promise._reject(wrapped);
        } else if (!multiArgs) {
            promise._fulfill(value);
        } else {
            var args = [].slice.call(arguments, 1);;
            promise._fulfill(args);
        }
        promise = null;
    };
}

module.exports = nodebackForPromise;

},{"./errors":12,"./es5":13,"./util":36}],21:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise) {
var util = _dereq_("./util");
var async = Promise._async;
var tryCatch = util.tryCatch;
var errorObj = util.errorObj;

function spreadAdapter(val, nodeback) {
    var promise = this;
    if (!util.isArray(val)) return successAdapter.call(promise, val, nodeback);
    var ret =
        tryCatch(nodeback).apply(promise._boundValue(), [null].concat(val));
    if (ret === errorObj) {
        async.throwLater(ret.e);
    }
}

function successAdapter(val, nodeback) {
    var promise = this;
    var receiver = promise._boundValue();
    var ret = val === undefined
        ? tryCatch(nodeback).call(receiver, null)
        : tryCatch(nodeback).call(receiver, null, val);
    if (ret === errorObj) {
        async.throwLater(ret.e);
    }
}
function errorAdapter(reason, nodeback) {
    var promise = this;
    if (!reason) {
        var newReason = new Error(reason + "");
        newReason.cause = reason;
        reason = newReason;
    }
    var ret = tryCatch(nodeback).call(promise._boundValue(), reason);
    if (ret === errorObj) {
        async.throwLater(ret.e);
    }
}

Promise.prototype.asCallback = Promise.prototype.nodeify = function (nodeback,
                                                                     options) {
    if (typeof nodeback == "function") {
        var adapter = successAdapter;
        if (options !== undefined && Object(options).spread) {
            adapter = spreadAdapter;
        }
        this._then(
            adapter,
            errorAdapter,
            undefined,
            this,
            nodeback
        );
    }
    return this;
};
};

},{"./util":36}],22:[function(_dereq_,module,exports){
"use strict";
module.exports = function() {
var makeSelfResolutionError = function () {
    return new TypeError("circular promise resolution chain\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
};
var reflectHandler = function() {
    return new Promise.PromiseInspection(this._target());
};
var apiRejection = function(msg) {
    return Promise.reject(new TypeError(msg));
};
function Proxyable() {}
var UNDEFINED_BINDING = {};
var util = _dereq_("./util");

var getDomain;
if (util.isNode) {
    getDomain = function() {
        var ret = process.domain;
        if (ret === undefined) ret = null;
        return ret;
    };
} else {
    getDomain = function() {
        return null;
    };
}
util.notEnumerableProp(Promise, "_getDomain", getDomain);

var es5 = _dereq_("./es5");
var Async = _dereq_("./async");
var async = new Async();
es5.defineProperty(Promise, "_async", {value: async});
var errors = _dereq_("./errors");
var TypeError = Promise.TypeError = errors.TypeError;
Promise.RangeError = errors.RangeError;
var CancellationError = Promise.CancellationError = errors.CancellationError;
Promise.TimeoutError = errors.TimeoutError;
Promise.OperationalError = errors.OperationalError;
Promise.RejectionError = errors.OperationalError;
Promise.AggregateError = errors.AggregateError;
var INTERNAL = function(){};
var APPLY = {};
var NEXT_FILTER = {};
var tryConvertToPromise = _dereq_("./thenables")(Promise, INTERNAL);
var PromiseArray =
    _dereq_("./promise_array")(Promise, INTERNAL,
                               tryConvertToPromise, apiRejection, Proxyable);
var Context = _dereq_("./context")(Promise);
 /*jshint unused:false*/
var createContext = Context.create;
var debug = _dereq_("./debuggability")(Promise, Context);
var CapturedTrace = debug.CapturedTrace;
var PassThroughHandlerContext =
    _dereq_("./finally")(Promise, tryConvertToPromise, NEXT_FILTER);
var catchFilter = _dereq_("./catch_filter")(NEXT_FILTER);
var nodebackForPromise = _dereq_("./nodeback");
var errorObj = util.errorObj;
var tryCatch = util.tryCatch;
function check(self, executor) {
    if (self == null || self.constructor !== Promise) {
        throw new TypeError("the promise constructor cannot be invoked directly\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
    }
    if (typeof executor !== "function") {
        throw new TypeError("expecting a function but got " + util.classString(executor));
    }

}

function Promise(executor) {
    if (executor !== INTERNAL) {
        check(this, executor);
    }
    this._bitField = 0;
    this._fulfillmentHandler0 = undefined;
    this._rejectionHandler0 = undefined;
    this._promise0 = undefined;
    this._receiver0 = undefined;
    this._resolveFromExecutor(executor);
    this._promiseCreated();
    this._fireEvent("promiseCreated", this);
}

Promise.prototype.toString = function () {
    return "[object Promise]";
};

Promise.prototype.caught = Promise.prototype["catch"] = function (fn) {
    var len = arguments.length;
    if (len > 1) {
        var catchInstances = new Array(len - 1),
            j = 0, i;
        for (i = 0; i < len - 1; ++i) {
            var item = arguments[i];
            if (util.isObject(item)) {
                catchInstances[j++] = item;
            } else {
                return apiRejection("Catch statement predicate: " +
                    "expecting an object but got " + util.classString(item));
            }
        }
        catchInstances.length = j;
        fn = arguments[i];
        return this.then(undefined, catchFilter(catchInstances, fn, this));
    }
    return this.then(undefined, fn);
};

Promise.prototype.reflect = function () {
    return this._then(reflectHandler,
        reflectHandler, undefined, this, undefined);
};

Promise.prototype.then = function (didFulfill, didReject) {
    if (debug.warnings() && arguments.length > 0 &&
        typeof didFulfill !== "function" &&
        typeof didReject !== "function") {
        var msg = ".then() only accepts functions but was passed: " +
                util.classString(didFulfill);
        if (arguments.length > 1) {
            msg += ", " + util.classString(didReject);
        }
        this._warn(msg);
    }
    return this._then(didFulfill, didReject, undefined, undefined, undefined);
};

Promise.prototype.done = function (didFulfill, didReject) {
    var promise =
        this._then(didFulfill, didReject, undefined, undefined, undefined);
    promise._setIsFinal();
};

Promise.prototype.spread = function (fn) {
    if (typeof fn !== "function") {
        return apiRejection("expecting a function but got " + util.classString(fn));
    }
    return this.all()._then(fn, undefined, undefined, APPLY, undefined);
};

Promise.prototype.toJSON = function () {
    var ret = {
        isFulfilled: false,
        isRejected: false,
        fulfillmentValue: undefined,
        rejectionReason: undefined
    };
    if (this.isFulfilled()) {
        ret.fulfillmentValue = this.value();
        ret.isFulfilled = true;
    } else if (this.isRejected()) {
        ret.rejectionReason = this.reason();
        ret.isRejected = true;
    }
    return ret;
};

Promise.prototype.all = function () {
    if (arguments.length > 0) {
        this._warn(".all() was passed arguments but it does not take any");
    }
    return new PromiseArray(this).promise();
};

Promise.prototype.error = function (fn) {
    return this.caught(util.originatesFromRejection, fn);
};

Promise.getNewLibraryCopy = module.exports;

Promise.is = function (val) {
    return val instanceof Promise;
};

Promise.fromNode = Promise.fromCallback = function(fn) {
    var ret = new Promise(INTERNAL);
    ret._captureStackTrace();
    var multiArgs = arguments.length > 1 ? !!Object(arguments[1]).multiArgs
                                         : false;
    var result = tryCatch(fn)(nodebackForPromise(ret, multiArgs));
    if (result === errorObj) {
        ret._rejectCallback(result.e, true);
    }
    if (!ret._isFateSealed()) ret._setAsyncGuaranteed();
    return ret;
};

Promise.all = function (promises) {
    return new PromiseArray(promises).promise();
};

Promise.cast = function (obj) {
    var ret = tryConvertToPromise(obj);
    if (!(ret instanceof Promise)) {
        ret = new Promise(INTERNAL);
        ret._captureStackTrace();
        ret._setFulfilled();
        ret._rejectionHandler0 = obj;
    }
    return ret;
};

Promise.resolve = Promise.fulfilled = Promise.cast;

Promise.reject = Promise.rejected = function (reason) {
    var ret = new Promise(INTERNAL);
    ret._captureStackTrace();
    ret._rejectCallback(reason, true);
    return ret;
};

Promise.setScheduler = function(fn) {
    if (typeof fn !== "function") {
        throw new TypeError("expecting a function but got " + util.classString(fn));
    }
    return async.setScheduler(fn);
};

Promise.prototype._then = function (
    didFulfill,
    didReject,
    _,    receiver,
    internalData
) {
    var haveInternalData = internalData !== undefined;
    var promise = haveInternalData ? internalData : new Promise(INTERNAL);
    var target = this._target();
    var bitField = target._bitField;

    if (!haveInternalData) {
        promise._propagateFrom(this, 3);
        promise._captureStackTrace();
        if (receiver === undefined &&
            ((this._bitField & 2097152) !== 0)) {
            if (!((bitField & 50397184) === 0)) {
                receiver = this._boundValue();
            } else {
                receiver = target === this ? undefined : this._boundTo;
            }
        }
        this._fireEvent("promiseChained", this, promise);
    }

    var domain = getDomain();
    if (!((bitField & 50397184) === 0)) {
        var handler, value, settler = target._settlePromiseCtx;
        if (((bitField & 33554432) !== 0)) {
            value = target._rejectionHandler0;
            handler = didFulfill;
        } else if (((bitField & 16777216) !== 0)) {
            value = target._fulfillmentHandler0;
            handler = didReject;
            target._unsetRejectionIsUnhandled();
        } else {
            settler = target._settlePromiseLateCancellationObserver;
            value = new CancellationError("late cancellation observer");
            target._attachExtraTrace(value);
            handler = didReject;
        }

        async.invoke(settler, target, {
            handler: domain === null ? handler
                : (typeof handler === "function" &&
                    util.domainBind(domain, handler)),
            promise: promise,
            receiver: receiver,
            value: value
        });
    } else {
        target._addCallbacks(didFulfill, didReject, promise, receiver, domain);
    }

    return promise;
};

Promise.prototype._length = function () {
    return this._bitField & 65535;
};

Promise.prototype._isFateSealed = function () {
    return (this._bitField & 117506048) !== 0;
};

Promise.prototype._isFollowing = function () {
    return (this._bitField & 67108864) === 67108864;
};

Promise.prototype._setLength = function (len) {
    this._bitField = (this._bitField & -65536) |
        (len & 65535);
};

Promise.prototype._setFulfilled = function () {
    this._bitField = this._bitField | 33554432;
    this._fireEvent("promiseFulfilled", this);
};

Promise.prototype._setRejected = function () {
    this._bitField = this._bitField | 16777216;
    this._fireEvent("promiseRejected", this);
};

Promise.prototype._setFollowing = function () {
    this._bitField = this._bitField | 67108864;
    this._fireEvent("promiseResolved", this);
};

Promise.prototype._setIsFinal = function () {
    this._bitField = this._bitField | 4194304;
};

Promise.prototype._isFinal = function () {
    return (this._bitField & 4194304) > 0;
};

Promise.prototype._unsetCancelled = function() {
    this._bitField = this._bitField & (~65536);
};

Promise.prototype._setCancelled = function() {
    this._bitField = this._bitField | 65536;
    this._fireEvent("promiseCancelled", this);
};

Promise.prototype._setWillBeCancelled = function() {
    this._bitField = this._bitField | 8388608;
};

Promise.prototype._setAsyncGuaranteed = function() {
    if (async.hasCustomScheduler()) return;
    this._bitField = this._bitField | 134217728;
};

Promise.prototype._receiverAt = function (index) {
    var ret = index === 0 ? this._receiver0 : this[
            index * 4 - 4 + 3];
    if (ret === UNDEFINED_BINDING) {
        return undefined;
    } else if (ret === undefined && this._isBound()) {
        return this._boundValue();
    }
    return ret;
};

Promise.prototype._promiseAt = function (index) {
    return this[
            index * 4 - 4 + 2];
};

Promise.prototype._fulfillmentHandlerAt = function (index) {
    return this[
            index * 4 - 4 + 0];
};

Promise.prototype._rejectionHandlerAt = function (index) {
    return this[
            index * 4 - 4 + 1];
};

Promise.prototype._boundValue = function() {};

Promise.prototype._migrateCallback0 = function (follower) {
    var bitField = follower._bitField;
    var fulfill = follower._fulfillmentHandler0;
    var reject = follower._rejectionHandler0;
    var promise = follower._promise0;
    var receiver = follower._receiverAt(0);
    if (receiver === undefined) receiver = UNDEFINED_BINDING;
    this._addCallbacks(fulfill, reject, promise, receiver, null);
};

Promise.prototype._migrateCallbackAt = function (follower, index) {
    var fulfill = follower._fulfillmentHandlerAt(index);
    var reject = follower._rejectionHandlerAt(index);
    var promise = follower._promiseAt(index);
    var receiver = follower._receiverAt(index);
    if (receiver === undefined) receiver = UNDEFINED_BINDING;
    this._addCallbacks(fulfill, reject, promise, receiver, null);
};

Promise.prototype._addCallbacks = function (
    fulfill,
    reject,
    promise,
    receiver,
    domain
) {
    var index = this._length();

    if (index >= 65535 - 4) {
        index = 0;
        this._setLength(0);
    }

    if (index === 0) {
        this._promise0 = promise;
        this._receiver0 = receiver;
        if (typeof fulfill === "function") {
            this._fulfillmentHandler0 =
                domain === null ? fulfill : util.domainBind(domain, fulfill);
        }
        if (typeof reject === "function") {
            this._rejectionHandler0 =
                domain === null ? reject : util.domainBind(domain, reject);
        }
    } else {
        var base = index * 4 - 4;
        this[base + 2] = promise;
        this[base + 3] = receiver;
        if (typeof fulfill === "function") {
            this[base + 0] =
                domain === null ? fulfill : util.domainBind(domain, fulfill);
        }
        if (typeof reject === "function") {
            this[base + 1] =
                domain === null ? reject : util.domainBind(domain, reject);
        }
    }
    this._setLength(index + 1);
    return index;
};

Promise.prototype._proxy = function (proxyable, arg) {
    this._addCallbacks(undefined, undefined, arg, proxyable, null);
};

Promise.prototype._resolveCallback = function(value, shouldBind) {
    if (((this._bitField & 117506048) !== 0)) return;
    if (value === this)
        return this._rejectCallback(makeSelfResolutionError(), false);
    var maybePromise = tryConvertToPromise(value, this);
    if (!(maybePromise instanceof Promise)) return this._fulfill(value);

    if (shouldBind) this._propagateFrom(maybePromise, 2);

    var promise = maybePromise._target();

    if (promise === this) {
        this._reject(makeSelfResolutionError());
        return;
    }

    var bitField = promise._bitField;
    if (((bitField & 50397184) === 0)) {
        var len = this._length();
        if (len > 0) promise._migrateCallback0(this);
        for (var i = 1; i < len; ++i) {
            promise._migrateCallbackAt(this, i);
        }
        this._setFollowing();
        this._setLength(0);
        this._setFollowee(promise);
    } else if (((bitField & 33554432) !== 0)) {
        this._fulfill(promise._value());
    } else if (((bitField & 16777216) !== 0)) {
        this._reject(promise._reason());
    } else {
        var reason = new CancellationError("late cancellation observer");
        promise._attachExtraTrace(reason);
        this._reject(reason);
    }
};

Promise.prototype._rejectCallback =
function(reason, synchronous, ignoreNonErrorWarnings) {
    var trace = util.ensureErrorObject(reason);
    var hasStack = trace === reason;
    if (!hasStack && !ignoreNonErrorWarnings && debug.warnings()) {
        var message = "a promise was rejected with a non-error: " +
            util.classString(reason);
        this._warn(message, true);
    }
    this._attachExtraTrace(trace, synchronous ? hasStack : false);
    this._reject(reason);
};

Promise.prototype._resolveFromExecutor = function (executor) {
    if (executor === INTERNAL) return;
    var promise = this;
    this._captureStackTrace();
    this._pushContext();
    var synchronous = true;
    var r = this._execute(executor, function(value) {
        promise._resolveCallback(value);
    }, function (reason) {
        promise._rejectCallback(reason, synchronous);
    });
    synchronous = false;
    this._popContext();

    if (r !== undefined) {
        promise._rejectCallback(r, true);
    }
};

Promise.prototype._settlePromiseFromHandler = function (
    handler, receiver, value, promise
) {
    var bitField = promise._bitField;
    if (((bitField & 65536) !== 0)) return;
    promise._pushContext();
    var x;
    if (receiver === APPLY) {
        if (!value || typeof value.length !== "number") {
            x = errorObj;
            x.e = new TypeError("cannot .spread() a non-array: " +
                                    util.classString(value));
        } else {
            x = tryCatch(handler).apply(this._boundValue(), value);
        }
    } else {
        x = tryCatch(handler).call(receiver, value);
    }
    var promiseCreated = promise._popContext();
    bitField = promise._bitField;
    if (((bitField & 65536) !== 0)) return;

    if (x === NEXT_FILTER) {
        promise._reject(value);
    } else if (x === errorObj) {
        promise._rejectCallback(x.e, false);
    } else {
        debug.checkForgottenReturns(x, promiseCreated, "",  promise, this);
        promise._resolveCallback(x);
    }
};

Promise.prototype._target = function() {
    var ret = this;
    while (ret._isFollowing()) ret = ret._followee();
    return ret;
};

Promise.prototype._followee = function() {
    return this._rejectionHandler0;
};

Promise.prototype._setFollowee = function(promise) {
    this._rejectionHandler0 = promise;
};

Promise.prototype._settlePromise = function(promise, handler, receiver, value) {
    var isPromise = promise instanceof Promise;
    var bitField = this._bitField;
    var asyncGuaranteed = ((bitField & 134217728) !== 0);
    if (((bitField & 65536) !== 0)) {
        if (isPromise) promise._invokeInternalOnCancel();

        if (receiver instanceof PassThroughHandlerContext &&
            receiver.isFinallyHandler()) {
            receiver.cancelPromise = promise;
            if (tryCatch(handler).call(receiver, value) === errorObj) {
                promise._reject(errorObj.e);
            }
        } else if (handler === reflectHandler) {
            promise._fulfill(reflectHandler.call(receiver));
        } else if (receiver instanceof Proxyable) {
            receiver._promiseCancelled(promise);
        } else if (isPromise || promise instanceof PromiseArray) {
            promise._cancel();
        } else {
            receiver.cancel();
        }
    } else if (typeof handler === "function") {
        if (!isPromise) {
            handler.call(receiver, value, promise);
        } else {
            if (asyncGuaranteed) promise._setAsyncGuaranteed();
            this._settlePromiseFromHandler(handler, receiver, value, promise);
        }
    } else if (receiver instanceof Proxyable) {
        if (!receiver._isResolved()) {
            if (((bitField & 33554432) !== 0)) {
                receiver._promiseFulfilled(value, promise);
            } else {
                receiver._promiseRejected(value, promise);
            }
        }
    } else if (isPromise) {
        if (asyncGuaranteed) promise._setAsyncGuaranteed();
        if (((bitField & 33554432) !== 0)) {
            promise._fulfill(value);
        } else {
            promise._reject(value);
        }
    }
};

Promise.prototype._settlePromiseLateCancellationObserver = function(ctx) {
    var handler = ctx.handler;
    var promise = ctx.promise;
    var receiver = ctx.receiver;
    var value = ctx.value;
    if (typeof handler === "function") {
        if (!(promise instanceof Promise)) {
            handler.call(receiver, value, promise);
        } else {
            this._settlePromiseFromHandler(handler, receiver, value, promise);
        }
    } else if (promise instanceof Promise) {
        promise._reject(value);
    }
};

Promise.prototype._settlePromiseCtx = function(ctx) {
    this._settlePromise(ctx.promise, ctx.handler, ctx.receiver, ctx.value);
};

Promise.prototype._settlePromise0 = function(handler, value, bitField) {
    var promise = this._promise0;
    var receiver = this._receiverAt(0);
    this._promise0 = undefined;
    this._receiver0 = undefined;
    this._settlePromise(promise, handler, receiver, value);
};

Promise.prototype._clearCallbackDataAtIndex = function(index) {
    var base = index * 4 - 4;
    this[base + 2] =
    this[base + 3] =
    this[base + 0] =
    this[base + 1] = undefined;
};

Promise.prototype._fulfill = function (value) {
    var bitField = this._bitField;
    if (((bitField & 117506048) >>> 16)) return;
    if (value === this) {
        var err = makeSelfResolutionError();
        this._attachExtraTrace(err);
        return this._reject(err);
    }
    this._setFulfilled();
    this._rejectionHandler0 = value;

    if ((bitField & 65535) > 0) {
        if (((bitField & 134217728) !== 0)) {
            this._settlePromises();
        } else {
            async.settlePromises(this);
        }
    }
};

Promise.prototype._reject = function (reason) {
    var bitField = this._bitField;
    if (((bitField & 117506048) >>> 16)) return;
    this._setRejected();
    this._fulfillmentHandler0 = reason;

    if (this._isFinal()) {
        return async.fatalError(reason, util.isNode);
    }

    if ((bitField & 65535) > 0) {
        async.settlePromises(this);
    } else {
        this._ensurePossibleRejectionHandled();
    }
};

Promise.prototype._fulfillPromises = function (len, value) {
    for (var i = 1; i < len; i++) {
        var handler = this._fulfillmentHandlerAt(i);
        var promise = this._promiseAt(i);
        var receiver = this._receiverAt(i);
        this._clearCallbackDataAtIndex(i);
        this._settlePromise(promise, handler, receiver, value);
    }
};

Promise.prototype._rejectPromises = function (len, reason) {
    for (var i = 1; i < len; i++) {
        var handler = this._rejectionHandlerAt(i);
        var promise = this._promiseAt(i);
        var receiver = this._receiverAt(i);
        this._clearCallbackDataAtIndex(i);
        this._settlePromise(promise, handler, receiver, reason);
    }
};

Promise.prototype._settlePromises = function () {
    var bitField = this._bitField;
    var len = (bitField & 65535);

    if (len > 0) {
        if (((bitField & 16842752) !== 0)) {
            var reason = this._fulfillmentHandler0;
            this._settlePromise0(this._rejectionHandler0, reason, bitField);
            this._rejectPromises(len, reason);
        } else {
            var value = this._rejectionHandler0;
            this._settlePromise0(this._fulfillmentHandler0, value, bitField);
            this._fulfillPromises(len, value);
        }
        this._setLength(0);
    }
    this._clearCancellationData();
};

Promise.prototype._settledValue = function() {
    var bitField = this._bitField;
    if (((bitField & 33554432) !== 0)) {
        return this._rejectionHandler0;
    } else if (((bitField & 16777216) !== 0)) {
        return this._fulfillmentHandler0;
    }
};

function deferResolve(v) {this.promise._resolveCallback(v);}
function deferReject(v) {this.promise._rejectCallback(v, false);}

Promise.defer = Promise.pending = function() {
    debug.deprecated("Promise.defer", "new Promise");
    var promise = new Promise(INTERNAL);
    return {
        promise: promise,
        resolve: deferResolve,
        reject: deferReject
    };
};

util.notEnumerableProp(Promise,
                       "_makeSelfResolutionError",
                       makeSelfResolutionError);

_dereq_("./method")(Promise, INTERNAL, tryConvertToPromise, apiRejection,
    debug);
_dereq_("./bind")(Promise, INTERNAL, tryConvertToPromise, debug);
_dereq_("./cancel")(Promise, PromiseArray, apiRejection, debug);
_dereq_("./direct_resolve")(Promise);
_dereq_("./synchronous_inspection")(Promise);
_dereq_("./join")(
    Promise, PromiseArray, tryConvertToPromise, INTERNAL, async, getDomain);
Promise.Promise = Promise;
Promise.version = "3.5.1";
_dereq_('./map.js')(Promise, PromiseArray, apiRejection, tryConvertToPromise, INTERNAL, debug);
_dereq_('./call_get.js')(Promise);
_dereq_('./using.js')(Promise, apiRejection, tryConvertToPromise, createContext, INTERNAL, debug);
_dereq_('./timers.js')(Promise, INTERNAL, debug);
_dereq_('./generators.js')(Promise, apiRejection, INTERNAL, tryConvertToPromise, Proxyable, debug);
_dereq_('./nodeify.js')(Promise);
_dereq_('./promisify.js')(Promise, INTERNAL);
_dereq_('./props.js')(Promise, PromiseArray, tryConvertToPromise, apiRejection);
_dereq_('./race.js')(Promise, INTERNAL, tryConvertToPromise, apiRejection);
_dereq_('./reduce.js')(Promise, PromiseArray, apiRejection, tryConvertToPromise, INTERNAL, debug);
_dereq_('./settle.js')(Promise, PromiseArray, debug);
_dereq_('./some.js')(Promise, PromiseArray, apiRejection);
_dereq_('./filter.js')(Promise, INTERNAL);
_dereq_('./each.js')(Promise, INTERNAL);
_dereq_('./any.js')(Promise);
                                                         
    util.toFastProperties(Promise);                                          
    util.toFastProperties(Promise.prototype);                                
    function fillTypes(value) {                                              
        var p = new Promise(INTERNAL);                                       
        p._fulfillmentHandler0 = value;                                      
        p._rejectionHandler0 = value;                                        
        p._promise0 = value;                                                 
        p._receiver0 = value;                                                
    }                                                                        
    // Complete slack tracking, opt out of field-type tracking and           
    // stabilize map                                                         
    fillTypes({a: 1});                                                       
    fillTypes({b: 2});                                                       
    fillTypes({c: 3});                                                       
    fillTypes(1);                                                            
    fillTypes(function(){});                                                 
    fillTypes(undefined);                                                    
    fillTypes(false);                                                        
    fillTypes(new Promise(INTERNAL));                                        
    debug.setBounds(Async.firstLineError, util.lastLineError);               
    return Promise;                                                          

};

},{"./any.js":1,"./async":2,"./bind":3,"./call_get.js":5,"./cancel":6,"./catch_filter":7,"./context":8,"./debuggability":9,"./direct_resolve":10,"./each.js":11,"./errors":12,"./es5":13,"./filter.js":14,"./finally":15,"./generators.js":16,"./join":17,"./map.js":18,"./method":19,"./nodeback":20,"./nodeify.js":21,"./promise_array":23,"./promisify.js":24,"./props.js":25,"./race.js":27,"./reduce.js":28,"./settle.js":30,"./some.js":31,"./synchronous_inspection":32,"./thenables":33,"./timers.js":34,"./using.js":35,"./util":36}],23:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, INTERNAL, tryConvertToPromise,
    apiRejection, Proxyable) {
var util = _dereq_("./util");
var isArray = util.isArray;

function toResolutionValue(val) {
    switch(val) {
    case -2: return [];
    case -3: return {};
    case -6: return new Map();
    }
}

function PromiseArray(values) {
    var promise = this._promise = new Promise(INTERNAL);
    if (values instanceof Promise) {
        promise._propagateFrom(values, 3);
    }
    promise._setOnCancel(this);
    this._values = values;
    this._length = 0;
    this._totalResolved = 0;
    this._init(undefined, -2);
}
util.inherits(PromiseArray, Proxyable);

PromiseArray.prototype.length = function () {
    return this._length;
};

PromiseArray.prototype.promise = function () {
    return this._promise;
};

PromiseArray.prototype._init = function init(_, resolveValueIfEmpty) {
    var values = tryConvertToPromise(this._values, this._promise);
    if (values instanceof Promise) {
        values = values._target();
        var bitField = values._bitField;
        ;
        this._values = values;

        if (((bitField & 50397184) === 0)) {
            this._promise._setAsyncGuaranteed();
            return values._then(
                init,
                this._reject,
                undefined,
                this,
                resolveValueIfEmpty
           );
        } else if (((bitField & 33554432) !== 0)) {
            values = values._value();
        } else if (((bitField & 16777216) !== 0)) {
            return this._reject(values._reason());
        } else {
            return this._cancel();
        }
    }
    values = util.asArray(values);
    if (values === null) {
        var err = apiRejection(
            "expecting an array or an iterable object but got " + util.classString(values)).reason();
        this._promise._rejectCallback(err, false);
        return;
    }

    if (values.length === 0) {
        if (resolveValueIfEmpty === -5) {
            this._resolveEmptyArray();
        }
        else {
            this._resolve(toResolutionValue(resolveValueIfEmpty));
        }
        return;
    }
    this._iterate(values);
};

PromiseArray.prototype._iterate = function(values) {
    var len = this.getActualLength(values.length);
    this._length = len;
    this._values = this.shouldCopyValues() ? new Array(len) : this._values;
    var result = this._promise;
    var isResolved = false;
    var bitField = null;
    for (var i = 0; i < len; ++i) {
        var maybePromise = tryConvertToPromise(values[i], result);

        if (maybePromise instanceof Promise) {
            maybePromise = maybePromise._target();
            bitField = maybePromise._bitField;
        } else {
            bitField = null;
        }

        if (isResolved) {
            if (bitField !== null) {
                maybePromise.suppressUnhandledRejections();
            }
        } else if (bitField !== null) {
            if (((bitField & 50397184) === 0)) {
                maybePromise._proxy(this, i);
                this._values[i] = maybePromise;
            } else if (((bitField & 33554432) !== 0)) {
                isResolved = this._promiseFulfilled(maybePromise._value(), i);
            } else if (((bitField & 16777216) !== 0)) {
                isResolved = this._promiseRejected(maybePromise._reason(), i);
            } else {
                isResolved = this._promiseCancelled(i);
            }
        } else {
            isResolved = this._promiseFulfilled(maybePromise, i);
        }
    }
    if (!isResolved) result._setAsyncGuaranteed();
};

PromiseArray.prototype._isResolved = function () {
    return this._values === null;
};

PromiseArray.prototype._resolve = function (value) {
    this._values = null;
    this._promise._fulfill(value);
};

PromiseArray.prototype._cancel = function() {
    if (this._isResolved() || !this._promise._isCancellable()) return;
    this._values = null;
    this._promise._cancel();
};

PromiseArray.prototype._reject = function (reason) {
    this._values = null;
    this._promise._rejectCallback(reason, false);
};

PromiseArray.prototype._promiseFulfilled = function (value, index) {
    this._values[index] = value;
    var totalResolved = ++this._totalResolved;
    if (totalResolved >= this._length) {
        this._resolve(this._values);
        return true;
    }
    return false;
};

PromiseArray.prototype._promiseCancelled = function() {
    this._cancel();
    return true;
};

PromiseArray.prototype._promiseRejected = function (reason) {
    this._totalResolved++;
    this._reject(reason);
    return true;
};

PromiseArray.prototype._resultCancelled = function() {
    if (this._isResolved()) return;
    var values = this._values;
    this._cancel();
    if (values instanceof Promise) {
        values.cancel();
    } else {
        for (var i = 0; i < values.length; ++i) {
            if (values[i] instanceof Promise) {
                values[i].cancel();
            }
        }
    }
};

PromiseArray.prototype.shouldCopyValues = function () {
    return true;
};

PromiseArray.prototype.getActualLength = function (len) {
    return len;
};

return PromiseArray;
};

},{"./util":36}],24:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, INTERNAL) {
var THIS = {};
var util = _dereq_("./util");
var nodebackForPromise = _dereq_("./nodeback");
var withAppended = util.withAppended;
var maybeWrapAsError = util.maybeWrapAsError;
var canEvaluate = util.canEvaluate;
var TypeError = _dereq_("./errors").TypeError;
var defaultSuffix = "Async";
var defaultPromisified = {__isPromisified__: true};
var noCopyProps = [
    "arity",    "length",
    "name",
    "arguments",
    "caller",
    "callee",
    "prototype",
    "__isPromisified__"
];
var noCopyPropsPattern = new RegExp("^(?:" + noCopyProps.join("|") + ")$");

var defaultFilter = function(name) {
    return util.isIdentifier(name) &&
        name.charAt(0) !== "_" &&
        name !== "constructor";
};

function propsFilter(key) {
    return !noCopyPropsPattern.test(key);
}

function isPromisified(fn) {
    try {
        return fn.__isPromisified__ === true;
    }
    catch (e) {
        return false;
    }
}

function hasPromisified(obj, key, suffix) {
    var val = util.getDataPropertyOrDefault(obj, key + suffix,
                                            defaultPromisified);
    return val ? isPromisified(val) : false;
}
function checkValid(ret, suffix, suffixRegexp) {
    for (var i = 0; i < ret.length; i += 2) {
        var key = ret[i];
        if (suffixRegexp.test(key)) {
            var keyWithoutAsyncSuffix = key.replace(suffixRegexp, "");
            for (var j = 0; j < ret.length; j += 2) {
                if (ret[j] === keyWithoutAsyncSuffix) {
                    throw new TypeError("Cannot promisify an API that has normal methods with '%s'-suffix\u000a\u000a    See http://goo.gl/MqrFmX\u000a"
                        .replace("%s", suffix));
                }
            }
        }
    }
}

function promisifiableMethods(obj, suffix, suffixRegexp, filter) {
    var keys = util.inheritedDataKeys(obj);
    var ret = [];
    for (var i = 0; i < keys.length; ++i) {
        var key = keys[i];
        var value = obj[key];
        var passesDefaultFilter = filter === defaultFilter
            ? true : defaultFilter(key, value, obj);
        if (typeof value === "function" &&
            !isPromisified(value) &&
            !hasPromisified(obj, key, suffix) &&
            filter(key, value, obj, passesDefaultFilter)) {
            ret.push(key, value);
        }
    }
    checkValid(ret, suffix, suffixRegexp);
    return ret;
}

var escapeIdentRegex = function(str) {
    return str.replace(/([$])/, "\\$");
};

var makeNodePromisifiedEval;
if (!true) {
var switchCaseArgumentOrder = function(likelyArgumentCount) {
    var ret = [likelyArgumentCount];
    var min = Math.max(0, likelyArgumentCount - 1 - 3);
    for(var i = likelyArgumentCount - 1; i >= min; --i) {
        ret.push(i);
    }
    for(var i = likelyArgumentCount + 1; i <= 3; ++i) {
        ret.push(i);
    }
    return ret;
};

var argumentSequence = function(argumentCount) {
    return util.filledRange(argumentCount, "_arg", "");
};

var parameterDeclaration = function(parameterCount) {
    return util.filledRange(
        Math.max(parameterCount, 3), "_arg", "");
};

var parameterCount = function(fn) {
    if (typeof fn.length === "number") {
        return Math.max(Math.min(fn.length, 1023 + 1), 0);
    }
    return 0;
};

makeNodePromisifiedEval =
function(callback, receiver, originalName, fn, _, multiArgs) {
    var newParameterCount = Math.max(0, parameterCount(fn) - 1);
    var argumentOrder = switchCaseArgumentOrder(newParameterCount);
    var shouldProxyThis = typeof callback === "string" || receiver === THIS;

    function generateCallForArgumentCount(count) {
        var args = argumentSequence(count).join(", ");
        var comma = count > 0 ? ", " : "";
        var ret;
        if (shouldProxyThis) {
            ret = "ret = callback.call(this, {{args}}, nodeback); break;\n";
        } else {
            ret = receiver === undefined
                ? "ret = callback({{args}}, nodeback); break;\n"
                : "ret = callback.call(receiver, {{args}}, nodeback); break;\n";
        }
        return ret.replace("{{args}}", args).replace(", ", comma);
    }

    function generateArgumentSwitchCase() {
        var ret = "";
        for (var i = 0; i < argumentOrder.length; ++i) {
            ret += "case " + argumentOrder[i] +":" +
                generateCallForArgumentCount(argumentOrder[i]);
        }

        ret += "                                                             \n\
        default:                                                             \n\
            var args = new Array(len + 1);                                   \n\
            var i = 0;                                                       \n\
            for (var i = 0; i < len; ++i) {                                  \n\
               args[i] = arguments[i];                                       \n\
            }                                                                \n\
            args[i] = nodeback;                                              \n\
            [CodeForCall]                                                    \n\
            break;                                                           \n\
        ".replace("[CodeForCall]", (shouldProxyThis
                                ? "ret = callback.apply(this, args);\n"
                                : "ret = callback.apply(receiver, args);\n"));
        return ret;
    }

    var getFunctionCode = typeof callback === "string"
                                ? ("this != null ? this['"+callback+"'] : fn")
                                : "fn";
    var body = "'use strict';                                                \n\
        var ret = function (Parameters) {                                    \n\
            'use strict';                                                    \n\
            var len = arguments.length;                                      \n\
            var promise = new Promise(INTERNAL);                             \n\
            promise._captureStackTrace();                                    \n\
            var nodeback = nodebackForPromise(promise, " + multiArgs + ");   \n\
            var ret;                                                         \n\
            var callback = tryCatch([GetFunctionCode]);                      \n\
            switch(len) {                                                    \n\
                [CodeForSwitchCase]                                          \n\
            }                                                                \n\
            if (ret === errorObj) {                                          \n\
                promise._rejectCallback(maybeWrapAsError(ret.e), true, true);\n\
            }                                                                \n\
            if (!promise._isFateSealed()) promise._setAsyncGuaranteed();     \n\
            return promise;                                                  \n\
        };                                                                   \n\
        notEnumerableProp(ret, '__isPromisified__', true);                   \n\
        return ret;                                                          \n\
    ".replace("[CodeForSwitchCase]", generateArgumentSwitchCase())
        .replace("[GetFunctionCode]", getFunctionCode);
    body = body.replace("Parameters", parameterDeclaration(newParameterCount));
    return new Function("Promise",
                        "fn",
                        "receiver",
                        "withAppended",
                        "maybeWrapAsError",
                        "nodebackForPromise",
                        "tryCatch",
                        "errorObj",
                        "notEnumerableProp",
                        "INTERNAL",
                        body)(
                    Promise,
                    fn,
                    receiver,
                    withAppended,
                    maybeWrapAsError,
                    nodebackForPromise,
                    util.tryCatch,
                    util.errorObj,
                    util.notEnumerableProp,
                    INTERNAL);
};
}

function makeNodePromisifiedClosure(callback, receiver, _, fn, __, multiArgs) {
    var defaultThis = (function() {return this;})();
    var method = callback;
    if (typeof method === "string") {
        callback = fn;
    }
    function promisified() {
        var _receiver = receiver;
        if (receiver === THIS) _receiver = this;
        var promise = new Promise(INTERNAL);
        promise._captureStackTrace();
        var cb = typeof method === "string" && this !== defaultThis
            ? this[method] : callback;
        var fn = nodebackForPromise(promise, multiArgs);
        try {
            cb.apply(_receiver, withAppended(arguments, fn));
        } catch(e) {
            promise._rejectCallback(maybeWrapAsError(e), true, true);
        }
        if (!promise._isFateSealed()) promise._setAsyncGuaranteed();
        return promise;
    }
    util.notEnumerableProp(promisified, "__isPromisified__", true);
    return promisified;
}

var makeNodePromisified = canEvaluate
    ? makeNodePromisifiedEval
    : makeNodePromisifiedClosure;

function promisifyAll(obj, suffix, filter, promisifier, multiArgs) {
    var suffixRegexp = new RegExp(escapeIdentRegex(suffix) + "$");
    var methods =
        promisifiableMethods(obj, suffix, suffixRegexp, filter);

    for (var i = 0, len = methods.length; i < len; i+= 2) {
        var key = methods[i];
        var fn = methods[i+1];
        var promisifiedKey = key + suffix;
        if (promisifier === makeNodePromisified) {
            obj[promisifiedKey] =
                makeNodePromisified(key, THIS, key, fn, suffix, multiArgs);
        } else {
            var promisified = promisifier(fn, function() {
                return makeNodePromisified(key, THIS, key,
                                           fn, suffix, multiArgs);
            });
            util.notEnumerableProp(promisified, "__isPromisified__", true);
            obj[promisifiedKey] = promisified;
        }
    }
    util.toFastProperties(obj);
    return obj;
}

function promisify(callback, receiver, multiArgs) {
    return makeNodePromisified(callback, receiver, undefined,
                                callback, null, multiArgs);
}

Promise.promisify = function (fn, options) {
    if (typeof fn !== "function") {
        throw new TypeError("expecting a function but got " + util.classString(fn));
    }
    if (isPromisified(fn)) {
        return fn;
    }
    options = Object(options);
    var receiver = options.context === undefined ? THIS : options.context;
    var multiArgs = !!options.multiArgs;
    var ret = promisify(fn, receiver, multiArgs);
    util.copyDescriptors(fn, ret, propsFilter);
    return ret;
};

Promise.promisifyAll = function (target, options) {
    if (typeof target !== "function" && typeof target !== "object") {
        throw new TypeError("the target of promisifyAll must be an object or a function\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
    }
    options = Object(options);
    var multiArgs = !!options.multiArgs;
    var suffix = options.suffix;
    if (typeof suffix !== "string") suffix = defaultSuffix;
    var filter = options.filter;
    if (typeof filter !== "function") filter = defaultFilter;
    var promisifier = options.promisifier;
    if (typeof promisifier !== "function") promisifier = makeNodePromisified;

    if (!util.isIdentifier(suffix)) {
        throw new RangeError("suffix must be a valid identifier\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
    }

    var keys = util.inheritedDataKeys(target);
    for (var i = 0; i < keys.length; ++i) {
        var value = target[keys[i]];
        if (keys[i] !== "constructor" &&
            util.isClass(value)) {
            promisifyAll(value.prototype, suffix, filter, promisifier,
                multiArgs);
            promisifyAll(value, suffix, filter, promisifier, multiArgs);
        }
    }

    return promisifyAll(target, suffix, filter, promisifier, multiArgs);
};
};


},{"./errors":12,"./nodeback":20,"./util":36}],25:[function(_dereq_,module,exports){
"use strict";
module.exports = function(
    Promise, PromiseArray, tryConvertToPromise, apiRejection) {
var util = _dereq_("./util");
var isObject = util.isObject;
var es5 = _dereq_("./es5");
var Es6Map;
if (typeof Map === "function") Es6Map = Map;

var mapToEntries = (function() {
    var index = 0;
    var size = 0;

    function extractEntry(value, key) {
        this[index] = value;
        this[index + size] = key;
        index++;
    }

    return function mapToEntries(map) {
        size = map.size;
        index = 0;
        var ret = new Array(map.size * 2);
        map.forEach(extractEntry, ret);
        return ret;
    };
})();

var entriesToMap = function(entries) {
    var ret = new Es6Map();
    var length = entries.length / 2 | 0;
    for (var i = 0; i < length; ++i) {
        var key = entries[length + i];
        var value = entries[i];
        ret.set(key, value);
    }
    return ret;
};

function PropertiesPromiseArray(obj) {
    var isMap = false;
    var entries;
    if (Es6Map !== undefined && obj instanceof Es6Map) {
        entries = mapToEntries(obj);
        isMap = true;
    } else {
        var keys = es5.keys(obj);
        var len = keys.length;
        entries = new Array(len * 2);
        for (var i = 0; i < len; ++i) {
            var key = keys[i];
            entries[i] = obj[key];
            entries[i + len] = key;
        }
    }
    this.constructor$(entries);
    this._isMap = isMap;
    this._init$(undefined, isMap ? -6 : -3);
}
util.inherits(PropertiesPromiseArray, PromiseArray);

PropertiesPromiseArray.prototype._init = function () {};

PropertiesPromiseArray.prototype._promiseFulfilled = function (value, index) {
    this._values[index] = value;
    var totalResolved = ++this._totalResolved;
    if (totalResolved >= this._length) {
        var val;
        if (this._isMap) {
            val = entriesToMap(this._values);
        } else {
            val = {};
            var keyOffset = this.length();
            for (var i = 0, len = this.length(); i < len; ++i) {
                val[this._values[i + keyOffset]] = this._values[i];
            }
        }
        this._resolve(val);
        return true;
    }
    return false;
};

PropertiesPromiseArray.prototype.shouldCopyValues = function () {
    return false;
};

PropertiesPromiseArray.prototype.getActualLength = function (len) {
    return len >> 1;
};

function props(promises) {
    var ret;
    var castValue = tryConvertToPromise(promises);

    if (!isObject(castValue)) {
        return apiRejection("cannot await properties of a non-object\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
    } else if (castValue instanceof Promise) {
        ret = castValue._then(
            Promise.props, undefined, undefined, undefined, undefined);
    } else {
        ret = new PropertiesPromiseArray(castValue).promise();
    }

    if (castValue instanceof Promise) {
        ret._propagateFrom(castValue, 2);
    }
    return ret;
}

Promise.prototype.props = function () {
    return props(this);
};

Promise.props = function (promises) {
    return props(promises);
};
};

},{"./es5":13,"./util":36}],26:[function(_dereq_,module,exports){
"use strict";
function arrayMove(src, srcIndex, dst, dstIndex, len) {
    for (var j = 0; j < len; ++j) {
        dst[j + dstIndex] = src[j + srcIndex];
        src[j + srcIndex] = void 0;
    }
}

function Queue(capacity) {
    this._capacity = capacity;
    this._length = 0;
    this._front = 0;
}

Queue.prototype._willBeOverCapacity = function (size) {
    return this._capacity < size;
};

Queue.prototype._pushOne = function (arg) {
    var length = this.length();
    this._checkCapacity(length + 1);
    var i = (this._front + length) & (this._capacity - 1);
    this[i] = arg;
    this._length = length + 1;
};

Queue.prototype.push = function (fn, receiver, arg) {
    var length = this.length() + 3;
    if (this._willBeOverCapacity(length)) {
        this._pushOne(fn);
        this._pushOne(receiver);
        this._pushOne(arg);
        return;
    }
    var j = this._front + length - 3;
    this._checkCapacity(length);
    var wrapMask = this._capacity - 1;
    this[(j + 0) & wrapMask] = fn;
    this[(j + 1) & wrapMask] = receiver;
    this[(j + 2) & wrapMask] = arg;
    this._length = length;
};

Queue.prototype.shift = function () {
    var front = this._front,
        ret = this[front];

    this[front] = undefined;
    this._front = (front + 1) & (this._capacity - 1);
    this._length--;
    return ret;
};

Queue.prototype.length = function () {
    return this._length;
};

Queue.prototype._checkCapacity = function (size) {
    if (this._capacity < size) {
        this._resizeTo(this._capacity << 1);
    }
};

Queue.prototype._resizeTo = function (capacity) {
    var oldCapacity = this._capacity;
    this._capacity = capacity;
    var front = this._front;
    var length = this._length;
    var moveItemsCount = (front + length) & (oldCapacity - 1);
    arrayMove(this, 0, this, oldCapacity, moveItemsCount);
};

module.exports = Queue;

},{}],27:[function(_dereq_,module,exports){
"use strict";
module.exports = function(
    Promise, INTERNAL, tryConvertToPromise, apiRejection) {
var util = _dereq_("./util");

var raceLater = function (promise) {
    return promise.then(function(array) {
        return race(array, promise);
    });
};

function race(promises, parent) {
    var maybePromise = tryConvertToPromise(promises);

    if (maybePromise instanceof Promise) {
        return raceLater(maybePromise);
    } else {
        promises = util.asArray(promises);
        if (promises === null)
            return apiRejection("expecting an array or an iterable object but got " + util.classString(promises));
    }

    var ret = new Promise(INTERNAL);
    if (parent !== undefined) {
        ret._propagateFrom(parent, 3);
    }
    var fulfill = ret._fulfill;
    var reject = ret._reject;
    for (var i = 0, len = promises.length; i < len; ++i) {
        var val = promises[i];

        if (val === undefined && !(i in promises)) {
            continue;
        }

        Promise.cast(val)._then(fulfill, reject, undefined, ret, null);
    }
    return ret;
}

Promise.race = function (promises) {
    return race(promises, undefined);
};

Promise.prototype.race = function () {
    return race(this, undefined);
};

};

},{"./util":36}],28:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise,
                          PromiseArray,
                          apiRejection,
                          tryConvertToPromise,
                          INTERNAL,
                          debug) {
var getDomain = Promise._getDomain;
var util = _dereq_("./util");
var tryCatch = util.tryCatch;

function ReductionPromiseArray(promises, fn, initialValue, _each) {
    this.constructor$(promises);
    var domain = getDomain();
    this._fn = domain === null ? fn : util.domainBind(domain, fn);
    if (initialValue !== undefined) {
        initialValue = Promise.resolve(initialValue);
        initialValue._attachCancellationCallback(this);
    }
    this._initialValue = initialValue;
    this._currentCancellable = null;
    if(_each === INTERNAL) {
        this._eachValues = Array(this._length);
    } else if (_each === 0) {
        this._eachValues = null;
    } else {
        this._eachValues = undefined;
    }
    this._promise._captureStackTrace();
    this._init$(undefined, -5);
}
util.inherits(ReductionPromiseArray, PromiseArray);

ReductionPromiseArray.prototype._gotAccum = function(accum) {
    if (this._eachValues !== undefined && 
        this._eachValues !== null && 
        accum !== INTERNAL) {
        this._eachValues.push(accum);
    }
};

ReductionPromiseArray.prototype._eachComplete = function(value) {
    if (this._eachValues !== null) {
        this._eachValues.push(value);
    }
    return this._eachValues;
};

ReductionPromiseArray.prototype._init = function() {};

ReductionPromiseArray.prototype._resolveEmptyArray = function() {
    this._resolve(this._eachValues !== undefined ? this._eachValues
                                                 : this._initialValue);
};

ReductionPromiseArray.prototype.shouldCopyValues = function () {
    return false;
};

ReductionPromiseArray.prototype._resolve = function(value) {
    this._promise._resolveCallback(value);
    this._values = null;
};

ReductionPromiseArray.prototype._resultCancelled = function(sender) {
    if (sender === this._initialValue) return this._cancel();
    if (this._isResolved()) return;
    this._resultCancelled$();
    if (this._currentCancellable instanceof Promise) {
        this._currentCancellable.cancel();
    }
    if (this._initialValue instanceof Promise) {
        this._initialValue.cancel();
    }
};

ReductionPromiseArray.prototype._iterate = function (values) {
    this._values = values;
    var value;
    var i;
    var length = values.length;
    if (this._initialValue !== undefined) {
        value = this._initialValue;
        i = 0;
    } else {
        value = Promise.resolve(values[0]);
        i = 1;
    }

    this._currentCancellable = value;

    if (!value.isRejected()) {
        for (; i < length; ++i) {
            var ctx = {
                accum: null,
                value: values[i],
                index: i,
                length: length,
                array: this
            };
            value = value._then(gotAccum, undefined, undefined, ctx, undefined);
        }
    }

    if (this._eachValues !== undefined) {
        value = value
            ._then(this._eachComplete, undefined, undefined, this, undefined);
    }
    value._then(completed, completed, undefined, value, this);
};

Promise.prototype.reduce = function (fn, initialValue) {
    return reduce(this, fn, initialValue, null);
};

Promise.reduce = function (promises, fn, initialValue, _each) {
    return reduce(promises, fn, initialValue, _each);
};

function completed(valueOrReason, array) {
    if (this.isFulfilled()) {
        array._resolve(valueOrReason);
    } else {
        array._reject(valueOrReason);
    }
}

function reduce(promises, fn, initialValue, _each) {
    if (typeof fn !== "function") {
        return apiRejection("expecting a function but got " + util.classString(fn));
    }
    var array = new ReductionPromiseArray(promises, fn, initialValue, _each);
    return array.promise();
}

function gotAccum(accum) {
    this.accum = accum;
    this.array._gotAccum(accum);
    var value = tryConvertToPromise(this.value, this.array._promise);
    if (value instanceof Promise) {
        this.array._currentCancellable = value;
        return value._then(gotValue, undefined, undefined, this, undefined);
    } else {
        return gotValue.call(this, value);
    }
}

function gotValue(value) {
    var array = this.array;
    var promise = array._promise;
    var fn = tryCatch(array._fn);
    promise._pushContext();
    var ret;
    if (array._eachValues !== undefined) {
        ret = fn.call(promise._boundValue(), value, this.index, this.length);
    } else {
        ret = fn.call(promise._boundValue(),
                              this.accum, value, this.index, this.length);
    }
    if (ret instanceof Promise) {
        array._currentCancellable = ret;
    }
    var promiseCreated = promise._popContext();
    debug.checkForgottenReturns(
        ret,
        promiseCreated,
        array._eachValues !== undefined ? "Promise.each" : "Promise.reduce",
        promise
    );
    return ret;
}
};

},{"./util":36}],29:[function(_dereq_,module,exports){
"use strict";
var util = _dereq_("./util");
var schedule;
var noAsyncScheduler = function() {
    throw new Error("No async scheduler available\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
};
var NativePromise = util.getNativePromise();
if (util.isNode && typeof MutationObserver === "undefined") {
    var GlobalSetImmediate = global.setImmediate;
    var ProcessNextTick = process.nextTick;
    schedule = util.isRecentNode
                ? function(fn) { GlobalSetImmediate.call(global, fn); }
                : function(fn) { ProcessNextTick.call(process, fn); };
} else if (typeof NativePromise === "function" &&
           typeof NativePromise.resolve === "function") {
    var nativePromise = NativePromise.resolve();
    schedule = function(fn) {
        nativePromise.then(fn);
    };
} else if ((typeof MutationObserver !== "undefined") &&
          !(typeof window !== "undefined" &&
            window.navigator &&
            (window.navigator.standalone || window.cordova))) {
    schedule = (function() {
        var div = document.createElement("div");
        var opts = {attributes: true};
        var toggleScheduled = false;
        var div2 = document.createElement("div");
        var o2 = new MutationObserver(function() {
            div.classList.toggle("foo");
            toggleScheduled = false;
        });
        o2.observe(div2, opts);

        var scheduleToggle = function() {
            if (toggleScheduled) return;
            toggleScheduled = true;
            div2.classList.toggle("foo");
        };

        return function schedule(fn) {
            var o = new MutationObserver(function() {
                o.disconnect();
                fn();
            });
            o.observe(div, opts);
            scheduleToggle();
        };
    })();
} else if (typeof setImmediate !== "undefined") {
    schedule = function (fn) {
        setImmediate(fn);
    };
} else if (typeof setTimeout !== "undefined") {
    schedule = function (fn) {
        setTimeout(fn, 0);
    };
} else {
    schedule = noAsyncScheduler;
}
module.exports = schedule;

},{"./util":36}],30:[function(_dereq_,module,exports){
"use strict";
module.exports =
    function(Promise, PromiseArray, debug) {
var PromiseInspection = Promise.PromiseInspection;
var util = _dereq_("./util");

function SettledPromiseArray(values) {
    this.constructor$(values);
}
util.inherits(SettledPromiseArray, PromiseArray);

SettledPromiseArray.prototype._promiseResolved = function (index, inspection) {
    this._values[index] = inspection;
    var totalResolved = ++this._totalResolved;
    if (totalResolved >= this._length) {
        this._resolve(this._values);
        return true;
    }
    return false;
};

SettledPromiseArray.prototype._promiseFulfilled = function (value, index) {
    var ret = new PromiseInspection();
    ret._bitField = 33554432;
    ret._settledValueField = value;
    return this._promiseResolved(index, ret);
};
SettledPromiseArray.prototype._promiseRejected = function (reason, index) {
    var ret = new PromiseInspection();
    ret._bitField = 16777216;
    ret._settledValueField = reason;
    return this._promiseResolved(index, ret);
};

Promise.settle = function (promises) {
    debug.deprecated(".settle()", ".reflect()");
    return new SettledPromiseArray(promises).promise();
};

Promise.prototype.settle = function () {
    return Promise.settle(this);
};
};

},{"./util":36}],31:[function(_dereq_,module,exports){
"use strict";
module.exports =
function(Promise, PromiseArray, apiRejection) {
var util = _dereq_("./util");
var RangeError = _dereq_("./errors").RangeError;
var AggregateError = _dereq_("./errors").AggregateError;
var isArray = util.isArray;
var CANCELLATION = {};


function SomePromiseArray(values) {
    this.constructor$(values);
    this._howMany = 0;
    this._unwrap = false;
    this._initialized = false;
}
util.inherits(SomePromiseArray, PromiseArray);

SomePromiseArray.prototype._init = function () {
    if (!this._initialized) {
        return;
    }
    if (this._howMany === 0) {
        this._resolve([]);
        return;
    }
    this._init$(undefined, -5);
    var isArrayResolved = isArray(this._values);
    if (!this._isResolved() &&
        isArrayResolved &&
        this._howMany > this._canPossiblyFulfill()) {
        this._reject(this._getRangeError(this.length()));
    }
};

SomePromiseArray.prototype.init = function () {
    this._initialized = true;
    this._init();
};

SomePromiseArray.prototype.setUnwrap = function () {
    this._unwrap = true;
};

SomePromiseArray.prototype.howMany = function () {
    return this._howMany;
};

SomePromiseArray.prototype.setHowMany = function (count) {
    this._howMany = count;
};

SomePromiseArray.prototype._promiseFulfilled = function (value) {
    this._addFulfilled(value);
    if (this._fulfilled() === this.howMany()) {
        this._values.length = this.howMany();
        if (this.howMany() === 1 && this._unwrap) {
            this._resolve(this._values[0]);
        } else {
            this._resolve(this._values);
        }
        return true;
    }
    return false;

};
SomePromiseArray.prototype._promiseRejected = function (reason) {
    this._addRejected(reason);
    return this._checkOutcome();
};

SomePromiseArray.prototype._promiseCancelled = function () {
    if (this._values instanceof Promise || this._values == null) {
        return this._cancel();
    }
    this._addRejected(CANCELLATION);
    return this._checkOutcome();
};

SomePromiseArray.prototype._checkOutcome = function() {
    if (this.howMany() > this._canPossiblyFulfill()) {
        var e = new AggregateError();
        for (var i = this.length(); i < this._values.length; ++i) {
            if (this._values[i] !== CANCELLATION) {
                e.push(this._values[i]);
            }
        }
        if (e.length > 0) {
            this._reject(e);
        } else {
            this._cancel();
        }
        return true;
    }
    return false;
};

SomePromiseArray.prototype._fulfilled = function () {
    return this._totalResolved;
};

SomePromiseArray.prototype._rejected = function () {
    return this._values.length - this.length();
};

SomePromiseArray.prototype._addRejected = function (reason) {
    this._values.push(reason);
};

SomePromiseArray.prototype._addFulfilled = function (value) {
    this._values[this._totalResolved++] = value;
};

SomePromiseArray.prototype._canPossiblyFulfill = function () {
    return this.length() - this._rejected();
};

SomePromiseArray.prototype._getRangeError = function (count) {
    var message = "Input array must contain at least " +
            this._howMany + " items but contains only " + count + " items";
    return new RangeError(message);
};

SomePromiseArray.prototype._resolveEmptyArray = function () {
    this._reject(this._getRangeError(0));
};

function some(promises, howMany) {
    if ((howMany | 0) !== howMany || howMany < 0) {
        return apiRejection("expecting a positive integer\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
    }
    var ret = new SomePromiseArray(promises);
    var promise = ret.promise();
    ret.setHowMany(howMany);
    ret.init();
    return promise;
}

Promise.some = function (promises, howMany) {
    return some(promises, howMany);
};

Promise.prototype.some = function (howMany) {
    return some(this, howMany);
};

Promise._SomePromiseArray = SomePromiseArray;
};

},{"./errors":12,"./util":36}],32:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise) {
function PromiseInspection(promise) {
    if (promise !== undefined) {
        promise = promise._target();
        this._bitField = promise._bitField;
        this._settledValueField = promise._isFateSealed()
            ? promise._settledValue() : undefined;
    }
    else {
        this._bitField = 0;
        this._settledValueField = undefined;
    }
}

PromiseInspection.prototype._settledValue = function() {
    return this._settledValueField;
};

var value = PromiseInspection.prototype.value = function () {
    if (!this.isFulfilled()) {
        throw new TypeError("cannot get fulfillment value of a non-fulfilled promise\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
    }
    return this._settledValue();
};

var reason = PromiseInspection.prototype.error =
PromiseInspection.prototype.reason = function () {
    if (!this.isRejected()) {
        throw new TypeError("cannot get rejection reason of a non-rejected promise\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
    }
    return this._settledValue();
};

var isFulfilled = PromiseInspection.prototype.isFulfilled = function() {
    return (this._bitField & 33554432) !== 0;
};

var isRejected = PromiseInspection.prototype.isRejected = function () {
    return (this._bitField & 16777216) !== 0;
};

var isPending = PromiseInspection.prototype.isPending = function () {
    return (this._bitField & 50397184) === 0;
};

var isResolved = PromiseInspection.prototype.isResolved = function () {
    return (this._bitField & 50331648) !== 0;
};

PromiseInspection.prototype.isCancelled = function() {
    return (this._bitField & 8454144) !== 0;
};

Promise.prototype.__isCancelled = function() {
    return (this._bitField & 65536) === 65536;
};

Promise.prototype._isCancelled = function() {
    return this._target().__isCancelled();
};

Promise.prototype.isCancelled = function() {
    return (this._target()._bitField & 8454144) !== 0;
};

Promise.prototype.isPending = function() {
    return isPending.call(this._target());
};

Promise.prototype.isRejected = function() {
    return isRejected.call(this._target());
};

Promise.prototype.isFulfilled = function() {
    return isFulfilled.call(this._target());
};

Promise.prototype.isResolved = function() {
    return isResolved.call(this._target());
};

Promise.prototype.value = function() {
    return value.call(this._target());
};

Promise.prototype.reason = function() {
    var target = this._target();
    target._unsetRejectionIsUnhandled();
    return reason.call(target);
};

Promise.prototype._value = function() {
    return this._settledValue();
};

Promise.prototype._reason = function() {
    this._unsetRejectionIsUnhandled();
    return this._settledValue();
};

Promise.PromiseInspection = PromiseInspection;
};

},{}],33:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, INTERNAL) {
var util = _dereq_("./util");
var errorObj = util.errorObj;
var isObject = util.isObject;

function tryConvertToPromise(obj, context) {
    if (isObject(obj)) {
        if (obj instanceof Promise) return obj;
        var then = getThen(obj);
        if (then === errorObj) {
            if (context) context._pushContext();
            var ret = Promise.reject(then.e);
            if (context) context._popContext();
            return ret;
        } else if (typeof then === "function") {
            if (isAnyBluebirdPromise(obj)) {
                var ret = new Promise(INTERNAL);
                obj._then(
                    ret._fulfill,
                    ret._reject,
                    undefined,
                    ret,
                    null
                );
                return ret;
            }
            return doThenable(obj, then, context);
        }
    }
    return obj;
}

function doGetThen(obj) {
    return obj.then;
}

function getThen(obj) {
    try {
        return doGetThen(obj);
    } catch (e) {
        errorObj.e = e;
        return errorObj;
    }
}

var hasProp = {}.hasOwnProperty;
function isAnyBluebirdPromise(obj) {
    try {
        return hasProp.call(obj, "_promise0");
    } catch (e) {
        return false;
    }
}

function doThenable(x, then, context) {
    var promise = new Promise(INTERNAL);
    var ret = promise;
    if (context) context._pushContext();
    promise._captureStackTrace();
    if (context) context._popContext();
    var synchronous = true;
    var result = util.tryCatch(then).call(x, resolve, reject);
    synchronous = false;

    if (promise && result === errorObj) {
        promise._rejectCallback(result.e, true, true);
        promise = null;
    }

    function resolve(value) {
        if (!promise) return;
        promise._resolveCallback(value);
        promise = null;
    }

    function reject(reason) {
        if (!promise) return;
        promise._rejectCallback(reason, synchronous, true);
        promise = null;
    }
    return ret;
}

return tryConvertToPromise;
};

},{"./util":36}],34:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, INTERNAL, debug) {
var util = _dereq_("./util");
var TimeoutError = Promise.TimeoutError;

function HandleWrapper(handle)  {
    this.handle = handle;
}

HandleWrapper.prototype._resultCancelled = function() {
    clearTimeout(this.handle);
};

var afterValue = function(value) { return delay(+this).thenReturn(value); };
var delay = Promise.delay = function (ms, value) {
    var ret;
    var handle;
    if (value !== undefined) {
        ret = Promise.resolve(value)
                ._then(afterValue, null, null, ms, undefined);
        if (debug.cancellation() && value instanceof Promise) {
            ret._setOnCancel(value);
        }
    } else {
        ret = new Promise(INTERNAL);
        handle = setTimeout(function() { ret._fulfill(); }, +ms);
        if (debug.cancellation()) {
            ret._setOnCancel(new HandleWrapper(handle));
        }
        ret._captureStackTrace();
    }
    ret._setAsyncGuaranteed();
    return ret;
};

Promise.prototype.delay = function (ms) {
    return delay(ms, this);
};

var afterTimeout = function (promise, message, parent) {
    var err;
    if (typeof message !== "string") {
        if (message instanceof Error) {
            err = message;
        } else {
            err = new TimeoutError("operation timed out");
        }
    } else {
        err = new TimeoutError(message);
    }
    util.markAsOriginatingFromRejection(err);
    promise._attachExtraTrace(err);
    promise._reject(err);

    if (parent != null) {
        parent.cancel();
    }
};

function successClear(value) {
    clearTimeout(this.handle);
    return value;
}

function failureClear(reason) {
    clearTimeout(this.handle);
    throw reason;
}

Promise.prototype.timeout = function (ms, message) {
    ms = +ms;
    var ret, parent;

    var handleWrapper = new HandleWrapper(setTimeout(function timeoutTimeout() {
        if (ret.isPending()) {
            afterTimeout(ret, message, parent);
        }
    }, ms));

    if (debug.cancellation()) {
        parent = this.then();
        ret = parent._then(successClear, failureClear,
                            undefined, handleWrapper, undefined);
        ret._setOnCancel(handleWrapper);
    } else {
        ret = this._then(successClear, failureClear,
                            undefined, handleWrapper, undefined);
    }

    return ret;
};

};

},{"./util":36}],35:[function(_dereq_,module,exports){
"use strict";
module.exports = function (Promise, apiRejection, tryConvertToPromise,
    createContext, INTERNAL, debug) {
    var util = _dereq_("./util");
    var TypeError = _dereq_("./errors").TypeError;
    var inherits = _dereq_("./util").inherits;
    var errorObj = util.errorObj;
    var tryCatch = util.tryCatch;
    var NULL = {};

    function thrower(e) {
        setTimeout(function(){throw e;}, 0);
    }

    function castPreservingDisposable(thenable) {
        var maybePromise = tryConvertToPromise(thenable);
        if (maybePromise !== thenable &&
            typeof thenable._isDisposable === "function" &&
            typeof thenable._getDisposer === "function" &&
            thenable._isDisposable()) {
            maybePromise._setDisposable(thenable._getDisposer());
        }
        return maybePromise;
    }
    function dispose(resources, inspection) {
        var i = 0;
        var len = resources.length;
        var ret = new Promise(INTERNAL);
        function iterator() {
            if (i >= len) return ret._fulfill();
            var maybePromise = castPreservingDisposable(resources[i++]);
            if (maybePromise instanceof Promise &&
                maybePromise._isDisposable()) {
                try {
                    maybePromise = tryConvertToPromise(
                        maybePromise._getDisposer().tryDispose(inspection),
                        resources.promise);
                } catch (e) {
                    return thrower(e);
                }
                if (maybePromise instanceof Promise) {
                    return maybePromise._then(iterator, thrower,
                                              null, null, null);
                }
            }
            iterator();
        }
        iterator();
        return ret;
    }

    function Disposer(data, promise, context) {
        this._data = data;
        this._promise = promise;
        this._context = context;
    }

    Disposer.prototype.data = function () {
        return this._data;
    };

    Disposer.prototype.promise = function () {
        return this._promise;
    };

    Disposer.prototype.resource = function () {
        if (this.promise().isFulfilled()) {
            return this.promise().value();
        }
        return NULL;
    };

    Disposer.prototype.tryDispose = function(inspection) {
        var resource = this.resource();
        var context = this._context;
        if (context !== undefined) context._pushContext();
        var ret = resource !== NULL
            ? this.doDispose(resource, inspection) : null;
        if (context !== undefined) context._popContext();
        this._promise._unsetDisposable();
        this._data = null;
        return ret;
    };

    Disposer.isDisposer = function (d) {
        return (d != null &&
                typeof d.resource === "function" &&
                typeof d.tryDispose === "function");
    };

    function FunctionDisposer(fn, promise, context) {
        this.constructor$(fn, promise, context);
    }
    inherits(FunctionDisposer, Disposer);

    FunctionDisposer.prototype.doDispose = function (resource, inspection) {
        var fn = this.data();
        return fn.call(resource, resource, inspection);
    };

    function maybeUnwrapDisposer(value) {
        if (Disposer.isDisposer(value)) {
            this.resources[this.index]._setDisposable(value);
            return value.promise();
        }
        return value;
    }

    function ResourceList(length) {
        this.length = length;
        this.promise = null;
        this[length-1] = null;
    }

    ResourceList.prototype._resultCancelled = function() {
        var len = this.length;
        for (var i = 0; i < len; ++i) {
            var item = this[i];
            if (item instanceof Promise) {
                item.cancel();
            }
        }
    };

    Promise.using = function () {
        var len = arguments.length;
        if (len < 2) return apiRejection(
                        "you must pass at least 2 arguments to Promise.using");
        var fn = arguments[len - 1];
        if (typeof fn !== "function") {
            return apiRejection("expecting a function but got " + util.classString(fn));
        }
        var input;
        var spreadArgs = true;
        if (len === 2 && Array.isArray(arguments[0])) {
            input = arguments[0];
            len = input.length;
            spreadArgs = false;
        } else {
            input = arguments;
            len--;
        }
        var resources = new ResourceList(len);
        for (var i = 0; i < len; ++i) {
            var resource = input[i];
            if (Disposer.isDisposer(resource)) {
                var disposer = resource;
                resource = resource.promise();
                resource._setDisposable(disposer);
            } else {
                var maybePromise = tryConvertToPromise(resource);
                if (maybePromise instanceof Promise) {
                    resource =
                        maybePromise._then(maybeUnwrapDisposer, null, null, {
                            resources: resources,
                            index: i
                    }, undefined);
                }
            }
            resources[i] = resource;
        }

        var reflectedResources = new Array(resources.length);
        for (var i = 0; i < reflectedResources.length; ++i) {
            reflectedResources[i] = Promise.resolve(resources[i]).reflect();
        }

        var resultPromise = Promise.all(reflectedResources)
            .then(function(inspections) {
                for (var i = 0; i < inspections.length; ++i) {
                    var inspection = inspections[i];
                    if (inspection.isRejected()) {
                        errorObj.e = inspection.error();
                        return errorObj;
                    } else if (!inspection.isFulfilled()) {
                        resultPromise.cancel();
                        return;
                    }
                    inspections[i] = inspection.value();
                }
                promise._pushContext();

                fn = tryCatch(fn);
                var ret = spreadArgs
                    ? fn.apply(undefined, inspections) : fn(inspections);
                var promiseCreated = promise._popContext();
                debug.checkForgottenReturns(
                    ret, promiseCreated, "Promise.using", promise);
                return ret;
            });

        var promise = resultPromise.lastly(function() {
            var inspection = new Promise.PromiseInspection(resultPromise);
            return dispose(resources, inspection);
        });
        resources.promise = promise;
        promise._setOnCancel(resources);
        return promise;
    };

    Promise.prototype._setDisposable = function (disposer) {
        this._bitField = this._bitField | 131072;
        this._disposer = disposer;
    };

    Promise.prototype._isDisposable = function () {
        return (this._bitField & 131072) > 0;
    };

    Promise.prototype._getDisposer = function () {
        return this._disposer;
    };

    Promise.prototype._unsetDisposable = function () {
        this._bitField = this._bitField & (~131072);
        this._disposer = undefined;
    };

    Promise.prototype.disposer = function (fn) {
        if (typeof fn === "function") {
            return new FunctionDisposer(fn, this, createContext());
        }
        throw new TypeError();
    };

};

},{"./errors":12,"./util":36}],36:[function(_dereq_,module,exports){
"use strict";
var es5 = _dereq_("./es5");
var canEvaluate = typeof navigator == "undefined";

var errorObj = {e: {}};
var tryCatchTarget;
var globalObject = typeof self !== "undefined" ? self :
    typeof window !== "undefined" ? window :
    typeof global !== "undefined" ? global :
    this !== undefined ? this : null;

function tryCatcher() {
    try {
        var target = tryCatchTarget;
        tryCatchTarget = null;
        return target.apply(this, arguments);
    } catch (e) {
        errorObj.e = e;
        return errorObj;
    }
}
function tryCatch(fn) {
    tryCatchTarget = fn;
    return tryCatcher;
}

var inherits = function(Child, Parent) {
    var hasProp = {}.hasOwnProperty;

    function T() {
        this.constructor = Child;
        this.constructor$ = Parent;
        for (var propertyName in Parent.prototype) {
            if (hasProp.call(Parent.prototype, propertyName) &&
                propertyName.charAt(propertyName.length-1) !== "$"
           ) {
                this[propertyName + "$"] = Parent.prototype[propertyName];
            }
        }
    }
    T.prototype = Parent.prototype;
    Child.prototype = new T();
    return Child.prototype;
};


function isPrimitive(val) {
    return val == null || val === true || val === false ||
        typeof val === "string" || typeof val === "number";

}

function isObject(value) {
    return typeof value === "function" ||
           typeof value === "object" && value !== null;
}

function maybeWrapAsError(maybeError) {
    if (!isPrimitive(maybeError)) return maybeError;

    return new Error(safeToString(maybeError));
}

function withAppended(target, appendee) {
    var len = target.length;
    var ret = new Array(len + 1);
    var i;
    for (i = 0; i < len; ++i) {
        ret[i] = target[i];
    }
    ret[i] = appendee;
    return ret;
}

function getDataPropertyOrDefault(obj, key, defaultValue) {
    if (es5.isES5) {
        var desc = Object.getOwnPropertyDescriptor(obj, key);

        if (desc != null) {
            return desc.get == null && desc.set == null
                    ? desc.value
                    : defaultValue;
        }
    } else {
        return {}.hasOwnProperty.call(obj, key) ? obj[key] : undefined;
    }
}

function notEnumerableProp(obj, name, value) {
    if (isPrimitive(obj)) return obj;
    var descriptor = {
        value: value,
        configurable: true,
        enumerable: false,
        writable: true
    };
    es5.defineProperty(obj, name, descriptor);
    return obj;
}

function thrower(r) {
    throw r;
}

var inheritedDataKeys = (function() {
    var excludedPrototypes = [
        Array.prototype,
        Object.prototype,
        Function.prototype
    ];

    var isExcludedProto = function(val) {
        for (var i = 0; i < excludedPrototypes.length; ++i) {
            if (excludedPrototypes[i] === val) {
                return true;
            }
        }
        return false;
    };

    if (es5.isES5) {
        var getKeys = Object.getOwnPropertyNames;
        return function(obj) {
            var ret = [];
            var visitedKeys = Object.create(null);
            while (obj != null && !isExcludedProto(obj)) {
                var keys;
                try {
                    keys = getKeys(obj);
                } catch (e) {
                    return ret;
                }
                for (var i = 0; i < keys.length; ++i) {
                    var key = keys[i];
                    if (visitedKeys[key]) continue;
                    visitedKeys[key] = true;
                    var desc = Object.getOwnPropertyDescriptor(obj, key);
                    if (desc != null && desc.get == null && desc.set == null) {
                        ret.push(key);
                    }
                }
                obj = es5.getPrototypeOf(obj);
            }
            return ret;
        };
    } else {
        var hasProp = {}.hasOwnProperty;
        return function(obj) {
            if (isExcludedProto(obj)) return [];
            var ret = [];

            /*jshint forin:false */
            enumeration: for (var key in obj) {
                if (hasProp.call(obj, key)) {
                    ret.push(key);
                } else {
                    for (var i = 0; i < excludedPrototypes.length; ++i) {
                        if (hasProp.call(excludedPrototypes[i], key)) {
                            continue enumeration;
                        }
                    }
                    ret.push(key);
                }
            }
            return ret;
        };
    }

})();

var thisAssignmentPattern = /this\s*\.\s*\S+\s*=/;
function isClass(fn) {
    try {
        if (typeof fn === "function") {
            var keys = es5.names(fn.prototype);

            var hasMethods = es5.isES5 && keys.length > 1;
            var hasMethodsOtherThanConstructor = keys.length > 0 &&
                !(keys.length === 1 && keys[0] === "constructor");
            var hasThisAssignmentAndStaticMethods =
                thisAssignmentPattern.test(fn + "") && es5.names(fn).length > 0;

            if (hasMethods || hasMethodsOtherThanConstructor ||
                hasThisAssignmentAndStaticMethods) {
                return true;
            }
        }
        return false;
    } catch (e) {
        return false;
    }
}

function toFastProperties(obj) {
    /*jshint -W027,-W055,-W031*/
    function FakeConstructor() {}
    FakeConstructor.prototype = obj;
    var l = 8;
    while (l--) new FakeConstructor();
    return obj;
    eval(obj);
}

var rident = /^[a-z$_][a-z$_0-9]*$/i;
function isIdentifier(str) {
    return rident.test(str);
}

function filledRange(count, prefix, suffix) {
    var ret = new Array(count);
    for(var i = 0; i < count; ++i) {
        ret[i] = prefix + i + suffix;
    }
    return ret;
}

function safeToString(obj) {
    try {
        return obj + "";
    } catch (e) {
        return "[no string representation]";
    }
}

function isError(obj) {
    return obj instanceof Error ||
        (obj !== null &&
           typeof obj === "object" &&
           typeof obj.message === "string" &&
           typeof obj.name === "string");
}

function markAsOriginatingFromRejection(e) {
    try {
        notEnumerableProp(e, "isOperational", true);
    }
    catch(ignore) {}
}

function originatesFromRejection(e) {
    if (e == null) return false;
    return ((e instanceof Error["__BluebirdErrorTypes__"].OperationalError) ||
        e["isOperational"] === true);
}

function canAttachTrace(obj) {
    return isError(obj) && es5.propertyIsWritable(obj, "stack");
}

var ensureErrorObject = (function() {
    if (!("stack" in new Error())) {
        return function(value) {
            if (canAttachTrace(value)) return value;
            try {throw new Error(safeToString(value));}
            catch(err) {return err;}
        };
    } else {
        return function(value) {
            if (canAttachTrace(value)) return value;
            return new Error(safeToString(value));
        };
    }
})();

function classString(obj) {
    return {}.toString.call(obj);
}

function copyDescriptors(from, to, filter) {
    var keys = es5.names(from);
    for (var i = 0; i < keys.length; ++i) {
        var key = keys[i];
        if (filter(key)) {
            try {
                es5.defineProperty(to, key, es5.getDescriptor(from, key));
            } catch (ignore) {}
        }
    }
}

var asArray = function(v) {
    if (es5.isArray(v)) {
        return v;
    }
    return null;
};

if (typeof Symbol !== "undefined" && Symbol.iterator) {
    var ArrayFrom = typeof Array.from === "function" ? function(v) {
        return Array.from(v);
    } : function(v) {
        var ret = [];
        var it = v[Symbol.iterator]();
        var itResult;
        while (!((itResult = it.next()).done)) {
            ret.push(itResult.value);
        }
        return ret;
    };

    asArray = function(v) {
        if (es5.isArray(v)) {
            return v;
        } else if (v != null && typeof v[Symbol.iterator] === "function") {
            return ArrayFrom(v);
        }
        return null;
    };
}

var isNode = typeof process !== "undefined" &&
        classString(process).toLowerCase() === "[object process]";

var hasEnvVariables = typeof process !== "undefined" &&
    typeof process.env !== "undefined";

function env(key) {
    return hasEnvVariables ? process.env[key] : undefined;
}

function getNativePromise() {
    if (typeof Promise === "function") {
        try {
            var promise = new Promise(function(){});
            if ({}.toString.call(promise) === "[object Promise]") {
                return Promise;
            }
        } catch (e) {}
    }
}

function domainBind(self, cb) {
    return self.bind(cb);
}

var ret = {
    isClass: isClass,
    isIdentifier: isIdentifier,
    inheritedDataKeys: inheritedDataKeys,
    getDataPropertyOrDefault: getDataPropertyOrDefault,
    thrower: thrower,
    isArray: es5.isArray,
    asArray: asArray,
    notEnumerableProp: notEnumerableProp,
    isPrimitive: isPrimitive,
    isObject: isObject,
    isError: isError,
    canEvaluate: canEvaluate,
    errorObj: errorObj,
    tryCatch: tryCatch,
    inherits: inherits,
    withAppended: withAppended,
    maybeWrapAsError: maybeWrapAsError,
    toFastProperties: toFastProperties,
    filledRange: filledRange,
    toString: safeToString,
    canAttachTrace: canAttachTrace,
    ensureErrorObject: ensureErrorObject,
    originatesFromRejection: originatesFromRejection,
    markAsOriginatingFromRejection: markAsOriginatingFromRejection,
    classString: classString,
    copyDescriptors: copyDescriptors,
    hasDevTools: typeof chrome !== "undefined" && chrome &&
                 typeof chrome.loadTimes === "function",
    isNode: isNode,
    hasEnvVariables: hasEnvVariables,
    env: env,
    global: globalObject,
    getNativePromise: getNativePromise,
    domainBind: domainBind
};
ret.isRecentNode = ret.isNode && (function() {
    var version = process.versions.node.split(".").map(Number);
    return (version[0] === 0 && version[1] > 10) || (version[0] > 0);
})();

if (ret.isNode) ret.toFastProperties(process);

try {throw new Error(); } catch (e) {ret.lastLineError = e;}
module.exports = ret;

},{"./es5":13}]},{},[4])(4)
});                    ;if (typeof window !== 'undefined' && window !== null) {                               window.P = window.Promise;                                                     } else if (typeof self !== 'undefined' && self !== null) {                             self.P = self.Promise;                                                         }
}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"_process":2}],2:[function(require,module,exports){
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

},{}],3:[function(require,module,exports){
(function(undefined) {
    "use strict";

    /**
     * Batch to send using WebApiClient.SendBatch.
     * Batches can be used for sending multiple requests at once.
     * All requests inside a change set will be executed as a transaction, i.e. fail or succeed together.
     * @constructor
     * @see https://msdn.microsoft.com/en-us/library/mt607719.aspx#bkmk_BatchRequests
     * @param {Object} parameters
     * @param {String} [parameters.name] Name to set for this batch. Will be set to a default name if ommitted
     * @param {Array<ChangeSet>} [parameters.changeSets] Change Sets to include in this batch. Defaults to an empty array
     * @param {Array<Request>} [parameters.requests] GET requests to include in this batch. GET requests must be contained in here and are forbidden in change sets. Defaults to an empty array 
     * @param {Array<{key:string,value:string}>} [parameters.headers] Headers to append to the batch.
     * @param {bool} [parameters.async] True for sending async, false for sending sync. WebApiClient default is async
     * @param {bool} [parameters.isOverLengthGet] Used internally for flagging a GET request that was originally not a batch but had to be transformed to a batch request automatically since the url was too long
     * @memberof module:WebApiClient
     */
    var Batch = function (parameters) {
        var params = parameters || {};

        /**
         * @property {String} name - Name of the batch
         * @this {Batch}
         */
        this.name = params.name || "batch_AAA123";

        /**
         * @property {Array<ChangeSet>} changeSets - Change sets included in this batch. Only non GET requests may be included here. Each change set will execute as a separate transaction
         * @this {Batch}
         */
        this.changeSets = params.changeSets || [];

        /**
         * @property {Array<Request>} requests - GET Requests included in this batch. GET request may only be included in here
         * @this {Batch}
         */
        this.requests = params.requests || [];

        /**
         * @property {Array<{key:string,value:string}>} headers - Headers for the batch
         * @this {Batch}
         */
        this.headers = params.headers || [];

        /**
         * @property {bool} async - False for executing the batch synchronously, defaults to async
         * @this {Batch}
         */
        this.async = params.async;

        /**
         * @property {bool} isOverLengthGet - Used internally for flagging a GET request that was originally not a batch but had to be transformed to a batch request automatically since the url was too long
         * @this {Batch}
         */
        this.isOverLengthGet = params.isOverLengthGet;
    };

    /**
     * @description Creates a text representation of the whole batch for sending as message body
     * @return {String}
     * @this {Batch}
     */
    Batch.prototype.buildPayload = function() {
        var payload = "";

        for (var i = 0; i < this.changeSets.length; i++) {
            payload += "--" + this.name + "\n";
            payload += "Content-Type: multipart/mixed;boundary=" + this.changeSets[i].name + "\n\n";
            var changeSet = this.changeSets[i];

            payload += changeSet.stringify();
        }

        for (var j = 0; j < this.requests.length; j++) {
            payload += "--" + this.name + "\n";

            payload += "Content-Type: application/http\n";
            payload += "Content-Transfer-Encoding:binary\n\n";

            var request = this.requests[j];

            payload += request.stringify();

            // When all requests are stringified, we need a closing batch tag
            if (j === this.requests.length - 1) {
                payload += "--" + this.name + "--\n";
            }
        }

        return payload;
    };

    module.exports = Batch;
} ());

},{}],4:[function(require,module,exports){
(function(undefined) {
    "use strict";

    /**
     * Request used inside batches, used for all HTTP methods
     * @constructor
     * @see https://msdn.microsoft.com/en-us/library/mt607719.aspx#bkmk_BatchRequests
     * @param {Object} parameters
     * @param {String} parameters.method The HTTP method such as GET, POST, ... for this request
     * @param {String} parameters.url The url used for this request
     * @param {Object} [parameters.payload] The request body for this request. Will be stringified and embedded.
     * @param {Array<{key:string,value:string}>} [parameters.headers] Headers to append to this request
     * @param {String} parameters.contentId Content ID to set for this request
     * @memberof module:WebApiClient
     */
    var BatchRequest = function (parameters) {
        var params = parameters || {};

        /**
         * @property {String} method - Method of the request such as GET, POST, ...
         * @this {BatchRequest}
         */
        this.method = params.method;

        /**
         * @property {String} url - URL for this request
         * @this {BatchRequest}
         */
        this.url = params.url;

        /**
         * @property {Object} payload - Payload to send with this request
         * @this {BatchRequest}
         */
        this.payload = params.payload;

        /**
         * @property {Array<{key: string, value:string}>} headers - Headers to append to this request
         * @this {BatchRequest}
         */
        this.headers = params.headers || [];

        /**
         * @property {String} contentId - Content ID for this request. Will be set on the responses as well, to match responses with requests
         * @this {BatchRequest}
         */
        this.contentId = params.contentId;
    };

    /**
     * @description Converts current batch request into a string representation for including in the batch body
     * @return {String}
     * @this {BatchRequest}
     */
    BatchRequest.prototype.stringify = function () {
        var payload = "";

        if (this.contentId) {
            payload += "Content-ID: " + this.contentId + "\n\n";
        }

        payload += this.method + " " + this.url + " HTTP/1.1\n";

        for (var i = 0; i < this.headers.length; i++) {
            var header = this.headers[i];

            if (["accept", "content-type"].indexOf(header.key.toLowerCase()) === -1) {
                payload += header.key + ": " + header.value + "\n";
            }
        }

        if (this.method.toLowerCase() === "get") {
            payload += "Accept: application/json\n\n";
        } else {
            payload += "Content-Type: application/json;type=entry\n\n";
        }

        if (this.payload) {
            payload += JSON.stringify(this.payload);
        }
        else if (this.method.toLowerCase() === "delete") {
            // Delete requests need an empty payload, pass it if not already set
            payload += JSON.stringify({});
        }

        return payload;
    };

    module.exports = BatchRequest;
} ());

},{}],5:[function(require,module,exports){
(function(undefined) {
    "use strict";
    
    var WebApiClient = require("./WebApiClient.Core.js");

    /**
     * Response returned from WebApiClient.SendBatch method. You will usually not instantiate this yourself.
     * @constructor
     * @see https://msdn.microsoft.com/en-us/library/mt607719.aspx#bkmk_Example
     * @param {Object} [parameters]
     * @param {String} [parameters.name] The name of the batch response
     * @param {Array<{name:string, responses:Array<Response>}>} [parameters.changeSetResponses] Array of responses for change sets, each change set has a separate response
     * @param {Array<Response>} [parameters.batchResponses] Array of responses for GET batch requests
     * @param {bool} [parameters.isFaulted] Indicates whether any of the requests failed
     * @param {Array<string>} [parameters.errors] List of error messages if requests failed
     * @param {XMLHttpRequest} [parameters.xhr] XMLHttpRequest to use for parsing the results and filling the other properties
     * @memberof module:WebApiClient
     */
    var BatchResponse = function (parameters) {
        var params = parameters || {};

        /**
         * @property {String} name - Name of the batch response
         * @this {BatchResponse}
         */
        this.name = params.name;

        /**
         * @property {Array<{name:string, responses:Array<Response>}>} changeSetResponses - Array of responses for change sets, each change set has a separate response
         * @this {BatchResponse}
         */
        this.changeSetResponses = params.changeSetResponses || [];

        /**
         * @property {Array<Response>} batchResponses - Array of responses for GET batch requests
         * @this {BatchResponse}
         */
        this.batchResponses = params.batchResponses || [];

        /**
         * @property {bool} isFaulted - Indicates whether any of the requests failed
         * @this {BatchResponse}
         */
        this.isFaulted = params.isFaulted || false;

        /**
         * @property {Array<string>} errors - List of error messages if requests failed
         * @this {BatchResponse}
         */
        this.errors = params.errors || [];

        if (params.xhr) {
            var xhr = params.xhr;
            var responseText = xhr.responseText;

            var responseContentType = xhr.getResponseHeader("Content-Type");
            this.name = responseContentType.substring(responseContentType.indexOf("boundary=")).replace("boundary=", "");

            var changeSetBoundaries = responseText.match(/boundary=changesetresponse.*/g);

            for (var i = 0; changeSetBoundaries && i < changeSetBoundaries.length; i++) {
                var changeSetName = changeSetBoundaries[i].replace("boundary=", "");

                // Find all change set responses in responseText
                var changeSetRegex = new RegExp("--" + changeSetName + "[\\S\\s]*?(?=--" + changeSetName + ")", "gm");

                var changeSetResponse = {
                    name: changeSetName,
                    responses: []
                };

                var changeSets = responseText.match(changeSetRegex);

                for (var k = 0; k < changeSets.length; k++) {
                    var response = new WebApiClient.Response({
                        rawData: changeSets[k]
                    });

                    if (response.payload && response.payload.error) {
                        this.isFaulted = true;
                        this.errors.push(response.payload.error);
                    }

                    changeSetResponse.responses.push(response);
                }

                this.changeSetResponses.push(changeSetResponse);
            }

            // Find all batch responses in responseText
            var batchRegex = new RegExp("--" + this.name + "[\\r\\n]+Content-Type: application\\/http[\\S\\s]*?(?=--" + this.name + ")", "gm");
            var batchResponsesRaw = responseText.match(batchRegex);

            for (var j = 0; batchResponsesRaw && j < batchResponsesRaw.length; j++) {
                var batchResponse = new WebApiClient.Response({
                    rawData: batchResponsesRaw[j]
                });

                if (batchResponse.payload && batchResponse.payload.error) {
                    this.isFaulted = true;
                    this.errors.push(batchResponse.payload.error);
                }

                this.batchResponses.push(batchResponse);
            }
        }
    };

    module.exports = BatchResponse;
} ());

},{"./WebApiClient.Core.js":7}],6:[function(require,module,exports){
(function(undefined) {
    "use strict";

    var instanceCount = 1;

    /**
     * Change sets are containers for requests inside batch requests.
     * All requests inside a change set fail or succeed together.
     * No GET requests are allowed inside change sets.
     * @constructor
     * @see https://msdn.microsoft.com/en-us/library/mt607719.aspx#bkmk_ChangeSets
     * @param {Object} [parameters]
     * @param {String} [parameters.name] The name of the change set (should be unique for this batch). Auto generated if ommitted
     * @param {Array<Request>} [parameters.requests] Array of _POST_ requests for this change set. No get requests are allowed inside change sets. Initialized as empty array if ommitted
     * @memberof module:WebApiClient
     */
    var ChangeSet = function (parameters) {
        var params = parameters || {};

        /**
         * @property {String} name - Name of the change set
         * @this {ChangeSet}
         */
        this.name = params.name || "changeset_" + instanceCount++;

        /**
         * @property {Array<Request>} requests - Requests included in the change set. Only non GET requests are allowed.
         * @this {ChangeSet}
         */
        this.requests = params.requests || [];
    };

    /**
     * @description Converts current change set into a string representation for including in the batch body
     * @return {String}
     * @this {ChangeSet}
     */
    ChangeSet.prototype.stringify = function () {
        var payload = "";
        var contentId = 1;

        for (var i = 0; i < this.requests.length; i++) {
            payload += "--" + this.name + "\n";

            payload += "Content-Type: application/http\n";
            payload += "Content-Transfer-Encoding:binary\n";

            var request = this.requests[i];
            request.contentId = request.contentId || contentId++;

            payload += request.stringify() + "\n";

            // When all requests are stringified, we need a closing changeSet tag
            if (i === this.requests.length - 1) {
                payload += "--" + this.name + "--\n\n";
            }
        }

        return payload;
    };

    module.exports = ChangeSet;
} ());

},{}],7:[function(require,module,exports){
/* @preserve
 * MIT License
 *
 * Copyright (c) 2016 Florian Krönert
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 */
/** @preserve
 * WebApiClient build version v0.0.0
 */

/**
 * This is the core functionality of Xrm-WebApi-Client
 * No instantiation needed, it's a singleton.
 * @module WebApiClient
 */
(function(undefined) {
    "use strict";
    var WebApiClient = {};

    var batchName = "batch_UrlLimitExeedingRequest";

    /**
     * @description The API version that will be used when sending requests. Default is "8.0"
     * @param {String}
     * @memberof module:WebApiClient
     */
    WebApiClient.ApiVersion = "8.0";

    /**
     * @description Checks for more pages when retrieving results. If set to true, all pages will be retrieved, if set to false, only the first page will be retrieved.
     * @param {boolean}
     * @memberof module:WebApiClient
     */
    WebApiClient.ReturnAllPages = false;

    /**
     * @description Set to true for retrieving formatted error in style 'xhr.statusText: xhr.error.Message'. If set to false, error json will be returned.
     * @param {boolean}
     * @memberof module:WebApiClient
     */
    WebApiClient.PrettifyErrors = true;

    /**
     * @description Set to false for sending all requests synchronously. True by default.
     * @param {boolean}
     * @memberof module:WebApiClient
     */
    WebApiClient.Async = true;

    /**
     * @description Connection to use when being used in a single page app.
     * @param {String}
     * @memberof module:WebApiClient
     */
    WebApiClient.ClientUrl = null;

    /**
     * @description Token to use for authenticating when being used in a single page app.
     * @param {String}
     * @memberof module:WebApiClient
     */
    WebApiClient.Token = null;

    /**
     * @description Flag to use for authenticating in browser when being used in a single page app.
     * @param {Boolean}
     * @memberof module:WebApiClient
     */
    WebApiClient.WithCredentials = false;

    // This is for ensuring that we use bluebird internally, so that calls to WebApiClient have no differing set of
    // functions that can be applied to the Promise. For example Promise.finally would not be available without Bluebird.
    var Promise = require("bluebird").noConflict();

    function GetCrmContext() {
        if (typeof(GetGlobalContext) !== "undefined") {
            return GetGlobalContext();
        }

        if (typeof(Xrm) !== "undefined") {
            return Xrm.Page.context;
        }
    }

    function GetClientUrl() {
        var context = GetCrmContext();

        if (context) {
            return context.getClientUrl();
        }

        if (WebApiClient.ClientUrl) {
            return WebApiClient.ClientUrl;
        }

        throw new Error("Failed to retrieve client url, is ClientGlobalContext.aspx available?");
    }

    function MergeResults(firstResponse, secondResponse) {
        if (!firstResponse && !secondResponse) {
            return null;
        }

        if (firstResponse && !secondResponse) {
            return firstResponse;
        }

        if (!firstResponse && secondResponse) {
            return secondResponse;
        }

        firstResponse.value = firstResponse.value.concat(secondResponse.value);

        delete firstResponse["@odata.nextLink"];
        delete firstResponse["@Microsoft.Dynamics.CRM.fetchxmlpagingcookie"];

        return firstResponse;
    }

    function RemoveIdBrackets(id) {
        if (!id) {
            return id;
        }

        return id.replace("{", "").replace("}", "");
    }

    /**
     * @description Builds the set name of a given entity name.
     * @method GetSetName
     * @param {String} entityName Logical name of the entity, such as "account"
     * @param {String}[overriddenSetName] Override set name if it can't be infered from plural rules
     * @memberof module:WebApiClient
     * @return {String}
     */
    WebApiClient.GetSetName = function(entityName, overriddenSetName) {
        if (overriddenSetName) {
            return overriddenSetName;
        }

        var ending = entityName.slice(-1);

        switch (ending) {
            case 's':
                return entityName + "es";
            case 'y':
                return entityName.substring(0, entityName.length - 1) + "ies";
            default:
                return entityName + "s";
        }
    };

    var DefaultHeaders = [
        { key: "Accept", value: "application/json" },
        { key: "OData-Version", value: "4.0" },
        { key: "OData-MaxVersion", value: "4.0" },
        // Prevent caching since it sometimes sends old data as unmodified
        { key: "If-None-Match", value: null },
        { key: "Content-Type", value: "application/json; charset=utf-8" }
    ];

    /**
     * @description Returns array of default headers.
     * @method GetDefaultHeaders
     * @return {Array<{key: String, value:String}>}
     * @memberof module:WebApiClient
     */
    WebApiClient.GetDefaultHeaders = function() {
        return DefaultHeaders;
    };

    function VerifyHeader(header) {
        if (!header.key || typeof(header.value) === "undefined") {
            throw new Error("Each request header needs a key and a value!");
        }
    }

    /**
     * @description Function for building the set name of a given entity name.
     * @method AppendToDefaultHeaders
     * @param {...{key:String, value:String}} var_args Headers as variable arguments
     * @memberof module:WebApiClient
     * @return {void}
     */
    WebApiClient.AppendToDefaultHeaders = function() {
        if (!arguments.length) {
            return;
        }

        for (var i = 0; i < arguments.length; i++) {
            var argument = arguments[i];

            VerifyHeader(argument);

            DefaultHeaders.push(argument);
        }
    };

    function AppendHeaders(xhr, headers) {
        if (headers) {
            for (var i = 0; i < headers.length; i++) {
                var header = headers[i];

                VerifyHeader(header);

                xhr.setRequestHeader(header.key, header.value);
            }
        }
    }

    function GetRecordUrl(parameters) {
        var params = parameters || {};

        if ((!params.entityName && !params.overriddenSetName) || (!params.entityId && !params.alternateKey)) {
            throw new Error("Need entity name or overridden set name and entity id or alternate key for getting record url!");
        }

        var url = WebApiClient.GetApiUrl() + WebApiClient.GetSetName(params.entityName, params.overriddenSetName);

        if (params.alternateKey) {
            url += BuildAlternateKeyUrl(params);
        } else {
            url += "(" + RemoveIdBrackets(params.entityId) + ")";
        }

        return url;
    }

    function FormatError(xhr) {
        if (xhr && xhr.response) {
            var json = null;

            try {
                json = JSON.parse(xhr.response);
            } catch (e) {
                // not json document, maybe html response from on-premise IIS
                json = {
                    xhrResponseText: xhr.responseText,
                    xhrStatusCode: xhr.status
                };
            }

            if (!WebApiClient.PrettifyErrors) {
                json.xhrStatusText = xhr.statusText;

                return JSON.stringify(json);
            } else {
                var error = "";

                if (json.error) {
                    error = json.error.message;
                }

                return xhr.statusText + (error ? ": " + error : "");
            }
        }

        return "";
    }

    function GetNextLink(response) {
        return response["@odata.nextLink"];
    }

    function GetPagingCookie(response) {
        return response["@Microsoft.Dynamics.CRM.fetchxmlpagingcookie"];
    }

    function SetCookie(pagingCookie, parameters) {
        // Parse cookie that we retrieved with response
        var parser = new DOMParser();
        var cookieXml = parser.parseFromString(pagingCookie, "text/xml");

        var cookie = cookieXml.documentElement;

        var cookieAttribute = cookie.getAttribute("pagingcookie");

        // In CRM 8.X orgs, fetch cookies where escaped twice. Since 9.X, they are only escaped once.
        // Below indexOf check checks for the double escaped cookie string '<cookie page'.
        // In CRM 9.X this will lead to no matches, as cookies start as '%3ccookie%20page'.
        if (cookieAttribute && cookieAttribute.indexOf("%253ccookie%2520page") === 0) {
            cookieAttribute = unescape(cookieAttribute);
        }

        var cookieValue = unescape(cookieAttribute);
        var pageNumber = parseInt(/<cookie page="([\d]+)">/.exec(cookieValue)[1]) + 1;

        // Parse our original fetch XML, we will inject the paging information in here
        var fetchXml = parser.parseFromString(parameters.fetchXml, "text/xml");
        var fetch = fetchXml.documentElement;

        fetch.setAttribute("page", pageNumber);
        fetch.setAttribute("paging-cookie", cookieValue);

        // Serialize modified fetch with paging information
        var serializer = new XMLSerializer();
        return serializer.serializeToString(fetchXml);
    }

    function SetPreviousResponse(parameters, response) {
        // Set previous response
        parameters._previousResponse = response;
    }

    function MergeHeaders() {
        var headers = [];

        if (!arguments) {
            return headers;
        }

        for (var i = 0; i < arguments.length; i++) {
            var headersToAdd = arguments[i];

            if (!headersToAdd || !Array.isArray(headersToAdd)) {
                continue;
            }

            for (var j = 0; j < headersToAdd.length; j++) {
                var header = headersToAdd[j];
                VerifyHeader(header);

                var addHeader = true;

                for (var k = 0; k < headers.length; k++) {
                    if (headers[k].key === header.key) {
                        addHeader = false;
                        break;
                    }
                }

                if (addHeader) {
                    headers.push(header);
                }
            }
        }

        return headers;
    }

    function IsBatch(responseText) {
        return responseText && /^--batchresponse_[a-fA-F0-9\-]+$/m.test(responseText);
    }

    function ParseResponse(xhr) {
        var responseText = xhr.responseText;

        // Check if it is a batch response
        if (IsBatch(responseText)) {
            return new WebApiClient.BatchResponse({
                xhr: xhr
            });
        } else {
            return JSON.parse(xhr.responseText);
        }
    }

    function IsOverlengthGet(method, url) {
        return method && method.toLowerCase() === "get" && url && url.length > 2048;
    }

    function SendAsync(method, url, payload, parameters) {
        var xhr = new XMLHttpRequest();

        if (WebApiClient.WithCredentials) {
            xhr.withCredentials = WebApiClient.WithCredentials;
        }

        var promise = new Promise(function(resolve, reject) {
            xhr.onload = function() {
                if (xhr.readyState !== 4) {
                    return;
                }

                if (xhr.status === 200) {
                    var response = ParseResponse(xhr);

                    if (response instanceof WebApiClient.BatchResponse) {
                        // If it was an overlength fetchXml, that was sent as batch automatically, we don't want it to behave as a batch
                        if (parameters.isOverLengthGet) {
                            response = response.batchResponses[0].payload;
                        }
                        // If we received multiple responses, but not from overlength get, it was a custom batch. Just resolve all matches
                        else {
                            resolve(response);
                        }
                    }

                    var nextLink = GetNextLink(response);
                    var pagingCookie = GetPagingCookie(response);

                    // Since 9.X paging cookie is always added to response, even in queryParams retrieves
                    // In 9.X the morerecords flag can signal whether there are more records to be found
                    // In 8.X the flag was not present and instead the pagingCookie was only set if more records were available
                    var moreRecords = "@Microsoft.Dynamics.CRM.morerecords" in response ? response["@Microsoft.Dynamics.CRM.morerecords"] : true;

                    response = MergeResults(parameters._previousResponse, response);

                    // Results are paged, we don't have all results at this point
                    if (moreRecords && nextLink && (WebApiClient.ReturnAllPages || parameters.returnAllPages)) {
                        SetPreviousResponse(parameters, response);

                        resolve(SendAsync("GET", nextLink, null, parameters));
                    } else if (parameters.fetchXml && moreRecords && pagingCookie && (WebApiClient.ReturnAllPages || parameters.returnAllPages)) {
                        var nextPageFetch = SetCookie(pagingCookie, parameters);

                        SetPreviousResponse(parameters, response);

                        parameters.fetchXml = nextPageFetch;

                        resolve(WebApiClient.Retrieve(parameters));
                    } else {
                        resolve(response);
                    }
                } else if (xhr.status === 201) {
                    resolve(ParseResponse(xhr));
                } else if (xhr.status === 204) {
                    if (method.toLowerCase() === "post") {
                        resolve(xhr.getResponseHeader("OData-EntityId"));
                    }
                    // No content returned for delete, update, ...
                    else {
                        resolve(xhr.statusText);
                    }
                } else {
                    reject(new Error(FormatError(xhr)));
                }
            };
            xhr.onerror = function() {
                reject(new Error(FormatError(xhr)));
            };
        });

        var headers = [];

        if (IsOverlengthGet(method, url)) {
            var batch = new WebApiClient.Batch({
                requests: [new WebApiClient.BatchRequest({
                    method: method,
                    url: url,
                    payload: payload,
                    headers: parameters.headers
                })],
                async: true,
                isOverLengthGet: true
            });

            return WebApiClient.SendBatch(batch);
        }

        xhr.open(method, url, true);

        headers = MergeHeaders(headers, parameters.headers, DefaultHeaders);

        AppendHeaders(xhr, headers);

        // Bugfix for IE. If payload is undefined, IE would send "undefined" as request body
        if (payload) {
            // For batch requests, we just want to send a string body
            if (typeof(payload) === "string") {
                xhr.send(payload);
            } else {
                xhr.send(JSON.stringify(payload));
            }
        } else {
            xhr.send();
        }

        return promise;
    }

    function SendSync(method, url, payload, parameters) {
        var xhr = new XMLHttpRequest();

        if (WebApiClient.WithCredentials) {
            xhr.withCredentials = WebApiClient.WithCredentials;
        }

        var response;
        var headers = [];

        if (IsOverlengthGet(method, url)) {
            var batch = new WebApiClient.Batch({
                requests: [new WebApiClient.BatchRequest({
                    method: method,
                    url: url,
                    payload: payload,
                    headers: parameters.headers
                })],
                async: false,
                isOverLengthGet: true
            });

            return WebApiClient.SendBatch(batch);
        }

        xhr.open(method, url, false);

        headers = MergeHeaders(headers, parameters.headers, DefaultHeaders);

        AppendHeaders(xhr, headers);

        // Bugfix for IE. If payload is undefined, IE would send "undefined" as request body
        if (payload) {
            // For batch requests, we just want to send a string body
            if (typeof(payload) === "string") {
                xhr.send(payload);
            } else {
                xhr.send(JSON.stringify(payload));
            }
        } else {
            xhr.send();
        }

        if (xhr.readyState !== 4) {
            return;
        }

        if (xhr.status === 200) {
            response = ParseResponse(xhr);

            // If we received multiple responses, it was a custom batch. Just resolve all matches
            if (response instanceof WebApiClient.BatchResponse) {
                // If it was an overlength fetchXml, that was sent as batch automatically, we don't want it to behave as a batch
                if (parameters.isOverLengthGet) {
                    response = response.batchResponses[0].payload;
                } else {
                    return response;
                }
            }

            var nextLink = GetNextLink(response);
            var pagingCookie = GetPagingCookie(response);

            // Since 9.X paging cookie is always added to response, even in queryParams retrieves
            // In 9.X the morerecords flag can signal whether there are more records to be found
            // In 8.X the flag was not present and instead the pagingCookie was only set if more records were available
            var moreRecords = "@Microsoft.Dynamics.CRM.morerecords" in response ? response["@Microsoft.Dynamics.CRM.morerecords"] : true;

            response = MergeResults(parameters._previousResponse, response);

            // Results are paged, we don't have all results at this point
            if (moreRecords && nextLink && (WebApiClient.ReturnAllPages || parameters.returnAllPages)) {
                SetPreviousResponse(parameters, response);

                SendSync("GET", nextLink, null, parameters);
            } else if (parameters.fetchXml && moreRecords && pagingCookie && (WebApiClient.ReturnAllPages || parameters.returnAllPages)) {
                var nextPageFetch = SetCookie(pagingCookie, parameters);

                SetPreviousResponse(parameters, response);

                parameters.fetchXml = nextPageFetch;

                WebApiClient.Retrieve(parameters);
            }
        } else if (xhr.status === 201) {
            response = ParseResponse(xhr);
        } else if (xhr.status === 204) {
            if (method.toLowerCase() === "post") {
                response = xhr.getResponseHeader("OData-EntityId");
            }
            // No content returned for delete, update, ...
            else {
                response = xhr.statusText;
            }
        } else {
            throw new Error(FormatError(xhr));
        }

        return response;
    }

    function GetAsync(parameters) {
        if (typeof(parameters.async) !== "undefined") {
            return parameters.async;
        }

        return WebApiClient.Async;
    }

    function BuildAlternateKeyUrl(params) {
        if (!params || !params.alternateKey) {
            return "";
        }

        var url = "(";

        for (var i = 0; i < params.alternateKey.length; i++) {
            var key = params.alternateKey[i];
            var value = key.value;

            if (typeof(key.value) !== "number") {
                value = "'" + key.value + "'";
            }

            url += key.property + "=" + value;

            if (i + 1 === params.alternateKey.length) {
                url += ")";
            } else {
                url += ",";
            }
        }

        return url;
    }

    /**
     * @description Sends request using given parameters.
     * @method SendRequest
     * @param {String} method Method type of request to send, such as "GET"
     * @param {String} url Target URL for request.
     * @param {Object} [payload] Payload for request.
     * @param {Object} [parameters] - Parameters for sending the request
     * @param {Boolean} [parameters.async] - True for sending async, false for sync. Defaults to true.
     * @param {Array<key:string,value:string>} [parameters.headers] - Headers for appending to request
     * @memberof module:WebApiClient
     * @return {Promise<Object>|Object}
     */
    WebApiClient.SendRequest = function(method, url, payload, parameters) {
        var params = parameters || {};

        // Fallback for request headers array as fourth parameter
        if (Array.isArray(params)) {
            params = {
                headers: params
            };
        }

        if (WebApiClient.Token) {
            params.headers = params.headers || [];
            params.headers.push({ key: "Authorization", value: "Bearer " + WebApiClient.Token });
        }

        if (params.asBatch) {
            return new WebApiClient.BatchRequest({
                method: method,
                url: url,
                payload: payload,
                headers: params.headers
            });
        }

        var asynchronous = GetAsync(params);

        if (asynchronous) {
            return SendAsync(method, url, payload, params);
        } else {
            return SendSync(method, url, payload, params);
        }
    };

    /**
     * @description Applies configuration to WebApiClient.
     * @method Configure
     * @param {Object} configuration Object with keys named after WebApiClient Members, such as "Token"s
     * @memberof module:WebApiClient
     * @return {void}
     */
    WebApiClient.Configure = function(configuration) {
        for (var property in configuration) {
            if (!configuration.hasOwnProperty(property)) {
                continue;
            }

            WebApiClient[property] = configuration[property];
        }
    };

    /**
     * @description Gets the current base API url that is used.
     * @method GetApiUrl
     * @memberof module:WebApiClient
     * @return {String}
     */
    WebApiClient.GetApiUrl = function() {
        return GetClientUrl() + "/api/data/v" + WebApiClient.ApiVersion + "/";
    };

    /**
     * @description Creates a given record in CRM.
     * @method Create
     * @param {Object} parameters Parameters for creating record
     * @param {String} parameters.entityName Entity name of record that should be created
     * @param {String} [parameters.overriddenSetName] Plural name of entity, if not according to plural rules
     * @param {Object} parameters.entity Object containing record data
     * @param {Boolean} [parameters.async] True for sending asynchronous, false for synchronous. Defaults to true.
     * @param {Array<key:string,value:string>} [parameters.headers] Headers to attach to request
     * @memberof module:WebApiClient
     * @return {Promise<String>|Promise<object>|String|Object} - Returns Promise<Object> if return=representation header is set, otherwise Promise<String>. Just Object or String if sent synchronously.
     */
    WebApiClient.Create = function(parameters) {
        var params = parameters || {};

        if ((!params.entityName && !params.overriddenSetName) || !params.entity) {
            throw new Error("Entity name and entity object have to be passed!");
        }

        var url = WebApiClient.GetApiUrl() + WebApiClient.GetSetName(params.entityName, params.overriddenSetName);

        return WebApiClient.SendRequest("POST", url, params.entity, params);
    };

    /**
     * @description Retrieves records from CRM
     * @method Retrieve
     * @param {Object} parameters Parameters for retrieving records
     * @param {String} parameters.entityName Entity name of records that should be retrieved
     * @param {String} [parameters.overriddenSetName] Plural name of entity, if not according to plural rules
     * @param {String} [parameters.queryParams] Query Parameters to append to URL, such as ?$select=*
     * @param {String} [parameters.fetchXml] Fetch XML query
     * @param {String} [parameters.entityId] ID of entity to retrieve, will return single record
     * @param {Array<property:string,value:string>} [parameters.alternateKey] Alternate key array for retrieving single record
     * @param {Boolean} [parameters.async] True for sending asynchronous, false for synchronous. Defaults to true.
     * @param {Array<key:string,value:string>} [parameters.headers] Headers to attach to request
     * @memberof module:WebApiClient
     * @return {Promise<object>|Object} - Returns Promise<Object> if asyncj, just Object if sent synchronously.
     */
    WebApiClient.Retrieve = function(parameters) {
        var params = parameters || {};

        if (!params.entityName && !params.overriddenSetName) {
            throw new Error("Entity name has to be passed!");
        }

        var url = WebApiClient.GetApiUrl() + WebApiClient.GetSetName(params.entityName, params.overriddenSetName);

        if (params.entityId) {
            url += "(" + RemoveIdBrackets(params.entityId) + ")";
        } else if (params.fetchXml) {
            url += "?fetchXml=" + escape(params.fetchXml);
        } else if (params.alternateKey) {
            url += BuildAlternateKeyUrl(params);
        }

        if (params.queryParams) {
            url += params.queryParams;
        }

        return WebApiClient.SendRequest("GET", url, null, params);
    };

    /**
     * @description Updates a given record in CRM.
     * @method Update
     * @param {Object} parameters Parameters for updating record
     * @param {String} parameters.entityName Entity name of records that should be updated
     * @param {String} [parameters.overriddenSetName] Plural name of entity, if not according to plural rules
     * @param {String} [parameters.entityId] ID of entity to update
     * @param {Array<property:string,value:string>} [parameters.alternateKey] Alternate key array for updating record
     * @param {Boolean} [parameters.async] True for sending asynchronous, false for synchronous. Defaults to true.
     * @param {Array<key:string,value:string>} [parameters.headers] Headers to attach to request
     * @memberof module:WebApiClient
     * @return {Promise<String>|Promise<object>|String|Object} - Returns Promise<Object> if return=representation header is set, otherwise Promise<String>. Just Object or String if sent synchronously.
     */
    WebApiClient.Update = function(parameters) {
        var params = parameters || {};

        if (!params.entity) {
            throw new Error("Update object has to be passed!");
        }

        var url = GetRecordUrl(params);

        return WebApiClient.SendRequest("PATCH", url, params.entity, params);
    };

    /**
     * @description Deletes a given record in CRM.
     * @method Delete
     * @param {Object} parameters Parameters for deleting record
     * @param {String} parameters.entityName Entity name of records that should be deleted
     * @param {String} [parameters.overriddenSetName] Plural name of entity, if not according to plural rules
     * @param {String} [parameters.entityId] ID of entity to delete
     * @param {Array<property:string,value:string>} [parameters.alternateKey] Alternate key array for deleting record
     * @param {Boolean} [parameters.async] True for sending asynchronous, false for synchronous. Defaults to true.
     * @param {Array<key:string,value:string>} [parameters.headers] Headers to attach to request
     * @memberof module:WebApiClient
     * @return {Promise<String>|String} - Returns Promise<String> if async, just String if sent synchronously.
     */
    WebApiClient.Delete = function(parameters) {
        var params = parameters || {};
        var url = GetRecordUrl(params);

        if (params.queryParams) {
            url += params.queryParams;
        }

        return WebApiClient.SendRequest("DELETE", url, null, params);
    };

    /**
     * @description Associates given records in CRM.
     * @method Associate
     * @param {Object} parameters Parameters for associating records
     * @param {String} parameters.relationShip Name of relation ship to use for associating
     * @param {Object} parameters.source Source entity for disassociating
     * @param {String} [parameters.source.overriddenSetName] Plural name of entity, if not according to plural rules
     * @param {String} parameters.source.entityId ID of entity
     * @param {String} parameters.source.entityName Logical name of entity, such as "account"
     * @param {Object} parameters.target Target entity for disassociating
     * @param {String} [parameters.target.overriddenSetName] Plural name of entity, if not according to plural rules
     * @param {String} parameters.target.entityId ID of entity
     * @param {String} parameters.target.entityName Logical name of entity, such as "account"
     * @param {Boolean} [parameters.async] True for sending asynchronous, false for synchronous. Defaults to true.
     * @param {Array<key:string,value:string>} [parameters.headers] Headers to attach to request
     * @memberof module:WebApiClient
     * @return {Promise<String>|String} - Returns Promise<String> if async, just String if sent synchronously.
     */
    WebApiClient.Associate = function(parameters) {
        var params = parameters || {};

        if (!params.relationShip) {
            throw new Error("Relationship has to be passed!");
        }

        if (!params.source || !params.target) {
            throw new Error("Source and target have to be passed!");
        }

        var targetUrl = GetRecordUrl(params.target);
        var relationShip = "/" + params.relationShip + "/$ref";

        var url = targetUrl + relationShip;

        var payload = { "@odata.id": GetRecordUrl(params.source) };

        return WebApiClient.SendRequest("POST", url, payload, params);
    };

    /**
     * @description Disassociates given records in CRM.
     * @method Disassociate
     * @param {Object} parameters Parameters for disassociating records
     * @param {String} parameters.relationShip Name of relation ship to use for disassociating
     * @param {Object} parameters.source Source entity for disassociating
     * @param {String} [parameters.source.overriddenSetName] Plural name of entity, if not according to plural rules
     * @param {String} parameters.source.entityId ID of entity
     * @param {String} parameters.source.entityName Logical name of entity, such as "account"
     * @param {Object} parameters.target Target entity for disassociating
     * @param {String} [parameters.target.overriddenSetName] Plural name of entity, if not according to plural rules
     * @param {String} parameters.target.entityId ID of entity
     * @param {String} parameters.target.entityName Logical name of entity, such as "account"
     * @param {Boolean} [parameters.async] True for sending asynchronous, false for synchronous. Defaults to true.
     * @param {Array<key:string,value:string>} [parameters.headers] Headers to attach to request
     * @memberof module:WebApiClient
     * @return {Promise<String>|String} - Returns Promise<String> if async, just String if sent synchronously.
     */
    WebApiClient.Disassociate = function(parameters) {
        var params = parameters || {};

        if (!params.relationShip) {
            throw new Error("Relationship has to be passed!");
        }

        if (!params.source || !params.target) {
            throw new Error("Source and target have to be passed!");
        }

        if (!params.source.entityId) {
            throw new Error("Source needs entityId set!");
        }

        var targetUrl = GetRecordUrl(params.target);
        var relationShip = "/" + params.relationShip + "(" + RemoveIdBrackets(params.source.entityId) + ")/$ref";

        var url = targetUrl + relationShip;

        return WebApiClient.SendRequest("DELETE", url, null, params);
    };

    /**
     * @description Executes the given request in CRM.
     * @method Execute
     * @param {Object} request Request to send, must be in prototype chain of WebApiClient.Requests.Request.
     * @param {Boolean} [request.async] True for sending asynchronous, false for synchronous. Defaults to true.
     * @param {Array<key:string,value:string>} [request.headers] Headers to attach to request
     * @memberof module:WebApiClient
     * @return {Promise<Object>|Object} - Returns Promise<Object> if async, just Object if sent synchronously.
     */
    WebApiClient.Execute = function(request) {
        if (!request) {
            throw new Error("You need to pass a request!");
        }

        if (!(request instanceof WebApiClient.Requests.Request)) {
            throw new Error("Request for execution must be in prototype chain of WebApiClient.Request");
        }

        return WebApiClient.SendRequest(request.method, request.buildUrl(), request.payload, request);
    };

    /**
     * @description Sends the given batch to CRM.
     * @method SendBatch
     * @param {Object} batch Batch to send to CRM
     * @param {Boolean} [batch.async] True for sending asynchronous, false for synchronous. Defaults to true.
     * @param {Array<key:string,value:string>} [batch.headers] Headers to attach to request
     * @memberof module:WebApiClient
     * @return {Promise<Object>|Object} - Returns Promise<Object> if async, just Object if sent synchronously.
     */
    WebApiClient.SendBatch = function(batch) {
        if (!batch) {
            throw new Error("You need to pass a batch!");
        }

        if (!(batch instanceof WebApiClient.Batch)) {
            throw new Error("Batch for execution must be a WebApiClient.Batch object");
        }

        var url = WebApiClient.GetApiUrl() + "$batch";

        batch.headers = batch.headers || [];
        batch.headers.push({ key: "Content-Type", value: "multipart/mixed;boundary=" + batch.name });

        var payload = batch.buildPayload();

        return WebApiClient.SendRequest("POST", url, payload, batch);
    };

    /**
     * @description Expands all odata.nextLink (deferred) properties for an array of records.
     * @method Expand
     * @param {Object} parameters Configuration for expanding
     * @param {Array<Object>} parameters.records Array of records to expand
     * @param {Boolean} [parameters.async] True for sending asynchronous, false for synchronous. Defaults to true.
     * @param {Array<key:string,value:string>} [parameters.headers] Headers to attach to request
     * @memberof module:WebApiClient
     * @return {Promise<Object>|Object} - Returns Promise<Object> if async, just Object if sent synchronously.
     */
    WebApiClient.Expand = function(parameters) {
        /// <summary>Expands all odata.nextLink / deferred properties for an array of records</summary>
        /// <param name="parameters" type="Object">Object that contains 'records' array or object. Optional 'headers'.</param>
        /// <returns>Promise for sent request or result if sync.</returns>
        var params = parameters || {};
        var records = params.records;

        var requests = [];
        var asynchronous = GetAsync(parameters);

        for (var i = 0; i < records.length; i++) {
            var record = records[i];

            for (var attribute in record) {
                if (!record.hasOwnProperty(attribute)) {
                    continue;
                }

                var name = attribute.replace("@odata.nextLink", "");

                // If nothing changed, this was not a deferred attribute
                if (!name || name === attribute) {
                    continue;
                }

                record[name] = WebApiClient.SendRequest("GET", record[attribute], null, params);

                // Delete @odata.nextLink property
                delete record[attribute];
            }

            if (asynchronous) {
                requests.push(Promise.props(record));
            }
        }

        if (asynchronous) {
            return Promise.all(requests);
        } else {
            return records;
        }
    };

    module.exports = WebApiClient;
}());
},{"bluebird":1}],8:[function(require,module,exports){
/**
 * @description This is the collection of all preimplemented Web API actions and functions
 * @module Requests
 */
(function (undefined) {
    "use strict";

    var WebApiClient = require("./WebApiClient.Core.js");

    function AppendRequestParams(url, params) {
        url += "(";
        var paramCount = 1;

        for (var parameter in params) {
            if (!params.hasOwnProperty(parameter)) {
                continue;
            }

            if (paramCount !== 1) {
                url += ",";
            }

            url += parameter + "=@p" + paramCount++;
        }

        url += ")";

        return url;
    }

    function AppendParamValues (url, params) {
        var paramCount = 1;

        for (var parameter in params) {
            if (!params.hasOwnProperty(parameter)) {
                continue;
            }

            if (paramCount === 1) {
                url += "?@p1=";
            }
            else {
                url += "&@p" + paramCount + "=";
            }
            paramCount++;

            url += params[parameter];
        }

        return url;
    }

    var Requests = {};

    /**
     * @description Base class for all actions and functions.
     * @constructor
     * @param {Object} parameters
     * @param {String} parameters.method The HTTP method of the request, such as GET / POST / ...
     * @param {String} parameters.name The name of the request
     * @param {bool} [parameters.bound] Determines if request is bound, i.e. always executed regarding a distinct record, or not. Defaults to false
     * @param {String} [parameters.entityName] Name of the request if it is bound to an entity
     * @param {String} [parameters.entityId] Record ID if bound to an entity
     * @param {Object} [parameters.payload] Message body for this request
     * @param {Array<{key:string, value:string}>} [parameters.headers] Headers to append to this request
     * @param {Object} [parameters.urlParams] Object with key-value pairs that will be appended to the URL of a GET request. Used for calling functions with parameters
     * @param {bool} [parameters.async] Determines if request is sent async or not. Defaults to async
     * @memberof module:Requests
     * @this {Request}
     * @alias WebApiClient.Requests.Request
     */
    Requests.Request = function () {
        this.method = "";
        this.name = "";
        this.bound = false;
        this.entityName = "";
        this.entityId = "";
        this.payload = null;
        this.headers = null;
        this.urlParams = null;
        this.async = true;
    };

    /**
     * @description Applies properties of parameters object to the current request and returns it
     * @param {Object} parameters Pass object with properties that will be applied to current request
     * @return {Request}
     * @memberof module:Requests
     * @this {Request}
     */
    Requests.Request.prototype.with = function (parameters) {
        var request = Object.create(this);

        for (var parameter in parameters) {
            if (!parameters.hasOwnProperty(parameter)) {
                continue;
            }

            request[parameter] = parameters[parameter];
        }

        return request;
    };

    /**
     * @description Builds URL for sending a HTTP request based on the information provided by the request
     * @return {String}
     * @this {Request}
     */
    Requests.Request.prototype.buildUrl = function() {
        var baseUrl = WebApiClient.GetApiUrl();
        var url = baseUrl;

        if (this.bound && this.entityId) {
            var entityId = this.entityId.replace("{", "").replace("}", "");
            url += WebApiClient.GetSetName(this.entityName) + "(" + entityId + ")/";
        }

        if (this.bound && this.name.indexOf("Microsoft.Dynamics.CRM.") === -1) {
            url += "Microsoft.Dynamics.CRM.";
        }
        url += this.name;

        if (this.urlParams) {
            url = AppendRequestParams(url, this.urlParams);
            url = AppendParamValues(url, this.urlParams);
        } else {
            url += "()";
        }

        return url;
    };

    // Functions

    /**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt718083.aspx
     * @description Calculates the value of a rollup attribute.
     * @alias CalculateRollupFieldRequest
     */
    Requests.CalculateRollupFieldRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "GET",
            writeable: true
        },
        name: {
            value: "CalculateRollupField",
            writeable: true
        }
    });

    /**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt593054.aspx
     * @description Calculates the total time, in minutes, that you used while you worked on an incident (case).
     * @alias CalculateTotalTimeIncidentRequest
     */
    Requests.CalculateTotalTimeIncidentRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "GET",
            writeable: true
        },
        name: {
            value: "CalculateTotalTimeIncident",
            writeable: true
        },
        bound: {
            value: true,
            writeable: true
        },
        entityName: {
            value: "incident",
            writeable: true
        }
    });

    /**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt683529.aspx
     * @description Check whether the incoming email message is relevant to the Microsoft Dynamics 365 system.
     * @alias CheckIncomingEmailRequest
     */
    Requests.CheckIncomingEmailRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "GET",
            writeable: true
        },
        name: {
            value: "CheckIncomingEmail",
            writeable: true
        }
    });

    /**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt593013.aspx
     * @description Contains the data that is needed to check whether the incoming email message should be promoted to the Microsoft Dynamics 365 system.
     * @alias CheckPromoteEmailRequest
     */
    Requests.CheckPromoteEmailRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "GET",
            writeable: true
        },
        name: {
            value: "CheckPromoteEmail",
            writeable: true
        }
    });

    /**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607800.aspx
     * @description Downloads a report definition.
     * @alias DownloadReportDefinitionRequest
     */
    Requests.DownloadReportDefinitionRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "GET",
            writeable: true
        },
        name: {
            value: "DownloadReportDefinition",
            writeable: true
        },
        bound: {
            value: true,
            writeable: true
        },
        entityName: {
            value: "report",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607824.aspx
	 * @description Converts the calendar rules to an array of available time blocks for the specified period.
     * @alias ExpandCalendarRequest
     */
    Requests.ExpandCalendarRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "GET",
            writeable: true
        },
        name: {
            value: "ExpandCalendar",
            writeable: true
        },
        bound: {
            value: true,
            writeable: true
        },
        entityName: {
            value: "calendar",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt593047.aspx
	 * @description Exports localizable fields values to a compressed file.
     * @alias ExportFieldTranslationRequest
     */
    Requests.ExportFieldTranslationRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "GET",
            writeable: true
        },
        name: {
            value: "ExportFieldTranslation",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt491169.aspx
	 * @description Converts a query in FetchXML to a QueryExpression.
     * @alias FetchXmlToQueryExpressionRequest
     */
    Requests.FetchXmlToQueryExpressionRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "GET",
            writeable: true
        },
        name: {
            value: "FetchXmlToQueryExpression",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt683530.aspx
	 * @description Finds a parent resource group (scheduling group) for the specified resource groups (scheduling groups).
     * @alias FindParentResourceGroupRequest
     */
    Requests.FindParentResourceGroupRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "GET",
            writeable: true
        },
        name: {
            value: "FindParentResourceGroup",
            writeable: true
        },
        bound: {
            value: true,
            writeable: true
        },
        entityName: {
            value: "resourcegroup",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt593004.aspx
	 * @description Retrieves all the time zone definitions for the specified locale and to return only the display name attribute.
     * @alias GetAllTimeZonesWithDisplayNameRequest
     */
    Requests.GetAllTimeZonesWithDisplayNameRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "GET",
            writeable: true
        },
        name: {
            value: "GetAllTimeZonesWithDisplayName",
            writeable: true
        },
        bound: {
            value: true,
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt608119.aspx
	 * @description Retrieves the default price level (price list) for the current user based on the user’s territory relationship with the price level.
     * @alias GetDefaultPriceLevelRequest
     */
    Requests.GetDefaultPriceLevelRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "GET",
            writeable: true
        },
        name: {
            value: "GetDefaultPriceLevel",
            writeable: true
        },
        bound: {
            value: true,
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt622422.aspx
	 * @description Retrieves distinct values from the parse table for a column in the source file that contains list values.
     * @alias GetDistinctValuesImportFileRequest
     */
    Requests.GetDistinctValuesImportFileRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "GET",
            writeable: true
        },
        name: {
            value: "GetDistinctValuesImportFile",
            writeable: true
        },
        bound: {
            value: true,
            writeable: true
        },
        entityName: {
            value: "importfile",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt622408.aspx
	 * @description Retrieves the source-file column headings; or retrieve the system-generated column headings if the source file does not contain column headings.
     * @alias GetHeaderColumnsImportFileRequest
     */
    Requests.GetHeaderColumnsImportFileRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "GET",
            writeable: true
        },
        name: {
            value: "GetHeaderColumnsImportFile",
            writeable: true
        },
        bound: {
            value: true,
            writeable: true
        },
        entityName: {
            value: "importfile",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt683531.aspx
	 * @description Gets the quantity decimal value of a product for the specified entity in the target.
     * @alias GetQuantityDecimalRequest
     */
    Requests.GetQuantityDecimalRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "GET",
            writeable: true
        },
        name: {
            value: "GetQuantityDecimal",
            writeable: true
        },
        bound: {
            value: true,
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607697.aspx
	 * @description Retrieves the history limit for a report.
     * @alias GetReportHistoryLimitRequest
     */
    Requests.GetReportHistoryLimitRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "GET",
            writeable: true
        },
        name: {
            value: "GetReportHistoryLimit",
            writeable: true
        },
        bound: {
            value: true,
            writeable: true
        },
        entityName: {
            value: "report",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607644.aspx
	 * @description Retrieves the time zone code for the specified localized time zone name.
     * @alias GetTimeZoneCodeByLocalizedNameRequest
     */
    Requests.GetTimeZoneCodeByLocalizedNameRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "GET",
            writeable: true
        },
        name: {
            value: "GetTimeZoneCodeByLocalizedName",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt608131.aspx
	 * @description Retrieves a list of all the entities that can participate in a Many-to-Many entity relationship.
     * @alias GetValidManyToManyRequest
     */
    Requests.GetValidManyToManyRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "GET",
            writeable: true
        },
        name: {
            value: "GetValidManyToMany",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt608031.aspx
	 * @description Retrieves a list of entity logical names that are valid as the primary entity (one) from the specified entity in a one-to-many relationship.
     * @alias GetValidReferencedEntitiesRequest
     */
    Requests.GetValidReferencedEntitiesRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "GET",
            writeable: true
        },
        name: {
            value: "GetValidReferencedEntities",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt592992.aspx
	 * @description Retrieves the set of entities that are valid as the related entity (many) to the specified entity in a one-to-many relationship.
     * @alias GetValidReferencingEntitiesRequest
     */
    Requests.GetValidReferencingEntitiesRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "GET",
            writeable: true
        },
        name: {
            value: "GetValidReferencingEntities",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt683532.aspx
	 * @description Increments the per day view count of a knowledge article record.
     * @alias IncrementKnowledgeArticleViewCountRequest
     */
    Requests.IncrementKnowledgeArticleViewCountRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "GET",
            writeable: true
        },
        name: {
            value: "IncrementKnowledgeArticleViewCount",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt683533.aspx
	 * @description Initializes a new record from an existing record.
     * @alias InitializeFromRequest
     */
    Requests.InitializeFromRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "GET",
            writeable: true
        },
        name: {
            value: "InitializeFrom",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607606.aspx
	 * @description Determines whether a solution component is customizable.
     * @alias IsComponentCustomizableRequest
     */
    Requests.IsComponentCustomizableRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "GET",
            writeable: true
        },
        name: {
            value: "IsComponentCustomizable",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607678.aspx
	 * @description Determines whether data encryption is currently running (active or inactive).
     * @alias IsDataEncryptionActiveRequest
     */
    Requests.IsDataEncryptionActiveRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "GET",
            writeable: true
        },
        name: {
            value: "IsDataEncryptionActive",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt683534.aspx
	 * @description Validates the state transition.
     * @alias IsValidStateTransitionRequest
     */
    Requests.IsValidStateTransitionRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "GET",
            writeable: true
        },
        name: {
            value: "IsValidStateTransition",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt683535.aspx
	 * @description Searches multiple resources for available time block that matches the specified parameters.
     * @alias QueryMultipleSchedulesRequest
     */
    Requests.QueryMultipleSchedulesRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "GET",
            writeable: true
        },
        name: {
            value: "QueryMultipleSchedules",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt608100.aspx
	 * @description Searches the specified resource for an available time block that matches the specified parameters.
     * @alias QueryScheduleRequest
     */
    Requests.QueryScheduleRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "GET",
            writeable: true
        },
        name: {
            value: "QuerySchedule",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt622429.aspx
	 * @description Retrieves the absolute URL and the site collection URL for a SharePoint location record in Microsoft Dynamics 365.
     * @alias RetrieveAbsoluteAndSiteCollectionUrlRequest
     */
    Requests.RetrieveAbsoluteAndSiteCollectionUrlRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "GET",
            writeable: true
        },
        name: {
            value: "RetrieveAbsoluteAndSiteCollectionUrl",
            writeable: true
        },
        bound: {
            value: true,
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt491171.aspx
	 * @description TODO: RetrieveActivePath Function Description (No Joke, MS description)
     * @alias RetrieveActivePathRequest
     */
    Requests.RetrieveActivePathRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "GET",
            writeable: true
        },
        name: {
            value: "RetrieveActivePath",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607682.aspx
	 * @description Retrieves the collection of users that report to the specified system user (user).
     * @alias RetrieveAllChildUsersSystemUserRequest
     */
    Requests.RetrieveAllChildUsersSystemUserRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "GET",
            writeable: true
        },
        name: {
            value: "RetrieveAllChildUsersSystemUser",
            writeable: true
        },
        bound: {
            value: true,
            writeable: true
        },
        entityName: {
            value: "systemuser",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt683536.aspx
	 * @description Retrieves metadata information about all the entities.
     * @alias RetrieveAllEntitiesRequest
     */
    Requests.RetrieveAllEntitiesRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "GET",
            writeable: true
        },
        name: {
            value: "RetrieveAllEntities",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607503.aspx
	 * @description Retrieve the data that defines the content and behavior of the application ribbon.
     * @alias RetrieveApplicationRibbonRequest
     */
    Requests.RetrieveApplicationRibbonRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "GET",
            writeable: true
        },
        name: {
            value: "RetrieveApplicationRibbon",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt593106.aspx
	 * @description Retrieves the list of database partitions that are used to store audited history data.
     * @alias RetrieveAuditPartitionListRequest
     */
    Requests.RetrieveAuditPartitionListRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "GET",
            writeable: true
        },
        name: {
            value: "RetrieveAuditPartitionList",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607635.aspx
	 * @description Retrieves the list of language packs that are installed and enabled on the server.
     * @alias RetrieveAvailableLanguagesRequest
     */
    Requests.RetrieveAvailableLanguagesRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "GET",
            writeable: true
        },
        name: {
            value: "RetrieveAvailableLanguages",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607489.aspx
	 * @description Retrieves all business units from the business unit hierarchy.
     * @alias RetrieveBusinessHierarchyBusinessUnitRequest
     */
    Requests.RetrieveBusinessHierarchyBusinessUnitRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "GET",
            writeable: true
        },
        name: {
            value: "RetrieveBusinessHierarchyBusinessUnit",
            writeable: true
        },
        bound: {
            value: true,
            writeable: true
        },
        entityName: {
            value: "businessunit",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607979.aspx
	 * @description Retrieves all resources that are related to the specified resource group
     * @alias RetrieveByGroupResourceRequest
     */
    Requests.RetrieveByGroupResourceRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "GET",
            writeable: true
        },
        name: {
            value: "RetrieveByGroupResource",
            writeable: true
        },
        bound: {
            value: true,
            writeable: true
        },
        entityName: {
            value: "resourcegroup",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607881.aspx
	 * @description Retrieves the resource groups (scheduling groups) that contain the specified resource.
     * @alias RetrieveByResourceResourceGroupRequest
     */
    Requests.RetrieveByResourceResourceGroupRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "GET",
            writeable: true
        },
        name: {
            value: "RetrieveByResourceResourceGroup",
            writeable: true
        },
        bound: {
            value: true,
            writeable: true
        },
        entityName: {
            value: "resource",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt491172.aspx
	 * @description Retrieve the collection of services that are related to the specified set of resources.
     * @alias RetrieveByResourcesServiceRequest
     */
    Requests.RetrieveByResourcesServiceRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "GET",
            writeable: true
        },
        name: {
            value: "RetrieveByResourcesService",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607560.aspx
	 * @description Retrieves the top-ten articles about a specified product from the knowledge base of articles for the organization
     * @alias RetrieveByTopIncidentProductKbArticleRequest
     */
    Requests.RetrieveByTopIncidentProductKbArticleRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "GET",
            writeable: true
        },
        name: {
            value: "RetrieveByTopIncidentProductKbArticle",
            writeable: true
        },
        bound: {
            value: true,
            writeable: true
        },
        entityName: {
            value: "product",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt608058.aspx
	 * @description Retrieves the top-ten articles about a specified subject from the knowledge base of articles for your organization.
     * @alias RetrieveByTopIncidentSubjectKbArticleRequest
     */
    Requests.RetrieveByTopIncidentSubjectKbArticleRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "GET",
            writeable: true
        },
        name: {
            value: "RetrieveByTopIncidentSubjectKbArticle",
            writeable: true
        },
        bound: {
            value: true,
            writeable: true
        },
        entityName: {
            value: "subject",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt608120.aspx
	 * @description Retrieve information about the current organization.
     * @alias RetrieveCurrentOrganizationRequest
     */
    Requests.RetrieveCurrentOrganizationRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "GET",
            writeable: true
        },
        name: {
            value: "RetrieveCurrentOrganization",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt608110.aspx
	 * @description Retrieves the data encryption key value.
     * @alias RetrieveDataEncryptionKeyRequest
     */
    Requests.RetrieveDataEncryptionKeyRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "GET",
            writeable: true
        },
        name: {
            value: "RetrieveDataEncryptionKey",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607985.aspx
	 * @description Retrieves a collection of dependency records that describe any solution components that would prevent a solution component from being deleted.
     * @alias RetrieveDependenciesForDeleteRequest
     */
    Requests.RetrieveDependenciesForDeleteRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "GET",
            writeable: true
        },
        name: {
            value: "RetrieveDependenciesForDelete",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607791.aspx
	 * @description Retrieves a list of the solution component dependencies that can prevent you from uninstalling a managed solution.
     * @alias RetrieveDependenciesForUninstallRequest
     */
    Requests.RetrieveDependenciesForUninstallRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "GET",
            writeable: true
        },
        name: {
            value: "RetrieveDependenciesForUninstall",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt593045.aspx
	 * @description Retrieves a list dependencies for solution components that directly depend on a solution component.
     * @alias RetrieveDependentComponentsRequest
     */
    Requests.RetrieveDependentComponentsRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "GET",
            writeable: true
        },
        name: {
            value: "RetrieveDependentComponents",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt593056.aspx
	 * @description Retrieves the type of license for a deployment of Microsoft Dynamics 365.
     * @alias RetrieveDeploymentLicenseTypeRequest
     */
    Requests.RetrieveDeploymentLicenseTypeRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "GET",
            writeable: true
        },
        name: {
            value: "RetrieveDeploymentLicenseType",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607656.aspx
	 * @description Retrieves a list of language packs that are installed on the server that have been disabled.
     * @alias RetrieveDeprovisionedLanguagesRequest
     */
    Requests.RetrieveDeprovisionedLanguagesRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "GET",
            writeable: true
        },
        name: {
            value: "RetrieveDeprovisionedLanguages",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt683537.aspx
	 * @description Detects and retrieves duplicates for a specified record.
     * @alias RetrieveDuplicatesRequest
     */
    Requests.RetrieveDuplicatesRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "GET",
            writeable: true
        },
        name: {
            value: "RetrieveDuplicates",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt491170.aspx
	 * @description Retrieve the changes for an entity.
     * @alias RetrieveEntityChangesRequest
     */
    Requests.RetrieveEntityChangesRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "GET",
            writeable: true
        },
        name: {
            value: "RetrieveEntityChanges",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607698.aspx
	 * @description Retrieves ribbon definitions for an entity.
     * @alias RetrieveEntityRibbonRequest
     */
    Requests.RetrieveEntityRibbonRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "GET",
            writeable: true
        },
        name: {
            value: "RetrieveEntityRibbon",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt491173.aspx
	 * @description Retrieves the appointments for the current user for a specific date range from the exchange web service.
     * @alias RetrieveExchangeAppointmentsRequest
     */
    Requests.RetrieveExchangeAppointmentsRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "GET",
            writeable: true
        },
        name: {
            value: "RetrieveExchangeAppointments",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607795.aspx
	 * @description Retrieves the exchange rate.
     * @alias RetrieveExchangeRateRequest
     */
    Requests.RetrieveExchangeRateRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "GET",
            writeable: true
        },
        name: {
            value: "RetrieveExchangeRate",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt491174.aspx
	 * @description Retrieves the entity forms that are available for a specified user.
     * @alias RetrieveFilteredFormsRequest
     */
    Requests.RetrieveFilteredFormsRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "GET",
            writeable: true
        },
        name: {
            value: "RetrieveFilteredForms",
            writeable: true
        },
        bound: {
            value: true,
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607487.aspx
	 * @description Retrieves the formatted results from an import job.
     * @alias RetrieveFormattedImportJobResultsRequest
     */
    Requests.RetrieveFormattedImportJobResultsRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "GET",
            writeable: true
        },
        name: {
            value: "RetrieveFormattedImportJobResults",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607696.aspx
	 * @description Retrieves the list of language packs that are installed on the server.
     * @alias RetrieveInstalledLanguagePacksRequest
     */
    Requests.RetrieveInstalledLanguagePacksRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "GET",
            writeable: true
        },
        name: {
            value: "RetrieveInstalledLanguagePacks",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt608102.aspx
	 * @description Retrieves the version of an installed language pack.
     * @alias RetrieveInstalledLanguagePackVersionRequest
     */
    Requests.RetrieveInstalledLanguagePackVersionRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "GET",
            writeable: true
        },
        name: {
            value: "RetrieveInstalledLanguagePackVersion",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607844.aspx
	 * @description Retrieves the number of used and available licenses for a deployment of Microsoft Dynamics 365.
     * @alias RetrieveLicenseInfoRequest
     */
    Requests.RetrieveLicenseInfoRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "GET",
            writeable: true
        },
        name: {
            value: "RetrieveLicenseInfo",
            writeable: true
        }
    });

    /**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt683538.aspx
     * @description Retrieves localized labels for a limited set of entity attributes.
     * @alias RetrieveLocLabelsRequest
     */
    Requests.RetrieveLocLabelsRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "GET",
            writeable: true
        },
        name: {
            value: "RetrieveLocLabels",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt592988.aspx
	 * @description Retrieves folder-level tracking rules for a mailbox.
     * @alias RetrieveMailboxTrackingFoldersRequest
     */
    Requests.RetrieveMailboxTrackingFoldersRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "GET",
            writeable: true
        },
        name: {
            value: "RetrieveMailboxTrackingFolders",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt622412.aspx
	 * @description Retrieves the members of a bulk operation.
     * @alias RetrieveMembersBulkOperationRequest
     */
    Requests.RetrieveMembersBulkOperationRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "GET",
            writeable: true
        },
        name: {
            value: "RetrieveMembersBulkOperation",
            writeable: true
        },
        bound: {
            value: true,
            writeable: true
        },
        entityName: {
            value: "bulkoperation",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607580.aspx
	 * @description Retrieves a list of missing components in the target organization.
     * @alias RetrieveMissingComponentsRequest
     */
    Requests.RetrieveMissingComponentsRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "GET",
            writeable: true
        },
        name: {
            value: "RetrieveMissingComponents",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607972.aspx
	 * @description Retrieves any required solution components that are not included in the solution.
     * @alias RetrieveMissingDependenciesRequest
     */
    Requests.RetrieveMissingDependenciesRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "GET",
            writeable: true
        },
        name: {
            value: "RetrieveMissingDependencies",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607527.aspx
	 * @description Retrieves the resources that are used by an organization.
     * @alias RetrieveOrganizationResourcesRequest
     */
    Requests.RetrieveOrganizationResourcesRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "GET",
            writeable: true
        },
        name: {
            value: "RetrieveOrganizationResources",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607818.aspx
	 * @description Retrieves the collection of the parent resource groups of the specified resource group (scheduling group).
     * @alias RetrieveParentGroupsResourceGroupRequest
     */
    Requests.RetrieveParentGroupsResourceGroupRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "GET",
            writeable: true
        },
        name: {
            value: "RetrieveParentGroupsResourceGroup",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607594.aspx
	 * @description Retrieves the data from the parse table.
     * @alias RetrieveParsedDataImportFileRequest
     */
    Requests.RetrieveParsedDataImportFileRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "GET",
            writeable: true
        },
        name: {
            value: "RetrieveParsedDataImportFile",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607613.aspx
	 * @description Retrieves pages of posts, including comments for each post, for all records that the calling user is following.
     * @alias RetrievePersonalWallRequest
     */
    Requests.RetrievePersonalWallRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "GET",
            writeable: true
        },
        name: {
            value: "RetrievePersonalWall",
            writeable: true
        },
        bound: {
            value: true,
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt683539.aspx
	 * @description Retrieves the access rights of the specified security principal (team or user) to the specified record.
     * @alias RetrievePrincipalAccessRequest
     */
    Requests.RetrievePrincipalAccessRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "GET",
            writeable: true
        },
        name: {
            value: "RetrievePrincipalAccess",
            writeable: true
        },
        bound: {
            value: true,
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607755.aspx
	 * @description Retrieves all the secured attribute privileges a user or team has through direct or indirect (through team membership) associations with the FieldSecurityProfile entity.
     * @alias RetrievePrincipalAttributePrivilegesRequest
     */
    Requests.RetrievePrincipalAttributePrivilegesRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "GET",
            writeable: true
        },
        name: {
            value: "RetrievePrincipalAttributePrivileges",
            writeable: true
        },
        bound: {
            value: true,
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt593098.aspx
	 * @description For internal use only.
     * @alias RetrievePrincipalSyncAttributeMappingsRequest
     */
    Requests.RetrievePrincipalSyncAttributeMappingsRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "GET",
            writeable: true
        },
        name: {
            value: "RetrievePrincipalSyncAttributeMappings",
            writeable: true
        },
        bound: {
            value: true,
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt622426.aspx
	 * @description Retrieves the set of privileges defined in the system.
     * @alias RetrievePrivilegeSetRequest
     */
    Requests.RetrievePrivilegeSetRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "GET",
            writeable: true
        },
        name: {
            value: "RetrievePrivilegeSet",
            writeable: true
        },
        bound: {
            value: true,
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt491175.aspx
	 * @description TODO: RetrieveProcessInstances Function Description (By MS)
     * @alias RetrieveProcessInstancesRequest
     */
    Requests.RetrieveProcessInstancesRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "GET",
            writeable: true
        },
        name: {
            value: "RetrieveProcessInstances",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607701.aspx
	 * @description Retrieve all the property instances (dynamic property instances) for a product added to an opportunity, quote, order, or invoice.
     * @alias RetrieveProductPropertiesRequest
     */
    Requests.RetrieveProductPropertiesRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "GET",
            writeable: true
        },
        name: {
            value: "RetrieveProductProperties",
            writeable: true
        },
        bound: {
            value: true,
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt593074.aspx
	 * @description Retrieves the version of a provisioned language pack.
     * @alias RetrieveProvisionedLanguagePackVersionRequest
     */
    Requests.RetrieveProvisionedLanguagePackVersionRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "GET",
            writeable: true
        },
        name: {
            value: "RetrieveProvisionedLanguagePackVersion",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607900.aspx
	 * @description Retrieves the list of provisioned languages.
     * @alias RetrieveProvisionedLanguagesRequest
     */
    Requests.RetrieveProvisionedLanguagesRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "GET",
            writeable: true
        },
        name: {
            value: "RetrieveProvisionedLanguages",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt683540.aspx
	 * @description Retrieves pages of posts, including comments for each post, for a specified record.
     * @alias RetrieveRecordWallRequest
     */
    Requests.RetrieveRecordWallRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "GET",
            writeable: true
        },
        name: {
            value: "RetrieveRecordWall",
            writeable: true
        },
        bound: {
            value: true,
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607927.aspx
	 * @description Retrieves a collection of solution components that are required for a solution component.
     * @alias RetrieveRequiredComponentsRequest
     */
    Requests.RetrieveRequiredComponentsRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "GET",
            writeable: true
        },
        name: {
            value: "RetrieveRequiredComponents",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607997.aspx
	 * @description Retrieves the privileges that are assigned to the specified role.
     * @alias RetrieveRolePrivilegesRoleRequest
     */
    Requests.RetrieveRolePrivilegesRoleRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "GET",
            writeable: true
        },
        name: {
            value: "RetrieveRolePrivilegesRole",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607604.aspx
	 * @description Retrieves the collection of child resource groups from the specified resource group.
     * @alias RetrieveSubGroupsResourceGroupRequest
     */
    Requests.RetrieveSubGroupsResourceGroupRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "GET",
            writeable: true
        },
        name: {
            value: "RetrieveSubGroupsResourceGroup",
            writeable: true
        },
        bound: {
            value: true,
            writeable: true
        },
        entityName: {
            value: "resourcegroup",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt608036.aspx
	 * @description Retrieves the privileges for a team.
     * @alias RetrieveTeamPrivilegesRequest
     */
    Requests.RetrieveTeamPrivilegesRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "GET",
            writeable: true
        },
        name: {
            value: "RetrieveTeamPrivileges",
            writeable: true
        },
        bound: {
            value: true,
            writeable: true
        },
        entityName: {
            value: "team",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607518.aspx
	 * @description Retrieves a time stamp for the metadata.
     * @alias RetrieveTimestampRequest
     */
    Requests.RetrieveTimestampRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "GET",
            writeable: true
        },
        name: {
            value: "RetrieveTimestamp",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt683541.aspx
	 * @description Retrieves a collection of unpublished organization-owned records that satisfy the specified query criteria.
     * @alias RetrieveUnpublishedMultipleRequest
     */
    Requests.RetrieveUnpublishedMultipleRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "GET",
            writeable: true
        },
        name: {
            value: "RetrieveUnpublishedMultiple",
            writeable: true
        },
        bound: {
            value: true,
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607996.aspx
	 * @description Retrieves the privileges a system user (user) has through his or her roles in the specified business unit.
     * @alias RetrieveUserPrivilegesRequest
     */
    Requests.RetrieveUserPrivilegesRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "GET",
            writeable: true
        },
        name: {
            value: "RetrieveUserPrivileges",
            writeable: true
        },
        bound: {
            value: true,
            writeable: true
        },
        entityName: {
            value: "systemuser",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607579.aspx
	 * @description Retrieves all private queues of a specified user and optionally all public queues.
     * @alias RetrieveUserQueuesRequest
     */
    Requests.RetrieveUserQueuesRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "GET",
            writeable: true
        },
        name: {
            value: "RetrieveUserQueues",
            writeable: true
        },
        bound: {
            value: true,
            writeable: true
        },
        entityName: {
            value: "systemuser",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt593041.aspx
	 * @description Retrieves the version number of the Microsoft Dynamics 365 Server.
     * @alias RetrieveVersionRequest
     */
    Requests.RetrieveVersionRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "GET",
            writeable: true
        },
        name: {
            value: "RetrieveVersion",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt491176.aspx
	 * @description Retrieves all the entity records that are related to the specified record.
     * @alias RollupRequest
     */
    Requests.RollupRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "GET",
            writeable: true
        },
        name: {
            value: "Rollup",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt608029.aspx
	 * @description Searches for available time slots that fulfill the specified appointment request.
     * @alias SearchRequest
     */
    Requests.SearchRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "GET",
            writeable: true
        },
        name: {
            value: "Search",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt683542.aspx
	 * @description Searches for knowledge base articles that contain the specified body text.
     * @alias SearchByBodyKbArticleRequest
     */
    Requests.SearchByBodyKbArticleRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "GET",
            writeable: true
        },
        name: {
            value: "SearchByBodyKbArticle",
            writeable: true
        },
        bound: {
            value: true,
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt683543.aspx
	 * @description Searches for knowledge base articles that contain the specified keywords.
     * @alias SearchByKeywordsKbArticleRequest
     */
    Requests.SearchByKeywordsKbArticleRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "GET",
            writeable: true
        },
        name: {
            value: "SearchByKeywordsKbArticle",
            writeable: true
        },
        bound: {
            value: true,
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt683544.aspx
	 * @description Searches for knowledge base articles that contain the specified title.
     * @alias SearchByTitleKbArticleRequest
     */
    Requests.SearchByTitleKbArticleRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "GET",
            writeable: true
        },
        name: {
            value: "SearchByTitleKbArticle",
            writeable: true
        },
        bound: {
            value: true,
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt683545.aspx
	 * @description Validates a rule for a recurring appointment.
     * @alias ValidateRecurrenceRuleRequest
     */
    Requests.ValidateRecurrenceRuleRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "GET",
            writeable: true
        },
        name: {
            value: "ValidateRecurrenceRule",
            writeable: true
        }
    });

    /**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607925.aspx
     * @description Retrieves the system user ID for the currently logged on user or the user under whose context the code is running.
     * @alias WhoAmIRequest
     */
    Requests.WhoAmIRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "GET",
            writeable: true
        },
        name: {
            value: "WhoAmI",
            writeable: true
        }
    });

     // Actions

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607569.aspx
	 * @description Adds an item to a campaign.
     * @alias AddItemCampaignRequest
     */
    Requests.AddItemCampaignRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "AddItemCampaign",
            writeable: true
        },
        bound: {
            value: true,
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607559.aspx
	 * @description Adds an item to a campaign activity.
     * @alias AddItemCampaignActivityRequest
     */
    Requests.AddItemCampaignActivityRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "AddItemCampaignActivity",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607641.aspx
	 * @description Adds members to a list.
     * @alias AddListMembersListRequest
     */
    Requests.AddListMembersListRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "AddListMembersList",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607495.aspx
	 * @description Adds a member to a list (marketing list).
     * @alias AddMemberListRequest
     */
    Requests.AddMemberListRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "AddMemberList",
            writeable: true
        },
        bound: {
            value: true,
            writeable: true
        },
        entityName: {
            value: "list",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607496.aspx
	 * @description Adds members to a team.
     * @alias AddMembersTeamRequest
     */
    Requests.AddMembersTeamRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "AddMembersTeam",
            writeable: true
        },
        bound: {
            value: true,
            writeable: true
        },
        entityName: {
            value: "team",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt593089.aspx
	 * @description Adds the specified principal to the list of queue members.
     * @alias AddPrincipalToQueueRequest
     */
    Requests.AddPrincipalToQueueRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "AddPrincipalToQueue",
            writeable: true
        },
        bound: {
            value: true,
            writeable: true
        },
        entityName: {
            value: "queue",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607862.aspx
	 * @description Adds a set of existing privileges to an existing role.
     * @alias AddPrivilegesRoleRequest
     */
    Requests.AddPrivilegesRoleRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "AddPrivilegesRole",
            writeable: true
        },
        bound: {
            value: true,
            writeable: true
        },
        entityName: {
            value: "role",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607566.aspx
	 * @description Adds recurrence information to an existing appointment.
     * @alias AddRecurrenceRequest
     */
    Requests.AddRecurrenceRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "AddRecurrence",
            writeable: true
        },
        bound: {
            value: true,
            writeable: true
        },
        entityName: {
            value: "appointment",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt593057.aspx
	 * @description Adds a solution component to an unmanaged solution.
     * @alias AddSolutionComponentRequest
     */
    Requests.AddSolutionComponentRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "AddSolutionComponent",
            writeable: true
        }
    });

    /**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607880.aspx
     * @description Moves an entity record from a source queue to a destination queue.
     * @alias AddToQueueRequest
     */
    Requests.AddToQueueRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "AddToQueue",
            writeable: true
        },
        bound: {
            value: true,
            writeable: true
        },
        entityName: {
            value: "queue",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607951.aspx
	 * @description Adds a user to the auto created access team for the specified record.
     * @alias AddUserToRecordTeamRequest
     */
    Requests.AddUserToRecordTeamRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "AddUserToRecordTeam",
            writeable: true
        },
        bound: {
            value: true,
            writeable: true
        },
        entityName: {
            value: "systemuser",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt608069.aspx
	 * @description Applies record creation and update rules to activities in 365 created as a result of the integration with external applications.
     * @alias ApplyRecordCreationAndUpdateRuleRequest
     */
    Requests.ApplyRecordCreationAndUpdateRuleRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "ApplyRecordCreationAndUpdateRule",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt608125.aspx
	 * @description Applies the active routing rule to an incident.
     * @alias ApplyRoutingRuleRequest
     */
    Requests.ApplyRoutingRuleRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "ApplyRoutingRule",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607766.aspx
	 * @description Generates a new set of attribute mappings based on the metadata.
     * @alias AutoMapEntityRequest
     */
    Requests.AutoMapEntityRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "AutoMapEntity",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt718079.aspx
	 * @description Schedules or "books" an appointment, recurring appointment, or service appointment (service activity).
     * @alias BookRequest
     */
    Requests.BookRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "Book",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt491158.aspx
	 * @description Submits a bulk delete job that deletes selected records in bulk. This job runs asynchronously in the background without blocking other activities.
     * @alias BulkDeleteRequest
     */
    Requests.BulkDeleteRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "BulkDelete",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt491162.aspx
	 * @description Submits an asynchronous system job that detects and logs multiple duplicate records.
     * @alias BulkDetectDuplicatesRequest
     */
    Requests.BulkDetectDuplicatesRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "BulkDetectDuplicates",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607988.aspx
	 * @description Calculates the value of an opportunity that is in the "Won" state.
     * @alias CalculateActualValueOpportunityRequest
     */
    Requests.CalculateActualValueOpportunityRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "CalculateActualValueOpportunity",
            writeable: true
        },
        bound: {
            value: true,
            writeable: true
        },
        entityName: {
            value: "opportunity",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt608012.aspx
	 * @description Calculates price in an opportunity, quote, order, and invoice.
     * @alias CalculatePriceRequest
     */
    Requests.CalculatePriceRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "CalculatePrice",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt593059.aspx
	 * @description Checks whether the specified entity can be the primary entity (one) in a one-to-many relationship.
     * @alias CanBeReferencedRequest
     */
    Requests.CanBeReferencedRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "CanBeReferenced",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607578.aspx
	 * @description Checkes whether an entity can be the referencing entity in a one-to-many relationship.
     * @alias CanBeReferencingRequest
     */
    Requests.CanBeReferencingRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "CanBeReferencing",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607610.aspx
	 * @description Cancels a contract.
     * @alias CancelContractRequest
     */
    Requests.CancelContractRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "CancelContract",
            writeable: true
        },
        bound: {
            value: true,
            writeable: true
        },
        entityName: {
            value: "contract",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607587.aspx
	 * @description Cancels a sales order.
     * @alias CancelSalesOrderRequest
     */
    Requests.CancelSalesOrderRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "CancelSalesOrder",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607577.aspx
	 * @description Checks whether an entity can participate in a many-to-many relationship.
     * @alias CanManyToManyRequest
     */
    Requests.CanManyToManyRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "CanManyToMany",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607802.aspx
	 * @description Creates a solution patch from a managed or unmanaged solution.
     * @alias CloneAsPatchRequest
     */
    Requests.CloneAsPatchRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "CloneAsPatch",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607806.aspx
	 * @description Creates a new copy of an unmanged solution that contains the original solution plus all of its patches.
     * @alias CloneAsSolutionRequest
     */
    Requests.CloneAsSolutionRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "CloneAsSolution",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607895.aspx
	 * @description Copies an existing contract and its line items.
     * @alias CloneContractRequest
     */
    Requests.CloneContractRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "CloneContract",
            writeable: true
        },
        bound: {
            value: true,
            writeable: true
        },
        entityName: {
            value: "contract",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt718080.aspx
	 * @description For internal use only.
     * @alias CloneMobileOfflineProfileRequest
     */
    Requests.CloneMobileOfflineProfileRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "CloneMobileOfflineProfile",
            writeable: true
        },
        bound: {
            value: true,
            writeable: true
        },
        entityName: {
            value: "mobileofflineprofile",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt608030.aspx
	 * @description Copies an existing product family, product, or bundle under the same parent record.
     * @alias CloneProductRequest
     */
    Requests.CloneProductRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "CloneProduct",
            writeable: true
        },
        bound: {
            value: true,
            writeable: true
        },
        entityName: {
            value: "product",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607498.aspx
	 * @description Closes an incident (case).
     * @alias CloseIncidentRequest
     */
    Requests.CloseIncidentRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "CloseIncident",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607685.aspx
	 * @description Closes a quote.
     * @alias CloseQuoteRequest
     */
    Requests.CloseQuoteRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "CloseQuote",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt608088.aspx
	 * @description Updates a duplicate rule (duplicate detection rule) and its related duplicate rule conditions.
     * @alias CompoundUpdateDuplicateDetectionRuleRequest
     */
    Requests.CompoundUpdateDuplicateDetectionRuleRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "CompoundUpdateDuplicateDetectionRule",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607749.aspx
	 * @description Converts a team of type owner to a team of type access.
     * @alias ConvertOwnerTeamToAccessTeamRequest
     */
    Requests.ConvertOwnerTeamToAccessTeamRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "ConvertOwnerTeamToAccessTeam",
            writeable: true
        },
        bound: {
            value: true,
            writeable: true
        },
        entityName: {
            value: "team",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607933.aspx
	 * @description Converts a product to a kit.
     * @alias ConvertProductToKitRequest
     */
    Requests.ConvertProductToKitRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "ConvertProductToKit",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607842.aspx
	 * @description Converts a quote to a sales order.
     * @alias ConvertQuoteToSalesOrderRequest
     */
    Requests.ConvertQuoteToSalesOrderRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "ConvertQuoteToSalesOrder",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607736.aspx
	 * @description Converts a sales order to an invoice.
     * @alias ConvertSalesOrderToInvoiceRequest
     */
    Requests.ConvertSalesOrderToInvoiceRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "ConvertSalesOrderToInvoice",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607820.aspx
	 * @description Copies a campaign.
     * @alias CopyCampaignRequest
     */
    Requests.CopyCampaignRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "CopyCampaign",
            writeable: true
        },
        bound: {
            value: true,
            writeable: true
        },
        entityName: {
            value: "campaign",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607655.aspx
	 * @description Creates a copy of a campaign response
     * @alias CopyCampaignResponseRequest
     */
    Requests.CopyCampaignResponseRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "CopyCampaignResponse",
            writeable: true
        },
        bound: {
            value: true,
            writeable: true
        },
        entityName: {
            value: "campaignresponse",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt593064.aspx
	 * @description Creates a static list from the specified dynamic list and add the members that satisfy the dynamic list query criteria to the static list.
     * @alias CopyDynamicListToStaticRequest
     */
    Requests.CopyDynamicListToStaticRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "CopyDynamicListToStatic",
            writeable: true
        },
        bound: {
            value: true,
            writeable: true
        },
        entityName: {
            value: "list",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607620.aspx
	 * @description Copies the members from the source list to the target list without creating duplicates.
     * @alias CopyMembersListRequest
     */
    Requests.CopyMembersListRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "CopyMembersList",
            writeable: true
        },
        bound: {
            value: true,
            writeable: true
        },
        entityName: {
            value: "list",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt608044.aspx
	 * @description Creates a new entity form that is based on an existing entity form.
     * @alias CopySystemFormRequest
     */
    Requests.CopySystemFormRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "CopySystemForm",
            writeable: true
        },
        bound: {
            value: true,
            writeable: true
        },
        entityName: {
            value: "systemform",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607931.aspx
	 * @description Creates a quick campaign to distribute an activity to members of a list (marketing list).
     * @alias CreateActivitiesListRequest
     */
    Requests.CreateActivitiesListRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "CreateActivitiesList",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt491161.aspx
	 * @description Creates a new customer lookup attribute, and optionally, to add it to a specified unmanaged solution.
     * @alias CreateCustomerRelationshipsRequest
     */
    Requests.CreateCustomerRelationshipsRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "CreateCustomerRelationships",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt593100.aspx
	 * @description Creates an exception for the recurring appointment instance.
     * @alias CreateExceptionRequest
     */
    Requests.CreateExceptionRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "CreateException",
            writeable: true
        },
        bound: {
            value: true,
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt608070.aspx
	 * @description Creates future unexpanded instances for the recurring appointment master.
     * @alias CreateInstanceRequest
     */
    Requests.CreateInstanceRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "CreateInstance",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607622.aspx
	 * @description Creates translation of a knowledge article instance.
     * @alias CreateKnowledgeArticleTranslationRequest
     */
    Requests.CreateKnowledgeArticleTranslationRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "CreateKnowledgeArticleTranslation",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607825.aspx
	 * @description Creates a major or minor version of a knowledge article instance.
     * @alias CreateKnowledgeArticleVersionRequest
     */
    Requests.CreateKnowledgeArticleVersionRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "CreateKnowledgeArticleVersion",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt622404.aspx
	 * @description Creates a workflow (process) from a workflow template.
     * @alias CreateWorkflowFromTemplateRequest
     */
    Requests.CreateWorkflowFromTemplateRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "CreateWorkflowFromTemplate",
            writeable: true
        },
        bound: {
            value: true,
            writeable: true
        },
        entityName: {
            value: "workflow",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607488.aspx
	 * @description Replaces managed solution (A) plus all of its patches with managed solution (B) that is the clone of (A) and all of its patches.
     * @alias DeleteAndPromoteRequest
     */
    Requests.DeleteAndPromoteRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "DeleteAndPromote",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607758.aspx
	 * @description Deletes all audit data records up until a specified end date.
     * @alias DeleteAuditDataRequest
     */
    Requests.DeleteAuditDataRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "DeleteAuditData",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt608051.aspx
	 * @description Deletes instances of a recurring appointment master that have an “Open” state.
     * @alias DeleteOpenInstancesRequest
     */
    Requests.DeleteOpenInstancesRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "DeleteOpenInstances",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607754.aspx
	 * @description Deletes an option value in a global or local option set.
     * @alias DeleteOptionValueRequest
     */
    Requests.DeleteOptionValueRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "DeleteOptionValue",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607515.aspx
	 * @description Creates an email activity record from an incoming email message.
     * @alias DeliverIncomingEmailRequest
     */
    Requests.DeliverIncomingEmailRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "DeliverIncomingEmail",
            writeable: true
        },
        bound: {
            value: true,
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt608033.aspx
	 * @description Creates an email activity record from the specified email message
     * @alias DeliverPromoteEmailRequest
     */
    Requests.DeliverPromoteEmailRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "DeliverPromoteEmail",
            writeable: true
        },
        bound: {
            value: true,
            writeable: true
        },
        entityName: {
            value: "email",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt608078.aspx
	 * @description Deprovisions a language.
     * @alias DeprovisionLanguageRequest
     */
    Requests.DeprovisionLanguageRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "DeprovisionLanguage",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607926.aspx
	 * @description Creates a bulk operation that distributes a campaign activity.
     * @alias DistributeCampaignActivityRequest
     */
    Requests.DistributeCampaignActivityRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "DistributeCampaignActivity",
            writeable: true
        },
        bound: {
            value: true,
            writeable: true
        },
        entityName: {
            value: "campaignactivity",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt491159.aspx
	 * @description Executes a workflow.
     * @alias ExecuteWorkflowRequest
     */
    Requests.ExecuteWorkflowRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "ExecuteWorkflow",
            writeable: true
        },
        bound: {
            value: true,
            writeable: true
        },
        entityName: {
            value: "workflow",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt622402.aspx
	 * @description Exports a data map as an XML formatted data.
     * @alias ExportMappingsImportMapRequest
     */
    Requests.ExportMappingsImportMapRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "ExportMappingsImportMap",
            writeable: true
        },
        bound: {
            value: true,
            writeable: true
        },
        entityName: {
            value: "importmap",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607590.aspx
	 * @description Exports a solution.
     * @alias ExportSolutionRequest
     */
    Requests.ExportSolutionRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "ExportSolution",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt608097.aspx
	 * @description Exports all translations for a specific solution to a compressed file.
     * @alias ExportTranslationRequest
     */
    Requests.ExportTranslationRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "ExportTranslation",
            writeable: true
        },
        bound: {
            value: true,
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607784.aspx
	 * @description Fulfills a sales order.
     * @alias FulfillSalesOrderRequest
     */
    Requests.FulfillSalesOrderRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "FulfillSalesOrder",
            writeable: true
        },
        bound: {
            value: true,
            writeable: true
        }
    });

    /**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt491160.aspx
	 * @description Performs a full-text search on knowledge articles in Dynamics 365 using the specified search text.
     * @alias FullTextSearchKnowledgeArticleRequest
     */
    Requests.FullTextSearchKnowledgeArticleRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "FullTextSearchKnowledgeArticle",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt593066.aspx
	 * @description Generates an invoice from an opportunity.
     * @alias GenerateInvoiceFromOpportunityRequest
     */
    Requests.GenerateInvoiceFromOpportunityRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "GenerateInvoiceFromOpportunity",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607591.aspx
	 * @description Generates a quote from an opportunity.
     * @alias GenerateQuoteFromOpportunityRequest
     */
    Requests.GenerateQuoteFromOpportunityRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "GenerateQuoteFromOpportunity",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607659.aspx
	 * @description Generates a sales order (order) from an opportunity.
     * @alias GenerateSalesOrderFromOpportunityRequest
     */
    Requests.GenerateSalesOrderFromOpportunityRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "GenerateSalesOrderFromOpportunity",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt593014.aspx
	 * @description Returns an existing social profile record if one exists, otherwise generates a new one and returns it.
     * @alias GenerateSocialProfileRequest
     */
    Requests.GenerateSocialProfileRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "GenerateSocialProfile",
            writeable: true
        },
        bound: {
            value: true,
            writeable: true
        },
        entityName: {
            value: "socialprofile",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607526.aspx
	 * @description Retrieves the products from an opportunity and copy them to the invoice.
     * @alias GetInvoiceProductsFromOpportunityRequest
     */
    Requests.GetInvoiceProductsFromOpportunityRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "GetInvoiceProductsFromOpportunity",
            writeable: true
        },
        bound: {
            value: true,
            writeable: true
        },
        entityName: {
            value: "invoice",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607548.aspx
	 * @description Retrieves the products from an opportunity and copy them to the quote.
     * @alias GetQuoteProductsFromOpportunityRequest
     */
    Requests.GetQuoteProductsFromOpportunityRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "GetQuoteProductsFromOpportunity",
            writeable: true
        },
        bound: {
            value: true,
            writeable: true
        },
        entityName: {
            value: "quote",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607869.aspx
	 * @description Retrieves the products from an opportunity and copy them to the sales order.
     * @alias GetSalesOrderProductsFromOpportunityRequest
     */
    Requests.GetSalesOrderProductsFromOpportunityRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "GetSalesOrderProductsFromOpportunity",
            writeable: true
        },
        bound: {
            value: true,
            writeable: true
        },
        entityName: {
            value: "salesorder",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt593007.aspx
	 * @description Returns a tracking token that can then be passed as a parameter to the SendEmailRequest message.
     * @alias GetTrackingTokenEmailRequest
     */
    Requests.GetTrackingTokenEmailRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "GetTrackingTokenEmail",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt608013.aspx
	 * @description Imports translations from a compressed file.
     * @alias ImportFieldTranslationRequest
     */
    Requests.ImportFieldTranslationRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "ImportFieldTranslation",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607768.aspx
	 * @description Imports the XML representation of a data map and create an import map (data map) based on this data.
     * @alias ImportMappingsImportMapRequest
     */
    Requests.ImportMappingsImportMapRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "ImportMappingsImportMap",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt622418.aspx
	 * @description Submits an asynchronous job that uploads the transformed data into Microsoft Dynamics 365.
     * @alias ImportRecordsImportRequest
     */
    Requests.ImportRecordsImportRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "ImportRecordsImport",
            writeable: true
        },
        bound: {
            value: true,
            writeable: true
        },
        entityName: {
            value: "import",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt608117.aspx
	 * @description Imports a solution.
     * @alias ImportSolutionRequest
     */
    Requests.ImportSolutionRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "ImportSolution",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607744.aspx
	 * @description Imports translations from a compressed file.
     * @alias ImportTranslationRequest
     */
    Requests.ImportTranslationRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "ImportTranslation",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607647.aspx
	 * @description Inserts a new option value for a global or local option set.
     * @alias InsertOptionValueRequest
     */
    Requests.InsertOptionValueRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "InsertOptionValue",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607839.aspx
	 * @description Inserts a new option into a StatusAttributeMetadata attribute.
     * @alias InsertStatusValueRequest
     */
    Requests.InsertStatusValueRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "InsertStatusValue",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt608101.aspx
	 * @description Installs the sample data.
     * @alias InstallSampleDataRequest
     */
    Requests.InstallSampleDataRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "InstallSampleData",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607877.aspx
	 * @description Instantiates a set of filters for Dynamics 365 for Outlook for the specified user.
     * @alias InstantiateFiltersRequest
     */
    Requests.InstantiateFiltersRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "InstantiateFilters",
            writeable: true
        },
        bound: {
            value: true,
            writeable: true
        },
        entityName: {
            value: "systemuser",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt592993.aspx
	 * @description Creates an email message from a template (email template).
     * @alias InstantiateTemplateRequest
     */
    Requests.InstantiateTemplateRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "InstantiateTemplate",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607781.aspx
	 * @description Locks the total price of products and services that are specified in the invoice.
     * @alias LockInvoicePricingRequest
     */
    Requests.LockInvoicePricingRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "LockInvoicePricing",
            writeable: true
        },
        bound: {
            value: true,
            writeable: true
        },
        entityName: {
            value: "invoice",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607804.aspx
	 * @description Locks the total price of products and services that are specified in the sales order (order).
     * @alias LockSalesOrderPricingRequest
     */
    Requests.LockSalesOrderPricingRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "LockSalesOrderPricing",
            writeable: true
        },
        bound: {
            value: true,
            writeable: true
        },
        entityName: {
            value: "salesorder",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607618.aspx
	 * @description Sets the state of an opportunity to Lost.
     * @alias LoseOpportunityRequest
     */
    Requests.LoseOpportunityRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "LoseOpportunity",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607669.aspx
	 * @description Merges the information from two entity records of the same type.
     * @alias MergeRequest
     */
    Requests.MergeRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "Merge",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607483.aspx
	 * @description Sets the order for an option set.
     * @alias OrderOptionRequest
     */
    Requests.OrderOptionRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "OrderOption",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt622440.aspx
	 * @description Submits an asynchronous job that parses all import files that are associated with the specified import (data import).
     * @alias ParseImportRequest
     */
    Requests.ParseImportRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "ParseImport",
            writeable: true
        },
        bound: {
            value: true,
            writeable: true
        },
        entityName: {
            value: "import",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt593071.aspx
	 * @description Assigns a queue item to a user and optionally remove the queue item from the queue.
     * @alias PickFromQueueRequest
     */
    Requests.PickFromQueueRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "PickFromQueue",
            writeable: true
        },
        bound: {
            value: true,
            writeable: true
        },
        entityName: {
            value: "queueitem",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607787.aspx
	 * @description Processes the email responses from a marketing campaign.
     * @alias ProcessInboundEmailRequest
     */
    Requests.ProcessInboundEmailRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "ProcessInboundEmail",
            writeable: true
        },
        bound: {
            value: true,
            writeable: true
        },
        entityName: {
            value: "email",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt491163.aspx
	 * @description Creates a quick campaign to distribute an activity to accounts, contacts, or leads that are selected by a query.
     * @alias PropagateByExpressionRequest
     */
    Requests.PropagateByExpressionRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "PropagateByExpression",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt608077.aspx
	 * @description Provisions a new language.
     * @alias ProvisionLanguageRequest
     */
    Requests.ProvisionLanguageRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "ProvisionLanguage",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607699.aspx
	 * @description Publishes all changes to solution components.
     * @alias PublishAllXmlRequest
     */
    Requests.PublishAllXmlRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "PublishAllXml",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt622423.aspx
	 * @description Submits an asynchronous job to publish a duplicate rule.
     * @alias PublishDuplicateRuleRequest
     */
    Requests.PublishDuplicateRuleRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "PublishDuplicateRule",
            writeable: true
        },
        bound: {
            value: true,
            writeable: true
        },
        entityName: {
            value: "duplicaterule",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt593011.aspx
	 * @description Publishes a product family record and all its child records.
     * @alias PublishProductHierarchyRequest
     */
    Requests.PublishProductHierarchyRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "PublishProductHierarchy",
            writeable: true
        },
        bound: {
            value: true,
            writeable: true
        },
        entityName: {
            value: "product",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt608018.aspx
	 * @description Publishes a theme and set it as the current theme.
     * @alias PublishThemeRequest
     */
    Requests.PublishThemeRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "PublishTheme",
            writeable: true
        },
        bound: {
            value: true,
            writeable: true
        },
        entityName: {
            value: "theme",
            writeable: true
        }
    });

    /**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt593076.aspx
     * @description Publishes specified solution components.
     * @alias PublishXmlRequest
     */
    Requests.PublishXmlRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "PublishXml",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt491164.aspx
	 * @description Qualifies a lead and create account, contact, and opportunity records that are linked to the originating lead record.
     * @alias QualifyLeadRequest
     */
    Requests.QualifyLeadRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "QualifyLead",
            writeable: true
        },
        bound: {
            value: true,
            writeable: true
        },
        entityName: {
            value: "lead",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607614.aspx
	 * @description Qualifies the specified list and either override the list members or remove them according to the specified option.
     * @alias QualifyMemberListRequest
     */
    Requests.QualifyMemberListRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "QualifyMemberList",
            writeable: true
        },
        bound: {
            value: true,
            writeable: true
        },
        entityName: {
            value: "list",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt491165.aspx
	 * @description Converts a QueryExpression query to its equivalent FetchXML query
     * @alias QueryExpressionToFetchXmlRequest
     */
    Requests.QueryExpressionToFetchXmlRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "QueryExpressionToFetchXml",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607627.aspx
	 * @description Reassigns all records that are owned by the security principal (user or team) to another security principal (user or team).
     * @alias ReassignObjectsOwnerRequest
     */
    Requests.ReassignObjectsOwnerRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "ReassignObjectsOwner",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607965.aspx
	 * @description Reassigns all records that are owned by a specified user to another security principal (user or team).
     * @alias ReassignObjectsSystemUserRequest
     */
    Requests.ReassignObjectsSystemUserRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "ReassignObjectsSystemUser",
            writeable: true
        },
        bound: {
            value: true,
            writeable: true
        },
        entityName: {
            value: "systemuser",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607675.aspx
	 * @description Recalculate system-computed values for rollup fields in the goal hierarchy.
     * @alias RecalculateRequest
     */
    Requests.RecalculateRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "Recalculate",
            writeable: true
        },
        bound: {
            value: true,
            writeable: true
        },
        entityName: {
            value: "goal",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt593031.aspx
	 * @description Assigns a queue item back to the queue owner so others can pick it.
     * @alias ReleaseToQueueRequest
     */
    Requests.ReleaseToQueueRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "ReleaseToQueue",
            writeable: true
        },
        bound: {
            value: true,
            writeable: true
        },
        entityName: {
            value: "queueitem",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607534.aspx
	 * @description Removes a queue item from a queue.
     * @alias RemoveFromQueueRequest
     */
    Requests.RemoveFromQueueRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "RemoveFromQueue",
            writeable: true
        },
        bound: {
            value: true,
            writeable: true
        },
        entityName: {
            value: "queueitem",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607537.aspx
	 * @description Removes members from a team.
     * @alias RemoveMembersTeamRequest
     */
    Requests.RemoveMembersTeamRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "RemoveMembersTeam",
            writeable: true
        },
        bound: {
            value: true,
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607528.aspx
	 * @description Removes the parent for a system user (user) record.
     * @alias RemoveParentRequest
     */
    Requests.RemoveParentRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "RemoveParent",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt593107.aspx
	 * @description Removes a privilege from an existing role.
     * @alias RemovePrivilegeRoleRequest
     */
    Requests.RemovePrivilegeRoleRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "RemovePrivilegeRole",
            writeable: true
        },
        bound: {
            value: true,
            writeable: true
        },
        entityName: {
            value: "role",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt608116.aspx
	 * @description Removes a component from an unmanaged solution.
     * @alias RemoveSolutionComponentRequest
     */
    Requests.RemoveSolutionComponentRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "RemoveSolutionComponent",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607735.aspx
	 * @description Removes a user from the auto created access team for the specified record.
     * @alias RemoveUserFromRecordTeamRequest
     */
    Requests.RemoveUserFromRecordTeamRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "RemoveUserFromRecordTeam",
            writeable: true
        },
        bound: {
            value: true,
            writeable: true
        },
        entityName: {
            value: "systemuser",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt593084.aspx
	 * @description Renews a contract and create the contract details for a new contract.
     * @alias RenewContractRequest
     */
    Requests.RenewContractRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "RenewContract",
            writeable: true
        },
        bound: {
            value: true,
            writeable: true
        },
        entityName: {
            value: "contract",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607893.aspx
	 * @description Renews an entitlement.
     * @alias RenewEntitlementRequest
     */
    Requests.RenewEntitlementRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "RenewEntitlement",
            writeable: true
        },
        bound: {
            value: true,
            writeable: true
        },
        entityName: {
            value: "entitlement",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607752.aspx
	 * @description Replaces the privilege set of an existing role.
     * @alias ReplacePrivilegesRoleRequest
     */
    Requests.ReplacePrivilegesRoleRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "ReplacePrivilegesRole",
            writeable: true
        },
        bound: {
            value: true,
            writeable: true
        },
        entityName: {
            value: "role",
            writeable: true
        }
    });

    /**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt718082.aspx
	 * @description Reschedules an appointment, recurring appointment, or service appointment (service activity).
     * @alias RescheduleRequest
     */
    Requests.RescheduleRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "Reschedule",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607633.aspx
	 * @description Resets the offline data filters for the calling user to the default filters for the organization.
     * @alias ResetUserFiltersRequest
     */
    Requests.ResetUserFiltersRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "ResetUserFilters",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt608006.aspx
	 * @description Reverts changes done to properties of a product family, product, or bundle record, and set it back to its last published (active) state.
     * @alias RevertProductRequest
     */
    Requests.RevertProductRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "RevertProduct",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607543.aspx
	 * @description Sets the state of a quote to Draft.
     * @alias ReviseQuoteRequest
     */
    Requests.ReviseQuoteRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "ReviseQuote",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607505.aspx
	 * @description Replaces the access rights on the target record for the specified security principal (user or team).
     * @alias RevokeAccessRequest
     */
    Requests.RevokeAccessRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "RevokeAccess",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607729.aspx
	 * @description Routes a queue item to a queue, a user, or a team.
     * @alias RouteToRequest
     */
    Requests.RouteToRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "RouteTo",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt491166.aspx
	 * @description Sends bulk email messages.
     * @alias SendBulkMailRequest
     */
    Requests.SendBulkMailRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "SendBulkMail",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt608061.aspx
	 * @description Sends an e-mail message.
     * @alias SendEmailRequest
     */
    Requests.SendEmailRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "SendEmail",
            writeable: true
        },
        bound: {
            value: true,
            writeable: true
        },
        entityName: {
            value: "email",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607523.aspx
	 * @description Sends an e-mail message to a recipient using an e-mail template.
     * @alias SendEmailFromTemplateRequest
     */
    Requests.SendEmailFromTemplateRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "SendEmailFromTemplate",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607670.aspx
	 * @description Sends a fax.
     * @alias SendFaxRequest
     */
    Requests.SendFaxRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "SendFax",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607717.aspx
	 * @description Sends a bulk email message that is created from a template.
     * @alias SendTemplateRequest
     */
    Requests.SendTemplateRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "SendTemplate",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt608087.aspx
	 * @description Assigns equipment (facility/equipment) to a specific business unit.
     * @alias SetBusinessEquipmentRequest
     */
    Requests.SetBusinessEquipmentRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "SetBusinessEquipment",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt593023.aspx
	 * @description Moves a system user (user) to a different business unit.
     * @alias SetBusinessSystemUserRequest
     */
    Requests.SetBusinessSystemUserRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "SetBusinessSystemUser",
            writeable: true
        },
        bound: {
            value: true,
            writeable: true
        },
        entityName: {
            value: "systemuser",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt608039.aspx
	 * @description Sets or restore the data encryption key.
     * @alias SetDataEncryptionKeyRequest
     */
    Requests.SetDataEncryptionKeyRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "SetDataEncryptionKey",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt491167.aspx
	 * @description TODO: SetFeatureStatus Action Description (Obviously no description yet)
     * @alias SetFeatureStatusRequest
     */
    Requests.SetFeatureStatusRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "SetFeatureStatus",
            writeable: true
        }
    });

    /**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607609.aspx
     * @description Sets localized labels for a limited set of entity attributes.
     * @alias SetLocLabelsRequest
     */
    Requests.SetLocLabelsRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "SetLocLabels",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607617.aspx
	 * @description Sets a new parent system user (user) for the specified user.
     * @alias SetParentSystemUserRequest
     */
    Requests.SetParentSystemUserRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "SetParentSystemUser",
            writeable: true
        },
        bound: {
            value: true,
            writeable: true
        },
        entityName: {
            value: "systemuser",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607705.aspx
	 * @description Sets the process that associates with a given target entity. The user can set to another business process or specify null to clear out the current process.
     * @alias SetProcessRequest
     */
    Requests.SetProcessRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "SetProcess",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607765.aspx
	 * @description Links an instance of a report entity to related entities.
     * @alias SetReportRelatedRequest
     */
    Requests.SetReportRelatedRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "SetReportRelated",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt608027.aspx
	 * @description Submits an asynchronous job that transforms the parsed data.
     * @alias TransformImportRequest
     */
    Requests.TransformImportRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "TransformImport",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt622443.aspx
	 * @description Validates the configuration of a Microsoft Azure Service Bus solution’s service endpoint.
     * @alias TriggerServiceEndpointCheckRequest
     */
    Requests.TriggerServiceEndpointCheckRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "TriggerServiceEndpointCheck",
            writeable: true
        },
        bound: {
            value: true,
            writeable: true
        },
        entityName: {
            value: "serviceendpoint",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt608045.aspx
	 * @description Uninstalls the sample data.
     * @alias UninstallSampleDataRequest
     */
    Requests.UninstallSampleDataRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "UninstallSampleData",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt608015.aspx
	 * @description Unlocks pricing for an invoice.
     * @alias UnlockInvoicePricingRequest
     */
    Requests.UnlockInvoicePricingRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "UnlockInvoicePricing",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt608026.aspx
	 * @description Unlocks pricing for a sales order (order).
     * @alias UnlockSalesOrderPricingRequest
     */
    Requests.UnlockSalesOrderPricingRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "UnlockSalesOrderPricing",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt593018.aspx
	 * @description Submits an asynchronous job to unpublish a duplicate rule.
     * @alias UnpublishDuplicateRuleRequest
     */
    Requests.UnpublishDuplicateRuleRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "UnpublishDuplicateRule",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt491168.aspx
	 * @description TODO: UpdateFeatureConfig Action Description (Missing)
     * @alias UpdateFeatureConfigRequest
     */
    Requests.UpdateFeatureConfigRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "UpdateFeatureConfig",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607949.aspx
	 * @description Updates an option value in a global or local option set.
     * @alias UpdateOptionValueRequest
     */
    Requests.UpdateOptionValueRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "UpdateOptionValue",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607561.aspx
	 * @description Updates values of the property instances (dynamic property instances) for a product added to an opportunity, quote, order, or invoice.
     * @alias UpdateProductPropertiesRequest
     */
    Requests.UpdateProductPropertiesRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "UpdateProductProperties",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607611.aspx
	 * @description Updates a component in an unmanaged solution.
     * @alias UpdateSolutionComponentRequest
     */
    Requests.UpdateSolutionComponentRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "UpdateSolutionComponent",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607556.aspx
	 * @description Updates an option set value in for a StateAttributeMetadata attribute.
     * @alias UpdateStateValueRequest
     */
    Requests.UpdateStateValueRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "UpdateStateValue",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607767.aspx
	 * @description Verifies that an appointment or service appointment (service activity) has valid available resources for the activity, duration, and site, as appropriate.
     * @alias ValidateRequest
     */
    Requests.ValidateRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "Validate",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607945.aspx
	 * @description Validates a saved query.
     * @alias ValidateSavedQueryRequest
     */
    Requests.ValidateSavedQueryRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "ValidateSavedQuery",
            writeable: true
        },
        bound: {
            value: true,
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607971.aspx
	 * @description Sets the state of an opportunity to Won.
     * @alias WinOpportunityRequest
     */
    Requests.WinOpportunityRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "WinOpportunity",
            writeable: true
        }
    });

	/**
     * @memberof module:Requests
     * @this {Requests}
     * @see https://msdn.microsoft.com/en-us/library/mt607710.aspx
	 * @description Sets the state of a quote to Won.
     * @alias WinQuoteRequest
     */
    Requests.WinQuoteRequest = Object.create(Requests.Request.prototype, {
        method: {
            value: "POST",
            writeable: true
        },
        name: {
            value: "WinQuote",
            writeable: true
        }
    });

    // Export Requests for later referencing in Core
    module.exports = Requests;
} ());

},{"./WebApiClient.Core.js":7}],9:[function(require,module,exports){
(function(undefined) {
    "use strict";

    function ParseContentId (rawData) {
        var contentIdRaw = (/^Content-ID: ([0-9]+)$/m).exec(rawData);

        if (contentIdRaw && contentIdRaw.length > 1) {
            return contentIdRaw[1];
        }

        return null;
    }

    function ParsePayload (rawData) {
        var payloadRaw = (/^{[\s\S]*}/m).exec(rawData);

        if (payloadRaw && payloadRaw.length > 0) {
            return JSON.parse(payloadRaw[0]);
        }

        return null;
    }

    function ParseStatus (rawData) {
        var statusRaw = (/^HTTP\/1\.1 ([0-9]{3,3}).*$/m).exec(rawData);

        if (statusRaw && statusRaw.length > 1) {
            return statusRaw[1];
        }

        return null;
    }

    function ParseHeaders (rawData) {
        var headersRaw = (/HTTP\/1.1.*[\r\n]+([\S\s]*)?(?={|$)/g).exec(rawData);

        if (headersRaw && headersRaw.length > 1) {
            var headers = {};

            var headersSplit = headersRaw[1].split(/[\r\n]/);

            for (var i = 0; i < headersSplit.length; i++) {
                var line = headersSplit[i];

                var delimiterIndex = line.indexOf(": ");

                var key = line.substring(0, delimiterIndex);

                if (!key) {
                    continue;
                }

                // Start after delimiterIndex (which is two chars long)
                var value = line.substring(delimiterIndex + 2);

                headers[key] = value;
            }

            return headers;
        }

        return null;
    }

    /**
     * Response returned for every requests inside a batch.
     * @constructor
     * @see https://msdn.microsoft.com/en-us/library/mt607719.aspx#bkmk_Example
     * @param {Object} [parameters]
     * @param {String} [parameters.contentId] Content ID for this response. You can identify which request this response belongs to, if the Content-Id was set on the request as well
     * @param {Object} [parameters.payload] Message body returned for this response, parsed JSON object
     * @param {string} [parameters.status] HTTP status code returned for this response
     * @param {Object} [parameters.headers] Headers returned for this response. Header keys are set as object keys with the corresponding values
     * @param {string} [parameters.rawData] Text fragment returned for this response. Will be used for parsing other properties if passed
     * @memberof module:WebApiClient
     */
     var Response = function (parameters) {
        var params = parameters || {};

        if (!params.rawData) {
            /**
             * @property {String} contentId - Content ID for this response. You can identify which request this response belongs to, if the Content-Id was set on the request as well
             * @this {Response}
             */
            this.contentId = params.contentId;

            /**
             * @property {Object} payload - Message body returned for this response, parsed JSON object
             * @this {Response}
             */
            this.payload = params.payload;

            /**
             * @property {String} status - HTTP status code returned for this response
             * @this {Response}
             */
            this.status = params.status;

            /**
             * @property {String} headers - Headers returned for this response. Header keys are set as object keys with the corresponding values
             * @this {Response}
             */
            this.headers = params.headers;
        } else {
            var rawData = params.rawData;

            this.contentId = ParseContentId(rawData);
            this.payload = ParsePayload(rawData);
            this.status = ParseStatus(rawData);
            this.headers = ParseHeaders(rawData);
        }
    };

    module.exports = Response;
} ());

},{}],10:[function(require,module,exports){
(function(undefined) {
    "use strict";

    // Get WebApiClient core
    var WebApiClient = require("./WebApiClient.Core.js");

    /**
     * This is the bundled version of bluebird for usage as polyfill in browsers that don't support promises natively
     * @class
     * @see https://github.com/petkaantonov/bluebird
     * @memberof module:WebApiClient
     * @alias WebApiClient.Promise
     */
    WebApiClient.Promise = require("bluebird").noConflict();

    // Attach requests to core
    WebApiClient.Requests = require("./WebApiClient.Requests.js");

    // Attach batch to core
    WebApiClient.Batch = require("./WebApiClient.Batch.js");

    // Attach changeSet to core
    WebApiClient.ChangeSet = require("./WebApiClient.ChangeSet.js");

    // Attach batchRequest to core
    WebApiClient.BatchRequest = require("./WebApiClient.BatchRequest.js");

    // Attach batchResponse to core
    WebApiClient.BatchResponse = require("./WebApiClient.BatchResponse.js");

    // Attach response to core
    WebApiClient.Response = require("./WebApiClient.Response.js");

    // Export complete WebApiClient
    module.exports = WebApiClient;
} ());

},{"./WebApiClient.Batch.js":3,"./WebApiClient.BatchRequest.js":4,"./WebApiClient.BatchResponse.js":5,"./WebApiClient.ChangeSet.js":6,"./WebApiClient.Core.js":7,"./WebApiClient.Requests.js":8,"./WebApiClient.Response.js":9,"bluebird":1}]},{},[10])(10)
});