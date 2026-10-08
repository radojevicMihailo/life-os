export function parseNumber(text:string,options:{min?:number;integer?:boolean}={}):number|null{
 const normalized=text.trim().replace(",",".");if(!/^\d+(?:\.\d+)?$/.test(normalized))return null;
 const value=Number(normalized);return Number.isFinite(value)&&value>=(options.min??0)&&(!options.integer||Number.isInteger(value))?value:null;
}
export function parseDistance(text:string):number|null{const n=parseNumber(text);return n!=null&&n>0?n:null;}
export function parseDurationParts(hours:string,minutes:string,seconds:string):number|null{
 if(![hours,minutes,seconds].some(x=>x.trim()))return null;
 const values=[hours,minutes,seconds].map(x=>parseNumber(x||"0",{integer:true}));if(values.some(x=>x==null))return null;
 const [h,m,s]=values as number[];return m<60&&s<60&&h*3600+m*60+s>0?h*3600+m*60+s:null;
}
export function localDateValue(date:Date):string{const d=new Date(date);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;}
