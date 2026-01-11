const express = require('express');
const bodyParser = require('body-parser');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/generate-pdf', async (req, res) => {
    try {
        const { authorName, bookTitle } = req.body;
        const today = new Date();
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        const formattedDate = today.toLocaleDateString('en-US', options);

        let templateHtml = fs.readFileSync(path.join(__dirname, 'template.html'), 'utf8');

        templateHtml = templateHtml.replace('{{CURRENT_DATE}}', formattedDate);
        templateHtml = templateHtml.replace('{{USER_AUTHOR_NAME}}', authorName);
        templateHtml = templateHtml.replace('{{USER_BOOK_TITLE}}', bookTitle.toUpperCase());

        const browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--single-process',
                '--no-zygote'
            ]
        });

        const page = await browser.newPage();
        await page.setContent(templateHtml, { waitUntil: 'networkidle0' });

        const pdfBuffer = await page.pdf({
            format: 'Letter',
            printBackground: true,
            margin: { top: '0.5in', right: '0.5in', bottom: '0.5in', left: '0.5in' }
        });

        await browser.close();

        const safeFilename = bookTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="NYT_BestSeller_${safeFilename}.pdf"`,
            'Content-Length': pdfBuffer.length
        });
        res.send(pdfBuffer);

    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Error generando el PDF.');
    }
});

app.listen(port, () => {
    console.log(`Servidor corriendo en el puerto ${port}`);
});
