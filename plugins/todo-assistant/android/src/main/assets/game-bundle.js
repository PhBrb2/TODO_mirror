var GameBundle = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };
  var __esm = (fn, res, err) => function __init() {
    if (err) throw err[0];
    try {
      return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
    } catch (e) {
      throw err = [e], e;
    }
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
  var __async = (__this, __arguments, generator) => {
    return new Promise((resolve, reject) => {
      var fulfilled = (value) => {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      };
      var rejected = (value) => {
        try {
          step(generator.throw(value));
        } catch (e) {
          reject(e);
        }
      };
      var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
      step((generator = generator.apply(__this, __arguments)).next());
    });
  };

  // node_modules/@capacitor/core/dist/index.js
  var ExceptionCode, CapacitorException, getPlatformId, createCapacitor, initCapacitorGlobal, Capacitor, registerPlugin, WebPlugin, encode, decode, CapacitorCookiesPluginWeb, CapacitorCookies, readBlobAsBase64, normalizeHttpHeaders, buildUrlParams, buildRequestInit, CapacitorHttpPluginWeb, CapacitorHttp, SystemBarsStyle, SystemBarType, SystemBarsPluginWeb, SystemBars;
  var init_dist = __esm({
    "node_modules/@capacitor/core/dist/index.js"() {
      (function(ExceptionCode2) {
        ExceptionCode2["Unimplemented"] = "UNIMPLEMENTED";
        ExceptionCode2["Unavailable"] = "UNAVAILABLE";
      })(ExceptionCode || (ExceptionCode = {}));
      CapacitorException = class extends Error {
        constructor(message, code, data) {
          super(message);
          this.message = message;
          this.code = code;
          this.data = data;
        }
      };
      getPlatformId = (win) => {
        var _a, _b;
        if (win === null || win === void 0 ? void 0 : win.androidBridge) {
          return "android";
        } else if ((_b = (_a = win === null || win === void 0 ? void 0 : win.webkit) === null || _a === void 0 ? void 0 : _a.messageHandlers) === null || _b === void 0 ? void 0 : _b.bridge) {
          return "ios";
        } else {
          return "web";
        }
      };
      createCapacitor = (win) => {
        const capCustomPlatform = win.CapacitorCustomPlatform || null;
        const cap = win.Capacitor || {};
        const Plugins = cap.Plugins = cap.Plugins || {};
        const getPlatform = () => {
          return capCustomPlatform !== null ? capCustomPlatform.name : getPlatformId(win);
        };
        const isNativePlatform = () => getPlatform() !== "web";
        const isPluginAvailable = (pluginName) => {
          const plugin = registeredPlugins.get(pluginName);
          if (plugin === null || plugin === void 0 ? void 0 : plugin.platforms.has(getPlatform())) {
            return true;
          }
          if (getPluginHeader(pluginName)) {
            return true;
          }
          return false;
        };
        const getPluginHeader = (pluginName) => {
          var _a;
          return (_a = cap.PluginHeaders) === null || _a === void 0 ? void 0 : _a.find((h) => h.name === pluginName);
        };
        const handleError = (err) => win.console.error(err);
        const registeredPlugins = /* @__PURE__ */ new Map();
        const registerPlugin2 = (pluginName, jsImplementations = {}) => {
          const registeredPlugin = registeredPlugins.get(pluginName);
          if (registeredPlugin) {
            console.warn(`Capacitor plugin "${pluginName}" already registered. Cannot register plugins twice.`);
            return registeredPlugin.proxy;
          }
          const platform = getPlatform();
          const pluginHeader = getPluginHeader(pluginName);
          let jsImplementation;
          const loadPluginImplementation = () => __async(null, null, function* () {
            if (!jsImplementation && platform in jsImplementations) {
              jsImplementation = typeof jsImplementations[platform] === "function" ? jsImplementation = yield jsImplementations[platform]() : jsImplementation = jsImplementations[platform];
            } else if (capCustomPlatform !== null && !jsImplementation && "web" in jsImplementations) {
              jsImplementation = typeof jsImplementations["web"] === "function" ? jsImplementation = yield jsImplementations["web"]() : jsImplementation = jsImplementations["web"];
            }
            return jsImplementation;
          });
          const createPluginMethod = (impl, prop) => {
            var _a, _b;
            if (pluginHeader) {
              const methodHeader = pluginHeader === null || pluginHeader === void 0 ? void 0 : pluginHeader.methods.find((m) => prop === m.name);
              if (methodHeader) {
                if (methodHeader.rtype === "promise") {
                  return (options) => cap.nativePromise(pluginName, prop.toString(), options);
                } else {
                  return (options, callback) => cap.nativeCallback(pluginName, prop.toString(), options, callback);
                }
              } else if (impl) {
                return (_a = impl[prop]) === null || _a === void 0 ? void 0 : _a.bind(impl);
              }
            } else if (impl) {
              return (_b = impl[prop]) === null || _b === void 0 ? void 0 : _b.bind(impl);
            } else {
              throw new CapacitorException(`"${pluginName}" plugin is not implemented on ${platform}`, ExceptionCode.Unimplemented);
            }
          };
          const createPluginMethodWrapper = (prop) => {
            let remove;
            const wrapper = (...args) => {
              const p = loadPluginImplementation().then((impl) => {
                const fn = createPluginMethod(impl, prop);
                if (fn) {
                  const p2 = fn(...args);
                  remove = p2 === null || p2 === void 0 ? void 0 : p2.remove;
                  return p2;
                } else {
                  throw new CapacitorException(`"${pluginName}.${prop}()" is not implemented on ${platform}`, ExceptionCode.Unimplemented);
                }
              });
              if (prop === "addListener") {
                p.remove = () => __async(null, null, function* () {
                  return remove();
                });
              }
              return p;
            };
            wrapper.toString = () => `${prop.toString()}() { [capacitor code] }`;
            Object.defineProperty(wrapper, "name", {
              value: prop,
              writable: false,
              configurable: false
            });
            return wrapper;
          };
          const addListener = createPluginMethodWrapper("addListener");
          const removeListener = createPluginMethodWrapper("removeListener");
          const addListenerNative = (eventName, callback) => {
            const call = addListener({ eventName }, callback);
            const remove = () => __async(null, null, function* () {
              const callbackId = yield call;
              removeListener({
                eventName,
                callbackId
              }, callback);
            });
            const p = new Promise((resolve) => call.then(() => resolve({ remove })));
            p.remove = () => __async(null, null, function* () {
              console.warn(`Using addListener() without 'await' is deprecated.`);
              yield remove();
            });
            return p;
          };
          const proxy = new Proxy({}, {
            get(_, prop) {
              switch (prop) {
                // https://github.com/facebook/react/issues/20030
                case "$$typeof":
                  return void 0;
                case "toJSON":
                  return () => ({});
                case "addListener":
                  return pluginHeader ? addListenerNative : addListener;
                case "removeListener":
                  return removeListener;
                default:
                  return createPluginMethodWrapper(prop);
              }
            }
          });
          Plugins[pluginName] = proxy;
          registeredPlugins.set(pluginName, {
            name: pluginName,
            proxy,
            platforms: /* @__PURE__ */ new Set([...Object.keys(jsImplementations), ...pluginHeader ? [platform] : []])
          });
          return proxy;
        };
        if (!cap.convertFileSrc) {
          cap.convertFileSrc = (filePath) => filePath;
        }
        cap.getPlatform = getPlatform;
        cap.handleError = handleError;
        cap.isNativePlatform = isNativePlatform;
        cap.isPluginAvailable = isPluginAvailable;
        cap.registerPlugin = registerPlugin2;
        cap.Exception = CapacitorException;
        cap.DEBUG = !!cap.DEBUG;
        cap.isLoggingEnabled = !!cap.isLoggingEnabled;
        return cap;
      };
      initCapacitorGlobal = (win) => win.Capacitor = createCapacitor(win);
      Capacitor = /* @__PURE__ */ initCapacitorGlobal(typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : {});
      registerPlugin = Capacitor.registerPlugin;
      WebPlugin = class {
        constructor() {
          this.listeners = {};
          this.retainedEventArguments = {};
          this.windowListeners = {};
        }
        addListener(eventName, listenerFunc) {
          let firstListener = false;
          const listeners = this.listeners[eventName];
          if (!listeners) {
            this.listeners[eventName] = [];
            firstListener = true;
          }
          this.listeners[eventName].push(listenerFunc);
          const windowListener = this.windowListeners[eventName];
          if (windowListener && !windowListener.registered) {
            this.addWindowListener(windowListener);
          }
          if (firstListener) {
            this.sendRetainedArgumentsForEvent(eventName);
          }
          const remove = () => __async(this, null, function* () {
            return this.removeListener(eventName, listenerFunc);
          });
          const p = Promise.resolve({ remove });
          return p;
        }
        removeAllListeners() {
          return __async(this, null, function* () {
            this.listeners = {};
            for (const listener in this.windowListeners) {
              this.removeWindowListener(this.windowListeners[listener]);
            }
            this.windowListeners = {};
          });
        }
        notifyListeners(eventName, data, retainUntilConsumed) {
          const listeners = this.listeners[eventName];
          if (!listeners) {
            if (retainUntilConsumed) {
              let args = this.retainedEventArguments[eventName];
              if (!args) {
                args = [];
              }
              args.push(data);
              this.retainedEventArguments[eventName] = args;
            }
            return;
          }
          listeners.forEach((listener) => listener(data));
        }
        hasListeners(eventName) {
          var _a;
          return !!((_a = this.listeners[eventName]) === null || _a === void 0 ? void 0 : _a.length);
        }
        registerWindowListener(windowEventName, pluginEventName) {
          this.windowListeners[pluginEventName] = {
            registered: false,
            windowEventName,
            pluginEventName,
            handler: (event) => {
              this.notifyListeners(pluginEventName, event);
            }
          };
        }
        unimplemented(msg = "not implemented") {
          return new Capacitor.Exception(msg, ExceptionCode.Unimplemented);
        }
        unavailable(msg = "not available") {
          return new Capacitor.Exception(msg, ExceptionCode.Unavailable);
        }
        removeListener(eventName, listenerFunc) {
          return __async(this, null, function* () {
            const listeners = this.listeners[eventName];
            if (!listeners) {
              return;
            }
            const index = listeners.indexOf(listenerFunc);
            if (index !== -1) {
              this.listeners[eventName].splice(index, 1);
            }
            if (!this.listeners[eventName].length) {
              this.removeWindowListener(this.windowListeners[eventName]);
            }
          });
        }
        addWindowListener(handle) {
          window.addEventListener(handle.windowEventName, handle.handler);
          handle.registered = true;
        }
        removeWindowListener(handle) {
          if (!handle) {
            return;
          }
          window.removeEventListener(handle.windowEventName, handle.handler);
          handle.registered = false;
        }
        sendRetainedArgumentsForEvent(eventName) {
          const args = this.retainedEventArguments[eventName];
          if (!args) {
            return;
          }
          delete this.retainedEventArguments[eventName];
          args.forEach((arg) => {
            this.notifyListeners(eventName, arg);
          });
        }
      };
      encode = (str2) => encodeURIComponent(str2).replace(/%(2[346B]|5E|60|7C)/g, decodeURIComponent).replace(/[()]/g, escape);
      decode = (str2) => str2.replace(/(%[\dA-F]{2})+/gi, decodeURIComponent);
      CapacitorCookiesPluginWeb = class extends WebPlugin {
        getCookies() {
          return __async(this, null, function* () {
            const cookies = document.cookie;
            const cookieMap = {};
            cookies.split(";").forEach((cookie) => {
              if (cookie.length <= 0)
                return;
              let [key, value] = cookie.replace(/=/, "CAP_COOKIE").split("CAP_COOKIE");
              key = decode(key).trim();
              value = decode(value).trim();
              cookieMap[key] = value;
            });
            return cookieMap;
          });
        }
        setCookie(options) {
          return __async(this, null, function* () {
            try {
              const encodedKey = encode(options.key);
              const encodedValue = encode(options.value);
              const expires = options.expires ? `; expires=${options.expires.replace("expires=", "")}` : "";
              const path = (options.path || "/").replace("path=", "");
              const domain = options.url != null && options.url.length > 0 ? `domain=${options.url}` : "";
              document.cookie = `${encodedKey}=${encodedValue || ""}${expires}; path=${path}; ${domain};`;
            } catch (error) {
              return Promise.reject(error);
            }
          });
        }
        deleteCookie(options) {
          return __async(this, null, function* () {
            try {
              document.cookie = `${options.key}=; Max-Age=0`;
            } catch (error) {
              return Promise.reject(error);
            }
          });
        }
        clearCookies() {
          return __async(this, null, function* () {
            try {
              const cookies = document.cookie.split(";") || [];
              for (const cookie of cookies) {
                document.cookie = cookie.replace(/^ +/, "").replace(/=.*/, `=;expires=${(/* @__PURE__ */ new Date()).toUTCString()};path=/`);
              }
            } catch (error) {
              return Promise.reject(error);
            }
          });
        }
        clearAllCookies() {
          return __async(this, null, function* () {
            try {
              yield this.clearCookies();
            } catch (error) {
              return Promise.reject(error);
            }
          });
        }
      };
      CapacitorCookies = registerPlugin("CapacitorCookies", {
        web: () => new CapacitorCookiesPluginWeb()
      });
      readBlobAsBase64 = (blob) => __async(null, null, function* () {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const base64String = reader.result;
            resolve(base64String.indexOf(",") >= 0 ? base64String.split(",")[1] : base64String);
          };
          reader.onerror = (error) => reject(error);
          reader.readAsDataURL(blob);
        });
      });
      normalizeHttpHeaders = (headers = {}) => {
        const originalKeys = Object.keys(headers);
        const loweredKeys = Object.keys(headers).map((k) => k.toLocaleLowerCase());
        const normalized = loweredKeys.reduce((acc, key, index) => {
          acc[key] = headers[originalKeys[index]];
          return acc;
        }, {});
        return normalized;
      };
      buildUrlParams = (params, shouldEncode = true) => {
        if (!params)
          return null;
        const output = Object.entries(params).reduce((accumulator, entry) => {
          const [key, value] = entry;
          let encodedValue;
          let item;
          if (Array.isArray(value)) {
            item = "";
            value.forEach((str2) => {
              encodedValue = shouldEncode ? encodeURIComponent(str2) : str2;
              item += `${key}=${encodedValue}&`;
            });
            item.slice(0, -1);
          } else {
            encodedValue = shouldEncode ? encodeURIComponent(value) : value;
            item = `${key}=${encodedValue}`;
          }
          return `${accumulator}&${item}`;
        }, "");
        return output.substr(1);
      };
      buildRequestInit = (options, extra = {}) => {
        const output = Object.assign({ method: options.method || "GET", headers: options.headers }, extra);
        const headers = normalizeHttpHeaders(options.headers);
        const type = headers["content-type"] || "";
        if (typeof options.data === "string") {
          output.body = options.data;
        } else if (type.includes("application/x-www-form-urlencoded")) {
          const params = new URLSearchParams();
          for (const [key, value] of Object.entries(options.data || {})) {
            params.set(key, value);
          }
          output.body = params.toString();
        } else if (type.includes("multipart/form-data") || options.data instanceof FormData) {
          const form = new FormData();
          if (options.data instanceof FormData) {
            options.data.forEach((value, key) => {
              form.append(key, value);
            });
          } else {
            for (const key of Object.keys(options.data)) {
              form.append(key, options.data[key]);
            }
          }
          output.body = form;
          const headers2 = new Headers(output.headers);
          headers2.delete("content-type");
          output.headers = headers2;
        } else if (type.includes("application/json") || typeof options.data === "object") {
          output.body = JSON.stringify(options.data);
        }
        return output;
      };
      CapacitorHttpPluginWeb = class extends WebPlugin {
        /**
         * Perform an Http request given a set of options
         * @param options Options to build the HTTP request
         */
        request(options) {
          return __async(this, null, function* () {
            const requestInit = buildRequestInit(options, options.webFetchExtra);
            const urlParams = buildUrlParams(options.params, options.shouldEncodeUrlParams);
            const url = urlParams ? `${options.url}?${urlParams}` : options.url;
            const response = yield fetch(url, requestInit);
            const contentType = response.headers.get("content-type") || "";
            let { responseType = "text" } = response.ok ? options : {};
            if (contentType.includes("application/json")) {
              responseType = "json";
            }
            let data;
            let blob;
            switch (responseType) {
              case "arraybuffer":
              case "blob":
                blob = yield response.blob();
                data = yield readBlobAsBase64(blob);
                break;
              case "json":
                data = yield response.json();
                break;
              case "document":
              case "text":
              default:
                data = yield response.text();
            }
            const headers = {};
            response.headers.forEach((value, key) => {
              headers[key] = value;
            });
            return {
              data,
              headers,
              status: response.status,
              url: response.url
            };
          });
        }
        /**
         * Perform an Http GET request given a set of options
         * @param options Options to build the HTTP request
         */
        get(options) {
          return __async(this, null, function* () {
            return this.request(Object.assign(Object.assign({}, options), { method: "GET" }));
          });
        }
        /**
         * Perform an Http POST request given a set of options
         * @param options Options to build the HTTP request
         */
        post(options) {
          return __async(this, null, function* () {
            return this.request(Object.assign(Object.assign({}, options), { method: "POST" }));
          });
        }
        /**
         * Perform an Http PUT request given a set of options
         * @param options Options to build the HTTP request
         */
        put(options) {
          return __async(this, null, function* () {
            return this.request(Object.assign(Object.assign({}, options), { method: "PUT" }));
          });
        }
        /**
         * Perform an Http PATCH request given a set of options
         * @param options Options to build the HTTP request
         */
        patch(options) {
          return __async(this, null, function* () {
            return this.request(Object.assign(Object.assign({}, options), { method: "PATCH" }));
          });
        }
        /**
         * Perform an Http DELETE request given a set of options
         * @param options Options to build the HTTP request
         */
        delete(options) {
          return __async(this, null, function* () {
            return this.request(Object.assign(Object.assign({}, options), { method: "DELETE" }));
          });
        }
      };
      CapacitorHttp = registerPlugin("CapacitorHttp", {
        web: () => new CapacitorHttpPluginWeb()
      });
      (function(SystemBarsStyle2) {
        SystemBarsStyle2["Dark"] = "DARK";
        SystemBarsStyle2["Light"] = "LIGHT";
        SystemBarsStyle2["Default"] = "DEFAULT";
      })(SystemBarsStyle || (SystemBarsStyle = {}));
      (function(SystemBarType2) {
        SystemBarType2["StatusBar"] = "StatusBar";
        SystemBarType2["NavigationBar"] = "NavigationBar";
      })(SystemBarType || (SystemBarType = {}));
      SystemBarsPluginWeb = class extends WebPlugin {
        setStyle() {
          return __async(this, null, function* () {
            this.unavailable("not available for web");
          });
        }
        setAnimation() {
          return __async(this, null, function* () {
            this.unavailable("not available for web");
          });
        }
        show() {
          return __async(this, null, function* () {
            this.unavailable("not available for web");
          });
        }
        hide() {
          return __async(this, null, function* () {
            this.unavailable("not available for web");
          });
        }
      };
      SystemBars = registerPlugin("SystemBars", {
        web: () => new SystemBarsPluginWeb()
      });
    }
  });

  // node_modules/@capacitor/haptics/dist/esm/definitions.js
  var ImpactStyle, NotificationType;
  var init_definitions = __esm({
    "node_modules/@capacitor/haptics/dist/esm/definitions.js"() {
      (function(ImpactStyle2) {
        ImpactStyle2["Heavy"] = "HEAVY";
        ImpactStyle2["Medium"] = "MEDIUM";
        ImpactStyle2["Light"] = "LIGHT";
      })(ImpactStyle || (ImpactStyle = {}));
      (function(NotificationType2) {
        NotificationType2["Success"] = "SUCCESS";
        NotificationType2["Warning"] = "WARNING";
        NotificationType2["Error"] = "ERROR";
      })(NotificationType || (NotificationType = {}));
    }
  });

  // node_modules/@capacitor/haptics/dist/esm/web.js
  var web_exports = {};
  __export(web_exports, {
    HapticsWeb: () => HapticsWeb
  });
  var HapticsWeb;
  var init_web = __esm({
    "node_modules/@capacitor/haptics/dist/esm/web.js"() {
      init_dist();
      init_definitions();
      HapticsWeb = class extends WebPlugin {
        constructor() {
          super(...arguments);
          this.selectionStarted = false;
        }
        impact(options) {
          return __async(this, null, function* () {
            const pattern = this.patternForImpact(options === null || options === void 0 ? void 0 : options.style);
            this.vibrateWithPattern(pattern);
          });
        }
        notification(options) {
          return __async(this, null, function* () {
            const pattern = this.patternForNotification(options === null || options === void 0 ? void 0 : options.type);
            this.vibrateWithPattern(pattern);
          });
        }
        vibrate(options) {
          return __async(this, null, function* () {
            const duration = (options === null || options === void 0 ? void 0 : options.duration) || 300;
            this.vibrateWithPattern([duration]);
          });
        }
        selectionStart() {
          return __async(this, null, function* () {
            this.selectionStarted = true;
          });
        }
        selectionChanged() {
          return __async(this, null, function* () {
            if (this.selectionStarted) {
              this.vibrateWithPattern([70]);
            }
          });
        }
        selectionEnd() {
          return __async(this, null, function* () {
            this.selectionStarted = false;
          });
        }
        patternForImpact(style = ImpactStyle.Heavy) {
          if (style === ImpactStyle.Medium) {
            return [43];
          } else if (style === ImpactStyle.Light) {
            return [20];
          }
          return [61];
        }
        patternForNotification(type = NotificationType.Success) {
          if (type === NotificationType.Warning) {
            return [30, 40, 30, 50, 60];
          } else if (type === NotificationType.Error) {
            return [27, 45, 50];
          }
          return [35, 65, 21];
        }
        vibrateWithPattern(pattern) {
          if (navigator.vibrate) {
            navigator.vibrate(pattern);
          } else {
            throw this.unavailable("Browser does not support the vibrate API");
          }
        }
      };
    }
  });

  // node_modules/@capacitor/haptics/dist/esm/index.js
  var esm_exports = {};
  __export(esm_exports, {
    Haptics: () => Haptics,
    ImpactStyle: () => ImpactStyle,
    NotificationType: () => NotificationType
  });
  var Haptics;
  var init_esm = __esm({
    "node_modules/@capacitor/haptics/dist/esm/index.js"() {
      init_dist();
      init_definitions();
      Haptics = registerPlugin("Haptics", {
        web: () => Promise.resolve().then(() => (init_web(), web_exports)).then((m) => new m.HapticsWeb())
      });
    }
  });

  // docs/game.js
  var game_exports = {};
  __export(game_exports, {
    ACHIEVEMENTS: () => ACHIEVEMENTS,
    BACKUP_REMINDER_MS: () => BACKUP_REMINDER_MS,
    BACKUP_TASK_TITLE: () => BACKUP_TASK_TITLE,
    BONUS_TASK_COINS: () => BONUS_TASK_COINS,
    BONUS_TASK_GEMS: () => BONUS_TASK_GEMS,
    BONUS_TASK_RATE: () => BONUS_TASK_RATE,
    BOOST_CHANCE_PER_COMPLETION: () => BOOST_CHANCE_PER_COMPLETION,
    BOOST_COOLDOWN_MS: () => BOOST_COOLDOWN_MS,
    BOOST_DURATION_MS: () => BOOST_DURATION_MS,
    BOOST_MULT: () => BOOST_MULT,
    CHEST_COINS: () => CHEST_COINS,
    CHEST_GEMS: () => CHEST_GEMS,
    CHEST_ITEM_ID: () => CHEST_ITEM_ID,
    CHEST_OPEN_MS: () => CHEST_OPEN_MS,
    CHEST_PURCHASE_OPEN_MS: () => CHEST_PURCHASE_OPEN_MS,
    CHEST_XP: () => CHEST_XP,
    COIN_REWARD: () => COIN_REWARD,
    CONFETTI_COUNT: () => CONFETTI_COUNT,
    CUSTOM_REPEAT_DEFAULT_MS: () => CUSTOM_REPEAT_DEFAULT_MS,
    DAILY_GOALS: () => DAILY_GOALS,
    DIFFICULTY_ORDER: () => DIFFICULTY_ORDER,
    DIFFICULTY_SUGGESTION_STREAK: () => DIFFICULTY_SUGGESTION_STREAK,
    EDIT_UPDATERS: () => EDIT_UPDATERS,
    FIRST_TASK_COINS_MULT: () => FIRST_TASK_COINS_MULT,
    FIRST_TASK_GEM_CHANCE: () => FIRST_TASK_GEM_CHANCE,
    FUN_TASK_COINS: () => FUN_TASK_COINS,
    FUN_TASK_XP: () => FUN_TASK_XP,
    GEM_BONUS_AMOUNT: () => GEM_BONUS_AMOUNT,
    GEM_CHANCE: () => GEM_CHANCE,
    GOAL_REWARD: () => GOAL_REWARD,
    Game: () => Game,
    HIGHLIGHT_COUNT: () => HIGHLIGHT_COUNT,
    ICE_AGE_OPTIONS: () => ICE_AGE_OPTIONS,
    INITIAL_SLABS: () => INITIAL_SLABS,
    ITEM_ROTATIONS: () => ITEM_ROTATIONS,
    ITEM_TYPES: () => ITEM_TYPES,
    MORNING_END_HOUR: () => MORNING_END_HOUR,
    MULTIPLIER_MAX: () => MULTIPLIER_MAX,
    MULTIPLIER_MIN: () => MULTIPLIER_MIN,
    NIGHT_START_HOUR: () => NIGHT_START_HOUR,
    PLACEMENT_VERSION: () => PLACEMENT_VERSION,
    RATE_PROMPT_TIMEOUT: () => RATE_PROMPT_TIMEOUT,
    RATING_BONUS_RATE: () => RATING_BONUS_RATE,
    REMINDER_HOUR: () => REMINDER_HOUR,
    REPEAT_VALUES: () => REPEAT_VALUES,
    SCHEMA_VERSION: () => SCHEMA_VERSION,
    SHOP_ITEMS: () => SHOP_ITEMS,
    SLABS_PER_LEVEL: () => SLABS_PER_LEVEL,
    STORAGE_KEY: () => STORAGE_KEY,
    STREAK_BONUS_MAX: () => STREAK_BONUS_MAX,
    STREAK_BONUS_PER_DAY: () => STREAK_BONUS_PER_DAY,
    STREAK_BONUS_START_DAY: () => STREAK_BONUS_START_DAY,
    STREAK_FREEZE_GEM_COST: () => STREAK_FREEZE_GEM_COST,
    TASK_LISTS: () => TASK_LISTS,
    TIME_BONUS_COINS: () => TIME_BONUS_COINS,
    TIME_LIMIT_MINUTES: () => TIME_LIMIT_MINUTES,
    VERSION: () => VERSION,
    WEEKDAY_LABELS: () => WEEKDAY_LABELS,
    WEEKLY_GOALS: () => WEEKLY_GOALS,
    WEEKLY_GOAL_REWARD: () => WEEKLY_GOAL_REWARD,
    XP_BASE_LEVEL: () => XP_BASE_LEVEL,
    XP_REWARD: () => XP_REWARD,
    achievementById: () => achievementById,
    achievementIsUnlocked: () => achievementIsUnlocked,
    achievementProgressFromCompletion: () => achievementProgressFromCompletion,
    addSubtask: () => addSubtask,
    addTask: () => addTask,
    announceAchievements: () => announceAchievements,
    announceLevelUp: () => announceLevelUp,
    applyFirstTaskBonus: () => applyFirstTaskBonus,
    applyTimeBonus: () => applyTimeBonus,
    awardRatingBonus: () => awardRatingBonus,
    awardSubtask: () => awardSubtask,
    baseReward: () => baseReward,
    buildRewardMessage: () => buildRewardMessage,
    buyIceAge: () => buyIceAge,
    buyStreakFreeze: () => buyStreakFreeze,
    cellTakenBy: () => cellTakenBy,
    chainHead: () => chainHead,
    chainIn: () => chainIn,
    chainPredecessor: () => chainPredecessor,
    chainPredecessorIn: () => chainPredecessorIn,
    chainSatisfiedIn: () => chainSatisfiedIn,
    chainSatisfiesDependency: () => chainSatisfiesDependency,
    chainSubtask: () => chainSubtask,
    chainTask: () => chainTask,
    chainWouldCycleIn: () => chainWouldCycleIn,
    checkRecurringTasks: () => checkRecurringTasks,
    chestReady: () => chestReady,
    clampWeekdays: () => clampWeekdays,
    clawBackMilestone: () => clawBackMilestone,
    clawBackReward: () => clawBackReward,
    completeFunTask: () => completeFunTask,
    completeTask: () => completeTask,
    computeReward: () => computeReward,
    dayKey: () => dayKey,
    daysInMonth: () => daysInMonth,
    defaultAchievementStats: () => defaultAchievementStats,
    defaultPlaceItem: () => defaultPlaceItem,
    defaultState: () => defaultState,
    deleteSubtask: () => deleteSubtask,
    deleteTask: () => deleteTask,
    deriveDifficulty: () => deriveDifficulty,
    earnChest: () => earnChest,
    editSubtask: () => editSubtask,
    editTask: () => editTask,
    emitPromptDifficultyRating: () => emitPromptDifficultyRating,
    emitRender: () => emitRender,
    emitToast: () => emitToast,
    enableTask: () => enableTask,
    enabledAtMs: () => enabledAtMs,
    ensureBackupReminder: () => ensureBackupReminder,
    exportState: () => exportState,
    firstFreeCell: () => firstFreeCell,
    firstTaskTier: () => firstTaskTier,
    fiveMinKey: () => fiveMinKey,
    grantMilestone: () => grantMilestone,
    grantMilestones: () => grantMilestones,
    grantXpAndCoins: () => grantXpAndCoins,
    highlightRating: () => highlightRating,
    highlightTasks: () => highlightTasks,
    ignoreWindow: () => ignoreWindow,
    importState: () => importState,
    isBoostActive: () => isBoostActive,
    isIgnored: () => isIgnored,
    isRecord: () => isRecord,
    isoWeek: () => isoWeek,
    isoWeekKey: () => isoWeekKey,
    itemIsOwned: () => itemIsOwned,
    itemIsUnlockable: () => itemIsUnlockable,
    itemPlacement: () => itemPlacement,
    levelFromXp: () => levelFromXp,
    levelStartXp: () => levelStartXp,
    loadState: () => loadState,
    maybeAutoWeekReview: () => maybeAutoWeekReview,
    maybeStartBoost: () => maybeStartBoost,
    maybeSuggestDifficultyReduction: () => maybeSuggestDifficultyReduction,
    migrateAchievements: () => migrateAchievements,
    migratePlacedItems: () => migratePlacedItems,
    migrateState: () => migrateState,
    migrateTask: () => migrateTask,
    moveTaskIntoGroup: () => moveTaskIntoGroup,
    nextDeadlineFor: () => nextDeadlineFor,
    nextOccurrence: () => nextOccurrence,
    nextRuleOccurrence: () => nextRuleOccurrence,
    nextTimeOfDay: () => nextTimeOfDay,
    normalizePlaced: () => normalizePlaced,
    normalizeRule: () => normalizeRule,
    normalizeSlot: () => normalizeSlot,
    normalizeTimeOfDay: () => normalizeTimeOfDay,
    normalizeWeekdays: () => normalizeWeekdays,
    noteExport: () => noteExport,
    nthWeekdayOfMonth: () => nthWeekdayOfMonth,
    num: () => num,
    openChest: () => openChest,
    ownedItemIds: () => ownedItemIds,
    placeItem: () => placeItem,
    prevRepeatKey: () => prevRepeatKey,
    purchaseItem: () => purchaseItem,
    purgeOldCompletedTasks: () => purgeOldCompletedTasks,
    randomMultiplier: () => randomMultiplier,
    reachedGoalCount: () => reachedGoalCount,
    reachedWeeklyGoalCount: () => reachedWeeklyGoalCount,
    repeatKey: () => repeatKey,
    resetState: () => resetState,
    rolloverCheckpoints: () => rolloverCheckpoints,
    rotateItem: () => rotateItem,
    saveState: () => saveState,
    setAutoRemoveCompletedDays: () => setAutoRemoveCompletedDays,
    setDayStartHour: () => setDayStartHour,
    setRoomEnabled: () => setRoomEnabled,
    setUiSheetHeightVh: () => setUiSheetHeightVh,
    shopItemById: () => shopItemById,
    slabCountForLevel: () => slabCountForLevel,
    slabOffsets: () => slabOffsets,
    startTask: () => startTask,
    state: () => state,
    str: () => str,
    streakBonus: () => streakBonus,
    streakHasFailed: () => streakHasFailed,
    subtaskChainSatisfies: () => subtaskChainSatisfies,
    subtaskPredecessor: () => subtaskPredecessor,
    subtasksLockedByChain: () => subtasksLockedByChain,
    timeBonusEarned: () => timeBonusEarned,
    timeOfDayMs: () => timeOfDayMs,
    timeOfDayToMs: () => timeOfDayToMs,
    toggleSubtask: () => toggleSubtask,
    totalStreakSum: () => totalStreakSum,
    trackAchievement: () => trackAchievement,
    trackDailyGoal: () => trackDailyGoal,
    ui: () => ui,
    unchainIn: () => unchainIn,
    unchainSubtask: () => unchainSubtask,
    unchainTask: () => unchainTask,
    uncompleteFunTask: () => uncompleteFunTask,
    uncompleteTask: () => uncompleteTask,
    updateStreak: () => updateStreak,
    weekCompletions: () => weekCompletions,
    xpForLevel: () => xpForLevel
  });

  // docs/game-constants.js
  var game_constants_exports = {};
  __export(game_constants_exports, {
    ACHIEVEMENTS: () => ACHIEVEMENTS,
    BACKUP_REMINDER_MS: () => BACKUP_REMINDER_MS,
    BACKUP_TASK_TITLE: () => BACKUP_TASK_TITLE,
    BONUS_TASK_COINS: () => BONUS_TASK_COINS,
    BONUS_TASK_GEMS: () => BONUS_TASK_GEMS,
    BONUS_TASK_RATE: () => BONUS_TASK_RATE,
    BOOST_CHANCE_PER_COMPLETION: () => BOOST_CHANCE_PER_COMPLETION,
    BOOST_COOLDOWN_MS: () => BOOST_COOLDOWN_MS,
    BOOST_DURATION_MS: () => BOOST_DURATION_MS,
    BOOST_MULT: () => BOOST_MULT,
    CHEST_COINS: () => CHEST_COINS,
    CHEST_GEMS: () => CHEST_GEMS,
    CHEST_ITEM_ID: () => CHEST_ITEM_ID,
    CHEST_OPEN_MS: () => CHEST_OPEN_MS,
    CHEST_PURCHASE_OPEN_MS: () => CHEST_PURCHASE_OPEN_MS,
    CHEST_XP: () => CHEST_XP,
    COIN_REWARD: () => COIN_REWARD,
    CONFETTI_COUNT: () => CONFETTI_COUNT,
    CUSTOM_REPEAT_DEFAULT_MS: () => CUSTOM_REPEAT_DEFAULT_MS,
    DAILY_GOALS: () => DAILY_GOALS,
    DIFFICULTY_ORDER: () => DIFFICULTY_ORDER,
    DIFFICULTY_SUGGESTION_STREAK: () => DIFFICULTY_SUGGESTION_STREAK,
    FIRST_TASK_COINS_MULT: () => FIRST_TASK_COINS_MULT,
    FIRST_TASK_GEM_CHANCE: () => FIRST_TASK_GEM_CHANCE,
    FUN_TASK_COINS: () => FUN_TASK_COINS,
    FUN_TASK_XP: () => FUN_TASK_XP,
    GEM_BONUS_AMOUNT: () => GEM_BONUS_AMOUNT,
    GEM_CHANCE: () => GEM_CHANCE,
    GOAL_REWARD: () => GOAL_REWARD,
    HIGHLIGHT_COUNT: () => HIGHLIGHT_COUNT,
    ICE_AGE_OPTIONS: () => ICE_AGE_OPTIONS,
    INITIAL_SLABS: () => INITIAL_SLABS,
    ITEM_ROTATIONS: () => ITEM_ROTATIONS,
    ITEM_TYPES: () => ITEM_TYPES,
    MORNING_END_HOUR: () => MORNING_END_HOUR,
    MULTIPLIER_MAX: () => MULTIPLIER_MAX,
    MULTIPLIER_MIN: () => MULTIPLIER_MIN,
    NIGHT_START_HOUR: () => NIGHT_START_HOUR,
    PLACEMENT_VERSION: () => PLACEMENT_VERSION,
    RATE_PROMPT_TIMEOUT: () => RATE_PROMPT_TIMEOUT,
    RATING_BONUS_RATE: () => RATING_BONUS_RATE,
    REMINDER_HOUR: () => REMINDER_HOUR,
    REPEAT_VALUES: () => REPEAT_VALUES,
    SCHEMA_VERSION: () => SCHEMA_VERSION,
    SHOP_ITEMS: () => SHOP_ITEMS,
    SLABS_PER_LEVEL: () => SLABS_PER_LEVEL,
    STORAGE_KEY: () => STORAGE_KEY,
    STREAK_BONUS_MAX: () => STREAK_BONUS_MAX,
    STREAK_BONUS_PER_DAY: () => STREAK_BONUS_PER_DAY,
    STREAK_BONUS_START_DAY: () => STREAK_BONUS_START_DAY,
    STREAK_FREEZE_GEM_COST: () => STREAK_FREEZE_GEM_COST,
    TASK_LISTS: () => TASK_LISTS,
    TIME_BONUS_COINS: () => TIME_BONUS_COINS,
    TIME_LIMIT_MINUTES: () => TIME_LIMIT_MINUTES,
    VERSION: () => VERSION,
    WEEKLY_GOALS: () => WEEKLY_GOALS,
    WEEKLY_GOAL_REWARD: () => WEEKLY_GOAL_REWARD,
    XP_BASE_LEVEL: () => XP_BASE_LEVEL,
    XP_REWARD: () => XP_REWARD,
    slabCountForLevel: () => slabCountForLevel,
    slabOffsets: () => slabOffsets
  });

  // docs/game-icons.js
  var ICONS = {
    alarm: "\u23F0",
    arrowRight: "\u2192",
    beach: "\u26F1\uFE0F",
    bell: "\u{1F514}",
    boba: "\u{1F9CB}",
    bolt: "\u26A1",
    books: "\u{1F4DA}",
    brain: "\u{1F9E0}",
    brick: "\u{1F9F1}",
    brokenHeart: "\u{1F494}",
    bulb: "\u{1F4A1}",
    cactus: "\u{1F335}",
    calendar: "\u{1F4C5}",
    cart: "\u{1F6D2}",
    castle: "\u{1F3F0}",
    check: "\u2705",
    checkMark: "\u2713",
    checkeredFlag: "\u{1F3C1}",
    chest: "\u{1F4E6}",
    clock: "\u{1F554}",
    coffee: "\u2615",
    coin: "\u{1FA99}",
    couch: "\u{1F6CB}\uFE0F",
    emDash: "\u2014",
    fire: "\u{1F525}",
    flag: "\u{1F1F8}\uFE0F",
    floppy: "\u{1F4BE}",
    folder: "\u{1F4C2}",
    gear: "\u2699\uFE0F",
    gem: "\u{1F48E}",
    grin: "\u{1F604}",
    headphones: "\u{1F3A7}",
    herb: "\u{1F33F}",
    hourglass: "\u23F3",
    info: "\u2139\uFE0F",
    link: "\u{1F517}",
    lock: "\u{1F512}",
    menu: "\u2630",
    moon: "\u{1F319}",
    noEntry: "\u{1F6AB}",
    okHand: "\u{1F44C}",
    party: "\u{1F389}",
    pencil: "\u270E",
    pin: "\u{1F4CC}",
    plant: "\u{1FAB4}",
    play: "\u25B6",
    repeat: "\u{1F501}",
    resetIn: "\u{1F504}",
    returnArrow: "\u21A9",
    running: "\u{1F3BD}",
    scroll: "\u{1F4DC}",
    smile: "\u{1F60A}",
    snowflake: "\u2744\uFE0F",
    sparkles: "\u2728",
    star: "\u2B50",
    sunrise: "\u{1F305}",
    testTube: "\u{1F9EA}",
    timeLimit: "\u23F1\uFE0F",
    times: "\xD7",
    trash: "\u{1F5D1}",
    triDown: "\u25BE",
    triRight: "\u25B8",
    trophy: "\u{1F3C6}",
    warning: "\u26A0\uFE0F",
    wave: "\u{1F44B}",
    weary: "\u{1F62B}",
    x: "\u2715"
  };

  // docs/game-constants.js
  var VERSION = "0.80.14";
  var STORAGE_KEY = "todo-mwe-state";
  var REMINDER_HOUR = 20;
  var BACKUP_REMINDER_MS = 30 * 864e5;
  var BACKUP_TASK_TITLE = "create a backup";
  var SCHEMA_VERSION = 3;
  var TIME_LIMIT_MINUTES = [5, 15, 30, 60];
  var TIME_BONUS_COINS = { too_easy: 0, easy: 5, medium: 10, hard: 20 };
  var COIN_REWARD = { too_easy: 0, easy: 10, medium: 25, hard: 50 };
  var DAILY_GOALS = [5, 10, 15, 25];
  var GOAL_REWARD = 15;
  var GEM_CHANCE = { medium: 0.25, hard: 0.5 };
  var GEM_BONUS_AMOUNT = 2;
  var MULTIPLIER_MIN = 1;
  var MULTIPLIER_MAX = 1.3;
  var STREAK_BONUS_START_DAY = 3;
  var STREAK_BONUS_PER_DAY = 0.1;
  var STREAK_BONUS_MAX = 1.9;
  var BONUS_TASK_RATE = 0.15;
  var BONUS_TASK_COINS = 10;
  var BONUS_TASK_GEMS = 1;
  var WEEKLY_GOALS = [10, 20, 30, 50];
  var WEEKLY_GOAL_REWARD = 25;
  var FIRST_TASK_COINS_MULT = { day1_2: 1, day3_6: 2.5, day7: 3 };
  var FIRST_TASK_GEM_CHANCE = { day1_2: 0, day3_6: 0.5, day7: 0.5 };
  var RATE_PROMPT_TIMEOUT = 6e3;
  var RATING_BONUS_RATE = 0.1;
  var DIFFICULTY_SUGGESTION_STREAK = 5;
  var XP_REWARD = { too_easy: 10, easy: 50, medium: 120, hard: 250 };
  var CONFETTI_COUNT = { too_easy: 12, easy: 24, medium: 48, hard: 80 };
  var XP_BASE_LEVEL = 100;
  var CHEST_OPEN_MS = 12 * 60 * 60 * 1e3;
  var CHEST_PURCHASE_OPEN_MS = 60 * 1e3;
  var CHEST_COINS = [20, 30, 40];
  var CHEST_GEMS = [1, 2];
  var CHEST_XP = [10, 20];
  var SLABS_PER_LEVEL = 4;
  var INITIAL_SLABS = 4;
  function slabOffsets(count) {
    const cells = [[0, 0], [1, 0], [1, 1], [0, 1]];
    let k = 1;
    while (cells.length < count) {
      k += 1;
      for (let z = 0; z <= k; z++) cells.push([k, z]);
      for (let x = k - 1; x >= 0; x--) cells.push([x, k]);
    }
    return cells.slice(0, count);
  }
  function slabCountForLevel(level) {
    return INITIAL_SLABS + (Math.max(1, level) - 1) * SLABS_PER_LEVEL;
  }
  var BOOST_MULT = 1.5;
  var BOOST_DURATION_MS = 60 * 60 * 1e3;
  var BOOST_CHANCE_PER_COMPLETION = 0.1;
  var BOOST_COOLDOWN_MS = 2 * 60 * 60 * 1e3;
  var SHOP_ITEMS = [
    { id: "plant", name: "Plant", emoji: ICONS.plant, costCoins: 50, costGems: 0, minLevel: 1 },
    { id: "table", name: "Table", emoji: ICONS.couch, costCoins: 150, costGems: 0, minLevel: 1 },
    { id: "lamp", name: "Lamp", emoji: ICONS.bulb, costCoins: 100, costGems: 0, minLevel: 2 },
    { id: "pedestal", name: "Chest Pedestal", emoji: ICONS.chest, costCoins: 75, costGems: 0, minLevel: 1 },
    { id: "mug", name: "Coffee Mug", emoji: ICONS.coffee, costCoins: 60, costGems: 0, minLevel: 1 },
    { id: "cactus", name: "Cactus", emoji: ICONS.cactus, costCoins: 80, costGems: 0, minLevel: 1 },
    { id: "books", name: "Book Stack", emoji: ICONS.books, costCoins: 90, costGems: 0, minLevel: 2 },
    { id: "boba", name: "Boba Plushie", emoji: ICONS.boba, costCoins: 120, costGems: 0, minLevel: 2 },
    { id: "headphones", name: "Headphones", emoji: ICONS.headphones, costCoins: 200, costGems: 0, minLevel: 3 }
  ];
  var ITEM_TYPES = { plant: "top", table: "slab", lamp: "top", pedestal: "slab", mug: "top", cactus: "top", books: "top", boba: "top", headphones: "top" };
  var CHEST_ITEM_ID = "pedestal";
  var ITEM_ROTATIONS = 4;
  var PLACEMENT_VERSION = 1;
  var DIFFICULTY_ORDER = ["too_easy", "easy", "medium", "hard"];
  var REPEAT_VALUES = ["none", "daily", "weekly", "monthly", "custom", "manual"];
  var CUSTOM_REPEAT_DEFAULT_MS = 864e5;
  var TASK_LISTS = ["todo", "backlog", "fun", "group"];
  var FUN_TASK_COINS = 5;
  var FUN_TASK_XP = 5;
  var HIGHLIGHT_COUNT = 5;
  var STREAK_FREEZE_GEM_COST = 2;
  var ICE_AGE_OPTIONS = [
    { hours: 24, gems: 3 },
    { hours: 72, gems: 6 },
    { hours: 168, gems: 10 }
  ];
  var ACHIEVEMENTS = [
    { id: "first_step", name: "First Step", emoji: ICONS.checkeredFlag, hint: "Complete your first task", goal: 1 },
    { id: "task_master", name: "Task Master", emoji: ICONS.scroll, hint: "Complete 25 tasks", goal: 25 },
    { id: "streak_3", name: "On Fire", emoji: ICONS.fire, hint: "Reach a 3-day streak on a task", goal: 3 },
    { id: "early_bird", name: "Early Bird", emoji: ICONS.calendar, hint: "Complete 5 tasks before noon", goal: 5 },
    { id: "night_owl", name: "Night Owl", emoji: ICONS.moon, hint: "Complete 5 tasks after 8 PM", goal: 5 },
    { id: "collector", name: "Collector", emoji: ICONS.castle, hint: "Own all 9 room items", goal: 9 },
    { id: "redecorator", name: "Redecorator", emoji: ICONS.brick, hint: "Move or rotate room items 10 times", goal: 10 },
    { id: "fun_lover", name: "Fun Lover", emoji: ICONS.party, hint: "Complete 10 fun tasks", goal: 10 },
    { id: "weekend_warrior", name: "Weekend Warrior", emoji: ICONS.beach, hint: "Complete 5 tasks on weekends", goal: 5 },
    { id: "marathon", name: "Marathon", emoji: ICONS.running, hint: "Complete 100 tasks", goal: 100 },
    { id: "chain_gang", name: "Chain Gang", emoji: ICONS.brick, hint: "Complete 5 chained tasks", goal: 5 },
    { id: "bonus_hunter", name: "Bonus Hunter", emoji: ICONS.star, hint: "Complete 5 bonus tasks", goal: 5 },
    { id: "chests_opened", name: "Treasure Hunter", emoji: ICONS.chest, hint: "Open 5 chests", goal: 5 },
    { id: "goal_getter", name: "Goal Getter", emoji: ICONS.trophy, hint: "Reach 5 daily goals", goal: 5 },
    { id: "big_spender", name: "Big Spender", emoji: ICONS.coin, hint: "Spend 500 coins in the shop", goal: 500 },
    { id: "decorator", name: "Decorator", emoji: ICONS.herb, hint: "Buy your first room item", goal: 1 }
  ];
  var MORNING_END_HOUR = 12;
  var NIGHT_START_HOUR = 20;

  // docs/game-state.js
  var game_state_exports = {};
  __export(game_state_exports, {
    clampWeekdays: () => clampWeekdays,
    defaultAchievementStats: () => defaultAchievementStats,
    defaultState: () => defaultState,
    emitPromptDifficultyRating: () => emitPromptDifficultyRating,
    emitRender: () => emitRender,
    emitToast: () => emitToast,
    exportState: () => exportState,
    importState: () => importState,
    isRecord: () => isRecord,
    itemIsOwned: () => itemIsOwned,
    loadState: () => loadState,
    migrateAchievements: () => migrateAchievements,
    migratePlacedItems: () => migratePlacedItems,
    migrateState: () => migrateState,
    migrateTask: () => migrateTask,
    normalizePlaced: () => normalizePlaced,
    normalizeWeekdays: () => normalizeWeekdays,
    noteExport: () => noteExport,
    num: () => num,
    ownedItemIds: () => ownedItemIds,
    resetState: () => resetState,
    saveState: () => saveState,
    state: () => state,
    str: () => str,
    totalStreakSum: () => totalStreakSum,
    ui: () => ui
  });

  // docs/game-rules.js
  var game_rules_exports = {};
  __export(game_rules_exports, {
    WEEKDAY_LABELS: () => WEEKDAY_LABELS,
    nextRuleOccurrence: () => nextRuleOccurrence,
    normalizeRule: () => normalizeRule,
    normalizeSlot: () => normalizeSlot,
    normalizeTimeOfDay: () => normalizeTimeOfDay,
    timeOfDayToMs: () => timeOfDayToMs
  });
  var WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  function normalizeTimeOfDay(v) {
    if (typeof v !== "string") return null;
    const m = /^(\d{1,2}):(\d{2})$/.exec(v.trim());
    if (!m) return null;
    const h = Math.min(23, Math.max(0, Number(m[1])));
    const min = Math.min(59, Math.max(0, Number(m[2])));
    return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
  }
  function timeOfDayToMs(time) {
    const [h, m] = time.split(":").map(Number);
    return (h * 60 + m) * 6e4;
  }
  function normalizeSlot(raw) {
    if (!raw || typeof raw !== "object") return null;
    const weekday = Math.floor(Number(raw.weekday));
    const time = normalizeTimeOfDay(raw.time);
    if (!Number.isFinite(weekday) || weekday < 0 || weekday > 6 || !time) return null;
    return { weekday, time };
  }
  function normalizeRule(raw, { allowOffset = true } = {}) {
    if (!raw || typeof raw !== "object") return null;
    if (raw.kind === "none") return null;
    if (raw.kind === "fixed") {
      const slots = Array.isArray(raw.slots) ? raw.slots.map(normalizeSlot).filter(Boolean) : [];
      return slots.length ? { kind: "fixed", slots } : null;
    }
    if (raw.kind === "monthly") {
      const weekday = Math.floor(Number(raw.weekday));
      const time = normalizeTimeOfDay(raw.time);
      if (!Number.isFinite(weekday) || weekday < 0 || weekday > 6 || !time) return null;
      return { kind: "monthly", weekday, first: raw.first !== false, time };
    }
    if (raw.kind === "offset" && allowOffset) {
      const ms = Math.floor(Number(raw.ms));
      return Number.isFinite(ms) && ms > 0 ? { kind: "offset", ms } : null;
    }
    return null;
  }
  function daysInMonthOf(year, month) {
    return new Date(year, month + 1, 0).getDate();
  }
  function nthWeekdayOfMonthLocal(year, month, weekday, first) {
    if (weekday === null || weekday === void 0) {
      return new Date(year, month, 1);
    }
    if (first === false) {
      const lastDay = daysInMonthOf(year, month);
      const back = (new Date(year, month, lastDay).getDay() - weekday + 7) % 7;
      return new Date(year, month, lastDay - back);
    }
    const offset = (weekday - new Date(year, month, 1).getDay() + 7) % 7;
    return new Date(year, month, 1 + offset);
  }
  function nextRuleOccurrence(rule, fromMs) {
    if (!rule) return null;
    if (rule.kind === "offset") return fromMs + rule.ms;
    if (rule.kind === "monthly") {
      const base = new Date(fromMs);
      for (let m = 0; m <= 13; m++) {
        const d = nthWeekdayOfMonthLocal(base.getFullYear(), base.getMonth() + m, rule.weekday, rule.first !== false);
        const cand = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() + timeOfDayToMs(rule.time);
        if (cand > fromMs) return cand;
      }
      return null;
    }
    if (rule.kind === "fixed") {
      let best = null;
      for (const slot of rule.slots) {
        const d = new Date(fromMs);
        const addDays = (slot.weekday - d.getDay() + 7) % 7;
        let cand = new Date(d.getFullYear(), d.getMonth(), d.getDate() + addDays).getTime() + timeOfDayToMs(slot.time);
        if (cand <= fromMs) cand += 7 * 864e5;
        if (best === null || cand < best) best = cand;
      }
      return best;
    }
    return null;
  }

  // docs/game-state.js
  function defaultAchievementStats() {
    return {
      totalCompleted: 0,
      morningCompleted: 0,
      nightCompleted: 0,
      bestStreak: 0,
      funCompleted: 0,
      itemMoves: 0,
      weekendCompleted: 0,
      chainedCompleted: 0,
      bonusCompleted: 0,
      chestsOpened: 0,
      dailyGoalsReached: 0,
      coinsSpent: 0,
      itemsBought: 0
    };
  }
  function defaultState() {
    return {
      coins: 0,
      gems: 0,
      dailyCompleted: 0,
      tasks: [],
      nextId: 1,
      firstTaskStreak: 0,
      lastFirstTaskDayKey: null,
      weeklyCompleted: 0,
      weekKey: null,
      xp: 0,
      chests: [],
      boostUntil: 0,
      boostCooldownUntil: 0,
      lastDailyMilestone: 0,
      lastWeeklyMilestone: 0,
      ownedItems: [],
      placedItems: [],
      achievements: { unlocked: [], stats: defaultAchievementStats() },
      dayStartHour: 0,
      uiSheetHeightVh: 0,
      roomEnabled: true,
      autoRemoveCompletedDays: 0,
      streakFreezes: 0,
      iceAgeUntil: 0,
      maxStreakSum: 0,
      createdAt: Date.now(),
      lastExportAt: 0,
      backupReminderSnoozedAt: 0,
      completionLog: [],
      lastWeekReviewKey: null
    };
  }
  var state = defaultState();
  function isRecord(v) {
    return v !== null && typeof v === "object" && !Array.isArray(v);
  }
  function num(v, fallback) {
    return typeof v === "number" && Number.isFinite(v) ? v : fallback;
  }
  function str(v, fallback) {
    return typeof v === "string" ? v : fallback;
  }
  var MIGRATE_REWARD = (raw) => isRecord(raw) ? {
    coins: num(raw.coins, 0),
    gems: num(raw.gems, 0),
    xp: num(raw.xp, 0),
    chestEarned: raw.chestEarned === true,
    chestId: num(raw.chestId, null),
    firstTaskDay: num(raw.firstTaskDay, 0)
  } : null;
  var MIGRATE_SUBTASK_REWARD = (raw) => isRecord(raw) ? { coins: num(raw.coins, 0), gems: num(raw.gems, 0), xp: num(raw.xp, 0) } : null;
  function migrateSubtask(st) {
    return {
      id: num(st.id, 0),
      title: str(st.title, "Untitled"),
      difficulty: st.difficulty in COIN_REWARD ? st.difficulty : "easy",
      done: st.done === true,
      chainedAfter: num(st.chainedAfter, 0),
      reward: MIGRATE_SUBTASK_REWARD(st.reward)
    };
  }
  var TASK_FIELD_MIGRATORS = {
    id: (raw, i) => num(raw.id, i + 1),
    title: (raw) => str(raw.title, "Untitled"),
    list: (raw) => TASK_LISTS.includes(raw.list) ? raw.list : "todo",
    difficulty: (raw) => raw.difficulty in COIN_REWARD ? raw.difficulty : "easy",
    repeat: (raw) => REPEAT_VALUES.includes(raw.repeat) ? raw.repeat : "none",
    done: (raw) => raw.done === true,
    createdAt: (raw) => num(raw.createdAt, Date.now()),
    completedAt: (raw) => typeof raw.completedAt === "number" ? raw.completedAt : null,
    streak: (raw) => num(raw.streak, 0),
    streakDayKeys: (raw) => Array.isArray(raw.streakDayKeys) ? raw.streakDayKeys.filter((k) => typeof k === "string") : [],
    bonus: (raw) => raw.bonus === true,
    backupReminder: (raw) => raw.backupReminder === true,
    deadline: (raw) => typeof raw.deadline === "number" ? raw.deadline : null,
    deadlineEnabled: (raw) => raw.deadlineEnabled !== false,
    deadlineRule: (raw) => normalizeRule(raw.deadlineRule, { allowOffset: true }),
    resetRule: (raw) => normalizeRule(raw.resetRule, { allowOffset: true }),
    ignoreRule: (raw) => normalizeRule(raw.ignoreRule, { allowOffset: false }),
    repeatTime: (raw) => num(raw.repeatTime, NaN),
    repeatAfterCompletion: (raw) => raw.repeatAfterCompletion === true || raw.repeatCustomFromCompletion === true,
    repeatWeekdays: (raw) => normalizeWeekdays(raw.repeatWeekdays, raw.repeatWeekday),
    repeatMonthlyWeekday: (raw) => raw.repeatMonthlyWeekday == null ? null : Math.min(6, Math.max(0, Math.floor(num(raw.repeatMonthlyWeekday, 0)))),
    repeatMonthlyFirst: (raw) => raw.repeatMonthlyFirst === true,
    repeatCustomMs: (raw) => Math.max(6e4, num(raw.repeatCustomMs, CUSTOM_REPEAT_DEFAULT_MS)),
    chainedAfter: (raw) => num(raw.chainedAfter, 0),
    groupId: (raw) => typeof raw.groupId === "number" ? raw.groupId : null,
    pinned: (raw) => raw.pinned === true,
    streakFreezeKey: (raw) => typeof raw.streakFreezeKey === "string" ? raw.streakFreezeKey : null,
    timeLimit: (raw) => num(raw.timeLimit, 0),
    startedAt: (raw) => num(raw.startedAt, 0),
    ratedDifficulty: (raw) => {
      var _a;
      return (_a = raw.ratedDifficulty) != null ? _a : null;
    },
    difficultySuggested: (raw) => raw.difficultySuggested === true,
    completedViaSubtasks: (raw) => raw.completedViaSubtasks === true,
    reward: (raw) => MIGRATE_REWARD(raw.reward),
    subtasks: (raw) => Array.isArray(raw.subtasks) ? raw.subtasks.filter(isRecord).map(migrateSubtask) : []
  };
  function migrateTask(raw, i) {
    if (!isRecord(raw)) return null;
    const task = {};
    for (const [field, migrate] of Object.entries(TASK_FIELD_MIGRATORS)) {
      task[field] = migrate(raw, i);
    }
    return task;
  }
  function ownedItemIds(raw) {
    return Array.isArray(raw.ownedItems) ? raw.ownedItems.filter((id) => SHOP_ITEMS.some((it) => it.id === id)) : [];
  }
  function normalizePlaced(itemId, cellIndex, rotation) {
    return {
      itemId,
      cellIndex,
      rotation: (rotation % ITEM_ROTATIONS + ITEM_ROTATIONS) % ITEM_ROTATIONS,
      placementVersion: PLACEMENT_VERSION
    };
  }
  function migratePlacedItems(rawPlaced, ownedIds) {
    const valid = Array.isArray(rawPlaced) ? rawPlaced.filter((p) => isRecord(p) && ITEM_TYPES[p.itemId] && ownedIds.includes(p.itemId) && Number.isInteger(p.cellIndex) && p.cellIndex >= 0).map((p) => normalizePlaced(p.itemId, p.cellIndex, num(p.rotation, 0))) : [];
    const byItem = /* @__PURE__ */ new Map();
    for (const p of valid) if (!byItem.has(p.itemId)) byItem.set(p.itemId, p);
    const slabCellsTaken = /* @__PURE__ */ new Set();
    let nextCell = 0;
    const freeCell = () => {
      while (slabCellsTaken.has(nextCell)) nextCell++;
      const cell = nextCell;
      slabCellsTaken.add(cell);
      return cell;
    };
    const result = [];
    for (const id of ownedIds) {
      let p = byItem.get(id) || normalizePlaced(id, ITEM_TYPES[id] === "slab" ? freeCell() : 0, 0);
      if (ITEM_TYPES[id] === "slab") {
        if (slabCellsTaken.has(p.cellIndex)) p = normalizePlaced(id, freeCell(), p.rotation);
        else slabCellsTaken.add(p.cellIndex);
      }
      result.push(p);
    }
    return result;
  }
  function migrateAchievements(raw) {
    const stats = defaultAchievementStats();
    const rawStats = isRecord(raw) && isRecord(raw.stats) ? raw.stats : {};
    for (const key of Object.keys(stats)) {
      stats[key] = num(rawStats[key], 0);
    }
    const validIds = new Set(ACHIEVEMENTS.map((a) => a.id));
    const unlocked = Array.isArray(raw && raw.unlocked) ? raw.unlocked.filter((id) => validIds.has(id)) : [];
    return { unlocked, stats };
  }
  function migrateState(raw) {
    var _a, _b;
    if (!isRecord(raw)) return null;
    const ownedIds = ownedItemIds(raw);
    const tasks = Array.isArray(raw.tasks) ? raw.tasks.map(migrateTask).filter(Boolean) : [];
    return {
      coins: num(raw.coins, 0),
      gems: num(raw.gems, 0),
      dailyCompleted: num(raw.dailyCompleted, 0),
      tasks,
      nextId: num(raw.nextId, tasks.length + 1),
      firstTaskStreak: num(raw.firstTaskStreak, 0),
      lastFirstTaskDayKey: str(raw.lastFirstTaskDayKey, null),
      weeklyCompleted: num(raw.weeklyCompleted, 0),
      weekKey: str(raw.weekKey, null),
      xp: num(raw.xp, 0),
      chests: Array.isArray(raw.chests) ? raw.chests.filter(isRecord).map((c) => ({
        id: num(c.id, 0),
        earnedAt: num(c.earnedAt, 0),
        opened: c.opened === true,
        openedAt: num(c.openedAt, 0),
        openDelayMs: num(c.openDelayMs, CHEST_OPEN_MS),
        contents: null
      })) : [],
      boostUntil: num(raw.boostUntil, 0),
      boostCooldownUntil: num(raw.boostCooldownUntil, 0),
      lastDailyMilestone: (_a = raw.lastDailyMilestone) != null ? _a : 0,
      lastWeeklyMilestone: (_b = raw.lastWeeklyMilestone) != null ? _b : 0,
      ownedItems: ownedIds,
      placedItems: migratePlacedItems(raw.placedItems, ownedIds),
      achievements: migrateAchievements(raw.achievements),
      dayStartHour: Math.min(23, Math.max(0, Math.floor(num(raw.dayStartHour, 0)))),
      uiSheetHeightVh: Math.min(95, Math.max(0, num(raw.uiSheetHeightVh, 0))),
      roomEnabled: raw.roomEnabled !== false,
      autoRemoveCompletedDays: Math.max(0, Math.floor(num(raw.autoRemoveCompletedDays, 0))),
      streakFreezes: num(raw.streakFreezes, 0),
      iceAgeUntil: Math.max(0, num(raw.iceAgeUntil, 0)),
      maxStreakSum: Math.max(0, Math.floor(num(raw.maxStreakSum, 0))),
      createdAt: num(raw.createdAt, Date.now()),
      lastExportAt: num(raw.lastExportAt, 0),
      backupReminderSnoozedAt: num(raw.backupReminderSnoozedAt, 0),
      completionLog: Array.isArray(raw.completionLog) ? raw.completionLog.filter(isRecord).map((e) => {
        var _a2;
        return {
          title: str(e.title, ""),
          list: TASK_LISTS.includes(e.list) ? e.list : "todo",
          difficulty: (_a2 = e.difficulty) != null ? _a2 : null,
          coins: num(e.coins, 0),
          gems: num(e.gems, 0),
          xp: num(e.xp, 0),
          completedAt: num(e.completedAt, 0),
          weekKey: str(e.weekKey, null)
        };
      }).slice(-500) : [],
      lastWeekReviewKey: str(raw.lastWeekReviewKey, null)
    };
  }
  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!isRecord(data)) return null;
      if (data.schemaVersion !== void 0 && data.schemaVersion > SCHEMA_VERSION) {
        return null;
      }
      return migrateState(data.state);
    } catch (e) {
      return null;
    }
  }
  function exportState() {
    return JSON.stringify({ schemaVersion: SCHEMA_VERSION, state }, null, 2);
  }
  function noteExport() {
    state.lastExportAt = Date.now();
    saveState();
  }
  function importState(data) {
    if (!isRecord(data) || data.schemaVersion > SCHEMA_VERSION) return false;
    const migrated = migrateState(data.state);
    if (!migrated) return false;
    Object.assign(state, migrated);
    saveState();
    return true;
  }
  function resetState() {
    Object.assign(state, defaultState());
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
    }
  }
  function totalStreakSum() {
    return state.tasks.reduce((sum, t) => sum + (t.streak > 0 ? t.streak : 0), 0);
  }
  function saveState() {
    state.maxStreakSum = Math.max(state.maxStreakSum, totalStreakSum());
    const payload = JSON.stringify({ schemaVersion: SCHEMA_VERSION, state });
    try {
      localStorage.setItem(STORAGE_KEY, payload);
    } catch (e) {
    }
    try {
      if (typeof window.__mirrorStateHook === "function") window.__mirrorStateHook(payload);
    } catch (e) {
    }
    window.dispatchEvent(new CustomEvent("game-state-changed"));
  }
  function clampWeekdays(raw) {
    if (!Array.isArray(raw)) return [];
    return [...new Set(raw.map((d) => Math.floor(Number(d))).filter((d) => d >= 0 && d <= 6))].sort((a, b) => a - b);
  }
  function normalizeWeekdays(raw, legacySingle) {
    const fromArray = clampWeekdays(raw);
    if (fromArray.length > 0) return fromArray;
    if (Number.isFinite(legacySingle)) {
      return [Math.min(6, Math.max(0, Math.floor(legacySingle)))];
    }
    return [1];
  }
  var ui = {
    render() {
    },
    showToast() {
    },
    promptDifficultyRating() {
    }
  };
  function emitRender() {
    ui.render();
  }
  function emitToast(message) {
    ui.showToast(message);
  }
  function emitPromptDifficultyRating(task) {
    ui.promptDifficultyRating(task);
  }
  function itemIsOwned(id) {
    return state.ownedItems.includes(id);
  }

  // docs/game-schedule.js
  var game_schedule_exports = {};
  __export(game_schedule_exports, {
    checkRecurringTasks: () => checkRecurringTasks,
    dayKey: () => dayKey,
    daysInMonth: () => daysInMonth,
    enabledAtMs: () => enabledAtMs,
    fiveMinKey: () => fiveMinKey,
    ignoreWindow: () => ignoreWindow,
    isIgnored: () => isIgnored,
    isoWeek: () => isoWeek,
    isoWeekKey: () => isoWeekKey,
    nextDeadlineFor: () => nextDeadlineFor,
    nextOccurrence: () => nextOccurrence,
    nextTimeOfDay: () => nextTimeOfDay,
    nthWeekdayOfMonth: () => nthWeekdayOfMonth,
    prevRepeatKey: () => prevRepeatKey,
    randomMultiplier: () => randomMultiplier,
    repeatKey: () => repeatKey,
    streakBonus: () => streakBonus,
    streakHasFailed: () => streakHasFailed,
    timeOfDayMs: () => timeOfDayMs
  });
  function randomMultiplier() {
    return MULTIPLIER_MIN + Math.random() * (MULTIPLIER_MAX - MULTIPLIER_MIN);
  }
  function streakBonus(streak) {
    if (streak < STREAK_BONUS_START_DAY) return 1;
    const extraDays = streak - STREAK_BONUS_START_DAY + 1;
    return Math.min(
      STREAK_BONUS_MAX,
      1 + extraDays * STREAK_BONUS_PER_DAY
    );
  }
  function shiftedDate(ts) {
    var _a;
    const d = new Date(ts);
    d.setHours(d.getHours() - ((_a = state.dayStartHour) != null ? _a : 0));
    return d;
  }
  function dayKey(ts) {
    const d = shiftedDate(ts);
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  }
  function fiveMinKey(ts) {
    return `${dayKey(ts)}-${Math.floor(ts / 3e5)}`;
  }
  var REPEAT_KEY_BUILDERS = {
    custom: (ts) => fiveMinKey(ts),
    weekly: (ts) => {
      const d = shiftedDate(ts);
      return `${d.getFullYear()}-W${isoWeek(d)}`;
    },
    monthly: (ts) => {
      const d = shiftedDate(ts);
      return `${d.getFullYear()}-${d.getMonth() + 1}`;
    }
  };
  function repeatKey(task, ts) {
    const builder = REPEAT_KEY_BUILDERS[task.repeat];
    return builder ? builder(ts) : dayKey(ts);
  }
  function isoWeek(d) {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = (date.getUTCDay() + 6) % 7;
    date.setUTCDate(date.getUTCDate() - dayNum + 3);
    const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
    const firstDayNum = (firstThursday.getUTCDay() + 6) % 7;
    firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3);
    return 1 + Math.round((date - firstThursday) / 6048e5);
  }
  function prevRepeatKey(task, ts) {
    if (task.repeat === "monthly") {
      const d2 = new Date(ts);
      d2.setMonth(d2.getMonth() - 1);
      return repeatKey(task, d2.getTime());
    }
    if (task.repeat === "custom") {
      return fiveMinKey(ts - (task.repeatCustomMs || CUSTOM_REPEAT_DEFAULT_MS));
    }
    if (task.repeat === "weekly") {
      const d2 = new Date(ts);
      d2.setDate(d2.getDate() - 7);
      return repeatKey(task, d2.getTime());
    }
    const d = new Date(ts);
    d.setDate(d.getDate() - 1);
    return dayKey(d.getTime());
  }
  function nextTimeOfDay(minutes) {
    const next = /* @__PURE__ */ new Date();
    next.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
    if (next.getTime() <= Date.now()) next.setDate(next.getDate() + 1);
    return next.getTime();
  }
  function timeOfDayMs(repeatTime) {
    return Number.isFinite(repeatTime) ? Math.floor(repeatTime / 60) * 36e5 + repeatTime % 60 * 6e4 : 0;
  }
  function nextOccurrence(task, fromMs = Date.now()) {
    const repeat = task.repeat;
    if (repeat === "custom") {
      const interval = task.repeatCustomMs || CUSTOM_REPEAT_DEFAULT_MS;
      if (task.repeatAfterCompletion) return fromMs + interval;
      const anchor = task.createdAt || fromMs;
      const n = Math.floor((fromMs - anchor) / interval) + 1;
      return anchor + n * interval;
    }
    const base = Number.isFinite(fromMs) ? fromMs : Date.now();
    const d = new Date(base);
    const tod = timeOfDayMs(task.repeatTime);
    if (repeat === "daily") {
      d.setDate(d.getDate() + 1);
      d.setHours(0, 0, 0, 0);
      d.setTime(d.getTime() + tod);
      if (d.getTime() <= base) d.setTime(d.getTime() + 864e5);
      return d.getTime();
    }
    if (repeat === "weekly") {
      const weekdays = task.repeatWeekdays || [];
      for (let offset = 0; offset <= 7; offset++) {
        const candidate = new Date(base);
        candidate.setDate(candidate.getDate() + offset);
        if (!weekdays.includes(candidate.getDay())) continue;
        candidate.setHours(0, 0, 0, 0);
        candidate.setTime(candidate.getTime() + tod);
        if (candidate.getTime() > base) return candidate.getTime();
      }
      return Infinity;
    }
    if (repeat === "monthly") {
      for (let m = 1; m <= 2; m++) {
        const next = nthWeekdayOfMonth(d.getFullYear(), d.getMonth() + m, task.repeatMonthlyWeekday, task.repeatMonthlyFirst !== false);
        next.setHours(0, 0, 0, 0);
        next.setTime(next.getTime() + tod);
        if (next.getTime() > base) return next.getTime();
      }
      return Infinity;
    }
    return Infinity;
  }
  function nextDeadlineFor(task, fromMs = Date.now()) {
    var _a;
    if (task.deadlineRule) {
      const base = task.deadlineRule.kind === "offset" ? (_a = task.completedAt) != null ? _a : fromMs : fromMs;
      const at = nextRuleOccurrence(task.deadlineRule, base);
      if (at !== null) return at;
    }
    return nextOccurrence(task, fromMs);
  }
  function ignoreWindow(task, now = Date.now()) {
    const rule = task.ignoreRule;
    if (!rule || rule.kind !== "fixed" || !rule.slots.length) return null;
    let start = null;
    for (const slot of rule.slots) {
      const d = new Date(now);
      const back = (d.getDay() - slot.weekday + 7) % 7;
      let cand = new Date(d.getFullYear(), d.getMonth(), d.getDate() - back).getTime() + timeOfDayToMs(slot.time);
      if (cand > now) cand -= 7 * 864e5;
      if (start === null || cand > start) start = cand;
    }
    if (start === null || now < start) return null;
    const resetAt = task.resetRule ? nextRuleOccurrence(task.resetRule, start) : nextOccurrence(task, start);
    if (resetAt === null || !Number.isFinite(resetAt)) return { start, end: Infinity };
    if (now >= resetAt) return null;
    return { start, end: resetAt };
  }
  function isIgnored(task, now = Date.now()) {
    return ignoreWindow(task, now) !== null;
  }
  function enabledAtMs(task, now = Date.now()) {
    if (task.done && task.completedAt != null && task.repeat !== "none" && task.repeat !== "manual") {
      const r = task.resetRule ? nextRuleOccurrence(task.resetRule, task.completedAt) : nextOccurrence(task, task.completedAt);
      return r !== null && Number.isFinite(r) ? r : null;
    }
    const win = ignoreWindow(task, now);
    if (win && Number.isFinite(win.end)) return win.end;
    return null;
  }
  function daysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
  }
  function nthWeekdayOfMonth(year, month, weekday, first) {
    if (weekday === null || weekday === void 0) {
      return new Date(year, month, 1);
    }
    if (first === false) {
      const lastDay = daysInMonth(year, month);
      const back = (new Date(year, month, lastDay).getDay() - weekday + 7) % 7;
      return new Date(year, month, lastDay - back);
    }
    const offset = (weekday - new Date(year, month, 1).getDay() + 7) % 7;
    return new Date(year, month, 1 + offset);
  }
  function streakHasFailed(task, now) {
    if (state.iceAgeUntil > now) return false;
    if (task.streak === 0 || task.streakDayKeys.length === 0) return false;
    const lastKey = task.streakDayKeys[task.streakDayKeys.length - 1];
    const currentKey = repeatKey(task, now);
    if (lastKey === currentKey) return false;
    const prevKey = prevRepeatKey(task, now);
    if (lastKey === prevKey) return false;
    if (task.streakFreezeKey === prevKey) return false;
    return true;
  }
  function checkRecurringTasks() {
    const now = Date.now();
    let changed = false;
    for (const task of state.tasks) {
      if (task.repeat === "none" || task.repeat === "manual") continue;
      if (task.done && task.completedAt !== null) {
        const resetAt = task.resetRule ? nextRuleOccurrence(task.resetRule, task.completedAt) : nextOccurrence(task, task.completedAt);
        if (resetAt !== null && resetAt <= now) {
          task.done = false;
          task.completedAt = null;
          for (const st of task.subtasks) {
            st.done = false;
            st.reward = null;
          }
          const next = nextDeadlineFor(task, now);
          task.deadline = next === null || next === Infinity ? task.deadline : next;
          const hadBonus = task.bonus;
          task.bonus = Math.random() < BONUS_TASK_RATE;
          if (task.bonus && !hadBonus) emitToast(`${ICONS.star} "${task.title}" has a bonus reward this time!`);
          if (hadBonus !== task.bonus) changed = true;
          changed = true;
        }
      }
      if (streakHasFailed(task, now)) {
        if (state.streakFreezes > 0) {
          state.streakFreezes -= 1;
          task.streakFreezeKey = prevRepeatKey(task, now);
          emitToast(`${ICONS.flag} Streak freeze used ${ICONS.emDash} "${task.title}" keeps its ${ICONS.fire} ${task.streak} streak`);
        } else {
          task.streak = 0;
          task.streakDayKeys = [];
        }
        changed = true;
      }
    }
    if (changed) {
      saveState();
      emitRender();
    }
  }
  function isoWeekKey(ts) {
    const d = shiftedDate(ts);
    return `${d.getFullYear()}-${isoWeek(d)}`;
  }

  // docs/game-progression.js
  var game_progression_exports = {};
  __export(game_progression_exports, {
    applyFirstTaskBonus: () => applyFirstTaskBonus,
    chestReady: () => chestReady,
    firstTaskTier: () => firstTaskTier,
    isBoostActive: () => isBoostActive,
    levelFromXp: () => levelFromXp,
    levelStartXp: () => levelStartXp,
    maybeStartBoost: () => maybeStartBoost,
    rolloverCheckpoints: () => rolloverCheckpoints,
    xpForLevel: () => xpForLevel
  });
  function firstTaskTier(streak) {
    if (streak >= 7) return "day7";
    if (streak >= 3) return "day3_6";
    return "day1_2";
  }
  function xpForLevel(level) {
    return XP_BASE_LEVEL * level * (level + 1) / 2;
  }
  function levelFromXp(xp) {
    let level = 1;
    while (xp >= xpForLevel(level + 1)) level++;
    return level;
  }
  function levelStartXp(level) {
    return level === 1 ? 0 : xpForLevel(level);
  }
  function chestReady(chest) {
    var _a;
    if (chest.opened) return false;
    const openDelay = (_a = chest.openDelayMs) != null ? _a : CHEST_OPEN_MS;
    return Date.now() - chest.earnedAt >= openDelay;
  }
  function isBoostActive() {
    return Date.now() < state.boostUntil;
  }
  function maybeStartBoost() {
    if (isBoostActive()) return;
    if (Date.now() < state.boostCooldownUntil) return;
    if (Math.random() >= BOOST_CHANCE_PER_COMPLETION) return;
    state.boostUntil = Date.now() + BOOST_DURATION_MS;
    state.boostCooldownUntil = state.boostUntil + BOOST_COOLDOWN_MS;
    emitToast(`${ICONS.bolt} Reward boost active! x${BOOST_MULT} for 1h`);
  }
  function rolloverCheckpoints() {
    const now = Date.now();
    const today = dayKey(now);
    let changed = false;
    if (state.lastFirstTaskDayKey !== today && state.dailyCompleted > 0) {
      state.dailyCompleted = 0;
      state.lastDailyMilestone = 0;
      changed = true;
    }
    const week = isoWeekKey(now);
    if (state.weekKey !== week) {
      state.weekKey = week;
      state.weeklyCompleted = 0;
      state.lastWeeklyMilestone = 0;
      changed = true;
    }
    if (changed) saveState();
  }
  function applyFirstTaskBonus() {
    const now = Date.now();
    const today = dayKey(now);
    if (state.lastFirstTaskDayKey === today) return null;
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    state.firstTaskStreak = state.lastFirstTaskDayKey === dayKey(yesterday.getTime()) ? state.firstTaskStreak + 1 : 1;
    state.lastFirstTaskDayKey = today;
    const tier = firstTaskTier(state.firstTaskStreak);
    const coins = Math.round(FIRST_TASK_COINS_MULT[tier] * 10);
    const gems = Math.random() < FIRST_TASK_GEM_CHANCE[tier] ? GEM_BONUS_AMOUNT : 0;
    return { coins, gems, streak: state.firstTaskStreak };
  }

  // docs/game-rewards.js
  var game_rewards_exports = {};
  __export(game_rewards_exports, {
    achievementById: () => achievementById,
    achievementIsUnlocked: () => achievementIsUnlocked,
    achievementProgressFromCompletion: () => achievementProgressFromCompletion,
    announceAchievements: () => announceAchievements,
    announceLevelUp: () => announceLevelUp,
    applyTimeBonus: () => applyTimeBonus,
    awardSubtask: () => awardSubtask,
    baseReward: () => baseReward,
    buildRewardMessage: () => buildRewardMessage,
    clawBackMilestone: () => clawBackMilestone,
    computeReward: () => computeReward,
    earnChest: () => earnChest,
    grantMilestone: () => grantMilestone,
    grantMilestones: () => grantMilestones,
    grantXpAndCoins: () => grantXpAndCoins,
    openChest: () => openChest,
    reachedGoalCount: () => reachedGoalCount,
    reachedWeeklyGoalCount: () => reachedWeeklyGoalCount,
    timeBonusEarned: () => timeBonusEarned,
    trackAchievement: () => trackAchievement,
    trackDailyGoal: () => trackDailyGoal,
    updateStreak: () => updateStreak
  });
  function openChest(chest) {
    if (!chestReady(chest)) return;
    chest.opened = true;
    chest.openedAt = Date.now();
    announceAchievements(trackAchievement({
      chestsOpened: state.achievements.stats.chestsOpened + 1
    }));
    const coins = CHEST_COINS[Math.floor(Math.random() * CHEST_COINS.length)];
    const gems = CHEST_GEMS[Math.floor(Math.random() * CHEST_GEMS.length)];
    const xp = CHEST_XP[Math.floor(Math.random() * CHEST_XP.length)];
    const leveledUp = grantXpAndCoins(coins, gems, xp);
    emitToast(
      `${ICONS.chest} +${coins} ${ICONS.coin} +${gems} ${ICONS.gem}` + (leveledUp ? ` ${ICONS.emDash} Level up!` : "")
    );
    saveState();
    emitRender();
  }
  function grantXpAndCoins(coins, gems, xp) {
    const xpBefore = levelFromXp(state.xp);
    state.coins += coins;
    state.gems += gems;
    state.xp += xp;
    return levelFromXp(state.xp) > xpBefore;
  }
  function announceLevelUp() {
    emitToast(`${ICONS.party} Level up! You are now level ${levelFromXp(state.xp)}`);
  }
  function awardSubtask(subtask) {
    const { coins, xp } = baseReward(subtask.difficulty);
    const leveledUp = grantXpAndCoins(coins, 0, xp);
    subtask.reward = { coins, gems: 0, xp };
    if (leveledUp) {
      announceLevelUp();
    } else if (coins > 0) {
      emitToast(`+${coins} ${ICONS.coin}`);
    }
  }
  function reachedGoalCount(count) {
    return DAILY_GOALS.filter((g) => g <= count).length;
  }
  function updateStreak(task, completedAt) {
    if (task.repeat === "none") return;
    const key = repeatKey(task, completedAt);
    if (task.streakDayKeys.includes(key)) return;
    const lastKey = task.streakDayKeys[task.streakDayKeys.length - 1];
    task.streak = lastKey === prevRepeatKey(task, completedAt) ? task.streak + 1 : 1;
    task.streakDayKeys.push(key);
  }
  function baseReward(difficulty, streakMult = 1) {
    const base = COIN_REWARD[difficulty] * streakMult;
    const mult = randomMultiplier();
    let coins = Math.round(base * mult);
    if (isBoostActive()) coins = Math.round(coins * BOOST_MULT);
    return { coins, xp: XP_REWARD[difficulty] || 0, mult };
  }
  function timeBonusEarned(task) {
    if (!task.timeLimit || !task.startedAt) return false;
    return Date.now() - task.startedAt <= task.timeLimit * 6e4;
  }
  function applyTimeBonus(task, reward) {
    if (!timeBonusEarned(task)) return 0;
    const bonus = TIME_BONUS_COINS[task.difficulty] || 0;
    reward.coins += bonus;
    return bonus;
  }
  function computeReward(task) {
    const streakMult = task.streak > 0 ? streakBonus(task.streak) : 1;
    const reward = baseReward(task.difficulty, streakMult);
    reward.gems = 0;
    if (GEM_CHANCE[task.difficulty] !== void 0 && Math.random() < GEM_CHANCE[task.difficulty]) {
      reward.gems += GEM_BONUS_AMOUNT;
    }
    if (task.bonus) {
      reward.coins += BONUS_TASK_COINS;
      reward.gems += BONUS_TASK_GEMS;
    }
    reward.timeBonus = applyTimeBonus(task, reward);
    return reward;
  }
  function earnChest(openDelayMs) {
    const chest = {
      id: state.nextId++,
      earnedAt: Date.now(),
      opened: false,
      openedAt: 0,
      contents: null,
      openDelayMs: openDelayMs != null ? openDelayMs : CHEST_OPEN_MS
    };
    state.chests.push(chest);
    return chest.id;
  }
  function reachedWeeklyGoalCount(count) {
    return WEEKLY_GOALS.filter((g) => g <= count).length;
  }
  function grantMilestone(reached, milestoneKey, rewardAmount) {
    var _a;
    if (reached <= ((_a = state[milestoneKey]) != null ? _a : 0)) return 0;
    state.coins += rewardAmount;
    state[milestoneKey] = reached;
    return rewardAmount;
  }
  function trackDailyGoal() {
    announceAchievements(trackAchievement({
      dailyGoalsReached: reachedGoalCount(state.dailyCompleted)
    }));
  }
  function clawBackMilestone(reached, milestoneKey, rewardAmount) {
    if (state[milestoneKey] === void 0 || reached >= state[milestoneKey]) return;
    state.coins = Math.max(0, state.coins - rewardAmount);
    state[milestoneKey] = void 0;
  }
  function grantMilestones() {
    return {
      dailyReward: grantMilestone(
        reachedGoalCount(state.dailyCompleted),
        "lastDailyMilestone",
        GOAL_REWARD
      ),
      weeklyReward: grantMilestone(
        reachedWeeklyGoalCount(state.weeklyCompleted),
        "lastWeeklyMilestone",
        WEEKLY_GOAL_REWARD
      )
    };
  }
  function buildRewardMessage(task, reward, firstBonus) {
    const parts = [];
    if (reward.coins > 0) parts.push(`${reward.coins} ${ICONS.coin}`);
    if (reward.gems > 0) parts.push(`${reward.gems} ${ICONS.gem}`);
    if (parts.length === 0) parts.push("0 " + ICONS.coin);
    let msg = "+" + parts.join(" + ");
    if (reward.mult > 1.05) msg += ` (x${reward.mult.toFixed(2)})`;
    if (task.streak > 1) msg += ` ${ICONS.fire} ${task.streak}`;
    if (reward.timeBonus > 0) msg += ` ${ICONS.timeLimit} +${reward.timeBonus} on time`;
    if (firstBonus && firstBonus.streak >= 3) {
      msg += ` ${ICONS.sunrise} first task x${state.firstTaskStreak}`;
    }
    return msg;
  }
  function achievementById(id) {
    return ACHIEVEMENTS.find((a) => a.id === id) || null;
  }
  function achievementIsUnlocked(id) {
    return state.achievements.unlocked.includes(id);
  }
  function trackAchievement(progress) {
    const stats = state.achievements.stats;
    for (const [key, value] of Object.entries(progress)) {
      if (typeof value === "number") stats[key] = Math.max(stats[key], value);
    }
    const collectorGoal = ACHIEVEMENTS.find((a) => a.id === "collector").goal;
    const checks = [
      ["first_step", stats.totalCompleted >= 1],
      ["task_master", stats.totalCompleted >= 25],
      ["streak_3", stats.bestStreak >= 3],
      ["early_bird", stats.morningCompleted >= 5],
      ["night_owl", stats.nightCompleted >= 5],
      ["collector", state.ownedItems.length >= collectorGoal],
      ["redecorator", stats.itemMoves >= 10],
      ["fun_lover", stats.funCompleted >= 10],
      ["weekend_warrior", stats.weekendCompleted >= 5],
      ["marathon", stats.totalCompleted >= 100],
      ["chain_gang", stats.chainedCompleted >= 5],
      ["bonus_hunter", stats.bonusCompleted >= 5],
      ["chests_opened", stats.chestsOpened >= 5],
      ["goal_getter", stats.dailyGoalsReached >= 5],
      ["big_spender", stats.coinsSpent >= 500],
      ["decorator", stats.itemsBought >= 1]
    ];
    const newly = [];
    for (const [id, reached] of checks) {
      if (reached && !achievementIsUnlocked(id)) {
        state.achievements.unlocked.push(id);
        newly.push(id);
      }
    }
    return newly;
  }
  function announceAchievements(ids) {
    for (const id of ids) {
      const a = achievementById(id);
      if (a) emitToast(`${ICONS.trophy} Achievement unlocked: ${a.name}!`);
    }
  }
  function achievementProgressFromCompletion(task, completedAt) {
    const date = new Date(completedAt);
    const stats = state.achievements.stats;
    return {
      totalCompleted: stats.totalCompleted + 1,
      morningCompleted: stats.morningCompleted + (date.getHours() < MORNING_END_HOUR ? 1 : 0),
      nightCompleted: stats.nightCompleted + (date.getHours() >= NIGHT_START_HOUR ? 1 : 0),
      weekendCompleted: stats.weekendCompleted + (date.getDay() === 0 || date.getDay() === 6 ? 1 : 0),
      bestStreak: Math.max(stats.bestStreak, task.streak || 0),
      chainedCompleted: stats.chainedCompleted + (task.chainedAfter ? 1 : 0),
      bonusCompleted: stats.bonusCompleted + (task.bonus ? 1 : 0)
    };
  }

  // docs/game-tasks.js
  var game_tasks_exports = {};
  __export(game_tasks_exports, {
    EDIT_UPDATERS: () => EDIT_UPDATERS,
    addSubtask: () => addSubtask,
    addTask: () => addTask,
    awardRatingBonus: () => awardRatingBonus,
    chainHead: () => chainHead,
    chainIn: () => chainIn,
    chainPredecessor: () => chainPredecessor,
    chainPredecessorIn: () => chainPredecessorIn,
    chainSatisfiedIn: () => chainSatisfiedIn,
    chainSatisfiesDependency: () => chainSatisfiesDependency,
    chainSubtask: () => chainSubtask,
    chainTask: () => chainTask,
    chainWouldCycleIn: () => chainWouldCycleIn,
    clawBackReward: () => clawBackReward,
    completeFunTask: () => completeFunTask,
    completeTask: () => completeTask,
    deleteSubtask: () => deleteSubtask,
    deleteTask: () => deleteTask,
    deriveDifficulty: () => deriveDifficulty,
    editSubtask: () => editSubtask,
    editTask: () => editTask,
    enableTask: () => enableTask,
    ensureBackupReminder: () => ensureBackupReminder,
    highlightRating: () => highlightRating,
    highlightTasks: () => highlightTasks,
    maybeAutoWeekReview: () => maybeAutoWeekReview,
    maybeSuggestDifficultyReduction: () => maybeSuggestDifficultyReduction,
    moveTaskIntoGroup: () => moveTaskIntoGroup,
    purgeOldCompletedTasks: () => purgeOldCompletedTasks,
    setAutoRemoveCompletedDays: () => setAutoRemoveCompletedDays,
    setDayStartHour: () => setDayStartHour,
    setRoomEnabled: () => setRoomEnabled,
    setUiSheetHeightVh: () => setUiSheetHeightVh,
    startTask: () => startTask,
    subtaskChainSatisfies: () => subtaskChainSatisfies,
    subtaskPredecessor: () => subtaskPredecessor,
    subtasksLockedByChain: () => subtasksLockedByChain,
    toggleSubtask: () => toggleSubtask,
    unchainIn: () => unchainIn,
    unchainSubtask: () => unchainSubtask,
    unchainTask: () => unchainTask,
    uncompleteFunTask: () => uncompleteFunTask,
    uncompleteTask: () => uncompleteTask,
    weekCompletions: () => weekCompletions
  });

  // docs/native-bridge.js
  function capacitor() {
    return typeof window !== "undefined" ? window.Capacitor : void 0;
  }
  function isNative() {
    const cap = capacitor();
    try {
      return Boolean(cap && cap.isNativePlatform && cap.isNativePlatform());
    } catch (e) {
      return false;
    }
  }
  function loadHaptics() {
    return __async(this, null, function* () {
      if (!isNative()) return null;
      try {
        return (yield Promise.resolve().then(() => (init_esm(), esm_exports))).Haptics;
      } catch (e) {
        return null;
      }
    });
  }
  function hapticImpact(style = "Medium") {
    return __async(this, null, function* () {
      const haptics = yield loadHaptics();
      if (!haptics) return;
      try {
        yield haptics.impact({ style });
      } catch (e) {
      }
    });
  }
  function hapticNotification(type = "Success") {
    return __async(this, null, function* () {
      const haptics = yield loadHaptics();
      if (!haptics) return;
      try {
        yield haptics.notification({ type });
      } catch (e) {
      }
    });
  }

  // docs/game-tasks.js
  function highlightRating(task, now) {
    let score = 0;
    if (task.bonus) score += 40;
    if (task.deadline !== null) {
      const hoursLeft = (task.deadline - now) / 36e5;
      if (hoursLeft < 0) score += 50;
      else if (hoursLeft < 48) score += Math.round(40 * (1 - hoursLeft / 48));
    }
    if (task.repeat !== "none" && task.streak > 0) {
      score = Math.min(50, score + 15 + task.streak * 2);
    }
    if (task.difficulty === "hard") score += 10;
    else if (task.difficulty === "medium") score += 5;
    if (task.list === "backlog") score -= 10;
    if (isIgnored(task, now)) score -= 30;
    if (task.list === "fun") score += 1;
    return score;
  }
  function highlightTasks() {
    const now = Date.now();
    const candidates = state.tasks.filter((t) => !t.done).map((t) => ({ task: t, score: highlightRating(t, now), ignored: isIgnored(t, now) })).sort((a, b) => b.score - a.score);
    const pick = (list) => {
      const result2 = [];
      const countedChains = /* @__PURE__ */ new Set();
      for (const { task } of list) {
        const head = chainHead(state.tasks, task);
        if (countedChains.has(head.id)) continue;
        countedChains.add(head.id);
        const chainTasks = [];
        for (let cur = task; cur && !cur.done; cur = chainPredecessorIn(state.tasks, cur)) {
          chainTasks.unshift(cur);
        }
        for (const t of chainTasks) {
          if (!result2.includes(t)) result2.push(t);
        }
        if (countedChains.size >= HIGHLIGHT_COUNT) break;
      }
      return result2;
    };
    let result = pick(candidates.filter((c) => !c.ignored));
    if (result.length === 0) result = pick(candidates.filter((c) => c.ignored));
    for (const p of state.tasks) {
      if (p.pinned && !p.done && !result.includes(p)) result.push(p);
    }
    return result;
  }
  function addTask(title, difficulty, repeat, deadlineInput, list, timeLimit = 0) {
    const taskList = TASK_LISTS.includes(list) ? list : "todo";
    const isFun = taskList === "fun";
    const isNonTask = isFun || taskList === "group";
    const isBonus = !isNonTask && Math.random() < BONUS_TASK_RATE;
    const task = {
      id: state.nextId++,
      title,
      list: taskList,
      difficulty: isNonTask ? null : difficulty,
      repeat: isNonTask ? "none" : repeat,
      done: false,
      createdAt: Date.now(),
      completedAt: null,
      streak: 0,
      streakDayKeys: [],
      bonus: isBonus,
      backupReminder: false,
      deadline: isNonTask ? null : deadlineInput ? new Date(deadlineInput).getTime() : null,
      deadlineEnabled: true,
      repeatTime: NaN,
      repeatAfterCompletion: false,
      repeatWeekdays: [1],
      repeatMonthlyWeekday: null,
      repeatMonthlyFirst: false,
      repeatCustomMs: CUSTOM_REPEAT_DEFAULT_MS,
      chainedAfter: 0,
      groupId: null,
      deadlineRule: null,
      resetRule: null,
      ignoreRule: null,
      pinned: false,
      streakFreezeKey: null,
      timeLimit: isNonTask ? 0 : TIME_LIMIT_MINUTES.includes(timeLimit) ? timeLimit : 0,
      startedAt: 0,
      ratedDifficulty: null,
      difficultySuggested: false,
      completedViaSubtasks: false,
      subtasks: []
    };
    if (isBonus) emitToast(ICONS.star + " New bonus task! Extra rewards");
    state.tasks.push(task);
    saveState();
    emitRender();
    return task.id;
  }
  function deriveDifficulty(task) {
    if (task.subtasks.length === 0) return task.difficulty;
    let best = "too_easy";
    for (const st of task.subtasks) {
      if (DIFFICULTY_ORDER.indexOf(st.difficulty) > DIFFICULTY_ORDER.indexOf(best)) {
        best = st.difficulty;
      }
    }
    return best;
  }
  function addSubtask(parentId, title, difficulty) {
    const parent = state.tasks.find((t) => t.id === parentId);
    if (!parent || !title) return;
    parent.subtasks.push({
      id: state.nextId++,
      title,
      difficulty,
      done: false,
      chainedAfter: 0
    });
    parent.difficulty = deriveDifficulty(parent);
    saveState();
    emitRender();
  }
  function editSubtask(parent, subtask, title, difficulty) {
    const t = (title || "").trim();
    if (t) subtask.title = t;
    if (difficulty in COIN_REWARD) subtask.difficulty = difficulty;
    parent.difficulty = deriveDifficulty(parent);
    saveState();
    emitRender();
  }
  function chainPredecessorIn(siblings, item) {
    if (!item.chainedAfter) return null;
    return siblings.find((s) => s.id === item.chainedAfter) || null;
  }
  function chainSatisfiedIn(siblings, item) {
    const predecessor = chainPredecessorIn(siblings, item);
    return !predecessor || predecessor.done;
  }
  function chainWouldCycleIn(siblings, item, target) {
    if (target.id === item.id) return true;
    const predecessor = chainPredecessorIn(siblings, target);
    if (!predecessor) return false;
    return chainWouldCycleIn(siblings, item, predecessor);
  }
  function chainHead(siblings, item) {
    let head = item;
    while (head.chainedAfter) {
      const predecessor = siblings.find((s) => s.id === head.chainedAfter);
      if (!predecessor) break;
      head = predecessor;
    }
    return head;
  }
  function chainIn(siblings, item, targetId, linkEmoji) {
    if (!item) return { ok: false, reason: "not chainable" };
    const target = siblings.find((s) => s.id === targetId);
    if (!target || target.id === item.id) return { ok: false, reason: "invalid target" };
    if (item.list === "fun" || target.list === "fun") {
      return { ok: false, reason: "fun not chainable" };
    }
    if (item.list !== target.list) {
      return { ok: false, reason: "different lists" };
    }
    if (target.chainedAfter === item.id) return { ok: false, reason: "would swap" };
    if (chainWouldCycleIn(siblings, item, target)) return { ok: false, reason: "cycle" };
    item.chainedAfter = target.id;
    const headList = chainHead(siblings, item).list;
    for (const other of siblings) {
      if (other.list === "fun") continue;
      if (chainHead(siblings, other) === chainHead(siblings, item)) other.list = headList;
    }
    saveState();
    emitRender();
    emitToast(`${linkEmoji} "${item.title}" is now chained after "${target.title}"`);
    return { ok: true };
  }
  function unchainIn(siblings, item) {
    if (!item.chainedAfter) return;
    item.chainedAfter = 0;
    saveState();
    emitRender();
  }
  function subtaskPredecessor(parent, subtask) {
    return chainPredecessorIn(parent.subtasks, subtask);
  }
  function subtaskChainSatisfies(parent, subtask) {
    return chainSatisfiedIn(parent.subtasks, subtask);
  }
  function chainSubtask(parent, subtask, targetId) {
    return chainIn(parent.subtasks, subtask, targetId, ICONS.link);
  }
  function unchainSubtask(parent, subtask) {
    return unchainIn(parent.subtasks, subtask);
  }
  function deleteSubtask(parent, subtaskId) {
    for (const other of parent.subtasks) {
      if (other.chainedAfter === subtaskId) other.chainedAfter = 0;
    }
    parent.subtasks = parent.subtasks.filter((s) => s.id !== subtaskId);
    parent.difficulty = deriveDifficulty(parent);
    saveState();
    emitRender();
  }
  function uncompleteSubtaskCascade(parent, subtask) {
    const affected = [subtask];
    const queue = [subtask];
    const seen = /* @__PURE__ */ new Set([subtask.id]);
    while (queue.length) {
      const cur = queue.shift();
      for (const other of parent.subtasks) {
        if (other.chainedAfter === cur.id && other.done && !seen.has(other.id)) {
          seen.add(other.id);
          affected.push(other);
          queue.push(other);
        }
      }
    }
    for (const st of affected) {
      clawBackReward(st.reward);
      st.reward = null;
      st.done = false;
    }
    return affected;
  }
  function toggleSubtask(parent, subtask) {
    subtask.done = !subtask.done;
    if (subtask.done) {
      if (subtasksLockedByChain(parent)) {
        subtask.done = false;
        emitToast(ICONS.link + " Finish the chained predecessor task first");
        saveState();
        emitRender();
        return;
      }
      if (!subtaskChainSatisfies(parent, subtask)) {
        subtask.done = false;
        const predecessor = subtaskPredecessor(parent, subtask);
        emitToast(`${ICONS.link} "${subtask.title}" is chained ${ICONS.emDash} complete "${predecessor.title}" first`);
        saveState();
        emitRender();
        return;
      }
      awardSubtask(subtask);
      if (parent.subtasks.every((st) => st.done) && !parent.done) {
        completeTask(parent);
        parent.completedViaSubtasks = true;
      }
    } else {
      uncompleteSubtaskCascade(parent, subtask);
      if (parent.done && parent.completedViaSubtasks) {
        uncompleteTask(parent, false);
        parent.completedViaSubtasks = false;
      }
    }
    saveState();
    emitRender();
  }
  function startTask(task) {
    if (task.done || !task.timeLimit) return;
    if (task.startedAt && Date.now() - task.startedAt < task.timeLimit * 6e4) return;
    task.startedAt = Date.now();
    saveState();
    emitRender();
  }
  function chainPredecessor(task) {
    return chainPredecessorIn(state.tasks, task);
  }
  function chainSatisfiesDependency(task) {
    return chainSatisfiedIn(state.tasks, task);
  }
  function subtasksLockedByChain(task) {
    return Boolean(task.chainedAfter) && !task.done && !chainSatisfiesDependency(task);
  }
  function chainTask(task, targetId) {
    return chainIn(state.tasks, task, targetId, ICONS.brick);
  }
  function unchainTask(task) {
    return unchainIn(state.tasks, task);
  }
  function enableTask(task) {
    if (!task.done) return;
    task.done = false;
    task.completedAt = null;
    saveState();
    emitRender();
  }
  function moveTaskIntoGroup(taskId, groupId) {
    const task = state.tasks.find((t) => t.id === taskId);
    const group = state.tasks.find((t) => t.id === groupId);
    if (!task || !group || group.list !== "group") return;
    if (task.list === "group" || task.id === groupId || task.groupId === groupId) return;
    task.groupId = groupId;
    saveState();
    emitRender();
  }
  function completeFunTask(task) {
    task.done = true;
    task.completedAt = Date.now();
    task.reward = { coins: FUN_TASK_COINS, gems: 0, xp: FUN_TASK_XP };
    grantXpAndCoins(FUN_TASK_COINS, 0, FUN_TASK_XP);
    logCompletion(task, task.reward);
    emitToast(`${ICONS.party} +${FUN_TASK_COINS} ${ICONS.coin}`);
    announceAchievements(trackAchievement({
      totalCompleted: state.achievements.stats.totalCompleted + 1,
      funCompleted: state.achievements.stats.funCompleted + 1
    }));
    hapticNotification("Success");
    saveState();
    emitRender();
  }
  function completeTask(task) {
    if (task.list === "fun") return completeFunTask(task);
    if (!chainSatisfiesDependency(task)) {
      emitToast(`${ICONS.brick} "${task.title}" is chained ${ICONS.emDash} complete "${chainPredecessor(task).title}" first`);
      return;
    }
    const reward = computeReward(task);
    task.done = true;
    task.startedAt = 0;
    task.completedAt = Date.now();
    if (task.backupReminder) state.backupReminderSnoozedAt = task.completedAt;
    if (task.repeat !== "manual") updateStreak(task, task.completedAt);
    if (task.subtasks && task.subtasks.length > 0) {
      for (const st of task.subtasks) {
        if (st.done) continue;
        st.done = true;
        awardSubtask(st);
      }
    }
    const firstBonus = applyFirstTaskBonus();
    if (firstBonus) {
      reward.coins += firstBonus.coins;
      reward.gems += firstBonus.gems;
    }
    const chestEarned = Boolean(firstBonus) && itemIsOwned(CHEST_ITEM_ID);
    const chestId = chestEarned ? earnChest() : null;
    const leveledUp = grantXpAndCoins(reward.coins, reward.gems, reward.xp);
    state.dailyCompleted += 1;
    state.weeklyCompleted += 1;
    const milestones = grantMilestones();
    trackDailyGoal();
    task.reward = {
      coins: reward.coins,
      gems: reward.gems,
      xp: reward.xp,
      chestEarned,
      chestId,
      firstTaskDay: firstBonus ? firstBonus.streak : 0,
      timeBonus: reward.timeBonus || 0
    };
    announceAchievements(trackAchievement(achievementProgressFromCompletion(task, task.completedAt)));
    if (leveledUp) announceLevelUp();
    if (milestones.weeklyReward > 0) {
      emitToast(`${ICONS.trophy} Weekly goal reached! +${WEEKLY_GOAL_REWARD} ${ICONS.coin}`);
    } else if (milestones.dailyReward > 0) {
      emitToast(`${ICONS.party} Daily goal reached! +${GOAL_REWARD} ${ICONS.coin}`);
    }
    emitToast(buildRewardMessage(task, reward, firstBonus));
    logCompletion(task, reward);
    if (chestEarned) emitToast(ICONS.chest + " Chest earned! Opens in 12h");
    maybeStartBoost();
    emitPromptDifficultyRating(task);
    maybeSuggestDifficultyReduction(task);
    hapticNotification("Success");
    if (leveledUp) hapticImpact("Heavy");
    saveState();
    emitRender();
  }
  function awardRatingBonus(task) {
    const base = task.reward;
    if (!base) return null;
    const bonus = {
      coins: Math.round((base.coins || 0) * RATING_BONUS_RATE),
      gems: Math.round((base.gems || 0) * RATING_BONUS_RATE),
      xp: Math.round((base.xp || 0) * RATING_BONUS_RATE)
    };
    if (!bonus.coins && !bonus.gems && !bonus.xp) return null;
    const leveledUp = grantXpAndCoins(bonus.coins, bonus.gems, bonus.xp);
    base.coins = (base.coins || 0) + bonus.coins;
    base.gems = (base.gems || 0) + bonus.gems;
    base.xp = (base.xp || 0) + bonus.xp;
    if (leveledUp) announceLevelUp();
    return bonus;
  }
  var COMPLETION_LOG_MAX = 500;
  function logCompletion(task, reward) {
    var _a;
    const at = task.completedAt || Date.now();
    state.completionLog.push({
      title: task.title,
      list: task.list || "todo",
      difficulty: (_a = task.difficulty) != null ? _a : null,
      coins: reward && reward.coins ? reward.coins : 0,
      gems: reward && reward.gems ? reward.gems : 0,
      xp: reward && reward.xp ? reward.xp : 0,
      completedAt: at,
      weekKey: isoWeekKey(at)
    });
    if (state.completionLog.length > COMPLETION_LOG_MAX) {
      state.completionLog.splice(0, state.completionLog.length - COMPLETION_LOG_MAX);
    }
  }
  function weekCompletions(now = Date.now()) {
    const wk = isoWeekKey(now);
    return (state.completionLog || []).filter((e) => e.weekKey === wk).sort((a, b) => (a.completedAt || 0) - (b.completedAt || 0));
  }
  function maybeAutoWeekReview(now = Date.now()) {
    if (new Date(now).getDay() !== 0) return false;
    const wk = isoWeekKey(now);
    if (state.lastWeekReviewKey === wk) return false;
    state.lastWeekReviewKey = wk;
    saveState();
    return true;
  }
  function clawBackReward(reward) {
    if (!reward) return;
    state.coins = Math.max(0, state.coins - reward.coins);
    state.gems = Math.max(0, state.gems - reward.gems);
    state.xp = Math.max(0, state.xp - reward.xp);
    if (reward.chestEarned) {
      let idx = -1;
      if (reward.chestId !== void 0 && reward.chestId !== null) {
        idx = state.chests.findIndex((c) => c.id === reward.chestId);
      }
      if (idx < 0) idx = state.chests.findIndex((c) => !c.opened);
      if (idx >= 0) state.chests.splice(idx, 1);
    }
  }
  function removeCompletionLogEntry(task) {
    const at = task.completedAt;
    if (!at || !Array.isArray(state.completionLog)) return;
    for (let i = state.completionLog.length - 1; i >= 0; i--) {
      const e = state.completionLog[i];
      if (e.completedAt === at && e.title === task.title) {
        state.completionLog.splice(i, 1);
        return;
      }
    }
  }
  function uncompleteFunTask(task) {
    task.done = false;
    removeCompletionLogEntry(task);
    task.completedAt = null;
    clawBackReward(task.reward);
    task.reward = null;
    saveState();
    emitRender();
  }
  function uncompleteOneTask(task) {
    task.done = false;
    task.startedAt = 0;
    removeCompletionLogEntry(task);
    const key = task.completedAt ? repeatKey(task, task.completedAt) : null;
    if (key && task.streakDayKeys.includes(key)) {
      task.streakDayKeys.pop();
      task.streak = Math.max(0, task.streak - 1);
    }
    task.completedAt = null;
    task.streakFreezeKey = null;
    state.dailyCompleted = Math.max(0, state.dailyCompleted - 1);
    state.weeklyCompleted = Math.max(0, state.weeklyCompleted - 1);
    if (task.reward && task.reward.firstTaskDay > 0) {
      state.firstTaskStreak = Math.max(0, task.reward.firstTaskDay - 1);
      state.lastFirstTaskDayKey = null;
    }
    clawBackReward(task.reward);
    task.reward = null;
  }
  function chainedSuccessorsOf(task) {
    const out = [];
    const queue = [task];
    const seen = /* @__PURE__ */ new Set([task.id]);
    while (queue.length) {
      const cur = queue.shift();
      for (const other of state.tasks) {
        if (other.chainedAfter === cur.id && other.done && !seen.has(other.id)) {
          seen.add(other.id);
          out.push(other);
          queue.push(other);
        }
      }
    }
    return out;
  }
  function uncompleteTask(task, cascadeSubtasks = true) {
    if (task.list === "fun") return uncompleteFunTask(task);
    if (cascadeSubtasks && task.subtasks && task.subtasks.length > 0) {
      for (const st of task.subtasks) {
        if (!st.done) continue;
        clawBackReward(st.reward);
        st.reward = null;
        st.done = false;
      }
      task.completedViaSubtasks = false;
    }
    for (const t of [task, ...chainedSuccessorsOf(task)]) uncompleteOneTask(t);
    clawBackMilestone(
      reachedGoalCount(state.dailyCompleted),
      "lastDailyMilestone",
      GOAL_REWARD
    );
    clawBackMilestone(
      reachedWeeklyGoalCount(state.weeklyCompleted),
      "lastWeeklyMilestone",
      WEEKLY_GOAL_REWARD
    );
    saveState();
    emitRender();
  }
  function deleteTask(id, opts = {}) {
    const deleted = state.tasks.find((t) => t.id === id);
    if (deleted && deleted.backupReminder) state.backupReminderSnoozedAt = Date.now();
    const isGroup = Boolean(deleted && deleted.list === "group");
    const deleteMembers = isGroup && opts.deleteMembers === true;
    const removedIds = /* @__PURE__ */ new Set([id]);
    if (deleteMembers) {
      for (const t of state.tasks) if (t.groupId === id) removedIds.add(t.id);
    }
    for (const other of state.tasks) {
      if (removedIds.has(other.chainedAfter)) other.chainedAfter = 0;
      if (isGroup && !deleteMembers && other.groupId === id) other.groupId = null;
    }
    state.tasks = state.tasks.filter((t) => !removedIds.has(t.id));
    saveState();
    emitRender();
  }
  function setDayStartHour(hour) {
    state.dayStartHour = Math.min(23, Math.max(0, Math.floor(hour)));
    saveState();
    emitRender();
  }
  function setUiSheetHeightVh(vh) {
    state.uiSheetHeightVh = Math.min(95, Math.max(0, vh));
    saveState();
  }
  function setRoomEnabled(enabled) {
    state.roomEnabled = !!enabled;
    saveState();
  }
  function setAutoRemoveCompletedDays(days) {
    state.autoRemoveCompletedDays = Math.max(0, Math.floor(Number(days) || 0));
    saveState();
    purgeOldCompletedTasks();
  }
  function normalizeTaskTitle(t) {
    return String(t || "").trim().toLowerCase().replace(/\s+/g, " ");
  }
  function ensureBackupReminder(now = Date.now()) {
    const lastExport = state.lastExportAt > 0 ? state.lastExportAt : state.createdAt || now;
    if (now - lastExport < BACKUP_REMINDER_MS) return false;
    if (state.backupReminderSnoozedAt > 0 && now - state.backupReminderSnoozedAt < BACKUP_REMINDER_MS) return false;
    const exists = state.tasks.some(
      (t) => !t.done && t.list !== "group" && normalizeTaskTitle(t.title) === BACKUP_TASK_TITLE
    );
    if (exists) return false;
    const id = addTask(BACKUP_TASK_TITLE, "easy", "none", null, "todo");
    const task = state.tasks.find((t) => t.id === id);
    if (task) {
      task.backupReminder = true;
      saveState();
    }
    return true;
  }
  function purgeOldCompletedTasks() {
    const days = state.autoRemoveCompletedDays | 0;
    if (days <= 0) return;
    const cutoff = Date.now() - days * 864e5;
    const removed = state.tasks.filter(
      (t) => t.done && t.completedAt && t.repeat === "none" && t.list !== "fun" && t.list !== "group" && t.completedAt <= cutoff
    );
    if (!removed.length) return;
    const removedIds = new Set(removed.map((t) => t.id));
    for (const other of state.tasks) {
      if (removedIds.has(other.chainedAfter)) other.chainedAfter = 0;
      if (other.groupId && removedIds.has(other.groupId)) other.groupId = null;
    }
    state.tasks = state.tasks.filter((t) => !removedIds.has(t.id));
    emitToast(`${ICONS.trash} Removed ${removed.length} completed task${removed.length === 1 ? "" : "s"} older than ${days} days`);
    saveState();
    emitRender();
  }
  function maybeSuggestDifficultyReduction(task) {
    if (task.difficultySuggested) return;
    if (task.streak < DIFFICULTY_SUGGESTION_STREAK) return;
    if (task.ratedDifficulty === "harder") return;
    task.difficultySuggested = true;
    const order = Object.keys(COIN_REWARD);
    const idx = order.indexOf(task.difficulty);
    if (idx <= 0) return;
    emitToast(
      `${ICONS.bulb} "${task.title}" is going strong (${ICONS.fire} ${task.streak}). Consider lowering its difficulty.`
    );
  }
  var EDIT_UPDATERS = {
    title(task, v) {
      const t = String(v).trim();
      if (t) task.title = t;
    },
    list(task, v) {
      if (!TASK_LISTS.includes(v) || v === task.list) return;
      task.list = v;
      task.chainedAfter = null;
      for (const st of task.subtasks) st.chainedAfter = null;
      for (const other of state.tasks) {
        if (other.chainedAfter === task.id) other.chainedAfter = null;
      }
    },
    difficulty(task, v) {
      if (v in COIN_REWARD && task.subtasks.length === 0) task.difficulty = v;
    },
    repeat(task, v) {
      if (!REPEAT_VALUES.includes(v)) return;
      task.repeat = v;
      if (v === "none" || v === "manual") {
        task.streak = 0;
        task.streakDayKeys = [];
      }
      if (v === "manual") {
        task.deadline = null;
        task.deadlineRule = null;
        task.resetRule = null;
        task.ignoreRule = null;
      }
    },
    deadline(task, v) {
      task.deadline = v ? new Date(v).getTime() : null;
    },
    deadlineRule(task, v) {
      task.deadlineRule = normalizeRule(v, { allowOffset: true });
    },
    resetRule(task, v) {
      task.resetRule = normalizeRule(v, { allowOffset: true });
    },
    ignoreRule(task, v) {
      task.ignoreRule = normalizeRule(v, { allowOffset: false });
    },
    repeatAfterCompletion(task, v) {
      task.repeatAfterCompletion = v === true;
    },
    repeatWeekdays(task, v) {
      task.repeatWeekdays = clampWeekdays(v);
    },
    repeatMonthlyWeekday(task, v) {
      task.repeatMonthlyWeekday = v === null ? null : Math.min(6, Math.max(0, Math.floor(v)));
    },
    repeatMonthlyFirst(task, v) {
      task.repeatMonthlyFirst = v === true;
    },
    repeatCustomMs(task, v) {
      task.repeatCustomMs = Math.max(6e4, Math.floor(v));
    },
    timeLimit(task, v) {
      task.timeLimit = TIME_LIMIT_MINUTES.includes(v) ? v : 0;
    },
    pinned(task, v) {
      task.pinned = v === true;
    },
    repeatTime(task, v) {
      task.repeatTime = Number.isFinite(v) ? Math.min(1439, Math.max(0, Math.floor(v))) : NaN;
    },
    deadlineEnabled(task, v) {
      task.deadlineEnabled = v !== false;
    }
  };
  function editTask(id, updates) {
    const task = state.tasks.find((t) => t.id === id);
    if (!task) return;
    for (const key of Object.keys(EDIT_UPDATERS)) {
      if (updates[key] !== void 0) EDIT_UPDATERS[key](task, updates[key]);
    }
    task.startedAt = 0;
    if (task.repeat !== "none" && !task.done) {
      const next = nextDeadlineFor(task, Date.now());
      if (next !== null && next !== Infinity) task.deadline = next;
    }
    saveState();
    emitRender();
  }

  // docs/game-shop.js
  var game_shop_exports = {};
  __export(game_shop_exports, {
    buyIceAge: () => buyIceAge,
    buyStreakFreeze: () => buyStreakFreeze,
    cellTakenBy: () => cellTakenBy,
    defaultPlaceItem: () => defaultPlaceItem,
    firstFreeCell: () => firstFreeCell,
    itemIsUnlockable: () => itemIsUnlockable,
    itemPlacement: () => itemPlacement,
    placeItem: () => placeItem,
    purchaseItem: () => purchaseItem,
    rotateItem: () => rotateItem,
    shopItemById: () => shopItemById
  });
  function shopItemById(id) {
    return SHOP_ITEMS.find((it) => it.id === id) || null;
  }
  function buyStreakFreeze() {
    if (state.gems < STREAK_FREEZE_GEM_COST) return { ok: false, reason: "gems" };
    state.gems -= STREAK_FREEZE_GEM_COST;
    state.streakFreezes += 1;
    emitToast(`${ICONS.flag} Streak freeze bought ${ICONS.emDash} ${state.streakFreezes} available`);
    saveState();
    emitRender();
    return { ok: true };
  }
  function buyIceAge(optionIndex) {
    const option = ICE_AGE_OPTIONS[optionIndex];
    if (!option) return { ok: false, reason: "unknown" };
    if (state.iceAgeUntil > Date.now()) return { ok: false, reason: "active" };
    if (state.gems < option.gems) return { ok: false, reason: "gems" };
    state.gems -= option.gems;
    state.iceAgeUntil = Date.now() + option.hours * 36e5;
    emitToast(`${ICONS.snowflake} Ice age started ${ICONS.emDash} all streaks protected for ${option.hours}h`);
    saveState();
    emitRender();
    return { ok: true };
  }
  function itemIsUnlockable(item) {
    return levelFromXp(state.xp) >= item.minLevel;
  }
  function purchaseItem(id) {
    const item = shopItemById(id);
    if (!item) return { ok: false, reason: "unknown" };
    if (itemIsOwned(id)) return { ok: false, reason: "owned" };
    if (!itemIsUnlockable(item)) return { ok: false, reason: "level" };
    if (state.coins < item.costCoins) return { ok: false, reason: "coins" };
    if (state.gems < item.costGems) return { ok: false, reason: "gems" };
    state.coins -= item.costCoins;
    state.gems -= item.costGems;
    state.ownedItems.push(id);
    state.achievements.stats.coinsSpent += item.costCoins;
    state.achievements.stats.itemsBought += 1;
    defaultPlaceItem(id);
    if (id === CHEST_ITEM_ID) earnChest(CHEST_PURCHASE_OPEN_MS);
    announceAchievements(trackAchievement({}));
    saveState();
    return { ok: true };
  }
  function itemPlacement(itemId) {
    return state.placedItems.find((p) => p.itemId === itemId) || null;
  }
  function cellTakenBy(cellIndex) {
    return state.placedItems.find(
      (p) => ITEM_TYPES[p.itemId] === "slab" && p.cellIndex === cellIndex
    ) || null;
  }
  function defaultPlaceItem(id) {
    if (itemPlacement(id)) return;
    const cell = ITEM_TYPES[id] === "slab" ? firstFreeCell() : 0;
    state.placedItems.push(normalizePlaced(id, cell, 0));
  }
  function firstFreeCell() {
    let cell = 0;
    while (cellTakenBy(cell)) cell++;
    return cell;
  }
  function placeItem(itemId, cellIndex) {
    const placement = itemPlacement(itemId);
    if (!placement) return { ok: false, reason: "not owned" };
    if (!Number.isInteger(cellIndex) || cellIndex < 0) return { ok: false, reason: "cell" };
    if (ITEM_TYPES[itemId] === "slab" && cellTakenBy(cellIndex)) {
      return { ok: false, reason: "occupied" };
    }
    const previousCell = placement.cellIndex;
    placement.cellIndex = cellIndex;
    placement.placementVersion = PLACEMENT_VERSION;
    const moved = cellIndex !== previousCell;
    saveState();
    if (moved) {
      announceAchievements(trackAchievement({
        itemMoves: state.achievements.stats.itemMoves + 1
      }));
      saveState();
    }
    return { ok: true };
  }
  function rotateItem(itemId) {
    const placement = itemPlacement(itemId);
    if (!placement) return { ok: false, reason: "not owned" };
    placement.rotation = (placement.rotation + 1) % ITEM_ROTATIONS;
    placement.placementVersion = PLACEMENT_VERSION;
    saveState();
    announceAchievements(trackAchievement({
      itemMoves: state.achievements.stats.itemMoves + 1
    }));
    saveState();
    return { ok: true };
  }

  // docs/game.js
  var Game = __spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues({}, game_constants_exports), game_state_exports), game_schedule_exports), game_progression_exports), game_rewards_exports), game_tasks_exports), game_shop_exports), game_rules_exports);
  window.Game = Game;
  return __toCommonJS(game_exports);
})();
/*! Bundled license information:

@capacitor/core/dist/index.js:
  (*! Capacitor: https://capacitorjs.com/ - MIT License *)
*/
