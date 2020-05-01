# openapi-extract

extract paths, operations, parameters, schemas etc from OpenAPI/Swagger definitions

Works with OpenAPI/Swagger 2.0 and 3.0.x definitions.

```
Usage: openapi-extract [options] {infile} [{outfile}]

Options:
  -h, --help         Show help                                         [boolean]
  --version          Show version number                               [boolean]
  --server           include server information                        [boolean]
  -p, --path         the path to extract                                [string]
  -o, --operationid  the operationIds to extract                         [array]
  -m, --method       the method to extract for the given path           [string]
  -i, --info         copy full info object, otherwise minimal          [boolean]
  -s, --security     include security information                      [boolean]
  -v, --verbose      increase verbosity                                [boolean]
```

or

```javascript
const openapiExtractor = require('openapi-extract');
const options = {};
// options.path = '...';
// options.method = '...';
// options.operationid = ['...'];
const res = openapiExtractor.extract(obj,options);
```
