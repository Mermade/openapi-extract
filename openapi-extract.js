#!/usr/bin/env node

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const yaml = require('yaml');
const rimraf = require('rimraf');
const mkdirp = require('mkdirp');

const extractor = require('./index.js');

let argv = require('yargs')
    .usage('Usage: openapi-extract [options] {infile} [{outfile}]')
    .demand(1)
    .strict()
    .help('h')
    .alias('h', 'help')
    .version()
    .string('path')
    .alias('p','path')
    .describe('path','the path to extract')
    .boolean('openai')
    .describe('openai','make definition OpenAI compliant')
    .array('operationid')
    .alias('o','operationid')
    .describe('operationid','the operationIds to extract')
    .string('method')
    .alias('m','method')
    .describe('method','the method to extract for the given path')
    .boolean('info')
    .alias('i','info')
    .describe('info','copy full info object, otherwise minimal')
    .boolean('server')
    .describe('server','include server information')
    .boolean('security')
    .alias('s','security')
    .describe('security','include security information')
    .boolean('removeDocs')
    .alias('d','removeDocs')
    .describe('removeDocs','remove all externalDocs properties')
    .boolean('removeExamples')
    .alias('r','removeExamples')
    .describe('removeExamples','remove all example/examples properties')
    .boolean('removeExtensions')
    .alias('x','removeExtensions')
    .describe('removeExtensions','remove all x- extension properties')
    .string('shard')
    .describe('shard','shard the input to an output directory')
    .boolean('verbose')
    .alias('v','verbose')
    .describe('verbose','increase verbosity')
    .argv;

async function main() {
  let s = fs.readFileSync(argv._[0],'utf8');
  let obj = yaml.parse(s);
  let filename = 'openapi.yaml';
  if (obj.asyncapi) filename = 'asyncapi.yaml';
  if (argv.shard) {
      const map = extractor.shard(obj, argv);
      await rimraf(argv.shard, { preserveRoot: false });
      for (let [key, value] of map) {
          process.stderr.write('.');
          try {
            await mkdirp(path.resolve(argv.shard,key));
            fs.writeFileSync(path.resolve(argv.shard,key,filename),yaml.stringify(value),'utf8');
          }
          catch (ex) {
            process.stderr.write(`\n${ex.message}\n`);
          }
      }
      process.stderr.write('\n');
  }
  else {
    let res = extractor.extract(obj, argv);
    if (argv._[0].indexOf('.json')>=0) {
        s = JSON.stringify(res,null,2);
    }
    else {
        s = yaml.stringify(res);
    }
    if (argv._.length>1) {
        fs.writeFileSync(argv._[1],s,'utf8');
    }
    else {
        console.log(s);
    }
  }
}

main();
