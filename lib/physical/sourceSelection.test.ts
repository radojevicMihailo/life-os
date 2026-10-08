import {expect,it,vi} from "vitest";
import {includeRequestedActivity} from "./sourceSelection";
it("loads an explicitly requested older activity without expanding the recent picker query",async()=>{
 const id="a07eb016-66a8-4aad-a346-a98a0742c456",old={id},load=vi.fn().mockResolvedValue(old);
 expect(await includeRequestedActivity([{id:"recent"}],`activity:${id}`,load)).toEqual([{id:"recent"},old]);
 expect(load).toHaveBeenCalledWith(id);
 load.mockClear();await includeRequestedActivity([old],`activity:${id}`,load);await includeRequestedActivity([],"activity:not-an-id",load);expect(load).not.toHaveBeenCalled();
});
