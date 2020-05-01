'use strict';

const recurse = require('reftools/lib/recurse.js').recurse;
const clone = require('reftools/lib/clone.js').clone;
const jptr = require('reftools/lib/jptr.js').jptr;

// TODO add a memoized cache

function clean(obj,property) {
    if (obj && (typeof obj[property] === 'object') && (!Object.keys(obj[property]).length)) {
        delete obj[property];
    }
    return obj;
}

function deref(target,src,obj) {
    let changes = 1;
    let seen = {};
    while (changes) {
        changes = 0;
        recurse(target,{},function(t,key,state){
            if ((key === '$ref') && (typeof t[key] === 'string') && !seen[state.path]) {
                if (t[key].startsWith('#')) {
                    changes++;
                    jptr(src,t[key],jptr(obj,t[key]));
                }
                seen[state.path] = true;
            }
        });
    }
    return target;
}

function extract(obj,options) {

    const defaults = {};
    defaults.info = false;
    defaults.server = false;
    defaults.security = false;
    options = Object.assign({},defaults,options);

    let src = {};
    if (obj.openapi) {
        src.openapi = obj.openapi;
    }
    else {
        src.swagger = obj.swagger;
    }
    if (options.info) {
        src.info = obj.info;
    }
    else {
        src.info = { title: obj.info.title, version: obj.info.version };
    }
    if (options.server) {
        if (obj.openapi) {
            src.servers = obj.servers;
        }
        else {
            src.host = obj.host;
            src.schemes = obj.schemes;
            src.basePath = obj.basePath;
        }
    }
    src.paths = {};
    if (src.openapi) {
        src.components = {};
        if (options.security) {
            src.security = obj.security;
            src.securitySchemes = obj.securitySchemes;
        }
        src.components.parameters = {};
        src.components.responses = {};
        src.components.headers = {};
        src.components.schemas = {};
    }
    else {
        if (options.security) {
            src.securityDefinitions = obj.securityDefinitions;
            src.security = obj.security;
        }
        src.parameters = {};
        src.responses = {};
        src.headers = {};
        src.definitions = {};
    }
    let path;
    let ops = {};

    if (options.operationid) {
        for (let p in obj.paths) {
            for (let o in obj.paths[p]) {
                let op = obj.paths[p][o];
                if (op.operationId && op.operationId === options.operationid) {
                    path = p;
                    ops[o] = clone(op);
                }
            }
        }
    }
    else {
        path = options.path;
        if (options.method && obj.paths[path][options.method]) {
            ops[options.method] = clone(obj.paths[path][options.method]);
        }
        else {
            for (let o in obj.paths[path]) {
                if ((o !== 'description') && (o !== 'summary') &&
                    (!o.startsWith('x-'))) {
                    if (!options.method || options.method === o) {
                        ops[o] = clone(obj.paths[path][o]);
                    }
                }
            }
        }
    }

    if (path) src.paths[path] = {};
    if (path && obj.paths[path] && obj.paths[path].parameters) {
        src.paths[path].parameters = obj.paths[path].parameters;
    }

    for (let o in ops) {
        let op = ops[o];
        deref(op,src,obj);
        src.paths[path][o] = op;
    }

    if (options.server && (Object.keys(ops).length === 1)) {
        let op = Object.values(ops)[0];
        if (op.schemes) {
            src.schemes = op.schemes;
            delete op.schemes;
        }
        if (op.servers) {
            src.servers = op.servers;
            delete op.servers;
        }
    }

    deref(src.definitions,src,obj);
    deref(src.headers,src,obj);
    deref(src.responses,src,obj);
    deref(src.parameters,src,obj);
    deref(src.components,src,obj);

    clean(src,'definitions');
    clean(src,'headers');
    clean(src,'responses');
    clean(src,'parameters');
    clean(src.components,'parameters');
    clean(src.components,'responses');
    clean(src.components,'headers');
    clean(src.components,'schemas');
    clean(src,'components');
    return src;
}

module.exports = {
    extract : extract
};

