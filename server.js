const express = require('express');
// Author: Dharshan B (Emp Code: IC1227)
const bodyParser = require('body-parser');
const ExcelJS = require('exceljs');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(express.static('public'));


// ================= DOMAIN PARSER =================
function parseDomain(domain, type) {
    if (type === 'sub') {
        const parts = domain.split('.');
        return {
            isSubdomain: true,
            subdomain: parts[0],
            rootDomain: parts.length > 1 ? parts.slice(1).join('.') : domain
        };
    } else {
        return {
            isSubdomain: false,
            subdomain: '',
            rootDomain: domain
        };
    }
}


// ================= BUILD DNS RECORDS =================
function buildRecords(data) {
    const records = [];

    const parsed = parseDomain(data.domain, data.domainType);
    const isSubdomain = parsed.isSubdomain;
    const subdomain = parsed.subdomain;
    const rootDomain = parsed.rootDomain;

    // ================= SPF =================
    if (data.spf && data.spf.length > 0) {
        let includes = data.spf
            .map(i => `include:${i}`)
            .join(' ');

        records.push({
            DNS_Name: 'SPF',
            Type: 'TXT',
            Host: isSubdomain ? subdomain : '@',
            Value: `v=spf1 ${includes} ~all`
        });
    }

    // ================= DKIM =================
    if (data.dkim === "2048") {
        records.push({
            DNS_Name: 'DKIM (2048)',
            Type: 'TXT',
            Host: isSubdomain ? `krx2048._domainkey.${subdomain}` : `krx2048._domainkey.`,
            Value: 'v=DKIM1; k=rsa; g=*; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAmq1nPilQtgtJB1wSJdOANtcPeA5kAz5VUTXgU7KQDt8kynQUjU4qni0dB1pjfzyIFdNv6yngeY6guKM3QpdHXxeI/jQ4ja0Ka7baGuTXUAZDvV6PAa9ge/ejkcj4OkJnjOe/d3iD/HFsZfsPWrdM nk+SRkrC+vFi73EMlvll8gKLOjJQ7sxiVfXZz5HBgqcOurnSHT58XoUroAnMGBXKzmyxbdazhQ7GbG/IVuBU+/7K7au+bTD2UIy68lpid+R4J4Eda+CqA8WTQ7yzadZOX4dh1ia7+605RXOC0wV224b+c2WdHhsSMbirC+7XjzUHtW0LmWt9y0SIO/al775utwIDAQAB'
        });
    } else {
        records.push({
            DNS_Name: 'DKIM (1024)',
            Type: 'TXT',
            Host: isSubdomain ? `mgtr._domainkey.${subdomain}` : `mgtr._domainkey.`,
            Value: 'v=DKIM1; k=rsa; g=*; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDGtyNrpv1PdP+FI/SbFyOu/tPivOvmc5v7bbsydAjKIAp7Qi98tqYoK6Hvw1cf/z3G1JtOwzy5HnW91qN6xczP2Nh6UB/HV2OAu3UEoXz65qQo/sJduiuIXQApK/5z65XL6/GWfqrn22JyqpNTbQIDHNl62N0GgpU9tg+h8P2/ZQIDAQAB'
        });
    }

    // ================= DMARC =================
    if (data.dmarc) {
        records.push({
            DNS_Name: 'DMARC',
            Type: 'TXT',
            Host: isSubdomain ? `_dmarc.${subdomain}` : '_dmarc.',
            Value: `v=DMARC1; p=${data.dmarc}`
        });
    }

    // ================= Google Postmaster =================
    if (data.postmaster) {
        records.push({
            DNS_Name: 'GooglePostmaster',
            Type: 'TXT',
            Host: isSubdomain ? subdomain : '@',
            Value: data.postmaster
        });
    }

    // ================= CNAME =================
    records.push({
        DNS_Name: 'CNAME',
        Type: 'CNAME',
        Host: `krxemails.${data.domain}`,
        Value: 'emtransbounce.fcsend.in'
    });

    return records;
}


// ================= PREVIEW =================
app.post('/preview', (req, res) => {
    const records = buildRecords(req.body);
    res.json(records);
});


// ================= EXCEL EXPORT =================
app.post('/generate-excel', async (req, res) => {
    const records = buildRecords(req.body);
    const domainName = req.body.domain.replace(/\./g, '_');

    // LOG HISTORY
    logExportHistory(req.body.user, req.body.domain);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('DNS Records');

    worksheet.columns = [
        { header: 'DNS Name', key: 'DNS_Name', width: 20 },
        { header: 'Type', key: 'Type', width: 10 },
        { header: 'Host', key: 'Host', width: 30 },
        { header: 'Value', key: 'Value', width: 70 }
    ];

    // ===== Header Styling =====
    const headerRow = worksheet.getRow(1);

    headerRow.font = {
        bold: true,
        size: 12,
        color: { argb: 'FFFFFF' }
    };

    headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '4472C4' }
    };

    headerRow.alignment = {
        vertical: 'middle',
        horizontal: 'center'
    };

    // ===== Add Data Rows =====
    records.forEach(r => worksheet.addRow(r));

    // ===== Alternating Row Colors =====
    worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1 && rowNumber % 2 === 0) {
            row.eachCell(cell => {
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'E7F1FF' }
                };
            });
        }
    });

    // ===== Borders =====
    worksheet.eachRow(row => {
        row.eachCell(cell => {
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        });
    });

    // ===== Response Headers =====
    res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );

    res.setHeader(
        'Content-Disposition',
        `attachment; filename=${domainName}_dns_records.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
});


// ================= HISTORY =================
function logExportHistory(user, domain) {
    const historyFile = 'history.json';
    let history = [];
    if (fs.existsSync(historyFile)) {
        try {
            history = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
        } catch (e) { }
    }
    history.push({
        user: user || 'Unknown Enterprise User',
        domain: domain,
        timestamp: new Date().toISOString()
    });
    fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));
}

app.get('/history', (req, res) => {
    const historyFile = 'history.json';
    let history = [];
    if (fs.existsSync(historyFile)) {
        try {
            history = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
        } catch (e) { }
    }
    // Return latest first
    res.json(history.reverse());
});

// ================= START SERVER =================
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
