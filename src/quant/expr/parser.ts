import { tokenize, type Tok, type TokKind } from './lexer';

// AST 节点类型
export type Node =
  | { type: 'num'; value: number }
  | { type: 'field'; name: string }
  | { type: 'call'; name: string; args: Node[] }
  | { type: 'bin'; op: BinOp; left: Node; right: Node }
  | { type: 'neg'; child: Node };

export type BinOp = '+' | '-' | '*' | '/' | '<' | '>' | '<=' | '>=' | '==' | '!=';

// 递归下降解析器 (Pratt-style precedence)
//
// expression  -> comparison
// comparison  -> additive ( (<|>|<=|>=|==|!=) additive )?
// additive    -> multiplicative ( (+|-) multiplicative )*
// multiplicative -> unary ( (*|/) unary )*
// unary       -> '-' unary | primary
// primary     -> num | field | call | '(' expression ')'
// call        -> ident '(' ( expression (',' expression)* )? ')'

class Parser {
  i = 0;
  constructor(private toks: Tok[]) {}

  peek(): Tok { return this.toks[this.i]; }
  eat(kind: TokKind): Tok {
    const t = this.toks[this.i];
    if (t.kind !== kind) throw new Error(`Expected ${kind} at pos ${t.pos}, got ${t.kind} '${t.text}'`);
    this.i++;
    return t;
  }
  match(...kinds: TokKind[]): Tok | null {
    const t = this.toks[this.i];
    if (kinds.includes(t.kind)) { this.i++; return t; }
    return null;
  }

  parse(): Node {
    const expr = this.expression();
    if (this.peek().kind !== 'eof') {
      throw new Error(`Unexpected token '${this.peek().text}' at ${this.peek().pos}`);
    }
    return expr;
  }

  private expression(): Node { return this.comparison(); }

  private comparison(): Node {
    let left = this.additive();
    const t = this.peek();
    const map: Partial<Record<TokKind, BinOp>> = {
      lt: '<', gt: '>', le: '<=', ge: '>=', eq: '==', ne: '!=',
    };
    if (map[t.kind]) {
      this.i++;
      const right = this.additive();
      left = { type: 'bin', op: map[t.kind]!, left, right };
    }
    return left;
  }

  private additive(): Node {
    let left = this.multiplicative();
    while (true) {
      const t = this.match('plus', 'minus');
      if (!t) break;
      const right = this.multiplicative();
      left = { type: 'bin', op: t.kind === 'plus' ? '+' : '-', left, right };
    }
    return left;
  }

  private multiplicative(): Node {
    let left = this.unary();
    while (true) {
      const t = this.match('mul', 'div');
      if (!t) break;
      const right = this.unary();
      left = { type: 'bin', op: t.kind === 'mul' ? '*' : '/', left, right };
    }
    return left;
  }

  private unary(): Node {
    if (this.match('minus')) return { type: 'neg', child: this.unary() };
    if (this.match('plus')) return this.unary();
    return this.primary();
  }

  private primary(): Node {
    const t = this.peek();
    if (t.kind === 'num') { this.i++; return { type: 'num', value: t.value! }; }
    if (t.kind === 'field') { this.i++; return { type: 'field', name: t.text }; }
    if (t.kind === 'lparen') {
      this.i++;
      const e = this.expression();
      this.eat('rparen');
      return e;
    }
    if (t.kind === 'ident') {
      this.i++;
      this.eat('lparen');
      const args: Node[] = [];
      if (this.peek().kind !== 'rparen') {
        args.push(this.expression());
        while (this.match('comma')) args.push(this.expression());
      }
      this.eat('rparen');
      return { type: 'call', name: t.text, args };
    }
    throw new Error(`Unexpected token '${t.text}' at ${t.pos}`);
  }
}

export function parse(src: string): Node {
  return new Parser(tokenize(src)).parse();
}
