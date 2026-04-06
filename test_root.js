fetch('http://localhost:3000/preview', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ domain: 'kotak.co.in', domainType: 'root', spf: [], dkim: '1024', dmarc: 'none', postmaster: '' })
})
.then(r => r.json())
.then(d => console.log(JSON.stringify(d, null, 2)))
.catch(console.error);
