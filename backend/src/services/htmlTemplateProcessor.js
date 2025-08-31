import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';
import wkhtmltopdf from 'wkhtmltopdf';
import { Readable } from 'stream';

class HTMLTemplateProcessor {
  constructor() {
    this.templatesDir = path.join(process.cwd(), 'documentTemplate');
  }

  async generatePDFFromTemplate(templateName, data, outputPath) {
    try {
      console.log(`📄 Generating PDF from template: ${templateName}`);
      
      // Read the HTML template
      const templatePath = path.join(this.templatesDir, `${templateName}.html`);
      
      if (!fs.existsSync(templatePath)) {
        throw new Error(`Template not found: ${templatePath}`);
      }
      
      let htmlContent = fs.readFileSync(templatePath, 'utf8');
      
      // Replace data in template based on document type
      htmlContent = this.replaceTemplateData(templateName, htmlContent, data);
      
      // Try wkhtmltopdf first (more reliable in Docker)
      try {
        await this.generateWithWkhtmltopdf(htmlContent, outputPath);
        console.log(`✅ PDF generated successfully with wkhtmltopdf: ${outputPath}`);
        return outputPath;
      } catch (wkhtmlError) {
        console.warn(`⚠️ wkhtmltopdf failed, trying Puppeteer: ${wkhtmlError.message}`);
        
        // Fallback to Puppeteer
        return await this.generateWithPuppeteer(htmlContent, outputPath);
      }
      
    } catch (error) {
      console.error(`❌ Error generating PDF from template ${templateName}:`, error);
      throw new Error(`Failed to generate PDF: ${error.message}`);
    }
  }

  async generateWithWkhtmltopdf(htmlContent, outputPath) {
    return new Promise((resolve, reject) => {
      const options = {
        pageSize: 'A4',
        marginTop: '10mm',
        marginRight: '10mm',
        marginBottom: '10mm',
        marginLeft: '10mm',
        printMediaType: true,
        enableLocalFileAccess: true
      };

      // Create a readable stream from HTML content
      const htmlStream = Readable.from([htmlContent]);
      
      // Create PDF stream
      const pdfStream = wkhtmltopdf(htmlStream, options);
      const writeStream = fs.createWriteStream(outputPath);
      
      pdfStream.pipe(writeStream);
      
      writeStream.on('finish', () => {
        resolve(outputPath);
      });
      
      writeStream.on('error', reject);
      pdfStream.on('error', reject);
    });
  }

  async generateWithPuppeteer(htmlContent, outputPath) {
    let browser = null;
    
    try {
      browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--run-all-compositor-stages-before-draw',
          '--memory-pressure-off'
        ],
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
        timeout: 60000,
        protocolTimeout: 60000
      });
      
      const page = await browser.newPage();
      await page.setContent(htmlContent, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      });
      
      await page.pdf({
        path: outputPath,
        format: 'A4',
        printBackground: true,
        margin: {
          top: '10mm',
          right: '10mm',
          bottom: '10mm',
          left: '10mm'
        },
        timeout: 30000
      });
      
      console.log(`✅ PDF generated successfully with Puppeteer: ${outputPath}`);
      return outputPath;
      
    } finally {
      if (browser) {
        try {
          await browser.close();
        } catch (closeError) {
          console.warn(`⚠️ Error closing browser: ${closeError.message}`);
        }
      }
    }
  }

  replaceTemplateData(templateName, htmlContent, data) {
    console.log(`🔄 Processing template data for: ${templateName}`);
    
    switch (templateName) {
      case 'billOfLadingTemplate':
        return this.replaceBillOfLadingData(htmlContent, data);
      case 'packingListTemplate':
        return this.replacePackingListData(htmlContent, data);
      case 'bookingConfirmationTemplate':
        return this.replaceBookingConfirmationData(htmlContent, data);
      case 'customsDeclarationTemplate':
        return this.replaceCustomsDeclarationData(htmlContent, data);
      default:
        console.warn(`⚠️ Unknown template: ${templateName}`);
        return htmlContent;
    }
  }

  replaceBillOfLadingData(html, data) {
    // Replace B/L Number
    if (data.blNumber) {
      html = html.replace(/GLLSGSIN2024011500001/g, data.blNumber);
    }
    
    // Replace Shipper Information
    if (data.parties?.shipper) {
      const shipper = data.parties.shipper;
      let shipperText = shipper.name || '';
      if (shipper.address) {
        if (typeof shipper.address === 'string') {
          shipperText += `\n${shipper.address}`;
        } else if (shipper.address.line1) {
          shipperText += `\n${shipper.address.line1}`;
          if (shipper.address.line2) shipperText += `\n${shipper.address.line2}`;
          if (shipper.address.city) shipperText += `\n${shipper.address.city}`;
          if (shipper.address.country) shipperText += `\n${shipper.address.country}`;
        }
      }
      if (shipper.contact) shipperText += `\nCONTACT: ${shipper.contact}`;
      if (shipper.phone) shipperText += `\nTEL: ${shipper.phone}`;
      if (shipper.email) shipperText += `\nEMAIL: ${shipper.email}`;
      
      html = html.replace(
        /TECH INNOVATIONS PTE LTD[\s\S]*?EMAIL: export@techinnovations\.sg/,
        shipperText.replace(/\n/g, '\n')
      );
    }
    
    // Replace Consignee Information
    if (data.parties?.consignee) {
      const consignee = data.parties.consignee;
      let consigneeText = consignee.name || '';
      if (consignee.address) {
        if (typeof consignee.address === 'string') {
          consigneeText += `\n${consignee.address}`;
        } else if (consignee.address.line1) {
          consigneeText += `\n${consignee.address.line1}`;
          if (consignee.address.line2) consigneeText += `\n${consignee.address.line2}`;
          if (consignee.address.city) consigneeText += `\n${consignee.address.city}`;
          if (consignee.address.country) consigneeText += `\n${consignee.address.country}`;
        }
      }
      
      html = html.replace(
        /TO THE ORDER OF[\s\S]*?SINGAPORE 048583/,
        consigneeText.replace(/\n/g, '\n')
      );
    }
    
    // Replace Vessel Information
    if (data.voyage?.oceanVessel) {
      html = html.replace(/MV GLOBAL TRADER/, data.voyage.oceanVessel);
    }
    if (data.voyage?.voyageNumber) {
      html = html.replace(/GT-2024-001/, data.voyage.voyageNumber);
    }
    
    // Replace Port Information
    if (data.voyage?.portOfLoading?.port) {
      html = html.replace(/SINGAPORE/, data.voyage.portOfLoading.port);
    }
    if (data.voyage?.portOfDischarge?.port) {
      html = html.replace(/LOS ANGELES, CA/, data.voyage.portOfDischarge.port);
    }
    
    // Replace Cargo Description
    if (data.cargo?.descriptionOfGoods?.description) {
      html = html.replace(
        /ELECTRONIC COMPONENTS AND SEMICONDUCTORS[\s\S]*?AS PER PACKING LIST/,
        data.cargo.descriptionOfGoods.description
      );
    }
    
    // Replace Package Information
    if (data.cargo?.numberOfPackages?.quantity && data.cargo?.numberOfPackages?.type) {
      html = html.replace(
        /50 CARTONS/,
        `${data.cargo.numberOfPackages.quantity} ${data.cargo.numberOfPackages.type}`
      );
    }
    
    // Replace Weight Information
    if (data.cargo?.weight?.gross && data.cargo?.weight?.unit) {
      html = html.replace(/2,500\.00 KGS/, `${data.cargo.weight.gross} ${data.cargo.weight.unit}`);
    }
    
    // Replace Measurement
    if (data.cargo?.measurement?.volume && data.cargo?.measurement?.unit) {
      html = html.replace(/45\.50 CBM/, `${data.cargo.measurement.volume} ${data.cargo.measurement.unit}`);
    }
    
    // Replace Issue Date
    if (data.issueDetails?.dateOfIssue) {
      html = html.replace(/15th January 2024/, this.formatDate(data.issueDetails.dateOfIssue));
    }
    
    return html;
  }

  replacePackingListData(html, data) {
    console.log('📦 Replacing Packing List data:', JSON.stringify(data, null, 2).substring(0, 500));
    
    // Replace Document Number
    if (data.documentNumber) {
      html = html.replace(/PL-20240115-0001/g, data.documentNumber);
    }
    
    // Replace Date
    if (data.date) {
      html = html.replace(/January 15, 2024/g, this.formatDate(data.date));
    }
    
    // Replace Company Name in header
    if (data.parties?.shipper?.name) {
      html = html.replace(/GLOBAL LOGISTICS SOLUTIONS LTD/g, data.parties.shipper.name);
    }
    
    // Replace Shipper Information in parties section
    if (data.parties?.shipper) {
      const shipper = data.parties.shipper;
      
      // Build shipper address block
      let shipperBlock = shipper.name || 'TechFlow Solutions Sdn Bhd';
      if (shipper.address) shipperBlock += `<br>${shipper.address}`;
      if (shipper.contact) shipperBlock += `<br>Contact: ${shipper.contact}`;
      if (shipper.phone) shipperBlock += `<br>Tel: ${shipper.phone}`;
      if (shipper.email) shipperBlock += `<br>Email: ${shipper.email}`;
      
      // Replace the shipper section in template
      html = html.replace(
        /(<div class="party-info">[\s\S]*?<div class="party-name">Shipper<\/div>[\s\S]*?<div class="party-details">)([\s\S]*?)(<\/div>[\s\S]*?<\/div>)/,
        `$1${shipperBlock}$3`
      );
    }
    
    // Replace Consignee Information
    if (data.parties?.consignee) {
      const consignee = data.parties.consignee;
      
      // Build consignee address block
      let consigneeBlock = consignee.name || 'Beijing Advanced Tech Co Ltd';
      if (consignee.address) consigneeBlock += `<br>${consignee.address}`;
      if (consignee.contact) consigneeBlock += `<br>Contact: ${consignee.contact}`;
      if (consignee.phone) consigneeBlock += `<br>Tel: ${consignee.phone}`;
      if (consignee.email) consigneeBlock += `<br>Email: ${consignee.email}`;
      
      // Replace the consignee section in template
      html = html.replace(
        /(<div class="party-info">[\s\S]*?<div class="party-name">Consignee<\/div>[\s\S]*?<div class="party-details">)([\s\S]*?)(<\/div>[\s\S]*?<\/div>)/,
        `$1${consigneeBlock}$3`
      );
    }
    
    // Replace Items in the table
    if (data.items && Array.isArray(data.items) && data.items.length > 0) {
      let itemsHTML = '';
      data.items.forEach((item, index) => {
        itemsHTML += `
          <tr>
            <td>${index + 1}</td>
            <td>${item.description || 'AI Accelerator Cards'}</td>
            <td>${item.quantity || 50} ${item.unit || 'PCS'}</td>
            <td>${item.netWeight || 25} KG</td>
            <td>${item.grossWeight || 27.5} KG</td>
            <td>${item.packages?.count || 1} ${item.packages?.type || 'CARTON'}</td>
            <td>${item.dimensions || '60x40x30 cm'}</td>
          </tr>
        `;
      });
      
      // Replace the items table body
      html = html.replace(
        /(<tbody>)([\s\S]*?)(<\/tbody>)/,
        `$1${itemsHTML}$3`
      );
    }
    
    // Replace Summary Totals
    if (data.summary) {
      if (data.summary.totalPackages) {
        html = html.replace(/Total Packages: \d+/g, `Total Packages: ${data.summary.totalPackages}`);
      }
      if (data.summary.totalNetWeight) {
        html = html.replace(/Total Net Weight: [\d,.]+ KG/g, `Total Net Weight: ${data.summary.totalNetWeight} KG`);
      }
      if (data.summary.totalGrossWeight) {
        html = html.replace(/Total Gross Weight: [\d,.]+ KG/g, `Total Gross Weight: ${data.summary.totalGrossWeight} KG`);
      }
      if (data.summary.totalCBM) {
        html = html.replace(/Total CBM: [\d,.]+/g, `Total CBM: ${data.summary.totalCBM}`);
      }
    }
    
    return html;
  }

  replaceBookingConfirmationData(html, data) {
    // Replace Booking Reference
    if (data.bookingReference) {
      html = html.replace(/BKG-20240115-7890/, data.bookingReference);
    }
    
    // Replace Booking Date
    if (data.bookingDate) {
      html = html.replace(/January 15, 2024/, this.formatDate(data.bookingDate));
    }
    
    // Replace Status
    if (data.status) {
      html = html.replace(/CONFIRMED/, data.status);
    }
    
    // Replace Shipper Information
    if (data.parties?.shipper) {
      const shipper = data.parties.shipper;
      let shipperText = shipper.name || '';
      if (shipper.address) shipperText += `\n${shipper.address}`;
      if (shipper.email) shipperText += `\nEmail: ${shipper.email}`;
      if (shipper.phone) shipperText += `\nPhone: ${shipper.phone}`;
      
      html = html.replace(/TECHFLOW SOLUTIONS SDN BHD[\s\S]*?Phone: \+60 3 1234 5678/, shipperText);
    }
    
    // Replace Consignee Information
    if (data.parties?.consignee) {
      const consignee = data.parties.consignee;
      let consigneeText = consignee.name || '';
      if (consignee.address) consigneeText += `\n${consignee.address}`;
      if (consignee.email) consigneeText += `\nEmail: ${consignee.email}`;
      if (consignee.phone) consigneeText += `\nPhone: ${consignee.phone}`;
      
      html = html.replace(/BEIJING ADVANCED TECH CO LTD[\s\S]*?Phone: \+86 10 8765 4321/, consigneeText);
    }
    
    // Replace Routing Information
    if (data.routing) {
      if (data.routing.portOfLoading?.port) {
        html = html.replace(/Port Klang, Malaysia/, data.routing.portOfLoading.port);
      }
      if (data.routing.portOfDischarge?.port) {
        html = html.replace(/Shanghai, China/, data.routing.portOfDischarge.port);
      }
      if (data.routing.vessel?.name) {
        html = html.replace(/MV ASIA EXPRESS/, data.routing.vessel.name);
      }
      if (data.routing.transitTime) {
        html = html.replace(/14 days/, data.routing.transitTime);
      }
    }
    
    // Replace Cargo Information
    if (data.cargo) {
      if (data.cargo.description) {
        html = html.replace(/Electronic Components and Semiconductors/, data.cargo.description);
      }
      if (data.cargo.numberOfPackages) {
        html = html.replace(/50 Cartons/, `${data.cargo.numberOfPackages} ${data.cargo.packageType || 'Packages'}`);
      }
      if (data.cargo.grossWeight) {
        html = html.replace(/2,500 KG/, `${data.cargo.grossWeight} ${data.cargo.weightUnit || 'KG'}`);
      }
      if (data.cargo.volume) {
        html = html.replace(/45\.5 CBM/, `${data.cargo.volume} ${data.cargo.volumeUnit || 'CBM'}`);
      }
    }
    
    return html;
  }

  replaceCustomsDeclarationData(html, data) {
    // Replace Declaration Number
    if (data.declarationNumber) {
      html = html.replace(/EXP-2024-001234/, data.declarationNumber);
    }
    
    // Replace Declaration Type
    if (data.declarationType) {
      html = html.replace(/EXPORT/, data.declarationType);
    }
    
    // Replace Exporter Information
    if (data.exporterDetails) {
      const exporter = data.exporterDetails;
      let exporterText = exporter.name || '';
      if (exporter.address) exporterText += `\n${exporter.address}`;
      if (exporter.city) exporterText += `\n${exporter.city}, ${exporter.country || ''}`;
      if (exporter.taxId) exporterText += `\nTax ID: ${exporter.taxId}`;
      
      html = html.replace(/TECHFLOW SOLUTIONS SDN BHD[\s\S]*?Tax ID: MY12345678901/, exporterText);
    }
    
    // Replace Importer Information
    if (data.importerDetails) {
      const importer = data.importerDetails;
      let importerText = importer.name || '';
      if (importer.address) importerText += `\n${importer.address}`;
      if (importer.city) importerText += `\n${importer.city}, ${importer.country || ''}`;
      
      html = html.replace(/BEIJING ADVANCED TECH CO LTD[\s\S]*?Beijing 100000, China/, importerText);
    }
    
    // Replace Commodities Table
    if (data.commodities && Array.isArray(data.commodities)) {
      let commoditiesTableHTML = '';
      data.commodities.forEach((item, index) => {
        commoditiesTableHTML += `
          <tr>
            <td>${index + 1}</td>
            <td>${item.description || 'N/A'}</td>
            <td>${item.hsCode || 'N/A'}</td>
            <td>${item.quantity || 0} ${item.unit || ''}</td>
            <td>${item.totalValue || 0}</td>
            <td>${item.currency || 'USD'}</td>
            <td>${item.countryOfOrigin || 'N/A'}</td>
          </tr>
        `;
      });
      
      // Replace existing table rows
      html = html.replace(
        /<tbody>[\s\S]*?<\/tbody>/,
        `<tbody>${commoditiesTableHTML}</tbody>`
      );
    }
    
    // Replace Total Declared Value
    if (data.valuation?.totalDeclaredValue) {
      html = html.replace(/USD 142,500\.00/, `${data.valuation.currency || 'USD'} ${data.valuation.totalDeclaredValue}`);
    }
    
    return html;
  }

  formatDate(dateString) {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  }

  // Utility method to safely replace text with proper HTML encoding
  safeReplace(html, searchValue, replaceValue) {
    if (!replaceValue) return html;
    
    // Escape HTML characters in the replacement value
    const escapedValue = replaceValue
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/\n/g, '<br>');
    
    return html.replace(searchValue, escapedValue);
  }
}

export default HTMLTemplateProcessor;
