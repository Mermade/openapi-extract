'use strict';

const recurse = require('reftools/lib/recurse.js').recurse;
const clone = require('reftools/lib/clone.js').clone;
const jptr = require('reftools/lib/jptr.js').jptr;
const { AList } = require('./lib/AList.js');

// TODO add a memoized cache

function clean(obj, property) {
    if (obj && (!Array.isArray(obj[property])) && (typeof obj[property] === 'object') && (!Object.keys(obj[property]).length)) {
        if (property !== 'paths') delete obj[property];
    }
    return obj;
}

function deref(target, src, obj) {
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

function extract(obj, options) {

    const defaults = {};
    defaults.info = false;
    defaults.removeDocs = false;
    defaults.removeExamples = false;
    defaults.removeExtensions = false;
    defaults.server = false;
    defaults.security = false;
    defaults.openai = false;
    defaults.operationid = [];
    options = Object.assign({},defaults,options);

    if (!Array.isArray(options.operationid)) {
        options.operationid = [options.operationid];
    }

    let src = {};
    if (obj.openapi) {
        src.openapi = obj.openapi;
    }
    else if (obj.swagger) {
        src.swagger = obj.swagger;
    }
    else {
        src.asyncapi = obj.asyncapi;
    }
    if (options.info) {
        src.info = obj.info;
    }
    else {
        src.info = { title: obj.info.title, version: obj.info.version };
    }
    if (options.server) {
        if (obj.openapi || obj.asyncapi) {
            src.servers = obj.servers;
        }
        else {
            src.host = obj.host;
            src.schemes = obj.schemes;
            src.basePath = obj.basePath;
        }
    }
    if(obj.tags) {
        src.tags = obj.tags
    }

    src.paths = {};
    if (src.openapi) {
        src.components = {};
        if (options.security) {
            if (obj.security) src.security = obj.security;
            if (obj.securitySchemes) src.securitySchemes = obj.securitySchemes;
            if (obj.components && obj.components.securitySchemes) {
                src.components.securitySchemes = obj.components.securitySchemes;
            }
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

    const usedTags = new Set();

    if (options.operationid.length) {
        for (let id of options.operationid) {
            for (let p in obj.paths) {
                for (let o in obj.paths[p]) {
                    let op = obj.paths[p][o];
                    if (op.operationId && op.operationId === id.trim()) {
                        if (!paths[p]) paths[p] = {};
                        paths[p][o] = clone(op);
                        deref(paths[p][o],src,obj);
                        if(op && op.tags)
                            usedTags.add(...op.tags);
                    }
                }
            }
        }
    }
    else {
        paths = {};
        if (options.path) paths[options.path] = {};
        if (options.method) paths[options.path][options.method] = {};
        if (options.method && obj.paths[options.path][options.method]) {
            paths[options.path][options.method] = clone(obj.paths[options.path][options.method]);
            deref(paths[options.path][options.method],src,obj);
            usedTags.add(...paths[options.path][o].tags);
        }
        else if (options.path) {
            for (let o in obj.paths[options.path]) {
                if ((o !== 'description') && (o !== 'summary') &&
                    (!o.startsWith('x-'))) {
                    if (!options.method || options.method === o) {
                        paths[options.path][o] = clone(obj.paths[options.path][o]);
                        deref(paths[options.path][o],src,obj);
                        usedTags.add(...paths[options.path][o].tags);
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

    deref(src.headers,src,obj);
    deref(src.responses,src,obj);
    deref(src.parameters,src,obj);
    deref(src.components,src,obj);
    deref(src.definitions,src,obj);

    if (options.openai) {
        recurse(src,{},function(obj,key,state){
          if (obj && key === 'description' && obj.description.length > 300) {
              state.parent[state.pkey].description = obj.description.substring(0,300);
          }
        });
    }

    clean(src,'paths');
    clean(src,'definitions');
    clean(src,'headers');
    clean(src,'responses');
    clean(src,'parameters');
    clean(src.components,'parameters');
    clean(src.components,'responses');
    clean(src.components,'headers');
    clean(src.components,'schemas');
    clean(src,'components');

    const al = new AList(src);
    if (options.removeExamples) {
        for (let [value,parents] of al) {
            AList.deleteProperty(value, 'example');
            AList.deleteProperty(value, 'examples');
        }
    }

    if (options.removeExtensions) {
        for (let [value,parents] of al) {
            AList.deletePrefix(value, 'x-');
        }
    }

    if (options.removeDocs) {
        for (let [value,parents] of al) {
            AList.deleteProperty(value, 'externalDocs');
        }
    }

    if (src.tags) {
        src.tags = src.tags.filter(tag => usedTags.has(tag.name));
    }

    return src;
}

function shard(obj, options) {
    const results = new Map();
    if (!options.operationid) options.operationid = [];
    if (typeof options.operationid === 'string') {
        options.operationid = [ options.operationid ];
    }
    for (let path in obj.paths) {
        if (!options.path || options.path === path) {
            for (let method in obj.paths[path]) {
                if (!options.method || options.method === method) {
                    if (!obj.paths[path][method].operationId || options.operationid.length === 0 || (options.operationid && options.operationid.indexOf(obj.paths[path][method].operationId) >= 0)) {
                        let output = extract(obj, Object.assign({},options,{ path, method, operationid: obj.paths[path][method].operationId }));
                        if (output.paths && Object.keys(output.paths).length > 0) {
                            let key = obj.paths[path][method].operationId;
                            if (!key) key = method+'-'+path;
                            key = key.split('/').join('-').split('--').join('-').split('{').join('').split('}').join('');
                            results.set(key, output);

                      }
                    }
                }
            }
        }
    }
    return results;
}

module.exports = {
    extract,
    shard
};

