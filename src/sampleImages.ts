// Helper to create realistic sample road hazard image files for testing
export interface SamplePreset {
  id: string;
  title: string;
  location: string;
  language: string;
  filename: string;
  svgData: string;
}

export const SAMPLE_PRESETS: SamplePreset[] = [
  {
    id: 'pothole',
    title: 'Severe Road Pothole (AB Road, Indore)',
    location: 'AB Road near Vijay Nagar Square, Indore, MP',
    language: 'English',
    filename: 'pothole_ab_road_indore.jpg',
    svgData: `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
      <defs>
        <linearGradient id="asphalt" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#3d4449" />
          <stop offset="50%" stop-color="#2c3238" />
          <stop offset="100%" stop-color="#1f2327" />
        </linearGradient>
        <radialGradient id="hole" cx="48%" cy="52%" r="45%">
          <stop offset="0%" stop-color="#0a0c0e" />
          <stop offset="60%" stop-color="#181c20" />
          <stop offset="85%" stop-color="#323840" />
          <stop offset="100%" stop-color="#4a525d" />
        </radialGradient>
        <filter id="noise" x="0" y="0" width="800" height="600" filterUnits="userSpaceOnUse">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" result="noise" />
          <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.15 0" />
          <feComposite in2="SourceGraphic" in="gl" operator="in" />
        </filter>
      </defs>
      <!-- Road Surface -->
      <rect width="800" height="600" fill="url(#asphalt)" />
      <!-- Road Marking (Yellow Broken Line) -->
      <rect x="370" y="20" width="30" height="140" fill="#f59e0b" opacity="0.8" />
      <rect x="370" y="440" width="30" height="140" fill="#f59e0b" opacity="0.8" />
      
      <!-- Major Pothole Cavity -->
      <ellipse cx="400" cy="310" rx="220" ry="110" fill="url(#hole)" />
      <!-- Jagged Pothole Edges -->
      <path d="M 200 300 Q 240 240, 310 230 T 450 220 T 570 260 T 610 320 T 540 390 T 380 410 T 230 380 Z" fill="#0d0f12" />
      <!-- Water accumulation & mud inside hole -->
      <path d="M 280 320 Q 330 280, 420 290 T 520 340 T 430 370 T 310 360 Z" fill="#1b242e" opacity="0.85" />
      <path d="M 320 330 Q 360 300, 430 310 T 490 350 T 420 365 Z" fill="#253545" opacity="0.9" />
      
      <!-- Cracks radiating -->
      <path d="M 210 260 L 150 220 L 110 230" stroke="#111518" stroke-width="4" fill="none" />
      <path d="M 590 280 L 680 250 L 730 270" stroke="#111518" stroke-width="4" fill="none" />
      <path d="M 400 410 L 410 490 L 370 540" stroke="#111518" stroke-width="5" fill="none" />
      <path d="M 250 370 L 180 430 L 140 450" stroke="#111518" stroke-width="3" fill="none" />
      <!-- Road alert badge indicator on image -->
      <rect x="25" y="25" width="220" height="44" rx="6" fill="#D62B2B" opacity="0.95" />
      <text x="40" y="53" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#ffffff">CIVIC DEFECT #4092</text>
      <text x="25" y="570" font-family="Arial, sans-serif" font-size="14" fill="#cbd5e1">GPS: 22.7533° N, 75.8937° E | AB Road, Indore</text>
    </svg>`,
  },
  {
    id: 'manhole',
    title: 'Open Manhole (MG Road Junction)',
    location: 'MG Road Pedestrian Crossing, Ward 14',
    language: 'Hindi',
    filename: 'open_manhole_mg_road.jpg',
    svgData: `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
      <defs>
        <linearGradient id="concrete" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#475569" />
          <stop offset="100%" stop-color="#334155" />
        </linearGradient>
        <radialGradient id="deepdark" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#020617" />
          <stop offset="70%" stop-color="#090d16" />
          <stop offset="100%" stop-color="#1e293b" />
        </radialGradient>
      </defs>
      <!-- Concrete sidewalk -->
      <rect width="800" height="600" fill="url(#concrete)" />
      <!-- Paver tiles grid lines -->
      <path d="M 0 150 L 800 150 M 0 300 L 800 300 M 0 450 L 800 450 M 200 0 L 200 600 M 400 0 L 400 600 M 600 0 L 600 600" stroke="#1e293b" stroke-width="2" opacity="0.4" />
      <!-- Cast Iron Manhole Rim Frame -->
      <circle cx="400" cy="300" r="170" fill="#1e293b" stroke="#0f172a" stroke-width="12" />
      <circle cx="400" cy="300" r="145" fill="url(#deepdark)" />
      <!-- Ladder / rungs inside sewer shaft -->
      <rect x="360" y="240" width="80" height="10" rx="3" fill="#64748b" opacity="0.7" />
      <rect x="360" y="280" width="80" height="10" rx="3" fill="#475569" opacity="0.7" />
      <rect x="360" y="320" width="80" height="10" rx="3" fill="#334155" opacity="0.6" />
      <!-- Displaced broken iron cover lying on side -->
      <ellipse cx="610" cy="380" rx="90" ry="50" fill="#334155" stroke="#0f172a" stroke-width="8" transform="rotate(25 610 380)" />
      <!-- Caution branch stuck by residents to warn traffic -->
      <path d="M 370 380 L 320 200 L 290 170" stroke="#854d0e" stroke-width="8" stroke-linecap="round" fill="none" />
      <path d="M 320 230 L 350 210" stroke="#854d0e" stroke-width="5" fill="none" />
      <!-- Red fabric warning ribbon on branch -->
      <path d="M 320 200 Q 300 230 330 250" stroke="#D62B2B" stroke-width="6" fill="none" />
      <!-- Warning Badge -->
      <rect x="25" y="25" width="260" height="44" rx="6" fill="#D62B2B" />
      <text x="40" y="53" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#ffffff">HAZARD: UNCOVERED SHAFT</text>
      <text x="25" y="570" font-family="Arial, sans-serif" font-size="14" fill="#f8fafc">Location: MG Road Crosswalk near Metro Pillar 114</text>
    </svg>`,
  },
  {
    id: 'streetlight',
    title: 'Broken Streetlight with Dangling Pole',
    location: 'Outer Bypass Highway Km 18, Sector 9',
    language: 'English',
    filename: 'broken_streetlight_highway.jpg',
    svgData: `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
      <defs>
        <linearGradient id="twilight" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#1e1b4b" />
          <stop offset="50%" stop-color="#312e81" />
          <stop offset="100%" stop-color="#1e293b" />
        </linearGradient>
      </defs>
      <!-- Twilight Sky & Road -->
      <rect width="800" height="420" fill="url(#twilight)" />
      <rect y="420" width="800" height="180" fill="#0f172a" />
      <!-- Guardrail -->
      <rect y="400" width="800" height="18" fill="#94a3b8" />
      <rect x="100" y="418" width="12" height="40" fill="#64748b" />
      <rect x="300" y="418" width="12" height="40" fill="#64748b" />
      <rect x="500" y="418" width="12" height="40" fill="#64748b" />
      <rect x="700" y="418" width="12" height="40" fill="#64748b" />
      <!-- Damaged bent steel lamppost -->
      <path d="M 280 430 L 290 280 L 440 210 L 520 250" stroke="#cbd5e1" stroke-width="16" stroke-linecap="round" fill="none" />
      <!-- Fixture housing broken glass -->
      <polygon points="510,240 560,260 540,290 490,270" fill="#475569" stroke="#94a3b8" stroke-width="3" />
      <!-- Dangling live wire -->
      <path d="M 525 270 Q 545 320 535 360 T 560 410" stroke="#ef4444" stroke-width="4" fill="none" />
      <path d="M 535 275 Q 515 315 520 350" stroke="#3b82f6" stroke-width="3" fill="none" />
      <!-- Spark glow -->
      <circle cx="560" cy="410" r="14" fill="#fef08a" opacity="0.8" />
      <polygon points="560,390 565,405 580,410 565,415 560,430 555,415 540,410 555,405" fill="#f59e0b" />
      <!-- Banner -->
      <rect x="25" y="25" width="270" height="44" rx="6" fill="#D62B2B" />
      <text x="40" y="53" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#ffffff">COLLAPSED POLE & EXPOSED WIRE</text>
      <text x="25" y="570" font-family="Arial, sans-serif" font-size="14" fill="#94a3b8">Outer Bypass Expressway | Dark Spot Hazard Zone</text>
    </svg>`,
  },
];

// Helper to convert SVG to a real File/Blob for image input
export function svgToFile(svgString: string, filename: string): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const URL = window.URL || window.webkitURL;
    const blobURL = URL.createObjectURL(svgBlob);

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 600;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(blobURL);
        return reject(new Error('Canvas context not available'));
      }
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(blobURL);

      canvas.toBlob((blob) => {
        if (!blob) {
          return reject(new Error('Canvas conversion to blob failed'));
        }
        const file = new File([blob], filename, { type: 'image/jpeg' });
        resolve(file);
      }, 'image/jpeg', 0.92);
    };

    img.onerror = () => {
      URL.revokeObjectURL(blobURL);
      reject(new Error('Failed to load SVG for sample image creation'));
    };

    img.src = blobURL;
  });
}
