// Qlib 风格表达式词法分析器
// 支持: $field, Identifier, Number, + - * /, ( ) , < > <= >= == !=

export type TokKind =
  | 'num' | 'ident' | 'field'
  | 'lparen' | 'rparen' | 'comma'
  | 'plus' | 'minus' | 'mul' | 'div'
  | 'lt' | 'gt' | 'le' | 'ge' | 'eq' | 'ne'
  | 'eof';

export interface Tok {
  kind: TokKind;
  text: string;
  pos: number;
  value?: number;
}

export function tokenize(src: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  const n = src.length;

  const push = (kind: TokKind, text: string, pos: number, value?: number) =>
    out.push({ kind, text, pos, value });

  while (i < n) {
    const c = src[i];
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r') { i++; continue; }

    // number
    if ((c >= '0' && c <= '9') || (c === '.' && src[i + 1] >= '0' && src[i + 1] <= '9')) {
      const start = i;
      while (i < n && ((src[i] >= '0' && src[i] <= '9') || src[i] === '.')) i++;
      const text = src.slice(start, i);
      push('num', text, start, Number(text));
      continue;
    }

    // $field
    if (c === '$') {
      const start = i; i++;
      while (i < n && /[A-Za-z0-9_]/.test(src[i])) i++;
      push('field', src.slice(start + 1, i), start);
      continue;
    }

    // ident (function name / If / True / False)
    if (/[A-Za-z_]/.test(c)) {
      const start = i;
      while (i < n && /[A-Za-z0-9_]/.test(src[i])) i++;
      push('ident', src.slice(start, i), start);
      continue;
    }

    const two = src.slice(i, i + 2);
    if (two === '<=') { push('le', two, i); i += 2; continue; }
    if (two === '>=') { push('ge', two, i); i += 2; continue; }
    if (two === '==') { push('eq', two, i); i += 2; continue; }
    if (two === '!=') { push('ne', two, i); i += 2; continue; }

    switch (c) {
      case '+': push('plus', c, i); i++; continue;
      case '-': push('minus', c, i); i++; continue;
      case '*': push('mul', c, i); i++; continue;
      case '/': push('div', c, i); i++; continue;
      case '(': push('lparen', c, i); i++; continue;
      case ')': push('rparen', c, i); i++; continue;
      case ',': push('comma', c, i); i++; continue;
      case '<': push('lt', c, i); i++; continue;
      case '>': push('gt', c, i); i++; continue;
    }

    throw new Error(`Unexpected character '${c}' at position ${i}`);
  }

  push('eof', '', n);
  return out;
}
