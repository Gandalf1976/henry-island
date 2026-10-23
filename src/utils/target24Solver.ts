import { getDateSeed } from './dailyClock';

export interface Target24Solution {
  numbers: number[];
  sampleSolution: string;
}

export interface EvaluationResult {
  valid: boolean;
  error?: string;
  result?: number;
  usedNumbers: number[];
}

/**
 * Solves the 24 puzzle using the 4 numbers with +, -, *, / and parentheses.
 * Returns a human-friendly formula string if solvable, or null if impossible.
 */
export function solve24(numbers: number[]): string | null {
  const ops = ['+', '-', '*', '/'] as const;

  function permute(arr: number[]): number[][] {
    if (arr.length <= 1) return [arr];
    const res: number[][] = [];
    for (let i = 0; i < arr.length; i++) {
      const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
      for (const p of permute(rest)) {
        res.push([arr[i], ...p]);
      }
    }
    return res;
  }

  const perms = permute(numbers);

  function applyOp(a: number, b: number, op: string): number | null {
    if (op === '+') return a + b;
    if (op === '-') return a - b;
    if (op === '*') return a * b;
    if (op === '/') {
      if (Math.abs(b) < 1e-9) return null;
      return a / b;
    }
    return null;
  }

  for (const [a, b, c, d] of perms) {
    for (const op1 of ops) {
      for (const op2 of ops) {
        for (const op3 of ops) {
          // Tree 1: ((a op1 b) op2 c) op3 d
          {
            const v1 = applyOp(a, b, op1);
            if (v1 !== null) {
              const v2 = applyOp(v1, c, op2);
              if (v2 !== null) {
                const v3 = applyOp(v2, d, op3);
                if (v3 !== null && Math.abs(v3 - 24) < 1e-6) {
                  return `((${a} ${op1} ${b}) ${op2} ${c}) ${op3} ${d}`;
                }
              }
            }
          }

          // Tree 2: (a op1 (b op2 c)) op3 d
          {
            const v1 = applyOp(b, c, op2);
            if (v1 !== null) {
              const v2 = applyOp(a, v1, op1);
              if (v2 !== null) {
                const v3 = applyOp(v2, d, op3);
                if (v3 !== null && Math.abs(v3 - 24) < 1e-6) {
                  return `(${a} ${op1} (${b} ${op2} ${c})) ${op3} ${d}`;
                }
              }
            }
          }

          // Tree 3: a op1 ((b op2 c) op3 d)
          {
            const v1 = applyOp(b, c, op2);
            if (v1 !== null) {
              const v2 = applyOp(v1, d, op3);
              if (v2 !== null) {
                const v3 = applyOp(a, v2, op1);
                if (v3 !== null && Math.abs(v3 - 24) < 1e-6) {
                  return `${a} ${op1} ((${b} ${op2} ${c}) ${op3} ${d})`;
                }
              }
            }
          }

          // Tree 4: a op1 (b op2 (c op3 d))
          {
            const v1 = applyOp(c, d, op3);
            if (v1 !== null) {
              const v2 = applyOp(b, v1, op2);
              if (v2 !== null) {
                const v3 = applyOp(a, v2, op1);
                if (v3 !== null && Math.abs(v3 - 24) < 1e-6) {
                  return `${a} ${op1} (${b} ${op2} (${c} ${op3} ${d}))`;
                }
              }
            }
          }

          // Tree 5: (a op1 b) op2 (c op3 d)
          {
            const v1 = applyOp(a, b, op1);
            const v2 = applyOp(c, d, op3);
            if (v1 !== null && v2 !== null) {
              const v3 = applyOp(v1, v2, op2);
              if (v3 !== null && Math.abs(v3 - 24) < 1e-6) {
                return `(${a} ${op1} ${b}) ${op2} (${c} ${op3} ${d})`;
              }
            }
          }
        }
      }
    }
  }

  return null;
}

/**
 * Deterministically generates 4 numbers (1-10) for a given date key,
 * guaranteed to have a valid solution reaching 24.
 */
export function getDailyTarget24(dateKey: string): Target24Solution {
  let attempt = 0;
  while (attempt < 100) {
    const seed = getDateSeed(`${dateKey}-target24-${attempt}`);
    
    // Generate 4 numbers between 1 and 10
    const n1 = ((seed * 1103515245 + 12345) >>> 16) % 10 + 1;
    const n2 = (((seed + 7) * 1103515245 + 12345) >>> 16) % 10 + 1;
    const n3 = (((seed + 13) * 1103515245 + 12345) >>> 16) % 10 + 1;
    const n4 = (((seed + 19) * 1103515245 + 12345) >>> 16) % 10 + 1;

    const nums = [n1, n2, n3, n4];
    const solution = solve24(nums);
    if (solution) {
      return { numbers: nums, sampleSolution: solution };
    }
    attempt++;
  }

  // Guaranteed fallback
  return { numbers: [3, 8, 3, 1], sampleSolution: '(3 + ((8 - 1) * 3))' };
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

/**
 * Calculates Target 24 score based on user specifications:
 * - Getting 24 exactly scores 10 points.
 * - Getting within 1 of 24 (higher or lower) scores 7 points.
 * - Getting within 2 of 24 (higher or lower) scores 5 points.
 * - Any other outcome scores 1 point.
 */
export function calculateTarget24Score(result: number | null | undefined): {
  points: number;
  diff: number;
  desc: string;
} {
  if (result === null || result === undefined || isNaN(result) || !isFinite(result)) {
    return { points: 1, diff: 999, desc: 'No valid formula (1 pt)' };
  }

  const diff = Math.abs(result - 24);
  if (diff < 1e-5) {
    return { points: 10, diff: 0, desc: '🎯 EXACTLY 24! (10 Points)' };
  } else if (diff <= 1 + 1e-5) {
    return { points: 7, diff: Math.round(diff), desc: 'Within 1 of 24 (7 Points)' };
  } else if (diff <= 2 + 1e-5) {
    return { points: 5, diff: Math.round(diff), desc: 'Within 2 of 24 (5 Points)' };
  } else {
    return { points: 1, diff: Math.round(diff * 10) / 10, desc: 'Other outcome (1 Point)' };
  }
}
