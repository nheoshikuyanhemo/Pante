// NFT Module - Cat-themed NFT creation, verification, and marketplace
(function() {
  'use strict';

  // ===== CAT DETECTION (Simulated AI - replace with real API) =====
  class CatDetector {
    constructor() {
      this.isProcessing = false;
    }

    async detect(file) {
      if (this.isProcessing) return { success: false, message: 'Already processing' };
      
      this.isProcessing = true;
      const startTime = Date.now();
      
      // Simulate AI processing with progress updates
      const updateProgress = (percent, text) => {
        const fill = document.getElementById('progressFill');
        const txt = document.getElementById('detectionText');
        if (fill) fill.style.width = percent + '%';
        if (txt) txt.textContent = text;
      };

      updateProgress(10, 'Loading image...');
      await this.sleep(300);
      
      updateProgress(30, 'Analyzing pixels...');
      await this.sleep(500);
      
      updateProgress(60, 'Running cat detection model...');
      await this.sleep(800);
      
      updateProgress(90, 'Verifying cat features...');
      await this.sleep(400);
      
      // Simulate detection result (80% success rate for demo)
      const hasCat = Math.random() > 0.2;
      const confidence = hasCat ? (0.75 + Math.random() * 0.24).toFixed(2) : (0.1 + Math.random() * 0.3).toFixed(2);
      
      updateProgress(100, hasCat ? `Cat detected! Confidence: ${confidence * 100}%` : 'No cat detected in image');
      await this.sleep(300);
      
      this.isProcessing = false;
      
      return {
        success: hasCat,
        confidence: parseFloat(confidence),
        message: hasCat ? 'Cat detected successfully' : 'No cat content found'
      };
    }

    sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }
  }

  // ===== NFT MARKETPLACE DATA =====
  // Smart contract not deployed yet — marketplace shows "Coming soon".
  // Real NFT data will be loaded from blockchain once the contract is live.
  const mockNFTs = [];

  // ===== STATE =====
  let currentTab = 'marketplace';
  let currentFilter = 'all';
  let currentSort = 'newest';
  let uploadedFile = null;
  let catDetected = false;

  // ===== DOM ELEMENTS =====
  const elements = {
    // Upload
    uploadArea: document.getElementById('uploadArea'),
    fileInput: document.getElementById('nftFileInput'),
    uploadPlaceholder: document.getElementById('uploadPlaceholder'),
    uploadPreview: document.getElementById('uploadPreview'),
    previewImage: document.getElementById('previewImage'),
    previewVideo: document.getElementById('previewVideo'),
    removeFile: document.getElementById('removeFile'),
    
    // Cat Detection
    detectionStatus: document.getElementById('detectionStatus'),
    progressFill: document.getElementById('progressFill'),
    detectionText: document.getElementById('detectionText'),
    detectionResult: document.getElementById('detectionResult'),
    resultSuccess: document.getElementById('resultSuccess'),
    resultFail: document.getElementById('resultFail'),
    catDetection: document.getElementById('catDetection'),
    
    // Metadata
    nftName: document.getElementById('nftName'),
    nftDescription: document.getElementById('nftDescription'),
    nftCategory: document.getElementById('nftCategory'),
    nftRoyalty: document.getElementById('nftRoyalty'),
    
    // Actions
    mintBtn: document.getElementById('mintBtn'),
    
    // Marketplace
    nftGrid: document.getElementById('nftGrid'),
    myNftGrid: document.getElementById('myNftGrid'),
    sortFilter: document.getElementById('sortFilter'),
    categoryFilter: document.getElementById('categoryFilter'),
    loadMore: document.getElementById('loadMore'),
    
    // Tabs
    tabBtns: document.querySelectorAll('.tab-btn'),
    tabPanels: document.querySelectorAll('.tab-panel'),
    
    // Wallet
    walletStatus: document.getElementById('nftWalletStatus'),
    walletBtn: document.getElementById('walletBtn')
  };

  // ===== INITIALIZATION =====
  function init() {
    setupEventListeners();
    renderMarketplace();
    updateWalletStatus();
    
    // Language change listener
    window.addEventListener('languageChanged', () => {
      renderMarketplace();
      renderMyNFTs();
    });
  }

  function setupEventListeners() {
    // File upload
    elements.uploadArea.addEventListener('click', () => elements.fileInput.click());
    elements.uploadArea.addEventListener('dragover', handleDragOver);
    elements.uploadArea.addEventListener('dragleave', handleDragLeave);
    elements.uploadArea.addEventListener('drop', handleDrop);
    elements.fileInput.addEventListener('change', handleFileSelect);
    elements.removeFile.addEventListener('click', removeFile);
    
    // Mint button
    elements.mintBtn.addEventListener('click', handleMint);
    
    // Metadata inputs - enable mint when filled
    [elements.nftName, elements.nftDescription].forEach(el => {
      el.addEventListener('input', checkMintReady);
    });
    
    // Marketplace filters
    elements.sortFilter.addEventListener('change', (e) => {
      currentSort = e.target.value;
      renderMarketplace();
    });
    elements.categoryFilter.addEventListener('change', (e) => {
      currentFilter = e.target.value;
      renderMarketplace();
    });
    elements.loadMore.addEventListener('click', () => {
      // Marketplace data loads from blockchain after contract deployment
      const grid = elements.nftGrid;
      if (grid && grid.querySelector('.marketplace-coming-soon')) return;
      alert(t('nft.coming_soon_desc') || 'NFT trading will be available once our smart contract is deployed.');
    });
    
    // Tabs
    elements.tabBtns.forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
    
    // Wallet connect (reuse from main script)
    if (elements.walletBtn) {
      elements.walletBtn.addEventListener('click', connectWallet);
    }
  }

  // ===== FILE HANDLING =====
  function handleDragOver(e) {
    e.preventDefault();
    elements.uploadArea.classList.add('dragover');
  }
  
  function handleDragLeave(e) {
    e.preventDefault();
    elements.uploadArea.classList.remove('dragover');
  }
  
  function handleDrop(e) {
    e.preventDefault();
    elements.uploadArea.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }
  
  function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) processFile(file);
  }
  
  function processFile(file) {
    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'video/mp4', 'video/webm'];
    if (!validTypes.includes(file.type)) {
      alert('Invalid file type. Use PNG, JPG, GIF, WEBP, MP4, or WEBM');
      return;
    }
    
    // Validate file size (50MB)
    if (file.size > 50 * 1024 * 1024) {
      alert('File too large. Maximum 50MB.');
      return;
    }
    
    uploadedFile = file;
    catDetected = false;
    
    // Show preview
    const url = URL.createObjectURL(file);
    if (file.type.startsWith('image/')) {
      elements.previewImage.src = url;
      elements.previewImage.hidden = false;
      elements.previewVideo.hidden = true;
    } else {
      elements.previewVideo.src = url;
      elements.previewImage.hidden = true;
      elements.previewVideo.hidden = false;
    }
    
    elements.uploadPlaceholder.hidden = true;
    elements.uploadPreview.hidden = false;
    elements.catDetection.hidden = false;
    
    // Reset detection UI
    elements.detectionStatus.textContent = 'Analyzing...';
    elements.detectionStatus.className = 'detection-status';
    elements.progressFill.style.width = '0%';
    elements.detectionText.textContent = window.I18N?.en?.['nft.analyzing'] || 'Analyzing image for cat content...';
    elements.detectionResult.hidden = true;
    elements.resultSuccess.hidden = true;
    elements.resultFail.hidden = true;
    
    // Run cat detection
    const detector = new CatDetector();
    detector.detect(file).then(result => {
      catDetected = result.success;
      elements.detectionStatus.textContent = result.success ? 'Cat Found ✓' : 'No Cat ✗';
      elements.detectionStatus.className = 'detection-status ' + (result.success ? 'success' : 'fail');
      elements.detectionResult.hidden = false;
      elements.resultSuccess.hidden = !result.success;
      elements.resultFail.hidden = result.success;
      checkMintReady();
    });
  }
  
  function removeFile() {
    if (uploadedFile) {
      URL.revokeObjectURL(uploadedFile);
    }
    uploadedFile = null;
    catDetected = false;
    elements.fileInput.value = '';
    elements.uploadPlaceholder.hidden = false;
    elements.uploadPreview.hidden = true;
    elements.catDetection.hidden = true;
    elements.mintBtn.disabled = true;
  }

  // ===== MINT LOGIC =====
  function checkMintReady() {
    const hasName = elements.nftName.value.trim().length > 0;
    const hasDesc = elements.nftDescription.value.trim().length > 0;
    const hasFile = uploadedFile !== null;
    const hasCat = catDetected;
    const walletConnected = elements.walletBtn?.classList.contains('connected') || false;
    
    elements.mintBtn.disabled = !(hasName && hasDesc && hasFile && hasCat && walletConnected);
  }
  
  async function handleMint() {
    if (!catDetected || !uploadedFile) return;
    
    const btn = elements.mintBtn;
    btn.disabled = true;
    btn.textContent = window.I18N?.[window.currentLang]?.['nft.minting'] || 'Minting...';
    
    // Simulate minting process
    await simulateMinting();
    
    btn.textContent = window.I18N?.[window.currentLang]?.['nft.mint'] || 'Mint NFT';
    btn.disabled = false;
    
    // Add to "my NFTs"
    addToMyNFTs({
      name: elements.nftName.value,
      description: elements.nftDescription.value,
      category: elements.nftCategory.value,
      royalty: elements.nftRoyalty.value
    });
    
    // Reset form
    removeFile();
    elements.nftName.value = '';
    elements.nftDescription.value = '';
    elements.nftCategory.value = 'art';
    elements.nftRoyalty.value = '5';
    
    alert('NFT minted successfully! Check "My NFTs" tab.');
    switchTab('my-nfts');
  }
  
  function simulateMinting() {
    return new Promise(resolve => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress >= 100) {
          clearInterval(interval);
          resolve();
        }
      }, 200);
    });
  }
  
  function addToMyNFTs(data) {
    const newNFT = {
      id: Date.now().toString(),
      ...data,
      image: uploadedFile ? URL.createObjectURL(uploadedFile) : '',
      price: 'Not listed',
      creator: 'You',
      likes: 0,
      views: 0,
      mintedAt: new Date().toISOString()
    };
    
    // Store in localStorage for demo
    const myNFTs = JSON.parse(localStorage.getItem('pante_my_nfts') || '[]');
    myNFTs.unshift(newNFT);
    localStorage.setItem('pante_my_nfts', JSON.stringify(myNFTs));
    
    renderMyNFTs();
  }

  // ===== MARKETPLACE RENDERING =====
  function renderMarketplace() {
    if (mockNFTs.length === 0) {
      elements.nftGrid.innerHTML = `<div class="marketplace-coming-soon">
        <div class="cs-icon">🐱</div>
        <h3>${t('nft.coming_soon_title') || 'Marketplace Coming Soon'}</h3>
        <p>${t('nft.coming_soon_desc') || 'NFT trading will be available once our smart contract is deployed.'}</p>
      </div>`;
      return;
    }

    let filtered = mockNFTs.filter(nft => currentFilter === 'all' || nft.category === currentFilter);
    
    // Sort
    switch (currentSort) {
      case 'price_asc':
        filtered.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
        break;
      case 'price_desc':
        filtered.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
        break;
      case 'popular':
        filtered.sort((a, b) => b.likes - a.likes);
        break;
      case 'newest':
      default:
        filtered.sort((a, b) => b.id - a.id);
        break;
    }
    
    elements.nftGrid.innerHTML = filtered.map(nft => createNFTCard(nft, false)).join('');
    
    // Add click handlers for NFT cards
    elements.nftGrid.querySelectorAll('.nft-card').forEach(card => {
      card.addEventListener('click', () => showNFTDetail(card.dataset.id));
    });
  }
  
  function renderMyNFTs() {
    const myNFTs = JSON.parse(localStorage.getItem('pante_my_nfts') || '[]');
    
    if (myNFTs.length === 0) {
      elements.myNftGrid.innerHTML = `<p class="empty-state">${t('nft.no_nfts')}</p>`;
      return;
    }
    
    elements.myNftGrid.innerHTML = myNFTs.map(nft => createNFTCard(nft, true)).join('');
  }
  
  function createNFTCard(nft, isOwned) {
    const categoryLabel = {
      art: t('nft.cat_art'),
      photo: t('nft.cat_photo'),
      animation: t('nft.cat_animation'),
      meme: t('nft.cat_meme')
    }[nft.category] || nft.category;
    
    return `
      <div class="nft-card reveal-item" data-id="${nft.id}">
        <div class="nft-image">
          <img src="${nft.image}" alt="${nft.name}" loading="lazy">
          <span class="nft-category">${categoryLabel}</span>
          ${isOwned ? '<span class="nft-owned-badge" data-i18n="nft.owned">Owned</span>' : ''}
        </div>
        <div class="nft-info">
          <h3>${nft.name}</h3>
          <p class="nft-creator">by ${nft.creator}</p>
          <div class="nft-stats">
            <span>❤️ ${nft.likes}</span>
            <span>👁 ${nft.views}</span>
          </div>
          <div class="nft-price">${nft.price}</div>
          ${!isOwned ? `<button class="nft-buy-btn" data-i18n="nft.buy">Buy</button>` : ''}
        </div>
      </div>
    `;
  }
  
  function showNFTDetail(id) {
    // In real app, navigate to detail page or open modal
    console.log('Show NFT detail:', id);
    alert('NFT Detail view - would open modal with full info, buy/sell options');
  }

  // ===== TABS =====
  function switchTab(tabId) {
    currentTab = tabId;
    
    elements.tabBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });
    elements.tabPanels.forEach(panel => {
      panel.classList.toggle('active', panel.id === tabId + '-panel');
      panel.classList.toggle('hidden', panel.id !== tabId + '-panel');
    });
    
    if (tabId === 'my-nfts') renderMyNFTs();
    if (tabId === 'marketplace') renderMarketplace();
  }

  // ===== WALLET =====
    async function connectWallet() {
      // Use unified wallet API from wallet-reown.js
      if (window.PanteWallet && typeof window.PanteWallet.open === 'function') {
        await window.PanteWallet.open();
        // Wallet status will be updated via paintConnected event
        return;
      }
    
      // Fallback to MetaMask if Reown not available
      if (typeof window.ethereum === 'undefined') {
        alert('Please install MetaMask to use NFT features');
        return;
      }

      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const addr = accounts[0];
        const short = addr.slice(0, 6) + '...' + addr.slice(-4);

        if (elements.walletBtn) {
          elements.walletBtn.textContent = short;
          elements.walletBtn.classList.add('connected');
        }
        if (elements.walletStatus) {
          elements.walletStatus.textContent = `Connected: ${short}`;
          elements.walletStatus.classList.add('connected');
        }

        checkMintReady();
        renderMyNFTs();
      } catch (e) {
        alert('Wallet connection rejected');
      }
    }

    function updateWalletStatus() {
      // Use unified wallet API from wallet-reown.js
      if (window.PanteWallet && typeof window.PanteWallet.getIsConnected === 'function') {
        const connected = window.PanteWallet.getIsConnected();
        const address = window.PanteWallet.getAddress();
        if (connected && address) {
          const short = address.slice(0, 6) + '...' + address.slice(-4);
          if (elements.walletBtn) {
            elements.walletBtn.textContent = short;
            elements.walletBtn.classList.add('connected');
          }
          if (elements.walletStatus) {
            elements.walletStatus.textContent = `Connected: ${short}`;
            elements.walletStatus.classList.add('connected');
          }
          checkMintReady();
          return;
        }
      }
    
      // Fallback to MetaMask
      if (window.ethereum && window.ethereum.selectedAddress) {
        const short = window.ethereum.selectedAddress.slice(0, 6) + '...' + window.ethereum.selectedAddress.slice(-4);
        if (elements.walletBtn) {
          elements.walletBtn.textContent = short;
          elements.walletBtn.classList.add('connected');
        }
        if (elements.walletStatus) {
          elements.walletStatus.textContent = `Connected: ${short}`;
          elements.walletStatus.classList.add('connected');
        }
        checkMintReady();
      }
    }

  // ===== I18N HELPER =====
  function t(key) {
    const lang = window.currentLang || 'en';
    return window.I18N?.[lang]?.[key] || key;
  }

  // ===== INIT =====
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose for debugging
  window.PanteNFT = {
    mockNFTs,
    CatDetector
  };
})();