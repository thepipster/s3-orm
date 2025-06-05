//import { Logger } from "./Logger";
//import { v4 as uuidV4 } from "uuid";
describe("/src/utils/Logger", () => {
    it("CANARY: has a canary test", () => { });
    // it('should log to console', async () => {
    //     const mockStdoutWrite = jest.spyOn(process.stdout, 'write');
    //     const mockStdout = jest.spyOn(console, 'log').mockImplementation(function () { });
    //     const INVOCATIONS = [
    //         { value: uuidV4(), invocation: Logger.debug },
    //         { value: uuidV4(), invocation: Logger.info },
    //         { value: uuidV4(), invocation: Logger.warn },
    //         { value: uuidV4(), invocation: Logger.info },
    //     ];
    //     INVOCATIONS.forEach(item => {
    //         item.invocation(item.value);
    //     })
    //     await pause(FLUSH_WAIT);
    //     expect(mockStdoutWrite.mock.calls.length).toBe(INVOCATIONS.length);
    //     mockStdoutWrite.mockReset();
    // });
    // it('should log objects to console', async () => {
    //     const mockStdoutWrite = jest.spyOn(process.stdout, 'write');
    //     const CANARY = uuidV4();
    //     Logger.debug(CANARY, testObj);
    //     await pause(FLUSH_WAIT);
    //     expect(mockStdoutWrite).toHaveBeenCalledWith(
    //         expect.stringContaining(CANARY)
    //     );
    //     mockStdoutWrite.mockReset();
    // });
    // it('should log a stack trace', async () => {
    //     const mockStdoutWrite = jest.spyOn(process.stdout, 'write');
    //     const CANARY = uuidV4();
    //     Logger.noStackTrace = false;
    //     Logger.debug(CANARY, testObj);
    //     await pause(FLUSH_WAIT);
    //     expect(mockStdoutWrite).toHaveBeenCalledWith(
    //         expect.stringContaining(CANARY)
    //     );
    //     mockStdoutWrite.mockReset();
    // });
});
//# sourceMappingURL=Logger.test.js.map