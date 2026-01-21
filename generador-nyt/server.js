const express = require('express');
const bodyParser = require('body-parser');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Aumentamos el límite de tamaño por si acaso
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static('public'));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/generate-pdf', async (req, res) => {
    let browser = null; // Declaramos el navegador afuera para poder cerrarlo siempre
    
    try {
        const { authorName, bookTitle } = req.body;

        // --- LÓGICA DE FECHA FUTURA (+1 AÑO) ---
        const date = new Date();
        date.setFullYear(date.getFullYear() + 1); // Sumamos 1 año a la fecha actual
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        const formattedDate = date.toLocaleDateString('en-US', options);

        // Leemos la plantilla
        let templateHtml = fs.readFileSync(path.join(__dirname, 'template.html'), 'utf8');

        // Reemplazamos los datos
        templateHtml = templateHtml.replace('{{CURRENT_DATE}}', formattedDate);
        templateHtml = templateHtml.replace('{{USER_AUTHOR_NAME}}', authorName);
        templateHtml = templateHtml.replace('{{USER_BOOK_TITLE}}', bookTitle.toUpperCase());
        
        // Opcional: Si pusiste {{COPYRIGHT_YEAR}} en el template, esto lo actualiza también
        templateHtml = templateHtml.replace('{{COPYRIGHT_YEAR}}', date.getFullYear());

        // Lanzamos el navegador
        browser = await puppeteer.launch({
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
        
        // Configuramos tiempos de espera largos para evitar timeouts
        await page.setContent(templateHtml, { 
            waitUntil: 'networkidle2',
            timeout: 60000 // 60 segundos
        });

        const pdfBuffer = await page.pdf({
            format: 'Letter',
            printBackground: true,
            // AQUÍ ESTÁ EL CAMBIO: Redujimos top y bottom a 0.3in (antes era 0.5in)
            margin: { top: '0.3in', right: '0.5in', bottom: '0.3in', left: '0.5in' },
            timeout: 60000 // 60 segundos
        });

        // Nombre del archivo limpio
        const safeFilename = bookTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        
        // Enviamos el PDF
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="NYT_BestSeller_${safeFilename}.pdf"`,
            'Content-Length': pdfBuffer.length
        });
        
        res.send(Buffer.from(pdfBuffer));

    } catch (error) {
        console.error('Error generando el PDF:', error);
        res.status(500).send('Hubo un error generando tu Best Seller (Tiempo de espera agotado o error interno). Inténtalo de nuevo.');
    } finally {
        // --- BLOQUE DE SEGURIDAD ---
        // Esto se ejecuta SIEMPRE, haya error o no.
        // Cierra el navegador para liberar memoria RAM.
        if (browser) {
            await browser.close();
        }
    }
});

app.listen(port, () => {
    console.log(`Servidor corriendo en el puerto ${port}`);
});

app.listen(port, () => {
    console.log(`Servidor corriendo en el puerto ${port}`);
});
