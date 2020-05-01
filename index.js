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
    defaults.operationid = [];
    options = Object.assign({},defaults,options);

    if (!Array.isArray(options.operationid)) {
        options.operationid = [options.operationid];
    }

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
            if (obj.security) src.security = obj.security;
            if (obj.securitySchemes) src.securitySchemes = obj.securitySchemes;
        }
        src.components.parameters = {};
        src.components.responses = {};
        src.components.headers = {};
        src.components.schemas = {};
    }
    else {
        if (options.security) {
            if (obj.securityDefinitions) src.securityDefinitions = obj.securityDefinitions;
            if (obj.security) src.security = obj.security;
        }
        src.parameters = {};
        src.responses = {};
        src.headers = {};
        src.definitions = {};
    }
    let paths = {};

    if (options.operationid.length) {
        for (let id of options.operationid) {
            for (let p in obj.paths) {
                for (let o in obj.paths[p]) {
                    let op = obj.paths[p][o];
                    if (op.operationId && op.operationId === id) {
                        if (!paths[p]) paths[p] = {};
                        paths[p][o] = clone(op);
                        deref(paths[p][o],src,obj);
                    }
                }
            }
        }
    }
    else {
        paths = {};
        paths[options.path] = {};
        if (options.method) paths[options.path][options.method] = {};
        if (options.method && obj.paths[options.path][options.method]) {
            paths[options.path][options.method] = clone(obj.paths[options.path][options.method]);
            deref(paths[options.path][options.method],src,obj);
        }
        else {
            for (let o in obj.paths[options.path]) {
                if ((o !== 'description') && (o !== 'summary') &&
                    (!o.startsWith('x-'))) {
                    if (!options.method || options.method === o) {
                        paths[options.path][o] = clone(obj.paths[options.path][o]);
                        deref(paths[options.path][o],src,obj);
                    }
                }
            }
        }
    }

    if (paths) src.paths = paths;
    for (let p in paths) {
        if (obj.paths[p] && obj.paths[p].parameters) {
            src.paths[p].parameters = clone(obj.paths[p].parameters);
        }
    }

    if (options.server && (Object.keys(paths).length === 1) &&
      (Object.keys(Object.values(paths)[0]) === 1)) {
        const op = Object.values(Object.values(paths)[0])[0];
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

