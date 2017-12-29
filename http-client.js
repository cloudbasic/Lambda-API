var http = require('http'),
    https = require('https'),
    aws4 = require('aws4'),
    xml2js = require('xml2js'),
    deepcopy = require("deepcopy"),
    CONFIG = require('./config.json');

function sign(opts, creds) {
    aws4.sign(opts, creds);
}

function createBody(model) {
    if (CONFIG.xml) {
        var builder = new xml2js.Builder({
            explicitRoot: false,
            xmldec: {
                version: "1.0",
                encoding: "utf-8"
            }
        });

        return builder.buildObject(model);
    }
    else {
        var body = firstPropToCamelCase(model);

        return body;
    }
}

//get first property of the model and translate first letter to lower case  
//skip ActivateInstanceRequest, DeleteReplicationRequest, ReplicationStatusRequest etc.
function firstPropToCamelCase(obj) {
    return JSON.stringify(obj[Object.keys(obj)[0]], function (key, value) {
        if (value && typeof value === 'object') {
            var replacement = {};
            for (var k in value) {
                if (Object.hasOwnProperty.call(value, k)) {
                    replacement[k && k.charAt(0).toLowerCase() + k.substring(1)] = value[k];
                }
            }
            return replacement;
        }
        return value;
    });
}

function changeHost(host) {
    var options = CONFIG.options;
    options.host = host;
}

function createOptions(path) {
    var options = deepcopy(CONFIG.options);
    options.path = `${CONFIG.addOptions.basePath}${path}`;
    options.port = CONFIG.https ? CONFIG.addOptions.httpsPort : CONFIG.addOptions.httpPort;
        
    if (!CONFIG.xml) {
        options.headers["Content-Type"] = "application/json"
    }

    return options;
}

function post(path, model, callback, creds = undefined) {
    var options = createOptions(path);

    options.method = 'POST';
    options.body = createBody(model);
        
    if (creds) {
        sign(options, creds);
    }

    return request(options, callback);
};

function get(path, callback, creds = undefined) {
    var options = createOptions(path);

    if (creds) {
        sign(options, creds);
    }

    return request(options, callback);
};

function request(options, callback) {
    var protocol = CONFIG.https ? https : http;

    var req = protocol.request(options, function (res) {
        var res, resJS;
        if (res.statusCode == 200) {
            res.setEncoding('utf8');
            res.on('data', (res) => {
                if (CONFIG.xml) {
                    var parser = new xml2js.Parser({
                        explicitArray: false
                    });

                    parser.parseString(res, function (err, result) {
                        resJS = JSON.parse(firstPropToCamelCase(result));
                    });
                }
                else {
                    resJS = JSON.parse(res);
                }
            });

            res.on('end', function () {
                callback(resJS);
            });
        } else {
            res.setEncoding('utf8');
            res.on('data', (chunk) => {
                console.log(``);
                console.log(`Error: ${chunk}`);
            });
        }
    });
    req.write(options.body);
    req.end();
}

module.exports = {
    post: post,
    get: get,
    changeHost: changeHost
};
