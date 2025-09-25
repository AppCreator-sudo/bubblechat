// Telegram Mini App initialization
let isTelegramMiniApp = false;
let telegramWebApp = null;

function initTelegramMiniApp() {
  // Check if Telegram WebApp API is available
  if (typeof Telegram !== 'undefined' && Telegram.WebApp) {
    try {
      telegramWebApp = Telegram.WebApp;
      isTelegramMiniApp = true;

      console.log('🎯 Telegram Mini App detected');

      // Initialize Telegram WebApp
      telegramWebApp.ready();
      telegramWebApp.expand();

      // Set header color to match theme
      telegramWebApp.setHeaderColor('#fbfaff');

      // Set background color
      telegramWebApp.setBackgroundColor('#fbfaff');

      // Enable closing confirmation
      telegramWebApp.enableClosingConfirmation();

      // Handle theme changes
      telegramWebApp.onEvent('themeChanged', () => {
        console.log('📱 Telegram theme changed');
        // You can add theme synchronization here if needed
      });

      // Handle viewport changes
      telegramWebApp.onEvent('viewportChanged', () => {
        console.log('📱 Telegram viewport changed');
        // Handle responsive adjustments if needed
      });

      // Log user info (for debugging)
      if (telegramWebApp.initDataUnsafe?.user) {
        console.log('👤 Telegram user:', telegramWebApp.initDataUnsafe.user);
      }

      // Adapt UI for Telegram
      adaptUIForTelegram();

      return true;
    } catch (error) {
      console.error('❌ Telegram Mini App initialization error:', error);
      return false;
    }
  } else {
    console.log('🌐 Regular web app (not Telegram)');
    return false;
  }
}

function adaptUIForTelegram() {
  if (!isTelegramMiniApp) return;

  // Hide theme switcher in Telegram (use Telegram's theme)
  const themeSwitcher = document.getElementById('theme-switcher');
  if (themeSwitcher) {
    themeSwitcher.style.display = 'none';
  }

  // Adjust canvas size for Telegram viewport
  const canvas = document.getElementById('webgl');
  if (canvas) {
    // Telegram Mini Apps have specific viewport handling
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
  }

  // Adjust form positioning for mobile Telegram interface
  const form = document.getElementById('message-form');
  if (form) {
    form.style.bottom = '20px'; // Add some padding from Telegram's UI
  }

  // Adjust title positioning
  const title = document.querySelector('.main-txt');
  if (title) {
    title.style.top = '60px'; // Account for Telegram header
  }

  console.log('🎨 UI adapted for Telegram Mini App');
}

// Function to create message spheres (defined early for socket handlers)
function createMessageSphere(text, lifetime = 15000) {
  try {
    console.log('Creating sphere for text:', text, 'lifetime:', lifetime);
    // Limit text to 40 characters
    const limitedText = text.substring(0, 40);
    console.log('Limited text:', limitedText);

    // Smart text wrapping: break at word boundaries when possible, hyphenate long words
    let lines = [];
    const maxLineLength = 10;
    const words = limitedText.split(' ');
    let currentLine = '';

    for (let i = 0; i < words.length; i++) {
      const word = words[i];

      // If word is longer than max line length, hyphenate it
      if (word.length > maxLineLength) {
        // If we have content in current line, finish it first
        if (currentLine.length > 0) {
          lines.push(currentLine);
          currentLine = '';
          // Limit to 4 lines total
          if (lines.length >= 4) break;
        }

        // Hyphenate long word
        for (let j = 0; j < word.length; j += maxLineLength) {
          let chunk = word.substring(j, j + maxLineLength);
          // Add hyphen if not the last chunk
          if (j + maxLineLength < word.length) {
            chunk += '-';
          }
          lines.push(chunk);

          // Limit to 4 lines total
          if (lines.length >= 4) break;
        }
      } else {
        // Check if word fits in current line
        const potentialLine = currentLine + (currentLine.length > 0 ? ' ' : '') + word;

        if (potentialLine.length <= maxLineLength) {
          // Word fits, add it
          currentLine = potentialLine;
        } else {
          // Word doesn't fit, start new line
          if (currentLine.length > 0) {
            lines.push(currentLine);
            // Limit to 4 lines total
            if (lines.length >= 4) break;
          }
          currentLine = word;
        }
      }

      // Limit to 4 lines total
      if (lines.length >= 4) break;
    }

    // Add remaining content in currentLine if we haven't reached 4 lines
    if (currentLine.length > 0 && lines.length < 4) {
      lines.push(currentLine);
    }

    // Ensure we don't exceed 4 lines
    if (lines.length > 4) {
      lines = lines.slice(0, 4);
    }
    console.log('Lines:', lines);

    // Calculate sphere radius based on text length, adjusted for number of lines
    let radius = 0.5 + (limitedText.length / 40) * 1.5;
    // Reduce radius for multi-line text to prevent large spheres
    radius *= (1 - (lines.length - 1) * 0.1);
    console.log('Radius:', radius);

    // Create sphere with current theme colors
    const theme = themes[currentTheme];
    const sphereGeometry = new THREE.SphereGeometry(radius, 32, 32);
    const sphereMaterial = new THREE.MeshLambertMaterial({
      color: theme.sphereColor,
      emissive: theme.emissive
    });
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);

    // Smart positioning: fill empty spaces around decorative spheres first, then expand outward
    const decorativeSpheres = spheres.filter(s => !s.userData.originalPosition?.isDecorative);
    const messageSpheres = spheres.filter(s => s.userData.originalPosition?.isDecorative);

    // Try to find empty spaces around decorative spheres first (3D search)
    let finalX, finalY, foundEmptySpace = false;
    const attempts = 30; // More attempts for better distribution

    for (let attempt = 0; attempt < attempts && !foundEmptySpace; attempt++) {
      // Generate random position around the decorative spheres cluster
      const angle = Math.random() * Math.PI * 2;
      const height = (Math.random() - 0.5) * 6; // Height range: -3 to +3
      const distance = 3 + Math.random() * 4; // Distance from center: 3-7 units

      const testX = Math.cos(angle) * distance;
      const testY = height;
      const testZ = Math.sin(angle) * distance;

      // Check if this position is too close to existing message spheres (3D distance)
      let tooClose = false;
      for (const msgSphere of messageSpheres) {
        const dx = testX - msgSphere.position.x;
        const dy = testY - msgSphere.position.y;
        const dz = testZ - msgSphere.position.z;
        const distance3D = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (distance3D < 2.0) { // Minimum 3D distance between message spheres
          tooClose = true;
          break;
        }
      }

      // Also check distance from decorative spheres (should be outside their cluster)
      if (!tooClose) {
        for (const decoSphere of decorativeSpheres) {
          const dx = testX - decoSphere.position.x;
          const dy = testY - decoSphere.position.y;
          const dz = testZ - decoSphere.position.z;
          const distance3D = Math.sqrt(dx * dx + dy * dy + dz * dz);
          const minDistance = (decoSphere.userData.radius || 0.5) + 1.0; // Decorative radius + buffer
          if (distance3D < minDistance) {
            tooClose = true;
            break;
          }
        }
      }

      if (!tooClose) {
        finalX = testX;
        finalY = testY;
        foundEmptySpace = true;
      }
    }

    // If no empty space found, use expanding sphere logic (3D)
    if (!foundEmptySpace) {
      const angle = Math.random() * Math.PI * 2;
      const verticalAngle = (Math.random() - 0.5) * Math.PI; // -90° to +90°
      const baseDistance = 6; // Start further out
      const spreadFactor = 0.4; // How much each new sphere increases distance
      const distance = baseDistance + (messageSpheres.length * spreadFactor) + Math.random() * 3;

      finalX = Math.cos(angle) * Math.cos(verticalAngle) * distance;
      finalY = Math.sin(verticalAngle) * distance;
      finalZ = Math.sin(angle) * Math.cos(verticalAngle) * distance;
    }

    const heightVariation = (Math.random() - 0.5) * 3; // Smaller height variation: -1.5 to +1.5
    finalY = Math.max(-4, Math.min(4, finalY + heightVariation)); // Clamp Y between -4 and +4

    // Create "water surface" effect - spheres appear at similar depth with small variations
    const baseDepth = 2; // Base depth for all message spheres
    const depthVariation = (Math.random() - 0.5) * 2; // Small depth variation: -1 to +1
    const finalZ = baseDepth + depthVariation; // Consistent depth with small variations

    // Start below screen
    sphere.position.set(finalX, -25, finalZ);
    sphere.userData = { originalPosition: { x: finalX, y: finalY, z: finalZ }, radius };

    sphere.castShadow = true;
    sphere.receiveShadow = true;

    // Scale factor for text size based on number of lines
    let scaleFactor = 1;
    if (lines.length === 2) scaleFactor = 0.85;
    else if (lines.length >= 3) scaleFactor = 0.75;

    // Create group to hold all text lines
    const textGroup = new THREE.Group();
    textGroup.userData = { originalPosition: new THREE.Vector3(0, 0, radius) };

    // Create text geometry for each line
    for (let i = 0; i < lines.length; i++) {
      try {
        const line = lines[i];
        console.log('Creating text geometry for line:', line);

        const textGeometry = new THREE.TextGeometry(line, {
          font: font,
          size: radius * 0.2 * scaleFactor, // Scaled text size
          height: 0.05,
          curveSegments: 8, // Reduced for performance
          bevelEnabled: false
        });
        // Black text material
        const textMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 });
        const textMesh = new THREE.Mesh(textGeometry, textMaterial);

        // Center text horizontally
        textGeometry.computeBoundingBox();
        if (!textGeometry.boundingBox) {
          console.error('No bounding box for text geometry');
          continue;
        }
        const textWidth = textGeometry.boundingBox.max.x - textGeometry.boundingBox.min.x;
        console.log('Setting position for line', i, 'textWidth:', textWidth);
        // Adjusted vertical spacing between lines
        textMesh.position.set(-textWidth / 2, (lines.length - 1 - i) * (radius * 0.2), 0);

        textGroup.add(textMesh);
      } catch (error) {
        console.error('Error creating text for line', i, ':', error);
      }
    }

    sphere.add(textGroup);
    scene.add(sphere);
    spheres.push(sphere);
    console.log('Sphere created and added to scene');

    // Animate appearance like original
    gsap.to(sphere.position, {
      duration: 2,
      y: finalY,
      ease: "power1.out",
      onUpdate: function() {
        const progress = this.progress();
        sphere.position.z = finalZ + Math.sin(progress * Math.PI) * 4;
      }
    });

    // Remove sphere after lifetime expires to prevent performance issues
    setTimeout(() => {
      console.log('Removing sphere after lifetime:', lifetime);
      scene.remove(sphere);
      const index = spheres.indexOf(sphere);
      if (index > -1) {
        spheres.splice(index, 1);
      }
    }, lifetime);
  } catch (error) {
    console.error('Error creating message sphere:', error);
  }
}

// Function to update user count display
function updateUserCount(count) {
  // Create or update user count display
  let userCountElement = document.getElementById('user-count');
  if (!userCountElement) {
    userCountElement = document.createElement('div');
    userCountElement.id = 'user-count';
    userCountElement.style.position = 'fixed';
    userCountElement.style.top = '20px';
    userCountElement.style.right = '20px';
    userCountElement.style.color = '#000';
    userCountElement.style.fontSize = '16px';
    userCountElement.style.fontFamily = 'Oswald, sans-serif';
    userCountElement.style.zIndex = '1000';
    document.body.appendChild(userCountElement);
  }
  userCountElement.textContent = `Users: ${count}`;
}

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  35, // Increased FOV for wider view
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 0, 30); // Higher starting position for wider view
camera.lookAt(0, 0, 0); // Look at center

// Theme system
let currentTheme = 'light';
const themes = {
  light: {
    background: '#fbfaff',
    sphereColor: '#c7a5a5',
    emissive: 'red',
    ambientLight: 1,
    spotLight: 0.52
  },
  dark: {
    background: '#1a1a1a',
    sphereColor: '#ffffff',
    emissive: '#444444',
    ambientLight: 0.3,
    spotLight: 0.8
  }
};

// Particles system
const particlesGeometry = new THREE.BufferGeometry();
const particlesCount = 500;
const particlePositions = new Float32Array(particlesCount * 3);

for(let i = 0; i < particlesCount; i++) {
  particlePositions[i * 3] = (Math.random() - 0.5) * 200;
  particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 200;
  particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 200;
}

particlesGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

// Theme switcher
function createThemeSwitcher() {
  const switcher = document.createElement('div');
  switcher.id = 'theme-switcher';
  switcher.innerHTML = `
    <label class="switch">
      <input type="checkbox" id="theme-toggle">
      <span class="slider"></span>
    </label>
    <span class="theme-label">Dark Mode</span>
  `;
  switcher.style.cssText = `
    position: fixed;
    top: 20px;
    left: 20px;
    z-index: 1000;
    display: flex;
    align-items: center;
    gap: 10px;
    font-family: 'Oswald', sans-serif;
    font-size: 14px;
    color: #000;
  `;

  const toggle = switcher.querySelector('#theme-toggle');
  toggle.addEventListener('change', (e) => {
    currentTheme = e.target.checked ? 'dark' : 'light';
    applyTheme();
  });

  document.body.appendChild(switcher);
}

function applyTheme() {
  const theme = themes[currentTheme];

  // Update CSS background
  document.documentElement.style.setProperty('--bg-color', theme.background);
  document.body.style.background = `linear-gradient(to right, ${theme.background} 0%, ${theme.background} 40%, ${theme.background} 80%, ${theme.background} 90%, ${theme.background} 100%)`;

  // Ultra-aggressive renderer clearing to prevent artifacts
  renderer.clear(true, true, true);
  renderer.setClearColor(currentTheme === 'dark' ? 0x1a1a1a : 0xfbfaff, 1);
  renderer.clearColor();
  renderer.clearDepth();
  renderer.clearStencil();

  // Force context clearing with all possible flags
  const gl = renderer.getContext();
  if (gl) {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  // Clear shadow maps
  renderer.shadowMap.needsUpdate = true;

  // Force canvas clear
  const canvas = renderer.domElement;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  // Update sphere materials
  spheres.forEach(sphere => {
    if (sphere.material) {
      // Dispose old material to prevent memory leaks
      if (sphere.material.dispose) {
        sphere.material.dispose();
      }
      // Create new material with theme colors
      sphere.material = new THREE.MeshLambertMaterial({
        color: theme.sphereColor,
        emissive: theme.emissive
      });
    }
  });

  // Update lighting
  ambientLight.intensity = theme.ambientLight;
  spotLight.intensity = theme.spotLight;

  // Update particles
  if (particlesMaterial.dispose) {
    particlesMaterial.dispose();
  }
  particles.material = new THREE.PointsMaterial({
    color: currentTheme === 'dark' ? 0xffffff : 0xcccccc,
    size: 0.5,
    transparent: true,
    opacity: currentTheme === 'dark' ? 1 : 0.4
  });

  // Update UI colors
  const userCountElement = document.getElementById('user-count');
  if (userCountElement) {
    userCountElement.style.color = currentTheme === 'dark' ? '#fff' : '#000';
  }

  const themeLabel = document.querySelector('.theme-label');
  if (themeLabel) {
    themeLabel.style.color = currentTheme === 'dark' ? '#fff' : '#000';
  }

  // Update Dreams title color
  const dreamsTitle = document.querySelector('.main-txt');
  if (dreamsTitle) {
    dreamsTitle.style.color = currentTheme === 'dark' ? '#fff' : '#000';
  }

  // Force re-render
  renderer.render(scene, camera);
}



// Store processed message IDs to prevent duplicates
const processedMessageIds = new Set();

// Auto-detect environment: localhost for development, VDS IP for production
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const serverURL = isLocalhost ? 'http://localhost:3000' : 'http://83.217.220.149:3000';

console.log('🌐 Environment detected:', isLocalhost ? 'LOCALHOST' : 'VDS PRODUCTION');
console.log('🔗 Connecting to server:', serverURL);

const socket = io(serverURL, {
  transports: ['polling'], // Only polling transport
  timeout: 10000,
  forceNew: true,
  path: '/socket.io',
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000
});

// Socket connection logging
socket.on('connect', () => {
  console.log('🔗 Socket.IO connected:', socket.id);
});

socket.on('disconnect', (reason) => {
  console.log('🔌 Socket.IO disconnected:', reason);
});

socket.on('connect_error', (error) => {
  console.error('❌ Socket.IO connection error:', error);
});

socket.on('connect_timeout', (timeout) => {
  console.warn('⏰ Socket.IO connection timeout:', timeout);
});

// Socket event listeners
socket.on('newMessage', (data) => {
  console.log('🔵 Received NEW message from server:', data);
  // Check if we already processed this message by ID
  if (data.id && processedMessageIds.has(data.id)) {
    console.log('⚠️ Skipping duplicate message ID:', data.id);
    return;
  }
  // Mark as processed
  if (data.id) {
    processedMessageIds.add(data.id);
  }
  // Create sphere for message from other users
  createMessageSphere(data.text);
});

socket.on('userCount', (count) => {
  console.log('👥 User count updated:', count);
  // Update UI to show user count (you can add this to HTML if needed)
  updateUserCount(count);
});

socket.on('syncMessages', (messages) => {
  console.log('🔄 Received SYNC messages:', messages.length, 'messages');
  // Create spheres for all existing messages (only if not already processed)
  messages.forEach(message => {
    const elapsed = Date.now() - message.timestamp;
    const remainingTime = Math.max(0, 15000 - elapsed);
    console.log('📨 Sync message:', message.text, 'ID:', message.id, 'elapsed:', elapsed, 'remaining:', remainingTime);

    // Skip if already processed
    if (message.id && processedMessageIds.has(message.id)) {
      console.log('⚠️ Skipping already processed message ID:', message.id);
      return;
    }

    if (remainingTime > 0) {
      // Mark as processed
      if (message.id) {
        processedMessageIds.add(message.id);
      }
      createMessageSphere(message.text, remainingTime);
    }
  });
});

// Initialize UI components
window.addEventListener("load", () => {
  // Initialize Telegram Mini App first
  initTelegramMiniApp();

  initLoadingAnimation();
  createThemeSwitcher();
});

const particlesMaterial = new THREE.PointsMaterial({
  color: 0xffffff,
  size: 0.5,
  transparent: true,
  opacity: 0.6
});
const particles = new THREE.Points(particlesGeometry, particlesMaterial);
scene.add(particles);

// Camera controls
let zoomLevel = 30; // Match initial camera position
const minZoom = 8;
const maxZoom = 60;

// Pan variables
let isPanning = false;
let lastMouseX = 0;
let lastMouseY = 0;
let cameraOffsetX = 0;
let cameraOffsetY = 0;
const panSpeed = 0.01;

const renderer = new THREE.WebGLRenderer({
  canvas: document.querySelector("#webgl"),
  antialias: true,
  alpha: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Softer shadows


// Font loader
const fontLoader = new THREE.FontLoader();
let font;
// Use a font that supports Cyrillic characters
fontLoader.load('fonts/Roboto Condensed_Regular.json',
  function(f) {
    font = f;
    console.log('Font loaded successfully');
    // Enable input after font loads
    document.getElementById('message-input').disabled = false;
    document.getElementById('message-input').placeholder = "Enter message (up to 40 characters)";
  },
  function(progress) {
    console.log('Font loading progress:', progress);
  },
  function(error) {
    console.error('Font loading error:', error);
    document.getElementById('message-input').placeholder = "Font loading error";
  }
);

const material = new THREE.MeshLambertMaterial({
  color: "#c7a5a5",
  emissive: "red"
});
const group = new THREE.Group();
const spheres = [];
const sphereMeshes = []; // For performance optimization

// Create 25 initial spheres like in original version
const radii = [
  1, 0.6, 0.8, 0.4, 0.9, 0.7, 0.9, 0.3, 0.2, 0.5,
  0.6, 0.4, 0.5, 0.6, 0.7, 0.3, 0.4, 0.8, 0.7, 0.5,
  0.4, 0.6, 0.35, 0.38, 0.9
];

const positions = [
  { x: 0, y: 0, z: 0 },
  { x: 1.2, y: 0.9, z: -0.5 },
  { x: 1.8, y: -0.3, z: 0 },
  { x: -1, y: -1, z: 0 },
  { x: -1, y: 1.62, z: 0 },
  { x: -1.65, y: 0, z: -0.4 },
  { x: -2.13, y: -1.54, z: -0.4 },
  { x: 0.8, y: 0.94, z: 0.3 },
  { x: 0.5, y: -1, z: 1.2 },
  { x: -0.16, y: -1.2, z: 0.9 },
  { x: 1.5, y: 1.2, z: 0.8 },
  { x: 0.5, y: -1.58, z: 1.4 },
  { x: -1.5, y: 1, z: 1.15 },
  { x: -1.5, y: -1.5, z: 0.99 },
  { x: -1.5, y: -1.5, z: -1.9 },
  { x: 1.85, y: 0.8, z: 0.05 },
  { x: 1.5, y: -1.2, z: -0.75 },
  { x: 0.9, y: -1.62, z: 0.22 },
  { x: 0.45, y: 2, z: 0.65 },
  { x: 2.5, y: 1.22, z: -0.2 },
  { x: 2.35, y: 0.7, z: 0.55 },
  { x: -1.8, y: -0.35, z: 0.85 },
  { x: -1.02, y: 0.2, z: 0.9 },
  { x: 0.2, y: 1, z: 1 },
  { x: -2.88, y: 0.7, z: 1 }
];

for (let i = 0; i < 25; i++) {
  const radius = radii[i];
  const pos = positions[i];
  const geometry = new THREE.SphereGeometry(radius, 64, 64);
  const sphere = new THREE.Mesh(geometry, material);
  sphere.position.set(pos.x, pos.y, pos.z);
  sphere.userData = { originalPosition: { ...pos }, radius };
  sphere.castShadow = true;
  sphere.receiveShadow = true;
  spheres.push(sphere);
  group.add(sphere);
}

scene.add(group);


// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 1);
scene.add(ambientLight);

const spotLight = new THREE.SpotLight(0xffffff, 0.52);
spotLight.position.set(14, 24, 30);
spotLight.castShadow = true;

scene.add(spotLight);

const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.2);
directionalLight1.position.set(0, -4, 0);
scene.add(directionalLight1);


// Add at the top
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const tempVector = new THREE.Vector3();
const forces = new Map(); // Store forces for each sphere

const initY = -25; // Starting Y position below screen
const revolutionRadius = 4; // Radius of circular motion
const revolutionDuration = 2; // Duration in seconds

const breathingAmplitude = 0.1; // How much the spheres will move
const breathingSpeed = 0.002; // Speed of the breathing animation

// Initialize spheres below screen
spheres.forEach((sphere, i) => {
  sphere.position.y = initY;
});
function initLoadingAnimation() {
  spheres.forEach((sphere, i) => {
    const delay = i * 0.02;

    gsap
      .timeline()
      // First half of rotation (bottom to top, +z)
      .to(sphere.position, {
        duration: revolutionDuration / 2,
        y: revolutionRadius,
        ease: "power1.out",
        onUpdate: function () {
          const progress = this.progress();
          sphere.position.z =
            sphere.userData.originalPosition.z +
            Math.sin(progress * Math.PI) * revolutionRadius;
        },
        delay: delay
      })
      // Second half of rotation (top to bottom, -z)
      .to(sphere.position, {
        duration: revolutionDuration / 2,
        y: initY / 5,
        ease: "power1.out",
        onUpdate: function () {
          const progress = this.progress();
          sphere.position.z =
            sphere.userData.originalPosition.z -
            Math.sin(progress * Math.PI) * revolutionRadius;
        }
      })
      // Return to original position
      .to(sphere.position, {
        duration: 0.6,
        x: sphere.userData.originalPosition.x,
        y: sphere.userData.originalPosition.y,
        z: sphere.userData.originalPosition.z,
        ease: "power1.out"
      });
  });
}

// Message form with cooldown timer
const form = document.getElementById('message-form');
const input = document.getElementById('message-input');

// Cooldown system
let lastMessageTime = 0;
const COOLDOWN_TIME = 10000; // 10 seconds
let cooldownTimer = null;

// Disable input until font loads
input.disabled = true;
input.placeholder = "Font loading...";

function startCooldown() {
  const now = Date.now();
  lastMessageTime = now;

  // Disable form
  input.disabled = true;
  form.querySelector('button').disabled = true;

  // Start countdown
  let remainingTime = COOLDOWN_TIME / 1000;
  input.placeholder = `Wait ${remainingTime}s before next message...`;

  cooldownTimer = setInterval(() => {
    remainingTime--;
    if (remainingTime > 0) {
      input.placeholder = `Wait ${remainingTime}s before next message...`;
    } else {
      // Enable form
      clearInterval(cooldownTimer);
      cooldownTimer = null;
      input.disabled = false;
      form.querySelector('button').disabled = false;
      input.placeholder = "Enter message (up to 40 characters)";
    }
  }, 1000);
}

function canSendMessage() {
  const now = Date.now();
  return (now - lastMessageTime) >= COOLDOWN_TIME;
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = input.value.trim();
  console.log('Submit attempt:', text, 'Font loaded:', !!font, 'Can send:', canSendMessage());

  if (text && font && canSendMessage()) {
    console.log('Sending message to server:', { text: text });
    // Clear input immediately to prevent double submission
    input.value = '';
    // Send message to server (server will broadcast back to all clients)
    socket.emit('newMessage', { text: text });
    startCooldown();
  } else if (!canSendMessage()) {
    console.log('Message blocked by cooldown');
    input.placeholder = 'Please wait before sending another message...';
    setTimeout(() => {
      const remaining = Math.ceil((COOLDOWN_TIME - (Date.now() - lastMessageTime)) / 1000);
      input.placeholder = `Wait ${remaining}s before next message...`;
    }, 500);
  } else if (!font) {
    console.log('Font not loaded yet');
  }
});



// Call loading animation when page loads
window.addEventListener("load", initLoadingAnimation);

// Disable mouse interaction during loading
let loadingComplete = false;
setTimeout(() => {
  loadingComplete = true;
}, (revolutionDuration + 1) * 1000);

// Mouse event handlers
function onMouseDown(event) {
  if (!loadingComplete) return;
  isPanning = true;
  lastMouseX = event.clientX;
  lastMouseY = event.clientY;
}

function onMouseUp(event) {
  isPanning = false;
}

function onMouseMove(event) {
  if (!loadingComplete) return;

  // Handle panning
  if (isPanning) {
    const deltaX = event.clientX - lastMouseX;
    const deltaY = event.clientY - lastMouseY;

    cameraOffsetX -= deltaX * panSpeed; // Invert X axis for scene dragging effect
    cameraOffsetY += deltaY * panSpeed; // Scene follows cursor/finger direction

    // Clamp pan limits
    const maxPan = 15;
    cameraOffsetX = Math.max(-maxPan, Math.min(maxPan, cameraOffsetX));
    cameraOffsetY = Math.max(-maxPan, Math.min(maxPan, cameraOffsetY));

    // Update camera position
    camera.position.x = cameraOffsetX;
    camera.position.y = cameraOffsetY;
    camera.lookAt(cameraOffsetX, cameraOffsetY, 0);

    lastMouseX = event.clientX;
    lastMouseY = event.clientY;
    return;
  }

  // Handle sphere interaction
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(spheres);

  if (intersects.length > 0) {
    const hoveredSphere = intersects[0].object;
    const force = new THREE.Vector3();
    force
      .subVectors(intersects[0].point, hoveredSphere.position)
      .normalize()
      .multiplyScalar(0.2);
    forces.set(hoveredSphere.uuid, force);
  }
}

// Collision detection
function handleCollisions() {
  for (let i = 0; i < spheres.length; i++) {
    const sphereA = spheres[i];
    const radiusA = sphereA.userData.radius;

    for (let j = i + 1; j < spheres.length; j++) {
      const sphereB = spheres[j];
      const radiusB = sphereB.userData.radius;

      const distance = sphereA.position.distanceTo(sphereB.position);
      const minDistance = (radiusA + radiusB) * 1.2; // Add some buffer

      if (distance < minDistance) {
        tempVector.subVectors(sphereB.position, sphereA.position);
        tempVector.normalize();

        // Push spheres apart
        const pushStrength = (minDistance - distance) * 0.4;
        sphereA.position.sub(tempVector.multiplyScalar(pushStrength));
        sphereB.position.add(tempVector.multiplyScalar(pushStrength));
      }
    }
  }
}

function animate() {
  requestAnimationFrame(animate);

  if (loadingComplete) {
    // Breathing animation
    const time = Date.now() * breathingSpeed;
    spheres.forEach((sphere, i) => {
      // Offset each sphere's animation slightly
      const offset = i * 0.2;
      const breathingY = Math.sin(time + offset) * breathingAmplitude;
      const breathingZ = Math.cos(time + offset) * breathingAmplitude * 0.5;

      // Apply forces and update positions
      const force = forces.get(sphere.uuid);
      if (force) {
        sphere.position.add(force);
        force.multiplyScalar(0.95); // Original damping

        if (force.length() < 0.01) {
          forces.delete(sphere.uuid);
        }
      }

      // Return to original position with breathing offset
      const originalPos = sphere.userData.originalPosition;
      tempVector.set(
        originalPos.x,
        originalPos.y + breathingY,
        originalPos.z + breathingZ
      );
      sphere.position.lerp(tempVector, 0.018);

      // Apply same breathing effect to text inside sphere
      if (sphere.children.length > 0) {
        const textGroup = sphere.children[0]; // First child is the text group
        if (textGroup && textGroup.isGroup) {
          // Apply breathing to text group position
          const textBreathingY = Math.sin(time + offset) * breathingAmplitude * 0.5;
          const textBreathingZ = Math.cos(time + offset) * breathingAmplitude * 0.25;

          // Get original position of text group
          const textOriginalPos = textGroup.userData.originalPosition || new THREE.Vector3(0, 0, sphere.userData.radius);
          tempVector.set(
            textOriginalPos.x,
            textOriginalPos.y + textBreathingY,
            textOriginalPos.z + textBreathingZ
          );
          textGroup.position.lerp(tempVector, 0.018);
        }
      }
    });

    handleCollisions();
  }

  renderer.render(scene, camera);
}

// Touch handling for mobile
let initialDistance = 0;
let initialZoom = zoomLevel;
let isTouchPanning = false;
let lastTouchX = 0;
let lastTouchY = 0;

function getTouchDistance(touches) {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function onTouchStart(event) {
  if (event.touches.length === 1) {
    // Single touch - start panning
    isTouchPanning = true;
    lastTouchX = event.touches[0].clientX;
    lastTouchY = event.touches[0].clientY;
  } else if (event.touches.length === 2) {
    // Two touches - start pinch zoom
    initialDistance = getTouchDistance(event.touches);
    initialZoom = zoomLevel;
    isTouchPanning = false; // Disable panning during pinch
  }
}

function onTouchMove(event) {
  if (event.touches.length === 1 && isTouchPanning) {
    // Single touch pan
    event.preventDefault();
    const deltaX = event.touches[0].clientX - lastTouchX;
    const deltaY = event.touches[0].clientY - lastTouchY;

    cameraOffsetX -= deltaX * panSpeed; // Invert X axis for scene dragging effect
    cameraOffsetY += deltaY * panSpeed; // Scene follows cursor/finger direction

    // Clamp pan limits
    const maxPan = 15;
    cameraOffsetX = Math.max(-maxPan, Math.min(maxPan, cameraOffsetX));
    cameraOffsetY = Math.max(-maxPan, Math.min(maxPan, cameraOffsetY));

    // Update camera position
    camera.position.x = cameraOffsetX;
    camera.position.y = cameraOffsetY;
    camera.lookAt(cameraOffsetX, cameraOffsetY, 0);

    lastTouchX = event.touches[0].clientX;
    lastTouchY = event.touches[0].clientY;
  } else if (event.touches.length === 2) {
    // Two finger pinch zoom
    event.preventDefault();
    const currentDistance = getTouchDistance(event.touches);
    const scale = currentDistance / initialDistance;

    // Apply zoom based on pinch
    zoomLevel = initialZoom / scale;

    // Clamp zoom level
    zoomLevel = Math.max(minZoom, Math.min(maxZoom, zoomLevel));

    // Update camera position
    camera.position.z = zoomLevel;
  }
}

function onTouchEnd(event) {
  if (event.touches.length === 0) {
    isTouchPanning = false;
  }
}

// Add event listeners
window.addEventListener("mousedown", onMouseDown);
window.addEventListener("mouseup", onMouseUp);
window.addEventListener("mousemove", onMouseMove);
window.addEventListener("wheel", onMouseWheel);
window.addEventListener("touchstart", onTouchStart, { passive: false });
window.addEventListener("touchmove", onTouchMove, { passive: false });
window.addEventListener("touchend", onTouchEnd);
animate();

// Add resize handler
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function onMouseWheel(event) {
  // Adjust zoom level based on wheel movement
  zoomLevel -= event.deltaY * 0.01;

  // Clamp zoom level between min and max
  zoomLevel = Math.max(minZoom, Math.min(maxZoom, zoomLevel));

  // Update camera position
  camera.position.z = zoomLevel;
}
