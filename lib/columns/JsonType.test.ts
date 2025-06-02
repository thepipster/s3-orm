
import {JsonType} from "../../lib/columns/JsonType";
import _ from "lodash";

const testObj = {
    species: 'fish',
    name: 'fred',
    tags: ['tag1', 'tag2']
}

//const testStr = "{\"species\":\"fish\",\"name\":\"fred\",\"tag\":[\"tag1\",\"tag2\"]}";
const testStr = `{"species":"fish","name":"fred","tags":["tag1","tag2"]}`;

/*
const test = {
  aString: "Udunufud ja sursisum haz tolohe ra.",
  aDate: "2624348404805",
  aDate2: "2773023205007",
  aNumber: "7.3991",
  aInteger: "22349432750080",
  aFloat: "5.5",
  aBoolean: "0",
  aArray: '["wu","wuftom","sirbin","lid","bozjet"]',
  "aJSONObject":"{\"stuff\":\"cuf\",\"moreStuff\":\"libib\"}",
  "aObject":"{\"stuff\":\"ohroh\",\"moreStuff\":\"ti\"}"
  id: "4",
  aUniqueString: "sadunu",
};
*/


describe('JsonType', () => {

    test('name', () => {
        expect(JsonType.typeName).toEqual('json');
    })

    test('isNumeric', () => {
        expect(JsonType.isNumeric).toEqual(false);
    })

    test('encode', () => {

        const test:string = JsonType.encode(testObj);
        
        expect(typeof test).toEqual(`string`);
        expect(test).toEqual(testStr);
    })
    

    test('decode', () => {
        
        const encoded:string= JsonType.encode(testObj);
        const decoded = JsonType.decode(encoded);
        
        //expect(typeof test).toEqual(`array`);
        expect(_.isObject(decoded)).toEqual(true);
        expect(testObj).toEqual(decoded);
    })


});