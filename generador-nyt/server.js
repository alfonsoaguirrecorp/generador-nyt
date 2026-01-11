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
        
        // AQUÍ ESTÁ EL CAMBIO IMPORTANTE:
        // 1. Usamos networkidle2 (más rápido y permisivo)
        // 2. Aumentamos el timeout a 60000ms (1 minuto)
        await page.setContent(templateHtml, { 
            waitUntil: 'networkidle2',
            timeout: 60000 
        });

        const pdfBuffer = await page.pdf({
            format: 'Letter',
            printBackground: true,
            margin: { top: '0.5in', right: '0.5in', bottom: '0.5in', left: '0.5in' },
            timeout: 60000 // También aumentamos el tiempo para generar el PDF
        });

        await browser.close();

        const safeFilename = bookTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="NYT_BestSeller_${safeFilename}.pdf"`,
            'Content-Length': pdfBuffer.length
        });
        
        // Enviamos como Buffer para evitar el error de los números
        res.send(Buffer.from(pdfBuffer));

    } catch (error) {
        console.error('Error generando el PDF:', error);
        res.status(500).send('Hubo un error generando tu Best Seller (Tiempo de espera agotado o error interno). Inténtalo de nuevo.');
    }
});

app.listen(port, () => {
    console.log(`Servidor corriendo en el puerto ${port}`);
});
