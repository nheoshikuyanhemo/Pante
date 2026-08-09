const http = require('http');

const hosts = [
  { url: 'http://localhost:8002/', expected: 200 },
  { url: 'http://localhost:8002/dex.html', expected: 200 },
  { url: 'http://localhost:8002/nft.html', expected: 200 },
  { url: 'http://localhost:8002/about.html', expected: 200 },
  { url: 'http://localhost:8002/whitepaper.html', expected: 200 }
];

function check(url, expected) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, { method: 'GET' }, (res) => {
      const code = res.statusCode;
      if (code === expected) {
        resolve(true);
      } else {
        reject(new Error(`Expected ${expected}, got ${code}`));
      }
    });
    req.on('error', reject);
    req.end();
  });
}

(async () => {
  try {
    const results = await Promise.all(hosts.map(h => check(h.url, h.expected)));
    console.log('All tests passed:', results);
    process.exit(0);
  } catch (e) {
    console.error('Test failed:', e.message);
    process.exit(1);
  }
})();