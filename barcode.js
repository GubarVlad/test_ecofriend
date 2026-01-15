// Barcode Scanner Module - COMPLETELY REWRITTEN
// Uses QuaggaJS for reliable barcode scanning

class BarcodeScanner {
  constructor() {
    this.scanning = false;
    this.videoElement = null;
    this.stream = null;
    this.quaggaLoaded = false;
    this.lastScannedCode = null;
    this.scanCooldown = 3000; // Increased cooldown to prevent duplicate scans
    this.lastScanTime = 0;
  }
  
  async init() {
    console.log('📦 Initializing barcode scanner...');
    await this.loadQuaggaJS();
  }

  async loadQuaggaJS() {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      if (window.Quagga) {
        this.quaggaLoaded = true;
        console.log('✅ QuaggaJS already loaded');
        resolve();
        return;
      }

      // Load QuaggaJS from CDN
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/quagga@0.12.1/dist/quagga.min.js';
      script.onload = () => {
        if (window.Quagga) {
          this.quaggaLoaded = true;
          console.log('✅ QuaggaJS loaded successfully');
          resolve();
        } else {
          console.error('❌ QuaggaJS failed to load');
          reject(new Error('QuaggaJS not available'));
        }
      };
      script.onerror = () => {
        console.error('❌ Failed to load QuaggaJS script');
        reject(new Error('Failed to load QuaggaJS'));
      };
      document.head.appendChild(script);
    });
  }

  async startScanning(videoElement) {
    if (!this.quaggaLoaded) {
      throw new Error('QuaggaJS not loaded. Please wait for initialization.');
    }

    if (this.scanning) {
      console.warn('⚠️ Scanner already running');
      return;
    }

    this.videoElement = videoElement;
    this.scanning = true;
    this.lastScannedCode = null;
    this.lastScanTime = 0;

    return new Promise((resolve, reject) => {
      Quagga.init({
        inputStream: {
          name: 'Live',
          type: 'LiveStream',
          target: videoElement,
          constraints: {
            width: { min: 640 },
            height: { min: 480 },
            facingMode: 'environment' // Use back camera
          }
        },
        locator: {
          patchSize: 'medium',
          halfSample: true
        },
        numOfWorkers: 4, // More workers for better performance
        frequency: 5, // Scan more frequently (every 200ms)
        decoder: {
          readers: [
            'ean_reader',
            'ean_8_reader',
            'code_128_reader',
            'code_39_reader',
            'upc_reader',
            'upc_e_reader'
          ],
          debug: {
            drawBoundingBox: false,
            showFrequency: false,
            drawScanline: false,
            showPattern: false
          }
        },
        locate: true,
        area: { // Focus on center area for better detection
          top: '20%',
          right: '20%',
          left: '20%',
          bottom: '20%'
        }
      }, (err) => {
        if (err) {
          console.error('❌ Quagga initialization error:', err);
          this.scanning = false;
          reject(err);
          return;
        }
        console.log('✅ Quagga initialized successfully');
        
        // Listen for barcode detection BEFORE starting
        Quagga.onDetected((result) => {
          if (!this.scanning) return;

          // Validate result
          if (!result || !result.codeResult || !result.codeResult.code) {
            return;
          }

          const code = result.codeResult.code;
          const now = Date.now();

          // Prevent duplicate scans - increased cooldown
          if (this.lastScannedCode === code && (now - this.lastScanTime) < this.scanCooldown) {
            console.log('⏭️ Duplicate scan ignored');
            return;
          }

          // Validate barcode format (should be numeric for EAN/UPC)
          if (!/^\d+$/.test(code) || code.length < 8) {
            console.warn('⚠️ Invalid barcode format:', code);
            return;
          }

          this.lastScannedCode = code;
          this.lastScanTime = now;

          console.log('📦 Barcode detected:', code, 'format:', result.codeResult.format);

          // Stop scanning
          this.stopScanning();

          // Lookup product
          const product = this.lookupProduct(code);

          // Dispatch event
          window.dispatchEvent(new CustomEvent('barcodedetected', {
            detail: {
              barcode: code,
              format: result.codeResult.format || 'unknown',
              localProduct: product
            }
          }));
        });

        // Start scanning
        Quagga.start();
        resolve();
      });
    });
  }

  stopScanning() {
    if (!this.scanning) return;

    this.scanning = false;

    try {
      if (window.Quagga) {
        // Remove all event listeners
        Quagga.offDetected();
        // Stop Quagga
        Quagga.stop();
      }
    } catch (error) {
      console.warn('⚠️ Error stopping Quagga:', error);
    }

    // Clear video element reference
    this.videoElement = null;

    console.log('🛑 Barcode scanner stopped');
  }

  lookupProduct(barcode) {
    // Direct lookup in local database
    const PRODUCT_DATABASE = {
      '4820024700016': { type: 'plastic', name: 'Пластиковая бутылка', brand: 'Вода' },
      '5449000000996': { type: 'plastic', name: 'Coca-Cola', brand: 'Coca-Cola' },
      '5000112549324': { type: 'plastic', name: 'Pepsi', brand: 'PepsiCo' },
      '4820024700023': { type: 'paper', name: 'Картонная упаковка', brand: 'Упаковка' },
      '5000112624809': { type: 'paper', name: 'Бумажный пакет', brand: 'Пакет' },
      '4820024700030': { type: 'glass', name: 'Стеклянная бутылка', brand: 'Вода' },
      '5000112648560': { type: 'glass', name: 'Пивная бутылка', brand: 'Пиво' },
      '5449000054227': { type: 'metal', name: 'Алюминиевая банка', brand: 'Coca-Cola' },
      '5000112549317': { type: 'metal', name: 'Алюминиевая банка', brand: 'Pepsi' }
    };

    // Check local database
    if (PRODUCT_DATABASE[barcode]) {
      return {
        ...PRODUCT_DATABASE[barcode],
        barcode: barcode,
        confidence: 1.0,
        source: 'database'
      };
    }

    // Check custom products from localStorage
    try {
      const customProducts = JSON.parse(localStorage.getItem('customProducts') || '{}');
      if (customProducts[barcode]) {
        return {
          ...customProducts[barcode],
          barcode: barcode,
          confidence: 0.9,
          source: 'custom'
        };
      }
    } catch (e) {
      console.warn('Failed to load custom products:', e);
    }

    return null;
  }

  async addProduct(barcode, type, name, brand) {
    try {
      const customProducts = JSON.parse(localStorage.getItem('customProducts') || '{}');
      customProducts[barcode] = { type, name, brand };
      localStorage.setItem('customProducts', JSON.stringify(customProducts));
      console.log(`✅ Product added: ${barcode} -> ${type} (${name})`);
    } catch (error) {
      console.error('❌ Failed to save custom product:', error);
    }
  }
}

// Export singleton
export const barcodeScanner = new BarcodeScanner();
export default barcodeScanner;
