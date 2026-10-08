import {expect,it} from "vitest";
import {parseDistance,parseDurationParts,parseNumber} from "./input";
it("accepts decimal comma but rejects malformed distance",()=>{
 expect(parseDistance("5,25")).toBe(5.25);expect(parseDistance("5.25")).toBe(5.25);expect(parseDistance("5,2,5")).toBeNull();expect(parseDistance("-1")).toBeNull();expect(parseDistance("Infinity")).toBeNull();
});
it("accepts explicit duration parts without silently normalizing invalid seconds",()=>{
 expect(parseDurationParts("","31","12")).toBe(1872);expect(parseDurationParts("","31","99")).toBeNull();expect(parseDurationParts("","","")).toBeNull();expect(parseDurationParts("1","02","03")).toBe(3723);expect(parseDurationParts("","0.5","0")).toBeNull();
});
it("supports zero weight and rest but whole sprint counts",()=>{
 expect(parseNumber("0",{min:0})).toBe(0);expect(parseNumber("1.5",{integer:true,min:1})).toBeNull();expect(parseNumber("12oops",{min:0})).toBeNull();
});
it("preserves signed custom numeric fields while built-in measurements remain nonnegative",()=>{
 expect(parseNumber("-2,5",{min:-Infinity})).toBe(-2.5);expect(parseNumber("-3",{min:-Infinity,integer:true})).toBe(-3);expect(parseNumber("-3")).toBeNull();
});
