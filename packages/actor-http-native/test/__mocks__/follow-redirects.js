
const IncomingMessage = require('http').IncomingMessage;

let options = {
  statusCode: 200
};

function mockSetup(mock) {
  options = mock;
}

function request(settings, func) {
  let body = new IncomingMessage();
  Object.assign(body, options.body || {}, {
    input: settings,
    setEncoding: () => {},
    headers: options.headers || {},
    statusCode: options.statusCode,
    url: settings.url,
    responseUrl: settings.url,
  });
  setImmediate(() => func(body));

  return {
    abort: () => { },
    end: () => {},
    on: (evt, cb) => { },
  }
}

function Agent() {}

module.exports = {
  http: { request, Agent },
  https: { request, Agent },
  mockSetup
};