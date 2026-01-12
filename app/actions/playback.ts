"use server";

import { sequence_by_id } from "./sequence";
import { screen_by_id } from "./screen";

export async function playback(screen_id: string) {
  // 1. โหลด screen
  const screen = await screen_by_id(screen_id);
  // 2. หา sequence id จาก screen
  const sequence_id = await check_sequence_from_screen(screen);
  // 3. โหลด sequence หลัก
  const sequence = await sequence_by_id(sequence_id);
  // 4. resolve playback → libraryItemId[]
  const playlist = await resolveSequencePlayback(
    sequence,
    screen,
    getSequenceCached
  );
  return {
    screenId: screen.id,
    sequenceId: sequence_id,
    playlist, // <-- array libraryItemId | null
  };
}


async function check_sequence_from_screen(screen: any): Promise<string> {
  const data = screen.data || {};
  const sequence_id = data.sequenceIdOverride || data.sequenceId;

  if (!sequence_id) {
    throw new Error(`Sequence ID not found for screen: ${screen.id || "unknown"}`);
  }

  return sequence_id;
}

type InnerCursorMap = Record<string, number>;

function passTimeWindow(item: any, now = Date.now()): boolean {
  const data = item.data || {};

  const start =
    data.startMillis == null ? now : Number(data.startMillis);

  const end =
    data.endMillis == null ? Infinity : Number(data.endMillis);

  return now >= start && now <= end;
}

function passCondition(item: any, screen: any): boolean {
  const condition = item.data?.condition;
  if (!condition) return true;

  // evaluator ของ condition เดี่ยว
  function evalSimple(expr: string): boolean {
    const match = expr.match(
      /^\s*([\w.]+)\s*(==|!=)\s*"([^"]*)"\s*$/
    );

    if (!match) return false;

    const [, key, operator, expected] = match;
    const actual = screen.data?.[key];

    if (actual == null) return false;

    if (operator === "==") {
      return String(actual) === expected;
    }

    if (operator === "!=") {
      return String(actual) !== expected;
    }

    return false;
  }

  // OR (||)
  const orGroups = condition.split("||");

  for (const orGroup of orGroups) {
    // AND (&&)
    const andConds = orGroup.split("&&");

    const allPass = andConds.every((expr: string) =>
      evalSimple(expr.trim())
    );

    if (allPass) return true;
  }

  return false;
}

function itemPass(item: any, screen: any): boolean {
  return (
    passTimeWindow(item) &&
    passCondition(item, screen)
  );
}

async function resolveItem(
  item: any,
  screen: any,
  cursorMap: InnerCursorMap,
  getSequenceById: (id: string) => Promise<any>
): Promise<string | null> {

  // 1. เช็ค condition + time window
  if (!itemPass(item, screen)) {
    return null;
  }

  // 2. case ปกติ: มี libraryItemId
  if (item.data?.libraryItemId) {
    return item.data.libraryItemId;
  }

  // 3. case innerSequence
  if (item.data?.innerSequenceId) {
    const innerSequenceId = item.data.innerSequenceId;
    const innerSequence = await getSequenceById(innerSequenceId);

    return resolveInnerSequence(
      innerSequence,
      screen,
      cursorMap,
      getSequenceById
    );
  }

  // 4. ไม่มีอะไรให้เล่น
  return null;
}

async function resolveInnerSequence(
  innerSequence: any,
  screen: any,
  cursorMap: InnerCursorMap,
  getSequenceById: (id: string) => Promise<any>
): Promise<string | null> {

  // รวม items ทุก stack ของ innerSequence
  const items =
    innerSequence?.stacks?.flatMap((s: any) => s.items || []) || [];

  if (items.length === 0) {
    return null;
  }

  const seqId = innerSequence.id;

  // cursor ต่อ innerSequence (global ต่อ screen)
  let cursor = cursorMap[seqId] ?? 0;

  // วนได้สูงสุด items.length รอบ (กัน infinite loop)
  for (let i = 0; i < items.length; i++) {
    const index = (cursor + i) % items.length;
    const item = items[index];

    // ไม่ผ่านเงื่อนไข → ข้าม
    if (!itemPass(item, screen)) {
      continue;
    }

    // ขยับ cursor ไปตัวถัดไป (memory only)
    cursorMap[seqId] = (index + 1) % items.length;

    // case 1: มี libraryItemId
    if (item.data?.libraryItemId) {
      return item.data.libraryItemId;
    }

    // case 2: innerSequence ซ้อน
    if (item.data?.innerSequenceId) {
      const nestedSeq = await getSequenceById(item.data.innerSequenceId);
      const resolved = await resolveInnerSequence(
        nestedSeq,
        screen,
        cursorMap,
        getSequenceById
      );

      if (resolved) {
        return resolved;
      }
      // ถ้าแตกแล้วไม่ได้ → ไป item ถัดไป
    }
  }

  // ไม่มี item ใดผ่านเลย
  return null;
}

type SequenceCache = Record<string, any>;

const sequenceCache: SequenceCache = {};

async function getSequenceCached(id: string) {
  if (!sequenceCache[id]) {
    sequenceCache[id] = await sequence_by_id(id);
  }
  return sequenceCache[id];
}

export async function resolveSequencePlayback(
  sequence: any,
  screen: any,
  getSequenceById: (id: string) => Promise<any>
): Promise<(string | null)[]> {

  const results: (string | null)[] = [];
  const cursorMap: InnerCursorMap = {}; // memory-only ต่อ screen

  const stacks = sequence?.stacks || [];

  for (const stack of stacks) {
    let resolved: string | null = null;

    for (const item of stack.items || []) {
      resolved = await resolveItem(
        item,
        screen,
        cursorMap,
        getSequenceById
      );

      if (resolved) break; // เจอแล้ว หยุด stack นี้
    }

    results.push(resolved);
  }

  return results;
}
