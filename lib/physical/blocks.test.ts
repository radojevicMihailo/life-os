import { expect, it } from "vitest";
import { newBlock, adaptStoredBlock, moveBlock, removeBlock, duplicateBlock, toActivityWrite } from "./blocks";
it("keeps input identity and breaks a separated superset", () => {
 const a=newBlock("exercise"), b=newBlock("exercise"), run=newBlock("split");
 a.values={sets:[{weight:80,reps:5}]}; a.details.linkNext=true;
 const moved=moveBlock([a,b,run],2,-1);
 expect(moved.map(x=>x.rowKey)).toEqual([a.rowKey,run.rowKey,b.rowKey]);
 expect(moved[0].values).toEqual({sets:[{weight:80,reps:5}]});
 expect(moved.every(x=>!x.details.linkNext)).toBe(true);
 expect(removeBlock([a,b,run],1)[0].details.linkNext).toBe(false);
});
it("never joins A and C when removing B from a superset",()=>{
 const a=newBlock("exercise"),b=newBlock("exercise"),c=newBlock("exercise");
 a.details.linkNext=b.details.linkNext=true;
 expect(removeBlock([a,b,c],1)[0].details.linkNext).toBe(false);
});
it("duplicates results with independent keys and no stored identity",()=>{
 const a=newBlock("split"); a.id="old"; a.values={duration:60};
 const next=duplicateBlock([a],0); expect(next[1].rowKey).not.toBe(a.rowKey);
 expect(next[1].id).toBeUndefined(); next[1].values.duration=120;
 expect(a.values.duration).toBe(60);
});
it("retains legacy unknown fields and manual pace without inventing metrics",()=>{
 const b=adaptStoredBlock({id:"old",kind:"split",exerciseId:null,sortOrder:0,values:{pace:300,custom:"keep"},details:null});
 expect(b.details.status).toBe("done"); expect(b.values).toEqual({pace:300,custom:"keep"});
 const payload=toActivityWrite({performedAt:new Date(),title:null,values:{extra:9},comment:null,stravaUrl:null,tagIds:[],blocks:[b,newBlock("split")]});
 expect(payload.subrows).toHaveLength(1); expect(payload.values.extra).toBe(9); expect(payload.subrows[0].values.custom).toBe("keep");
});
it("retains deliberately skipped and optional empty parts while discarding untouched placeholders",()=>{
 const skipped=newBlock("exercise"),optional=newBlock("split");skipped.details.status="skipped";optional.details.optional=true;
 const payload=toActivityWrite({performedAt:new Date(),title:null,values:{},comment:null,stravaUrl:null,tagIds:[],blocks:[skipped,optional,newBlock("split")]});
 expect(payload.subrows.map(b=>b.details.status)).toEqual(["skipped","pending"]);expect(payload.subrows[1].details.optional).toBe(true);
});
