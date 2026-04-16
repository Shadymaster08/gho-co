// Fabrik.ca product catalog — maps shirt_style → product page URL.
// Gildan model numbers match what's shown in the order form.

const STYLE_TO_FABRIK_URL: Record<string, string> = {
  tshirt:     'https://www.fabrik.ca/en-ca/products/heavy-cottontm-t-shirt',
  longsleeve: 'https://www.fabrik.ca/en-ca/products/heavy-cottontm-long-sleeve-t-shirt',
  crewneck:   'https://www.fabrik.ca/en-ca/products/heavy-blendtm-crewneck-sweatshirt',
  hoodie:     'https://www.fabrik.ca/en-ca/products/heavy-blendtm-hooded-sweatshirt',
  ziphoodie:  'https://www.fabrik.ca/en-ca/products/heavy-blendtm-full-zip-hooded-sweatshirt',
}

// Color name → hex mapping (mirrors the PRODUCTS catalog in the order form)
const COLOR_HEX: Record<string, string> = {
  'White': '#ffffff', 'Natural': '#fffede', 'Cornsilk': '#f4e7ba', 'Sand': '#f1e7c8',
  'Ash': '#d7d7d7', 'Ice Grey': '#bdbecf', 'Sport Grey': '#bbbcc8', 'Gravel': '#86817e',
  'Graphite Heather': '#474a51', 'Tweed': '#616469', 'Dark Heather': '#3f4444',
  'Charcoal': '#36454f', 'Black': '#000000', 'Midnight': '#334b57',
  'Heather Navy': '#31394c', 'Indigo Blue': '#34657f', 'Navy': '#000080',
  'Tropical Blue': '#009acd', 'Antique Sapphire': '#0f52ba', 'Sapphire': '#0f52ba',
  'Cobalt': '#0047ab', 'Heather Sapphire': '#3299d4', 'Royal': '#4169e1',
  'Neon Blue': '#1b03a3', 'Sky': '#92c3e1', 'Carolina Blue': '#7ba4db',
  'Light Blue': '#add8e6', 'Red': '#ff0000', 'Heather Red': '#cb2e35',
  'Cardinal': '#c41e3a', 'Cardinal Red': '#c03545', 'Antique Cherry Red': '#971b2f',
  'Garnet': '#8b0000', 'Maroon': '#752936', 'Berry': '#b4236a', 'Heliconia': '#db3e79',
  'Safety Pink': '#e16f8f', 'Azalea': '#e387b4', 'Coral Silk': '#ff777f',
  'Light Pink': '#ffb6c1', 'Heather Radiant Orchid': '#d198c4', 'Lilac': '#dcb8e7',
  'Violet': '#6a2a5b', 'Blackberry': '#382035', 'Purple': '#4c4084',
  'Tennessee Orange': '#eb9501', 'Antique Orange': '#fc7154', 'Orange': '#f4633a',
  'Texas Orange': '#b65a30', 'Sunset': '#c45c3d', 'Safety Orange': '#ff6700',
  'Old Gold': '#dcae96', 'Gold': '#ffd700', 'Daisy': '#ffed67', 'Yellow Haze': '#eee8a0',
  'Kiwi': '#8aa140', 'Safety Green': '#e6fd6b', 'Electric Green': '#00ff00',
  'Neon Green': '#39ff14', 'Lime': '#a6e97a', 'Turf Green': '#7cfc00',
  'Mint Green': '#c3d9bc', 'Irish Green': '#3cc178', 'Antique Jade Dome': '#006269',
  'Antique Irish Green': '#00843d', 'Forest Green': '#254117',
  'Heather Military Green': '#7e7f74', 'Military Green': '#646650',
  'Dark Chocolate': '#665542', 'Brown Savana': '#9f877b', 'Forest': '#273b33',
  'Orchid': '#e6a8d7', 'Heather Deep Royal': '#1d4f91',
  'Heather Sport Scarlet Red': '#b83a4b', 'Cherry Red': '#d30037',
  'Heather Sport Dark Maroon': '#651d32', 'Heather Sport Dark Navy': '#595478',
  'Heather Sport Dark Green': '#43695b',
}

export function getFabrikProductUrl(style: string): string | null {
  return STYLE_TO_FABRIK_URL[style] ?? null
}

export function getColorHex(colorName: string): string | null {
  return COLOR_HEX[colorName] ?? null
}

export const FABRIK_CART_URL = 'https://www.fabrik.ca/en-ca/cart'
