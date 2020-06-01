/**
  * uniapp-router v1.2.2
  * (c) 2020 wizardpisces
  * @license MIT
  */
(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('vue')) :
    typeof define === 'function' && define.amd ? define(['exports', 'vue'], factory) :
    (global = global || self, factory(global.UniAppRouter = {}, global._Vue));
}(this, function (exports, _Vue) { 'use strict';

    _Vue = _Vue && _Vue.hasOwnProperty('default') ? _Vue['default'] : _Vue;

    /*! *****************************************************************************
    Copyright (c) Microsoft Corporation. All rights reserved.
    Licensed under the Apache License, Version 2.0 (the "License"); you may not use
    this file except in compliance with the License. You may obtain a copy of the
    License at http://www.apache.org/licenses/LICENSE-2.0

    THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
    KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
    WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
    MERCHANTABLITY OR NON-INFRINGEMENT.

    See the Apache Version 2.0 License for specific language governing permissions
    and limitations under the License.
    ***************************************************************************** */
    /* global Reflect, Promise */

    var extendStatics = function(d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };

    function __extends(d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    }

    var methodMap = {
        push: 'navigateTo',
        pushTab: 'switchTab',
        replace: 'redirectTo',
        replaceAll: 'reLaunch',
        back: 'navigateBack',
    };
    var NAME_SPLITTER = '-';

    function warn(condition, message) {
        typeof console !== 'undefined' &&
            console.error("[klk-uni-router] " + message);
    }

    function runQueue(queue, fn, cb) {
        var step = function (index) {
            if (index >= queue.length) {
                cb();
            }
            else {
                if (queue[index]) {
                    fn(queue[index], function () {
                        step(index + 1);
                    });
                }
                else {
                    step(index + 1);
                }
            }
        };
        step(0);
    }

    var installed = false;
    var isDef = function (v) { return v !== undefined; };
    function install(Vue) {
        if (installed && _Vue === Vue)
            return;
        installed = true;
        var _vm = {
            _router: {},
            _route: {},
        };
        Vue.mixin({
            beforeCreate: function () {
                if (isDef(this.$options.router)) {
                    var _router = this.$options.router;
                    _vm._router = _router;
                    _vm._router.init(_vm);
                    Vue.util.defineReactive(_vm, '_route', _router.current);
                }
            },
        });
        Object.defineProperty(Vue.prototype, '$router', {
            get: function () {
                return _vm._router;
            },
        });
        Object.defineProperty(Vue.prototype, '$route', {
            get: function () {
                return _vm._route;
            },
        });
        // Vue.component('router-link', RouterLink);
    }

    // eg '/pages/bookings/detail/index.vue' => "/pages/bookings/detail/index" to match uni-app pages.json rules
    function transformPath(filePath) {
        var matched = filePath.match(/(.+).vue/i);
        var path = '';
        if (matched) {
            path = matched[1];
        }
        else {
            warn(false, "transformPath failed, wrong filePath: " + filePath);
        }
        return path;
    }
    // eg  '/pages/bookings/detail/index.vue' => bookings-detail
    function transformFilePathToName(routePath) {
        var matched = routePath.match(/\/?pages\/(.+)\/index.vue/i);
        var name = '';
        if (matched) {
            name = matched[1].split('/').join(NAME_SPLITTER);
        }
        else {
            warn(false, "transformFilePathToName failed, wrong path: " + routePath);
        }
        return name;
    }
    function generateRouterConfig(requireContext) {
        var routerConfig = [], files = requireContext
            ? requireContext('pages/', true, /\/index.vue$/i)
            : require.context('pages/', true, /\/index.vue$/i);
        // eg "./bookings/detail" => "/pages/bookings/detail"
        var filePathArray = files
            .keys()
            .map(function (filePath) { return "/pages/" + filePath.slice(2); })
            .sort();
        routerConfig = filePathArray.map(function (filePath) {
            return {
                path: transformPath(filePath),
                name: transformFilePathToName(filePath),
                children: [],
            };
        });
        return routerConfig;
    }
    var routeNotNested = generateRouterConfig();
    // const routerConfig: RouteConfigExtended[] = createNestedRoutes(routeNotNested);
    console.log('[router config]', '\n[not nested]', routeNotNested); // file full path

    function createRoute(location) {
        var route = {
            name: location.name,
            path: location.path || '/',
            query: location.query || {},
        };
        return Object.freeze(route);
    }
    var START = createRoute({
        path: '/',
    });
    function getNotNestedRoutes() {
        return routeNotNested;
    }

    var prefixSlashRE = /^\/?/;
    function parsePath(path) {
        if (path === void 0) { path = ''; }
        var hash = '';
        var query = '';
        var hashIndex = path.indexOf('#');
        if (hashIndex >= 0) {
            hash = path.slice(hashIndex);
            path = path.slice(0, hashIndex);
        }
        var queryIndex = path.indexOf('?');
        if (queryIndex >= 0) {
            query = path.slice(queryIndex + 1);
            path = path.slice(0, queryIndex);
        }
        return {
            path: path,
            query: query,
            hash: hash,
        };
    }
    function resolvePathByName(routeName) {
        var routes = getNotNestedRoutes();
        var matchedName = routes.filter(function (route) {
            return routeName === route.name;
        });
        return matchedName && matchedName[0].path;
    }
    function resolveNameByPath(routePath) {
        var routes = getNotNestedRoutes();
        function isSamePath(path1, path2) {
            return (path1.replace(prefixSlashRE, '') ===
                path2.replace(prefixSlashRE, ''));
        }
        var matchedName = routes.filter(function (route) {
            return isSamePath(routePath, route.path);
        });
        return matchedName && matchedName[0].name;
    }

    //copied from https://github.com/vuejs/vue-router/blob/dev/src/util/query.js
    var encodeReserveRE = /[!'()*]/g;
    var encodeReserveReplacer = function (c) { return '%' + c.charCodeAt(0).toString(16); };
    var commaRE = /%2C/g;
    // fixed encodeURIComponent which is more conformant to RFC3986:
    // - escapes [!'()*]
    // - preserve commas
    var encode = function (str) {
        return encodeURIComponent(str)
            .replace(encodeReserveRE, encodeReserveReplacer)
            .replace(commaRE, ',');
    };
    var decode = decodeURIComponent;
    function resolveQuery(query, extraQuery, _parseQuery) {
        if (extraQuery === void 0) { extraQuery = {}; }
        var parse = _parseQuery || parseQuery;
        var parsedQuery;
        try {
            parsedQuery = parse(query || '');
        }
        catch (e) {
            warn(false, e.message);
            parsedQuery = {};
        }
        for (var key in extraQuery) {
            var val = extraQuery[key];
            parsedQuery[key] = Array.isArray(val) ? val.slice() : val;
        }
        return parsedQuery;
    }
    function parseQuery(query) {
        var res = {};
        query = query.trim().replace(/^(\?|#|&)/, '');
        if (!query) {
            return res;
        }
        query.split('&').forEach(function (param) {
            var parts = param.replace(/\+/g, ' ').split('=');
            var key = decode(parts.shift());
            var val = parts.length > 0 ? decode(parts.join('=')) : null;
            if (res[key] === undefined) {
                res[key] = val;
            }
            else if (Array.isArray(res[key])) {
                res[key].push(val);
            }
            else {
                res[key] = [res[key], val];
            }
        });
        return res;
    }
    function stringifyQuery(obj) {
        var res = obj
            ? Object.keys(obj)
                .map(function (key) {
                var val = obj[key];
                if (val === undefined) {
                    return '';
                }
                if (val === null) {
                    return encode(key);
                }
                if (Array.isArray(val)) {
                    var result_1 = [];
                    val.forEach(function (val2) {
                        if (val2 === undefined) {
                            return;
                        }
                        if (val2 === null) {
                            result_1.push(encode(key));
                        }
                        else {
                            result_1.push(encode(key) + '=' + encode(val2));
                        }
                    });
                    return result_1.join('&');
                }
                return encode(key) + '=' + encode(val);
            })
                .filter(function (x) { return x.length > 0; })
                .join('&')
            : null;
        return res ? "?" + res : '';
    }

    function isError(err) {
        return Object.prototype.toString.call(err).indexOf('Error') > -1;
    }
    var abort = function (err) {
        if (isError(err)) {
            warn(false, 'uncaught error during route navigation:');
            console.error(err);
        }
    };
    var BaseRouter = /** @class */ (function () {
        function BaseRouter(options) {
            this.maxStackSize = 50;
            this.cb = function (r) { };
            this.options = options;
            this.stack = [];
            this.index = -1;
            this.beforeHooks = [];
            this.afterHooks = [];
            // start with a route object that stands for "nowhere"
            this.current = START;
        }
        BaseRouter.prototype.go = function (n) { };
        BaseRouter.prototype.push = function (location, onComplete, onAbort) { };
        BaseRouter.prototype.replace = function (location, onComplete, onAbort) { };
        BaseRouter.prototype.resolveBeforeHooks = function (iterator, callback) {
            runQueue(this.beforeHooks, iterator, function () {
                callback();
            });
        };
        BaseRouter.prototype.resolve = function (location) {
            if (typeof location === 'string') {
                location = {
                    path: location,
                };
            }
            else if (!location.path && location.name) {
                location.path = resolvePathByName(location.name);
            }
            else if (location.path && !location.name) {
                location.name = resolveNameByPath(location.path);
            }
            if (!location.path && !location.name) {
                warn(false, 'Must provide location path or name!');
            }
            var pathObj = parsePath(location.path); // eg /pages/bookings/detail/index?guid=100  extract query
            var query = resolveQuery(pathObj.query, location.query);
            var queryString = stringifyQuery(query);
            return {
                name: location.name,
                path: pathObj.path,
                hash: pathObj.hash,
                pathname: pathObj.path,
                search: queryString,
                query: query,
            };
        };
        BaseRouter.prototype.transitionTo = function (location, excuteRouter) {
            var _this = this;
            var locationResolved = this.resolve(location);
            var toRoute = createRoute(locationResolved);
            var fromRoute = this.current;
            var iterator = function (hook, next) {
                try {
                    hook(toRoute, fromRoute, function (to) {
                        if (typeof to === 'string' ||
                            (typeof to === 'object' &&
                                (typeof to.path === 'string' ||
                                    typeof to.name === 'string'))) {
                            // next('/') or next({ path: '/' }) -> redirect
                            abort();
                            // use unpropriately may cause infinite call cycle （eg: push -> transitionTo -> push -> ...）
                            if (typeof to === 'object' && to.replace) {
                                //todos 只支持了两种跳转
                                _this.replace(to);
                            }
                            else {
                                _this.push(to);
                            }
                        }
                        else {
                            // confirm transition and pass on the value
                            next(to);
                        }
                    });
                }
                catch (e) {
                    abort(e);
                }
            };
            this.resolveBeforeHooks(iterator, function () {
                if (excuteRouter) {
                    excuteRouter({
                        route: toRoute,
                        pathname: locationResolved.pathname,
                        search: locationResolved.search,
                        onCompleteProxy: function (onComplete) {
                            onComplete && onComplete();
                            _this.updateRoute(toRoute);
                        },
                    });
                }
                else {
                    _this.updateRoute(toRoute);
                    _this.pushStack(toRoute);
                }
            });
        };
        BaseRouter.prototype.pushStack = function (route) {
            this.stack = this.stack
                .slice(0, this.index + 1)
                .concat(route)
                .slice(-this.maxStackSize); //take go(n) into consideration
            this.index++;
        };
        //change current route and excuteAfter hooks
        BaseRouter.prototype.updateRoute = function (route) {
            var prev = this.current;
            this.current = route;
            this.cb && this.cb(route);
            this.afterHooks.forEach(function (hook) {
                hook && hook(route, prev);
            });
        };
        BaseRouter.prototype.beforeEach = function (fn) {
            return registerHook(this.beforeHooks, fn);
        };
        BaseRouter.prototype.afterEach = function (fn) {
            return registerHook(this.afterHooks, fn);
        };
        BaseRouter.prototype.listen = function (cb) {
            this.cb = cb;
        };
        //enable watch($route)
        BaseRouter.prototype.init = function (app) {
            this.listen(function (route) {
                app._route = route;
            });
        };
        BaseRouter.install = install;
        return BaseRouter;
    }());
    function registerHook(list, fn) {
        list.push(fn);
        return function () {
            var i = list.indexOf(fn);
            if (i > -1)
                list.splice(i, 1);
        };
    }

    var UniRouter = /** @class */ (function (_super) {
        __extends(UniRouter, _super);
        function UniRouter(options) {
            var _this = _super.call(this, options) || this;
            /**
             * 这个字段主要是提供一个 uniapp的back没法被proxy，监听不到的hack方案
             * 通过这个字段来标记路由跳转是否通过UniRouter，没有的话就执行路由补丁，详细参加readme.md文档
             **/
            _this.navigationMethodName = '';
            return _this;
        }
        /**
         *  pushTab的stack处理方式目前的跟 push相同，按照文档 https://uniapp.dcloud.io/api/router?id=switchtab，
         *  需要传递参数进来才能处理掉非tabbar页面
         **/
        UniRouter.prototype.pushTab = function (location, onComplete, onAbort) {
            var _this = this;
            var methodName = 'pushTab';
            if (!onComplete && !onAbort && typeof Promise !== 'undefined') {
                return new Promise(function (resolve, reject) {
                    _this[methodName](location, resolve, reject);
                });
            }
            this.transitionTo(location, function (options) {
                uni[methodMap[methodName]]({
                    url: "" + options.pathname + options.search,
                    success: options.onCompleteProxy(function () {
                        // this.pushStack(options.route);
                        _this.navigationMethodName = methodName;
                        _this.stack = [options.route];
                        _this.index = 0;
                        onComplete && onComplete();
                    }),
                    fail: onAbort,
                });
            });
        };
        UniRouter.prototype.push = function (location, onComplete, onAbort) {
            var _this = this;
            var methodName = 'push';
            if (!onComplete && !onAbort && typeof Promise !== 'undefined') {
                return new Promise(function (resolve, reject) {
                    _this[methodName](location, resolve, reject);
                });
            }
            this.transitionTo(location, function (options) {
                uni[methodMap[methodName]]({
                    url: "" + options.pathname + options.search,
                    success: options.onCompleteProxy(function () {
                        _this.navigationMethodName = methodName;
                        _this.pushStack(options.route);
                        onComplete && onComplete();
                    }),
                    fail: onAbort,
                });
            });
        };
        UniRouter.prototype.replace = function (location, onComplete, onAbort) {
            var _this = this;
            var methodName = 'replace';
            if (!onComplete && !onAbort && typeof Promise !== 'undefined') {
                return new Promise(function (resolve, reject) {
                    _this[methodName](location, resolve, reject);
                });
            }
            this.transitionTo(location, function (options) {
                uni[methodMap[methodName]]({
                    url: "" + options.pathname + options.search,
                    success: options.onCompleteProxy(function () {
                        _this.navigationMethodName = methodName;
                        _this.stack = _this.stack
                            .slice(0, _this.index)
                            .concat(options.route);
                        onComplete && onComplete();
                    }),
                    fail: onAbort,
                });
            });
        };
        UniRouter.prototype.replaceAll = function (location, onComplete, onAbort) {
            var _this = this;
            var methodName = 'replaceAll';
            if (!onComplete && !onAbort && typeof Promise !== 'undefined') {
                return new Promise(function (resolve, reject) {
                    _this[methodName](location, resolve, reject);
                });
            }
            this.transitionTo(location, function (options) {
                uni[methodMap[methodName]]({
                    url: "" + options.pathname + options.search,
                    success: options.onCompleteProxy(function () {
                        _this.navigationMethodName = methodName;
                        _this.stack = [options.route];
                        _this.index = 0;
                        onComplete && onComplete();
                    }),
                    fail: onAbort,
                });
            });
        };
        UniRouter.prototype.back = function (n) {
            if (n === void 0) { n = 1; }
            this.go(-n);
        };
        UniRouter.prototype.go = function (n) {
            var _this = this;
            if (n === void 0) { n = 0; }
            var methodName = 'back';
            /**
             * 直接调用uni-app的api，防止目前的stack出现问题导致回退失败，之后再移到transitionTo的回掉里面
             * 因为现在可能导致back无法进行问题的原因（onLoanch,switchTab,back等非UniRouter监控的地方）
             */
            uni[methodMap['back']]({
                delta: -n,
            });
            var targetIndex = this.index + n;
            if (targetIndex < 0 || targetIndex >= this.stack.length) {
                warn(false, "[back go history error]: target index: " + targetIndex + ", current index: " + this.index + ", history stack info: " + this.stack + " ");
                return;
            }
            var route = this.stack[targetIndex];
            return this.transitionTo(route, function (options) {
                options.onCompleteProxy(function () {
                    _this.navigationMethodName = methodName;
                    _this.stack = _this.stack.slice(0, targetIndex + 1);
                    _this.index = targetIndex;
                });
                // uni[methodMap['back']]({
                //     delta: -n
                // });
            });
        };
        return UniRouter;
    }(BaseRouter));

    exports.UniRouter = UniRouter;
    exports.default = UniRouter;

    Object.defineProperty(exports, '__esModule', { value: true });

}));
