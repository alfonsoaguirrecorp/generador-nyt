{\rtf1\ansi\ansicpg1252\cocoartf2822
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fswiss\fcharset0 Helvetica;}
{\colortbl;\red255\green255\blue255;}
{\*\expandedcolortbl;;}
\margl1440\margr1440\vieww11520\viewh8400\viewkind0
\pard\tx720\tx1440\tx2160\tx2880\tx3600\tx4320\tx5040\tx5760\tx6480\tx7200\tx7920\tx8640\pardirnatural\partightenfactor0

\f0\fs24 \cf0 const express = require('express');\
const bodyParser = require('body-parser');\
const puppeteer = require('puppeteer');\
const fs = require('fs');\
const path = require('path');\
\
const app = express();\
const port = process.env.PORT || 3000; // Usa el puerto que Render asigne\
\
app.use(bodyParser.urlencoded(\{ extended: true \}));\
app.use(express.static('public'));\
\
app.get('/', (req, res) => \{\
    res.sendFile(path.join(__dirname, 'public', 'index.html'));\
\});\
\
app.post('/generate-pdf', async (req, res) => \{\
    try \{\
        const \{ authorName, bookTitle \} = req.body;\
\
        // Fecha actual\
        const today = new Date();\
        const options = \{ year: 'numeric', month: 'long', day: 'numeric' \};\
        const formattedDate = today.toLocaleDateString('en-US', options);\
\
        // Leer plantilla\
        let templateHtml = fs.readFileSync(path.join(__dirname, 'template.html'), 'utf8');\
\
        // Reemplazar datos\
        templateHtml = templateHtml.replace('\{\{CURRENT_DATE\}\}', formattedDate);\
        templateHtml = templateHtml.replace('\{\{USER_AUTHOR_NAME\}\}', authorName);\
        templateHtml = templateHtml.replace('\{\{USER_BOOK_TITLE\}\}', bookTitle.toUpperCase());\
\
        // Iniciar Puppeteer (Configuraci\'f3n optimizada para Render)\
        const browser = await puppeteer.launch(\{\
            headless: 'new',\
            args: [\
                '--no-sandbox',\
                '--disable-setuid-sandbox',\
                '--disable-dev-shm-usage',\
                '--single-process', // A veces necesario en entornos con poca memoria\
                '--no-zygote'\
            ]\
        \});\
\
        const page = await browser.newPage();\
\
        // Cargar HTML\
        await page.setContent(templateHtml, \{ waitUntil: 'networkidle0' \});\
\
        // Generar PDF\
        const pdfBuffer = await page.pdf(\{\
            format: 'Letter',\
            printBackground: true,\
            margin: \{ top: '0.5in', right: '0.5in', bottom: '0.5in', left: '0.5in' \}\
        \});\
\
        await browser.close();\
\
        // Enviar al usuario\
        const safeFilename = bookTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();\
        res.set(\{\
            'Content-Type': 'application/pdf',\
            'Content-Disposition': `attachment; filename="NYT_BestSeller_$\{safeFilename\}.pdf"`,\
            'Content-Length': pdfBuffer.length\
        \});\
        res.send(pdfBuffer);\
\
    \} catch (error) \{\
        console.error('Error:', error);\
        res.status(500).send('Error generando el PDF. Por favor intenta de nuevo.');\
    \}\
\});\
\
app.listen(port, () => \{\
    console.log(`Servidor corriendo en el puerto $\{port\}`);\
\});}