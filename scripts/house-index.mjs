// House archives have both modern and historical column layouts.
export function parseHouseIndex(text, year) {
  const [header, ...lines] = text.replace(/^\uFEFF/, '').split(/\r?\n/);
  const columns = header.split('\t').map(s => s.trim());
  for (const name of ['Last','First','FilingType','StateDst','FilingDate','DocID']) {
    if (!columns.includes(name)) throw Error(`House index ${year} missing column ${name}`);
  }
  return lines.filter(line => line.trim()).map(line => {
    const fields = line.split('\t').map(s => s.trim());
    const get = name => fields[columns.indexOf(name)] ?? '';
    const docId = get('DocID'), filingDate = get('FilingDate');
    if (!/^\d+$/.test(docId) || (filingDate !== '' && !/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(filingDate))) {
      throw Error(`House index ${year} has invalid DocID or FilingDate`);
    }
    const disclosure = get('DisclosureType');
    const filingType = disclosure === 'PTR' ? 'P' : get('FilingType');
    const firstName = get('First'), lastName = get('Last');
    const memberId = `${firstName.split(/\s+/)[0]}-${lastName}`.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
    const suffix = /^(Jr\.?|Sr\.?|II|III|IV)$/i.test(get('Suffix')) ? get('Suffix') : '';
    return {year,docId,filingId:docId,filingDate,filingType,firstName,lastName,
      displayName:[firstName,lastName,suffix].filter(Boolean).join(' ').replace(/\s+/g,' '),
      stateDistrict:get('StateDst'),memberId,
      sourceUrl:`https://disclosures-clerk.house.gov/public_disc/${filingType === 'P' ? 'ptr-pdfs' : 'financial-pdfs'}/${year}/${docId}.pdf`,indexRow:line};
  });
}

// Archive formatting changes alone do not constitute amended disclosures.
export function compareIndexes(previous, current) {
  const keys = new Map(previous.map(r => [r.sourceUrl,r]));
  return {added:current.filter(r => !keys.has(r.sourceUrl)),
    changed:current.filter(r => {
      const old = keys.get(r.sourceUrl);
      return old && (r.memberId !== old.memberId || r.filingDate !== old.filingDate);
    })};
}
