const promptEl = document.getElementById('prompt');
const generateBtn = document.getElementById('generate');
const downloadBtn = document.getElementById('download');
const errorBox = document.getElementById('error-box');
const loader = document.getElementById('loader');
const imageContainer = document.getElementById('image-container');
const imageEl = document.getElementById('image');

const tabGeneratorBtn = document.getElementById('tab-generator');
const tabDocsBtn = document.getElementById('tab-docs');
const generatorContent = document.getElementById('generator-content');
const documentationContent = document.getElementById('docs-content');
const tabs = [tabGeneratorBtn, tabDocsBtn];
const contents = [generatorContent, documentationContent];

let currentImageUrl = "";

function showError(message) {
  errorBox.textContent = message;
  errorBox.classList.remove('hidden');
}

function hideError() {
  errorBox.classList.add('hidden');
  errorBox.textContent = '';
}

function generateImage() {
  const prompt = promptEl.value.trim();
  
  if (!prompt) {
    showError("Please enter a prompt to generate an image.");
    return;
  }
  
  hideError();
  loader.classList.remove('hidden');
  imageContainer.classList.add('hidden');
  downloadBtn.classList.add('hidden');
  generateBtn.disabled = true;
  generateBtn.textContent = "Generating...";
  currentImageUrl = "";
  
  const randomSeed = Math.floor(Math.random() * 1000000);
  const encodedPrompt = encodeURIComponent(prompt);
  const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?seed=${randomSeed}&width=512&height=512`;
  
  imageEl.src = url;
}

async function downloadImage() {
  if (!currentImageUrl) {
    showError("No image to download. Please generate one first.");
    return;
  }
  
  try {
    downloadBtn.textContent = "Downloading...";
    downloadBtn.disabled = true;
    
    const response = await fetch(currentImageUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = "NetVLYX_Image.png";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(objectUrl);
    
  } catch (error) {
    console.error('Download failed:', error);
    showError("Failed to download image. Please try again.");
  } finally {
    downloadBtn.textContent = "Download Image";
    downloadBtn.disabled = false;
  }
}

function switchTab(clickedTab) {
  tabs.forEach(tab => {
    if (tab === clickedTab) {
      tab.classList.add('text-white', 'border-blue-500');
      tab.classList.remove('text-gray-400', 'border-transparent');
    } else {
      tab.classList.add('text-gray-400', 'border-transparent');
      tab.classList.remove('text-white', 'border-blue-500');
    }
  });
  
  contents.forEach(content => {
    const expectedContentId = clickedTab.id.replace('tab-', '') + '-content';
    if (content.id === expectedContentId) {
      content.classList.remove('hidden');
    } else {
      content.classList.add('hidden');
    }
  });
}

generateBtn.addEventListener('click', generateImage);
downloadBtn.addEventListener('click', downloadImage);

imageEl.onload = () => {
  loader.classList.add('hidden');
  imageContainer.classList.remove('hidden');
  downloadBtn.classList.remove('hidden');
  generateBtn.disabled = false;
  generateBtn.textContent = "Generate Image";
  currentImageUrl = imageEl.src;
};

imageEl.onerror = () => {
  loader.classList.add('hidden');
  showError("Failed to load image. The API may be busy or the prompt was not allowed. Please try again.");
  generateBtn.disabled = false;
  generateBtn.textContent = "Generate Image";
  imageContainer.classList.add('hidden');
  downloadBtn.classList.add('hidden');
  currentImageUrl = "";
};

tabGeneratorBtn.addEventListener('click', () => switchTab(tabGeneratorBtn));
tabDocsBtn.addEventListener('click', () => switchTab(tabDocsBtn));