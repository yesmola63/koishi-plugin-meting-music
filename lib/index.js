"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchUnsupportedError = exports.MetingService = exports.normalizeEndpoint = exports.MetingAPIError = exports.MetingClient = exports.inject = exports.name = void 0;
exports.apply = apply;
const commands_1 = require("./commands");
const service_1 = require("./service");
exports.name = 'meting-music';
/** 需要 http 服务；Meting 的请求全部走 ctx.http */
exports.inject = { required: ['http'] };
__exportStar(require("./types"), exports);
__exportStar(require("./config"), exports);
__exportStar(require("./format"), exports);
var client_1 = require("./client");
Object.defineProperty(exports, "MetingClient", { enumerable: true, get: function () { return client_1.MetingClient; } });
Object.defineProperty(exports, "MetingAPIError", { enumerable: true, get: function () { return client_1.MetingAPIError; } });
Object.defineProperty(exports, "normalizeEndpoint", { enumerable: true, get: function () { return client_1.normalizeEndpoint; } });
var service_2 = require("./service");
Object.defineProperty(exports, "MetingService", { enumerable: true, get: function () { return service_2.MetingService; } });
var search_1 = require("./search");
Object.defineProperty(exports, "SearchUnsupportedError", { enumerable: true, get: function () { return search_1.SearchUnsupportedError; } });
function apply(ctx, config) {
    ctx.plugin(service_1.MetingService, config);
    // 服务是在下一个 tick 才注册完成的，必须等依赖就绪后再注册指令
    ctx.inject(['meting'], (ctx) => {
        (0, commands_1.applyCommands)(ctx, config, ctx.meting);
    });
}
//# sourceMappingURL=index.js.map