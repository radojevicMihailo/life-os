import {expect,it} from "vitest";
import {newBlock} from "./blocks";
import {supersetLabels} from "./supersets";
it("labels only adjacent linked exercises and starts new groups after runs",()=>{
 const blocks=[newBlock("exercise"),newBlock("exercise"),newBlock("split"),newBlock("exercise"),newBlock("exercise"),newBlock("exercise")];
 blocks[0].details.linkNext=true;blocks[1].details.linkNext=true;blocks[3].details.linkNext=true;blocks[4].details.linkNext=true;
 expect(supersetLabels(blocks)).toEqual(["A1","A2",null,"B1","B2","B3"]);
});
