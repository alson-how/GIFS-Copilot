import puppeteer from 'puppeteer';
import handlebars from 'handlebars';
import fs from 'fs/promises';
import path from 'path';

export class PDFService {
  private browser: any;

  async initialize() {
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  }

  async generatePDF(documentType: string, data: any): Promise<Buffer> {
    try {
      // Load the appropriate template
      const templatePath = path.join(__dirname, `../templates/${documentType}.hbs`);
      const templateContent = await fs.readFile(templatePath, 'utf-8');
      
      // Compile template with data
      const template = handlebars.compile(templateContent);
      const html = template(data);
      
      // Generate PDF
      const page = await this.browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '20mm',
          bottom: '20mm',
          left: '20mm'
        }
      });
      
      await page.close();
      return pdf;
    } catch (error) {
      console.error('PDF generation error:', error);
      throw error;
    }
  }

  async generateBatch(documents: Array<{type: string, data: any}>): Promise<Buffer[]> {
    const pdfs = [];
    for (const doc of documents) {
      const pdf = await this.generatePDF(doc.type, doc.data);
      pdfs.push(pdf);
    }
    return pdfs;
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// Register Handlebars helpers
handlebars.registerHelper('formatDate', (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
});

handlebars.registerHelper('formatCurrency', (amount, currency) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD'
  }).format(amount);
});

handlebars.registerHelper('uppercase', (str) => {
  return str ? str.toUpperCase() : '';
});

handlebars.registerHelper('formatAddress', (address) => {
  if (typeof address === 'object') {
    return [
      address.line1,
      address.line2,
      address.line3,
      `${address.city}, ${address.state} ${address.postalCode}`,
      address.country
    ].filter(Boolean).join('\\n');
  }
  return address;
});