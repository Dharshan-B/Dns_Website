const fs = require('fs');
fetch('http://localhost:3000/preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ domain: 'utapbyeand.com', spf: [], dkim: '1024', dmarc: 'none', postmaster: '' })
})
    .then(r => r.json())
    .then(d => {
        fs.writeFileSync('clean_test.json', JSON.stringify(d, null, 2));
        console.log("Wrote clean_test.json");
    })
    .catch(console.error);
