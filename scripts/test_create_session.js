(async () => {
  try {
    const res = await fetch('http://localhost:3000/api/skipcash/create-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 1.00 }),
    });
    const text = await res.text();
    console.log('STATUS', res.status, res.statusText);
    console.log('HEADERS', Object.fromEntries(res.headers.entries()));
    console.log('BODY', text);
  } catch (err) {
    console.error('FETCH ERROR', err);
    process.exitCode = 2;
  }
})();
