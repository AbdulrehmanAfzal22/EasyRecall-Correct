(async () => {
  try {
    const res = await fetch('http://localhost:3000/api/skipcash/ping');
    const text = await res.text();
    console.log('STATUS', res.status, res.statusText);
    console.log('BODY', text);
  } catch (err) {
    console.error('PING ERROR', err);
    process.exitCode = 2;
  }
})();
