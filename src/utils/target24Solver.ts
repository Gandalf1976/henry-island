export interface Target24Solution {
  numbers: number[];
  target: number;
  sampleSolution: string;
}

/**
 * Solves the classic 24 puzzle (4 numbers, target 24) using +, -, *, /
 * and parentheses. Returns a human-friendly formula string, or null.
 */
export function solve24(numbers: number[]): string | null {
  return solveTarget(numbers, 24);
}

/**
 * Generalised solver: combine ALL given numbers exactly once each with
 * +, -, *, / (and implicit parentheses) to reach `target` exactly.
 * Exhaustive pair-reduction search with expression tracking; returns a
 * human-friendly formula string, or null when unsolvable.
 * Fast in practice (5 numbers: a few ms worst case).
 */
export function solveTarget(numbers: number[], target: number): string | null {
  interface Item {
    v: number;
    e: string;
  }

  function rec(items: Item[]): string | null {
    if (items.length === 1) {
      return Math.abs(items[0].v - target) < 1e-6 ? items[0].e : null;
    }
    const n = items.length;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const a = items[i];
        const b = items[j];
        for (const op of ['+', '-', '*', '/']) {
          let v: number;
          let expr: string;
          if (op === '/') {
            if (Math.abs(b.v) < 1e-9) continue;
            v = a.v / b.v;
            expr = `(${a.e} / ${b.e})`;
          } else if (op === '*') {
            v = a.v * b.v;
            expr = `(${a.e} * ${b.e})`;
          } else if (op === '+') {
            v = a.v + b.v;
            expr = `(${a.e} + ${b.e})`;
          } else {
            v = a.v - b.v;
            expr = `(${a.e} - ${b.e})`;
          }
          if (!isFinite(v)) continue;
          const rest = items.filter((_, k) => k !== i && k !== j);
          const result = rec([...rest, { v, e: expr }]);
          if (result) return result;
        }
      }
    }
    return null;
  }

  return rec(numbers.map(v => ({ v, e: String(v) })));
}

function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

/**
 * Collects every integer value in [min, max] reachable by combining all
 * numbers with +, -, *, /. (Every 5-set of 1–10 numbers reaches at least
 * its plain sum, so the set is never empty for our ranges.)
 */
function reachableIntegers(numbers: number[], min: number, max: number): number[] {
  const found = new Set<number>();
  interface Item {
    v: number;
  }

  function rec(items: Item[]): void {
    if (items.length === 1) {
      const v = items[0].v;
      if (v >= min && v <= max && Math.abs(v - Math.round(v)) < 1e-6) {
        found.add(Math.round(v));
      }
      return;
    }
    const n = items.length;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const a = items[i];
        const b = items[j];
        for (const op of ['+', '-', '*', '/']) {
          let v: number;
          if (op === '/') {
            if (Math.abs(b.v) < 1e-9) continue;
            v = a.v / b.v;
          } else if (op === '*') v = a.v * b.v;
          else if (op === '+') v = a.v + b.v;
          else v = a.v - b.v;
          if (!isFinite(v)) continue;
          const rest = items.filter((_, k) => k !== i && k !== j);
          rec([...rest, { v }]);
        }
      }
    }
  }

  rec(numbers.map(v => ({ v })));
  return Array.from(found);
}

/**
 * Generates one Target game: 5 random integers (1–10) and a random target
 * (3–99), guaranteed solvable.
 *
 * Strategy: roll a uniform random target and verify with the solver (~96%
 * hit rate). If a roll is unsolvable, retry a few times; as a last resort
 * pick the target from the numbers' reachable-integer set (always
 * non-empty), which guarantees a solution by construction.
 */
export function generateTarget24Puzzle(): Target24Solution {
  const MAX_TARGET_TRIES = 40;

  for (let attempt = 0; attempt < MAX_TARGET_TRIES; attempt++) {
    const numbers = Array.from({ length: 5 }, () => randomInt(1, 10));
    const target = randomInt(3, 99);
    const solution = solveTarget(numbers, target);
    if (solution) {
      return { numbers, target, sampleSolution: solution };
    }
  }

  // Guaranteed fallback: pick a target the numbers can actually reach.
  for (let attempt = 0; attempt < 25; attempt++) {
    const numbers = Array.from({ length: 5 }, () => randomInt(1, 10));
    const reachable = reachableIntegers(numbers, 3, 99);
    if (reachable.length > 0) {
      const target = reachable[randomInt(0, reachable.length - 1)];
      const solution = solveTarget(numbers, target);
      if (solution) {
        return { numbers, target, sampleSolution: solution };
      }
    }
  }

  // Should be mathematically unreachable (sum of 1s = 5 is always in range)
  return { numbers: [1, 1, 1, 1, 1], target: 5, sampleSolution: '((((1 + 1) + 1) + 1) + 1)' };
}

/**
 * Safely evaluates an arithmetic expression using Shunting-yard algorithm.
 * Supports +, -, *, /, and parentheses without using dangerous eval().
 */
export function safeEvaluateMath(expression: string): { ok: boolean; value?: number; error?: string } {
  // Normalize symbols
  const expr = expression
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-')
    .replace(/\s+/g, '');

  if (!expr) return { ok: false, error: 'Empty formula' };

  // Tokenize
  const tokens: string[] = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i];
    if (/[0-9]/.test(ch)) {
      let num = '';
      while (i < expr.length && /[0-9]/.test(expr[i])) {
        num += expr[i];
        i++;
      }
      tokens.push(num);
    } else if (['+', '-', '*', '/', '(', ')'].includes(ch)) {
      tokens.push(ch);
      i++;
    } else {
      return { ok: false, error: `Invalid character: ${ch}` };
    }
  }

  // Shunting-yard (Infix -> RPN)
  const precedence: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2 };
  const outputQueue: string[] = [];
  const opStack: string[] = [];

  for (let t = 0; t < tokens.length; t++) {
    const token = tokens[t];
    if (/^[0-9]+$/.test(token)) {
      outputQueue.push(token);
    } else if (['+', '-', '*', '/'].includes(token)) {
      while (
        opStack.length > 0 &&
        opStack[opStack.length - 1] !== '(' &&
        precedence[opStack[opStack.length - 1]] >= precedence[token]
      ) {
        outputQueue.push(opStack.pop()!);
      }
      opStack.push(token);
    } else if (token === '(') {
      opStack.push(token);
    } else if (token === ')') {
      let foundMatching = false;
      while (opStack.length > 0) {
        const top = opStack.pop()!;
        if (top === '(') {
          foundMatching = true;
          break;
        }
        outputQueue.push(top);
      }
      if (!foundMatching) return { ok: false, error: 'Mismatched parentheses' };
    }
  }

  while (opStack.length > 0) {
    const top = opStack.pop()!;
    if (top === '(' || top === ')') return { ok: false, error: 'Mismatched parentheses' };
    outputQueue.push(top);
  }

  // Evaluate RPN
  const evalStack: number[] = [];
  for (const token of outputQueue) {
    if (/^[0-9]+$/.test(token)) {
      evalStack.push(Number(token));
    } else {
      if (evalStack.length < 2) return { ok: false, error: 'Invalid formula syntax' };
      const b = evalStack.pop()!;
      const a = evalStack.pop()!;
      let res = 0;
      if (token === '+') res = a + b;
      else if (token === '-') res = a - b;
      else if (token === '*') res = a * b;
      else if (token === '/') {
        if (Math.abs(b) < 1e-9) return { ok: false, error: 'Division by zero' };
        res = a / b;
      }
      evalStack.push(res);
    }
  }

  if (evalStack.length !== 1) return { ok: false, error: 'Invalid formula calculation' };
  const finalVal = evalStack[0];
  if (!isFinite(finalVal) || isNaN(finalVal)) return { ok: false, error: 'Invalid calculation result' };

  return { ok: true, value: finalVal };
}
