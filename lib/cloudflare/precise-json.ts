// Refuse JSON numbers that JavaScript would silently change. Decimal lexical
// variants (1.00, 1e0) may differ, but the exact decimal value must roundtrip.
// No Node APIs: usable in Workers as well as offline migration tools.
function decimal(value:string){
 const match=/^(-?)(0|[1-9][0-9]*)(?:\.([0-9]+))?(?:[eE]([+-]?[0-9]+))?$/.exec(value);
 if(!match)throw new Error('Exact JSON value unavailable');
 let digits=(match[2]+(match[3]??'')).replace(/^0+/,'');
 if(!digits)return ['','0','0'];
 let exponent=BigInt(match[4]??'0')-BigInt((match[3]??'').length);
 const zeros=/0+$/.exec(digits)?.[0].length??0;
 if(zeros){digits=digits.slice(0,-zeros);exponent+=BigInt(zeros);}
 return [match[1],digits,String(exponent)];
}
export function parseExactJson(value:string):unknown{
 if(typeof value!=='string')throw new Error('Exact JSON value unavailable');
 const parsed:unknown=JSON.parse(value);
 // The first alternative consumes complete strings, including escaped quotes,
 // so digits in email, IDs, document text and JSON keys are never numbers.
 const literals= /"(?:\\[\s\S]|[^"\\])*"|-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/g;
 for(const match of value.matchAll(literals)){
  const literal=match[0];if(literal.startsWith('"'))continue;
  const number=Number(literal);
  if(!Number.isFinite(number)||JSON.stringify(decimal(literal))!==JSON.stringify(decimal(String(number))))throw new Error('Exact JSON value unavailable');
 }
 return parsed;
}
