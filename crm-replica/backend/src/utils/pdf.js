function escapePdfText(value) {
  const latin1 = Buffer.from(String(value ?? ''), 'latin1');
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

export function createSimplePdf(lines) {
  const safeLines = lines.filter(Boolean).map((line) => String(line));
  const title = safeLines[0] ?? 'DCM CRM';
  const body = safeLines.slice(1);
  const contentLines = [
    '0.95 0.97 1 rg',
    '40 792 515 28 re',
    'f',
    'BT',
    '/F1 16 Tf',
    '1 0 0 1 50 805 Tm',
    `${escapePdfText(title)} Tj`,
    '/F1 10 Tf'
  ];

  let y = 776;
  body.forEach((line) => {
    if (y < 70) return;
    const separator = line.indexOf(':');
    if (separator > 0) {
      const label = line.slice(0, separator + 1);
      const value = line.slice(separator + 1).trim();
      contentLines.push(`1 0 0 1 50 ${y} Tm`);
      contentLines.push(`${escapePdfText(label)} Tj`);
      contentLines.push(`1 0 0 1 170 ${y} Tm`);
      contentLines.push(`${escapePdfText(value)} Tj`);
      y -= 16;
      return;
    }

    contentLines.push(`1 0 0 1 50 ${y} Tm`);
    contentLines.push(`${escapePdfText(line)} Tj`);
    y -= 16;
  });

  contentLines.push('ET');

  const stream = contentLines.join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}\nendstream`
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
