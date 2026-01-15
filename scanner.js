// Scanner Module - Handles camera and AI model operations
// Uses Teachable Machine for waste recognition

//const MODEL_URL = "https://teachablemachine.withgoogle.com/models/sosgDoCh3/";
const MODEL_URL = "https://teachablemachine.withgoogle.com/models/gmeHtMZIG/";

class Scanner {
  constructor() {
    this.model = null;
    this.webcam = null;
    this.videoStream = null;
    this.videoElement = null;
    this.isInitialized = false;
    this.isRunning = false;
    this.maxPredictions = 0;
  }

  async init() {
    console.log('📸 Scanner module initialized');
  }

  async loadModel() {
    if (this.model) {
      console.log('ℹ️ Model already loaded');
      return;
    }

    try {
      console.log('📥 Loading AI model...');
      const modelURL = MODEL_URL + "model.json";
      const metadataURL = MODEL_URL + "metadata.json";

      // Load the model and metadata
      this.model = await tmImage.load(modelURL, metadataURL);
      this.maxPredictions = this.model.getTotalClasses();
      
      console.log(`✅ Model loaded with ${this.maxPredictions} classes`);
    } catch (error) {
      console.error('❌ Failed to load model:', error);
      throw new Error('Не удалось загрузить модель распознавания');
    }
  }

  async setupWebcam() {
    const container = document.getElementById('camera-container');
    const placeholder = document.getElementById('camera-placeholder');

    try {
      // Request camera access - FIXED: use back camera without mirroring
      const constraints = {
        video: {
          facingMode: { ideal: 'environment' }, // Back camera on mobile
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      };

      this.videoStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Create video element for full-screen display
      this.videoElement = document.createElement('video');
      this.videoElement.setAttribute('playsinline', ''); // Important for iOS
      this.videoElement.setAttribute('autoplay', '');
      this.videoElement.setAttribute('muted', '');
      this.videoElement.srcObject = this.videoStream;
      this.videoElement.style.cssText = `
        width: 100%;
        height: 100%;
        object-fit: cover;
        position: absolute;
        top: 0;
        left: 0;
      `;

      // Hide placeholder
      if (placeholder) {
        placeholder.style.display = 'none';
      }

      // Add video to container
      container.innerHTML = ''; // Clear container
      container.appendChild(this.videoElement);

      // Wait for video to be ready
      await new Promise((resolve) => {
        this.videoElement.onloadedmetadata = () => {
          this.videoElement.play();
          resolve();
        };
      });

      // Also create a canvas for Teachable Machine predictions (hidden)
      this.webcam = new tmImage.Webcam(224, 224, false); // NO flip for back camera
      await this.webcam.setup({ 
        facingMode: 'environment',
        deviceId: this.videoStream.getVideoTracks()[0].getSettings().deviceId
      });
      await this.webcam.play();
      
      // Start update loop
      this.isRunning = true;
      this.updateWebcam();

      console.log('✅ Webcam initialized (full-screen, no mirror)');
    } catch (error) {
      console.error('❌ Failed to setup webcam:', error);
      
      // Show error in placeholder
      if (placeholder) {
        placeholder.style.display = 'flex';
        placeholder.innerHTML = `
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
          <p>Не удалось получить доступ к камере</p>
          <p style="font-size: 12px; opacity: 0.7;">Проверьте разрешения в настройках браузера</p>
        `;
      }
      
      throw new Error('Не удалось запустить камеру');
    }
  }

  async updateWebcam() {
    if (this.webcam && this.isRunning) {
      await this.webcam.update();
      requestAnimationFrame(() => this.updateWebcam());
    }
  }

  async start() {
    if (this.isInitialized) {
      console.log('ℹ️ Scanner already running');
      return;
    }

    try {
      // Load model and setup webcam in parallel
      await Promise.all([
        this.loadModel(),
        this.setupWebcam()
      ]);

      this.isInitialized = true;
      console.log('✅ Scanner started');
    } catch (error) {
      console.error('❌ Failed to start scanner:', error);
      this.stop();
      throw error;
    }
  }

  stop() {
    console.log('🛑 Stopping scanner...');
    
    this.isRunning = false;
    
    // Stop video stream
    if (this.videoStream) {
      this.videoStream.getTracks().forEach(track => track.stop());
      this.videoStream = null;
    }

    // Stop webcam
    if (this.webcam) {
      this.webcam.stop();
      this.webcam = null;
    }

    // Remove video element
    if (this.videoElement) {
      this.videoElement.remove();
      this.videoElement = null;
    }

    // Clear container and reset placeholder
    const container = document.getElementById('camera-container');
    const placeholder = document.getElementById('camera-placeholder');
    
    if (container) {
      container.innerHTML = '';
    }
    
    if (placeholder) {
      placeholder.style.display = 'flex';
      placeholder.innerHTML = `
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
          <circle cx="12" cy="13" r="4"/>
        </svg>
        <p>Инициализация камеры...</p>
      `;
      container.appendChild(placeholder);
    }

    this.isInitialized = false;
    console.log('✅ Scanner stopped');
  }

  async predict() {
    if (!this.model || !this.webcam) {
      throw new Error('Scanner not initialized');
    }

    try {
      // Get prediction from current frame
      const predictions = await this.model.predict(this.webcam.canvas);
      
      // Find best prediction
      const best = predictions.reduce((prev, current) => {
        return (current.probability > prev.probability) ? current : prev;
      });

      // Normalize the class name
      const type = best.className.toLowerCase().trim();
      const confidence = best.probability;

      console.log(`🔍 Prediction: ${type} (${(confidence * 100).toFixed(1)}%)`);

      return {
        type: type,
        confidence: confidence,
        allPredictions: predictions
      };
    } catch (error) {
      console.error('❌ Prediction error:', error);
      throw new Error('Ошибка распознавания');
    }
  }

  // Get all predictions for debugging
  async getAllPredictions() {
    if (!this.model || !this.webcam) {
      return null;
    }

    try {
      const predictions = await this.model.predict(this.webcam.canvas);
      return predictions.map(p => ({
        class: p.className,
        confidence: (p.probability * 100).toFixed(2) + '%'
      }));
    } catch (error) {
      console.error('Error getting predictions:', error);
      return null;
    }
  }

  // Take a snapshot of current frame
  takeSnapshot() {
    if (!this.videoElement) {
      return null;
    }

    try {
      const canvas = document.createElement('canvas');
      canvas.width = this.videoElement.videoWidth;
      canvas.height = this.videoElement.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(this.videoElement, 0, 0);
      
      return canvas.toDataURL('image/jpeg', 0.8);
    } catch (error) {
      console.error('Error taking snapshot:', error);
      return null;
    }
  }

  // Flash effect for photo capture
  flashEffect() {
    const flash = document.createElement('div');
    flash.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: white;
      z-index: 9999;
      pointer-events: none;
      animation: flash 0.3s ease-out;
    `;
    
    const style = document.createElement('style');
    style.textContent = `
      @keyframes flash {
        0% { opacity: 1; }
        100% { opacity: 0; }
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(flash);
    
    setTimeout(() => {
      flash.remove();
      style.remove();
    }, 300);
  }
}

// Load Teachable Machine library
const loadTMLibrary = () => {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (window.tmImage) {
      resolve();
      return;
    }

    // Load TensorFlow.js
    const tfScript = document.createElement('script');
    tfScript.src = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@latest/dist/tf.min.js';
    tfScript.onload = () => {
      // Load Teachable Machine library
      const tmScript = document.createElement('script');
      tmScript.src = 'https://cdn.jsdelivr.net/npm/@teachablemachine/image@latest/dist/teachablemachine-image.min.js';
      tmScript.onload = () => {
        console.log('✅ Teachable Machine library loaded');
        resolve();
      };
      tmScript.onerror = reject;
      document.head.appendChild(tmScript);
    };
    tfScript.onerror = reject;
    document.head.appendChild(tfScript);
  });
};

// Load library before creating scanner instance
await loadTMLibrary();

// Create and export singleton instance
export const scanner = new Scanner();
