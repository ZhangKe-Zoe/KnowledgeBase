import type { Node } from './parser';
import * as ops from '../ops';
import type { AlignedData } from '../data/dataset';

// 对 Dataset 中的每只基金分别求值表达式，得到该基金的列。
// 返回: per-code Float64Array[], 长度 = dataset.codes.length

interface EvalCtx {
  data: AlignedData;
  codeIdx: number;
}

function evalNode(n: Node, ctx: EvalCtx): Float64Array {
  const len = ctx.data.dates.length;
  switch (n.type) {
    case 'num': {
      const arr = new Float64Array(len);
      arr.fill(n.value);
      return arr;
    }
    case 'field': {
      const col = ctx.data.fields[n.name];
      if (!col) throw new Error(`Field $${n.name} not loaded in dataset`);
      return col[ctx.codeIdx];
    }
    case 'neg': {
      const c = evalNode(n.child, ctx);
      return ops.elemwise(c, (v) => -v);
    }
    case 'bin': {
      const a = evalNode(n.left, ctx);
      const b = evalNode(n.right, ctx);
      switch (n.op) {
        case '+': return ops.binop(a, b, (x, y) => x + y);
        case '-': return ops.binop(a, b, (x, y) => x - y);
        case '*': return ops.binop(a, b, (x, y) => x * y);
        case '/': return ops.binop(a, b, (x, y) => (y === 0 ? Number.NaN : x / y));
        case '<': return ops.binop(a, b, (x, y) => (x < y ? 1 : 0));
        case '>': return ops.binop(a, b, (x, y) => (x > y ? 1 : 0));
        case '<=': return ops.binop(a, b, (x, y) => (x <= y ? 1 : 0));
        case '>=': return ops.binop(a, b, (x, y) => (x >= y ? 1 : 0));
        case '==': return ops.binop(a, b, (x, y) => (x === y ? 1 : 0));
        case '!=': return ops.binop(a, b, (x, y) => (x !== y ? 1 : 0));
      }
      break;
    }
    case 'call': {
      const args = n.args.map((a) => evalNode(a, ctx));
      const intArg = (i: number) => {
        const v = args[i][0];
        if (!Number.isFinite(v)) throw new Error(`${n.name}: arg ${i} must be a constant integer`);
        return Math.round(v);
      };
      switch (n.name) {
        case 'Ref':   return ops.ref(args[0], intArg(1));
        case 'Delta': return ops.delta(args[0], intArg(1));
        case 'Mean':  return ops.mean(args[0], intArg(1));
        case 'Sum':   return ops.sum(args[0], intArg(1));
        case 'Std':   return ops.std(args[0], intArg(1));
        case 'Max':   return ops.rollingMax(args[0], intArg(1));
        case 'Min':   return ops.rollingMin(args[0], intArg(1));
        case 'Abs':   return ops.ewAbs(args[0]);
        case 'Log':   return ops.ewLog(args[0]);
        case 'Sign':  return ops.ewSign(args[0]);
        case 'If':    return ops.ifSelect(args[0], args[1], args[2]);
        case 'Corr':  return ops.corr(args[0], args[1], intArg(2));
        default:      throw new Error(`Unknown function: ${n.name}`);
      }
    }
  }
  throw new Error(`Unknown node type`);
}

// 跨基金计算截面 Rank（0..1 百分位）。每个 t 对当前 t 所有基金的值排序。
function crossSectionalRank(perCode: Float64Array[]): Float64Array[] {
  const T = perCode[0].length;
  const N = perCode.length;
  const out: Float64Array[] = Array.from({ length: N }, () => new Float64Array(T).fill(Number.NaN));
  for (let t = 0; t < T; t++) {
    const vals: Array<{ i: number; v: number }> = [];
    for (let i = 0; i < N; i++) {
      const v = perCode[i][t];
      if (Number.isFinite(v)) vals.push({ i, v });
    }
    if (vals.length < 2) continue;
    vals.sort((a, b) => a.v - b.v);
    vals.forEach((entry, rank) => {
      out[entry.i][t] = vals.length === 1 ? 0.5 : rank / (vals.length - 1);
    });
  }
  return out;
}

// 表达式可能在根节点调用 Rank(...)，它是截面算子，需要跨基金计算。
// 简化：若根节点是 Rank(inner)，先对每只基金算 inner，再 cross-sectional rank。
// 其他位置出现 Rank 会抛错（v1 限制）。
export function evaluateAll(root: Node, data: AlignedData): Float64Array[] {
  if (root.type === 'call' && root.name === 'Rank' && root.args.length === 1) {
    const per = data.codes.map((_, i) => evalNode(root.args[0], { data, codeIdx: i }));
    return crossSectionalRank(per);
  }
  // 普通每只基金独立求值
  return data.codes.map((_, i) => evalNode(root, { data, codeIdx: i }));
}
