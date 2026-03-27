function escapePdfText(value) {
  const latin1 = Buffer.from(String(value ?? '').normalize('NFC'), 'latin1');
  let result = '';
  for (const byte of latin1) {
    if (byte === 0x5c) {
      result += '\\\\';
      continue;
    }
    if (byte === 0x28) {
      result += '\\(';
      continue;
    }
    if (byte === 0x29) {
      result += '\\)';
      continue;
    }
    if (byte < 32 || byte > 126) {
      result += `\\${byte.toString(8).padStart(3, '0')}`;
      continue;
    }
    result += String.fromCharCode(byte);
  }
  return `(${result})`;
}

function splitLabelValue(line) {
  const separator = line.indexOf(':');
  if (separator <= 0) return null;
  return {
    label: line.slice(0, separator).trim().toLowerCase(),
    value: line.slice(separator + 1).trim()
  };
}

function parsePdfData(lines) {
  const safeLines = lines.filter(Boolean).map((line) => String(line));
  const title = safeLines[0] ?? 'DCM Service CRM';
  const entries = Object.create(null);

  for (const line of safeLines.slice(1)) {
    const parsed = splitLabelValue(line);
    if (!parsed) continue;
    entries[parsed.label] = parsed.value;
  }

  return {
    headerTitle: title,
    orderNumber: entries.orden ?? '-',
    client: entries.cliente ?? '-',
    status: entries.estado ?? '-',
    priority: entries.prioridad ?? '-',
    technicians: entries['técnicos'] ?? entries.tecnicos ?? 'Sin técnicos asignados',
    scheduledAt: entries['fecha programada'] ?? 'Sin fecha',
    observations: entries.observaciones ?? '-',
    closure: entries.cierre ?? '-',
    workedHours: entries['horas trabajadas'] ?? '-',
    checklist: entries.checklist ?? '-',
    clientSignature: entries['firma cliente'] ?? '-',
    workPhoto: entries['foto trabajo'] ?? '-',
    materialsRaw: entries.materiales ?? 'Sin materiales registrados',
    materialsTotal: entries['total materiales'] ?? '$0.00'
  };
}

function wrapText(text, size, maxWidth) {
  const value = String(text ?? '').trim();
  if (!value) return ['-'];

  const widthPerChar = size * 0.52;
  const maxChars = Math.max(12, Math.floor(maxWidth / widthPerChar));
  const words = value.split(/\s+/);
  const lines = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }

    if (current) lines.push(current);
    if (word.length > maxChars) {
      for (let i = 0; i < word.length; i += maxChars) {
        lines.push(word.slice(i, i + maxChars));
      }
      current = '';
      continue;
    }

    current = word;
  }

  if (current) lines.push(current);
  return lines.length ? lines : ['-'];
}

function addText(stream, { x, y, text, size = 10, gray = 0, font = 'F1', align = 'left', width = 0 }) {
  const value = String(text ?? '');
  const estimatedWidth = value.length * size * 0.52;
  const textX = align === 'right' && width > 0 ? x + Math.max(0, width - estimatedWidth) : x;
  stream.push('BT');
  stream.push(`/${font} ${size} Tf`);
  stream.push(`${gray} ${gray} ${gray} rg`);
  stream.push(`1 0 0 1 ${textX} ${y} Tm`);
  stream.push(`${escapePdfText(value)} Tj`);
  stream.push('ET');
}

function addWrapped(stream, { x, y, text, size = 10, width, lineHeight = 12, maxLines = 6 }) {
  const wrapped = wrapText(text, size, width).slice(0, maxLines);
  wrapped.forEach((line, index) => {
    addText(stream, { x, y: y - (index * lineHeight), text: line, size });
  });
}

function addSectionTitle(stream, { x, yTop, width, title }) {
  const height = 18;
  const y = yTop - height;
  stream.push('0 0 0 rg');
  stream.push(`${x} ${y} ${width} ${height} re`);
  stream.push('f');
  addText(stream, { x: x + 8, y: y + 5, text: String(title || '').toUpperCase(), size: 10, gray: 1 });
  return y;
}

function addLinedArea(stream, { x, y, width, height, step = 14 }) {
  stream.push('0 0 0 RG');
  stream.push('0.5 w');
  for (let lineY = y + step; lineY < y + height; lineY += step) {
    stream.push(`${x} ${lineY} m ${x + width} ${lineY} l S`);
  }
}

function parseMaterials(materialsRaw) {
  if (!materialsRaw || materialsRaw === '-' || /sin materiales/i.test(materialsRaw)) return [];
  return materialsRaw
    .split('|')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const match = item.match(/^(.*?)\sx([^\s]+)\s\(\$([^\)]+)\)$/);
      if (!match) {
        return { material: item, quantity: '-', unitCost: '-', subtotal: '-' };
      }
      const quantity = Number(match[2]);
      const unitCost = Number(match[3]);
      const subtotal = Number.isFinite(quantity) && Number.isFinite(unitCost) ? (quantity * unitCost).toFixed(2) : '-';
      return {
        material: `${match[1]} x${match[2]}`,
        quantity: match[2],
        unitCost: `$${match[3]}`,
        subtotal: subtotal === '-' ? '-' : `$${subtotal}`
      };
    });
}

export function createSimplePdf(lines) {
  const data = parsePdfData(lines);
  const stream = [];

  const pageWidth = 595;
  const pageHeight = 842;
  const margin = 24;
  const contentX = margin;
  const contentWidth = pageWidth - (margin * 2);

  stream.push('0 0 0 RG');
  stream.push('1 w');
  stream.push('1 1 1 rg');
  stream.push(`0 0 ${pageWidth} ${pageHeight} re`);
  stream.push('f');
  stream.push('0 0 0 RG');
  stream.push('1 w');
  stream.push(`${margin - 8} ${margin - 8} ${contentWidth + 16} ${pageHeight - ((margin - 8) * 2)} re`);
  stream.push('S');

  let y = pageHeight - margin;

  stream.push('0 0 0 rg');
  stream.push(`${contentX} ${y - 38} ${contentWidth} 38 re`);
  stream.push('f');
  addText(stream, { x: contentX + 10, y: y - 24, text: 'DCM SERVICE CRM', size: 12, gray: 1, font: 'F2' });
  addText(stream, { x: contentX + 155, y: y - 24, text: 'COMPROBANTE DE SERVICIO', size: 16, gray: 1, font: 'F2' });
  y -= 44;

  const headerBlockHeight = 56;
  const leftBlockWidth = 320;
  const rightBlockWidth = contentWidth - leftBlockWidth;
  stream.push('0 0 0 RG');
  stream.push(`${contentX} ${y - headerBlockHeight} ${leftBlockWidth} ${headerBlockHeight} re S`);
  stream.push(`${contentX + leftBlockWidth} ${y - headerBlockHeight} ${rightBlockWidth} ${headerBlockHeight} re S`);

  addText(stream, { x: contentX + 10, y: y - 18, text: 'EMPRESA: DCM SOLUTION', size: 10, font: 'F2' });
  addText(stream, { x: contentX + 10, y: y - 34, text: 'DIRECCIÓN: Juan de Garay 3942, Buenos Aires', size: 9 });
  addText(stream, { x: contentX + 10, y: y - 48, text: 'TEL: (54 11) 4711-0458 / (54 11) 4005-5881', size: 9 });

  addText(stream, { x: contentX + leftBlockWidth + 10, y: y - 18, text: `N° ORDEN: ${data.orderNumber}`, size: 11, font: 'F2' });
  addText(stream, { x: contentX + leftBlockWidth + 10, y: y - 36, text: `FECHA: ${new Date().toLocaleDateString('es-AR')}`, size: 11, font: 'F2' });

  y -= (headerBlockHeight + 14);

  y = addSectionTitle(stream, { x: contentX, yTop: y, width: contentWidth, title: 'Datos del cliente' }) - 4;
  const clientHeight = 66;
  stream.push(`${contentX} ${y - clientHeight} ${contentWidth} ${clientHeight} re S`);
  stream.push(`${contentX + (contentWidth / 2)} ${y - clientHeight} m ${contentX + (contentWidth / 2)} ${y} l S`);
  addText(stream, { x: contentX + 10, y: y - 18, text: `CLIENTE: ${data.client}`, size: 10, font: 'F2' });
  addText(stream, { x: contentX + 10, y: y - 34, text: 'DIRECCIÓN: Referencia en orden de servicio', size: 9 });
  addText(stream, { x: contentX + 10, y: y - 50, text: 'CONTACTO: Registro administrativo', size: 9 });
  addText(stream, { x: contentX + (contentWidth / 2) + 10, y: y - 18, text: `ESTADO: ${data.status}`, size: 10, font: 'F2' });
  addText(stream, { x: contentX + (contentWidth / 2) + 10, y: y - 34, text: `PRIORIDAD: ${data.priority}`, size: 10, font: 'F2' });
  addText(stream, { x: contentX + (contentWidth / 2) + 10, y: y - 50, text: `FECHA PROGRAMADA: ${data.scheduledAt}`, size: 9 });
  y -= (clientHeight + 16);

  y = addSectionTitle(stream, { x: contentX, yTop: y, width: contentWidth, title: 'Seguimiento / servicio' }) - 4;
  const serviceHeight = 72;
  stream.push(`${contentX} ${y - serviceHeight} ${contentWidth} ${serviceHeight} re S`);
  addText(stream, { x: contentX + 10, y: y - 18, text: `TÉCNICOS ASIGNADOS: ${data.technicians}`, size: 10, font: 'F2' });
  addText(stream, { x: contentX + 10, y: y - 34, text: `HORAS TRABAJADAS: ${data.workedHours}`, size: 10, font: 'F2' });
  addText(stream, { x: contentX + 10, y: y - 50, text: `CHECKLIST CIERRE: ${data.checklist}`, size: 9 });
  addText(stream, { x: contentX + 320, y: y - 18, text: `ESTADO DE CIERRE: ${data.status}`, size: 10, font: 'F2' });
  addText(stream, { x: contentX + 320, y: y - 34, text: `FIRMA CLIENTE: ${data.clientSignature === '-' ? 'Pendiente' : 'Registrada'}`, size: 9 });
  addText(stream, { x: contentX + 320, y: y - 50, text: `FOTO DE TRABAJO: ${data.workPhoto === '-' ? 'Sin adjunto' : 'Referencia registrada'}`, size: 9 });
  y -= (serviceHeight + 16);

  y = addSectionTitle(stream, { x: contentX, yTop: y, width: contentWidth, title: 'Trabajos realizados' }) - 4;
  const workHeight = 130;
  stream.push(`${contentX} ${y - workHeight} ${contentWidth} ${workHeight} re S`);
  addLinedArea(stream, { x: contentX, y: y - workHeight, width: contentWidth, height: workHeight, step: 13 });
  addWrapped(stream, {
    x: contentX + 10,
    y: y - 18,
    text: `${data.closure !== '-' ? data.closure : data.observations !== '-' ? data.observations : 'Sin trabajos registrados'}`,
    size: 10,
    width: contentWidth - 20,
    lineHeight: 13,
    maxLines: 7
  });
  y -= (workHeight + 16);

  y = addSectionTitle(stream, { x: contentX, yTop: y, width: contentWidth, title: 'Materiales utilizados' }) - 4;
  const materials = parseMaterials(data.materialsRaw);
  const materialRows = Math.min(Math.max(materials.length, 1), 5);
  const rowHeight = 16;
  const materialsHeight = 22 + (materialRows * rowHeight) + 18;
  stream.push(`${contentX} ${y - materialsHeight} ${contentWidth} ${materialsHeight} re S`);

  const col1 = contentX + 8;
  const col2 = contentX + 300;
  const col3 = contentX + 378;
  const col4 = contentX + 460;

  addText(stream, { x: col1, y: y - 15, text: 'MATERIAL', size: 9, font: 'F2' });
  addText(stream, { x: col2, y: y - 15, text: 'CANT.', size: 9, font: 'F2', align: 'right', width: 44 });
  addText(stream, { x: col3, y: y - 15, text: 'UNIT.', size: 9, font: 'F2', align: 'right', width: 68 });
  addText(stream, { x: col4, y: y - 15, text: 'SUBTOTAL', size: 9, font: 'F2', align: 'right', width: 80 });
  stream.push(`${contentX} ${y - 22} m ${contentX + contentWidth} ${y - 22} l S`);

  if (!materials.length) {
    addText(stream, { x: col1, y: y - 38, text: 'Sin materiales registrados', size: 10 });
  } else {
    materials.slice(0, 5).forEach((material, index) => {
      const rowY = y - 38 - (index * rowHeight);
      addText(stream, { x: col1, y: rowY, text: material.material, size: 9 });
      addText(stream, { x: col2, y: rowY, text: material.quantity, size: 9, align: 'right', width: 44 });
      addText(stream, { x: col3, y: rowY, text: material.unitCost, size: 9, align: 'right', width: 68 });
      addText(stream, { x: col4, y: rowY, text: material.subtotal, size: 9, align: 'right', width: 80 });
    });
  }

  addText(stream, { x: col3, y: y - materialsHeight + 6, text: 'TOTAL MATERIALES:', size: 10, font: 'F2', align: 'right', width: 130 });
  addText(stream, { x: col4, y: y - materialsHeight + 6, text: data.materialsTotal, size: 10, font: 'F2', align: 'right', width: 80 });
  y -= (materialsHeight + 16);

  y = addSectionTitle(stream, { x: contentX, yTop: y, width: contentWidth, title: 'Observaciones' }) - 4;
  const observationsHeight = 62;
  stream.push(`${contentX} ${y - observationsHeight} ${contentWidth} ${observationsHeight} re S`);
  addWrapped(stream, {
    x: contentX + 10,
    y: y - 18,
    text: data.observations,
    size: 10,
    width: contentWidth - 20,
    lineHeight: 12,
    maxLines: 4
  });
  y -= (observationsHeight + 16);

  y = addSectionTitle(stream, { x: contentX, yTop: y, width: contentWidth, title: 'Firmas' }) - 4;
  const signHeight = 74;
  const half = (contentWidth - 12) / 2;
  stream.push(`${contentX} ${y - signHeight} ${half} ${signHeight} re S`);
  stream.push(`${contentX + half + 12} ${y - signHeight} ${half} ${signHeight} re S`);
  stream.push(`${contentX} ${y - 26} m ${contentX + half} ${y - 26} l S`);
  stream.push(`${contentX + half + 12} ${y - 26} m ${contentX + half + 12 + half} ${y - 26} l S`);
  addText(stream, { x: contentX + 12, y: y - 18, text: 'CONFORMIDAD DEL CLIENTE', size: 10, font: 'F2' });
  addText(stream, { x: contentX + 12, y: y - 44, text: data.clientSignature === '-' ? 'Firma pendiente' : data.clientSignature, size: 9 });
  addText(stream, { x: contentX + half + 24, y: y - 18, text: 'TÉCNICO DCM SOLUTION', size: 10, font: 'F2' });
  addText(stream, { x: contentX + half + 24, y: y - 44, text: data.technicians || 'Técnico asignado', size: 9 });

  const content = stream.join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
    `<< /Length ${Buffer.byteLength(content, 'utf8')} >>\nstream\n${content}\nendstream`
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, 'utf8');
}
