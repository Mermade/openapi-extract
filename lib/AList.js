'use strict';

const root = Symbol('reftools-AList-root');

function always(key,value) {
  return true;
}

/**
* A graph adjacency list of object identities, implemented on top of a Map
* https://en.wikipedia.org/wiki/Adjacency_list
*/
class AList extends Map {

  constructor(obj, parent = root) {
    super();
    this.ingest(obj,parent);
  }

  ingest(obj, parent = root, property = '') {
    const kv = { key:property,value:parent };
    if (this.has(obj)) {
      this.get(obj).push(kv);
    }
    else {
      this.set(obj, [ kv ]);
      for (let p in obj) {
        if (obj[p] !== null && typeof obj[p] === 'object' && obj.hasOwnProperty(p)) {
          this.ingest(obj[p], obj, p);
        }
      }
    }
  }

  invert() {
    if (this.inverse) return this.inverse;
    const result = new AList();
    for (let [key,value] of this) {
      if (Array.isArray(value)) {
        for (let parent of value) {
          if (result.has(parent.value)) {
            result.get(parent.value).push({ key:parent.key, value:key });
          }
          else {
            result.set(parent.value, [ { key:parent.key, value:key } ]);
          }
        }
      }
    }
    this.inverse = result;
    result.inverse = this;
    return result;
  }

  findUpwards(obj, property, validator = always) {
    const parents = this.get(obj);
    const effParents = parents || [ { key: '', value: root } ];
    if (obj && obj.hasOwnProperty(property) && validator(property,obj,effParents[0].value,this)) {
      return obj;
    }
    if (Array.isArray(parents)) {
      for (let parent of parents) {
        let result = this.findUpwards(parent.value, property, validator);
        if ((typeof result !== 'undefined') && validator(property,result,parent.value,this)) return result;
      }
    }
  }

  findDownwards(obj, property, validator) {
    if (!this.inverse) this.inverse = this.invert();
    return this.inverse.findUpwards(obj, property, validator);
  }

  findProperty(property, validator = always) {
    for (let [key,value] of this) {
      if (key && key.hasOwnProperty(property) && validator(property,key,value,this)) {
        return key;
      }
    }
  }

  findAll(obj) {
    return this.get(obj);
  }

  findFirst(obj) {
    const parents = this.get(obj);
    if (parents && parents.length) return parents[0];
  }

  getPath(obj, parent = null, route = []) {
    if (this.has(obj)) {
      const parents = this.get(obj);
      if (Array.isArray(parents) && parents.length) {
        const prefParent = parent ? parent : parents[0];
        route.push(prefParent.key);
        this.getPath(prefParent.value, null, route);
      }
    }
    return route;
  }

  getDepth(obj, parent = null, route = []) {
    return this.getPath(obj,parent,route).length;
  }

  getReference(obj, parent = null, route = []) {
    const path = this.getPath(obj,parent,route);
    for (let p in path) {
      path[p] = path[p].split('~').join('~0').split('/').join('~1');
    }
    return '#'+path.reverse().join('/');
  }

  setAnnotation(obj, parent, value, key = 'data', stop = false) {
    if (key === 'key' || key === 'value') return; // reserved for our use
    if (this.has(obj)) {
      const parents = this.get(obj);
      const target = parents.find(function(e,i,a){
        return (e.value === parent);
      });
      if (target) {
        return target[key] = value;
      }
    }
    if (!stop) return this.setAnnotation(parent, obj, value, key, true);
  }

  getParent(obj) {
    const parents = this.get(obj);
    if (parents && parents.length) return parents[0].value;
  }

  getGrandParent(obj) {
    const parents = this.get(obj);
    if (parents && parents.length) return this.getParent(parents[0].value);
  }

  delete(obj) {
   const parent = this.getParent(obj);
   for (let prop in parent) {
     if (parent.hasOwnProperty(prop) && parent[prop] === obj) {
       delete parent[prop];
     }
   }
  }

  static deleteProperty(obj, property) {
   for (let prop in obj) {
     if (obj.hasOwnProperty(prop) && prop === property) {
       delete obj[prop];
     }
   }
  }

}

module.exports = { AList, root };

