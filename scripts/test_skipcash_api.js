(async () => {
  const SKIPCASH_API = process.env.SKIPCASH_API || 'https://api.skipcash.io/v1/checkout/sessions';
  console.log('Testing network connectivity to:', SKIPCASH_API);
  
  try {
    const res = await fetch(SKIPCASH_API, {
      method: 'HEAD',
      timeout: 5000,
    });
    console.log('✓ REACHABLE - Status:', res.status, res.statusText);
  } catch (err) {
    console.error('✗ UNREACHABLE');
    console.error('Error:', err.message);
    console.error('Code:', err.code);
    process.exitCode = 1;
  }
})();
