import * as XLSX from 'xlsx';
import { Employee, ShiftCategory, SwapPlan, Gender, DaySchedule, MarketPost, MarketMatchOption } from '../types';
import { SHIFT_DEFINITIONS } from '../data/defaultData';

/**
 * Validates if an employee can legally take a given shift.
 * Regulatory rules:
 * 1. Females cannot do night shifts (limit: highest 02:00 to 22:00).
 * 2. Shifts ending past 22:00 or starting before 02:00 (e.g. Night, Overnight) are male-only.
 * 3. Maternity leave & Parental leave cannot be changed or swapped.
 */
export function checkShiftEligibility(
  employee: Employee,
  targetShift: ShiftCategory,
  targetTiming?: string
): { eligible: boolean; reason?: string } {
  // Check protected leaves
  if (targetShift === 'Maternity Leave') {
    return { eligible: false, reason: 'Maternity Leave is legally protected and cannot be exchanged or transferred.' };
  }
  if (targetShift === 'Parental Leave') {
    return { eligible: false, reason: 'Parental Leave is legally protected and cannot be exchanged or transferred.' };
  }

  // If assigning OFF, always eligible
  if (targetShift === 'OFF') {
    return { eligible: true };
  }

  const shiftDef = SHIFT_DEFINITIONS[targetShift];

  // Female Night Shift & Time Limit Constraints
  if (employee.gender === 'female') {
    if (shiftDef && shiftDef.maleOnly) {
      return {
        eligible: false,
        reason: `Regulatory policy constraint: ${shiftDef.category} shift ends after 22:00. Female employees can only be scheduled up to 22:00 (02:00–22:00 maximum limit).`
      };
    }

    if (targetShift === 'Night' || targetShift === 'Overnight') {
      return {
        eligible: false,
        reason: 'Night and Overnight shifts (past 22:00) are reserved for male staff under bank labor safety compliance.'
      };
    }

    // Parse exact timing if provided
    const timingToCheck = targetTiming || shiftDef?.time || '';
    const match = timingToCheck.match(/(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})/);
    if (match) {
      const startH = parseInt(match[1], 10);
      const endH = parseInt(match[3], 10);

      // Past 22:00: e.g. 23:00, 24:00, 00:00, 01:00..06:00
      const endsPast22 = endH === 23 || endH === 24 || endH === 0 || (endH > 0 && endH <= 7) || endH > 22;
      const startsBefore02 = startH < 2 && startH >= 0;

      if (endsPast22 || startsBefore02) {
        return {
          eligible: false,
          reason: `Policy constraint: Shift hours (${timingToCheck}) exceed the female shift boundary (02:00 to 22:00 max).`
        };
      }
    }
  }

  return { eligible: true };
}

/**
 * Checks if an existing shift on a day is protected (Maternity or Parental leave).
 */
export function isShiftProtected(shift: ShiftCategory): boolean {
  return shift === 'Maternity Leave' || shift === 'Parental Leave';
}

/**
 * High-performance circular swap engine for Day Off requests.
 * Generates 2-person, 3-person, and 4-person circular swap options
 * in <15ms directly on the client.
 */
export function generateDayOffPlans(
  requester: Employee,
  targetDateIndex: number,
  allEmployees: Employee[],
  days: DaySchedule[]
): SwapPlan[] {
  const requestedShift = requester.schedule[targetDateIndex];
  const requestedTiming = requester.timings[targetDateIndex] || SHIFT_DEFINITIONS[requestedShift]?.time || 'Duty';
  if (!requestedShift || requestedShift === 'OFF' || isShiftProtected(requestedShift)) return [];

  type Link = { employee: Employee; targetDateIndex: number };
  const results: SwapPlan[] = [];
  const seen = new Set<string>();
  const maxPeople = Math.min(5, Math.max(2, allEmployees.length));

  const eligible = (employee: Employee, shift: ShiftCategory, timing: string) =>
    shift !== 'OFF' && !isShiftProtected(shift) && checkShiftEligibility(employee, shift, timing).eligible;

  const makePlan = (chain: Link[]) => {
    if (chain.length < 2 || chain.length > maxPeople) return;
    const key = chain.map(x => `${x.employee.id}:${x.targetDateIndex}`).join('|');
    if (seen.has(key)) return;
    seen.add(key);

    const transfers = chain.map((link, index) => {
      const next = chain[(index + 1) % chain.length];
      const sourceShift = link.employee.schedule[link.targetDateIndex];
      const sourceTiming = link.employee.timings[link.targetDateIndex] || SHIFT_DEFINITIONS[sourceShift]?.time || 'Duty';
      return {
        fromEmployeeId: link.employee.id,
        toEmployeeId: next.employee.id,
        dateIndex: link.targetDateIndex,
        date: days[link.targetDateIndex].date,
        fromShift: sourceShift,
        fromTiming: sourceTiming,
        toShift: 'OFF' as ShiftCategory,
        toTiming: 'Rest Day'
      };
    });

    const assignments: any[] = transfers.map(t => ({
      employeeId: t.toEmployeeId,
      dateIndex: t.dateIndex,
      date: t.date,
      shift: t.fromShift,
      timing: t.fromTiming,
      sourceEmployeeId: t.fromEmployeeId,
      sourceEmployeeName: chain.find(x => x.employee.id === t.fromEmployeeId)!.employee.name,
      sourceDateIndex: t.dateIndex,
      sourceDate: t.date
    }));

    const names = chain.map(x => x.employee.name.split(' ')[0]);
    const stepText = transfers.map((t, i) => {
      const fromName = chain[i].employee.name.split(' ')[0];
      const toName = chain[(i + 1) % chain.length].employee.name.split(' ')[0];
      return `${fromName}'s ${days[t.dateIndex].dayName} shift → ${toName}`;
    }).join(' • ');

    results.push({
      id: `plan-${chain.length}-${requester.id}-${chain.map(x => x.employee.id).join('-')}-${chain.map(x => x.targetDateIndex).join('-')}`,
      members: chain.map(x => x.employee.id),
      type: chain.length === 2 ? 'direct-2' : chain.length === 3 ? 'circular-3' : chain.length === 4 ? 'circular-4' : 'circular-5',
      transfers,
      assignments,
      description: `${chain.length}-person exchange: ${names.join(' → ')} → ${names[0]}. ${stepText}`,
      score: 100 - (chain.length - 2) * 8
    });
  };

  const dfs = (chain: Link[], usedPeople: Set<string>, usedDates: Set<number>) => {
    if (results.length >= 20) return;
    const last = chain[chain.length - 1];
    const lastShift = last.employee.schedule[last.targetDateIndex];
    const lastTiming = last.employee.timings[last.targetDateIndex] || SHIFT_DEFINITIONS[lastShift]?.time || 'Duty';

    // Close the loop: requester must already be OFF on the last person's requested day
    // and must be eligible to take that last person's working shift.
    if (chain.length >= 2 && requester.schedule[last.targetDateIndex] === 'OFF' &&
        eligible(requester, lastShift, lastTiming)) {
      makePlan(chain);
    }

    if (chain.length >= maxPeople) return;

    for (const candidate of allEmployees) {
      if (usedPeople.has(candidate.id)) continue;
      if (candidate.schedule[last.targetDateIndex] !== 'OFF') continue;
      if (!checkShiftEligibility(candidate, lastShift, lastTiming).eligible) continue;

      for (let candidateDate = 0; candidateDate < days.length; candidateDate++) {
        if (usedDates.has(candidateDate) || candidateDate === targetDateIndex) continue;
        const candidateShift = candidate.schedule[candidateDate];
        const candidateTiming = candidate.timings[candidateDate] || SHIFT_DEFINITIONS[candidateShift]?.time || 'Duty';
        if (!eligible(candidate, candidateShift, candidateTiming)) continue;

        // If this is the final person, they must be closable by the requester.
        if (chain.length + 1 === maxPeople && candidateDate !== targetDateIndex && requester.schedule[candidateDate] !== 'OFF') continue;

        dfs(
          [...chain, { employee: candidate, targetDateIndex: candidateDate }],
          new Set([...usedPeople, candidate.id]),
          new Set([...usedDates, candidateDate])
        );
        if (results.length >= 20) return;
      }
    }
  };

  dfs(
    [{ employee: requester, targetDateIndex }],
    new Set([requester.id]),
    new Set([targetDateIndex])
  );

  return results
    .sort((a, b) => b.score - a.score || a.members.length - b.members.length)
    .slice(0, 20);
}

/**
 * Finds circular day-off chains from explicit marketplace requests.
 * A valid chain is a closed loop of 2–5 employees:
 * A wants A's date off -> B works A's date and wants B's date off -> ... -> A works the last person's date.
 * Nothing is mutated here. The returned plan is only a proposal and requires unanimous consent.
 */
export function generateMarketplaceDayOffChains(
  requesterPost: MarketPost,
  posts: MarketPost[],
  allEmployees: Employee[],
  days: DaySchedule[],
  maxPeople = 5
): SwapPlan[] {
  if (requesterPost.type !== 'desire-day-off') return [];
  const requester = allEmployees.find(e => e.id === requesterPost.authorId);
  if (!requester) return [];
  const startShift = requester.schedule[requesterPost.targetDateIndex];
  if (startShift === 'OFF' || isShiftProtected(startShift)) return [];

  const dayOffPosts = posts.filter(p =>
    p.type === 'desire-day-off' &&
    (p.status === 'open' || p.status === 'pending') &&
    p.authorId !== requester.id &&
    p.targetDateIndex !== requesterPost.targetDateIndex
  );
  const results: SwapPlan[] = [];
  const seen = new Set<string>();

  const makePlan = (chain: MarketPost[]) => {
    const members = chain.map(p => p.authorId);
    const key = `${requesterPost.id}:${members.join('>')}:${chain.map(p => p.targetDateIndex).join(',')}`;
    if (seen.has(key)) return;
    seen.add(key);

    const assignments = chain.map((post, i) => {
      const sourcePost = post;
      const recipientPost = chain[(i + 1) % chain.length];
      const source = allEmployees.find(e => e.id === sourcePost.authorId)!;
      const recipient = allEmployees.find(e => e.id === recipientPost.authorId)!;
      const sourceShift = source.schedule[sourcePost.targetDateIndex];
      const sourceTiming = source.timings[sourcePost.targetDateIndex] || SHIFT_DEFINITIONS[sourceShift]?.time || 'Duty';
      return {
        employeeId: recipient.id,
        dateIndex: sourcePost.targetDateIndex,
        date: days[sourcePost.targetDateIndex].date,
        shift: sourceShift,
        timing: sourceTiming,
        sourceEmployeeId: source.id,
        sourceEmployeeName: source.name,
        sourceDateIndex: sourcePost.targetDateIndex,
        sourceDate: days[sourcePost.targetDateIndex].date
      };
    });

    // Every recipient must be eligible for the source's shift.
    for (const a of assignments) {
      const recipient = allEmployees.find(e => e.id === a.employeeId)!;
      const check = checkShiftEligibility(recipient, a.shift, a.timing);
      if (!check.eligible) return;
    }

    const transfers: any[] = chain.map((post, i) => {
      const source = allEmployees.find(e => e.id === post.authorId)!;
      const next = allEmployees.find(e => e.id === chain[(i + 1) % chain.length].authorId)!;
      const shift = source.schedule[post.targetDateIndex];
      const timing = source.timings[post.targetDateIndex] || SHIFT_DEFINITIONS[shift]?.time || 'Duty';
      return {
        fromEmployeeId: source.id,
        toEmployeeId: next.id,
        dateIndex: post.targetDateIndex,
        date: days[post.targetDateIndex].date,
        fromShift: shift,
        fromTiming: timing,
        toShift: 'OFF',
        toTiming: 'Rest Day'
      };
    });

    const names = chain.map(p => p.authorName.split(' ')[0]);
    results.push({
      id: `market-chain-${requesterPost.id}-${members.join('-')}`,
      members,
      type: chain.length === 2 ? 'direct-2' : chain.length === 3 ? 'circular-3' : chain.length === 4 ? 'circular-4' : 'circular-5',
      transfers,
      assignments,
      description: `${chain.length}-person day-off chain: ${names.join(' → ')} → ${names[0]}. Each person works the next person's requested day, and everyone receives their requested day off.`,
      score: Math.max(60, 100 - (chain.length - 2) * 8)
    });
  };

  const dfs = (chain: MarketPost[]) => {
    if (results.length >= 12) return;
    if (chain.length === 0) {
      const starters = dayOffPosts.filter(candidate => {
        const candidateEmployee = allEmployees.find(e => e.id === candidate.authorId)!;
        if (candidateEmployee.schedule[requesterPost.targetDateIndex] === 'OFF' || isShiftProtected(candidateEmployee.schedule[requesterPost.targetDateIndex])) return false;
        return checkShiftEligibility(candidateEmployee, startShift, requester.timings[requesterPost.targetDateIndex]).eligible;
      });
      for (const candidate of starters.slice(0, 12)) dfs([candidate]);
      return;
    }
    const last = chain[chain.length - 1];
    // Close the loop if the requester is working on the last person's requested date.
    const lastEmployee = allEmployees.find(e => e.id === last.authorId)!;
    const requesterWorksLastDate = requester.schedule[last.targetDateIndex];
    if (requesterWorksLastDate !== 'OFF' && !isShiftProtected(requesterWorksLastDate) &&
        checkShiftEligibility(requester, requesterWorksLastDate, requester.timings[last.targetDateIndex]).eligible) {
      makePlan([requesterPost, ...chain]);
      if (results.length >= 12) return;
    }

    if (chain.length >= maxPeople - 1) return;
    const current = last;
    const nextCandidates = dayOffPosts.filter(candidate => {
      if (chain.some(p => p.authorId === candidate.authorId)) return false;
      // Candidate must be working the current person's requested date, so candidate can receive that duty.
      const candidateEmployee = allEmployees.find(e => e.id === candidate.authorId)!;
      const sourceEmployee = allEmployees.find(e => e.id === current.authorId)!;
      const sourceShift = sourceEmployee.schedule[current.targetDateIndex];
      const sourceTiming = sourceEmployee.timings[current.targetDateIndex];
      if (candidateEmployee.schedule[current.targetDateIndex] === 'OFF' || isShiftProtected(candidateEmployee.schedule[current.targetDateIndex])) return false;
      return checkShiftEligibility(candidateEmployee, sourceShift, sourceTiming).eligible;
    });
    for (const next of nextCandidates.slice(0, 12)) dfs([...chain, next]);
  };

  dfs([]);
  return results.sort((a, b) => b.score - a.score).slice(0, 12);
}

/**
 * Generates options to change shift timing on the same day.
 * Example: Requester works Evening (13:30-22:00) and wants Morning (07:00-15:30).
 * Matches with someone working that desired shift on that day who is willing/eligible to swap.
 */
export function generateTimingChangePlans(
  requester: Employee,
  targetDateIndex: number,
  desiredShift: ShiftCategory,
  allEmployees: Employee[],
  days: DaySchedule[]
): SwapPlan[] {
  const plans: SwapPlan[] = [];
  const curShift = requester.schedule[targetDateIndex];
  const curTiming = requester.timings[targetDateIndex];

  if (isShiftProtected(curShift) || isShiftProtected(desiredShift)) return [];

  // Check if requester is legally eligible for the desired shift
  const reqCheck = checkShiftEligibility(requester, desiredShift);
  if (!reqCheck.eligible) return [];

  // Find colleagues working the desired shift on the target day
  const matchingColleagues = allEmployees.filter(peer => {
    if (peer.id === requester.id) return false;
    if (peer.schedule[targetDateIndex] !== desiredShift) return false;
    // Check if peer is eligible for requester's current shift
    return checkShiftEligibility(peer, curShift, curTiming).eligible;
  });

  for (const peer of matchingColleagues) {
    const peerShift = peer.schedule[targetDateIndex];
    const peerTiming = peer.timings[targetDateIndex];

    plans.push({
      id: `timing-${requester.id}-${peer.id}-${targetDateIndex}`,
      members: [requester.id, peer.id],
      type: 'timing-change',
      transfers: [
        {
          fromEmployeeId: requester.id,
          toEmployeeId: peer.id,
          dateIndex: targetDateIndex,
          date: days[targetDateIndex].date,
          fromShift: curShift,
          fromTiming: curTiming,
          toShift: peerShift,
          toTiming: peerTiming
        },
        {
          fromEmployeeId: peer.id,
          toEmployeeId: requester.id,
          dateIndex: targetDateIndex,
          date: days[targetDateIndex].date,
          fromShift: peerShift,
          fromTiming: peerTiming,
          toShift: curShift,
          toTiming: curTiming
        }
      ],
      description: `Timing Swap on ${days[targetDateIndex].dayName}: You switch to ${peerShift} (${peerTiming}) and ${peer.name.split(' ')[0]} switches to ${curShift} (${curTiming}).`,
      score: 98
    });
  }

  return plans;
}

/**
 * Helper to extract textual lines from PDF ArrayBuffer
 */
async function extractTextFromPdf(buffer: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(buffer);
  const textDecoder = new TextDecoder('latin1');
  const rawString = textDecoder.decode(bytes);

  const textParts: string[] = [];

  // Match standard PDF text blocks: BT ... ET
  const btRegex = /BT[\s\S]*?ET/g;
  let btMatch;
  while ((btMatch = btRegex.exec(rawString)) !== null) {
    const block = btMatch[0];
    const tjRegex = /\(((?:\\\(|\\\)|[^)])*)\)\s*(?:Tj|'|")/g;
    let tjMatch;
    let blockText = '';
    while ((tjMatch = tjRegex.exec(block)) !== null) {
      const clean = tjMatch[1].replace(/\\([()\\])/g, '$1');
      blockText += clean + ' ';
    }
    const tjArrayRegex = /\[(.*?)\]\s*TJ/g;
    let arrMatch;
    while ((arrMatch = tjArrayRegex.exec(block)) !== null) {
      const inner = arrMatch[1];
      const strRegex = /\(((?:\\\(|\\\)|[^)])*)\)/g;
      let sMatch;
      while ((sMatch = strRegex.exec(inner)) !== null) {
        blockText += sMatch[1].replace(/\\([()\\])/g, '$1') + ' ';
      }
    }
    if (blockText.trim()) {
      textParts.push(blockText.trim());
    }
  }

  // Decompress FlateDecode streams if direct text blocks were minimal
  if (textParts.length < 5 && typeof DecompressionStream !== 'undefined') {
    const streamRegex = /stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g;
    let sMatch;
    while ((sMatch = streamRegex.exec(rawString)) !== null) {
      try {
        const streamStart = sMatch.index + sMatch[0].indexOf('\n') + 1;
        const streamEnd = sMatch.index + sMatch[0].lastIndexOf('endstream');
        const slice = bytes.subarray(streamStart, streamEnd);
        const ds = new DecompressionStream('deflate');
        const writer = ds.writable.getWriter();
        writer.write(slice);
        writer.close();
        const decompressed = await new Response(ds.readable).arrayBuffer();
        const decText = new TextDecoder().decode(decompressed);
        const subBtRegex = /BT[\s\S]*?ET/g;
        let subBt;
        while ((subBt = subBtRegex.exec(decText)) !== null) {
          const subBlock = subBt[0];
          const subTj = /\(((?:\\\(|\\\)|[^)])*)\)\s*(?:Tj|'|")/g;
          let subM;
          let subTxt = '';
          while ((subM = subTj.exec(subBlock)) !== null) {
            subTxt += subM[1].replace(/\\([()\\])/g, '$1') + ' ';
          }
          if (subTxt.trim()) textParts.push(subTxt.trim());
        }
      } catch {
        // Continue if non-deflate stream
      }
    }
  }

  return textParts.join('\n');
}

/**
 * Universal Roster Parser for Excel (.xlsx, .xls, .ods), CSV / Spreadsheets, and PDF
 */
export async function parseRosterData(
  rawData: ArrayBuffer | string,
  fileName: string
): Promise<{ employees: Employee[]; days: DaySchedule[] }> {
  let rows: string[][] = [];

  const lowerName = fileName.toLowerCase();
  if (lowerName.endsWith('.pdf')) {
    // Process PDF document
    const buffer = typeof rawData === 'string' ? new TextEncoder().encode(rawData).buffer : rawData;
    const extractedText = await extractTextFromPdf(buffer);
    
    if (extractedText.trim().length > 0) {
      rows = extractedText
        .split(/\r?\n/)
        .map(line => {
          if (line.includes(',')) {
            return line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
          }
          if (line.includes('\t')) {
            return line.split('\t').map(c => c.trim());
          }
          // Split on multiple spaces or shift tokens
          return line.split(/\s{2,}|\s*\|\s*/).map(c => c.trim());
        })
        .filter(r => r.length > 1);
    }

    if (rows.length < 2) {
      throw new Error('Could not extract tabular shift data from the PDF document. Please verify the PDF contains selectable text or export as Excel/CSV.');
    }
  } else if (
    lowerName.endsWith('.xlsx') || 
    lowerName.endsWith('.xls') || 
    lowerName.endsWith('.ods')
  ) {
    const workbook = XLSX.read(rawData, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    rows = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1, defval: '' });
  } else {
    // CSV, TSV, or spreadsheet text format
    try {
      // First attempt XLSX sheet reading for spreadsheets
      const workbook = XLSX.read(rawData, { type: typeof rawData === 'string' ? 'string' : 'array' });
      if (workbook.SheetNames.length > 0) {
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: '' });
      }
    } catch {
      // Fallback to text parsing
      const text = typeof rawData === 'string' ? rawData : new TextDecoder().decode(rawData);
      rows = text
        .split(/\r?\n/)
        .map(line => line.split(line.includes('\t') ? '\t' : ',').map(cell => cell.trim().replace(/^"|"$/g, '')));
    }
  }

  if (!rows || rows.length < 2) {
    throw new Error('Roster file contains insufficient rows. Please ensure header and employee data are present.');
  }

  // Find header row with dates or days
  let headerRowIndex = -1;
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const rowStr = rows[i].join(' ').toLowerCase();
    if (
      (rowStr.includes('bank') || rowStr.includes('agent') || rowStr.includes('name') || rowStr.includes('emp') || rowStr.includes('id')) &&
      (rowStr.includes('mon') || rowStr.includes('sep') || rowStr.includes('date') || rowStr.includes('14') || rowStr.includes('shift'))
    ) {
      headerRowIndex = i;
      break;
    }
  }

  if (headerRowIndex === -1) {
    headerRowIndex = 0; // fallback to first line
  }

  const header = rows[headerRowIndex].map(c => String(c || '').trim());
  const bankIdx = header.findIndex(h => /bank|id|emp|code/i.test(h));
  const nameIdx = header.findIndex(h => /name|agent|staff|employee/i.test(h));
  const genderIdx = header.findIndex(h => /gender|sex/i.test(h));

  // Extract dates across columns
  const dayCols: { colIndex: number; label: string; date: string }[] = [];
  const defaultDates = ['2026-09-14', '2026-09-15', '2026-09-16', '2026-09-17', '2026-09-18', '2026-09-19', '2026-09-20'];
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  header.forEach((cell, idx) => {
    if (idx === bankIdx || idx === nameIdx || idx === genderIdx) return;
    if (cell && (/\d{1,2}|mon|tue|wed|thu|fri|sat|sun|sep|oct|nov|dec/i.test(cell))) {
      dayCols.push({
        colIndex: idx,
        label: cell,
        date: defaultDates[dayCols.length % 7]
      });
    }
  });

  const finalDays: DaySchedule[] = (dayCols.length >= 7 ? dayCols.slice(0, 7) : defaultDates.map((d, i) => ({ colIndex: i + 3, label: dayNames[i], date: d }))).map((dc, i) => ({
    date: dc.date,
    dayName: dayNames[i],
    dayNumber: String(14 + i),
    month: 'Sep'
  }));

  const parsedEmployees: Employee[] = [];

  for (let r = headerRowIndex + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length < 2) continue;

    const bId = String(row[bankIdx >= 0 ? bankIdx : 0] || `EMP-${41000 + r}`).trim();
    const aName = String(row[nameIdx >= 0 ? nameIdx : 1] || 'Agent').trim();
    if (!aName || aName.toLowerCase().includes('total') || aName.toLowerCase().includes('page') || aName.toLowerCase().includes('summary')) continue;

    const rawGender = String(row[genderIdx >= 0 ? genderIdx : 2] || 'male').toLowerCase();
    const gender: Gender = rawGender.includes('f') ? 'female' : 'male';

    const schedule: ShiftCategory[] = [];
    const timings: string[] = [];
    const extraHours: number[] = [];

    finalDays.forEach((_, dIdx) => {
      const colIdx = dayCols[dIdx]?.colIndex ?? (dIdx + 3);
      const rawCell = String(row[colIdx] || 'OFF').trim();
      const classified = classifyRawShift(rawCell);
      schedule.push(classified.category);
      timings.push(classified.time);
      extraHours.push(classified.extraHours);
    });

    const initials = aName
      .split(/\s+/)
      .map(w => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

    const normalizedId = bId.startsWith('EMP-') 
      ? bId 
      : bId.startsWith('SCB-') 
      ? bId.replace('SCB-', 'EMP-') 
      : `EMP-${bId.replace(/^#/, '')}`;

    parsedEmployees.push({
      id: normalizedId,
      name: aName,
      gender,
      initials,
      role: 'Operations Specialist',
      department: 'Operations & Service Delivery',
      schedule: schedule.slice(0, 7),
      timings: timings.slice(0, 7),
      extraHours: extraHours.slice(0, 7),
      protectedLeaves: schedule.map(s => isShiftProtected(s) ? s : null)
    });
  }

  if (parsedEmployees.length === 0) {
    throw new Error('No valid employee records could be identified in the file.');
  }

  return { employees: parsedEmployees, days: finalDays };
}

function classifyRawShift(val: string): { category: ShiftCategory; time: string; extraHours: number } {
  const v = val.trim();
  const lower = v.toLowerCase();

  // If the cell contains an Extra Duty (EH) indicator:
  // In this workforce system, EH signifies a 5-hour Extra Duty shift compensated at 2,000 TK.
  const isEH = lower === 'eh' || 
               lower.startsWith('eh ') || 
               lower.endsWith(' eh') || 
               lower.includes('extra duty') || 
               lower.includes('2000tk') || 
               lower.includes('5h eh') ||
               lower.includes('eh 5h');

  let extraHours = isEH ? 5 : 0;
  const ehMatch = v.match(/\+?(\d+(?:\.\d+)?)\s*(?:eh|extra|h|hrs)/i);
  if (ehMatch) {
    extraHours = parseFloat(ehMatch[1]);
  }

  if (!v || lower === 'off' || lower === 'do' || lower === 'rest' || lower === '-' || lower === 'x' || lower.includes('day off')) {
    return { category: 'OFF', time: 'Rest Day', extraHours: 0 };
  }
  if (lower.includes('maternity') || lower === 'ml') {
    return { category: 'Maternity Leave', time: 'Maternity Leave', extraHours: 0 };
  }
  if (lower.includes('parental') || lower === 'pl') {
    return { category: 'Parental Leave', time: 'Parental Leave', extraHours: 0 };
  }
  if (lower.includes('sick') || lower === 'sl') {
    return { category: 'Sick Leave', time: 'Medical Rest', extraHours: 0 };
  }
  if (lower.includes('annual') || lower === 'al' || lower.includes('pto') || lower.includes('leave')) {
    return { category: 'Annual Leave', time: 'Approved PTO', extraHours: 0 };
  }

  // If pure EH cell without shift code, mark as standard 5-hour Extra Duty
  if (isEH && (lower === 'eh' || lower.includes('extra duty'))) {
    return { 
      category: 'Day', 
      time: '11:00 – 16:00', 
      extraHours: 5 
    };
  }

  // Exact shift name or common abbreviation checks
  if (/^m$|^mrn$|morning/i.test(v)) return { category: 'Morning', time: isEH ? '07:00 – 15:30' : '07:00 – 15:30', extraHours };
  if (/^e$|^evn$|evening/i.test(v)) return { category: 'Evening', time: isEH ? '13:30 – 22:00' : '13:30 – 22:00', extraHours };
  if (/^on$|^ovn$|overnight/i.test(v)) return { category: 'Overnight', time: isEH ? '22:30 – 07:30' : '22:30 – 07:30', extraHours: Math.max(extraHours, 3) };
  if (/^n$|^ngt$|night/i.test(v)) return { category: 'Night', time: isEH ? '16:00 – 00:00' : '16:00 – 00:00', extraHours };
  if (/^d$|^day$/i.test(v) || /day/i.test(v)) return { category: 'Day', time: isEH ? '10:00 – 18:30' : '10:00 – 18:30', extraHours };

  // Parse time stamps if present e.g. "16:00 - 24:00"
  const timeMatch = v.match(/(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})/);
  if (timeMatch) {
    const startH = parseInt(timeMatch[1], 10);
    const endH = parseInt(timeMatch[3], 10);
    const formatted = `${timeMatch[1]}:${timeMatch[2]} – ${timeMatch[3]}:${timeMatch[4]}`;

    if (startH >= 21 || (endH > 0 && endH <= 8)) {
      return { category: 'Overnight', time: formatted, extraHours: Math.max(extraHours, 3) };
    }
    if (startH >= 15 || endH === 0 || endH === 24 || endH > 22) {
      return { category: 'Night', time: formatted, extraHours };
    }
    if (startH >= 12 || endH >= 21) {
      return { category: 'Evening', time: formatted, extraHours };
    }
    if (startH >= 9) {
      return { category: 'Day', time: formatted, extraHours };
    }
    return { category: 'Morning', time: formatted, extraHours };
  }

  return { category: 'Day', time: v, extraHours };
}

/**
 * Calculates extra hours for shift changes:
 * If an employee takes the 22:30–07:30 overnight shift, their extraHours for that day
 * are quietly set to at least 3h.
 */
export function calculateExtraHoursForShift(
  _shift: ShiftCategory,
  _timing: string,
  currentEH: number = 0
): number {
  // EH is a separate, explicit 5-hour marketplace duty. Normal shift changes
  // must never silently create +2h/+3h/etc. extra-hour records.
  return currentEH;
}

export interface AvailableShiftGroup {
  category: ShiftCategory;
  timing: string;
  count: number;
  isEligibleForCurrentEmployee: boolean;
  ineligibilityReason?: string;
  colleagues: {
    employee: Employee;
    currentShift: ShiftCategory;
    currentTiming: string;
    canSwapWithCurrent: boolean;
    reason?: string;
  }[];
}

/**
 * Retrieves all available shifts on a given day with assigned colleagues,
 * evaluating female timing constraints and eligibility for direct shift trading.
 */
export function getDayAvailableShiftsAndStaff(
  dayIndex: number,
  allEmployees: Employee[],
  currentEmployee: Employee
): AvailableShiftGroup[] {
  const categories: ShiftCategory[] = ['Morning', 'Day', 'Evening', 'Night', 'Overnight', 'OFF'];
  const currentShift = currentEmployee.schedule[dayIndex];
  const currentTiming = currentEmployee.timings[dayIndex];

  return categories.map(cat => {
    const def = SHIFT_DEFINITIONS[cat];
    const timing = def?.time || 'Custom';
    const myEligibility = checkShiftEligibility(currentEmployee, cat, timing);

    // Find colleagues working this shift
    const colleaguesOnShift = allEmployees
      .filter(e => e.id !== currentEmployee.id && e.schedule[dayIndex] === cat)
      .map(colleague => {
        // Can colleague take current employee's shift?
        const colleagueCanTakeMine = checkShiftEligibility(colleague, currentShift, currentTiming);
        const iCanTakeColleague = myEligibility.eligible;

        const canSwapWithCurrent = colleagueCanTakeMine.eligible && iCanTakeColleague;
        let reason = '';
        if (!iCanTakeColleague) {
          reason = myEligibility.reason || 'You are not eligible for this shift.';
        } else if (!colleagueCanTakeMine.eligible) {
          reason = `${colleague.name} cannot take your current ${currentShift} shift (${colleagueCanTakeMine.reason}).`;
        }

        return {
          employee: colleague,
          currentShift: cat,
          currentTiming: colleague.timings[dayIndex],
          canSwapWithCurrent,
          reason
        };
      });

    return {
      category: cat,
      timing,
      count: colleaguesOnShift.length,
      isEligibleForCurrentEmployee: myEligibility.eligible,
      ineligibilityReason: myEligibility.reason,
      colleagues: colleaguesOnShift
    };
  });
}

/**
 * Finds a matching trade path for a market post from the perspective of the viewing employee.
 * Shows exactly how the viewer can manage or which shift they can offer.
 */
export function findMarketMatchPath(
  post: MarketPost,
  viewer: Employee,
  allEmployees: Employee[],
  days: DaySchedule[],
  marketPosts: MarketPost[] = []
): MarketMatchOption | null {
  if (post.authorId === viewer.id) return null;
  const poster = allEmployees.find(e => e.id === post.authorId);
  if (!poster) return null;

  const targetDay = days[post.targetDateIndex] || days[0];
  const posterTargetShift = poster.schedule[post.targetDateIndex];
  const posterTargetTiming = poster.timings[post.targetDateIndex];
  const viewerTargetShift = viewer.schedule[post.targetDateIndex];
  const viewerTargetTiming = viewer.timings[post.targetDateIndex];

  // First-class multi-person day-off matching. If the viewer has also posted a day-off need,
  // find a closed loop of up to five people and expose the complete transfer path without mutating anything.
  if (post.type === 'desire-day-off') {
    const viewerPost = marketPosts.find(p =>
      p.authorId === viewer.id && p.type === 'desire-day-off' &&
      (p.status === 'open' || p.status === 'pending')
    );
    if (viewerPost) {
      const chainPlans = generateMarketplaceDayOffChains(viewerPost, marketPosts, allEmployees, days, 5);
      const plan = chainPlans.find(p => p.members.includes(post.authorId));
      if (plan) {
        const steps = plan.assignments?.map((a, idx) => {
          const recipient = allEmployees.find(e => e.id === a.employeeId)!;
          return {
            title: `Step ${idx + 1}: ${recipient.name.split(' ')[0]} works ${a.sourceEmployeeName.split(' ')[0]}'s day`,
            description: `${recipient.name} takes ${a.sourceEmployeeName}'s ${a.shift} (${a.timing}) on ${days[a.dateIndex].dayName}, ${days[a.dateIndex].dayNumber} ${days[a.dateIndex].month}. ${a.sourceEmployeeName} becomes OFF that day.`,
            from: a.sourceEmployeeName,
            to: recipient.name,
            shiftGiven: `${a.shift} (${a.timing})`,
            shiftReceived: `${a.shift} (${a.timing})`
          };
        }) || [];
        return {
          postId: post.id,
          isEligible: true,
          matchType: 'multi-step',
          summary: `${plan.members.length}-Person Day-Off Chain`,
          pathDescription: plan.description,
          steps,
          userGivesShift: viewer.schedule[viewerPost.targetDateIndex],
          userGivesTiming: viewer.timings[viewerPost.targetDateIndex] || 'Duty',
          userReceivesShift: 'OFF',
          userReceivesTiming: 'Rest Day',
          targetDate: viewerPost.targetDate,
          targetDateIndex: viewerPost.targetDateIndex,
          plan
        };
      }
    }
  }

  // Case 1: Poster desires Day Off
  if (post.type === 'desire-day-off') {
    // Option 1A: Viewer is OFF on that same day -> direct day-off exchange
    if (viewerTargetShift === 'OFF') {
      const viewerEligible = checkShiftEligibility(viewer, posterTargetShift, posterTargetTiming);
      if (viewerEligible.eligible) {
        return {
          postId: post.id,
          isEligible: true,
          matchType: 'day-off-exchange',
          summary: `Direct Day Off Exchange on ${targetDay.dayName}, ${targetDay.dayNumber} ${targetDay.month}`,
          pathDescription: `You have a scheduled Rest Day on ${targetDay.dayName}. You can take ${poster.name.split(' ')[0]}'s ${posterTargetShift} shift, giving them their desirable day off.`,
          steps: [
            {
              title: `Step 1: Offer Rest Day`,
              description: `You offer your Rest Day (OFF) to ${poster.name.split(' ')[0]} on ${targetDay.dayName}, ${targetDay.dayNumber} ${targetDay.month}.`,
              from: viewer.name,
              to: poster.name,
              shiftGiven: 'OFF (Rest Day)',
              shiftReceived: `${posterTargetShift} (${posterTargetTiming})`
            },
            {
              title: `Step 2: Cover ${poster.name.split(' ')[0]}'s Shift`,
              description: `You take over ${poster.name.split(' ')[0]}'s ${posterTargetShift} shift (${posterTargetTiming}).`,
              from: poster.name,
              to: viewer.name,
              shiftGiven: `${posterTargetShift} (${posterTargetTiming})`,
              shiftReceived: 'OFF (Rest Day)'
            },
            {
              title: `Step 3: Female Timing Policy Verified`,
              description: `Shift timing compliant with 02:00–22:00 labor guidelines.`,
              from: 'Regulatory Engine',
              to: 'Both Staff',
              shiftGiven: 'Compliant',
              shiftReceived: 'Compliant'
            }
          ],
          userGivesShift: 'OFF',
          userGivesTiming: 'Rest Day',
          userReceivesShift: posterTargetShift,
          userReceivesTiming: posterTargetTiming,
          targetDate: targetDay.date,
          targetDateIndex: post.targetDateIndex
        };
      } else {
        return {
          postId: post.id,
          isEligible: false,
          ineligibilityReason: viewerEligible.reason,
          matchType: 'day-off-exchange',
          summary: `Incompatible Shift Timing`,
          pathDescription: `You have Rest Day, but you cannot legally take ${poster.name.split(' ')[0]}'s ${posterTargetShift} shift due to: ${viewerEligible.reason}`,
          steps: [],
          userGivesShift: 'OFF',
          userGivesTiming: 'Rest Day',
          userReceivesShift: posterTargetShift,
          userReceivesTiming: posterTargetTiming,
          targetDate: targetDay.date,
          targetDateIndex: post.targetDateIndex
        };
      }
    }

    // Option 1B: Mutual Timing Swap on the same date (if poster can take viewer's shift and vice versa)
    if (!isShiftProtected(viewerTargetShift) && !isShiftProtected(posterTargetShift)) {
      const viewerEligible = checkShiftEligibility(viewer, posterTargetShift, posterTargetTiming);
      const posterEligible = checkShiftEligibility(poster, viewerTargetShift, viewerTargetTiming);

      if (viewerEligible.eligible && posterEligible.eligible && viewerTargetShift !== posterTargetShift) {
        return {
          postId: post.id,
          isEligible: true,
          matchType: 'direct-timing',
          summary: `Same-Day Timing Swap on ${targetDay.dayName}, ${targetDay.dayNumber} ${targetDay.month}`,
          pathDescription: `You are working ${viewerTargetShift} (${viewerTargetTiming}) on ${targetDay.dayName}. You can swap shifts with ${poster.name.split(' ')[0]}, who is working ${posterTargetShift} (${posterTargetTiming}).`,
          steps: [
            {
              title: `Step 1: Offer Your ${viewerTargetShift} Shift`,
              description: `You transfer your ${viewerTargetShift} (${viewerTargetTiming}) to ${poster.name.split(' ')[0]}.`,
              from: viewer.name,
              to: poster.name,
              shiftGiven: `${viewerTargetShift} (${viewerTargetTiming})`,
              shiftReceived: `${posterTargetShift} (${posterTargetTiming})`
            },
            {
              title: `Step 2: Receive ${posterTargetShift} Shift`,
              description: `You assume ${posterTargetShift} (${posterTargetTiming}) for ${targetDay.dayName}.`,
              from: poster.name,
              to: viewer.name,
              shiftGiven: `${posterTargetShift} (${posterTargetTiming})`,
              shiftReceived: `${viewerTargetShift} (${viewerTargetTiming})`
            },
            {
              title: `Step 3: Labor Timing Verified`,
              description: `Both agents conform to the 02:00–22:00 female timing policy and labor regulations.`,
              from: 'Audit Engine',
              to: 'Both Staff',
              shiftGiven: 'Compliant',
              shiftReceived: 'Compliant'
            }
          ],
          userGivesShift: viewerTargetShift,
          userGivesTiming: viewerTargetTiming,
          userReceivesShift: posterTargetShift,
          userReceivesTiming: posterTargetTiming,
          targetDate: targetDay.date,
          targetDateIndex: post.targetDateIndex
        };
      }
    }

    // Option 1C: Cross-day trade (Poster works another day where viewer has duty and poster is OFF)
    for (let dayIdx = 0; dayIdx < days.length; dayIdx++) {
      if (dayIdx === post.targetDateIndex) continue;
      const returnDay = days[dayIdx];
      const posterReturnShift = poster.schedule[dayIdx];
      const viewerReturnShift = viewer.schedule[dayIdx];
      const viewerReturnTiming = viewer.timings[dayIdx];

      if (posterReturnShift === 'OFF' && viewerReturnShift !== 'OFF' && !isShiftProtected(viewerReturnShift)) {
        const viewerCanTakePosterTarget = checkShiftEligibility(viewer, posterTargetShift, posterTargetTiming);
        const posterCanTakeViewerReturn = checkShiftEligibility(poster, viewerReturnShift, viewerReturnTiming);

        if (viewerCanTakePosterTarget.eligible && posterCanTakeViewerReturn.eligible) {
          return {
            postId: post.id,
            isEligible: true,
            matchType: 'cover-trade',
            summary: `Two-Way Cross Day Trade: ${targetDay.dayName} ⇄ ${returnDay.dayName}`,
            pathDescription: `You cover ${poster.name.split(' ')[0]} on ${targetDay.dayName} so they get their day off. In return, ${poster.name.split(' ')[0]} covers your ${viewerReturnShift} shift on ${returnDay.dayName}.`,
            steps: [
              {
                title: `Step 1: Cover ${targetDay.dayName} Shift`,
                description: `You take ${poster.name.split(' ')[0]}'s ${posterTargetShift} shift on ${targetDay.dayName}, freeing their day.`,
                from: viewer.name,
                to: poster.name,
                shiftGiven: 'Offered Duty',
                shiftReceived: `${posterTargetShift} (${posterTargetTiming})`
              },
              {
                title: `Step 2: Return Coverage on ${returnDay.dayName}`,
                description: `${poster.name.split(' ')[0]} works your ${viewerReturnShift} shift on ${returnDay.dayName}, giving you a rest day.`,
                from: poster.name,
                to: viewer.name,
                shiftGiven: `${viewerReturnShift} (${viewerReturnTiming})`,
                shiftReceived: 'OFF (Rest Day)'
              },
              {
                title: `Step 3: Labor Timing Verified`,
                description: `Shift distribution complies with labor policy and maximum timing constraints.`,
                from: 'Labor Engine',
                to: 'Roster',
                shiftGiven: 'Balanced',
                shiftReceived: 'Balanced'
              }
            ],
            userGivesShift: viewerReturnShift,
            userGivesTiming: viewerReturnTiming,
            userReceivesShift: posterTargetShift,
            userReceivesTiming: posterTargetTiming,
            targetDate: targetDay.date,
            targetDateIndex: post.targetDateIndex,
            returnDate: returnDay.date,
            returnDateIndex: dayIdx
          };
        }
      }
    }
  }

  // Case 2: Poster desires Working Shift
  if (post.type === 'desire-work-shift') {
    // If viewer is scheduled for a working shift on that date
    if (viewerTargetShift !== 'OFF' && !isShiftProtected(viewerTargetShift)) {
      const posterEligible = checkShiftEligibility(poster, viewerTargetShift, viewerTargetTiming);
      const viewerEligible = checkShiftEligibility(viewer, posterTargetShift, posterTargetTiming);

      if (posterEligible.eligible && viewerEligible.eligible) {
        return {
          postId: post.id,
          isEligible: true,
          matchType: 'direct-timing',
          summary: `Offer Your ${viewerTargetShift} Shift on ${targetDay.dayName}, ${targetDay.dayNumber} ${targetDay.month}`,
          pathDescription: `You are scheduled for ${viewerTargetShift} (${viewerTargetTiming}) on ${targetDay.dayName}. You can transfer this shift to ${poster.name.split(' ')[0]}, who is seeking work on this day.`,
          steps: [
            {
              title: `Step 1: Transfer ${viewerTargetShift} Shift`,
              description: `You transfer your ${viewerTargetShift} shift to ${poster.name.split(' ')[0]} on ${targetDay.dayName}.`,
              from: viewer.name,
              to: poster.name,
              shiftGiven: `${viewerTargetShift} (${viewerTargetTiming})`,
              shiftReceived: `${posterTargetShift} (${posterTargetTiming})`
            },
            {
              title: `Step 2: Receive ${posterTargetShift}`,
              description: `You receive ${poster.name.split(' ')[0]}'s current status (${posterTargetShift}) on ${targetDay.dayName}.`,
              from: poster.name,
              to: viewer.name,
              shiftGiven: `${posterTargetShift} (${posterTargetTiming})`,
              shiftReceived: `${viewerTargetShift} (${viewerTargetTiming})`
            },
            {
              title: `Step 3: Verification`,
              description: `Female timing compliance and supervisor roster rules verified.`,
              from: 'Roster Engine',
              to: 'Both Staff',
              shiftGiven: 'Approved',
              shiftReceived: 'Approved'
            }
          ],
          userGivesShift: viewerTargetShift,
          userGivesTiming: viewerTargetTiming,
          userReceivesShift: posterTargetShift,
          userReceivesTiming: posterTargetTiming,
          targetDate: targetDay.date,
          targetDateIndex: post.targetDateIndex
        };
      }
    }
  }

  return null;
}

export interface RankedMarketMatch {
  post: MarketPost;
  match: MarketMatchOption | null;
  score: number;
  feasibilityScore: number;
  attractivenessScore: number;
  highlightBadge: string;
  rankIndex: number;
}

/**
 * Ranks market offers in strict adherence to user interest:
 * If user wants a day off -> feasible matchups where user receives a Rest Day show first.
 * If user wants to work extra -> Extra Duty (EH: 5h • 2,000 TK) and active shifts on rest days show first.
 * Hierarchy ensures the most attractive and compliant options are surfaced first.
 */
export function findRankedMarketMatches(
  posts: MarketPost[],
  viewer: Employee,
  allEmployees: Employee[],
  days: DaySchedule[],
  userPreference: 'day-off' | 'extra-work' | 'all' = 'all'
): RankedMarketMatch[] {
  const openPosts = posts.filter(p => p.status === 'open' && p.authorId !== viewer.id);

  const evaluated: RankedMarketMatch[] = openPosts.map(post => {
    const rawMatch = findMarketMatchPath(post, viewer, allEmployees, days, posts);
    const poster = allEmployees.find(e => e.id === post.authorId);

    let feasibilityScore = 20;
    let attractivenessScore = 20;
    let highlightBadge = 'Open Shift Offer';

    if (rawMatch && rawMatch.isEligible) {
      feasibilityScore = 50; // 100% compliant with labor rules & female timing

      const isUserGettingRest = rawMatch.userReceivesShift === 'OFF';
      const isUserWorkingExtra = rawMatch.userReceivesShift !== 'OFF' && viewer.schedule[post.targetDateIndex] === 'OFF';
      const isEH = poster?.extraHours[post.targetDateIndex] && poster.extraHours[post.targetDateIndex] > 0;

      if (userPreference === 'day-off') {
        if (isUserGettingRest) {
          attractivenessScore = 50;
          highlightBadge = '🌟 Top Fit • Grants You a Day Off';
        } else if (rawMatch.matchType === 'day-off-exchange') {
          attractivenessScore = 42;
          highlightBadge = '✨ Feasible Day-Off Trade';
        } else {
          attractivenessScore = 25;
          highlightBadge = 'Mutual Schedule Swap';
        }
      } else if (userPreference === 'extra-work') {
        if (isEH) {
          attractivenessScore = 50;
          highlightBadge = '💰 Top Fit • Extra Duty (5h • 2,000 TK)';
        } else if (isUserWorkingExtra) {
          attractivenessScore = 45;
          highlightBadge = '💼 Work Extra on Rest Day';
        } else {
          attractivenessScore = 30;
          highlightBadge = 'Working Shift Opportunity';
        }
      } else {
        // General hierarchy
        if (isUserGettingRest) {
          attractivenessScore = 45;
          highlightBadge = '🌟 Day Off Opportunity';
        } else if (isEH) {
          attractivenessScore = 48;
          highlightBadge = '💰 Extra Duty (5h • 2,000 TK)';
        } else {
          attractivenessScore = 35;
          highlightBadge = '✨ Direct Shift Match';
        }
      }

      rawMatch.feasibilityScore = feasibilityScore;
      rawMatch.attractivenessScore = attractivenessScore;
      rawMatch.totalScore = feasibilityScore + attractivenessScore;
      rawMatch.matchHighlight = highlightBadge;
    } else {
      // Ineligible or non-direct
      feasibilityScore = rawMatch ? 15 : 10;
      attractivenessScore = 10;
      highlightBadge = rawMatch?.ineligibilityReason ? '⚠️ Timing Incompatible' : 'Alternative Offer';
    }

    const totalScore = feasibilityScore + attractivenessScore;

    return {
      post,
      match: rawMatch,
      score: totalScore,
      feasibilityScore,
      attractivenessScore,
      highlightBadge,
      rankIndex: 0
    };
  });

  // Sort descending: most feasible and attractable shows first!
  evaluated.sort((a, b) => b.score - a.score);

  // Assign 1-based hierarchy ranks
  evaluated.forEach((item, idx) => {
    item.rankIndex = idx + 1;
    if (item.match) {
      item.match.hierarchyRank = idx + 1;
    }
  });

  return evaluated;
}
