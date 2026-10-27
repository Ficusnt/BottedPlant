import fs from 'fs';

const data = JSON.parse(fs.readFileSync('data/phrases.json', 'utf8'));

const replacements = {
  'statement': [
    {text: 'la apuesta', weight: 50},
    {text: 'el sorteo', weight: 30},
    {text: 'la jugada', weight: 20}
  ],
  'id': [
    {text: 'el ID', weight: 50},
    {text: 'el número', weight: 30},
    {text: 'el código', weight: 20}
  ],
  'list': [
    {text: 'la lista', weight: 50},
    {text: 'el listado', weight: 30},
    {text: 'las opciones', weight: 20}
  ],
  'userPoints': [
    {text: 'tus hojas', weight: 50},
    {text: 'tus puntos', weight: 30},
    {text: 'tu saldo', weight: 20}
  ],
  'choiceText': [
    {text: 'esa opción', weight: 50},
    {text: 'esa elección', weight: 30},
    {text: 'la que elegiste', weight: 20}
  ],
  'totalOnChoice': [
    {text: 'el total apostado', weight: 50},
    {text: 'la suma en esa opción', weight: 30},
    {text: 'lo apostado ahí', weight: 20}
  ],
  'creatorCut': [
    {text: 'la comisión', weight: 50},
    {text: 'el corte', weight: 30},
    {text: 'la tajada', weight: 20}
  ],
  'winning': [
    {text: 'la ganadora', weight: 50},
    {text: 'la opción ganadora', weight: 30},
    {text: 'la que ganó', weight: 20}
  ],
  'pool': [
    {text: 'el pozo', weight: 50},
    {text: 'el bote', weight: 30},
    {text: 'la bolsa', weight: 20}
  ],
  'mentions': [
    {text: 'las menciones', weight: 50},
    {text: 'los avisos', weight: 30},
    {text: 'los tags', weight: 20}
  ],
  'chosen': [
    {text: 'elegido', weight: 50},
    {text: 'seleccionado', weight: 30},
    {text: 'escogido', weight: 20}
  ],
  'sides': [
    {text: 'caras', weight: 50},
    {text: 'lados', weight: 30},
    {text: 'números', weight: 20}
  ],
  'username': [
    {text: 'tu nombre', weight: 50},
    {text: 'tu usuario', weight: 30},
    {text: 'tu nick', weight: 20}
  ],
  'detail': [
    {text: 'el detalle', weight: 50},
    {text: 'el resultado', weight: 30},
    {text: 'la tirada', weight: 20}
  ],
  'errorMsg': [
    {text: 'el error', weight: 50},
    {text: 'el problema', weight: 30},
    {text: 'la falla', weight: 20}
  ]
};

let fixed = 0;
for (const [catName, cat] of Object.entries(data.categories || {})) {
  for (const [key, entry] of Object.entries(cat || {})) {
    if (entry.slots) {
      for (const [slotKey, slotVal] of Object.entries(entry.slots)) {
        if (Array.isArray(slotVal)) {
          const hasMock = slotVal.some(item =>
            item.text && (item.text.includes(' verde') || item.text.includes(' bonito'))
          );
          if (hasMock && replacements[slotKey]) {
            entry.slots[slotKey] = replacements[slotKey];
            fixed++;
            console.log(`Fixed: ${catName}.${key}.${slotKey}`);
          } else if (hasMock) {
            entry.slots[slotKey] = [];
            console.log(`Emptied (no replacement): ${catName}.${key}.${slotKey}`);
          }
        }
      }
    }
  }
}

fs.writeFileSync('data/phrases.json', JSON.stringify(data, null, 2));
console.log(`\nDone. Fixed ${fixed} slots.`);