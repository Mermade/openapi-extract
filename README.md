# openapi-extract

![ci](https://github.com/Mermade/openapi-extract/workflows/ci/badge.svg)

Extract paths, operations, parameters, schemas etc from OpenAPI/Swagger definitions.

Works with OpenAPI/Swagger 2.0 and 3.x definitions.

```
Usage: openapi-extract [options] {infile} [{outfile}]

Options:
  -h, --help           Show help                                       [boolean]
  --version            Show version number                             [boolean]
  --server             include server information                      [boolean]
  --shard              shard the input to an output directory           [string]
  -p, --path           the path to extract                              [string]
  -o, --operationid    the operationIds to extract                       [array]
  -m, --method         the method to extract for the given path         [string]
  -i, --info           copy full info object, otherwise minimal        [boolean]
  -r, --removeExamples remove example/examples properties              [boolean]
  -s, --security       include security information                    [boolean]
  -v, --verbose        increase verbosity                              [boolean]
```

or

```javascript
const openapiExtractor = require('openapi-extract');
const options = {};
// options.path = '...';
// options.method = '...';
// options.operationid = ['...'];
const res = openapiExtractor.extract(obj, options);

const map = openapiExtractor.shard(obj, options);
```

The `options` object takes the same values as the CLI, for these keys and default values:

*   path = ''
*   method = ''
*   info = false
*   removeExamples = false
*   server = false
*   security = false
*   operationid = []

