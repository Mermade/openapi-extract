#!/usr/bin/env node

'use strict';

const fs = require('fs');
const yaml = require('yaml');
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
    .boolean('verbose')
    .alias('v','verbose')
    .describe('verbose','increase verbosity')
    .argv;

let s = fs.readFileSync(argv._[0],'utf8');
let obj = yaml.parse(s);
let res = extractor.extract(obj,argv);
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

