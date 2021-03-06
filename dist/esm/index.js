/**
  * uniapp-router v2.0.1
  * (c) 2020 wizardpisces
  * @license MIT
  */
import _Vue from 'vue';

const methodMap = {
    push: 'navigateTo',
    pushTab: 'switchTab',
    replace: 'redirectTo',
    replaceAll: 'reLaunch',
    back: 'navigateBack',
};
const NAME_SPLITTER = '-';

function warn(condition, message) {
}

function parsePath(path = '') {
    let hash = '';
    let query = '';
    const hashIndex = path.indexOf('#');
    if (hashIndex >= 0) {
        hash = path.slice(hashIndex);
        path = path.slice(0, hashIndex);
    }
    const queryIndex = path.indexOf('?');
    if (queryIndex >= 0) {
        query = path.slice(queryIndex + 1);
        path = path.slice(0, queryIndex);
    }
    return {
        path,
        query,
        hash,
    };
}
function addPrefixSlash(str) {
    return str[0] !== '/' ? '/' + str : str;
}
function removeFirstAndLastSlash(str) {
    return str.replace(/^\/|\/$/g, '');
}

// todos add nested route
function deepClone(data) {
    if (typeof data === 'string') {
        return JSON.parse(data);
    }
    return JSON.parse(JSON.stringify(data));
}
class RouteMap {
    constructor(options) {
        this._routeTable = [];
        if (!options.pagesJSON) {
            return;
        }
        options.pagesJSON = deepClone(options.pagesJSON);
        this._routeTable = generateRouterConfigByPagesJson(options.pagesJSON);
    }
    resolvePathByName(routeName) {
        let routes = this._routeTable;
        let matchedRoute = routes.filter((route) => {
            return routeName === route.name;
        });
        return matchedRoute && matchedRoute[0].path;
    }
    resolveNameByPath(routePath) {
        let routes = this._routeTable;
        let matchedRoute = routes.filter((route) => {
            return isSamePath(routePath, route.path);
        });
        function isSamePath(path1, path2) {
            return removeFirstAndLastSlash(path1) === removeFirstAndLastSlash(path2);
        }
        return matchedRoute && matchedRoute[0].name;
    }
}
/**
 * 通过pages.json生成 router table
 */
function generateRouterConfigByPagesJson(pagesJSON) {
    function transformPathToName(path) {
        return removeFirstAndLastSlash(path).split('/').join(NAME_SPLITTER);
    }
    function generateRouteConfig(pages, root = '') {
        return pages.reduce((config, cur) => {
            cur.path = removeFirstAndLastSlash(cur.path);
            if (root) {
                cur.path = root + '/' + cur.path;
            }
            // /pages/bookings/detail/index => pages-bookings-detail-index
            if (!cur.name) {
                cur.name = transformPathToName(cur.path);
            }
            cur.path = addPrefixSlash(cur.path);
            config.push(cur);
            return config;
        }, []);
    }
    let routerConfig = generateRouteConfig(pagesJSON.pages);
    if (pagesJSON.subPackages) {
        routerConfig = routerConfig.concat(pagesJSON.subPackages.reduce((config, cur) => {
            return config.concat(generateRouteConfig(cur.pages, cur.root));
        }, []));
    }
    console.log('[router config generated from pages.json]:', routerConfig);
    return routerConfig;
}

function runQueue(queue, fn, cb) {
    const step = (index) => {
        if (index >= queue.length) {
            cb();
        }
        else {
            if (queue[index]) {
                fn(queue[index], () => {
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

let installed = false;
const isDef = (v) => v !== undefined;
function install(Vue) {
    if (installed && _Vue === Vue)
        return;
    installed = true;
    let _vm = {
        _router: {},
        _route: {},
    };
    Vue.mixin({
        beforeCreate() {
            if (isDef(this.$options.router)) {
                let _router = this.$options.router;
                _vm._router = _router;
                _vm._router.init(_vm);
                Vue.util.defineReactive(_vm, '_route', _router.current);
            }
        },
    });
    Object.defineProperty(Vue.prototype, '$router', {
        get() {
            return _vm._router;
        },
    });
    Object.defineProperty(Vue.prototype, '$route', {
        get() {
            return _vm._route;
        },
    });
    // Vue.component('router-link', RouterLink);
}

//copied from https://github.com/vuejs/vue-router/blob/dev/src/util/query.js
const encodeReserveRE = /[!'()*]/g;
const encodeReserveReplacer = (c) => '%' + c.charCodeAt(0).toString(16);
const commaRE = /%2C/g;
// fixed encodeURIComponent which is more conformant to RFC3986:
// - escapes [!'()*]
// - preserve commas
const encode = (str) => encodeURIComponent(str)
    .replace(encodeReserveRE, encodeReserveReplacer)
    .replace(commaRE, ',');
const decode = decodeURIComponent;
function resolveQuery(query, extraQuery = {}, _parseQuery) {
    const parse = _parseQuery || parseQuery;
    let parsedQuery;
    try {
        parsedQuery = parse(query || '');
    }
    catch (e) {
        warn(false, e.message);
        parsedQuery = {};
    }
    for (const key in extraQuery) {
        const val = extraQuery[key];
        parsedQuery[key] = Array.isArray(val) ? val.slice() : val;
    }
    return parsedQuery;
}
function parseQuery(query) {
    const res = {};
    query = query.trim().replace(/^(\?|#|&)/, '');
    if (!query) {
        return res;
    }
    query.split('&').forEach(param => {
        const parts = param.replace(/\+/g, ' ').split('=');
        const key = decode(parts.shift());
        const val = parts.length > 0 ? decode(parts.join('=')) : null;
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
    const res = obj
        ? Object.keys(obj)
            .map(key => {
            const val = obj[key];
            if (val === undefined) {
                return '';
            }
            if (val === null) {
                return encode(key);
            }
            if (Array.isArray(val)) {
                const result = [];
                val.forEach(val2 => {
                    if (val2 === undefined) {
                        return;
                    }
                    if (val2 === null) {
                        result.push(encode(key));
                    }
                    else {
                        result.push(encode(key) + '=' + encode(val2));
                    }
                });
                return result.join('&');
            }
            return encode(key) + '=' + encode(val);
        })
            .filter(x => x.length > 0)
            .join('&')
        : null;
    return res ? `?${res}` : '';
}

function createRoute(location) {
    const route = {
        name: location.name,
        path: location.path || '/',
        query: location.query || {},
    };
    return Object.freeze(route);
}
const START = createRoute({
    path: '/',
});

function isError(err) {
    return Object.prototype.toString.call(err).indexOf('Error') > -1;
}
const abort = (err) => {
    if (isError(err)) {
        console.error(err);
    }
};
class BaseRouter {
    constructor(options) {
        this.maxStackSize = 50;
        this.cb = (r) => { };
        this.options = options;
        this.stack = [];
        this.index = -1;
        this.beforeHooks = [];
        this.afterHooks = [];
        // start with a route object that stands for "nowhere"
        this.current = START;
        this.routeMap = new RouteMap(options);
    }
    go(n) { }
    push(location, onComplete, onAbort) { }
    replace(location, onComplete, onAbort) { }
    resolveBeforeHooks(iterator, callback) {
        runQueue(this.beforeHooks, iterator, () => {
            callback();
        });
    }
    resolve(location) {
        if (typeof location === 'string') {
            location = {
                path: location,
            };
        }
        else if (!location.path && location.name) {
            location.path = this.routeMap.resolvePathByName(location.name);
        }
        else if (location.path && !location.name) {
            location.name = this.routeMap.resolveNameByPath(location.path);
        }
        if (!location.path && !location.name) ;
        let pathObj = parsePath(location.path); // eg /pages/bookings/detail/index?guid=100  extract query
        let query = resolveQuery(pathObj.query, location.query);
        let queryString = stringifyQuery(query);
        return {
            name: location.name,
            path: pathObj.path,
            hash: pathObj.hash,
            pathname: pathObj.path,
            search: queryString,
            query: query,
        };
    }
    transitionTo(location, excuteRouter) {
        let locationResolved = this.resolve(location);
        let toRoute = createRoute(locationResolved);
        let fromRoute = this.current;
        const iterator = (hook, next) => {
            try {
                hook(toRoute, fromRoute, (to) => {
                    if (typeof to === 'string' ||
                        (typeof to === 'object' &&
                            (typeof to.path === 'string' ||
                                typeof to.name === 'string'))) {
                        // next('/') or next({ path: '/' }) -> redirect
                        abort();
                        // use unpropriately may cause infinite call cycle （eg: push -> transitionTo -> push -> ...）
                        if (typeof to === 'object' && to.replace) {
                            //todos 只支持了两种跳转
                            this.replace(to);
                        }
                        else {
                            this.push(to);
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
        this.resolveBeforeHooks(iterator, () => {
            if (excuteRouter) {
                excuteRouter({
                    route: toRoute,
                    pathname: locationResolved.pathname,
                    search: locationResolved.search,
                    onCompleteProxy: (onComplete) => {
                        onComplete && onComplete();
                        this.updateRoute(toRoute);
                    },
                });
            }
            else {
                this.updateRoute(toRoute);
                this.pushStack(toRoute);
            }
        });
    }
    pushStack(route) {
        this.stack = this.stack
            .slice(0, this.index + 1)
            .concat(route)
            .slice(-this.maxStackSize); //take go(n) into consideration
        this.index++;
    }
    //change current route and excuteAfter hooks
    updateRoute(route) {
        const prev = this.current;
        this.current = route;
        this.cb && this.cb(route);
        this.afterHooks.forEach((hook) => {
            hook && hook(route, prev);
        });
    }
    beforeEach(fn) {
        return registerHook(this.beforeHooks, fn);
    }
    afterEach(fn) {
        return registerHook(this.afterHooks, fn);
    }
    listen(cb) {
        this.cb = cb;
    }
    //enable watch($route)
    init(app) {
        this.listen((route) => {
            app._route = route;
        });
    }
}
BaseRouter.install = install;
function registerHook(list, fn) {
    list.push(fn);
    return () => {
        const i = list.indexOf(fn);
        if (i > -1)
            list.splice(i, 1);
    };
}

class UniRouter extends BaseRouter {
    constructor(options) {
        super(options);
        /**
         * 这个字段主要是提供一个 uniapp的back没法被proxy，监听不到的hack方案
         * 通过这个字段来标记路由跳转是否通过UniRouter，没有的话就执行路由补丁，详细参加readme.md文档
         **/
        this.navigationMethodName = '';
    }
    /**
     *  pushTab的stack处理方式目前的跟 push相同，按照文档 https://uniapp.dcloud.io/api/router?id=switchtab，
     *  需要传递参数进来才能处理掉非tabbar页面
     **/
    pushTab(location, onComplete, onAbort) {
        const methodName = 'pushTab';
        if (!onComplete && !onAbort && typeof Promise !== 'undefined') {
            return new Promise((resolve, reject) => {
                this[methodName](location, resolve, reject);
            });
        }
        this.transitionTo(location, (options) => {
            uni[methodMap[methodName]]({
                url: `${options.pathname}${options.search}`,
                success: options.onCompleteProxy(() => {
                    // this.pushStack(options.route);
                    this.navigationMethodName = methodName;
                    this.stack = [options.route];
                    this.index = 0;
                    onComplete && onComplete();
                }),
                fail: onAbort,
            });
        });
    }
    push(location, onComplete, onAbort) {
        const methodName = 'push';
        if (!onComplete && !onAbort && typeof Promise !== 'undefined') {
            return new Promise((resolve, reject) => {
                this[methodName](location, resolve, reject);
            });
        }
        this.transitionTo(location, (options) => {
            uni[methodMap[methodName]]({
                url: `${options.pathname}${options.search}`,
                success: options.onCompleteProxy(() => {
                    this.navigationMethodName = methodName;
                    this.pushStack(options.route);
                    onComplete && onComplete();
                }),
                fail: onAbort,
            });
        });
    }
    replace(location, onComplete, onAbort) {
        const methodName = 'replace';
        if (!onComplete && !onAbort && typeof Promise !== 'undefined') {
            return new Promise((resolve, reject) => {
                this[methodName](location, resolve, reject);
            });
        }
        this.transitionTo(location, (options) => {
            uni[methodMap[methodName]]({
                url: `${options.pathname}${options.search}`,
                success: options.onCompleteProxy(() => {
                    this.navigationMethodName = methodName;
                    this.stack = this.stack
                        .slice(0, this.index)
                        .concat(options.route);
                    onComplete && onComplete();
                }),
                fail: onAbort,
            });
        });
    }
    replaceAll(location, onComplete, onAbort) {
        const methodName = 'replaceAll';
        if (!onComplete && !onAbort && typeof Promise !== 'undefined') {
            return new Promise((resolve, reject) => {
                this[methodName](location, resolve, reject);
            });
        }
        this.transitionTo(location, (options) => {
            uni[methodMap[methodName]]({
                url: `${options.pathname}${options.search}`,
                success: options.onCompleteProxy(() => {
                    this.navigationMethodName = methodName;
                    this.stack = [options.route];
                    this.index = 0;
                    onComplete && onComplete();
                }),
                fail: onAbort,
            });
        });
    }
    back(n = 1) {
        this.go(-n);
    }
    go(n = 0) {
        const methodName = 'back';
        /**
         * 直接调用uni-app的api，防止目前的stack出现问题导致回退失败，之后再移到transitionTo的回掉里面
         * 因为现在可能导致back无法进行问题的原因（onLoanch,switchTab,back等非UniRouter监控的地方）
         */
        uni[methodMap['back']]({
            delta: -n,
        });
        const targetIndex = this.index + n;
        if (targetIndex < 0 || targetIndex >= this.stack.length) {
            warn(false, `[back go history error]: target index: ${targetIndex}, current index: ${this.index}, history stack info: ${this.stack} `);
            return;
        }
        const route = this.stack[targetIndex];
        return this.transitionTo(route, (options) => {
            options.onCompleteProxy(() => {
                this.navigationMethodName = methodName;
                this.stack = this.stack.slice(0, targetIndex + 1);
                this.index = targetIndex;
            });
            // uni[methodMap['back']]({
            //     delta: -n
            // });
        });
    }
}

export default UniRouter;
